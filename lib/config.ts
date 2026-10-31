import { FamilyMember, PhaseConfig, EmergencyContact, ShiftRecord, CarePhase, ShiftType, PatientDailyReminder, PatientInfo, TimeSlot, BpThresholds, RehabStage, AppointmentInfo, CareRoutine, HealthProfile, HealthProfileType, LabResultEntry, TshTargetLevel } from './types';

// =============================================
// CẤU HÌNH ĐA GIA ĐÌNH (MULTI-FAMILY EDITION CONFIG)
// Tự động nhận diện Web "Sổ Sức Khỏe Ông Bà Nội" (so-suc-khoe-ong-ba-noi.vercel.app)
// hoặc qua biến môi trường NEXT_PUBLIC_APP_MODE=family_standard
// =============================================
const vercelProdUrl = (
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.NEXT_PUBLIC_VERCEL_URL ||
  ''
).toLowerCase();

export const IS_FAMILY_STANDARD_MODE =
  process.env.NEXT_PUBLIC_APP_MODE === 'family_standard' ||
  vercelProdUrl.includes('ong-ba-noi');

export const ENABLE_FAMILY_SHIFT_TAB =
  process.env.NEXT_PUBLIC_ENABLE_SHIFTS === 'true'
    ? true
    : process.env.NEXT_PUBLIC_ENABLE_SHIFTS === 'false'
      ? false
      : !IS_FAMILY_STANDARD_MODE;

export const DEFAULT_MEMBER_NAME =
  (
    process.env.NEXT_PUBLIC_DEFAULT_MEMBER_NAME ||
    process.env.NEXT_PUBLIC_DEFAULT_PATIENT_NAME ||
    ''
  ).trim() || (IS_FAMILY_STANDARD_MODE ? 'Bố Thành Đô' : 'Đinh Hồng Phong');

export const DEFAULT_MOTHER_NAME =
  (process.env.NEXT_PUBLIC_DEFAULT_MOTHER_NAME || '').trim() ||
  (IS_FAMILY_STANDARD_MODE ? 'Mẹ Bạch Yến' : 'Mẹ');

export const APP_TITLE =
  (process.env.NEXT_PUBLIC_APP_TITLE || '').trim() ||
  (IS_FAMILY_STANDARD_MODE
    ? 'Sổ Sức Khỏe Ông Bà Nội'
    : `Sổ Sức Khỏe Bố - ${DEFAULT_MEMBER_NAME}`);

export const APP_SHORT_TITLE =
  (process.env.NEXT_PUBLIC_APP_SHORT_TITLE || '').trim() ||
  (IS_FAMILY_STANDARD_MODE ? 'Sổ Sức Khỏe Ông Bà Nội' : 'Sổ Sức Khỏe Bố');

export const PATIENT_INFO: PatientInfo = {
  name: DEFAULT_MEMBER_NAME,
  diagnosis: IS_FAMILY_STANDARD_MODE
    ? 'Theo dõi huyết áp, tim mạch & chăm sóc sức khỏe hằng ngày'
    : 'Đang phục hồi chức năng sau đột quỵ (tai biến mạch máu não)',
  hospital: IS_FAMILY_STANDARD_MODE
    ? 'Khám & kiểm tra định kỳ'
    : 'Bệnh viện Bạch Mai - Hà Nội (nơi điều trị trước đó)',
  room: 'Tại nhà',
  notes: 'Cần theo dõi huyết áp hàng ngày, uống thuốc đúng giờ, tập vận động và nghỉ ngơi đều đặn.',
  emergencyPhone: IS_FAMILY_STANDARD_MODE ? '' : '0913 218 765',
  statusBadge: 'Theo dõi sức khỏe gia đình',
  conditionTag: IS_FAMILY_STANDARD_MODE ? 'Huyết áp & Tim mạch' : 'Phục hồi tại nhà',
  headerBadge: 'Tại nhà',
  careMode: 'Hằng ngày',
  careGoal: 'Duy trì huyết áp & sức khỏe ổn định',
};

