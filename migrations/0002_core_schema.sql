-- Instruments
CREATE TABLE IF NOT EXISTS instruments (
  id INTEGER PRIMARY KEY,
  symbol TEXT UNIQUE,
  name TEXT,
  tick_size REAL,
  tick_value REAL
);

-- Candles
CREATE TABLE IF NOT EXISTS candles (
  id INTEGER PRIMARY KEY,
  instrument_id INTEGER REFERENCES instruments(id),
  timeframe TEXT,
  timestamp TEXT,
  open REAL,
  high REAL,
  low REAL,
  close REAL,
  volume INTEGER DEFAULT 0,
  UNIQUE(instrument_id, timeframe, timestamp)
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  date TEXT,
  instrument_id INTEGER REFERENCES instruments(id),
  london_high REAL,
  london_low REAL,
  ny_high REAL,
  ny_low REAL,
  asia_high REAL,
  asia_low REAL,
  UNIQUE(date, instrument_id)
);

-- Fair Value Gaps
CREATE TABLE IF NOT EXISTS fair_value_gaps (
  id INTEGER PRIMARY KEY,
  instrument_id INTEGER REFERENCES instruments(id),
  timeframe TEXT,
  timestamp TEXT,
  high REAL,
  low REAL,
  type TEXT CHECK(type IN ('bullish','bearish')),
  status TEXT DEFAULT 'active' CHECK(status IN ('active','respected','inverted','invalidated')),
  inverted_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Setups
CREATE TABLE IF NOT EXISTS setups (
  id INTEGER PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  instrument_id INTEGER REFERENCES instruments(id),
  date TEXT,
  phase INTEGER DEFAULT 0,
  sweep_direction TEXT CHECK(sweep_direction IN ('high','low')),
  sweep_level REAL,
  fvg_id INTEGER,
  ifvg_id INTEGER,
  entry_price REAL,
  target_price REAL,
  stop_price REAL,
  risk_reward REAL,
  status TEXT DEFAULT 'forming' CHECK(status IN ('forming','ready','entered','won','lost','expired','skipped')),
  haiku_analysis_json TEXT,
  confidence INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Trade Log
CREATE TABLE IF NOT EXISTS trade_log (
  id INTEGER PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  instrument_id INTEGER REFERENCES instruments(id),
  setup_id INTEGER,
  date TEXT,
  direction TEXT CHECK(direction IN ('long','short')),
  contracts INTEGER DEFAULT 1,
  entry_price REAL,
  exit_price REAL,
  pnl REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Apex Accounts
CREATE TABLE IF NOT EXISTS apex_accounts (
  id INTEGER PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  label TEXT,
  account_size INTEGER,
  account_type TEXT CHECK(account_type IN ('legacy','v4')),
  drawdown_type TEXT CHECK(drawdown_type IN ('trailing','eod','static')),
  drawdown_limit REAL,
  profit_target REAL,
  max_contracts INTEGER,
  scaling_limit INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Apex Daily PnL
CREATE TABLE IF NOT EXISTS apex_daily_pnl (
  id INTEGER PRIMARY KEY,
  apex_account_id INTEGER REFERENCES apex_accounts(id),
  date TEXT,
  pnl REAL,
  trades_count INTEGER DEFAULT 0,
  best_trade REAL,
  worst_trade REAL,
  notes TEXT,
  UNIQUE(apex_account_id, date)
);

-- Setup Alerts
CREATE TABLE IF NOT EXISTS setup_alerts (
  id INTEGER PRIMARY KEY,
  setup_id INTEGER,
  instrument_id INTEGER REFERENCES instruments(id),
  alert_type TEXT CHECK(alert_type IN ('approaching','ready','execute')),
  phase INTEGER,
  message TEXT,
  sweep_direction TEXT,
  sweep_level REAL,
  fvg_high REAL,
  fvg_low REAL,
  ifvg_high REAL,
  ifvg_low REAL,
  entry_price REAL,
  target_price REAL,
  stop_price REAL,
  risk_reward REAL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed instruments
INSERT INTO instruments (id, symbol, name, tick_size, tick_value) VALUES (1, 'ES', 'E-mini S&P 500', 0.25, 12.50);
INSERT INTO instruments (id, symbol, name, tick_size, tick_value) VALUES (2, 'NQ', 'E-mini Nasdaq 100', 0.25, 5.00);
