-- EXPLAIN QUERY PLAN audit (2026-05-18) flagged seven hot queries falling
-- into SCAN + TEMP B-TREE plans. The tables are small today so the cost is
-- negligible, but the plans degrade O(n) as setups, alerts, and trade_log
-- grow. Indexes here mirror the exact WHERE/ORDER BY shapes from the
-- strategy engine and API handlers.

-- 1. setups: hot cron query is
--      WHERE instrument_id=? AND date=? AND status IN ('forming','ready')
--      ORDER BY created_at DESC LIMIT 1
--    Lead with instrument_id (equality), then date + status. A second
--    narrower index covers the API dashboard query that omits instrument_id.
CREATE INDEX IF NOT EXISTS idx_setups_instrument_date_status
  ON setups(instrument_id, date, status, created_at);

CREATE INDEX IF NOT EXISTS idx_setups_date_status
  ON setups(date, status, created_at);

-- 2. setup_alerts: dashboard enrichment fetches per setup; the active-count
--    query scans all rows. Two narrow indexes, second is partial.
CREATE INDEX IF NOT EXISTS idx_setup_alerts_setup
  ON setup_alerts(setup_id, created_at);

CREATE INDEX IF NOT EXISTS idx_setup_alerts_active
  ON setup_alerts(created_at)
  WHERE is_active = 1;

-- 3. trade_log: stats endpoint joins by setup_id; history endpoint paginates
--    by user_id + date.
CREATE INDEX IF NOT EXISTS idx_trade_log_setup
  ON trade_log(setup_id);

CREATE INDEX IF NOT EXISTS idx_trade_log_user_date
  ON trade_log(user_id, date);

-- 4. alpha_accounts: account list per user is sorted by created_at.
CREATE INDEX IF NOT EXISTS idx_alpha_accounts_user
  ON alpha_accounts(user_id, created_at);
