'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Info,
  Stethoscope,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { VitalsLogEntry, BpThresholds, HealthProfileType } from '@/lib/types';
import {
  compareVitalsAsc,
  normalizeDateStr,
  normalizeTimeStr,
} from '@/lib/config';
import { speakVietnameseReminder, stopSpeakingVietnamese } from '@/lib/notifications';
import {
  computeCircadianAnalysis,
  computeClinicalFindings,
  computeDistributionStats,
  computeMilestones,
  getActiveEntriesForMilestone,
} from './clinicalReportStats';
import ClinicalMedicalGuidePanel from './ClinicalMedicalGuidePanel';
import ClinicalDistributionPanels from './ClinicalDistributionPanels';

export interface ClinicalVitalsReportSectionProps {
  vitalsLog: VitalsLogEntry[];
  bpThresholds: BpThresholds;
  externalDateRange?: 'today' | '3d' | '7d' | '14d' | '30d' | 'all';
  onChangeDateRange?: (range: 'today' | '3d' | '7d' | '14d' | '30d' | 'all') => void;
  patientName?: string;
  profileType?: HealthProfileType;
  showToast?: (msg: string, type?: 'info' | 'success' | 'warn') => void;
  onOpenDoctorReport?: () => void;
}

export default function ClinicalVitalsReportContainer({
  vitalsLog,
  bpThresholds,
  externalDateRange = '7d',
  onChangeDateRange,
  patientName = 'Đinh Hồng Phong',
  profileType = 'post_stroke_cranioplasty',
  showToast,
  onOpenDoctorReport,
}: ClinicalVitalsReportSectionProps) {
  const isPostStrokeProfile = profileType === 'post_stroke_cranioplasty';
  const subjectLabel = isPostStrokeProfile ? 'Bố' : patientName || 'người thân';
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(externalDateRange);
  const [isSpeakingReport, setIsSpeakingReport] = useState<boolean>(false);
  const [showMedicalGuide, setShowMedicalGuide] = useState<boolean>(false);

  useEffect(() => {
    setSelectedMilestoneId(externalDateRange);
  }, [externalDateRange]);

  const cleanedVitals = useMemo(() => {
    return vitalsLog
      .map((v) => ({
        ...v,
        date: normalizeDateStr(v.date),
        time: normalizeTimeStr(v.time),
      }))
      .filter((v) => Boolean(v.date))
      .sort(compareVitalsAsc);
  }, [vitalsLog]);

  const milestones = useMemo(
    () => computeMilestones(cleanedVitals, bpThresholds),
    [cleanedVitals, bpThresholds]
  );

  const activeMilestone = useMemo(() => {
    const found = milestones.find((m) => m.id === selectedMilestoneId);
    if (found && found.count > 0) return found;
    return (
      milestones.find((m) => m.id === '7d' && m.count > 0) ||
      milestones.find((m) => m.count > 0) ||
      milestones[3]
    );
  }, [milestones, selectedMilestoneId]);

  const activeEntries = useMemo(
    () => getActiveEntriesForMilestone(cleanedVitals, activeMilestone.id),
    [cleanedVitals, activeMilestone.id]
  );

  const circadianAnalysis = useMemo(
    () => computeCircadianAnalysis(activeEntries, subjectLabel),
    [activeEntries, subjectLabel]
  );

  const distributionStats = useMemo(
    () => computeDistributionStats(activeEntries, bpThresholds),
    [activeEntries, bpThresholds]
  );

  const clinicalFindings = useMemo(
    () => computeClinicalFindings(activeMilestone, bpThresholds, circadianAnalysis, subjectLabel),
    [activeMilestone, bpThresholds, circadianAnalysis, subjectLabel]
  );

  const handleSelectMilestone = (id: string) => {
    setSelectedMilestoneId(id);
    if (id === 'today' || id === '3d' || id === '7d' || id === '14d' || id === '30d' || id === 'all') {
      onChangeDateRange?.(id);
    }
  };

  const handleSpeakClinicalReport = () => {
    if (isSpeakingReport) {
      stopSpeakingVietnamese();
      setIsSpeakingReport(false);
      return;
    }
    if (activeMilestone.count === 0) return;

    const sentences: string[] = [
      `Đánh giá chi tiết huyết áp và nhịp tim của ${
        isPostStrokeProfile ? `bố ${patientName}` : patientName
      } trong ${activeMilestone.label} (${activeMilestone.count} lần đo):`,
    ];
    for (const f of clinicalFindings) {
      sentences.push(`${f.title}. ${f.detail}`);
    }

    setIsSpeakingReport(true);
    showToast?.(`🔊 Đang đọc bản đánh giá sức khỏe (${subjectLabel})...`, 'info');
    speakVietnameseReminder(sentences.join(' '), () => {
      setIsSpeakingReport(false);
    });
  };

  return (
    <div className="rounded-2xl border border-teal-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5 text-teal-200" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black tracking-tight truncate">
              🩺 Đánh Giá Chi Tiết Huyết Áp &amp; Nhịp Tim ({activeMilestone.label})
            </h3>
            <p className="text-xs text-teal-100/95 truncate">
              Tổng hợp tự động từ {activeMilestone.count} lần đo ({activeMilestone.daysCount} ngày) · Giải thích dễ hiểu cho gia đình
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {onOpenDoctorReport && (
            <button
              type="button"
              onClick={onOpenDoctorReport}
              className="min-h-[48px] px-3 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 border border-emerald-200 text-xs font-extrabold flex items-center gap-1 shadow-xs transition cursor-pointer"
              title="Mở Phiếu Tóm Tắt Chỉ Số Trình Bác Sĩ (Xem toàn màn hình / In A4 / Xuất PDF / Copy gửi Zalo)"
            >
              <span>📄 Phiếu trình Bác sĩ / In PDF</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSpeakClinicalReport}
            className={`min-h-[48px] px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              isSpeakingReport
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            }`}
            title="Nghe đọc bản đánh giá bằng giọng nói Tiếng Việt"
          >
            {isSpeakingReport ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <span>{isSpeakingReport ? 'Dừng đọc' : 'Đọc đánh giá'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMedicalGuide((prev) => !prev)}
            className={`min-h-[48px] px-3 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition ${
              showMedicalGuide
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
            }`}
            title="Xem giải thích chi tiết các chỉ số huyết áp & các triệu chứng đáng lo tại nhà"
          >
            <Info className="w-4 h-4" />
            <span>{showMedicalGuide ? 'Đóng giải thích' : 'Giải thích chỉ số & Dấu hiệu lo ngại'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="min-h-[48px] min-w-[48px] p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 sm:p-4 space-y-4">
          {showMedicalGuide && (
            <ClinicalMedicalGuidePanel
              profileType={profileType}
              patientName={patientName}
              subjectLabel={subjectLabel}
              bpThresholds={bpThresholds}
              onClose={() => setShowMedicalGuide(false)}
            />
          )}

          <ClinicalDistributionPanels
            activeMilestone={activeMilestone}
            milestones={milestones}
            onSelectMilestone={handleSelectMilestone}
            clinicalFindings={clinicalFindings}
            distributionStats={distributionStats}
            bpThresholds={bpThresholds}
          />

          {!showMedicalGuide && (
            <button
              type="button"
              onClick={() => setShowMedicalGuide(true)}
              className="w-full min-h-[52px] p-3 rounded-2xl bg-teal-50/80 hover:bg-teal-100/80 border border-teal-200 flex items-center justify-between gap-2 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-black text-teal-950 truncate">
                    📖 Giải thích: Số trên, Số dưới, Hiệu áp &amp; Các triệu chứng đáng lo tại nhà
                  </p>
                  <p className="text-xs text-teal-800 truncate">
                    {isPostStrokeProfile
                      ? 'Bấm để xem ý nghĩa từng chỉ số đối với bệnh cảnh sau tai biến của Bố và dấu hiệu cần gọi Bác sĩ'
                      : `Bấm để xem ý nghĩa từng chỉ số huyết áp, nhịp tim của ${subjectLabel} và dấu hiệu cần gọi Bác sĩ`}
                  </p>
                </div>
              </div>
              <span className="px-3 py-2 rounded-xl bg-white text-teal-900 border border-teal-300 text-xs font-extrabold shrink-0">
                Xem chi tiết ▾
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
