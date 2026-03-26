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
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
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
      font-size: 11px;
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
      font-size: 11px;
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
      font-size: 11px;
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
      font-size: 11px;
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

    /* Toast */
    .toast-container {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .toast {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      padding: 10px 16px;
      border-radius: 8px;
      animation: slideUp 0.3s ease;
      transition: opacity 0.3s;
    }
    .toast.success { background: rgba(52,211,153,0.15); color: var(--green); border: 1px solid rgba(52,211,153,0.3); }
    .toast.error { background: rgba(239,68,68,0.15); color: var(--danger); border: 1px solid rgba(239,68,68,0.3); }
    .toast.warning { background: rgba(251,191,36,0.15); color: var(--amber); border: 1px solid rgba(251,191,36,0.3); }
    .toast.dismissing { opacity: 0; }

    /* Preset buttons */
    .preset-row {
      display: flex;
      gap: 8px;
      margin: 14px 0;
    }
    .preset-btn {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      padding: 8px 16px;
      border-radius: 8px;
      min-height: 44px;
      cursor: pointer;
      border: 1px solid rgba(255,255,255,0.1);
      background: transparent;
      color: var(--label);
      transition: all 0.2s;
    }
    .preset-btn.preset-conservative.active {
      background: rgba(52,211,153,0.08);
      border-color: var(--green);
      color: var(--green);
    }
    .preset-btn.preset-normal.active {
      background: rgba(251,44,90,0.08);
      border-color: var(--red);
      color: var(--red);
    }
    .preset-btn.preset-aggressive.active {
      background: rgba(239,68,68,0.08);
      border-color: var(--danger);
      color: var(--danger);
    }

    /* Kill switch */
    .kill-switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: transparent;
      margin-bottom: 6px;
      transition: all 0.25s;
    }
    .kill-switch-row.active {
      background: rgba(239,68,68,0.06);
      border-color: var(--danger);
    }
    .kill-switch-label {
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 600;
      color: var(--bright);
    }
    .kill-switch-toggle {
      position: relative;
      width: 52px;
      height: 28px;
      flex-shrink: 0;
      cursor: pointer;
    }
    .kill-switch-toggle input {
      opacity: 0; width: 0; height: 0; position: absolute;
    }
    .kill-switch-track {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.08);
      border-radius: 14px;
      transition: background 0.25s, box-shadow 0.25s;
    }
    .kill-switch-track::after {
      content: '';
      position: absolute;
      top: 3px; left: 3px;
      width: 22px; height: 22px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.25s;
    }
    .kill-switch-toggle input:checked + .kill-switch-track {
      background: var(--danger);
      box-shadow: 0 0 12px rgba(239,68,68,0.5);
    }
    .kill-switch-toggle input:checked + .kill-switch-track::after {
      transform: translateX(24px);
    }
    .kill-switch-hint {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 16px;
    }

    /* Strategy toggles & inputs */
    .strat-divider {
      font-family: 'Outfit', sans-serif;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--muted);
      padding: 12px 0 6px;
      border-top: 1px solid var(--border);
      margin-top: 4px;
    }
    .strat-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
    }
    .strat-toggle-label {
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      color: var(--text);
    }
    .strat-toggle-help {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--muted);
      margin-top: 1px;
    }
    .strat-number-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
    }
    .strat-number-input {
      width: 70px;
      background: #0a0a10;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 10px;
      color: var(--text);
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      text-align: center;
      outline: none;
      min-height: 36px;
    }
    .strat-number-input:focus { border-color: var(--red); }
    .strat-number-display {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--muted);
      margin-top: 2px;
      text-align: right;
    }
    .strat-clear-btn {
      background: none;
      border: 1px solid var(--border);
      color: var(--muted);
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      margin-left: 6px;
    }
    .strat-clear-btn:hover { border-color: var(--danger); color: var(--danger); }

    /* Toggle switch (44x24) */
    .toggle-switch {
      position: relative;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
      cursor: pointer;
    }
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    .toggle-track {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.08);
      border-radius: 12px;
      transition: background 0.25s, box-shadow 0.25s;
    }
    .toggle-track::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.25s;
    }
    .toggle-switch input:checked + .toggle-track {
      background: var(--red);
      box-shadow: 0 0 8px rgba(251,44,90,0.4);
    }
    .toggle-switch input:checked + .toggle-track::after {
      transform: translateX(20px);
    }

    /* Notification styles */
    .notif-webhook-row {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .notif-webhook-row .settings-input {
      flex: 1;
      margin-bottom: 0;
    }
    .notif-btn {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--red);
      font-family: 'Outfit', sans-serif;
      font-size: 11px;
      font-weight: 700;
      border-radius: 8px;
      padding: 10px 14px;
      cursor: pointer;
      white-space: nowrap;
    }
    .notif-btn:hover { border-color: var(--red); }
    .notif-help {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--muted);
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .notif-master-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      margin-bottom: 4px;
      border-bottom: 1px solid var(--border);
    }
    .notif-master-label {
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: var(--bright);
    }
    .notif-toggles-grid {
      display: grid;
      grid-template-columns: 1fr;
    }
    @media (min-width: 768px) {
      .notif-toggles-grid {
        grid-template-columns: 1fr 1fr;
        column-gap: 24px;
      }
    }
    .notif-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
    }
    .notif-toggle-row:last-child { border-bottom: none; }
    .notif-toggle-label {
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      color: var(--text);
    }
    .notif-toggle-sub {
      font-size: 11px;
      color: var(--muted);
      margin-top: 1px;
    }

    /* Settings input */
    .settings-input {
      display: block;
      width: 100%;
      background: #0a0a10;
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      outline: none;
      transition: border-color 0.2s;
    }
    .settings-input:focus { border-color: var(--red); }
    .settings-input::placeholder { color: var(--subtle); }

    /* Accounts */
    .account-list-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 8px;
    }
    .account-list-label {
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: var(--bright);
    }
    .account-list-meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--muted);
      margin-top: 2px;
    }
    .account-list-status {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    /* Template cards */
    .template-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    @media (min-width: 768px) {
      .template-grid { grid-template-columns: repeat(6, 1fr); }
    }
    .template-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .template-card:hover { border-color: rgba(255,255,255,0.15); }
    .template-card.selected {
      border-color: var(--red);
      background: rgba(251,44,90,0.05);
    }
    .template-card .tpl-size {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: var(--bright);
    }
    .template-card .tpl-details {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--muted);
      margin-top: 4px;
      line-height: 1.4;
    }
    .template-card .tpl-tag {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: var(--amber);
      border: 1px solid rgba(251,191,36,0.3);
      border-radius: 4px;
      padding: 1px 5px;
      margin-top: 4px;
    }
    .tpl-step2 { animation: slideUp 0.3s ease; }
    .tpl-readonly-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
    }
    .tpl-readonly-label { color: var(--label); }
    .tpl-readonly-value { color: var(--bright); }
    .tpl-type-toggle {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .tpl-type-btn {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding: 8px;
      border-radius: 8px;
      min-height: 36px;
      cursor: pointer;
      border: 1px solid rgba(255,255,255,0.1);
      background: transparent;
      color: var(--label);
      transition: all 0.2s;
    }
    .tpl-type-btn.active {
      background: rgba(251,44,90,0.1);
      border-color: rgba(251,44,90,0.35);
      color: var(--red);
    }
    .form-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--label);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 6px;
      display: block;
    }
    .form-group { margin-bottom: 12px; }
    .btn-submit {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      letter-spacing: 1.5px;
      background: var(--red);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      min-height: 44px;
      cursor: pointer;
      width: 100%;
      transition: background 0.2s;
    }
    .btn-submit:hover { background: #d9204a; }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Section label */
    .section-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--label);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 10px;
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

    <div id="toast-container" class="toast-container"></div>

    <div class="footer">
      <div class="footer-brand">MTRADE</div>
      <div class="footer-copy">&copy; 2026 LRX Enterprises Inc.</div>
    </div>
  </div>

  <script>
    /* ── Toast ── */
    function __showToast(message, type) {
      type = type || 'success';
      var c = document.getElementById('toast-container');
      var t = document.createElement('div');
      t.className = 'toast ' + type;
      t.textContent = message;
      c.appendChild(t);
      setTimeout(function() { t.classList.add('dismissing'); setTimeout(function() { t.remove(); }, 300); }, 3000);
    }

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

  <script>
  /* ── CARD 1: Strategy Config ── */
  (function() {
    var container = document.getElementById('settings-strategy');
    var config = null;
    var saveTimer = null;

    var fragranceNames = {
      0: 'No Signal', 5: 'No Signal', 10: 'No Signal', 15: 'No Signal', 20: 'Zara',
      25: 'Zara', 30: 'H&M', 35: 'H&M', 40: 'YSL', 45: 'YSL',
      50: 'Armani', 55: 'Armani', 60: 'Armani', 65: 'Tom Ford',
      70: 'Tom Ford', 75: 'Prestige', 80: 'Prestige', 85: 'Prestige',
      90: 'Baccarat', 95: 'Baccarat', 100: 'Baccarat'
    };

    function getFragrance(val) {
      var v = Math.round(val / 5) * 5;
      return fragranceNames[v] || '';
    }

    function toggleHtml(id, checked) {
      return '<label class="toggle-switch"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '><span class="toggle-track"></span></label>';
    }

    function debouncedSave(updates) {
      if (saveTimer) clearTimeout(saveTimer);
      Object.assign(config, updates);
      saveTimer = setTimeout(function() {
        fetch('/api/strategy/config', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        }).then(function(r) { return r.json(); })
          .then(function(updated) {
            config = updated;
            __showToast('\\u2713 Saved', 'success');
          })
          .catch(function() { __showToast('\\u2717 Save failed', 'error'); });
      }, 500);
    }

    function applyPreset(name) {
      fetch('/api/strategy/config/preset', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: name })
      }).then(function(r) { return r.json(); })
        .then(function(updated) {
          config = updated;
          render();
          __showToast('\\u2713 ' + name.charAt(0).toUpperCase() + name.slice(1) + ' preset applied', 'success');
        })
        .catch(function() { __showToast('\\u2717 Preset failed', 'error'); });
    }

    function toggleKillSwitch(enabled) {
      fetch('/api/strategy/kill-switch', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: enabled })
      }).then(function(r) { return r.json(); })
        .then(function(updated) {
          config = updated;
          render();
          __showToast(enabled ? '\\u26A0 Kill switch activated' : '\\u2713 Kill switch deactivated', enabled ? 'warning' : 'success');
        })
        .catch(function() { __showToast('\\u2717 Failed', 'error'); });
    }

    function render() {
      if (!config) { container.innerHTML = ''; return; }
      var c = config;
      var ksActive = c.kill_switch === 1;
      var preset = c.active_preset || 'normal';

      var html = '';

      // Preset buttons
      html += '<div class="preset-row">';
      html += '<button class="preset-btn preset-conservative' + (preset === 'conservative' ? ' active' : '') + '" data-preset="conservative">CONSERVATIVE</button>';
      html += '<button class="preset-btn preset-normal' + (preset === 'normal' ? ' active' : '') + '" data-preset="normal">NORMAL</button>';
      html += '<button class="preset-btn preset-aggressive' + (preset === 'aggressive' ? ' active' : '') + '" data-preset="aggressive">AGGRESSIVE</button>';
      html += '</div>';

      // Kill switch
      html += '<div class="kill-switch-row' + (ksActive ? ' active' : '') + '">';
      if (ksActive) {
        html += '<div><div class="kill-switch-label" style="color:var(--danger)">ACTIVE \\u2014 engine paused</div></div>';
      } else {
        html += '<div><div class="kill-switch-label">KILL SWITCH \\u2014 No more trades today</div></div>';
      }
      html += '<label class="kill-switch-toggle"><input type="checkbox" id="kill-switch-toggle"' + (ksActive ? ' checked' : '') + '><span class="kill-switch-track"></span></label>';
      html += '</div>';
      html += '<div class="kill-switch-hint">Resets at midnight ET</div>';

      // Session toggles
      html += '<div class="strat-divider">SESSION</div>';
      html += '<div class="strat-toggle-row"><div class="strat-toggle-label">Trade London sweeps</div>' + toggleHtml('strat-london', c.trade_london_sweep) + '</div>';
      html += '<div class="strat-toggle-row"><div class="strat-toggle-label">Trade NY sweeps</div>' + toggleHtml('strat-ny', c.trade_ny_sweep) + '</div>';

      // FVG toggles
      html += '<div class="strat-divider">FVG</div>';
      html += '<div class="strat-toggle-row"><div class="strat-toggle-label">Scan 1H FVGs</div>' + toggleHtml('strat-fvg1h', c.fvg_scan_1h) + '</div>';
      html += '<div class="strat-toggle-row"><div class="strat-toggle-label">Scan 4H FVGs</div>' + toggleHtml('strat-fvg4h', c.fvg_scan_4h) + '</div>';
      html += '<div class="strat-toggle-row"><div><div class="strat-toggle-label">Require IFVG for continuation</div><div class="strat-toggle-help">Only fires BASE NOTE on Inverse FVGs</div></div>' + toggleHtml('strat-ifvg', c.continuation_require_ifvg) + '</div>';

      // Entry settings
      html += '<div class="strat-divider">ENTRY</div>';
      html += '<div class="strat-number-row"><div class="strat-toggle-label">Min R:R</div>';
      html += '<div style="text-align:right"><input type="number" class="strat-number-input" id="strat-minrr" value="' + (c.min_rr || 2.0) + '" min="1.0" max="5.0" step="0.5">';
      html += '<div class="strat-number-display" id="strat-minrr-display">' + (c.min_rr || 2.0).toFixed(1) + ':1</div></div></div>';

      html += '<div class="strat-number-row"><div class="strat-toggle-label">Min AI confidence</div>';
      html += '<div style="text-align:right"><input type="number" class="strat-number-input" id="strat-confidence" value="' + (c.min_confidence || 60) + '" min="0" max="100" step="5">';
      html += '<div class="strat-number-display" id="strat-confidence-display">' + getFragrance(c.min_confidence || 60) + '</div></div></div>';

      // Position settings
      html += '<div class="strat-divider">POSITION</div>';
      html += '<div class="strat-number-row"><div class="strat-toggle-label">Default contracts</div>';
      html += '<input type="number" class="strat-number-input" id="strat-contracts" value="' + (c.default_contracts || 1) + '" min="1" max="10" step="1"></div>';

      html += '<div class="strat-number-row"><div class="strat-toggle-label">Max contracts override</div>';
      html += '<div style="display:flex;align-items:center"><input type="number" class="strat-number-input" id="strat-max-contracts" value="' + (c.max_contracts_override || '') + '" min="1" max="20" step="1" placeholder="\\u2014">';
      html += '<button class="strat-clear-btn" id="strat-clear-max">\\u2715</button></div></div>';

      container.innerHTML = html;
      bindEvents();
      // Recalculate card body maxHeight
      var cardBody = container.closest('.settings-card-body');
      if (cardBody && !cardBody.classList.contains('collapsed')) cardBody.style.maxHeight = cardBody.scrollHeight + 'px';
    }

    function bindEvents() {
      // Preset buttons
      container.querySelectorAll('.preset-btn').forEach(function(btn) {
        btn.onclick = function() { applyPreset(this.dataset.preset); };
      });

      // Kill switch
      var ks = document.getElementById('kill-switch-toggle');
      if (ks) ks.onchange = function() { toggleKillSwitch(this.checked); };

      // Toggle bindings
      var toggleMap = {
        'strat-london': 'trade_london_sweep',
        'strat-ny': 'trade_ny_sweep',
        'strat-fvg1h': 'fvg_scan_1h',
        'strat-fvg4h': 'fvg_scan_4h',
        'strat-ifvg': 'continuation_require_ifvg'
      };
      Object.keys(toggleMap).forEach(function(elId) {
        var el = document.getElementById(elId);
        if (el) el.onchange = function() {
          var update = {};
          update[toggleMap[elId]] = this.checked ? 1 : 0;
          debouncedSave(update);
        };
      });

      // Number inputs
      var minRr = document.getElementById('strat-minrr');
      if (minRr) minRr.oninput = function() {
        var v = parseFloat(this.value);
        if (!isNaN(v) && v >= 1.0 && v <= 5.0) {
          document.getElementById('strat-minrr-display').textContent = v.toFixed(1) + ':1';
          debouncedSave({ min_rr: v });
        }
      };

      var conf = document.getElementById('strat-confidence');
      if (conf) conf.oninput = function() {
        var v = parseInt(this.value);
        if (!isNaN(v) && v >= 0 && v <= 100) {
          document.getElementById('strat-confidence-display').textContent = getFragrance(v);
          debouncedSave({ min_confidence: v });
        }
      };

      var contracts = document.getElementById('strat-contracts');
      if (contracts) contracts.oninput = function() {
        var v = parseInt(this.value);
        if (!isNaN(v) && v >= 1 && v <= 10) debouncedSave({ default_contracts: v });
      };

      var maxC = document.getElementById('strat-max-contracts');
      if (maxC) maxC.oninput = function() {
        var v = parseInt(this.value);
        if (!isNaN(v) && v >= 1 && v <= 20) debouncedSave({ max_contracts_override: v });
      };

      var clearMax = document.getElementById('strat-clear-max');
      if (clearMax) clearMax.onclick = function() {
        document.getElementById('strat-max-contracts').value = '';
        debouncedSave({ max_contracts_override: null });
      };
    }

    fetch('/api/strategy/config', { credentials: 'same-origin' })
      .then(function(r) { return r.json(); })
      .then(function(data) { config = data; render(); })
      .catch(function(err) { console.error('Failed to load strategy config:', err); container.innerHTML = '<span style="color:var(--danger);font-size:11px">Failed to load</span>'; });
  })();
  </script>

  <script>
  /* ── CARD 2: Notifications ── */
  (function() {
    var container = document.getElementById('settings-notifications');
    var settings = null;

    function toggleHtml(id, checked) {
      return '<label class="toggle-switch"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '><span class="toggle-track"></span></label>';
    }

    function render() {
      if (!settings) { container.innerHTML = ''; return; }
      var s = settings;
      var webhookVal = s.discord_webhook_url || '';
      var html = '';

      html += '<div class="section-label">DISCORD WEBHOOK</div>';
      html += '<div class="notif-webhook-row">';
      html += '<input class="settings-input" id="notif-webhook-input" type="text" value="' + webhookVal.replace(/"/g, '&quot;') + '" placeholder="https://discord.com/api/webhooks/...">';
      html += '<button class="notif-btn" id="notif-save-btn">Save</button>';
      html += '<button class="notif-btn" id="notif-test-btn">Test</button>';
      html += '</div>';
      html += '<div class="notif-help">Channel Settings \\u2192 Integrations \\u2192 Webhooks \\u2192 New Webhook \\u2192 Copy URL</div>';

      html += '<div class="notif-master-row">';
      html += '<span class="notif-master-label">Notifications enabled</span>';
      html += toggleHtml('notif-master', s.discord_enabled);
      html += '</div>';

      var toggles = [
        { id: 'notify_sweep', label: 'Sweep detected', sub: 'Top Note' },
        { id: 'notify_ready', label: 'Setup confirmed', sub: 'Base Note' },
        { id: 'notify_execute', label: 'Entry signal', sub: 'Accord' },
        { id: 'notify_drawdown', label: 'Drawdown warning', sub: 'Redline' },
        { id: 'notify_consistency', label: 'Consistency warning', sub: 'Rev Limit' },
        { id: 'notify_setup_result', label: 'Setup results', sub: 'Win/Loss' },
      ];

      html += '<div class="notif-toggles-grid">';
      for (var i = 0; i < toggles.length; i++) {
        var t = toggles[i];
        var isOn = s[t.id];
        html += '<div class="notif-toggle-row">';
        html += '<div><div class="notif-toggle-label">' + t.label + '</div><div class="notif-toggle-sub">' + t.sub + '</div></div>';
        html += toggleHtml('notif-' + t.id, isOn);
        html += '</div>';
      }
      html += '</div>';

      container.innerHTML = html;
      bindEvents();
      var cardBody = container.closest('.settings-card-body');
      if (cardBody && !cardBody.classList.contains('collapsed')) cardBody.style.maxHeight = cardBody.scrollHeight + 'px';
    }

    function saveField(data) {
      fetch('/api/settings', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function(r) { return r.json(); })
        .then(function(updated) {
          settings = updated;
          __showToast('\\u2713 Settings saved', 'success');
        })
        .catch(function() { __showToast('\\u2717 Something went wrong', 'error'); });
    }

    function bindEvents() {
      var saveBtn = document.getElementById('notif-save-btn');
      if (saveBtn) saveBtn.onclick = function() {
        var val = document.getElementById('notif-webhook-input').value.trim();
        saveField({ discord_webhook_url: val });
        settings.discord_webhook_url = val;
      };

      var testBtn = document.getElementById('notif-test-btn');
      if (testBtn) testBtn.onclick = function() {
        fetch('/api/settings/test-discord', { method: 'POST', credentials: 'same-origin' })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            __showToast(data.success ? '\\u2713 Discord notification sent' : '\\u2717 Discord webhook failed', data.success ? 'success' : 'error');
          })
          .catch(function() { __showToast('\\u2717 Discord webhook failed', 'error'); });
      };

      var master = document.getElementById('notif-master');
      if (master) master.onchange = function() {
        settings.discord_enabled = this.checked ? 1 : 0;
        saveField({ discord_enabled: settings.discord_enabled });
      };

      var toggleKeys = ['notify_sweep', 'notify_ready', 'notify_execute', 'notify_drawdown', 'notify_consistency', 'notify_setup_result'];
      for (var i = 0; i < toggleKeys.length; i++) {
        (function(key) {
          var el = document.getElementById('notif-' + key);
          if (el) el.onchange = function() {
            settings[key] = this.checked ? 1 : 0;
            var update = {};
            update[key] = settings[key];
            saveField(update);
          };
        })(toggleKeys[i]);
      }
    }

    fetch('/api/settings', { credentials: 'same-origin' })
      .then(function(r) { return r.json(); })
      .then(function(data) { settings = data; render(); })
      .catch(function() { container.innerHTML = '<span style="color:var(--danger);font-size:11px">Failed to load</span>'; });
  })();
  </script>

  <script>
  /* ── CARD 3: Accounts ── */
  (function() {
    var container = document.getElementById('settings-accounts');
    var templates = [];
    var selectedTemplate = null;

    function renderAccounts(accounts) {
      var html = '';

      if (accounts.length) {
        html += '<div class="section-label">YOUR ACCOUNTS</div>';
        for (var i = 0; i < accounts.length; i++) {
          var a = accounts[i];
          var statusColor = a.is_active ? 'var(--green)' : 'var(--muted)';
          var statusText = a.is_active ? 'ACTIVE' : 'INACTIVE';
          html += '<div class="account-list-item">';
          html += '<div><div class="account-list-label">' + (a.label || 'Account #' + a.id) + '</div>';
          html += '<div class="account-list-meta">$' + Number(a.account_size).toLocaleString() + ' \\u00B7 ' + (a.account_type || '').toUpperCase() + ' \\u00B7 ' + (a.drawdown_type || '').toUpperCase() + ' \\u00B7 DD $' + Number(a.drawdown_limit).toLocaleString() + '</div></div>';
          html += '<div class="account-list-status" style="color:' + statusColor + '">' + statusText + '</div>';
          html += '</div>';
        }
      }

      html += '<div style="margin-top:16px"><div class="section-label">CREATE NEW ACCOUNT</div>';
      html += '<div class="template-grid" id="acct-template-grid"></div>';
      html += '<div id="acct-step2"></div>';
      html += '</div>';

      container.innerHTML = html;
      loadTemplates();
      var cardBody = container.closest('.settings-card-body');
      if (cardBody && !cardBody.classList.contains('collapsed')) cardBody.style.maxHeight = cardBody.scrollHeight + 'px';
    }

    function loadTemplates() {
      if (templates.length) {
        renderTemplateGrid();
        return;
      }
      fetch('/api/alpha/templates', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) { templates = data; renderTemplateGrid(); })
        .catch(function() {});
    }

    function renderTemplateGrid() {
      var grid = document.getElementById('acct-template-grid');
      if (!grid) return;
      grid.innerHTML = templates.map(function(t) {
        var isSelected = selectedTemplate && selectedTemplate.id === t.id;
        var isStatic = (t.label || '').indexOf('Static') !== -1;
        var sizeLabel = t.label || ('$' + Number(t.account_size).toLocaleString());
        return '<div class="template-card' + (isSelected ? ' selected' : '') + '" data-tpl-id="' + t.id + '">' +
          '<div class="tpl-size">' + sizeLabel + '</div>' +
          '<div class="tpl-details">DD $' + Number(t.drawdown_limit).toLocaleString() + '<br>Target $' + Number(t.profit_target).toLocaleString() + '</div>' +
          (isStatic ? '<div class="tpl-tag">STATIC</div>' : '') +
          '</div>';
      }).join('');

      grid.querySelectorAll('.template-card').forEach(function(card) {
        card.onclick = function() {
          var tplId = Number(this.dataset.tplId);
          selectedTemplate = templates.find(function(t) { return t.id === tplId; });
          renderTemplateGrid();
          renderStep2();
        };
      });
    }

    function renderStep2() {
      var step2 = document.getElementById('acct-step2');
      if (!selectedTemplate) { step2.innerHTML = ''; return; }
      var t = selectedTemplate;
      var defaultLabel = (t.label || '$' + t.account_size) + ' Legacy #1';

      var html = '<div class="tpl-step2">';
      html += '<div class="form-group"><label class="form-label">LABEL</label><input type="text" id="acct-label" class="settings-input" value="' + defaultLabel + '"></div>';

      html += '<div class="form-group"><label class="form-label">ACCOUNT TYPE</label>';
      html += '<div class="tpl-type-toggle" id="acct-type-toggle">';
      html += '<button class="tpl-type-btn active" data-val="legacy">LEGACY</button>';
      html += '<button class="tpl-type-btn" data-val="v4">V4</button>';
      html += '</div></div>';

      html += '<div class="form-group"><label class="form-label">DRAWDOWN TYPE</label>';
      html += '<div class="tpl-type-toggle" id="acct-dd-toggle">';
      html += '<button class="tpl-type-btn active" data-val="trailing">TRAILING</button>';
      html += '<button class="tpl-type-btn" data-val="eod">EOD</button>';
      html += '<button class="tpl-type-btn" data-val="static">STATIC</button>';
      html += '</div></div>';

      html += '<div style="border-top:1px solid var(--border);padding-top:10px;margin-bottom:12px">';
      html += '<div class="tpl-readonly-row"><span class="tpl-readonly-label">Account Size</span><span class="tpl-readonly-value">$' + Number(t.account_size).toLocaleString() + '</span></div>';
      html += '<div class="tpl-readonly-row"><span class="tpl-readonly-label">Drawdown Limit</span><span class="tpl-readonly-value">$' + Number(t.drawdown_limit).toLocaleString() + '</span></div>';
      html += '<div class="tpl-readonly-row"><span class="tpl-readonly-label">Profit Target</span><span class="tpl-readonly-value">$' + Number(t.profit_target).toLocaleString() + '</span></div>';
      html += '<div class="tpl-readonly-row"><span class="tpl-readonly-label">Max Contracts</span><span class="tpl-readonly-value">' + t.max_contracts + '</span></div>';
      html += '<div class="tpl-readonly-row"><span class="tpl-readonly-label">Scaling Limit</span><span class="tpl-readonly-value">' + t.scaling_limit + '</span></div>';
      html += '</div>';

      html += '<button id="acct-submit" class="btn-submit">CREATE ACCOUNT</button>';
      html += '</div>';

      step2.innerHTML = html;

      // Type toggle bindings
      function bindToggleGroup(groupId) {
        var group = document.getElementById(groupId);
        if (!group) return;
        group.querySelectorAll('.tpl-type-btn').forEach(function(btn) {
          btn.onclick = function() {
            group.querySelectorAll('.tpl-type-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
          };
        });
      }
      bindToggleGroup('acct-type-toggle');
      bindToggleGroup('acct-dd-toggle');

      document.getElementById('acct-submit').addEventListener('click', function() {
        var btn = this;
        btn.disabled = true;
        btn.textContent = 'CREATING\\u2026';

        var accountType = document.querySelector('#acct-type-toggle .tpl-type-btn.active').dataset.val;
        var ddType = document.querySelector('#acct-dd-toggle .tpl-type-btn.active').dataset.val;

        var body = {
          template_id: selectedTemplate.id,
          label: document.getElementById('acct-label').value || selectedTemplate.label + ' Account',
          account_type: accountType,
          drawdown_type: ddType
        };

        fetch('/api/alpha/accounts', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }).then(function(r) { return r.json(); })
          .then(function() {
            __showToast('\\u2713 Account created \\u2014 ' + body.label, 'success');
            selectedTemplate = null;
            loadAccounts();
          })
          .catch(function() {
            btn.disabled = false;
            btn.textContent = 'CREATE ACCOUNT';
            __showToast('\\u2717 Something went wrong \\u2014 try again', 'error');
          });
      });

      // Recalculate card height
      var cardBody = container.closest('.settings-card-body');
      if (cardBody && !cardBody.classList.contains('collapsed')) cardBody.style.maxHeight = cardBody.scrollHeight + 'px';
    }

    function loadAccounts() {
      fetch('/api/alpha/accounts', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(accounts) { renderAccounts(accounts || []); })
        .catch(function() { renderAccounts([]); });
    }

    loadAccounts();
  })();
  </script>

  <script>
    // Initialize card heights after all content loads
    setTimeout(function() {
      document.querySelectorAll('.settings-card-body').forEach(function(body) {
        if (!body.classList.contains('collapsed')) {
          body.style.maxHeight = body.scrollHeight + 'px';
        }
      });
    }, 500);
  </script>
</body>
</html>`;
}
