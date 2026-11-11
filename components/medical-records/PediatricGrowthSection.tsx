'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Baby, Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import type { LabResultEntry, PatientInfo } from '@/lib/types';
import {
  ensureRecordProfilePrefix,
  getVietnamDateStr,
  normalizeDateStr,
} from '@/lib/config';
import {
  computeAgeMonthsFromBirthDate,
  evaluatePediatricGrowth,
  formatAgeMonthsLabel,
  getWhoGrowthTable,
} from '@/lib/pediatricGrowthStandards';
import { fmtDateShort, parseOptionalNumber } from './labRecordsUtils';
import {
  PediatricGrowthChartCard,
  type GrowthChartPoint,
} from './PediatricGrowthChartCard';

export interface PediatricGrowthSectionProps {
  growthEntries: LabResultEntry[];
  patientInfo?: PatientInfo;
  profileId?: string;
  todayStr?: string;
  patientDisplayName: string;
  defaultRecorder: string;
  onSaveLabResult: (entry: LabResultEntry) => Promise<void>;
  onDeleteLabResult: (id: string) => Promise<void>;
  onUpdatePatientInfo?: (info: PatientInfo) => void;
}

export function PediatricGrowthSection({
  growthEntries,
  patientInfo,
  profileId,
  todayStr,
  patientDisplayName,
  defaultRecorder,
  onSaveLabResult,
  onDeleteLabResult,
  onUpdatePatientInfo,
}: PediatricGrowthSectionProps) {
  const defaultDate = todayStr || getVietnamDateStr();
  const [gender, setGender] = useState<'male' | 'female'>(
    patientInfo?.gender === 'female' ? 'female' : 'male'
  );
  const [birthDate, setBirthDate] = useState<string>(patientInfo?.birthDate || '');
  const [metricTab, setMetricTab] = useState<'weight' | 'height'>('weight');
  const [maxChartMonth, setMaxChartMonth] = useState<60 | 180>(60);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [measureDate, setMeasureDate] = useState<string>(defaultDate);
  const [ageMonthsInput, setAgeMonthsInput] = useState<string>('12');
  const [weightInput, setWeightInput] = useState<string>('');
  const [heightInput, setHeightInput] = useState<string>('');
  const [headInput, setHeadInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (patientInfo?.gender) setGender(patientInfo.gender);
    if (patientInfo?.birthDate) setBirthDate(patientInfo.birthDate);
  }, [patientInfo?.gender, patientInfo?.birthDate]);

  useEffect(() => {
    if (editingId) return;
    const computed = computeAgeMonthsFromBirthDate(birthDate, measureDate);
    if (computed !== null) {
      setAgeMonthsInput(String(computed));
      if (computed > 60) setMaxChartMonth(180);
    }
  }, [birthDate, measureDate, editingId]);

  const sortedDesc = useMemo(() => {
    return [...growthEntries]
      .filter((e) => Boolean(e.pediatricGrowth))
      .sort((a, b) => normalizeDateStr(b.date).localeCompare(normalizeDateStr(a.date)));
  }, [growthEntries]);

  const latestGrowth = sortedDesc[0] || null;
  const latestEval = useMemo(() => {
    if (!latestGrowth?.pediatricGrowth) return null;
    const g = latestGrowth.pediatricGrowth;
    return evaluatePediatricGrowth(
      g.ageMonths,
      g.gender || gender,
      g.weightKg,
      g.heightCm
    );
  }, [latestGrowth, gender]);

  const chartData = useMemo(() => {
    const anchors = getWhoGrowthTable(gender).filter((a) => a.ageMonths <= maxChartMonth);
    const pointMap = new Map<number, GrowthChartPoint>();

    for (const a of anchors) {
      pointMap.set(a.ageMonths, {
        ageMonths: a.ageMonths,
        minus2SD: metricTab === 'weight' ? a.weightMinus2SD : a.heightMinus2SD,
        median: metricTab === 'weight' ? a.weightMedian : a.heightMedian,
        plus2SD: metricTab === 'weight' ? a.weightPlus2SD : a.heightPlus2SD,
      });
    }

    for (const item of [...sortedDesc].reverse()) {
      const g = item.pediatricGrowth;
      if (!g || g.ageMonths > maxChartMonth) continue;
      const roundedMonth = Math.round(g.ageMonths * 10) / 10;
      const existing = pointMap.get(roundedMonth) || { ageMonths: roundedMonth };
      pointMap.set(roundedMonth, {
        ...existing,
        childWeight: g.weightKg ?? existing.childWeight,
        childHeight: g.heightCm ?? existing.childHeight,
        dateLabel: fmtDateShort(item.date),
      });
    }

    return Array.from(pointMap.values()).sort((a, b) => a.ageMonths - b.ageMonths);
  }, [gender, maxChartMonth, metricTab, sortedDesc]);

  const resetForm = () => {
    setEditingId(null);
    setMeasureDate(defaultDate);
    const computed = computeAgeMonthsFromBirthDate(birthDate, defaultDate);
    setAgeMonthsInput(computed !== null ? String(computed) : '12');
    setWeightInput('');
    setHeightInput('');
    setHeadInput('');
    setNoteInput('');
  };

  const handleEdit = (entry: LabResultEntry) => {
    const g = entry.pediatricGrowth;
    if (!g) return;
    setEditingId(entry.id);
    setMeasureDate(normalizeDateStr(entry.date) || defaultDate);
    setAgeMonthsInput(String(g.ageMonths));
    setGender(g.gender || gender);
    setWeightInput(g.weightKg !== undefined ? String(g.weightKg) : '');
    setHeightInput(g.heightCm !== undefined ? String(g.heightCm) : '');
    setHeadInput(
      g.headCircumferenceCm !== undefined ? String(g.headCircumferenceCm) : ''
    );
    setNoteInput(g.note || '');
  };

  const handleSaveBirthMeta = (nextBirth: string, nextGender: 'male' | 'female') => {
    setBirthDate(nextBirth);
    setGender(nextGender);
    if (patientInfo && onUpdatePatientInfo) {
      onUpdatePatientInfo({
        ...patientInfo,
        birthDate: nextBirth || undefined,
        gender: nextGender,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ageMonths = Math.max(0, Math.min(216, parseOptionalNumber(ageMonthsInput) ?? 0));
    const weightKg = parseOptionalNumber(weightInput);
    const heightCm = parseOptionalNumber(heightInput);
    const headCircumferenceCm = parseOptionalNumber(headInput);

    if (weightKg === undefined && heightCm === undefined) return;
    if (ageMonths > 60) setMaxChartMonth(180);

    const rawId = editingId || `growth-${Date.now()}`;
    const entry: LabResultEntry = {
      id: ensureRecordProfilePrefix(rawId, profileId),
      date: normalizeDateStr(measureDate) || defaultDate,
      recordedBy: defaultRecorder,
      recordKind: 'pediatric_growth',
      doctorAdvice: noteInput.trim() || undefined,
      pediatricGrowth: {
        ageMonths,
        gender,
        weightKg,
        heightCm,
        headCircumferenceCm,
        note: noteInput.trim() || undefined,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await onSaveLabResult(entry);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-2xl bg-surface-card border border-border-card p-4 sm:p-5 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-extrabold">
            <Baby className="w-3.5 h-3.5 text-teal-700" />
            <span>Chuẩn Tăng Trưởng Trẻ Em WHO</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            Biểu Đồ Chiều Cao &amp; Cân Nặng Của {patientDisplayName}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Đối chiếu trực tiếp với đường chuẩn trung vị (Median) và ngưỡng -2SD / +2SD của WHO
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => handleSaveBirthMeta(birthDate, 'male')}
              className={`min-h-[48px] min-w-[48px] px-3 rounded-lg text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                gender === 'male'
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              👦 Bé trai
            </button>
            <button
              type="button"
              onClick={() => handleSaveBirthMeta(birthDate, 'female')}
              className={`min-h-[48px] min-w-[48px] px-3 rounded-lg text-xs sm:text-sm font-extrabold transition cursor-pointer ${
                gender === 'female'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              👧 Bé gái
            </button>
          </div>

          <label className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 min-h-[48px]">
            <span className="text-xs font-bold text-slate-600 shrink-0">Ngày sinh:</span>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => handleSaveBirthMeta(e.target.value, gender)}
              className="text-xs sm:text-sm font-extrabold text-slate-900 bg-transparent focus:outline-none"
            />
          </label>
        </div>
      </div>

      <PediatricGrowthChartCard
        latestGrowth={latestGrowth}
        latestEval={latestEval}
        chartData={chartData}
        metricTab={metricTab}
        onChangeMetricTab={setMetricTab}
        maxChartMonth={maxChartMonth}
        onChangeMaxChartMonth={setMaxChartMonth}
        patientDisplayName={patientDisplayName}
      />

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-teal-200 bg-teal-50/40 p-3.5 sm:p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-black text-teal-950 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-teal-700" />
            <span>
              {editingId
                ? 'Cập nhật mốc đo tăng trưởng'
                : `Ghi số đo Cân nặng & Chiều cao mới cho ${patientDisplayName}`}
            </span>
          </span>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="min-h-[44px] px-3 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Huỷ sửa</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ngày đo</label>
            <input
              type="date"
              value={measureDate}
              onChange={(e) => setMeasureDate(e.target.value)}
              className="w-full min-h-[48px] px-2.5 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tháng tuổi</label>
            <input
              type="number"
              step="0.5"
              min={0}
              max={216}
              value={ageMonthsInput}
              onChange={(e) => setAgeMonthsInput(e.target.value)}
              placeholder="VD: 18"
              className="w-full min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-base font-black text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Cân nặng (kg)</label>
            <input
              type="number"
              step="0.1"
              min={1}
              max={120}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="VD: 11.5"
              className="w-full min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-base font-black text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Chiều cao (cm)</label>
            <input
              type="number"
              step="0.1"
              min={35}
              max={200}
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
              placeholder="VD: 82.5"
              className="w-full min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-base font-black text-slate-900"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold text-slate-700 mb-1">Vòng đầu (cm)</label>
            <input
              type="number"
              step="0.1"
              min={25}
              max={65}
              value={headInput}
              onChange={(e) => setHeadInput(e.target.value)}
              placeholder="Tuỳ chọn"
              className="w-full min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Ghi chú thêm (VD: Bé ăn tốt, mới mọc thêm 2 răng sữa...)"
            className="flex-1 min-h-[48px] px-3.5 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900"
          />
          <button
            type="submit"
            disabled={isSaving || (!weightInput.trim() && !heightInput.trim())}
            className="min-h-[48px] min-w-[48px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white text-sm sm:text-base font-extrabold flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>
              {isSaving ? 'Đang lưu...' : editingId ? 'Cập nhật số đo' : 'Lưu mốc tăng trưởng'}
            </span>
          </button>
        </div>
      </form>

      {sortedDesc.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-700">
            Nhật ký các mốc đo đã lưu ({sortedDesc.length} lần)
          </h4>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {sortedDesc.map((item) => {
              const g = item.pediatricGrowth!;
              return (
                <div
                  key={item.id}
                  className="p-3 flex items-center justify-between gap-2 flex-wrap"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap text-sm font-extrabold text-slate-900">
                      <span>📅 {fmtDateShort(item.date)}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">
                        {formatAgeMonthsLabel(g.ageMonths)}
                      </span>
                      {g.weightKg !== undefined && (
                        <span className="text-teal-800">⚖️ {g.weightKg} kg</span>
                      )}
                      {g.heightCm !== undefined && (
                        <span className="text-cyan-800">📏 {g.heightCm} cm</span>
                      )}
                      {g.headCircumferenceCm !== undefined && (
                        <span className="text-slate-600 text-xs">
                          Vòng đầu {g.headCircumferenceCm} cm
                        </span>
                      )}
                    </div>
                    {g.note && <p className="text-xs text-slate-600">📝 {g.note}</p>}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      aria-label="Sửa mốc đo"
                      className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteLabResult(item.id)}
                      aria-label="Xoá mốc đo"
                      className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 text-rose-600 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default PediatricGrowthSection;
