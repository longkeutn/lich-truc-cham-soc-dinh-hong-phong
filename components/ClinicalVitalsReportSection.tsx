'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  HeartPulse,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Volume2,
  VolumeX,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { VitalsLogEntry, BpThresholds, TimeSlot } from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  getVietnamDateStr,
  getVietnamDateOffsetStr,
  compareVitalsAsc,
  compareVitalsDesc,
  normalizeDateStr,
  normalizeTimeStr,
} from '@/lib/config';
import { speakVietnameseReminder, stopSpeakingVietnamese } from '@/lib/notifications';

const ALL_SLOTS: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];

interface ClinicalVitalsReportSectionProps {
  vitalsLog: VitalsLogEntry[];
  bpThresholds: BpThresholds;
  patientName?: string;
  showToast?: (msg: string, type?: 'info' | 'success' | 'warn') => void;
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
  cvSys: number | null; // Hệ số biến thiên CV% = SD / Mean * 100
  arvSys: number | null; // Average Real Variability giữa các lần đo liên tiếp
  avgPP: number | null; // Hiệu áp (SYS - DIA)
  avgMAP: number | null; // Áp lực tưới máu trung bình (DIA + PP/3)
  avgPulse: number | null;
  minPulse: number | null;
  maxPulse: number | null;
  sdPulse: number | null;
  avgRPP: number | null; // Rate Pressure Product = SYS * Pulse
  tirPct: number | null; // % đạt ngưỡng mục tiêu
  slowPulseCount: number; // < 55 bpm
  verySlowPulseCount: number; // < 50 bpm
  fastPulseCount: number; // >= 100 bpm
  highBpCount: number;
  lowBpCount: number;
  deltaSysVsPrev: number | null;
  deltaDiaVsPrev: number | null;
  deltaPulseVsPrev: number | null;
}

