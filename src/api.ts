import { Env, JwtPayload } from './types';
import { sendTestNotification, getUserSettings } from './notifications';
import { checkTradeCompliance, quickTradeCheck, TradeInput, QuickCheckInput } from './compliance';

type Json = (data: unknown, status?: number) => Response;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function callHaiku(env: Env, systemPrompt: string, userPrompt: string): Promise<unknown> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  const data = await resp.json<{ content: { text: string }[] }>();
  let text = data.content[0].text;
  // Strip markdown code fences and backticks
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text);
  }
}

async function buildChartSnapshot(
  env: Env,
  instrumentId: number | null,
  dateStr: string
): Promise<string | null> {
  if (!instrumentId) return null;
  const { results: candles } = await env.DB.prepare(
    `SELECT timestamp, timeframe, open, high, low, close, volume FROM candles
     WHERE instrument_id = ? AND timestamp <= ?
     ORDER BY timestamp DESC LIMIT 60`
  ).bind(instrumentId, `${dateStr}T23:59:59Z`).all();

  const session = await env.DB.prepare(
    `SELECT london_high, london_low, ny_high, ny_low, asia_high, asia_low
     FROM sessions WHERE instrument_id = ? AND date = ?`
  ).bind(instrumentId, dateStr).first();

  return JSON.stringify({
    candles: candles.reverse(),
    session: session ?? null,
    captured_at: new Date().toISOString(),
  });
}

