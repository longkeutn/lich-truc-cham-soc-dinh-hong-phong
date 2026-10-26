'use client';

import React, { useEffect, useState } from 'react';
import { SECTION_THEME, TodaySectionKey } from './SectionBanner';

const SECTION_IDS: Record<TodaySectionKey, string> = {
  vitals: 'section-vitals',
  routine: 'section-routine',
  appointment: 'section-appointment',
};

const ORDER: TodaySectionKey[] = ['vitals', 'routine', 'appointment'];

interface SectionNavBarProps {
  /** Dòng chữ nhỏ bên dưới tên phần (vd: "120/80 • ♥70", "3/8 xong", "28/10") */
  hints: Record<TodaySectionKey, string>;
  /** Chỉ theo dõi khi tab "Việc hôm nay" đang hiển thị */
  enabled: boolean;
}

/** Thanh 3 nút lớn dính dưới Header; nút của phần đang xem được tô đặc màu */
export default function SectionNavBar({ hints, enabled }: SectionNavBarProps) {
  const [active, setActive] = useState<TodaySectionKey>('vitals');

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const onScroll = () => {
      // Phần đang xem = phần cuối cùng có đỉnh nằm phía trên đường mốc (~35% chiều cao màn hình)
      const marker = window.innerHeight * 0.35;
      let current: TodaySectionKey = 'vitals';
      for (const key of ORDER) {
        const el = document.getElementById(SECTION_IDS[key]);
        if (el && el.getBoundingClientRect().top <= marker) {
          current = key;
        }
      }
      // Cuộn tới cuối trang thì luôn coi là phần cuối
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        current = 'appointment';
      }
      setActive(current);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [enabled]);

  const goTo = (key: TodaySectionKey) => {
    const el = document.getElementById(SECTION_IDS[key]);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(key);
    }
  };

  return (
    <nav
      aria-label="Chuyển nhanh giữa 3 phần"
      className="sticky top-[57px] sm:top-[65px] z-20 -mx-2.5 sm:-mx-4 px-2.5 sm:px-4 py-2 bg-slate-50/95 backdrop-blur-md border-b border-slate-200"
    >
      <div className="grid grid-cols-3 gap-2">
        {ORDER.map((key) => {
          const t = SECTION_THEME[key];
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => goTo(key)}
              aria-current={isActive ? 'true' : undefined}
              className={`rounded-xl border-2 px-2 py-1.5 min-h-[56px] flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-95 ${
                isActive ? t.navActive : t.navIdle
              }`}
            >
              <span className="text-sm sm:text-base font-black leading-tight">
                <span className="text-xl align-middle mr-1" aria-hidden="true">
                  {t.icon}
                </span>
                {t.num}. {t.shortTitle}
              </span>
              <span
                className={`text-xs font-bold leading-tight truncate max-w-full ${
                  isActive ? 'text-white/95' : 'opacity-80'
                }`}
              >
                {hints[key]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
