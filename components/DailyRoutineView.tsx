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
      routine.timeSlots.forEach((slot) => {
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
      ? 'text-emerald-700'
      : progressPercent > 0
        ? 'text-blue-700'
        : 'text-slate-500';

  // ===== RENDER =====
  return (
    <div className="space-y-4">
      {/* ===== HEADER: Progress + Admin button ===== */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          {/* Progress text */}
          <div className="flex items-center gap-2 mb-2">
            <ListChecks className={`w-5 h-5 ${progressTextColor}`} />
            <span className={`text-base font-semibold ${progressTextColor}`}>
              Hoàn thành {doneItems}/{totalItems} đầu việc hôm nay
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
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
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-sm transition-colors min-h-[44px]"
            title="Quản lý đơn thuốc & bài tập"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Quản lý</span>
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
            className={`rounded-2xl border overflow-hidden transition-colors ${
              isCurrent
                ? 'border-blue-300 bg-blue-50/30 shadow-sm'
                : slotAllDone
                  ? 'border-emerald-200 bg-emerald-50/20'
                  : 'border-slate-200 bg-white'
            }`}
          >
            {/* Section Header — Collapsible */}
            <button
              onClick={() => toggleSection(slot)}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors min-h-[52px] ${
                isCurrent
                  ? 'bg-blue-50/80 hover:bg-blue-100/60'
                  : slotAllDone
                    ? 'bg-emerald-50/60 hover:bg-emerald-100/40'
                    : 'bg-slate-50/60 hover:bg-slate-100/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl" role="img" aria-label={slotConfig.label}>
                  {slotConfig.emoji}
                </span>
                <span className="text-base font-bold text-slate-800">
                  {slotConfig.label}
                </span>
                <span className="text-sm text-slate-500">
                  — {slotConfig.timeRange}
                </span>
                {isCurrent && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                    Hiện tại
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Slot progress mini badge */}
                <span
                  className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                    slotAllDone
                      ? 'bg-emerald-100 text-emerald-700'
                      : slotDone > 0
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {slotDone}/{slotTotal}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>

            {/* Section Body — Routine items */}
            {isExpanded && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 space-y-2.5">
                {slotRoutines.map((routine) => (
                  <RoutineItem
                    key={`${routine.id}-${slot}`}
                    routine={routine}
                    timeSlot={slot}
                    todayStr={todayStr}
                    log={logMap.get(`dl-${todayStr}-${routine.id}-${slot}`)}
                    isLoading={loadingIds.has(`dl-${todayStr}-${routine.id}-${slot}`)}
                    onToggle={() => handleToggle(routine, slot)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ===== "KHI CẦN" SECTION ===== */}
      {asNeededRoutines.length > 0 && (
        <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/30 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-amber-50/60">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              <span className="text-base font-bold text-amber-800">
                Thuốc khi cần
              </span>
              <span className="text-sm text-amber-600">
                (không theo lịch)
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
}

function RoutineItem({
  routine,
  log,
  isLoading,
  isAsNeeded,
  onToggle,
}: RoutineItemProps) {
  const isDone = log?.isDone ?? false;
  const categoryConfig = CATEGORY_ICON[routine.category];
  const IconComponent = categoryConfig.icon;

  return (
    <div
      className={`rounded-2xl border p-3 sm:p-4 flex items-start gap-3 transition-all ${
        isDone
          ? 'bg-emerald-50/60 border-emerald-200'
          : isAsNeeded
            ? 'bg-amber-50/30 border-amber-200'
            : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Left: Category Icon */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mt-0.5 ${
          isDone ? 'bg-emerald-100' : categoryConfig.bgColor
        }`}
      >
        <IconComponent
          className={`w-5 h-5 ${isDone ? 'text-emerald-600' : categoryConfig.color}`}
        />
      </div>

      {/* Center: Title + Dosage + Instructions */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <p
          className={`text-base font-bold leading-snug ${
            isDone ? 'text-emerald-800 line-through decoration-emerald-400' : 'text-slate-800'
          }`}
        >
          {routine.title}
        </p>

        {/* Dosage */}
        {routine.dosage && (
          <p
            className={`text-sm mt-0.5 ${
              isDone ? 'text-emerald-600' : 'text-slate-700'
            }`}
          >
            {routine.dosage}
          </p>
        )}

        {/* Instructions */}
        {routine.instructions && (
          <p className="text-sm text-slate-500 mt-0.5 leading-snug">
            {routine.instructions}
          </p>
        )}

        {/* Condition Note — amber mini-banner */}
        {routine.conditionNote && (
          <div className="mt-1.5 px-2.5 py-1.5 bg-amber-100 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium leading-snug">
              ⚠️ {routine.conditionNote}
            </p>
          </div>
        )}

        {/* Done timestamp */}
        {isDone && log?.doneAt && (
          <p className="text-xs text-emerald-600 mt-1.5 font-medium">
            ✅ Xong lúc {log.doneAt}
            {log.doneBy ? ` — ${log.doneBy}` : ''}
          </p>
        )}
      </div>

      {/* Right: Toggle Button (large touch target) */}
      <button
        onClick={onToggle}
        disabled={isLoading}
        className={`flex-shrink-0 min-h-[52px] min-w-[52px] rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
          isLoading
            ? 'bg-slate-100 border-2 border-slate-200 cursor-wait'
            : isDone
              ? 'bg-emerald-500 border-2 border-emerald-500 shadow-sm hover:bg-emerald-600'
              : 'bg-white border-2 border-slate-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
        aria-label={isDone ? 'Bỏ tích hoàn thành' : 'Tích hoàn thành'}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
        ) : isDone ? (
          <Check className="w-6 h-6 text-white" strokeWidth={3} />
        ) : (
          <Circle className="w-6 h-6 text-slate-300" />
        )}
      </button>
    </div>
  );
}
