import type {
  VitalsLogEntry,
  VitalsPeriod,
  BpThresholds,
} from '@/lib/types';
import {
  isBpInTargetRange,
  getVietnamDateStr,
  compareVitalsAsc,
  compareVitalsDesc,
} from '@/lib/config';
import {
  ALL_SLOTS,
  fmtDateShort,
  fmtDateFull,
  getWeekdayVN,
  type PeriodSlotSummary,
  type VitalsSummaryStats,
  type DailyMatrixRow,
  type DailyChartPoint,
} from './vitalsAnalyticsTypes';

export function computeVitalsSummaryStats(
  normalizedVitals: VitalsLogEntry[],
  filteredLog: VitalsLogEntry[],
  bpThresholds: BpThresholds
): VitalsSummaryStats {
  const desc = [...normalizedVitals].sort(compareVitalsDesc);
  const latest = desc[0] ?? null;
  const previous = desc[1] ?? null;
  const periodEntries = filteredLog.length > 0 ? filteredLog : desc;

  let avgSys: number | null = null;
  let avgDia: number | null = null;
  let minSys: number | null = null;
  let maxSys: number | null = null;
  let minDia: number | null = null;
  let maxDia: number | null = null;
  let avgPulse: number | null = null;
  let minPulse: number | null = null;
  let maxPulse: number | null = null;
  let slowPulseCount = 0;
  let verySlowPulseCount = 0;
  let fastPulseCount = 0;
  let avgPP: number | null = null;
  let avgMAP: number | null = null;
  let inTargetBpCount = 0;
  let normalCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  if (periodEntries.length > 0) {
    let sumSys = 0;
    let sumDia = 0;
    let sumPP = 0;
    let sumMAP = 0;
    let sumPulse = 0;
    let pulseCount = 0;

    minSys = periodEntries[0].sys;
    maxSys = periodEntries[0].sys;
    minDia = periodEntries[0].dia;
    maxDia = periodEntries[0].dia;

    for (const v of periodEntries) {
      sumSys += v.sys;
      sumDia += v.dia;
      const pp = v.sys - v.dia;
      sumPP += pp;
      sumMAP += v.dia + pp / 3;

      if (v.sys < minSys) minSys = v.sys;
      if (v.sys > maxSys) maxSys = v.sys;
      if (v.dia < minDia) minDia = v.dia;
      if (v.dia > maxDia) maxDia = v.dia;

      if (isBpInTargetRange(v.sys, v.dia, bpThresholds)) {
        inTargetBpCount++;
      }

      if (v.alertLevel === 'critical') criticalCount++;
      else if (v.alertLevel === 'warning') warningCount++;
      else normalCount++;

      if (v.pulse && v.pulse > 0) {
        sumPulse += v.pulse;
        pulseCount++;
        if (minPulse === null || v.pulse < minPulse) minPulse = v.pulse;
        if (maxPulse === null || v.pulse > maxPulse) maxPulse = v.pulse;
        if (v.pulse < 60) slowPulseCount++;
        if (v.pulse < 50) verySlowPulseCount++;
        if (v.pulse >= 100) fastPulseCount++;
      }
    }

    const n = periodEntries.length;
    avgSys = Math.round(sumSys / n);
    avgDia = Math.round(sumDia / n);
    avgPP = Math.round(sumPP / n);
    avgMAP = Math.round(sumMAP / n);
    if (pulseCount > 0) {
      avgPulse = Math.round(sumPulse / pulseCount);
    }
  }

  const inRangePct =
    periodEntries.length > 0 ? Math.round((inTargetBpCount / periodEntries.length) * 100) : 100;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  let deltaSys = 0;
  let deltaDia = 0;
  if (latest && previous) {
    deltaSys = latest.sys - previous.sys;
    deltaDia = latest.dia - previous.dia;
  }
  if (desc.length >= 3) {
    const recent3 = desc.slice(0, 3);
    const avgRecent = recent3.reduce((s, v) => s + v.sys, 0) / 3;
    const olderEntries = desc.slice(3, 6);
    if (olderEntries.length >= 2) {
      const avgOlder = olderEntries.reduce((s, v) => s + v.sys, 0) / olderEntries.length;
      const diff = avgRecent - avgOlder;
      if (diff > 5) trend = 'up';
      else if (diff < -5) trend = 'down';
    } else if (latest && previous) {
      if (deltaSys > 6) trend = 'up';
      else if (deltaSys < -6) trend = 'down';
    }
  } else if (latest && previous) {
    if (deltaSys > 6) trend = 'up';
    else if (deltaSys < -6) trend = 'down';
  }

  const emptySlot = (): PeriodSlotSummary => ({
    count: 0,
    avgSys: null,
    avgDia: null,
    avgPulse: null,
    maxSys: null,
    latestDate: null,
    latestTime: null,
  });

  const byPeriod: Record<VitalsPeriod, PeriodSlotSummary> = {
    morning: emptySlot(),
    noon: emptySlot(),
    afternoon: emptySlot(),
    evening: emptySlot(),
  };

  for (const slot of ALL_SLOTS) {
    const slotItems = periodEntries.filter((v) => v.period === slot).sort(compareVitalsDesc);
    if (slotItems.length > 0) {
      const sSys = Math.round(slotItems.reduce((acc, x) => acc + x.sys, 0) / slotItems.length);
      const sDia = Math.round(slotItems.reduce((acc, x) => acc + x.dia, 0) / slotItems.length);
      const sMaxSys = Math.max(...slotItems.map((x) => x.sys));
      const pItems = slotItems.filter((x) => x.pulse && x.pulse > 0);
      const sPulse =
        pItems.length > 0
          ? Math.round(pItems.reduce((acc, x) => acc + (x.pulse || 0), 0) / pItems.length)
          : null;
      byPeriod[slot] = {
        count: slotItems.length,
        avgSys: sSys,
        avgDia: sDia,
        avgPulse: sPulse,
        maxSys: sMaxSys,
        latestDate: slotItems[0].date,
        latestTime: slotItems[0].time,
      };
    }
  }

  const todayStr = getVietnamDateStr();
  const daySet = new Set<string>([todayStr]);
  for (const v of periodEntries) {
    if (v.date) daySet.add(v.date);
  }
  const availableSlotDays = Array.from(daySet).sort((a, b) => b.localeCompare(a));

  return {
    latest,
    previous,
    deltaSys,
    deltaDia,
    avgSys,
    avgDia,
    minSys,
    maxSys,
    minDia,
    maxDia,
    avgPulse,
    minPulse,
    maxPulse,
    slowPulseCount,
    verySlowPulseCount,
    fastPulseCount,
    avgPP,
    avgMAP,
    inTargetBpCount,
    normalCount,
    warningCount,
    criticalCount,
    inRangePct,
    trend,
    byPeriod,
    availableSlotDays,
    totalReadings: normalizedVitals.length,
    periodReadingsCount: periodEntries.length,
  };
}

