import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import GlassCard from '../components/ui/GlassCard';
import StatCube from '../components/ui/StatCube';
import Button from '../components/ui/Button';
import StrategyChart, {
  StrategyInstrument,
} from '../components/charts/StrategyChart';
import { useApi } from '../hooks/useApi';

interface SnapshotCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  timeframe?: string;
}

interface SnapshotSession {
  london_high: number | null;
  london_low: number | null;
  ny_high?: number | null;
  ny_low?: number | null;
}

interface SnapshotFvg {
  high: number;
  low: number;
  type?: 'bullish' | 'bearish';
}

interface ChartSnapshot {
  candles: SnapshotCandle[];
  session: SnapshotSession | null;
  captured_at?: string;
  fvgs?: SnapshotFvg[];
  ifvgs?: SnapshotFvg[];
  bos_level?: number | null;
}

function symbolToInstrument(sym: string | null): StrategyInstrument {
  if (sym === 'ES' || sym === 'NQ' || sym === 'MES' || sym === 'MNQ') return sym;
  return 'NQ';
}

interface JournalDetail {
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
  symbol: string | null;
  chart_snapshot_svg: string | null;
  ai_analysis: string | null;
  ai_entry_reasoning: string | null;
  similar_setups_json: string | null;
}

interface AiAnalysis {
  entry_reasoning?: string;
  what_worked?: string;
  what_didnt?: string;
  lessons?: string;
  rating?: number;
}

interface SimilarSetup {
  id: number;
  date: string;
  sweep_direction: string | null;
  phase: number | null;
  status: string | null;
  risk_reward: number | null;
  entry_price: number | null;
  target_price: number | null;
  stop_price: number | null;
  confidence: number | null;
  symbol: string | null;
  fvg_timeframe: string | null;
}

interface JournalListItem {
  id: number;
  setup_id: number | null;
  pnl: number | null;
}

const PHASE_INFO: Record<number, { name: string; cologne: string }> = {
  1: { name: 'Sweep', cologne: 'TOP NOTE' },
  2: { name: 'Displacement', cologne: 'HEART NOTE' },
  3: { name: 'Reversal', cologne: 'MIDDLE NOTE' },
  4: { name: 'Continuation', cologne: 'BASE NOTE' },
};

function formatUsd(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? '+' : '';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? '-' : sign}$${formatted}`;
}

function formatDate(createdAt: string, date: string): string {
  const iso = createdAt || date;
  const dt = new Date(iso.includes('T') ? iso : `${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return date;
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
  return `${d} · ${t}`;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // fall through to split
    }
  }
  return trimmed
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
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
        padding: '2px 9px',
        borderRadius: 999,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
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
        fontSize: 11,
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

function SkeletonBlock({ height, width }: { height: number; width?: number | string }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{
        height,
        width: width ?? '100%',
      }}
    />
  );
}

function RatingRow({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <div
      style={{ display: 'inline-flex', gap: 6 }}
      role="img"
      aria-label={`${clamped} out of 5`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: i < clamped ? 'var(--red)' : 'rgba(255,255,255,0.08)',
            display: 'inline-block',
          }}
        />
      ))}
    </div>
  );
}

function AnalysisSection({
  heading,
  body,
  accent,
}: {
  heading: string;
  body: string | undefined;
  accent?: boolean;
}) {
  if (!body) return null;
  return (
    <div
      style={{
        padding: 16,
        borderTop: '1px solid rgba(255,255,255,0.03)',
        borderLeft: accent ? '2px solid var(--amber)' : undefined,
        paddingLeft: accent ? 14 : 16,
      }}
    >
      <div
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--red-soft)',
          marginBottom: 8,
        }}
      >
        {heading}
      </div>
      <div
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 13,
          color: 'var(--text)',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}
      >
        {body}
      </div>
    </div>
  );
}

