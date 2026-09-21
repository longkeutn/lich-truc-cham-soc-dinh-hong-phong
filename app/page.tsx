'use client';

import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore, useRef } from 'react';
import HeaderBar from '@/components/HeaderBar';
import PatientBanner from '@/components/PatientBanner';
import WeeklyView, { DaySchedule } from '@/components/WeeklyView';
import MonthlyView from '@/components/MonthlyView';
import ShiftHistoryView from '@/components/ShiftHistoryView';
import GoogleSheetGuideModal from '@/components/GoogleSheetGuideModal';
import EmergencyContactsModal from '@/components/EmergencyContactsModal';
import { AdminPinModal } from '@/components/AdminPinModal';
import { EditPatientModal } from '@/components/EditPatientModal';
import { MembersManagementModal } from '@/components/MembersManagementModal';

import {
  CarePhase,
  FamilyMember,
  ShiftRecord,
  PatientVitals,
  SystemSettings,
  PatientInfo,
  EmergencyContact,
  PatientDailyReminder,
} from '@/lib/types';
import {
  FAMILY_MEMBERS,
  PHASE_CONFIGS,
  PATIENT_INFO,
  DEFAULT_EMERGENCY_CONTACTS,
  DEFAULT_PATIENT_REMINDERS,
} from '@/lib/config';
import {
  fetchAllAppDataAction,
  assignShiftSlotAction,
  unassignShiftSlotAction,
  saveShiftAction,
  toggleChecklistAction,
  saveHandoverAction,
  getSettingsAction,
  saveContactAction,
  deleteContactAction,
  saveReminderAction,
  deleteReminderAction,
  changePhaseAction,
} from '@/lib/actions';

