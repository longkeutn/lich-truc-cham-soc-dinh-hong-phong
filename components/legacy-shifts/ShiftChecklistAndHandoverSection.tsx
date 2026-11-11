'use client';

import React from 'react';
import type { PatientVitals, ShiftRecord } from '@/lib/types';
import {
  Activity,
  Check,
  ClipboardList,
  Heart,
  MessageSquare,
  Save,
  Thermometer,
  Wind,
} from 'lucide-react';

interface ShiftChecklistAndHandoverSectionProps {
  shift: ShiftRecord;
  vitals: PatientVitals;
  onChangeVitals: (vitals: PatientVitals) => void;
  handoverNote: string;
  onChangeHandoverNote: (note: string) => void;
  isSavingHandover: boolean;
  saveSuccess: boolean;
  onToggleChecklist: (
    shift: ShiftRecord,
    itemKey: 'feeding' | 'meds' | 'hygiene' | 'turning',
    isChecked: boolean
  ) => Promise<void>;
  onSaveHandover: () => void;
}

export default function ShiftChecklistAndHandoverSection({
  shift,
  vitals,
  onChangeVitals,
  handoverNote,
  onChangeHandoverNote,
  isSavingHandover,
  saveSuccess,
  onToggleChecklist,
  onSaveHandover,
}: ShiftChecklistAndHandoverSectionProps) {
  const checklistItems = [
    { key: 'feeding' as const, label: 'Bơm sữa & Dinh dưỡng đường sonde', done: shift.checklist.feeding },
    { key: 'meds' as const, label: 'Uống thuốc đúng giờ & Chỉ định BS', done: shift.checklist.meds },
    { key: 'hygiene' as const, label: 'Thay bỉm, vệ sinh răng miệng & thân thể', done: shift.checklist.hygiene },
    { key: 'turning' as const, label: 'Lật trở 2h/lần, vỗ rung đờm chống loét', done: shift.checklist.turning },
  ];

  return (
    <>
      <div className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            Checklist công việc trong ca
          </span>
          <span className="text-[11px] text-slate-600 font-medium">
            Đánh dấu các việc đã hoàn thành
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checklistItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => void onToggleChecklist(shift, item.key, !item.done)}
              className={`min-h-[48px] min-w-[48px] p-2.5 sm:p-3 rounded-2xl border-2 text-left flex items-center justify-between gap-2 transition cursor-pointer shadow-2xs ${
                item.done
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="text-xs sm:text-sm font-medium">{item.label}</span>
              <div
                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${
                  item.done
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {item.done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-rose-600" />
            Chỉ số sinh hiệu theo dõi
          </span>
          <span className="text-[11px] text-slate-600 font-medium">Báo BS nếu chỉ số bất thường</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-500" />
              Huyết áp
            </div>
            <input
              type="text"
              placeholder="120/80"
              value={vitals.bp || ''}
              onChange={(e) => onChangeVitals({ ...vitals, bp: e.target.value })}
              className="w-full text-xs sm:text-sm font-bold bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
              <Wind className="w-3 h-3 text-sky-500" />
              SpO2 (%)
            </div>
            <input
              type="text"
              placeholder="98%"
              value={vitals.spo2 || ''}
              onChange={(e) => onChangeVitals({ ...vitals, spo2: e.target.value })}
              className="w-full text-xs sm:text-sm font-bold bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-500" />
              Mạch (l/p)
            </div>
            <input
              type="text"
              placeholder="75"
              value={vitals.pulse || ''}
              onChange={(e) => onChangeVitals({ ...vitals, pulse: e.target.value })}
              className="w-full text-xs sm:text-sm font-bold bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-amber-500" />
              Nhiệt độ (°C)
            </div>
            <input
              type="text"
              placeholder="36.8"
              value={vitals.temp || ''}
              onChange={(e) => onChangeVitals({ ...vitals, temp: e.target.value })}
              className="w-full text-xs sm:text-sm font-bold bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus:border-indigo-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Ghi chú bàn giao cho ca tiếp theo
          </label>
          <textarea
            rows={2}
            placeholder="VD: Bác ngủ ngoan, đã cho uống thuốc lúc 14h, cần theo dõi đờm ở ca sau..."
            value={handoverNote}
            onChange={(e) => onChangeHandoverNote(e.target.value)}
            className="w-full p-2.5 text-xs sm:text-sm rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 focus:outline-none transition leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-600 font-medium">
            {shift.handover.updatedAt ? (
              <span>
                Cập nhật lần cuối bởi {shift.handover.author || 'Người nhà'} (
                {new Date(shift.handover.updatedAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                )
              </span>
            ) : (
              <span>Chưa có ghi chú bàn giao</span>
            )}
          </div>

          <button
            type="button"
            onClick={onSaveHandover}
            disabled={isSavingHandover}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 min-h-[48px] min-w-[48px]"
          >
            {isSavingHandover ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Đã lưu vào Sheet!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu bàn giao</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
