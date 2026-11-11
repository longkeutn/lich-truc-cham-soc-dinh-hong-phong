'use client';

import React from 'react';
import {
  Camera,
  ChevronLeft,
  Image as ImageIcon,
  Save,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { CareRoutine, RoutineCategory, TimeSlot } from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  extractRoutineStartDateStr,
  getVietnamDateStr,
} from '@/lib/config';
import {
  ALL_TIME_SLOTS,
  CATEGORY_CONFIG,
  TIME_SLOT_PILL_COLORS,
  normalizeImageUrl,
} from './routineManagerUtils';

interface RoutineItemFormProps {
  formData: CareRoutine;
  isAddingNew: boolean;
  editingTitle?: string;
  isSaving: boolean;
  isCompressingImg: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpdateField: <K extends keyof CareRoutine>(key: K, value: CareRoutine[K]) => void;
  onToggleTimeSlot: (slot: TimeSlot) => void;
  onImageFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreviewLightbox: (item: { url: string; title: string; description?: string }) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function RoutineItemForm({
  formData,
  isAddingNew,
  editingTitle,
  isSaving,
  isCompressingImg,
  fileInputRef,
  onUpdateField,
  onToggleTimeSlot,
  onImageFileChange,
  onPreviewLightbox,
  onCancel,
  onSubmit,
}: RoutineItemFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in"
    >
      {/* Form header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <button type="button" onClick={onCancel} className="hover:text-violet-600 transition">
            <ChevronLeft size={18} />
          </button>
          {isAddingNew ? '➕ Thêm đầu việc mới' : `✏️ Sửa: ${editingTitle || ''}`}
        </h4>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 font-semibold"
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
                onClick={() => onUpdateField('category', cat)}
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
              onClick={() => onUpdateField('medType', 'scheduled')}
              className={`p-3 rounded-xl border-2 text-center transition min-h-[48px] ${
                formData.medType === 'scheduled'
                  ? 'border-blue-400 bg-blue-50 text-blue-800 font-bold'
                  : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600'
              }`}
            >
              <span className="text-xs font-bold">🕐 Theo lịch</span>
              <span className="text-[10px] block text-slate-600 mt-0.5">Uống đúng giờ mỗi ngày</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateField('medType', 'as_needed')}
              className={`p-3 rounded-xl border-2 text-center transition min-h-[48px] ${
                formData.medType === 'as_needed'
                  ? 'border-amber-400 bg-amber-50 text-amber-800 font-bold'
                  : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600'
              }`}
            >
              <span className="text-xs font-bold">⚡ Khi cần</span>
              <span className="text-[10px] block text-slate-600 mt-0.5">Chỉ dùng khi có triệu chứng</span>
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
          onChange={(e) => onUpdateField('title', e.target.value)}
          placeholder="VD: Amlodipine 5mg, Tập co duỗi tay..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[48px]"
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
          onChange={(e) => onUpdateField('dosage', e.target.value)}
          placeholder="VD: 1 viên, 15 phút, Mỗi 2 giờ..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[48px]"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
          {formData.category === 'meds'
            ? 'Mô tả thuốc (Màu sắc, hình dáng viên/vỉ thuốc, công dụng)'
            : 'Mô tả chi tiết'}{' '}
          <span className="text-slate-500 font-normal">(giúp dễ nhận diện)</span>
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => onUpdateField('description', e.target.value)}
          placeholder={
            formData.category === 'meds'
              ? 'VD: Viên nang cứng màu vàng-trắng, vỉ bạc - Thuốc hạ huyết áp'
              : 'VD: Tập nhẹ nhàng giúp lưu thông máu và chống cứng khớp...'
          }
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
        />
      </div>

      {/* Image */}
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          {formData.category === 'meds'
            ? 'Hình ảnh viên thuốc / vỉ thuốc'
            : 'Hình ảnh minh hoạ'}{' '}
          <span className="text-slate-500 font-normal">(tuỳ chọn)</span>
        </label>

        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onImageFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressingImg}
              className="px-3.5 py-2.5 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/70 dark:bg-violet-950/30 hover:bg-violet-100 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center justify-center gap-2 transition min-h-[48px] flex-shrink-0"
            >
              <Camera size={16} />
              {isCompressingImg ? 'Đang xử lý ảnh...' : '📷 Chụp / Chọn ảnh từ máy'}
            </button>

