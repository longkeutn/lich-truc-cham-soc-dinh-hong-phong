'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { TrendingUp, Plus } from 'lucide-react';
import type { LabChartPoint } from './labRecordsUtils';
import {
  formatLipidTooltip,
  formatLiverKidneyTooltip,
  formatMetabolicTooltip,
} from './labChartFormatters';
import { BioChartEmptyState } from './BioChartEmptyState';

export type BioChartTab = 'lipid' | 'metabolic' | 'liver_kidney' | 'gout_polyp';

export interface BiochemistryTrendChartProps {
  chartData: LabChartPoint[];
  onOpenAddLab?: () => void;
  onOpenImport?: () => void;
}

export function BiochemistryTrendChart({
  chartData,
  onOpenAddLab,
  onOpenImport,
}: BiochemistryTrendChartProps) {
  const [bioChartTab, setBioChartTab] = useState<BioChartTab>('lipid');

  const lipidPoints = useMemo(
    () =>
      chartData.filter(
        (d) =>
          d.cholesterol !== undefined ||
          d.ldlC !== undefined ||
          d.hdlC !== undefined ||
          d.triglyceride !== undefined
      ),
    [chartData]
  );

  const metabolicPoints = useMemo(
    () =>
      chartData.filter(
        (d) =>
          d.glucose !== undefined ||
          d.hba1c !== undefined ||
          d.calcium !== undefined ||
          d.phosphorus !== undefined ||
          d.pth !== undefined ||
          d.albumin !== undefined ||
          d.vitaminD !== undefined
      ),
    [chartData]
  );

  const liverKidneyPoints = useMemo(
    () =>
      chartData.filter(
        (d) =>
          d.ast !== undefined ||
          d.alt !== undefined ||
          d.ggt !== undefined ||
          d.creatinine !== undefined ||
          d.egfr !== undefined ||
          d.hemoglobin !== undefined
      ),
    [chartData]
  );

  const goutPolypPoints = useMemo(
    () =>
      chartData.filter(
        (d) => d.uricAcid !== undefined || d.gallbladderPolypMm !== undefined
      ),
    [chartData]
  );

  const totalBioPointsCount =
    lipidPoints.length +
    metabolicPoints.length +
    liverKidneyPoints.length +
    goutPolypPoints.length;

  // Tự động chuyển sang tab có số liệu nếu tab hiện tại rỗng
  useEffect(() => {
    if (bioChartTab === 'lipid' && lipidPoints.length === 0) {
      if (metabolicPoints.length > 0) {
        setBioChartTab('metabolic');
      } else if (liverKidneyPoints.length > 0) {
        setBioChartTab('liver_kidney');
      } else if (goutPolypPoints.length > 0) {
        setBioChartTab('gout_polyp');
      }
    }
  }, [
    bioChartTab,
    lipidPoints.length,
    metabolicPoints.length,
    liverKidneyPoints.length,
    goutPolypPoints.length,
  ]);

  const activeChartPoints = useMemo(() => {
    if (bioChartTab === 'lipid') return lipidPoints;
    if (bioChartTab === 'metabolic') return metabolicPoints;
    if (bioChartTab === 'gout_polyp') return goutPolypPoints;
    return liverKidneyPoints;
  }, [bioChartTab, lipidPoints, metabolicPoints, liverKidneyPoints, goutPolypPoints]);

  const hasRightAxisData = useMemo(() => {
    if (bioChartTab === 'lipid') return false;
    if (bioChartTab === 'metabolic') {
      return activeChartPoints.some(
        (d) => d.vitaminD !== undefined || d.pth !== undefined || d.albumin !== undefined
      );
    }
    if (bioChartTab === 'gout_polyp') {
      return activeChartPoints.some((d) => d.gallbladderPolypMm !== undefined);
    }
    return activeChartPoints.some(
      (d) => d.creatinine !== undefined || d.egfr !== undefined || d.hemoglobin !== undefined
    );
  }, [bioChartTab, activeChartPoints]);

  const hasLeftAxisData = useMemo(() => {
    if (bioChartTab === 'lipid') return true;
    if (bioChartTab === 'metabolic') {
      return activeChartPoints.some(
        (d) =>
          d.glucose !== undefined ||
          d.hba1c !== undefined ||
          d.calcium !== undefined ||
          d.phosphorus !== undefined
      );
    }
    if (bioChartTab === 'gout_polyp') {
      return activeChartPoints.some((d) => d.uricAcid !== undefined);
    }
    return activeChartPoints.some(
      (d) => d.ast !== undefined || d.alt !== undefined || d.ggt !== undefined
    );
  }, [bioChartTab, activeChartPoints]);

  const creatinineAxisId = hasLeftAxisData ? 'right' : 'left';
  const polypAxisId = hasLeftAxisData ? 'right' : 'left';

  const tooltipStyle = useMemo(
    () => ({ borderRadius: '14px', borderColor: '#cbd5e1', fontSize: '12px', fontWeight: 700 }),
    []
  );

  if (totalBioPointsCount === 0) {
    return (
      <BioChartEmptyState
        totalHistoryCount={chartData.length}
        onOpenAddLab={onOpenAddLab}
        onOpenImport={onOpenImport}
      />
    );
  }

  return (
    <div className="pt-3 border-t border-slate-100 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h4 className="text-base font-black text-text-main flex items-center gap-1.5 uppercase tracking-wide">
          <TrendingUp className="w-4 h-4 text-medical-primary shrink-0" />
          Biểu Đồ Xu Hướng Hóa Sinh Qua Các Đợt Khám
        </h4>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'lipid', label: '❤️ Mỡ máu', count: lipidPoints.length },
            { id: 'metabolic', label: '🦴 Canxi, Cận giáp & Đường', count: metabolicPoints.length },
            { id: 'liver_kidney', label: '🧪 Gan & Thận', count: liverKidneyPoints.length },
            { id: 'gout_polyp', label: '🫧 Gout & Polyp', count: goutPolypPoints.length },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setBioChartTab(t.id as BioChartTab)}
              className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer flex items-center gap-1.5 ${
                bioChartTab === t.id
                  ? 'bg-slate-800 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-50 text-text-body border-border-card hover:bg-slate-100'
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-xs font-black ${
                  bioChartTab === t.id
                    ? 'bg-slate-700 text-teal-200'
                    : t.count > 0
                      ? 'bg-teal-100 text-teal-900'
                      : 'bg-slate-200/70 text-slate-500'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeChartPoints.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-base text-text-muted">
          Nhóm chỉ số này chưa có kết quả xét nghiệm nào. Bấm &quot;Cập nhật chỉ số&quot; hoặc &quot;Nhập phiếu xét nghiệm&quot; để bổ sung.
        </div>
      ) : activeChartPoints.length === 1 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-base font-black text-amber-950 flex items-center gap-1.5">
              <span>📌 Đã có 1 kỳ xét nghiệm vào ngày {activeChartPoints[0].fullDate}</span>
            </span>
            {onOpenAddLab && (
              <button
                type="button"
                onClick={onOpenAddLab}
                className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Nhập thêm 1 kỳ nữa để vẽ đường nối xu hướng</span>
              </button>
            )}
          </div>
          <p className="text-sm text-amber-900 leading-relaxed">
            Biểu đồ đường xu hướng cần tối thiểu 2 kỳ xét nghiệm để vẽ đường nối biến thiên theo thời gian. Bạn có thể nhập thêm một kỳ khám cũ trước đó hoặc kỳ khám mới để biểu đồ tự động hiển thị.
          </p>
        </div>
      ) : (
        <div className="w-full h-[280px] sm:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            {bioChartTab === 'lipid' ? (
              <ComposedChart
                key="chart-lipid"
                data={lipidPoints}
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
                <Tooltip contentStyle={tooltipStyle} formatter={formatLipidTooltip} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cholesterol"
                  name="Cholesterol TP"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0284c7' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="ldlC"
                  name="LDL-C (Mỡ xấu)"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#e11d48' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="triglyceride"
                  name="Triglyceride"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#d97706' }}
                  activeDot={{ r: 6 }}
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
                  dot={{ r: 4, fill: '#059669' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </ComposedChart>
            ) : bioChartTab === 'metabolic' ? (
              <ComposedChart
                key="chart-metabolic"
                data={metabolicPoints}
                margin={{ top: 10, right: hasRightAxisData ? 14 : 8, left: -8, bottom: 4 }}
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
                {hasRightAxisData ? (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#059669', fontSize: 12, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                  />
                ) : null}
                <Tooltip contentStyle={tooltipStyle} formatter={formatMetabolicTooltip} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="glucose"
                  name="Glucose đói (Trục trái)"
                  stroke="#ea580c"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#ea580c' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="hba1c"
                  name="HbA1c % (Trục trái)"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#e11d48' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="calcium"
                  name="Canxi máu (Trục trái)"
                  stroke="#0284c7"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#0284c7' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                {metabolicPoints.some((d) => d.phosphorus !== undefined) ? (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="phosphorus"
                    name="Phospho mmol/L (Trục trái)"
                    stroke="#0d9488"
                    strokeWidth={2.2}
                    dot={{ r: 4, fill: '#0d9488' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ) : null}
                {metabolicPoints.some((d) => d.pth !== undefined) ? (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pth"
                    name="PTH pg/mL (Trục phải)"
                    stroke="#7c3aed"
                    strokeWidth={2.4}
                    dot={{ r: 4, fill: '#7c3aed' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ) : null}
                {metabolicPoints.some((d) => d.albumin !== undefined) ? (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="albumin"
                    name="Albumin g/L (Trục phải)"
                    stroke="#475569"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ r: 3.5, fill: '#475569' }}
                    activeDot={{ r: 5.5 }}
                    connectNulls
                  />
                ) : null}
                {metabolicPoints.some((d) => d.vitaminD !== undefined) ? (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="vitaminD"
                    name="Vitamin D ng/mL (Trục phải)"
                    stroke="#059669"
                    strokeWidth={2.2}
                    strokeDasharray="4 4"
                    dot={{ r: 4, fill: '#059669' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ) : null}
              </ComposedChart>
            ) : bioChartTab === 'gout_polyp' ? (
              <ComposedChart
                key="chart-gout_polyp"
                data={goutPolypPoints}
                margin={{ top: 10, right: hasRightAxisData ? 14 : 8, left: -8, bottom: 4 }}
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
                {hasRightAxisData && hasLeftAxisData ? (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#0f766e', fontSize: 12, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                  />
                ) : null}
                <Tooltip contentStyle={tooltipStyle} formatter={formatLiverKidneyTooltip} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                {goutPolypPoints.some((d) => d.uricAcid !== undefined) ? (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="uricAcid"
                    name="Acid Uric µmol/L (Đích Gout <360)"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#d97706' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ) : null}
                {goutPolypPoints.some((d) => d.gallbladderPolypMm !== undefined) ? (
                  <Line
                    yAxisId={polypAxisId}
                    type="monotone"
                    dataKey="gallbladderPolypMm"
                    name="Polyp túi mật mm (Cảnh báo >=10)"
                    stroke="#0f766e"
                    strokeWidth={2.5}
                    dot={{ r: 4.5, fill: '#0f766e' }}
                    activeDot={{ r: 6.5 }}
                    connectNulls
                  />
                ) : null}
              </ComposedChart>
            ) : (
              <ComposedChart
                key="chart-liver_kidney"
                data={liverKidneyPoints}
                margin={{ top: 10, right: hasRightAxisData ? 14 : 8, left: -8, bottom: 4 }}
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
                {hasRightAxisData ? (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#0284c7', fontSize: 12, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                  />
                ) : null}
                <Tooltip contentStyle={tooltipStyle} formatter={formatLiverKidneyTooltip} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="ast"
                  name="AST / GOT U/L (Trục trái)"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#d97706' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="alt"
                  name="ALT / GPT U/L (Trục trái)"
                  stroke="#e11d48"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#e11d48' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                {liverKidneyPoints.some((d) => d.ggt !== undefined) ? (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="ggt"
                    name="GGT U/L (Trục trái)"
                    stroke="#7c3aed"
                    strokeWidth={2.4}
                    dot={{ r: 4, fill: '#7c3aed' }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ) : null}
                <Line
                  yAxisId={creatinineAxisId}
                  type="monotone"
                  dataKey="creatinine"
                  name={`Creatinine µmol/L (${creatinineAxisId === 'right' ? 'Trục phải' : 'Trục trái'})`}
                  stroke="#0284c7"
                  strokeWidth={2.3}
                  dot={{ r: 4, fill: '#0284c7' }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                {liverKidneyPoints.some((d) => d.egfr !== undefined) ? (
                  <Line
                    yAxisId={creatinineAxisId}
                    type="monotone"
                    dataKey="egfr"
                    name="eGFR mL/phút"
                    stroke="#0d9488"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ r: 3.5, fill: '#0d9488' }}
                    activeDot={{ r: 5.5 }}
                    connectNulls
                  />
                ) : null}
                {liverKidneyPoints.some((d) => d.hemoglobin !== undefined) ? (
                  <Line
                    yAxisId={creatinineAxisId}
                    type="monotone"
                    dataKey="hemoglobin"
                    name="Hemoglobin"
                    stroke="#059669"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3.5, fill: '#059669' }}
                    activeDot={{ r: 5.5 }}
                    connectNulls
                  />
                ) : null}
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
