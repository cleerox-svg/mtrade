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

interface ApexAccount {
  id: number;
  user_id: string;
  account_size: number;
  drawdown_limit: number;
  drawdown_type: string;
  account_type: string;
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

// ── Daily Loss Limits for EOD accounts ──

const EOD_DAILY_LOSS_LIMITS: Record<number, number> = {
  50000: 1250,
  100000: 1500,
  150000: 2000,
};

// ── Shared Dashboard Metrics Computation ──

export async function computeAccountMetrics(
  env: Env,
  accountId: number,
  account: ApexAccount
): Promise<DashboardMetrics> {
  const { results: rows } = await env.DB.prepare(
    'SELECT * FROM apex_daily_pnl WHERE apex_account_id = ? ORDER BY date ASC'
  ).bind(accountId).all<Record<string, unknown>>();

  const totalPnl = rows.reduce((s, r) => s + (r.pnl as number), 0);
  const currentBalance = account.account_size + totalPnl;

  // Best day PnL
  const bestDayPnl = rows.length ? Math.max(...rows.map(r => r.pnl as number)) : 0;

  // Consistency
  const profitDays = rows.filter(r => (r.pnl as number) > 0);
  const totalProfit = profitDays.reduce((s, r) => s + (r.pnl as number), 0);
  let consistencyPct = 100;
  if (totalProfit > 0 && profitDays.length > 0) {
    const maxDayPct = Math.max(...profitDays.map(r => ((r.pnl as number) / totalProfit) * 100));
    consistencyPct = Math.round(100 - Math.max(0, maxDayPct - 30));
  }

  // Drawdown
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

  const drawdownRemaining = account.drawdown_limit - drawdownUsed;

  // Safety net: for trailing accounts, safety net is reached when the trailing drawdown
  // floor is above the starting balance (i.e., profits have moved the floor up enough).
  // Simplified: safety net reached when total_pnl >= drawdown_limit
  const safetyNetReached = totalPnl >= account.drawdown_limit;

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
    'SELECT * FROM apex_accounts WHERE id = ? AND user_id = ?'
  ).bind(accountId, userId).first<ApexAccount>();
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

  // 2. Max Loss Check (MAE — Legacy accounts only)
  if (account.account_type === 'legacy') {
    let threshold: number;
    if (metrics.total_pnl <= 0) {
      // Use 30% of fixed drawdown
      threshold = account.drawdown_limit * 0.3;
    } else if (!metrics.safety_net_reached) {
      // Below safety net: 30% of fixed drawdown
      threshold = account.drawdown_limit * 0.3;
    } else {
      // Above safety net: 30% of total_pnl
      threshold = metrics.total_pnl * 0.3;
    }
    const maePass = maxLoss <= threshold;
    checks.push({
      check: 'mae',
      passed: maePass,
      max_loss: round2(maxLoss),
      threshold: round2(threshold),
      message: maePass
        ? `Max loss $${round2(maxLoss)} within $${round2(threshold)} limit`
        : `Max loss $${round2(maxLoss)} exceeds 30% threshold of $${round2(threshold)}`,
    });
  } else {
    checks.push({
      check: 'mae',
      passed: true,
      max_loss: round2(maxLoss),
      threshold: null,
      message: 'V4 account — no MAE rule',
    });
  }

