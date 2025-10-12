/// <reference types="../bun-env.d.ts" />

import type { bunsite } from "../alchemy.run.ts";

export type CloudflareEnv = typeof bunsite.Env;

declare module "cloudflare:workers" {
  namespace Cloudflare {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    export interface Env extends CloudflareEnv {}
  }
}

