// ============================================================
// 漢字 · HSK Flashcards — Service Worker
// Provides full offline support by caching the app shell and
// all assets on first load, then serving from cache thereafter.
// Version bump CACHE_NAME to force a refresh after updates.
// ============================================================

const CACHE_NAME = 'hsk-flashcards-v11';

// Core app shell — cached immediately on install
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './data/decks.json',
  './data/hsk1.json',
  './data/hsk2.json',
  './data/hsk3.json',
  './data/hsk4.json',
  './data/hsk5.json',
  './data/hsk6.json',
  './data/sentences.json',
];

// ── Install: pre-cache the app shell ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())  // activate immediately
  );
});

// ── Activate: delete stale caches ─────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first with network fallback ──────────────────
// Strategy:
//   1. Return from cache if available (fast, works offline)
//   2. Otherwise fetch from network and store in cache
//   3. Google Fonts / CDN requests: network-first, cache on success
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and browser-extension URLs
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Google Fonts / CDN assets / Supabase: network-first, cache as fallback
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('jsdelivr.net') ||
      url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => cached); // return stale cache if network fails
    })
  );
});
