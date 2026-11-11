'use client';

import { useCallback } from 'react';
import type {
  AppointmentInfo,
  EmergencyContact,
  ExpenseEntry,
  HealthProfile,
  PatientDailyReminder,
  PatientInfo,
  ShiftRecord,
} from '@/lib/types';
import {
  DEFAULT_HEALTH_PROFILE_ID,
  ensureRecordProfilePrefix,
} from '@/lib/config';
import {
  deleteContactAction,
  deleteExpenseAction,
  deleteReminderAction,
  saveAppointmentAction,
  saveContactAction,
  saveExpenseAction,
  saveReminderAction,
  saveShiftAction,
} from '@/lib/actions';
import type { SyncStateKind } from '@/components/ui-kit';
import { mergeUpdatedProfileIntoRootInfo, stripNestedProfiles } from './profileSyncUtils';

export interface UseFamilyAdminCrudParams {
  activeProfile: HealthProfile;
  isFatherProfile: boolean;
  healthProfiles: HealthProfile[];
  patientInfo: PatientInfo;
  setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfo>>;
  patientDisplayName: string;
  setAppointment: React.Dispatch<React.SetStateAction<AppointmentInfo>>;
  setReminders: React.Dispatch<React.SetStateAction<PatientDailyReminder[]>>;
  setContacts: React.Dispatch<React.SetStateAction<EmergencyContact[]>>;
  setExpenses: React.Dispatch<React.SetStateAction<ExpenseEntry[]>>;
  setShifts: React.Dispatch<React.SetStateAction<ShiftRecord[]>>;
  requireAdmin: (action: () => void) => void;
  syncRootPatientInfo: (nextInfo: PatientInfo, toastMsg?: string) => void;
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStateKind>>;
  showToast: (message: string, type?: 'info' | 'success' | 'warn') => void;
}

/**
 * Các thao tác CRUD liên quan đến Lịch tái khám, Nhắc nhở, Danh bạ SOS, Sổ Thu Chi và Ca trực gia đình.
 */
