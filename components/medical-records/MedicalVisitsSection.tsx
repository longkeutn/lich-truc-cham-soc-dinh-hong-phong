'use client';

import React, { useMemo, useState } from 'react';
import {
  Building2,
  CalendarPlus,
  CheckCircle2,
  Edit3,
  Pill,
  Plus,
  Stethoscope,
  Trash2,
  User,
  X,
  ZoomIn,
} from 'lucide-react';
import type {
  CareRoutine,
  HealthProfileType,
  LabResultEntry,
  MedicalVisitOutcomeStatus,
} from '@/lib/types';
import { TIME_SLOT_CONFIG, normalizeDateStr } from '@/lib/config';
import {
  OUTCOME_STATUS_CONFIG,
  VISIT_TYPE_CONFIG,
  formatCompactDayMonth,
  formatShortVnDate,
  stepDateStr,
} from '@/lib/medicalVisitUtils';
import { MedicalEmptyState } from '@/components/ui-kit';

export interface MedicalVisitsSectionProps {
  visitEntries: LabResultEntry[];
  routines?: CareRoutine[];
  profileType: HealthProfileType;
  patientDisplayName: string;
  todayStr?: string;
  onOpenAddVisit: () => void;
  onOpenEditVisit: (entry: LabResultEntry) => void;
  onDeleteVisit: (entry: LabResultEntry) => Promise<void>;
  onQuickUpdateOutcome: (
    entry: LabResultEntry,
    status: MedicalVisitOutcomeStatus,
    note: string
  ) => Promise<void>;
  onSyncVisitToRoutines?: (entry: LabResultEntry) => Promise<void>;
}

