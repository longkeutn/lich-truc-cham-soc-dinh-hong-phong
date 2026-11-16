import type {
  LabResultEntry,
  HealthProfileType,
  TshTargetLevel,
} from '@/lib/types';
import {
  getVietnamDateStr,
  normalizeDateStr,
  ensureRecordProfilePrefix,
} from '@/lib/config';
import { parseOptionalNumber } from './labRecordsUtils';
import type { LabBiochemFormValues } from './LabFormPanels';

export type LabExamPackage = 'thyroid' | 'general' | 'advice_only';

export interface LabUnitLocks {
  ft4?: boolean;
  lipid?: boolean;
  glucose?: boolean;
  calcium?: boolean;
}

export interface LabFullFormState {
  date: string;
  facility: string;
  recordedBy: string;
  symptoms: string;
  doctorAdvice: string;
  levothyroxineDose: string;
  tshTargetLevel: TshTargetLevel;
  tsh: string;
  ft4: string;
  ft4Unit: 'ng/dL' | 'pmol/L';
  ft3: string;
  ft3Unit: 'pg/mL' | 'pmol/L';
  t4: string;
  t4Unit: 'µg/dL' | 'nmol/L';
  t3: string;
  t3Unit: 'nmol/L' | 'ng/dL';
  tg: string;
  antiTg: string;
  antiTpo: string;
  bio: LabBiochemFormValues;
  unitLocks?: LabUnitLocks;
}

const numStr = (val?: number): string => (val !== undefined ? String(val) : '');
const hasNum = (val?: number): boolean => typeof val === 'number' && !isNaN(val);

export function detectDefaultExamPackage(params: {
  editingEntry: LabResultEntry | null;
  profileType: HealthProfileType;
}): LabExamPackage {
  const { editingEntry, profileType } = params;
  if (!editingEntry) {
    return profileType === 'thyroid_post_op' ? 'thyroid' : 'general';
  }

  const hasThyroid =
    hasNum(editingEntry.tsh) ||
    hasNum(editingEntry.ft4) ||
    hasNum(editingEntry.ft3) ||
    hasNum(editingEntry.t4) ||
    hasNum(editingEntry.t3) ||
    hasNum(editingEntry.tg) ||
    hasNum(editingEntry.antiTg) ||
    hasNum(editingEntry.antiTpo) ||
    Boolean(editingEntry.levothyroxineDose);

  if (hasThyroid) return 'thyroid';

  const hasGeneral =
    hasNum(editingEntry.glucose) ||
    hasNum(editingEntry.hba1c) ||
    hasNum(editingEntry.cholesterol) ||
    hasNum(editingEntry.ldlC) ||
    hasNum(editingEntry.hdlC) ||
    hasNum(editingEntry.triglyceride) ||
    hasNum(editingEntry.ast) ||
    hasNum(editingEntry.alt) ||
    hasNum(editingEntry.creatinine) ||
    hasNum(editingEntry.urea) ||
    hasNum(editingEntry.uricAcid) ||
    hasNum(editingEntry.hemoglobin) ||
    hasNum(editingEntry.calcium) ||
    hasNum(editingEntry.ionizedCalcium) ||
    hasNum(editingEntry.vitaminD) ||
    Boolean(editingEntry.customLabs?.length);

  if (hasGeneral) return 'general';
  return 'advice_only';
}

export function hasAdvancedFieldsForPackage(
  entry: LabResultEntry | null,
  pkg: LabExamPackage
): boolean {
  if (!entry) return false;

  const hasCommonAdvanced =
    hasNum(entry.ft3) ||
    hasNum(entry.t3) ||
    hasNum(entry.t4) ||
    hasNum(entry.antiTg) ||
    hasNum(entry.antiTpo) ||
    hasNum(entry.hdlC) ||
    hasNum(entry.ionizedCalcium) ||
    hasNum(entry.vitaminD) ||
    hasNum(entry.urea) ||
    hasNum(entry.uricAcid) ||
    hasNum(entry.hemoglobin) ||
    Boolean(entry.customLabs?.length);

  if (hasCommonAdvanced) return true;

  const hasGeneralQuick =
    hasNum(entry.glucose) ||
    hasNum(entry.hba1c) ||
    hasNum(entry.cholesterol) ||
    hasNum(entry.ldlC) ||
    hasNum(entry.triglyceride) ||
    hasNum(entry.ast) ||
    hasNum(entry.alt) ||
    hasNum(entry.creatinine);

  const hasThyroidQuick =
    hasNum(entry.tsh) ||
    hasNum(entry.ft4) ||
    hasNum(entry.tg) ||
    Boolean(entry.levothyroxineDose);

  if (pkg === 'thyroid') return hasGeneralQuick;
  if (pkg === 'general') return hasThyroidQuick || hasNum(entry.calcium);
  return hasGeneralQuick || hasThyroidQuick || hasNum(entry.calcium);
}

