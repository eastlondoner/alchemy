export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);

    if (url.pathname === "/api/hello") {
      return Response.json({
        message: "Hello from Bun + Alchemy API",
      });
    }

    // Return 404 for other API routes
    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return new Response(null, { status: 404 });
  },
};

