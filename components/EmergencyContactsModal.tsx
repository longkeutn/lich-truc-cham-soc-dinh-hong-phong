'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { EmergencyContact, PatientInfo } from '@/lib/types';
import { PATIENT_INFO } from '@/lib/config';
import {
  PhoneCall,
  Phone,
  Plus,
  X,
  Copy,
  Check,
  Edit2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Search,
  Stethoscope,
  Ambulance,
  Users,
  Activity,
  Heart,
  FileText,
  MapPin,
  ShieldAlert,
  Volume2,
  Square,
} from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';

interface EmergencyContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts?: EmergencyContact[];
  patientInfo?: PatientInfo;
  onSaveContact?: (contact: EmergencyContact) => Promise<void>;
  onDeleteContact?: (id: string, name: string) => Promise<void>;
}

const DEFAULT_EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    id: 'bs-hung',
    name: 'BS. Nguyễn Văn Hùng',
    category: 'doctor',
    phone: '0913 218 765',
    note: 'Bác sĩ điều trị chính ICU - Bệnh viện Bạch Mai. Gọi khi bệnh nhân có biểu hiện sốt cao co giật hoặc khó thở tím tái',
    address: 'Khoa Hồi sức tích cực (ICU), Bệnh viện Bạch Mai, Hà Nội',
    isPrimary: true,
  },
  {
    id: 'cap-cuu-115',
    name: 'Cấp cứu 115 Hà Nội',
    category: 'ambulance',
    phone: '115',
    note: 'Tổng đài điều phối xe cấp cứu chuyên dụng có bình oxy và máy hút đờm',
    address: 'Toàn thành phố Hà Nội',
    isPrimary: true,
  },
  {
    id: 'dieu-duong-thu',
    name: 'Điều Dưỡng Thu (Thay sonde & Tiêm truyền)',
    category: 'nurse',
    phone: '0904 888 222',
    note: 'Hỗ trợ đặt lại ống thông dạ dày (sonde ăn) khi bị tuột hoặc tắc, đặt ống thông tiểu và truyền đạm tại nhà',
    address: 'Cách nhà 1.5km - Có mặt sau 20 phút',
    isPrimary: false,
  },
  {
    id: 'ong-nam-hang-xom',
    name: 'Bác Nam (Tổ trưởng / Hàng xóm sát vách)',
    category: 'neighbor',
    phone: '0988 333 444',
    note: 'Hỗ trợ bế người bệnh lên cáng khi cần xe cấp cứu, mở cổng ngõ cho xe vào',
    address: 'Nhà số 14 sát vách',
    isPrimary: false,
  },
  {
    id: 'phong-truc-khoa',
    name: 'Phòng trực cấp cứu Bạch Mai',
    category: 'doctor',
    phone: '024 3869 3731',
    note: 'Đường dây nóng khoa Cấp cứu tiếp nhận bệnh nhân chuyển viện khẩn cấp',
    address: 'Số 78 Đường Giải Phóng, Phương Mai, Đống Đa, Hà Nội',
    isPrimary: false,
  },
  {
    id: 'nguoi-dieu-phoi-phuong',
    name: 'Bác Thành (Trưởng ban điều phối)',
    category: 'family',
    phone: '0912 345 678',
    note: 'Bác cả gia đình - Điều phối viện phí, liên hệ bác sĩ và phân công ca trực',
    address: 'Túc trực thường xuyên',
    isPrimary: true,
  },
];

const CATEGORY_MAP: Record<
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

