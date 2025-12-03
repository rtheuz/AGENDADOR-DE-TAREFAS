/**
 * Service Worker - TaskScheduler Pro
 * Advanced caching and offline support
 */

const CACHE_VERSION = 'v3.0.1';
const STATIC_CACHE = `taskscheduler-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `taskscheduler-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `taskscheduler-images-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/notifications.js',
    './manifest.json',
    './icons/icon-72x72.png',
    './icons/icon-96x96. png',
    './icons/icon-128x128.png',
    './icons/icon-144x144.png',
    './icons/icon-152x152.png',
    './icons/icon-192x192.png',
    './icons/icon-384x384.png',
    './icons/icon-512x512.png'
];

const CACHE_LIMITS = {
    [DYNAMIC_CACHE]: 50,
    [IMAGE_CACHE]: 30
};

// Install
self.addEventListener('install', event => {
    console.log('[SW] Installing', CACHE_VERSION);
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache. addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(error => console.error('[SW] Install failed:', error))
    );
});

// Activate
self.addEventListener('activate', event => {
    console.log('[SW] Activating', CACHE_VERSION);
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise. all(
                    cacheNames
                        .filter(cacheName => {
                            return cacheName.startsWith('taskscheduler-') &&
                                   cacheName !== STATIC_CACHE &&
                                   cacheName !== DYNAMIC_CACHE &&
                                   cacheName !== IMAGE_CACHE;
                        })
                        .map(cacheName => {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            . then(() => self.clients.claim())
    );
});

// Fetch
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    if (request.method !== 'GET') return;
    if (! url.protocol.startsWith('http')) return;
    if (url.origin !== location.origin) return;
    
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
    } else if (isImage(url)) {
        event. respondWith(cacheFirst(request, IMAGE_CACHE));
    } else {
        event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    }
});

// Scheduled Notifications Storage
let scheduledNotifications = new Map();

// Check and trigger scheduled notifications
async function checkScheduledNotifications() {
    const now = new Date();
    
    // Load from IndexedDB
    try {
        const db = await openIndexedDB();
        if (!db) return;
        
        const notifications = await getAllNotifications(db);
        
        for (const notif of notifications) {
            const notificationTime = new Date(notif.notificationTime);
            
            if (notificationTime <= now && !notif.triggered) {
                // Time to show notification
                await self.registration.showNotification('⏰ Lembrete de Tarefa', {
                    body: `${notif.title} em ${notif.reminderMinutes} minutos!`,
                    icon: './icons/icon-192x192.png',
                    badge: './icons/icon-96x96.png',
                    tag: `reminder-${notif.taskId}`,
                    vibrate: [200, 100, 200],
                    requireInteraction: true,
                    data: { taskId: notif.taskId },
                    actions: [
                        { action: 'view', title: 'Ver Tarefa' },
                        { action: 'dismiss', title: 'Dispensar' }
                    ]
                });
                
                // Mark as triggered
                await markNotificationAsTriggered(db, notif.taskId);
            }
        }
    } catch (error) {
        console.error('[SW] Error checking scheduled notifications:', error);
    }
}

// IndexedDB helpers
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('TaskSchedulerDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('notifications')) {
                const store = db.createObjectStore('notifications', { keyPath: 'taskId' });
                store.createIndex('notificationTime', 'notificationTime', { unique: false });
            }
        };
    });
}

function getAllNotifications(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['notifications'], 'readonly');
        const store = transaction.objectStore('notifications');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function markNotificationAsTriggered(db, taskId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['notifications'], 'readwrite');
        const store = transaction.objectStore('notifications');
        const request = store.delete(taskId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Check notifications every minute
setInterval(checkScheduledNotifications, 60000);
// Initial check after 5 seconds
setTimeout(checkScheduledNotifications, 5000);

// Message handler for scheduling notifications
self.addEventListener('message', event => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { data } = event.data;
        
        // Store notification
        event.waitUntil(
            openIndexedDB().then(db => {
                if (!db) return;
                
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(['notifications'], 'readwrite');
                    const store = transaction.objectStore('notifications');
                    
                    // Delete old notification for this task
                    const deleteRequest = store.delete(data.taskId);
                    
                    deleteRequest.onsuccess = () => {
                        // Add new notification
                        const addRequest = store.add({
                            taskId: data.taskId,
                            title: data.title,
                            notificationTime: data.notificationTime,
                            reminderMinutes: data.reminderMinutes,
                            taskDateTime: data.taskDateTime,
                            triggered: false
                        });
                        
                        addRequest.onsuccess = () => {
                            console.log('[SW] Notification scheduled:', data.title);
                            resolve();
                        };
                        
                        addRequest.onerror = () => reject(addRequest.error);
                    };
                    
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                });
            }).catch(error => {
                console.error('[SW] Error scheduling notification:', error);
            })
        );
    }
    
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data.action === 'clearCache') {
        event.waitUntil(clearAllCaches());
    }
});

// Push Notifications
self.addEventListener('push', event => {
    console.log('[SW] Push notification received');
    
    let data = {
        title: 'Tarefas Bruna',
        body: 'Nova notificação',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-96x96.png',
        tag: 'notification'
    };
    
    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            console.error('[SW] Error parsing push data:', e);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: data.tag,
            vibrate: [200, 100, 200],
            data: data.data
        })
    );
});

// Notification Click
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification clicked');
    event.notification.close();
    
    const action = event.action;
    const taskId = event.notification.data?.taskId;
    
    if (action === 'dismiss') {
        return;
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                const url = './';
                
                // Try to focus existing window
                for (let client of clientList) {
                    if (client.url.includes(url) && 'focus' in client) {
                        client.focus();
                        // Send message to open task if taskId exists
                        if (taskId) {
                            client.postMessage({ type: 'OPEN_TASK', taskId: taskId });
                        }
                        return;
                    }
                }
                
                // Open new window if none exists
                if (clients.openWindow) {
                    return clients.openWindow(url).then(client => {
                        if (client && taskId) {
                            // Wait a bit for page to load, then send message
                            setTimeout(() => {
                                client.postMessage({ type: 'OPEN_TASK', taskId: taskId });
                            }, 1000);
                        }
                    });
                }
            })
    );
});

// Background Sync
self.addEventListener('sync', event => {
    console. log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-tasks') {
        event.waitUntil(syncTasks());
    }
});


// Helper Functions
function isStaticAsset(url) {
    return ['. css', '.js', '.woff', '.woff2', '. ttf']. some(ext => url.pathname.endsWith(ext));
}

function isImage(url) {
    return ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].some(ext => url.pathname.endsWith(ext));
}

async function cacheFirst(request, cacheName) {
    try {
        const cached = await caches.match(request);
        if (cached) return cached;
        
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
            await trimCache(cacheName);
        }
        return response;
    } catch (error) {
        console.error('[SW] Cache first failed:', error);
        return new Response('Offline', { status: 503 });
    }
}

async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches. open(cacheName);
            cache.put(request, response.clone());
            await trimCache(cacheName);
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        
        return new Response('Offline', { status: 503 });
    }
}

async function trimCache(cacheName) {
    const limit = CACHE_LIMITS[cacheName];
    if (! limit) return;
    
    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        if (keys.length > limit) {
            const deleteCount = keys.length - limit;
            for (let i = 0; i < deleteCount; i++) {
                await cache.delete(keys[i]);
            }
        }
    } catch (error) {
        console.error('[SW] Error trimming cache:', error);
    }
}

async function clearAllCaches() {
    const cacheNames = await caches. keys();
    return Promise.all(cacheNames.map(name => caches.delete(name)));
}

async function syncTasks() {
    console.log('[SW] Syncing tasks...');
    // Implement task sync logic
}

console.log('[SW] Service Worker loaded', CACHE_VERSION);