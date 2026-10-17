'use client';

import React, { useState, useMemo } from 'react';
import { CalendarDays, Stethoscope, Edit3, Save, X, Clock, User } from 'lucide-react';
import { AppointmentInfo } from '@/lib/types';

interface AppointmentSectionProps {
  appointment: AppointmentInfo;
  onSave: (info: AppointmentInfo) => Promise<void>;
  isAdmin?: boolean;
}

/**
 * Tính số ngày còn lại đến ngày tái khám.
 * Trả về số ngày (dương = còn lại, âm = đã qua).
 */
function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
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
  const daysLeft = hasNextAppointment ? daysUntil(appointment.nextDate!) : null;

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
      <div className="rounded-2xl border border-violet-200 bg-violet-50/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-violet-800 flex items-center gap-2">
            <CalendarDays size={16} />
            Chỉnh sửa lịch tái khám
          </h4>
          <button
            onClick={cancelEdit}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-500 flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Next appointment fields */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">📅 Ngày tái khám tiếp</label>
          <input
            type="date"
            value={form.nextDate || ''}
            onChange={(e) => updateField('nextDate', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px]"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">🏥 Ghi chú (BV, BS, phòng)</label>
          <input
            type="text"
            value={form.nextNote || ''}
            onChange={(e) => updateField('nextNote', e.target.value)}
            placeholder="VD: BV Bạch Mai, BS Hùng, Tầng 4"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px]"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">👤 Ai đưa bố đi</label>
          <input
            type="text"
            value={form.nextWho || ''}
            onChange={(e) => updateField('nextWho', e.target.value)}
            placeholder="VD: Anh Dũng đưa bố đi"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px]"
          />
        </div>

        <div className="border-t border-violet-200 pt-3 space-y-2">
          <label className="block text-xs font-bold text-slate-700">📋 Ngày khám gần nhất</label>
          <input
            type="date"
            value={form.lastDate || ''}
            onChange={(e) => updateField('lastDate', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[44px]"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">📝 BS nói gì lần khám gần nhất</label>
          <textarea
            value={form.lastNote || ''}
            onChange={(e) => updateField('lastNote', e.target.value)}
            placeholder="VD: BS nói HA ổn, giảm Amlor 10mg→5mg. Tái khám sau 2 tuần."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>

        {/* Save / Cancel */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={isSaving}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-200/60 min-h-[44px]"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 active:scale-95 transition shadow-md shadow-violet-600/20 disabled:opacity-50 min-h-[44px] flex items-center gap-2"
          >
            <Save size={14} />
            {isSaving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    );
  }

  // ===== Display mode =====
  return (
    <div className="rounded-3xl border-2 border-slate-300 bg-white p-4 sm:p-5 space-y-3 shadow-xs">
      {/* Header row with edit button */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm sm:text-base font-black uppercase tracking-wide text-slate-900 flex items-center gap-2">
          <CalendarDays size={18} className="text-violet-700" />
          Lịch Tái Khám Của Bố
        </h4>
        {isAdmin && (
          <button
            onClick={startEdit}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-violet-50 text-slate-900 border-2 border-slate-300 flex items-center gap-1.5 text-xs sm:text-sm font-black transition cursor-pointer min-h-[40px]"
            title="Sửa thông tin tái khám"
          >
            <Edit3 size={15} />
            <span>Sửa lịch khám</span>
          </button>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-4 text-slate-700">
          <CalendarDays size={28} className="mx-auto mb-2 text-slate-500" />
          <p className="text-base font-bold">Chưa có thông tin lịch tái khám.</p>
          {isAdmin && (
            <p className="text-sm font-semibold mt-1 text-slate-600">
              Bấm nút <strong>Sửa lịch khám</strong> ở trên để thêm.
            </p>
          )}
        </div>
      )}

      {/* Next appointment */}
      {hasNextAppointment && (
        <div className="space-y-2 bg-violet-50/60 border-2 border-violet-200 rounded-2xl p-3.5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <span className="text-xl flex-shrink-0 mt-0.5">📅</span>
              <div className="min-w-0 flex-1">
                <p className="text-base sm:text-lg font-black text-slate-950">
                  Ngày tái khám tiếp: <span className="text-violet-900">{formatDateVN(appointment.nextDate!)}</span>
                </p>
                {appointment.nextNote && (
                  <p className="text-sm sm:text-base font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <Stethoscope size={16} className="text-violet-700 flex-shrink-0" />
                    {appointment.nextNote}
                  </p>
                )}
                {appointment.nextWho && (
                  <p className="text-sm sm:text-base font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <User size={16} className="text-emerald-700 flex-shrink-0" />
                    {appointment.nextWho}
                  </p>
                )}
              </div>
            </div>

            {/* Days countdown */}
            {daysLeft !== null && (
              <div
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm sm:text-base font-black border-2 shrink-0 ${
                  daysLeft <= 0
                    ? 'bg-rose-700 text-white border-rose-900'
                    : daysLeft <= 3
                      ? 'bg-amber-400 text-slate-950 border-amber-600'
                      : 'bg-emerald-700 text-white border-emerald-900'
                }`}
              >
                <Clock size={16} />
                {daysLeft > 0
                  ? `Còn ${daysLeft} ngày`
                  : daysLeft === 0
                    ? 'Khám hôm nay!'
                    : `Đã qua ${Math.abs(daysLeft)} ngày`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last visit */}
      {hasLastVisit && (
        <div className={`space-y-1.5 ${hasNextAppointment ? 'pt-2 border-t-2 border-slate-200' : ''}`}>
          <div className="flex items-start gap-2.5">
            <span className="text-lg flex-shrink-0 mt-0.5">📋</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-base font-black text-slate-900">
                Lần khám gần nhất: {formatDateVN(appointment.lastDate!)}
              </p>
              {appointment.lastNote && (
                <p className="text-sm sm:text-base font-bold text-slate-900 mt-1.5 leading-relaxed bg-slate-100 rounded-xl px-3.5 py-2.5 border-2 border-slate-300">
                  {appointment.lastNote}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
