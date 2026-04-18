import { ReactNode, CSSProperties, useState } from 'react';

export interface StatCubeProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: ReactNode;
  trend?: {
    direction: 'up' | 'down';
    value: string | number;
  };
}

export default function StatCube({
  label,
  value,
  color = 'var(--white)',
  icon,
  trend,
}: StatCubeProps) {
  const [hover, setHover] = useState(false);

  const containerStyle: CSSProperties = {
    position: 'relative',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 14,
    padding: '14px 16px',
    boxShadow: hover
      ? `0 10px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 24px ${color === 'var(--white)' ? 'rgba(251,44,90,0.06)' : 'rgba(255,255,255,0.02)'}`
      : `0 6px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04), inset 0 0 18px ${color === 'var(--white)' ? 'rgba(251,44,90,0.04)' : 'rgba(255,255,255,0.02)'}`,
    transform: hover ? 'translateY(-2px)' : 'translateY(0)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };

  const labelRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  };

  const labelStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--label)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };

  const valueStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.1,
    color,
  };

  const trendColor = trend?.direction === 'up' ? 'var(--green)' : 'var(--danger)';
  const trendStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    fontWeight: 600,
    color: trendColor,
  };

  return (
    <div
      style={containerStyle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={labelRowStyle}>
        <span style={labelStyle}>
          {icon && <span style={{ display: 'inline-flex', color: 'var(--label)' }}>{icon}</span>}
          {label}
        </span>
        {trend && (
          <span style={trendStyle}>
            {trend.direction === 'up' ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 15 12 9 18 15" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
            {trend.value}
          </span>
        )}
      </div>
      <div style={valueStyle}>{value}</div>
    </div>
  );
}
