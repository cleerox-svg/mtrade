-- Strategy configuration per user
CREATE TABLE IF NOT EXISTS strategy_config (
  id INTEGER PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES users(id),
  trade_london_sweep INTEGER DEFAULT 1,
  trade_ny_sweep INTEGER DEFAULT 1,
  fvg_scan_1h INTEGER DEFAULT 1,
  fvg_scan_4h INTEGER DEFAULT 1,
  continuation_require_ifvg INTEGER DEFAULT 0,
  min_rr REAL DEFAULT 2.0,
  sweep_require_close INTEGER DEFAULT 0,
  min_confidence INTEGER DEFAULT 60,
  max_contracts_override INTEGER,
  default_contracts INTEGER DEFAULT 1,
  kill_switch INTEGER DEFAULT 0,
  kill_switch_date TEXT,
  active_preset TEXT DEFAULT 'normal',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Micro instruments
INSERT OR IGNORE INTO instruments (id, symbol, name, tick_size, tick_value)
VALUES (3, 'MES', 'Micro E-mini S&P 500', 0.25, 1.25);

INSERT OR IGNORE INTO instruments (id, symbol, name, tick_size, tick_value)
VALUES (4, 'MNQ', 'Micro E-mini Nasdaq 100', 0.25, 0.50);

-- Apex account templates
CREATE TABLE IF NOT EXISTS apex_account_templates (
  id INTEGER PRIMARY KEY,
  label TEXT NOT NULL,
  account_size INTEGER NOT NULL,
  drawdown_limit REAL NOT NULL,
  profit_target REAL NOT NULL,
  max_contracts INTEGER NOT NULL,
  scaling_limit INTEGER NOT NULL,
  daily_loss_limit REAL,
  notes TEXT
);

INSERT INTO apex_account_templates (label, account_size, drawdown_limit, profit_target, max_contracts, scaling_limit, daily_loss_limit, notes)
VALUES
  ('25K', 25000, 1500, 1500, 4, 2, 750, 'Smallest — tight drawdown'),
  ('50K', 50000, 2500, 3000, 10, 5, 1250, 'Most popular — balanced'),
  ('75K', 75000, 2750, 4250, 12, 6, 1375, 'Mid-tier'),
  ('100K', 100000, 3000, 6000, 14, 7, 1500, 'Large — more contracts'),
  ('150K', 150000, 5000, 9000, 17, 9, 2000, 'Largest standard'),
  ('100K Static', 100000, 625, 2000, 14, 7, NULL, 'Static drawdown — fixed floor');
