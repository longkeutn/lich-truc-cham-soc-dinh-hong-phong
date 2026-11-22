'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AppointmentInfo,
  BpThresholds,
  CarePhase,
  CareRoutine,
  DailyLog,
  EmergencyContact,
  ExpenseEntry,
  FamilyMember,
  LabResultEntry,
  PatientDailyReminder,
  PatientInfo,
  RehabStage,
  ShiftRecord,
  SystemSettings,
  VitalsLogEntry,
} from '@/lib/types';
import {
  DEFAULT_APPOINTMENT,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_MEMBER_NAME,
  DEFAULT_REHAB_STAGES,
  IS_FAMILY_STANDARD_MODE,
  compareVitalsDesc,
  computeAlertLevel,
  formatVietnamDateFull,
  getVietnamDateOffsetStr,
  getVietnamDateStr,
  normalizeDateStr,
  normalizeTimeStr,
} from '@/lib/config';
import { fetchAllAppDataV2Action } from '@/lib/actions';
import type { SyncStateKind } from '@/components/ui-kit';

const EMPTY_PATIENT_INFO: PatientInfo = {
  name: DEFAULT_MEMBER_NAME,
  diagnosis: '',
  hospital: '',
  room: '',
  notes: '',
  emergencyPhone: '',
  statusBadge: 'Theo dõi sức khỏe gia đình',
  conditionTag: IS_FAMILY_STANDARD_MODE ? 'Huyết áp & Tim mạch' : 'Phục hồi tại nhà',
  headerBadge: 'Tại nhà',
  careMode: 'Chăm sóc tại nhà',
  careGoal: IS_FAMILY_STANDARD_MODE
    ? 'Huyết áp ổn định & uống thuốc đều'
    : 'Phục hồi vận động & huyết áp ổn định',
  customFields: [],
};

interface UseCareDataSyncParams {
  showToast: (message: string, type?: 'info' | 'success' | 'warn') => void;
}

/**
 * Hook quản lý đồng bộ dữ liệu Google Sheets V2, bộ nhớ đệm Stale-While-Revalidate (0ms),
 * tự động nhảy ngày nửa đêm theo múi giờ Việt Nam (UTC+7) và tự động kiểm tra bản build PWA.
 */
