/*
 * Kill switch for the retired Flutter admin build's service worker.
 *
 * The admin site used to be a Flutter web build, which registered a service
 * worker at exactly this path. That worker caches index.html and the Dart
 * bundle and serves them from cache, so an admin who used the old panel keeps
 * being handed it even after the React build is live — and because the worker
 * answers the navigation from cache, the unregister snippet in index.html never
 * gets a chance to run.
 *
 * Deleting the file is not enough here: CloudFront maps 404 to /index.html with
 * a 200, so this path would answer with HTML. A service-worker update whose
 * script has a non-JavaScript MIME type is rejected, leaving the old worker
 * registered and in charge indefinitely.
 *
 * So the path keeps serving a real script — this one. The browser accepts it as
 * an update, it takes over immediately, drops every cache the old worker left
 * behind, unregisters itself, and reloads any open tab into the React app.
 *
 * Keep this file until it is safe to assume no browser still holds the Flutter
 * worker. It is inert for anyone who never had it.
 */

self.addEventListener('install', () => {
  // Don't wait for existing tabs to close — the point is to replace the old
  // worker now.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
      } catch {
        // A blocked or unavailable CacheStorage must not stop the unregister.
      }

      await self.registration.unregister();

      // Reload open tabs so they leave the cached Flutter app behind. Any tab
      // opened after this point gets the React build directly.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        if ('navigate' in client) client.navigate(client.url);
      }
    })(),
  );
});

// Never serve anything from cache while this worker is alive.
self.addEventListener('fetch', () => {});
