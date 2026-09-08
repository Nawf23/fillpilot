import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { scenarios } from "./lib/scenarios.mjs";
import { buildPlan, simulateExecution } from "./lib/execution-engine.mjs";
import { getMarketSnapshot } from "./lib/market.mjs";

const PORT = Number(process.env.PORT || 4174);
const HOST = process.env.HOST || "127.0.0.1";
const PUBLIC_DIR = join(process.cwd(), "public");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

function json(response, status, body) { response.writeHead(status, { "content-type": "application/json; charset=utf-8" }); response.end(JSON.stringify(body)); }
async function body(request) { const chunks = []; for await (const chunk of request) chunks.push(chunk); return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === "GET" && url.pathname === "/api/bootstrap") return json(response, 200, { scenarios, mode: "PAPER EXECUTION", limits: { maxSlippageBps: 100, maxOrderValue: 100000 } });
    if (request.method === "POST" && url.pathname === "/api/plan") {
      const { scenarioId } = await body(request);
      const scenario = scenarios[scenarioId];
      if (!scenario) return json(response, 404, { error: "Unknown scenario" });
      let market = scenario.market;
      if (scenario.marketMode === "live") { try { market = await getMarketSnapshot(scenario.symbol); } catch { /* preserve the explicit demo fixture */ } }
      const plan = buildPlan(scenario, market);
      return json(response, 200, { scenario, plan, market, simulation: simulateExecution(plan, scenario.simulatedFills) });
    }
    if (request.method === "GET") {
      const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const path = normalize(join(PUBLIC_DIR, file));
      if (!path.startsWith(PUBLIC_DIR)) return json(response, 403, { error: "Forbidden" });
      const contents = await readFile(path);
      response.writeHead(200, { "content-type": mime[extname(path)] || "application/octet-stream" }); response.end(contents); return;
    }
    return json(response, 405, { error: "Method not allowed" });
  } catch (error) { if (error.code === "ENOENT") return json(response, 404, { error: "Not found" }); console.error(error); return json(response, 500, { error: "Internal server error" }); }
});

server.listen(PORT, HOST, () => console.log(`FillPilot running at http://${HOST}:${PORT}`));
