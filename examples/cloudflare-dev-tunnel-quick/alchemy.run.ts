import alchemy from "alchemy";
import { Worker } from "alchemy/cloudflare";

const app = await alchemy("cloudflare-dev-tunnel-quick");

// Worker with quick tunnel - automatically gets a workers.dev URL
export const worker = await Worker("api", {
  entrypoint: "./src/worker.ts",
  dev: {
    tunnel: true, // Quick tunnel using cloudflared
  },
});

console.log(`Worker URL (dev): ${worker.url}`);
console.log("\nThe worker is accessible via a Cloudflare Tunnel!");
console.log("Try making a request to the URL above.");

await app.finalize();

// Run E2E tests if in test mode
if (process.env.ALCHEMY_E2E === "1") {
  const { test } = await import("./test/e2e.ts");
  await test({
    url: worker.url,
    env: {},
  });
}
