import { Env, User } from './types';
import { signJwt } from './jwt';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

function getRedirectUri(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/auth/callback`;
}

export function handleGoogleRedirect(request: Request, env: Env): Response {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(request),
    response_type: 'code',
    scope: 'email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return Response.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`, 302);
}

export async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return new Response('Authentication failed', { status: 400 });
  }

  // Exchange code for tokens
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getRedirectUri(request),
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return new Response('Failed to exchange authorization code', { status: 500 });
  }

  const tokens: { access_token: string } = await tokenRes.json();

  // Fetch user profile
  const profileRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) {
    return new Response('Failed to fetch user profile', { status: 500 });
  }

  const profile: { id: string; email: string; name: string; picture: string } = await profileRes.json();

  // Check if email is allowed
  const allowed = await env.DB.prepare(
    'SELECT email, role FROM allowed_emails WHERE email = ?'
  ).bind(profile.email).first<{ email: string; role: string }>();

  if (!allowed) {
    return new Response(forbiddenPage(), {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Upsert user
  const userId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO users (id, google_id, email, name, avatar_url, role)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(google_id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      avatar_url = excluded.avatar_url,
      role = excluded.role
  `).bind(userId, profile.id, profile.email, profile.name, profile.picture, allowed.role).run();

  // Fetch the upserted user to get the actual id
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE google_id = ?'
  ).bind(profile.id).first<User>();

  if (!user) {
    return new Response('Failed to create user', { status: 500 });
  }

  // Issue JWT
  const token = await signJwt(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    env.JWT_SECRET
  );

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/app',
      'Set-Cookie': `mtrade_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
    },
  });
}

export function handleLogout(): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': 'mtrade_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
}

function forbiddenPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Denied — MTRADE</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;900&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #08080c;
      color: #e0e0e0;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      max-width: 480px;
      padding: 2rem;
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 3rem;
      letter-spacing: 5px;
      color: #fb2c5a;
      margin-bottom: 1.5rem;
    }
    .code { font-size: 5rem; color: #fb2c5a; margin-bottom: 1rem; }
    p { font-size: 1rem; line-height: 1.6; color: #888; margin-bottom: 2rem; }
    a {
      color: #fb2c5a;
      text-decoration: none;
      border: 1px solid #fb2c5a;
      padding: 0.75rem 2rem;
      border-radius: 6px;
      transition: all 0.2s;
    }
    a:hover { background: #fb2c5a; color: #08080c; }
  </style>
</head>
<body>
  <div class="container">
    <h1>MTRADE</h1>
    <div class="code">403</div>
    <p>Access restricted — this platform is invite only.</p>
    <a href="/">Back to home</a>
  </div>
</body>
</html>`;
}