import {
  RefreshCw,
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

  // Dynamic state từ Google Sheets
  const [members, setMembers] = useState<FamilyMember[]>(FAMILY_MEMBERS);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>(PATIENT_INFO);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [reminders, setReminders] = useState<PatientDailyReminder[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const [activePhase, setActivePhase] = useState<CarePhase>('phase1');
  const [activeView, setActiveView] = useState<'weekly' | 'monthly' | 'analytics'>('weekly');
  const [weekOffset, setWeekOffset] = useState<number>(0);
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

  // Tính toán khoảng ngày cho tuần hiện tại
  const weekDates = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Chủ Nhật, 1 = T2...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + weekOffset * 7);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [weekOffset]);

  // Concurrency Guard: bảo vệ các ca trực vừa thao tác trên client tránh bị server response cũ ghi đè
  const recentLocalShiftUpdates = useRef<Map<string, number>>(new Map());

  const markShiftLocallyUpdated = (shiftId: string) => {
    recentLocalShiftUpdates.current.set(shiftId, Date.now());
  };

  // Tải toàn bộ dữ liệu 5 thực thể từ Google Sheets (có Cache TTL và Safe Merge)
  const loadAllData = useCallback(
    async (forceRefresh = false) => {
      setIsLoading(true);
      if (forceRefresh) {
        showToast('Đang làm mới dữ liệu từ Google Sheets...', 'info');
      }

      try {
        let qStart: string;
        let qEnd: string;

        if (activeView === 'monthly') {
          // View tháng: Lấy từ đầu tháng đến cuối tháng (+/- 5 ngày)
          const midDate = weekDates[3] || new Date();
          const firstDay = new Date(midDate.getFullYear(), midDate.getMonth(), 1);
          firstDay.setDate(firstDay.getDate() - 5);
          const lastDay = new Date(midDate.getFullYear(), midDate.getMonth() + 1, 0);
          lastDay.setDate(lastDay.getDate() + 5);

          qStart = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
          qEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
        } else {
          // View tuần: Thu hẹp đúng 21 ngày (Thứ 2 tuần trước -> Chủ nhật tuần sau)
          const qStartDate = new Date(weekDates[0]);
          qStartDate.setDate(qStartDate.getDate() - 7);
          const qEndDate = new Date(weekDates[weekDates.length - 1]);
          qEndDate.setDate(qEndDate.getDate() + 7);

          qStart = `${qStartDate.getFullYear()}-${String(qStartDate.getMonth() + 1).padStart(2, '0')}-${String(qStartDate.getDate()).padStart(2, '0')}`;
          qEnd = `${qEndDate.getFullYear()}-${String(qEndDate.getMonth() + 1).padStart(2, '0')}-${String(qEndDate.getDate()).padStart(2, '0')}`;
        }

        if (forceRefresh) {
          recentLocalShiftUpdates.current.clear();
        }

        const appData = await fetchAllAppDataAction(qStart, qEnd, activePhase, forceRefresh);

        if (appData) {
          // Concurrency Guard: Hợp nhất shifts, bảo vệ các ca vừa sửa trên giao diện trong 8s
          if (appData.shifts) {
            setShifts((prevShifts) => {
              const now = Date.now();
              const shiftMap = new Map<string, ShiftRecord>();
              prevShifts.forEach((s) => shiftMap.set(s.id, s));

              appData.shifts.forEach((serverShift) => {
                if (!forceRefresh) {
                  const localTimestamp = recentLocalShiftUpdates.current.get(serverShift.id);
                  if (localTimestamp && now - localTimestamp < 8000) {
                    // Giữ nguyên bản ghi optimistic UI gần nhất của client
                    return;
                  }
                }
                shiftMap.set(serverShift.id, serverShift);
              });

              return Array.from(shiftMap.values());
            });
          }

          if (appData.members && appData.members.length > 0) setMembers(appData.members);
          if (appData.patientInfo && appData.patientInfo.name) setPatientInfo(appData.patientInfo);
          if (Array.isArray(appData.contacts)) setContacts(appData.contacts);
          if (Array.isArray(appData.reminders)) setReminders(appData.reminders);
          if (appData.settings) setSettings(appData.settings);

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
    [weekDates, activePhase, activeView]
  );

  useEffect(() => {
    loadAllData(false);
  }, [loadAllData]);

  // Cấu trúc 7 ngày theo định dạng tiếng Việt
  const weeklyDays = useMemo<DaySchedule[]>(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

    return weekDates.map((dateObj, idx) => {
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const displayDate = `${dd}/${mm}`;
      const dayOfWeekVi = dayNames[idx];

      const dayShifts = shifts.filter((s) => s.date === dateStr && s.phase === activePhase);
      const understaffedCount = dayShifts.filter((s) => s.isUnderstaffed).length;

      return {
        dateStr,
        dayOfWeekVi,
        displayDate,
        dayOfMonth: dateObj.getDate(),
        month: dateObj.getMonth() + 1,
        year: yyyy,
        isToday: dateStr === todayStr,
        shifts: dayShifts,
        understaffedCount,
      };
    });
  }, [weekDates, shifts, activePhase]);

  // Tổng số ca thiếu người trong tuần
  const totalUnderstaffedThisWeek = useMemo(() => {
    return weeklyDays.reduce((sum, d) => sum + d.understaffedCount, 0);
  }, [weeklyDays]);

  // Xử lý nhận ca trực
  const handleAssign = async (shift: ShiftRecord, slotIndex: number, specificMember?: FamilyMember) => {
    const memberToAssign = specificMember || currentMember;

    if (!memberToAssign) {
      showToast('Vui lòng chọn tên của bạn để nhận ca trực!', 'warn');
      return;
    }

    if (specificMember && (!currentMember || currentMember.id !== specificMember.id)) {
      handleSelectMember(specificMember);
    }

    // Optimistic UI update
    const previousShifts = [...shifts];
    const assignees = [...shift.assignees];
    while (assignees.length < shift.requiredPax) {
      assignees.push('');
    }
    assignees[slotIndex] = memberToAssign.name;
    const isUnderstaffed = assignees.filter(Boolean).length < shift.requiredPax;

    const optimisticShift: ShiftRecord = {
      ...shift,
      assignees,
      isUnderstaffed,
    };

    markShiftLocallyUpdated(shift.id);
    setShifts((prev) => prev.map((s) => (s.id === shift.id ? optimisticShift : s)));
    showToast(`Đã nhận: ${memberToAssign.name} - ${shift.name} (${shift.date.split('-').reverse().join('/')})`, 'success');

    try {
      const res = await assignShiftSlotAction(shift, memberToAssign.name, slotIndex);
      if (!res.success) {
        setShifts(previousShifts);
        showToast(res.message || 'Không thể nhận ca.', 'warn');
      } else if (res.updatedShift) {
        markShiftLocallyUpdated(res.updatedShift.id);
        setShifts((prev) => prev.map((s) => (s.id === shift.id ? res.updatedShift! : s)));
      }
    } catch {
      setShifts(previousShifts);
      showToast('Lỗi máy chủ khi nhận ca.', 'warn');
    }
  };

  // Xử lý huỷ ca trực
  const handleUnassign = async (shift: ShiftRecord, slotIndex: number) => {
    const previousShifts = [...shifts];
    const assignees = [...shift.assignees];
    const removedName = assignees[slotIndex];
    assignees[slotIndex] = '';
    const isUnderstaffed = assignees.filter(Boolean).length < shift.requiredPax;

    const optimisticShift: ShiftRecord = {
      ...shift,
      assignees,
      isUnderstaffed,
    };

    markShiftLocallyUpdated(shift.id);
    setShifts((prev) => prev.map((s) => (s.id === shift.id ? optimisticShift : s)));
    showToast(`Đã huỷ trực cho ${removedName || 'vị trí ' + (slotIndex + 1)}`, 'info');

    try {
      const res = await unassignShiftSlotAction(shift, slotIndex);
      if (!res.success) {
        setShifts(previousShifts);
        showToast(res.message || 'Không thể huỷ nhận ca.', 'warn');
      } else if (res.updatedShift) {
        markShiftLocallyUpdated(res.updatedShift.id);
        setShifts((prev) => prev.map((s) => (s.id === shift.id ? res.updatedShift! : s)));
      }
    } catch {
      setShifts(previousShifts);
      showToast('Lỗi máy chủ khi huỷ ca.', 'warn');
    }
  };

  // Cập nhật toàn diện ca trực (số người trực, người trực chính, người hỗ trợ)
  const handleUpdateShift = async (updatedShift: ShiftRecord) => {
    const previousShifts = [...shifts];
    markShiftLocallyUpdated(updatedShift.id);
    setShifts((prev) => prev.map((s) => (s.id === updatedShift.id ? updatedShift : s)));

    try {
      const res = await saveShiftAction(updatedShift);
      if (!res.success) {
        setShifts(previousShifts);
        showToast(res.message || 'Không thể cập nhật ca trực.', 'warn');
      } else if (res.updatedShift) {
        markShiftLocallyUpdated(res.updatedShift.id);
        setShifts((prev) => prev.map((s) => (s.id === updatedShift.id ? res.updatedShift! : s)));
        showToast(`Đã cập nhật: ${updatedShift.name}`, 'success');
      }
    } catch {
      setShifts(previousShifts);
      showToast('Lỗi máy chủ khi cập nhật ca.', 'warn');
    }
  };

  // Đánh dấu công việc chăm sóc trong ca
  const handleToggleChecklist = async (
    shift: ShiftRecord,
    itemKey: 'feeding' | 'meds' | 'hygiene' | 'turning',
    isChecked: boolean
  ) => {
    const previousShifts = [...shifts];
    const updatedChecklist = {
      ...shift.checklist,
      [itemKey]: isChecked,
    };

    const optimisticShift: ShiftRecord = {
      ...shift,
      checklist: updatedChecklist,
    };

    markShiftLocallyUpdated(shift.id);
    setShifts((prev) => prev.map((s) => (s.id === shift.id ? optimisticShift : s)));

    try {
      const res = await toggleChecklistAction(shift, itemKey, isChecked);
      if (res.updatedShift) {
        markShiftLocallyUpdated(res.updatedShift.id);
        setShifts((prev) => prev.map((s) => (s.id === shift.id ? res.updatedShift! : s)));
      }
    } catch {
      setShifts(previousShifts);
    }
  };

  // Lưu sổ bàn giao ca & sinh hiệu
  const handleSaveHandover = async (
    shift: ShiftRecord,
    note: string,
    author: string,
    vitals?: PatientVitals
  ) => {
    const previousShifts = [...shifts];
    const optimisticShift: ShiftRecord = {
      ...shift,
      handover: {
        note,
        author,
        updatedAt: new Date().toISOString(),
        vitals: vitals || shift.handover.vitals,
      },
    };

    markShiftLocallyUpdated(shift.id);
    setShifts((prev) => prev.map((s) => (s.id === shift.id ? optimisticShift : s)));
    showToast('Đã lưu nội dung bàn giao ca lên Sheet!', 'success');

    try {
      const res = await saveHandoverAction(shift, note, author, vitals);
      if (res.updatedShift) {
        markShiftLocallyUpdated(res.updatedShift.id);
        setShifts((prev) => prev.map((s) => (s.id === shift.id ? res.updatedShift! : s)));
      }
    } catch {
      setShifts(previousShifts);
      showToast('Lỗi lưu sổ bàn giao.', 'warn');
    }
  };

  // CRUD Reminders
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

  const performChangePhase = async (phase: CarePhase) => {
    setActivePhase(phase);
    try {
      const updatedSettings = await changePhaseAction(phase);
      setSettings(updatedSettings);
    } catch {
      // ignore
    }
    showToast(
      phase === 'phase1'
        ? 'Đã chuyển sang Giai đoạn 1: Nằm viện ICU (3 ca 8h, 1 người/ca)'
        : 'Đã chuyển sang Giai đoạn 2: Phục hồi / Tại nhà (Ca 12 tiếng, 2 người/ca)',
      'info'
    );
  };

  const handleChangePhase = (phase: CarePhase) => {
    if (phase === activePhase) return;
    requireAdmin(() => performChangePhase(phase));
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-white border-2 border-slate-300 shadow-2xl text-slate-900 text-xs sm:text-sm font-bold flex items-center gap-2 animate-bounce">
          {notification.type === 'warn' ? (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header điều khiển cố định */}
      <HeaderBar
        currentMember={currentMember}
        onSelectMember={handleSelectMember}
        activePhase={activePhase}
        onChangePhase={handleChangePhase}
        activeView={activeView}
        onChangeView={setActiveView}
        onOpenGuide={() => setGuideModalOpen(true)}
        onOpenEmergencyContacts={() => setEmergencyModalOpen(true)}
        understaffedTotal={totalUnderstaffedThisWeek}
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

        {/* Nội dung View: Theo Tuần, Theo Tháng hoặc Lịch Sử Trực */}
        {activeView === 'weekly' ? (
          <WeeklyView
            days={weeklyDays}
            currentMember={currentMember}
            activePhase={activePhase}
            currentWeekOffset={weekOffset}
            onChangeWeekOffset={(delta) => setWeekOffset((prev) => prev + delta)}
            onResetToCurrentWeek={() => setWeekOffset(0)}
            onAssign={handleAssign}
            onUnassign={handleUnassign}
            onToggleChecklist={handleToggleChecklist}
            onSaveHandover={handleSaveHandover}
            onUpdateShift={handleUpdateShift}
            members={members}
            patientInfo={patientInfo}
          />
        ) : activeView === 'monthly' ? (
          <MonthlyView
            shifts={shifts}
            currentMember={currentMember}
            activePhase={activePhase}
            onAssign={handleAssign}
            onUnassign={handleUnassign}
            onToggleChecklist={handleToggleChecklist}
            onSaveHandover={handleSaveHandover}
            members={members}
          />
        ) : (
          <ShiftHistoryView shifts={shifts} members={members} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white p-4 mt-8 text-center text-xs text-slate-600">
        <div className="max-w-md mx-auto space-y-1">
          <p className="text-slate-800 font-bold">
            Hệ thống điều phối ca trực gia đình • Bệnh nhân: {patientInfo.name}
          </p>
          <p className="text-[11px] text-slate-500">
            Dữ liệu đồng bộ 5 Bảng Tính Google Sheets thời gian thực • Không còn hardcode
          </p>
        </div>
      </footer>

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
    </div>
  );
}