export function useFamilyAdminCrudHandlers({
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
}: UseFamilyAdminCrudParams) {
  const handleSaveAppointment = useCallback(
    async (info: AppointmentInfo) => {
      if (isFatherProfile) {
        setAppointment(info);
        const updatedAll = healthProfiles.map((p) =>
          stripNestedProfiles({
            ...p,
            appointment: p.id === DEFAULT_HEALTH_PROFILE_ID ? info : p.appointment,
          })
        );
        setPatientInfo((prev) => ({ ...prev, healthProfiles: updatedAll }));
        showToast(`📅 Đã lưu lịch tái khám của ${patientDisplayName}!`, 'success');
        setSyncStatus('syncing');

        void saveAppointmentAction(info)
          .then((res) => {
            if (res.success && res.appointment) setAppointment(res.appointment);
            setSyncStatus(res.success ? 'synced' : 'error');
          })
          .catch(() => {
            setSyncStatus('error');
            showToast('Lỗi lưu lịch tái khám lên Sheet.', 'warn');
          });
      } else {
        const updatedProfile: HealthProfile = {
          ...activeProfile,
          appointment: info,
        };
        const nextRoot = mergeUpdatedProfileIntoRootInfo(
          patientInfo,
          healthProfiles,
          updatedProfile
        );
        syncRootPatientInfo(
          nextRoot,
          `📅 Đã lưu lịch tái khám của ${patientDisplayName}!`
        );
      }
    },
    [
      isFatherProfile,
      activeProfile,
      healthProfiles,
      patientInfo,
      patientDisplayName,
      setAppointment,
      setPatientInfo,
      setSyncStatus,
      syncRootPatientInfo,
      showToast,
    ]
  );

  const handleAddReminder = useCallback(
    async (newReminder: PatientDailyReminder) => {
      const scopedReminder: PatientDailyReminder = {
        ...newReminder,
        id: ensureRecordProfilePrefix(newReminder.id, activeProfile.id),
      };
      setReminders((prev) => {
        const idx = prev.findIndex((r) => r.id === scopedReminder.id);
        return idx >= 0
          ? prev.map((r, i) => (i === idx ? scopedReminder : r))
          : [scopedReminder, ...prev];
      });
      showToast(`🔔 Đã lưu nhắc nhở cho ${patientDisplayName}!`, 'success');
      void saveReminderAction(scopedReminder).catch(() => {
        showToast('Không thể đồng bộ nhắc nhở lên Sheet.', 'warn');
      });
    },
    [activeProfile.id, patientDisplayName, setReminders, showToast]
  );

  const handleDeleteReminder = useCallback(
    async (reminderId: string, title: string) => {
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
      showToast(`🗑️ Đã xoá nhắc nhở "${title}" của ${patientDisplayName}`, 'info');
      void deleteReminderAction(reminderId).catch(() => {});
    },
    [patientDisplayName, setReminders, showToast]
  );

  const handleSaveContact = useCallback(
    async (contact: EmergencyContact) => {
      requireAdmin(() => {
        setContacts((prev) => {
          const idx = prev.findIndex((c) => c.id === contact.id);
          return idx >= 0
            ? prev.map((c, i) => (i === idx ? contact : c))
            : [contact, ...prev];
        });
        showToast(`Đã lưu liên hệ ${contact.name}!`, 'success');
        void saveContactAction(contact).catch(() => {
          showToast('Không thể lưu liên hệ lên Sheet.', 'warn');
        });
      });
    },
    [requireAdmin, setContacts, showToast]
  );

  const handleDeleteContact = useCallback(
    async (contactId: string, name: string) => {
      requireAdmin(() => {
        setContacts((prev) => prev.filter((c) => c.id !== contactId));
        showToast(`Đã xoá liên hệ "${name}"`, 'info');
        void deleteContactAction(contactId).catch(() => {});
      });
    },
    [requireAdmin, setContacts, showToast]
  );

  const handleSaveExpense = useCallback(
    async (entry: ExpenseEntry) => {
      setExpenses((prev) => {
        const idx = prev.findIndex((e) => e.id === entry.id);
        const next =
          idx >= 0 ? prev.map((e, i) => (i === idx ? entry : e)) : [entry, ...prev];
        return next.sort((a, b) => {
          const dCmp = (b.date || '').localeCompare(a.date || '');
          return dCmp !== 0 ? dCmp : (b.createdAt || '').localeCompare(a.createdAt || '');
        });
      });
      setSyncStatus('syncing');
      void saveExpenseAction(entry)
        .then((res) => {
          if (res.success && Array.isArray(res.expenses) && res.expenses.length > 0) {
            setExpenses(res.expenses);
          }
          setSyncStatus(res.success ? 'synced' : 'error');
          if (!res.success) {
            showToast('Lỗi đồng bộ khoản thu/chi lên Google Sheets.', 'warn');
          }
        })
        .catch(() => {
          setSyncStatus('error');
          showToast('Lỗi đồng bộ khoản thu/chi lên Google Sheets.', 'warn');
        });
    },
    [setExpenses, setSyncStatus, showToast]
  );

  const handleDeleteExpense = useCallback(
    async (expenseId: string) => {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      setSyncStatus('syncing');
      void deleteExpenseAction(expenseId)
        .then((res) => {
          setSyncStatus(res.success ? 'synced' : 'error');
          if (!res.success) {
            showToast('Lỗi xóa khoản thu/chi trên Google Sheets.', 'warn');
          }
        })
        .catch(() => {
          setSyncStatus('error');
          showToast('Lỗi xóa khoản thu/chi trên Google Sheets.', 'warn');
        });
    },
    [setExpenses, setSyncStatus, showToast]
  );

  const handleSaveShift = useCallback(
    async (shift: ShiftRecord) => {
      const isClearing =
        (shift.assignees || []).filter(Boolean).length === 0 &&
        (shift.supporters || []).filter(Boolean).length === 0 &&
        !shift.handover?.note?.trim();

      setShifts((prev) => {
        if (isClearing) return prev.filter((s) => s.id !== shift.id);
        const idx = prev.findIndex((s) => s.id === shift.id);
        return idx >= 0 ? prev.map((s, i) => (i === idx ? shift : s)) : [shift, ...prev];
      });

      showToast(
        isClearing ? 'Đã huỷ lịch qua phụ Mẹ.' : '🤝 Đã lưu lịch qua phụ Mẹ!',
        isClearing ? 'info' : 'success'
      );
      setSyncStatus('syncing');

      void saveShiftAction(shift)
        .then((res) => {
          if (res.success && res.updatedShift && !isClearing) {
            setShifts((prev) =>
              prev.map((s) => (s.id === shift.id ? res.updatedShift! : s))
            );
          }
          setSyncStatus(res.success ? 'synced' : 'error');
          if (!res.success) {
            showToast(
              res.message || 'Cảnh báo: Chưa đồng bộ được lịch lên Sheet.',
              'warn'
            );
          }
        })
        .catch(() => {
          setSyncStatus('error');
          showToast('Lỗi khi đồng bộ lịch gia đình lên Google Sheets.', 'warn');
        });
    },
    [setShifts, setSyncStatus, showToast]
  );

  return {
    handleSaveAppointment,
    handleAddReminder,
    handleDeleteReminder,
    handleSaveContact,
    handleDeleteContact,
    handleSaveExpense,
    handleDeleteExpense,
    handleSaveShift,
  };
}
