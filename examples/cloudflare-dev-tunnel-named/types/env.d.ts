// This file infers types for the cloudflare:workers environment from your Alchemy Workers.
// @see https://alchemy.run/concepts/bindings/#type-safe-bindings

import type { apiWorker, webWorker } from "../alchemy.run.ts";

export type ApiWorkerEnv = typeof apiWorker.Env;
export type WebWorkerEnv = typeof webWorker.Env;
export type CloudflareEnv = ApiWorkerEnv & WebWorkerEnv;

declare global {
  type Env = CloudflareEnv;
}

declare module "cloudflare:workers" {
  namespace Cloudflare {
    export interface Env extends CloudflareEnv {}
  }
}

