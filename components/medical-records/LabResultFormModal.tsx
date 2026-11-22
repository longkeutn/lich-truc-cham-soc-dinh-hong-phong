'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, ChevronUp, FlaskConical, SlidersHorizontal, X } from 'lucide-react';
import type {
  LabResultEntry,
  HealthProfileType,
  FamilyMember,
} from '@/lib/types';
import { evaluateLabEntry } from '@/lib/config';
import { QUICK_FACILITIES } from './labRecordsUtils';
import type { LabBioUnitKind, LabBiochemFormValues } from './LabFormPanels';
import {
  AdviceOnlyBanner,
  GeneralQuickPanel,
  LabPackageSelector,
  ThyroidQuickPanel,
} from './LabPackagePanels';
import { LabAdvancedSection } from './LabAdvancedSection';
import {
  buildLabEntryFromFormState,
  createInitialLabFormState,
  detectDefaultExamPackage,
  hasAdvancedFieldsForPackage,
  type LabExamPackage,
  type LabFullFormState,
} from './labFormState';
import {
  clearLabDraft,
  hasMeaningfulLabInput,
  loadLabDraft,
  saveLabDraft,
} from './labDraftStorage';

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
  const [restoredDraftNotice, setRestoredDraftNotice] = useState(false);
  const isModalOpenRef = useRef(false);
  const currentEditingIdRef = useRef<string | null | undefined>(undefined);

  const [selectedPackage, setSelectedPackage] = useState<LabExamPackage>(() =>
    detectDefaultExamPackage({ editingEntry, profileType })
  );
  const [showAdvanced, setShowAdvanced] = useState<boolean>(() => {
    const pkg = detectDefaultExamPackage({ editingEntry, profileType });
    return hasAdvancedFieldsForPackage(editingEntry, pkg);
  });
  const [showParathyroidQuick, setShowParathyroidQuick] = useState<boolean>(() =>
    Boolean(
      editingEntry &&
        (editingEntry.pth !== undefined ||
          editingEntry.phosphorus !== undefined ||
          editingEntry.albumin !== undefined ||
          editingEntry.vitaminD !== undefined)
    )
  );
  const [form, setForm] = useState<LabFullFormState>(() =>
    createInitialLabFormState({
      editingEntry,
      latestLab,
      defaultRecorder,
      profileType,
    })
  );

  // CHỈ khởi tạo lại form khi modal MỚI MỞ hoặc khi ĐỔI BẢN GHI ĐANG SỬA.
  // TUYỆT ĐỐI KHÔNG reset lại form khi đang mở dở mà dữ liệu nền (latestLab/defaultRecorder) thay đổi!
  useEffect(() => {
    if (!isOpen) {
      isModalOpenRef.current = false;
      currentEditingIdRef.current = undefined;
      return;
    }

    const isNewlyOpened = !isModalOpenRef.current;
    const isDifferentEntry = editingEntry?.id !== currentEditingIdRef.current;

    if (isNewlyOpened || isDifferentEntry) {
      isModalOpenRef.current = true;
      currentEditingIdRef.current = editingEntry?.id || null;

      if (!editingEntry) {
        const draft = loadLabDraft(profileId);
        if (draft && hasMeaningfulLabInput(draft.form)) {
          setSelectedPackage(draft.selectedPackage);
          setShowAdvanced(draft.showAdvanced);
          setShowParathyroidQuick(
            Boolean(
              draft.form.bio?.pth?.trim() ||
                draft.form.bio?.phosphorus?.trim() ||
                draft.form.bio?.albumin?.trim() ||
                draft.form.bio?.vitaminD?.trim()
            )
          );
          setForm(draft.form);
          setRestoredDraftNotice(true);
          return;
        }
      }

      setRestoredDraftNotice(false);
      const defaultPkg = detectDefaultExamPackage({ editingEntry, profileType });
      setSelectedPackage(defaultPkg);
      setShowAdvanced(hasAdvancedFieldsForPackage(editingEntry, defaultPkg));
      setShowParathyroidQuick(
        Boolean(
          editingEntry &&
            (editingEntry.pth !== undefined ||
              editingEntry.phosphorus !== undefined ||
              editingEntry.albumin !== undefined ||
              editingEntry.vitaminD !== undefined)
        )
      );
      setForm(
        createInitialLabFormState({
          editingEntry,
          latestLab,
          defaultRecorder,
          profileType,
        })
      );
    }
  }, [isOpen, editingEntry, profileId, profileType, latestLab, defaultRecorder]);

  // Tự động lưu bản nháp ngầm sau mỗi 400ms gõ phím (chỉ cho bản ghi mới, tránh mất công khi rớt mạng/reload)
  useEffect(() => {
    if (!isOpen || editingEntry) return;
    if (!hasMeaningfulLabInput(form)) return;

    const timer = setTimeout(() => {
      saveLabDraft(profileId, {
        form,
        selectedPackage,
        showAdvanced,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [isOpen, editingEntry, profileId, form, selectedPackage, showAdvanced]);

  const handleDiscardDraft = () => {
    clearLabDraft(profileId);
    setRestoredDraftNotice(false);
    const defaultPkg = detectDefaultExamPackage({ editingEntry: null, profileType });
    setSelectedPackage(defaultPkg);
    setShowAdvanced(false);
    setForm(
      createInitialLabFormState({
        editingEntry: null,
        latestLab,
        defaultRecorder,
        profileType,
      })
    );
    showToast('Đã xóa bản nháp và tạo lại biểu mẫu mới.', 'info');
  };

  if (!isOpen) return null;

  const setField = <K extends keyof LabFullFormState>(
    key: K,
    value: LabFullFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setBioField = <K extends keyof LabBiochemFormValues>(
    field: K,
    value: LabBiochemFormValues[K]
  ) => {
    setForm((prev) => ({ ...prev, bio: { ...prev.bio, [field]: value } }));
  };

  const handleManualUnitLock = (kind: 'ft4' | LabBioUnitKind) => {
    setForm((prev) => ({
      ...prev,
      unitLocks: { ...(prev.unitLocks || {}), [kind]: true },
    }));
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
      !entry.doctorAdvice &&
      !entry.gallbladderPolypCount &&
      !entry.liverUltrasound &&
      !entry.kidneyUltrasound
    ) {
      showToast(
        'Vui lòng nhập ít nhất 1 chỉ số xét nghiệm, liều thuốc, triệu chứng hoặc lời dặn bác sĩ.',
        'warn'
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSaveLabResult(entry);
      clearLabDraft(profileId);
      setRestoredDraftNotice(false);
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
              {editingEntry ? 'Cập Nhật Kết Quả Khám' : 'Nhập Kết Quả Xét Nghiệm'} ·{' '}
              {patientName}
            </h3>
            <p className="text-sm text-teal-100 mt-0.5">
              Chọn đúng gói vừa đi khám để chỉ hiện vài ô cần thiết (ô trống tự động bỏ qua)
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
          {/* Thông báo đã khôi phục bản nháp đang nhập dở (nếu có) */}
          {restoredDraftNotice && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/95 p-3 sm:p-3.5 text-amber-950 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold min-w-0">
                <span className="text-xl leading-none shrink-0" aria-hidden="true">
                  📝
                </span>
                <span className="truncate">
                  Đang hiển thị bản nháp bạn đã nhập dở trước đó.
                </span>
              </div>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="min-h-[48px] min-w-[48px] px-3.5 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 text-xs sm:text-sm font-black transition cursor-pointer shrink-0"
              >
                Xóa nháp &amp; Nhập mới
              </button>
            </div>
          )}

          {/* Bước 1: 3 Gói khám 1 chạm */}
          <LabPackageSelector
            selectedPackage={selectedPackage}
            onSelect={setSelectedPackage}
          />

          {/* Thông tin đợt khám (gọn 2 cột, người nhập mặc định theo hồ sơ) */}
          <div className="rounded-2xl border border-border-card bg-slate-50/70 p-3.5 sm:p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-base font-extrabold text-text-body mb-1">
                  Ngày khám / xét nghiệm *
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
            </div>

            <div className="space-y-1.5">
              <span className="block text-sm font-bold text-text-body">
                Chọn nhanh nơi khám:
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

          {/* Nội dung theo Gói khám đang chọn */}
          {selectedPackage === 'thyroid' && (
            <ThyroidQuickPanel
              form={form}
              showParathyroidQuick={showParathyroidQuick}
              onToggleParathyroidQuick={() => setShowParathyroidQuick((v) => !v)}
              onSetField={setField}
              onSetBioField={setBioField}
            />
          )}

          {selectedPackage === 'general' && (
            <GeneralQuickPanel form={form} onSetBioField={setBioField} />
          )}

          {selectedPackage === 'advice_only' && <AdviceOnlyBanner />}

          {/* Triệu chứng & Lời dặn Bác sĩ */}
          <div
            className={
              selectedPackage === 'advice_only'
                ? 'space-y-3'
                : 'grid grid-cols-1 sm:grid-cols-2 gap-3'
            }
          >
            {selectedPackage === 'advice_only' ? (
              <>
                <div>
                  <label className="block text-base font-extrabold text-text-body mb-1">
                    Kết luận &amp; Lời dặn của Bác sĩ *
                  </label>
                  <textarea
                    rows={3}
                    value={form.doctorAdvice}
                    onChange={(e) => setField('doctorAdvice', e.target.value)}
                    placeholder="VD: Bác sĩ bảo huyết áp ổn, tiếp tục uống thuốc cũ, hẹn 3 tháng khám lại..."
                    className="w-full p-3 rounded-xl border border-border-card text-base text-text-main bg-surface-card"
                  />
                </div>
                <div>
                  <label className="block text-base font-extrabold text-text-body mb-1">
                    Triệu chứng lúc đi khám (nếu có)
                  </label>
                  <textarea
                    rows={2}
                    value={form.symptoms}
                    onChange={(e) => setField('symptoms', e.target.value)}
                    placeholder="VD: Hơi mệt, đau khớp gối, ngủ ít..."
                    className="w-full p-3 rounded-xl border border-border-card text-base text-text-main bg-surface-card"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-base font-extrabold text-text-body mb-1">
                    Triệu chứng ghi nhận lúc khám
                  </label>
                  <textarea
                    rows={2}
                    value={form.symptoms}
                    onChange={(e) => setField('symptoms', e.target.value)}
                    placeholder="VD: Hơi mệt, tim đập nhanh, tê nhẹ đầu ngón tay..."
                    className="w-full p-3 rounded-xl border border-border-card text-base text-text-main bg-surface-card"
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
                    className="w-full p-3 rounded-xl border border-border-card text-base text-text-main bg-surface-card"
                  />
                </div>
              </>
            )}
          </div>

          {/* Nút thu gọn / mở rộng chỉ số nâng cao & đổi đơn vị */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
              className="w-full min-h-[48px] min-w-[48px] px-4 py-3 rounded-2xl border border-dashed border-border-card bg-slate-50 hover:bg-slate-100 text-text-body text-sm sm:text-base font-extrabold flex items-center justify-between gap-2 transition cursor-pointer"
            >
              <span className="flex items-center gap-2 text-left">
                <SlidersHorizontal className="w-4 h-4 text-medical-primary shrink-0" />
                <span>
                  {showAdvanced
                    ? 'Thu gọn các chỉ số nâng cao'
                    : 'Mở rộng tất cả chỉ số, người nhập & đổi đơn vị (Nâng cao)'}
                </span>
              </span>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5 shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 shrink-0" />
              )}
            </button>
          </div>

          {showAdvanced && (
            <LabAdvancedSection
              selectedPackage={selectedPackage}
              showParathyroidQuick={showParathyroidQuick}
              form={form}
              members={members}
              onSetField={setField}
              onSetBioField={setBioField}
              onManualUnitLock={handleManualUnitLock}
            />
          )}

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
              <span>
                {isSaving
                  ? 'Đang lưu...'
                  : selectedPackage === 'advice_only'
                    ? 'Lưu ghi chú khám bệnh'
                    : 'Lưu kết quả xét nghiệm'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LabResultFormModal;
