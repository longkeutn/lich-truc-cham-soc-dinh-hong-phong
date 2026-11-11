'use client';

import React, { useState, useEffect } from 'react';
import { ShiftRecord, FamilyMember, PatientVitals } from '@/lib/types';
import { FAMILY_MEMBERS } from '@/lib/config';
import {
  X,
  Sun,
  Sunset,
  Moon,
  Clock,
  UserPlus,
  Check,
  Users,
} from 'lucide-react';
import ShiftChecklistAndHandoverSection from './legacy-shifts/ShiftChecklistAndHandoverSection';

interface ShiftDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: ShiftRecord | null;
  currentMember: FamilyMember | null;
  members?: FamilyMember[];
  onAssign: (shift: ShiftRecord, slotIndex: number, specificMember?: FamilyMember) => Promise<void>;
  onUnassign: (shift: ShiftRecord, slotIndex: number) => Promise<void>;
  onToggleChecklist: (
    shift: ShiftRecord,
    itemKey: 'feeding' | 'meds' | 'hygiene' | 'turning',
    isChecked: boolean
  ) => Promise<void>;
  onSaveHandover: (
    shift: ShiftRecord,
    note: string,
    author: string,
    vitals?: PatientVitals
  ) => Promise<void>;
  onUpdateShift?: (updatedShift: ShiftRecord) => Promise<void>;
}

