# Cloudflare Dev Tunnel (Quick) Example

This example demonstrates using quick dev tunnels (`tunnel: true`) with Cloudflare Workers. The worker automatically gets a publicly accessible workers.dev URL via a Cloudflare Tunnel.

## Features

- Automatic tunnel creation using `cloudflared`
- All traffic for the `Worker`'s public workers.dev URL is routed to the local worker via a Cloudflare Tunnel
- Traffic for multiple workers can be routed to using a singe tunnel
- No custom domain configuration needed. Works with your predictable, stable workers.dev URLs
- Perfect for development and quick testing when you need a publicly accessible secure (https) URL

## Prerequisites

1. [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) must be installed

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
3. Replaces the deployed worker on Cloudflare with a lightweight proxy worker that routes all requests through the tunnel to your local worker

This redirects your (public, https) `workers.dev` URL to your local development environment.

## When to Use

- Quick testing without domain setup
- Sharing work-in-progress with team members
- Testing that requires a public https URL like webhooks from external services, OAuth flows, etc.
- Mobile device testing

For production deployments or custom domains, use regular deployment:
```bash
bun run deploy
```

