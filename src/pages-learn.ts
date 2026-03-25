export function getLearnPage(user: { name: string; email: string; avatar_url: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MTRADE — Learn</title>
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
        <div class="header-user" style="position:relative">
          ${user.avatar_url ? `<img src="${user.avatar_url}" alt="${user.name}">` : ''}
          <a href="/auth/logout">LOGOUT</a>
        </div>
      </div>
    </div>

    <div class="tab-bar">
      <a href="/app">DASHBOARD</a>
      <a href="/app/learn" class="active">LEARN</a>
    </div>

    <div id="kb-search"></div>
    <div id="kb-content"></div>

    <div class="footer">
      <div class="footer-brand">MTRADE</div>
      <div class="footer-copy">&copy; 2026 LRX Enterprises Inc.</div>
    </div>
  </div>

  <script>
    // --- KB Search & Category Listing ---
    (function() {
      var debounceTimer = null;
      var allArticles = [];

      // --- SEARCH BAR ---
      var searchContainer = document.getElementById('kb-search');
      var searchCard = document.createElement('div');
      searchCard.style.cssText = 'background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;';
      var searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Search concepts, rules, features...';
      searchInput.style.cssText = 'width:100%;background:#0a0a10;color:var(--text);border:1px solid var(--border);border-radius:10px;padding:14px 16px;font-size:14px;font-family:JetBrains Mono,monospace;outline:none;';
      searchInput.addEventListener('focus', function() { searchInput.style.borderColor = 'var(--red)'; });
      searchInput.addEventListener('blur', function() { searchInput.style.borderColor = 'var(--border)'; });
      searchCard.appendChild(searchInput);
      var resultsBox = document.createElement('div');
      resultsBox.style.cssText = 'display:none;margin-top:12px;';
      searchCard.appendChild(resultsBox);
      searchContainer.appendChild(searchCard);

      searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        var val = searchInput.value.trim();
        if (!val) { resultsBox.style.display = 'none'; resultsBox.innerHTML = ''; return; }
        debounceTimer = setTimeout(function() {
          fetch('/api/kb/search?q=' + encodeURIComponent(val), { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(data) {
              resultsBox.innerHTML = '';
              if (!data.length) { resultsBox.style.display = 'none'; return; }
              resultsBox.style.display = 'block';
              data.forEach(function(item, i) {
                var row = document.createElement('div');
                row.style.cssText = 'padding:10px 0;cursor:pointer;' + (i < data.length - 1 ? 'border-bottom:1px solid var(--border);' : '');
                var title = document.createElement('div');
                title.textContent = item.title;
                title.style.cssText = 'font-size:13px;color:var(--bright);font-weight:600;font-family:Outfit,sans-serif;';
                var tag = document.createElement('span');
                tag.textContent = item.category;
                tag.style.cssText = 'font-size:8px;background:rgba(255,255,255,0.04);color:var(--label);padding:2px 6px;border-radius:4px;margin-left:8px;font-family:JetBrains Mono,monospace;text-transform:uppercase;letter-spacing:1px;vertical-align:middle;';
                title.appendChild(tag);
                var snippet = document.createElement('div');
                snippet.textContent = item.snippet || '';
                snippet.style.cssText = 'font-size:11px;color:var(--muted);margin-top:4px;font-family:JetBrains Mono,monospace;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;';
                row.appendChild(title);
                row.appendChild(snippet);
                row.addEventListener('click', function() {
                  searchInput.value = '';
                  resultsBox.style.display = 'none';
                  resultsBox.innerHTML = '';
                  var target = document.getElementById('article-' + item.slug);
                  if (target) {
                    var card = target.closest('.kb-article-card');
                    if (card) {
                      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      if (!card.classList.contains('expanded')) card.click();
                    }
                  }
                });
                resultsBox.appendChild(row);
              });
            });
        }, 300);
      });

      // --- CATEGORY LISTING ---
      var contentContainer = document.getElementById('kb-content');
      fetch('/api/kb/articles', { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(articles) {
          allArticles = articles;
          var categories = {};
          articles.forEach(function(a) {
            if (!categories[a.category]) categories[a.category] = [];
            categories[a.category].push(a);
          });

          Object.keys(categories).forEach(function(cat) {
            var header = document.createElement('div');
            header.textContent = cat;
            header.style.cssText = 'font-family:Outfit,sans-serif;font-size:14px;font-weight:700;color:var(--red-soft);text-transform:uppercase;letter-spacing:2px;margin-top:24px;margin-bottom:8px;';
            contentContainer.appendChild(header);

            categories[cat].forEach(function(article) {
              var card = document.createElement('div');
              card.className = 'kb-article-card';
              card.style.cssText = 'background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:6px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;';
              var titleEl = document.createElement('span');
              titleEl.textContent = article.title;
              titleEl.style.cssText = 'font-family:Outfit,sans-serif;font-size:13px;font-weight:600;color:var(--bright);';
              var chevron = document.createElement('span');
              chevron.textContent = '\u25B8';
              chevron.style.cssText = 'color:var(--muted);font-size:12px;';
              card.appendChild(titleEl);
              card.appendChild(chevron);

              var expandDiv = document.createElement('div');
              expandDiv.id = 'article-' + article.slug;
              expandDiv.className = 'kb-expand-area';
              expandDiv.style.cssText = 'width:100%;max-height:0;overflow:hidden;transition:max-height 0.3s ease;';
              card.appendChild(expandDiv);

              card.addEventListener('click', function() {
                var currentlyExpanded = contentContainer.querySelector('.kb-article-card.expanded');
                if (currentlyExpanded && currentlyExpanded !== card) {
                  var prevExpand = currentlyExpanded.querySelector('.kb-expand-area');
                  var prevChevron = currentlyExpanded.querySelectorAll('span')[1];
                  if (prevExpand) { prevExpand.style.maxHeight = '0px'; }
                  if (prevChevron) prevChevron.textContent = '\u25B8';
                  currentlyExpanded.classList.remove('expanded');
                }

                if (card.classList.contains('expanded')) {
                  expandDiv.style.maxHeight = '0px';
                  chevron.textContent = '\u25B8';
                  card.classList.remove('expanded');
                  return;
                }

                card.classList.add('expanded');
                chevron.textContent = '\u25BE';
                expandDiv.innerHTML = '<div style="height:100px;border-radius:8px;background:linear-gradient(90deg,rgba(255,255,255,0.02) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.02) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;"></div>';
                expandDiv.style.maxHeight = expandDiv.scrollHeight + 'px';

                fetch('/api/kb/articles/' + article.slug, { credentials: 'same-origin' })
                  .then(function(r) { return r.json(); })
                  .then(function(data) {
                    if (!data.content) { expandDiv.innerHTML = '<div style="font-size:12px;color:var(--muted);">No content available.</div>'; expandDiv.style.maxHeight = expandDiv.scrollHeight + 'px'; return; }
                    expandDiv.innerHTML = '';
                    var contentArea = document.createElement('div');
                    contentArea.style.cssText = 'padding:12px 0 4px 0;border-top:1px solid var(--border);margin-top:10px;';

                    function parseLine(text) {
                      var out = '';
                      var i = 0;
                      while (i < text.length) {
                        if (text[i] === '*' && text[i+1] === '*') {
                          var end = text.indexOf('**', i + 2);
                          if (end !== -1) { out += '<span style="font-weight:600;color:var(--bright);">' + text.substring(i+2, end) + '</span>'; i = end + 2; continue; }
                        }
                        if (text[i] === '\x60') {
                          var end2 = text.indexOf('\x60', i + 1);
                          if (end2 !== -1) { out += '<span style="font-family:JetBrains Mono,monospace;background:rgba(255,255,255,0.04);padding:1px 5px;border-radius:3px;font-size:11px;">' + text.substring(i+1, end2) + '</span>'; i = end2 + 1; continue; }
                        }
                        out += text[i]; i++;
                      }
                      return out;
                    }

                    var lines = data.content.split('\\n');
                    lines.forEach(function(line) {
                      if (line.indexOf('## ') === 0) {
                        var h = document.createElement('h3');
                        h.innerHTML = parseLine(line.substring(3));
                        h.style.cssText = 'font-family:Outfit,sans-serif;font-size:13px;font-weight:700;color:var(--red-soft);margin-top:16px;margin-bottom:6px;';
                        contentArea.appendChild(h);
                      } else if (line.indexOf('- ') === 0) {
                        var bullet = document.createElement('div');
                        bullet.style.cssText = 'display:flex;flex-direction:row;margin-bottom:4px;';
                        var arrow = document.createElement('span');
                        arrow.textContent = '\u25B8';
                        arrow.style.cssText = 'color:var(--red-soft);font-size:8px;flex-shrink:0;margin-top:3px;';
                        var btext = document.createElement('span');
                        btext.innerHTML = parseLine(line.substring(2));
                        btext.style.cssText = 'font-size:12px;color:var(--text);padding-left:4px;';
                        bullet.appendChild(arrow);
                        bullet.appendChild(btext);
                        contentArea.appendChild(bullet);
                      } else if (line.indexOf('> ') === 0) {
                        var callout = document.createElement('div');
                        callout.innerHTML = parseLine(line.substring(2));
                        callout.style.cssText = 'background:rgba(251,44,90,0.03);border-left:2px solid var(--red);padding:10px 14px;border-radius:0 8px 8px 0;font-size:11px;color:var(--label);margin-top:8px;';
                        contentArea.appendChild(callout);
                      } else if (line.trim() === '') {
                        var spacer = document.createElement('div');
                        spacer.style.cssText = 'margin-bottom:10px;';
                        contentArea.appendChild(spacer);
                      } else {
                        var p = document.createElement('p');
                        p.innerHTML = parseLine(line);
                        p.style.cssText = 'font-size:13px;color:var(--text);line-height:1.7;';
                        contentArea.appendChild(p);
                      }
                    });

                    expandDiv.appendChild(contentArea);
                    expandDiv.style.maxHeight = expandDiv.scrollHeight + 'px';
                  });
              });
              contentContainer.appendChild(card);
            });
          });
        });
    })();

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
