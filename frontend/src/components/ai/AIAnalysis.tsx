import { CSSProperties, useEffect, useState } from 'react';
import GlassCard from '../ui/GlassCard';
import Button from '../ui/Button';

interface Alert {
  id: number;
  is_active: number;
  alert_type: string;
  phase?: number | null;
  [key: string]: unknown;
}

interface Analysis {
  confidence?: number;
  signal?: string;
  fragrance?: string;
  summary?: string;
  entry_price?: number;
  target_price?: number;
  stop_price?: number;
  risk_reward?: number;
  warnings?: string[];
  consistency_check?: string;
  contracts_suggestion?: string;
}

async function fetchActiveAlerts(): Promise<Alert[]> {
  try {
    const res = await fetch('/api/alerts/active', { credentials: 'same-origin' });
    if (!res.ok) return [];
    return (await res.json()) as Alert[];
  } catch {
    return [];
  }
}

function signalColor(signal: string | undefined): string {
  switch (signal) {
    case 'ACCORD':
      return 'var(--red)';
    case 'BASE NOTE':
      return 'var(--amber)';
    case 'HEART NOTE':
      return 'var(--label)';
    case 'TOP NOTE':
      return 'var(--muted)';
    case 'NO TRADE':
      return 'var(--danger)';
    default:
      return 'var(--bright)';
  }
}

