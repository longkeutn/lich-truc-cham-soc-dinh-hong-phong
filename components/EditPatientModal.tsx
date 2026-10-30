'use client';

import React, { useState, useEffect } from 'react';
import { PatientInfo, PatientCustomField } from '@/lib/types';
import { DEFAULT_MEMBER_NAME } from '@/lib/config';
import { Plus, Trash2, X, Save, Sparkles, Eraser } from 'lucide-react';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientInfo;
  onUpdated: (newInfo: PatientInfo) => void;
}

const QUICK_FIELD_TEMPLATES: { label: string; placeholder: string; section: 'profile' | 'care' }[] = [
  { label: 'Năm sinh / Tuổi', placeholder: 'VD: 1958 (68 tuổi)', section: 'profile' },
  { label: 'Nhóm máu', placeholder: 'VD: Nhóm máu O+', section: 'profile' },
  { label: 'Tiền sử bệnh nền', placeholder: 'VD: Tăng huyết áp, tiểu đường tuýp 2', section: 'profile' },
  { label: 'Dị ứng thuốc / thức ăn', placeholder: 'VD: Không có dị ứng ghi nhận', section: 'profile' },
  { label: 'Số thẻ BHYT', placeholder: 'VD: DN4010123456789', section: 'profile' },
  { label: 'Chế độ dinh dưỡng', placeholder: 'VD: Ăn mềm, giảm muối, chia 4 bữa/ngày', section: 'care' },
  { label: 'Thiết bị y tế tại nhà', placeholder: 'VD: Máy đo HA bắp tay, máy đo SpO2', section: 'care' },
];

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

    // Cập nhật giao diện, đóng hộp thoại tức thì (0ms) và đồng bộ qua callback onUpdated
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
        {/* Header */}
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
                Thêm, sửa, xoá từng mục hồ sơ, nhãn trạng thái & chế độ chăm sóc — Đồng bộ Google Sheets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
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
                1. Định danh & Nhãn trạng thái hiển thị
              </h4>
              <span className="text-[11px] text-slate-500">
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Tại nhà / Tại viện"
                />
              </div>
            </div>
          </div>

          {/* PHẦN 2: CHẨN ĐOÁN, CHỈ ĐỊNH & KHỐI CHẾ ĐỘ CHĂM SÓC */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900">
              2. Thông tin Bệnh viện, Chẩn đoán, Chỉ định & Chế độ chăm sóc
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: 0913 218 765 (BS. Hùng)"
              />
            </div>
          </div>

          {/* PHẦN 3: THÊM / SỬA / XOÁ CÁC MỤC THÔNG TIN BỆNH NHÂN TUỲ CHỈNH */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  3. Các mục thông tin sức khỏe bổ sung (Thêm / Sửa / Xoá tự do)
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Thêm bất kỳ thông tin nào của {formData.name || 'người thân'} (Năm sinh, Nhóm máu, Tiền sử bệnh, Dị ứng, BHYT...)
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleAddCustomField('', '', 'profile')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm mục mới</span>
              </button>
            </div>

            {/* Nút gợi ý thêm nhanh 1 chạm */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_FIELD_TEMPLATES.map((tpl) => {
                const alreadyExists = (formData.customFields || []).some(
                  (f) => f.label.toLowerCase() === tpl.label.toLowerCase()
                );
                if (alreadyExists) return null;
                return (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => handleAddCustomField(tpl.label, '', tpl.section)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-semibold transition cursor-pointer"
                  >
                    + {tpl.label}
                  </button>
                );
              })}
            </div>

            {/* Danh sách các mục đang có */}
            {(formData.customFields || []).length === 0 ? (
              <div className="text-center py-4 bg-white/80 rounded-xl border border-dashed border-indigo-200 text-xs text-slate-500">
                Chưa có mục thông tin bổ sung nào. Bấm các nút gợi ý phía trên hoặc bấm <strong>&quot;+ Thêm mục mới&quot;</strong> để thêm.
              </div>
            ) : (
              <div className="space-y-2.5">
                {(formData.customFields || []).map((field, index) => (
                  <div
                    key={field.id}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-2xs"
                  >
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) =>
                        handleUpdateCustomField(field.id, { label: e.target.value })
                      }
                      placeholder={`Tên mục ${index + 1} (VD: Nhóm máu)`}
                      className="sm:w-44 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) =>
                        handleUpdateCustomField(field.id, { value: e.target.value })
                      }
                      placeholder="Nội dung chi tiết..."
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-1.5 justify-between sm:justify-end">
                      <select
                        value={field.section || 'profile'}
                        onChange={(e) =>
                          handleUpdateCustomField(field.id, {
                            section: e.target.value as 'profile' | 'care',
                          })
                        }
                        aria-label="Vị trí hiển thị"
                        className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700"
                      >
                        <option value="profile">Cột Hồ sơ (Trái)</option>
                        <option value="care">Hộp Chăm sóc (Phải)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomField(field.id)}
                        title="Xoá mục thông tin này"
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white pb-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Huỷ bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-500 active:scale-95 transition shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
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
