-- Migration 0007: Rename Apex to Alpha Futures
-- Note: Table renames (apex_accounts → alpha_accounts, etc.) were already applied.
-- This migration updates any remaining KB article references.

-- Update KB articles: rename Apex references to Alpha Futures (no-op if already done or empty)
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
