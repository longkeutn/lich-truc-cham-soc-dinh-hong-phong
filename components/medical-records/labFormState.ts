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
}

const numStr = (val?: number): string => (val !== undefined ? String(val) : '');

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
    ft4Unit: state.ft4Unit,
    ft3: parseOptionalNumber(state.ft3),
    ft3Unit: state.ft3Unit,
    t4: parseOptionalNumber(state.t4),
    t4Unit: state.t4Unit,
    t3: parseOptionalNumber(state.t3),
    t3Unit: state.t3Unit,
    tg: parseOptionalNumber(state.tg),
    antiTg: parseOptionalNumber(state.antiTg),
    antiTpo: parseOptionalNumber(state.antiTpo),
    lipidUnit: state.bio.lipidUnit,
    cholesterol: parseOptionalNumber(state.bio.cholesterol),
    triglyceride: parseOptionalNumber(state.bio.triglyceride),
    hdlC: parseOptionalNumber(state.bio.hdlC),
    ldlC: parseOptionalNumber(state.bio.ldlC),
    glucoseUnit: state.bio.glucoseUnit,
    glucose: parseOptionalNumber(state.bio.glucose),
    hba1c: parseOptionalNumber(state.bio.hba1c),
    calciumUnit: state.bio.calciumUnit,
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
