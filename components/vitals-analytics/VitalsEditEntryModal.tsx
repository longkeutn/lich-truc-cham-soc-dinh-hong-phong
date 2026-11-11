'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Edit3, Save, X } from 'lucide-react';
import type {
  VitalsLogEntry,
  VitalsPeriod,
  BpThresholds,
  FamilyMember,
  HealthProfileType,
} from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  computeAlertLevel,
  evaluateVitalReading,
  normalizeDateStr,
  normalizeTimeStr,
  getQuickNoteTagsForProfile,
  isQuickNoteTagSelected,
  toggleQuickNoteTag,
} from '@/lib/config';
import { ALL_SLOTS } from './vitalsAnalyticsTypes';

interface VitalsEditEntryModalProps {
  entry: VitalsLogEntry | null;
  bpThresholds: BpThresholds;
  patientName: string;
  profileType: HealthProfileType;
  members: FamilyMember[];
  defaultRecorder: string;
  onClose: () => void;
  onSaveVitals: (updated: VitalsLogEntry) => Promise<void>;
}

export function VitalsEditEntryModal({
  entry,
  bpThresholds,
  patientName,
  profileType,
  members,
  defaultRecorder,
  onClose,
  onSaveVitals,
}: VitalsEditEntryModalProps) {
  const [editSys, setEditSys] = useState('');
  const [editDia, setEditDia] = useState('');
  const [editPulse, setEditPulse] = useState('');
  const [editPeriod, setEditPeriod] = useState<VitalsPeriod>('morning');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editRecordedBy, setEditRecordedBy] = useState(defaultRecorder);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setEditSys(String(entry.sys));
    setEditDia(String(entry.dia));
    setEditPulse(entry.pulse ? String(entry.pulse) : '');
    setEditPeriod(entry.period || 'morning');
    setEditDate(normalizeDateStr(entry.date));
    setEditTime(normalizeTimeStr(entry.time));
    setEditNote(entry.note || '');
    setEditRecordedBy(entry.recordedBy || defaultRecorder);
  }, [entry, defaultRecorder]);

  const liveEval = useMemo(() => {
    const s = Number(editSys);
    const d = Number(editDia);
    const p = editPulse.trim() ? Number(editPulse) : undefined;
    if (!s || !d || s < 40 || d < 25) return null;
    return evaluateVitalReading({ sys: s, dia: d, pulse: p }, bpThresholds, patientName);
  }, [editSys, editDia, editPulse, bpThresholds, patientName]);

  const quickTags = useMemo(() => getQuickNoteTagsForProfile(profileType), [profileType]);

  if (!entry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sysNum = Number(editSys);
    const diaNum = Number(editDia);
    const pulseNum = editPulse.trim() ? Number(editPulse) : undefined;
    if (!sysNum || !diaNum || isSavingEdit) return;

    setIsSavingEdit(true);
    try {
      const updated: VitalsLogEntry = {
        ...entry,
        date: normalizeDateStr(editDate) || entry.date,
        time: normalizeTimeStr(editTime) || entry.time,
        period: editPeriod,
        sys: sysNum,
        dia: diaNum,
        pulse: pulseNum && pulseNum > 0 ? pulseNum : undefined,
        note: editNote.trim() || undefined,
        recordedBy: editRecordedBy.trim() || defaultRecorder,
        alertLevel: computeAlertLevel(sysNum, diaNum, bpThresholds, pulseNum),
      };
      await onSaveVitals(updated);
      onClose();
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-surface-card rounded-3xl border border-border-card shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-medical-primary text-white flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            Chỉnh Sửa Lần Đo Huyết Áp
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {liveEval && (
            <div
              className={`rounded-2xl border p-3.5 text-base ${liveEval.colors.bg} ${liveEval.colors.border}`}
            >
              <div className={`font-black ${liveEval.colors.text}`}>{liveEval.badgeText}</div>
              <div className="text-text-body mt-0.5 leading-relaxed">{liveEval.clinicalAdvice}</div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-sm sm:text-base font-extrabold text-text-body mb-1">
                Số trên (SYS) *
              </label>
              <input
                type="number"
                inputMode="numeric"
                required
                min={50}
                max={260}
                value={editSys}
                onChange={(e) => setEditSys(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-xl font-black text-text-main focus:outline-none focus:ring-2 focus:ring-medical-primary"
              />
            </div>
            <div>
              <label className="block text-sm sm:text-base font-extrabold text-text-body mb-1">
                Số dưới (DIA) *
              </label>
              <input
                type="number"
                inputMode="numeric"
                required
                min={30}
                max={180}
                value={editDia}
                onChange={(e) => setEditDia(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-xl font-black text-text-main focus:outline-none focus:ring-2 focus:ring-medical-primary"
              />
            </div>
            <div>
              <label className="block text-sm sm:text-base font-extrabold text-text-body mb-1">
                Mạch (bpm)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={30}
                max={220}
                value={editPulse}
                onChange={(e) => setEditPulse(e.target.value)}
                placeholder="VD: 72"
                className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-xl font-black text-text-main focus:outline-none focus:ring-2 focus:ring-medical-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-sm sm:text-base font-extrabold text-text-body mb-1">
                Ngày đo
              </label>
              <input
                type="date"
                required
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main"
              />
            </div>
            <div>
              <label className="block text-sm sm:text-base font-extrabold text-text-body mb-1">
                Giờ đo
              </label>
              <input
                type="time"
                required
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm sm:text-base font-extrabold text-text-body mb-1.5">
              Buổi trong ngày
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {ALL_SLOTS.map((slot) => {
                const cfg = TIME_SLOT_CONFIG[slot];
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setEditPeriod(slot)}
                    className={`min-h-[48px] min-w-[48px] px-2.5 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                      editPeriod === slot
                        ? 'bg-medical-primary text-white border-medical-dark'
                        : 'bg-slate-50 text-text-body border-border-card hover:bg-slate-100'
                    }`}
                  >
                    {cfg.emoji} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm sm:text-base font-extrabold text-text-body mb-1">
              Người ghi
            </label>
            {members.length > 0 ? (
              <select
                value={editRecordedBy}
                onChange={(e) => setEditRecordedBy(e.target.value)}
                className="w-full min-h-[48px] min-w-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.relation})
                  </option>
                ))}
                {!members.some((m) => m.name === editRecordedBy) && editRecordedBy && (
                  <option value={editRecordedBy}>{editRecordedBy}</option>
                )}
              </select>
            ) : (
              <input
                type="text"
                value={editRecordedBy}
                onChange={(e) => setEditRecordedBy(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main"
              />
            )}
          </div>

          <div>
            <label className="block text-sm sm:text-base font-extrabold text-text-body mb-1.5">
              Ghi chú triệu chứng nhanh
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {quickTags.map((tag) => {
                const selected = isQuickNoteTagSelected(editNote, tag.value);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setEditNote(toggleQuickNoteTag(editNote, tag.value))}
                    className={`min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl text-sm font-bold border transition cursor-pointer ${
                      selected
                        ? 'bg-teal-100 text-medical-dark border-teal-400 font-extrabold'
                        : 'bg-slate-50 text-text-body border-border-card hover:bg-slate-100'
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
            <textarea
              rows={2}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Ghi chú thêm (nếu có)..."
              className="w-full p-3 rounded-xl border border-border-card text-base text-text-main"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-body text-base font-extrabold cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="min-h-[48px] min-w-[48px] px-5 py-2.5 rounded-xl bg-medical-primary hover:bg-medical-dark text-white text-base font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VitalsEditEntryModal;
