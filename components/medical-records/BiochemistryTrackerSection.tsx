'use client';

import React, { useState, useMemo } from 'react';
import { AlertTriangle, Calendar, Edit3, Stethoscope } from 'lucide-react';
import type { HealthProfileType, LabResultEntry } from '@/lib/types';
import type { LabIndicatorEval } from '@/lib/config';
import { getLabMedicalGuide } from '@/lib/labMedicalGuides';
import { MedicalInfoToggle } from '@/components/ui-kit';
import {
  fmtDateShort,
  getLabDeltaText,
  type LabChartPoint,
} from './labRecordsUtils';
import { BiochemistryTrendChart } from './BiochemistryTrendChart';
import { ParathyroidClinicalGuideCard } from './ParathyroidClinicalGuideCard';

export interface BiochemistryTrackerSectionProps {
  latestLab: LabResultEntry | null;
  previousLab: LabResultEntry | null;
  sourceDateByKey?: Record<string, string>;
  previousEntryByKey?: Record<string, LabResultEntry | null>;
  profileType?: HealthProfileType;
  indicators: LabIndicatorEval[];
  summaryPoints: string[];
  chartData: LabChartPoint[];
  onEditLab: (entry: LabResultEntry) => void;
  onOpenAddLab?: () => void;
  onOpenImport?: () => void;
}

type BioFilter = 'all_bio' | 'lipid' | 'metabolic' | 'liver_kidney' | 'ultrasound';

