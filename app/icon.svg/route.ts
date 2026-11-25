import { NextResponse } from 'next/server';
import { APP_ICON_CONFIG, IS_YOUNG_FAMILY_MODE, IS_FAMILY_STANDARD_MODE } from '@/lib/config';

export const runtime = 'edge';

export async function GET() {
  const { gradientStart, gradientEnd, primaryColor } = APP_ICON_CONFIG;

  let symbolSvg = '';

  if (IS_YOUNG_FAMILY_MODE) {
    // Biểu tượng Mái ấm Gia đình (House + Heart) - Xanh Lam
    symbolSvg = `
  <!-- Mái nhà & Thân nhà tổ ấm màu trắng -->
  <path
    d="M256 120 L116 238 C110 243 114 253 122 253 H156 V392 C156 401 163 408 172 408 H340 C349 408 356 401 356 392 V253 H390 C398 253 402 243 396 238 Z"
    fill="#ffffff"
  />
  <!-- Trái tim yêu thương & sức khỏe ở trung tâm ngôi nhà -->
  <path
    d="M256 348 C256 348 200 308 184 274 C172 250 188 226 214 224 C230 222 244 232 256 244 C268 232 282 222 298 224 C324 226 340 250 328 274 C312 308 256 348 256 348 Z"
    fill="${primaryColor}"
  />
  <!-- Ống khói nhỏ ấm cúng -->
  <path
    d="M320 176 V148 C320 144 324 140 328 140 H344 C348 140 352 144 352 148 V203 L320 176 Z"
    fill="#ffffff"
    opacity="0.9"
  />`;
  } else if (IS_FAMILY_STANDARD_MODE) {
    // Biểu tượng Khiên bảo hộ Sức khỏe & Thảo mộc trường thọ (Shield + Cross + Sprouts) - Xanh Ngọc
    symbolSvg = `
  <!-- Khiên bảo hộ sức khỏe song thân màu trắng -->
  <path
    d="M256 112 C256 112 376 138 382 148 C388 272 342 360 256 414 C170 360 124 272 130 148 C136 138 256 112 256 112 Z"
    fill="#ffffff"
  />
  <!-- Chữ thập Y tế & Mầm sống dưỡng sinh màu Xanh Ngọc -->
  <path
    d="M236 198 C236 190 242 184 250 184 H262 C270 184 276 190 276 198 V236 H314 C322 236 328 242 328 250 V262 C328 270 322 276 314 276 H276 V314 C276 322 270 328 262 328 H250 C242 328 236 322 236 314 V276 H198 C190 276 184 270 184 262 V250 C184 242 190 236 198 236 H236 Z"
    fill="${primaryColor}"
  />
  <!-- Điểm nhấn thảo mộc trường thọ -->
  <circle cx="210" cy="326" r="14" fill="${primaryColor}" opacity="0.85" />
  <circle cx="302" cy="326" r="14" fill="${primaryColor}" opacity="0.85" />`;
  } else {
    // Biểu tượng Bố Đinh Hồng Phong: Trái tim phục hồi + Điện tim ECG - Đỏ Rose
    symbolSvg = `
  <path
    d="M256 410s-134-83.5-166-168c-22-58 14-122 76-128 38-3.5 70 18 90 46 20-28 52-49.5 90-46 62 6 98 70 76 128-32 84.5-166 168-166 168z"
    fill="#ffffff"
  />
  <path
    d="M148 246h58l22-48 34 98 28-68 18 18h56"
    fill="none"
    stroke="${primaryColor}"
    stroke-width="20"
    stroke-linecap="round"
    stroke-linejoin="round"
  />`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gradientStart}" />
      <stop offset="100%" stop-color="${gradientEnd}" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#bg)" />
  <circle cx="256" cy="256" r="196" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="8" />
  ${symbolSvg}
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
