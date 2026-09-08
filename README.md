# FillPilot

FillPilot is an execution-lifecycle agent for Binance Spot. It does not invent a strategy or predict a price. It receives an execution goal—amount, deadline, slippage budget and completion target—then plans and manages the last mile: post, observe, reprice, stop or reconcile.

> **Trading agents know how to place an order. FillPilot knows how to finish one.**

## Try the demo

**Live demo:** <https://fillpilot-lupus.vercel.app/>

Open the live demo first—no installation is required. It runs the same paper-execution workflow used in the submission and does not place real orders.

### Run locally (optional)

```bash
npm start
```

Then open <http://localhost:4174>. The demo uses live Binance public market data when available and a labelled paper-execution fixture for reproducible order-lifecycle scenarios. It never places real orders.

Choose a recipe:

- **Maker-first, then finish** — passive order, one reprice, then a bounded finish; reaches the completion target.
- **Protect the price ceiling** — refuses to cross the user’s slippage budget, even when that means stopping incomplete.
- **Honest partial completion** — cancels the remainder when the deadline wins.

## Execution model

```text
Natural-language goal → typed mandate → candidate plan → observe fills
                                             ↓
                              reprice / finish / stop / receipt
```

The model may translate intent and explain decisions. Deterministic code owns price ceilings, deadlines, quantity accounting, order stages and stop conditions.

## Test

```bash
npm test
```

The next Binance Agent OS integration is an authenticated adapter for exchange filters, account state, open orders, order submission, cancellation and reconciliation. The execution engine is deliberately independent of that adapter so it can be tested entirely in paper mode first.

## Vercel

The repository includes Vercel serverless endpoints and routing. Import the repository with the **Other** framework preset and keep the root directory as `./`. No environment variables are required for the paper demo.

## Safety

This is a hackathon prototype, not financial advice or production trading software. The current application is paper-only. Digital assets are volatile and all production execution requires a dedicated account, minimum permissions, explicit user limits and reconciliation of every exchange response.
