'use client';

import React, { useState, useMemo } from 'react';
import { Clock } from 'lucide-react';
import type { VitalsLogEntry, BpThresholds } from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  evaluateVitalReading,
  getVietnamDateStr,
  compareVitalsAsc,
  compareVitalsDesc,
} from '@/lib/config';
import {
  ALL_SLOTS,
  fmtDateShort,
  getWeekdayVN,
  type VitalsSummaryStats,
} from './vitalsAnalyticsTypes';

interface VitalsPeriodDeepDiveProps {
  normalizedVitals: VitalsLogEntry[];
  summaryStats: VitalsSummaryStats;
  bpThresholds: BpThresholds;
  patientName: string;
}

export function VitalsPeriodDeepDive({
  normalizedVitals,
  summaryStats,
  bpThresholds,
  patientName,
}: VitalsPeriodDeepDiveProps) {
  const todayStr = getVietnamDateStr();
  const [slotCompareDate, setSlotCompareDate] = useState<'avg' | string>(() => todayStr);

  const effectiveMode = useMemo(() => {
    if (slotCompareDate === 'avg') return 'avg';
    if (summaryStats.availableSlotDays.includes(slotCompareDate)) return slotCompareDate;
    return todayStr;
  }, [slotCompareDate, summaryStats.availableSlotDays, todayStr]);

  const singleDayItems = useMemo(() => {
    if (effectiveMode === 'avg') return [];
    return normalizedVitals.filter((v) => v.date === effectiveMode);
  }, [effectiveMode, normalizedVitals]);

  return (
    <div className="pt-4 border-t border-slate-100 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-extrabold text-text-body flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-medical-primary shrink-0" />
          So sánh Huyết áp &amp; Nhịp tim theo 4 buổi (Sáng · Trưa · Chiều · Tối)
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          {summaryStats.availableSlotDays.slice(0, 4).map((dStr) => {
            const isTodayBtn = dStr === todayStr;
            const active = effectiveMode === dStr;
            return (
              <button
                key={dStr}
                type="button"
                onClick={() => setSlotCompareDate(dStr)}
                className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                  active
                    ? 'bg-medical-primary text-white border-medical-dark shadow-2xs'
                    : 'bg-surface-card text-text-body border-border-card hover:bg-slate-50'
                }`}
              >
                {isTodayBtn ? `Hôm nay (${fmtDateShort(dStr)})` : fmtDateShort(dStr)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSlotCompareDate('avg')}
            className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
              effectiveMode === 'avg'
                ? 'bg-slate-800 text-white border-slate-900 shadow-2xs'
                : 'bg-slate-100 text-text-body border-border-card hover:bg-slate-200'
            }`}
          >
            📊 TB {summaryStats.periodReadingsCount} lần trong kỳ
          </button>
        </div>
      </div>

      <div className="text-xs sm:text-sm text-text-muted font-medium">
        {effectiveMode === 'avg' ? (
          <span>
            Đang hiển thị <strong>trung bình cộng</strong> của từng buổi tính trên{' '}
            {summaryStats.periodReadingsCount} lần đo trong kỳ đang lọc.
          </span>
        ) : (
          <span>
            Đang xem số đo thực tế trong ngày{' '}
            <strong className="text-text-main">
              {getWeekdayVN(effectiveMode)} ({fmtDateShort(effectiveMode)})
            </strong>
            . Buổi nào chưa đo sẽ hiển thị rõ &quot;Chưa đo&quot;.
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {ALL_SLOTS.map((slot) => {
          const cfg = TIME_SLOT_CONFIG[slot];

          if (effectiveMode !== 'avg') {
            const slotReadings = singleDayItems
              .filter((v) => v.period === slot)
              .sort(compareVitalsDesc);

            if (slotReadings.length === 0) {
              return (
                <div
                  key={slot}
                  className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 flex flex-col justify-between"
                >
                  <div className="text-xs font-bold text-text-muted flex items-center justify-between">
                    <span>
                      {cfg.emoji} {cfg.label}
                    </span>
                    <span className="text-xs text-text-muted">Chưa đo</span>
                  </div>
                  <div className="text-xs sm:text-sm text-text-muted mt-2 font-medium">
                    Chưa có số đo buổi {cfg.label.toLowerCase()} ngày {fmtDateShort(effectiveMode)}
                  </div>
                </div>
              );
            }

            const primaryReading = slotReadings[0];
            const evalSlot = evaluateVitalReading(primaryReading, bpThresholds, patientName);

            return (
              <div
                key={slot}
                className={`rounded-xl border p-3 transition ${
                  evalSlot.overallAlertLevel === 'critical'
                    ? 'bg-vital-danger-bg border-rose-300'
                    : evalSlot.overallAlertLevel === 'warning'
                      ? 'bg-vital-warning-bg border-amber-300'
                      : 'bg-surface-card border-border-card'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-text-body">
                    {cfg.emoji} {cfg.label}
                  </span>
                  <span className="text-text-muted font-bold">lúc {primaryReading.time}</span>
                </div>
                <div
                  className={`text-lg sm:text-xl font-black mt-1 ${
                    evalSlot.bp.alertLevel === 'critical'
                      ? 'text-rose-700'
                      : evalSlot.bp.alertLevel === 'warning'
                        ? 'text-amber-800'
                        : 'text-text-main'
                  }`}
                >
                  {primaryReading.sys}/{primaryReading.dia}
                  <span className="text-xs font-bold text-text-muted ml-1">mmHg</span>
                </div>
                <div className="text-xs text-text-muted mt-1 flex items-center justify-between flex-wrap gap-1">
                  <span>
                    {primaryReading.pulse ? (
                      <strong
                        className={
                          primaryReading.pulse < 50 || primaryReading.pulse >= 100
                            ? 'text-rose-700'
                            : primaryReading.pulse < 60
                              ? 'text-amber-800'
                              : 'text-text-body'
                        }
                      >
                        ❤️ {primaryReading.pulse} bpm
                      </strong>
                    ) : (
                      'Chưa ghi mạch'
                    )}
                  </span>
                  <span className="font-semibold text-text-body">{evalSlot.bp.shortLabel}</span>
                </div>
                {slotReadings.length > 1 && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 text-xs text-text-muted">
                    Đo {slotReadings.length} lần:{' '}
                    {[...slotReadings]
                      .sort(compareVitalsAsc)
                      .map((r) => `${r.sys}/${r.dia} (${r.time})`)
                      .join(' → ')}
                  </div>
                )}
              </div>
            );
          }

          const st = summaryStats.byPeriod[slot];
          const hasData = st.count > 0 && st.avgSys !== null && st.avgDia !== null;
          const isHigh =
            hasData &&
            ((st.avgSys ?? 0) >= bpThresholds.highSys || (st.avgDia ?? 0) >= bpThresholds.highDia);

          return (
            <div
              key={slot}
              className={`rounded-xl border p-3 ${
                !hasData
                  ? 'bg-slate-50/70 border-slate-200'
                  : isHigh
                    ? 'bg-vital-warning-bg border-amber-300'
                    : 'bg-slate-50 border-border-card'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-body">
                  {cfg.emoji} TB {cfg.label}
                </span>
                <span className="text-text-muted font-semibold">{st.count} lần</span>
              </div>
              {hasData ? (
                <>
                  <div
                    className={`text-lg sm:text-xl font-black mt-1 ${
                      isHigh ? 'text-amber-800' : 'text-text-main'
                    }`}
                  >
                    {st.avgSys}/{st.avgDia}
                    <span className="text-xs font-bold text-text-muted ml-1">mmHg</span>
                  </div>
                  <div className="text-xs text-text-muted mt-1 flex items-center justify-between flex-wrap gap-1">
                    <span>Cao nhất: {st.maxSys}</span>
                    {st.avgPulse && <span>❤️ TB {st.avgPulse}</span>}
                  </div>
                </>
              ) : (
                <div className="text-xs sm:text-sm text-text-muted mt-2 font-medium">
                  Chưa có bản ghi trong kỳ
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VitalsPeriodDeepDive;