function outcomeStyle(status: string | null | undefined): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  const s = (status || '').toLowerCase();
  if (s === 'won') {
    return {
      label: 'WON',
      color: 'var(--green)',
      bg: 'rgba(52,211,153,0.14)',
      border: 'rgba(52,211,153,0.4)',
    };
  }
  if (s === 'lost') {
    return {
      label: 'LOST',
      color: 'var(--danger)',
      bg: 'rgba(239,68,68,0.14)',
      border: 'rgba(239,68,68,0.4)',
    };
  }
  if (s === 'expired') {
    return {
      label: 'EXPIRED',
      color: 'var(--muted)',
      bg: 'rgba(100,116,139,0.14)',
      border: 'rgba(100,116,139,0.4)',
    };
  }
  return {
    label: s.toUpperCase() || '—',
    color: 'var(--muted)',
    bg: 'rgba(100,116,139,0.1)',
    border: 'rgba(100,116,139,0.3)',
  };
}

function formatSimilarDate(iso: string): string {
  const dt = new Date(iso.includes('T') ? iso : `${iso}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sweepDirectionToDirection(sd: string | null | undefined): string {
  const s = (sd || '').toLowerCase();
  if (s === 'bullish' || s === 'long' || s === 'up') return 'long';
  if (s === 'bearish' || s === 'short' || s === 'down') return 'short';
  return 'long';
}

function SimilarCard({
  match,
  journalId,
  journalPnl,
}: {
  match: SimilarSetup;
  journalId: number | null;
  journalPnl: number | null;
}) {
  const outcome = outcomeStyle(match.status);
  const pnl = journalPnl;
  const pnlColor =
    pnl == null
      ? 'var(--muted)'
      : pnl > 0
      ? 'var(--green)'
      : pnl < 0
      ? 'var(--danger)'
      : 'var(--muted)';

  const body = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        backgroundColor: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--glass-border)',
        borderRadius: 10,
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
        flexWrap: 'wrap',
      }}
      onMouseEnter={(e) => {
        if (journalId) {
          e.currentTarget.style.backgroundColor = 'rgba(251,44,90,0.04)';
          e.currentTarget.style.borderColor = 'var(--glass-border-hover)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
        e.currentTarget.style.borderColor = 'var(--glass-border)';
      }}
    >
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 11,
          color: 'var(--label)',
          letterSpacing: '0.04em',
          minWidth: 92,
        }}
      >
        {formatSimilarDate(match.date)}
      </span>
      <DirectionPill direction={sweepDirectionToDirection(match.sweep_direction)} />
      <InstrumentTag symbol={match.symbol} />
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 13,
          fontWeight: 700,
          color: pnlColor,
          minWidth: 72,
        }}
      >
        {pnl != null ? formatUsd(pnl, { sign: true }) : '—'}
      </span>
      <span
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--amber)',
        }}
      >
        {match.risk_reward != null ? `1:${match.risk_reward.toFixed(2)}` : '—'}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          marginLeft: 'auto',
          padding: '2px 8px',
          borderRadius: 999,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: outcome.color,
          backgroundColor: outcome.bg,
          border: `1px solid ${outcome.border}`,
        }}
      >
        {outcome.label}
      </span>
    </div>
  );

  if (journalId) {
    return (
      <Link
        to={`/app/journal/${journalId}`}
        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
      >
        {body}
      </Link>
    );
  }
  return body;
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <GlassCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SkeletonBlock height={14} width={240} />
          <SkeletonBlock height={36} width={200} />
          <SkeletonBlock height={14} width={160} />
          <SkeletonBlock height={14} width={280} />
        </div>
      </GlassCard>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
        }}
        className="journal-entry-stat-grid"
      >
        <SkeletonBlock height={72} />
        <SkeletonBlock height={72} />
        <SkeletonBlock height={72} />
        <SkeletonBlock height={72} />
      </div>
      <GlassCard>
        <SkeletonBlock height={120} />
      </GlassCard>
    </div>
  );
}

export default function JournalEntry() {
  const { id } = useParams<{ id: string }>();
  const url = id ? `/api/journal/${id}` : null;
  const { data, loading, error, refetch } = useApi<JournalDetail>(url);

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [chartHeight, setChartHeight] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 640 ? 420 : 280,
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysisOverride, setAnalysisOverride] = useState<AiAnalysis | null>(null);
  const [findingSimilar, setFindingSimilar] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);
  const [similarOverride, setSimilarOverride] = useState<SimilarSetup[] | null>(null);

  const { data: journalList } = useApi<JournalListItem[]>('/api/journal');

  useEffect(() => {
    if (data) setNotes(data.notes ?? '');
  }, [data]);

  useEffect(() => {
    const onResize = () => {
      setChartHeight(window.innerWidth >= 640 ? 420 : 280);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const snapshot = useMemo<ChartSnapshot | null>(() => {
    if (!data?.chart_snapshot_svg) return null;
    try {
      const parsed = JSON.parse(data.chart_snapshot_svg);
      if (parsed && typeof parsed === 'object') return parsed as ChartSnapshot;
      return null;
    } catch {
      return null;
    }
  }, [data?.chart_snapshot_svg]);

  const storedAnalysis = useMemo<AiAnalysis | null>(() => {
    if (!data?.ai_analysis) return null;
    try {
      const parsed = JSON.parse(data.ai_analysis);
      if (parsed && typeof parsed === 'object') return parsed as AiAnalysis;
      return null;
    } catch {
      return null;
    }
  }, [data?.ai_analysis]);

  const analysis = analysisOverride ?? storedAnalysis;

  const storedSimilar = useMemo<SimilarSetup[] | null>(() => {
    if (!data?.similar_setups_json) return null;
    try {
      const parsed = JSON.parse(data.similar_setups_json);
      if (Array.isArray(parsed)) return parsed as SimilarSetup[];
      return null;
    } catch {
      return null;
    }
  }, [data?.similar_setups_json]);

  const similarMatches = similarOverride ?? storedSimilar;

  const setupToJournal = useMemo(() => {
    const map = new Map<number, { id: number; pnl: number | null }>();
    if (Array.isArray(journalList)) {
      for (const j of journalList) {
        if (j.setup_id != null) {
          map.set(j.setup_id, { id: j.id, pnl: j.pnl });
        }
      }
    }
    return map;
  }, [journalList]);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    maxWidth: 1100,
    margin: '0 auto',
    width: '100%',
  };

  const backLinkStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 13,
    color: 'var(--muted)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    width: 'fit-content',
    transition: 'color 0.15s ease',
  };

  const runAnalyze = async () => {
    if (!id) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch(`/api/journal/${id}/analyze`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`Analyze failed: ${res.status}`);
      const body = (await res.json()) as AiAnalysis;
      setAnalysisOverride(body);
      refetch();
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setAnalyzing(false);
    }
  };

  const runFindSimilar = async () => {
    if (!id) return;
    setFindingSimilar(true);
    setSimilarError(null);
    try {
      const res = await fetch(`/api/journal/${id}/similar`, {
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`Find similar failed: ${res.status}`);
      const body = (await res.json()) as { matches: SimilarSetup[] };
      setSimilarOverride(Array.isArray(body.matches) ? body.matches : []);
      refetch();
    } catch (e) {
      setSimilarError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setFindingSimilar(false);
    }
  };

  const saveNotes = async () => {
    if (!id) return;
    setSaving(true);
    setSaveError(null);
    setSaveOk(false);
    try {
      const res = await fetch(`/api/journal/${id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setSaveOk(true);
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const BackLink = (
    <Link
      to="/app/journal"
      style={backLinkStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--bright)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--muted)';
      }}
    >
      ← Back to Journal
    </Link>
  );

  if (loading && !data) {
    return (
      <div style={containerStyle}>
        <style>{`
          @media (min-width: 640px) {
            .journal-entry-stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          }
        `}</style>
        {BackLink}
        <LoadingSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={containerStyle}>
        {BackLink}
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
            {error ? `Failed to load entry: ${error}` : 'Entry not found.'}
          </div>
        </GlassCard>
      </div>
    );
  }

  const entry = data;
  const pnl = entry.pnl ?? 0;
  const pnlColor = pnl > 0 ? 'var(--green)' : pnl < 0 ? 'var(--danger)' : 'var(--muted)';
  const hasRR = entry.rr_achieved != null && Number.isFinite(entry.rr_achieved);
  const phase = entry.setup_phase != null ? PHASE_INFO[entry.setup_phase] : null;
  const tags = parseTags(entry.tags);

  const dateStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
    color: 'var(--label)',
    letterSpacing: '0.04em',
  };

  const pnlStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 28,
    fontWeight: 700,
    color: pnlColor,
    lineHeight: 1.1,
  };

  const rrStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--amber)',
  };

  const phaseStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 12,
    color: 'var(--label)',
    letterSpacing: '0.03em',
  };

  const textareaStyle: CSSProperties = {
    width: '100%',
    minHeight: 140,
    padding: '12px 14px',
    backgroundColor: '#0a0a10',
    border: '1px solid var(--glass-border)',
    borderRadius: 10,
    color: 'var(--text)',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 13,
    lineHeight: 1.6,
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const tagStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 20,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: '0.08em',
    color: 'var(--red-soft)',
    backgroundColor: 'rgba(251,44,90,0.06)',
    border: '1px solid rgba(251,44,90,0.15)',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @media (min-width: 640px) {
          .journal-entry-stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }
        .journal-entry-notes:focus {
          border-color: var(--red-glow) !important;
          box-shadow: 0 0 0 3px rgba(251,44,90,0.12);
        }
      `}</style>

      {BackLink}

      <GlassCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={dateStyle}>{formatDate(entry.created_at, entry.date)}</span>
            <DirectionPill direction={entry.direction} />
            <InstrumentTag symbol={entry.symbol} />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <span style={pnlStyle}>{formatUsd(pnl, { sign: true })}</span>
            {hasRR && (
              <span style={rrStyle}>
                1:{(entry.rr_achieved as number).toFixed(2)}
              </span>
            )}
          </div>

          {phase && (
            <div style={phaseStyle}>
              <span style={{ color: 'var(--bright)', fontWeight: 600 }}>
                Phase {entry.setup_phase} — {phase.name}
              </span>
              <span
                style={{
                  marginLeft: 8,
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 10,
                  letterSpacing: '0.16em',
                  color: 'var(--red-soft)',
                }}
              >
                ({phase.cologne})
              </span>
            </div>
          )}
        </div>
      </GlassCard>

      <div
        className="journal-entry-stat-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        <StatCube
          label="Entry"
          value={entry.entry_price != null ? entry.entry_price.toFixed(2) : '—'}
          color="var(--red)"
        />
        <StatCube
          label="Stop"
          value={entry.stop_price != null ? entry.stop_price.toFixed(2) : '—'}
          color="var(--danger)"
        />
        <StatCube
          label="Target"
          value={entry.target_price != null ? entry.target_price.toFixed(2) : '—'}
          color="var(--green)"
        />
        <StatCube
          label="Exit"
          value={entry.exit_price != null ? entry.exit_price.toFixed(2) : '—'}
          color="var(--white)"
        />
      </div>

      <GlassCard title="◆ TRADE CHART">
        {snapshot && Array.isArray(snapshot.candles) && snapshot.candles.length > 0 ? (
          <StrategyChart
            instrument={symbolToInstrument(entry.symbol)}
            height={chartHeight}
            staticData={{
              candles: snapshot.candles,
              session: snapshot.session ?? null,
              fvgs: snapshot.fvgs ?? [],
              ifvgs: snapshot.ifvgs ?? [],
              actual_exit_price: entry.exit_price,
            }}
            alertData={{
              entry_price: entry.entry_price,
              stop_price: entry.stop_price,
              target_price: entry.target_price,
              bos_level: snapshot.bos_level ?? null,
              is_active: 1,
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: chartHeight,
              color: 'var(--muted)',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 12,
              letterSpacing: '0.08em',
            }}
          >
            No chart data available
          </div>
        )}
      </GlassCard>

      <GlassCard title="◈ AI TRADE REVIEW">
        {analysis ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {typeof analysis.rating === 'number' && (
              <div style={{ padding: '0 0 12px 0' }}>
                <RatingRow rating={analysis.rating} />
              </div>
            )}
            <AnalysisSection heading="Entry Reasoning" body={analysis.entry_reasoning} />
            <AnalysisSection heading="What Worked" body={analysis.what_worked} />
            <AnalysisSection heading="What Didn't Work" body={analysis.what_didnt} />
            <AnalysisSection heading="Lessons" body={analysis.lessons} accent />
            <div style={{ paddingTop: 16 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={runAnalyze}
                loading={analyzing}
                disabled={analyzing}
              >
                Re-analyze
              </Button>
              {analyzeError && (
                <span
                  style={{
                    marginLeft: 12,
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 12,
                    color: 'var(--danger)',
                  }}
                >
                  {analyzeError}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={runAnalyze}
              loading={analyzing}
              disabled={analyzing}
            >
              Analyze Trade
            </Button>
            {analyzeError && (
              <span
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 12,
                  color: 'var(--danger)',
                }}
              >
                {analyzeError}
              </span>
            )}
          </div>
        )}
      </GlassCard>

      <GlassCard title="◧ SIMILAR SETUPS">
        {similarMatches ? (
          similarMatches.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                No similar setups found in the last 30 days
              </div>
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={runFindSimilar}
                  loading={findingSimilar}
                  disabled={findingSimilar}
                >
                  Find Similar
                </Button>
                {similarError && (
                  <span
                    style={{
                      marginLeft: 12,
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: 12,
                      color: 'var(--danger)',
                    }}
                  >
                    {similarError}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(() => {
                const shown = similarMatches.slice(0, 5);
                const won = shown.filter((m) => (m.status || '').toLowerCase() === 'won').length;
                const lost = shown.filter((m) => (m.status || '').toLowerCase() === 'lost').length;
                const rrs = shown
                  .map((m) => m.risk_reward)
                  .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
                const avgRr =
                  rrs.length > 0
                    ? rrs.reduce((a, b) => a + b, 0) / rrs.length
                    : null;
                return (
                  <div
                    style={{
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: 13,
                      color: 'var(--text)',
                    }}
                  >
                    {shown.length} similar setup{shown.length === 1 ? '' : 's'} found:{' '}
                    {won} won, {lost} lost
                    {avgRr != null && `. Avg R:R 1:${avgRr.toFixed(1)}`}
                  </div>
                );
              })()}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {similarMatches.slice(0, 5).map((m) => {
                  const linked = setupToJournal.get(m.id);
                  return (
                    <SimilarCard
                      key={m.id}
                      match={m}
                      journalId={linked?.id ?? null}
                      journalPnl={linked?.pnl ?? null}
                    />
                  );
                })}
              </div>
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={runFindSimilar}
                  loading={findingSimilar}
                  disabled={findingSimilar}
                >
                  Refresh
                </Button>
                {similarError && (
                  <span
                    style={{
                      marginLeft: 12,
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: 12,
                      color: 'var(--danger)',
                    }}
                  >
                    {similarError}
                  </span>
                )}
              </div>
            </div>
          )
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={runFindSimilar}
              loading={findingSimilar}
              disabled={findingSimilar}
            >
              Find Similar
            </Button>
            {similarError && (
              <span
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 12,
                  color: 'var(--danger)',
                }}
              >
                {similarError}
              </span>
            )}
          </div>
        )}
      </GlassCard>

      <GlassCard title="◈ NOTES">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <textarea
            className="journal-entry-notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setSaveOk(false);
              setSaveError(null);
            }}
            placeholder="Add notes about this trade…"
            style={textareaStyle}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={saveNotes}
              loading={saving}
              disabled={saving || notes === (entry.notes ?? '')}
            >
              Save
            </Button>
            {saveOk && (
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  color: 'var(--green)',
                  textTransform: 'uppercase',
                }}
              >
                Saved
              </span>
            )}
            {saveError && (
              <span
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 12,
                  color: 'var(--danger)',
                }}
              >
                {saveError}
              </span>
            )}
          </div>
          {tags.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                paddingTop: 4,
              }}
            >
              {tags.map((t) => (
                <span key={t} style={tagStyle}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
