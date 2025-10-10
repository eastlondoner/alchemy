import assert from "node:assert";

export async function test({
  env,
}: {
  url: string | undefined;
  env: Record<string, string>;
}) {
  console.log("Running named tunnel E2E test...");

  // Get URLs from environment passed by the test framework
  const apiUrl = env.API_WORKER_URL;
  const webUrl = env.WEB_WORKER_URL;

  assert(apiUrl, "API_WORKER_URL is not set in env");
  assert(webUrl, "WEB_WORKER_URL is not set in env");

  console.log("API Worker URL:", apiUrl);
  console.log("Web Worker URL:", webUrl);

  // Test API worker
  console.log("\nTesting API worker...");
  const apiResponse = await fetch(`${apiUrl}/data`);
  assert(apiResponse.ok, `API worker failed: ${apiResponse.status}`);
  const apiData = await apiResponse.json();
  console.log("API worker response:", apiData);

  assert(apiData.timestamp, "API response missing 'timestamp'");
  assert(apiData.message, "API response missing 'message'");

  // Test web worker
  console.log("\nTesting web worker...");
  const webResponse = await fetch(`${webUrl}/api-call`);
  assert(webResponse.ok, `Web worker failed: ${webResponse.status}`);
  const webData = await webResponse.json();
  console.log("Web worker response:", webData);

  assert(webData.worker === "web", "Web worker returned incorrect worker name");
  assert(webData.apiData, "Web response missing 'apiData'");
  assert(webData.cacheData, "Web response missing 'cacheData'");

  console.log("\n✅ Named tunnel E2E test passed!");
  console.log("✅ Inter-worker communication verified!");
}