/** Tính độ lệch chuẩn mẫu (Sample Standard Deviation) */
function calcStdDev(values: number[]): number | null {
  if (values.length < 2) return values.length === 1 ? 0 : null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

/** Tính biến thiên thực tế trung bình giữa các lần đo liên tiếp (ARV - Average Real Variability) */
function calcARV(valuesAsc: number[]): number | null {
  if (valuesAsc.length < 2) return null;
  let sumDiff = 0;
  for (let i = 1; i < valuesAsc.length; i++) {
    sumDiff += Math.abs(valuesAsc[i] - valuesAsc[i - 1]);
  }
  return Math.round((sumDiff / (valuesAsc.length - 1)) * 10) / 10;
}

/** Phân loại mức Huyết áp đo tại nhà (HBPM) theo khuyến cáo VNHA / ESC / AHA cho bệnh nhân sau đột quỵ */
export function classifyClinicalBp(
  sys: number,
  dia: number,
  thresholds: BpThresholds
): {
  code: 'low' | 'optimal' | 'normal_high' | 'stage1' | 'stage2';
  label: string;
  shortLabel: string;
  badgeClass: string;
  barColor: string;
  clinicalNote: string;
} {
  if (sys <= thresholds.lowSys || dia <= thresholds.lowDia) {
    return {
      code: 'low',
      label: 'Huyết áp thấp (Nguy cơ giảm tưới máu não)',
      shortLabel: 'Hạ áp / Thấp',
      badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
      barColor: 'bg-sky-500',
      clinicalNote:
        'Huyết áp thấp ở bệnh nhân sau đột quỵ có thể làm giảm lưu lượng máu nuôi vùng não đang phục hồi.',
    };
  }
  if (sys >= 160 || dia >= 100) {
    return {
      code: 'stage2',
      label: 'Tăng HA Độ 2 / Nguy cơ cao (≥160/100)',
      shortLabel: 'Tăng Độ 2 (≥160/100)',
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300',
      barColor: 'bg-rose-600',
      clinicalNote:
        'Vượt ngưỡng nguy hiểm, làm tăng áp lực thành mạch não. Cần nghỉ ngơi, kiểm tra thuốc và theo dõi sát.',
    };
  }
  if (sys >= thresholds.highSys || dia >= thresholds.highDia) {
    return {
      code: 'stage1',
      label: `Tăng HA Độ 1 (${thresholds.highSys}–159 / ${thresholds.highDia}–99)`,
      shortLabel: `Vượt ngưỡng (≥${thresholds.highSys}/${thresholds.highDia})`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      barColor: 'bg-amber-500',
      clinicalNote:
        'Cao hơn ngưỡng mục tiêu tại nhà. Cần đối chiếu giờ uống thuốc hạ áp và mức độ vận động/căng thẳng.',
    };
  }
  if (sys >= 130 || dia >= 80) {
    return {
      code: 'normal_high',
      label: 'Bình thường – Cao (130–139 / 80–89)',
      shortLabel: 'Bình thường-Cao',
      badgeClass: 'bg-teal-50 text-teal-800 border-teal-300',
      barColor: 'bg-teal-500',
      clinicalNote:
        'Nằm trong giới hạn an toàn cho phép nhưng tiệm cận ngưỡng trên, cần duy trì đều thuốc và chế độ ăn giảm mặn.',
    };
  }
  return {
    code: 'optimal',
    label: 'Tối ưu sau đột quỵ (110–129 / 65–79)',
    shortLabel: 'Tối ưu (<130/80)',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    barColor: 'bg-emerald-500',
    clinicalNote:
      'Vùng huyết áp tối ưu giúp bảo vệ thành mạch não và giảm tối đa nguy cơ tái phát đột quỵ (theo ESC/VNHA).',
  };
}

/** Tính toán bộ chỉ số huyết động cho một tập bản ghi */
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
    const isHigh = e.sys >= thresholds.highSys || e.dia >= thresholds.highDia;
    const isLow = e.sys <= thresholds.lowSys || e.dia <= thresholds.lowDia;
    if (isHigh) highBpCount++;
    else if (isLow) lowBpCount++;
    else inTargetCount++;
  }
  const tirPct = Math.round((inTargetCount / count) * 100);

  const slowPulseCount = pulseList.filter((p) => p < 55).length;
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
  patientName = 'Đinh Hồng Phong',
  showToast,
}: ClinicalVitalsReportSectionProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('7d');
  const [isSpeakingReport, setIsSpeakingReport] = useState<boolean>(false);
  const [showMedicalGuide, setShowMedicalGuide] = useState<boolean>(false);

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

  // ===== 1. TÍNH TOÁN ĐA MỐC THỜI GIAN (HÔM NAY, HÔM QUA, 3 NGÀY, 7 NGÀY, 14 NGÀY, 30 NGÀY) =====
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
        '24h hiện tại',
        todayEntries,
        yesterdayEntries,
        bpThresholds
      ),
      computeMetricsForEntries(
        'yesterday',
        'Hôm qua',
        'Ngày liền trước',
        yesterdayEntries,
        twoDaysAgoEntries,
        bpThresholds
      ),
      computeMetricsForEntries(
        '3d',
        '3 ngày gần nhất',
        'Ngắn hạn (So với 3 ngày trước)',
        last3dEntries,
        prev3dEntries,
        bpThresholds
      ),
      computeMetricsForEntries(
        '7d',
        '7 ngày qua',
        'Tuần này (So với tuần trước)',
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
        'Nền huyết áp tháng',
        last30dEntries.length > 0 ? last30dEntries : cleanedVitals,
        [],
        bpThresholds
      ),
    ];
  }, [cleanedVitals, bpThresholds]);

  // Mốc thời gian đang chọn để phân tích chuyên sâu
  const activeMilestone = useMemo(() => {
    const found = milestones.find((m) => m.id === selectedMilestoneId);
    if (found && found.count > 0) return found;
    return milestones.find((m) => m.count > 0) || milestones[3];
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
      default:
        return cleanedVitals.filter((v) => v.date >= getVietnamDateOffsetStr(-29));
    }
  }, [cleanedVitals, activeMilestone.id]);

  // ===== 2. PHÂN TÍCH NHỊP SINH HỌC 4 KHUNG GIỜ & HIỆN TƯỢNG VỌT ÁP SÁNG / TĂNG ÁP TỐI =====
  const circadianAnalysis = useMemo(() => {
    const slotDetails: Record<
      TimeSlot,
      {
        slot: TimeSlot;
        label: string;
        emoji: string;
        timeRange: string;
        count: number;
        avgSys: number | null;
        avgDia: number | null;
        minSys: number | null;
        maxSys: number | null;
        avgPP: number | null;
        avgMAP: number | null;
        avgPulse: number | null;
        minPulse: number | null;
        maxPulse: number | null;
        highBpCount: number;
        slowPulseCount: number;
        highBpPct: number;
      }
    > = {
      morning: {
        slot: 'morning',
        label: 'Sáng',
        emoji: '🌅',
        timeRange: '06:00–11:00',
        count: 0,
        avgSys: null,
        avgDia: null,
        minSys: null,
        maxSys: null,
        avgPP: null,
        avgMAP: null,
        avgPulse: null,
        minPulse: null,
        maxPulse: null,
        highBpCount: 0,
        slowPulseCount: 0,
        highBpPct: 0,
      },
      noon: {
        slot: 'noon',
        label: 'Trưa',
        emoji: '☀️',
        timeRange: '11:00–14:00',
        count: 0,
        avgSys: null,
        avgDia: null,
        minSys: null,
        maxSys: null,
        avgPP: null,
        avgMAP: null,
        avgPulse: null,
        minPulse: null,
        maxPulse: null,
        highBpCount: 0,
        slowPulseCount: 0,
        highBpPct: 0,
      },
      afternoon: {
        slot: 'afternoon',
        label: 'Chiều',
        emoji: '🌇',
        timeRange: '14:00–18:00',
        count: 0,
        avgSys: null,
        avgDia: null,
        minSys: null,
        maxSys: null,
        avgPP: null,
        avgMAP: null,
        avgPulse: null,
        minPulse: null,
        maxPulse: null,
        highBpCount: 0,
        slowPulseCount: 0,
        highBpPct: 0,
      },
      evening: {
        slot: 'evening',
        label: 'Tối',
        emoji: '🌙',
        timeRange: '18:00–22:00',
        count: 0,
        avgSys: null,
        avgDia: null,
        minSys: null,
        maxSys: null,
        avgPP: null,
        avgMAP: null,
        avgPulse: null,
        minPulse: null,
        maxPulse: null,
        highBpCount: 0,
        slowPulseCount: 0,
        highBpPct: 0,
      },
    };

    for (const sl of ALL_SLOTS) {
      const items = activeEntries.filter((v) => v.period === sl);
      if (items.length === 0) continue;
      const n = items.length;
      const avgSys = Math.round(items.reduce((s, x) => s + x.sys, 0) / n);
      const avgDia = Math.round(items.reduce((s, x) => s + x.dia, 0) / n);
      const minSys = Math.min(...items.map((x) => x.sys));
      const maxSys = Math.max(...items.map((x) => x.sys));
      const avgPP = avgSys - avgDia;
      const avgMAP = Math.round(avgDia + avgPP / 3);

      const pItems = items.filter((x) => x.pulse && x.pulse > 0);
      const avgPulse =
        pItems.length > 0
          ? Math.round(pItems.reduce((s, x) => s + (x.pulse as number), 0) / pItems.length)
          : null;
      const minPulse =
        pItems.length > 0 ? Math.min(...pItems.map((x) => x.pulse as number)) : null;
      const maxPulse =
        pItems.length > 0 ? Math.max(...pItems.map((x) => x.pulse as number)) : null;

      const highBpCount = items.filter(
        (x) => x.sys >= bpThresholds.highSys || x.dia >= bpThresholds.highDia
      ).length;
      const slowPulseCount = pItems.filter((x) => (x.pulse as number) < 55).length;

      slotDetails[sl] = {
        ...slotDetails[sl],
        count: n,
        avgSys,
        avgDia,
        minSys,
        maxSys,
        avgPP,
        avgMAP,
        avgPulse,
        minPulse,
        maxPulse,
        highBpCount,
        slowPulseCount,
        highBpPct: Math.round((highBpCount / n) * 100),
      };
    }

    // So sánh Chênh lệch Sáng - Tối (Morning vs Evening Differential)
    const mSys = slotDetails.morning.avgSys;
    const eSys = slotDetails.evening.avgSys;
    const morningEveningDiff = mSys !== null && eSys !== null ? mSys - eSys : null;

    let circadianPattern: {
      type: 'morning_surge' | 'evening_riser' | 'balanced' | 'unknown';
      title: string;
      badgeClass: string;
      explanation: string;
    } = {
      type: 'unknown',
      title: 'Chưa đủ cặp đo Sáng – Tối',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      explanation: 'Cần có dữ liệu đo cả buổi Sáng và buổi Tối để phân tích nhịp sinh học.',
    };

    if (morningEveningDiff !== null) {
      if (morningEveningDiff >= 12) {
        circadianPattern = {
          type: 'morning_surge',
          title: `Xu hướng cao buổi Sáng (+${morningEveningDiff} mmHg so với Tối)`,
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
          explanation:
            'Huyết áp buổi sáng cao hơn rõ so với buổi tối (Morning Surge). Nên đo HA ngay trước khi uống thuốc sáng và hỏi Bác sĩ xem thuốc cử tối có đủ che phủ tới sáng hôm sau không.',
        };
      } else if (morningEveningDiff <= -10) {
        circadianPattern = {
          type: 'evening_riser',
          title: `Xu hướng tăng về Chiều Tối (+${Math.abs(morningEveningDiff)} mmHg so với Sáng)`,
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
          explanation:
            'Huyết áp buổi tối cao hơn buổi sáng (Evening Riser). Cần lưu ý thời điểm uống thuốc cử chiều/tối, hạn chế ăn mặn bữa tối và nghỉ ngơi thư giãn.',
        };
      } else {
        circadianPattern = {
          type: 'balanced',
          title: `Nhịp sinh học Sáng – Tối cân bằng (Chênh ${
            morningEveningDiff >= 0 ? `+${morningEveningDiff}` : morningEveningDiff
          } mmHg)`,
          badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          explanation:
            'Chênh lệch huyết áp giữa buổi Sáng và buổi Tối rất nhỏ (<10–12 mmHg), cho thấy phác đồ thuốc đang kiểm soát tốt nhịp ngày đêm.',
        };
      }
    }

    // Tìm buổi có HA trung bình cao nhất & buổi có mạch trung bình thấp nhất
    const activeSlots = ALL_SLOTS.map((s) => slotDetails[s]).filter((s) => s.count > 0);
    const highestBpSlot =
      activeSlots.length > 0
        ? [...activeSlots].sort((a, b) => (b.avgSys || 0) - (a.avgSys || 0))[0]
        : null;
    const lowestPulseSlot =
      activeSlots.filter((s) => s.avgPulse !== null).length > 0
        ? [...activeSlots.filter((s) => s.avgPulse !== null)].sort(
            (a, b) => (a.avgPulse || 999) - (b.avgPulse || 999)
          )[0]
        : null;

    return {
      slotDetails,
      morningEveningDiff,
      circadianPattern,
      highestBpSlot,
      lowestPulseSlot,
    };
  }, [activeEntries, bpThresholds]);

  // ===== 3. PHÂN TẦNG HUYẾT ÁP & PHÂN TẦNG NHỊP TIM TRONG KỲ ĐANG CHỌN =====
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
      bpZones[cls.code]++;

      if (e.pulse && e.pulse > 0) {
        totalPulseCount++;
        if (e.pulse < 50) hrZones.very_slow++;
        else if (e.pulse < 60) hrZones.slow++;
        else if (e.pulse < 80) hrZones.optimal++;
        else if (e.pulse < 100) hrZones.normal_high++;
        else hrZones.fast++;
      }
    }

    return {
      total,
      bpZones,
      totalPulseCount,
      hrZones,
    };
  }, [activeEntries, bpThresholds]);

  // ===== 4. TỔNG HỢP NHẬN ĐỊNH LÂM SÀNG TỰ ĐỘNG (CLINICAL INTERPRETATION) =====
  const clinicalFindings = useMemo(() => {
    const findings: Array<{
      level: 'good' | 'caution' | 'alert';
      title: string;
      detail: string;
    }> = [];

    if (activeMilestone.count === 0 || activeMilestone.avgSys === null || activeMilestone.avgDia === null) {
      return findings;
    }

    // 1. Đánh giá mức Huyết áp nền (Mean BP)
    const bpClass = classifyClinicalBp(
      activeMilestone.avgSys,
      activeMilestone.avgDia,
      bpThresholds
    );
    findings.push({
      level:
        bpClass.code === 'optimal' || bpClass.code === 'normal_high'
          ? 'good'
          : bpClass.code === 'stage2' || bpClass.code === 'low'
          ? 'alert'
          : 'caution',
      title: `Huyết áp trung bình (${activeMilestone.label}): ${activeMilestone.avgSys}/${activeMilestone.avgDia} mmHg — ${bpClass.shortLabel}`,
      detail: `${bpClass.clinicalNote} Tỷ lệ lần đo nằm trong vùng mục tiêu đạt ${activeMilestone.tirPct}%.`,
    });

    // 2. Đánh giá Độ biến thiên Huyết áp (SD_SYS & ARV)
    if (activeMilestone.sdSys !== null && activeMilestone.count >= 3) {
      if (activeMilestone.sdSys < 10) {
        findings.push({
          level: 'good',
          title: `Độ ổn định huyết áp rất tốt (Độ lệch chuẩn SD = ±${activeMilestone.sdSys} mmHg)`,
          detail: `Dao động giữa các lần đo thấp (ARV = ${activeMilestone.arvSys ?? 0} mmHg, CV = ${
            activeMilestone.cvSys ?? 0
          }%). Huyết áp phẳng êm giúp giảm áp lực cơ học lên mạch máu não.`,
        });
      } else if (activeMilestone.sdSys < 15) {
        findings.push({
          level: 'caution',
          title: `Huyết áp có dao động mức trung bình (SD = ±${activeMilestone.sdSys} mmHg)`,
          detail: `Chênh lệch giữa mức thấp nhất và cao nhất là ${activeMilestone.minSys}–${activeMilestone.maxSys} mmHg (biên độ ${
            (activeMilestone.maxSys || 0) - (activeMilestone.minSys || 0)
          } mmHg). Nên uống thuốc cố định đúng khung giờ mỗi ngày.`,
        });
      } else {
        findings.push({
          level: 'alert',
          title: `Biến thiên huyết áp lớn (SD = ±${activeMilestone.sdSys} mmHg ≥ 15 mmHg)`,
          detail: `Huyết áp dao động mạnh từ ${activeMilestone.minSys} đến ${activeMilestone.maxSys} mmHg. Trong y khoa đột quỵ, huyết áp lên xuống thất thường cần được báo Bác sĩ để điều chỉnh thuốc tác dụng kéo dài.`,
        });
      }
    }

    // 3. Đánh giá Hiệu áp (Pulse Pressure) & Áp lực tưới máu não (MAP)
    if (activeMilestone.avgPP !== null && activeMilestone.avgMAP !== null) {
      const ppStatus =
        activeMilestone.avgPP > 60
          ? 'Hiệu áp hơi rộng (≥60 mmHg, thường gặp do độ cứng thành động mạch ở người lớn tuổi)'
          : activeMilestone.avgPP < 35
          ? 'Hiệu áp hẹp (<35 mmHg, cần lưu ý lượng nước uống hàng ngày)'
          : 'Hiệu áp sinh lý bình thường (40–55 mmHg)';
      const mapStatus =
        activeMilestone.avgMAP < 70
          ? 'Áp lực tưới máu trung bình (MAP) hơi thấp (<70 mmHg), cần tránh để huyết áp tụt sâu'
          : activeMilestone.avgMAP > 105
          ? 'Áp lực tưới máu trung bình (MAP) cao (>105 mmHg)'
          : 'Áp lực tưới máu não (MAP) đạt ngưỡng tối ưu (75–95 mmHg)';

      findings.push({
        level:
          activeMilestone.avgPP > 65 || activeMilestone.avgMAP < 70 || activeMilestone.avgMAP > 105
            ? 'caution'
            : 'good',
        title: `Huyết động học: MAP = ${activeMilestone.avgMAP} mmHg · Hiệu áp (PP) = ${activeMilestone.avgPP} mmHg`,
        detail: `${mapStatus}. ${ppStatus}.`,
      });
    }

    // 4. Đánh giá Nhịp tim (Mạch) & Gánh nặng cơ tim (RPP)
    if (activeMilestone.avgPulse !== null) {
      if (activeMilestone.slowPulseCount > 0) {
        findings.push({
          level: activeMilestone.verySlowPulseCount > 0 ? 'alert' : 'caution',
          title: `Cảnh báo Nhịp tim chậm: Có ${activeMilestone.slowPulseCount} lần mạch dưới 55 bpm (Thấp nhất ${activeMilestone.minPulse} bpm)`,
          detail: `Nhịp tim trung bình là ${activeMilestone.avgPulse} bpm${
            circadianAnalysis.lowestPulseSlot
              ? `, thường thấp nhất vào buổi ${circadianAnalysis.lowestPulseSlot.label} (TB ${circadianAnalysis.lowestPulseSlot.avgPulse} bpm)`
              : ''
          }. Khi tái khám cần hỏi Bác sĩ xem có thuốc nào làm chậm nhịp tim không.`,
        });
      } else if (activeMilestone.fastPulseCount > 0) {
        findings.push({
          level: 'caution',
          title: `Ghi nhận ${activeMilestone.fastPulseCount} lần nhịp tim nhanh (≥100 bpm, Cao nhất ${activeMilestone.maxPulse} bpm)`,
          detail: `Nhịp tim trung bình ${activeMilestone.avgPulse} bpm. Khi mạch nhanh cần kiểm tra xem Bố có bị sốt, đau mỏi cơ, thiếu nước hay vừa tập vận động xong không.`,
        });
      } else {
        findings.push({
          level: 'good',
          title: `Nhịp tim (Mạch) ổn định: Trung bình ${activeMilestone.avgPulse} bpm (${activeMilestone.minPulse}–${activeMilestone.maxPulse} bpm)`,
          detail: `Chỉ số gánh nặng cơ tim (RPP = ${
            activeMilestone.avgRPP ? activeMilestone.avgRPP.toLocaleString('vi-VN') : '—'
          }) nằm trong ngưỡng nghỉ ngơi an toàn (<10.000), cơ tim làm việc nhẹ nhàng.`,
        });
      }
    }

    // 5. Nhịp sinh học Sáng - Tối
    if (circadianAnalysis.circadianPattern.type !== 'unknown') {
      findings.push({
        level: circadianAnalysis.circadianPattern.type === 'balanced' ? 'good' : 'caution',
        title: `Nhịp sinh học Sáng – Tối: ${circadianAnalysis.circadianPattern.title}`,
        detail: circadianAnalysis.circadianPattern.explanation,
      });
    }

    return findings;
  }, [activeMilestone, bpThresholds, circadianAnalysis]);

  // Đọc báo cáo phân tích y khoa bằng giọng nói Tiếng Việt
  const handleSpeakClinicalReport = () => {
    if (isSpeakingReport) {
      stopSpeakingVietnamese();
      setIsSpeakingReport(false);
      return;
    }
    if (activeMilestone.count === 0) return;

    const sentences: string[] = [
      `Báo cáo đánh giá y khoa huyết áp và nhịp tim của bố ${patientName} trong mốc thời gian ${activeMilestone.label} (${activeMilestone.count} lần đo):`,
    ];
    for (const f of clinicalFindings) {
      sentences.push(`${f.title}. ${f.detail}`);
    }

    setIsSpeakingReport(true);
    showToast?.('🔊 Đang đọc báo cáo đánh giá y khoa...', 'info');
    speakVietnameseReminder(sentences.join(' '), () => {
      setIsSpeakingReport(false);
    });
  };

  return (
    <div className="rounded-2xl border border-teal-200 bg-white shadow-sm overflow-hidden">
      {/* Header khu vực Báo cáo Đánh giá Y khoa chuyên sâu */}
      <div className="px-4 py-3 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5 text-teal-200" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black tracking-tight truncate">
              🩺 Báo Cáo Đánh Giá Y Khoa: Huyết Áp & Nhịp Tim Đa Mốc Thời Gian
            </h3>
            <p className="text-[11px] text-teal-100/90 truncate">
              Phân tích huyết động học (MAP, Hiệu áp PP, Độ biến thiên SD/CV, Nhịp sinh học Sáng–Tối & Phản xạ Mạch)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSpeakClinicalReport}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
              isSpeakingReport
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            }`}
            title="Nghe đọc báo cáo phân tích y khoa bằng giọng nói Tiếng Việt"
          >
            {isSpeakingReport ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
            <span>{isSpeakingReport ? 'Dừng đọc' : 'Đọc phân tích'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMedicalGuide((prev) => !prev)}
            className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
            title="Giải thích ý nghĩa các chỉ số y khoa"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chuẩn Y Khoa</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
            title={isExpanded ? 'Thu gọn báo cáo' : 'Mở rộng báo cáo'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 sm:p-4 space-y-4">
          {/* Hộp cẩm nang chuẩn y khoa (Bấm nút Chuẩn Y Khoa mới hiện để giao diện luôn gọn) */}
          {showMedicalGuide && (
            <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 text-xs text-slate-800 space-y-2 leading-relaxed">
              <div className="font-black text-teal-950 flex items-center justify-between">
                <span>📚 Căn cứ Y khoa áp dụng cho bệnh nhân phục hồi sau Đột quỵ (VNHA / ESC / AHA):</span>
                <button
                  type="button"
                  onClick={() => setShowMedicalGuide(false)}
                  className="text-teal-700 hover:underline font-bold"
                >
                  Đóng
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white border border-teal-100">
                  <strong>1. Mục tiêu Huyết áp tại nhà (HBPM):</strong> Ngưỡng chuẩn tại nhà là{' '}
                  <strong>&lt;135/85 mmHg</strong> (tối ưu sau đột quỵ giai đoạn ổn định là{' '}
                  <strong>115–130 / 70–80 mmHg</strong>). Không nên để hạ quá thấp (&lt;105/60 mmHg)
                  vì sẽ làm giảm lưu lượng máu tưới não.
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-teal-100">
                  <strong>2. Độ biến thiên Huyết áp (SD &amp; ARV):</strong> Độ lệch chuẩn tâm thu{' '}
                  <strong>SD &lt; 10 mmHg</strong> là rất ổn định. Nếu <strong>SD ≥ 15 mmHg</strong>{' '}
                  (huyết áp lúc vọt cao, lúc tụt thấp) sẽ gây áp lực lớn lên thành mạch não hơn cả
                  huyết áp cao nhẹ nhưng ổn định.
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-teal-100">
                  <strong>3. Áp lực tưới máu não (MAP) &amp; Hiệu áp (PP):</strong>{' '}
                  <strong>MAP = DIA + 1/3(SYS−DIA)</strong> phản ánh áp lực đẩy máu nuôi não (tốt
                  nhất <strong>75–95 mmHg</strong>). <strong>Hiệu áp PP = SYS−DIA</strong> phản ánh
                  độ đàn hồi động mạch (chuẩn <strong>40–55 mmHg</strong>, nếu ≥60 mmHg là thành mạch
                  cứng).
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-teal-100">
                  <strong>4. Nhịp tim nghỉ &amp; Gánh nặng cơ tim (RPP):</strong> Nhịp tim nghỉ tối
                  ưu là <strong>60–79 bpm</strong>. Nếu <strong>&lt;55 bpm</strong> là nhịp chậm (cần
                  lưu ý tác dụng phụ thuốc chẹn beta/hạ áp). <strong>RPP = SYS × Mạch</strong> dưới{' '}
                  <strong>10.000</strong> cho thấy cơ tim không bị quá tải.
                </div>
              </div>
            </div>
          )}

          {/* ===== PHẦN 1: BẢNG ĐỐI CHIẾU TRỰC DIỆN 6 MỐC THỜI GIAN (CHỌN MỐC ĐỂ XEM CHI TIẾT) ===== */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-700" />
                <span>1. Bảng So Sánh Sinh Hiệu Qua 6 Mốc Thời Gian (Bấm vào mốc để phân tích sâu)</span>
              </div>
              <span className="text-[11px] text-slate-500">
                So sánh tự động với kỳ liền trước (Δ)
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-extrabold uppercase">
                    <th className="py-2.5 px-3">Mốc thời gian</th>
                    <th className="py-2.5 px-2.5 text-center">Số lần đo</th>
                    <th className="py-2.5 px-2.5">HA Trung bình (Δ kỳ trước)</th>
                    <th className="py-2.5 px-2.5">Biên độ &amp; Độ lệch (SD)</th>
                    <th className="py-2.5 px-2.5 text-center">MAP / Hiệu áp</th>
                    <th className="py-2.5 px-2.5">Nhịp tim TB (Min–Max)</th>
                    <th className="py-2.5 px-2.5 text-center">Đạt đích (TIR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {milestones.map((m) => {
                    const isSelected = m.id === activeMilestone.id;
                    const bpCls =
                      m.avgSys !== null && m.avgDia !== null
                        ? classifyClinicalBp(m.avgSys, m.avgDia, bpThresholds)
                        : null;

                    return (
                      <tr
                        key={m.id}
                        onClick={() => m.count > 0 && setSelectedMilestoneId(m.id)}
                        className={`transition ${
                          m.count === 0
                            ? 'opacity-50 bg-slate-50/40'
                            : isSelected
                            ? 'bg-teal-50/90 font-semibold cursor-pointer'
                            : 'hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isSelected ? 'bg-teal-600 ring-4 ring-teal-100' : 'bg-slate-300'
                              }`}
                            />
                            <div>
                              <div className="font-extrabold text-slate-900">{m.label}</div>
                              <div className="text-[10px] text-slate-500">{m.subLabel}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-2.5 text-center">
                          {m.count > 0 ? (
                            <span className="font-bold text-slate-800">
                              {m.count} lần
                              <span className="block text-[10px] text-slate-400 font-normal">
                                ({m.daysCount} ngày)
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa có</span>
                          )}
                        </td>

                        <td className="py-2.5 px-2.5">
                          {m.avgSys !== null && m.avgDia !== null ? (
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-black text-slate-900">
                                  {m.avgSys}/{m.avgDia}
                                </span>
                                {bpCls && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${bpCls.badgeClass}`}
                                  >
                                    {bpCls.shortLabel}
                                  </span>
                                )}
                              </div>
                              {m.deltaSysVsPrev !== null && m.deltaDiaVsPrev !== null && (
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  So kỳ trước:{' '}
                                  <strong
                                    className={
                                      Math.abs(m.deltaSysVsPrev) <= 4
                                        ? 'text-teal-700'
                                        : m.deltaSysVsPrev > 4
                                        ? 'text-rose-600'
                                        : 'text-emerald-600'
                                    }
                                  >
                                    {m.deltaSysVsPrev >= 0 ? `+${m.deltaSysVsPrev}` : m.deltaSysVsPrev}/
                                    {m.deltaDiaVsPrev >= 0 ? `+${m.deltaDiaVsPrev}` : m.deltaDiaVsPrev} mmHg
                                  </strong>
                                </div>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-2.5 px-2.5">
                          {m.minSys !== null ? (
                            <div>
                              <div className="text-slate-800 font-bold">
                                {m.minSys}–{m.maxSys} / {m.minDia}–{m.maxDia}
                              </div>
                              {m.sdSys !== null && m.count >= 2 && (
                                <div className="text-[10px] text-slate-500">
                                  Độ lệch SD:{' '}
                                  <strong
                                    className={
                                      m.sdSys >= 15
                                        ? 'text-rose-600'
                                        : m.sdSys >= 10
                                        ? 'text-amber-700'
                                        : 'text-emerald-700'
                                    }
                                  >
                                    ±{m.sdSys} mmHg
                                  </strong>
                                </div>
                              )}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-2.5 px-2.5 text-center">
                          {m.avgMAP !== null && m.avgPP !== null ? (
                            <div>
                              <span className="font-extrabold text-slate-800">
                                MAP {m.avgMAP}
                              </span>
                              <span className="block text-[10px] text-slate-500">
                                Hiệu áp: {m.avgPP} mmHg
                              </span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-2.5 px-2.5">
                          {m.avgPulse !== null ? (
                            <div>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`font-black text-sm ${
                                    m.avgPulse < 55
                                      ? 'text-amber-800'
                                      : m.avgPulse >= 100
                                      ? 'text-rose-700'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  ❤️ {m.avgPulse} bpm
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  ({m.minPulse}–{m.maxPulse})
                                </span>
                              </div>
                              {m.slowPulseCount > 0 ? (
                                <span className="text-[10px] font-bold text-amber-800 block">
                                  ⚠️ {m.slowPulseCount} lần mạch &lt;55
                                </span>
                              ) : m.fastPulseCount > 0 ? (
                                <span className="text-[10px] font-bold text-rose-700 block">
                                  ⚠️ {m.fastPulseCount} lần mạch ≥100
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-700 block">
                                  Nhịp ổn định
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">Chưa ghi</span>
                          )}
                        </td>

                        <td className="py-2.5 px-2.5 text-center">
                          {m.tirPct !== null ? (
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-black border ${
                                m.tirPct >= 80
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : m.tirPct >= 60
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}
                            >
                              {m.tirPct}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===== PHẦN 2: CHỌN MỐC THỜI GIAN ĐỂ XEM PHÂN TÍCH CHUYÊN SÂU ===== */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              2. Phân Tích Chuyên Sâu Theo Mốc Đang Chọn:{' '}
              <span className="text-teal-700">
                {activeMilestone.label} ({activeMilestone.count} lần đo)
              </span>
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {milestones
                .filter((m) => m.count > 0)
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMilestoneId(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      activeMilestone.id === m.id
                        ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
            </div>
          </div>

          {/* 3 Khối Phân Tích Chuyên Sâu: Phân tầng HA, Phân tầng Nhịp tim, và Ma trận 4 Khung Giờ Sinh Học */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {/* Khối A: Phân tầng Huyết Áp & Chỉ số Huyết Động (MAP, PP, SD, ARV) */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-600" />
                  <span>Phân Tầng Huyết Áp &amp; Độ Ổn Định Thành Mạch</span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {distributionStats.total} lần đo
                </span>
              </div>

              {/* Thanh phân bổ 5 vùng HA */}
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
                        Tối ưu (&lt;130/80)
                      </span>
                      <span className="font-black text-slate-900">
                        {distributionStats.bpZones.optimal} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        BT-Cao (130–139)
                      </span>
                      <span className="font-black text-slate-900">
                        {distributionStats.bpZones.normal_high} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Độ 1 (140–159)
                      </span>
                      <span className="font-black text-amber-800">
                        {distributionStats.bpZones.stage1} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                        Độ 2 (≥160/100)
                      </span>
                      <span className="font-black text-rose-700">
                        {distributionStats.bpZones.stage2} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        Thấp (≤{bpThresholds.lowSys}/{bpThresholds.lowDia})
                      </span>
                      <span className="font-black text-sky-800">
                        {distributionStats.bpZones.low} lần
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4 ô chỉ số huyết động học */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 block">Tưới máu não (MAP)</span>
                  <span className="text-sm font-black text-slate-900">
                    {activeMilestone.avgMAP ?? '—'} <small className="font-normal">mmHg</small>
                  </span>
                  <span className="text-[10px] text-emerald-700 block font-semibold">
                    Chuẩn: 75–95
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 block">Hiệu áp (PP)</span>
                  <span className="text-sm font-black text-slate-900">
                    {activeMilestone.avgPP ?? '—'} <small className="font-normal">mmHg</small>
                  </span>
                  <span className="text-[10px] text-slate-500 block">Chuẩn: 40–55</span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 block">Độ lệch (SD Tâm thu)</span>
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
                  <span className="text-[10px] text-slate-500 block">Tốt: &lt;10 mmHg</span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 block">Nhảy áp liên tiếp (ARV)</span>
                  <span className="text-sm font-black text-slate-900">
                    {activeMilestone.arvSys ?? '—'} <small className="font-normal">mmHg</small>
                  </span>
                  <span className="text-[10px] text-slate-500 block">Tốt: &lt;12 mmHg</span>
                </div>
              </div>
            </div>

            {/* Khối B: Phân tầng Nhịp Tim (Mạch) & Gánh nặng cơ tim (RPP) */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-violet-600" />
                  <span>Phân Tích Nhịp Tim (Mạch) &amp; Gánh Nặng Cơ Tim</span>
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
                        Tối ưu (60–79)
                      </span>
                      <span className="font-black text-emerald-800">
                        {distributionStats.hrZones.optimal} lần
                      </span>
                    </div>
                    <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        BT-Cao (80–99)
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
                      <span className="text-[10px] font-bold text-slate-500 block">Mạch TB (Min–Max)</span>
                      <span className="text-sm font-black text-slate-900">
                        {activeMilestone.avgPulse} <small className="font-normal">bpm</small>
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {activeMilestone.minPulse}–{activeMilestone.maxPulse} bpm
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 block">Dao động Mạch (SD)</span>
                      <span className="text-sm font-black text-slate-900">
                        {activeMilestone.sdPulse !== null ? `±${activeMilestone.sdPulse}` : '—'}{' '}
                        <small className="font-normal">bpm</small>
                      </span>
                      <span className="text-[10px] text-slate-500 block">Độ biến thiên</span>
                    </div>

                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-500 block">Gánh cơ tim (RPP)</span>
                      <span
                        className={`text-sm font-black ${
                          (activeMilestone.avgRPP || 0) > 12000
                            ? 'text-rose-600'
                            : (activeMilestone.avgRPP || 0) > 10000
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {activeMilestone.avgRPP
                          ? activeMilestone.avgRPP.toLocaleString('vi-VN')
                          : '—'}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Tốt: &lt;10.000</span>
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

          {/* ===== PHẦN 3: BẢNG PHÂN TÍCH NHỊP SINH HỌC 4 KHUNG GIỜ TRONG NGÀY (SÁNG • TRƯA • CHIỀU • TỐI) ===== */}
          <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  3. Phân Tích Chuyên Sâu Theo 4 Khung Giờ Sinh Học ({activeMilestone.label})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Giúp phát hiện chính xác khung giờ nào trong ngày Bố hay bị tăng huyết áp hoặc chậm nhịp tim
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border self-start sm:self-auto ${circadianAnalysis.circadianPattern.badgeClass}`}
              >
                {circadianAnalysis.circadianPattern.title}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {ALL_SLOTS.map((sl) => {
                const st = circadianAnalysis.slotDetails[sl];
                const isHighestBp =
                  circadianAnalysis.highestBpSlot?.slot === sl &&
                  (st.avgSys || 0) >= bpThresholds.highSys - 5;
                return (
                  <div
                    key={sl}
                    className={`p-3 rounded-xl border bg-white space-y-1.5 ${
                      st.highBpPct >= 50
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-slate-900">
                        {st.emoji} Buổi {st.label}{' '}
                        <span className="text-[10px] font-normal text-slate-500">
                          ({st.timeRange})
                        </span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {st.count} lần
                      </span>
                    </div>

                    {st.count > 0 ? (
                      <>
                        <div className="flex items-baseline justify-between gap-2">
                          <div>
                            <span className="text-lg font-black text-slate-900">
                              {st.avgSys}/{st.avgDia}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-1">mmHg</span>
                          </div>
                          {st.avgPulse && (
                            <span
                              className={`text-xs font-extrabold ${
                                st.avgPulse < 55 ? 'text-amber-800' : 'text-violet-700'
                              }`}
                            >
                              ❤️ {st.avgPulse} bpm
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Min–Max SYS:</span>
                            <span className="font-bold text-slate-800">
                              {st.minSys}–{st.maxSys} mmHg
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">MAP / Hiệu áp:</span>
                            <span className="font-bold text-slate-800">
                              {st.avgMAP} / {st.avgPP} mmHg
                            </span>
                          </div>
                          {st.minPulse !== null && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Dao động Mạch:</span>
                              <span className="font-bold text-slate-800">
                                {st.minPulse}–{st.maxPulse} bpm
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-500">Vượt ngưỡng:</span>
                            <span
                              className={`font-bold ${
                                st.highBpCount > 0 ? 'text-amber-700' : 'text-emerald-700'
                              }`}
                            >
                              {st.highBpCount}/{st.count} lần ({st.highBpPct}%)
                            </span>
                          </div>
                        </div>

                        {isHighestBp && (
                          <div className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                            ⚡ Khung giờ có HA trung bình cao nhất trong ngày
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 italic py-3">
                        Chưa có bản ghi buổi {st.label.toLowerCase()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ===== PHẦN 4: TỔNG HỢP NHẬN ĐỊNH LÂM SÀNG & GỢI Ý TRAO ĐỔI VỚI BÁC SĨ ===== */}
          {clinicalFindings.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-teal-700" />
                <span>4. Nhận Định Y Khoa Tự Động &amp; Điểm Lưu Ý Khi Tái Khám ({activeMilestone.label})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {clinicalFindings.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      item.level === 'alert'
                        ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                        : item.level === 'caution'
                        ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                        : 'bg-emerald-50/70 border-emerald-200 text-slate-900'
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
                    <p className="text-[11px] leading-relaxed opacity-90 pl-5">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
