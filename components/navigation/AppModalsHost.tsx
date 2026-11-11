'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type {
  CareRoutine,
  EmergencyContact,
  FamilyMember,
  HealthProfile,
  PatientInfo,
  RehabStage,
  VitalsLogEntry,
} from '@/lib/types';
import type { NotificationPreferences } from '@/lib/notifications';
import type { ProfileModalMode } from './navigationTypes';
import { ProfileQuickSwitcherModal } from './ProfileQuickSwitcherModal';

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

export interface AppModalsHostProps {
  profileModalMode: ProfileModalMode;
  editingProfileTarget: HealthProfile | null;
  onCloseProfileModal: () => void;
  healthProfiles: HealthProfile[];
  activeProfileId: string;
  vitalsLog: VitalsLogEntry[];
  todayStr: string;
  members: FamilyMember[];
  onSelectProfile: (profileId: string) => void;
  onSaveProfile: (profile: HealthProfile) => Promise<void>;
  onDeleteProfile: (profileId: string) => Promise<void>;

  installPwaModalOpen: boolean;
  onCloseInstallPwa: () => void;
  onOpenInstallPwa: () => void;

  notifSettingsModalOpen: boolean;
  onCloseNotifSettings: () => void;
  notificationPrefs: NotificationPreferences;
  onSaveNotificationPrefs: (prefs: NotificationPreferences) => void;

  guideModalOpen: boolean;
  onCloseGuide: () => void;
  onOpenGuideDirect: () => void;
  isSheetsConnected: boolean;

  emergencyModalOpen: boolean;
  onCloseEmergency: () => void;
  contacts: EmergencyContact[];
  profilePatientInfo: PatientInfo;
  onSaveContact: (contact: EmergencyContact) => Promise<void>;
  onDeleteContact: (contactId: string, name: string) => Promise<void>;

  adminPinModalOpen: boolean;
  adminPinModalMode: 'unlock' | 'change';
  onCloseAdminPin: () => void;
  onAdminPinSuccess: () => void;
  onUnlockExpenseSuccess: () => void;
  isAdmin: boolean;
  isExpenseUnlocked: boolean;
  onLockAdmin: () => void;
  onOpenExpensesView: () => void;

  editPatientModalOpen: boolean;
  onCloseEditPatient: () => void;
  onPatientUpdated: (info: PatientInfo) => void;

  membersModalOpen: boolean;
  onOpenMembers: () => void;
  onCloseMembers: () => void;
  onMembersUpdated: (members: FamilyMember[]) => void;
  onToggleMemberHealthProfile: (member: FamilyMember, enabled: boolean) => void;

  routineManagerOpen: boolean;
  onCloseRoutineManager: () => void;
  profileCareRoutines: CareRoutine[];
  stages: RehabStage[];
  activeStageId: string;
  onSaveRoutine: (routine: CareRoutine) => Promise<void>;
  onDeleteRoutine: (id: string) => Promise<void>;

  showToast: (message: string, type?: 'info' | 'success' | 'warn') => void;
}

/**
 * Bộ quản lý tập trung toàn bộ Modal của ứng dụng (chỉ mount khi đang mở để tối ưu bộ nhớ DOM).
 */
