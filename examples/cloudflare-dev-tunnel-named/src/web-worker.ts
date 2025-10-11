import type { webWorker } from "../alchemy.run.ts";

export default {
  async fetch(request: Request, env: typeof webWorker.Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api-call") {
      // Call the API worker via service binding
      const apiResponse = await env.API.fetch(new Request("http://api/data"));
      const data = await apiResponse.json();

      return new Response(
        JSON.stringify({
          worker: "web",
          apiData: data,
          cacheData: await env.CACHE.get("last-request", "json"),
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      `<!DOCTYPE html>
<html>
  <head>
    <title>Dev Tunnel Web Worker</title>
    <style>
      body {
        font-family: system-ui, -apple-system, sans-serif;
        max-width: 800px;
        margin: 40px auto;
        padding: 20px;
        line-height: 1.6;
      }
      h1 { color: #f38020; }
      .info {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
      }
      a {
        color: #f38020;
        text-decoration: none;
        font-weight: 500;
      }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>🚀 Web Worker (Dev Tunnel)</h1>
    <div class="info">
      <p><strong>Hostname:</strong> ${url.hostname}</p>
      <p><strong>Path:</strong> ${url.pathname}</p>
    </div>
    <p>This worker is running locally via a Cloudflare Tunnel and can communicate with other workers.</p>
    <p><a href="/api-call">→ Test API Call (fetches data from API worker)</a></p>
  </body>
</html>`,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  },
};
