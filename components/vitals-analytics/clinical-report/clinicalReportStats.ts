import type { VitalsLogEntry, BpThresholds, TimeSlot } from '@/lib/types';
import {
  getVietnamDateStr,
  getVietnamDateOffsetStr,
  compareVitalsAsc,
  classifyClinicalBp,
  classifyClinicalPulse,
  isBpInTargetRange,
} from '@/lib/config';

import {
  type ClinicalFindingItem,
  computeClinicalFindings,
} from './clinicalFindingsEngine';

export { classifyClinicalBp, classifyClinicalPulse, type ClinicalFindingItem, computeClinicalFindings };

const ALL_SLOTS: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];

export interface TimeframeMetrics {
  id: string;
  label: string;
  subLabel: string;
  count: number;
  daysCount: number;
  avgSys: number | null;
  avgDia: number | null;
  minSys: number | null;
  maxSys: number | null;
  minDia: number | null;
  maxDia: number | null;
  sdSys: number | null;
  sdDia: number | null;
  cvSys: number | null;
  arvSys: number | null;
  avgPP: number | null;
  avgMAP: number | null;
  avgPulse: number | null;
  minPulse: number | null;
  maxPulse: number | null;
  sdPulse: number | null;
  avgRPP: number | null;
  tirPct: number | null;
  slowPulseCount: number;
  verySlowPulseCount: number;
  fastPulseCount: number;
  highBpCount: number;
  lowBpCount: number;
  deltaSysVsPrev: number | null;
  deltaDiaVsPrev: number | null;
  deltaPulseVsPrev: number | null;
}

export interface CircadianSlotStat {
  label: string;
  count: number;
  avgSys: number | null;
  avgDia: number | null;
  avgPulse: number | null;
}

export interface CircadianAnalysisResult {
  slotStats: Record<TimeSlot, CircadianSlotStat>;
  morningEveningDiff: number | null;
  circadianPattern: {
    type: 'morning_surge' | 'evening_riser' | 'balanced' | 'unknown';
    title: string;
    explanation: string;
  };
  lowestPulseSlot: ({ slot: TimeSlot } & CircadianSlotStat) | null;
}

export interface DistributionStatsResult {
  total: number;
  bpZones: {
    low: number;
    optimal: number;
    normal_high: number;
    stage1: number;
    stage2: number;
  };
  totalPulseCount: number;
  hrZones: {
    very_slow: number;
    slow: number;
    optimal: number;
    normal_high: number;
    fast: number;
  };
}


