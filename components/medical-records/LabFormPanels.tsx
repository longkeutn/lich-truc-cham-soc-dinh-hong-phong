'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CustomLabItem } from '@/lib/types';

export interface LabBiochemFormValues {
  lipidUnit: 'mmol/L' | 'mg/dL';
  cholesterol: string;
  triglyceride: string;
  hdlC: string;
  ldlC: string;
  glucoseUnit: 'mmol/L' | 'mg/dL';
  glucose: string;
  hba1c: string;
  calciumUnit: 'mmol/L' | 'mg/dL';
  calcium: string;
  ionizedCalcium: string;
  vitaminD: string;
  ast: string;
  alt: string;
  creatinine: string;
  urea: string;
  uricAcid: string;
  hemoglobin: string;
  customLabs: CustomLabItem[];
}

interface LabFormPanelsProps {
  values: LabBiochemFormValues;
  onChangeField: <K extends keyof LabBiochemFormValues>(
    field: K,
    value: LabBiochemFormValues[K]
  ) => void;
  hiddenFields?: ReadonlyArray<keyof LabBiochemFormValues>;
  onManualUnitSelect?: (kind: 'lipid' | 'glucose' | 'calcium') => void;
}

export function LabMetricInput({
  label,
  subHint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  subHint?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-base font-extrabold text-text-body mb-1">
        {label}
        {subHint ? (
          <span className="text-xs sm:text-sm font-semibold text-text-muted ml-1">
            ({subHint})
          </span>
        ) : null}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Để trống nếu không đo'}
        className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card focus:outline-none focus:ring-2 focus:ring-medical-primary"
      />
    </div>
  );
}

