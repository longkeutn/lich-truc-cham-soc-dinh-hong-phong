import type {
  LabResultEntry,
  HealthProfileType,
  VitalsLogEntry,
  FamilyMember,
  AppointmentInfo,
  PatientInfo,
} from '@/lib/types';
import { normalizeDateStr } from '@/lib/config';

export interface LabResultsViewProps {
  labResults: LabResultEntry[];
  vitalsLog: VitalsLogEntry[];
  profileId?: string;
  todayStr?: string;
  patientName: string;
  patientDisplayName: string;
  patientDiagnosis?: string;
  patientInfo?: PatientInfo;
  onUpdatePatientInfo?: (info: PatientInfo) => void;
  initialSubView?: LabSubView;
  profileType: HealthProfileType;
  members: FamilyMember[];
  defaultRecorder: string;
  onSaveLabResult: (entry: LabResultEntry) => Promise<void>;
  onDeleteLabResult: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
  appointment?: AppointmentInfo;
  onSaveAppointment?: (info: AppointmentInfo) => Promise<void>;
  isAdmin?: boolean;
}

export type ChartCategory = 'thyroid' | 'lipid' | 'metabolic' | 'liver_kidney';
export type LabSubView = 'all' | 'thyroid' | 'biochem' | 'history' | 'growth' | 'vaccine';

export interface LabChartPoint {
  date: string;
  fullDate: string;
  dose: string;
  tsh?: number;
  ft4?: number;
  t3?: number;
  ft3?: number;
  tg?: number;
  cholesterol?: number;
  ldlC?: number;
  hdlC?: number;
  triglyceride?: number;
  glucose?: number;
  hba1c?: number;
  calcium?: number;
  vitaminD?: number;
  ast?: number;
  alt?: number;
  creatinine?: number;
  hemoglobin?: number;
}

export const QUICK_DOSES = [
  '100mcg',
  '100mcgx6',
  '100mcgx6, 50mcgx1',
  '100x5, 50x2',
  '50mcg',
  '75mcg',
  '87.5mcg',
  '112.5mcg',
  '125mcg',
];

export const QUICK_FACILITIES = [
  'BV Nội Tiết Trung Ương',
  'BV Bạch Mai',
  'BV Đại học Y Hà Nội',
  'BV Ung Bướu',
  'Hệ thống Y tế Medlatec',
  'Phòng khám Đa khoa',
];

