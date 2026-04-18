import { CSSProperties } from 'react';

export interface GaugeProps {
  value: number;
  max: number;
  label: string;
  format?: (value: number, max: number) => string;
  warningAt?: number;
  criticalAt?: number;
}

type GaugeState = 'normal' | 'warning' | 'critical';

function resolveState(ratio: number, warningAt?: number, criticalAt?: number): GaugeState {
  if (criticalAt !== undefined && ratio >= criticalAt) return 'critical';
  if (warningAt !== undefined && ratio >= warningAt) return 'warning';
  return 'normal';
}

const fills: Record<GaugeState, { gradient: string; glow: string }> = {
  normal: {
    gradient: 'linear-gradient(90deg, #fb2c5a 0%, #fb7185 100%)',
    glow: '0 0 10px rgba(251,44,90,0.45)',
  },
  warning: {
    gradient: 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
    glow: '0 0 10px rgba(251,191,36,0.4)',
  },
  critical: {
    gradient: 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
    glow: '0 0 12px rgba(239,68,68,0.55)',
  },
};

export default function Gauge({
  value,
  max,
  label,
  format,
  warningAt,
  criticalAt,
}: GaugeProps) {
  const safeMax = max <= 0 ? 1 : max;
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const state = resolveState(ratio, warningAt, criticalAt);
  const fill = fills[state];

  const display = format ? format(value, max) : `${value} / ${max}`;

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
  };

  const trackStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  };

  const fillStyle: CSSProperties = {
    width: `${ratio * 100}%`,
    height: '100%',
    background: fill.gradient,
    boxShadow: fill.glow,
    borderRadius: 3,
    transition: 'width 0.3s ease',
  };

  return (
    <div>
      <div style={rowStyle}>
        <span style={{ color: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <span style={{ color: 'var(--bright)', fontWeight: 600 }}>{display}</span>
      </div>
      <div style={trackStyle}>
        <div style={fillStyle} />
      </div>
    </div>
  );
}
