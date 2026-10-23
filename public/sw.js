// Service Worker cho PWA "Sổ Sức Khỏe Bố" (v2)
// Chiến lược: LUÔN ƯU TIÊN MẠNG (Network-Only với cache: 'no-store' cho HTML/trang) để tránh hiển thị nhầm trang/dữ liệu cũ khi mở lại PWA sau nhiều ngày,
// đảm bảo 100% dữ liệu và ngày giờ hiển thị luôn khớp thời gian thực với Google Sheets.

const CACHE_NAME = 'so-suc-khoe-bo-pwa-v2';

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

self.addEventListener('fetch', (event) => {
  // Bỏ qua các request không phải GET hoặc request Server Actions / API
  if (event.request.method !== 'GET') {
    return;
  }

  // Với request điều hướng trang (document), ép buộc lấy bản mới nhất từ mạng (no-store)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Luôn lấy trực tiếp từ mạng để đảm bảo dữ liệu Google Sheets luôn mới nhất
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
