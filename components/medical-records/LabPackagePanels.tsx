'use client';

import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, FileText, HeartPulse } from 'lucide-react';
import { getLabMedicalGuide } from '@/lib/labMedicalGuides';
import { MedicalInfoToggle } from '@/components/ui-kit';
import { QUICK_DOSES } from './labRecordsUtils';
import { LabMetricInput, type LabBiochemFormValues } from './LabFormPanels';
import {
  resolveEffectiveLabUnits,
  type LabExamPackage,
  type LabFullFormState,
} from './labFormState';

const PACKAGE_CARDS: Array<{
  id: LabExamPackage;
  emoji: string;
  title: string;
  subtitle: string;
  badge: string;
}> = [
  {
    id: 'thyroid',
    emoji: '🦋',
    title: 'Gói 1: Tuyến Giáp',
    subtitle: 'Liều thuốc, TSH, FT4, TG, Canxi',
    badge: '5 chỉ số chính',
  },
  {
    id: 'general',
    emoji: '🧪',
    title: 'Gói 2: Tổng Quát',
    subtitle: 'Đường, Mỡ máu, Gan (GGT), Thận, Gout & Siêu âm',
    badge: '11 chỉ số + Siêu âm',
  },
  {
    id: 'advice_only',
    emoji: '📝',
    title: 'Gói 3: Chỉ Lời Dặn BS',
    subtitle: 'Chỉ ghi ngày, nơi khám & lời dặn',
    badge: '0 cần gõ số',
  },
];

