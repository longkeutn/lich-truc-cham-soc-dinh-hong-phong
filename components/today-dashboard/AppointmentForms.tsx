'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import type { HealthProfileType } from '@/lib/types';

export interface AppointmentFutureFormProps {
  futureNextDate: string;
  futureNextNote: string;
  futureNextWho: string;
  isSaving: boolean;
  profileType?: HealthProfileType;
  patientDisplayName: string;
  onChangeDate: (val: string) => void;
  onChangeNote: (val: string) => void;
  onChangeWho: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function AppointmentFutureForm({
  futureNextDate,
  futureNextNote,
  futureNextWho,
  isSaving,
  profileType = 'general_health',
  patientDisplayName,
  onChangeDate,
  onChangeNote,
  onChangeWho,
  onSave,
  onCancel,
}: AppointmentFutureFormProps) {
  const hospitalPlaceholder =
    profileType === 'post_stroke_cranioplasty'
      ? 'VD: Khoa Ngoại Thần Kinh - BV Bạch Mai'
      : profileType === 'thyroid_post_op'
        ? 'VD: BV Nội Tiết Trung Ương - Xét nghiệm TSH, FT4, Canxi'
        : profileType === 'pediatric'
          ? 'VD: VNVC / BV Nhi Trung Ương'
          : 'VD: Phòng khám Tim mạch / Bệnh viện đa khoa';

  return (
    <div className="p-3.5 rounded-2xl bg-sky-50/90 border border-sky-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-sky-950">
          📅 Đặt / Sửa Lịch Tái Khám Của {patientDisplayName}
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Đóng biểu mẫu lịch hẹn"
          className="min-h-[48px] min-w-[48px] rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
            Ngày hẹn tái khám
          </label>
          <input
            type="date"
            value={futureNextDate}
            onChange={(e) => onChangeDate(e.target.value)}
            className="w-full min-h-[48px] text-sm sm:text-base font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-teal-600"
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
            Người đưa {patientDisplayName} đi khám
          </label>
          <input
            type="text"
            value={futureNextWho}
            onChange={(e) => onChangeWho(e.target.value)}
            placeholder="VD: Cả gia đình / Anh Long..."
            className="w-full min-h-[48px] text-sm sm:text-base font-medium bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-teal-600"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
          Bệnh viện / Khoa khám &amp; nội dung cần kiểm tra
        </label>
        <input
          type="text"
          value={futureNextNote}
          onChange={(e) => onChangeNote(e.target.value)}
          placeholder={hospitalPlaceholder}
          className="w-full min-h-[48px] text-sm sm:text-base font-medium bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-teal-600"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[48px] min-w-[48px] px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-bold cursor-pointer"
        >
          Huỷ
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="min-h-[48px] min-w-[48px] px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{isSaving ? 'Đang lưu...' : 'Lưu lịch hẹn'}</span>
        </button>
      </div>
    </div>
  );
}

export interface AppointmentDoctorNoteFormProps {
  visitDate: string;
  visitDoctorAdvice: string;
  followupDate: string;
  followupNote: string;
  followupWho: string;
  isSaving: boolean;
  patientDisplayName: string;
  onChangeVisitDate: (val: string) => void;
  onChangeAdvice: (val: string) => void;
  onChangeFollowupDate: (val: string) => void;
  onChangeFollowupNote: (val: string) => void;
  onChangeFollowupWho: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function AppointmentDoctorNoteForm({
  visitDate,
  visitDoctorAdvice,
  followupDate,
  followupNote,
  followupWho,
  isSaving,
  patientDisplayName,
  onChangeVisitDate,
  onChangeAdvice,
  onChangeFollowupDate,
  onChangeFollowupNote,
  onChangeFollowupWho,
  onSave,
  onCancel,
}: AppointmentDoctorNoteFormProps) {
  return (
    <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-teal-950">
          🩺 Ghi Lại Lời Dặn Của Bác Sĩ Cho {patientDisplayName}
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Đóng biểu mẫu lời dặn bác sĩ"
          className="min-h-[48px] min-w-[48px] rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
            Ngày đi khám
          </label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => onChangeVisitDate(e.target.value)}
            className="w-full min-h-[48px] text-sm sm:text-base font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
            Hẹn tái khám kỳ tiếp theo (nếu Bác sĩ đã hẹn)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="date"
              value={followupDate}
              onChange={(e) => onChangeFollowupDate(e.target.value)}
              className="w-full min-h-[48px] text-sm font-bold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
            />
            <input
              type="text"
              value={followupNote}
              onChange={(e) => onChangeFollowupNote(e.target.value)}
              placeholder="Nơi hẹn khám kỳ tới..."
              className="w-full min-h-[48px] text-sm font-medium bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
          Kết luận &amp; Lời dặn của Bác sĩ *
        </label>
        <textarea
          rows={3}
          value={visitDoctorAdvice}
          onChange={(e) => onChangeAdvice(e.target.value)}
          placeholder="VD: Huyết áp ổn định, giữ nguyên liều thuốc sáng, hẹn khám lại sau 1 tháng..."
          className="w-full text-sm sm:text-base font-medium bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:border-teal-600"
        />
      </div>

      <input
        type="text"
        value={followupWho}
        onChange={(e) => onChangeFollowupWho(e.target.value)}
        placeholder="Người phụ trách đưa đi tái khám kỳ tới (tuỳ chọn)..."
        className="w-full min-h-[48px] text-sm font-medium bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
      />

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[48px] min-w-[48px] px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-bold cursor-pointer"
        >
          Huỷ
        </button>
        <button
          type="button"
          disabled={isSaving || !visitDoctorAdvice.trim()}
          onClick={onSave}
          className="min-h-[48px] min-w-[48px] px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-extrabold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{isSaving ? 'Đang lưu...' : 'Lưu lời dặn Bác sĩ'}</span>
        </button>
      </div>
    </div>
  );
}
