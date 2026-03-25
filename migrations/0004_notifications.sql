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

CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id),
  discord_webhook_url TEXT,
  discord_enabled INTEGER DEFAULT 1,
  notify_sweep INTEGER DEFAULT 1,
  notify_ready INTEGER DEFAULT 1,
  notify_execute INTEGER DEFAULT 1,
  notify_drawdown INTEGER DEFAULT 1,
  notify_consistency INTEGER DEFAULT 1,
  notify_setup_result INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
