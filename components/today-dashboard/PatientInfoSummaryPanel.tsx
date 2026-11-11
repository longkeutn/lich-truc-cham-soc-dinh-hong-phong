'use client';

import React, { useState } from 'react';
import { Check, Edit2, Hospital, Phone, Plus, Stethoscope, Trash2, X } from 'lucide-react';
import type { PatientCustomField, PatientInfo } from '@/lib/types';

export interface PatientInfoSummaryPanelProps {
  patient: PatientInfo;
  onEditPatient?: () => void;
  onSavePatient?: (newInfo: PatientInfo) => void;
}

export function PatientInfoSummaryPanel({
  patient,
  onEditPatient,
  onSavePatient,
}: PatientInfoSummaryPanelProps) {
  const [isAddingField, setIsAddingField] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [cfLabel, setCfLabel] = useState('');
  const [cfValue, setCfValue] = useState('');
  const [cfSection, setCfSection] = useState<'profile' | 'care'>('profile');

  const customFields = patient.customFields || [];

  const resetCustomForm = () => {
    setIsAddingField(false);
    setEditingFieldId(null);
    setCfLabel('');
    setCfValue('');
    setCfSection('profile');
  };

  const handleStartEditField = (f: PatientCustomField) => {
    setEditingFieldId(f.id);
    setIsAddingField(true);
    setCfLabel(f.label);
    setCfValue(f.value);
    setCfSection(f.section || 'profile');
  };

  const handleSaveCustomField = () => {
    if (!cfLabel.trim() || !cfValue.trim() || !onSavePatient) return;
    const nextField: PatientCustomField = {
      id: editingFieldId || `cf-${Date.now()}`,
      label: cfLabel.trim(),
      value: cfValue.trim(),
      section: cfSection,
    };
    const nextList = editingFieldId
      ? customFields.map((f) => (f.id === editingFieldId ? nextField : f))
      : [...customFields, nextField];
    onSavePatient({ ...patient, customFields: nextList });
    resetCustomForm();
  };

  const handleDeleteCustomField = (id: string) => {
    if (!onSavePatient) return;
    onSavePatient({
      ...patient,
      customFields: customFields.filter((f) => f.id !== id),
    });
  };

  return (
    <div className="pt-3 border-t border-slate-200 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="font-black text-slate-900 flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-teal-700" />
            <span>Tình trạng sức khỏe &amp; Chẩn đoán</span>
          </div>
          <p className="text-slate-700 font-medium leading-relaxed">
            {patient.diagnosis || 'Theo dõi sức khỏe định kỳ tại nhà'}
          </p>
          {patient.hospital && (
            <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
              <Hospital className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Nơi khám: {patient.hospital}
                {patient.room ? ` · ${patient.room}` : ''}
              </span>
            </p>
          )}
        </div>

        <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-1.5">
          <div className="font-black text-teal-950">📋 Ghi chú chăm sóc trọng tâm</div>
          <p className="text-slate-800 font-medium leading-relaxed">
            {patient.notes || 'Đo huyết áp đều đặn, uống thuốc đúng giờ và nghỉ ngơi hợp lý.'}
          </p>
          {patient.emergencyPhone && (
            <a
              href={`tel:${patient.emergencyPhone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-700 hover:underline pt-0.5"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Liên hệ nhanh: {patient.emergencyPhone}</span>
            </a>
          )}
        </div>
      </div>

      {/* Các trường thông tin y tế mở rộng */}
      {customFields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {customFields.map((field) => (
            <div
              key={field.id}
              className="p-3 rounded-xl bg-white border border-slate-200 flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <span className="text-xs font-extrabold text-teal-800 block">
                  {field.label}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 break-words">
                  {field.value}
                </span>
              </div>
              {onSavePatient && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEditField(field)}
                    aria-label={`Sửa ${field.label}`}
                    className="min-h-[44px] min-w-[44px] rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomField(field.id)}
                    aria-label={`Xoá ${field.label}`}
                    className="min-h-[44px] min-w-[44px] rounded-lg hover:bg-rose-50 text-rose-600 flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Biểu mẫu thêm / sửa mục thông tin mở rộng */}
      {isAddingField && onSavePatient && (
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-300 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-black text-slate-900">
              {editingFieldId ? 'Cập nhật mục thông tin' : 'Thêm mục thông tin bệnh án'}
            </span>
            <button
              type="button"
              onClick={resetCustomForm}
              className="min-h-[44px] min-w-[44px] rounded-lg text-slate-600 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={cfLabel}
              onChange={(e) => setCfLabel(e.target.value)}
              placeholder="Tên mục (VD: Dị ứng thuốc, Nhóm máu)"
              className="min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900"
            />
            <input
              type="text"
              value={cfValue}
              onChange={(e) => setCfValue(e.target.value)}
              placeholder="Nội dung chi tiết..."
              className="sm:col-span-2 min-h-[48px] px-3 rounded-xl bg-white border border-slate-300 text-sm font-medium text-slate-900"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleSaveCustomField}
              className="min-h-[48px] min-w-[48px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Lưu mục này</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {onEditPatient && (
          <button
            type="button"
            onClick={onEditPatient}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Edit2 className="w-4 h-4 shrink-0" />
            <span>Sửa bệnh án chi tiết</span>
          </button>
        )}
        {onSavePatient && !isAddingField && (
          <button
            type="button"
            onClick={() => setIsAddingField(true)}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Thêm dòng thông tin</span>
          </button>
        )}
      </div>
    </div>
  );
}
