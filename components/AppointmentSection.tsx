'use client';

import React, { useState, useMemo } from 'react';
import { CalendarDays, Stethoscope, Edit3, Save, X, Clock, User } from 'lucide-react';
import { AppointmentInfo } from '@/lib/types';
import { getVietnamDateStr, diffDaysBetweenDateStr } from '@/lib/config';

interface AppointmentSectionProps {
  appointment: AppointmentInfo;
  onSave: (info: AppointmentInfo) => Promise<void>;
  isAdmin?: boolean;
  todayStr?: string;
}

/**
 * Tính số ngày còn lại đến ngày tái khám theo đúng múi giờ Việt Nam (UTC+7).
 * Trả về số ngày (dương = còn lại, âm = đã qua).
 */
function daysUntil(dateStr: string, currentTodayStr?: string): number | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const todayStr = currentTodayStr || getVietnamDateStr();
  return diffDaysBetweenDateStr(dateStr, todayStr);
}

/**
 * Format YYYY-MM-DD → DD/MM/YYYY cho hiển thị tiếng Việt.
 */
function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function AppointmentSection({
  appointment,
  onSave,
  isAdmin = false,
  todayStr,
}: AppointmentSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<AppointmentInfo>({ ...appointment });

  // Sync form with prop changes when not editing
  const syncedAppointment = useMemo(() => appointment, [appointment]);
  if (!isEditing && form !== syncedAppointment) {
    // Only sync when not actively editing
  }

  const hasNextAppointment = !!appointment.nextDate;
  const hasLastVisit = !!appointment.lastDate;
  const isEmpty = !hasNextAppointment && !hasLastVisit;
  const daysLeft = hasNextAppointment ? daysUntil(appointment.nextDate!, todayStr) : null;

  const startEdit = () => {
    setForm({ ...appointment });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(form);
      setIsEditing(false);
    } catch {
      // Parent handles error display
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof AppointmentInfo>(key: K, value: AppointmentInfo[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // ===== Edit mode =====
  if (isEditing) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50/30 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-teal-900 flex items-center gap-2">
            <CalendarDays size={16} className="text-teal-700" />
            Chỉnh sửa lịch tái khám
          </h4>
          <button
            onClick={cancelEdit}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Next appointment fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">📅 Ngày tái khám tiếp</label>
            <input
              type="date"
              value={form.nextDate || ''}
              onChange={(e) => updateField('nextDate', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">🏥 Nơi khám (BV, BS, Phòng)</label>
            <input
              type="text"
              value={form.nextNote || ''}
              onChange={(e) => updateField('nextNote', e.target.value)}
              placeholder="VD: BV Bạch Mai, BS Hùng"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">👤 Người đưa bố đi</label>
            <input
              type="text"
              value={form.nextWho || ''}
              onChange={(e) => updateField('nextWho', e.target.value)}
              placeholder="VD: Anh Dũng đưa bố đi"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
            />
          </div>
        </div>

        <div className="border-t border-teal-200/70 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">📋 Ngày khám gần nhất</label>
            <input
              type="date"
              value={form.lastDate || ''}
              onChange={(e) => updateField('lastDate', e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[42px]"
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700">📝 Lời dặn bác sĩ lần khám gần nhất</label>
            <textarea
              value={form.lastNote || ''}
              onChange={(e) => updateField('lastNote', e.target.value)}
              placeholder="VD: BS nói HA ổn, giảm Amlor 10mg→5mg. Tái khám sau 2 tuần."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
        </div>

        {/* Save / Cancel */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 min-h-[40px] cursor-pointer"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:scale-95 transition shadow-xs disabled:opacity-50 min-h-[40px] flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={14} />
            {isSaving ? 'Đang lưu...' : 'Lưu lịch khám'}
          </button>
        </div>
      </div>
    );
  }

  // ===== Display mode =====
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 space-y-3 shadow-xs">
      {/* Header row with edit button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200/80 flex items-center justify-center shrink-0">
            <CalendarDays size={16} className="text-teal-700" />
          </div>
          <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
            Lịch Tái Khám & Lời Dặn Bác Sĩ
          </h4>
        </div>
        {isAdmin && (
          <button
            onClick={startEdit}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center gap-1.5 text-xs font-bold transition cursor-pointer min-h-[36px]"
            title="Sửa thông tin tái khám"
          >
            <Edit3 size={14} />
            <span>Sửa lịch khám</span>
          </button>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-3 text-slate-600">
          <p className="text-sm font-semibold">Chưa có thông tin lịch tái khám.</p>
          {isAdmin && (
            <p className="text-xs font-medium mt-0.5 text-slate-500">
              Bấm nút <strong>Sửa lịch khám</strong> ở trên để thêm.
            </p>
          )}
        </div>
      )}

      {/* Next appointment & Last visit in clean clinical layout */}
      {!isEmpty && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Next appointment */}
          {hasNextAppointment && (
            <div className="bg-teal-50/50 border border-teal-200/80 rounded-xl p-3 flex flex-col justify-between gap-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 block">
                    📅 Lịch tái khám sắp tới
                  </span>
                  <p className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
                    {formatDateVN(appointment.nextDate!)}
                  </p>
                </div>

                {/* Days countdown */}
                {daysLeft !== null && (
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${
                      daysLeft <= 0
                        ? 'bg-rose-600 text-white border-rose-700'
                        : daysLeft <= 3
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    <Clock size={13} />
                    {daysLeft > 0
                      ? `Còn ${daysLeft} ngày`
                      : daysLeft === 0
                        ? 'Khám hôm nay!'
                        : `Quá ${Math.abs(daysLeft)} ngày`}
                  </div>
                )}
              </div>

              {(appointment.nextNote || appointment.nextWho) && (
                <div className="space-y-1 pt-1.5 border-t border-teal-200/50 text-xs sm:text-sm">
                  {appointment.nextNote && (
                    <p className="font-semibold text-slate-700 flex items-start gap-1.5 leading-snug">
                      <Stethoscope size={14} className="text-teal-700 flex-shrink-0 mt-0.5" />
                      <span>{appointment.nextNote}</span>
                    </p>
                  )}
                  {appointment.nextWho && (
                    <p className="font-semibold text-slate-700 flex items-start gap-1.5 leading-snug">
                      <User size={14} className="text-teal-700 flex-shrink-0 mt-0.5" />
                      <span>{appointment.nextWho}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Last visit */}
          {hasLastVisit && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between gap-1.5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  📋 Khám gần nhất: {formatDateVN(appointment.lastDate!)}
                </span>
                {appointment.lastNote && (
                  <p className="text-xs sm:text-sm font-medium text-slate-700 mt-1 leading-relaxed">
                    {appointment.lastNote}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
