import {
  CSSProperties,
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import GlassCard from '../components/ui/GlassCard';

interface KbArticleSummary {
  id: number;
  category: string;
  slug: string;
  title: string;
  sort_order: number;
}

interface KbArticle extends KbArticleSummary {
  content: string;
}

interface KbSearchResult {
  id: number;
  category: string;
  slug: string;
  title: string;
  snippet: string;
}

interface AskAnswer {
  question: string;
  answer: string;
}

const CATEGORY_SUBTITLES: Record<string, string> = {
  'Alpha Futures Rules': "Understanding your prop firm's requirements",
  'ICT Concepts': 'Core Inner Circle Trader methodology',
  "Matthew's Strategy": 'Your complete trading playbook',
  'Mtrade Platform': 'How to use the platform features',
  'Platform Guide': 'Dashboard walkthrough and reference',
};

function categoryAnchor(cat: string): string {
  return `cat-${cat.replace(/\s+/g, '-').toLowerCase()}`;
}

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;
  let plain = '';
  let key = 0;

  const flush = () => {
    if (plain.length) {
      nodes.push(<Fragment key={`t-${key++}`}>{plain}</Fragment>);
      plain = '';
    }
  };

  while (i < text.length) {
    if (text[i] === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2);
      if (end !== -1) {
        flush();
        nodes.push(
          <span
            key={`b-${key++}`}
            style={{ fontWeight: 600, color: 'var(--bright)' }}
          >
            {text.substring(i + 2, end)}
          </span>,
        );
        i = end + 2;
        continue;
      }
    }
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        flush();
        nodes.push(
          <span
            key={`c-${key++}`}
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 12,
              background: 'rgba(251,44,90,0.06)',
              color: 'var(--red-soft)',
              padding: '2px 8px',
              borderRadius: 4,
              border: '1px solid rgba(251,44,90,0.08)',
            }}
          >
            {text.substring(i + 1, end)}
          </span>,
        );
        i = end + 1;
        continue;
      }
    }
    plain += text[i];
    i++;
  }
  flush();
  return nodes;
}

function renderContent(content: string): ReactNode {
  const lines = content.split('\n');
  const out: ReactNode[] = [];
  lines.forEach((line, idx) => {
    if (line.indexOf('## ') === 0) {
      out.push(
        <h3
          key={idx}
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--red-soft)',
            marginTop: 24,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              color: 'var(--red)',
              fontSize: 10,
              marginRight: 6,
            }}
          >
            ◆
          </span>
          <span>{parseInline(line.substring(3))}</span>
        </h3>,
      );
    } else if (line.indexOf('- ') === 0) {
      out.push(
        <div
          key={idx}
          style={{
            display: 'flex',
            flexDirection: 'row',
            padding: '4px 0',
          }}
        >
          <span
            style={{
              color: 'var(--red-soft)',
              fontSize: 11,
              flexShrink: 0,
              marginTop: 3,
            }}
          >
            ▸
          </span>
          <span
            style={{
              fontSize: 13,
              color: 'var(--text)',
              paddingLeft: 6,
              lineHeight: 1.7,
            }}
          >
            {parseInline(line.substring(2))}
          </span>
        </div>,
      );
    } else if (line.indexOf('> ') === 0) {
      out.push(
        <div
          key={idx}
          style={{
            background: 'rgba(251,44,90,0.03)',
            borderLeft: '3px solid var(--red)',
            padding: '14px 18px',
            borderRadius: '0 10px 10px 0',
            margin: '16px 0',
          }}
        >
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10,
              color: 'var(--red)',
              letterSpacing: 2,
              marginBottom: 6,
            }}
          >
            TIP
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--label)',
              lineHeight: 1.6,
            }}
          >
            {parseInline(line.substring(2))}
          </div>
        </div>,
      );
    } else if (line.trim() === '') {
      out.push(<div key={idx} style={{ marginBottom: 12 }} />);
    } else {
      out.push(
        <p
          key={idx}
          style={{
            fontSize: 14,
            color: 'var(--text)',
            lineHeight: 1.8,
            marginBottom: 12,
          }}
        >
          {parseInline(line)}
        </p>,
      );
    }
  });
  return out;
}

