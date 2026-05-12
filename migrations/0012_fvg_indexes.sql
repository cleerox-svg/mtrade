-- D1 cost optimization: add indexes for fair_value_gaps hot paths.
-- Prior to this migration the table had no indexes, so every query
-- (dedup checks, status scans, API reads) performed a full table scan.

-- 1. Dedup any pre-existing rows that would violate the unique constraint
--    introduced below. Keeps the lowest id per (instrument, timeframe, timestamp).
DELETE FROM fair_value_gaps
WHERE id NOT IN (
  SELECT MIN(id)
  FROM fair_value_gaps
  GROUP BY instrument_id, timeframe, timestamp
);

-- 2. Unique lookup index. Targets the #1 cost query (72% of D1 spend):
--      SELECT id FROM fair_value_gaps
--      WHERE instrument_id = ? AND timeframe = ? AND timestamp = ?
--    Also lets us replace the SELECT-then-INSERT dedup pattern with
--    INSERT OR IGNORE in scanForFVGs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_fvg_unique_lookup
  ON fair_value_gaps(instrument_id, timeframe, timestamp);

-- 3. Status + recency index. Targets updateFVGStatuses and /api/fvg/:symbol:
--      WHERE instrument_id = ? AND status = ? AND created_at >= ?
--    Column order matches selectivity: instrument (low) → status (low) →
--    created_at (high, range-scanned last).
CREATE INDEX IF NOT EXISTS idx_fvg_instrument_status_created
  ON fair_value_gaps(instrument_id, status, created_at);

-- 4. Type + recency index. Targets the phase-2→3 retracement scan and
--    the continuation scan in strategy-engine.ts:
--      WHERE instrument_id = ? AND type = ? AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_fvg_instrument_type_created
  ON fair_value_gaps(instrument_id, type, created_at);

-- 5. Partial index for the inverted-FVG continuation lookup:
--      WHERE instrument_id = ? AND type = ? AND status = 'inverted'
--        AND inverted_at > ?
--    Partial keeps the index small (only inverted rows) and the query
--    can use it directly because the predicate matches.
CREATE INDEX IF NOT EXISTS idx_fvg_inverted_at
  ON fair_value_gaps(instrument_id, type, inverted_at)
  WHERE status = 'inverted';
