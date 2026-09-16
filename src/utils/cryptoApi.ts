import { CandlestickPoint } from '../types';

export const TRACKED_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'LTCUSDT',
  'TRXUSDT',
  'ADAUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'LINKUSDT',
  'DOTUSDT'
];

export interface TickerResponseItem {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

/**
 * Fetch live 24h ticker prices from Binance public endpoint
 */
export async function fetchLiveCryptoPrices(apiKey?: string): Promise<Record<string, { price: number; change24h: number; high24h: number; low24h: number; volume24h: string }>> {
  const symbolsParam = encodeURIComponent(JSON.stringify(TRACKED_SYMBOLS));
  const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };
  if (apiKey && apiKey.trim()) {
    headers['X-MBX-APIKEY'] = apiKey.trim();
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  const data: TickerResponseItem[] = await response.json();
  const result: Record<string, { price: number; change24h: number; high24h: number; low24h: number; volume24h: string }> = {};

  for (const item of data) {
    const price = parseFloat(item.lastPrice);
    const change = parseFloat(item.priceChangePercent);
    const high = parseFloat(item.highPrice);
    const low = parseFloat(item.lowPrice);
    const volNum = parseFloat(item.quoteVolume);
    const volFormatted = volNum > 1e9 
      ? `$${(volNum / 1e9).toFixed(1)}B` 
      : `$${(volNum / 1e6).toFixed(1)}M`;

    result[item.symbol] = {
      price,
      change24h: change,
      high24h: high,
      low24h: low,
      volume24h: volFormatted
    };
  }

  return result;
}

/**
 * Fetch real klines (candlesticks) for a specific symbol
 */
export async function fetchRealKlines(binanceSymbol: string, interval: string = '1h'): Promise<CandlestickPoint[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=8`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch klines: ${response.status}`);
  }

  const rawKlines: Array<[number, string, string, string, string, string, ...any[]]> = await response.json();
  return rawKlines.map((k) => {
    const date = new Date(k[0]);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return {
      time: `${hours}:${minutes}`,
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: Math.round(parseFloat(k[5]))
    };
  });
}

/**
 * Cleanly format prices according to crypto industry standards
 */
export function formatCryptoPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toFixed(2);
  }
  return price.toFixed(4);
}
