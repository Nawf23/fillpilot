const $ = (selector) => document.querySelector(selector);
let bootstrap;
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

async function get(path, body) {
  const response = await fetch(path, { method: body ? "POST" : "GET", headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function renderRecipes() {
  $("#scenario-list").innerHTML = Object.values(bootstrap.scenarios).map((scenario) => `<button class="recipe" data-id="${scenario.id}"><span class="recipe-icon">${scenario.id === "complete" ? "↗" : scenario.id === "boundary" ? "⌁" : "◌"}</span><span><strong>${scenario.title}</strong><small>${scenario.subtitle}</small></span><b>›</b></button>`).join("");
  document.querySelectorAll(".recipe").forEach((button) => button.addEventListener("click", () => run(button.dataset.id)));
}

async function run(id) {
  document.querySelectorAll(".recipe").forEach((button) => button.classList.toggle("active", button.dataset.id === id));
  const data = await get("/api/plan", { scenarioId: id });
  const { scenario, plan, market, simulation } = data;
  $("#empty").classList.add("hidden"); $("#result").classList.remove("hidden");
  $("#intent").textContent = `“${scenario.prompt}”`;
  $("#market-badge").textContent = `${market.source} · ${market.symbol}`;
  $("#market-badge").className = `market-badge ${market.source.includes("live") ? "live" : "stress"}`;
  $("#mandate-slip").textContent = `${scenario.maxSlippageBps} bps`; $("#mandate-time").textContent = `${scenario.deadlineSeconds}s`; $("#mandate-fill").textContent = `${scenario.minCompletionPct}%`;
  $("#plan-label").textContent = `${plan.stages.length}-stage adaptive`; $("#price-limit").textContent = market.midpoint ? money(plan.priceLimit) : "—"; $("#target").textContent = `${scenario.minCompletionPct}%`;
  $("#filled").textContent = simulation.filledPct; $("#target-inline").textContent = scenario.minCompletionPct; $("#progress").style.width = `${Math.min(simulation.filledPct, 100)}%`; $("#target-line").style.left = `${scenario.minCompletionPct}%`;
  $("#status").textContent = simulation.status === "COMPLETED" ? "COMPLETED" : "STOPPED"; $("#status").className = simulation.status === "COMPLETED" ? "good" : "warn"; $("#source").textContent = market.source;
  $("#timeline").innerHTML = simulation.events.map((event, index) => `<div class="event"><div class="event-rail"><span class="event-dot ${event.type}">${index + 1}</span>${index < simulation.events.length - 1 ? "<i></i>" : ""}</div><div class="event-body"><div class="event-title"><strong>${event.title}</strong><span>${event.label}</span></div><p>${event.reason}</p><div class="event-meta"><span>${money(event.price)} limit</span><span>+${event.fillPct}% filled</span><span>${event.totalFilledPct}% total</span></div></div></div>`).join("");
  $("#receipt").classList.remove("hidden"); $("#receipt").innerHTML = `<div class="receipt-label">FILL RECEIPT · ${simulation.status === "COMPLETED" ? "SUCCESS" : "HONEST STOP"}</div><strong>${simulation.reason}</strong><p>${scenario.symbol} · ${scenario.side} · ${money(scenario.quoteAmount)} requested · ${simulation.filledPct}% completed · ${scenario.maxSlippageBps} bps ceiling</p>`;
}

bootstrap = await get("/api/bootstrap"); renderRecipes();
