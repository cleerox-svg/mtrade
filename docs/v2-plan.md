# mtrade V2 — "Secret Weapon" Trading Cockpit — Plan & Feasibility

**Status:** Proposal for review. This is a plan + feasibility assessment + open
questions, not an implementation. Nothing here is built yet.

**Vision (Matthew's words, distilled):** a single cockpit Matthew logs into that
shows (1) all his funded prop accounts at a glance, (2) a chart configured to his
strategy with his indicators running live while he watches TradingView on a
second screen, and (3) a real trade journal with performance analytics and
AI-assisted screenshot review. Lucid + Trade Syncer appear as small widgets, not
full pages. He now trades **Lucid Trading** (not Alpha Futures), so most of the
existing Alpha-specific logic is stale.

---

## 1. Feasibility findings (real, sourced — verify live before spending)

Every direct page fetch was bot-walled (HTTP 403) in this environment, so figures
come from search-indexed excerpts of the cited pages. **Treat all prices/rules as
"verify on the live page before committing."**

### 1a. Logging into funded accounts — the hard constraint
- **Lucid runs on Tradovate + Rithmic + NinjaTrader** now; it dropped ProjectX
  after the Oct 2025 AWS outage. Lucid has **no first-party public API**, and its
  own dashboard is **OTP-gated on every login** → not automatable. Account data
  must be read at the **platform layer** (Tradovate or Rithmic).
- **Lucid's Terms explicitly permit automation, third-party tools, and trade
  copiers** (only HFT/latency-arbitrage/rule-evasion is banned). So this is
  allowed — the friction is technical, not legal. ✅
- **Tradovate**: real REST + WebSocket API (balance, positions, orders, fills),
  **but prop/eval accounts are blocked from the plain retail API** — access
  requires a **registered commercial/partner app (CID + secret)** using
  username/password. **Rithmic (R|API+)**: full API but **native C++/.NET/Python
  libraries**, requires signed Rithmic agreements + firm-side enablement.
- **The architectural catch:** both are **persistent-socket / native-library**
  integrations. **A Cloudflare Worker cannot hold them** — Workers are
  short-lived and stateless. A live "all my accounts" view therefore needs an
  **always-on companion bridge** (a small Node/Python process on Matthew's PC or
  a cheap VPS) that talks to Tradovate/Rithmic and pushes snapshots to the
  platform. Proof it works: the third-party app **Lucid Terminal**
  (lucidterminal.io) already reads balance/positions/fills every ~5s this way.
- **Realistic options (choose per appetite):**
  - **Tier 0 — Manual / CSV import.** Matthew enters or imports daily balance +
    trades. Zero infra, works today, no approvals. Good enough for journaling and
    a compliance dashboard; not live.
  - **Tier 1 — Companion bridge.** A tiny always-on service authenticates to
    Tradovate (commercial app) or Rithmic (agreements), polls every few seconds,
    and POSTs snapshots to an authenticated `/api/sync` endpoint → D1. Gives a
    near-live accounts rail. Cost: Tradovate commercial-app approval **or**
    Rithmic (~$125/mo dev + fees) + a VPS (~$5–10/mo) + ops.

**Verdict: 🟡 Yellow.** Feasible and permitted, but a live accounts tab is not a
Worker-only feature — it needs the bridge. Recommend **shipping Tier 0 first**,
then adding Tier 1 if Matthew wants live sync.

### 1b. Trade Syncer widget
- **Tradesyncer** (the copier, `tradesyncer.com`) has **no public API, no
  webhooks out, email/password login only**, and **can't be iframed** (auth wall
  + Cloudflare + cross-site cookies). Its only export is a **manual CSV/PDF** from
  its built-in journal. So a *live data* widget pulling from Trade Syncer is
  **🔴 Red.**
- **BUT the valuable direction is outbound, not inbound:** Trade Syncer **accepts
  TradingView-style webhook alerts as a trigger** and fans the order out to all
  connected funded accounts. That is the real "secret weapon": **mtrade detects a
  setup → fires a webhook → Trade Syncer executes across every Lucid account.**
