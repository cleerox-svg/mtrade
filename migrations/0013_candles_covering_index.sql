-- D1 cost optimization round 2:
-- Covering index for computeSessionLevels' 1-day 1m candle scan.
-- The existing UNIQUE(instrument_id, timeframe, timestamp) covers the WHERE
-- clause but high and low are fetched from the table for every matched row,
-- doubling rows_read on D1. Adding high+low to a dedicated index lets the
-- range scan be served entirely from the index.

CREATE INDEX IF NOT EXISTS idx_candles_session_lookup
  ON candles(instrument_id, timeframe, timestamp, high, low);
