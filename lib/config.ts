import { FamilyMember, PhaseConfig, EmergencyContact, ShiftRecord, CarePhase, ShiftType, PatientDailyReminder, PatientInfo, TimeSlot, BpThresholds, RehabStage, AppointmentInfo, CareRoutine } from './types';

export const PATIENT_INFO: PatientInfo = {
  name: 'Đinh Hồng Phong',
  diagnosis: 'Đang phục hồi chức năng sau đột quỵ (tai biến mạch máu não)',
  hospital: 'Bệnh viện Bạch Mai - Hà Nội (nơi điều trị trước đó)',
  room: 'Phục hồi tại nhà',
  notes: 'Cần theo dõi huyết áp hàng ngày, uống thuốc đúng giờ, tập phục hồi chức năng đều đặn.',
  emergencyPhone: '0913 218 765',
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
    relation: 'Em gái bệnh nhân',
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
    stageName: 'Mới về nhà — Chăm sóc tích cực',
    category: 'rehab',
    title: 'Tập co duỗi tay chân (bên liệt)',
    dosage: '15 phút',
    timeSlots: ['morning', 'afternoon'],
    instructions: 'Từ từ, nhẹ nhàng. Dừng nếu bố kêu đau.',
    conditionNote: '',
    isActive: true,
    sortOrder: 5,
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
  },
  {
    id: 'routine-rehab-02',
    stageId: 'stage-1',
    stageName: 'Mới về nhà — Chăm sóc tích cực',
    category: 'rehab',
    title: 'Tập ngồi tựa lưng trên giường',
    dosage: '10–20 phút',
    timeSlots: ['morning'],
    instructions: 'Đỡ bố ngồi dậy tựa gối, giữ thẳng lưng.',
    conditionNote: '',
    isActive: true,
    sortOrder: 6,
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
  },
  {
    id: 'routine-care-01',
    stageId: 'stage-1',
    stageName: 'Mới về nhà — Chăm sóc tích cực',
    category: 'care',
    title: 'Lật trở & chống loét tì đè',
    dosage: 'Mỗi 2 giờ',
    timeSlots: ['morning', 'noon', 'afternoon', 'evening'],
    instructions: 'Xoay nghiêng trái/phải, kê gối đỡ lưng và gót chân.',
    conditionNote: '',
    isActive: true,
    sortOrder: 7,
    createdAt: '2026-10-17T00:00:00.000Z',
    updatedAt: '2026-10-17T00:00:00.000Z',
  },
  {
    id: 'routine-care-02',
    stageId: 'stage-1',
    stageName: 'Mới về nhà — Chăm sóc tích cực',
    category: 'care',
    title: 'Vệ sinh răng miệng & thân thể',
    dosage: '',
    timeSlots: ['morning', 'evening'],
    instructions: 'Lau mặt ấm, đánh răng/lau nướu, thay quần áo sạch.',
    conditionNote: '',
    isActive: true,
    sortOrder: 8,
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
  thresholds: BpThresholds = DEFAULT_BP_THRESHOLDS
): ClinicalBpResult {
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
        'Huyết áp đang thấp hơn mức chuẩn, dễ gây hoa mắt, chóng mặt. Nên cho Bố nằm nghỉ, kê thấp đầu, uống thêm nước ấm và kiểm tra lại thuốc huyết áp.',
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
        ? 'Huyết áp tăng rất cao! Cho Bố nằm nghỉ ngơi tuyệt đối, kiểm tra ngay các dấu hiệu bất thường (đau đầu, tê yếu tay chân, nói khó) và liên hệ Bác sĩ.'
        : 'Huyết áp vượt ngưỡng an toàn (≥160/100 mmHg). Cần cho Bố nằm nghỉ yên tĩnh 15–30 phút, kiểm tra việc uống thuốc hạ áp và đo lại.',
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
        'Huyết áp cao hơn mức chuẩn một chút. Nên cho Bố ngồi hoặc nằm nghỉ thư giãn 15 phút rồi đo kiểm tra lại.',
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
      clinicalNote: 'Huyết áp rất đẹp và êm, rất tốt cho quá trình hồi phục của Bố.',
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
export function classifyClinicalPulse(pulse?: number | null): ClinicalPulseResult {
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
        'Nhịp tim đập dưới 50 lần/phút là khá chậm. Gia đình nên hỏi Bác sĩ xem thuốc đang uống có làm chậm nhịp tim không và theo dõi xem Bố có mệt hay chóng mặt không.',
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
        'Nhịp tim hơi chậm (<60 lần/phút). Khi đỡ Bố thay đổi tư thế (từ nằm sang ngồi hoặc đứng) nên làm từ từ để tránh choáng váng.',
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
        'Nhịp tim đập nhanh lúc nghỉ (≥100 lần/phút). Cần kiểm tra xem Bố có vừa tập vận động, bị đau mỏi, sốt hay thiếu nước không.',
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
  thresholds: BpThresholds = DEFAULT_BP_THRESHOLDS
): VitalReadingEvaluation {
  const sys = Number(input.sys) || 0;
  const dia = Number(input.dia) || 0;
  const pulseVal = typeof input.pulse === 'number' && !isNaN(input.pulse) ? input.pulse : 0;

  const bp = classifyClinicalBp(sys, dia, thresholds);
  const pulse = classifyClinicalPulse(pulseVal);
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



