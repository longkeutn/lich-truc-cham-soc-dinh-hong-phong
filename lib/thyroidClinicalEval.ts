import type { LabResultEntry, TshTargetLevel } from './types';
import type { LabEvalStatus, LabIndicatorEval } from './config';

const TRACKED_LAB_KEYS = [
  'levothyroxineDose',
  'tshTargetLevel',
  'tsh',
  'ft4',
  'ft3',
  't3',
  't4',
  'tg',
  'antiTg',
  'antiTpo',
  'cholesterol',
  'ldlC',
  'hdlC',
  'triglyceride',
  'glucose',
  'hba1c',
  'calcium',
  'ionizedCalcium',
  'phosphorus',
  'pth',
  'albumin',
  'vitaminD',
  'ast',
  'alt',
  'ggt',
  'bilirubinTotal',
  'bilirubinDirect',
  'creatinine',
  'egfr',
  'urea',
  'uricAcid',
  'hemoglobin',
  'gallbladderPolypMm',
  'gallbladderPolypCount',
  'liverUltrasound',
  'kidneyUltrasound',
  'nextUltrasoundDate',
] as const;

export interface LatestKnownLabSnapshot {
  mergedEntry: LabResultEntry | null;
  sourceDateByKey: Record<string, string>;
  previousEntryByKey: Record<string, LabResultEntry | null>;
}

const UNIT_PAIR_BY_KEY: Record<string, keyof LabResultEntry> = {
  ft4: 'ft4Unit',
  ft3: 'ft3Unit',
  t3: 't3Unit',
  t4: 't4Unit',
  cholesterol: 'lipidUnit',
  ldlC: 'lipidUnit',
  hdlC: 'lipidUnit',
  triglyceride: 'lipidUnit',
  glucose: 'glucoseUnit',
  calcium: 'calciumUnit',
  phosphorus: 'phosphorusUnit',
  pth: 'pthUnit',
  albumin: 'albuminUnit',
};

function hasDefinedValue(val: unknown): boolean {
  if (val === undefined || val === null || val === '') return false;
  if (typeof val === 'number') return !isNaN(val);
  return true;
}

/**
 * Gop anh chup chi so gan nhat tu tat ca cac lan kham (tranh bi trang chi so khi dot kham moi nhat la Goi 3 hoac tach ngay kham)
 */
export function buildLatestKnownLabSnapshot(
  sortedLabsDesc: LabResultEntry[]
): LatestKnownLabSnapshot {
  if (sortedLabsDesc.length === 0) {
    return { mergedEntry: null, sourceDateByKey: {}, previousEntryByKey: {} };
  }

  const merged: LabResultEntry = { ...sortedLabsDesc[0] };
  const sourceDateByKey: Record<string, string> = {};
  const previousEntryByKey: Record<string, LabResultEntry | null> = {};

  for (const key of TRACKED_LAB_KEYS) {
    let foundLatest = false;
    for (const entry of sortedLabsDesc) {
      const val = (entry as unknown as Record<string, unknown>)[key];
      if (!hasDefinedValue(val)) continue;

      if (!foundLatest) {
        foundLatest = true;
        (merged as unknown as Record<string, unknown>)[key] = val;
        sourceDateByKey[key] = entry.date;
        previousEntryByKey[key] = null;

        const unitKey = UNIT_PAIR_BY_KEY[key];
        if (unitKey && entry[unitKey]) {
          (merged as unknown as Record<string, unknown>)[unitKey] = entry[unitKey];
        }
      } else {
        previousEntryByKey[key] = entry;
        break;
      }
    }
  }

  return { mergedEntry: merged, sourceDateByKey, previousEntryByKey };
}

