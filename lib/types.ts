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

export interface PatientCustomField {
  id: string;
  label: string;
  value: string;
  section?: 'profile' | 'care';
}

export type HealthProfileType = 'post_stroke_cranioplasty' | 'thyroid_post_op' | 'general_health';

export interface HealthProfile {
  id: string;                 // 'father' (mặc định cho Bố), 'mother' (Mẹ), hoặc 'profile-...'
  name: string;               // VD: 'Đinh Hồng Phong', 'Mẹ', ...
  relation: string;           // VD: 'Bố', 'Mẹ', 'Bản thân', ...
  avatarEmoji: string;        // VD: '👨', '👩', '👴', '👵', '🧑'
  profileType: HealthProfileType;
  patientInfo: PatientInfo;
  bpThresholds: BpThresholds;
  appointment: AppointmentInfo;
}

export interface PatientInfo {
  name: string;
  diagnosis: string;
  hospital: string;
  room: string;
  notes: string;
  emergencyPhone?: string;
  statusBadge?: string;
  conditionTag?: string;
  headerBadge?: string;
  careMode?: string;
  careGoal?: string;
  customFields?: PatientCustomField[];
  healthProfiles?: HealthProfile[];
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

// ===== EXPENSE TRACKER — Sổ Theo Dõi Thu Chi Điều Trị (Mã PIN riêng biệt) =====
export type ExpenseType = 'out' | 'in';

export type ExpenseStage = 'emergency' | 'rehab_hospital' | 'home_care';

export type ExpenseCategory =
  // Danh mục Khoản Chi ('out')
  | 'hospital_fee'      // Viện phí & Thủ thuật
  | 'medicine'          // Thuốc men & Vật tư y tế
  | 'equipment'         // Thiết bị & Dụng cụ hỗ trợ
  | 'nutrition_diaper'  // Dinh dưỡng & Bỉm sữa
  | 'transport'         // Xe cộ & Vận chuyển
  | 'care_service'      // Dịch vụ chăm sóc & Tập PHCN
  | 'other_expense'     // Chi phí khác
  // Danh mục Khoản Thu ('in')
  | 'family_contrib'    // Gia đình chuyển vào quỹ
  | 'insurance_support' // BHYT / Bảo hiểm thanh toán
  | 'visitation_gift'   // Tiền thăm hỏi hỗ trợ
  | 'other_income';     // Khoản thu khác

export type PaymentSource = 'fund_or_advance' | 'direct_member' | 'advance_reimbursed';

export interface ExpenseEntry {
  id: string;
  date: string;                 // YYYY-MM-DD (hỗ trợ nhập lùi ngày về đợt cấp cứu đầu tiên)
  type: ExpenseType;            // 'out' = Chi điều trị, 'in' = Thu vào quỹ
  amount: number;               // Số tiền (VNĐ)
  stage: ExpenseStage;          // Giai đoạn điều trị
  category: ExpenseCategory;    // Nhóm danh mục
  title: string;                // Nội dung khoản thu/chi
  personName?: string;          // Người gửi vào quỹ (khi 'in') hoặc Người thanh toán/ứng (khi 'out')
  paymentSource?: PaymentSource;// 'fund_or_advance' (Chi thẳng từ quỹ) | 'direct_member' (Ứng trước - Chưa hoàn) | 'advance_reimbursed' (Ứng trước - Đã hoàn từ quỹ)
  note?: string;                // Ghi chú chi tiết (nơi mua, số biên lai, chi tiết thuốc...)
  receiptImage?: string;        // Ảnh chụp biên lai / hóa đơn (Base64 nén nhẹ)
  createdAt: string;
  updatedAt?: string;
}

// ===== LAB RESULTS & BIOCHEMISTRY — Sổ Theo Dõi Xét Nghiệm & Hóa Sinh (Dùng chung Đa Hồ Sơ) =====
export type TshTargetLevel = 'high_risk' | 'moderate_risk' | 'normal';

export interface CustomLabItem {
  id: string;
  name: string;
  value: string;
  unit?: string;
  refRange?: string;
}

export interface LabResultEntry {
  id: string;                   // Gắn tiền tố hồ sơ p_<profileId>__lab-... (hoặc lab-... cho hồ sơ mặc định)
  date: string;                 // YYYY-MM-DD (Ngày xét nghiệm)
  facility?: string;            // Cơ sở xét nghiệm / Bệnh viện (VD: BV Nội Tiết, BV Bạch Mai, Medlatec...)
  doctorAdvice?: string;        // Kết luận / Lời dặn của Bác sĩ
  recordedBy?: string;          // Người nhập

