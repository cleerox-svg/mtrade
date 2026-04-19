import { CSSProperties, useEffect, useMemo, useState } from 'react';
import GlassCard from '../components/ui/GlassCard';
import StatCube from '../components/ui/StatCube';

interface JournalEntry {
  id: number;
  user_id: string;
  trade_log_id: number | null;
  setup_id: number | null;
  instrument_id: number | null;
  date: string;
  direction: 'long' | 'short' | string;
  contracts: number | null;
  entry_price: number | null;
  stop_price: number | null;
  target_price: number | null;
  exit_price: number | null;
  pnl: number | null;
  rr_target: number | null;
  rr_achieved: number | null;
  setup_phase: number | null;
  notes: string | null;
  tags: string | null;
  created_at: string;
  has_ai_analysis: 0 | 1;
  has_chart_snapshot: 0 | 1;
  symbol: string | null;
}

interface Candle {
  timestamp: string;
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartSnapshot {
  candles: Candle[];
  session: Record<string, number | null> | null;
  captured_at: string;
}

interface JournalDetail extends JournalEntry {
  chart_snapshot_svg: string | null;
  ai_analysis: string | null;
  ai_entry_reasoning: string | null;
  similar_setups_json: string | null;
}

type InstrumentFilter = 'ALL' | 'NQ' | 'ES';
type OutcomeFilter = 'ALL' | 'WON' | 'LOST';
type DaysFilter = 7 | 30 | 90;

function formatUsd(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? '+' : '';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? '-' : sign}$${formatted}`;
}

function formatDateTime(createdAt: string, date: string): { d: string; t: string } {
  const iso = createdAt || date;
  const dt = new Date(iso.includes('T') ? iso : `${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) {
    return { d: date, t: '' };
  }
  const d = dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const t = dt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return { d, t };
}

function MiniChart({ snapshot, entryPrice, direction }: {
  snapshot: ChartSnapshot | null;
  entryPrice: number | null;
  direction: string;
}) {
  const W = 160;
  const H = 80;

  if (!snapshot || !snapshot.candles || snapshot.candles.length === 0) {
    return (
      <div
        style={{
          width: W,
          height: H,
          borderRadius: 8,
          border: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9,
          letterSpacing: '0.1em',
          color: 'var(--subtle)',
          textTransform: 'uppercase',
          backgroundColor: 'rgba(14,14,20,0.5)',
        }}
      >
        No chart
      </div>
    );
  }

  const candles = snapshot.candles.slice(-30);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const maxVal = Math.max(...highs, entryPrice ?? -Infinity);
  const minVal = Math.min(...lows, entryPrice ?? Infinity);
  const range = Math.max(maxVal - minVal, 0.0001);

  const padX = 4;
  const padY = 6;
  const plotW = W - padX * 2;
  const plotH = H - padY * 2;
  const step = plotW / candles.length;
  const bodyW = Math.max(1.2, step * 0.6);

  const yFor = (v: number) => padY + ((maxVal - v) / range) * plotH;

  const entryY = entryPrice != null ? yFor(entryPrice) : null;
  const markerColor = direction === 'long' ? 'var(--green)' : 'var(--danger)';

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        borderRadius: 8,
        border: '1px solid var(--glass-border)',
        backgroundColor: 'rgba(14,14,20,0.6)',
        display: 'block',
      }}
      aria-label="Trade chart snapshot"
    >
      {candles.map((c, i) => {
        const cx = padX + step * (i + 0.5);
        const isUp = c.close >= c.open;
        const color = isUp ? 'var(--green)' : 'var(--danger)';
        const yHigh = yFor(c.high);
        const yLow = yFor(c.low);
        const yOpen = yFor(c.open);
        const yClose = yFor(c.close);
        const bodyTop = Math.min(yOpen, yClose);
        const bodyH = Math.max(1, Math.abs(yClose - yOpen));
        return (
          <g key={i}>
            <line
              x1={cx}
              x2={cx}
              y1={yHigh}
              y2={yLow}
              stroke={color}
              strokeWidth={0.8}
              opacity={0.75}
            />
            <rect
              x={cx - bodyW / 2}
              y={bodyTop}
              width={bodyW}
              height={bodyH}
              fill={color}
              opacity={0.9}
            />
          </g>
        );
      })}
      {entryY != null && (
        <>
          <line
            x1={padX}
            x2={W - padX}
            y1={entryY}
            y2={entryY}
            stroke={markerColor}
            strokeWidth={0.8}
            strokeDasharray="2 2"
            opacity={0.6}
          />
          <circle
            cx={W - padX - 4}
            cy={entryY}
            r={2.5}
            fill={markerColor}
            stroke="var(--bg-primary)"
            strokeWidth={0.8}
          />
        </>
      )}
    </svg>
  );
}

