export type CarePhase = 'phase1' | 'phase2';

export type ShiftType = 'morning' | 'afternoon' | 'night' | 'day_12h' | 'night_12h';

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  phone: string;
  badgeColor: string;
  avatarInitials: string;
  // Specific color theme for shift cards & badges
  bgLight?: string;      // E.g. "bg-blue-50"
  borderLight?: string;  // E.g. "border-blue-300"
  textColor?: string;    // E.g. "text-blue-900"
  accentColor?: string;  // E.g. "bg-blue-600"
  pillBadge?: string;    // E.g. "bg-blue-100 text-blue-800 border-blue-200"
  isSupporter?: boolean; // Phân loại: Thành viên phụ hỗ trợ khi rảnh, không tính vào thống kê ca
}

export interface ShiftChecklist {
  feeding: boolean;
  meds: boolean;
  hygiene: boolean;
  turning: boolean;
  vitalsChecked?: boolean;
}

export interface PatientVitals {
  bp?: string;    // Huyết áp
  spo2?: string;  // SpO2 (%)
  pulse?: string; // Mạch (lần/phút)
  temp?: string;  // Thân nhiệt (°C)
}

export interface ShiftHandover {
  note: string;
  author?: string;
  updatedAt?: string;
  vitals?: PatientVitals;
}

export interface ShiftRecord {
  id: string;
  date: string; // YYYY-MM-DD
  type: ShiftType;
  name: string;
  timeRange: string;
  phase: CarePhase;
  requiredPax: number;
  assignees: (string | null)[]; // Tên người trực chính
  supporters?: string[]; // Tên thành viên phụ / người hỗ trợ đi cùng (không tính thống kê)
  checklist: ShiftChecklist;
  handover: ShiftHandover;
  isUnderstaffed: boolean;
  updatedAt?: string;
}

