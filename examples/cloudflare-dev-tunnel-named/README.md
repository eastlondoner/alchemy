# Cloudflare Dev Tunnel (Named) Example

This example demonstrates using named dev tunnels with multiple workers sharing a single Cloudflare Tunnel, each accessible via its own custom hostname.

## Features

- Single Cloudflare Tunnel serving multiple workers
- Type-safe hostname routing
- Custom domain hostnames for each worker
- Inter-worker communication via service bindings
- Shared KV storage between workers

## Prerequisites

1. Set `TEST_DOMAIN` or `ALCHEMY_TEST_DOMAIN` environment variable to a domain managed by Cloudflare
2. [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) must be installed
3. Domain must be on Cloudflare (for automatic DNS record creation)

## Setup

```bash
# Set your domain in .env
echo "TEST_DOMAIN=yourdomain.com" >> ../../.env
```

## Running

```bash
bun run dev
```

This will start both workers accessible at:
- `https://api-dev.yourdomain.com` (API worker)
- `https://web-dev.yourdomain.com` (Web worker)

DNS records for both hostnames are automatically created pointing to the tunnel.

## Testing

Once running, you can test the endpoints:

```bash
# Test API worker
curl https://api-dev.yourdomain.com/data

# Test web worker (in browser)
open https://web-dev.yourdomain.com
```

Or run the example test from the repository root:
```bash
cd ../..
bun test:examples -t dev-tunnel-named
```

## How It Works

1. **DevTunnel Creation**: Creates a single Cloudflare Tunnel with multiple hostnames declared upfront
2. **Worker Assignment**: Each worker is assigned to a specific hostname via `addRoute()`
3. **Type Safety**: TypeScript prevents using hostnames that weren't declared in the tunnel
4. **Automatic Routing**: The tunnel routes requests based on hostname to the correct local worker
5. **DNS Management**: DNS CNAME records are automatically created for each hostname

## Architecture

```
                    Cloudflare Tunnel
                           │
          ┌────────────────┼────────────────┐
          │                                 │
   api-dev.domain.com              web-dev.domain.com
          │                                 │
          ▼                                 ▼
    API Worker                         Web Worker
  (localhost:xxxx)  ◄─ service ──    (localhost:yyyy)
                       binding
```

The web worker can call the API worker via service binding, demonstrating how workers can communicate even in local development.

## When to Use

- **Multi-service development**: Testing multiple interconnected workers locally
- **Custom domains**: Need specific hostnames for testing (e.g., OAuth callbacks)
- **Stable URLs**: URLs persist across development sessions (unlike quick tunnels)
- **Team collaboration**: Share specific service URLs with team members

## Production Deployment

For production, remove the `dev` configuration and add custom domains:

```typescript
const apiWorker = await Worker("api", {
  entrypoint: "./src/api-worker.ts",
  domains: ["api.yourdomain.com"],
  // dev config removed for production
});
```

Then deploy:
```bash
bun run deploy
```

