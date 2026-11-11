'use client';

import React, { useState } from 'react';
import { Pill, ChevronDown, ChevronUp } from 'lucide-react';
import { TIME_SLOT_CONFIG } from '@/lib/config';
import {
  ALL_SLOTS,
  fmtDateShort,
  type VitalsComplianceStats,
} from './vitalsAnalyticsTypes';

interface VitalsRoutineBreakdownProps {
  complianceStats: VitalsComplianceStats;
}

export function VitalsRoutineBreakdown({ complianceStats }: VitalsRoutineBreakdownProps) {
  const [showRoutineBreakdown, setShowRoutineBreakdown] = useState(false);

  if (complianceStats.routineStatsList.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface-card rounded-2xl border border-border-card shadow-2xs overflow-hidden">
      <button
        type="button"
        onClick={() => setShowRoutineBreakdown((prev) => !prev)}
        className="w-full min-h-[48px] min-w-[48px] px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Pill className="w-5 h-5 text-vital-safe shrink-0" />
          <span className="text-base font-black text-text-main truncate">
            Xem tỷ lệ hoàn thành chi tiết từng loại thuốc &amp; bài tập ({complianceStats.routineStatsList.length} mục)
          </span>
        </div>
        <span className="text-sm font-extrabold text-medical-primary flex items-center gap-1 shrink-0 ml-2">
          {showRoutineBreakdown ? 'Thu gọn' : 'Mở xem'}
          {showRoutineBreakdown ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </span>
      </button>

      {showRoutineBreakdown && (
        <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {ALL_SLOTS.map((slot) => {
              const cfg = TIME_SLOT_CONFIG[slot];
              const sc = complianceStats.slotCompliance[slot];
              return (
                <div
                  key={slot}
                  className="rounded-xl border border-border-card bg-slate-50/70 p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-text-body">
                    <span>
                      {cfg.emoji} Cữ {cfg.label}
                    </span>
                    <span className="text-text-main font-black">
                      {sc.expected > 0 ? `${sc.pct}%` : '-'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        sc.pct >= 85
                          ? 'bg-vital-safe'
                          : sc.pct >= 50
                            ? 'bg-vital-warning'
                            : 'bg-vital-danger'
                      }`}
                      style={{ width: `${sc.expected > 0 ? sc.pct : 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-text-muted font-medium">
                    {sc.expected > 0 ? `Đã uống ${sc.done}/${sc.expected} cữ` : 'Không có lịch thuốc'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {complianceStats.routineStatsList
              .filter((r) => r.expected > 0)
              .map(({ routine, startDate, expected, done, pct }) => (
                <div
                  key={routine.id}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border-card bg-surface-card"
                >
                  <div className="min-w-0">
                    <div className="text-base font-bold text-text-main truncate">
                      {routine.category === 'meds'
                        ? '💊'
                        : routine.category === 'rehab'
                          ? '🏃'
                          : '🩺'}{' '}
                      {routine.title}
                      {routine.dosage ? (
                        <span className="text-text-body font-semibold"> · {routine.dosage}</span>
                      ) : null}
                    </div>
                    <div className="text-xs sm:text-sm text-text-muted mt-0.5 font-medium">
                      Áp dụng từ {fmtDateShort(startDate)} · Đạt {done}/{expected} lần
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-black shrink-0 border ${
                      pct >= 80
                        ? 'bg-vital-safe-bg text-emerald-800 border-emerald-200'
                        : pct >= 50
                          ? 'bg-vital-warning-bg text-amber-900 border-amber-200'
                          : 'bg-vital-danger-bg text-rose-800 border-rose-200'
                    }`}
                  >
                    {pct}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default VitalsRoutineBreakdown;
