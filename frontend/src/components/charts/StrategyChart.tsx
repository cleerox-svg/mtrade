import { CSSProperties, useEffect, useRef, useState } from 'react';

export type StrategyInstrument = 'ES' | 'NQ' | 'MES' | 'MNQ';
export type StrategyTimeframe = '5m' | '15m' | '1H' | '4H';

export interface StrategyAlertData {
  entry_price?: number | null;
  target_price?: number | null;
  stop_price?: number | null;
  bos_level?: number | null;
  is_active?: number | boolean;
}

export interface StrategyStaticData {
  candles: Candle[];
  session?: SessionRow | null;
  fvgs?: FvgRow[];
  ifvgs?: FvgRow[];
  actual_exit_price?: number | null;
}

export interface StrategyChartProps {
  instrument: StrategyInstrument;
  timeframe?: StrategyTimeframe;
  height: number;
  expanded?: boolean;
  alertData?: StrategyAlertData | null;
  staticData?: StrategyStaticData | null;
}

interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface SessionRow {
  symbol?: string;
  london_high: number | null;
  london_low: number | null;
  ny_high?: number | null;
  ny_low?: number | null;
}

interface FvgRow {
  instrument_id?: number;
  timeframe?: string;
  timestamp?: string;
  high: number;
  low: number;
  type?: 'bullish' | 'bearish';
  status?: 'active' | 'respected' | 'inverted' | 'invalidated';
}

const TIMEFRAMES: StrategyTimeframe[] = ['5m', '15m', '1H', '4H'];
const CANDLE_LIMIT = 80;
const POLL_MS = 60_000;

function priceSymbolFor(inst: StrategyInstrument): 'ES' | 'NQ' {
  if (inst === 'MES') return 'ES';
  if (inst === 'MNQ') return 'NQ';
  return inst;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Request failed ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function ageMinutes(iso: string | undefined): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 60000;
}

export default function StrategyChart({
  instrument,
  timeframe: timeframeProp,
  height,
  expanded: _expanded,
  alertData,
  staticData,
}: StrategyChartProps) {
  const isStatic = !!staticData;
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeframe, setTimeframe] = useState<StrategyTimeframe>(
    timeframeProp ?? '15m',
  );
  const [candles, setCandles] = useState<Candle[]>([]);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [fvgs, setFvgs] = useState<FvgRow[]>([]);
  const [ifvgs, setIfvgs] = useState<FvgRow[]>([]);
  const [width, setWidth] = useState(800);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const symbol = priceSymbolFor(instrument);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (isStatic && staticData) {
      const raw = Array.isArray(staticData.candles) ? staticData.candles : [];
      const sorted = [...raw].sort((a, b) =>
        a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
      );
      setCandles(sorted);
      setSession(staticData.session ?? null);
      setFvgs(staticData.fvgs ?? []);
      setIfvgs(staticData.ifvgs ?? []);
      setLastFetch(sorted.length > 0 ? sorted[sorted.length - 1].timestamp : null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [candleData, sessionData, activeFvg, invertedFvg] =
          await Promise.all([
            fetchJson<{ candles: Candle[] }>(
              `/api/candles/${symbol}/${timeframe}?limit=${CANDLE_LIMIT}`,
            ).catch(() => ({ candles: [] as Candle[] })),
            fetchJson<SessionRow[]>('/api/sessions/today').catch(
              () => [] as SessionRow[],
            ),
            fetchJson<FvgRow[]>(
              `/api/fvg/${symbol}?status=active&days=2`,
            ).catch(() => [] as FvgRow[]),
            fetchJson<FvgRow[]>(
              `/api/fvg/${symbol}?status=inverted&days=2`,
            ).catch(() => [] as FvgRow[]),
          ]);

        if (cancelled) return;

        const rawCandles = Array.isArray(candleData.candles)
          ? candleData.candles
          : [];
        const sorted = [...rawCandles].sort((a, b) =>
          a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
        );
        setCandles(sorted);

        const sessionRow = Array.isArray(sessionData)
          ? sessionData.find((s) => s.symbol === symbol) ?? null
          : null;
        setSession(sessionRow);

        setFvgs(Array.isArray(activeFvg) ? activeFvg : []);
        setIfvgs(Array.isArray(invertedFvg) ? invertedFvg : []);

        if (sorted.length > 0) {
          setLastFetch(sorted[sorted.length - 1].timestamp);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    load();
    const intervalId = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [symbol, timeframe, isStatic, staticData]);

  const statusColor = isStatic
    ? 'var(--label)'
    : lastFetch && ageMinutes(lastFetch) < 5
      ? 'var(--green)'
      : 'var(--amber)';
  const statusText = isStatic
    ? 'TRADE SNAPSHOT'
    : lastFetch && ageMinutes(lastFetch) < 5
      ? 'LIVE'
      : 'DELAYED';

  const selectorRowStyle: CSSProperties = {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  };

  const tfButtonStyle = (active: boolean): CSSProperties => ({
    padding: '4px 10px',
    borderRadius: 6,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    background: active ? 'rgba(251,44,90,0.14)' : 'transparent',
    border: `1px solid ${active ? 'rgba(251,44,90,0.55)' : 'var(--glass-border)'}`,
    color: active ? 'var(--red)' : 'var(--label)',
    textTransform: 'uppercase',
    transition: 'color 0.15s ease, background 0.15s ease, border-color 0.15s ease',
  });

  const tagStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: '0.15em',
    color: statusColor,
    textTransform: 'uppercase',
  };

  const dotStyle: CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: 9999,
    background: statusColor,
    boxShadow: `0 0 6px ${statusColor}`,
    display: 'inline-block',
  };

  const svgMarkup = renderChartSvg({
    candles,
    session,
    fvgs,
    ifvgs,
    alert: alertData ?? null,
    width: Math.max(320, Math.round(width)),
    height,
    loading,
    isStatic,
    actualExit: staticData?.actual_exit_price ?? null,
  });

  return (
    <div>
      <div style={selectorRowStyle}>
        <span style={tagStyle}>
          {!isStatic && <span style={dotStyle} aria-hidden="true" />}
          {statusText}
        </span>
        {!isStatic && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                style={tfButtonStyle(tf === timeframe)}
                aria-pressed={tf === timeframe}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        ref={containerRef}
        style={{ width: '100%', height, position: 'relative' }}
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </div>
  );
}