export function AppModalsHost({
  profileModalMode,
  editingProfileTarget,
  onCloseProfileModal,
  healthProfiles,
  activeProfileId,
  vitalsLog,
  todayStr,
  members,
  onSelectProfile,
  onSaveProfile,
  onDeleteProfile,
  installPwaModalOpen,
  onCloseInstallPwa,
  onOpenInstallPwa,
  notifSettingsModalOpen,
  onCloseNotifSettings,
  notificationPrefs,
  onSaveNotificationPrefs,
  guideModalOpen,
  onCloseGuide,
  onOpenGuideDirect,
  isSheetsConnected,
  emergencyModalOpen,
  onCloseEmergency,
  contacts,
  profilePatientInfo,
  onSaveContact,
  onDeleteContact,
  adminPinModalOpen,
  adminPinModalMode,
  onCloseAdminPin,
  onAdminPinSuccess,
  onUnlockExpenseSuccess,
  isAdmin,
  isExpenseUnlocked,
  onLockAdmin,
  onOpenExpensesView,
  editPatientModalOpen,
  onCloseEditPatient,
  onPatientUpdated,
  membersModalOpen,
  onOpenMembers,
  onCloseMembers,
  onMembersUpdated,
  onToggleMemberHealthProfile,
  routineManagerOpen,
  onCloseRoutineManager,
  profileCareRoutines,
  stages,
  activeStageId,
  onSaveRoutine,
  onDeleteRoutine,
  showToast,
}: AppModalsHostProps) {
  return (
    <>
      <ProfileQuickSwitcherModal
        mode={profileModalMode}
        initialProfile={editingProfileTarget}
        profiles={healthProfiles}
        activeProfileId={activeProfileId}
        allVitalsLog={vitalsLog}
        todayStr={todayStr}
        members={members}
        onClose={onCloseProfileModal}
        onSelectProfile={onSelectProfile}
        onSaveProfile={onSaveProfile}
        onDeleteProfile={onDeleteProfile}
        onOpenMembers={onOpenMembers}
      />

      {installPwaModalOpen && (
        <PwaInstallModal isOpen={installPwaModalOpen} onClose={onCloseInstallPwa} />
      )}

      {notifSettingsModalOpen && (
        <NotificationSettingsModal
          isOpen={notifSettingsModalOpen}
          onClose={onCloseNotifSettings}
          prefs={notificationPrefs}
          onSavePrefs={onSaveNotificationPrefs}
          onOpenInstallPwa={onOpenInstallPwa}
          showToast={showToast}
        />
      )}

      {guideModalOpen && isExpenseUnlocked && (
        <GoogleSheetGuideModal
          isOpen={guideModalOpen}
          onClose={onCloseGuide}
          isSheetsConnected={isSheetsConnected}
        />
      )}

      {emergencyModalOpen && (
        <EmergencyContactsModal
          isOpen={emergencyModalOpen}
          onClose={onCloseEmergency}
          contacts={contacts}
          patientInfo={profilePatientInfo}
          onSaveContact={onSaveContact}
          onDeleteContact={onDeleteContact}
        />
      )}

      {adminPinModalOpen && (
        <AdminPinModal
          isOpen={adminPinModalOpen}
          onClose={onCloseAdminPin}
          onSuccess={onAdminPinSuccess}
          onExpenseSuccess={onUnlockExpenseSuccess}
          isAdmin={isAdmin}
          isSuperAdmin={isExpenseUnlocked}
          onLockAdmin={onLockAdmin}
          onOpenExpenses={onOpenExpensesView}
          onOpenGuide={onOpenGuideDirect}
          initialMode={adminPinModalMode}
        />
      )}

      {editPatientModalOpen && (
        <EditPatientModal
          isOpen={editPatientModalOpen}
          onClose={onCloseEditPatient}
          patient={profilePatientInfo}
          onUpdated={onPatientUpdated}
        />
      )}

      {membersModalOpen && (
        <MembersManagementModal
          isOpen={membersModalOpen}
          onClose={onCloseMembers}
          members={members}
          onMembersUpdated={onMembersUpdated}
          healthProfiles={healthProfiles}
          onToggleMemberHealthProfile={onToggleMemberHealthProfile}
        />
      )}

      {routineManagerOpen && (
        <RoutineManagerModal
          isOpen={routineManagerOpen}
          onClose={onCloseRoutineManager}
          routines={profileCareRoutines}
          stages={stages}
          activeStageId={activeStageId}
          onSaveRoutine={onSaveRoutine}
          onDeleteRoutine={onDeleteRoutine}
        />
      )}
    </>
  );
}

export default AppModalsHost;
