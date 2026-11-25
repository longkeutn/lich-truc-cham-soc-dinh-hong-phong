import type { HealthProfileType } from './types';
import type { LabEvalStatus, LabIndicatorEval } from './config';
import type { LatestKnownLabSnapshot } from './thyroidClinicalEval';
import {
  analyzeParathyroidClinicalPattern,
  computeCorrectedCalcium,
  computeCalciumPhosphorusProduct,
  toCalciumMmol,
  toPhosphorusMmol,
  toPthPgMl,
} from './parathyroidEval';

export type MilestoneStatus = 'optimal' | 'normal' | 'warning' | 'critical' | 'missing' | 'stale';

export interface ClinicalMilestoneItem {
  key: string;
  label: string;
  pillar: 'thyroid' | 'parathyroid' | 'metabolic';
  targetText: string;
  actualText: string;
  sourceDate?: string;
  monthsAgo?: number;
  status: MilestoneStatus;
  badgeText: string;
  note: string;
}

export interface ThyroidMilestoneAssessment {
  overallTone: 'good' | 'warn' | 'critical';
  overallBadge: string;
  overallSummary: string;
  optimalCount: number;
  warningCount: number;
  missingOrStaleCount: number;
  milestones: ClinicalMilestoneItem[];
  crossAlerts: Array<{ level: 'critical' | 'warn' | 'info'; title: string; detail: string }>;
  missingOrDueTests: string[];
}

function diffMonths(dateStr: string | undefined, todayStr: string | undefined): number | undefined {
  if (!dateStr || !todayStr) return undefined;
  const d1 = new Date(dateStr.slice(0, 10));
  const d2 = new Date(todayStr.slice(0, 10));
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return undefined;
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30.4)));
}

function mapEvalStatus(s: LabEvalStatus): MilestoneStatus {
  if (s === 'optimal') return 'optimal';
  if (s === 'normal') return 'normal';
  if (s === 'critical') return 'critical';
  return 'warning';
}

