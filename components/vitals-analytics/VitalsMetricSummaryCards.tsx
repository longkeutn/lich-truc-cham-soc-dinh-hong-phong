'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Pill,
  Heart,
  Info,
} from 'lucide-react';
import type { BpThresholds } from '@/lib/types';
import { evaluateVitalReading } from '@/lib/config';
import {
  alertColors,
  evaluatePulse,
  fmtDateShort,
  periodLabel,
  type VitalsSummaryStats,
  type VitalsComplianceStats,
} from './vitalsAnalyticsTypes';

interface VitalsMetricSummaryCardsProps {
  summaryStats: VitalsSummaryStats;
  complianceStats: VitalsComplianceStats;
  bpThresholds: BpThresholds;
  patientName: string;
}

export function VitalsMetricSummaryCards({
  summaryStats,
  complianceStats,
  bpThresholds,
  patientName,
}: VitalsMetricSummaryCardsProps) {
  const [activeCardInfo, setActiveCardInfo] = useState<number | null>(null);

  const latestEval = summaryStats.latest
    ? evaluateVitalReading(summaryStats.latest, bpThresholds, patientName)
    : null;
  const latestPulseEval = evaluatePulse(summaryStats.latest?.pulse);

  const toggleCard = (id: number) => {
    setActiveCardInfo((prev) => (prev === id ? null : id));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Thẻ 1: Lần đo gần nhất */}
      <div
        className={`rounded-2xl border p-4 shadow-2xs transition ${
          latestEval
            ? `${alertColors(latestEval.bp.alertLevel).bg} ${
                alertColors(latestEval.bp.alertLevel).border
              }`
            : 'bg-surface-card border-border-card'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Heart className="w-4 h-4 text-vital-danger shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-text-body uppercase tracking-wide truncate">
              1. Lần Đo Gần Nhất
            </span>
          </div>
          <button
            type="button"
            onClick={() => toggleCard(1)}
            aria-label="Xem giải thích lần đo gần nhất"
            className={`min-h-[48px] min-w-[48px] -my-2 -mr-2 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${
              activeCardInfo === 1
                ? 'bg-teal-100 text-medical-dark'
                : 'text-text-muted hover:text-medical-primary hover:bg-white/70'
            }`}
            title="Xem giải thích lâm sàng"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {summaryStats.latest && latestEval ? (
          <>
            <div className="flex items-baseline justify-between gap-1.5 mt-1.5 flex-wrap">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <div
                  className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    alertColors(latestEval.bp.alertLevel).text
                  }`}
                >
                  {summaryStats.latest.sys}/{summaryStats.latest.dia}
                  <span className="text-xs font-bold ml-1 text-text-muted">mmHg</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-extrabold border ${latestEval.bp.badgeClass}`}
                >
                  {latestEval.bp.shortLabel}
                </span>
              </div>
              {summaryStats.latest.pulse && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold border ${latestPulseEval.badgeClass}`}
                >
                  {latestPulseEval.label}
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm text-text-muted mt-1.5 flex items-center justify-between gap-1 flex-wrap">
              <span className="font-medium">
                {periodLabel(summaryStats.latest.period)} · {fmtDateShort(summaryStats.latest.date)}{' '}
                {summaryStats.latest.time}
              </span>
              {summaryStats.previous && (
                <span className="font-semibold text-text-body">
                  So lần trước:{' '}
                  {summaryStats.deltaSys >= 0 ? `+${summaryStats.deltaSys}` : summaryStats.deltaSys}/
                  {summaryStats.deltaDia >= 0 ? `+${summaryStats.deltaDia}` : summaryStats.deltaDia}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="text-base font-semibold text-text-muted mt-2">-</div>
        )}

        {activeCardInfo === 1 && summaryStats.latest && latestEval && (
          <div className="mt-3 pt-2.5 border-t border-black/10 text-base text-text-main bg-white/90 p-3 rounded-xl leading-relaxed space-y-1">
            <div>
              💡 <strong>Đánh giá:</strong> {latestEval.bp.label}
              {latestEval.pulse.category !== 'none' ? ` • ${latestEval.pulse.label}` : ''}.
            </div>
            <div>
              📌 <strong>Lời khuyên:</strong> {latestEval.clinicalAdvice}
            </div>
          </div>
        )}
      </div>

      {/* Thẻ 2: Huyết áp Trung bình & Khoảng dao động */}
      <div className="rounded-2xl border border-border-card bg-surface-card p-4 shadow-2xs transition">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-xs sm:text-sm font-bold text-text-body uppercase tracking-wide truncate">
            2. Huyết Áp Trung Bình
          </span>
          <button
            type="button"
            onClick={() => toggleCard(2)}
            aria-label="Xem giải thích huyết áp trung bình"
            className={`min-h-[48px] min-w-[48px] -my-2 -mr-2 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${
              activeCardInfo === 2
                ? 'bg-teal-100 text-medical-dark'
                : 'text-text-muted hover:text-medical-primary hover:bg-slate-100'
            }`}
            title="Xem giải thích Huyết áp"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {summaryStats.avgSys !== null ? (
          <>
            <div className="flex items-baseline justify-between gap-2 mt-1.5 flex-wrap">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-text-main">
                  {summaryStats.avgSys}/{summaryStats.avgDia}
                </span>
                <span className="text-xs font-bold text-text-muted">
                  mmHg ({summaryStats.periodReadingsCount} lần)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-vital-safe-bg text-emerald-800 border border-emerald-200 shrink-0">
                {summaryStats.inRangePct}% đạt chuẩn
              </span>
            </div>
            <div className="text-xs sm:text-sm text-text-muted mt-1.5">
              Thấp-Cao nhất:{' '}
              <strong className="text-text-main">
                {summaryStats.minSys}-{summaryStats.maxSys}
              </strong>{' '}
              /{' '}
              <strong className="text-text-main">
                {summaryStats.minDia}-{summaryStats.maxDia}
              </strong>{' '}
              mmHg
            </div>
          </>
        ) : (
          <div className="text-base font-semibold text-text-muted mt-2">Chưa đủ dữ liệu</div>
        )}

        {activeCardInfo === 2 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs sm:text-sm text-text-body bg-slate-50 p-3 rounded-xl leading-relaxed space-y-1">
            <div>
              • <strong>Số trên (Tâm thu):</strong> Áp lực máu bơm lên não lúc tim co bóp (An toàn
              &lt;{bpThresholds.highSys}, đẹp 115-130).
            </div>
            <div>
              • <strong>Số dưới (Tâm trương):</strong> Áp lực mạch lúc tim giãn nghỉ nuôi cơ tim (An
              toàn &lt;{bpThresholds.highDia}, đẹp 70-80).
            </div>
            <div>
              • <strong>Hiệu áp (Số trên - Số dưới):</strong> Đẹp nhất <strong>40-55 mmHg</strong>{' '}
              (TB kỳ này: {summaryStats.avgPP ?? '-'} mmHg).
            </div>
          </div>
        )}
      </div>

      {/* Thẻ 3: Nhịp tim (Mạch) Trung bình */}
      <div
        className={`rounded-2xl border p-4 shadow-2xs transition ${
          summaryStats.verySlowPulseCount > 0 || summaryStats.fastPulseCount > 0
            ? 'bg-vital-danger-bg/60 border-rose-300'
            : 'bg-surface-card border-border-card'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-xs sm:text-sm font-bold text-text-body uppercase tracking-wide truncate">
            3. Nhịp Tim (Mạch) TB
          </span>
          <button
            type="button"
            onClick={() => toggleCard(3)}
            aria-label="Xem giải thích Nhịp tim"
            className={`min-h-[48px] min-w-[48px] -my-2 -mr-2 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${
              activeCardInfo === 3
                ? 'bg-amber-100 text-amber-900'
                : 'text-text-muted hover:text-amber-800 hover:bg-amber-50'
            }`}
            title="Xem giải thích Nhịp tim"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-baseline justify-between gap-2 mt-1.5 flex-wrap">
          {summaryStats.avgPulse !== null ? (
            <div
              className={`text-2xl sm:text-3xl font-black tracking-tight ${
                summaryStats.avgPulse < 50 || summaryStats.avgPulse >= 100
                  ? 'text-rose-700'
                  : summaryStats.avgPulse < 60
                    ? 'text-amber-800'
                    : 'text-text-main'
              }`}
            >
              ❤️ {summaryStats.avgPulse}
              <span className="text-xs font-bold ml-1 text-text-muted">nhịp/phút</span>
            </div>
          ) : (
            <div className="text-lg font-bold text-text-muted">Chưa đo mạch</div>
          )}

          <div className="flex items-center gap-1 text-xs font-extrabold shrink-0">
            {summaryStats.trend === 'up' ? (
              <span className="text-vital-danger flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> HA Tăng
              </span>
            ) : summaryStats.trend === 'down' ? (
              <span className="text-vital-safe flex items-center gap-0.5">
                <TrendingDown className="w-3.5 h-3.5" /> HA Giảm
              </span>
            ) : (
              <span className="text-medical-primary flex items-center gap-0.5">
                <ArrowRight className="w-3.5 h-3.5" /> HA Ổn định
              </span>
            )}
          </div>
        </div>

        <div className="text-xs sm:text-sm text-text-muted mt-1.5">
          {summaryStats.avgPulse !== null ? (
            <>
              Thấp-Cao:{' '}
              <strong className="text-text-main">
                {summaryStats.minPulse}-{summaryStats.maxPulse} bpm
              </strong>
              {summaryStats.verySlowPulseCount > 0 ? (
                <span className="text-rose-700 font-bold">
                  {' '}
                  · 🔴 {summaryStats.verySlowPulseCount} lần &lt;50 bpm
                </span>
              ) : summaryStats.slowPulseCount > 0 ? (
                <span className="text-amber-800 font-semibold">
                  {' '}
                  · ({summaryStats.slowPulseCount} lần 50-59 bpm)
                </span>
              ) : summaryStats.fastPulseCount > 0 ? (
                <span className="text-rose-700 font-bold">
                  {' '}
                  · ⚠️ {summaryStats.fastPulseCount} lần &gt;=100 bpm
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold"> · Nhịp đều</span>
              )}
            </>
          ) : (
            'Ghi thêm nhịp tim khi đo HA để theo dõi'
          )}
        </div>

        {activeCardInfo === 3 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs sm:text-sm text-text-body bg-slate-50 p-3 rounded-xl leading-relaxed">
            💡 <strong>Nhịp tim lúc nghỉ:</strong> Tốt nhất từ <strong>60-79 nhịp/phút</strong> (bình
            thường 60-99). Nếu mạch từ 50-59 là hơi chậm nhẹ; dưới 50 nhịp/phút cần hỏi Bác sĩ khi
            tái khám.
          </div>
        )}
      </div>

      {/* Thẻ 4: Tuân thủ Thuốc & Tập PHCN */}
      <div className="rounded-2xl border border-border-card bg-surface-card p-4 shadow-2xs transition">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Pill className="w-4 h-4 text-vital-safe shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-text-body uppercase tracking-wide truncate">
              4. Thuốc &amp; Tập PHCN
            </span>
          </div>
          <button
            type="button"
            onClick={() => toggleCard(4)}
            aria-label="Xem cách tính tuân thủ thuốc và tập"
            className={`min-h-[48px] min-w-[48px] -my-2 -mr-2 rounded-xl flex items-center justify-center transition cursor-pointer shrink-0 ${
              activeCardInfo === 4
                ? 'bg-emerald-100 text-emerald-800'
                : 'text-text-muted hover:text-emerald-700 hover:bg-emerald-50'
            }`}
            title="Xem cách tính tuân thủ"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {complianceStats.medsPercentage !== null ? (
          <>
            <div className="flex items-baseline justify-between gap-2 mt-1.5 flex-wrap">
              <div
                className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  complianceStats.medsPercentage >= 80
                    ? 'text-vital-safe'
                    : complianceStats.medsPercentage >= 50
                      ? 'text-vital-warning'
                      : 'text-vital-danger'
                }`}
              >
                {complianceStats.medsPercentage}%
                <span className="text-xs font-bold ml-1 text-text-muted">thuốc</span>
              </div>
              {complianceStats.rehabPercentage !== null && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  🏃 Tập: {complianceStats.rehabPercentage}% ({complianceStats.totalDoneRehab}/
                  {complianceStats.totalExpectedRehab})
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm text-text-muted mt-1.5 font-medium">
              Đã uống{' '}
              <strong className="text-text-main">
                {complianceStats.totalDoneDoses}/{complianceStats.totalExpectedDoses} cữ
              </strong>{' '}
              ({complianceStats.daysFullMeds}/{complianceStats.activeDaysCount} ngày đủ 100%)
            </div>
          </>
        ) : (
          <div className="text-base font-semibold text-text-muted mt-2">Chưa cài đơn thuốc</div>
        )}

        {activeCardInfo === 4 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs sm:text-sm text-text-body bg-vital-safe-bg/70 p-3 rounded-xl leading-relaxed">
            💡 <strong>Cách tính:</strong> Mỗi loại thuốc hay bài tập chỉ được tính từ{' '}
            <strong>Ngày bắt đầu áp dụng</strong> của chính loại đó (không tính lùi về những ngày
            chưa thêm thuốc).
          </div>
        )}
      </div>
    </div>
  );
}

export default VitalsMetricSummaryCards;
