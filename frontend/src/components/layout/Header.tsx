import { useEffect, useState } from 'react';
import type { AuthUser } from '../../hooks/useAuth';

interface HeaderProps {
  onToggleMobile: () => void;
  user: AuthUser | null;
}

type SessionName = 'LONDON' | 'NY OPEN' | 'NY PM' | 'PRE-MKT' | 'CLOSED';

const ALL_SESSIONS: SessionName[] = ['PRE-MKT', 'LONDON', 'NY OPEN', 'NY PM'];

function getEtParts(now: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const s = Number(parts.find((p) => p.type === 'second')?.value ?? '0');
  return { h: h === 24 ? 0 : h, m, s };
}

function computeActiveSession(now: Date): SessionName {
  const { h, m } = getEtParts(now);
  const t = h * 60 + m;
  if (t >= 2 * 60 && t < 5 * 60) return 'LONDON';
  if (t >= 5 * 60 && t < 9 * 60 + 30) return 'PRE-MKT';
  if (t >= 9 * 60 + 30 && t < 12 * 60) return 'NY OPEN';
  if (t >= 14 * 60 && t < 15 * 60) return 'NY PM';
  return 'CLOSED';
}

function formatClock(now: Date): string {
  const { h, m, s } = getEtParts(now);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function Clock() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 15,
        color: 'var(--white)',
        letterSpacing: '1px',
      }}
    >
      {formatClock(now)}
    </span>
  );
}

function SessionIndicator() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const active = computeActiveSession(now);

  return (
    <div className="flex items-center gap-3">
      {ALL_SESSIONS.map((name) => {
        const isActive = name === active;
        return (
          <div key={name} className="flex items-center gap-1.5">
            <span
              className={isActive ? 'session-dot-active' : 'session-dot-inactive'}
              style={{ width: 6, height: 6, borderRadius: 9999, display: 'inline-block' }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: '1.5px',
                color: isActive ? 'var(--red)' : 'var(--muted)',
              }}
            >
              {name}
            </span>
          </div>
        );
      })}
      {active === 'CLOSED' && (
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: '1.5px',
            color: 'var(--muted)',
          }}
        >
          · CLOSED
        </span>
      )}
    </div>
  );
}

function Avatar({ user }: { user: AuthUser | null }) {
  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center"
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
      aria-label={user?.name || 'User'}
    >
      {user?.avatar_url ? (
        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default function Header({ onToggleMobile, user }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 md:px-5 h-14"
      style={{
        background: 'rgba(10,10,14,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      <div className="flex items-center gap-3 md:hidden">
        <button
          type="button"
          onClick={onToggleMobile}
          aria-label="Open navigation"
          className="flex items-center justify-center rounded-[10px]"
          style={{
            width: 36,
            height: 36,
            color: 'var(--text)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <HamburgerIcon />
        </button>
      </div>

      <div
        className="md:hidden absolute left-1/2 -translate-x-1/2"
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 16,
          fontWeight: 900,
          letterSpacing: '3px',
        }}
      >
        <span style={{ color: 'var(--red)' }}>M</span>
        <span style={{ color: 'var(--white)' }}>TRADE</span>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-4 md:gap-6 ml-auto">
        <div className="hidden md:block">
          <SessionIndicator />
        </div>
        <Clock />
        <div className="hidden md:block">
          <Avatar user={user} />
        </div>
      </div>
    </header>
  );
}
