'use client';

import React from 'react';

export const MEMBER_COLOR_THEMES = [
  {
    id: 'blue',
    label: 'Xanh lam',
    badgeColor: 'bg-blue-600',
    bgLight: 'bg-blue-50/90',
    borderLight: 'border-blue-300',
    textColor: 'text-blue-900',
    accentColor: 'bg-blue-600 text-white',
    pillBadge: 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
    previewBg: 'bg-blue-600',
  },
  {
    id: 'emerald',
    label: 'Xanh ngọc',
    badgeColor: 'bg-emerald-600',
    bgLight: 'bg-emerald-50/90',
    borderLight: 'border-emerald-300',
    textColor: 'text-emerald-900',
    accentColor: 'bg-emerald-600 text-white',
    pillBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    previewBg: 'bg-emerald-600',
  },
  {
    id: 'indigo',
    label: 'Chàm tím',
    badgeColor: 'bg-indigo-600',
    bgLight: 'bg-indigo-50/90',
    borderLight: 'border-indigo-300',
    textColor: 'text-indigo-900',
    accentColor: 'bg-indigo-600 text-white',
    pillBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
    previewBg: 'bg-indigo-600',
  },
  {
    id: 'rose',
    label: 'Đỏ hồng',
    badgeColor: 'bg-rose-600',
    bgLight: 'bg-rose-50/90',
    borderLight: 'border-rose-300',
    textColor: 'text-rose-900',
    accentColor: 'bg-rose-600 text-white',
    pillBadge: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    previewBg: 'bg-rose-600',
  },
  {
    id: 'amber',
    label: 'Cam hổ phách',
    badgeColor: 'bg-amber-600',
    bgLight: 'bg-amber-50/90',
    borderLight: 'border-amber-300',
    textColor: 'text-amber-900',
    accentColor: 'bg-amber-600 text-white',
    pillBadge: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
    previewBg: 'bg-amber-600',
  },
  {
    id: 'purple',
    label: 'Tím hoa cà',
    badgeColor: 'bg-purple-600',
    bgLight: 'bg-purple-50/90',
    borderLight: 'border-purple-300',
    textColor: 'text-purple-900',
    accentColor: 'bg-purple-600 text-white',
    pillBadge: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
    previewBg: 'bg-purple-600',
  },
  {
    id: 'teal',
    label: 'Xanh lơ',
    badgeColor: 'bg-teal-600',
    bgLight: 'bg-teal-50/90',
    borderLight: 'border-teal-300',
    textColor: 'text-teal-900',
    accentColor: 'bg-teal-600 text-white',
    pillBadge: 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
    previewBg: 'bg-teal-600',
  },
  {
    id: 'cyan',
    label: 'Xanh da trời',
    badgeColor: 'bg-cyan-600',
    bgLight: 'bg-cyan-50/90',
    borderLight: 'border-cyan-300',
    textColor: 'text-cyan-900',
    accentColor: 'bg-cyan-600 text-white',
    pillBadge: 'bg-cyan-100 text-cyan-800 border-cyan-300 font-bold',
    previewBg: 'bg-cyan-600',
  },
];

export function getMemberInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

