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
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react';

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
  
  // Quick member selector modal/popover for this specific slot
  const [pickingSlotIndex, setPickingSlotIndex] = useState<number | null>(null);

  // Icon biểu tượng ca
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
    const authorName = currentMember ? currentMember.name : (shift.handover.author || 'Người nhà');
    await onSaveHandover(shift, handoverNote, authorName, vitals);
    setIsSavingHandover(false);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  // Đếm tiến độ checklist
  const checklistItems = [
    { key: 'feeding' as const, label: 'Bơm sữa ăn', done: shift.checklist.feeding },
    { key: 'meds' as const, label: 'Uống thuốc', done: shift.checklist.meds },
    { key: 'hygiene' as const, label: 'Thay bỉm', done: shift.checklist.hygiene },
    { key: 'turning' as const, label: 'Lật trở chống loét', done: shift.checklist.turning },
  ];
  const completedChecklistCount = checklistItems.filter((i) => i.done).length;

  const handleSlotClick = (slotIndex: number) => {
    if (currentMember) {
      // Direct assignment if member is chosen
      onAssign(shift, slotIndex, currentMember);
    } else {
      // Open quick member selector so they can choose immediately!
      setPickingSlotIndex(slotIndex);
    }
  };

  const handleSelectQuickMember = (member: FamilyMember) => {
    if (pickingSlotIndex !== null) {
      onAssign(shift, pickingSlotIndex, member);
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
      {/* Quick Member Picker Overlay if triggered */}
      {pickingSlotIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">Ai sẽ trực ca này?</h4>
                <p className="text-xs text-slate-500">{shift.name} ({shift.timeRange})</p>
              </div>
              <button
                type="button"
                onClick={() => setPickingSlotIndex(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
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
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
            >
              Huỷ bỏ
            </button>
          </div>
        </div>
      )}

      {/* Header Ca Trực */}
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
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {shift.timeRange}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Yêu cầu: <span className="font-bold text-slate-800">{shift.requiredPax} người túc trực</span>
            </p>
          </div>
        </div>

        {/* Trạng thái nhân sự: Đủ hay Thiếu */}
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

      {/* Vị trí người trực (Shift Assignment Slots) - Touch targets min 48px */}
      <div className="p-3.5 sm:p-4 bg-slate-50/40 space-y-2.5">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>Người trực ca ({shift.assignees.filter(Boolean).length}/{shift.requiredPax}):</span>
          <span className="text-[10px] text-slate-400 font-medium lowercase">Mỗi thành viên có màu sắc riêng</span>
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
                    {/* Avatar Initials với màu sắc rực rỡ đại diện cho thành viên */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-md ${
                        memberDetails?.badgeColor || 'bg-slate-700'
                      }`}
                    >
                      {memberDetails?.avatarInitials || assigneeName?.substring(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Tên người trực nổi bật với màu chữ riêng và kích thước lớn dễ đọc lướt */}
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
                          <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
                            • {memberDetails.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nút Huỷ nhận ca */}
                  <button
                    type="button"
                    onClick={() => onUnassign(shift, slotIndex)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-600 text-xs font-bold flex items-center gap-1 min-h-[44px] shrink-0 active:scale-95 transition shadow-xs cursor-pointer"
                    title="Nhấn để huỷ nhận ca hoặc đổi người"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
                    <span>Huỷ</span>
                  </button>
                </div>
              );
            }

            // Vị trí còn trống -> Cho phép nhận ca
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
      </div>

      {/* CHECKLIST CHĂM SÓC THEO CA */}
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
              onClick={() => onToggleChecklist(shift, item.key, !item.done)}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-1.5 text-xs font-bold min-h-[44px] transition cursor-pointer active:scale-95 ${
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

      {/* SỔ BÀN GIAO CA & SINH HIỆU (Gập mở) */}
      <div className="border-t border-slate-100 bg-slate-50/60">
        <button
          type="button"
          onClick={() => setShowHandover(!showHandover)}
          className="w-full p-3 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100/80 transition cursor-pointer min-h-[44px]"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span>Sổ Bàn Giao Ca & Sinh Hiệu</span>
            {shift.handover.note && (
              <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-200" title="Có ghi chú bàn giao" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {shift.handover.author && (
              <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                Bởi: {shift.handover.author}
              </span>
            )}
            {showHandover ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {showHandover && (
          <div className="p-3.5 sm:p-4 border-t border-slate-200 space-y-3 bg-white animate-fadeIn">
            {/* Sinh hiệu */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[11px] text-slate-600 font-bold block mb-1">
                  Huyết áp (mmHg)
                </label>
                <input
                  type="text"
                  placeholder="120/80"
                  value={vitals.bp || ''}
                  onChange={(e) => setVitals((v) => ({ ...v, bp: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-bold block mb-1">
                  SpO2 (%)
                </label>
                <input
                  type="text"
                  placeholder="97%"
                  value={vitals.spo2 || ''}
                  onChange={(e) => setVitals((v) => ({ ...v, spo2: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-bold block mb-1">
                  Mạch (nhịp/phút)
                </label>
                <input
                  type="text"
                  placeholder="78"
                  value={vitals.pulse || ''}
                  onChange={(e) => setVitals((v) => ({ ...v, pulse: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-bold block mb-1">
                  Thân nhiệt (°C)
                </label>
                <input
                  type="text"
                  placeholder="36.8"
                  value={vitals.temp || ''}
                  onChange={(e) => setVitals((v) => ({ ...v, temp: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 text-xs font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none min-h-[40px]"
                />
              </div>
            </div>

            {/* Ghi chú bàn giao */}
            <div>
              <label className="text-[11px] text-slate-600 font-bold block mb-1">
                Ghi chú dặn dò ca sau (ví dụ: Bác sĩ vừa cho thuốc mới lúc 15h, cần hút đờm...)
              </label>
              <textarea
                rows={2}
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
                placeholder="Nhập tình trạng người bệnh, nhắc nhở hoặc diễn biến đặc biệt..."
                className="w-full p-2.5 rounded-xl bg-slate-50 text-slate-900 border border-slate-200 text-xs sm:text-sm font-medium focus:bg-white focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 font-medium">
                {shift.handover.updatedAt && (
                  <>Cập nhật: {new Date(shift.handover.updatedAt).toLocaleTimeString('vi-VN')}</>
                )}
              </span>

              <button
                type="button"
                onClick={handleSaveHandover}
                disabled={isSavingHandover}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition min-h-[44px] cursor-pointer shadow-sm active:scale-95"
              >
                {saveFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>Đã lưu!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isSavingHandover ? 'Đang lưu...' : 'Lưu bàn giao'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
