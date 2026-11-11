'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  AppointmentInfo,
  BpThresholds,
  CareRoutine,
  DailyLog,
  FamilyMember,
  HealthProfile,
  LabResultEntry,
  PatientDailyReminder,
  PatientInfo,
  VitalsLogEntry,
} from '@/lib/types';
import {
  DEFAULT_HEALTH_PROFILE_ID,
  DEFAULT_RECORDER,
  buildResolvedHealthProfiles,
  compareVitalsDesc,
  computeAlertLevel,
  extractRecordProfileId,
} from '@/lib/config';
import {
  isSeniorFriendlyProfile,
  syncSeniorTextModeForProfile,
} from '@/lib/adaptiveProfileConfig';
import { saveMemberAction, savePatientInfoAction } from '@/lib/actions';
import type { SyncStateKind } from '@/components/ui-kit';
import {
  buildNewHealthProfileFromMember,
  computeNameInitials,
  createFamilyMemberFromProfile,
  mergeUpdatedProfileIntoRootInfo,
  stripNestedProfiles,
} from './profileSyncUtils';

interface UseHealthProfileManagerParams {
  patientInfo: PatientInfo;
  setPatientInfo: React.Dispatch<React.SetStateAction<PatientInfo>>;
  bpThresholds: BpThresholds;
  setBpThresholds: React.Dispatch<React.SetStateAction<BpThresholds>>;
  appointment: AppointmentInfo;
  setAppointment: React.Dispatch<React.SetStateAction<AppointmentInfo>>;
  members: FamilyMember[];
  setMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
  vitalsLog: VitalsLogEntry[];
  careRoutines: CareRoutine[];
  dailyLogs: DailyLog[];
  reminders: PatientDailyReminder[];
  labResults: LabResultEntry[];
  activeStageId: string;
  todayStr: string;
  setSyncStatus: React.Dispatch<React.SetStateAction<SyncStateKind>>;
  showToast: (message: string, type?: 'info' | 'success' | 'warn') => void;
}

/**
 * Hook quản lý Đa Hồ Sơ Sức Khỏe Gia Đình (phân tách dữ liệu theo tiền tố `p_<profileId>__`
 * và đồng bộ 2 chiều với danh sách Thành viên gia đình).
 */
