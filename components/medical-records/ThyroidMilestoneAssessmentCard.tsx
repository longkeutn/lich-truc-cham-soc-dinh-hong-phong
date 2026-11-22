'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import type {
  ClinicalMilestoneItem,
  MilestoneStatus,
  ThyroidMilestoneAssessment,
} from '@/lib/thyroidMilestones';
import { fmtDateShort } from './labRecordsUtils';

const PILLAR_META: Record<
  ClinicalMilestoneItem['pillar'],
  { title: string; subtitle: string; borderClass: string }
> = {
  thyroid: {
    title: '🦋 Trụ cột 1: Hormone & Tầm Soát Tái Phát',
    subtitle: 'TSH theo phân tầng, FT4 nửa trên, TG & Anti-TG',
    borderClass: 'border-indigo-200 bg-indigo-50/40',
  },
  parathyroid: {
    title: '🦴 Trụ cột 2: Cận Giáp - Canxi - Xương',
    subtitle: 'Canxi hiệu chỉnh, Ca++, Phospho (Ca×P), PTH, Vitamin D',
    borderClass: 'border-teal-200 bg-teal-50/40',
  },
  metabolic: {
    title: '❤️ Trụ cột 3: Tim Mạch - Chuyển Hóa - Thận',
    subtitle: 'Mạch/HA tại nhà, LDL-C, Triglyceride, Đường huyết, Creatinine',
    borderClass: 'border-amber-200 bg-amber-50/40',
  },
};

function getItemToneClass(status: MilestoneStatus): string {
  switch (status) {
    case 'critical':
      return 'border-rose-300 bg-rose-50/80';
    case 'warning':
      return 'border-amber-300 bg-amber-50/80';
    case 'stale':
      return 'border-sky-300 bg-sky-50/70';
    case 'missing':
      return 'border-dashed border-slate-300 bg-slate-50/70';
    default:
      return 'border-emerald-200 bg-surface-card';
  }
}

export function ThyroidMilestoneAssessmentCard({
  assessment,
  patientDisplayName,
}: {
  assessment: ThyroidMilestoneAssessment;
  patientDisplayName: string;
}) {
  const [activePillar, setActivePillar] = useState<'all' | ClinicalMilestoneItem['pillar']>('all');
  const [showMissingChecklist, setShowMissingChecklist] = useState(
    assessment.missingOrStaleCount > 0
  );

  const bannerToneClass =
    assessment.overallTone === 'critical'
      ? 'border-rose-300 bg-rose-50/60'
      : assessment.overallTone === 'warn'
        ? 'border-amber-300 bg-amber-50/50'
        : 'border-emerald-300 bg-emerald-50/50';

  const badgeToneClass =
    assessment.overallTone === 'critical'
      ? 'bg-rose-100 text-rose-900 border-rose-300'
      : assessment.overallTone === 'warn'
        ? 'bg-amber-100 text-amber-950 border-amber-300'
        : 'bg-emerald-100 text-emerald-900 border-emerald-300';

  const pillarsToShow: Array<ClinicalMilestoneItem['pillar']> =
    activePillar === 'all' ? ['thyroid', 'parathyroid', 'metabolic'] : [activePillar];

  return (
    <div className={`rounded-2xl border shadow-2xs p-4 sm:p-5 space-y-4 ${bannerToneClass}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-indigo-950 uppercase">
              <ClipboardCheck className="w-4 h-4 text-thyroid-accent shrink-0" />
              Đánh Giá Thực Tế Theo Các Mốc Quan Trọng · {patientDisplayName}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${badgeToneClass}`}>
              {assessment.overallBadge}
            </span>
          </div>
          <p className="text-sm sm:text-base font-bold text-text-main">
            {assessment.overallSummary}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'Tất cả (3 trụ cột)' },
            { id: 'thyroid', label: '🦋 Giáp & TG' },
            { id: 'parathyroid', label: '🦴 Canxi & PTH' },
            { id: 'metabolic', label: '❤️ Chuyển hóa' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePillar(tab.id as typeof activePillar)}
              className={`min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold border transition cursor-pointer ${
                activePillar === tab.id
                  ? 'bg-thyroid-accent text-white border-indigo-700 shadow-2xs'
                  : 'bg-surface-card hover:bg-slate-100 text-text-body border-border-card'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cảnh báo phối hợp thực tế giữa các chỉ số & nhịp tim */}
      {assessment.crossAlerts.length > 0 && (
        <div className="space-y-2">
          {assessment.crossAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-3 sm:p-3.5 flex items-start gap-2.5 ${
                alert.level === 'critical'
                  ? 'bg-rose-100/80 border-rose-300 text-rose-950'
                  : alert.level === 'warn'
                    ? 'bg-amber-100/80 border-amber-300 text-amber-950'
                    : 'bg-sky-50 border-sky-200 text-sky-950'
              }`}
            >
              {alert.level === 'critical' ? (
                <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 text-sm sm:text-base leading-relaxed">
                <div className="font-black">{alert.title}</div>
                <div>{alert.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bảng đối chiếu Mục tiêu vs Thực tế theo 3 trụ cột */}
      <div className="space-y-3">
        {pillarsToShow.map((pillarKey) => {
          const meta = PILLAR_META[pillarKey];
          const items = assessment.milestones.filter((m) => m.pillar === pillarKey);
          return (
            <div
              key={pillarKey}
              className={`rounded-2xl border p-3.5 space-y-2.5 ${meta.borderClass}`}
            >
              <div>
                <h4 className="text-sm sm:text-base font-black text-text-main">{meta.title}</h4>
                <p className="text-xs sm:text-sm text-text-muted font-medium">{meta.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {items.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-xl border p-3 space-y-1 flex flex-col justify-between ${getItemToneClass(item.status)}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-black text-text-main">{item.label}</span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-white/90 border border-slate-200 shrink-0">
                          {item.badgeText}
                        </span>
                      </div>
                      <div className="text-base font-black text-text-main">{item.actualText}</div>
                      <div className="text-xs font-bold text-indigo-900">
                        Mục tiêu: {item.targetText}
                      </div>
                      {item.sourceDate && (
                        <div className="text-xs text-text-muted font-medium inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Đo ngày {fmtDateShort(item.sourceDate)}
                          {item.monthsAgo !== undefined ? ` (${item.monthsAgo} tháng trước)` : ''}
                        </div>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-text-body pt-1.5 border-t border-slate-200/70 leading-relaxed">
                      {item.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Checklist các chỉ số còn thiếu hoặc đến hạn kiểm tra ở lần tái khám tới */}
      {assessment.missingOrDueTests.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-surface-card p-3 sm:p-3.5 space-y-2">
          <button
            type="button"
            onClick={() => setShowMissingChecklist((v) => !v)}
            aria-expanded={showMissingChecklist}
            className="w-full min-h-[48px] flex items-center justify-between gap-2 text-left font-black text-sm sm:text-base text-indigo-950 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-thyroid-accent shrink-0" />
              Checklist xét nghiệm còn thiếu / đến hạn cần bổ sung lần khám tới ({assessment.missingOrDueTests.length} mục)
            </span>
            {showMissingChecklist ? (
              <ChevronUp className="w-5 h-5 shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 shrink-0" />
            )}
          </button>

          {showMissingChecklist && (
            <ul className="list-disc list-inside space-y-1 text-sm text-text-body leading-relaxed pt-1 border-t border-slate-100">
              {assessment.missingOrDueTests.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default ThyroidMilestoneAssessmentCard;
