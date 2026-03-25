import { Env } from './types';
import { sendDiscordAlertToAll, sendSetupResultToAll } from './notifications';

// ── Timezone Helpers ──

/** Get current ET hour as a decimal (e.g. 14.5 = 2:30 PM ET) */
function getETHour(date: Date = new Date()): number {
  const etStr = date.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
  const timePart = etStr.split(', ')[1] || etStr.split(' ')[1] || '0:0';
  const parts = timePart.split(':');
  return parseInt(parts[0], 10) + parseInt(parts[1] || '0', 10) / 60;
}

/** Get current date string in ET (YYYY-MM-DD) */
function getETDate(date: Date = new Date()): string {
  const etStr = date.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etStr);
  const y = etDate.getFullYear();
  const m = String(etDate.getMonth() + 1).padStart(2, '0');
  const d = String(etDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get ET day of week (0=Sun, 6=Sat) */
function getETDayOfWeek(date: Date = new Date()): number {
  const etStr = date.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(etStr).getDay();
}

/** Check if futures market is open: Sun 6PM ET through Fri 5PM ET */
function isFuturesMarketOpen(date: Date = new Date()): boolean {
  const day = getETDayOfWeek(date);
  const hour = getETHour(date);

  // Saturday: closed
  if (day === 6) return false;
  // Sunday: open after 6PM
  if (day === 0) return hour >= 18;
  // Friday: open until 5PM
  if (day === 5) return hour < 17;
  // Mon-Thu: open all day
  return true;
}

const INSTRUMENTS = [
  { id: 1, symbol: 'ES', tick_size: 0.25 },
  { id: 2, symbol: 'NQ', tick_size: 0.25 },
];

// ── Strategy Config ──

interface StrategyConfig {
  user_id: string;
  trade_london_sweep: number;
  trade_ny_sweep: number;
  fvg_scan_1h: number;
  fvg_scan_4h: number;
  continuation_require_ifvg: number;
  min_rr: number;
  min_confidence: number;
  max_contracts_override: number | null;
  default_contracts: number;
  kill_switch: number;
  kill_switch_date: string | null;
}

const DEFAULT_CONFIG: Omit<StrategyConfig, 'user_id'> = {
  trade_london_sweep: 1,
  trade_ny_sweep: 1,
  fvg_scan_1h: 1,
  fvg_scan_4h: 1,
  continuation_require_ifvg: 0,
  min_rr: 2.0,
  min_confidence: 60,
  max_contracts_override: null,
  default_contracts: 1,
  kill_switch: 0,
  kill_switch_date: null,
};

async function loadStrategyConfigs(env: Env): Promise<StrategyConfig[]> {
  const { results: users } = await env.DB.prepare(
    'SELECT DISTINCT user_id FROM alpha_accounts WHERE is_active = 1'
  ).all<{ user_id: string }>();

  if (users.length === 0) return [{ user_id: 'system', ...DEFAULT_CONFIG }];

  const configs: StrategyConfig[] = [];
  for (const u of users) {
    const row = await env.DB.prepare(
      `SELECT user_id, trade_london_sweep, trade_ny_sweep, fvg_scan_1h, fvg_scan_4h,
              continuation_require_ifvg, min_rr, min_confidence, max_contracts_override,
              default_contracts, kill_switch, kill_switch_date
       FROM strategy_config WHERE user_id = ?`
    ).bind(u.user_id).first<StrategyConfig>();
    configs.push(row ?? { user_id: u.user_id, ...DEFAULT_CONFIG });
  }
  return configs;
}

/** Merge multiple user configs into a single effective config for the engine. */
function mergeConfigs(configs: StrategyConfig[]): Omit<StrategyConfig, 'user_id'> {
  if (configs.length === 0) return { ...DEFAULT_CONFIG };
  if (configs.length === 1) {
    const { user_id: _, ...rest } = configs[0];
    return rest;
  }
  return {
    trade_london_sweep: configs.some(c => c.trade_london_sweep) ? 1 : 0,
    trade_ny_sweep: configs.some(c => c.trade_ny_sweep) ? 1 : 0,
    fvg_scan_1h: configs.some(c => c.fvg_scan_1h) ? 1 : 0,
    fvg_scan_4h: configs.some(c => c.fvg_scan_4h) ? 1 : 0,
    continuation_require_ifvg: configs.every(c => c.continuation_require_ifvg) ? 1 : 0,
    min_rr: Math.min(...configs.map(c => c.min_rr)),
    min_confidence: Math.min(...configs.map(c => c.min_confidence)),
    max_contracts_override: configs.some(c => c.max_contracts_override === null)
      ? null
      : Math.max(...configs.map(c => c.max_contracts_override!)),
    default_contracts: Math.max(...configs.map(c => c.default_contracts)),
    kill_switch: configs.every(c => c.kill_switch) ? 1 : 0,
    kill_switch_date: configs[0]?.kill_switch_date ?? null,
  };
}

function calculateContracts(config: Omit<StrategyConfig, 'user_id'>): number {
  let contracts = config.default_contracts;
  if (config.max_contracts_override !== null && contracts > config.max_contracts_override) {
    contracts = config.max_contracts_override;
  }
  return contracts;
}

// ── 1. Scan for Fair Value Gaps ──

export async function scanForFVGs(
  env: Env,
  fvgConfig?: { fvg_scan_1h: number; fvg_scan_4h: number }
): Promise<void> {
  let timeframes = ['5m', '15m', '1H', '4H'];
  if (fvgConfig) {
    if (!fvgConfig.fvg_scan_1h) timeframes = timeframes.filter(t => t !== '1H');
    if (!fvgConfig.fvg_scan_4h) timeframes = timeframes.filter(t => t !== '4H');
  }

  for (const inst of INSTRUMENTS) {
    for (const tf of timeframes) {
      try {
        const { results: candles } = await env.DB.prepare(
          `SELECT id, timestamp, open, high, low, close FROM candles
           WHERE instrument_id = ? AND timeframe = ?
           ORDER BY timestamp DESC LIMIT 20`
        ).bind(inst.id, tf).all<{
          id: number; timestamp: string; open: number; high: number; low: number; close: number;
        }>();

        if (candles.length < 3) continue;

        // Reverse to ascending order
        const asc = candles.slice().reverse();

        for (let i = 0; i <= asc.length - 3; i++) {
          const c1 = asc[i];
          const c2 = asc[i + 1]; // displacement candle
          const c3 = asc[i + 2];

          let type: 'bullish' | 'bearish' | null = null;
          let gapHigh: number;
          let gapLow: number;

          // Bullish FVG: gap between candle 1's high and candle 3's low
          if (c1.high < c3.low) {
            type = 'bullish';
            gapLow = c1.high;
            gapHigh = c3.low;
          }
          // Bearish FVG: gap between candle 3's high and candle 1's low
          else if (c1.low > c3.high) {
            type = 'bearish';
            gapHigh = c1.low;
            gapLow = c3.high;
          }

          if (!type) continue;

          // Check for duplicate
          const existing = await env.DB.prepare(
            `SELECT id FROM fair_value_gaps
             WHERE instrument_id = ? AND timeframe = ? AND timestamp = ?`
          ).bind(inst.id, tf, c2.timestamp).first();

          if (existing) continue;

          await env.DB.prepare(
            `INSERT INTO fair_value_gaps (instrument_id, timeframe, timestamp, high, low, type, status)
             VALUES (?, ?, ?, ?, ?, ?, 'active')`
          ).bind(inst.id, tf, c2.timestamp, gapHigh!, gapLow!, type).run();

          console.log(`FVG detected: ${inst.symbol} ${tf} ${type} at ${gapLow!.toFixed(2)}-${gapHigh!.toFixed(2)}`);
        }
      } catch (err) {
        console.error(`scanForFVGs error ${inst.symbol} ${tf}:`, err);
      }
    }
  }
}

// ── 2. Update FVG Statuses ──

export async function updateFVGStatuses(env: Env): Promise<void> {
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();

  for (const inst of INSTRUMENTS) {
    try {
      // Get latest 1m candle close
      const latest = await env.DB.prepare(
        `SELECT close, high, low FROM candles
         WHERE instrument_id = ? AND timeframe = '1m'
         ORDER BY timestamp DESC LIMIT 1`
      ).bind(inst.id).first<{ close: number; high: number; low: number }>();

      if (!latest) continue;

      // Get active FVGs from last 5 days
      const { results: fvgs } = await env.DB.prepare(
        `SELECT id, type, high, low FROM fair_value_gaps
         WHERE instrument_id = ? AND status = 'active' AND created_at >= ?`
      ).bind(inst.id, fiveDaysAgo).all<{
        id: number; type: string; high: number; low: number;
      }>();

      for (const fvg of fvgs) {
        if (fvg.type === 'bullish') {
          // Price closed below entire zone → inverted
          if (latest.close < fvg.low) {
            await env.DB.prepare(
              `UPDATE fair_value_gaps SET status = 'inverted', inverted_at = datetime('now') WHERE id = ?`
            ).bind(fvg.id).run();
            console.log(`FVG inverted: ${inst.symbol} bullish ${fvg.low.toFixed(2)}-${fvg.high.toFixed(2)}`);
          }
          // Price low touched zone but close stayed above
          else if (latest.low <= fvg.high && latest.low >= fvg.low && latest.close >= fvg.low) {
            await env.DB.prepare(
              `UPDATE fair_value_gaps SET status = 'respected' WHERE id = ?`
            ).bind(fvg.id).run();
          }
        } else if (fvg.type === 'bearish') {
          // Price closed above entire zone → inverted
          if (latest.close > fvg.high) {
            await env.DB.prepare(
              `UPDATE fair_value_gaps SET status = 'inverted', inverted_at = datetime('now') WHERE id = ?`
            ).bind(fvg.id).run();
            console.log(`FVG inverted: ${inst.symbol} bearish ${fvg.low.toFixed(2)}-${fvg.high.toFixed(2)}`);
          }
          // Price high touched zone but close stayed below
          else if (latest.high >= fvg.low && latest.high <= fvg.high && latest.close <= fvg.high) {
            await env.DB.prepare(
              `UPDATE fair_value_gaps SET status = 'respected' WHERE id = ?`
            ).bind(fvg.id).run();
          }
        }
      }
    } catch (err) {
      console.error(`updateFVGStatuses error ${inst.symbol}:`, err);
    }
  }
}

// ── 3. Detect Sweeps ──

interface SweepInfo {
  instrument_id: number;
  symbol: string;
  sweep_direction: 'high' | 'low';
  sweep_level: number;
}

export async function detectSweeps(env: Env): Promise<SweepInfo[]> {
  const todayET = getETDate();
  const etHour = getETHour();

  // London must be closed (after 5AM ET)
  if (etHour < 5) return [];

  const sweeps: SweepInfo[] = [];

  for (const inst of INSTRUMENTS) {
    try {
      const session = await env.DB.prepare(
        `SELECT london_high, london_low FROM sessions
         WHERE date = ? AND instrument_id = ?`
      ).bind(todayET, inst.id).first<{ london_high: number | null; london_low: number | null }>();

      if (!session || session.london_high == null || session.london_low == null) continue;

      // Get latest 1m candle
      const latest = await env.DB.prepare(
        `SELECT timestamp, high, low FROM candles
         WHERE instrument_id = ? AND timeframe = '1m'
         ORDER BY timestamp DESC LIMIT 1`
      ).bind(inst.id).first<{ timestamp: string; high: number; low: number }>();

      if (!latest) continue;

      const brokeLow = latest.low < session.london_low;
      const brokeHigh = latest.high > session.london_high;

      if (brokeLow && brokeHigh) {
        // Both broken — check which was most recent by scanning recent candles
        const { results: recentCandles } = await env.DB.prepare(
          `SELECT timestamp, high, low FROM candles
           WHERE instrument_id = ? AND timeframe = '1m'
           ORDER BY timestamp DESC LIMIT 30`
        ).bind(inst.id).all<{ timestamp: string; high: number; low: number }>();

        let lastHighBreak = '';
        let lastLowBreak = '';
        for (const c of recentCandles) {
          if (c.high > session.london_high && !lastHighBreak) lastHighBreak = c.timestamp;
          if (c.low < session.london_low && !lastLowBreak) lastLowBreak = c.timestamp;
        }

        if (lastLowBreak >= lastHighBreak) {
          sweeps.push({ instrument_id: inst.id, symbol: inst.symbol, sweep_direction: 'low', sweep_level: session.london_low });
        } else {
          sweeps.push({ instrument_id: inst.id, symbol: inst.symbol, sweep_direction: 'high', sweep_level: session.london_high });
        }
      } else if (brokeLow) {
        sweeps.push({ instrument_id: inst.id, symbol: inst.symbol, sweep_direction: 'low', sweep_level: session.london_low });
      } else if (brokeHigh) {
        sweeps.push({ instrument_id: inst.id, symbol: inst.symbol, sweep_direction: 'high', sweep_level: session.london_high });
      }

      if (brokeLow || brokeHigh) {
        const s = sweeps[sweeps.length - 1];
        console.log(`Sweep detected: ${inst.symbol} broke London ${s.sweep_direction} at ${s.sweep_level}`);
      }
    } catch (err) {
      console.error(`detectSweeps error ${inst.symbol}:`, err);
    }
  }

  return sweeps;
}

// ── 4. Setup State Machine ──

interface Setup {
  id: number;
  instrument_id: number;
  phase: number;
  sweep_direction: string | null;
  sweep_level: number | null;
  fvg_id: number | null;
  ifvg_id: number | null;
  entry_price: number | null;
  target_price: number | null;
  stop_price: number | null;
  risk_reward: number | null;
  status: string;
  updated_at: string;
  created_at: string;
}

async function createAlert(
  env: Env,
  setupId: number,
  instrumentId: number,
  alertType: string,
  phase: number,
  message: string,
  data: Record<string, unknown> = {}
): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO setup_alerts (setup_id, instrument_id, alert_type, phase, message,
     sweep_direction, sweep_level, fvg_high, fvg_low, ifvg_high, ifvg_low,
     entry_price, target_price, stop_price, risk_reward)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    setupId, instrumentId, alertType, phase, message,
    data.sweep_direction ?? null, data.sweep_level ?? null,
    data.fvg_high ?? null, data.fvg_low ?? null,
    data.ifvg_high ?? null, data.ifvg_low ?? null,
    data.entry_price ?? null, data.target_price ?? null,
    data.stop_price ?? null, data.risk_reward ?? null
  ).run();
  return result.meta.last_row_id as number;
}