export default function AIAnalysis() {
  const [alertId, setAlertId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const alerts = await fetchActiveAlerts();
      if (cancelled) return;
      const active = alerts.find(
        (a) => a.is_active === 1 && (a.alert_type === 'ready' || a.alert_type === 'execute'),
      );
      setAlertId(active ? active.id : null);
    }

    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const endpoint = alertId
        ? `/api/analyze/alert/${alertId}`
        : '/api/analyze/demo';
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error(`Analysis failed (${res.status})`);
      const data = await res.json();
      // /api/analyze/demo returns { alert, analysis }, alert route returns direct analysis
      const result: Analysis =
        data && typeof data === 'object' && 'analysis' in data
          ? ((data as { analysis: Analysis }).analysis ?? {})
          : (data as Analysis);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  const haikuTagStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 9,
    letterSpacing: '0.18em',
    color: 'var(--red)',
    padding: '2px 8px',
    border: '1px solid rgba(251,44,90,0.4)',
    borderRadius: 999,
    textTransform: 'uppercase',
    fontWeight: 700,
  };

  const loadingStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 0',
    color: 'var(--label)',
    fontFamily: 'Outfit, sans-serif',
    fontSize: 13,
    justifyContent: 'center',
  };

  const spinnerStyle: CSSProperties = {
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: '2px solid rgba(251,44,90,0.2)',
    borderTopColor: 'var(--red)',
    animation: 'mtrade-spin 0.8s linear infinite',
  };

  const signalRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  };

  const signalTagStyle = (sig: string | undefined): CSSProperties => ({
    fontFamily: 'Outfit, sans-serif',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: signalColor(sig),
    padding: '4px 10px',
    border: `1px solid ${signalColor(sig)}`,
    borderRadius: 999,
    textTransform: 'uppercase',
  });

  const confStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 32,
    fontWeight: 800,
    color: 'var(--white)',
    lineHeight: 1,
  };

  const fragranceStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 11,
    color: 'var(--label)',
    fontStyle: 'italic',
    marginTop: 6,
    letterSpacing: '0.04em',
  };

  const summaryStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 13,
    color: 'var(--text)',
    lineHeight: 1.5,
    marginTop: 12,
  };

  const levelBoxStyle: CSSProperties = {
    marginTop: 14,
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--glass-border)',
    borderRadius: 10,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };

  const levelRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
  };

  const levelLabelStyle: CSSProperties = {
    color: 'var(--muted)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontSize: 10,
  };

  const levelValueStyle = (color: string): CSSProperties => ({
    color,
    fontWeight: 700,
    fontSize: 13,
  });

  const warnWrapStyle: CSSProperties = {
    marginTop: 14,
  };

  const warnTitleStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 10,
    color: 'var(--muted)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginBottom: 6,
  };

  const warnItemStyle: CSSProperties = {
    display: 'flex',
    gap: 8,
    fontFamily: 'Outfit, sans-serif',
    fontSize: 12,
    color: 'var(--text)',
    padding: '4px 0',
    lineHeight: 1.4,
  };

  const bulletStyle: CSSProperties = {
    color: 'var(--red)',
    flexShrink: 0,
    marginTop: 1,
  };

  const redlineStyle: CSSProperties = {
    marginTop: 14,
    padding: '10px 12px',
    background: 'rgba(239,68,68,0.05)',
    borderLeft: '3px solid var(--danger)',
    borderRadius: 4,
    fontFamily: 'Outfit, sans-serif',
    fontSize: 12,
    color: 'var(--label)',
    lineHeight: 1.5,
  };

  const redlineTitleStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    color: 'var(--danger)',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    fontWeight: 700,
    marginBottom: 4,
  };

  return (
    <GlassCard title="◈ AI ANALYSIS">
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: -8,
          marginBottom: 8,
        }}
      >
        <span style={haikuTagStyle}>HAIKU</span>
      </div>

      <Button
        variant="secondary"
        onClick={runAnalysis}
        disabled={loading}
        style={{ color: 'var(--red)', width: '100%' }}
      >
        {loading ? 'Analyzing...' : analysis ? 'Re-analyze' : 'Run Analysis'}
      </Button>

      {loading && (
        <div style={loadingStyle}>
          <span style={spinnerStyle} aria-hidden="true" />
          <span>Analyzing...</span>
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            marginTop: 12,
            color: 'var(--danger)',
            fontFamily: 'Outfit, sans-serif',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {analysis && !loading && (
        <div style={{ marginTop: 16 }}>
          <div style={signalRowStyle}>
            <span style={signalTagStyle(analysis.signal)}>
              {analysis.signal ?? '—'}
            </span>
            <span style={confStyle}>
              {typeof analysis.confidence === 'number' ? analysis.confidence : '—'}
            </span>
          </div>
          {analysis.fragrance && (
            <div style={fragranceStyle}>{analysis.fragrance}</div>
          )}
          {analysis.summary && <div style={summaryStyle}>{analysis.summary}</div>}

          <div style={levelBoxStyle}>
            <div style={levelRowStyle}>
              <span style={levelLabelStyle}>Entry</span>
              <span style={levelValueStyle('var(--red)')}>
                {typeof analysis.entry_price === 'number'
                  ? analysis.entry_price.toFixed(2)
                  : '—'}
              </span>
            </div>
            <div style={levelRowStyle}>
              <span style={levelLabelStyle}>Target</span>
              <span style={levelValueStyle('var(--green)')}>
                {typeof analysis.target_price === 'number'
                  ? analysis.target_price.toFixed(2)
                  : '—'}
              </span>
            </div>
            <div style={levelRowStyle}>
              <span style={levelLabelStyle}>Stop</span>
              <span style={levelValueStyle('var(--danger)')}>
                {typeof analysis.stop_price === 'number'
                  ? analysis.stop_price.toFixed(2)
                  : '—'}
              </span>
            </div>
            <div style={levelRowStyle}>
              <span style={levelLabelStyle}>R : R</span>
              <span style={levelValueStyle('var(--amber)')}>
                {typeof analysis.risk_reward === 'number'
                  ? `1 : ${analysis.risk_reward.toFixed(2)}`
                  : '—'}
              </span>
            </div>
          </div>

          {Array.isArray(analysis.warnings) && analysis.warnings.length > 0 && (
            <div style={warnWrapStyle}>
              <div style={warnTitleStyle}>Warnings</div>
              {analysis.warnings.map((w, i) => (
                <div key={i} style={warnItemStyle}>
                  <span style={bulletStyle} aria-hidden="true">•</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {(analysis.consistency_check || analysis.contracts_suggestion) && (
            <div style={redlineStyle}>
              <div style={redlineTitleStyle}>Redline Check</div>
              {analysis.consistency_check && (
                <div style={{ marginBottom: analysis.contracts_suggestion ? 6 : 0 }}>
                  {analysis.consistency_check}
                </div>
              )}
              {analysis.contracts_suggestion && (
                <div style={{ color: 'var(--text)' }}>
                  {analysis.contracts_suggestion}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