export function LabPackageSelector({
  selectedPackage,
  onSelect,
}: {
  selectedPackage: LabExamPackage;
  onSelect: (pkg: LabExamPackage) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm sm:text-base font-black text-text-main">
          Bước 1: Chọn nhanh gói vừa đi khám (1 chạm)
        </span>
        <span className="text-xs sm:text-sm font-semibold text-text-muted">
          Tự ẩn các ô không liên quan để dễ nhìn
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {PACKAGE_CARDS.map((card) => {
          const active = selectedPackage === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelect(card.id)}
              aria-pressed={active}
              className={`min-h-[72px] min-w-[48px] text-left rounded-2xl border-2 p-3.5 transition cursor-pointer flex items-start gap-3 ${
                active
                  ? 'bg-medical-primary text-white border-medical-dark shadow-sm'
                  : 'bg-surface-card hover:bg-medical-surface/60 text-text-main border-border-card'
              }`}
            >
              <span className="text-2xl leading-none shrink-0 mt-0.5" aria-hidden="true">
                {card.emoji}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-base font-black leading-snug">{card.title}</span>
                  {active && <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />}
                </div>
                <p
                  className={`text-xs sm:text-sm font-semibold leading-snug ${
                    active ? 'text-teal-50' : 'text-text-muted'
                  }`}
                >
                  {card.subtitle}
                </p>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                    active
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-100 text-text-body'
                  }`}
                >
                  {card.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ThyroidQuickPanel({
  form,
  showParathyroidQuick,
  onToggleParathyroidQuick,
  onSetField,
  onSetBioField,
}: {
  form: LabFullFormState;
  showParathyroidQuick: boolean;
  onToggleParathyroidQuick: () => void;
  onSetField: <K extends keyof LabFullFormState>(key: K, value: LabFullFormState[K]) => void;
  onSetBioField: <K extends keyof LabBiochemFormValues>(
    field: K,
    value: LabBiochemFormValues[K]
  ) => void;
}) {
  const effectiveUnits = resolveEffectiveLabUnits(form);

  return (
    <div className="rounded-2xl border border-indigo-200 bg-thyroid-bg/40 p-3.5 sm:p-4 space-y-3.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-base font-black text-indigo-950 flex items-center gap-2">
          <span>🦋 Chỉ Số Tuyến Giáp Thiết Yếu</span>
        </h4>
        <span className="text-xs sm:text-sm font-bold text-indigo-900 bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-200">
          Để trống ô nào không có trên giấy
        </span>
      </div>

      <div>
        <label className="block text-base font-extrabold text-text-body mb-1">
          💊 Liều thuốc Levothyroxine đang uống
        </label>
        <input
          type="text"
          value={form.levothyroxineDose}
          onChange={(e) => onSetField('levothyroxineDose', e.target.value)}
          placeholder="VD: 100mcg hoặc 100x5, 50x2"
          className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {QUICK_DOSES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onSetField('levothyroxineDose', d)}
              className={`min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl text-sm font-bold border transition cursor-pointer ${
                form.levothyroxineDose === d
                  ? 'bg-amber-200 text-amber-950 border-amber-400 font-black shadow-2xs'
                  : 'bg-surface-card text-text-body border-border-card hover:bg-slate-50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <LabMetricInput
          label="TSH"
          subHint="µIU/mL"
          value={form.tsh}
          onChange={(v) => onSetField('tsh', v)}
          placeholder="VD: 0.18"
        />
        <LabMetricInput
          label="FT4"
          subHint={effectiveUnits.ft4Unit}
          value={form.ft4}
          onChange={(v) => onSetField('ft4', v)}
          placeholder={effectiveUnits.ft4Unit === 'pmol/L' ? 'VD: 18.5' : 'VD: 1.45'}
        />
        <LabMetricInput
          label="TG (Marker)"
          subHint="ng/mL"
          value={form.tg}
          onChange={(v) => onSetField('tg', v)}
          placeholder="VD: 0.04"
        />
        <LabMetricInput
          label="Canxi toàn phần"
          subHint={effectiveUnits.calciumUnit}
          value={form.bio.calcium}
          onChange={(v) => onSetBioField('calcium', v)}
          placeholder={effectiveUnits.calciumUnit === 'mmol/L' ? 'VD: 2.3' : 'VD: 9.2'}
        />
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={onToggleParathyroidQuick}
          aria-expanded={showParathyroidQuick}
          className="w-full min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white/90 hover:bg-indigo-50/70 text-indigo-950 text-sm font-extrabold flex items-center justify-between gap-2 transition cursor-pointer"
        >
          <span>
            🦴 Bộ Cận Giáp &amp; Hiệu Chỉnh Canxi (PTH, Phospho, Albumin, Vitamin D)
          </span>
          {showParathyroidQuick ? (
            <ChevronUp className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0" />
          )}
        </button>

        {showParathyroidQuick && (
          <div className="mt-2.5 rounded-xl border border-indigo-200/80 bg-white/85 p-3 space-y-2.5">
            <p className="text-xs sm:text-sm font-semibold text-indigo-900">
              Hệ thống tự động quy đổi đơn vị và tính Canxi hiệu chỉnh theo Albumin + tích số Ca × Phospho.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <LabMetricInput
                label="PTH (Cận giáp)"
                subHint={effectiveUnits.pthUnit}
                value={form.bio.pth}
                onChange={(v) => onSetBioField('pth', v)}
                placeholder={effectiveUnits.pthUnit === 'pg/mL' ? 'VD: 32' : 'VD: 3.4'}
              />
              <LabMetricInput
                label="Phospho máu"
                subHint={effectiveUnits.phosphorusUnit}
                value={form.bio.phosphorus}
                onChange={(v) => onSetBioField('phosphorus', v)}
                placeholder={effectiveUnits.phosphorusUnit === 'mmol/L' ? 'VD: 1.15' : 'VD: 3.5'}
              />
              <LabMetricInput
                label="Albumin máu"
                subHint={effectiveUnits.albuminUnit}
                value={form.bio.albumin}
                onChange={(v) => onSetBioField('albumin', v)}
                placeholder={effectiveUnits.albuminUnit === 'g/L' ? 'VD: 42' : 'VD: 4.2'}
              />
              <LabMetricInput
                label="Vitamin D"
                subHint="ng/mL"
                value={form.bio.vitaminD}
                onChange={(v) => onSetBioField('vitaminD', v)}
                placeholder="VD: 34"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function GeneralQuickPanel({
  form,
  onSetBioField,
}: {
  form: LabFullFormState;
  onSetBioField: <K extends keyof LabBiochemFormValues>(
    field: K,
    value: LabBiochemFormValues[K]
  ) => void;
}) {
  const effectiveUnits = resolveEffectiveLabUnits(form);
  const [showUltrasoundQuick, setShowUltrasoundQuick] = useState<boolean>(() =>
    Boolean(
      form.bio.gallbladderPolypMm.trim() ||
        form.bio.gallbladderPolypCount.trim() ||
        form.bio.liverUltrasound.trim() ||
        form.bio.kidneyUltrasound.trim() ||
        form.bio.nextUltrasoundDate.trim()
    )
  );

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-3.5 sm:p-4 space-y-3.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-base font-black text-teal-950 flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-medical-primary shrink-0" />
          <span>Chỉ Số Khám Tổng Quát, Tim Mạch, Gan &amp; Gout</span>
        </h4>
        <span className="text-xs sm:text-sm font-bold text-teal-900 bg-white/80 px-2.5 py-1 rounded-lg border border-teal-200">
          Bấm nút &quot;Ý nghĩa&quot; cạnh từng ô để xem tác hại sức khỏe
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <LabMetricInput
          label="Đường huyết đói"
          subHint={effectiveUnits.glucoseUnit}
          value={form.bio.glucose}
          onChange={(v) => onSetBioField('glucose', v)}
          placeholder="VD: 5.6"
          infoGuide={getLabMedicalGuide('glucose')}
        />
        <LabMetricInput
          label="HbA1c"
          subHint="%"
          value={form.bio.hba1c}
          onChange={(v) => onSetBioField('hba1c', v)}
          placeholder="VD: 6.1"
          infoGuide={getLabMedicalGuide('hba1c')}
        />
        <LabMetricInput
          label="Cholesterol TP"
          subHint={effectiveUnits.lipidUnit}
          value={form.bio.cholesterol}
          onChange={(v) => onSetBioField('cholesterol', v)}
          placeholder="VD: 4.8"
          infoGuide={getLabMedicalGuide('cholesterol')}
        />
        <LabMetricInput
          label="LDL-C (Mỡ xấu)"
          subHint={effectiveUnits.lipidUnit}
          value={form.bio.ldlC}
          onChange={(v) => onSetBioField('ldlC', v)}
          placeholder="VD: 2.5"
          infoGuide={getLabMedicalGuide('ldlC')}
        />
        <LabMetricInput
          label="Triglyceride"
          subHint={effectiveUnits.lipidUnit}
          value={form.bio.triglyceride}
          onChange={(v) => onSetBioField('triglyceride', v)}
          placeholder="VD: 1.5"
          infoGuide={getLabMedicalGuide('triglyceride')}
        />
        <LabMetricInput
          label="Men gan AST (GOT)"
          subHint="U/L"
          value={form.bio.ast}
          onChange={(v) => onSetBioField('ast', v)}
          placeholder="VD: 24"
          infoGuide={getLabMedicalGuide('ast')}
        />
        <LabMetricInput
          label="Men gan ALT (GPT)"
          subHint="U/L"
          value={form.bio.alt}
          onChange={(v) => onSetBioField('alt', v)}
          placeholder="VD: 26"
          infoGuide={getLabMedicalGuide('alt')}
        />
        <LabMetricInput
          label="GGT (Gan mật)"
          subHint="U/L"
          value={form.bio.ggt}
          onChange={(v) => onSetBioField('ggt', v)}
          placeholder="VD: 35"
          infoGuide={getLabMedicalGuide('ggt')}
        />
        <LabMetricInput
          label="Creatinine (Thận)"
          subHint="µmol/L"
          value={form.bio.creatinine}
          onChange={(v) => onSetBioField('creatinine', v)}
          placeholder="VD: 82"
          infoGuide={getLabMedicalGuide('creatinine')}
        />
        <LabMetricInput
          label="eGFR (Lọc thận)"
          subHint="mL/phút"
          value={form.bio.egfr}
          onChange={(v) => onSetBioField('egfr', v)}
          placeholder="VD: 84"
          infoGuide={getLabMedicalGuide('egfr')}
        />
        <LabMetricInput
          label="Acid Uric (Gout)"
          subHint="µmol/L"
          value={form.bio.uricAcid}
          onChange={(v) => onSetBioField('uricAcid', v)}
          placeholder="VD: 350"
          infoGuide={getLabMedicalGuide('uricAcid')}
        />
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowUltrasoundQuick((v) => !v)}
          aria-expanded={showUltrasoundQuick}
          className="w-full min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl border border-teal-200 bg-white/90 hover:bg-teal-50/70 text-teal-950 text-sm font-extrabold flex items-center justify-between gap-2 transition cursor-pointer"
        >
          <span>
            🩺 Siêu Âm Bụng Định Kỳ (Polyp Túi Mật, Gan Nhiễm Mỡ, Sỏi Thận)
          </span>
          {showUltrasoundQuick ? (
            <ChevronUp className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0" />
          )}
        </button>

        {showUltrasoundQuick && (
          <div className="mt-2.5 rounded-xl border border-teal-200/80 bg-white/90 p-3 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs sm:text-sm font-semibold text-teal-900">
                Ghi kích thước Polyp túi mật (mm) qua từng lần siêu âm để theo dõi tốc độ tăng trưởng.
              </p>
              {(() => {
                const guide = getLabMedicalGuide('gallbladderPolypMm');
                return guide ? <MedicalInfoToggle guide={guide} compact buttonLabel="Ý nghĩa Polyp" /> : null;
              })()}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <LabMetricInput
                label="Polyp túi mật lớn nhất"
                subHint="mm"
                value={form.bio.gallbladderPolypMm}
                onChange={(v) => onSetBioField('gallbladderPolypMm', v)}
                placeholder="VD: 4.5"
              />
              <div>
                <label className="block text-base font-extrabold text-text-body mb-1">
                  Số lượng / mô tả Polyp
                </label>
                <input
                  type="text"
                  value={form.bio.gallbladderPolypCount}
                  onChange={(e) => onSetBioField('gallbladderPolypCount', e.target.value)}
                  placeholder="VD: Đơn độc / Nhiều polyp"
                  className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
                />
              </div>
              <div>
                <label className="block text-base font-extrabold text-text-body mb-1">
                  Siêu âm Gan
                </label>
                <input
                  type="text"
                  value={form.bio.liverUltrasound}
                  onChange={(e) => onSetBioField('liverUltrasound', e.target.value)}
                  placeholder="VD: Bình thường / Gan nhiễm mỡ độ 1"
                  className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
                />
              </div>
              <div>
                <label className="block text-base font-extrabold text-text-body mb-1">
                  Siêu âm Thận / Đường mật
                </label>
                <input
                  type="text"
                  value={form.bio.kidneyUltrasound}
                  onChange={(e) => onSetBioField('kidneyUltrasound', e.target.value)}
                  placeholder="VD: Bình thường / Sỏi thận nhỏ"
                  className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
                />
              </div>
              <div>
                <label className="block text-base font-extrabold text-text-body mb-1">
                  Hẹn siêu âm lại
                </label>
                <input
                  type="date"
                  value={form.bio.nextUltrasoundDate}
                  onChange={(e) => onSetBioField('nextUltrasoundDate', e.target.value)}
                  className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdviceOnlyBanner() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 flex items-start gap-3">
      <FileText className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-base font-black text-amber-950">
          Chế độ ghi nhanh: Không cần nhập bất kỳ con số xét nghiệm nào
        </p>
        <p className="text-sm font-medium text-amber-900 leading-relaxed">
          Chỉ cần chọn ngày khám, nơi khám và ghi lại lời dặn của Bác sĩ ở phía dưới để cả nhà cùng nhớ lịch tái khám và cách uống thuốc.
        </p>
      </div>
    </div>
  );
}
