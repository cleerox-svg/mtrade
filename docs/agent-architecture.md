# mtrade Sub-Agent Architecture — Assessment & Plan

This document is the assessment of the mtrade platform and the plan for the
specialized sub-agent model that all future Claude Code sessions in this repo
should follow. The operational rules live in `CLAUDE.md`; the agent definitions
live in `.claude/agents/`. This doc explains *why*.

## 1. Platform assessment

mtrade is a single Cloudflare Worker + D1 (SQLite) app with a React SPA
front-end. It is small in file count but dense in domain logic, and it already
has **clean vertical seams** that map naturally onto specialized agents:

| Seam | Where | Nature of the work |
|------|-------|--------------------|
| Worker plumbing / API / cron | `src/index.ts`, `src/api.ts` (~89KB router), `src/market-data.ts`, `src/news.ts`, `src/notifications.ts`, `src/auth.ts`, `src/jwt.ts`, `src/pwa.ts` | Systems: routing, D1 queries/indexes, external APIs, cost control |
| Trading-signal logic | `src/strategy-engine.ts` (~46KB) | Finance: ICT signal correctness (FVG/IFVG/BOS/sweeps/state machine) |
| Prop-firm risk/compliance | `src/compliance.ts` | Finance: money math, risk limits, payout rules |
| React SPA | `frontend/**` | UI/UX, data fetching, hand-rolled SVG charts |
| Educational content | `kb_articles`, `Learn.tsx`, alert copy | Content: trading education, brand voice |
| Schema | `migrations/**` (append-only, 0001–0014) | Systems, cost-driven |

Notable characteristics that shaped the design:

- **Cost is a first-class constraint.** The cron fires every minute; work is
  change-gated (a `Set` of changed `instrument:timeframe` combos threads
  market-data → strategy engine), warm-isolate caches are used deliberately, and
  migrations 0012–0014 exist purely to cut D1 spend. Any agent touching the hot
  path must respect this.
- **Safety-critical math.** Compliance limits (MLL 4%/3.5%, daily guard 2%,
  consistency 40%, drawdown modes) protect real prop-firm capital; signal
  gating (`min_rr`, `min_confidence`, entry confirmation) protects against false
  trades. These are invariants, not preferences.
- **AI is already in the product.** Anthropic Haiku (`claude-haiku-4-5-20251001`)
  is called from three modules for setup/news/journal analysis — the domain
  agents own those prompts.
- **Some duplication and dead code exist** — compliance math is duplicated in
  `api.ts:computeDashboardMetrics`, and three large server-rendered page files
  are superseded by the SPA. These are known and flagged, not to be extended.

**Conclusion:** the codebase is well-suited to an orchestrator + specialist
model. The dominant risk in ad-hoc single-agent editing is that finance logic
(signals, risk limits) gets changed as if it were ordinary code. The
architecture's main job is to route those changes to agents that treat them as
domain decisions with guardrails.

## 2. The model

**Orchestrator (main session):** decomposes work, delegates, integrates,
verifies, and reports. Does not write non-trivial code directly.

**Specialized agents** (`.claude/agents/`):

- **Coding** — `backend-engineer`, `frontend-engineer`, `qa-test-engineer`
- **Finance** — `day-trading-strategist` (day-trading signal logic),
  `market-compliance-officer` (regulated/prop-firm trading rules)
- **Content** — `content-strategist`

Each definition encodes: scope/ownership (file globs), the domain facts that
agent must respect, a definition-of-done with concrete verification commands,
and guardrails (what it must not do alone).

### Key routing principle: plumbing vs. numbers
The single most important rule: **the code's location does not determine the
owner.** Signal detection and risk math live under `src/`, but they belong to
the finance agents, not `backend-engineer`. Backend wires the endpoints and
D1; the finance agents own the rules and numbers. Changes to limits or signal
guardrails require explicit user confirmation.

### Example fan-out — "add a payout-readiness card"
1. `market-compliance-officer` — define the eligibility rule + worked example.
2. `backend-engineer` — expose it via a `/api/*` endpoint (indexed, cost-aware).
3. `frontend-engineer` — render the card in the dashboard, matching the design system.
4. `content-strategist` — write the label/tooltip/empty-state copy.
5. `qa-test-engineer` — verify boundaries (at-limit, advanced vs standard, zero PnL).

Independent steps run in parallel; only real dependencies serialize.

## 3. Verification gates
- Backend: `npx tsc --noEmit` (root).
- Frontend: `cd frontend && npm run build` (`tsc --noEmit && vite build`).
- Finance changes additionally require `qa-test-engineer` boundary testing.

## 4. Rollout plan
1. **Land the scaffolding** (this change): `CLAUDE.md`, `.claude/agents/*`, this doc.
2. **Adopt on the next feature/bugfix**: the orchestrator delegates per the table.
3. **Bootstrap tests** (first `qa-test-engineer` engagement): add `vitest`, unit
   tests for `compliance.ts` and the pure strategy detectors — the
   highest-value, side-effect-free logic — with hermetic fixtures.
4. **Pay down known debt as it's touched**: consolidate the duplicated
   dashboard/compliance math; remove the dead server-rendered pages.

## 5. Extending the roster
Add a new agent when a durable new domain seam appears (e.g. a broker/execution
integration, or a backtesting engine). Give it: a tight `description` (so the
orchestrator routes to it), explicit file ownership, verification commands, and
guardrails. Update the table in `CLAUDE.md` and this doc. Keep agents few and
sharply scoped — overlapping agents create routing ambiguity.
