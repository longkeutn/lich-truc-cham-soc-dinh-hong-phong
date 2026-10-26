'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import HeaderBar, { AppView } from '@/components/HeaderBar';
import PatientBanner from '@/components/PatientBanner';
import QuickVitalsForm from '@/components/QuickVitalsForm';
import DailyRoutineView from '@/components/DailyRoutineView';
import { AppointmentSection } from '@/components/AppointmentSection';
import SmartReminderBanner from '@/components/SmartReminderBanner';
import SectionBanner, { SECTION_THEME } from '@/components/SectionBanner';
import SectionNavBar from '@/components/SectionNavBar';
import {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPrefs,
  saveNotificationPrefs,
  speakVietnameseReminder,
} from '@/lib/notifications';

// Lazy-load các Tab phụ & Modal nặng để trang chính tải tức thì trên điện thoại
const VitalsChartView = dynamic(
  () => import('@/components/VitalsChartView').then((m) => m.VitalsChartView),
  {
    loading: () => (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 animate-pulse">
        Đang mở biểu đồ huyết áp...
      </div>
    ),
  }
);

const FamilySupportView = dynamic(() => import('@/components/FamilySupportView'), {
  loading: () => (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 animate-pulse">
      Đang mở lịch gia đình đồng hành...
    </div>
  ),
});

const ExpenseTrackerView = dynamic(() => import('@/components/ExpenseTrackerView'), {
  loading: () => (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500 animate-pulse">
      Đang mở Sổ Theo Dõi Thu Chi...
    </div>
  ),
});

const RoutineManagerModal = dynamic(() =>
  import('@/components/RoutineManagerModal').then((m) => m.RoutineManagerModal)
);
const GoogleSheetGuideModal = dynamic(() => import('@/components/GoogleSheetGuideModal'));
const EmergencyContactsModal = dynamic(() => import('@/components/EmergencyContactsModal'));
const AdminPinModal = dynamic(() =>
  import('@/components/AdminPinModal').then((m) => m.AdminPinModal)
);
const EditPatientModal = dynamic(() =>
  import('@/components/EditPatientModal').then((m) => m.EditPatientModal)
);
const MembersManagementModal = dynamic(() =>
  import('@/components/MembersManagementModal').then((m) => m.MembersManagementModal)
);
const PwaInstallModal = dynamic(() => import('@/components/PwaInstallModal'));
const NotificationSettingsModal = dynamic(
  () => import('@/components/NotificationSettingsModal')
);

import {
  CarePhase,
  FamilyMember,
  ShiftRecord,
  SystemSettings,
  PatientInfo,
  EmergencyContact,
  PatientDailyReminder,
  VitalsLogEntry,
  CareRoutine,
  DailyLog,
  RehabStage,
  AppointmentInfo,
  BpThresholds,
  ExpenseEntry,
} from '@/lib/types';
import {
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_APPOINTMENT,
  DEFAULT_REHAB_STAGES,
  DEFAULT_RECORDER,
  getVietnamDateStr,
  getVietnamDateOffsetStr,
  formatVietnamDateFull,
  compareVitalsDesc,
  normalizeDateStr,
  normalizeTimeStr,
  computeAlertLevel,
  evaluateVitalReading,
} from '@/lib/config';
import {
  saveShiftAction,
  saveContactAction,
  deleteContactAction,
  saveReminderAction,
  deleteReminderAction,
  savePatientInfoAction,
  // V2.0 actions
  saveVitalsAction,
  deleteVitalsAction,
  saveRoutineAction,
  deleteRoutineAction,
  toggleDailyLogAction,
  saveAppointmentAction,
  verifyExpensePinAction,
  changeExpensePinAction,
  saveExpenseAction,
  deleteExpenseAction,
  fetchAllAppDataV2Action,
} from '@/lib/actions';

