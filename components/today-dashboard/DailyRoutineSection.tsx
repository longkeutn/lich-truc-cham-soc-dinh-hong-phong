'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Pill,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { CareRoutine, DailyLog, TimeSlot } from '@/lib/types';
import {
  DEFAULT_RECORDER,
  detectCurrentTimeSlot,
  extractRoutineStartDateStr,
  formatVietnamDateFull,
  getVietnamTimeStr,
  normalizeDateStr,
} from '@/lib/config';
import { MedicalEmptyState } from '@/components/ui-kit';
import { RoutineTimeSlotGroup } from './RoutineTimeSlotGroup';
import { RoutineItemRow } from './RoutineItemRow';
import { MedicinePhotoLightbox } from './MedicinePhotoLightbox';

export interface DailyRoutineViewProps {
  routines: CareRoutine[];
  dailyLogs: DailyLog[];
  todayStr: string;
  onToggle: (log: DailyLog) => Promise<void>;
  onOpenManager?: () => void;
  onApplyPresetRoutines?: () => Promise<void>;
  defaultRecorder?: string;
  patientDisplayName?: string;
}

const TIME_SLOT_ORDER: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];

function stepDateStr(dateStr: string, offsetDays: number): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return dateStr;
  const utcNoon = new Date(
    Date.UTC(parts[0], parts[1] - 1, parts[2] + offsetDays, 12, 0, 0)
  );
  const y = utcNoon.getUTCFullYear();
  const m = String(utcNoon.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcNoon.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fmtShortDDMM(dateStr: string): string {
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
}

export function DailyRoutineSection({
  routines,
  dailyLogs,
  todayStr,
  onToggle,
  onOpenManager,
  onApplyPresetRoutines,
  defaultRecorder = DEFAULT_RECORDER,
  patientDisplayName = 'Bố',
}: DailyRoutineViewProps) {
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const isViewingPast = selectedDateStr < todayStr;
  const yesterdayStr = useMemo(() => stepDateStr(todayStr, -1), [todayStr]);
  const twoDaysAgoStr = useMemo(() => stepDateStr(todayStr, -2), [todayStr]);

  const [currentSlot, setCurrentSlot] = useState<TimeSlot>('morning');
  const [mountedClient, setMountedClient] = useState(false);
  const [expandedSlots, setExpandedSlots] = useState<Record<TimeSlot, boolean>>({
    morning: true,
    noon: false,
    afternoon: false,
    evening: false,
  });
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [previewRoutine, setPreviewRoutine] = useState<CareRoutine | null>(null);

  useEffect(() => {
    const slot = detectCurrentTimeSlot();
    setCurrentSlot(slot);
    setMountedClient(true);
    setSelectedDateStr(todayStr);
    setExpandedSlots({
      morning: slot === 'morning',
      noon: slot === 'noon',
      afternoon: slot === 'afternoon',
      evening: slot === 'evening',
    });
  }, [todayStr]);

  const handleSelectDate = useCallback(
    (nextDate: string) => {
      if (!nextDate || nextDate > todayStr) return;
      setSelectedDateStr(nextDate);
      if (nextDate < todayStr) {
        setExpandedSlots({
          morning: true,
          noon: true,
          afternoon: true,
          evening: true,
        });
      } else {
        const slot = detectCurrentTimeSlot();
        setExpandedSlots({
          morning: slot === 'morning',
          noon: slot === 'noon',
          afternoon: slot === 'afternoon',
          evening: slot === 'evening',
        });
      }
    },
    [todayStr]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncSlotOnWakeUp = () => {
      if (document.visibilityState === 'visible') {
        const nextSlot = detectCurrentTimeSlot();
        setCurrentSlot((prevSlot) => {
          if (prevSlot !== nextSlot) {
            setExpandedSlots((prev) => ({ ...prev, [nextSlot]: true }));
          }
          return nextSlot;
        });
      }
    };
    document.addEventListener('visibilitychange', syncSlotOnWakeUp);
    window.addEventListener('focus', syncSlotOnWakeUp);
    window.addEventListener('pageshow', syncSlotOnWakeUp);
    return () => {
      document.removeEventListener('visibilitychange', syncSlotOnWakeUp);
      window.removeEventListener('focus', syncSlotOnWakeUp);
      window.removeEventListener('pageshow', syncSlotOnWakeUp);
    };
  }, []);

  const logMap = useMemo(() => {
    const map = new Map<string, DailyLog>();
    for (const log of dailyLogs) {
      map.set(log.id, log);
      const normDate = normalizeDateStr(log.date);
      if (normDate && log.routineId && log.timeSlot) {
        map.set(`dl-${normDate}-${log.routineId}-${log.timeSlot}`, log);
      }
    }
    return map;
  }, [dailyLogs]);

  const scheduledRoutines = useMemo(() => {
    return routines.filter((r) => {
      if (!r.isActive || r.medType === 'as_needed') return false;
      if (selectedDateStr < todayStr) {
        const rawCreated = String(r.createdAt || '').trim();
        const isExplicitDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawCreated);
        const startStr = extractRoutineStartDateStr(r.createdAt, r.id);
        const hasLogOnSelectedDay = TIME_SLOT_ORDER.some(
          (sl) => logMap.get(`dl-${selectedDateStr}-${r.id}-${sl}`)?.isDone
        );
        if (hasLogOnSelectedDay) return true;
        if (startStr && selectedDateStr < startStr) {
          if (isExplicitDateOnly) return false;
          const hasEarlierLog = dailyLogs.some(
            (l) =>
              (l.routineId === r.id || l.id.includes(r.id)) &&
              l.isDone &&
              normalizeDateStr(l.date) <= selectedDateStr
          );
          if (!hasEarlierLog) return false;
        }
      }
      return true;
    });
  }, [routines, selectedDateStr, todayStr, logMap, dailyLogs]);

  const asNeededRoutines = useMemo(
    () => routines.filter((r) => r.isActive && r.medType === 'as_needed'),
    [routines]
  );

  const routinesBySlot = useMemo(() => {
    const grouped: Record<TimeSlot, CareRoutine[]> = {
      morning: [],
      noon: [],
      afternoon: [],
      evening: [],
    };
    for (const routine of scheduledRoutines) {
      for (const slot of Array.isArray(routine.timeSlots) ? routine.timeSlots : []) {
        if (grouped[slot]) grouped[slot].push(routine);
      }
    }
    for (const slot of TIME_SLOT_ORDER) {
      grouped[slot].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return grouped;
  }, [scheduledRoutines]);

  const { totalItems, doneItems } = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const slot of TIME_SLOT_ORDER) {
      for (const routine of routinesBySlot[slot]) {
        total++;
        if (logMap.get(`dl-${selectedDateStr}-${routine.id}-${slot}`)?.isDone) done++;
      }
    }
    return { totalItems: total, doneItems: done };
  }, [routinesBySlot, selectedDateStr, logMap]);

  const progressPercent = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const handleToggleItem = useCallback(
    async (routine: CareRoutine, timeSlot: TimeSlot) => {
      const logId = `dl-${selectedDateStr}-${routine.id}-${timeSlot}`;
      if (loadingIds.has(logId)) return;

      setLoadingIds((prev) => new Set(prev).add(logId));
      const existingLog = logMap.get(logId);
      const isCurrentlyDone = existingLog?.isDone ?? false;
      const doneTimeLabel =
        selectedDateStr < todayStr
          ? `Tích bù (${getVietnamTimeStr()})`
          : getVietnamTimeStr();

      try {
        await onToggle({
          id: logId,
          date: selectedDateStr,
          routineId: routine.id,
          timeSlot,
          isDone: !isCurrentlyDone,
          doneAt: !isCurrentlyDone ? doneTimeLabel : undefined,
          doneBy: !isCurrentlyDone ? defaultRecorder : undefined,
        });
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(logId);
          return next;
        });
      }
    },
    [selectedDateStr, todayStr, logMap, loadingIds, defaultRecorder, onToggle]
  );

  const handleMarkAllDoneForSelectedDay = useCallback(async () => {
    const doneTimeLabel =
      selectedDateStr < todayStr
        ? `Tích bù (${getVietnamTimeStr()})`
        : getVietnamTimeStr();
    for (const slot of TIME_SLOT_ORDER) {
      for (const routine of routinesBySlot[slot]) {
        const logId = `dl-${selectedDateStr}-${routine.id}-${slot}`;
        if (!logMap.get(logId)?.isDone) {
          await onToggle({
            id: logId,
            date: selectedDateStr,
            routineId: routine.id,
            timeSlot: slot,
            isDone: true,
            doneAt: doneTimeLabel,
            doneBy: defaultRecorder,
          });
        }
      }
    }
  }, [selectedDateStr, todayStr, routinesBySlot, logMap, defaultRecorder, onToggle]);

  return (
    <div className="space-y-3.5">
      {/* Header tiến độ & chọn ngày */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-teal-700 shrink-0" />
                <span>
                  Lịch Thuốc &amp; Chăm Sóc Của {patientDisplayName}{' '}
                  {isViewingPast ? `(${fmtShortDDMM(selectedDateStr)})` : 'Hôm Nay'}
                </span>
              </h3>
              <span className="text-sm sm:text-base font-black text-teal-900">
                {doneItems}/{totalItems} ({progressPercent}%)
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                style={{ width: `${progressPercent}%` }}
                className={`h-full transition-all duration-300 ${
                  progressPercent === 100 ? 'bg-emerald-600' : 'bg-teal-600'
                }`}
              />
            </div>
          </div>

          {onOpenManager && (
            <button
              type="button"
              onClick={onOpenManager}
              className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-slate-200 text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Settings className="w-4 h-4 text-teal-700 shrink-0" />
              <span>Quản lý đơn thuốc</span>
            </button>
          )}
        </div>

        {/* Thanh chọn ngày Hôm nay / Hôm qua / Hôm kia để tích bù */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { date: todayStr, label: 'Hôm nay' },
              { date: yesterdayStr, label: `Hôm qua (${fmtShortDDMM(yesterdayStr)})` },
              { date: twoDaysAgoStr, label: `Hôm kia (${fmtShortDDMM(twoDaysAgoStr)})` },
            ].map((item) => (
              <button
                key={item.date}
                type="button"
                onClick={() => handleSelectDate(item.date)}
                className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                  selectedDateStr === item.date
                    ? 'bg-teal-700 text-white border-teal-800'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}

            <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
              <button
                type="button"
                onClick={() => handleSelectDate(stepDateStr(selectedDateStr, -1))}
                aria-label="Lùi 1 ngày"
                className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-white flex items-center justify-center text-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <label className="inline-flex items-center gap-1 px-1.5 text-xs font-bold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                <input
                  type="date"
                  max={todayStr}
                  value={selectedDateStr}
                  onChange={(e) => handleSelectDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                />
              </label>
              <button
                type="button"
                disabled={selectedDateStr >= todayStr}
                onClick={() => handleSelectDate(stepDateStr(selectedDateStr, 1))}
                aria-label="Tiến 1 ngày"
                className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-white disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isViewingPast && doneItems < totalItems && totalItems > 0 && (
            <button
              type="button"
              onClick={() => void handleMarkAllDoneForSelectedDay()}
              className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Tích bù đủ ngày {formatVietnamDateFull(selectedDateStr)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Khi chưa có đơn thuốc nào -> Empty State rõ ràng kèm nút khởi tạo mẫu */}
      {scheduledRoutines.length === 0 && asNeededRoutines.length === 0 ? (
        <MedicalEmptyState
          icon={<Pill className="w-8 h-8" />}
          badge="Đơn thuốc & Chăm sóc hằng ngày"
          title={`Chưa có lịch thuốc hoặc bài tập nào cho ${patientDisplayName}`}
          description="Bạn có thể nạp nhanh lịch chăm sóc mẫu phù hợp với hồ sơ hiện tại rồi chỉnh sửa lại tên thuốc, liều lượng theo đúng đơn Bác sĩ."
          primaryAction={
            onApplyPresetRoutines
              ? {
                  label: `Nạp lịch chăm sóc mẫu cho ${patientDisplayName}`,
                  onClick: () => void onApplyPresetRoutines(),
                  icon: <Sparkles className="w-4 h-4" />,
                }
              : undefined
          }
          secondaryAction={
            onOpenManager
              ? {
                  label: 'Tự thêm thuốc / bài tập mới',
                  onClick: onOpenManager,
                  icon: <Settings className="w-4 h-4" />,
                }
              : undefined
          }
        />
      ) : (
        <>
          {TIME_SLOT_ORDER.map((slot) => (
            <RoutineTimeSlotGroup
              key={slot}
              slot={slot}
              routines={routinesBySlot[slot]}
              selectedDateStr={selectedDateStr}
              isCurrentSlot={mountedClient && !isViewingPast && currentSlot === slot}
              isExpanded={Boolean(expandedSlots[slot])}
              logMap={logMap}
              loadingIds={loadingIds}
              onToggleExpand={(s) =>
                setExpandedSlots((prev) => ({ ...prev, [s]: !prev[s] }))
              }
              onToggleItem={(r, s) => void handleToggleItem(r, s)}
              onPreviewPhoto={setPreviewRoutine}
            />
          ))}

          {asNeededRoutines.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/40 p-3.5 sm:p-4 space-y-2.5">
              <div className="text-sm sm:text-base font-black text-amber-950 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Thuốc dự phòng / Chỉ dùng khi cần ({asNeededRoutines.length})</span>
              </div>
              <div className="space-y-2">
                {asNeededRoutines.map((routine) => {
                  const slot = currentSlot || 'morning';
                  const logId = `dl-${selectedDateStr}-${routine.id}-${slot}`;
                  return (
                    <RoutineItemRow
                      key={routine.id}
                      routine={routine}
                      timeSlot={slot}
                      log={logMap.get(logId)}
                      isLoading={loadingIds.has(logId)}
                      onToggle={(r, s) => void handleToggleItem(r, s)}
                      onPreviewPhoto={setPreviewRoutine}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <MedicinePhotoLightbox
        routine={previewRoutine}
        onClose={() => setPreviewRoutine(null)}
      />
    </div>
  );
}

export default DailyRoutineSection;
