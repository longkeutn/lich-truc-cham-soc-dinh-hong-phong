import type {
  LabResultEntry,
  HealthProfileType,
  VitalsLogEntry,
  FamilyMember,
  AppointmentInfo,
  PatientInfo,
  CareRoutine,
  RehabStage,
} from '@/lib/types';
import { normalizeDateStr } from '@/lib/config';
import {
  PHOSPHORUS_MG_PER_MMOL,
  PTH_PG_PER_PMOL,
  resolveAlbuminUnit,
  resolvePhosphorusUnit,
  resolvePthUnit,
  toAlbuminGL,
  toPhosphorusMmol,
  toPthPgMl,
} from '@/lib/parathyroidEval';

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
  routines?: CareRoutine[];
  stages?: RehabStage[];
  activeStageId?: string;
  onSaveRoutine?: (routine: CareRoutine) => Promise<void>;
  autoOpenAddVisit?: boolean;
  onConsumeAutoOpenAddVisit?: () => void;
}

export type ChartCategory = 'thyroid' | 'lipid' | 'metabolic' | 'liver_kidney';
export type LabSubView =
  | 'all'
  | 'visits'
  | 'thyroid'
  | 'biochem'
  | 'history'
  | 'growth'
  | 'vaccine';

export interface LabChartPoint {
  date: string;
  fullDate: string;
  dose: string;
  tsh?: number;
  ft4?: number;
  ft4Pmol?: number;
  ft4NgDl?: number;
  ft4Raw?: number;
  ft4Unit?: 'pmol/L' | 'ng/dL';
  t3?: number;
  t3Raw?: number;
  t3Unit?: 'nmol/L' | 'ng/dL';
  ft3?: number;
  ft3Raw?: number;
  ft3Unit?: 'pg/mL' | 'pmol/L';
  tg?: number;
  cholesterol?: number;
  cholesterolRaw?: number;
  ldlC?: number;
  ldlCRaw?: number;
  hdlC?: number;
  hdlCRaw?: number;
  triglyceride?: number;
  triglycerideRaw?: number;
  lipidUnit?: 'mmol/L' | 'mg/dL';
  glucose?: number;
  glucoseRaw?: number;
  glucoseUnit?: 'mmol/L' | 'mg/dL';
  hba1c?: number;
  calcium?: number;
  calciumRaw?: number;
  calciumUnit?: 'mmol/L' | 'mg/dL';
  phosphorus?: number;
  phosphorusRaw?: number;
  phosphorusUnit?: 'mmol/L' | 'mg/dL';
  pth?: number;
  pthRaw?: number;
  pthUnit?: 'pg/mL' | 'pmol/L';
  albumin?: number;
  albuminRaw?: number;
  albuminUnit?: 'g/L' | 'g/dL';
  vitaminD?: number;
  ast?: number;
  alt?: number;
  ggt?: number;
  creatinine?: number;
  egfr?: number;
  uricAcid?: number;
  hemoglobin?: number;
  gallbladderPolypMm?: number;
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

export { BACH_YEN_LEGACY_DATA_PRESETS } from './bachYenPresets';

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

export function parseOptionalNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'number') return isNaN(raw) ? undefined : raw;
  const str = String(raw).trim();
  if (!str) return undefined;
  const normalized = str.replace(',', '.').replace(/^[<>≤≥]+/, '');
  const num = parseFloat(normalized);
  return isNaN(num) ? undefined : num;
}

