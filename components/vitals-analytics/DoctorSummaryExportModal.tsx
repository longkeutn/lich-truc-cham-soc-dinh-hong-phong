'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Copy,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import type {
  VitalsLogEntry,
  BpThresholds,
  CareRoutine,
  HealthProfileType,
} from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  evaluateVitalReading,
  compareVitalsDesc,
} from '@/lib/config';
import {
  ALL_SLOTS,
  DATE_RANGE_OPTIONS,
  fmtDateShort,
  periodLabel,
  type DateRange,
  type VitalsSummaryStats,
  type VitalsComplianceStats,
} from './vitalsAnalyticsTypes';
import {
  buildDoctorSummaryText,
  openPrintDoctorReportWindow,
} from './doctorReportGenerator';

interface DoctorSummaryExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateRange: DateRange;
  onChangeDateRange: (range: DateRange) => void;
  patientName: string;
  patientDiagnosis?: string;
  profileType: HealthProfileType;
  bpThresholds: BpThresholds;
  normalizedVitals: VitalsLogEntry[];
  filteredLog: VitalsLogEntry[];
  careRoutines: CareRoutine[];
  summaryStats: VitalsSummaryStats;
  complianceStats: VitalsComplianceStats;
  showToast?: (msg: string, type?: 'info' | 'success' | 'warn') => void;
}

