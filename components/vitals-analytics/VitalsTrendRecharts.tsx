'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  ErrorBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { Activity, Edit3, Trash2 } from 'lucide-react';
import type { VitalsLogEntry, VitalsPeriod, BpThresholds } from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  evaluateVitalReading,
  compareVitalsDesc,
} from '@/lib/config';
import {
  ALL_SLOTS,
  alertColors,
  fmtDateFull,
  periodLabel,
  type DailyChartPoint,
  type DailyMatrixRow,
  type VitalsSummaryStats,
} from './vitalsAnalyticsTypes';
import { computeDailyChartData } from './vitalsStatsEngine';
import { VitalsPeriodDeepDive } from './VitalsPeriodDeepDive';

interface VitalsTrendRechartsProps {
  normalizedVitals: VitalsLogEntry[];
  filteredLog: VitalsLogEntry[];
  dailyMatrix: DailyMatrixRow[];
  summaryStats: VitalsSummaryStats;
  bpThresholds: BpThresholds;
  patientName: string;
  deletingId: string | null;
  onEditEntry: (entry: VitalsLogEntry) => void;
  onDeleteEntry: (entry: VitalsLogEntry) => void;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: DailyChartPoint }>;
  bpThresholds: BpThresholds;
  patientName: string;
}

function DailyVitalsTooltip({ active, payload, bpThresholds, patientName }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  return (
    <div className="bg-surface-card border border-border-card rounded-2xl shadow-lg p-3.5 text-xs sm:text-sm max-w-[300px] space-y-2">
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
        <span className="font-black text-text-main">
          {pt.weekday} · {pt.fullDate}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-text-body font-bold text-xs">
          {pt.readingsCount} lần đo
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-text-muted font-semibold">TB Huyết áp ngày:</span>
          <span className="font-black text-text-main text-sm">
            <span className="text-[#e11d48]">{pt.sys}</span>/
            <span className="text-[#0284c7]">{pt.dia}</span> mmHg
          </span>
        </div>
        {pt.readingsCount > 1 && (
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Biên độ trong ngày:</span>
            <span className="font-bold text-text-body">
              {pt.minSys}-{pt.maxSys} / {pt.minDia}-{pt.maxDia}
            </span>
          </div>
        )}
        {pt.pulse !== null && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted font-semibold">Nhịp tim TB:</span>
            <span className="font-bold text-[#059669]">❤️ {pt.pulse} bpm</span>
          </div>
        )}
        {pt.medsSummary && (
          <div className="flex items-center justify-between text-xs text-emerald-800 pt-0.5">
            <span>Thuốc định kỳ:</span>
            <span className="font-bold">💊 {pt.medsSummary}</span>
          </div>
        )}
      </div>

      <div className="pt-1.5 border-t border-slate-100 space-y-1">
        {pt.readings.map((r) => {
          const ev = evaluateVitalReading(r, bpThresholds, patientName);
          return (
            <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-text-muted font-medium">
                {TIME_SLOT_CONFIG[r.period]?.emoji || '🕒'} {r.time}
              </span>
              <span
                className={`font-extrabold ${
                  ev.overallAlertLevel === 'critical'
                    ? 'text-rose-700'
                    : ev.overallAlertLevel === 'warning'
                      ? 'text-amber-800'
                      : 'text-text-main'
                }`}
              >
                {r.sys}/{r.dia}
                {r.pulse ? ` · ❤️${r.pulse}` : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VitalsTrendRecharts({
  normalizedVitals,
  filteredLog,
  dailyMatrix,
  summaryStats,
  bpThresholds,
  patientName,
  deletingId,
  onEditEntry,
  onDeleteEntry,
}: VitalsTrendRechartsProps) {
  const [chartMode, setChartMode] = useState<'chart' | 'timeline'>('chart');
  const [chartGranularity, setChartGranularity] = useState<'daily_avg' | VitalsPeriod>('daily_avg');

  const chartData = useMemo(
    () => computeDailyChartData(filteredLog, chartGranularity, dailyMatrix),
    [filteredLog, chartGranularity, dailyMatrix]
  );

  const yDomain = useMemo((): [number, number] => {
    if (chartData.length === 0) return [50, 170];
    let minVal = bpThresholds.lowDia;
    let maxVal = bpThresholds.highSys;
    for (const d of chartData) {
      if (d.minDia < minVal) minVal = d.minDia;
      if (d.pulse !== null && d.pulse < minVal) minVal = d.pulse;
      if (d.maxSys > maxVal) maxVal = d.maxSys;
    }
    const low = Math.max(35, Math.floor((minVal - 10) / 10) * 10);
    const high = Math.ceil((maxVal + 12) / 10) * 10;
    return [low, high];
  }, [chartData, bpThresholds]);

  const timelineEntries = useMemo(
    () => [...filteredLog].sort(compareVitalsDesc),
    [filteredLog]
  );

  return (
    <div className="bg-surface-card rounded-2xl border border-border-card p-4 sm:p-5 shadow-2xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-black text-text-main flex items-center gap-2">
            <Activity className="w-5 h-5 text-medical-primary shrink-0" />
            Biểu Đồ Diễn Biến Huyết Áp &amp; Nhịp Tim Theo Ngày
          </h3>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Vùng nền xanh lá là khoảng an toàn ({bpThresholds.lowSys}-{bpThresholds.highSys} mmHg) ·
            Thanh dọc thể hiện biên độ Thấp-Cao trong ngày.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setChartMode('chart')}
            className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-lg text-sm font-extrabold transition cursor-pointer ${
              chartMode === 'chart'
                ? 'bg-surface-card text-medical-dark shadow-2xs'
                : 'text-text-body hover:text-text-main'
            }`}
          >
            📈 Biểu đồ đường
          </button>
          <button
            type="button"
            onClick={() => setChartMode('timeline')}
            className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-lg text-sm font-extrabold transition cursor-pointer ${
              chartMode === 'timeline'
                ? 'bg-surface-card text-medical-dark shadow-2xs'
                : 'text-text-body hover:text-text-main'
            }`}
          >
            🕒 Dòng thời gian ({timelineEntries.length})
          </button>
        </div>
      </div>

      {chartMode === 'chart' ? (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setChartGranularity('daily_avg')}
                className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                  chartGranularity === 'daily_avg'
                    ? 'bg-medical-primary text-white border-medical-dark'
                    : 'bg-slate-50 text-text-body border-border-card hover:bg-slate-100'
                }`}
              >
                TB cả ngày
              </button>
              {ALL_SLOTS.map((slot) => {
                const cfg = TIME_SLOT_CONFIG[slot];
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setChartGranularity(slot)}
                    className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                      chartGranularity === slot
                        ? 'bg-medical-primary text-white border-medical-dark'
                        : 'bg-slate-50 text-text-body border-border-card hover:bg-slate-100'
                    }`}
                  >
                    {cfg.emoji} Chỉ {cfg.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 flex-wrap text-xs font-bold text-text-body">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#e11d48]" /> Tâm thu (SYS)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#0284c7]" /> Tâm trương (DIA)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-[#059669]" /> Nhịp tim
              </span>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-text-muted">
              Chưa có số đo phù hợp trong khung lọc này. Hãy đổi sang &quot;TB cả ngày&quot; hoặc mở rộng khoảng ngày.
            </div>
          ) : (
            <div className="w-full h-[290px] sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#334155', fontSize: 12, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    domain={yDomain}
                    tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={
                      <DailyVitalsTooltip bpThresholds={bpThresholds} patientName={patientName} />
                    }
                  />
                  <ReferenceArea
                    y1={bpThresholds.lowSys}
                    y2={bpThresholds.highSys}
                    fill="#ecfdf5"
                    fillOpacity={0.65}
                  />
                  <ReferenceLine
                    y={bpThresholds.highSys}
                    stroke="#e11d48"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                  />
                  <ReferenceLine
                    y={bpThresholds.highDia}
                    stroke="#0284c7"
                    strokeDasharray="5 5"
                    strokeWidth={1.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="sysRange"
                    fill="#fecdd3"
                    stroke="none"
                    fillOpacity={0.35}
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="diaRange"
                    fill="#bae6fd"
                    stroke="none"
                    fillOpacity={0.35}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="sys"
                    name="Tâm thu (SYS)"
                    stroke="#e11d48"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#e11d48', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  >
                    <ErrorBar dataKey="sysError" width={5} strokeWidth={1.6} stroke="#be123c" />
                  </Line>
                  <Line
                    type="monotone"
                    dataKey="dia"
                    name="Tâm trương (DIA)"
                    stroke="#0284c7"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: '#0284c7', strokeWidth: 1.5, stroke: '#ffffff' }}
                    activeDot={{ r: 5.5 }}
                    connectNulls
                  >
                    <ErrorBar dataKey="diaError" width={5} strokeWidth={1.5} stroke="#0369a1" />
                  </Line>
                  <Line
                    type="monotone"
                    dataKey="pulse"
                    name="Nhịp tim"
                    stroke="#059669"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: '#059669' }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          <VitalsPeriodDeepDive
            normalizedVitals={normalizedVitals}
            summaryStats={summaryStats}
            bpThresholds={bpThresholds}
            patientName={patientName}
          />
        </>
      ) : (
        <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
          {timelineEntries.map((v) => {
            const ev = evaluateVitalReading(v, bpThresholds, patientName);
            const clr = alertColors(ev.overallAlertLevel);
            const isDeleting = deletingId === v.id;
            return (
              <div
                key={v.id}
                className={`rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${clr.bg} ${clr.border}`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-text-main">
                      {fmtDateFull(v.date)} · {v.time}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/90 border border-slate-200 text-xs font-bold text-text-body">
                      {periodLabel(v.period)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-extrabold border ${ev.bp.badgeClass}`}>
                      {ev.badgeText}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className={`text-xl font-black ${clr.text}`}>
                      {v.sys}/{v.dia} <small className="text-xs font-bold text-text-muted">mmHg</small>
                    </span>
                    {v.pulse ? (
                      <span className="text-sm font-bold text-text-body">❤️ {v.pulse} bpm</span>
                    ) : null}
                    <span className="text-xs text-text-muted font-medium">
                      Người ghi: {v.recordedBy || 'Gia đình'}
                    </span>
                  </div>
                  {v.note && (
                    <div className="text-base text-text-main bg-white/80 rounded-lg px-2.5 py-1.5 border border-black/5">
                      📝 {v.note}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onEditEntry(v)}
                    className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-text-body border border-border-card text-sm font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Sửa</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => onDeleteEntry(v)}
                    className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-sm font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeleting ? 'Đang xoá...' : 'Xoá'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default VitalsTrendRecharts;
