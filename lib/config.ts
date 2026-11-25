import { FamilyMember, PhaseConfig, EmergencyContact, ShiftRecord, CarePhase, ShiftType, PatientDailyReminder, PatientInfo, PatientCustomField, TimeSlot, BpThresholds, RehabStage, AppointmentInfo, CareRoutine, HealthProfile, HealthProfileType, LabResultEntry, TshTargetLevel } from './types';
import { computeCorrectedCalcium, evaluateParathyroidPanel } from './parathyroidEval';
import {
  evaluateFt4Indicator,
  evaluateTgAndAntiTgIndicators,
  evaluateTshIndicator,
} from './thyroidClinicalEval';

// =============================================
// CẤU HÌNH ĐA GIA ĐÌNH (MULTI-FAMILY EDITION CONFIG)
// Tự động nhận diện Web "Sổ Sức Khỏe Ông Bà Nội" (so-suc-khoe-ong-ba-noi.vercel.app)
// hoặc "Sổ Sức Khỏe Gia Đình Nhỏ" (NEXT_PUBLIC_APP_MODE=young_family)
// =============================================
const vercelProdUrl = (
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.NEXT_PUBLIC_VERCEL_URL ||
  ''
).toLowerCase();

export const IS_YOUNG_FAMILY_MODE =
  process.env.NEXT_PUBLIC_APP_MODE === 'young_family' ||
  vercelProdUrl.includes('gia-dinh-nho') ||
  vercelProdUrl.includes('so-suc-khoe-gia-dinh');

export const IS_FAMILY_STANDARD_MODE =
  !IS_YOUNG_FAMILY_MODE &&
  (process.env.NEXT_PUBLIC_APP_MODE === 'family_standard' ||
    vercelProdUrl.includes('ong-ba-noi'));

export const ENABLE_FAMILY_SHIFT_TAB =
  process.env.NEXT_PUBLIC_ENABLE_SHIFTS === 'true'
    ? true
    : process.env.NEXT_PUBLIC_ENABLE_SHIFTS === 'false'
      ? false
      : !IS_FAMILY_STANDARD_MODE && !IS_YOUNG_FAMILY_MODE;

export const DEFAULT_MEMBER_NAME =
  (
    process.env.NEXT_PUBLIC_DEFAULT_MEMBER_NAME ||
    process.env.NEXT_PUBLIC_DEFAULT_PATIENT_NAME ||
    ''
  ).trim() ||
  (IS_YOUNG_FAMILY_MODE
    ? 'Thanh Long'
    : IS_FAMILY_STANDARD_MODE
      ? 'Bố Thành Đô'
      : 'Đinh Hồng Phong');

export const DEFAULT_MOTHER_NAME =
  (process.env.NEXT_PUBLIC_DEFAULT_MOTHER_NAME || '').trim() ||
  (IS_YOUNG_FAMILY_MODE ? 'Lan Anh' : IS_FAMILY_STANDARD_MODE ? 'Mẹ Bạch Yến' : 'Mẹ');

export const APP_TITLE =
  (process.env.NEXT_PUBLIC_APP_TITLE || '').trim() ||
  (IS_YOUNG_FAMILY_MODE
    ? 'Sổ Sức Khỏe Gia Đình Nhỏ'
    : IS_FAMILY_STANDARD_MODE
      ? 'Sổ Sức Khỏe Ông Bà Nội'
      : `Sổ Sức Khỏe Bố - ${DEFAULT_MEMBER_NAME}`);

export const APP_SHORT_TITLE =
  (process.env.NEXT_PUBLIC_APP_SHORT_TITLE || '').trim() ||
  (IS_YOUNG_FAMILY_MODE
    ? 'Sổ Sức Khỏe Gia Đình'
    : IS_FAMILY_STANDARD_MODE
      ? 'Sổ Sức Khỏe Ông Bà Nội'
      : 'Sổ Sức Khỏe Bố');

export const PATIENT_INFO: PatientInfo = {
  name: DEFAULT_MEMBER_NAME,
  diagnosis: IS_YOUNG_FAMILY_MODE
    ? 'Thoát vị đĩa đệm L5/S1 chèn ép rễ S1 • Sỏi thận trái • Theo dõi Acid Uric & Mỡ máu'
    : IS_FAMILY_STANDARD_MODE
      ? 'Tim mạch & Huyết áp • Theo dõi Gout tái phát • Hội chứng ruột kích thích (IBS) • Polyp túi mật định kỳ'
      : 'Đang phục hồi chức năng sau đột quỵ (tai biến mạch máu não)',
  hospital: IS_YOUNG_FAMILY_MODE
    ? 'BV Đa khoa Hà Đông & Theo dõi định kỳ (Hà Nội)'
    : IS_FAMILY_STANDARD_MODE
      ? 'Khám & kiểm tra định kỳ (Thái Nguyên)'
      : 'Bệnh viện Bạch Mai - Hà Nội (nơi điều trị trước đó)',
  room: 'Tại nhà',
  notes: IS_YOUNG_FAMILY_MODE
    ? 'Uống đủ 2-2.5L nước/ngày để phòng sỏi thận & hạ Acid Uric. Ăn nhạt, hạn chế purin; kiêng cá sông, tôm, cua. Tập Cardio tác động thấp (đạp xe, đi bộ) & Gyro Ball khi qua đợt đau lưng cấp.'
    : IS_FAMILY_STANDARD_MODE
      ? 'Nghỉ tĩnh 5-10 phút sau đánh Tennis/đạp xe trước khi đo HA. Uống đủ 2-2.5L nước/ngày để thải Acid Uric ngừa Gout và bảo vệ thận. Hạn chế rượu bia, thuốc lá, đồ mỡ/purin; theo dõi kích thước Polyp túi mật mỗi lần siêu âm định kỳ.'
      : 'Cần theo dõi huyết áp hàng ngày, uống thuốc đúng giờ, tập vận động và nghỉ ngơi đều đặn.',
  emergencyPhone: IS_YOUNG_FAMILY_MODE || IS_FAMILY_STANDARD_MODE ? '' : '0913 218 765',
  statusBadge: 'Theo dõi sức khỏe gia đình',
  conditionTag: IS_YOUNG_FAMILY_MODE
    ? 'L5/S1 • Sỏi thận • Acid Uric • Cardio'
    : IS_FAMILY_STANDARD_MODE
      ? 'Tim mạch • Gout • IBS • Polyp mật'
      : 'Phục hồi tại nhà',
  headerBadge: 'Tại nhà',
  careMode: 'Hằng ngày',
  careGoal: IS_YOUNG_FAMILY_MODE
    ? 'Ổn định L5/S1, thải sỏi thận, hạ Acid Uric <360 & duy trì Cardio'
    : IS_FAMILY_STANDARD_MODE
      ? 'Ổn định HA, mỡ máu, GGT, Acid Uric <360 & theo dõi Polyp túi mật'
      : 'Duy trì huyết áp & sức khỏe ổn định',
  ...(IS_YOUNG_FAMILY_MODE ? { birthDate: '1988-12-28', gender: 'male' as const } : {}),
};

export const FAMILY_MEMBERS: FamilyMember[] = IS_YOUNG_FAMILY_MODE
  ? [
      {
        id: 'mem-father',
        name: 'Thanh Long',
        relation: 'Bản thân',
        phone: 'Chưa cập nhật',
        badgeColor: 'bg-teal-600',
        avatarInitials: 'TL',
        bgLight: 'bg-teal-50/90',
        borderLight: 'border-teal-300',
        textColor: 'text-teal-900',
        accentColor: 'bg-teal-600 text-white',
        pillBadge: 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
      },
      {
        id: 'mem-mother',
        name: 'Lan Anh',
        relation: 'Vợ',
        phone: 'Chưa cập nhật',
        badgeColor: 'bg-rose-600',
        avatarInitials: 'LA',
        bgLight: 'bg-rose-50/90',
        borderLight: 'border-rose-300',
        textColor: 'text-rose-900',
        accentColor: 'bg-rose-600 text-white',
        pillBadge: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      },
      {
        id: 'mem-child-1',
        name: 'Minh Trung',
        relation: 'Con thứ 1 (9 tuổi)',
        phone: 'Chưa cập nhật',
        badgeColor: 'bg-blue-600',
        avatarInitials: 'MT',
        bgLight: 'bg-blue-50/90',
        borderLight: 'border-blue-300',
        textColor: 'text-blue-900',
        accentColor: 'bg-blue-600 text-white',
        pillBadge: 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
      },
      {
        id: 'mem-child-2',
        name: 'Minh Đức',
        relation: 'Con thứ 2 (6 tuổi)',
        phone: 'Chưa cập nhật',
        badgeColor: 'bg-indigo-600',
        avatarInitials: 'MĐ',
        bgLight: 'bg-indigo-50/90',
        borderLight: 'border-indigo-300',
        textColor: 'text-indigo-900',
        accentColor: 'bg-indigo-600 text-white',
        pillBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
      },
      {
        id: 'mem-child-3',
        name: 'Minh Phúc',
        relation: 'Con thứ 3 (2 tuổi)',
        phone: 'Chưa cập nhật',
        badgeColor: 'bg-amber-600',
        avatarInitials: 'MP',
        bgLight: 'bg-amber-50/90',
        borderLight: 'border-amber-300',
        textColor: 'text-amber-950',
        accentColor: 'bg-amber-600 text-white',
        pillBadge: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      },
    ]
  : IS_FAMILY_STANDARD_MODE
  ? [
      {
        id: 'mem-mother',
        name: 'Đoàn Thị Bạch Yến',
        relation: 'Mẹ',
        phone: 'Chưa cập nhật',
        badgeColor: 'bg-rose-600',
        avatarInitials: 'BY',
        bgLight: 'bg-rose-50/90',
        borderLight: 'border-rose-300',
        textColor: 'text-rose-900',
        accentColor: 'bg-rose-600 text-white',
        pillBadge: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      },
      {
        id: 'mem-father',
        name: 'Nguyễn Thành Đô',
        relation: 'Bố',
        phone: 'Chưa cập nhật',
        badgeColor: 'bg-teal-600',
        avatarInitials: 'TĐ',
        bgLight: 'bg-teal-50/90',
        borderLight: 'border-teal-300',
        textColor: 'text-teal-900',
        accentColor: 'bg-teal-600 text-white',
        pillBadge: 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
      },
      {
        id: 'mem-son',
        name: 'Thanh Long',
        relation: 'Con trai',
        phone: 'Chưa cập nhật',
        badgeColor: 'bg-blue-600',
        avatarInitials: 'TL',
        bgLight: 'bg-blue-50/90',
        borderLight: 'border-blue-300',
        textColor: 'text-blue-900',
        accentColor: 'bg-blue-600 text-white',
        pillBadge: 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
      },
    ]
  : [
      {
        id: 'mem-1',
        name: 'Bác Thành',
        relation: 'Bác cả (Trưởng ban điều phối)',
        phone: '0912 345 678',
        badgeColor: 'bg-blue-600',
        avatarInitials: 'BT',
        bgLight: 'bg-blue-50/90',
        borderLight: 'border-blue-300',
        textColor: 'text-blue-900',
        accentColor: 'bg-blue-600 text-white',
        pillBadge: 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
      },
      {
        id: 'mem-2',
        name: 'Cô Lan',
        relation: 'Cô ruột',
        phone: '0983 222 111',
        badgeColor: 'bg-emerald-600',
        avatarInitials: 'CL',
        bgLight: 'bg-emerald-50/90',
        borderLight: 'border-emerald-300',
        textColor: 'text-emerald-900',
        accentColor: 'bg-emerald-600 text-white',
        pillBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
      },
      {
        id: 'mem-3',
        name: 'Anh Dũng',
        relation: 'Con trai trưởng',
        phone: '0977 888 999',
        badgeColor: 'bg-indigo-600',
        avatarInitials: 'AD',
        bgLight: 'bg-indigo-50/90',
        borderLight: 'border-indigo-300',
        textColor: 'text-indigo-900',
        accentColor: 'bg-indigo-600 text-white',
        pillBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
      },
      {
        id: 'mem-4',
        name: 'Chị Mai',
        relation: 'Con dâu trưởng',
        phone: '0904 555 444',
        badgeColor: 'bg-rose-600',
        avatarInitials: 'CM',
        bgLight: 'bg-rose-50/90',
        borderLight: 'border-rose-300',
        textColor: 'text-rose-900',
        accentColor: 'bg-rose-600 text-white',
        pillBadge: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      },
      {
        id: 'mem-5',
        name: 'Anh Hùng',
        relation: 'Con trai thứ',
        phone: '0918 666 777',
        badgeColor: 'bg-amber-600',
        avatarInitials: 'AH',
        bgLight: 'bg-amber-50/90',
        borderLight: 'border-amber-300',
        textColor: 'text-amber-950',
        accentColor: 'bg-amber-600 text-white',
        pillBadge: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      },
      {
        id: 'mem-6',
        name: 'Chị Trang',
        relation: 'Con gái út',
        phone: '0936 123 456',
        badgeColor: 'bg-purple-600',
        avatarInitials: 'CT',
        bgLight: 'bg-purple-50/90',
        borderLight: 'border-purple-300',
        textColor: 'text-purple-900',
        accentColor: 'bg-purple-600 text-white',
        pillBadge: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
      },
      {
        id: 'mem-7',
        name: 'Cháu Quân',
        relation: 'Cháu đích tôn',
        phone: '0988 999 112',
        badgeColor: 'bg-teal-600',
        avatarInitials: 'CQ',
        bgLight: 'bg-teal-50/90',
        borderLight: 'border-teal-300',
        textColor: 'text-teal-900',
        accentColor: 'bg-teal-600 text-white',
        pillBadge: 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
      },
    ];

export const PHASE_CONFIGS: Record<'phase1' | 'phase2', PhaseConfig> = {
  phase1: {
    id: 'phase1',
    name: 'Giai đoạn 1: Nằm Viện / Cấp Cứu ICU',
    subtitle: '3 ca/ngày (8 tiếng/ca) • Cần tối thiểu 1 người túc trực liên tục',
    description: 'Bệnh nhân nằm phòng Hồi sức tích cực. Bệnh viện chỉ cho phép 1 người thân vào chăm sóc tại một thời điểm.',
    shifts: [
      {
        type: 'morning',
        name: 'Ca Sáng',
        timeRange: '06:00 - 14:00 (8 tiếng)',
        requiredPax: 1,
      },
      {
        type: 'afternoon',
        name: 'Ca Chiều',
        timeRange: '14:00 - 22:00 (8 tiếng)',
        requiredPax: 1,
      },
      {
        type: 'night',
        name: 'Ca Đêm',
        timeRange: '22:00 - 06:00 sáng hôm sau (8 tiếng)',
        requiredPax: 1,
      },
    ],
  },
  phase2: {
    id: 'phase2',
    name: 'Giai đoạn 2: Phục Hồi / Chăm Sóc Tại Nhà',
    subtitle: '2 ca/ngày (12 tiếng/ca) • Bắt buộc 2 người/ca để cùng nâng đỡ & lật trở',
    description: 'Bệnh nhân đã xuất viện về nhà. Do thể trạng nặng, bắt buộc cần 2 người phối hợp: 1 người nâng đỡ, 1 người vệ sinh/bơm sữa.',
    shifts: [
      {
        type: 'day_12h',
        name: 'Ca Ngày (12 tiếng)',
        timeRange: '06:00 - 18:00 (12 tiếng)',
        requiredPax: 2,
      },
      {
        type: 'night_12h',
        name: 'Ca Đêm (12 tiếng)',
        timeRange: '18:00 - 06:00 sáng hôm sau (12 tiếng)',
        requiredPax: 2,
      },
    ],
  },
};

export const DEFAULT_EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'emg-1',
    name: 'Tổng đài Cấp cứu 115 Hà Nội',
    category: 'ambulance',
    phone: '115',
    note: 'Yêu cầu xe cấp cứu có bình oxy và máy hỗ trợ thở khẩn cấp',
    address: '11 Phan Chu Trinh, Hoàn Kiếm, Hà Nội',
    isPrimary: true,
  },
  {
    id: 'emg-2',
    name: 'BS. CKII Nguyễn Văn Hùng',
    category: 'doctor',
    phone: '0913 218 765',
    note: 'Trưởng kíp Hồi sức tích cực (ICU) BV Bạch Mai - Bác sĩ điều trị chính',
    address: 'Khoa Hồi sức tích cực, Tầng 4, Nhà A, BV Bạch Mai',
    isPrimary: true,
  },
  {
    id: 'emg-3',
    name: 'Bàn trực Khoa Hồi sức tích cực ICU',
    category: 'doctor',
    phone: '024 3869 3731',
    note: 'Số máy bàn trực 24/7 Khoa ICU Bạch Mai (Máy lẻ 402)',
    address: '78 Giải Phóng, Phương Mai, Đống Đa, Hà Nội',
    isPrimary: false,
  },
  {
    id: 'emg-4',
    name: 'Cô Loan - Điều dưỡng ngoài giờ & Phục hồi',
    category: 'nurse',
    phone: '0984 567 890',
    note: 'Hỗ trợ thay sonde dạ dày/tiểu, hút đờm sâu, tiêm truyền tại nhà',
    address: 'Gần viện Bạch Mai (Đến sau 15 phút khi gọi)',
    isPrimary: false,
  },
  {
    id: 'emg-5',
    name: 'Bác Nam (Nhà số 14 đối diện)',
    category: 'neighbor',
    phone: '0903 456 789',
    note: 'Hàng xóm thân thiết, hỗ trợ mở cổng xe cấp cứu và nâng người khẩn cấp',
    address: 'Số 14 ngõ 78 Giải Phóng',
    isPrimary: false,
  },
  {
    id: 'emg-6',
    name: 'Chị Mai Lan (Thủ quỹ gia đình)',
    category: 'family',
    phone: '0904 555 444',
    note: 'Giữ thẻ viện phí và quỹ thuốc cấp cứu của gia đình',
    address: 'Túc trực thường xuyên',
    isPrimary: false,
  },
];

export const SHIFTS_SHEET_HEADERS = [
  'id',
  'date',
  'shift_type',
  'shift_name',
  'phase',
  'required_pax',
  'assignees',
  'is_understaffed',
  'checklist_feeding',
  'checklist_meds',
  'checklist_hygiene',
  'checklist_turning',
  'handover_note',
  'handover_author',
  'handover_vitals_bp',
  'handover_vitals_spo2',
  'handover_vitals_pulse',
  'handover_vitals_temp',
  'updated_at',
];

export function buildDefaultShiftRecord(
  date: string,
  shiftCfg: { type: ShiftType; name: string; timeRange: string; requiredPax: number },
  phase: CarePhase
): ShiftRecord {
  return {
    id: `${date}_${shiftCfg.type}_${phase}`,
    date,
    type: shiftCfg.type,
    name: shiftCfg.name,
    timeRange: shiftCfg.timeRange,
    phase,
    requiredPax: shiftCfg.requiredPax,
    assignees: [],
    supporters: [],
    isUnderstaffed: true,
    checklist: {
      feeding: false,
      meds: false,
      hygiene: false,
      turning: false,
    },
    handover: {
      note: '',
      author: '',
      updatedAt: '',
      vitals: {
        bp: '',
        spo2: '',
        pulse: '',
        temp: '',
      },
    },
  };
}

export const DEFAULT_PATIENT_REMINDERS: PatientDailyReminder[] = [
  {
    id: 'reminder-meds-1',
    category: 'meds',
    title: 'Lưu ý thuốc huyết áp',
    content: 'Đo huyết áp trước khi cho uống Amlodipine 5mg. Nếu huyết áp tâm thu < 110 hoặc tâm trương < 70, hoãn uống và gọi BS.',
    author: 'Cô Lan (Em gái)',
    time: '08:15',
    isUrgent: true,
  },
  {
    id: 'reminder-feeding-2',
    category: 'feeding',
    title: 'Chế độ ăn & dinh dưỡng',
    content: 'Ăn mềm, dễ nuốt, chia nhỏ bữa. Uống đủ nước. Hạn chế muối, mỡ.',
    author: 'Anh Dũng (Con trai)',
    time: '09:00',
    isUrgent: false,
  },
  {
    id: 'reminder-condition-3',
    category: 'condition',
    title: 'Theo dõi tình trạng phục hồi',
    content: 'Quan sát khả năng cử động tay chân bên liệt mỗi ngày. Ghi nhận tiến triển để báo BS khi tái khám.',
    author: 'BS. Nguyễn Văn Hùng',
    time: '07:30',
    isUrgent: false,
  },
];

