import { Env } from './types';

const INSTRUMENTS: { symbol: string; yahoo: string; id: number }[] = [
  { symbol: 'ES', yahoo: 'ES=F', id: 1 },
  { symbol: 'NQ', yahoo: 'NQ=F', id: 2 },
];

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

interface YahooQuote {
  open: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  close: (number | null)[];
  volume: (number | null)[];
}

interface YahooResult {
  chart: {
    result: {
      timestamp: number[];
      indicators: { quote: YahooQuote[] };
    }[] | null;
    error: { code: string; description: string } | null;
  };
}

async function fetchYahooCandles(
  yahooSymbol: string,
  interval: string,
  range: string
): Promise<{ timestamps: number[]; quote: YahooQuote } | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
  try {
    const resp = await fetch(url, { headers: YAHOO_HEADERS });
    if (!resp.ok) {
      console.error(`Yahoo ${yahooSymbol} ${interval}: HTTP ${resp.status}`);
      return null;
    }
    const data = (await resp.json()) as YahooResult;
    if (data.chart.error || !data.chart.result || data.chart.result.length === 0) {
      console.error(`Yahoo ${yahooSymbol} ${interval}: no data`, data.chart.error);
      return null;
    }
    const result = data.chart.result[0];
    return { timestamps: result.timestamp, quote: result.indicators.quote[0] };
  } catch (err) {
    console.error(`Yahoo fetch error ${yahooSymbol} ${interval}:`, err);
    return null;
  }
}

function unixToISO(ts: number): string {
  return new Date(ts * 1000).toISOString();
}

async function insertCandles(
  env: Env,
  instrumentId: number,
  timeframe: string,
  timestamps: number[],
  quote: YahooQuote
): Promise<number> {
  let inserted = 0;
  const batchSize = 50;

  for (let b = 0; b < timestamps.length; b += batchSize) {
    const stmts: D1PreparedStatement[] = [];
    for (let i = b; i < Math.min(b + batchSize, timestamps.length); i++) {
      const o = quote.open[i];
      const h = quote.high[i];
      const l = quote.low[i];
      const c = quote.close[i];
      if (o == null || h == null || l == null || c == null) continue;
      const vol = quote.volume[i] ?? 0;
      const ts = unixToISO(timestamps[i]);
      stmts.push(
        env.DB.prepare(
          'INSERT OR IGNORE INTO candles (instrument_id, timeframe, timestamp, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(instrumentId, timeframe, ts, o, h, l, c, vol)
      );
      inserted++;
    }
    if (stmts.length > 0) {
      await env.DB.batch(stmts);
    }
  }
  return inserted;
}

function aggregate4H(
  timestamps: number[],
  quote: YahooQuote
): { timestamps: number[]; quote: YahooQuote } {
  // Group 1h candles into 4-hour windows (0, 4, 8, 12, 16, 20 UTC)
  const buckets = new Map<number, { ts: number; o: number; h: number; l: number; c: number; v: number }>();

  for (let i = 0; i < timestamps.length; i++) {
    const o = quote.open[i];
    const h = quote.high[i];
    const l = quote.low[i];
    const c = quote.close[i];
    if (o == null || h == null || l == null || c == null) continue;

    const date = new Date(timestamps[i] * 1000);
    const hour4 = Math.floor(date.getUTCHours() / 4) * 4;
    const bucketDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour4, 0, 0));
    const key = bucketDate.getTime();

    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, { ts: timestamps[i], o, h, l, c, v: quote.volume[i] ?? 0 });
    } else {
      existing.h = Math.max(existing.h, h);
      existing.l = Math.min(existing.l, l);
      existing.c = c;
      existing.v += quote.volume[i] ?? 0;
    }
  }

  const sorted = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
  const out: { timestamps: number[]; quote: YahooQuote } = {
    timestamps: [],
    quote: { open: [], high: [], low: [], close: [], volume: [] },
  };

  for (const [, bar] of sorted) {
    out.timestamps.push(bar.ts);
    out.quote.open.push(bar.o);
    out.quote.high.push(bar.h);
    out.quote.low.push(bar.l);
    out.quote.close.push(bar.c);
    out.quote.volume.push(bar.v);
  }
  return out;
}

