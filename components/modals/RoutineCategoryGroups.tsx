'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pill,
  Plus,
  Stethoscope,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import type { CareRoutine, LabResultEntry, RoutineCategory, TimeSlot } from '@/lib/types';
import { TIME_SLOT_CONFIG, extractRoutineStartDateStr, getVietnamDateStr } from '@/lib/config';
import { formatCompactDayMonth, getRoutineCourseProgress } from '@/lib/medicalVisitUtils';
import { CATEGORY_CONFIG, TIME_SLOT_PILL_COLORS } from './routineManagerUtils';

interface RoutineCategoryGroupsProps {
  stageName?: string;
  stageRoutines: CareRoutine[];
  groupedRoutines: Record<RoutineCategory, CareRoutine[]>;
  visitEntries?: LabResultEntry[];
  confirmDeleteId: string | null;
  isSaving: boolean;
  onStartAddNew: () => void;
  onOpenAddVisit?: () => void;
  onStartEdit: (routine: CareRoutine) => void;
  onToggleActive: (routine: CareRoutine) => void;
  onSetConfirmDeleteId: (id: string | null) => void;
  onDelete: (id: string) => void;
  onSoftDelete: (routine: CareRoutine) => void;
  onPreviewLightbox: (item: { url: string; title: string; description?: string }) => void;
}

