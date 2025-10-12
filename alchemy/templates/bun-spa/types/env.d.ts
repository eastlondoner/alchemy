// This file infers types for the cloudflare:workers environment from your Alchemy Worker.
// @see https://alchemy.run/concepts/bindings/#type-safe-bindings
import type { bunsite } from "../alchemy.run.js";

export type CloudflareEnv = typeof bunsite.Env;

declare module "cloudflare:workers" {
  namespace Cloudflare {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    export interface Env extends CloudflareEnv {}
  }
}
