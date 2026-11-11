'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Check, Circle, Dumbbell, Heart, Pill, RotateCcw, ZoomIn } from 'lucide-react';
import type { CareRoutine, DailyLog, RoutineCategory, TimeSlot } from '@/lib/types';

const CATEGORY_ICON: Record<
  RoutineCategory,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  meds: {
    icon: Pill,
    label: 'Thuốc',
    color: 'text-teal-800',
    bgColor: 'bg-teal-50',
  },
  rehab: {
    icon: Dumbbell,
    label: 'Vận động',
    color: 'text-cyan-800',
    bgColor: 'bg-cyan-50',
  },
  care: {
    icon: Heart,
    label: 'Chăm sóc',
    color: 'text-slate-800',
    bgColor: 'bg-slate-100',
  },
};

export interface RoutineItemRowProps {
  routine: CareRoutine;
  timeSlot: TimeSlot;
  log?: DailyLog;
  isLoading: boolean;
  onToggle: (routine: CareRoutine, slot: TimeSlot) => void;
  onPreviewPhoto: (routine: CareRoutine) => void;
}

export function RoutineItemRow({
  routine,
  timeSlot,
  log,
  isLoading,
  onToggle,
  onPreviewPhoto,
}: RoutineItemRowProps) {
  const isDone = Boolean(log?.isDone);
  const catCfg = CATEGORY_ICON[routine.category] || CATEGORY_ICON.care;
  const CatIcon = catCfg.icon;

  const handlePress = () => {
    if (!isDone && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(35);
      } catch {}
    }
    onToggle(routine, timeSlot);
  };

  return (
    <motion.div
      layout="position"
      transition={{ duration: 0.16 }}
      className={`rounded-2xl border p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
        isDone
          ? 'bg-emerald-50/60 border-emerald-200/90'
          : 'bg-white border-slate-200 hover:border-teal-300'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {routine.imageUrl ? (
          <button
            type="button"
            onClick={() => onPreviewPhoto(routine)}
            title="Bấm phóng to ảnh thuốc"
            aria-label={`Xem ảnh thuốc ${routine.title}`}
            className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50 cursor-pointer group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={routine.imageUrl}
              alt={routine.title}
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-0.5 right-0.5 p-1 rounded-md bg-slate-900/70 text-white">
              <ZoomIn className="w-3 h-3" />
            </span>
          </button>
        ) : (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDone ? 'bg-emerald-100 text-emerald-700' : `${catCfg.bgColor} ${catCfg.color}`
            }`}
          >
            <CatIcon className="w-5 h-5" />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${catCfg.bgColor} ${catCfg.color}`}
            >
              {catCfg.label}
            </span>
            {routine.dosage && (
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                {routine.dosage}
              </span>
            )}
            {isDone && log?.doneAt && (
              <span className="text-xs font-bold text-emerald-800">
                ✓ Xong lúc {log.doneAt}
                {log.doneBy ? ` · ${log.doneBy}` : ''}
              </span>
            )}
          </div>

          <h4
            className={`text-sm sm:text-base font-extrabold leading-snug ${
              isDone ? 'text-slate-600 line-through' : 'text-slate-900'
            }`}
          >
            {routine.title}
          </h4>

          {routine.description && !isDone && (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {routine.description}
            </p>
          )}

          {routine.instructions && (
            <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">
              💡 {routine.instructions}
            </p>
          )}

          {routine.conditionNote && (
            <p className="text-xs sm:text-sm font-bold text-amber-950 bg-amber-50/90 border border-amber-200 rounded-xl px-2.5 py-1.5 leading-relaxed">
              ⚠️ {routine.conditionNote}
            </p>
          )}
        </div>
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        disabled={isLoading}
        onClick={handlePress}
        className={`min-h-[52px] min-w-[132px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shrink-0 border ${
          isDone
            ? 'bg-white hover:bg-slate-100 text-emerald-800 border-emerald-300'
            : 'bg-teal-700 hover:bg-teal-800 text-white border-teal-800 shadow-2xs'
        }`}
      >
        {isDone ? (
          <>
            <RotateCcw className="w-4 h-4 text-slate-600 shrink-0" />
            <span>Đã xong (Hoàn tác)</span>
          </>
        ) : (
          <>
            {isLoading ? (
              <Circle className="w-4 h-4 animate-ping shrink-0" />
            ) : (
              <Check className="w-4 h-4 shrink-0" strokeWidth={2.8} />
            )}
            <span>Bấm Tích Đã Xong</span>
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