// =============================================
// V2.0 - SỔ SỨC KHỎE BỐ - Constants mới
// =============================================

/** Cấu hình hiển thị 4 buổi trong ngày */
export const TIME_SLOT_CONFIG: Record<TimeSlot, { label: string; emoji: string; timeRange: string; hourStart: number; hourEnd: number }> = {
  morning: {
    label: 'Sáng',
    emoji: '🌅',
    timeRange: '06:00 – 11:00',
    hourStart: 6,
    hourEnd: 11,
  },
  noon: {
    label: 'Trưa',
    emoji: '☀️',
    timeRange: '11:00 – 14:00',
    hourStart: 11,
    hourEnd: 14,
  },
  afternoon: {
    label: 'Chiều',
    emoji: '🌇',
    timeRange: '14:00 – 18:00',
    hourStart: 14,
    hourEnd: 18,
  },
  evening: {
    label: 'Tối',
    emoji: '🌙',
    timeRange: '18:00 – 22:00',
    hourStart: 18,
    hourEnd: 22,
  },
};

/** Ngưỡng cảnh báo HA mặc định (có thể chỉnh qua Settings) */
export const DEFAULT_BP_THRESHOLDS: BpThresholds = IS_YOUNG_FAMILY_MODE
  ? {
      highSys: 140,
      highDia: 90,
      lowSys: 92,
      lowDia: 55,
    }
  : {
      highSys: 140,
      highDia: 90,
      lowSys: 100,
      lowDia: 60,
    };

/** Giai đoạn phục hồi mặc định */
export const DEFAULT_REHAB_STAGES: RehabStage[] = [
  {
    id: 'stage-1',
    name: IS_YOUNG_FAMILY_MODE
      ? 'Theo dõi & Chăm sóc Gia đình tại nhà'
      : 'Mới về nhà - Chăm sóc tích cực',
    isActive: true,
  },
];

/** Lịch tái khám mặc định (trống) */
export const DEFAULT_APPOINTMENT: AppointmentInfo = {
  nextDate: '',
  nextNote: '',
  nextWho: '',
  lastDate: '',
  lastNote: '',
};

/** Tên người ghi mặc định */
export const DEFAULT_RECORDER = IS_YOUNG_FAMILY_MODE ? 'Thanh Long' : 'Mẹ';

/** Danh sách đơn thuốc & bài tập phục hồi mặc định (Giai đoạn 1) */
export const DEFAULT_CARE_ROUTINES: CareRoutine[] = [
  {
    id: 'routine-med-01',
    stageId: 'stage-1',
    stageName: 'Mới về nhà - Chăm sóc tích cực',
    category: 'meds',
    medType: 'scheduled',
    title: 'Amlodipine (Amlor) 5mg',
    dosage: '1 viên',
    description: 'Thuốc hạ huyết áp - Viên nang cứng màu vàng-trắng (hoặc viên nén trắng)',
    imageUrl: '',
    timeSlots: ['morning', 'evening'],
    instructions: 'Uống sau ăn 30 phút. Đo HA trước khi uống.',
    conditionNote: 'Nếu HA tâm thu < 110: hoãn uống, gọi BS',
    isActive: true,
    sortOrder: 1,
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
  },
  {
    id: 'routine-med-02',
    stageId: 'stage-1',
    stageName: 'Mới về nhà - Chăm sóc tích cực',
    category: 'meds',
    medType: 'scheduled',
    title: 'Aspirin 81mg',
    dosage: '1 viên',
    description: 'Thuốc chống đông máu, ngừa tái phát đột quỵ - Viên nén nhỏ bao phim',
    imageUrl: '',
    timeSlots: ['morning'],
    instructions: 'Uống sau ăn sáng, không uống khi đói.',
    conditionNote: '',
    isActive: true,
    sortOrder: 2,
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
  },
  {
    id: 'routine-med-03',
    stageId: 'stage-1',
    stageName: 'Mới về nhà - Chăm sóc tích cực',
    category: 'meds',
    medType: 'scheduled',
    title: 'Atorvastatin 20mg',
    dosage: '1 viên',
    description: 'Thuốc hạ mỡ máu, ổn định thành mạch - Viên nén dài màu trắng',
    imageUrl: '',
    timeSlots: ['evening'],
    instructions: 'Uống buổi tối trước khi ngủ.',
    conditionNote: '',
    isActive: true,
    sortOrder: 3,
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
  },
  {
    id: 'routine-med-04',
    stageId: 'stage-1',
    stageName: 'Mới về nhà - Chăm sóc tích cực',
    category: 'meds',
    medType: 'as_needed',
    title: 'Paracetamol 500mg',
    dosage: '1 viên',
    description: 'Thuốc giảm đau, hạ sốt - Viên nén dài màu trắng (hoặc sủi)',
    imageUrl: '',
    timeSlots: [],
    instructions: 'Khi đau đầu hoặc sốt ≥ 38°C. Cách ít nhất 6 giờ giữa 2 lần.',
    conditionNote: 'Tối đa 3 viên/ngày',
    isActive: true,
    sortOrder: 10,
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
  },
  {
    id: 'routine-rehab-01',
    stageId: 'stage-1',
    stageName: 'Chăm sóc & Theo dõi tại nhà',
    category: 'rehab',
    title: 'Đi bộ / tập vận động nhẹ nhàng',
    dosage: '15–20 phút',
    timeSlots: ['morning', 'afternoon'],
    instructions: 'Tập vừa sức, nghỉ ngơi ngay nếu thấy mỏi hoặc chóng mặt.',
    conditionNote: '',
    isActive: true,
    sortOrder: 5,
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
  },
  {
    id: 'routine-care-01',
    stageId: 'stage-1',
    stageName: 'Chăm sóc & Theo dõi tại nhà',
    category: 'care',
    title: 'Uống đủ nước ấm & ăn nhạt giảm muối',
    dosage: 'Hằng ngày',
    timeSlots: ['morning', 'noon', 'afternoon', 'evening'],
    instructions: 'Chia nhỏ lượng nước uống trong ngày, hạn chế đồ mặn và dầu mỡ.',
    conditionNote: '',
    isActive: true,
    sortOrder: 6,
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
  },
];

// =============================================
// HỆ THỐNG XỬ LÝ NGÀY & MÚI GIỜ VIỆT NAM (UTC+7)
// Đảm bảo chính xác 100% trên cả Server (UTC) và PWA Điện Thoại
// =============================================

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

const WEEKDAY_VN_LABELS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

/**
 * Tách các thành phần ngày/giờ theo đúng múi giờ Việt Nam (UTC+7),
 * bất kể thiết bị hay server đang đặt ở múi giờ nào.
 */
export function getVietnamDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 (Chủ Nhật) -> 6 (Thứ Bảy)
} {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: VIETNAM_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== 'literal') {
        map[p.type] = p.value;
      }
    }
    const year = parseInt(map.year, 10);
    const month = parseInt(map.month, 10);
    const day = parseInt(map.day, 10);
    let hour = parseInt(map.hour, 10);
    if (hour === 24) hour = 0;
    const minute = parseInt(map.minute, 10);
    const second = parseInt(map.second, 10);

    // Tính thứ trong tuần theo đúng ngày lịch Việt Nam
    const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    const weekday = utcNoon.getUTCDay();

    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { year, month, day, hour, minute, second, weekday };
    }
  } catch {
    // Fallback cộng cứng UTC+7 nếu môi trường thiếu Intl timeZone
  }

  const vnTime = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return {
    year: vnTime.getUTCFullYear(),
    month: vnTime.getUTCMonth() + 1,
    day: vnTime.getUTCDate(),
    hour: vnTime.getUTCHours(),
    minute: vnTime.getUTCMinutes(),
    second: vnTime.getUTCSeconds(),
    weekday: vnTime.getUTCDay(),
  };
}

/**
 * Lấy chuỗi ngày hiện tại chuẩn YYYY-MM-DD theo đúng múi giờ Việt Nam (UTC+7).
 * Khắc phục triệt để lỗi .toISOString().slice(0, 10) bị lùi về ngày hôm trước khi đo trước 7h sáng!
 */