export function DoctorSummaryExportModal({
  isOpen,
  onClose,
  dateRange,
  onChangeDateRange,
  patientName,
  patientDiagnosis,
  profileType,
  bpThresholds,
  normalizedVitals,
  filteredLog,
  careRoutines,
  summaryStats,
  complianceStats,
  showToast,
}: DoctorSummaryExportModalProps) {
  const [doctorModalTab, setDoctorModalTab] = useState<'sheet' | 'zalo'>('sheet');
  const [copiedSummary, setCopiedSummary] = useState(false);

  const reportParams = useMemo(
    () => ({
      dateRange,
      patientName,
      patientDiagnosis,
      profileType,
      bpThresholds,
      normalizedVitals,
      filteredLog,
      careRoutines,
      summaryStats,
      complianceStats,
    }),
    [
      dateRange,
      patientName,
      patientDiagnosis,
      profileType,
      bpThresholds,
      normalizedVitals,
      filteredLog,
      careRoutines,
      summaryStats,
      complianceStats,
    ]
  );

  const summaryText = useMemo(() => buildDoctorSummaryText(reportParams), [reportParams]);

  const periodEntries = useMemo(
    () =>
      [...(filteredLog.length > 0 ? filteredLog : normalizedVitals)].sort(compareVitalsDesc),
    [filteredLog, normalizedVitals]
  );

  const activeMedsList = useMemo(
    () =>
      careRoutines.filter(
        (r) => r.isActive && r.category === 'meds' && r.medType !== 'as_needed'
      ),
    [careRoutines]
  );

  if (!isOpen) return null;

  const handleCopyZalo = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopiedSummary(true);
      showToast?.('Đã sao chép bản tóm tắt gửi Bác sĩ qua Zalo!', 'success');
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      showToast?.('Không thể sao chép tự động. Hãy chọn văn bản và copy thủ công.', 'warn');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-surface-card rounded-3xl border border-border-card shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-teal-900 to-teal-800 text-white flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black flex items-center gap-2 truncate">
              <FileText className="w-5 h-5 text-amber-300 shrink-0" />
              Phiếu Tóm Tắt Chỉ Số Trình Bác Sĩ · {patientName}
            </h3>
            <p className="text-xs text-teal-100 mt-0.5">
              Tổng hợp chuẩn lâm sàng để đưa Bác sĩ xem trực tiếp, in giấy A4 hoặc gửi Zalo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh chọn kỳ & chế độ xem */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-border-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeDateRange(opt.value)}
                className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                  dateRange === opt.value
                    ? 'bg-medical-primary text-white border-medical-dark'
                    : 'bg-surface-card text-text-body border-border-card hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setDoctorModalTab('sheet')}
              className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-lg text-sm font-extrabold transition cursor-pointer ${
                doctorModalTab === 'sheet'
                  ? 'bg-surface-card text-medical-dark shadow-2xs'
                  : 'text-text-body'
              }`}
            >
              📄 Phiếu chuẩn A4
            </button>
            <button
              type="button"
              onClick={() => setDoctorModalTab('zalo')}
              className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-lg text-sm font-extrabold transition cursor-pointer ${
                doctorModalTab === 'zalo'
                  ? 'bg-surface-card text-medical-dark shadow-2xs'
                  : 'text-text-body'
              }`}
            >
              💬 Văn bản gửi Zalo
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {doctorModalTab === 'sheet' ? (
            <>
              {(summaryStats.slowPulseCount > 0 ||
                summaryStats.warningCount > 0 ||
                summaryStats.criticalCount > 0) && (
                <div className="rounded-2xl bg-vital-warning-bg border border-amber-300 p-3.5 text-base text-amber-950 space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    Điểm lưu ý lâm sàng cần trao đổi Bác sĩ:
                  </div>
                  {summaryStats.slowPulseCount > 0 && (
                    <div>
                      • Có <strong>{summaryStats.slowPulseCount} lần</strong> nhịp tim &lt; 60 bpm
                      (thấp nhất {summaryStats.minPulse} bpm).
                    </div>
                  )}
                  {summaryStats.warningCount + summaryStats.criticalCount > 0 && (
                    <div>
                      • Có{' '}
                      <strong>
                        {summaryStats.warningCount + summaryStats.criticalCount} lần
                      </strong>{' '}
                      huyết áp vượt vùng mục tiêu (cao nhất {summaryStats.maxSys}/
                      {summaryStats.maxDia} mmHg).
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-border-card bg-slate-50 p-3">
                  <div className="text-xs font-bold text-text-muted uppercase">HA Trung bình</div>
                  <div className="text-lg sm:text-xl font-black text-text-main mt-1">
                    {summaryStats.avgSys ?? '-'}/{summaryStats.avgDia ?? '-'} mmHg
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    Biên độ: {summaryStats.minSys}-{summaryStats.maxSys}
                  </div>
                </div>
                <div className="rounded-xl border border-border-card bg-slate-50 p-3">
                  <div className="text-xs font-bold text-text-muted uppercase">Tỷ lệ đạt chuẩn</div>
                  <div className="text-lg sm:text-xl font-black text-vital-safe mt-1">
                    {summaryStats.inRangePct}%
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {summaryStats.inTargetBpCount}/{summaryStats.periodReadingsCount} lần đo
                  </div>
                </div>
                <div className="rounded-xl border border-border-card bg-slate-50 p-3">
                  <div className="text-xs font-bold text-text-muted uppercase">MAP / Hiệu áp</div>
                  <div className="text-lg sm:text-xl font-black text-text-main mt-1">
                    {summaryStats.avgMAP ?? '-'} / {summaryStats.avgPP ?? '-'}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">mmHg trung bình</div>
                </div>
                <div className="rounded-xl border border-border-card bg-slate-50 p-3">
                  <div className="text-xs font-bold text-text-muted uppercase">Nhịp tim TB</div>
                  <div className="text-lg sm:text-xl font-black text-text-main mt-1">
                    {summaryStats.avgPulse ?? '-'} bpm
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {summaryStats.minPulse ?? '-'}-{summaryStats.maxPulse ?? '-'} bpm
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border-card p-3 space-y-2">
                  <div className="text-xs font-black text-medical-dark uppercase">
                    I. Trung bình theo 4 buổi
                  </div>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    {ALL_SLOTS.map((slot) => {
                      const st = summaryStats.byPeriod[slot];
                      const cfg = TIME_SLOT_CONFIG[slot];
                      return (
                        <div
                          key={slot}
                          className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0"
                        >
                          <span className="font-bold text-text-body">
                            {cfg.emoji} {cfg.label} ({st.count})
                          </span>
                          <span className="font-extrabold text-text-main">
                            {st.count > 0
                              ? `${st.avgSys}/${st.avgDia} mmHg${st.avgPulse ? ` · ❤️${st.avgPulse}` : ''}`
                              : 'Chưa đo'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-border-card p-3 space-y-2">
                  <div className="text-xs font-black text-medical-dark uppercase">
                    II. Thuốc định kỳ đang uống ({complianceStats.medsPercentage ?? 100}% tuân thủ)
                  </div>
                  {activeMedsList.length === 0 ? (
                    <div className="text-sm text-text-muted">Chưa cài đặt danh mục thuốc.</div>
                  ) : (
                    <div className="space-y-1.5 text-base">
                      {activeMedsList.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 last:border-0"
                        >
                          <span className="font-bold text-text-main truncate">{m.title}</span>
                          <span className="text-text-body font-semibold shrink-0">{m.dosage}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border-card overflow-hidden">
                <div className="px-3.5 py-2.5 bg-slate-100 text-xs sm:text-sm font-black text-text-main uppercase">
                  III. Nhật ký {Math.min(periodEntries.length, 15)} lần đo gần nhất trong kỳ
                </div>
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {periodEntries.slice(0, 15).map((v) => {
                    const ev = evaluateVitalReading(v, bpThresholds, patientName);
                    return (
                      <div
                        key={v.id}
                        className="px-3.5 py-2.5 text-sm sm:text-base flex items-center justify-between gap-2 flex-wrap"
                      >
                        <span className="font-semibold text-text-body">
                          {fmtDateShort(v.date)} {v.time} ({periodLabel(v.period)})
                        </span>
                        <span className="font-black text-text-main">
                          {v.sys}/{v.dia} mmHg {v.pulse ? `· ❤️${v.pulse}` : ''}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-text-muted">{ev.badgeText}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <pre className="w-full rounded-2xl bg-slate-50 border border-border-card p-4 text-sm sm:text-base text-text-main whitespace-pre-wrap font-sans leading-relaxed">
              {summaryText}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-border-card flex items-center justify-end gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleCopyZalo}
            className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-surface-card hover:bg-slate-100 text-text-main border border-border-card text-sm sm:text-base font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            {copiedSummary ? (
              <Check className="w-4 h-4 text-vital-safe" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copiedSummary ? 'Đã sao chép!' : 'Copy gửi Zalo BS'}</span>
          </button>
          <button
            type="button"
            onClick={() => openPrintDoctorReportWindow(reportParams, showToast)}
            className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-medical-primary hover:bg-medical-dark text-white text-sm sm:text-base font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In phiếu A4 / Lưu PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DoctorSummaryExportModal;
