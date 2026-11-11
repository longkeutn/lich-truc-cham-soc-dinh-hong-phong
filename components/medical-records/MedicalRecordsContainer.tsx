'use client';

import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, FlaskConical, Plus } from 'lucide-react';
import type { LabResultEntry } from '@/lib/types';
import { evaluateLabEntry, normalizeDateStr } from '@/lib/config';
import { MedicalEmptyState } from '@/components/ui-kit';
import {
  buildLabChartData,
  type LabResultsViewProps,
  type LabSubView,
} from './labRecordsUtils';
import { ThyroidTrackerSection } from './ThyroidTrackerSection';
import { BiochemistryTrackerSection } from './BiochemistryTrackerSection';
import { ClinicalAppointmentSection } from './ClinicalAppointmentSection';
import { LabResultFormModal } from './LabResultFormModal';
import { LegacySheetImportModal } from './LegacySheetImportModal';

export function MedicalRecordsContainer({
  labResults,
  vitalsLog,
  profileId,
  todayStr,
  patientName,
  patientDisplayName,
  patientDiagnosis,
  profileType,
  members,
  defaultRecorder,
  onSaveLabResult,
  onDeleteLabResult,
  showToast,
  appointment,
  onSaveAppointment,
  isAdmin = false,
}: LabResultsViewProps) {
  const [subView, setSubView] = useState<LabSubView>('all');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LabResultEntry | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const sortedLabsDesc = useMemo(() => {
    return [...labResults].sort((a, b) => {
      const dCmp = normalizeDateStr(b.date).localeCompare(normalizeDateStr(a.date));
      if (dCmp !== 0) return dCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [labResults]);

  const sortedLabsAsc = useMemo(() => [...sortedLabsDesc].reverse(), [sortedLabsDesc]);

  const latestLab = sortedLabsDesc[0] || null;
  const previousLab = sortedLabsDesc[1] || null;

  const latestEval = useMemo(
    () => (latestLab ? evaluateLabEntry(latestLab, profileType) : null),
    [latestLab, profileType]
  );

  const chartData = useMemo(() => buildLabChartData(sortedLabsAsc), [sortedLabsAsc]);

  const recentVitalsSummary = useMemo(() => {
    const recent = vitalsLog.slice(0, 20);
    if (recent.length === 0) return null;
    const avgSys = Math.round(recent.reduce((s, v) => s + v.sys, 0) / recent.length);
    const avgDia = Math.round(recent.reduce((s, v) => s + v.dia, 0) / recent.length);
    const pulseItems = recent.filter((v) => v.pulse && v.pulse > 0);
    const avgPulse =
      pulseItems.length > 0
        ? Math.round(pulseItems.reduce((s, v) => s + (v.pulse || 0), 0) / pulseItems.length)
        : null;
    return { avgSys, avgDia, avgPulse, count: recent.length };
  }, [vitalsLog]);

  const openAddModal = () => {
    setEditingEntry(null);
    setFormModalOpen(true);
  };

  const openEditModal = (entry: LabResultEntry) => {
    setEditingEntry(entry);
    setFormModalOpen(true);
  };

  const handleDeleteLab = async (entry: LabResultEntry) => {
    await onDeleteLabResult(entry.id);
  };

  return (
    <div className="space-y-4">
      {/* Banner Đầu Trang: Sổ Xét Nghiệm & Hóa Sinh */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white p-4 sm:p-5 shadow-sm border border-teal-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase">
                🔬 Xét Nghiệm &amp; Hóa Sinh
              </span>
              <span className="text-xs font-bold text-teal-100">
                • Hồ sơ: {patientName} ({patientDisplayName})
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black leading-snug">
              Sổ Theo Dõi Chỉ Số Xét Nghiệm Định Kỳ ({sortedLabsDesc.length} lần khám)
            </h2>
            <p className="text-sm sm:text-base text-teal-100 font-medium leading-relaxed">
              {profileType === 'thyroid_post_op'
                ? 'Theo dõi chuyên sâu Tuyến giáp (TSH, FT4, FT3, TG, Anti-TG & Liều thuốc Levothyroxine), Canxi, Vitamin D, Bộ Mỡ máu & Đường huyết'
                : patientDiagnosis ||
                  'Theo dõi Bộ Mỡ máu (Cholesterol, LDL-C, Triglyceride), Đường huyết (Glucose, HbA1c), Gan Thận & Tuyến giáp'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Nhập từ Sheet cũ</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Nhập Kết Quả Xét Nghiệm</span>
            </button>
          </div>
        </div>
      </div>

      {sortedLabsDesc.length === 0 ? (
        <MedicalEmptyState
          icon={<FlaskConical className="w-8 h-8" />}
          badge="Hồ sơ Xét nghiệm & Cận lâm sàng"
          title={`Chưa có kết quả xét nghiệm nào của ${patientDisplayName} (${patientName})`}
          description={
            <>
              Bạn có thể bấm <strong>Nhập Kết Quả Xét Nghiệm</strong> để lưu các chỉ số mới đi khám
              về, hoặc bấm <strong>Nhập từ Sheet cũ</strong> để dán nhanh toàn bộ lịch sử từ bảng
              Google Sheet trước đây.
            </>
          }
          tone={profileType === 'thyroid_post_op' ? 'thyroid' : 'medical'}
          primaryAction={{
            label: 'Nhập kết quả xét nghiệm đầu tiên',
            onClick: openAddModal,
            icon: <Plus className="w-4 h-4" />,
          }}
          secondaryAction={{
            label: 'Dán lịch sử từ Google Sheet cũ',
            onClick: () => setImportModalOpen(true),
            icon: <FileSpreadsheet className="w-4 h-4" />,
          }}
        />
      ) : (
        <>
          {/* Thanh chuyển đổi phân khu Xét nghiệm */}
          <div className="flex items-center gap-1.5 flex-wrap bg-surface-card border border-border-card rounded-2xl p-2 shadow-2xs">
            {[
              { id: 'all', label: '📋 Tổng hợp toàn bộ' },
              { id: 'thyroid', label: '🦋 Tuyến Giáp & Hormone' },
              { id: 'biochem', label: '🧪 Hóa Sinh & Mỡ Máu' },
              { id: 'history', label: `🗓️ Lịch Sử & Lời Dặn BS (${sortedLabsDesc.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubView(tab.id as LabSubView)}
                className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer ${
                  subView === tab.id
                    ? 'bg-medical-primary text-white shadow-2xs'
                    : 'text-text-body hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(subView === 'all' || subView === 'thyroid') && (
            <ThyroidTrackerSection
              latestLab={latestLab}
              previousLab={previousLab}
              indicators={latestEval?.indicators || []}
              chartData={chartData}
              profileType={profileType}
              patientName={patientName}
              recentVitalsSummary={recentVitalsSummary}
              onEditLab={openEditModal}
            />
          )}

          {(subView === 'all' || subView === 'biochem') && (
            <BiochemistryTrackerSection
              latestLab={latestLab}
              previousLab={previousLab}
              indicators={latestEval?.indicators || []}
              summaryPoints={latestEval?.summaryPoints || []}
              chartData={chartData}
              onEditLab={openEditModal}
            />
          )}

          {(subView === 'all' || subView === 'history') && (
            <ClinicalAppointmentSection
              sortedLabsDesc={sortedLabsDesc}
              profileType={profileType}
              patientDisplayName={patientDisplayName}
              todayStr={todayStr}
              isAdmin={isAdmin}
              appointment={appointment}
              onSaveAppointment={onSaveAppointment}
              onEditLab={openEditModal}
              onDeleteLab={handleDeleteLab}
            />
          )}
        </>
      )}

      <LabResultFormModal
        isOpen={formModalOpen}
        editingEntry={editingEntry}
        latestLab={latestLab}
        profileId={profileId}
        profileType={profileType}
        patientName={patientName}
        members={members}
        defaultRecorder={defaultRecorder}
        onClose={() => setFormModalOpen(false)}
        onSaveLabResult={onSaveLabResult}
        showToast={showToast}
      />

      <LegacySheetImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        labResults={labResults}
        profileId={profileId}
        profileType={profileType}
        patientName={patientName}
        patientDisplayName={patientDisplayName}
        defaultRecorder={defaultRecorder}
        onSaveLabResult={onSaveLabResult}
        showToast={showToast}
      />
    </div>
  );
}

export default MedicalRecordsContainer;
