import { Env } from './types';

const INSTRUMENTS: { symbol: string; yahoo: string; id: number }[] = [
  { symbol: 'ES', yahoo: 'ES=F', id: 1 },
  { symbol: 'NQ', yahoo: 'NQ=F', id: 2 },
  { symbol: 'MES', yahoo: 'MES=F', id: 3 },
  { symbol: 'MNQ', yahoo: 'MNQ=F', id: 4 },
];

// Strategy engine only tracks session levels for ES and NQ. Micros piggyback.
const SESSION_INSTRUMENT_IDS = new Set([1, 2]);

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

/**
 * Map of `${instrumentId}:${timeframe}` → unix ms of newest stored candle.
 * Module-scoped: a warm Worker isolate reuses this across cron ticks, so we
 * only hit D1 with the MAX(timestamp) seek on cold start. Updated by
 * insertCandles after every successful insert.
 */
const latestCandlesCache = new Map<string, number>();

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

/**
 * Yahoo's chart API returns candle timestamps with sub-second offsets that
 * vary between polls (e.g. 18:30:00, 18:30:03, 18:30:08 all for the same
 * 1m bar). Without alignment we'd store every poll as a separate row and
 * the UNIQUE constraint would never catch the duplicate. Floor to the
 * timeframe boundary so each real bar maps to exactly one timestamp.
 */
const TIMEFRAME_INTERVAL_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1H': 3600,
  '4H': 14400,
};

function alignTimestamp(tsSeconds: number, timeframe: string): number {
  const interval = TIMEFRAME_INTERVAL_SECONDS[timeframe] ?? 60;
  return Math.floor(tsSeconds / interval) * interval;
}

async function resolveLatestMs(
  env: Env,
  instrumentId: number,
  timeframe: string
): Promise<number> {
  const key = `${instrumentId}:${timeframe}`;
  const cached = latestCandlesCache.get(key);
  if (cached !== undefined) return cached;
  const row = await env.DB.prepare(
    `SELECT timestamp FROM candles
     WHERE instrument_id = ? AND timeframe = ?
     ORDER BY timestamp DESC LIMIT 1`
  ).bind(instrumentId, timeframe).first<{ timestamp: string }>();
  const ms = row ? new Date(row.timestamp).getTime() : 0;
  latestCandlesCache.set(key, ms);
  return ms;
}

/**
 * Returns the newest inserted timestamp (ms), or null if nothing was new.
 * For 1m candles on session-tracked instruments, also applies incremental
 * session-level updates so we don't need a separate 1-day scan from cron.
 */
