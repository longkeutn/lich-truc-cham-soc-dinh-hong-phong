import type { LabResultEntry, HealthProfileType } from '@/lib/types';
import { normalizeDateStr, ensureRecordProfilePrefix } from '@/lib/config';
import { BACH_YEN_LEGACY_DATA_PRESETS, parseOptionalNumber } from './labRecordsUtils';

export function mergeBachYenPresets(
  existingLabs: LabResultEntry[],
  defaultRecorder: string,
  profileId?: string
): LabResultEntry[] {
  const existingByDate = new Map<string, LabResultEntry>();
  for (const item of existingLabs) {
    existingByDate.set(normalizeDateStr(item.date), { ...item });
  }

  const mergedList: LabResultEntry[] = [];
  for (const preset of BACH_YEN_LEGACY_DATA_PRESETS) {
    const prev = existingByDate.get(preset.date);
    const rawId = prev?.id || `lab-by-${preset.date}`;
    const merged: LabResultEntry = {
      ...(prev || {}),
      ...preset,
      id: ensureRecordProfilePrefix(rawId, profileId),
      recordedBy: prev?.recordedBy || defaultRecorder,
      createdAt: prev?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    existingByDate.set(preset.date, merged);
    mergedList.push(merged);
  }
  return mergedList;
}

export function parseLegacySheetsToEntries(params: {
  importRawText: string;
  importBiochemText: string;
  labResults: LabResultEntry[];
  defaultRecorder: string;
  profileType: HealthProfileType;
  profileId?: string;
}): LabResultEntry[] {
  const {
    importRawText,
    importBiochemText,
    labResults,
    defaultRecorder,
    profileType,
    profileId,
  } = params;

  const existingByDate = new Map<string, LabResultEntry>();
  const existingByTimestamp = new Map<string, LabResultEntry>();

  for (const item of labResults) {
    const normD = normalizeDateStr(item.date);
    existingByDate.set(normD, { ...item });
    if (item.legacyTimestamp) {
      existingByTimestamp.set(item.legacyTimestamp.trim(), { ...item });
    }
  }

  const touchedDates = new Set<string>();

  // BƯỚC 1: Sheet "Data" (24 cột A -> X)
  if (importRawText.trim()) {
    const dataLines = importRawText
      .split(/\r?\n/)
      .map((l) => l.replace(/\r$/, ''))
      .filter((l) => l.trim().length > 0);

    for (const line of dataLines) {
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      if (cols.length < 2) continue;

      const c0 = (cols[0] || '').trim();
      const c4 = (cols[4] || '').trim();
      if (
        c0.toLowerCase() === 'timestamp' ||
        c0.toLowerCase() === 'ngayxetnghiem' ||
        c4.toLowerCase() === 'ngayxetnghiem'
      ) {
        continue;
      }

      const normC4 = normalizeDateStr(c4);
      const normC0 = normalizeDateStr(c0);

      let shift = 0;
      let parsedDate = '';
      let rawTimestamp = '';

      if (/^\d{4}-\d{2}-\d{2}$/.test(normC4)) {
        shift = 0;
        parsedDate = normC4;
        rawTimestamp = c0;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(normC0)) {
        const c2 = (cols[2] || '').trim();
        if (c2.includes('IU') || c2.includes('mL') || c2.includes('L')) {
          shift = -4;
          parsedDate = normC0;
        } else {
          shift = 0;
          parsedDate = normC0;
          rawTimestamp = c0;
        }
      } else {
        continue;
      }

      const getCol = (idx: number): string => {
        const actualIdx = idx + shift;
        return actualIdx >= 0 && actualIdx < cols.length ? (cols[actualIdx] || '').trim() : '';
      };

      const prevEntry =
        (rawTimestamp && existingByTimestamp.get(rawTimestamp)) ||
        existingByDate.get(parsedDate);

      const entry: LabResultEntry = prevEntry
        ? { ...prevEntry }
        : {
            id: ensureRecordProfilePrefix(
              `lab-import-${parsedDate}-${Math.random().toString(36).slice(2, 6)}`,
              profileId
            ),
            date: parsedDate,
            recordedBy: defaultRecorder,
            tshTargetLevel: profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal',
            createdAt: new Date().toISOString(),
          };

      if (rawTimestamp) entry.legacyTimestamp = rawTimestamp;

      const tieuSu = getCol(1);
      const tinhTrang = getCol(2);
      const benhNen = getCol(3);
      const vTsh = parseOptionalNumber(getCol(5));
      const vT3 = parseOptionalNumber(getCol(7));
      const uT3 = getCol(8);
      const vT4 = parseOptionalNumber(getCol(9));
      const uT4 = getCol(10);
      const vFt3 = parseOptionalNumber(getCol(11));
      const uFt3 = getCol(12);
      const vFt4 = parseOptionalNumber(getCol(13));
      const uFt4 = getCol(14);
      const vTg = parseOptionalNumber(getCol(15));
      const vAntiTg = parseOptionalNumber(getCol(17));
      const vAntiTpo = parseOptionalNumber(getCol(19));
      const vDose = getCol(21);
      const vSymptoms = getCol(22);
      const vNote = getCol(23);

      if (vTsh !== undefined) entry.tsh = vTsh;
      if (vT3 !== undefined) {
        entry.t3 = vT3;
        entry.t3Unit = uT3 === 'ng/dL' ? 'ng/dL' : 'nmol/L';
      }
      if (vT4 !== undefined) {
        entry.t4 = vT4;
        entry.t4Unit = uT4 === 'nmol/L' ? 'nmol/L' : 'µg/dL';
      }
      if (vFt3 !== undefined) {
        entry.ft3 = vFt3;
        entry.ft3Unit = uFt3 === 'pmol/L' || vFt3 > 4.8 ? 'pmol/L' : 'pg/mL';
      }
      if (vFt4 !== undefined) {
        entry.ft4 = vFt4;
        entry.ft4Unit = uFt4 === 'pmol/L' || vFt4 > 5 ? 'pmol/L' : 'ng/dL';
      }
      if (vTg !== undefined) entry.tg = vTg;
      if (vAntiTg !== undefined) entry.antiTg = vAntiTg;
      if (vAntiTpo !== undefined) entry.antiTpo = vAntiTpo;
      if (vDose) entry.levothyroxineDose = vDose;

      if (vSymptoms) {
        entry.symptoms =
          entry.symptoms && !entry.symptoms.includes(vSymptoms)
            ? `${entry.symptoms} • ${vSymptoms}`
            : vSymptoms;
      }

      const noteParts = [tieuSu, tinhTrang, benhNen, vNote].filter(Boolean);
      if (noteParts.length > 0) {
        const combinedNote = noteParts.join(' • ');
        if (!entry.doctorAdvice) {
          entry.doctorAdvice = combinedNote;
        } else if (vNote && !entry.doctorAdvice.includes(vNote)) {
          entry.doctorAdvice = `${entry.doctorAdvice} • ${vNote}`;
        }
      }

      entry.updatedAt = new Date().toISOString();
      existingByDate.set(parsedDate, entry);
      if (rawTimestamp) existingByTimestamp.set(rawTimestamp, entry);
      touchedDates.add(parsedDate);
    }
  }

  // BƯỚC 2: Sheet "BiochemistryData" (23 cột A -> W)
  if (importBiochemText.trim()) {
    const bioLines = importBiochemText
      .split(/\r?\n/)
      .map((l) => l.replace(/\r$/, ''))
      .filter((l) => l.trim().length > 0);

    for (const line of bioLines) {
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      if (cols.length < 2) continue;

      const rawTs = (cols[0] || '').trim();
      if (!rawTs || rawTs.toLowerCase() === 'timestamp') continue;

      const matchedByTs = existingByTimestamp.get(rawTs);
      const fallbackDate = normalizeDateStr(rawTs);
      const targetDate = matchedByTs ? normalizeDateStr(matchedByTs.date) : fallbackDate;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) continue;

      const entry: LabResultEntry =
        matchedByTs ||
        existingByDate.get(targetDate) || {
          id: ensureRecordProfilePrefix(
            `lab-import-${targetDate}-${Math.random().toString(36).slice(2, 6)}`,
            profileId
          ),
          date: targetDate,
          legacyTimestamp: rawTs,
          recordedBy: defaultRecorder,
          tshTargetLevel: profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal',
          createdAt: new Date().toISOString(),
        };

      const vChol = parseOptionalNumber(cols[1] || '');
      const uChol = (cols[2] || '').trim();
      const vLdl = parseOptionalNumber(cols[3] || '');
      const vHdl = parseOptionalNumber(cols[5] || '');
      const vTrig = parseOptionalNumber(cols[7] || '');
      const vGlu = parseOptionalNumber(cols[9] || '');
      const uGlu = (cols[10] || '').trim();
      const vHba1c = parseOptionalNumber(cols[11] || '');
      const vCa = parseOptionalNumber(cols[13] || '');
      const uCa = (cols[14] || '').trim();
      const vVitD = parseOptionalNumber(cols[15] || '');
      const vAst = parseOptionalNumber(cols[17] || '');
      const vAlt = parseOptionalNumber(cols[19] || '');
      const vHb = parseOptionalNumber(cols[21] || '');

      if (vChol !== undefined) {
        entry.cholesterol = vChol;
        entry.lipidUnit = uChol === 'mg/dL' || vChol > 25 ? 'mg/dL' : 'mmol/L';
      }
      if (vLdl !== undefined) entry.ldlC = vLdl;
      if (vHdl !== undefined) entry.hdlC = vHdl;
      if (vTrig !== undefined) entry.triglyceride = vTrig;
      if (vGlu !== undefined) {
        entry.glucose = vGlu;
        entry.glucoseUnit = uGlu === 'mg/dL' || vGlu > 25 ? 'mg/dL' : 'mmol/L';
      }
      if (vHba1c !== undefined) entry.hba1c = vHba1c;
      if (vCa !== undefined) {
        entry.calcium = vCa;
        entry.calciumUnit = uCa === 'mg/dL' || vCa > 5 ? 'mg/dL' : 'mmol/L';
      }
      if (vVitD !== undefined) entry.vitaminD = vVitD;
      if (vAst !== undefined) entry.ast = vAst;
      if (vAlt !== undefined) entry.alt = vAlt;
      if (vHb !== undefined) entry.hemoglobin = vHb;

      entry.updatedAt = new Date().toISOString();
      existingByDate.set(targetDate, entry);
      existingByTimestamp.set(rawTs, entry);
      touchedDates.add(targetDate);
    }
  }

  const results: LabResultEntry[] = [];
  for (const d of touchedDates) {
    const entryToSave = existingByDate.get(d);
    if (entryToSave) results.push(entryToSave);
  }
  return results;
}
