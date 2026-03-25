import { Env } from './types';

// ── Types ──

export interface TradeInput {
  instrument_id: number;
  direction: string;
  contracts: number;
  entry_price: number;
  stop_price: number;
  target_price: number;
}

export interface QuickCheckInput {
  instrument_id: number;
  contracts: number;
  risk_ticks: number;
}

export interface CheckResult {
  check: string;
  passed: boolean;
  severity?: 'safe' | 'warning' | 'critical';
  [key: string]: unknown;
}

export interface ComplianceResult {
  passed: boolean;
  checks: CheckResult[];
  recommendation: CheckResult;
  risk_score: number;
}

export interface DashboardMetrics {
  current_balance: number;
  total_pnl: number;
  best_day_pnl: number;
  consistency_pct: number;
  drawdown_used: number;
  drawdown_remaining: number;
  safety_net_reached: boolean;
  trading_days_count: number;
  today_pnl: number;
}

interface AlphaAccount {
  id: number;
  user_id: string;
  account_size: number;
  drawdown_limit: number;
  drawdown_type: string;
  account_type: string;  // 'zero', 'standard', 'advanced'
  max_contracts: number;
  scaling_limit: number;
  profit_target: number;
  label: string;
}

interface Instrument {
  id: number;
  symbol: string;
  tick_size: number;
  tick_value: number;
}

// ── Alpha Futures MLL (Maximum Loss Limit) ──
// 4% of account size for Standard/Zero, 3.5% for Advanced
function getMLL(account: AlphaAccount): number {
  const rate = account.account_type === 'advanced' ? 0.035 : 0.04;
  return account.account_size * rate;
}

// ── Daily Loss Guard: 2% of account size ──
function getDailyLossGuard(account: AlphaAccount): number {
  return account.account_size * 0.02;
}

// ── Consistency rule: 40% for Standard/Zero, none for Advanced ──
function getConsistencyLimit(accountType: string): number | null {
  if (accountType === 'advanced') return null;
  return 40;
}

// ── Shared Dashboard Metrics Computation ──