export const FAMILY_MEMBERS: FamilyMember[] = [
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
// V2.0 — SỔ SỨC KHỎE BỐ — Constants mới
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
export const DEFAULT_BP_THRESHOLDS: BpThresholds = {
  highSys: 140,
  highDia: 90,
  lowSys: 100,
  lowDia: 60,
};

/** Giai đoạn phục hồi mặc định */
export const DEFAULT_REHAB_STAGES: RehabStage[] = [
  { id: 'stage-1', name: 'Mới về nhà — Chăm sóc tích cực', isActive: true },
];

/** Lịch tái khám mặc định (trống) */
export const DEFAULT_APPOINTMENT: AppointmentInfo = {
  nextDate: '',
  nextNote: '',
  nextWho: '',
  lastDate: '',
  lastNote: '',
};

/** Tên người ghi mặc định (Mẹ không cần chọn "Tôi là ai") */
export const DEFAULT_RECORDER = 'Mẹ';

/** Danh sách đơn thuốc & bài tập phục hồi mặc định (Giai đoạn 1) */
export const DEFAULT_CARE_ROUTINES: CareRoutine[] = [
  {
    id: 'routine-med-01',
    stageId: 'stage-1',
    stageName: 'Mới về nhà — Chăm sóc tích cực',
    category: 'meds',
    medType: 'scheduled',
    title: 'Amlodipine (Amlor) 5mg',
    dosage: '1 viên',
    description: 'Thuốc hạ huyết áp — Viên nang cứng màu vàng-trắng (hoặc viên nén trắng)',
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
    stageName: 'Mới về nhà — Chăm sóc tích cực',
    category: 'meds',
    medType: 'scheduled',
    title: 'Aspirin 81mg',
    dosage: '1 viên',
    description: 'Thuốc chống đông máu, ngừa tái phát đột quỵ — Viên nén nhỏ bao phim',
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
    stageName: 'Mới về nhà — Chăm sóc tích cực',
    category: 'meds',
    medType: 'scheduled',
    title: 'Atorvastatin 20mg',
    dosage: '1 viên',
    description: 'Thuốc hạ mỡ máu, ổn định thành mạch — Viên nén dài màu trắng',
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
    stageName: 'Mới về nhà — Chăm sóc tích cực',
    category: 'meds',
    medType: 'as_needed',
    title: 'Paracetamol 500mg',
    dosage: '1 viên',
    description: 'Thuốc giảm đau, hạ sốt — Viên nén dài màu trắng (hoặc sủi)',
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
  const [yA, mA, dA] = dateStrA.split('-').map(Number);
  const [yB, mB, dB] = dateStrB.split('-').map(Number);
  if (!yA || !mA || !dA || !yB || !mB || !dB) return 0;
  const utcA = Date.UTC(yA, mA - 1, dA, 12, 0, 0);
  const utcB = Date.UTC(yB, mB - 1, dB, 12, 0, 0);
  return Math.round((utcA - utcB) / (1000 * 60 * 60 * 24));
}

/**
 * Hiển thị ngày tiếng Việt thân thiện cho người lớn tuổi: "Thứ Sáu, 23/10/2026"
 */
export function formatVietnamDateFull(dateStr: string): string {
  const parts = (dateStr || '').split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return dateStr;
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekdayLabel = WEEKDAY_VN_LABELS[utcNoon.getUTCDay()] || '';
  return `${weekdayLabel}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
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
  // 1. Huyết áp thấp (Hạ áp — Nguy cơ giảm máu nuôi não)
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
        ? `Huyết áp rất cao — Nguy hiểm (≥180/110 mmHg)`
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
      shortLabel: '—',
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
export function normalizeDateStr(raw: string | undefined | null): string {
  if (!raw) return '';
  const str = String(raw).trim();
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
 * Chuẩn hóa mọi chuỗi giờ ('6:05', '06:05', '6h05'...) về chuẩn HH:mm (24h, luôn có 2 chữ số giờ).
 * Khắc phục triệt để lỗi so sánh chuỗi '6:05' > '11:14'.
 */
export function normalizeTimeStr(raw: string | undefined | null): string {
  if (!raw) return '';
  const str = String(raw).trim();
  const match = str.match(/(\d{1,2})[:hH](\d{1,2})/);
  if (match) {
    let hh = parseInt(match[1], 10);
    const mm = parseInt(match[2], 10);
    const lower = str.toLowerCase();
    if ((lower.includes('pm') || lower.includes('ch')) && hh < 12) {
      hh += 12;
    } else if ((lower.includes('am') || lower.includes('sa')) && hh === 12) {
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
    id: 'gen_after_walk',
    value: 'Đo sau tập thể dục',
    label: '🚶 Đo sau tập thể dục',
    tone: 'neutral',
  },
  {
    id: 'gen_dizzy',
    value: 'Hơi hoa mắt / chóng mặt',
    label: '😵 Hơi hoa mắt / chóng mặt',
    tone: 'warn',
    clinicalTip:
      'Nên ngồi hoặc nằm nghỉ yên tĩnh 15–20 phút, uống một ngụm nước ấm và đo kiểm tra lại huyết áp.',
  },
  {
    id: 'gen_headache',
    value: 'Hơi đau đầu / mỏi vai gáy',
    label: '🤕 Đau đầu / mỏi vai gáy',
    tone: 'warn',
    clinicalTip:
      'Nếu đau đầu kèm huyết áp tăng cao (≥140/90 mmHg), cần nghỉ ngơi tuyệt đối và theo dõi sát để dùng thuốc theo chỉ định Bác sĩ.',
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

export function getQuickNoteTagsForProfile(
  profileType: HealthProfileType = 'post_stroke_cranioplasty'
): VitalsQuickNoteTag[] {
  if (profileType === 'post_stroke_cranioplasty') {
    return VITALS_QUICK_NOTE_TAGS;
  }
  if (profileType === 'thyroid_post_op') {
    return THYROID_VITALS_QUICK_NOTE_TAGS;
  }
  return GENERAL_VITALS_QUICK_NOTE_TAGS;
}

// =============================================
// MULTI-PROFILE — HỆ THỐNG ĐA HỒ SƠ SỨC KHỎE GIA ĐÌNH (100% TƯƠNG THÍCH NGƯỢC)
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
 * 2. Tự động khởi tạo sẵn hồ sơ số 2 cho Mẹ (`id: 'mother'` — Mẹ Bạch Yến trên web Ông Bà Nội) nếu chưa có để gia đình dùng ngay.
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

  // Chuẩn hoá tên & chẩn đoán mặc định cho Bố khi ở Web Ông Bà Nội (nhưng vẫn tôn trọng 100% nếu user đã sửa trên web)
  const rawFatherName = (fatherPatientInfo.name || '').trim();
  const isUneditedLegacyFatherName =
    !rawFatherName ||
    (IS_FAMILY_STANDARD_MODE && (rawFatherName === 'Đinh Hồng Phong' || rawFatherName === 'Bố'));

  const resolvedFatherName = isUneditedLegacyFatherName ? DEFAULT_MEMBER_NAME : rawFatherName;

  const rawFatherDiag = (fatherPatientInfo.diagnosis || '').trim();
  const isUneditedLegacyFatherDiag =
    !rawFatherDiag ||
    (IS_FAMILY_STANDARD_MODE &&
      (rawFatherDiag.toLowerCase().includes('đột quỵ') ||
        rawFatherDiag.toLowerCase().includes('tai biến')));

  const resolvedFatherDiag = isUneditedLegacyFatherDiag
    ? IS_FAMILY_STANDARD_MODE
      ? 'Theo dõi huyết áp, tim mạch, mỡ máu & chăm sóc sức khỏe hằng ngày'
      : 'Đang phục hồi chức năng sau đột quỵ (tai biến mạch máu não)'
    : rawFatherDiag;

  const resolvedFatherHospital =
    IS_FAMILY_STANDARD_MODE &&
    (!fatherPatientInfo.hospital ||
      fatherPatientInfo.hospital.toLowerCase().includes('bạch mai'))
      ? 'Khám & kiểm tra sức khỏe định kỳ'
      : fatherPatientInfo.hospital || 'Khám & kiểm tra định kỳ';

  const resolvedFatherNotes =
    IS_FAMILY_STANDARD_MODE && !fatherPatientInfo.notes
      ? 'Đo huyết áp sáng/tối, uống thuốc đúng giờ, tập vận động nhẹ nhàng và ăn nhạt giảm mỡ.'
      : fatherPatientInfo.notes ||
        'Đo huyết áp hàng ngày, uống thuốc đúng giờ, tập vận động và nghỉ ngơi đều đặn.';

  // 1. Hồ sơ mặc định của thành viên chính (Bố)
  const fatherProfile: HealthProfile = {
    id: DEFAULT_HEALTH_PROFILE_ID,
    name: resolvedFatherName,
    relation: 'Bố',
    avatarEmoji: IS_FAMILY_STANDARD_MODE ? '👴' : '👨',
    profileType: IS_FAMILY_STANDARD_MODE ? 'general_health' : 'post_stroke_cranioplasty',
    patientInfo: {
      ...fatherPatientInfo,
      name: resolvedFatherName,
      diagnosis: resolvedFatherDiag,
      hospital: resolvedFatherHospital,
      notes: resolvedFatherNotes,
      statusBadge:
        IS_FAMILY_STANDARD_MODE &&
        (!fatherPatientInfo.statusBadge ||
          fatherPatientInfo.statusBadge.includes('đặc biệt'))
          ? 'Hồ sơ sức khỏe gia đình'
          : fatherPatientInfo.statusBadge || 'Theo dõi sức khỏe gia đình',
      conditionTag:
        IS_FAMILY_STANDARD_MODE &&
        (!fatherPatientInfo.conditionTag ||
          fatherPatientInfo.conditionTag.includes('Tai biến'))
          ? 'Huyết áp & Tim mạch'
          : fatherPatientInfo.conditionTag || 'Phục hồi tại nhà',
      careMode:
        IS_FAMILY_STANDARD_MODE && fatherPatientInfo.careMode === 'Liên tục 24/7'
          ? 'Hằng ngày'
          : fatherPatientInfo.careMode || 'Hằng ngày',
      careGoal:
        IS_FAMILY_STANDARD_MODE &&
        (!fatherPatientInfo.careGoal || fatherPatientInfo.careGoal.includes('SpO2'))
          ? 'Duy trì huyết áp, mỡ máu & nhịp tim ổn định'
          : fatherPatientInfo.careGoal || 'Duy trì huyết áp & sức khỏe ổn định',
      healthProfiles: undefined,
    },
    bpThresholds: fatherThresholds || DEFAULT_BP_THRESHOLDS,
    appointment: fatherAppointment || DEFAULT_APPOINTMENT,
  };

  // 2. Các hồ sơ thành viên khác đã lưu
  const otherProfiles: HealthProfile[] = savedList
    .filter((p) => p && p.id && p.id !== DEFAULT_HEALTH_PROFILE_ID)
    .map((p) => {
      const isMotherOnStandardWeb = IS_FAMILY_STANDARD_MODE && p.id === 'mother';
      const defaultProfileType: HealthProfileType = isMotherOnStandardWeb
        ? 'thyroid_post_op'
        : 'general_health';
      const resolvedName =
        isMotherOnStandardWeb && (!p.name || p.name === 'Mẹ')
          ? DEFAULT_MOTHER_NAME
          : p.name || 'Thành viên';
      return {
        id: p.id,
        name: resolvedName,
        relation: p.relation || (p.id === 'mother' ? 'Mẹ' : 'Gia đình'),
        avatarEmoji: p.avatarEmoji || (isMotherOnStandardWeb ? '👵' : '👩'),
        profileType: p.profileType || defaultProfileType,
        patientInfo: {
          name: p.patientInfo?.name && p.patientInfo.name !== 'Mẹ' ? p.patientInfo.name : resolvedName,
          diagnosis:
            p.patientInfo?.diagnosis ??
            (isMotherOnStandardWeb
              ? 'Đã phẫu thuật cắt toàn bộ tuyến giáp (K giáp thể nhú) • Duy trì hormone Levothyroxine & Kiểm soát Huyết áp, Mỡ máu, Canxi'
              : 'Theo dõi huyết áp, nhịp tim & sức khỏe định kỳ'),
          hospital:
            p.patientInfo?.hospital ??
            (isMotherOnStandardWeb ? 'Khám chuyên khoa Nội tiết & Tim mạch định kỳ' : 'Khám định kỳ'),
          room: p.patientInfo?.room ?? 'Tại nhà',
          notes:
            p.patientInfo?.notes ??
            (isMotherOnStandardWeb
              ? 'Uống Levothyroxine buổi sáng lúc bụng đói (trước ăn 30–60 phút), cách xa Canxi/Sắt ít nhất 4 tiếng. Theo dõi nhịp tim, huyết áp và dấu hiệu tê bì tay chân.'
              : 'Đo huyết áp định kỳ sáng/tối, uống đủ nước ấm, nghỉ ngơi hợp lý.'),
          emergencyPhone: p.patientInfo?.emergencyPhone || fatherPatientInfo.emergencyPhone || '',
          statusBadge:
            p.patientInfo?.statusBadge ||
            (isMotherOnStandardWeb ? 'Theo dõi Tuyến giáp & Tim mạch' : 'Theo dõi sức khỏe gia đình'),
          conditionTag:
            p.patientInfo?.conditionTag ||
            (isMotherOnStandardWeb ? 'Tuyến giáp • HA • Mỡ máu' : 'Huyết áp & Tim mạch'),
          headerBadge: p.patientInfo?.headerBadge || 'Tại nhà',
          careMode: p.patientInfo?.careMode || 'Hằng ngày',
          careGoal:
            p.patientInfo?.careGoal ||
            (isMotherOnStandardWeb
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

  // Nếu chưa có hồ sơ của Mẹ ('mother'), tự động tạo sẵn hồ sơ Mẹ để gia đình bấm chuyển sang dùng được ngay!
  if (!otherProfiles.some((p) => p.id === 'mother')) {
    const motherMember = members.find(
      (m) =>
        m.name.toLowerCase().includes('mẹ') ||
        m.relation.toLowerCase().includes('mẹ') ||
        m.relation.toLowerCase().includes('vợ')
    );
    const motherDisplayName = IS_FAMILY_STANDARD_MODE
      ? DEFAULT_MOTHER_NAME
      : motherMember
        ? motherMember.name
        : 'Mẹ';

    otherProfiles.unshift({
      id: 'mother',
      name: motherDisplayName,
      relation: 'Mẹ',
      avatarEmoji: IS_FAMILY_STANDARD_MODE ? '👵' : '👩',
      profileType: IS_FAMILY_STANDARD_MODE ? 'thyroid_post_op' : 'general_health',
      patientInfo: {
        name: motherDisplayName,
        diagnosis: IS_FAMILY_STANDARD_MODE
          ? 'Đã phẫu thuật cắt toàn bộ tuyến giáp (K giáp thể nhú) • Duy trì hormone Levothyroxine & Kiểm soát Huyết áp, Mỡ máu, Canxi'
          : 'Theo dõi huyết áp, tim mạch & chăm sóc sức khỏe hằng ngày',
        hospital: IS_FAMILY_STANDARD_MODE
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
        customFields: [
          ...(IS_FAMILY_STANDARD_MODE
            ? [
                {
                  id: 'cf-thyroid-1',
                  label: 'Phác đồ Tuyến giáp',
                  value: 'Đã cắt toàn bộ tuyến giáp — Uống Levothyroxine hằng ngày lúc đói (Mục tiêu ức chế TSH)',
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

  // Mẫu chuẩn cho Bố Thành Đô hoặc thành viên sức khỏe tổng quát / huyết áp / tim mạch
  const generalItems: CareRoutine[] = [
    {
      id: 'routine-gen-med-01',
      stageId,
      stageName,
      category: 'meds',
      medType: 'scheduled',
      title: 'Thuốc Huyết áp / Tim mạch buổi sáng (theo đơn)',
      dosage: '1 viên',
      description: 'Duy trì huyết áp ổn định trong ngày (có thể bấm Quản lý đơn thuốc để sửa đúng tên thuốc đang dùng).',
      imageUrl: '',
      timeSlots: ['morning'],
      instructions: 'Đo huyết áp trước khi uống. Uống sau ăn sáng 30 phút.',
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
      title: 'Thuốc Mỡ máu / Bổ trợ tuần hoàn buổi tối (nếu có)',
      dosage: '1 viên',
      description: 'Ổn định mỡ máu và thành mạch (có thể sửa hoặc tắt nếu không dùng).',
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
      title: 'Đi bộ / Tập thể dục dưỡng sinh nhẹ nhàng',
      dosage: '20 phút',
      description: 'Giúp lưu thông khí huyết, ổn định huyết áp và ngủ ngon hơn.',
      imageUrl: '',
      timeSlots: ['morning', 'afternoon'],
      instructions: 'Tập vừa sức, khởi động kỹ trước khi tập.',
      conditionNote: '',
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
      title: 'Uống đủ nước ấm & Ăn nhạt giảm muối, giảm mỡ',
      dosage: 'Hằng ngày',
      description: 'Chế độ dinh dưỡng bảo vệ tim mạch và huyết áp.',
      imageUrl: '',
      timeSlots: ['morning', 'noon', 'afternoon', 'evening'],
      instructions: 'Uống nước ấm đều đặn, hạn chế đồ mặn và thực phẩm nhiều Cholesterol.',
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
  group: 'thyroid' | 'markers' | 'lipid' | 'metabolic' | 'liver_kidney';
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
  profileType: HealthProfileType = 'general_health'
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
    entry.tshTargetLevel === 'moderate_risk';

  const tshTarget: TshTargetLevel =
    entry.tshTargetLevel || (isThyroidProfile ? 'moderate_risk' : 'normal');

  // 1. TSH (µIU/mL)
  if (typeof entry.tsh === 'number' && !isNaN(entry.tsh)) {
    const val = entry.tsh;
    let status: LabEvalStatus = 'normal';
    let badgeText = '🟢 Đạt chuẩn';
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    let refText = '0.40 – 4.00 µIU/mL';
    let clinicalNote = 'TSH nằm trong giới hạn bình thường.';

    if (tshTarget === 'high_risk') {
      refText = 'Mục tiêu ức chế cao: < 0.10 µIU/mL';
      if (val < 0.01) {
        status = 'low';
        badgeText = '🟡 Ức chế rất sâu (<0.01)';
        badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
        clinicalNote =
          'TSH ức chế rất sâu (<0.01 µIU/mL). Cần theo dõi nhịp tim và mật độ xương để tránh cường giáp dưới lâm sàng quá mức.';
      } else if (val <= 0.1) {
        status = 'optimal';
        badgeText = '🟢 Đạt đích ức chế (<0.1)';
        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        clinicalNote = 'TSH đạt mục tiêu ức chế cao (<0.1 µIU/mL) sau phẫu thuật K giáp.';
      } else if (val <= 0.5) {
        status = 'normal';
        badgeText = '🟢 Ức chế vừa (0.1–0.5)';
        badgeClass = 'bg-teal-100 text-teal-800 border-teal-200';
        clinicalNote = 'TSH ở mức ức chế vừa (0.1–0.5 µIU/mL).';
      } else {
        status = val > 2.0 ? 'critical' : 'high';
        badgeText = val > 2.0 ? '🔴 TSH cao (>2.0)' : '🟡 Chưa đạt đích ức chế';
        badgeClass =
          val > 2.0
            ? 'bg-rose-100 text-rose-800 border-rose-300'
            : 'bg-amber-100 text-amber-800 border-amber-300';
        clinicalNote =
          'TSH cao hơn mục tiêu ức chế. Cần kiểm tra việc uống Levothyroxine lúc đói (cách xa Canxi/Sắt 4h) và hỏi Bác sĩ chỉnh liều.';
        summaryPoints.push(clinicalNote);
      }
    } else if (tshTarget === 'moderate_risk') {
      refText = 'Mục tiêu ức chế: 0.10 – 0.50 µIU/mL (hoặc <0.1)';
      if (val < 0.05) {
        status = 'low';
        badgeText = '🟡 Ức chế sâu (<0.05)';
        badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
        clinicalNote =
          'TSH thấp sâu (<0.05 µIU/mL). Nếu kèm tim đập nhanh, hồi hộp hoặc FT4 cao, nên báo Bác sĩ xem xét giảm nhẹ liều Levothyroxine.';
        summaryPoints.push(clinicalNote);
      } else if (val <= 0.5) {
        status = 'optimal';
        badgeText = '🟢 Đạt đích ức chế (≤0.5)';
        badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        clinicalNote = 'TSH nằm trong vùng mục tiêu ức chế tối ưu sau phẫu thuật K giáp.';
      } else if (val <= 2.0) {
        status = 'normal';
        badgeText = '🟡 Hơi cao so với đích ức chế';
        badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
        clinicalNote = 'TSH trong ngưỡng bình thường chung nhưng cao hơn mức ức chế 0.5 µIU/mL.';
      } else {
        status = 'high';
        badgeText = '🔴 TSH cao (Thiếu hormone)';
        badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
        clinicalNote =
          'TSH tăng cao gợi ý chưa đủ liều hormone Levothyroxine hoặc giảm hấp thu thuốc. Cần báo Bác sĩ điều chỉnh.';
        summaryPoints.push(clinicalNote);
      }
    } else {
      if (val < 0.4) {
        status = 'low';
        badgeText = '🟡 Thấp (<0.4)';
        badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
        clinicalNote = 'TSH thấp hơn ngưỡng bình thường (xu hướng cường giáp / dư hormone).';
      } else if (val > 4.2) {
        status = 'high';
        badgeText = '🔴 Cao (>4.2)';
        badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
        clinicalNote = 'TSH tăng cao (xu hướng suy giáp / thiếu hormone tuyến giáp).';
      }
    }

    indicators.push({
      key: 'tsh',
      label: 'TSH (Hormone kích thích tuyến giáp)',
      shortLabel: 'TSH',
      group: 'thyroid',
      value: val,
      unit: 'µIU/mL',
      refText,
      status,
      badgeText,
      badgeClass,
      clinicalNote,
    });
  }

  // 2. FT4 (ng/dL hoặc pmol/L -> quy đổi nội bộ sang ng/dL để đánh giá chuẩn: 1 ng/dL = 12.87 pmol/L)
  if (typeof entry.ft4 === 'number' && !isNaN(entry.ft4)) {
    const unit = entry.ft4Unit || (entry.ft4 > 5 ? 'pmol/L' : 'ng/dL');
    const valInNgDl = unit === 'pmol/L' ? entry.ft4 / 12.87 : entry.ft4;
    const refText =
      unit === 'pmol/L'
        ? isThyroidProfile
          ? '12.0 – 22.0 (Đích ức chế: 16.5 – 22.0 pmol/L)'
          : '12.0 – 22.0 pmol/L'
        : isThyroidProfile
          ? '0.93 – 1.70 (Đích ức chế: 1.30 – 1.70 ng/dL)'
          : '0.93 – 1.70 ng/dL';

    let status: LabEvalStatus = 'normal';
    let badgeText = '🟢 Đạt chuẩn';
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    let clinicalNote = 'Nồng độ FT4 tự do trong máu ổn định.';

    if (valInNgDl < 0.9) {
      status = 'low';
      badgeText = '🔴 FT4 thấp';
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
      clinicalNote = 'FT4 thấp hơn chuẩn (thiếu hụt hormone giáp T4).';
      summaryPoints.push(clinicalNote);
    } else if (valInNgDl > 1.85) {
      status = 'high';
      badgeText = '🟡 FT4 cao (Dư hormone)';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote =
        'FT4 vượt ngưỡng trên, dễ gây hồi hộp, nhịp tim nhanh. Nên trao đổi Bác sĩ về liều Levothyroxine.';
      summaryPoints.push(clinicalNote);
    } else if (isThyroidProfile && valInNgDl >= 1.25 && valInNgDl <= 1.75) {
      status = 'optimal';
      badgeText = '🟢 Tối ưu (1.3–1.7)';
    }

    indicators.push({
      key: 'ft4',
      label: 'FT4 (Thyroxine tự do)',
      shortLabel: 'FT4',
      group: 'thyroid',
      value: entry.ft4,
      unit,
      refText,
      status,
      badgeText,
      badgeClass,
      clinicalNote,
    });
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

  // 4. TG (Thyroglobulin - ng/mL)
  if (typeof entry.tg === 'number' && !isNaN(entry.tg)) {
    const val = entry.tg;
    let status: LabEvalStatus = 'optimal';
    let badgeText = '🟢 Rất tốt (<0.2)';
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    let clinicalNote = 'Chỉ dấu TG rất thấp, đáp ứng hoàn toàn tốt sau cắt toàn bộ tuyến giáp.';

    if (val >= 0.2 && val <= 1.0) {
      status = 'normal';
      badgeText = '🟢 Ổn định (≤1.0)';
      badgeClass = 'bg-teal-100 text-teal-800 border-teal-200';
      clinicalNote = 'TG ở mức thấp an toàn (≤1.0 ng/mL), tiếp tục theo dõi định kỳ.';
    } else if (val > 1.0) {
      status = val >= 2.0 ? 'critical' : 'high';
      badgeText = '🟡 Cần lưu ý (>1.0)';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote =
        'Chỉ số TG > 1.0 ng/mL sau cắt toàn bộ tuyến giáp: cần theo dõi động học TG cùng siêu âm vùng cổ theo hướng dẫn Bác sĩ chuyên khoa.';
      summaryPoints.push(clinicalNote);
    }

    indicators.push({
      key: 'tg',
      label: 'TG (Thyroglobulin - Marker K giáp)',
      shortLabel: 'TG',
      group: 'markers',
      value: val,
      unit: 'ng/mL',
      refText: 'Sau cắt giáp toàn bộ: < 0.2 – 1.0 ng/mL',
      status,
      badgeText,
      badgeClass,
      clinicalNote,
    });
  }

  // 5. Anti-TG (IU/mL)
  if (typeof entry.antiTg === 'number' && !isNaN(entry.antiTg)) {
    const val = entry.antiTg;
    const isHigh = val > 115;
    indicators.push({
      key: 'antiTg',
      label: 'Anti-TG (Kháng thể kháng Thyroglobulin)',
      shortLabel: 'Anti-TG',
      group: 'markers',
      value: val,
      unit: 'IU/mL',
      refText: '< 115 IU/mL (Âm tính)',
      status: isHigh ? 'high' : 'normal',
      badgeText: isHigh ? '🟡 Tăng (>115)' : '🟢 Âm tính (<115)',
      badgeClass: isHigh
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Anti-TG tăng có thể ảnh hưởng đến độ chính xác của TG; cần theo dõi xu hướng giảm dần của Anti-TG qua các kỳ khám.'
        : 'Anti-TG âm tính, giúp kết quả định lượng TG đạt độ tin cậy cao nhất.',
    });
  }

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

  // 7. Bộ Mỡ máu (Lipid Panel) — Hỗ trợ cả mmol/L và mg/dL
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
        : 'Đường huyết lúc đói ổn định.',
    });
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
  }

  if (typeof entry.calcium === 'number' && !isNaN(entry.calcium)) {
    const unit = entry.calciumUnit || (entry.calcium > 5 ? 'mg/dL' : 'mmol/L');
    const valMg = unit === 'mmol/L' ? entry.calcium * 4.0 : entry.calcium;
    const isLow = valMg < 8.6;
    const isHigh = valMg > 10.3;
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
        ? 'Canxi máu thấp (dễ gây tê bì tay chân, chuột rút sau mổ tuyến giáp). Cần bổ sung đều đặn Canxi + Vitamin D3 cách giờ uống thuốc giáp ít nhất 4 tiếng.'
        : 'Nồng độ Canxi máu ổn định, đảm bảo tốt cho thần kinh - cơ và xương.',
    });
    if (isLow) {
      summaryPoints.push(
        'Canxi máu đang thấp (<2.15 mmol/L hay <8.6 mg/dL) — cần chú ý bổ sung Canxi + Vitamin D3 đầy đủ.'
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

  if (typeof entry.vitaminD === 'number' && !isNaN(entry.vitaminD)) {
    const val = entry.vitaminD;
    const isLow = val < 30;
    const isDeficient = val < 20;
    indicators.push({
      key: 'vitaminD',
      label: '25-OH Vitamin D',
      shortLabel: 'Vitamin D',
      group: 'metabolic',
      value: val,
      unit: 'ng/mL',
      refText: '30 – 100 ng/mL',
      status: isDeficient ? 'critical' : isLow ? 'low' : 'optimal',
      badgeText: isDeficient ? '🔴 Thiếu hụt (<20)' : isLow ? '🟡 Hơi thiếu (<30)' : '🟢 Đạt chuẩn (≥30)',
      badgeClass: isDeficient
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : isLow
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isLow
        ? 'Vitamin D dưới 30 ng/mL làm giảm hấp thu Canxi vào xương. Nên duy trì bổ sung Vitamin D3 và tắm nắng sáng.'
        : 'Nồng độ Vitamin D tối ưu giúp hấp thu Canxi tốt.',
    });
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
      refText: '< 37 – 40 U/L',
      status: entry.ast > 80 ? 'critical' : isHigh ? 'high' : 'normal',
      badgeText: isHigh ? '🟡 Tăng (>40)' : '🟢 Bình thường',
      badgeClass: isHigh
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Men gan AST tăng nhẹ; cần theo dõi chức năng gan, nhất là khi đang dùng thuốc hạ mỡ máu.'
        : 'Men gan AST bình thường.',
    });
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
      badgeText: isHigh ? '🟡 Tăng (>40)' : '🟢 Bình thường',
      badgeClass: isHigh
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Men gan ALT tăng; cần uống đủ nước và báo Bác sĩ kiểm tra.'
        : 'Men gan ALT bình thường.',
    });
  }

  if (typeof entry.creatinine === 'number' && !isNaN(entry.creatinine)) {
    const isHigh = entry.creatinine > 110;
    indicators.push({
      key: 'creatinine',
      label: 'Creatinine máu (Chức năng thận)',
      shortLabel: 'Creatinine',
      group: 'liver_kidney',
      value: entry.creatinine,
      unit: 'µmol/L',
      refText: '53 – 110 µmol/L',
      status: isHigh ? 'high' : 'normal',
      badgeText: isHigh ? '🟡 Cao (>110)' : '🟢 Bình thường',
      badgeClass: isHigh
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Creatinine hơi cao; cần chú ý uống đủ nước và theo dõi chức năng lọc cầu thận.'
        : 'Chức năng thận ổn định.',
    });
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
      refText: '2.5 – 7.5 mmol/L',
      status: isHigh ? 'high' : 'normal',
      badgeText: isHigh ? '🟡 Hơi cao' : '🟢 Bình thường',
      badgeClass: isHigh
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh ? 'Ure máu hơi cao (có thể do thiếu nước hoặc ăn nhiều đạm).' : 'Ure máu bình thường.',
    });
  }

  if (typeof entry.uricAcid === 'number' && !isNaN(entry.uricAcid)) {
    const isHigh = entry.uricAcid > 400;
    indicators.push({
      key: 'uricAcid',
      label: 'Acid Uric máu',
      shortLabel: 'Acid Uric',
      group: 'liver_kidney',
      value: entry.uricAcid,
      unit: 'µmol/L',
      refText: '150 – 400 µmol/L',
      status: isHigh ? 'high' : 'normal',
      badgeText: isHigh ? '🟡 Cao (>400)' : '🟢 Bình thường',
      badgeClass: isHigh
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Acid Uric cao; nên hạn chế hải sản, thịt đỏ, nước hầm xương và uống nhiều nước.'
        : 'Acid Uric trong giới hạn tốt.',
    });
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
      refText: isGPerL ? '120 – 160 g/L' : '12.0 – 16.0 g/dL',
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