/**
 * Tự động suy luận đơn vị đo hợp lý theo ngưỡng số liệu thực tế tại Việt Nam
 * khi người dùng chưa bấm chọn đơn vị thủ công ở mục Nâng cao.
 */
export function resolveEffectiveLabUnits(state: LabFullFormState): {
  ft4Unit: 'ng/dL' | 'pmol/L';
  lipidUnit: 'mmol/L' | 'mg/dL';
  glucoseUnit: 'mmol/L' | 'mg/dL';
  calciumUnit: 'mmol/L' | 'mg/dL';
} {
  const locks = state.unitLocks || {};

  const ft4Num = parseOptionalNumber(state.ft4);
  const ft4Unit: 'ng/dL' | 'pmol/L' = locks.ft4
    ? state.ft4Unit
    : ft4Num !== undefined
      ? ft4Num > 4.5
        ? 'pmol/L'
        : 'ng/dL'
      : state.ft4Unit;

  const glucoseNum = parseOptionalNumber(state.bio.glucose);
  const glucoseUnit: 'mmol/L' | 'mg/dL' = locks.glucose
    ? state.bio.glucoseUnit
    : glucoseNum !== undefined
      ? glucoseNum > 25
        ? 'mg/dL'
        : 'mmol/L'
      : state.bio.glucoseUnit;

  const lipidNums = [
    parseOptionalNumber(state.bio.cholesterol),
    parseOptionalNumber(state.bio.ldlC),
    parseOptionalNumber(state.bio.hdlC),
    parseOptionalNumber(state.bio.triglyceride),
  ].filter((n): n is number => n !== undefined);

  const lipidUnit: 'mmol/L' | 'mg/dL' = locks.lipid
    ? state.bio.lipidUnit
    : lipidNums.length > 0
      ? lipidNums.some((n) => n > 25)
        ? 'mg/dL'
        : 'mmol/L'
      : state.bio.lipidUnit;

  const calciumNum = parseOptionalNumber(state.bio.calcium);
  const calciumUnit: 'mmol/L' | 'mg/dL' = locks.calcium
    ? state.bio.calciumUnit
    : calciumNum !== undefined
      ? calciumNum > 5
        ? 'mg/dL'
        : 'mmol/L'
      : state.bio.calciumUnit;

  return { ft4Unit, lipidUnit, glucoseUnit, calciumUnit };
}

export function createInitialLabFormState(params: {
  editingEntry: LabResultEntry | null;
  latestLab: LabResultEntry | null;
  defaultRecorder: string;
  profileType: HealthProfileType;
}): LabFullFormState {
  const { editingEntry, latestLab, defaultRecorder, profileType } = params;
  const defaultTarget: TshTargetLevel =
    profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal';

  if (editingEntry) {
    return {
      date: normalizeDateStr(editingEntry.date) || getVietnamDateStr(),
      facility: editingEntry.facility || '',
      recordedBy: editingEntry.recordedBy || defaultRecorder,
      symptoms: editingEntry.symptoms || '',
      doctorAdvice: editingEntry.doctorAdvice || '',
      levothyroxineDose: editingEntry.levothyroxineDose || '',
      tshTargetLevel: editingEntry.tshTargetLevel || defaultTarget,
      tsh: numStr(editingEntry.tsh),
      ft4: numStr(editingEntry.ft4),
      ft4Unit:
        editingEntry.ft4Unit ||
        (editingEntry.ft4 && editingEntry.ft4 > 5 ? 'pmol/L' : 'ng/dL'),
      ft3: numStr(editingEntry.ft3),
      ft3Unit: editingEntry.ft3Unit || 'pg/mL',
      t4: numStr(editingEntry.t4),
      t4Unit: editingEntry.t4Unit || 'µg/dL',
      t3: numStr(editingEntry.t3),
      t3Unit: editingEntry.t3Unit || 'nmol/L',
      tg: numStr(editingEntry.tg),
      antiTg: numStr(editingEntry.antiTg),
      antiTpo: numStr(editingEntry.antiTpo),
      bio: {
        lipidUnit: editingEntry.lipidUnit || 'mmol/L',
        cholesterol: numStr(editingEntry.cholesterol),
        triglyceride: numStr(editingEntry.triglyceride),
        hdlC: numStr(editingEntry.hdlC),
        ldlC: numStr(editingEntry.ldlC),
        glucoseUnit: editingEntry.glucoseUnit || 'mmol/L',
        glucose: numStr(editingEntry.glucose),
        hba1c: numStr(editingEntry.hba1c),
        calciumUnit: editingEntry.calciumUnit || 'mmol/L',
        calcium: numStr(editingEntry.calcium),
        ionizedCalcium: numStr(editingEntry.ionizedCalcium),
        vitaminD: numStr(editingEntry.vitaminD),
        ast: numStr(editingEntry.ast),
        alt: numStr(editingEntry.alt),
        creatinine: numStr(editingEntry.creatinine),
        urea: numStr(editingEntry.urea),
        uricAcid: numStr(editingEntry.uricAcid),
        hemoglobin: numStr(editingEntry.hemoglobin),
        customLabs: Array.isArray(editingEntry.customLabs)
          ? [...editingEntry.customLabs]
          : [],
      },
      unitLocks: {
        ft4: Boolean(editingEntry.ft4Unit),
        lipid: Boolean(editingEntry.lipidUnit),
        glucose: Boolean(editingEntry.glucoseUnit),
        calcium: Boolean(editingEntry.calciumUnit),
      },
    };
  }

  return {
    date: getVietnamDateStr(),
    facility: latestLab?.facility || '',
    recordedBy: defaultRecorder,
    symptoms: '',
    doctorAdvice: '',
    levothyroxineDose: latestLab?.levothyroxineDose || '',
    tshTargetLevel: latestLab?.tshTargetLevel || defaultTarget,
    tsh: '',
    ft4: '',
    ft4Unit:
      latestLab?.ft4Unit || (profileType === 'thyroid_post_op' ? 'pmol/L' : 'ng/dL'),
    ft3: '',
    ft3Unit: latestLab?.ft3Unit || 'pg/mL',
    t4: '',
    t4Unit: latestLab?.t4Unit || 'µg/dL',
    t3: '',
    t3Unit: latestLab?.t3Unit || 'nmol/L',
    tg: '',
    antiTg: '',
    antiTpo: '',
    bio: {
      lipidUnit: latestLab?.lipidUnit || 'mmol/L',
      cholesterol: '',
      triglyceride: '',
      hdlC: '',
      ldlC: '',
      glucoseUnit: latestLab?.glucoseUnit || 'mmol/L',
      glucose: '',
      hba1c: '',
      calciumUnit: latestLab?.calciumUnit || 'mmol/L',
      calcium: '',
      ionizedCalcium: '',
      vitaminD: '',
      ast: '',
      alt: '',
      creatinine: '',
      urea: '',
      uricAcid: '',
      hemoglobin: '',
      customLabs: [],
    },
    unitLocks: {},
  };
}

