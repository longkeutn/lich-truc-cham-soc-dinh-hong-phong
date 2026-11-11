'use client';

import React, { useEffect, useRef, useState } from 'react';
import type {
  ExpenseCategory,
  ExpenseEntry,
  ExpenseStage,
  ExpenseType,
  FamilyMember,
} from '@/lib/types';
import { getVietnamDateStr } from '@/lib/config';
import { Calendar, Camera, Minus, Plus, Tag, X } from 'lucide-react';
import {
  CATEGORY_CONFIG,
  compressReceiptImage,
  formatNumberInput,
  QUICK_AMOUNTS,
  STAGE_CONFIG,
} from './expenseTrackerUtils';

interface ExpenseEntryFormModalProps {
  isOpen: boolean;
  editingEntry: ExpenseEntry | null;
  initialType: ExpenseType;
  members: FamilyMember[];
  onClose: () => void;
  onSaveExpense: (entry: ExpenseEntry) => Promise<void>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
}

export default function ExpenseEntryFormModal({
  isOpen,
  editingEntry,
  initialType,
  members,
  onClose,
  onSaveExpense,
  showToast,
}: ExpenseEntryFormModalProps) {
  const [formType, setFormType] = useState<ExpenseType>('out');
  const [formDate, setFormDate] = useState<string>(() => getVietnamDateStr());
  const [formAmountStr, setFormAmountStr] = useState<string>('');
  const [formStage, setFormStage] = useState<ExpenseStage>('home_care');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('medicine');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formPersonName, setFormPersonName] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');
  const [formReceiptImage, setFormReceiptImage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingEntry) {
      setFormType(editingEntry.type);
      setFormDate(editingEntry.date);
      setFormAmountStr(formatNumberInput(editingEntry.amount));
      setFormStage(editingEntry.stage || 'home_care');
      setFormCategory(editingEntry.category);
      setFormTitle(editingEntry.title);
      setFormPersonName(editingEntry.personName || '');
      setFormNote(editingEntry.note || '');
      setFormReceiptImage(editingEntry.receiptImage || '');
    } else {
      setFormType(initialType);
      setFormDate(getVietnamDateStr());
      setFormAmountStr('');
      setFormStage('home_care');
      setFormCategory(initialType === 'out' ? 'medicine' : 'family_contrib');
      setFormTitle('');
      setFormPersonName('');
      setFormNote('');
      setFormReceiptImage('');
    }
  }, [isOpen, editingEntry, initialType]);

  if (!isOpen) return null;

  const availableCategories = (Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).filter(
    (k) => CATEGORY_CONFIG[k].type === formType
  );

  const handleSwitchFormType = (nextType: ExpenseType) => {
    setFormType(nextType);
    if (nextType === 'out' && CATEGORY_CONFIG[formCategory]?.type !== 'out') {
      setFormCategory('medicine');
    } else if (nextType === 'in' && CATEGORY_CONFIG[formCategory]?.type !== 'in') {
      setFormCategory('family_contrib');
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressReceiptImage(file);
      setFormReceiptImage(compressed);
      showToast('Đã đính kèm ảnh hóa đơn / biên lai', 'info');
    } catch {
      showToast('Không thể đọc file ảnh này', 'warn');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmount = Number(formAmountStr.replace(/\D/g, ''));
    if (!rawAmount || rawAmount <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0', 'warn');
      return;
    }
    if (!formTitle.trim()) {
      showToast('Vui lòng nhập nội dung khoản thu/chi', 'warn');
      return;
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const entry: ExpenseEntry = {
        id: editingEntry?.id || `exp-${Date.now()}`,
        date: formDate || getVietnamDateStr(),
        type: formType,
        amount: rawAmount,
        stage: formStage,
        category: formCategory,
        title: formTitle.trim(),
        personName: formPersonName.trim() || undefined,
        paymentSource: undefined,
        note: formNote.trim() || undefined,
        receiptImage: formReceiptImage || undefined,
        createdAt: editingEntry?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      await onSaveExpense(entry);
      onClose();
      showToast(
        editingEntry ? 'Đã cập nhật khoản thu chi!' : 'Đã ghi vào Sổ Thu Chi!',
        'success'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-extrabold text-slate-900">
            {editingEntry ? 'Chỉnh Sửa Khoản Thu / Chi' : 'Ghi Chép Khoản Thu / Chi Mới'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveForm} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleSwitchFormType('out')}
              className={`min-h-[48px] py-2.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                formType === 'out'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Minus className="w-4 h-4" />
              <span>Khoản Chi Điều Trị</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchFormType('in')}
              className={`min-h-[48px] py-2.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                formType === 'in'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Khoản Thu Vào Quỹ</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Số tiền (VNĐ) *
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={formAmountStr}
                onChange={(e) => setFormAmountStr(formatNumberInput(e.target.value))}
                placeholder="VD: 1.500.000"
                className="w-full min-h-[52px] px-4 py-3 pr-12 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-lg font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-600">
                VNĐ
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_AMOUNTS.map((qa) => (
                <button
                  key={qa.value}
                  type="button"
                  onClick={() => setFormAmountStr(formatNumberInput(qa.value))}
                  className="min-h-[40px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Ngày phát sinh *
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Giai đoạn điều trị
              </label>
              <select
                value={formStage}
                onChange={(e) => setFormStage(e.target.value as ExpenseStage)}
                className="w-full min-h-[48px] px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-800"
              >
                {(Object.keys(STAGE_CONFIG) as ExpenseStage[]).map((stg) => (
                  <option key={stg} value={stg}>
                    {STAGE_CONFIG[stg].icon} {STAGE_CONFIG[stg].shortLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              <Tag className="w-3.5 h-3.5 inline mr-1" />
              Nhóm danh mục *
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-800"
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nội dung chi tiết *
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={
                formType === 'out'
                  ? 'VD: Đóng tạm ứng viện phí đợt cấp cứu / Mua thuốc huyết áp...'
                  : 'VD: Anh Dũng chuyển vào quỹ chăm sóc bố...'
              }
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm font-bold text-slate-900"
            />
            {CATEGORY_CONFIG[formCategory]?.suggestions?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {CATEGORY_CONFIG[formCategory].suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setFormTitle(sug)}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {formType === 'in'
                ? 'Người gửi vào quỹ / Nguồn đóng góp'
                : 'Người trực tiếp đi thanh toán (Tùy chọn)'}
            </label>
            {formType === 'out' && (
              <p className="text-xs text-slate-600 mb-1.5">
                Ghi tên để tiện nhớ ai đã đi đóng/mua khoản này. Mọi khoản chi đều tính chung vào quỹ.
              </p>
            )}
            <input
              type="text"
              value={formPersonName}
              onChange={(e) => setFormPersonName(e.target.value)}
              placeholder={
                formType === 'in'
                  ? 'Chọn bên dưới hoặc nhập tên (VD: Anh Dũng, BHYT...)'
                  : 'Để trống nếu là chi từ quỹ chung...'
              }
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm font-semibold text-slate-800"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {formType === 'out' && (
                <button
                  type="button"
                  onClick={() => setFormPersonName('')}
                  className={
                    'min-h-[40px] px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ' +
                    (formPersonName === ''
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200')
                  }
                >
                  💼 Quỹ chung (không ghi tên)
                </button>
              )}
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFormPersonName(m.name)}
                  className={
                    'min-h-[40px] px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ' +
                    (formPersonName === m.name
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200')
                  }
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ghi chú thêm (nếu có)
              </label>
              <input
                type="text"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Số biên lai, tên nhà thuốc, ghi chú..."
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs sm:text-sm text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Ảnh hóa đơn / biên lai
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleReceiptUpload}
                className="hidden"
              />
              {!formReceiptImage ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[48px] py-2.5 px-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-teal-700" />
                  <span>Chụp / Chọn ảnh biên lai</span>
                </button>
              ) : (
                <div className="min-h-[48px] flex items-center justify-between px-3 py-2 rounded-xl bg-teal-50 border border-teal-200">
                  <span className="text-xs font-bold text-teal-800 truncate">
                    ✅ Đã đính kèm ảnh
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormReceiptImage('')}
                    className="text-xs font-extrabold text-rose-600 hover:underline ml-2 cursor-pointer"
                  >
                    Xóa ảnh
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[48px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold shadow-sm cursor-pointer"
            >
              {isSaving
                ? 'Đang lưu...'
                : editingEntry
                ? 'Lưu cập nhật'
                : 'Lưu vào Sổ Thu Chi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
