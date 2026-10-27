'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  HeartPulse,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Volume2,
  VolumeX,
  Info,
  ShieldCheck,
} from 'lucide-react';
import type { VitalsLogEntry, BpThresholds, TimeSlot } from '@/lib/types';
import {
  getVietnamDateStr,
  getVietnamDateOffsetStr,
  compareVitalsAsc,
  normalizeDateStr,
  normalizeTimeStr,
  classifyClinicalBp,
  classifyClinicalPulse,
  isBpInTargetRange,
} from '@/lib/config';
import { speakVietnameseReminder, stopSpeakingVietnamese } from '@/lib/notifications';

const ALL_SLOTS: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];

interface ClinicalVitalsReportSectionProps {
  vitalsLog: VitalsLogEntry[];
  bpThresholds: BpThresholds;
  externalDateRange?: 'today' | '3d' | '7d' | '14d' | '30d' | 'all';
  onChangeDateRange?: (range: 'today' | '3d' | '7d' | '14d' | '30d' | 'all') => void;
  patientName?: string;
  showToast?: (msg: string, type?: 'info' | 'success' | 'warn') => void;
  onOpenDoctorReport?: () => void;
}

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
  avgPP: number | null; // Khoảng cách Số trên - Số dưới
  avgMAP: number | null; // Sức đẩy máu nuôi não
  avgPulse: number | null;
  minPulse: number | null;
  maxPulse: number | null;
  sdPulse: number | null;
  avgRPP: number | null; // Sức làm việc của tim
  tirPct: number | null; // % lần đo đạt chuẩn
  slowPulseCount: number; // < 60 bpm
  verySlowPulseCount: number; // < 50 bpm
  fastPulseCount: number; // >= 100 bpm
  highBpCount: number;
  lowBpCount: number;
  deltaSysVsPrev: number | null;
  deltaDiaVsPrev: number | null;
  deltaPulseVsPrev: number | null;
}

