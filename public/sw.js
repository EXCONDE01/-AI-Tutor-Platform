// Service Worker for AI Tutor PWA
// Cache-first for static assets, network-first for API routes, offline fallback
// Enhanced with background sync for offline message queue

const CACHE_NAME = 'ai-tutor-v1';
const STATIC_CACHE = 'ai-tutor-static-v1';
const NAVIGATION_CACHE = 'ai-tutor-nav-v1';
const API_CACHE = 'ai-tutor-api-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Skip caching for Next.js build artifacts and HMR
const SKIP_CACHE_PATTERNS = [
  /\/_next\/.*/,
  /\.hot-update\./,
  /webpack-hmr/,
  /__webpack_hmr/,
];

function shouldSkipCache(url) {
  return SKIP_CACHE_PATTERNS.some(function (pattern) {
    return pattern.test(url.pathname + url.search);
  });
}

// Check if URL is an API route
function isApiRoute(url) {
  return url.pathname.startsWith('/api/');
}

// Check if URL is a static asset
function isStaticAsset(request, url) {
  return (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|css|js)$/)
  );
}

// Install event - precache static assets
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      var cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(function (name) {
            return name !== STATIC_CACHE && name !== NAVIGATION_CACHE && name !== API_CACHE;
          })
          .map(function (name) {
            return caches.delete(name);
          })
      );

      self.clients.claim();
    })()
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip Next.js build artifacts and HMR
  if (shouldSkipCache(url)) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          if (response.ok) {
            var responseClone = response.clone();
            caches.open(NAVIGATION_CACHE).then(function (cache) {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(function () {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Handle API routes - network-first with cache fallback
  if (isApiRoute(url)) {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          // Only cache successful GET responses
          if (response.ok && request.method === 'GET') {
            var responseClone = response.clone();
            caches.open(API_CACHE).then(function (cache) {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(function () {
          // Return cached response if available
          return caches.match(request);
        })
    );
    return;
  }

  // Handle static assets - cache-first
  if (isStaticAsset(request, url)) {
    event.respondWith(
      caches.match(request).then(function (cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then(function (response) {
          if (response.ok) {
            var responseClone = response.clone();
            caches.open(STATIC_CACHE).then(function (cache) {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // For JS/CSS chunks, always go network-first
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response.ok) {
          var responseClone = response.clone();
          caches.open(STATIC_CACHE).then(function (cache) {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(function () {
        return caches.match(request);
      })
    );
    return;
  }

  // Default: network first with cache fallback
  event.respondWith(
    fetch(request).catch(function () {
      return caches.match(request);
    })
  );
});

// Handle push notifications
self.addEventListener('push', function (event) {
  if (!event.data) return;

  var data = event.data.json();
  var options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  if (event.action) {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Allow clients to tell SW to skip waiting and take control
self.addEventListener('message', function (event) {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// ============================================
// BACKGROUND SYNC FOR OFFLINE MESSAGE QUEUE
// ============================================

// IndexedDB access from Service Worker
const DB_NAME = 'ai-tutor-push-queue';
const DB_VERSION = 1;
const STORE_NAME = 'queue';

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-timestamp', 'timestamp');
      }
    };
  });
}

function getPendingQueueItems(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('by-status');
    const request = index.getAll('pending');
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function updateQueueItem(db, item) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(item);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteQueueItem(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Exponential backoff calculation
function calculateBackoff(retryCount) {
  // Base delay: 1 second, max: 5 minutes
  const baseDelay = 1000;
  const maxDelay = 5 * 60 * 1000;
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  // Add jitter (±25%)
  return delay * (0.75 + Math.random() * 0.5);
}

// Process a single queue item
async function processQueueItem(item) {
  try {
    const response = await fetch('/api/push/queue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ items: [item] }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    const itemResult = result.results?.[0];
    
    if (itemResult?.success) {
      return { success: true };
    } else {
      throw new Error(itemResult?.error || 'Processing failed');
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Background sync handler for 'sync-messages' tag
async function syncMessages() {
  console.log('[SW] Background sync: sync-messages triggered');
  
  let db;
  try {
    db = await openQueueDB();
  } catch (error) {
    console.error('[SW] Failed to open IndexedDB:', error);
    return;
  }

  let pendingItems;
  try {
    pendingItems = await getPendingQueueItems(db);
  } catch (error) {
    console.error('[SW] Failed to get pending queue items:', error);
    return;
  }

  if (!pendingItems || pendingItems.length === 0) {
    console.log('[SW] No pending messages to sync');
    return;
  }

  console.log(`[SW] Found ${pendingItems.length} pending messages to sync`);

  // Process items sequentially to avoid overwhelming the server
  for (const item of pendingItems) {
    // Check if we should retry based on retry count and backoff
    const now = Date.now();
    const lastAttempt = item.timestamp + (item.retryCount > 0 ? calculateBackoff(item.retryCount - 1) : 0);
    
    // If we've attempted recently, wait for backoff
    if (item.retryCount > 0 && now < lastAttempt) {
      console.log(`[SW] Skipping item ${item.id}, waiting for backoff`);
      continue;
    }

    // Increment retry count before attempting
    item.retryCount += 1;
    await updateQueueItem(db, item);

    console.log(`[SW] Processing queue item ${item.id} (attempt ${item.retryCount})`);

    const result = await processQueueItem(item);

    if (result.success) {
      console.log(`[SW] Successfully processed item ${item.id}`);
      item.status = 'sent';
      await updateQueueItem(db, item);
      
      // Notify clients that message was sent
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach(client => {
        client.postMessage({
          type: 'queue-item-sent',
          itemId: item.id,
        });
      });
    } else {
      console.warn(`[SW] Failed to process item ${item.id}:`, result.error);
      item.status = 'pending'; // Keep as pending for retry
      await updateQueueItem(db, item);
      
      // Notify clients of failure
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach(client => {
        client.postMessage({
          type: 'queue-item-failed',
          itemId: item.id,
          error: result.error,
        });
      });
    }
  }

  console.log('[SW] Background sync completed');
}

// Handle background sync event
self.addEventListener('sync', function (event) {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'sync-sessions') {
    event.waitUntil(syncSessions());
  }
});

async function syncSessions() {
  console.log('Background sync: syncing sessions');
}

// Handle periodic sync if available (requires periodic-background-sync permission)
self.addEventListener('periodicsync', function (event) {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});