'use client';

import React from 'react';
import { Activity, AlertTriangle, HeartPulse, ShieldCheck } from 'lucide-react';
import type { BpThresholds } from '@/lib/types';
import type {
  ClinicalFindingItem,
  DistributionStatsResult,
  TimeframeMetrics,
} from './clinicalReportStats';

interface ClinicalDistributionPanelsProps {
  activeMilestone: TimeframeMetrics;
  milestones: TimeframeMetrics[];
  onSelectMilestone: (id: string) => void;
  clinicalFindings: ClinicalFindingItem[];
  distributionStats: DistributionStatsResult;
  bpThresholds: BpThresholds;
}

export default function ClinicalDistributionPanels({
  activeMilestone,
  milestones,
  onSelectMilestone,
  clinicalFindings,
  distributionStats,
  bpThresholds,
}: ClinicalDistributionPanelsProps) {
  return (
    <div className="space-y-4">
      {/* Thanh chọn nhanh mốc thời gian đối chiếu */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {milestones.map((m) => {
          const isSelected = m.id === activeMilestone.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMilestone(m.id)}
              disabled={m.count === 0}
              className={`min-h-[48px] px-3 py-1.5 rounded-xl text-xs font-extrabold border transition shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                isSelected
                  ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                  : 'bg-slate-50 hover:bg-teal-50 text-slate-700 border-slate-200'
              }`}
            >
              <span>{m.label}</span>
              <span className={`ml-1.5 text-[11px] ${isSelected ? 'text-teal-100' : 'text-slate-600'}`}>
                ({m.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* PHẦN 1: NHẬN ĐỊNH & ĐÁNH GIÁ CỤ THỂ DỄ HIỂU */}
      {clinicalFindings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {clinicalFindings.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                item.level === 'alert'
                  ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                  : item.level === 'caution'
                  ? 'bg-amber-50/80 border-amber-200 text-slate-900'
                  : 'bg-emerald-50/60 border-emerald-200 text-slate-900'
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
              <p className="text-xs text-slate-700 leading-relaxed pl-5">{item.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* PHẦN 2: THỐNG KÊ TRỰC QUAN CÁC LẦN ĐO HUYẾT ÁP & NHỊP TIM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
        {/* Khối A: Phân bổ Huyết áp & Độ ổn định */}
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-rose-600" />
              <span>Phân Bổ Các Lần Đo Huyết Áp ({activeMilestone.label})</span>
            </span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {activeMilestone.tirPct ?? 0}% đạt chuẩn
            </span>
          </div>

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

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Tốt (&lt;130/80)
                  </span>
                  <span className="font-black text-emerald-800">{distributionStats.bpZones.optimal} lần</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    Đạt chuẩn (130-139)
                  </span>
                  <span className="font-black text-teal-800">{distributionStats.bpZones.normal_high} lần</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Hơi cao (140-159)
                  </span>
                  <span className="font-black text-amber-800">{distributionStats.bpZones.stage1} lần</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    Cao vượt (&ge;160/100)
                  </span>
                  <span className="font-black text-rose-700">{distributionStats.bpZones.stage2} lần</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    Hơi thấp (&le;{bpThresholds.lowSys}/{bpThresholds.lowDia})
                  </span>
                  <span className="font-black text-sky-800">{distributionStats.bpZones.low} lần</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
              <span className="text-[11px] font-bold text-slate-600 block">Độ ổn định HA</span>
              <span
                className={`text-sm font-black ${
                  (activeMilestone.sdSys || 0) >= 15
                    ? 'text-rose-600'
                    : (activeMilestone.sdSys || 0) >= 10
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {activeMilestone.sdSys !== null ? `±${activeMilestone.sdSys}` : '-'}{' '}
                <small className="font-normal">mmHg</small>
              </span>
              <span className="text-[11px] text-slate-600 block">Đều: &lt;10 mmHg</span>
            </div>

            <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
              <span className="text-[11px] font-bold text-slate-600 block">Hiệu áp (Trên-Dưới)</span>
              <span className="text-sm font-black text-slate-900">
                {activeMilestone.avgPP ?? '-'} <small className="font-normal">mmHg</small>
              </span>
              <span className="text-[11px] text-slate-600 block">Đẹp: 40-55</span>
            </div>

            <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
              <span className="text-[11px] font-bold text-slate-600 block">Sức máu nuôi não</span>
              <span className="text-sm font-black text-slate-900">
                {activeMilestone.avgMAP ?? '-'} <small className="font-normal">mmHg</small>
              </span>
              <span className="text-[11px] text-emerald-700 block font-semibold">Chuẩn: 75-95</span>
            </div>
          </div>
        </div>

        {/* Khối B: Phân bổ Nhịp Tim (Mạch) */}
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-violet-600" />
              <span>Phân Bổ Các Lần Đo Nhịp Tim ({activeMilestone.label})</span>
            </span>
            <span className="text-xs font-bold text-slate-600">
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
                        style={{ width: `${(z.count / distributionStats.totalPulseCount) * 100}%` }}
                        className={`${z.color} h-full transition-all`}
                      />
                    )
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Nhịp tốt (60-79)
                  </span>
                  <span className="font-black text-emerald-800">{distributionStats.hrZones.optimal} lần</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    Bình thường (80-99)
                  </span>
                  <span className="font-black text-slate-900">{distributionStats.hrZones.normal_high} lần</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Hơi chậm (50-59)
                  </span>
                  <span className="font-black text-amber-800">{distributionStats.hrZones.slow} lần</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Rất chậm (&lt;50)
                  </span>
                  <span className="font-black text-rose-700">{distributionStats.hrZones.very_slow} lần</span>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    Nhanh (&ge;100)
                  </span>
                  <span className="font-black text-rose-700">{distributionStats.hrZones.fast} lần</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-600 block">Mạch Trung bình</span>
                  <span className="text-sm font-black text-slate-900">
                    {activeMilestone.avgPulse} <small className="font-normal">bpm</small>
                  </span>
                  <span className="text-[11px] text-slate-600 block">
                    {activeMilestone.minPulse}-{activeMilestone.maxPulse} bpm
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-600 block">Độ đều của Mạch</span>
                  <span className="text-sm font-black text-slate-900">
                    {activeMilestone.sdPulse !== null ? `±${activeMilestone.sdPulse}` : '-'}{' '}
                    <small className="font-normal">bpm</small>
                  </span>
                  <span className="text-[11px] text-slate-600 block">Chênh lệch</span>
                </div>

                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-600 block">Sức đập của tim</span>
                  <span
                    className={`text-sm font-black ${
                      (activeMilestone.avgRPP || 0) > 12000
                        ? 'text-rose-600'
                        : (activeMilestone.avgRPP || 0) > 10000
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {(activeMilestone.avgRPP || 0) > 12000
                      ? 'Hơi gắng sức'
                      : (activeMilestone.avgRPP || 0) > 10000
                      ? 'Trung bình'
                      : 'Nhẹ nhàng'}
                  </span>
                  <span className="text-[11px] text-slate-600 block">Khi nghỉ ngơi</span>
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-xs text-slate-600 italic">
              Chưa có dữ liệu nhịp tim trong mốc thời gian này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
