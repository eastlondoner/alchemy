import type { apiWorker } from "../alchemy.run.ts";

export default {
  async fetch(request: Request, env: typeof apiWorker.Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/data") {
      // Store data in cache
      const data = {
        timestamp: Date.now(),
        message: "Data from API worker",
      };
      await env.CACHE.put("last-request", JSON.stringify(data));

      return new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(
      JSON.stringify({
        worker: "api",
        hostname: url.hostname,
        path: url.pathname,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  },
};
