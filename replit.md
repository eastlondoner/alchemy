# Alchemy Documentation Site

## Overview
This is the Alchemy monorepo containing:
- **alchemy/**: Core TypeScript Infrastructure-as-Code library
- **alchemy-web/**: VitePress documentation website
- **examples/**: Various example projects using different frameworks
- **stacks/**: Deployment configurations

## Current State
- Dependencies installed via Bun
- Core library built successfully
- Documentation site running on port 5000 via VitePress
- Deployment configured for production
- VitePress configured for Replit proxy environment

## Project Architecture
- **Build System**: TypeScript with Bun package manager
- **Documentation**: VitePress serving on port 5000
- **Deployment**: Configured for autoscale deployment with build and preview commands
- **Monorepo Structure**: Uses Bun workspaces

## Development Workflow
1. Run `bun install` to install dependencies
2. Run `bun run build` to build the core library (may need secrets for some components)
3. Documentation server runs via the configured workflow on port 5000
4. Visit the web preview to see the documentation site

## VitePress Configuration
The VitePress development server has been configured for Replit:
- **Host**: 0.0.0.0 (listens on all interfaces)
- **Port**: 5000
- **Allowed Hosts**: All hosts allowed for proxy access
- **HMR**: Disabled to avoid WebSocket issues in proxy environment

## Recent Changes
- **2025-09-25**: Replit environment setup completed
  - Configured VitePress dev server for Replit proxy environment
  - Disabled HMR to resolve WebSocket connection issues
  - Set up deployment configuration for production
  - Documentation site successfully running and accessible on port 5000