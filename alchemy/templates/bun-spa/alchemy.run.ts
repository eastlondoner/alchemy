/// <reference types="@types/bun" />

import alchemy from "alchemy";
import { BunSPA } from "alchemy/cloudflare";

const app = await alchemy("{projectName}");

export const bunsite = await BunSPA("website", {
  entrypoint: "src/server.ts",
  frontend: "index.html",
});

console.log({
  url: bunsite.url,
});

await app.finalize();

