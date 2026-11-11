'use client';

import React, { useState, useMemo } from 'react';
import { Activity, FileText, Heart } from 'lucide-react';
import type { VitalsLogEntry } from '@/lib/types';
import {
  DEFAULT_MEMBER_NAME,
  computeAlertLevel,
  compareVitalsAsc,
  normalizeDateStr,
  normalizeTimeStr,
} from '@/lib/config';
import ClinicalVitalsReportSection from '@/components/ClinicalVitalsReportSection';
import { MedicalEmptyState } from '@/components/ui-kit';
import {
  DATE_RANGE_OPTIONS,
  daysAgo,
  fmtDateFull,
  type DateRange,
  type VitalsChartViewProps,
} from './vitalsAnalyticsTypes';
import { computeVitalsSummaryStats } from './vitalsStatsEngine';
import { computeVitalsComplianceStats } from './vitalsComplianceEngine';
import { VitalsMetricSummaryCards } from './VitalsMetricSummaryCards';
import { VitalsTrendRecharts } from './VitalsTrendRecharts';
import { VitalsHistoryDayList } from './VitalsHistoryDayList';
import { VitalsRoutineBreakdown } from './VitalsRoutineBreakdown';
import { DoctorSummaryExportModal } from './DoctorSummaryExportModal';
import { VitalsEditEntryModal } from './VitalsEditEntryModal';

