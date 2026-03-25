-- Add metadata_json column to setups for storing BOS level and other phase metadata
ALTER TABLE setups ADD COLUMN metadata_json TEXT;
