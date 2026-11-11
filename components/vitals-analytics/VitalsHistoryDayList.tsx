'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Edit3,
  Trash2,
  Pill,
} from 'lucide-react';
import type { VitalsLogEntry, BpThresholds, DailyLog } from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  evaluateVitalReading,
  getVietnamDateStr,
  getVietnamTimeStr,
} from '@/lib/config';
import {
  alertColors,
  fmtDateFull,
  getWeekdayVN,
  periodLabel,
  type VitalsComplianceStats,
  type DailyMatrixRow,
} from './vitalsAnalyticsTypes';

interface VitalsHistoryDayListProps {
  complianceStats: VitalsComplianceStats;
  bpThresholds: BpThresholds;
  patientName: string;
  defaultRecorder: string;
  deletingId: string | null;
  onEditEntry: (entry: VitalsLogEntry) => void;
  onDeleteEntry: (entry: VitalsLogEntry) => void;
  onToggleDailyLog?: (log: DailyLog) => Promise<void>;
}

export function VitalsHistoryDayList({
  complianceStats,
  bpThresholds,
  patientName,
  defaultRecorder,
  deletingId,
  onEditEntry,
  onDeleteEntry,
  onToggleDailyLog,
}: VitalsHistoryDayListProps) {
  const [dayHistoryFilter, setDayHistoryFilter] = useState<'all' | 'attention'>('all');
  const [showAllHistoryDays, setShowAllHistoryDays] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [togglingSlotKey, setTogglingSlotKey] = useState<string | null>(null);

  const hasDayAttention = (row: DailyMatrixRow): boolean => {
    const hasVitalAlert = row.vitals.some(
      (v) => evaluateVitalReading(v, bpThresholds, patientName).overallAlertLevel !== 'normal'
    );
    const hasMissedMeds = row.medsExpected > 0 && row.medsDone < row.medsExpected;
    return hasVitalAlert || hasMissedMeds;
  };

  const filteredDays = useMemo(() => {
    if (dayHistoryFilter === 'all') return complianceStats.dailyMatrix;
    return complianceStats.dailyMatrix.filter(hasDayAttention);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complianceStats.dailyMatrix, dayHistoryFilter, bpThresholds, patientName]);

  const visibleDays = showAllHistoryDays ? filteredDays : filteredDays.slice(0, 5);

  const handleRetroToggle = async (
    dateStr: string,
    routineId: string,
    timeSlot: DailyLog['timeSlot'],
    currentDone: boolean
  ) => {
    if (!onToggleDailyLog) return;
    const key = `dl-${dateStr}-${routineId}-${timeSlot}`;
    if (togglingSlotKey === key) return;
    setTogglingSlotKey(key);
    try {
      const nextDone = !currentDone;
      const isTodayDate = dateStr === getVietnamDateStr();
      await onToggleDailyLog({
        id: key,
        date: dateStr,
        routineId,
        timeSlot,
        isDone: nextDone,
        doneAt: nextDone ? (isTodayDate ? getVietnamTimeStr() : 'Tích bù') : undefined,
        doneBy: nextDone ? defaultRecorder : undefined,
      });
    } finally {
      setTogglingSlotKey(null);
    }
  };

  return (
    <div className="bg-surface-card rounded-2xl border border-border-card p-4 sm:p-5 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-black text-text-main flex items-center gap-2">
            <Calendar className="w-5 h-5 text-medical-primary shrink-0" />
            Nhật Ký Đối Chiếu Hằng Ngày ({filteredDays.length} ngày)
          </h3>
          <p className="text-sm sm:text-base text-text-muted mt-0.5">
            Đối chiếu các lần đo huyết áp với việc uống thuốc &amp; tập phục hồi trong từng ngày.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setDayHistoryFilter('all')}
            className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
              dayHistoryFilter === 'all'
                ? 'bg-medical-primary text-white border-medical-dark'
                : 'bg-slate-50 text-text-body border-border-card hover:bg-slate-100'
            }`}
          >
            Tất cả ({complianceStats.dailyMatrix.length})
          </button>
          <button
            type="button"
            onClick={() => setDayHistoryFilter('attention')}
            className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
              dayHistoryFilter === 'attention'
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-vital-warning-bg text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
          >
            ⚠️ Ngày cần lưu ý
          </button>
        </div>
      </div>

      {visibleDays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-emerald-300 bg-vital-safe-bg/60 p-5 text-center text-base font-bold text-emerald-800">
          🎉 Rất tốt! Không có ngày nào vượt ngưỡng huyết áp hoặc sót cữ thuốc trong kỳ này.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleDays.map((dayRow) => {
            const isExpanded = expandedDay === dayRow.date;
            const medsFull =
              dayRow.medsExpected > 0 && dayRow.medsDone === dayRow.medsExpected;

            return (
              <div
                key={dayRow.date}
                className="rounded-2xl border border-border-card bg-slate-50/50 overflow-hidden"
              >
                <div className="p-3.5 sm:p-4 bg-surface-card border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-black text-text-main">
                      {getWeekdayVN(dayRow.date)} · {fmtDateFull(dayRow.date)}
                    </span>
                    {dayRow.isToday && (
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-medical-dark text-xs sm:text-sm font-black">
                        Hôm nay
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-text-body text-xs sm:text-sm font-bold">
                      🩺 {dayRow.vitals.length} lần đo
                    </span>
                    {dayRow.medsExpected > 0 && (
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-xs sm:text-sm font-extrabold border ${
                          medsFull
                            ? 'bg-vital-safe-bg text-emerald-800 border-emerald-200'
                            : 'bg-vital-warning-bg text-amber-900 border-amber-300'
                        }`}
                      >
                        💊 Thuốc: {dayRow.medsDone}/{dayRow.medsExpected} cữ
                      </span>
                    )}
                  </div>

                  {dayRow.groupedRoutines.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDay((prev) => (prev === dayRow.date ? null : dayRow.date))
                      }
                      className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-body text-sm font-extrabold flex items-center gap-1.5 self-start sm:self-center cursor-pointer shrink-0"
                    >
                      <Pill className="w-4 h-4 text-medical-primary" />
                      <span>{isExpanded ? 'Ẩn chi tiết thuốc/tập' : 'Chi tiết thuốc & tập'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>

                {/* Danh sách các lần đo HA trong ngày */}
                <div className="p-3 sm:p-3.5 space-y-2">
                  {dayRow.vitals.length === 0 ? (
                    <div className="text-base text-text-muted italic px-1">
                      Chưa ghi nhận số đo huyết áp trong ngày này.
                    </div>
                  ) : (
                    dayRow.vitals.map((v) => {
                      const ev = evaluateVitalReading(v, bpThresholds, patientName);
                      const clr = alertColors(ev.overallAlertLevel);
                      const isDeleting = deletingId === v.id;

                      return (
                        <div
                          key={v.id}
                          className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${clr.bg} ${clr.border}`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-text-body">
                                {periodLabel(v.period)} · {v.time}
                              </span>
                              <span className={`text-xl font-black ${clr.text}`}>
                                {v.sys}/{v.dia}{' '}
                                <small className="text-xs font-semibold text-text-muted">mmHg</small>
                              </span>
                              {v.pulse ? (
                                <span className="text-base font-bold text-text-body">
                                  ❤️ {v.pulse} bpm
                                </span>
                              ) : null}
                              <span
                                className={`px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold border ${ev.bp.badgeClass}`}
                              >
                                {ev.badgeText}
                              </span>
                            </div>
                            {v.note && (
                              <div className="text-base text-text-main font-medium">
                                📝 {v.note}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => onEditEntry(v)}
                              className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white/90 hover:bg-white text-text-body border border-border-card text-sm font-extrabold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                              <span>Sửa</span>
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => onDeleteEntry(v)}
                              className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white/90 hover:bg-rose-50 text-rose-700 border border-rose-200 text-sm font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>{isDeleting ? '...' : 'Xoá'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Khay tích bù thuốc & bài tập trong ngày */}
                  {isExpanded && dayRow.groupedRoutines.length > 0 && (
                    <div className="mt-2 pt-3 border-t border-slate-200 space-y-2">
                      <div className="text-sm font-extrabold text-text-body uppercase tracking-wide">
                        Danh mục Thuốc &amp; Bài tập ngày {fmtDateFull(dayRow.date)}{' '}
                        {onToggleDailyLog ? '(Bấm vào buổi để tích bù / hoàn tác)' : ''}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {dayRow.groupedRoutines.map((g) => (
                          <div
                            key={g.routineId}
                            className="rounded-xl border border-border-card bg-surface-card p-3 flex flex-col justify-between gap-2"
                          >
                            <div className="text-base font-bold text-text-main">
                              {g.category === 'meds' || g.category === 'meds_prn'
                                ? '💊'
                                : g.category === 'rehab'
                                  ? '🏃'
                                  : '🩺'}{' '}
                              {g.routineTitle}
                              {g.dosage ? (
                                <span className="text-text-body font-semibold"> ({g.dosage})</span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {g.slots.map((s) => {
                                const slotCfg = TIME_SLOT_CONFIG[s.timeSlot];
                                const key = `dl-${dayRow.date}-${g.routineId}-${s.timeSlot}`;
                                const busy = togglingSlotKey === key;
                                return (
                                  <button
                                    key={s.timeSlot}
                                    type="button"
                                    disabled={!onToggleDailyLog || busy}
                                    onClick={() =>
                                      handleRetroToggle(
                                        dayRow.date,
                                        g.routineId,
                                        s.timeSlot,
                                        s.isDone
                                      )
                                    }
                                    className={`min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl text-sm font-extrabold border inline-flex items-center gap-1.5 transition cursor-pointer disabled:cursor-default ${
                                      s.isDone
                                        ? 'bg-vital-safe-bg text-emerald-800 border-emerald-300'
                                        : 'bg-slate-50 text-text-body border-slate-300 hover:bg-slate-100'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>
                                      {slotCfg?.label || s.timeSlot}:{' '}
                                      {s.isDone
                                        ? `✓ ${s.doneAt || (dayRow.isToday ? 'Đã xong' : 'Tích bù')}`
                                        : '+ Bấm tích'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredDays.length > 5 && (
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => setShowAllHistoryDays((prev) => !prev)}
            className="min-h-[48px] min-w-[48px] px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-main text-sm sm:text-base font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>
              {showAllHistoryDays
                ? 'Thu gọn chỉ hiện 5 ngày gần nhất'
                : `Xem tất cả ${filteredDays.length} ngày trong kỳ`}
            </span>
            {showAllHistoryDays ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default VitalsHistoryDayList;
