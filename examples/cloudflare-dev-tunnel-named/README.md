# Cloudflare Dev Tunnel (Named) Example

This example demonstrates using named dev tunnels with multiple workers sharing a single Cloudflare Tunnel, each accessible via its own custom hostname.

## Features

- Single Cloudflare Tunnel serving traffic from multiple public hostnames to multiple local workers
- Tunnels are only used for local development and development uses different public hostnames that deployed workers.
- Each worker gets a unique user-configured public (sub)domain
- Local inter-worker communication via service bindings (not over public internet)
- Shared local KV storage between workers (can also be configured to use remmote KV on Cloudflare)

## Routing

### Local Development

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Public Internet                                │
└─────────────────────────────────────────────────────────────────────────┘
              │                                        │
      api-dev.domain.com                      web-dev.domain.com
              │                                        │
              └────────────────┬───────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Cloudflare Tunnel  │
                    │   (cloudflared)     │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│      API Worker         │         │      Web Worker         │
│   (localhost:xxxx)      │◄────────│   (localhost:yyyy)      │
│                         │ service │                         │
│  ├─ /data               │ binding │  ├─ / (UI)              │
│  └─ /status             │         │  └─ /api/* → API        │
└─────────────────────────┘         └─────────────────────────┘
                   Local Machine (alchemy dev)
```

### Deployed to Cloudflare

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Public Internet                                │
└─────────────────────────────────────────────────────────────────────────┘
              │                                        │
       api.domain.com                          web.domain.com
   (or *.workers.dev)                       (or *.workers.dev)
              │                                        │
              └────────────────┬───────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Cloudflare Edge    │
                    │     Network         │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              │                                 │
              ▼                                 ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│      API Worker         │         │      Web Worker         │
│   (Cloudflare Edge)     │◄────────│   (Cloudflare Edge)     │
│                         │ service │                         │
│  ├─ /data               │ binding │  ├─ / (UI)              │
│  └─ /status             │         │  └─ /api/* → API        │
└─────────────────────────┘         └─────────────────────────┘
        Deployed to Cloudflare Workers (alchemy deploy)
```

## Prerequisites

1. Cloudflare account with a domain managed by Cloudflare.
1. Set `TEST_DOMAIN` or `ALCHEMY_TEST_DOMAIN` environment variable to a (sub)domain managed by Cloudflare
2. [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) must be installed locally


## Setup

```bash
# Set your domain in .env
echo "TEST_DOMAIN=mydomain.com" >> ../../.env
```

## Running

To run the example in development mode:
```bash
bun run dev
```

This will start both workers accessible at:
- `https://api-dev.yourdomain.com` (API worker)
- `https://web-dev.yourdomain.com` (Web worker)

DNS records for both hostnames are automatically created pointing to the tunnel.

Once running, you can test the endpoints:

```bash
# Test API worker
curl https://api-dev.yourdomain.com/data

# Test web worker (in browser)
open https://web-dev.yourdomain.com
```

## Deployment

To deploy this example to Cloudflare:
```bash
bun run deploy
```

The deployed example does not use any Cloudflare Tunnels. The deployed workers will have their own hostnames (by default these will be on workers.dev) that are distinct from the dev tunnel hostnames.

To configure a custom domain for the deployed workers add

For production, remove the `dev` configuration and add custom domains:

```typescript
const apiWorker = await Worker("api", {
  entrypoint: "./src/api-worker.ts",
  domains: ["api.yourdomain.com"],
});
```

Then deploy:
```bash
bun run deploy

## How It Works

1. **DevTunnel Creation**: Creates a single Cloudflare Tunnel with multiple hostnames declared upfront
2. **Worker Assignment**: Each worker is assigned to a specific hostname via `addRoute()`
3. **Type Safety**: TypeScript prevents using hostnames that weren't declared in the tunnel
4. **Automatic Routing**: The tunnel routes requests based on hostname to the correct local worker
5. **DNS Management**: DNS CNAME records are automatically created for each hostname


## When to Use

- **Multi-service development**: Testing multiple interconnected workers locally
- **Custom domains**: Need specific hostnames for testing (e.g., OAuth callbacks)
- **Stable URLs**: URLs persist across development sessions (unlike quick tunnels)
- **Team collaboration**: Share specific service URLs with team members

## Alchemy Testing

> **Note:** This example is skipped in automated tests (`bun test:examples`) because it requires custom domain configuration. You can run it manually once you've set up your domain.

To run the example test from the repository root ensure that the `TEST_DOMAIN` or `ALCHEMY_TEST_DOMAIN` environment variable is set:
```bash
cd ../..
bun test:examples -t dev-tunnel-named
```

