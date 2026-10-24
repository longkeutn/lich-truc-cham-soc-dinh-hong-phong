// Service Worker cho PWA "Sổ Sức Khỏe Bố" (v5 — Tương thích 100% iOS Safari / WebKit & Thông Báo Đẩy PWA)
// Chiến lược:
// - Chỉ can thiệp điều hướng trang chính (mode === 'navigate') với Network-First an toàn (không truyền RequestInit vào Request có mode 'navigate' để tránh lỗi TypeError trên WebKit/iPhone).
// - Luôn có cache dự phòng + HTML fallback hợp lệ (không bao giờ trả về null/undefined cho event.respondWith).
// - Không can thiệp vào các request API (/api/tts, Server Actions), Audio Range request hay tài nguyên tĩnh để trình duyệt xử lý gốc.

const CACHE_NAME = 'so-suc-khoe-bo-pwa-v5';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
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
  // Chỉ xử lý request điều hướng trang HTML (navigate) bằng GET.
  // Để trình duyệt tự xử lý gốc toàn bộ tài nguyên tĩnh (_next/static), RSC, API (/api/tts Audio Range trên iOS) và POST Server Actions.
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Quan trọng trên iOS Safari / WebKit:
        // Không truyền tham số thứ 2 (như { cache: 'no-store' }) khi tham số đầu là Request có mode === 'navigate'
        // vì đặc tả WHATWG Fetch trên WebKit sẽ ném TypeError ngay lập tức.
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.ok) {
          try {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone()).catch(() => {});
          } catch {
            // ignore cache error
          }
        }
        if (networkResponse) {
          return networkResponse;
        }
      } catch {
        // Khi mất mạng hoặc kết nối chập chờn -> chuyển sang lấy từ bộ nhớ đệm
      }

      try {
        const cachedResponse =
          (await caches.match(event.request)) || (await caches.match('/'));
        if (cachedResponse) {
          return cachedResponse;
        }
      } catch {
        // ignore cache match error
      }

      // Luôn trả về một đối tượng Response hợp lệ (không bao giờ trả về null/undefined)
      // để ngăn chặn triệt để lỗi "FetchEvent.respondWith received an error: Returned response is null" trên iPhone.
      return new Response(
        '<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sổ Sức Khỏe Bố</title></head><body style="font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center;background:#f8fafc;color:#0f172a;"><h2 style="margin-top:40px;color:#0f766e;">Không thể kết nối mạng</h2><p style="color:#475569;line-height:1.5;">Vui lòng kiểm tra kết nối Wi-Fi hoặc 4G/5G trên điện thoại rồi bấm tải lại trang.</p><button onclick="location.reload()" style="margin-top:16px;padding:12px 24px;background:#0f766e;color:#fff;border:none;border-radius:12px;font-weight:700;font-size:15px;">Tải lại ứng dụng</button></body></html>',
        {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    })()
  );
});