export function BiochemistryTrackerSection({
  latestLab,
  previousLab,
  sourceDateByKey,
  previousEntryByKey,
  profileType = 'general_health',
  indicators,
  summaryPoints,
  chartData,
  onEditLab,
  onOpenAddLab,
  onOpenImport,
}: BiochemistryTrackerSectionProps) {
  const [bioFilter, setBioFilter] = useState<BioFilter>('all_bio');

  const bioIndicators = useMemo(
    () =>
      indicators.filter(
        (i) =>
          i.group === 'lipid' ||
          i.group === 'metabolic' ||
          i.group === 'liver_kidney' ||
          i.group === 'ultrasound'
      ),
    [indicators]
  );

  const filteredIndicators = useMemo(() => {
    if (bioFilter === 'all_bio') return bioIndicators;
    return bioIndicators.filter((i) => i.group === bioFilter);
  }, [bioIndicators, bioFilter]);

  const customLabs = latestLab?.customLabs || [];
  const hasUltrasoundDetails = Boolean(
    latestLab &&
      (latestLab.gallbladderPolypCount ||
        latestLab.liverUltrasound ||
        latestLab.kidneyUltrasound ||
        latestLab.nextUltrasoundDate)
  );
  const polypGuide = getLabMedicalGuide('gallbladderPolypMm');
  const liverUsGuide = getLabMedicalGuide('liverUltrasound');
  const kidneyUsGuide = getLabMedicalGuide('kidneyUltrasound');

  return (
    <div className="rounded-2xl bg-surface-card border border-border-card shadow-2xs p-4 sm:p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg bg-medical-surface text-medical-dark border border-medical-border text-xs sm:text-sm font-extrabold">
              🧪 Hóa Sinh, Mỡ Máu, Gan Thận, Gout &amp; Siêu Âm
            </span>
            {latestLab && (
              <span className="text-xs sm:text-sm font-bold text-text-muted">
                Lần khám: {fmtDateShort(latestLab.date)}
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-black text-text-main mt-1">
            Bảng Đánh Giá Chỉ Số Hóa Sinh &amp; Chẩn Đoán Hình Ảnh
          </h3>
          <p className="text-xs sm:text-sm text-text-muted font-medium">
            Bấm nút <strong>Giải thích</strong> / <strong>Xem tác hại</strong> trên từng thẻ để xem ý nghĩa y khoa và cảnh báo sức khỏe.
          </p>
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
          { id: 'all_bio', label: 'Tất cả' },
          { id: 'lipid', label: '❤️ Bộ Mỡ máu' },
          { id: 'metabolic', label: '🦴 Đường, Canxi & Cận giáp' },
          { id: 'liver_kidney', label: '🧪 Gan, Thận & Gout' },
          { id: 'ultrasound', label: '🩺 Siêu âm & Polyp' },
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
      {filteredIndicators.length === 0 &&
      customLabs.length === 0 &&
      !(hasUltrasoundDetails && (bioFilter === 'all_bio' || bioFilter === 'ultrasound')) ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-base text-text-muted font-medium">
          Chưa có chỉ số ở nhóm này trong lần khám gần nhất. Bấm &quot;Cập nhật chỉ số&quot; hoặc &quot;Nhập Kết Quả Xét Nghiệm&quot; để bổ sung.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredIndicators.map((ind) => {
            const prevForInd =
              previousEntryByKey && ind.key in previousEntryByKey
                ? previousEntryByKey[ind.key]
                : previousLab;
            const deltaText = getLabDeltaText(prevForInd, ind.key, ind.value, ind.unit);
            const indDate = sourceDateByKey?.[ind.key];
            const guide = getLabMedicalGuide(ind.key);
            const isWarnStatus =
              ind.status === 'high' || ind.status === 'low' || ind.status === 'critical';
            return (
              <div
                key={ind.key}
                className="rounded-2xl border border-border-card bg-slate-50/70 p-3.5 space-y-2 flex flex-col justify-between"
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
                    {indDate && latestLab && indDate !== latestLab.date && (
                      <span className="ml-1.5 text-medical-dark font-bold">
                        · Đo ngày {fmtDateShort(indDate)}
                      </span>
                    )}
                  </div>
                  {deltaText && (
                    <div className="text-xs sm:text-sm font-bold text-medical-dark mt-1">
                      {deltaText}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/70 space-y-2">
                  <div className="text-sm text-text-body leading-relaxed">
                    {ind.clinicalNote}
                  </div>
                  {guide && (
                    <MedicalInfoToggle
                      guide={guide}
                      isWarning={isWarnStatus}
                      buttonLabel={isWarnStatus ? 'Xem tác hại & cách xử trí' : 'Ý nghĩa & tác hại'}
                    />
                  )}
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

      {/* Tóm tắt Siêu âm định kỳ (Gan, Thận, Mô tả Polyp & Hẹn siêu âm lại) */}
      {hasUltrasoundDetails && (bioFilter === 'all_bio' || bioFilter === 'ultrasound') && latestLab && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-3.5 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-base font-black text-teal-950 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-teal-700 shrink-0" />
              <span>Chi Tiết Siêu Âm Bụng Định Kỳ</span>
            </h4>
            {latestLab.nextUltrasoundDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-xs sm:text-sm font-extrabold text-teal-900">
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                Hẹn siêu âm lại: {fmtDateShort(latestLab.nextUltrasoundDate)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {latestLab.gallbladderPolypCount && (
              <div className="rounded-xl border border-teal-200 bg-white p-3 space-y-1.5">
                <div className="text-xs font-bold text-text-muted uppercase">Mô tả Polyp túi mật</div>
                <div className="text-sm sm:text-base font-black text-text-main">
                  {latestLab.gallbladderPolypCount}
                </div>
                {polypGuide && (
                  <MedicalInfoToggle guide={polypGuide} compact buttonLabel="Ý nghĩa & tác hại" />
                )}
              </div>
            )}
            {latestLab.liverUltrasound && (
              <div className="rounded-xl border border-teal-200 bg-white p-3 space-y-1.5">
                <div className="text-xs font-bold text-text-muted uppercase">Siêu âm Gan</div>
                <div className="text-sm sm:text-base font-black text-text-main">
                  {latestLab.liverUltrasound}
                </div>
                {liverUsGuide && (
                  <MedicalInfoToggle
                    guide={liverUsGuide}
                    isWarning={latestLab.liverUltrasound.toLowerCase().includes('nhiễm mỡ')}
                    compact
                    buttonLabel="Ý nghĩa & tác hại"
                  />
                )}
              </div>
            )}
            {latestLab.kidneyUltrasound && (
              <div className="rounded-xl border border-teal-200 bg-white p-3 space-y-1.5">
                <div className="text-xs font-bold text-text-muted uppercase">Siêu âm Thận / Đường mật</div>
                <div className="text-sm sm:text-base font-black text-text-main">
                  {latestLab.kidneyUltrasound}
                </div>
                {kidneyUsGuide && (
                  <MedicalInfoToggle
                    guide={kidneyUsGuide}
                    isWarning={latestLab.kidneyUltrasound.toLowerCase().includes('sỏi')}
                    compact
                    buttonLabel="Ý nghĩa & tác hại"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phân tích lâm sàng trục Cận giáp - Canxi - Phospho - Albumin */}
      {(bioFilter === 'all_bio' || bioFilter === 'metabolic') && (
        <ParathyroidClinicalGuideCard latestLab={latestLab} profileType={profileType} />
      )}

      {/* Biểu đồ xu hướng Hóa sinh theo nhóm */}
      <BiochemistryTrendChart
        chartData={chartData}
        onOpenAddLab={onOpenAddLab}
        onOpenImport={onOpenImport}
      />
    </div>
  );
}

export default BiochemistryTrackerSection;
