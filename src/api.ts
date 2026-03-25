import { Env, JwtPayload } from './types';

type Json = (data: unknown, status?: number) => Response;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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

    // Payout eligibility
    const profitTarget = account.profit_target as number;
    const blockers: string[] = [];
    if (totalPnl < profitTarget) blockers.push(`Need $${(profitTarget - totalPnl).toFixed(2)} more profit`);
    if (rows.length < 10) blockers.push(`Need ${10 - rows.length} more trading days (min 10)`);
    if (consistencyPct < 70) blockers.push('Consistency below 70%');
    if (safetyNet < 0) blockers.push('Drawdown limit exceeded');
    const payoutEligible = blockers.length === 0;

    return json({
      balance: Math.round(balance * 100) / 100,
      total_pnl: Math.round(totalPnl * 100) / 100,
      best_day: Math.round(bestDay * 100) / 100,
      consistency_pct: consistencyPct,
      drawdown_used: Math.round(drawdownUsed * 100) / 100,
      safety_net: Math.round(safetyNet * 100) / 100,
      win_rate: winRate,
      profit_factor: profitFactor,
      payout_eligible: payoutEligible,
      blockers,
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

  return json({ error: 'Not found' }, 404);
}
