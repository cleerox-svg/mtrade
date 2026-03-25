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
    .outfit { font-family: 'Outfit', sans-serif; }
    .container {
      width: 100%;
      max-width: 100%;
      padding: 12px;
      margin: 0 auto;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px;
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
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastOut {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    }

    /* Shimmer skeleton */
    .skeleton-shimmer {
      background: linear-gradient(90deg, var(--card) 25%, #141420 50%, var(--card) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }

    /* Data fade-in */
    .data-loaded { animation: fadeIn 0.3s ease forwards; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* Stagger cascade delays */
    .stagger-1 { animation-delay: 100ms; }
    .stagger-2 { animation-delay: 200ms; }
    .stagger-3 { animation-delay: 300ms; }
    .stagger-4 { animation-delay: 400ms; }
    .stagger-5 { animation-delay: 500ms; }

    /* Toast container */
    .toast-container {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 300;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 400px;
      width: calc(100vw - 40px);
      pointer-events: none;
    }
    .toast {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 20px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: var(--bright);
      animation: toastIn 0.3s ease;
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toast.success { border-left: 3px solid var(--green); }
    .toast.error { border-left: 3px solid var(--danger); }
    .toast.warning { border-left: 3px solid var(--amber); }
    .toast.dismissing { animation: toastOut 0.3s ease forwards; }

    /* Pull-to-refresh indicator */
    .ptr-indicator {
      position: fixed;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: var(--red);
      animation: spin 0.8s linear infinite;
      transition: top 0.2s ease;
      z-index: 250;
    }
    .ptr-indicator.visible { top: 12px; }

    /* Logout dropdown */
    .logout-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px;
      display: flex;
      gap: 6px;
      margin-top: 4px;
      animation: slideUp 0.2s ease;
      z-index: 50;
    }
    .logout-dropdown button {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      letter-spacing: 1px;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      min-height: 32px;
    }
    .logout-yes { background: var(--red); color: white; }
    .logout-no { background: transparent; border: 1px solid var(--border); color: var(--muted); }

    /* Active account dot */
    .account-active-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 4px var(--green);
      margin-left: 4px;
      vertical-align: middle;
    }

    /* Header */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 16px 0 12px;
      margin-bottom: 0;
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

    /* Live Price */
    .live-price-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin-bottom: 4px;
    }
    .live-price-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 34px;
      font-weight: 700;
      color: var(--white);
      line-height: 1;
    }
    .live-price-change {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .live-price-change.up { background: rgba(52,211,153,0.15); color: var(--green); }
    .live-price-change.down { background: rgba(239,68,68,0.15); color: var(--danger); }
    .live-price-change.flat { background: rgba(148,163,184,0.15); color: var(--label); }
    .live-price-indicator {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      color: var(--label);
      letter-spacing: 1px;
    }
    .live-price-indicator .dot {
      display: inline-block;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      margin-right: 4px;
      vertical-align: middle;
    }
    .live-price-indicator .dot.live { background: var(--green); animation: breathe 2s ease-in-out infinite; }
    .live-price-indicator .dot.delayed { background: var(--amber); }
    .live-session-levels {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
    }
    .live-session-levels .level-label { color: var(--muted); margin-right: 4px; }
    .live-session-levels .level-value { color: var(--label); }

    /* TradingView Chart */
    #tv-chart-wrap {
      width: 100%;
      height: 250px;
      border-radius: 10px;
      overflow: hidden;
      background: #0a0a10;
      margin-bottom: 8px;
    }
    #tv-chart-wrap iframe { border: none !important; }

    /* Candlestick Chart */
    .chart-svg { width: 100%; height: 240px; display: block; background: #0a0a10; border-radius: 10px; }
    .chart-wrap { position: relative; }
    .chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      padding: 8px 4px 0;
    }
    .chart-legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--muted);
    }
    .chart-legend-swatch {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      flex-shrink: 0;
    }
    /* Timeframe selector */
    .tf-row {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .tf-btn {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      letter-spacing: 1px;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.1);
      color: var(--label);
      border-radius: 6px;
      padding: 4px 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tf-btn.active {
      background: rgba(251,44,90,0.1);
      border-color: rgba(251,44,90,0.35);
      color: var(--red);
    }
    /* Chart crosshair tooltip */
    .chart-crosshair-label {
      position: absolute;
      pointer-events: none;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      background: var(--white);
      color: #0a0a10;
      padding: 1px 4px;
      border-radius: 2px;
      white-space: nowrap;
      z-index: 5;
    }
    /* LIVE / DELAYED tag */
    .chart-live-tag {
      position: absolute;
      top: 8px;
      left: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      letter-spacing: 0.5px;
      z-index: 5;
      pointer-events: none;
    }
    .chart-live-tag .tag-dot {
      width: 5px; height: 5px; border-radius: 50%; display: inline-block;
    }

    /* Entry pulse animation */
    @keyframes entryPulse {
      0%, 100% { filter: drop-shadow(0 0 2px var(--red)); }
      50% { filter: drop-shadow(0 0 8px var(--red)) drop-shadow(0 0 14px rgba(251,44,90,0.4)); }
    }
    .entry-line-glow { animation: entryPulse 2s ease-in-out infinite; }

    /* Signal Progression */
    .signal-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .signal-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid;
    }
    .phase-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .phase-row:last-child { border-bottom: none; }
    .phase-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .phase-dot.completed {
      background: var(--red);
      box-shadow: 0 0 6px rgba(251,44,90,0.4);
    }
    .phase-dot.current {
      background: var(--amber);
      animation: breathe 2s ease-in-out infinite;
      box-shadow: 0 0 8px rgba(251,191,36,0.5);
    }
    .phase-dot.pending {
      background: rgba(255,255,255,0.08);
    }
    .phase-label {
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 600;
      min-width: 110px;
    }
    .phase-desc {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--label);
      flex: 1;
    }
    .phase-check {
      font-size: 10px;
      margin-left: auto;
      flex-shrink: 0;
    }
    .phase-row.pending-row { opacity: 0.3; }
    .phase-row.pending-row .phase-label { color: var(--subtle); }
    .phase-row.pending-row .phase-desc { color: var(--subtle); }

    .signal-status-box {
      background: rgba(255,255,255,0.02);
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
    }
    .signal-status-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .signal-status-msg {
      font-size: 12px;
      color: var(--bright);
      line-height: 1.5;
    }

    /* Alert border flash */
    body {
      border: 2px solid transparent;
      transition: border-color 1s ease;
    }
    body.alert-flash {
      border-color: var(--red) !important;
      transition: border-color 0s;
    }

    /* Alert pulsing dot */
    @keyframes alertPulse {
      0%, 100% { opacity: 0.4; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    .alert-dot {
      display: none;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--red);
      margin-left: 6px;
      animation: alertPulse 1.5s ease-in-out infinite;
    }
    .alert-dot.visible { display: inline-block; }

    /* Alert overlay card */
    @keyframes alertBorderPulse {
      0%, 100% { border-color: rgba(251,44,90,0.2); }
      50% { border-color: rgba(251,44,90,0.6); }
    }
    @keyframes alertBreathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.003); }
    }
    .alert-overlay {
      background: linear-gradient(135deg, rgba(251,44,90,0.06), rgba(251,44,90,0.01));
      border: 2px solid rgba(251,44,90,0.2);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 12px;
      animation: alertBorderPulse 3s ease-in-out infinite, alertBreathe 3s ease-in-out infinite, slideUp 0.3s ease;
    }
    .alert-signal-name {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 22px;
      color: var(--red);
      margin-bottom: 4px;
    }
    .alert-instrument-dir {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      color: var(--white);
      margin-bottom: 12px;
    }
    .alert-levels-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      text-align: center;
      margin-bottom: 10px;
    }
    .alert-level-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      color: var(--label);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .alert-level-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 20px;
      font-weight: 700;
    }
    .alert-rr {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      color: var(--amber);
      text-align: center;
      margin-bottom: 8px;
    }
    .alert-message {
      font-size: 13px;
      color: var(--bright);
      line-height: 1.6;
      margin-top: 12px;
    }
    .alert-actions {
      display: flex;
      gap: 10px;
      margin-top: 14px;
    }
    .alert-btn-in {
      flex: 1;
      background: var(--red);
      color: white;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      border: none;
      border-radius: 10px;
      padding: 14px;
      cursor: pointer;
      min-height: 44px;
    }
    .alert-btn-skip {
      flex: 1;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--muted);
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      border-radius: 10px;
      padding: 14px;
      cursor: pointer;
      min-height: 44px;
    }
    .demo-alert-link {
      display: block;
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--subtle);
      cursor: pointer;
      background: none;
      border: none;
      padding: 8px;
      margin: 0 auto;
    }
    .demo-alert-link:hover { color: var(--muted); }

    /* Notification Settings */
    .notif-webhook-row {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .notif-webhook-row .modal-input {
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
      padding: 12px 14px;
      cursor: pointer;
      white-space: nowrap;
      min-height: 44px;
    }
    .notif-btn:hover { border-color: var(--red); }
    .notif-help {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--muted);
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .notif-test-status {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      margin-left: 6px;
      transition: opacity 0.3s;
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
      font-size: 10px;
      color: var(--muted);
      margin-top: 1px;
    }
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

    /* Strategy Config Card */
    .strat-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
    }
    .strat-card-header .card-title { margin-bottom: 0; }
    .strat-chevron {
      font-size: 12px;
      color: var(--muted);
      transition: transform 0.25s;
    }
    .strat-chevron.open { transform: rotate(180deg); }
    .strat-body { overflow: hidden; transition: max-height 0.35s ease, opacity 0.25s; }
    .strat-body.collapsed { max-height: 0 !important; opacity: 0; pointer-events: none; }
    .strat-body.expanded { opacity: 1; pointer-events: auto; }

    .preset-row {
      display: flex;
      gap: 8px;
      margin: 14px 0;
    }
    .preset-btn {
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
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
    .kill-switch-track {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.08);
      border-radius: 14px;
      transition: background 0.25s, box-shadow 0.25s;
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
      font-size: 9px;
      color: var(--muted);
      margin-bottom: 16px;
    }

    .strat-divider {
      font-family: 'Outfit', sans-serif;
      font-size: 9px;
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
      font-size: 9px;
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
      width: 80px;
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
      font-size: 9px;
      color: var(--muted);
      margin-top: 2px;
      text-align: right;
    }
    .strat-clear-btn {
      background: none;
      border: 1px solid var(--border);
      color: var(--muted);
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      margin-left: 6px;
    }
    .strat-clear-btn:hover { border-color: var(--danger); color: var(--danger); }

    /* Instrument micro labels */
    .instrument-micro {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7px;
      color: var(--muted);
      display: block;
      margin-top: 1px;
      letter-spacing: 0.5px;
    }
    @media (max-width: 767px) {
      #instrument-row {
        display: grid !important;
        grid-template-columns: 1fr 1fr;
        width: 100%;
      }
    }

    /* Template cards for account creation */
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
      font-size: 9px;
      color: var(--muted);
      margin-top: 4px;
      line-height: 1.4;
    }
    .template-card .tpl-tag {
      display: inline-block;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      font-weight: 600;
      letter-spacing: 0.5px;
      color: var(--amber);
      border: 1px solid rgba(251,191,36,0.3);
      border-radius: 4px;
      padding: 1px 5px;
      margin-top: 4px;
    }
    .tpl-step2 {
      animation: slideUp 0.3s ease;
    }
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
      font-size: 10px;
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

    /* Portfolio View */
    .portfolio-summary {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    @media (min-width: 768px) {
      .portfolio-summary { grid-template-columns: repeat(4, 1fr); }
    }
    .portfolio-stat {
      background: rgba(255,255,255,0.02);
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .portfolio-stat-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--label);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .portfolio-stat-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      font-weight: 700;
      color: var(--bright);
    }
    .portfolio-account-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .portfolio-account-row:hover { background: rgba(255,255,255,0.03); }
    .portfolio-account-label {
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      color: var(--bright);
      font-weight: 600;
    }
    .portfolio-account-stats {
      display: flex;
      gap: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
    }
    .portfolio-flag {
      color: var(--danger);
      font-weight: 700;
    }

    /* Compliance Results */
    .compliance-results {
      margin-top: 12px;
      animation: slideUp 0.3s ease;
    }
    .compliance-check-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: rgba(255,255,255,0.02);
      border-radius: 8px;
      margin-bottom: 4px;
    }
    .compliance-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .compliance-dot.pass { background: var(--green); box-shadow: 0 0 4px var(--green); }
    .compliance-dot.warn { background: var(--amber); box-shadow: 0 0 4px var(--amber); }
    .compliance-dot.fail { background: var(--danger); box-shadow: 0 0 4px var(--danger); }
    .compliance-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--label);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-width: 72px;
    }
    .compliance-msg {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text);
      flex: 1;
    }
    .compliance-rec {
      padding: 10px;
      border-radius: 8px;
      margin-top: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
    }
    .compliance-rec.reduce {
      background: rgba(251,191,36,0.08);
      border: 1px solid rgba(251,191,36,0.2);
      color: var(--amber);
    }
    .compliance-rec.skip {
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.2);
      color: var(--danger);
    }
    .compliance-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    .compliance-confirm {
      flex: 1;
      padding: 14px;
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      min-height: 44px;
      color: white;
    }
    .compliance-confirm.all-pass { background: var(--green); }
    .compliance-confirm.warnings { background: var(--amber); color: #000; }
    .compliance-confirm:disabled { opacity: 0.4; cursor: default; }
    .compliance-cancel {
      flex: 1;
      padding: 14px;
      background: transparent;
      border: 1px solid var(--border);
      color: var(--muted);
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      border-radius: 10px;
      cursor: pointer;
      min-height: 44px;
    }
    .alert-compliance-summary {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      padding: 6px 10px;
      border-radius: 6px;
      margin-top: 8px;
    }
    .alert-compliance-summary.warn {
      background: rgba(251,191,36,0.08);
      color: var(--amber);
      border: 1px solid rgba(251,191,36,0.15);
    }
    .alert-compliance-summary.fail {
      background: rgba(239,68,68,0.08);
      color: var(--danger);
      border: 1px solid rgba(239,68,68,0.15);
    }
    .alert-btn-reduce {
      flex: 1;
      background: rgba(251,191,36,0.1);
      border: 1px solid var(--amber);
      color: var(--amber);
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      border-radius: 10px;
      padding: 14px;
      cursor: pointer;
      min-height: 44px;
    }
    .compliance-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid transparent;
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: middle;
      margin-right: 6px;
    }

    /* AI Analysis */
    .ai-analysis-card { margin-bottom: 12px; }
    .ai-analysis-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .ai-analysis-title {
      font-family: 'Outfit', sans-serif;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      color: var(--red-soft);
    }
    .ai-analysis-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      color: var(--label);
      letter-spacing: 1px;
    }
    .ai-run-btn {
      width: 100%;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid rgba(251,44,90,0.2);
      background: linear-gradient(135deg, rgba(251,44,90,0.06), transparent);
      color: var(--red);
      font-family: 'Outfit', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .ai-run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .ai-run-btn .ai-spinner {
      width: 14px;
      height: 14px;
      border: 2px solid transparent;
      border-top-color: var(--red);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    .ai-signal-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-top: 14px;
    }
    .ai-signal-tag {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .ai-signal-tag.high { background: rgba(251,44,90,0.15); color: var(--red); }
    .ai-signal-tag.mid { background: rgba(251,191,36,0.15); color: var(--amber); }
    .ai-signal-tag.low { background: rgba(100,116,139,0.15); color: var(--label); }
    .ai-fragrance {
      font-size: 10px;
      font-style: italic;
      color: var(--label);
      margin-top: 4px;
    }
    .ai-confidence-box { text-align: right; }
    .ai-confidence-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 28px;
      font-weight: 700;
      line-height: 1;
    }
    .ai-confidence-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8px;
      color: var(--label);
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .ai-summary {
      font-size: 13px;
      color: var(--bright);
      line-height: 1.7;
      margin: 14px 0;
    }
    .ai-levels-box {
      background: #0a0a10;
      border-radius: 10px;
      padding: 12px;
      border: 1px solid var(--border);
      margin-bottom: 12px;
    }
    .ai-level-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }
    .ai-level-row + .ai-level-row { border-top: 1px solid var(--border); }
    .ai-level-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--label);
      letter-spacing: 1px;
    }
    .ai-level-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
    }
    .ai-warnings { margin-bottom: 12px; }
    .ai-warning-item {
      font-size: 12px;
      color: var(--text);
      line-height: 1.5;
      padding: 2px 0;
    }
    .ai-warning-bullet { color: var(--red-soft); margin-right: 6px; }
    .ai-redline-box {
      background: rgba(251,44,90,0.04);
      border: 1px solid rgba(251,44,90,0.08);
      border-radius: 8px;
      padding: 10px;
    }
    .ai-redline-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--red-soft);
      letter-spacing: 2px;
      margin-bottom: 6px;
    }
    .ai-redline-text {
      font-size: 12px;
      color: var(--text);
      line-height: 1.5;
    }
    .ai-contracts-text {
      font-size: 11px;
      color: var(--muted);
      font-style: italic;
      margin-top: 4px;
    }

    /* Dashboard grid layout */
    .dashboard-grid {
      display: block;
    }
    .grid-left, .grid-right {
      width: 100%;
    }
    .selectors-row {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .selectors-row > div { width: 100%; }

    /* Mobile form inputs: 16px min to prevent iOS zoom */
    .modal-input { font-size: 16px; }
    .form-input, .form-select { font-size: 16px; }

    /* ─── Tablet (768px – 1024px) ─── */
    @media (min-width: 768px) {
      .container { padding: 20px; max-width: 768px; }
      .card { padding: 18px; }
      .header-brand h1 { font-size: 28px; }
      .header-clock .time { font-size: 18px; }
      .toggle-row { flex-wrap: nowrap; }
      .toggle-btn { min-height: 40px; }
      .selectors-row { flex-direction: row; gap: 12px; }
      .selectors-row > div { flex: 1; }
      .selectors-row .card { margin-bottom: 12px; }
      .form-grid { grid-template-columns: 1fr 1fr; }
      .chart-svg { height: 340px; }
      #tv-chart-wrap { height: 350px; }
      .alert-overlay { padding: 20px; }
      .alert-signal-name { font-size: 28px; }
      .alert-levels-grid { gap: 16px; }
      .alert-level-value { font-size: 24px; }
      .alert-btn-in, .alert-btn-skip { padding: 16px; font-size: 15px; }
      .phase-label { font-size: 13px; }
      .phase-desc { font-size: 11px; }
      .ai-signal-row { align-items: center; }
      .ai-confidence-num { font-size: 32px; }
      .ai-levels-box { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0; }
      .ai-level-row { flex-direction: column; text-align: center; padding: 8px 4px; }
      .ai-level-row + .ai-level-row { border-top: none; border-left: 1px solid var(--border); }
      .dash-balance-value { font-size: 26px; }
      .dash-pnl-value { font-size: 26px; }
      .modal-overlay { align-items: center; }
      .modal-sheet {
        max-width: 480px;
        border-radius: 14px;
      }
      .modal-input { font-size: 14px; }
      .form-input, .form-select { font-size: 14px; }
      .pnl-list { max-height: 340px; }
      .dashboard-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .tf-btn { padding: 4px 12px; }
      .dash-payout-row { gap: 16px; }
      .footer { padding: 36px 0 28px; }
    }

    /* ─── Desktop (> 1024px) ─── */
    @media (min-width: 1025px) {
      .container { padding: 24px; max-width: 1200px; }
      .card { padding: 22px; }
      .header-brand h1 { font-size: 28px; }
      .header-clock .time { font-size: 18px; }
      .header-user img { width: 36px; height: 36px; }
      .toggle-btn { min-height: 36px; padding: 8px 18px; font-size: 12px; }
      .chart-svg { height: 420px; }
      #tv-chart-wrap { height: 450px; }
      .alert-overlay { padding: 24px; }
      .alert-signal-name { font-size: 28px; }
      .alert-level-value { font-size: 28px; }
      .alert-btn-in, .alert-btn-skip { padding: 18px; font-size: 15px; }
      .phase-label { font-size: 14px; }
      .phase-desc { font-size: 10px; }
      .signal-status-box { padding: 14px; }
      .ai-confidence-num { font-size: 34px; }
      .ai-warnings { columns: 2; column-gap: 16px; }
      .ai-warning-item { break-inside: avoid; }
      .dash-balance-value { font-size: 28px; }
      .dash-pnl-value { font-size: 28px; }
      .dash-sparkline svg { height: 48px; }
      .dash-stat-grid { grid-template-columns: repeat(6, 1fr); }
      .dash-payout-row { gap: 20px; }
      .live-price-value { font-size: 38px; }
      .pnl-list { max-height: 400px; }
      .pnl-date { min-width: 100px; }
      .pnl-amount { font-size: 15px; }
      .fab-add { width: 56px; height: 56px; font-size: 26px; }
      .modal-sheet { max-width: 520px; }
      .tf-btn { padding: 5px 14px; }
      .chart-crosshair-label { font-size: 10px; }
      .dashboard-grid {
        display: grid;
        grid-template-columns: 3fr 2fr;
        gap: 16px;
      }
      .footer { padding: 40px 0 32px; }
    }

    /* ─── Large Desktop (> 1440px) ─── */
    @media (min-width: 1441px) {
      .container { max-width: 1400px; }
    }
  </style>
</head>
<body>
  <div class="toast-container" id="toast-container"></div>
  <div class="ptr-indicator" id="ptr-indicator"></div>
  <div class="container" id="main-container">
    <div class="header">
      <div class="header-brand">
        <h1 style="display:inline-flex;align-items:center">MTRADE<span class="alert-dot" id="alert-dot"></span></h1>
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
          <a href="#" id="logout-btn" onclick="event.preventDefault();window.__showLogoutConfirm()">LOGOUT</a>
          <div id="logout-dropdown" style="display:none"></div>
        </div>
      </div>
    </div>

    <div class="tab-bar">
      <a href="/app" class="active">DASHBOARD</a>
      <a href="/app/learn">LEARN</a>
    </div>

    <div class="selectors-row">
      <div id="instrument-selector"></div>
      <div id="alpha-selector"></div>
    </div>
    <div id="live-price-card"></div>
    <div id="alert-overlay"></div>
    <div class="dashboard-grid">
      <div class="grid-left">
        <div id="tv-chart-container"></div>
        <div id="price-chart"></div>
      </div>
      <div class="grid-right">
        <div id="ai-analysis"></div>
        <div id="signal-tracker"></div>
        <div id="dashboard-panel"></div>
        <div id="performance-card"></div>
      </div>
    </div>
    <div id="pnl-log"></div>
    <div id="notifications-settings"></div>
    <div id="strategy-config"></div>
    <div id="trade-modal-root"></div>

    <button class="fab-add" id="fab-add" aria-label="Log trade">+</button>

    <button class="demo-alert-link" id="demo-alert-btn">Create Demo Alert</button>

    <div id="engine-status" style="text-align:center;padding:8px 0;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:0.5px"></div>

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
      const instruments = [
        { sym: 'ES', label: 'ES', micro: null },
        { sym: 'NQ', label: 'NQ', micro: null },
        { sym: 'MES', label: 'MES', micro: 'MICRO' },
        { sym: 'MNQ', label: 'MNQ', micro: 'MICRO' }
      ];
      el.innerHTML = '<div class="card"><div class="toggle-row" id="instrument-row"></div></div>';
      const row = document.getElementById('instrument-row');

      function render() {
        row.innerHTML = instruments.map(function(inst) {
          return '<button class="toggle-btn' + (window.selectedInstrument === inst.sym ? ' active' : '') +
            '" data-instrument="' + inst.sym + '">' + inst.label +
            (inst.micro ? '<span class="instrument-micro">' + inst.micro + '</span>' : '') +
            '</button>';
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

    /* ── Alpha Futures Account Selector ── */
    (function initAlphaSelector() {
      var el = document.getElementById('alpha-selector');
      var cachedAccounts = [];
      var templates = [];
      var selectedTemplate = null;
      var portfolioMode = false;

      function renderAccounts(accounts) {
        cachedAccounts = accounts;
        var showPortfolio = accounts.filter(function(a) { return a.is_active !== 0; }).length >= 2;

        el.innerHTML = '<div class="card"><div class="toggle-row" id="account-row"></div></div>';
        var row = document.getElementById('account-row');

        if (!window.selectedAccountId && accounts.length && !portfolioMode) {
          window.selectedAccountId = accounts[0].id;
          document.dispatchEvent(new CustomEvent('account-changed', { detail: { accountId: window.selectedAccountId } }));
        }

        var btns = '';
        if (showPortfolio) {
          btns += '<button class="toggle-btn' + (portfolioMode ? ' active' : '') +
            '" data-account="portfolio" style="flex:0 0 auto;padding:10px 14px">\\u25A6 PORTFOLIO</button>';
        }
        btns += accounts.map(function(a) {
          var isActive = !portfolioMode && String(window.selectedAccountId) === String(a.id);
          return '<button class="toggle-btn' + (isActive ? ' active' : '') +
            '" data-account="' + a.id + '">' + (a.label || a.id) + (isActive ? '<span class="account-active-dot"></span>' : '') + '</button>';
        }).join('');

        row.innerHTML = btns;

        row.addEventListener('click', function(e) {
          var btn = e.target.closest('.toggle-btn');
          if (!btn) return;
          if (btn.dataset.account === 'portfolio') {
            portfolioMode = true;
            window.selectedAccountId = null;
            renderAccounts(accounts);
            renderPortfolio(accounts);
            return;
          }
          portfolioMode = false;
          window.selectedAccountId = btn.dataset.account;
          renderAccounts(accounts);
          document.dispatchEvent(new CustomEvent('account-changed', { detail: { accountId: window.selectedAccountId } }));
        });

        if (portfolioMode) renderPortfolio(accounts);
      }

      function renderPortfolio(accounts) {
        var panel = document.getElementById('dashboard-panel');
        panel.innerHTML = '<div class="card" style="animation:slideUp 0.3s ease"><div class="card-title">\\u25C8 PORTFOLIO</div>' +
          '<div class="portfolio-summary" id="portfolio-summary">' +
          '<div class="portfolio-stat"><div class="portfolio-stat-label">BALANCE</div><div class="portfolio-stat-value skeleton-shimmer" style="height:20px;width:80px;margin:0 auto"></div></div>' +
          '<div class="portfolio-stat"><div class="portfolio-stat-label">P&L</div><div class="portfolio-stat-value skeleton-shimmer" style="height:20px;width:80px;margin:0 auto"></div></div>' +
          '<div class="portfolio-stat"><div class="portfolio-stat-label">CONSISTENCY</div><div class="portfolio-stat-value skeleton-shimmer" style="height:20px;width:60px;margin:0 auto"></div></div>' +
          '<div class="portfolio-stat"><div class="portfolio-stat-label">DRAWDOWN</div><div class="portfolio-stat-value skeleton-shimmer" style="height:20px;width:60px;margin:0 auto"></div></div>' +
          '</div><div id="portfolio-accounts"></div></div>';

        var activeAccounts = accounts.filter(function(a) { return a.is_active !== 0; });
        var promises = activeAccounts.map(function(a) {
          return fetch('/api/alpha/' + a.id + '/dashboard', { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(d) { return { account: a, dash: d }; })
            .catch(function() { return { account: a, dash: null }; });
        });

        Promise.all(promises).then(function(results) {
          var totalBalance = 0;
          var totalPnl = 0;
          var worstConsistency = 0;
          var totalDdExposure = 0;

          results.forEach(function(r) {
            if (!r.dash) return;
            totalBalance += (r.account.account_size || 0) + (r.dash.total_pnl || 0);
            totalPnl += r.dash.total_pnl || 0;
            if (r.dash.consistency_pct > worstConsistency) worstConsistency = r.dash.consistency_pct;
            totalDdExposure += r.dash.drawdown_pct || 0;
          });

          var consColor = worstConsistency > 45 ? 'var(--danger)' : worstConsistency > 35 ? 'var(--amber)' : 'var(--bright)';
          var pnlColor = totalPnl >= 0 ? 'var(--green)' : 'var(--danger)';

          var sumEl = document.getElementById('portfolio-summary');
          sumEl.innerHTML =
            '<div class="portfolio-stat"><div class="portfolio-stat-label">BALANCE</div><div class="portfolio-stat-value">' + window.__fmtDollar(totalBalance) + '</div></div>' +
            '<div class="portfolio-stat"><div class="portfolio-stat-label">P&L</div><div class="portfolio-stat-value" style="color:' + pnlColor + '">' + window.__fmtDollar(totalPnl) + '</div></div>' +
            '<div class="portfolio-stat"><div class="portfolio-stat-label">CONSISTENCY</div><div class="portfolio-stat-value" style="color:' + consColor + '">' + worstConsistency.toFixed(1) + '%' + (worstConsistency > 45 ? ' <span class="portfolio-flag">!</span>' : '') + '</div></div>' +
            '<div class="portfolio-stat"><div class="portfolio-stat-label">DD EXPOSURE</div><div class="portfolio-stat-value">' + (totalDdExposure / Math.max(results.length, 1)).toFixed(1) + '%</div></div>';

          var acctHtml = '';
          results.forEach(function(r) {
            if (!r.dash) return;
            var bal = (r.account.account_size || 0) + (r.dash.total_pnl || 0);
            var pColor = (r.dash.total_pnl || 0) >= 0 ? 'var(--green)' : 'var(--danger)';
            var cColor = (r.dash.consistency_pct || 0) > 45 ? 'var(--danger)' : 'var(--label)';
            acctHtml += '<div class="portfolio-account-row" data-acct-id="' + r.account.id + '">';
            acctHtml += '<div class="portfolio-account-label">' + (r.account.label || r.account.id) + '</div>';
            acctHtml += '<div class="portfolio-account-stats">';
            acctHtml += '<span style="color:var(--bright)">' + window.__fmtDollar(bal) + '</span>';
            acctHtml += '<span style="color:' + pColor + '">' + window.__fmtDollar(r.dash.total_pnl) + '</span>';
            acctHtml += '<span style="color:' + cColor + '">' + (r.dash.consistency_pct || 0).toFixed(1) + '%</span>';
            acctHtml += '<span style="color:var(--label)">' + (r.dash.drawdown_pct || 0).toFixed(1) + '% DD</span>';
            acctHtml += '</div></div>';
          });

          var acctEl = document.getElementById('portfolio-accounts');
          acctEl.innerHTML = acctHtml;

          acctEl.querySelectorAll('.portfolio-account-row').forEach(function(row) {
            row.onclick = function() {
              portfolioMode = false;
              window.selectedAccountId = this.dataset.acctId;
              renderAccounts(cachedAccounts);
              document.dispatchEvent(new CustomEvent('account-changed', { detail: { accountId: window.selectedAccountId } }));
            };
          });
        });
      }

      function renderCreateForm() {
        selectedTemplate = null;
        var html = '<div class="card">' +
          '<div style="margin-bottom:12px;font-family:JetBrains Mono,monospace;font-size:10px;color:var(--label);letter-spacing:1px;text-transform:uppercase">CREATE ALPHA FUTURES ACCOUNT</div>' +
          '<div class="template-grid" id="template-grid"></div>' +
          '<div id="template-step2"></div>' +
          '</div>';
        el.innerHTML = html;

        if (templates.length) {
          renderTemplateGrid();
        } else {
          fetch('/api/alpha/templates', { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(data) { templates = data; renderTemplateGrid(); })
            .catch(function() {});
        }
      }

      function renderTemplateGrid() {
        var grid = document.getElementById('template-grid');
        grid.innerHTML = templates.map(function(t) {
          var isSelected = selectedTemplate && selectedTemplate.id === t.id;
          var isStatic = (t.label || '').indexOf('Static') !== -1;
          return '<div class="template-card' + (isSelected ? ' selected' : '') + '" data-tpl-id="' + t.id + '">' +
            '<div class="tpl-size">' + t.label + '</div>' +
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
        if (!selectedTemplate) { document.getElementById('template-step2').innerHTML = ''; return; }
        var t = selectedTemplate;
        var defaultLabel = t.label + ' Legacy #1';

        var html = '<div class="tpl-step2">';
        html += '<div class="form-group"><label class="form-label">LABEL</label><input type="text" id="alpha-label" class="form-input" value="' + defaultLabel + '"></div>';

        html += '<div class="form-group"><label class="form-label">ACCOUNT TYPE</label>';
        html += '<div class="tpl-type-toggle" id="alpha-type-toggle">';
        html += '<button class="tpl-type-btn active" data-val="legacy">LEGACY</button>';
        html += '<button class="tpl-type-btn" data-val="v4">V4</button>';
        html += '</div></div>';

        html += '<div class="form-group"><label class="form-label">DRAWDOWN TYPE</label>';
        html += '<div class="tpl-type-toggle" id="alpha-dd-toggle">';
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

        html += '<button id="alpha-submit" class="btn-submit">CREATE ACCOUNT</button>';
        html += '</div>';

        document.getElementById('template-step2').innerHTML = html;

        // Type toggle bindings
        function bindToggleGroup(groupId) {
          var group = document.getElementById(groupId);
          group.querySelectorAll('.tpl-type-btn').forEach(function(btn) {
            btn.onclick = function() {
              group.querySelectorAll('.tpl-type-btn').forEach(function(b) { b.classList.remove('active'); });
              this.classList.add('active');
            };
          });
        }
        bindToggleGroup('alpha-type-toggle');
        bindToggleGroup('alpha-dd-toggle');

        document.getElementById('alpha-submit').addEventListener('click', function() {
          var btn = this;
          btn.disabled = true;
          btn.textContent = 'CREATING\\u2026';

          var accountType = document.querySelector('#alpha-type-toggle .tpl-type-btn.active').dataset.val;
          var ddType = document.querySelector('#alpha-dd-toggle .tpl-type-btn.active').dataset.val;

          var body = {
            template_id: selectedTemplate.id,
            label: document.getElementById('alpha-label').value || selectedTemplate.label + ' Account',
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
              window.__showToast('\\u2713 Account created \\u2014 ' + body.label, 'success');
              loadAccounts();
            })
            .catch(function(err) {
              btn.disabled = false;
              btn.textContent = 'CREATE ACCOUNT';
              window.__showToast('\\u2717 Something went wrong \\u2014 try again', 'error');
              console.error('Failed to create account', err);
            });
        });
      }

      function loadAccounts() {
        fetch('/api/alpha/accounts', { credentials: 'same-origin' })
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
      const sel = document.querySelector('#alpha-selector select');
      return sel ? sel.value : null;
    }

    function showSkeleton() {
      panel.innerHTML = '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:14px">' +
        '<div><div class="skeleton-shimmer" style="width:60px;height:10px;margin-bottom:6px"></div><div class="skeleton-shimmer" style="width:140px;height:26px"></div></div>' +
        '<div style="text-align:right"><div class="skeleton-shimmer" style="width:40px;height:10px;margin-bottom:6px;margin-left:auto"></div><div class="skeleton-shimmer" style="width:120px;height:26px"></div></div>' +
        '</div>' +
        '<div class="skeleton-shimmer" style="width:100%;height:36px;margin-bottom:12px"></div>' +
        '<div class="skeleton-shimmer" style="width:100%;height:5px;margin-bottom:12px"></div>' +
        '<div class="skeleton-shimmer" style="width:100%;height:5px;margin-bottom:12px"></div>' +
        '<div class="skeleton-shimmer" style="width:100%;height:5px;margin-bottom:16px"></div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' +
        '<div class="skeleton-shimmer" style="height:48px;border-radius:8px"></div>'.repeat(6) +
        '</div></div>';
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
      fetch('/api/alpha/' + accountId + '/dashboard')
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
  /* ── Live Price Display ── */
  (function() {
    var priceCard = document.getElementById('live-price-card');
    var priceData = {};
    var sessionData = {};

    function renderPriceCard() {
      var sym = window.selectedInstrument || 'NQ';
      var p = priceData[sym];
      var html = '<div class="card" style="animation:slideUp 0.3s ease">';
      html += '<div class="card-title">\\u25C8 LIVE PRICE</div>';
      html += '<div class="live-price-row">';
      if (p) {
        html += '<span class="live-price-value">' + p.price.toFixed(2) + '</span>';
        var cls = p.change_pct > 0 ? 'up' : p.change_pct < 0 ? 'down' : 'flat';
        var sign = p.change_pct > 0 ? '+' : '';
        html += '<span class="live-price-change ' + cls + '">' + sign + p.change_pct.toFixed(2) + '%</span>';
      } else {
        html += '<span class="live-price-value" style="color:var(--muted)">--</span>';
      }
      html += '</div>';

      // Status indicator
      html += '<div class="live-price-indicator">';
      if (p) {
        var age = (Date.now() - new Date(p.timestamp).getTime()) / 60000;
        if (age < 5) {
          html += '<span class="dot live"></span>LIVE';
        } else {
          html += '<span class="dot delayed"></span>DELAYED ' + Math.round(age) + 'M';
        }
      } else {
        html += '<span class="dot delayed"></span>LOADING';
      }
      html += '</div>';

      // Session levels
      var sess = sessionData[sym];
      html += '<div class="live-session-levels">';
      html += '<span><span class="level-label">LDN H</span><span class="level-value">' + (sess && sess.london_high != null ? sess.london_high.toFixed(2) : '\\u2014') + '</span></span>';
      html += '<span><span class="level-label">LDN L</span><span class="level-value">' + (sess && sess.london_low != null ? sess.london_low.toFixed(2) : '\\u2014') + '</span></span>';
      html += '<span><span class="level-label">NY H</span><span class="level-value">' + (sess && sess.ny_high != null ? sess.ny_high.toFixed(2) : '\\u2014') + '</span></span>';
      html += '<span><span class="level-label">NY L</span><span class="level-value">' + (sess && sess.ny_low != null ? sess.ny_low.toFixed(2) : '\\u2014') + '</span></span>';
      html += '</div>';

      html += '</div>';
      priceCard.innerHTML = html;
    }

    function fetchPrices() {
      fetch('/api/market/price').then(function(r) { return r.json(); }).then(function(data) {
        priceData = data;
        renderPriceCard();
      }).catch(function() {});
    }

    function fetchSessions() {
      fetch('/api/sessions/today').then(function(r) { return r.json(); }).then(function(data) {
        if (Array.isArray(data)) {
          data.forEach(function(s) { sessionData[s.symbol] = s; });
        }
        renderPriceCard();
      }).catch(function() {});
    }

    // Show shimmer skeleton initially
    priceCard.innerHTML = '<div class="card"><div class="card-title">\\u25C8 LIVE PRICE</div>' +
      '<div class="skeleton-shimmer" style="width:200px;height:36px;margin-bottom:8px"></div>' +
      '<div class="skeleton-shimmer" style="width:60px;height:14px;margin-bottom:8px"></div>' +
      '<div style="display:flex;gap:16px"><div class="skeleton-shimmer" style="width:80px;height:12px"></div><div class="skeleton-shimmer" style="width:80px;height:12px"></div></div>' +
      '</div>';
    fetchPrices();
    fetchSessions();
    setInterval(fetchPrices, 15000);
    setInterval(fetchSessions, 60000);
    document.addEventListener('instrument-changed', function() { renderPriceCard(); });
  })();
  </script>

  <script>
  /* ── TradingView Chart Widget ── */
  (function() {
    var tvContainer = document.getElementById('tv-chart-container');
    var scriptLoaded = false;
    var widgetInstance = null;

    var symbolMap = {
      NQ: 'OANDA:NAS100USD',
      ES: 'OANDA:SPX500USD',
      MES: 'OANDA:SPX500USD',
      MNQ: 'OANDA:NAS100USD'
    };

    function renderWidget() {
      var sym = window.selectedInstrument || 'NQ';
      var tvSymbol = symbolMap[sym] || symbolMap.NQ;

      tvContainer.innerHTML = '<div class="card" style="animation:slideUp 0.3s ease"><div class="card-title">\\u25C8 TRADINGVIEW</div><div id="tv-chart-wrap"></div></div>';

      if (!scriptLoaded) {
        var s = document.createElement('script');
        s.src = 'https://s3.tradingview.com/tv.js';
        s.onload = function() {
          scriptLoaded = true;
          createWidget(tvSymbol);
        };
        document.head.appendChild(s);
      } else {
        createWidget(tvSymbol);
      }
    }

    function createWidget(tvSymbol) {
      if (typeof TradingView === 'undefined') return;
      widgetInstance = new TradingView.widget({
        container_id: 'tv-chart-wrap',
        symbol: tvSymbol,
        interval: '15',
        timezone: 'America/New_York',
        theme: 'dark',
        style: '1',
        width: '100%',
        height: document.getElementById('tv-chart-wrap').offsetHeight || 250,
        hide_top_toolbar: false,
        hide_side_toolbar: true,
        allow_symbol_change: false,
        save_image: false,
        backgroundColor: '#0a0a10',
        gridColor: 'rgba(255,255,255,0.03)',
        locale: 'en',
      });
    }

    renderWidget();
    document.addEventListener('instrument-changed', function() { renderWidget(); });
  })();
  </script>

  <script>
  /* ── Strategy Chart (SVG with real data + annotations) ── */
  (function() {
    var chartEl = document.getElementById('price-chart');
    var selectedTimeframe = '15m';
    var CANDLE_LIMIT = 80;
    var lastFetchTime = 0;

    var fallbackData = {
      NQ: { londonHigh: 21487.50, londonLow: 21422.75, fvg: { high: 21440, low: 21428 }, ifvg: { high: 21462, low: 21455 } },
      ES: { londonHigh: 5902.25, londonLow: 5878.50, fvg: { high: 5886, low: 5880 }, ifvg: { high: 5894, low: 5890 } }
    };

    var cachedCandles = {};
    var cachedSessions = {};
    var cachedFvgs = {};
    var cachedIfvgs = {};
    var alertLevels = null;

    function fetchCandleData(sym) {
      return fetch('/api/candles/' + sym + '/' + selectedTimeframe + '?limit=' + CANDLE_LIMIT)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.candles && data.candles.length > 0) {
            cachedCandles[sym] = data.candles.reverse();
            lastFetchTime = Date.now();
          }
        }).catch(function() {});
    }

    function fetchSessionData() {
      return fetch('/api/sessions/today')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (Array.isArray(data)) {
            data.forEach(function(s) { cachedSessions[s.symbol] = s; });
          }
        }).catch(function() {});
    }

    function fetchFvgData(sym) {
      return Promise.all([
        fetch('/api/fvg/' + sym + '?status=active&days=2').then(function(r) { return r.json(); }).then(function(data) {
          if (Array.isArray(data) && data.length > 0) cachedFvgs[sym] = data;
        }).catch(function() {}),
        fetch('/api/fvg/' + sym + '?status=inverted&days=2').then(function(r) { return r.json(); }).then(function(data) {
          if (Array.isArray(data) && data.length > 0) cachedIfvgs[sym] = data;
        }).catch(function() {})
      ]);
    }

    function generateFallbackCandles(start, count) {
      var candles = [];
      var price = start;
      for (var i = 0; i < count; i++) {
        var change = (Math.random() - 0.48) * (start * 0.003);
        var o = price, c = price + change;
        var h = Math.max(o, c) + Math.abs(change) * (0.3 + Math.random() * 0.7);
        var l = Math.min(o, c) - Math.abs(change) * (0.3 + Math.random() * 0.7);
        candles.push({ open: +o.toFixed(2), high: +h.toFixed(2), low: +l.toFixed(2), close: +c.toFixed(2), time: Date.now() - (count - i) * 60000 });
        price = c;
      }
      return candles;
    }

    function drawSvgChart(candles, d, entry, target, stop, bosLevel) {
      var allPrices = [];
      candles.forEach(function(c) { allPrices.push(c.high, c.low); });
      if (d.londonHigh != null) allPrices.push(d.londonHigh);
      if (d.londonLow != null) allPrices.push(d.londonLow);
      if (d.fvg) { allPrices.push(d.fvg.high, d.fvg.low); }
      if (d.ifvg) { allPrices.push(d.ifvg.high, d.ifvg.low); }
      if (entry != null) allPrices.push(entry);
      if (target != null) allPrices.push(target);
      if (stop != null) allPrices.push(stop);
      if (bosLevel != null) allPrices.push(bosLevel);

      var filtered = allPrices.filter(function(p) { return p != null && isFinite(p); });
      if (filtered.length === 0) return '<div style="color:var(--muted);text-align:center;padding:40px">No candle data yet</div>';

      var minP = Math.min.apply(null, filtered);
      var maxP = Math.max.apply(null, filtered);
      var range = maxP - minP || 1;
      minP -= range * 0.05;
      maxP += range * 0.05;
      range = maxP - minP;

      var vw = window.innerWidth;
      var isTablet = vw >= 768;
      var isDesktop = vw >= 1025;
      var svgW = 800, svgH = isDesktop ? 420 : isTablet ? 340 : 240, padR = 65, padL = 4, padT = 8, padB = 20;
      var chartW = svgW - padL - padR, chartH = svgH - padT - padB;
      function priceY(p) { return padT + chartH - ((p - minP) / range) * chartH; }

      var candleW = chartW / candles.length;
      var bodyW = isDesktop ? Math.max(candleW * 0.7, 2) : Math.max(candleW - 1, 1);

      var svg = '<svg class="chart-svg" viewBox="0 0 ' + svgW + ' ' + svgH + '" preserveAspectRatio="none">';

      // Gradient definition for area fill
      svg += '<defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">';
      svg += '<stop offset="0%" stop-color="rgba(251,44,90,0.06)"/>';
      svg += '<stop offset="100%" stop-color="rgba(251,44,90,0)"/>';
      svg += '</linearGradient></defs>';

      // Grid lines
      for (var g = 1; g <= 3; g++) {
        var gy = padT + (chartH * g / 4);
        svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (svgW - padR) + '" y2="' + gy + '" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>';
      }

      // Y-axis price labels (4 on mobile, 6 on desktop)
      var yLabelCount = isDesktop ? 6 : 4;
      for (var yi = 0; yi <= yLabelCount; yi++) {
        var yPrice = minP + (range * yi / yLabelCount);
        var yPos = priceY(yPrice);
        var yFontSize = isDesktop ? '9' : '8';
        svg += '<text x="' + (svgW - padR + 6) + '" y="' + (yPos + 3) + '" fill="var(--muted)" font-family="JetBrains Mono,monospace" font-size="' + yFontSize + '">' + yPrice.toFixed(2) + '</text>';
      }

      // Area fill below close prices
      var areaPoints = '' + padL + ',' + (padT + chartH);
      candles.forEach(function(c, i) {
        var x = padL + i * candleW + candleW / 2;
        areaPoints += ' ' + x + ',' + priceY(c.close);
      });
      areaPoints += ' ' + (padL + (candles.length - 1) * candleW + candleW / 2) + ',' + (padT + chartH);
      svg += '<polygon points="' + areaPoints + '" fill="url(#areaGrad)"/>';

      // Entry/target/stop zones
      if (entry != null && target != null) {
        var targetY = priceY(target), entryY = priceY(entry);
        svg += '<rect x="' + padL + '" y="' + Math.min(targetY, entryY) + '" width="' + chartW + '" height="' + Math.abs(entryY - targetY) + '" fill="rgba(52,211,153,0.03)"/>';
        if (stop != null) {
          var stopY = priceY(stop);
          svg += '<rect x="' + padL + '" y="' + Math.min(entryY, stopY) + '" width="' + chartW + '" height="' + Math.abs(stopY - entryY) + '" fill="rgba(239,68,68,0.03)"/>';
        }
      }

      // FVG zone with dashed borders
      if (d.fvg && d.fvg.high != null) {
        var fvgTopY = priceY(d.fvg.high), fvgBotY = priceY(d.fvg.low);
        svg += '<rect x="' + padL + '" y="' + fvgTopY + '" width="' + chartW + '" height="' + (fvgBotY - fvgTopY) + '" fill="rgba(251,44,90,0.1)" stroke="var(--red)" stroke-width="0.5" stroke-dasharray="4,3" opacity="0.7"/>';
      }

      // IFVG zone with dashed borders
      if (d.ifvg && d.ifvg.high != null) {
        var ifvgTopY = priceY(d.ifvg.high), ifvgBotY = priceY(d.ifvg.low);
        svg += '<rect x="' + padL + '" y="' + ifvgTopY + '" width="' + chartW + '" height="' + (ifvgBotY - ifvgTopY) + '" fill="rgba(251,191,36,0.1)" stroke="var(--amber)" stroke-width="0.5" stroke-dasharray="4,3" opacity="0.7"/>';
      }

      // London H/L lines
      if (d.londonHigh != null) {
        var ldnHY = priceY(d.londonHigh);
        svg += '<line x1="' + padL + '" y1="' + ldnHY + '" x2="' + (padL + chartW) + '" y2="' + ldnHY + '" stroke="var(--red)" stroke-width="0.8" stroke-dasharray="6,4" opacity="0.7"/>';
        svg += '<text x="' + (svgW - padR - 2) + '" y="' + (ldnHY - 3) + '" fill="var(--red-soft)" font-family="JetBrains Mono,monospace" font-size="9" text-anchor="end">LDN H</text>';
      }
      if (d.londonLow != null) {
        var ldnLY = priceY(d.londonLow);
        svg += '<line x1="' + padL + '" y1="' + ldnLY + '" x2="' + (padL + chartW) + '" y2="' + ldnLY + '" stroke="var(--muted)" stroke-width="0.8" stroke-dasharray="6,4" opacity="0.6"/>';
        svg += '<text x="' + (svgW - padR - 2) + '" y="' + (ldnLY - 3) + '" fill="var(--muted)" font-family="JetBrains Mono,monospace" font-size="9" text-anchor="end">LDN L</text>';
      }

      // BOS level line
      if (bosLevel != null) {
        var bosY = priceY(bosLevel);
        svg += '<line x1="' + padL + '" y1="' + bosY + '" x2="' + (padL + chartW) + '" y2="' + bosY + '" stroke="var(--amber)" stroke-width="1" opacity="0.6"/>';
        svg += '<text x="' + (padL + 4) + '" y="' + (bosY - 3) + '" fill="var(--amber)" font-family="JetBrains Mono,monospace" font-size="8" opacity="0.8">BOS</text>';
        // Diamond marker at BOS level (find the candle nearest to BOS level)
        var bestBosIdx = -1, bestBosDist = Infinity;
        candles.forEach(function(c, i) {
          if (c.high >= bosLevel && c.low <= bosLevel) {
            var dist = Math.abs(c.close - bosLevel);
            if (dist < bestBosDist) { bestBosDist = dist; bestBosIdx = i; }
          }
        });
        if (bestBosIdx === -1) {
          candles.forEach(function(c, i) {
            var dist = Math.min(Math.abs(c.high - bosLevel), Math.abs(c.low - bosLevel));
            if (dist < bestBosDist) { bestBosDist = dist; bestBosIdx = i; }
          });
        }
        if (bestBosIdx >= 0) {
          var diamondX = padL + bestBosIdx * candleW + candleW / 2;
          svg += '<rect x="' + (diamondX - 3) + '" y="' + (bosY - 3) + '" width="6" height="6" fill="var(--amber)" transform="rotate(45,' + diamondX + ',' + bosY + ')"/>';
        }
      }

      // Target/stop/entry lines
      if (target != null) {
        var tY = priceY(target);
        svg += '<line x1="' + padL + '" y1="' + tY + '" x2="' + (padL + chartW) + '" y2="' + tY + '" stroke="var(--green)" stroke-width="1"/>';
        svg += '<text x="' + (padL + 4) + '" y="' + (tY - 3) + '" fill="var(--green)" font-family="JetBrains Mono,monospace" font-size="9">TARGET</text>';
      }
      if (stop != null) {
        var sY = priceY(stop);
        svg += '<line x1="' + padL + '" y1="' + sY + '" x2="' + (padL + chartW) + '" y2="' + sY + '" stroke="var(--danger)" stroke-width="1"/>';
        svg += '<text x="' + (padL + 4) + '" y="' + (sY - 3) + '" fill="var(--danger)" font-family="JetBrains Mono,monospace" font-size="9">STOP</text>';
      }
      if (entry != null) {
        var eY = priceY(entry);
        svg += '<g class="entry-line-glow">';
        svg += '<line x1="' + padL + '" y1="' + eY + '" x2="' + (padL + chartW) + '" y2="' + eY + '" stroke="var(--red)" stroke-width="1"/>';
        svg += '<text x="' + (padL + 4) + '" y="' + (eY - 3) + '" fill="var(--red)" font-family="JetBrains Mono,monospace" font-size="9">ENTRY &#9656;</text>';
        svg += '</g>';
      }

      // Current price line (latest close)
      var lastClose = candles[candles.length - 1].close;
      var lastCloseY = priceY(lastClose);
      svg += '<line x1="' + padL + '" y1="' + lastCloseY + '" x2="' + (padL + chartW) + '" y2="' + lastCloseY + '" stroke="var(--white)" stroke-width="1" opacity="0.5"/>';
      svg += '<rect x="' + (svgW - padR + 2) + '" y="' + (lastCloseY - 7) + '" width="58" height="14" rx="2" fill="var(--white)"/>';
      svg += '<text x="' + (svgW - padR + 5) + '" y="' + (lastCloseY + 3) + '" fill="#0a0a10" font-family="JetBrains Mono,monospace" font-size="8" font-weight="bold">' + lastClose.toFixed(2) + '</text>';

      // Candles
      candles.forEach(function(c, i) {
        var x = padL + i * candleW + (candleW - bodyW) / 2;
        var cx = padL + i * candleW + candleW / 2;
        var bullish = c.close >= c.open;
        var bodyColor = bullish ? 'var(--red)' : '#475569';
        var wickColor = bullish ? 'var(--red-soft)' : '#64748b';
        var bodyTop = priceY(Math.max(c.open, c.close));
        var bodyBot = priceY(Math.min(c.open, c.close));
        var bodyH = Math.max(bodyBot - bodyTop, 1);
        svg += '<line x1="' + cx + '" y1="' + priceY(c.high) + '" x2="' + cx + '" y2="' + priceY(c.low) + '" stroke="' + wickColor + '" stroke-width="1"/>';
        svg += '<rect x="' + x + '" y="' + bodyTop + '" width="' + bodyW + '" height="' + bodyH + '" fill="' + bodyColor + '" rx="0.5"/>';
      });

      // Crosshair overlay (invisible rect to capture pointer events)
      svg += '<rect class="chart-hit-area" x="' + padL + '" y="' + padT + '" width="' + chartW + '" height="' + chartH + '" fill="transparent" style="pointer-events:all"/>';
      svg += '<line class="ch-v" x1="0" y1="' + padT + '" x2="0" y2="' + (padT + chartH) + '" stroke="rgba(255,255,255,0.2)" stroke-width="0.5" stroke-dasharray="3,3" style="display:none;pointer-events:none"/>';
      svg += '<line class="ch-h" x1="' + padL + '" y1="0" x2="' + (padL + chartW) + '" y2="0" stroke="rgba(255,255,255,0.2)" stroke-width="0.5" stroke-dasharray="3,3" style="display:none;pointer-events:none"/>';

      svg += '</svg>';

      // Store chart geometry for crosshair calculations
      svg += '<script type="application/json" class="chart-geo">' + JSON.stringify({
        padL: padL, padT: padT, padR: padR, padB: padB,
        chartW: chartW, chartH: chartH, svgW: svgW, svgH: svgH,
        minP: minP, maxP: maxP, range: range, candleCount: candles.length, candleW: candleW
      }) + '</' + 'script>';

      return svg;
    }

    function setupCrosshair(container) {
      var svgEl = container.querySelector('.chart-svg');
      var hitArea = container.querySelector('.chart-hit-area');
      if (!svgEl || !hitArea) return;
      var geoScript = container.querySelector('.chart-geo');
      if (!geoScript) return;
      var geo = JSON.parse(geoScript.textContent);

      var chV = svgEl.querySelector('.ch-v');
      var chH = svgEl.querySelector('.ch-h');
      var priceLabel = document.createElement('div');
      priceLabel.className = 'chart-crosshair-label';
      priceLabel.style.display = 'none';
      container.appendChild(priceLabel);
      var timeLabel = document.createElement('div');
      timeLabel.className = 'chart-crosshair-label';
      timeLabel.style.display = 'none';
      container.appendChild(timeLabel);

      var isMobile = 'ontouchstart' in window;
      var holdTimer = null;
      var crosshairActive = false;

      function showCrosshair(clientX, clientY) {
        var rect = svgEl.getBoundingClientRect();
        var scaleX = geo.svgW / rect.width;
        var scaleY = geo.svgH / rect.height;
        var svgX = (clientX - rect.left) * scaleX;
        var svgY = (clientY - rect.top) * scaleY;

        if (svgX < geo.padL || svgX > geo.padL + geo.chartW || svgY < geo.padT || svgY > geo.padT + geo.chartH) {
          hideCrosshair(); return;
        }

        chV.setAttribute('x1', svgX); chV.setAttribute('x2', svgX); chV.style.display = '';
        chH.setAttribute('y1', svgY); chH.setAttribute('y2', svgY); chH.style.display = '';

        var price = geo.maxP - ((svgY - geo.padT) / geo.chartH) * geo.range;
        priceLabel.textContent = price.toFixed(2);
        priceLabel.style.display = '';
        priceLabel.style.right = '2px';
        priceLabel.style.top = ((svgY / geo.svgH) * 100) + '%';
        priceLabel.style.left = '';

        var candleIdx = Math.floor((svgX - geo.padL) / geo.candleW);
        var now = new Date();
        var tfMins = selectedTimeframe === '5m' ? 5 : selectedTimeframe === '1H' ? 60 : selectedTimeframe === '4H' ? 240 : 15;
        var candleTime = new Date(now.getTime() - (geo.candleCount - 1 - candleIdx) * tfMins * 60000);
        var hh = String(candleTime.getHours()).padStart(2, '0');
        var mm = String(candleTime.getMinutes()).padStart(2, '0');
        timeLabel.textContent = hh + ':' + mm;
        timeLabel.style.display = '';
        timeLabel.style.bottom = '2px';
        timeLabel.style.left = ((svgX / geo.svgW) * 100) + '%';
        timeLabel.style.top = '';
        timeLabel.style.right = '';
      }

      function hideCrosshair() {
        chV.style.display = 'none'; chH.style.display = 'none';
        priceLabel.style.display = 'none'; timeLabel.style.display = 'none';
        crosshairActive = false;
      }

      if (isMobile) {
        hitArea.addEventListener('touchstart', function(e) {
          holdTimer = setTimeout(function() {
            crosshairActive = true;
            var t = e.touches[0];
            showCrosshair(t.clientX, t.clientY);
          }, 300);
        }, { passive: true });
        hitArea.addEventListener('touchmove', function(e) {
          if (crosshairActive) {
            e.preventDefault();
            var t = e.touches[0];
            showCrosshair(t.clientX, t.clientY);
          } else {
            clearTimeout(holdTimer);
          }
        }, { passive: false });
        hitArea.addEventListener('touchend', function() {
          clearTimeout(holdTimer);
          hideCrosshair();
        }, { passive: true });
      } else {
        svgEl.addEventListener('mousemove', function(e) { showCrosshair(e.clientX, e.clientY); });
        svgEl.addEventListener('mouseleave', hideCrosshair);
      }
    }

    function renderChartWithData() {
      var sym = window.selectedInstrument || 'NQ';
      var candles = cachedCandles[sym];
      var sess = cachedSessions[sym] || {};
      var fb = fallbackData[sym];

      // Build annotation data from session levels or alert or real FVG data
      var d = {};
      var entry = null, target = null, stop = null;

      // Use real FVG data from API if available
      var realFvgs = cachedFvgs[sym] || [];
      var realIfvgs = cachedIfvgs[sym] || [];
      var bestFvg = realFvgs.length > 0 ? { high: realFvgs[0].high, low: realFvgs[0].low } : null;
      var bestIfvg = realIfvgs.length > 0 ? { high: realIfvgs[0].high, low: realIfvgs[0].low } : null;

      if (alertLevels && (alertLevels.symbol === sym || !alertLevels.symbol)) {
        d.londonHigh = alertLevels.sweep_level || sess.london_high || fb.londonHigh;
        d.londonLow = alertLevels.sweep_direction === 'low' ? (alertLevels.sweep_level || sess.london_low || fb.londonLow) : (sess.london_low || fb.londonLow);
        if (alertLevels.sweep_direction === 'high') d.londonHigh = alertLevels.sweep_level || sess.london_high || fb.londonHigh;
        d.fvg = { high: alertLevels.fvg_high || (bestFvg ? bestFvg.high : fb.fvg.high), low: alertLevels.fvg_low || (bestFvg ? bestFvg.low : fb.fvg.low) };
        d.ifvg = { high: alertLevels.ifvg_high || (bestIfvg ? bestIfvg.high : fb.ifvg.high), low: alertLevels.ifvg_low || (bestIfvg ? bestIfvg.low : fb.ifvg.low) };
        entry = alertLevels.entry_price;
        target = alertLevels.target_price;
        stop = alertLevels.stop_price;
      } else {
        d.londonHigh = sess.london_high != null ? sess.london_high : fb.londonHigh;
        d.londonLow = sess.london_low != null ? sess.london_low : fb.londonLow;
        d.fvg = bestFvg || fb.fvg;
        d.ifvg = bestIfvg || fb.ifvg;
      }

      // Use real candles if available, else generate fallback
      if (!candles || candles.length === 0) {
        var startPrice = fb === fallbackData.NQ ? 21450 : 5890;
        candles = generateFallbackCandles(startPrice, CANDLE_LIMIT);
        if (!entry) { entry = d.ifvg.high; target = d.londonHigh; stop = d.ifvg.low - 2; }
      }

      // Get BOS level from active setup metadata
      var bosLevel = null;
      if (window.__activeSetupMeta && window.__activeSetupMeta.bos_level && (window.__activeSetupPhase || 0) >= 2) {
        bosLevel = Number(window.__activeSetupMeta.bos_level);
      }
      var svgHtml = drawSvgChart(candles, d, entry, target, stop, bosLevel);

      // LIVE / DELAYED tag
      var ageMs = Date.now() - lastFetchTime;
      var isLive = lastFetchTime > 0 && ageMs < 120000;
      var liveTag = '';
      if (lastFetchTime > 0) {
        if (isLive) {
          liveTag = '<div class="chart-live-tag"><span class="tag-dot" style="background:var(--green);animation:breathe 2s ease-in-out infinite"></span><span style="color:var(--green)">LIVE</span></div>';
        } else {
          liveTag = '<div class="chart-live-tag"><span class="tag-dot" style="background:var(--amber)"></span><span style="color:var(--amber)">DELAYED</span></div>';
        }
      }

      // Timeframe selector
      var tfHtml = '<div class="tf-row">';
      ['5m', '15m', '1H', '4H'].forEach(function(tf) {
        tfHtml += '<button class="tf-btn' + (selectedTimeframe === tf ? ' active' : '') + '" data-tf="' + tf + '">' + tf + '</button>';
      });
      tfHtml += '</div>';

      var legend = '<div class="chart-legend">' +
        '<div class="chart-legend-item"><span class="chart-legend-swatch" style="background:rgba(251,44,90,0.3);border:1px dashed var(--red)"></span>FVG</div>' +
        '<div class="chart-legend-item"><span class="chart-legend-swatch" style="background:rgba(251,191,36,0.25);border:1px dashed var(--amber)"></span>IFVG</div>' +
        '<div class="chart-legend-item"><span class="chart-legend-swatch" style="background:var(--red);width:14px;height:2px;border-radius:0"></span>LDN H</div>' +
        '<div class="chart-legend-item"><span class="chart-legend-swatch" style="background:var(--muted);width:14px;height:2px;border-radius:0"></span>LDN L</div>' +
        '</div>';

      chartEl.innerHTML = '<div class="card" style="animation:slideUp 0.3s ease"><div class="card-title">\\u25C8 STRATEGY CHART</div>' + tfHtml + '<div class="chart-wrap">' + liveTag + svgHtml + '</div>' + legend + '</div>';

      // Bind timeframe selector
      chartEl.querySelectorAll('.tf-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          selectedTimeframe = btn.dataset.tf;
          loadAndRender();
        });
      });

      // Setup crosshair
      var wrap = chartEl.querySelector('.chart-wrap');
      if (wrap) setupCrosshair(wrap);
    }

    function showChartSkeleton() {
      chartEl.innerHTML = '<div class="card"><div class="card-title">\\u25C8 STRATEGY CHART</div>' +
        '<div class="skeleton-shimmer" style="width:100%;height:240px;border-radius:10px"></div></div>';
    }

    function loadAndRender() {
      var sym = window.selectedInstrument || 'NQ';
      if (!cachedCandles[sym]) showChartSkeleton();
      Promise.all([fetchCandleData(sym), fetchSessionData(), fetchFvgData(sym)]).then(function() {
        renderChartWithData();
      });
    }

    /* Debounced resize handler for SVG chart — use window resize to avoid loop */
    var resizeTimer = null;
    var lastChartWidth = 0;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        var wrap = chartEl.querySelector('.chart-wrap');
        var newWidth = wrap ? wrap.offsetWidth : window.innerWidth;
        if (newWidth !== lastChartWidth) {
          lastChartWidth = newWidth;
          renderChartWithData();
        }
      }, 250);
    });

    loadAndRender();
    setInterval(loadAndRender, 60000);
    document.addEventListener('instrument-changed', function() { loadAndRender(); });
    document.addEventListener('alert-levels', function(e) {
      alertLevels = e.detail;
      renderChartWithData();
    });
  })();
  </script>

  <script>
  /* ── Signal Progression Tracker ── */
  (function() {
    var trackerEl = document.getElementById('signal-tracker');
    var currentPhase = 0;
    var activeSetup = null;

    var phases = [
      { name: 'London Range', desc: 'Session high & low forming' },
      { name: 'Liquidity Sweep', desc: 'Price breaks London H/L' },
      { name: 'Break of Structure', desc: 'Price confirms reversal direction' },
      { name: 'FVG Retracement', desc: 'Retrace into 1H/4H FVG' },
      { name: 'Continuation', desc: 'FVG or IFVG confirms direction' },
      { name: 'Entry', desc: 'Execute on gap, target opposite level' }
    ];

    var fallbackData = {
      NQ: { londonHigh: 21487.50, londonLow: 21422.75, fvg: { high: 21440, low: 21428 }, ifvg: { high: 21462, low: 21455 } },
      ES: { londonHigh: 5902.25, londonLow: 5878.50, fvg: { high: 5886, low: 5880 }, ifvg: { high: 5894, low: 5890 } }
    };

    function fetchActiveSetups() {
      fetch('/api/setups/active', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var sym = window.selectedInstrument || 'NQ';
          if (data.setups && data.setups.length > 0) {
            var match = null;
            data.setups.forEach(function(s) { if (s.symbol === sym && !match) match = s; });
            if (match) {
              activeSetup = match;
              currentPhase = match.phase || 0;
              window.__activeSetupMeta = match.metadata || null;
              window.__activeSetupPhase = currentPhase;
            } else {
              activeSetup = null;
              currentPhase = 0;
              window.__activeSetupMeta = null;
              window.__activeSetupPhase = 0;
            }
          } else {
            activeSetup = null;
            currentPhase = 0;
            window.__activeSetupMeta = null;
            window.__activeSetupPhase = 0;
          }
          renderTracker();
        }).catch(function() {});
    }

    fetchActiveSetups();
    setInterval(fetchActiveSetups, 15000);

    function renderTracker() {
      var sym = window.selectedInstrument || 'NQ';
      var fb = fallbackData[sym];
      var d = {};
      if (activeSetup) {
        var sess = activeSetup;
        d.londonHigh = sess.target_price || fb.londonHigh;
        d.londonLow = sess.sweep_level || fb.londonLow;
        d.fvg = sess.fvg_data ? { high: sess.fvg_data.high, low: sess.fvg_data.low } : fb.fvg;
        d.ifvg = sess.ifvg_data ? { high: sess.ifvg_data.high, low: sess.ifvg_data.low } : fb.ifvg;
      } else {
        d = { londonHigh: fb.londonHigh, londonLow: fb.londonLow, fvg: fb.fvg, ifvg: fb.ifvg };
      }
      var entry = d.ifvg ? d.ifvg.high : fb.ifvg.high;
      var target = d.londonHigh || fb.londonHigh;

      // Tag
      var tagText, tagColor;
      if (currentPhase >= 5) { tagText = 'ACCORD'; tagColor = 'var(--red)'; }
      else if (currentPhase >= 4) { tagText = 'BASE NOTE'; tagColor = 'var(--amber)'; }
      else if (currentPhase >= 2) { tagText = 'HEART NOTE'; tagColor = 'var(--amber)'; }
      else { tagText = 'TOP NOTE'; tagColor = 'var(--muted)'; }

      var html = '<div class="card" style="animation:slideUp 0.3s ease">';
      html += '<div class="signal-card-header">';
      html += '<div class="card-title" style="margin-bottom:0">\u25C7 SIGNAL PROGRESSION</div>';
      html += '<span class="signal-tag" style="color:' + tagColor + ';border-color:' + tagColor + '">' + tagText + '</span>';
      html += '</div>';

      // Phase rows
      phases.forEach(function(p, i) {
        var dotClass, labelColor, rowClass = '', checkHtml = '';
        if (i < currentPhase) {
          dotClass = 'completed';
          labelColor = 'var(--red)';
          checkHtml = '<span class="phase-check" style="color:var(--red)">\u2713</span>';
        } else if (i === currentPhase) {
          dotClass = 'current';
          labelColor = 'var(--amber)';
        } else {
          dotClass = 'pending';
          labelColor = 'var(--subtle)';
          rowClass = ' pending-row';
        }

        html += '<div class="phase-row' + rowClass + '">';
        html += '<span class="phase-dot ' + dotClass + '"></span>';
        html += '<span class="phase-label" style="color:' + labelColor + '">Phase ' + i + ' \u2014 ' + p.name + '</span>';
        html += '<span class="phase-desc">' + p.desc + '</span>';
        html += checkHtml;
        html += '</div>';
      });

      // Status box
      var borderColor = currentPhase >= 4 ? 'var(--red)' : 'var(--amber)';
      var statusLabelColor = currentPhase >= 4 ? 'var(--red)' : 'var(--amber)';
      var statusLabel = 'PHASE ' + currentPhase + ' \u2014 ' + phases[currentPhase].name.toUpperCase();

      // Get BOS level from metadata if available
      var bosLevel = (activeSetup && activeSetup.metadata && activeSetup.metadata.bos_level) ? activeSetup.metadata.bos_level : null;

      var messages = [
        activeSetup ? 'London session forming. Like a top note \u2014 the opening impression.' : 'Waiting for London session to complete...',
        'Sweep confirmed \u2014 London Low at ' + (d.londonLow || 0).toFixed(2) + ' broken. Sillage trail detected.',
        'Structure broken at ' + (bosLevel ? Number(bosLevel).toFixed(2) : '?') + '. Heart note developing \u2014 reversal confirmed.',
        'Heart note developing. Retracing into 4H FVG (' + (d.fvg ? d.fvg.low.toFixed(2) : '?') + ' \u2013 ' + (d.fvg ? d.fvg.high.toFixed(2) : '?') + ')',
        'Base note locked. IFVG at ' + (d.ifvg ? d.ifvg.low.toFixed(2) : '?') + ' \u2013 ' + (d.ifvg ? d.ifvg.high.toFixed(2) : '?') + ' confirms direction.',
        'ACCORD \u2014 all notes aligned. Buy ' + entry.toFixed(2) + ' \u2192 Target ' + target.toFixed(2)
      ];

      html += '<div class="signal-status-box" style="border-left:2px solid ' + borderColor + '">';
      html += '<div class="signal-status-label" style="color:' + statusLabelColor + '">' + statusLabel + '</div>';
      html += '<div class="signal-status-msg">' + messages[currentPhase] + '</div>';
      html += '</div>';

      html += '</div>';
      trackerEl.innerHTML = html;
    }

    renderTracker();
    document.addEventListener('instrument-changed', function() { renderTracker(); });
    document.addEventListener('alert-phase', function(e) {
      if (e.detail && e.detail.phase != null) {
        currentPhase = e.detail.phase;
      } else {
        currentPhase = 4;
      }
      renderTracker();
    });
  })();
  </script>

  <script>
  (function() {
    var pnlLog = document.getElementById('pnl-log');
    var modalRoot = document.getElementById('trade-modal-root');
    var fab = document.getElementById('fab-add');

    var INSTRUMENTS = { 1: { symbol: 'ES', tick_size: 0.25, tick_value: 12.50 }, 2: { symbol: 'NQ', tick_size: 0.25, tick_value: 5.00 } };

    function getSelectedAccountId() {
      var sel = document.querySelector('#alpha-selector select');
      return sel ? sel.value : null;
    }

    function fmt(n) {
      return Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ── P&L Log ──
    function showPnlSkeleton() {
      var html = '<div class="card"><div class="card-title">DAILY P&L</div><div class="pnl-list">';
      for (var i = 0; i < 5; i++) {
        html += '<div class="pnl-row"><div class="skeleton-shimmer" style="width:70px;height:12px"></div>' +
          '<div class="skeleton-shimmer" style="width:30px;height:12px;margin:0 8px"></div>' +
          '<div style="flex:1"></div>' +
          '<div class="skeleton-shimmer" style="width:80px;height:14px"></div></div>';
      }
      html += '</div></div>';
      pnlLog.innerHTML = html;
    }

    function fetchPnlLog() {
      var accountId = getSelectedAccountId();
      if (!accountId) { pnlLog.innerHTML = ''; return; }
      showPnlSkeleton();
      fetch('/api/alpha/' + accountId + '/daily-pnl?days=30')
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
        var displayDate = r.date ? window.__formatET(r.date + 'T12:00:00Z').replace(/, .*/, '') : r.date;
        html += '<div class="pnl-row">' +
          '<span class="pnl-date">' + displayDate + '</span>' +
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

        '<div class="modal-label">Date</div>' +
        '<input class="modal-input" id="tm-date" type="date" value="' + (function() { var d = new Date(); return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); })() + '">' +

        '<div class="modal-label">Contracts</div>' +
        '<input class="modal-input" id="tm-contracts" type="number" value="1" min="1" inputmode="numeric">' +

        '<div class="modal-label">Entry Price</div>' +
        '<input class="modal-input" id="tm-entry" type="number" step="0.25" inputmode="decimal">' +

        '<div class="modal-label">Exit Price (Target)</div>' +
        '<input class="modal-input" id="tm-exit" type="number" step="0.25" inputmode="decimal">' +

        '<div class="modal-label">Stop Price</div>' +
        '<input class="modal-input" id="tm-stop" type="number" step="0.25" inputmode="decimal">' +

        '<div class="modal-label">P&L</div>' +
        '<div class="modal-pnl-display" id="tm-pnl-display">--</div>' +

        '<div class="modal-label">Notes</div>' +
        '<textarea class="modal-input" id="tm-notes" rows="3" style="resize:vertical"></textarea>' +

        '<button class="modal-submit" id="tm-submit" disabled>LOG TRADE</button>' +
        '<div id="tm-compliance-results"></div>' +
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

      // Submit — first runs compliance, then allows confirm
      document.getElementById('tm-submit').onclick = runComplianceCheck;
    }

    function closeModal() {
      modalRoot.innerHTML = '';
    }

    function getCheckNames() {
      return { contracts: 'Contracts', mae: 'MAE', drawdown: 'Drawdown', consistency: 'Consistency', daily_loss: 'Daily Loss' };
    }

    function renderComplianceResults(result) {
      var container = document.getElementById('tm-compliance-results');
      var names = getCheckNames();
      var html = '<div class="compliance-results">';

      for (var i = 0; i < result.checks.length; i++) {
        var c = result.checks[i];
        if (c.check === 'recommendation') continue;
        var dotClass = c.passed ? (c.severity === 'warning' ? 'warn' : 'pass') : 'fail';
        if (c.passed && c.severity === 'critical') dotClass = 'warn';
        html += '<div class="compliance-check-row">';
        html += '<span class="compliance-dot ' + dotClass + '"></span>';
        html += '<span class="compliance-label">' + (names[c.check] || c.check) + '</span>';
        html += '<span class="compliance-msg">' + (c.message || '') + '</span>';
        html += '</div>';
      }

      var rec = result.recommendation;
      if (rec.action === 'reduce') {
        html += '<div class="compliance-rec reduce">Recommended: ' + rec.recommended_contracts + ' contract' + (rec.recommended_contracts > 1 ? 's' : '') + ' — ' + rec.reasoning + '</div>';
      } else if (rec.action === 'skip') {
        html += '<div class="compliance-rec skip">Trade not recommended — ' + rec.reasoning + '</div>';
      }

      // Buttons
      var hasCriticalFail = result.checks.some(function(c) { return !c.passed && c.severity === 'critical'; });
      var anyFail = !result.passed;
      var hasWarnings = result.checks.some(function(c) { return c.severity === 'warning' || c.severity === 'critical'; });
      var canConfirm = !hasCriticalFail && !(anyFail && rec.action === 'skip');

      html += '<div class="compliance-actions">';
      var confirmClass = result.passed && !hasWarnings ? 'all-pass' : 'warnings';
      html += '<button class="compliance-confirm ' + confirmClass + '" id="tm-confirm"' + (canConfirm ? '' : ' disabled') + '>CONFIRM & LOG</button>';
      html += '<button class="compliance-cancel" id="tm-cancel-compliance">CANCEL</button>';
      html += '</div>';
      html += '</div>';

      container.innerHTML = html;

      document.getElementById('tm-confirm').onclick = function() { doSubmitTrade(); };
      document.getElementById('tm-cancel-compliance').onclick = function() { container.innerHTML = ''; document.getElementById('tm-submit').textContent = 'LOG TRADE'; document.getElementById('tm-submit').disabled = false; };
    }

    function runComplianceCheck() {
      var btn = document.getElementById('tm-submit');
      var accountId = getSelectedAccountId();
      var entry = parseFloat(document.getElementById('tm-entry').value);
      var exit = parseFloat(document.getElementById('tm-exit').value);
      var stop = parseFloat(document.getElementById('tm-stop').value);
      var contracts = parseInt(document.getElementById('tm-contracts').value) || 1;

      if (!accountId || isNaN(entry) || isNaN(exit)) {
        doSubmitTrade();
        return;
      }

      // If no stop price, skip compliance and log directly
      if (isNaN(stop)) {
        doSubmitTrade();
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="compliance-spinner"></span>CHECKING...';

      fetch('/api/alpha/' + accountId + '/compliance-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument_id: modalState.instrument_id,
          direction: modalState.direction,
          contracts: contracts,
          entry_price: entry,
          stop_price: stop,
          target_price: exit
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(result) {
        if (result.error) {
          btn.disabled = false;
          btn.textContent = 'LOG TRADE';
          return;
        }

        // Fast path: all checks pass with no warnings — log directly
        var hasWarnings = result.checks.some(function(c) { return c.severity === 'warning' || c.severity === 'critical' || !c.passed; });
        if (result.passed && !hasWarnings) {
          doSubmitTrade();
          return;
        }

        // Show compliance results
        btn.style.display = 'none';
        window.__showToast('\\u26A0 Check compliance results before confirming', 'warning');
        renderComplianceResults(result);
      })
      .catch(function() {
        btn.disabled = false;
        btn.textContent = 'LOG TRADE';
      });
    }

    function doSubmitTrade() {
      var btn = document.getElementById('tm-submit');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'SAVING...';
        btn.style.display = '';
      }

      var pnl = calcPnl();
      var accountId = getSelectedAccountId();
      var dateEl = document.getElementById('tm-date');
      var today = dateEl ? dateEl.value : new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

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
        return fetch('/api/alpha/' + accountId + '/daily-pnl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today, pnl: pnl })
        });
      })
      .then(function() {
        var inst = INSTRUMENTS[modalState.instrument_id];
        var sym = inst ? inst.symbol : '';
        var dir = modalState.direction;
        var pnlStr = pnl != null ? (pnl >= 0 ? '+' : '') + '$' + Math.abs(pnl).toFixed(2) : '';
        window.__showToast('\\u2713 Trade logged \\u2014 ' + sym + ' ' + dir + ' ' + pnlStr, 'success');
        closeModal();
        document.dispatchEvent(new Event('account-changed'));
        fetchPnlLog();
      })
      .catch(function() {
        window.__showToast('\\u2717 Something went wrong \\u2014 try again', 'error');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'LOG TRADE';
          btn.style.display = '';
        }
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

  <script>
  /* ── Alert System ── */
  (function() {
    var overlayEl = document.getElementById('alert-overlay');
    var alertDot = document.getElementById('alert-dot');
    var seenIds = {};
    var firstPoll = true;

    function flashBorder() {
      document.body.classList.add('alert-flash');
      setTimeout(function() { document.body.classList.remove('alert-flash'); }, 50);
    }

    function getSignalName(phase) {
      if (phase >= 5) return 'ACCORD';
      if (phase >= 4) return 'BASE NOTE';
      if (phase >= 2) return 'HEART NOTE';
      return 'TOP NOTE';
    }

    function getDirection(alert) {
      return alert.sweep_direction === 'low' ? 'LONG' : 'SHORT';
    }

    function fmtPrice(n) {
      if (n == null) return '--';
      return Number(n).toFixed(2);
    }

    function renderOverlay(alert) {
      var dir = getDirection(alert);
      var phase = alert.phase || 0;
      var signalName = getSignalName(phase);
      var rr = alert.risk_reward ? (Number(alert.risk_reward).toFixed(1) + ' : 1') : '--';

      var html = '<div class="alert-overlay">';

      // Phase 2 (BOS) — informational only
      if (phase === 2) {
        html += '<div class="alert-signal-name">HEART NOTE \\u2014 Structure Confirmed</div>';
        html += '<div class="alert-instrument-dir">' + (alert.symbol || 'NQ') + ' \\u2014 ' + dir + '</div>';
        if (alert.message) {
          html += '<div class="alert-message">' + alert.message + '</div>';
        }
        html += '<div class="alert-actions">';
        html += '<button class="alert-btn-skip" data-alert-id="' + alert.id + '">DISMISS</button>';
        html += '</div>';
        html += '</div>';
        return html;
      }

      html += '<div class="alert-signal-name">' + signalName + '</div>';
      html += '<div class="alert-instrument-dir">' + (alert.symbol || 'NQ') + ' \\u2014 ' + dir + '</div>';
      html += '<div class="alert-levels-grid">';
      html += '<div><div class="alert-level-label">ENTRY</div><div class="alert-level-value" style="color:var(--red)">' + fmtPrice(alert.entry_price) + '</div></div>';
      html += '<div><div class="alert-level-label">TARGET</div><div class="alert-level-value" style="color:var(--green)">' + fmtPrice(alert.target_price) + '</div></div>';
      html += '<div><div class="alert-level-label">STOP</div><div class="alert-level-value" style="color:var(--danger)">' + fmtPrice(alert.stop_price) + '</div></div>';
      html += '</div>';
      html += '<div class="alert-rr">R:R 1:' + rr + '</div>';
      if (alert.message) {
        html += '<div class="alert-message">' + alert.message + '</div>';
      }
      html += '<div class="alert-actions">';
      // Only show "I'M IN" button at phase 4 (BASE NOTE) and phase 5 (ACCORD)
      if (phase >= 4) {
        html += '<button class="alert-btn-in" data-alert-id="' + alert.id + '">I\\u2019M IN</button>';
      }
      html += '<button class="alert-btn-skip" data-alert-id="' + alert.id + '">SKIP</button>';
      html += '</div>';
      html += '</div>';
      return html;
    }

    function logTradeFromAlert(alert, contracts) {
      var dir = getDirection(alert);
      var instId = alert.instrument_id || 2;
      var today = new Date().toISOString().slice(0, 10);

      var payload = {
        instrument_id: instId,
        date: today,
        direction: dir,
        contracts: contracts || 1,
        entry_price: alert.entry_price,
        exit_price: alert.target_price,
        pnl: 0,
        notes: 'From alert: ' + (alert.message || '')
      };

      fetch('/api/trade-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function() {
        return fetch('/api/alerts/' + alert.id + '/dismiss', { method: 'PUT' });
      })
      .then(function() {
        window.__showToast('\\u2713 Trade entry logged', 'success');
        document.dispatchEvent(new Event('account-changed'));
        pollAlerts();
      })
      .catch(function(err) {
        window.__showToast('\\u2717 Something went wrong \\u2014 try again', 'error');
        console.error('Failed to log trade from alert', err);
      });
    }

    function handleImIn(alert) {
      var dir = getDirection(alert);
      var instId = alert.instrument_id || 2;
      var accountId = window.selectedAccountId;

      // If no account or no stop/entry, skip compliance
      if (!accountId || !alert.entry_price || !alert.stop_price) {
        logTradeFromAlert(alert, 1);
        return;
      }

      var inBtn = overlayEl.querySelector('.alert-btn-in[data-alert-id="' + alert.id + '"]');
      if (inBtn) {
        inBtn.disabled = true;
        inBtn.innerHTML = '<span class="compliance-spinner"></span>CHECKING...';
      }

      fetch('/api/alpha/' + accountId + '/compliance-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument_id: instId,
          direction: dir,
          contracts: 1,
          entry_price: alert.entry_price,
          stop_price: alert.stop_price,
          target_price: alert.target_price || alert.entry_price
        })
      })
      .then(function(r) { return r.json(); })
      .then(function(result) {
        if (result.error) {
          logTradeFromAlert(alert, 1);
          return;
        }

        var hasWarnings = result.checks.some(function(c) { return c.severity === 'warning' || c.severity === 'critical'; });
        var anyFail = !result.passed;

        if (result.passed && !hasWarnings) {
          // All clear — log immediately
          logTradeFromAlert(alert, 1);
          return;
        }

        // Show compliance inline on alert card
        var alertCard = overlayEl.querySelector('.alert-overlay');
        if (!alertCard) { logTradeFromAlert(alert, 1); return; }

        // Remove old actions
        var oldActions = alertCard.querySelector('.alert-actions');
        if (oldActions) oldActions.remove();

        // Remove old compliance summary if exists
        var oldSummary = alertCard.querySelector('.alert-compliance-summary');
        if (oldSummary) oldSummary.remove();

        var rec = result.recommendation;
        var recContracts = rec.recommended_contracts || 0;

        if (anyFail && rec.action === 'skip') {
          // Compliance failed — show failure, disable I'M IN
          var failMsgs = result.checks.filter(function(c) { return !c.passed; }).map(function(c) { return c.message; }).join(' · ');
          var failHtml = '<div class="alert-compliance-summary fail">' + failMsgs + '</div>';
          failHtml += '<div class="alert-actions"><button class="alert-btn-skip" data-alert-id="' + alert.id + '">SKIP</button></div>';
          alertCard.insertAdjacentHTML('beforeend', failHtml);
          alertCard.querySelector('.alert-btn-skip').onclick = function() { handleSkip(alert.id); };
        } else {
          // Warnings — show summary with options
          var warnMsgs = result.checks.filter(function(c) { return !c.passed || c.severity === 'warning' || c.severity === 'critical'; }).map(function(c) { return c.message; }).join(' · ');
          var warnHtml = '<div class="alert-compliance-summary warn">' + warnMsgs + '</div>';
          warnHtml += '<div class="alert-actions">';
          warnHtml += '<button class="alert-btn-in" data-alert-id="' + alert.id + '">Proceed Anyway</button>';
          if (recContracts > 0 && recContracts < 1) {
            // Already at 1 contract, can't reduce further
          } else if (rec.action === 'reduce' && recContracts > 0) {
            warnHtml += '<button class="alert-btn-reduce" data-alert-id="' + alert.id + '">Reduce to ' + recContracts + '</button>';
          }
          warnHtml += '<button class="alert-btn-skip" data-alert-id="' + alert.id + '">SKIP</button>';
          warnHtml += '</div>';
          alertCard.insertAdjacentHTML('beforeend', warnHtml);

          alertCard.querySelector('.alert-btn-in').onclick = function() { logTradeFromAlert(alert, 1); };
          var reduceBtn = alertCard.querySelector('.alert-btn-reduce');
          if (reduceBtn) {
            reduceBtn.onclick = function() { logTradeFromAlert(alert, recContracts); };
          }
          alertCard.querySelector('.alert-btn-skip').onclick = function() { handleSkip(alert.id); };
        }
      })
      .catch(function(err) {
        console.error('Compliance check failed', err);
        logTradeFromAlert(alert, 1);
      });
    }

    function handleSkip(alertId) {
      fetch('/api/alerts/' + alertId + '/dismiss', { method: 'PUT' })
        .then(function() {
          window.__showToast('Setup skipped', 'warning');
          pollAlerts();
        })
        .catch(function(err) { console.error('Failed to dismiss alert', err); });
    }

    function processAlerts(alerts) {
      var hasNew = false;
      alerts.forEach(function(a) {
        if (!seenIds[a.id]) {
          hasNew = true;
          seenIds[a.id] = true;
        }
      });

      if (hasNew && !firstPoll) {
        flashBorder();
      }
      firstPoll = false;

      // Update pulsing dot
      if (alerts.length > 0) {
        alertDot.classList.add('visible');
      } else {
        alertDot.classList.remove('visible');
      }

      // Find ready/execute/BOS alerts for overlay
      var overlayAlert = null;
      alerts.forEach(function(a) {
        if ((a.alert_type === 'ready' || a.alert_type === 'execute' || (a.alert_type === 'approaching' && a.phase === 2)) && !overlayAlert) {
          overlayAlert = a;
        }
      });

      if (overlayAlert) {
        overlayEl.innerHTML = renderOverlay(overlayAlert);

        var inBtn = overlayEl.querySelector('.alert-btn-in');
        var skipBtn = overlayEl.querySelector('.alert-btn-skip');
        if (inBtn) {
          inBtn.onclick = function() { handleImIn(overlayAlert); };
        }
        if (skipBtn) {
          skipBtn.onclick = function() { handleSkip(overlayAlert.id); };
        }

        // Update chart and tracker with alert data
        document.dispatchEvent(new CustomEvent('alert-levels', { detail: overlayAlert }));
        document.dispatchEvent(new CustomEvent('alert-phase', { detail: { phase: overlayAlert.phase || 0 } }));
      } else {
        overlayEl.innerHTML = '';
        document.dispatchEvent(new CustomEvent('alert-levels', { detail: null }));
        document.dispatchEvent(new CustomEvent('alert-phase', { detail: null }));
      }
    }

    function pollAlerts() {
      fetch('/api/alerts/active', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(alerts) { processAlerts(alerts || []); })
        .catch(function() {});
    }

    pollAlerts();
    setInterval(pollAlerts, 10000);

    // Demo button
    document.getElementById('demo-alert-btn').onclick = function() {
      fetch('/api/alerts/demo', { method: 'POST', credentials: 'same-origin' })
        .then(function() { pollAlerts(); })
        .catch(function(err) { console.error('Failed to create demo alert', err); });
    };

  })();
  </script>

  <script>
  /* ── AI Analysis ── */
  (function() {
    var aiEl = document.getElementById('ai-analysis');
    var currentAnalysis = null;
    var hasRun = false;

    function getActiveAlertId() {
      var inBtn = document.querySelector('.alert-btn-in');
      return inBtn ? inBtn.dataset.alertId : null;
    }

    function renderCard() {
      var btnLabel = hasRun ? '\u21BB Re-analyze' : '\u25C7 Run Analysis';
      var html = '<div class="card ai-analysis-card" style="animation:slideUp 0.3s ease">';
      html += '<div class="ai-analysis-header">';
      html += '<span class="ai-analysis-title">\u25C8 AI ANALYSIS</span>';
      html += '<span class="ai-analysis-tag">HAIKU</span>';
      html += '</div>';
      html += '<button class="ai-run-btn" id="ai-run-btn">' + btnLabel + '</button>';

      if (currentAnalysis) {
        var a = currentAnalysis;
        var confColor = a.confidence >= 70 ? 'var(--red)' : 'var(--amber)';
        var sigClass = a.confidence >= 70 ? 'high' : a.confidence >= 50 ? 'mid' : 'low';

        html += '<div class="ai-signal-row">';
        html += '<div><span class="ai-signal-tag ' + sigClass + '">' + (a.signal || 'N/A') + '</span>';
        html += '<div class="ai-fragrance">Projection: ' + (a.fragrance || '') + '</div></div>';
        html += '<div class="ai-confidence-box">';
        html += '<div class="ai-confidence-num" style="color:' + confColor + '">' + (a.confidence || 0) + '</div>';
        html += '<div class="ai-confidence-label">CONFIDENCE</div>';
        html += '</div></div>';

        html += '<div class="ai-summary">' + (a.summary || '') + '</div>';

        html += '<div class="ai-levels-box">';
        html += '<div class="ai-level-row"><span class="ai-level-label">ENTRY</span><span class="ai-level-value" style="color:var(--red)">' + (a.entry_price != null ? a.entry_price.toFixed(2) : '--') + '</span></div>';
        html += '<div class="ai-level-row"><span class="ai-level-label">TARGET</span><span class="ai-level-value" style="color:var(--green)">' + (a.target_price != null ? a.target_price.toFixed(2) : '--') + '</span></div>';
        html += '<div class="ai-level-row"><span class="ai-level-label">STOP</span><span class="ai-level-value" style="color:var(--danger)">' + (a.stop_price != null ? a.stop_price.toFixed(2) : '--') + '</span></div>';
        html += '<div class="ai-level-row"><span class="ai-level-label">R:R</span><span class="ai-level-value" style="color:var(--amber)">' + (a.risk_reward != null ? '1:' + a.risk_reward.toFixed(1) : '--') + '</span></div>';
        html += '</div>';

        if (a.warnings && a.warnings.length) {
          html += '<div class="ai-warnings">';
          a.warnings.forEach(function(w) {
            html += '<div class="ai-warning-item"><span class="ai-warning-bullet">\u25B8</span>' + w + '</div>';
          });
          html += '</div>';
        }

        html += '<div class="ai-redline-box">';
        html += '<div class="ai-redline-label">REDLINE CHECK</div>';
        html += '<div class="ai-redline-text">' + (a.consistency_check || '') + '</div>';
        html += '<div class="ai-contracts-text">' + (a.contracts_suggestion || '') + '</div>';
        html += '</div>';
      }

      html += '</div>';
      aiEl.innerHTML = html;

      document.getElementById('ai-run-btn').onclick = runAnalysis;
    }

    function runAnalysis() {
      var btn = document.getElementById('ai-run-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="ai-spinner"></span> Analyzing\u2026';

      var alertId = getActiveAlertId();
      var url = alertId ? '/api/analyze/alert/' + alertId : '/api/analyze/demo';

      fetch(url, { method: 'POST', credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var analysis = data.analysis || data;
          currentAnalysis = analysis;
          hasRun = true;
          renderCard();
        })
        .catch(function(err) {
          console.error('AI analysis failed', err);
          btn.disabled = false;
          btn.innerHTML = hasRun ? '\u21BB Re-analyze' : '\u25C7 Run Analysis';
        });
    }

    renderCard();
  })();
  </script>

  <script>
  /* ── Engine Status Indicator ── */
  (function() {
    var el = document.getElementById('engine-status');
    function fetchStatus() {
      fetch('/api/engine/status', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var lastRun = data.last_run;
          var timeAgo = 'never';
          if (lastRun) {
            var diff = Math.floor((Date.now() - new Date(lastRun + 'Z').getTime()) / 1000);
            if (diff < 60) timeAgo = diff + 's ago';
            else if (diff < 3600) timeAgo = Math.floor(diff / 60) + 'm ago';
            else timeAgo = window.__formatET(lastRun + 'Z');
          }
          var activeFvgs = data.fvg_counts ? data.fvg_counts.active : 0;
          var setups = data.active_setups || 0;
          el.textContent = 'Engine: last run ' + timeAgo + ' \\u00B7 ' + activeFvgs + ' active FVGs \\u00B7 ' + setups + ' setups today';
        }).catch(function() {
          el.textContent = 'Engine: offline';
        });
    }
    fetchStatus();
    setInterval(fetchStatus, 30000);
  })();
  </script>

  <script>
  /* ── Notification Settings ── */
  (function() {
    var container = document.getElementById('notifications-settings');
    var settings = null;

    function toggleHtml(id, checked) {
      return '<label class="toggle-switch"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '><span class="toggle-track"></span></label>';
    }

    function render() {
      if (!settings) {
        container.innerHTML = '';
        return;
      }
      var s = settings;
      var webhookVal = s.discord_webhook_url || '';
      var html = '<div class="card" style="animation:slideUp 0.3s ease">';
      html += '<div class="card-title">\\u25C8 NOTIFICATIONS</div>';

      html += '<div style="font-family:\\'Outfit\\',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:6px">DISCORD WEBHOOK</div>';
      html += '<div class="notif-webhook-row">';
      html += '<input class="modal-input" id="notif-webhook-input" type="text" value="' + webhookVal.replace(/"/g, '&quot;') + '" placeholder="https://discord.com/api/webhooks/...">';
      html += '<button class="notif-btn" id="notif-save-btn">Save</button>';
      html += '<button class="notif-btn" id="notif-test-btn">Test</button>';
      html += '<span class="notif-test-status" id="notif-test-status" style="opacity:0"></span>';
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
      html += '</div>';

      container.innerHTML = html;
      bindEvents();
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
          window.__showToast('\\u2713 Settings saved', 'success');
        })
        .catch(function(err) {
          console.error('Settings save error:', err);
          window.__showToast('\\u2717 Something went wrong \\u2014 try again', 'error');
        });
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
            if (data.success) {
              window.__showToast('\\u2713 Discord notification sent', 'success');
            } else {
              window.__showToast('\\u2717 Discord webhook failed', 'error');
            }
          })
          .catch(function() {
            window.__showToast('\\u2717 Discord webhook failed', 'error');
          });
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
      .then(function(data) {
        settings = data;
        render();
      })
      .catch(function(err) { console.error('Failed to load notification settings:', err); });
  })();
  </script>

  <script>
  /* ── Strategy Config Card ── */
  (function() {
    var container = document.getElementById('strategy-config');
    var config = null;
    var saveTimer = null;
    var collapsed = true;

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
            window.__showToast('\\u2713 Saved', 'success');
          })
          .catch(function() { window.__showToast('\\u2717 Save failed', 'error'); });
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
          window.__showToast('\\u2713 ' + name.charAt(0).toUpperCase() + name.slice(1) + ' preset applied', 'success');
        })
        .catch(function() { window.__showToast('\\u2717 Preset failed', 'error'); });
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
          window.__showToast(enabled ? '\\u26A0 Kill switch activated' : '\\u2713 Kill switch deactivated', enabled ? 'warning' : 'success');
        })
        .catch(function() { window.__showToast('\\u2717 Failed', 'error'); });
    }

    function render() {
      if (!config) { container.innerHTML = ''; return; }
      var c = config;
      var ksActive = c.kill_switch === 1;
      var preset = c.active_preset || 'normal';

      var html = '<div class="card" style="animation:slideUp 0.3s ease">';
      html += '<div class="strat-card-header" id="strat-header">';
      html += '<div class="card-title">\\u25C8 STRATEGY CONFIG</div>';
      html += '<span class="strat-chevron' + (collapsed ? '' : ' open') + '" id="strat-chevron">\\u25BC</span>';
      html += '</div>';
      html += '<div class="strat-body' + (collapsed ? ' collapsed' : ' expanded') + '" id="strat-body" style="max-height:' + (collapsed ? '0' : '2000px') + '">';

      // Preset buttons
      html += '<div class="preset-row">';
      html += '<button class="preset-btn preset-conservative' + (preset === 'conservative' ? ' active' : '') + '" data-preset="conservative">CONSERVATIVE</button>';
      html += '<button class="preset-btn preset-normal' + (preset === 'normal' ? ' active' : '') + '" data-preset="normal">NORMAL</button>';
      html += '<button class="preset-btn preset-aggressive' + (preset === 'aggressive' ? ' active' : '') + '" data-preset="aggressive">AGGRESSIVE</button>';
      html += '</div>';

      // Kill switch
      html += '<div class="kill-switch-row' + (ksActive ? ' active' : '') + '">';
      if (ksActive) {
        html += '<div><div class="kill-switch-label" style="color:var(--danger)">KILL SWITCH ACTIVE \\u2014 engine paused until tomorrow</div></div>';
      } else {
        html += '<div><div class="kill-switch-label">KILL SWITCH \\u2014 No more trades today</div></div>';
      }
      html += '<label class="kill-switch-toggle"><input type="checkbox" id="kill-switch-toggle"' + (ksActive ? ' checked' : '') + '><span class="kill-switch-track"></span></label>';
      html += '</div>';
      html += '<div class="kill-switch-hint">Resets at midnight ET</div>';

      // Session toggles
      html += '<div class="strat-divider">SESSION</div>';
      html += '<div class="strat-toggle-row">';
      html += '<div class="strat-toggle-label">Trade London sweeps</div>';
      html += toggleHtml('strat-london', c.trade_london_sweep);
      html += '</div>';
      html += '<div class="strat-toggle-row">';
      html += '<div class="strat-toggle-label">Trade NY sweeps</div>';
      html += toggleHtml('strat-ny', c.trade_ny_sweep);
      html += '</div>';

      // FVG toggles
      html += '<div class="strat-divider">FVG</div>';
      html += '<div class="strat-toggle-row">';
      html += '<div class="strat-toggle-label">Scan 1H FVGs</div>';
      html += toggleHtml('strat-fvg1h', c.fvg_scan_1h);
      html += '</div>';
      html += '<div class="strat-toggle-row">';
      html += '<div class="strat-toggle-label">Scan 4H FVGs</div>';
      html += toggleHtml('strat-fvg4h', c.fvg_scan_4h);
      html += '</div>';
      html += '<div class="strat-toggle-row">';
      html += '<div><div class="strat-toggle-label">Require IFVG for continuation</div>';
      html += '<div class="strat-toggle-help">Only fires BASE NOTE (Phase 4) on Inverse FVGs</div></div>';
      html += toggleHtml('strat-ifvg', c.continuation_require_ifvg);
      html += '</div>';

      // Entry settings
      html += '<div class="strat-divider">ENTRY</div>';
      html += '<div class="strat-number-row">';
      html += '<div class="strat-toggle-label">Min R:R</div>';
      html += '<div style="text-align:right"><input type="number" class="strat-number-input" id="strat-minrr" value="' + (c.min_rr || 2.0) + '" min="1.0" max="5.0" step="0.5">';
      html += '<div class="strat-number-display">1:' + (c.min_rr || 2.0).toFixed(1) + '</div></div>';
      html += '</div>';
      html += '<div class="strat-toggle-row">';
      html += '<div class="strat-toggle-label">Require candle close beyond London</div>';
      html += toggleHtml('strat-sweep-close', c.sweep_require_close);
      html += '</div>';
      html += '<div class="strat-number-row">';
      html += '<div class="strat-toggle-label">Min AI confidence</div>';
      html += '<div style="text-align:right"><input type="number" class="strat-number-input" id="strat-confidence" value="' + (c.min_confidence || 60) + '" min="0" max="100" step="5">';
      html += '<div class="strat-number-display">' + getFragrance(c.min_confidence || 60) + '</div></div>';
      html += '</div>';

      // Position settings
      html += '<div class="strat-divider">POSITION</div>';
      html += '<div class="strat-number-row">';
      html += '<div class="strat-toggle-label">Default contracts</div>';
      html += '<input type="number" class="strat-number-input" id="strat-contracts" value="' + (c.default_contracts || 1) + '" min="1" max="10" step="1">';
      html += '</div>';
      html += '<div class="strat-number-row">';
      html += '<div class="strat-toggle-label">Max contracts override</div>';
      html += '<div style="display:flex;align-items:center"><input type="number" class="strat-number-input" id="strat-max-contracts" value="' + (c.max_contracts_override || '') + '" min="1" max="20" step="1" placeholder="\\u2014">';
      html += '<button class="strat-clear-btn" id="strat-clear-max">\\u2715</button></div>';
      html += '</div>';

      html += '</div>'; // strat-body
      html += '</div>'; // card
      container.innerHTML = html;
      bindEvents();
    }

    function bindEvents() {
      // Collapse toggle
      var header = document.getElementById('strat-header');
      if (header) header.onclick = function() {
        collapsed = !collapsed;
        var body = document.getElementById('strat-body');
        var chev = document.getElementById('strat-chevron');
        if (collapsed) {
          body.className = 'strat-body collapsed';
          body.style.maxHeight = '0';
          chev.className = 'strat-chevron';
        } else {
          body.className = 'strat-body expanded';
          body.style.maxHeight = '2000px';
          chev.className = 'strat-chevron open';
        }
      };

      // Preset buttons
      var presetBtns = container.querySelectorAll('.preset-btn');
      for (var i = 0; i < presetBtns.length; i++) {
        presetBtns[i].onclick = function() { applyPreset(this.dataset.preset); };
      }

      // Kill switch
      var ks = document.getElementById('kill-switch-toggle');
      if (ks) ks.onchange = function() { toggleKillSwitch(this.checked); };

      // Toggle bindings
      var toggleMap = {
        'strat-london': 'trade_london_sweep',
        'strat-ny': 'trade_ny_sweep',
        'strat-fvg1h': 'fvg_scan_1h',
        'strat-fvg4h': 'fvg_scan_4h',
        'strat-ifvg': 'continuation_require_ifvg',
        'strat-sweep-close': 'sweep_require_close'
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
          this.nextElementSibling.textContent = v.toFixed(1) + ':1';
          debouncedSave({ min_rr: v });
        }
      };

      var conf = document.getElementById('strat-confidence');
      if (conf) conf.oninput = function() {
        var v = parseInt(this.value);
        if (!isNaN(v) && v >= 0 && v <= 100) {
          this.nextElementSibling.textContent = getFragrance(v);
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
      .catch(function(err) { console.error('Failed to load strategy config:', err); });
  })();
  </script>

  <script>
  /* ── Toast System ── */
  (function() {
    var container = document.getElementById('toast-container');
    window.__showToast = function(message, type) {
      type = type || 'success';
      var toast = document.createElement('div');
      toast.className = 'toast ' + type;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(function() {
        toast.classList.add('dismissing');
        setTimeout(function() { toast.remove(); }, 300);
      }, 3000);
    };
  })();
  </script>

  <script>
  /* ── Format Eastern Time helper ── */
  window.__formatET = function(isoString) {
    if (!isoString) return '--';
    try {
      var d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit',
        hour12: true
      }) + ' ET';
    } catch(e) { return isoString; }
  };

  /* ── Format dollar amounts ── */
  window.__fmtDollar = function(n) {
    if (n == null || isNaN(n)) return '--';
    var prefix = n >= 0 ? '$' : '-$';
    return prefix + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  /* ── Format price for instrument ── */
  window.__fmtPrice = function(n) {
    if (n == null || isNaN(n)) return '--';
    return Number(n).toFixed(2);
  };

  /* ── Format percentage ── */
  window.__fmtPct = function(n) {
    if (n == null || isNaN(n)) return '--';
    return Number(n).toFixed(1) + '%';
  };
  </script>

  <script>
  /* ── Logout Confirmation ── */
  (function() {
    var dropdown = document.getElementById('logout-dropdown');
    window.__showLogoutConfirm = function() {
      if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
        return;
      }
      dropdown.className = 'logout-dropdown';
      dropdown.style.display = 'block';
      dropdown.innerHTML =
        '<span style="font-family:JetBrains Mono,monospace;font-size:10px;color:var(--label);white-space:nowrap">Log out?</span>' +
        '<button class="logout-yes" id="logout-yes">Yes</button>' +
        '<button class="logout-no" id="logout-no">No</button>';
      document.getElementById('logout-yes').onclick = function() { window.location.href = '/auth/logout'; };
      document.getElementById('logout-no').onclick = function() { dropdown.style.display = 'none'; };
    };
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.header-user')) dropdown.style.display = 'none';
    });
  })();
  </script>

  <script>
  /* ── Pull to Refresh (mobile) ── */
  (function() {
    var container = document.getElementById('main-container');
    var indicator = document.getElementById('ptr-indicator');
    var startY = 0;
    var pulling = false;
    var threshold = 60;

    container.addEventListener('touchstart', function(e) {
      if (container.scrollTop === 0 || window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    }, { passive: true });

    container.addEventListener('touchmove', function(e) {
      if (!pulling) return;
      var dy = e.touches[0].clientY - startY;
      if (dy > 10 && (container.scrollTop === 0 || window.scrollY === 0)) {
        if (dy > threshold) {
          indicator.classList.add('visible');
        }
      } else {
        pulling = false;
        indicator.classList.remove('visible');
      }
    }, { passive: true });

    container.addEventListener('touchend', function() {
      if (indicator.classList.contains('visible')) {
        // Refresh all data
        document.dispatchEvent(new Event('account-changed'));
        document.dispatchEvent(new CustomEvent('instrument-changed', { detail: { instrument: window.selectedInstrument } }));
        setTimeout(function() { indicator.classList.remove('visible'); }, 800);
      }
      pulling = false;
    }, { passive: true });
  })();
  </script>

  <script>
  /* ── Performance Stats Card ── */
  (function() {
    var perfEl = document.getElementById('performance-card');

    function renderPerformance(data) {
      if (!data || data.total_setups === 0) {
        perfEl.innerHTML = '<div class="card" style="animation:slideUp 0.3s ease;animation-delay:450ms;animation-fill-mode:backwards">' +
          '<div class="card-title">\\u25C8 SETUP PERFORMANCE</div>' +
          '<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">No completed setups yet</div></div>';
        return;
      }

      var d = data;
      var streakStr = d.streak > 0 ? '+' + d.streak + 'W' : d.streak < 0 ? d.streak + 'L' : '0';
      var streakColor = d.streak > 0 ? 'var(--green)' : d.streak < 0 ? 'var(--danger)' : 'var(--muted)';
      var wrColor = d.setup_win_rate >= 50 ? 'var(--red)' : 'var(--muted)';
      var confLabel = d.avg_confidence >= 75 ? 'Prestige' : d.avg_confidence >= 50 ? 'Armani' : 'YSL';

      var html = '<div class="card" style="animation:slideUp 0.3s ease;animation-delay:450ms;animation-fill-mode:backwards">';
      html += '<div class="card-title">\\u25C8 SETUP PERFORMANCE</div>';

      // Row 1
      html += '<div class="dash-stat-grid">';
      html += '<div class="dash-stat-cell"><div class="dash-stat-label">Win Rate</div><div class="dash-stat-value" style="color:' + wrColor + '">' + d.setup_win_rate + '%</div></div>';
      html += '<div class="dash-stat-cell"><div class="dash-stat-label">Setups</div><div class="dash-stat-value" style="color:var(--bright)">' + d.total_setups + '</div></div>';
      html += '<div class="dash-stat-cell"><div class="dash-stat-label">Streak</div><div class="dash-stat-value" style="color:' + streakColor + '">' + streakStr + '</div></div>';
      html += '</div>';

      // Row 2
      html += '<div class="dash-stat-grid">';
      html += '<div class="dash-stat-cell"><div class="dash-stat-label">Avg R:R Target</div><div class="dash-stat-value" style="color:var(--bright)">' + (d.avg_rr_target || '\\u2014') + '</div></div>';
      html += '<div class="dash-stat-cell"><div class="dash-stat-label">Avg R:R Achieved</div><div class="dash-stat-value" style="color:var(--bright)">' + (d.avg_rr_achieved || '\\u2014') + '</div></div>';
      html += '<div class="dash-stat-cell"><div class="dash-stat-label">Best Instrument</div><div class="dash-stat-value" style="color:var(--red)">' + d.best_instrument.symbol + ' ' + d.best_instrument.win_rate + '%</div></div>';
      html += '</div>';

      // Row 3
      html += '<div class="dash-stat-grid" style="grid-template-columns:1fr 1fr">';
      html += '<div class="dash-stat-cell"><div class="dash-stat-label">Avg Confidence</div><div class="dash-stat-value" style="color:var(--bright)">' + d.avg_confidence + '%<span style="font-size:8px;color:var(--label);margin-left:4px">' + confLabel + '</span></div></div>';
      html += '<div class="dash-stat-cell"><div class="dash-stat-label">Best Session</div><div class="dash-stat-value" style="color:var(--bright)">' + d.best_session.session + ' ' + d.best_session.win_rate + '%</div></div>';
      html += '</div>';

      html += '</div>';
      perfEl.innerHTML = html;
    }

    function fetchPerformance() {
      fetch('/api/stats/setups', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(data) { renderPerformance(data); })
        .catch(function() {});
    }

    fetchPerformance();
    setInterval(fetchPerformance, 60000);
  })();
  </script>

  <script>
  /* ── Service Worker Registration ── */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
  </script>
</body>
</html>`;
}