export function useHealthProfileManager({
  patientInfo,
  setPatientInfo,
  bpThresholds,
  setBpThresholds,
  appointment,
  setAppointment,
  members,
  setMembers,
  vitalsLog,
  careRoutines,
  dailyLogs,
  reminders,
  labResults,
  activeStageId,
  todayStr,
  setSyncStatus,
  showToast,
}: UseHealthProfileManagerParams) {
  const [activeProfileId, setActiveProfileId] = useState<string>(DEFAULT_HEALTH_PROFILE_ID);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('care_app_member_id');
        const savedProfileId = localStorage.getItem('care_active_profile_id');
        if (savedProfileId) {
          setActiveProfileId(savedProfileId);
        }
      }
    } catch {
      // Bỏ qua lỗi đọc localStorage
    }
  }, []);

  const healthProfiles = useMemo(
    () => buildResolvedHealthProfiles(patientInfo, bpThresholds, appointment, members),
    [patientInfo, bpThresholds, appointment, members]
  );

  const activeProfile = useMemo(
    () => healthProfiles.find((p) => p.id === activeProfileId) || healthProfiles[0],
    [healthProfiles, activeProfileId]
  );

  useEffect(() => {
    syncSeniorTextModeForProfile(isSeniorFriendlyProfile(activeProfile));
  }, [activeProfile]);

  const isFatherProfile = activeProfile.id === DEFAULT_HEALTH_PROFILE_ID;
  const profilePatientInfo = activeProfile.patientInfo;
  const profileBpThresholds = activeProfile.bpThresholds;
  const profileAppointment = activeProfile.appointment;

  const patientDisplayName = useMemo(
    () => activeProfile.relation || activeProfile.name || 'Gia đình',
    [activeProfile.relation, activeProfile.name]
  );

  const profileVitalsLog = useMemo(
    () =>
      vitalsLog
        .filter((v) => extractRecordProfileId(v.id) === activeProfile.id)
        .map((v) => ({
          ...v,
          alertLevel: computeAlertLevel(v.sys, v.dia, profileBpThresholds, v.pulse),
        })),
    [vitalsLog, activeProfile.id, profileBpThresholds]
  );

  const profileCareRoutines = useMemo(
    () => careRoutines.filter((r) => extractRecordProfileId(r.id) === activeProfile.id),
    [careRoutines, activeProfile.id]
  );

  const profileDailyLogs = useMemo(
    () =>
      dailyLogs.filter(
        (l) => extractRecordProfileId(l.routineId || l.id) === activeProfile.id
      ),
    [dailyLogs, activeProfile.id]
  );

  const profileReminders = useMemo(
    () => reminders.filter((rem) => extractRecordProfileId(rem.id) === activeProfile.id),
    [reminders, activeProfile.id]
  );

  const profileLabResults = useMemo(
    () => labResults.filter((lab) => extractRecordProfileId(lab.id) === activeProfile.id),
    [labResults, activeProfile.id]
  );

  const activeRoutines = useMemo(
    () =>
      profileCareRoutines.filter(
        (r) => r.isActive && (!r.stageId || r.stageId === activeStageId)
      ),
    [profileCareRoutines, activeStageId]
  );

  const todayDailyLogs = useMemo(
    () => profileDailyLogs.filter((l) => l.date === todayStr),
    [profileDailyLogs, todayStr]
  );

  const lastVitalsEntry = useMemo(() => {
    if (profileVitalsLog.length === 0) return null;
    return [...profileVitalsLog].sort(compareVitalsDesc)[0] || null;
  }, [profileVitalsLog]);

  const routinePendingTodayCount = useMemo(() => {
    const scheduled = activeRoutines.filter((r) => r.medType !== 'as_needed');
    const total = scheduled.reduce(
      (sum, r) => sum + (Array.isArray(r.timeSlots) ? r.timeSlots.length : 0),
      0
    );
    const ids = new Set(scheduled.map((r) => r.id));
    const done = Math.min(
      total,
      todayDailyLogs.filter((l) => l.isDone && ids.has(l.routineId)).length
    );
    return Math.max(0, total - done);
  }, [activeRoutines, todayDailyLogs]);

  const recorderName = useMemo(() => {
    if (members.length === 0) return DEFAULT_RECORDER;
    if (!isFatherProfile) {
      const matchedSelf = members.find(
        (m) =>
          m.name.toLowerCase() === activeProfile.name.toLowerCase() ||
          (activeProfile.relation &&
            m.relation.toLowerCase() === activeProfile.relation.toLowerCase())
      );
      if (matchedSelf) return matchedSelf.name;
    }
    const motherMember = members.find(
      (m) =>
        m.name.toLowerCase().includes('mẹ') ||
        m.relation.toLowerCase().includes('vợ') ||
        m.relation.toLowerCase().includes('mẹ')
    );
    return motherMember ? motherMember.name : members[0].name;
  }, [members, isFatherProfile, activeProfile.name, activeProfile.relation]);

  const persistSelectedProfileId = useCallback((profileId: string) => {
    setActiveProfileId(profileId);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('care_active_profile_id', profileId);
      }
    } catch {
      // Bỏ qua lỗi lưu localStorage
    }
  }, []);

  const handleSelectProfile = useCallback(
    (profileId: string) => {
      persistSelectedProfileId(profileId);
      const target = healthProfiles.find((p) => p.id === profileId);
      if (target) {
        showToast(
          `👤 Đang xem sổ sức khỏe: ${target.relation ? `${target.relation} · ` : ''}${target.name}`,
          'info'
        );
      }
    },
    [healthProfiles, persistSelectedProfileId, showToast]
  );

  const syncRootPatientInfo = useCallback(
    (nextInfo: PatientInfo, toastMsg?: string) => {
      setPatientInfo(nextInfo);
      if (toastMsg) showToast(toastMsg, 'success');
      setSyncStatus('syncing');
      void savePatientInfoAction(nextInfo)
        .then((res) => {
          setSyncStatus(res.success ? 'synced' : 'error');
          if (!res.success) {
            showToast('Cảnh báo: Chưa đồng bộ được hồ sơ lên Sheet.', 'warn');
          }
        })
        .catch(() => {
          setSyncStatus('error');
          showToast('Lỗi đồng bộ hồ sơ sức khỏe lên Google Sheets.', 'warn');
        });
    },
    [setPatientInfo, setSyncStatus, showToast]
  );

  const handleSaveHealthProfile = useCallback(
    async (savedProfile: HealthProfile) => {
      const matchedMember =
        members.find(
          (m) => savedProfile.linkedMemberId && m.id === savedProfile.linkedMemberId
        ) ||
        members.find(
          (m) => m.name.trim().toLowerCase() === savedProfile.name.trim().toLowerCase()
        );

      let resolvedLinkedMemberId = savedProfile.linkedMemberId;
      if (matchedMember) {
        resolvedLinkedMemberId = matchedMember.id;
        if (
          matchedMember.name !== savedProfile.name.trim() ||
          (savedProfile.relation && matchedMember.relation !== savedProfile.relation.trim())
        ) {
          const updatedMember: FamilyMember = {
            ...matchedMember,
            name: savedProfile.name.trim(),
            relation: savedProfile.relation.trim() || matchedMember.relation,
            avatarInitials: computeNameInitials(savedProfile.name),
          };
          setMembers((prev) =>
            prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
          );
          void saveMemberAction(updatedMember).catch(() => {});
        }
      } else if (savedProfile.name.trim()) {
        const newMem = createFamilyMemberFromProfile(savedProfile);
        resolvedLinkedMemberId = newMem.id;
        setMembers((prev) =>
          prev.some((m) => m.id === newMem.id)
            ? prev.map((m) => (m.id === newMem.id ? newMem : m))
            : [...prev, newMem]
        );
        void saveMemberAction(newMem).catch(() => {});
      }

      const cleanProfile: HealthProfile = {
        ...savedProfile,
        linkedMemberId: resolvedLinkedMemberId,
      };

      const nextRootInfo = mergeUpdatedProfileIntoRootInfo(
        patientInfo,
        healthProfiles,
        cleanProfile
      );

      if (cleanProfile.id === DEFAULT_HEALTH_PROFILE_ID) {
        setBpThresholds(cleanProfile.bpThresholds);
        setAppointment(cleanProfile.appointment);
      } else {
        persistSelectedProfileId(cleanProfile.id);
      }

      syncRootPatientInfo(
        nextRootInfo,
        `✅ Đã lưu hồ sơ sức khỏe: ${cleanProfile.relation ? `${cleanProfile.relation} · ` : ''}${cleanProfile.name}`
      );
    },
    [
      healthProfiles,
      members,
      patientInfo,
      persistSelectedProfileId,
      setAppointment,
      setBpThresholds,
      setMembers,
      syncRootPatientInfo,
    ]
  );

  const handleDeleteHealthProfile = useCallback(
    async (profileId: string) => {
      if (healthProfiles.length <= 1) {
        showToast('⚠️ Cần giữ lại ít nhất 1 thành viên trong Sổ Sức Khỏe.', 'warn');
        return;
      }
      const target = healthProfiles.find((p) => p.id === profileId);
      const nextAll = healthProfiles
        .filter((p) => p.id !== profileId)
        .map(stripNestedProfiles);
      const firstRemaining = nextAll[0];
      const nextRootInfo: PatientInfo = {
        ...patientInfo,
        ...(profileId === DEFAULT_HEALTH_PROFILE_ID && firstRemaining
          ? {
              ...firstRemaining.patientInfo,
              name: firstRemaining.name,
            }
          : {}),
        healthProfiles: nextAll,
      };
      if (activeProfileId === profileId && firstRemaining) {
        persistSelectedProfileId(firstRemaining.id);
      }
      syncRootPatientInfo(
        nextRootInfo,
        `🗑️ Đã xóa thành viên "${target?.name || profileId}" khỏi Sổ Sức Khỏe`
      );
    },
    [
      healthProfiles,
      patientInfo,
      activeProfileId,
      persistSelectedProfileId,
      syncRootPatientInfo,
      showToast,
    ]
  );

  const persistActiveProfilePatientInfo = useCallback(
    (newInfo: PatientInfo, toastMsg: string) => {
      const updatedProfile: HealthProfile = {
        ...activeProfile,
        name: newInfo.name || activeProfile.name,
        patientInfo: { ...newInfo, healthProfiles: undefined },
      };
      const nextRoot = mergeUpdatedProfileIntoRootInfo(
        patientInfo,
        healthProfiles,
        updatedProfile
      );
      syncRootPatientInfo(nextRoot, toastMsg);
    },
    [activeProfile, healthProfiles, patientInfo, syncRootPatientInfo]
  );

  const syncProfilesIntoMembersList = useCallback(() => {
    setMembers((prev) => {
      const next = [...prev];
      let addedAny = false;
      for (const hp of healthProfiles) {
        const exists = next.some(
          (m) =>
            (hp.linkedMemberId && m.id === hp.linkedMemberId) ||
            m.name.trim().toLowerCase() === hp.name.trim().toLowerCase()
        );
        if (!exists && hp.name.trim()) {
          const syncedMem = createFamilyMemberFromProfile(hp);
          next.unshift(syncedMem);
          addedAny = true;
          void saveMemberAction(syncedMem).catch(() => {});
        }
      }
      return addedAny ? next : prev;
    });
  }, [healthProfiles, setMembers]);

  const handleMembersUpdated = useCallback(
    (updatedMembers: FamilyMember[]) => {
      setMembers(updatedMembers);
      let profileChanged = false;
      const updatedProfiles = healthProfiles.map((hp) => {
        const matched = updatedMembers.find(
          (m) =>
            (hp.linkedMemberId && m.id === hp.linkedMemberId) ||
            m.name.trim().toLowerCase() === hp.name.trim().toLowerCase()
        );
        if (
          matched &&
          (hp.name !== matched.name ||
            hp.relation !== matched.relation ||
            hp.linkedMemberId !== matched.id)
        ) {
          profileChanged = true;
          return stripNestedProfiles({
            ...hp,
            name: matched.name,
            relation: matched.relation || hp.relation,
            linkedMemberId: matched.id,
            patientInfo: { ...hp.patientInfo, name: matched.name },
          });
        }
        return stripNestedProfiles(hp);
      });

      if (profileChanged) {
        const primaryUpdated = updatedProfiles.find(
          (p) => p.id === DEFAULT_HEALTH_PROFILE_ID
        );
        syncRootPatientInfo({
          ...patientInfo,
          name: primaryUpdated?.name || patientInfo.name,
          healthProfiles: updatedProfiles,
        });
      }
      showToast('Đã cập nhật danh sách thành viên gia đình!', 'success');
    },
    [healthProfiles, patientInfo, setMembers, syncRootPatientInfo, showToast]
  );

  const handleToggleMemberHealthProfile = useCallback(
    (member: FamilyMember, shouldHaveProfile: boolean) => {
      const existingProfile = healthProfiles.find(
        (p) =>
          (p.linkedMemberId && p.linkedMemberId === member.id) ||
          p.name.trim().toLowerCase() === member.name.trim().toLowerCase()
      );

      if (shouldHaveProfile) {
        if (existingProfile) {
          void handleSaveHealthProfile({
            ...existingProfile,
            name: member.name,
            relation: member.relation || existingProfile.relation,
            linkedMemberId: member.id,
          });
          return;
        }
        void handleSaveHealthProfile(buildNewHealthProfileFromMember(member));
      } else if (existingProfile) {
        void handleDeleteHealthProfile(existingProfile.id);
      }
    },
    [healthProfiles, handleSaveHealthProfile, handleDeleteHealthProfile]
  );

  return {
    activeProfileId,
    healthProfiles,
    activeProfile,
    isFatherProfile,
    profilePatientInfo,
    profileBpThresholds,
    profileAppointment,
    patientDisplayName,
    recorderName,
    profileVitalsLog,
    profileCareRoutines,
    profileDailyLogs,
    profileReminders,
    profileLabResults,
    activeRoutines,
    todayDailyLogs,
    lastVitalsEntry,
    routinePendingTodayCount,
    handleSelectProfile,
    syncRootPatientInfo,
    handleSaveHealthProfile,
    handleDeleteHealthProfile,
    persistActiveProfilePatientInfo,
    syncProfilesIntoMembersList,
    handleMembersUpdated,
    handleToggleMemberHealthProfile,
  };
}