export function evaluateTshIndicator(
  val: number,
  tshTarget: TshTargetLevel
): LabIndicatorEval {
  let status: LabEvalStatus = 'normal';
  let badgeText = '🟢 Đạt chuẩn';
  let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  let refText = '0.40 – 4.00 µIU/mL';
  let clinicalNote = 'TSH nằm trong giới hạn bình thường.';

  if (tshTarget === 'high_risk') {
    refText = 'Mục tiêu ức chế cao: < 0.10 µIU/mL';
    if (val < 0.01) {
      status = 'low';
      badgeText = '🟡 Ức chế rất sâu (<0.01)';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote =
        'TSH ức chế rất sâu (<0.01 µIU/mL). Cần theo dõi nhịp tim và mật độ xương để tránh cường giáp dưới lâm sàng quá mức.';
    } else if (val <= 0.1) {
      status = 'optimal';
      badgeText = '🟢 Đạt đích ức chế (<0.1)';
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      clinicalNote = 'TSH đạt mục tiêu ức chế cao (<0.1 µIU/mL) sau phẫu thuật K giáp.';
    } else if (val <= 0.5) {
      status = 'normal';
      badgeText = '🟡 Ức chế vừa (0.1–0.5)';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote = 'TSH ở mức 0.1–0.5 µIU/mL, hơi cao hơn đích <0.1 của nhóm nguy cơ cao.';
    } else {
      status = val > 2.0 ? 'critical' : 'high';
      badgeText = val > 2.0 ? '🔴 TSH cao (>2.0)' : '🟡 Chưa đạt đích (<0.1)';
      badgeClass =
        val > 2.0
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote =
        'TSH cao hơn mục tiêu ức chế. Cần kiểm tra việc uống Levothyroxine lúc đói (cách xa Canxi/Sắt 4h) và hỏi Bác sĩ chỉnh liều.';
    }
  } else if (tshTarget === 'moderate_risk') {
    refText = 'Mục tiêu ức chế: 0.10 – 0.50 µIU/mL';
    if (val < 0.05) {
      status = 'low';
      badgeText = '🟡 Ức chế quá sâu (<0.05)';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote =
        'TSH thấp sâu (<0.05 µIU/mL). Nếu kèm tim đập nhanh, hồi hộp hoặc FT4 cao (>22 pmol/L), nên báo Bác sĩ xem xét giảm nhẹ liều Levothyroxine để bảo vệ tim và xương.';
    } else if (val < 0.1) {
      status = 'normal';
      badgeText = '🟢 Ức chế mạnh (<0.1)';
      badgeClass = 'bg-teal-100 text-teal-800 border-teal-200';
      clinicalNote =
        'TSH đang dưới 0.1 µIU/mL (sâu hơn đích 0.1–0.5 một chút). Nếu mạch nghỉ ổn định <85 bpm và FT4 không vượt ngưỡng trên thì vẫn an toàn.';
    } else if (val <= 0.5) {
      status = 'optimal';
      badgeText = '🟢 Đạt đích ức chế (0.1–0.5)';
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      clinicalNote = 'TSH nằm đúng vùng mục tiêu ức chế tối ưu sau phẫu thuật K giáp.';
    } else if (val <= 2.0) {
      status = 'high';
      badgeText = '🟡 Hơi cao so với đích 0.5';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote =
        'TSH trong ngưỡng bình thường chung (0.5–2.0) nhưng cao hơn đích ức chế 0.5 µIU/mL. Nếu Bác sĩ đã chuyển sang đích ổn định lâu dài thì đạt; nếu chưa thì kiểm tra cách uống thuốc.';
    } else {
      status = val > 4.2 ? 'critical' : 'high';
      badgeText = val > 4.2 ? '🔴 TSH cao (>4.2)' : '🔴 TSH cao (>2.0)';
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
      clinicalNote =
        'TSH tăng cao gợi ý chưa đủ liều hormone Levothyroxine hoặc bị cản trở hấp thu (uống gần Canxi/đồ ăn). Cần báo Bác sĩ điều chỉnh.';
    }
  } else if (tshTarget === 'low_risk') {
    refText = 'Đích ổn định lâu dài: 0.50 – 2.00 µIU/mL';
    if (val < 0.1) {
      status = 'low';
      badgeText = '🟡 Ức chế sâu (<0.1)';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote =
        'TSH đang thấp hơn vùng 0.5–2.0 của nhóm ổn định lâu dài; nên trao đổi Bác sĩ về việc hạ nhẹ liều nếu nguy cơ tái phát thấp.';
    } else if (val < 0.5) {
      status = 'normal';
      badgeText = '🟢 Hơi thấp (0.1–0.5)';
      badgeClass = 'bg-teal-100 text-teal-800 border-teal-200';
      clinicalNote = 'TSH ở mức ức chế nhẹ (0.1–0.5 µIU/mL).';
    } else if (val <= 2.0) {
      status = 'optimal';
      badgeText = '🟢 Tối ưu (0.5–2.0)';
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      clinicalNote = 'TSH nằm đúng ngưỡng tối ưu (0.5–2.0 µIU/mL) cho bệnh nhân K giáp đáp ứng ổn định lâu dài.';
    } else if (val <= 4.2) {
      status = 'high';
      badgeText = '🟡 Hơi cao (>2.0)';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote = 'TSH hơi cao trên 2.0 µIU/mL; theo dõi triệu chứng mệt mỏi và kiểm tra lại liều Levothyroxine.';
    } else {
      status = 'critical';
      badgeText = '🔴 TSH cao (>4.2)';
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
      clinicalNote = 'TSH tăng cao (>4.2 µIU/mL), thiếu hụt hormone thay thế; cần báo Bác sĩ chỉnh tăng liều.';
    }
  } else {
    if (val < 0.4) {
      status = 'low';
      badgeText = '🟡 Thấp (<0.4)';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote = 'TSH thấp hơn ngưỡng bình thường (xu hướng cường giáp / dư hormone).';
    } else if (val > 4.2) {
      status = 'high';
      badgeText = '🔴 Cao (>4.2)';
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
      clinicalNote = 'TSH tăng cao (xu hướng suy giáp / thiếu hormone tuyến giáp).';
    }
  }

  return {
    key: 'tsh',
    label: 'TSH (Hormone kích thích tuyến giáp)',
    shortLabel: 'TSH',
    group: 'thyroid',
    value: val,
    unit: 'µIU/mL',
    refText,
    status,
    badgeText,
    badgeClass,
    clinicalNote,
  };
}

