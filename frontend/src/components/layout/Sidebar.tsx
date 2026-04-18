import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { AuthUser } from '../../hooks/useAuth';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: AuthUser | null;
}

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const iconStroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...iconStroke}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function CandlestickIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...iconStroke}>
      <line x1="7" y1="3" x2="7" y2="21" />
      <rect x="5" y="7" width="4" height="9" rx="1" fill="currentColor" stroke="none" />
      <line x1="17" y1="3" x2="17" y2="21" />
      <rect x="15" y="10" width="4" height="7" rx="1" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...iconStroke}>
      <path d="M4 4.5a1.5 1.5 0 0 1 1.5-1.5H19v16.5H5.5A1.5 1.5 0 0 0 4 20.5V4.5z" />
      <path d="M4 20.5A1.5 1.5 0 0 1 5.5 19H19v2H5.5A1.5 1.5 0 0 1 4 19.5" />
      <line x1="8" y1="7.5" x2="15" y2="7.5" />
      <line x1="8" y1="11" x2="15" y2="11" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...iconStroke}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...iconStroke}>
      <path d="M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5z" />
      <path d="M6 11.5v4.5c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
      <line x1="21.5" y1="9.5" x2="21.5" y2="14" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...iconStroke}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8 6 18M18 6l1.8-1.8" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...iconStroke}>
      <polyline points="15 6 9 12 15 18" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...iconStroke}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function MLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <radialGradient id="mlogo-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(251,44,90,0.3)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="32" height="32" rx="6" fill="#08080c" />
      <circle cx="16" cy="16" r="11" fill="url(#mlogo-glow)" />
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fontFamily="Outfit, system-ui, sans-serif"
        fontWeight="900"
        fontSize="17"
        fill="#fb2c5a"
      >
        M
      </text>
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: <GridIcon />, end: true },
  { to: '/app/charts', label: 'Charts', icon: <CandlestickIcon /> },
  { to: '/app/journal', label: 'Journal', icon: <BookIcon /> },
  { to: '/app/strategy', label: 'Strategy', icon: <TargetIcon /> },
  { to: '/app/learn', label: 'Learn', icon: <CapIcon /> },
  { to: '/app/settings', label: 'Settings', icon: <GearIcon /> },
];

function useAlertIndicator() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/alerts/active', { credentials: 'same-origin' });
        if (!res.ok) {
          if (!cancelled) setActive(false);
          return;
        }
        const data = (await res.json()) as Array<{
          is_active?: number;
          alert_type?: string;
        }>;
        if (cancelled) return;
        const has = Array.isArray(data)
          ? data.some(
              (a) =>
                a.is_active === 1 &&
                (a.alert_type === 'ready' || a.alert_type === 'execute'),
            )
          : false;
        setActive(has);
      } catch {
        if (!cancelled) setActive(false);
      }
    }

    load();
    const id = window.setInterval(load, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return active;
}

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  user,
}: SidebarProps) {
  const width = collapsed ? 64 : 240;
  const alertActive = useAlertIndicator();

  const asideStyle: CSSProperties = {
    width,
    background: 'rgba(10,10,14,0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRight: '1px solid var(--glass-border)',
    transition: 'width 180ms ease, transform 220ms ease',
  };

  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="md:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          aria-hidden="true"
        />
      )}

      <aside
        style={asideStyle}
        className={`fixed md:sticky top-0 left-0 h-screen z-50 flex flex-col
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        aria-label="Primary navigation"
      >
        <div
          className="flex items-center gap-3 px-4 py-5"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <div className="shrink-0">
            <MLogo />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-none overflow-hidden">
              <div
                style={{
                  fontFamily: 'Outfit, system-ui, sans-serif',
                  fontSize: 18,
                  fontWeight: 900,
                  letterSpacing: '3px',
                }}
              >
                <span style={{ color: 'var(--red)' }}>M</span>
                <span style={{ color: 'var(--white)' }}>TRADE</span>
              </div>
              <div
                className="mt-1 whitespace-nowrap"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 8,
                  color: 'var(--label)',
                  letterSpacing: '1.5px',
                }}
              >
                MATTHEW'S ICT MONITOR
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const showDot = alertActive && item.label === 'Dashboard';
            const dotStyle: CSSProperties = {
              width: 8,
              height: 8,
              borderRadius: 9999,
              background: 'var(--red)',
              boxShadow: '0 0 8px var(--red), 0 0 14px rgba(251,44,90,0.6)',
              animation: 'mtrade-pulse 1.4s ease-in-out infinite',
              flexShrink: 0,
            };
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' is-active' : ''}${collapsed ? ' is-collapsed' : ''}`
                }
                title={collapsed ? item.label : undefined}
                style={{ position: 'relative' }}
              >
                <span className="sidebar-nav-icon">{item.icon}</span>
                {!collapsed && <span className="sidebar-nav-label">{item.label}</span>}
                {showDot && !collapsed && (
                  <span
                    aria-label="Alert active"
                    style={{ ...dotStyle, marginLeft: 'auto' }}
                  />
                )}
                {showDot && collapsed && (
                  <span
                    aria-label="Alert active"
                    style={{ ...dotStyle, position: 'absolute', top: 8, right: 10 }}
                  />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div
          className="px-2 py-3 flex flex-col gap-2"
          style={{ borderTop: '1px solid var(--glass-border)' }}
        >
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex items-center justify-center gap-2 w-full rounded-[10px] py-2 transition-colors"
            style={{
              color: 'var(--muted)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--glass-border)',
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '1px',
            }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            {!collapsed && <span>COLLAPSE</span>}
          </button>

          <div
            className="flex items-center gap-3 rounded-[10px] px-2 py-2"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <div
              className="shrink-0 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                width: 28,
                height: 28,
                background: 'var(--red-glow)',
                border: '1px solid var(--glass-border)',
                color: 'var(--red)',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <div
                  className="truncate"
                  style={{
                    color: 'var(--white)',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {user?.name ?? '—'}
                </div>
                <a
                  href="/auth/logout"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    letterSpacing: '1.5px',
                    color: 'var(--muted)',
                  }}
                  className="hover:text-[color:var(--red)] transition-colors"
                >
                  LOGOUT
                </a>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
