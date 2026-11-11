'use client';

import React, { useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Pill,
  Trash2,
  FlaskConical,
} from 'lucide-react';
import type {
  LabResultEntry,
  HealthProfileType,
  AppointmentInfo,
} from '@/lib/types';
import { evaluateLabEntry } from '@/lib/config';
import { AppointmentSection } from '@/components/AppointmentSection';
import { fmtDateShort } from './labRecordsUtils';

interface ClinicalAppointmentSectionProps {
  sortedLabsDesc: LabResultEntry[];
  profileType: HealthProfileType;
  patientDisplayName: string;
  todayStr?: string;
  isAdmin?: boolean;
  appointment?: AppointmentInfo;
  onSaveAppointment?: (info: AppointmentInfo) => Promise<void>;
  onEditLab: (entry: LabResultEntry) => void;
  onDeleteLab: (entry: LabResultEntry) => Promise<void>;
}

export function ClinicalAppointmentSection({
  sortedLabsDesc,
  profileType,
  patientDisplayName,
  todayStr,
  isAdmin = false,
  appointment,
  onSaveAppointment,
  onEditLab,
  onDeleteLab,
}: ClinicalAppointmentSectionProps) {
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (entry: LabResultEntry) => {
    const ok = window.confirm(
      `Bạn có chắc muốn xoá kết quả xét nghiệm ngày ${fmtDateShort(entry.date)} của ${patientDisplayName}?`
    );
    if (!ok) return;
    setDeletingId(entry.id);
    try {
      await onDeleteLab(entry);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {appointment && onSaveAppointment && (
        <AppointmentSection
          appointment={appointment}
          onSave={onSaveAppointment}
          isAdmin={isAdmin}
          todayStr={todayStr}
          patientDisplayName={patientDisplayName}
        />
      )}

      <div className="rounded-2xl bg-surface-card border border-border-card shadow-2xs p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-black text-text-main flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-medical-primary shrink-0" />
              Lịch Sử Các Đợt Khám &amp; Lời Dặn Bác Sĩ ({sortedLabsDesc.length} lần)
            </h3>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Bấm vào từng đợt khám để xem đầy đủ bảng chỉ số, triệu chứng và kết luận Bác sĩ.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {sortedLabsDesc.map((entry, idx) => {
            const ev = evaluateLabEntry(entry, profileType);
            const isExpanded = expandedHistoryId === entry.id || (expandedHistoryId === null && idx === 0);
            const isDeleting = deletingId === entry.id;

            return (
              <div
                key={entry.id}
                className="rounded-2xl border border-border-card bg-slate-50/50 overflow-hidden"
              >
                <div className="p-3.5 sm:p-4 bg-surface-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-black text-text-main">
                        📅 {fmtDateShort(entry.date)}
                      </span>
                      {idx === 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-medical-dark text-xs sm:text-sm font-black">
                          Gần nhất
                        </span>
                      )}
                      {entry.facility && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-text-body text-xs sm:text-sm font-bold inline-flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-text-muted" />
                          {entry.facility}
                        </span>
                      )}
                      {entry.levothyroxineDose && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 text-sm font-extrabold inline-flex items-center gap-1">
                          <Pill className="w-3.5 h-3.5 text-amber-800" />
                          {entry.levothyroxineDose}
                        </span>
                      )}
                    </div>

                    {/* Tóm tắt nhanh các chỉ số chính */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {ev.indicators.slice(0, 6).map((ind) => (
                        <span
                          key={ind.key}
                          className={`px-2 py-0.5 rounded-md text-xs sm:text-sm font-bold border ${ind.badgeClass}`}
                        >
                          {ind.shortLabel}: {ind.value} {ind.unit}
                        </span>
                      ))}
                      {ev.indicators.length > 6 && (
                        <span className="text-xs sm:text-sm font-bold text-text-muted">
                          +{ev.indicators.length - 6} chỉ số khác
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHistoryId(isExpanded ? '__collapsed__' : entry.id)
                      }
                      className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-body text-sm font-extrabold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditLab(entry)}
                      className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-text-body border border-border-card text-sm font-extrabold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(entry)}
                      className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-sm font-extrabold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{isDeleting ? '...' : 'Xoá'}</span>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-2.5 text-base">
                    {entry.symptoms && (
                      <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-text-main leading-relaxed">
                        <strong className="text-amber-950">🩺 Triệu chứng lúc khám:</strong>{' '}
                        {entry.symptoms}
                      </div>
                    )}
                    {entry.doctorAdvice && (
                      <div className="rounded-xl bg-medical-surface/70 border border-medical-border p-3 text-text-main leading-relaxed">
                        <strong className="text-medical-dark">📋 Kết luận &amp; Lời dặn Bác sĩ:</strong>{' '}
                        {entry.doctorAdvice}
                      </div>
                    )}
                    {ev.indicators.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {ev.indicators.map((ind) => (
                          <div
                            key={ind.key}
                            className="rounded-xl border border-border-card bg-surface-card p-2.5"
                          >
                            <div className="text-xs font-bold text-text-muted">{ind.shortLabel}</div>
                            <div className="text-base font-black text-text-main">
                              {ind.value} <small className="text-xs font-semibold">{ind.unit}</small>
                            </div>
                            <div className="text-xs font-semibold text-text-body mt-0.5">
                              {ind.badgeText}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {entry.customLabs && entry.customLabs.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {entry.customLabs.map((cl) => (
                          <span
                            key={cl.id}
                            className="px-2.5 py-1 rounded-lg bg-surface-card border border-border-card text-xs font-bold text-text-main"
                          >
                            {cl.name}: {cl.value} {cl.unit || ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ClinicalAppointmentSection;
