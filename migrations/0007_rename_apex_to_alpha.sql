-- Rename Apex tables to Alpha Futures

ALTER TABLE apex_accounts RENAME TO alpha_accounts;
ALTER TABLE apex_daily_pnl RENAME TO alpha_daily_pnl;

-- Rename the foreign key column in daily pnl
ALTER TABLE alpha_daily_pnl RENAME COLUMN apex_account_id TO alpha_account_id;

-- Rename account templates table
ALTER TABLE apex_account_templates RENAME TO alpha_account_templates;

-- Update account_type CHECK constraint to support new values
-- SQLite doesn't support ALTER TABLE to modify constraints,
-- but the new code handles 'zero', 'standard', 'advanced' values

-- Update KB articles: rename Apex references to Alpha Futures
UPDATE kb_articles SET
  slug = 'alpha-consistency',
  title = 'Alpha Futures Consistency Rule',
  content = REPLACE(REPLACE(content, 'Apex', 'Alpha Futures'), 'apex', 'alpha')
WHERE slug = 'apex-consistency';

UPDATE kb_articles SET
  slug = 'alpha-drawdown',
  title = 'Alpha Futures Drawdown (MLL) Explained',
  content = REPLACE(REPLACE(content, 'Apex', 'Alpha Futures'), 'apex', 'alpha')
WHERE slug = 'apex-drawdown';

UPDATE kb_articles SET
  slug = 'alpha-payout',
  title = 'Alpha Futures Payout Requirements',
  content = REPLACE(REPLACE(content, 'Apex', 'Alpha Futures'), 'apex', 'alpha')
WHERE slug = 'apex-payout';

-- Update any remaining articles that reference Apex
UPDATE kb_articles SET
  content = REPLACE(REPLACE(content, 'Apex', 'Alpha Futures'), 'apex', 'alpha'),
  slug = REPLACE(slug, 'apex', 'alpha'),
  title = REPLACE(title, 'Apex', 'Alpha Futures')
WHERE content LIKE '%Apex%' OR content LIKE '%apex%' OR slug LIKE '%apex%' OR title LIKE '%Apex%';
