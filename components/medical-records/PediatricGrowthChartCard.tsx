'use client';

import React from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Ruler, Scale } from 'lucide-react';
import type { LabResultEntry } from '@/lib/types';
import {
  evaluatePediatricGrowth,
  formatAgeMonthsLabel,
} from '@/lib/pediatricGrowthStandards';
import { fmtDateShort } from './labRecordsUtils';

export interface GrowthChartPoint {
  ageMonths: number;
  minus2SD?: number;
  median?: number;
  plus2SD?: number;
  childWeight?: number;
  childHeight?: number;
  dateLabel?: string;
}

interface PediatricGrowthChartCardProps {
  latestGrowth: LabResultEntry | null;
  latestEval: ReturnType<typeof evaluatePediatricGrowth> | null;
  chartData: GrowthChartPoint[];
  metricTab: 'weight' | 'height';
  onChangeMetricTab: (tab: 'weight' | 'height') => void;
  maxChartMonth: 60 | 180;
  onChangeMaxChartMonth: (m: 60 | 180) => void;
  patientDisplayName: string;
}

export function PediatricGrowthChartCard({
  latestGrowth,
  latestEval,
  chartData,
  metricTab,
  onChangeMetricTab,
  maxChartMonth,
  onChangeMaxChartMonth,
  patientDisplayName,
}: PediatricGrowthChartCardProps) {
  return (
    <>
      {latestGrowth?.pediatricGrowth && latestEval && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-1">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" />
              <span>
                Cân nặng gần nhất ({formatAgeMonthsLabel(latestGrowth.pediatricGrowth.ageMonths)})
              </span>
            </span>
            <div className="text-2xl font-black text-slate-900">
              {latestGrowth.pediatricGrowth.weightKg ?? '-'}{' '}
              <span className="text-sm font-bold text-slate-600">kg</span>
            </div>
            <span
              className={`inline-block text-xs font-extrabold px-2 py-0.5 rounded-md border ${latestEval.weightBadgeClass}`}
            >
              {latestEval.weightLabel}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-cyan-50/70 border border-cyan-200 space-y-1">
            <span className="text-xs font-bold text-cyan-900 flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5" />
              <span>Chiều cao gần nhất ({fmtDateShort(latestGrowth.date)})</span>
            </span>
            <div className="text-2xl font-black text-slate-900">
              {latestGrowth.pediatricGrowth.heightCm ?? '-'}{' '}
              <span className="text-sm font-bold text-slate-600">cm</span>
            </div>
            <span
              className={`inline-block text-xs font-extrabold px-2 py-0.5 rounded-md border ${latestEval.heightBadgeClass}`}
            >
              {latestEval.heightLabel}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col justify-center">
            <span className="text-xs font-extrabold text-amber-900 mb-1">
              💡 Nhận định dinh dưỡng WHO:
            </span>
            <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
              {latestEval.advice}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => onChangeMetricTab('weight')}
              className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold border transition cursor-pointer ${
                metricTab === 'weight'
                  ? 'bg-teal-700 text-white border-teal-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ⚖️ Cân nặng theo tuổi (kg)
            </button>
            <button
              type="button"
              onClick={() => onChangeMetricTab('height')}
              className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold border transition cursor-pointer ${
                metricTab === 'height'
                  ? 'bg-teal-700 text-white border-teal-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              📏 Chiều cao theo tuổi (cm)
            </button>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => onChangeMaxChartMonth(60)}
              className={`min-h-[44px] px-3 rounded-lg text-xs font-extrabold cursor-pointer ${
                maxChartMonth === 60 ? 'bg-slate-800 text-white' : 'text-slate-700'
              }`}
            >
              0 - 5 tuổi
            </button>
            <button
              type="button"
              onClick={() => onChangeMaxChartMonth(180)}
              className={`min-h-[44px] px-3 rounded-lg text-xs font-extrabold cursor-pointer ${
                maxChartMonth === 180 ? 'bg-slate-800 text-white' : 'text-slate-700'
              }`}
            >
              0 - 15 tuổi
            </button>
          </div>
        </div>

        <div className="h-[270px] w-full bg-white rounded-xl border border-slate-200 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 14, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="ageMonths"
                type="number"
                domain={[0, maxChartMonth]}
                tick={{ fontSize: 12, fill: '#334155', fontWeight: 700 }}
                unit="m"
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#334155', fontWeight: 700 }}
                unit={metricTab === 'weight' ? 'kg' : 'cm'}
              />
              <Tooltip
                formatter={(value, name) => [
                  `${value} ${metricTab === 'weight' ? 'kg' : 'cm'}`,
                  String(name),
                ]}
                labelFormatter={(m) => `Tháng tuổi: ${m} tháng`}
              />
              <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
              <Line
                type="monotone"
                dataKey="plus2SD"
                name="Ngưỡng +2SD (WHO)"
                stroke="#0284c7"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="median"
                name="Chuẩn trung vị WHO"
                stroke="#10b981"
                strokeDasharray="5 3"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="minus2SD"
                name="Ngưỡng -2SD (WHO)"
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey={metricTab === 'weight' ? 'childWeight' : 'childHeight'}
                name={`Chỉ số thực tế (${patientDisplayName})`}
                stroke="#0f766e"
                strokeWidth={3}
                dot={{ r: 5, fill: '#0f766e', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 7 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
