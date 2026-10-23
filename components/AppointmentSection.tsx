'use client';

import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Stethoscope,
  Edit3,
  Save,
  X,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  CalendarCheck,
} from 'lucide-react';
import { AppointmentInfo } from '@/lib/types';
import { getVietnamDateStr, diffDaysBetweenDateStr, formatVietnamDateFull } from '@/lib/config';

interface AppointmentSectionProps {
  appointment: AppointmentInfo;
  onSave: (info: AppointmentInfo) => Promise<void>;
  isAdmin?: boolean;
  todayStr?: string;
}

/**
 * Tính số ngày còn lại đến ngày tái khám theo đúng múi giờ Việt Nam (UTC+7).
 * Trả về số ngày (dương = còn lại, âm = đã qua, 0 = hôm nay).
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
  const currentTodayStr = todayStr || getVietnamDateStr();
  const [isEditing, setIsEditing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form chỉnh sửa thông tin lịch khám
  const [form, setForm] = useState<AppointmentInfo>({ ...appointment });

  // Form đánh dấu đã đi khám xong
  const [completedDate, setCompletedDate] = useState<string>(() => appointment.nextDate || currentTodayStr);
  const [completedDoctorNote, setCompletedDoctorNote] = useState<string>('');
  const [hasNextAfterThis, setHasNextAfterThis] = useState<boolean>(false);
  const [futureNextDate, setFutureNextDate] = useState<string>('');
  const [futureNextNote, setFutureNextNote] = useState<string>(appointment.nextNote || 'BV Bạch Mai');
  const [futureNextWho, setFutureNextWho] = useState<string>(appointment.nextWho || '');

  const hasNextAppointment = Boolean(appointment.nextDate);
  const hasLastVisit = Boolean(appointment.lastDate);
  const isEmpty = !hasNextAppointment && !hasLastVisit;
  const daysLeft = hasNextAppointment ? daysUntil(appointment.nextDate!, currentTodayStr) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isTodayVisit = daysLeft === 0;

  const startEdit = () => {
    setForm({ ...appointment });
    setIsEditing(true);
    setIsCompleting(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const startCompleteModal = () => {
    // Mặc định ngày đã khám là ngày lịch hẹn nếu ngày đó <= hôm nay, hoặc là hôm nay
    const defaultDate = appointment.nextDate && appointment.nextDate <= currentTodayStr
      ? appointment.nextDate
      : currentTodayStr;
    setCompletedDate(defaultDate);
    setCompletedDoctorNote(appointment.lastNote || '');
    setHasNextAfterThis(false);
    setFutureNextDate('');
    setFutureNextNote(appointment.nextNote || 'BV Bạch Mai');
    setFutureNextWho(appointment.nextWho || '');
    setIsCompleting(true);
    setIsEditing(false);
  };

  const cancelComplete = () => {
    setIsCompleting(false);
  };

  // Lưu thông tin khi chỉnh sửa thủ công
  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      await onSave(form);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Lưu khi đánh dấu ĐÃ ĐI KHÁM XONG
  const handleSaveComplete = async () => {
    setIsSaving(true);
    try {
      const updated: AppointmentInfo = {
        lastDate: completedDate || currentTodayStr,
        lastNote: completedDoctorNote.trim() || `Đã đi khám tại ${appointment.nextNote || 'Bệnh viện'}`,
        nextDate: hasNextAfterThis && futureNextDate ? futureNextDate : '',
        nextNote: hasNextAfterThis && futureNextDate ? futureNextNote.trim() : '',
        nextWho: hasNextAfterThis && futureNextDate ? futureNextWho.trim() : '',
      };
      await onSave(updated);
      setIsCompleting(false);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof AppointmentInfo>(key: K, value: AppointmentInfo[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ===== GIAO DIỆN MODAL ĐÁNH DẤU "ĐÃ ĐI KHÁM XONG" =====
  if (isCompleting) {
    return (
      <div className="rounded-2xl border-2 border-emerald-500 bg-white p-4 sm:p-5 space-y-4 shadow-md animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900">
                Xác Nhận Đã Đi Khám Xong
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                Ghi nhận lời dặn mới của bác sĩ & đóng lịch hẹn cũ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={cancelComplete}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Ngày đã đi khám */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              📅 Ngày Bố đã đi khám:
            </label>
            <input
              type="date"
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
            />
          </div>

          {/* Lời dặn mới của bác sĩ */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              📝 Lời dặn & kết luận của bác sĩ sau lần khám này:
            </label>
            <textarea
              rows={2}
              value={completedDoctorNote}
              onChange={(e) => setCompletedDoctorNote(e.target.value)}
              placeholder="VD: Bác sĩ Hùng khám bảo HA ổn định, giảm liều Amlor 10mg xuống 5mg. Nhớ uống đủ nước và tập vận động..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Checkbox hẹn tái khám lần tới */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasNextAfterThis}
                onChange={(e) => setHasNextAfterThis(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                Bác sĩ có hẹn lịch tái khám tiếp theo không?
              </span>
            </label>

            {hasNextAfterThis && (
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      📅 Ngày tái khám tiếp:
                    </label>
                    <input
                      type="date"
                      value={futureNextDate}
                      onChange={(e) => setFutureNextDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      🏥 Nơi khám:
                    </label>
                    <input
                      type="text"
                      value={futureNextNote}
                      onChange={(e) => setFutureNextNote(e.target.value)}
                      placeholder="VD: BV Bạch Mai, BS Hùng"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      👤 Người đưa đi:
                    </label>
                    <input
                      type="text"
                      value={futureNextWho}
                      onChange={(e) => setFutureNextWho(e.target.value)}
                      placeholder="VD: Anh Dũng đưa đi"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={cancelComplete}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition min-h-[40px] cursor-pointer"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSaveComplete}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs sm:text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition shadow-xs disabled:opacity-50 min-h-[40px] flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 size={16} />
            <span>{isSaving ? 'Đang lưu...' : 'Xác nhận đã khám xong'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ===== GIAO DIỆN CHỈNH SỬA / TẠO LỊCH KHÁM =====
  if (isEditing) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50/30 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-extrabold text-teal-900 flex items-center gap-2">
            <CalendarDays size={16} className="text-teal-700" />
            <span>Chỉnh sửa thông tin lịch tái khám</span>
          </h4>
          <button
            type="button"
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
            onClick={handleSaveEdit}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:scale-95 transition shadow-xs disabled:opacity-50 min-h-[40px] flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={14} />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu lịch khám'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ===== GIAO DIỆN HIỂN THỊ CHÍNH =====
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 space-y-3 shadow-xs">
      {/* Header row with edit button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200/80 flex items-center justify-center shrink-0">
            <CalendarDays size={16} className="text-teal-700" />
          </div>
          <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
            Lịch Tái Khám & Lời Dặn Bác Sĩ
          </h4>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasNextAppointment && (
            <button
              type="button"
              onClick={startCompleteModal}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs font-bold transition cursor-pointer min-h-[36px] shadow-2xs active:scale-95"
              title="Đánh dấu đã đi khám xong lần này"
            >
              <CheckCircle2 size={14} />
              <span>Đã khám xong</span>
            </button>
          )}

          <button
            type="button"
            onClick={startEdit}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center gap-1.5 text-xs font-bold transition cursor-pointer min-h-[36px]"
            title="Sửa thông tin hoặc đổi ngày tái khám"
          >
            <Edit3 size={14} />
            <span>{hasNextAppointment ? 'Sửa lịch' : '+ Đặt lịch khám'}</span>
          </button>
        </div>
      </div>

      {/* BANNER CẢNH BÁO KHI LỊCH KHÁM QUÁ HẠN HOẶC ĐẾN NGÀY */}
      {hasNextAppointment && isOverdue && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-150">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 font-medium">
              <span className="font-bold text-amber-900">
                Lịch tái khám ngày {formatDateVN(appointment.nextDate!)} đã qua {Math.abs(daysLeft!)} ngày.
              </span>{' '}
              <span>Bố đã đi khám đợt này chưa?</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={startCompleteModal}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs"
            >
              <CheckCircle2 size={13} />
              <span>Đã khám rồi</span>
            </button>
            <button
              type="button"
              onClick={startEdit}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-bold cursor-pointer transition"
            >
              Dời ngày khác
            </button>
          </div>
        </div>
      )}

      {hasNextAppointment && isTodayVisit && (
        <div className="rounded-xl border border-teal-300 bg-teal-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-teal-700 shrink-0" />
            <div className="text-xs text-teal-950 font-bold">
              🔔 Hôm nay là ngày tái khám của Bố!
            </div>
          </div>
          <button
            type="button"
            onClick={startCompleteModal}
            className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-2xs self-end sm:self-auto"
          >
            <CheckCircle2 size={13} />
            <span>Khám xong thì bấm vào đây</span>
          </button>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="text-center py-4 text-slate-600 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl space-y-1.5">
          <p className="text-sm font-semibold text-slate-700">Chưa có thông tin lịch tái khám.</p>
          <p className="text-xs font-medium text-slate-500">
            Bấm nút bên dưới để ghi lịch hẹn của bác sĩ:
          </p>
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-700 text-white font-bold text-xs hover:bg-teal-800 transition cursor-pointer shadow-2xs"
          >
            <PlusCircle size={14} />
            <span>Thêm lịch tái khám</span>
          </button>
        </div>
      )}

      {/* Next appointment & Last visit in clean clinical layout */}
      {!isEmpty && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {/* Next appointment */}
          {hasNextAppointment ? (
            <div className={`rounded-xl p-3 flex flex-col justify-between gap-2 border ${
              isOverdue
                ? 'bg-amber-50/40 border-amber-300'
                : 'bg-teal-50/50 border-teal-200/80'
            }`}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                    isOverdue ? 'text-amber-800' : 'text-teal-700'
                  }`}>
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
                      daysLeft < 0
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : daysLeft === 0
                          ? 'bg-teal-700 text-white border-teal-800'
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
                        : `Chưa cập nhật (${Math.abs(daysLeft)} ngày trước)`}
                  </div>
                )}
              </div>

              {(appointment.nextNote || appointment.nextWho) && (
                <div className="space-y-1 pt-1.5 border-t border-slate-200/60 text-xs sm:text-sm">
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
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 flex flex-col justify-center items-center gap-1.5 text-center">
              <span className="text-xs text-slate-500 font-medium">Chưa có lịch tái khám tiếp theo</span>
              <button
                type="button"
                onClick={startEdit}
                className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle size={13} />
                <span>Đặt lịch tái khám</span>
              </button>
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
                    👉 {appointment.lastNote}
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
