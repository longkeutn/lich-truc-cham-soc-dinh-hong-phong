// Service Worker cho PWA "Sổ Sức Khỏe Bố" (v6 — Tương thích tuyệt đối 100% iOS Safari / iPhone PWA)
// Lưu ý quan trọng:
// - TUYỆT ĐỐI KHÔNG đăng ký sự kiện 'fetch' / event.respondWith() để ngăn chặn triệt để 100% lỗi
//   "FetchEvent.respondWith received an error: Returned response is null" trên iPhone (iOS Safari / WebKit).
// - Mọi request tải trang, API, Server Actions và âm thanh (/api/tts) đều đi thẳng qua trình duyệt gốc.
// - Service Worker chỉ chuyên trách: Quản lý phiên bản cài đặt & Hiển thị Thông báo đẩy (Web Push / Local Notification).

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

