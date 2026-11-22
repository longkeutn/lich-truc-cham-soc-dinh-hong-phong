import type { HealthProfileType, LabResultEntry } from './types';
import type { LabEvalStatus, LabIndicatorEval } from './config';

export const PHOSPHORUS_MG_PER_MMOL = 3.097;
export const PTH_PG_PER_PMOL = 9.43;
export const CALCIUM_MG_PER_MMOL = 4.008;

export function resolvePhosphorusUnit(
  val: number,
  explicitUnit?: 'mmol/L' | 'mg/dL'
): 'mmol/L' | 'mg/dL' {
  return explicitUnit || (val > 2.2 ? 'mg/dL' : 'mmol/L');
}

export function resolvePthUnit(
  _val: number,
  explicitUnit?: 'pg/mL' | 'pmol/L'
): 'pg/mL' | 'pmol/L' {
  // Khong tu doan pmol/L khi so nho vi suy can giap sau mo thuong co PTH 2-10 pg/mL
  return explicitUnit || 'pg/mL';
}

export function resolveAlbuminUnit(
  val: number,
  explicitUnit?: 'g/L' | 'g/dL'
): 'g/L' | 'g/dL' {
  return explicitUnit || (val > 12 ? 'g/L' : 'g/dL');
}

export function toPhosphorusMmol(val: number, explicitUnit?: 'mmol/L' | 'mg/dL'): number {
  const unit = resolvePhosphorusUnit(val, explicitUnit);
  return unit === 'mg/dL' ? val / PHOSPHORUS_MG_PER_MMOL : val;
}

export function toPhosphorusMgDl(val: number, explicitUnit?: 'mmol/L' | 'mg/dL'): number {
  const unit = resolvePhosphorusUnit(val, explicitUnit);
  return unit === 'mmol/L' ? val * PHOSPHORUS_MG_PER_MMOL : val;
}

export function toPthPgMl(val: number, explicitUnit?: 'pg/mL' | 'pmol/L'): number {
  const unit = resolvePthUnit(val, explicitUnit);
  return unit === 'pmol/L' ? val * PTH_PG_PER_PMOL : val;
}

export function toAlbuminGL(val: number, explicitUnit?: 'g/L' | 'g/dL'): number {
  const unit = resolveAlbuminUnit(val, explicitUnit);
  return unit === 'g/dL' ? val * 10 : val;
}

export function toCalciumMmol(val: number, explicitUnit?: 'mmol/L' | 'mg/dL'): number {
  const unit = explicitUnit || (val > 5 ? 'mg/dL' : 'mmol/L');
  return unit === 'mg/dL' ? val / CALCIUM_MG_PER_MMOL : val;
}

export function toCalciumMgDl(val: number, explicitUnit?: 'mmol/L' | 'mg/dL'): number {
  const unit = explicitUnit || (val > 5 ? 'mg/dL' : 'mmol/L');
  return unit === 'mmol/L' ? val * CALCIUM_MG_PER_MMOL : val;
}

export interface CorrectedCalciumResult {
  mmolL: number;
  mgDl: number;
  rawCalciumMmol: number;
  albuminGL: number;
  diffMmol: number;
}

/**
 * Tinh Canxi hieu chinh theo Albumin (Cong thuc Payne):
 * Ca_hieu_chinh (mmol/L) = Ca_do (mmol/L) + 0.02 * (40 - Albumin g/L)
 */
export function computeCorrectedCalcium(
  entry: Pick<LabResultEntry, 'calcium' | 'calciumUnit' | 'albumin' | 'albuminUnit'>
): CorrectedCalciumResult | null {
  if (
    typeof entry.calcium !== 'number' ||
    isNaN(entry.calcium) ||
    typeof entry.albumin !== 'number' ||
    isNaN(entry.albumin)
  ) {
    return null;
  }
  const rawCaMmol = toCalciumMmol(entry.calcium, entry.calciumUnit);
  const albGL = toAlbuminGL(entry.albumin, entry.albuminUnit);
  const diffMmol = 0.02 * (40 - albGL);
  const corrMmol = Number((rawCaMmol + diffMmol).toFixed(2));
  const corrMgDl = Number((corrMmol * CALCIUM_MG_PER_MMOL).toFixed(2));
  return {
    mmolL: corrMmol,
    mgDl: corrMgDl,
    rawCalciumMmol: Number(rawCaMmol.toFixed(2)),
    albuminGL: Number(albGL.toFixed(1)),
    diffMmol: Number(diffMmol.toFixed(2)),
  };
}

