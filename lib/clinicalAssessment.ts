import type { HealthProfileType, LabResultEntry } from './types';
import {
  computeAgeYearsAtDate,
  evaluateLabEntry,
  normalizeDateStr,
  type LabPatientContext,
} from './config';
import {
  computeCalciumPhosphorusProduct,
  computeCorrectedCalcium,
  resolvePthUnit,
  toPthPgMl,
} from './parathyroidEval';
import {
  evaluateFt4Indicator,
  evaluateTshIndicator,
} from './thyroidClinicalEval';

export type ClinicalClusterStatus =
  | 'optimal'
  | 'normal'
  | 'attention'
  | 'warning'
  | 'insufficient';

export interface ClinicalClusterFinding {
  id: string;
  title: string;
  icon: string;
  guidelineRef: string;
  status: ClinicalClusterStatus;
  hasCompleteData: boolean;
  headline: string;
  details: string[];
  missingHint?: string;
}

export interface ClinicalAssessmentReport {
  overallLevel: 'optimal' | 'attention' | 'warning' | 'insufficient';
  overallHeadline: string;
  assessedDate: string;
  ageAtLab: number | null;
  computedEgfr: number | null;
  nonHdlMmol: number | null;
  clusters: ClinicalClusterFinding[];
  missingPairs: string[];
  trendComparisons: string[];
  disclaimer: string;
}

export interface ClinicalAssessmentOptions extends LabPatientContext {
  profileType?: HealthProfileType;
  previousLab?: LabResultEntry | null;
}

function hasNum(val: unknown): val is number {
  return typeof val === 'number' && !isNaN(val);
}

function toLipidMmol(
  val: number,
  explicitUnit: 'mmol/L' | 'mg/dL' | undefined,
  kind: 'chol' | 'tg'
): number {
  const unit =
    explicitUnit ||
    (kind === 'chol'
      ? val > 15
        ? 'mg/dL'
        : 'mmol/L'
      : val > 15
        ? 'mg/dL'
        : 'mmol/L');
  if (unit === 'mmol/L') return val;
  return kind === 'chol' ? val / 38.67 : val / 88.57;
}

function toGlucoseMmol(val: number, explicitUnit?: 'mmol/L' | 'mg/dL'): number {
  const unit = explicitUnit || (val > 25 ? 'mg/dL' : 'mmol/L');
  return unit === 'mg/dL' ? val / 18.0 : val;
}

function toHemoglobinGdL(val: number): number {
  return val > 35 ? val / 10 : val;
}

/**
 * Ước tính mức lọc cầu thận eGFR theo công thức CKD-EPI (2021, không phân biệt chủng tộc).
 * Creatinine tính bằng µmol/L (1 mg/dL = 88.4 µmol/L).
 */
export function computeCkDepi2021Egfr(
  creatinineUmol: number,
  ageYears: number,
  gender: 'male' | 'female'
): number | null {
  if (!hasNum(creatinineUmol) || creatinineUmol <= 0 || ageYears < 18 || ageYears > 120) {
    return null;
  }
  const scrMgDl = creatinineUmol / 88.4;
  const kappa = gender === 'female' ? 0.7 : 0.9;
  const alpha = gender === 'female' ? -0.241 : -0.302;
  const femaleFactor = gender === 'female' ? 1.012 : 1.0;
  const ratio = scrMgDl / kappa;
  const minPart = Math.pow(Math.min(ratio, 1), alpha);
  const maxPart = Math.pow(Math.max(ratio, 1), -1.2);
  const agePart = Math.pow(0.9938, ageYears);
  return Math.round(142 * minPart * maxPart * agePart * femaleFactor);
}

function formatTrendDiff(
  label: string,
  curr: number,
  prev: number,
  unit: string,
  decimals = 2
): string | null {
  const diff = Number((curr - prev).toFixed(decimals));
  if (diff === 0) return null;
  const arrow = diff > 0 ? 'tăng' : 'giảm';
  const pct = prev !== 0 ? Math.round((Math.abs(diff) / Math.abs(prev)) * 100) : null;
  const pctNote = pct !== null && pct >= 5 ? ` (${pct}%)` : '';
  return `${label} ${arrow} ${Math.abs(diff)} ${unit}${pctNote} so với lần trước (${prev} → ${curr} ${unit})`;
}

/**
 * Bộ đánh giá chỉ số xét nghiệm tự động theo cụm chuyên khoa và chuẩn y khoa hiện hành.
 * Luôn tách biệt hoàn toàn với `doctorAdvice` (Lời dặn thực tế của Bác sĩ).
 */
