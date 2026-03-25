export function getManifestJson(): string {
  return JSON.stringify({
    name: 'Mtrade',
    short_name: 'Mtrade',
    description: "Matthew's ICT Strategy Monitor",
    start_url: '/app',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#08080c',
    theme_color: '#fb2c5a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/svg+xml' },
    ],
  });
}

export function getIconSvg(size: number): string {
  const r = size * 0.18; // corner radius
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(251,44,90,0.3)"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" fill="#08080c"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.35}" fill="url(#glow)"/>
  <text x="${size / 2}" y="${size * 0.62}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="900" font-size="${size * 0.52}" fill="#fb2c5a">M</text>
</svg>`;
}

export function getFaviconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(251,44,90,0.3)"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="#08080c"/>
  <circle cx="16" cy="16" r="11" fill="url(#glow)"/>
  <text x="16" y="20" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="900" font-size="17" fill="#fb2c5a">M</text>
</svg>`;
}

export function getServiceWorkerJs(): string {
  return `
var CACHE_NAME = 'mtrade-v1';
var PRE_CACHE = ['/app', '/manifest.json'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRE_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // API calls: network-only, offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(JSON.stringify({ offline: true, message: "You're offline — data will refresh when connected" }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Everything else: network-first, cache fallback
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || new Response('Offline', { status: 503 });
      });
    })
  );
});
`;
}