export function evaluateFt4Indicator(
  val: number,
  explicitUnit: 'ng/dL' | 'pmol/L' | undefined,
  isThyroidProfile: boolean
): LabIndicatorEval {
  const unit = explicitUnit || (val > 5 ? 'pmol/L' : 'ng/dL');
  const valPmol = unit === 'ng/dL' ? val * 12.87 : val;
  const refText =
    unit === 'pmol/L'
      ? isThyroidProfile
        ? '12.0 – 22.0 (Đích ức chế: 16.5 – 22.0 pmol/L)'
        : '12.0 – 22.0 pmol/L'
      : isThyroidProfile
        ? '0.93 – 1.70 (Đích ức chế: 1.30 – 1.70 ng/dL)'
        : '0.93 – 1.70 ng/dL';

  let status: LabEvalStatus = 'normal';
  let badgeText = '🟢 Đạt chuẩn';
  let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  let clinicalNote = 'Nồng độ FT4 tự do trong máu ổn định.';

  if (valPmol < 12.0) {
    status = valPmol < 10.0 ? 'critical' : 'low';
    badgeText = '🔴 FT4 thấp';
    badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
    clinicalNote = 'FT4 thấp hơn ngưỡng chuẩn (<12.0 pmol/L hay <0.93 ng/dL), gợi ý thiếu hụt hormone T4.';
  } else if (valPmol > 25.0) {
    status = 'critical';
    badgeText = '🔴 FT4 cao (>25 pmol/L)';
    badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
    clinicalNote =
      'FT4 tăng cao rõ rệt (>25.0 pmol/L hay >1.94 ng/dL), dễ gây mệt mỏi, tim đập nhanh và mất xương. Kiểm tra lại xem sáng lấy máu có uống Levothyroxine trước không và báo Bác sĩ xem lại liều.';
  } else if (valPmol > 22.0) {
    status = 'high';
    badgeText = '🟡 FT4 hơi cao (>22 pmol/L)';
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
    clinicalNote =
      'FT4 vượt nhẹ ngưỡng trên (>22.0 pmol/L hay >1.70 ng/dL). Nếu sáng hôm đó có uống Levothyroxine trước khi lấy máu thì FT4 hay tăng giả 15–20%; nếu nhịn thuốc mà vẫn cao kèm mạch nhanh thì nên hỏi Bác sĩ giảm nhẹ liều.';
  } else if (isThyroidProfile && valPmol >= 16.5) {
    status = 'optimal';
    badgeText = unit === 'pmol/L' ? '🟢 Tối ưu (16.5–22)' : '🟢 Tối ưu (1.3–1.7)';
    clinicalNote =
      'FT4 đạt nửa trên ngưỡng chuẩn (16.5–22.0 pmol/L), phù hợp mục tiêu thay thế & ức chế TSH sau cắt tuyến giáp.';
  } else if (isThyroidProfile) {
    clinicalNote =
      'FT4 ở nửa dưới ngưỡng bình thường (12.0–16.4 pmol/L); hoàn toàn ổn nếu TSH vẫn đạt mục tiêu và không mệt mỏi.';
  }

  return {
    key: 'ft4',
    label: 'FT4 (Thyroxine tự do)',
    shortLabel: 'FT4',
    group: 'thyroid',
    value: val,
    unit,
    refText,
    status,
    badgeText,
    badgeClass,
    clinicalNote,
  };
}