export function assessLabEntryClinically(
  entry: LabResultEntry,
  options: ClinicalAssessmentOptions = {}
): ClinicalAssessmentReport {
  const profileType = options.profileType || 'general_health';
  const previousLab = options.previousLab || null;
  const labDate = normalizeDateStr(entry.date) || options.todayStr || '';
  const ageAtLab = computeAgeYearsAtDate(options.birthDate, labDate);
  const gender = options.gender;

  const evalRes = evaluateLabEntry(entry, profileType, previousLab, {
    birthDate: options.birthDate,
    gender,
    todayStr: options.todayStr,
  });

  const clusters: ClinicalClusterFinding[] = [];
  const missingPairs: string[] = [];
  const trendComparisons: string[] = [];

  // ---------------------------------------------------
  // 1. CỤM MỠ MÁU & TIM MẠCH (ESC/EAS · ATP III)
  // ---------------------------------------------------
  const hasTc = hasNum(entry.cholesterol);
  const hasLdl = hasNum(entry.ldlC);
  const hasHdl = hasNum(entry.hdlC);
  const hasTg = hasNum(entry.triglyceride);
  let nonHdlMmol: number | null = null;

  if (hasTc || hasLdl || hasHdl || hasTg) {
    const lipidMissing: string[] = [];
    if (!hasTc) lipidMissing.push('Cholesterol TP');
    if (!hasLdl) lipidMissing.push('LDL-C');
    if (!hasHdl) lipidMissing.push('HDL-C');
    if (!hasTg) lipidMissing.push('Triglyceride');

    const tcMmol = hasTc ? toLipidMmol(entry.cholesterol!, entry.lipidUnit, 'chol') : null;
    const ldlMmol = hasLdl ? toLipidMmol(entry.ldlC!, entry.lipidUnit, 'chol') : null;
    const hdlMmol = hasHdl ? toLipidMmol(entry.hdlC!, entry.lipidUnit, 'chol') : null;
    const tgMmol = hasTg ? toLipidMmol(entry.triglyceride!, entry.lipidUnit, 'tg') : null;

    if (tcMmol !== null && hdlMmol !== null) {
      nonHdlMmol = Number((tcMmol - hdlMmol).toFixed(2));
    }

    const ldlTarget = profileType === 'post_stroke_cranioplasty' ? 1.8 : 2.6;
    const nonHdlTarget = profileType === 'post_stroke_cranioplasty' ? 2.6 : 3.4;
    const hdlFloor = gender === 'female' ? 1.29 : gender === 'male' ? 1.03 : 1.15;

    const ldlHigh = ldlMmol !== null && ldlMmol >= ldlTarget;
    const ldlVeryHigh = ldlMmol !== null && ldlMmol >= 3.4;
    const hdlLow = hdlMmol !== null && hdlMmol < hdlFloor;
    const tgHigh = tgMmol !== null && tgMmol >= 1.7;
    const tgVeryHigh = tgMmol !== null && tgMmol >= 2.3;
    const nonHdlHigh = nonHdlMmol !== null && nonHdlMmol >= nonHdlTarget;

    const details: string[] = [];
    if (nonHdlMmol !== null) {
      details.push(
        `Non-HDL-C ước tính: ${nonHdlMmol} mmol/L (mục tiêu < ${nonHdlTarget} mmol/L) phản ánh tổng lượng cholesterol gây xơ vữa.`
      );
    }
    if (tgMmol !== null && hdlMmol !== null && hdlMmol > 0) {
      const tgHdlRatio = Number((tgMmol / hdlMmol).toFixed(2));
      if (tgHdlRatio > 1.7) {
        details.push(
          `Tỷ số Triglyceride/HDL-C = ${tgHdlRatio} (> 1.7), gợi ý xu hướng rối loạn chuyển hóa mỡ hoặc đề kháng insulin nhẹ.`
        );
      }
    }

    if (previousLab) {
      if (ldlMmol !== null && hasNum(previousLab.ldlC)) {
        const prevLdl = Number(toLipidMmol(previousLab.ldlC, previousLab.lipidUnit, 'chol').toFixed(2));
        const txt = formatTrendDiff('LDL-C', Number(ldlMmol.toFixed(2)), prevLdl, 'mmol/L');
        if (txt) {
          details.push(txt);
          trendComparisons.push(txt);
        }
      }
      if (tgMmol !== null && hasNum(previousLab.triglyceride)) {
        const prevTg = Number(toLipidMmol(previousLab.triglyceride, previousLab.lipidUnit, 'tg').toFixed(2));
        const txt = formatTrendDiff('Triglyceride', Number(tgMmol.toFixed(2)), prevTg, 'mmol/L');
        if (txt) {
          details.push(txt);
          trendComparisons.push(txt);
        }
      }
    }

    let status: ClinicalClusterStatus = 'optimal';
    let headline = 'Bộ mỡ máu đạt ngưỡng an toàn bảo vệ tim mạch.';
    if (lipidMissing.length > 0 && !ldlHigh && !tgHigh && !hdlLow) {
      status = 'insufficient';
      headline = 'Các chỉ số mỡ máu hiện có đang bình thường, nhưng chưa đủ bộ 4 chỉ số để kết luận toàn diện.';
    } else if (ldlVeryHigh || tgVeryHigh || (ldlHigh && nonHdlHigh)) {
      status = 'warning';
      headline = ldlVeryHigh
        ? `LDL-C tăng rõ (${ldlMmol?.toFixed(2)} mmol/L) làm tăng nguy cơ xơ vữa mạch máu.`
        : `Triglyceride tăng (${tgMmol?.toFixed(2)} mmol/L) và rối loạn chuyển hóa lipid cần điều chỉnh chế độ ăn / trao đổi Bác sĩ.`;
    } else if (ldlHigh || hdlLow || tgHigh) {
      status = 'attention';
      if (!ldlHigh && (hdlLow || tgHigh)) {
        headline =
          `Cholesterol TP & LDL-C đạt chuẩn, nhưng ${hdlLow ? `HDL-C (mỡ tốt) thấp (${hdlMmol?.toFixed(2)} < ${hdlFloor} mmol/L)` : ''}${hdlLow && tgHigh ? ' kèm ' : ''}${tgHigh ? `Triglyceride chạm/vượt ngưỡng (${tgMmol?.toFixed(2)} mmol/L)` : ''}.`;
        details.push(
          'Ưu tiên vận động nhịp tim đều (đi bộ nhanh, đạp xe), giảm tinh bột đường ngọt và bổ sung chất béo không bão hòa (cá biển, dầu thực vật).'
        );
      } else {
        headline = `LDL-C (${ldlMmol?.toFixed(2)} mmol/L) còn cao hơn ngưỡng mục tiêu (< ${ldlTarget} mmol/L).`;
      }
    }

    const missingHint =
      lipidMissing.length > 0
        ? `Thiếu ${lipidMissing.join(', ')} để phân loại đủ bộ mỡ máu và tính Non-HDL-C.`
        : undefined;
    if (missingHint) missingPairs.push(missingHint);

    clusters.push({
      id: 'lipid',
      title: 'Mỡ máu & Nguy cơ Tim mạch',
      icon: '❤️',
      guidelineRef: 'ESC/EAS · ATP III',
      status,
      hasCompleteData: lipidMissing.length === 0,
      headline,
      details,
      missingHint,
    });
  }

  // ---------------------------------------------------
  // 2. CỤM ĐƯỜNG HUYẾT & CHUYỂN HÓA (ADA)
  // ---------------------------------------------------
  const hasGlu = hasNum(entry.glucose);
  const hasHba1c = hasNum(entry.hba1c);
  if (hasGlu || hasHba1c) {
    const gluMmol = hasGlu ? toGlucoseMmol(entry.glucose!, entry.glucoseUnit) : null;
    const hba1cVal = hasHba1c ? entry.hba1c! : null;
    const details: string[] = [];
    let status: ClinicalClusterStatus = 'normal';
    let headline = 'Đường huyết nằm trong ngưỡng bình thường.';
    let missingHint: string | undefined;

    if (gluMmol !== null && hba1cVal !== null) {
      const gluNormal = gluMmol >= 3.9 && gluMmol <= 5.6;
      const a1cNormal = hba1cVal < 5.7;
      const diabetesRange = gluMmol >= 7.0 || hba1cVal >= 6.5;

      if (diabetesRange) {
        status = 'warning';
        headline = 'Đường huyết chạm ngưỡng đái tháo đường, cần Bác sĩ đánh giá và theo dõi chuyên khoa.';
      } else if (!gluNormal || !a1cNormal) {
        status = 'attention';
        if (gluMmol > 5.6 && a1cNormal) {
          headline = `Glucose lúc lấy máu hơi cao (${gluMmol.toFixed(1)} mmol/L) nhưng HbA1c bình thường (${hba1cVal}% < 5.7%).`;
          details.push(
            'HbA1c cho thấy đường huyết trung bình 3 tháng qua vẫn ổn định; lưu ý đảm bảo nhịn ăn đủ ≥ 8 giờ trước khi đo Glucose đói.'
          );
        } else {
          headline = 'Chỉ số nằm ở ngưỡng tiền tiểu đường / rối loạn dung nạp đường.';
          details.push('Khuyến nghị giảm đồ ngọt, tinh bột tinh chế và tăng vận động sau ăn.');
        }
      } else {
        status = 'optimal';
        headline = `Cả Glucose đói (${gluMmol.toFixed(1)} mmol/L) và HbA1c (${hba1cVal}%) đều đạt chuẩn tốt.`;
      }
    } else if (gluMmol !== null) {
      missingHint =
        gluMmol > 5.6
          ? `Chỉ mới có Glucose (${gluMmol.toFixed(1)} mmol/L), thiếu HbA1c để xác định đường huyết trung bình 3 tháng.`
          : 'Chưa có HbA1c kèm theo (nên làm định kỳ 6-12 tháng nếu có nguy cơ chuyển hóa).';
      if (gluMmol > 5.6) missingPairs.push(missingHint);

      if (gluMmol >= 7.0) {
        status = 'warning';
        headline = `Glucose đơn lẻ cao (${gluMmol.toFixed(1)} mmol/L) - cần làm thêm HbA1c và xét nghiệm lặp lại lúc đói.`;
      } else if (gluMmol > 5.6) {
        status = 'attention';
        headline = `Glucose lúc đo hơi cao (${gluMmol.toFixed(1)} mmol/L), chưa đủ HbA1c để kết luận tiền tiểu đường.`;
        details.push('Lưu ý Glucose máu chỉ chuẩn xác khi đã nhịn ăn hoàn toàn ≥ 8 giờ (chỉ uống nước lọc).');
      } else if (gluMmol < 3.9) {
        status = 'warning';
        headline = `Glucose máu thấp (${gluMmol.toFixed(1)} mmol/L < 3.9), lưu ý nguy cơ hạ đường huyết.`;
      } else {
        status = 'normal';
        headline = `Glucose máu lúc đo ổn định (${gluMmol.toFixed(1)} mmol/L).`;
      }
    } else if (hba1cVal !== null) {
      missingHint = 'Thiếu Glucose máu đói để đối chiếu cùng thời điểm lấy máu.';
      if (hba1cVal >= 6.5) {
        status = 'warning';
        headline = `HbA1c đạt ${hba1cVal}% (≥ 6.5%), cần Bác sĩ đánh giá phác đồ kiểm soát đường huyết.`;
      } else if (hba1cVal >= 5.7) {
        status = 'attention';
        headline = `HbA1c ở vùng tiền tiểu đường (${hba1cVal}%, chuẩn < 5.7%).`;
      } else {
        status = 'optimal';
        headline = `HbA1c 3 tháng đạt chuẩn tốt (${hba1cVal}% < 5.7%).`;
      }
    }

    clusters.push({
      id: 'glycemic',
      title: 'Đường huyết & Chuyển hóa',
      icon: '🩸',
      guidelineRef: 'ADA',
      status,
      hasCompleteData: hasGlu && hasHba1c,
      headline,
      details,
      missingHint,
    });
  }

  // ---------------------------------------------------
  // 3. CỤM GAN - MẬT & SIÊU ÂM BỤNG (ACG / AASLD)
  // ---------------------------------------------------
  const hasAst = hasNum(entry.ast);
  const hasAlt = hasNum(entry.alt);
  const hasGgt = hasNum(entry.ggt);
  const hasBili = hasNum(entry.bilirubinTotal) || hasNum(entry.bilirubinDirect);
  const hasPolyp = hasNum(entry.gallbladderPolypMm);
  const hasLiverUs = Boolean(entry.liverUltrasound?.trim());

  if (hasAst || hasAlt || hasGgt || hasBili || hasPolyp || hasLiverUs) {
    const ggtUpper = gender === 'female' ? 40 : 60;
    const astHigh = hasAst && entry.ast! > 40;
    const altHigh = hasAlt && entry.alt! > 40;
    const ggtHigh = hasGgt && entry.ggt! > ggtUpper;
    const biliHigh =
      (hasNum(entry.bilirubinTotal) && entry.bilirubinTotal! > 21) ||
      (hasNum(entry.bilirubinDirect) && entry.bilirubinDirect! > 5.1);

    const details: string[] = [];
    const liverMissing: string[] = [];
    if (!hasAst) liverMissing.push('AST');
    if (!hasAlt) liverMissing.push('ALT');
    if (!hasGgt) liverMissing.push('GGT');

    let status: ClinicalClusterStatus = 'normal';
    let headline = 'Các chỉ số men gan và đường mật ghi nhận ở mức ổn định.';

    if (
      (hasAst && entry.ast! > 80) ||
      (hasAlt && entry.alt! > 80) ||
      (hasGgt && entry.ggt! > ggtUpper * 2) ||
      (hasPolyp && entry.gallbladderPolypMm! >= 10)
    ) {
      status = 'warning';
      headline = 'Có chỉ số Gan - Mật tăng đáng kể hoặc Polyp chạm ngưỡng cần Bác sĩ chuyên khoa đánh giá.';
    } else if (astHigh || altHigh || ggtHigh || biliHigh || (hasPolyp && entry.gallbladderPolypMm! >= 6)) {
      status = 'attention';
      if (altHigh && (!hasAst || entry.alt! >= entry.ast!)) {
        headline = `Men gan ALT tăng (${entry.alt} U/L > 40), gợi ý tế bào gan đang chịu tải.`;
      } else if (ggtHigh) {
        headline = `Men gan GGT tăng (${entry.ggt} U/L > ${ggtUpper}), nhạy cảm với rượu bia, thuốc chuyển hóa qua gan hoặc ứ mật.`;
      } else if (astHigh && !altHigh) {
        headline = `AST tăng nhẹ đơn độc (${entry.ast} U/L) trong khi ALT bình thường.`;
        details.push('Nếu vừa tập thể thao nặng (Tennis, đạp xe, chạy bộ) trước khi xét nghiệm, AST có thể tăng thoáng qua từ cơ.');
      } else {
        headline = 'Một số chỉ số Gan - Mật cần theo dõi định kỳ.';
      }
    } else if (hasAst && hasAlt) {
      status = 'optimal';
      headline = `Bộ men gan AST/ALT (${entry.ast}/${entry.alt} U/L) trong ngưỡng an toàn.`;
    }

    if (hasLiverUs) {
      details.push(`Siêu âm gan: ${entry.liverUltrasound}.`);
    }
    if (hasPolyp) {
      const mm = entry.gallbladderPolypMm!;
      const prevMm = previousLab && hasNum(previousLab.gallbladderPolypMm) ? previousLab.gallbladderPolypMm : null;
      const diffMm = prevMm !== null ? Number((mm - prevMm).toFixed(1)) : null;
      if (mm >= 10) {
        details.push(`Polyp túi mật ${mm} mm (≥ 10 mm): Cần hội chẩn Ngoại tiêu hóa.`);
      } else if (mm >= 6 || (diffMm !== null && diffMm >= 2)) {
        details.push(`Polyp túi mật ${mm} mm${diffMm ? ` (+${diffMm} mm)` : ''}: Cần siêu âm theo dõi sát mỗi 3-6 tháng.`);
      } else {
        details.push(`Polyp túi mật ${mm} mm (< 6 mm): Kích thước nhỏ, theo dõi định kỳ 6-12 tháng.`);
      }
    }

    if (previousLab && hasAlt && hasNum(previousLab.alt)) {
      const txt = formatTrendDiff('Men gan ALT', entry.alt!, previousLab.alt, 'U/L', 1);
      if (txt) {
        details.push(txt);
        trendComparisons.push(txt);
      }
    }

    const missingHint =
      liverMissing.length > 0 && !(hasAst && hasAlt)
        ? `Thiếu ${liverMissing.join(', ')} để đánh giá trọn vẹn tổn thương tế bào gan và đường mật.`
        : undefined;
    if (missingHint) missingPairs.push(missingHint);

    clusters.push({
      id: 'liver',
      title: 'Gan - Mật & Tiêu hóa',
      icon: '🫀',
      guidelineRef: 'ACG / AASLD',
      status,
      hasCompleteData: hasAst && hasAlt,
      headline,
      details,
      missingHint,
    });
  }

  // ---------------------------------------------------
  // 4. CỤM THẬN & ACID URIC - SỎI / GOUT (KDIGO 2024 · ACR)
  // ---------------------------------------------------
  const hasCreat = hasNum(entry.creatinine);
  const hasEgfr = hasNum(entry.egfr);
  const hasUrea = hasNum(entry.urea);
  const hasUric = hasNum(entry.uricAcid);
  const hasKidneyUs = Boolean(entry.kidneyUltrasound?.trim());
  let computedEgfr: number | null = null;

  if (hasCreat && !hasEgfr && ageAtLab !== null && gender) {
    computedEgfr = computeCkDepi2021Egfr(entry.creatinine!, ageAtLab, gender);
  }
  const effectiveEgfr = hasEgfr ? entry.egfr! : computedEgfr;

  if (hasCreat || hasEgfr || hasUrea || hasUric || hasKidneyUs) {
    const details: string[] = [];
    const renalMissing: string[] = [];
    if (!hasCreat && !hasEgfr) renalMissing.push('Creatinine/eGFR');
    if (!hasUric) renalMissing.push('Acid Uric');

    const uricUpperStd = gender === 'female' ? 360 : 420;
    const hasStoneText = (entry.kidneyUltrasound || '').toLowerCase().includes('sỏi');
    const uricHighStd = hasUric && entry.uricAcid! > uricUpperStd;
    const uricAboveGoutTarget =
      hasUric && (profileType === 'general_health' || hasStoneText) && entry.uricAcid! > 360;

    if (computedEgfr !== null) {
      details.push(
        `eGFR ước tính theo công thức CKD-EPI (2021) với Creatinine ${entry.creatinine} µmol/L (${ageAtLab} tuổi, ${gender === 'female' ? 'Nữ' : 'Nam'}): ~${computedEgfr} mL/phút/1.73m²${computedEgfr >= 90 ? ' (G1 - bình thường)' : computedEgfr >= 60 ? ' (G2 - giảm nhẹ, ổn định nếu không có đạm niệu)' : ' (Giảm lọc cầu thận - cần theo dõi chuyên khoa Thận)'}.`
      );
    } else if (hasCreat && (!ageAtLab || !gender)) {
      renalMissing.push('Ngày sinh/Giới tính (để tự tính eGFR CKD-EPI)');
    }

    if (hasKidneyUs) {
      details.push(`Siêu âm thận / tiết niệu: ${entry.kidneyUltrasound}.`);
    }

    if (previousLab) {
      if (hasUric && hasNum(previousLab.uricAcid)) {
        const txt = formatTrendDiff('Acid Uric', entry.uricAcid!, previousLab.uricAcid, 'µmol/L', 0);
        if (txt) {
          details.push(txt);
          trendComparisons.push(txt);
        }
      }
      if (hasCreat && hasNum(previousLab.creatinine)) {
        const txt = formatTrendDiff('Creatinine', entry.creatinine!, previousLab.creatinine, 'µmol/L', 0);
        if (txt) {
          details.push(txt);
          trendComparisons.push(txt);
        }
      }
    }

    let status: ClinicalClusterStatus = 'normal';
    let headline = 'Chức năng thận và Acid Uric đang kiểm soát ổn định.';
    const egfrReduced = effectiveEgfr !== null && effectiveEgfr < 60;
    const creatHigh = hasCreat && entry.creatinine! > (gender === 'female' ? 88 : 110);

    if (egfrReduced || (hasUric && entry.uricAcid! > 480) || (uricHighStd && hasStoneText)) {
      status = 'warning';
      headline = egfrReduced
        ? `Mức lọc cầu thận giảm (${effectiveEgfr} mL/phút < 60) - cần khám Thận và thận trọng tối đa với thuốc giảm đau NSAID.`
        : `Acid Uric tăng cao (${entry.uricAcid} µmol/L) trên nền theo dõi sỏi thận / nguy cơ Gout.`;
    } else if (uricHighStd || uricAboveGoutTarget || creatHigh || (effectiveEgfr !== null && effectiveEgfr < 90)) {
      status = 'attention';
      if (uricHighStd || uricAboveGoutTarget) {
        headline = `Acid Uric (${entry.uricAcid} µmol/L) vượt ngưỡng ${uricHighStd ? `sinh lý (>${uricUpperStd})` : 'mục tiêu ngừa Gout/sỏi (<360)'}.`;
        details.push(
          'Cần uống đủ 2 - 2,5 lít nước/ngày, ăn nhạt (<5g muối), hạn chế nội tạng, nước hầm xương đặc, bia rượu và nước ngọt fructose.'
        );
      } else {
        headline = `Chức năng thận cần duy trì bù đủ nước và theo dõi Creatinine (${entry.creatinine ?? '-'} µmol/L)${effectiveEgfr ? ` · eGFR ~${effectiveEgfr} mL/phút` : ''}.`;
      }
    } else if ((hasCreat || hasEgfr) && hasUric) {
      status = 'optimal';
      headline = 'Chức năng lọc thận và nồng độ Acid Uric đều đạt ngưỡng an toàn.';
    }

    const missingHint =
      renalMissing.length > 0
        ? `Bổ sung ${renalMissing.join(', ')} để đánh giá đầy đủ trục Thận - Sỏi - Acid Uric.`
        : undefined;
    if (missingHint) missingPairs.push(missingHint);

    clusters.push({
      id: 'renal_uric',
      title: 'Thận, Tiết niệu & Acid Uric',
      icon: '🫘',
      guidelineRef: 'KDIGO 2024 · ACR/EULAR',
      status,
      hasCompleteData: Boolean((hasCreat || hasEgfr) && hasUric),
      headline,
      details,
      missingHint,
    });
  }

  // ---------------------------------------------------
  // 5. CỤM TUYẾN GIÁP (ATA)
  // ---------------------------------------------------
  const hasTsh = hasNum(entry.tsh);
  const hasFt4 = hasNum(entry.ft4);
  if (hasTsh || hasFt4 || hasNum(entry.tg) || hasNum(entry.antiTg)) {
    const isThyroidProfile =
      profileType === 'thyroid_post_op' ||
      Boolean(entry.levothyroxineDose) ||
      hasNum(entry.tg);
    const tshTarget = entry.tshTargetLevel || (isThyroidProfile ? 'moderate_risk' : 'normal');
    const details: string[] = [];
    let status: ClinicalClusterStatus = 'normal';
    let headline = 'Trục hormone tuyến giáp ổn định.';

    if (hasTsh) {
      const tshEv = evaluateTshIndicator(entry.tsh!, tshTarget);
      details.push(tshEv.clinicalNote);
      if (tshEv.status === 'critical') status = 'warning';
      else if (tshEv.status === 'high' || tshEv.status === 'low') status = 'attention';
      else if (tshEv.status === 'optimal') status = 'optimal';
    }
    if (hasFt4) {
      const ft4Ev = evaluateFt4Indicator(entry.ft4!, entry.ft4Unit, isThyroidProfile);
      details.push(ft4Ev.clinicalNote);
      if (ft4Ev.status === 'critical') status = 'warning';
      else if ((ft4Ev.status === 'high' || ft4Ev.status === 'low') && status === 'normal') {
        status = 'attention';
      }
    }
    if (status === 'attention') {
      headline = 'Chỉ số tuyến giáp chưa đạt đúng đích điều chỉnh; nên đối chiếu giờ uống Levothyroxine lúc đói và trao đổi Bác sĩ.';
    } else if (status === 'warning') {
      headline = 'TSH/FT4 lệch đáng kể khỏi đích điều trị, cần Bác sĩ Nội tiết xem xét chỉnh liều.';
    } else if (hasTsh && hasFt4) {
      headline = 'Cặp TSH và FT4 đang đạt mục tiêu ổn định.';
    }

    const missingHint =
      !hasTsh || !hasFt4
        ? `Thiếu ${!hasTsh ? 'TSH' : 'FT4'} để đánh giá trọn vẹn trục tuyến giáp.`
        : undefined;
    if (missingHint) missingPairs.push(missingHint);

    clusters.push({
      id: 'thyroid',
      title: 'Tuyến giáp & Nội tiết',
      icon: '🦋',
      guidelineRef: 'ATA',
      status,
      hasCompleteData: hasTsh && hasFt4,
      headline,
      details,
      missingHint,
    });
  }

  // ---------------------------------------------------
  // 6. CỤM CẬN GIÁP - CANXI - VITAMIN D
  // ---------------------------------------------------
  const hasCa = hasNum(entry.calcium) || hasNum(entry.ionizedCalcium);
  const hasPhos = hasNum(entry.phosphorus);
  const hasPth = hasNum(entry.pth);
  const hasVitD = hasNum(entry.vitaminD);
  if (hasCa || hasPhos || hasPth || hasVitD) {
    const corrCa = computeCorrectedCalcium(entry);
    const caP = computeCalciumPhosphorusProduct(entry);
    const details: string[] = [];
    let status: ClinicalClusterStatus = 'normal';
    let headline = 'Cân bằng Canxi và khoáng chất ổn định.';

    if (corrCa) {
      details.push(
        `Canxi hiệu chỉnh theo Albumin (${corrCa.albuminGL} g/L): ${corrCa.mmolL} mmol/L (${corrCa.mgDl} mg/dL).`
      );
      if (corrCa.mmolL < 2.15) {
        status = 'warning';
        headline = 'Canxi hiệu chỉnh thấp (< 2.15 mmol/L), có thể gây tê bì tay chân / co rút cơ.';
      }
    }
    if (caP) {
      details.push(
        `Tích số Canxi × Phospho = ${caP.productMg2Dl2} mg²/dL² (${caP.isElevated ? '≥ 55: cần tránh quá tải vôi hóa' : '< 55: an toàn'}).`
      );
      if (caP.isElevated) status = 'warning';
    }
    if (hasPth) {
      const pthPg = toPthPgMl(entry.pth!, resolvePthUnit(entry.pth!, entry.pthUnit));
      if (pthPg < 15) {
        status = status === 'warning' ? 'warning' : 'attention';
        headline = 'PTH thấp (< 15 pg/mL), gợi ý giảm hoạt động tuyến cận giáp.';
      }
    }
    if (hasVitD) {
      if (entry.vitaminD! < 20 || entry.vitaminD! > 100) {
        status = 'warning';
        details.push(
          entry.vitaminD! > 100
            ? `25-OH Vitamin D quá cao (${entry.vitaminD} ng/mL > 100), cần tạm ngưng bổ sung và hỏi Bác sĩ.`
            : `25-OH Vitamin D thiếu hụt (${entry.vitaminD} ng/mL < 20), làm giảm hấp thu Canxi.`
        );
      } else if (entry.vitaminD! < 30) {
        if (status === 'normal') status = 'attention';
        details.push(`25-OH Vitamin D hơi thiếu (${entry.vitaminD} ng/mL < 30).`);
      }
    }

    const missingCa =
      hasNum(entry.calcium) && !hasNum(entry.albumin)
        ? 'Thiếu Albumin máu để tính Canxi hiệu chỉnh chính xác.'
        : undefined;
    if (missingCa) missingPairs.push(missingCa);

    clusters.push({
      id: 'parathyroid',
      title: 'Cận giáp, Canxi & Vitamin D',
      icon: '🦴',
      guidelineRef: 'ATA · Endocrine',
      status,
      hasCompleteData: Boolean(hasCa && (!hasNum(entry.calcium) || hasNum(entry.albumin))),
      headline,
      details,
      missingHint: missingCa,
    });
  }

  // ---------------------------------------------------
  // 7. CỤM HUYẾT HỌC CƠ BẢN (WHO)
  // ---------------------------------------------------
  if (hasNum(entry.hemoglobin)) {
    const hbGdL = toHemoglobinGdL(entry.hemoglobin!);
    const hbFloor =
      profileType === 'pediatric' || (ageAtLab !== null && ageAtLab < 12)
        ? 11.5
        : gender === 'male'
          ? 13.0
          : 12.0;
    const isLow = hbGdL < hbFloor;
    const isSevere = hbGdL < 10.0;
    const unit = entry.hemoglobin! > 35 ? 'g/L' : 'g/dL';
    const floorDisplay = unit === 'g/L' ? `${Math.round(hbFloor * 10)} g/L` : `${hbFloor.toFixed(1)} g/dL`;

    clusters.push({
      id: 'hematology',
      title: 'Huyết sắc tố (Hồng cầu)',
      icon: '🔴',
      guidelineRef: 'WHO',
      status: isSevere ? 'warning' : isLow ? 'attention' : 'optimal',
      hasCompleteData: true,
      headline: isLow
        ? `Hemoglobin thấp (${entry.hemoglobin} ${unit} < ngưỡng ${floorDisplay}), gợi ý thiếu máu.`
        : `Hemoglobin đạt chuẩn tốt (${entry.hemoglobin} ${unit} ≥ ${floorDisplay}), không ghi nhận thiếu máu.`,
      details: isLow
        ? ['Cần đối chiếu thêm hồng cầu (RBC, MCV, MCH) và Ferritin để xác định nguyên nhân thiếu máu.']
        : [],
      missingHint: isLow ? 'Thiếu MCV, MCH và Ferritin để phân loại nguyên nhân thiếu máu.' : undefined,
    });
  }

  // Tổng hợp mức độ chung
  let overallLevel: ClinicalAssessmentReport['overallLevel'] = 'optimal';
  if (clusters.length === 0 && evalRes.indicators.length === 0) {
    overallLevel = 'insufficient';
  } else if (clusters.some((c) => c.status === 'warning')) {
    overallLevel = 'warning';
  } else if (clusters.some((c) => c.status === 'attention')) {
    overallLevel = 'attention';
  } else if (clusters.every((c) => c.status === 'insufficient')) {
    overallLevel = 'insufficient';
  }

  const warningCount = clusters.filter((c) => c.status === 'warning').length;
  const attentionCount = clusters.filter((c) => c.status === 'attention').length;
  let overallHeadline = 'Các cụm chỉ số đủ dữ liệu hiện nằm trong giới hạn ổn định.';
  if (overallLevel === 'insufficient') {
    overallHeadline = 'Chưa có đủ dữ liệu chỉ số xét nghiệm số học để tổng hợp tự động.';
  } else if (warningCount > 0) {
    overallHeadline = `Phát hiện ${warningCount} cụm chỉ số vượt ngưỡng cảnh báo cần Bác sĩ đánh giá${attentionCount > 0 ? ` và ${attentionCount} cụm cần điều chỉnh lối sống` : ''}.`;
  } else if (attentionCount > 0) {
    overallHeadline = `Có ${attentionCount} cụm chỉ số cần chú ý điều chỉnh lối sống / theo dõi định kỳ.`;
  }

  return {
    overallLevel,
    overallHeadline,
    assessedDate: labDate,
    ageAtLab,
    computedEgfr,
    nonHdlMmol,
    clusters,
    missingPairs: Array.from(new Set(missingPairs)),
    trendComparisons,
    disclaimer:
      'Nhận xét tự động theo ngưỡng tham chiếu y khoa chuẩn (ESC/EAS, ADA, KDIGO, ACG, ATA, WHO) chỉ mang tính tham khảo, độc lập hoàn toàn và không thay thế chẩn đoán/chỉ định của Bác sĩ.',
  };
}
