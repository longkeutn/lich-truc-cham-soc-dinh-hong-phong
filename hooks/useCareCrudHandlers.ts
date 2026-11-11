'use client';

import { useCallback } from 'react';
import type {
  AppointmentInfo,
  BpThresholds,
  CareRoutine,
  DailyLog,
  EmergencyContact,
  ExpenseEntry,
  HealthProfile,
  LabResultEntry,
  PatientDailyReminder,
  PatientInfo,
  RehabStage,
  ShiftRecord,
  VitalsLogEntry,
} from '@/lib/types';
import {
  buildPresetCareRoutinesForProfile,
  compareVitalsDesc,
  computeAlertLevel,
  ensureRecordProfilePrefix,
  evaluateVitalReading,
  getVietnamDateStr,
  normalizeDateStr,
  normalizeTimeStr,
} from '@/lib/config';
import {
  deleteLabResultAction,
  deleteRoutineAction,
  deleteVitalsAction,
  saveLabResultAction,
  saveRoutineAction,
  saveVitalsAction,
  toggleDailyLogAction,
} from '@/lib/actions';
import {
  type NotificationPreferences,
  speakVietnameseReminder,
} from '@/lib/notifications';
import type { SyncStateKind } from '@/components/ui-kit';
import { useFamilyAdminCrudHandlers } from './useFamilyAdminCrudHandlers';

interface UseCareCrudHandlersParams {
  activeProfile: HealthProfile;
  isFatherProfile: boolean;
  healthProfiles: HealthProfile[];
  patientInfo: PatientInfo;
  setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfo>>;
  profileBpThresholds: BpThresholds;
  patientDisplayName: string;
  vitalsLog: VitalsLogEntry[];
  setVitalsLog: React.Dispatch<React.SetStateAction<VitalsLogEntry[]>>;
  careRoutines: CareRoutine[];
  setCareRoutines: React.Dispatch<React.SetStateAction<CareRoutine[]>>;
  setDailyLogs: React.Dispatch<React.SetStateAction<DailyLog[]>>;
  stages: RehabStage[];
  activeStageId: string;
  labResults: LabResultEntry[];
  setLabResults: React.Dispatch<React.SetStateAction<LabResultEntry[]>>;
  setAppointment: React.Dispatch<React.SetStateAction<AppointmentInfo>>;
  setReminders: React.Dispatch<React.SetStateAction<PatientDailyReminder[]>>;
  setContacts: React.Dispatch<React.SetStateAction<EmergencyContact[]>>;
  setExpenses: React.Dispatch<React.SetStateAction<ExpenseEntry[]>>;
  setShifts: React.Dispatch<React.SetStateAction<ShiftRecord[]>>;
  todayStrRef: React.MutableRefObject<string>;
  setTodayStr: React.Dispatch<React.SetStateAction<string>>;
  notificationPrefs: NotificationPreferences;
  requireAdmin: (action: () => void) => void;
  syncRootPatientInfo: (nextInfo: PatientInfo, toastMsg?: string) => void;
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStateKind>>;
  showToast: (message: string, type?: 'info' | 'success' | 'warn') => void;
}

/**
 * Hook tập trung toàn bộ thao tác CRUD phản hồi 0ms (Optimistic UI) kèm đồng bộ nền Google Sheets.
 */
