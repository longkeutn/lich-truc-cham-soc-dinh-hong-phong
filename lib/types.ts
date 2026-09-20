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
  assignees: (string | null)[]; // Tên người trực
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
