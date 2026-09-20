'use client';

import React, { useState, useEffect, useMemo, useCallback, useSyncExternalStore } from 'react';
import HeaderBar from '@/components/HeaderBar';
import PatientBanner from '@/components/PatientBanner';
import WeeklyView, { DaySchedule } from '@/components/WeeklyView';
import MonthlyView from '@/components/MonthlyView';
import AnalyticsView from '@/components/AnalyticsView';
import GoogleSheetGuideModal from '@/components/GoogleSheetGuideModal';
import EmergencyContactsModal from '@/components/EmergencyContactsModal';

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
  const [contacts, setContacts] = useState<EmergencyContact[]>(DEFAULT_EMERGENCY_CONTACTS);
  const [reminders, setReminders] = useState<PatientDailyReminder[]>(DEFAULT_PATIENT_REMINDERS);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const [activePhase, setActivePhase] = useState<CarePhase>('phase1');
  const [activeView, setActiveView] = useState<'weekly' | 'monthly' | 'analytics'>('weekly');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [guideModalOpen, setGuideModalOpen] = useState<boolean>(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'warn' } | null>(null);

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

  // Tải toàn bộ dữ liệu 5 thực thể từ Google Sheets
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const monthStart = new Date(weekDates[0]);
      monthStart.setDate(monthStart.getDate() - 15);
      const monthEnd = new Date(weekDates[weekDates.length - 1]);
      monthEnd.setDate(monthEnd.getDate() + 30);

      const qStart = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-${String(monthStart.getDate()).padStart(2, '0')}`;
      const qEnd = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;

      const appData = await fetchAllAppDataAction(qStart, qEnd, activePhase);

      if (appData) {
        if (appData.shifts) setShifts(appData.shifts);
        if (appData.members && appData.members.length > 0) setMembers(appData.members);
        if (appData.patientInfo && appData.patientInfo.name) setPatientInfo(appData.patientInfo);
        if (appData.contacts && appData.contacts.length > 0) setContacts(appData.contacts);
        if (appData.reminders) setReminders(appData.reminders);
        if (appData.settings) setSettings(appData.settings);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu:', err);
      showToast('Không thể kết nối máy chủ để tải dữ liệu.', 'warn');
    } finally {
      setIsLoading(false);
    }
  }, [weekDates, activePhase]);

  useEffect(() => {
    loadAllData();
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

    setShifts((prev) => prev.map((s) => (s.id === shift.id ? optimisticShift : s)));
    showToast(`Đã nhận: ${memberToAssign.name} - ${shift.name} (${shift.date.split('-').reverse().join('/')})`, 'success');

    try {
      const res = await assignShiftSlotAction(shift, memberToAssign.name, slotIndex);
      if (!res.success) {
        setShifts(previousShifts);
        showToast(res.message || 'Không thể nhận ca.', 'warn');
      } else if (res.updatedShift) {
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

    setShifts((prev) => prev.map((s) => (s.id === shift.id ? optimisticShift : s)));
    showToast(`Đã huỷ trực cho ${removedName || 'vị trí ' + (slotIndex + 1)}`, 'info');

    try {
      const res = await unassignShiftSlotAction(shift, slotIndex);
      if (!res.success) {
        setShifts(previousShifts);
        showToast(res.message || 'Không thể huỷ nhận ca.', 'warn');
      } else if (res.updatedShift) {
        setShifts((prev) => prev.map((s) => (s.id === shift.id ? res.updatedShift! : s)));
      }
    } catch {
      setShifts(previousShifts);
      showToast('Lỗi máy chủ khi huỷ ca.', 'warn');
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

    setShifts((prev) => prev.map((s) => (s.id === shift.id ? optimisticShift : s)));

    try {
      const res = await toggleChecklistAction(shift, itemKey, isChecked);
      if (res.updatedShift) {
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

    setShifts((prev) => prev.map((s) => (s.id === shift.id ? optimisticShift : s)));
    showToast('Đã lưu nội dung bàn giao ca lên Sheet!', 'success');

    try {
      const res = await saveHandoverAction(shift, note, author, vitals);
      if (res.updatedShift) {
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

  // CRUD Contacts
  const handleSaveContact = async (contact: EmergencyContact) => {
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
  };

  const handleDeleteContact = async (contactId: string, name: string) => {
    try {
      const res = await deleteContactAction(contactId);
      if (res.success && res.contacts) {
        setContacts(res.contacts);
        showToast(`Đã xoá liên hệ "${name}" khỏi Google Sheets`, 'info');
      }
    } catch (err) {
      console.error('Lỗi xoá liên hệ:', err);
    }
  };

  const handleChangePhase = async (phase: CarePhase) => {
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
      />

      {/* Thân ứng dụng */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 space-y-4">
        {/* Banner tình trạng bệnh nhân Đinh Hồng Phong & Nhắc nhở quan trọng trong ngày */}
        <PatientBanner
          currentMember={currentMember}
          patientInfo={patientInfo}
          reminders={reminders}
          members={members}
          onAddReminder={handleAddReminder}
          onDeleteReminder={handleDeleteReminder}
        />

        {/* Thanh trạng thái giai đoạn */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                activePhase === 'phase1' ? 'bg-indigo-600 ring-4 ring-indigo-100 animate-pulse' : 'bg-emerald-600 ring-4 ring-emerald-100'
              }`}
            />
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                {PHASE_CONFIGS[activePhase].name}
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                {PHASE_CONFIGS[activePhase].description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAllData}
              disabled={isLoading}
              title="Làm mới dữ liệu từ Google Sheets"
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 transition min-h-[44px] flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Làm mới Sheet</span>
            </button>
          </div>
        </div>

        {/* Nội dung View: Theo Tuần, Theo Tháng hoặc Analytics */}
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
          <AnalyticsView shifts={shifts} members={members} />
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
    </div>
  );
}
