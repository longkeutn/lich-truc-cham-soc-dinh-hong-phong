'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Activity, Edit3, Pill, Building2 } from 'lucide-react';
import type { LabResultEntry, HealthProfileType } from '@/lib/types';
import type { LabIndicatorEval } from '@/lib/config';
import {
  fmtDateShort,
  getLabDeltaText,
  type LabChartPoint,
} from './labRecordsUtils';

interface ThyroidTrackerSectionProps {
  latestLab: LabResultEntry | null;
  previousLab: LabResultEntry | null;
  indicators: LabIndicatorEval[];
  chartData: LabChartPoint[];
  profileType: HealthProfileType;
  patientName: string;
  recentVitalsSummary: {
    avgSys: number;
    avgDia: number;
    avgPulse: number | null;
    count: number;
  } | null;
  onEditLab: (entry: LabResultEntry) => void;
}

export function ThyroidTrackerSection({
  latestLab,
  previousLab,
  indicators,
  chartData,
  profileType,
  patientName,
  recentVitalsSummary,
  onEditLab,
}: ThyroidTrackerSectionProps) {
  const thyroidIndicators = useMemo(
    () => indicators.filter((i) => i.group === 'thyroid' || i.group === 'markers'),
    [indicators]
  );

  const thyroidChartPoints = useMemo(
    () =>
      chartData.filter(
        (d) =>
          d.tsh !== undefined ||
          d.ft4 !== undefined ||
          d.t3 !== undefined ||
          d.tg !== undefined
      ),
    [chartData]
  );

  const tshUpperRef = useMemo(() => {
    const target =
      latestLab?.tshTargetLevel ||
      (profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal');
    if (target === 'high_risk') return 0.1;
    if (target === 'moderate_risk') return 0.5;
    return 4.0;
  }, [latestLab?.tshTargetLevel, profileType]);

  if (
    thyroidIndicators.length === 0 &&
    thyroidChartPoints.length === 0 &&
    !latestLab?.levothyroxineDose &&
    profileType !== 'thyroid_post_op'
  ) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-surface-card border border-indigo-200/80 shadow-2xs p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg bg-thyroid-bg text-indigo-900 border border-indigo-200 text-xs font-extrabold">
              🦋 Hồ sơ Tuyến Giáp &amp; Dấu Ấn K Giáp
            </span>
            {latestLab && (
              <span className="text-xs font-bold text-text-muted">
                Cập nhật: {fmtDateShort(latestLab.date)}
              </span>
            )}
            {latestLab?.facility && (
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-text-body text-xs font-bold inline-flex items-center gap-1">
                <Building2 className="w-3 h-3 text-text-muted" />
                {latestLab.facility}
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-black text-text-main">
            Theo Dõi TSH, FT4, TG &amp; Liều Levothyroxine · {patientName}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {latestLab?.levothyroxineDose && (
            <span className="min-h-[48px] px-3.5 py-2 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 text-base font-black inline-flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-amber-800 shrink-0" />
              Liều giáp: {latestLab.levothyroxineDose}
            </span>
          )}
          {latestLab && (
            <button
              type="button"
              onClick={() => onEditLab(latestLab)}
              className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-main border border-border-card text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Sửa lần khám này</span>
            </button>
          )}
        </div>
      </div>

      {/* Đối chiếu lâm sàng Nhịp tim & Huyết áp với Hormone Giáp */}
      {recentVitalsSummary && (
        <div className="rounded-xl bg-thyroid-bg/60 border border-indigo-200 p-3.5 text-base text-text-body flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-thyroid-accent shrink-0" />
            <span>
              <strong>Đối chiếu sinh hiệu gần đây ({recentVitalsSummary.count} lần đo):</strong> HA
              TB <strong className="text-text-main">{recentVitalsSummary.avgSys}/{recentVitalsSummary.avgDia} mmHg</strong>
              {recentVitalsSummary.avgPulse
                ? ` · Nhịp tim TB ${recentVitalsSummary.avgPulse} bpm`
                : ''}
            </span>
          </div>
          {recentVitalsSummary.avgPulse && recentVitalsSummary.avgPulse >= 95 && (
            <span className="text-sm font-extrabold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
              ⚠️ Mạch hơi nhanh - Lưu ý đối chiếu FT4/TSH với liều thuốc giáp
            </span>
          )}
        </div>
      )}

      {/* Thẻ chỉ số Tuyến giáp & Markers */}
      {thyroidIndicators.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {thyroidIndicators.map((ind) => {
            const deltaText = getLabDeltaText(previousLab, ind.key, ind.value);
            return (
              <div
                key={ind.key}
                className="rounded-2xl border border-border-card bg-slate-50/70 p-3.5 space-y-1.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-black text-text-main">
                      {ind.shortLabel}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-extrabold border ${ind.badgeClass}`}
                    >
                      {ind.badgeText}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-text-main mt-1">
                    {ind.value}{' '}
                    <span className="text-sm font-bold text-text-muted">{ind.unit}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-text-muted font-medium mt-0.5">
                    Ngưỡng tham chiếu: {ind.refText}
                  </div>
                  {deltaText && (
                    <div className="text-xs sm:text-sm font-bold text-indigo-800 mt-1">{deltaText}</div>
                  )}
                </div>
                <div className="text-sm sm:text-base text-text-body pt-2 border-t border-slate-200/70 leading-relaxed">
                  {ind.clinicalNote}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-indigo-200 bg-slate-50 p-4 text-base text-text-muted text-center">
          Lần khám gần nhất chưa nhập số liệu định lượng TSH/FT4/TG (chỉ ghi nhận liều thuốc hoặc triệu chứng).
        </div>
      )}

      {/* Biểu đồ xu hướng Tuyến Giáp */}
      {thyroidChartPoints.length >= 2 && (
        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-xs sm:text-sm font-black text-text-main uppercase tracking-wide">
              📈 Động học TSH (Tím #7c3aed), FT4, T3 &amp; Marker TG qua các kỳ khám
            </h4>
            <span className="text-xs font-bold text-indigo-800">
              Đường đứt nét tím: Đích ức chế TSH ({tshUpperRef} µIU/mL)
            </span>
          </div>

          <div className="w-full h-[270px] sm:h-[310px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={thyroidChartPoints}
                margin={{ top: 10, right: 12, left: -10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#334155', fontSize: 12, fontWeight: 700 }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#7c3aed', fontSize: 12, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#0284c7', fontSize: 12, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '14px',
                    borderColor: '#cbd5e1',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                <ReferenceLine
                  yAxisId="left"
                  y={tshUpperRef}
                  stroke="#7c3aed"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="tsh"
                  name="TSH (µIU/mL)"
                  stroke="#7c3aed"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#7c3aed' }}
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="tg"
                  name="TG (ng/mL)"
                  stroke="#e11d48"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3.5, fill: '#e11d48' }}
                  connectNulls
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ft4"
                  name="FT4"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: '#0284c7' }}
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="t3"
                  name="T3"
                  stroke="#d97706"
                  strokeWidth={1.8}
                  dot={{ r: 3, fill: '#d97706' }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default ThyroidTrackerSection;
