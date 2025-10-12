/// <reference types="@types/bun" />

import alchemy from "alchemy";
import { BunSPA } from "alchemy/cloudflare";

const app = await alchemy("{projectName}");

export const bunsite = await BunSPA("bun-spa-site", {
  entrypoint: "src/worker.ts",
  frontend: ["src/index.html"],
});

console.log({
  url: bunsite.url,
});

await app.finalize();

