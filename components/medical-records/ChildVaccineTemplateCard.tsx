'use client';

import React from 'react';
import { Calendar, Check, CheckCircle2, Clock, ShieldCheck, Trash2 } from 'lucide-react';
import type { LabResultEntry } from '@/lib/types';
import type { PediatricVaccineTemplate } from '@/lib/vaccineScheduleConfig';
import { fmtDateShort } from './labRecordsUtils';

const VACCINE_FACILITIES = [
  'VNVC',
  'Tiêm chủng Long Châu',
  'Trạm Y Tế Phường/Xã',
  'BV Nhi Trung Ương',
];

interface ChildVaccineTemplateCardProps {
  template: PediatricVaccineTemplate;
  saved?: LabResultEntry;
  isEditing: boolean;
  isSaving: boolean;
  statusInput: 'completed' | 'scheduled';
  dateInput: string;
  facilityInput: string;
  nextDueInput: string;
  reactionInput: string;
  onChangeStatus: (val: 'completed' | 'scheduled') => void;
  onChangeDate: (val: string) => void;
  onChangeFacility: (val: string) => void;
  onChangeNextDue: (val: string) => void;
  onChangeReaction: (val: string) => void;
  onToggleEditor: () => void;
  onSaveTemplate: () => void;
  onDeleteSaved: (id: string) => void;
}

export function ChildVaccineTemplateCard({
  template: tpl,
  saved,
  isEditing,
  isSaving,
  statusInput,
  dateInput,
  facilityInput,
  nextDueInput,
  reactionInput,
  onChangeStatus,
  onChangeDate,
  onChangeFacility,
  onChangeNextDue,
  onChangeReaction,
  onToggleEditor,
  onSaveTemplate,
  onDeleteSaved,
}: ChildVaccineTemplateCardProps) {
  const v = saved?.pediatricVaccine;
  const isDone = v?.status === 'completed';
  const isScheduled = v?.status === 'scheduled';

  return (
    <div
      className={`rounded-2xl border p-3.5 transition ${
        isDone
          ? 'bg-emerald-50/50 border-emerald-200'
          : isScheduled
          ? 'bg-amber-50/60 border-amber-300'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                tpl.category === 'tcmr'
                  ? 'bg-teal-100 text-teal-900'
                  : 'bg-indigo-100 text-indigo-900'
              }`}
            >
              {tpl.category === 'tcmr' ? 'Mở rộng' : 'Dịch vụ'}
            </span>
            <span className="text-xs font-bold text-slate-600">
              ⏰ Mốc khuyến nghị: {tpl.recommendedAgeLabel}
            </span>
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900">{tpl.name}</div>
          <p className="text-xs text-slate-600">{tpl.diseaseProtected}</p>
          {saved && v && (
            <div className="flex items-center gap-2 flex-wrap pt-1 text-xs font-bold">
              {isDone ? (
                <span className="inline-flex items-center gap-1 text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã tiêm: {fmtDateShort(saved.date)}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-900 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Hẹn tiêm: {fmtDateShort(saved.date)}</span>
                </span>
              )}
              {saved.facility && <span className="text-slate-700">📍 {saved.facility}</span>}
              {v.nextDueDate && (
                <span className="text-sky-800">
                  🔔 Hẹn mũi kế: {fmtDateShort(v.nextDueDate)}
                </span>
              )}
              {v.reactionNote && (
                <span className="text-slate-600">📝 {v.reactionNote}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleEditor}
            className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold border inline-flex items-center gap-1.5 transition cursor-pointer ${
              isDone
                ? 'bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-100/60'
                : 'bg-teal-700 text-white border-teal-800 hover:bg-teal-800'
            }`}
          >
            {isDone ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Sửa thông tin</span>
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 shrink-0" />
                <span>{isEditing ? 'Thu gọn' : 'Ghi nhận tiêm'}</span>
              </>
            )}
          </button>
          {saved && (
            <button
              type="button"
              onClick={() => onDeleteSaved(saved.id)}
              aria-label={`Xoá bản ghi ${tpl.name}`}
              className="min-h-[48px] min-w-[48px] rounded-xl bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 flex items-center justify-center cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <select
              value={statusInput}
              onChange={(e) => onChangeStatus(e.target.value as 'completed' | 'scheduled')}
              className="min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
            >
              <option value="completed">✅ Đã tiêm xong</option>
              <option value="scheduled">📅 Đặt lịch hẹn tiêm</option>
            </select>
            <label className="block">
              <span className="text-xs font-bold text-slate-600 block">
                {statusInput === 'completed' ? 'Ngày tiêm' : 'Ngày hẹn tiêm'}
              </span>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => onChangeDate(e.target.value)}
                className="w-full min-h-[44px] px-2.5 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600 block">Cơ sở tiêm chủng</span>
              <input
                type="text"
                list="vaccine-facilities"
                value={facilityInput}
                onChange={(e) => onChangeFacility(e.target.value)}
                className="w-full min-h-[44px] px-2.5 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-slate-600 block">
                Hẹn mũi kế tiếp (nếu có)
              </span>
              <input
                type="date"
                value={nextDueInput}
                onChange={(e) => onChangeNextDue(e.target.value)}
                className="w-full min-h-[44px] px-2.5 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
              />
            </label>
          </div>

          <datalist id="vaccine-facilities">
            {VACCINE_FACILITIES.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={reactionInput}
              onChange={(e) => onChangeReaction(e.target.value)}
              placeholder="Ghi chú số lô / phản ứng sau tiêm (VD: Bé bình thường, không sốt...)"
              className="flex-1 min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900"
            />
            <button
              type="button"
              disabled={isSaving}
              onClick={onSaveTemplate}
              className="min-h-[48px] min-w-[48px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Lưu xác nhận</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
