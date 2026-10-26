'use client';

import React from 'react';

export type TodaySectionKey = 'vitals' | 'routine' | 'appointment';

/** Bảng màu nhận diện cố định cho 3 phần của trang "Việc Hôm Nay" */
export const SECTION_THEME: Record<
  TodaySectionKey,
  {
    num: string;
    icon: string;
    title: string;
    shortTitle: string;
    bannerBg: string;
    cardBorder: string;
    cardBg: string;
    navActive: string;
    navIdle: string;
    statusPill: string;
  }
> = {
  vitals: {
    num: '1',
    icon: '❤️',
    title: 'ĐO HUYẾT ÁP',
    shortTitle: 'Huyết áp',
    bannerBg: 'bg-gradient-to-r from-rose-600 to-rose-500',
    cardBorder: 'border-l-[6px] border-l-rose-500 border-y border-r border-rose-200',
    cardBg: 'bg-rose-50/40',
    navActive: 'bg-rose-600 text-white border-rose-700 shadow-md',
    navIdle: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100',
    statusPill: 'bg-white text-rose-700',
  },
  routine: {
    num: '2',
    icon: '💊',
    title: 'UỐNG THUỐC & TẬP',
    shortTitle: 'Thuốc & Tập',
    bannerBg: 'bg-gradient-to-r from-emerald-600 to-emerald-500',
    cardBorder: 'border-l-[6px] border-l-emerald-500 border-y border-r border-emerald-200',
    cardBg: 'bg-emerald-50/40',
    navActive: 'bg-emerald-600 text-white border-emerald-700 shadow-md',
    navIdle: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
    statusPill: 'bg-white text-emerald-700',
  },
  appointment: {
    num: '3',
    icon: '📅',
    title: 'TÁI KHÁM & LỜI BÁC SĨ',
    shortTitle: 'Tái khám',
    bannerBg: 'bg-gradient-to-r from-blue-600 to-indigo-500',
    cardBorder: 'border-l-[6px] border-l-blue-500 border-y border-r border-blue-200',
    cardBg: 'bg-blue-50/40',
    navActive: 'bg-blue-600 text-white border-blue-700 shadow-md',
    navIdle: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100',
    statusPill: 'bg-white text-blue-700',
  },
};

interface SectionBannerProps {
  section: TodaySectionKey;
  subtitle: string;
  status?: string;
}

/** Biển hiệu to, màu đặc đặt trên mỗi phần để lướt nhanh vẫn nhận ra đang ở phần nào */
export default function SectionBanner({ section, subtitle, status }: SectionBannerProps) {
  const t = SECTION_THEME[section];
  return (
    <div
      className={`${t.bannerBg} text-white rounded-2xl px-3.5 py-3 sm:px-4 sm:py-3.5 flex items-center gap-3 shadow-md`}
    >
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/95 flex items-center justify-center shrink-0 shadow-sm">
        <span className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{t.num}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none" aria-hidden="true">
            {t.icon}
          </span>
          <h2 className="text-lg sm:text-xl font-black tracking-wide leading-tight">{t.title}</h2>
        </div>
        <p className="text-sm font-semibold text-white/95 mt-0.5 leading-snug">{subtitle}</p>
      </div>
      {status && (
        <span
          className={`${t.statusPill} shrink-0 max-w-[40%] text-right px-2.5 py-1.5 rounded-xl text-sm font-black leading-tight shadow-sm`}
        >
          {status}
        </span>
      )}
    </div>
  );
}
