'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, X } from 'lucide-react';
import type {
  HealthProfile,
  HealthProfileType,
  VitalsLogEntry,
  FamilyMember,
  BpThresholds,
} from '@/lib/types';
import { DEFAULT_APPOINTMENT } from '@/lib/config';
import {
  computeLatestVitalByProfile,
  type ProfileModalMode,
} from './navigationTypes';
import { ProfileFormView } from './ProfileFormView';
import { ProfileListView } from './ProfileListView';

export interface ProfileQuickSwitcherModalProps {
  mode: ProfileModalMode;
  initialProfile?: HealthProfile | null;
  profiles: HealthProfile[];
  activeProfileId: string;
  allVitalsLog: VitalsLogEntry[];
  todayStr: string;
  members?: FamilyMember[];
  onClose: () => void;
  onSelectProfile: (profileId: string) => void;
  onSaveProfile: (profile: HealthProfile) => Promise<void>;
  onDeleteProfile?: (profileId: string) => Promise<void>;
  onOpenMembers?: () => void;
}

/**
 * Modal / Bottom-Sheet quản lý nhanh, chuyển đổi, thêm mới và cài đặt Hồ Sơ Sức Khỏe Gia Đình.
 * Mọi React Hook khai báo nghiêm ngặt phía trên lệnh thoát sớm `if (mode === 'closed') return null;`.
 */
