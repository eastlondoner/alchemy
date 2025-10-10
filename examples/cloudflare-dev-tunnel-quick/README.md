# Cloudflare Dev Tunnel (Quick) Example

This example demonstrates using quick dev tunnels (`tunnel: true`) with Cloudflare Workers. The worker automatically gets a publicly accessible workers.dev URL via a Cloudflare Tunnel.

## Features

- Automatic tunnel creation using `cloudflared`
- Public workers.dev URL for local development
- No custom domain configuration needed
- Perfect for quick testing and sharing work-in-progress

## Prerequisites

1. [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) must be installed
2. Cloudflare account credentials configured

## Running

```bash
bun run dev
```

This will start the worker and output a public URL like:
```
https://my-worker-abc123.workers.dev
```

You can share this URL with others to test your worker!

## Testing

Run the example test from the repository root:
```bash
cd ../..
bun test:examples -t dev-tunnel-quick
```

## How It Works

When `dev: { tunnel: true }` is set, Alchemy:
1. Starts a local miniflare instance for your worker
2. Creates a temporary Cloudflare Tunnel using `cloudflared`
3. Deploys a lightweight proxy worker to workers.dev
4. Routes all requests through the tunnel to your local worker

This gives you a real HTTPS URL pointing to your local development environment.

## When to Use

- Quick testing without domain setup
- Sharing work-in-progress with team members
- Testing webhooks from external services
- Mobile device testing

For production deployments or custom domains, use regular deployment:
```bash
bun run deploy
```

