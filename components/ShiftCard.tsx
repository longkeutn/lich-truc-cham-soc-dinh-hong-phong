'use client';

import React, { useState } from 'react';
import { FamilyMember, ShiftRecord, PatientVitals } from '@/lib/types';
import { FAMILY_MEMBERS } from '@/lib/config';
import {
  Sun,
  Sunset,
  Moon,
  AlertTriangle,
  UserPlus,
  UserCheck,
  X,
  Check,
  Clock,
  ClipboardList,
} from 'lucide-react';
import ShiftCardHandoverDrawer from './legacy-shifts/ShiftCardHandoverDrawer';

interface ShiftCardProps {
  shift: ShiftRecord;
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
}

export default function ShiftCard({
  shift,
  currentMember,
  members,
  onAssign,
  onUnassign,
  onToggleChecklist,
  onSaveHandover,
}: ShiftCardProps) {
  const familyList = members && members.length > 0 ? members : FAMILY_MEMBERS;
  const [showHandover, setShowHandover] = useState(false);
  const [handoverNote, setHandoverNote] = useState(shift.handover.note || '');
  const [vitals, setVitals] = useState<PatientVitals>({
    bp: shift.handover.vitals?.bp || '',
    spo2: shift.handover.vitals?.spo2 || '',
    pulse: shift.handover.vitals?.pulse || '',
    temp: shift.handover.vitals?.temp || '',
  });
  const [isSavingHandover, setIsSavingHandover] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [pickingSlotIndex, setPickingSlotIndex] = useState<number | null>(null);

  const renderShiftIcon = () => {
    switch (shift.type) {
      case 'morning':
      case 'day_12h':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'afternoon':
        return <Sunset className="w-5 h-5 text-orange-500" />;
      case 'night':
      case 'night_12h':
        return <Moon className="w-5 h-5 text-indigo-600" />;
      default:
        return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  const handleSaveHandover = async () => {
    setIsSavingHandover(true);
    const authorName = currentMember ? currentMember.name : shift.handover.author || 'Người nhà';
    await onSaveHandover(shift, handoverNote, authorName, vitals);
    setIsSavingHandover(false);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const checklistItems = [
    { key: 'feeding' as const, label: 'Bơm sữa ăn', done: shift.checklist.feeding },
    { key: 'meds' as const, label: 'Uống thuốc', done: shift.checklist.meds },
    { key: 'hygiene' as const, label: 'Thay bỉm', done: shift.checklist.hygiene },
    { key: 'turning' as const, label: 'Lật trở chống loét', done: shift.checklist.turning },
  ];
  const completedChecklistCount = checklistItems.filter((i) => i.done).length;

  const handleSlotClick = (slotIndex: number) => {
    if (currentMember) {
      void onAssign(shift, slotIndex, currentMember);
    } else {
      setPickingSlotIndex(slotIndex);
    }
  };

  const handleSelectQuickMember = (member: FamilyMember) => {
    if (pickingSlotIndex !== null) {
      void onAssign(shift, pickingSlotIndex, member);
      setPickingSlotIndex(null);
    }
  };

  return (
    <div
      className={`rounded-2xl border transition shadow-sm overflow-hidden ${
        shift.isUnderstaffed
          ? 'bg-white border-rose-300 shadow-rose-100 ring-1 ring-rose-200'
          : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-slate-100'
      }`}
    >
      {pickingSlotIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">Ai sẽ trực ca này?</h4>
                <p className="text-xs text-slate-600">{shift.name} ({shift.timeRange})</p>
              </div>
              <button
                type="button"
                onClick={() => setPickingSlotIndex(null)}
                aria-label="Đóng chọn người trực"
                className="min-h-[48px] min-w-[48px] p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {familyList.map((mem) => (
                <button
                  key={mem.id}
                  type="button"
                  onClick={() => handleSelectQuickMember(mem)}
                  className={`w-full min-h-[50px] p-2.5 rounded-xl border flex items-center justify-between text-left transition group cursor-pointer ${
                    mem.bgLight || 'bg-slate-50'
                  } ${mem.borderLight || 'border-slate-200'} hover:shadow-md`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-sm ${mem.badgeColor}`}>
                      {mem.avatarInitials}
                    </div>
                    <div>
                      <span className={`text-sm font-black block ${mem.textColor || 'text-slate-900'}`}>
                        {mem.name}
                      </span>
                      <span className="text-[11px] text-slate-600 font-medium">{mem.relation}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border shadow-sm ${mem.pillBadge || 'bg-white text-slate-800 border-slate-300'}`}>
                    Nhận ca
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPickingSlotIndex(null)}
              className="w-full min-h-[48px] py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
            >
              Huỷ bỏ
            </button>
          </div>
        </div>
      )}

      <div className={`p-3.5 sm:p-4 border-b flex flex-wrap items-center justify-between gap-2.5 ${
        shift.isUnderstaffed ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50/80 border-slate-100'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm shrink-0">
            {renderShiftIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                {shift.name}
              </h3>
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {shift.timeRange}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Yêu cầu: <span className="font-bold text-slate-800">{shift.requiredPax} người túc trực</span>
            </p>
          </div>
        </div>

        {shift.isUnderstaffed ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 border border-rose-300 text-xs sm:text-sm font-bold shadow-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
            <span>
              {shift.assignees.filter(Boolean).length === 0
                ? 'CHƯA CÓ NGƯỜI TRỰC'
                : `THIẾU ${shift.requiredPax - shift.assignees.filter(Boolean).length} NGƯỜI`}
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs sm:text-sm font-bold shadow-sm">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Đã đủ {shift.requiredPax} người trực</span>
          </div>
        )}
      </div>

      <div className="p-3.5 sm:p-4 bg-slate-50/40 space-y-2.5">
        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
          <span>Người trực ca ({shift.assignees.filter(Boolean).length}/{shift.requiredPax}):</span>
          <span className="text-[10px] text-slate-500 font-medium lowercase">Mỗi thành viên có màu sắc riêng</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Array.from({ length: shift.requiredPax }).map((_, slotIndex) => {
            const assigneeName = shift.assignees[slotIndex];
            const isAssigned = Boolean(assigneeName);
            const isSelf = currentMember && assigneeName === currentMember.name;
            const memberDetails = familyList.find((m) => m.name === assigneeName);

            if (isAssigned) {
              const bgClass = memberDetails?.bgLight || 'bg-blue-50';
              const borderClass = memberDetails?.borderLight || 'border-blue-200';
              const textClass = memberDetails?.textColor || 'text-slate-900';
              const pillClass = memberDetails?.pillBadge || 'bg-blue-100 text-blue-800 border-blue-200';

              return (
                <div
                  key={slotIndex}
                  className={`min-h-[56px] p-2.5 sm:p-3 rounded-2xl border-2 flex items-center justify-between gap-2.5 transition shadow-sm ${bgClass} ${borderClass} ${
                    isSelf ? 'ring-2 ring-indigo-500/50 shadow-md' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-md ${
                        memberDetails?.badgeColor || 'bg-slate-700'
                      }`}
                    >
                      {memberDetails?.avatarInitials || assigneeName?.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-base sm:text-lg font-black tracking-tight truncate ${textClass}`}>
                          {assigneeName}
                        </span>
                        {isSelf && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white shadow-xs">
                            BẠN
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[11px] px-2 py-0.5 rounded-md border font-bold ${pillClass}`}>
                          {memberDetails ? memberDetails.relation : `Vị trí ${slotIndex + 1}`}
                        </span>
                        {memberDetails?.phone && (
                          <span className="text-[11px] text-slate-600 font-medium hidden md:inline">
                            · {memberDetails.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void onUnassign(shift, slotIndex)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-600 text-xs font-bold flex items-center gap-1 min-h-[48px] min-w-[48px] shrink-0 active:scale-95 transition shadow-xs cursor-pointer"
                    title="Nhấn để huỷ nhận ca hoặc đổi người"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
                    <span>Huỷ</span>
                  </button>
                </div>
              );
            }

            return (
              <button
                key={slotIndex}
                type="button"
                onClick={() => handleSlotClick(slotIndex)}
                className="min-h-[56px] p-2.5 sm:p-3 rounded-2xl border-2 border-dashed border-rose-300 hover:border-rose-500 bg-rose-50/70 hover:bg-rose-100/80 text-rose-900 flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer group shadow-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-200/80 group-hover:bg-rose-300 flex items-center justify-center text-rose-700 shrink-0 transition">
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-black text-rose-800 group-hover:text-rose-950">
                    {currentMember ? `+ ${currentMember.name} nhận vị trí ${slotIndex + 1}` : `+ Nhận ca trực (Vị trí ${slotIndex + 1})`}
                  </div>
                  <div className="text-[11px] text-rose-600 font-medium">Chạm vào đây để phân công người trực</div>
                </div>
              </button>
            );
          })}
        </div>

        {shift.supporters && shift.supporters.length > 0 && (
          <div className="pt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
              <span>🤝</span> Có mặt hỗ trợ cùng:
            </span>
            {shift.supporters.map((s) => (
              <span
                key={s}
                className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-white">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800">
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            <span>Checklist công việc trong ca:</span>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
            {completedChecklistCount}/4 xong
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {checklistItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => void onToggleChecklist(shift, item.key, !item.done)}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-1.5 text-xs font-bold min-h-[48px] min-w-[48px] transition cursor-pointer active:scale-95 ${
                item.done
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="truncate">{item.label}</span>
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                  item.done ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-slate-50'
                }`}
              >
                {item.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <ShiftCardHandoverDrawer
        shift={shift}
        showHandover={showHandover}
        onToggleShowHandover={() => setShowHandover(!showHandover)}
        vitals={vitals}
        onChangeVitals={setVitals}
        handoverNote={handoverNote}
        onChangeHandoverNote={setHandoverNote}
        isSavingHandover={isSavingHandover}
        saveFeedback={saveFeedback}
        onSaveHandover={() => void handleSaveHandover()}
      />
    </div>
  );
}