export function getLabDeltaText(
  previousLab: LabResultEntry | null,
  key: string,
  currentVal: number,
  currentUnit?: string
): string | null {
  if (!previousLab) return null;
  const prevVal = (previousLab as unknown as Record<string, unknown>)[key];
  if (typeof prevVal !== 'number' || isNaN(prevVal)) return null;

  // 1. FT4: Tự quy đổi nếu lệch đơn vị (1 ng/dL = 12.87 pmol/L)
  if (key === 'ft4') {
    const curUnit = currentUnit || (currentVal > 5 ? 'pmol/L' : 'ng/dL');
    const prevUnit = previousLab.ft4Unit || (prevVal > 5 ? 'pmol/L' : 'ng/dL');

    if (curUnit !== prevUnit) {
      const prevValConverted =
        curUnit === 'ng/dL'
          ? Number((prevVal / 12.87).toFixed(2))
          : Number((prevVal * 12.87).toFixed(2));
      const diff = Number((currentVal - prevValConverted).toFixed(2));
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      if (diff === 0) {
        return `Không đổi so với lần trước (quy đổi từ ${prevVal} ${prevUnit})`;
      }
      return `${diff > 0 ? '↑' : '↓'} ${sign} ${curUnit} (quy đổi từ ${prevVal} ${prevUnit} kỳ trước)`;
    }
  }

  // 2. FT3: 1 pg/mL = 1.536 pmol/L
  if (key === 'ft3') {
    const curUnit = currentUnit || (currentVal > 4.8 ? 'pmol/L' : 'pg/mL');
    const prevUnit = previousLab.ft3Unit || (prevVal > 4.8 ? 'pmol/L' : 'pg/mL');
    if (curUnit !== prevUnit) {
      const prevValConverted =
        curUnit === 'pg/mL'
          ? Number((prevVal / 1.536).toFixed(2))
          : Number((prevVal * 1.536).toFixed(2));
      const diff = Number((currentVal - prevValConverted).toFixed(2));
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      return `${diff > 0 ? '↑' : '↓'} ${sign} ${curUnit} (quy đổi từ ${prevVal} ${prevUnit})`;
    }
  }

  // 3. Glucose: 1 mmol/L = 18.018 mg/dL
  if (key === 'glucose') {
    const curUnit = currentUnit || (currentVal > 25 ? 'mg/dL' : 'mmol/L');
    const prevUnit = previousLab.glucoseUnit || (prevVal > 25 ? 'mg/dL' : 'mmol/L');
    if (curUnit !== prevUnit) {
      const prevValConverted =
        curUnit === 'mg/dL'
          ? Number((prevVal * 18.018).toFixed(1))
          : Number((prevVal / 18.018).toFixed(2));
      const diff = Number((currentVal - prevValConverted).toFixed(2));
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      return `${diff > 0 ? '↑' : '↓'} ${sign} ${curUnit} (quy đổi từ ${prevVal} ${prevUnit})`;
    }
  }

  // 4. Mỡ máu (Cholesterol, LDL-C, HDL-C, Triglyceride)
  if (['cholesterol', 'ldlC', 'hdlC', 'triglyceride'].includes(key)) {
    const factor = key === 'triglyceride' ? 88.57 : 38.67;
    const curUnit =
      currentUnit || (currentVal > (key === 'triglyceride' ? 15 : 25) ? 'mg/dL' : 'mmol/L');
    const prevUnit =
      previousLab.lipidUnit || (prevVal > (key === 'triglyceride' ? 15 : 25) ? 'mg/dL' : 'mmol/L');
    if (curUnit !== prevUnit) {
      const prevValConverted =
        curUnit === 'mg/dL'
          ? Number((prevVal * factor).toFixed(1))
          : Number((prevVal / factor).toFixed(2));
      const diff = Number((currentVal - prevValConverted).toFixed(2));
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      return `${diff > 0 ? '↑' : '↓'} ${sign} ${curUnit} (quy đổi từ ${prevVal} ${prevUnit})`;
    }
  }

  // 5. Canxi: 1 mmol/L = 4.008 mg/dL
  if (key === 'calcium') {
    const curUnit = currentUnit || (currentVal > 5 ? 'mg/dL' : 'mmol/L');
    const prevUnit = previousLab.calciumUnit || (prevVal > 5 ? 'mg/dL' : 'mmol/L');
    if (curUnit !== prevUnit) {
      const prevValConverted =
        curUnit === 'mg/dL'
          ? Number((prevVal * 4.008).toFixed(2))
          : Number((prevVal / 4.008).toFixed(2));
      const diff = Number((currentVal - prevValConverted).toFixed(2));
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      return `${diff > 0 ? '↑' : '↓'} ${sign} ${curUnit} (quy đổi từ ${prevVal} ${prevUnit})`;
    }
  }

  // 6. Phospho: 1 mmol/L = 3.097 mg/dL
  if (key === 'phosphorus') {
    const curUnit = resolvePhosphorusUnit(
      currentVal,
      currentUnit as 'mmol/L' | 'mg/dL' | undefined
    );
    const prevUnit = resolvePhosphorusUnit(prevVal, previousLab.phosphorusUnit);
    if (curUnit !== prevUnit) {
      const prevValConverted =
        curUnit === 'mg/dL'
          ? Number((prevVal * PHOSPHORUS_MG_PER_MMOL).toFixed(2))
          : Number((prevVal / PHOSPHORUS_MG_PER_MMOL).toFixed(2));
      const diff = Number((currentVal - prevValConverted).toFixed(2));
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      return `${diff > 0 ? '↑' : '↓'} ${sign} ${curUnit} (quy đổi từ ${prevVal} ${prevUnit})`;
    }
  }

  // 7. PTH: 1 pmol/L = 9.43 pg/mL
  if (key === 'pth') {
    const curUnit = resolvePthUnit(
      currentVal,
      currentUnit as 'pg/mL' | 'pmol/L' | undefined
    );
    const prevUnit = resolvePthUnit(prevVal, previousLab.pthUnit);
    if (curUnit !== prevUnit) {
      const prevValConverted =
        curUnit === 'pg/mL'
          ? Number((prevVal * PTH_PG_PER_PMOL).toFixed(1))
          : Number((prevVal / PTH_PG_PER_PMOL).toFixed(2));
      const diff = Number((currentVal - prevValConverted).toFixed(2));
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      return `${diff > 0 ? '↑' : '↓'} ${sign} ${curUnit} (quy đổi từ ${prevVal} ${prevUnit})`;
    }
  }

  // 8. Albumin: 1 g/dL = 10 g/L
  if (key === 'albumin') {
    const curUnit = resolveAlbuminUnit(
      currentVal,
      currentUnit as 'g/L' | 'g/dL' | undefined
    );
    const prevUnit = resolveAlbuminUnit(prevVal, previousLab.albuminUnit);
    if (curUnit !== prevUnit) {
      const prevValConverted =
        curUnit === 'g/L'
          ? Number((prevVal * 10).toFixed(1))
          : Number((prevVal / 10).toFixed(2));
      const diff = Number((currentVal - prevValConverted).toFixed(2));
      const sign = diff > 0 ? `+${diff}` : `${diff}`;
      return `${diff > 0 ? '↑' : '↓'} ${sign} ${curUnit} (quy đổi từ ${prevVal} ${prevUnit})`;
    }
  }

  const diff = Number((currentVal - prevVal).toFixed(2));
  if (diff === 0) return 'Không đổi so với lần trước';
  return diff > 0 ? `↑ +${diff} so với lần trước` : `↓ ${diff} so với lần trước`;
}