import {
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

const EMPTY_PATIENT_INFO: PatientInfo = {
  name: 'Đinh Hồng Phong',
  diagnosis: '',
  hospital: '',
  room: '',
  notes: '',
  emergencyPhone: '',
  statusBadge: 'Bệnh nhân theo dõi đặc biệt',
  conditionTag: 'Tai biến nặng',
  headerBadge: 'Tại nhà',
  careMode: 'Liên tục 24/7',
  careGoal: 'Chống loét & duy trì SpO2',
  customFields: [],
};

export default function CareSchedulePage() {
  // ===== Dữ liệu khởi tạo RỖNG 100% — Chỉ hiển thị dữ liệu thực từ Google Sheets =====
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>(EMPTY_PATIENT_INFO);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [reminders, setReminders] = useState<PatientDailyReminder[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // ===== Dữ liệu V2.0 mới =====
  const [vitalsLog, setVitalsLog] = useState<VitalsLogEntry[]>([]);
  const [careRoutines, setCareRoutines] = useState<CareRoutine[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [stages, setStages] = useState<RehabStage[]>(DEFAULT_REHAB_STAGES);
  const [appointment, setAppointment] = useState<AppointmentInfo>(DEFAULT_APPOINTMENT);
  const [bpThresholds, setBpThresholds] = useState<BpThresholds>(DEFAULT_BP_THRESHOLDS);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);

  // V2.0: Phase cố định là 'phase2' (tại nhà), không cho user chuyển nữa
  const activePhase: CarePhase = 'phase2';

  // V2.2: 4 tab mới + lưu các tab đã mở để chuyển qua lại tức thì (0ms) không phải render lại từ đầu
  const [activeView, setActiveView] = useState<AppView>('today');
  const [visitedViews, setVisitedViews] = useState<Record<AppView, boolean>>({
    today: true,
    charts: false,
    family: false,
    expenses: false,
  });

  const handleChangeView = useCallback((view: AppView) => {
    setActiveView(view);
    setVisitedViews((prev) => (prev[view] ? prev : { ...prev, [view]: true }));
  }, []);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialLoaded, setHasInitialLoaded] = useState<boolean>(false);
  const [guideModalOpen, setGuideModalOpen] = useState<boolean>(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState<boolean>(false);
  const [installPwaModalOpen, setInstallPwaModalOpen] = useState<boolean>(false);
  const [notifSettingsModalOpen, setNotifSettingsModalOpen] = useState<boolean>(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFS
  );
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warn' } | null>(null);

  // Admin Security & Management Modals State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isExpenseUnlocked, setIsExpenseUnlocked] = useState<boolean>(false);
  const [adminPinModalOpen, setAdminPinModalOpen] = useState<boolean>(false);
  const [adminPinModalMode, setAdminPinModalMode] = useState<'unlock' | 'change'>('unlock');
  const [editPatientModalOpen, setEditPatientModalOpen] = useState<boolean>(false);
  const [membersModalOpen, setMembersModalOpen] = useState<boolean>(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);

  // V2.0: RoutineManager Modal
  const [routineManagerOpen, setRoutineManagerOpen] = useState<boolean>(false);
  const [activeStageId, setActiveStageId] = useState<string>('stage-1');

  // Dọn dẹp bộ nhớ trình duyệt cũ (localStorage) & tải ngầm trước các tab phụ sau khi trang chính đã lên
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('care_app_member_id');
        setNotificationPrefs(loadNotificationPrefs());
        if (sessionStorage.getItem('care_admin_auth') === 'true') {
          setIsAdmin(true);
        }
        if (sessionStorage.getItem('care_expense_auth') === 'true') {
          setIsExpenseUnlocked(true);
          setIsAdmin(true);
        }
      }
    } catch {
      // ignore
    }

    // Tải ngầm trước JS của các tab phụ sau 1.2s để bấm chuyển tab phản hồi 0ms
    const preloadTimer = setTimeout(() => {
      import('@/components/VitalsChartView').catch(() => {});
      import('@/components/FamilySupportView').catch(() => {});
      import('@/components/ExpenseTrackerView').catch(() => {});
    }, 1200);

    return () => clearTimeout(preloadTimer);
  }, []);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);

  const handleSaveNotificationPrefs = useCallback((nextPrefs: NotificationPreferences) => {
    setNotificationPrefs(nextPrefs);
    saveNotificationPrefs(nextPrefs);
  }, []);

  // ===== Ngày hiện tại theo đúng Múi Giờ Việt Nam (UTC+7) — Tự động nhảy ngày khi treo PWA qua đêm =====
  const [todayStr, setTodayStr] = useState<string>(() => getVietnamDateStr());
  const todayStrRef = useRef<string>(todayStr);
  useEffect(() => {
    todayStrRef.current = todayStr;
  }, [todayStr]);

  const isFetchingRef = useRef<boolean>(false);
  const lastSyncTimestampRef = useRef<number>(0);

  // V2.0: Tải toàn bộ dữ liệu V2 từ Google Sheets (hỗ trợ chế độ silent khi tự động đồng bộ nền trên PWA)
  const loadAllData = useCallback(
    async (forceRefresh = false, silent = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (!silent) {
        setIsLoading(true);
      }
      if (forceRefresh && !silent) {
        showToast('Đang làm mới dữ liệu từ Google Sheets...', 'info');
      }

      try {
        // Lấy khoảng ngày theo đúng múi giờ Việt Nam: 30 ngày trước → 7 ngày sau (đủ cho biểu đồ HA)
        const qStart = getVietnamDateOffsetStr(-30);
        const qEnd = getVietnamDateOffsetStr(7);

        const appData = await fetchAllAppDataV2Action(qStart, qEnd, activePhase, forceRefresh);

        if (appData) {
          lastSyncTimestampRef.current = Date.now();
          // Luôn cập nhật đúng danh sách từ Google Sheets (kể cả khi bảng trên Sheet đang trống)
          if (Array.isArray(appData.shifts)) setShifts(appData.shifts);
          if (Array.isArray(appData.members)) setMembers(appData.members);
          if (appData.patientInfo && appData.patientInfo.name) setPatientInfo(appData.patientInfo);
          if (Array.isArray(appData.contacts)) setContacts(appData.contacts);
          if (Array.isArray(appData.reminders)) setReminders(appData.reminders);
          if (appData.settings) setSettings(appData.settings);

          // V2 data
          const resolvedThresholds = appData.bpThresholds || DEFAULT_BP_THRESHOLDS;
          if (Array.isArray(appData.vitalsLog)) {
            const cleanedVitals = appData.vitalsLog
              .map((v) => ({
                ...v,
                date: normalizeDateStr(v.date),
                time: normalizeTimeStr(v.time),
                alertLevel: computeAlertLevel(v.sys, v.dia, resolvedThresholds, v.pulse),
              }))
              .sort(compareVitalsDesc);
            setVitalsLog(cleanedVitals);
          }
          if (Array.isArray(appData.careRoutines)) setCareRoutines(appData.careRoutines);
          if (Array.isArray(appData.dailyLogs)) setDailyLogs(appData.dailyLogs);
          if (Array.isArray(appData.stages) && appData.stages.length > 0) {
            setStages(appData.stages);
            const firstActive = appData.stages.find((s) => s.isActive);
            if (firstActive) setActiveStageId(firstActive.id);
          }
          if (appData.appointment) setAppointment(appData.appointment);
          if (appData.bpThresholds) setBpThresholds(appData.bpThresholds);
          if (Array.isArray(appData.expenses)) setExpenses(appData.expenses);

          if (forceRefresh && !silent) {
            showToast('Đã đồng bộ dữ liệu mới nhất từ Google Sheets!', 'success');
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu:', err);
        if (!silent) {
          showToast('Không thể kết nối máy chủ để tải dữ liệu.', 'warn');
        }
      } finally {
        isFetchingRef.current = false;
        setIsLoading(false);
        setHasInitialLoaded(true);
      }
    },
    [activePhase, showToast]
  );

  useEffect(() => {
    // Đảm bảo ngay khi mount trên điện thoại lấy đúng ngày giờ Việt Nam hiện tại
    const currentVnDate = getVietnamDateStr();
    if (currentVnDate !== todayStrRef.current) {
      todayStrRef.current = currentVnDate;
      setTodayStr(currentVnDate);
    }

    // 1. STALE-WHILE-REVALIDATE: Đọc ngay bản chụp dữ liệu gần nhất từ máy (0ms) để giao diện hiện tức thì
    let restoredFromSnapshot = false;
    try {
      const rawSnap = localStorage.getItem('care_app_snapshot_v2');
      if (rawSnap) {
        const snap = JSON.parse(rawSnap);
        if (snap && typeof snap === 'object') {
          if (Array.isArray(snap.shifts)) setShifts(snap.shifts);
          if (Array.isArray(snap.members)) setMembers(snap.members);
          if (snap.patientInfo && snap.patientInfo.name) setPatientInfo(snap.patientInfo);
          if (Array.isArray(snap.contacts)) setContacts(snap.contacts);
          if (Array.isArray(snap.reminders)) setReminders(snap.reminders);
          if (snap.settings) setSettings(snap.settings);
          const snapThresholds = snap.bpThresholds || DEFAULT_BP_THRESHOLDS;
          if (Array.isArray(snap.vitalsLog)) {
            setVitalsLog(
              snap.vitalsLog.map((v: VitalsLogEntry) => ({
                ...v,
                date: normalizeDateStr(v.date),
                time: normalizeTimeStr(v.time),
                alertLevel: computeAlertLevel(v.sys, v.dia, snapThresholds, v.pulse),
              }))
            );
          }
          if (Array.isArray(snap.careRoutines)) setCareRoutines(snap.careRoutines);
          if (Array.isArray(snap.dailyLogs)) setDailyLogs(snap.dailyLogs);
          if (Array.isArray(snap.stages) && snap.stages.length > 0) setStages(snap.stages);
          if (snap.appointment) setAppointment(snap.appointment);
          if (snap.bpThresholds) setBpThresholds(snap.bpThresholds);
          if (Array.isArray(snap.expenses)) setExpenses(snap.expenses);
          setHasInitialLoaded(true);
          setIsLoading(false);
          restoredFromSnapshot = true;
        }
      }
    } catch {
      // ignore snapshot parse errors
    }

    // 2. Nếu đã hiển thị tức thì từ bản chụp -> đồng bộ ngầm (silent = true) để lấy dữ liệu mới nhất từ Google Sheets
    void loadAllData(false, restoredFromSnapshot);
  }, [loadAllData]);

  // Lưu tự động bản chụp dữ liệu mới nhất vào localStorage (debounce 350ms, chống vượt Quota)
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
      };
      try {
        localStorage.setItem('care_app_snapshot_v2', JSON.stringify(snapshotPayload));
      } catch {
        // Nếu ảnh thuốc Base64 quá nặng làm đầy localStorage -> lưu bản rút gọn ảnh lớn
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
          // ignore
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
  ]);

  // ===== CƠ CHẾ TỰ ĐỘNG NHẢY NGÀY & TỰ ĐỘNG LÀM MỚI DỮ LIỆU & TỰ ĐỘNG CẬP NHẬT MÃ NGUỒN PWA =====
  // Khắc phục triệt để việc cài PWA trên điện thoại và không tắt app qua nhiều ngày
  const clientBuildIdRef = useRef<string>('');
  const isUpdatingCodeRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Kiểm tra phiên bản mã nguồn mới nhất trên máy chủ (qua /api/version)
    // Thiết kế an toàn 100%, có cơ chế chống reload loop (tối đa 1 lần/bản build)
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

        // Lần đầu trang mount: chỉ ghi nhận version máy chủ làm mốc cơ sở, không reload
        if (!clientBuildIdRef.current) {
          clientBuildIdRef.current = serverBuildId;
          return;
        }

        // Đang chạy đúng bản build mới nhất của server -> Không cần làm gì
        if (serverBuildId === clientBuildIdRef.current) {
          return;
        }

        // BẢO VỆ CHỐNG RELOAD LOOP:
        // Kiểm tra sessionStorage xem đã reload cho bản build này gần đây chưa
        const lastReloadVersion = sessionStorage.getItem('app_last_reloaded_version');
        const lastReloadTime = Number(sessionStorage.getItem('app_last_reloaded_time') || '0');
        const elapsedSinceReload = Date.now() - lastReloadTime;

        if (lastReloadVersion === serverBuildId && elapsedSinceReload < 10 * 60 * 1000) {
          clientBuildIdRef.current = serverBuildId;
          return;
        }

        // Đánh dấu và reload đúng 1 lần duy nhất
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
      const dateChanged = currentVnDate !== todayStrRef.current;

      if (dateChanged) {
        todayStrRef.current = currentVnDate;
        setTodayStr(currentVnDate);
        showToast(`🌅 Đã chuyển sang ${formatVietnamDateFull(currentVnDate)}`, 'info');
        void loadAllData(true, true);
        void checkForNewCodeVersion();
        return;
      }

      // Khi người dùng mở lại app PWA sau hơn 45 giây ở chế độ nền: tự động đồng bộ Google Sheets & kiểm tra code mới
      const elapsedSinceLastSync = Date.now() - lastSyncTimestampRef.current;
      if (source === 'wakeup' && elapsedSinceLastSync > 45 * 1000) {
        void loadAllData(true, true);
        void checkForNewCodeVersion();
      } else if (
        source === 'interval' &&
        document.visibilityState === 'visible' &&
        elapsedSinceLastSync > 180 * 1000
      ) {
        // Khi đang xem app liên tục: làm mới dữ liệu sau 3 phút
        void loadAllData(true, true);
        void checkForNewCodeVersion();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDateAndRefreshOnWakeUp('wakeup');
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistration().then((reg) => reg?.update()).catch(() => {});
        }
      }
    };
    const handleFocus = () => checkDateAndRefreshOnWakeUp('wakeup');
    const handlePageShow = () => checkDateAndRefreshOnWakeUp('wakeup');
    const handleOnline = () => checkDateAndRefreshOnWakeUp('wakeup');

    // Đăng ký Service Worker cho PWA (ép trình duyệt không cache file /sw.js trên iOS Safari)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch(() => {});
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);

    // Kiểm tra định kỳ mỗi 30 giây để tự nhảy ngày nếu treo app qua nửa đêm
    const intervalId = setInterval(() => {
      checkDateAndRefreshOnWakeUp('interval');
    }, 30 * 1000);

    // Lấy version mốc sau 2 giây sau khi app mount xong
    const initialVersionTimer = setTimeout(() => {
      void checkForNewCodeVersion();
    }, 2000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
      clearInterval(intervalId);
      clearTimeout(initialVersionTimer);
    };
  }, [loadAllData, showToast]);

  // ===== V2.0 HANDLERS (PHẢN HỒI TỨC THÌ 0ms — ĐỒNG BỘ NGẦM LÊN SHEET) =====

  // Lưu huyết áp — Cập nhật giao diện ngay lập tức, đồng bộ Google Sheets ở chế độ nền
  const handleSaveVitals = useCallback(async (entry: VitalsLogEntry) => {
    const cleanEntry: VitalsLogEntry = {
      ...entry,
      date: normalizeDateStr(entry.date),
      time: normalizeTimeStr(entry.time),
    };
    setVitalsLog((prev) => {
      const exists = prev.findIndex((v) => v.id === cleanEntry.id);
      let next: VitalsLogEntry[];
      if (exists >= 0) {
        next = [...prev];
        next[exists] = cleanEntry;
      } else {
        next = [cleanEntry, ...prev];
      }
      return next.sort(compareVitalsDesc);
    });
    showToast('💓 Đã lưu chỉ số huyết áp!', 'success');

    // Nếu người dùng bật "🗣️ Tự đọc giọng Tiếng Việt", tự động đọc kết quả + nhận xét ngay khi lưu
    if (notificationPrefs.enabled && notificationPrefs.autoVoiceEnabled) {
      const evalRes = evaluateVitalReading(cleanEntry, bpThresholds);
      const pulseText = cleanEntry.pulse ? `, nhịp tim ${cleanEntry.pulse}` : '';
      const statusText =
        evalRes.overallAlertLevel === 'normal'
          ? 'Chỉ số huyết áp và nhịp tim ổn định.'
          : `${evalRes.reasons.join('. ')}. ${evalRes.clinicalAdvice}`;
      speakVietnameseReminder(
        `Đã lưu huyết áp ${cleanEntry.sys} trên ${cleanEntry.dia}${pulseText}. ${statusText}`
      );
    }

    // Đồng bộ ngầm không chặn giao diện
    void saveVitalsAction(cleanEntry)
      .then((res) => {
        if (res.success && res.entry) {
          const savedClean: VitalsLogEntry = {
            ...res.entry,
            date: normalizeDateStr(res.entry.date),
            time: normalizeTimeStr(res.entry.time),
          };
          setVitalsLog((prev) =>
            prev.map((v) => (v.id === cleanEntry.id ? savedClean : v)).sort(compareVitalsDesc)
          );
        } else if (!res.success) {
          showToast('Cảnh báo: Chưa đồng bộ được huyết áp lên Sheet.', 'warn');
        }
      })
      .catch(() => {
        showToast('Lỗi kết nối khi đồng bộ huyết áp lên Sheet.', 'warn');
      });
  }, [showToast, notificationPrefs.enabled, notificationPrefs.autoVoiceEnabled, bpThresholds]);

  // Xóa huyết áp — Xóa tức thì trên giao diện, đồng bộ ngầm lên Sheet
  const handleDeleteVitals = useCallback(async (id: string) => {
    const backup = vitalsLog;
    setVitalsLog((prev) => prev.filter((v) => v.id !== id));
    showToast('🗑️ Đã xóa bản ghi huyết áp.', 'info');

    void deleteVitalsAction(id)
      .then((res) => {
        if (!res.success) {
          setVitalsLog(backup);
          showToast('Lỗi xóa bản ghi trên Sheet.', 'warn');
        }
      })
      .catch(() => {
        setVitalsLog(backup);
        showToast('Lỗi xóa bản ghi trên Sheet.', 'warn');
      });
  }, [vitalsLog, showToast]);

  // Toggle checklist thuốc/tập — Phản hồi 0ms khi bấm tích, hỗ trợ cả ngày hiện tại và tích bù ngày quá khứ
  const handleToggleDailyLog = useCallback(async (log: DailyLog) => {
    const currentVnDate = getVietnamDateStr();
    const prevToday = todayStrRef.current;
    let normalizedLog = {
      ...log,
      date: normalizeDateStr(log.date) || currentVnDate,
    };

    if (currentVnDate !== prevToday) {
      todayStrRef.current = currentVnDate;
      setTodayStr(currentVnDate);
      // Nếu app để treo qua đêm và người dùng đang tích ở màn hình "Hôm nay" cũ -> tự chuyển sang ngày mới
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
        const updated = [...prev];
        updated[exists] = normalizedLog;
        return updated;
      }
      return [...prev, normalizedLog];
    });

    void toggleDailyLogAction(normalizedLog)
      .then((res) => {
        if (res.success && res.log) {
          setDailyLogs((prev) =>
            prev.map((l) => (l.id === normalizedLog.id ? res.log! : l))
          );
        }
      })
      .catch(() => {
        showToast('Lỗi đồng bộ trạng thái checklist lên Sheet.', 'warn');
      });
  }, [showToast]);

  // Lưu routine (thuốc/bài tập) — Phản hồi tức thì 0ms, đóng form ngay
  const handleSaveRoutine = useCallback(async (routine: CareRoutine) => {
    setCareRoutines((prev) => {
      const idx = prev.findIndex((r) => r.id === routine.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = routine;
        return copy;
      }
      return [...prev, routine];
    });
    showToast(`✅ Đã lưu: ${routine.title}`, 'success');

    void saveRoutineAction(routine)
      .then((res) => {
        if (!res.success) {
          showToast('Lỗi đồng bộ đơn thuốc/bài tập lên Sheet.', 'warn');
        }
      })
      .catch(() => {
        showToast('Lỗi đồng bộ đơn thuốc/bài tập lên Sheet.', 'warn');
      });
  }, [showToast]);

  // Xóa routine — Xoá tức thì trên giao diện, đồng bộ ngầm lên Sheet
  const handleDeleteRoutine = useCallback(async (id: string) => {
    setCareRoutines((prev) => prev.filter((r) => r.id !== id));
    showToast('Đã xoá đầu việc chăm sóc.', 'info');

    void deleteRoutineAction(id)
      .then((res) => {
        if (!res.success) {
          showToast('Lỗi xoá đơn thuốc/bài tập trên Sheet.', 'warn');
        }
      })
      .catch(() => {
        showToast('Lỗi xoá đơn thuốc/bài tập trên Sheet.', 'warn');
      });
  }, [showToast]);

  // Lưu lịch tái khám — Phản hồi tức thì 0ms
  const handleSaveAppointment = useCallback(async (info: AppointmentInfo) => {
    setAppointment(info);
    showToast('📅 Đã lưu lịch tái khám!', 'success');

    void saveAppointmentAction(info)
      .then((res) => {
        if (res.success && res.appointment) {
          setAppointment(res.appointment);
        }
      })
      .catch(() => {
        showToast('Lỗi lưu lịch tái khám lên Sheet.', 'warn');
      });
  }, [showToast]);

  // ===== V2.2: QUYỀN ADMIN THỰC SỰ (PIN 2468) — MỞ TOÀN QUYỀN + SỔ THU CHI + CODE.GS =====
  const handleUnlockExpenseSuccess = useCallback(() => {
    setIsExpenseUnlocked(true);
    setIsAdmin(true);
    try {
      sessionStorage.setItem('care_expense_auth', 'true');
      sessionStorage.setItem('care_admin_auth', 'true');
    } catch {
      // ignore
    }
    showToast('👑 Đã mở quyền Quản trị viên (Toàn quyền hệ thống & Sổ nội bộ)!', 'success');
    if (pendingAdminAction) {
      const action = pendingAdminAction;
      setPendingAdminAction(null);
      setTimeout(() => action(), 50);
    }
  }, [pendingAdminAction, showToast]);

  const handleLockExpense = useCallback(() => {
    setIsExpenseUnlocked(false);
    setGuideModalOpen(false);
    try {
      sessionStorage.removeItem('care_expense_auth');
    } catch {
      // ignore
    }
    showToast('🔒 Đã khóa quyền Quản trị cao cấp & Sổ Thu Chi.', 'info');
  }, [showToast]);

  const handleSaveExpense = useCallback(async (entry: ExpenseEntry) => {
    setExpenses((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      let next: ExpenseEntry[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = entry;
      } else {
        next = [entry, ...prev];
      }
      return next.sort((a, b) => {
        const dCmp = (b.date || '').localeCompare(a.date || '');
        if (dCmp !== 0) return dCmp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    });

    void saveExpenseAction(entry)
      .then((res) => {
        if (res.success && Array.isArray(res.expenses) && res.expenses.length > 0) {
          setExpenses(res.expenses);
        } else if (!res.success) {
          showToast('Lỗi đồng bộ khoản thu/chi lên Google Sheets.', 'warn');
        }
      })
      .catch(() => {
        showToast('Lỗi đồng bộ khoản thu/chi lên Google Sheets.', 'warn');
      });
  }, [showToast]);

  const handleDeleteExpense = useCallback(async (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));

    void deleteExpenseAction(expenseId)
      .then((res) => {
        if (!res.success) {
          showToast('Lỗi xóa khoản thu/chi trên Google Sheets.', 'warn');
        }
      })
      .catch(() => {
        showToast('Lỗi xóa khoản thu/chi trên Google Sheets.', 'warn');
      });
  }, [showToast]);

  // ===== Lấy các routines đang hoạt động cho stage hiện tại =====
  const activeRoutines = useMemo(() => {
    return careRoutines.filter((r) => r.isActive && r.stageId === activeStageId);
  }, [careRoutines, activeStageId]);

  // ===== Lấy daily logs cho hôm nay =====
  const todayDailyLogs = useMemo(() => {
    return dailyLogs.filter((l) => l.date === todayStr);
  }, [dailyLogs, todayStr]);

  // ===== Vitals gần nhất (Luôn sắp xếp chuẩn theo thời gian thực tế) =====
  const lastVitalsEntry = useMemo(() => {
    if (vitalsLog.length === 0) return null;
    const sorted = [...vitalsLog].sort(compareVitalsDesc);
    return sorted[0] || null;
  }, [vitalsLog]);

  const lastVitalsEval = useMemo(() => {
    if (!lastVitalsEntry) return null;
    return evaluateVitalReading(lastVitalsEntry, bpThresholds);
  }, [lastVitalsEntry, bpThresholds]);

  // ===== Trạng thái nhanh hiển thị trên biển hiệu & thanh điều hướng 3 phần =====
  const vitalsTodayCount = useMemo(
    () => vitalsLog.filter((v) => normalizeDateStr(v.date) === todayStr).length,
    [vitalsLog, todayStr]
  );

  const routineTotalToday = useMemo(
    () =>
      activeRoutines
        .filter((r) => r.medType !== 'as_needed')
        .reduce((sum, r) => sum + (Array.isArray(r.timeSlots) ? r.timeSlots.length : 0), 0),
    [activeRoutines]
  );

  const routineDoneToday = useMemo(() => {
    const ids = new Set(
      activeRoutines.filter((r) => r.medType !== 'as_needed').map((r) => r.id)
    );
    return Math.min(
      routineTotalToday,
      todayDailyLogs.filter((l) => l.isDone && ids.has(l.routineId)).length
    );
  }, [activeRoutines, todayDailyLogs, routineTotalToday]);

  const apptStatusText = useMemo(() => {
    const next = normalizeDateStr(appointment.nextDate);
    if (!next) return 'Chưa có lịch hẹn';
    const diff = Math.round(
      (Date.parse(`${next}T12:00:00Z`) - Date.parse(`${todayStr}T12:00:00Z`)) / 86400000
    );
    if (isNaN(diff)) return 'Xem lịch hẹn';
    if (diff < 0) return 'Đã quá hẹn';
    if (diff === 0) return 'Khám hôm nay';
    if (diff === 1) return 'Khám ngày mai';
    return `Còn ${diff} ngày`;
  }, [appointment.nextDate, todayStr]);

  const sectionNavHints = useMemo(
    () => ({
      vitals: lastVitalsEntry
        ? `${lastVitalsEntry.sys}/${lastVitalsEntry.dia}${lastVitalsEntry.pulse ? ` • ♥${lastVitalsEntry.pulse}` : ''}`
        : 'Đo ngay',
      routine: routineTotalToday > 0 ? `${routineDoneToday}/${routineTotalToday} xong` : 'Xem việc',
      appointment: apptStatusText,
    }),
    [lastVitalsEntry, routineDoneToday, routineTotalToday, apptStatusText]
  );

  // ===== Tên người ghi mặc định lấy từ danh sách thành viên trên Sheet (Mẹ Phương) =====
  const recorderName = useMemo(() => {
    if (members.length === 0) return DEFAULT_RECORDER;
    const motherMember = members.find(
      (m) =>
        m.name.toLowerCase().includes('mẹ') ||
        m.relation.toLowerCase().includes('vợ') ||
        m.relation.toLowerCase().includes('mẹ')
    );
    return motherMember ? motherMember.name : members[0].name;
  }, [members]);

  // ===== CRUD Reminders (Phản hồi tức thì 0ms) =====
  const handleAddReminder = useCallback(async (newReminder: PatientDailyReminder) => {
    setReminders((prev) => {
      const idx = prev.findIndex((r) => r.id === newReminder.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newReminder;
        return copy;
      }
      return [newReminder, ...prev];
    });
    showToast('Đã lưu nhắc nhở mới!', 'success');

    void saveReminderAction(newReminder).catch((err) => {
      console.error('Lỗi lưu nhắc nhở:', err);
      showToast('Không thể đồng bộ nhắc nhở lên Sheet.', 'warn');
    });
  }, [showToast]);

  const handleDeleteReminder = useCallback(async (reminderId: string, title: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    showToast(`Đã xoá nhắc nhở "${title}"`, 'info');

    void deleteReminderAction(reminderId).catch((err) => {
      console.error('Lỗi xoá nhắc nhở:', err);
    });
  }, [showToast]);

  // --- Admin Security Helpers (2 cấp: isAdmin = Sửa danh mục [1234], isExpenseUnlocked = Admin thực sự [2468]) ---
  const requireAdmin = useCallback((action: () => void) => {
    if (isAdmin || isExpenseUnlocked) {
      action();
    } else {
      setPendingAdminAction(() => action);
      setAdminPinModalMode('unlock');
      setAdminPinModalOpen(true);
    }
  }, [isAdmin, isExpenseUnlocked]);

  const handleOpenGuide = useCallback(() => {
    if (isExpenseUnlocked) {
      setGuideModalOpen(true);
    } else {
      setPendingAdminAction(() => () => setGuideModalOpen(true));
      setAdminPinModalMode('unlock');
      setAdminPinModalOpen(true);
    }
  }, [isExpenseUnlocked]);

  const handleAdminPinSuccess = useCallback(() => {
    setIsAdmin(true);
    try {
      sessionStorage.setItem('care_admin_auth', 'true');
    } catch {
      // ignore
    }
    showToast('✏️ Đã mở quyền Chỉnh sửa danh mục!', 'success');
    if (pendingAdminAction) {
      const action = pendingAdminAction;
      setPendingAdminAction(null);
      setTimeout(() => action(), 50);
    }
  }, [pendingAdminAction, showToast]);

  const handleLockAdmin = useCallback(() => {
    setIsAdmin(false);
    setIsExpenseUnlocked(false);
    setGuideModalOpen(false);
    try {
      sessionStorage.removeItem('care_admin_auth');
      sessionStorage.removeItem('care_expense_auth');
    } catch {
      // ignore
    }
    showToast('🔒 Đã khóa lại toàn bộ quyền chỉnh sửa & quản trị', 'info');
  }, [showToast]);

  const handleToggleAdmin = useCallback(() => {
    setAdminPinModalMode('unlock');
    setAdminPinModalOpen(true);
  }, []);

  // CRUD Contacts (Bảo vệ bằng Admin PIN — Phản hồi tức thì 0ms)
  const handleSaveContact = useCallback(async (contact: EmergencyContact) => {
    requireAdmin(() => {
      setContacts((prev) => {
        const idx = prev.findIndex((c) => c.id === contact.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = contact;
          return copy;
        }
        return [contact, ...prev];
      });
      showToast(`Đã lưu liên hệ ${contact.name}!`, 'success');

      void saveContactAction(contact).catch((err) => {
        console.error('Lỗi lưu liên hệ:', err);
        showToast('Không thể lưu liên hệ lên Sheet.', 'warn');
      });
    });
  }, [requireAdmin, showToast]);

  const handleDeleteContact = useCallback(async (contactId: string, name: string) => {
    requireAdmin(() => {
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      showToast(`Đã xoá liên hệ "${name}"`, 'info');

      void deleteContactAction(contactId).catch((err) => {
        console.error('Lỗi xoá liên hệ:', err);
      });
    });
  }, [requireAdmin, showToast]);

  // CRUD Patient Details
  const handleOpenEditPatient = useCallback(() => {
    requireAdmin(() => setEditPatientModalOpen(true));
  }, [requireAdmin]);

  const handlePatientUpdated = useCallback((newInfo: PatientInfo) => {
    setPatientInfo(newInfo);
    showToast('Đã cập nhật hồ sơ bệnh nhân!', 'success');
  }, [showToast]);

  const handleInlineSavePatient = useCallback((newInfo: PatientInfo) => {
    requireAdmin(() => {
      setPatientInfo(newInfo);
      showToast('Đã lưu thông tin bệnh nhân!', 'success');

      void savePatientInfoAction(newInfo)
        .then((res) => {
          if (!res.success) {
            showToast('Cảnh báo: Chưa đồng bộ được hồ sơ lên Sheet.', 'warn');
          }
        })
        .catch(() => {
          showToast('Lỗi đồng bộ hồ sơ bệnh nhân lên Google Sheets.', 'warn');
        });
    });
  }, [requireAdmin, showToast]);

  // CRUD Members
  const handleOpenMembers = useCallback(() => {
    requireAdmin(() => setMembersModalOpen(true));
  }, [requireAdmin]);

  const handleMembersUpdated = useCallback((updatedMembers: FamilyMember[]) => {
    setMembers(updatedMembers);
    showToast('Đã cập nhật danh sách thành viên gia đình!', 'success');
  }, [showToast]);

  // Mở RoutineManager (cần Admin PIN)
  const handleOpenRoutineManager = useCallback(() => {
    requireAdmin(() => setRoutineManagerOpen(true));
  }, [requireAdmin]);

  // Lưu / Huỷ lịch đăng ký qua phụ Mẹ (Đợt C — FamilySupportView, phản hồi 0ms)
  const handleSaveShift = useCallback(async (shift: ShiftRecord) => {
    const isClearing =
      (shift.assignees || []).filter(Boolean).length === 0 &&
      (shift.supporters || []).filter(Boolean).length === 0 &&
      !shift.handover?.note?.trim();

    // Optimistic update tức thì
    setShifts((prev) => {
      if (isClearing) {
        return prev.filter((s) => s.id !== shift.id);
      }
      const idx = prev.findIndex((s) => s.id === shift.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = shift;
        return updated;
      }
      return [shift, ...prev];
    });

    if (isClearing) {
      showToast('Đã huỷ lịch qua phụ Mẹ.', 'info');
    } else {
      showToast('🤝 Đã lưu lịch qua phụ Mẹ!', 'success');
    }

    // Đồng bộ ngầm lên Google Sheets
    void saveShiftAction(shift)
      .then((res) => {
        if (res.success && res.updatedShift && !isClearing) {
          setShifts((prev) =>
            prev.map((s) => (s.id === shift.id ? res.updatedShift! : s))
          );
        } else if (!res.success) {
          showToast(res.message || 'Cảnh báo: Chưa đồng bộ được lịch lên Sheet.', 'warn');
        }
      })
      .catch(() => {
        showToast('Lỗi khi đồng bộ lịch gia đình lên Google Sheets.', 'warn');
      });
  }, [showToast]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-teal-600 selection:text-white">
      {/* Toast Notification (nâng cao hơn trên mobile để không đè lên thanh điều hướng đáy, hiển thị êm ái không giật) */}
      {notification && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 shadow-2xl text-slate-900 text-xs sm:text-sm font-bold flex items-center gap-2 max-w-[92vw] transition-all duration-300">
          {notification.type === 'warn' ? (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span className="truncate">{notification.message}</span>
        </div>
      )}

      {/* Header điều khiển cố định */}
      <HeaderBar
        activeView={activeView}
        onChangeView={handleChangeView}
        onOpenGuide={handleOpenGuide}
        onOpenEmergencyContacts={() => setEmergencyModalOpen(true)}
        onOpenInstallApp={() => setInstallPwaModalOpen(true)}
        onOpenNotificationSettings={() => setNotifSettingsModalOpen(true)}
        patientInfo={patientInfo}
        isAdmin={isAdmin}
        isExpenseUnlocked={isExpenseUnlocked}
        onOpenAdminPin={handleToggleAdmin}
        onOpenMembers={handleOpenMembers}
        onEditPatient={handleOpenEditPatient}
      />

      {/* Thân ứng dụng */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-2.5 sm:p-4 space-y-3.5">
        {!hasInitialLoaded && isLoading && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 text-teal-900 shadow-2xs">
            <div className="flex items-center gap-2.5 text-sm font-bold">
              <RefreshCw className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
              <span>Đang tải dữ liệu thực tế từ Google Sheets...</span>
            </div>
            <span className="text-xs text-teal-700 font-semibold hidden sm:inline">Vui lòng đợi giây lát</span>
          </div>
        )}

        {/* Banner mini tóm tắt bệnh nhân & Nhắc nhở (Bấm mở rộng chi tiết) */}
        <PatientBanner
          patientInfo={patientInfo}
          reminders={reminders}
          members={members}
          onAddReminder={handleAddReminder}
          onDeleteReminder={handleDeleteReminder}
          onEditPatient={handleOpenEditPatient}
          onSavePatient={handleInlineSavePatient}
          onRefresh={() => loadAllData(true)}
          isLoading={isLoading}
        />

        {/* ===== NỘI DUNG THEO TAB (Giữ DOM sau khi mở để chuyển tab phản hồi 0ms) ===== */}
        <div className={activeView === 'today' ? 'space-y-6' : 'hidden'}>
          {/* ===== NHÓM TỔNG QUAN: nhắc việc thông minh ===== */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-700 text-white text-sm font-black tracking-wide">
                📋 TỔNG QUAN
              </span>
              <span className="flex-1 h-0.5 bg-slate-300 rounded-full" />
            </div>
            {/* Hộp Nhắc Việc Thông Minh theo Khung Giờ & Phát Âm Báo / Giọng Nói Tiếng Việt + Thông Báo Đẩy PWA */}
            <SmartReminderBanner
              vitalsLog={vitalsLog}
              bpThresholds={bpThresholds}
              activeRoutines={activeRoutines}
              dailyLogs={dailyLogs}
              appointment={appointment}
              todayStr={todayStr}
              defaultRecorder={recorderName}
              prefs={notificationPrefs}
              hasInitialLoaded={hasInitialLoaded}
              onToggleDailyLog={handleToggleDailyLog}
              onOpenSettings={() => setNotifSettingsModalOpen(true)}
              showToast={showToast}
            />
          </div>

          {/* Thanh 3 nút lớn dính trên cùng khi cuộn: luôn biết đang ở phần nào */}
          <SectionNavBar enabled={activeView === 'today'} hints={sectionNavHints} />

          {/* ===== PHẦN 1: ĐO HUYẾT ÁP (màu hồng) ===== */}
          <div id="section-vitals" className="scroll-mt-32 space-y-2.5">
            <SectionBanner
              section="vitals"
              subtitle="Đo xong, ghi 3 số vào đây"
              status={vitalsTodayCount > 0 ? `Hôm nay đã đo ${vitalsTodayCount} lần` : 'Hôm nay chưa đo'}
            />
            <div className={`rounded-2xl ${SECTION_THEME.vitals.cardBorder} ${SECTION_THEME.vitals.cardBg} p-1.5 sm:p-2`}>
              <QuickVitalsForm
                onSave={handleSaveVitals}
                lastEntry={lastVitalsEntry}
                bpThresholds={bpThresholds}
                defaultRecorder={recorderName}
                members={members}
                todayStr={todayStr}
              />
            </div>
          </div>

          {/* ===== PHẦN 2: UỐNG THUỐC & TẬP (màu xanh lá) ===== */}
          <div id="section-routine" className="scroll-mt-32 space-y-2.5">
            <SectionBanner
              section="routine"
              subtitle="Bấm vào từng việc để tích đã làm"
              status={routineTotalToday > 0 ? `Xong ${routineDoneToday}/${routineTotalToday} việc` : undefined}
            />
            <div className={`rounded-2xl ${SECTION_THEME.routine.cardBorder} ${SECTION_THEME.routine.cardBg} p-1.5 sm:p-2`}>
              <DailyRoutineView
                routines={activeRoutines}
                dailyLogs={dailyLogs}
                todayStr={todayStr}
                onToggle={handleToggleDailyLog}
                onOpenManager={handleOpenRoutineManager}
                defaultRecorder={recorderName}
              />
            </div>
          </div>

          {/* ===== PHẦN 3: TÁI KHÁM & LỜI DẶN BÁC SĨ (màu xanh dương) ===== */}
          <div id="section-appointment" className="scroll-mt-32 space-y-2.5">
            <SectionBanner
              section="appointment"
              subtitle="Ngày khám tiếp theo & lời dặn"
              status={apptStatusText}
            />
            <div className={`rounded-2xl ${SECTION_THEME.appointment.cardBorder} ${SECTION_THEME.appointment.cardBg} p-1.5 sm:p-2`}>
              <AppointmentSection
                appointment={appointment}
                onSave={handleSaveAppointment}
                isAdmin={isAdmin}
                todayStr={todayStr}
              />
            </div>
          </div>

          <p className="text-center text-sm font-bold text-slate-500 pb-2">
            ✅ Hết trang — đã xem đủ 3 phần
          </p>
        </div>

        {visitedViews.charts && (
          <div className={activeView === 'charts' ? 'block' : 'hidden'}>
            {/* ===== TAB BIỂU ĐỒ — Đợt B ===== */}
            <VitalsChartView
              vitalsLog={vitalsLog}
              bpThresholds={bpThresholds}
              dailyLogs={dailyLogs}
              careRoutines={careRoutines}
              isAdmin={isAdmin}
              members={members}
              patientName={patientInfo.name}
              showToast={showToast}
              onDeleteVitals={handleDeleteVitals}
              onSaveVitals={handleSaveVitals}
              onToggleDailyLog={handleToggleDailyLog}
              defaultRecorder={recorderName}
            />
          </div>
        )}

        {visitedViews.family && (
          <div className={activeView === 'family' ? 'block' : 'hidden'}>
            {/* ===== TAB GIA ĐÌNH ĐỒNG HÀNH — Đợt C ===== */}
            <FamilySupportView
              shifts={shifts}
              members={members}
              isAdmin={isAdmin}
              todayStr={todayStr}
              onSaveShift={handleSaveShift}
              onOpenMembers={handleOpenMembers}
            />
          </div>
        )}

        {visitedViews.expenses && (
          <div className={activeView === 'expenses' ? 'block' : 'hidden'}>
            {/* ===== TAB SỔ THEO DÕI THU CHI ĐIỀU TRỊ — Đợt D (Mã PIN riêng) ===== */}
            <ExpenseTrackerView
              expenses={expenses}
              members={members}
              patientName={patientInfo.name}
              isUnlocked={isExpenseUnlocked}
              onUnlockSuccess={handleUnlockExpenseSuccess}
              onLock={handleLockExpense}
              onVerifyPin={verifyExpensePinAction}
              onChangePin={changeExpensePinAction}
              onSaveExpense={handleSaveExpense}
              onDeleteExpense={handleDeleteExpense}
              showToast={showToast}
              onBackToHealth={() => handleChangeView('today')}
            />
          </div>
        )}
      </main>

      {/* Footer (thêm pb-24 trên mobile để không bị thanh điều hướng đáy che khuất) */}
      <footer className="border-t border-slate-200 bg-white pt-4 px-4 pb-24 md:pb-4 mt-8 text-center text-xs text-slate-600">
        <div className="max-w-md mx-auto space-y-1">
          <p className="text-slate-800 font-bold">
            Sổ Sức Khỏe Bố • Bệnh nhân: {patientInfo.name}
          </p>
          <p className="text-[11px] text-slate-500">
            Theo dõi huyết áp, thuốc & phục hồi chức năng hàng ngày — Đồng bộ Google Sheets
            {' • '}
            <button
              type="button"
              onClick={() => handleChangeView('expenses')}
              className="text-slate-400 hover:text-teal-700 underline decoration-slate-300 underline-offset-2 transition cursor-pointer"
              title="Mở Sổ ghi chép nội bộ (Yêu cầu mã PIN riêng)"
            >
              Sổ nội bộ
            </button>
          </p>
        </div>
      </footer>

      {/* ===== MODALS (Chỉ mount khi đang mở để tối ưu tốc độ render) ===== */}

      {installPwaModalOpen && (
        <PwaInstallModal
          isOpen={installPwaModalOpen}
          onClose={() => setInstallPwaModalOpen(false)}
        />
      )}

      {notifSettingsModalOpen && (
        <NotificationSettingsModal
          isOpen={notifSettingsModalOpen}
          onClose={() => setNotifSettingsModalOpen(false)}
          prefs={notificationPrefs}
          onSavePrefs={handleSaveNotificationPrefs}
          onOpenInstallPwa={() => setInstallPwaModalOpen(true)}
          showToast={showToast}
        />
      )}

      {guideModalOpen && isExpenseUnlocked && (
        <GoogleSheetGuideModal
          isOpen={guideModalOpen}
          onClose={() => setGuideModalOpen(false)}
          isSheetsConnected={Boolean(settings?.googleSheetsConnected)}
        />
      )}

      {emergencyModalOpen && (
        <EmergencyContactsModal
          isOpen={emergencyModalOpen}
          onClose={() => setEmergencyModalOpen(false)}
          contacts={contacts}
          patientInfo={patientInfo}
          onSaveContact={handleSaveContact}
          onDeleteContact={handleDeleteContact}
        />
      )}

      {adminPinModalOpen && (
        <AdminPinModal
          isOpen={adminPinModalOpen}
          onClose={() => {
            setAdminPinModalOpen(false);
            setPendingAdminAction(null);
          }}
          onSuccess={handleAdminPinSuccess}
          onExpenseSuccess={handleUnlockExpenseSuccess}
          isAdmin={isAdmin}
          isSuperAdmin={isExpenseUnlocked}
          onLockAdmin={handleLockAdmin}
          onOpenExpenses={() => handleChangeView('expenses')}
          onOpenGuide={() => setGuideModalOpen(true)}
          initialMode={adminPinModalMode}
        />
      )}

      {editPatientModalOpen && (
        <EditPatientModal
          isOpen={editPatientModalOpen}
          onClose={() => setEditPatientModalOpen(false)}
          patient={patientInfo}
          onUpdated={handlePatientUpdated}
        />
      )}

      {membersModalOpen && (
        <MembersManagementModal
          isOpen={membersModalOpen}
          onClose={() => setMembersModalOpen(false)}
          members={members}
          onMembersUpdated={handleMembersUpdated}
        />
      )}

      {routineManagerOpen && (
        <RoutineManagerModal
          isOpen={routineManagerOpen}
          onClose={() => setRoutineManagerOpen(false)}
          routines={careRoutines}
          stages={stages}
          activeStageId={activeStageId}
          onSaveRoutine={handleSaveRoutine}
          onDeleteRoutine={handleDeleteRoutine}
        />
      )}
    </div>
  );
}
