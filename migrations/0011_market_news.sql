-- Market news and economic calendar

CREATE TABLE IF NOT EXISTS market_news (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  published_at TEXT,
  impact TEXT DEFAULT 'low' CHECK(impact IN ('low','medium','high','critical')),
  direction TEXT CHECK(direction IN ('bullish','bearish','neutral')),
  instruments TEXT,
  ai_analysis TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_news_url ON market_news(url);
CREATE INDEX IF NOT EXISTS idx_market_news_published ON market_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_news_impact ON market_news(impact, published_at DESC);

CREATE TABLE IF NOT EXISTS economic_events (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT,
  event TEXT NOT NULL,
  country TEXT,
  impact TEXT DEFAULT 'low' CHECK(impact IN ('low','medium','high')),
  previous TEXT,
  forecast TEXT,
  actual TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(date, event)
);

CREATE INDEX IF NOT EXISTS idx_economic_events_date ON economic_events(date);
