-- Knowledge base articles
CREATE TABLE IF NOT EXISTS kb_articles (
  id INTEGER PRIMARY KEY,
  category TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
