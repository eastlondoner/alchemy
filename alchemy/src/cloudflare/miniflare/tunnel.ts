import type * as miniflare from "miniflare";
import { Scope } from "../../scope.ts";
import { findOpenPort } from "../../util/find-open-port.ts";
import type { CloudflareApi } from "../api.ts";
import { getInternalWorkerBundle } from "../bundle/internal-worker-bundle.ts";
import type { Tunnel as CloudflareTunnel } from "../tunnel.ts";
import {
  enableWorkerSubdomain,
  getAccountSubdomain,
  getWorkerSubdomain,
} from "../worker-subdomain.ts";
import { putWorker } from "../worker.ts";
import {
  createMiniflareWorkerProxy,
  MiniflareWorkerProxyError,
} from "./miniflare-worker-proxy.ts";

export interface Tunnel {
  /**
   * Enables tunneling for a local worker.
   * Returns a `workers.dev` URL that can be used to access the worker.
   */
  configureWorker: (input: {
    api: CloudflareApi;
    name: string;
  }) => Promise<URL>;
  /**
   * Closes the tunnel.
   */
  close: () => Promise<void>;
}

export async function createTunnel(
  miniflare: miniflare.Miniflare,
  tunnelProps?: { 
    tunnel: CloudflareTunnel
    port: number
  },
): Promise<Tunnel> {
  const workers = new Set<string>(); // used to avoid exposing workers that are not running with tunneling enabled
  
  const proxy = await createMiniflareWorkerProxy({
    port: tunnelProps?.port ?? await findOpenPort(9977), // alchemy auth uses 9976, so one above that
    miniflare,
    mode: "remote",
    transformRequest: (request) => {
      if (request.url.origin === remote.origin) {
        request.url.protocol = proxy.url.protocol;
        request.url.host = proxy.url.host;
        request.url.port = proxy.url.port;
        request.headers.set("host", proxy.url.host);
      }
    },
    getWorkerName: (request) => {
      const name = request.headers.get("alchemy-worker-name");
      if (!name) {
        throw new MiniflareWorkerProxyError(
          "Worker name is missing from request headers. This indicates a bug in Alchemy.",
          530,
        );
      }
      if (!workers.has(name)) {
        throw new MiniflareWorkerProxyError(
          `The worker "${name}" is not running with tunneling enabled.`,
          530,
        );
      }
      return name;
    },
  });
  
  const tunnelMode = tunnelProps ? "NAMED_TUNNEL" : "QUICK_TUNNEL";

  const extractNamedTunnelUrl = (line: string) => {
    if (line.includes("Generated Connector ID")) {
      console.log("tunnelProps?.tunnel.dnsRecords", tunnelProps?.tunnel.dnsRecords);
      const dnsRecords = tunnelProps?.tunnel.dnsRecords ? Object.entries(tunnelProps?.tunnel.dnsRecords) : [];
      if(dnsRecords.length > 1) {
        console.warn("Multiple DNS records found for tunnel, using the first one");
      }
      const ingressRules = tunnelProps?.tunnel.ingress;
      if(!ingressRules || ingressRules.length < 2) {
        throw new Error("Dev tunnels must have at least one ingress rule pointing to localhost:target_port");
      }
      let matchingServiceFound = false;
      for(const rule of ingressRules) {
        if(!rule.service) {
          continue;
        }
        if(rule.service.startsWith('http_status:')) {
          continue;
        }
        if(rule.service && !rule.service.startsWith('http://localhost:') && !rule.service.startsWith('tcp://localhost:')) {
          throw new Error(`Dev tunnels must route to localhost, but ${rule.service} was found`);
        }
        if(rule.service && rule.service.startsWith(`http://localhost:${tunnelProps!.port!}`)) {
          matchingServiceFound = true;
        }
      }
      if(!matchingServiceFound) {
        throw new Error(`Dev tunnels must have at least one ingress rule with a service routing to localhost:${tunnelProps!.port!}, but no matching ingress rule was found`);
      }
      const argoTunnelHostname = `${tunnelProps?.tunnel.tunnelId}.cfargotunnel.com`;
      const hostname = dnsRecords.length > 0 ? dnsRecords[0][0] : argoTunnelHostname;
      return `https://${hostname}`;
    }
  }

  const cmd = tunnelMode === "NAMED_TUNNEL"
    ? `cloudflared tunnel run --token ${tunnelProps?.tunnel.token.unencrypted}`
    : `cloudflared tunnel --url ${proxy.url.toString()}`;
  console.log("tunnel cmd", cmd);
  const remoteUrlString = await Scope.current.spawn("tunnel", {
    processName: `cloudflared-${proxy.url.port}`,
    cmd,
    quiet: !process.env.DEBUG,
    extract: tunnelMode === "NAMED_TUNNEL" ? extractNamedTunnelUrl : extractQuickTunnelUrl,
  });
  const remote = new URL(remoteUrlString);
  return {
    configureWorker: async (input) => {
      workers.add(input.name);
      return await createTunnelProxyWorker({
        api: input.api,
        name: input.name,
        host: remote.host,
      });
    },
    close: async () => {
      await proxy.close();
    },
  };
}

async function createTunnelProxyWorker(input: {
  api: CloudflareApi;
  name: string;
  host: string;
}) {
  const script = await getInternalWorkerBundle("tunnel-proxy");
  const [accountSubdomain, workerSubdomainStatus] = await Promise.all([
    getAccountSubdomain(input.api),
    getWorkerSubdomain(input.api, input.name),
    putWorker(input.api, {
      workerName: input.name,
      scriptBundle: script.bundle,
      compatibilityDate: "2025-09-01",
      compatibilityFlags: [],
      bindings: {
        WORKER_NAME: input.name,
        TUNNEL_HOST: input.host,
      },
    }),
  ]);
  if (!workerSubdomainStatus.enabled) {
    await enableWorkerSubdomain(input.api, input.name);
  }
  return new URL(`https://${input.name}.${accountSubdomain}.workers.dev`);
}

function extractQuickTunnelUrl(line: string) {
  const match = line.match(/https:\/\/([^\s]+)\.trycloudflare\.com/);
  if (match) {
    return `https://${match[1]}.trycloudflare.com`;
  }
}