'use client';

import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import HeaderBar, { AppView } from '@/components/HeaderBar';
import PatientBanner from '@/components/PatientBanner';
import QuickVitalsForm from '@/components/QuickVitalsForm';
import DailyRoutineView from '@/components/DailyRoutineView';
import { AppointmentSection } from '@/components/AppointmentSection';
import { RoutineManagerModal } from '@/components/RoutineManagerModal';
import { VitalsChartView } from '@/components/VitalsChartView';
import FamilySupportView from '@/components/FamilySupportView';
import GoogleSheetGuideModal from '@/components/GoogleSheetGuideModal';
import EmergencyContactsModal from '@/components/EmergencyContactsModal';
import { AdminPinModal } from '@/components/AdminPinModal';
import { EditPatientModal } from '@/components/EditPatientModal';
import { MembersManagementModal } from '@/components/MembersManagementModal';

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
  AppMode,
} from '@/lib/types';
import {
  FAMILY_MEMBERS,
  PATIENT_INFO,
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
} from 'lucide-react';

const subscribeStorage = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('local-member-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('local-member-change', callback);
  };
};

const getStoredMemberId = () => {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem('care_app_member_id') || '';
  } catch {
    return '';
  }
};

const getServerMemberId = () => '';

export default function CareSchedulePage() {
  const storedMemberId = useSyncExternalStore(
    subscribeStorage,
    getStoredMemberId,
    getServerMemberId
  );

  // ===== Dữ liệu V1 (giữ lại cho backward compatibility) =====
  const [members, setMembers] = useState<FamilyMember[]>(FAMILY_MEMBERS);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>(PATIENT_INFO);
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
  const [appMode, setAppMode] = useState<AppMode>('home_care');

  // V2.0: Phase cố định là 'phase2' (tại nhà), không cho user chuyển nữa
  const activePhase: CarePhase = 'phase2';

  // V2.0: 3 tab mới thay thế weekly/monthly/analytics
  const [activeView, setActiveView] = useState<AppView>('today');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [guideModalOpen, setGuideModalOpen] = useState<boolean>(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState<boolean>(false);
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

  // Khôi phục phiên Admin nếu trước đó đã xác thực trong tab hiện tại
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('care_admin_auth') === 'true') {
        setIsAdmin(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const currentMember = useMemo(() => {
    if (!storedMemberId) return null;
    return members.find((m) => m.id === storedMemberId) || null;
  }, [storedMemberId, members]);

  const handleSelectMember = (member: FamilyMember | null) => {
    try {
      if (member) {
        localStorage.setItem('care_app_member_id', member.id);
        showToast(`Đã chọn: ${member.name} (${member.relation})`, 'info');
      } else {
        localStorage.removeItem('care_app_member_id');
      }
      window.dispatchEvent(new Event('local-member-change'));
    } catch (e) {
      console.warn('Cannot write localStorage', e);
    }
  };

  const showToast = (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

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
          // V1 data — giữ backward compatibility
          if (appData.shifts) setShifts(appData.shifts);
          if (appData.members && appData.members.length > 0) setMembers(appData.members);
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
            // Set active stage to first active stage
            const firstActive = appData.stages.find((s) => s.isActive);
            if (firstActive) setActiveStageId(firstActive.id);
          }
          if (appData.appointment) setAppointment(appData.appointment);
          if (appData.bpThresholds) setBpThresholds(appData.bpThresholds);
          if (appData.appMode) setAppMode(appData.appMode);

          if (forceRefresh) {
            showToast('Đã đồng bộ dữ liệu mới nhất từ Google Sheets!', 'success');
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu:', err);
        showToast('Không thể kết nối máy chủ để tải dữ liệu.', 'warn');
      } finally {
        setIsLoading(false);
      }
    },
    [activePhase]
  );

  useEffect(() => {
    loadAllData(false);
  }, [loadAllData]);

  // ===== V2.0 HANDLERS =====

  // Lưu huyết áp
  const handleSaveVitals = useCallback(async (entry: VitalsLogEntry) => {
    // Optimistic update
    setVitalsLog((prev) => {
      const exists = prev.findIndex((v) => v.id === entry.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = entry;
        return updated;
      }
      return [entry, ...prev];
    });

    try {
      const res = await saveVitalsAction(entry);
      if (res.success && res.entry) {
        setVitalsLog((prev) =>
          prev.map((v) => (v.id === entry.id ? res.entry! : v))
        );
        showToast('💓 Đã lưu huyết áp!', 'success');
      }
    } catch {
      // Rollback
      setVitalsLog((prev) => prev.filter((v) => v.id !== entry.id));
      showToast('Lỗi lưu huyết áp.', 'warn');
    }
  }, []);

  // Xóa huyết áp (dùng trong VitalsChartView — Đợt B)
  const handleDeleteVitals = useCallback(async (id: string) => {
    const backup = vitalsLog;
    // Optimistic delete
    setVitalsLog((prev) => prev.filter((v) => v.id !== id));
    try {
      const res = await deleteVitalsAction(id);
      if (res.success) {
        showToast('🗑️ Đã xóa bản ghi huyết áp.', 'success');
      } else {
        setVitalsLog(backup);
        showToast('Lỗi xóa bản ghi.', 'warn');
      }
    } catch {
      setVitalsLog(backup);
      showToast('Lỗi xóa bản ghi.', 'warn');
    }
  }, [vitalsLog]);

  // Toggle checklist thuốc/tập
  const handleToggleDailyLog = useCallback(async (log: DailyLog) => {
    // Optimistic update
    setDailyLogs((prev) => {
      const exists = prev.findIndex((l) => l.id === log.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = log;
        return updated;
      }
      return [...prev, log];
    });

    try {
      const res = await toggleDailyLogAction(log);
      if (res.success && res.log) {
        setDailyLogs((prev) =>
          prev.map((l) => (l.id === log.id ? res.log! : l))
        );
      }
    } catch {
      showToast('Lỗi cập nhật checklist.', 'warn');
    }
  }, []);

  // Lưu routine (thuốc/bài tập)
  const handleSaveRoutine = useCallback(async (routine: CareRoutine) => {
    try {
      const res = await saveRoutineAction(routine);
      if (res.success && res.routines) {
        setCareRoutines(res.routines);
        showToast(`✅ Đã lưu: ${routine.title}`, 'success');
      }
    } catch {
      showToast('Lỗi lưu đơn thuốc/bài tập.', 'warn');
    }
  }, []);

  // Xóa routine
  const handleDeleteRoutine = useCallback(async (id: string) => {
    try {
      const res = await deleteRoutineAction(id);
      if (res.success && res.routines) {
        setCareRoutines(res.routines);
        showToast('Đã xoá thành công.', 'info');
      }
    } catch {
      showToast('Lỗi xoá đơn thuốc/bài tập.', 'warn');
    }
  }, []);

  // Lưu lịch tái khám
  const handleSaveAppointment = useCallback(async (info: AppointmentInfo) => {
    setAppointment(info); // Optimistic
    try {
      const res = await saveAppointmentAction(info);
      if (res.success && res.appointment) {
        setAppointment(res.appointment);
        showToast('📅 Đã lưu lịch tái khám!', 'success');
      }
    } catch {
      showToast('Lỗi lưu lịch tái khám.', 'warn');
    }
  }, []);

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

  // ===== Tên người ghi mặc định =====
  const recorderName = currentMember?.name || DEFAULT_RECORDER;

  // ===== CRUD Reminders =====
  const handleAddReminder = async (newReminder: PatientDailyReminder) => {
    try {
      const res = await saveReminderAction(newReminder);
      if (res.success && res.reminders) {
        setReminders(res.reminders);
        showToast('Đã lưu nhắc nhở mới lên Google Sheets!', 'success');
      }
    } catch (err) {
      console.error('Lỗi lưu nhắc nhở:', err);
      showToast('Không thể lưu nhắc nhở lên Sheet.', 'warn');
    }
  };

  const handleDeleteReminder = async (reminderId: string, title: string) => {
    try {
      const res = await deleteReminderAction(reminderId);
      if (res.success && res.reminders) {
        setReminders(res.reminders);
        showToast(`Đã xoá nhắc nhở "${title}"`, 'info');
      }
    } catch (err) {
      console.error('Lỗi xoá nhắc nhở:', err);
    }
  };

  // --- Admin Security Helpers ---
  const requireAdmin = (action: () => void) => {
    if (isAdmin) {
      action();
    } else {
      setPendingAdminAction(() => action);
      setAdminPinModalMode('unlock');
      setAdminPinModalOpen(true);
    }
  };

  const handleAdminPinSuccess = () => {
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
      setTimeout(() => action(), 100);
    }
  };

  const handleToggleAdmin = () => {
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
  };

  // CRUD Contacts (Bảo vệ bằng Admin PIN)
  const handleSaveContact = async (contact: EmergencyContact) => {
    requireAdmin(async () => {
      try {
        const res = await saveContactAction(contact);
        if (res.success && res.contacts) {
          setContacts(res.contacts);
          showToast(`Đã lưu liên hệ ${contact.name} lên Google Sheets!`, 'success');
        }
      } catch (err) {
        console.error('Lỗi lưu liên hệ:', err);
        showToast('Không thể lưu liên hệ lên Sheet.', 'warn');
      }
    });
  };

  const handleDeleteContact = async (contactId: string, name: string) => {
    requireAdmin(async () => {
      try {
        const res = await deleteContactAction(contactId);
        if (res.success && res.contacts) {
          setContacts(res.contacts);
          showToast(`Đã xoá liên hệ "${name}" khỏi Google Sheets`, 'info');
        }
      } catch (err) {
        console.error('Lỗi xoá liên hệ:', err);
      }
    });
  };

  // CRUD Patient Details
  const handleOpenEditPatient = () => {
    requireAdmin(() => setEditPatientModalOpen(true));
  };

  const handlePatientUpdated = (newInfo: PatientInfo) => {
    setPatientInfo(newInfo);
    showToast('Đã cập nhật hồ sơ bệnh nhân thành công!', 'success');
  };

  // CRUD Members
  const handleOpenMembers = () => {
    requireAdmin(() => setMembersModalOpen(true));
  };

  const handleMembersUpdated = (updatedMembers: FamilyMember[]) => {
    setMembers(updatedMembers);
    showToast('Đã cập nhật danh sách thành viên gia đình!', 'success');
  };

  // Mở RoutineManager (cần Admin PIN)
  const handleOpenRoutineManager = () => {
    requireAdmin(() => setRoutineManagerOpen(true));
  };

  // Lưu / Huỷ lịch đăng ký qua phụ Mẹ (Đợt C — FamilySupportView)
  const handleSaveShift = useCallback(async (shift: ShiftRecord) => {
    const isClearing =
      (shift.assignees || []).filter(Boolean).length === 0 &&
      (shift.supporters || []).filter(Boolean).length === 0 &&
      !shift.handover?.note?.trim();

    // Optimistic update
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

    try {
      const res = await saveShiftAction(shift);
      if (res.success && res.updatedShift) {
        if (isClearing) {
          showToast('Đã huỷ lịch qua phụ Mẹ.', 'info');
        } else {
          setShifts((prev) =>
            prev.map((s) => (s.id === shift.id ? res.updatedShift! : s))
          );
          showToast('🤝 Đã lưu lịch qua phụ Mẹ lên Google Sheets!', 'success');
        }
      } else {
        showToast(res.message || 'Không thể lưu lịch lúc này.', 'warn');
      }
    } catch {
      showToast('Lỗi khi đồng bộ lịch gia đình lên Google Sheets.', 'warn');
    }
  }, []);

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
        currentMember={currentMember}
        onSelectMember={handleSelectMember}
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenGuide={() => setGuideModalOpen(true)}
        onOpenEmergencyContacts={() => setEmergencyModalOpen(true)}
        patientInfo={patientInfo}
        members={members}
        isAdmin={isAdmin}
        onOpenAdminPin={handleToggleAdmin}
        onOpenMembers={handleOpenMembers}
        onEditPatient={handleOpenEditPatient}
      />

      {/* Thân ứng dụng */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-2.5 sm:p-4 space-y-3.5">
        {/* Banner mini tóm tắt bệnh nhân & Nhắc nhở (Bấm mở rộng chi tiết) */}
        <PatientBanner
          currentMember={currentMember}
          patientInfo={patientInfo}
          reminders={reminders}
          members={members}
          onAddReminder={handleAddReminder}
          onDeleteReminder={handleDeleteReminder}
          onEditPatient={handleOpenEditPatient}
          onRefresh={() => loadAllData(true)}
          isLoading={isLoading}
        />

        {/* ===== NỘI DUNG THEO TAB ===== */}
        {activeView === 'today' ? (
          <div className="space-y-4">
            {/* 1. Form ghi huyết áp nhanh */}
            <QuickVitalsForm
              onSave={handleSaveVitals}
              lastEntry={lastVitalsEntry}
              bpThresholds={bpThresholds}
              defaultRecorder={recorderName}
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
        ) : activeView === 'charts' ? (
          /* ===== TAB BIỂU ĐỒ — Đợt B ===== */
          <VitalsChartView
            vitalsLog={vitalsLog}
            bpThresholds={bpThresholds}
            dailyLogs={dailyLogs}
            careRoutines={careRoutines}
            isAdmin={isAdmin}
            onDeleteVitals={handleDeleteVitals}
            onSaveVitals={handleSaveVitals}
          />
        ) : (
          /* ===== TAB GIA ĐÌNH ĐỒNG HÀNH — Đợt C ===== */
          <FamilySupportView
            shifts={shifts}
            members={members}
            currentMember={currentMember}
            isAdmin={isAdmin}
            onSaveShift={handleSaveShift}
            onOpenMembers={handleOpenMembers}
          />
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

      {/* ===== MODALS ===== */}

      {/* Modal Hướng Dẫn & Schema Google Sheets */}
      <GoogleSheetGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        isSheetsConnected={Boolean(settings?.googleSheetsConnected)}
      />

      {/* Modal Danh Bạ Số Điện Thoại Khẩn Cấp (Bác sĩ, 115, Hàng xóm) */}
      <EmergencyContactsModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        contacts={contacts}
        patientInfo={patientInfo}
        onSaveContact={handleSaveContact}
        onDeleteContact={handleDeleteContact}
      />

      {/* Modal Nhập / Đổi mã PIN Admin */}
      <AdminPinModal
        isOpen={adminPinModalOpen}
        onClose={() => {
          setAdminPinModalOpen(false);
          setPendingAdminAction(null);
        }}
        onSuccess={handleAdminPinSuccess}
        initialMode={adminPinModalMode}
      />

      {/* Modal Chỉnh Sửa Hồ Sơ Bệnh Nhân */}
      <EditPatientModal
        isOpen={editPatientModalOpen}
        onClose={() => setEditPatientModalOpen(false)}
        patient={patientInfo}
        onUpdated={handlePatientUpdated}
      />

      {/* Modal Quản Lý Thành Viên Trực Ca */}
      <MembersManagementModal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        members={members}
        onMembersUpdated={handleMembersUpdated}
      />

      {/* V2.0: Modal Quản Lý Đơn Thuốc & Bài Tập (Admin) */}
      <RoutineManagerModal
        isOpen={routineManagerOpen}
        onClose={() => setRoutineManagerOpen(false)}
        routines={careRoutines}
        stages={stages}
        activeStageId={activeStageId}
        onSaveRoutine={handleSaveRoutine}
        onDeleteRoutine={handleDeleteRoutine}
      />
    </div>
  );
}
