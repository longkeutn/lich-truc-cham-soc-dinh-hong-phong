'use client';

import React from 'react';

export type MedicalSkeletonVariant =
  | 'vitals-cards'
  | 'chart'
  | 'checklist'
  | 'lab-grid'
  | 'full-analytics';

export interface MedicalSkeletonLoaderProps {
  variant?: MedicalSkeletonVariant;
  label?: string;
  rows?: number;
  className?: string;
}

export function MedicalSkeletonLoader({
  variant = 'full-analytics',
  label = 'Đang tải dữ liệu sức khỏe gia đình...',
  rows = 4,
  className = '',
}: MedicalSkeletonLoaderProps) {
  const safeRows = Math.max(1, Math.min(rows, 8));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`space-y-4 ${className}`}
    >
      <span className="sr-only">{label}</span>

      {(variant === 'vitals-cards' || variant === 'full-analytics') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border-card bg-surface-card p-4 shadow-2xs space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-28 rounded-lg medical-shimmer-bg" />
                <div className="h-5 w-16 rounded-full medical-shimmer-bg" />
              </div>
              <div className="h-8 w-36 rounded-xl medical-shimmer-bg" />
              <div className="h-4 w-44 rounded-lg medical-shimmer-bg" />
            </div>
          ))}
        </div>
      )}

      {(variant === 'chart' || variant === 'full-analytics') && (
        <div className="rounded-2xl border border-border-card bg-surface-card p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="h-5 w-48 rounded-lg medical-shimmer-bg" />
            <div className="flex items-center gap-2">
              <div className="h-9 w-24 rounded-xl medical-shimmer-bg" />
              <div className="h-9 w-24 rounded-xl medical-shimmer-bg" />
            </div>
          </div>
          <div className="h-64 w-full rounded-2xl medical-shimmer-bg border border-slate-100 flex items-end justify-around px-6 pb-6 pt-12 gap-3">
            {[55, 72, 64, 80, 68, 74, 62].map((heightPct, idx) => (
              <div
                key={idx}
                className="w-full max-w-[36px] rounded-t-xl bg-white/65"
                style={{ height: `${heightPct}%` }}
              />
            ))}
          </div>
          <p className="text-center text-sm font-semibold text-text-muted">
            {label}
          </p>
        </div>
      )}

      {variant === 'checklist' && (
        <div className="rounded-2xl border border-border-card bg-surface-card p-4 shadow-2xs space-y-3">
          <div className="h-5 w-52 rounded-lg medical-shimmer-bg" />
          {Array.from({ length: safeRows }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 flex items-center justify-between gap-3"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="h-5 w-3/5 rounded-lg medical-shimmer-bg" />
                <div className="h-4 w-2/5 rounded-lg medical-shimmer-bg" />
              </div>
              <div className="h-12 w-28 rounded-xl medical-shimmer-bg shrink-0" />
            </div>
          ))}
        </div>
      )}

      {variant === 'lab-grid' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border-card bg-surface-card p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="h-6 w-60 rounded-lg medical-shimmer-bg" />
              <div className="h-10 w-36 rounded-xl medical-shimmer-bg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-4 w-28 rounded-lg medical-shimmer-bg" />
                    <div className="h-5 w-20 rounded-full medical-shimmer-bg" />
                  </div>
                  <div className="h-8 w-24 rounded-xl medical-shimmer-bg" />
                  <div className="h-10 w-full rounded-xl medical-shimmer-bg" />
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-sm font-semibold text-text-muted">
            {label}
          </p>
        </div>
      )}
    </div>
  );
}

export default MedicalSkeletonLoader;
