import type { FamilyMember, HealthProfile, PatientInfo } from '@/lib/types';
import {
  DEFAULT_APPOINTMENT,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_HEALTH_PROFILE_ID,
  DEFAULT_MEMBER_NAME,
} from '@/lib/config';

export function computeNameInitials(rawName: string): string {
  const words = rawName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'TV';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function createFamilyMemberFromProfile(
  profile: Pick<HealthProfile, 'id' | 'name' | 'relation' | 'linkedMemberId' | 'patientInfo'>,
  fallbackId?: string
): FamilyMember {
  const cleanName = profile.name.trim();
  const cleanRelation = (profile.relation || '').trim();
  const initials = computeNameInitials(cleanName);
  const isMotherRel = cleanRelation.toLowerCase().includes('mẹ');
  return {
    id: profile.linkedMemberId || fallbackId || `mem-${profile.id}`,
    name: cleanName,
    relation: cleanRelation || 'Thành viên gia đình',
    phone: profile.patientInfo?.emergencyPhone || 'Chưa cập nhật',
    badgeColor: isMotherRel ? 'bg-rose-600' : 'bg-teal-600',
    avatarInitials: initials,
    bgLight: isMotherRel ? 'bg-rose-50/90' : 'bg-teal-50/90',
    borderLight: isMotherRel ? 'border-rose-300' : 'border-teal-300',
    textColor: isMotherRel ? 'text-rose-900' : 'text-teal-900',
    accentColor: isMotherRel ? 'bg-rose-600 text-white' : 'bg-teal-600 text-white',
    pillBadge: isMotherRel
      ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
      : 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
    isSupporter: false,
  };
}

export function buildNewHealthProfileFromMember(member: FamilyMember): HealthProfile {
  const lower = `${member.name} ${member.relation}`.toLowerCase();
  const isThyroid = lower.includes('bạch yến');
  const emoji =
    lower.includes('mẹ') || lower.includes('bà')
      ? '👵'
      : lower.includes('chị') || lower.includes('cô') || lower.includes('em gái')
        ? '👩'
        : lower.includes('bố') || lower.includes('bác') || lower.includes('ông')
          ? '👴'
          : '👨';

  return {
    id: `member_${Date.now().toString(36)}`,
    name: member.name.trim(),
    relation: member.relation.trim() || 'Gia đình',
    avatarEmoji: emoji,
    profileType: isThyroid ? 'thyroid_post_op' : 'general_health',
    linkedMemberId: member.id,
    patientInfo: {
      name: member.name.trim(),
      diagnosis: isThyroid
        ? 'Đã phẫu thuật cắt toàn bộ tuyến giáp (K giáp thể nhú) - Duy trì hormone Levothyroxine và Kiểm soát Huyết áp, Mỡ máu, Canxi'
        : 'Theo dõi huyết áp, nhịp tim và chăm sóc sức khỏe hằng ngày',
      hospital: 'Khám định kỳ',
      room: 'Tại nhà',
      notes: 'Đo huyết áp định kỳ sáng/tối, uống đủ nước ấm, nghỉ ngơi hợp lý.',
      emergencyPhone: member.phone !== 'Chưa cập nhật' ? member.phone : '',
      statusBadge: 'Theo dõi sức khỏe gia đình',
      conditionTag: isThyroid ? 'Tuyến giáp · HA · Mỡ máu' : 'Huyết áp & Tim mạch',
      headerBadge: 'Tại nhà',
      careMode: 'Hằng ngày',
      careGoal: 'Duy trì huyết áp & nhịp tim ổn định',
      customFields: [],
    },
    bpThresholds: { ...DEFAULT_BP_THRESHOLDS },
    appointment: { ...DEFAULT_APPOINTMENT },
  };
}

export function stripNestedProfiles(profile: HealthProfile): HealthProfile {
  return {
    ...profile,
    patientInfo: {
      ...profile.patientInfo,
      healthProfiles: undefined,
    },
  };
}

export function mergeUpdatedProfileIntoRootInfo(
  rootPatientInfo: PatientInfo,
  healthProfiles: HealthProfile[],
  updatedProfile: HealthProfile
): PatientInfo {
  const cleanUpdated: HealthProfile = {
    ...updatedProfile,
    patientInfo: {
      ...updatedProfile.patientInfo,
      name: updatedProfile.name || updatedProfile.patientInfo.name,
      healthProfiles: undefined,
    },
  };

  if (cleanUpdated.id === DEFAULT_HEALTH_PROFILE_ID) {
    const extraProfiles = healthProfiles
      .filter((p) => p.id !== DEFAULT_HEALTH_PROFILE_ID)
      .map(stripNestedProfiles);
    return {
      ...cleanUpdated.patientInfo,
      name: cleanUpdated.name || cleanUpdated.patientInfo.name || DEFAULT_MEMBER_NAME,
      healthProfiles: [cleanUpdated, ...extraProfiles],
    };
  }

  const primaryObj = healthProfiles.find((p) => p.id === DEFAULT_HEALTH_PROFILE_ID);
  const cleanPrimary = primaryObj ? stripNestedProfiles(primaryObj) : null;
  const existingExtras = healthProfiles
    .filter((p) => p.id !== DEFAULT_HEALTH_PROFILE_ID)
    .map(stripNestedProfiles);
  const existsIdx = existingExtras.findIndex((p) => p.id === cleanUpdated.id);
  const nextExtras =
    existsIdx >= 0
      ? existingExtras.map((p, idx) => (idx === existsIdx ? cleanUpdated : p))
      : [...existingExtras, cleanUpdated];

  return {
    ...rootPatientInfo,
    healthProfiles: cleanPrimary ? [cleanPrimary, ...nextExtras] : nextExtras,
  };
}
