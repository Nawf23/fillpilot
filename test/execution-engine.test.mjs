import test from "node:test";
import assert from "node:assert/strict";
import { buildPlan, simulateExecution, validateMandate } from "../lib/execution-engine.mjs";
import { scenarios } from "../lib/scenarios.mjs";

const market = { symbol: "BNBUSDT", bid: 600, ask: 600.6, midpoint: 600.3, spreadBps: 10, dailyQuoteVolume: 100000000, source: "fixture" };

test("validates a bounded execution mandate", () => {
  assert.equal(validateMandate(scenarios.complete).valid, true);
  assert.equal(validateMandate({ ...scenarios.complete, maxSlippageBps: 0 }).valid, false);
});

test("builds maker, reprice and finish stages", () => {
  const plan = buildPlan(scenarios.complete, market);
  assert.equal(plan.status, "READY");
  assert.deepEqual(plan.stages.map((stage) => stage.id), ["maker", "reprice", "taker"]);
});

test("completes when the staged fills hit the user target", () => {
  const result = simulateExecution(buildPlan(scenarios.complete, market), scenarios.complete.simulatedFills);
  assert.equal(result.status, "COMPLETED");
  assert.equal(result.filledPct, 100);
  assert.equal(result.events.length, 3);
});

test("stops at the price ceiling rather than forcing a bad fill", () => {
  const constrained = { ...scenarios.boundary, market: { ...market, symbol: "BTCUSDT", bid: 60000, ask: 60100, midpoint: 60050 } };
  const plan = buildPlan(constrained, constrained.market);
  const result = simulateExecution(plan, constrained.simulatedFills);
  assert.equal(result.status, "STOPPED");
  assert.match(result.reason, /ceiling/);
  assert.equal(plan.stages.at(-1).blocked, true);
});
