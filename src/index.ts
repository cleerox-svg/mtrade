import { Env, JwtPayload, User } from './types';
import { verifyJwt } from './jwt';
import { handleGoogleRedirect, handleCallback, handleLogout } from './auth';
import { loginPage, appPage } from './pages';
import { handleApiRoutes } from './api';
import { fetchAndStoreCandles, computeSessionLevels } from './market-data';
import { runStrategyEngine } from './strategy-engine';
import { sendDrawdownWarning, sendConsistencyWarning, hasNotificationToday, logNotification, getUserSettings } from './notifications';
import { getManifestJson, getServiceWorkerJs, getIconSvg, getFaviconSvg } from './pwa';

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  const match = header.split(';').map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return match ? match.substring(name.length + 1) : null;
}

async function getJwtPayload(request: Request, env: Env): Promise<JwtPayload | null> {
  const token = getCookie(request, 'mtrade_session');
  if (!token) return null;
  return verifyJwt(token, env.JWT_SECRET);
}

async function handleBuiltinApi(
  request: Request,
  env: Env,
  path: string,
  user: JwtPayload
): Promise<Response | null> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  if (path === '/api/health') {
    return json({
      status: 'ok',
      user: { email: user.email, name: user.name, role: user.role },
      timestamp: new Date().toISOString(),
    });
  }

  if (path === '/api/me') {
    const fullUser = await env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(user.sub).first<User>();
    if (!fullUser) return json({ error: 'User not found' }, 404);
    return json(fullUser);
  }

  return null;
}

async function checkApexRiskAlerts(env: Env): Promise<void> {
  try {
    const { results: accounts } = await env.DB.prepare(
      'SELECT * FROM apex_accounts WHERE is_active = 1'
    ).all<Record<string, unknown>>();

    for (const account of accounts) {
      const userId = account.user_id as string;
      const label = account.label as string;
      const drawdownLimit = account.drawdown_limit as number;
      const accountSize = account.account_size as number;

      // Load user's notification settings
      const settings = await getUserSettings(env, userId);
      if (!settings.discord_enabled || !settings.discord_webhook_url) continue;

      const { results: rows } = await env.DB.prepare(
        'SELECT * FROM apex_daily_pnl WHERE apex_account_id = ? ORDER BY date ASC'
      ).bind(account.id).all<Record<string, unknown>>();

      if (rows.length === 0) continue;

      const totalPnl = rows.reduce((s, r) => s + (r.pnl as number), 0);

      // Drawdown calculation
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
        const losses = rows.filter(r => (r.pnl as number) < 0);
        drawdownUsed = Math.abs(losses.reduce((s, r) => s + (r.pnl as number), 0));
      }

      const drawdownPct = drawdownLimit > 0 ? (drawdownUsed / drawdownLimit) * 100 : 0;
      const balance = accountSize + totalPnl;

      // Drawdown warning at 70% and critical at 85%
      if (settings.notify_drawdown && drawdownPct >= 85) {
        const alreadySent = await hasNotificationToday(env, userId, 'drawdown_critical');
        if (!alreadySent) {
          await sendDrawdownWarning(settings.discord_webhook_url, { label }, {
            drawdown_pct: drawdownPct, drawdown_used: drawdownUsed,
            drawdown_limit: drawdownLimit, balance,
          });
          await logNotification(env, userId, 'drawdown_critical');
        }
      } else if (settings.notify_drawdown && drawdownPct >= 70) {
        const alreadySent = await hasNotificationToday(env, userId, 'drawdown_warning');
        if (!alreadySent) {
          await sendDrawdownWarning(settings.discord_webhook_url, { label }, {
            drawdown_pct: drawdownPct, drawdown_used: drawdownUsed,
            drawdown_limit: drawdownLimit, balance,
          });
          await logNotification(env, userId, 'drawdown_warning');
        }
      }

      // Consistency warning — check if within 5% of limit
      if (settings.notify_consistency) {
        const profitDays = rows.filter(r => (r.pnl as number) > 0);
        const totalProfit = profitDays.reduce((s, r) => s + (r.pnl as number), 0);
        const consistencyLimit = 30;
        if (totalProfit > 0 && profitDays.length > 0) {
          const bestDay = Math.max(...profitDays.map(r => r.pnl as number));
          const bestDayPct = (bestDay / totalProfit) * 100;
          const consistencyPct = Math.round(100 - Math.max(0, bestDayPct - consistencyLimit));
          const headroom = consistencyLimit - (100 - consistencyPct);

          if (headroom <= 5 && headroom > 0) {
            const alreadySent = await hasNotificationToday(env, userId, 'consistency_warning');
            if (!alreadySent) {
              await sendConsistencyWarning(settings.discord_webhook_url, { label }, {
                consistency_pct: consistencyPct, consistency_limit: consistencyLimit,
                best_day: bestDay, total_pnl: totalPnl,
              });
              await logNotification(env, userId, 'consistency_warning');
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Apex risk alerts error:', err);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // PWA assets — publicly accessible, no auth
    if (path === '/manifest.json') {
      return new Response(getManifestJson(), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
      });
    }
    if (path === '/icon-192.png' || path === '/icon-512.png') {
      const size = path === '/icon-192.png' ? 192 : 512;
      return new Response(getIconSvg(size), {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=604800' },
      });
    }
    if (path === '/favicon.svg' || path === '/favicon.ico') {
      return new Response(getFaviconSvg(), {
        headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=604800' },
      });
    }
    if (path === '/sw.js') {
      return new Response(getServiceWorkerJs(), {
        headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' },
      });
    }

    // Auth routes
    if (path === '/auth/google') return handleGoogleRedirect(request, env);
    if (path === '/auth/callback') return handleCallback(request, env);
    if (path === '/auth/logout') return handleLogout();

    // API routes — require auth
    if (path.startsWith('/api/')) {
      const payload = await getJwtPayload(request, env);
      if (!payload) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const builtinResponse = await handleBuiltinApi(request, env, path, payload);
      if (builtinResponse) return builtinResponse;
      return handleApiRoutes(request, env, path, url, payload);
    }

    // Landing page
    if (path === '/') {
      const payload = await getJwtPayload(request, env);
      if (payload) {
        return Response.redirect(new URL('/app', url.origin).toString(), 302);
      }
      return new Response(loginPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // App page — requires auth
    if (path === '/app') {
      const payload = await getJwtPayload(request, env);
      if (!payload) {
        return Response.redirect(new URL('/', url.origin).toString(), 302);
      }
      const userRow = await env.DB.prepare('SELECT avatar_url FROM users WHERE id = ?').bind(payload.sub).first<{ avatar_url: string }>();
      return new Response(appPage({ name: payload.name, email: payload.email, avatar_url: userRow?.avatar_url ?? '' }), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      await fetchAndStoreCandles(env);
      await computeSessionLevels(env);
      await runStrategyEngine(env);

      // Run Apex risk checks every 5 minutes (when minute is divisible by 5)
      const minute = new Date().getMinutes();
      if (minute % 5 === 0) {
        await checkApexRiskAlerts(env);
      }
    } catch (err) {
      console.error('Cron error:', err);
    }
  },
} satisfies ExportedHandler<Env>;
