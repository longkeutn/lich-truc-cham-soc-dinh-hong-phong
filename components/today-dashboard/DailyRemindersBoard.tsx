'use client';

import React from 'react';
import { Clock, Edit2, Trash2, User, Volume2, VolumeX } from 'lucide-react';
import type { PatientDailyReminder, ReminderCategory } from '@/lib/types';
import { REMINDER_CATEGORY_LABELS } from './ReminderFormCard';

const BADGE_STYLE: Record<ReminderCategory, string> = {
  meds: 'bg-amber-50 text-amber-900 border-amber-200',
  condition: 'bg-rose-50 text-rose-900 border-rose-200',
  doctor: 'bg-sky-50 text-sky-900 border-sky-200',
  feeding: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  general: 'bg-indigo-50 text-indigo-900 border-indigo-200',
};

export interface DailyRemindersBoardProps {
  reminders: PatientDailyReminder[];
  speakingId: string | null;
  onSpeakSingle: (item: PatientDailyReminder) => void;
  onEditReminder: (item: PatientDailyReminder) => void;
  onDeleteReminder: (item: PatientDailyReminder) => void;
}

export function DailyRemindersBoard({
  reminders,
  speakingId,
  onSpeakSingle,
  onEditReminder,
  onDeleteReminder,
}: DailyRemindersBoardProps) {
  if (reminders.length === 0) {
    return (
      <p className="text-xs sm:text-sm text-slate-600 font-medium py-1">
        Chưa có bảng tin dặn dò riêng nào. Bấm <strong>Thêm lời nhắn</strong> để ghi chú dặn người nhà.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {reminders.map((rem) => {
        const isSpeakingThis = speakingId === rem.id;
        return (
          <div
            key={rem.id}
            className={`rounded-2xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
              rem.isUrgent
                ? 'bg-rose-50/60 border-rose-200'
                : 'bg-slate-50/70 border-slate-200'
            }`}
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-md border ${
                    BADGE_STYLE[rem.category] || BADGE_STYLE.general
                  }`}
                >
                  {REMINDER_CATEGORY_LABELS[rem.category] || '📌 Lưu ý'}
                </span>
                {rem.isUrgent && (
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-rose-600 text-white">
                    Quan trọng
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{rem.author}</span>
                </span>
                {rem.time && (
                  <span className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{rem.time}</span>
                  </span>
                )}
              </div>

              <div className="text-sm sm:text-base font-extrabold text-slate-900">
                {rem.title}
              </div>
              {rem.content && rem.content !== rem.title && (
                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  {rem.content}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onSpeakSingle(rem)}
                aria-label="Nghe đọc lời nhắn"
                className={`min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center transition cursor-pointer ${
                  isSpeakingThis
                    ? 'bg-rose-600 text-white border-rose-700'
                    : 'bg-white hover:bg-teal-50 text-teal-800 border-slate-200'
                }`}
              >
                {isSpeakingThis ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onEditReminder(rem)}
                aria-label="Sửa lời nhắn"
                className="min-h-[48px] min-w-[48px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteReminder(rem)}
                aria-label="Xoá lời nhắn"
                className="min-h-[48px] min-w-[48px] rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 flex items-center justify-center cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