export function useCareDataSync({ showToast }: UseCareDataSyncParams) {
  const activePhase: CarePhase = 'phase2';

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>(EMPTY_PATIENT_INFO);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [reminders, setReminders] = useState<PatientDailyReminder[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const [vitalsLog, setVitalsLog] = useState<VitalsLogEntry[]>([]);
  const [careRoutines, setCareRoutines] = useState<CareRoutine[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [stages, setStages] = useState<RehabStage[]>(DEFAULT_REHAB_STAGES);
  const [activeStageId, setActiveStageId] = useState<string>('stage-1');
  const [appointment, setAppointment] = useState<AppointmentInfo>(DEFAULT_APPOINTMENT);
  const [bpThresholds, setBpThresholds] = useState<BpThresholds>(DEFAULT_BP_THRESHOLDS);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [labResults, setLabResults] = useState<LabResultEntry[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialLoaded, setHasInitialLoaded] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStateKind>('synced');

  const [todayStr, setTodayStr] = useState<string>(() => getVietnamDateStr());
  const todayStrRef = useRef<string>(todayStr);
  useEffect(() => {
    todayStrRef.current = todayStr;
  }, [todayStr]);

  const isFetchingRef = useRef<boolean>(false);
  const lastSyncTimestampRef = useRef<number>(0);

  const applyNormalizedAppData = useCallback((source: Record<string, unknown>) => {
    if (Array.isArray(source.shifts)) setShifts(source.shifts as ShiftRecord[]);
    if (Array.isArray(source.members)) setMembers(source.members as FamilyMember[]);
    if (source.patientInfo && typeof source.patientInfo === 'object') {
      const pInfo = source.patientInfo as PatientInfo;
      if (pInfo.name) setPatientInfo(pInfo);
    }
    if (Array.isArray(source.contacts)) setContacts(source.contacts as EmergencyContact[]);
    if (Array.isArray(source.reminders)) {
      setReminders(
        (source.reminders as PatientDailyReminder[]).map((r) => ({
          ...r,
          time: normalizeTimeStr(r.time) || r.time,
        }))
      );
    }
    if (source.settings) setSettings(source.settings as SystemSettings);

    const resolvedThresholds = (source.bpThresholds as BpThresholds) || DEFAULT_BP_THRESHOLDS;
    if (Array.isArray(source.vitalsLog)) {
      const cleanedVitals = (source.vitalsLog as VitalsLogEntry[])
        .map((v) => ({
          ...v,
          date: normalizeDateStr(v.date),
          time: normalizeTimeStr(v.time),
          alertLevel: computeAlertLevel(v.sys, v.dia, resolvedThresholds, v.pulse),
        }))
        .sort(compareVitalsDesc);
      setVitalsLog(cleanedVitals);
    }
    if (Array.isArray(source.careRoutines)) setCareRoutines(source.careRoutines as CareRoutine[]);
    if (Array.isArray(source.dailyLogs)) {
      setDailyLogs(
        (source.dailyLogs as DailyLog[]).map((l) => ({
          ...l,
          date: normalizeDateStr(l.date) || l.date,
          doneAt: l.doneAt ? normalizeTimeStr(l.doneAt) : undefined,
        }))
      );
    }
    if (Array.isArray(source.stages) && source.stages.length > 0) {
      setStages(source.stages as RehabStage[]);
      const firstActive = (source.stages as RehabStage[]).find((s) => s.isActive);
      if (firstActive) setActiveStageId(firstActive.id);
    }
    if (source.appointment) {
      const appt = source.appointment as AppointmentInfo;
      setAppointment({
        ...appt,
        nextDate: normalizeDateStr(appt.nextDate) || appt.nextDate,
        lastDate: normalizeDateStr(appt.lastDate) || appt.lastDate,
      });
    }
    if (source.bpThresholds) setBpThresholds(source.bpThresholds as BpThresholds);
    if (Array.isArray(source.expenses)) {
      setExpenses(
        (source.expenses as ExpenseEntry[]).map((e) => ({
          ...e,
          date: normalizeDateStr(e.date) || e.date,
        }))
      );
    }
    if (Array.isArray(source.labResults)) {
      setLabResults(
        (source.labResults as LabResultEntry[]).map((l) => ({
          ...l,
          date: normalizeDateStr(l.date) || l.date,
        }))
      );
    }
  }, []);

  const loadAllData = useCallback(
    async (forceRefresh = false, silent = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setSyncStatus('syncing');

      if (!silent) {
        setIsLoading(true);
      }
      if (forceRefresh && !silent) {
        showToast('Đang làm mới dữ liệu từ Google Sheets...', 'info');
      }

      try {
        const qStart = getVietnamDateOffsetStr(-30);
        const qEnd = getVietnamDateOffsetStr(7);
        const appData = await fetchAllAppDataV2Action(qStart, qEnd, activePhase, forceRefresh);

        if (appData) {
          lastSyncTimestampRef.current = Date.now();
          applyNormalizedAppData(appData as unknown as Record<string, unknown>);
          setSyncStatus('synced');
          if (forceRefresh && !silent) {
            showToast('Đã đồng bộ dữ liệu mới nhất từ Google Sheets!', 'success');
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu:', err);
        setSyncStatus('error');
        if (!silent) {
          showToast('Không thể kết nối máy chủ để tải dữ liệu.', 'warn');
        }
      } finally {
        isFetchingRef.current = false;
        setIsLoading(false);
        setHasInitialLoaded(true);
      }
    },
    [activePhase, applyNormalizedAppData, showToast]
  );

  // Khởi tạo Stale-While-Revalidate từ localStorage & tải ngầm trước các Tab phụ
  useEffect(() => {
    const currentVnDate = getVietnamDateStr();
    if (currentVnDate !== todayStrRef.current) {
      todayStrRef.current = currentVnDate;
      setTodayStr(currentVnDate);
    }

    let restoredFromSnapshot = false;
    try {
      const rawSnap = localStorage.getItem('care_app_snapshot_v2');
      if (rawSnap) {
        const snap = JSON.parse(rawSnap);
        if (snap && typeof snap === 'object') {
          applyNormalizedAppData(snap as Record<string, unknown>);
          setHasInitialLoaded(true);
          setIsLoading(false);
          restoredFromSnapshot = true;
        }
      }
    } catch {
      // Bỏ qua lỗi đọc snapshot cục bộ
    }

    void loadAllData(false, restoredFromSnapshot);

    const preloadTimer = setTimeout(() => {
      import('@/components/VitalsChartView').catch(() => {});
      import('@/components/LabResultsView').catch(() => {});
      import('@/components/FamilySupportView').catch(() => {});
      import('@/components/ExpenseTrackerView').catch(() => {});
    }, 1200);

    return () => clearTimeout(preloadTimer);
  }, [applyNormalizedAppData, loadAllData]);

  // Tự động lưu bản chụp localStorage (debounce 350ms, chống vượt Quota ảnh Base64)
  useEffect(() => {
    if (!hasInitialLoaded || typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      const snapshotPayload = {
        savedAt: Date.now(),
        shifts,
        members,
        patientInfo,
        contacts,
        reminders,
        settings,
        vitalsLog,
        careRoutines,
        dailyLogs,
        stages,
        appointment,
        bpThresholds,
        expenses,
        labResults,
      };
      try {
        localStorage.setItem('care_app_snapshot_v2', JSON.stringify(snapshotPayload));
      } catch {
        try {
          const compactPayload = {
            ...snapshotPayload,
            careRoutines: careRoutines.map((r) => ({
              ...r,
              imageUrl: r.imageUrl && r.imageUrl.length > 20000 ? '' : r.imageUrl,
            })),
          };
          localStorage.setItem('care_app_snapshot_v2', JSON.stringify(compactPayload));
        } catch {
          // Bỏ qua nếu bộ nhớ trình duyệt bị khóa
        }
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [
    hasInitialLoaded,
    shifts,
    members,
    patientInfo,
    contacts,
    reminders,
    settings,
    vitalsLog,
    careRoutines,
    dailyLogs,
    stages,
    appointment,
    bpThresholds,
    expenses,
    labResults,
  ]);

  // Tự động nhảy ngày nửa đêm, đồng bộ khi mở lại PWA & kiểm tra phiên bản build mới
  const clientBuildIdRef = useRef<string>('');
  const isUpdatingCodeRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkForNewCodeVersion = async () => {
      if (isUpdatingCodeRef.current) return;
      try {
        const res = await fetch(`/api/version?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const serverBuildId = data?.buildId ? String(data.buildId).trim() : '';
        if (!serverBuildId) return;

        if (!clientBuildIdRef.current) {
          clientBuildIdRef.current = serverBuildId;
          return;
        }
        if (serverBuildId === clientBuildIdRef.current) return;

        const lastReloadVersion = sessionStorage.getItem('app_last_reloaded_version');
        const lastReloadTime = Number(sessionStorage.getItem('app_last_reloaded_time') || '0');
        if (
          lastReloadVersion === serverBuildId &&
          Date.now() - lastReloadTime < 10 * 60 * 1000
        ) {
          clientBuildIdRef.current = serverBuildId;
          return;
        }

        // Chống mất dữ liệu: Nếu người dùng đang mở modal hoặc đang gõ chữ trong input/textarea,
        // TUYỆT ĐỐI KHÔNG tự động reload trang. Hoãn lại cho đến khi người dùng xong việc.
        const isUserActivelyEditing = Boolean(
          typeof document !== 'undefined' &&
            (document.querySelector('.fixed.inset-0') ||
              document.querySelector('input:focus, textarea:focus'))
        );

        if (isUserActivelyEditing) {
          return;
        }

        isUpdatingCodeRef.current = true;
        clientBuildIdRef.current = serverBuildId;
        sessionStorage.setItem('app_last_reloaded_version', serverBuildId);
        sessionStorage.setItem('app_last_reloaded_time', String(Date.now()));

        showToast('✨ Ứng dụng đã có cập nhật mới, đang tải lại...', 'info');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch {
        // Bỏ qua lỗi mạng ngầm
      }
    };

    const checkDateAndRefreshOnWakeUp = (source: 'wakeup' | 'interval') => {
      const currentVnDate = getVietnamDateStr();
      if (currentVnDate !== todayStrRef.current) {
        todayStrRef.current = currentVnDate;
        setTodayStr(currentVnDate);
        showToast(`🌅 Đã chuyển sang ${formatVietnamDateFull(currentVnDate)}`, 'info');
        void loadAllData(true, true);
        void checkForNewCodeVersion();
        return;
      }

      const elapsed = Date.now() - lastSyncTimestampRef.current;
      if (source === 'wakeup' && elapsed > 45 * 1000) {
        void loadAllData(true, true);
        void checkForNewCodeVersion();
      } else if (
        source === 'interval' &&
        document.visibilityState === 'visible' &&
        elapsed > 180 * 1000
      ) {
        void loadAllData(true, true);
        void checkForNewCodeVersion();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDateAndRefreshOnWakeUp('wakeup');
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker
            .getRegistration()
            .then((reg) => reg?.update())
            .catch(() => {});
        }
      }
    };
    const handleWake = () => checkDateAndRefreshOnWakeUp('wakeup');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {});
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWake);
    window.addEventListener('pageshow', handleWake);
    window.addEventListener('online', handleWake);

    const intervalId = setInterval(() => checkDateAndRefreshOnWakeUp('interval'), 30 * 1000);
    const initialVersionTimer = setTimeout(() => void checkForNewCodeVersion(), 2000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWake);
      window.removeEventListener('pageshow', handleWake);
      window.removeEventListener('online', handleWake);
      clearInterval(intervalId);
      clearTimeout(initialVersionTimer);
    };
  }, [loadAllData, showToast]);

  return {
    members,
    setMembers,
    patientInfo,
    setPatientInfo,
    contacts,
    setContacts,
    reminders,
    setReminders,
    shifts,
    setShifts,
    settings,
    vitalsLog,
    setVitalsLog,
    careRoutines,
    setCareRoutines,
    dailyLogs,
    setDailyLogs,
    stages,
    activeStageId,
    appointment,
    setAppointment,
    bpThresholds,
    setBpThresholds,
    expenses,
    setExpenses,
    labResults,
    setLabResults,
    isLoading,
    hasInitialLoaded,
    syncStatus,
    setSyncStatus,
    todayStr,
    setTodayStr,
    todayStrRef,
    loadAllData,
  };
}