export default function RoutineCategoryGroups({
  stageName,
  stageRoutines,
  groupedRoutines,
  visitEntries = [],
  confirmDeleteId,
  isSaving,
  onStartAddNew,
  onOpenAddVisit,
  onStartEdit,
  onToggleActive,
  onSetConfirmDeleteId,
  onDelete,
  onSoftDelete,
  onPreviewLightbox,
}: RoutineCategoryGroupsProps) {
  const [showArchived, setShowArchived] = useState(false);
  const todayStr = getVietnamDateStr();

  const visitMap = useMemo(
    () => new Map(visitEntries.map((v) => [v.id, v])),
    [visitEntries]
  );

  const { activeByCat, archivedItems } = useMemo(() => {
    const active: Record<RoutineCategory, CareRoutine[]> = {
      meds: [],
      rehab: [],
      care: [],
    };
    const archived: CareRoutine[] = [];
    for (const cat of ['meds', 'rehab', 'care'] as RoutineCategory[]) {
      for (const r of groupedRoutines[cat]) {
        const progress =
          r.durationDays || r.endDate ? getRoutineCourseProgress(r, todayStr) : null;
        if (!r.isActive || progress?.isExpired) {
          archived.push(r);
        } else {
          active[cat].push(r);
        }
      }
    }
    return { activeByCat: active, archivedItems: archived };
  }, [groupedRoutines, todayStr]);

  const renderRoutineCard = (routine: CareRoutine) => {
    const isConfirming = confirmDeleteId === routine.id;
    const startStr = extractRoutineStartDateStr(routine.createdAt, routine.id);
    const startParts = startStr ? startStr.split('-') : null;
    const courseProgress =
      routine.durationDays || routine.endDate
        ? getRoutineCourseProgress(routine, todayStr)
        : null;
    const linkedVisit = routine.visitId ? visitMap.get(routine.visitId) : undefined;

    return (
      <div
        key={routine.id}
        className={`p-3 sm:p-3.5 rounded-2xl border transition space-y-2 ${
          routine.isActive && !courseProgress?.isExpired
            ? 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
            : 'bg-slate-50/70 dark:bg-slate-900/30 border-slate-200/70 opacity-80'
        }`}
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1">
            <GripVertical size={16} className="text-slate-300 mt-1 flex-shrink-0 hidden sm:block" />
            {routine.imageUrl && (
              <button
                type="button"
                onClick={() =>
                  onPreviewLightbox({
                    url: routine.imageUrl!,
                    title: routine.title,
                    description: routine.description,
                  })
                }
                aria-label={`Xem ảnh lớn của ${routine.title}`}
                className="min-h-[48px] min-w-[48px] w-12 h-12 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100 hover:ring-2 hover:ring-violet-400 transition"
                title="Bấm để xem ảnh lớn"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={routine.imageUrl}
                  alt={routine.title}
                  className="w-full h-full object-cover"
                />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 break-words">
                  {routine.title}
                </h5>
                {!routine.isActive && (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-bold">
                    Tạm ngưng
                  </span>
                )}
                {routine.medType === 'as_needed' && (
                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                    ⚡ Khi cần
                  </span>
                )}
                {routine.visitId && (
                  <span className="px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-900 text-[10px] font-bold border border-teal-200">
                    🩺 Đợt khám{linkedVisit?.date ? ` ${formatCompactDayMonth(linkedVisit.date)}` : ''}
                  </span>
                )}
              </div>
              {routine.dosage && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                  💊 Liều: {routine.dosage}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {(Array.isArray(routine.timeSlots) ? routine.timeSlots : [])
                  .filter((slot): slot is TimeSlot => Boolean(TIME_SLOT_CONFIG[slot as TimeSlot]))
                  .map((slot) => (
                    <span
                      key={slot}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                        TIME_SLOT_PILL_COLORS[slot] || 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {TIME_SLOT_CONFIG[slot]?.emoji} {TIME_SLOT_CONFIG[slot]?.label}
                    </span>
                  ))}
                {startParts && startParts.length === 3 && (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    📅 Từ {startParts[2]}/{startParts[1]}/{startParts[0]}
                  </span>
                )}
                {courseProgress?.badgeText && (
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      courseProgress.isExpired
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    }`}
                  >
                    ⏳ {courseProgress.badgeText}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isConfirming && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => onToggleActive(routine)}
                aria-label={routine.isActive ? `Tạm ngưng ${routine.title}` : `Kích hoạt lại ${routine.title}`}
                className={`min-h-[48px] min-w-[48px] rounded-xl flex items-center justify-center text-xs transition ${
                  routine.isActive
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={routine.isActive ? 'Tạm ngưng' : 'Kích hoạt lại'}
              >
                {routine.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              </button>
              <button
                type="button"
                onClick={() => onStartEdit(routine)}
                aria-label={`Sửa ${routine.title}`}
                className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition"
                title="Sửa"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => onSetConfirmDeleteId(routine.id)}
                aria-label={`Xoá ${routine.title}`}
                className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-600 flex items-center justify-center text-xs transition"
                title="Xoá"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {routine.description && (
          <p className="w-full text-xs text-indigo-800 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 line-clamp-2 leading-relaxed">
            🔍 {routine.description}
          </p>
        )}
        {routine.instructions && (
          <p className="w-full text-xs text-slate-700 dark:text-slate-300 px-1 leading-relaxed">
            💡 {routine.instructions}
          </p>
        )}
        {routine.conditionNote && (
          <p className="w-full text-xs font-bold text-amber-950 bg-amber-50/90 border border-amber-200 px-2.5 py-1.5 rounded-xl leading-relaxed">
            ⚠️ {routine.conditionNote}
          </p>
        )}

        {isConfirming && (
          <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex-wrap">
            <span className="text-[11px] font-bold text-rose-600 mr-auto">
              Bạn muốn xoá hay tạm ngưng?
            </span>
            <button
              type="button"
              onClick={() => onDelete(routine.id)}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition min-h-[48px] min-w-[48px]"
            >
              Xoá hẳn!
            </button>
            <button
              type="button"
              onClick={() => onSoftDelete(routine)}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-400 transition min-h-[48px] min-w-[48px]"
            >
              Tạm ngưng
            </button>
            <button
              type="button"
              onClick={() => onSetConfirmDeleteId(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 min-h-[48px] min-w-[48px]"
            >
              Huỷ
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          {stageName || 'Đầu việc chăm sóc'} ({stageRoutines.length - archivedItems.length} đang áp dụng)
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenAddVisit && (
            <button
              type="button"
              onClick={onOpenAddVisit}
              className="px-3 py-2 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition flex items-center gap-1.5 min-h-[48px] min-w-[48px] cursor-pointer"
            >
              <Stethoscope size={14} /> Ghi đơn khám mới
            </button>
          )}
          <button
            type="button"
            onClick={onStartAddNew}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800 transition flex items-center gap-1.5 min-h-[48px] min-w-[48px] cursor-pointer"
          >
            <Plus size={14} /> Thêm mới
          </button>
        </div>
      </div>

      {stageRoutines.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Pill size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">Chưa có đầu việc nào</p>
          <p className="text-xs mt-1">Bấm &quot;Thêm mới&quot; để tạo thuốc hoặc bài tập</p>
        </div>
      )}

      {(Object.entries(CATEGORY_CONFIG) as [RoutineCategory, typeof CATEGORY_CONFIG.meds][]).map(
        ([cat, cfg]) => {
          const items = activeByCat[cat];
          if (items.length === 0) return null;
          return (
            <div key={cat} className="space-y-2">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${cfg.color} flex items-center gap-1.5`}>
                {cfg.emoji} {cfg.label} ({items.length})
              </h4>
              <div className="space-y-2">{items.map(renderRoutineCard)}</div>
            </div>
          );
        }
      )}

      {archivedItems.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-bold flex items-center justify-between cursor-pointer transition"
          >
            <span>📦 Đã hết đợt / Đã tạm ngưng ({archivedItems.length})</span>
            {showArchived ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {showArchived && (
            <div className="space-y-2">{archivedItems.map(renderRoutineCard)}</div>
          )}
        </div>
      )}
    </div>
  );
}
