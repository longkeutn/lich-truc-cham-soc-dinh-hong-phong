// Service Worker cho PWA "Sổ Sức Khỏe Bố" (v3)
// Chiến lược: LUÔN ƯU TIÊN MẠNG (Network-Only với cache: 'no-store' cho HTML/trang)
// Hỗ trợ tự động cập nhật mã nguồn tức thì (Skip Waiting & Auto Controller Claim)
// để khi người dùng treo PWA nhiều ngày mà không tắt app, ứng dụng vẫn tự động nạp code mới nhất.

const CACHE_NAME = 'so-suc-khoe-bo-pwa-v3';

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
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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
