-- Trade journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  trade_log_id INTEGER REFERENCES trade_log(id),
  setup_id INTEGER REFERENCES setups(id),
  instrument_id INTEGER REFERENCES instruments(id),
  date TEXT NOT NULL,
  direction TEXT NOT NULL,
  contracts INTEGER,
  entry_price REAL,
  stop_price REAL,
  target_price REAL,
  exit_price REAL,
  pnl REAL,
  rr_target REAL,
  rr_achieved REAL,
  setup_phase INTEGER,
  chart_snapshot_svg TEXT,
  ai_analysis TEXT,
  ai_entry_reasoning TEXT,
  similar_setups_json TEXT,
  notes TEXT,
  tags TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_trade_log ON journal_entries(trade_log_id);