export async function fetchAndStoreCandles(env: Env): Promise<void> {
  const now = new Date();
  const minute = now.getUTCMinutes();

  for (const inst of INSTRUMENTS) {
    try {
      // 1m candles — every run
      const m1 = await fetchYahooCandles(inst.yahoo, '1m', '1d');
      if (m1) await insertCandles(env, inst.id, '1m', m1.timestamps, m1.quote);

      // 5m and 15m — every 5th minute
      if (minute % 5 === 0) {
        const m5 = await fetchYahooCandles(inst.yahoo, '5m', '5d');
        if (m5) await insertCandles(env, inst.id, '5m', m5.timestamps, m5.quote);

        const m15 = await fetchYahooCandles(inst.yahoo, '15m', '5d');
        if (m15) await insertCandles(env, inst.id, '15m', m15.timestamps, m15.quote);
      }

      // 1H and 4H — every 15th minute
      if (minute % 15 === 0) {
        const h1 = await fetchYahooCandles(inst.yahoo, '1h', '10d');
        if (h1) await insertCandles(env, inst.id, '1H', h1.timestamps, h1.quote);

        const h1for4 = await fetchYahooCandles(inst.yahoo, '1h', '30d');
        if (h1for4) {
          const agg = aggregate4H(h1for4.timestamps, h1for4.quote);
          await insertCandles(env, inst.id, '4H', agg.timestamps, agg.quote);
        }
      }
    } catch (err) {
      console.error(`Error processing ${inst.symbol}:`, err);
    }
  }
}

function getETDate(now: Date): string {
  // Get current date in America/New_York
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etStr);
  const y = etDate.getFullYear();
  const m = String(etDate.getMonth() + 1).padStart(2, '0');
  const d = String(etDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getETHourMinute(isoTimestamp: string): number {
  // Parse ISO timestamp and get hour.fraction in ET
  const d = new Date(isoTimestamp);
  const etStr = d.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
  const parts = etStr.split(', ')[1]?.split(':') || etStr.split(' ')[1]?.split(':') || [];
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return h + m / 60;
}

export async function computeSessionLevels(env: Env): Promise<void> {
  const now = new Date();
  const todayET = getETDate(now);
  // Also compute for yesterday (for Asia session which spans evenings)
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayET = getETDate(yesterday);

  for (const inst of INSTRUMENTS) {
    try {
      // Get all 1m candles from the last 2 days
      const { results: candles } = await env.DB.prepare(
        `SELECT timestamp, high, low FROM candles
         WHERE instrument_id = ? AND timeframe = '1m'
         AND timestamp >= datetime(?, '-1 day')
         ORDER BY timestamp ASC`
      ).bind(inst.id, todayET + 'T00:00:00Z').all<{ timestamp: string; high: number; low: number }>();

      if (candles.length === 0) continue;

      let londonHigh: number | null = null;
      let londonLow: number | null = null;
      let nyHigh: number | null = null;
      let nyLow: number | null = null;
      let asiaHigh: number | null = null;
      let asiaLow: number | null = null;

      for (const c of candles) {
        const etTime = getETHourMinute(c.timestamp);
        const candleDateET = getETDate(new Date(c.timestamp));

        // London: 02:00 - 05:00 ET today
        if (candleDateET === todayET && etTime >= 2 && etTime < 5) {
          if (londonHigh === null || c.high > londonHigh) londonHigh = c.high;
          if (londonLow === null || c.low < londonLow) londonLow = c.low;
        }

        // NY: 09:30 - 12:00 ET today
        if (candleDateET === todayET && etTime >= 9.5 && etTime < 12) {
          if (nyHigh === null || c.high > nyHigh) nyHigh = c.high;
          if (nyLow === null || c.low < nyLow) nyLow = c.low;
        }

        // Asia: 18:00 - 00:00 ET yesterday evening
        if (candleDateET === yesterdayET && etTime >= 18) {
          if (asiaHigh === null || c.high > asiaHigh) asiaHigh = c.high;
          if (asiaLow === null || c.low < asiaLow) asiaLow = c.low;
        }
        // Asia also covers 00:00 - 02:00 ET today
        if (candleDateET === todayET && etTime < 2) {
          if (asiaHigh === null || c.high > asiaHigh) asiaHigh = c.high;
          if (asiaLow === null || c.low < asiaLow) asiaLow = c.low;
        }
      }

      await env.DB.prepare(
        `INSERT INTO sessions (date, instrument_id, london_high, london_low, ny_high, ny_low, asia_high, asia_low)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(date, instrument_id) DO UPDATE SET
         london_high = excluded.london_high, london_low = excluded.london_low,
         ny_high = excluded.ny_high, ny_low = excluded.ny_low,
         asia_high = excluded.asia_high, asia_low = excluded.asia_low`
      ).bind(todayET, inst.id, londonHigh, londonLow, nyHigh, nyLow, asiaHigh, asiaLow).run();
    } catch (err) {
      console.error(`Session levels error for ${inst.symbol}:`, err);
    }
  }
}
