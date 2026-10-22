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
} from 'lucide-react';
import type {
  VitalsLogEntry,
  VitalsPeriod,
  BpThresholds,
  DailyLog,
  CareRoutine,
  AlertLevel,
  FamilyMember,
} from '@/lib/types';
import { TIME_SLOT_CONFIG, computeAlertLevel } from '@/lib/config';

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
  onDeleteVitals: (id: string) => Promise<void>;
  onSaveVitals: (entry: VitalsLogEntry) => Promise<void>;
}

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

/** Tính n ngày trước */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
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
    case 'critical': return '🔴 Nguy hiểm';
    case 'warning': return '🟡 Cảnh báo';
    default: return '🟢 Bình thường';
  }
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
  onDeleteVitals,
  onSaveVitals,
}: VitalsChartViewProps) {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

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

  // ===== Lọc dữ liệu theo khoảng thời gian =====
  const filteredLog = useMemo(() => {
    const sorted = [...vitalsLog].sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return cmp !== 0 ? cmp : a.time.localeCompare(b.time);
    });

    if (dateRange === 'all') return sorted;

    const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : 30;
    const cutoff = daysAgo(days);
    return sorted.filter((v) => v.date >= cutoff);
  }, [vitalsLog, dateRange]);

  // ===== Tóm tắt: HA gần nhất, TB 7 ngày, xu hướng =====
  const summaryStats = useMemo(() => {
    // Sort descending for "latest"
    const desc = [...vitalsLog].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      return cmp !== 0 ? cmp : b.time.localeCompare(a.time);
    });

    const latest = desc[0] ?? null;
    const previous = desc[1] ?? null;

    // TB 7 ngày
    const sevenDaysAgo = daysAgo(7);
    const last7 = desc.filter((v) => v.date >= sevenDaysAgo);
    const avgSys = last7.length > 0 ? Math.round(last7.reduce((s, v) => s + v.sys, 0) / last7.length) : null;
    const avgDia = last7.length > 0 ? Math.round(last7.reduce((s, v) => s + v.dia, 0) / last7.length) : null;

    // Xu hướng (so sánh 3 lần đo gần nhất)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (desc.length >= 3) {
      const recent3 = desc.slice(0, 3);
      const avgRecent = recent3.reduce((s, v) => s + v.sys, 0) / 3;
      const olderEntries = desc.slice(3, 6);
      if (olderEntries.length >= 2) {
        const avgOlder = olderEntries.reduce((s, v) => s + v.sys, 0) / olderEntries.length;
        const diff = avgRecent - avgOlder;
        if (diff > 5) trend = 'up';
        else if (diff < -5) trend = 'down';
      }
    } else if (latest && previous) {
      const diff = latest.sys - previous.sys;
      if (diff > 5) trend = 'up';
      else if (diff < -5) trend = 'down';
    }

    return { latest, previous, avgSys, avgDia, trend, totalReadings: vitalsLog.length };
  }, [vitalsLog]);

  // ===== Thống kê tuân thủ thuốc =====
  const complianceStats = useMemo(() => {
    const medsRoutines = careRoutines.filter((r) => r.category === 'meds' && r.isActive && r.medType === 'scheduled');
    const rehabRoutines = careRoutines.filter((r) => r.category === 'rehab' && r.isActive);

    // Tính % ngày uống thuốc đủ trong 7 ngày qua
    const last7Days: string[] = [];
    for (let i = 0; i < 7; i++) {
      last7Days.push(daysAgo(i));
    }

    let daysFullMeds = 0;
    let totalRehabDone = 0;

    for (const day of last7Days) {
      // Mỗi ngày: kiểm tra tất cả meds routine × timeSlots đều isDone
      const dayLogs = dailyLogs.filter((l) => l.date === day);
      let allMedsDone = true;

      for (const routine of medsRoutines) {
        for (const slot of routine.timeSlots) {
          const found = dayLogs.find(
            (l) => l.routineId === routine.id && l.timeSlot === slot && l.isDone
          );
          if (!found) allMedsDone = false;
        }
      }

      if (medsRoutines.length > 0 && allMedsDone) daysFullMeds++;

      // Đếm rehab done
      for (const routine of rehabRoutines) {
        for (const slot of routine.timeSlots) {
          const found = dayLogs.find(
            (l) => l.routineId === routine.id && l.timeSlot === slot && l.isDone
          );
          if (found) totalRehabDone++;
        }
      }
    }

    const medsPercentage = medsRoutines.length > 0
      ? Math.round((daysFullMeds / 7) * 100)
      : null;

    return { daysFullMeds, medsPercentage, totalRehabDone };
  }, [dailyLogs, careRoutines]);

  // ===== Dữ liệu cho biểu đồ Recharts =====
  const chartData = useMemo(() => {
    return filteredLog.map((v) => ({
      label: `${fmtDateShort(v.date)} ${v.time}`,
      sys: v.sys,
      dia: v.dia,
      pulse: v.pulse ?? null,
    }));
  }, [filteredLog]);

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
          📈 Biểu Đồ Huyết Áp
        </h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Chưa có dữ liệu huyết áp nào được ghi nhận. Hãy chuyển sang tab{' '}
          <strong>Hôm Nay</strong> để ghi lần đo đầu tiên.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== SECTION 1: Thẻ tóm tắt ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card: HA gần nhất */}
        <div className={`rounded-2xl border p-3 sm:p-4 ${
          summaryStats.latest
            ? alertColors(summaryStats.latest.alertLevel).bg + ' ' + alertColors(summaryStats.latest.alertLevel).border
            : 'bg-white border-slate-200'
        }`}>
          <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
            <Heart className="w-3 h-3" />
            HA Gần Nhất
          </div>
          {summaryStats.latest ? (
            <>
              <div className={`text-xl sm:text-2xl font-black ${
                alertColors(summaryStats.latest.alertLevel).text
              }`}>
                {summaryStats.latest.sys}/{summaryStats.latest.dia}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {fmtDateShort(summaryStats.latest.date)} · {summaryStats.latest.time}
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">—</div>
          )}
        </div>

        {/* Card: TB 7 ngày */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="text-xs font-bold text-slate-500 mb-1">
            TB 7 Ngày
          </div>
          {summaryStats.avgSys !== null ? (
            <>
              <div className="text-xl sm:text-2xl font-black text-slate-800">
                {summaryStats.avgSys}/{summaryStats.avgDia}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                mmHg
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">Chưa đủ dữ liệu</div>
          )}
        </div>

        {/* Card: Xu hướng */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="text-xs font-bold text-slate-500 mb-1">
            Xu Hướng
          </div>
          <div className="flex items-center gap-1.5">
            {summaryStats.trend === 'up' ? (
              <>
                <TrendingUp className="w-6 h-6 text-rose-500" />
                <span className="text-base font-black text-rose-600">Tăng ↑</span>
              </>
            ) : summaryStats.trend === 'down' ? (
              <>
                <TrendingDown className="w-6 h-6 text-emerald-500" />
                <span className="text-base font-black text-emerald-600">Giảm ↓</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-6 h-6 text-blue-500" />
                <span className="text-base font-black text-blue-600">Ổn định →</span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {summaryStats.totalReadings} lần đo
          </div>
        </div>

        {/* Card: Tuân thủ thuốc */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
            <Pill className="w-3 h-3" />
            Uống Thuốc
          </div>
          {complianceStats.medsPercentage !== null ? (
            <>
              <div className={`text-xl sm:text-2xl font-black ${
                complianceStats.medsPercentage >= 80 ? 'text-emerald-600' :
                complianceStats.medsPercentage >= 50 ? 'text-amber-600' :
                'text-rose-600'
              }`}>
                {complianceStats.medsPercentage}%
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {complianceStats.daysFullMeds}/7 ngày đủ thuốc
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">Chưa cài thuốc</div>
          )}
        </div>
      </div>

      {/* ===== SECTION 2: Bộ lọc thời gian ===== */}
      <div className="flex gap-2 flex-wrap">
        {([
          { value: '7d', label: '7 ngày' },
          { value: '14d', label: '14 ngày' },
          { value: '30d', label: '30 ngày' },
          { value: 'all', label: 'Tất cả' },
        ] as { value: DateRange; label: string }[]).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setDateRange(value)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              dateRange === value
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ===== SECTION 3: Biểu đồ / Timeline ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-black text-slate-800">
            {filteredLog.length >= 7 ? 'Biểu Đồ Xu Hướng Huyết Áp' : 'Dòng Thời Gian Đo Huyết Áp'}
          </h3>
          <span className="text-xs text-slate-400 ml-auto">
            {filteredLog.length} lần đo
          </span>
        </div>

        {filteredLog.length >= 7 ? (
          /* ===== LINE CHART (≥ 7 lần đo) ===== */
          <div className="p-3 sm:p-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval="preserveStartEnd"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  domain={['dataMin - 10', 'dataMax + 10']}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    fontSize: '13px',
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      sys: 'Tâm thu (SYS)',
                      dia: 'Tâm trương (DIA)',
                      pulse: 'Mạch',
                    };
                    return [`${value} ${name === 'pulse' ? 'bpm' : 'mmHg'}`, labels[name] || name];
                  }}
                />
                {/* Đường ngưỡng cảnh báo */}
                <ReferenceLine
                  y={bpThresholds.highSys}
                  stroke="#ef4444"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  label={{
                    value: `SYS ${bpThresholds.highSys}`,
                    position: 'right',
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
                    value: `DIA ${bpThresholds.highDia}`,
                    position: 'right',
                    fontSize: 10,
                    fill: '#f59e0b',
                  }}
                />
                {/* Đường SYS */}
                <Line
                  type="monotone"
                  dataKey="sys"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#ef4444' }}
                  activeDot={{ r: 5, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                  name="sys"
                />
                {/* Đường DIA */}
                <Line
                  type="monotone"
                  dataKey="dia"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#3b82f6' }}
                  activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                  name="dia"
                />
                {/* Đường Mạch (nếu có) */}
                <Line
                  type="monotone"
                  dataKey="pulse"
                  stroke="#8b5cf6"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  connectNulls
                  name="pulse"
                />
              </LineChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-rose-500 inline-block rounded" /> SYS (Tâm thu)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" /> DIA (Tâm trương)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-violet-500 inline-block rounded border-dashed" /> Mạch
              </span>
            </div>
          </div>
        ) : (
          /* ===== TIMELINE DỌC (< 7 lần đo) ===== */
          <div className="p-4 space-y-3">
            {[...filteredLog].reverse().map((v, i) => {
              const colors = alertColors(v.alertLevel);
              return (
                <div key={v.id} className="flex gap-3 items-start">
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3.5 h-3.5 rounded-full ${colors.dot} ring-2 ring-white shadow-sm`} />
                    {i < filteredLog.length - 1 && (
                      <div className="w-0.5 flex-1 min-h-[24px] bg-slate-200 mt-1" />
                    )}
                  </div>
                  {/* Card */}
                  <div className={`flex-1 min-w-0 rounded-xl border ${colors.border} ${colors.bg} p-3`}>
                    <div className="flex items-baseline justify-between flex-wrap gap-1">
                      <span className={`text-lg font-black ${colors.text}`}>
                        {v.sys}/{v.dia}
                        <span className="text-xs font-bold ml-1">mmHg</span>
                      </span>
                      <span className="text-xs text-slate-500">
                        {fmtDateFull(v.date)} · {v.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                      <span>{periodLabel(v.period)}</span>
                      {v.pulse && <span>❤️ {v.pulse} bpm</span>}
                      <span className="ml-auto">{v.recordedBy}</span>
                    </div>
                    {v.note && (
                      <div className="text-xs text-slate-500 mt-1 italic break-words">📝 {v.note}</div>
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

      {/* ===== SECTION 4: Bảng lịch sử đo chi tiết ===== */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-500" />
          <h3 className="text-sm font-black text-slate-800">Lịch Sử Đo Chi Tiết</h3>
          <span className="text-xs text-slate-400 ml-auto">
            {filteredLog.length} bản ghi
          </span>
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
                  <th className="text-center px-3 py-2.5 font-bold hidden sm:table-cell">Mạch</th>
                  <th className="text-center px-2 sm:px-3 py-2.5 font-bold">Trạng thái</th>
                  <th className="text-left px-3 py-2.5 font-bold hidden sm:table-cell">Ghi chú</th>
                  <th className="text-center px-2 sm:px-3 py-2.5 font-bold">Sửa / Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyEntries.map((v) => {
                  const colors = alertColors(v.alertLevel);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-2.5 sm:px-3 py-3 text-slate-700">
                        <div className="font-bold text-slate-900">
                          {fmtDateShort(v.date)} <span className="font-normal text-slate-500">· {v.time}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {periodLabel(v.period)}
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
                        {v.pulse && (
                          <div className="sm:hidden text-xs text-slate-500 font-medium mt-0.5">
                            ❤️ {v.pulse} bpm
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600 hidden sm:table-cell font-medium">
                        {v.pulse ? `${v.pulse} bpm` : '—'}
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-center">
                        <span className={`inline-flex whitespace-nowrap px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors.badge}`}>
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
            className="w-full px-4 py-2.5 text-sm font-bold text-teal-600 hover:bg-teal-50 transition-colors flex items-center justify-center gap-1.5 border-t border-slate-100"
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

      {/* ===== SECTION 5: Thống kê tuân thủ ===== */}
      {(complianceStats.medsPercentage !== null || complianceStats.totalRehabDone > 0) && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
          <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
            <Pill className="w-4 h-4 text-emerald-500" />
            Thống Kê Tuân Thủ (7 Ngày Qua)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {complianceStats.medsPercentage !== null && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <div className="text-xs font-bold text-emerald-600 mb-1">💊 Uống Thuốc Đủ</div>
                <div className="flex items-end gap-2">
                  <span className={`text-2xl font-black ${
                    complianceStats.medsPercentage >= 80 ? 'text-emerald-700' :
                    complianceStats.medsPercentage >= 50 ? 'text-amber-700' :
                    'text-rose-700'
                  }`}>
                    {complianceStats.medsPercentage}%
                  </span>
                  <span className="text-xs text-emerald-600 mb-1">
                    ({complianceStats.daysFullMeds}/7 ngày)
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 w-full bg-emerald-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      complianceStats.medsPercentage >= 80 ? 'bg-emerald-500' :
                      complianceStats.medsPercentage >= 50 ? 'bg-amber-500' :
                      'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(complianceStats.medsPercentage, 100)}%` }}
                  />
                </div>
              </div>
            )}
            {complianceStats.totalRehabDone > 0 && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                <div className="text-xs font-bold text-blue-600 mb-1">🏃 Tập Phục Hồi</div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-blue-700">
                    {complianceStats.totalRehabDone}
                  </span>
                  <span className="text-xs text-blue-600 mb-1">buổi tập</span>
                </div>
                <div className="text-xs text-blue-500 mt-1">
                  Trong 7 ngày qua
                </div>
              </div>
            )}
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
                      <span className={`px-2.5 py-0.5 rounded-full font-bold border ${previewColors.badge}`}>
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