export function VitalsAnalyticsContainer({
  vitalsLog,
  bpThresholds,
  dailyLogs,
  careRoutines,
  members = [],
  patientName = DEFAULT_MEMBER_NAME,
  patientDiagnosis,
  profileType = 'post_stroke_cranioplasty',
  showToast,
  onDeleteVitals,
  onSaveVitals,
  onToggleDailyLog,
  defaultRecorder = 'Mẹ',
}: VitalsChartViewProps) {
  const [dateRange, setDateRange] = useState<DateRange>('14d');
  const [showDoctorReportModal, setShowDoctorReportModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VitalsLogEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const normalizedVitals = useMemo(() => {
    return vitalsLog
      .map((v) => ({
        ...v,
        date: normalizeDateStr(v.date),
        time: normalizeTimeStr(v.time),
        alertLevel: computeAlertLevel(v.sys, v.dia, bpThresholds, v.pulse),
      }))
      .sort(compareVitalsAsc);
  }, [vitalsLog, bpThresholds]);

  const filteredLog = useMemo(() => {
    if (dateRange === 'all') return normalizedVitals;
    const daysMap: Record<Exclude<DateRange, 'all'>, number> = {
      today: 0,
      '3d': 2,
      '7d': 6,
      '14d': 13,
      '30d': 29,
    };
    const cutoff = daysAgo(daysMap[dateRange]);
    return normalizedVitals.filter((v) => v.date >= cutoff);
  }, [normalizedVitals, dateRange]);

  const summaryStats = useMemo(
    () => computeVitalsSummaryStats(normalizedVitals, filteredLog, bpThresholds),
    [normalizedVitals, filteredLog, bpThresholds]
  );

  const complianceStats = useMemo(
    () =>
      computeVitalsComplianceStats(
        dailyLogs,
        careRoutines,
        normalizedVitals,
        filteredLog,
        dateRange
      ),
    [dailyLogs, careRoutines, normalizedVitals, filteredLog, dateRange]
  );

  const handleDeleteEntry = async (entry: VitalsLogEntry) => {
    const ok = window.confirm(
      `Bạn có chắc muốn xoá lần đo ${entry.sys}/${entry.dia} mmHg lúc ${entry.time} ngày ${fmtDateFull(
        entry.date
      )}?`
    );
    if (!ok) return;
    setDeletingId(entry.id);
    try {
      await onDeleteVitals(entry.id);
    } finally {
      setDeletingId(null);
    }
  };

  if (vitalsLog.length === 0) {
    return (
      <MedicalEmptyState
        icon={<Heart className="w-8 h-8" />}
        badge="Sổ theo dõi Huyết áp & Nhịp tim"
        title={`Chưa có dữ liệu huyết áp nào của ${patientName}`}
        description="Hãy chuyển sang tab Hôm nay để nhập số đo Huyết áp và Nhịp tim đầu tiên. Biểu đồ xu hướng, đánh giá 4 buổi và phiếu tóm tắt trình Bác sĩ sẽ tự động hiển thị tại đây."
        tone="medical"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Thanh lọc thời gian & nút Phiếu trình Bác sĩ */}
      <div className="bg-surface-card rounded-2xl border border-border-card p-3.5 sm:p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Activity className="w-5 h-5 text-medical-primary shrink-0" />
            <h2 className="text-base sm:text-lg font-black text-text-main">
              Phân Tích Huyết Áp &amp; Tuân Thủ Điều Trị · {patientName}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-text-muted">
            Đang lọc:{' '}
            <strong className="text-text-main">
              {filteredLog.length} lần đo
            </strong>{' '}
            (Tổng lịch sử: {normalizedVitals.length} lần) · Ngưỡng mục tiêu: &lt;
            {bpThresholds.highSys}/{bpThresholds.highDia} mmHg
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDateRange(opt.value)}
              className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                dateRange === opt.value
                  ? 'bg-medical-primary text-white border-medical-dark shadow-2xs'
                  : 'bg-slate-50 text-text-body border-border-card hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowDoctorReportModal(true)}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-teal-900 hover:bg-teal-950 text-white text-sm font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Phiếu trình Bác sĩ</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ chỉ số tóm tắt */}
      <VitalsMetricSummaryCards
        summaryStats={summaryStats}
        complianceStats={complianceStats}
        bpThresholds={bpThresholds}
        patientName={patientName}
      />

      {/* Biểu đồ xu hướng Recharts & Đối chiếu 4 buổi */}
      <VitalsTrendRecharts
        normalizedVitals={normalizedVitals}
        filteredLog={filteredLog}
        dailyMatrix={complianceStats.dailyMatrix}
        summaryStats={summaryStats}
        bpThresholds={bpThresholds}
        patientName={patientName}
        deletingId={deletingId}
        onEditEntry={setEditingEntry}
        onDeleteEntry={handleDeleteEntry}
      />

      {/* Báo cáo phân tích lâm sàng chi tiết (giữ nguyên tính năng chuyên sâu) */}
      <ClinicalVitalsReportSection
        vitalsLog={normalizedVitals}
        bpThresholds={bpThresholds}
        externalDateRange={dateRange}
        onChangeDateRange={setDateRange}
        patientName={patientName}
        profileType={profileType}
        showToast={showToast}
        onOpenDoctorReport={() => setShowDoctorReportModal(true)}
      />

      {/* Nhật ký đối chiếu theo ngày (HA + Thuốc + Tập bù) */}
      <VitalsHistoryDayList
        complianceStats={complianceStats}
        bpThresholds={bpThresholds}
        patientName={patientName}
        defaultRecorder={defaultRecorder}
        deletingId={deletingId}
        onEditEntry={setEditingEntry}
        onDeleteEntry={handleDeleteEntry}
        onToggleDailyLog={onToggleDailyLog}
      />

      {/* Chi tiết tuân thủ từng loại thuốc & bài tập */}
      <VitalsRoutineBreakdown complianceStats={complianceStats} />

      {/* Modal Phiếu tóm tắt trình Bác sĩ (A4 + Zalo) */}
      <DoctorSummaryExportModal
        isOpen={showDoctorReportModal}
        onClose={() => setShowDoctorReportModal(false)}
        dateRange={dateRange}
        onChangeDateRange={setDateRange}
        patientName={patientName}
        patientDiagnosis={patientDiagnosis}
        profileType={profileType}
        bpThresholds={bpThresholds}
        normalizedVitals={normalizedVitals}
        filteredLog={filteredLog}
        careRoutines={careRoutines}
        summaryStats={summaryStats}
        complianceStats={complianceStats}
        showToast={showToast}
      />

      {/* Modal Sửa bản ghi sinh hiệu */}
      <VitalsEditEntryModal
        entry={editingEntry}
        bpThresholds={bpThresholds}
        patientName={patientName}
        profileType={profileType}
        members={members}
        defaultRecorder={defaultRecorder}
        onClose={() => setEditingEntry(null)}
        onSaveVitals={onSaveVitals}
      />
    </div>
  );
}

export default VitalsAnalyticsContainer;