interface MemberEditorFormProps {
  isAddingNew: boolean;
  editingName?: string;
  name: string;
  onChangeName: (val: string) => void;
  relation: string;
  onChangeRelation: (val: string) => void;
  phone: string;
  onChangePhone: (val: string) => void;
  selectedThemeIndex: number;
  onSelectThemeIndex: (idx: number) => void;
  isSupporter: boolean;
  onChangeIsSupporter: (val: boolean) => void;
  hasHealthProfile: boolean;
  onChangeHasHealthProfile: (val: boolean) => void;
  showHealthProfileToggle: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function MemberEditorForm({
  isAddingNew,
  editingName,
  name,
  onChangeName,
  relation,
  onChangeRelation,
  phone,
  onChangePhone,
  selectedThemeIndex,
  onSelectThemeIndex,
  isSupporter,
  onChangeIsSupporter,
  hasHealthProfile,
  onChangeHasHealthProfile,
  showHealthProfileToggle,
  isSaving,
  onCancel,
  onSubmit,
}: MemberEditorFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in"
    >
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {isAddingNew ? '➕ Thêm thành viên mới' : `✏️ Sửa: ${editingName || ''}`}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 font-semibold"
        >
          Huỷ
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Tên hiển thị <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="VD: Đoàn Thị Bạch Yến, Nguyễn Thành Đô..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Mối quan hệ / Vai vế
          </label>
          <input
            type="text"
            value={relation}
            onChange={(e) => onChangeRelation(e.target.value)}
            placeholder="VD: Mẹ, Bố, Con trai..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          Số điện thoại liên hệ
        </label>
        <input
          type="text"
          value={phone}
          onChange={(e) => onChangePhone(e.target.value)}
          placeholder="VD: 0912 345 678"
          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
        />
      </div>

      {showHealthProfileToggle && (
        <div className="bg-teal-50/70 dark:bg-teal-950/30 p-3.5 rounded-xl border border-teal-200 dark:border-teal-800">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={hasHealthProfile}
              onChange={(e) => onChangeHasHealthProfile(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-teal-300 text-teal-700 focus:ring-teal-500"
            />
            <div>
              <div className="text-xs font-extrabold text-teal-950 dark:text-teal-200">
                🩺 Hiển thị thành viên này trên thanh &ldquo;Sổ Sức Khỏe Gia Đình&rdquo;
              </div>
              <div className="text-[11px] text-teal-800/80 dark:text-teal-300/80">
                Khi bật, thành viên này có thẻ riêng ở trang chính để theo dõi Huyết áp, Đơn thuốc, Lịch tái khám &amp; Xét nghiệm.
              </div>
            </div>
          </label>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Vai trò trong gia đình / chăm sóc
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChangeIsSupporter(false)}
            className={`p-2.5 rounded-xl border-2 text-left flex items-start gap-2 transition cursor-pointer min-h-[48px] ${
              !isSupporter
                ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 font-bold'
                : 'border-slate-200 bg-white dark:bg-slate-900/40 text-slate-600'
            }`}
          >
            <span className="text-sm mt-0.5">🛡️</span>
            <div>
              <div className="text-xs font-bold">Thành viên chính</div>
              <div className="text-[10px] text-slate-600 font-normal">Người thân trong gia đình / Trực chính</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChangeIsSupporter(true)}
            className={`p-2.5 rounded-xl border-2 text-left flex items-start gap-2 transition cursor-pointer min-h-[48px] ${
              isSupporter
                ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold'
                : 'border-slate-200 bg-white dark:bg-slate-900/40 text-slate-600'
            }`}
          >
            <span className="text-sm mt-0.5">🤝</span>
            <div>
              <div className="text-xs font-bold">Thành viên phụ (Hỗ trợ)</div>
              <div className="text-[10px] text-slate-600 font-normal">Vào hỗ trợ khi rảnh, không bắt buộc</div>
            </div>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          Màu sắc thẻ &amp; Huy hiệu nhận diện
        </label>
        <div className="flex flex-wrap gap-2">
          {MEMBER_COLOR_THEMES.map((theme, idx) => {
            const isSelected = selectedThemeIndex === idx;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onSelectThemeIndex(idx)}
                className={`w-9 h-9 rounded-full ${theme.previewBg} flex items-center justify-center text-white text-xs font-bold transition transform active:scale-90 ${
                  isSelected
                    ? 'ring-4 ring-emerald-400 ring-offset-2 scale-110 shadow-md'
                    : 'opacity-80 hover:opacity-100'
                }`}
                title={theme.label}
              >
                {isSelected ? '✓' : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 min-h-[48px]"
        >
          Đóng
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition shadow-md shadow-emerald-600/20 disabled:opacity-50 min-h-[48px]"
        >
          {isSaving ? 'Đang lưu...' : '💾 Lưu thành viên'}
        </button>
      </div>
    </form>
  );
}
