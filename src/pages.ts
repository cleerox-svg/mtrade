const SHARED_STYLES = `
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
      font-size: 3.5rem;
      letter-spacing: 5px;
      color: #fb2c5a;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      font-size: 0.85rem;
      color: #666;
      margin-bottom: 3rem;
      letter-spacing: 1px;
    }
  </style>
`;

export function loginPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MTRADE</title>
  ${SHARED_STYLES}
  <style>
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      background: #fb2c5a;
      color: #fff;
      border: none;
      padding: 0.85rem 2rem;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn:hover { background: #d9204a; transform: translateY(-1px); }
    .btn svg { width: 20px; height: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>MTRADE</h1>
    <p class="subtitle">Matthew's ICT Monitor</p>
    <a href="/auth/google" class="btn">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/></svg>
      Sign in with Google
    </a>
  </div>
</body>
</html>`;
}

export function appPage(userName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MTRADE — Dashboard</title>
  ${SHARED_STYLES}
  <style>
    .welcome {
      font-size: 1.2rem;
      color: #ccc;
      margin-bottom: 2rem;
    }
    .welcome strong { color: #fb2c5a; }
    a.logout {
      color: #666;
      text-decoration: none;
      font-size: 0.85rem;
      border: 1px solid #333;
      padding: 0.5rem 1.5rem;
      border-radius: 6px;
      transition: all 0.2s;
    }
    a.logout:hover { border-color: #fb2c5a; color: #fb2c5a; }
  </style>
</head>
<body>
  <div class="container">
    <h1>MTRADE</h1>
    <p class="subtitle">Matthew's ICT Monitor</p>
    <p class="welcome">Welcome to Mtrade, <strong>${userName}</strong></p>
    <a href="/auth/logout" class="logout">Sign out</a>
  </div>
</body>
</html>`;
}
