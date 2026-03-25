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

export function appPage(user: { name: string; email: string; avatar_url: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MTRADE — Dashboard</title>
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
    .outfit { font-family: 'Outfit', sans-serif; }
    .container {
      width: 100%;
      max-width: 960px;
      padding: 14px;
      margin: 0 auto;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 12px;
      position: relative;
    }
    .card::after {
      content: '';
      position: absolute;
      top: 0;
      left: 16px;
      right: 16px;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--red), transparent);
      border-radius: 14px 14px 0 0;
    }
    @keyframes breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.2); }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Header */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 16px 0 12px;
      margin-bottom: 8px;
    }
    .header-brand h1 {
      font-family: 'Outfit', sans-serif;
      font-weight: 900;
      font-size: 24px;
      color: var(--red);
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

    /* Toggle buttons */
    .toggle-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .toggle-btn {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      letter-spacing: 1.5px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
      color: var(--label);
      border-radius: 8px;
      padding: 10px 18px;
      min-height: 44px;
      cursor: pointer;
      transition: all 0.2s;
      flex: 1 1 0;
    }
    .toggle-btn.active {
      background: rgba(251,44,90,0.1);
      border-color: rgba(251,44,90,0.35);
      color: var(--red);
      box-shadow: 0 0 20px rgba(251,44,90,0.1);
    }

    /* Form inputs */
    .form-input, .form-select {
      display: block;
      width: 100%;
      background: #0a0a10;
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px;
      min-height: 44px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      outline: none;
      transition: border-color 0.2s;
      -webkit-appearance: none;
    }
    .form-input:focus, .form-select:focus {
      border-color: var(--red);
    }
    .form-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--label);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 6px;
      display: block;
    }
    .form-group {
      margin-bottom: 12px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }
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

    /* Skeleton loading */
    @keyframes skeletonPulse {
      0%, 100% { background-color: var(--card); }
      50% { background-color: #141420; }
    }
    .skeleton-rect {
      height: 64px;
      border-radius: 10px;
      animation: skeletonPulse 1.5s ease-in-out infinite;
      margin-bottom: 10px;
    }
    .skeleton-rect:nth-child(2) { animation-delay: 0.2s; }
    .skeleton-rect:nth-child(3) { animation-delay: 0.4s; }

    /* Dashboard panel */
    .dash-balance-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .dash-balance-label,
    .dash-pnl-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--label);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .dash-balance-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
      color: var(--white);
      font-weight: 700;
    }
    .dash-pnl-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
      font-weight: 700;
      text-align: right;
    }
    .dash-pnl-right { text-align: right; }

    /* Sparkline */
    .dash-sparkline { margin-bottom: 16px; }
    .dash-sparkline svg { display: block; width: 100%; height: 36px; }

    /* Gauges */
    .dash-gauge {
      margin-bottom: 12px;
    }
    .dash-gauge-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .dash-gauge-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--label);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .dash-gauge-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      font-weight: 700;
    }
    .dash-gauge-track {
      height: 5px;
      background: rgba(255,255,255,0.08);
      border-radius: 3px;
      overflow: hidden;
      position: relative;
    }
    .dash-gauge-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.6s ease;
    }
    .dash-gauge-fill.normal {
      background: linear-gradient(90deg, var(--red), var(--red-soft));
      box-shadow: 0 0 6px rgba(251,44,90,0.3);
    }
    .dash-gauge-fill.warning {
      background: linear-gradient(90deg, var(--amber), #f59e0b);
      box-shadow: 0 0 6px rgba(251,191,36,0.3);
    }
    .dash-gauge-fill.critical {
      background: linear-gradient(90deg, var(--danger), #dc2626);
      box-shadow: 0 0 10px rgba(239,68,68,0.5);
    }

    /* Stat grid */
    .dash-stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 16px 0;
    }
    .dash-stat-cell {
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      padding: 8px;
      text-align: center;
    }
    .dash-stat-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      color: var(--label);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .dash-stat-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
    }

    /* Payout status */
    .dash-payout-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--label);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .dash-payout-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .dash-payout-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dash-payout-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .dash-payout-dot.pass {
      background: var(--red);
      box-shadow: 0 0 6px var(--red), 0 0 12px rgba(251,44,90,0.3);
    }
    .dash-payout-dot.fail {
      background: var(--subtle);
    }
    .dash-payout-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--label);
    }

    /* Empty state */
    .dash-empty {
      text-align: center;
      padding: 32px 16px;
      color: var(--muted);
      font-style: italic;
      font-size: 14px;
    }

    /* P&L Log */
    .card-title {
      font-family: 'Outfit', sans-serif;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      color: var(--red-soft);
      margin-bottom: 12px;
    }
    .pnl-list {
      max-height: 280px;
      overflow-y: auto;
    }
    .pnl-row {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .pnl-row:last-child { border-bottom: none; }
    .pnl-date {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text);
      min-width: 80px;
    }
    .pnl-instrument {
      background: rgba(255,255,255,0.04);
      color: var(--label);
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      padding: 2px 6px;
      border-radius: 4px;
      margin: 0 8px;
    }
    .pnl-trades {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--muted);
      margin-right: auto;
    }
    .pnl-amount {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      margin-left: 8px;
    }
    .pnl-empty {
      text-align: center;
      padding: 20px;
      color: var(--muted);
      font-size: 13px;
    }

    /* FAB */
    .fab-add {
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--red);
      color: white;
      font-size: 24px;
      box-shadow: 0 4px 20px rgba(251,44,90,0.4);
      z-index: 100;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease;
    }
    .fab-add:hover, .fab-add:active { transform: scale(1.05); }

    /* Trade Modal */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7);
      z-index: 200;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .modal-sheet {
      background: var(--card);
      border-top: 1px solid var(--border);
      border-radius: 14px 14px 0 0;
      padding: 20px;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .modal-title {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: var(--bright);
    }
    .modal-close {
      background: none;
      border: none;
      color: var(--label);
      font-size: 20px;
      cursor: pointer;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-label {
      font-family: 'Outfit', sans-serif;
      font-size: 11px;
      color: var(--label);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .modal-input {
      background: #0a0a10;
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      width: 100%;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .modal-input:focus { outline: none; border-color: var(--red); }
    .modal-toggle-group {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .modal-toggle-btn {
      flex: 1;
      min-height: 44px;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #0a0a10;
      color: var(--label);
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
      text-align: center;
    }
    .modal-toggle-btn.active-instrument {
      background: rgba(251,44,90,0.1);
      border-color: var(--red);
      color: var(--red);
    }
    .modal-toggle-btn.active-long {
      background: rgba(52,211,153,0.1);
      border-color: var(--green);
      color: var(--green);
    }
    .modal-toggle-btn.active-short {
      background: rgba(251,44,90,0.1);
      border-color: var(--red);
      color: var(--red);
    }
    .modal-pnl-display {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      font-weight: 700;
      text-align: center;
      padding: 8px 0;
      margin-bottom: 12px;
    }
    .modal-submit {
      width: 100%;
      padding: 14px;
      background: var(--red);
      color: white;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      border-radius: 10px;
      border: none;
      margin-top: 8px;
      cursor: pointer;
      min-height: 44px;
    }
    .modal-submit:disabled { opacity: 0.4; cursor: default; }

    @media (min-width: 768px) {
      .container { padding: 24px; }
      .card { padding: 20px; }
      .toggle-row { flex-wrap: nowrap; }
      .form-grid { grid-template-columns: 1fr 1fr; }
      .dash-stat-grid { grid-template-columns: repeat(6, 1fr); }
      .dash-gauge { padding: 0 8px; }
      .modal-overlay { align-items: center; }
      .modal-sheet {
        max-width: 480px;
        border-radius: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-brand">
        <h1>MTRADE</h1>
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
        <div class="header-user">
          ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.name}">` : ''}
          <a href="/auth/logout">LOGOUT</a>
        </div>
      </div>
    </div>

    <div id="instrument-selector"></div>
    <div id="apex-selector"></div>
    <div id="dashboard-panel"></div>
    <div id="pnl-log"></div>
    <div id="trade-modal-root"></div>

    <button class="fab-add" id="fab-add" aria-label="Log trade">+</button>

    <div class="footer">
      <div class="footer-brand">MTRADE</div>
      <div class="footer-copy">&copy; 2026 LRX Enterprises Inc.</div>
    </div>
  </div>

  <script>
    function updateClock() {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      document.getElementById('clock').textContent = h + ':' + m + ':' + s;

      // EST = UTC - 5
      const estHour = (now.getUTCHours() - 5 + 24) % 24;
      const estMin = now.getUTCMinutes();
      const estTime = estHour + estMin / 60;

      let label = 'CLOSED';
      let active = false;

      if (estTime >= 2 && estTime < 5) {
        label = 'LONDON'; active = true;
      } else if (estTime >= 5 && estTime < 9.5) {
        label = 'PRE-MKT'; active = true;
      } else if (estTime >= 9.5 && estTime < 12) {
        label = 'NY OPEN'; active = true;
      } else if (estTime >= 14 && estTime < 15) {
        label = 'NY PM'; active = true;
      }

      const indicator = document.getElementById('session-indicator');
      const dotClass = active ? 'active' : 'inactive';
      indicator.innerHTML =
        '<span class="session-dot ' + dotClass + '"></span>' +
        '<span class="session-label ' + dotClass + '">' + label + '</span>';
    }
    updateClock();
    setInterval(updateClock, 1000);

    /* ── Globals ── */
    window.selectedInstrument = 'NQ';
    window.selectedAccountId = null;

    /* ── Instrument Selector ── */
    (function initInstrumentSelector() {
      const el = document.getElementById('instrument-selector');
      const instruments = ['ES', 'NQ'];
      el.innerHTML = '<div class="card"><div class="toggle-row" id="instrument-row"></div></div>';
      const row = document.getElementById('instrument-row');

      function render() {
        row.innerHTML = instruments.map(function(sym) {
          return '<button class="toggle-btn' + (window.selectedInstrument === sym ? ' active' : '') +
            '" data-instrument="' + sym + '">' + sym + '</button>';
        }).join('');
      }
      render();

      row.addEventListener('click', function(e) {
        var btn = e.target.closest('.toggle-btn');
        if (!btn) return;
        window.selectedInstrument = btn.dataset.instrument;
        render();
        document.dispatchEvent(new CustomEvent('instrument-changed', { detail: { instrument: window.selectedInstrument } }));
      });
    })();

    /* ── Apex Account Selector ── */
    (function initApexSelector() {
      var el = document.getElementById('apex-selector');

      var presets = {
        '50000':  { drawdown: 2500, target: 3000, contracts: 10, scaling: 5 },
        '100000': { drawdown: 3000, target: 6000, contracts: 14, scaling: 7 },
        '150000': { drawdown: 5000, target: 9000, contracts: 17, scaling: 9 }
      };

      function renderAccounts(accounts) {
        el.innerHTML = '<div class="card"><div class="toggle-row" id="account-row"></div></div>';
        var row = document.getElementById('account-row');

        if (!window.selectedAccountId && accounts.length) {
          window.selectedAccountId = accounts[0].id;
          document.dispatchEvent(new CustomEvent('account-changed', { detail: { accountId: window.selectedAccountId } }));
        }

        row.innerHTML = accounts.map(function(a) {
          return '<button class="toggle-btn' + (window.selectedAccountId === a.id ? ' active' : '') +
            '" data-account="' + a.id + '">' + (a.label || a.id) + '</button>';
        }).join('');

        row.addEventListener('click', function(e) {
          var btn = e.target.closest('.toggle-btn');
          if (!btn) return;
          window.selectedAccountId = btn.dataset.account;
          renderAccounts(accounts);
          document.dispatchEvent(new CustomEvent('account-changed', { detail: { accountId: window.selectedAccountId } }));
        });
      }

      function renderCreateForm() {
        el.innerHTML =
          '<div class="card">' +
            '<div style="margin-bottom:12px;font-family:JetBrains Mono,monospace;font-size:10px;color:var(--label);letter-spacing:1px;text-transform:uppercase">CREATE APEX ACCOUNT</div>' +
            '<div class="form-grid">' +
              '<div class="form-group"><label class="form-label">LABEL</label><input type="text" id="apex-label" class="form-input" placeholder="My Account"></div>' +
              '<div class="form-group"><label class="form-label">ACCOUNT SIZE</label><select id="apex-size" class="form-select"><option value="">Select…</option><option value="50000">50,000</option><option value="100000">100,000</option><option value="150000">150,000</option></select></div>' +
              '<div class="form-group"><label class="form-label">ACCOUNT TYPE</label><select id="apex-type" class="form-select"><option value="legacy">Legacy</option><option value="v4">V4</option></select></div>' +
              '<div class="form-group"><label class="form-label">DRAWDOWN TYPE</label><select id="apex-dd-type" class="form-select"><option value="trailing">Trailing</option><option value="eod">EOD</option><option value="static">Static</option></select></div>' +
              '<div class="form-group"><label class="form-label">DRAWDOWN</label><input type="number" id="apex-drawdown" class="form-input" readonly></div>' +
              '<div class="form-group"><label class="form-label">TARGET</label><input type="number" id="apex-target" class="form-input" readonly></div>' +
              '<div class="form-group"><label class="form-label">CONTRACTS</label><input type="number" id="apex-contracts" class="form-input" readonly></div>' +
              '<div class="form-group"><label class="form-label">SCALING</label><input type="number" id="apex-scaling" class="form-input" readonly></div>' +
            '</div>' +
            '<button id="apex-submit" class="btn-submit" disabled>CREATE ACCOUNT</button>' +
          '</div>';

        var sizeEl = document.getElementById('apex-size');
        sizeEl.addEventListener('change', function() {
          var p = presets[sizeEl.value];
          if (p) {
            document.getElementById('apex-drawdown').value = p.drawdown;
            document.getElementById('apex-target').value = p.target;
            document.getElementById('apex-contracts').value = p.contracts;
            document.getElementById('apex-scaling').value = p.scaling;
            document.getElementById('apex-submit').disabled = false;
          } else {
            document.getElementById('apex-drawdown').value = '';
            document.getElementById('apex-target').value = '';
            document.getElementById('apex-contracts').value = '';
            document.getElementById('apex-scaling').value = '';
            document.getElementById('apex-submit').disabled = true;
          }
        });

        document.getElementById('apex-submit').addEventListener('click', function() {
          var btn = this;
          btn.disabled = true;
          btn.textContent = 'CREATING…';

          var body = {
            label: document.getElementById('apex-label').value || 'Apex Account',
            account_size: Number(sizeEl.value),
            account_type: document.getElementById('apex-type').value,
            drawdown_type: document.getElementById('apex-dd-type').value,
            drawdown: Number(document.getElementById('apex-drawdown').value),
            profit_target: Number(document.getElementById('apex-target').value),
            max_contracts: Number(document.getElementById('apex-contracts').value),
            scaling_contracts: Number(document.getElementById('apex-scaling').value)
          };

          fetch('/api/apex/accounts', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }).then(function(r) { return r.json(); })
            .then(function() { loadAccounts(); })
            .catch(function(err) {
              btn.disabled = false;
              btn.textContent = 'CREATE ACCOUNT';
              console.error('Failed to create account', err);
            });
        });
      }

      function loadAccounts() {
        fetch('/api/apex/accounts', { credentials: 'same-origin' })
          .then(function(r) { return r.json(); })
          .then(function(accounts) {
            if (accounts && accounts.length) {
              renderAccounts(accounts);
            } else {
              renderCreateForm();
            }
          })
          .catch(function() { renderCreateForm(); });
      }

      loadAccounts();
    })();
  </script>

  <script>
  (function() {
    const panel = document.getElementById('dashboard-panel');
    let pollTimer = null;
    let currentAccountId = null;

    function getSelectedAccountId() {
      const sel = document.querySelector('#apex-selector select');
      return sel ? sel.value : null;
    }

    function showSkeleton() {
      panel.innerHTML =
        '<div class="skeleton-rect"></div>' +
        '<div class="skeleton-rect"></div>' +
        '<div class="skeleton-rect"></div>';
    }

    function fmt(n) {
      return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function buildSparkline(dailyPnl) {
      if (!dailyPnl || dailyPnl.length < 2) return '';
      var vals = dailyPnl.map(function(d) { return d.pnl; });
      var min = Math.min.apply(null, vals);
      var max = Math.max.apply(null, vals);
      var range = max - min || 1;
      var w = 100;
      var h = 36;
      var pad = 2;
      var points = vals.map(function(v, i) {
        var x = (i / (vals.length - 1)) * w;
        var y = h - pad - ((v - min) / range) * (h - pad * 2);
        return x.toFixed(2) + ',' + y.toFixed(2);
      }).join(' ');

      return '<div class="dash-sparkline">' +
        '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
        '<defs><linearGradient id="spark-grad" x1="0" y1="0" x2="1" y2="0">' +
        '<stop offset="0%" stop-color="var(--label)"/>' +
        '<stop offset="100%" stop-color="var(--red)"/>' +
        '</linearGradient></defs>' +
        '<polyline points="' + points + '" fill="none" stroke="url(#spark-grad)" stroke-width="2" vector-effect="non-scaling-stroke"/>' +
        '</svg></div>';
    }

    function gaugeState(value, warnThreshold, critThreshold) {
      if (value >= critThreshold) return 'critical';
      if (value >= warnThreshold) return 'warning';
      return 'normal';
    }

    function buildGauge(label, valueText, fillPct, state) {
      var colorMap = { normal: 'var(--red)', warning: 'var(--amber)', critical: 'var(--danger)' };
      var color = colorMap[state];
      return '<div class="dash-gauge">' +
        '<div class="dash-gauge-header">' +
        '<span class="dash-gauge-label">' + label + '</span>' +
        '<span class="dash-gauge-value" style="color:' + color + '">' + valueText + '</span>' +
        '</div>' +
        '<div class="dash-gauge-track">' +
        '<div class="dash-gauge-fill ' + state + '" style="width:' + Math.min(fillPct, 100) + '%"></div>' +
        '</div></div>';
    }

    function renderDashboard(d) {
      if (!d || d.error || (d.trading_days === 0 && d.total_pnl === 0)) {
        panel.innerHTML = '<div class="card"><div class="dash-empty">No trades yet — tap + to log your first</div></div>';
        return;
      }

      var pnlColor = d.total_pnl >= 0 ? 'var(--red)' : 'var(--label)';
      var pnlPrefix = d.total_pnl > 0 ? '+' : '';

      var html = '<div class="card" style="animation:slideUp 0.3s ease">';

      // Balance row
      html += '<div class="dash-balance-row">' +
        '<div><div class="dash-balance-label">BALANCE</div>' +
        '<div class="dash-balance-value">$' + fmt(d.balance) + '</div></div>' +
        '<div class="dash-pnl-right"><div class="dash-pnl-label">P&L</div>' +
        '<div class="dash-pnl-value" style="color:' + pnlColor + '">' + pnlPrefix + '$' + fmt(d.total_pnl) + '</div></div>' +
        '</div>';

      // Sparkline
      html += buildSparkline(d.daily_pnl);

      // Gauges
      // REV LIMIT - consistency
      var consistencyState = gaugeState(d.consistency_pct >= 100 ? 0 : (100 - d.consistency_pct),
        100 - (d.consistency_limit + 5), 100 - d.consistency_limit);
      // Actually: warning when consistency drops near limit. Let's think differently:
      // consistency_pct is how "good" you are. Lower is worse.
      // warning at limit-5 from max (so consistency <= consistency_limit + 5 in inverted? no)
      // The limit is 30% max single day. consistency_pct = 100 - (maxDayPct - 30).
      // So 100% = perfect, 70% = threshold. Warning at 75%, critical at 70%.
      var revState = d.consistency_pct <= 70 ? 'critical' : d.consistency_pct <= 75 ? 'warning' : 'normal';
      html += buildGauge(
        'REV LIMIT · ' + d.consistency_limit + '% MAX',
        d.consistency_pct + '%',
        d.consistency_pct,
        revState
      );

      // REDLINE - drawdown
      var ddPct = d.drawdown_limit > 0 ? (d.drawdown_used / d.drawdown_limit) * 100 : 0;
      var ddState = ddPct >= 85 ? 'critical' : ddPct >= 70 ? 'warning' : 'normal';
      html += buildGauge(
        'REDLINE · DRAWDOWN',
        '$' + fmt(d.drawdown_used) + ' / $' + fmt(d.drawdown_limit),
        ddPct,
        ddState
      );

      // BOOST - profit target
      var boostPct = d.profit_target > 0 ? (d.total_pnl / d.profit_target) * 100 : 0;
      var boostState = boostPct >= 100 ? 'normal' : boostPct >= 70 ? 'warning' : 'normal';
      html += buildGauge(
        'BOOST · PROFIT TARGET',
        '$' + fmt(d.total_pnl) + ' / $' + fmt(d.profit_target),
        Math.max(0, boostPct),
        boostPct >= 100 ? 'normal' : 'warning'
      );

      // Stat grid
      var winColor = d.win_rate >= 50 ? 'var(--red)' : 'var(--label)';
      var gripReached = d.payout_checks && d.payout_checks.grip;
      var gripColor = gripReached ? 'var(--red)' : 'var(--amber)';

      html += '<div class="dash-stat-grid">';
      html += statCell('Win Rate', d.win_rate + '%', winColor);
      html += statCell('PF', d.profit_factor === Infinity ? '∞' : d.profit_factor.toFixed(2), 'var(--bright)');
      html += statCell('Best Day', '$' + fmt(d.best_day), 'var(--red)');
      html += statCell('Worst Day', '$' + fmt(d.worst_day), 'var(--label)');
      html += statCell('Days', String(d.trading_days), 'var(--bright)');
      html += statCell('GRIP', gripReached ? 'REACHED' : 'PENDING', gripColor);
      html += '</div>';

      // Payout status
      var checks = d.payout_checks || {};
      html += '<div class="dash-payout-label">PAYOUT STATUS</div>';
      html += '<div class="dash-payout-row">';
      html += payoutItem('Consistency', checks.consistency);
      html += payoutItem('Trading Days', checks.trading_days);
      html += payoutItem('GRIP', checks.grip);
      html += payoutItem('Min $500', checks.min_500);
      html += '</div>';

      html += '</div>';
      panel.innerHTML = html;
    }

    function statCell(label, value, color) {
      return '<div class="dash-stat-cell">' +
        '<div class="dash-stat-label">' + label + '</div>' +
        '<div class="dash-stat-value" style="color:' + color + '">' + value + '</div>' +
        '</div>';
    }

    function payoutItem(label, pass) {
      var cls = pass ? 'pass' : 'fail';
      return '<div class="dash-payout-item">' +
        '<span class="dash-payout-dot ' + cls + '"></span>' +
        '<span class="dash-payout-text">' + label + '</span>' +
        '</div>';
    }

    function fetchDashboard() {
      var accountId = getSelectedAccountId();
      if (!accountId) {
        panel.innerHTML = '';
        return;
      }
      if (accountId !== currentAccountId) {
        showSkeleton();
        currentAccountId = accountId;
      }
      fetch('/api/apex/' + accountId + '/dashboard')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.error) {
            panel.innerHTML = '<div class="card"><div class="dash-empty">No trades yet — tap + to log your first</div></div>';
          } else {
            renderDashboard(data);
          }
        })
        .catch(function() {
          panel.innerHTML = '<div class="card"><div class="dash-empty">No trades yet — tap + to log your first</div></div>';
        });
    }

    function startPolling() {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(fetchDashboard, 30000);
    }

    // Listen for account changes
    document.addEventListener('account-changed', function() {
      fetchDashboard();
      startPolling();
    });

    // Initial load — wait a tick for selectors to render
    setTimeout(function() {
      if (getSelectedAccountId()) {
        fetchDashboard();
        startPolling();
      }
    }, 100);
  })();
  </script>

  <script>
  (function() {
    var pnlLog = document.getElementById('pnl-log');
    var modalRoot = document.getElementById('trade-modal-root');
    var fab = document.getElementById('fab-add');

    var INSTRUMENTS = { 1: { symbol: 'ES', tick_size: 0.25, tick_value: 12.50 }, 2: { symbol: 'NQ', tick_size: 0.25, tick_value: 5.00 } };

    function getSelectedAccountId() {
      var sel = document.querySelector('#apex-selector select');
      return sel ? sel.value : null;
    }

    function fmt(n) {
      return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ── P&L Log ──
    function fetchPnlLog() {
      var accountId = getSelectedAccountId();
      if (!accountId) { pnlLog.innerHTML = ''; return; }
      fetch('/api/apex/' + accountId + '/daily-pnl?days=30')
        .then(function(r) { return r.json(); })
        .then(function(rows) { renderPnlLog(rows); })
        .catch(function() { renderPnlLog([]); });
    }

    function renderPnlLog(rows) {
      if (!rows || !rows.length) {
        pnlLog.innerHTML = '<div class="card"><div class="card-title">DAILY P&L</div><div class="pnl-empty">No P&L entries yet</div></div>';
        return;
      }
      var html = '<div class="card" style="animation:slideUp 0.3s ease"><div class="card-title">DAILY P&L</div><div class="pnl-list">';
      rows.forEach(function(r) {
        var positive = r.pnl >= 0;
        var color = positive ? 'var(--red)' : 'var(--label)';
        var prefix = positive ? '+$' : '-$';
        var instrument = r.instrument || '';
        var trades = r.trade_count || 0;
        html += '<div class="pnl-row">' +
          '<span class="pnl-date">' + r.date + '</span>' +
          (instrument ? '<span class="pnl-instrument">' + instrument + '</span>' : '') +
          '<span class="pnl-trades">' + trades + ' trade' + (trades !== 1 ? 's' : '') + '</span>' +
          '<span class="pnl-amount" style="color:' + color + '">' + prefix + fmt(r.pnl) + '</span>' +
          '</div>';
      });
      html += '</div></div>';
      pnlLog.innerHTML = html;
    }

    // ── Trade Modal ──
    var modalState = { instrument_id: 1, direction: 'LONG' };

    function calcPnl() {
      var inst = INSTRUMENTS[modalState.instrument_id];
      var entry = parseFloat(document.getElementById('tm-entry').value);
      var exit = parseFloat(document.getElementById('tm-exit').value);
      var contracts = parseInt(document.getElementById('tm-contracts').value) || 0;
      if (isNaN(entry) || isNaN(exit) || contracts <= 0) return null;
      var sign = modalState.direction === 'LONG' ? 1 : -1;
      return ((exit - entry) / inst.tick_size) * inst.tick_value * contracts * sign;
    }

    function updatePnlDisplay() {
      var el = document.getElementById('tm-pnl-display');
      var btn = document.getElementById('tm-submit');
      var pnl = calcPnl();
      if (pnl === null) {
        el.textContent = '--';
        el.style.color = 'var(--muted)';
        btn.disabled = true;
        return;
      }
      var prefix = pnl >= 0 ? '+$' : '-$';
      el.textContent = prefix + fmt(pnl);
      el.style.color = pnl >= 0 ? 'var(--green)' : 'var(--danger)';
      btn.disabled = false;
    }

    function openModal() {
      modalState.instrument_id = 1;
      modalState.direction = 'LONG';

      var html = '<div class="modal-overlay" id="tm-overlay">' +
        '<div class="modal-sheet">' +
        '<div class="modal-header">' +
        '<span class="modal-title">LOG TRADE</span>' +
        '<button class="modal-close" id="tm-close">&times;</button>' +
        '</div>' +

        '<div class="modal-label">Instrument</div>' +
        '<div class="modal-toggle-group">' +
        '<button class="modal-toggle-btn active-instrument" id="tm-es" type="button">ES</button>' +
        '<button class="modal-toggle-btn" id="tm-nq" type="button">NQ</button>' +
        '</div>' +

        '<div class="modal-label">Direction</div>' +
        '<div class="modal-toggle-group">' +
        '<button class="modal-toggle-btn active-long" id="tm-long" type="button">LONG</button>' +
        '<button class="modal-toggle-btn" id="tm-short" type="button">SHORT</button>' +
        '</div>' +

        '<div class="modal-label">Contracts</div>' +
        '<input class="modal-input" id="tm-contracts" type="number" value="1" min="1" inputmode="numeric">' +

        '<div class="modal-label">Entry Price</div>' +
        '<input class="modal-input" id="tm-entry" type="number" step="0.25" inputmode="decimal">' +

        '<div class="modal-label">Exit Price</div>' +
        '<input class="modal-input" id="tm-exit" type="number" step="0.25" inputmode="decimal">' +

        '<div class="modal-label">P&L</div>' +
        '<div class="modal-pnl-display" id="tm-pnl-display">--</div>' +

        '<div class="modal-label">Notes</div>' +
        '<textarea class="modal-input" id="tm-notes" rows="3" style="resize:vertical"></textarea>' +

        '<button class="modal-submit" id="tm-submit" disabled>LOG TRADE</button>' +
        '</div></div>';

      modalRoot.innerHTML = html;

      // Events
      document.getElementById('tm-close').onclick = closeModal;
      document.getElementById('tm-overlay').onclick = function(e) {
        if (e.target === this) closeModal();
      };

      // Instrument toggle
      document.getElementById('tm-es').onclick = function() {
        modalState.instrument_id = 1;
        this.className = 'modal-toggle-btn active-instrument';
        document.getElementById('tm-nq').className = 'modal-toggle-btn';
        updatePnlDisplay();
      };
      document.getElementById('tm-nq').onclick = function() {
        modalState.instrument_id = 2;
        this.className = 'modal-toggle-btn active-instrument';
        document.getElementById('tm-es').className = 'modal-toggle-btn';
        updatePnlDisplay();
      };

      // Direction toggle
      document.getElementById('tm-long').onclick = function() {
        modalState.direction = 'LONG';
        this.className = 'modal-toggle-btn active-long';
        document.getElementById('tm-short').className = 'modal-toggle-btn';
        updatePnlDisplay();
      };
      document.getElementById('tm-short').onclick = function() {
        modalState.direction = 'SHORT';
        this.className = 'modal-toggle-btn active-short';
        document.getElementById('tm-long').className = 'modal-toggle-btn';
        updatePnlDisplay();
      };

      // Live P&L calc
      ['tm-contracts', 'tm-entry', 'tm-exit'].forEach(function(id) {
        document.getElementById(id).addEventListener('input', updatePnlDisplay);
      });

      // Submit
      document.getElementById('tm-submit').onclick = submitTrade;
    }

    function closeModal() {
      modalRoot.innerHTML = '';
    }

    function submitTrade() {
      var btn = document.getElementById('tm-submit');
      btn.disabled = true;
      btn.textContent = 'SAVING...';

      var pnl = calcPnl();
      var accountId = getSelectedAccountId();
      var today = new Date().toISOString().slice(0, 10);

      var payload = {
        instrument_id: modalState.instrument_id,
        date: today,
        direction: modalState.direction,
        contracts: parseInt(document.getElementById('tm-contracts').value),
        entry_price: parseFloat(document.getElementById('tm-entry').value),
        exit_price: parseFloat(document.getElementById('tm-exit').value),
        pnl: pnl,
        notes: document.getElementById('tm-notes').value
      };

      fetch('/api/trade-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(r) { return r.json(); })
      .then(function() {
        if (!accountId) { closeModal(); return; }
        return fetch('/api/apex/' + accountId + '/daily-pnl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today, pnl: pnl })
        });
      })
      .then(function() {
        closeModal();
        document.dispatchEvent(new Event('account-changed'));
        fetchPnlLog();
      })
      .catch(function() {
        btn.disabled = false;
        btn.textContent = 'LOG TRADE';
      });
    }

    // FAB
    fab.onclick = openModal;

    // Listen for account changes to refresh P&L log
    document.addEventListener('account-changed', function() {
      fetchPnlLog();
    });

    // Initial load
    setTimeout(function() {
      if (getSelectedAccountId()) fetchPnlLog();
    }, 150);
  })();
  </script>
</body>
</html>`;
}
