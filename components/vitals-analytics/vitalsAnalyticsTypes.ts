import type {
  VitalsLogEntry,
  VitalsPeriod,
  BpThresholds,
  DailyLog,
  CareRoutine,
  AlertLevel,
  FamilyMember,
  TimeSlot,
  HealthProfileType,
} from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  classifyClinicalPulse,
  getVietnamDateOffsetStr,
} from '@/lib/config';

export type DateRange = 'today' | '3d' | '7d' | '14d' | '30d' | 'all';

export interface VitalsChartViewProps {
  vitalsLog: VitalsLogEntry[];
  bpThresholds: BpThresholds;
  dailyLogs: DailyLog[];
  careRoutines: CareRoutine[];
  isAdmin: boolean;
  members?: FamilyMember[];
  patientName?: string;
  patientDiagnosis?: string;
  profileType?: HealthProfileType;
  showToast?: (msg: string, type?: 'info' | 'success' | 'warn') => void;
  onDeleteVitals: (id: string) => Promise<void>;
  onSaveVitals: (entry: VitalsLogEntry) => Promise<void>;
  onToggleDailyLog?: (log: DailyLog) => Promise<void>;
  defaultRecorder?: string;
}

export interface PeriodSlotSummary {
  count: number;
  avgSys: number | null;
  avgDia: number | null;
  avgPulse: number | null;
  maxSys: number | null;
  latestDate: string | null;
  latestTime: string | null;
}

export interface VitalsSummaryStats {
  latest: VitalsLogEntry | null;
  previous: VitalsLogEntry | null;
  deltaSys: number;
  deltaDia: number;
  avgSys: number | null;
  avgDia: number | null;
  minSys: number | null;
  maxSys: number | null;
  minDia: number | null;
  maxDia: number | null;
  avgPulse: number | null;
  minPulse: number | null;
  maxPulse: number | null;
  slowPulseCount: number;
  verySlowPulseCount: number;
  fastPulseCount: number;
  avgPP: number | null;
  avgMAP: number | null;
  inTargetBpCount: number;
  normalCount: number;
  warningCount: number;
  criticalCount: number;
  inRangePct: number;
  trend: 'up' | 'down' | 'stable';
  byPeriod: Record<VitalsPeriod, PeriodSlotSummary>;
  availableSlotDays: string[];
  totalReadings: number;
  periodReadingsCount: number;
}

export interface DailyMatrixGroupedRoutine {
  routineId: string;
  routineTitle: string;
  dosage: string;
  category: 'meds' | 'meds_prn' | 'rehab' | 'care';
  doneCount: number;
  expectedCount: number;
  slots: {
    timeSlot: TimeSlot;
    isDone: boolean;
    doneAt?: string;
    doneBy?: string;
  }[];
}

export interface DailyMatrixRow {
  date: string;
  isToday: boolean;
  vitals: VitalsLogEntry[];
  slotStatus: Record<
    TimeSlot,
    {
      expected: number;
      done: number;
      isFutureSlot: boolean;
      status: 'done' | 'partial' | 'missed' | 'pending' | 'none';
    }
  >;
  medsExpected: number;
  medsDone: number;
  rehabExpected: number;
  rehabDone: number;
  careExpected: number;
  careDone: number;
  completedDetails: {
    routineTitle: string;
    category: string;
    timeSlot: TimeSlot;
    doneAt?: string;
    doneBy?: string;
  }[];
  missedDetails: {
    routineTitle: string;
    category: string;
    timeSlot: TimeSlot;
  }[];
  groupedRoutines: DailyMatrixGroupedRoutine[];
}

export interface RoutineStatItem {
  routine: CareRoutine;
  startDate: string;
  activeDays: number;
  expected: number;
  done: number;
  pct: number;
}

export interface VitalsComplianceStats {
  firstTrackedDate: string;
  activeDaysCount: number;
  daysFullMeds: number;
  totalExpectedDoses: number;
  totalDoneDoses: number;
  medsPercentage: number | null;
  totalExpectedRehab: number;
  totalDoneRehab: number;
  rehabPercentage: number | null;
  totalExpectedCare: number;
  totalDoneCare: number;
  asNeededUsedCount: number;
  slotCompliance: Record<TimeSlot, { expected: number; done: number; pct: number }>;
  routineStatsList: RoutineStatItem[];
  dailyMatrix: DailyMatrixRow[];
}

export interface DailyChartPoint {
  date: string;
  label: string;
  fullDate: string;
  weekday: string;
  sys: number;
  dia: number;
  minSys: number;
  maxSys: number;
  minDia: number;
  maxDia: number;
  sysRange: [number, number];
  diaRange: [number, number];
  sysError?: [number, number];
  diaError?: [number, number];
  sysSpan: number;
  diaSpan: number;
  pulse: number | null;
  pp: number;
  readingsCount: number;
  readings: VitalsLogEntry[];
  medsSummary?: string;
}

export const ALL_SLOTS: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];
export const SLOT_RANK: Record<string, number> = {
  morning: 1,
  noon: 2,
  afternoon: 3,
  evening: 4,
};

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '3d', label: '3 ngày' },
  { value: '7d', label: '7 ngày' },
  { value: '14d', label: '14 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: 'all', label: 'Tất cả' },
];

export function periodLabel(period: string): string {
  const cfg = TIME_SLOT_CONFIG[period as keyof typeof TIME_SLOT_CONFIG];
  return cfg ? `${cfg.emoji} ${cfg.label}` : period;
}

export function fmtDateShort(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

export function fmtDateFull(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function getWeekdayVN(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return '';
  const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, 12, 0, 0);
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return days[d.getDay()] || '';
}

export function daysAgo(n: number): string {
  return getVietnamDateOffsetStr(-n);
}

export function alertColors(level: AlertLevel) {
  switch (level) {
    case 'critical':
      return {
        bg: 'bg-vital-danger-bg',
        border: 'border-rose-300',
        text: 'text-rose-700',
        dot: 'bg-vital-danger',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
      };
    case 'warning':
      return {
        bg: 'bg-vital-warning-bg',
        border: 'border-amber-300',
        text: 'text-amber-800',
        dot: 'bg-vital-warning',
        badge: 'bg-amber-100 text-amber-900 border-amber-300',
      };
    default:
      return {
        bg: 'bg-vital-safe-bg',
        border: 'border-emerald-300',
        text: 'text-emerald-800',
        dot: 'bg-vital-safe',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
  }
}

export function evaluatePulse(pulse?: number): {
  status: 'normal' | 'slow' | 'very_slow' | 'fast' | 'none';
  label: string;
  badgeClass: string;
} {
  const pCls = classifyClinicalPulse(pulse);
  if (pCls.category === 'none') {
    return { status: 'none', label: 'Chưa ghi mạch', badgeClass: pCls.badgeClass };
  }
  if (pCls.category === 'very_slow') {
    return {
      status: 'very_slow',
      label: `🔴 Mạch rất chậm (${pulse} bpm)`,
      badgeClass: pCls.badgeClass,
    };
  }
  if (pCls.category === 'slow') {
    return {
      status: 'slow',
      label: `🟡 Mạch hơi chậm (${pulse} bpm)`,
      badgeClass: pCls.badgeClass,
    };
  }
  if (pCls.category === 'fast') {
    return {
      status: 'fast',
      label: `⚠️ ${pCls.shortLabel} (${pulse} bpm)`,
      badgeClass: pCls.badgeClass,
    };
  }
  return {
    status: 'normal',
    label: `❤️ ${pulse} bpm (${pCls.shortLabel})`,
    badgeClass: pCls.badgeClass,
  };
}
