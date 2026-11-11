'use client';

import React from 'react';
import type { EmergencyContact } from '@/lib/types';
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Check,
  Copy,
  Edit2,
  FileText,
  Heart,
  MapPin,
  PhoneCall,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  Users,
  Volume2,
  X,
} from 'lucide-react';

export const EMERGENCY_CATEGORY_MAP: Record<
  EmergencyContact['category'],
  { label: string; badgeColor: string; icon: React.ComponentType<{ className?: string }> }
> = {
  doctor: {
    label: 'Bác sĩ / BV',
    badgeColor: 'bg-blue-500/25 text-blue-200 border-blue-400',
    icon: Stethoscope,
  },
  ambulance: {
    label: 'Cấp cứu 115',
    badgeColor: 'bg-rose-500/25 text-rose-200 border-rose-400',
    icon: Ambulance,
  },
  neighbor: {
    label: 'Hàng xóm',
    badgeColor: 'bg-amber-500/25 text-amber-200 border-amber-400',
    icon: Users,
  },
  nurse: {
    label: 'Điều dưỡng',
    badgeColor: 'bg-emerald-500/25 text-emerald-200 border-emerald-400',
    icon: Activity,
  },
  family: {
    label: 'Gia đình',
    badgeColor: 'bg-purple-500/25 text-purple-200 border-purple-400',
    icon: Heart,
  },
};

