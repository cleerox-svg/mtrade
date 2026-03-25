import { Env } from './types';
import { getComplianceSummary } from './compliance';

// ── User Settings ──

export interface UserSettings {
  user_id: string;
  discord_webhook_url: string | null;
  discord_enabled: number;
  notify_sweep: number;
  notify_ready: number;
  notify_execute: number;
  notify_drawdown: number;
  notify_consistency: number;
  notify_setup_result: number;
}

const DEFAULT_SETTINGS: Omit<UserSettings, 'user_id'> = {
  discord_webhook_url: null,
  discord_enabled: 1,
  notify_sweep: 1,
  notify_ready: 1,
  notify_execute: 1,
  notify_drawdown: 1,
  notify_consistency: 1,
  notify_setup_result: 1,
};

export async function getUserSettings(env: Env, userId: string): Promise<UserSettings> {
  const row = await env.DB.prepare(
    'SELECT * FROM user_settings WHERE user_id = ?'
  ).bind(userId).first<UserSettings>();
  return row ?? { user_id: userId, ...DEFAULT_SETTINGS };
}

/** Get all users with Discord enabled and a webhook URL configured */
export async function getEnabledWebhookUsers(env: Env): Promise<UserSettings[]> {
  const { results } = await env.DB.prepare(
    "SELECT * FROM user_settings WHERE discord_enabled = 1 AND discord_webhook_url IS NOT NULL AND discord_webhook_url != ''"
  ).all<UserSettings>();
  return results;
}

// ── Discord Webhook Helpers ──

async function postDiscord(webhookUrl: string, payload: Record<string, unknown>, retry = true): Promise<boolean> {
  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      console.error(`Discord webhook failed: ${resp.status} ${resp.statusText}`);
      if (retry) {
        return postDiscord(webhookUrl, payload, false);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error('Discord webhook error:', err);
    if (retry) {
      return postDiscord(webhookUrl, payload, false);
    }
    return false;
  }
}

const FOOTER = { text: 'MTRADE \u00b7 LRX Enterprises Inc.' };

// ── Setup Alert Notifications ──

interface AlertData {
  id: number;
  alert_type: string;
  instrument_id?: number;
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
  message?: string | null;
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
  if (n == null) return '\u2014';
  return n.toFixed(2);
}