export function getVietnamDateStr(date: Date = new Date()): string {
  const { year, month, day } = getVietnamDateParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Lấy chuỗi giờ hiện tại chuẩn HH:mm (24h) theo đúng múi giờ Việt Nam (UTC+7).
 */
export function getVietnamTimeStr(date: Date = new Date()): string {
  const { hour, minute } = getVietnamDateParts(date);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Lấy giờ hiện tại (0 - 23) theo đúng múi giờ Việt Nam (UTC+7).
 */
export function getVietnamHour(date: Date = new Date()): number {
  return getVietnamDateParts(date).hour;
}

/**
 * Cộng/trừ số ngày dựa trên ngày Việt Nam hiện tại và trả về YYYY-MM-DD.
 */
export function getVietnamDateOffsetStr(daysOffset: number, baseDate: Date = new Date()): string {
  const { year, month, day } = getVietnamDateParts(baseDate);
  const utcNoon = new Date(Date.UTC(year, month - 1, day + daysOffset, 12, 0, 0));
  const y = utcNoon.getUTCFullYear();
  const m = String(utcNoon.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcNoon.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Tính số ngày chênh lệch (dateA - dateB) dựa trên chuỗi YYYY-MM-DD.
 * Ví dụ: diffDaysBetweenDateStr('2026-10-23', '2026-10-22') === 1.
 */
export function diffDaysBetweenDateStr(dateStrA: string, dateStrB: string): number {
  const normA = normalizeDateStr(dateStrA);
  const normB = normalizeDateStr(dateStrB);
  const [yA, mA, dA] = normA.split('-').map(Number);
  const [yB, mB, dB] = normB.split('-').map(Number);
  if (!yA || !mA || !dA || !yB || !mB || !dB) return 0;
  const utcA = Date.UTC(yA, mA - 1, dA, 12, 0, 0);
  const utcB = Date.UTC(yB, mB - 1, dB, 12, 0, 0);
  return Math.round((utcA - utcB) / (1000 * 60 * 60 * 24));
}

/**
 * Hiển thị ngày tiếng Việt thân thiện cho người lớn tuổi: "Thứ Sáu, 23/10/2026"
 */
export function formatVietnamDateFull(dateStr: string): string {
  const norm = normalizeDateStr(dateStr);
  const parts = (norm || '').split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return dateStr;
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekdayLabel = WEEKDAY_VN_LABELS[utcNoon.getUTCDay()] || '';
  return `${weekdayLabel}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

/** Hiển thị ngày ngắn gọn tiếng Việt: "23/10" */
export function formatDateShortVN(dateStr: string): string {
  if (!dateStr) return '';
  const norm = normalizeDateStr(dateStr);
  const parts = norm.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

/** Hiển thị ngày đầy đủ tiếng Việt: "23/10/2026" */
export function formatDateFullVN(dateStr: string): string {
  if (!dateStr) return '';
  const norm = normalizeDateStr(dateStr);
  const parts = norm.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Tự động nhận diện buổi hiện tại theo giờ Việt Nam (UTC+7) */
export function detectCurrentTimeSlot(date: Date = new Date()): TimeSlot {
  const hour = getVietnamHour(date);
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  return 'evening';
}

export type VitalAlertLevel = 'normal' | 'warning' | 'critical';

export type ClinicalBpCategory = 'low' | 'optimal' | 'normal_high' | 'stage1' | 'stage2';
export type ClinicalPulseCategory = 'none' | 'very_slow' | 'slow' | 'optimal' | 'normal_high' | 'fast';

export interface ClinicalBpResult {
  category: ClinicalBpCategory;
  alertLevel: VitalAlertLevel;
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotColor: string;
  barColor: string;
  clinicalNote: string;
}

export interface ClinicalPulseResult {
  category: ClinicalPulseCategory;
  alertLevel: VitalAlertLevel;
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotColor: string;
  barColor: string;
  clinicalNote: string;
}

export interface VitalAlertColorScheme {
  bg: string;
  border: string;
  text: string;
  badge: string;
  dot: string;
}

export interface VitalReadingEvaluation {
  overallAlertLevel: VitalAlertLevel;
  bp: ClinicalBpResult;
  pulse: ClinicalPulseResult;
  pp: number;
  ppStatus: 'narrow' | 'normal' | 'wide';
  ppLabel: string;
  ppBadgeClass: string;
  map: number;
  mapStatus: 'low' | 'normal' | 'high';
  mapLabel: string;
  mapBadgeClass: string;
  rpp: number | null;
  isBpInTarget: boolean;
  reasons: string[];
  badgeText: string;
  statusLabel: string;
  clinicalAdvice: string;
  colors: VitalAlertColorScheme;
}

/**
 * Bảng màu thống nhất cho 3 mức cảnh báo sinh hiệu (normal / warning / critical)
 * dùng chung trên toàn bộ ứng dụng.
 */
export function getVitalAlertColors(level: VitalAlertLevel): VitalAlertColorScheme {
  if (level === 'critical') {
    return {
      bg: 'bg-rose-50',
      border: 'border-rose-300',
      text: 'text-rose-700',
      badge: 'bg-rose-600 text-white',
      dot: '#e11d48',
    };
  }
  if (level === 'warning') {
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-700',
      badge: 'bg-amber-500 text-white',
      dot: '#f59e0b',
    };
  }
  return {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-600 text-white',
    dot: '#10b981',
  };
}

/**
 * Nhãn trạng thái chuẩn theo mức cảnh báo.
 */
export function getVitalAlertLabel(level: VitalAlertLevel): string {
  if (level === 'critical') return '🔴 Nguy hiểm';
  if (level === 'warning') return '🟡 Cảnh báo';
  return '🟢 Bình thường';
}

/**
 * Phân tầng Huyết áp chuẩn lâm sàng (VNHA / ESC / AHA HBPM cho bệnh nhân phục hồi sau đột quỵ).
 * Nguồn chân lý duy nhất (Single Source of Truth) cho toàn bộ hệ thống.
 */
export function classifyClinicalBp(
  sys: number,
  dia: number,
  thresholds: BpThresholds = DEFAULT_BP_THRESHOLDS,
  subjectName: string = 'Bố'
): ClinicalBpResult {
  const who = (subjectName || 'Bố').trim();
  // 1. Huyết áp thấp (Hạ áp - Nguy cơ giảm máu nuôi não)
  if (sys <= thresholds.lowSys || dia <= thresholds.lowDia) {
    const isCriticalLow = sys <= 90 || dia <= 50;
    return {
      category: 'low',
      alertLevel: isCriticalLow ? 'critical' : 'warning',
      label: isCriticalLow
        ? `Huyết áp quá thấp (${sys}/${dia} mmHg)`
        : `Huyết áp hơi thấp (≤${thresholds.lowSys}/${thresholds.lowDia} mmHg)`,
      shortLabel: isCriticalLow ? 'Huyết áp quá thấp' : 'Huyết áp hơi thấp',
      badgeClass: isCriticalLow
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : 'bg-amber-100 text-amber-800 border-amber-300',
      dotColor: isCriticalLow ? '#e11d48' : '#3b82f6',
      barColor: 'bg-blue-500',
      clinicalNote:
        `Huyết áp đang thấp hơn mức chuẩn, dễ gây hoa mắt, chóng mặt. Nên cho ${who} nằm nghỉ, kê thấp đầu, uống thêm nước ấm và kiểm tra lại thuốc huyết áp.`,
    };
  }

  // 2. Huyết áp cao vượt mức (≥160/100 mmHg)
  if (sys >= 160 || dia >= 100) {
    const isCrisis = sys >= 180 || dia >= 110;
    return {
      category: 'stage2',
      alertLevel: 'critical',
      label: isCrisis
        ? `Huyết áp rất cao - Nguy hiểm (≥180/110 mmHg)`
        : `Huyết áp cao vượt mức (≥160/100 mmHg)`,
      shortLabel: isCrisis ? 'Cao nguy hiểm' : 'Cao vượt mức',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      dotColor: '#e11d48',
      barColor: 'bg-rose-500',
      clinicalNote: isCrisis
        ? `Huyết áp tăng rất cao! Cho ${who} nằm nghỉ ngơi tuyệt đối, kiểm tra ngay các dấu hiệu bất thường (đau đầu, tê yếu tay chân, nói khó) và liên hệ Bác sĩ.`
        : `Huyết áp vượt ngưỡng an toàn (≥160/100 mmHg). Cần cho ${who} nằm nghỉ yên tĩnh 15–30 phút, kiểm tra việc uống thuốc hạ áp và đo lại.`,
    };
  }

  // 3. Huyết áp hơi cao (Vượt ngưỡng mục tiêu cấu hình, thường 140–159 / 90–99 mmHg)
  if (sys >= thresholds.highSys || dia >= thresholds.highDia) {
    return {
      category: 'stage1',
      alertLevel: 'warning',
      label: `Huyết áp hơi cao (${thresholds.highSys}–159 / ${thresholds.highDia}–99 mmHg)`,
      shortLabel: 'Huyết áp hơi cao',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      dotColor: '#f59e0b',
      barColor: 'bg-amber-500',
      clinicalNote:
        `Huyết áp cao hơn mức chuẩn một chút. Nên cho ${who} ngồi hoặc nằm nghỉ thư giãn 15 phút rồi đo kiểm tra lại.`,
    };
  }

  // 4. Huyết áp Tốt (Tối ưu <130/80 mmHg và trên ngưỡng thấp)
  if (sys < 130 && dia < 80) {
    return {
      category: 'optimal',
      alertLevel: 'normal',
      label: 'Huyết áp tốt nhất (<130/80 mmHg)',
      shortLabel: 'Tốt (Tối ưu)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      dotColor: '#10b981',
      barColor: 'bg-emerald-500',
      clinicalNote: `Huyết áp rất đẹp và êm, rất tốt cho sức khỏe và tim mạch của ${who}.`,
    };
  }

  // 5. Đạt chuẩn an toàn (130–139 / 80–89 mmHg)
  return {
    category: 'normal_high',
    alertLevel: 'normal',
    label: `Đạt chuẩn an toàn (130–${thresholds.highSys - 1}/80–${thresholds.highDia - 1} mmHg)`,
    shortLabel: 'Đạt chuẩn',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    dotColor: '#14b8a6',
    barColor: 'bg-teal-500',
    clinicalNote: 'Huyết áp nằm trong ngưỡng an toàn mục tiêu.',
  };
}

/**
 * Phân tầng Nhịp tim (Mạch) lúc nghỉ dễ hiểu, đồng nhất toàn ứng dụng:
 * - < 50 bpm: Mạch rất chậm (Nguy hiểm / Critical)
 * - 50–59 bpm: Mạch hơi chậm (Lưu ý / Warning)
 * - 60–79 bpm: Nhịp tốt (Normal)
 * - 80–99 bpm: Nhịp bình thường (Normal)
 * - ≥ 100 bpm: Mạch nhanh (Warning từ 100–119 bpm, Critical nếu ≥ 120 bpm)
 */
export function classifyClinicalPulse(
  pulse?: number | null,
  subjectName: string = 'Bố'
): ClinicalPulseResult {
  const who = (subjectName || 'Bố').trim();
  const p = typeof pulse === 'number' && !isNaN(pulse) ? pulse : 0;
  if (p <= 0) {
    return {
      category: 'none',
      alertLevel: 'normal',
      label: 'Chưa ghi mạch',
      shortLabel: '-',
      badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
      dotColor: '#94a3b8',
      barColor: 'bg-slate-300',
      clinicalNote: 'Chưa có dữ liệu nhịp tim ở lần đo này.',
    };
  }

  if (p < 50) {
    return {
      category: 'very_slow',
      alertLevel: 'critical',
      label: 'Mạch rất chậm (<50 nhịp/phút)',
      shortLabel: 'Mạch rất chậm',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      dotColor: '#e11d48',
      barColor: 'bg-rose-500',
      clinicalNote:
        `Nhịp tim đập dưới 50 lần/phút là khá chậm. Gia đình nên hỏi Bác sĩ xem thuốc đang uống có làm chậm nhịp tim không và theo dõi xem ${who} có mệt hay chóng mặt không.`,
    };
  }

  if (p < 60) {
    return {
      category: 'slow',
      alertLevel: 'warning',
      label: 'Mạch hơi chậm (50–59 nhịp/phút)',
      shortLabel: 'Mạch hơi chậm',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      dotColor: '#f59e0b',
      barColor: 'bg-amber-400',
      clinicalNote:
        `Nhịp tim hơi chậm (<60 lần/phút). Khi đỡ ${who} thay đổi tư thế (từ nằm sang ngồi hoặc đứng) nên làm từ từ để tránh choáng váng.`,
    };
  }

  if (p >= 100) {
    const isCriticalFast = p >= 120;
    return {
      category: 'fast',
      alertLevel: isCriticalFast ? 'critical' : 'warning',
      label: isCriticalFast ? 'Mạch rất nhanh (≥120 nhịp/phút)' : 'Mạch nhanh (≥100 nhịp/phút)',
      shortLabel: isCriticalFast ? 'Mạch rất nhanh' : 'Mạch nhanh',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      dotColor: '#e11d48',
      barColor: 'bg-rose-500',
      clinicalNote:
        `Nhịp tim đập nhanh lúc nghỉ (≥100 lần/phút). Cần kiểm tra xem ${who} có vừa tập vận động, bị đau mỏi, sốt hay thiếu nước không.`,
    };
  }

  if (p < 80) {
    return {
      category: 'optimal',
      alertLevel: 'normal',
      label: 'Nhịp tốt (60–79 nhịp/phút)',
      shortLabel: 'Nhịp tốt',
      badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      dotColor: '#10b981',
      barColor: 'bg-emerald-500',
      clinicalNote: 'Nhịp tim lúc nghỉ đều và êm, tim làm việc nhẹ nhàng.',
    };
  }

  return {
    category: 'normal_high',
    alertLevel: 'normal',
    label: 'Nhịp bình thường (80–99 nhịp/phút)',
    shortLabel: 'Nhịp bình thường',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    dotColor: '#14b8a6',
    barColor: 'bg-teal-500',
    clinicalNote: 'Nhịp tim nằm trong giới hạn bình thường (60–99 lần/phút).',
  };
}

/**
 * Kiểm tra xem Huyết áp có nằm trong đích an toàn mục tiêu hay không.
 * Dùng thống nhất cho tỷ lệ đạt chuẩn trên cả Thẻ tóm tắt và Báo cáo chi tiết.
 */
export function isBpInTargetRange(
  sys: number,
  dia: number,
  thresholds: BpThresholds = DEFAULT_BP_THRESHOLDS
): boolean {
  return classifyClinicalBp(sys, dia, thresholds).alertLevel === 'normal';
}

const ALERT_SEVERITY_RANK: Record<VitalAlertLevel, number> = {
  normal: 0,
  warning: 1,
  critical: 2,
};

/**
 * Tính mức cảnh báo tổng hợp (normal | warning | critical) từ Huyết áp và Nhịp tim.
 * Đồng bộ hoàn toàn với phân tầng classifyClinicalBp & classifyClinicalPulse.
 */
export function computeAlertLevel(
  sys: number,
  dia: number,
  thresholds: BpThresholds = DEFAULT_BP_THRESHOLDS,
  pulse?: number | null
): VitalAlertLevel {
  const bpLevel = classifyClinicalBp(sys, dia, thresholds).alertLevel;
  const pulseLevel = classifyClinicalPulse(pulse).alertLevel;
  return ALERT_SEVERITY_RANK[bpLevel] >= ALERT_SEVERITY_RANK[pulseLevel] ? bpLevel : pulseLevel;
}

/**
 * Đánh giá toàn diện 1 lần đo sinh hiệu (Huyết áp + Nhịp tim + Độ chênh 2 số + Áp lực máu nuôi não).
 * Sử dụng thống nhất ở mọi màn hình:
 * - Banner cảnh báo thông minh (SmartReminderBanner)
 * - Form nhập nhanh & So sánh lần đo trước (QuickVitalsForm)
 * - Thẻ sinh hiệu gần nhất, Nhật ký đối chiếu, Bảng lịch sử & Modal sửa (VitalsChartView)
 * - Báo cáo phân tích chi tiết (ClinicalVitalsReportSection)
 */
export function evaluateVitalReading(
  input: { sys: number; dia: number; pulse?: number | null },
  thresholds: BpThresholds = DEFAULT_BP_THRESHOLDS,
  subjectName: string = 'Bố'
): VitalReadingEvaluation {
  const sys = Number(input.sys) || 0;
  const dia = Number(input.dia) || 0;
  const pulseVal = typeof input.pulse === 'number' && !isNaN(input.pulse) ? input.pulse : 0;

  const bp = classifyClinicalBp(sys, dia, thresholds, subjectName);
  const pulse = classifyClinicalPulse(pulseVal, subjectName);
  const overallAlertLevel =
    ALERT_SEVERITY_RANK[bp.alertLevel] >= ALERT_SEVERITY_RANK[pulse.alertLevel]
      ? bp.alertLevel
      : pulse.alertLevel;

  // Độ chênh 2 số (Hiệu áp = Số trên - Số dưới)
  const pp = sys - dia;
  let ppStatus: 'narrow' | 'normal' | 'wide' = 'normal';
  let ppLabel = 'Độ chênh 2 số chuẩn (35–59 mmHg)';
  let ppBadgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
  if (pp >= 60) {
    ppStatus = 'wide';
    ppLabel = 'Độ chênh 2 số hơi rộng (≥60 mmHg)';
    ppBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (pp < 35) {
    ppStatus = 'narrow';
    ppLabel = 'Độ chênh 2 số hơi hẹp (<35 mmHg)';
    ppBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
  }

  // Áp lực máu nuôi não trung bình (MAP = DIA + PP/3)
  const map = Math.round(dia + pp / 3);
  let mapStatus: 'low' | 'normal' | 'high' = 'normal';
  let mapLabel = 'Máu nuôi não đủ (70–105)';
  let mapBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (map < 70) {
    mapStatus = 'low';
    mapLabel = 'Áp lực máu lên não hơi thấp (<70)';
    mapBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (map > 105) {
    mapStatus = 'high';
    mapLabel = 'Áp lực máu lên não cao (>105)';
    mapBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  // Chỉ số sức làm việc của tim (SYS * Pulse)
  const rpp = pulseVal > 0 ? sys * pulseVal : null;

  // Tổng hợp lý do cảnh báo cụ thể bằng tiếng Việt dễ hiểu
  const reasons: string[] = [];
  if (bp.category === 'stage2') {
    reasons.push(`${bp.shortLabel} (${sys}/${dia} mmHg)`);
  } else if (bp.category === 'stage1') {
    reasons.push(`Huyết áp hơi cao ${sys}/${dia} mmHg (trên mức ${thresholds.highSys}/${thresholds.highDia})`);
  } else if (bp.category === 'low') {
    reasons.push(`${bp.shortLabel} ${sys}/${dia} mmHg (dưới mức ${thresholds.lowSys}/${thresholds.lowDia})`);
  }

  if (pulse.category === 'very_slow') {
    reasons.push(`Mạch rất chậm (${pulseVal} lần/phút)`);
  } else if (pulse.category === 'slow') {
    reasons.push(`Mạch hơi chậm (${pulseVal} lần/phút)`);
  } else if (pulse.category === 'fast') {
    reasons.push(`${pulse.shortLabel} (${pulseVal} lần/phút)`);
  }

  // Nhãn tóm tắt trên Badge (Không gộp mập mờ khiến người đọc tưởng HA tốt là HA xấu)
  const statusIcon = overallAlertLevel === 'critical' ? '🔴' : overallAlertLevel === 'warning' ? '🟡' : '🟢';
  let badgeText = `🟢 ${bp.shortLabel}`;
  if (bp.alertLevel !== 'normal' && pulse.alertLevel !== 'normal') {
    badgeText = `${statusIcon} ${bp.shortLabel} • ${pulse.shortLabel}`;
  } else if (bp.alertLevel !== 'normal') {
    badgeText = `${statusIcon} ${bp.shortLabel}`;
  } else if (pulse.alertLevel !== 'normal') {
    badgeText = `🟢 HA Đạt chuẩn • ${statusIcon} ${pulse.shortLabel}`;
  }

  // Lời khuyên chăm sóc tổng hợp dễ hiểu
  let clinicalAdvice = bp.clinicalNote;
  if (bp.alertLevel === 'normal' && pulse.alertLevel !== 'normal') {
    clinicalAdvice = `Huyết áp đạt chuẩn an toàn, nhưng ${pulse.clinicalNote.charAt(0).toLowerCase()}${pulse.clinicalNote.slice(1)}`;
  } else if (bp.alertLevel !== 'normal' && pulse.alertLevel !== 'normal') {
    clinicalAdvice = `${bp.clinicalNote} Đồng thời: ${pulse.clinicalNote}`;
  }

  return {
    overallAlertLevel,
    bp,
    pulse,
    pp,
    ppStatus,
    ppLabel,
    ppBadgeClass,
    map,
    mapStatus,
    mapLabel,
    mapBadgeClass,
    rpp,
    isBpInTarget: bp.alertLevel === 'normal',
    reasons,
    badgeText,
    statusLabel: getVitalAlertLabel(overallAlertLevel),
    clinicalAdvice,
    colors: getVitalAlertColors(overallAlertLevel),
  };
}

/**
 * Chuẩn hóa mọi chuỗi ngày (YYYY-M-D, DD/MM/YYYY, ISO timestamp, Date string...)
 * về đúng định dạng chuẩn YYYY-MM-DD theo múi giờ Việt Nam (UTC+7).
 */
export function normalizeDateStr(raw: string | Date | undefined | null): string {
  if (!raw) return '';
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return '';
    return getVietnamDateStr(raw);
  }
  const str = String(raw).trim();
  if (!str) return '';
  // Nếu là chuỗi ISO có chứa giờ (VD: 2026-10-22T23:30:00.000Z) -> đổi sang đúng ngày lịch Việt Nam (UTC+7)
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return getVietnamDateStr(parsed);
    }
  }
  // YYYY-MM-DD hoặc YYYY-M-D thuần túy
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  // DD/MM/YYYY hoặc DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  // Chuỗi Date tự động từ Google Sheets (VD: "Fri Oct 23 2026 00:00:00 GMT+0700...")
  const parsedFallback = new Date(str);
  if (!isNaN(parsedFallback.getTime())) {
    return getVietnamDateStr(parsedFallback);
  }
  return str.substring(0, 10);
}

/**
 * Xác định ngày bắt đầu áp dụng (YYYY-MM-DD) của một đầu việc (Thuốc / Bài tập / Chăm sóc)
 * dựa trên trường createdAt hoặc timestamp nhúng trong ID (VD: routine-med-1761199200000).
 */
export function extractRoutineStartDateStr(
  createdAt?: string | null,
  routineId?: string | null
): string {
  if (createdAt) {
    const norm = normalizeDateStr(createdAt);
    if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) {
      return norm;
    }
  }
  if (routineId) {
    const tsMatch = String(routineId).match(/-(\d{13})$/);
    if (tsMatch) {
      const ts = Number(tsMatch[1]);
      if (!isNaN(ts) && ts > 1700000000000) {
        return getVietnamDateStr(new Date(ts));
      }
    }
  }
  return '';
}

/**
 * Chuẩn hóa mọi định dạng giờ:
 * - Chuỗi 24h: '07:30', '7:30', '16:30'
 * - Chuỗi tiếng Việt: '7h', '7h30', '07h30', '7h sáng', '7h tối', '7h chiều'
 * - Chuỗi 12h: '7:30 AM', '7:30 PM'
 * - Chuỗi Date từ Google Sheets / JS Date: 'Sat Dec 30 1899 07:30:00 GMT+0706 (Indochina Time)'
 * - Chuỗi ISO: '2026-11-22T06:30:00.000Z', '1899-12-30T07:30:00'
 * về đúng định dạng chuẩn HH:mm (24h, 2 chữ số giờ và phút).
 */
export function normalizeTimeStr(raw: string | Date | undefined | null): string {
  if (!raw) return '';
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return '';
    return getVietnamTimeStr(raw);
  }
  const str = String(raw).trim();
  if (!str) return '';

  // 1. Chuỗi Date từ Google Sheets / JS Date (VD: 'Sat Dec 30 1899 07:30:00 GMT+0706 (Indochina Time)')
  // Trích xuất trực tiếp cụm HH:mm(:ss) đã ở dạng 24h từ chuỗi Date
  const dateStrMatch = str.match(
    /(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s+[^:]*?|\b1899-\d{2}-\d{2}[T\s])(\d{1,2}):(\d{2})(?::\d{2})?/i
  );
  if (dateStrMatch) {
    const hh = parseInt(dateStrMatch[1], 10);
    const mm = parseInt(dateStrMatch[2], 10);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  // 2. ISO timestamp hiện đại có timezone (VD: '2026-11-22T06:30:00.000Z') -> đổi sang giờ VN
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return getVietnamTimeStr(parsed);
    }
  }

  // 3. Chuỗi giờ thông thường: 07:30, 7:30, 7h30, 7h, 7:30 PM, 7h tối...
  const match = str.match(/(\d{1,2})[:hH](\d{1,2})?/);
  if (match) {
    let hh = parseInt(match[1], 10);
    const mm = match[2] ? parseInt(match[2], 10) : 0;
    const lower = str.toLowerCase();

    // Kiểm tra có từ chỉ buổi chiều/tối (PM, chiều, tối, ch) bằng word boundary hoặc ở cuối chuỗi
    const isPm = /\b(pm|ch|chiều|tối)\b/i.test(lower) || /(?:pm|ch|chiều|tối)$/i.test(lower);
    const isAm = /\b(am|sa|sáng)\b/i.test(lower) || /(?:am|sa|sáng)$/i.test(lower);

    if (isPm && hh < 12) {
      hh += 12;
    } else if (isAm && hh === 12) {
      hh = 0;
    }
    hh = Math.max(0, Math.min(23, hh));
    const cleanM = Math.max(0, Math.min(59, mm));
    return `${String(hh).padStart(2, '0')}:${String(cleanM).padStart(2, '0')}`;
  }
  return str;
}

const PERIOD_SORT_RANK: Record<string, number> = {
  morning: 1,
  noon: 2,
  afternoon: 3,
  evening: 4,
};

const PERIOD_DEFAULT_MINUTES: Record<string, number> = {
  morning: 8 * 60,
  noon: 12 * 60,
  afternoon: 15 * 60,
  evening: 20 * 60,
};

/**
 * Đổi chuỗi giờ HH:mm ra tổng số phút trong ngày (0 -> 1439) để sắp xếp theo giá trị số học tuyệt đối.
 */
export function timeStrToMinutes(rawTime: string | undefined | null, fallbackPeriod?: string): number {
  const norm = normalizeTimeStr(rawTime);
  const match = norm.match(/^(\d{2}):(\d{2})$/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  if (fallbackPeriod && PERIOD_DEFAULT_MINUTES[fallbackPeriod] !== undefined) {
    return PERIOD_DEFAULT_MINUTES[fallbackPeriod];
  }
  return 0;
}

/**
 * So sánh 2 bản ghi sinh hiệu theo đúng trình tự thời gian TĂNG DẦN (Cũ trước -> Mới sau).
 * Dùng cho Biểu đồ xu hướng (trái qua phải).
 */
export function compareVitalsAsc(
  a: { date: string; time: string; period?: string; createdAt?: string },
  b: { date: string; time: string; period?: string; createdAt?: string }
): number {
  const dA = normalizeDateStr(a.date);
  const dB = normalizeDateStr(b.date);
  if (dA !== dB) return dA.localeCompare(dB);

  const mA = timeStrToMinutes(a.time, a.period);
  const mB = timeStrToMinutes(b.time, b.period);
  if (mA !== mB) return mA - mB;

  const pA = PERIOD_SORT_RANK[a.period || ''] || 0;
  const pB = PERIOD_SORT_RANK[b.period || ''] || 0;
  if (pA !== pB) return pA - pB;

  return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
}

/**
 * So sánh 2 bản ghi sinh hiệu theo đúng trình tự thời gian GIẢM DẦN (Mới nhất lên đầu).
 * Dùng cho thẻ HA gần nhất và bảng lịch sử.
 */
export function compareVitalsDesc(
  a: { date: string; time: string; period?: string; createdAt?: string },
  b: { date: string; time: string; period?: string; createdAt?: string }
): number {
  return compareVitalsAsc(b, a);
}

// =============================================
// QUICK TAGS THEO DÕI VÙNG KHUYẾT SỌ & TRIỆU CHỨNG HẰNG NGÀY (CHỜ MỔ GHÉP SỌ)
// =============================================

export interface VitalsQuickNoteTag {
  id: string;
  value: string;
  label: string;
  tone: 'good' | 'neutral' | 'warn';
  clinicalTip?: string;
}

export const VITALS_QUICK_NOTE_TAGS: VitalsQuickNoteTag[] = [
  {
    id: 'fine',
    value: 'Bố khỏe, tỉnh táo',
    label: '✅ Bố khỏe, tỉnh táo',
    tone: 'good',
  },
  {
    id: 'flap_normal',
    value: 'Khuyết sọ mềm/phẳng',
    label: '🛡️ Khuyết sọ mềm/phẳng',
    tone: 'good',
  },
  {
    id: 'flap_tense',
    value: 'Khuyết sọ hơi căng',
    label: '⚠️ Khuyết sọ hơi căng',
    tone: 'warn',
    clinicalTip:
      'Nếu vùng khuyết sọ căng phồng hơn bình thường (nhất là khi ngồi/nằm đầu cao mà vẫn căng) hoặc kèm đau đầu, buồn nôn: cho Bố nằm nghỉ đầu cao 30° và liên hệ Bác sĩ.',
  },
  {
    id: 'flap_sunken',
    value: 'Khuyết sọ hơi lõm sâu',
    label: '⚠️ Khuyết sọ hơi lõm sâu',
    tone: 'warn',
    clinicalTip:
      'Nếu vùng khuyết sọ lõm sâu kèm đau đầu, mệt lả khi ngồi/đứng dậy (hội chứng vạt da lõm): cho Bố nằm nghỉ đầu thấp/phẳng hơn và uống đủ nước ấm.',
  },
  {
    id: 'after_meds',
    value: 'Đo sau uống thuốc',
    label: '💊 Đo sau uống thuốc',
    tone: 'neutral',
  },
  {
    id: 'after_walk',
    value: 'Đo sau tập đi bộ',
    label: '🚶 Đo sau tập đi bộ',
    tone: 'neutral',
  },
  {
    id: 'dizzy_headache',
    value: 'Hơi chóng mặt / đau đầu',
    label: '😵 Hơi chóng mặt / đau đầu',
    tone: 'warn',
    clinicalTip:
      'Cho Bố ngồi hoặc nằm nghỉ yên tĩnh, không tự đi lại một mình để tránh vấp ngã bên trái, và đo kiểm tra lại sau 15–30 phút.',
  },
  {
    id: 'left_vision',
    value: 'Mỏi mắt / vướng nhìn trái',
    label: '👁️ Mỏi mắt / vướng nhìn trái',
    tone: 'neutral',
  },
];

export function isQuickNoteTagSelected(currentNote: string, tagValue: string): boolean {
  if (!currentNote.trim()) return false;
  const parts = currentNote
    .split(/[;,]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return parts.includes(tagValue.toLowerCase());
}

export function toggleQuickNoteTag(currentNote: string, tagValue: string): string {
  const rawParts = currentNote
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const idx = rawParts.findIndex((p) => p.toLowerCase() === tagValue.toLowerCase());
  if (idx >= 0) {
    rawParts.splice(idx, 1);
    return rawParts.join(', ');
  }
  return [...rawParts, tagValue].join(', ');
}

export const GENERAL_VITALS_QUICK_NOTE_TAGS: VitalsQuickNoteTag[] = [
  {
    id: 'gen_fine',
    value: 'Khỏe mạnh, dễ chịu',
    label: '✅ Khỏe mạnh, dễ chịu',
    tone: 'good',
  },
  {
    id: 'gen_after_meds',
    value: 'Đo sau uống thuốc',
    label: '💊 Đo sau uống thuốc',
    tone: 'neutral',
  },
  {
    id: 'gen_after_sport',
    value: 'Sau đánh Tennis / Đạp xe',
    label: '🎾 Sau đánh Tennis / Đạp xe',
    tone: 'neutral',
    clinicalTip:
      'Hãy ngồi nghỉ tĩnh 5-10 phút cho nhịp tim hạ về bình thường trước khi đo huyết áp. Uống bù đủ nước lọc/điện giải để tránh cô đặc máu gây khởi phát cơn Gout; buổi sáng trời rét ở Thái Nguyên cần mặc ấm và khởi động kỹ khớp vai/gối.',
  },
  {
    id: 'gen_gout_flare',
    value: 'Đau/sưng khớp chân (nghi Gout)',
    label: '🦶 Đau/sưng khớp chân (Gout)',
    tone: 'warn',
    clinicalTip:
      'Tạm ngưng đánh Tennis/đi bộ nhiều, kê cao chân nghỉ ngơi, uống 2-2.5 lít nước lọc, kiêng tuyệt đối rượu bia - nội tạng - hải sản - thịt đỏ. Không tự ý uống thuốc giảm đau mạnh khi chưa hỏi bác sĩ (dễ hại dạ dày & thận).',
  },
  {
    id: 'gen_ibs_pain',
    value: 'Đau bụng / Rối loạn đại tiện (IBS)',
    label: '🤢 Đau bụng / Rối loạn tiêu hóa (IBS)',
    tone: 'warn',
    clinicalTip:
      'Ghi chú thêm món ăn lạ, đồ lạnh hoặc rượu bia vừa dùng trước đó để tìm yếu tố kích hoạt ruột. Uống nước ấm, ăn nhẹ dễ tiêu; tránh tự ý dùng thuốc giảm đau nhóm NSAID.',
  },
  {
    id: 'gen_gallbladder_pain',
    value: 'Đau tức hạ sườn phải / Đầy sau ăn mỡ',
    label: '⚠️ Tức hạ sườn phải (Túi mật)',
    tone: 'warn',
    clinicalTip:
      'Cần theo dõi liên quan Polyp túi mật: hạn chế ngay đồ chiên xào, lòng đỏ trứng, mỡ động vật và rượu bia. Nếu đau quặn dữ dội kéo dài, sốt hoặc vàng mắt cần đi khám ngay.',
  },
  {
    id: 'gen_alcohol',
    value: 'Hôm nay có uống rượu/bia',
    label: '🍺 Hôm nay có uống rượu/bia',
    tone: 'warn',
    clinicalTip:
      'Rượu bia làm thận giảm thải Acid Uric (dễ bùng cơn Gout), kích thích co thắt ruột (IBS), tăng men gan GGT và khiến huyết áp dao động mạnh. Hãy uống xen kẽ nhiều nước lọc và không đo huyết áp ngay sau khi uống.',
  },
  {
    id: 'gen_smoking',
    value: 'Có hút thuốc lá',
    label: '🚬 Có hút thuốc lá',
    tone: 'warn',
    clinicalTip:
      'Nicotine gây co mạch tức thì, đẩy huyết áp tăng vọt và làm tăng nguy cơ xơ vữa mạch máu. Tránh hút thuốc ít nhất 30 phút trước khi đo huyết áp hoặc ngay sau khi chơi Tennis.',
  },
  {
    id: 'gen_dizzy',
    value: 'Hơi hoa mắt / chóng mặt',
    label: '😵 Hơi hoa mắt / chóng mặt',
    tone: 'warn',
    clinicalTip:
      'Nên ngồi hoặc nằm nghỉ yên tĩnh 15-20 phút, uống một ngụm nước ấm và đo kiểm tra lại huyết áp.',
  },
  {
    id: 'gen_headache',
    value: 'Hơi đau đầu / mỏi vai gáy',
    label: '🤕 Đau đầu / mỏi vai gáy',
    tone: 'warn',
    clinicalTip:
      'Nếu đau đầu kèm huyết áp tăng cao (>= 140/90 mmHg), cần nghỉ ngơi tuyệt đối và theo dõi sát để dùng thuốc theo chỉ định Bác sĩ.',
  },
  {
    id: 'gen_insomnia',
    value: 'Đêm qua khó ngủ / mất ngủ',
    label: '😴 Đêm qua khó ngủ',
    tone: 'neutral',
  },
  {
    id: 'gen_tired',
    value: 'Người hơi mệt / uể oải',
    label: '😮‍💨 Người hơi mệt',
    tone: 'warn',
    clinicalTip:
      'Chú ý xem nhịp mạch có quá chậm (<60 l/p) hoặc huyết áp có hơi tụt thấp hơn mọi ngày không.',
  },
];

export const THYROID_VITALS_QUICK_NOTE_TAGS: VitalsQuickNoteTag[] = [
  {
    id: 'thy_fine',
    value: 'Khỏe mạnh, dễ chịu',
    label: '✅ Khỏe mạnh, dễ chịu',
    tone: 'good',
  },
  {
    id: 'thy_meds_fasting',
    value: 'Đã uống thuốc giáp lúc đói',
    label: '💊 Đã uống thuốc giáp lúc đói',
    tone: 'good',
  },
  {
    id: 'thy_palpitation',
    value: 'Hồi hộp / tim đập nhanh',
    label: '💓 Hồi hộp / tim đập nhanh',
    tone: 'warn',
    clinicalTip:
      'Nếu hồi hộp, đánh trống ngực kèm nhịp mạch lúc nghỉ ≥ 95–100 lần/phút, cần lưu ý khả năng liều hormone Levothyroxine hơi cao (cường giáp dưới lâm sàng) để báo Bác sĩ chỉnh liều.',
  },
  {
    id: 'thy_calcium_tingling',
    value: 'Tê bì tay chân / co rút nhẹ',
    label: '⚡ Tê bì tay chân (Canxi)',
    tone: 'warn',
    clinicalTip:
      'Tê bì đầu ngón tay chân hoặc quanh miệng sau cắt toàn bộ tuyến giáp là dấu hiệu gợi ý thiếu Canxi máu. Nên kiểm tra việc uống Canxi + Vitamin D3 (uống cách thuốc giáp ít nhất 4 tiếng).',
  },
  {
    id: 'thy_tired_cold',
    value: 'Mệt mỏi / lạnh tay chân',
    label: '😮‍💨 Mệt mỏi / lạnh tay chân',
    tone: 'warn',
    clinicalTip:
      'Nếu mệt mỏi kéo dài kèm mạch chậm (<60 l/p) hoặc sợ lạnh, cần lưu ý kiểm tra chỉ số FT4, TSH ở kỳ xét nghiệm tới.',
  },
  {
    id: 'thy_dizzy',
    value: 'Hơi hoa mắt / chóng mặt',
    label: '😵 Hoa mắt / chóng mặt',
    tone: 'warn',
    clinicalTip:
      'Ngồi hoặc nằm nghỉ yên tĩnh 15 phút, uống nước ấm và đo kiểm tra lại huyết áp.',
  },
  {
    id: 'thy_insomnia',
    value: 'Đêm qua khó ngủ',
    label: '😴 Đêm qua khó ngủ',
    tone: 'neutral',
  },
  {
    id: 'thy_after_walk',
    value: 'Đo sau tập thể dục',
    label: '🚶 Đo sau tập thể dục',
    tone: 'neutral',
  },
];

export const YOUNG_FAMILY_VITALS_QUICK_NOTE_TAGS: VitalsQuickNoteTag[] = [
  {
    id: 'yf_fine',
    value: 'Khỏe mạnh, dễ chịu',
    label: '✅ Khỏe mạnh, dễ chịu',
    tone: 'good',
  },
  {
    id: 'yf_after_meds',
    value: 'Đo sau uống thuốc',
    label: '💊 Đo sau uống thuốc',
    tone: 'neutral',
  },
  {
    id: 'yf_back_ok',
    value: 'Lưng L5/S1 êm, không tê chân',
    label: '🦴 Lưng L5/S1 êm',
    tone: 'good',
  },
  {
    id: 'yf_back_pain',
    value: 'Đau thắt lưng / căng rễ S1',
    label: '⚠️ Đau lưng / căng rễ S1',
    tone: 'warn',
    clinicalTip:
      'Ưu tiên nằm tư thế giải áp 90/90 (gác cẳng chân lên gối cao 15-20p) hoặc nằm nghiêng kẹp gối giữa 2 chân. Tránh ngồi ghế cứng lâu, cúi gập hoặc vặn xoắn lưng; đi khám ngay nếu tê yếu chân tiến triển hoặc rối loạn tiểu tiện.',
  },
  {
    id: 'yf_cardio',
    value: 'Sau đạp xe / đi bộ / Gyro Ball',
    label: '🚴 Sau Cardio / Gyro Ball',
    tone: 'neutral',
    clinicalTip:
      'Ngồi nghỉ tĩnh 5-10 phút để nhịp tim hạ về mức nghỉ (đối chiếu Amazfit/Zepp) trước khi đo huyết áp. Uống bù đủ nước lọc để bảo vệ thận trái và hỗ trợ thải Acid Uric.',
  },
  {
    id: 'yf_dizzy',
    value: 'Hơi choáng / hạ HA tư thế',
    label: '😵 Hơi choáng / hạ HA tư thế',
    tone: 'warn',
    clinicalTip:
      'Huyết áp nền quanh ~100/65 mmHg; khi đang dùng thuốc giãn cơ/thần kinh (Myonal, Lyrica), cần ngồi thõng chân ở mép giường 1-2 phút trước khi đứng dậy để tránh choáng ngã.',
  },
  {
    id: 'yf_insomnia',
    value: 'Đêm qua khó ngủ / mất ngủ',
    label: '😴 Đêm qua khó ngủ',
    tone: 'neutral',
  },
  {
    id: 'yf_tired',
    value: 'Người hơi mệt / uể oải',
    label: '😮‍💨 Người hơi mệt',
    tone: 'warn',
    clinicalTip:
      'Kiểm tra xem có thiếu nước hoặc tác dụng phụ buồn ngủ/mệt từ thuốc buổi tối không; đo lại huyết áp và mạch lúc nghỉ.',
  },
];

import { PEDIATRIC_VITALS_QUICK_NOTE_TAGS } from './adaptiveProfileConfig';

export function getQuickNoteTagsForProfile(
  profileType: HealthProfileType = 'post_stroke_cranioplasty'
): VitalsQuickNoteTag[] {
  if (profileType === 'post_stroke_cranioplasty') {
    return VITALS_QUICK_NOTE_TAGS;
  }
  if (profileType === 'thyroid_post_op') {
    return THYROID_VITALS_QUICK_NOTE_TAGS;
  }
  if (profileType === 'pediatric') {
    return PEDIATRIC_VITALS_QUICK_NOTE_TAGS;
  }
  if (IS_YOUNG_FAMILY_MODE) {
    return YOUNG_FAMILY_VITALS_QUICK_NOTE_TAGS;
  }
  return GENERAL_VITALS_QUICK_NOTE_TAGS;
}

// =============================================
// MULTI-PROFILE - HỆ THỐNG ĐA HỒ SƠ SỨC KHỎE GIA ĐÌNH (100% TƯƠNG THÍCH NGƯỢC)
// =============================================

export const DEFAULT_HEALTH_PROFILE_ID = 'father';

/**
 * Trích xuất mã hồ sơ (`profileId`) từ `id` hoặc `routineId` của bản ghi.
 * - Các bản ghi cũ hoặc của Bố không có tiền tố `p_<id>__` -> trả về `'father'`.
 * - Các bản ghi của thành viên khác có dạng `p_<profileId>__...` hoặc `dl-YYYY-MM-DD-p_<profileId>__...` -> trả về `<profileId>`.
 */
export function extractRecordProfileId(idOrRoutineId: string | undefined | null): string {
  if (!idOrRoutineId) return DEFAULT_HEALTH_PROFILE_ID;
  const str = String(idOrRoutineId).trim();
  const directMatch = str.match(/^p_([a-zA-Z0-9_-]+)__/);
  if (directMatch && directMatch[1]) {
    return directMatch[1];
  }
  const dlMatch = str.match(/^dl-\d{4}-\d{2}-\d{2}-p_([a-zA-Z0-9_-]+)__/);
  if (dlMatch && dlMatch[1]) {
    return dlMatch[1];
  }
  const labFallbackMatch = str.match(/^lab_p_([a-zA-Z0-9_-]+)__/);
  if (labFallbackMatch && labFallbackMatch[1]) {
    return labFallbackMatch[1];
  }
  return DEFAULT_HEALTH_PROFILE_ID;
}

/**
 * Đảm bảo ID của bản ghi (Vitals, CareRoutine, Reminder, LabResult) mang tiền tố đúng của hồ sơ đang chọn.
 * Với hồ sơ mặc định của Bố (`'father'`), giữ nguyên ID gốc không gắn tiền tố để tương thích 100% dữ liệu cũ.
 */
export function ensureRecordProfilePrefix(
  rawId: string,
  profileId: string = DEFAULT_HEALTH_PROFILE_ID
): string {
  const cleanProfileId = (profileId || DEFAULT_HEALTH_PROFILE_ID).trim();
  const stripped = String(rawId || '')
    .trim()
    .replace(/^p_[a-zA-Z0-9_-]+__/, '');
  if (!cleanProfileId || cleanProfileId === DEFAULT_HEALTH_PROFILE_ID) {
    return stripped;
  }
  return `p_${cleanProfileId}__${stripped}`;
}

/**
 * Tổng hợp danh sách Hồ sơ Sức khỏe của gia đình:
 * 1. Hồ sơ số 1 luôn là Bố (`id: 'father'`) lấy từ dữ liệu gốc (hoặc Bố Thành Đô trên web Ông Bà Nội).
 * 2. Tự động khởi tạo sẵn hồ sơ số 2 cho Mẹ (`id: 'mother'` - Mẹ Bạch Yến trên web Ông Bà Nội) nếu chưa có để gia đình dùng ngay.
 * 3. Kết hợp thêm các hồ sơ thành viên khác đã lưu trong `patientInfo.healthProfiles` (hỗ trợ CRUD 100% trên web).
 */
export function buildResolvedHealthProfiles(
  fatherPatientInfo: PatientInfo,
  fatherThresholds: BpThresholds = DEFAULT_BP_THRESHOLDS,
  fatherAppointment: AppointmentInfo = DEFAULT_APPOINTMENT,
  members: FamilyMember[] = []
): HealthProfile[] {
  const savedList = Array.isArray(fatherPatientInfo.healthProfiles)
    ? fatherPatientInfo.healthProfiles
    : [];

  const findLinkedMember = (
    linkedMemberId: string | undefined,
    profileName: string,
    profileId?: string
  ): FamilyMember | undefined => {
    if (linkedMemberId) {
      const byId = members.find((m) => m.id === linkedMemberId);
      if (byId) return byId;
    }
    if (profileId) {
      const mappedId = `mem-${profileId}`;
      const byMappedId = members.find(
        (m) =>
          m.id === mappedId ||
          (profileId === 'father' && (m.id === 'mem-father' || m.relation === 'Bản thân' || m.relation === 'Bố')) ||
          (profileId === 'mother' && (m.id === 'mem-mother' || m.relation === 'Vợ' || m.relation === 'Mẹ')) ||
          (profileId === 'child-1' && (m.id === 'mem-child-1' || m.relation.includes('thứ 1') || m.relation.includes('đầu'))) ||
          (profileId === 'child-2' && (m.id === 'mem-child-2' || m.relation.includes('thứ 2'))) ||
          (profileId === 'child-3' && (m.id === 'mem-child-3' || m.relation.includes('thứ 3') || m.relation.includes('út')))
      );
      if (byMappedId) return byMappedId;
    }
    const cleanName = (profileName || '').trim().toLowerCase();
    if (cleanName) {
      return members.find((m) => (m.name || '').trim().toLowerCase() === cleanName);
    }
    return undefined;
  };

  // Tìm bản lưu tùy chỉnh của Thành viên chính (id: DEFAULT_HEALTH_PROFILE_ID) nếu người dùng đã chỉnh sửa Vai vế / Icon / Nhóm bệnh lý trên web
  const savedPrimary = savedList.find((p) => p && p.id === DEFAULT_HEALTH_PROFILE_ID);

  // Kiểm tra nếu người dùng đã chủ động xóa Thành viên chính (id: 'father') khi có nhiều hơn 1 hồ sơ
  const isPrimaryExplicitlyDeleted =
    savedList.length > 0 &&
    !savedPrimary &&
    Boolean(fatherPatientInfo.name) &&
    Boolean(savedList[0]?.name) &&
    fatherPatientInfo.name.trim().toLowerCase() === savedList[0].name.trim().toLowerCase();

  // Chuẩn hoá tên & chẩn đoán mặc định cho Thành viên chính (tôn trọng 100% mọi chỉnh sửa của user trên web)
  const rawFatherName = (savedPrimary?.name || fatherPatientInfo.name || '').trim();
  const isUneditedLegacyFatherName =
    !rawFatherName ||
    ((IS_FAMILY_STANDARD_MODE || IS_YOUNG_FAMILY_MODE) &&
      (rawFatherName === 'Đinh Hồng Phong' || rawFatherName === 'Bố'));

  const resolvedFatherName = isUneditedLegacyFatherName ? DEFAULT_MEMBER_NAME : rawFatherName;

  // Nhận diện thông minh nếu người dùng đã đổi Thành viên chính thành Mẹ (VD: "Đoàn Thị Bạch Yến", "Mẹ Bạch Yến", hoặc chọn Vai vế = "Mẹ")
  const lowerPrimaryName = resolvedFatherName.toLowerCase();
  const lowerSavedRelation = (savedPrimary?.relation || '').trim().toLowerCase();
  const isMotherPrimary =
    lowerSavedRelation === 'mẹ' ||
    lowerSavedRelation === 'bà' ||
    (!savedPrimary?.relation &&
      (lowerPrimaryName.includes('bạch yến') ||
        lowerPrimaryName.startsWith('mẹ') ||
        lowerPrimaryName.startsWith('bà')));

  const matchedPrimaryMember = findLinkedMember(
    savedPrimary?.linkedMemberId,
    resolvedFatherName,
    DEFAULT_HEALTH_PROFILE_ID
  );

  const primaryRelation =
    savedPrimary?.relation?.trim() ||
    matchedPrimaryMember?.relation?.trim() ||
    (isMotherPrimary ? 'Mẹ' : IS_YOUNG_FAMILY_MODE ? 'Bản thân' : 'Bố');

  const primaryAvatarEmoji =
    savedPrimary?.avatarEmoji?.trim() ||
    (isMotherPrimary
      ? IS_FAMILY_STANDARD_MODE
        ? '👵'
        : '👩'
      : IS_FAMILY_STANDARD_MODE
        ? '👴'
        : '👨');

  const primaryProfileType: HealthProfileType =
    savedPrimary?.profileType ||
    (isMotherPrimary && IS_FAMILY_STANDARD_MODE
      ? 'thyroid_post_op'
      : IS_FAMILY_STANDARD_MODE || IS_YOUNG_FAMILY_MODE
        ? 'general_health'
        : 'post_stroke_cranioplasty');

  const rawFatherDiag = (
    savedPrimary?.patientInfo?.diagnosis ||
    fatherPatientInfo.diagnosis ||
    ''
  ).trim();
  const isUneditedLegacyFatherDiag =
    !rawFatherDiag ||
    ((IS_FAMILY_STANDARD_MODE || IS_YOUNG_FAMILY_MODE) &&
      (rawFatherDiag.toLowerCase().includes('đột quỵ') ||
        rawFatherDiag.toLowerCase().includes('tai biến')));

  const resolvedFatherDiag = isUneditedLegacyFatherDiag
    ? IS_YOUNG_FAMILY_MODE
      ? 'Thoát vị đĩa đệm L5/S1 chèn ép rễ S1 • Sỏi thận trái • Theo dõi Acid Uric & Mỡ máu'
      : IS_FAMILY_STANDARD_MODE
        ? isMotherPrimary
          ? 'Đã phẫu thuật cắt toàn bộ tuyến giáp (K giáp thể nhú) • Duy trì hormone Levothyroxine & Kiểm soát Huyết áp, Mỡ máu, Canxi'
          : 'Tim mạch & Huyết áp • Theo dõi Gout tái phát • Hội chứng ruột kích thích (IBS) • Polyp túi mật định kỳ'
        : 'Đang phục hồi chức năng sau đột quỵ (tai biến mạch máu não)'
    : rawFatherDiag;

  const rawHospital = savedPrimary?.patientInfo?.hospital || fatherPatientInfo.hospital || '';
  const resolvedFatherHospital =
    IS_YOUNG_FAMILY_MODE &&
    (!rawHospital || rawHospital.toLowerCase().includes('bạch mai'))
      ? 'BV Đa khoa Hà Đông & Theo dõi định kỳ (Hà Nội)'
      : IS_FAMILY_STANDARD_MODE &&
          (!rawHospital || rawHospital.toLowerCase().includes('bạch mai'))
        ? 'Khám & kiểm tra sức khỏe định kỳ (Thái Nguyên)'
        : rawHospital || 'Khám & kiểm tra định kỳ';

  const rawNotes = savedPrimary?.patientInfo?.notes || fatherPatientInfo.notes || '';
  const resolvedFatherNotes =
    IS_YOUNG_FAMILY_MODE && !rawNotes
      ? 'Uống đủ 2-2.5L nước/ngày, ăn nhạt giảm muối, kiêng cá sông, tôm, cua và đồ giàu purin. Tập Cardio tác động thấp (đạp xe, đi bộ) & Gyro Ball khi hết đau cấp.'
      : IS_FAMILY_STANDARD_MODE && !rawNotes
        ? isMotherPrimary
          ? 'Uống thuốc hormone tuyến giáp buổi sáng lúc bụng đói, theo dõi huyết áp, nhịp tim và canxi.'
          : 'Nghỉ tĩnh 5-10 phút sau đánh Tennis/đạp xe trước khi đo HA. Uống đủ 2-2.5L nước/ngày để thải Acid Uric ngừa Gout và bảo vệ thận. Hạn chế rượu bia, thuốc lá, đồ mỡ/purin; theo dõi kích thước Polyp túi mật khi siêu âm định kỳ.'
        : rawNotes ||
          'Đo huyết áp hàng ngày, uống thuốc đúng giờ, tập vận động và nghỉ ngơi đều đặn.';

  const defaultFatherCustomFields: PatientCustomField[] = IS_YOUNG_FAMILY_MODE
    ? [
        {
          id: 'cf-tl-spine',
          label: 'Cột sống L5/S1 (MRI 17/03/2026)',
          value:
            'Thoát vị nhẹ L5/S1 thể trung tâm, hẹp ống sống 11 mm, chèn ép rễ S1 hai bên. Tránh cúi gập/tải nặng; dùng tư thế 90/90 khi đau cấp.',
          section: 'profile',
        },
        {
          id: 'cf-tl-kidney-uric',
          label: 'Sỏi thận trái & Acid Uric (466 µmol/L)',
          value:
            'Creatinin 110 µmol/L; uống 2-2.5L nước/ngày, ăn nhạt, hạn chế purin và theo dõi thận khi dùng NSAID.',
          section: 'profile',
        },
        {
          id: 'cf-tl-diet-cardio',
          label: 'Dinh dưỡng & Cardio (Amazfit/Zepp)',
          value:
            'Tuyệt đối kiêng cá sông, tôm, cua; ưu tiên cá biển, rau luộc. Duy trì đạp xe trong nhà, đi bộ và Gyro Ball khi lưng ổn định.',
          section: 'care',
        },
      ]
    : IS_FAMILY_STANDARD_MODE && !isMotherPrimary
      ? [
          {
            id: 'cf-father-polyp',
            label: 'Polyp túi mật định kỳ',
            value:
              'Theo dõi kích thước (mm) qua siêu âm 6 tháng/lần (cảnh báo nếu tăng nhanh hoặc >= 10mm)',
            section: 'profile',
          },
          {
            id: 'cf-father-gout-ibs',
            label: 'Tiền sử Gout & Ruột kích thích (IBS)',
            value:
              'Từng phát Gout sưng chân vài lần & nhập viện đau bụng IBS - hạn chế rượu bia, thuốc lá, nội tạng, đồ cay/mỡ',
            section: 'profile',
          },
          {
            id: 'cf-father-sport',
            label: 'Thể thao & Sinh hoạt (Thái Nguyên)',
            value:
              'Chơi Tennis, đi bộ & đạp xe đều; khởi động kỹ khớp vai/gối, giữ ấm sáng sớm rét và bù nước điện giải',
            section: 'care',
          },
        ]
      : [];

  const existingFatherCustomFields =
    savedPrimary?.patientInfo?.customFields && savedPrimary.patientInfo.customFields.length > 0
      ? savedPrimary.patientInfo.customFields
      : fatherPatientInfo.customFields && fatherPatientInfo.customFields.length > 0
        ? fatherPatientInfo.customFields
        : defaultFatherCustomFields;

  // 1. Hồ sơ của Thành viên chính (mặc định id: 'father', hỗ trợ đổi sang Mẹ hoặc bất kỳ vai vế/icon nào)
  const fatherProfile: HealthProfile = {
    id: DEFAULT_HEALTH_PROFILE_ID,
    name: resolvedFatherName,
    relation: primaryRelation,
    avatarEmoji: primaryAvatarEmoji,
    profileType: primaryProfileType,
    linkedMemberId: matchedPrimaryMember?.id || savedPrimary?.linkedMemberId,
    patientInfo: {
      ...fatherPatientInfo,
      ...(savedPrimary?.patientInfo || {}),
      name: resolvedFatherName,
      diagnosis: resolvedFatherDiag,
      hospital: resolvedFatherHospital,
      notes: resolvedFatherNotes,
      customFields: existingFatherCustomFields,
      birthDate:
        savedPrimary?.patientInfo?.birthDate ||
        fatherPatientInfo.birthDate ||
        (IS_YOUNG_FAMILY_MODE ? '1988-12-28' : undefined),
      gender:
        savedPrimary?.patientInfo?.gender ||
        fatherPatientInfo.gender ||
        (IS_YOUNG_FAMILY_MODE ? 'male' : undefined),
      statusBadge:
        (IS_FAMILY_STANDARD_MODE || IS_YOUNG_FAMILY_MODE) &&
        (!fatherPatientInfo.statusBadge ||
          fatherPatientInfo.statusBadge.includes('đặc biệt'))
          ? 'Hồ sơ sức khỏe gia đình'
          : fatherPatientInfo.statusBadge || 'Theo dõi sức khỏe gia đình',
      conditionTag:
        IS_YOUNG_FAMILY_MODE &&
        (!fatherPatientInfo.conditionTag ||
          fatherPatientInfo.conditionTag.includes('Tai biến') ||
          fatherPatientInfo.conditionTag.includes('Phục hồi'))
          ? 'L5/S1 • Sỏi thận • Acid Uric • Cardio'
          : IS_FAMILY_STANDARD_MODE &&
              (!fatherPatientInfo.conditionTag ||
                fatherPatientInfo.conditionTag.includes('Tai biến'))
            ? primaryProfileType === 'thyroid_post_op'
              ? 'Tuyến giáp • HA • Mỡ máu'
              : 'Tim mạch • Gout • IBS • Polyp mật'
            : fatherPatientInfo.conditionTag || 'Phục hồi tại nhà',
      careMode:
        (IS_FAMILY_STANDARD_MODE || IS_YOUNG_FAMILY_MODE) &&
        fatherPatientInfo.careMode === 'Liên tục 24/7'
          ? 'Hằng ngày'
          : fatherPatientInfo.careMode || 'Hằng ngày',
      careGoal:
        IS_YOUNG_FAMILY_MODE &&
        (!fatherPatientInfo.careGoal || fatherPatientInfo.careGoal.includes('SpO2'))
          ? 'Ổn định L5/S1, thải sỏi thận, hạ Acid Uric <360 & duy trì Cardio'
          : IS_FAMILY_STANDARD_MODE &&
              (!fatherPatientInfo.careGoal || fatherPatientInfo.careGoal.includes('SpO2'))
            ? 'Ổn định HA, mỡ máu, GGT, Acid Uric <360 & theo dõi Polyp túi mật'
            : fatherPatientInfo.careGoal || 'Duy trì huyết áp & sức khỏe ổn định',
      healthProfiles: undefined,
    },
    bpThresholds: savedPrimary?.bpThresholds || fatherThresholds || DEFAULT_BP_THRESHOLDS,
    appointment: savedPrimary?.appointment || fatherAppointment || DEFAULT_APPOINTMENT,
  };

  // 2. Các hồ sơ thành viên khác đã lưu
  const otherProfiles: HealthProfile[] = savedList
    .filter((p) => p && p.id && p.id !== DEFAULT_HEALTH_PROFILE_ID)
    .map((p) => {
      const isSecondSlotOnStandardWeb = IS_FAMILY_STANDARD_MODE && p.id === 'mother';
      // Nếu Thành viên chính (số 1) đã được người dùng đổi thành Mẹ, và hồ sơ số 2 chưa chỉnh sửa -> hồ sơ số 2 mặc định là Bố Thành Đô
      const isSecondSlotDefaultFather =
        isSecondSlotOnStandardWeb &&
        isMotherPrimary &&
        (!p.name || p.name === 'Mẹ' || p.name === DEFAULT_MOTHER_NAME);

      const defaultProfileType: HealthProfileType = isSecondSlotOnStandardWeb
        ? isSecondSlotDefaultFather
          ? 'general_health'
          : 'thyroid_post_op'
        : 'general_health';

      const isPlaceholderChildName =
        IS_YOUNG_FAMILY_MODE &&
        Boolean(p.name) &&
        (p.name === 'Bé 1' ||
          p.name === 'Bé 2' ||
          p.name === 'Bé 3' ||
          p.name === 'Con 1' ||
          p.name === 'Con 2' ||
          p.name === 'Con 3');

      const isPlaceholderMotherName =
        IS_YOUNG_FAMILY_MODE &&
        (p.id === 'mother' || p.relation === 'Vợ') &&
        (!p.name || p.name === 'Vợ' || p.name === 'Mẹ');

      const matchedMember = findLinkedMember(p.linkedMemberId, p.name || '', p.id);

      const resolvedName = isSecondSlotDefaultFather
        ? DEFAULT_MEMBER_NAME
        : isSecondSlotOnStandardWeb && (!p.name || p.name === 'Mẹ')
          ? DEFAULT_MOTHER_NAME
          : matchedMember?.name &&
              (isPlaceholderChildName ||
                isPlaceholderMotherName ||
                !p.name ||
                !matchedMember.name.startsWith('Bé '))
            ? matchedMember.name
            : p.name || matchedMember?.name || 'Thành viên';

      const resolvedRelation = isSecondSlotDefaultFather
        ? 'Bố'
        : matchedMember?.relation ||
          p.relation ||
          (p.id === 'mother' ? (IS_YOUNG_FAMILY_MODE ? 'Vợ' : 'Mẹ') : 'Gia đình');

      const resolvedEmoji = isSecondSlotDefaultFather
        ? '👴'
        : p.avatarEmoji || (isSecondSlotOnStandardWeb ? '👵' : '👩');

      return {
        id: p.id,
        name: resolvedName,
        relation: resolvedRelation,
        avatarEmoji: resolvedEmoji,
        profileType: p.profileType || defaultProfileType,
        linkedMemberId: matchedMember?.id || p.linkedMemberId,
        patientInfo: {
          name:
            p.patientInfo?.name &&
            p.patientInfo.name !== 'Mẹ' &&
            p.patientInfo.name !== 'Vợ' &&
            !p.patientInfo.name.startsWith('Bé ') &&
            !isSecondSlotDefaultFather
              ? p.patientInfo.name
              : resolvedName,
          diagnosis:
            p.patientInfo?.diagnosis ??
            (isSecondSlotOnStandardWeb && !isSecondSlotDefaultFather
              ? 'Đã phẫu thuật cắt toàn bộ tuyến giáp (K giáp thể nhú) • Duy trì hormone Levothyroxine & Kiểm soát Huyết áp, Mỡ máu, Canxi'
              : 'Theo dõi huyết áp, nhịp tim & sức khỏe định kỳ'),
          hospital:
            p.patientInfo?.hospital ??
            (isSecondSlotOnStandardWeb && !isSecondSlotDefaultFather
              ? 'Khám chuyên khoa Nội tiết & Tim mạch định kỳ'
              : 'Khám định kỳ'),
          room: p.patientInfo?.room ?? 'Tại nhà',
          notes:
            p.patientInfo?.notes ??
            (isSecondSlotOnStandardWeb && !isSecondSlotDefaultFather
              ? 'Uống Levothyroxine buổi sáng lúc bụng đói (trước ăn 30–60 phút), cách xa Canxi/Sắt ít nhất 4 tiếng. Theo dõi nhịp tim, huyết áp và dấu hiệu tê bì tay chân.'
              : 'Đo huyết áp định kỳ sáng/tối, uống đủ nước ấm, nghỉ ngơi hợp lý.'),
          emergencyPhone:
            p.patientInfo?.emergencyPhone ||
            matchedMember?.phone ||
            fatherPatientInfo.emergencyPhone ||
            '',
          statusBadge:
            p.patientInfo?.statusBadge ||
            (isSecondSlotOnStandardWeb && !isSecondSlotDefaultFather
              ? 'Theo dõi Tuyến giáp & Tim mạch'
              : 'Theo dõi sức khỏe gia đình'),
          conditionTag:
            p.patientInfo?.conditionTag ||
            (isSecondSlotOnStandardWeb && !isSecondSlotDefaultFather
              ? 'Tuyến giáp • HA • Mỡ máu'
              : 'Huyết áp & Tim mạch'),
          headerBadge: p.patientInfo?.headerBadge || 'Tại nhà',
          careMode: p.patientInfo?.careMode || 'Hằng ngày',
          careGoal:
            p.patientInfo?.careGoal ||
            (isSecondSlotOnStandardWeb && !isSecondSlotDefaultFather
              ? 'Ức chế TSH mục tiêu • Ổn định HA, Mạch & Canxi'
              : 'Duy trì huyết áp & nhịp tim ổn định'),
          customFields: Array.isArray(p.patientInfo?.customFields)
            ? p.patientInfo.customFields
            : [],
        },
        bpThresholds: p.bpThresholds || { ...DEFAULT_BP_THRESHOLDS },
        appointment: p.appointment || { ...DEFAULT_APPOINTMENT },
      };
    });

  // Chỉ tự động tạo sẵn hồ sơ thứ 2 ('mother') khi danh sách savedList chưa từng được lưu (savedList.length === 0)
  // Nếu người dùng đã chỉnh sửa/xóa hồ sơ trên web (savedList.length > 0), tôn trọng 100% danh sách người dùng đã lưu!
  if (savedList.length === 0 && !otherProfiles.some((p) => p.id === 'mother')) {
    if (IS_FAMILY_STANDARD_MODE && isMotherPrimary) {
      const fatherMember = findLinkedMember(undefined, DEFAULT_MEMBER_NAME);
      otherProfiles.unshift({
        id: 'mother',
        name: DEFAULT_MEMBER_NAME,
        relation: 'Bố',
        avatarEmoji: '👴',
        profileType: 'general_health',
        linkedMemberId: fatherMember?.id,
        patientInfo: {
          name: DEFAULT_MEMBER_NAME,
          diagnosis: 'Theo dõi huyết áp, tim mạch, mỡ máu & chăm sóc sức khỏe hằng ngày',
          hospital: 'Khám định kỳ',
          room: 'Tại nhà',
          notes: 'Đo huyết áp định kỳ sáng/tối, uống thuốc đúng giờ, tập vận động nhẹ nhàng.',
          emergencyPhone: fatherPatientInfo.emergencyPhone || '',
          statusBadge: 'Sức khỏe gia đình',
          conditionTag: 'Huyết áp & Tim mạch',
          headerBadge: 'Tại nhà',
          careMode: 'Hằng ngày',
          careGoal: 'Duy trì huyết áp & nhịp tim ổn định',
          customFields: [],
        },
        bpThresholds: { ...DEFAULT_BP_THRESHOLDS },
        appointment: {
          nextDate: '',
          nextNote: '',
          nextWho: '',
          lastDate: '',
          lastNote: '',
        },
      });
    } else {
      const motherMember = members.find(
        (m) =>
          m.name.toLowerCase().includes('mẹ') ||
          m.relation.toLowerCase().includes('mẹ') ||
          m.relation.toLowerCase().includes('vợ')
      );
      const motherDisplayName = IS_YOUNG_FAMILY_MODE
        ? DEFAULT_MOTHER_NAME
        : IS_FAMILY_STANDARD_MODE
          ? DEFAULT_MOTHER_NAME
          : motherMember
            ? motherMember.name
            : 'Mẹ';

      otherProfiles.unshift({
        id: 'mother',
        name: motherDisplayName,
        relation: IS_YOUNG_FAMILY_MODE ? 'Vợ' : 'Mẹ',
        avatarEmoji: IS_FAMILY_STANDARD_MODE ? '👵' : '👩',
        profileType: IS_FAMILY_STANDARD_MODE ? 'thyroid_post_op' : 'general_health',
        linkedMemberId: motherMember?.id,
        patientInfo: {
          name: motherDisplayName,
          diagnosis: IS_FAMILY_STANDARD_MODE
            ? 'Đã phẫu thuật cắt toàn bộ tuyến giáp (K giáp thể nhú) • Duy trì hormone Levothyroxine & Kiểm soát Huyết áp, Mỡ máu, Canxi'
            : 'Theo dõi huyết áp, tim mạch & chăm sóc sức khỏe hằng ngày',
          hospital: IS_YOUNG_FAMILY_MODE
            ? 'Khám định kỳ (Hà Nội)'
            : IS_FAMILY_STANDARD_MODE
              ? 'Khám chuyên khoa Nội tiết & Tim mạch định kỳ'
              : 'Khám định kỳ',
          room: 'Tại nhà',
          notes: IS_FAMILY_STANDARD_MODE
            ? 'Uống thuốc hormone tuyến giáp (Levothyroxine) buổi sáng lúc bụng đói (trước ăn 30–60 phút), cách xa Canxi/Sắt ít nhất 4 tiếng. Theo dõi nhịp tim, huyết áp và dấu hiệu tê bì tay chân.'
            : 'Chú ý đo huyết áp khi thấy mỏi gáy, hoa mắt hoặc mất ngủ; uống thuốc và nghỉ ngơi đúng giờ.',
          emergencyPhone: motherMember?.phone || fatherPatientInfo.emergencyPhone || '',
          statusBadge: IS_FAMILY_STANDARD_MODE ? 'Theo dõi Tuyến giáp & Tim mạch' : 'Sức khỏe gia đình',
          conditionTag: IS_FAMILY_STANDARD_MODE ? 'Tuyến giáp • HA • Mỡ máu' : 'Huyết áp & Tim mạch',
          headerBadge: 'Tại nhà',
          careMode: 'Hằng ngày',
          careGoal: IS_FAMILY_STANDARD_MODE
            ? 'Ức chế TSH mục tiêu • Ổn định HA, Mạch & Canxi'
            : 'Duy trì huyết áp & giấc ngủ ổn định',
          ...(IS_YOUNG_FAMILY_MODE ? { gender: 'female' as const } : {}),
          customFields: [
            ...(IS_FAMILY_STANDARD_MODE
              ? [
                  {
                    id: 'cf-thyroid-1',
                    label: 'Phác đồ Tuyến giáp',
                    value: 'Đã cắt toàn bộ tuyến giáp - Uống Levothyroxine hằng ngày lúc đói (Mục tiêu ức chế TSH)',
                    section: 'profile' as const,
                  },
                  {
                    id: 'cf-thyroid-2',
                    label: 'Bệnh lý phối hợp',
                    value: 'Theo dõi Mỡ máu (Cholesterol, LDL-C, Triglyceride), Huyết áp, Đường huyết & Canxi máu',
                    section: 'care' as const,
                  },
                ]
              : []),
          ],
        },
        bpThresholds: { ...DEFAULT_BP_THRESHOLDS },
        appointment: {
          nextDate: '',
          nextNote: '',
          nextWho: '',
          lastDate: '',
          lastNote: '',
        },
      });
    }
  }

  if (IS_YOUNG_FAMILY_MODE && savedList.length === 0) {
    const youngChildrenDefaults: Array<{
      id: string;
      name: string;
      relation: string;
      avatarEmoji: string;
      birthDate: string;
      gender: 'male' | 'female';
      diagnosis: string;
    }> = [
      {
        id: 'child-1',
        name: 'Minh Trung',
        relation: 'Con thứ 1 (9 tuổi)',
        avatarEmoji: '🧒',
        birthDate: '2017-07-28',
        gender: 'male',
        diagnosis: 'Theo dõi tăng trưởng WHO, tiêm chủng nhắc lại & sức khỏe học đường',
      },
      {
        id: 'child-2',
        name: 'Minh Đức',
        relation: 'Con thứ 2 (6 tuổi)',
        avatarEmoji: '🧒',
        birthDate: '2020-06-01',
        gender: 'male',
        diagnosis: 'Theo dõi tăng trưởng WHO, tiêm chủng tiền học đường & sức khỏe hằng ngày',
      },
      {
        id: 'child-3',
        name: 'Minh Phúc',
        relation: 'Con thứ 3 (2 tuổi)',
        avatarEmoji: '👶',
        birthDate: '2024-06-01',
        gender: 'male',
        diagnosis: 'Theo dõi tăng trưởng WHO theo tháng tuổi, lịch tiêm chủng & liều hạ sốt theo cân nặng',
      },
    ];

    for (const child of youngChildrenDefaults) {
      if (!otherProfiles.some((p) => p.id === child.id)) {
        const linkedChild = findLinkedMember(undefined, child.name, child.id);
        const childName =
          linkedChild?.name && !linkedChild.name.startsWith('Bé ') ? linkedChild.name : child.name;
        const childRelation = linkedChild?.relation || child.relation;
        otherProfiles.push({
          id: child.id,
          name: childName,
          relation: childRelation,
          avatarEmoji: child.avatarEmoji,
          profileType: 'pediatric',
          linkedMemberId: linkedChild?.id,
          patientInfo: {
            name: childName,
            diagnosis: child.diagnosis,
            hospital: 'Khám Nhi định kỳ & Tiêm chủng (Hà Nội)',
            room: 'Tại nhà',
            notes: 'Cập nhật ngày sinh và giới tính chính xác để biểu đồ WHO tính đúng chuẩn tháng tuổi.',
            emergencyPhone: linkedChild?.phone || fatherPatientInfo.emergencyPhone || '',
            statusBadge: 'Sổ Sức Khỏe Nhi Khoa',
            conditionTag: 'Tăng trưởng WHO • Tiêm chủng',
            headerBadge: 'Tại nhà',
            careMode: 'Hằng ngày',
            careGoal: 'Phát triển đạt chuẩn WHO & tiêm chủng đúng lịch',
            birthDate: child.birthDate,
            gender: child.gender,
            customFields: [],
          },
          bpThresholds: { ...DEFAULT_BP_THRESHOLDS },
          appointment: {
            nextDate: '',
            nextNote: '',
            nextWho: '',
            lastDate: '',
            lastNote: '',
          },
        });
      }
    }
  }

  if (isPrimaryExplicitlyDeleted && otherProfiles.length > 0) {
    return otherProfiles;
  }

  return [fatherProfile, ...otherProfiles];
}

/**
 * Tạo danh sách Đơn thuốc & Chăm sóc mẫu chuẩn hóa theo từng loại hồ sơ
 * (Người dùng có thể bấm 1 chạm để khởi tạo và sau đó sửa/xóa/thêm tùy ý trên web)
 */
export function buildPresetCareRoutinesForProfile(
  profileId: string,
  profileType: HealthProfileType,
  stageId: string = 'stage-1',
  stageName: string = 'Chăm sóc & Theo dõi hằng ngày'
): CareRoutine[] {
  const now = new Date().toISOString();
  const todayStr = getVietnamDateStr();

  if (profileType === 'pediatric') {
    const pediatricItems: CareRoutine[] = [
      {
        id: 'routine-ped-med-01',
        stageId,
        stageName,
        category: 'meds',
        medType: 'scheduled',
        title: 'Vitamin D3 + K2 (hoặc vi chất theo tuổi)',
        dosage: 'Theo lứa tuổi',
        description:
          'Hỗ trợ hấp thu Canxi, phát triển chiều cao chuẩn WHO và tăng cường miễn dịch cho trẻ.',
        imageUrl: '',
        timeSlots: ['morning'],
        instructions: 'Nhỏ trực tiếp hoặc pha cùng sữa/thức ăn buổi sáng.',
        conditionNote: '',
        isActive: true,
        sortOrder: 1,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-ped-care-01',
        stageId,
        stageName,
        category: 'care',
        title: 'Vệ sinh mũi họng nước muối sinh lý 0.9% & đánh răng',
        dosage: 'Sáng & Tối',
        description: 'Giữ sạch đường hô hấp trên, phòng viêm mũi họng khi giao mùa.',
        imageUrl: '',
        timeSlots: ['morning', 'evening'],
        instructions: 'Xịt/nhỏ nhẹ nhàng nước muối ấm và nhắc bé súc miệng sạch.',
        conditionNote: '',
        isActive: true,
        sortOrder: 2,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-ped-rehab-01',
        stageId,
        stageName,
        category: 'rehab',
        title: 'Vận động ngoài trời & Uống đủ nước ấm',
        dosage: '30 - 45 phút',
        description: 'Kích thích hormone tăng trưởng chiều cao tự nhiên và giúp bé ngủ sâu giấc.',
        imageUrl: '',
        timeSlots: ['afternoon'],
        instructions: 'Cho bé chạy nhảy, đạp xe hoặc chơi thể thao vừa sức và bù nước đầy đủ.',
        conditionNote: '',
        isActive: true,
        sortOrder: 3,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-ped-med-prn',
        stageId,
        stageName,
        category: 'meds',
        medType: 'as_needed',
        title: 'Hạ sốt Paracetamol (10 - 15 mg/kg cân nặng)',
        dosage: '10 - 15 mg/kg/lần',
        description: 'Thuốc hạ sốt dự phòng tại nhà cho trẻ em.',
        imageUrl: '',
        timeSlots: ['morning', 'noon', 'afternoon', 'evening'],
        instructions:
          'Pha gói bột hoặc siro với nước ấm, ghi rõ giờ uống để đối chiếu cữ tiếp theo.',
        conditionNote:
          'CHỈ UỐNG KHI TRẺ SỐT >= 38.5°C hoặc quấy đau nhiều. Mỗi lần uống cách nhau ít nhất 4 - 6 giờ (tối đa 5 lần/24h).',
        isActive: true,
        sortOrder: 4,
        createdAt: todayStr,
        updatedAt: now,
      },
    ];
    return pediatricItems.map((item) => ({
      ...item,
      id: ensureRecordProfilePrefix(item.id, profileId),
    }));
  }

  if (profileType === 'thyroid_post_op') {
    const rawItems: CareRoutine[] = [
      {
        id: 'routine-thy-med-01',
        stageId,
        stageName,
        category: 'meds',
        medType: 'scheduled',
        title: 'Thuốc Hormone Tuyến giáp (Levothyroxine / Berlthyrox / Euthyrox)',
        dosage: '100mcg (hoặc theo đơn BS)',
        description:
          'Bù hormone tuyến giáp & ức chế TSH sau phẫu thuật cắt toàn bộ tuyến giáp. Có thể chỉnh bước liều 12.5mcg hoặc uống lệch ngày (VD: 100x6 125x1) theo chỉ định Bác sĩ.',
        imageUrl: '',
        timeSlots: ['morning'],
        instructions:
          'Uống ngay khi thức dậy lúc bụng đói với 1 cốc nước lọc, trước bữa ăn sáng 30–60 phút.',
        conditionNote:
          'TUYỆT ĐỐI uống cách xa Canxi, Sắt, thuốc dạ dày và sữa đậu nành ít nhất 4 tiếng để không làm giảm hấp thu thuốc giáp!',
        isActive: true,
        sortOrder: 1,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-thy-med-02',
        stageId,
        stageName,
        category: 'meds',
        medType: 'scheduled',
        title: 'Canxi + Vitamin D3 bổ trợ',
        dosage: '1 viên',
        description:
          'Ngừa hạ canxi máu (tê bì tay chân, co rút cơ) sau cắt tuyến giáp và bảo vệ mật độ xương khi duy trì TSH thấp.',
        imageUrl: '',
        timeSlots: ['noon'],
        instructions: 'Uống sau ăn trưa 30 phút với nhiều nước.',
        conditionNote: 'Đảm bảo đã cách giờ uống thuốc tuyến giáp buổi sáng ít nhất 4 giờ.',
        isActive: true,
        sortOrder: 2,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-thy-med-03',
        stageId,
        stageName,
        category: 'meds',
        medType: 'scheduled',
        title: 'Thuốc kiểm soát Mỡ máu / Huyết áp (theo đơn)',
        dosage: '1 viên',
        description: 'Kiểm soát Cholesterol, LDL-C và ổn định huyết áp tim mạch.',
        imageUrl: '',
        timeSlots: ['evening'],
        instructions: 'Uống buổi tối sau ăn hoặc trước khi đi ngủ theo đơn Bác sĩ.',
        conditionNote: '',
        isActive: true,
        sortOrder: 3,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-thy-rehab-01',
        stageId,
        stageName,
        category: 'rehab',
        title: 'Đi bộ nhẹ nhàng & Tắm nắng sớm',
        dosage: '15–20 phút',
        description: 'Tăng tổng hợp Vitamin D tự nhiên, tốt cho xương khớp và điều hòa nhịp tim.',
        imageUrl: '',
        timeSlots: ['morning', 'afternoon'],
        instructions: 'Đi bộ thư giãn vừa sức; nghỉ ngơi nếu thấy tim đập nhanh hoặc hồi hộp.',
        conditionNote: '',
        isActive: true,
        sortOrder: 4,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-thy-care-01',
        stageId,
        stageName,
        category: 'care',
        title: 'Uống đủ nước ấm & Chế độ ăn giảm mỡ xấu, giàu rau xanh',
        dosage: 'Hằng ngày',
        description: 'Hỗ trợ kiểm soát bộ mỡ máu (Cholesterol, Triglyceride, LDL-C) và đường huyết.',
        imageUrl: '',
        timeSlots: ['morning', 'noon', 'afternoon', 'evening'],
        instructions: 'Chia nhỏ lượng nước ấm trong ngày, hạn chế đồ chiên rán, nội tạng và mỡ động vật.',
        conditionNote: '',
        isActive: true,
        sortOrder: 5,
        createdAt: todayStr,
        updatedAt: now,
      },
    ];
    return rawItems.map((item) => ({
      ...item,
      id: ensureRecordProfilePrefix(item.id, profileId),
    }));
  }

  // Mẫu chuẩn cho Thanh Long / Gia đình nhỏ tại Hà Nội (`IS_YOUNG_FAMILY_MODE`)
  if (IS_YOUNG_FAMILY_MODE && profileId === DEFAULT_HEALTH_PROFILE_ID) {
    const youngFatherItems: CareRoutine[] = [
      {
        id: 'routine-tl-med-01',
        stageId,
        stageName,
        category: 'meds',
        medType: 'scheduled',
        title: 'Medoome 40 mg (Omeprazole)',
        dosage: '1 viên/lần (Sáng & Tối)',
        description: 'Bảo vệ niêm mạc dạ dày khi uống kèm Mobic (đơn BS Trần Văn Đăng 25/11/2026 - liệu trình 10 ngày).',
        imageUrl: '',
        timeSlots: ['morning', 'evening'],
        instructions: 'Uống trước ăn 30 - 60 phút.',
        conditionNote: 'Cần xác nhận lại với BS về mức 80 mg/ngày kèm Mobic trên nền sỏi thận trái.',
        isActive: true,
        sortOrder: 1,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-tl-med-02',
        stageId,
        stageName,
        category: 'meds',
        medType: 'scheduled',
        title: 'Myonal 50 mg (Eperison)',
        dosage: '1 viên/lần (Sáng & Tối)',
        description: 'Giãn cơ vùng thắt lưng L5/S1 (20 viên - 10 ngày).',
        imageUrl: '',
        timeSlots: ['morning', 'evening'],
        instructions: 'Uống sau ăn sáng và tối. Lưu ý có thể gây hơi mệt hoặc hạ nhẹ huyết áp.',
        conditionNote: 'Buổi tối uống cùng Lyrica: ngồi mép giường 1-2p trước khi đứng dậy.',
        isActive: true,
        sortOrder: 2,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-tl-med-03',
        stageId,
        stageName,
        category: 'meds',
        medType: 'scheduled',
        title: 'Mobic 7,5 mg (Meloxicam)',
        dosage: '1 viên/lần (Sáng & Chiều)',
        description: 'Kháng viêm giảm đau cột sống L5/S1 (20 viên - 10 ngày).',
        imageUrl: '',
        timeSlots: ['morning', 'afternoon'],
        instructions: 'Uống sau ăn no. Không tự ý kéo dài quá đơn hoặc uống thêm NSAID khác.',
        conditionNote: 'Theo dõi đau dạ dày, nước tiểu ít/buốt trên nền sỏi thận trái & Creatinin 110.',
        isActive: true,
        sortOrder: 3,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-tl-med-04',
        stageId,
        stageName,
        category: 'meds',
        medType: 'scheduled',
        title: 'Lyrica 75 mg (Pregabalin)',
        dosage: '1 viên buổi tối',
        description: 'Giảm đau thần kinh rễ S1 (10 viên - 10 ngày).',
        imageUrl: '',
        timeSlots: ['evening'],
        instructions: 'Uống buổi tối sau ăn khi chuẩn bị đi ngủ. Không lái xe sau uống.',
        conditionNote: 'Có thể gây buồn ngủ sâu/chóng mặt - phòng té ngã khi dậy đi vệ sinh đêm.',
        isActive: true,
        sortOrder: 4,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-tl-med-05',
        stageId,
        stageName,
        category: 'meds',
        medType: 'scheduled',
        title: 'Sylimar-vita 70 mg + Vitamin nhóm B',
        dosage: '1 viên/lần (Sáng & Tối)',
        description: 'Hỗ trợ tế bào gan & dẫn truyền thần kinh (20 viên - 10 ngày).',
        imageUrl: '',
        timeSlots: ['morning', 'evening'],
        instructions: 'Uống sau ăn sáng và tối.',
        conditionNote: '',
        isActive: true,
        sortOrder: 5,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-tl-rehab-01',
        stageId,
        stageName,
        category: 'rehab',
        title: 'Nằm giải áp 90/90 hoặc Cardio nhẹ (Đạp xe / Đi bộ / Gyro Ball)',
        dosage: '15 - 30 phút',
        description: 'Đợt đau cấp ưu tiên giải áp L5/S1; khi hết đau cấp duy trì đạp xe trong nhà, đi bộ và Gyro Ball cổ tay.',
        imageUrl: '',
        timeSlots: ['morning', 'afternoon'],
        instructions: 'Không cúi gập, không tải nặng, không vặn xoắn thắt lưng; dừng ngay nếu đau lan xuống chân.',
        conditionNote: '',
        isActive: true,
        sortOrder: 6,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-tl-care-01',
        stageId,
        stageName,
        category: 'care',
        title: 'Uống 2 - 2.5L nước · Ăn nhạt · Kiêng cá sông, tôm, cua',
        dosage: 'Hằng ngày',
        description: 'Phòng sỏi thận trái, hạ Acid Uric (<360) và tuân thủ quy tắc ẩm thực gia đình.',
        imageUrl: '',
        timeSlots: ['morning', 'noon', 'afternoon', 'evening'],
        instructions: 'Ưu tiên cá biển, rau luộc; tránh nội tạng, dưa muối, cà pháo, rau chân vịt.',
        conditionNote: '',
        isActive: true,
        sortOrder: 7,
        createdAt: todayStr,
        updatedAt: now,
      },
    ];
    return youngFatherItems;
  }

  if (IS_YOUNG_FAMILY_MODE) {
    const youngGeneralItems: CareRoutine[] = [
      {
        id: 'routine-yf-care-01',
        stageId,
        stageName,
        category: 'care',
        title: 'Uống đủ nước ấm & Ăn uống cân bằng (Kiêng cá sông, tôm, cua)',
        dosage: 'Hằng ngày',
        description: 'Duy trì thói quen dinh dưỡng lành mạnh cho gia đình tại Hà Nội.',
        imageUrl: '',
        timeSlots: ['morning', 'noon', 'afternoon', 'evening'],
        instructions: 'Ưu tiên rau xanh, cá biển, thịt nạc và hạn chế đồ chiên rán buổi tối.',
        conditionNote: '',
        isActive: true,
        sortOrder: 1,
        createdAt: todayStr,
        updatedAt: now,
      },
      {
        id: 'routine-yf-rehab-01',
        stageId,
        stageName,
        category: 'rehab',
        title: 'Vận động nhẹ nhàng / Đi bộ / Giãn cơ 20-30 phút',
        dosage: '20 - 30 phút',
        description: 'Tăng cường sức khỏe tim mạch, giấc ngủ và giảm căng thẳng.',
        imageUrl: '',
        timeSlots: ['afternoon'],
        instructions: 'Tập vừa sức, nghỉ ngơi đủ giấc.',
        conditionNote: '',
        isActive: true,
        sortOrder: 2,
        createdAt: todayStr,
        updatedAt: now,
      },
    ];
    return youngGeneralItems.map((item) => ({
      ...item,
      id: ensureRecordProfilePrefix(item.id, profileId),
    }));
  }

  // Mẫu chuẩn cho Bố Thành Đô hoặc thành viên sức khỏe tổng quát / huyết áp / tim mạch / Gout / IBS / Polyp
  const generalItems: CareRoutine[] = [
    {
      id: 'routine-gen-med-01',
      stageId,
      stageName,
      category: 'meds',
      medType: 'scheduled',
      title: 'Thuốc Huyết áp / Tim mạch buổi sáng (theo đơn)',
      dosage: '1 viên',
      description: 'Duy trì huyết áp ổn định trong ngày (bấm Quản lý đơn thuốc để sửa đúng tên thuốc đang dùng).',
      imageUrl: '',
      timeSlots: ['morning'],
      instructions: 'Đo huyết áp lúc nghỉ trước khi uống. Uống sau ăn sáng 30 phút.',
      conditionNote: 'Nếu HA tâm thu < 100 hoặc tâm trương < 60: nghỉ ngơi và hỏi ý kiến Bác sĩ.',
      isActive: true,
      sortOrder: 1,
      createdAt: todayStr,
      updatedAt: now,
    },
    {
      id: 'routine-gen-med-02',
      stageId,
      stageName,
      category: 'meds',
      medType: 'scheduled',
      title: 'Thuốc Mỡ máu / Hạ Acid Uric buổi tối (nếu có theo đơn)',
      dosage: '1 viên',
      description: 'Kiểm soát LDL-C, bảo vệ thành mạch và phòng tái phát cơn Gout (tắt nếu không dùng).',
      imageUrl: '',
      timeSlots: ['evening'],
      instructions: 'Uống buổi tối sau ăn.',
      conditionNote: '',
      isActive: true,
      sortOrder: 2,
      createdAt: todayStr,
      updatedAt: now,
    },
    {
      id: 'routine-gen-rehab-01',
      stageId,
      stageName,
      category: 'rehab',
      title: 'Đánh Tennis / Đạp xe / Đi bộ an toàn',
      dosage: '30 - 45 phút',
      description: 'Giúp ổn định huyết áp, tăng mỡ tốt HDL-C và tiêu thụ đường huyết; khởi động kỹ khớp vai/gối/cổ chân.',
      imageUrl: '',
      timeSlots: ['morning', 'afternoon'],
      instructions: 'Mặc ấm nếu tập sáng sớm trời rét ở Thái Nguyên; nghỉ tĩnh 5-10 phút sau tập rồi mới đo huyết áp.',
      conditionNote: 'Ngưng tập ngay nếu đau khớp chân (Gout) hoặc tức ngực, chóng mặt.',
      isActive: true,
      sortOrder: 3,
      createdAt: todayStr,
      updatedAt: now,
    },
    {
      id: 'routine-gen-care-01',
      stageId,
      stageName,
      category: 'care',
      title: 'Uống đủ 2 - 2.5L nước lọc & Hạn chế rượu bia, thuốc lá, đồ nhiều mỡ/purin',
      dosage: 'Hằng ngày',
      description: 'Giúp thải Acid Uric (ngừa Gout), giảm cô đặc dịch mật (Polyp túi mật), dịu ruột (IBS) và giảm tải gan GGT.',
      imageUrl: '',
      timeSlots: ['morning', 'noon', 'afternoon', 'evening'],
      instructions: 'Bù nước trước và sau khi đánh Tennis/đạp xe; tránh đồ chiên rán, nội tạng, hải sản, đồ cay lạnh.',
      conditionNote: '',
      isActive: true,
      sortOrder: 4,
      createdAt: todayStr,
      updatedAt: now,
    },
  ];
  return generalItems.map((item) => ({
    ...item,
    id: ensureRecordProfilePrefix(item.id, profileId),
  }));
}

// =============================================
// MODULE XÉT NGHIỆM & HÓA SINH (LAB RESULTS & BIOCHEMISTRY ENGINE)
// Kế thừa & chuẩn hóa từ dự án [Bạch Yến] - Dữ liệu Theo dõi Tuyến giáp
// =============================================

export type LabEvalStatus = 'optimal' | 'normal' | 'low' | 'high' | 'critical';

export interface LabIndicatorEval {
  key: string;
  label: string;
  shortLabel: string;
  group: 'thyroid' | 'markers' | 'lipid' | 'metabolic' | 'liver_kidney' | 'ultrasound';
  value: number;
  unit: string;
  refText: string;
  status: LabEvalStatus;
  badgeText: string;
  badgeClass: string;
  clinicalNote: string;
}

/**
 * Đánh giá toàn diện một bản ghi Xét nghiệm & Hóa sinh theo bối cảnh hồ sơ (Tuyến giáp / Tim mạch / Tổng quát)
 */
export function evaluateLabEntry(
  entry: LabResultEntry,
  profileType: HealthProfileType = 'general_health',
  previousLab?: LabResultEntry | null
): {
  indicators: LabIndicatorEval[];
  overallStatus: LabEvalStatus;
  summaryPoints: string[];
} {
  const indicators: LabIndicatorEval[] = [];
  const summaryPoints: string[] = [];
  const isThyroidProfile =
    profileType === 'thyroid_post_op' ||
    Boolean(entry.levothyroxineDose) ||
    entry.tg !== undefined ||
    entry.tshTargetLevel === 'high_risk' ||
    entry.tshTargetLevel === 'moderate_risk' ||
    entry.tshTargetLevel === 'low_risk';

  const tshTarget: TshTargetLevel =
    entry.tshTargetLevel || (isThyroidProfile ? 'moderate_risk' : 'normal');

  // 1. TSH (µIU/mL)
  if (typeof entry.tsh === 'number' && !isNaN(entry.tsh)) {
    const tshEval = evaluateTshIndicator(entry.tsh, tshTarget);
    indicators.push(tshEval);
    if (tshEval.status === 'high' || tshEval.status === 'critical' || tshEval.status === 'low') {
      summaryPoints.push(tshEval.clinicalNote);
    }
  }

  // 2. FT4 (ng/dL hoặc pmol/L -> quy đổi nội bộ sang pmol/L để đánh giá chuẩn: 1 ng/dL = 12.87 pmol/L)
  if (typeof entry.ft4 === 'number' && !isNaN(entry.ft4)) {
    const ft4Eval = evaluateFt4Indicator(entry.ft4, entry.ft4Unit, isThyroidProfile);
    indicators.push(ft4Eval);
    if (ft4Eval.status === 'high' || ft4Eval.status === 'critical' || ft4Eval.status === 'low') {
      summaryPoints.push(ft4Eval.clinicalNote);
    }
  }

  // 3. FT3 (pg/mL hoặc pmol/L -> 1 pg/mL = 1.536 pmol/L)
  if (typeof entry.ft3 === 'number' && !isNaN(entry.ft3)) {
    const unit = entry.ft3Unit || (entry.ft3 > 4.8 ? 'pmol/L' : 'pg/mL');
    const valInPgMl = unit === 'pmol/L' ? entry.ft3 / 1.536 : entry.ft3;
    const refText = unit === 'pmol/L' ? '3.1 – 6.8 pmol/L' : '2.0 – 4.4 pg/mL';
    let status: LabEvalStatus = 'normal';
    let badgeText = '🟢 Bình thường';
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    let clinicalNote = 'Hormone hoạt tính FT3 nằm trong giới hạn sinh lý bình thường.';

    if (valInPgMl < 2.0) {
      status = 'low';
      badgeText = '🟡 FT3 thấp';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote = 'FT3 hơi thấp, có thể gây cảm giác mệt mỏi, chậm chạp.';
    } else if (valInPgMl > 4.4) {
      status = 'high';
      badgeText = '🟡 FT3 cao';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote = 'FT3 vượt ngưỡng trên, dễ gây tim đập nhanh và sụt cân.';
    }

    indicators.push({
      key: 'ft3',
      label: 'FT3 (Triiodothyronine tự do)',
      shortLabel: 'FT3',
      group: 'thyroid',
      value: entry.ft3,
      unit,
      refText,
      status,
      badgeText,
      badgeClass,
      clinicalNote,
    });
  }

  // 3b. T3 toàn phần (nmol/L hoặc ng/dL -> chuẩn nmol/L: 1.1 – 2.8 nmol/L; chuẩn ng/dL: 70 – 180 ng/dL)
  if (typeof entry.t3 === 'number' && !isNaN(entry.t3)) {
    const unit = entry.t3Unit || (entry.t3 > 15 ? 'ng/dL' : 'nmol/L');
    const valNmol = unit === 'ng/dL' ? entry.t3 * 0.01536 : entry.t3;
    const refText = unit === 'nmol/L' ? '1.1 – 2.8 nmol/L' : '70 – 180 ng/dL';
    let status: LabEvalStatus = 'normal';
    let badgeText = '🟢 Bình thường';
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    let clinicalNote = 'Nồng độ hormone T3 toàn phần nằm trong giới hạn sinh lý ổn định.';

    if (valNmol < 1.1) {
      status = 'low';
      badgeText = '🟡 T3 thấp';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote = 'T3 toàn phần hơi thấp; cơ thể chuyển hóa T4 sang T3 chậm hơn bình thường.';
    } else if (valNmol > 2.8) {
      status = 'high';
      badgeText = '🟡 T3 cao';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote = 'T3 toàn phần cao; dễ gây cảm giác hồi hộp, tim đập nhanh.';
    }

    indicators.push({
      key: 't3',
      label: 'T3 toàn phần (Triiodothyronine)',
      shortLabel: 'T3',
      group: 'thyroid',
      value: entry.t3,
      unit,
      refText,
      status,
      badgeText,
      badgeClass,
      clinicalNote,
    });
  }

  // 3c. T4 toàn phần (µg/dL hoặc nmol/L -> chuẩn µg/dL: 5.1 – 14.1 µg/dL; chuẩn nmol/L: 66 – 181 nmol/L)
  if (typeof entry.t4 === 'number' && !isNaN(entry.t4)) {
    const unit = entry.t4Unit || (entry.t4 > 30 ? 'nmol/L' : 'µg/dL');
    const valUg = unit === 'nmol/L' ? entry.t4 / 12.87 : entry.t4;
    const refText = unit === 'nmol/L' ? '66 – 181 nmol/L' : '5.1 – 14.1 µg/dL';
    const isLow = valUg < 5.1;
    const isHigh = valUg > 14.1;
    indicators.push({
      key: 't4',
      label: 'T4 toàn phần (Thyroxine)',
      shortLabel: 'T4',
      group: 'thyroid',
      value: entry.t4,
      unit,
      refText,
      status: isLow ? 'low' : isHigh ? 'high' : 'normal',
      badgeText: isLow ? '🟡 T4 thấp' : isHigh ? '🟡 T4 cao' : '🟢 Bình thường',
      badgeClass:
        isLow || isHigh
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'T4 toàn phần hơi cao do đang duy trì liều Levothyroxine ức chế TSH.'
        : isLow
          ? 'T4 toàn phần hơi thấp.'
          : 'T4 toàn phần trong giới hạn bình thường.',
    });
  }

  // 4 & 5. TG (Thyroglobulin) & Anti-TG kết hợp đánh giá đáp ứng sinh hóa + xu hướng
  const tgMarkersEval = evaluateTgAndAntiTgIndicators(entry, previousLab);
  indicators.push(...tgMarkersEval.indicators);
  summaryPoints.push(...tgMarkersEval.summaryPoints);

  // 6. Anti-TPO (IU/mL)
  if (typeof entry.antiTpo === 'number' && !isNaN(entry.antiTpo)) {
    const val = entry.antiTpo;
    const isHigh = val > 34;
    indicators.push({
      key: 'antiTpo',
      label: 'Anti-TPO (Kháng thể Peroxidase tuyến giáp)',
      shortLabel: 'Anti-TPO',
      group: 'markers',
      value: val,
      unit: 'IU/mL',
      refText: '< 34 IU/mL',
      status: isHigh ? 'high' : 'normal',
      badgeText: isHigh ? '🟡 Cao (>34)' : '🟢 Bình thường',
      badgeClass: isHigh
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Gợi ý yếu tố viêm tuyến giáp tự miễn.'
        : 'Trong giới hạn bình thường.',
    });
  }

  // 7. Bộ Mỡ máu (Lipid Panel) - Hỗ trợ cả mmol/L và mg/dL
  // Quy đổi chuẩn: Cholesterol/LDL/HDL: 1 mmol/L = 38.67 mg/dL; Triglyceride: 1 mmol/L = 88.57 mg/dL
  if (typeof entry.cholesterol === 'number' && !isNaN(entry.cholesterol)) {
    const unit = entry.lipidUnit || (entry.cholesterol > 25 ? 'mg/dL' : 'mmol/L');
    const valMg = unit === 'mmol/L' ? entry.cholesterol * 38.67 : entry.cholesterol;
    const isHigh = valMg >= 200;
    const isVeryHigh = valMg >= 240;
    indicators.push({
      key: 'cholesterol',
      label: 'Cholesterol toàn phần',
      shortLabel: 'Cholesterol TP',
      group: 'lipid',
      value: entry.cholesterol,
      unit,
      refText: unit === 'mmol/L' ? '< 5.2 mmol/L' : '< 200 mg/dL',
      status: isVeryHigh ? 'critical' : isHigh ? 'high' : 'normal',
      badgeText: isVeryHigh ? '🔴 Cao' : isHigh ? '🟡 Hơi cao' : '🟢 Đạt chuẩn',
      badgeClass: isVeryHigh
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : isHigh
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Cholesterol toàn phần tăng. Cần hạn chế mỡ động vật, đồ chiên xào và duy trì vận động.'
        : 'Cholesterol toàn phần trong ngưỡng tốt.',
    });
    if (isHigh) {
      summaryPoints.push('Cholesterol toàn phần đang cao hơn ngưỡng khuyến nghị (<5.2 mmol/L hay <200 mg/dL).');
    }
  }

  if (typeof entry.ldlC === 'number' && !isNaN(entry.ldlC)) {
    const unit = entry.lipidUnit || (entry.ldlC > 15 ? 'mg/dL' : 'mmol/L');
    const valMg = unit === 'mmol/L' ? entry.ldlC * 38.67 : entry.ldlC;
    const targetMg = profileType === 'post_stroke_cranioplasty' ? 70 : 100;
    const isHigh = valMg >= targetMg;
    const isVeryHigh = valMg >= 130;
    indicators.push({
      key: 'ldlC',
      label: 'LDL-C (Cholesterol xấu)',
      shortLabel: 'LDL-C',
      group: 'lipid',
      value: entry.ldlC,
      unit,
      refText:
        unit === 'mmol/L'
          ? profileType === 'post_stroke_cranioplasty'
            ? '< 1.8 mmol/L (Đích sau đột quỵ)'
            : '< 2.6 mmol/L'
          : `< ${targetMg} mg/dL`,
      status: isVeryHigh ? 'critical' : isHigh ? 'high' : 'optimal',
      badgeText: isVeryHigh ? '🔴 Cao' : isHigh ? '🟡 Trên đích' : '🟢 Tốt',
      badgeClass: isVeryHigh
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : isHigh
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'LDL-C (mỡ xấu) cao làm tăng nguy cơ xơ vữa mạch máu. Cần tuân thủ thuốc mỡ máu (nếu có) và ăn giảm chất béo bão hòa.'
        : 'Chỉ số mỡ xấu LDL-C được kiểm soát tốt.',
    });
    if (isHigh) {
      summaryPoints.push('Chỉ số mỡ xấu LDL-C vượt ngưỡng mục tiêu bảo vệ tim mạch.');
    }
  }

  if (typeof entry.hdlC === 'number' && !isNaN(entry.hdlC)) {
    const unit = entry.lipidUnit || (entry.hdlC > 10 ? 'mg/dL' : 'mmol/L');
    const valMg = unit === 'mmol/L' ? entry.hdlC * 38.67 : entry.hdlC;
    const isLow = valMg < 45;
    indicators.push({
      key: 'hdlC',
      label: 'HDL-C (Cholesterol tốt)',
      shortLabel: 'HDL-C',
      group: 'lipid',
      value: entry.hdlC,
      unit,
      refText: unit === 'mmol/L' ? '> 1.15 mmol/L' : '> 45 mg/dL',
      status: isLow ? 'low' : 'optimal',
      badgeText: isLow ? '🟡 Hơi thấp' : '🟢 Tốt',
      badgeClass: isLow
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isLow
        ? 'HDL-C (mỡ tốt) hơi thấp; tăng cường đi bộ và ăn cá, dầu thực vật lành mạnh giúp nâng HDL-C.'
        : 'Mỡ tốt HDL-C đạt mức bảo vệ mạch máu.',
    });
  }

  if (typeof entry.triglyceride === 'number' && !isNaN(entry.triglyceride)) {
    const unit = entry.lipidUnit || (entry.triglyceride > 15 ? 'mg/dL' : 'mmol/L');
    const valMg = unit === 'mmol/L' ? entry.triglyceride * 88.57 : entry.triglyceride;
    const isHigh = valMg >= 150;
    const isVeryHigh = valMg >= 200;
    indicators.push({
      key: 'triglyceride',
      label: 'Triglyceride (Chất béo trung tính)',
      shortLabel: 'Triglyceride',
      group: 'lipid',
      value: entry.triglyceride,
      unit,
      refText: unit === 'mmol/L' ? '< 1.70 mmol/L' : '< 150 mg/dL',
      status: isVeryHigh ? 'critical' : isHigh ? 'high' : 'normal',
      badgeText: isVeryHigh ? '🔴 Cao' : isHigh ? '🟡 Hơi cao' : '🟢 Bình thường',
      badgeClass: isVeryHigh
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : isHigh
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Triglyceride tăng; nên giảm tinh bột đường ngọt, cơm trắng buổi tối và đồ chiên rán.'
        : 'Triglyceride nằm trong giới hạn tốt.',
    });
    if (isHigh) {
      summaryPoints.push('Triglyceride vượt ngưỡng khuyến nghị (<1.70 mmol/L hay <150 mg/dL).');
    }
  }

  // 8. Chuyển hóa, Khoáng chất & Vitamin (Glucose, HbA1c, Canxi, Vitamin D)
  if (typeof entry.glucose === 'number' && !isNaN(entry.glucose)) {
    const unit = entry.glucoseUnit || (entry.glucose > 25 ? 'mg/dL' : 'mmol/L');
    const valMmol = unit === 'mg/dL' ? entry.glucose / 18.0 : entry.glucose;
    const isLow = valMmol < 3.9;
    const isHigh = valMmol > 5.6;
    const isDiabetesRange = valMmol >= 7.0;
    indicators.push({
      key: 'glucose',
      label: 'Glucose máu lúc đói',
      shortLabel: 'Glucose',
      group: 'metabolic',
      value: entry.glucose,
      unit,
      refText: unit === 'mmol/L' ? '3.9 – 5.6 mmol/L' : '70 – 100 mg/dL',
      status: isDiabetesRange || isLow ? 'critical' : isHigh ? 'high' : 'normal',
      badgeText: isLow
        ? '🔴 Hạ đường huyết'
        : isDiabetesRange
          ? '🔴 Đường huyết cao'
          : isHigh
            ? '🟡 Hơi cao (5.7–6.9)'
            : '🟢 Bình thường',
      badgeClass:
        isDiabetesRange || isLow
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : isHigh
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Đường huyết lúc đói hơi cao; nên hạn chế đồ ngọt, tinh bột tinh chế và kiểm tra thêm HbA1c.'
        : isLow
          ? 'Đường huyết thấp (<3.9 mmol/L); chú ý ăn đúng bữa.'
          : 'Đường huyết lúc đói ổn định.',
    });
    if (isHigh || isLow) {
      summaryPoints.push(
        isLow
          ? 'Glucose máu đói thấp (<3.9 mmol/L).'
          : 'Glucose máu lúc đói cao (>5.6 mmol/L) - cần kiểm tra thêm HbA1c và tiết chế đường tinh bột.'
      );
    }
  }

  if (typeof entry.hba1c === 'number' && !isNaN(entry.hba1c)) {
    const val = entry.hba1c;
    const isPre = val >= 5.7 && val < 6.5;
    const isHigh = val >= 6.5;
    indicators.push({
      key: 'hba1c',
      label: 'HbA1c (Đường huyết trung bình 3 tháng)',
      shortLabel: 'HbA1c',
      group: 'metabolic',
      value: val,
      unit: '%',
      refText: '< 5.7% (Tiền tiểu đường: 5.7 – 6.4%)',
      status: isHigh ? 'critical' : isPre ? 'high' : 'normal',
      badgeText: isHigh ? '🔴 Cao (≥6.5%)' : isPre ? '🟡 Cần lưu ý (5.7–6.4%)' : '🟢 Tốt (<5.7%)',
      badgeClass: isHigh
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : isPre
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'HbA1c ≥ 6.5%: Cần kiểm soát đường huyết chặt chẽ theo phác đồ Bác sĩ.'
        : isPre
          ? 'HbA1c ở ngưỡng tiền tiểu đường, cần điều chỉnh chế độ ăn giảm đường và tập thể dục.'
          : 'Đường huyết trung bình 3 tháng rất tốt.',
    });
    if (isHigh || isPre) {
      summaryPoints.push(`HbA1c đạt ${val}% (${isHigh ? 'ngưỡng tiểu đường ≥6.5%' : 'ngưỡng tiền tiểu đường 5.7–6.4%'}).`);
    }
  }

  if (typeof entry.calcium === 'number' && !isNaN(entry.calcium)) {
    const unit = entry.calciumUnit || (entry.calcium > 5 ? 'mg/dL' : 'mmol/L');
    const corrCa = computeCorrectedCalcium(entry);
    const valMg = corrCa
      ? corrCa.mgDl
      : unit === 'mmol/L'
        ? entry.calcium * 4.008
        : entry.calcium;
    const isLow = valMg < 8.6;
    const isHigh = valMg > 10.3;
    const corrText =
      corrCa && Math.abs(corrCa.diffMmol) >= 0.05
        ? ` (Canxi hiệu chỉnh theo Albumin: ${corrCa.mmolL} mmol/L | ${corrCa.mgDl} mg/dL)`
        : '';
    indicators.push({
      key: 'calcium',
      label: 'Canxi máu toàn phần',
      shortLabel: 'Canxi máu',
      group: 'metabolic',
      value: entry.calcium,
      unit,
      refText: unit === 'mmol/L' ? '2.15 – 2.55 mmol/L' : '8.6 – 10.2 mg/dL',
      status: isLow ? 'low' : isHigh ? 'high' : 'optimal',
      badgeText: isLow ? '🔴 Hạ Canxi máu' : isHigh ? '🟡 Canxi hơi cao' : '🟢 Đủ Canxi',
      badgeClass: isLow
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : isHigh
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isLow
        ? `Canxi máu thấp (dễ gây tê bì tay chân, chuột rút sau mổ tuyến giáp)${corrText}. Cần bổ sung đều đặn Canxi + Vitamin D3 cách giờ uống thuốc giáp ít nhất 4 tiếng.`
        : `Nồng độ Canxi máu ổn định${corrText}, đảm bảo tốt cho thần kinh - cơ và xương.`,
    });
    if (isLow) {
      summaryPoints.push(
        `Canxi máu đang thấp (<2.15 mmol/L hay <8.6 mg/dL)${corrText} - cần chú ý bổ sung Canxi + Vitamin D3 đầy đủ.`
      );
    }
  }

  if (typeof entry.ionizedCalcium === 'number' && !isNaN(entry.ionizedCalcium)) {
    const val = entry.ionizedCalcium;
    const isLow = val < 1.1;
    const isHigh = val > 1.35;
    indicators.push({
      key: 'ionizedCalcium',
      label: 'Canxi ion hóa (Ca++)',
      shortLabel: 'Canxi ion (Ca++)',
      group: 'metabolic',
      value: val,
      unit: 'mmol/L',
      refText: '1.10 – 1.35 mmol/L',
      status: isLow ? 'low' : isHigh ? 'high' : 'optimal',
      badgeText: isLow ? '🔴 Thấp (<1.10)' : isHigh ? '🟡 Cao (>1.35)' : '🟢 Bình thường',
      badgeClass: isLow
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : isHigh
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isLow
        ? 'Canxi ion hóa thấp gây tê bì tay chân; cần bổ sung Canxi và Vitamin D.'
        : 'Canxi ion hóa trong máu ổn định.',
    });
  }

  const parathyroidEval = evaluateParathyroidPanel(entry, profileType);
  indicators.push(...parathyroidEval.indicators);
  summaryPoints.push(...parathyroidEval.summaryPoints);

  if (typeof entry.vitaminD === 'number' && !isNaN(entry.vitaminD)) {
    const val = entry.vitaminD;
    const isLow = val < 30;
    const isDeficient = val < 20;
    const isExcess = val > 100;
    indicators.push({
      key: 'vitaminD',
      label: '25-OH Vitamin D',
      shortLabel: 'Vitamin D',
      group: 'metabolic',
      value: val,
      unit: 'ng/mL',
      refText: '30 – 60 ng/mL (Tối đa < 100)',
      status: isDeficient || isExcess ? 'critical' : isLow ? 'low' : 'optimal',
      badgeText: isExcess
        ? '🔴 Quá cao (>100)'
        : isDeficient
          ? '🔴 Thiếu hụt (<20)'
          : isLow
            ? '🟡 Hơi thiếu (<30)'
            : '🟢 Đạt chuẩn (30–60)',
      badgeClass:
        isDeficient || isExcess
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : isLow
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isExcess
        ? 'Vitamin D vượt 100 ng/mL làm tăng nguy cơ ngộ độc, tăng Canxi máu/niệu và sỏi thận; cần ngưng bổ sung và hỏi Bác sĩ.'
        : isLow
          ? 'Vitamin D dưới 30 ng/mL làm giảm hấp thu Canxi vào xương. Nên duy trì bổ sung Vitamin D3 và tắm nắng sáng.'
          : 'Nồng độ Vitamin D tối ưu giúp hấp thu Canxi tốt.',
    });
    if (isLow || isExcess) {
      summaryPoints.push(
        isExcess
          ? `25-OH Vitamin D đang quá cao (${val} ng/mL > 100) - tạm ngưng Vitamin D và báo Bác sĩ.`
          : `25-OH Vitamin D đang thấp (${val} ng/mL < 30) - cần bổ sung Vitamin D3 để tối ưu hấp thu Canxi.`
      );
    }
  }

  // 9. Chức năng Gan, Thận & Huyết học (AST, ALT, Creatinine, Ure, Acid Uric, Hemoglobin)
  if (typeof entry.ast === 'number' && !isNaN(entry.ast)) {
    const isHigh = entry.ast > 40;
    indicators.push({
      key: 'ast',
      label: 'AST / GOT (Men gan)',
      shortLabel: 'AST (GOT)',
      group: 'liver_kidney',
      value: entry.ast,
      unit: 'U/L',
      refText: '< 37 - 40 U/L',
      status: entry.ast > 80 ? 'critical' : isHigh ? 'high' : 'normal',
      badgeText: entry.ast > 80 ? '🔴 Tăng cao (>80)' : isHigh ? '🟡 Tăng (>40)' : '🟢 Bình thường',
      badgeClass:
        entry.ast > 80
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : isHigh
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Men gan AST tăng; cần hạn chế rượu bia và theo dõi chức năng gan.'
        : 'Men gan AST bình thường.',
    });
    if (isHigh) {
      summaryPoints.push(`Men gan AST tăng (${entry.ast} U/L > 40).`);
    }
  }

  if (typeof entry.alt === 'number' && !isNaN(entry.alt)) {
    const isHigh = entry.alt > 40;
    indicators.push({
      key: 'alt',
      label: 'ALT / GPT (Men gan)',
      shortLabel: 'ALT (GPT)',
      group: 'liver_kidney',
      value: entry.alt,
      unit: 'U/L',
      refText: '< 40 U/L',
      status: entry.alt > 80 ? 'critical' : isHigh ? 'high' : 'normal',
      badgeText: entry.alt > 80 ? '🔴 Tăng cao (>80)' : isHigh ? '🟡 Tăng (>40)' : '🟢 Bình thường',
      badgeClass:
        entry.alt > 80
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : isHigh
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Men gan ALT tăng; cần hạn chế rượu bia, uống đủ nước và báo Bác sĩ kiểm tra.'
        : 'Men gan ALT bình thường.',
    });
    if (isHigh) {
      summaryPoints.push(`Men gan ALT tăng (${entry.alt} U/L > 40).`);
    }
  }

  if (typeof entry.ggt === 'number' && !isNaN(entry.ggt)) {
    const upperLimit = isThyroidProfile ? 40 : 60;
    const isHigh = entry.ggt > upperLimit;
    const isVeryHigh = entry.ggt > upperLimit * 2;
    indicators.push({
      key: 'ggt',
      label: 'GGT (Gamma-GT Gan Mật)',
      shortLabel: 'GGT',
      group: 'liver_kidney',
      value: entry.ggt,
      unit: 'U/L',
      refText: `< ${upperLimit} U/L`,
      status: isVeryHigh ? 'critical' : isHigh ? 'high' : 'normal',
      badgeText: isVeryHigh
        ? `🔴 Tăng cao (>${upperLimit * 2})`
        : isHigh
          ? `🟡 Tăng (>${upperLimit})`
          : '🟢 Bình thường',
      badgeClass: isVeryHigh
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : isHigh
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'GGT tăng cảnh báo gan đang chịu tải từ rượu bia hoặc ứ mật nhẹ; cần giảm/ngưng rượu bia và kiểm tra siêu âm gan mật.'
        : 'Chỉ số GGT ổn định.',
    });
    if (isHigh) {
      summaryPoints.push(
        `Men gan GGT tăng (${entry.ggt} U/L > ${upperLimit}) - nhạy cảm với rượu bia & đường mật.`
      );
    }
  }

  if (typeof entry.bilirubinTotal === 'number' && !isNaN(entry.bilirubinTotal)) {
    const isHigh = entry.bilirubinTotal > 21;
    indicators.push({
      key: 'bilirubinTotal',
      label: 'Bilirubin toàn phần',
      shortLabel: 'Bilirubin TP',
      group: 'liver_kidney',
      value: entry.bilirubinTotal,
      unit: 'µmol/L',
      refText: '3.4 - 21.0 µmol/L',
      status: entry.bilirubinTotal > 34 ? 'critical' : isHigh ? 'high' : 'normal',
      badgeText: entry.bilirubinTotal > 34 ? '🔴 Cao (>34)' : isHigh ? '🟡 Hơi cao (>21)' : '🟢 Bình thường',
      badgeClass:
        entry.bilirubinTotal > 34
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : isHigh
            ? 'bg-amber-100 text-amber-800 border-amber-300'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Bilirubin toàn phần hơi cao; cần theo dõi thêm đường mật / túi mật khi siêu âm.'
        : 'Sắc tố mật Bilirubin toàn phần bình thường.',
    });
    if (isHigh) {
      summaryPoints.push(`Bilirubin toàn phần tăng (${entry.bilirubinTotal} µmol/L > 21).`);
    }
  }

  if (typeof entry.bilirubinDirect === 'number' && !isNaN(entry.bilirubinDirect)) {
    const isHigh = entry.bilirubinDirect > 5.1;
    indicators.push({
      key: 'bilirubinDirect',
      label: 'Bilirubin trực tiếp',
      shortLabel: 'Bilirubin TT',
      group: 'liver_kidney',
      value: entry.bilirubinDirect,
      unit: 'µmol/L',
      refText: '< 5.1 µmol/L',
      status: isHigh ? 'high' : 'normal',
      badgeText: isHigh ? '🟡 Cao (>5.1)' : '🟢 Bình thường',
      badgeClass: isHigh
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Bilirubin trực tiếp tăng; lưu ý kiểm tra lưu thông đường mật và túi mật.'
        : 'Bilirubin trực tiếp bình thường.',
    });
  }

  if (typeof entry.creatinine === 'number' && !isNaN(entry.creatinine)) {
    const upperLimit = isThyroidProfile ? 88 : 110;
    const isHigh = entry.creatinine > upperLimit;
    const isVeryHigh = entry.creatinine > 120;
    indicators.push({
      key: 'creatinine',
      label: 'Creatinine máu (Chức năng thận)',
      shortLabel: 'Creatinine',
      group: 'liver_kidney',
      value: entry.creatinine,
      unit: 'µmol/L',
      refText: isThyroidProfile ? '44 - 88 µmol/L (Nữ)' : '53 - 110 µmol/L',
      status: isVeryHigh ? 'critical' : isHigh ? 'high' : 'normal',
      badgeText: isVeryHigh ? '🔴 Cao (>120)' : isHigh ? `🟡 Cao (>${upperLimit})` : '🟢 Bình thường',
      badgeClass: isVeryHigh
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : isHigh
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? `Creatinine vượt ${upperLimit} µmol/L; cần uống đủ nước, kiểm soát huyết áp và tránh tự uống thuốc giảm đau hại thận.`
        : 'Chức năng thận Creatinine ổn định.',
    });
    if (isHigh) {
      summaryPoints.push(`Creatinine máu cao (${entry.creatinine} µmol/L > ${upperLimit}) - cần theo dõi chức năng lọc cầu thận.`);
    }
  }

  if (typeof entry.egfr === 'number' && !isNaN(entry.egfr)) {
    const val = entry.egfr;
    const isReduced = val < 60;
    const isMild = val >= 60 && val < 90;
    indicators.push({
      key: 'egfr',
      label: 'eGFR (Mức lọc cầu thận ước tính)',
      shortLabel: 'eGFR (Lọc thận)',
      group: 'liver_kidney',
      value: val,
      unit: 'mL/phút',
      refText: '>= 90 (60-89: ổn định tuổi 60+)',
      status: isReduced ? 'critical' : isMild ? 'normal' : 'optimal',
      badgeText: isReduced
        ? '🔴 Giảm (<60)'
        : isMild
          ? '🟢 Ổn định (60-89)'
          : '🟢 Rất tốt (>=90)',
      badgeClass: isReduced
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isReduced
        ? 'Mức lọc cầu thận dưới 60 mL/phút; cần bảo vệ thận chặt chẽ (ổn định HA, uống đủ nước, tuyệt đối tránh thuốc giảm đau NSAID).'
        : isMild
          ? 'Sức lọc thận ổn định phù hợp tuổi 60+; duy trì uống đủ 2L nước/ngày.'
          : 'Chức năng lọc cầu thận rất tốt.',
    });
    if (isReduced) {
      summaryPoints.push(`eGFR giảm (${val} mL/phút < 60) - cần khám theo dõi chức năng thận.`);
    }
  }

  if (typeof entry.urea === 'number' && !isNaN(entry.urea)) {
    const isHigh = entry.urea > 7.5;
    indicators.push({
      key: 'urea',
      label: 'Ure máu',
      shortLabel: 'Ure máu',
      group: 'liver_kidney',
      value: entry.urea,
      unit: 'mmol/L',
      refText: '2.5 - 7.5 mmol/L',
      status: isHigh ? 'high' : 'normal',
      badgeText: isHigh ? '🟡 Hơi cao' : '🟢 Bình thường',
      badgeClass: isHigh
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh ? 'Ure máu hơi cao (có thể do thiếu nước sau vận động hoặc ăn nhiều đạm).' : 'Ure máu bình thường.',
    });
  }

  if (typeof entry.uricAcid === 'number' && !isNaN(entry.uricAcid)) {
    const val = entry.uricAcid;
    const isGoutTargetMode = profileType === 'general_health';
    const isCritical = val > 420;
    const isAboveTarget = isGoutTargetMode ? val > 360 : val > 400;
    indicators.push({
      key: 'uricAcid',
      label: 'Acid Uric máu (Gout)',
      shortLabel: 'Acid Uric',
      group: 'liver_kidney',
      value: val,
      unit: 'µmol/L',
      refText: isGoutTargetMode
        ? 'Đích ngừa Gout: < 360 (Chuẩn chung < 420 µmol/L)'
        : '150 - 400 µmol/L',
      status: isCritical ? 'critical' : isAboveTarget ? 'high' : 'optimal',
      badgeText: isCritical
        ? '🔴 Cao (>420 · Nguy cơ Gout)'
        : isAboveTarget
          ? isGoutTargetMode
            ? '🟡 Trên đích Gout (>360)'
            : '🟡 Cao (>400)'
          : isGoutTargetMode
            ? '🟢 Đạt đích Gout (<360)'
            : '🟢 Bình thường',
      badgeClass: isCritical
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : isAboveTarget
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isCritical
        ? 'Acid Uric cao dễ kết tinh gây sưng đau khớp Gout cấp và sỏi thận; cần kiêng bia rượu, nội tạng, hải sản và uống đủ nước.'
        : isAboveTarget
          ? 'Cao hơn đích kiểm soát Gout (<360 µmol/L); nên uống 2-2.5L nước/ngày và hạn chế rượu bia, đạm purin.'
          : 'Acid Uric được kiểm soát tốt dưới ngưỡng gây Gout.',
    });
    if (isCritical || isAboveTarget) {
      summaryPoints.push(
        `Acid Uric đạt ${val} µmol/L (${
          isCritical
            ? 'ngưỡng cao >420, dễ khởi phát cơn Gout'
            : isGoutTargetMode
              ? 'cao hơn đích kiểm soát Gout <360'
              : 'vượt 400'
        }).`
      );
    }
  }

  if (typeof entry.hemoglobin === 'number' && !isNaN(entry.hemoglobin)) {
    const val = entry.hemoglobin;
    const isGPerL = val > 35; // >35 là g/L (chuẩn 120-160 g/L), ngược lại là g/dL (chuẩn 12-16 g/dL)
    const valGdL = isGPerL ? val / 10 : val;
    const isLow = valGdL < 12.0;
    indicators.push({
      key: 'hemoglobin',
      label: 'Hemoglobin (Huyết sắc tố)',
      shortLabel: 'Hemoglobin',
      group: 'liver_kidney',
      value: val,
      unit: isGPerL ? 'g/L' : 'g/dL',
      refText: isGPerL ? '120 - 160 g/L' : '12.0 - 16.0 g/dL',
      status: isLow ? 'low' : 'normal',
      badgeText: isLow ? '🟡 Thiếu máu nhẹ' : '🟢 Đạt chuẩn',
      badgeClass: isLow
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isLow
        ? 'Huyết sắc tố hơi thấp; chú ý bổ sung thực phẩm giàu sắt, vitamin B12 và folate.'
        : 'Huyết sắc tố bình thường, không thiếu máu.',
    });
  }

  if (typeof entry.gallbladderPolypMm === 'number' && !isNaN(entry.gallbladderPolypMm)) {
    const mm = entry.gallbladderPolypMm;
    const prevMm =
      previousLab && typeof previousLab.gallbladderPolypMm === 'number'
        ? previousLab.gallbladderPolypMm
        : null;
    const diffMm = prevMm !== null ? Number((mm - prevMm).toFixed(1)) : null;
    const isCritical = mm >= 10;
    const isWatchClose = mm >= 6 && mm < 10;
    const isRapidGrowth = diffMm !== null && diffMm >= 2;
    indicators.push({
      key: 'gallbladderPolypMm',
      label: 'Polyp túi mật (Siêu âm)',
      shortLabel: 'Polyp túi mật',
      group: 'ultrasound',
      value: mm,
      unit: 'mm',
      refText: '< 6 mm (Theo dõi 6-12 tháng) · >= 10 mm cần hội chẩn',
      status: isCritical ? 'critical' : isWatchClose || isRapidGrowth ? 'high' : 'normal',
      badgeText: isCritical
        ? '🔴 Chạm ngưỡng >=10mm'
        : isRapidGrowth
          ? `🟡 Tăng nhanh (+${diffMm}mm)`
          : isWatchClose
            ? '🟡 Theo dõi sát (6-9.9mm)'
            : '🟢 Theo dõi định kỳ (<6mm)',
      badgeClass: isCritical
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : isWatchClose || isRapidGrowth
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isCritical
        ? 'Polyp >= 10 mm có nguy cơ biến chứng cao hơn; cần khám chuyên khoa Ngoại tiêu hóa sớm để bác sĩ đánh giá hướng xử trí.'
        : isWatchClose || isRapidGrowth
          ? 'Cần siêu âm kiểm tra lại sau mỗi 3-6 tháng, hạn chế đồ nhiều mỡ và rượu bia.'
          : 'Polyp nhỏ lành tính, tiếp tục siêu âm theo dõi định kỳ mỗi 6-12 tháng.',
    });
    if (isCritical || isWatchClose || isRapidGrowth) {
      summaryPoints.push(
        `Polyp túi mật hiện tại ${mm} mm${
          diffMm !== null && diffMm > 0 ? ` (tăng +${diffMm} mm so với lần siêu âm trước)` : ''
        }${isCritical ? ' - chạm mốc >= 10mm cần khám Ngoại tiêu hóa' : ' - cần theo dõi sát'}.`
      );
    }
  }

  let overallStatus: LabEvalStatus = 'normal';
  if (indicators.some((i) => i.status === 'critical')) {
    overallStatus = 'critical';
  } else if (indicators.some((i) => i.status === 'high' || i.status === 'low')) {
    overallStatus = 'high';
  } else if (indicators.length > 0 && indicators.every((i) => i.status === 'optimal' || i.status === 'normal')) {
    overallStatus = 'optimal';
  }

  return {
    indicators,
    overallStatus,
    summaryPoints,
  };
}




