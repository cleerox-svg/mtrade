# mtrade Backend Efficiency & Scalability Standard

**Mandatory for every change that touches D1 or the Worker.** The rule is:
*always choose the most efficient and scalable option — no quick fixes.* On
Cloudflare Workers + D1, cost and latency scale with **rows read**, **rows
written**, **round-trips**, and **CPU per request**, and the Worker fires every
minute forever — so an inefficiency isn't a one-time cost, it recurs on every
tick for every user. Every agent (especially `backend-engineer` and
`qa-test-engineer`) enforces this checklist; a change that fails it is not done,
even if it typechecks and "works."

This standard formalizes patterns already in the codebase (see migrations
0012–0014 and `src/market-data.ts`). Follow the existing conventions; don't
reinvent or regress them.

## D1 reads — never scan, always cover
- **Every query must be index-served.** No full-table scans on any table that
  grows (candles, fair_value_gaps, setups, journal, market_news, *_daily_pnl).
  Add a matching index in a new migration when you add a query shape.
- **Prefer covering indexes** so the read is served entirely from the index and
  never touches the base table. Precedent: `idx_candles_session_lookup`
  (migration 0013) adds `high, low` to the index so the session scan doesn't
  double `rows_read`. If you `SELECT a, b WHERE k = ?` on a hot path, the index
  should cover `(k, a, b)`.
- **Select only the columns you use.** `SELECT *` on a wide/hot row wastes
  `rows_read` bytes and defeats covering indexes.
- **Bound every result set** — `LIMIT` + an ordered index, keyset/seek
  pagination over `OFFSET`. Never fetch "all rows then filter/aggregate in JS"
  when SQL + an index can do it (but respect D1/SQLite's weak planner — see
  Pitfalls).
- **Push aggregation into SQL** only when the planner can use an index for it;
  otherwise compute over a bounded, index-served row set in the Worker.

## D1 writes — batch, dedup, idempotent
- **Batch multi-row writes** with `env.DB.batch([...])` instead of N awaited
  `INSERT`s. Precedent: candle inserts batch at size 50 (`market-data.ts:144`).
- **Write only what changed.** Use `INSERT OR IGNORE` / upserts and skip rows
  already stored; don't re-write unchanged data every tick. Precedent: candle
  insert skips already-stored rows; the cron is change-gated end to end.
- **Idempotent migrations, append-only.** `CREATE TABLE IF NOT EXISTS`,
  `CREATE INDEX IF NOT EXISTS`; never edit an applied migration.

## Round-trips & Worker CPU
- **Minimize D1 round-trips.** Combine independent statements into one
  `DB.batch()`; parallelize genuinely independent awaits with `Promise.all`; a
  join beats N+1 per-row lookups. Never issue a query inside a loop when a single
  set-based query or one batch does the job.
- **Change-gate expensive work.** Follow the existing pattern: only do work for
  the `instrument:timeframe` combos that actually changed this tick, and no-op
  when the market is closed. New cron work must carry its own gate — nothing runs
  unconditionally every minute without justification.
- **Use warm-isolate caches for hot, rarely-changing reads,** with an explicit
  TTL and an invalidation path. Precedent: `latestCandlesCache` (newest
  timestamp per combo) and the strategy `configCache` (60s TTL, invalidated by
  the settings API). Don't cache per-user mutable state without invalidation.
- **Keep per-request CPU bounded** — no O(n²) scans over unbounded history in a
  request; precompute/store derived values (e.g. session levels) rather than
  recomputing from raw candles on every read.

## Scalability (correct as data and users grow)
- Design for **many users × many accounts × years of candles**, not today's row
  counts. Ask: "what does this query cost at 100× the rows?" If the answer is a
  scan, add the index or change the shape now.
- Prefer **incremental maintenance** (update derived state as data arrives) over
  periodic full re-aggregation; keep any full re-scan as a bounded, low-frequency
  reconciliation backstop (as `computeSessionLevels` is — hourly, not per tick).
- **No duplicated source-of-truth math.** The dashboard/compliance duplication
  between `compliance.ts` and `api.ts:computeDashboardMetrics` is debt to
  consolidate, not a pattern to copy — divergent copies are correctness bugs.

## D1 / SQLite pitfalls (do not regress)
- **The SQLite planner is weak.** A `GROUP BY` it can't serve from an index will
  scan — a batched `MAX(timestamp) … GROUP BY` was reverted for exactly this
  (git history). Verify the plan with `EXPLAIN QUERY PLAN` before assuming SQL is
  cheaper than an index-served seek.
- Index the columns behind `UNIQUE` dedup checks (adding an index to
  `fair_value_gaps` in 0012 removed full scans that were ~72% of D1 spend).
- Beware unbounded `IN (...)` lists and `LIKE '%…%'` (non-sargable) on hot paths.

## Enforcement checklist (must pass before "done")
1. Does every new/changed query hit an index? (`EXPLAIN QUERY PLAN` shows
   `SEARCH … USING INDEX`, not `SCAN`.)
2. Is the hot-path read covered by the index (no base-table lookup)?
3. Are result sets bounded (`LIMIT` + order), and only needed columns selected?
4. Are multi-row writes batched and idempotent; is unchanged data skipped?
5. Is any new recurring/cron work change-gated and market-hours aware?
6. Does it hold at 100× current rows/users — or did we just add a scan?
7. `npx tsc --noEmit` passes and `qa-test-engineer` has signed off on the above.

If a truly optimal solution is large, **do it properly or flag the tradeoff to
the user** — do not land a quick fix that adds a scan, an unbatched write, or
uncapped per-tick work "for now."