async function sendAlertDiscord(
  env: Env,
  alertId: number,
  alert: { alert_type: string; sweep_direction: string | null; sweep_level: number | null; fvg_high: number | null; fvg_low: number | null; ifvg_high: number | null; ifvg_low: number | null; entry_price: number | null; target_price: number | null; stop_price: number | null; risk_reward: number | null },
  setup: { id: number; phase: number; sweep_direction: string | null; sweep_level: number | null; haiku_analysis_json?: string | null },
  symbol: string,
  sessionLevels: { london_high: number | null; london_low: number | null } | null
): Promise<void> {
  try {
    const sent = await sendDiscordAlertToAll(env, { id: alertId, ...alert }, setup, symbol, sessionLevels);
    if (sent) {
      await env.DB.prepare('UPDATE setup_alerts SET discord_sent = 1 WHERE id = ?').bind(alertId).run();
    }
  } catch (err) {
    console.error('Discord alert error:', err);
  }
}

async function triggerHaikuAnalysis(env: Env, alertId: number): Promise<number | null> {
  if (!env.ANTHROPIC_API_KEY) return null;

  try {
    const alert = await env.DB.prepare(
      `SELECT sa.*, i.symbol, i.name, i.tick_size, i.tick_value
       FROM setup_alerts sa LEFT JOIN instruments i ON sa.instrument_id = i.id
       WHERE sa.id = ?`
    ).bind(alertId).first<Record<string, unknown>>();
    if (!alert) return null;

    const systemPrompt = 'You are an ICT (Inner Circle Trader) strategy analyst. Analyze futures trading setups using ICT methodology. Respond ONLY with valid JSON.';
    const userPrompt = `Analyze this trading setup:
Instrument: ${alert.symbol} (${alert.name})
Sweep: Price broke London ${alert.sweep_direction} at ${alert.sweep_level}
FVG: ${alert.fvg_low} - ${alert.fvg_high}
IFVG: ${alert.ifvg_low && alert.ifvg_high ? alert.ifvg_low + ' - ' + alert.ifvg_high : 'none'}
Entry: ${alert.entry_price}, Target: ${alert.target_price}, Stop: ${alert.stop_price}
R:R: 1:${alert.risk_reward}
Respond: {"confidence":0-100,"signal":"ACCORD"|"BASE NOTE"|"HEART NOTE"|"TOP NOTE"|"NO TRADE","fragrance":"Prestige Silver"|"Armani Stronger With You"|"YSL Y","summary":"2-3 sentences","warnings":["array"],"contracts_suggestion":"recommendation"}`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await resp.json<{ content: { text: string }[] }>();
    let text = data.content[0].text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // Store analysis on the setup
    let confidence: number | null = null;
    try {
      const analysis = JSON.parse(text);
      if (typeof analysis.confidence === 'number') confidence = analysis.confidence;
    } catch { /* parsing error — confidence stays null */ }

    if (alert.setup_id) {
      await env.DB.prepare(
        `UPDATE setups SET haiku_analysis_json = ?, confidence = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(text, confidence, alert.setup_id).run();
    }
    return confidence;
  } catch (err) {
    console.error('Haiku analysis error:', err);
    return null;
  }
}

export async function runSetupStateMachine(env: Env): Promise<void> {
  const now = new Date();
  const todayET = getETDate(now);
  const etHour = getETHour(now);

  // Load strategy configs for users with active Alpha Futures accounts
  const configs = await loadStrategyConfigs(env);

  // Auto-reset kill switches from previous days
  for (const cfg of configs) {
    if (cfg.kill_switch === 1 && cfg.kill_switch_date && cfg.kill_switch_date !== todayET) {
      await env.DB.prepare(
        `UPDATE strategy_config SET kill_switch = 0, kill_switch_date = NULL, updated_at = datetime('now') WHERE user_id = ?`
      ).bind(cfg.user_id).run();
      cfg.kill_switch = 0;
      cfg.kill_switch_date = null;
      console.log(`Kill switch auto-reset for user ${cfg.user_id}`);
    }
  }

  const effectiveConfig = mergeConfigs(configs);
  const killSwitchActive = configs.length > 0 &&
    configs.every(c => c.kill_switch === 1 && c.kill_switch_date === todayET);

  if (killSwitchActive) {
    console.log('Kill switch active — skipping alert creation');
  }

  for (const inst of INSTRUMENTS) {
    try {
      // Get or create today's setup for this instrument
      let setup = await env.DB.prepare(
        `SELECT * FROM setups
         WHERE instrument_id = ? AND date = ? AND status IN ('forming', 'ready')
         ORDER BY created_at DESC LIMIT 1`
      ).bind(inst.id, todayET).first<Setup>();

      // Check expiry first
      if (setup) {
        if ((setup.phase <= 1 && etHour >= 15) ||
            (setup.phase === 2 && setup.updated_at)) {
          // Phase 0/1 after 3PM → expire
          if (setup.phase <= 1 && etHour >= 15) {
            await env.DB.prepare(
              `UPDATE setups SET status = 'expired', updated_at = datetime('now') WHERE id = ?`
            ).bind(setup.id).run();
            console.log(`Setup expired: ${inst.symbol} phase ${setup.phase} after 3PM ET`);
            try {
              await sendSetupResultToAll(env, {
                symbol: inst.symbol,
                direction: setup.sweep_direction === 'low' ? 'Long' : 'Short',
                entry_price: setup.entry_price, exit_price: null,
                pnl: null, risk_reward: setup.risk_reward, actual_rr: null,
                status: 'expired',
              });
            } catch { /* non-critical */ }
            continue;
          }
          // Phase 2 stale for 2 hours → expire
          if (setup.phase === 2) {
            const updatedAt = new Date(setup.updated_at + 'Z');
            const hoursElapsed = (now.getTime() - updatedAt.getTime()) / 3600000;
            if (hoursElapsed >= 2) {
              await env.DB.prepare(
                `UPDATE setups SET status = 'expired', updated_at = datetime('now') WHERE id = ?`
              ).bind(setup.id).run();
              console.log(`Setup expired: ${inst.symbol} phase 2 stale for ${hoursElapsed.toFixed(1)}h`);
              try {
                await sendSetupResultToAll(env, {
                  symbol: inst.symbol,
                  direction: setup.sweep_direction === 'low' ? 'Long' : 'Short',
                  entry_price: setup.entry_price, exit_price: null,
                  pnl: null, risk_reward: setup.risk_reward, actual_rr: null,
                  status: 'expired',
                });
              } catch { /* non-critical */ }
              continue;
            }
          }
        }
      }

      // Create setup if none exists and London hasn't closed yet or we're still in window
      if (!setup) {
        const result = await env.DB.prepare(
          `INSERT INTO setups (instrument_id, date, phase, status, user_id)
           VALUES (?, ?, 0, 'forming', 'system')`
        ).bind(inst.id, todayET).run();
        setup = await env.DB.prepare('SELECT * FROM setups WHERE id = ?')
          .bind(result.meta.last_row_id).first<Setup>();
        if (!setup) continue;
      }

      // ── Phase 0 → Phase 1: London Range → Sweep ──
      if (setup.phase === 0) {
        if (etHour < 5) continue; // London not done
        if (!effectiveConfig.trade_london_sweep) continue; // London sweeps disabled

        const sweeps = await detectSweeps(env);
        const sweep = sweeps.find(s => s.instrument_id === inst.id);
        if (!sweep) continue;

        await env.DB.prepare(
          `UPDATE setups SET phase = 1, sweep_direction = ?, sweep_level = ?, updated_at = datetime('now')
           WHERE id = ?`
        ).bind(sweep.sweep_direction, sweep.sweep_level, setup.id).run();

        const msg = `${inst.symbol}: London ${sweep.sweep_direction} swept at ${sweep.sweep_level.toFixed(2)}. Sillage trail detected.`;
        console.log(`Setup advanced to phase 1: ${inst.symbol}`);

        if (!killSwitchActive) {
          const alertData = {
            alert_type: 'approaching' as const,
            sweep_direction: sweep.sweep_direction,
            sweep_level: sweep.sweep_level,
            fvg_high: null, fvg_low: null, ifvg_high: null, ifvg_low: null,
            entry_price: null, target_price: null, stop_price: null, risk_reward: null,
          };
          const alertId1 = await createAlert(env, setup.id, inst.id, 'approaching', 1, msg, alertData);

          // Get session levels for Discord embed
          const session1 = await env.DB.prepare(
            'SELECT london_high, london_low FROM sessions WHERE date = ? AND instrument_id = ?'
          ).bind(todayET, inst.id).first<{ london_high: number | null; london_low: number | null }>();
          await sendAlertDiscord(env, alertId1, alertData, { id: setup.id, phase: 1, sweep_direction: sweep.sweep_direction, sweep_level: sweep.sweep_level }, inst.symbol, session1 ?? null);
        }
        setup.phase = 1;
        setup.sweep_direction = sweep.sweep_direction;
        setup.sweep_level = sweep.sweep_level;
      }

      // ── Phase 1 → Phase 2: Sweep → FVG Retracement ──
      if (setup.phase === 1 && setup.sweep_direction) {
        const latest = await env.DB.prepare(
          `SELECT close FROM candles WHERE instrument_id = ? AND timeframe = '1m'
           ORDER BY timestamp DESC LIMIT 1`
        ).bind(inst.id).first<{ close: number }>();
        if (!latest) continue;

        const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

        // For LOW sweep (going long): look for bullish FVG above current price
        // For HIGH sweep (going short): look for bearish FVG below current price
        const fvgType = setup.sweep_direction === 'low' ? 'bullish' : 'bearish';

        const { results: fvgs } = await env.DB.prepare(
          `SELECT id, high, low, timeframe FROM fair_value_gaps
           WHERE instrument_id = ? AND type = ? AND status IN ('active', 'respected')
             AND timeframe IN ('1H', '4H') AND created_at >= ?
           ORDER BY timestamp DESC`
        ).bind(inst.id, fvgType, threeDaysAgo).all<{
          id: number; high: number; low: number; timeframe: string;
        }>();

        if (fvgs.length === 0) continue;

        // Find nearest FVG that price is in or near (within 0.3%)
        let matchedFvg: typeof fvgs[0] | null = null;
        for (const fvg of fvgs) {
          const inZone = latest.close >= fvg.low && latest.close <= fvg.high;
          const threshold = latest.close * 0.003;
          const nearZone = setup.sweep_direction === 'low'
            ? (latest.close <= fvg.high + threshold && latest.close >= fvg.low - threshold)
            : (latest.close >= fvg.low - threshold && latest.close <= fvg.high + threshold);

          if (inZone || nearZone) {
            matchedFvg = fvg;
            break;
          }
        }

        if (!matchedFvg) continue;

        await env.DB.prepare(
          `UPDATE setups SET phase = 2, fvg_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(matchedFvg.id, setup.id).run();

        const msg = `${inst.symbol}: Retracing into ${matchedFvg.timeframe} ${fvgType} FVG (${matchedFvg.low.toFixed(2)} – ${matchedFvg.high.toFixed(2)})`;
        console.log(`Setup advanced to phase 2: ${inst.symbol}`);
        if (!killSwitchActive) {
          await createAlert(env, setup.id, inst.id, 'approaching', 2, msg, {
            sweep_direction: setup.sweep_direction,
            sweep_level: setup.sweep_level,
            fvg_high: matchedFvg.high,
            fvg_low: matchedFvg.low,
          });
        }
        setup.phase = 2;
        setup.fvg_id = matchedFvg.id;
      }

      // ── Phase 2 → Phase 3: FVG Retracement → Continuation ──
      if (setup.phase === 2 && setup.sweep_direction) {
        // Look for continuation signal after phase 2 started
        const updatedAt = setup.updated_at;

        let continuationFvg: { id: number; high: number; low: number; type: string; status: string } | null = null;
        let isIFVG = false;

        if (setup.sweep_direction === 'low') {
          // Going long: look for bullish continuation
          // Option A: new bullish FVG on 5m/15m
          const newFvg = await env.DB.prepare(
            `SELECT id, high, low, type, status FROM fair_value_gaps
             WHERE instrument_id = ? AND type = 'bullish' AND timeframe IN ('5m', '15m')
               AND created_at > ? ORDER BY created_at DESC LIMIT 1`
          ).bind(inst.id, updatedAt).first<{ id: number; high: number; low: number; type: string; status: string }>();

          if (newFvg) {
            continuationFvg = newFvg;
          } else {
            // Option B: bearish FVG that inverted (now acts as support)
            const invertedFvg = await env.DB.prepare(
              `SELECT id, high, low, type, status FROM fair_value_gaps
               WHERE instrument_id = ? AND type = 'bearish' AND status = 'inverted'
                 AND inverted_at > ? ORDER BY inverted_at DESC LIMIT 1`
            ).bind(inst.id, updatedAt).first<{ id: number; high: number; low: number; type: string; status: string }>();
            if (invertedFvg) {
              continuationFvg = invertedFvg;
              isIFVG = true;
            }
          }
        } else {
          // Going short: look for bearish continuation
          const newFvg = await env.DB.prepare(
            `SELECT id, high, low, type, status FROM fair_value_gaps
             WHERE instrument_id = ? AND type = 'bearish' AND timeframe IN ('5m', '15m')
               AND created_at > ? ORDER BY created_at DESC LIMIT 1`
          ).bind(inst.id, updatedAt).first<{ id: number; high: number; low: number; type: string; status: string }>();

          if (newFvg) {
            continuationFvg = newFvg;
          } else {
            const invertedFvg = await env.DB.prepare(
              `SELECT id, high, low, type, status FROM fair_value_gaps
               WHERE instrument_id = ? AND type = 'bullish' AND status = 'inverted'
                 AND inverted_at > ? ORDER BY inverted_at DESC LIMIT 1`
            ).bind(inst.id, updatedAt).first<{ id: number; high: number; low: number; type: string; status: string }>();
            if (invertedFvg) {
              continuationFvg = invertedFvg;
              isIFVG = true;
            }
          }
        }

        if (!continuationFvg) continue;

        // Config: require IFVG for continuation
        if (effectiveConfig.continuation_require_ifvg && !isIFVG) {
          console.log(`${inst.symbol}: Non-IFVG continuation skipped (continuation_require_ifvg=1)`);
          continue;
        }

        // Get session levels for target calculation
        const session = await env.DB.prepare(
          `SELECT london_high, london_low FROM sessions WHERE date = ? AND instrument_id = ?`
        ).bind(todayET, inst.id).first<{ london_high: number; london_low: number }>();

        let entry: number, target: number, stop: number;
        const tickBuffer = 2 * inst.tick_size;

        if (setup.sweep_direction === 'low') {
          // Long setup
          entry = continuationFvg.high;
          target = session?.london_high ?? entry + 20;
          stop = continuationFvg.low - tickBuffer;
        } else {
          // Short setup
          entry = continuationFvg.low;
          target = session?.london_low ?? entry - 20;
          stop = continuationFvg.high + tickBuffer;
        }

        const rr = Math.abs(target - entry) / Math.abs(entry - stop);

        const updateFields = isIFVG
          ? `phase = 3, ifvg_id = ?, entry_price = ?, target_price = ?, stop_price = ?, risk_reward = ?, updated_at = datetime('now')`
          : `phase = 3, fvg_id = ?, entry_price = ?, target_price = ?, stop_price = ?, risk_reward = ?, updated_at = datetime('now')`;

        await env.DB.prepare(
          `UPDATE setups SET ${updateFields} WHERE id = ?`
        ).bind(continuationFvg.id, entry, target, stop, Math.round(rr * 100) / 100, setup.id).run();

        const direction = setup.sweep_direction === 'low' ? 'Long' : 'Short';
        const msg = `${inst.symbol}: ${isIFVG ? 'IFVG' : 'FVG'} continuation confirmed. ${direction} at ${entry.toFixed(2)} → ${target.toFixed(2)}. Stop ${stop.toFixed(2)}. R:R 1:${rr.toFixed(1)}`;

        console.log(`Setup advanced to phase 3: ${inst.symbol}`);

        if (!killSwitchActive) {
          const readyAlertData = {
            alert_type: 'ready' as const,
            sweep_direction: setup.sweep_direction,
            sweep_level: setup.sweep_level,
            fvg_high: continuationFvg.high,
            fvg_low: continuationFvg.low,
            ifvg_high: isIFVG ? continuationFvg.high : null,
            ifvg_low: isIFVG ? continuationFvg.low : null,
            entry_price: entry,
            target_price: target,
            stop_price: stop,
            risk_reward: Math.round(rr * 100) / 100,
          };
          const alertId = await createAlert(env, setup.id, inst.id, 'ready', 3, msg, readyAlertData);

          // Haiku analysis + confidence check
          const confidence = await triggerHaikuAnalysis(env, alertId);
          if (confidence !== null && confidence < effectiveConfig.min_confidence) {
            console.log(`${inst.symbol}: Confidence ${confidence}% below minimum ${effectiveConfig.min_confidence}% — setup skipped`);
            await env.DB.prepare(
              `UPDATE setups SET status = 'skipped', updated_at = datetime('now') WHERE id = ?`
            ).bind(setup.id).run();
            continue;
          }

          // Send Discord notification
          await sendAlertDiscord(env, alertId, readyAlertData, { id: setup.id, phase: 3, sweep_direction: setup.sweep_direction, sweep_level: setup.sweep_level }, inst.symbol, session ?? null);
        }

        setup.phase = 3;
      }

      // ── Phase 3 → Phase 4: Continuation → Entry ──
      if (setup.phase === 3 && setup.sweep_direction) {
        const gapId = setup.ifvg_id || setup.fvg_id;
        if (!gapId) continue;

        const gap = await env.DB.prepare(
          `SELECT high, low FROM fair_value_gaps WHERE id = ?`
        ).bind(gapId).first<{ high: number; low: number }>();
        if (!gap) continue;

        // Check latest 15m candles — need 2 candles holding
        const { results: recent15m } = await env.DB.prepare(
          `SELECT close, timestamp FROM candles
           WHERE instrument_id = ? AND timeframe = '15m'
           ORDER BY timestamp DESC LIMIT 3`
        ).bind(inst.id).all<{ close: number; timestamp: string }>();

        if (recent15m.length < 2) continue;

        let holding = true;
        for (const c of recent15m.slice(0, 2)) {
          if (setup.sweep_direction === 'low') {
            // For longs: price must not close below gap low
            if (c.close < gap.low) { holding = false; break; }
          } else {
            // For shorts: price must not close above gap high
            if (c.close > gap.high) { holding = false; break; }
          }
        }

        if (!holding) continue;

        // Get session levels for final calculation
        const session = await env.DB.prepare(
          `SELECT london_high, london_low FROM sessions WHERE date = ? AND instrument_id = ?`
        ).bind(todayET, inst.id).first<{ london_high: number; london_low: number }>();

        const tickBuffer = 2 * inst.tick_size;
        let entry: number, target: number, stop: number;

        if (setup.sweep_direction === 'low') {
          entry = gap.high;
          target = session?.london_high ?? entry + 20;
          stop = gap.low - tickBuffer;
        } else {
          entry = gap.low;
          target = session?.london_low ?? entry - 20;
          stop = gap.high + tickBuffer;
        }

        const rr = Math.abs(target - entry) / Math.abs(entry - stop);
        const rrRounded = Math.round(rr * 100) / 100;

        // Check minimum R:R
        if (rrRounded < effectiveConfig.min_rr) {
          await env.DB.prepare(
            `UPDATE setups SET status = 'skipped', updated_at = datetime('now') WHERE id = ?`
          ).bind(setup.id).run();
          console.log(`${inst.symbol}: R:R 1:${rrRounded} below minimum 1:${effectiveConfig.min_rr} — setup skipped`);
          continue;
        }

        const direction = setup.sweep_direction === 'low' ? 'Buy' : 'Sell';
        const contracts = calculateContracts(effectiveConfig);

        await env.DB.prepare(
          `UPDATE setups SET phase = 4, status = 'ready',
           entry_price = ?, target_price = ?, stop_price = ?, risk_reward = ?,
           updated_at = datetime('now') WHERE id = ?`
        ).bind(entry, target, stop, rrRounded, setup.id).run();

        const msg = `ACCORD — all notes aligned. ${direction} ${inst.symbol} ${contracts}ct at ${entry.toFixed(2)} → Target ${target.toFixed(2)}. Stop ${stop.toFixed(2)}. R:R 1:${rr.toFixed(1)}`;

        console.log(`Setup advanced to phase 4: ${inst.symbol} — ACCORD`);

        if (!killSwitchActive) {
          const execAlertData = {
            alert_type: 'execute' as const,
            sweep_direction: setup.sweep_direction,
            sweep_level: setup.sweep_level,
            fvg_high: gap.high,
            fvg_low: gap.low,
            ifvg_high: setup.ifvg_id ? gap.high : null,
            ifvg_low: setup.ifvg_id ? gap.low : null,
            entry_price: entry,
            target_price: target,
            stop_price: stop,
            risk_reward: rrRounded,
          };
          const alertId = await createAlert(env, setup.id, inst.id, 'execute', 4, msg, execAlertData);

          // Final Haiku analysis + confidence check
          const confidence = await triggerHaikuAnalysis(env, alertId);
          if (confidence !== null && confidence < effectiveConfig.min_confidence) {
            console.log(`${inst.symbol}: Confidence ${confidence}% below minimum ${effectiveConfig.min_confidence}% — setup skipped`);
            await env.DB.prepare(
              `UPDATE setups SET status = 'skipped', updated_at = datetime('now') WHERE id = ?`
            ).bind(setup.id).run();
            continue;
          }

          // Reload setup to get haiku_analysis_json
          const updatedSetup = await env.DB.prepare('SELECT id, phase, sweep_direction, sweep_level, haiku_analysis_json FROM setups WHERE id = ?')
            .bind(setup.id).first<{ id: number; phase: number; sweep_direction: string | null; sweep_level: number | null; haiku_analysis_json: string | null }>();

          // Send Discord ACCORD notification
          await sendAlertDiscord(env, alertId, execAlertData, updatedSetup ?? { id: setup.id, phase: 4, sweep_direction: setup.sweep_direction, sweep_level: setup.sweep_level }, inst.symbol, session ?? null);
        }
      }
    } catch (err) {
      console.error(`runSetupStateMachine error ${inst.symbol}:`, err);
    }
  }

  // Store last run timestamp
  try {
    await env.DB.prepare(
      `INSERT INTO engine_meta (key, value) VALUES ('last_run', datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = datetime('now')`
    ).run();
  } catch {
    // engine_meta table might not exist yet, that's ok
  }
}

// ── 5. Main entry point for cron ──

export async function runStrategyEngine(env: Env): Promise<void> {
  if (!isFuturesMarketOpen()) {
    console.log('Strategy engine: market closed, skipping');
    return;
  }

  // Load configs for FVG timeframe filtering (FVG scanning always runs globally)
  const configs = await loadStrategyConfigs(env);
  const fvgConfig = mergeConfigs(configs);

  await scanForFVGs(env, { fvg_scan_1h: fvgConfig.fvg_scan_1h, fvg_scan_4h: fvgConfig.fvg_scan_4h });
  await updateFVGStatuses(env);
  await runSetupStateMachine(env);
}