export interface CaPhosphorusProductResult {
  productMg2Dl2: number;
  caMgDl: number;
  pMgDl: number;
  isElevated: boolean;
}

/**
 * Tinh tich so Ca x Phospho (mg^2/dL^2) de tam soat nguy co voi hoa mo mem / soi than (< 55 la an toan)
 */
export function computeCalciumPhosphorusProduct(
  entry: Pick<LabResultEntry, 'calcium' | 'calciumUnit' | 'phosphorus' | 'phosphorusUnit'>
): CaPhosphorusProductResult | null {
  if (
    typeof entry.calcium !== 'number' ||
    isNaN(entry.calcium) ||
    typeof entry.phosphorus !== 'number' ||
    isNaN(entry.phosphorus)
  ) {
    return null;
  }
  const caMgDl = toCalciumMgDl(entry.calcium, entry.calciumUnit);
  const pMgDl = toPhosphorusMgDl(entry.phosphorus, entry.phosphorusUnit);
  const product = Number((caMgDl * pMgDl).toFixed(1));
  return {
    productMg2Dl2: product,
    caMgDl: Number(caMgDl.toFixed(2)),
    pMgDl: Number(pMgDl.toFixed(2)),
    isElevated: product >= 55,
  };
}

export function evaluateParathyroidPanel(
  entry: LabResultEntry,
  profileType: HealthProfileType = 'general_health'
): {
  indicators: LabIndicatorEval[];
  summaryPoints: string[];
} {
  const indicators: LabIndicatorEval[] = [];
  const summaryPoints: string[] = [];
  const isThyroidProfile =
    profileType === 'thyroid_post_op' ||
    Boolean(entry.levothyroxineDose) ||
    entry.tg !== undefined;

  // 1. Phospho mau (0.81 - 1.45 mmol/L | 2.5 - 4.5 mg/dL)
  if (typeof entry.phosphorus === 'number' && !isNaN(entry.phosphorus)) {
    const unit = resolvePhosphorusUnit(entry.phosphorus, entry.phosphorusUnit);
    const valMmol = toPhosphorusMmol(entry.phosphorus, unit);
    const isLow = valMmol < 0.81;
    const isHigh = valMmol > 1.45;
    const isVeryHigh = valMmol > 1.75;

    let status: LabEvalStatus = 'normal';
    let badgeText = '🟢 Bình thường';
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    let clinicalNote =
      'Phospho máu ổn định, cân bằng tốt cùng Canxi (ít nguy cơ lắng đọng vôi hóa).';

    if (isLow) {
      status = 'low';
      badgeText = '🟡 Hạ Phospho';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote =
        'Phospho máu thấp (<0.81 mmol/L). Thường gặp khi thiếu Vitamin D, ăn uống kém hoặc cường cận giáp. Cần kiểm tra thêm Vitamin D và PTH.';
    } else if (isHigh) {
      status = isVeryHigh ? 'critical' : 'high';
      badgeText = isVeryHigh ? '🔴 Phospho cao' : '🟡 Hơi cao';
      badgeClass = isVeryHigh
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote = isThyroidProfile
        ? 'Phospho tăng (>1.45 mmol/L) sau cắt tuyến giáp thường gợi ý suy tuyến cận giáp (giảm thải Phospho qua thận). Nếu đang uống Canxi + Calcitriol, cần báo Bác sĩ để tránh tăng tích số Ca x P gây sỏi thận/vôi hóa.'
        : 'Phospho máu cao (>1.45 mmol/L). Cần theo dõi chức năng thận và hạn chế thực phẩm giàu Phospho (nội tạng, nước ngọt có gas, đồ chế biến sẵn).';
      summaryPoints.push(
        'Phospho máu đang cao (>1.45 mmol/L hay >4.5 mg/dL) - cần đối chiếu cùng Canxi, PTH và chức năng thận.'
      );
    }

    indicators.push({
      key: 'phosphorus',
      label: 'Phospho máu (Phosphate)',
      shortLabel: 'Phospho',
      group: 'metabolic',
      value: entry.phosphorus,
      unit,
      refText: unit === 'mmol/L' ? '0.81 - 1.45 mmol/L' : '2.5 - 4.5 mg/dL',
      status,
      badgeText,
      badgeClass,
      clinicalNote,
    });
  }

  // 2. PTH - Hormone tuyen can giap (15 - 65 pg/mL | 1.6 - 6.9 pmol/L)
  if (typeof entry.pth === 'number' && !isNaN(entry.pth)) {
    const unit = resolvePthUnit(entry.pth, entry.pthUnit);
    const valPg = toPthPgMl(entry.pth, unit);
    const isLow = valPg < 15;
    const isSevereLow = valPg < 10;
    const isHigh = valPg > 65;
    const isVeryHigh = valPg > 100;

    let status: LabEvalStatus = 'optimal';
    let badgeText = '🟢 Đạt chuẩn';
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    let clinicalNote =
      'Hormone cận giáp PTH trong giới hạn bình thường, cho thấy tuyến cận giáp còn hoạt động điều hòa Canxi.';

    if (isLow) {
      status = isSevereLow ? 'critical' : 'low';
      badgeText = isSevereLow ? '🔴 PTH thấp (<10)' : '🟡 PTH thấp (<15)';
      badgeClass = isSevereLow
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote = isThyroidProfile
        ? 'PTH thấp (<15 pg/mL) gợi ý suy tuyến cận giáp sau cắt tuyến giáp. Thường cần duy trì Canxi kết hợp Vitamin D hoạt hóa (Calcitriol) theo đơn Bác sĩ và theo dõi Canxi/Phospho định kỳ.'
        : 'PTH thấp hơn ngưỡng chuẩn (<15 pg/mL), gợi ý giảm chức năng tuyến cận giáp.';
      summaryPoints.push(
        'PTH giảm thấp (<15 pg/mL) - cần theo dõi sát Canxi, Phospho và duy trì đơn Canxi/Calcitriol theo chỉ định Bác sĩ.'
      );
    } else if (isHigh) {
      status = isVeryHigh ? 'critical' : 'high';
      badgeText = isVeryHigh ? '🔴 PTH tăng cao' : '🟡 PTH hơi cao (>65)';
      badgeClass = isVeryHigh
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote =
        'PTH tăng (>65 pg/mL): nếu kèm Canxi thấp hoặc Vitamin D < 30, thường là cường cận giáp thứ phát (cơ thể bù trừ khi thiếu D/Canxi). Nếu kèm Canxi cao, cần khám Nội tiết tầm soát cường cận giáp nguyên phát.';
      summaryPoints.push(
        'PTH tăng cao (>65 pg/mL) - cần đối chiếu đồng thời với Canxi máu và 25-OH Vitamin D.'
      );
    }

    indicators.push({
      key: 'pth',
      label: 'PTH (Hormone tuyến cận giáp)',
      shortLabel: 'PTH',
      group: 'metabolic',
      value: entry.pth,
      unit,
      refText: unit === 'pg/mL' ? '15 - 65 pg/mL' : '1.6 - 6.9 pmol/L',
      status,
      badgeText,
      badgeClass,
      clinicalNote,
    });
  }

  // 3. Albumin mau (35 - 50 g/L | 3.5 - 5.0 g/dL)
  if (typeof entry.albumin === 'number' && !isNaN(entry.albumin)) {
    const unit = resolveAlbuminUnit(entry.albumin, entry.albuminUnit);
    const valGL = toAlbuminGL(entry.albumin, unit);
    const isLow = valGL < 35;
    const isHigh = valGL > 52;
    const corrCa = computeCorrectedCalcium(entry);

    let status: LabEvalStatus = 'normal';
    let badgeText = '🟢 Đạt chuẩn';
    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    let clinicalNote = corrCa
      ? `Albumin bình thường. Canxi hiệu chỉnh theo Albumin đạt ${corrCa.mmolL} mmol/L (${corrCa.mgDl} mg/dL).`
      : 'Albumin máu bình thường, phản ánh tình trạng dinh dưỡng đạm và chức năng tổng hợp của gan tốt.';

    if (isLow) {
      status = valGL < 28 ? 'critical' : 'low';
      badgeText = valGL < 28 ? '🔴 Albumin thấp' : '🟡 Hơi thấp (<35 g/L)';
      badgeClass =
        valGL < 28
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote = corrCa
        ? `Albumin giảm (<35 g/L) có thể làm kết quả Canxi toàn phần bị thấp giả. Canxi hiệu chỉnh thực tế là ${corrCa.mmolL} mmol/L (${corrCa.mgDl} mg/dL); nên ưu tiên đo Canxi ion hóa (Ca++) và tăng cường đạm dễ tiêu.`
        : 'Albumin giảm (<35 g/L) dễ làm Canxi toàn phần thấp giả tạo. Cần chú ý bổ sung đạm dinh dưỡng và kiểm tra chức năng gan/thận.';
      summaryPoints.push(
        'Albumin máu thấp (<35 g/L) - lưu ý Canxi toàn phần đo được có thể bị thấp giả so với Canxi hiệu chỉnh.'
      );
    } else if (isHigh) {
      status = 'high';
      badgeText = '🟡 Hơi cao';
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      clinicalNote = 'Albumin hơi cao (thường do cô đặc máu hoặc uống thiếu nước trước khi lấy máu).';
    }

    indicators.push({
      key: 'albumin',
      label: 'Albumin máu (Hiệu chỉnh Canxi & Dinh dưỡng)',
      shortLabel: 'Albumin',
      group: 'metabolic',
      value: entry.albumin,
      unit,
      refText: unit === 'g/L' ? '35 - 50 g/L' : '3.5 - 5.0 g/dL',
      status,
      badgeText,
      badgeClass,
      clinicalNote,
    });
  }

  // Kiem tra tich so Ca x P neu co ca 2 chi so
  const caP = computeCalciumPhosphorusProduct(entry);
  if (caP?.isElevated) {
    summaryPoints.push(
      `Tích số Canxi × Phospho = ${caP.productMg2Dl2} mg²/dL² (vượt ngưỡng an toàn <55) - cần trao đổi Bác sĩ về liều Canxi/Calcitriol và kiểm tra siêu âm thận, Canxi niệu 24h.`
    );
  }

  return { indicators, summaryPoints };
}