export function ProfileQuickSwitcherModal({
  mode,
  initialProfile = null,
  profiles,
  activeProfileId,
  allVitalsLog,
  todayStr,
  members = [],
  onClose,
  onSelectProfile,
  onSaveProfile,
  onDeleteProfile,
  onOpenMembers,
}: ProfileQuickSwitcherModalProps) {
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingProfileId, setEditingProfileId] = useState<string>('');
  const [linkedMemberId, setLinkedMemberId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [relation, setRelation] = useState<string>('');
  const [avatarEmoji, setAvatarEmoji] = useState<string>('👩');
  const [profileType, setProfileType] = useState<HealthProfileType>('general_health');
  const [birthDate, setBirthDate] = useState<string>('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [hospital, setHospital] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [highSys, setHighSys] = useState<string>('140');
  const [highDia, setHighDia] = useState<string>('90');
  const [lowSys, setLowSys] = useState<string>('100');
  const [lowDia, setLowDia] = useState<string>('60');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const latestVitalByProfile = useMemo(
    () => computeLatestVitalByProfile(profiles, allVitalsLog, todayStr),
    [profiles, allVitalsLog, todayStr]
  );

  const populateAddForm = useCallback(() => {
    setViewMode('add');
    setEditingProfileId('');
    setLinkedMemberId('');
    setName('');
    setRelation('Thành viên gia đình');
    setAvatarEmoji('🧑');
    setProfileType('general_health');
    setBirthDate('');
    setGender('male');
    setDiagnosis('Theo dõi huyết áp, nhịp tim và sức khỏe định kỳ');
    setHospital('Khám định kỳ');
    setNotes('Đo huyết áp sáng/tối, uống đủ nước ấm, nghỉ ngơi hợp lý.');
    setHighSys('140');
    setHighDia('90');
    setLowSys('100');
    setLowDia('60');
  }, []);

  const populateEditForm = useCallback(
    (profile: HealthProfile) => {
      const matchedMember =
        members.find((m) => profile.linkedMemberId && m.id === profile.linkedMemberId) ||
        members.find(
          (m) => m.name.trim().toLowerCase() === profile.name.trim().toLowerCase()
        );
      setViewMode('edit');
      setEditingProfileId(profile.id);
      setLinkedMemberId(matchedMember?.id || profile.linkedMemberId || '');
      setName(profile.name);
      setRelation(profile.relation);
      setAvatarEmoji(profile.avatarEmoji || '👩');
      setProfileType(profile.profileType || 'general_health');
      setBirthDate(profile.patientInfo?.birthDate || '');
      const inferredFemale =
        profile.patientInfo?.gender === 'female' ||
        (!profile.patientInfo?.gender &&
          ['👵', '👩', '👧', '👩‍🦳'].includes(profile.avatarEmoji || ''));
      setGender(inferredFemale ? 'female' : 'male');
      setDiagnosis(profile.patientInfo?.diagnosis || '');
      setHospital(profile.patientInfo?.hospital || '');
      setNotes(profile.patientInfo?.notes || '');
      setHighSys(String(profile.bpThresholds?.highSys || 140));
      setHighDia(String(profile.bpThresholds?.highDia || 90));
      setLowSys(String(profile.bpThresholds?.lowSys || 100));
      setLowDia(String(profile.bpThresholds?.lowDia || 60));
    },
    [members]
  );

  useEffect(() => {
    if (mode === 'closed') return;
    if (mode === 'add') {
      populateAddForm();
    } else if (mode === 'edit' && initialProfile) {
      populateEditForm(initialProfile);
    } else {
      setViewMode('list');
    }
  }, [mode, initialProfile, populateAddForm, populateEditForm]);

  const handleQuickPickMember = useCallback((m: FamilyMember) => {
    setLinkedMemberId(m.id);
    setName(m.name);
    setRelation(m.relation || 'Thành viên');
    const lower = `${m.name} ${m.relation}`.toLowerCase();
    const isPed = lower.includes('con') || lower.includes('bé') || lower.includes('cháu');
    if (isPed) {
      setAvatarEmoji(lower.includes('gái') ? '👧' : '👶');
      setGender(lower.includes('gái') ? 'female' : 'male');
      setProfileType('pediatric');
      setDiagnosis(
        'Theo dõi biểu đồ tăng trưởng chiều cao, cân nặng chuẩn WHO, lịch tiêm chủng và thân nhiệt'
      );
      setNotes(
        'Theo dõi cân nặng, chiều cao hàng tháng, lịch tiêm vắc xin và bổ sung Vitamin D3.'
      );
      setHighSys('120');
      setHighDia('80');
      setLowSys('80');
      setLowDia('50');
      return;
    }
    if (lower.includes('mẹ') || lower.includes('bà')) {
      setAvatarEmoji('👵');
      setGender('female');
    } else if (lower.includes('chị') || lower.includes('cô') || lower.includes('em gái')) {
      setAvatarEmoji('👩');
      setGender('female');
    } else if (lower.includes('bố') || lower.includes('bác') || lower.includes('ông')) {
      setAvatarEmoji('👴');
      setGender('male');
    } else {
      setAvatarEmoji('👨');
      setGender('male');
    }

    if (lower.includes('bạch yến')) {
      setProfileType('thyroid_post_op');
      setDiagnosis(
        'Đã phẫu thuật cắt toàn bộ tuyến giáp (K giáp thể nhú) - Duy trì hormone Levothyroxine và Kiểm soát Huyết áp, Mỡ máu, Canxi'
      );
      setNotes(
        'Uống thuốc hormone tuyến giáp (Levothyroxine) buổi sáng lúc bụng đói (trước ăn 30-60 phút), cách xa Canxi/Sắt ít nhất 4 tiếng. Theo dõi nhịp tim, huyết áp và dấu hiệu tê bì tay chân.'
      );
    }
  }, []);

  const handleProfileTypeChange = useCallback(
    (nextType: HealthProfileType) => {
      setProfileType(nextType);
      if (
        nextType === 'thyroid_post_op' &&
        (!diagnosis || diagnosis.includes('Theo dõi huyết áp') || diagnosis.includes('biểu đồ tăng trưởng'))
      ) {
        setDiagnosis(
          'Đã phẫu thuật cắt toàn bộ tuyến giáp (K giáp thể nhú) - Duy trì hormone Levothyroxine và Kiểm soát Huyết áp, Mỡ máu, Canxi'
        );
        setNotes(
          'Uống thuốc hormone tuyến giáp (Levothyroxine) buổi sáng lúc bụng đói (trước ăn 30-60 phút), cách xa Canxi/Sắt ít nhất 4 tiếng.'
        );
      } else if (nextType === 'pediatric') {
        if (!['👶', '🧒', '👧', '👦'].includes(avatarEmoji)) {
          setAvatarEmoji(gender === 'female' ? '👧' : '👶');
        }
        if (!diagnosis || diagnosis.includes('Theo dõi huyết áp')) {
          setDiagnosis(
            'Theo dõi biểu đồ tăng trưởng chiều cao, cân nặng chuẩn WHO, lịch tiêm chủng và thân nhiệt'
          );
          setNotes(
            'Theo dõi cân nặng, chiều cao hàng tháng, lịch tiêm vắc xin và bổ sung Vitamin D3.'
          );
        }
        setHighSys('120');
        setHighDia('80');
        setLowSys('80');
        setLowDia('50');
      }
    },
    [avatarEmoji, diagnosis, gender]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    const existing = profiles.find((p) => p.id === editingProfileId);
    const id =
      viewMode === 'edit' && editingProfileId
        ? editingProfileId
        : `member_${Date.now().toString(36)}`;

    const nextThresholds: BpThresholds = {
      highSys: Math.max(100, Math.min(220, parseInt(highSys, 10) || 140)),
      highDia: Math.max(60, Math.min(140, parseInt(highDia, 10) || 90)),
      lowSys: Math.max(70, Math.min(130, parseInt(lowSys, 10) || 100)),
      lowDia: Math.max(40, Math.min(90, parseInt(lowDia, 10) || 60)),
    };

    const matchedMember =
      members.find((m) => linkedMemberId && m.id === linkedMemberId) ||
      members.find((m) => m.name.trim().toLowerCase() === name.trim().toLowerCase());

    const nextProfile: HealthProfile = {
      id,
      name: name.trim(),
      relation: relation.trim() || 'Gia đình',
      avatarEmoji: avatarEmoji || '🧑',
      profileType: profileType || existing?.profileType || 'general_health',
      linkedMemberId: matchedMember?.id || linkedMemberId || existing?.linkedMemberId,
      patientInfo: {
        ...(existing?.patientInfo || {
          statusBadge: 'Theo dõi sức khỏe gia đình',
          conditionTag: 'Huyết áp & Tim mạch',
          headerBadge: 'Tại nhà',
          careMode: 'Hằng ngày',
          careGoal: 'Duy trì huyết áp & nhịp tim ổn định',
          customFields: [],
        }),
        name: name.trim(),
        diagnosis:
          diagnosis.trim() ||
          'Theo dõi huyết áp, nhịp tim và chăm sóc sức khỏe hằng ngày',
        hospital: hospital.trim() || 'Khám định kỳ',
        room: existing?.patientInfo?.room || 'Tại nhà',
        notes:
          notes.trim() ||
          'Đo huyết áp định kỳ sáng/tối, uống đủ nước ấm, nghỉ ngơi hợp lý.',
        birthDate: birthDate.trim() || undefined,
        gender,
      },
      bpThresholds: nextThresholds,
      appointment: existing?.appointment || { ...DEFAULT_APPOINTMENT },
    };

    setIsSaving(true);
    try {
      await onSaveProfile(nextProfile);
      onSelectProfile(nextProfile.id);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async (profileId: string, profileName: string) => {
    if (!profileId || profiles.length <= 1 || !onDeleteProfile || isSaving) return;
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa hồ sơ sức khỏe của "${profileName}" khỏi Sổ Sức Khỏe Gia Đình?`
    );
    if (!confirmed) return;
    setIsSaving(true);
    try {
      await onDeleteProfile(profileId);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (mode === 'closed') return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Quản lý Hồ sơ Sức khỏe Gia đình"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-card rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-border-card"
      >
        <div className="px-4 sm:px-5 py-3.5 bg-medical-primary text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {viewMode !== 'list' && mode === 'list' && (
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="Quay lại danh sách hồ sơ"
                className="min-h-[48px] min-w-[48px] rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black truncate">
                {viewMode === 'list'
                  ? 'Hồ Sơ Sức Khỏe Gia Đình'
                  : viewMode === 'add'
                    ? 'Thêm Hồ Sơ Sức Khỏe Mới'
                    : `Cài Đặt Hồ Sơ: ${name}`}
              </h3>
              <p className="text-xs sm:text-sm text-teal-50 truncate">
                Mỗi người có sổ huyết áp, đơn thuốc, xét nghiệm và ngưỡng riêng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="min-h-[48px] min-w-[48px] rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {viewMode === 'list' ? (
          <ProfileListView
            profiles={profiles}
            activeProfileId={activeProfileId}
            membersCount={members.length}
            latestVitalByProfile={latestVitalByProfile}
            canDelete={profiles.length > 1 && Boolean(onDeleteProfile)}
            onSelectAndClose={(profileId) => {
              onSelectProfile(profileId);
              onClose();
            }}
            onEditProfile={populateEditForm}
            onDeleteProfile={handleDeleteProfile}
            onOpenAddForm={populateAddForm}
            onOpenMembers={
              onOpenMembers
                ? () => {
                    onClose();
                    onOpenMembers();
                  }
                : undefined
            }
          />
        ) : (
          <ProfileFormView
            viewMode={viewMode}
            canDelete={profiles.length > 1 && Boolean(onDeleteProfile)}
            isSaving={isSaving}
            members={members}
            linkedMemberId={linkedMemberId}
            name={name}
            relation={relation}
            avatarEmoji={avatarEmoji}
            profileType={profileType}
            birthDate={birthDate}
            gender={gender}
            diagnosis={diagnosis}
            notes={notes}
            highSys={highSys}
            highDia={highDia}
            lowSys={lowSys}
            lowDia={lowDia}
            onQuickPickMember={handleQuickPickMember}
            onChangeAvatar={setAvatarEmoji}
            onChangeName={setName}
            onChangeRelation={setRelation}
            onChangeProfileType={handleProfileTypeChange}
            onChangeBirthDate={setBirthDate}
            onChangeGender={setGender}
            onChangeDiagnosis={setDiagnosis}
            onChangeNotes={setNotes}
            onChangeHighSys={setHighSys}
            onChangeHighDia={setHighDia}
            onChangeLowSys={setLowSys}
            onChangeLowDia={setLowDia}
            onSubmit={handleSubmit}
            onDelete={() => handleDeleteProfile(editingProfileId, name)}
            onCancel={mode === 'list' ? () => setViewMode('list') : onClose}
            onOpenMembers={
              onOpenMembers
                ? () => {
                    onClose();
                    onOpenMembers();
                  }
                : undefined
            }
          />
        )}
      </motion.div>
    </div>
  );
}

export default ProfileQuickSwitcherModal;
