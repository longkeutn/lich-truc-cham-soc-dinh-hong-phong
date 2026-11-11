'use client';

import React, { useMemo, useState } from 'react';
import type {
  BpThresholds,
  CareRoutine,
  DailyLog,
  HealthProfileType,
  VitalsLogEntry,
} from '@/lib/types';
import {
  compareVitalsAsc,
  computeAlertLevel,
  normalizeDateStr,
  normalizeTimeStr,
} from '@/lib/config';
import { daysAgo, type DateRange } from './vitalsAnalyticsTypes';
import { computeVitalsSummaryStats } from './vitalsStatsEngine';
import { computeVitalsComplianceStats } from './vitalsComplianceEngine';
import { DoctorSummaryExportModal } from './DoctorSummaryExportModal';

export interface StandaloneDoctorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vitalsLog: VitalsLogEntry[];
  bpThresholds: BpThresholds;
  dailyLogs: DailyLog[];
  careRoutines: CareRoutine[];
  patientName: string;
  patientDiagnosis?: string;
  profileType: HealthProfileType;
  showToast?: (msg: string, type?: 'info' | 'success' | 'warn') => void;
}

export default function StandaloneDoctorReportModal({
  isOpen,
  onClose,
  vitalsLog,
  bpThresholds,
  dailyLogs,
  careRoutines,
  patientName,
  patientDiagnosis,
  profileType,
  showToast,
}: StandaloneDoctorReportModalProps) {
  const [dateRange, setDateRange] = useState<DateRange>('14d');

  const normalizedVitals = useMemo(() => {
    if (!isOpen) return [];
    return vitalsLog
      .map((v) => ({
        ...v,
        date: normalizeDateStr(v.date),
        time: normalizeTimeStr(v.time),
        alertLevel: computeAlertLevel(v.sys, v.dia, bpThresholds, v.pulse),
      }))
      .sort(compareVitalsAsc);
  }, [isOpen, vitalsLog, bpThresholds]);

  const filteredLog = useMemo(() => {
    if (!isOpen) return [];
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
  }, [isOpen, normalizedVitals, dateRange]);

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

  if (!isOpen) return null;

  return (
    <DoctorSummaryExportModal
      isOpen={isOpen}
      onClose={onClose}
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
  );
}
