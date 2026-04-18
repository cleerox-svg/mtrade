import { CSSProperties, useEffect, useState } from 'react';
import GlassCard from '../ui/GlassCard';
import Button from '../ui/Button';

interface Alert {
  id: number;
  setup_id: number | null;
  instrument_id: number;
  symbol?: string;
  alert_type: string;
  phase?: number | null;
  message?: string | null;
  sweep_direction?: string | null;
  entry_price?: number | null;
  target_price?: number | null;
  stop_price?: number | null;
  risk_reward?: number | null;
  is_active: number;
  created_at: string;
  [key: string]: unknown;
}

async function fetchActive(): Promise<Alert[]> {
  try {
    const res = await fetch('/api/alerts/active', { credentials: 'same-origin' });
    if (!res.ok) return [];
    return (await res.json()) as Alert[];
  } catch {
    return [];
  }
}

function pickAlert(alerts: Alert[]): Alert | null {
  const relevant = alerts.filter(
    (a) => a.is_active === 1 && (a.alert_type === 'ready' || a.alert_type === 'execute'),
  );
  if (relevant.length === 0) return null;
  // Most recent (highest id) first
  return relevant.slice().sort((a, b) => b.id - a.id)[0];
}

function signalNameFor(phase: number): string {
  if (phase >= 5) return 'ACCORD';
  return 'BASE NOTE';
}

function directionLabel(sweep: string | null | undefined): 'LONG' | 'SHORT' {
  // Sweep low = bullish reversal → LONG; sweep high = bearish reversal → SHORT
  return sweep === 'low' ? 'LONG' : 'SHORT';
}

function fmtPrice(v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  return v.toFixed(2);
}

export default function AlertOverlay() {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const alerts = await fetchActive();
      if (cancelled) return;
      setAlert(pickAlert(alerts));
    }

    load();
    const id = window.setInterval(load, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!alert) return null;

  const phase = typeof alert.phase === 'number' ? alert.phase : 0;
  const direction = directionLabel(alert.sweep_direction);
  const symbol = alert.symbol || 'NQ';
  const showImIn = phase >= 4;

  async function handleImIn() {
    if (!alert || busy) return;
    setBusy(true);
    try {
      await fetch('/api/trade-log', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument_id: alert.instrument_id,
          setup_id: alert.setup_id,
          date: new Date().toISOString().slice(0, 10),
          direction: direction.toLowerCase(),
          contracts: 1,
          entry_price: alert.entry_price,
          exit_price: null,
          pnl: 0,
          notes: `Auto-logged from alert #${alert.id} (${signalNameFor(phase)})`,
        }),
      });
      await fetch(`/api/alerts/${alert.id}/dismiss`, {
        method: 'PUT',
        credentials: 'same-origin',
      });
      setAlert(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip() {
    if (!alert || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/alerts/${alert.id}/dismiss`, {
        method: 'PUT',
        credentials: 'same-origin',
      });
      setAlert(null);
    } finally {
      setBusy(false);
    }
  }

  const wrapperStyle: CSSProperties = {
    position: 'relative',
    borderRadius: 16,
    padding: 2,
    background: 'linear-gradient(135deg, rgba(251,44,90,0.06), transparent)',
    animation: 'mtrade-alert-pulse 2s ease-in-out infinite',
  };

  const headerRow: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: 12,
    flexWrap: 'wrap',
  };

  const signalStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 24,
    fontWeight: 800,
    color: 'var(--red)',
    letterSpacing: '0.04em',
  };

  const symbolStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 18,
    color: 'var(--white)',
    letterSpacing: '0.06em',
  };

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12,
    marginTop: 16,
  };

  const cellStyle = (color: string): CSSProperties => ({
    padding: '10px 12px',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid var(--glass-border)',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    color,
  });

  const cellLabel: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    color: 'var(--label)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  };

  const cellValue = (color: string): CSSProperties => ({
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 22,
    fontWeight: 700,
    color,
    lineHeight: 1.1,
  });

  const rrStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 14,
    color: 'var(--amber)',
    marginTop: 12,
  };

  const messageStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 13,
    color: 'var(--label)',
    marginTop: 12,
    lineHeight: 1.5,
  };

  const buttonsStyle: CSSProperties = {
    display: 'flex',
    gap: 12,
    marginTop: 16,
  };

  return (
    <>
      <style>{`
        @keyframes mtrade-alert-pulse {
          0%, 100% {
            box-shadow: 0 0 0 1px rgba(251,44,90,0.1), 0 0 24px rgba(251,44,90,0.1);
          }
          50% {
            box-shadow: 0 0 0 2px rgba(251,44,90,0.5), 0 0 36px rgba(251,44,90,0.35);
          }
        }
      `}</style>
      <div style={wrapperStyle}>
        <GlassCard>
          <div style={headerRow}>
            <span style={signalStyle}>{signalNameFor(phase)}</span>
            <span style={symbolStyle}>
              {symbol} — {direction}
            </span>
          </div>
          <div style={gridStyle}>
            <div style={cellStyle('var(--red)')}>
              <span style={cellLabel}>Entry</span>
              <span style={cellValue('var(--red)')}>{fmtPrice(alert.entry_price)}</span>
            </div>
            <div style={cellStyle('var(--green)')}>
              <span style={cellLabel}>Target</span>
              <span style={cellValue('var(--green)')}>{fmtPrice(alert.target_price)}</span>
            </div>
            <div style={cellStyle('var(--danger)')}>
              <span style={cellLabel}>Stop</span>
              <span style={cellValue('var(--danger)')}>{fmtPrice(alert.stop_price)}</span>
            </div>
          </div>
          <div style={rrStyle}>
            1 : {typeof alert.risk_reward === 'number' ? alert.risk_reward.toFixed(2) : '—'}
          </div>
          {alert.message && <div style={messageStyle}>{alert.message}</div>}
          <div style={buttonsStyle}>
            {showImIn ? (
              <>
                <Button
                  variant="primary"
                  onClick={handleImIn}
                  disabled={busy}
                  style={{ flex: 1 }}
                >
                  I'M IN
                </Button>
                <Button variant="ghost" onClick={handleSkip} disabled={busy}>
                  SKIP
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={busy}
                style={{ flex: 1 }}
              >
                DISMISS
              </Button>
            )}
          </div>
        </GlassCard>
      </div>
    </>
  );
}