export interface EmergencyContactsListProps {
  localContacts: EmergencyContact[];
  filteredContacts: EmergencyContact[];
  searchQuery: string;
  onChangeSearchQuery: (val: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  isFormOpen: boolean;
  editingContactId: string | null;
  formData: Omit<EmergencyContact, 'id'>;
  onChangeFormData: (data: Omit<EmergencyContact, 'id'>) => void;
  formError: string | null;
  onOpenAddForm: () => void;
  onOpenEditForm: (contact: EmergencyContact) => void;
  onCloseForm: () => void;
  onSaveForm: (e: React.FormEvent) => void;
  onDeleteContact: (id: string, name: string) => void;
  copiedId: string | null;
  onCopyPhone: (id: string, phone: string) => void;
  speechSupported: boolean;
  onSpeakContact: (contact: EmergencyContact) => void;
}

export default function EmergencyContactsList({
  localContacts,
  filteredContacts,
  searchQuery,
  onChangeSearchQuery,
  selectedCategory,
  onSelectCategory,
  isFormOpen,
  editingContactId,
  formData,
  onChangeFormData,
  formError,
  onOpenAddForm,
  onOpenEditForm,
  onCloseForm,
  onSaveForm,
  onDeleteContact,
  copiedId,
  onCopyPhone,
  speechSupported,
  onSpeakContact,
}: EmergencyContactsListProps) {
  return (
    <>
      {/* Tìm kiếm & Lọc danh mục */}
      <div className="space-y-2.5 pt-1">
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm tên, số điện thoại, ghi chú hoặc địa chỉ..."
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-800 text-white placeholder-slate-400 border-2 border-slate-600 focus:border-rose-500 focus:outline-none text-xs sm:text-sm min-h-[48px] font-medium"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Phân loại nhanh */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={`px-3.5 py-2 rounded-xl whitespace-nowrap font-bold border-2 transition min-h-[48px] cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-rose-600 text-white border-rose-400 shadow'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:text-white'
            }`}
          >
            Tất cả ({localContacts.length})
          </button>
          {(Object.keys(EMERGENCY_CATEGORY_MAP) as EmergencyContact['category'][]).map((cat) => {
            const count = localContacts.filter((c) => c.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap font-bold border-2 transition min-h-[48px] cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-rose-600 text-white border-rose-400 shadow'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:text-white'
                }`}
              >
                {EMERGENCY_CATEGORY_MAP[cat].label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Form thêm / sửa danh bạ */}
      {isFormOpen ? (
        <form
          onSubmit={onSaveForm}
          className="p-4 rounded-2xl bg-slate-950 border-2 border-rose-500 space-y-3.5 animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-2 border-b-2 border-slate-700">
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-rose-400" />
              <span>
                {editingContactId ? 'Chỉnh sửa số liên hệ' : 'Thêm số liên hệ khẩn cấp mới (Lưu Sheet)'}
              </span>
            </h3>
            <button
              type="button"
              onClick={onCloseForm}
              className="p-1.5 text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border-2 border-rose-600 text-rose-200 text-xs sm:text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-200 block mb-1 font-bold">
                Họ tên / Đơn vị *
              </label>
              <input
                type="text"
                required
                placeholder="VD: BS. Tuấn (Trực đêm), Bác Nam..."
                value={formData.name}
                onChange={(e) => onChangeFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white border-2 border-slate-600 text-xs sm:text-sm focus:border-rose-500 focus:outline-none min-h-[48px]"
              />
            </div>

            <div>
              <label className="text-xs text-slate-200 block mb-1 font-bold">
                Số điện thoại *
              </label>
              <input
                type="tel"
                required
                placeholder="VD: 0912 345 678 hoặc 115"
                value={formData.phone}
                onChange={(e) => onChangeFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white border-2 border-slate-600 text-xs sm:text-sm focus:border-rose-500 focus:outline-none min-h-[48px]"
              />
            </div>

            <div>
              <label className="text-xs text-slate-200 block mb-1 font-bold">
                Nhóm đối tượng
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  onChangeFormData({
                    ...formData,
                    category: e.target.value as EmergencyContact['category'],
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white border-2 border-slate-600 text-xs sm:text-sm focus:border-rose-500 focus:outline-none min-h-[48px]"
              >
                <option value="doctor">Bác sĩ / Bệnh viện</option>
                <option value="ambulance">Cấp cứu 115</option>
                <option value="neighbor">Hàng xóm / Trợ giúp</option>
                <option value="nurse">Hộ lý / Điều dưỡng</option>
                <option value="family">Gia đình</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-200 block mb-1 font-bold">
                Địa chỉ / Vị trí
              </label>
              <input
                type="text"
                placeholder="VD: Phòng 402 Bạch Mai, Nhà 14 đối diện..."
                value={formData.address || ''}
                onChange={(e) => onChangeFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white border-2 border-slate-600 text-xs sm:text-sm focus:border-rose-500 focus:outline-none min-h-[48px]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-200 block mb-1 font-bold">
              Ghi chú chuyên biệt (Hỗ trợ khi nào, chỉ dẫn khẩn cấp...)
            </label>
            <textarea
              rows={2}
              placeholder="VD: Gọi khi cần hỗ trợ y tế khẩn cấp hoặc có xe cấp cứu đến..."
              value={formData.note || ''}
              onChange={(e) => onChangeFormData({ ...formData, note: e.target.value })}
              className="w-full p-2.5 rounded-xl bg-slate-800 text-white border-2 border-slate-600 text-xs sm:text-sm focus:border-rose-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onCloseForm}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs sm:text-sm font-bold hover:bg-slate-700 transition min-h-[48px]"
            >
              Huỷ bỏ
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold transition min-h-[48px] shadow"
            >
              {editingContactId ? 'Cập nhật số điện thoại' : 'Lưu vào Google Sheet'}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenAddForm}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border-2 border-rose-400 text-xs sm:text-sm font-bold flex items-center gap-2 transition min-h-[48px] cursor-pointer shadow"
          >
            <Plus className="w-5 h-5" />
            <span>Thêm số khẩn cấp mới</span>
          </button>
        </div>
      )}

      {/* Danh sách các số điện thoại */}
      <div className="space-y-3">
        {filteredContacts.length === 0 ? (
          <div className="p-8 text-center text-slate-300 text-xs sm:text-sm border-2 border-dashed border-slate-700 rounded-2xl space-y-3">
            <PhoneCall className="w-10 h-10 text-slate-500 mx-auto" />
            <p className="font-bold text-slate-200">
              {localContacts.length === 0
                ? 'Chưa có số liên lạc khẩn cấp nào trong danh bạ.'
                : 'Không tìm thấy số liên lạc nào phù hợp với từ khoá tìm kiếm.'}
            </p>
            {localContacts.length === 0 && !isFormOpen && (
              <button
                type="button"
                onClick={onOpenAddForm}
                className="min-h-[48px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm số bác sĩ / cấp cứu ngay</span>
              </button>
            )}
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const categoryDef =
              EMERGENCY_CATEGORY_MAP[contact.category] || EMERGENCY_CATEGORY_MAP.doctor;
            const IconComponent = categoryDef.icon;
            const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');

            return (
              <div
                key={contact.id}
                className="p-4 rounded-2xl bg-slate-950 border-2 border-slate-700 hover:border-slate-600 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-black text-white tracking-tight">
                      {contact.name}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${categoryDef.badgeColor}`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      <span>{categoryDef.label}</span>
                    </span>

                    {contact.isPrimary && (
                      <span className="px-2 py-0.5 rounded text-xs font-black bg-rose-600 text-white">
                        Ưu tiên
                      </span>
                    )}
                  </div>

                  <div className="text-lg font-black text-rose-400 font-mono tracking-wide">
                    {contact.phone}
                  </div>

                  {contact.note && (
                    <p className="text-xs sm:text-sm text-slate-300 flex items-start gap-1.5">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{contact.note}</span>
                    </p>
                  )}

                  {contact.address && (
                    <p className="text-xs text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{contact.address}</span>
                    </p>
                  )}
                </div>

                {/* Các nút hành động thao tác nhanh */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 flex-wrap">
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={() => onSpeakContact(contact)}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border-2 border-slate-600 transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
                      title="Đọc to số điện thoại này"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}

                  <a
                    href={`tel:${cleanPhone}`}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition active:scale-95 shadow min-h-[48px]"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Gọi ngay</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => onCopyPhone(contact.id, contact.phone)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-2 border-slate-600 transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
                    title="Sao chép số điện thoại"
                  >
                    {copiedId === contact.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenEditForm(contact)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-2 border-slate-600 transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
                    title="Chỉnh sửa thông tin"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteContact(contact.id, contact.name)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border-2 border-slate-600 hover:border-rose-700 transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
                    title="Xoá khỏi danh bạ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
