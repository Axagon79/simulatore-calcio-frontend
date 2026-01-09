const CACHE_NAME = 'ai-simulator-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Installazione del service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache aperta');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('⚠️ Errore durante il caching:', error);
      })
  );
  self.skipWaiting();
});

// Attivazione del service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Rimozione cache vecchia:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Gestione delle richieste con strategia Network First
self.addEventListener('fetch', (event) => {
  // Ignora richieste non-GET e richieste API
  if (event.request.method !== 'GET' || 
      event.request.url.includes('/api/') ||
      event.request.url.includes('api-6b34yfzjia-uc.a.run.app')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clona la risposta perché può essere usata solo una volta
        const responseToCache = response.clone();
        
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        
        return response;
      })
      .catch(() => {
        // Se il network fallisce, prova dalla cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // Se non c'è in cache, ritorna una pagina offline
            return caches.match('/index.html');
          });
      })
  );
});

// Gestione messaggi dal client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
