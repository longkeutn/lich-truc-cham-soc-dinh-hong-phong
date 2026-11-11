'use client';

import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, ShieldCheck, ArrowLeft } from 'lucide-react';
import PatientBanner from '@/components/PatientBanner';
import QuickVitalsForm from '@/components/QuickVitalsForm';
import DailyRoutineView from '@/components/DailyRoutineView';
import { AppointmentSection } from '@/components/AppointmentSection';
import SmartReminderBanner from '@/components/SmartReminderBanner';
import { AdaptiveProfileModeBanner } from '@/components/today-dashboard';
import type { LabSubView } from '@/components/medical-records/labRecordsUtils';
import {
  AppHeaderBar,
  MobileBottomNav,
  TabViewPanel,
  AppModalsHost,
} from '@/components/navigation';
import { FamilyManagementHub } from '@/components/family-management/FamilyManagementHub';
import { MedicalSkeletonLoader } from '@/components/ui-kit';
import type { PatientInfo } from '@/lib/types';
import { APP_SHORT_TITLE } from '@/lib/config';
import { verifyExpensePinAction, changeExpensePinAction } from '@/lib/actions';
import { useCareDataSync } from '@/hooks/useCareDataSync';
import { useHealthProfileManager } from '@/hooks/useHealthProfileManager';
import { useCareCrudHandlers } from '@/hooks/useCareCrudHandlers';
import { useCareUiController } from '@/hooks/useCareUiController';

const VitalsChartView = dynamic(
  () => import('@/components/VitalsChartView').then((m) => m.VitalsChartView),
  {
    loading: () => (
      <MedicalSkeletonLoader
        variant="full-analytics"
        label="Đang mở biểu đồ xu hướng huyết áp..."
      />
    ),
  }
);

const LabResultsView = dynamic(() => import('@/components/LabResultsView'), {
  loading: () => (
    <MedicalSkeletonLoader
      variant="lab-grid"
      label="Đang mở Sổ Xét Nghiệm và Hóa Sinh..."
    />
  ),
});

const ExpenseTrackerView = dynamic(() => import('@/components/ExpenseTrackerView'), {
  loading: () => (
    <MedicalSkeletonLoader
      variant="checklist"
      rows={4}
      label="Đang mở Sổ Thu Chi Y Tế..."
    />
  ),
});

const StandaloneDoctorReportModal = dynamic(
  () => import('@/components/vitals-analytics/StandaloneDoctorReportModal')
);

