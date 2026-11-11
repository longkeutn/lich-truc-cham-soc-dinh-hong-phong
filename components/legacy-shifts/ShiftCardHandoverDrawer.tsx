'use client';

import React from 'react';
import type { PatientVitals, ShiftRecord } from '@/lib/types';
import {
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Save,
} from 'lucide-react';

interface ShiftCardHandoverDrawerProps {
  shift: ShiftRecord;
  showHandover: boolean;
  onToggleShowHandover: () => void;
  vitals: PatientVitals;
  onChangeVitals: (vitals: PatientVitals) => void;
  handoverNote: string;
  onChangeHandoverNote: (note: string) => void;
  isSavingHandover: boolean;
  saveFeedback: boolean;
  onSaveHandover: () => void;
}

export default function ShiftCardHandoverDrawer({
  shift,
  showHandover,
  onToggleShowHandover,
  vitals,
  onChangeVitals,
  handoverNote,
  onChangeHandoverNote,
  isSavingHandover,
  saveFeedback,
  onSaveHandover,
}: ShiftCardHandoverDrawerProps) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/60">
      <button
        type="button"
        onClick={onToggleShowHandover}
        className="w-full p-3 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 transition cursor-pointer min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-500" />
          <span>Sổ Bàn Giao Ca &amp; Sinh Hiệu</span>
          {shift.handover.note && (
            <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200" title="Có ghi chú bàn giao" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {shift.handover.author && (
            <span className="text-[11px] font-semibold text-slate-600 hidden sm:inline">
              Bởi: {shift.handover.author}
            </span>
          )}
          {showHandover ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {showHandover && (
        <div className="p-3.5 sm:p-4 border-t border-slate-200 space-y-3 bg-white animate-fadeIn">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[11px] text-slate-600 font-bold block mb-1">
                Huyết áp (mmHg)
              </label>
              <input
                type="text"
                placeholder="120/80"
                value={vitals.bp || ''}
                onChange={(e) => onChangeVitals({ ...vitals, bp: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none min-h-[40px]"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-600 font-bold block mb-1">
                SpO2 (%)
              </label>
              <input
                type="text"
                placeholder="97%"
                value={vitals.spo2 || ''}
                onChange={(e) => onChangeVitals({ ...vitals, spo2: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none min-h-[40px]"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-600 font-bold block mb-1">
                Mạch (nhịp/phút)
              </label>
              <input
                type="text"
                placeholder="78"
                value={vitals.pulse || ''}
                onChange={(e) => onChangeVitals({ ...vitals, pulse: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none min-h-[40px]"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-600 font-bold block mb-1">
                Thân nhiệt (°C)
              </label>
              <input
                type="text"
                placeholder="36.8"
                value={vitals.temp || ''}
                onChange={(e) => onChangeVitals({ ...vitals, temp: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none min-h-[40px]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-600 font-bold block mb-1">
              Ghi chú dặn dò ca sau (ví dụ: Bác sĩ vừa cho thuốc mới lúc 15h, cần hút đờm...)
            </label>
            <textarea
              rows={2}
              value={handoverNote}
              onChange={(e) => onChangeHandoverNote(e.target.value)}
              placeholder="Nhập tình trạng người bệnh, nhắc nhở hoặc diễn biến đặc biệt..."
              className="w-full p-2.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 text-xs sm:text-sm font-medium focus:bg-white focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-600 font-medium">
              {shift.handover.updatedAt && (
                <>Cập nhật: {new Date(shift.handover.updatedAt).toLocaleTimeString('vi-VN')}</>
              )}
            </span>

            <button
              type="button"
              onClick={onSaveHandover}
              disabled={isSavingHandover}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition min-h-[44px] cursor-pointer shadow-sm active:scale-95"
            >
              {saveFeedback ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>Đã lưu!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSavingHandover ? 'Đang lưu...' : 'Lưu bàn giao'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