  // 3. Drawdown Impact Check
  const remainingAfterLoss = metrics.drawdown_remaining - maxLoss;
  const pctOfDrawdown = account.drawdown_limit > 0 ? (maxLoss / account.drawdown_limit) * 100 : 0;
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
      ? `Drawdown safe — $${round2(remainingAfterLoss)} remains after max loss`
      : `This trade could breach drawdown! Only $${round2(metrics.drawdown_remaining)} buffer`,
  });

  // 4. Consistency Impact Check
  const newTodayPnl = metrics.today_pnl + potentialWin;
  const newTotalPnl = metrics.total_pnl + potentialWin;
  let newConsistency = metrics.consistency_pct;
  const consistencyLimit = account.account_type === 'legacy' ? 30 : 50;
  // Consistency is about best day as % of total profit
  // If new_today_pnl exceeds best_day, recalculate
  if (newTodayPnl > metrics.best_day_pnl && newTotalPnl > 0) {
    // best day % of total profit
    const bestDayPct = (newTodayPnl / newTotalPnl) * 100;
    newConsistency = Math.round(100 - Math.max(0, bestDayPct - consistencyLimit));
  }
  // The projected % is best day as % of total profit
  const projectedBestDayPct = newTodayPnl > metrics.best_day_pnl && newTotalPnl > 0
    ? round2((newTodayPnl / newTotalPnl) * 100)
    : (metrics.total_pnl > 0 ? round2((metrics.best_day_pnl / metrics.total_pnl) * 100) : 0);
  const consistencyPass = projectedBestDayPct <= consistencyLimit;
  checks.push({
    check: 'consistency',
    passed: consistencyPass,
    current_pct: metrics.consistency_pct,
    projected_pct: round2(projectedBestDayPct),
    limit: consistencyLimit,
    potential_win: round2(potentialWin),
    message: consistencyPass
      ? `Consistency safe at ${round2(projectedBestDayPct)}%`
      : `Win of $${round2(potentialWin)} would push best day to ${round2(projectedBestDayPct)}% — over ${consistencyLimit}% limit. Consider reducing size.`,
  });

  // 5. Daily Loss Limit Check (EOD accounts only)
  if (account.drawdown_type === 'eod') {
    const dll = EOD_DAILY_LOSS_LIMITS[account.account_size] || 1500;
    const todayAfterLoss = metrics.today_pnl - maxLoss;
    const dllPass = Math.abs(todayAfterLoss) < dll;
    checks.push({
      check: 'daily_loss',
      passed: dllPass,
      today_pnl: round2(metrics.today_pnl),
      max_loss: round2(maxLoss),
      dll,
      today_after_loss: round2(todayAfterLoss),
      message: dllPass
        ? `Daily loss limit safe — $${round2(Math.abs(todayAfterLoss))} of $${dll} DLL`
        : `Would breach $${dll} daily loss limit — today would be -$${round2(Math.abs(todayAfterLoss))}`,
    });
  } else {
    checks.push({
      check: 'daily_loss',
      passed: true,
      message: 'Non-EOD account — no daily loss limit',
    });
  }

  // 6. Position Size Recommendation
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
  if (!checks.find(c => c.check === 'mae')?.passed) riskScore += 20;
  if (!checks.find(c => c.check === 'drawdown')?.passed) riskScore += 30;
  else if (drawdownSeverity === 'critical') riskScore += 20;
  else if (drawdownSeverity === 'warning') riskScore += 10;
  if (!checks.find(c => c.check === 'consistency')?.passed) riskScore += 15;
  if (!checks.find(c => c.check === 'daily_loss')?.passed) riskScore += 20;
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
    'SELECT * FROM apex_accounts WHERE id = ? AND user_id = ?'
  ).bind(accountId, userId).first<ApexAccount>();
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

  // Drawdown check
  if (maxLoss > metrics.drawdown_remaining) {
    blockers.push(`Loss of $${round2(maxLoss)} would breach drawdown ($${round2(metrics.drawdown_remaining)} remaining)`);
  }

  // MAE check for legacy
  if (account.account_type === 'legacy') {
    const threshold = metrics.total_pnl > 0 && metrics.safety_net_reached
      ? metrics.total_pnl * 0.3
      : account.drawdown_limit * 0.3;
    if (maxLoss > threshold) {
      blockers.push(`Loss of $${round2(maxLoss)} exceeds MAE limit of $${round2(threshold)}`);
    }
  }

  // EOD daily loss
  if (account.drawdown_type === 'eod') {
    const dll = EOD_DAILY_LOSS_LIMITS[account.account_size] || 1500;
    if (Math.abs(metrics.today_pnl - maxLoss) >= dll) {
      blockers.push(`Would breach $${dll} daily loss limit`);
    }
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

  // Find user's active apex account
  const account = await env.DB.prepare(
    'SELECT * FROM apex_accounts WHERE user_id = ? AND is_active = 1 LIMIT 1'
  ).bind(userId).first<ApexAccount>();
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
        value: `✅ All clear — ${maxContracts} contracts safe\nDrawdown: $${round2(remaining)} buffer · Consistency: ${round2(consPct)}%`,
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
      value += `\nDrawdown: $${round2(remaining)} buffer`;
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
  account: ApexAccount,
  instrument: Instrument,
  metrics: DashboardMetrics,
  consistencyLimit: number
): number {
  const ticksRisk = Math.abs(trade.entry_price - trade.stop_price) / instrument.tick_size;
  const lossPerContract = ticksRisk * instrument.tick_value;
  if (lossPerContract <= 0) return 0;

  const allowedContracts = metrics.safety_net_reached ? account.max_contracts : account.scaling_limit;

  let maxSafe = allowedContracts;

  // Drawdown constraint
  if (metrics.drawdown_remaining > 0) {
    const ddMax = Math.floor(metrics.drawdown_remaining / lossPerContract);
    maxSafe = Math.min(maxSafe, ddMax);
  } else {
    return 0;
  }

  // MAE constraint (legacy only)
  if (account.account_type === 'legacy') {
    let threshold: number;
    if (metrics.total_pnl <= 0 || !metrics.safety_net_reached) {
      threshold = account.drawdown_limit * 0.3;
    } else {
      threshold = metrics.total_pnl * 0.3;
    }
    const maeMax = Math.floor(threshold / lossPerContract);
    maxSafe = Math.min(maxSafe, maeMax);
  }

  // EOD daily loss constraint
  if (account.drawdown_type === 'eod') {
    const dll = EOD_DAILY_LOSS_LIMITS[account.account_size] || 1500;
    const availableLoss = dll - Math.abs(metrics.today_pnl);
    if (availableLoss > 0) {
      const dllMax = Math.floor(availableLoss / lossPerContract);
      maxSafe = Math.min(maxSafe, dllMax);
    } else {
      return 0;
    }
  }

  // Consistency constraint (target-based)
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

  return Math.max(0, maxSafe);
}
