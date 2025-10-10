import assert from "node:assert";

export async function test({
  url,
}: {
  url: string | undefined;
  env: Record<string, string>;
}) {
  console.log("Running quick tunnel E2E test...");

  assert(url, "Worker URL is not set");

  // Test the worker responds correctly
  const response = await fetch(url);
  assert(response.ok, `Worker failed to respond: ${response.status}`);

  const data = await response.json();
  console.log("Worker response:", data);

  assert(data.message, "Response missing 'message' field");
  assert(data.url, "Response missing 'url' field");
  assert(data.timestamp, "Response missing 'timestamp' field");

  console.log("✅ Quick tunnel E2E test passed!");
}