export async function computeAccountMetrics(
  env: Env,
  accountId: number,
  account: AlphaAccount
): Promise<DashboardMetrics> {
  const { results: rows } = await env.DB.prepare(
    'SELECT * FROM alpha_daily_pnl WHERE alpha_account_id = ? ORDER BY date ASC'
  ).bind(accountId).all<Record<string, unknown>>();

  const totalPnl = rows.reduce((s, r) => s + (r.pnl as number), 0);
  const currentBalance = account.account_size + totalPnl;

  // Best day PnL
  const bestDayPnl = rows.length ? Math.max(...rows.map(r => r.pnl as number)) : 0;

  // Consistency (40% rule for Standard/Zero, skip for Advanced)
  const profitDays = rows.filter(r => (r.pnl as number) > 0);
  const totalProfit = profitDays.reduce((s, r) => s + (r.pnl as number), 0);
  let consistencyPct = 100;
  const consistencyLimit = getConsistencyLimit(account.account_type);
  if (consistencyLimit !== null && totalProfit > 0 && profitDays.length > 0) {
    const maxDayPct = Math.max(...profitDays.map(r => ((r.pnl as number) / totalProfit) * 100));
    consistencyPct = Math.round(100 - Math.max(0, maxDayPct - consistencyLimit));
  }

  // Drawdown (MLL calculated on EOD balance)
  const mll = getMLL(account);
  let drawdownUsed = 0;
  if (account.drawdown_type === 'trailing') {
    let peak = account.account_size;
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

  const drawdownRemaining = mll - drawdownUsed;

  // Safety net: reached when total_pnl >= MLL
  const safetyNetReached = totalPnl >= mll;

  // Today's PnL
  const todayET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(todayET);
  const todayStr = `${etDate.getFullYear()}-${String(etDate.getMonth() + 1).padStart(2, '0')}-${String(etDate.getDate()).padStart(2, '0')}`;
  const todayRow = rows.find(r => r.date === todayStr);
  const todayPnl = todayRow ? (todayRow.pnl as number) : 0;

  return {
    current_balance: Math.round(currentBalance * 100) / 100,
    total_pnl: Math.round(totalPnl * 100) / 100,
    best_day_pnl: Math.round(bestDayPnl * 100) / 100,
    consistency_pct: consistencyPct,
    drawdown_used: Math.round(drawdownUsed * 100) / 100,
    drawdown_remaining: Math.round(drawdownRemaining * 100) / 100,
    safety_net_reached: safetyNetReached,
    trading_days_count: rows.length,
    today_pnl: Math.round(todayPnl * 100) / 100,
  };
}

// ── Main Compliance Check ──

export async function checkTradeCompliance(
  env: Env,
  userId: string,
  accountId: number,
  trade: TradeInput
): Promise<ComplianceResult> {
  // Load account
  const account = await env.DB.prepare(
    'SELECT * FROM alpha_accounts WHERE id = ? AND user_id = ?'
  ).bind(accountId, userId).first<AlphaAccount>();
  if (!account) throw new Error('Account not found');

  // Load instrument
  const instrument = await env.DB.prepare(
    'SELECT * FROM instruments WHERE id = ?'
  ).bind(trade.instrument_id).first<Instrument>();
  if (!instrument) throw new Error('Instrument not found');

  // Compute metrics
  const metrics = await computeAccountMetrics(env, accountId, account);

  // Calculate trade risk values
  const ticksBetweenEntryStop = Math.abs(trade.entry_price - trade.stop_price) / instrument.tick_size;
  const maxLoss = trade.contracts * ticksBetweenEntryStop * instrument.tick_value;

  const ticksBetweenEntryTarget = Math.abs(trade.target_price - trade.entry_price) / instrument.tick_size;
  const potentialWin = trade.contracts * ticksBetweenEntryTarget * instrument.tick_value;

  const checks: CheckResult[] = [];

  // 1. Contract Scaling Check
  const allowedContracts = metrics.safety_net_reached ? account.max_contracts : account.scaling_limit;
  const contractsPass = trade.contracts <= allowedContracts;
  checks.push({
    check: 'contracts',
    passed: contractsPass,
    allowed: allowedContracts,
    requested: trade.contracts,
    safety_net: metrics.safety_net_reached,
    message: contractsPass
      ? `Within ${metrics.safety_net_reached ? 'full' : 'scaling'} limit`
      : `Exceeds ${metrics.safety_net_reached ? 'max' : 'scaling'} limit — max ${allowedContracts} contracts${metrics.safety_net_reached ? '' : ' until safety net reached'}`,
  });

  // 2. Daily Loss Guard Check (replaces MAE — Alpha Futures has no MAE rule)
  const dlg = getDailyLossGuard(account);
  const todayPnlAfterLoss = metrics.today_pnl - maxLoss;
  const dlgPass = Math.abs(Math.min(todayPnlAfterLoss, 0)) < dlg;
  checks.push({
    check: 'daily_loss_guard',
    passed: dlgPass,
    max_loss: round2(maxLoss),
    daily_loss_guard: round2(dlg),
    today_pnl: round2(metrics.today_pnl),
    today_after_loss: round2(todayPnlAfterLoss),
    message: dlgPass
      ? `Daily Loss Guard safe — $${round2(Math.abs(Math.min(todayPnlAfterLoss, 0)))} of $${round2(dlg)} DLG`
      : `Would breach $${round2(dlg)} Daily Loss Guard — today would be -$${round2(Math.abs(todayPnlAfterLoss))}`,
  });

  // 3. Drawdown Impact Check (MLL)
  const mll = getMLL(account);
  const remainingAfterLoss = metrics.drawdown_remaining - maxLoss;
  const pctOfDrawdown = mll > 0 ? (maxLoss / mll) * 100 : 0;
  const drawdownPass = remainingAfterLoss > 0;
  let drawdownSeverity: 'safe' | 'warning' | 'critical' = 'safe';
  if (!drawdownPass) {
    drawdownSeverity = 'critical';
  } else if (maxLoss > metrics.drawdown_remaining * 0.8) {
    drawdownSeverity = 'critical';
  } else if (maxLoss > metrics.drawdown_remaining * 0.5) {
    drawdownSeverity = 'warning';
  }
  checks.push({
    check: 'drawdown',
    passed: drawdownPass,
    severity: drawdownSeverity,
    max_loss: round2(maxLoss),
    drawdown_remaining: round2(metrics.drawdown_remaining),
    remaining_after_loss: round2(remainingAfterLoss),
    pct_of_drawdown: round2(pctOfDrawdown),
    message: drawdownPass
      ? `MLL safe — $${round2(remainingAfterLoss)} remains after max loss`
      : `This trade could breach MLL! Only $${round2(metrics.drawdown_remaining)} buffer`,
  });

  // 4. Consistency Impact Check (40% for Standard/Zero, skip for Advanced)
  const consistencyLimit = getConsistencyLimit(account.account_type);
  let consistencyPass = true;
  let projectedBestDayPct = 0;

  if (consistencyLimit !== null) {
    const newTodayPnl = metrics.today_pnl + potentialWin;
    const newTotalPnl = metrics.total_pnl + potentialWin;
    // Consistency is about best day as % of total profit
    if (newTodayPnl > metrics.best_day_pnl && newTotalPnl > 0) {
      projectedBestDayPct = round2((newTodayPnl / newTotalPnl) * 100);
    } else {
      projectedBestDayPct = metrics.total_pnl > 0 ? round2((metrics.best_day_pnl / metrics.total_pnl) * 100) : 0;
    }
    consistencyPass = projectedBestDayPct <= consistencyLimit;
    checks.push({
      check: 'consistency',
      passed: consistencyPass,
      current_pct: metrics.consistency_pct,
      projected_pct: projectedBestDayPct,
      limit: consistencyLimit,
      potential_win: round2(potentialWin),
      message: consistencyPass
        ? `Consistency safe at ${projectedBestDayPct}%`
        : `Win of $${round2(potentialWin)} would push best day to ${projectedBestDayPct}% — over ${consistencyLimit}% limit. Consider reducing size.`,
    });
  } else {
    checks.push({
      check: 'consistency',
      passed: true,
      limit: null,
      message: 'Advanced account — no consistency rule',
    });
  }

  // 5. Position Size Recommendation
  const allPassed = checks.every(c => c.passed);
  const hasWarnings = checks.some(c => c.severity === 'warning');
  const hasCritical = checks.some(c => c.severity === 'critical');
  const hasFailures = checks.some(c => !c.passed);

  let recommendedContracts = trade.contracts;
  let action: 'proceed' | 'reduce' | 'skip' = 'proceed';
  let reasoning = 'All checks pass — trade is safe';

  if (hasFailures) {
    // Work backwards to find max safe contracts
    recommendedContracts = findMaxSafeContracts(
      trade, account, instrument, metrics, consistencyLimit
    );
    if (recommendedContracts <= 0) {
      action = 'skip';
      reasoning = 'No safe position size — skip this trade';
      recommendedContracts = 0;
    } else {
      action = 'reduce';
      reasoning = `Reduce to ${recommendedContracts} contract${recommendedContracts > 1 ? 's' : ''} to pass all checks`;
    }
  } else if (hasWarnings || hasCritical) {
    reasoning = 'All checks pass but with warnings — proceed with caution';
  }

  const recommendation: CheckResult = {
    check: 'recommendation',
    passed: allPassed,
    action,
    recommended_contracts: recommendedContracts,
    reasoning,
  };

  // Risk score: 0-100
  let riskScore = 0;
  if (!checks.find(c => c.check === 'contracts')?.passed) riskScore += 25;
  if (!checks.find(c => c.check === 'daily_loss_guard')?.passed) riskScore += 20;
  if (!checks.find(c => c.check === 'drawdown')?.passed) riskScore += 30;
  else if (drawdownSeverity === 'critical') riskScore += 20;
  else if (drawdownSeverity === 'warning') riskScore += 10;
  if (!checks.find(c => c.check === 'consistency')?.passed) riskScore += 15;
  riskScore = Math.min(riskScore, 100);

  return {
    passed: allPassed,
    checks,
    recommendation,
    risk_score: riskScore,
  };
}

// ── Quick Check (simplified) ──

export async function quickTradeCheck(
  env: Env,
  userId: string,
  accountId: number,
  input: QuickCheckInput
): Promise<{ passed: boolean; blockers: string[]; max_contracts: number; drawdown_remaining: number }> {
  const account = await env.DB.prepare(
    'SELECT * FROM alpha_accounts WHERE id = ? AND user_id = ?'
  ).bind(accountId, userId).first<AlphaAccount>();
  if (!account) throw new Error('Account not found');

  const instrument = await env.DB.prepare(
    'SELECT * FROM instruments WHERE id = ?'
  ).bind(input.instrument_id).first<Instrument>();
  if (!instrument) throw new Error('Instrument not found');

  const metrics = await computeAccountMetrics(env, accountId, account);

  const maxLoss = input.contracts * input.risk_ticks * instrument.tick_value;
  const blockers: string[] = [];

  // Contract check
  const allowedContracts = metrics.safety_net_reached ? account.max_contracts : account.scaling_limit;
  if (input.contracts > allowedContracts) {
    blockers.push(`Max ${allowedContracts} contracts (${metrics.safety_net_reached ? 'full' : 'scaling'} limit)`);
  }

  // MLL drawdown check
  if (maxLoss > metrics.drawdown_remaining) {
    blockers.push(`Loss of $${round2(maxLoss)} would breach MLL ($${round2(metrics.drawdown_remaining)} remaining)`);
  }

  // Daily Loss Guard check
  const dlg = getDailyLossGuard(account);
  const todayAfterLoss = metrics.today_pnl - maxLoss;
  if (Math.abs(Math.min(todayAfterLoss, 0)) >= dlg) {
    blockers.push(`Would breach $${round2(dlg)} Daily Loss Guard`);
  }

  return {
    passed: blockers.length === 0,
    blockers,
    max_contracts: allowedContracts,
    drawdown_remaining: round2(metrics.drawdown_remaining),
  };
}

// ── Compliance Summary for Discord ──

export async function getComplianceSummary(
  env: Env,
  userId: string,
  alertData: { instrument_id: number; entry_price: number | null; target_price: number | null; stop_price: number | null }
): Promise<{ name: string; value: string; inline: boolean } | null> {
  if (!alertData.entry_price || !alertData.stop_price) return null;

  // Find user's active Alpha Futures account
  const account = await env.DB.prepare(
    'SELECT * FROM alpha_accounts WHERE user_id = ? AND is_active = 1 LIMIT 1'
  ).bind(userId).first<AlphaAccount>();
  if (!account) return null;

  try {
    const trade: TradeInput = {
      instrument_id: alertData.instrument_id,
      direction: alertData.entry_price < (alertData.target_price || alertData.entry_price) ? 'LONG' : 'SHORT',
      contracts: 1,
      entry_price: alertData.entry_price,
      stop_price: alertData.stop_price,
      target_price: alertData.target_price || alertData.entry_price,
    };

    const result = await checkTradeCompliance(env, userId, account.id, trade);
    const drawdownCheck = result.checks.find(c => c.check === 'drawdown');
    const consistencyCheck = result.checks.find(c => c.check === 'consistency');
    const contractsCheck = result.checks.find(c => c.check === 'contracts');
    const recContracts = (result.recommendation as Record<string, unknown>).recommended_contracts as number;

    if (result.passed) {
      const maxContracts = (contractsCheck?.allowed as number) || 1;
      const remaining = (drawdownCheck?.drawdown_remaining as number) || 0;
      const consPct = (consistencyCheck?.projected_pct as number) || 0;
      return {
        name: 'Compliance',
        value: `✅ All clear — ${maxContracts} contracts safe\nMLL: $${round2(remaining)} buffer · Consistency: ${round2(consPct)}%`,
        inline: false,
      };
    } else {
      const warnings: string[] = [];
      for (const check of result.checks) {
        if (!check.passed) {
          warnings.push(check.message as string);
        }
      }
      const remaining = (drawdownCheck?.drawdown_remaining as number) || 0;
      let value = warnings.join('\n');
      if (recContracts > 0) {
        value += `\nRecommended: ${recContracts} contract${recContracts > 1 ? 's' : ''}`;
      }
      value += `\nMLL: $${round2(remaining)} buffer`;
      return {
        name: '⚠ Compliance',
        value,
        inline: false,
      };
    }
  } catch {
    return null;
  }
}

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function findMaxSafeContracts(
  trade: TradeInput,
  account: AlphaAccount,
  instrument: Instrument,
  metrics: DashboardMetrics,
  consistencyLimit: number | null
): number {
  const ticksRisk = Math.abs(trade.entry_price - trade.stop_price) / instrument.tick_size;
  const lossPerContract = ticksRisk * instrument.tick_value;
  if (lossPerContract <= 0) return 0;

  const allowedContracts = metrics.safety_net_reached ? account.max_contracts : account.scaling_limit;

  let maxSafe = allowedContracts;

  // MLL drawdown constraint
  if (metrics.drawdown_remaining > 0) {
    const ddMax = Math.floor(metrics.drawdown_remaining / lossPerContract);
    maxSafe = Math.min(maxSafe, ddMax);
  } else {
    return 0;
  }

  // Daily Loss Guard constraint
  const dlg = getDailyLossGuard(account);
  const availableLoss = dlg - Math.abs(Math.min(metrics.today_pnl, 0));
  if (availableLoss > 0) {
    const dlgMax = Math.floor(availableLoss / lossPerContract);
    maxSafe = Math.min(maxSafe, dlgMax);
  } else {
    return 0;
  }

  // Consistency constraint (target-based) — only for Standard/Zero
  if (consistencyLimit !== null) {
    const ticksTarget = Math.abs(trade.target_price - trade.entry_price) / instrument.tick_size;
    const winPerContract = ticksTarget * instrument.tick_value;
    if (winPerContract > 0) {
      for (let c = maxSafe; c >= 1; c--) {
        const potWin = c * winPerContract;
        const newTodayPnl = metrics.today_pnl + potWin;
        const newTotalPnl = metrics.total_pnl + potWin;
        if (newTodayPnl > metrics.best_day_pnl && newTotalPnl > 0) {
          const bestDayPct = (newTodayPnl / newTotalPnl) * 100;
          if (bestDayPct > consistencyLimit) {
            maxSafe = c - 1;
            continue;
          }
        }
        break;
      }
    }
  }

  return Math.max(0, maxSafe);
}
