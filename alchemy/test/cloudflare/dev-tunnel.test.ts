import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import {
  type CloudflareApi,
  createCloudflareApi,
} from "../../src/cloudflare/api.ts";
import { DevTunnel } from "../../src/cloudflare/dev-tunnel.ts";
import {
  Tunnel,
  getTunnel,
  getTunnelConfiguration,
  listTunnels,
} from "../../src/cloudflare/tunnel.ts";
import { destroy } from "../../src/destroy.ts";
import { BRANCH_PREFIX } from "../util.ts";
// must import this or else alchemy.test won't exist
import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

const TEST_DOMAIN = (process.env.TEST_DOMAIN ??
  process.env.ALCHEMY_TEST_DOMAIN)!;

describe.skipIf(!TEST_DOMAIN)("Tunnel Resource", () => {
  // Use BRANCH_PREFIX for deterministic, non-colliding resource names
  const testId = `${BRANCH_PREFIX}-test-tunnel`;
  const devTunnelHostnameOne = `${testId}-dev-tunnel-one.${TEST_DOMAIN}`;
  const devTunnelHostnameTwo = `${testId}-dev-tunnel-two.${TEST_DOMAIN}`;

  test("create, update, and delete tunnel", async (scope) => {
    const api = await createCloudflareApi();
    let devTunnel:
      | DevTunnel<[typeof devTunnelHostnameOne, typeof devTunnelHostnameTwo]>
      | undefined;
    let realTunnel: Tunnel | undefined;

    try {
      // Create a tunnel with basic configuration
      devTunnel = await DevTunnel(testId, {
        name: `${testId}-initial`,
        hostnames: [devTunnelHostnameOne, devTunnelHostnameTwo],
        adopt: true,
        warpRouting: undefined,
      });

      // Verify tunnel pseudo resource was created and important properties were set
      expect(devTunnel).toMatchObject({
        adopt: true,
        configSrc: "cloudflare",
        name: `${testId}-initial`,
      });

      expect(devTunnel.ingress?.[0]).toMatchObject({
        hostname: devTunnelHostnameOne,
        service: "LOCAL_WORKER_PLACEHOLDER",
      });
      expect(devTunnel.ingress?.[1]).toMatchObject({
        hostname: devTunnelHostnameTwo,
        service: "LOCAL_WORKER_PLACEHOLDER",
      });

      // Set the port for the tunnel - this is done by alchemy miniflare controller
      devTunnel.setPort("8080");

      // Verify tunnel ingress was updated
      expect(devTunnel.ingress?.[0]).toMatchObject({
        hostname: devTunnelHostnameOne,
        service: "http://localhost:8080",
      });

      expect(devTunnel.ingress?.[1]).toMatchObject({
        hostname: devTunnelHostnameTwo,
        service: "http://localhost:8080",
      });

      // Now create a real tunnel using the dev tunnel
      // this will normally be done inside miniflare controller
      const realTunnel = await Tunnel(testId, { ...devTunnel });

      // Verify tunnel exists via API
      expect(await getTunnel(api, realTunnel.tunnelId)).toMatchObject({
        name: `${testId}-initial`,
      });

      // Verify configuration was applied
      const tunnelConfiguration = await getTunnelConfiguration(
        api,
        realTunnel.tunnelId,
      );
      console.log("tunnelConfiguration", tunnelConfiguration);
      expect(tunnelConfiguration).toMatchObject({
        ingress: expect.arrayContaining([
          {
            hostname: devTunnelHostnameOne,
            service: "http://localhost:8080",
          },
          {
            hostname: devTunnelHostnameTwo,
            service: "http://localhost:8080",
          },
          {
            service: "http_status:404",
          },
        ]),
      });
    } catch (err) {
      // Log the error or else it's silently swallowed by destroy errors
      console.error("Test error:", err);
      throw err;
    } finally {
      // Always clean up, even if test assertions fail
      await destroy(scope);

      await assertTunnelDeleted(api, realTunnel?.tunnelId);
    }
  });
});

async function assertTunnelDeleted(api: CloudflareApi, tunnelId?: string) {
  if (tunnelId) {
    // we have to use list because getTunnel still returns data, but it won't be in list
    expect(
      (await listTunnels(api)).find((t) => t.id === tunnelId),
    ).toBeUndefined();
  }
}