export function analyzeThyroidPostOpMilestones(params: {
  snapshot: LatestKnownLabSnapshot;
  evalResult: { indicators: LabIndicatorEval[]; overallStatus: LabEvalStatus; summaryPoints: string[] } | null;
  recentVitalsSummary: { avgSys: number; avgDia: number; avgPulse: number | null; count: number } | null;
  profileType: HealthProfileType;
  gender?: 'male' | 'female';
  todayStr?: string;
}): ThyroidMilestoneAssessment | null {
  const { snapshot, evalResult, recentVitalsSummary, profileType, gender, todayStr } = params;
  const entry = snapshot.mergedEntry;
  const hasAnyThyroidData = Boolean(
    entry &&
      (entry.tsh !== undefined ||
        entry.ft4 !== undefined ||
        entry.ft3 !== undefined ||
        entry.t3 !== undefined ||
        entry.t4 !== undefined ||
        entry.tg !== undefined ||
        entry.antiTg !== undefined ||
        entry.antiTpo !== undefined ||
        Boolean(entry.levothyroxineDose))
  );
  if (profileType !== 'thyroid_post_op' && !hasAnyThyroidData) return null;
  if (!entry && profileType !== 'thyroid_post_op') return null;

  const byKey = new Map<string, LabIndicatorEval>();
  for (const ind of evalResult?.indicators || []) {
    byKey.set(ind.key, ind);
  }

  const milestones: ClinicalMilestoneItem[] = [];
  const crossAlerts: ThyroidMilestoneAssessment['crossAlerts'] = [];
  const missingOrDueTests: string[] = [];

  const makeFromIndicator = (
    key: string,
    label: string,
    pillar: ClinicalMilestoneItem['pillar'],
    targetText: string,
    staleMonths: number,
    missingTip: string
  ): ClinicalMilestoneItem => {
    const ind = byKey.get(key);
    if (!ind) {
      missingOrDueTests.push(`${label}: ${missingTip}`);
      return {
        key,
        label,
        pillar,
        targetText,
        actualText: 'Chưa có số liệu',
        status: 'missing',
        badgeText: '⚪ Chưa có',
        note: missingTip,
      };
    }
    const srcDate = snapshot.sourceDateByKey[key] || entry?.date;
    const monthsAgo = diffMonths(srcDate, todayStr);
    const isStale = monthsAgo !== undefined && monthsAgo > staleMonths;
    if (isStale) {
      missingOrDueTests.push(`${label} (đã ${monthsAgo} tháng chưa kiểm tra lại, khuyến nghị mỗi ${staleMonths} tháng)`);
    }
    const mapped = mapEvalStatus(ind.status);
    return {
      key,
      label,
      pillar,
      targetText,
      actualText: `${ind.value} ${ind.unit}`,
      sourceDate: srcDate,
      monthsAgo,
      status: isStale && (mapped === 'optimal' || mapped === 'normal') ? 'stale' : mapped,
      badgeText: isStale ? `🕒 Quá ${staleMonths}T` : ind.badgeText,
      note: ind.clinicalNote,
    };
  };

  // Trụ cột 1: Hormone & Dấu ấn K giáp
  const tshTarget = entry?.tshTargetLevel || 'moderate_risk';
  const tshTargetLabel =
    tshTarget === 'high_risk'
      ? '< 0.10 µIU/mL'
      : tshTarget === 'low_risk'
        ? '0.50 – 2.00 µIU/mL'
        : '0.10 – 0.50 µIU/mL';

  milestones.push(
    makeFromIndicator('tsh', 'TSH (Ức chế)', 'thyroid', tshTargetLabel, 6, 'Kiểm tra mỗi 3–6 tháng để chỉnh liều Levothyroxine.'),
    makeFromIndicator('ft4', 'FT4 (Thyroxine tự do)', 'thyroid', '16.5–22.0 pmol/L (1.3–1.7 ng/dL)', 6, 'Làm cùng TSH; nhịn uống thuốc giáp sáng hôm lấy máu.'),
    makeFromIndicator('tg', 'TG (Dấu ấn tái phát)', 'thyroid', '< 0.2 ng/mL (An toàn < 1.0)', 12, 'Theo dõi định kỳ 6–12 tháng/lần sau cắt toàn bộ tuyến giáp.'),
    makeFromIndicator('antiTg', 'Anti-TG (Kháng thể TG)', 'thyroid', '< 115 IU/mL (Âm tính)', 12, 'Nên làm cùng TG để đảm bảo kết quả TG không bị nhiễu.')
  );

  // Trụ cột 2: Cận giáp - Canxi - Xương
  const corrCa = entry ? computeCorrectedCalcium(entry) : null;
  const caP = entry ? computeCalciumPhosphorusProduct(entry) : null;
  const caItem = makeFromIndicator('calcium', 'Canxi máu (TP/Hiệu chỉnh)', 'parathyroid', '2.15 – 2.55 mmol/L', 6, 'Kiểm tra mỗi 3–6 tháng (hoặc khi tê bì tay chân, chuột rút).');
  if (corrCa && Math.abs(corrCa.diffMmol) >= 0.05) {
    caItem.actualText = `${corrCa.mmolL} mmol/L (hiệu chỉnh)`;
  }
  milestones.push(caItem);

  const pItem = makeFromIndicator('phosphorus', 'Phospho máu', 'parathyroid', '0.81 – 1.45 mmol/L (Ca×P < 55)', 6, 'Làm kèm Canxi để phát hiện sớm suy cận giáp và nguy cơ vôi hóa.');
  if (caP) {
    pItem.actualText = `${pItem.actualText} · Ca×P: ${caP.productMg2Dl2}`;
    if (caP.isElevated) {
      pItem.status = 'critical';
      pItem.badgeText = '🔴 Ca×P ≥ 55';
    }
  }
  milestones.push(
    pItem,
    makeFromIndicator('pth', 'PTH (Cận giáp)', 'parathyroid', '15 – 65 pg/mL', 12, 'Đánh giá chức năng 4 tuyến cận giáp còn lại sau mổ.'),
    makeFromIndicator('albumin', 'Albumin máu', 'parathyroid', '35 – 50 g/L', 12, 'Dùng để hiệu chỉnh Canxi chính xác và đánh giá dinh dưỡng đạm.'),
    makeFromIndicator('vitaminD', '25-OH Vitamin D', 'parathyroid', '30 – 60 ng/mL (<100)', 12, 'Cần ≥ 30 ng/mL để ruột hấp thu được Canxi tối ưu.')
  );

  // Trụ cột 3: Chuyển hóa, Tim mạch & Gan Thận
  const pulse = recentVitalsSummary?.avgPulse ?? null;
  const sys = recentVitalsSummary?.avgSys ?? null;
  const dia = recentVitalsSummary?.avgDia ?? null;
  const pulseHigh = pulse !== null && pulse >= 85;
  const bpHigh = sys !== null && dia !== null && (sys >= 140 || dia >= 90);
  milestones.push({
    key: 'vitals',
    label: 'Mạch & Huyết áp tại nhà',
    pillar: 'metabolic',
    targetText: 'Mạch 60–84 bpm · HA < 140/90',
    actualText: recentVitalsSummary
      ? `HA ${sys}/${dia}${pulse ? ` · Mạch ${pulse} bpm` : ''}`
      : 'Chưa có dữ liệu đo gần đây',
    status: !recentVitalsSummary ? 'missing' : pulseHigh || bpHigh ? 'warning' : 'optimal',
    badgeText: !recentVitalsSummary
      ? '⚪ Chưa đo'
      : pulseHigh
        ? '🟡 Mạch hơi nhanh'
        : bpHigh
          ? '🟡 HA hơi cao'
          : '🟢 Ổn định',
    note: pulseHigh
      ? 'Nhịp tim nghỉ ≥85 bpm khi đang uống hormone giáp cần lưu ý nguy cơ dư liều Levothyroxine.'
      : 'Theo dõi nhịp tim nghỉ hằng ngày giúp nhận biết sớm tình trạng dư thuốc giáp.',
  });

  const creatLabel =
    gender === 'male'
      ? 'Creatinine (Thận - Nam)'
      : gender === 'female'
        ? 'Creatinine (Thận - Nữ)'
        : 'Creatinine (Chức năng thận)';
  const creatTarget = gender === 'female' ? '44 – 88 µmol/L' : '53 – 110 µmol/L';

  milestones.push(
    makeFromIndicator('ldlC', 'LDL-C (Mỡ xấu)', 'metabolic', '< 2.6 mmol/L (< 100 mg/dL)', 12, 'Xét nghiệm mỡ máu mỗi 6–12 tháng để bảo vệ mạch máu.'),
    makeFromIndicator('triglyceride', 'Triglyceride', 'metabolic', '< 1.70 mmol/L (< 150 mg/dL)', 12, 'Kiểm tra cùng bộ mỡ máu định kỳ.'),
    makeFromIndicator('glucose', 'Glucose đói', 'metabolic', '3.9 – 5.6 mmol/L', 12, 'Tầm soát đường huyết định kỳ mỗi 6–12 tháng.'),
    makeFromIndicator('hba1c', 'HbA1c (TB 3 tháng)', 'metabolic', '< 5.7%', 12, 'Đánh giá đường huyết trung bình 3 tháng.'),
    makeFromIndicator('creatinine', creatLabel, 'metabolic', creatTarget, 12, 'Theo dõi chức năng lọc cầu thận định kỳ.')
  );

  // Phân tích chéo lâm sàng thực tế (Cross-Signals)
  const ft4Ind = byKey.get('ft4');
  const ft4Pmol = ft4Ind
    ? ft4Ind.unit === 'ng/dL'
      ? Number(ft4Ind.value) * 12.87
      : Number(ft4Ind.value)
    : undefined;
  const tshVal = entry?.tsh;
  const symptomText = `${entry?.symptoms || ''}`.toLowerCase();
  const hasHyperSymptoms =
    symptomText.includes('tim đập nhanh') ||
    symptomText.includes('hồi hộp') ||
    symptomText.includes('mệt') ||
    symptomText.includes('run tay');

  if ((ft4Pmol !== undefined && ft4Pmol > 22.0) || (tshVal !== undefined && tshVal < 0.05)) {
    if (pulseHigh || hasHyperSymptoms) {
      crossAlerts.push({
        level: 'critical',
        title: 'Dấu hiệu quá liều Levothyroxine tương đối (FT4 cao / TSH sâu + Tim nhanh)',
        detail: `FT4 (${ft4Ind?.value ?? '--'} ${ft4Ind?.unit ?? ''}) hoặc TSH (${tshVal ?? '--'}) đang nghiêng hướng dư hormone, kết hợp với ${pulseHigh ? `mạch trung bình ${pulse} bpm` : `triệu chứng "${entry?.symptoms}"`}. Gia đình nên mang kết quả hỏi Bác sĩ xem xét chỉnh nhẹ liều và làm siêu âm tim / đo mật độ xương DEXA.`,
      });
    } else {
      crossAlerts.push({
        level: 'warn',
        title: 'FT4 vượt ngưỡng trên hoặc TSH ức chế sâu',
        detail:
          'Nếu sáng hôm lấy máu có lỡ uống viên Levothyroxine trước khi rút máu thì FT4 sẽ tăng giả. Lần sau cần nhịn thuốc đến sau khi lấy máu mới uống.',
      });
    }
  }

  const tshUpperTarget =
    tshTarget === 'high_risk'
      ? 0.1
      : tshTarget === 'moderate_risk'
        ? 0.5
        : tshTarget === 'low_risk'
          ? 2.0
          : 4.0;
  if (tshVal !== undefined && tshVal > tshUpperTarget) {
    crossAlerts.push({
      level: 'warn',
      title: 'TSH chưa đạt ngưỡng ức chế mục tiêu',
      detail:
        'Kiểm tra lại thói quen uống thuốc: uống Levothyroxine ngay lúc bụng đói với nước lọc (trước ăn 30–60 phút), cách viên Canxi / Sắt / Magie / thuốc dạ dày tối thiểu 4 tiếng và ngưng Biotin 3–5 ngày trước khi xét nghiệm.',
    });
  }

  if (ft4Pmol !== undefined && ft4Pmol > 22.0 && tshVal !== undefined && tshVal > 0.5) {
    crossAlerts.push({
      level: 'info',
      title: 'TSH và FT4 lệch pha (cùng cao)',
      detail:
        'Thường gặp khi người bệnh uống bù liều sát ngày xét nghiệm, uống thuốc ngay trước giờ lấy máu hoặc dùng thực phẩm chức năng chứa Biotin.',
    });
  }

  const paraSynthesis = entry ? analyzeParathyroidClinicalPattern(entry, profileType) : null;
  if (paraSynthesis && (paraSynthesis.badgeText.includes('🔴') || paraSynthesis.badgeText.includes('🟡'))) {
    crossAlerts.push({
      level: paraSynthesis.badgeText.includes('🔴') ? 'critical' : 'warn',
      title: paraSynthesis.patternTitle,
      detail: paraSynthesis.findings[0] || 'Cần theo dõi thêm bộ Canxi - Cận giáp.',
    });
  }

  if (entry) {
    const caMmol = entry.calcium !== undefined ? toCalciumMmol(entry.calcium, entry.calciumUnit) : undefined;
    const pMmol = entry.phosphorus !== undefined ? toPhosphorusMmol(entry.phosphorus, entry.phosphorusUnit) : undefined;
    const pthPg = entry.pth !== undefined ? toPthPgMl(entry.pth, entry.pthUnit) : undefined;
    if (caMmol !== undefined && (pMmol === undefined || pthPg === undefined)) {
      missingOrDueTests.push('Khi xét nghiệm Canxi lần tới nên làm kèm Phospho và PTH để đánh giá trọn vẹn tuyến cận giáp.');
    }
  }

  missingOrDueTests.push('Kiểm tra định kỳ không có trên phiếu máu: Siêu âm vùng cổ (6–12 tháng/lần) và Đo mật độ xương DEXA (1–2 năm/lần).');

  const optimalCount = milestones.filter((m) => m.status === 'optimal' || m.status === 'normal').length;
  const warningCount = milestones.filter((m) => m.status === 'warning' || m.status === 'critical').length;
  const missingOrStaleCount = milestones.filter((m) => m.status === 'missing' || m.status === 'stale').length;

  const hasCritical = milestones.some((m) => m.status === 'critical') || crossAlerts.some((a) => a.level === 'critical');
  const overallTone = hasCritical ? 'critical' : warningCount > 0 || crossAlerts.length > 0 ? 'warn' : 'good';
  const overallBadge =
    overallTone === 'critical'
      ? '🔴 Có mốc cần lưu ý ngay'
      : overallTone === 'warn'
        ? '🟡 Có chỉ số cần theo dõi'
        : '🟢 Các mốc đã đo đang ổn định';
  const overallSummary = `Đạt chuẩn ${optimalCount}/${milestones.length} mốc • Cần lưu ý ${warningCount} mốc • Chưa có/quá hạn ${missingOrStaleCount} mốc`;

  return {
    overallTone,
    overallBadge,
    overallSummary,
    optimalCount,
    warningCount,
    missingOrStaleCount,
    milestones,
    crossAlerts,
    missingOrDueTests,
  };
}
