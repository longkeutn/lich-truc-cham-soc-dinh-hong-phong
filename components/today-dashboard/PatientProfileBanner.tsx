'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BellRing,
  ChevronDown,
  HeartPulse,
  Plus,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  FamilyMember,
  HealthProfileType,
  PatientDailyReminder,
  PatientInfo,
  ReminderCategory,
} from '@/lib/types';
import { PATIENT_INFO, getVietnamTimeStr } from '@/lib/config';
import { speakVietnameseReminder, stopSpeakingVietnamese } from '@/lib/notifications';
import { PatientInfoSummaryPanel } from './PatientInfoSummaryPanel';
import { ReminderFormCard } from './ReminderFormCard';
import { DailyRemindersBoard } from './DailyRemindersBoard';

export interface PatientBannerProps {
  currentMember?: FamilyMember | null;
  patientInfo?: PatientInfo;
  profileType?: HealthProfileType;
  patientDisplayName?: string;
  reminders?: PatientDailyReminder[];
  members?: FamilyMember[];
  onAddReminder?: (reminder: PatientDailyReminder) => Promise<void>;
  onDeleteReminder?: (id: string, title: string) => Promise<void>;
  onEditPatient?: () => void;
  onSavePatient?: (newInfo: PatientInfo) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function PatientProfileBanner({
  patientInfo: patientInfoProp,
  profileType = 'general_health',
  patientDisplayName,
  reminders: remindersProp,
  members: membersProp,
  onAddReminder,
  onDeleteReminder,
  onEditPatient,
  onSavePatient,
  onRefresh,
  isLoading,
}: PatientBannerProps) {
  const patient = patientInfoProp || PATIENT_INFO;
  const displayLabel = patientDisplayName || patient.name;
  const familyList = useMemo(() => membersProp || [], [membersProp]);

  const [localReminders, setLocalReminders] = useState<PatientDailyReminder[]>(
    remindersProp || []
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isSpeakingAll, setIsSpeakingAll] = useState(false);

  const [formCategory, setFormCategory] = useState<ReminderCategory>('meds');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formIsUrgent, setFormIsUrgent] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (Array.isArray(remindersProp)) setLocalReminders(remindersProp);
  }, [remindersProp]);

  useEffect(() => {
    if (!formAuthor && familyList.length > 0) {
      const first = familyList[0];
      setFormAuthor(`${first.name} (${first.relation})`);
    }
  }, [familyList, formAuthor]);

  const stopSpeech = useCallback(() => {
    stopSpeakingVietnamese();
    setSpeakingId(null);
    setIsSpeakingAll(false);
  }, []);

  useEffect(() => {
    return () => stopSpeakingVietnamese();
  }, []);

  const handleSpeakSingle = (item: PatientDailyReminder) => {
    if (speakingId === item.id) {
      stopSpeech();
      return;
    }
    stopSpeech();
    setSpeakingId(item.id);
    speakVietnameseReminder(
      `${item.title}. ${item.content !== item.title ? item.content : ''}`,
      () => setSpeakingId(null)
    );
  };

  const handleSpeakAll = () => {
    if (isSpeakingAll) {
      stopSpeech();
      return;
    }
    stopSpeech();
    if (localReminders.length === 0) return;
    setIsSpeakingAll(true);
    const fullText = localReminders
      .map((r, i) => `Lưu ý ${i + 1}: ${r.title}. ${r.content !== r.title ? r.content : ''}`)
      .join(' ');
    speakVietnameseReminder(fullText, () => setIsSpeakingAll(false));
  };

  const openAddForm = () => {
    setEditingReminderId(null);
    setFormCategory('meds');
    setFormTitle('');
    setFormContent('');
    setFormIsUrgent(false);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (rem: PatientDailyReminder) => {
    setEditingReminderId(rem.id);
    setFormCategory(rem.category);
    setFormTitle(rem.title);
    setFormContent(rem.content);
    setFormAuthor(rem.author);
    setFormIsUrgent(Boolean(rem.isUrgent));
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmitReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập tiêu đề lời nhắn.');
      return;
    }
    const newRem: PatientDailyReminder = {
      id: editingReminderId || `rem-${Date.now()}`,
      category: formCategory,
      title: formTitle.trim(),
      content: formContent.trim() || formTitle.trim(),
      author: formAuthor.trim() || 'Gia đình',
      time: getVietnamTimeStr(),
      isUrgent: formIsUrgent,
    };

    setLocalReminders((prev) =>
      editingReminderId
        ? prev.map((r) => (r.id === editingReminderId ? newRem : r))
        : [newRem, ...prev]
    );
    setIsFormOpen(false);
    if (onAddReminder) await onAddReminder(newRem);
  };

  const handleDelete = async (rem: PatientDailyReminder) => {
    setLocalReminders((prev) => prev.filter((r) => r.id !== rem.id));
    if (onDeleteReminder) await onDeleteReminder(rem.id, rem.title);
  };

  return (
    <section className="rounded-2xl bg-white border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-3.5">
      {/* Đầu trang Hồ sơ tóm tắt & nút mở rộng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                Hồ Sơ &amp; Dặn Dò Gia Đình: {patient.name}
              </h3>
              {patient.conditionTag && (
                <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-extrabold">
                  {patient.conditionTag}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium truncate">
              {patient.diagnosis || 'Theo dõi sức khỏe hằng ngày'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {localReminders.length > 0 && (
            <button
              type="button"
              onClick={handleSpeakAll}
              className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold border inline-flex items-center gap-1.5 cursor-pointer ${
                isSpeakingAll
                  ? 'bg-rose-600 text-white border-rose-700'
                  : 'bg-slate-50 hover:bg-teal-50 text-teal-900 border-slate-200'
              }`}
            >
              {isSpeakingAll ? (
                <VolumeX className="w-4 h-4 shrink-0" />
              ) : (
                <Volume2 className="w-4 h-4 shrink-0" />
              )}
              <span>{isSpeakingAll ? 'Dừng đọc' : 'Nghe dặn dò'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={openAddForm}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Thêm lời nhắn</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{isExpanded ? 'Ẩn bệnh án' : 'Chi tiết bệnh án'}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              aria-label="Làm mới dữ liệu"
              className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Bảng tin lời nhắn trong ngày */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-slate-800">
          <BellRing className="w-4 h-4 text-amber-600" />
          <span>Bảng dặn dò chăm sóc ({localReminders.length})</span>
        </div>

        {isFormOpen && (
          <ReminderFormCard
            editingId={editingReminderId}
            category={formCategory}
            title={formTitle}
            content={formContent}
            author={formAuthor}
            isUrgent={formIsUrgent}
            error={formError}
            members={familyList}
            profileType={profileType}
            patientDisplayName={displayLabel}
            onChangeCategory={setFormCategory}
            onChangeTitle={setFormTitle}
            onChangeContent={setFormContent}
            onChangeAuthor={setFormAuthor}
            onChangeUrgent={setFormIsUrgent}
            onSubmit={(e) => void handleSubmitReminder(e)}
            onCancel={() => setIsFormOpen(false)}
          />
        )}

        <DailyRemindersBoard
          reminders={localReminders}
          speakingId={speakingId}
          onSpeakSingle={handleSpeakSingle}
          onEditReminder={openEditForm}
          onDeleteReminder={(r) => void handleDelete(r)}
        />
      </div>

      {isExpanded && (
        <PatientInfoSummaryPanel
          patient={patient}
          onEditPatient={onEditPatient}
          onSavePatient={onSavePatient}
        />
      )}
    </section>
  );
}

export default PatientProfileBanner;