/** Tính mức độ dao động trung bình (Độ lệch chuẩn mẫu) */
function calcStdDev(values: number[]): number | null {
  if (values.length < 2) return values.length === 1 ? 0 : null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

/** Tính mức chênh lệch trung bình giữa 2 lần đo liên tiếp */
function calcARV(valuesAsc: number[]): number | null {
  if (valuesAsc.length < 2) return null;
  let sumDiff = 0;
  for (let i = 1; i < valuesAsc.length; i++) {
    sumDiff += Math.abs(valuesAsc[i] - valuesAsc[i - 1]);
  }
  return Math.round((sumDiff / (valuesAsc.length - 1)) * 10) / 10;
}

export { classifyClinicalBp, classifyClinicalPulse };

/** Tính toán bộ chỉ số cho một khoảng thời gian */
function computeMetricsForEntries(
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

  // So sánh với kỳ liền trước
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

export default function ClinicalVitalsReportSection({
  vitalsLog,
  bpThresholds,
  externalDateRange = '7d',
  patientName = 'Đinh Hồng Phong',
  showToast,
  onOpenDoctorReport,
}: ClinicalVitalsReportSectionProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>(externalDateRange);
  const [isSpeakingReport, setIsSpeakingReport] = useState<boolean>(false);
  const [showMedicalGuide, setShowMedicalGuide] = useState<boolean>(false);

  // Tự động đồng bộ mốc phân tích khi người dùng bấm chọn khoảng thời gian ở đầu trang
  useEffect(() => {
    setSelectedMilestoneId(externalDateRange);
  }, [externalDateRange]);

  // Chuẩn hóa danh sách sinh hiệu
  const cleanedVitals = useMemo(() => {
    return vitalsLog
      .map((v) => ({
        ...v,
        date: normalizeDateStr(v.date),
        time: normalizeTimeStr(v.time),
      }))
      .filter((v) => Boolean(v.date))
      .sort(compareVitalsAsc);
  }, [vitalsLog]);

  // ===== 1. TÍNH TOÁN CÁC MỐC THỜI GIAN ĐỐI CHIẾU =====
  const milestones = useMemo(() => {
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
    const twoDaysAgoEntries = cleanedVitals.filter(
      (v) => v.date === getVietnamDateOffsetStr(-2)
    );

    const last3dEntries = cleanedVitals.filter((v) => v.date >= dayMinus2 && v.date <= todayStr);
    const prev3dEntries = cleanedVitals.filter((v) => v.date >= dayMinus5 && v.date < dayMinus2);

    const last7dEntries = cleanedVitals.filter((v) => v.date >= dayMinus6 && v.date <= todayStr);
    const prev7dEntries = cleanedVitals.filter((v) => v.date >= dayMinus13 && v.date < dayMinus6);

    const last14dEntries = cleanedVitals.filter((v) => v.date >= dayMinus13 && v.date <= todayStr);
    const prev14dEntries = cleanedVitals.filter((v) => v.date >= dayMinus27 && v.date < dayMinus13);

    const last30dEntries = cleanedVitals.filter((v) => v.date >= dayMinus29 && v.date <= todayStr);

    return [
      computeMetricsForEntries(
        'today',
        'Hôm nay',
        'Trong ngày hôm nay',
        todayEntries,
        yesterdayEntries,
        bpThresholds
      ),
      computeMetricsForEntries(
        'yesterday',
        'Hôm qua',
        'So với hôm kia',
        yesterdayEntries,
        twoDaysAgoEntries,
        bpThresholds
      ),
      computeMetricsForEntries(
        '3d',
        '3 ngày qua',
        'So với 3 ngày trước',
        last3dEntries,
        prev3dEntries,
        bpThresholds
      ),
      computeMetricsForEntries(
        '7d',
        '7 ngày qua',
        'So với tuần trước',
        last7dEntries,
        prev7dEntries,
        bpThresholds
      ),
      computeMetricsForEntries(
        '14d',
        '14 ngày qua',
        '2 tuần gần nhất',
        last14dEntries,
        prev14dEntries,
        bpThresholds
      ),
      computeMetricsForEntries(
        '30d',
        '30 ngày qua',
        '1 tháng gần nhất',
        last30dEntries.length > 0 ? last30dEntries : cleanedVitals,
        [],
        bpThresholds
      ),
      computeMetricsForEntries(
        'all',
        'Tất cả lịch sử',
        'Toàn bộ các lần đo',
        cleanedVitals,
        [],
        bpThresholds
      ),
    ];
  }, [cleanedVitals, bpThresholds]);

  // Mốc thời gian đang chọn để nhận định chi tiết
  const activeMilestone = useMemo(() => {
    const found = milestones.find((m) => m.id === selectedMilestoneId);
    if (found && found.count > 0) return found;
    return milestones.find((m) => m.id === '7d' && m.count > 0) || milestones.find((m) => m.count > 0) || milestones[3];
  }, [milestones, selectedMilestoneId]);

  // Các bản ghi thuộc mốc thời gian đang chọn
  const activeEntries = useMemo(() => {
    const todayStr = getVietnamDateStr();
    const yesterdayStr = getVietnamDateOffsetStr(-1);
    switch (activeMilestone.id) {
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
  }, [cleanedVitals, activeMilestone.id]);

  // ===== 2. SO SÁNH SÁNG – TỐI & TÌM KHUNG GIỜ HAY CAO/THẤP =====
  const circadianAnalysis = useMemo(() => {
    const slotStats: Record<
      TimeSlot,
      { label: string; count: number; avgSys: number | null; avgDia: number | null; avgPulse: number | null }
    > = {
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

      slotStats[sl] = {
        ...slotStats[sl],
        count: n,
        avgSys,
        avgDia,
        avgPulse,
      };
    }

    const mSys = slotStats.morning.avgSys;
    const eSys = slotStats.evening.avgSys;
    const morningEveningDiff = mSys !== null && eSys !== null ? mSys - eSys : null;

    let circadianPattern: {
      type: 'morning_surge' | 'evening_riser' | 'balanced' | 'unknown';
      title: string;
      explanation: string;
    } = {
      type: 'unknown',
      title: 'Chưa đủ số đo cả buổi Sáng và Tối để so sánh',
      explanation: 'Nên đo đều vào buổi Sáng và buổi Tối để biết thời điểm nào huyết áp hay tăng.',
    };

    if (morningEveningDiff !== null) {
      if (morningEveningDiff >= 12) {
        circadianPattern = {
          type: 'morning_surge',
          title: `Buổi Sáng thường cao hơn buổi Tối (+${morningEveningDiff} mmHg)`,
          explanation: `Trung bình buổi Sáng là ${mSys}/${slotStats.morning.avgDia} mmHg, cao hơn buổi Tối (${eSys}/${slotStats.evening.avgDia} mmHg). Nên đo huyết áp ngay khi thức dậy trước khi uống thuốc sáng và cho Bố ngồi dậy từ từ.`,
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

    return {
      slotStats,
      morningEveningDiff,
      circadianPattern,
      lowestPulseSlot,
    };
  }, [activeEntries]);

  // ===== 3. PHÂN BỔ MỨC HUYẾT ÁP & NHỊP TIM TRONG KỲ ĐANG CHỌN =====
  const distributionStats = useMemo(() => {
    const total = activeEntries.length;
    const bpZones = {
      low: 0,
      optimal: 0,
      normal_high: 0,
      stage1: 0,
      stage2: 0,
    };
    const hrZones = {
      very_slow: 0, // < 50
      slow: 0, // 50 - 59
      optimal: 0, // 60 - 79
      normal_high: 0, // 80 - 99
      fast: 0, // >= 100
    };
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

    return {
      total,
      bpZones,
      totalPulseCount,
      hrZones,
    };
  }, [activeEntries, bpThresholds]);

  // ===== 4. TỔNG HỢP NHẬN ĐỊNH & ĐÁNH GIÁ DỄ HIỂU THEO KHOẢNG THỜI GIAN ĐANG CHỌN =====
  const clinicalFindings = useMemo(() => {
    const findings: Array<{
      level: 'good' | 'caution' | 'alert';
      title: string;
      detail: string;
    }> = [];

    if (activeMilestone.count === 0 || activeMilestone.avgSys === null || activeMilestone.avgDia === null) {
      return findings;
    }

    // 1. Đánh giá mức Huyết áp chung
    const bpClass = classifyClinicalBp(
      activeMilestone.avgSys,
      activeMilestone.avgDia,
      bpThresholds
    );
    const deltaNote =
      activeMilestone.deltaSysVsPrev !== null && activeMilestone.deltaDiaVsPrev !== null
        ? ` So với kỳ liền trước, huyết áp trung bình ${
            Math.abs(activeMilestone.deltaSysVsPrev) <= 4
              ? 'giữ nguyên ổn định'
              : activeMilestone.deltaSysVsPrev > 4
              ? `tăng nhẹ +${activeMilestone.deltaSysVsPrev} mmHg`
              : `giảm ${activeMilestone.deltaSysVsPrev} mmHg`
          }.`
        : '';

    findings.push({
      level:
        bpClass.category === 'optimal' || bpClass.category === 'normal_high'
          ? 'good'
          : bpClass.category === 'stage2' || bpClass.category === 'low'
          ? 'alert'
          : 'caution',
      title: `Huyết áp trung bình (${activeMilestone.label}): ${activeMilestone.avgSys}/${activeMilestone.avgDia} mmHg — ${bpClass.shortLabel}`,
      detail: `${bpClass.clinicalNote} Có ${activeMilestone.tirPct}% số lần đo nằm trong vùng chuẩn an toàn.${deltaNote}`,
    });

    // 2. Đánh giá Độ ổn định (huyết áp có giữ đều hay nhảy lên xuống)
    if (activeMilestone.sdSys !== null && activeMilestone.count >= 2) {
      const rangeSpan = (activeMilestone.maxSys || 0) - (activeMilestone.minSys || 0);
      if (activeMilestone.sdSys < 10) {
        findings.push({
          level: 'good',
          title: `Độ ổn định rất tốt: Huyết áp giữ phẳng êm (chênh lệch chỉ ±${activeMilestone.sdSys} mmHg)`,
          detail: `Số trên thấp nhất là ${activeMilestone.minSys} và cao nhất là ${activeMilestone.maxSys} mmHg. Các lần đo ít bị nhảy vọt bất ngờ, rất tốt để bảo vệ mạch máu não.`,
        });
      } else if (activeMilestone.sdSys < 15) {
        findings.push({
          level: 'caution',
          title: `Huyết áp có dao động nhẹ giữa các lần đo (chênh lệch ±${activeMilestone.sdSys} mmHg)`,
          detail: `Số trên dao động từ ${activeMilestone.minSys} đến ${activeMilestone.maxSys} mmHg (cách nhau ${rangeSpan} mmHg). Gia đình nên cho Bố uống thuốc đúng một khung giờ cố định mỗi ngày và nghỉ 10 phút trước khi đo.`,
        });
      } else {
        findings.push({
          level: 'alert',
          title: `Huyết áp lên xuống khá thất thường (chênh lệch ±${activeMilestone.sdSys} mmHg)`,
          detail: `Số trên lúc thấp nhất ${activeMilestone.minSys} mmHg nhưng lúc cao nhất lên tới ${activeMilestone.maxSys} mmHg. Khi đi tái khám nên đưa bảng này cho Bác sĩ xem để chỉnh lại liều thuốc giữ huyết áp đều hơn.`,
        });
      }
    }

    // 3. Đánh giá Nhịp tim (Mạch)
    if (activeMilestone.avgPulse !== null) {
      if (activeMilestone.verySlowPulseCount > 0) {
        findings.push({
          level: 'alert',
          title: `Lưu ý Nhịp tim rất chậm: Có ${activeMilestone.verySlowPulseCount} lần mạch dưới 50 nhịp/phút (Thấp nhất ${activeMilestone.minPulse} bpm)`,
          detail: `Nhịp tim trung bình là ${activeMilestone.avgPulse} nhịp/phút (tổng cộng ${activeMilestone.slowPulseCount} lần dưới 60). Cần hỏi Bác sĩ xem trong đơn thuốc có loại nào làm chậm nhịp tim không.`,
        });
      } else if (activeMilestone.slowPulseCount > 0) {
        findings.push({
          level: 'caution',
          title: `Nhịp tim trung bình ${activeMilestone.avgPulse} nhịp/phút — Có ${activeMilestone.slowPulseCount} lần mạch hơi chậm (50–59 nhịp/phút)`,
          detail: `Mạch thấp nhất ghi nhận là ${activeMilestone.minPulse} nhịp/phút${
            circadianAnalysis.lowestPulseSlot
              ? ` (thường vào buổi ${circadianAnalysis.lowestPulseSlot.label})`
              : ''
          }. Nếu Bố không bị mệt hay chóng mặt thì chỉ cần đỡ Bố ngồi dậy từ từ và báo Bác sĩ biết khi tái khám định kỳ.`,
        });
      } else if (activeMilestone.fastPulseCount > 0) {
        findings.push({
          level: 'caution',
          title: `Nhịp tim trung bình ${activeMilestone.avgPulse} nhịp/phút — Có ${activeMilestone.fastPulseCount} lần mạch đập nhanh (≥100 nhịp/phút)`,
          detail: `Mạch cao nhất là ${activeMilestone.maxPulse} nhịp/phút. Khi thấy mạch nhanh nên kiểm tra xem Bố có vừa tập vận động, bị đau mỏi, sốt hay uống thiếu nước không.`,
        });
      } else {
        findings.push({
          level: 'good',
          title: `Nhịp tim (Mạch) đập đều và tốt: Trung bình ${activeMilestone.avgPulse} nhịp/phút (${activeMilestone.minPulse}–${activeMilestone.maxPulse} bpm)`,
          detail: `Tất cả các lần đo nhịp tim đều nằm trong khoảng an toàn (60–99 nhịp/phút), tim của Bố làm việc nhẹ nhàng, không bị quá sức.`,
        });
      }
    }

    // 4. Đánh giá So sánh Sáng – Tối & Khoảng cách 2 số
    if (circadianAnalysis.circadianPattern.type !== 'unknown') {
      findings.push({
        level: circadianAnalysis.circadianPattern.type === 'balanced' ? 'good' : 'caution',
        title: `So sánh Sáng & Tối: ${circadianAnalysis.circadianPattern.title}`,
        detail: circadianAnalysis.circadianPattern.explanation,
      });
    } else if (activeMilestone.avgPP !== null && activeMilestone.avgMAP !== null) {
      const ppText =
        activeMilestone.avgPP >= 60
          ? `Khoảng cách giữa số trên và số dưới trung bình hơi rộng (${activeMilestone.avgPP} mmHg, thường gặp ở người lớn tuổi có thành mạch hơi cứng).`
          : activeMilestone.avgPP < 35
          ? `Khoảng cách giữa số trên và số dưới hơi hẹp (${activeMilestone.avgPP} mmHg), nên chú ý cho Bố uống đủ nước ấm trong ngày.`
          : `Khoảng cách giữa số trên và số dưới đạt mức đẹp (${activeMilestone.avgPP} mmHg, chuẩn 40–55 mmHg).`;
      findings.push({
        level: activeMilestone.avgPP > 65 || activeMilestone.avgMAP < 70 ? 'caution' : 'good',
        title: `Sức đẩy máu nuôi não & Độ chênh 2 số đạt mức ${
          activeMilestone.avgMAP >= 70 && activeMilestone.avgMAP <= 105 ? 'an toàn' : 'cần lưu ý'
        }`,
        detail: `${ppText} Áp lực đẩy máu lên nuôi não trung bình đạt ${activeMilestone.avgMAP} mmHg (chuẩn an toàn 75–95 mmHg).`,
      });
    }

    return findings;
  }, [activeMilestone, bpThresholds, circadianAnalysis]);

  // Đọc báo cáo đánh giá bằng giọng nói Tiếng Việt
  const handleSpeakClinicalReport = () => {
    if (isSpeakingReport) {
      stopSpeakingVietnamese();
      setIsSpeakingReport(false);
      return;
    }
    if (activeMilestone.count === 0) return;

    const sentences: string[] = [
      `Đánh giá chi tiết huyết áp và nhịp tim của bố ${patientName} trong ${activeMilestone.label} (${activeMilestone.count} lần đo):`,
    ];
    for (const f of clinicalFindings) {
      sentences.push(`${f.title}. ${f.detail}`);
    }

    setIsSpeakingReport(true);
    showToast?.('🔊 Đang đọc bản đánh giá sức khỏe...', 'info');
    speakVietnameseReminder(sentences.join(' '), () => {
      setIsSpeakingReport(false);
    });
  };

  return (
    <div className="rounded-2xl border border-teal-200 bg-white shadow-sm overflow-hidden">
      {/* Header khu vực Đánh giá Chi tiết */}
      <div className="px-4 py-3 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5 text-teal-200" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black tracking-tight truncate">
              🩺 Đánh Giá Chi Tiết Huyết Áp &amp; Nhịp Tim ({activeMilestone.label})
            </h3>
            <p className="text-[11px] text-teal-100/90 truncate">
              Tổng hợp tự động từ {activeMilestone.count} lần đo ({activeMilestone.daysCount} ngày) • Giải thích dễ hiểu cho gia đình
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {onOpenDoctorReport && (
            <button
              type="button"
              onClick={onOpenDoctorReport}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 border border-emerald-200 text-xs font-extrabold flex items-center gap-1 shadow-xs transition cursor-pointer"
              title="Mở Phiếu Tóm Tắt Chỉ Số Trình Bác Sĩ (Xem toàn màn hình / In A4 / Xuất PDF / Copy gửi Zalo)"
            >
              <span>📄 Phiếu trình Bác sĩ / In PDF</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSpeakClinicalReport}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              isSpeakingReport
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            }`}
            title="Nghe đọc bản đánh giá bằng giọng nói Tiếng Việt"
          >
            {isSpeakingReport ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>{isSpeakingReport ? 'Dừng đọc' : 'Đọc đánh giá'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMedicalGuide((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-extrabold flex items-center gap-1 cursor-pointer transition ${
              showMedicalGuide
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
            }`}
            title="Xem giải thích chi tiết các chỉ số huyết áp & các triệu chứng đáng lo tại nhà"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showMedicalGuide ? 'Đóng giải thích' : 'Giải thích chỉ số & Dấu hiệu lo ngại'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 sm:p-4 space-y-4">
          {/* Hộp Giải thích chi tiết các chỉ số & Triệu chứng đáng lo tại nhà */}
          {showMedicalGuide && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50/70 border-2 border-teal-300 text-xs text-slate-800 space-y-4 leading-relaxed shadow-xs">
              <div className="flex items-center justify-between gap-2 border-b border-teal-200 pb-2.5">
                <div>
                  <h4 className="text-sm sm:text-base font-black text-teal-950">
                    📖 Cẩm Nang Hiểu Đúng Chỉ Số Huyết Áp &amp; Các Triệu Chứng Đáng Lo Của Bố
                  </h4>
                  <p className="text-[11px] text-teal-800 font-medium">
                    Biên soạn theo bệnh cảnh của Bố: sau mổ xuất huyết não, đang tập phục hồi tại nhà, bán manh trái, chờ ghép sọ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMedicalGuide(false)}
                  className="px-3 py-1 rounded-xl bg-white hover:bg-teal-100 text-teal-900 border border-teal-300 font-extrabold cursor-pointer shrink-0"
                >
                  Thu gọn ✕
                </button>
              </div>

              {/* PHẦN A: GIẢI THÍCH 5 CHỈ SỐ HUYẾT ÁP & MẠCH */}
              <div className="space-y-2.5">
                <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-teal-800 text-white text-[11px]">PHẦN 1</span>
                  <span>Ý nghĩa từng chỉ số &amp; ảnh hưởng tới mạch máu não của Bố</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  {/* 1. Số trên */}
                  <div className="p-3 rounded-xl bg-white border border-rose-200 space-y-1.5">
                    <div className="font-black text-rose-900 text-xs sm:text-sm flex items-center justify-between gap-1">
                      <span>1️⃣ SỐ TRÊN — Huyết áp Tâm thu (SYS)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                        Đẹp: 115–130 (An toàn &lt;{bpThresholds.highSys})
                      </span>
                    </div>
                    <p className="text-slate-700">
                      • <strong>Là gì:</strong> Áp lực máu bơm căng lên thành mạch <strong>lúc tim đang co bóp đẩy máu lên nuôi não</strong>. Đây là con số quan trọng số 1 đối với Bố.
                    </p>
                    <p className="text-rose-900 bg-rose-50/70 p-2 rounded-lg border border-rose-100">
                      • <strong>Nếu quá cao (≥{bpThresholds.highSys}, nguy hiểm khi ≥160 mmHg):</strong> Lực máu dội lên mạch máu não quá mạnh. Vì mạch máu não của Bố từng tổn thương sau tai biến, áp lực cao dễ gây đau căng đầu, đỏ mặt và <strong>nguy cơ tái phát tai biến / xuất huyết não</strong>.
                    </p>
                    <p className="text-sky-900 bg-sky-50/70 p-2 rounded-lg border border-sky-100">
                      • <strong>Nếu quá thấp (≤{bpThresholds.lowSys}, nguy hiểm khi &lt;90 mmHg):</strong> Lực bơm yếu không đẩy đủ máu lên vùng não đang hồi phục → Gây <strong>thiếu máu não tạm thời</strong> làm Bố hoa mắt, lả người, ngủ gà hoặc khuỵu ngã khi ngồi dậy.
                    </p>
                  </div>

                  {/* 2. Số dưới */}
                  <div className="p-3 rounded-xl bg-white border border-blue-200 space-y-1.5">
                    <div className="font-black text-blue-900 text-xs sm:text-sm flex items-center justify-between gap-1">
                      <span>2️⃣ SỐ DƯỚI — Huyết áp Tâm trương (DIA)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                        Đẹp: 70–80 (An toàn &lt;{bpThresholds.highDia})
                      </span>
                    </div>
                    <p className="text-slate-700">
                      • <strong>Là gì:</strong> Áp lực máu còn giữ lại trong mạch <strong>lúc tim đang giãn ra nghỉ ngơi</strong> giữa 2 nhịp đập (thời điểm máu chảy về nuôi chính cơ tim).
                    </p>
                    <p className="text-amber-950 bg-amber-50/70 p-2 rounded-lg border border-amber-100">
                      • <strong>Nếu cao (≥{bpThresholds.highDia}, nguy hiểm khi ≥100 mmHg):</strong> Thành mạch máu bị co thắt căng cứng liên tục ngay cả lúc tim nghỉ, làm tim nhanh mệt và quá tải.
                    </p>
                    <p className="text-sky-900 bg-sky-50/70 p-2 rounded-lg border border-sky-100">
                      • <strong>Nếu quá thấp (≤{bpThresholds.lowDia} mmHg):</strong> Máu quay về nuôi cơ tim kém (hay gặp ở người lớn tuổi), làm Bố dễ mỏi mệt, hụt hơi, tay chân lạnh.
                    </p>
                  </div>

                  {/* 3. Hiệu áp */}
                  <div className="p-3 rounded-xl bg-white border border-purple-200 space-y-1.5">
                    <div className="font-black text-purple-900 text-xs sm:text-sm flex items-center justify-between gap-1">
                      <span>3️⃣ HIỆU ÁP (Độ chênh 2 số = Trên − Dưới)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                        Chuẩn đẹp: 40–55 mmHg
                      </span>
                    </div>
                    <p className="text-slate-700">
                      • <strong>Là gì:</strong> Lấy <strong>Số trên trừ đi Số dưới</strong> (VD: 125/75 → Hiệu áp = 50 mmHg). Chỉ số này cho biết <strong>độ mềm dẻo hay xơ cứng của thành mạch máu</strong>.
                    </p>
                    <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      • <strong>Hiệu áp rộng (≥60 mmHg, VD 150/75):</strong> Thành động mạch của người lớn tuổi bị cứng, làm máu dội mạnh từng nhịp lên não và thận. Cần tránh để Bố xúc động hay đứng phắt dậy đột ngột.<br />
                      • <strong>Hiệu áp hẹp (≤30 mmHg, VD 105/80):</strong> Nhịp bơm của tim hơi yếu hoặc cơ thể Bố đang thiếu nước → Cần cho Bố uống đủ nước ấm rải đều trong ngày.
                    </p>
                  </div>

                  {/* 4. Sức máu nuôi não & Độ ổn định + Nhịp tim */}
                  <div className="p-3 rounded-xl bg-white border border-teal-200 space-y-1.5">
                    <div className="font-black text-teal-900 text-xs sm:text-sm flex items-center justify-between gap-1">
                      <span>4️⃣ SỨC MÁU NUÔI NÃO, ĐỘ ỔN ĐỊNH &amp; MẠCH</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold">
                        Mạch nghỉ: 60–79 bpm
                      </span>
                    </div>
                    <p className="text-slate-700">
                      • <strong>Sức đẩy máu nuôi não (Chuẩn 75–95 mmHg):</strong> Áp lực trung bình đẩy máu nuôi tế bào não. Không được để tụt dưới 65 mmHg (thiếu máu não) hoặc vượt quá 105 mmHg.
                    </p>
                    <p className="text-slate-700">
                      • <strong>Độ ổn định HA (Đều khi &lt;±10 mmHg):</strong> Với người sau tai biến, huyết áp nhảy lên xuống thất thường (≥±15 mmHg giữa Sáng và Tối) nguy hiểm không kém huyết áp cao. Cần uống thuốc đúng khung giờ cố định.
                    </p>
                    <p className="text-slate-700 bg-violet-50/70 p-2 rounded-lg border border-violet-100">
                      • <strong>Nhịp tim / Mạch (BPM):</strong> Nếu <strong>&lt;55–60 bpm</strong> có thể do thuốc làm chậm nhịp (cần hỏi Bác sĩ nếu kèm chóng mặt). Nếu <strong>≥100 bpm lúc nghỉ</strong> hoặc đập loạn nhịp không đều thì dễ tạo cục máu đông hoặc báo hiệu Bố đang sốt, đau, mất nước.
                    </p>
                  </div>
                </div>
              </div>

              {/* PHẦN B: CÁC TRIỆU CHỨNG ĐÁNG LO — ĐIỀU CHỈNH THEO BỆNH CẢNH CỦA BỐ (SAU MỔ XUẤT HUYẾT NÃO, ĐI LẠI ĐƯỢC, BÁN MANH TRÁI, CHỜ GHÉP SỌ) */}
              <div className="space-y-2.5 pt-2 border-t border-teal-200">
                <div className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px]">PHẦN 2</span>
                  <span>Các triệu chứng đáng lo cần theo dõi sát khi chăm sóc Bố tại nhà</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Dành riêng cho Bố: đã mổ xuất huyết não, hiện <strong>đi lại được, không liệt</strong>, đang tập phục hồi chức năng tại nhà,
                  có <strong>bán manh bên trái</strong> và <strong>đang chờ mổ ghép sọ sau khoảng 6–8 tuần</strong>.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                  {/* Cột 1: Mức Đỏ */}
                  <div className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2 text-rose-950">
                    <div className="font-black text-xs sm:text-sm text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>🚨 MỨC ĐỎ — Gọi 115 / Đưa đi viện ngay</span>
                    </div>
                    <p className="text-[11px] font-bold text-rose-700">
                      Không chờ, không tự cho uống thêm thuốc hạ áp, không cạo gió hay chích lễ. Mang theo đơn thuốc, giấy ra viện và phim chụp gần nhất:
                    </p>
                    <ul className="space-y-1.5 text-slate-800 list-disc pl-4">
                      <li>
                        <strong>Đau đầu dữ dội, đột ngột (như “sét đánh”), kèm buồn nôn / nôn vọt:</strong> có thể là chảy máu tái phát hoặc áp lực trong sọ tăng.
                      </li>
                      <li>
                        <strong>Yếu hoặc tê MỚI xuất hiện</strong> ở tay/chân/nửa mặt (Bố hiện đi lại được nên bất kỳ dấu hiệu yếu mới, đi loạng choạng, khuỵu chân, méo miệng, nói đớ hơn hẳn đều là báo động).
                      </li>
                      <li>
                        <strong>Lơ mơ, ngủ gà gọi khó dậy, lú lẫn đột ngột, hoặc co giật / ngất:</strong> không nhét gì vào miệng, để Bố nằm nghiêng an toàn và gọi cấp cứu.
                      </li>
                      <li>
                        <strong>Mắt: mất thị lực đột ngột, nhìn đôi mới xuất hiện, hoặc vùng không nhìn thấy bên trái rộng ra rõ rệt trong vài giờ – vài ngày.</strong>
                      </li>
                      <li>
                        <strong>Vết mổ / vùng xương sọ chưa được ghép (nếu có):</strong> vùng da sọ <strong>phồng căng lên nhanh</strong>, đập mạnh, hoặc <strong>lõm sâu hẳn xuống</strong>; vết mổ chảy dịch trong, dịch máu hoặc mủ; sưng nóng đỏ kèm sốt cao ≥38.5°C, cứng gáy, sợ ánh sáng.
                      </li>
                      <li>
                        <strong>Cơn tăng huyết áp kịch phát (≥180/110 mmHg)</strong> kèm đau đầu, nhìn mờ, tức ngực, khó thở.
                      </li>
                      <li>
                        <strong>Sặc nghẹn, khó thở, tím môi</strong> hoặc ngã đập đầu kèm choáng, nôn, chảy máu / dịch từ tai, mũi.
                      </li>
                    </ul>
                  </div>

                  {/* Cột 2: Mức Vàng */}
                  <div className="p-3 rounded-2xl bg-amber-50/90 border-2 border-amber-300 space-y-2 text-amber-950">
                    <div className="font-black text-xs sm:text-sm text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>⚠️ MỨC VÀNG — Ghi sổ &amp; Báo bác sĩ trong ngày</span>
                    </div>
                    <p className="text-[11px] font-bold text-amber-800">
                      Cho Bố nghỉ ngơi, đo lại huyết áp sau 15 phút, ghi vào Sổ. Nếu không đỡ hoặc nặng thêm, chuyển lên Mức Đỏ:
                    </p>
                    <ul className="space-y-1.5 text-slate-800 list-disc pl-4">
                      <li>
                        <strong>Đau đầu âm ỉ tăng dần, buồn ngủ nhiều hơn thường ngày, buồn nôn nhẹ, hay quên / thay đổi tính nết, đi đứng chậm chạp hơn:</strong> có thể là dấu hiệu sớm của áp lực nội sọ hoặc ứ dịch não sau mổ → báo bác sĩ phẫu thuật sớm, đừng chờ đến lịch hẹn.
                      </li>
                      <li>
                        <strong>Bán manh trái: hay va vào đồ vật/người bên trái, đi lạc hướng, ăn sót nửa đĩa bên trái, đọc sót chữ đầu dòng:</strong> đây là biểu hiện bình thường của bệnh. Chỉ cần báo bác sĩ nếu <strong>nặng lên so với trước</strong> hoặc xuất hiện thêm chớp sáng / nhìn mờ.
                      </li>
                      <li>
                        <strong>Chóng mặt, hoa mắt khi đổi tư thế, huyết áp dao động (chênh ≥15 mmHg giữa sáng và tối):</strong> cho Bố ngồi 3–5 phút trước khi đứng, uống nước đủ, uống thuốc đúng giờ.
                      </li>
                      <li>
                        <strong>Sốt nhẹ (≥37.8°C), ho đờm đục, tiểu buốt hoặc nước tiểu đục; vết mổ đỏ, ngứa hay rỉ nhẹ:</strong> báo bác sĩ sớm, vì nhiễm trùng trước ngày ghép sọ có thể làm lùi lịch mổ.
                      </li>
                      <li>
                        <strong>Ngã nhẹ hoặc va đầu dù Bố vẫn tỉnh:</strong> vẫn nên cho bác sĩ biết trong ngày; nếu va vào vùng xương sọ chưa được ghép thì nên đi khám kiểm tra.
                      </li>
                      <li>
                        <strong>Táo bón trên 3 ngày hoặc phải rặn mạnh, ho nhiều:</strong> rặn mạnh làm tăng áp lực trong đầu và huyết áp, cần xử trí sớm.
                      </li>
                      <li>
                        <strong>Mất ngủ kéo dài, buồn bã, cáu gắt hoặc ngại tập:</strong> hay gặp sau tai biến, cần được gia đình động viên và báo bác sĩ khi tái khám.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Hộp: Giữ an toàn hằng ngày & chuẩn bị trước mổ ghép sọ */}
                <div className="p-3 rounded-2xl bg-sky-50 border-2 border-sky-200 text-sky-950 space-y-1.5">
                  <div className="font-black text-xs sm:text-sm text-sky-900">
                    🛡️ Giữ an toàn hằng ngày &amp; chuẩn bị trước ngày mổ ghép sọ
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-800">
                    <li>
                      <strong>Khi đi lại:</strong> có người đi cùng, đi bên trái của Bố (bên bán manh), dọn lối đi gọn gàng, tránh bậc thang, sàn ướt, chăn thảm vướng chân; để đồ dùng cần thiết ở bên phải để Bố dễ nhìn thấy.
                    </li>
                    <li>
                      <strong>Bảo vệ đầu:</strong> không để Bố ngã hay va đập, không nằm đè lên bên khuyết xương sọ, không tự ý ấn / xoa bóp vùng đó. Hỏi bác sĩ xem có cần đội mũ bảo vệ khi đi lại không.
                    </li>
                    <li>
                      <strong>Khi tập phục hồi chức năng:</strong> tập nhẹ nhàng, tránh gắng sức, rặn mạnh, cúi gập đầu thấp lâu hoặc bài tập có nguy cơ ngã. Dừng ngay nếu đau đầu, chóng mặt hoặc buồn nôn.
                    </li>
                    <li>
                      <strong>Chuẩn bị mổ ghép sọ:</strong> giữ vết mổ và da đầu sạch khô, chữa dứt điểm viêm răng, họng, tiểu buốt nếu có; uống thuốc đúng đơn và không tự ý ngưng hay đổi thuốc (nhất là thuốc chống đông, chống kết tập tiểu cầu, thuốc chống co giật, thuốc huyết áp); ghi sẵn câu hỏi cho bác sĩ.
                    </li>
                  </ul>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Lưu ý: nội dung mang tính tham khảo để gia đình nhận biết sớm, không thay thế chỉ định của bác sĩ điều trị. Khi phân vân, hãy gọi bác sĩ phẫu thuật của Bố hoặc đưa Bố đến viện.
                </p>
              </div>
            </div>
          )}

          {/* ===== PHẦN 1 (TRỌNG TÂM): NHẬN ĐỊNH & ĐÁNH GIÁ CỤ THỂ BẰNG NGÔN NGỮ DỄ HIỂU ===== */}
          {clinicalFindings.length > 0 && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {clinicalFindings.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      item.level === 'alert'
                        ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                        : item.level === 'caution'
                        ? 'bg-amber-50/80 border-amber-200 text-slate-900'
                        : 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                    }`}
                  >
                    <div className="font-black flex items-start gap-1.5">
                      {item.level === 'alert' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : item.level === 'caution' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed pl-5">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===== PHẦN 2: THỐNG KÊ TRỰC QUAN CÁC LẦN ĐO HUYẾT ÁP & NHỊP TIM TRONG KỲ ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
            {/* Khối A: Tỷ lệ các mức Huyết Áp & Độ ổn định */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-600" />
                  <span>Phân Bổ Các Lần Đo Huyết Áp ({activeMilestone.label})</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {activeMilestone.tirPct ?? 0}% đạt chuẩn
                </span>
              </div>

              {distributionStats.total > 0 && (
                <div className="space-y-2">
                  <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-200">
                    {[
                      { count: distributionStats.bpZones.low, color: 'bg-sky-500' },
                      { count: distributionStats.bpZones.optimal, color: 'bg-emerald-500' },
                      { count: distributionStats.bpZones.normal_high, color: 'bg-teal-500' },
                      { count: distributionStats.bpZones.stage1, color: 'bg-amber-500' },
                      { count: distributionStats.bpZones.stage2, color: 'bg-rose-600' },
                    ].map(
                      (z, idx) =>
                        z.count > 0 && (
                          <div
                            key={idx}
                            style={{ width: `${(z.count / distributionStats.total) * 100}%` }}
                            className={`${z.color} h-full transition-all`}
                          />
                        )
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Tốt (&lt;130/80)
                      </span>
                      <span className="font-black text-emerald-800">
                        {distributionStats.bpZones.optimal} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        Đạt chuẩn (130–139)
                      </span>
                      <span className="font-black text-teal-800">
                        {distributionStats.bpZones.normal_high} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Hơi cao (140–159)
                      </span>
                      <span className="font-black text-amber-800">
                        {distributionStats.bpZones.stage1} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                        Cao vượt (≥160/100)
                      </span>
                      <span className="font-black text-rose-700">
                        {distributionStats.bpZones.stage2} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        Hơi thấp (≤{bpThresholds.lowSys}/{bpThresholds.lowDia})
                      </span>
                      <span className="font-black text-sky-800">
                        {distributionStats.bpZones.low} lần
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3 ô chỉ số bổ trợ đã Việt hóa dễ hiểu */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 block">Độ ổn định HA</span>
                  <span
                    className={`text-sm font-black ${
                      (activeMilestone.sdSys || 0) >= 15
                        ? 'text-rose-600'
                        : (activeMilestone.sdSys || 0) >= 10
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {activeMilestone.sdSys !== null ? `±${activeMilestone.sdSys}` : '—'}{' '}
                    <small className="font-normal">mmHg</small>
                  </span>
                  <span className="text-[10px] text-slate-500 block">Đều: &lt;10 mmHg</span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 block">Hiệu áp (Trên−Dưới)</span>
                  <span className="text-sm font-black text-slate-900">
                    {activeMilestone.avgPP ?? '—'} <small className="font-normal">mmHg</small>
                  </span>
                  <span className="text-[10px] text-slate-500 block">Đẹp: 40–55</span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 block">Sức máu nuôi não</span>
                  <span className="text-sm font-black text-slate-900">
                    {activeMilestone.avgMAP ?? '—'} <small className="font-normal">mmHg</small>
                  </span>
                  <span className="text-[10px] text-emerald-700 block font-semibold">
                    Chuẩn: 75–95
                  </span>
                </div>
              </div>
            </div>

            {/* Khối B: Tỷ lệ các mức Nhịp Tim (Mạch) */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-violet-600" />
                  <span>Phân Bổ Các Lần Đo Nhịp Tim ({activeMilestone.label})</span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {distributionStats.totalPulseCount} lần có mạch
                </span>
              </div>

              {distributionStats.totalPulseCount > 0 ? (
                <>
                  <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-200">
                    {[
                      { count: distributionStats.hrZones.very_slow, color: 'bg-rose-500' },
                      { count: distributionStats.hrZones.slow, color: 'bg-amber-500' },
                      { count: distributionStats.hrZones.optimal, color: 'bg-emerald-500' },
                      { count: distributionStats.hrZones.normal_high, color: 'bg-teal-500' },
                      { count: distributionStats.hrZones.fast, color: 'bg-rose-600' },
                    ].map(
                      (z, idx) =>
                        z.count > 0 && (
                          <div
                            key={idx}
                            style={{
                              width: `${(z.count / distributionStats.totalPulseCount) * 100}%`,
                            }}
                            className={`${z.color} h-full transition-all`}
                          />
                        )
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Nhịp tốt (60–79)
                      </span>
                      <span className="font-black text-emerald-800">
                        {distributionStats.hrZones.optimal} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        Bình thường (80–99)
                      </span>
                      <span className="font-black text-slate-900">
                        {distributionStats.hrZones.normal_high} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Hơi chậm (50–59)
                      </span>
                      <span className="font-black text-amber-800">
                        {distributionStats.hrZones.slow} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Rất chậm (&lt;50)
                      </span>
                      <span className="font-black text-rose-700">
                        {distributionStats.hrZones.very_slow} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                        Nhanh (≥100)
                      </span>
                      <span className="font-black text-rose-700">
                        {distributionStats.hrZones.fast} lần
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 block">Mạch Trung bình</span>
                      <span className="text-sm font-black text-slate-900">
                        {activeMilestone.avgPulse} <small className="font-normal">bpm</small>
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {activeMilestone.minPulse}–{activeMilestone.maxPulse} bpm
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 block">Độ đều của Mạch</span>
                      <span className="text-sm font-black text-slate-900">
                        {activeMilestone.sdPulse !== null ? `±${activeMilestone.sdPulse}` : '—'}{' '}
                        <small className="font-normal">bpm</small>
                      </span>
                      <span className="text-[10px] text-slate-500 block">Chênh lệch</span>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 block">Sức đập của tim</span>
                      <span
                        className={`text-sm font-black ${
                          (activeMilestone.avgRPP || 0) > 12000
                            ? 'text-rose-600'
                            : (activeMilestone.avgRPP || 0) > 10000
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {(activeMilestone.avgRPP || 0) > 12000
                          ? 'Hơi gắng sức'
                          : (activeMilestone.avgRPP || 0) > 10000
                          ? 'Trung bình'
                          : 'Nhẹ nhàng'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Khi nghỉ ngơi</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  Chưa có dữ liệu nhịp tim trong mốc thời gian này.
                </div>
              )}
            </div>
          </div>

          {/* Nút mở nhanh Cẩm nang Giải thích chỉ số & Triệu chứng đáng lo ngay dưới chân bảng */}
          {!showMedicalGuide && (
            <button
              type="button"
              onClick={() => setShowMedicalGuide(true)}
              className="w-full p-3 rounded-2xl bg-teal-50/80 hover:bg-teal-100/80 border border-teal-200 flex items-center justify-between gap-2 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-black text-teal-950 truncate">
                    📖 Giải thích: Số trên, Số dưới, Hiệu áp &amp; Các triệu chứng đáng lo tại nhà
                  </p>
                  <p className="text-[11px] text-teal-800 truncate">
                    Bấm để xem ý nghĩa từng chỉ số đối với bệnh cảnh sau tai biến của Bố và dấu hiệu cần gọi Bác sĩ
                  </p>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-white text-teal-900 border border-teal-300 text-xs font-extrabold shrink-0">
                Xem chi tiết ▾
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