            <div className="relative flex-1">
              <input
                type="text"
                value={
                  formData.imageUrl?.startsWith('data:image/')
                    ? ''
                    : formData.imageUrl || ''
                }
                onChange={(e) => onUpdateField('imageUrl', e.target.value)}
                placeholder={
                  formData.imageUrl?.startsWith('data:image/')
                    ? 'Đã tải ảnh từ máy lên (hoặc dán link ảnh khác vào đây)'
                    : 'Hoặc dán link ảnh / link Google Drive...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[48px]"
              />
            </div>
          </div>

          {formData.imageUrl && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() =>
                  onPreviewLightbox({
                    url: normalizeImageUrl(formData.imageUrl || ''),
                    title: formData.title || 'Hình ảnh thuốc',
                    description: formData.description,
                  })
                }
                className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 bg-slate-100 group"
                title="Bấm để phóng to"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={normalizeImageUrl(formData.imageUrl)}
                  alt={formData.title || 'Preview'}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <ImageIcon size={13} /> Đã đính kèm hình ảnh
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Bấm vào ảnh để xem phóng to trong checklist hàng ngày.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onUpdateField('imageUrl', '')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition min-h-[44px]"
              >
                Xoá ảnh
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Time slots - multi-select */}
      {!(formData.category === 'meds' && formData.medType === 'as_needed') && (
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Buổi áp dụng <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {ALL_TIME_SLOTS.map((slot) => {
              const cfg = TIME_SLOT_CONFIG[slot];
              const isSelected = formData.timeSlots.includes(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => onToggleTimeSlot(slot)}
                  className={`p-2.5 rounded-xl border-2 text-center transition min-h-[48px] ${
                    isSelected
                      ? `${TIME_SLOT_PILL_COLORS[slot]} border-current font-bold`
                      : 'border-slate-200 bg-white dark:bg-slate-800 text-slate-600 hover:border-slate-300'
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
          Hướng dẫn cách uống / cách tập
        </label>
        <textarea
          value={formData.instructions}
          onChange={(e) => onUpdateField('instructions', e.target.value)}
          placeholder="VD: Uống sau ăn 30 phút. Từ từ, nhẹ nhàng..."
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
        />
      </div>

      {/* Condition note */}
      {formData.category === 'meds' && (
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Điều kiện đặc biệt <span className="text-slate-500 font-normal">(tuỳ chọn)</span>
          </label>
          <textarea
            value={formData.conditionNote || ''}
            onChange={(e) => onUpdateField('conditionNote', e.target.value)}
            placeholder="VD: Chỉ uống khi HA tâm thu > 130. Nếu < 110 thì hoãn..."
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>
      )}

      {/* Start date + Sort order + Active toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            📅 Ngày bắt đầu áp dụng
          </label>
          <input
            type="date"
            value={extractRoutineStartDateStr(formData.createdAt, formData.id) || getVietnamDateStr()}
            onChange={(e) => onUpdateField('createdAt', e.target.value || getVietnamDateStr())}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[48px]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Thứ tự hiển thị
          </label>
          <input
            type="number"
            min={1}
            max={99}
            value={formData.sortOrder}
            onChange={(e) => onUpdateField('sortOrder', parseInt(e.target.value, 10) || 1)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[48px]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Trạng thái
          </label>
          <button
            type="button"
            onClick={() => onUpdateField('isActive', !formData.isActive)}
            className={`w-full px-3.5 py-2.5 rounded-xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition min-h-[48px] ${
              formData.isActive
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-slate-300 bg-slate-100 text-slate-600'
            }`}
          >
            {formData.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            {formData.isActive ? 'Đang áp dụng' : 'Đã tạm ngưng'}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-slate-600 dark:text-slate-400 -mt-2">
        💡 Hệ thống chỉ tính thống kê tuân thủ của thuốc/bài tập này từ <strong>Ngày bắt đầu áp dụng</strong> trở đi.
      </p>

      {/* Save / Cancel buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 min-h-[48px]"
        >
          Đóng
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 active:scale-95 transition shadow-md shadow-violet-600/20 disabled:opacity-50 min-h-[48px] flex items-center gap-2"
        >
          <Save size={14} />
          {isSaving ? 'Đang lưu...' : '💾 Lưu đầu việc'}
        </button>
      </div>
    </form>
  );
}
