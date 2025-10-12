function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  // Allow any localhost origin in development, same origin in production
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
  }
  return {};
}

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    const headers = corsHeaders(request);

    if (url.pathname === "/api/hello") {
      return Response.json(
        {
          message: "Hello from Bun + Alchemy API",
        },
        { headers },
      );
    }

    // Return 404 for other API routes
    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404, headers });
    }

    return new Response(null, { status: 404 });
  },
};