async function insertCandles(
  env: Env,
  instrumentId: number,
  timeframe: string,
  timestamps: number[],
  quote: YahooQuote
): Promise<number | null> {
  const latestMs = await resolveLatestMs(env, instrumentId, timeframe);

  // Yahoo may include multiple entries for the same aligned bar (different
  // sub-second offsets within one minute). After aligning, dedupe by tsMs
  // keeping the last occurrence — Yahoo orders ascending, so the latest
  // value reflects the most recent intra-bar sample.
  const candlesByTs = new Map<number, { tsMs: number; o: number; h: number; l: number; c: number; v: number }>();
  for (let i = 0; i < timestamps.length; i++) {
    const tsMs = alignTimestamp(timestamps[i], timeframe) * 1000;
    if (tsMs <= latestMs) continue;
    const o = quote.open[i];
    const h = quote.high[i];
    const l = quote.low[i];
    const c = quote.close[i];
    if (o == null || h == null || l == null || c == null) continue;
    candlesByTs.set(tsMs, { tsMs, o, h, l, c, v: quote.volume[i] ?? 0 });
  }
  const newCandles = Array.from(candlesByTs.values()).sort((a, b) => a.tsMs - b.tsMs);

  if (newCandles.length === 0) return null;

  const batchSize = 50;
  for (let b = 0; b < newCandles.length; b += batchSize) {
    const slice = newCandles.slice(b, b + batchSize);
    const stmts = slice.map(c =>
      env.DB.prepare(
        'INSERT OR IGNORE INTO candles (instrument_id, timeframe, timestamp, open, high, low, close, volume) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(instrumentId, timeframe, unixToISO(c.tsMs / 1000), c.o, c.h, c.l, c.c, c.v)
    );
    await env.DB.batch(stmts);
  }

  const newestMs = newCandles[newCandles.length - 1].tsMs;
  latestCandlesCache.set(`${instrumentId}:${timeframe}`, newestMs);

  if (timeframe === '1m' && SESSION_INSTRUMENT_IDS.has(instrumentId)) {
    await applyIncrementalSessions(env, instrumentId, newCandles);
  }

  return newestMs;
}

type SessionName = 'london' | 'ny' | 'asia';

/**
 * Determine which trading session a candle belongs to (if any) and which
 * `sessions` row date to attribute it to.
 *
 * - London: 02:00–05:00 ET, date = candle's ET date
 * - NY:     09:30–12:00 ET, date = candle's ET date
 * - Asia:   yesterday 18:00 ET → today 02:00 ET (anchored on the morning
 *           date so `sessions.date` matches the rest of "today")
 */
function classifySession(tsMs: number): { name: SessionName; date: string } | null {
  const d = new Date(tsMs);
  const etStr = d.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
  // toLocaleString format: "M/D/YYYY, HH:MM:SS"
  const [datePart, timePart = '0:0:0'] = etStr.split(', ');
  const [mStr, dStr, yStr] = datePart.split('/');
  const [hStr, minStr] = timePart.split(':');
  const etDate = `${yStr}-${mStr.padStart(2, '0')}-${dStr.padStart(2, '0')}`;
  const hour = parseInt(hStr, 10) + parseInt(minStr || '0', 10) / 60;

  if (hour >= 2 && hour < 5) return { name: 'london', date: etDate };
  if (hour >= 9.5 && hour < 12) return { name: 'ny', date: etDate };
  if (hour >= 18) {
    // Evening: belongs to tomorrow's session row
    const tomorrow = new Date(Date.UTC(parseInt(yStr, 10), parseInt(mStr, 10) - 1, parseInt(dStr, 10) + 1));
    const y = tomorrow.getUTCFullYear();
    const m = String(tomorrow.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getUTCDate()).padStart(2, '0');
    return { name: 'asia', date: `${y}-${m}-${dd}` };
  }
  if (hour < 2) return { name: 'asia', date: etDate };
  return null;
}

/**
 * Incrementally update sessions rows for the newly inserted 1m candles.
 * Buckets by (date, session) then issues one UPSERT per bucket that merges
 * via MAX/MIN against any existing values for that session.
 */
async function applyIncrementalSessions(
  env: Env,
  instrumentId: number,
  newCandles: { tsMs: number; h: number; l: number }[]
): Promise<void> {
  type Bucket = { date: string; name: SessionName; hi: number; lo: number };
  const buckets = new Map<string, Bucket>();

  for (const c of newCandles) {
    const s = classifySession(c.tsMs);
    if (!s) continue;
    const key = `${s.date}:${s.name}`;
    const b = buckets.get(key);
    if (b) {
      if (c.h > b.hi) b.hi = c.h;
      if (c.l < b.lo) b.lo = c.l;
    } else {
      buckets.set(key, { date: s.date, name: s.name, hi: c.h, lo: c.l });
    }
  }

  if (buckets.size === 0) return;

  const sqlBySession: Record<SessionName, string> = {
    london: `INSERT INTO sessions (date, instrument_id, london_high, london_low)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(date, instrument_id) DO UPDATE SET
               london_high = MAX(COALESCE(london_high, excluded.london_high), excluded.london_high),
               london_low  = MIN(COALESCE(london_low,  excluded.london_low),  excluded.london_low)`,
    ny: `INSERT INTO sessions (date, instrument_id, ny_high, ny_low)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(date, instrument_id) DO UPDATE SET
           ny_high = MAX(COALESCE(ny_high, excluded.ny_high), excluded.ny_high),
           ny_low  = MIN(COALESCE(ny_low,  excluded.ny_low),  excluded.ny_low)`,
    asia: `INSERT INTO sessions (date, instrument_id, asia_high, asia_low)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(date, instrument_id) DO UPDATE SET
             asia_high = MAX(COALESCE(asia_high, excluded.asia_high), excluded.asia_high),
             asia_low  = MIN(COALESCE(asia_low,  excluded.asia_low),  excluded.asia_low)`,
  };

  const stmts = Array.from(buckets.values()).map(b =>
    env.DB.prepare(sqlBySession[b.name]).bind(b.date, instrumentId, b.hi, b.lo)
  );
  await env.DB.batch(stmts);
}

function aggregate4H(
  timestamps: number[],
  quote: YahooQuote
): { timestamps: number[]; quote: YahooQuote } {
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

/**
 * Set of `${instrumentId}:${timeframe}` keys that had at least one new
 * candle inserted on this cron tick. Downstream cron work is gated on this
 * so we don't redo work for combos where nothing changed.
 */
export type CandleChanges = Set<string>;

export async function fetchAndStoreCandles(env: Env): Promise<CandleChanges> {
  const now = new Date();
  const minute = now.getUTCMinutes();
  const changed: CandleChanges = new Set();

  const record = (instId: number, tf: string, ms: number | null) => {
    if (ms !== null) changed.add(`${instId}:${tf}`);
  };

  for (const inst of INSTRUMENTS) {
    try {
      const m1 = await fetchYahooCandles(inst.yahoo, '1m', '1d');
      if (m1) record(inst.id, '1m', await insertCandles(env, inst.id, '1m', m1.timestamps, m1.quote));

      if (minute % 5 === 0) {
        const m5 = await fetchYahooCandles(inst.yahoo, '5m', '5d');
        if (m5) record(inst.id, '5m', await insertCandles(env, inst.id, '5m', m5.timestamps, m5.quote));

        const m15 = await fetchYahooCandles(inst.yahoo, '15m', '5d');
        if (m15) record(inst.id, '15m', await insertCandles(env, inst.id, '15m', m15.timestamps, m15.quote));
      }

      if (minute % 15 === 0) {
        const h1 = await fetchYahooCandles(inst.yahoo, '1h', '10d');
        if (h1) record(inst.id, '1H', await insertCandles(env, inst.id, '1H', h1.timestamps, h1.quote));

        const h1for4 = await fetchYahooCandles(inst.yahoo, '1h', '30d');
        if (h1for4) {
          const agg = aggregate4H(h1for4.timestamps, h1for4.quote);
          record(inst.id, '4H', await insertCandles(env, inst.id, '4H', agg.timestamps, agg.quote));
        }
      }
    } catch (err) {
      console.error(`Error processing ${inst.symbol}:`, err);
    }
  }

  return changed;
}

function getETDate(now: Date): string {
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etStr);
  const y = etDate.getFullYear();
  const m = String(etDate.getMonth() + 1).padStart(2, '0');
  const d = String(etDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getETHourMinute(isoTimestamp: string): number {
  const d = new Date(isoTimestamp);
  const etStr = d.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
  const parts = etStr.split(', ')[1]?.split(':') || etStr.split(' ')[1]?.split(':') || [];
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return h + m / 60;
}

/**
 * Periodic reconciliation backstop. The primary source of session levels is
 * the incremental UPSERT inside insertCandles; this function exists to catch
 * any drift (e.g. candles that were stored before incremental was deployed).
 * Cron now calls it at most once an hour rather than every five minutes.
 */
export async function computeSessionLevels(env: Env): Promise<void> {
  const now = new Date();
  const todayET = getETDate(now);
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayET = getETDate(yesterday);

  for (const inst of INSTRUMENTS) {
    if (!SESSION_INSTRUMENT_IDS.has(inst.id)) continue;
    try {
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

        if (candleDateET === todayET && etTime >= 2 && etTime < 5) {
          if (londonHigh === null || c.high > londonHigh) londonHigh = c.high;
          if (londonLow === null || c.low < londonLow) londonLow = c.low;
        }
        if (candleDateET === todayET && etTime >= 9.5 && etTime < 12) {
          if (nyHigh === null || c.high > nyHigh) nyHigh = c.high;
          if (nyLow === null || c.low < nyLow) nyLow = c.low;
        }
        if (candleDateET === yesterdayET && etTime >= 18) {
          if (asiaHigh === null || c.high > asiaHigh) asiaHigh = c.high;
          if (asiaLow === null || c.low < asiaLow) asiaLow = c.low;
        }
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