export default function CareSchedulePage() {
  const ui = useCareUiController();
  const sync = useCareDataSync({ showToast: ui.showToast });
  const [labsInitialSubView, setLabsInitialSubView] = useState<LabSubView | undefined>(undefined);
  const [doctorReportOpen, setDoctorReportOpen] = useState<boolean>(false);

  const profilesMgr = useHealthProfileManager({
    patientInfo: sync.patientInfo,
    setPatientInfo: sync.setPatientInfo,
    bpThresholds: sync.bpThresholds,
    setBpThresholds: sync.setBpThresholds,
    appointment: sync.appointment,
    setAppointment: sync.setAppointment,
    members: sync.members,
    setMembers: sync.setMembers,
    vitalsLog: sync.vitalsLog,
    careRoutines: sync.careRoutines,
    dailyLogs: sync.dailyLogs,
    reminders: sync.reminders,
    labResults: sync.labResults,
    activeStageId: sync.activeStageId,
    todayStr: sync.todayStr,
    setSyncStatus: sync.setSyncStatus,
    showToast: ui.showToast,
  });

  const crud = useCareCrudHandlers({
    activeProfile: profilesMgr.activeProfile,
    isFatherProfile: profilesMgr.isFatherProfile,
    healthProfiles: profilesMgr.healthProfiles,
    patientInfo: sync.patientInfo,
    setPatientInfo: sync.setPatientInfo,
    profileBpThresholds: profilesMgr.profileBpThresholds,
    patientDisplayName: profilesMgr.patientDisplayName,
    vitalsLog: sync.vitalsLog,
    setVitalsLog: sync.setVitalsLog,
    careRoutines: sync.careRoutines,
    setCareRoutines: sync.setCareRoutines,
    setDailyLogs: sync.setDailyLogs,
    stages: sync.stages,
    activeStageId: sync.activeStageId,
    labResults: sync.labResults,
    setLabResults: sync.setLabResults,
    setAppointment: sync.setAppointment,
    setReminders: sync.setReminders,
    setContacts: sync.setContacts,
    setExpenses: sync.setExpenses,
    setShifts: sync.setShifts,
    todayStrRef: sync.todayStrRef,
    setTodayStr: sync.setTodayStr,
    notificationPrefs: ui.notificationPrefs,
    requireAdmin: ui.requireAdmin,
    syncRootPatientInfo: profilesMgr.syncRootPatientInfo,
    setSyncStatus: sync.setSyncStatus,
    showToast: ui.showToast,
  });

  const handleOpenEditPatient = useCallback(() => {
    ui.requireAdmin(() => ui.setEditPatientModalOpen(true));
  }, [ui]);

  const handlePatientUpdated = useCallback(
    (newInfo: PatientInfo) => {
      profilesMgr.persistActiveProfilePatientInfo(
        newInfo,
        `Đã cập nhật hồ sơ ${profilesMgr.patientDisplayName}!`
      );
    },
    [profilesMgr]
  );

  const handleInlineSavePatient = useCallback(
    (newInfo: PatientInfo) => {
      ui.requireAdmin(() => {
        profilesMgr.persistActiveProfilePatientInfo(
          newInfo,
          `Đã lưu thông tin ${profilesMgr.patientDisplayName}!`
        );
      });
    },
    [ui, profilesMgr]
  );

  const handleOpenMembers = useCallback(() => {
    profilesMgr.syncProfilesIntoMembersList();
    ui.setMembersModalOpen(true);
  }, [profilesMgr, ui]);

  const handleOpenRoutineManager = useCallback(() => {
    ui.requireAdmin(() => ui.setRoutineManagerOpen(true));
  }, [ui]);

  return (
    <div className="min-h-screen bg-surface-bg text-text-main flex flex-col selection:bg-medical-primary selection:text-white">
      {ui.notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl bg-surface-card border border-slate-300 shadow-2xl text-text-main text-sm font-extrabold flex items-center gap-2.5 max-w-[92vw] transition-all duration-300"
        >
          {ui.notification.type === 'warn' ? (
            <AlertTriangle className="w-5 h-5 text-vital-warning shrink-0" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-vital-safe shrink-0" />
          )}
          <span className="truncate">{ui.notification.message}</span>
        </div>
      )}

      <AppHeaderBar
        activeView={ui.activeView}
        onChangeView={ui.handleChangeView}
        profiles={profilesMgr.healthProfiles}
        activeProfileId={profilesMgr.activeProfile.id}
        onSelectProfile={profilesMgr.handleSelectProfile}
        onOpenAddProfile={() => ui.openProfileModal('add', null)}
        onOpenEditProfile={(prof) => ui.openProfileModal('edit', prof)}
        onOpenProfileList={() => ui.openProfileModal('list', null)}
        onOpenMembers={handleOpenMembers}
        onOpenEmergencyContacts={() => ui.setEmergencyModalOpen(true)}
        patientInfo={profilesMgr.profilePatientInfo}
        allVitalsLog={sync.vitalsLog}
        todayStr={sync.todayStr}
        syncStatus={sync.syncStatus}
        onRefreshData={() => void sync.loadAllData(true)}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 pt-3 pb-28 md:pb-8 sm:px-5 sm:pt-4 space-y-4">
        {!sync.hasInitialLoaded && sync.isLoading && (
          <MedicalSkeletonLoader
            variant="checklist"
            rows={3}
            label="Đang đồng bộ dữ liệu thực tế từ Google Sheets..."
          />
        )}

        {/* TAB 1: HÔM NAY (Chế độ thích ứng theo Profile -> Nhắc việc -> Đo HA -> Checklist -> Tái khám) */}
        <TabViewPanel isActive={ui.activeView === 'today'} className="space-y-4">
          <AdaptiveProfileModeBanner
            activeProfile={profilesMgr.activeProfile}
            activeRoutines={profilesMgr.activeRoutines}
            dailyLogs={profilesMgr.profileDailyLogs}
            labResults={profilesMgr.profileLabResults}
            todayStr={sync.todayStr}
            recorderName={profilesMgr.recorderName}
            onToggleDailyLog={crud.handleToggleDailyLog}
            onOpenDoctorReport={() => setDoctorReportOpen(true)}
            onJumpToGrowth={() => {
              setLabsInitialSubView('growth');
              ui.handleChangeView('labs');
            }}
            onJumpToVaccine={() => {
              setLabsInitialSubView('vaccine');
              ui.handleChangeView('labs');
            }}
          />

          <SmartReminderBanner
            vitalsLog={profilesMgr.profileVitalsLog}
            bpThresholds={profilesMgr.profileBpThresholds}
            activeRoutines={profilesMgr.activeRoutines}
            dailyLogs={profilesMgr.profileDailyLogs}
            appointment={profilesMgr.profileAppointment}
            todayStr={sync.todayStr}
            defaultRecorder={profilesMgr.recorderName}
            prefs={ui.notificationPrefs}
            hasInitialLoaded={sync.hasInitialLoaded}
            patientDisplayName={profilesMgr.patientDisplayName}
            onToggleDailyLog={crud.handleToggleDailyLog}
            onOpenSettings={() => ui.setNotifSettingsModalOpen(true)}
            showToast={ui.showToast}
          />

          <section id="section-vitals" aria-label="Đo huyết áp và sinh hiệu nhanh">
            <QuickVitalsForm
              onSave={crud.handleSaveVitals}
              lastEntry={profilesMgr.lastVitalsEntry}
              bpThresholds={profilesMgr.profileBpThresholds}
              defaultRecorder={profilesMgr.recorderName}
              members={sync.members}
              todayStr={sync.todayStr}
              profileType={profilesMgr.activeProfile.profileType}
              patientDisplayName={profilesMgr.patientDisplayName}
            />
          </section>

          <section id="section-routine" aria-label="Danh sách thuốc và bài tập hôm nay">
            <DailyRoutineView
              routines={profilesMgr.activeRoutines}
              dailyLogs={profilesMgr.profileDailyLogs}
              todayStr={sync.todayStr}
              onToggle={crud.handleToggleDailyLog}
              onOpenManager={handleOpenRoutineManager}
              onApplyPresetRoutines={crud.handleApplyPresetRoutines}
              defaultRecorder={profilesMgr.recorderName}
              patientDisplayName={profilesMgr.patientDisplayName}
            />
          </section>

          <section id="section-appointment" aria-label="Lịch tái khám và lời dặn bác sĩ">
            <AppointmentSection
              appointment={profilesMgr.profileAppointment}
              onSave={crud.handleSaveAppointment}
              isAdmin={ui.isAdmin}
              todayStr={sync.todayStr}
              profileType={profilesMgr.activeProfile.profileType}
              patientDisplayName={profilesMgr.patientDisplayName}
            />
          </section>

          <PatientBanner
            patientInfo={profilesMgr.profilePatientInfo}
            profileType={profilesMgr.activeProfile.profileType}
            patientDisplayName={profilesMgr.patientDisplayName}
            reminders={profilesMgr.profileReminders}
            members={sync.members}
            onAddReminder={crud.handleAddReminder}
            onDeleteReminder={crud.handleDeleteReminder}
            onEditPatient={handleOpenEditPatient}
            onSavePatient={handleInlineSavePatient}
            onRefresh={() => void sync.loadAllData(true)}
            isLoading={sync.isLoading}
          />
        </TabViewPanel>

        {/* TAB 2: XU HƯỚNG */}
        {ui.visitedViews.charts && (
          <TabViewPanel isActive={ui.activeView === 'charts'}>
            <VitalsChartView
              vitalsLog={profilesMgr.profileVitalsLog}
              bpThresholds={profilesMgr.profileBpThresholds}
              dailyLogs={profilesMgr.profileDailyLogs}
              careRoutines={profilesMgr.profileCareRoutines}
              isAdmin={ui.isAdmin}
              members={sync.members}
              patientName={profilesMgr.profilePatientInfo.name}
              patientDiagnosis={profilesMgr.profilePatientInfo.diagnosis}
              profileType={profilesMgr.activeProfile.profileType}
              showToast={ui.showToast}
              onDeleteVitals={crud.handleDeleteVitals}
              onSaveVitals={crud.handleSaveVitals}
              onToggleDailyLog={crud.handleToggleDailyLog}
              defaultRecorder={profilesMgr.recorderName}
            />
          </TabViewPanel>
        )}

        {/* TAB 3: XÉT NGHIỆM & HỒ SƠ Y TẾ */}
        {ui.visitedViews.labs && (
          <TabViewPanel isActive={ui.activeView === 'labs'}>
            <LabResultsView
              labResults={profilesMgr.profileLabResults}
              vitalsLog={profilesMgr.profileVitalsLog}
              profileId={profilesMgr.activeProfile.id}
              profileType={profilesMgr.activeProfile.profileType}
              patientName={profilesMgr.profilePatientInfo.name}
              patientDisplayName={profilesMgr.patientDisplayName}
              patientDiagnosis={profilesMgr.profilePatientInfo.diagnosis}
              patientInfo={profilesMgr.profilePatientInfo}
              onUpdatePatientInfo={handlePatientUpdated}
              initialSubView={labsInitialSubView}
              todayStr={sync.todayStr}
              defaultRecorder={profilesMgr.recorderName}
              members={sync.members}
              onSaveLabResult={crud.handleSaveLabResult}
              onDeleteLabResult={crud.handleDeleteLabResult}
              showToast={ui.showToast}
              appointment={profilesMgr.profileAppointment}
              onSaveAppointment={crud.handleSaveAppointment}
              isAdmin={ui.isAdmin}
            />
          </TabViewPanel>
        )}

        {/* TAB 4: GIA ĐÌNH & QUẢN TRỊ */}
        {ui.visitedViews.family && (
          <TabViewPanel isActive={ui.activeView === 'family'}>
            <FamilyManagementHub
              profiles={profilesMgr.healthProfiles}
              activeProfile={profilesMgr.activeProfile}
              members={sync.members}
              contacts={sync.contacts}
              shifts={sync.shifts}
              expensesCount={sync.expenses.length}
              todayStr={sync.todayStr}
              isLoading={sync.isLoading}
              isAdmin={ui.isAdmin}
              isExpenseUnlocked={ui.isExpenseUnlocked}
              onSelectProfile={profilesMgr.handleSelectProfile}
              onOpenProfileList={() => ui.openProfileModal('list', null)}
              onOpenAddProfile={() => ui.openProfileModal('add', null)}
              onOpenMembers={handleOpenMembers}
              onEditPatient={handleOpenEditPatient}
              onOpenRoutineManager={handleOpenRoutineManager}
              onOpenExpenses={() => ui.handleChangeView('expenses')}
              onOpenEmergencyContacts={() => ui.setEmergencyModalOpen(true)}
              onOpenNotificationSettings={() => ui.setNotifSettingsModalOpen(true)}
              onOpenInstallApp={() => ui.setInstallPwaModalOpen(true)}
              onOpenAdminPin={ui.openAdminPinUnlock}
              onOpenGuide={ui.handleOpenGuide}
              onRefreshData={() => void sync.loadAllData(true)}
              onSaveShift={crud.handleSaveShift}
            />
          </TabViewPanel>
        )}

        {/* PHÂN KHU CON: SỔ THU CHI Y TẾ */}
        {ui.visitedViews.expenses && (
          <TabViewPanel isActive={ui.activeView === 'expenses'} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => ui.handleChangeView('family')}
                className="min-h-[48px] min-w-[48px] px-4 py-2 rounded-xl bg-surface-card hover:bg-slate-100 text-text-body border border-border-card text-sm font-extrabold inline-flex items-center gap-2 shadow-2xs transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Quay lại Tab Gia Đình</span>
              </button>
            </div>
            <ExpenseTrackerView
              expenses={sync.expenses}
              members={sync.members}
              patientName={sync.patientInfo.name}
              isUnlocked={ui.isExpenseUnlocked}
              onUnlockSuccess={ui.handleUnlockExpenseSuccess}
              onLock={ui.handleLockExpense}
              onVerifyPin={verifyExpensePinAction}
              onChangePin={changeExpensePinAction}
              onSaveExpense={crud.handleSaveExpense}
              onDeleteExpense={crud.handleDeleteExpense}
              showToast={ui.showToast}
              onBackToHealth={() => ui.handleChangeView('family')}
            />
          </TabViewPanel>
        )}
      </main>

      <footer className="hidden md:block border-t border-border-card bg-surface-card py-4 px-4 text-center text-xs text-text-muted">
        <p className="font-bold text-text-body">
          {APP_SHORT_TITLE} · Đang xem: {profilesMgr.activeProfile.avatarEmoji}{' '}
          {profilesMgr.profilePatientInfo.name} · Đồng bộ Google Sheets an toàn
        </p>
      </footer>

      <MobileBottomNav
        activeView={ui.activeView}
        onChangeView={ui.handleChangeView}
        todayPendingCount={profilesMgr.routinePendingTodayCount}
        isAdminUnlocked={ui.isAdmin || ui.isExpenseUnlocked}
      />

      {doctorReportOpen && (
        <StandaloneDoctorReportModal
          isOpen={doctorReportOpen}
          onClose={() => setDoctorReportOpen(false)}
          vitalsLog={profilesMgr.profileVitalsLog}
          bpThresholds={profilesMgr.profileBpThresholds}
          dailyLogs={profilesMgr.profileDailyLogs}
          careRoutines={profilesMgr.profileCareRoutines}
          patientName={profilesMgr.profilePatientInfo.name}
          patientDiagnosis={profilesMgr.profilePatientInfo.diagnosis}
          profileType={profilesMgr.activeProfile.profileType}
          showToast={ui.showToast}
        />
      )}

      <AppModalsHost
        profileModalMode={ui.profileModalMode}
        editingProfileTarget={ui.editingProfileTarget}
        onCloseProfileModal={() => ui.openProfileModal('closed', null)}
        healthProfiles={profilesMgr.healthProfiles}
        activeProfileId={profilesMgr.activeProfile.id}
        vitalsLog={sync.vitalsLog}
        todayStr={sync.todayStr}
        members={sync.members}
        onSelectProfile={profilesMgr.handleSelectProfile}
        onSaveProfile={profilesMgr.handleSaveHealthProfile}
        onDeleteProfile={profilesMgr.handleDeleteHealthProfile}
        installPwaModalOpen={ui.installPwaModalOpen}
        onCloseInstallPwa={() => ui.setInstallPwaModalOpen(false)}
        onOpenInstallPwa={() => ui.setInstallPwaModalOpen(true)}
        notifSettingsModalOpen={ui.notifSettingsModalOpen}
        onCloseNotifSettings={() => ui.setNotifSettingsModalOpen(false)}
        notificationPrefs={ui.notificationPrefs}
        onSaveNotificationPrefs={ui.handleSaveNotificationPrefs}
        guideModalOpen={ui.guideModalOpen}
        onCloseGuide={() => ui.setGuideModalOpen(false)}
        onOpenGuideDirect={() => ui.setGuideModalOpen(true)}
        isSheetsConnected={Boolean(sync.settings?.googleSheetsConnected)}
        emergencyModalOpen={ui.emergencyModalOpen}
        onCloseEmergency={() => ui.setEmergencyModalOpen(false)}
        contacts={sync.contacts}
        profilePatientInfo={profilesMgr.profilePatientInfo}
        onSaveContact={crud.handleSaveContact}
        onDeleteContact={crud.handleDeleteContact}
        adminPinModalOpen={ui.adminPinModalOpen}
        adminPinModalMode={ui.adminPinModalMode}
        onCloseAdminPin={ui.closeAdminPinModal}
        onAdminPinSuccess={ui.handleAdminPinSuccess}
        onUnlockExpenseSuccess={ui.handleUnlockExpenseSuccess}
        isAdmin={ui.isAdmin}
        isExpenseUnlocked={ui.isExpenseUnlocked}
        onLockAdmin={ui.handleLockAdmin}
        onOpenExpensesView={() => ui.handleChangeView('expenses')}
        editPatientModalOpen={ui.editPatientModalOpen}
        onCloseEditPatient={() => ui.setEditPatientModalOpen(false)}
        onPatientUpdated={handlePatientUpdated}
        membersModalOpen={ui.membersModalOpen}
        onOpenMembers={handleOpenMembers}
        onCloseMembers={() => ui.setMembersModalOpen(false)}
        onMembersUpdated={profilesMgr.handleMembersUpdated}
        onToggleMemberHealthProfile={profilesMgr.handleToggleMemberHealthProfile}
        routineManagerOpen={ui.routineManagerOpen}
        onCloseRoutineManager={() => ui.setRoutineManagerOpen(false)}
        profileCareRoutines={profilesMgr.profileCareRoutines}
        stages={sync.stages}
        activeStageId={sync.activeStageId}
        onSaveRoutine={crud.handleSaveRoutine}
        onDeleteRoutine={crud.handleDeleteRoutine}
        showToast={ui.showToast}
      />
    </div>
  );
}
