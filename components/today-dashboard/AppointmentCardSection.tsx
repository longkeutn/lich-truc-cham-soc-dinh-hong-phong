'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Edit3,
  Stethoscope,
  User,
  Clock,
  FileCheck2,
  Plus,
} from 'lucide-react';
import type { AppointmentInfo, HealthProfileType } from '@/lib/types';
import {
  getVietnamDateStr,
  normalizeDateStr,
} from '@/lib/config';
import {
  AppointmentDoctorNoteForm,
  AppointmentFutureForm,
} from './AppointmentForms';

function formatVietnamDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export interface AppointmentSectionProps {
  appointment: AppointmentInfo;
  onSave: (info: AppointmentInfo) => Promise<void>;
  isAdmin: boolean;
  todayStr?: string;
  profileType?: HealthProfileType;
  patientDisplayName?: string;
}

type ActiveFormMode = 'none' | 'future' | 'visit_result';

export function AppointmentCardSection({
  appointment,
  onSave,
  todayStr: todayStrProp,
  profileType = 'general_health',
  patientDisplayName = 'người thân',
}: AppointmentSectionProps) {
  const [formMode, setFormMode] = useState<ActiveFormMode>('none');
  const [isSaving, setIsSaving] = useState(false);

  const defaultFacilityNote =
    profileType === 'post_stroke_cranioplasty' ? 'BV Bạch Mai' : '';

  const [futureNextDate, setFutureNextDate] = useState('');
  const [futureNextNote, setFutureNextNote] = useState('');
  const [futureNextWho, setFutureNextWho] = useState('');

  const [visitDate, setVisitDate] = useState('');
  const [visitDoctorAdvice, setVisitDoctorAdvice] = useState('');
  const [followupDate, setFollowupDate] = useState('');
  const [followupNote, setFollowupNote] = useState('');
  const [followupWho, setFollowupWho] = useState('');

  const [mountedClient, setMountedClient] = useState(false);

  useEffect(() => {
    setMountedClient(true);
  }, []);

  const todayStr = todayStrProp || (mountedClient ? getVietnamDateStr() : '');

  const countdown = useMemo(() => {
    const cleanNext = normalizeDateStr(appointment.nextDate || '');
    if (!cleanNext || !todayStr) return null;

    const [ty, tm, td] = todayStr.split('-').map(Number);
    const [ny, nm, nd] = cleanNext.split('-').map(Number);
    const todayUtc = Date.UTC(ty, tm - 1, td);
    const nextUtc = Date.UTC(ny, nm - 1, nd);
    const diffDays = Math.round((nextUtc - todayUtc) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Đã qua ${Math.abs(diffDays)} ngày - Bấm "Ghi lời dặn BS" để cập nhật kết quả`,
        badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
        cardClass: 'bg-rose-50/70 border-rose-200',
      };
    }
    if (diffDays === 0) {
      return {
        text: 'HÔM NAY TÁI KHÁM!',
        badgeClass: 'bg-amber-200 text-amber-950 border-amber-400',
        cardClass: 'bg-amber-50/90 border-amber-300',
      };
    }
    if (diffDays <= 5) {
      return {
        text: `Sắp đến hẹn: còn ${diffDays} ngày`,
        badgeClass: 'bg-amber-100 text-amber-950 border-amber-300',
        cardClass: 'bg-amber-50/60 border-amber-200',
      };
    }
    return {
      text: `Còn ${diffDays} ngày nữa`,
      badgeClass: 'bg-sky-100 text-sky-900 border-sky-200',
      cardClass: 'bg-sky-50/60 border-sky-200/80',
    };
  }, [appointment.nextDate, todayStr]);

  const openFutureScheduleModal = () => {
    setFutureNextDate(normalizeDateStr(appointment.nextDate || ''));
    setFutureNextNote(appointment.nextNote || defaultFacilityNote);
    setFutureNextWho(appointment.nextWho || '');
    setFormMode('future');
  };

  const openDoctorResultModal = () => {
    const currentNext = normalizeDateStr(appointment.nextDate || '');
    const defaultVisitDate =
      currentNext && todayStr && currentNext <= todayStr
        ? currentNext
        : normalizeDateStr(appointment.lastDate || '') || todayStr || getVietnamDateStr();

    setVisitDate(defaultVisitDate);
    setVisitDoctorAdvice(appointment.lastNote || '');
    setFollowupDate(currentNext && todayStr && currentNext > todayStr ? currentNext : '');
    setFollowupNote(appointment.nextNote || defaultFacilityNote);
    setFollowupWho(appointment.nextWho || '');
    setFormMode('visit_result');
  };

  const handleSaveFutureSchedule = async () => {
    setIsSaving(true);
    try {
      await onSave({
        nextDate: futureNextDate ? normalizeDateStr(futureNextDate) : undefined,
        nextNote: futureNextNote.trim() || undefined,
        nextWho: futureNextWho.trim() || undefined,
        lastDate: appointment.lastDate
          ? normalizeDateStr(appointment.lastDate)
          : undefined,
        lastNote: appointment.lastNote || undefined,
      });
      setFormMode('none');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDoctorResult = async () => {
    if (!visitDoctorAdvice.trim()) return;
    setIsSaving(true);
    try {
      const cleanFollowup = followupDate ? normalizeDateStr(followupDate) : '';
      const cleanOldNext = normalizeDateStr(appointment.nextDate || '');
      const resolvedNextDate =
        cleanFollowup || (cleanOldNext && cleanOldNext > visitDate ? cleanOldNext : undefined);

      await onSave({
        lastDate: normalizeDateStr(visitDate) || getVietnamDateStr(),
        lastNote: visitDoctorAdvice.trim(),
        nextDate: resolvedNextDate,
        nextNote: resolvedNextDate
          ? followupNote.trim() || appointment.nextNote || undefined
          : undefined,
        nextWho: resolvedNextDate
          ? followupWho.trim() || appointment.nextWho || undefined
          : undefined,
      });
      setFormMode('none');
    } finally {
      setIsSaving(false);
    }
  };

  const hasNextDate = Boolean(normalizeDateStr(appointment.nextDate || ''));
  const hasLastVisit = Boolean(appointment.lastDate || appointment.lastNote);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
              Lịch Tái Khám &amp; Lời Dặn Bác Sĩ ({patientDisplayName})
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Theo dõi ngày hẹn sắp tới và lưu lại y lệnh sau mỗi lần đi khám
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={openFutureScheduleModal}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            {hasNextDate ? (
              <>
                <Edit3 className="w-4 h-4 shrink-0" />
                <span>Sửa lịch hẹn</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 shrink-0" />
                <span>Đặt lịch hẹn</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={openDoctorResultModal}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <FileCheck2 className="w-4 h-4 shrink-0" />
            <span>Ghi lời dặn BS</span>
          </button>
        </div>
      </div>

      {formMode === 'future' && (
        <AppointmentFutureForm
          futureNextDate={futureNextDate}
          futureNextNote={futureNextNote}
          futureNextWho={futureNextWho}
          isSaving={isSaving}
          profileType={profileType}
          patientDisplayName={patientDisplayName}
          onChangeDate={setFutureNextDate}
          onChangeNote={setFutureNextNote}
          onChangeWho={setFutureNextWho}
          onSave={() => void handleSaveFutureSchedule()}
          onCancel={() => setFormMode('none')}
        />
      )}

      {formMode === 'visit_result' && (
        <AppointmentDoctorNoteForm
          visitDate={visitDate}
          visitDoctorAdvice={visitDoctorAdvice}
          followupDate={followupDate}
          followupNote={followupNote}
          followupWho={followupWho}
          isSaving={isSaving}
          patientDisplayName={patientDisplayName}
          onChangeVisitDate={setVisitDate}
          onChangeAdvice={setVisitDoctorAdvice}
          onChangeFollowupDate={setFollowupDate}
          onChangeFollowupNote={setFollowupNote}
          onChangeFollowupWho={setFollowupWho}
          onSave={() => void handleSaveDoctorResult()}
          onCancel={() => setFormMode('none')}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          className={`rounded-2xl border p-3.5 space-y-1.5 ${
            countdown ? countdown.cardClass : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-700" />
              <span>Lịch tái khám tiếp theo</span>
            </span>
            {countdown && (
              <span
                className={`text-xs font-extrabold px-2 py-0.5 rounded-md border ${countdown.badgeClass}`}
              >
                {countdown.text}
              </span>
            )}
          </div>

          {hasNextDate ? (
            <>
              <div className="text-base sm:text-lg font-black text-slate-900">
                📅 {formatVietnamDateShort(normalizeDateStr(appointment.nextDate || ''))}
              </div>
              {appointment.nextNote && (
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  🏥 {appointment.nextNote}
                </p>
              )}
              {appointment.nextWho && (
                <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Người đi cùng: {appointment.nextWho}</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Chưa đặt ngày tái khám sắp tới. Bấm <strong>Đặt lịch hẹn</strong> để nhận chuông nhắc trước 5 ngày.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5">
          <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
            <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
            <span>Kết luận / Lời dặn Bác sĩ lần khám gần nhất</span>
          </span>
          {hasLastVisit ? (
            <>
              {appointment.lastDate && (
                <div className="text-xs font-bold text-teal-800">
                  Khám ngày: {formatVietnamDateShort(normalizeDateStr(appointment.lastDate))}
                </div>
              )}
              <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
                {appointment.lastNote || 'Đã cập nhật ngày khám.'}
              </p>
            </>
          ) : (
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Chưa có ghi chú lời dặn Bác sĩ. Sau mỗi lần đi khám về, bấm <strong>Ghi lời dặn BS</strong> để lưu lại cho cả nhà cùng nắm rõ.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AppointmentCardSection;