export default function EmergencyContactsModal({
  isOpen,
  onClose,
  contacts: contactsProp,
  patientInfo: patientInfoProp,
  onSaveContact,
  onDeleteContact,
}: EmergencyContactsModalProps) {
  const patient = patientInfoProp || PATIENT_INFO;
  const [localContacts, setLocalContacts] = useState<EmergencyContact[]>(
    contactsProp || DEFAULT_EMERGENCY_CONTACTS
  );

  useEffect(() => {
    if (contactsProp) {
      setLocalContacts(contactsProp);
    }
  }, [contactsProp]);

  const { supported, isSpeaking, currentText, speak, stop } = useSpeech();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Thêm/Sửa số liên hệ
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<EmergencyContact, 'id'>>({
    name: '',
    category: 'doctor',
    phone: '',
    note: '',
    address: '',
    isPrimary: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const handleCopyPhone = (id: string, phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    navigator.clipboard.writeText(cleanPhone || phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAddForm = () => {
    setEditingContactId(null);
    setFormData({
      name: '',
      category: 'doctor',
      phone: '',
      note: '',
      address: '',
      isPrimary: false,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (contact: EmergencyContact) => {
    setEditingContactId(contact.id);
    setFormData({
      name: contact.name,
      category: contact.category,
      phone: contact.phone,
      note: contact.note || '',
      address: contact.address || '',
      isPrimary: Boolean(contact.isPrimary),
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleDeleteContact = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc muốn xoá số điện thoại "${name}" khỏi danh bạ khẩn cấp?`)) {
      setLocalContacts((prev) => prev.filter((c) => c.id !== id));
      if (onDeleteContact) {
        await onDeleteContact(id, name);
      }
    }
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        'Khôi phục danh bạ về mặc định của Bệnh viện Bạch Mai, 115 và bác sĩ trực?'
      )
    ) {
      setLocalContacts(DEFAULT_EMERGENCY_CONTACTS);
      setIsFormOpen(false);
      setEditingContactId(null);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập họ tên hoặc tên cơ quan/đơn vị');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Vui lòng nhập số điện thoại liên lạc');
      return;
    }

    const contactToSave: EmergencyContact = {
      id: editingContactId || `emg-${Date.now()}`,
      name: formData.name.trim(),
      category: formData.category,
      phone: formData.phone.trim(),
      note: formData.note?.trim() || undefined,
      address: formData.address?.trim() || undefined,
      isPrimary: formData.isPrimary,
    };

    setLocalContacts((prev) => {
      const idx = prev.findIndex((c) => c.id === contactToSave.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = contactToSave;
        return copy;
      }
      return [contactToSave, ...prev];
    });

    if (onSaveContact) {
      await onSaveContact(contactToSave);
    }

    setIsFormOpen(false);
    setEditingContactId(null);
  };

  // Filtered contacts
  const filteredContacts = localContacts.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.phone.toLowerCase().includes(query) ||
      (item.note && item.note.toLowerCase().includes(query)) ||
      (item.address && item.address.toLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  });

  // Speech for all emergency contacts
  const allContactsSpeech = useMemo(() => {
    const primary = localContacts.filter((c) => c.isPrimary);
    const lines = primary.map(
      (c) => `${c.name}, số điện thoại ${c.phone.split('').join(' ')}.`
    );
    return `Danh bạ số khẩn cấp cho người bệnh: Cấp cứu y tế: 1 1 5. ${lines.join(' ')}`;
  }, [localContacts]);

  const isSpeakingAll = isSpeaking && currentText === allContactsSpeech;

  const handleToggleSpeakAll = () => {
    if (isSpeakingAll) {
      stop();
    } else {
      speak(allContactsSpeech);
    }
  };

  const handleSpeakContact = (contact: EmergencyContact) => {
    const digits = contact.phone.split('').join(' ');
    const text = `${contact.name}, số điện thoại: ${digits}. ${contact.note ? 'Ghi chú: ' + contact.note : ''}`;
    if (isSpeaking && currentText === text) {
      stop();
    } else {
      speak(text);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl shadow-rose-950/60 text-slate-100 overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b-2 border-slate-700 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-600/30 text-rose-300 border-2 border-rose-500/60 shrink-0">
              <PhoneCall className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                  Số Điện Thoại Khẩn Cấp (SOS)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/30 text-rose-200 border border-rose-500/60">
                  Google Sheets Đồng Bộ
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                Bác sĩ ICU, Cấp cứu 115, Điều dưỡng tiêm truyền & Hàng xóm hỗ trợ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {supported && (
              <button
                type="button"
                onClick={handleToggleSpeakAll}
                id="btn-speak-emergency-all"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition min-h-[44px] cursor-pointer shadow ${
                  isSpeakingAll
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 hover:text-white'
                }`}
                title={isSpeakingAll ? 'Dừng đọc danh bạ' : 'Đọc to danh bạ số khẩn cấp'}
              >
                {isSpeakingAll ? (
                  <>
                    <Square className="w-4 h-4 fill-white shrink-0" />
                    <span>Dừng</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="hidden sm:inline">Đọc số SOS</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nội dung có thanh cuộn */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Banner Quay Số Nhanh 115 & BS Trực */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="tel:115"
              className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white flex items-center justify-between shadow-lg shadow-rose-950/50 transition active:scale-95 group min-h-[60px] border-2 border-rose-400"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-xl">
                  115
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-rose-100">
                    Gọi Cấp Cứu Y Tế
                  </div>
                  <div className="text-base font-black text-white">Tổng Đài 115 Hà Nội</div>
                </div>
              </div>
              <Phone className="w-6 h-6 text-white group-hover:scale-110 transition" />
            </a>

            <a
              href={`tel:${patient.emergencyPhone?.replace(/[^0-9]/g, '') || '0913218765'}`}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white flex items-center justify-between shadow-lg shadow-blue-950/50 transition active:scale-95 group min-h-[60px] border-2 border-blue-400"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                  ICU
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-100">
                    Bác Sĩ Điều Trị Chính
                  </div>
                  <div className="text-base font-black text-white truncate max-w-[170px]">
                    BS. Nguyễn Văn Hùng
                  </div>
                </div>
              </div>
              <Phone className="w-6 h-6 text-white group-hover:scale-110 transition" />
            </a>
          </div>

          {/* Hộp thông tin nhanh bệnh nhân */}
          <div className="p-3.5 rounded-xl bg-slate-950 border-2 border-slate-700 text-xs sm:text-sm text-slate-200 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong className="text-white">Bệnh nhân:</strong> {patient.name} ({patient.room})
              </span>
            </div>
            <span className="text-xs text-amber-300 font-bold">
              Chỉ định: Thở oxy & chống sặc sonde ăn
            </span>
          </div>

          {/* Tìm kiếm & Lọc danh mục */}
          <div className="space-y-2.5 pt-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm tên, số điện thoại, ghi chú hoặc địa chỉ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-800 text-white placeholder-slate-400 border-2 border-slate-600 focus:border-rose-500 focus:outline-none text-xs sm:text-sm min-h-[46px] font-medium"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
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
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-2 rounded-xl whitespace-nowrap font-bold border-2 transition min-h-[40px] cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-rose-600 text-white border-rose-400 shadow'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:text-white'
                }`}
              >
                Tất cả ({localContacts.length})
              </button>
              {(Object.keys(CATEGORY_MAP) as EmergencyContact['category'][]).map((cat) => {
                const count = localContacts.filter((c) => c.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl whitespace-nowrap font-bold border-2 transition min-h-[40px] cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-rose-600 text-white border-rose-400 shadow'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:text-white'
                    }`}
                  >
                    {CATEGORY_MAP[cat].label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form thêm / sửa danh bạ */}
          {isFormOpen ? (
            <form
              onSubmit={handleSaveForm}
              className="p-4 rounded-2xl bg-slate-950 border-2 border-rose-500 space-y-3.5 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-2 border-b-2 border-slate-700">
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <PhoneCall className="w-5 h-5 text-rose-400" />
                  <span>{editingContactId ? 'Chỉnh sửa số liên hệ' : 'Thêm số liên hệ khẩn cấp mới (Lưu Sheet)'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white"
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
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white border-2 border-slate-600 text-xs sm:text-sm focus:border-rose-500 focus:outline-none min-h-[44px]"
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
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white border-2 border-slate-600 text-xs sm:text-sm focus:border-rose-500 focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-200 block mb-1 font-bold">
                    Nhóm đối tượng
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as EmergencyContact['category'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white border-2 border-slate-600 text-xs sm:text-sm focus:border-rose-500 focus:outline-none min-h-[44px]"
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
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white border-2 border-slate-600 text-xs sm:text-sm focus:border-rose-500 focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-200 block mb-1 font-bold">
                  Ghi chú chuyên biệt (Hỗ trợ khi nào, chỉ dẫn khẩn cấp...)
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Gọi khi cần hút đờm sâu hoặc có xe cấp cứu đến để mở cổng..."
                  value={formData.note || ''}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 text-white border-2 border-slate-600 text-xs sm:text-sm focus:border-rose-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs sm:text-sm font-bold hover:bg-slate-700 transition min-h-[44px]"
                >
                  Huỷ bỏ
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold transition min-h-[44px] shadow"
                >
                  {editingContactId ? 'Cập nhật số điện thoại' : 'Lưu vào Google Sheet'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white border-2 border-rose-400 text-xs sm:text-sm font-bold flex items-center gap-2 transition min-h-[46px] cursor-pointer shadow"
              >
                <Plus className="w-5 h-5" />
                <span>Thêm số khẩn cấp mới</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition min-h-[44px] cursor-pointer border border-slate-600"
                title="Khôi phục về danh bạ bệnh viện gốc"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Khôi phục mặc định</span>
              </button>
            </div>
          )}

          {/* Danh sách các số điện thoại */}
          <div className="space-y-3">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs sm:text-sm border-2 border-dashed border-slate-700 rounded-2xl">
                Không tìm thấy số liên lạc nào phù hợp với từ khoá tìm kiếm.
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const categoryDef = CATEGORY_MAP[contact.category] || CATEGORY_MAP.doctor;
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
                      {supported && (
                        <button
                          type="button"
                          onClick={() => handleSpeakContact(contact)}
                          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border-2 border-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                          title="Đọc to số điện thoại này"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}

                      <a
                        href={`tel:${cleanPhone}`}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition active:scale-95 shadow min-h-[44px]"
                      >
                        <PhoneCall className="w-4 h-4" />
                        <span>Gọi ngay</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopyPhone(contact.id, contact.phone)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-2 border-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
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
                        onClick={() => handleOpenEditForm(contact)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-2 border-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteContact(contact.id, contact.name)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border-2 border-slate-600 hover:border-rose-700 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
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
        </div>

        {/* Footer Modal */}
        <div className="p-3.5 sm:p-4 border-t-2 border-slate-700 bg-slate-950 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-300 hidden sm:inline font-medium">
            Dữ liệu danh bạ được đồng bộ thời gian thực cho tất cả 7 thành viên
          </span>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-black transition min-h-[44px] cursor-pointer border border-slate-600"
          >
            Đóng Lại
          </button>
        </div>
      </div>
    </div>
  );
}