  // Nhóm 1: Chỉ số Tuyến giáp & Liều thuốc Hormone
  levothyroxineDose?: string;   // Liều thuốc Levothyroxine đang uống (VD: "100mcg", "100x6 125x1")
  tsh?: number;                 // TSH (µIU/mL hoặc mIU/L)
  tshTargetLevel?: TshTargetLevel; // Mục tiêu ức chế TSH: 'high_risk' (<0.1), 'moderate_risk' (0.1-0.5), 'normal' (0.4-4.0)
  ft4?: number;                 // Free T4
  ft4Unit?: 'ng/dL' | 'pmol/L'; // Đơn vị FT4 (1 ng/dL ≈ 12.87 pmol/L)
  ft3?: number;                 // Free T3
  ft3Unit?: 'pg/mL' | 'pmol/L'; // Đơn vị FT3 (1 pg/mL ≈ 1.536 pmol/L)
  t4?: number;                  // T4 toàn phần (µg/dL hoặc nmol/L)
  t4Unit?: 'µg/dL' | 'nmol/L';
  t3?: number;                  // T3 toàn phần (ng/dL hoặc nmol/L)
  t3Unit?: 'nmol/L' | 'ng/dL';
  symptoms?: string;            // Triệu chứng ghi nhận lúc xét nghiệm (cột TrieuChung từ Sheet cũ)
  legacyTimestamp?: string;     // Timestamp gốc từ cột A của Sheet cũ (để nối chính xác Data & BiochemistryData)

  // Nhóm 2: Dấu ấn Ung thư Tuyến giáp & Kháng thể (Markers)
  tg?: number;                  // Thyroglobulin - TG (ng/mL)
  antiTg?: number;              // Anti-TG (IU/mL)
  antiTpo?: number;             // Anti-TPO (IU/mL)

  // Nhóm 3: Bộ Mỡ máu — Tim mạch (Lipid Panel)
  lipidUnit?: 'mmol/L' | 'mg/dL';
  cholesterol?: number;         // Cholesterol toàn phần
  triglyceride?: number;        // Triglyceride
  hdlC?: number;                // HDL-C (Mỡ tốt)
  ldlC?: number;                // LDL-C (Mỡ xấu)

  // Nhóm 4: Đường huyết, Khoáng chất & Vitamin (Canxi & Vitamin D hậu phẫu tuyến giáp)
  glucoseUnit?: 'mmol/L' | 'mg/dL';
  glucose?: number;             // Đường huyết lúc đói
  hba1c?: number;               // HbA1c (%)
  calciumUnit?: 'mmol/L' | 'mg/dL';
  calcium?: number;             // Canxi máu toàn phần
  ionizedCalcium?: number;      // Canxi ion hóa Ca++ (mmol/L)
  vitaminD?: number;            // 25-OH Vitamin D (ng/mL)

  // Nhóm 5: Chức năng Gan, Thận & Huyết học
  ast?: number;                 // AST / GOT (U/L)
  alt?: number;                 // ALT / GPT (U/L)
  creatinine?: number;          // Creatinine máu (µmol/L)
  urea?: number;                // Ure máu (mmol/L)
  uricAcid?: number;            // Acid Uric (µmol/L)
  hemoglobin?: number;          // Hemoglobin - Huyết sắc tố (g/dL hoặc g/L)

  // Chỉ số mở rộng tự định nghĩa (CRUD linh hoạt)
  customLabs?: CustomLabItem[];

  createdAt: string;
  updatedAt?: string;
}

// ===== EXTENDED AllAppData cho v2.0 =====
export interface AllAppDataV2 extends AllAppData {
  vitalsLog: VitalsLogEntry[];
  careRoutines: CareRoutine[];
  dailyLogs: DailyLog[];
  stages: RehabStage[];
  appointment: AppointmentInfo;
  bpThresholds: BpThresholds;
  appMode: AppMode;
  expenses: ExpenseEntry[];
  labResults: LabResultEntry[];
}
