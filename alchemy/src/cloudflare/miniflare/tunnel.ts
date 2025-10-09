import type * as miniflare from "miniflare";
import { Scope } from "../../scope.ts";
import { findOpenPort } from "../../util/find-open-port.ts";
import type { CloudflareApi } from "../api.ts";
import { getInternalWorkerBundle } from "../bundle/internal-worker-bundle.ts";
import {
  enableWorkerSubdomain,
  getAccountSubdomain,
  getWorkerSubdomain,
} from "../worker-subdomain.ts";
import { putWorker } from "../worker.ts";
import {
  createMiniflareWorkerProxy,
  MiniflareWorkerProxyError,
  type MiniflareWorkerProxy,
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
  tunnelProps?: { tunnelToken: string },
): Promise<Tunnel> {
  const workers = new Set<string>(); // used to avoid exposing workers that are not running with tunneling enabled
  
  // For quick tunnels, we need to create the proxy first so cloudflared can connect to it
  // For named tunnels, cloudflared uses the tunnel configuration (ingress rules)
  let proxy: MiniflareWorkerProxy | undefined;
  let cmd: string;
  
  // Mutable reference to remote URL (for quick tunnels)
  const remoteRef = { url: null as URL | null };
  
  if (!tunnelProps?.tunnelToken) {
    // Quick tunnel - create proxy first, then start cloudflared pointing to it
    proxy = await createMiniflareWorkerProxy({
      port: await findOpenPort(9977), // alchemy auth uses 9976, so one above that
      miniflare,
      mode: "remote",
      transformRequest: (request) => {
        // Transform requests from the remote trycloudflare URL to the local proxy
        if (remoteRef.url && request.url.origin === remoteRef.url.origin) {
          request.url.protocol = proxy!.url.protocol;
          request.url.host = proxy!.url.host;
          request.url.port = proxy!.url.port;
          request.headers.set("host", proxy!.url.host);
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
    cmd = `cloudflared tunnel --url ${proxy.url.toString()}`;
  } else {
    // Named tunnel - cloudflared will use tunnel configuration (ingress rules)
    cmd = `cloudflared tunnel run --token ${tunnelProps.tunnelToken}`;
  }
  
  console.log("tunnel cmd", cmd);
  
  let remote: URL;
  
  if (tunnelProps?.tunnelToken) {
    // Named tunnel with token - cloudflared doesn't output a trycloudflare.com URL
    // Just start the process and wait for it to be ready
    await Scope.current.spawn("tunnel", {
      processName: `cloudflared-tunnel-${Date.now()}`,
      cmd,
      quiet: !process.env.DEBUG,
      extract: (line) => {
        // Look for the connection registration message which indicates the tunnel is ready
        // Example output: "Connection <uuid> registered"
        if (line.includes("Connection") && line.includes("registered")) {
          return "ready";
        }
      },
    });
    // For named tunnels, we don't have a single remote URL - traffic comes from configured hostnames
    // So we'll use a placeholder that won't match anything in transformRequest
    remote = new URL("https://named-tunnel.placeholder");
    
    // Now create the proxy for named tunnels (cloudflared needs to forward to this)
    proxy = await createMiniflareWorkerProxy({
      port: await findOpenPort(9977),
      miniflare,
      mode: "remote",
      transformRequest: (request) => {
        // No transformation needed for named tunnels - traffic comes directly from configured hostnames
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
  } else {
    // Quick tunnel - wait for the trycloudflare.com URL
    const remoteUrlString = await Scope.current.spawn("tunnel", {
      processName: `cloudflared-quick-${Date.now()}`,
      cmd,
      quiet: !process.env.DEBUG,
      extract: (line) => {
        const match = line.match(/https:\/\/([^\s]+)\.trycloudflare\.com/);
        if (match) {
          return `https://${match[1]}.trycloudflare.com`;
        }
      },
    });
    remote = new URL(remoteUrlString);
    // Update the mutable reference so transformRequest can use it
    remoteRef.url = remote;
  }
  
  if (!proxy) {
    throw new Error("Proxy was not initialized");
  }
  
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
      await proxy!.close();
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
