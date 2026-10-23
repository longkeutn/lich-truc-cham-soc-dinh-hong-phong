'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Pill,
  Dumbbell,
  Heart,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
  Settings,
  Circle,
  Zap,
  ListChecks,
  X,
  ZoomIn,
} from 'lucide-react';
import { CareRoutine, DailyLog, TimeSlot, RoutineCategory } from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  detectCurrentTimeSlot,
  DEFAULT_RECORDER,
  getVietnamTimeStr,
  getVietnamDateOffsetStr,
  formatVietnamDateFull,
  normalizeDateStr,
  extractRoutineStartDateStr,
} from '@/lib/config';

// ===== PROPS =====
interface DailyRoutineViewProps {
  routines: CareRoutine[];        // Active routines for current stage
  dailyLogs: DailyLog[];          // Today's completion logs
  todayStr: string;               // YYYY-MM-DD for today
  onToggle: (log: DailyLog) => Promise<void>;  // Toggle completion
  onOpenManager?: () => void;     // Open RoutineManagerModal (Admin)
  defaultRecorder?: string;       // 'Mẹ'
}

// ===== CATEGORY ICON CONFIG =====
const CATEGORY_ICON: Record<RoutineCategory, { icon: React.ComponentType<{ className?: string }>; label: string; color: string; bgColor: string }> = {
  meds: {
    icon: Pill,
    label: 'Thuốc',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
  },
  rehab: {
    icon: Dumbbell,
    label: 'Tập phục hồi',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
  },
  care: {
    icon: Heart,
    label: 'Chăm sóc',
    color: 'text-slate-700',
    bgColor: 'bg-slate-100',
  },
};

// ===== TIME SLOTS ORDER =====
const TIME_SLOT_ORDER: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];

// ===== HELPER: format current time as HH:mm (theo múi giờ Việt Nam UTC+7) =====
function getCurrentHHmm(): string {
  return getVietnamTimeStr();
}

