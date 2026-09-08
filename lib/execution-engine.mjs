const round = (value, digits = 4) => Number(value.toFixed(digits));

export const EXECUTION_LIMITS = Object.freeze({
  maxOrderValue: 100000,
  maxSlippageBps: 100,
  minCompletionPct: 1,
});

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

export function validateMandate(mandate, limits = EXECUTION_LIMITS) {
  const errors = [];
  if (!mandate.symbol || !/^[A-Z0-9]{5,20}$/.test(mandate.symbol)) errors.push("Symbol is invalid.");
  if (!Number.isFinite(mandate.quoteAmount) || mandate.quoteAmount <= 0 || mandate.quoteAmount > limits.maxOrderValue) errors.push("Order value is outside the supported range.");
  if (!Number.isFinite(mandate.maxSlippageBps) || mandate.maxSlippageBps <= 0 || mandate.maxSlippageBps > limits.maxSlippageBps) errors.push("Slippage budget is outside the supported range.");
  if (!Number.isFinite(mandate.deadlineSeconds) || mandate.deadlineSeconds < 15 || mandate.deadlineSeconds > 86400) errors.push("Deadline must be between 15 seconds and 24 hours.");
  if (!Number.isFinite(mandate.minCompletionPct) || mandate.minCompletionPct < limits.minCompletionPct || mandate.minCompletionPct > 100) errors.push("Completion target must be between 1% and 100%.");
  return { valid: errors.length === 0, errors };
}

export function buildPlan(mandate, market) {
  const validation = validateMandate(mandate);
  if (!validation.valid) return { status: "INVALID", validation, stages: [] };
  const priceLimit = market.midpoint * (1 + mandate.maxSlippageBps / 10000);
  const makerPrice = mandate.side === "BUY" ? market.bid : market.ask;
  const reprice = mandate.side === "BUY"
    ? Math.min(priceLimit, market.midpoint)
    : Math.max(priceLimit, market.midpoint);
  const takerAllowed = mandate.side === "BUY" ? market.ask <= priceLimit : market.bid >= priceLimit;
  const stages = [
    {
      id: "maker",
      label: "POST_ONLY_LIMIT",
      title: "Start passively",
      reason: "Protects price and gives the order maker priority.",
      price: round(makerPrice),
      maxPrice: round(priceLimit),
      deadlineSeconds: Math.max(15, Math.floor(mandate.deadlineSeconds * 0.45)),
    },
    {
      id: "reprice",
      label: "REPRICE_LIMIT",
      title: "Reprice once",
      reason: "The order is stale; improve queue position without crossing the ceiling.",
      price: round(reprice),
      maxPrice: round(priceLimit),
      deadlineSeconds: Math.max(10, Math.floor(mandate.deadlineSeconds * 0.35)),
    },
    {
      id: "taker",
      label: takerAllowed ? "IOC_LIMIT" : "STOP",
      title: takerAllowed ? "Finish the remainder" : "Protect the ceiling",
      reason: takerAllowed ? "The spread is still inside the user’s slippage budget." : "Crossing now would break the user’s price limit.",
      price: round(mandate.side === "BUY" ? market.ask : market.bid),
      maxPrice: round(priceLimit),
      deadlineSeconds: Math.max(5, Math.floor(mandate.deadlineSeconds * 0.2)),
      blocked: !takerAllowed,
    },
  ];
  return { status: "READY", validation, stages, priceLimit: round(priceLimit), mandate, market };
}

export function simulateExecution(plan, fills) {
  if (plan.status !== "READY") return { status: "INVALID", events: [], filledPct: 0 };
  let filledPct = 0;
  let remainingPct = 100;
  const events = [];
  plan.stages.forEach((stage, index) => {
    if (remainingPct <= 0 || stage.blocked) return;
    const fillPct = clamp(Number(fills[index] || 0) * 100, 0, remainingPct);
    filledPct += fillPct;
    remainingPct -= fillPct;
    events.push({
      type: index === 0 ? "placed" : "replaced",
      stage: stage.id,
      label: stage.label,
      title: stage.title,
      reason: stage.reason,
      price: stage.price,
      fillPct: round(fillPct, 1),
      totalFilledPct: round(filledPct, 1),
      remainingPct: round(remainingPct, 1),
      elapsedSeconds: plan.mandate.deadlineSeconds * ([0.32, 0.67, 0.92][index] || 1),
    });
  });
  const complete = filledPct >= plan.mandate.minCompletionPct;
  const stoppedByCeiling = remainingPct > 0 && plan.stages.at(-1).blocked;
  return {
    status: complete ? "COMPLETED" : "STOPPED",
    events,
    filledPct: round(filledPct, 1),
    remainingPct: round(remainingPct, 1),
    completionTargetPct: plan.mandate.minCompletionPct,
    reason: complete
      ? `Completed ${round(filledPct, 1)}% within the ${plan.mandate.maxSlippageBps} bps budget.`
      : stoppedByCeiling
        ? `Stopped at ${round(filledPct, 1)}% because the next fill would exceed the ${plan.mandate.maxSlippageBps} bps ceiling.`
        : `Deadline reached at ${round(filledPct, 1)}%; remaining quantity was cancelled.`,
  };
}
