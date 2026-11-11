'use client';

import React, { useState, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { CareRoutine, RehabStage, RoutineCategory, TimeSlot } from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  getVietnamDateStr,
  extractRoutineStartDateStr,
} from '@/lib/config';
import {
  compressImageToDataUrl,
  createEmptyForm,
  normalizeImageUrl,
} from './modals/routineManagerUtils';
import RoutineItemForm from './modals/RoutineItemForm';
import RoutineCategoryGroups from './modals/RoutineCategoryGroups';

interface RoutineManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  routines: CareRoutine[];
  stages: RehabStage[];
  activeStageId: string;
  onSaveRoutine: (routine: CareRoutine) => Promise<void>;
  onDeleteRoutine: (id: string) => Promise<void>;
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
  const [selectedStageId, setSelectedStageId] = useState(activeStageId);
  const [editingRoutine, setEditingRoutine] = useState<CareRoutine | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressingImg, setIsCompressingImg] = useState(false);
  const [previewLightbox, setPreviewLightbox] = useState<{
    url: string;
    title: string;
    description?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CareRoutine>(() =>
    createEmptyForm(activeStageId, stages.find((s) => s.id === activeStageId)?.name || '')
  );

  const selectedStage = stages.find((s) => s.id === selectedStageId);
  const stageRoutines = useMemo(
    () => routines.filter((r) => r.stageId === selectedStageId),
    [routines, selectedStageId]
  );

  const groupedRoutines = useMemo(() => {
    const groups: Record<RoutineCategory, CareRoutine[]> = { meds: [], rehab: [], care: [] };
    [...stageRoutines]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((r) => {
        if (groups[r.category]) groups[r.category].push(r);
      });
    return groups;
  }, [stageRoutines]);

  if (!isOpen) return null;

  const showForm = isAddingNew || editingRoutine !== null;

  const startAddNew = () => {
    const stage = stages.find((s) => s.id === selectedStageId);
    setFormData(createEmptyForm(selectedStageId, stage?.name || ''));
    setIsAddingNew(true);
    setEditingRoutine(null);
    setErrorMsg('');
  };

  const startEdit = (routine: CareRoutine) => {
    const validSlots = (Array.isArray(routine.timeSlots) ? routine.timeSlots : []).filter(
      (s): s is TimeSlot => Boolean(TIME_SLOT_CONFIG[s as TimeSlot])
    );
    const effectiveStart =
      extractRoutineStartDateStr(routine.createdAt, routine.id) || getVietnamDateStr();
    setFormData({ ...routine, timeSlots: validSlots, createdAt: effectiveStart });
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
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTimeSlot = (slot: TimeSlot) => {
    setFormData((prev) => ({
      ...prev,
      timeSlots: prev.timeSlots.includes(slot)
        ? prev.timeSlots.filter((s) => s !== slot)
        : [...prev.timeSlots, slot],
    }));
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP...)');
      return;
    }
    setIsCompressingImg(true);
    setErrorMsg('');
    try {
      const compressedDataUrl = await compressImageToDataUrl(file);
      updateFormField('imageUrl', compressedDataUrl);
    } catch {
      setErrorMsg('Không thể xử lý ảnh. Vui lòng thử ảnh khác.');
    } finally {
      setIsCompressingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg('Vui lòng nhập tên thuốc / bài tập');
      return;
    }
    const validSlots = (Array.isArray(formData.timeSlots) ? formData.timeSlots : []).filter(
      (s): s is TimeSlot => Boolean(TIME_SLOT_CONFIG[s as TimeSlot])
    );
    const isAsNeededMed = formData.category === 'meds' && formData.medType === 'as_needed';
    if (validSlots.length === 0 && !isAsNeededMed) {
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
        description: (formData.description || '').trim(),
        imageUrl: normalizeImageUrl(formData.imageUrl || ''),
        timeSlots: isAsNeededMed ? [] : validSlots,
        updatedAt: now,
        createdAt: formData.createdAt || now,
        medType: formData.category === 'meds' ? formData.medType : undefined,
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
      setConfirmDeleteId(null);
    } catch {
      setErrorMsg('Không thể tạm ngưng.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (routine: CareRoutine) => {
    setIsSaving(true);
    try {
      await onSaveRoutine({
        ...routine,
        isActive: !routine.isActive,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setErrorMsg('Không thể thay đổi trạng thái.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-3xl shadow-2xl border-0 sm:border sm:border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl backdrop-blur-sm">
              💊
            </span>
            <div>
              <h3 className="text-lg font-bold">Quản Lý Đơn Thuốc &amp; Bài Tập</h3>
              <p className="text-xs text-violet-200">
                Thêm, sửa, tạm ngưng đầu việc chăm sóc hàng ngày
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition"
          >
            <X size={18} />
          </button>
        </div>

        {stages.length > 1 && (
          <div className="px-5 pt-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
            {stages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => {
                  setSelectedStageId(stage.id);
                  cancelForm();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition min-h-[44px] ${
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

        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {showForm ? (
            <RoutineItemForm
              formData={formData}
              isAddingNew={isAddingNew}
              editingTitle={editingRoutine?.title}
              isSaving={isSaving}
              isCompressingImg={isCompressingImg}
              fileInputRef={fileInputRef}
              onUpdateField={updateFormField}
              onToggleTimeSlot={toggleTimeSlot}
              onImageFileChange={handleImageFileChange}
              onPreviewLightbox={setPreviewLightbox}
              onCancel={cancelForm}
              onSubmit={handleSave}
            />
          ) : (
            <RoutineCategoryGroups
              stageName={selectedStage?.name}
              stageRoutines={stageRoutines}
              groupedRoutines={groupedRoutines}
              confirmDeleteId={confirmDeleteId}
              isSaving={isSaving}
              onStartAddNew={startAddNew}
              onStartEdit={startEdit}
              onToggleActive={handleToggleActive}
              onSetConfirmDeleteId={setConfirmDeleteId}
              onDelete={handleDelete}
              onSoftDelete={handleSoftDelete}
              onPreviewLightbox={setPreviewLightbox}
            />
          )}
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 flex-shrink-0">
          <span>Yêu cầu quyền Admin (PIN) để quản lý.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold text-xs transition min-h-[44px]"
          >
            Đóng
          </button>
        </div>
      </div>

      {previewLightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setPreviewLightbox(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center max-h-[55vh] sm:max-h-[65vh] overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewLightbox.url}
                alt={previewLightbox.title}
                className="w-full h-auto max-h-[55vh] sm:max-h-[65vh] object-contain"
              />
              <button
                type="button"
                onClick={() => setPreviewLightbox(null)}
                className="absolute top-3 right-3 min-h-[44px] min-w-[44px] rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 text-center overflow-y-auto">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                {previewLightbox.title}
              </h4>
              {previewLightbox.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed text-left">
                  {previewLightbox.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoutineManagerModal;
