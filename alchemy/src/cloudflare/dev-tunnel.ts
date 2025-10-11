import { Scope } from "../scope.ts";
import { Tunnel, type TunnelProps } from "./tunnel.ts";

/**
 * Properties for creating a development tunnel
 *
 * DevTunnel extends Tunnel with development-specific defaults and conveniences
 */
export interface DevTunnelProps<Hostnames extends string[]>
  extends Omit<TunnelProps, "service" | "ingress" | "configSrc"> {
  name: string;
  /**
   * Hostname to use for the tunnel
   */
  hostnames: string[] extends Hostnames ? never : Hostnames;
}

/**
 * Output type for DevTunnel
 */
export type DevTunnel<Hostnames extends string[]> = Omit<
  Tunnel,
  | "tunnelId"
  | "accountTag"
  | "createdAt"
  | "deletedAt"
  | "credentials"
  | "token"
> & {
  id: string;
  name: string;
  hostnames: Hostnames;
  configureWorker: ({ name }: { name: string }) => Promise<URL>;
  setPort: (port: string) => void;
  addRoute: (hostname: Hostnames[number]) => DevTunnelRoute<Hostnames>;
};

export type DevTunnelRoute<Hostnames extends string[] = string[]> = {
  tunnel: DevTunnel<Hostnames>;
  hostname: string;
};

/**
 * Creates a Cloudflare Tunnel configured for local development
 *
 * DevTunnel simplifies tunnel creation for development by providing sensible defaults
 * and automatic configuration for common dev scenarios. It automatically configures
 * ingress rules to route traffic to your local development server.
 **/
export async function DevTunnel<const Hostnames extends string[]>(
  id: string,
  props: DevTunnelProps<Hostnames>,
): Promise<DevTunnel<Hostnames>> {
  const scope = Scope.current;
  const configureWorker = async ({ name }: { name: string }) => {
    return new URL(`https://${name}.${props.hostnames[0]}`);
  };

  let port: null | string = null;

  const usedHostnames = new Set<string>();
  const hostnames = props.hostnames;
  const ingress: Exclude<TunnelProps["ingress"], undefined> = [
    ...hostnames.map((hostname) => ({
      service: port ? `http://localhost:${port}` : "LOCAL_WORKER_PLACEHOLDER",
      hostname,
    })),
    {
      service: "http_status:404",
    },
  ];

  function addRoute(props: DevTunnel<Hostnames>, hostname: Hostnames[number]) {
    if(!hostnames.includes(hostname)) {
      throw new Error(`Hostname ${hostname} does not exist on this dev tunnel. You must declare all hostnames when creating the dev tunnel.`);
    }
    if (usedHostnames.has(hostname)) {
      throw new Error(`Hostname ${hostname} is already assigned to another worker.`);
    }
    usedHostnames.add(hostname);
    return {
      tunnel: props,
      hostname,
    };
  }
  const devTunnelProps: DevTunnel<Hostnames> = {
    ...props,
    id,
    hostnames: props.hostnames as Hostnames,
    setPort(newPort: string) {
      port = newPort;
      for (const rule of ingress) {
        if (rule.hostname) {
          rule.service = `http://localhost:${port}`;
        }
      }
    },
    configureWorker,
    configSrc: "cloudflare",
    ingress,
    addRoute(hostname: Hostnames[number]) {
      return addRoute(devTunnelProps, hostname);
    },
  };

  if (scope.phase === "destroy") {
    // this ensures the tunnel resource is deleted, no further information is needed
    const tunnel = (await Tunnel(
      id,
      devTunnelProps,
    )) as unknown as DevTunnel<Hostnames>;
    // TBH I don't think this is needed but just in case
    tunnel.hostnames = props.hostnames as Hostnames;
    tunnel.name = props.name;
    tunnel.id = id;
    tunnel.configureWorker = configureWorker;
    tunnel.addRoute = (hostname: string) => addRoute(tunnel, hostname);
    return tunnel as DevTunnel<Hostnames>;
  }
  // We do nothing here! This is just a holder of information for the miniflare controller to create the tunnel
  return devTunnelProps;
}
