'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AppView, ProfileModalMode } from '@/components/navigation';
import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPrefs,
  saveNotificationPrefs,
} from '@/lib/notifications';
import type { HealthProfile } from '@/lib/types';

/**
 * Điều phối trạng thái Tab Mobile-First, Toast thông báo, phiên mở khóa Admin/Thu Chi và các cửa sổ Modal.
 */
export function useCareUiController() {
  const [activeView, setActiveView] = useState<AppView>('today');
  const [visitedViews, setVisitedViews] = useState<Record<AppView, boolean>>({
    today: true,
    charts: false,
    labs: false,
    family: false,
    expenses: false,
  });

  const handleChangeView = useCallback((view: AppView) => {
    setActiveView(view);
    setVisitedViews((prev) => (prev[view] ? prev : { ...prev, [view]: true }));
  }, []);

  const [notification, setNotification] = useState<{
    message: string;
    type: 'info' | 'success' | 'warn';
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
      setNotification({ message, type });
      setTimeout(() => {
        setNotification(null);
      }, 3200);
    },
    []
  );

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFS
  );
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isExpenseUnlocked, setIsExpenseUnlocked] = useState<boolean>(false);

  const [profileModalMode, setProfileModalMode] = useState<ProfileModalMode>('closed');
  const [editingProfileTarget, setEditingProfileTarget] = useState<HealthProfile | null>(
    null
  );
  const [guideModalOpen, setGuideModalOpen] = useState<boolean>(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState<boolean>(false);
  const [installPwaModalOpen, setInstallPwaModalOpen] = useState<boolean>(false);
  const [notifSettingsModalOpen, setNotifSettingsModalOpen] = useState<boolean>(false);
  const [adminPinModalOpen, setAdminPinModalOpen] = useState<boolean>(false);
  const [adminPinModalMode, setAdminPinModalMode] = useState<'unlock' | 'change'>('unlock');
  const [editPatientModalOpen, setEditPatientModalOpen] = useState<boolean>(false);
  const [membersModalOpen, setMembersModalOpen] = useState<boolean>(false);
  const [routineManagerOpen, setRoutineManagerOpen] = useState<boolean>(false);
  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
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
      // Bỏ qua lỗi đọc sessionStorage
    }
  }, []);

  const handleSaveNotificationPrefs = useCallback((nextPrefs: NotificationPreferences) => {
    setNotificationPrefs(nextPrefs);
    saveNotificationPrefs(nextPrefs);
  }, []);

  const requireAdmin = useCallback(
    (action: () => void) => {
      if (isAdmin || isExpenseUnlocked) {
        action();
      } else {
        setPendingAdminAction(() => action);
        setAdminPinModalMode('unlock');
        setAdminPinModalOpen(true);
      }
    },
    [isAdmin, isExpenseUnlocked]
  );

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
      // Bỏ qua
    }
    showToast('✏️ Đã mở quyền Chỉnh sửa danh mục!', 'success');
    if (pendingAdminAction) {
      const action = pendingAdminAction;
      setPendingAdminAction(null);
      setTimeout(() => action(), 50);
    }
  }, [pendingAdminAction, showToast]);

  const handleUnlockExpenseSuccess = useCallback(() => {
    setIsExpenseUnlocked(true);
    setIsAdmin(true);
    try {
      sessionStorage.setItem('care_expense_auth', 'true');
      sessionStorage.setItem('care_admin_auth', 'true');
    } catch {
      // Bỏ qua
    }
    showToast('👑 Đã mở quyền Quản trị viên và Sổ Thu Chi Y Tế!', 'success');
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
      // Bỏ qua
    }
    showToast('🔒 Đã khóa lại toàn bộ quyền chỉnh sửa và quản trị', 'info');
  }, [showToast]);

  const handleLockExpense = useCallback(() => {
    setIsExpenseUnlocked(false);
    setGuideModalOpen(false);
    try {
      sessionStorage.removeItem('care_expense_auth');
    } catch {
      // Bỏ qua
    }
    showToast('🔒 Đã khóa quyền Quản trị cao cấp và Sổ Thu Chi.', 'info');
  }, [showToast]);

  const openProfileModal = useCallback(
    (mode: ProfileModalMode, target: HealthProfile | null = null) => {
      setEditingProfileTarget(target);
      setProfileModalMode(mode);
    },
    []
  );

  const closeAdminPinModal = useCallback(() => {
    setAdminPinModalOpen(false);
    setPendingAdminAction(null);
  }, []);

  const openAdminPinUnlock = useCallback(() => {
    setAdminPinModalMode('unlock');
    setAdminPinModalOpen(true);
  }, []);

  return {
    activeView,
    visitedViews,
    handleChangeView,
    notification,
    showToast,
    notificationPrefs,
    handleSaveNotificationPrefs,
    isAdmin,
    isExpenseUnlocked,
    requireAdmin,
    handleOpenGuide,
    handleAdminPinSuccess,
    handleUnlockExpenseSuccess,
    handleLockAdmin,
    handleLockExpense,
    profileModalMode,
    editingProfileTarget,
    openProfileModal,
    guideModalOpen,
    setGuideModalOpen,
    emergencyModalOpen,
    setEmergencyModalOpen,
    installPwaModalOpen,
    setInstallPwaModalOpen,
    notifSettingsModalOpen,
    setNotifSettingsModalOpen,
    adminPinModalOpen,
    adminPinModalMode,
    openAdminPinUnlock,
    closeAdminPinModal,
    editPatientModalOpen,
    setEditPatientModalOpen,
    membersModalOpen,
    setMembersModalOpen,
    routineManagerOpen,
    setRoutineManagerOpen,
  };
}
