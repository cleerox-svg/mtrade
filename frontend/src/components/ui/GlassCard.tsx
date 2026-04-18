import { ReactNode, useState, CSSProperties } from 'react';

export interface GlassCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  glowColor?: string;
}

export default function GlassCard({
  children,
  className = '',
  title,
  icon,
  collapsible = false,
  defaultOpen = true,
  glowColor = 'rgba(251,44,90,0.12)',
}: GlassCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const cardStyle: CSSProperties = {
    position: 'relative',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
    transition: 'border-color 0.3s ease, background-color 0.3s ease',
    overflow: 'hidden',
  };

  const topEdgeStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)`,
    pointerEvents: 'none',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: open ? 16 : 0,
  };

  const titleStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: 'Outfit, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--red-soft)',
  };

  return (
    <div
      className={`glass-card ${className}`}
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--glass-border-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--glass-border)';
      }}
    >
      <span style={topEdgeStyle} aria-hidden="true" />
      {title && (
        <div style={headerStyle}>
          <div style={titleStyle}>
            {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
            <span>{title}</span>
          </div>
          {collapsible && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? 'Collapse' : 'Expand'}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--label)',
                cursor: 'pointer',
                padding: 4,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s ease, color 0.2s ease',
                transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
        </div>
      )}
      {(!collapsible || open) && <div>{children}</div>}
    </div>
  );
}
