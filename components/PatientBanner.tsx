'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PATIENT_INFO, FAMILY_MEMBERS, DEFAULT_PATIENT_REMINDERS } from '@/lib/config';
import { FamilyMember, PatientDailyReminder, ReminderCategory, PatientInfo } from '@/lib/types';
import {
  AlertCircle,
  AlertTriangle,
  HeartPulse,
  Hospital,
  Pill,
  Stethoscope,
  Utensils,
  Pin,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Clock,
  User,
  X,
  BellRing,
} from 'lucide-react';

interface PatientBannerProps {
  currentMember?: FamilyMember | null;
  patientInfo?: PatientInfo;
  reminders?: PatientDailyReminder[];
  members?: FamilyMember[];
  onAddReminder?: (reminder: PatientDailyReminder) => Promise<void>;
  onDeleteReminder?: (id: string, title: string) => Promise<void>;
}

const CATEGORY_CONFIG: Record<
  ReminderCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badge: string }
> = {
  meds: {
    label: 'Liều thuốc',
    icon: Pill,
    color: 'text-amber-700',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  condition: {
    label: 'Tình trạng',
    icon: AlertTriangle,
    color: 'text-rose-700',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  doctor: {
    label: 'Bác sĩ dặn',
    icon: Stethoscope,
    color: 'text-sky-700',
    badge: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  feeding: {
    label: 'Ăn qua sonde',
    icon: Utensils,
    color: 'text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  general: {
    label: 'Lưu ý chung',
    icon: Pin,
    color: 'text-indigo-700',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
};

const PRESET_SUGGESTIONS = [
  { title: 'Uống thuốc hạ áp đúng giờ', category: 'meds' as ReminderCategory, isUrgent: true },
  { title: 'Hút đờm sạch trước cữ ăn', category: 'condition' as ReminderCategory, isUrgent: true },
  { title: 'Bơm súp ấm qua sonde đầu cao', category: 'feeding' as ReminderCategory, isUrgent: false },
  { title: 'Lật trở & vỗ rung tránh loét tì đè', category: 'general' as ReminderCategory, isUrgent: false },
  { title: 'Đo SpO2 & theo dõi nhịp thở', category: 'condition' as ReminderCategory, isUrgent: true },
];

export default function PatientBanner({
  currentMember,
  patientInfo: patientInfoProp,
  reminders: remindersProp,
  members: membersProp,
  onAddReminder,
  onDeleteReminder,
}: PatientBannerProps) {
  const patient = patientInfoProp || PATIENT_INFO;
  const familyList = membersProp && membersProp.length > 0 ? membersProp : FAMILY_MEMBERS;

  const [localReminders, setLocalReminders] = useState<PatientDailyReminder[]>(
    remindersProp || DEFAULT_PATIENT_REMINDERS
  );

  useEffect(() => {
    if (remindersProp) {
      setLocalReminders(remindersProp);
    }
  }, [remindersProp]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isSpeakingAll, setIsSpeakingAll] = useState(false);

  // Form states
  const [formCategory, setFormCategory] = useState<ReminderCategory>('meds');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formIsUrgent, setFormIsUrgent] = useState(false);
  const [formError, setFormError] = useState('');

  // Tự động gán người ghi nếu currentMember thay đổi
  useEffect(() => {
    if (currentMember) {
      setFormAuthor(`${currentMember.name} (${currentMember.relation})`);
    } else if (!formAuthor && familyList.length > 0) {
      setFormAuthor(`${familyList[0].name} (${familyList[0].relation})`);
    }
  }, [currentMember, formAuthor, familyList]);

  // Quản lý Web Speech API
  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
    setIsSpeakingAll(false);
  }, []);

  const speakText = useCallback(
    (text: string, id: string | 'all') => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      stopSpeech();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find((v) => v.lang.startsWith('vi') || v.lang.includes('VIE'));
      if (viVoice) {
        utterance.voice = viVoice;
      }

      utterance.onstart = () => {
        if (id === 'all') {
          setIsSpeakingAll(true);
        } else {
          setSpeakingId(id);
        }
      };

      utterance.onend = () => {
        setSpeakingId(null);
        setIsSpeakingAll(false);
      };

      utterance.onerror = () => {
        setSpeakingId(null);
        setIsSpeakingAll(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [stopSpeech]
  );

  // Đọc toàn bộ nhắc nhở quan trọng trong ngày
  const handleReadAloudAll = () => {
    if (isSpeakingAll) {
      stopSpeech();
      return;
    }

    if (localReminders.length === 0) {
      speakText('Hiện tại chưa có nhắc nhở quan trọng nào được ghi nhận cho bệnh nhân.', 'all');
      return;
    }

    const urgentCount = localReminders.filter((r) => r.isUrgent).length;
    let fullText = `Thông tin nhắc nhở quan trọng trong ngày cho bệnh nhân ${patient.name}. `;
    if (urgentCount > 0) {
      fullText += `Đặc biệt chú ý, có ${urgentCount} lưu ý khẩn cấp. `;
    }
    fullText += `Tổng số có ${localReminders.length} nhắc nhở như sau: `;

    localReminders.forEach((r, idx) => {
      const categoryLabel = CATEGORY_CONFIG[r.category]?.label || 'Lưu ý';
      const urgentPrefix = r.isUrgent ? 'Khẩn cấp! ' : '';
      fullText += `Số ${idx + 1}. Phân loại ${categoryLabel}: ${urgentPrefix}${r.title}. Nội dung chi tiết: ${r.content}. Người gửi: ${r.author}. `;
    });

    speakText(fullText, 'all');
  };

  // Đọc riêng một nhắc nhở
  const handleReadSingle = (reminder: PatientDailyReminder) => {
    if (speakingId === reminder.id) {
      stopSpeech();
      return;
    }
    const categoryLabel = CATEGORY_CONFIG[reminder.category]?.label || 'Lưu ý';
    const urgentPrefix = reminder.isUrgent ? 'Lưu ý khẩn cấp! ' : '';
    const text = `${urgentPrefix}Mục ${categoryLabel}: ${reminder.title}. Nội dung: ${reminder.content}. Ghi chú bởi ${reminder.author} lúc ${reminder.time}.`;
    speakText(text, reminder.id);
  };

  // Xử lý thêm nhắc nhở mới
  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập tiêu đề nhắc nhở');
      return;
    }
    if (!formContent.trim()) {
      setFormError('Vui lòng nhập nội dung chi tiết');
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newReminder: PatientDailyReminder = {
      id: `reminder-${Date.now()}`,
      category: formCategory,
      title: formTitle.trim(),
      content: formContent.trim(),
      author: formAuthor.trim() || 'Người nhà',
      time: timeStr,
      isUrgent: formIsUrgent,
    };

    setLocalReminders((prev) => [newReminder, ...prev]);

    if (onAddReminder) {
      await onAddReminder(newReminder);
    }

    // Reset form
    setFormTitle('');
    setFormContent('');
    setFormIsUrgent(false);
    setFormError('');
    setIsFormOpen(false);
  };

  // Xóa nhắc nhở
  const handleDeleteReminder = async (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc muốn xoá nhắc nhở: "${title}"?`)) {
      if (speakingId === id) {
        stopSpeech();
      }
      setLocalReminders((prev) => prev.filter((r) => r.id !== id));
      if (onDeleteReminder) {
        await onDeleteReminder(id, title);
      }
    }
  };

  // Lọc danh sách nhắc nhở theo danh mục
  const filteredReminders = localReminders.filter((r) => {
    if (filterCategory === 'all') return true;
    if (filterCategory === 'urgent') return r.isUrgent;
    return r.category === filterCategory;
  });

  const urgentTotal = localReminders.filter((r) => r.isUrgent).length;

  return (
    <div
      id="patient-banner-container"
      className="bg-white border-2 border-rose-200 rounded-3xl p-4 sm:p-6 shadow-sm relative overflow-hidden space-y-5"
    >
      <div className="absolute -right-10 -top-10 w-44 h-44 bg-rose-50 rounded-full blur-3xl pointer-events-none" />

      {/* PHẦN 1: THÔNG TIN HÀNH CHÍNH & CHẨN ĐOÁN BỆNH NHÂN */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 pb-5">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              Bệnh nhân theo dõi đặc biệt
            </span>
            <span className="text-xs text-slate-600 font-medium flex items-center gap-1 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              <Hospital className="w-3.5 h-3.5 text-rose-600" />
              {patient.hospital}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {patient.name}
            </h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-200 shadow-xs">
              Tai biến nặng
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
            <strong className="text-slate-900 font-bold">Chẩn đoán:</strong> {patient.diagnosis}
          </p>

          <p className="text-xs sm:text-sm text-rose-800 flex items-start gap-1.5 pt-0.5 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-rose-950 font-bold">Chỉ định chính:</strong> {patient.notes}
            </span>
          </p>
        </div>

        {/* Khối tóm tắt thông số trực */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:min-w-[260px] shrink-0 space-y-2.5 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between pb-1 border-b border-slate-200">
            <span className="flex items-center gap-1.5 text-rose-800 font-black">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              Chế độ chăm sóc
            </span>
            <span className="text-[11px] text-emerald-800 font-black px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300">
              Liên tục 24/7
            </span>
          </div>

          <div className="text-xs space-y-1.5 text-slate-700 font-medium">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Vị trí:</span>
              <span className="font-bold text-slate-900 text-right">{patient.room}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Mục tiêu:</span>
              <span className="font-bold text-emerald-700">Chống loét & duy trì SpO2</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Đội ngũ:</span>
              <span className="font-bold text-indigo-700">{familyList.length} thành viên gia đình</span>
            </div>
          </div>
        </div>
      </div>

      {/* PHẦN 2: TÍNH NĂNG NHẮC NHỞ QUAN TRỌNG TRONG NGÀY */}
      <div id="patient-important-reminders" className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/50 p-3 rounded-2xl border border-amber-200/80">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Nhắc nhở & Lưu ý quan trọng</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  {localReminders.length} ghi chú
                </span>
                {urgentTotal > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    {urgentTotal} khẩn cấp
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Đồng bộ thời gian thực từ Google Sheets để cả gia đình cùng nắm rõ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-read-aloud-reminders"
              onClick={handleReadAloudAll}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                isSpeakingAll
                  ? 'bg-rose-600 text-white animate-pulse hover:bg-rose-700'
                  : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-300'
              }`}
              title="Đọc to danh sách nhắc nhở bằng giọng nói tiếng Việt"
            >
              {isSpeakingAll ? (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span>Dừng đọc</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  <span>Đọc to nhắc nhở</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="btn-toggle-add-reminder"
              onClick={() => {
                setIsFormOpen(!isFormOpen);
                setFormError('');
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Ghi chú mới</span>
            </button>
          </div>
        </div>

        {/* Form thêm nhắc nhở */}
        {isFormOpen && (
          <form
            onSubmit={handleAddReminder}
            className="bg-white border-2 border-amber-400 rounded-2xl p-4 space-y-3.5 shadow-lg animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Thêm lưu ý mới cho bệnh nhân (Lưu Google Sheets)
              </span>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Phân loại lưu ý:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.keys(CATEGORY_CONFIG) as ReminderCategory[]).map((cat) => {
                  const cfg = CATEGORY_CONFIG[cat];
                  const Icon = cfg.icon;
                  const isSelected = formCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormCategory(cat)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 font-bold block mb-1">
                Gợi ý mẫu nhanh:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SUGGESTIONS.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormTitle(sug.title);
                      setFormCategory(sug.category);
                      setFormIsUrgent(sug.isUrgent);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] text-slate-700 font-medium transition-colors cursor-pointer"
                  >
                    + {sug.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tiêu đề nhắc nhở:
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: Thuốc hạ áp lúc 14h, Hút đờm trước cữ ăn..."
                  className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mức độ chú ý:
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border-2 border-slate-200 cursor-pointer hover:bg-slate-100">
                  <input
                    type="checkbox"
                    checked={formIsUrgent}
                    onChange={(e) => setFormIsUrgent(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-0 cursor-pointer accent-rose-600"
                  />
                  <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Cần chú ý khẩn
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nội dung chi tiết:
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={2}
                placeholder="Ví dụ: Đo huyết áp trước khi cho uống. Nếu HA tâm thu < 110 thì hoãn và báo bác sĩ điều trị..."
                className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold">Người ghi:</span>
                <select
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  className="bg-white border-2 border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="BS. Nguyễn Văn Thắng (ICU)">BS. Nguyễn Văn Thắng (ICU)</option>
                  {familyList.map((m) => (
                    <option key={m.id} value={`${m.name} (${m.relation})`}>
                      {m.name} ({m.relation})
                    </option>
                  ))}
                  <option value="Điều dưỡng ca trực">Điều dưỡng ca trực</option>
                  <option value="Người nhà chăm sóc">Người nhà chăm sóc</option>
                </select>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs active:scale-95 cursor-pointer"
                >
                  Lưu lên Sheet
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Bộ lọc danh mục */}
        {localReminders.length > 2 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({localReminders.length})
            </button>
            {urgentTotal > 0 && (
              <button
                type="button"
                onClick={() => setFilterCategory('urgent')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
                  filterCategory === 'urgent'
                    ? 'bg-rose-100 border border-rose-300 text-rose-800'
                    : 'bg-slate-100 text-rose-700 hover:bg-rose-50'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                Khẩn cấp ({urgentTotal})
              </button>
            )}
            {(Object.keys(CATEGORY_CONFIG) as ReminderCategory[]).map((cat) => {
              const count = localReminders.filter((r) => r.category === cat).length;
              if (count === 0) return null;
              const cfg = CATEGORY_CONFIG[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    filterCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Danh sách các nhắc nhở */}
        {filteredReminders.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
            <p className="text-xs text-slate-500 font-medium">
              Chưa có nhắc nhở nào trong mục này.
            </p>
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="text-xs text-amber-700 hover:underline font-bold cursor-pointer"
            >
              + Bấm vào đây để thêm lưu ý quan trọng mới
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredReminders.map((reminder) => {
              const catCfg = CATEGORY_CONFIG[reminder.category] || CATEGORY_CONFIG.general;
              const CategoryIcon = catCfg.icon;
              const isSpeakingThis = speakingId === reminder.id;

              return (
                <div
                  key={reminder.id}
                  className={`rounded-2xl p-3.5 transition-all relative flex flex-col justify-between border shadow-xs ${
                    reminder.isUrgent
                      ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border flex items-center gap-1 ${catCfg.badge}`}
                      >
                        <CategoryIcon className="w-3 h-3" />
                        <span>{catCfg.label}</span>
                      </span>

                      <div className="flex items-center gap-1">
                        {reminder.isUrgent && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-0.5 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Khẩn
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {reminder.time}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 tracking-tight leading-snug">
                      {reminder.title}
                    </h4>

                    <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {reminder.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-500 font-medium truncate flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{reminder.author}</span>
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReadSingle(reminder)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isSpeakingThis
                            ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-amber-800 hover:border-amber-300'
                        }`}
                        title="Đọc to lưu ý này"
                      >
                        {isSpeakingThis ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReminder(reminder.id, reminder.title)}
                        className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer"
                        title="Xoá nhắc nhở này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
