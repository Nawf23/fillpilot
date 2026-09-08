const BASE_URL = process.env.BINANCE_MARKET_BASE_URL || "https://data-api.binance.vision";

async function json(path) {
  const response = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(4500) });
  if (!response.ok) throw new Error(`Binance market request failed (${response.status})`);
  return response.json();
}

export async function getMarketSnapshot(symbol) {
  if (!/^[A-Z0-9]{5,20}$/.test(symbol)) throw new Error("Invalid Binance symbol");
  const encoded = encodeURIComponent(symbol);
  const [ticker, book] = await Promise.all([
    json(`/api/v3/ticker/24hr?symbol=${encoded}`),
    json(`/api/v3/ticker/bookTicker?symbol=${encoded}`),
  ]);
  const bid = Number(book.bidPrice);
  const ask = Number(book.askPrice);
  const midpoint = (bid + ask) / 2;
  return {
    symbol,
    bid,
    ask,
    midpoint,
    spreadBps: midpoint ? ((ask - bid) / midpoint) * 10000 : 0,
    dailyQuoteVolume: Number(ticker.quoteVolume),
    priceChangePercent24h: Number(ticker.priceChangePercent),
    source: "Binance Spot API · live",
    observedAt: new Date().toISOString(),
  };
}
