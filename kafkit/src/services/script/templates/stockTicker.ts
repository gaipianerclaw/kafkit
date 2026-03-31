import type { ScriptTemplate } from '../../../types/script';

export const stockTickerTemplate: ScriptTemplate = {
  id: 'stock-ticker',
  nameKey: 'producer.script.templates.stockTicker.name',
  descriptionKey: 'producer.script.templates.stockTicker.desc',
  category: 'finance',
  script: `function generate(ctx) {
  // Stock symbols
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
  const symbol = symbols[ctx.random(0, symbols.length - 1)];
  
  // Base prices for each symbol (approximate)
  const basePrices = {
    'AAPL': 175, 'GOOGL': 140, 'MSFT': 380, 'AMZN': 180,
    'TSLA': 240, 'META': 500, 'NVDA': 880, 'NFLX': 600
  };
  
  const basePrice = basePrices[symbol] || 100;
  
  // Generate price with small random change (-2% to +2%)
  const changePercent = ctx.randomFloat(-2, 2);
  const price = basePrice * (1 + changePercent / 100);
  
  // Generate volume (higher volume for bigger price moves)
  const volume = ctx.random(1000, 100000) * Math.abs(changePercent);
  
  // Keep track of daily high/low in state
  if (!ctx.state[symbol]) {
    ctx.state[symbol] = { high: price, low: price, open: price };
  }
  const dayStats = ctx.state[symbol];
  dayStats.high = Math.max(dayStats.high, price);
  dayStats.low = Math.min(dayStats.low, price);
  
  return {
    key: symbol,
    value: {
      symbol,
      timestamp: ctx.timestamp(),
      price: parseFloat(price.toFixed(2)),
      change: parseFloat((price - dayStats.open).toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(volume),
      dayHigh: parseFloat(dayStats.high.toFixed(2)),
      dayLow: parseFloat(dayStats.low.toFixed(2)),
      dayOpen: parseFloat(dayStats.open.toFixed(2))
    }
  };
}`,
  defaultKeyStrategy: {
    type: 'fixed'
  }
};
