-- Discord notification tracking
ALTER TABLE setup_alerts ADD COLUMN discord_sent INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, type, date)
);
