// Service Worker for foot detection assets caching and offline support
const CACHE_NAME = 'chrono-stride-ar-v1';
const MODEL_CACHE_NAME = 'chrono-stride-models-v1';
const API_CACHE_NAME = 'chrono-stride-api-v1';

// Critical assets to cache immediately
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/lib/detection/manager.ts',
  '/lib/detection/engines/webarrocks-enhanced.ts',
  '/lib/optimization/mobile-optimizer.ts',
  '/lib/monitoring/performance-monitor.ts'
];

// Model files to cache
const MODEL_ASSETS = [
  '/models/neuralNets/NN_FOOT_23.json',
  '/models/neuralNets/NN_BAREFOOT_3.json',
  '/models/web-ar-rocks/WebARRocksHand.js'
];

// Cache strategies
const CACHE_STRATEGIES = {
  'static': {
    cacheName: CACHE_NAME,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 100
  },
  'models': {
    cacheName: MODEL_CACHE_NAME,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxEntries: 50
  },
  'api': {
    cacheName: API_CACHE_NAME,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 20
  }
};

// Install event - cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      cacheCriticalAssets(),
      cacheModelAssets()
    ]).then(() => {
      console.log('[SW] Installation complete');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      cleanOldCaches(),
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activation complete');
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (url.pathname.includes('/models/')) {
    event.respondWith(handleModelRequest(request));
  } else if (url.pathname.includes('/api/')) {
    event.respondWith(handleAPIRequest(request));
  } else if (request.destination === 'image' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handleGenericRequest(request));
  }
});

// Message event - handle communication from main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'CACHE_MODELS':
      cacheModelAssets().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'CLEAR_CACHE':
      clearCache(data.cacheName).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
      
    case 'PRELOAD_ASSET':
      preloadAsset(data.url).then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

// Cache critical assets
async function cacheCriticalAssets() {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    await cache.addAll(CRITICAL_ASSETS);
    console.log('[SW] Critical assets cached');
  } catch (error) {
    console.warn('[SW] Failed to cache some critical assets:', error);
  }
}

// Cache model assets
async function cacheModelAssets() {
  const cache = await caches.open(MODEL_CACHE_NAME);
  
  try {
    // Fetch and cache model files with progress tracking
    for (const asset of MODEL_ASSETS) {
      try {
        const response = await fetch(asset);
        if (response.ok) {
          await cache.put(asset, response);
          console.log(`[SW] Cached model: ${asset}`);
        }
      } catch (error) {
        console.warn(`[SW] Failed to cache model ${asset}:`, error);
      }
    }
    
    console.log('[SW] Model assets caching complete');
  } catch (error) {
    console.warn('[SW] Failed to cache model assets:', error);
  }
}

// Handle model requests with network-first strategy
async function handleModelRequest(request) {
  const cache = await caches.open(MODEL_CACHE_NAME);
  
  try {
    // Try network first for fresh models
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the fresh response
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.warn('[SW] Network request failed for model:', error);
  }
  
  // Fallback to cache
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Serving model from cache:', request.url);
    return cachedResponse;
  }
  
  // If both fail, return error
  return new Response('Model not available', { status: 503 });
}

// Handle API requests with cache-first strategy
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  // Check cache first
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Check if cache is still fresh
    const cachedDate = new Date(cachedResponse.headers.get('date') || '');
    const isFresh = Date.now() - cachedDate.getTime() < CACHE_STRATEGIES.api.maxAge;
    
    if (isFresh) {
      console.log('[SW] Serving API from cache:', request.url);
      return cachedResponse;
    }
  }
  
  // Fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.warn('[SW] API request failed:', error);
  }
  
  // Fallback to stale cache if available
  if (cachedResponse) {
    console.log('[SW] Serving stale API cache:', request.url);
    return cachedResponse;
  }
  
  return new Response('API unavailable', { status: 503 });
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Check cache first
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.warn('[SW] Static asset request failed:', error);
  }
  
  return new Response('Asset not available', { status: 503 });
}

// Handle generic requests
async function handleGenericRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.warn('[SW] Generic request failed:', error);
    return new Response('Request failed', { status: 503 });
  }
}

// Clean up old caches
async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  
  const cachesToDelete = cacheNames.filter(cacheName => {
    return ![
      CACHE_NAME,
      MODEL_CACHE_NAME,
      API_CACHE_NAME
    ].includes(cacheName);
  });
  
  await Promise.all(
    cachesToDelete.map(cacheName => caches.delete(cacheName))
  );
  
  console.log('[SW] Cleaned up old caches:', cachesToDelete);
}

// Clear specific cache
async function clearCache(cacheName) {
  await caches.delete(cacheName);
  console.log(`[SW] Cleared cache: ${cacheName}`);
}

// Get cache status
async function getCacheStatus() {
  const cacheNames = [CACHE_NAME, MODEL_CACHE_NAME, API_CACHE_NAME];
  const status = {};
  
  for (const cacheName of cacheNames) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      let totalSize = 0;
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
      
      status[cacheName] = {
        entries: keys.length,
        size: totalSize,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`[SW] Failed to get status for ${cacheName}:`, error);
    }
  }
  
  return status;
}

// Preload specific asset
async function preloadAsset(url) {
  try {
    const response = await fetch(url);
    
    if (response.ok) {
      // Determine which cache to use
      let cacheName = CACHE_NAME;
      
      if (url.includes('/models/')) {
        cacheName = MODEL_CACHE_NAME;
      } else if (url.includes('/api/')) {
        cacheName = API_CACHE_NAME;
      }
      
      const cache = await caches.open(cacheName);
      await cache.put(url, response);
      
      console.log(`[SW] Preloaded asset: ${url}`);
    }
  } catch (error) {
    console.warn(`[SW] Failed to preload asset ${url}:`, error);
  }
}

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-models') {
    event.waitUntil(syncModels());
  }
});

async function syncModels() {
  console.log('[SW] Syncing models in background');
  
  try {
    // Check for model updates
    for (const modelUrl of MODEL_ASSETS) {
      const response = await fetch(modelUrl, { method: 'HEAD' });
      
      if (response.ok) {
        const lastModified = response.headers.get('last-modified');
        
        // Check if model needs updating
        const cache = await caches.open(MODEL_CACHE_NAME);
        const cachedResponse = await cache.match(modelUrl);
        
        if (cachedResponse) {
          const cachedLastModified = cachedResponse.headers.get('last-modified');
          
          if (lastModified !== cachedLastModified) {
            // Update cached model
            const freshResponse = await fetch(modelUrl);
            if (freshResponse.ok) {
              await cache.put(modelUrl, freshResponse);
              console.log(`[SW] Updated model: ${modelUrl}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('[SW] Model sync failed:', error);
  }
}

// Export for use in main thread
export {};