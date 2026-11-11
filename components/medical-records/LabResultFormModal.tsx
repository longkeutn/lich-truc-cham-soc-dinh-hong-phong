'use client';

import React, { useState, useEffect } from 'react';
import { Check, FlaskConical, X } from 'lucide-react';
import type {
  LabResultEntry,
  HealthProfileType,
  TshTargetLevel,
  FamilyMember,
} from '@/lib/types';
import { evaluateLabEntry } from '@/lib/config';
import { QUICK_DOSES, QUICK_FACILITIES } from './labRecordsUtils';
import {
  LabFormPanels,
  LabMetricInput,
  LabUnitMetricField,
} from './LabFormPanels';
import {
  createInitialLabFormState,
  buildLabEntryFromFormState,
  type LabFullFormState,
} from './labFormState';

interface LabResultFormModalProps {
  isOpen: boolean;
  editingEntry: LabResultEntry | null;
  latestLab: LabResultEntry | null;
  profileId?: string;
  profileType: HealthProfileType;
  patientName: string;
  members: FamilyMember[];
  defaultRecorder: string;
  onClose: () => void;
  onSaveLabResult: (entry: LabResultEntry) => Promise<void>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
}

export function LabResultFormModal({
  isOpen,
  editingEntry,
  latestLab,
  profileId,
  profileType,
  patientName,
  members,
  defaultRecorder,
  onClose,
  onSaveLabResult,
  showToast,
}: LabResultFormModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<LabFullFormState>(() =>
    createInitialLabFormState({
      editingEntry,
      latestLab,
      defaultRecorder,
      profileType,
    })
  );

  useEffect(() => {
    if (!isOpen) return;
    setForm(
      createInitialLabFormState({
        editingEntry,
        latestLab,
        defaultRecorder,
        profileType,
      })
    );
  }, [isOpen, editingEntry, latestLab, defaultRecorder, profileType]);

  if (!isOpen) return null;

  const setField = <K extends keyof LabFullFormState>(
    key: K,
    value: LabFullFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || isSaving) return;

    const entry = buildLabEntryFromFormState({
      state: form,
      editingEntry,
      profileId,
      defaultRecorder,
    });

    const evalCheck = evaluateLabEntry(entry, profileType);
    if (
      evalCheck.indicators.length === 0 &&
      (!entry.customLabs || entry.customLabs.length === 0) &&
      !entry.levothyroxineDose &&
      !entry.symptoms &&
      !entry.doctorAdvice
    ) {
      showToast(
        'Vui lòng nhập ít nhất 1 chỉ số xét nghiệm, liều thuốc hoặc triệu chứng.',
        'warn'
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSaveLabResult(entry);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-surface-card rounded-3xl border border-border-card shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-teal-900 to-teal-800 text-white flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-amber-300 shrink-0" />
              {editingEntry ? 'Cập Nhật Kết Quả Xét Nghiệm' : 'Nhập Kết Quả Xét Nghiệm Mới'} ·{' '}
              {patientName}
            </h3>
            <p className="text-sm text-teal-100 mt-0.5">
              Chỉ cần điền những chỉ số có trên phiếu xét nghiệm (ô trống sẽ tự động bỏ qua)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Thông tin đợt khám */}
          <div className="rounded-2xl border border-border-card bg-slate-50/70 p-3.5 sm:p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-base font-extrabold text-text-body mb-1">
                  Ngày xét nghiệm *
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setField('date', e.target.value)}
                  className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
                />
              </div>
              <div>
                <label className="block text-base font-extrabold text-text-body mb-1">
                  Bệnh viện / Cơ sở khám
                </label>
                <input
                  type="text"
                  value={form.facility}
                  onChange={(e) => setField('facility', e.target.value)}
                  placeholder="VD: BV Nội Tiết TW, Medlatec..."
                  className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
                />
              </div>
              <div>
                <label className="block text-base font-extrabold text-text-body mb-1">
                  Người nhập
                </label>
                {members.length > 0 ? (
                  <select
                    value={form.recordedBy}
                    onChange={(e) => setField('recordedBy', e.target.value)}
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
                    onChange={(e) => setField('recordedBy', e.target.value)}
                    className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
                  />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-sm font-bold text-text-body">
                Chọn nhanh bệnh viện / nơi khám:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {QUICK_FACILITIES.map((fac) => (
                  <button
                    key={fac}
                    type="button"
                    onClick={() => setField('facility', fac)}
                    className={`min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl text-sm font-bold border transition cursor-pointer ${
                      form.facility === fac
                        ? 'bg-medical-primary text-white border-medical-dark font-extrabold shadow-2xs'
                        : 'bg-surface-card hover:bg-medical-surface text-text-body border-border-card'
                    }`}
                  >
                    {fac}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Nhóm 1 & 2: Tuyến giáp & Markers */}
          <div className="rounded-2xl border border-indigo-200 bg-thyroid-bg/40 p-3.5 sm:p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-base font-black text-indigo-950 uppercase">
                🦋 Nhóm 1 &amp; 2: Tuyến Giáp, Liều Hormone &amp; Markers K Giáp
              </h4>
              <select
                value={form.tshTargetLevel}
                onChange={(e) => setField('tshTargetLevel', e.target.value as TshTargetLevel)}
                className="min-h-[48px] min-w-[48px] px-3 rounded-xl border border-indigo-200 bg-surface-card text-sm sm:text-base font-extrabold text-indigo-950"
              >
                <option value="high_risk">Đích ức chế cao: TSH &lt; 0.1 µIU/mL</option>
                <option value="moderate_risk">Đích ức chế vừa: TSH 0.1 - 0.5 µIU/mL</option>
                <option value="normal">Bình thường chung: TSH 0.4 - 4.0 µIU/mL</option>
              </select>
            </div>

            <div>
              <label className="block text-base font-extrabold text-text-body mb-1">
                💊 Liều thuốc Levothyroxine đang uống
              </label>
              <input
                type="text"
                value={form.levothyroxineDose}
                onChange={(e) => setField('levothyroxineDose', e.target.value)}
                placeholder="VD: 100mcg hoặc 100x5, 50x2"
                className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_DOSES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setField('levothyroxineDose', d)}
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

            {/* 4 chỉ số hormone có bộ chuyển đổi đơn vị chuẩn y khoa VN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <LabUnitMetricField
                label="FT4 (Thyroxine tự do)"
                value={form.ft4}
                onChange={(v) => setField('ft4', v)}
                unit={form.ft4Unit}
                options={['pmol/L', 'ng/dL']}
                onUnitChange={(u) => setField('ft4Unit', u)}
                placeholder={form.ft4Unit === 'pmol/L' ? 'VD: 18.5' : 'VD: 1.45'}
                refHint={form.ft4Unit === 'pmol/L' ? '12.0 - 22.0 pmol/L' : '0.93 - 1.70 ng/dL'}
              />
              <LabUnitMetricField
                label="FT3 (Triiodothyronine tự do)"
                value={form.ft3}
                onChange={(v) => setField('ft3', v)}
                unit={form.ft3Unit}
                options={['pg/mL', 'pmol/L']}
                onUnitChange={(u) => setField('ft3Unit', u)}
                placeholder={form.ft3Unit === 'pg/mL' ? 'VD: 3.1' : 'VD: 4.8'}
                refHint={form.ft3Unit === 'pg/mL' ? '2.0 - 4.4 pg/mL' : '3.1 - 6.8 pmol/L'}
              />
              <LabUnitMetricField
                label="T3 toàn phần"
                value={form.t3}
                onChange={(v) => setField('t3', v)}
                unit={form.t3Unit}
                options={['nmol/L', 'ng/dL']}
                onUnitChange={(u) => setField('t3Unit', u)}
                placeholder={form.t3Unit === 'nmol/L' ? 'VD: 1.54' : 'VD: 110'}
                refHint={form.t3Unit === 'nmol/L' ? '1.1 - 2.8 nmol/L' : '70 - 180 ng/dL'}
              />
              <LabUnitMetricField
                label="T4 toàn phần"
                value={form.t4}
                onChange={(v) => setField('t4', v)}
                unit={form.t4Unit}
                options={['µg/dL', 'nmol/L']}
                onUnitChange={(u) => setField('t4Unit', u)}
                placeholder={form.t4Unit === 'µg/dL' ? 'VD: 8.5' : 'VD: 105'}
                refHint={form.t4Unit === 'µg/dL' ? '5.1 - 14.1 µg/dL' : '66 - 181 nmol/L'}
              />
            </div>

            {/* TSH & các dấu ấn miễn dịch / K giáp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <LabMetricInput
                label="TSH"
                subHint="µIU/mL"
                value={form.tsh}
                onChange={(v) => setField('tsh', v)}
                placeholder="VD: 0.18"
              />
              <LabMetricInput
                label="TG (Marker)"
                subHint="ng/mL"
                value={form.tg}
                onChange={(v) => setField('tg', v)}
                placeholder="VD: 0.04"
              />
              <LabMetricInput
                label="Anti-TG"
                subHint="IU/mL"
                value={form.antiTg}
                onChange={(v) => setField('antiTg', v)}
                placeholder="VD: 19.44"
              />
              <LabMetricInput
                label="Anti-TPO"
                subHint="IU/mL"
                value={form.antiTpo}
                onChange={(v) => setField('antiTpo', v)}
                placeholder="VD: 10.2"
              />
            </div>
          </div>

          {/* Nhóm 3, 4, 5, 6 */}
          <LabFormPanels
            values={form.bio}
            onChangeField={(field, value) =>
              setForm((prev) => ({ ...prev, bio: { ...prev.bio, [field]: value } }))
            }
          />

          {/* Triệu chứng & Lời dặn Bác sĩ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-base font-extrabold text-text-body mb-1">
                Triệu chứng ghi nhận lúc khám
              </label>
              <textarea
                rows={2}
                value={form.symptoms}
                onChange={(e) => setField('symptoms', e.target.value)}
                placeholder="VD: Hơi mệt, tim đập nhanh, tê nhẹ đầu ngón tay..."
                className="w-full p-3 rounded-xl border border-border-card text-base text-text-main"
              />
            </div>
            <div>
              <label className="block text-base font-extrabold text-text-body mb-1">
                Kết luận &amp; Lời dặn của Bác sĩ
              </label>
              <textarea
                rows={2}
                value={form.doctorAdvice}
                onChange={(e) => setField('doctorAdvice', e.target.value)}
                placeholder="VD: Giữ nguyên liều thuốc giáp, hẹn tái khám sau 3 tháng..."
                className="w-full p-3 rounded-xl border border-border-card text-base text-text-main"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-body text-base font-extrabold cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[48px] min-w-[48px] px-5 py-2.5 rounded-xl bg-medical-primary hover:bg-medical-dark text-white text-base font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu kết quả xét nghiệm'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LabResultFormModal;
