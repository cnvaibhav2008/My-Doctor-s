/* ═══════════════════════════════════════════════════════
   MyDoctor's Service Worker — v3.0
   Offline support, background sync, push notifications
═══════════════════════════════════════════════════════ */

const CACHE_NAME = 'mydoctors-v3';
const STATIC_CACHE = 'mydoctors-static-v3';
const API_CACHE   = 'mydoctors-api-v3';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/static/styles.css',
  '/static/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // CDN fallback (cached from network on first load)
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/doctors',
  '/api/nearby/hospitals',
];

// ─── INSTALL ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing MyDoctor\'s v3...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Cache local assets reliably
      for (const url of PRECACHE_ASSETS) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('[SW] Could not cache:', url, e.message);
        }
      }
      console.log('[SW] Pre-cache complete');
    })
  );
});

// ─── ACTIVATE ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH STRATEGY ───────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except CDN)
  if (request.method !== 'GET') return;

  // API calls: Network first → cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstAPI(request));
    return;
  }

  // Static assets: Cache first → network fallback
  if (
    url.pathname.startsWith('/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/sw.js'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // CDN fonts/icons: Cache first (they never change)
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net')
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Main page navigation: Network first → offline page
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }
});

// ─── STRATEGIES ───────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('Offline — asset not available', { status: 503 });
  }
}

async function networkFirstAPI(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful API responses for offline fallback
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // Offline → serve cached API response if available
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ success: false, offline: true, error: 'You are offline. Please check your connection.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // Serve cached page when offline
    const cached = await caches.match('/');
    if (cached) return cached;
    return new Response(offlinePage(), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// ─── OFFLINE FALLBACK PAGE ─────────────────────────────
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MyDoctor's — Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #0052CC, #00C9A7);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      color: white; text-align: center; padding: 24px;
    }
    .card {
      background: rgba(255,255,255,0.12); backdrop-filter: blur(16px);
      border-radius: 24px; padding: 48px 32px; max-width: 360px; width: 100%;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { font-size: 1.8rem; font-weight: 800; margin-bottom: 12px; }
    p { opacity: 0.85; margin-bottom: 28px; line-height: 1.6; font-size: 0.95rem; }
    button {
      background: white; color: #0052CC; border: none; padding: 14px 32px;
      border-radius: 50px; font-size: 1rem; font-weight: 700; cursor: pointer;
      transition: transform 0.2s;
    }
    button:active { transform: scale(0.97); }
    .tips { margin-top: 28px; font-size: 0.8rem; opacity: 0.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🏥</div>
    <h1>You're Offline</h1>
    <p>MyDoctor's needs an internet connection to load your health data and connect with doctors.</p>
    <button onclick="location.reload()">Try Again</button>
    <div class="tips">Tip: Previously visited pages may still be available.</div>
  </div>
</body>
</html>`;
}

// ─── PUSH NOTIFICATIONS ────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || "MyDoctor's";
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: data.actions || [],
    tag: data.tag || 'mydoctors-notification',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ─── BACKGROUND SYNC ──────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments());
  }
});

async function syncAppointments() {
  console.log('[SW] Background sync: appointments');
  // Notify all clients to refresh appointment data
  const clients_list = await clients.matchAll();
  clients_list.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETE', data: 'appointments' });
  });
}

console.log('[SW] MyDoctor\'s Service Worker v3 loaded');