export function useCareCrudHandlers({
  activeProfile,
  isFatherProfile,
  healthProfiles,
  patientInfo,
  setPatientInfo,
  profileBpThresholds,
  patientDisplayName,
  vitalsLog,
  setVitalsLog,
  careRoutines,
  setCareRoutines,
  setDailyLogs,
  stages,
  activeStageId,
  labResults,
  setLabResults,
  setAppointment,
  setReminders,
  setContacts,
  setExpenses,
  setShifts,
  todayStrRef,
  setTodayStr,
  notificationPrefs,
  requireAdmin,
  syncRootPatientInfo,
  setSyncStatus,
  showToast,
}: UseCareCrudHandlersParams) {
  const familyCrud = useFamilyAdminCrudHandlers({
    activeProfile,
    isFatherProfile,
    healthProfiles,
    patientInfo,
    setPatientInfo,
    patientDisplayName,
    setAppointment,
    setReminders,
    setContacts,
    setExpenses,
    setShifts,
    requireAdmin,
    syncRootPatientInfo,
    setSyncStatus,
    showToast,
  });

  const handleSaveVitals = useCallback(
    async (entry: VitalsLogEntry) => {
      const scopedId = ensureRecordProfilePrefix(entry.id, activeProfile.id);
      const cleanEntry: VitalsLogEntry = {
        ...entry,
        id: scopedId,
        date: normalizeDateStr(entry.date),
        time: normalizeTimeStr(entry.time),
        alertLevel: computeAlertLevel(
          entry.sys,
          entry.dia,
          profileBpThresholds,
          entry.pulse
        ),
      };
      setVitalsLog((prev) => {
        const exists = prev.findIndex((v) => v.id === cleanEntry.id);
        const next =
          exists >= 0
            ? prev.map((v, idx) => (idx === exists ? cleanEntry : v))
            : [cleanEntry, ...prev];
        return next.sort(compareVitalsDesc);
      });

      const recorderInfo = cleanEntry.recordedBy
        ? ` · Người đo: ${cleanEntry.recordedBy}`
        : '';
      showToast(
        `💓 Đã lưu huyết áp của ${patientDisplayName}: ${cleanEntry.sys}/${cleanEntry.dia} mmHg${recorderInfo}!`,
        'success'
      );

      if (notificationPrefs.enabled && notificationPrefs.autoVoiceEnabled) {
        const evalRes = evaluateVitalReading(
          cleanEntry,
          profileBpThresholds,
          patientDisplayName
        );
        const pulseText = cleanEntry.pulse ? `, nhịp tim ${cleanEntry.pulse}` : '';
        const statusText =
          evalRes.overallAlertLevel === 'normal'
            ? `Chỉ số huyết áp và nhịp tim của ${patientDisplayName} ổn định.`
            : `${evalRes.reasons.join('. ')}. ${evalRes.clinicalAdvice}`;
        speakVietnameseReminder(
          `Đã lưu huyết áp của ${patientDisplayName}: ${cleanEntry.sys} trên ${cleanEntry.dia}${pulseText}. ${statusText}`
        );
      }

      setSyncStatus('syncing');
      void saveVitalsAction(cleanEntry)
        .then((res) => {
          if (res.success && res.entry) {
            const savedClean: VitalsLogEntry = {
              ...res.entry,
              date: normalizeDateStr(res.entry.date),
              time: normalizeTimeStr(res.entry.time),
              alertLevel: computeAlertLevel(
                res.entry.sys,
                res.entry.dia,
                profileBpThresholds,
                res.entry.pulse
              ),
            };
            setVitalsLog((prev) =>
              prev
                .map((v) => (v.id === cleanEntry.id ? savedClean : v))
                .sort(compareVitalsDesc)
            );
            setSyncStatus('synced');
          } else {
            setSyncStatus('error');
            showToast('Cảnh báo: Chưa đồng bộ được huyết áp lên Sheet.', 'warn');
          }
        })
        .catch(() => {
          setSyncStatus('error');
          showToast('Lỗi kết nối khi đồng bộ huyết áp lên Sheet.', 'warn');
        });
    },
    [
      activeProfile.id,
      profileBpThresholds,
      patientDisplayName,
      notificationPrefs.enabled,
      notificationPrefs.autoVoiceEnabled,
      setVitalsLog,
      setSyncStatus,
      showToast,
    ]
  );

  const handleDeleteVitals = useCallback(
    async (id: string) => {
      const backup = vitalsLog;
      setVitalsLog((prev) => prev.filter((v) => v.id !== id));
      showToast(`🗑️ Đã xóa bản ghi huyết áp của ${patientDisplayName}.`, 'info');
      setSyncStatus('syncing');

      void deleteVitalsAction(id)
        .then((res) => {
          if (!res.success) {
            setVitalsLog(backup);
            setSyncStatus('error');
            showToast('Lỗi xóa bản ghi trên Sheet.', 'warn');
          } else {
            setSyncStatus('synced');
          }
        })
        .catch(() => {
          setVitalsLog(backup);
          setSyncStatus('error');
          showToast('Lỗi xóa bản ghi trên Sheet.', 'warn');
        });
    },
    [vitalsLog, patientDisplayName, setVitalsLog, setSyncStatus, showToast]
  );

  const handleToggleDailyLog = useCallback(
    async (log: DailyLog) => {
      const currentVnDate = getVietnamDateStr();
      const prevToday = todayStrRef.current;
      let normalizedLog: DailyLog = {
        ...log,
        date: normalizeDateStr(log.date) || currentVnDate,
      };

      if (currentVnDate !== prevToday) {
        todayStrRef.current = currentVnDate;
        setTodayStr(currentVnDate);
        if (log.date === prevToday) {
          normalizedLog = {
            ...log,
            id: log.id.replace(`dl-${log.date}-`, `dl-${currentVnDate}-`),
            date: currentVnDate,
          };
        }
      }

      setDailyLogs((prev) => {
        const exists = prev.findIndex((l) => l.id === normalizedLog.id);
        if (exists >= 0) {
          return prev.map((l, idx) => (idx === exists ? normalizedLog : l));
        }
        return [...prev, normalizedLog];
      });

      const routineItem = careRoutines.find((r) => r.id === normalizedLog.routineId);
      if (routineItem) {
        if (normalizedLog.isDone) {
          const actor = normalizedLog.doneBy ? `${normalizedLog.doneBy} đã tích` : 'Đã tích';
          showToast(
            `✅ ${actor} hoàn thành "${routineItem.title}" (${patientDisplayName})`,
            'success'
          );
        } else {
          showToast(
            `↩️ Đã bỏ tích "${routineItem.title}" (${patientDisplayName})`,
            'info'
          );
        }
      }

      setSyncStatus('syncing');
      void toggleDailyLogAction(normalizedLog)
        .then((res) => {
          if (res.success && res.log) {
            setDailyLogs((prev) =>
              prev.map((l) => (l.id === normalizedLog.id ? res.log! : l))
            );
          }
          setSyncStatus(res.success ? 'synced' : 'error');
        })
        .catch(() => {
          setSyncStatus('error');
          showToast('Lỗi đồng bộ trạng thái checklist lên Sheet.', 'warn');
        });
    },
    [
      careRoutines,
      patientDisplayName,
      setDailyLogs,
      setSyncStatus,
      setTodayStr,
      showToast,
      todayStrRef,
    ]
  );

  const handleSaveRoutine = useCallback(
    async (routine: CareRoutine) => {
      const scopedRoutine: CareRoutine = {
        ...routine,
        id: ensureRecordProfilePrefix(routine.id, activeProfile.id),
        stageId: routine.stageId || activeStageId,
      };
      setCareRoutines((prev) => {
        const idx = prev.findIndex((r) => r.id === scopedRoutine.id);
        return idx >= 0
          ? prev.map((r, i) => (i === idx ? scopedRoutine : r))
          : [...prev, scopedRoutine];
      });
      showToast(`✅ Đã lưu cho ${patientDisplayName}: ${scopedRoutine.title}`, 'success');
      setSyncStatus('syncing');

      void saveRoutineAction(scopedRoutine)
        .then((res) => {
          setSyncStatus(res.success ? 'synced' : 'error');
          if (!res.success) {
            showToast('Lỗi đồng bộ đơn thuốc/bài tập lên Sheet.', 'warn');
          }
        })
        .catch(() => {
          setSyncStatus('error');
          showToast('Lỗi đồng bộ đơn thuốc/bài tập lên Sheet.', 'warn');
        });
    },
    [activeProfile.id, activeStageId, patientDisplayName, setCareRoutines, setSyncStatus, showToast]
  );

  const handleDeleteRoutine = useCallback(
    async (id: string) => {
      setCareRoutines((prev) => prev.filter((r) => r.id !== id));
      showToast(`🗑️ Đã xoá đầu việc chăm sóc của ${patientDisplayName}.`, 'info');
      setSyncStatus('syncing');

      void deleteRoutineAction(id)
        .then((res) => {
          setSyncStatus(res.success ? 'synced' : 'error');
          if (!res.success) {
            showToast('Lỗi xoá đơn thuốc/bài tập trên Sheet.', 'warn');
          }
        })
        .catch(() => {
          setSyncStatus('error');
          showToast('Lỗi xoá đơn thuốc/bài tập trên Sheet.', 'warn');
        });
    },
    [patientDisplayName, setCareRoutines, setSyncStatus, showToast]
  );

  const handleApplyPresetRoutines = useCallback(async () => {
    const activeStageObj = stages.find((s) => s.id === activeStageId);
    const presets = buildPresetCareRoutinesForProfile(
      activeProfile.id,
      activeProfile.profileType,
      activeStageId,
      activeStageObj?.name || 'Tại nhà'
    );
    if (presets.length === 0) return;

    setCareRoutines((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const newItems = presets.filter((p) => !existingIds.has(p.id));
      return [...prev, ...newItems];
    });
    showToast(
      `✨ Đã khởi tạo ${presets.length} đầu việc thuốc & chăm sóc mẫu cho ${patientDisplayName}!`,
      'success'
    );

    for (const preset of presets) {
      void saveRoutineAction(preset).catch(() => {});
    }
  }, [
    stages,
    activeStageId,
    activeProfile.id,
    activeProfile.profileType,
    patientDisplayName,
    setCareRoutines,
    showToast,
  ]);

  const handleSaveLabResult = useCallback(
    async (entry: LabResultEntry) => {
      const scopedEntry: LabResultEntry = {
        ...entry,
        id: ensureRecordProfilePrefix(entry.id, activeProfile.id),
        date: normalizeDateStr(entry.date),
      };
      setLabResults((prev) => {
        const idx = prev.findIndex((l) => l.id === scopedEntry.id);
        const next =
          idx >= 0
            ? prev.map((l, i) => (i === idx ? scopedEntry : l))
            : [scopedEntry, ...prev];
        return next.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      });
      showToast(
        `🔬 Đã lưu phiếu xét nghiệm ngày ${scopedEntry.date} của ${patientDisplayName}!`,
        'success'
      );
      setSyncStatus('syncing');

      void saveLabResultAction(scopedEntry)
        .then((res) => {
          setSyncStatus(res.success ? 'synced' : 'error');
          if (!res.success) {
            showToast('Cảnh báo: Chưa đồng bộ được phiếu xét nghiệm lên Sheet.', 'warn');
          }
        })
        .catch(() => {
          setSyncStatus('error');
          showToast('Lỗi đồng bộ phiếu xét nghiệm lên Google Sheets.', 'warn');
        });
    },
    [activeProfile.id, patientDisplayName, setLabResults, setSyncStatus, showToast]
  );

  const handleDeleteLabResult = useCallback(
    async (id: string) => {
      const backup = labResults;
      setLabResults((prev) => prev.filter((l) => l.id !== id));
      showToast(`🗑️ Đã xóa phiếu xét nghiệm của ${patientDisplayName}.`, 'info');
      setSyncStatus('syncing');

      void deleteLabResultAction(id)
        .then((res) => {
          if (!res.success) {
            setLabResults(backup);
            setSyncStatus('error');
            showToast('Lỗi xóa phiếu xét nghiệm trên Sheet.', 'warn');
          } else {
            setSyncStatus('synced');
          }
        })
        .catch(() => {
          setLabResults(backup);
          setSyncStatus('error');
          showToast('Lỗi xóa phiếu xét nghiệm trên Sheet.', 'warn');
        });
    },
    [labResults, patientDisplayName, setLabResults, setSyncStatus, showToast]
  );

  return {
    handleSaveVitals,
    handleDeleteVitals,
    handleToggleDailyLog,
    handleSaveRoutine,
    handleDeleteRoutine,
    handleApplyPresetRoutines,
    handleSaveLabResult,
    handleDeleteLabResult,
    ...familyCrud,
  };
}
