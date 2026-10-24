// Service Worker cho PWA "Sổ Sức Khỏe Bố" (v4 — Tích hợp Thông Báo Đẩy PWA)
// Chiến lược: LUÔN ƯU TIÊN MẠNG (Network-Only với cache: 'no-store' cho HTML/trang)
// Hỗ trợ tự động cập nhật mã nguồn tức thì (Skip Waiting & Auto Controller Claim)
// và hiển thị Thông báo đẩy (Web Push / Local PWA Notification) trên màn hình điện thoại.

const CACHE_NAME = 'so-suc-khoe-bo-pwa-v4';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Hỗ trợ bắn thông báo từ giao diện PWA qua Service Worker
  if (event.data.type === 'SHOW_NOTIFICATION' && event.data.payload) {
    const { title, options } = event.data.payload;
    if (title && self.registration && typeof self.registration.showNotification === 'function') {
      event.waitUntil(self.registration.showNotification(title, options || {}));
    }
  }
});

// Hỗ trợ nhận sự kiện Push chuẩn từ máy chủ (Web Push API)
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Sổ Sức Khỏe Bố',
    body: 'Có cập nhật hoặc nhắc việc chăm sóc mới trong ngày.',
    url: '/#section-routine',
    urgent: false,
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const options = {
    body: payload.body,
    icon: '/icon-192',
    badge: '/icon-192',
    tag: payload.tag || 'so-suc-khoe-push',
    renotify: true,
    requireInteraction: Boolean(payload.urgent),
    vibrate: payload.urgent ? [300, 120, 300, 120, 400] : [200, 100, 200],
    data: {
      url: payload.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

// Khi người dùng bấm vào thông báo trên màn hình khóa / thanh trạng thái điện thoại
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (targetUrl && 'navigate' in client) {
            try {
              client.postMessage({ type: 'NAVIGATE_TO_SECTION', url: targetUrl });
            } catch {
              // ignore
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Bỏ qua các request không phải GET hoặc request Server Actions / API
  if (event.request.method !== 'GET') {
    return;
  }

  // Với request điều hướng trang (document/HTML), luôn lấy bản mới nhất từ mạng (no-store)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Luôn lấy trực tiếp từ mạng để dữ liệu và mã nguồn luôn mới nhất
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
