import { Env } from './types';

// ── Discord Webhook Helpers ──

async function postDiscord(env: Env, payload: Record<string, unknown>, retry = true): Promise<boolean> {
  if (!env.DISCORD_WEBHOOK_URL) return false;

  try {
    const resp = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      console.error(`Discord webhook failed: ${resp.status} ${resp.statusText}`);
      if (retry) {
        return postDiscord(env, payload, false);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error('Discord webhook error:', err);
    if (retry) {
      return postDiscord(env, payload, false);
    }
    return false;
  }
}

const FOOTER = { text: 'MTRADE \u00b7 LRX Enterprises Inc.' };

// ── Setup Alert Notifications ──

interface AlertData {
  id: number;
  alert_type: string;
  sweep_direction: string | null;
  sweep_level: number | null;
  fvg_high: number | null;
  fvg_low: number | null;
  ifvg_high: number | null;
  ifvg_low: number | null;
  entry_price: number | null;
  target_price: number | null;
  stop_price: number | null;
  risk_reward: number | null;
}

interface SetupData {
  id: number;
  phase: number;
  sweep_direction: string | null;
  sweep_level: number | null;
  haiku_analysis_json?: string | null;
}

interface SessionLevels {
  london_high: number | null;
  london_low: number | null;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toFixed(2);
}

export async function sendDiscordAlert(
  env: Env,
  alert: AlertData,
  setup: SetupData,
  symbol: string,
  sessionLevels: SessionLevels | null
): Promise<boolean> {
  if (!env.DISCORD_WEBHOOK_URL) return false;

  const direction = setup.sweep_direction === 'low' ? 'LONG' : 'SHORT';
  const sweepSide = setup.sweep_direction === 'low' ? 'Low' : 'High';

  let embed: Record<string, unknown>;

  if (alert.alert_type === 'approaching') {
    // Phase 1 — Sweep detected
    embed = {
      title: '\ud83d\udd38 TOP NOTE \u2014 Sweep Detected',
      description: `${symbol} broke London ${sweepSide} at ${fmt(alert.sweep_level)}`,
      color: 16763904,
      fields: [
        { name: 'London High', value: fmt(sessionLevels?.london_high), inline: true },
        { name: 'London Low', value: fmt(sessionLevels?.london_low), inline: true },
        { name: 'Sweep', value: `${sweepSide} at ${fmt(alert.sweep_level)}`, inline: true },
        { name: 'Status', value: 'Watching for FVG retracement...', inline: false },
      ],
      footer: FOOTER,
      timestamp: new Date().toISOString(),
    };
  } else if (alert.alert_type === 'ready') {
    // Phase 3 — Continuation confirmed
    const fvgTf = alert.fvg_high && alert.fvg_low ? '' : '';
    embed = {
      title: '\ud83d\udd34 BASE NOTE \u2014 Setup Confirmed',
      description: `${symbol} \u2014 ${direction} setup forming`,
      color: 16525628,
      fields: [
        { name: 'Entry', value: fmt(alert.entry_price), inline: true },
        { name: 'Target', value: fmt(alert.target_price), inline: true },
        { name: 'Stop', value: fmt(alert.stop_price), inline: true },
        { name: 'R:R', value: `${fmt(alert.risk_reward)}:1`, inline: true },
        { name: 'FVG', value: `${fmt(alert.fvg_low)} \u2013 ${fmt(alert.fvg_high)}`, inline: true },
        { name: 'IFVG', value: alert.ifvg_high != null ? `${fmt(alert.ifvg_low)} \u2013 ${fmt(alert.ifvg_high)}` : '\u2014', inline: true },
        { name: 'Signal', value: 'Continuation confirmed. Waiting for hold...', inline: false },
      ],
      footer: FOOTER,
      timestamp: new Date().toISOString(),
    };
  } else if (alert.alert_type === 'execute') {
    // Phase 4 — ACCORD
    const fields: Record<string, unknown>[] = [
      { name: 'Entry', value: `**${fmt(alert.entry_price)}**`, inline: true },
      { name: 'Target', value: `**${fmt(alert.target_price)}**`, inline: true },
      { name: 'Stop', value: `**${fmt(alert.stop_price)}**`, inline: true },
      { name: 'R:R', value: `**${fmt(alert.risk_reward)}:1**`, inline: true },
      { name: 'Sweep', value: `London ${sweepSide} at ${fmt(alert.sweep_level)}`, inline: true },
    ];

    // Parse Haiku analysis for confidence/fragrance
    let confidence = '';
    let fragrance = '';
    let aiSummary = '';
    if (setup.haiku_analysis_json) {
      try {
        const analysis = JSON.parse(setup.haiku_analysis_json);
        confidence = analysis.confidence != null ? `${analysis.confidence}%` : '';
        fragrance = analysis.fragrance || '';
        aiSummary = analysis.summary || '';
      } catch { /* ignore parse errors */ }
    }

    fields.push({
      name: 'Confidence',
      value: confidence && fragrance ? `${confidence} (${fragrance})` : confidence || '\u2014',
      inline: true,
    });

    if (aiSummary) {
      fields.push({ name: 'AI Analysis', value: aiSummary, inline: false });
    }

    fields.push({
      name: '',
      value: '**[Open Mtrade \u2192](https://mtrade.lrxradar.com/app)**',
      inline: false,
    });

    embed = {
      title: '\ud83d\udea8 ACCORD \u2014 ALL NOTES ALIGNED',
      description: `**${symbol} \u2014 ${direction} NOW**\nEntry: ${fmt(alert.entry_price)} \u2192 Target: ${fmt(alert.target_price)}\nStop: ${fmt(alert.stop_price)} \u00b7 R:R ${fmt(alert.risk_reward)}:1`,
      color: 16396084,
      fields,
      footer: FOOTER,
      timestamp: new Date().toISOString(),
    };
  } else {
    return false;
  }

  return postDiscord(env, { embeds: [embed] });
}

// ── Drawdown Warning ──

interface AccountInfo {
  label: string;
}

interface DrawdownMetrics {
  drawdown_pct: number;
  drawdown_used: number;
  drawdown_limit: number;
  balance: number;
}

export async function sendDrawdownWarning(
  env: Env,
  account: AccountInfo,
  metrics: DrawdownMetrics
): Promise<boolean> {
  if (!env.DISCORD_WEBHOOK_URL) return false;

  const isCritical = metrics.drawdown_pct >= 85;
  const remaining = metrics.drawdown_limit - metrics.drawdown_used;

  const embed = {
    title: isCritical
      ? '\ud83d\udd34 REDLINE CRITICAL \u2014 Drawdown Alert'
      : '\u26a0\ufe0f REDLINE WARNING \u2014 Drawdown Alert',
    description: `Apex ${account.label}: Drawdown at ${Math.round(metrics.drawdown_pct)}%`,
    color: isCritical ? 16396084 : 16776960,
    fields: [
      { name: 'Used', value: `$${metrics.drawdown_used.toFixed(2)} / $${metrics.drawdown_limit.toFixed(2)}`, inline: true },
      { name: 'Remaining', value: `$${remaining.toFixed(2)}`, inline: true },
      { name: 'Balance', value: `$${metrics.balance.toFixed(2)}`, inline: true },
    ],
    footer: FOOTER,
  };

  return postDiscord(env, { embeds: [embed] });
}

// ── Consistency Warning ──

interface ConsistencyMetrics {
  consistency_pct: number;
  consistency_limit: number;
  best_day: number;
  total_pnl: number;
}

export async function sendConsistencyWarning(
  env: Env,
  account: AccountInfo,
  metrics: ConsistencyMetrics
): Promise<boolean> {
  if (!env.DISCORD_WEBHOOK_URL) return false;

  const headroom = metrics.consistency_limit - (100 - metrics.consistency_pct);

  const embed = {
    title: '\u26a0\ufe0f REV LIMIT WARNING \u2014 Consistency Alert',
    description: `Apex ${account.label}: Best day is ${(100 - metrics.consistency_pct).toFixed(0)}% of total profit (limit: ${metrics.consistency_limit}%)`,
    color: 16776960,
    fields: [
      { name: 'Best Day', value: `$${metrics.best_day.toFixed(2)}`, inline: true },
      { name: 'Total Profit', value: `$${metrics.total_pnl.toFixed(2)}`, inline: true },
      { name: 'Headroom', value: `${headroom.toFixed(1)}% left`, inline: true },
    ],
    footer: FOOTER,
  };

  return postDiscord(env, { embeds: [embed] });
}

// ── Setup Result ──

interface SetupResult {
  symbol: string;
  direction: string;
  entry_price: number | null;
  exit_price: number | null;
  pnl: number | null;
  risk_reward: number | null;
  actual_rr: number | null;
  status: string; // 'won' | 'lost' | 'expired'
}

export async function sendSetupResult(
  env: Env,
  result: SetupResult
): Promise<boolean> {
  if (!env.DISCORD_WEBHOOK_URL) return false;

  const isWon = result.status === 'won';
  const isLost = result.status === 'lost';
  const emoji = isWon ? '\u2705' : isLost ? '\u274c' : '\u23f0';
  const label = result.status.toUpperCase();
  const color = isWon ? 3461464 : isLost ? 16396084 : 9807270;

  const embed = {
    title: `${emoji} Setup ${label} \u2014 ${result.symbol}`,
    description: `${result.direction} from ${fmt(result.entry_price)} \u2192 exited at ${fmt(result.exit_price)}`,
    color,
    fields: [
      { name: 'P&L', value: `$${result.pnl != null ? result.pnl.toFixed(2) : '\u2014'}`, inline: true },
      { name: 'R:R Achieved', value: `${result.actual_rr != null ? result.actual_rr.toFixed(1) : '\u2014'}:1`, inline: true },
    ],
    footer: FOOTER,
  };

  return postDiscord(env, { embeds: [embed] });
}

// ── Test Notification ──

export async function sendTestNotification(env: Env): Promise<boolean> {
  if (!env.DISCORD_WEBHOOK_URL) return false;

  const embed = {
    title: '\ud83d\udd14 Mtrade notifications are working!',
    description: `Connected at ${new Date().toISOString()}`,
    color: 3461464,
    footer: FOOTER,
    timestamp: new Date().toISOString(),
  };

  return postDiscord(env, { embeds: [embed] });
}

// ── Notification Dedup Helper ──

export async function hasNotificationToday(
  env: Env,
  userId: string,
  type: string
): Promise<boolean> {
  const todayET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(todayET);
  const dateStr = `${etDate.getFullYear()}-${String(etDate.getMonth() + 1).padStart(2, '0')}-${String(etDate.getDate()).padStart(2, '0')}`;

  const row = await env.DB.prepare(
    'SELECT id FROM notification_log WHERE user_id = ? AND type = ? AND date = ?'
  ).bind(userId, type, dateStr).first();

  return !!row;
}

export async function logNotification(
  env: Env,
  userId: string,
  type: string
): Promise<void> {
  const todayET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(todayET);
  const dateStr = `${etDate.getFullYear()}-${String(etDate.getMonth() + 1).padStart(2, '0')}-${String(etDate.getDate()).padStart(2, '0')}`;

  await env.DB.prepare(
    'INSERT OR IGNORE INTO notification_log (user_id, type, date) VALUES (?, ?, ?)'
  ).bind(userId, type, dateStr).run();
}
