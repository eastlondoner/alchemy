import alchemy from "alchemy";
import { DevTunnel, KVNamespace, Worker } from "alchemy/cloudflare";

const app = await alchemy("cloudflare-dev-tunnel-named");

// Get the test domain from environment
const TEST_DOMAIN = process.env.TEST_DOMAIN || process.env.ALCHEMY_TEST_DOMAIN;

if (!TEST_DOMAIN) {
  throw new Error("TEST_DOMAIN or ALCHEMY_TEST_DOMAIN must be set");
}

// Create a named tunnel with specific hostnames
const devTunnel = await DevTunnel("dev-tunnel", {
  name: `${app.name}-tunnel`,
  adopt: true,
  hostnames: [`api-dev.${TEST_DOMAIN}`, `web-dev.${TEST_DOMAIN}`] as const,
});

// Shared KV store
const cache = await KVNamespace("cache", {
  title: `${app.name}-cache`,
  adopt: true,
});

// API worker on api-dev.example.com
export const apiWorker = await Worker("api", {
  entrypoint: "./src/api-worker.ts",
  bindings: {
    CACHE: cache,
  },
  dev: {
    tunnel: devTunnel.addRoute(`api-dev.${TEST_DOMAIN}`),
  },
});

// Web worker on web-dev.example.com
export const webWorker = await Worker("web", {
  entrypoint: "./src/web-worker.ts",
  bindings: {
    API: apiWorker,
    CACHE: cache,
  },
  dev: {
    tunnel: devTunnel.addRoute(`web-dev.${TEST_DOMAIN}`),
  },
});

console.log("\n🚀 Dev Tunnel Example Running!");
console.log("─".repeat(50));
console.log(`API Worker:  ${apiWorker.url}`);
console.log(`Web Worker:  ${webWorker.url}`);
console.log("─".repeat(50));
console.log("\nBoth workers share a single Cloudflare Tunnel");
console.log("but are accessible via different hostnames.\n");

await app.finalize();

// Run E2E tests if in test mode
if (process.env.ALCHEMY_E2E === "1") {
  const { test } = await import("./test/e2e.ts");
  await test({
    url: webWorker.url,
    env: {
      API_WORKER_URL: apiWorker.url!,
      WEB_WORKER_URL: webWorker.url!,
    },
  });
}
