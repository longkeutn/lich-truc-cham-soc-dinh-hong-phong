import type {
  VitalsLogEntry,
  DailyLog,
  CareRoutine,
  TimeSlot,
} from '@/lib/types';
import {
  getVietnamDateOffsetStr,
  getVietnamDateStr,
  detectCurrentTimeSlot,
  compareVitalsAsc,
  normalizeDateStr,
  extractRoutineStartDateStr,
} from '@/lib/config';
import {
  ALL_SLOTS,
  SLOT_RANK,
  type DateRange,
  type DailyMatrixRow,
  type DailyMatrixGroupedRoutine,
  type RoutineStatItem,
  type VitalsComplianceStats,
} from './vitalsAnalyticsTypes';

export function computeVitalsComplianceStats(
  dailyLogs: DailyLog[],
  careRoutines: CareRoutine[],
  normalizedVitals: VitalsLogEntry[],
  filteredLog: VitalsLogEntry[],
  dateRange: DateRange
): VitalsComplianceStats {
  const activeRoutines = careRoutines.filter((r) => r.isActive);
  const medsRoutines = activeRoutines.filter(
    (r) => r.category === 'meds' && r.medType !== 'as_needed'
  );
  const asNeededMeds = activeRoutines.filter(
    (r) => r.category === 'meds' && r.medType === 'as_needed'
  );
  const rehabRoutines = activeRoutines.filter((r) => r.category === 'rehab');
  const careOnlyRoutines = activeRoutines.filter((r) => r.category === 'care');

  const todayStr = getVietnamDateStr();
  const currentSlot = detectCurrentTimeSlot();
  const currentRank = SLOT_RANK[currentSlot] || 1;

  const allDatesWithData: string[] = [];
  for (const l of dailyLogs) {
    const dNorm = normalizeDateStr(l.date);
    if (l.isDone && dNorm) allDatesWithData.push(dNorm);
  }
  for (const v of normalizedVitals) {
    if (v.date) allDatesWithData.push(v.date);
  }
  allDatesWithData.sort();
  const firstTrackedDate = allDatesWithData.length > 0 ? allDatesWithData[0] : todayStr;

  const maxDays =
    dateRange === 'today'
      ? 1
      : dateRange === '3d'
        ? 3
        : dateRange === '7d'
          ? 7
          : dateRange === '14d'
            ? 14
            : 30;

  const daySetForMatrix = new Set<string>();
  for (let i = 0; i < maxDays; i++) {
    const d = getVietnamDateOffsetStr(-i);
    if (d >= firstTrackedDate) {
      daySetForMatrix.add(d);
    }
  }
  for (const v of filteredLog) {
    if (v.date) daySetForMatrix.add(v.date);
  }
  if (daySetForMatrix.size === 0) {
    daySetForMatrix.add(todayStr);
  }
  const candidateDays = Array.from(daySetForMatrix).sort((a, b) => b.localeCompare(a));

  const routineStartMap: Record<string, string> = {};
  const routineStatsMap: Record<string, RoutineStatItem> = {};

  for (const r of activeRoutines) {
    const rawCreated = String(r.createdAt || '').trim();
    const isExplicitDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawCreated);
    const extractedStart = extractRoutineStartDateStr(r.createdAt, r.id);

    let earliestDoneLogDate = '';
    for (const l of dailyLogs) {
      if ((l.routineId === r.id || l.id.includes(r.id)) && l.isDone) {
        const dNorm = normalizeDateStr(l.date);
        if (dNorm && (!earliestDoneLogDate || dNorm < earliestDoneLogDate)) {
          earliestDoneLogDate = dNorm;
        }
      }
    }

    let effectiveStart = extractedStart || earliestDoneLogDate || firstTrackedDate;
    if (!isExplicitDateOnly && earliestDoneLogDate && earliestDoneLogDate < effectiveStart) {
      effectiveStart = earliestDoneLogDate;
    }
    if (effectiveStart < firstTrackedDate) {
      effectiveStart = firstTrackedDate;
    }

    routineStartMap[r.id] = effectiveStart;
    routineStatsMap[r.id] = {
      routine: r,
      startDate: effectiveStart,
      activeDays: candidateDays.filter((d) => d >= effectiveStart).length,
      expected: 0,
      done: 0,
      pct: 0,
    };
  }

  const slotCompliance: Record<TimeSlot, { expected: number; done: number; pct: number }> = {
    morning: { expected: 0, done: 0, pct: 0 },
    noon: { expected: 0, done: 0, pct: 0 },
    afternoon: { expected: 0, done: 0, pct: 0 },
    evening: { expected: 0, done: 0, pct: 0 },
  };

  let totalExpectedDoses = 0;
  let totalDoneDoses = 0;
  let daysFullMeds = 0;
  let totalExpectedRehab = 0;
  let totalDoneRehab = 0;
  let totalExpectedCare = 0;
  let totalDoneCare = 0;
  let asNeededUsedCount = 0;
  const dailyMatrix: DailyMatrixRow[] = [];

  const evalRoutineGroup = (
    routines: CareRoutine[],
    cat: 'meds' | 'rehab' | 'care',
    day: string,
    isToday: boolean,
    dayLogs: DailyLog[],
    slotStatus: DailyMatrixRow['slotStatus'],
    completedDetails: DailyMatrixRow['completedDetails'],
    missedDetails: DailyMatrixRow['missedDetails'],
    groupedRoutines: DailyMatrixGroupedRoutine[]
  ) => {
    let expectedSum = 0;
    let doneSum = 0;

    for (const routine of routines) {
      const routineStartDate = routineStartMap[routine.id] || firstTrackedDate;
      const slots: TimeSlot[] =
        Array.isArray(routine.timeSlots) && routine.timeSlots.length > 0
          ? routine.timeSlots
          : cat === 'meds'
            ? []
            : ['morning'];
      const routineDaySlots: DailyMatrixGroupedRoutine['slots'] = [];

      for (const slot of slots) {
        const slotRank = SLOT_RANK[slot] || 1;
        const matchingLog = dayLogs.find(
          (l) =>
            (l.routineId === routine.id || l.id.includes(routine.id)) &&
            (cat === 'meds' ? l.timeSlot === slot : l.timeSlot === slot || !l.timeSlot) &&
            l.isDone
        );
        const isDone = Boolean(matchingLog);
        if (day < routineStartDate && !isDone) continue;

        const isFutureSlot = isToday && slotRank > currentRank && !isDone;
        const isExpected = !isToday || slotRank <= currentRank || isDone;
        if (cat === 'meds' && isFutureSlot) {
          slotStatus[slot].isFutureSlot = true;
        }

        if (isExpected) {
          expectedSum++;
          if (cat === 'meds') {
            slotStatus[slot].expected++;
            slotCompliance[slot].expected++;
          }
          if (routineStatsMap[routine.id]) routineStatsMap[routine.id].expected++;

          routineDaySlots.push({
            timeSlot: slot,
            isDone,
            doneAt: matchingLog?.doneAt,
            doneBy: matchingLog?.doneBy,
          });

          const detailTitle =
            cat === 'meds' ? `${routine.title} (${routine.dosage})` : routine.title;
          if (isDone) {
            doneSum++;
            if (cat === 'meds') {
              slotStatus[slot].done++;
              slotCompliance[slot].done++;
            }
            if (routineStatsMap[routine.id]) routineStatsMap[routine.id].done++;
            completedDetails.push({
              routineTitle: detailTitle,
              category: cat,
              timeSlot: slot,
              doneAt: matchingLog?.doneAt,
              doneBy: matchingLog?.doneBy,
            });
          } else {
            missedDetails.push({ routineTitle: detailTitle, category: cat, timeSlot: slot });
          }
        }
      }

      if (routineDaySlots.length > 0) {
        groupedRoutines.push({
          routineId: routine.id,
          routineTitle: routine.title,
          dosage: routine.dosage,
          category: cat,
          doneCount: routineDaySlots.filter((s) => s.isDone).length,
          expectedCount: routineDaySlots.length,
          slots: routineDaySlots,
        });
      }
    }

    return { expectedSum, doneSum };
  };

  for (const day of candidateDays) {
    const isToday = day === todayStr;
    const dayLogs = dailyLogs.filter((l) => normalizeDateStr(l.date) === day);
    const dayVitals = normalizedVitals.filter((v) => v.date === day).sort(compareVitalsAsc);

    const completedDetails: DailyMatrixRow['completedDetails'] = [];
    const missedDetails: DailyMatrixRow['missedDetails'] = [];
    const groupedRoutines: DailyMatrixGroupedRoutine[] = [];
    const slotStatus: DailyMatrixRow['slotStatus'] = {
      morning: { expected: 0, done: 0, isFutureSlot: false, status: 'none' },
      noon: { expected: 0, done: 0, isFutureSlot: false, status: 'none' },
      afternoon: { expected: 0, done: 0, isFutureSlot: false, status: 'none' },
      evening: { expected: 0, done: 0, isFutureSlot: false, status: 'none' },
    };

    const medsRes = evalRoutineGroup(
      medsRoutines,
      'meds',
      day,
      isToday,
      dayLogs,
      slotStatus,
      completedDetails,
      missedDetails,
      groupedRoutines
    );

    for (const slot of ALL_SLOTS) {
      const st = slotStatus[slot];
      if (st.expected === 0) st.status = st.isFutureSlot ? 'pending' : 'none';
      else if (st.done === st.expected) st.status = 'done';
      else if (st.done > 0) st.status = 'partial';
      else st.status = 'missed';
    }

    for (const routine of asNeededMeds) {
      const usedLogs = dayLogs.filter(
        (l) => (l.routineId === routine.id || l.id.includes(routine.id)) && l.isDone
      );
      asNeededUsedCount += usedLogs.length;
      for (const ul of usedLogs) {
        completedDetails.push({
          routineTitle: `${routine.title} (Khi cần)`,
          category: 'meds_prn',
          timeSlot: ul.timeSlot || 'morning',
          doneAt: ul.doneAt,
          doneBy: ul.doneBy,
        });
      }
      if (usedLogs.length > 0) {
        groupedRoutines.push({
          routineId: routine.id,
          routineTitle: `${routine.title} (Khi cần)`,
          dosage: routine.dosage,
          category: 'meds_prn',
          doneCount: usedLogs.length,
          expectedCount: usedLogs.length,
          slots: usedLogs.map((ul) => ({
            timeSlot: ul.timeSlot || 'morning',
            isDone: true,
            doneAt: ul.doneAt,
            doneBy: ul.doneBy,
          })),
        });
      }
    }

    const rehabRes = evalRoutineGroup(
      rehabRoutines,
      'rehab',
      day,
      isToday,
      dayLogs,
      slotStatus,
      completedDetails,
      missedDetails,
      groupedRoutines
    );
    const careRes = evalRoutineGroup(
      careOnlyRoutines,
      'care',
      day,
      isToday,
      dayLogs,
      slotStatus,
      completedDetails,
      missedDetails,
      groupedRoutines
    );

    totalExpectedDoses += medsRes.expectedSum;
    totalDoneDoses += medsRes.doneSum;
    if (medsRes.expectedSum > 0 && medsRes.doneSum === medsRes.expectedSum) {
      daysFullMeds++;
    }
    totalExpectedRehab += rehabRes.expectedSum;
    totalDoneRehab += rehabRes.doneSum;
    totalExpectedCare += careRes.expectedSum;
    totalDoneCare += careRes.doneSum;

    dailyMatrix.push({
      date: day,
      isToday,
      vitals: dayVitals,
      slotStatus,
      medsExpected: medsRes.expectedSum,
      medsDone: medsRes.doneSum,
      rehabExpected: rehabRes.expectedSum,
      rehabDone: rehabRes.doneSum,
      careExpected: careRes.expectedSum,
      careDone: careRes.doneSum,
      completedDetails,
      missedDetails,
      groupedRoutines,
    });
  }

  for (const slot of ALL_SLOTS) {
    const sc = slotCompliance[slot];
    sc.pct = sc.expected > 0 ? Math.min(100, Math.round((sc.done / sc.expected) * 100)) : 0;
  }

  const routineStatsList = Object.values(routineStatsMap).map((item) => ({
    ...item,
    pct: item.expected > 0 ? Math.min(100, Math.round((item.done / item.expected) * 100)) : 0,
  }));

  return {
    firstTrackedDate,
    activeDaysCount: candidateDays.length,
    daysFullMeds,
    totalExpectedDoses,
    totalDoneDoses,
    medsPercentage:
      totalExpectedDoses > 0
        ? Math.min(100, Math.round((totalDoneDoses / totalExpectedDoses) * 100))
        : null,
    totalExpectedRehab,
    totalDoneRehab,
    rehabPercentage:
      totalExpectedRehab > 0
        ? Math.min(100, Math.round((totalDoneRehab / totalExpectedRehab) * 100))
        : null,
    totalExpectedCare,
    totalDoneCare,
    asNeededUsedCount,
    slotCompliance,
    routineStatsList,
    dailyMatrix,
  };
}
