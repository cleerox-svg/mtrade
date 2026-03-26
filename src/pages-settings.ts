export function getSettingsPage(user: { name: string; email: string; avatar_url: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MTRADE — Settings</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#fb2c5a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #08080c;
      --card: #0e0e14;
      --border: rgba(255,255,255,0.06);
      --red: #fb2c5a;
      --red-soft: #fb7185;
      --white: #ffffff;
      --bright: #f1f5f9;
      --text: #cbd5e1;
      --label: #94a3b8;
      --muted: #64748b;
      --subtle: #475569;
      --green: #34d399;
      --amber: #fbbf24;
      --danger: #ef4444;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Outfit', sans-serif;
      margin: 0;
      padding: 0;
    }
    .jb { font-family: 'JetBrains Mono', monospace; }
    .container {
      width: 100%;
      max-width: 100%;
      padding: 12px;
      margin: 0 auto;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 0 12px;
      margin-bottom: 0;
    }
    .header-brand h1 {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 24px;
      letter-spacing: 5px;
      line-height: 1;
    }
    .header-brand .tagline {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      color: var(--label);
      letter-spacing: 2px;
      margin-top: 4px;
      text-transform: uppercase;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header-clock {
      text-align: right;
    }
    .header-clock .time {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      color: var(--white);
    }
    .header-clock .session {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 3px;
      justify-content: flex-end;
    }
    .session-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }
    .session-dot.active {
      background: var(--red);
      animation: breathe 2s ease-in-out infinite;
      box-shadow: 0 0 6px var(--red), 0 0 12px rgba(251,44,90,0.3);
    }
    .session-dot.inactive {
      background: var(--subtle);
    }
    .session-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .session-label.active { color: var(--label); }
    .session-label.inactive { color: var(--subtle); }
    .header-user {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-user img {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid var(--border);
    }
    .header-user a {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--muted);
      text-decoration: none;
      letter-spacing: 1px;
    }
    .header-user a:hover { color: var(--label); }

    /* Tab bar */
    .tab-bar {
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }
    .tab-bar a {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2px;
      padding: 10px 20px;
      display: inline-block;
      text-decoration: none;
      color: var(--muted);
    }
    .tab-bar a.active {
      color: var(--red);
      border-bottom: 2px solid var(--red);
    }

    /* Settings cards */
    .settings-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 12px;
      animation: slideUp 0.3s ease both;
    }
    .settings-card:nth-child(2) { animation-delay: 0.05s; }
    .settings-card:nth-child(3) { animation-delay: 0.1s; }
    .settings-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      cursor: pointer;
      user-select: none;
    }
    .settings-card-title {
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: var(--bright);
      letter-spacing: 1px;
    }
    .settings-card-chevron {
      color: var(--muted);
      font-size: 12px;
      transition: transform 0.2s ease;
    }
    .settings-card-chevron.collapsed {
      transform: rotate(-90deg);
    }
    .settings-card-body {
      padding: 0 16px 14px;
      overflow: hidden;
      transition: max-height 0.3s ease, padding 0.3s ease;
    }
    .settings-card-body.collapsed {
      max-height: 0 !important;
      padding-top: 0;
      padding-bottom: 0;
    }
    .settings-card-body .loading-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--muted);
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 32px 0 24px;
    }
    .footer-brand {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 24px;
      letter-spacing: 5px;
      color: rgba(251,44,90,0.2);
    }
    .footer-copy {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      color: var(--subtle);
      margin-top: 6px;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-brand">
        <h1><span style="color:#fb2c5a">M</span><span style="color:#ffffff">TRADE</span></h1>
        <div class="tagline">MATTHEW'S ICT MONITOR</div>
      </div>
      <div class="header-right">
        <div class="header-clock">
          <div class="time jb" id="clock">--:--:--</div>
          <div class="session" id="session-indicator">
            <span class="session-dot inactive"></span>
            <span class="session-label inactive">--</span>
          </div>
        </div>
        <div class="header-user" style="position:relative">
          ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.name}">` : ''}
          <a href="/auth/logout">LOGOUT</a>
        </div>
      </div>
    </div>

    <div class="tab-bar">
      <a href="/app">DASHBOARD</a>
      <a href="/app/learn">LEARN</a>
      <a href="/app/settings" class="active">SETTINGS</a>
    </div>

    <div class="settings-card">
      <div class="settings-card-header" onclick="toggleCard(this)">
        <span class="settings-card-title">\u25C8 STRATEGY CONFIG</span>
        <span class="settings-card-chevron">\u25BE</span>
      </div>
      <div class="settings-card-body">
        <div id="settings-strategy" class="loading-text">Loading...</div>
      </div>
    </div>

    <div class="settings-card">
      <div class="settings-card-header" onclick="toggleCard(this)">
        <span class="settings-card-title">\u25C8 NOTIFICATIONS</span>
        <span class="settings-card-chevron">\u25BE</span>
      </div>
      <div class="settings-card-body">
        <div id="settings-notifications" class="loading-text">Loading...</div>
      </div>
    </div>

    <div class="settings-card">
      <div class="settings-card-header" onclick="toggleCard(this)">
        <span class="settings-card-title">\u25C8 ACCOUNTS</span>
        <span class="settings-card-chevron">\u25BE</span>
      </div>
      <div class="settings-card-body">
        <div id="settings-accounts" class="loading-text">Loading...</div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-brand">MTRADE</div>
      <div class="footer-copy">&copy; 2026 LRX Enterprises Inc.</div>
    </div>
  </div>

  <script>
    function toggleCard(headerEl) {
      var body = headerEl.nextElementSibling;
      var chevron = headerEl.querySelector('.settings-card-chevron');
      if (body.classList.contains('collapsed')) {
        body.classList.remove('collapsed');
        body.style.maxHeight = body.scrollHeight + 'px';
        chevron.classList.remove('collapsed');
      } else {
        body.classList.add('collapsed');
        body.style.maxHeight = '0px';
        chevron.classList.add('collapsed');
      }
    }

    // Initialize card heights
    document.querySelectorAll('.settings-card-body').forEach(function(body) {
      body.style.maxHeight = body.scrollHeight + 'px';
    });

    function updateClock() {
      var now = new Date();
      var h = String(now.getUTCHours()).padStart(2, '0');
      var m = String(now.getUTCMinutes()).padStart(2, '0');
      var s = String(now.getUTCSeconds()).padStart(2, '0');
      document.getElementById('clock').textContent = h + ':' + m + ':' + s;

      var estHour = (now.getUTCHours() - 5 + 24) % 24;
      var estMin = now.getUTCMinutes();
      var estTime = estHour + estMin / 60;

      var label = 'CLOSED';
      var active = false;

      if (estTime >= 2 && estTime < 5) {
        label = 'LONDON'; active = true;
      } else if (estTime >= 5 && estTime < 9.5) {
        label = 'PRE-MKT'; active = true;
      } else if (estTime >= 9.5 && estTime < 12) {
        label = 'NY OPEN'; active = true;
      } else if (estTime >= 14 && estTime < 15) {
        label = 'NY PM'; active = true;
      }

      var indicator = document.getElementById('session-indicator');
      var dotClass = active ? 'active' : 'inactive';
      indicator.innerHTML =
        '<span class="session-dot ' + dotClass + '"></span>' +
        '<span class="session-label ' + dotClass + '">' + label + '</span>';
    }
    updateClock();
    setInterval(updateClock, 1000);
  </script>
</body>
</html>`;
}
