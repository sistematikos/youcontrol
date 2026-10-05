const CACHE_NAME = 'youcontrol-cache-v4';

// Lista de archivos estáticos a almacenar en caché
const urlsToCache = [
  './index.html',
  './sys_v1_menu.html',
  './manifest.json',
  './img/logo.png' // <-- Ruta corregida según tu manifest.json
];

// 1. INSTALACIÓN
self.addEventListener('install', event => {
  self.skipWaiting(); // Fuerza la activación inmediata del nuevo SW
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Intentamos precargar los archivos clave
      return cache.addAll(urlsToCache).catch(err => {
        console.error('Error al precargar archivos en la caché:', err);
      });
    })
  );
});

// 2. ACTIVACIÓN (Limpia cachés antiguas)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim()) // Toma control de los clientes inmediatamente
  );
});

// 3. INTERCEPTOR FETCH (Garantiza instalabilidad PWA)
self.addEventListener('fetch', event => {
  // Ignorar peticiones que no sean GET (como escrituras de Firestore) o esquemas externos no HTTP/HTTPS
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Si no está en caché, lo busca en la red
      return fetch(event.request).catch(() => {
        // Opcional: Fallback de red si falla la conexión
        console.warn('Fallo de red al intentar obtener:', event.request.url);
      });
    })
  );
});