function ArticleCard({
  article,
  open,
  onToggle,
}: {
  article: KbArticleSummary;
  open: boolean;
  onToggle: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answers, setAnswers] = useState<AskAnswer[]>([]);
  const [askError, setAskError] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    if (!open || content !== null || contentLoading) return;
    let cancelled = false;
    setContentLoading(true);
    setContentError(null);
    fetch(`/api/kb/articles/${article.slug}`, { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json() as Promise<KbArticle>;
      })
      .then((data) => {
        if (cancelled) return;
        setContent(data.content || '');
      })
      .catch(() => {
        if (cancelled) return;
        setContentError('Couldn\u2019t load article');
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, article.slug, content, contentLoading]);

  const submitQuestion = useCallback(() => {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setAskError(null);
    fetch('/api/kb/ask', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: article.slug, question: q }),
    })
      .then((r) => {
        if (!r.ok) throw new Error('fail');
        return r.json() as Promise<{ answer: string }>;
      })
      .then((res) => {
        setAnswers((prev) => [...prev, { question: q, answer: res.answer || '' }]);
        setQuestion('');
      })
      .catch(() => {
        setAskError('Couldn\u2019t get an answer \u2014 try again');
      })
      .finally(() => {
        setAsking(false);
      });
  }, [article.slug, asking, question]);

  const cardStyle: CSSProperties = {
    position: 'relative',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderLeft: open ? '3px solid var(--red)' : '1px solid var(--glass-border)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    transition: 'border-color 0.3s ease, background-color 0.3s ease',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    gap: 12,
  };

  return (
    <div
      id={`article-${article.slug}`}
      style={cardStyle}
      onMouseEnter={(e) => {
        if (!open) {
          e.currentTarget.style.borderColor = 'var(--glass-border-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!open) {
          e.currentTarget.style.borderColor = 'var(--glass-border)';
        }
      }}
    >
      <div
        style={headerStyle}
        onClick={onToggle}
        role="button"
        aria-expanded={open}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--red)',
              flexShrink: 0,
              boxShadow: '0 0 8px var(--red-glow)',
              display: 'inline-block',
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--bright)',
            }}
          >
            {article.title}
          </span>
        </div>
        <span
          style={{
            color: 'var(--muted)',
            fontSize: 14,
            transition: 'transform 0.2s ease',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            display: 'inline-block',
          }}
          aria-hidden="true"
        >
          ▸
        </span>
      </div>
      {open && (
        <div
          style={{
            paddingTop: 16,
            borderTop: '1px solid var(--glass-border)',
            marginTop: 12,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contentLoading && (
            <div
              className="skeleton-shimmer"
              style={{ height: 100, borderRadius: 8 }}
              aria-hidden="true"
            />
          )}
          {contentError && (
            <div style={{ fontSize: 12, color: 'var(--danger)' }}>
              {contentError}
            </div>
          )}
          {!contentLoading && content !== null && renderContent(content)}

          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--glass-border)',
            }}
          >
            {!askOpen ? (
              <button
                type="button"
                onClick={() => setAskOpen(true)}
                style={{
                  background: 'rgba(251,44,90,0.04)',
                  border: '1px solid rgba(251,44,90,0.1)',
                  borderRadius: 8,
                  padding: '10px 16px',
                  width: '100%',
                  textAlign: 'center',
                  cursor: 'pointer',
                  color: 'var(--red)',
                  fontSize: 12,
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 600,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(251,44,90,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(251,44,90,0.04)';
                }}
              >
                Ask AI about this topic
              </button>
            ) : (
              <div>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitQuestion();
                  }}
                  placeholder={`Ask a question about ${article.title}...`}
                  disabled={asking}
                  style={{
                    width: '100%',
                    background: '#0a0a10',
                    color: 'var(--text)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 13,
                    fontFamily: '"JetBrains Mono", monospace',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={submitQuestion}
                    disabled={asking || !question.trim()}
                    style={{
                      background: 'var(--red)',
                      color: '#fff',
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '6px 16px',
                      borderRadius: 6,
                      border: 'none',
                      cursor: asking ? 'not-allowed' : 'pointer',
                      opacity: asking || !question.trim() ? 0.5 : 1,
                    }}
                  >
                    {asking ? 'Asking\u2026' : 'Ask'}
                  </button>
                </div>
                {askError && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: 'var(--danger)',
                    }}
                  >
                    {askError}
                  </div>
                )}
                {answers.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'rgba(251,44,90,0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 8,
                      padding: 12,
                      marginTop: 10,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: 10,
                        color: 'var(--red)',
                        letterSpacing: 1.5,
                        marginBottom: 6,
                        textTransform: 'uppercase',
                      }}
                    >
                      AI Answer
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text)',
                        lineHeight: 1.6,
                      }}
                    >
                      {parseInline(a.answer)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function useViewport() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

export default function Learn() {
  const [articles, setArticles] = useState<KbArticleSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [searchResults, setSearchResults] = useState<KbSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const viewportWidth = useViewport();
  const isDesktop = viewportWidth >= 1024;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/kb/articles', { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load');
        return r.json() as Promise<KbArticleSummary[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setArticles(data);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Couldn\u2019t load knowledge base');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = debouncedSearch.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    fetch(`/api/kb/search?q=${encodeURIComponent(q)}`, {
      credentials: 'same-origin',
    })
      .then((r) => r.json() as Promise<KbSearchResult[]>)
      .then((data) => {
        if (!cancelled) setSearchResults(data);
      })
      .catch(() => {
        if (!cancelled) setSearchResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const byCategory = useMemo(() => {
    const map: Record<string, KbArticleSummary[]> = {};
    if (!articles) return map;
    for (const a of articles) {
      if (!map[a.category]) map[a.category] = [];
      map[a.category].push(a);
    }
    return map;
  }, [articles]);

  const categories = useMemo(() => Object.keys(byCategory), [byCategory]);

  useEffect(() => {
    if (!contentRef.current || categories.length === 0) return;
    const onScroll = () => {
      let current: string | null = null;
      for (const cat of categories) {
        const el = document.getElementById(categoryAnchor(cat));
        if (el && el.getBoundingClientRect().top <= 120) {
          current = cat;
        }
      }
      setActiveCat(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [categories]);

  const handleSelectSearchResult = (item: KbSearchResult) => {
    setSearch('');
    setSearchResults(null);
    setExpandedSlug(item.slug);
    setTimeout(() => {
      const target = document.getElementById(`article-${item.slug}`);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const searchInputStyle: CSSProperties = {
    width: '100%',
    background: '#0a0a10',
    color: 'var(--text)',
    border: '1px solid var(--glass-border)',
    borderRadius: 10,
    padding: '14px 16px',
    fontSize: 14,
    fontFamily: '"JetBrains Mono", monospace',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s ease',
  };

  const sidebarLinkStyle = (active: boolean): CSSProperties => ({
    display: 'block',
    padding: '8px 12px',
    borderRadius: 8,
    fontFamily: 'Outfit, sans-serif',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: active ? 'var(--red)' : 'var(--muted)',
    background: active ? 'rgba(251,44,90,0.08)' : 'transparent',
    borderLeft: `3px solid ${active ? 'var(--red)' : 'transparent'}`,
    textDecoration: 'none',
    transition: 'color 0.15s ease, background 0.15s ease',
    marginBottom: 4,
  });

  const sidebar = (
    <aside
      style={{
        position: 'sticky',
        top: 16,
        alignSelf: 'flex-start',
        width: 220,
        flexShrink: 0,
      }}
    >
      <GlassCard title="◆ CATEGORIES">
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {categories.map((cat) => (
            <a
              key={cat}
              href={`#${categoryAnchor(cat)}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(categoryAnchor(cat));
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              style={sidebarLinkStyle(activeCat === cat)}
            >
              {cat}
            </a>
          ))}
        </nav>
      </GlassCard>
    </aside>
  );

  const searchBar = (
    <GlassCard>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search concepts, rules, features..."
        style={searchInputStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--red)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--glass-border)';
        }}
      />
      {debouncedSearch.trim() && (
        <div style={{ marginTop: 12 }}>
          {searching && (
            <div style={{ fontSize: 12, color: 'var(--muted)', padding: 8 }}>
              {'Searching\u2026'}
            </div>
          )}
          {!searching && searchResults && searchResults.length === 0 && (
            <div
              style={{
                color: 'var(--muted)',
                fontStyle: 'italic',
                fontSize: 13,
                padding: 16,
              }}
            >
              No results found
            </div>
          )}
          {!searching &&
            searchResults &&
            searchResults.map((item) => (
              <div
                key={item.id}
                role="button"
                onClick={() => handleSelectSearchResult(item)}
                style={{
                  background: 'transparent',
                  borderBottom: '1px solid var(--glass-border)',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      background: 'rgba(251,44,90,0.06)',
                      color: 'var(--red-soft)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontFamily: '"JetBrains Mono", monospace',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                      flexShrink: 0,
                    }}
                  >
                    {item.category}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      color: 'var(--bright)',
                      fontWeight: 600,
                      fontFamily: 'Outfit, sans-serif',
                    }}
                  >
                    {item.title}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    marginTop: 4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.snippet}
                </div>
              </div>
            ))}
        </div>
      )}
    </GlassCard>
  );

  const mainContent = (
    <div
      ref={contentRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        flex: 1,
        minWidth: 0,
      }}
    >
      {searchBar}
      {loading && (
        <GlassCard>
          <div
            className="skeleton-shimmer"
            style={{ height: 80, borderRadius: 8, marginBottom: 10 }}
            aria-hidden="true"
          />
          <div
            className="skeleton-shimmer"
            style={{ height: 80, borderRadius: 8, marginBottom: 10 }}
            aria-hidden="true"
          />
          <div
            className="skeleton-shimmer"
            style={{ height: 80, borderRadius: 8 }}
            aria-hidden="true"
          />
        </GlassCard>
      )}
      {error && (
        <GlassCard>
          <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>
        </GlassCard>
      )}
      {!loading && articles && categories.length === 0 && (
        <GlassCard>
          <div
            style={{
              fontSize: 13,
              color: 'var(--muted)',
              textAlign: 'center',
              padding: 24,
            }}
          >
            No articles yet.
          </div>
        </GlassCard>
      )}
      {!loading &&
        categories.map((cat, idx) => (
          <section
            key={cat}
            id={categoryAnchor(cat)}
            style={{ marginTop: idx === 0 ? 0 : 24 }}
          >
            <div
              style={{
                height: 1,
                background: 'rgba(251,44,90,0.1)',
                marginBottom: 24,
              }}
            />
            <div
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--red-soft)',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
              }}
            >
              {cat}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--muted)',
                fontStyle: 'italic',
                marginTop: 4,
                marginBottom: 16,
              }}
            >
              {CATEGORY_SUBTITLES[cat] || ''}
            </div>
            {byCategory[cat].map((article) => (
              <ArticleCard
                key={article.slug}
                article={article}
                open={expandedSlug === article.slug}
                onToggle={() =>
                  setExpandedSlug((prev) =>
                    prev === article.slug ? null : article.slug,
                  )
                }
              />
            ))}
          </section>
        ))}
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        alignItems: 'flex-start',
      }}
    >
      {isDesktop && sidebar}
      {mainContent}
    </div>
  );
}
