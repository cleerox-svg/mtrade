import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GlassCard from '../ui/GlassCard';

export interface NewsItem {
  id: number;
  source: string;
  title: string;
  summary: string | null;
  url: string | null;
  published_at: string | null;
  impact: 'low' | 'medium' | 'high' | 'critical';
  direction: 'bullish' | 'bearish' | 'neutral' | null;
  instruments: string | null;
  created_at: string;
}

interface NewsItemFull extends NewsItem {
  ai_analysis: string | null;
}

type FilterTab = 'all' | 'high' | 'bullish' | 'bearish';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'high', label: 'High Impact' },
  { key: 'bullish', label: 'Bullish' },
  { key: 'bearish', label: 'Bearish' },
];

const POLL_INTERVAL_MS = 5 * 60 * 1000;

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function impactColor(impact: NewsItem['impact']): string {
  switch (impact) {
    case 'critical':
      return 'var(--danger)';
    case 'high':
      return 'var(--danger)';
    case 'medium':
      return 'var(--amber)';
    default:
      return 'var(--muted)';
  }
}

function directionStyle(dir: NewsItem['direction']): {
  color: string;
  bg: string;
  border: string;
  label: string;
} | null {
  if (!dir) return null;
  if (dir === 'bullish') {
    return {
      color: 'var(--green)',
      bg: 'rgba(52,211,153,0.12)',
      border: 'rgba(52,211,153,0.4)',
      label: 'BULLISH',
    };
  }
  if (dir === 'bearish') {
    return {
      color: 'var(--danger)',
      bg: 'rgba(239,68,68,0.12)',
      border: 'rgba(239,68,68,0.4)',
      label: 'BEARISH',
    };
  }
  return {
    color: 'var(--muted)',
    bg: 'rgba(255,255,255,0.04)',
    border: 'var(--glass-border)',
    label: 'NEUTRAL',
  };
}

function ImpactDot({ impact }: { impact: NewsItem['impact'] }) {
  const color = impactColor(impact);
  const pulse = impact === 'critical';
  const style: CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: 9999,
    background: color,
    boxShadow: `0 0 6px ${color}, 0 0 12px ${color}`,
    flexShrink: 0,
    marginTop: 5,
    animation: pulse ? 'mtrade-pulse 1.4s ease-in-out infinite' : undefined,
  };
  return <span aria-hidden="true" style={style} />;
}

function DirectionBadge({ direction }: { direction: NewsItem['direction'] }) {
  const s = directionStyle(direction);
  if (!s) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: 999,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: s.color,
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      {s.label}
    </span>
  );
}