async function createJournalFromTradeLog(
  env: Env,
  userId: string,
  tradeLogId: number,
  opts: { setup_id?: number | null; notes?: string | null; tags?: string | null } = {}
): Promise<number | null> {
  const trade = await env.DB.prepare(
    'SELECT * FROM trade_log WHERE id = ? AND user_id = ?'
  ).bind(tradeLogId, userId).first<Record<string, unknown>>();
  if (!trade) return null;

  const existing = await env.DB.prepare(
    'SELECT id FROM journal_entries WHERE trade_log_id = ? AND user_id = ?'
  ).bind(tradeLogId, userId).first<{ id: number }>();
  if (existing) return existing.id;

  const setupId = (opts.setup_id ?? trade.setup_id ?? null) as number | null;
  let setup: Record<string, unknown> | null = null;
  if (setupId) {
    setup = await env.DB.prepare('SELECT * FROM setups WHERE id = ?')
      .bind(setupId).first<Record<string, unknown>>();
  }

  const entryPrice = trade.entry_price as number | null;
  const exitPrice = trade.exit_price as number | null;
  const stopPrice = (setup?.stop_price ?? null) as number | null;
  const targetPrice = (setup?.target_price ?? null) as number | null;
  const rrTarget = (setup?.risk_reward ?? null) as number | null;

  let rrAchieved: number | null = null;
  if (entryPrice != null && exitPrice != null && stopPrice != null) {
    const risk = Math.abs(entryPrice - stopPrice);
    if (risk > 0) {
      const reward = (trade.direction === 'long')
        ? exitPrice - entryPrice
        : entryPrice - exitPrice;
      rrAchieved = Math.round((reward / risk) * 100) / 100;
    }
  }

  const snapshot = await buildChartSnapshot(
    env,
    trade.instrument_id as number | null,
    trade.date as string
  );

  const result = await env.DB.prepare(
    `INSERT INTO journal_entries
      (user_id, trade_log_id, setup_id, instrument_id, date, direction, contracts,
       entry_price, stop_price, target_price, exit_price, pnl,
       rr_target, rr_achieved, setup_phase, chart_snapshot_svg, notes, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    userId,
    tradeLogId,
    setupId,
    trade.instrument_id ?? null,
    trade.date,
    trade.direction,
    trade.contracts ?? null,
    entryPrice,
    stopPrice,
    targetPrice,
    exitPrice,
    trade.pnl ?? null,
    rrTarget,
    rrAchieved,
    (setup?.phase ?? null) as number | null,
    snapshot,
    opts.notes ?? (trade.notes as string | null) ?? null,
    opts.tags ?? null
  ).run();

  return result.meta.last_row_id as number;
}

async function computeDashboardMetrics(
  env: Env,
  userId: string
): Promise<{
  total_pnl: number;
  best_day: number;
  consistency_pct: number;
  consistency_limit: number | null;
  drawdown_used: number;
  drawdown_limit: number;
  drawdown_pct: number;
  safety_net_reached: boolean;
  account_type: string;
} | null> {
  const account = await env.DB.prepare(
    'SELECT * FROM alpha_accounts WHERE user_id = ? AND is_active = 1 LIMIT 1'
  ).bind(userId).first<Record<string, unknown>>();
  if (!account) return null;

  const { results: rows } = await env.DB.prepare(
    'SELECT * FROM alpha_daily_pnl WHERE alpha_account_id = ? ORDER BY date ASC'
  ).bind(account.id).all<Record<string, unknown>>();

  const totalPnl = rows.reduce((s, r) => s + (r.pnl as number), 0);
  const bestDay = rows.length ? Math.max(...rows.map(r => r.pnl as number)) : 0;

  // Consistency (40% for Standard/Zero, none for Advanced)
  const accountType = account.account_type as string;
  const consistencyLimit = accountType === 'advanced' ? null : 40;
  const profitDays = rows.filter(r => (r.pnl as number) > 0);
  const totalProfit = profitDays.reduce((s, r) => s + (r.pnl as number), 0);
  let consistencyPct = 100;
  if (consistencyLimit !== null && totalProfit > 0 && profitDays.length > 0) {
    const maxDayPct = Math.max(...profitDays.map(r => ((r.pnl as number) / totalProfit) * 100));
    consistencyPct = Math.round(100 - Math.max(0, maxDayPct - consistencyLimit));
  }

  // MLL: 4% for Standard/Zero, 3.5% for Advanced
  const mllRate = accountType === 'advanced' ? 0.035 : 0.04;
  const mll = (account.account_size as number) * mllRate;
  let drawdownUsed = 0;
  if (account.drawdown_type === 'trailing') {
    let peak = account.account_size as number;
    let running = peak;
    for (const r of rows) {
      running += r.pnl as number;
      if (running > peak) peak = running;
    }
    drawdownUsed = peak - running;
  } else {
    const losses = rows.filter(r => (r.pnl as number) < 0);
    drawdownUsed = Math.abs(losses.reduce((s, r) => s + (r.pnl as number), 0));
  }

  const drawdownPct = mll > 0 ? (drawdownUsed / mll) * 100 : 0;
  const safetyNetReached = totalPnl >= mll;

  return {
    total_pnl: Math.round(totalPnl * 100) / 100,
    best_day: Math.round(bestDay * 100) / 100,
    consistency_pct: consistencyPct,
    consistency_limit: consistencyLimit,
    drawdown_used: Math.round(drawdownUsed * 100) / 100,
    drawdown_limit: mll,
    drawdown_pct: drawdownPct,
    safety_net_reached: safetyNetReached,
    account_type: accountType,
  };
}

export async function handleApiRoutes(
  request: Request,
  env: Env,
  path: string,
  url: URL,
  user: JwtPayload
): Promise<Response> {
  const method = request.method;

  // ── Backwards-compatible redirects: /api/apex/* → /api/alpha/* ──
  if (path.startsWith('/api/apex/')) {
    const newUrl = new URL(url.toString());
    newUrl.pathname = path.replace('/api/apex/', '/api/alpha/');
    return Response.redirect(newUrl.toString(), 302);
  }

  // GET /api/instruments
  if (path === '/api/instruments' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM instruments').all();
    return json(results);
  }

  // GET /api/alpha/accounts
  if (path === '/api/alpha/accounts' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM alpha_accounts WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.sub).all();
    return json(results);
  }

  // POST /api/alpha/accounts
  if (path === '/api/alpha/accounts' && method === 'POST') {
    const body = await request.json<Record<string, unknown>>();

    let accountSize = body.account_size as number;
    let drawdownLimit = body.drawdown_limit as number;
    let profitTarget = body.profit_target as number;
    let maxContracts = body.max_contracts as number;
    let scalingLimit = body.scaling_limit as number;

    // If template_id provided, load template and use its values as defaults
    if (body.template_id) {
      const tpl = await env.DB.prepare(
        'SELECT * FROM alpha_account_templates WHERE id = ?'
      ).bind(body.template_id).first<Record<string, unknown>>();
      if (!tpl) return json({ error: 'Template not found' }, 404);
      accountSize = (body.account_size as number) || (tpl.account_size as number);
      drawdownLimit = (body.drawdown_limit as number) || (tpl.drawdown_limit as number);
      profitTarget = (body.profit_target as number) || (tpl.profit_target as number);
      maxContracts = (body.max_contracts as number) || (tpl.max_contracts as number);
      scalingLimit = (body.scaling_limit as number) || (tpl.scaling_limit as number);
    }

    const result = await env.DB.prepare(
      `INSERT INTO alpha_accounts (user_id, label, account_size, account_type, drawdown_type, drawdown_limit, profit_target, max_contracts, scaling_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.sub, body.label, accountSize, body.account_type,
      body.drawdown_type, drawdownLimit, profitTarget,
      maxContracts, scalingLimit
    ).run();
    return json({ id: result.meta.last_row_id }, 201);
  }

  // PUT /api/alpha/accounts/:id
  const alphaAccountMatch = path.match(/^\/api\/alpha\/accounts\/(\d+)$/);
  if (alphaAccountMatch && method === 'PUT') {
    const id = alphaAccountMatch[1];
    const body = await request.json<Record<string, unknown>>();
    await env.DB.prepare(
      `UPDATE alpha_accounts SET label = ?, account_size = ?, account_type = ?, drawdown_type = ?,
       drawdown_limit = ?, profit_target = ?, max_contracts = ?, scaling_limit = ?, is_active = ?
       WHERE id = ? AND user_id = ?`
    ).bind(
      body.label, body.account_size, body.account_type, body.drawdown_type,
      body.drawdown_limit, body.profit_target, body.max_contracts,
      body.scaling_limit, body.is_active ?? 1, id, user.sub
    ).run();
    return json({ ok: true });
  }

  // GET /api/alpha/:id/daily-pnl
  const dailyPnlMatch = path.match(/^\/api\/alpha\/(\d+)\/daily-pnl$/);
  if (dailyPnlMatch && method === 'GET') {
    const accountId = dailyPnlMatch[1];
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const { results } = await env.DB.prepare(
      `SELECT * FROM alpha_daily_pnl WHERE alpha_account_id = ?
       ORDER BY date DESC LIMIT ?`
    ).bind(accountId, days).all();
    return json(results);
  }

  // POST /api/alpha/:id/daily-pnl (upsert)
  if (dailyPnlMatch && method === 'POST') {
    const accountId = dailyPnlMatch[1];
    const body = await request.json<Record<string, unknown>>();
    await env.DB.prepare(
      `INSERT INTO alpha_daily_pnl (alpha_account_id, date, pnl, trades_count, best_trade, worst_trade, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(alpha_account_id, date) DO UPDATE SET
       pnl = excluded.pnl, trades_count = excluded.trades_count,
       best_trade = excluded.best_trade, worst_trade = excluded.worst_trade, notes = excluded.notes`
    ).bind(
      accountId, body.date, body.pnl, body.trades_count ?? 0,
      body.best_trade, body.worst_trade, body.notes ?? null
    ).run();
    return json({ ok: true });
  }

  // GET /api/alpha/:id/dashboard
  const dashMatch = path.match(/^\/api\/alpha\/(\d+)\/dashboard$/);
  if (dashMatch && method === 'GET') {
    const accountId = dashMatch[1];

    // Get account info
    const account = await env.DB.prepare(
      'SELECT * FROM alpha_accounts WHERE id = ? AND user_id = ?'
    ).bind(accountId, user.sub).first<Record<string, unknown>>();
    if (!account) return json({ error: 'Account not found' }, 404);

    const accountSize = account.account_size as number;
    const accountType = account.account_type as string; // 'zero', 'standard', 'advanced'

    // Get all daily PnL rows
    const { results: rows } = await env.DB.prepare(
      'SELECT * FROM alpha_daily_pnl WHERE alpha_account_id = ? ORDER BY date ASC'
    ).bind(accountId).all<Record<string, unknown>>();

    const totalPnl = rows.reduce((s, r) => s + (r.pnl as number), 0);
    const balance = accountSize + totalPnl;
    const bestDay = rows.length ? Math.max(...rows.map(r => r.pnl as number)) : 0;

    // Consistency: 40% rule for Standard/Zero, none for Advanced
    const consistencyLimit = accountType === 'advanced' ? null : 40;
    const consistencyApplies = accountType !== 'advanced';
    const profitDays = rows.filter(r => (r.pnl as number) > 0);
    const totalProfit = profitDays.reduce((s, r) => s + (r.pnl as number), 0);
    let consistencyPct = 100;
    if (consistencyLimit !== null && totalProfit > 0 && profitDays.length > 0) {
      const maxDayPct = Math.max(...profitDays.map(r => ((r.pnl as number) / totalProfit) * 100));
      consistencyPct = Math.round(100 - Math.max(0, maxDayPct - consistencyLimit));
    }

    // MLL (Maximum Loss Limit): 4% for Standard/Zero, 3.5% for Advanced — calculated on EOD balance
    const mllRate = accountType === 'advanced' ? 0.035 : 0.04;
    const mll = accountSize * mllRate;
    let drawdownUsed = 0;
    if (account.drawdown_type === 'trailing') {
      let peak = accountSize;
      let running = peak;
      for (const r of rows) {
        running += r.pnl as number;
        if (running > peak) peak = running;
      }
      drawdownUsed = peak - running;
    } else {
      // EOD or static: simple sum of losses
      const losses = rows.filter(r => (r.pnl as number) < 0);
      drawdownUsed = Math.abs(losses.reduce((s, r) => s + (r.pnl as number), 0));
    }

    const safetyNet = mll - drawdownUsed;

    // Daily Loss Guard: 2% of account size
    const dailyLossGuard = accountSize * 0.02;
    const todayET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const etDate = new Date(todayET);
    const todayStr = `${etDate.getFullYear()}-${String(etDate.getMonth() + 1).padStart(2, '0')}-${String(etDate.getDate()).padStart(2, '0')}`;
    const todayRow = rows.find(r => r.date === todayStr);
    const todayPnl = todayRow ? (todayRow.pnl as number) : 0;
    const dlgRemaining = dailyLossGuard - Math.abs(Math.min(todayPnl, 0));
    const dlgHit = todayPnl < 0 && Math.abs(todayPnl) >= dailyLossGuard;

    // Win rate & profit factor
    const winDays = rows.filter(r => (r.pnl as number) > 0).length;
    const winRate = rows.length ? Math.round((winDays / rows.length) * 100) : 0;
    const totalLoss = Math.abs(rows.filter(r => (r.pnl as number) < 0).reduce((s, r) => s + (r.pnl as number), 0));
    const profitFactor = totalLoss > 0 ? Math.round((totalProfit / totalLoss) * 100) / 100 : totalProfit > 0 ? Infinity : 0;

    // Worst day
    const worstDay = rows.length ? Math.min(...rows.map(r => r.pnl as number)) : 0;

    // Profit target: 6% for Standard/Zero, 8% for Advanced
    const profitTargetPct = accountType === 'advanced' ? 0.08 : 0.06;
    const profitTarget = accountSize * profitTargetPct;

    // Winning days count (days with pnl >= $200) — used for Zero/Advanced payout cadence
    // Count since last payout (or all time if no payouts)
    const winningDaysCount = rows.filter(r => (r.pnl as number) >= 200).length;

    // Payout rules per account type
    let profitSplitPct: number;
    let maxPayout: number;
    const payoutCount = 0; // TODO: track actual payout count from DB

    if (accountType === 'standard') {
      // Standard: tiered profit split 70% → 80% → 90%
      if (payoutCount >= 4) profitSplitPct = 90;
      else if (payoutCount >= 2) profitSplitPct = 80;
      else profitSplitPct = 70;
      maxPayout = 15000;
    } else if (accountType === 'zero') {
      // Zero: 90% from day 1
      profitSplitPct = 90;
      maxPayout = accountSize >= 100000 ? 2500 : 1500;
    } else {
      // Advanced: 90% split
      profitSplitPct = 90;
      maxPayout = 15000;
    }

    // Payout eligibility blockers
    const blockers: string[] = [];
    if (totalPnl < profitTarget) blockers.push(`Need $${(profitTarget - totalPnl).toFixed(2)} more profit (${(profitTargetPct * 100).toFixed(0)}% target)`);

    if (accountType === 'standard') {
      // Standard: bi-weekly (every 14 days from first trade)
      if (rows.length < 14) blockers.push(`Need ${14 - rows.length} more trading days (bi-weekly payout)`);
      if (consistencyApplies && consistencyPct < 60) blockers.push('Consistency below required threshold (40% rule)');
      if (totalPnl < 200) blockers.push('Minimum payout is $200');
    } else if (accountType === 'zero') {
      // Zero: every 5 winning days ($200+ each)
      if (winningDaysCount < 5) blockers.push(`Need ${5 - winningDaysCount} more winning days ($200+ each)`);
      if (consistencyApplies && consistencyPct < 60) blockers.push('Consistency below required threshold (40% rule)');
      if (totalPnl < 200) blockers.push('Minimum payout is $200');
    } else {
      // Advanced: every 5 winning days ($200+ each), NO consistency
      if (winningDaysCount < 5) blockers.push(`Need ${5 - winningDaysCount} more winning days ($200+ each)`);
      if (totalPnl < 1000) blockers.push('Minimum payout is $1,000');
    }

    if (safetyNet < 0) blockers.push('MLL (Maximum Loss Limit) exceeded');
    const payoutEligible = blockers.length === 0;

    // Payout checks
    const gripReached = totalPnl >= profitTarget;
    const consistencyPass = !consistencyApplies || consistencyPct >= 60;
    const minPayoutMet = accountType === 'advanced' ? totalPnl >= 1000 : totalPnl >= 200;

    return json({
      balance: Math.round(balance * 100) / 100,
      total_pnl: Math.round(totalPnl * 100) / 100,
      best_day: Math.round(bestDay * 100) / 100,
      worst_day: Math.round(worstDay * 100) / 100,
      consistency_pct: consistencyPct,
      consistency_limit: consistencyLimit,
      consistency_applies: consistencyApplies,
      drawdown_used: Math.round(drawdownUsed * 100) / 100,
      drawdown_limit: Math.round(mll * 100) / 100,
      safety_net: Math.round(safetyNet * 100) / 100,
      profit_target: Math.round(profitTarget * 100) / 100,
      daily_loss_guard: Math.round(dailyLossGuard * 100) / 100,
      daily_loss_guard_remaining: Math.round(dlgRemaining * 100) / 100,
      daily_loss_guard_hit: dlgHit,
      profit_split_pct: profitSplitPct,
      winning_days_count: winningDaysCount,
      max_payout: maxPayout,
      win_rate: winRate,
      profit_factor: profitFactor,
      trading_days: rows.length,
      daily_pnl: rows.map(r => ({ date: r.date, pnl: r.pnl })),
      payout_eligible: payoutEligible,
      blockers,
      payout_checks: {
        consistency: consistencyPass,
        grip: gripReached,
        min_payout: minPayoutMet,
      },
    });
  }

  // POST /api/trade-log
  if (path === '/api/trade-log' && method === 'POST') {
    const body = await request.json<Record<string, unknown>>();
    const result = await env.DB.prepare(
      `INSERT INTO trade_log (user_id, instrument_id, setup_id, date, direction, contracts, entry_price, exit_price, pnl, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.sub, body.instrument_id, body.setup_id ?? null, body.date,
      body.direction, body.contracts ?? 1, body.entry_price,
      body.exit_price, body.pnl, body.notes ?? null
    ).run();
    const tradeLogId = result.meta.last_row_id as number;
    let journalId: number | null = null;
    try {
      journalId = await createJournalFromTradeLog(env, user.sub, tradeLogId);
    } catch (e) {
      console.error('journal auto-create failed', e);
    }
    return json({ id: tradeLogId, journal_id: journalId }, 201);
  }

  // GET /api/trade-log
  if (path === '/api/trade-log' && method === 'GET') {
    const date = url.searchParams.get('date');
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    if (date) {
      const { results } = await env.DB.prepare(
        `SELECT tl.*, i.symbol FROM trade_log tl
         LEFT JOIN instruments i ON tl.instrument_id = i.id
         WHERE tl.user_id = ? AND tl.date = ? ORDER BY tl.created_at DESC`
      ).bind(user.sub, date).all();
      return json(results);
    }
    const { results } = await env.DB.prepare(
      `SELECT tl.*, i.symbol FROM trade_log tl
       LEFT JOIN instruments i ON tl.instrument_id = i.id
       WHERE tl.user_id = ? ORDER BY tl.date DESC, tl.created_at DESC LIMIT ?`
    ).bind(user.sub, days).all();
    return json(results);
  }

  // GET /api/alerts/active
  if (path === '/api/alerts/active' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT sa.*, i.symbol FROM setup_alerts sa
       LEFT JOIN instruments i ON sa.instrument_id = i.id
       WHERE sa.is_active = 1 ORDER BY sa.created_at DESC`
    ).all();
    return json(results);
  }

  // POST /api/alerts
  if (path === '/api/alerts' && method === 'POST') {
    const body = await request.json<Record<string, unknown>>();
    const result = await env.DB.prepare(
      `INSERT INTO setup_alerts (setup_id, instrument_id, alert_type, phase, message, sweep_direction, sweep_level,
       fvg_high, fvg_low, ifvg_high, ifvg_low, entry_price, target_price, stop_price, risk_reward)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.setup_id ?? null, body.instrument_id, body.alert_type, body.phase ?? null,
      body.message ?? null, body.sweep_direction ?? null, body.sweep_level ?? null,
      body.fvg_high ?? null, body.fvg_low ?? null, body.ifvg_high ?? null, body.ifvg_low ?? null,
      body.entry_price ?? null, body.target_price ?? null, body.stop_price ?? null,
      body.risk_reward ?? null
    ).run();
    return json({ id: result.meta.last_row_id }, 201);
  }

  // PUT /api/alerts/:id/dismiss
  const dismissMatch = path.match(/^\/api\/alerts\/(\d+)\/dismiss$/);
  if (dismissMatch && method === 'PUT') {
    const id = dismissMatch[1];
    await env.DB.prepare(
      'UPDATE setup_alerts SET is_active = 0 WHERE id = ?'
    ).bind(id).run();
    return json({ ok: true });
  }

  // POST /api/alerts/demo
  if (path === '/api/alerts/demo' && method === 'POST') {
    const result = await env.DB.prepare(
      `INSERT INTO setup_alerts (instrument_id, alert_type, phase, message, sweep_direction, sweep_level,
       fvg_high, fvg_low, entry_price, target_price, stop_price, risk_reward)
       VALUES (2, 'ready', 4, 'NQ Setup: London high swept, BOS confirmed, FVG formed on 5m, waiting for entry',
       'high', 21850.00, 21835.00, 21820.00, 21830.00, 21870.00, 21810.00, 3.0)`
    ).run();
    return json({ id: result.meta.last_row_id, message: 'Demo NQ alert created' }, 201);
  }

  // POST /api/analyze/alert/:alertId
  const analyzeAlertMatch = path.match(/^\/api\/analyze\/alert\/(\d+)$/);
  if (analyzeAlertMatch && method === 'POST') {
    const alertId = analyzeAlertMatch[1];
    const alert = await env.DB.prepare(
      `SELECT sa.*, i.symbol, i.name, i.tick_size, i.tick_value
       FROM setup_alerts sa LEFT JOIN instruments i ON sa.instrument_id = i.id
       WHERE sa.id = ?`
    ).bind(alertId).first<Record<string, unknown>>();
    if (!alert) return json({ error: 'Alert not found' }, 404);

    const metrics = await computeDashboardMetrics(env, user.sub);

    // Get BOS context from setup metadata
    let bosContext = '';
    if (alert.setup_id) {
      const setupRow = await env.DB.prepare('SELECT metadata_json FROM setups WHERE id = ?').bind(alert.setup_id).first<{ metadata_json: string | null }>();
      if (setupRow?.metadata_json) {
        try {
          const meta = JSON.parse(setupRow.metadata_json);
          if (meta.bos_level) {
            const bosDir = alert.sweep_direction === 'low' ? 'bullish' : 'bearish';
            bosContext = `\nBreak of Structure: Confirmed at ${meta.bos_level} — market structure shifted ${bosDir}`;
          }
        } catch { /* ignore */ }
      }
    }

    const systemPrompt = 'You are an ICT (Inner Circle Trader) strategy analyst. You analyze futures trading setups using ICT methodology — fair value gaps, inverse fair value gaps, liquidity sweeps, and London/NY session levels. Respond ONLY with valid JSON, no markdown, no backticks, no explanation outside the JSON.';
    const userPrompt = `Analyze this trading setup:
Instrument: ${alert.symbol} (${alert.name})
Tick Size: ${alert.tick_size}, Tick Value: $${alert.tick_value}
Session Levels:
London High: ${alert.sweep_direction === 'low' ? alert.target_price : alert.sweep_level}
London Low: ${alert.sweep_direction === 'high' ? alert.target_price : alert.sweep_level}
Setup:
Sweep: Price broke London ${alert.sweep_direction} at ${alert.sweep_level}${bosContext}
Fair Value Gap: ${alert.fvg_low} - ${alert.fvg_high}
Inverse FVG: ${alert.ifvg_low && alert.ifvg_high ? alert.ifvg_low + ' - ' + alert.ifvg_high : 'none'}
Proposed Entry: ${alert.entry_price}
Target: ${alert.target_price}
Stop: ${alert.stop_price}
Risk/Reward: ${alert.risk_reward}
${metrics ? `Trader's Alpha Futures Account Status:
Total P&L: $${metrics.total_pnl}
Best Single Day: $${metrics.best_day} (${metrics.consistency_pct}% of total — limit is ${metrics.consistency_limit}%)
Drawdown Used: $${metrics.drawdown_used} of $${metrics.drawdown_limit} (${metrics.drawdown_pct.toFixed(1)}%)
Safety Net: ${metrics.safety_net_reached ? 'reached' : 'not reached'}` : 'Trader has no active Alpha Futures account'}
Respond in this exact JSON format:
{
"confidence": 0-100,
"signal": "ACCORD" or "BASE NOTE" or "HEART NOTE" or "TOP NOTE" or "NO TRADE",
"fragrance": "Prestige Silver" for confidence>=75, "Armani Stronger With You" for 50-74, "YSL Y" for <50,
"summary": "2-3 sentence analysis of setup quality and market context",
"entry_price": number,
"target_price": number,
"stop_price": number,
"risk_reward": number,
"warnings": ["array of 2-4 things to watch or risks"],
"consistency_check": "one sentence about how this trade impacts Alpha Futures consistency rule",
"contracts_suggestion": "recommended position size given drawdown remaining"
}`;

    try {
      const analysis = await callHaiku(env, systemPrompt, userPrompt);
      return json(analysis);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: 'Analysis failed', raw: message }, 500);
    }
  }

  // POST /api/analyze/demo
  if (path === '/api/analyze/demo' && method === 'POST') {
    const result = await env.DB.prepare(
      `INSERT INTO setup_alerts (instrument_id, alert_type, phase, message, sweep_direction, sweep_level,
       fvg_high, fvg_low, entry_price, target_price, stop_price, risk_reward)
       VALUES (2, 'ready', 4, 'NQ Setup: London high swept, BOS confirmed, FVG formed on 5m, waiting for entry',
       'high', 21850.00, 21835.00, 21820.00, 21830.00, 21870.00, 21810.00, 3.0)`
    ).run();
    const newId = result.meta.last_row_id;

    const alert = await env.DB.prepare(
      `SELECT sa.*, i.symbol, i.name, i.tick_size, i.tick_value
       FROM setup_alerts sa LEFT JOIN instruments i ON sa.instrument_id = i.id
       WHERE sa.id = ?`
    ).bind(newId).first<Record<string, unknown>>();

    const metrics = await computeDashboardMetrics(env, user.sub);

    const systemPrompt = 'You are an ICT (Inner Circle Trader) strategy analyst. You analyze futures trading setups using ICT methodology — fair value gaps, inverse fair value gaps, liquidity sweeps, and London/NY session levels. Respond ONLY with valid JSON, no markdown, no backticks, no explanation outside the JSON.';
    const userPrompt = `Analyze this trading setup:
Instrument: ${alert!.symbol} (${alert!.name})
Tick Size: ${alert!.tick_size}, Tick Value: $${alert!.tick_value}
Session Levels:
London High: ${alert!.sweep_direction === 'low' ? alert!.target_price : alert!.sweep_level}
London Low: ${alert!.sweep_direction === 'high' ? alert!.target_price : alert!.sweep_level}
Setup:
Sweep: Price broke London ${alert!.sweep_direction} at ${alert!.sweep_level}
Fair Value Gap: ${alert!.fvg_low} - ${alert!.fvg_high}
Inverse FVG: ${alert!.ifvg_low && alert!.ifvg_high ? alert!.ifvg_low + ' - ' + alert!.ifvg_high : 'none'}
Proposed Entry: ${alert!.entry_price}
Target: ${alert!.target_price}
Stop: ${alert!.stop_price}
Risk/Reward: ${alert!.risk_reward}
${metrics ? `Trader's Alpha Futures Account Status:
Total P&L: $${metrics.total_pnl}
Best Single Day: $${metrics.best_day} (${metrics.consistency_pct}% of total — limit is ${metrics.consistency_limit}%)
Drawdown Used: $${metrics.drawdown_used} of $${metrics.drawdown_limit} (${metrics.drawdown_pct.toFixed(1)}%)
Safety Net: ${metrics.safety_net_reached ? 'reached' : 'not reached'}` : 'Trader has no active Alpha Futures account'}
Respond in this exact JSON format:
{
"confidence": 0-100,
"signal": "ACCORD" or "BASE NOTE" or "HEART NOTE" or "TOP NOTE" or "NO TRADE",
"fragrance": "Prestige Silver" for confidence>=75, "Armani Stronger With You" for 50-74, "YSL Y" for <50,
"summary": "2-3 sentence analysis of setup quality and market context",
"entry_price": number,
"target_price": number,
"stop_price": number,
"risk_reward": number,
"warnings": ["array of 2-4 things to watch or risks"],
"consistency_check": "one sentence about how this trade impacts Alpha Futures consistency rule",
"contracts_suggestion": "recommended position size given drawdown remaining"
}`;

    try {
      const analysis = await callHaiku(env, systemPrompt, userPrompt);
      return json({ alert, analysis });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ alert, analysis_error: message });
    }
  }

  // POST /api/analyze/:setupId
  const analyzeSetupMatch = path.match(/^\/api\/analyze\/(\d+)$/);
  if (analyzeSetupMatch && method === 'POST') {
    const setupId = analyzeSetupMatch[1];
    const alert = await env.DB.prepare(
      `SELECT sa.*, i.symbol, i.name, i.tick_size, i.tick_value
       FROM setup_alerts sa LEFT JOIN instruments i ON sa.instrument_id = i.id
       WHERE sa.setup_id = ? ORDER BY sa.created_at DESC LIMIT 1`
    ).bind(setupId).first<Record<string, unknown>>();
    if (!alert) return json({ error: 'No alert found for this setup' }, 404);

    const metrics = await computeDashboardMetrics(env, user.sub);

    // Get BOS context from setup metadata
    let bosCtx = '';
    const setupMeta = await env.DB.prepare('SELECT metadata_json FROM setups WHERE id = ?').bind(setupId).first<{ metadata_json: string | null }>();
    if (setupMeta?.metadata_json) {
      try {
        const meta = JSON.parse(setupMeta.metadata_json);
        if (meta.bos_level) {
          const bosDir = alert.sweep_direction === 'low' ? 'bullish' : 'bearish';
          bosCtx = `\nBreak of Structure: Confirmed at ${meta.bos_level} — market structure shifted ${bosDir}`;
        }
      } catch { /* ignore */ }
    }

    const systemPrompt = 'You are an ICT (Inner Circle Trader) strategy analyst. You analyze futures trading setups using ICT methodology — fair value gaps, inverse fair value gaps, liquidity sweeps, and London/NY session levels. Respond ONLY with valid JSON, no markdown, no backticks, no explanation outside the JSON.';
    const userPrompt = `Analyze this trading setup:
Instrument: ${alert.symbol} (${alert.name})
Tick Size: ${alert.tick_size}, Tick Value: $${alert.tick_value}
Session Levels:
London High: ${alert.sweep_direction === 'low' ? alert.target_price : alert.sweep_level}
London Low: ${alert.sweep_direction === 'high' ? alert.target_price : alert.sweep_level}
Setup:
Sweep: Price broke London ${alert.sweep_direction} at ${alert.sweep_level}${bosCtx}
Fair Value Gap: ${alert.fvg_low} - ${alert.fvg_high}
Inverse FVG: ${alert.ifvg_low && alert.ifvg_high ? alert.ifvg_low + ' - ' + alert.ifvg_high : 'none'}
Proposed Entry: ${alert.entry_price}
Target: ${alert.target_price}
Stop: ${alert.stop_price}
Risk/Reward: ${alert.risk_reward}
${metrics ? `Trader's Alpha Futures Account Status:
Total P&L: $${metrics.total_pnl}
Best Single Day: $${metrics.best_day} (${metrics.consistency_pct}% of total — limit is ${metrics.consistency_limit}%)
Drawdown Used: $${metrics.drawdown_used} of $${metrics.drawdown_limit} (${metrics.drawdown_pct.toFixed(1)}%)
Safety Net: ${metrics.safety_net_reached ? 'reached' : 'not reached'}` : 'Trader has no active Alpha Futures account'}
Respond in this exact JSON format:
{
"confidence": 0-100,
"signal": "ACCORD" or "BASE NOTE" or "HEART NOTE" or "TOP NOTE" or "NO TRADE",
"fragrance": "Prestige Silver" for confidence>=75, "Armani Stronger With You" for 50-74, "YSL Y" for <50,
"summary": "2-3 sentence analysis of setup quality and market context",
"entry_price": number,
"target_price": number,
"stop_price": number,
"risk_reward": number,
"warnings": ["array of 2-4 things to watch or risks"],
"consistency_check": "one sentence about how this trade impacts Alpha Futures consistency rule",
"contracts_suggestion": "recommended position size given drawdown remaining"
}`;

    try {
      const analysis = await callHaiku(env, systemPrompt, userPrompt);
      return json(analysis);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: 'Analysis failed', raw: message }, 500);
    }
  }

  // GET /api/candles/:symbol/:timeframe
  const candlesMatch = path.match(/^\/api\/candles\/([A-Z]+)\/(\w+)$/);
  if (candlesMatch && method === 'GET') {
    const symbol = candlesMatch[1];
    const timeframe = candlesMatch[2];
    const instrumentId = symbol === 'ES' ? 1 : symbol === 'NQ' ? 2 : null;
    if (!instrumentId) return json({ error: 'Unknown symbol' }, 400);
    const limit = parseInt(url.searchParams.get('limit') || '200', 10);
    const before = url.searchParams.get('before');
    let query = 'SELECT timestamp, open, high, low, close, volume FROM candles WHERE instrument_id = ? AND timeframe = ?';
    const binds: unknown[] = [instrumentId, timeframe];
    if (before) {
      query += ' AND timestamp < ?';
      binds.push(before);
    }
    query += ' ORDER BY timestamp DESC LIMIT ?';
    binds.push(limit);
    const stmt = env.DB.prepare(query);
    const { results } = await stmt.bind(...binds).all();
    return json({ symbol, timeframe, candles: results });
  }

  // GET /api/market/status
  if (path === '/api/market/status' && method === 'GET') {
    const { results: lastCandles } = await env.DB.prepare(
      `SELECT i.symbol, c.timeframe, MAX(c.timestamp) as last_timestamp
       FROM candles c JOIN instruments i ON c.instrument_id = i.id
       GROUP BY i.symbol, c.timeframe`
    ).all();
    const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM candles').first<{ total: number }>();
    const { results: sessions } = await env.DB.prepare(
      `SELECT s.*, i.symbol FROM sessions s JOIN instruments i ON s.instrument_id = i.id
       WHERE s.date = date('now') ORDER BY i.symbol`
    ).all();
    return json({
      last_candles: lastCandles,
      total_candles: countResult?.total ?? 0,
      sessions,
      status: 'ok',
    });
  }

  // GET /api/market/price
  if (path === '/api/market/price' && method === 'GET') {
    const prices: Record<string, { price: number; timestamp: string; change_pct: number }> = {};
    for (const [symbol, id] of [['ES', 1], ['NQ', 2]] as const) {
      const latest = await env.DB.prepare(
        `SELECT timestamp, close FROM candles WHERE instrument_id = ? AND timeframe = '1m' ORDER BY timestamp DESC LIMIT 1`
      ).bind(id).first<{ timestamp: string; close: number }>();
      if (!latest) continue;
      // Get today's first candle for change %
      const todayDate = latest.timestamp.substring(0, 10);
      const first = await env.DB.prepare(
        `SELECT open FROM candles WHERE instrument_id = ? AND timeframe = '1m' AND timestamp >= ? ORDER BY timestamp ASC LIMIT 1`
      ).bind(id, todayDate + 'T00:00:00').first<{ open: number }>();
      const changePct = first && first.open > 0 ? ((latest.close - first.open) / first.open) * 100 : 0;
      prices[symbol] = {
        price: latest.close,
        timestamp: latest.timestamp,
        change_pct: Math.round(changePct * 100) / 100,
      };
    }
    return json(prices);
  }

  // GET /api/sessions/today
  if (path === '/api/sessions/today' && method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT s.*, i.symbol FROM sessions s JOIN instruments i ON s.instrument_id = i.id
       WHERE s.date = date('now') ORDER BY i.symbol`
    ).all();
    return json(results);
  }

  // GET /api/sessions/:date
  const sessionsDateMatch = path.match(/^\/api\/sessions\/(\d{4}-\d{2}-\d{2})$/);
  if (sessionsDateMatch && method === 'GET') {
    const date = sessionsDateMatch[1];
    const { results } = await env.DB.prepare(
      `SELECT s.*, i.symbol FROM sessions s JOIN instruments i ON s.instrument_id = i.id
       WHERE s.date = ? ORDER BY i.symbol`
    ).bind(date).all();
    return json(results);
  }

  // GET /api/fvg/:symbol
  const fvgMatch = path.match(/^\/api\/fvg\/([A-Z]+)$/);
  if (fvgMatch && method === 'GET') {
    const symbol = fvgMatch[1];
    const instrumentId = symbol === 'ES' ? 1 : symbol === 'NQ' ? 2 : null;
    if (!instrumentId) return json({ error: 'Unknown symbol' }, 400);

    const status = url.searchParams.get('status') || 'active';
    const timeframe = url.searchParams.get('timeframe');
    const days = parseInt(url.searchParams.get('days') || '5', 10);
    const since = new Date(Date.now() - days * 86400000).toISOString();

    let query = 'SELECT * FROM fair_value_gaps WHERE instrument_id = ? AND created_at >= ?';
    const binds: unknown[] = [instrumentId, since];

    if (status !== 'all') {
      query += ' AND status = ?';
      binds.push(status);
    }
    if (timeframe) {
      query += ' AND timeframe = ?';
      binds.push(timeframe);
    }
    query += ' ORDER BY timestamp DESC';

    const { results } = await env.DB.prepare(query).bind(...binds).all();
    return json(results);
  }

  // GET /api/setups/active
  if (path === '/api/setups/active' && method === 'GET') {
    const todayET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const etDate = new Date(todayET);
    const todayStr = `${etDate.getFullYear()}-${String(etDate.getMonth() + 1).padStart(2, '0')}-${String(etDate.getDate()).padStart(2, '0')}`;

    const { results: setups } = await env.DB.prepare(
      `SELECT s.*, i.symbol FROM setups s
       JOIN instruments i ON s.instrument_id = i.id
       WHERE s.date = ? AND s.status IN ('forming', 'ready')
       ORDER BY s.created_at DESC`
    ).bind(todayStr).all();

    // Enrich with FVG, IFVG, alerts, and session data
    const enriched = [];
    for (const setup of setups) {
      const fvg = (setup as Record<string, unknown>).fvg_id
        ? await env.DB.prepare('SELECT * FROM fair_value_gaps WHERE id = ?')
            .bind((setup as Record<string, unknown>).fvg_id).first()
        : null;
      const ifvg = (setup as Record<string, unknown>).ifvg_id
        ? await env.DB.prepare('SELECT * FROM fair_value_gaps WHERE id = ?')
            .bind((setup as Record<string, unknown>).ifvg_id).first()
        : null;
      const { results: alerts } = await env.DB.prepare(
        'SELECT * FROM setup_alerts WHERE setup_id = ? ORDER BY created_at DESC'
      ).bind((setup as Record<string, unknown>).id).all();

      // Parse metadata_json for BOS data
      let metadata = null;
      const metaStr = (setup as Record<string, unknown>).metadata_json;
      if (metaStr && typeof metaStr === 'string') {
        try { metadata = JSON.parse(metaStr); } catch { /* ignore */ }
      }

      enriched.push({ ...setup, fvg_data: fvg, ifvg_data: ifvg, alerts, metadata });
    }

    // Get today's session levels
    const { results: sessions } = await env.DB.prepare(
      `SELECT s.*, i.symbol FROM sessions s JOIN instruments i ON s.instrument_id = i.id
       WHERE s.date = ? ORDER BY i.symbol`
    ).bind(todayStr).all();

    return json({ setups: enriched, sessions });
  }

  // GET /api/setups/history
  if (path === '/api/setups/history' && method === 'GET') {
    const days = parseInt(url.searchParams.get('days') || '14', 10);
    const since = new Date(Date.now() - days * 86400000).toISOString().substring(0, 10);
    const { results } = await env.DB.prepare(
      `SELECT s.*, i.symbol FROM setups s
       JOIN instruments i ON s.instrument_id = i.id
       WHERE s.date >= ? ORDER BY s.date DESC, s.created_at DESC`
    ).bind(since).all();
    return json(results);
  }

  // GET /api/stats/setups
  if (path === '/api/stats/setups' && method === 'GET') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().substring(0, 10);
    const { results: setups } = await env.DB.prepare(
      `SELECT s.*, i.symbol FROM setups s
       JOIN instruments i ON s.instrument_id = i.id
       WHERE s.status IN ('won', 'lost', 'expired', 'skipped') AND s.date >= ?
       ORDER BY s.date DESC`
    ).bind(thirtyDaysAgo).all<Record<string, unknown>>();

    const won = setups.filter(s => s.status === 'won').length;
    const lost = setups.filter(s => s.status === 'lost').length;
    const expired = setups.filter(s => s.status === 'expired').length;
    const skipped = setups.filter(s => s.status === 'skipped').length;
    const totalSetups = setups.length;
    const setupWinRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;

    // Avg R:R target for setups that reached phase 4
    const phase4Setups = setups.filter(s => (s.phase as number) >= 4 && s.risk_reward != null);
    const avgRrTarget = phase4Setups.length > 0
      ? Math.round((phase4Setups.reduce((sum, s) => sum + (s.risk_reward as number), 0) / phase4Setups.length) * 10) / 10
      : 0;

    // Avg R:R achieved for won setups from trade_log
    let avgRrAchieved = 0;
    const wonSetups = setups.filter(s => s.status === 'won');
    if (wonSetups.length > 0) {
      const wonIds = wonSetups.map(s => s.id);
      let totalAchievedRr = 0;
      let countAchieved = 0;
      for (const sid of wonIds) {
        const trade = await env.DB.prepare(
          'SELECT entry_price, exit_price, direction FROM trade_log WHERE setup_id = ? LIMIT 1'
        ).bind(sid).first<Record<string, unknown>>();
        if (trade && trade.entry_price && trade.exit_price) {
          const setup = wonSetups.find(s => s.id === sid);
          if (setup && setup.stop_price) {
            const risk = Math.abs((trade.entry_price as number) - (setup.stop_price as number));
            const reward = Math.abs((trade.exit_price as number) - (trade.entry_price as number));
            if (risk > 0) {
              totalAchievedRr += reward / risk;
              countAchieved++;
            }
          }
        }
      }
      avgRrAchieved = countAchieved > 0 ? Math.round((totalAchievedRr / countAchieved) * 10) / 10 : 0;
    }

    // Best instrument
    const esTrades = setups.filter(s => s.symbol === 'ES' && (s.status === 'won' || s.status === 'lost'));
    const nqTrades = setups.filter(s => s.symbol === 'NQ' && (s.status === 'won' || s.status === 'lost'));
    const esWinRate = esTrades.length > 0 ? Math.round((esTrades.filter(s => s.status === 'won').length / esTrades.length) * 100) : 0;
    const nqWinRate = nqTrades.length > 0 ? Math.round((nqTrades.filter(s => s.status === 'won').length / nqTrades.length) * 100) : 0;
    const bestInstrument = esWinRate > nqWinRate
      ? { symbol: 'ES', win_rate: esWinRate }
      : { symbol: 'NQ', win_rate: nqWinRate };

    // Best session based on sweep times
    const londonSetups = setups.filter(s => {
      const ts = s.sweep_time || s.created_at;
      if (!ts) return false;
      const h = new Date(ts as string).getUTCHours();
      return h >= 7 && h < 14; // London approx
    });
    const nySetups = setups.filter(s => {
      const ts = s.sweep_time || s.created_at;
      if (!ts) return false;
      const h = new Date(ts as string).getUTCHours();
      return h >= 14 && h < 21; // NY approx
    });
    const londonWins = londonSetups.filter(s => s.status === 'won').length;
    const nyWins = nySetups.filter(s => s.status === 'won').length;
    const londonWinPct = londonSetups.length > 0 ? Math.round((londonWins / londonSetups.length) * 100) : 0;
    const nyWinPct = nySetups.length > 0 ? Math.round((nyWins / nySetups.length) * 100) : 0;
    const bestSession = londonWinPct >= nyWinPct
      ? { session: 'London', win_rate: londonWinPct }
      : { session: 'NY', win_rate: nyWinPct };

    // Avg confidence
    const enteredSetups = setups.filter(s => s.confidence != null && (s.status === 'won' || s.status === 'lost'));
    const avgConfidence = enteredSetups.length > 0
      ? Math.round(enteredSetups.reduce((sum, s) => sum + (s.confidence as number), 0) / enteredSetups.length)
      : 0;

    // Current streak
    const ordered = setups.filter(s => s.status === 'won' || s.status === 'lost').sort((a, b) => {
      return (b.date as string).localeCompare(a.date as string);
    });
    let streak = 0;
    if (ordered.length > 0) {
      const firstStatus = ordered[0].status;
      for (const s of ordered) {
        if (s.status === firstStatus) streak++;
        else break;
      }
      if (firstStatus === 'lost') streak = -streak;
    }

    return json({
      total_setups: totalSetups,
      won,
      lost,
      expired,
      skipped,
      setup_win_rate: setupWinRate,
      avg_rr_target: avgRrTarget,
      avg_rr_achieved: avgRrAchieved,
      best_instrument: bestInstrument,
      best_session: bestSession,
      avg_confidence: avgConfidence,
      streak,
    });
  }

  // GET /api/engine/status
  if (path === '/api/engine/status' && method === 'GET') {
    const todayET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const etDate = new Date(todayET);
    const todayStr = `${etDate.getFullYear()}-${String(etDate.getMonth() + 1).padStart(2, '0')}-${String(etDate.getDate()).padStart(2, '0')}`;

    let lastRun: string | null = null;
    try {
      const meta = await env.DB.prepare("SELECT value FROM engine_meta WHERE key = 'last_run'").first<{ value: string }>();
      lastRun = meta?.value ?? null;
    } catch { /* table may not exist */ }

    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();

    const activeFvgs = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM fair_value_gaps WHERE status = 'active' AND created_at >= ?"
    ).bind(fiveDaysAgo).first<{ count: number }>();

    const respectedFvgs = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM fair_value_gaps WHERE status = 'respected' AND created_at >= ?"
    ).bind(fiveDaysAgo).first<{ count: number }>();

    const invertedFvgs = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM fair_value_gaps WHERE status = 'inverted' AND created_at >= ?"
    ).bind(fiveDaysAgo).first<{ count: number }>();

    const activeSetups = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM setups WHERE date = ? AND status IN ('forming', 'ready')"
    ).bind(todayStr).first<{ count: number }>();

    const activeAlerts = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM setup_alerts WHERE is_active = 1'
    ).first<{ count: number }>();

    const { results: sessions } = await env.DB.prepare(
      `SELECT s.*, i.symbol FROM sessions s JOIN instruments i ON s.instrument_id = i.id
       WHERE s.date = ? ORDER BY i.symbol`
    ).bind(todayStr).all();

    return json({
      last_run: lastRun,
      fvg_counts: {
        active: activeFvgs?.count ?? 0,
        respected: respectedFvgs?.count ?? 0,
        inverted: invertedFvgs?.count ?? 0,
      },
      active_setups: activeSetups?.count ?? 0,
      active_alerts: activeAlerts?.count ?? 0,
      sessions,
      today: todayStr,
    });
  }

  // GET /api/settings
  if (path === '/api/settings' && method === 'GET') {
    const settings = await getUserSettings(env, user.sub);
    return json(settings);
  }

  // PUT /api/settings
  if (path === '/api/settings' && method === 'PUT') {
    const body = await request.json<Record<string, unknown>>();
    const fields = [
      'discord_webhook_url', 'discord_enabled',
      'notify_sweep', 'notify_ready', 'notify_execute',
      'notify_drawdown', 'notify_consistency', 'notify_setup_result',
    ];

    // Build upsert
    const existing = await env.DB.prepare(
      'SELECT id FROM user_settings WHERE user_id = ?'
    ).bind(user.sub).first();

    if (existing) {
      const sets: string[] = ['updated_at = datetime(\'now\')'];
      const vals: unknown[] = [];
      for (const f of fields) {
        if (body[f] !== undefined) {
          sets.push(`${f} = ?`);
          vals.push(body[f]);
        }
      }
      if (vals.length > 0) {
        await env.DB.prepare(
          `UPDATE user_settings SET ${sets.join(', ')} WHERE user_id = ?`
        ).bind(...vals, user.sub).run();
      }
    } else {
      const cols = ['user_id'];
      const placeholders = ['?'];
      const vals: unknown[] = [user.sub];
      for (const f of fields) {
        if (body[f] !== undefined) {
          cols.push(f);
          placeholders.push('?');
          vals.push(body[f]);
        }
      }
      await env.DB.prepare(
        `INSERT INTO user_settings (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`
      ).bind(...vals).run();
    }

    const updated = await getUserSettings(env, user.sub);
    return json(updated);
  }

  // POST /api/settings/test-discord
  if (path === '/api/settings/test-discord' && method === 'POST') {
    const settings = await getUserSettings(env, user.sub);
    if (!settings.discord_webhook_url) {
      return json({ success: false, error: 'No webhook URL configured. Save a webhook URL first.' }, 400);
    }
    try {
      const sent = await sendTestNotification(settings.discord_webhook_url);
      return json({ success: sent, error: sent ? null : 'Webhook returned an error' });
    } catch (err) {
      return json({ success: false, error: String(err) }, 500);
    }
  }

  // POST /api/alpha/:id/compliance-check
  const complianceMatch = path.match(/^\/api\/alpha\/(\d+)\/compliance-check$/);
  if (complianceMatch && method === 'POST') {
    const accountId = parseInt(complianceMatch[1], 10);
    // Verify account belongs to user
    const acct = await env.DB.prepare(
      'SELECT id FROM alpha_accounts WHERE id = ? AND user_id = ?'
    ).bind(accountId, user.sub).first();
    if (!acct) return json({ error: 'Account not found' }, 404);

    try {
      const body = await request.json<TradeInput>();
      const result = await checkTradeCompliance(env, user.sub, accountId, body);
      return json(result);
    } catch (err) {
      return json({ error: String(err) }, 400);
    }
  }

  // POST /api/alpha/:id/quick-check
  const quickCheckMatch = path.match(/^\/api\/alpha\/(\d+)\/quick-check$/);
  if (quickCheckMatch && method === 'POST') {
    const accountId = parseInt(quickCheckMatch[1], 10);
    const acct = await env.DB.prepare(
      'SELECT id FROM alpha_accounts WHERE id = ? AND user_id = ?'
    ).bind(accountId, user.sub).first();
    if (!acct) return json({ error: 'Account not found' }, 404);

    try {
      const body = await request.json<QuickCheckInput>();
      const result = await quickTradeCheck(env, user.sub, accountId, body);
      return json(result);
    } catch (err) {
      return json({ error: String(err) }, 400);
    }
  }

  // GET /api/kb/articles
  if (path === '/api/kb/articles' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, category, slug, title, sort_order FROM kb_articles ORDER BY category, sort_order'
    ).all();
    return json(results);
  }

  // GET /api/kb/articles/:slug
  const kbSlugMatch = path.match(/^\/api\/kb\/articles\/([a-z0-9_-]+)$/);
  if (kbSlugMatch && method === 'GET') {
    const slug = kbSlugMatch[1];
    const row = await env.DB.prepare(
      'SELECT id, category, slug, title, content FROM kb_articles WHERE slug = ?'
    ).bind(slug).first();
    if (!row) return json({ error: 'Article not found' }, 404);
    return json(row);
  }

  // GET /api/kb/search?q=...
  if (path === '/api/kb/search' && method === 'GET') {
    const q = url.searchParams.get('q') || '';
    if (!q.trim()) return json([]);
    const like = `%${q}%`;
    const { results } = await env.DB.prepare(
      `SELECT id, category, slug, title, substr(content, 1, 200) as snippet
       FROM kb_articles WHERE title LIKE ? OR content LIKE ? ORDER BY sort_order LIMIT 20`
    ).bind(like, like).all();
    return json(results);
  }

  // POST /api/kb/seed
  if (path === '/api/kb/seed' && method === 'POST') {
    const articles = [
      {
        category: 'ICT Concepts', sort_order: 1, slug: 'fair-value-gap',
        title: 'Fair Value Gap (FVG)',
        content: `## What Is a Fair Value Gap?

A **Fair Value Gap** (FVG) is a three-candle price pattern where the middle candle moves so aggressively that the wicks of candle 1 and candle 3 fail to overlap. The gap zone — the space between candle 1's wick and candle 3's wick — represents an imbalance where one side of the market dominated.

## Bullish vs Bearish FVG

- **Bullish FVG** — forms during a strong up-move. The gap sits below the middle candle. Price often retraces down into this zone before continuing higher.
- **Bearish FVG** — forms during a strong down-move. The gap sits above the middle candle. Price often retraces up into this zone before continuing lower.

## How Mtrade Uses FVGs

Mtrade scans the **1H and 4H timeframes** for fair value gaps that align with the current phase of Matthew's strategy. Valid FVGs are drawn as **red zones** on the strategy chart, marking areas where a retrace entry is expected during Phase 3.

> **Tip:** Wider gaps tend to be stronger — they indicate more aggressive institutional activity and are more likely to act as reliable support or resistance on a retrace.`
      },
      {
        category: 'ICT Concepts', sort_order: 2, slug: 'inverse-fvg',
        title: 'Inverse Fair Value Gap (IFVG)',
        content: `## What Is an Inverse Fair Value Gap?

An **Inverse Fair Value Gap** (IFVG) is a previously valid FVG that has been violated — price traded through it, invalidating the original imbalance. When this happens, the zone flips its directional bias and becomes a continuation signal in the opposite direction.

## How the Flip Works

- A **bearish FVG** that gets violated (price closes above it) becomes a **bullish IFVG** — the zone now acts as support on a pullback.
- A **bullish FVG** that gets violated (price closes below it) becomes a **bearish IFVG** — the zone now acts as resistance on a rally.

## Role in Matthew's Strategy

IFVGs are a key signal during **Phase 4 (Continuation)**. After the initial move off the FVG retrace, price may pull back into an IFVG zone and bounce, confirming the trend is still alive. Mtrade draws IFVGs as **amber zones** on the strategy chart to distinguish them from active FVGs.

> **Tip:** IFVGs that form immediately after a liquidity sweep tend to be the most reliable — the sweep clears out weak hands and the IFVG confirms the new direction.`
      },
      {
        category: 'ICT Concepts', sort_order: 3, slug: 'london-sweep',
        title: 'London Session Liquidity Sweep',
        content: `## What Is a London Sweep?

The **London session** (2:00–5:00 AM ET) establishes the early trading range. A **liquidity sweep** occurs when price briefly pushes beyond the London high or low, triggering stop-loss orders clustered at those levels, before reversing. This is institutional activity — large players grabbing liquidity to fill their positions.

## Directional Signals

- **Low sweep** — price dips below the London low, sweeps buy-stops, then reverses upward. This is a **long setup** targeting the London high or higher.
- **High sweep** — price pushes above the London high, sweeps sell-stops, then reverses downward. This is a **short setup** targeting the London low or lower.

## How Mtrade Detects Sweeps

When Mtrade identifies a London session sweep, it fires a **TOP NOTE** signal — the earliest alert in the strategy progression. This marks Phase 1 of Matthew's playbook and puts the system on watch for a Break of Structure to follow.

> **Tip:** Sweeps that occur near the New York open (9:30 AM ET) carry extra weight — the additional volume from NY participants often accelerates the reversal move.`
      },
      {
        category: 'ICT Concepts', sort_order: 4, slug: 'power-of-3',
        title: 'Power of 3 (PO3)',
        content: `## What Is Power of 3?

**Power of 3** (PO3) is an ICT concept that describes how institutional price delivery unfolds in three distinct phases within a trading session: **Accumulation**, **Manipulation**, and **Distribution**.

## The Three Phases

- **Accumulation** — occurs during the Asia and early London sessions. Price consolidates in a tight range as institutions quietly build positions. This maps to **Phase 0** in Matthew's strategy.
- **Manipulation** — the fake move. Price sweeps beyond the range to grab liquidity and trap retail traders on the wrong side. This is the **liquidity sweep** — **Phase 1** in the playbook.
- **Distribution** — the real move. After the sweep, price reverses aggressively in the intended direction, delivering the actual institutional order flow. This maps to **Phases 2–5** (BOS through Entry).

## Why PO3 Matters

Understanding PO3 prevents you from chasing the manipulation move. When you see a tight Asia/London range get swept, you know the real move is about to begin — not end.

> **Tip:** A tighter London range often predicts a bigger manipulation move — institutions need to sweep further to generate enough liquidity when the range is compressed.`
      },
      {
        category: 'ICT Concepts', sort_order: 5, slug: 'market-structure',
        title: 'Market Structure Shift (MSS)',
        content: `## What Is a Market Structure Shift?

A **Market Structure Shift** (MSS) is the first confirmed break in the prevailing trend — the moment higher highs and higher lows shift to lower highs and lower lows (or vice versa). It signals that the balance of power between buyers and sellers has changed.

## How to Identify an MSS

- **Bullish MSS** — in a downtrend (series of lower highs), price breaks above the most recent lower high. This confirms buyers have taken control.
- **Bearish MSS** — in an uptrend (series of higher lows), price breaks below the most recent higher low. This confirms sellers have taken control.

## MSS in Matthew's Strategy

An MSS is the structural confirmation that follows a liquidity sweep. After the sweep (Phase 1), the Break of Structure in Phase 2 is essentially an MSS — it validates that the sweep was genuine and the reversal is underway. Without an MSS, the sweep may just be a deeper pullback within the existing trend.

> **Tip:** An MSS without a preceding liquidity sweep is usually just a pullback — not a true reversal. Always look for the sweep first to confirm institutional intent behind the shift.`
      },
      {
        category: "Matthew's Strategy", sort_order: 6, slug: 'the-playbook',
        title: "Matthew's ICT Playbook",
        content: `## The Six Phases

Matthew's strategy follows a strict six-phase progression. Every valid trade must complete all phases in order.

## Phase 0 — London Range (TOP NOTE)

Mtrade identifies the London session high and low between 2:00–5:00 AM ET. A **TOP NOTE** fires to confirm the range is locked in and the system is watching for a sweep.

## Phase 1 — Liquidity Sweep (TOP NOTE)

Price sweeps beyond the London high or low, grabbing stop-loss liquidity. A second **TOP NOTE** confirms the sweep direction — this sets the trade bias (long after low sweep, short after high sweep).

## Phase 2 — Break of Structure (HEART NOTE)

Price breaks a key structural level in the sweep direction, confirming the move is real. A **HEART NOTE** fires — the setup is now developing.

## Phase 3 — FVG Retrace (HEART NOTE)

Price retraces into a Fair Value Gap on the 1H or 4H chart. A second **HEART NOTE** confirms the retrace zone is valid for entry.

## Phase 4 — Continuation (BASE NOTE)

Price bounces off the FVG and resumes the trend direction. A **BASE NOTE** confirms the setup is mature and holding.

## Phase 5 — Entry (ACCORD)

All phases align. An **ACCORD** signal fires — this is the entry trigger. Enter in the sweep direction, target the opposite London level, and place your stop beyond the sweep wick.

> **Tip:** Skip the trade if Phase 1 sweep is shallow (less than 5 ticks beyond the range) — shallow sweeps often lack the institutional commitment needed for follow-through.`
      },
      {
        category: 'Mtrade Platform', sort_order: 7, slug: 'signal-vocabulary',
        title: 'Signal Names — The Cologne Code',
        content: `## Why Cologne Names?

Mtrade uses a fragrance-inspired naming system — the **Cologne Code** — to communicate signal strength and progression. The AI maps each phase's confidence level to a cologne that reflects its character.

## TOP NOTE — YSL Y (First Detection)

The **TOP NOTE** is the opening signal. Like a fragrance's top note — the first thing you notice — it marks the earliest phase of the setup. Fires during Phase 0 (range locked) and Phase 1 (sweep detected). Named after **YSL Y** for its sharp, immediate presence.

## HEART NOTE — Armani Stronger With You Intensely (Developing)

The **HEART NOTE** signals the setup is developing substance. Like a fragrance's heart — the core character that emerges after the opening fades — it fires during Phase 2 (BOS confirmed) and Phase 3 (FVG retrace). Named after **Armani SWYI** for its deep, evolving complexity.

## BASE NOTE — Prestige Silver (Confirmed)

The **BASE NOTE** signals the setup is confirmed and holding. Like a fragrance's base — the lasting foundation — it fires during Phase 4 (continuation). Named after **Prestige Silver** for its solid, enduring quality.

## ACCORD — All Aligned

The **ACCORD** is the final signal — all phases are complete and aligned. In perfumery, an accord is the harmonious blend of all notes. This is the entry trigger.

> **Tip:** Pay attention to how quickly signals progress from TOP NOTE to ACCORD — faster progressions often indicate stronger institutional conviction behind the move.`
      },
      {
        category: 'Mtrade Platform', sort_order: 8, slug: 'risk-vocabulary',
        title: 'Risk Terms — The FRS Code',
        content: `## The FRS Code

Mtrade uses the **FRS (Financial Risk System) Code** — an automotive-inspired vocabulary to describe risk metrics on your dashboard. Each term maps to a specific risk concept.

## REDLINE — Drawdown

**REDLINE** represents your current drawdown level — how close your account is to the maximum loss limit. Like a tachometer's redline, crossing it means the engine (your account) is done. Displayed as a percentage of your maximum allowed drawdown.

## REV LIMIT — Consistency Ceiling

**REV LIMIT** is your consistency rule ceiling — the maximum profit any single day can represent as a percentage of total profits. Exceeding it triggers a consistency violation. Only applies to Standard and Zero accounts.

## GRIP — Safety Net

**GRIP** is your safety net buffer — the distance between your current balance and the drawdown limit. More grip means more room to operate. When grip gets low, Mtrade warns you to reduce position size.

## BOOST — Profit Target

**BOOST** is your profit target for the current evaluation or payout cycle. Reaching boost means you have hit the required profit threshold.

## TACH — Dashboard Gauges

**TACH** refers to the visual gauges on the dashboard that display all risk metrics at a glance — drawdown, consistency, daily loss, and profit progress.

> **Tip:** Keep your GRIP above 50% of the REDLINE at all times — this gives you enough buffer to survive a normal losing streak without triggering the maximum loss limit.`
      },
      {
        category: 'Alpha Futures Rules', sort_order: 9, slug: 'alpha-consistency',
        title: 'Alpha Futures Consistency Rule',
        content: `## What Is the Consistency Rule?

The **consistency rule** ensures that no single trading day accounts for too large a share of your total profits. It prevents traders from passing evaluations on one lucky trade.

## Which Accounts Have It?

- **Standard accounts** — 40% consistency rule
- **Zero accounts** — 40% consistency rule
- **Advanced accounts** — no consistency rule

## How the Math Works

The formula is simple:

- **Best single day P&L ÷ Total net profit × 100 = Consistency %**
- If this percentage exceeds **40%**, you are out of compliance

For example, if your total profit is $2,000 and your best day was $900, your consistency is 900 / 2000 × 100 = **45%** — you need to keep trading to bring it down.

## Staying Compliant

- Trade consistently sized positions every day rather than swinging for one big win
- If one day runs hot, keep trading subsequent days to dilute that day's share
- Mtrade tracks this automatically and shows your current consistency percentage on the dashboard

## After Payout

The consistency calculation **resets after each payout**. Your new cycle starts fresh, so a strong first day in a new cycle can temporarily spike your consistency until you accumulate more trading days.

> **Tip:** Aim to keep every day below 20% of total profits — this gives you a comfortable buffer and avoids last-minute scrambling to dilute a big day.`
      },
      {
        category: 'Alpha Futures Rules', sort_order: 10, slug: 'alpha-drawdown',
        title: 'Alpha Futures Drawdown (MLL)',
        content: `## Maximum Loss Limit (MLL)

The **MLL** is the maximum amount your account can lose before it is terminated. Alpha Futures calculates this based on your **end-of-day balance**, not intraday equity.

## MLL by Account Type

- **Standard accounts** — 4% MLL on end-of-day balance
- **Zero accounts** — 4% MLL on end-of-day balance
- **Advanced accounts** — 3.5% MLL on end-of-day balance

## How It Works

At the end of each trading day, Alpha Futures records your closing balance. Your MLL threshold is set at the account's starting balance minus the MLL percentage. If your end-of-day balance drops to or below this threshold, the account is terminated.

## Daily Loss Guard

In addition to the overall MLL, there is a **2% Daily Loss Guard** across all account types. If you lose more than 2% of your starting balance in a single trading day, trading is halted for the rest of that day.

## The Safety Net Concept

Think of the MLL as a hard floor and the Daily Loss Guard as a speed bump. The daily guard prevents you from burning through your entire MLL in one bad session, giving you multiple days to recover from losses.

> **Tip:** Mtrade shows your GRIP (distance to MLL) in real-time on the dashboard — if GRIP drops below 50%, consider reducing your position size or sitting out until the next session.`
      },
      {
        category: 'Alpha Futures Rules', sort_order: 11, slug: 'alpha-payout',
        title: 'Alpha Futures Payout Requirements',
        content: `## Payout Structures by Account Type

Each Alpha Futures account type has different payout rules, frequencies, and profit splits.

## Standard Accounts

- **Frequency** — bi-weekly (every two weeks)
- **Profit split** — tiered: **70%** initially, increases to **80%** and then **90%** based on tenure and performance
- **Consistency rule** — 40% applies (no single day can exceed 40% of total profits)
- **Minimum payout** — $100
- **Maximum payout** — varies by account size

## Zero Accounts

- **Frequency** — weekly
- **Profit split** — **90%** from day one
- **Consistency rule** — 40% applies
- **Minimum payout** — $25
- **Maximum payout** — varies by account size

## Advanced Accounts

- **Frequency** — weekly
- **Profit split** — **90%** from day one
- **Consistency rule** — none
- **Minimum payout** — $25
- **Maximum payout** — varies by account size

## Key Differences

- **Zero** gives you weekly payouts with a high split but still requires consistency
- **Advanced** removes the consistency rule entirely — ideal for traders with an uneven edge
- **Standard** has the lowest starting split but offers progression over time

> **Tip:** If your strategy naturally produces uneven daily returns (e.g., you only trade 2-3 days per week), Advanced is likely your best fit since it has no consistency rule to worry about.`
      },
      {
        category: 'Platform Guide', sort_order: 12, slug: 'reading-dashboard',
        title: 'How to Read the Dashboard',
        content: `## Dashboard Overview

The Mtrade dashboard is your central command screen. Everything you need — price data, signals, risk metrics, and trade management — is visible in one place.

## Header Bar

The top bar shows the **MTRADE logo**, a **live UTC clock**, the **current session indicator** (London, Pre-Market, NY Open, NY PM, or Closed), and your **profile avatar** with a logout option.

## Live Price & TradingView Chart

The main chart area displays a **TradingView-powered chart** with the current instrument's live price. You can switch timeframes and overlay indicators directly on this chart.

## Strategy Chart

Below the main chart, the **strategy chart** shows Mtrade's proprietary overlays — **red zones** for FVGs, **amber zones** for IFVGs, sweep levels, and BOS markers. This is where the six-phase progression is visually tracked.

## Signal Progression

The signal panel displays the current **Cologne Code** progression — from TOP NOTE through ACCORD. Each signal lights up as its corresponding phase completes.

## AI Analysis

The **AI analysis section** provides a natural-language summary of the current setup, including phase status, confidence level, and key levels to watch.

## Alpha Futures Dashboard

If you have linked Alpha Futures accounts, this section shows your **TACH gauges** — REDLINE (drawdown), REV LIMIT (consistency), GRIP (safety net), and BOOST (profit target).

> **Tip:** Check the strategy chart and signal progression together — if the chart shows a valid FVG retrace but signals have not progressed past HEART NOTE, the setup may not be ready yet.`
      }
    ];

    let inserted = 0;
    for (const a of articles) {
      const result = await env.DB.prepare(
        'INSERT OR IGNORE INTO kb_articles (category, slug, title, content, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).bind(a.category, a.slug, a.title, a.content, a.sort_order).run();
      if (result.meta.changes > 0) inserted++;
    }

    return json({ inserted, total: articles.length });
  }

  // GET /api/strategy/config
  if (path === '/api/strategy/config' && method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT * FROM strategy_config WHERE user_id = ?'
    ).bind(user.sub).first();
    if (row) return json(row);
    // Return defaults
    return json({
      trade_london_sweep: 1,
      trade_ny_sweep: 1,
      fvg_scan_1h: 1,
      fvg_scan_4h: 1,
      continuation_require_ifvg: 0,
      min_rr: 2.0,
      sweep_require_close: 0,
      min_confidence: 60,
      max_contracts_override: null,
      default_contracts: 1,
      kill_switch: 0,
      kill_switch_date: null,
      active_preset: 'normal',
    });
  }

  // PUT /api/strategy/config
  if (path === '/api/strategy/config' && method === 'PUT') {
    const body = await request.json<Record<string, unknown>>();

    // Validate
    if (body.min_rr !== undefined) {
      const v = Number(body.min_rr);
      if (isNaN(v) || v < 1.0 || v > 10.0) return json({ error: 'min_rr must be 1.0-10.0' }, 400);
    }
    if (body.min_confidence !== undefined) {
      const v = Number(body.min_confidence);
      if (isNaN(v) || v < 0 || v > 100) return json({ error: 'min_confidence must be 0-100' }, 400);
    }
    if (body.max_contracts_override !== undefined && body.max_contracts_override !== null) {
      const v = Number(body.max_contracts_override);
      if (isNaN(v) || v < 1 || v > 20) return json({ error: 'max_contracts_override must be 1-20' }, 400);
    }
    if (body.default_contracts !== undefined) {
      const v = Number(body.default_contracts);
      if (isNaN(v) || v < 1 || v > 10) return json({ error: 'default_contracts must be 1-10' }, 400);
    }

    const fields = [
      'trade_london_sweep', 'trade_ny_sweep', 'fvg_scan_1h', 'fvg_scan_4h',
      'continuation_require_ifvg', 'min_rr', 'sweep_require_close', 'min_confidence',
      'max_contracts_override', 'default_contracts', 'kill_switch', 'kill_switch_date',
      'active_preset',
    ];

    const existing = await env.DB.prepare(
      'SELECT id FROM strategy_config WHERE user_id = ?'
    ).bind(user.sub).first();

    if (existing) {
      const sets: string[] = ["updated_at = datetime('now')"];
      const vals: unknown[] = [];
      for (const f of fields) {
        if (body[f] !== undefined) {
          sets.push(`${f} = ?`);
          vals.push(body[f]);
        }
      }
      if (vals.length > 0) {
        await env.DB.prepare(
          `UPDATE strategy_config SET ${sets.join(', ')} WHERE user_id = ?`
        ).bind(...vals, user.sub).run();
      }
    } else {
      const cols = ['user_id'];
      const placeholders = ['?'];
      const vals: unknown[] = [user.sub];
      for (const f of fields) {
        if (body[f] !== undefined) {
          cols.push(f);
          placeholders.push('?');
          vals.push(body[f]);
        }
      }
      await env.DB.prepare(
        `INSERT INTO strategy_config (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`
      ).bind(...vals).run();
    }

    const updated = await env.DB.prepare(
      'SELECT * FROM strategy_config WHERE user_id = ?'
    ).bind(user.sub).first();
    return json(updated);
  }

  // POST /api/strategy/config/preset
  if (path === '/api/strategy/config/preset' && method === 'POST') {
    const body = await request.json<{ preset: string }>();
    const presets: Record<string, Record<string, unknown>> = {
      conservative: { min_rr: 3.0, continuation_require_ifvg: 1, min_confidence: 75, default_contracts: 1 },
      normal: { min_rr: 2.0, continuation_require_ifvg: 0, min_confidence: 60, default_contracts: 1 },
      aggressive: { min_rr: 1.5, continuation_require_ifvg: 0, min_confidence: 40, default_contracts: 2 },
    };
    const preset = presets[body.preset];
    if (!preset) return json({ error: 'Invalid preset. Must be conservative, normal, or aggressive.' }, 400);

    const existing = await env.DB.prepare(
      'SELECT id FROM strategy_config WHERE user_id = ?'
    ).bind(user.sub).first();

    if (existing) {
      await env.DB.prepare(
        `UPDATE strategy_config SET min_rr = ?, continuation_require_ifvg = ?, min_confidence = ?,
         default_contracts = ?, active_preset = ?, updated_at = datetime('now') WHERE user_id = ?`
      ).bind(preset.min_rr, preset.continuation_require_ifvg, preset.min_confidence,
        preset.default_contracts, body.preset, user.sub).run();
    } else {
      await env.DB.prepare(
        `INSERT INTO strategy_config (user_id, min_rr, continuation_require_ifvg, min_confidence, default_contracts, active_preset)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(user.sub, preset.min_rr, preset.continuation_require_ifvg, preset.min_confidence,
        preset.default_contracts, body.preset).run();
    }

    const updated = await env.DB.prepare(
      'SELECT * FROM strategy_config WHERE user_id = ?'
    ).bind(user.sub).first();
    return json(updated);
  }

  // POST /api/strategy/kill-switch
  if (path === '/api/strategy/kill-switch' && method === 'POST') {
    const body = await request.json<{ enabled: boolean }>();
    const enabled = body.enabled ? 1 : 0;
    const now = new Date();
    const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
    const etDate = new Date(etStr);
    const todayET = `${etDate.getFullYear()}-${String(etDate.getMonth() + 1).padStart(2, '0')}-${String(etDate.getDate()).padStart(2, '0')}`;

    const existing = await env.DB.prepare(
      'SELECT id FROM strategy_config WHERE user_id = ?'
    ).bind(user.sub).first();

    if (existing) {
      await env.DB.prepare(
        `UPDATE strategy_config SET kill_switch = ?, kill_switch_date = ?, updated_at = datetime('now') WHERE user_id = ?`
      ).bind(enabled, enabled ? todayET : null, user.sub).run();
    } else {
      await env.DB.prepare(
        `INSERT INTO strategy_config (user_id, kill_switch, kill_switch_date) VALUES (?, ?, ?)`
      ).bind(user.sub, enabled, enabled ? todayET : null).run();
    }

    const updated = await env.DB.prepare(
      'SELECT * FROM strategy_config WHERE user_id = ?'
    ).bind(user.sub).first();
    return json(updated);
  }

  // GET /api/alpha/templates
  if (path === '/api/alpha/templates' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM alpha_account_templates ORDER BY account_size ASC'
    ).all();
    return json(results);
  }

  // GET /api/journal
  if (path === '/api/journal' && method === 'GET') {
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const instrument = url.searchParams.get('instrument');
    const since = new Date(Date.now() - days * 86400000).toISOString().substring(0, 10);
    const cols = `je.id, je.user_id, je.trade_log_id, je.setup_id, je.instrument_id, je.date,
                  je.direction, je.contracts, je.entry_price, je.stop_price, je.target_price,
                  je.exit_price, je.pnl, je.rr_target, je.rr_achieved, je.setup_phase,
                  je.notes, je.tags, je.created_at,
                  (je.ai_analysis IS NOT NULL) AS has_ai_analysis,
                  (je.chart_snapshot_svg IS NOT NULL) AS has_chart_snapshot,
                  i.symbol`;
    if (instrument) {
      const { results } = await env.DB.prepare(
        `SELECT ${cols} FROM journal_entries je
         LEFT JOIN instruments i ON je.instrument_id = i.id
         WHERE je.user_id = ? AND je.date >= ? AND i.symbol = ?
         ORDER BY je.date DESC, je.created_at DESC`
      ).bind(user.sub, since, instrument).all();
      return json(results);
    }
    const { results } = await env.DB.prepare(
      `SELECT ${cols} FROM journal_entries je
       LEFT JOIN instruments i ON je.instrument_id = i.id
       WHERE je.user_id = ? AND je.date >= ?
       ORDER BY je.date DESC, je.created_at DESC`
    ).bind(user.sub, since).all();
    return json(results);
  }

  // POST /api/journal
  if (path === '/api/journal' && method === 'POST') {
    const body = await request.json<Record<string, unknown>>();
    const tradeLogId = body.trade_log_id as number | undefined;
    if (!tradeLogId) return json({ error: 'trade_log_id required' }, 400);
    const id = await createJournalFromTradeLog(env, user.sub, tradeLogId, {
      setup_id: (body.setup_id as number | null | undefined) ?? null,
      notes: (body.notes as string | null | undefined) ?? null,
      tags: (body.tags as string | null | undefined) ?? null,
    });
    if (!id) return json({ error: 'trade not found' }, 404);
    return json({ id }, 201);
  }

  // POST /api/journal/auto-create
  if (path === '/api/journal/auto-create' && method === 'POST') {
    const body = await request.json<{ trade_log_id?: number }>();
    if (!body.trade_log_id) return json({ error: 'trade_log_id required' }, 400);
    const id = await createJournalFromTradeLog(env, user.sub, body.trade_log_id);
    if (!id) return json({ error: 'trade not found' }, 404);
    return json({ id }, 201);
  }

  // /api/journal/:id/...
  const journalIdMatch = path.match(/^\/api\/journal\/(\d+)(\/analyze|\/similar)?$/);
  if (journalIdMatch) {
    const id = parseInt(journalIdMatch[1], 10);
    const sub = journalIdMatch[2];

    // POST /api/journal/:id/analyze
    if (sub === '/analyze' && method === 'POST') {
      const entry = await env.DB.prepare(
        `SELECT je.*, i.symbol FROM journal_entries je
         LEFT JOIN instruments i ON je.instrument_id = i.id
         WHERE je.id = ? AND je.user_id = ?`
      ).bind(id, user.sub).first<Record<string, unknown>>();
      if (!entry) return json({ error: 'not found' }, 404);

      let setup: Record<string, unknown> | null = null;
      if (entry.setup_id) {
        setup = await env.DB.prepare('SELECT * FROM setups WHERE id = ?')
          .bind(entry.setup_id).first<Record<string, unknown>>();
      }

      const outcome = (entry.pnl as number ?? 0) >= 0 ? 'win' : 'loss';
      const tradeContext = {
        instrument: entry.symbol,
        date: entry.date,
        direction: entry.direction,
        contracts: entry.contracts,
        entry_price: entry.entry_price,
        stop_price: entry.stop_price,
        target_price: entry.target_price,
        exit_price: entry.exit_price,
        pnl: entry.pnl,
        rr_target: entry.rr_target,
        rr_achieved: entry.rr_achieved,
        outcome,
        setup_phase: entry.setup_phase,
        notes: entry.notes,
        setup: setup ? {
          sweep_direction: setup.sweep_direction,
          sweep_level: setup.sweep_level,
          phase: setup.phase,
          status: setup.status,
          confidence: setup.confidence,
        } : null,
      };

      const systemPrompt = `You are analyzing a completed futures trade for Matthew's ICT strategy journal. Review the trade and provide:
1. Entry reasoning: why this setup qualified based on ICT methodology
2. What worked: aspects of the trade that played out as expected
3. What didn't work: if it lost, what went wrong. If it won, any risks that were present
4. Lessons: one key takeaway for future trades
5. Rating: 1-5 stars for setup quality regardless of outcome
Respond in JSON: { entry_reasoning, what_worked, what_didnt, lessons, rating }`;

      let analysis: Record<string, unknown>;
      try {
        analysis = await callHaiku(env, systemPrompt, JSON.stringify(tradeContext)) as Record<string, unknown>;
      } catch (e) {
        return json({ error: 'analysis failed', detail: String(e) }, 502);
      }

      await env.DB.prepare(
        `UPDATE journal_entries
         SET ai_analysis = ?, ai_entry_reasoning = ?
         WHERE id = ? AND user_id = ?`
      ).bind(
        JSON.stringify(analysis),
        (analysis.entry_reasoning as string | undefined) ?? null,
        id,
        user.sub
      ).run();

      return json(analysis);
    }

    // GET /api/journal/:id/similar
    if (sub === '/similar' && method === 'GET') {
      const entry = await env.DB.prepare(
        'SELECT * FROM journal_entries WHERE id = ? AND user_id = ?'
      ).bind(id, user.sub).first<Record<string, unknown>>();
      if (!entry) return json({ error: 'not found' }, 404);

      let setup: Record<string, unknown> | null = null;
      if (entry.setup_id) {
        setup = await env.DB.prepare('SELECT * FROM setups WHERE id = ?')
          .bind(entry.setup_id).first<Record<string, unknown>>();
      }

      let fvgTimeframe: string | null = null;
      if (setup?.fvg_id) {
        const fvg = await env.DB.prepare(
          'SELECT timeframe FROM fair_value_gaps WHERE id = ?'
        ).bind(setup.fvg_id).first<{ timeframe: string }>();
        fvgTimeframe = fvg?.timeframe ?? null;
      }

      const sweepDir = setup?.sweep_direction ?? null;
      const query = `
        SELECT s.id, s.date, s.sweep_direction, s.phase, s.status, s.risk_reward,
               s.entry_price, s.target_price, s.stop_price, s.confidence,
               i.symbol, f.timeframe AS fvg_timeframe
        FROM setups s
        LEFT JOIN instruments i ON s.instrument_id = i.id
        LEFT JOIN fair_value_gaps f ON s.fvg_id = f.id
        WHERE s.user_id = ?
          AND s.id != COALESCE(?, -1)
          AND s.status IN ('won','lost','expired','skipped')
          AND (? IS NULL OR s.sweep_direction = ?)
          AND (? IS NULL OR s.instrument_id = ?)
          AND (? IS NULL OR f.timeframe = ?)
        ORDER BY s.date DESC
        LIMIT 5`;

      const { results: matches } = await env.DB.prepare(query).bind(
        user.sub,
        setup?.id ?? null,
        sweepDir, sweepDir,
        entry.instrument_id ?? null, entry.instrument_id ?? null,
        fvgTimeframe, fvgTimeframe
      ).all();

      await env.DB.prepare(
        'UPDATE journal_entries SET similar_setups_json = ? WHERE id = ? AND user_id = ?'
      ).bind(JSON.stringify(matches), id, user.sub).run();

      return json({ matches });
    }

    // GET /api/journal/:id
    if (!sub && method === 'GET') {
      const entry = await env.DB.prepare(
        `SELECT je.*, i.symbol FROM journal_entries je
         LEFT JOIN instruments i ON je.instrument_id = i.id
         WHERE je.id = ? AND je.user_id = ?`
      ).bind(id, user.sub).first();
      if (!entry) return json({ error: 'not found' }, 404);
      return json(entry);
    }

    // PUT /api/journal/:id
    if (!sub && method === 'PUT') {
      const body = await request.json<Record<string, unknown>>();
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (body.notes !== undefined) {
        sets.push('notes = ?');
        vals.push(body.notes === null ? null : String(body.notes));
      }
      if (body.tags !== undefined) {
        sets.push('tags = ?');
        vals.push(body.tags === null ? null : String(body.tags));
      }
      if (sets.length === 0) return json({ error: 'no fields to update' }, 400);
      const result = await env.DB.prepare(
        `UPDATE journal_entries SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`
      ).bind(...vals, id, user.sub).run();
      if (!result.meta.changes) return json({ error: 'not found' }, 404);
      const entry = await env.DB.prepare(
        `SELECT je.*, i.symbol FROM journal_entries je
         LEFT JOIN instruments i ON je.instrument_id = i.id
         WHERE je.id = ? AND je.user_id = ?`
      ).bind(id, user.sub).first();
      return json(entry);
    }
  }

  // GET /api/news — recent news items
  if (path === '/api/news' && method === 'GET') {
    const impact = url.searchParams.get('impact');
    const hours = parseInt(url.searchParams.get('hours') || '24', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();

    const whereParts: string[] = [
      "(published_at >= ? OR (published_at IS NULL AND created_at >= ?))",
    ];
    const binds: unknown[] = [since, since];
    if (impact) {
      whereParts.push('impact = ?');
      binds.push(impact);
    }

    const sql =
      `SELECT id, source, title, summary, url, published_at, impact, direction, instruments, created_at
       FROM market_news
       WHERE ${whereParts.join(' AND ')}
       ORDER BY COALESCE(published_at, created_at) DESC
       LIMIT ?`;
    binds.push(limit);

    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    return json(results);
  }

  // GET /api/news/calendar — upcoming US events for next 7 days
  if (path === '/api/news/calendar' && method === 'GET') {
    const today = new Date().toISOString().substring(0, 10);
    const until = new Date(Date.now() + 7 * 86400 * 1000).toISOString().substring(0, 10);
    const { results } = await env.DB.prepare(
      `SELECT * FROM economic_events
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC, time ASC`
    ).bind(today, until).all();
    return json(results);
  }

  // GET /api/news/:id — full news item with AI analysis
  const newsItemMatch = path.match(/^\/api\/news\/(\d+)$/);
  if (newsItemMatch && method === 'GET') {
    const id = newsItemMatch[1];
    const item = await env.DB.prepare(
      'SELECT * FROM market_news WHERE id = ?'
    ).bind(id).first();
    if (!item) return json({ error: 'Not found' }, 404);
    return json(item);
  }

  return json({ error: 'Not found' }, 404);
}