export function LabUnitMetricField<U extends string>({
  label,
  value,
  onChange,
  unit,
  options,
  onUnitChange,
  placeholder,
  refHint,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  unit: U;
  options: readonly [U, U];
  onUnitChange: (nextUnit: U) => void;
  placeholder?: string;
  refHint?: string;
}) {
  return (
    <div className="rounded-xl border border-indigo-200/80 bg-surface-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <label className="block text-base font-extrabold text-text-main">{label}</label>
          {refHint ? (
            <span className="block text-xs sm:text-sm font-semibold text-text-muted">
              Chuẩn: {refHint}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label={`Đơn vị ${label}`}>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onUnitChange(opt)}
              className={`min-h-[48px] min-w-[64px] px-3 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                unit === opt
                  ? 'bg-thyroid-accent text-white border-indigo-700 shadow-2xs'
                  : 'bg-slate-50 hover:bg-indigo-50 text-text-body border-border-card'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Nhập ${label} (${unit})`}
        className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card focus:outline-none focus:ring-2 focus:ring-medical-primary"
      />
    </div>
  );
}

export function LabFormPanels({
  values,
  onChangeField,
  hiddenFields = [],
  onManualUnitSelect,
}: LabFormPanelsProps) {
  const isHidden = (f: keyof LabBiochemFormValues) => hiddenFields.includes(f);
  const showLipidGroup =
    !isHidden('cholesterol') ||
    !isHidden('ldlC') ||
    !isHidden('hdlC') ||
    !isHidden('triglyceride');
  const showMetabolicGroup =
    !isHidden('glucose') ||
    !isHidden('hba1c') ||
    !isHidden('calcium') ||
    !isHidden('ionizedCalcium') ||
    !isHidden('vitaminD');
  const showLiverKidneyGroup =
    !isHidden('ast') ||
    !isHidden('alt') ||
    !isHidden('creatinine') ||
    !isHidden('urea') ||
    !isHidden('uricAcid') ||
    !isHidden('hemoglobin');
  const handleAddCustomRow = () => {
    onChangeField('customLabs', [
      ...values.customLabs,
      {
        id: `cl-${Date.now()}-${values.customLabs.length}`,
        name: '',
        value: '',
        unit: '',
        refRange: '',
      },
    ]);
  };

  const handleUpdateCustomRow = (idx: number, key: keyof CustomLabItem, val: string) => {
    onChangeField(
      'customLabs',
      values.customLabs.map((item, i) => (i === idx ? { ...item, [key]: val } : item))
    );
  };

  const handleRemoveCustomRow = (idx: number) => {
    onChangeField(
      'customLabs',
      values.customLabs.filter((_, i) => i !== idx)
    );
  };

  return (
    <div className="space-y-4">
      {/* Nhóm 3: Bộ Mỡ Máu */}
      {showLipidGroup && (
        <div className="rounded-2xl border border-border-card bg-slate-50/70 p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-base font-black text-text-main uppercase">
              ❤️ Bộ Mỡ Máu - Tim Mạch (Đơn vị &amp; Chỉ số bổ sung)
            </h4>
            <div className="flex items-center gap-1.5">
              {(['mmol/L', 'mg/dL'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => {
                    onChangeField('lipidUnit', u);
                    onManualUnitSelect?.('lipid');
                  }}
                  className={`min-h-[48px] min-w-[68px] px-3 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                    values.lipidUnit === u
                      ? 'bg-medical-primary text-white border-medical-dark shadow-2xs'
                      : 'bg-surface-card text-text-body border-border-card hover:bg-slate-100'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {!isHidden('cholesterol') && (
              <LabMetricInput
                label="Cholesterol TP"
                subHint={values.lipidUnit === 'mmol/L' ? '<5.2' : '<200'}
                value={values.cholesterol}
                onChange={(v) => onChangeField('cholesterol', v)}
              />
            )}
            {!isHidden('ldlC') && (
              <LabMetricInput
                label="LDL-C (Mỡ xấu)"
                subHint={values.lipidUnit === 'mmol/L' ? '<2.6' : '<100'}
                value={values.ldlC}
                onChange={(v) => onChangeField('ldlC', v)}
              />
            )}
            {!isHidden('hdlC') && (
              <LabMetricInput
                label="HDL-C (Mỡ tốt)"
                subHint={values.lipidUnit === 'mmol/L' ? '>1.15' : '>45'}
                value={values.hdlC}
                onChange={(v) => onChangeField('hdlC', v)}
              />
            )}
            {!isHidden('triglyceride') && (
              <LabMetricInput
                label="Triglyceride"
                subHint={values.lipidUnit === 'mmol/L' ? '<1.7' : '<150'}
                value={values.triglyceride}
                onChange={(v) => onChangeField('triglyceride', v)}
              />
            )}
          </div>
        </div>
      )}

      {/* Nhóm 4: Đường huyết, Canxi & Vitamin D */}
      {showMetabolicGroup && (
        <div className="rounded-2xl border border-border-card bg-slate-50/70 p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="text-base font-black text-text-main uppercase">
              🦴 Đường Huyết, Canxi &amp; Vitamin D
            </h4>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="font-bold text-text-body">Đường:</span>
              {(['mmol/L', 'mg/dL'] as const).map((u) => (
                <button
                  key={`glu-${u}`}
                  type="button"
                  onClick={() => {
                    onChangeField('glucoseUnit', u);
                    onManualUnitSelect?.('glucose');
                  }}
                  className={`min-h-[48px] min-w-[68px] px-3 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                    values.glucoseUnit === u
                      ? 'bg-medical-primary text-white border-medical-dark shadow-2xs'
                      : 'bg-surface-card text-text-body border-border-card hover:bg-slate-100'
                  }`}
                >
                  {u}
                </button>
              ))}
              <span className="font-bold text-text-body ml-1">Canxi:</span>
              {(['mmol/L', 'mg/dL'] as const).map((u) => (
                <button
                  key={`ca-${u}`}
                  type="button"
                  onClick={() => {
                    onChangeField('calciumUnit', u);
                    onManualUnitSelect?.('calcium');
                  }}
                  className={`min-h-[48px] min-w-[68px] px-3 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                    values.calciumUnit === u
                      ? 'bg-medical-primary text-white border-medical-dark shadow-2xs'
                      : 'bg-surface-card text-text-body border-border-card hover:bg-slate-100'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {!isHidden('glucose') && (
              <LabMetricInput
                label="Glucose đói"
                subHint={values.glucoseUnit}
                value={values.glucose}
                onChange={(v) => onChangeField('glucose', v)}
              />
            )}
            {!isHidden('hba1c') && (
              <LabMetricInput
                label="HbA1c"
                subHint="%"
                value={values.hba1c}
                onChange={(v) => onChangeField('hba1c', v)}
              />
            )}
            {!isHidden('calcium') && (
              <LabMetricInput
                label="Canxi toàn phần"
                subHint={values.calciumUnit}
                value={values.calcium}
                onChange={(v) => onChangeField('calcium', v)}
              />
            )}
            {!isHidden('ionizedCalcium') && (
              <LabMetricInput
                label="Canxi ion (Ca++)"
                subHint="mmol/L"
                value={values.ionizedCalcium}
                onChange={(v) => onChangeField('ionizedCalcium', v)}
              />
            )}
            {!isHidden('vitaminD') && (
              <LabMetricInput
                label="Vitamin D"
                subHint="ng/mL"
                value={values.vitaminD}
                onChange={(v) => onChangeField('vitaminD', v)}
              />
            )}
          </div>
        </div>
      )}

      {/* Nhóm 5: Gan, Thận & Huyết học */}
      {showLiverKidneyGroup && (
        <div className="rounded-2xl border border-border-card bg-slate-50/70 p-3.5 sm:p-4 space-y-3">
          <h4 className="text-base font-black text-text-main uppercase">
            🧪 Chức Năng Gan, Thận &amp; Huyết Học (Mở rộng)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {!isHidden('ast') && (
              <LabMetricInput
                label="AST (GOT)"
                subHint="U/L"
                value={values.ast}
                onChange={(v) => onChangeField('ast', v)}
              />
            )}
            {!isHidden('alt') && (
              <LabMetricInput
                label="ALT (GPT)"
                subHint="U/L"
                value={values.alt}
                onChange={(v) => onChangeField('alt', v)}
              />
            )}
            {!isHidden('creatinine') && (
              <LabMetricInput
                label="Creatinine"
                subHint="µmol/L"
                value={values.creatinine}
                onChange={(v) => onChangeField('creatinine', v)}
              />
            )}
            {!isHidden('urea') && (
              <LabMetricInput
                label="Ure máu"
                subHint="mmol/L"
                value={values.urea}
                onChange={(v) => onChangeField('urea', v)}
              />
            )}
            {!isHidden('uricAcid') && (
              <LabMetricInput
                label="Acid Uric"
                subHint="µmol/L"
                value={values.uricAcid}
                onChange={(v) => onChangeField('uricAcid', v)}
              />
            )}
            {!isHidden('hemoglobin') && (
              <LabMetricInput
                label="Hemoglobin"
                subHint="g/L hoặc g/dL"
                value={values.hemoglobin}
                onChange={(v) => onChangeField('hemoglobin', v)}
              />
            )}
          </div>
        </div>
      )}

      {/* Nhóm 6: Chỉ số mở rộng tùy chỉnh */}
      <div className="rounded-2xl border border-border-card bg-slate-50/70 p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-base font-black text-text-main uppercase">
            ➕ Chỉ Số Mở Rộng Khác (Tự định nghĩa)
          </h4>
          <button
            type="button"
            onClick={handleAddCustomRow}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-surface-card hover:bg-slate-100 text-medical-dark border border-border-card text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm chỉ số</span>
          </button>
        </div>

        {values.customLabs.length > 0 && (
          <div className="space-y-2.5">
            {values.customLabs.map((row, idx) => (
              <div
                key={row.id}
                className="rounded-xl border border-border-card bg-surface-card p-2.5 grid grid-cols-2 sm:grid-cols-12 gap-2 items-center"
              >
                <input
                  type="text"
                  placeholder="Tên chỉ số (VD: Kali)"
                  value={row.name}
                  onChange={(e) => handleUpdateCustomRow(idx, 'name', e.target.value)}
                  className="col-span-2 sm:col-span-4 min-h-[48px] min-w-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
                />
                <input
                  type="text"
                  placeholder="Kết quả"
                  value={row.value}
                  onChange={(e) => handleUpdateCustomRow(idx, 'value', e.target.value)}
                  className="col-span-1 sm:col-span-3 min-h-[48px] min-w-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
                />
                <input
                  type="text"
                  placeholder="Đơn vị"
                  value={row.unit || ''}
                  onChange={(e) => handleUpdateCustomRow(idx, 'unit', e.target.value)}
                  className="col-span-1 sm:col-span-2 min-h-[48px] min-w-[48px] px-3 rounded-xl border border-border-card text-base text-text-main bg-surface-card"
                />
                <div className="col-span-2 sm:col-span-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tham chiếu"
                    value={row.refRange || ''}
                    onChange={(e) => handleUpdateCustomRow(idx, 'refRange', e.target.value)}
                    className="flex-1 min-w-0 min-h-[48px] px-3 rounded-xl border border-border-card text-base text-text-main bg-surface-card"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomRow(idx)}
                    className="min-h-[48px] min-w-[48px] shrink-0 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center cursor-pointer"
                    aria-label="Xoá dòng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LabFormPanels;
