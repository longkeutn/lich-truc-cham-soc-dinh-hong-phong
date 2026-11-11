'use client';

import React from 'react';
import type { HealthProfileType } from '@/lib/types';
import {
  getQuickNoteTagsForProfile,
  isQuickNoteTagSelected,
  toggleQuickNoteTag,
  type VitalsQuickNoteTag,
} from '@/lib/config';
import { CRANIOPLASTY_FLAP_TAGS } from '@/lib/adaptiveProfileConfig';

export interface VitalsSymptomSelectorProps {
  profileType: HealthProfileType;
  patientDisplayName: string;
  note: string;
  onChangeNote: React.Dispatch<React.SetStateAction<string>>;
}

export function VitalsSymptomSelector({
  profileType,
  patientDisplayName,
  note,
  onChangeNote,
}: VitalsSymptomSelectorProps) {
  const isPostStroke = profileType === 'post_stroke_cranioplasty';
  const quickNoteTags = getQuickNoteTagsForProfile(profileType);

  const renderTagButton = (tag: VitalsQuickNoteTag) => {
    const selected = isQuickNoteTagSelected(note, tag.value);
    const activeClass =
      tag.tone === 'warn'
        ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
        : tag.tone === 'good'
          ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
          : 'bg-teal-700 text-white border-teal-800 shadow-2xs';
    const idleClass =
      tag.tone === 'warn'
        ? 'bg-white hover:bg-amber-50 text-amber-950 border-amber-300'
        : tag.tone === 'good'
          ? 'bg-white hover:bg-emerald-50 text-emerald-900 border-emerald-200'
          : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200';

    return (
      <button
        key={tag.id}
        type="button"
        onClick={() => onChangeNote((prev) => toggleQuickNoteTag(prev, tag.value))}
        className={`min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer active:scale-95 inline-flex items-center ${
          selected ? activeClass : idleClass
        }`}
      >
        {tag.label}
      </button>
    );
  };

  const allDisplayedTags = isPostStroke
    ? [...CRANIOPLASTY_FLAP_TAGS, ...quickNoteTags]
    : quickNoteTags;

  const activeWarnTags = allDisplayedTags.filter(
    (t, index, arr) =>
      t.tone === 'warn' &&
      Boolean(t.clinicalTip) &&
      isQuickNoteTagSelected(note, t.value) &&
      arr.findIndex((x) => x.value === t.value) === index
  );

  return (
    <div className="rounded-2xl bg-slate-50/80 border border-slate-200/90 p-3 space-y-2.5">
      {isPostStroke && (
        <div className="space-y-2 pb-2.5 border-b border-slate-200/80">
          <div className="text-xs sm:text-sm font-extrabold text-teal-950">
            🧠 Kiểm tra nhanh vùng khuyết sọ &amp; dấu hiệu thần kinh (1 chạm):
          </div>
          <div className="flex flex-wrap gap-2">
            {CRANIOPLASTY_FLAP_TAGS.map(renderTagButton)}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs sm:text-sm font-extrabold text-slate-800">
          🏷️{' '}
          {isPostStroke
            ? 'Tình trạng sinh hoạt & phục hồi trong ngày'
            : `Chạm chọn nhanh tình trạng của ${patientDisplayName}`}{' '}
          <span className="font-normal text-slate-600">(tự điền vào ô Ghi chú)</span>:
        </span>
        {note.trim() && (
          <button
            type="button"
            onClick={() => onChangeNote('')}
            className="min-h-[48px] min-w-[48px] px-2.5 rounded-lg text-xs font-bold text-slate-600 hover:text-rose-700 cursor-pointer"
          >
            Xóa ghi chú ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">{quickNoteTags.map(renderTagButton)}</div>

      {activeWarnTags.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs sm:text-sm text-amber-950 space-y-1.5">
          {activeWarnTags.map((wt) => (
            <div key={wt.id} className="leading-relaxed">
              <strong>💡 Lưu ý ({wt.value}):</strong> {wt.clinicalTip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