- **Widget realistically = a small control panel**: copier on/off reminder,
  a "send this setup to Trade Syncer" button (fires the webhook), last-alert
  status, and a link-out to the Trade Syncer app. Not a live mirror of its data.
  (Don't confuse with **Tradesync.com** — a different MT4/5 product that *does*
  have an API. Not what Matthew uses.)

### 1c. Charts configured to the strategy
- **Chart library:** replace the current hand-rolled SVG with **TradingView
  Lightweight Charts** (Apache-2.0, free, safe for private use). Its
  primitives/custom-series API draws exactly what the strategy needs — FVG/IFVG
  boxes, session high/low lines, BOS/sweep markers, entry/stop/target — over live
  candles, and handles 10k+ bars smoothly. (KLineCharts is a viable alternative;
  TradingView **Advanced Charts** only if we want their drawing-tools UX and
  accept its "licensed for public products, not personal use" gray area.)
- **Live data is the real cost/licensing question.** The current Yahoo endpoint
  is **delayed (~15–20 min), unofficial, ToS-risky, and gets IP-blocked** — fine
  as a labeled delayed fallback, not as a live feed. Legitimate live CME options:
  - **Databento (GLBX.MDP3)** — cleanest web integration; **non-professional
    online attestation, no exchange paperwork**; budget ≈ **CME license from
    ~$32.65/mo (non-pro) + ~$199/mo** for the full API/history.
  - **Your existing prop account's feed** — cheapest if reused, but Tradovate's
    **API** market data triggers a CME sub-vendor ILA (~$290+/mo); ProjectX's
    REST feed is the most web-friendly account-API option.
  - **Licensing gotcha:** a server computing FVG/BOS signals may count as
    **non-display / derived** use (a higher fee tier) vs. plain display. Confirm
    with the vendor before committing — it materially changes cost.

**Verdict: 🟢 Green on charting, 🟡 Yellow on live data** (works, but there's a
real monthly fee and a display-vs-non-display question to resolve).

### 1d. Journal (mostly already exists — extend it)
The current app already has a journal with entries, AI analysis, generated chart
snapshots, R:R target/achieved, notes, and tags, plus a "similar setups" feature
and a stats endpoint. **V2 additions:**
- **Screenshot upload** of a chart where a trade was taken → store in
  **Cloudflare R2** (object storage; keep D1 for metadata only).
