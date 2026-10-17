'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Pill,
  Dumbbell,
  Heart,
  Check,
  ChevronDown,
  ChevronUp,
  Settings,
  Circle,
  Zap,
  ListChecks,
  X,
  ZoomIn,
} from 'lucide-react';
import { CareRoutine, DailyLog, TimeSlot, RoutineCategory } from '@/lib/types';
import { TIME_SLOT_CONFIG, detectCurrentTimeSlot, DEFAULT_RECORDER } from '@/lib/config';

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
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  rehab: {
    icon: Dumbbell,
    label: 'Tập phục hồi',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  care: {
    icon: Heart,
    label: 'Chăm sóc',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
};

// ===== TIME SLOTS ORDER =====
const TIME_SLOT_ORDER: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];

// ===== HELPER: format current time as HH:mm =====
function getCurrentHHmm(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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
  // Detect current time slot for auto-expand
  const currentSlot = useMemo(() => detectCurrentTimeSlot(), []);

  // Track which sections are expanded (current slot open by default)
  const [expandedSlots, setExpandedSlots] = useState<Record<TimeSlot, boolean>>(() => {
    const initial: Record<TimeSlot, boolean> = {
      morning: false,
      noon: false,
      afternoon: false,
      evening: false,
    };
    initial[currentSlot] = true;
    return initial;
  });

  // Loading state per item to prevent double-tap
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // Lightbox xem ảnh thuốc lớn cho Mẹ
  const [previewRoutine, setPreviewRoutine] = useState<CareRoutine | null>(null);

  // ===== DERIVED DATA =====

  // Active scheduled routines only (exclude as_needed which go to separate section)
  const scheduledRoutines = useMemo(
    () => routines.filter((r) => r.isActive && r.medType !== 'as_needed'),
    [routines]
  );

  // "Khi cần" (as_needed) routines
  const asNeededRoutines = useMemo(
    () => routines.filter((r) => r.isActive && r.medType === 'as_needed'),
    [routines]
  );

  // Build a quick lookup: logId → DailyLog
  const logMap = useMemo(() => {
    const map = new Map<string, DailyLog>();
    dailyLogs.forEach((log) => map.set(log.id, log));
    return map;
  }, [dailyLogs]);

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

  // Count total scheduled items and done items for progress bar
  const { totalItems, doneItems } = useMemo(() => {
    let total = 0;
    let done = 0;
    TIME_SLOT_ORDER.forEach((slot) => {
      routinesBySlot[slot].forEach((routine) => {
        total++;
        const logId = `dl-${todayStr}-${routine.id}-${slot}`;
        const log = logMap.get(logId);
        if (log?.isDone) done++;
      });
    });
    return { totalItems: total, doneItems: done };
  }, [routinesBySlot, todayStr, logMap]);

  // Progress percentage
  const progressPercent = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  // ===== TOGGLE HANDLER =====
  const handleToggle = useCallback(
    async (routine: CareRoutine, timeSlot: TimeSlot) => {
      const logId = `dl-${todayStr}-${routine.id}-${timeSlot}`;

      // Prevent double-tap
      if (loadingIds.has(logId)) return;

      setLoadingIds((prev) => new Set(prev).add(logId));

      const existingLog = logMap.get(logId);
      const isCurrentlyDone = existingLog?.isDone ?? false;

      const newLog: DailyLog = {
        id: logId,
        date: todayStr,
        routineId: routine.id,
        timeSlot,
        isDone: !isCurrentlyDone,
        doneAt: !isCurrentlyDone ? getCurrentHHmm() : undefined,
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
    [todayStr, logMap, loadingIds, defaultRecorder, onToggle]
  );

  // ===== TOGGLE SECTION EXPAND =====
  const toggleSection = useCallback((slot: TimeSlot) => {
    setExpandedSlots((prev) => ({ ...prev, [slot]: !prev[slot] }));
  }, []);

  // ===== PROGRESS BAR COLOR =====
  const progressBarColor =
    progressPercent === 100
      ? 'bg-emerald-500'
      : progressPercent > 0
        ? 'bg-blue-500'
        : 'bg-slate-300';

  const progressTextColor =
    progressPercent === 100
      ? 'text-emerald-800'
      : progressPercent > 0
        ? 'text-blue-800'
        : 'text-slate-800';

  // ===== RENDER =====
  return (
    <div className="space-y-4">
      {/* ===== HEADER: Progress + Admin button ===== */}
      <div className="rounded-3xl border-2 border-slate-300 bg-white p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          {/* Progress text */}
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className={`w-6 h-6 shrink-0 ${progressTextColor}`} />
            <span className={`text-base sm:text-lg font-black ${progressTextColor}`}>
              Đã làm {doneItems}/{totalItems} việc hôm nay ({progressPercent}%)
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-4 bg-slate-200 border border-slate-300 rounded-full overflow-hidden">
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
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-sm transition-colors min-h-[48px] cursor-pointer"
            title="Quản lý đơn thuốc & bài tập"
          >
            <Settings className="w-5 h-5 text-slate-800" />
            <span>Sửa Thuốc / Bài Tập</span>
          </button>
        )}
      </div>

      {/* ===== 4 TIME PERIOD SECTIONS ===== */}
      {TIME_SLOT_ORDER.map((slot) => {
        const slotConfig = TIME_SLOT_CONFIG[slot];
        const slotRoutines = routinesBySlot[slot];
        const isExpanded = expandedSlots[slot];
        const isCurrent = slot === currentSlot;

        // Count done in this slot
        const slotDone = slotRoutines.filter((r) => {
          const logId = `dl-${todayStr}-${r.id}-${slot}`;
          return logMap.get(logId)?.isDone;
        }).length;
        const slotTotal = slotRoutines.length;
        const slotAllDone = slotTotal > 0 && slotDone === slotTotal;

        if (slotTotal === 0) return null; // Skip empty slots

        return (
          <div
            key={slot}
            className={`rounded-3xl border-2 overflow-hidden transition-colors shadow-xs ${
              isCurrent
                ? 'border-blue-600 bg-blue-50/40'
                : slotAllDone
                  ? 'border-emerald-600 bg-emerald-50/30'
                  : 'border-slate-300 bg-white'
            }`}
          >
            {/* Section Header — Collapsible */}
            <button
              onClick={() => toggleSection(slot)}
              className={`w-full flex items-center justify-between px-4 py-4 text-left transition-colors min-h-[60px] cursor-pointer ${
                isCurrent
                  ? 'bg-blue-100/90 hover:bg-blue-200/70'
                  : slotAllDone
                    ? 'bg-emerald-100/80 hover:bg-emerald-200/60'
                    : 'bg-slate-100 hover:bg-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-2xl" role="img" aria-label={slotConfig.label}>
                  {slotConfig.emoji}
                </span>
                <span className="text-lg font-black text-slate-950">
                  Buổi {slotConfig.label}
                </span>
                <span className="text-sm font-bold text-slate-700">
                  ({slotConfig.timeRange})
                </span>
                {isCurrent && (
                  <span className="px-2.5 py-0.5 text-xs font-black bg-blue-700 text-white rounded-lg">
                    ĐANG Ở CA NÀY
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Slot progress mini badge */}
                <span
                  className={`text-sm font-black px-3 py-1 rounded-xl border ${
                    slotAllDone
                      ? 'bg-emerald-700 text-white border-emerald-900'
                      : slotDone > 0
                        ? 'bg-blue-700 text-white border-blue-900'
                        : 'bg-white text-slate-900 border-slate-300'
                  }`}
                >
                  {slotAllDone ? `✅ Đủ ${slotDone}/${slotTotal}` : `${slotDone}/${slotTotal} việc`}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-6 h-6 text-slate-800" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-slate-800" />
                )}
              </div>
            </button>

            {/* Section Body — Routine items */}
            {isExpanded && (
              <div className="px-3 sm:px-4 pb-4 pt-3 space-y-3">
                {slotRoutines.map((routine) => (
                  <RoutineItem
                    key={`${routine.id}-${slot}`}
                    routine={routine}
                    timeSlot={slot}
                    todayStr={todayStr}
                    log={logMap.get(`dl-${todayStr}-${routine.id}-${slot}`)}
                    isLoading={loadingIds.has(`dl-${todayStr}-${routine.id}-${slot}`)}
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
        <div className="rounded-3xl border-2 border-amber-500 bg-amber-50/50 overflow-hidden shadow-xs">
          {/* Header */}
          <div className="px-4 py-3.5 bg-amber-200/70 border-b border-amber-300">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-900" />
              <span className="text-lg font-black text-amber-950">
                Thuốc Dùng Khi Cần
              </span>
              <span className="text-sm font-bold text-amber-900">
                (Chỉ uống khi có triệu chứng)
              </span>
            </div>
          </div>
          {/* Items */}
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 space-y-2.5">
            {asNeededRoutines
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((routine) => {
                // as_needed items don't belong to a specific slot; use a special key
                const asNeededSlot: TimeSlot = 'morning'; // fallback slot for ID
                const logId = `dl-${todayStr}-${routine.id}-as_needed`;
                // Check if there's a log for today (use custom id for as_needed)
                const log = dailyLogs.find((l) => l.id === logId);
                const isLoading = loadingIds.has(logId);

                return (
                  <RoutineItem
                    key={routine.id}
                    routine={routine}
                    timeSlot={asNeededSlot}
                    todayStr={todayStr}
                    log={log}
                    isLoading={isLoading}
                    isAsNeeded
                    onPreviewImage={() => setPreviewRoutine(routine)}
                    onToggle={async () => {
                      if (isLoading) return;
                      setLoadingIds((prev) => new Set(prev).add(logId));
                      const isCurrentlyDone = log?.isDone ?? false;
                      const newLog: DailyLog = {
                        id: logId,
                        date: todayStr,
                        routineId: routine.id,
                        timeSlot: asNeededSlot,
                        isDone: !isCurrentlyDone,
                        doneAt: !isCurrentlyDone ? getCurrentHHmm() : undefined,
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewRoutine(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-slate-100 flex items-center justify-center max-h-[60vh] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewRoutine.imageUrl}
                alt={previewRoutine.title}
                className="w-full h-auto max-h-[60vh] object-contain"
              />
              <button
                type="button"
                onClick={() => setPreviewRoutine(null)}
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
                aria-label="Đóng ảnh"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-lg font-black text-slate-900">
                  {previewRoutine.title}
                </h4>
                {previewRoutine.dosage && (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-sm font-bold flex-shrink-0">
                    {previewRoutine.dosage}
                  </span>
                )}
              </div>
              {previewRoutine.description && (
                <p className="text-sm font-medium text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-2 rounded-xl">
                  🔍 {previewRoutine.description}
                </p>
              )}
              {previewRoutine.instructions && (
                <p className="text-sm text-slate-600">
                  💡 {previewRoutine.instructions}
                </p>
              )}
              {previewRoutine.conditionNote && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium">
                  ⚠️ {previewRoutine.conditionNote}
                </p>
              )}
              <button
                type="button"
                onClick={() => setPreviewRoutine(null)}
                className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition"
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

  return (
    <div
      className={`rounded-2xl border-2 p-3.5 sm:p-4 flex items-start gap-3 transition-all ${
        isDone
          ? 'bg-emerald-50 border-emerald-500 shadow-2xs'
          : isAsNeeded
            ? 'bg-white border-amber-400'
            : 'bg-white border-slate-300 hover:border-slate-400 shadow-2xs'
      }`}
    >
      {/* Left: Image Thumbnail (if available) or Category Icon */}
      {routine.imageUrl ? (
        <button
          type="button"
          onClick={onPreviewImage}
          className="relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-blue-500 bg-slate-100 mt-0.5 group shadow-xs cursor-pointer"
          title="Bấm để phóng to hình ảnh thuốc"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={routine.imageUrl}
            alt={routine.title}
            className="w-full h-full object-cover group-hover:scale-105 transition"
          />
          <span className="absolute bottom-0 inset-x-0 bg-black/75 text-white text-[10px] font-black py-0.5 text-center flex items-center justify-center gap-0.5">
            <ZoomIn className="w-3 h-3" />
            <span>Xem ảnh</span>
          </span>
        </button>
      ) : (
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-2xl border flex items-center justify-center mt-0.5 ${
            isDone
              ? 'bg-emerald-700 border-emerald-900'
              : `${categoryConfig.bgColor} border-slate-300`
          }`}
        >
          <IconComponent
            className={`w-6 h-6 ${isDone ? 'text-white' : categoryConfig.color}`}
          />
        </div>
      )}

      {/* Center: Title + Dosage + Description + Instructions */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <p
          className={`text-base sm:text-lg font-black leading-snug ${
            isDone ? 'text-emerald-950' : 'text-slate-950'
          }`}
        >
          {routine.title}
        </p>

        {/* Dosage */}
        {routine.dosage && (
          <div className="mt-1">
            <span
              className={`inline-block text-sm font-black px-2.5 py-0.5 rounded-lg border ${
                isDone
                  ? 'bg-emerald-200 text-emerald-950 border-emerald-400'
                  : 'bg-amber-100 text-amber-950 border-amber-400'
              }`}
            >
              💊 Liều: {routine.dosage}
            </span>
          </div>
        )}

        {/* Description (Mô tả nhận diện thuốc / công dụng) */}
        {routine.description && (
          <p
            className={`text-sm font-bold mt-1.5 px-3 py-1.5 rounded-xl border leading-snug ${
              isDone
                ? 'bg-emerald-100/80 border-emerald-300 text-emerald-950'
                : 'bg-indigo-50 border-indigo-300 text-indigo-950'
            }`}
          >
            🔍 {routine.description}
          </p>
        )}

        {/* Instructions */}
        {routine.instructions && (
          <p className="text-sm font-bold text-slate-800 mt-1.5 leading-snug">
            👉 {routine.instructions}
          </p>
        )}

        {/* Condition Note — amber mini-banner */}
        {routine.conditionNote && (
          <div className="mt-2 px-3 py-1.5 bg-amber-100 border-2 border-amber-400 rounded-xl">
            <p className="text-sm text-amber-950 font-black leading-snug">
              ⚠️ {routine.conditionNote}
            </p>
          </div>
        )}

        {/* Done timestamp */}
        {isDone && log?.doneAt && (
          <p className="text-xs sm:text-sm text-emerald-900 mt-2 font-black bg-emerald-100 border border-emerald-300 inline-block px-2.5 py-0.5 rounded-lg">
            ✅ Đã xong lúc {log.doneAt}
            {log.doneBy ? ` • ${log.doneBy}` : ''}
          </p>
        )}
      </div>

      {/* Right: Nút Bấm Xong TO, CÓ CHỮ RÕ RÀNG CHO NGƯỜI LỚN TUỔI */}
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={`flex-shrink-0 min-h-[58px] px-3 sm:px-4 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer border-2 ${
          isLoading
            ? 'bg-slate-200 border-slate-400 cursor-wait text-slate-700'
            : isDone
              ? 'bg-emerald-700 border-emerald-900 shadow-sm hover:bg-emerald-800 text-white'
              : 'bg-slate-100 border-slate-400 hover:border-emerald-600 hover:bg-emerald-50 text-slate-950'
        }`}
        aria-label={isDone ? 'Bỏ tích hoàn thành' : 'Tích hoàn thành'}
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
        ) : isDone ? (
          <>
            <Check className="w-6 h-6 text-white" strokeWidth={3} />
            <span className="text-xs font-black leading-tight">Đã Xong</span>
          </>
        ) : (
          <>
            <Circle className="w-6 h-6 text-slate-700" strokeWidth={2.5} />
            <span className="text-xs font-black leading-tight">Bấm Xong</span>
          </>
        )}
      </button>
    </div>
  );
}
