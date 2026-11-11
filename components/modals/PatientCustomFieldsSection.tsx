'use client';

import React from 'react';
import type { PatientCustomField } from '@/lib/types';
import { Plus, Sparkles, Trash2 } from 'lucide-react';

export const QUICK_PATIENT_FIELD_TEMPLATES: {
  label: string;
  placeholder: string;
  section: 'profile' | 'care';
}[] = [
  { label: 'Năm sinh / Tuổi', placeholder: 'VD: 1958 (68 tuổi)', section: 'profile' },
  { label: 'Nhóm máu', placeholder: 'VD: Nhóm máu O+', section: 'profile' },
  { label: 'Tiền sử bệnh nền', placeholder: 'VD: Tăng huyết áp, tiểu đường tuýp 2', section: 'profile' },
  { label: 'Dị ứng thuốc / thức ăn', placeholder: 'VD: Không có dị ứng ghi nhận', section: 'profile' },
  { label: 'Số thẻ BHYT', placeholder: 'VD: DN4010123456789', section: 'profile' },
  { label: 'Chế độ dinh dưỡng', placeholder: 'VD: Ăn mềm, giảm muối, chia 4 bữa/ngày', section: 'care' },
  { label: 'Thiết bị y tế tại nhà', placeholder: 'VD: Máy đo HA bắp tay, máy đo SpO2', section: 'care' },
];

interface PatientCustomFieldsSectionProps {
  patientName: string;
  customFields: PatientCustomField[];
  onAddField: (label: string, value: string, section: 'profile' | 'care') => void;
  onUpdateField: (id: string, patch: Partial<PatientCustomField>) => void;
  onDeleteField: (id: string) => void;
}

export default function PatientCustomFieldsSection({
  patientName,
  customFields,
  onAddField,
  onUpdateField,
  onDeleteField,
}: PatientCustomFieldsSectionProps) {
  return (
    <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            3. Các mục thông tin sức khỏe bổ sung (Thêm / Sửa / Xoá tự do)
          </h4>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Thêm bất kỳ thông tin nào của {patientName || 'người thân'} (Năm sinh, Nhóm máu, Tiền sử bệnh, Dị ứng, BHYT...)
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAddField('', '', 'profile')}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer min-h-[48px] min-w-[48px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm mục mới</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_PATIENT_FIELD_TEMPLATES.map((tpl) => {
          const alreadyExists = customFields.some(
            (f) => f.label.toLowerCase() === tpl.label.toLowerCase()
          );
          if (alreadyExists) return null;
          return (
            <button
              key={tpl.label}
              type="button"
              onClick={() => onAddField(tpl.label, '', tpl.section)}
              className="min-h-[48px] min-w-[48px] px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-semibold transition cursor-pointer"
            >
              + {tpl.label}
            </button>
          );
        })}
      </div>

      {customFields.length === 0 ? (
        <div className="text-center py-4 bg-white/80 rounded-xl border border-dashed border-indigo-200 text-xs text-slate-600">
          Chưa có mục thông tin bổ sung nào. Bấm các nút gợi ý phía trên hoặc bấm <strong>&quot;+ Thêm mục mới&quot;</strong> để thêm.
        </div>
      ) : (
        <div className="space-y-2.5">
          {customFields.map((field, index) => (
            <div
              key={field.id}
              className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-2xs"
            >
              <input
                type="text"
                value={field.label}
                onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
                placeholder={`Tên mục ${index + 1} (VD: Nhóm máu)`}
                className="sm:w-44 px-2.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[48px] min-w-[48px]"
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) => onUpdateField(field.id, { value: e.target.value })}
                placeholder="Nội dung chi tiết..."
                className="flex-1 px-2.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[48px]"
              />
              <div className="flex items-center gap-1.5 justify-between sm:justify-end">
                <select
                  value={field.section || 'profile'}
                  onChange={(e) =>
                    onUpdateField(field.id, {
                      section: e.target.value as 'profile' | 'care',
                    })
                  }
                  aria-label="Vị trí hiển thị"
                  className="px-2 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 min-h-[48px] min-w-[48px]"
                >
                  <option value="profile">Cột Hồ sơ (Trái)</option>
                  <option value="care">Hộp Chăm sóc (Phải)</option>
                </select>
                <button
                  type="button"
                  onClick={() => onDeleteField(field.id)}
                  title="Xoá mục thông tin này"
                  aria-label="Xoá mục thông tin này"
                  className="min-h-[48px] min-w-[48px] rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