interface RenderArgs {
  candles: Candle[];
  session: SessionRow | null;
  fvgs: FvgRow[];
  ifvgs: FvgRow[];
  alert: StrategyAlertData | null;
  width: number;
  height: number;
  loading: boolean;
  isStatic?: boolean;
  actualExit?: number | null;
}

function escapeAttr(v: string | number): string {
  return String(v).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function renderChartSvg({
  candles,
  session,
  fvgs,
  ifvgs,
  alert,
  width,
  height,
  loading,
  isStatic,
  actualExit,
}: RenderArgs): string {
  if (candles.length === 0) {
    const msg = loading ? 'Loading candles…' : 'No candle data';
    return `<div style="display:flex;align-items:center;justify-content:center;height:${height}px;color:var(--muted);font-family:'JetBrains Mono',monospace;font-size:12px">${msg}</div>`;
  }

  const alertActive = isStatic
    ? true
    : !!(alert && (alert.is_active === 1 || alert.is_active === true));
  const entry = alertActive ? alert?.entry_price ?? null : null;
  const target = alertActive ? alert?.target_price ?? null : null;
  const stop = alertActive ? alert?.stop_price ?? null : null;
  const bosLevel = alertActive ? alert?.bos_level ?? null : null;
  const exit = isStatic ? actualExit ?? null : null;

  const fvgZone = fvgs.length > 0
    ? { high: fvgs[0].high, low: fvgs[0].low }
    : null;
  const ifvgZone = ifvgs.length > 0
    ? { high: ifvgs[0].high, low: ifvgs[0].low }
    : null;

  const prices: number[] = [];
  candles.forEach((c) => {
    prices.push(c.high, c.low);
  });
  if (session?.london_high != null) prices.push(session.london_high);
  if (session?.london_low != null) prices.push(session.london_low);
  if (fvgZone) prices.push(fvgZone.high, fvgZone.low);
  if (ifvgZone) prices.push(ifvgZone.high, ifvgZone.low);
  if (entry != null) prices.push(entry);
  if (target != null) prices.push(target);
  if (stop != null) prices.push(stop);
  if (bosLevel != null) prices.push(bosLevel);
  if (exit != null) prices.push(exit);

  const filtered = prices.filter((p) => p != null && Number.isFinite(p));
  if (filtered.length === 0) {
    return `<div style="display:flex;align-items:center;justify-content:center;height:${height}px;color:var(--muted)">No price data</div>`;
  }

  let minP = Math.min(...filtered);
  let maxP = Math.max(...filtered);
  const span = maxP - minP || 1;
  minP -= span * 0.05;
  maxP += span * 0.05;
  const range = maxP - minP;

  const svgW = width;
  const svgH = height;
  const padR = 65;
  const padL = 4;
  const padT = 8;
  const padB = 20;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const priceY = (p: number) =>
    padT + chartH - ((p - minP) / range) * chartH;

  const candleW = chartW / Math.max(candles.length, 1);
  const isWide = svgW >= 720;
  const bodyW = isWide ? Math.max(candleW * 0.7, 2) : Math.max(candleW - 1, 1);

  let svg = `<svg class="chart-svg" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${svgH}px;display:block">`;

  svg += '<defs>';
  svg += '<linearGradient id="mtrade-strat-area" x1="0" y1="0" x2="0" y2="1">';
  svg += '<stop offset="0%" stop-color="rgba(251,44,90,0.06)"/>';
  svg += '<stop offset="100%" stop-color="rgba(251,44,90,0)"/>';
  svg += '</linearGradient>';
  svg += '</defs>';

  for (let g = 1; g <= 3; g++) {
    const gy = padT + (chartH * g) / 4;
    svg += `<line x1="${padL}" y1="${gy}" x2="${svgW - padR}" y2="${gy}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;
  }

  const yLabelCount = isWide ? 6 : 4;
  for (let yi = 0; yi <= yLabelCount; yi++) {
    const yPrice = minP + (range * yi) / yLabelCount;
    const yPos = priceY(yPrice);
    svg += `<text x="${svgW - padR + 6}" y="${yPos + 3}" fill="var(--muted)" font-family="JetBrains Mono,monospace" font-size="${isWide ? 9 : 8}">${yPrice.toFixed(2)}</text>`;
  }

  let areaPoints = `${padL},${padT + chartH}`;
  candles.forEach((c, i) => {
    const x = padL + i * candleW + candleW / 2;
    areaPoints += ` ${x},${priceY(c.close)}`;
  });
  areaPoints += ` ${padL + (candles.length - 1) * candleW + candleW / 2},${padT + chartH}`;
  svg += `<polygon points="${areaPoints}" fill="url(#mtrade-strat-area)"/>`;

  if (entry != null && target != null) {
    const targetY = priceY(target);
    const entryY = priceY(entry);
    svg += `<rect x="${padL}" y="${Math.min(targetY, entryY)}" width="${chartW}" height="${Math.abs(entryY - targetY)}" fill="rgba(52,211,153,0.03)"/>`;
    if (stop != null) {
      const stopY = priceY(stop);
      svg += `<rect x="${padL}" y="${Math.min(entryY, stopY)}" width="${chartW}" height="${Math.abs(stopY - entryY)}" fill="rgba(239,68,68,0.03)"/>`;
    }
  }

  if (fvgZone) {
    const top = priceY(fvgZone.high);
    const bot = priceY(fvgZone.low);
    svg += `<rect x="${padL}" y="${top}" width="${chartW}" height="${bot - top}" fill="rgba(251,44,90,0.1)" stroke="var(--red)" stroke-width="0.5" stroke-dasharray="4,3" opacity="0.7"/>`;
  }

  if (ifvgZone) {
    const top = priceY(ifvgZone.high);
    const bot = priceY(ifvgZone.low);
    svg += `<rect x="${padL}" y="${top}" width="${chartW}" height="${bot - top}" fill="rgba(251,191,36,0.1)" stroke="var(--amber)" stroke-width="0.5" stroke-dasharray="4,3" opacity="0.7"/>`;
  }

  if (session?.london_high != null) {
    const y = priceY(session.london_high);
    svg += `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="var(--red)" stroke-width="0.8" stroke-dasharray="6,4" opacity="0.7"/>`;
    svg += `<text x="${svgW - padR - 2}" y="${y - 3}" fill="var(--red-soft)" font-family="JetBrains Mono,monospace" font-size="9" text-anchor="end">LDN H</text>`;
  }
  if (session?.london_low != null) {
    const y = priceY(session.london_low);
    svg += `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="var(--muted)" stroke-width="0.8" stroke-dasharray="6,4" opacity="0.6"/>`;
    svg += `<text x="${svgW - padR - 2}" y="${y - 3}" fill="var(--muted)" font-family="JetBrains Mono,monospace" font-size="9" text-anchor="end">LDN L</text>`;
  }

  if (bosLevel != null) {
    const y = priceY(bosLevel);
    svg += `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="var(--amber)" stroke-width="1" opacity="0.8"/>`;
    svg += `<text x="${padL + 4}" y="${y - 3}" fill="var(--amber)" font-family="JetBrains Mono,monospace" font-size="8" opacity="0.9">BOS</text>`;
    let bestIdx = -1;
    let bestDist = Infinity;
    candles.forEach((c, i) => {
      if (c.high >= bosLevel && c.low <= bosLevel) {
        const d = Math.abs(c.close - bosLevel);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
    });
    if (bestIdx === -1) {
      candles.forEach((c, i) => {
        const d = Math.min(Math.abs(c.high - bosLevel), Math.abs(c.low - bosLevel));
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
    }
    if (bestIdx >= 0) {
      const cx = padL + bestIdx * candleW + candleW / 2;
      svg += `<rect x="${cx - 3}" y="${y - 3}" width="6" height="6" fill="var(--amber)" transform="rotate(45,${cx},${y})"/>`;
    }
  }

  if (target != null) {
    const y = priceY(target);
    const dash = isStatic ? ' stroke-dasharray="5,4"' : '';
    svg += `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="var(--green)" stroke-width="1"${dash}/>`;
    svg += `<text x="${padL + 4}" y="${y - 3}" fill="var(--green)" font-family="JetBrains Mono,monospace" font-size="9">TARGET</text>`;
  }
  if (stop != null) {
    const y = priceY(stop);
    const dash = isStatic ? ' stroke-dasharray="5,4"' : '';
    svg += `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="var(--danger)" stroke-width="1"${dash}/>`;
    svg += `<text x="${padL + 4}" y="${y - 3}" fill="var(--danger)" font-family="JetBrains Mono,monospace" font-size="9">STOP</text>`;
  }
  if (entry != null) {
    const y = priceY(entry);
    const openTag = isStatic ? '<g>' : '<g class="mtrade-entry-pulse">';
    svg += openTag;
    svg += `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="var(--red)" stroke-width="1"/>`;
    svg += `<text x="${padL + 4}" y="${y - 3}" fill="var(--red)" font-family="JetBrains Mono,monospace" font-size="9">ENTRY &#9656;</text>`;
    svg += '</g>';
  }
  if (exit != null) {
    const y = priceY(exit);
    svg += `<line x1="${padL}" y1="${y}" x2="${padL + chartW}" y2="${y}" stroke="var(--white)" stroke-width="1.6"/>`;
    svg += `<text x="${padL + 4}" y="${y - 3}" fill="var(--white)" font-family="JetBrains Mono,monospace" font-size="9">EXIT</text>`;
  }

  if (!isStatic) {
    const lastCandle = candles[candles.length - 1];
    const lastClose = lastCandle.close;
    const lastCloseY = priceY(lastClose);
    svg += `<line x1="${padL}" y1="${lastCloseY}" x2="${padL + chartW}" y2="${lastCloseY}" stroke="var(--white)" stroke-width="1" opacity="0.5"/>`;
    svg += `<rect x="${svgW - padR + 2}" y="${lastCloseY - 7}" width="58" height="14" rx="2" fill="var(--white)"/>`;
    svg += `<text x="${svgW - padR + 5}" y="${lastCloseY + 3}" fill="#0a0a10" font-family="JetBrains Mono,monospace" font-size="8" font-weight="bold">${escapeAttr(lastClose.toFixed(2))}</text>`;
  }

  candles.forEach((c, i) => {
    const x = padL + i * candleW + (candleW - bodyW) / 2;
    const cx = padL + i * candleW + candleW / 2;
    const bullish = c.close >= c.open;
    const bodyColor = bullish ? '#fb2c5a' : '#475569';
    const wickColor = bullish ? '#fb7185' : '#64748b';
    const bodyTop = priceY(Math.max(c.open, c.close));
    const bodyBot = priceY(Math.min(c.open, c.close));
    const bodyH = Math.max(bodyBot - bodyTop, 1);
    svg += `<line x1="${cx}" y1="${priceY(c.high)}" x2="${cx}" y2="${priceY(c.low)}" stroke="${wickColor}" stroke-width="1"/>`;
    svg += `<rect x="${x}" y="${bodyTop}" width="${bodyW}" height="${bodyH}" fill="${bodyColor}" rx="0.5"/>`;
  });

  svg += '</svg>';
  return svg;
}
