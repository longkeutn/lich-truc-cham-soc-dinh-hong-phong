'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import type { FamilyMember, HealthProfileType, ReminderCategory } from '@/lib/types';
import { getReminderPresetsForProfile } from '@/lib/adaptiveProfileConfig';

export const REMINDER_CATEGORY_LABELS: Record<ReminderCategory, string> = {
  meds: '💊 Liều thuốc',
  condition: '🩺 Tình trạng',
  doctor: '👨‍⚕️ Bác sĩ dặn',
  feeding: '🍲 Dinh dưỡng',
  general: '📌 Lưu ý chung',
};

export interface ReminderFormCardProps {
  editingId: string | null;
  category: ReminderCategory;
  title: string;
  content: string;
  author: string;
  isUrgent: boolean;
  error: string;
  members: FamilyMember[];
  profileType: HealthProfileType;
  patientDisplayName: string;
  onChangeCategory: (val: ReminderCategory) => void;
  onChangeTitle: (val: string) => void;
  onChangeContent: (val: string) => void;
  onChangeAuthor: (val: string) => void;
  onChangeUrgent: (val: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function ReminderFormCard({
  editingId,
  category,
  title,
  content,
  author,
  isUrgent,
  error,
  members,
  profileType,
  patientDisplayName,
  onChangeCategory,
  onChangeTitle,
  onChangeContent,
  onChangeAuthor,
  onChangeUrgent,
  onSubmit,
  onCancel,
}: ReminderFormCardProps) {
  const presets = getReminderPresetsForProfile(profileType, patientDisplayName);

  return (
    <form
      onSubmit={onSubmit}
      className="p-3.5 sm:p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-black text-teal-950">
          {editingId
            ? '✏️ Chỉnh sửa lời nhắc chăm sóc'
            : `➕ Thêm lời nhắn / lưu ý chăm sóc cho ${patientDisplayName}`}
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Đóng biểu mẫu lời nhắc"
          className="min-h-[48px] min-w-[48px] rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Gợi ý 1 chạm thích ứng theo từng loại hồ sơ */}
      {!editingId && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-600 block">
            Chọn nhanh mẫu lưu ý:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.title}
                type="button"
                onClick={() => {
                  onChangeCategory(p.category);
                  onChangeTitle(p.title);
                  onChangeContent(p.content);
                  onChangeUrgent(p.isUrgent);
                }}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white hover:bg-teal-100/70 border border-teal-200 text-xs font-bold text-slate-800 cursor-pointer text-left"
              >
                + {p.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Nhóm lưu ý</label>
          <select
            value={category}
            onChange={(e) => onChangeCategory(e.target.value as ReminderCategory)}
            className="w-full min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
          >
            {(Object.keys(REMINDER_CATEGORY_LABELS) as ReminderCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {REMINDER_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Người nhắn</label>
          {members.length > 0 ? (
            <select
              value={author}
              onChange={(e) => onChangeAuthor(e.target.value)}
              className="w-full min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
            >
              {members.map((m) => {
                const label = `${m.name} (${m.relation})`;
                return (
                  <option key={m.id} value={label}>
                    {label}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              type="text"
              value={author}
              onChange={(e) => onChangeAuthor(e.target.value)}
              placeholder="Tên người ghi..."
              className="w-full min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
            />
          )}
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => onChangeTitle(e.target.value)}
        placeholder="Tiêu đề ngắn gọn (VD: Nhớ uống nhiều nước ấm buổi sáng)..."
        className="w-full min-h-[48px] px-3.5 rounded-xl bg-white border border-slate-300 text-sm sm:text-base font-bold text-slate-900"
      />

      <textarea
        rows={2}
        value={content}
        onChange={(e) => onChangeContent(e.target.value)}
        placeholder="Chi tiết hướng dẫn thêm cho gia đình (tuỳ chọn)..."
        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900"
      />

      {error && <p className="text-xs font-bold text-rose-700">⚠️ {error}</p>}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="inline-flex items-center gap-2 min-h-[48px] cursor-pointer text-xs sm:text-sm font-bold text-rose-800">
          <input
            type="checkbox"
            checked={isUrgent}
            onChange={(e) => onChangeUrgent(e.target.checked)}
            className="w-5 h-5 accent-rose-600 rounded"
          />
          <span>Đánh dấu Quan trọng / Khẩn</span>
        </label>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] min-w-[48px] px-4 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-700 cursor-pointer"
          >
            Huỷ
          </button>
          <button
            type="submit"
            className="min-h-[48px] min-w-[48px] px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{editingId ? 'Lưu cập nhật' : 'Lưu lời nhắc'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