export function computeDailyChartData(
  filteredLog: VitalsLogEntry[],
  chartGranularity: 'daily_avg' | VitalsPeriod,
  dailyMatrix: DailyMatrixRow[]
): DailyChartPoint[] {
  const sourceList =
    chartGranularity === 'daily_avg'
      ? filteredLog
      : filteredLog.filter((v) => v.period === chartGranularity);

  const dayMap = new Map<string, VitalsLogEntry[]>();
  for (const v of sourceList) {
    if (!v.date) continue;
    const arr = dayMap.get(v.date) || [];
    arr.push(v);
    dayMap.set(v.date, arr);
  }

  const dailyPoints: DailyChartPoint[] = [];
  for (const [dateStr, items] of dayMap.entries()) {
    const sortedItems = [...items].sort(compareVitalsAsc);
    const count = sortedItems.length;
    const avgSys = Math.round(sortedItems.reduce((s, x) => s + x.sys, 0) / count);
    const avgDia = Math.round(sortedItems.reduce((s, x) => s + x.dia, 0) / count);
    const minSys = Math.min(...sortedItems.map((x) => x.sys));
    const maxSys = Math.max(...sortedItems.map((x) => x.sys));
    const minDia = Math.min(...sortedItems.map((x) => x.dia));
    const maxDia = Math.max(...sortedItems.map((x) => x.dia));

    const pulseItems = sortedItems.filter((x) => x.pulse && x.pulse > 0);
    const avgPulse =
      pulseItems.length > 0
        ? Math.round(pulseItems.reduce((s, x) => s + (x.pulse || 0), 0) / pulseItems.length)
        : null;

    const dayMatrix = dailyMatrix.find((d) => d.date === dateStr);
    const medsSummary =
      dayMatrix && dayMatrix.medsExpected > 0
        ? `${dayMatrix.medsDone}/${dayMatrix.medsExpected} cữ thuốc`
        : undefined;

    dailyPoints.push({
      date: dateStr,
      label: fmtDateShort(dateStr),
      fullDate: fmtDateFull(dateStr),
      weekday: getWeekdayVN(dateStr),
      sys: avgSys,
      dia: avgDia,
      minSys,
      maxSys,
      minDia,
      maxDia,
      sysRange: [minSys, maxSys],
      diaRange: [minDia, maxDia],
      sysError: maxSys > minSys ? [avgSys - minSys, maxSys - avgSys] : undefined,
      diaError: maxDia > minDia ? [avgDia - minDia, maxDia - avgDia] : undefined,
      sysSpan: maxSys - minSys,
      diaSpan: maxDia - minDia,
      pulse: avgPulse,
      pp: avgSys - avgDia,
      readingsCount: count,
      readings: sortedItems,
      medsSummary,
    });
  }

  return dailyPoints;
}