function StarRating({ rating }: { rating: number }) {
  const max = 5;
  const clamped = Math.max(0, Math.min(max, Math.round(rating)));
  return (
    <div
      style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}
      aria-label={`Rating ${clamped} of ${max}`}
      title={`${clamped}/${max}`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 9999,
            background: i < clamped ? 'var(--red)' : 'var(--subtle)',
            boxShadow: i < clamped ? '0 0 6px rgba(251,44,90,0.55)' : 'none',
            display: 'inline-block',
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function DirectionPill({ direction }: { direction: string }) {
  const isLong = direction === 'long';
  const label = isLong ? 'LONG' : 'SHORT';
  const color = isLong ? 'var(--green)' : 'var(--danger)';
  const bg = isLong ? 'rgba(52,211,153,0.14)' : 'rgba(239,68,68,0.14)';
  const border = isLong ? 'rgba(52,211,153,0.4)' : 'rgba(239,68,68,0.4)';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color,
        backgroundColor: bg,
        border: `1px solid ${border}`,
      }}
    >
      {label}
    </span>
  );
}

function InstrumentTag({ symbol }: { symbol: string | null }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 7px',
        borderRadius: 6,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: 'var(--red-soft)',
        backgroundColor: 'rgba(251,44,90,0.1)',
        border: '1px solid rgba(251,44,90,0.25)',
      }}
    >
      {symbol ?? '—'}
    </span>
  );
}

