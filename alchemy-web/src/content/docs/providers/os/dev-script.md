---
title: DevScript
description: Run long-lived development scripts with lifecycle management, restart policies, and readiness detection in local development mode.
---

The DevScript resource is designed for running long-lived development servers, dashboards, and other processes alongside `alchemy dev`. It provides automatic start/stop with Alchemy lifecycle, restart policies for handling prop changes, and extract-based readiness detection.

:::note
DevScript only runs in local development mode (`alchemy dev` or `--local` flag). In production/CI environments, it returns metadata without spawning processes.
:::

## Minimal Example

Start a development server and wait for it to be ready:

```ts
import { DevScript } from "alchemy/os";

const server = await DevScript("dev-server", {
  script: "bun run dev",
  extract: {
    pattern: "http://[^\\s]+",
  },
});

console.log("Server ready at:", server.extracted);
```

## Extract Patterns for Readiness

### Simple URL Extraction

Extract the first URL that appears in the output:

```ts
import { DevScript } from "alchemy/os";

const dashboard = await DevScript("dashboard", {
  script: "vite dev",
  extract: {
    pattern: "https?://[^\\s]+",
  },
});

console.log("Dashboard URL:", dashboard.extracted);
```

### Capture Groups

Use capture groups to extract specific parts of the output:

```ts
import { DevScript } from "alchemy/os";

const server = await DevScript("server", {
  script: "vite dev",
  extract: {
    pattern: "Local:\\s+(https?://[^\\s]+)",
    group: 1, // Extract the first capture group
  },
});

console.log("Local URL:", server.extracted);
```

### Case-Insensitive Matching

Use regex flags for case-insensitive pattern matching:

```ts
import { DevScript } from "alchemy/os";

const api = await DevScript("api", {
  script: "node server.js",
  extract: {
    pattern: "ready at [^\\s]+",
    flags: "i", // Case insensitive
  },
});
```

## Environment Variables and Secrets

Pass environment variables and secrets to your development script:

```ts
import { alchemy } from "alchemy";
import { DevScript } from "alchemy/os";

const backend = await DevScript("backend", {
  script: "bun run dev",
  env: {
    PORT: "3000",
    NODE_ENV: "development",
    DATABASE_URL: alchemy.secret.env.DATABASE_URL,
    API_KEY: alchemy.secret.env.API_KEY,
  },
});
```

Secrets are automatically unwrapped and passed to the child process securely.

## Restart Policies

Control when the script restarts on resource updates:

### On-Change (Default)

Restart only when relevant properties change (script, cwd, env, processName, extract):

```ts
import { DevScript } from "alchemy/os";

const watcher = await DevScript("watcher", {
  script: "bun --watch build.ts",
  restartOnUpdate: "on-change", // Default behavior
});
```

### Always Restart

Always restart the script when the resource is updated, even if props haven't changed:

```ts
import { DevScript } from "alchemy/os";

const service = await DevScript("service", {
  script: "bun run service",
  restartOnUpdate: "always",
});
```

### Never Restart

Never restart the script automatically after initial spawn:

```ts
import { DevScript } from "alchemy/os";

const initializer = await DevScript("initializer", {
  script: "bun run setup",
  restartOnUpdate: "never",
});
```

## Working Directory

Specify a custom working directory for your script:

```ts
import { DevScript } from "alchemy/os";

const frontend = await DevScript("frontend", {
  script: "npm run dev",
  cwd: "./packages/frontend",
});
```

## Quiet Mode

Suppress output mirroring to the console:

```ts
import { DevScript } from "alchemy/os";

const background = await DevScript("background-task", {
  script: "bun run background",
  quiet: true,
});
```

Note: Logs are still written to `.alchemy/logs/<id>.log` even in quiet mode.

## Custom Timeout

Set a custom timeout for extraction (default is 5 minutes):

```ts
import { DevScript } from "alchemy/os";

const fastServer = await DevScript("fast-server", {
  script: "bun run dev",
  extract: {
    pattern: "http://[^\\s]+",
  },
  timeoutMs: 30_000, // 30 seconds
});
```

If the pattern is not matched within the timeout, the process is killed and an error is thrown with the log file path and last 20 lines of output.

## Integration with Other Resources

Use DevScript with other Alchemy resources by interpolating their outputs:

```ts
import { alchemy } from "alchemy";
import { Worker } from "alchemy/cloudflare";
import { DevScript } from "alchemy/os";

const app = await alchemy("my-app");

// Deploy a Cloudflare Worker
const worker = await Worker("api", {
  entrypoint: "./src/worker.ts",
});

// Start a local dashboard that monitors the worker
const dashboard = await DevScript("dashboard", {
  script: `bun run dashboard --api-url ${worker.url}`,
  extract: {
    pattern: "Dashboard at (http://[^\\s]+)",
    group: 1,
  },
});

console.log("Worker URL:", worker.url);
console.log("Dashboard URL:", dashboard.extracted);

await app.finalize();
```

## Log and PID Management

DevScript automatically manages logs and process IDs:

- **Log file**: `.alchemy/logs/<id>.log` - Contains all stdout/stderr from the script
- **PID file**: `.alchemy/pids/<id>.pid.json` - Contains the process ID for lifecycle management

