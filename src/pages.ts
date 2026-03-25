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

    @media (min-width: 768px) {
      .container { padding: 24px; }
      .card { padding: 20px; }
      .toggle-row { flex-wrap: nowrap; }
      .form-grid { grid-template-columns: 1fr 1fr; }
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
</body>
</html>`;
}
