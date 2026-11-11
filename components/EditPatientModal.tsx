'use client';

import React, { useState, useEffect } from 'react';
import { PatientInfo, PatientCustomField } from '@/lib/types';
import { DEFAULT_MEMBER_NAME } from '@/lib/config';
import { X, Save, Eraser } from 'lucide-react';
import PatientCustomFieldsSection from './modals/PatientCustomFieldsSection';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientInfo;
  onUpdated: (newInfo: PatientInfo) => void;
}

export function EditPatientModal({
  isOpen,
  onClose,
  patient,
  onUpdated,
}: EditPatientModalProps) {
  const [formData, setFormData] = useState<PatientInfo>({
    name: patient.name || DEFAULT_MEMBER_NAME,
    diagnosis: patient.diagnosis ?? '',
    hospital: patient.hospital ?? '',
    room: patient.room ?? '',
    notes: patient.notes ?? '',
    emergencyPhone: patient.emergencyPhone ?? '',
    statusBadge: patient.statusBadge ?? 'Theo dõi sức khỏe gia đình',
    conditionTag: patient.conditionTag ?? 'Theo dõi tại nhà',
    headerBadge: patient.headerBadge ?? 'Tại nhà',
    careMode: patient.careMode ?? 'Hằng ngày',
    careGoal: patient.careGoal ?? 'Duy trì huyết áp & sức khỏe ổn định',
    birthDate: patient.birthDate,
    gender: patient.gender,
    customFields: Array.isArray(patient.customFields) ? patient.customFields : [],
  });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: patient.name || DEFAULT_MEMBER_NAME,
        diagnosis: patient.diagnosis ?? '',
        hospital: patient.hospital ?? '',
        room: patient.room ?? '',
        notes: patient.notes ?? '',
        emergencyPhone: patient.emergencyPhone ?? '',
        statusBadge: patient.statusBadge ?? 'Theo dõi sức khỏe gia đình',
        conditionTag: patient.conditionTag ?? 'Theo dõi tại nhà',
        headerBadge: patient.headerBadge ?? 'Tại nhà',
        careMode: patient.careMode ?? 'Hằng ngày',
        careGoal: patient.careGoal ?? 'Duy trì huyết áp & sức khỏe ổn định',
        birthDate: patient.birthDate,
        gender: patient.gender,
        customFields: Array.isArray(patient.customFields)
          ? patient.customFields.map((f) => ({ ...f }))
          : [],
      });
      setErrorMsg('');
    }
  }, [isOpen, patient]);

  if (!isOpen) return null;

  const handleAddCustomField = (
    label = '',
    value = '',
    section: 'profile' | 'care' = 'profile'
  ) => {
    const newField: PatientCustomField = {
      id: `pf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      value,
      section,
    };
    setFormData((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), newField],
    }));
  };

  const handleUpdateCustomField = (
    id: string,
    patch: Partial<PatientCustomField>
  ) => {
    setFormData((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).map((f) =>
        f.id === id ? { ...f, ...patch } : f
      ),
    }));
  };

  const handleDeleteCustomField = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).filter((f) => f.id !== id),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên người thân');
      return;
    }

    const cleanedCustomFields = (formData.customFields || [])
      .map((f) => ({
        ...f,
        label: f.label.trim(),
        value: f.value.trim(),
      }))
      .filter((f) => f.label && f.value);

    const finalInfo: PatientInfo = {
      ...patient,
      ...formData,
      name: formData.name.trim(),
      hospital: formData.hospital.trim(),
      room: formData.room.trim(),
      diagnosis: formData.diagnosis.trim(),
      notes: formData.notes.trim(),
      emergencyPhone: (formData.emergencyPhone || '').trim(),
      statusBadge: (formData.statusBadge ?? '').trim(),
      conditionTag: (formData.conditionTag ?? '').trim(),
      headerBadge: (formData.headerBadge ?? '').trim(),
      careMode: (formData.careMode ?? '').trim(),
      careGoal: (formData.careGoal ?? '').trim(),
      customFields: cleanedCustomFields,
      healthProfiles: patient.healthProfiles,
    };

    onUpdated(finalInfo);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl backdrop-blur-sm">
              🏥
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black">
                Quản Lý Toàn Bộ Thông Tin Hồ Sơ Sức Khỏe
              </h3>
              <p className="text-xs text-blue-100">
                Thêm, sửa, xoá từng mục hồ sơ, nhãn trạng thái &amp; chế độ chăm sóc - Đồng bộ Google Sheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ chỉnh sửa hồ sơ"
            className="min-h-[48px] min-w-[48px] rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* PHẦN 1: THÔNG TIN ĐỊNH DANH & NHÃN TRẠNG THÁI */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900">
                1. Định danh &amp; Nhãn trạng thái hiển thị
              </h4>
              <span className="text-[11px] text-slate-600">
                Xoá trống ô nhãn nếu muốn ẩn nhãn đó trên giao diện
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên người thân <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder="VD: Đinh Hồng Phong"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Nhãn tình trạng (cạnh tên)
                  </label>
                  {formData.conditionTag && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, conditionTag: '' })}
                      className="text-[11px] text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Eraser className="w-3 h-3" /> Xoá nhãn
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.conditionTag || ''}
                  onChange={(e) => setFormData({ ...formData, conditionTag: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder="VD: Huyết áp & Tim mạch / Phục hồi tại nhà"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Nhãn tiêu đề đầu thẻ hồ sơ
                  </label>
                  {formData.statusBadge && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, statusBadge: '' })}
                      className="text-[11px] text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Eraser className="w-3 h-3" /> Xoá nhãn
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.statusBadge || ''}
                  onChange={(e) => setFormData({ ...formData, statusBadge: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder="VD: Theo dõi sức khỏe gia đình"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Nhãn vị trí trên thanh Header
                  </label>
                  {formData.headerBadge && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, headerBadge: '' })}
                      className="text-[11px] text-rose-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Eraser className="w-3 h-3" /> Xoá nhãn
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.headerBadge || ''}
                  onChange={(e) => setFormData({ ...formData, headerBadge: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder="VD: Tại nhà / Tại viện"
                />
              </div>
            </div>
          </div>

          {/* PHẦN 2: CHẨN ĐOÁN, CHỈ ĐỊNH & KHỐI CHẾ ĐỘ CHĂM SÓC */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900">
              2. Thông tin Bệnh viện, Chẩn đoán, Chỉ định &amp; Chế độ chăm sóc
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Bệnh viện / Cơ sở y tế điều trị
                  </label>
                  {formData.hospital && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, hospital: '' })}
                      className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Xoá
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.hospital}
                  onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder="VD: Bệnh viện Đại học Y - Hà Nội"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Vị trí / Khoa phòng / Nơi chăm sóc
                  </label>
                  {formData.room && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, room: '' })}
                      className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Xoá
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder="VD: Phục hồi tại nhà / Trung tâm cấp cứu & HSTC"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Chế độ chăm sóc (Khối bên phải)
                  </label>
                  {formData.careMode && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, careMode: '' })}
                      className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Xoá
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.careMode || ''}
                  onChange={(e) => setFormData({ ...formData, careMode: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder="VD: Liên tục 24/7 / Theo dõi hàng ngày"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mục tiêu chăm sóc (Khối bên phải)
                  </label>
                  {formData.careGoal && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, careGoal: '' })}
                      className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Xoá
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.careGoal || ''}
                  onChange={(e) => setFormData({ ...formData, careGoal: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                  placeholder="VD: Kiểm soát HA & Phục hồi vận động"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Chẩn đoán y khoa
                </label>
                {formData.diagnosis && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, diagnosis: '' })}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Xoá nội dung
                  </button>
                )}
              </div>
              <input
                type="text"
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                placeholder="VD: Phục hồi chức năng sau tai biến mạch máu não..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Chỉ định chính / Lưu ý chăm sóc đặc biệt
                </label>
                {formData.notes && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, notes: '' })}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Xoá nội dung
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="VD: Đo huyết áp sáng/tối trước khi uống thuốc, tập vận động nhẹ nhàng..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Bác sĩ điều trị / Số điện thoại liên hệ khẩn cấp
                </label>
                {formData.emergencyPhone && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, emergencyPhone: '' })}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Xoá
                  </button>
                )}
              </div>
              <input
                type="text"
                value={formData.emergencyPhone || ''}
                onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                placeholder="VD: 0913 218 765 (BS. Hùng)"
              />
            </div>
          </div>

          <PatientCustomFieldsSection
            patientName={formData.name}
            customFields={formData.customFields || []}
            onAddField={handleAddCustomField}
            onUpdateField={handleUpdateCustomField}
            onDeleteField={handleDeleteCustomField}
          />

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white pb-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer min-h-[48px] min-w-[48px]"
            >
              Huỷ bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer min-h-[48px] min-w-[48px]"
            >
              <Save className="w-4 h-4" />
              <span>Lưu toàn bộ hồ sơ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