export function MedicalVisitsSection({
  visitEntries,
  routines = [],
  profileType,
  patientDisplayName,
  todayStr,
  onOpenAddVisit,
  onOpenEditVisit,
  onDeleteVisit,
  onQuickUpdateOutcome,
  onSyncVisitToRoutines,
}: MedicalVisitsSectionProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [outcomeEditingId, setOutcomeEditingId] = useState<string | null>(null);
  const [outcomeDraftStatus, setOutcomeDraftStatus] =
    useState<MedicalVisitOutcomeStatus>('improved');
  const [outcomeDraftNote, setOutcomeDraftNote] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  const sortedVisitsDesc = useMemo(() => {
    return [...visitEntries].sort((a, b) => {
      const cmp = normalizeDateStr(b.date).localeCompare(normalizeDateStr(a.date));
      if (cmp !== 0) return cmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [visitEntries]);

  const stats = useMemo(() => {
    let ongoing = 0;
    let recovered = 0;
    for (const v of sortedVisitsDesc) {
      const st = v.medicalVisit?.outcomeStatus || 'ongoing';
      if (st === 'ongoing') ongoing++;
      if (st === 'recovered' || st === 'improved') recovered++;
    }
    return { total: sortedVisitsDesc.length, ongoing, recovered };
  }, [sortedVisitsDesc]);

  const handleDelete = async (entry: LabResultEntry) => {
    const ok = window.confirm(
      `Bạn có chắc muốn xoá đợt khám ngày ${formatShortVnDate(entry.date)} của ${patientDisplayName}?`
    );
    if (!ok) return;
    setDeletingId(entry.id);
    try {
      await onDeleteVisit(entry);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSyncVisit = async (entry: LabResultEntry) => {
    if (!onSyncVisitToRoutines) return;
    setSyncingId(entry.id);
    try {
      await onSyncVisitToRoutines(entry);
    } finally {
      setSyncingId(null);
    }
  };

  const openQuickOutcome = (entry: LabResultEntry) => {
    setOutcomeEditingId(entry.id);
    setOutcomeDraftStatus(entry.medicalVisit?.outcomeStatus || 'improved');
    setOutcomeDraftNote(entry.medicalVisit?.outcomeNote || '');
  };

  const saveQuickOutcome = async (entry: LabResultEntry) => {
    await onQuickUpdateOutcome(entry, outcomeDraftStatus, outcomeDraftNote);
    setOutcomeEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header tóm tắt */}
      <div className="rounded-2xl bg-surface-card border border-border-card shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-black text-text-main flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-medical-primary shrink-0" />
              <span>Nhật Ký Đợt Khám &amp; Đơn Thuốc ({stats.total} đợt)</span>
            </h3>
            {stats.ongoing > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-xs font-extrabold">
                💊 {stats.ongoing} đợt đang uống
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-text-muted">
            {profileType === 'pediatric'
              ? `Lưu đơn thuốc từng đợt ốm, cân nặng lúc khám, ảnh tờ đơn và ghi chú hợp thuốc của ${patientDisplayName}.`
              : `Lưu đơn thuốc ngắn ngày / chỉnh liều theo từng lần khám, ảnh tờ đơn và đáp ứng điều trị của ${patientDisplayName}.`}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddVisit}
          className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-2xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Ghi Đợt Khám &amp; Đơn Mới</span>
        </button>
      </div>

      {sortedVisitsDesc.length === 0 ? (
        <MedicalEmptyState
          icon={<Stethoscope className="w-8 h-8" />}
          badge="Đợt khám & Đơn thuốc theo liệu trình"
          title={`Chưa có đợt khám bệnh nào được lưu cho ${patientDisplayName}`}
          description="Mỗi lần đi khám về, bạn chỉ cần ghi triệu chứng, chụp ảnh tờ đơn thuốc và nhập các thuốc trong đơn để đẩy thẳng ra Checklist uống thuốc hàng ngày."
          tone="medical"
          primaryAction={{
            label: 'Ghi đợt khám & đơn thuốc đầu tiên',
            onClick: onOpenAddVisit,
            icon: <Plus className="w-4 h-4" />,
          }}
        />
      ) : (
        <div className="space-y-3">
          {sortedVisitsDesc.map((entry, idx) => {
            const mv = entry.medicalVisit;
            const visitTypeCfg =
              VISIT_TYPE_CONFIG[mv?.visitType || 'illness'] || VISIT_TYPE_CONFIG.illness;
            const outcomeCfg =
              OUTCOME_STATUS_CONFIG[mv?.outcomeStatus || 'ongoing'] ||
              OUTCOME_STATUS_CONFIG.ongoing;
            const meds = mv?.prescriptions || [];
            const linkedRoutines = routines.filter((r) => r.visitId === entry.id);
            const isSyncedAll =
              meds.length > 0 &&
              meds.every(
                (m) =>
                  Boolean(m.syncedRoutineId) ||
                  linkedRoutines.some(
                    (r) => r.title.trim().toLowerCase() === m.title.trim().toLowerCase()
                  )
              );

            return (
              <article
                key={entry.id}
                className="rounded-2xl border border-border-card bg-surface-card p-4 sm:p-5 shadow-2xs space-y-3"
              >
                {/* Top row: Date, badges, actions */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-black text-text-main">
                        📅 {formatShortVnDate(entry.date)}
                      </span>
                      {idx === 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 text-xs font-black">
                          Gần nhất
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-xs font-extrabold ${visitTypeCfg.badgeClass}`}
                      >
                        {visitTypeCfg.emoji} {visitTypeCfg.label}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-xs font-extrabold ${outcomeCfg.badgeClass}`}
                      >
                        {outcomeCfg.emoji} {outcomeCfg.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm font-bold text-text-body">
                      {entry.facility && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          {entry.facility}
                        </span>
                      )}
                      {mv?.doctorName && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {mv.doctorName}
                        </span>
                      )}
                      {mv?.weightKg && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-cyan-50 text-cyan-950 border border-cyan-200">
                          ⚖️ {mv.weightKg} kg
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => openQuickOutcome(entry)}
                      className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Cập nhật đáp ứng</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenEditVisit(entry)}
                      className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-text-body border border-border-card text-xs sm:text-sm font-extrabold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 shrink-0" />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === entry.id}
                      onClick={() => void handleDelete(entry)}
                      className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs sm:text-sm font-extrabold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>{deletingId === entry.id ? '...' : 'Xoá'}</span>
                    </button>
                  </div>
                </div>

                {/* Chẩn đoán, triệu chứng, ảnh đơn thuốc */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 space-y-2 min-w-0">
                    {mv?.diagnosis && (
                      <div className="rounded-xl bg-teal-50/80 border border-teal-200 px-3.5 py-2.5 text-sm sm:text-base font-extrabold text-teal-950">
                        🩺 Chẩn đoán: {mv.diagnosis}
                      </div>
                    )}
                    {(mv?.symptoms || entry.symptoms) && (
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        <strong className="text-slate-900">Triệu chứng:</strong>{' '}
                        {mv?.symptoms || entry.symptoms}
                      </p>
                    )}
                    {entry.doctorAdvice && (
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                        <strong className="text-slate-900">Lời dặn Bác sĩ:</strong>{' '}
                        {entry.doctorAdvice}
                      </p>
                    )}
                    {mv?.nextVisitDate && (
                      <p className="text-xs sm:text-sm font-bold text-sky-900">
                        🗓️ Hẹn tái khám: {formatShortVnDate(mv.nextVisitDate)}
                      </p>
                    )}
                  </div>

                  {mv?.prescriptionImage && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPhoto({
                          url: mv.prescriptionImage!,
                          title: `Đơn thuốc ngày ${formatShortVnDate(entry.date)}`,
                          subtitle: [mv.diagnosis, entry.facility].filter(Boolean).join(' · '),
                        })
                      }
                      aria-label={`Phóng to ảnh đơn thuốc ngày ${formatShortVnDate(entry.date)}`}
                      className="relative w-full md:w-32 h-32 rounded-2xl overflow-hidden border border-slate-300 bg-slate-100 shrink-0 cursor-pointer group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mv.prescriptionImage}
                        alt={`Đơn thuốc ${formatShortVnDate(entry.date)}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1.5 right-1.5 px-2 py-1 rounded-lg bg-slate-900/75 text-white text-xs font-bold inline-flex items-center gap-1">
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Xem đơn</span>
                      </span>
                    </button>
                  )}
                </div>

                {/* Danh sách thuốc trong đơn */}
                {meds.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-teal-700" />
                        <span>Đơn thuốc đã kê ({meds.length} loại)</span>
                      </span>

                      {onSyncVisitToRoutines && (
                        <button
                          type="button"
                          disabled={syncingId === entry.id}
                          onClick={() => void handleSyncVisit(entry)}
                          className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer border transition ${
                            isSyncedAll
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-teal-700 hover:bg-teal-800 text-white border-teal-800'
                          }`}
                        >
                          <CalendarPlus className="w-4 h-4 shrink-0" />
                          <span>
                            {syncingId === entry.id
                              ? 'Đang đưa ra lịch...'
                              : isSyncedAll
                                ? 'Đã đưa ra lịch (Đồng bộ lại)'
                                : 'Đưa đơn thuốc ra lịch hôm nay'}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {meds.map((med) => {
                        const slotLabels =
                          med.medType === 'as_needed'
                            ? 'Khi cần'
                            : (med.timeSlots || [])
                                .map((s) => TIME_SLOT_CONFIG[s]?.label || s)
                                .join(', ');
                        const endStr =
                          med.durationDays && med.durationDays > 0
                            ? stepDateStr(entry.date, med.durationDays - 1)
                            : '';
                        const isFinished = Boolean(
                          endStr && todayStr && normalizeDateStr(todayStr) > endStr
                        );

                        return (
                          <div
                            key={med.id}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-slate-900">
                                {med.title}
                              </span>
                              {med.durationDays ? (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-xs font-extrabold border ${
                                    isFinished
                                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                                      : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                                  }`}
                                >
                                  {med.durationDays} ngày
                                  {endStr ? ` (đến ${formatCompactDayMonth(endStr)})` : ''}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                                  Dùng dài ngày
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-700 font-semibold">
                              {med.dosage ? `Liều: ${med.dosage} · ` : ''}
                              {slotLabels}
                            </div>
                            {med.instructions && (
                              <div className="text-xs text-slate-600">
                                💡 {med.instructions}
                              </div>
                            )}
                            {med.conditionNote && (
                              <div className="text-xs font-bold text-amber-900">
                                ⚠️ {med.conditionNote}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ghi chú đáp ứng */}
                {mv?.outcomeNote && outcomeEditingId !== entry.id && (
                  <div className="rounded-xl bg-amber-50/80 border border-amber-200 px-3.5 py-2.5 text-xs sm:text-sm text-amber-950 font-semibold">
                    <strong>📝 Đáp ứng sau đợt:</strong> {mv.outcomeNote}
                  </div>
                )}

                {/* Form cập nhật nhanh đáp ứng */}
                {outcomeEditingId === entry.id && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-3.5 space-y-2.5">
                    <div className="text-xs sm:text-sm font-black text-amber-950">
                      Cập nhật nhanh đáp ứng sau đợt điều trị
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <select
                        value={outcomeDraftStatus}
                        onChange={(e) =>
                          setOutcomeDraftStatus(e.target.value as MedicalVisitOutcomeStatus)
                        }
                        className="min-h-[48px] px-3 py-2 rounded-xl border border-amber-300 bg-white text-sm font-bold text-slate-900"
                      >
                        {(Object.keys(OUTCOME_STATUS_CONFIG) as MedicalVisitOutcomeStatus[]).map(
                          (st) => (
                            <option key={st} value={st}>
                              {OUTCOME_STATUS_CONFIG[st].emoji} {OUTCOME_STATUS_CONFIG[st].label}
                            </option>
                          )
                        )}
                      </select>
                      <input
                        type="text"
                        value={outcomeDraftNote}
                        onChange={(e) => setOutcomeDraftNote(e.target.value)}
                        placeholder="VD: Hết sốt sau 2 ngày, hợp thuốc..."
                        className="min-h-[48px] px-3 py-2 rounded-xl border border-amber-300 bg-white text-sm text-slate-900"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setOutcomeEditingId(null)}
                        className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 cursor-pointer"
                      >
                        Huỷ
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveQuickOutcome(entry)}
                        className="min-h-[48px] min-w-[48px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-extrabold cursor-pointer"
                      >
                        Lưu đáp ứng
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Lightbox phóng to ảnh đơn thuốc */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">
                  {previewPhoto.title}
                </h4>
                {previewPhoto.subtitle && (
                  <p className="text-xs text-slate-600 truncate">{previewPhoto.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                aria-label="Đóng xem ảnh đơn thuốc"
                className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-slate-100 overflow-auto flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MedicalVisitsSection;
