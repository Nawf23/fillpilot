import { scenarios } from "../lib/scenarios.mjs";
import { buildPlan, simulateExecution } from "../lib/execution-engine.mjs";
import { getMarketSnapshot } from "../lib/market.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  const scenarioId = typeof request.body === "string" ? JSON.parse(request.body).scenarioId : request.body?.scenarioId;
  const scenario = scenarios[scenarioId];
  if (!scenario) return response.status(404).json({ error: "Unknown scenario" });
  let market = scenario.market;
  if (scenario.marketMode === "live") { try { market = await getMarketSnapshot(scenario.symbol); } catch { /* disclose fixture below */ } }
  const plan = buildPlan(scenario, market);
  return response.status(200).json({ scenario, plan, market, simulation: simulateExecution(plan, scenario.simulatedFills) });
}
