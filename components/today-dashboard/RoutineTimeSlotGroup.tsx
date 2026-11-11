'use client';

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { CareRoutine, DailyLog, TimeSlot } from '@/lib/types';
import { TIME_SLOT_CONFIG } from '@/lib/config';
import { RoutineItemRow } from './RoutineItemRow';

export interface RoutineTimeSlotGroupProps {
  slot: TimeSlot;
  routines: CareRoutine[];
  selectedDateStr: string;
  isCurrentSlot: boolean;
  isExpanded: boolean;
  logMap: Map<string, DailyLog>;
  loadingIds: Set<string>;
  onToggleExpand: (slot: TimeSlot) => void;
  onToggleItem: (routine: CareRoutine, slot: TimeSlot) => void;
  onPreviewPhoto: (routine: CareRoutine) => void;
}

export function RoutineTimeSlotGroup({
  slot,
  routines,
  selectedDateStr,
  isCurrentSlot,
  isExpanded,
  logMap,
  loadingIds,
  onToggleExpand,
  onToggleItem,
  onPreviewPhoto,
}: RoutineTimeSlotGroupProps) {
  if (routines.length === 0) return null;

  const cfg = TIME_SLOT_CONFIG[slot];
  const doneCount = routines.filter(
    (r) => logMap.get(`dl-${selectedDateStr}-${r.id}-${slot}`)?.isDone
  ).length;
  const allSlotDone = doneCount === routines.length;

  return (
    <div
      className={`rounded-2xl border overflow-hidden shadow-2xs transition-colors ${
        isCurrentSlot
          ? 'border-teal-400 bg-white'
          : 'border-slate-200/90 bg-white'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggleExpand(slot)}
        aria-expanded={isExpanded}
        className={`w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-2 text-left transition cursor-pointer ${
          isCurrentSlot
            ? 'bg-teal-50/80 hover:bg-teal-100/60'
            : allSlotDone
              ? 'bg-emerald-50/50 hover:bg-emerald-50'
              : 'bg-slate-50/70 hover:bg-slate-100/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl shrink-0">{cfg.emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm sm:text-base font-black text-slate-900">
                Buổi {cfg.label}
              </span>
              <span className="text-xs font-semibold text-slate-600">({cfg.timeRange})</span>
              {isCurrentSlot && (
                <span className="px-2 py-0.5 rounded-full bg-teal-700 text-white text-[11px] font-extrabold">
                  Hiện tại
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border ${
              allSlotDone
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-white text-slate-800 border-slate-200'
            }`}
          >
            {doneCount}/{routines.length} xong
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-600" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 sm:p-3.5 space-y-2.5 border-t border-slate-100">
          {routines.map((routine) => {
            const logId = `dl-${selectedDateStr}-${routine.id}-${slot}`;
            return (
              <RoutineItemRow
                key={logId}
                routine={routine}
                timeSlot={slot}
                log={logMap.get(logId)}
                isLoading={loadingIds.has(logId)}
                onToggle={onToggleItem}
                onPreviewPhoto={onPreviewPhoto}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
