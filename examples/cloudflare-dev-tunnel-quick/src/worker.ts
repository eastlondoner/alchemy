export default {
  async fetch(request: Request): Promise<Response> {
    return new Response(
      JSON.stringify({
        message: "Hello from quick tunnel!",
        url: request.url,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  },
};
