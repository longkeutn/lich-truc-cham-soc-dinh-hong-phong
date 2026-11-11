'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Syringe, Trash2 } from 'lucide-react';
import type { LabResultEntry } from '@/lib/types';
import {
  ensureRecordProfilePrefix,
  getVietnamDateStr,
  normalizeDateStr,
} from '@/lib/config';
import {
  PEDIATRIC_VACCINE_CATALOG,
  type PediatricVaccineTemplate,
} from '@/lib/vaccineScheduleConfig';
import { fmtDateShort } from './labRecordsUtils';
import { ChildVaccineTemplateCard } from './ChildVaccineTemplateCard';

export interface ChildVaccineSectionProps {
  vaccineEntries: LabResultEntry[];
  profileId?: string;
  todayStr?: string;
  patientDisplayName: string;
  defaultRecorder: string;
  onSaveLabResult: (entry: LabResultEntry) => Promise<void>;
  onDeleteLabResult: (id: string) => Promise<void>;
}

export function ChildVaccineSection({
  vaccineEntries,
  profileId,
  todayStr,
  patientDisplayName,
  defaultRecorder,
  onSaveLabResult,
  onDeleteLabResult,
}: ChildVaccineSectionProps) {
  const defaultDate = todayStr || getVietnamDateStr();
  const [filterTab, setFilterTab] = useState<'all' | 'tcmr' | 'service'>('all');
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [statusInput, setStatusInput] = useState<'completed' | 'scheduled'>('completed');
  const [dateInput, setDateInput] = useState<string>(defaultDate);
  const [nextDueInput, setNextDueInput] = useState<string>('');
  const [facilityInput, setFacilityInput] = useState<string>('VNVC');
  const [reactionInput, setReactionInput] = useState<string>('');
  const [customVaccineOpen, setCustomVaccineOpen] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customDose, setCustomDose] = useState<string>('1');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const savedByCode = useMemo(() => {
    const map = new Map<string, LabResultEntry>();
    for (const entry of vaccineEntries) {
      if (entry.pediatricVaccine?.vaccineCode) {
        map.set(entry.pediatricVaccine.vaccineCode, entry);
      }
    }
    return map;
  }, [vaccineEntries]);

  const customSavedEntries = useMemo(() => {
    const catalogCodes = new Set(PEDIATRIC_VACCINE_CATALOG.map((c) => c.code));
    return vaccineEntries.filter(
      (e) => e.pediatricVaccine && !catalogCodes.has(e.pediatricVaccine.vaccineCode)
    );
  }, [vaccineEntries]);

  const stats = useMemo(() => {
    let completed = 0;
    let scheduled = 0;
    for (const e of vaccineEntries) {
      if (e.pediatricVaccine?.status === 'completed') completed++;
      else if (e.pediatricVaccine?.status === 'scheduled') scheduled++;
    }
    const upcomingSoon = vaccineEntries
      .filter(
        (e) =>
          e.pediatricVaccine?.nextDueDate &&
          normalizeDateStr(e.pediatricVaccine.nextDueDate) >= defaultDate
      )
      .sort((a, b) =>
        normalizeDateStr(a.pediatricVaccine?.nextDueDate || '').localeCompare(
          normalizeDateStr(b.pediatricVaccine?.nextDueDate || '')
        )
      )[0];
    return {
      completed,
      scheduled,
      totalCatalog: PEDIATRIC_VACCINE_CATALOG.length,
      upcomingSoon,
    };
  }, [vaccineEntries, defaultDate]);

  const visibleCatalog = useMemo(() => {
    if (filterTab === 'all') return PEDIATRIC_VACCINE_CATALOG;
    return PEDIATRIC_VACCINE_CATALOG.filter((item) => item.category === filterTab);
  }, [filterTab]);

  const openEditorForTemplate = (tpl: PediatricVaccineTemplate) => {
    const existing = savedByCode.get(tpl.code);
    setActiveCode(tpl.code);
    setStatusInput(
      existing?.pediatricVaccine?.status === 'scheduled' ? 'scheduled' : 'completed'
    );
    setDateInput(existing ? normalizeDateStr(existing.date) || defaultDate : defaultDate);
    setNextDueInput(existing?.pediatricVaccine?.nextDueDate || '');
    setFacilityInput(existing?.facility || 'VNVC');
    setReactionInput(existing?.pediatricVaccine?.reactionNote || '');
  };

  const handleSaveTemplateVaccine = async (tpl: PediatricVaccineTemplate) => {
    const existing = savedByCode.get(tpl.code);
    const rawId = existing?.id || `vac-${tpl.code}`;
    const entry: LabResultEntry = {
      id: ensureRecordProfilePrefix(rawId, profileId),
      date: normalizeDateStr(dateInput) || defaultDate,
      facility: facilityInput.trim() || undefined,
      recordedBy: defaultRecorder,
      recordKind: 'pediatric_vaccine',
      doctorAdvice: reactionInput.trim() || undefined,
      pediatricVaccine: {
        vaccineCode: tpl.code,
        vaccineName: tpl.name,
        doseNumber: tpl.doseNumber,
        category: tpl.category,
        status: statusInput,
        recommendedAgeLabel: tpl.recommendedAgeLabel,
        nextDueDate: nextDueInput ? normalizeDateStr(nextDueInput) : undefined,
        reactionNote: reactionInput.trim() || undefined,
      },
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await onSaveLabResult(entry);
      setActiveCode(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCustomVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const code = `custom_${Date.now().toString(36)}`;
    const entry: LabResultEntry = {
      id: ensureRecordProfilePrefix(`vac-${code}`, profileId),
      date: normalizeDateStr(dateInput) || defaultDate,
      facility: facilityInput.trim() || undefined,
      recordedBy: defaultRecorder,
      recordKind: 'pediatric_vaccine',
      pediatricVaccine: {
        vaccineCode: code,
        vaccineName: customName.trim(),
        doseNumber: Math.max(1, parseInt(customDose, 10) || 1),
        category: 'service',
        status: statusInput,
        nextDueDate: nextDueInput ? normalizeDateStr(nextDueInput) : undefined,
        reactionNote: reactionInput.trim() || undefined,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await onSaveLabResult(entry);
      setCustomName('');
      setCustomVaccineOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-2xl bg-surface-card border border-border-card p-4 sm:p-5 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-extrabold">
            <Syringe className="w-3.5 h-3.5 text-emerald-700" />
            <span>Sổ Tiêm Chủng Điện Tử</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            Lịch Tiêm Vắc Xin Mở Rộng &amp; Dịch Vụ ({patientDisplayName})
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Theo dõi các mũi bắt buộc TCMR, vắc xin dịch vụ và nhắc lịch hẹn mũi kế tiếp
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCustomVaccineOpen((prev) => !prev)}
          className="min-h-[48px] min-w-[48px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>{customVaccineOpen ? 'Đóng form thêm mũi' : 'Thêm mũi tiêm ngoài danh mục'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200">
          <span className="text-xs font-bold text-emerald-800 block">Đã hoàn thành</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-950">
            {stats.completed} <small className="text-xs font-bold">mũi tiêm</small>
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200">
          <span className="text-xs font-bold text-amber-900 block">Đã đặt lịch hẹn</span>
          <span className="text-xl sm:text-2xl font-black text-amber-950">
            {stats.scheduled} <small className="text-xs font-bold">mũi sắp tới</small>
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-sky-50/80 border border-sky-200">
          <span className="text-xs font-bold text-sky-900 block">Lịch hẹn mũi kế tiếp</span>
          <span className="text-sm font-black text-slate-900 block mt-0.5 truncate">
            {stats.upcomingSoon?.pediatricVaccine?.nextDueDate
              ? `📅 ${fmtDateShort(stats.upcomingSoon.pediatricVaccine.nextDueDate)} · ${stats.upcomingSoon.pediatricVaccine.vaccineName}`
              : 'Chưa có lịch hẹn mới'}
          </span>
        </div>
      </div>

      {customVaccineOpen && (
        <form
          onSubmit={handleAddCustomVaccine}
          className="rounded-2xl border border-teal-300 bg-teal-50/50 p-3.5 space-y-3"
        >
          <div className="text-sm font-black text-teal-950">
            ➕ Ghi nhận thêm vắc xin nhắc lại / vắc xin dịch vụ khác
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <input
              type="text"
              required
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Tên vắc xin (VD: Cúm mùa năm 2026)"
              className="sm:col-span-2 min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
            />
            <input
              type="number"
              min={1}
              max={10}
              value={customDose}
              onChange={(e) => setCustomDose(e.target.value)}
              placeholder="Mũi số"
              className="min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
            />
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={facilityInput}
              onChange={(e) => setFacilityInput(e.target.value)}
              placeholder="Cơ sở tiêm (VNVC, Long Châu...)"
              className="flex-1 min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900"
            />
            <input
              type="text"
              value={reactionInput}
              onChange={(e) => setReactionInput(e.target.value)}
              placeholder="Phản ứng sau tiêm (Bình thường / Sốt nhẹ...)"
              className="flex-1 min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[48px] min-w-[48px] px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-extrabold cursor-pointer"
            >
              Lưu mũi tiêm
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { id: 'all', label: `Tất cả (${PEDIATRIC_VACCINE_CATALOG.length})` },
          { id: 'tcmr', label: '🛡️ Tiêm chủng mở rộng (Bắt buộc)' },
          { id: 'service', label: '💉 Vắc xin dịch vụ' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilterTab(t.id as 'all' | 'tcmr' | 'service')}
            className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold border transition cursor-pointer ${
              filterTab === t.id
                ? 'bg-teal-700 text-white border-teal-800'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {visibleCatalog.map((tpl) => (
          <ChildVaccineTemplateCard
            key={tpl.code}
            template={tpl}
            saved={savedByCode.get(tpl.code)}
            isEditing={activeCode === tpl.code}
            isSaving={isSaving}
            statusInput={statusInput}
            dateInput={dateInput}
            facilityInput={facilityInput}
            nextDueInput={nextDueInput}
            reactionInput={reactionInput}
            onChangeStatus={setStatusInput}
            onChangeDate={setDateInput}
            onChangeFacility={setFacilityInput}
            onChangeNextDue={setNextDueInput}
            onChangeReaction={setReactionInput}
            onToggleEditor={() =>
              activeCode === tpl.code ? setActiveCode(null) : openEditorForTemplate(tpl)
            }
            onSaveTemplate={() => void handleSaveTemplateVaccine(tpl)}
            onDeleteSaved={(id) => void onDeleteLabResult(id)}
          />
        ))}
      </div>

      {customSavedEntries.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-700">
            Mũi tiêm bổ sung ngoài danh mục ({customSavedEntries.length})
          </h4>
          {customSavedEntries.map((item) => {
            const v = item.pediatricVaccine!;
            return (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
              >
                <div className="text-sm">
                  <span className="font-extrabold text-slate-900">
                    💉 {v.vaccineName} (Mũi {v.doseNumber})
                  </span>
                  <span className="text-xs font-bold text-slate-600 ml-2">
                    · Ngày {fmtDateShort(item.date)}
                    {item.facility ? ` · ${item.facility}` : ''}
                  </span>
                  {v.reactionNote && (
                    <p className="text-xs text-slate-600 mt-0.5">📝 {v.reactionNote}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void onDeleteLabResult(item.id)}
                  aria-label="Xoá mũi tiêm bổ sung"
                  className="min-h-[48px] min-w-[48px] rounded-xl bg-white border border-slate-200 text-rose-600 flex items-center justify-center cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ChildVaccineSection;
