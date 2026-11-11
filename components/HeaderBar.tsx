'use client';

import React from 'react';
import type { HealthProfile, PatientInfo, VitalsLogEntry } from '@/lib/types';
import type { SyncStateKind } from '@/components/ui-kit';
import { AppHeaderBar } from './navigation/AppHeaderBar';
import { MobileBottomNav } from './navigation/MobileBottomNav';
import type { AppView } from './navigation/navigationTypes';

export type { AppView };

export interface HeaderBarProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  onOpenEmergencyContacts: () => void;
  onOpenGuide?: () => void;
  onOpenInstallApp?: () => void;
  onOpenNotificationSettings?: () => void;
  patientInfo?: PatientInfo;
  profiles?: HealthProfile[];
  activeProfileId?: string;
  allVitalsLog?: VitalsLogEntry[];
  todayStr?: string;
  syncStatus?: SyncStateKind;
  todayPendingCount?: number;
  isAdmin?: boolean;
  isExpenseUnlocked?: boolean;
  onSelectProfile?: (profileId: string) => void;
  onOpenAddProfile?: () => void;
  onOpenEditProfile?: (profile: HealthProfile) => void;
  onOpenProfileList?: () => void;
  onOpenAdminPin?: () => void;
  onOpenMembers?: () => void;
  onEditPatient?: () => void;
  onRefreshData?: () => void;
}

/**
 * Wrapper tương thích ngược kết hợp AppHeaderBar và MobileBottomNav 4 tab chuẩn Mobile-First.
 */
export default function HeaderBar({
  activeView,
  onChangeView,
  onOpenEmergencyContacts,
  patientInfo,
  profiles,
  activeProfileId,
  allVitalsLog,
  todayStr,
  syncStatus,
  todayPendingCount = 0,
  isAdmin = false,
  isExpenseUnlocked = false,
  onSelectProfile,
  onOpenAddProfile,
  onOpenEditProfile,
  onOpenProfileList,
  onOpenMembers,
  onRefreshData,
}: HeaderBarProps) {
  return (
    <>
      <AppHeaderBar
        activeView={activeView}
        onChangeView={onChangeView}
        profiles={profiles}
        activeProfileId={activeProfileId}
        onSelectProfile={onSelectProfile}
        onOpenAddProfile={onOpenAddProfile}
        onOpenEditProfile={onOpenEditProfile}
        onOpenProfileList={onOpenProfileList}
        onOpenMembers={onOpenMembers}
        onOpenEmergencyContacts={onOpenEmergencyContacts}
        patientInfo={patientInfo}
        allVitalsLog={allVitalsLog}
        todayStr={todayStr}
        syncStatus={syncStatus}
        onRefreshData={onRefreshData}
      />
      <MobileBottomNav
        activeView={activeView}
        onChangeView={onChangeView}
        todayPendingCount={todayPendingCount}
        isAdminUnlocked={isAdmin || isExpenseUnlocked}
      />
    </>
  );
}
