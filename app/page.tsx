'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import HeaderBar, { AppView } from '@/components/HeaderBar';
import PatientBanner from '@/components/PatientBanner';
import QuickVitalsForm from '@/components/QuickVitalsForm';
import DailyRoutineView from '@/components/DailyRoutineView';
import { AppointmentSection } from '@/components/AppointmentSection';

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
} from '@/lib/types';
import {
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_APPOINTMENT,
  DEFAULT_REHAB_STAGES,
  DEFAULT_RECORDER,
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

  // V2.0: Phase cố định là 'phase2' (tại nhà), không cho user chuyển nữa
  const activePhase: CarePhase = 'phase2';

  // V2.0: 3 tab mới + lưu các tab đã mở để chuyển qua lại tức thì (0ms) không phải render lại từ đầu
  const [activeView, setActiveView] = useState<AppView>('today');
  const [visitedViews, setVisitedViews] = useState<Record<AppView, boolean>>({
    today: true,
    charts: false,
    family: false,
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
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warn' } | null>(null);

  // Admin Security & Management Modals State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
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
        if (sessionStorage.getItem('care_admin_auth') === 'true') {
          setIsAdmin(true);
        }
      }
    } catch {
      // ignore
    }

    // Tải ngầm trước JS của tab Biểu đồ và Gia đình sau 1.2s để bấm chuyển tab phản hồi 0ms
    const preloadTimer = setTimeout(() => {
      import('@/components/VitalsChartView').catch(() => {});
      import('@/components/FamilySupportView').catch(() => {});
    }, 1200);

    return () => clearTimeout(preloadTimer);
  }, []);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  }, []);

  // ===== Ngày hiện tại =====
  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  // V2.0: Tải toàn bộ dữ liệu V2 từ Google Sheets
  const loadAllData = useCallback(
    async (forceRefresh = false) => {
      setIsLoading(true);
      if (forceRefresh) {
        showToast('Đang làm mới dữ liệu từ Google Sheets...', 'info');
      }

      try {
        // Lấy khoảng ngày: 30 ngày trước → 7 ngày sau (đủ cho biểu đồ HA)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const qStart = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        const qEnd = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

        const appData = await fetchAllAppDataV2Action(qStart, qEnd, activePhase, forceRefresh);

        if (appData) {
          // Luôn cập nhật đúng danh sách từ Google Sheets (kể cả khi bảng trên Sheet đang trống)
          if (Array.isArray(appData.shifts)) setShifts(appData.shifts);
          if (Array.isArray(appData.members)) setMembers(appData.members);
          if (appData.patientInfo && appData.patientInfo.name) setPatientInfo(appData.patientInfo);
          if (Array.isArray(appData.contacts)) setContacts(appData.contacts);
          if (Array.isArray(appData.reminders)) setReminders(appData.reminders);
          if (appData.settings) setSettings(appData.settings);

          // V2 data
          if (Array.isArray(appData.vitalsLog)) setVitalsLog(appData.vitalsLog);
          if (Array.isArray(appData.careRoutines)) setCareRoutines(appData.careRoutines);
          if (Array.isArray(appData.dailyLogs)) setDailyLogs(appData.dailyLogs);
          if (Array.isArray(appData.stages) && appData.stages.length > 0) {
            setStages(appData.stages);
            const firstActive = appData.stages.find((s) => s.isActive);
            if (firstActive) setActiveStageId(firstActive.id);
          }
          if (appData.appointment) setAppointment(appData.appointment);
          if (appData.bpThresholds) setBpThresholds(appData.bpThresholds);

          if (forceRefresh) {
            showToast('Đã đồng bộ dữ liệu mới nhất từ Google Sheets!', 'success');
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu:', err);
        showToast('Không thể kết nối máy chủ để tải dữ liệu.', 'warn');
      } finally {
        setIsLoading(false);
        setHasInitialLoaded(true);
      }
    },
    [activePhase, showToast]
  );

  useEffect(() => {
    loadAllData(false);
  }, [loadAllData]);

  // ===== V2.0 HANDLERS (PHẢN HỒI TỨC THÌ 0ms — ĐỒNG BỘ NGẦM LÊN SHEET) =====

  // Lưu huyết áp — Cập nhật giao diện ngay lập tức, đồng bộ Google Sheets ở chế độ nền
  const handleSaveVitals = useCallback(async (entry: VitalsLogEntry) => {
    setVitalsLog((prev) => {
      const exists = prev.findIndex((v) => v.id === entry.id);
      let next: VitalsLogEntry[];
      if (exists >= 0) {
        next = [...prev];
        next[exists] = entry;
      } else {
        next = [entry, ...prev];
      }
      return next.sort((a, b) => {
        const cmp = b.date.localeCompare(a.date);
        return cmp !== 0 ? cmp : b.time.localeCompare(a.time);
      });
    });
    showToast('💓 Đã lưu chỉ số huyết áp!', 'success');

    // Đồng bộ ngầm không chặn giao diện
    void saveVitalsAction(entry)
      .then((res) => {
        if (res.success && res.entry) {
          setVitalsLog((prev) =>
            prev.map((v) => (v.id === entry.id ? res.entry! : v))
          );
        } else if (!res.success) {
          showToast('Cảnh báo: Chưa đồng bộ được huyết áp lên Sheet.', 'warn');
        }
      })
      .catch(() => {
        showToast('Lỗi kết nối khi đồng bộ huyết áp lên Sheet.', 'warn');
      });
  }, [showToast]);

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

  // Toggle checklist thuốc/tập — Phản hồi 0ms khi bấm tích
  const handleToggleDailyLog = useCallback(async (log: DailyLog) => {
    setDailyLogs((prev) => {
      const exists = prev.findIndex((l) => l.id === log.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = log;
        return updated;
      }
      return [...prev, log];
    });

    void toggleDailyLogAction(log)
      .then((res) => {
        if (res.success && res.log) {
          setDailyLogs((prev) =>
            prev.map((l) => (l.id === log.id ? res.log! : l))
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

  // ===== Lấy các routines đang hoạt động cho stage hiện tại =====
  const activeRoutines = useMemo(() => {
    return careRoutines.filter((r) => r.isActive && r.stageId === activeStageId);
  }, [careRoutines, activeStageId]);

  // ===== Lấy daily logs cho hôm nay =====
  const todayDailyLogs = useMemo(() => {
    return dailyLogs.filter((l) => l.date === todayStr);
  }, [dailyLogs, todayStr]);

  // ===== Vitals gần nhất =====
  const lastVitalsEntry = useMemo(() => {
    if (vitalsLog.length === 0) return null;
    // vitalsLog đã sorted DESC by date+time từ backend
    return vitalsLog[0] || null;
  }, [vitalsLog]);

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

  // --- Admin Security Helpers ---
  const requireAdmin = useCallback((action: () => void) => {
    if (isAdmin) {
      action();
    } else {
      setPendingAdminAction(() => action);
      setAdminPinModalMode('unlock');
      setAdminPinModalOpen(true);
    }
  }, [isAdmin]);

  const handleAdminPinSuccess = useCallback(() => {
    setIsAdmin(true);
    try {
      sessionStorage.setItem('care_admin_auth', 'true');
    } catch {
      // ignore
    }
    showToast('Xác thực quyền Quản trị viên (Admin) thành công!', 'success');
    if (pendingAdminAction) {
      const action = pendingAdminAction;
      setPendingAdminAction(null);
      setTimeout(() => action(), 50);
    }
  }, [pendingAdminAction, showToast]);

  const handleToggleAdmin = useCallback(() => {
    if (isAdmin) {
      const wantLock = window.confirm(
        'Bạn đang đăng nhập quyền Admin.\n\n- Nhấn [OK] để KHÓA LẠI (đăng xuất quyền Admin).\n- Nhấn [Hủy] nếu bạn muốn ĐỔI MÃ PIN MỚI.'
      );
      if (wantLock) {
        setIsAdmin(false);
        try {
          sessionStorage.removeItem('care_admin_auth');
        } catch {
          // ignore
        }
        showToast('Đã khóa lại quyền Admin', 'info');
      } else {
        setAdminPinModalMode('change');
        setAdminPinModalOpen(true);
      }
    } else {
      setAdminPinModalMode('unlock');
      setAdminPinModalOpen(true);
    }
  }, [isAdmin, showToast]);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Toast Notification (nâng cao hơn trên mobile để không đè lên thanh điều hướng đáy) */}
      {notification && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-white border-2 border-slate-300 shadow-2xl text-slate-900 text-xs sm:text-sm font-bold flex items-center gap-2 animate-bounce max-w-[92vw]">
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
        onOpenGuide={() => setGuideModalOpen(true)}
        onOpenEmergencyContacts={() => setEmergencyModalOpen(true)}
        onOpenInstallApp={() => setInstallPwaModalOpen(true)}
        patientInfo={patientInfo}
        isAdmin={isAdmin}
        onOpenAdminPin={handleToggleAdmin}
        onOpenMembers={handleOpenMembers}
        onEditPatient={handleOpenEditPatient}
      />

      {/* Thân ứng dụng */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-2.5 sm:p-4 space-y-3.5">
        {!hasInitialLoaded && isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-blue-900 shadow-2xs">
            <div className="flex items-center gap-2.5 text-sm font-bold">
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              <span>Đang tải dữ liệu thực tế từ Google Sheets...</span>
            </div>
            <span className="text-xs text-blue-600 font-semibold hidden sm:inline">Vui lòng đợi giây lát</span>
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
        <div className={activeView === 'today' ? 'space-y-4' : 'hidden'}>
          {/* 1. Form ghi huyết áp nhanh */}
          <QuickVitalsForm
            onSave={handleSaveVitals}
            lastEntry={lastVitalsEntry}
            bpThresholds={bpThresholds}
            defaultRecorder={recorderName}
            members={members}
          />

          {/* 2. Lịch tái khám */}
          <AppointmentSection
            appointment={appointment}
            onSave={handleSaveAppointment}
            isAdmin={isAdmin}
          />

          {/* 3. Checklist thuốc + tập phục hồi hôm nay */}
          <DailyRoutineView
            routines={activeRoutines}
            dailyLogs={todayDailyLogs}
            todayStr={todayStr}
            onToggle={handleToggleDailyLog}
            onOpenManager={handleOpenRoutineManager}
            defaultRecorder={recorderName}
          />
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
              onDeleteVitals={handleDeleteVitals}
              onSaveVitals={handleSaveVitals}
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
              onSaveShift={handleSaveShift}
              onOpenMembers={handleOpenMembers}
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

      {guideModalOpen && (
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