async function fetchNewsList(): Promise<NewsItem[]> {
  const res = await fetch('/api/news?hours=24&limit=15', { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return (await res.json()) as NewsItem[];
}

async function fetchNewsItem(id: number): Promise<NewsItemFull | null> {
  try {
    const res = await fetch(`/api/news/${id}`, { credentials: 'same-origin' });
    if (!res.ok) return null;
    return (await res.json()) as NewsItemFull;
  } catch {
    return null;
  }
}

function parseAiReasoning(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { reasoning?: string };
    return typeof parsed.reasoning === 'string' ? parsed.reasoning : null;
  } catch {
    return null;
  }
}

interface RowProps {
  item: NewsItem;
  expanded: boolean;
  onToggle: () => void;
}

function NewsRow({ item, expanded, onToggle }: RowProps) {
  const [full, setFull] = useState<NewsItemFull | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    if (full) return;
    let cancelled = false;
    setLoadingFull(true);
    fetchNewsItem(item.id)
      .then((data) => {
        if (!cancelled) setFull(data);
      })
      .finally(() => {
        if (!cancelled) setLoadingFull(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, full, item.id]);

  const rowStyle: CSSProperties = {
    display: 'flex',
    gap: 10,
    padding: '10px 0',
    borderTop: '1px solid var(--glass-border)',
    cursor: 'pointer',
  };

  const titleStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 13,
    color: 'var(--bright)',
    lineHeight: 1.35,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const metaStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    color: 'var(--muted)',
    letterSpacing: '0.04em',
  };

  const expandedBoxStyle: CSSProperties = {
    marginTop: 10,
    padding: '10px 12px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid var(--glass-border)',
    borderRadius: 8,
    fontFamily: 'Outfit, sans-serif',
    fontSize: 12,
    color: 'var(--text)',
    lineHeight: 1.5,
  };

  const sectionLabelStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 9,
    color: 'var(--muted)',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    marginBottom: 4,
  };

  const summary = full?.summary ?? item.summary;
  const reasoning = parseAiReasoning(full?.ai_analysis ?? null);
  const url = full?.url ?? item.url;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        style={rowStyle}
        aria-expanded={expanded}
      >
        <ImpactDot impact={item.impact} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={titleStyle}>{item.title}</div>
          <div style={metaStyle}>
            <span style={{ color: 'var(--label)' }}>{item.source}</span>
            <span>·</span>
            <span>{timeAgo(item.published_at ?? item.created_at)}</span>
            {item.direction && (
              <span style={{ marginLeft: 'auto' }}>
                <DirectionBadge direction={item.direction} />
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={expandedBoxStyle}>
          {loadingFull && !full && (
            <div style={{ color: 'var(--muted)', fontSize: 11 }}>Loading…</div>
          )}
          {summary && (
            <div style={{ marginBottom: reasoning ? 10 : 0 }}>
              <div style={sectionLabelStyle}>Summary</div>
              <div>{summary}</div>
            </div>
          )}
          {reasoning && (
            <div style={{ marginBottom: 10 }}>
              <div style={sectionLabelStyle}>AI Reasoning</div>
              <div style={{ color: 'var(--label)', fontStyle: 'italic' }}>{reasoning}</div>
            </div>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: 'var(--red)',
                textDecoration: 'none',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Read full article →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

const NEWS_SEEN_EVENT = 'mtrade:news-seen';

export interface NewsFeedProps {
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export default function NewsFeed({ collapsible = false, defaultOpen = true }: NewsFeedProps = {}) {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchNewsList();
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.dispatchEvent(new CustomEvent(NEWS_SEEN_EVENT));
          }
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [] as NewsItem[];
    switch (filter) {
      case 'high':
        return items.filter((i) => i.impact === 'high' || i.impact === 'critical');
      case 'bullish':
        return items.filter((i) => i.direction === 'bullish');
      case 'bearish':
        return items.filter((i) => i.direction === 'bearish');
      default:
        return items;
    }
  }, [items, filter]);

  const tabsStyle: CSSProperties = {
    display: 'flex',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  };

  const tabStyle = (active: boolean): CSSProperties => ({
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: active ? 'var(--red)' : 'var(--muted)',
    background: active ? 'rgba(251,44,90,0.1)' : 'transparent',
    border: `1px solid ${active ? 'rgba(251,44,90,0.4)' : 'var(--glass-border)'}`,
    borderRadius: 999,
    padding: '4px 10px',
    cursor: 'pointer',
    fontWeight: 700,
  });

  const listStyle: CSSProperties = {
    maxHeight: 420,
    overflowY: 'auto',
    paddingRight: 4,
  };

  return (
    <GlassCard
      title="◆ MARKET NEWS"
      collapsible={collapsible}
      defaultOpen={defaultOpen}
    >
      <div style={tabsStyle} role="tablist" aria-label="News filters">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={filter === tab.key}
            onClick={() => setFilter(tab.key)}
            style={tabStyle(filter === tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && !items && (
        <div style={{ color: 'var(--danger)', fontSize: 12, padding: '6px 0' }}>
          {error}
        </div>
      )}

      {loading && !items && (
        <div
          style={{
            color: 'var(--muted)',
            fontSize: 12,
            padding: '12px 0',
            textAlign: 'center',
          }}
        >
          Loading news…
        </div>
      )}

      {items && filtered.length === 0 && !loading && (
        <div
          style={{
            color: 'var(--muted)',
            fontSize: 12,
            padding: '16px 0',
            textAlign: 'center',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          No news matches this filter.
        </div>
      )}

      {items && filtered.length > 0 && (
        <div ref={scrollRef} style={listStyle}>
          <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />
          {filtered.map((item) => (
            <NewsRow
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() =>
                setExpandedId((cur) => (cur === item.id ? null : item.id))
              }
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}