- **AI vision review**: send the uploaded screenshot to **Claude with image
  input** (vision) to critique the setup/entry/exit and write structured
  feedback, then let Matthew add his own notes. (Today's Haiku call is text-only.)
- **"Add a trade I made elsewhere"**: a manual trade-entry form (instrument,
  direction, size, entry/stop/target/exit, date) not tied to an in-app setup.
- **Performance overview**: win rate, average win, average loss, average R:R,
  expectancy, profit factor — computed over an index-served, bounded query.

**Verdict: 🟢 Green.** All standard; R2 + Claude vision are the only new pieces.

---

## 2. Proposed V2 architecture

Keep the strong parts of the current stack (Cloudflare Worker + D1, React SPA,
Google-auth invite gate, the ICT strategy engine) and **re-scope around Lucid**:

| Layer | V2 change |
|-------|-----------|
| **Accounts** | New `accounts` model (Lucid plans: Pro/Flex/Direct), Tier 0 manual/CSV now; optional Tier 1 companion bridge → `/api/sync`. Retire Alpha-specific `alpha_accounts` shape. |
| **Compliance** | **Rewrite `compliance.ts` for Lucid's rules** (EOD trailing drawdown, plan-specific consistency, 100% of first $10k then 90/10 split, daily $500-min payouts, 10 eval + 5 funded household cap). Owned by `market-compliance-officer`. |
| **Charts** | Swap SVG for **Lightweight Charts**; overlay FVG/IFVG/BOS/sweeps/session levels + entry/stop/target; add a data-source abstraction (Yahoo-delayed now, Databento/prop-feed later). |
| **Automation** | Outbound **webhook emitter** to Trade Syncer on qualifying setups (the "secret weapon"), behind an explicit arm/disarm switch. |
| **Journal** | Add **R2 screenshot storage** + **Claude vision** review + manual trade entry + a performance-analytics page. |
| **Storage** | Add **R2** for screenshots; D1 stays the system of record for structured data (index-served, per the efficiency standard). |

### Navigation (V2)
`Cockpit` (dashboard: live strategy chart + accounts rail + alerts) · `Charts`
(full-screen configurable) · `Journal` (list + analytics + entry detail) ·
`Accounts` (funded-account detail + compliance) · `Strategy` (config Matthew
dictates) · `Learn` · `Settings`. Lucid + Trade Syncer live as **small widgets**
on the Cockpit, not pages.

---

## 3. Phased roadmap

- **Phase 0 — De-Alpha + reframe (foundation).** Introduce the Lucid account
  model + rewritten compliance; migrate/retire Alpha tables; update copy. Ship
  Tier-0 manual account entry. *(backend + market-compliance-officer + content +
  QA)*
- **Phase 1 — Charts V2.** Lightweight Charts with the full strategy overlay;
  data-source abstraction with labeled delayed Yahoo; instrument/timeframe config.
  *(frontend + day-trading-strategist + backend + QA)*
- **Phase 2 — Journal V2.** R2 screenshot upload + Claude-vision review + manual
  trade entry + analytics (win rate / avg win / avg loss / avg R:R / expectancy).
  *(backend + frontend + content + QA)*
- **Phase 3 — Secret-weapon automation.** Outbound Trade Syncer webhook on armed
  setups, with a safety switch and audit log. *(backend + day-trading-strategist
  + market-compliance-officer + QA)*
- **Phase 4 (optional) — Live account bridge + live data.** Companion bridge for
  near-real-time Lucid balances; Databento (or prop feed) for live candles.
  *(backend + a small out-of-repo bridge service)*

Each phase is a reviewable PR under the orchestrator + sub-agent model in
`CLAUDE.md`. Every D1/Worker change is held to
`docs/backend-efficiency-standard.md`.

## 4. Rough monthly cost (verify live)
- Software libs (Lightweight Charts, R2 at low volume): ~$0–$5/mo.
- Live data (only if Phase 4): Databento ≈ $33–$200/mo depending on
  display/non-display, or reuse a prop feed.
- Companion bridge VPS (only if Phase 4): ~$5–10/mo, or run on Matthew's PC free.
- Trade Syncer itself: $49–$149/mo (already Matthew's, unchanged).
- Existing: Cloudflare Workers/D1 (minimal), Anthropic (usage-based).

## 5. Open questions
See the questions posed alongside this plan — the biggest are: (a) how live must
the accounts tab be (manual vs bridge); (b) keep or drop the perfume/fragrance
branding; (c) is the ICT strategy still the strategy, or is Matthew changing it;
(d) willingness to pay for a legit live feed vs. accept delayed data for now.

## Sources
Lucid: lucidtrading.com; support.lucidtrading.com (supported-platforms,
permitted-activities, lucidflex-funded); proptradingvibes.com (ProjectX
migration); tradetanto.com, damnpropfirms.com, quantvps.com (rules/payouts);
traderspost.io (automation); lucidterminal.io (feasibility proof). Tradovate:
api.tradovate.com; partner.tradovate.com; community.tradovate.com
(prop-account API threads). Rithmic: rithmic.com/apis; ampfutures.com.
Trade Syncer: tradesyncer.com (+ help center); do-not-conflate tradesync.com.
Charts/data: tradingview.com/lightweight-charts & /advanced-charts;
github.com/tradingview/lightweight-charts; databento.com/futures & /pricing;
polygon.io/futures; cmegroup.com market-data policy; Yahoo yfinance/ToS.
