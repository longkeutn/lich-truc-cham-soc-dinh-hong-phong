'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
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
  getVietnamDateOffsetStr,
  getVietnamDateStr,
  detectCurrentTimeSlot,
} from '@/lib/config';

// =============================================
// TYPES & HELPERS
// =============================================

type DateRange = '7d' | '14d' | '30d' | 'all';

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

/** Đánh giá nhịp tim (Mạch) cho bệnh nhân sau tai biến */
function evaluatePulse(pulse?: number): {
  status: 'normal' | 'slow' | 'very_slow' | 'fast' | 'none';
  label: string;
  badgeClass: string;
} {
  if (!pulse || pulse <= 0) {
    return { status: 'none', label: 'Chưa ghi mạch', badgeClass: 'bg-slate-100 text-slate-500 border-slate-200' };
  }
  if (pulse < 50) {
    return {
      status: 'very_slow',
      label: `⚠️ Mạch chậm (${pulse} bpm)`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    };
  }
  if (pulse < 55) {
    return {
      status: 'slow',
      label: `⚡ Hơi chậm (${pulse} bpm)`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  if (pulse >= 100) {
    return {
      status: 'fast',
      label: `⚠️ Mạch nhanh (${pulse} bpm)`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    };
  }
  return {
    status: 'normal',
    label: `❤️ ${pulse} bpm (Ổn định)`,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
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
}: VitalsChartViewProps) {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // State bật/tắt giải thích nhanh trên 4 thẻ đầu trang (mặc định ẩn gọn gàng)
  const [activeCardInfo, setActiveCardInfo] = useState<number | null>(null);

  // State chế độ hiển thị biểu đồ ('chart' | 'timeline')
  const [chartViewMode, setChartViewMode] = useState<'chart' | 'timeline'>('chart');

  // State mở rộng dòng ngày trong Bảng Nhật Ký Chéo Ngày
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // State đóng/mở bảng phân tích chi tiết từng đầu việc Checklist
  const [showRoutineBreakdown, setShowRoutineBreakdown] = useState<boolean>(true);

  // State Modal Tóm tắt tái khám cho Bác sĩ / Gia đình
  const [showDoctorReportModal, setShowDoctorReportModal] = useState<boolean>(false);
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

  // ===== Lọc dữ liệu huyết áp theo khoảng thời gian =====
  const filteredLog = useMemo(() => {
    const sorted = [...vitalsLog].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return cmp !== 0 ? cmp : a.time.localeCompare(b.time);
    });

    if (dateRange === 'all') return sorted;

    const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : 30;
    const cutoff = daysAgo(days - 1);
    return sorted.filter((v) => v.date >= cutoff);
  }, [vitalsLog, dateRange]);

  // ===== PHÂN TÍCH SINH HIỆU CHUYÊN SÂU (HA, MIN-MAX, MẠCH, HIỆU ÁP, MAP, THEO BUỔI) =====
  const summaryStats = useMemo(() => {
    // Sắp xếp giảm dần theo ngày giờ để lấy bản ghi mới nhất
    const desc = [...vitalsLog].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      return cmp !== 0 ? cmp : b.time.localeCompare(a.time);
    });

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
    let slowPulseCount = 0; // < 55 bpm
    let fastPulseCount = 0; // >= 100 bpm
    let avgPP: number | null = null; // Hiệu áp TB (SYS - DIA)
    let avgMAP: number | null = null; // Huyết áp TB động mạch (DIA + 1/3 PP)
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

        if (v.alertLevel === 'critical') criticalCount++;
        else if (v.alertLevel === 'warning') warningCount++;
        else normalCount++;

        if (v.pulse && v.pulse > 0) {
          sumPulse += v.pulse;
          pulseCount++;
          if (minPulse === null || v.pulse < minPulse) minPulse = v.pulse;
          if (maxPulse === null || v.pulse > maxPulse) maxPulse = v.pulse;
          if (v.pulse < 55) slowPulseCount++;
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
      periodEntries.length > 0 ? Math.round((normalCount / periodEntries.length) * 100) : 100;

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

    // Phân tích theo 4 buổi trong ngày (Sáng / Trưa / Chiều / Tối)
    const byPeriod: Record<
      VitalsPeriod,
      {
        count: number;
        avgSys: number | null;
        avgDia: number | null;
        avgPulse: number | null;
        maxSys: number | null;
      }
    > = {
      morning: { count: 0, avgSys: null, avgDia: null, avgPulse: null, maxSys: null },
      noon: { count: 0, avgSys: null, avgDia: null, avgPulse: null, maxSys: null },
      afternoon: { count: 0, avgSys: null, avgDia: null, avgPulse: null, maxSys: null },
      evening: { count: 0, avgSys: null, avgDia: null, avgPulse: null, maxSys: null },
    };

    for (const slot of ALL_SLOTS) {
      const slotItems = periodEntries.filter((v) => v.period === slot);
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
        };
      }
    }

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
      fastPulseCount,
      avgPP,
      avgMAP,
      normalCount,
      warningCount,
      criticalCount,
      inRangePct,
      trend,
      byPeriod,
      totalReadings: vitalsLog.length,
      periodReadingsCount: periodEntries.length,
    };
  }, [vitalsLog, filteredLog]);

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
      if (l.isDone && l.date) allDatesWithData.push(l.date);
    }
    for (const v of vitalsLog) {
      if (v.date) allDatesWithData.push(v.date);
    }
    allDatesWithData.sort();
    const firstTrackedDate = allDatesWithData.length > 0 ? allDatesWithData[0] : todayStr;

    // 2. Xác định danh sách ngày cần đánh giá theo bộ lọc hiện tại (7d, 14d, 30d, all)
    const maxDays = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : dateRange === '30d' ? 30 : 30;
    const candidateDays: string[] = [];
    for (let i = 0; i < maxDays; i++) {
      const d = getVietnamDateOffsetStr(-i);
      // Chỉ tính từ ngày bắt đầu sử dụng sổ trở đi!
      if (d >= firstTrackedDate) {
        candidateDays.push(d);
      }
    }
    if (candidateDays.length === 0) {
      candidateDays.push(todayStr);
    }

    let totalExpectedDoses = 0;
    let totalDoneDoses = 0;
    let daysFullMeds = 0;

    let totalExpectedRehab = 0;
    let totalDoneRehab = 0;

    let totalExpectedCare = 0;
    let totalDoneCare = 0;

    let asNeededUsedCount = 0;

    // Thống kê theo từng đầu việc cụ thể
    const routineStatsMap: Record<
      string,
      {
        routine: CareRoutine;
        expected: number;
        done: number;
        pct: number;
      }
    > = {};

    for (const r of activeRoutines) {
      routineStatsMap[r.id] = { routine: r, expected: 0, done: 0, pct: 0 };
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
    }[] = [];

    for (const day of candidateDays) {
      const isToday = day === todayStr;
      const dayLogs = dailyLogs.filter((l) => l.date === day);
      const dayVitals = vitalsLog
        .filter((v) => v.date === day)
        .sort((a, b) => a.time.localeCompare(b.time));

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

      // 1) Thuốc định kỳ
      for (const routine of medsRoutines) {
        const slots = Array.isArray(routine.timeSlots) ? routine.timeSlots : [];
        for (const slot of slots) {
          const slotRank = SLOT_RANK[slot] || 1;
          const matchingLog = dayLogs.find(
            (l) =>
              (l.routineId === routine.id || l.id.includes(routine.id)) &&
              l.timeSlot === slot &&
              l.isDone
          );
          const isDone = Boolean(matchingLog);
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
      }

      // 3) Bài tập Phục hồi chức năng (PHCN)
      for (const routine of rehabRoutines) {
        const slots: TimeSlot[] =
          Array.isArray(routine.timeSlots) && routine.timeSlots.length > 0
            ? routine.timeSlots
            : ['morning'];
        for (const slot of slots) {
          const slotRank = SLOT_RANK[slot] || 1;
          const matchingLog = dayLogs.find(
            (l) =>
              (l.routineId === routine.id || l.id.includes(routine.id)) &&
              (l.timeSlot === slot || !l.timeSlot) &&
              l.isDone
          );
          const isDone = Boolean(matchingLog);
          const isExpected = !isToday || slotRank <= currentRank || isDone;

          if (isExpected) {
            dayExpectedRehab++;
            if (routineStatsMap[routine.id]) routineStatsMap[routine.id].expected++;
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
      }

      // 4) Chăm sóc & Dinh dưỡng
      for (const routine of careOnlyRoutines) {
        const slots: TimeSlot[] =
          Array.isArray(routine.timeSlots) && routine.timeSlots.length > 0
            ? routine.timeSlots
            : ['morning'];
        for (const slot of slots) {
          const slotRank = SLOT_RANK[slot] || 1;
          const matchingLog = dayLogs.find(
            (l) =>
              (l.routineId === routine.id || l.id.includes(routine.id)) &&
              (l.timeSlot === slot || !l.timeSlot) &&
              l.isDone
          );
          const isDone = Boolean(matchingLog);
          const isExpected = !isToday || slotRank <= currentRank || isDone;

          if (isExpected) {
            dayExpectedCare++;
            if (routineStatsMap[routine.id]) routineStatsMap[routine.id].expected++;
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
  }, [dailyLogs, careRoutines, vitalsLog, dateRange]);

  // ===== Dữ liệu cho biểu đồ Recharts (Kèm thông tin thuốc của buổi đo đó) =====
  const chartData = useMemo(() => {
    return filteredLog.map((v) => {
      const dayMatrix = complianceStats.dailyMatrix.find((d) => d.date === v.date);
      const slotInfo = dayMatrix?.slotStatus[v.period];
      const medsStatusLabel =
        slotInfo && slotInfo.expected > 0
          ? slotInfo.done === slotInfo.expected
            ? `✅ Đã uống đủ (${slotInfo.done}/${slotInfo.expected} cữ)`
            : `⚠️ Đã uống ${slotInfo.done}/${slotInfo.expected} cữ`
          : undefined;

      return {
        id: v.id,
        label: `${fmtDateShort(v.date)} ${v.time}`,
        fullDate: fmtDateFull(v.date),
        time: v.time,
        periodText: periodLabel(v.period),
        sys: v.sys,
        dia: v.dia,
        pulse: v.pulse ?? null,
        pp: v.sys - v.dia,
        recordedBy: v.recordedBy,
        note: v.note,
        medsStatusLabel,
      };
    });
  }, [filteredLog, complianceStats.dailyMatrix]);

  // ===== TẠO NỘI DUNG TÓM TẮT CHO BÁC SĨ / GIA ĐÌNH (COPY ZALO 1 CHẠM) =====
  const buildDoctorSummaryText = (): string => {
    const rangeLabel =
      dateRange === '7d'
        ? '7 ngày qua'
        : dateRange === '14d'
          ? '14 ngày qua'
          : dateRange === '30d'
            ? '30 ngày qua'
            : 'Toàn bộ lịch sử';
    const lines: string[] = [];
    lines.push(`🩺 BÁO CÁO THEO DÕI SỨC KHỎE TẠI NHÀ — BỆNH NHÂN: ${patientName.toUpperCase()}`);
    lines.push(`📅 Kỳ tổng hợp: ${rangeLabel} (Cập nhật ngày ${fmtDateFull(getVietnamDateStr())})`);
    lines.push(`────────────────────`);

    lines.push(`1️⃣ CHỈ SỐ HUYẾT ÁP (${summaryStats.periodReadingsCount} lần đo):`);
    if (summaryStats.avgSys !== null) {
      lines.push(`• Trung bình: ${summaryStats.avgSys}/${summaryStats.avgDia} mmHg`);
      lines.push(
        `• Biên độ dao động: Tâm thu ${summaryStats.minSys}–${summaryStats.maxSys} mmHg | Tâm trương ${summaryStats.minDia}–${summaryStats.maxDia} mmHg`
      );
      lines.push(
        `• Hiệu áp TB (SYS−DIA): ${summaryStats.avgPP} mmHg | HA trung bình (MAP): ${summaryStats.avgMAP} mmHg`
      );
      lines.push(
        `• Tỷ lệ trong ngưỡng an toàn: ${summaryStats.inRangePct}% (${summaryStats.normalCount}/${summaryStats.periodReadingsCount} lần đo)`
      );
    }
    if (summaryStats.latest) {
      lines.push(
        `• Lần đo gần nhất: ${summaryStats.latest.sys}/${summaryStats.latest.dia} mmHg${
          summaryStats.latest.pulse ? ` - Mạch ${summaryStats.latest.pulse} bpm` : ''
        } (${fmtDateShort(summaryStats.latest.date)} ${summaryStats.latest.time})`
      );
    }

    lines.push(`────────────────────`);
    lines.push(`2️⃣ NHỊP TIM (MẠCH) & BIẾN THIÊN THEO BUỔI:`);
    if (summaryStats.avgPulse !== null) {
      lines.push(
        `• Nhịp tim TB: ${summaryStats.avgPulse} bpm (Dao động: ${summaryStats.minPulse}–${summaryStats.maxPulse} bpm)`
      );
      if (summaryStats.slowPulseCount > 0) {
        lines.push(
          `  ⚠️ Lưu ý: Có ${summaryStats.slowPulseCount} lần đo nhịp tim dưới 55 bpm (nhịp chậm, cần báo bác sĩ xem xét).`
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
          `• ${periodLabel(slot)} (${p.count} lần): TB ${p.avgSys}/${p.avgDia} mmHg${
            p.avgPulse ? ` · Mạch TB ${p.avgPulse} bpm` : ''
          }`
        );
      }
    });

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
    const newAlert = computeAlertLevel(sysNum, diaNum, bpThresholds);

    const updated: VitalsLogEntry = {
      ...editingEntry,
      date: editDate || editingEntry.date,
      time: editTime || editingEntry.time,
      period: editPeriod,
      sys: sysNum,
      dia: diaNum,
      pulse: pulseNum && !isNaN(pulseNum) && pulseNum > 0 ? pulseNum : undefined,
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

  const latestPulseEval = evaluatePulse(summaryStats.latest?.pulse);

  return (
    <div className="space-y-4">
      {/* ===== SECTION 1: 4 THẺ CHỈ SỐ SINH HIỆU & TUÂN THỦ THÔNG MINH (CÓ ICON ℹ️ NHỎ GỌN) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Thẻ 1: HA & Mạch gần nhất */}
        <div
          className={`rounded-2xl border p-3.5 sm:p-4 shadow-2xs transition ${
            summaryStats.latest
              ? alertColors(summaryStats.latest.alertLevel).bg +
                ' ' +
                alertColors(summaryStats.latest.alertLevel).border
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">
                1. HA & Mạch Gần Nhất
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 1 ? null : 1)}
                className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                  activeCardInfo === 1
                    ? 'bg-teal-100 text-teal-800'
                    : 'text-slate-400 hover:text-teal-700 hover:bg-white/70'
                }`}
                title="Xem giải thích chỉ số"
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

          {summaryStats.latest ? (
            <>
              <div className="flex items-baseline justify-between gap-2 mt-1.5 flex-wrap">
                <div
                  className={`text-2xl font-black ${
                    alertColors(summaryStats.latest.alertLevel).text
                  }`}
                >
                  {summaryStats.latest.sys}/{summaryStats.latest.dia}
                  <span className="text-xs font-bold ml-1 text-slate-500">mmHg</span>
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

          {activeCardInfo === 1 && summaryStats.latest && (
            <div className="mt-2.5 pt-2 border-t border-black/10 text-[11px] text-slate-800 bg-white/85 p-2.5 rounded-xl leading-relaxed">
              💡 <strong>Chi tiết lần đo này:</strong> Hiệu áp (SYS−DIA) ={' '}
              <strong>{summaryStats.latest.sys - summaryStats.latest.dia} mmHg</strong> (tốt nhất
              40–60 mmHg). Ngưỡng mục tiêu của Bố đang cài là dưới{' '}
              <strong>
                {bpThresholds.highSys}/{bpThresholds.highDia} mmHg
              </strong>
              .
            </div>
          )}
        </div>

        {/* Thẻ 2: Trung bình & Biên độ dao động (Min - Max) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs transition">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                2. Trung Bình & Biên Độ
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 2 ? null : 2)}
                className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                  activeCardInfo === 2
                    ? 'bg-teal-100 text-teal-800'
                    : 'text-slate-400 hover:text-teal-700 hover:bg-slate-100'
                }`}
                title="Xem giải thích cách tính"
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
                Dao động:{' '}
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
            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl leading-relaxed">
              💡 <strong>Ý nghĩa:</strong> Huyết áp trung bình đi kèm{' '}
              <strong>Biên độ (Thấp nhất – Cao nhất)</strong>. Nếu khoảng cách giữa mức thấp nhất và
              cao nhất hẹp (dưới 20 mmHg) nghĩa là huyết áp của Bố rất ổn định, không bị vọt áp đột
              ngột.
            </div>
          )}
        </div>

        {/* Thẻ 3: Nhịp tim (Mạch) & Hiệu áp */}
        <div
          className={`rounded-2xl border p-3.5 sm:p-4 shadow-2xs transition ${
            summaryStats.slowPulseCount > 0 || summaryStats.fastPulseCount > 0
              ? 'bg-amber-50/40 border-amber-300'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">
                3. Mạch & Hiệu Áp TB
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 3 ? null : 3)}
                className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                  activeCardInfo === 3
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-slate-400 hover:text-amber-800 hover:bg-amber-50'
                }`}
                title="Xem giải thích Mạch & Hiệu áp"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            {summaryStats.avgPP !== null && (
              <span className="text-[11px] font-bold text-slate-500 shrink-0">
                Hiệu áp: {summaryStats.avgPP} mmHg
              </span>
            )}
          </div>

          <div className="flex items-baseline justify-between gap-2 mt-1.5 flex-wrap">
            {summaryStats.avgPulse !== null ? (
              <div
                className={`text-2xl font-black ${
                  summaryStats.avgPulse < 55
                    ? 'text-amber-800'
                    : summaryStats.avgPulse >= 100
                      ? 'text-rose-700'
                      : 'text-slate-900'
                }`}
              >
                ❤️ {summaryStats.avgPulse}
                <span className="text-xs font-bold ml-1 text-slate-500">bpm</span>
              </div>
            ) : (
              <div className="text-lg font-bold text-slate-400">Chưa đo mạch</div>
            )}

            <div className="flex items-center gap-1 text-xs font-extrabold">
              {summaryStats.trend === 'up' ? (
                <span className="text-rose-600 flex items-center gap-0.5">
                  <TrendingUp className="w-4 h-4" /> HA Tăng
                </span>
              ) : summaryStats.trend === 'down' ? (
                <span className="text-emerald-600 flex items-center gap-0.5">
                  <TrendingDown className="w-4 h-4" /> HA Giảm
                </span>
              ) : (
                <span className="text-teal-700 flex items-center gap-0.5">
                  <ArrowRight className="w-4 h-4" /> HA Ổn định
                </span>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-600 mt-1">
            {summaryStats.avgPulse !== null ? (
              <>
                Mạch: <strong>{summaryStats.minPulse}–{summaryStats.maxPulse} bpm</strong>
                {summaryStats.slowPulseCount > 0 && (
                  <span className="text-amber-800 font-bold">
                    {' '}
                    · ⚠️ {summaryStats.slowPulseCount} lần mạch &lt;55
                  </span>
                )}
              </>
            ) : (
              'Ghi thêm nhịp tim khi đo HA để theo dõi'
            )}
          </div>

          {activeCardInfo === 3 && (
            <div className="mt-2.5 pt-2 border-t border-amber-200/70 text-[11px] text-slate-800 bg-white/90 p-2.5 rounded-xl leading-relaxed space-y-1">
              <div>
                💡 <strong>Nhịp tim (Mạch):</strong> Bình thường từ <strong>60–100 bpm</strong>. Nếu
                Mạch thường xuyên <strong>dưới 55 bpm</strong> (nhịp chậm), gia đình nên báo bác sĩ
                khi tái khám để kiểm tra liều thuốc huyết áp/tim mạch.
              </div>
              <div>
                💡 <strong>Hiệu áp (SYS − DIA = {summaryStats.avgPP ?? '—'} mmHg):</strong> Tốt nhất
                từ <strong>40–60 mmHg</strong>. Áp lực tưới máu não TB (MAP) ={' '}
                <strong>{summaryStats.avgMAP ?? '—'} mmHg</strong> (chuẩn 70–100).
              </div>
            </div>
          )}
        </div>

        {/* Thẻ 4: Tuân thủ Thuốc & Tập PHCN (Chuẩn xác theo ngày thực tế ghi sổ) */}
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
            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-700 bg-emerald-50/60 p-2.5 rounded-xl leading-relaxed">
              💡 <strong>Cách tính chuẩn thực tế:</strong> Chỉ tính từ ngày bắt đầu ghi sổ (
              <strong>{fmtDateFull(complianceStats.firstTrackedDate)}</strong>) và các buổi đã tới
              giờ hôm nay — không cộng dồn những ngày trước khi gia đình bắt đầu dùng sổ.
            </div>
          )}
        </div>
      </div>

      {/* ===== SECTION 2: BỘ LỌC THỜI GIAN & NÚT TÓM TẮT GỬI BÁC SĨ ===== */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          {(
            [
              { value: '7d', label: '7 ngày' },
              { value: '14d', label: '14 ngày' },
              { value: '30d', label: '30 ngày' },
              { value: 'all', label: 'Tất cả' },
            ] as { value: DateRange; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDateRange(value)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                dateRange === value
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowDoctorReportModal(true)}
          className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
        >
          <ClipboardList className="w-4 h-4 text-teal-700" />
          <span>Tóm tắt gửi Bác sĩ / Zalo</span>
        </button>
      </div>

      {/* ===== SECTION 3: BIỂU ĐỒ XU HƯỚNG ĐA TẦNG & PHÂN TÍCH THEO 4 BUỔI TRONG NGÀY ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-black text-slate-800">
              Biểu Đồ Xu Hướng Huyết Áp & Nhịp Tim
            </h3>
            <span className="text-xs font-bold text-slate-400">
              ({filteredLog.length} lần đo)
            </span>
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
              📈 Biểu đồ
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
              🕒 Thẻ thời gian
            </button>
          </div>
        </div>

        {chartViewMode === 'chart' ? (
          <div className="p-3 sm:p-4 space-y-4">
            <ResponsiveContainer width="100%" height={270}>
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
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
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
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
                      <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-2xl p-3 shadow-lg text-xs space-y-1.5 min-w-[210px]">
                        <div className="font-extrabold text-slate-900 flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                          <span>
                            {data.fullDate} · {data.time}
                          </span>
                          <span className="text-slate-500">{data.periodText}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-semibold">Huyết áp (SYS/DIA):</span>
                          <span className="font-black text-sm text-rose-600">
                            {data.sys}/{data.dia} mmHg
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-semibold">Hiệu áp (SYS−DIA):</span>
                          <span className="font-bold text-slate-800">{data.pp} mmHg</span>
                        </div>
                        {data.pulse && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600 font-semibold">Nhịp tim (Mạch):</span>
                            <span
                              className={`font-extrabold ${
                                data.pulse < 55 ? 'text-amber-700' : 'text-violet-700'
                              }`}
                            >
                              ❤️ {data.pulse} bpm {data.pulse < 55 ? '(Chậm)' : ''}
                            </span>
                          </div>
                        )}
                        {data.medsStatusLabel && (
                          <div className="pt-1 border-t border-slate-100 text-[11px] font-bold text-teal-800">
                            💊 Thuốc buổi này: {data.medsStatusLabel}
                          </div>
                        )}
                        {data.note && (
                          <div className="text-[11px] text-slate-600 italic">📝 {data.note}</div>
                        )}
                        <div className="text-[10px] text-slate-400 text-right">
                          Người đo: {data.recordedBy}
                        </div>
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
                {/* Đường SYS */}
                <Line
                  type="monotone"
                  dataKey="sys"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                  name="sys"
                />
                {/* Đường DIA */}
                <Line
                  type="monotone"
                  dataKey="dia"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                  name="dia"
                />
                {/* Đường Mạch */}
                <Line
                  type="monotone"
                  dataKey="pulse"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 3.5, fill: '#8b5cf6', strokeWidth: 1.5, stroke: '#fff' }}
                  connectNulls
                  name="pulse"
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-3 h-1 bg-rose-500 inline-block rounded" /> SYS (Tâm thu)
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-3 h-1 bg-blue-500 inline-block rounded" /> DIA (Tâm trương)
              </span>
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-3 h-1 bg-violet-500 inline-block rounded" /> Mạch (bpm)
              </span>
            </div>

            {/* PHÂN TÍCH HUYẾT ÁP & MẠCH THEO 4 BUỔI TRONG NGÀY (SÁNG / TRƯA / CHIỀU / TỐI) */}
            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>🕒 Phân Tích Sinh Hiệu Theo Khung Giờ Trong Ngày</span>
                <span className="text-[11px] font-normal text-slate-400">
                  Giúp phát hiện hiện tượng vọt áp buổi sáng hoặc tối
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ALL_SLOTS.map((slot) => {
                  const cfg = TIME_SLOT_CONFIG[slot];
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
                          {st.count} lần đo
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
                            <span className="text-slate-400">Cao nhất: {st.maxSys}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 mt-1.5 italic">
                          Chưa có lần đo buổi {cfg.label.toLowerCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ===== CHẾ ĐỘ THẺ THỜI GIAN DỌC ===== */
          <div className="p-4 space-y-3">
            {[...filteredLog].reverse().map((v, i) => {
              const colors = alertColors(v.alertLevel);
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
                      <span className={`text-lg font-black ${colors.text}`}>
                        {v.sys}/{v.dia}
                        <span className="text-xs font-bold ml-1">mmHg</span>
                      </span>
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
                      <span className="text-slate-500">Hiệu áp: {v.sys - v.dia} mmHg</span>
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

      {/* ===== SECTION 4: BẢNG NHẬT KÝ ĐỐI CHIẾU HÀNG NGÀY (HUYẾT ÁP ↔ CHECKLIST THUỐC & TẬP PHCN) ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <div>
              <h3 className="text-sm font-black text-slate-800">
                Nhật Ký Đối Chiếu Hàng Ngày: Huyết Áp ↔ Thuốc & Tập PHCN
              </h3>
              <p className="text-xs text-slate-500">
                Bấm vào từng ngày để xem chi tiết những thuốc đã uống, giờ uống & bài tập trong ngày
                đó
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
            {complianceStats.dailyMatrix.length} ngày theo dõi
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {complianceStats.dailyMatrix.map((dayRow) => {
            const isExpanded = expandedDay === dayRow.date;
            const medsPct =
              dayRow.medsExpected > 0
                ? Math.round((dayRow.medsDone / dayRow.medsExpected) * 100)
                : null;

            return (
              <div key={dayRow.date} className="transition-colors">
                <button
                  type="button"
                  onClick={() => setExpandedDay(isExpanded ? null : dayRow.date)}
                  className="w-full px-3.5 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/80 transition text-left cursor-pointer"
                >
                  {/* Cột 1: Ngày */}
                  <div className="flex items-center gap-2.5 min-w-[145px]">
                    <div
                      className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                        dayRow.isToday
                          ? 'bg-teal-700 text-white border-teal-800'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      {fmtDateShort(dayRow.date)}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                        {dayRow.isToday ? 'Hôm nay' : getWeekdayVN(dayRow.date)}
                      </div>
                      <div className="text-[11px] text-slate-400">{fmtDateFull(dayRow.date)}</div>
                    </div>
                  </div>

                  {/* Cột 2: Các lần đo Huyết áp & Mạch trong ngày */}
                  <div className="flex-1 min-w-0">
                    {dayRow.vitals.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {dayRow.vitals.map((v) => {
                          const c = alertColors(v.alertLevel);
                          const cfg = TIME_SLOT_CONFIG[v.period];
                          return (
                            <span
                              key={v.id}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${c.bg} ${c.border} ${c.text}`}
                            >
                              <span>{cfg?.emoji || '🕒'}</span>
                              <span className="font-black">
                                {v.sys}/{v.dia}
                              </span>
                              {v.pulse && (
                                <span
                                  className={`text-[11px] ${
                                    v.pulse < 55
                                      ? 'text-amber-800 font-extrabold'
                                      : 'text-slate-600 font-medium'
                                  }`}
                                >
                                  (❤️{v.pulse})
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        Chưa ghi huyết áp ngày này
                      </span>
                    )}
                  </div>

                  {/* Cột 3: Tiến độ 4 buổi Thuốc + Tập PHCN */}
                  <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    {/* 4 chấm buổi Sáng / Trưa / Chiều / Tối */}
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200/80">
                      {ALL_SLOTS.map((slot) => {
                        const cfg = TIME_SLOT_CONFIG[slot];
                        const st = dayRow.slotStatus[slot];
                        let pillClass = 'bg-slate-100 text-slate-400 border-slate-200';
                        let statusIcon = '·';
                        if (st.status === 'done') {
                          pillClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                          statusIcon = '✓';
                        } else if (st.status === 'partial') {
                          pillClass = 'bg-amber-100 text-amber-800 border-amber-300';
                          statusIcon = `${st.done}/${st.expected}`;
                        } else if (st.status === 'missed') {
                          pillClass = 'bg-rose-100 text-rose-800 border-rose-300';
                          statusIcon = '!';
                        } else if (st.status === 'pending') {
                          pillClass = 'bg-slate-100 text-slate-500 border-slate-200';
                          statusIcon = '⏳';
                        }
                        return (
                          <span
                            key={slot}
                            title={`Buổi ${cfg.label}: ${st.done}/${st.expected} cữ thuốc`}
                            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${pillClass}`}
                          >
                            {cfg.emoji} {statusIcon}
                          </span>
                        );
                      })}
                    </div>

                    {/* Tổng cữ thuốc ngày đó */}
                    {medsPct !== null && (
                      <span
                        className={`px-2 py-1 rounded-xl text-xs font-extrabold border ${
                          medsPct === 100
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : medsPct >= 50
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        💊 {dayRow.medsDone}/{dayRow.medsExpected}
                      </span>
                    )}

                    {/* Bài tập PHCN ngày đó */}
                    {dayRow.rehabExpected > 0 && (
                      <span className="px-2 py-1 rounded-xl text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                        🏃 {dayRow.rehabDone}/{dayRow.rehabExpected}
                      </span>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Chi tiết mở rộng của ngày đó */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 bg-slate-50/70 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Cột A: Những việc đã hoàn thành trong ngày */}
                    <div className="bg-white rounded-xl border border-emerald-200/80 p-3 space-y-2">
                      <div className="font-extrabold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>
                          Đã thực hiện trong ngày ({dayRow.completedDetails.length} mục)
                        </span>
                      </div>
                      {dayRow.completedDetails.length === 0 ? (
                        <p className="text-slate-400 italic">
                          Chưa có mục nào được tích hoàn thành trong ngày này.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {dayRow.completedDetails.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50/50 border border-emerald-100"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800">
                                  {item.category === 'rehab'
                                    ? '🏃 '
                                    : item.category === 'care'
                                      ? '🥣 '
                                      : '💊 '}
                                  {item.routineTitle}
                                </span>
                                <span className="text-slate-500 ml-1.5">
                                  ({periodLabel(item.timeSlot)})
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 shrink-0">
                                {item.doneAt ? `${item.doneAt}` : 'Đã xong'}
                                {item.doneBy ? ` · ${item.doneBy}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Cột B: Những việc còn thiếu / chưa tích trong các buổi đã qua */}
                    <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                      <div className="font-extrabold text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>
                          Chưa tích hoàn thành ({dayRow.missedDetails.length} mục)
                        </span>
                      </div>
                      {dayRow.missedDetails.length === 0 ? (
                        <p className="text-emerald-700 font-bold">
                          🎉 Tuyệt vời! Tất cả cữ thuốc & bài tập đến hiện tại của ngày này đều đã
                          hoàn thành đầy đủ.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {dayRow.missedDetails.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50/50 border border-amber-200/70"
                            >
                              <span className="font-semibold text-slate-800">
                                {item.category === 'rehab'
                                  ? '🏃 '
                                  : item.category === 'care'
                                    ? '🥣 '
                                    : '💊 '}
                                {item.routineTitle}
                              </span>
                              <span className="text-[11px] font-bold text-amber-800 shrink-0">
                                {periodLabel(item.timeSlot)}
                              </span>
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
      </div>

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
                            {item.done}/{item.expected} cữ ({item.pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.pct >= 80
                                ? 'bg-emerald-500'
                                : item.pct >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                            }`}
                            style={{ width: `${item.pct}%` }}
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
                              {item.done}/{item.expected} lần ({item.pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${item.pct}%` }}
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

      {/* ===== SECTION 6: BẢNG LỊCH SỬ ĐO CHI TIẾT ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-500" />
          <h3 className="text-sm font-black text-slate-800">Lịch Sử Đo Chi Tiết</h3>
          <span className="text-xs text-slate-400 ml-auto">{filteredLog.length} bản ghi</span>
        </div>

        {historyEntries.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            Không có dữ liệu trong khoảng thời gian này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <th className="text-left px-2.5 sm:px-3 py-2.5 font-bold">Ngày / Giờ</th>
                  <th className="text-center px-2 sm:px-3 py-2.5 font-bold">Huyết áp</th>
                  <th className="text-center px-3 py-2.5 font-bold hidden sm:table-cell">
                    Mạch & Hiệu áp
                  </th>
                  <th className="text-center px-2 sm:px-3 py-2.5 font-bold">Đánh giá</th>
                  <th className="text-left px-3 py-2.5 font-bold hidden sm:table-cell">Ghi chú</th>
                  <th className="text-center px-2 sm:px-3 py-2.5 font-bold">Sửa / Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyEntries.map((v) => {
                  const colors = alertColors(v.alertLevel);
                  const pEval = evaluatePulse(v.pulse);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-2.5 sm:px-3 py-3 text-slate-700">
                        <div className="font-bold text-slate-900">
                          {fmtDateShort(v.date)}{' '}
                          <span className="font-normal text-slate-500">· {v.time}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {periodLabel(v.period)} · {v.recordedBy}
                        </div>
                        {v.note && (
                          <div className="sm:hidden text-xs text-slate-600 italic mt-1 break-words">
                            📝 {v.note}
                          </div>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-center whitespace-nowrap">
                        <span className={`font-black text-base sm:text-lg ${colors.text}`}>
                          {v.sys}/{v.dia}
                        </span>
                        <div className="text-[11px] text-slate-400">
                          PP: {v.sys - v.dia} mmHg
                        </div>
                        {v.pulse && (
                          <div className="sm:hidden text-xs text-slate-600 font-bold mt-0.5">
                            ❤️ {v.pulse} bpm
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600 hidden sm:table-cell">
                        {v.pulse ? (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${pEval.badgeClass}`}
                          >
                            {pEval.label}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-center">
                        <span
                          className={`inline-flex whitespace-nowrap px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors.badge}`}
                        >
                          {alertLabel(v.alertLevel)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 text-xs hidden sm:table-cell max-w-[180px] truncate">
                        {v.note || '—'}
                      </td>
                      <td className="px-1.5 sm:px-3 py-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(v)}
                            className="p-2 rounded-xl bg-teal-50/70 hover:bg-teal-100 text-teal-600 hover:text-teal-800 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                            title="Sửa lại chỉ số này"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(v)}
                            disabled={deletingId === v.id}
                            className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                            title="Xóa bản ghi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Nút mở rộng/thu gọn */}
        {hasMoreHistory && (
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="w-full px-4 py-2.5 text-sm font-bold text-teal-600 hover:bg-teal-50 transition-colors flex items-center justify-center gap-1.5 border-t border-slate-100 cursor-pointer"
          >
            {historyExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Thu gọn
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Xem thêm ({filteredLog.length - 10} bản ghi)
              </>
            )}
          </button>
        )}
      </div>

      {/* ===== MODAL TÓM TẮT BÁO CÁO BÁC SĨ KHI TÁI KHÁM / GỬI ZALO ===== */}
      {showDoctorReportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowDoctorReportModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-2 border-slate-200 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-5 py-3.5 bg-teal-50/70 border-b border-teal-200 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                    Phiếu Tóm Tắt Sức Khỏe Tái Khám
                  </h3>
                  <p className="text-xs text-slate-600 truncate">
                    Dùng đưa Bác sĩ xem nhanh hoặc Copy gửi vào nhóm Zalo gia đình
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDoctorReportModal(false)}
                className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              {summaryStats.slowPulseCount > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-2.5 text-xs text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Điểm cần hỏi Bác sĩ khi tái khám:</strong> Trong kỳ có{' '}
                    <strong>{summaryStats.slowPulseCount} lần</strong> nhịp tim của Bố dưới{' '}
                    <strong>55 bpm</strong> (thấp nhất {summaryStats.minPulse} bpm), cần hỏi bác sĩ
                    xem có cần điều chỉnh thuốc tim mạch/huyết áp hay không.
                  </div>
                </div>
              )}

              <pre className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                {buildDoctorSummaryText()}
              </pre>
            </div>

            <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDoctorReportModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs sm:text-sm font-bold cursor-pointer"
              >
                Đóng
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
      )}

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

              {/* Xem trước trạng thái cảnh báo sau khi sửa */}
              {(() => {
                const sNum = parseInt(editSys, 10);
                const dNum = parseInt(editDia, 10);
                if (!isNaN(sNum) && !isNaN(dNum) && sNum > 0 && dNum > 0) {
                  const previewLevel = computeAlertLevel(sNum, dNum, bpThresholds);
                  const previewColors = alertColors(previewLevel);
                  return (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="font-bold text-slate-600">Đánh giá chỉ số mới:</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold border ${previewColors.badge}`}
                      >
                        {alertLabel(previewLevel)}
                      </span>
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

              {/* 5. Ghi chú */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  📝 Ghi chú
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="VD: Sau tập đứng, hơi mệt..."
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border-2 border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:border-teal-600"
                />
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
