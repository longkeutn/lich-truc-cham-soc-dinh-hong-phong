'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import type { FamilyMember, TshTargetLevel } from '@/lib/types';
import {
  LabFormPanels,
  LabMetricInput,
  LabUnitMetricField,
  type LabBiochemFormValues,
} from './LabFormPanels';
import type { LabExamPackage, LabFullFormState } from './labFormState';

export function LabAdvancedSection({
  selectedPackage,
  form,
  members,
  onSetField,
  onSetBioField,
  onManualUnitLock,
}: {
  selectedPackage: LabExamPackage;
  form: LabFullFormState;
  members: FamilyMember[];
  onSetField: <K extends keyof LabFullFormState>(key: K, value: LabFullFormState[K]) => void;
  onSetBioField: <K extends keyof LabBiochemFormValues>(
    field: K,
    value: LabBiochemFormValues[K]
  ) => void;
  onManualUnitLock: (kind: 'ft4' | 'lipid' | 'glucose' | 'calcium') => void;
}) {
  const hiddenBioFields: Array<keyof LabBiochemFormValues> =
    selectedPackage === 'thyroid'
      ? ['calcium']
      : selectedPackage === 'general'
        ? [
            'glucose',
            'hba1c',
            'cholesterol',
            'ldlC',
            'triglyceride',
            'ast',
            'alt',
            'creatinine',
          ]
        : [];

  return (
    <div className="space-y-4 pt-2 border-t border-dashed border-border-card">
      <div className="rounded-2xl border border-border-card bg-slate-50/70 p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-base font-extrabold text-text-body mb-1">
            Người nhập
          </label>
          {members.length > 0 ? (
            <select
              value={form.recordedBy}
              onChange={(e) => onSetField('recordedBy', e.target.value)}
              className="w-full min-h-[48px] min-w-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
            >
              {members.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.relation})
                </option>
              ))}
              {!members.some((m) => m.name === form.recordedBy) && form.recordedBy && (
                <option value={form.recordedBy}>{form.recordedBy}</option>
              )}
            </select>
          ) : (
            <input
              type="text"
              value={form.recordedBy}
              onChange={(e) => onSetField('recordedBy', e.target.value)}
              className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
            />
          )}
        </div>

        <div>
          <label className="block text-base font-extrabold text-text-body mb-1">
            Đích ức chế TSH (Hồ sơ tuyến giáp)
          </label>
          <select
            value={form.tshTargetLevel}
            onChange={(e) => onSetField('tshTargetLevel', e.target.value as TshTargetLevel)}
            className="w-full min-h-[48px] min-w-[48px] px-3 rounded-xl border border-border-card bg-surface-card text-base font-extrabold text-indigo-950"
          >
            <option value="high_risk">Đích ức chế cao: TSH &lt; 0.1 µIU/mL</option>
            <option value="moderate_risk">Đích ức chế vừa: TSH 0.1 - 0.5 µIU/mL</option>
            <option value="normal">Bình thường chung: TSH 0.4 - 4.0 µIU/mL</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-thyroid-bg/30 p-3.5 sm:p-4 space-y-3.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-700 shrink-0" />
          <h4 className="text-base font-black text-indigo-950 uppercase">
            {selectedPackage === 'thyroid'
              ? '🦋 Tuyến Giáp Mở Rộng & Đổi Đơn Vị FT4'
              : '🦋 Chỉ Số Tuyến Giáp & Hormone'}
          </h4>
        </div>

        {selectedPackage !== 'thyroid' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabMetricInput
              label="Liều Levothyroxine"
              value={form.levothyroxineDose}
              onChange={(v) => onSetField('levothyroxineDose', v)}
              placeholder="VD: 100mcg"
            />
            <LabMetricInput
              label="TSH"
              subHint="µIU/mL"
              value={form.tsh}
              onChange={(v) => onSetField('tsh', v)}
              placeholder="VD: 0.18"
            />
            <LabMetricInput
              label="TG (Marker)"
              subHint="ng/mL"
              value={form.tg}
              onChange={(v) => onSetField('tg', v)}
              placeholder="VD: 0.04"
            />
          </div>
        )}

        {selectedPackage === 'thyroid' && (
          <div className="rounded-xl border border-indigo-200/80 bg-surface-card p-3 flex items-center justify-between gap-2 flex-wrap">
            <div>
              <span className="block text-sm font-extrabold text-text-main">
                Đơn vị FT4 (mặc định tự nhận diện theo số nhập)
              </span>
              <span className="text-xs font-semibold text-text-muted">
                Chuẩn: {form.ft4Unit === 'pmol/L' ? '12.0 - 22.0 pmol/L' : '0.93 - 1.70 ng/dL'}
              </span>
            </div>
            <div className="flex items-center gap-1.5" role="group" aria-label="Đơn vị FT4">
              {(['pmol/L', 'ng/dL'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onSetField('ft4Unit', opt);
                    onManualUnitLock('ft4');
                  }}
                  className={`min-h-[48px] min-w-[64px] px-3 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                    form.ft4Unit === opt
                      ? 'bg-thyroid-accent text-white border-indigo-700 shadow-2xs'
                      : 'bg-slate-50 hover:bg-indigo-50 text-text-body border-border-card'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {selectedPackage !== 'thyroid' && (
            <LabUnitMetricField
              label="FT4 (Thyroxine tự do)"
              value={form.ft4}
              onChange={(v) => onSetField('ft4', v)}
              unit={form.ft4Unit}
              options={['pmol/L', 'ng/dL']}
              onUnitChange={(u) => {
                onSetField('ft4Unit', u);
                onManualUnitLock('ft4');
              }}
              placeholder={form.ft4Unit === 'pmol/L' ? 'VD: 18.5' : 'VD: 1.45'}
              refHint={form.ft4Unit === 'pmol/L' ? '12.0 - 22.0 pmol/L' : '0.93 - 1.70 ng/dL'}
            />
          )}
          <LabUnitMetricField
            label="FT3 (Triiodothyronine tự do)"
            value={form.ft3}
            onChange={(v) => onSetField('ft3', v)}
            unit={form.ft3Unit}
            options={['pg/mL', 'pmol/L']}
            onUnitChange={(u) => onSetField('ft3Unit', u)}
            placeholder={form.ft3Unit === 'pg/mL' ? 'VD: 3.1' : 'VD: 4.8'}
            refHint={form.ft3Unit === 'pg/mL' ? '2.0 - 4.4 pg/mL' : '3.1 - 6.8 pmol/L'}
          />
          <LabUnitMetricField
            label="T3 toàn phần"
            value={form.t3}
            onChange={(v) => onSetField('t3', v)}
            unit={form.t3Unit}
            options={['nmol/L', 'ng/dL']}
            onUnitChange={(u) => onSetField('t3Unit', u)}
            placeholder={form.t3Unit === 'nmol/L' ? 'VD: 1.54' : 'VD: 110'}
            refHint={form.t3Unit === 'nmol/L' ? '1.1 - 2.8 nmol/L' : '70 - 180 ng/dL'}
          />
          <LabUnitMetricField
            label="T4 toàn phần"
            value={form.t4}
            onChange={(v) => onSetField('t4', v)}
            unit={form.t4Unit}
            options={['µg/dL', 'nmol/L']}
            onUnitChange={(u) => onSetField('t4Unit', u)}
            placeholder={form.t4Unit === 'µg/dL' ? 'VD: 8.5' : 'VD: 105'}
            refHint={form.t4Unit === 'µg/dL' ? '5.1 - 14.1 µg/dL' : '66 - 181 nmol/L'}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabMetricInput
            label="Anti-TG"
            subHint="IU/mL"
            value={form.antiTg}
            onChange={(v) => onSetField('antiTg', v)}
            placeholder="VD: 19.44"
          />
          <LabMetricInput
            label="Anti-TPO"
            subHint="IU/mL"
            value={form.antiTpo}
            onChange={(v) => onSetField('antiTpo', v)}
            placeholder="VD: 10.2"
          />
        </div>
      </div>

      <LabFormPanels
        values={form.bio}
        hiddenFields={hiddenBioFields}
        onManualUnitSelect={onManualUnitLock}
        onChangeField={onSetBioField}
      />
    </div>
  );
}
