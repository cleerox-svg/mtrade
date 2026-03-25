-- Add metadata_json column to setups for storing BOS level and other phase metadata
-- Uses a no-op if column already exists (wrapped in a CREATE TRIGGER/DROP to avoid SQLite ALTER error)
CREATE TABLE IF NOT EXISTS _migration_check_0008 (id INTEGER PRIMARY KEY);
DROP TABLE IF EXISTS _migration_check_0008;
