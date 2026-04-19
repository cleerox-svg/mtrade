import { CSSProperties, useEffect, useMemo, useState } from 'react';
import GlassCard from '../ui/GlassCard';

interface CalendarEvent {
  id: number;
  date: string;
  time: string | null;
  event: string;
  country: string | null;
  impact: 'low' | 'medium' | 'high';
  previous: string | null;
  forecast: string | null;
  actual: string | null;
  created_at: string;
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: '\ud83c\uddfa\ud83c\uddf8',
  EU: '\ud83c\uddea\ud83c\uddfa',
  GB: '\ud83c\uddec\ud83c\udde7',
  UK: '\ud83c\uddec\ud83c\udde7',
  JP: '\ud83c\uddef\ud83c\uddf5',
  CN: '\ud83c\udde8\ud83c\uddf3',
  CA: '\ud83c\udde8\ud83c\udde6',
  DE: '\ud83c\udde9\ud83c\uddea',
  FR: '\ud83c\uddeb\ud83c\uddf7',
  AU: '\ud83c\udde6\ud83c\uddfa',
  CH: '\ud83c\udde8\ud83c\udded',
};

function flagFor(country: string | null): string {
  if (!country) return '\ud83c\udf10';
  return COUNTRY_FLAGS[country.toUpperCase()] ?? '\ud83c\udf10';
}

function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatEtTime(dateStr: string, time: string | null): string {
  if (!time) return '—';
  // Finnhub returns UTC "YYYY-MM-DD HH:MM:SS" -> convert to America/New_York
  const iso = `${dateStr}T${time}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return time.slice(0, 5);
  try {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/New_York',
    });
  } catch {
    return time.slice(0, 5);
  }
}

function eventTimestamp(dateStr: string, time: string | null): number | null {
  if (!time) return null;
  const iso = `${dateStr}T${time}Z`;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return dateStr;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const today = todayIsoDate();
  if (dateStr === today) return 'Today';
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function ImpactDots({ impact }: { impact: CalendarEvent['impact'] }) {
  const count = impact === 'high' ? 3 : impact === 'medium' ? 2 : 1;
  const activeColor =
    impact === 'high' ? 'var(--danger)' : impact === 'medium' ? 'var(--amber)' : 'var(--muted)';
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} aria-label={`${impact} impact`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 9999,
            background: i < count ? activeColor : 'var(--subtle)',
            boxShadow:
              i < count && impact === 'high'
                ? `0 0 4px ${activeColor}`
                : undefined,
          }}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

async function fetchCalendar(): Promise<CalendarEvent[]> {
  const res = await fetch('/api/news/calendar', { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as CalendarEvent[];
}

export interface EconomicCalendarProps {
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export default function EconomicCalendar({
  collapsible = false,
  defaultOpen = true,
}: EconomicCalendarProps = {}) {
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    fetchCalendar()
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const grouped = useMemo(() => {
    if (!events) return [] as { date: string; items: CalendarEvent[] }[];
    const filtered = showAll ? events : events.filter((e) => e.impact === 'high');
    const byDate = new Map<string, CalendarEvent[]>();
    for (const ev of filtered) {
      const list = byDate.get(ev.date) ?? [];
      list.push(ev);
      byDate.set(ev.date, list);
    }
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
      }));
  }, [events, showAll]);

  const today = todayIsoDate();

  const toggleStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--label)',
    background: 'transparent',
    border: '1px solid var(--glass-border)',
    borderRadius: 999,
    padding: '3px 10px',
    cursor: 'pointer',
  };

  const groupHeaderStyle = (isToday: boolean): CSSProperties => ({
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: isToday ? 'var(--amber)' : 'var(--muted)',
    padding: '8px 10px',
    background: isToday ? 'rgba(251,191,36,0.08)' : 'transparent',
    borderLeft: isToday ? '2px solid var(--amber)' : '2px solid transparent',
    borderRadius: 4,
    marginTop: 10,
    marginBottom: 4,
  });

  const rowStyle = (isToday: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderTop: '1px solid var(--glass-border)',
    background: isToday ? 'rgba(251,191,36,0.04)' : 'transparent',
    borderRadius: 4,
  });

  return (
    <GlassCard
      title="◆ ECONOMIC CALENDAR"
      collapsible={collapsible}
      defaultOpen={defaultOpen}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 4,
        }}
      >
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          style={toggleStyle}
          aria-pressed={showAll}
        >
          {showAll ? 'High impact only' : 'Show all'}
        </button>
      </div>

      {loading && !events && (
        <div
          style={{
            color: 'var(--muted)',
            fontSize: 12,
            padding: '12px 0',
            textAlign: 'center',
          }}
        >
          Loading calendar…
        </div>
      )}

      {error && !events && (
        <div style={{ color: 'var(--danger)', fontSize: 12, padding: '6px 0' }}>
          {error}
        </div>
      )}

      {events && grouped.length === 0 && !loading && (
        <div
          style={{
            color: 'var(--muted)',
            fontSize: 12,
            padding: '16px 0',
            textAlign: 'center',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          {showAll ? 'No events in the next 7 days.' : 'No high-impact events this week.'}
        </div>
      )}

      {grouped.map(({ date, items }) => {
        const isToday = date === today;
        return (
          <div key={date}>
            <div style={groupHeaderStyle(isToday)}>{formatDateLabel(date)}</div>
            {items.map((ev) => {
              const ts = eventTimestamp(ev.date, ev.time);
              const soon = ts !== null && ts - now >= 0 && ts - now <= 3600_000;
              return (
                <div key={ev.id} style={rowStyle(isToday)}>
                  <span
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 11,
                      color: 'var(--bright)',
                      minWidth: 68,
                    }}
                  >
                    {formatEtTime(ev.date, ev.time)}
                  </span>
                  <span style={{ fontSize: 14 }} aria-hidden="true">
                    {flagFor(ev.country)}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: 12,
                      color: 'var(--text)',
                      lineHeight: 1.3,
                      minWidth: 0,
                    }}
                  >
                    {ev.event}
                  </span>
                  {soon && (
                    <span
                      aria-label="Happening soon"
                      title="Within 1 hour"
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 9999,
                        background: 'var(--amber)',
                        boxShadow: '0 0 6px var(--amber), 0 0 12px var(--amber)',
                        animation: 'mtrade-pulse 1.2s ease-in-out infinite',
                      }}
                    />
                  )}
                  <ImpactDots impact={ev.impact} />
                </div>
              );
            })}
          </div>
        );
      })}
    </GlassCard>
  );
}
