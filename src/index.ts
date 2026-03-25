import { Env, JwtPayload, User } from './types';
import { verifyJwt } from './jwt';
import { handleGoogleRedirect, handleCallback, handleLogout } from './auth';
import { loginPage, appPage } from './pages';

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

async function handleApiRoutes(
  request: Request,
  env: Env,
  path: string,
  user: JwtPayload
): Promise<Response> {
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

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

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
      return handleApiRoutes(request, env, path, payload);
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
      return new Response(appPage(payload.name), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
