import { Env, JwtPayload } from './types';

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

  return json({ error: 'Not found' }, 404);
}
