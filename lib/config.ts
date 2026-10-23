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

/** Tính alert level cho huyết áp dựa trên ngưỡng */
export function computeAlertLevel(
  sys: number,
  dia: number,
  thresholds: BpThresholds = DEFAULT_BP_THRESHOLDS
): 'normal' | 'warning' | 'critical' {
  // Critical: quá cao hoặc quá thấp nguy hiểm
  if (sys >= 180 || sys <= 90 || dia >= 120 || dia <= 50) return 'critical';
  // Warning: vượt ngưỡng cấu hình
  if (sys >= thresholds.highSys || sys <= thresholds.lowSys ||
      dia >= thresholds.highDia || dia <= thresholds.lowDia) return 'warning';
  return 'normal';
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