function TradeCard({ entry, onToggle, expanded }: {
  entry: JournalEntry;
  onToggle: () => void;
  expanded: boolean;
}) {
  const [detail, setDetail] = useState<JournalDetail | null>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!entry.has_chart_snapshot && !entry.has_ai_analysis) return;
    let cancelled = false;
    fetch(`/api/journal/${entry.id}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setDetail(d as JournalDetail);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [entry.id, entry.has_chart_snapshot, entry.has_ai_analysis]);

  const snapshot = useMemo<ChartSnapshot | null>(() => {
    if (!detail?.chart_snapshot_svg) return null;
    try {
      return JSON.parse(detail.chart_snapshot_svg) as ChartSnapshot;
    } catch {
      return null;
    }
  }, [detail]);

  const aiParsed = useMemo<Record<string, unknown> | null>(() => {
    if (!detail?.ai_analysis) return null;
    try {
      return JSON.parse(detail.ai_analysis) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [detail]);

  const rating = typeof aiParsed?.rating === 'number' ? (aiParsed.rating as number) : null;

  const pnl = entry.pnl ?? 0;
  const pnlColor = pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--danger)' : 'var(--muted)';
  const { d, t } = formatDateTime(entry.created_at, entry.date);

  const cardStyle: CSSProperties = {
    position: 'relative',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    backgroundColor: hover ? 'var(--bg-card-hover)' : 'var(--bg-card)',
    border: `1px solid ${hover ? 'var(--glass-border-hover)' : 'var(--glass-border)'}`,
    borderRadius: 14,
    padding: 16,
    boxShadow: hover ? '0 10px 28px rgba(0,0,0,0.45)' : '0 4px 18px rgba(0,0,0,0.3)',
    transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
    transform: hover ? 'translateY(-1px)' : 'translateY(0)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflow: 'hidden',
  };

  const dateStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    color: 'var(--label)',
    letterSpacing: '0.04em',
  };

  const pnlStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 22,
    fontWeight: 700,
    color: pnlColor,
    lineHeight: 1.1,
  };

  const priceRowStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
    color: 'var(--text)',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const rrStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--amber)',
  };

  const hasRR = entry.rr_achieved != null && Number.isFinite(entry.rr_achieved);

  return (
    <div
      style={cardStyle}
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      aria-expanded={expanded}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={dateStyle}>
          {d}
          {t && ` · ${t}`}
        </span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
          <DirectionPill direction={entry.direction} />
          <InstrumentTag symbol={entry.symbol} />
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={pnlStyle}>{formatUsd(pnl, { sign: true })}</div>
          <div style={priceRowStyle}>
            <span style={{ color: 'var(--muted)' }}>ENTRY</span>
            <span>{entry.entry_price != null ? entry.entry_price.toFixed(2) : '—'}</span>
            <span style={{ color: 'var(--subtle)' }}>→</span>
            <span style={{ color: 'var(--muted)' }}>EXIT</span>
            <span>{entry.exit_price != null ? entry.exit_price.toFixed(2) : '—'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {hasRR && (
              <span style={rrStyle}>
                1:{(entry.rr_achieved as number).toFixed(2)}
              </span>
            )}
            {rating != null && <StarRating rating={rating} />}
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          <MiniChart
            snapshot={snapshot}
            entryPrice={entry.entry_price}
            direction={entry.direction}
          />
        </div>
      </div>

      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--glass-border)',
            paddingTop: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {entry.notes && (
            <div
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 13,
                color: 'var(--text)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {entry.notes}
            </div>
          )}
          {aiParsed?.entry_reasoning != null && (
            <div
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 12,
                color: 'var(--muted)',
                lineHeight: 1.5,
              }}
            >
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'var(--red-soft)',
                  textTransform: 'uppercase',
                  marginRight: 8,
                }}
              >
                AI
              </span>
              {String(aiParsed.entry_reasoning)}
            </div>
          )}
          {!entry.notes && !aiParsed?.entry_reasoning && (
            <div
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 12,
                color: 'var(--muted)',
                fontStyle: 'italic',
              }}
            >
              No notes yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <GlassCard>
      <div
        style={{
          padding: '48px 16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          alignItems: 'center',
        }}
      >
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--subtle)' }}
          aria-hidden="true"
        >
          <path d="M4 4h12a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-2 3V4z" />
          <line x1="8" y1="9" x2="14" y2="9" />
          <line x1="8" y1="13" x2="12" y2="13" />
        </svg>
        <div
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--bright)',
          }}
        >
          No journal entries yet
        </div>
        <div
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 13,
            color: 'var(--muted)',
            maxWidth: 360,
            lineHeight: 1.6,
          }}
        >
          Log a trade to start building your journal.
        </div>
      </div>
    </GlassCard>
  );
}

function FilterSegment<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '1px solid var(--glass-border)',
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: 'rgba(14,14,20,0.4)',
      }}
      role="radiogroup"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 12px',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: active ? 'rgba(251,44,90,0.14)' : 'transparent',
              color: active ? 'var(--red)' : 'var(--label)',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FilterLabel({ children }: { children: string }) {
  return (
    <span
      style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
        letterSpacing: '0.16em',
        color: 'var(--muted)',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [instrumentFilter, setInstrumentFilter] = useState<InstrumentFilter>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('ALL');
  const [days, setDays] = useState<DaysFilter>(30);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/journal?days=${days}`, { credentials: 'same-origin' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return (await r.json()) as JournalEntry[];
      })
      .then((data) => {
        if (cancelled) return;
        setEntries(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Unknown error');
        setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e) => {
      if (instrumentFilter !== 'ALL' && e.symbol !== instrumentFilter) return false;
      if (outcomeFilter === 'WON' && !((e.pnl ?? 0) > 0)) return false;
      if (outcomeFilter === 'LOST' && !((e.pnl ?? 0) < 0)) return false;
      return true;
    });
  }, [entries, instrumentFilter, outcomeFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const wins = filtered.filter((e) => (e.pnl ?? 0) > 0).length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const totalPnl = filtered.reduce((s, e) => s + (e.pnl ?? 0), 0);
    const rrValues = filtered
      .map((e) => e.rr_achieved)
      .filter((r): r is number => r != null && Number.isFinite(r));
    const avgRR =
      rrValues.length > 0
        ? rrValues.reduce((s, r) => s + r, 0) / rrValues.length
        : 0;
    return { total, winRate, totalPnl, avgRR };
  }, [filtered]);

  const titleStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--bright)',
    letterSpacing: '0.04em',
  };

  const sectionStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    maxWidth: 1100,
    margin: '0 auto',
    width: '100%',
  };

  const statsGridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
  };

  const filterRowStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    alignItems: 'center',
  };

  const filterGroupStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  };

  const pnlColor =
    stats.totalPnl > 0 ? 'var(--green)' : stats.totalPnl < 0 ? 'var(--danger)' : 'var(--bright)';

  return (
    <div style={sectionStyle}>
      <style>{`
        @media (min-width: 640px) {
          .journal-stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }
        @media (min-width: 960px) {
          .journal-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>

      <GlassCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={titleStyle}>TRADE JOURNAL</div>
          <div style={filterRowStyle}>
            <div style={filterGroupStyle}>
              <FilterLabel>Instrument</FilterLabel>
              <FilterSegment<InstrumentFilter>
                options={[
                  { label: 'All', value: 'ALL' },
                  { label: 'NQ', value: 'NQ' },
                  { label: 'ES', value: 'ES' },
                ]}
                value={instrumentFilter}
                onChange={setInstrumentFilter}
              />
            </div>
            <div style={filterGroupStyle}>
              <FilterLabel>Outcome</FilterLabel>
              <FilterSegment<OutcomeFilter>
                options={[
                  { label: 'All', value: 'ALL' },
                  { label: 'Won', value: 'WON' },
                  { label: 'Lost', value: 'LOST' },
                ]}
                value={outcomeFilter}
                onChange={setOutcomeFilter}
              />
            </div>
            <div style={filterGroupStyle}>
              <FilterLabel>Range</FilterLabel>
              <FilterSegment<DaysFilter>
                options={[
                  { label: '7d', value: 7 },
                  { label: '30d', value: 30 },
                  { label: '90d', value: 90 },
                ]}
                value={days}
                onChange={setDays}
              />
            </div>
          </div>

          <div style={statsGridStyle} className="journal-stats-grid">
            <StatCube label="Trades" value={stats.total} color="var(--bright)" />
            <StatCube
              label="Win Rate"
              value={`${stats.winRate}%`}
              color={stats.winRate >= 50 ? 'var(--green)' : 'var(--bright)'}
            />
            <StatCube
              label="Total P&L"
              value={formatUsd(stats.totalPnl, { sign: true })}
              color={pnlColor}
            />
            <StatCube
              label="Avg R:R"
              value={stats.avgRR > 0 ? `1:${stats.avgRR.toFixed(2)}` : '—'}
              color="var(--amber)"
            />
          </div>
        </div>
      </GlassCard>

      {loading && !entries ? (
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11,
            letterSpacing: '0.15em',
            color: 'var(--muted)',
            textAlign: 'center',
            padding: '24px 0',
            textTransform: 'uppercase',
          }}
        >
          Loading journal…
        </div>
      ) : error ? (
        <GlassCard>
          <div
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 13,
              color: 'var(--danger)',
              textAlign: 'center',
              padding: '16px 0',
            }}
          >
            Failed to load journal: {error}
          </div>
        </GlassCard>
      ) : filtered.length === 0 ? (
        entries && entries.length === 0 ? (
          <EmptyState />
        ) : (
          <GlassCard>
            <div
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 13,
                color: 'var(--muted)',
                textAlign: 'center',
                padding: '16px 0',
              }}
            >
              No entries match the current filters.
            </div>
          </GlassCard>
        )
      ) : (
        <div
          className="journal-card-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 12,
          }}
        >
          {filtered.map((entry) => (
            <TradeCard
              key={entry.id}
              entry={entry}
              expanded={expandedId === entry.id}
              onToggle={() =>
                setExpandedId((cur) => (cur === entry.id ? null : entry.id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