export interface PhaseConfig {
  id: CarePhase;
  name: string;
  subtitle: string;
  description: string;
  shifts: {
    type: ShiftType;
    name: string;
    timeRange: string;
    requiredPax: number;
  }[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  category: 'doctor' | 'ambulance' | 'neighbor' | 'nurse' | 'family';
  phone: string;
  note?: string;
  address?: string;
  isPrimary?: boolean;
}

export interface PatientInfo {
  name: string;
  diagnosis: string;
  hospital: string;
  room: string;
  notes: string;
  emergencyPhone?: string;
}

export interface SystemSettings {
  googleSheetsConnected: boolean;
  spreadsheetId?: string;
  sheetName?: string;
  currentPhase?: CarePhase;
  patientName?: string;
  patientRoom?: string;
  doctorNotes?: string;
  emergencyPhone?: string;
  hospital?: string;
  diagnosis?: string;
}

export type ReminderCategory = 'meds' | 'condition' | 'doctor' | 'feeding' | 'general';

export interface PatientDailyReminder {
  id: string;
  category: ReminderCategory;
  title: string;
  content: string;
  author: string;
  time: string;
  isUrgent?: boolean;
}

export interface AllAppData {
  shifts: ShiftRecord[];
  members: FamilyMember[];
  patientInfo: PatientInfo;
  contacts: EmergencyContact[];
  reminders: PatientDailyReminder[];
  settings: SystemSettings;
}

// =============================================
// V2.0 — SỔ SỨC KHỎE BỐ (Chăm sóc tại nhà)
// =============================================

// ===== VITALS LOG — Nhật ký Huyết áp & Sinh hiệu =====
export type VitalsPeriod = 'morning' | 'noon' | 'afternoon' | 'evening';
export type AlertLevel = 'normal' | 'warning' | 'critical';

export interface VitalsLogEntry {
  id: string;
  date: string;           // YYYY-MM-DD
  time: string;           // HH:mm
  period: VitalsPeriod;
  sys: number;            // Tâm thu (mmHg)
  dia: number;            // Tâm trương (mmHg)
  pulse?: number;         // Mạch (lần/phút)
  spo2?: number;          // SpO2 (%)
  temp?: number;          // Nhiệt độ (°C)
  bloodSugar?: number;    // Đường huyết (mg/dL)
  note?: string;          // Ghi chú ngắn
  alertLevel: AlertLevel; // Tự động tính dựa trên ngưỡng HA
  recordedBy: string;     // Ai ghi (mặc định "Mẹ")
  createdAt: string;      // ISO timestamp
}

// ===== CARE ROUTINES — Đơn thuốc & Bài tập phục hồi =====
export type RoutineCategory = 'meds' | 'rehab' | 'care';
export type MedType = 'scheduled' | 'as_needed';
export type TimeSlot = 'morning' | 'noon' | 'afternoon' | 'evening';

export interface CareRoutine {
  id: string;
  stageId: string;          // FK → RehabStage.id
  stageName: string;        // Tên giai đoạn (hiển thị)
  category: RoutineCategory;
  medType?: MedType;        // Chỉ khi category = 'meds'
  title: string;            // Tên thuốc / bài tập
  dosage: string;           // Liều lượng / Thời lượng
  description?: string;     // Mô tả nhận diện thuốc / công dụng (VD: màu sắc, hình dáng viên thuốc, tác dụng)
  imageUrl?: string;        // Hình ảnh thuốc / vỉ thuốc / minh hoạ (URL hoặc Base64 nén)
  timeSlots: TimeSlot[];    // Buổi áp dụng, VD: ['morning', 'evening']
  instructions: string;     // Hướng dẫn cho Mẹ
  conditionNote?: string;   // Điều kiện đặc biệt, VD: "Chỉ uống khi HA > 140"
  isActive: boolean;        // Đang áp dụng hay đã ngưng
  sortOrder: number;        // Thứ tự hiển thị trong buổi
  createdAt: string;
  updatedAt: string;
}

// ===== DAILY LOGS — Tích hoàn thành hàng ngày =====
export interface DailyLog {
  id: string;               // `dl-${date}-${routineId}-${timeSlot}`
  date: string;             // YYYY-MM-DD
  routineId: string;        // FK → CareRoutine.id
  timeSlot: TimeSlot;
  isDone: boolean;
  doneAt?: string;          // HH:mm
  doneBy?: string;          // Ai tích
  note?: string;            // Ghi chú khi tích
}

// ===== REHAB STAGE — Giai đoạn phục hồi =====
export interface RehabStage {
  id: string;               // VD: 'stage-1'
  name: string;             // VD: 'Mới về nhà — Chăm sóc tích cực'
  isActive: boolean;
}

// ===== APPOINTMENT — Lịch tái khám =====
export interface AppointmentInfo {
  nextDate?: string;        // Ngày tái khám tiếp theo (YYYY-MM-DD)
  nextNote?: string;        // BV nào, BS nào
  nextWho?: string;         // Ai đưa bố đi
  lastDate?: string;        // Ngày khám gần nhất
  lastNote?: string;        // BS nói gì lần khám gần nhất
}

// ===== BP THRESHOLDS — Ngưỡng cảnh báo HA (Admin cấu hình) =====
export interface BpThresholds {
  highSys: number;          // Mặc định 140
  highDia: number;          // Mặc định 90
  lowSys: number;           // Mặc định 100
  lowDia: number;           // Mặc định 60
}

// ===== APP MODE =====
export type AppMode = 'home_care' | 'icu';

// ===== EXTENDED AllAppData cho v2.0 =====
export interface AllAppDataV2 extends AllAppData {
  vitalsLog: VitalsLogEntry[];
  careRoutines: CareRoutine[];
  dailyLogs: DailyLog[];
  stages: RehabStage[];
  appointment: AppointmentInfo;
  bpThresholds: BpThresholds;
  appMode: AppMode;
}
