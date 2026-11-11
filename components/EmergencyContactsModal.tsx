'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { EmergencyContact, PatientInfo } from '@/lib/types';
import { PATIENT_INFO } from '@/lib/config';
import {
  PhoneCall,
  Phone,
  X,
  ShieldAlert,
  Volume2,
  Square,
} from 'lucide-react';
import { useSpeech } from '@/hooks/useSpeech';
import EmergencyContactsList from '@/components/family-management/EmergencyContactsList';

interface EmergencyContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts?: EmergencyContact[];
  patientInfo?: PatientInfo;
  onSaveContact?: (contact: EmergencyContact) => Promise<void>;
  onDeleteContact?: (id: string, name: string) => Promise<void>;
}

export default function EmergencyContactsModal({
  isOpen,
  onClose,
  contacts: contactsProp,
  patientInfo: patientInfoProp,
  onSaveContact,
  onDeleteContact,
}: EmergencyContactsModalProps) {
  const patient: PatientInfo = patientInfoProp || PATIENT_INFO;
  const [localContacts, setLocalContacts] = useState<EmergencyContact[]>(contactsProp || []);

  useEffect(() => {
    if (Array.isArray(contactsProp)) {
      setLocalContacts(contactsProp);
    }
  }, [contactsProp]);

  const { supported, isSpeaking, currentText, speak, stop } = useSpeech();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const filteredContacts = useMemo(() => {
    return localContacts.filter((item) => {
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
  }, [localContacts, selectedCategory, searchQuery]);

  const allContactsSpeech = useMemo(() => {
    const primary = localContacts.filter((c) => c.isPrimary);
    const lines = primary.map(
      (c) => `${c.name}, số điện thoại ${c.phone.split('').join(' ')}.`
    );
    return `Danh bạ số khẩn cấp cho gia đình: Cấp cứu y tế: 1 1 5. ${lines.join(' ')}`;
  }, [localContacts]);

  if (!isOpen) return null;

  const isSpeakingAll = isSpeaking && currentText === allContactsSpeech;

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

  const primaryDoctor =
    localContacts.find((c) => c.category === 'doctor') ||
    localContacts.find((c) => c.isPrimary && c.phone !== '115');
  const primaryDoctorPhone =
    primaryDoctor?.phone.replace(/[^0-9+]/g, '') ||
    patient.emergencyPhone?.replace(/[^0-9+]/g, '');

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
                Bác sĩ điều trị, Cấp cứu 115, Y tế &amp; Người thân hỗ trợ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {supported && (
              <button
                type="button"
                onClick={handleToggleSpeakAll}
                id="btn-speak-emergency-all"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition min-h-[48px] min-w-[48px] cursor-pointer shadow ${
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
              aria-label="Đóng danh bạ khẩn cấp"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
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
                  <div className="text-base font-black text-white">Tổng Đài Cấp Cứu 115</div>
                </div>
              </div>
              <Phone className="w-6 h-6 text-white group-hover:scale-110 transition" />
            </a>

            {(primaryDoctor || primaryDoctorPhone) && (
              <a
                href={`tel:${primaryDoctorPhone}`}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white flex items-center justify-between shadow-lg shadow-blue-950/50 transition active:scale-95 group min-h-[60px] border-2 border-blue-400"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm shrink-0">
                    BS
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-100">
                      Liên Hệ Y Tế Ưu Tiên
                    </div>
                    <div className="text-base font-black text-white truncate max-w-[180px]">
                      {primaryDoctor?.name || patient.emergencyPhone || 'Bác sĩ điều trị'}
                    </div>
                  </div>
                </div>
                <Phone className="w-6 h-6 text-white group-hover:scale-110 transition shrink-0" />
              </a>
            )}
          </div>

          {/* Hộp thông tin nhanh bệnh nhân */}
          <div className="p-3.5 rounded-xl bg-slate-950 border-2 border-slate-700 text-xs sm:text-sm text-slate-200 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong className="text-white">Người thân:</strong> {patient.name}
                {patient.room ? ` (${patient.room})` : ''}
              </span>
            </div>
            {patient.notes && (
              <span className="text-xs text-amber-300 font-bold">
                Lưu ý: {patient.notes}
              </span>
            )}
          </div>

          <EmergencyContactsList
            localContacts={localContacts}
            filteredContacts={filteredContacts}
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            isFormOpen={isFormOpen}
            editingContactId={editingContactId}
            formData={formData}
            onChangeFormData={setFormData}
            formError={formError}
            onOpenAddForm={handleOpenAddForm}
            onOpenEditForm={handleOpenEditForm}
            onCloseForm={() => setIsFormOpen(false)}
            onSaveForm={handleSaveForm}
            onDeleteContact={handleDeleteContact}
            copiedId={copiedId}
            onCopyPhone={handleCopyPhone}
            speechSupported={supported}
            onSpeakContact={handleSpeakContact}
          />
        </div>

        {/* Footer Modal */}
        <div className="p-3.5 sm:p-4 border-t-2 border-slate-700 bg-slate-950 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-300 hidden sm:inline font-medium">
            Dữ liệu danh bạ được đồng bộ thời gian thực cho tất cả thành viên
          </span>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-black transition min-h-[48px] cursor-pointer border border-slate-600"
          >
            Đóng Lại
          </button>
        </div>
      </div>
    </div>
  );
}