function buildAlertEmbed(
  alert: AlertData,
  setup: SetupData,
  symbol: string,
  sessionLevels: SessionLevels | null
): Record<string, unknown> | null {
  const direction = setup.sweep_direction === 'low' ? 'LONG' : 'SHORT';
  const sweepSide = setup.sweep_direction === 'low' ? 'Low' : 'High';

  if (alert.alert_type === 'approaching' && (setup.phase === 1 || setup.phase === undefined)) {
    return {
      title: '\ud83d\udd38 TOP NOTE \u2014 Sweep Detected',
      description: `${symbol} broke London ${sweepSide} at ${fmt(alert.sweep_level)}`,
      color: 16763904,
      fields: [
        { name: 'London High', value: fmt(sessionLevels?.london_high), inline: true },
        { name: 'London Low', value: fmt(sessionLevels?.london_low), inline: true },
        { name: 'Sweep', value: `${sweepSide} at ${fmt(alert.sweep_level)}`, inline: true },
        { name: 'Status', value: 'Watching for Break of Structure...', inline: false },
      ],
      footer: FOOTER,
      timestamp: new Date().toISOString(),
    };
  }

  if (alert.alert_type === 'approaching' && setup.phase === 2) {
    // Parse BOS level from message
    const bosMatch = alert.message?.match(/at\s+([\d.]+)\.\s+Structure shifted\s+(\w+)/);
    const bosLevel = bosMatch ? bosMatch[1] : '\u2014';
    const bosDir = bosMatch ? bosMatch[2] : (setup.sweep_direction === 'low' ? 'bullish' : 'bearish');

    return {
      title: '\u25c6 HEART NOTE \u2014 Break of Structure',
      description: `${symbol} structure shifted ${bosDir} at ${bosLevel}`,
      color: 16763904,
      fields: [
        { name: 'Sweep', value: `London ${sweepSide} at ${fmt(alert.sweep_level)}`, inline: true },
        { name: 'BOS Level', value: bosLevel, inline: true },
        { name: 'Status', value: 'Watching for FVG retracement...', inline: false },
        { name: '', value: '**[Open Mtrade \u2192](https://mtrade.lrxradar.com/app)**', inline: false },
      ],
      footer: FOOTER,
      timestamp: new Date().toISOString(),
    };
  }

  if (alert.alert_type === 'approaching') {
    return {
      title: '\ud83d\udd38 TOP NOTE \u2014 Setup Approaching',
      description: `${symbol} \u2014 ${direction} developing`,
      color: 16763904,
      fields: [
        { name: 'Sweep', value: `${sweepSide} at ${fmt(alert.sweep_level)}`, inline: true },
        { name: 'Status', value: alert.message || 'Watching...', inline: false },
      ],
      footer: FOOTER,
      timestamp: new Date().toISOString(),
    };
  }

  if (alert.alert_type === 'ready') {
    return {
      title: '\ud83d\udd34 BASE NOTE \u2014 Setup Confirmed',
      description: `${symbol} \u2014 ${direction} setup forming`,
      color: 16525628,
      fields: [
        { name: 'Entry', value: fmt(alert.entry_price), inline: true },
        { name: 'Target', value: fmt(alert.target_price), inline: true },
        { name: 'Stop', value: fmt(alert.stop_price), inline: true },
        { name: 'R:R', value: `1:${fmt(alert.risk_reward)}`, inline: true },
        { name: 'FVG', value: `${fmt(alert.fvg_low)} \u2013 ${fmt(alert.fvg_high)}`, inline: true },
        { name: 'IFVG', value: alert.ifvg_high != null ? `${fmt(alert.ifvg_low)} \u2013 ${fmt(alert.ifvg_high)}` : '\u2014', inline: true },
        { name: 'Signal', value: 'Continuation confirmed. Waiting for hold...', inline: false },
      ],
      footer: FOOTER,
      timestamp: new Date().toISOString(),
    };
  }

  if (alert.alert_type === 'execute') {
    const fields: Record<string, unknown>[] = [
      { name: 'Entry', value: `**${fmt(alert.entry_price)}**`, inline: true },
      { name: 'Target', value: `**${fmt(alert.target_price)}**`, inline: true },
      { name: 'Stop', value: `**${fmt(alert.stop_price)}**`, inline: true },
      { name: 'R:R', value: `**1:${fmt(alert.risk_reward)}**`, inline: true },
      { name: 'Sweep', value: `London ${sweepSide} at ${fmt(alert.sweep_level)}`, inline: true },
    ];

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

    return {
      title: '\ud83d\udea8 ACCORD \u2014 ALL NOTES ALIGNED',
      description: `**${symbol} \u2014 ${direction} NOW**\nEntry: ${fmt(alert.entry_price)} \u2192 Target: ${fmt(alert.target_price)}\nStop: ${fmt(alert.stop_price)} \u00b7 R:R 1:${fmt(alert.risk_reward)}`,
      color: 16396084,
      fields,
      footer: FOOTER,
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

/** Map alert_type to the notify_* toggle key */
function getNotifyKey(alertType: string): keyof UserSettings | null {
  switch (alertType) {
    case 'approaching': return 'notify_sweep';
    case 'ready': return 'notify_ready';
    case 'execute': return 'notify_execute';
    default: return null;
  }
}

/** Send a setup alert to all enabled users, with personalized compliance for ACCORD alerts */
export async function sendDiscordAlertToAll(
  env: Env,
  alert: AlertData,
  setup: SetupData,
  symbol: string,
  sessionLevels: SessionLevels | null
): Promise<boolean> {
  const embed = buildAlertEmbed(alert, setup, symbol, sessionLevels);
  if (!embed) return false;

  const notifyKey = getNotifyKey(alert.alert_type);
  const users = await getEnabledWebhookUsers(env);
  let anySent = false;

  for (const u of users) {
    if (notifyKey && !u[notifyKey]) continue;
    if (!u.discord_webhook_url) continue;

    // For ACCORD alerts, add personalized compliance summary
    let userEmbed = { ...embed };
    if (alert.alert_type === 'execute' && alert.entry_price != null && alert.stop_price != null) {
      try {
        const complianceField = await getComplianceSummary(env, u.user_id, {
          instrument_id: alert.instrument_id || 2,
          entry_price: alert.entry_price,
          target_price: alert.target_price,
          stop_price: alert.stop_price,
        });
        if (complianceField) {
          const fields = [...(userEmbed.fields as Record<string, unknown>[])];
          // Insert compliance field before the last field (Open Mtrade link)
          fields.splice(fields.length - 1, 0, complianceField);
          userEmbed = { ...userEmbed, fields };
        }
      } catch (err) {
        console.error('Compliance summary error for user:', u.user_id, err);
      }
    }

    const sent = await postDiscord(u.discord_webhook_url, { embeds: [userEmbed] });
    if (sent) anySent = true;
  }

  return anySent;
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
  webhookUrl: string,
  account: AccountInfo,
  metrics: DrawdownMetrics
): Promise<boolean> {
  const isCritical = metrics.drawdown_pct >= 85;
  const remaining = metrics.drawdown_limit - metrics.drawdown_used;

  const embed = {
    title: isCritical
      ? '\ud83d\udd34 REDLINE CRITICAL \u2014 Drawdown Alert'
      : '\u26a0\ufe0f REDLINE WARNING \u2014 Drawdown Alert',
    description: `Alpha Futures ${account.label}: Drawdown at ${Math.round(metrics.drawdown_pct)}%`,
    color: isCritical ? 16396084 : 16776960,
    fields: [
      { name: 'Used', value: `$${metrics.drawdown_used.toFixed(2)} / $${metrics.drawdown_limit.toFixed(2)}`, inline: true },
      { name: 'Remaining', value: `$${remaining.toFixed(2)}`, inline: true },
      { name: 'Balance', value: `$${metrics.balance.toFixed(2)}`, inline: true },
    ],
    footer: FOOTER,
  };

  return postDiscord(webhookUrl, { embeds: [embed] });
}

// ── Consistency Warning ──

interface ConsistencyMetrics {
  consistency_pct: number;
  consistency_limit: number;
  best_day: number;
  total_pnl: number;
}

export async function sendConsistencyWarning(
  webhookUrl: string,
  account: AccountInfo,
  metrics: ConsistencyMetrics
): Promise<boolean> {
  const headroom = metrics.consistency_limit - (100 - metrics.consistency_pct);

  const embed = {
    title: '\u26a0\ufe0f REV LIMIT WARNING \u2014 Consistency Alert',
    description: `Alpha Futures ${account.label}: Best day is ${(100 - metrics.consistency_pct).toFixed(0)}% of total profit (limit: ${metrics.consistency_limit}%)`,
    color: 16776960,
    fields: [
      { name: 'Best Day', value: `$${metrics.best_day.toFixed(2)}`, inline: true },
      { name: 'Total Profit', value: `$${metrics.total_pnl.toFixed(2)}`, inline: true },
      { name: 'Headroom', value: `${headroom.toFixed(1)}% left`, inline: true },
    ],
    footer: FOOTER,
  };

  return postDiscord(webhookUrl, { embeds: [embed] });
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

export async function sendSetupResultToAll(
  env: Env,
  result: SetupResult
): Promise<boolean> {
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
      { name: 'R:R Achieved', value: `1:${result.actual_rr != null ? result.actual_rr.toFixed(1) : '\u2014'}`, inline: true },
    ],
    footer: FOOTER,
  };

  const users = await getEnabledWebhookUsers(env);
  let anySent = false;
  for (const u of users) {
    if (!u.notify_setup_result || !u.discord_webhook_url) continue;
    const sent = await postDiscord(u.discord_webhook_url, { embeds: [embed] });
    if (sent) anySent = true;
  }
  return anySent;
}

// ── Test Notification ──

export async function sendTestNotification(webhookUrl: string): Promise<boolean> {
  const embed = {
    title: '\ud83d\udd14 Mtrade notifications are working!',
    description: `Connected at ${new Date().toISOString()}`,
    color: 3461464,
    footer: FOOTER,
    timestamp: new Date().toISOString(),
  };

  return postDiscord(webhookUrl, { embeds: [embed] });
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
