import test from "node:test";
import assert from "node:assert/strict";
import app from "../app.js";

test("GET /health returns JSON liveness response without upstream fetch", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;

  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("health should not call upstream");
  };

  try {
    const response = await app.request("http://localhost/health");

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /^application\/json/);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
