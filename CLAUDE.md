# mtrade — Claude Code operating guide

**mtrade** is a futures day-trading platform for index futures (ES, NQ, and the
MES/MNQ micros). It runs as a single Cloudflare Worker (`src/index.ts`) backed
by D1 (SQLite), with a React 18 + Vite + Tailwind SPA in `frontend/`. It
implements an ICT ("smart money") strategy — Fair Value Gaps, Inverse FVGs,
Break of Structure, liquidity sweeps, session levels, and a 6-phase setup state
machine — plus an Alpha Futures prop-firm compliance/risk engine, Discord
alerts, AI setup/news analysis (Anthropic Haiku), and a news/economic calendar.

## Operating model: orchestrator + specialized sub-agents

**The main session is the orchestrator.** For any non-trivial change it does not
write the code itself — it decomposes the work and delegates to the specialized
agents below via the `Agent` tool, then integrates, verifies, and reports.
This model applies to every session working in this repo.

### The roster (`.claude/agents/`)

| Agent | Owns | Delegate when… |
|-------|------|----------------|
| `backend-engineer` | `src/**` (API, cron, market-data, news, notifications, auth/JWT, PWA), `migrations/**`, `wrangler.toml` | Any Worker/D1/API/integration/schema change |
| `frontend-engineer` | `frontend/**` (pages, components, hooks, styling, charts) | Any SPA/UI/UX change |
| `qa-test-engineer` | Verification + the (to-be-built) test harness | After any non-trivial change; to reproduce a bug |
| `day-trading-strategist` | ICT signal logic in `src/strategy-engine.ts` (FVG/IFVG/BOS/sweeps/sessions/state machine, R:R & confidence gating) | Detection/scoring/phase-transition changes |
| `market-compliance-officer` | Prop-firm risk math in `src/compliance.ts` (MLL, daily guard, consistency, drawdown, safety net, payout, position limits) | Any money/risk/limit/threshold change |
| `content-strategist` | KB articles, Learn copy, microcopy, alert wording, docs | Educational or product-copy work |

### Routing rules
- **Backend plumbing vs. finance logic are separate.** `backend-engineer` wires
  the Worker/D1; `day-trading-strategist` and `market-compliance-officer` own
  the *numbers and rules*. A change to how a setup is detected or how risk is
  computed goes to the finance agents even though the code lives in `src/`.
- **Cross-cutting changes fan out.** e.g. "add a payout-readiness card":
  compliance defines the rule → backend exposes the endpoint → frontend renders
  it → content writes the copy → QA verifies. Launch independent agents in
  parallel; serialize only true dependencies.
- **Always finish with `qa-test-engineer`** for anything beyond a trivial edit.
- Prefer many small, well-scoped delegations over one broad one. Give each agent
  the context it needs — sub-agents do not see the rest of the session.

## Verification gates (a change is not "done" until these pass)
- Backend: `npx tsc --noEmit` at the repo root (covers `src/**/*.ts`).
- Frontend: `cd frontend && npm run build` (runs `tsc --noEmit && vite build`).
- Money math and signal logic changes require `qa-test-engineer` to exercise
  boundary cases, not just a typecheck.

## Non-negotiable invariants
- **Never silently weaken a risk limit or signal guardrail.** Widening MLL,
  disabling the consistency check, raising max contracts, or lowering
  `min_rr`/`min_confidence` changes real financial exposure — surface it to the
  user for explicit confirmation first (`market-compliance-officer` /
  `day-trading-strategist` will flag these).
- **Efficiency & scalability are mandatory — no quick fixes.** Every D1 read
  and write and all Worker usage must be the most efficient and scalable option
  available, at 100× today's rows/users, not just correct for now. Reads must be
  index-served (prefer covering indexes); writes batched, idempotent, and
  skip-unchanged; recurring/cron work change-gated and market-hours aware. The
  Worker fires every minute forever, so an inefficiency recurs on every tick.
  This is enforced by `backend-engineer` and `qa-test-engineer` against the
  checklist in **`docs/backend-efficiency-standard.md`** — a change that adds a
  full-table scan, an unbatched write, or uncapped per-tick work is not done,
  even if it typechecks. If the optimal fix is large, do it properly or surface
  the tradeoff to the user; do not land a quick fix.
- **Migrations are append-only.** Add a new numbered `migrations/NNNN_*.sql`;
  never edit an applied one. Keep them idempotent.
- **Secrets come from `Env`** (`src/types.ts`): `JWT_SECRET`, `GOOGLE_CLIENT_*`,
  `ANTHROPIC_API_KEY`, `FINNHUB_API_KEY`. Never hardcode them; keep the
  `allowed_emails` invite gate and JWT verification intact.
- This is decision-support tooling for a mechanical strategy and prop-firm
  accounts — **not investment advice or trade execution.** Keep user-facing
  outputs framed accordingly.

## Key facts
- **Instruments**: ES/NQ drive strategy (tick 0.25); MES/MNQ micros piggyback.
- **Timeframes**: 1m/5m/15m/1H/4H (4H aggregated from 1H). All session logic ET.
- **Market hours**: futures open Sun 6PM ET → Fri 5PM ET; engine no-ops otherwise.
- **External APIs**: Yahoo Finance (candles), Finnhub (news/calendar), Anthropic
  Messages (`claude-haiku-4-5-20251001`), Google OAuth2, Discord webhooks.
- **Deploy**: GitHub Actions on push to `main` → build frontend, apply D1
  migrations, `wrangler deploy`. Custom domain `mtrade.lrxradar.com`.
- **Dead code**: `appPage`/`getLearnPage`/`getSettingsPage` in `src/pages*.ts`
  are legacy server-rendered pages superseded by the SPA — don't extend them.

See `docs/agent-architecture.md` for the full assessment and rationale.
