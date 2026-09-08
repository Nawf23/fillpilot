import test from "node:test";
import assert from "node:assert/strict";
import bootstrap from "../api/bootstrap.mjs";
import plan from "../api/plan.mjs";

function response() { return { statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }

test("Vercel bootstrap exposes paper recipes", () => {
  const res = response(); bootstrap({ method: "GET" }, res);
  assert.equal(res.statusCode, 200); assert.equal(Object.keys(res.body.scenarios).length, 3);
});

test("Vercel plan endpoint returns a bounded execution receipt", async () => {
  const res = response(); await plan({ method: "POST", body: { scenarioId: "boundary" } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.simulation.status, "STOPPED"); assert.equal(res.body.plan.stages.length, 3);
});