export function evaluateTgAndAntiTgIndicators(
  entry: LabResultEntry,
  previousLab?: LabResultEntry | null
): { indicators: LabIndicatorEval[]; summaryPoints: string[] } {
  const indicators: LabIndicatorEval[] = [];
  const summaryPoints: string[] = [];
  const hasHighAntiTg = typeof entry.antiTg === 'number' && !isNaN(entry.antiTg) && entry.antiTg > 115;

  if (typeof entry.tg === 'number' && !isNaN(entry.tg)) {
    const val = entry.tg;
    const prevTg =
      previousLab && typeof previousLab.tg === 'number' && !isNaN(previousLab.tg)
        ? previousLab.tg
        : undefined;
    const isRising = prevTg !== undefined && val - prevTg >= 0.2 && val > prevTg * 1.5;

    let status: LabEvalStatus = 'optimal';
    let badgeText = '🟢 Đáp ứng tốt (<0.2)';
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    let clinicalNote =
      'Chỉ dấu TG rất thấp (<0.2 ng/mL), đáp ứng sinh hóa rất tốt sau cắt toàn bộ tuyến giáp.';

    if (hasHighAntiTg && val < 0.2) {
      status = 'normal';
      badgeText = '🟡 TG thấp (kèm Anti-TG cao)';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote =
        'TG < 0.2 ng/mL nhưng có Anti-TG cao (>115 IU/mL) có thể làm sai lệch thấp giả; cần theo dõi thêm xu hướng Anti-TG và siêu âm cổ.';
    } else if (val >= 0.2 && val <= 1.0) {
      status = isRising ? 'high' : 'normal';
      badgeText = isRising ? '🟡 TG xu hướng tăng' : '🟢 Ổn định (0.2–1.0)';
      badgeClass = isRising
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-teal-100 text-teal-800 border-teal-200';
      clinicalNote = isRising
        ? `TG ở mức ${val} ng/mL (tăng từ ${prevTg} ng/mL kỳ trước); cần theo dõi động học TG cùng siêu âm cổ ở lần tái khám.`
        : 'TG ở vùng an toàn thấp (0.2–1.0 ng/mL), tiếp tục theo dõi định kỳ 6–12 tháng.';
    } else if (val > 1.0) {
      status = val >= 2.0 ? 'critical' : 'high';
      badgeText = val >= 2.0 ? '🔴 TG tăng (>2.0)' : '🟡 Cần lưu ý (>1.0)';
      badgeClass =
        val >= 2.0
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote =
        'Chỉ số TG > 1.0 ng/mL sau cắt toàn bộ tuyến giáp: cần đối chiếu siêu âm vùng cổ và hỏi ý kiến Bác sĩ Ung bướu/Nội tiết.';
      summaryPoints.push(clinicalNote);
    }

    indicators.push({
      key: 'tg',
      label: 'TG (Thyroglobulin - Marker K giáp)',
      shortLabel: 'TG',
      group: 'markers',
      value: val,
      unit: 'ng/mL',
      refText: 'Sau cắt giáp toàn bộ: < 0.2 (An toàn < 1.0) ng/mL',
      status,
      badgeText,
      badgeClass,
      clinicalNote,
    });
  }

  if (typeof entry.antiTg === 'number' && !isNaN(entry.antiTg)) {
    const val = entry.antiTg;
    const isHigh = val > 115;
    indicators.push({
      key: 'antiTg',
      label: 'Anti-TG (Kháng thể kháng Thyroglobulin)',
      shortLabel: 'Anti-TG',
      group: 'markers',
      value: val,
      unit: 'IU/mL',
      refText: '< 115 IU/mL (Âm tính)',
      status: isHigh ? 'high' : 'normal',
      badgeText: isHigh ? '🟡 Dương tính (>115)' : '🟢 Âm tính (<115)',
      badgeClass: isHigh
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200',
      clinicalNote: isHigh
        ? 'Anti-TG tăng có thể làm kết quả TG thấp giả; cần theo dõi xu hướng giảm dần của Anti-TG qua các kỳ khám.'
        : 'Anti-TG âm tính, giúp chỉ số TG đạt độ tin cậy cao nhất.',
    });
    if (isHigh) {
      summaryPoints.push('Anti-TG tăng (>115 IU/mL) - cần theo dõi xu hướng giảm dần cùng siêu âm cổ.');
    }
  }

  return { indicators, summaryPoints };
}
