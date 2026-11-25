'use client';

import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';
import type { HealthProfileType, LabResultEntry, PatientInfo } from '@/lib/types';
import {
  assessLabEntryClinically,
  type ClinicalClusterStatus,
} from '@/lib/clinicalAssessment';

interface ClinicalAutoAssessmentCardProps {
  entry: LabResultEntry | null;
  previousLab?: LabResultEntry | null;
  profileType?: HealthProfileType;
  patientInfo?: PatientInfo;
  todayStr?: string;
  compactHeaderLabel?: string;
}

function getOverallStyle(level: 'optimal' | 'attention' | 'warning' | 'insufficient') {
  switch (level) {
    case 'warning':
      return {
        wrap: 'border-rose-300 bg-rose-50/70',
        badge: 'bg-rose-100 text-rose-900 border-rose-300',
        badgeText: '🔴 Cần BS đánh giá',
        titleColor: 'text-rose-950',
      };
    case 'attention':
      return {
        wrap: 'border-amber-300 bg-amber-50/70',
        badge: 'bg-amber-100 text-amber-950 border-amber-300',
        badgeText: '🟡 Cần chú ý điều chỉnh',
        titleColor: 'text-amber-950',
      };
    case 'insufficient':
      return {
        wrap: 'border-slate-300 bg-slate-50/80',
        badge: 'bg-slate-100 text-slate-800 border-slate-300',
        badgeText: '⚪ Thiếu cặp đối chiếu',
        titleColor: 'text-slate-900',
      };
    default:
      return {
        wrap: 'border-emerald-300 bg-emerald-50/60',
        badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        badgeText: '🟢 Các chỉ số ổn định',
        titleColor: 'text-emerald-950',
      };
  }
}

function getClusterStyle(status: ClinicalClusterStatus) {
  switch (status) {
    case 'warning':
      return {
        card: 'border-rose-200 bg-white',
        pill: 'bg-rose-100 text-rose-900 border-rose-200',
        pillText: 'Cần BS xem xét',
      };
    case 'attention':
      return {
        card: 'border-amber-200 bg-white',
        pill: 'bg-amber-100 text-amber-950 border-amber-200',
        pillText: 'Cần chú ý',
      };
    case 'insufficient':
      return {
        card: 'border-slate-200 bg-white/90',
        pill: 'bg-slate-100 text-slate-700 border-slate-200',
        pillText: 'Chưa đủ bộ',
      };
    default:
      return {
        card: 'border-emerald-200 bg-white',
        pill: 'bg-emerald-100 text-emerald-900 border-emerald-200',
        pillText: 'Đạt chuẩn',
      };
  }
}

/**
 * Khung Nhận Xét Chỉ Số Tự Động theo chuẩn y khoa (tách biệt hoàn toàn với Kết luận & Lời dặn Bác sĩ).
 */
export function ClinicalAutoAssessmentCard({
  entry,
  previousLab,
  profileType = 'general_health',
  patientInfo,
  todayStr,
  compactHeaderLabel,
}: ClinicalAutoAssessmentCardProps) {
  const report = useMemo(() => {
    if (!entry) return null;
    return assessLabEntryClinically(entry, {
      profileType,
      birthDate: patientInfo?.birthDate,
      gender: patientInfo?.gender,
      previousLab,
      todayStr,
    });
  }, [entry, profileType, patientInfo?.birthDate, patientInfo?.gender, previousLab, todayStr]);

  if (!report || report.clusters.length === 0) {
    return null;
  }

  const style = getOverallStyle(report.overallLevel);

  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 space-y-3 ${style.wrap}`}
      aria-label="Nhận xét chỉ số tự động theo chuẩn y khoa"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm sm:text-base font-black inline-flex items-center gap-1.5 ${style.titleColor}`}>
              <Stethoscope className="w-4 h-4 shrink-0" />
              <span>Nhận Xét Chỉ Số Tự Động (Tham khảo y khoa)</span>
            </span>
            {compactHeaderLabel && (
              <span className="text-xs font-bold text-slate-600">· {compactHeaderLabel}</span>
            )}
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">
            {report.overallHeadline}
          </p>
        </div>

        <span
          className={`px-2.5 py-1 rounded-lg border text-xs font-extrabold shrink-0 self-start sm:self-center ${style.badge}`}
        >
          {style.badgeText}
        </span>
      </div>

      {/* Các chỉ số dẫn xuất y khoa tự tính (nếu đủ đầu vào) */}
      {(report.nonHdlMmol !== null || report.computedEgfr !== null) && (
        <div className="flex flex-wrap gap-2">
          {report.nonHdlMmol !== null && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-extrabold text-slate-800 inline-flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-teal-700" />
              Non-HDL-C: {report.nonHdlMmol} mmol/L
            </span>
          )}
          {report.computedEgfr !== null && (
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-extrabold text-slate-800 inline-flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-teal-700" />
              eGFR ước tính (CKD-EPI 2021): ~{report.computedEgfr} mL/phút
            </span>
          )}
        </div>
      )}

      {/* Phân tích theo từng cụm chuyên khoa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {report.clusters.map((cluster) => {
          const cStyle = getClusterStyle(cluster.status);
          return (
            <div
              key={cluster.id}
              className={`rounded-xl border p-3 space-y-1.5 ${cStyle.card}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5 min-w-0">
                  <span>{cluster.icon}</span>
                  <span className="truncate">{cluster.title}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md border text-[11px] font-extrabold shrink-0 ${cStyle.pill}`}
                >
                  {cStyle.pillText}
                </span>
              </div>

              <p className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">
                {cluster.headline}
              </p>

              {cluster.details.length > 0 && (
                <ul className="space-y-1 text-xs text-slate-700 leading-relaxed">
                  {cluster.details.map((d, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}

              {cluster.missingHint && (
                <div className="pt-1 text-[11px] font-semibold text-slate-600 flex items-start gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span>{cluster.missingHint}</span>
                </div>
              )}

              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide pt-0.5">
                Chuẩn tham chiếu: {cluster.guidelineRef}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chỉ số còn thiếu nên xét nghiệm bổ sung kỳ tới */}
      {report.missingPairs.length > 0 && (
        <div className="rounded-xl bg-white/80 border border-slate-200 p-2.5 text-xs text-slate-700 space-y-1">
          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span>Cặp chỉ số nên bổ sung kỳ tới để đánh giá trọn vẹn hơn:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-slate-600">
            {report.missingPairs.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-[11px] text-slate-600 flex items-start gap-1.5 pt-0.5">
        {report.overallLevel === 'warning' ? (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0 mt-0.5" />
        )}
        <span>{report.disclaimer}</span>
      </div>
    </div>
  );
}

export default ClinicalAutoAssessmentCard;
