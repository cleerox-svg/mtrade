import { CSSProperties, useEffect, useState } from 'react';
import GlassCard from '../ui/GlassCard';

interface Setup {
  id: number;
  phase: number;
  status: string;
  symbol?: string;
  [key: string]: unknown;
}

interface SetupsResponse {
  setups: Setup[];
  sessions?: unknown[];
}

interface PhaseDef {
  index: number;
  label: string;
  description: string;
}

const PHASES: PhaseDef[] = [
  { index: 0, label: 'London Range', description: 'Watching London session high/low form' },
  { index: 1, label: 'Liquidity Sweep', description: 'Price broke above/below London range' },
  { index: 2, label: 'Break of Structure', description: 'Confirmation of shift in market structure' },
  { index: 3, label: 'FVG Retracement', description: 'Price returning to fair value gap' },
  { index: 4, label: 'Continuation', description: 'Setup is primed — watching for trigger' },
  { index: 5, label: 'Entry', description: 'Execute the trade now' },
];

const PHASE_MESSAGES: Record<number, string> = {
  0: 'Letting London breathe — collecting top notes.',
  1: 'Liquidity grabbed — the opening accord is forming.',
  2: 'Structure shifted — the middle register is developing.',
  3: 'Retrace into the fair value gap — heart notes settling.',
  4: 'Base notes rising — primed for the accord.',
  5: 'The accord is here — execute with intention.',
};

function phaseTag(phase: number): { label: string; color: string } {
  if (phase >= 5) return { label: 'ACCORD', color: 'var(--red)' };
  if (phase >= 4) return { label: 'BASE NOTE', color: 'var(--amber)' };
  if (phase >= 2) return { label: 'HEART NOTE', color: 'var(--label)' };
  return { label: 'TOP NOTE', color: 'var(--muted)' };
}

function PhaseRow({
  phase,
  currentPhase,
}: {
  phase: PhaseDef;
  currentPhase: number;
}) {
  const completed = phase.index < currentPhase;
  const isCurrent = phase.index === currentPhase;

  let dotColor = 'rgba(255,255,255,0.15)';
  let dotGlow = 'none';
  let labelColor: string = 'var(--muted)';
  let descColor: string = 'var(--muted)';
  let opacity = 0.5;
  let animation = 'none';

  if (completed) {
    dotColor = 'var(--red)';
    dotGlow = '0 0 8px var(--red), 0 0 14px rgba(251,44,90,0.5)';
    labelColor = 'var(--red)';
    descColor = 'var(--label)';
    opacity = 1;
  } else if (isCurrent) {
    dotColor = 'var(--amber)';
    dotGlow = '0 0 10px rgba(251,191,36,0.7)';
    labelColor = 'var(--amber)';
    descColor = 'var(--label)';
    opacity = 1;
    animation = 'mtrade-pulse 1.6s ease-in-out infinite';
  }

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '10px 0',
    opacity,
    transition: 'opacity 0.2s ease',
  };

  const dotStyle: CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: 9999,
    backgroundColor: dotColor,
    boxShadow: dotGlow,
    marginTop: 5,
    flexShrink: 0,
    animation,
  };

  const labelStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    color: labelColor,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    letterSpacing: '0.02em',
  };

  const descStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 11,
    color: descColor,
    marginTop: 3,
    lineHeight: 1.4,
  };

  const checkStyle: CSSProperties = {
    color: 'var(--red)',
    fontSize: 12,
    fontWeight: 700,
  };

  return (
    <div style={rowStyle}>
      <span style={dotStyle} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={labelStyle}>
          <span>{phase.label}</span>
          {completed && <span style={checkStyle} aria-hidden="true">✓</span>}
        </div>
        <div style={descStyle}>{phase.description}</div>
      </div>
    </div>
  );
}

async function fetchSetups(): Promise<SetupsResponse | null> {
  try {
    const res = await fetch('/api/setups/active', { credentials: 'same-origin' });
    if (!res.ok) return null;
    return (await res.json()) as SetupsResponse;
  } catch {
    return null;
  }
}

export default function PhaseTracker() {
  const [currentPhase, setCurrentPhase] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const data = await fetchSetups();
      if (cancelled) return;
      if (data && Array.isArray(data.setups) && data.setups.length > 0) {
        const topPhase = data.setups.reduce((max, s) => {
          const p = typeof s.phase === 'number' ? s.phase : 0;
          return p > max ? p : max;
        }, 0);
        setCurrentPhase(topPhase);
      } else {
        setCurrentPhase(0);
      }
      setLoaded(true);
    }

    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const tag = phaseTag(currentPhase);
  const statusAccent = currentPhase >= 4 ? 'var(--red)' : 'var(--amber)';
  const message = PHASE_MESSAGES[currentPhase] ?? '';

  const tagStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: '0.15em',
    color: tag.color,
    padding: '3px 8px',
    border: `1px solid ${tag.color}`,
    borderRadius: 999,
    textTransform: 'uppercase',
    fontWeight: 700,
  };

  const statusBoxStyle: CSSProperties = {
    marginTop: 12,
    padding: '10px 12px',
    borderLeft: `3px solid ${statusAccent}`,
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 4,
    fontFamily: 'Outfit, sans-serif',
    fontSize: 12,
    color: 'var(--label)',
    lineHeight: 1.45,
    fontStyle: 'italic',
  };

  return (
    <GlassCard title="◇ SIGNAL PROGRESSION">
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: -8,
          marginBottom: 4,
        }}
      >
        <span style={tagStyle}>{tag.label}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {PHASES.map((p) => (
          <PhaseRow key={p.index} phase={p} currentPhase={currentPhase} />
        ))}
      </div>
      {loaded && <div style={statusBoxStyle}>{message}</div>}
    </GlassCard>
  );
}
