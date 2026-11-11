import type {
  HealthProfile,
  HealthProfileType,
  ReminderCategory,
} from '@/lib/types';
import type { VitalsQuickNoteTag } from '@/lib/config';

const SENIOR_STORAGE_KEY = 'care_senior_xl_text';
const SENIOR_SYNC_EVENT = 'care-senior-text-change';
const SENIOR_AVATARS = new Set(['👵', '👴', '👨‍🦳', '👩‍🦳']);

/**
 * Nhận diện hồ sơ cần giao diện thân thiện Người Cao Tuổi (Senior UI Mode):
 * - Hồ sơ hậu phẫu tuyến giáp (`thyroid_post_op` - Mẹ Bạch Yến)
 * - Hồ sơ có biểu tượng Ông/Bà hoặc vai vế Ông, Bà, Bác, Cụ
 * - Hồ sơ Bố/Mẹ lớn tuổi (trừ hồ sơ Nhi khoa)
 */
export function isSeniorFriendlyProfile(
  profile?: Pick<HealthProfile, 'profileType' | 'relation' | 'name' | 'avatarEmoji'> | null
): boolean {
  if (!profile) return false;
  if (profile.profileType === 'pediatric') return false;
  if (profile.profileType === 'thyroid_post_op') return true;
  if (profile.avatarEmoji && SENIOR_AVATARS.has(profile.avatarEmoji)) return true;

  const text = `${profile.relation || ''} ${profile.name || ''}`.toLowerCase();
  return (
    text.includes('ông') ||
    text.includes('bà') ||
    text.includes('cụ') ||
    text.includes('bạch yến') ||
    text.includes('thành đô')
  );
}

/**
 * Đồng bộ chế độ Chữ To (Senior XL Text) theo hồ sơ đang mở:
 * - Khi chuyển sang hồ sơ Người Cao Tuổi / Hậu phẫu Tuyến giáp: tự động bật chữ to
 *   nếu người dùng chưa chủ động tắt thủ công trong phiên hiện tại.
 * - Vẫn đồng bộ 2 chiều với nút SeniorTextToggle trên thanh Header.
 */
export function syncSeniorTextModeForProfile(isSeniorProfile: boolean): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const currentSaved = localStorage.getItem(SENIOR_STORAGE_KEY);
    if (isSeniorProfile && currentSaved === null) {
      document.documentElement.classList.add('senior-xl-text');
      localStorage.setItem(SENIOR_STORAGE_KEY, 'true');
      window.dispatchEvent(
        new CustomEvent(SENIOR_SYNC_EVENT, { detail: { enabled: true } })
      );
    }
  } catch {
    // Bỏ qua lỗi truy cập localStorage
  }
}

export function setSeniorTextModeExplicit(enabled: boolean): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    if (enabled) {
      document.documentElement.classList.add('senior-xl-text');
      localStorage.setItem(SENIOR_STORAGE_KEY, 'true');
    } else {
      document.documentElement.classList.remove('senior-xl-text');
      localStorage.setItem(SENIOR_STORAGE_KEY, 'false');
    }
    window.dispatchEvent(
      new CustomEvent(SENIOR_SYNC_EVENT, { detail: { enabled } })
    );
  } catch {
    // Bỏ qua lỗi lưu localStorage
  }
}

/**
 * Bộ thẻ chọn nhanh 1 chạm chuyên biệt cho vùng khuyết sọ & thần kinh (Hồ sơ hậu đột quỵ / ghép sọ)
 */
export const CRANIOPLASTY_FLAP_TAGS: VitalsQuickNoteTag[] = [
  {
    id: 'flap_normal',
    value: 'Vùng khuyết sọ bình thường, mềm phẳng',
    label: '✅ Khuyết sọ: Bình thường',
    tone: 'good',
  },
  {
    id: 'flap_bulging',
    value: 'Vùng khuyết sọ căng phồng',
    label: '🚨 Khuyết sọ: Căng phồng',
    tone: 'warn',
    clinicalTip:
      'CẢNH BÁO ĐỎ: Vùng da khuyết sọ căng phồng hoặc đập mạnh có thể là dấu hiệu tăng áp lực nội sọ. Cho người bệnh nằm đầu cao 30 độ, tránh rặn/ho mạnh và liên hệ Bác sĩ ngoại thần kinh hoặc đi viện kiểm tra ngay!',
  },
  {
    id: 'flap_sunken',
    value: 'Vùng khuyết sọ lõm sâu',
    label: '⚠️ Khuyết sọ: Lõm sâu',
    tone: 'warn',
    clinicalTip:
      'Vùng da sọ lõm sâu (hội chứng vạt da lõm) thường tăng khi ngồi/đứng lâu hoặc thiếu nước. Cho người bệnh nằm đầu thấp/phẳng nghỉ ngơi, bù đủ nước ấm và báo Bác sĩ phẫu thuật.',
  },
  {
    id: 'flap_headache_dizzy',
    value: 'Đau đầu / Chóng mặt',
    label: '😵 Đau đầu / Chóng mặt',
    tone: 'warn',
    clinicalTip:
      'Nghỉ ngơi tuyệt đối tại giường, đo kiểm tra lại huyết áp và SpO2 sau 15 phút. Nếu kèm nôn hoặc yếu tê tay chân mới -> Gọi cấp cứu ngay.',
  },
  {
    id: 'flap_seizure',
    value: 'Co giật nhẹ / rung giật cơ',
    label: '⚡ Co giật nhẹ',
    tone: 'warn',
    clinicalTip:
      'CẢNH BÁO ĐỎ: Đặt người bệnh nằm nghiêng an toàn, KHÔNG nhét vật cứng vào miệng, kiểm tra liều thuốc chống co giật và liên hệ Bác sĩ / Cấp cứu 115 ngay!',
  },
];

