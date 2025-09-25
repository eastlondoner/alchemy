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

## Recent Changes
- **2025-09-25**: Initial Replit environment setup completed
  - Configured VitePress dev server to use 0.0.0.0:5000
  - Set up deployment configuration for production
  - Documentation site successfully running and accessible