export interface ParathyroidClinicalSynthesis {
  patternTitle: string;
  badgeText: string;
  badgeClass: string;
  correctedCalcium: CorrectedCalciumResult | null;
  caPProduct: CaPhosphorusProductResult | null;
  findings: string[];
  actionTips: string[];
}

/**
 * Tong hop bien luan lam sang lien ket giữa Canxi - Albumin - PTH - Phospho - Vitamin D
 */
export function analyzeParathyroidClinicalPattern(
  entry: LabResultEntry | null,
  profileType: HealthProfileType = 'general_health'
): ParathyroidClinicalSynthesis | null {
  if (!entry) return null;

  const hasCa = typeof entry.calcium === 'number' && !isNaN(entry.calcium);
  const hasIonCa = typeof entry.ionizedCalcium === 'number' && !isNaN(entry.ionizedCalcium);
  const hasP = typeof entry.phosphorus === 'number' && !isNaN(entry.phosphorus);
  const hasPth = typeof entry.pth === 'number' && !isNaN(entry.pth);
  const hasAlb = typeof entry.albumin === 'number' && !isNaN(entry.albumin);
  const hasVitD = typeof entry.vitaminD === 'number' && !isNaN(entry.vitaminD);

  if (!hasCa && !hasIonCa && !hasP && !hasPth && !hasAlb && !hasVitD) {
    return null;
  }

  const correctedCalcium = computeCorrectedCalcium(entry);
  const caPProduct = computeCalciumPhosphorusProduct(entry);

  const effectiveCaMmol = correctedCalcium
    ? correctedCalcium.mmolL
    : hasCa
      ? toCalciumMmol(entry.calcium!, entry.calciumUnit)
      : undefined;

  const pMmol = hasP ? toPhosphorusMmol(entry.phosphorus!, entry.phosphorusUnit) : undefined;
  const pthPg = hasPth ? toPthPgMl(entry.pth!, entry.pthUnit) : undefined;
  const vitD = hasVitD ? entry.vitaminD! : undefined;

  const caLow = (effectiveCaMmol !== undefined && effectiveCaMmol < 2.15) || (hasIonCa && entry.ionizedCalcium! < 1.1);
  const caHigh = (effectiveCaMmol !== undefined && effectiveCaMmol > 2.55) || (hasIonCa && entry.ionizedCalcium! > 1.35);
  const pLow = pMmol !== undefined && pMmol < 0.81;
  const pHigh = pMmol !== undefined && pMmol > 1.45;
  const pthLow = pthPg !== undefined && pthPg < 15;
  const pthHigh = pthPg !== undefined && pthPg > 65;
  const vitDLow = vitD !== undefined && vitD < 30;

  const findings: string[] = [];
  const actionTips: string[] = [];

  let patternTitle = 'Trục Cận Giáp - Canxi - Chuyển Hóa Đang Ổn Định';
  let badgeText = '🟢 Cân bằng tốt';
  let badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';

  if (pthLow && (caLow || pHigh)) {
    patternTitle = 'Gợi ý Suy Tuyến Cận Giáp Sau Phẫu Thuật Tuyến Giáp';
    badgeText = '🔴 Cần theo dõi sát';
    badgeClass = 'bg-rose-100 text-rose-900 border-rose-300';
    findings.push(
      'PTH thấp (<15 pg/mL) đi kèm hạ Canxi và/hoặc tăng Phospho là dấu hiệu đặc trưng của suy cận giáp sau cắt toàn bộ tuyến giáp.'
    );
    actionTips.push(
      'Trao đổi Bác sĩ Nội tiết duy trì phác đồ Canxi + Vitamin D hoạt hóa (Calcitriol) để giữ Canxi ở mức thấp-bình thường (khoảng 2.0 - 2.15 mmol/L) nhằm giảm triệu chứng tê bì mà không gây tăng Canxi niệu.'
    );
  } else if (pthHigh && !caHigh && (vitDLow || caLow)) {
    patternTitle = 'Gợi ý Cường Cận Giáp Thứ Phát (Do Thiếu Vitamin D / Canxi)';
    badgeText = '🟡 Phản ứng bù trừ';
    badgeClass = 'bg-amber-100 text-amber-950 border-amber-300';
    findings.push(
      'PTH tăng (>65 pg/mL) trong khi Canxi không tăng (kèm Vitamin D < 30 ng/mL hoặc Canxi thấp) cho thấy tuyến cận giáp đang tăng tiết bù trừ.'
    );
    actionTips.push(
      'Bổ sung đủ Vitamin D3 (đưa 25-OH Vitamin D lên ≥30 ng/mL) và Canxi theo đơn Bác sĩ sẽ giúp PTH dần hạ về mức bình thường.'
    );
  } else if (pthHigh && caHigh) {
    patternTitle = 'Cảnh Báo: Cả Canxi Và PTH Đều Tăng';
    badgeText = '🔴 Cần khám chuyên khoa';
    badgeClass = 'bg-rose-100 text-rose-900 border-rose-300';
    findings.push(
      'Canxi hiệu chỉnh tăng đi kèm PTH tăng (>65 pg/mL) cần được Bác sĩ Nội tiết đánh giá loại trừ cường cận giáp nguyên phát.'
    );
    actionTips.push(
      'Ngưng tự ý uống thêm Canxi/Vitamin D liều cao cho đến khi khám lại và siêu âm vùng cổ/thận.'
    );
  } else if (caLow) {
    patternTitle = 'Hạ Canxi Máu Cần Lưu Ý Theo Dõi Triệu Chứng';
    badgeText = '🟡 Canxi thấp';
    badgeClass = 'bg-amber-100 text-amber-950 border-amber-300';
    findings.push(
      'Canxi máu thấp hơn chuẩn (<2.15 mmol/L). Nếu chưa có PTH và Phospho cùng kỳ, nên làm thêm bộ đôi này ở lần khám tới để rõ nguyên nhân.'
    );
  } else if (pHigh) {
    patternTitle = 'Phospho Máu Tăng Cao Cần Kiểm Soát Nguồn Nạp';
    badgeText = '🟡 Phospho cao';
    badgeClass = 'bg-amber-100 text-amber-950 border-amber-300';
    findings.push(
      'Phospho máu > 1.45 mmol/L làm tăng nguy cơ lắng đọng tinh thể Canxi-Phosphat nếu uống bổ sung Canxi/Vitamin D quá mức.'
    );
  } else if (pthLow) {
    patternTitle = 'PTH Thấp Nhưng Canxi Đang Được Kiểm Soát Tốt';
    badgeText = '🟡 Đáp ứng thuốc tốt';
    badgeClass = 'bg-amber-100 text-amber-950 border-amber-300';
    findings.push(
      'PTH < 15 pg/mL nhưng Canxi máu giữ được trong vùng an toàn cho thấy liều Canxi/Vitamin D đang bù trừ tốt.'
    );
  } else if (pLow) {
    patternTitle = 'Phospho Máu Hơi Thấp';
    badgeText = '🟡 Cần lưu ý';
    badgeClass = 'bg-amber-100 text-amber-950 border-amber-300';
    findings.push('Phospho < 0.81 mmol/L có thể liên quan thiếu Vitamin D hoặc hấp thu kém.');
  }

  if (correctedCalcium && hasCa) {
    const rawMmol = toCalciumMmol(entry.calcium!, entry.calciumUnit);
    if (Math.abs(correctedCalcium.diffMmol) >= 0.08) {
      findings.push(
        `Hiệu chỉnh theo Albumin (${correctedCalcium.albuminGL} g/L): Canxi đo thô ${rawMmol.toFixed(2)} mmol/L -> Canxi hiệu chỉnh thực tế ${correctedCalcium.mmolL} mmol/L (${correctedCalcium.mgDl} mg/dL).`
      );
    }
  }

  if (caPProduct) {
    findings.push(
      caPProduct.isElevated
        ? `Tích số Canxi × Phospho = ${caPProduct.productMg2Dl2} mg²/dL² (cao ≥55): Cần rà soát nguy cơ vôi hóa mô mềm và sỏi thận.`
        : `Tích số Canxi × Phospho = ${caPProduct.productMg2Dl2} mg²/dL² (an toàn < 55 mg²/dL²).`
    );
  }

  if (vitDLow) {
    actionTips.push(
      `25-OH Vitamin D đang ở mức ${vitD} ng/mL (<30): Cần bổ sung Vitamin D3 để ruột hấp thu được Canxi tối ưu.`
    );
  }

  if (profileType === 'thyroid_post_op') {
    actionTips.push(
      'Nguyên tắc vàng: Uống viên Canxi cách xa Levothyroxine ít nhất 4 tiếng (thường uống Canxi buổi trưa/chiều sau ăn, thuốc giáp buổi sáng lúc đói).'
    );
  }

  if (findings.length === 0) {
    findings.push(
      'Các chỉ số Canxi, Phospho, PTH, Albumin hoặc Vitamin D hiện có đều nằm trong vùng cân bằng an toàn.'
    );
  }

  return {
    patternTitle,
    badgeText,
    badgeClass,
    correctedCalcium,
    caPProduct,
    findings,
    actionTips,
  };
}
