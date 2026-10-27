'use client';

import React, { useMemo, useState } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  ErrorBar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Trash2,
  Edit3,
  X,
  Check,
  Activity,
  Pill,
  Heart,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  ClipboardList,
  Copy,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import type {
  VitalsLogEntry,
  VitalsPeriod,
  BpThresholds,
  DailyLog,
  CareRoutine,
  AlertLevel,
  FamilyMember,
  TimeSlot,
} from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  computeAlertLevel,
  classifyClinicalBp,
  classifyClinicalPulse,
  evaluateVitalReading,
  isBpInTargetRange,
  getVietnamDateOffsetStr,
  getVietnamDateStr,
  detectCurrentTimeSlot,
  compareVitalsAsc,
  compareVitalsDesc,
  normalizeDateStr,
  normalizeTimeStr,
  extractRoutineStartDateStr,
  VITALS_QUICK_NOTE_TAGS,
  isQuickNoteTagSelected,
  toggleQuickNoteTag,
} from '@/lib/config';
import ClinicalVitalsReportSection from './ClinicalVitalsReportSection';

// =============================================
// TYPES & HELPERS
// =============================================

type DateRange = 'today' | '3d' | '7d' | '14d' | '30d' | 'all';

interface VitalsChartViewProps {
  vitalsLog: VitalsLogEntry[];
  bpThresholds: BpThresholds;
  dailyLogs: DailyLog[];
  careRoutines: CareRoutine[];
  isAdmin: boolean;
  members?: FamilyMember[];
  patientName?: string;
  showToast?: (msg: string, type?: 'info' | 'success' | 'warn') => void;
  onDeleteVitals: (id: string) => Promise<void>;
  onSaveVitals: (entry: VitalsLogEntry) => Promise<void>;
  onToggleDailyLog?: (log: DailyLog) => Promise<void>;
  defaultRecorder?: string;
}

const ALL_SLOTS: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];
const SLOT_RANK: Record<string, number> = { morning: 1, noon: 2, afternoon: 3, evening: 4 };

/** Lấy label tiếng Việt cho buổi đo */
function periodLabel(period: string): string {
  const cfg = TIME_SLOT_CONFIG[period as keyof typeof TIME_SLOT_CONFIG];
  return cfg ? `${cfg.emoji} ${cfg.label}` : period;
}

