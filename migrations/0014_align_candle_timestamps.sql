-- Yahoo's chart API returned candle timestamps with sub-second offsets that
-- varied between polls, so the same bar was stored multiple times with
-- different timestamps. The application code now aligns timestamps to the
-- timeframe boundary before insert, but historical rows still carry the
-- pre-alignment timestamps with dup factors of ~2× on 1m, ~1.6× on 5m,
-- and ~1.2× on 5/15m as of 2026-05-18.
--
-- This migration:
--   1. Removes duplicate rows per (instrument_id, timeframe, aligned bar),
--      keeping the oldest rowid (earliest insertion) in each group.
--   2. Normalises the surviving timestamps to the aligned bar start so
--      future polls match exactly via the UNIQUE constraint.
--
-- It's idempotent and only touches 1m/5m/15m (1H and 4H show no dup
-- inflation in audits).

-- Step 1: dedupe 1m bars
DELETE FROM candles
WHERE timeframe = '1m'
  AND rowid NOT IN (
    SELECT MIN(rowid)
    FROM candles
    WHERE timeframe = '1m'
    GROUP BY instrument_id, substr(timestamp, 1, 16)
  );

-- Step 2: dedupe 5m bars (group by 5-minute aligned start)
DELETE FROM candles
WHERE timeframe = '5m'
  AND rowid NOT IN (
    SELECT MIN(rowid)
    FROM candles
    WHERE timeframe = '5m'
    GROUP BY instrument_id,
             substr(timestamp, 1, 14)
             || printf('%02d', (CAST(substr(timestamp, 15, 2) AS INTEGER) / 5) * 5)
  );

-- Step 3: dedupe 15m bars (group by 15-minute aligned start)
DELETE FROM candles
WHERE timeframe = '15m'
  AND rowid NOT IN (
    SELECT MIN(rowid)
    FROM candles
    WHERE timeframe = '15m'
    GROUP BY instrument_id,
             substr(timestamp, 1, 14)
             || printf('%02d', (CAST(substr(timestamp, 15, 2) AS INTEGER) / 15) * 15)
  );

-- Step 4: normalise 1m timestamps to second :00
UPDATE candles
SET timestamp = substr(timestamp, 1, 16) || ':00.000Z'
WHERE timeframe = '1m'
  AND timestamp NOT LIKE '%:00.000Z';

-- Step 5: normalise 5m timestamps to aligned 5-minute boundary
UPDATE candles
SET timestamp =
    substr(timestamp, 1, 14)
    || printf('%02d', (CAST(substr(timestamp, 15, 2) AS INTEGER) / 5) * 5)
    || ':00.000Z'
WHERE timeframe = '5m'
  AND (
    CAST(substr(timestamp, 15, 2) AS INTEGER) % 5 != 0
    OR substr(timestamp, 18) != '00.000Z'
  );

-- Step 6: normalise 15m timestamps to aligned 15-minute boundary
UPDATE candles
SET timestamp =
    substr(timestamp, 1, 14)
    || printf('%02d', (CAST(substr(timestamp, 15, 2) AS INTEGER) / 15) * 15)
    || ':00.000Z'
WHERE timeframe = '15m'
  AND (
    CAST(substr(timestamp, 15, 2) AS INTEGER) % 15 != 0
    OR substr(timestamp, 18) != '00.000Z'
  );