export function buildLabEntryFromFormState(params: {
  state: LabFullFormState;
  editingEntry: LabResultEntry | null;
  profileId?: string;
  defaultRecorder: string;
}): LabResultEntry {
  const { state, editingEntry, profileId, defaultRecorder } = params;
  const cleanCustomLabs = state.bio.customLabs.filter(
    (c) => c.name.trim() !== '' && c.value.trim() !== ''
  );
  const rawId = editingEntry?.id || `lab-${Date.now()}`;
  const effectiveUnits = resolveEffectiveLabUnits(state);

  return {
    id: ensureRecordProfilePrefix(rawId, profileId),
    date: normalizeDateStr(state.date),
    facility: state.facility.trim() || undefined,
    recordedBy: state.recordedBy.trim() || defaultRecorder,
    symptoms: state.symptoms.trim() || undefined,
    doctorAdvice: state.doctorAdvice.trim() || undefined,
    legacyTimestamp: editingEntry?.legacyTimestamp,
    levothyroxineDose: state.levothyroxineDose.trim() || undefined,
    tshTargetLevel: state.tshTargetLevel,
    tsh: parseOptionalNumber(state.tsh),
    ft4: parseOptionalNumber(state.ft4),
    ft4Unit: effectiveUnits.ft4Unit,
    ft3: parseOptionalNumber(state.ft3),
    ft3Unit: state.ft3Unit,
    t4: parseOptionalNumber(state.t4),
    t4Unit: state.t4Unit,
    t3: parseOptionalNumber(state.t3),
    t3Unit: state.t3Unit,
    tg: parseOptionalNumber(state.tg),
    antiTg: parseOptionalNumber(state.antiTg),
    antiTpo: parseOptionalNumber(state.antiTpo),
    lipidUnit: effectiveUnits.lipidUnit,
    cholesterol: parseOptionalNumber(state.bio.cholesterol),
    triglyceride: parseOptionalNumber(state.bio.triglyceride),
    hdlC: parseOptionalNumber(state.bio.hdlC),
    ldlC: parseOptionalNumber(state.bio.ldlC),
    glucoseUnit: effectiveUnits.glucoseUnit,
    glucose: parseOptionalNumber(state.bio.glucose),
    hba1c: parseOptionalNumber(state.bio.hba1c),
    calciumUnit: effectiveUnits.calciumUnit,
    calcium: parseOptionalNumber(state.bio.calcium),
    ionizedCalcium: parseOptionalNumber(state.bio.ionizedCalcium),
    vitaminD: parseOptionalNumber(state.bio.vitaminD),
    ast: parseOptionalNumber(state.bio.ast),
    alt: parseOptionalNumber(state.bio.alt),
    creatinine: parseOptionalNumber(state.bio.creatinine),
    urea: parseOptionalNumber(state.bio.urea),
    uricAcid: parseOptionalNumber(state.bio.uricAcid),
    hemoglobin: parseOptionalNumber(state.bio.hemoglobin),
    customLabs: cleanCustomLabs.length > 0 ? cleanCustomLabs : undefined,
    createdAt: editingEntry?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