export default function ShiftDetailModal({
  isOpen,
  onClose,
  shift,
  currentMember,
  members,
  onAssign,
  onToggleChecklist,
  onSaveHandover,
  onUpdateShift,
}: ShiftDetailModalProps) {
  const familyList = members && members.length > 0 ? members : FAMILY_MEMBERS;

  const [handoverNote, setHandoverNote] = useState('');
  const [vitals, setVitals] = useState<PatientVitals>({
    bp: '',
    spo2: '',
    pulse: '',
    temp: '',
  });
  const [isSavingHandover, setIsSavingHandover] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [customSupporterName, setCustomSupporterName] = useState('');

  useEffect(() => {
    if (shift) {
      setHandoverNote(shift.handover.note || '');
      setVitals({
        bp: shift.handover.vitals?.bp || '',
        spo2: shift.handover.vitals?.spo2 || '',
        pulse: shift.handover.vitals?.pulse || '',
        temp: shift.handover.vitals?.temp || '',
      });
      setSaveSuccess(false);
      setCustomSupporterName('');
    }
  }, [shift]);

  if (!isOpen || !shift) return null;

  const reqPax = shift.requiredPax && shift.requiredPax > 0 ? shift.requiredPax : 1;
  const currentAssignees = [...(shift.assignees || [])].filter(Boolean) as string[];
  const currentSupporters = [...(shift.supporters || [])].filter(Boolean) as string[];

  const handlePaxChange = async (delta: number) => {
    const newPax = Math.max(1, Math.min(5, reqPax + delta));
    if (newPax === reqPax) return;

    const updated: ShiftRecord = {
      ...shift,
      requiredPax: newPax,
      assignees: currentAssignees.slice(0, newPax),
      isUnderstaffed: currentAssignees.slice(0, newPax).length < newPax,
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateShift) {
      await onUpdateShift(updated);
    }
  };

  const handleToggleAssignee = async (memberName: string) => {
    let newAssignees = [...currentAssignees];
    let newPax = reqPax;

    if (newAssignees.includes(memberName)) {
      newAssignees = newAssignees.filter((n) => n !== memberName);
    } else {
      if (newAssignees.length >= newPax) {
        newPax = newAssignees.length + 1;
      }
      newAssignees.push(memberName);
    }

    const updated: ShiftRecord = {
      ...shift,
      requiredPax: newPax,
      assignees: newAssignees,
      isUnderstaffed: newAssignees.length < newPax,
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateShift) {
      await onUpdateShift(updated);
    } else if (newAssignees.includes(memberName)) {
      await onAssign(shift, newAssignees.indexOf(memberName));
    }
  };

  const handleToggleSupporter = async (supporterName: string) => {
    const newSupporters = currentSupporters.includes(supporterName)
      ? currentSupporters.filter((s) => s !== supporterName)
      : [...currentSupporters, supporterName];

    const updated: ShiftRecord = {
      ...shift,
      supporters: newSupporters,
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateShift) {
      await onUpdateShift(updated);
    }
  };

  const handleAddCustomSupporter = async () => {
    const trimmed = customSupporterName.trim();
    if (!trimmed) return;
    if (currentSupporters.includes(trimmed)) {
      setCustomSupporterName('');
      return;
    }

    const updated: ShiftRecord = {
      ...shift,
      supporters: [...currentSupporters, trimmed],
      updatedAt: new Date().toISOString(),
    };

    setCustomSupporterName('');
    if (onUpdateShift) {
      await onUpdateShift(updated);
    }
  };

  const renderShiftIcon = () => {
    switch (shift.type) {
      case 'morning':
      case 'day_12h':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'afternoon':
        return <Sunset className="w-5 h-5 text-orange-500" />;
      case 'night':
      case 'night_12h':
        return <Moon className="w-5 h-5 text-indigo-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  const handleSaveHandover = async () => {
    setIsSavingHandover(true);
    const authorName = currentMember ? currentMember.name : shift.handover.author || 'Người nhà';
    await onSaveHandover(shift, handoverNote, authorName, vitals);
    setIsSavingHandover(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
              {renderShiftIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900">{shift.name}</h3>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    shift.phase === 'phase1'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {shift.phase === 'phase1' ? 'Giai đoạn 1 (8h)' : 'Giai đoạn 2 (12h)'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Ngày {shift.date.split('-').reverse().join('/')} · Giờ trực: {shift.timeRange}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết ca trực"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 divide-y divide-slate-100">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200 gap-3">
              <div>
                <div className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-700" />
                  Cấu hình số người trực chính
                </div>
                <div className="text-[11px] text-indigo-700">
                  Số lượng người cần túc trực bắt buộc cho ca này
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-indigo-200 shadow-2xs">
                <button
                  type="button"
                  disabled={reqPax <= 1}
                  onClick={() => void handlePaxChange(-1)}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[48px] min-w-[48px]"
                  title="Giảm 1 người"
                  aria-label="Giảm 1 người trực"
                >
                  -
                </button>
                <span className="font-black text-xs sm:text-sm text-indigo-900 min-w-[55px] text-center">
                  {reqPax} người
                </span>
                <button
                  type="button"
                  disabled={reqPax >= 5}
                  onClick={() => void handlePaxChange(1)}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-[48px] min-w-[48px]"
                  title="Tăng 1 người"
                  aria-label="Tăng 1 người trực"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                Người trực chính ({currentAssignees.length}/{reqPax})
              </span>
              <div>
                {currentAssignees.length >= reqPax ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                    ✓ Đã đủ {reqPax} người trực
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
                    ⚠️ Còn thiếu {reqPax - currentAssignees.length} người
                  </span>
                )}
              </div>
            </div>

            {currentMember && (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center ${currentMember.badgeColor}`}
                  >
                    {currentMember.avatarInitials}
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {currentMember.name} (Tài khoản đang chọn)
                  </div>
                </div>

                {currentAssignees.includes(currentMember.name) ? (
                  <button
                    type="button"
                    onClick={() => void handleToggleAssignee(currentMember.name)}
                    className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition cursor-pointer"
                  >
                    Huỷ nhận ca này
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleToggleAssignee(currentMember.name)}
                    className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Tôi nhận trực ca</span>
                  </button>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Tích chọn người trực chính trong ca:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {familyList
                  .filter((m) => !m.isSupporter)
                  .map((mem) => {
                    const isChecked = currentAssignees.includes(mem.name);
                    return (
                      <button
                        key={mem.id}
                        type="button"
                        onClick={() => void handleToggleAssignee(mem.name)}
                        className={`min-h-[48px] min-w-[48px] p-2.5 rounded-2xl border-2 text-left flex items-center justify-between gap-2 transition cursor-pointer shadow-2xs ${
                          isChecked
                            ? `${mem.bgLight || 'bg-blue-50'} ${mem.borderLight || 'border-blue-400'} ring-1 ring-blue-300 font-bold`
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 ${mem.badgeColor || 'bg-slate-700'}`}>
                            {mem.avatarInitials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 truncate">{mem.name}</div>
                            <div className="text-xs text-slate-600 truncate">{mem.relation}</div>
                          </div>
                        </div>

                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  🤝 Người hỗ trợ đi cùng ({currentSupporters.length})
                </span>
                <span className="text-xs text-slate-600 font-medium italic">
                  Không tính vào thống kê ca
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Dành cho thành viên phụ hoặc người thân khi rảnh vào hỗ trợ cùng người trực chính.
              </p>

              <div className="flex flex-wrap gap-1.5">
                {familyList.map((mem) => {
                  const isChecked = currentSupporters.includes(mem.name);
                  const isMainAssignee = currentAssignees.includes(mem.name);
                  if (isMainAssignee) return null;

                  return (
                    <button
                      key={mem.id}
                      type="button"
                      onClick={() => void handleToggleSupporter(mem.name)}
                      className={`min-h-[48px] min-w-[48px] px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{isChecked ? '✓' : '+'}</span>
                      <span>{mem.name}</span>
                      {mem.isSupporter && <span className="text-[11px] opacity-80 font-normal">(Phụ)</span>}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Gõ tên người hỗ trợ khác (VD: Cháu An, Cô Bảy...)"
                  value={customSupporterName}
                  onChange={(e) => setCustomSupporterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleAddCustomSupporter();
                    }
                  }}
                  className="flex-1 min-h-[48px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void handleAddCustomSupporter()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition cursor-pointer min-h-[48px] min-w-[48px]"
                >
                  Thêm hỗ trợ
                </button>
              </div>

              {currentSupporters.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-700">Đang có mặt hỗ trợ:</span>
                  {currentSupporters.map((s) => (
                    <span
                      key={s}
                      className="pl-2.5 pr-1 py-1 rounded-xl bg-emerald-100 text-emerald-950 border border-emerald-300 text-xs font-bold flex items-center gap-1 min-h-[48px]"
                    >
                      <span>🤝 {s}</span>
                      <button
                        type="button"
                        onClick={() => void handleToggleSupporter(s)}
                        className="text-emerald-800 hover:text-emerald-950 font-black cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center rounded-lg hover:bg-emerald-200/60"
                        title="Bỏ người hỗ trợ này"
                        aria-label={`Bỏ người hỗ trợ ${s}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <ShiftChecklistAndHandoverSection
            shift={shift}
            vitals={vitals}
            onChangeVitals={setVitals}
            handoverNote={handoverNote}
            onChangeHandoverNote={setHandoverNote}
            isSavingHandover={isSavingHandover}
            saveSuccess={saveSuccess}
            onToggleChecklist={onToggleChecklist}
            onSaveHandover={() => void handleSaveHandover()}
          />
        </div>

        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold border border-slate-200 transition cursor-pointer min-h-[48px] min-w-[48px]"
          >
            Đóng hộp thoại
          </button>
        </div>
      </div>
    </div>
  );
}
