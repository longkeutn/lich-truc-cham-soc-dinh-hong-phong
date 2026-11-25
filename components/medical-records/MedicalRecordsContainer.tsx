'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FileSpreadsheet, FlaskConical, Plus, Stethoscope } from 'lucide-react';
import type { LabResultEntry, MedicalVisitOutcomeStatus } from '@/lib/types';
import { DEFAULT_HEALTH_PROFILE_ID, evaluateLabEntry, normalizeDateStr } from '@/lib/config';
import {
  buildCareRoutineFromVisitMed,
  findLinkedRoutineForMed,
  getVisitSyncStatus,
} from '@/lib/medicalVisitUtils';
import { buildLatestKnownLabSnapshot } from '@/lib/thyroidClinicalEval';
import { analyzeThyroidPostOpMilestones } from '@/lib/thyroidMilestones';
import { MedicalEmptyState } from '@/components/ui-kit';
import {
  buildLabChartData,
  type LabResultsViewProps,
  type LabSubView,
} from './labRecordsUtils';
import { ThyroidTrackerSection } from './ThyroidTrackerSection';
import { ThyroidMilestoneAssessmentCard } from './ThyroidMilestoneAssessmentCard';
import { BiochemistryTrackerSection } from './BiochemistryTrackerSection';
import { ClinicalAppointmentSection } from './ClinicalAppointmentSection';
import { PediatricGrowthSection } from './PediatricGrowthSection';
import { ChildVaccineSection } from './ChildVaccineSection';
import { MedicalVisitsSection } from './MedicalVisitsSection';
import { MedicalVisitFormModal } from './MedicalVisitFormModal';
import { AppointmentSection } from '@/components/AppointmentSection';
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
  patientInfo,
  onUpdatePatientInfo,
  initialSubView,
  profileType,
  members,
  defaultRecorder,
  onSaveLabResult,
  onDeleteLabResult,
  showToast,
  appointment,
  onSaveAppointment,
  isAdmin = false,
  routines = [],
  stages = [],
  activeStageId = 'stage-1',
  onSaveRoutine,
  onDeleteRoutine,
  autoOpenAddVisit = false,
  onConsumeAutoOpenAddVisit,
}: LabResultsViewProps) {
  const isPediatric = profileType === 'pediatric';
  const [subView, setSubView] = useState<LabSubView>(
    initialSubView || (isPediatric ? 'growth' : 'all')
  );
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LabResultEntry | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [editingVisitEntry, setEditingVisitEntry] = useState<LabResultEntry | null>(null);

  useEffect(() => {
    if (initialSubView) {
      setSubView(initialSubView);
      return;
    }
    setSubView(profileType === 'pediatric' ? 'growth' : 'all');
  }, [profileId, profileType, initialSubView]);

  useEffect(() => {
    if (autoOpenAddVisit) {
      setSubView('visits');
      setEditingVisitEntry(null);
      setVisitModalOpen(true);
      onConsumeAutoOpenAddVisit?.();
    }
  }, [autoOpenAddVisit, onConsumeAutoOpenAddVisit]);

  const clinicalLabs = useMemo(
    () => labResults.filter((r) => !r.recordKind || r.recordKind === 'lab'),
    [labResults]
  );

  const growthEntries = useMemo(
    () => labResults.filter((r) => r.recordKind === 'pediatric_growth'),
    [labResults]
  );

  const vaccineEntries = useMemo(
    () => labResults.filter((r) => r.recordKind === 'pediatric_vaccine'),
    [labResults]
  );

  const visitEntries = useMemo(
    () => labResults.filter((r) => r.recordKind === 'medical_visit'),
    [labResults]
  );

  const sortedLabsDesc = useMemo(() => {
    return [...clinicalLabs].sort((a, b) => {
      const dCmp = normalizeDateStr(b.date).localeCompare(normalizeDateStr(a.date));
      if (dCmp !== 0) return dCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [clinicalLabs]);

  const sortedLabsAsc = useMemo(() => [...sortedLabsDesc].reverse(), [sortedLabsDesc]);

  const latestLab = sortedLabsDesc[0] || null;
  const previousLab = sortedLabsDesc[1] || null;

  const labSnapshot = useMemo(
    () => buildLatestKnownLabSnapshot(sortedLabsDesc),
    [sortedLabsDesc]
  );

  const effectiveLatestLab = labSnapshot.mergedEntry || latestLab;

  const latestEval = useMemo(
    () =>
      effectiveLatestLab
        ? evaluateLabEntry(
            effectiveLatestLab,
            profileType,
            labSnapshot.previousEntryByKey['tg'] || previousLab,
            {
              birthDate: patientInfo?.birthDate,
              gender: patientInfo?.gender,
              todayStr,
            }
          )
        : null,
    [
      effectiveLatestLab,
      profileType,
      labSnapshot.previousEntryByKey,
      previousLab,
      patientInfo?.birthDate,
      patientInfo?.gender,
      todayStr,
    ]
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

  const hasThyroidData = useMemo(
    () =>
      sortedLabsDesc.some(
        (r) =>
          r.tsh !== undefined ||
          r.ft4 !== undefined ||
          r.ft3 !== undefined ||
          r.t3 !== undefined ||
          r.t4 !== undefined ||
          r.tg !== undefined ||
          r.antiTg !== undefined ||
          r.antiTpo !== undefined ||
          Boolean(r.levothyroxineDose)
      ),
    [sortedLabsDesc]
  );

  const showThyroidSection = profileType === 'thyroid_post_op' || hasThyroidData;

  useEffect(() => {
    if (subView === 'thyroid' && !showThyroidSection) {
      setSubView('all');
    }
  }, [subView, showThyroidSection]);

  const milestoneAssessment = useMemo(
    () =>
      showThyroidSection
        ? analyzeThyroidPostOpMilestones({
            snapshot: labSnapshot,
            evalResult: latestEval,
            recentVitalsSummary,
            profileType,
            gender: patientInfo?.gender,
            todayStr,
          })
        : null,
    [
      showThyroidSection,
      labSnapshot,
      latestEval,
      recentVitalsSummary,
      profileType,
      patientInfo?.gender,
      todayStr,
    ]
  );

  const openAddModal = () => {
    setEditingEntry(null);
    setFormModalOpen(true);
  };

  const openEditModal = (entry: LabResultEntry) => {
    const originalEntry = clinicalLabs.find((item) => item.id === entry.id) || entry;
    setEditingEntry(originalEntry);
    setFormModalOpen(true);
  };

  const handleDeleteLab = async (entry: LabResultEntry) => {
    await onDeleteLabResult(entry.id);
  };

  const openAddVisitModal = useCallback(() => {
    setEditingVisitEntry(null);
    setVisitModalOpen(true);
  }, []);

  const openEditVisitModal = useCallback((entry: LabResultEntry) => {
    setEditingVisitEntry(entry);
    setVisitModalOpen(true);
  }, []);

  const syncVisitPrescriptionsToRoutines = useCallback(
    async (visitEntry: LabResultEntry): Promise<LabResultEntry> => {
      if (!onSaveRoutine || !visitEntry.medicalVisit) return visitEntry;
      const meds = visitEntry.medicalVisit.prescriptions || [];

      const effectiveProfileId = profileId || DEFAULT_HEALTH_PROFILE_ID;
      const activeStageObj = stages.find((s) => s.id === activeStageId);
      const stageName = activeStageObj?.name || 'Tại nhà';
      const maxExistingSort = routines.reduce((mx, r) => Math.max(mx, r.sortOrder || 0), 0);

      const updatedMeds = [...meds];
      const keptRoutineIds = new Set<string>();
      for (let i = 0; i < updatedMeds.length; i++) {
        const med = updatedMeds[i];
        const existingRoutine = findLinkedRoutineForMed(med, visitEntry, routines);
        const routineObj = buildCareRoutineFromVisitMed({
          med,
          visitEntry,
          profileId: effectiveProfileId,
          stageId: activeStageId,
          stageName,
          sortOrder: maxExistingSort + i + 1,
          existingRoutine,
        });
        keptRoutineIds.add(routineObj.id);
        await onSaveRoutine(routineObj, { skipVisitBackSync: true, silentToast: true });
        updatedMeds[i] = { ...med, syncedRoutineId: routineObj.id };
      }

      // Gỡ bỏ các thuốc cũ thuộc đợt khám này nếu người dùng đã xoá khỏi đơn
      const orphanRoutines = routines.filter(
        (r) => r.visitId === visitEntry.id && !keptRoutineIds.has(r.id)
      );
      if (onDeleteRoutine && orphanRoutines.length > 0) {
        for (const orphan of orphanRoutines) {
          await onDeleteRoutine(orphan.id, { skipVisitBackSync: true, silentToast: true });
        }
      }

      const nextVisitEntry: LabResultEntry = {
        ...visitEntry,
        medicalVisit: {
          ...visitEntry.medicalVisit,
          prescriptions: updatedMeds,
        },
        updatedAt: new Date().toISOString(),
      };
      await onSaveLabResult(nextVisitEntry);
      if (updatedMeds.length > 0) {
        showToast(
          orphanRoutines.length > 0
            ? `💊 Đã đồng bộ ${updatedMeds.length} thuốc & gỡ ${orphanRoutines.length} thuốc cũ khỏi Checklist Hôm Nay!`
            : `💊 Đã đưa ${updatedMeds.length} thuốc trong đơn ngày ${visitEntry.date} vào Checklist Hôm Nay!`,
          'success'
        );
      } else if (orphanRoutines.length > 0) {
        showToast(
          `🗑️ Đã gỡ ${orphanRoutines.length} thuốc của đợt khám này khỏi Checklist Hôm Nay.`,
          'info'
        );
      }
      return nextVisitEntry;
    },
    [
      onSaveRoutine,
      onDeleteRoutine,
      onSaveLabResult,
      profileId,
      stages,
      activeStageId,
      routines,
      showToast,
    ]
  );

  const handleSaveVisit = useCallback(
    async (entry: LabResultEntry, options: { syncToDailyRoutines: boolean }) => {
      const syncStatus = getVisitSyncStatus(entry, routines);
      const hasLinkedOrphans = syncStatus.orphanRoutineIds.length > 0;
      if ((options.syncToDailyRoutines || hasLinkedOrphans) && onSaveRoutine) {
        if (options.syncToDailyRoutines) {
          await syncVisitPrescriptionsToRoutines(entry);
        } else {
          if (onDeleteRoutine && hasLinkedOrphans) {
            for (const orphanId of syncStatus.orphanRoutineIds) {
              await onDeleteRoutine(orphanId, { skipVisitBackSync: true, silentToast: true });
            }
          }
          await onSaveLabResult(entry);
        }
      } else {
        await onSaveLabResult(entry);
      }
    },
    [onSaveRoutine, onDeleteRoutine, onSaveLabResult, routines, syncVisitPrescriptionsToRoutines]
  );

  const handleQuickUpdateVisitOutcome = useCallback(
    async (
      entry: LabResultEntry,
      status: MedicalVisitOutcomeStatus,
      note: string,
      pauseLinkedRoutines?: boolean
    ) => {
      const updated: LabResultEntry = {
        ...entry,
        medicalVisit: {
          ...(entry.medicalVisit || { visitType: 'illness', prescriptions: [] }),
          outcomeStatus: status,
          outcomeNote: note.trim() || undefined,
        },
        updatedAt: new Date().toISOString(),
      };
      await onSaveLabResult(updated);

      let pausedCount = 0;
      if (pauseLinkedRoutines && onSaveRoutine) {
        const activeLinked = routines.filter((r) => r.visitId === entry.id && r.isActive);
        for (const r of activeLinked) {
          await onSaveRoutine(
            { ...r, isActive: false, updatedAt: new Date().toISOString() },
            { skipVisitBackSync: true, silentToast: true }
          );
          pausedCount++;
        }
      }
      showToast(
        pausedCount > 0
          ? `✅ Đã cập nhật đáp ứng đợt khám ngày ${entry.date} & tạm ngưng ${pausedCount} thuốc trên lịch hôm nay!`
          : `✅ Đã cập nhật đáp ứng đợt khám ngày ${entry.date}!`,
        'success'
      );
    },
    [onSaveLabResult, onSaveRoutine, routines, showToast]
  );

  const subTabs: Array<{ id: LabSubView; label: string }> = isPediatric
    ? [
        { id: 'growth', label: `📈 Tăng Trưởng WHO (${growthEntries.length})` },
        { id: 'visits', label: `🩺 Khám Bệnh & Đơn Thuốc (${visitEntries.length})` },
        { id: 'vaccine', label: `💉 Sổ Tiêm Chủng (${vaccineEntries.length})` },
        { id: 'all', label: `🔬 Xét Nghiệm (${sortedLabsDesc.length})` },
      ]
    : [
        { id: 'all', label: '📋 Tổng hợp toàn bộ' },
        { id: 'visits', label: `🩺 Đợt Khám & Đơn Thuốc (${visitEntries.length})` },
        ...(showThyroidSection ? [{ id: 'thyroid' as LabSubView, label: '🦋 Tuyến Giáp & Hormone' }] : []),
        { id: 'biochem', label: '🧪 Hóa Sinh & Mỡ Máu' },
        { id: 'history', label: `🗓️ Lịch Sử & Lời Dặn BS (${sortedLabsDesc.length})` },
      ];

  const bannerSubtitle = isPediatric
    ? 'Theo dõi biểu đồ chiều cao - cân nặng chuẩn WHO (-2SD / Median / +2SD), lịch tiêm chủng mở rộng & dịch vụ và kết quả xét nghiệm'
    : profileType === 'thyroid_post_op'
      ? 'Theo dõi chuyên sâu Tuyến giáp (TSH, FT4, FT3, TG, Anti-TG & Liều thuốc Levothyroxine), Cận giáp (PTH, Canxi, Phospho, Albumin, Vitamin D), Mỡ máu & Đường huyết'
      : profileType === 'post_stroke_cranioplasty'
        ? patientDiagnosis ||
          'Theo dõi mục tiêu Mỡ máu (LDL-C < 1.8 mmol/L), Đường huyết, Chức năng Gan - Thận & Hình ảnh học'
        : patientDiagnosis ||
          'Theo dõi Bộ Mỡ máu (Cholesterol, LDL-C, Triglyceride), Đường huyết (Glucose, HbA1c), Gan - Thận - Acid Uric & Siêu âm';

  return (
    <div className="space-y-4">
      {/* Banner Đầu Trang: Thích ứng Nhi Khoa (WHO & Tiêm chủng) vs Xét Nghiệm & Hóa Sinh */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white p-4 sm:p-5 shadow-sm border border-teal-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase">
                {isPediatric ? '👶 Tăng Trưởng & Tiêm Chủng' : '🔬 Xét Nghiệm & Hóa Sinh'}
              </span>
              <span className="text-xs font-bold text-teal-100">
                · Hồ sơ: {patientName} ({patientDisplayName})
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black leading-snug">
              {isPediatric
                ? `Sổ Phát Triển WHO, Tiêm Chủng & Xét Nghiệm Của ${patientDisplayName}`
                : `Sổ Theo Dõi Chỉ Số Xét Nghiệm Định Kỳ (${sortedLabsDesc.length} lần khám)`}
            </h2>
            <p className="text-sm sm:text-base text-teal-100 font-medium leading-relaxed">
              {bannerSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={openAddVisitModal}
              className="min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Stethoscope className="w-4 h-4 shrink-0" />
              <span>Ghi Đợt Khám &amp; Đơn</span>
            </button>
            {!isPediatric && (
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>Nhập từ Sheet cũ</span>
              </button>
            )}
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

      {/* Thanh chuyển đổi phân khu (Luôn hiển thị cho mọi hồ sơ để mở Đợt Khám & Đơn Thuốc tức thì) */}
      <div className="flex items-center gap-1.5 flex-wrap bg-surface-card border border-border-card rounded-2xl p-2 shadow-2xs">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubView(tab.id)}
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

      {subView === 'visits' && (
        <MedicalVisitsSection
          visitEntries={visitEntries}
          routines={routines}
          profileType={profileType}
          patientDisplayName={patientDisplayName}
          todayStr={todayStr}
          onOpenAddVisit={openAddVisitModal}
          onOpenEditVisit={openEditVisitModal}
          onDeleteVisit={handleDeleteLab}
          onQuickUpdateOutcome={handleQuickUpdateVisitOutcome}
          onSyncVisitToRoutines={
            onSaveRoutine
              ? async (entry) => {
                  await syncVisitPrescriptionsToRoutines(entry);
                }
              : undefined
          }
        />
      )}

      {isPediatric && subView === 'growth' && (
        <PediatricGrowthSection
          growthEntries={growthEntries}
          patientInfo={patientInfo}
          profileId={profileId}
          todayStr={todayStr}
          patientDisplayName={patientDisplayName}
          defaultRecorder={defaultRecorder}
          onSaveLabResult={onSaveLabResult}
          onDeleteLabResult={onDeleteLabResult}
          onUpdatePatientInfo={onUpdatePatientInfo}
        />
      )}

      {isPediatric && subView === 'vaccine' && (
        <ChildVaccineSection
          vaccineEntries={vaccineEntries}
          profileId={profileId}
          todayStr={todayStr}
          patientDisplayName={patientDisplayName}
          defaultRecorder={defaultRecorder}
          onSaveLabResult={onSaveLabResult}
          onDeleteLabResult={onDeleteLabResult}
        />
      )}

      {(subView === 'all' || subView === 'thyroid' || subView === 'biochem' || subView === 'history') && (
        <>
          {!isPediatric && subView === 'all' && visitEntries.length > 0 && (
            <MedicalVisitsSection
              visitEntries={visitEntries}
              routines={routines}
              profileType={profileType}
              patientDisplayName={patientDisplayName}
              todayStr={todayStr}
              onOpenAddVisit={openAddVisitModal}
              onOpenEditVisit={openEditVisitModal}
              onDeleteVisit={handleDeleteLab}
              onQuickUpdateOutcome={handleQuickUpdateVisitOutcome}
              onSyncVisitToRoutines={
                onSaveRoutine
                  ? async (entry) => {
                      await syncVisitPrescriptionsToRoutines(entry);
                    }
                  : undefined
              }
            />
          )}

          {sortedLabsDesc.length === 0 ? (
            <div className="space-y-4">
              <MedicalEmptyState
                icon={<FlaskConical className="w-8 h-8" />}
                badge="Hồ sơ Xét nghiệm & Cận lâm sàng"
                title={`Chưa có kết quả xét nghiệm máu nào của ${patientDisplayName} (${patientName})`}
                description={
                  <>
                    Bạn có thể bấm <strong>Nhập Kết Quả Xét Nghiệm</strong> để lưu các chỉ số khi đi
                    khám về{!isPediatric && ', hoặc dán nhanh toàn bộ lịch sử từ bảng Google Sheet cũ'}.
                  </>
                }
                tone={profileType === 'thyroid_post_op' ? 'thyroid' : 'medical'}
                primaryAction={{
                  label: 'Nhập kết quả xét nghiệm đầu tiên',
                  onClick: openAddModal,
                  icon: <Plus className="w-4 h-4" />,
                }}
                secondaryAction={
                  !isPediatric
                    ? {
                        label: 'Dán lịch sử từ Google Sheet cũ',
                        onClick: () => setImportModalOpen(true),
                        icon: <FileSpreadsheet className="w-4 h-4" />,
                      }
                    : undefined
                }
              />
              {appointment && onSaveAppointment && (
                <AppointmentSection
                  appointment={appointment}
                  onSave={onSaveAppointment}
                  isAdmin={isAdmin}
                  todayStr={todayStr}
                  profileType={profileType}
                  patientDisplayName={patientDisplayName}
                />
              )}
            </div>
          ) : (
            <>
              {(subView === 'all' || subView === 'thyroid') && !isPediatric && showThyroidSection && (
                <>
                  {milestoneAssessment && (
                    <ThyroidMilestoneAssessmentCard
                      assessment={milestoneAssessment}
                      patientDisplayName={patientDisplayName}
                    />
                  )}
                  <ThyroidTrackerSection
                    latestLab={effectiveLatestLab}
                    previousLab={previousLab}
                    sourceDateByKey={labSnapshot.sourceDateByKey}
                    previousEntryByKey={labSnapshot.previousEntryByKey}
                    indicators={latestEval?.indicators || []}
                    chartData={chartData}
                    profileType={profileType}
                    patientName={patientName}
                    recentVitalsSummary={recentVitalsSummary}
                    onEditLab={openEditModal}
                  />
                </>
              )}

              {(subView === 'all' || subView === 'biochem') && (
                <BiochemistryTrackerSection
                  latestLab={effectiveLatestLab}
                  previousLab={previousLab}
                  sourceDateByKey={labSnapshot.sourceDateByKey}
                  previousEntryByKey={labSnapshot.previousEntryByKey}
                  profileType={profileType}
                  patientInfo={patientInfo}
                  todayStr={todayStr}
                  indicators={latestEval?.indicators || []}
                  chartData={chartData}
                  compactSummaryView={subView === 'all'}
                  onEditLab={openEditModal}
                  onOpenAddLab={openAddModal}
                  onOpenImport={() => setImportModalOpen(true)}
                />
              )}

              {(subView === 'all' || subView === 'history') && (
                <ClinicalAppointmentSection
                  sortedLabsDesc={sortedLabsDesc}
                  profileType={profileType}
                  patientDisplayName={patientDisplayName}
                  patientInfo={patientInfo}
                  todayStr={todayStr}
                  isAdmin={isAdmin}
                  appointment={appointment}
                  compactSummaryView={subView === 'all'}
                  onSaveAppointment={onSaveAppointment}
                  onEditLab={openEditModal}
                  onDeleteLab={handleDeleteLab}
                />
              )}
            </>
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
        labResults={clinicalLabs}
        profileId={profileId}
        profileType={profileType}
        patientName={patientName}
        patientDisplayName={patientDisplayName}
        defaultRecorder={defaultRecorder}
        onSaveLabResult={onSaveLabResult}
        showToast={showToast}
      />

      <MedicalVisitFormModal
        isOpen={visitModalOpen}
        editingEntry={editingVisitEntry}
        visitEntries={visitEntries}
        routines={routines}
        profileId={profileId}
        profileType={profileType}
        patientDisplayName={patientDisplayName}
        todayStr={todayStr}
        members={members}
        defaultRecorder={defaultRecorder}
        onClose={() => setVisitModalOpen(false)}
        onSaveVisit={handleSaveVisit}
      />
    </div>
  );
}

export default MedicalRecordsContainer;