/**
 * Thẻ chọn nhanh tình trạng sức khỏe cho Hồ sơ Nhi khoa (`pediatric`)
 */
export const PEDIATRIC_VITALS_QUICK_NOTE_TAGS: VitalsQuickNoteTag[] = [
  {
    id: 'ped_happy',
    value: 'Bé tỉnh táo, chơi ngoan, ăn ngủ tốt',
    label: '✅ Bé tỉnh táo, chơi ngoan',
    tone: 'good',
  },
  {
    id: 'ped_mild_fever',
    value: 'Ấm người / sốt nhẹ 37.5 - 38.4°C',
    label: '🌡️ Sốt nhẹ (37.5 - 38.4°C)',
    tone: 'warn',
    clinicalTip:
      'Mặc thoáng mát, chườm ấm vùng trán/nách/bẹn, cho bé uống nhiều nước hoặc Oresol chia nhỏ từng thìa. Chưa cần uống hạ sốt nếu bé vẫn chơi ngoan.',
  },
  {
    id: 'ped_high_fever',
    value: 'Sốt cao từ 38.5°C trở lên',
    label: '🔥 Sốt cao >= 38.5°C',
    tone: 'warn',
    clinicalTip:
      'Cần dùng thuốc hạ sốt Paracetamol liều 10-15 mg/kg cân nặng (cách nhau mỗi 4-6 giờ, tối đa 5 lần/24h). Đưa bé đi khám ngay nếu sốt cao khó hạ, li bì, co giật hoặc nôn vọt.',
  },
  {
    id: 'ped_cough_runny',
    value: 'Ho / sổ mũi / nghẹt mũi',
    label: '🤧 Ho / sổ mũi',
    tone: 'neutral',
  },
  {
    id: 'ped_after_antipyretic',
    value: 'Đo lại sau uống hạ sốt 45 phút',
    label: '💊 Sau uống hạ sốt',
    tone: 'good',
  },
  {
    id: 'ped_poor_feeding',
    value: 'Ăn bú kém / nôn trớ',
    label: '🍼 Ăn bú kém / nôn trớ',
    tone: 'warn',
    clinicalTip:
      'Chia nhỏ cữ ăn/bú và bù Oresol pha đúng tỷ lệ chuẩn. Theo dõi số lần đi tiểu và dấu hiệu mất nước (môi khô, khóc ít nước mắt).',
  },
];

export interface ParacetamolDoseGuide {
  weightKg: number;
  minMg: number;
  maxMg: number;
  recommendedMg: number;
  maxDailyMg: number;
  suggestedPack: string;
  clinicalNote: string;
}

/**
 * Công cụ tính nhanh liều hạ sốt Paracetamol an toàn cho trẻ em theo cân nặng (10 - 15 mg/kg/lần)
 */
export function calculatePediatricParacetamolDose(
  weightKg: number
): ParacetamolDoseGuide | null {
  if (!Number.isFinite(weightKg) || weightKg <= 2 || weightKg > 80) return null;
  const minMg = Math.round(weightKg * 10);
  const maxMg = Math.round(weightKg * 15);
  const recommendedMg = Math.round(weightKg * 12.5);
  const maxDailyMg = Math.min(4000, Math.round(weightKg * 60));

  let suggestedPack = 'Hỏi Bác sĩ / Dược sĩ dạng siro nhỏ giọt chính xác theo ml';
  if (weightKg >= 34) {
    suggestedPack = '1 viên 500mg (hoặc 2 gói 250mg)';
  } else if (weightKg >= 17) {
    suggestedPack = '1 gói 250mg';
  } else if (weightKg >= 10) {
    suggestedPack = '1 gói 150mg';
  } else if (weightKg >= 5.5) {
    suggestedPack = '1 gói 80mg';
  }

  return {
    weightKg,
    minMg,
    maxMg,
    recommendedMg,
    maxDailyMg,
    suggestedPack,
    clinicalNote:
      'Chỉ dùng khi trẻ sốt >= 38.5°C hoặc quấy đau nhiều. Các cữ cách nhau ít nhất 4 - 6 giờ, tối đa không quá 5 lần trong 24 giờ.',
  };
}

