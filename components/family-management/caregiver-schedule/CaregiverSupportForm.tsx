'use client';

import React from 'react';
import type { FamilyMember } from '@/lib/types';
import { Check, X } from 'lucide-react';
import {
  formatDateShortVN,
  QUICK_TASK_PRESETS,
  SESSION_OPTIONS,
  type SessionOption,
} from './familyScheduleUtils';

interface CaregiverSupportFormProps {
  editingShiftId: string | null;
  members: FamilyMember[];
  selectedMemberName: string;
  onSelectMember: (name: string) => void;
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  quickDates: { label: string; dateStr: string }[];
  selectedSessionId: SessionOption['id'];
  onSelectSession: (session: SessionOption) => void;
  customTimeRange: string;
  onChangeTimeRange: (val: string) => void;
  taskNote: string;
  onChangeTaskNote: (val: string) => void;
  selectedSupporters: string[];
  onToggleSupporter: (name: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function CaregiverSupportForm({
  editingShiftId,
  members,
  selectedMemberName,
  onSelectMember,
  selectedDate,
  onSelectDate,
  quickDates,
  selectedSessionId,
  onSelectSession,
  customTimeRange,
  onChangeTimeRange,
  taskNote,
  onChangeTaskNote,
  selectedSupporters,
  onToggleSupporter,
  isSubmitting,
  onSubmit,
  onClose,
}: CaregiverSupportFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border-2 border-emerald-400 bg-white p-4 sm:p-6 shadow-xl space-y-4 animate-in fade-in duration-200"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
            🤝
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              {editingShiftId ? 'Cập nhật lịch qua phụ Mẹ' : 'Đăng ký lịch qua phụ Mẹ'}
            </h3>
            <p className="text-xs text-slate-600">
              Lưu trực tiếp lên Google Sheets để Mẹ và cả nhà cùng biết
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng biểu mẫu đăng ký lịch phụ"
          className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 1. Chọn người qua phụ */}
      <div className="space-y-2">
        <label className="block text-sm font-black text-slate-800">
          1. Ai đăng ký qua phụ Mẹ?
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {members.map((m) => {
            const isSelected = selectedMemberName === m.name;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMember(m.name)}
                className={`min-h-[52px] p-2.5 rounded-2xl border-2 text-left transition flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 ${
                    m.badgeColor || 'bg-slate-600'
                  }`}
                >
                  {m.avatarInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black truncate">{m.name}</div>
                  <div className="text-xs text-slate-600 truncate">{m.relation}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Chọn ngày & buổi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-black text-slate-800">
            2. Ngày qua phụ Mẹ:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onSelectDate(e.target.value)}
            className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 text-base font-bold text-slate-900 focus:outline-none"
            required
          />
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {quickDates.map((qd) => (
              <button
                key={qd.label}
                type="button"
                onClick={() => onSelectDate(qd.dateStr)}
                className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer flex items-center justify-center ${
                  selectedDate === qd.dateStr
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {qd.label} ({formatDateShortVN(qd.dateStr)})
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-black text-slate-800">
            3. Buổi / Khung giờ:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SESSION_OPTIONS.map((opt) => {
              const active = selectedSessionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectSession(opt)}
                  className={`min-h-[52px] px-3 py-2 rounded-2xl border-2 text-left transition cursor-pointer ${
                    active
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white font-bold'
                  }`}
                >
                  <div className="text-sm flex items-center gap-1.5">
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">{opt.defaultTime}</div>
                </button>
              );
            })}
          </div>
          <div className="pt-1">
            <input
              type="text"
              value={customTimeRange}
              onChange={(e) => onChangeTimeRange(e.target.value)}
              placeholder="Giờ cụ thể (VD: 08:30 - 12:00 hoặc Sau giờ làm 17:30)"
              className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 text-sm font-medium text-slate-800 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Ghi chú công việc phụ Mẹ */}
      <div className="space-y-2">
        <label className="block text-sm font-black text-slate-800">
          4. Công việc dự kiến phụ Mẹ / Lời nhắn:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TASK_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChangeTaskNote(preset)}
              className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer flex items-center justify-center ${
                taskNote === preset
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              + {preset}
            </button>
          ))}
        </div>
        <textarea
          rows={2}
          value={taskNote}
          onChange={(e) => onChangeTaskNote(e.target.value)}
          placeholder="VD: Con qua đỡ Bố tập đi bộ, nấu cháo trưa và trông Bố để Mẹ nghỉ ngơi..."
          className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 text-base text-slate-900 font-medium focus:outline-none"
        />
      </div>

      {/* 5. Người đi cùng hỗ trợ */}
      <div className="space-y-2 pt-1 border-t border-slate-100">
        <label className="block text-xs font-bold text-slate-600">
          🤝 Đi cùng ai khác trong gia đình? (Tùy chọn):
        </label>
        <div className="flex flex-wrap gap-1.5">
          {members
            .filter((m) => m.name !== selectedMemberName)
            .map((m) => {
              const checked = selectedSupporters.includes(m.name);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onToggleSupporter(m.name)}
                  className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    checked
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {checked && <Check className="w-3.5 h-3.5" />}
                  <span>{m.name}</span>
                </button>
              );
            })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[48px] min-w-[48px] px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
        >
          Đóng
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-[48px] min-w-[48px] px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-md active:scale-95 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <Check className="w-5 h-5" />
          <span>{isSubmitting ? 'Đang lưu...' : 'Lưu lịch phụ Mẹ'}</span>
        </button>
      </div>
    </form>
  );
}
