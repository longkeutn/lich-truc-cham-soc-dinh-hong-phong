// Service Worker cho PWA "Sổ Sức Khỏe Bố"
// Chiến lược: LUÔN ƯU TIÊN MẠNG (Network-Only cho dữ liệu & trang) để tránh hiển thị nhầm dữ liệu cũ trên trình duyệt,
// đảm bảo 100% dữ liệu hiển thị luôn khớp thời gian thực với Google Sheets.

const CACHE_NAME = 'so-suc-khoe-bo-pwa-v1';

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

  // Luôn lấy trực tiếp từ mạng để đảm bảo dữ liệu Google Sheets luôn mới nhất
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