export interface ReminderQuickPreset {
  category: ReminderCategory;
  title: string;
  content: string;
  isUrgent: boolean;
}

/**
 * Gợi ý mẫu nhắc nhở trong ngày thích ứng theo từng loại hồ sơ (không rò rỉ thuật ngữ đột quỵ sang hồ sơ khác)
 */
export function getReminderPresetsForProfile(
  profileType: HealthProfileType,
  patientDisplayName: string
): ReminderQuickPreset[] {
  if (profileType === 'thyroid_post_op') {
    return [
      {
        category: 'meds',
        title: 'Uống Levothyroxine lúc bụng đói',
        content:
          'Uống ngay khi thức dậy với nước lọc, trước ăn sáng 30-60 phút và cách Canxi/Sắt ít nhất 4 giờ.',
        isUrgent: true,
      },
      {
        category: 'condition',
        title: 'Theo dõi nhịp tim & dấu hiệu tê bì',
        content: `Ghi nhận nếu ${patientDisplayName} có hồi hộp tim đập nhanh hoặc tê bì đầu ngón tay chân.`,
        isUrgent: false,
      },
      {
        category: 'doctor',
        title: 'Chuẩn bị xét nghiệm TSH, FT4, Canxi',
        content: 'Nhịn ăn sáng trước khi lấy máu xét nghiệm định kỳ.',
        isUrgent: false,
      },
    ];
  }

  if (profileType === 'pediatric') {
    return [
      {
        category: 'meds',
        title: 'Theo dõi giờ uống hạ sốt & nhiệt độ',
        content: 'Ghi rõ giờ uống Paracetamol để cữ tiếp theo cách ít nhất 4-6 tiếng.',
        isUrgent: true,
      },
      {
        category: 'doctor',
        title: 'Nhắc lịch tiêm chủng sắp tới',
        content: 'Mang theo sổ tiêm chủng giấy và cho bé ăn nhẹ trước khi đi tiêm.',
        isUrgent: false,
      },
      {
        category: 'feeding',
        title: 'Bổ sung nước ấm / Oresol & Vitamin D3',
        content: 'Nhỏ Vitamin D3 buổi sáng và cho bé uống đủ nước trong ngày.',
        isUrgent: false,
      },
    ];
  }

  if (profileType === 'post_stroke_cranioplasty') {
    return [
      {
        category: 'meds',
        title: 'Uống thuốc huyết áp đúng giờ cố định',
        content: 'Đo huyết áp trước khi uống thuốc sáng và tối, không tự ý bỏ cữ.',
        isUrgent: true,
      },
      {
        category: 'condition',
        title: 'Bảo vệ vùng khuyết sọ & bên bán manh trái',
        content: 'Đi bên trái hỗ trợ Bố, chú ý vùng da sọ nếu căng phồng hoặc lõm sâu.',
        isUrgent: true,
      },
      {
        category: 'feeding',
        title: 'Ăn nhạt giảm muối & uống đủ nước ấm',
        content: 'Chia nhỏ lượng nước ấm trong ngày, hạn chế đồ mặn và mỡ động vật.',
        isUrgent: false,
      },
    ];
  }

  return [
    {
      category: 'meds',
      title: 'Đo huyết áp & uống thuốc định kỳ',
      content: `Đo huyết áp sau khi nghỉ tĩnh 5-10 phút và uống thuốc đúng giờ của ${patientDisplayName}.`,
      isUrgent: true,
    },
    {
      category: 'condition',
      title: 'Vận động vừa sức & theo dõi nhịp tim',
      content: 'Nghỉ ngơi thư giãn và bù nước sau khi tập thể dục, đánh cầu hoặc đạp xe.',
      isUrgent: false,
    },
    {
      category: 'feeding',
      title: 'Chế độ ăn tốt cho tim mạch & mỡ máu',
      content: 'Tăng cường rau xanh, cá, giảm muối và hạn chế thức ăn chiên rán buổi tối.',
      isUrgent: false,
    },
  ];
}