export function buildLabChartData(sortedLabsAsc: LabResultEntry[]): LabChartPoint[] {
  return sortedLabsAsc.map((item) => {
    // 1. FT4 normalization (quy chuẩn song song pmol/L và ng/dL)
    const rawFt4 = parseOptionalNumber(item.ft4);
    let normFt4: number | undefined = undefined;
    let ft4Pmol: number | undefined = undefined;
    let ft4NgDl: number | undefined = undefined;
    let effectiveFt4Unit: 'pmol/L' | 'ng/dL' | undefined = undefined;

    if (rawFt4 !== undefined) {
      effectiveFt4Unit = item.ft4Unit || (rawFt4 > 5 ? 'pmol/L' : 'ng/dL');
      if (effectiveFt4Unit === 'ng/dL') {
        ft4NgDl = rawFt4;
        ft4Pmol = Number((rawFt4 * 12.87).toFixed(2));
      } else {
        ft4Pmol = rawFt4;
        ft4NgDl = Number((rawFt4 / 12.87).toFixed(2));
      }
      normFt4 = ft4Pmol;
    }

    // 2. Lipid normalization (quy chuẩn sang mmol/L)
    const rawChol = parseOptionalNumber(item.cholesterol);
    const rawLdl = parseOptionalNumber(item.ldlC);
    const rawHdl = parseOptionalNumber(item.hdlC);
    const rawTrig = parseOptionalNumber(item.triglyceride);
    const hasLipid =
      rawChol !== undefined || rawLdl !== undefined || rawHdl !== undefined || rawTrig !== undefined;
    const effectiveLipidUnit =
      item.lipidUnit ||
      ((rawChol && rawChol > 25) || (rawLdl && rawLdl > 15) ? 'mg/dL' : 'mmol/L');
    const normChol =
      rawChol !== undefined
        ? effectiveLipidUnit === 'mg/dL'
          ? Number((rawChol / 38.67).toFixed(2))
          : rawChol
        : undefined;
    const normLdl =
      rawLdl !== undefined
        ? effectiveLipidUnit === 'mg/dL'
          ? Number((rawLdl / 38.67).toFixed(2))
          : rawLdl
        : undefined;
    const normHdl =
      rawHdl !== undefined
        ? effectiveLipidUnit === 'mg/dL'
          ? Number((rawHdl / 38.67).toFixed(2))
          : rawHdl
        : undefined;
    const normTrig =
      rawTrig !== undefined
        ? effectiveLipidUnit === 'mg/dL'
          ? Number((rawTrig / 88.57).toFixed(2))
          : rawTrig
        : undefined;

    // 3. Glucose normalization (quy chuẩn sang mmol/L)
    const rawGlu = parseOptionalNumber(item.glucose);
    const effectiveGluUnit = item.glucoseUnit || (rawGlu && rawGlu > 25 ? 'mg/dL' : 'mmol/L');
    const normGlu =
      rawGlu !== undefined
        ? effectiveGluUnit === 'mg/dL'
          ? Number((rawGlu / 18.018).toFixed(2))
          : rawGlu
        : undefined;

    // 4. Calcium normalization (quy chuẩn sang mmol/L)
    const rawCa = parseOptionalNumber(item.calcium);
    const effectiveCaUnit = item.calciumUnit || (rawCa && rawCa > 5 ? 'mg/dL' : 'mmol/L');
    const normCa =
      rawCa !== undefined
        ? effectiveCaUnit === 'mg/dL'
          ? Number((rawCa / 4.008).toFixed(2))
          : rawCa
        : undefined;

    // 5. Phosphorus (mmol/L), PTH (pg/mL), Albumin (g/L)
    const rawP = parseOptionalNumber(item.phosphorus);
    const effectivePUnit = rawP !== undefined ? resolvePhosphorusUnit(rawP, item.phosphorusUnit) : undefined;
    const normP = rawP !== undefined ? Number(toPhosphorusMmol(rawP, effectivePUnit).toFixed(2)) : undefined;

    const rawPth = parseOptionalNumber(item.pth);
    const effectivePthUnit = rawPth !== undefined ? resolvePthUnit(rawPth, item.pthUnit) : undefined;
    const normPth = rawPth !== undefined ? Number(toPthPgMl(rawPth, effectivePthUnit).toFixed(1)) : undefined;

    const rawAlb = parseOptionalNumber(item.albumin);
    const effectiveAlbUnit = rawAlb !== undefined ? resolveAlbuminUnit(rawAlb, item.albuminUnit) : undefined;
    const normAlb = rawAlb !== undefined ? Number(toAlbuminGL(rawAlb, effectiveAlbUnit).toFixed(1)) : undefined;

    return {
      date: fmtDateAxis(item.date),
      fullDate: fmtDateShort(item.date),
      dose: item.levothyroxineDose || '',
      tsh: parseOptionalNumber(item.tsh),
      ft4: normFt4,
      ft4Pmol,
      ft4NgDl,
      ft4Raw: rawFt4,
      ft4Unit: effectiveFt4Unit,
      t3: parseOptionalNumber(item.t3),
      ft3: parseOptionalNumber(item.ft3),
      tg: parseOptionalNumber(item.tg),
      cholesterol: normChol,
      cholesterolRaw: rawChol,
      ldlC: normLdl,
      ldlCRaw: rawLdl,
      hdlC: normHdl,
      hdlCRaw: rawHdl,
      triglyceride: normTrig,
      triglycerideRaw: rawTrig,
      lipidUnit: hasLipid ? effectiveLipidUnit : undefined,
      glucose: normGlu,
      glucoseRaw: rawGlu,
      glucoseUnit: rawGlu !== undefined ? effectiveGluUnit : undefined,
      hba1c: parseOptionalNumber(item.hba1c),
      calcium: normCa,
      calciumRaw: rawCa,
      calciumUnit: rawCa !== undefined ? effectiveCaUnit : undefined,
      phosphorus: normP,
      phosphorusRaw: rawP,
      phosphorusUnit: effectivePUnit,
      pth: normPth,
      pthRaw: rawPth,
      pthUnit: effectivePthUnit,
      albumin: normAlb,
      albuminRaw: rawAlb,
      albuminUnit: effectiveAlbUnit,
      vitaminD: parseOptionalNumber(item.vitaminD),
      ast: parseOptionalNumber(item.ast),
      alt: parseOptionalNumber(item.alt),
      ggt: parseOptionalNumber(item.ggt),
      creatinine: parseOptionalNumber(item.creatinine),
      egfr: parseOptionalNumber(item.egfr),
      uricAcid: parseOptionalNumber(item.uricAcid),
      hemoglobin: parseOptionalNumber(item.hemoglobin),
      gallbladderPolypMm: parseOptionalNumber(item.gallbladderPolypMm),
    };
  });
}

export { mergeBachYenPresets, parseLegacySheetsToEntries } from './legacySheetParser';