/** Format ngày YYYY-MM-DD → DD/MM */
function fmtDateShort(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

/** Format ngày YYYY-MM-DD → DD/MM/YYYY */
function fmtDateFull(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Lấy thứ trong tuần tiếng Việt từ YYYY-MM-DD */
function getWeekdayVN(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return '';
  const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, 12, 0, 0);
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return days[d.getDay()] || '';
}

/** Tính n ngày trước theo đúng múi giờ Việt Nam (UTC+7) */
function daysAgo(n: number): string {
  return getVietnamDateOffsetStr(-n);
}

/** Màu nền/border cho alert level */
function alertColors(level: AlertLevel) {
  switch (level) {
    case 'critical':
      return {
        bg: 'bg-rose-50',
        border: 'border-rose-300',
        text: 'text-rose-700',
        dot: 'bg-rose-500',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
      };
    case 'warning':
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    default:
      return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
  }
}

/** Label alert level */
function alertLabel(level: AlertLevel): string {
  switch (level) {
    case 'critical':
      return '🔴 Nguy hiểm';
    case 'warning':
      return '🟡 Cảnh báo';
    default:
      return '🟢 Bình thường';
  }
}

/** Đánh giá nhịp tim (Mạch) đồng bộ 100% với classifyClinicalPulse */
function evaluatePulse(pulse?: number): {
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

// =============================================
// COMPONENT CHÍNH
// =============================================

export function VitalsChartView({
  vitalsLog,
  bpThresholds,
  dailyLogs,
  careRoutines,
  members = [],
  patientName = 'Đinh Hồng Phong',
  showToast,
  onDeleteVitals,
  onSaveVitals,
  onToggleDailyLog,
  defaultRecorder = 'Mẹ',
}: VitalsChartViewProps) {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // State bật/tắt giải thích nhanh trên 4 thẻ đầu trang (mặc định ẩn gọn gàng)
  const [activeCardInfo, setActiveCardInfo] = useState<number | null>(null);

  // State chế độ hiển thị biểu đồ ('chart' | 'timeline')
  const [chartViewMode, setChartViewMode] = useState<'chart' | 'timeline'>('chart');

  // State gom điểm biểu đồ theo Ngày ('daily_avg' = TB cả ngày 1 điểm/ngày, hoặc lọc riêng 1 buổi qua các ngày)
  const [chartGranularity, setChartGranularity] = useState<'daily_avg' | VitalsPeriod>('daily_avg');

  // State chọn ngày cho thẻ "Diễn biến 4 buổi trong ngày" ('today' = ngày hôm nay, hoặc 'YYYY-MM-DD', hoặc 'avg' = TB nhiều ngày)
  const [selectedSlotDayMode, setSelectedSlotDayMode] = useState<string>('today');

  // State mở rộng dòng ngày trong Bảng Nhật Ký Chéo Ngày + giới hạn mặc định 5 ngày gọn gàng
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [dailyMatrixExpanded, setDailyMatrixExpanded] = useState<boolean>(false);
  const [dailyMatrixFilter, setDailyMatrixFilter] = useState<'all' | 'attention'>('all');

  // State đóng/mở bảng phân tích chi tiết từng đầu việc Checklist (mặc định đóng gọn để trang thoáng)
  const [showRoutineBreakdown, setShowRoutineBreakdown] = useState<boolean>(false);

  // State Modal Tóm tắt tái khám cho Bác sĩ / Gia đình
  const [showDoctorReportModal, setShowDoctorReportModal] = useState<boolean>(false);
  const [doctorReportTab, setDoctorReportTab] = useState<'sheet' | 'zalo'>('sheet');
  const [copiedDoctorReport, setCopiedDoctorReport] = useState<boolean>(false);

  // ===== State sửa bản ghi huyết áp =====
  const [editingEntry, setEditingEntry] = useState<VitalsLogEntry | null>(null);
  const [editSys, setEditSys] = useState('');
  const [editDia, setEditDia] = useState('');
  const [editPulse, setEditPulse] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPeriod, setEditPeriod] = useState<VitalsPeriod>('morning');
  const [editRecorder, setEditRecorder] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // ===== Chuẩn hóa định dạng ngày YYYY-MM-DD, giờ HH:mm (24h) & tính lại alertLevel chuẩn lâm sàng (HA + Mạch) =====
  const normalizedVitals = useMemo(() => {
    return vitalsLog.map((v) => ({
      ...v,
      date: normalizeDateStr(v.date),
      time: normalizeTimeStr(v.time),
      alertLevel: computeAlertLevel(v.sys, v.dia, bpThresholds, v.pulse),
    }));
  }, [vitalsLog, bpThresholds]);

  // ===== Lọc dữ liệu huyết áp theo khoảng thời gian (Sắp xếp tăng dần Cũ -> Mới chuẩn xác) =====
  const filteredLog = useMemo(() => {
    const sorted = [...normalizedVitals].sort(compareVitalsAsc);

    if (dateRange === 'all') return sorted;

    const days =
      dateRange === 'today'
        ? 1
        : dateRange === '3d'
          ? 3
          : dateRange === '7d'
            ? 7
            : dateRange === '14d'
              ? 14
              : 30;
    const cutoff = daysAgo(days - 1);
    return sorted.filter((v) => v.date >= cutoff);
  }, [normalizedVitals, dateRange]);

  // ===== PHÂN TÍCH SINH HIỆU CHUYÊN SÂU (HA, MIN-MAX, MẠCH, HIỆU ÁP, MAP, THEO BUỔI) =====
  const summaryStats = useMemo(() => {
    // Sắp xếp giảm dần theo ngày giờ chuẩn xác tuyệt đối để lấy bản ghi mới nhất
    const desc = [...normalizedVitals].sort(compareVitalsDesc);

    const latest = desc[0] ?? null;
    const previous = desc[1] ?? null;

    // Tập dữ liệu đang lọc (nếu bộ lọc rỗng thì fallback về desc)
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
    let slowPulseCount = 0; // < 60 bpm (đồng bộ chuẩn lâm sàng)
    let verySlowPulseCount = 0; // < 50 bpm
    let fastPulseCount = 0; // >= 100 bpm
    let avgPP: number | null = null; // Hiệu áp TB (SYS - DIA)
    let avgMAP: number | null = null; // Huyết áp TB động mạch (DIA + 1/3 PP)
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

    // Xu hướng (so sánh trung bình nửa sau với nửa đầu hoặc lần gần nhất với lần trước)
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

    // Phân tích trung bình theo 4 buổi qua nhiều ngày (kèm ngày đo gần nhất của buổi đó)
    const byPeriod: Record<
      VitalsPeriod,
      {
        count: number;
        avgSys: number | null;
        avgDia: number | null;
        avgPulse: number | null;
        maxSys: number | null;
        latestDate: string | null;
        latestTime: string | null;
      }
    > = {
      morning: { count: 0, avgSys: null, avgDia: null, avgPulse: null, maxSys: null, latestDate: null, latestTime: null },
      noon: { count: 0, avgSys: null, avgDia: null, avgPulse: null, maxSys: null, latestDate: null, latestTime: null },
      afternoon: { count: 0, avgSys: null, avgDia: null, avgPulse: null, maxSys: null, latestDate: null, latestTime: null },
      evening: { count: 0, avgSys: null, avgDia: null, avgPulse: null, maxSys: null, latestDate: null, latestTime: null },
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

    // Danh sách các ngày có đo trong kỳ (sắp xếp mới nhất lên đầu, luôn có ngày hôm nay ở đầu)
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
  }, [normalizedVitals, filteredLog, bpThresholds]);

  // ===== THỐNG KÊ TUÂN THỦ & ĐỐI CHIẾU CHÉO HÀNG NGÀY (SỬA TRIỆT ĐỂ LỖI 19% ẢO) =====
  const complianceStats = useMemo(() => {
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

    // 1. Tìm ngày đầu tiên gia đình bắt đầu ghi sổ (tránh cộng mẫu số các ngày chưa dùng app!)
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

    // 2. Xác định danh sách ngày cần đánh giá theo bộ lọc hiện tại (today, 3d, 7d, 14d, 30d, all)
    const maxDays =
      dateRange === 'today'
        ? 1
        : dateRange === '3d'
          ? 3
          : dateRange === '7d'
            ? 7
            : dateRange === '14d'
              ? 14
              : dateRange === '30d'
                ? 30
                : 30;
    const daySetForMatrix = new Set<string>();
    for (let i = 0; i < maxDays; i++) {
      const d = getVietnamDateOffsetStr(-i);
      // Chỉ tính từ ngày bắt đầu sử dụng sổ trở đi!
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

    let totalExpectedDoses = 0;
    let totalDoneDoses = 0;
    let daysFullMeds = 0;

    let totalExpectedRehab = 0;
    let totalDoneRehab = 0;

    let totalExpectedCare = 0;
    let totalDoneCare = 0;

    let asNeededUsedCount = 0;

    // Thống kê theo từng đầu việc cụ thể (kèm ngày bắt đầu áp dụng riêng của từng thuốc/bài tập)
    const routineStartMap: Record<string, string> = {};
    const routineStatsMap: Record<
      string,
      {
        routine: CareRoutine;
        startDate: string;
        activeDays: number;
        expected: number;
        done: number;
        pct: number;
      }
    > = {};

    for (const r of activeRoutines) {
      const rawCreated = String(r.createdAt || '').trim();
      const isExplicitDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawCreated);
      const extractedStart = extractRoutineStartDateStr(r.createdAt, r.id);

      // Tìm ngày sớm nhất đầu việc này thực tế được tích hoàn thành trong DailyLogs
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
      // Nếu createdAt là timestamp tự động nhưng thực tế đã có log tích từ ngày trước đó thì ưu tiên ngày có log
      if (!isExplicitDateOnly && earliestDoneLogDate && earliestDoneLogDate < effectiveStart) {
        effectiveStart = earliestDoneLogDate;
      }
      // Không tính lùi về trước ngày gia đình bắt đầu dùng sổ
      if (effectiveStart < firstTrackedDate) {
        effectiveStart = firstTrackedDate;
      }

      routineStartMap[r.id] = effectiveStart;
      const activeDaysForRoutine = candidateDays.filter((d) => d >= effectiveStart).length;

      routineStatsMap[r.id] = {
        routine: r,
        startDate: effectiveStart,
        activeDays: activeDaysForRoutine,
        expected: 0,
        done: 0,
        pct: 0,
      };
    }

    // Thống kê tuân thủ thuốc theo 4 buổi (Sáng, Trưa, Chiều, Tối)
    const slotCompliance: Record<TimeSlot, { expected: number; done: number; pct: number }> = {
      morning: { expected: 0, done: 0, pct: 0 },
      noon: { expected: 0, done: 0, pct: 0 },
      afternoon: { expected: 0, done: 0, pct: 0 },
      evening: { expected: 0, done: 0, pct: 0 },
    };

    // Bảng đối chiếu từng ngày (Daily Cross-Reference Matrix)
    const dailyMatrix: {
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
      groupedRoutines: {
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
      }[];
    }[] = [];

    for (const day of candidateDays) {
      const isToday = day === todayStr;
      const dayLogs = dailyLogs.filter((l) => normalizeDateStr(l.date) === day);
      const dayVitals = normalizedVitals
        .filter((v) => v.date === day)
        .sort(compareVitalsAsc);

      let dayExpectedDoses = 0;
      let dayDoneDoses = 0;
      let dayExpectedRehab = 0;
      let dayDoneRehab = 0;
      let dayExpectedCare = 0;
      let dayDoneCare = 0;

      const completedDetails: {
        routineTitle: string;
        category: string;
        timeSlot: TimeSlot;
        doneAt?: string;
        doneBy?: string;
      }[] = [];
      const missedDetails: {
        routineTitle: string;
        category: string;
        timeSlot: TimeSlot;
      }[] = [];
      const groupedRoutines: {
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
      }[] = [];

      const slotStatus: Record<
        TimeSlot,
        {
          expected: number;
          done: number;
          isFutureSlot: boolean;
          status: 'done' | 'partial' | 'missed' | 'pending' | 'none';
        }
      > = {
        morning: { expected: 0, done: 0, isFutureSlot: false, status: 'none' },
        noon: { expected: 0, done: 0, isFutureSlot: false, status: 'none' },
        afternoon: { expected: 0, done: 0, isFutureSlot: false, status: 'none' },
        evening: { expected: 0, done: 0, isFutureSlot: false, status: 'none' },
      };

      // 1) Thuốc định kỳ (Chỉ tính từ ngày bắt đầu áp dụng của từng loại thuốc!)
      for (const routine of medsRoutines) {
        const routineStartDate = routineStartMap[routine.id] || firstTrackedDate;
        const slots = Array.isArray(routine.timeSlots) ? routine.timeSlots : [];
        const routineDaySlots: {
          timeSlot: TimeSlot;
          isDone: boolean;
          doneAt?: string;
          doneBy?: string;
        }[] = [];

        for (const slot of slots) {
          const slotRank = SLOT_RANK[slot] || 1;
          const matchingLog = dayLogs.find(
            (l) =>
              (l.routineId === routine.id || l.id.includes(routine.id)) &&
              l.timeSlot === slot &&
              l.isDone
          );
          const isDone = Boolean(matchingLog);

          // Nếu ngày đang xét diễn ra TRƯỚC ngày bắt đầu áp dụng thuốc mới (và không có tích thực tế) -> BỎ QUA!
          if (day < routineStartDate && !isDone) {
            continue;
          }

          const isFutureSlot = isToday && slotRank > currentRank && !isDone;
          const isExpected = !isToday || slotRank <= currentRank || isDone;

          if (isFutureSlot) {
            slotStatus[slot].isFutureSlot = true;
          }

          if (isExpected) {
            dayExpectedDoses++;
            slotStatus[slot].expected++;
            slotCompliance[slot].expected++;
            if (routineStatsMap[routine.id]) routineStatsMap[routine.id].expected++;

            routineDaySlots.push({
              timeSlot: slot,
              isDone,
              doneAt: matchingLog?.doneAt,
              doneBy: matchingLog?.doneBy,
            });

            if (isDone) {
              dayDoneDoses++;
              slotStatus[slot].done++;
              slotCompliance[slot].done++;
              if (routineStatsMap[routine.id]) routineStatsMap[routine.id].done++;
              completedDetails.push({
                routineTitle: `${routine.title} (${routine.dosage})`,
                category: 'meds',
                timeSlot: slot,
                doneAt: matchingLog?.doneAt,
                doneBy: matchingLog?.doneBy,
              });
            } else {
              missedDetails.push({
                routineTitle: `${routine.title} (${routine.dosage})`,
                category: 'meds',
                timeSlot: slot,
              });
            }
          }
        }

        if (routineDaySlots.length > 0) {
          groupedRoutines.push({
            routineId: routine.id,
            routineTitle: routine.title,
            dosage: routine.dosage,
            category: 'meds',
            doneCount: routineDaySlots.filter((s) => s.isDone).length,
            expectedCount: routineDaySlots.length,
            slots: routineDaySlots,
          });
        }
      }

      // Tính trạng thái từng buổi cho ngày đó
      for (const slot of ALL_SLOTS) {
        const st = slotStatus[slot];
        if (st.expected === 0) {
          st.status = st.isFutureSlot ? 'pending' : 'none';
        } else if (st.done === st.expected) {
          st.status = 'done';
        } else if (st.done > 0) {
          st.status = 'partial';
        } else {
          st.status = 'missed';
        }
      }

      // 2) Thuốc uống khi cần
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

      // 3) Bài tập Phục hồi chức năng (PHCN) — Chỉ tính từ ngày bắt đầu áp dụng của từng bài tập!
      for (const routine of rehabRoutines) {
        const routineStartDate = routineStartMap[routine.id] || firstTrackedDate;
        const slots: TimeSlot[] =
          Array.isArray(routine.timeSlots) && routine.timeSlots.length > 0
            ? routine.timeSlots
            : ['morning'];
        const routineDaySlots: {
          timeSlot: TimeSlot;
          isDone: boolean;
          doneAt?: string;
          doneBy?: string;
        }[] = [];

        for (const slot of slots) {
          const slotRank = SLOT_RANK[slot] || 1;
          const matchingLog = dayLogs.find(
            (l) =>
              (l.routineId === routine.id || l.id.includes(routine.id)) &&
              (l.timeSlot === slot || !l.timeSlot) &&
              l.isDone
          );
          const isDone = Boolean(matchingLog);

          // Nếu ngày đang xét diễn ra TRƯỚC ngày bắt đầu áp dụng bài tập mới -> BỎ QUA!
          if (day < routineStartDate && !isDone) {
            continue;
          }

          const isExpected = !isToday || slotRank <= currentRank || isDone;

          if (isExpected) {
            dayExpectedRehab++;
            if (routineStatsMap[routine.id]) routineStatsMap[routine.id].expected++;
            routineDaySlots.push({
              timeSlot: slot,
              isDone,
              doneAt: matchingLog?.doneAt,
              doneBy: matchingLog?.doneBy,
            });
            if (isDone) {
              dayDoneRehab++;
              if (routineStatsMap[routine.id]) routineStatsMap[routine.id].done++;
              completedDetails.push({
                routineTitle: routine.title,
                category: 'rehab',
                timeSlot: slot,
                doneAt: matchingLog?.doneAt,
                doneBy: matchingLog?.doneBy,
              });
            } else {
              missedDetails.push({
                routineTitle: routine.title,
                category: 'rehab',
                timeSlot: slot,
              });
            }
          }
        }

        if (routineDaySlots.length > 0) {
          groupedRoutines.push({
            routineId: routine.id,
            routineTitle: routine.title,
            dosage: routine.dosage,
            category: 'rehab',
            doneCount: routineDaySlots.filter((s) => s.isDone).length,
            expectedCount: routineDaySlots.length,
            slots: routineDaySlots,
          });
        }
      }

      // 4) Chăm sóc & Dinh dưỡng — Chỉ tính từ ngày bắt đầu áp dụng của từng mục chăm sóc!
      for (const routine of careOnlyRoutines) {
        const routineStartDate = routineStartMap[routine.id] || firstTrackedDate;
        const slots: TimeSlot[] =
          Array.isArray(routine.timeSlots) && routine.timeSlots.length > 0
            ? routine.timeSlots
            : ['morning'];
        const routineDaySlots: {
          timeSlot: TimeSlot;
          isDone: boolean;
          doneAt?: string;
          doneBy?: string;
        }[] = [];

        for (const slot of slots) {
          const slotRank = SLOT_RANK[slot] || 1;
          const matchingLog = dayLogs.find(
            (l) =>
              (l.routineId === routine.id || l.id.includes(routine.id)) &&
              (l.timeSlot === slot || !l.timeSlot) &&
              l.isDone
          );
          const isDone = Boolean(matchingLog);

          // Nếu ngày đang xét diễn ra TRƯỚC ngày bắt đầu áp dụng mục chăm sóc mới -> BỎ QUA!
          if (day < routineStartDate && !isDone) {
            continue;
          }

          const isExpected = !isToday || slotRank <= currentRank || isDone;

          if (isExpected) {
            dayExpectedCare++;
            if (routineStatsMap[routine.id]) routineStatsMap[routine.id].expected++;
            routineDaySlots.push({
              timeSlot: slot,
              isDone,
              doneAt: matchingLog?.doneAt,
              doneBy: matchingLog?.doneBy,
            });
            if (isDone) {
              dayDoneCare++;
              if (routineStatsMap[routine.id]) routineStatsMap[routine.id].done++;
              completedDetails.push({
                routineTitle: routine.title,
                category: 'care',
                timeSlot: slot,
                doneAt: matchingLog?.doneAt,
                doneBy: matchingLog?.doneBy,
              });
            } else {
              missedDetails.push({
                routineTitle: routine.title,
                category: 'care',
                timeSlot: slot,
              });
            }
          }
        }

        if (routineDaySlots.length > 0) {
          groupedRoutines.push({
            routineId: routine.id,
            routineTitle: routine.title,
            dosage: routine.dosage,
            category: 'care',
            doneCount: routineDaySlots.filter((s) => s.isDone).length,
            expectedCount: routineDaySlots.length,
            slots: routineDaySlots,
          });
        }
      }

      totalExpectedDoses += dayExpectedDoses;
      totalDoneDoses += dayDoneDoses;
      if (dayExpectedDoses > 0 && dayDoneDoses === dayExpectedDoses) {
        daysFullMeds++;
      }

      totalExpectedRehab += dayExpectedRehab;
      totalDoneRehab += dayDoneRehab;

      totalExpectedCare += dayExpectedCare;
      totalDoneCare += dayDoneCare;

      dailyMatrix.push({
        date: day,
        isToday,
        vitals: dayVitals,
        slotStatus,
        medsExpected: dayExpectedDoses,
        medsDone: dayDoneDoses,
        rehabExpected: dayExpectedRehab,
        rehabDone: dayDoneRehab,
        careExpected: dayExpectedCare,
        careDone: dayDoneCare,
        completedDetails,
        missedDetails,
        groupedRoutines,
      });
    }

    // Tính % cho từng buổi
    for (const slot of ALL_SLOTS) {
      const sc = slotCompliance[slot];
      sc.pct = sc.expected > 0 ? Math.min(100, Math.round((sc.done / sc.expected) * 100)) : 0;
    }

    // Tính % cho từng đầu việc
    const routineStatsList = Object.values(routineStatsMap).map((item) => ({
      ...item,
      pct: item.expected > 0 ? Math.min(100, Math.round((item.done / item.expected) * 100)) : 0,
    }));

    const medsPercentage =
      totalExpectedDoses > 0
        ? Math.min(100, Math.round((totalDoneDoses / totalExpectedDoses) * 100))
        : null;

    const rehabPercentage =
      totalExpectedRehab > 0
        ? Math.min(100, Math.round((totalDoneRehab / totalExpectedRehab) * 100))
        : null;

    return {
      firstTrackedDate,
      activeDaysCount: candidateDays.length,
      daysFullMeds,
      totalExpectedDoses,
      totalDoneDoses,
      medsPercentage,
      totalExpectedRehab,
      totalDoneRehab,
      rehabPercentage,
      totalExpectedCare,
      totalDoneCare,
      asNeededUsedCount,
      slotCompliance,
      routineStatsList,
      dailyMatrix,
    };
  }, [dailyLogs, careRoutines, normalizedVitals, dateRange]);

  // ===== Dữ liệu cho biểu đồ Recharts (Gom theo NGÀY: Mỗi ngày chỉ 1 điểm gọn gàng, không bị rối khi đo 4 lần/ngày) =====
  const chartData = useMemo(() => {
    const sourceList =
      chartGranularity === 'daily_avg'
        ? filteredLog
        : filteredLog.filter((v) => v.period === chartGranularity);

    // Gom nhóm theo ngày YYYY-MM-DD (đã được sort tăng dần theo thời gian)
    const dayMap = new Map<string, VitalsLogEntry[]>();
    for (const v of sourceList) {
      if (!v.date) continue;
      const arr = dayMap.get(v.date) || [];
      arr.push(v);
      dayMap.set(v.date, arr);
    }

    const dailyPoints: {
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
    }[] = [];

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

      const dayMatrix = complianceStats.dailyMatrix.find((d) => d.date === dateStr);
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
  }, [filteredLog, chartGranularity, complianceStats.dailyMatrix]);

  // ===== TẠO NỘI DUNG TÓM TẮT CHO BÁC SĨ / GIA ĐÌNH (COPY ZALO 1 CHẠM) =====
  const buildDoctorSummaryText = (): string => {
    const rangeLabel =
      dateRange === 'today'
        ? 'Hôm nay'
        : dateRange === '3d'
          ? '3 ngày qua'
          : dateRange === '7d'
            ? '7 ngày qua'
            : dateRange === '14d'
              ? '14 ngày qua'
              : dateRange === '30d'
                ? '30 ngày qua'
                : 'Toàn bộ lịch sử';
    const todayStr = getVietnamDateStr();
    const lines: string[] = [];
    lines.push(`🩺 BÁO CÁO THEO DÕI HUYẾT ÁP & SỨC KHỎE TẠI NHÀ — BỆNH NHÂN: ${patientName.toUpperCase()}`);
    lines.push(`📌 Bệnh cảnh: Sau mổ xuất huyết não, không liệt, tự đi lại & tập PHCN tại nhà, bán manh trái, đang chờ lịch mổ ghép sọ (6–8 tuần).`);
    lines.push(`📅 Kỳ tổng hợp: ${rangeLabel} (Cập nhật ngày ${fmtDateFull(todayStr)})`);
    lines.push(`────────────────────`);

    // Tính nhanh độ ổn định (mức chênh lệch giữa các lần đo)
    const periodEntries = filteredLog.length > 0 ? filteredLog : normalizedVitals;
    let sdSysVal: number | null = null;
    if (periodEntries.length >= 2 && summaryStats.avgSys !== null) {
      const mean = summaryStats.avgSys;
      const variance =
        periodEntries.reduce((s, e) => s + Math.pow(e.sys - mean, 2), 0) /
        (periodEntries.length - 1);
      sdSysVal = Math.round(Math.sqrt(variance) * 10) / 10;
    }

    lines.push(`1️⃣ CHỈ SỐ HUYẾT ÁP (${summaryStats.periodReadingsCount} lần đo):`);
    if (summaryStats.avgSys !== null) {
      lines.push(
        `• Trung bình kỳ: ${summaryStats.avgSys}/${summaryStats.avgDia} mmHg${
          sdSysVal !== null ? ` (Độ ổn định / chênh lệch ±${sdSysVal} mmHg)` : ''
        }`
      );
      lines.push(
        `• Khoảng dao động: Số trên ${summaryStats.minSys}–${summaryStats.maxSys} mmHg | Số dưới ${summaryStats.minDia}–${summaryStats.maxDia} mmHg`
      );
      lines.push(
        `• Tỷ lệ đạt chuẩn an toàn: ${summaryStats.inRangePct}% (${summaryStats.inTargetBpCount}/${summaryStats.periodReadingsCount} lần đo đạt chuẩn)`
      );
      lines.push(
        `• Độ chênh 2 số TB: ${summaryStats.avgPP} mmHg (chuẩn 40–55) | Áp lực máu nuôi não TB: ${summaryStats.avgMAP} mmHg (chuẩn 75–95)`
      );
    }
    if (summaryStats.latest) {
      lines.push(
        `• Lần đo gần nhất: ${summaryStats.latest.sys}/${summaryStats.latest.dia} mmHg${
          summaryStats.latest.pulse ? ` - Mạch ${summaryStats.latest.pulse} bpm` : ''
        } (${fmtDateShort(summaryStats.latest.date)} ${summaryStats.latest.time})`
      );
    }

    // So sánh nhanh đa mốc (Hôm nay / 3 ngày / 7 ngày / 30 ngày)
    const milestonesQuick = [
      { label: 'Hôm nay', cutoff: todayStr },
      { label: '3 ngày gần nhất', cutoff: getVietnamDateOffsetStr(-2) },
      { label: '7 ngày qua', cutoff: getVietnamDateOffsetStr(-6) },
      { label: '30 ngày qua', cutoff: getVietnamDateOffsetStr(-29) },
    ];
    lines.push(`• Đối chiếu theo các mốc thời gian:`);
    for (const mq of milestonesQuick) {
      const mItems = normalizedVitals.filter((v) => v.date >= mq.cutoff);
      if (mItems.length > 0) {
        const mSys = Math.round(mItems.reduce((s, x) => s + x.sys, 0) / mItems.length);
        const mDia = Math.round(mItems.reduce((s, x) => s + x.dia, 0) / mItems.length);
        const pItems = mItems.filter((x) => x.pulse && x.pulse > 0);
        const mPulse =
          pItems.length > 0
            ? Math.round(pItems.reduce((s, x) => s + (x.pulse || 0), 0) / pItems.length)
            : null;
        lines.push(
          `  - ${mq.label} (${mItems.length} lần): TB ${mSys}/${mDia} mmHg${
            mPulse ? ` · Mạch TB ${mPulse} bpm` : ''
          }`
        );
      }
    }

    lines.push(`────────────────────`);
    lines.push(`2️⃣ NHỊP TIM (MẠCH) & DIỄN BIẾN 4 BUỔI TRONG NGÀY:`);
    if (summaryStats.avgPulse !== null) {
      lines.push(
        `• Nhịp tim TB: ${summaryStats.avgPulse} bpm (Thấp–Cao nhất: ${summaryStats.minPulse}–${summaryStats.maxPulse} bpm)`
      );
      if (summaryStats.slowPulseCount > 0) {
        lines.push(
          `  ⚠️ Lưu ý: Có ${summaryStats.slowPulseCount} lần đo nhịp tim dưới 60 bpm${
            summaryStats.verySlowPulseCount > 0
              ? ` (trong đó ${summaryStats.verySlowPulseCount} lần <50 bpm)`
              : ''
          } — cần báo Bác sĩ xem xét khi tái khám.`
        );
      }
      if (summaryStats.fastPulseCount > 0) {
        lines.push(`  ⚠️ Lưu ý: Có ${summaryStats.fastPulseCount} lần đo nhịp tim ≥ 100 bpm.`);
      }
    }
    ALL_SLOTS.forEach((slot) => {
      const p = summaryStats.byPeriod[slot];
      if (p.count > 0) {
        lines.push(
          `• ${periodLabel(slot)} (${p.count} lần): TB ${p.avgSys}/${p.avgDia} mmHg (Cao nhất ${p.maxSys})${
            p.avgPulse ? ` · Mạch TB ${p.avgPulse} bpm` : ''
          }`
        );
      }
    });
    if (
      summaryStats.byPeriod.morning.avgSys !== null &&
      summaryStats.byPeriod.evening.avgSys !== null
    ) {
      const meDiff =
        summaryStats.byPeriod.morning.avgSys - summaryStats.byPeriod.evening.avgSys;
      lines.push(
        `• So sánh Sáng – Tối: ${
          meDiff >= 0 ? `+${meDiff}` : meDiff
        } mmHg (${
          Math.abs(meDiff) <= 10
            ? 'Sáng và Tối cân bằng'
            : meDiff > 10
            ? 'Buổi Sáng thường cao hơn Tối'
            : 'Buổi Tối thường cao hơn Sáng'
        })`
      );
    }

    lines.push(`────────────────────`);
    lines.push(
      `3️⃣ TUÂN THỦ THUỐC & PHỤC HỒI CHỨC NĂNG (${complianceStats.activeDaysCount} ngày ghi sổ từ ${fmtDateShort(
        complianceStats.firstTrackedDate
      )}):`
    );
    if (complianceStats.medsPercentage !== null) {
      lines.push(
        `• Uống thuốc định kỳ: Đạt ${complianceStats.medsPercentage}% (${complianceStats.totalDoneDoses}/${complianceStats.totalExpectedDoses} cữ - ${complianceStats.daysFullMeds}/${complianceStats.activeDaysCount} ngày uống đủ 100%)`
      );
    }
    if (complianceStats.totalExpectedRehab > 0) {
      lines.push(
        `• Tập Phục hồi chức năng: Đạt ${complianceStats.rehabPercentage}% (${complianceStats.totalDoneRehab}/${complianceStats.totalExpectedRehab} buổi tập)`
      );
    }
    if (complianceStats.asNeededUsedCount > 0) {
      lines.push(`• Thuốc uống khi cần: Đã dùng ${complianceStats.asNeededUsedCount} lần`);
    }

    const activeMedsList = careRoutines.filter(
      (r) => r.isActive && r.category === 'meds' && r.medType !== 'as_needed'
    );
    if (activeMedsList.length > 0) {
      lines.push(`• Danh mục thuốc định kỳ đang uống:`);
      for (const m of activeMedsList) {
        const slotLabels = (m.timeSlots || []).map((s) => TIME_SLOT_CONFIG[s]?.label || s).join(', ');
        lines.push(`  - ${m.title} (${m.dosage}) — Khung giờ: ${slotLabels}`);
      }
    }

    const notedEntriesInPeriod = [...periodEntries]
      .filter((e) => Boolean(e.note && e.note.trim()))
      .sort(compareVitalsDesc)
      .slice(0, 8);
    if (notedEntriesInPeriod.length > 0) {
      lines.push(`────────────────────`);
      lines.push(`4️⃣ GHI CHÚ TRIỆU CHỨNG & VÙNG KHUYẾT SỌ TRONG KỲ:`);
      for (const ne of notedEntriesInPeriod) {
        lines.push(
          `• ${fmtDateShort(ne.date)} ${ne.time} (${ne.sys}/${ne.dia} mmHg${
            ne.pulse ? ` - Mạch ${ne.pulse}` : ''
          }): ${ne.note}`
        );
      }
    }

    lines.push(`────────────────────`);
    lines.push(`💡 Trích xuất tự động từ Sổ Sức Khỏe Bố.`);
    return lines.join('\n');
  };

  const handleCopyDoctorSummary = async () => {
    try {
      await navigator.clipboard.writeText(buildDoctorSummaryText());
      setCopiedDoctorReport(true);
      showToast?.('📋 Đã copy bản tóm tắt sức khỏe để gửi Bác sĩ / Zalo!', 'success');
      setTimeout(() => setCopiedDoctorReport(false), 2500);
    } catch {
      showToast?.('Không thể copy tự động, vui lòng thử lại.', 'warn');
    }
  };

  // ===== IN PHIẾU TRÌNH BÁC SĨ (CHUẨN A4 / LƯU PDF TRỰC TIẾP TRÊN ĐIỆN THOẠI & MÁY TÍNH) =====
  const handlePrintDoctorReport = () => {
    if (typeof window === 'undefined') return;
    const rangeLabel =
      dateRange === 'today'
        ? 'Hôm nay'
        : dateRange === '3d'
          ? '3 ngày gần nhất'
          : dateRange === '7d'
            ? '7 ngày gần nhất'
            : dateRange === '14d'
              ? '14 ngày gần nhất'
              : dateRange === '30d'
                ? '30 ngày gần nhất'
                : 'Toàn bộ lịch sử';
    const todayStr = getVietnamDateStr();
    const periodEntries = [...(filteredLog.length > 0 ? filteredLog : normalizedVitals)].sort(
      compareVitalsDesc
    );
    const activeMedsList = careRoutines.filter(
      (r) => r.isActive && r.category === 'meds' && r.medType !== 'as_needed'
    );
    const notedEntries = periodEntries.filter((e) => Boolean(e.note && e.note.trim()));

    const slotRowsHtml = ALL_SLOTS.map((slot) => {
      const st = summaryStats.byPeriod[slot];
      const cfg = TIME_SLOT_CONFIG[slot];
      if (!st || st.count === 0) {
        return `<tr><td><strong>${cfg.label}</strong></td><td colspan="4" style="color:#64748b">Chưa có bản ghi</td></tr>`;
      }
      return `<tr>
        <td><strong>${cfg.label}</strong> (${st.count} lần)</td>
        <td><strong>${st.avgSys}/${st.avgDia}</strong> mmHg</td>
        <td>${st.maxSys} mmHg</td>
        <td>${st.avgPulse ? `${st.avgPulse} l/p` : '—'}</td>
      </tr>`;
    }).join('');

    const medsRowsHtml =
      activeMedsList.length > 0
        ? activeMedsList
            .map((m) => {
              const slots = (m.timeSlots || [])
                .map((s) => TIME_SLOT_CONFIG[s]?.label || s)
                .join(', ');
              return `<tr><td><strong>${m.title}</strong></td><td>${m.dosage}</td><td>${slots}</td></tr>`;
            })
            .join('')
        : `<tr><td colspan="3" style="color:#64748b">Chưa cài đặt danh mục thuốc định kỳ</td></tr>`;

    const logRowsHtml = periodEntries
      .slice(0, 35)
      .map((v) => {
        const pp = v.sys - v.dia;
        const map = Math.round(v.dia + pp / 3);
        const evalItem = evaluateVitalReading(v, bpThresholds);
        return `<tr>
          <td>${fmtDateShort(v.date)} ${v.time}</td>
          <td>${periodLabel(v.period).replace(/^[^\s]+\s/, '')}</td>
          <td><strong>${v.sys}/${v.dia}</strong></td>
          <td>${v.pulse ? `<strong>${v.pulse}</strong>` : '—'}</td>
          <td>${map} / ${pp}</td>
          <td>${evalItem.badgeText}${v.note ? ` — <em>${v.note}</em>` : ''}</td>
        </tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Phiếu Tóm Tắt Chỉ Số Trình Bác Sĩ — ${patientName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
    body { margin: 0; padding: 0; color: #0f172a; font-size: 12px; line-height: 1.45; }
    .header { border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 17px; font-weight: 800; color: #0f766e; text-transform: uppercase; margin: 0 0 3px 0; }
    .subtitle { font-size: 12px; font-weight: 700; color: #1e293b; margin: 0; }
    .context-box { background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; font-size: 11.5px; }
    .alert-box { background: #fffbeb; border: 1.5px solid #f59e0b; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; font-size: 11.5px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
    .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px 9px; background: #f8fafc; }
    .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; }
    .card-val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .card-sub { font-size: 10.5px; color: #475569; margin-top: 2px; }
    h3 { font-size: 12.5px; font-weight: 800; text-transform: uppercase; color: #0f766e; margin: 10px 0 5px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 11.2px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
    th { background: #f1f5f9; font-weight: 800; color: #1e293b; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <p class="title">PHIẾU TÓM TẮT THEO DÕI HUYẾT ÁP &amp; SINH HIỆU TẠI NHÀ</p>
      <p class="subtitle">Bệnh nhân: ${patientName} • Kỳ báo cáo: ${rangeLabel} (${summaryStats.periodReadingsCount} lần đo)</p>
    </div>
    <div style="text-align:right;font-size:11px;color:#475569;">
      <div>Ngày trích xuất: <strong>${fmtDateFull(todayStr)}</strong></div>
      <div>Ngưỡng mục tiêu cài đặt: &lt;${bpThresholds.highSys}/${bpThresholds.highDia} mmHg</div>
    </div>
  </div>

  <div class="context-box">
    <strong>🩺 Tóm tắt bệnh cảnh hiện tại trình Bác sĩ:</strong> Sau phẫu thuật xuất huyết não • Hiện không liệt vận động, tự đi lại và tập phục hồi chức năng tại nhà • Di chứng bán manh đồng danh bên trái • Đang theo dõi ngoại trú chờ lịch phẫu thuật ghép sọ (6–8 tuần).
  </div>

  ${
    summaryStats.slowPulseCount > 0 || summaryStats.warningCount > 0 || summaryStats.criticalCount > 0 || notedEntries.length > 0
      ? `<div class="alert-box">
          <strong>⚠️ Điểm lưu ý lâm sàng cần xin ý kiến Bác sĩ (Tim mạch / Ngoại thần kinh / Gây mê trước mổ ghép sọ):</strong>
          <ul style="margin:4px 0 0 18px;padding:0;">
            ${
              summaryStats.slowPulseCount > 0
                ? `<li><strong>Nhịp tim chậm (&lt; 60 lần/phút):</strong> Ghi nhận <strong>${summaryStats.slowPulseCount}/${summaryStats.periodReadingsCount} lần đo</strong> có mạch &lt; 60 l/p${
                    summaryStats.verySlowPulseCount > 0
                      ? ` (trong đó <strong>${summaryStats.verySlowPulseCount} lần &lt; 50 l/p</strong>)`
                      : ''
                  }, thấp nhất <strong>${summaryStats.minPulse} l/p</strong>. Xin ý kiến Bác sĩ xem xét đơn thuốc tim mạch/huyết áp hiện tại và lưu ý khi tiền mê ghép sọ.</li>`
                : ''
            }
            ${
              summaryStats.warningCount + summaryStats.criticalCount > 0
                ? `<li><strong>Dao động huyết áp:</strong> Có <strong>${
                    summaryStats.warningCount + summaryStats.criticalCount
                  } lần</strong> vượt ngưỡng an toàn (Cao nhất: <strong>${summaryStats.maxSys}/${summaryStats.maxDia} mmHg</strong>).</li>`
                : ''
            }
            ${
              notedEntries.length > 0
                ? `<li><strong>Ghi chú triệu chứng &amp; vùng khuyết sọ trong kỳ (${notedEntries.length} lần):</strong> ${notedEntries
                    .slice(0, 5)
                    .map((n) => `${fmtDateShort(n.date)} ${n.time}: "${n.note}"`)
                    .join(' | ')}</li>`
                : ''
            }
          </ul>
        </div>`
      : ''
  }

  <div class="grid-4">
    <div class="card">
      <div class="card-label">1. Huyết áp Trung bình</div>
      <div class="card-val">${summaryStats.avgSys ?? '—'}/${summaryStats.avgDia ?? '—'} <small style="font-size:11px;font-weight:600">mmHg</small></div>
      <div class="card-sub">Thấp–Cao: ${summaryStats.minSys ?? '—'}–${summaryStats.maxSys ?? '—'} / ${summaryStats.minDia ?? '—'}–${summaryStats.maxDia ?? '—'}</div>
    </div>
    <div class="card">
      <div class="card-label">2. Tỷ lệ đạt chuẩn</div>
      <div class="card-val">${summaryStats.inRangePct}%</div>
      <div class="card-sub">Đạt chuẩn ${summaryStats.inTargetBpCount}/${summaryStats.periodReadingsCount} lần đo</div>
    </div>
    <div class="card">
      <div class="card-label">3. Áp lực tưới máu não (MAP)</div>
      <div class="card-val">${summaryStats.avgMAP ?? '—'} <small style="font-size:11px;font-weight:600">mmHg</small></div>
      <div class="card-sub">Hiệu áp (PP) TB: ${summaryStats.avgPP ?? '—'} mmHg</div>
    </div>
    <div class="card">
      <div class="card-label">4. Nhịp tim (Mạch) TB</div>
      <div class="card-val">${summaryStats.avgPulse ?? '—'} <small style="font-size:11px;font-weight:600">lần/phút</small></div>
      <div class="card-sub">Biên độ: ${summaryStats.minPulse ?? '—'}–${summaryStats.maxPulse ?? '—'} l/p (${summaryStats.slowPulseCount} lần &lt;60)</div>
    </div>
  </div>

  <div class="two-col">
    <div>
      <h3>I. Trung bình theo 4 buổi trong ngày</h3>
      <table>
        <thead>
          <tr><th>Buổi</th><th>HA Trung bình</th><th>SYS Cao nhất</th><th>Mạch TB</th></tr>
        </thead>
        <tbody>${slotRowsHtml}</tbody>
      </table>
    </div>
    <div>
      <h3>II. Đơn thuốc định kỳ đang uống (${complianceStats.medsPercentage !== null ? `Tuân thủ ${complianceStats.medsPercentage}%` : 'Tại nhà'})</h3>
      <table>
        <thead>
          <tr><th>Tên thuốc</th><th>Liều dùng</th><th>Buổi uống</th></tr>
        </thead>
        <tbody>${medsRowsHtml}</tbody>
      </table>
    </div>
  </div>

  <h3>III. Bảng nhật ký chi tiết các lần đo (${Math.min(periodEntries.length, 35)} lần đo gần nhất trong kỳ)</h3>
  <table>
    <thead>
      <tr>
        <th>Ngày &amp; Giờ</th>
        <th>Buổi</th>
        <th>Huyết áp (mmHg)</th>
        <th>Mạch (l/p)</th>
        <th>MAP / PP</th>
        <th>Đánh giá &amp; Ghi chú triệu chứng / vùng khuyết sọ</th>
      </tr>
    </thead>
    <tbody>${logRowsHtml}</tbody>
  </table>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 250); };
  </script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      showToast?.('Trình duyệt đang chặn cửa sổ bật lên. Hãy cho phép mở cửa sổ để in/lưu PDF.', 'warn');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  // ===== Xóa vitals handler =====
  const handleDelete = async (entry: VitalsLogEntry) => {
    if (deletingId) return;
    const confirmed = window.confirm(
      `Bạn muốn xóa bản ghi huyết áp ${entry.sys}/${entry.dia} mmHg lúc ${entry.time} (${fmtDateShort(entry.date)})?`
    );
    if (!confirmed) return;

    setDeletingId(entry.id);
    try {
      await onDeleteVitals(entry.id);
    } finally {
      setDeletingId(null);
    }
  };

  // ===== Mở form sửa bản ghi huyết áp =====
  const handleOpenEdit = (entry: VitalsLogEntry) => {
    setEditingEntry(entry);
    setEditSys(String(entry.sys));
    setEditDia(String(entry.dia));
    setEditPulse(entry.pulse ? String(entry.pulse) : '');
    setEditDate(entry.date);
    setEditTime(entry.time);
    setEditPeriod(entry.period);
    setEditRecorder(entry.recordedBy || 'Mẹ');
    setEditNote(entry.note || '');
  };

  // ===== Lưu bản ghi huyết áp sau khi sửa =====
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || isSavingEdit) return;
    const sysNum = parseInt(editSys, 10);
    const diaNum = parseInt(editDia, 10);
    if (isNaN(sysNum) || isNaN(diaNum) || sysNum <= 0 || diaNum <= 0) return;

    const pulseNum = editPulse.trim() ? parseInt(editPulse, 10) : undefined;
    const cleanPulse = pulseNum && !isNaN(pulseNum) && pulseNum > 0 ? pulseNum : undefined;
    const newAlert = computeAlertLevel(sysNum, diaNum, bpThresholds, cleanPulse);

    const updated: VitalsLogEntry = {
      ...editingEntry,
      date: editDate || editingEntry.date,
      time: editTime || editingEntry.time,
      period: editPeriod,
      sys: sysNum,
      dia: diaNum,
      pulse: cleanPulse,
      note: editNote.trim() || undefined,
      recordedBy: editRecorder.trim() || editingEntry.recordedBy,
      alertLevel: newAlert,
    };

    setIsSavingEdit(true);
    try {
      await onSaveVitals(updated);
      setEditingEntry(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ===== Lịch sử hiển thị (giới hạn 10 dòng khi chưa mở rộng) =====
  const historyEntries = useMemo(() => {
    const desc = [...filteredLog].reverse();
    return historyExpanded ? desc : desc.slice(0, 10);
  }, [filteredLog, historyExpanded]);

  const hasMoreHistory = filteredLog.length > 10;

  // ===== EMPTY STATE =====
  if (vitalsLog.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center">
          <Activity className="w-8 h-8 text-teal-500" />
        </div>
        <h2 className="text-lg font-black text-slate-900 mb-2">
          📈 Biểu Đồ & Phân Tích Sức Khỏe
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Chưa có dữ liệu huyết áp nào được ghi nhận. Hãy chuyển sang tab{' '}
          <strong>Việc Hôm Nay</strong> để ghi lần đo đầu tiên cho Bố.
        </p>
      </div>
    );
  }

  const latestEval = summaryStats.latest
    ? evaluateVitalReading(summaryStats.latest, bpThresholds)
    : null;
  const latestPulseEval = evaluatePulse(summaryStats.latest?.pulse);

  return (
    <div className="space-y-4">
      {/* ===== SECTION 1: 1 BỘ LỌC THỜI GIAN DUY NHẤT ĐỒNG BỘ TOÀN TRANG & NÚT TÓM TẮT GỬI BÁC SĨ ===== */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <span className="text-xs font-extrabold text-slate-600 px-1.5 hidden sm:inline">
            📅 Khoảng thời gian:
          </span>
          {(
            [
              { value: 'today', label: 'Hôm nay' },
              { value: '3d', label: '3 ngày' },
              { value: '7d', label: '7 ngày' },
              { value: '14d', label: '14 ngày' },
              { value: '30d', label: '30 ngày' },
              { value: 'all', label: 'Tất cả' },
            ] as { value: DateRange; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDateRange(value)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                dateRange === value
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowDoctorReportModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white border border-teal-800 text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <ClipboardList className="w-4 h-4 text-teal-100" />
          <span>📄 Phiếu trình Bác sĩ / In PDF / Zalo</span>
        </button>
      </div>

      {/* ===== SECTION 2: 4 THẺ TÓM TẮT SINH HIỆU & TUÂN THỦ (DỄ HIỂU, ĐỒNG NHẤT MÀU) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Thẻ 1: Lần đo gần nhất (Màu nền phản ánh đúng Huyết áp, không báo vàng oan khi chỉ có mạch hơi chậm) */}
        <div
          className={`rounded-2xl border p-3.5 sm:p-4 shadow-2xs transition ${
            latestEval
              ? alertColors(latestEval.bp.alertLevel).bg +
                ' ' +
                alertColors(latestEval.bp.alertLevel).border
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">
                1. Lần Đo Gần Nhất
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 1 ? null : 1)}
                className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                  activeCardInfo === 1
                    ? 'bg-teal-100 text-teal-800'
                    : 'text-slate-400 hover:text-teal-700 hover:bg-white/70'
                }`}
                title="Xem giải thích"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            {summaryStats.latest && (
              <span className="text-[11px] font-bold text-slate-500 shrink-0">
                {periodLabel(summaryStats.latest.period)}
              </span>
            )}
          </div>

          {summaryStats.latest && latestEval ? (
            <>
              <div className="flex items-baseline justify-between gap-1.5 mt-1.5 flex-wrap">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <div
                    className={`text-2xl font-black ${
                      alertColors(latestEval.bp.alertLevel).text
                    }`}
                  >
                    {summaryStats.latest.sys}/{summaryStats.latest.dia}
                    <span className="text-xs font-bold ml-1 text-slate-500">mmHg</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold border ${latestEval.bp.badgeClass}`}
                  >
                    {latestEval.bp.shortLabel}
                  </span>
                </div>
                {summaryStats.latest.pulse && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold border ${latestPulseEval.badgeClass}`}
                  >
                    {latestPulseEval.label}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 mt-1 flex items-center justify-between gap-1">
                <span>
                  {fmtDateShort(summaryStats.latest.date)} · {summaryStats.latest.time}
                </span>
                {summaryStats.previous && (
                  <span className="font-semibold text-slate-500">
                    So lần trước: {summaryStats.deltaSys >= 0 ? `+${summaryStats.deltaSys}` : summaryStats.deltaSys}/
                    {summaryStats.deltaDia >= 0 ? `+${summaryStats.deltaDia}` : summaryStats.deltaDia}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400 mt-2">—</div>
          )}

          {activeCardInfo === 1 && summaryStats.latest && latestEval && (
            <div className="mt-2.5 pt-2 border-t border-black/10 text-[11px] text-slate-800 bg-white/85 p-2.5 rounded-xl leading-relaxed space-y-1">
              <div>
                💡 <strong>Đánh giá:</strong> {latestEval.bp.label}
                {latestEval.pulse.category !== 'none' ? ` • ${latestEval.pulse.label}` : ''}.
              </div>
              <div>
                📌 <strong>Lời khuyên:</strong> {latestEval.clinicalAdvice}
              </div>
            </div>
          )}
        </div>

        {/* Thẻ 2: Huyết áp Trung bình & Khoảng dao động */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">
                2. Huyết Áp Trung Bình
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 2 ? null : 2)}
                className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                  activeCardInfo === 2
                    ? 'bg-teal-100 text-teal-800'
                    : 'text-slate-400 hover:text-teal-700 hover:bg-slate-100'
                }`}
                title="Xem giải thích"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              {summaryStats.inRangePct}% đạt chuẩn
            </span>
          </div>

          {summaryStats.avgSys !== null ? (
            <>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black text-slate-900">
                  {summaryStats.avgSys}/{summaryStats.avgDia}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  mmHg ({summaryStats.periodReadingsCount} lần)
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Thấp–Cao nhất:{' '}
                <strong className="text-slate-800">
                  {summaryStats.minSys}–{summaryStats.maxSys}
                </strong>{' '}
                /{' '}
                <strong className="text-slate-800">
                  {summaryStats.minDia}–{summaryStats.maxDia}
                </strong>{' '}
                mmHg
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400 mt-2">Chưa đủ dữ liệu</div>
          )}

          {activeCardInfo === 2 && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl leading-relaxed space-y-1">
              <div>
                • <strong>Số trên (Tâm thu):</strong> Áp lực máu bơm lên não lúc tim co bóp (An toàn &lt;{bpThresholds.highSys}, đẹp 115–130). Cao quá dễ gây tái phát tai biến; thấp quá (&lt;100) gây thiếu máu não, hoa mắt.
              </div>
              <div>
                • <strong>Số dưới (Tâm trương):</strong> Áp lực mạch lúc tim giãn nghỉ nuôi cơ tim (An toàn &lt;{bpThresholds.highDia}, đẹp 70–80).
              </div>
              <div>
                • <strong>Hiệu áp (Số trên − Số dưới):</strong> Đẹp nhất <strong>40–55 mmHg</strong> (TB kỳ này: {summaryStats.avgPP ?? '—'} mmHg). Nếu ≥60 là thành mạch hơi cứng.
              </div>
            </div>
          )}
        </div>

        {/* Thẻ 3: Nhịp tim (Mạch) Trung bình */}
        <div
          className={`rounded-2xl border p-3.5 sm:p-4 shadow-2xs transition ${
            summaryStats.verySlowPulseCount > 0 || summaryStats.fastPulseCount > 0
              ? 'bg-rose-50/40 border-rose-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">
                3. Nhịp Tim (Mạch) TB
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 3 ? null : 3)}
                className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                  activeCardInfo === 3
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-slate-400 hover:text-amber-800 hover:bg-amber-50'
                }`}
                title="Xem giải thích Nhịp tim"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1 text-xs font-extrabold shrink-0">
              {summaryStats.trend === 'up' ? (
                <span className="text-rose-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" /> HA Tăng
                </span>
              ) : summaryStats.trend === 'down' ? (
                <span className="text-emerald-600 flex items-center gap-0.5">
                  <TrendingDown className="w-3.5 h-3.5" /> HA Giảm
                </span>
              ) : (
                <span className="text-teal-700 flex items-center gap-0.5">
                  <ArrowRight className="w-3.5 h-3.5" /> HA Ổn định
                </span>
              )}
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2 mt-1.5 flex-wrap">
            {summaryStats.avgPulse !== null ? (
              <div
                className={`text-2xl font-black ${
                  summaryStats.avgPulse < 50
                    ? 'text-rose-700'
                    : summaryStats.avgPulse < 60
                      ? 'text-amber-800'
                      : summaryStats.avgPulse >= 100
                        ? 'text-rose-700'
                        : 'text-slate-900'
                }`}
              >
                ❤️ {summaryStats.avgPulse}
                <span className="text-xs font-bold ml-1 text-slate-500">nhịp/phút</span>
              </div>
            ) : (
              <div className="text-lg font-bold text-slate-400">Chưa đo mạch</div>
            )}
          </div>

          <div className="text-xs text-slate-600 mt-1">
            {summaryStats.avgPulse !== null ? (
              <>
                Thấp–Cao: <strong>{summaryStats.minPulse}–{summaryStats.maxPulse} bpm</strong>
                {summaryStats.verySlowPulseCount > 0 ? (
                  <span className="text-rose-700 font-bold">
                    {' '}
                    · 🔴 {summaryStats.verySlowPulseCount} lần &lt;50 bpm
                  </span>
                ) : summaryStats.slowPulseCount > 0 ? (
                  <span className="text-amber-800 font-semibold">
                    {' '}
                    · ({summaryStats.slowPulseCount} lần 50–59 bpm)
                  </span>
                ) : summaryStats.fastPulseCount > 0 ? (
                  <span className="text-rose-700 font-bold">
                    {' '}
                    · ⚠️ {summaryStats.fastPulseCount} lần ≥100 bpm
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold"> · Nhịp đều</span>
                )}
              </>
            ) : (
              'Ghi thêm nhịp tim khi đo HA để theo dõi'
            )}
          </div>

          {activeCardInfo === 3 && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-800 bg-slate-50 p-2.5 rounded-xl leading-relaxed space-y-1">
              <div>
                💡 <strong>Nhịp tim lúc nghỉ:</strong> Tốt nhất từ <strong>60–79 nhịp/phút</strong> (bình thường 60–99). Nếu mạch từ 50–59 là hơi chậm nhẹ; nếu <strong>dưới 50 nhịp/phút</strong> là rất chậm, cần hỏi Bác sĩ khi tái khám.
              </div>
            </div>
          )}
        </div>

        {/* Thẻ 4: Tuân thủ Thuốc & Tập PHCN */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Pill className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">
                4. Thuốc & Tập PHCN
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 4 ? null : 4)}
                className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                  activeCardInfo === 4
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title="Xem cách tính tuân thủ"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-[11px] font-bold text-slate-400 shrink-0">
              {complianceStats.activeDaysCount} ngày ghi sổ
            </span>
          </div>

          {complianceStats.medsPercentage !== null ? (
            <>
              <div className="flex items-baseline justify-between gap-2 mt-1.5 flex-wrap">
                <div
                  className={`text-2xl font-black ${
                    complianceStats.medsPercentage >= 80
                      ? 'text-emerald-600'
                      : complianceStats.medsPercentage >= 50
                        ? 'text-amber-600'
                        : 'text-rose-600'
                  }`}
                >
                  {complianceStats.medsPercentage}%
                  <span className="text-xs font-bold ml-1 text-slate-500">thuốc</span>
                </div>
                {complianceStats.rehabPercentage !== null && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    🏃 Tập: {complianceStats.rehabPercentage}% ({complianceStats.totalDoneRehab}/
                    {complianceStats.totalExpectedRehab})
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 mt-1 font-medium">
                Đã uống{' '}
                <strong className="text-slate-800">
                  {complianceStats.totalDoneDoses}/{complianceStats.totalExpectedDoses} cữ
                </strong>{' '}
                ({complianceStats.daysFullMeds}/{complianceStats.activeDaysCount} ngày đủ 100%)
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400 mt-2">Chưa cài đơn thuốc</div>
          )}

          {activeCardInfo === 4 && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-700 bg-emerald-50/60 p-2.5 rounded-xl leading-relaxed space-y-1">
              <div>
                💡 <strong>Cách tính:</strong> Mỗi loại thuốc hay bài tập chỉ được tính từ <strong>Ngày bắt đầu áp dụng</strong> của chính loại đó (không tính lùi về những ngày chưa thêm thuốc).
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== SECTION 3: BIỂU ĐỒ XU HƯỚNG THEO NGÀY (MỖI NGÀY 1 ĐIỂM GỌN GÀNG) & PHÂN TÍCH 4 BUỔI ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            <div>
              <h3 className="text-sm font-black text-slate-800 inline">
                Biểu Đồ Xu Hướng Theo Ngày
              </h3>
              <span className="text-xs font-bold text-slate-400 ml-2">
                ({chartData.length} ngày · {filteredLog.length} lần đo)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setChartViewMode('chart')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartViewMode === 'chart'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📈 Biểu đồ ngày
            </button>
            <button
              type="button"
              onClick={() => setChartViewMode('timeline')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartViewMode === 'timeline'
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🕒 Từng lần đo
            </button>
          </div>
        </div>

        {chartViewMode === 'chart' ? (
          <div className="p-3 sm:p-4 space-y-4">
            {/* Bộ lọc chế độ gom điểm biểu đồ: TB cả ngày (Mặc định) hoặc xem riêng xu hướng từng buổi qua các ngày */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-slate-500">
                Đường đậm là <strong>Trung bình ngày</strong>, dải màu mờ &amp; thanh dọc{' '}
                <strong>|---|</strong> thể hiện <strong>Biên độ Thấp nhất – Cao nhất</strong> trong ngày đó:
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {(
                  [
                    { id: 'daily_avg', label: '📅 TB Cả ngày' },
                    { id: 'morning', label: '🌅 Sáng' },
                    { id: 'noon', label: '☀️ Trưa' },
                    { id: 'afternoon', label: '🌤️ Chiều' },
                    { id: 'evening', label: '🌙 Tối' },
                  ] as { id: 'daily_avg' | VitalsPeriod; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setChartGranularity(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      chartGranularity === tab.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 italic">
                Chưa có bản ghi nào cho buổi đang chọn trong khoảng thời gian này.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData} margin={{ top: 12, right: 20, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  {/* Vùng nền xanh an toàn cho Tâm thu (lowSys -> highSys) */}
                  <ReferenceArea
                    y1={bpThresholds.lowSys}
                    y2={bpThresholds.highSys}
                    fill="#10b981"
                    fillOpacity={0.05}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#334155', fontWeight: 700 }}
                    interval="preserveStartEnd"
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    padding={{ left: 24, right: 24 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    domain={[
                      (dataMin: number) => Math.min(40, Math.floor((dataMin - 10) / 10) * 10),
                      (dataMax: number) =>
                        Math.max(bpThresholds.highSys + 10, Math.ceil((dataMax + 10) / 10) * 10),
                    ]}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const data = payload[0]?.payload;
                      if (!data) return null;
                      return (
                        <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-2xl p-3 shadow-xl text-xs space-y-1.5 min-w-[250px]">
                          <div className="font-extrabold text-slate-900 flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                            <span>
                              📅 {data.weekday}, {data.fullDate}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 text-[10px] font-bold">
                              {data.readingsCount} lần đo
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-semibold">
                              {data.readingsCount > 1 ? 'Huyết áp TB ngày:' : 'Huyết áp:'}
                            </span>
                            <span className="font-black text-sm text-rose-600">
                              {data.sys}/{data.dia} mmHg
                            </span>
                          </div>

                          {data.readingsCount > 1 && (
                            <div className="px-2 py-1.5 rounded-xl bg-rose-50/70 border border-rose-200/80 text-[11px] space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600 font-semibold">
                                  ↕️ Biên độ Thấp–Cao:
                                </span>
                                <span className="font-extrabold text-slate-900">
                                  {data.minSys}–{data.maxSys} / {data.minDia}–{data.maxDia} mmHg
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Chênh lệch trong ngày:{' '}
                                <strong
                                  className={
                                    data.sysSpan >= 20
                                      ? 'text-rose-700'
                                      : data.sysSpan >= 12
                                      ? 'text-amber-700'
                                      : 'text-emerald-700'
                                  }
                                >
                                  {data.sysSpan} mmHg (số trên)
                                </strong>
                              </div>
                            </div>
                          )}

                          {data.pulse && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600 font-semibold">
                                {data.readingsCount > 1 ? 'Nhịp tim TB:' : 'Nhịp tim:'}
                              </span>
                              <span
                                className={`font-extrabold ${
                                  data.pulse < 50 || data.pulse >= 100
                                    ? 'text-rose-700'
                                    : data.pulse < 60
                                    ? 'text-amber-700'
                                    : 'text-violet-700'
                                }`}
                              >
                                ❤️ {data.pulse} bpm{' '}
                                {data.pulse < 50
                                  ? '(Rất chậm)'
                                  : data.pulse < 60
                                  ? '(Hơi chậm)'
                                  : data.pulse >= 100
                                  ? '(Nhanh)'
                                  : ''}
                              </span>
                            </div>
                          )}

                          {/* Liệt kê tất cả các lần đo trong ngày đó theo đúng thứ tự Sáng -> Tối */}
                          {Array.isArray(data.readings) && data.readings.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-100 space-y-1">
                              <div className="text-[10px] font-extrabold text-slate-500 uppercase">
                                Chi tiết các lần đo ngày {data.label}:
                              </div>
                              {data.readings.map((r: VitalsLogEntry) => {
                                const rEval = evaluateVitalReading(r, bpThresholds);
                                return (
                                  <div
                                    key={r.id}
                                    className="flex items-center justify-between gap-2 text-[11px] bg-slate-50 px-2 py-1 rounded-lg"
                                  >
                                    <span className="text-slate-600">
                                      {periodLabel(r.period)} ({r.time})
                                    </span>
                                    <span className="font-extrabold text-slate-900">
                                      {r.sys}/{r.dia}
                                      {r.pulse ? ` · ❤️${r.pulse}` : ''}{' '}
                                      <span className="text-[10px] font-bold text-slate-500">
                                        ({rEval.badgeText})
                                      </span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {data.medsSummary && (
                            <div className="pt-1 border-t border-slate-100 text-[11px] font-bold text-teal-800">
                              💊 Thuốc trong ngày: Đã uống {data.medsSummary}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  {/* Đường ngưỡng cảnh báo */}
                  <ReferenceLine
                    y={bpThresholds.highSys}
                    stroke="#ef4444"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{
                      value: `Ngưỡng SYS ${bpThresholds.highSys}`,
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: '#ef4444',
                    }}
                  />
                  <ReferenceLine
                    y={bpThresholds.highDia}
                    stroke="#f59e0b"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{
                      value: `Ngưỡng DIA ${bpThresholds.highDia}`,
                      position: 'insideTopRight',
                      fontSize: 10,
                      fill: '#f59e0b',
                    }}
                  />

                  {/* Dải biên độ Thấp nhất – Cao nhất trong ngày của Số trên (SYS) */}
                  <Area
                    type="monotone"
                    dataKey="sysRange"
                    fill="#ef4444"
                    fillOpacity={0.14}
                    stroke="#fca5a5"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    connectNulls
                    isAnimationActive={false}
                    name="sysRange"
                  />

                  {/* Dải biên độ Thấp nhất – Cao nhất trong ngày của Số dưới (DIA) */}
                  <Area
                    type="monotone"
                    dataKey="diaRange"
                    fill="#3b82f6"
                    fillOpacity={0.11}
                    stroke="#93c5fd"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    connectNulls
                    isAnimationActive={false}
                    name="diaRange"
                  />

                  {/* Đường SYS TB + Thanh biên độ Thấp–Cao (ErrorBar) cho từng ngày */}
                  <Line
                    type="monotone"
                    dataKey="sys"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                    name="sys"
                  >
                    <ErrorBar
                      dataKey="sysError"
                      width={5}
                      strokeWidth={2}
                      stroke="#f87171"
                    />
                  </Line>

                  {/* Đường DIA TB + Thanh biên độ Thấp–Cao (ErrorBar) cho từng ngày */}
                  <Line
                    type="monotone"
                    dataKey="dia"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                    name="dia"
                  >
                    <ErrorBar
                      dataKey="diaError"
                      width={4}
                      strokeWidth={1.75}
                      stroke="#60a5fa"
                    />
                  </Line>

                  {/* Đường Mạch */}
                  <Line
                    type="monotone"
                    dataKey="pulse"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 1.5, stroke: '#fff' }}
                    connectNulls
                    name="pulse"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs flex-wrap bg-slate-50/80 py-2 px-3 rounded-xl border border-slate-100">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-3.5 h-1 bg-rose-500 inline-block rounded" /> Số trên TB (SYS)
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-3.5 h-2.5 bg-rose-500/20 border border-rose-300 border-dashed inline-block rounded-xs" />{' '}
                Dải &amp; Thanh |---| : Biên độ Thấp–Cao trong ngày
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-3.5 h-1 bg-blue-500 inline-block rounded" /> Số dưới TB (DIA)
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-3.5 h-0.5 border-b-2 border-dashed border-violet-500 inline-block" />{' '}
                Nhịp tim (bpm)
              </span>
            </div>

            {/* PHÂN TÍCH HUYẾT ÁP & MẠCH THEO 4 BUỔI TRONG NGÀY (TÁCH RÕ THEO TỪNG NGÀY HOẶC TB NHIỀU NGÀY) */}
            <div className="pt-3 border-t border-slate-100">
              {(() => {
                const todayStr = getVietnamDateStr();
                const currentSlot = detectCurrentTimeSlot();
                const currentRank = SLOT_RANK[currentSlot] || 1;
                const isAvgMode = selectedSlotDayMode === 'avg';
                const targetDay =
                  selectedSlotDayMode === 'today' || !selectedSlotDayMode
                    ? todayStr
                    : selectedSlotDayMode;

                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                      <div>
                        <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                          🕒 Diễn Biến Sinh Hiệu 4 Buổi Trong Ngày:{' '}
                          <span className="text-teal-700">
                            {isAvgMode
                              ? `Trung bình các ngày đang lọc`
                              : targetDay === todayStr
                                ? `Hôm nay (${fmtDateShort(todayStr)})`
                                : `${getWeekdayVN(targetDay)}, ${fmtDateFull(targetDay)}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {isAvgMode
                            ? 'Tính trung bình cộng từng buổi qua các ngày có đo (ghi kèm ngày đo gần nhất)'
                            : `Chỉ hiển thị đúng các lần đo trong ngày ${fmtDateFull(targetDay)} theo trình tự Sáng → Trưa → Chiều → Tối`}
                        </p>
                      </div>

                      {/* Thanh chọn xem theo Ngày hôm nay / Các ngày trước / TB nhiều ngày */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {summaryStats.availableSlotDays.slice(0, 4).map((dStr) => {
                          const isSelected =
                            !isAvgMode &&
                            (selectedSlotDayMode === dStr ||
                              (selectedSlotDayMode === 'today' && dStr === todayStr));
                          return (
                            <button
                              key={dStr}
                              type="button"
                              onClick={() =>
                                setSelectedSlotDayMode(dStr === todayStr ? 'today' : dStr)
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                isSelected
                                  ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {dStr === todayStr ? `Hôm nay (${fmtDateShort(dStr)})` : fmtDateShort(dStr)}
                            </button>
                          );
                        })}
                        {summaryStats.availableSlotDays.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSelectedSlotDayMode('avg')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                              isAvgMode
                                ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            📊 TB nhiều ngày
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {ALL_SLOTS.map((slot) => {
                        const cfg = TIME_SLOT_CONFIG[slot];
                        const slotRank = SLOT_RANK[slot] || 1;

                        if (isAvgMode) {
                          const st = summaryStats.byPeriod[slot];
                          return (
                            <div
                              key={slot}
                              className={`rounded-xl border p-2.5 ${
                                st.count > 0
                                  ? 'bg-slate-50/80 border-slate-200'
                                  : 'bg-slate-50/30 border-slate-100 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-extrabold text-slate-700">
                                  {cfg.emoji} {cfg.label}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  TB {st.count} lần
                                </span>
                              </div>
                              {st.count > 0 ? (
                                <div className="mt-1">
                                  <div className="text-base font-black text-slate-900">
                                    {st.avgSys}/{st.avgDia}
                                    <span className="text-[10px] font-normal text-slate-500 ml-1">
                                      mmHg
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-600 mt-0.5 flex items-center justify-between">
                                    <span>
                                      {st.avgPulse ? `❤️ TB ${st.avgPulse} bpm` : 'Chưa ghi mạch'}
                                    </span>
                                  </div>
                                  {st.latestDate && (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      Đo gần nhất: {fmtDateShort(st.latestDate)} · {st.latestTime}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-slate-400 mt-1.5 italic">
                                  Chưa có lần đo buổi {cfg.label.toLowerCase()}
                                </div>
                              )}
                            </div>
                          );
                        }

                        // Chế độ xem đúng 1 ngày cụ thể (Mặc định: Hôm nay)
                        const daySlotItems = normalizedVitals
                          .filter((v) => v.date === targetDay && v.period === slot)
                          .sort(compareVitalsDesc);
                        const latestInSlot = daySlotItems[0] || null;
                        const slotBpAlert = latestInSlot
                          ? classifyClinicalBp(latestInSlot.sys, latestInSlot.dia, bpThresholds).alertLevel
                          : 'normal';
                        const isFutureToday =
                          targetDay === todayStr && slotRank > currentRank && !latestInSlot;

                        return (
                          <div
                            key={slot}
                            className={`rounded-xl border p-2.5 ${
                              latestInSlot
                                ? alertColors(slotBpAlert).bg +
                                  ' ' +
                                  alertColors(slotBpAlert).border
                                : 'bg-slate-50/40 border-slate-200/70'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-extrabold text-slate-700">
                                {cfg.emoji} {cfg.label}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">
                                {latestInSlot
                                  ? `${fmtDateShort(latestInSlot.date)} · ${latestInSlot.time}`
                                  : fmtDateShort(targetDay)}
                              </span>
                            </div>
                            {latestInSlot ? (
                              <div className="mt-1">
                                <div
                                  className={`text-base font-black ${
                                    alertColors(slotBpAlert).text
                                  }`}
                                >
                                  {latestInSlot.sys}/{latestInSlot.dia}
                                  <span className="text-[10px] font-normal text-slate-500 ml-1">
                                    mmHg
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-600 mt-0.5 flex items-center justify-between">
                                  <span
                                    className={
                                      latestInSlot.pulse &&
                                      (latestInSlot.pulse < 50 || latestInSlot.pulse >= 100)
                                        ? 'text-rose-700 font-bold'
                                        : latestInSlot.pulse && latestInSlot.pulse < 60
                                        ? 'text-amber-800 font-bold'
                                        : ''
                                    }
                                  >
                                    {latestInSlot.pulse
                                      ? `❤️ ${latestInSlot.pulse} bpm`
                                      : 'Chưa ghi mạch'}
                                  </span>
                                  {daySlotItems.length > 1 && (
                                    <span className="text-[10px] font-bold text-teal-700">
                                      ({daySlotItems.length} lần đo)
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 mt-1.5 italic">
                                {isFutureToday
                                  ? `⏳ Chưa tới buổi ${cfg.label.toLowerCase()} (${fmtDateShort(todayStr)})`
                                  : `Chưa đo buổi ${cfg.label.toLowerCase()} ngày ${fmtDateShort(targetDay)}`}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          /* ===== CHẾ ĐỘ THẺ THỜI GIAN DỌC ===== */
          <div className="p-4 space-y-3">
            {[...filteredLog].reverse().map((v, i) => {
              const bpEval = classifyClinicalBp(v.sys, v.dia, bpThresholds);
              const colors = alertColors(bpEval.alertLevel);
              const pEval = evaluatePulse(v.pulse);
              return (
                <div key={v.id} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3.5 h-3.5 rounded-full ${colors.dot} ring-2 ring-white shadow-sm`}
                    />
                    {i < filteredLog.length - 1 && (
                      <div className="w-0.5 flex-1 min-h-[24px] bg-slate-200 mt-1" />
                    )}
                  </div>
                  <div
                    className={`flex-1 min-w-0 rounded-xl border ${colors.border} ${colors.bg} p-3`}
                  >
                    <div className="flex items-baseline justify-between flex-wrap gap-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-lg font-black ${colors.text}`}>
                          {v.sys}/{v.dia}
                          <span className="text-xs font-bold ml-1">mmHg</span>
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${bpEval.badgeClass}`}
                        >
                          {bpEval.shortLabel}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {fmtDateFull(v.date)} · {v.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 flex-wrap">
                      <span>{periodLabel(v.period)}</span>
                      {v.pulse && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${pEval.badgeClass}`}
                        >
                          {pEval.label}
                        </span>
                      )}
                      <span className="ml-auto font-semibold">{v.recordedBy}</span>
                    </div>
                    {v.note && (
                      <div className="text-xs text-slate-600 mt-1 italic break-words">
                        📝 {v.note}
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-black/5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(v)}
                        className="px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-teal-700 border border-teal-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(v)}
                        disabled={deletingId === v.id}
                        className="px-2.5 py-1 rounded-lg bg-white/80 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 text-xs font-bold flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== SECTION 3.5: BÁO CÁO ĐÁNH GIÁ CHI TIẾT THEO KHOẢNG THỜI GIAN ĐANG CHỌN ===== */}
      <ClinicalVitalsReportSection
        vitalsLog={vitalsLog}
        bpThresholds={bpThresholds}
        externalDateRange={dateRange}
        onChangeDateRange={(r) => setDateRange(r)}
        patientName={patientName}
        showToast={showToast}
        onOpenDoctorReport={() => setShowDoctorReportModal(true)}
      />

      {/* ===== SECTION 4 (GỘP DUY NHẤT): NHẬT KÝ THEO NGÀY — LỊCH SỬ ĐO HUYẾT ÁP & UỐNG THUỐC (THOÁNG, RÕ RÀNG, CÓ SỬA/XÓA) ===== */}
      {(() => {
        const attentionRows = complianceStats.dailyMatrix.filter((r) => {
          const hasBpOrSeverePulseAlert = r.vitals.some((v) => {
            const bpLvl = classifyClinicalBp(v.sys, v.dia, bpThresholds).alertLevel;
            const pulseSevere = v.pulse ? v.pulse < 50 || v.pulse >= 100 : false;
            return bpLvl !== 'normal' || pulseSevere;
          });
          const hasMissedMeds = r.medsExpected > 0 && r.medsDone < r.medsExpected;
          return hasBpOrSeverePulseAlert || hasMissedMeds;
        });

        const baseRows =
          dailyMatrixFilter === 'attention' ? attentionRows : complianceStats.dailyMatrix;
        const visibleRows = dailyMatrixExpanded ? baseRows : baseRows.slice(0, 5);
        const hiddenCount = Math.max(0, baseRows.length - 5);

        return (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Header Bảng Nhật Ký Duy Nhất */}
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-800">
                    📋 Nhật Ký Hàng Ngày: Lịch Sử Đo Huyết Áp &amp; Uống Thuốc
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gom gọn theo từng ngày ({filteredLog.length} lần đo) • Bấm &ldquo;Chi tiết thuốc&rdquo; ở ngày bất kỳ để xem các cữ thuốc ngày đó
                  </p>
                </div>
              </div>

              {/* Bộ lọc nhanh Tất cả / Cần chú ý */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDailyMatrixFilter('all');
                    setDailyMatrixExpanded(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    dailyMatrixFilter === 'all'
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Tất cả ({complianceStats.dailyMatrix.length} ngày)
                </button>
                {attentionRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDailyMatrixFilter('attention');
                      setDailyMatrixExpanded(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      dailyMatrixFilter === 'attention'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    ⚠️ Cần chú ý ({attentionRows.length} ngày)
                  </button>
                )}
              </div>
            </div>

            {visibleRows.length === 0 ? (
              <div className="p-6 text-center text-xs sm:text-sm text-slate-500">
                🎉 Không có ngày nào bị thiếu thuốc hoặc huyết áp vượt ngưỡng trong kỳ này.
              </div>
            ) : (
              <div className="p-3 sm:p-4 space-y-3 bg-slate-50/50">
                {visibleRows.map((dayRow) => {
                  const isExpanded = expandedDay === dayRow.date;
                  const medsPct =
                    dayRow.medsExpected > 0
                      ? Math.round((dayRow.medsDone / dayRow.medsExpected) * 100)
                      : null;

                  const medsGroup = dayRow.groupedRoutines.filter(
                    (g) => g.category === 'meds' || g.category === 'meds_prn'
                  );
                  const rehabCareGroup = dayRow.groupedRoutines.filter(
                    (g) => g.category === 'rehab' || g.category === 'care'
                  );

                  return (
                    <div
                      key={dayRow.date}
                      className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden transition"
                    >
                      {/* 1. Thanh tiêu đề Ngày: Ngày tháng rõ ràng + Trạng thái uống thuốc bằng chữ dễ hiểu */}
                      <div className="px-3.5 sm:px-4 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                              dayRow.isToday
                                ? 'bg-teal-700 text-white border-teal-800'
                                : 'bg-white text-slate-800 border-slate-200 shadow-2xs'
                            }`}
                          >
                            {fmtDateShort(dayRow.date)}
                          </span>
                          <div>
                            <span className="text-sm font-black text-slate-900">
                              {dayRow.isToday ? 'Hôm nay' : getWeekdayVN(dayRow.date)}
                            </span>
                            <span className="text-xs text-slate-500 ml-1.5">
                              ({fmtDateFull(dayRow.date)})
                            </span>
                          </div>
                        </div>

                        {/* Cụm bên phải: Ghi rõ bằng chữ số cữ thuốc đã uống + Nút mở xem chi tiết thuốc */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {medsPct !== null && (
                            <span
                              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border ${
                                medsPct === 100
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : medsPct >= 50
                                    ? 'bg-amber-50 text-amber-900 border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}
                            >
                              {medsPct === 100
                                ? `💊 Đã uống đủ ${dayRow.medsDone}/${dayRow.medsExpected} cữ thuốc`
                                : `💊 Thuốc: Đã uống ${dayRow.medsDone}/${dayRow.medsExpected} cữ`}
                            </span>
                          )}

                          {dayRow.rehabExpected > 0 && (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 hidden sm:inline-flex">
                              🏃 Tập: {dayRow.rehabDone}/{dayRow.rehabExpected}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedDay(isExpanded ? null : dayRow.date)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1 transition cursor-pointer ${
                              isExpanded
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{isExpanded ? 'Ẩn đơn thuốc' : 'Chi tiết thuốc'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* 2. Danh sách từng lần đo Huyết áp trong ngày (Thoáng, chữ to, kèm nút Sửa / Xóa trực tiếp) */}
                      {dayRow.vitals.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-slate-400 italic">
                          Chưa có lần đo huyết áp nào được ghi trong ngày này.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {dayRow.vitals.map((v) => {
                            const evalItem = evaluateVitalReading(v, bpThresholds);
                            const bpColors = alertColors(evalItem.bp.alertLevel);
                            const overallColors = alertColors(evalItem.overallAlertLevel);
                            const pEval = evaluatePulse(v.pulse);
                            return (
                              <div
                                key={v.id}
                                className="px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-3 flex-wrap hover:bg-slate-50/60 transition"
                              >
                                {/* Cột A: Buổi & Giờ đo */}
                                <div className="min-w-[130px]">
                                  <div className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                    <span>{periodLabel(v.period)}</span>
                                    <span className="text-slate-400 font-normal">·</span>
                                    <span className="text-slate-600 font-bold">{v.time}</span>
                                  </div>
                                  {v.recordedBy && (
                                    <div className="text-[11px] text-slate-400">
                                      Người ghi: {v.recordedBy}
                                    </div>
                                  )}
                                </div>

                                {/* Cột B: Chỉ số Huyết áp & Nhịp tim */}
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <div className="flex items-baseline gap-1">
                                    <span
                                      className={`font-black text-base sm:text-lg ${bpColors.text}`}
                                    >
                                      {v.sys}/{v.dia}
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-semibold">
                                      mmHg
                                    </span>
                                  </div>

                                  {v.pulse ? (
                                    <span
                                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${pEval.badgeClass}`}
                                    >
                                      {pEval.label}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-slate-400">Chưa ghi mạch</span>
                                  )}
                                </div>

                                {/* Cột C: Nhãn đánh giá & Ghi chú */}
                                <div className="flex-1 min-w-[140px] flex items-center gap-2 flex-wrap sm:justify-end">
                                  <span
                                    className={`inline-flex whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-bold border ${overallColors.badge}`}
                                  >
                                    {evalItem.badgeText}
                                  </span>
                                  {v.note && (
                                    <span className="text-xs text-slate-600 italic bg-slate-100 px-2 py-0.5 rounded-lg">
                                      📝 {v.note}
                                    </span>
                                  )}
                                </div>

                                {/* Cột D: Nút Sửa / Xóa trực tiếp */}
                                <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(v)}
                                    className="px-2.5 py-1.5 rounded-xl bg-teal-50/80 hover:bg-teal-100 text-teal-700 border border-teal-200/80 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                    title="Sửa lại lần đo này"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Sửa</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(v)}
                                    disabled={deletingId === v.id}
                                    className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 transition disabled:opacity-50 cursor-pointer"
                                    title="Xóa lần đo này"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* 3. Ngăn kéo Chi tiết Thuốc & Bài tập của ngày đó (Chỉ mở khi người dùng bấm "Chi tiết thuốc") */}
                      {isExpanded && (
                        <div className="px-3.5 sm:px-4 pb-3.5 pt-2.5 bg-slate-50/90 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                          {/* Cột A: Đơn thuốc áp dụng trong ngày */}
                          <div className="bg-white rounded-xl border border-emerald-200/80 p-2.5 space-y-1.5">
                            <div className="font-extrabold text-emerald-800 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Pill className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Thuốc trong ngày ({medsGroup.length} loại)</span>
                              </span>
                              <span className="text-[11px] font-bold text-slate-500">
                                Đã uống {dayRow.medsDone}/{dayRow.medsExpected} cữ
                              </span>
                            </div>

                            {medsGroup.length === 0 ? (
                              <p className="text-slate-400 italic">
                                Chưa có cữ thuốc nào đến giờ trong ngày này.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {medsGroup.map((g) => (
                                  <div
                                    key={g.routineId}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70"
                                  >
                                    <div className="min-w-0">
                                      <span className="font-bold text-slate-800">
                                        {g.routineTitle}
                                      </span>
                                      {g.dosage && (
                                        <span className="text-slate-500 ml-1">({g.dosage})</span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 shrink-0">
                                      {g.slots.map((s, sIdx) => {
                                        const cfg = TIME_SLOT_CONFIG[s.timeSlot];
                                        return (
                                          <button
                                            key={sIdx}
                                            type="button"
                                            onClick={() => {
                                              if (!onToggleDailyLog) return;
                                              const logId = `dl-${dayRow.date}-${g.routineId}-${s.timeSlot}`;
                                              void onToggleDailyLog({
                                                id: logId,
                                                date: dayRow.date,
                                                routineId: g.routineId,
                                                timeSlot: s.timeSlot,
                                                isDone: !s.isDone,
                                                doneAt: !s.isDone ? 'Tích bù' : undefined,
                                                doneBy: !s.isDone ? defaultRecorder : undefined,
                                              });
                                            }}
                                            title="Bấm để tích / bỏ tích cữ thuốc này"
                                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition cursor-pointer ${
                                              s.isDone
                                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                            }`}
                                          >
                                            {cfg?.emoji} {cfg?.label}:{' '}
                                            {s.isDone ? `✓ ${s.doneAt || 'Đã uống'}` : '+ Bấm tích'}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Cột B: Bài tập PHCN & Chăm sóc trong ngày */}
                          <div className="bg-white rounded-xl border border-blue-200/80 p-2.5 space-y-1.5">
                            <div className="font-extrabold text-blue-800 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Tập PHCN &amp; Chăm sóc ({rehabCareGroup.length} mục)</span>
                              </span>
                              <span className="text-[11px] font-bold text-slate-500">
                                Hoàn thành {dayRow.rehabDone + dayRow.careDone}/
                                {dayRow.rehabExpected + dayRow.careExpected} lần
                              </span>
                            </div>

                            {rehabCareGroup.length === 0 ? (
                              <p className="text-slate-400 italic">
                                Chưa có bài tập/chăm sóc nào đến giờ trong ngày này.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {rehabCareGroup.map((g) => (
                                  <div
                                    key={g.routineId}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70"
                                  >
                                    <div className="min-w-0">
                                      <span className="font-bold text-slate-800">
                                        {g.category === 'rehab' ? '🏃 ' : '🥣 '}
                                        {g.routineTitle}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 shrink-0">
                                      {g.slots.map((s, sIdx) => {
                                        const cfg = TIME_SLOT_CONFIG[s.timeSlot];
                                        return (
                                          <button
                                            key={sIdx}
                                            type="button"
                                            onClick={() => {
                                              if (!onToggleDailyLog) return;
                                              const logId = `dl-${dayRow.date}-${g.routineId}-${s.timeSlot}`;
                                              void onToggleDailyLog({
                                                id: logId,
                                                date: dayRow.date,
                                                routineId: g.routineId,
                                                timeSlot: s.timeSlot,
                                                isDone: !s.isDone,
                                                doneAt: !s.isDone ? 'Tích bù' : undefined,
                                                doneBy: !s.isDone ? defaultRecorder : undefined,
                                              });
                                            }}
                                            title="Bấm để tích / bỏ tích mục này"
                                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition cursor-pointer ${
                                              s.isDone
                                                ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                            }`}
                                          >
                                            {cfg?.emoji} {cfg?.label}:{' '}
                                            {s.isDone ? `✓ ${s.doneAt || 'Xong'}` : '+ Bấm tích'}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Nút Xem thêm / Thu gọn danh sách ngày để không bị kéo dài trang */}
            {baseRows.length > 5 && (
              <div className="px-4 py-3 bg-white border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => setDailyMatrixExpanded(!dailyMatrixExpanded)}
                  className="text-xs sm:text-sm font-extrabold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {dailyMatrixExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      <span>Thu gọn (Chỉ hiện 5 ngày gần nhất)</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span>Xem thêm {hiddenCount} ngày trước đó</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ===== SECTION 5: PHÂN TÍCH CHI TIẾT TỪNG ĐẦU VIỆC TRONG CHECKLIST (THUỐC & BÀI TẬP PHCN) ===== */}
      {complianceStats.routineStatsList.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRoutineBreakdown(!showRoutineBreakdown)}
            className="w-full px-4 py-3.5 bg-slate-50/70 hover:bg-slate-100/70 transition flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2 text-left">
              <Pill className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  Phân Tích Tỷ Lệ Thực Hiện Từng Thuốc & Bài Tập ({complianceStats.activeDaysCount}{' '}
                  ngày ghi sổ)
                </h3>
              </div>
            </div>
            {showRoutineBreakdown ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {showRoutineBreakdown && (
            <div className="p-4 space-y-4 border-t border-slate-100">
              {/* Tỷ lệ uống thuốc theo 4 buổi trong ngày */}
              <div>
                <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Tỷ lệ uống thuốc đúng cữ theo từng buổi
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {ALL_SLOTS.map((slot) => {
                    const cfg = TIME_SLOT_CONFIG[slot];
                    const sc = complianceStats.slotCompliance[slot];
                    return (
                      <div
                        key={slot}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">
                            {cfg.emoji} {cfg.label}
                          </span>
                          <span
                            className={`font-black ${
                              sc.expected === 0
                                ? 'text-slate-400'
                                : sc.pct >= 80
                                  ? 'text-emerald-700'
                                  : sc.pct >= 50
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                            }`}
                          >
                            {sc.expected > 0 ? `${sc.pct}%` : '—'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {sc.expected > 0
                            ? `Đã uống ${sc.done}/${sc.expected} cữ`
                            : 'Không có cữ thuốc'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2 Cột: Chi tiết từng loại thuốc & Chi tiết từng bài tập/chăm sóc */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                {/* Cột 1: Danh sách từng loại thuốc */}
                <div className="space-y-2">
                  <div className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                    💊 Chi tiết từng loại thuốc định kỳ
                  </div>
                  {complianceStats.routineStatsList
                    .filter(
                      (x) => x.routine.category === 'meds' && x.routine.medType !== 'as_needed'
                    )
                    .map((item) => (
                      <div
                        key={item.routine.id}
                        className="p-2.5 rounded-xl bg-emerald-50/40 border border-emerald-200/70 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-extrabold text-slate-800 truncate">
                            {item.routine.title}{' '}
                            <span className="font-normal text-slate-500">
                              ({item.routine.dosage})
                            </span>
                          </span>
                          <span className="font-black text-emerald-700 shrink-0">
                            {item.expected > 0
                              ? `${item.done}/${item.expected} cữ (${item.pct}%)`
                              : '⏳ Chưa tới giờ cữ đầu'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>📅 Áp dụng từ {fmtDateFull(item.startDate)}</span>
                          <span>Tính trong {item.activeDays} ngày</span>
                        </div>
                        <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.expected === 0
                                ? 'bg-slate-300'
                                : item.pct >= 80
                                  ? 'bg-emerald-500'
                                  : item.pct >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                            }`}
                            style={{ width: `${item.expected > 0 ? item.pct : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>

                {/* Cột 2: Danh sách từng bài tập PHCN & Chăm sóc */}
                <div className="space-y-2">
                  <div className="text-xs font-extrabold text-blue-800 uppercase tracking-wider">
                    🏃 Chi tiết từng Bài tập Phục hồi & Chăm sóc
                  </div>
                  {complianceStats.routineStatsList.filter(
                    (x) => x.routine.category === 'rehab' || x.routine.category === 'care'
                  ).length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400 italic">
                      Chưa có bài tập phục hồi hoặc mục chăm sóc nào đang kích hoạt.
                    </div>
                  ) : (
                    complianceStats.routineStatsList
                      .filter(
                        (x) => x.routine.category === 'rehab' || x.routine.category === 'care'
                      )
                      .map((item) => (
                        <div
                          key={item.routine.id}
                          className="p-2.5 rounded-xl bg-blue-50/40 border border-blue-200/70 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-extrabold text-slate-800 truncate">
                              {item.routine.category === 'rehab' ? '🏃 ' : '🥣 '}
                              {item.routine.title}{' '}
                              <span className="font-normal text-slate-500">
                                ({item.routine.dosage})
                              </span>
                            </span>
                            <span className="font-black text-blue-700 shrink-0">
                              {item.expected > 0
                                ? `${item.done}/${item.expected} lần (${item.pct}%)`
                                : '⏳ Chưa tới giờ'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-between">
                            <span>📅 Áp dụng từ {fmtDateFull(item.startDate)}</span>
                            <span>Tính trong {item.activeDays} ngày</span>
                          </div>
                          <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${item.expected > 0 ? item.pct : 0}%` }}
                            />
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== MODAL PHIẾU TÓM TẮT CHỈ SỐ TRÌNH BÁC SĨ (TÁI KHÁM & XÉT DUYỆT MỔ GHÉP SỌ) ===== */}
      {showDoctorReportModal && (() => {
        const periodEntriesDesc = [...(filteredLog.length > 0 ? filteredLog : normalizedVitals)].sort(
          compareVitalsDesc
        );
        const activeMedsList = careRoutines.filter(
          (r) => r.isActive && r.category === 'meds' && r.medType !== 'as_needed'
        );
        const notedEntries = periodEntriesDesc.filter((e) => Boolean(e.note && e.note.trim()));

        return (
          <div
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
            onClick={() => setShowDoctorReportModal(false)}
          >
            <div
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border-2 border-slate-200 animate-in fade-in duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between gap-2 shrink-0 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5 text-teal-200" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black truncate">
                      📄 Phiếu Tóm Tắt Chỉ Số Trình Bác Sĩ — Bệnh Nhân {patientName}
                    </h3>
                    <p className="text-[11px] text-teal-100/90 truncate">
                      Phục vụ tái khám &amp; xét duyệt mổ ghép sọ • Đưa Bác sĩ xem trực tiếp, In A4 / Lưu PDF hoặc Copy Zalo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDoctorReportModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thanh chọn nhanh Kỳ báo cáo & Chế độ xem ngay trong Modal */}
              <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap shrink-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-xs font-extrabold text-slate-600 mr-1">📅 Kỳ báo cáo:</span>
                  {(
                    [
                      { value: 'today', label: 'Hôm nay' },
                      { value: '3d', label: '3 ngày' },
                      { value: '7d', label: '7 ngày' },
                      { value: '14d', label: '14 ngày' },
                      { value: '30d', label: '30 ngày' },
                      { value: 'all', label: 'Tất cả' },
                    ] as { value: DateRange; label: string }[]
                  ).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setDateRange(item.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        dateRange === item.value
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDoctorReportTab('sheet')}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      doctorReportTab === 'sheet'
                        ? 'bg-white text-teal-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📋 Phiếu Y Khoa (Trình Bác sĩ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoctorReportTab('zalo')}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      doctorReportTab === 'zalo'
                        ? 'bg-white text-teal-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💬 Văn Bản Gửi Zalo
                  </button>
                </div>
              </div>

              {/* Nội dung Phiếu */}
              <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-white">
                {doctorReportTab === 'sheet' ? (
                  <div className="space-y-4">
                    {/* 1. Tóm tắt bệnh cảnh hiện tại */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs sm:text-sm text-slate-800 leading-relaxed">
                      <div className="font-black text-teal-950 mb-0.5">
                        🩺 Tóm tắt bệnh cảnh hiện tại trình Bác sĩ:
                      </div>
                      <p>
                        Bệnh nhân <strong>{patientName}</strong> — Sau phẫu thuật xuất huyết não, hiện <strong>không liệt vận động</strong>, tự đi lại và tập phục hồi chức năng tại nhà; có hội chứng <strong>bán manh đồng danh bên trái</strong>; đang theo dõi ngoại trú chờ lịch phẫu thuật <strong>ghép sọ</strong> (6–8 tuần).
                      </p>
                    </div>

                    {/* 2. Điểm lưu ý lâm sàng cần xin ý kiến Bác sĩ */}
                    {(summaryStats.slowPulseCount > 0 ||
                      summaryStats.warningCount + summaryStats.criticalCount > 0 ||
                      notedEntries.length > 0) && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-xs sm:text-sm text-amber-950 space-y-1.5">
                        <div className="font-black flex items-center gap-1.5 text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>
                            Điểm lưu ý lâm sàng cần xin ý kiến Bác sĩ (Tim mạch / Ngoại thần kinh / Gây mê):
                          </span>
                        </div>
                        <ul className="list-disc pl-5 space-y-1 leading-relaxed">
                          {summaryStats.slowPulseCount > 0 && (
                            <li>
                              <strong>Nhịp tim chậm (&lt; 60 lần/phút):</strong> Ghi nhận{' '}
                              <strong>
                                {summaryStats.slowPulseCount}/{summaryStats.periodReadingsCount} lần đo
                              </strong>{' '}
                              có mạch dưới 60 bpm
                              {summaryStats.verySlowPulseCount > 0
                                ? ` (trong đó ${summaryStats.verySlowPulseCount} lần < 50 bpm)`
                                : ''}
                              , thấp nhất <strong>{summaryStats.minPulse} bpm</strong>. Xin ý kiến Bác sĩ xem xét đơn thuốc huyết áp/tim mạch hiện tại và lưu ý khi khám tiền mê ghép sọ.
                            </li>
                          )}
                          {summaryStats.warningCount + summaryStats.criticalCount > 0 && (
                            <li>
                              <strong>Các lần huyết áp vượt ngưỡng (&ge; {bpThresholds.highSys}/{bpThresholds.highDia} mmHg):</strong>{' '}
                              Có <strong>{summaryStats.warningCount + summaryStats.criticalCount} lần</strong> trong kỳ (Cao nhất:{' '}
                              <strong>
                                {summaryStats.maxSys}/{summaryStats.maxDia} mmHg
                              </strong>
                              ).
                            </li>
                          )}
                          {notedEntries.length > 0 && (
                            <li>
                              <strong>Ghi chú triệu chứng &amp; vùng khuyết sọ đã ghi nhận ({notedEntries.length} lần):</strong>{' '}
                              {notedEntries
                                .slice(0, 5)
                                .map((n) => `${fmtDateShort(n.date)} ${n.time} (${n.note})`)
                                .join(' • ')}
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* 3. 4 Ô Chỉ Số Tổng Hợp */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">
                          1. Huyết áp Trung bình
                        </div>
                        <div className="text-xl font-black text-slate-900 mt-1">
                          {summaryStats.avgSys ?? '—'}/{summaryStats.avgDia ?? '—'}{' '}
                          <span className="text-xs font-semibold text-slate-500">mmHg</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Thấp–Cao: <strong>{summaryStats.minSys ?? '—'}–{summaryStats.maxSys ?? '—'}</strong> /{' '}
                          <strong>{summaryStats.minDia ?? '—'}–{summaryStats.maxDia ?? '—'}</strong>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">
                          2. Tỷ lệ đạt mục tiêu
                        </div>
                        <div className="text-xl font-black text-emerald-700 mt-1">
                          {summaryStats.inRangePct}%
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Đạt chuẩn {summaryStats.inTargetBpCount}/{summaryStats.periodReadingsCount} lần đo
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">
                          3. Tưới máu não (MAP)
                        </div>
                        <div className="text-xl font-black text-slate-900 mt-1">
                          {summaryStats.avgMAP ?? '—'}{' '}
                          <span className="text-xs font-semibold text-slate-500">mmHg</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Hiệu áp (PP) TB: <strong>{summaryStats.avgPP ?? '—'} mmHg</strong>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">
                          4. Nhịp tim (Mạch) TB
                        </div>
                        <div className="text-xl font-black text-slate-900 mt-1">
                          {summaryStats.avgPulse ?? '—'}{' '}
                          <span className="text-xs font-semibold text-slate-500">lần/phút</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Biên độ: <strong>{summaryStats.minPulse ?? '—'}–{summaryStats.maxPulse ?? '—'}</strong> ({summaryStats.slowPulseCount} lần &lt;60)
                        </div>
                      </div>
                    </div>

                    {/* 4. Bảng 2 cột: Trung bình 4 buổi & Đơn thuốc đang uống */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="px-3 py-2 bg-slate-100 text-xs font-black text-slate-800 uppercase">
                          I. Diễn biến trung bình 4 buổi trong ngày
                        </div>
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                              <th className="py-1.5 px-2.5 text-left font-bold">Buổi</th>
                              <th className="py-1.5 px-2.5 text-left font-bold">HA TB</th>
                              <th className="py-1.5 px-2.5 text-left font-bold">SYS Max</th>
                              <th className="py-1.5 px-2.5 text-left font-bold">Mạch TB</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {ALL_SLOTS.map((slot) => {
                              const st = summaryStats.byPeriod[slot];
                              const cfg = TIME_SLOT_CONFIG[slot];
                              return (
                                <tr key={slot}>
                                  <td className="py-1.5 px-2.5 font-bold text-slate-800">
                                    {cfg.emoji} {cfg.label} ({st.count})
                                  </td>
                                  <td className="py-1.5 px-2.5 font-extrabold text-slate-900">
                                    {st.count > 0 ? `${st.avgSys}/${st.avgDia}` : '—'}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-slate-700">
                                    {st.count > 0 ? `${st.maxSys} mmHg` : '—'}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-slate-700">
                                    {st.avgPulse ? `${st.avgPulse} l/p` : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="px-3 py-2 bg-slate-100 text-xs font-black text-slate-800 uppercase flex items-center justify-between">
                          <span>II. Đơn thuốc định kỳ đang uống</span>
                          {complianceStats.medsPercentage !== null && (
                            <span className="text-emerald-700">
                              Tuân thủ: {complianceStats.medsPercentage}%
                            </span>
                          )}
                        </div>
                        {activeMedsList.length === 0 ? (
                          <div className="p-3 text-xs text-slate-400 italic">
                            Chưa cài danh mục thuốc định kỳ.
                          </div>
                        ) : (
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                <th className="py-1.5 px-2.5 text-left font-bold">Tên thuốc</th>
                                <th className="py-1.5 px-2.5 text-left font-bold">Liều</th>
                                <th className="py-1.5 px-2.5 text-left font-bold">Khung giờ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {activeMedsList.map((m) => (
                                <tr key={m.id}>
                                  <td className="py-1.5 px-2.5 font-bold text-slate-800">
                                    {m.title}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-slate-700">{m.dosage}</td>
                                  <td className="py-1.5 px-2.5 text-slate-700">
                                    {(m.timeSlots || [])
                                      .map((s) => TIME_SLOT_CONFIG[s]?.label || s)
                                      .join(', ')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>

                    {/* 5. Bảng Nhật Ký Chi Tiết Các Lần Đo Trong Kỳ */}
                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-100 text-xs font-black text-slate-800 uppercase flex items-center justify-between">
                        <span>
                          III. Nhật ký chi tiết các lần đo ({periodEntriesDesc.length} lần đo)
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 normal-case">
                          Mới nhất xếp trên
                        </span>
                      </div>
                      <div className="overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                              <th className="py-2 px-2.5 text-left font-bold">Ngày &amp; Giờ</th>
                              <th className="py-2 px-2.5 text-left font-bold">Buổi</th>
                              <th className="py-2 px-2.5 text-left font-bold">Huyết áp</th>
                              <th className="py-2 px-2.5 text-left font-bold">Mạch</th>
                              <th className="py-2 px-2.5 text-left font-bold">MAP / PP</th>
                              <th className="py-2 px-2.5 text-left font-bold">
                                Đánh giá &amp; Ghi chú triệu chứng / vùng khuyết sọ
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {periodEntriesDesc.map((v) => {
                              const evalItem = evaluateVitalReading(v, bpThresholds);
                              const pp = v.sys - v.dia;
                              const map = Math.round(v.dia + pp / 3);
                              return (
                                <tr key={v.id} className="hover:bg-slate-50/80">
                                  <td className="py-1.5 px-2.5 font-semibold text-slate-700 whitespace-nowrap">
                                    {fmtDateShort(v.date)} {v.time}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-slate-600 whitespace-nowrap">
                                    {periodLabel(v.period)}
                                  </td>
                                  <td className="py-1.5 px-2.5 font-black text-slate-900 whitespace-nowrap">
                                    {v.sys}/{v.dia}{' '}
                                    <span className="text-[10px] font-normal text-slate-400">
                                      mmHg
                                    </span>
                                  </td>
                                  <td className="py-1.5 px-2.5 font-bold text-slate-800 whitespace-nowrap">
                                    {v.pulse ? `${v.pulse} l/p` : '—'}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-slate-600 whitespace-nowrap">
                                    {map} / {pp}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-slate-700">
                                    <span className="font-bold">{evalItem.badgeText}</span>
                                    {v.note && (
                                      <span className="ml-1.5 text-slate-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md font-medium">
                                        📝 {v.note}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <pre className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {buildDoctorSummaryText()}
                  </pre>
                )}
              </div>

              {/* Footer Modal: In A4 / Lưu PDF + Copy Zalo */}
              <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDoctorReportModal(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handlePrintDoctorReport}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In Phiếu A4 / Lưu PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyDoctorSummary}
                    className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    {copiedDoctorReport ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Đã Copy!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy gửi Bác sĩ / Zalo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== MODAL SỬA LẠI BẢN GHI HUYẾT ÁP ===== */}
      {editingEntry && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setEditingEntry(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border-2 border-slate-200 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                    Sửa Lại Bản Ghi Huyết Áp
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    Cập nhật trực tiếp lên biểu đồ & Google Sheets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="w-9 h-9 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSaveEdit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* 1. Hai ô số SYS / DIA */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-rose-50/60 p-3 rounded-2xl border-2 border-rose-200 flex flex-col justify-between">
                  <label className="block text-xs sm:text-sm font-black text-slate-900 mb-1.5 text-center">
                    1️⃣ SỐ TRÊN (SYS)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editSys}
                    onChange={(e) => setEditSys(e.target.value)}
                    min={40}
                    max={300}
                    required
                    className="w-full text-2xl sm:text-3xl font-black text-center text-slate-950 bg-white border-2 border-slate-300 rounded-xl py-2.5 px-2 focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div className="bg-teal-50/60 p-3 rounded-2xl border-2 border-teal-200 flex flex-col justify-between">
                  <label className="block text-xs sm:text-sm font-black text-slate-900 mb-1.5 text-center">
                    2️⃣ SỐ DƯỚI (DIA)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editDia}
                    onChange={(e) => setEditDia(e.target.value)}
                    min={20}
                    max={200}
                    required
                    className="w-full text-2xl sm:text-3xl font-black text-center text-slate-950 bg-white border-2 border-slate-300 rounded-xl py-2.5 px-2 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Xem trước trạng thái cảnh báo sau khi sửa (Đồng bộ cả Huyết áp & Nhịp tim) */}
              {(() => {
                const sNum = parseInt(editSys, 10);
                const dNum = parseInt(editDia, 10);
                const pNum = editPulse.trim() ? parseInt(editPulse, 10) : undefined;
                if (!isNaN(sNum) && !isNaN(dNum) && sNum > 0 && dNum > 0) {
                  const previewEval = evaluateVitalReading(
                    {
                      sys: sNum,
                      dia: dNum,
                      pulse: pNum && !isNaN(pNum) && pNum > 0 ? pNum : undefined,
                    },
                    bpThresholds
                  );
                  const previewColors = alertColors(previewEval.overallAlertLevel);
                  return (
                    <div className="flex items-center justify-between gap-2 flex-wrap px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="font-bold text-slate-600">Đánh giá chỉ số mới:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${previewEval.bp.badgeClass}`}
                        >
                          {previewEval.bp.shortLabel}
                        </span>
                        {previewEval.pulse.category !== 'none' && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${previewEval.pulse.badgeClass}`}
                          >
                            {previewEval.pulse.shortLabel}
                          </span>
                        )}
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold border ${previewColors.badge}`}
                        >
                          {previewEval.badgeText}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* 2. Nhịp tim & Người đo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    💓 Nhịp tim / Mạch (bpm)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editPulse}
                    onChange={(e) => setEditPulse(e.target.value)}
                    placeholder="VD: 78"
                    min={30}
                    max={250}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border-2 border-slate-200 bg-white text-base font-black text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    👤 Người đo
                  </label>
                  {members.length > 0 ? (
                    <select
                      value={editRecorder}
                      onChange={(e) => setEditRecorder(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                    >
                      {!members.some((m) => m.name === editRecorder) && editRecorder && (
                        <option value={editRecorder}>{editRecorder}</option>
                      )}
                      {members.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name} ({m.relation})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editRecorder}
                      onChange={(e) => setEditRecorder(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                    />
                  )}
                </div>
              </div>

              {/* 3. Ngày đo & Giờ đo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    📅 Ngày đo
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    required
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    🕒 Giờ đo
                  </label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    required
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border-2 border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* 4. Buổi đo */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  ⏰ Buổi đo
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['morning', 'noon', 'afternoon', 'evening'] as VitalsPeriod[]).map((p) => {
                    const cfg = TIME_SLOT_CONFIG[p];
                    const active = editPeriod === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditPeriod(p)}
                        className={`min-h-[46px] rounded-xl text-xs font-black border-2 transition cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white border-slate-950'
                            : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <span className="block text-sm leading-none mb-0.5">{cfg.emoji}</span>
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Ghi chú & Nút chọn nhanh vùng khuyết sọ / triệu chứng */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700">
                  📝 Ghi chú tình trạng Bố &amp; vùng khuyết sọ
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="VD: Sau tập đứng, hơi mệt..."
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-teal-600"
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {VITALS_QUICK_NOTE_TAGS.map((tag) => {
                    const selected = isQuickNoteTagSelected(editNote, tag.value);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          setEditNote((prev) => toggleQuickNoteTag(prev, tag.value))
                        }
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          selected
                            ? 'bg-teal-700 text-white border-teal-800'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="min-h-[46px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="min-h-[46px] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-black shadow-md flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default VitalsChartView;