// ===== HELPER: cộng/trừ 1 ngày từ chuỗi YYYY-MM-DD =====
function stepDateStr(dateStr: string, offsetDays: number): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return dateStr;
  const utcNoon = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + offsetDays, 12, 0, 0));
  const y = utcNoon.getUTCFullYear();
  const m = String(utcNoon.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcNoon.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fmtShortDDMM(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

// ===== MAIN COMPONENT =====
export default function DailyRoutineView({
  routines,
  dailyLogs,
  todayStr,
  onToggle,
  onOpenManager,
  defaultRecorder = DEFAULT_RECORDER,
}: DailyRoutineViewProps) {
  // Ngày đang xem / tích checklist (mặc định là Hôm nay, có thể chọn lùi về quá khứ để tích bù)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const isViewingPast = selectedDateStr < todayStr;
  const yesterdayStr = useMemo(() => stepDateStr(todayStr, -1), [todayStr]);
  const twoDaysAgoStr = useMemo(() => stepDateStr(todayStr, -2), [todayStr]);

  // Khởi tạo cố định khi SSR rồi cập nhật đúng buổi theo giờ thực tế trên điện thoại trong useEffect
  const [currentSlot, setCurrentSlot] = useState<TimeSlot>('morning');
  const [mountedClient, setMountedClient] = useState(false);
  const [expandedSlots, setExpandedSlots] = useState<Record<TimeSlot, boolean>>({
    morning: true,
    noon: false,
    afternoon: false,
    evening: false,
  });

  // Đồng bộ ca hiện tại khi mới mở hoặc khi bước sang ngày mới (todayStr thay đổi)
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

  // Khi chuyển sang ngày quá khứ -> tự động mở cả 4 buổi để tiện kiểm tra & tích bù
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

  // Khi mở lại PWA từ chế độ nền sau nhiều giờ, nếu đã chuyển sang buổi mới thì tự mở buổi mới cho Mẹ
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncSlotOnWakeUp = () => {
      if (document.visibilityState === 'visible') {
        const nextSlot = detectCurrentTimeSlot();
        setCurrentSlot((prevSlot) => {
          if (prevSlot !== nextSlot) {
            setExpandedSlots((prevExpanded) => ({
              ...prevExpanded,
              [nextSlot]: true,
            }));
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

  // Loading state per item to prevent double-tap
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // Lightbox xem ảnh thuốc lớn cho Mẹ
  const [previewRoutine, setPreviewRoutine] = useState<CareRoutine | null>(null);

  // ===== DERIVED DATA =====

  // Build a quick lookup: logId → DailyLog (và chuẩn hóa tra cứu theo date + routineId + timeSlot)
  const logMap = useMemo(() => {
    const map = new Map<string, DailyLog>();
    dailyLogs.forEach((log) => {
      map.set(log.id, log);
      const normDate = normalizeDateStr(log.date);
      if (normDate && log.routineId && log.timeSlot) {
        map.set(`dl-${normDate}-${log.routineId}-${log.timeSlot}`, log);
      }
    });
    return map;
  }, [dailyLogs]);

  // Active scheduled routines applicable on selectedDateStr
  const scheduledRoutines = useMemo(() => {
    return routines.filter((r) => {
      if (!r.isActive || r.medType === 'as_needed') return false;
      // Nếu đang xem ngày quá khứ: kiểm tra xem thuốc/bài tập đã bắt đầu áp dụng vào ngày đó chưa
      if (selectedDateStr < todayStr) {
        const rawCreated = String(r.createdAt || '').trim();
        const isExplicitDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawCreated);
        const startStr = extractRoutineStartDateStr(r.createdAt, r.id);
        // Kiểm tra xem ngày quá khứ đó có log đã tích sẵn của thuốc này không
        const hasLogOnSelectedDay = TIME_SLOT_ORDER.some(
          (sl) => logMap.get(`dl-${selectedDateStr}-${r.id}-${sl}`)?.isDone
        );
        if (hasLogOnSelectedDay) return true;
        if (startStr && selectedDateStr < startStr) {
          // Nếu người dùng đặt ngày bắt đầu sau ngày đang xem (hoặc thuốc mới tạo gần đây)
          if (isExplicitDateOnly) return false;
          // Kiểm tra xem có log nào sớm hơn startStr không
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

  // "Khi cần" (as_needed) routines
  const asNeededRoutines = useMemo(
    () => routines.filter((r) => r.isActive && r.medType === 'as_needed'),
    [routines]
  );

  // Group scheduled routines by time slot
  const routinesBySlot = useMemo(() => {
    const grouped: Record<TimeSlot, CareRoutine[]> = {
      morning: [],
      noon: [],
      afternoon: [],
      evening: [],
    };
    scheduledRoutines.forEach((routine) => {
      (Array.isArray(routine.timeSlots) ? routine.timeSlots : []).forEach((slot) => {
        if (grouped[slot]) {
          grouped[slot].push(routine);
        }
      });
    });
    // Sort each slot by sortOrder
    TIME_SLOT_ORDER.forEach((slot) => {
      grouped[slot].sort((a, b) => a.sortOrder - b.sortOrder);
    });
    return grouped;
  }, [scheduledRoutines]);

  // Count total scheduled items and done items for progress bar (on selectedDateStr)
  const { totalItems, doneItems } = useMemo(() => {
    let total = 0;
    let done = 0;
    TIME_SLOT_ORDER.forEach((slot) => {
      routinesBySlot[slot].forEach((routine) => {
        total++;
        const logId = `dl-${selectedDateStr}-${routine.id}-${slot}`;
        const log = logMap.get(logId);
        if (log?.isDone) done++;
      });
    });
    return { totalItems: total, doneItems: done };
  }, [routinesBySlot, selectedDateStr, logMap]);

  // Progress percentage
  const progressPercent = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  // ===== TOGGLE HANDLER =====
  const handleToggle = useCallback(
    async (routine: CareRoutine, timeSlot: TimeSlot) => {
      const logId = `dl-${selectedDateStr}-${routine.id}-${timeSlot}`;

      // Prevent double-tap
      if (loadingIds.has(logId)) return;

      setLoadingIds((prev) => new Set(prev).add(logId));

      const existingLog = logMap.get(logId);
      const isCurrentlyDone = existingLog?.isDone ?? false;

      const doneTimeLabel =
        selectedDateStr < todayStr ? `Tích bù (${getCurrentHHmm()})` : getCurrentHHmm();

      const newLog: DailyLog = {
        id: logId,
        date: selectedDateStr,
        routineId: routine.id,
        timeSlot,
        isDone: !isCurrentlyDone,
        doneAt: !isCurrentlyDone ? doneTimeLabel : undefined,
        doneBy: !isCurrentlyDone ? defaultRecorder : undefined,
      };

      try {
        await onToggle(newLog);
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

  // ===== TÍCH ĐỦ CẢ NGÀY (DÀNH CHO TÍCH BÙ QUÁ KHỨ KHI QUÊN TÍCH) =====
  const handleMarkAllDoneForSelectedDay = useCallback(async () => {
    const missingLogs: DailyLog[] = [];
    const doneTimeLabel =
      selectedDateStr < todayStr ? `Tích bù (${getCurrentHHmm()})` : getCurrentHHmm();

    TIME_SLOT_ORDER.forEach((slot) => {
      routinesBySlot[slot].forEach((routine) => {
        const logId = `dl-${selectedDateStr}-${routine.id}-${slot}`;
        const existing = logMap.get(logId);
        if (!existing?.isDone) {
          missingLogs.push({
            id: logId,
            date: selectedDateStr,
            routineId: routine.id,
            timeSlot: slot,
            isDone: true,
            doneAt: doneTimeLabel,
            doneBy: defaultRecorder,
          });
        }
      });
    });

    for (const item of missingLogs) {
      await onToggle(item);
    }
  }, [selectedDateStr, todayStr, routinesBySlot, logMap, defaultRecorder, onToggle]);

  // ===== TOGGLE SECTION EXPAND =====
  const toggleSection = useCallback((slot: TimeSlot) => {
    setExpandedSlots((prev) => ({ ...prev, [slot]: !prev[slot] }));
  }, []);

  // ===== PROGRESS BAR COLOR =====
  const progressBarColor =
    progressPercent === 100
      ? 'bg-emerald-600'
      : progressPercent > 0
        ? 'bg-teal-600'
        : 'bg-slate-300';

  const progressTextColor =
    progressPercent === 100
      ? 'text-emerald-800'
      : progressPercent > 0
        ? 'text-teal-800'
        : 'text-slate-800';

  // ===== RENDER =====
  return (
    <div className="space-y-3.5">
      {/* ===== HEADER: Progress + Chọn ngày (Hôm nay / Tích bù quá khứ) + Admin button ===== */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Progress text */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200/80 flex items-center justify-center shrink-0">
                  <ListChecks className={`w-4.5 h-4.5 ${progressTextColor}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                      {isViewingPast
                        ? `Checklist Ngày ${fmtShortDDMM(selectedDateStr)}`
                        : 'Đơn Thuốc & Bài Tập Hôm Nay'}
                    </h3>
                    {mountedClient && (
                      <span
                        className={`px-2 py-0.5 rounded-md border text-xs font-bold ${
                          isViewingPast
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-teal-50 border-teal-200 text-teal-800'
                        }`}
                      >
                        📅 {formatVietnamDateFull(selectedDateStr)}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs font-bold ${progressTextColor}`}>
                    Đã hoàn thành {doneItems}/{totalItems} việc ({progressPercent}%)
                  </p>
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-2.5 bg-slate-100 border border-slate-200/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${progressBarColor}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Admin button */}
          {onOpenManager && (
            <button
              onClick={onOpenManager}
              className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition-colors min-h-[40px] cursor-pointer"
              title="Quản lý đơn thuốc & bài tập"
            >
              <Settings className="w-4 h-4 text-slate-600 shrink-0" />
              <span>Quản lý đơn thuốc</span>
            </button>
          )}
        </div>

        {/* Thanh chọn ngày để xem hoặc tích bù cho các ngày trước (khi quên tích) */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-0.5">Chọn ngày:</span>
            <button
              type="button"
              onClick={() => handleSelectDate(todayStr)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                selectedDateStr === todayStr
                  ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Hôm nay ({fmtShortDDMM(todayStr)})
            </button>
            <button
              type="button"
              onClick={() => handleSelectDate(yesterdayStr)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                selectedDateStr === yesterdayStr
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Hôm qua ({fmtShortDDMM(yesterdayStr)})
            </button>
            <button
              type="button"
              onClick={() => handleSelectDate(twoDaysAgoStr)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                selectedDateStr === twoDaysAgoStr
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Hôm kia ({fmtShortDDMM(twoDaysAgoStr)})
            </button>
          </div>

          {/* Điều hướng Lùi / Tiến 1 ngày & Chọn ngày bất kỳ trong lịch */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectDate(stepDateStr(selectedDateStr, -1))}
              className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
              title="Lùi 1 ngày trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
              <input
                type="date"
                max={todayStr}
                value={selectedDateStr}
                onChange={(e) => {
                  if (e.target.value) handleSelectDate(e.target.value);
                }}
                aria-label="Chọn ngày tích bù checklist"
                className="pl-7 pr-2 py-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              />
            </div>
            <button
              type="button"
              disabled={selectedDateStr >= todayStr}
              onClick={() => handleSelectDate(stepDateStr(selectedDateStr, 1))}
              className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 disabled:opacity-35 transition cursor-pointer"
              title="Tiến 1 ngày sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Banner nhắc đang ở chế độ Tích bù ngày cũ + Nút 1 chạm "Tích đủ cả ngày" */}
        {isViewingPast && (
          <div className="rounded-xl bg-amber-50 border border-amber-300 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs text-amber-950 font-semibold leading-snug">
              🕰️ <strong>Chế độ tích bù quá khứ ({formatVietnamDateFull(selectedDateStr)}):</strong>{' '}
              Nếu hôm đó bố vẫn uống thuốc & tập đầy đủ nhưng quên bấm trên điện thoại, bạn có thể tích lại từng mục hoặc bấm <strong>Tích đủ cả ngày</strong>.
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {doneItems < totalItems && totalItems > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllDoneForSelectedDay}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Tích đủ cả ngày ({totalItems - doneItems} mục)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSelectDate(todayStr)}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Về Hôm nay</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== 4 TIME PERIOD SECTIONS ===== */}
      {TIME_SLOT_ORDER.map((slot) => {
        const slotConfig = TIME_SLOT_CONFIG[slot];
        const slotRoutines = routinesBySlot[slot];
        const isExpanded = expandedSlots[slot];
        const isCurrent = !isViewingPast && slot === currentSlot;

        // Count done in this slot
        const slotDone = slotRoutines.filter((r) => {
          const logId = `dl-${selectedDateStr}-${r.id}-${slot}`;
          return logMap.get(logId)?.isDone;
        }).length;
        const slotTotal = slotRoutines.length;
        const slotAllDone = slotTotal > 0 && slotDone === slotTotal;

        if (slotTotal === 0) return null; // Skip empty slots

        return (
          <div
            key={slot}
            className={`rounded-2xl border overflow-hidden transition-colors shadow-xs ${
              isCurrent
                ? 'border-teal-500 bg-white ring-1 ring-teal-500/15'
                : slotAllDone
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-200/90 bg-white'
            }`}
          >
            {/* Section Header — Collapsible */}
            <button
              onClick={() => toggleSection(slot)}
              className={`w-full flex items-center justify-between gap-2 px-3.5 sm:px-4 py-3 text-left transition-colors min-h-[54px] cursor-pointer ${
                isCurrent
                  ? 'bg-teal-50/90 hover:bg-teal-100/70'
                  : slotAllDone
                    ? 'bg-emerald-50/80 hover:bg-emerald-100/60'
                    : 'bg-slate-50/90 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                <span className="text-xl shrink-0" role="img" aria-label={slotConfig.label}>
                  {slotConfig.emoji}
                </span>
                <span className="text-base sm:text-lg font-extrabold text-slate-900">
                  Buổi {slotConfig.label}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  ({slotConfig.timeRange})
                </span>
                {isCurrent && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-teal-700 text-white rounded-md">
                    CA HIỆN TẠI
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* Slot progress mini badge */}
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap ${
                    slotAllDone
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : slotDone > 0
                        ? 'bg-teal-700 text-white border-teal-800'
                        : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {slotAllDone ? `✅ Đủ ${slotDone}/${slotTotal}` : `${slotDone}/${slotTotal} việc`}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-600 shrink-0" />
                )}
              </div>
            </button>

            {/* Section Body — Routine items */}
            {isExpanded && (
              <div className="px-2.5 sm:px-3.5 pb-3 sm:pb-3.5 pt-2.5 space-y-2.5 border-t border-slate-100">
                {slotRoutines.map((routine) => (
                  <RoutineItem
                    key={`${routine.id}-${slot}-${selectedDateStr}`}
                    routine={routine}
                    timeSlot={slot}
                    todayStr={selectedDateStr}
                    log={logMap.get(`dl-${selectedDateStr}-${routine.id}-${slot}`)}
                    isLoading={loadingIds.has(`dl-${selectedDateStr}-${routine.id}-${slot}`)}
                    onToggle={() => handleToggle(routine, slot)}
                    onPreviewImage={() => setPreviewRoutine(routine)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ===== "KHI CẦN" SECTION ===== */}
      {asNeededRoutines.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/30 overflow-hidden shadow-xs">
          {/* Header */}
          <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-amber-100/70 border-b border-amber-200">
            <div className="flex items-center gap-2 flex-wrap">
              <Zap className="w-4.5 h-4.5 text-amber-800 shrink-0" />
              <span className="text-sm sm:text-base font-extrabold text-amber-950">
                Thuốc Dùng Khi Cần
              </span>
              <span className="text-xs font-semibold text-amber-800">
                (Chỉ uống khi có triệu chứng)
              </span>
            </div>
          </div>
          {/* Items */}
          <div className="px-2.5 sm:px-3.5 pb-3 sm:pb-3.5 pt-2.5 space-y-2.5">
            {asNeededRoutines
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((routine) => {
                // as_needed items don't belong to a specific slot; use a special key
                const asNeededSlot: TimeSlot = 'morning'; // fallback slot for ID
                const logId = `dl-${selectedDateStr}-${routine.id}-as_needed`;
                // Check if there's a log for selectedDateStr (use custom id for as_needed)
                const log = dailyLogs.find((l) => l.id === logId);
                const isLoading = loadingIds.has(logId);

                return (
                  <RoutineItem
                    key={`${routine.id}-${selectedDateStr}`}
                    routine={routine}
                    timeSlot={asNeededSlot}
                    todayStr={selectedDateStr}
                    log={log}
                    isLoading={isLoading}
                    isAsNeeded
                    onPreviewImage={() => setPreviewRoutine(routine)}
                    onToggle={async () => {
                      if (isLoading) return;
                      setLoadingIds((prev) => new Set(prev).add(logId));
                      const isCurrentlyDone = log?.isDone ?? false;
                      const doneTimeLabel =
                        selectedDateStr < todayStr
                          ? `Tích bù (${getCurrentHHmm()})`
                          : getCurrentHHmm();
                      const newLog: DailyLog = {
                        id: logId,
                        date: selectedDateStr,
                        routineId: routine.id,
                        timeSlot: asNeededSlot,
                        isDone: !isCurrentlyDone,
                        doneAt: !isCurrentlyDone ? doneTimeLabel : undefined,
                        doneBy: !isCurrentlyDone ? defaultRecorder : undefined,
                      };
                      try {
                        await onToggle(newLog);
                      } finally {
                        setLoadingIds((prev) => {
                          const next = new Set(prev);
                          next.delete(logId);
                          return next;
                        });
                      }
                    }}
                  />
                );
              })}
          </div>
        </div>
      )}

      {/* ===== LIGHTBOX XEM ẢNH THUỐC LỚN CHO MẸ ===== */}
      {previewRoutine && previewRoutine.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setPreviewRoutine(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-slate-100 flex items-center justify-center max-h-[48vh] sm:max-h-[55vh] overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewRoutine.imageUrl}
                alt={previewRoutine.title}
                className="w-full h-auto max-h-[48vh] sm:max-h-[55vh] object-contain"
              />
              <button
                type="button"
                onClick={() => setPreviewRoutine(null)}
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                aria-label="Đóng ảnh"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <h4 className="text-lg font-extrabold text-slate-900">
                  {previewRoutine.title}
                </h4>
                {previewRoutine.dosage && (
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-sm font-bold flex-shrink-0">
                    {previewRoutine.dosage}
                  </span>
                )}
              </div>
              {previewRoutine.instructions && (
                <p className="text-sm text-slate-800 font-semibold leading-relaxed">
                  👉 {previewRoutine.instructions}
                </p>
              )}
              {previewRoutine.description && (
                <p className="text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl leading-relaxed">
                  🔍 {previewRoutine.description}
                </p>
              )}
              {previewRoutine.conditionNote && (
                <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-semibold leading-relaxed">
                  ⚠️ {previewRoutine.conditionNote}
                </p>
              )}
              <button
                type="button"
                onClick={() => setPreviewRoutine(null)}
                className="w-full mt-2 py-2.5 rounded-xl bg-teal-700 text-white text-sm font-bold hover:bg-teal-800 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== SUB-COMPONENT: RoutineItem =====
interface RoutineItemProps {
  routine: CareRoutine;
  timeSlot: TimeSlot;
  todayStr: string;
  log?: DailyLog;
  isLoading: boolean;
  isAsNeeded?: boolean;
  onToggle: () => void;
  onPreviewImage?: () => void;
}

function RoutineItem({
  routine,
  log,
  isLoading,
  isAsNeeded,
  onToggle,
  onPreviewImage,
}: RoutineItemProps) {
  const isDone = log?.isDone ?? false;
  const categoryConfig = CATEGORY_ICON[routine.category] || CATEGORY_ICON.care;
  const IconComponent = categoryConfig.icon;
  const [descExpanded, setDescExpanded] = useState(false);

  const hasInfoBlock = Boolean(routine.instructions || routine.description);
  const isLongDesc = Boolean(routine.description && routine.description.length > 125);

  return (
    <div
      className={`rounded-xl border p-3 sm:p-3.5 flex flex-col gap-2 transition-all ${
        isDone
          ? 'bg-emerald-50/50 border-emerald-300'
          : isAsNeeded
            ? 'bg-white border-amber-300'
            : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
      }`}
    >
      {/* TẦNG 1: Ảnh/Icon (Trái) + Tên & Liều lượng (Giữa) + Nút Bấm Xong (Phải) */}
      <div className="flex items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Image Thumbnail (if available) or Category Icon */}
        {routine.imageUrl ? (
          <button
            type="button"
            onClick={onPreviewImage}
            className="relative flex-shrink-0 w-15 h-15 sm:w-18 sm:h-18 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs cursor-pointer"
            title="Bấm để phóng to hình ảnh thuốc"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={routine.imageUrl}
              alt={routine.title}
              className="w-full h-full object-cover group-hover:scale-105 transition"
            />
            <span className="absolute bottom-0 inset-x-0 bg-slate-900/75 text-white text-[10px] font-bold py-0.5 text-center flex items-center justify-center gap-0.5">
              <ZoomIn className="w-2.5 h-2.5" />
              <span>Phóng to</span>
            </span>
          </button>
        ) : (
          <div
            className={`flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center ${
              isDone
                ? 'bg-emerald-600 border-emerald-700'
                : `${categoryConfig.bgColor} border-slate-200/80`
            }`}
          >
            <IconComponent
              className={`w-5 h-5 ${isDone ? 'text-white' : categoryConfig.color}`}
            />
          </div>
        )}

        {/* Center: Title + Dosage + Done timestamp */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p
            className={`text-base sm:text-lg font-extrabold leading-snug break-words ${
              isDone ? 'text-emerald-950' : 'text-slate-900'
            }`}
          >
            {routine.title}
          </p>

          {/* Dosage + Done timestamp */}
          {(routine.dosage || (isDone && log?.doneAt)) && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {routine.dosage && (
                <span
                  className={`inline-block text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-md border ${
                    isDone
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-teal-50 text-teal-900 border-teal-200'
                  }`}
                >
                  Liều: {routine.dosage}
                </span>
              )}

              {isDone && log?.doneAt && (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 inline-block px-2 py-0.5 rounded-md">
                  ✓ {log.doneAt}
                  {log.doneBy ? ` • ${log.doneBy}` : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Nút Bấm Xong rõ ràng, chuẩn màu y tế */}
        <button
          onClick={onToggle}
          disabled={isLoading}
          className={`flex-shrink-0 min-h-[52px] min-w-[74px] sm:min-w-[84px] px-2.5 sm:px-3 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer border ${
            isLoading
              ? 'bg-slate-100 border-slate-300 cursor-wait text-slate-600'
              : isDone
                ? 'bg-emerald-600 border-emerald-700 shadow-2xs hover:bg-emerald-700 text-white'
                : 'bg-teal-50/70 border-teal-300 hover:border-teal-600 hover:bg-teal-600 hover:text-white text-teal-900'
          }`}
          aria-label={isDone ? 'Bỏ tích hoàn thành' : 'Tích hoàn thành'}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-slate-300 border-t-teal-700 rounded-full animate-spin" />
          ) : isDone ? (
            <>
              <Check className="w-5 h-5 text-white" strokeWidth={3} />
              <span className="text-xs font-extrabold leading-tight whitespace-nowrap">Đã Xong</span>
            </>
          ) : (
            <>
              <Circle className="w-5 h-5 opacity-75" strokeWidth={2.2} />
              <span className="text-xs font-extrabold leading-tight whitespace-nowrap">Bấm Xong</span>
            </>
          )}
        </button>
      </div>

      {/* TẦNG 2: Gộp Cách dùng & Công dụng vào 1 khung thông tin y khoa gọn sạch */}
      {(hasInfoBlock || routine.conditionNote) && (
        <div className="w-full space-y-1.5 pt-0.5">
          {hasInfoBlock && (
            <div
              onClick={isLongDesc ? () => setDescExpanded((prev) => !prev) : undefined}
              className={`w-full px-3 py-2 rounded-xl border space-y-1 ${
                isLongDesc ? 'cursor-pointer select-none' : ''
              } ${
                isDone
                  ? 'bg-emerald-100/40 border-emerald-200/80'
                  : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              {/* Hướng dẫn cách uống / cách tập */}
              {routine.instructions && (
                <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                  👉 {routine.instructions}
                </p>
              )}

              {/* Mô tả nhận diện thuốc / công dụng */}
              {routine.description && (
                <div>
                  <p
                    className={`text-xs sm:text-sm font-normal text-slate-600 leading-relaxed ${
                      isLongDesc && !descExpanded ? 'line-clamp-2' : ''
                    }`}
                  >
                    🔍 {routine.description}
                  </p>
                  {isLongDesc && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDescExpanded((prev) => !prev);
                      }}
                      className="mt-1 text-xs font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {descExpanded ? 'Thu gọn ▲' : 'Xem thêm công dụng ▼'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Lưu ý điều kiện dùng thuốc — giữ màu vàng cảnh báo chuẩn y khoa */}
          {routine.conditionNote && (
            <div className="w-full px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl">
              <p className="text-xs sm:text-sm text-amber-900 font-bold leading-snug">
                ⚠️ {routine.conditionNote}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