function calcStdDev(values: number[]): number | null {
  if (values.length < 2) return values.length === 1 ? 0 : null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

function calcARV(valuesAsc: number[]): number | null {
  if (valuesAsc.length < 2) return null;
  let sumDiff = 0;
  for (let i = 1; i < valuesAsc.length; i++) {
    sumDiff += Math.abs(valuesAsc[i] - valuesAsc[i - 1]);
  }
  return Math.round((sumDiff / (valuesAsc.length - 1)) * 10) / 10;
}

export function computeMetricsForEntries(
  id: string,
  label: string,
  subLabel: string,
  entries: VitalsLogEntry[],
  prevEntries: VitalsLogEntry[],
  thresholds: BpThresholds
): TimeframeMetrics {
  const sortedAsc = [...entries].sort(compareVitalsAsc);
  const count = sortedAsc.length;
  const uniqueDays = new Set(sortedAsc.map((e) => e.date)).size;

  if (count === 0) {
    return {
      id,
      label,
      subLabel,
      count: 0,
      daysCount: 0,
      avgSys: null,
      avgDia: null,
      minSys: null,
      maxSys: null,
      minDia: null,
      maxDia: null,
      sdSys: null,
      sdDia: null,
      cvSys: null,
      arvSys: null,
      avgPP: null,
      avgMAP: null,
      avgPulse: null,
      minPulse: null,
      maxPulse: null,
      sdPulse: null,
      avgRPP: null,
      tirPct: null,
      slowPulseCount: 0,
      verySlowPulseCount: 0,
      fastPulseCount: 0,
      highBpCount: 0,
      lowBpCount: 0,
      deltaSysVsPrev: null,
      deltaDiaVsPrev: null,
      deltaPulseVsPrev: null,
    };
  }

  const sysList = sortedAsc.map((e) => e.sys);
  const diaList = sortedAsc.map((e) => e.dia);
  const ppList = sortedAsc.map((e) => e.sys - e.dia);
  const mapList = sortedAsc.map((e) => e.dia + (e.sys - e.dia) / 3);

  const avgSys = Math.round(sysList.reduce((s, v) => s + v, 0) / count);
  const avgDia = Math.round(diaList.reduce((s, v) => s + v, 0) / count);
  const minSys = Math.min(...sysList);
  const maxSys = Math.max(...sysList);
  const minDia = Math.min(...diaList);
  const maxDia = Math.max(...diaList);

  const sdSys = calcStdDev(sysList);
  const sdDia = calcStdDev(diaList);
  const cvSys = sdSys !== null && avgSys > 0 ? Math.round((sdSys / avgSys) * 1000) / 10 : null;
  const arvSys = calcARV(sysList);

  const avgPP = Math.round(ppList.reduce((s, v) => s + v, 0) / count);
  const avgMAP = Math.round(mapList.reduce((s, v) => s + v, 0) / count);

  const pulseEntries = sortedAsc.filter((e) => e.pulse && e.pulse > 0);
  const pulseList = pulseEntries.map((e) => e.pulse as number);
  const avgPulse =
    pulseList.length > 0
      ? Math.round(pulseList.reduce((s, v) => s + v, 0) / pulseList.length)
      : null;
  const minPulse = pulseList.length > 0 ? Math.min(...pulseList) : null;
  const maxPulse = pulseList.length > 0 ? Math.max(...pulseList) : null;
  const sdPulse = pulseList.length >= 2 ? calcStdDev(pulseList) : null;

  const rppList = pulseEntries.map((e) => e.sys * (e.pulse as number));
  const avgRPP =
    rppList.length > 0
      ? Math.round(rppList.reduce((s, v) => s + v, 0) / rppList.length)
      : null;

  let inTargetCount = 0;
  let highBpCount = 0;
  let lowBpCount = 0;
  for (const e of sortedAsc) {
    const bpCls = classifyClinicalBp(e.sys, e.dia, thresholds);
    if (bpCls.category === 'stage1' || bpCls.category === 'stage2') highBpCount++;
    else if (bpCls.category === 'low') lowBpCount++;
    else if (isBpInTargetRange(e.sys, e.dia, thresholds)) inTargetCount++;
  }
  const tirPct = Math.round((inTargetCount / count) * 100);

  const slowPulseCount = pulseList.filter((p) => p < 60).length;
  const verySlowPulseCount = pulseList.filter((p) => p < 50).length;
  const fastPulseCount = pulseList.filter((p) => p >= 100).length;

  let deltaSysVsPrev: number | null = null;
  let deltaDiaVsPrev: number | null = null;
  let deltaPulseVsPrev: number | null = null;

  if (prevEntries.length > 0) {
    const prevAvgSys = Math.round(
      prevEntries.reduce((s, e) => s + e.sys, 0) / prevEntries.length
    );
    const prevAvgDia = Math.round(
      prevEntries.reduce((s, e) => s + e.dia, 0) / prevEntries.length
    );
    deltaSysVsPrev = avgSys - prevAvgSys;
    deltaDiaVsPrev = avgDia - prevAvgDia;

    const prevPal = prevEntries.filter((e) => e.pulse && e.pulse > 0);
    if (prevPal.length > 0 && avgPulse !== null) {
      const prevAvgPulse = Math.round(
        prevPal.reduce((s, e) => s + (e.pulse as number), 0) / prevPal.length
      );
      deltaPulseVsPrev = avgPulse - prevAvgPulse;
    }
  }

  return {
    id,
    label,
    subLabel,
    count,
    daysCount: uniqueDays,
    avgSys,
    avgDia,
    minSys,
    maxSys,
    minDia,
    maxDia,
    sdSys,
    sdDia,
    cvSys,
    arvSys,
    avgPP,
    avgMAP,
    avgPulse,
    minPulse,
    maxPulse,
    sdPulse,
    avgRPP,
    tirPct,
    slowPulseCount,
    verySlowPulseCount,
    fastPulseCount,
    highBpCount,
    lowBpCount,
    deltaSysVsPrev,
    deltaDiaVsPrev,
    deltaPulseVsPrev,
  };
}

export function computeMilestones(
  cleanedVitals: VitalsLogEntry[],
  bpThresholds: BpThresholds
): TimeframeMetrics[] {
  const todayStr = getVietnamDateStr();
  const yesterdayStr = getVietnamDateOffsetStr(-1);
  const dayMinus2 = getVietnamDateOffsetStr(-2);
  const dayMinus5 = getVietnamDateOffsetStr(-5);
  const dayMinus6 = getVietnamDateOffsetStr(-6);
  const dayMinus13 = getVietnamDateOffsetStr(-13);
  const dayMinus27 = getVietnamDateOffsetStr(-27);
  const dayMinus29 = getVietnamDateOffsetStr(-29);

  const todayEntries = cleanedVitals.filter((v) => v.date === todayStr);
  const yesterdayEntries = cleanedVitals.filter((v) => v.date === yesterdayStr);
  const twoDaysAgoEntries = cleanedVitals.filter((v) => v.date === dayMinus2);
  const last3dEntries = cleanedVitals.filter((v) => v.date >= dayMinus2 && v.date <= todayStr);
  const prev3dEntries = cleanedVitals.filter((v) => v.date >= dayMinus5 && v.date < dayMinus2);
  const last7dEntries = cleanedVitals.filter((v) => v.date >= dayMinus6 && v.date <= todayStr);
  const prev7dEntries = cleanedVitals.filter((v) => v.date >= dayMinus13 && v.date < dayMinus6);
  const last14dEntries = cleanedVitals.filter((v) => v.date >= dayMinus13 && v.date <= todayStr);
  const prev14dEntries = cleanedVitals.filter((v) => v.date >= dayMinus27 && v.date < dayMinus13);
  const last30dEntries = cleanedVitals.filter((v) => v.date >= dayMinus29 && v.date <= todayStr);

  return [
    computeMetricsForEntries('today', 'Hôm nay', 'Trong ngày hôm nay', todayEntries, yesterdayEntries, bpThresholds),
    computeMetricsForEntries('yesterday', 'Hôm qua', 'So với hôm kia', yesterdayEntries, twoDaysAgoEntries, bpThresholds),
    computeMetricsForEntries('3d', '3 ngày qua', 'So với 3 ngày trước', last3dEntries, prev3dEntries, bpThresholds),
    computeMetricsForEntries('7d', '7 ngày qua', 'So với tuần trước', last7dEntries, prev7dEntries, bpThresholds),
    computeMetricsForEntries('14d', '14 ngày qua', '2 tuần gần nhất', last14dEntries, prev14dEntries, bpThresholds),
    computeMetricsForEntries('30d', '30 ngày qua', '1 tháng gần nhất', last30dEntries.length > 0 ? last30dEntries : cleanedVitals, [], bpThresholds),
    computeMetricsForEntries('all', 'Tất cả lịch sử', 'Toàn bộ các lần đo', cleanedVitals, [], bpThresholds),
  ];
}

export function getActiveEntriesForMilestone(
  cleanedVitals: VitalsLogEntry[],
  milestoneId: string
): VitalsLogEntry[] {
  const todayStr = getVietnamDateStr();
  const yesterdayStr = getVietnamDateOffsetStr(-1);
  switch (milestoneId) {
    case 'today':
      return cleanedVitals.filter((v) => v.date === todayStr);
    case 'yesterday':
      return cleanedVitals.filter((v) => v.date === yesterdayStr);
    case '3d':
      return cleanedVitals.filter((v) => v.date >= getVietnamDateOffsetStr(-2));
    case '7d':
      return cleanedVitals.filter((v) => v.date >= getVietnamDateOffsetStr(-6));
    case '14d':
      return cleanedVitals.filter((v) => v.date >= getVietnamDateOffsetStr(-13));
    case '30d':
      return cleanedVitals.filter((v) => v.date >= getVietnamDateOffsetStr(-29));
    default:
      return cleanedVitals;
  }
}

export function computeCircadianAnalysis(
  activeEntries: VitalsLogEntry[],
  subjectLabel: string
): CircadianAnalysisResult {
  const slotStats: Record<TimeSlot, CircadianSlotStat> = {
    morning: { label: 'Sáng', count: 0, avgSys: null, avgDia: null, avgPulse: null },
    noon: { label: 'Trưa', count: 0, avgSys: null, avgDia: null, avgPulse: null },
    afternoon: { label: 'Chiều', count: 0, avgSys: null, avgDia: null, avgPulse: null },
    evening: { label: 'Tối', count: 0, avgSys: null, avgDia: null, avgPulse: null },
  };

  for (const sl of ALL_SLOTS) {
    const items = activeEntries.filter((v) => v.period === sl);
    if (items.length === 0) continue;
    const n = items.length;
    const avgSys = Math.round(items.reduce((s, x) => s + x.sys, 0) / n);
    const avgDia = Math.round(items.reduce((s, x) => s + x.dia, 0) / n);
    const pItems = items.filter((x) => x.pulse && x.pulse > 0);
    const avgPulse =
      pItems.length > 0
        ? Math.round(pItems.reduce((s, x) => s + (x.pulse as number), 0) / pItems.length)
        : null;

    slotStats[sl] = { ...slotStats[sl], count: n, avgSys, avgDia, avgPulse };
  }

  const mSys = slotStats.morning.avgSys;
  const eSys = slotStats.evening.avgSys;
  const morningEveningDiff = mSys !== null && eSys !== null ? mSys - eSys : null;

  let circadianPattern: CircadianAnalysisResult['circadianPattern'] = {
    type: 'unknown',
    title: 'Chưa đủ số đo cả buổi Sáng và Tối để so sánh',
    explanation: 'Nên đo đều vào buổi Sáng và buổi Tối để biết thời điểm nào huyết áp hay tăng.',
  };

  if (morningEveningDiff !== null) {
    if (morningEveningDiff >= 12) {
      circadianPattern = {
        type: 'morning_surge',
        title: `Buổi Sáng thường cao hơn buổi Tối (+${morningEveningDiff} mmHg)`,
        explanation: `Trung bình buổi Sáng là ${mSys}/${slotStats.morning.avgDia} mmHg, cao hơn buổi Tối (${eSys}/${slotStats.evening.avgDia} mmHg). Nên đo huyết áp ngay khi thức dậy trước khi uống thuốc sáng và cho ${subjectLabel} ngồi dậy từ từ.`,
      };
    } else if (morningEveningDiff <= -10) {
      circadianPattern = {
        type: 'evening_riser',
        title: `Buổi Tối thường cao hơn buổi Sáng (+${Math.abs(morningEveningDiff)} mmHg)`,
        explanation: `Trung bình buổi Tối là ${eSys}/${slotStats.evening.avgDia} mmHg, cao hơn buổi Sáng (${mSys}/${slotStats.morning.avgDia} mmHg). Cần chú ý uống đúng giờ cữ thuốc chiều/tối, ăn nhạt bữa tối và nghỉ ngơi sớm.`,
      };
    } else {
      circadianPattern = {
        type: 'balanced',
        title: `Huyết áp Sáng và Tối cân bằng nhau (Chênh ${
          morningEveningDiff >= 0 ? `+${morningEveningDiff}` : morningEveningDiff
        } mmHg)`,
        explanation: `Buổi Sáng (TB ${mSys}/${slotStats.morning.avgDia} mmHg) và buổi Tối (TB ${eSys}/${slotStats.evening.avgDia} mmHg) chênh nhau rất ít, cho thấy thuốc đang giữ huyết áp ổn định suốt cả ngày.`,
      };
    }
  }

  const activeSlots = ALL_SLOTS.map((s) => ({ slot: s, ...slotStats[s] })).filter((s) => s.count > 0);
  const lowestPulseSlot =
    activeSlots.filter((s) => s.avgPulse !== null).length > 0
      ? [...activeSlots.filter((s) => s.avgPulse !== null)].sort(
          (a, b) => (a.avgPulse || 999) - (b.avgPulse || 999)
        )[0]
      : null;

  return { slotStats, morningEveningDiff, circadianPattern, lowestPulseSlot };
}

export function computeDistributionStats(
  activeEntries: VitalsLogEntry[],
  bpThresholds: BpThresholds
): DistributionStatsResult {
  const total = activeEntries.length;
  const bpZones = { low: 0, optimal: 0, normal_high: 0, stage1: 0, stage2: 0 };
  const hrZones = { very_slow: 0, slow: 0, optimal: 0, normal_high: 0, fast: 0 };
  let totalPulseCount = 0;

  for (const e of activeEntries) {
    const cls = classifyClinicalBp(e.sys, e.dia, bpThresholds);
    bpZones[cls.category]++;

    const pCls = classifyClinicalPulse(e.pulse);
    if (pCls.category !== 'none') {
      totalPulseCount++;
      hrZones[pCls.category]++;
    }
  }

  return { total, bpZones, totalPulseCount, hrZones };
}