You can tail the log file to debug issues:

```bash
tail -f .alchemy/logs/dev-server.log
```

## Restart Detection Table

| Property Changed | on-change | always | never |
|-----------------|-----------|--------|-------|
| `script` | ✅ Restart | ✅ Restart | ❌ No restart |
| `cwd` | ✅ Restart | ✅ Restart | ❌ No restart |
| `env` | ✅ Restart | ✅ Restart | ❌ No restart |
| `processName` | ✅ Restart | ✅ Restart | ❌ No restart |
| `extract` | ✅ Restart | ✅ Restart | ❌ No restart |
| `quiet` | ❌ No restart | ✅ Restart | ❌ No restart |
| `timeoutMs` | ❌ No restart | ✅ Restart | ❌ No restart |
| No changes | ❌ No restart | ✅ Restart | ❌ No restart |

## Hot Reloading

DevScript delegates hot reloading to the underlying tool. For example:

- **Bun**: Use `bun --hot` or `bun --watch`
- **Vite**: Built-in HMR in dev mode
- **Next.js**: Built-in Fast Refresh
- **Nodemon**: Use `nodemon` to watch files

DevScript's restart policy only controls when the entire process restarts due to Alchemy resource changes, not file changes within your app.

## Cross-Platform Compatibility

DevScript uses shell execution, which means:

- **macOS/Linux**: Scripts run in bash/sh
- **Windows**: Scripts run in cmd.exe or PowerShell

For cross-platform compatibility, keep commands simple or use a cross-platform tool like `bun` or `node`.

## Process Cleanup

DevScript automatically cleans up processes when:

1. The Alchemy scope is destroyed (e.g., when stopping `alchemy dev`)
2. A restart is triggered by policy
3. The resource is deleted

Process cleanup uses graceful shutdown (SIGTERM) followed by forceful shutdown (SIGKILL) if the process doesn't exit.

## Error Handling

### Extraction Timeout

If the extraction pattern is not matched within the timeout, DevScript will:

1. Kill the spawned process
2. Throw an error with the log file path
3. Include the last 20 lines of output for debugging

Example error:

```
DevScript "my-server" timed out waiting for extraction after 300000ms.
Log file: .alchemy/logs/my-server.log
Last 20 lines:
Starting server...
Loading configuration...
(last lines of output)
```

### Process Failures

If the spawned process exits with a non-zero code or crashes, DevScript does not automatically restart it. Use your tool's built-in restart mechanisms (like `nodemon`, `bun --watch`, etc.) for automatic recovery from crashes.

## Examples

### Multi-Service Development

Run multiple services together:

```ts
import { alchemy } from "alchemy";
import { DevScript } from "alchemy/os";

const app = await alchemy("my-app");

const backend = await DevScript("backend", {
  script: "bun run backend",
  cwd: "./packages/backend",
  env: { PORT: "3001" },
  extract: { pattern: "http://localhost:3001" },
});

const frontend = await DevScript("frontend", {
  script: `bun run frontend --api ${backend.extracted}`,
  cwd: "./packages/frontend",
  extract: { pattern: "http://localhost:3000" },
});

console.log("Backend:", backend.extracted);
console.log("Frontend:", frontend.extracted);

await app.finalize();
```

### Database with Migrations

Run a database server and wait for migrations:

```ts
import { DevScript } from "alchemy/os";

const postgres = await DevScript("postgres", {
  script: "docker-compose up postgres",
  extract: {
    pattern: "database system is ready to accept connections",
  },
});

const migrate = await DevScript("migrate", {
  script: "bun run db:migrate",
  extract: {
    pattern: "Migration complete",
  },
});
```

## API Reference

### DevScriptProps

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `script` | `string` | Required | The shell command to execute |
| `cwd` | `string` | `process.cwd()` | Working directory for the script |
| `env` | `Record<string, string \| Secret>` | `undefined` | Environment variables (secrets auto-unwrapped) |
| `processName` | `string` | First word of script | Process name for identification |
| `quiet` | `boolean` | `false` | Suppress output mirroring to console |
| `extract` | `DevScriptExtractConfig` | `undefined` | Extract pattern for readiness detection |
| `restartOnUpdate` | `"on-change" \| "always" \| "never"` | `"on-change"` | Restart policy |
| `timeoutMs` | `number` | `300000` (5 min) | Timeout for extraction in milliseconds |

### DevScriptExtractConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `pattern` | `string` | Required | Regular expression pattern to match |
| `flags` | `string` | `undefined` | Regex flags (e.g., 'i' for case-insensitive) |
| `group` | `number` | Auto | Capture group index (0=full match, 1+=groups) |

### DevScript Output

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Resource identifier |
| `type` | `"os-dev-script"` | Resource type |
| `script` | `string` | The executed command |
| `logFile` | `string` | Path to log file |
| `stateFile` | `string` | Path to PID state file |
| `extracted` | `string \| undefined` | Extracted value (when extract provided) |
| `startedAt` | `number` | Timestamp when started |
| `cwd` | `string \| undefined` | Working directory |
| `env` | `Record<string, string \| Secret> \| undefined` | Environment variables |
| `processName` | `string \| undefined` | Process name |
| `quiet` | `boolean \| undefined` | Quiet mode flag |

