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

async function computeDashboardMetrics(
  env: Env,
  userId: string
): Promise<{
  total_pnl: number;
  best_day: number;
  consistency_pct: number;
  consistency_limit: number;
  drawdown_used: number;
  drawdown_limit: number;
  drawdown_pct: number;
  safety_net_reached: boolean;
} | null> {
  const account = await env.DB.prepare(
    'SELECT * FROM apex_accounts WHERE user_id = ? AND is_active = 1 LIMIT 1'
  ).bind(userId).first<Record<string, unknown>>();
  if (!account) return null;

  const { results: rows } = await env.DB.prepare(
    'SELECT * FROM apex_daily_pnl WHERE apex_account_id = ? ORDER BY date ASC'
  ).bind(account.id).all<Record<string, unknown>>();

  const totalPnl = rows.reduce((s, r) => s + (r.pnl as number), 0);
  const bestDay = rows.length ? Math.max(...rows.map(r => r.pnl as number)) : 0;

  // Consistency
  const profitDays = rows.filter(r => (r.pnl as number) > 0);
  const totalProfit = profitDays.reduce((s, r) => s + (r.pnl as number), 0);
  let consistencyPct = 100;
  if (totalProfit > 0 && profitDays.length > 0) {
    const maxDayPct = Math.max(...profitDays.map(r => ((r.pnl as number) / totalProfit) * 100));
    consistencyPct = Math.round(100 - Math.max(0, maxDayPct - 30));
  }

  // Drawdown
  const drawdownLimit = account.drawdown_limit as number;
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

  const drawdownPct = drawdownLimit > 0 ? (drawdownUsed / drawdownLimit) * 100 : 0;
  const safetyNetReached = (drawdownLimit - drawdownUsed) <= 0;

  return {
    total_pnl: Math.round(totalPnl * 100) / 100,
    best_day: Math.round(bestDay * 100) / 100,
    consistency_pct: consistencyPct,
    consistency_limit: 30,
    drawdown_used: Math.round(drawdownUsed * 100) / 100,
    drawdown_limit: drawdownLimit,
    drawdown_pct: drawdownPct,
    safety_net_reached: safetyNetReached,
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

  // GET /api/instruments
  if (path === '/api/instruments' && method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM instruments').all();
    return json(results);
  }

  // GET /api/apex/accounts
  if (path === '/api/apex/accounts' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM apex_accounts WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(user.sub).all();
    return json(results);
  }

  // POST /api/apex/accounts
  if (path === '/api/apex/accounts' && method === 'POST') {
    const body = await request.json<Record<string, unknown>>();
    const result = await env.DB.prepare(
      `INSERT INTO apex_accounts (user_id, label, account_size, account_type, drawdown_type, drawdown_limit, profit_target, max_contracts, scaling_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.sub, body.label, body.account_size, body.account_type,
      body.drawdown_type, body.drawdown_limit, body.profit_target,
      body.max_contracts, body.scaling_limit
    ).run();
    return json({ id: result.meta.last_row_id }, 201);
  }

  // PUT /api/apex/accounts/:id
  const apexAccountMatch = path.match(/^\/api\/apex\/accounts\/(\d+)$/);
  if (apexAccountMatch && method === 'PUT') {
    const id = apexAccountMatch[1];
    const body = await request.json<Record<string, unknown>>();
    await env.DB.prepare(
      `UPDATE apex_accounts SET label = ?, account_size = ?, account_type = ?, drawdown_type = ?,
       drawdown_limit = ?, profit_target = ?, max_contracts = ?, scaling_limit = ?, is_active = ?
       WHERE id = ? AND user_id = ?`
    ).bind(
      body.label, body.account_size, body.account_type, body.drawdown_type,
      body.drawdown_limit, body.profit_target, body.max_contracts,
      body.scaling_limit, body.is_active ?? 1, id, user.sub
    ).run();
    return json({ ok: true });
  }

  // GET /api/apex/:id/daily-pnl
  const dailyPnlMatch = path.match(/^\/api\/apex\/(\d+)\/daily-pnl$/);
  if (dailyPnlMatch && method === 'GET') {
    const accountId = dailyPnlMatch[1];
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const { results } = await env.DB.prepare(
      `SELECT * FROM apex_daily_pnl WHERE apex_account_id = ?
       ORDER BY date DESC LIMIT ?`
    ).bind(accountId, days).all();
    return json(results);
  }

  // POST /api/apex/:id/daily-pnl (upsert)
  if (dailyPnlMatch && method === 'POST') {
    const accountId = dailyPnlMatch[1];
    const body = await request.json<Record<string, unknown>>();
    await env.DB.prepare(
      `INSERT INTO apex_daily_pnl (apex_account_id, date, pnl, trades_count, best_trade, worst_trade, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(apex_account_id, date) DO UPDATE SET
       pnl = excluded.pnl, trades_count = excluded.trades_count,
       best_trade = excluded.best_trade, worst_trade = excluded.worst_trade, notes = excluded.notes`
    ).bind(
      accountId, body.date, body.pnl, body.trades_count ?? 0,
      body.best_trade, body.worst_trade, body.notes ?? null
    ).run();
    return json({ ok: true });
  }

  // GET /api/apex/:id/dashboard
  const dashMatch = path.match(/^\/api\/apex\/(\d+)\/dashboard$/);
  if (dashMatch && method === 'GET') {
    const accountId = dashMatch[1];

    // Get account info
    const account = await env.DB.prepare(
      'SELECT * FROM apex_accounts WHERE id = ? AND user_id = ?'
    ).bind(accountId, user.sub).first<Record<string, unknown>>();
    if (!account) return json({ error: 'Account not found' }, 404);

    // Get all daily PnL rows
    const { results: rows } = await env.DB.prepare(
      'SELECT * FROM apex_daily_pnl WHERE apex_account_id = ? ORDER BY date ASC'
    ).bind(accountId).all<Record<string, unknown>>();

    const totalPnl = rows.reduce((s, r) => s + (r.pnl as number), 0);
    const balance = (account.account_size as number) + totalPnl;
    const bestDay = rows.length ? Math.max(...rows.map(r => r.pnl as number)) : 0;

    // Consistency: no single day > 30% of total profit
    const profitDays = rows.filter(r => (r.pnl as number) > 0);
    const totalProfit = profitDays.reduce((s, r) => s + (r.pnl as number), 0);
    let consistencyPct = 100;
    if (totalProfit > 0 && profitDays.length > 0) {
      const maxDayPct = Math.max(...profitDays.map(r => ((r.pnl as number) / totalProfit) * 100));
      consistencyPct = Math.round(100 - Math.max(0, maxDayPct - 30));
    }

    // Drawdown used
    const drawdownLimit = account.drawdown_limit as number;
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
      // EOD or static: simple sum of losses
      const losses = rows.filter(r => (r.pnl as number) < 0);
      drawdownUsed = Math.abs(losses.reduce((s, r) => s + (r.pnl as number), 0));
    }

    const safetyNet = drawdownLimit - drawdownUsed;

    // Win rate & profit factor
    const totalTrades = rows.reduce((s, r) => s + ((r.trades_count as number) || 0), 0);
    const winDays = rows.filter(r => (r.pnl as number) > 0).length;
    const lossDays = rows.filter(r => (r.pnl as number) < 0).length;
    const winRate = rows.length ? Math.round((winDays / rows.length) * 100) : 0;
    const totalLoss = Math.abs(rows.filter(r => (r.pnl as number) < 0).reduce((s, r) => s + (r.pnl as number), 0));
    const profitFactor = totalLoss > 0 ? Math.round((totalProfit / totalLoss) * 100) / 100 : totalProfit > 0 ? Infinity : 0;

    // Worst day
    const worstDay = rows.length ? Math.min(...rows.map(r => r.pnl as number)) : 0;

    // Payout eligibility
    const profitTarget = account.profit_target as number;
    const blockers: string[] = [];
    if (totalPnl < profitTarget) blockers.push(`Need $${(profitTarget - totalPnl).toFixed(2)} more profit`);
    if (rows.length < 10) blockers.push(`Need ${10 - rows.length} more trading days (min 10)`);
    if (consistencyPct < 70) blockers.push('Consistency below 70%');
    if (safetyNet < 0) blockers.push('Drawdown limit exceeded');
    const payoutEligible = blockers.length === 0;

    // Payout checks for status row
    const gripReached = totalPnl >= profitTarget;
    const minTradingDays = rows.length >= 10;
    const consistencyPass = consistencyPct >= 70;
    const minProfit = totalPnl >= 500;

    return json({
      balance: Math.round(balance * 100) / 100,
      total_pnl: Math.round(totalPnl * 100) / 100,
      best_day: Math.round(bestDay * 100) / 100,
      worst_day: Math.round(worstDay * 100) / 100,
      consistency_pct: consistencyPct,
      consistency_limit: 30,
      drawdown_used: Math.round(drawdownUsed * 100) / 100,
      drawdown_limit: drawdownLimit,
      safety_net: Math.round(safetyNet * 100) / 100,
      profit_target: profitTarget,
      win_rate: winRate,
      profit_factor: profitFactor,
      trading_days: rows.length,
      daily_pnl: rows.map(r => ({ date: r.date, pnl: r.pnl })),
      payout_eligible: payoutEligible,
      blockers,
      payout_checks: {
        consistency: consistencyPass,
        trading_days: minTradingDays,
        grip: gripReached,
        min_500: minProfit,
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
    return json({ id: result.meta.last_row_id }, 201);
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
       VALUES (2, 'ready', 3, 'NQ Setup: London high swept, FVG formed on 5m, waiting for entry',
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

    const systemPrompt = 'You are an ICT (Inner Circle Trader) strategy analyst. You analyze futures trading setups using ICT methodology — fair value gaps, inverse fair value gaps, liquidity sweeps, and London/NY session levels. Respond ONLY with valid JSON, no markdown, no backticks, no explanation outside the JSON.';
    const userPrompt = `Analyze this trading setup:
Instrument: ${alert.symbol} (${alert.name})
Tick Size: ${alert.tick_size}, Tick Value: $${alert.tick_value}
Session Levels:
London High: ${alert.sweep_direction === 'low' ? alert.target_price : alert.sweep_level}
London Low: ${alert.sweep_direction === 'high' ? alert.target_price : alert.sweep_level}
Setup:
Sweep: Price broke London ${alert.sweep_direction} at ${alert.sweep_level}
Fair Value Gap: ${alert.fvg_low} - ${alert.fvg_high}
Inverse FVG: ${alert.ifvg_low && alert.ifvg_high ? alert.ifvg_low + ' - ' + alert.ifvg_high : 'none'}
Proposed Entry: ${alert.entry_price}
Target: ${alert.target_price}
Stop: ${alert.stop_price}
Risk/Reward: ${alert.risk_reward}
${metrics ? `Trader's Apex Account Status:
Total P&L: $${metrics.total_pnl}
Best Single Day: $${metrics.best_day} (${metrics.consistency_pct}% of total — limit is ${metrics.consistency_limit}%)
Drawdown Used: $${metrics.drawdown_used} of $${metrics.drawdown_limit} (${metrics.drawdown_pct.toFixed(1)}%)
Safety Net: ${metrics.safety_net_reached ? 'reached' : 'not reached'}` : 'Trader has no active Apex account'}
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
"consistency_check": "one sentence about how this trade impacts Apex consistency rule",
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
       VALUES (2, 'ready', 3, 'NQ Setup: London high swept, FVG formed on 5m, waiting for entry',
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
${metrics ? `Trader's Apex Account Status:
Total P&L: $${metrics.total_pnl}
Best Single Day: $${metrics.best_day} (${metrics.consistency_pct}% of total — limit is ${metrics.consistency_limit}%)
Drawdown Used: $${metrics.drawdown_used} of $${metrics.drawdown_limit} (${metrics.drawdown_pct.toFixed(1)}%)
Safety Net: ${metrics.safety_net_reached ? 'reached' : 'not reached'}` : 'Trader has no active Apex account'}
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
"consistency_check": "one sentence about how this trade impacts Apex consistency rule",
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

    const systemPrompt = 'You are an ICT (Inner Circle Trader) strategy analyst. You analyze futures trading setups using ICT methodology — fair value gaps, inverse fair value gaps, liquidity sweeps, and London/NY session levels. Respond ONLY with valid JSON, no markdown, no backticks, no explanation outside the JSON.';
    const userPrompt = `Analyze this trading setup:
Instrument: ${alert.symbol} (${alert.name})
Tick Size: ${alert.tick_size}, Tick Value: $${alert.tick_value}
Session Levels:
London High: ${alert.sweep_direction === 'low' ? alert.target_price : alert.sweep_level}
London Low: ${alert.sweep_direction === 'high' ? alert.target_price : alert.sweep_level}
Setup:
Sweep: Price broke London ${alert.sweep_direction} at ${alert.sweep_level}
Fair Value Gap: ${alert.fvg_low} - ${alert.fvg_high}
Inverse FVG: ${alert.ifvg_low && alert.ifvg_high ? alert.ifvg_low + ' - ' + alert.ifvg_high : 'none'}
Proposed Entry: ${alert.entry_price}
Target: ${alert.target_price}
Stop: ${alert.stop_price}
Risk/Reward: ${alert.risk_reward}
${metrics ? `Trader's Apex Account Status:
Total P&L: $${metrics.total_pnl}
Best Single Day: $${metrics.best_day} (${metrics.consistency_pct}% of total — limit is ${metrics.consistency_limit}%)
Drawdown Used: $${metrics.drawdown_used} of $${metrics.drawdown_limit} (${metrics.drawdown_pct.toFixed(1)}%)
Safety Net: ${metrics.safety_net_reached ? 'reached' : 'not reached'}` : 'Trader has no active Apex account'}
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
"consistency_check": "one sentence about how this trade impacts Apex consistency rule",
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

      enriched.push({ ...setup, fvg_data: fvg, ifvg_data: ifvg, alerts });
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

  // POST /api/apex/:id/compliance-check
  const complianceMatch = path.match(/^\/api\/apex\/(\d+)\/compliance-check$/);
  if (complianceMatch && method === 'POST') {
    const accountId = parseInt(complianceMatch[1], 10);
    // Verify account belongs to user
    const acct = await env.DB.prepare(
      'SELECT id FROM apex_accounts WHERE id = ? AND user_id = ?'
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

  // POST /api/apex/:id/quick-check
  const quickCheckMatch = path.match(/^\/api\/apex\/(\d+)\/quick-check$/);
  if (quickCheckMatch && method === 'POST') {
    const accountId = parseInt(quickCheckMatch[1], 10);
    const acct = await env.DB.prepare(
      'SELECT id FROM apex_accounts WHERE id = ? AND user_id = ?'
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

  // GET /api/apex/templates
  if (path === '/api/apex/templates' && method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM apex_account_templates ORDER BY account_size ASC'
    ).all();
    return json(results);
  }

  return json({ error: 'Not found' }, 404);
}
