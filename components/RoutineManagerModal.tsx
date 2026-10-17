'use client';

import React, { useState, useMemo } from 'react';
import { Plus, X, Save, Trash2, ChevronLeft, ToggleLeft, ToggleRight, GripVertical, Pill, Dumbbell, HandHelping } from 'lucide-react';
import { CareRoutine, RehabStage, RoutineCategory, MedType, TimeSlot } from '@/lib/types';
import { TIME_SLOT_CONFIG } from '@/lib/config';

interface RoutineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  routines: CareRoutine[];
  stages: RehabStage[];
  activeStageId: string;
  onSaveRoutine: (routine: CareRoutine) => Promise<void>;
  onDeleteRoutine: (id: string) => Promise<void>;
}

// ===== Category config =====
const CATEGORY_CONFIG: Record<RoutineCategory, { label: string; emoji: string; icon: typeof Pill; color: string; pillClass: string }> = {
  meds: {
    label: 'Thuốc',
    emoji: '💊',
    icon: Pill,
    color: 'text-blue-700',
    pillClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  rehab: {
    label: 'Tập phục hồi',
    emoji: '🏃',
    icon: Dumbbell,
    color: 'text-amber-700',
    pillClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  care: {
    label: 'Chăm sóc',
    emoji: '🧹',
    icon: HandHelping,
    color: 'text-emerald-700',
    pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

// ===== Time slot pill colors =====
const TIME_SLOT_PILL_COLORS: Record<TimeSlot, string> = {
  morning: 'bg-orange-100 text-orange-800 border-orange-300',
  noon: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  afternoon: 'bg-sky-100 text-sky-800 border-sky-300',
  evening: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

const ALL_TIME_SLOTS: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];

// ===== Default form values =====
function createEmptyForm(stageId: string, stageName: string): CareRoutine {
  const now = new Date().toISOString();
  return {
    id: '',
    stageId,
    stageName,
    category: 'meds',
    medType: 'scheduled',
    title: '',
    dosage: '',
    timeSlots: [],
    instructions: '',
    conditionNote: '',
    isActive: true,
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function RoutineManagerModal({
  isOpen,
  onClose,
  routines,
  stages,
  activeStageId,
  onSaveRoutine,
  onDeleteRoutine,
}: RoutineManagerModalProps) {
  // ===== State =====
  const [selectedStageId, setSelectedStageId] = useState(activeStageId);
  const [editingRoutine, setEditingRoutine] = useState<CareRoutine | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ===== Form state =====
  const [formData, setFormData] = useState<CareRoutine>(() =>
    createEmptyForm(activeStageId, stages.find(s => s.id === activeStageId)?.name || '')
  );

  // ===== Computed: routines for selected stage, grouped by category =====
  const selectedStage = stages.find(s => s.id === selectedStageId);
  const stageRoutines = useMemo(
    () => routines.filter(r => r.stageId === selectedStageId),
    [routines, selectedStageId]
  );

  const groupedRoutines = useMemo(() => {
    const groups: Record<RoutineCategory, CareRoutine[]> = { meds: [], rehab: [], care: [] };
    stageRoutines
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(r => {
        if (groups[r.category]) groups[r.category].push(r);
      });
    return groups;
  }, [stageRoutines]);

  if (!isOpen) return null;

  // ===== Helpers =====
  const showForm = isAddingNew || editingRoutine !== null;

  const startAddNew = () => {
    const stage = stages.find(s => s.id === selectedStageId);
    setFormData(createEmptyForm(selectedStageId, stage?.name || ''));
    setIsAddingNew(true);
    setEditingRoutine(null);
    setErrorMsg('');
  };

  const startEdit = (routine: CareRoutine) => {
    setFormData({ ...routine });
    setEditingRoutine(routine);
    setIsAddingNew(false);
    setErrorMsg('');
  };

  const cancelForm = () => {
    setIsAddingNew(false);
    setEditingRoutine(null);
    setErrorMsg('');
  };

  const updateFormField = <K extends keyof CareRoutine>(key: K, value: CareRoutine[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleTimeSlot = (slot: TimeSlot) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.includes(slot)
        ? prev.timeSlots.filter(s => s !== slot)
        : [...prev.timeSlots, slot],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg('Vui lòng nhập tên thuốc / bài tập');
      return;
    }
    if (formData.timeSlots.length === 0 && formData.medType !== 'as_needed') {
      setErrorMsg('Vui lòng chọn ít nhất 1 buổi áp dụng');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const now = new Date().toISOString();
      const routineToSave: CareRoutine = {
        ...formData,
        id: formData.id || `routine-${formData.category.substring(0, 3)}-${Date.now()}`,
        updatedAt: now,
        createdAt: formData.createdAt || now,
        // Clear medType if not meds category
        medType: formData.category === 'meds' ? formData.medType : undefined,
        // Clear conditionNote if not meds
        conditionNote: formData.category === 'meds' ? formData.conditionNote : undefined,
      };
      await onSaveRoutine(routineToSave);
      cancelForm();
    } catch {
      setErrorMsg('Không thể lưu. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSaving(true);
    setErrorMsg('');
    try {
      await onDeleteRoutine(id);
      setConfirmDeleteId(null);
      if (editingRoutine?.id === id) cancelForm();
    } catch {
      setErrorMsg('Không thể xoá. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoftDelete = async (routine: CareRoutine) => {
    setIsSaving(true);
    try {
      await onSaveRoutine({ ...routine, isActive: false, updatedAt: new Date().toISOString() });
    } catch {
      setErrorMsg('Không thể tạm ngưng.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (routine: CareRoutine) => {
    setIsSaving(true);
    try {
      await onSaveRoutine({ ...routine, isActive: !routine.isActive, updatedAt: new Date().toISOString() });
    } catch {
      setErrorMsg('Không thể thay đổi trạng thái.');
    } finally {
      setIsSaving(false);
    }
  };

  // ===== Render =====
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl shadow-2xl border-0 sm:border sm:border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl backdrop-blur-sm">
              💊
            </span>
            <div>
              <h3 className="text-lg font-bold">Quản Lý Đơn Thuốc & Bài Tập</h3>
              <p className="text-xs text-violet-200">
                Thêm, sửa, tạm ngưng đầu việc chăm sóc hàng ngày
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* ===== Stage Tabs ===== */}
        {stages.length > 1 && (
          <div className="px-5 pt-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
            {stages.map(stage => (
              <button
                key={stage.id}
                onClick={() => { setSelectedStageId(stage.id); cancelForm(); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedStageId === stage.id
                    ? 'bg-violet-100 text-violet-800 border-2 border-violet-300'
                    : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                }`}
              >
                {stage.isActive && '● '}
                {stage.name}
              </button>
            ))}
          </div>
        )}

        {/* ===== Content Body ===== */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Error message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* ===== Add/Edit Form ===== */}
          {showForm && (
            <form
              onSubmit={handleSave}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in"
            >
              {/* Form header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <button type="button" onClick={cancelForm} className="hover:text-violet-600 transition">
                    <ChevronLeft size={18} />
                  </button>
                  {isAddingNew ? '➕ Thêm đầu việc mới' : `✏️ Sửa: ${editingRoutine?.title}`}
                </h4>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
                >
                  Huỷ
                </button>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Phân loại
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(CATEGORY_CONFIG) as [RoutineCategory, typeof CATEGORY_CONFIG.meds][]).map(
                    ([cat, cfg]) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => updateFormField('category', cat)}
                        className={`p-3 rounded-xl border-2 text-center transition min-h-[48px] ${
                          formData.category === cat
                            ? `${cfg.pillClass} border-current font-bold`
                            : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-lg block">{cfg.emoji}</span>
                        <span className="text-xs font-bold block mt-1">{cfg.label}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Med type toggle (only for meds) */}
              {formData.category === 'meds' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Loại thuốc
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateFormField('medType', 'scheduled')}
                      className={`p-3 rounded-xl border-2 text-center transition min-h-[48px] ${
                        formData.medType === 'scheduled'
                          ? 'border-blue-400 bg-blue-50 text-blue-800 font-bold'
                          : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600'
                      }`}
                    >
                      <span className="text-xs font-bold">🕐 Theo lịch</span>
                      <span className="text-[10px] block text-slate-500 mt-0.5">Uống đúng giờ mỗi ngày</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateFormField('medType', 'as_needed')}
                      className={`p-3 rounded-xl border-2 text-center transition min-h-[48px] ${
                        formData.medType === 'as_needed'
                          ? 'border-amber-400 bg-amber-50 text-amber-800 font-bold'
                          : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600'
                      }`}
                    >
                      <span className="text-xs font-bold">⚡ Khi cần</span>
                      <span className="text-[10px] block text-slate-500 mt-0.5">Chỉ dùng khi có triệu chứng</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên thuốc / bài tập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => updateFormField('title', e.target.value)}
                  placeholder="VD: Amlodipine 5mg, Tập co duỗi tay..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Dosage */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Liều lượng / Thời lượng
                </label>
                <input
                  type="text"
                  value={formData.dosage}
                  onChange={(e) => updateFormField('dosage', e.target.value)}
                  placeholder="VD: 1 viên, 15 phút, Mỗi 2 giờ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Time slots — multi-select (hidden for as_needed meds) */}
              {!(formData.category === 'meds' && formData.medType === 'as_needed') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Buổi áp dụng <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {ALL_TIME_SLOTS.map(slot => {
                      const cfg = TIME_SLOT_CONFIG[slot];
                      const isSelected = formData.timeSlots.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleTimeSlot(slot)}
                          className={`p-2.5 rounded-xl border-2 text-center transition min-h-[48px] ${
                            isSelected
                              ? `${TIME_SLOT_PILL_COLORS[slot]} border-current font-bold`
                              : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-sm block">{cfg.emoji}</span>
                          <span className="text-xs font-bold block">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hướng dẫn cho Mẹ
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => updateFormField('instructions', e.target.value)}
                  placeholder="VD: Uống sau ăn 30 phút. Từ từ, nhẹ nhàng..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              {/* Condition note (only for meds) */}
              {formData.category === 'meds' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Điều kiện đặc biệt <span className="text-slate-400 font-normal">(tuỳ chọn)</span>
                  </label>
                  <textarea
                    value={formData.conditionNote || ''}
                    onChange={(e) => updateFormField('conditionNote', e.target.value)}
                    placeholder="VD: Chỉ uống khi HA tâm thu > 130. Nếu < 110 thì hoãn..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>
              )}

              {/* Sort order + Active toggle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thứ tự hiển thị
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={formData.sortOrder}
                    onChange={(e) => updateFormField('sortOrder', parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái
                  </label>
                  <button
                    type="button"
                    onClick={() => updateFormField('isActive', !formData.isActive)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition min-h-[44px] ${
                      formData.isActive
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-300 bg-slate-100 text-slate-500'
                    }`}
                  >
                    {formData.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    {formData.isActive ? 'Đang áp dụng' : 'Đã tạm ngưng'}
                  </button>
                </div>
              </div>

              {/* Save / Cancel buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cancelForm}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700 min-h-[44px]"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 active:scale-95 transition shadow-md shadow-violet-600/20 disabled:opacity-50 min-h-[44px] flex items-center gap-2"
                >
                  <Save size={14} />
                  {isSaving ? 'Đang lưu...' : '💾 Lưu đầu việc'}
                </button>
              </div>
            </form>
          )}

          {/* ===== Routine List (grouped by category) ===== */}
          {!showForm && (
            <div className="space-y-5">
              {/* Add button */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {selectedStage?.name || 'Đầu việc chăm sóc'} ({stageRoutines.length})
                </span>
                <button
                  type="button"
                  onClick={startAddNew}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800 transition flex items-center gap-1.5 min-h-[44px]"
                >
                  <Plus size={14} /> Thêm mới
                </button>
              </div>

              {/* Empty state */}
              {stageRoutines.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Pill size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">Chưa có đầu việc nào</p>
                  <p className="text-xs mt-1">Bấm &quot;Thêm mới&quot; để tạo thuốc hoặc bài tập</p>
                </div>
              )}

              {/* Groups */}
              {(Object.entries(CATEGORY_CONFIG) as [RoutineCategory, typeof CATEGORY_CONFIG.meds][]).map(
                ([cat, cfg]) => {
                  const items = groupedRoutines[cat];
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-2">
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${cfg.color} flex items-center gap-1.5`}>
                        {cfg.emoji} {cfg.label} ({items.length})
                      </h4>
                      <div className="space-y-2">
                        {items.map(routine => {
                          const isConfirming = confirmDeleteId === routine.id;
                          return (
                            <div
                              key={routine.id}
                              className={`p-3.5 rounded-2xl border transition ${
                                routine.isActive
                                  ? 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                                  : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/50 opacity-60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                {/* Left: info */}
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <GripVertical size={16} className="text-slate-300 mt-1 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                        {routine.title}
                                      </h5>
                                      {!routine.isActive && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-500 text-[10px] font-bold">
                                          Tạm ngưng
                                        </span>
                                      )}
                                      {routine.medType === 'as_needed' && (
                                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200">
                                          ⚡ Khi cần
                                        </span>
                                      )}
                                    </div>
                                    {routine.dosage && (
                                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                                        {routine.dosage}
                                      </p>
                                    )}
                                    {/* Time slot pills */}
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {routine.timeSlots.map(slot => (
                                        <span
                                          key={slot}
                                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${TIME_SLOT_PILL_COLORS[slot]}`}
                                        >
                                          {TIME_SLOT_CONFIG[slot].emoji} {TIME_SLOT_CONFIG[slot].label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Right: actions */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {isConfirming ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(routine.id)}
                                        disabled={isSaving}
                                        className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-500 transition min-h-[36px]"
                                      >
                                        Xoá hẳn!
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleSoftDelete(routine)}
                                        disabled={isSaving}
                                        className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-400 transition min-h-[36px]"
                                      >
                                        Tạm ngưng
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2 py-1.5 rounded-lg text-[11px] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 min-h-[36px]"
                                      >
                                        Huỷ
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      {/* Toggle active */}
                                      <button
                                        type="button"
                                        onClick={() => handleToggleActive(routine)}
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs transition ${
                                          routine.isActive
                                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                        }`}
                                        title={routine.isActive ? 'Tạm ngưng' : 'Kích hoạt lại'}
                                      >
                                        {routine.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                      </button>
                                      {/* Edit */}
                                      <button
                                        type="button"
                                        onClick={() => startEdit(routine)}
                                        className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition"
                                        title="Sửa"
                                      >
                                        ✏️
                                      </button>
                                      {/* Delete */}
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(routine.id)}
                                        className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-400 flex items-center justify-center text-xs transition"
                                        title="Xoá"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* ===== Footer ===== */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
          <span>Yêu cầu quyền Admin (PIN) để quản lý.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold text-xs transition min-h-[40px]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