// 12 mốc lịch sử từ Sheet Data của Mẹ Bạch Yến (2022-2025) trích xuất nguyên bản từ Google Sheet cũ
export const BACH_YEN_LEGACY_DATA_PRESETS: Array<Omit<LabResultEntry, 'id' | 'createdAt'>> = [
  {
    date: '2022-09-01',
    legacyTimestamp: '01/09/2025 12:32:18',
    levothyroxineDose: '100mcg',
    symptoms: 'mệt mỏi, khám lần đầu sau mổ 3 tháng',
    doctorAdvice: 'Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2022-09-12',
    legacyTimestamp: '01/09/2025 12:30:55',
    levothyroxineDose: '100mcg',
    symptoms: 'mệt mỏi, khám lần đầu sau mổ 3 tháng',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2022-12-12',
    legacyTimestamp: '01/09/2025 12:34:45',
    levothyroxineDose: '100x5, 50x2',
    symptoms: 'Chuẩn đoán thiếu Calci do chế độ ăn. Suy giáp sau điều trị mổ',
    doctorAdvice: 'Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2023-09-18',
    legacyTimestamp: '01/09/2025 12:45:08',
    tsh: 3.3147,
    t3: 1.1,
    t3Unit: 'nmol/L',
    ft4: 10.6,
    ft4Unit: 'pmol/L',
    levothyroxineDose: '100x5, 50x2',
    doctorAdvice: 'Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2024-03-11',
    legacyTimestamp: '01/09/2025 12:51:58',
    tsh: 2.354,
    t3: 1.54,
    t3Unit: 'nmol/L',
    ft4: 14.1,
    ft4Unit: 'pmol/L',
    levothyroxineDose: '100mcg',
    doctorAdvice: 'K giáp thể nhú • Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2024-06-16',
    legacyTimestamp: '01/09/2025 13:25:23',
    tsh: 0.091,
    t3: 1.58,
    t3Unit: 'nmol/L',
    ft4: 22.6,
    ft4Unit: 'pmol/L',
    levothyroxineDose: '100mcgx6, 50mcgx1',
    symptoms: 'tim đập nhanh',
    doctorAdvice: 'K giáp thể nhú • Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2024-09-02',
    legacyTimestamp: '01/09/2025 12:58:08',
    tsh: 0.133,
    t3: 2.04,
    t3Unit: 'nmol/L',
    ft4: 26.27,
    ft4Unit: 'pmol/L',
    levothyroxineDose: '100x5, 50x2',
    doctorAdvice: 'K giáp thể nhú, đã phẫu thuật • Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2024-11-23',
    legacyTimestamp: '01/09/2025 13:04:06',
    tsh: 0.263,
    t3: 1.89,
    t3Unit: 'nmol/L',
    ft4: 23.29,
    ft4Unit: 'pmol/L',
    tg: 0.25,
    antiTg: 19.44,
    levothyroxineDose: '100mcg',
    symptoms: 'chuẩn đoán suy giáp',
    doctorAdvice: 'K giáp thể nhú • Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2025-05-28',
    legacyTimestamp: '01/09/2025 13:40:08',
    tsh: 0.193,
    t3: 1.83,
    t3Unit: 'nmol/L',
    ft4: 24.57,
    ft4Unit: 'pmol/L',
    levothyroxineDose: '100x5, 50x2',
    symptoms: 'mệt mỏi, tim đập nhanh',
    doctorAdvice: 'K giáp thể nhú • Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2025-08-30',
    legacyTimestamp: '01/09/2025 13:47:16',
    tsh: 0.335,
    t3: 1.5,
    t3Unit: 'nmol/L',
    ft4: 28.14,
    ft4Unit: 'pmol/L',
    tg: 0.04,
    levothyroxineDose: '100mcgx6',
    symptoms: 'mệt mỏi, tim đập nhanh. Chỉ số TG (Thyroglobulin) < 0.040 ng/mL',
    doctorAdvice: 'K giáp thể nhú • Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2025-09-01',
    legacyTimestamp: '01/09/2025 15:07:56',
    levothyroxineDose: '100mcgx6',
    symptoms: 'Mệt mỏi, tim đập nhanh',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2025-10-29',
    legacyTimestamp: '29/10/2025 19:56:01',
    levothyroxineDose: '100mcgx6',
    symptoms: 'Bị đau họng, hơi sốt • hơi mệt',
    tshTargetLevel: 'moderate_risk',
  },
];

export function fmtDateShort(dateStr: string): string {
  const norm = normalizeDateStr(dateStr);
  const parts = norm.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function fmtDateAxis(dateStr: string): string {
  const norm = normalizeDateStr(dateStr);
  const parts = norm.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}

export function parseOptionalNumber(raw: string): number | undefined {
  if (!raw || !raw.trim()) return undefined;
  const normalized = raw.trim().replace(',', '.').replace(/^[<>≤≥]+/, '');
  const num = parseFloat(normalized);
  return isNaN(num) ? undefined : num;
}

export function getLabDeltaText(
  previousLab: LabResultEntry | null,
  key: string,
  currentVal: number
): string | null {
  if (!previousLab) return null;
  const prevVal = (previousLab as unknown as Record<string, unknown>)[key];
  if (typeof prevVal !== 'number' || isNaN(prevVal)) return null;
  const diff = Number((currentVal - prevVal).toFixed(2));
  if (diff === 0) return 'Không đổi so với lần trước';
  return diff > 0 ? `↑ +${diff} so với lần trước` : `↓ ${diff} so với lần trước`;
}

export function buildLabChartData(sortedLabsAsc: LabResultEntry[]): LabChartPoint[] {
  return sortedLabsAsc.map((item) => ({
    date: fmtDateAxis(item.date),
    fullDate: fmtDateShort(item.date),
    dose: item.levothyroxineDose || '',
    tsh: item.tsh,
    ft4: item.ft4,
    t3: item.t3,
    ft3: item.ft3,
    tg: item.tg,
    cholesterol: item.cholesterol,
    ldlC: item.ldlC,
    hdlC: item.hdlC,
    triglyceride: item.triglyceride,
    glucose: item.glucose,
    hba1c: item.hba1c,
    calcium: item.calcium,
    vitaminD: item.vitaminD,
    ast: item.ast,
    alt: item.alt,
    creatinine: item.creatinine,
    hemoglobin: item.hemoglobin,
  }));
}

export { mergeBachYenPresets, parseLegacySheetsToEntries } from './legacySheetParser';
