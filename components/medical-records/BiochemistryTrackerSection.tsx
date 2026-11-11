'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { AlertTriangle, Edit3, TrendingUp } from 'lucide-react';
import type { LabResultEntry } from '@/lib/types';
import type { LabIndicatorEval } from '@/lib/config';
import {
  fmtDateShort,
  getLabDeltaText,
  type LabChartPoint,
} from './labRecordsUtils';

interface BiochemistryTrackerSectionProps {
  latestLab: LabResultEntry | null;
  previousLab: LabResultEntry | null;
  indicators: LabIndicatorEval[];
  summaryPoints: string[];
  chartData: LabChartPoint[];
  onEditLab: (entry: LabResultEntry) => void;
}

type BioFilter = 'all_bio' | 'lipid' | 'metabolic' | 'liver_kidney';
type BioChartTab = 'lipid' | 'metabolic' | 'liver_kidney';

export function BiochemistryTrackerSection({
  latestLab,
  previousLab,
  indicators,
  summaryPoints,
  chartData,
  onEditLab,
}: BiochemistryTrackerSectionProps) {
  const [bioFilter, setBioFilter] = useState<BioFilter>('all_bio');
  const [bioChartTab, setBioChartTab] = useState<BioChartTab>('lipid');

  const bioIndicators = useMemo(
    () =>
      indicators.filter(
        (i) => i.group === 'lipid' || i.group === 'metabolic' || i.group === 'liver_kidney'
      ),
    [indicators]
  );

  const filteredIndicators = useMemo(() => {
    if (bioFilter === 'all_bio') return bioIndicators;
    return bioIndicators.filter((i) => i.group === bioFilter);
  }, [bioIndicators, bioFilter]);

  const customLabs = latestLab?.customLabs || [];

  const activeChartPoints = useMemo(() => {
    if (bioChartTab === 'lipid') {
      return chartData.filter(
        (d) =>
          d.cholesterol !== undefined ||
          d.ldlC !== undefined ||
          d.hdlC !== undefined ||
          d.triglyceride !== undefined
      );
    }
    if (bioChartTab === 'metabolic') {
      return chartData.filter(
        (d) =>
          d.glucose !== undefined ||
          d.hba1c !== undefined ||
          d.calcium !== undefined ||
          d.vitaminD !== undefined
      );
    }
    return chartData.filter(
      (d) =>
        d.ast !== undefined ||
        d.alt !== undefined ||
        d.creatinine !== undefined ||
        d.hemoglobin !== undefined
    );
  }, [chartData, bioChartTab]);

  return (
    <div className="rounded-2xl bg-surface-card border border-border-card shadow-2xs p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg bg-medical-surface text-medical-dark border border-medical-border text-xs sm:text-sm font-extrabold">
              🧪 Hóa Sinh, Mỡ Máu, Canxi &amp; Gan Thận
            </span>
            {latestLab && (
              <span className="text-xs sm:text-sm font-bold text-text-muted">
                Lần khám: {fmtDateShort(latestLab.date)}
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-black text-text-main mt-1">
            Bảng Đánh Giá Chỉ Số Hóa Sinh &amp; Chuyển Hóa
          </h3>
        </div>

        {latestLab && (
          <button
            type="button"
            onClick={() => onEditLab(latestLab)}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-main border border-border-card text-sm font-extrabold inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Cập nhật chỉ số</span>
          </button>
        )}
      </div>

      {/* Điểm lưu ý lâm sàng tự động */}
      {summaryPoints.length > 0 && (
        <div className="rounded-2xl bg-vital-warning-bg border border-amber-300 p-3.5 space-y-1.5">
          <div className="text-base font-black text-amber-950 flex items-center gap-1.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            Tổng hợp điểm cần lưu ý từ kết quả gần nhất:
          </div>
          <ul className="list-disc list-inside text-base text-amber-950 space-y-1 leading-relaxed">
            {summaryPoints.map((pt, idx) => (
              <li key={idx}>{pt}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Bộ lọc nhóm Hóa sinh */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { id: 'all_bio', label: 'Tất cả Hóa sinh' },
          { id: 'lipid', label: '❤️ Bộ Mỡ máu' },
          { id: 'metabolic', label: '🦴 Đường huyết & Canxi/VitD' },
          { id: 'liver_kidney', label: '🧪 Gan, Thận & Huyết học' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setBioFilter(tab.id as BioFilter)}
            className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
              bioFilter === tab.id
                ? 'bg-medical-primary text-white border-medical-dark shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 text-text-body border-border-card'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Danh sách thẻ chỉ số Hóa sinh */}
      {filteredIndicators.length === 0 && customLabs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-base text-text-muted font-medium">
          Chưa có chỉ số hóa sinh / mỡ máu ở lần khám gần nhất. Bấm &quot;Cập nhật chỉ số&quot; hoặc &quot;Nhập Kết Quả Xét Nghiệm&quot; để bổ sung.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredIndicators.map((ind) => {
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
                    Chuẩn: {ind.refText}
                  </div>
                  {deltaText && (
                    <div className="text-xs sm:text-sm font-bold text-medical-dark mt-1">
                      {deltaText}
                    </div>
                  )}
                </div>
                <div className="text-sm sm:text-base text-text-body pt-2 border-t border-slate-200/70 leading-relaxed">
                  {ind.clinicalNote}
                </div>
              </div>
            );
          })}

          {customLabs.map((cl) => (
            <div
              key={cl.id}
              className="rounded-2xl border border-border-card bg-surface-card p-3.5 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-black text-text-main">{cl.name}</span>
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-text-body">
                  Chỉ số mở rộng
                </span>
              </div>
              <div className="text-2xl font-black text-text-main">
                {cl.value}{' '}
                {cl.unit && <span className="text-sm font-bold text-text-muted">{cl.unit}</span>}
              </div>
              {cl.refRange && (
                <div className="text-xs sm:text-sm text-text-muted">Tham chiếu: {cl.refRange}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Biểu đồ xu hướng Hóa sinh theo nhóm (hỗ trợ trục tung kép yAxisId='left' & 'right') */}
      {chartData.length >= 2 && (
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-base font-black text-text-main flex items-center gap-1.5 uppercase tracking-wide">
              <TrendingUp className="w-4 h-4 text-medical-primary shrink-0" />
              Biểu Đồ Xu Hướng Hóa Sinh Qua Các Đợt Khám
            </h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'lipid', label: '❤️ Mỡ máu' },
                { id: 'metabolic', label: '🦴 Đường & Canxi/VitD' },
                { id: 'liver_kidney', label: '🧪 Gan & Thận' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setBioChartTab(t.id as BioChartTab)}
                  className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                    bioChartTab === t.id
                      ? 'bg-slate-800 text-white border-slate-900'
                      : 'bg-slate-50 text-text-body border-border-card hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {activeChartPoints.length < 2 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-base text-text-muted">
              Cần ít nhất 2 kỳ xét nghiệm có nhóm chỉ số này để vẽ đường xu hướng so sánh.
            </div>
          ) : (
            <div className="w-full h-[270px] sm:h-[310px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  key={bioChartTab}
                  data={activeChartPoints}
                  margin={{ top: 10, right: 12, left: -8, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#334155', fontSize: 12, fontWeight: 700 }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fill: '#334155', fontSize: 12, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  {bioChartTab !== 'lipid' && (
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{
                        fill: bioChartTab === 'metabolic' ? '#059669' : '#0284c7',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                      tickLine={false}
                      axisLine={false}
                    />
                  )}
                  <Tooltip
                    contentStyle={{
                      borderRadius: '14px',
                      borderColor: '#cbd5e1',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />

                  {bioChartTab === 'lipid' && (
                    <>
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="cholesterol"
                        name="Cholesterol TP"
                        stroke="#0284c7"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="ldlC"
                        name="LDL-C (Mỡ xấu)"
                        stroke="#e11d48"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="triglyceride"
                        name="Triglyceride"
                        stroke="#d97706"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="hdlC"
                        name="HDL-C (Mỡ tốt)"
                        stroke="#059669"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    </>
                  )}

                  {bioChartTab === 'metabolic' && (
                    <>
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="glucose"
                        name="Glucose đói (Trục trái)"
                        stroke="#ea580c"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="hba1c"
                        name="HbA1c % (Trục trái)"
                        stroke="#e11d48"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="calcium"
                        name="Canxi máu (Trục trái)"
                        stroke="#0284c7"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="vitaminD"
                        name="Vitamin D ng/mL (Trục phải)"
                        stroke="#059669"
                        strokeWidth={2.2}
                        strokeDasharray="4 4"
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    </>
                  )}

                  {bioChartTab === 'liver_kidney' && (
                    <>
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="ast"
                        name="AST / GOT U/L (Trục trái)"
                        stroke="#d97706"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="alt"
                        name="ALT / GPT U/L (Trục trái)"
                        stroke="#e11d48"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="creatinine"
                        name="Creatinine µmol/L (Trục phải)"
                        stroke="#0284c7"
                        strokeWidth={2.3}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="hemoglobin"
                        name="Hemoglobin (Trục phải)"
                        stroke="#059669"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 3.5 }}
                        connectNulls
                      />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BiochemistryTrackerSection;
