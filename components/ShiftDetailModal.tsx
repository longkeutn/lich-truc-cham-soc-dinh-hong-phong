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
  AlertTriangle,
  UserPlus,
  UserX,
  Check,
  Save,
  Activity,
  Heart,
  Thermometer,
  Wind,
  ClipboardList,
  MessageSquare,
} from 'lucide-react';

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
}

export default function ShiftDetailModal({
  isOpen,
  onClose,
  shift,
  currentMember,
  members,
  onAssign,
  onUnassign,
  onToggleChecklist,
  onSaveHandover,
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
  const [pickingSlotIndex, setPickingSlotIndex] = useState<number | null>(null);

  // Sync state when shift changes
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
      setPickingSlotIndex(null);
    }
  }, [shift]);

  if (!isOpen || !shift) return null;

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
    const authorName = currentMember ? currentMember.name : (shift.handover.author || 'Người nhà');
    await onSaveHandover(shift, handoverNote, authorName, vitals);
    setIsSavingHandover(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const checklistItems = [
    { key: 'feeding' as const, label: 'Bơm súp / sữa qua sonde', done: shift.checklist.feeding },
    { key: 'meds' as const, label: 'Uống thuốc đúng cữ', done: shift.checklist.meds },
    { key: 'hygiene' as const, label: 'Thay bỉm & vệ sinh', done: shift.checklist.hygiene },
    { key: 'turning' as const, label: 'Lật trở chống loét (2h/lần)', done: shift.checklist.turning },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
              {renderShiftIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {shift.name}
                </h3>
                {shift.isUnderstaffed ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    Chưa đủ người
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    Đủ người
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Ngày {shift.date.split('-').reverse().join('/')} • Giờ trực: {shift.timeRange}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thân cuộn Modal */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 divide-y divide-slate-100">
          {/* PHẦN 1: NGƯỜI TRỰC CA */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                Người trực ca ({shift.assignees.filter(Boolean).length}/{shift.requiredPax})
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {shift.requiredPax === 2 ? 'Cần 2 người trực cùng lúc' : 'Cần 1 người trực'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Array.from({ length: shift.requiredPax }).map((_, slotIndex) => {
                const assigneeName = shift.assignees[slotIndex];
                const isAssigned = Boolean(assigneeName);
                const memberDetails = familyList.find((m) => m.name === assigneeName);
                const isSelf = currentMember && assigneeName === currentMember.name;

                if (isAssigned) {
                  return (
                    <div
                      key={slotIndex}
                      className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-2.5 transition shadow-xs ${
                        memberDetails?.bgLight || 'bg-blue-50'
                      } ${memberDetails?.borderLight || 'border-blue-200'}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs ${
                            memberDetails?.badgeColor || 'bg-slate-700'
                          }`}
                        >
                          {memberDetails?.avatarInitials || 'TV'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                            {assigneeName} {isSelf && '(Bạn)'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium truncate">
                            {memberDetails?.relation || 'Thành viên'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onUnassign(shift, slotIndex)}
                        title="Huỷ phân công hoặc nhường ca"
                        className="px-2.5 py-1 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-100/80 border border-rose-200 transition cursor-pointer flex items-center gap-1"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Huỷ</span>
                      </button>
                    </div>
                  );
                }

                // Ô trống ca
                return (
                  <div
                    key={slotIndex}
                    className="p-3 rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50/40 hover:bg-rose-50 transition flex flex-col justify-center gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Vị trí {slotIndex + 1}: Trống ca
                      </span>
                      {currentMember && (
                        <button
                          type="button"
                          onClick={() => onAssign(shift, slotIndex, currentMember)}
                          className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Tôi nhận ca</span>
                        </button>
                      )}
                    </div>

                    {/* Quick selector nếu chưa chọn hoặc muốn gán cho người khác */}
                    {pickingSlotIndex === slotIndex ? (
                      <div className="pt-2 border-t border-rose-200/60 space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-600">Chọn người trực:</div>
                        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                          {familyList.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                onAssign(shift, slotIndex, m);
                                setPickingSlotIndex(null);
                              }}
                              className="p-1.5 rounded-xl bg-white hover:bg-indigo-50 text-slate-800 text-xs font-bold border border-slate-200 text-left flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <span
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] text-white font-bold shrink-0 ${m.badgeColor}`}
                              >
                                {m.avatarInitials}
                              </span>
                              <span className="truncate">{m.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      !currentMember && (
                        <button
                          type="button"
                          onClick={() => setPickingSlotIndex(slotIndex)}
                          className="w-full py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer text-center"
                        >
                          Chọn thành viên trực...
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PHẦN 2: CHECKLIST CHĂM SÓC Y TẾ */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                Checklist công việc trong ca
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Đánh dấu các việc đã hoàn thành
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checklistItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onToggleChecklist(shift, item.key, !item.done)}
                  className={`p-2.5 sm:p-3 rounded-2xl border-2 text-left flex items-center justify-between gap-2 transition cursor-pointer shadow-2xs ${
                    item.done
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-medium">{item.label}</span>
                  <div
                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${
                      item.done
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {item.done && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PHẦN 3: GHI NHẬN CHỈ SỐ SINH HIỆU & BÀN GIAO */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-rose-600" />
                Chỉ số sinh hiệu theo dõi
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Báo BS nếu chỉ số bất thường</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Huyết áp */}
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500" />
                  Huyết áp
                </div>
                <input
                  type="text"
                  placeholder="120/80"
                  value={vitals.bp}
                  onChange={(e) => setVitals((prev) => ({ ...prev, bp: e.target.value }))}
                  className="w-full text-xs sm:text-sm font-bold bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {/* SpO2 */}
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Wind className="w-3 h-3 text-sky-500" />
                  SpO2 (%)
                </div>
                <input
                  type="text"
                  placeholder="98%"
                  value={vitals.spo2}
                  onChange={(e) => setVitals((prev) => ({ ...prev, spo2: e.target.value }))}
                  className="w-full text-xs sm:text-sm font-bold bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {/* Mạch */}
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  Mạch (l/p)
                </div>
                <input
                  type="text"
                  placeholder="75"
                  value={vitals.pulse}
                  onChange={(e) => setVitals((prev) => ({ ...prev, pulse: e.target.value }))}
                  className="w-full text-xs sm:text-sm font-bold bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              {/* Thân nhiệt */}
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-500" />
                  Nhiệt độ (°C)
                </div>
                <input
                  type="text"
                  placeholder="36.8"
                  value={vitals.temp}
                  onChange={(e) => setVitals((prev) => ({ ...prev, temp: e.target.value }))}
                  className="w-full text-xs sm:text-sm font-bold bg-white border border-slate-200 rounded-xl px-2 py-1.5 focus:border-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Lời dặn bàn giao ca */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                Ghi chú bàn giao cho ca tiếp theo
              </label>
              <textarea
                rows={2}
                placeholder="VD: Bác ngủ ngoan, đã cho uống thuốc lúc 14h, cần theo dõi đờm ở ca sau..."
                value={handoverNote}
                onChange={(e) => setHandoverNote(e.target.value)}
                className="w-full p-2.5 text-xs sm:text-sm rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 focus:outline-none transition leading-relaxed"
              />
            </div>

            {/* Nút Lưu Bàn Giao */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-slate-500 font-medium">
                {shift.handover.updatedAt ? (
                  <span>
                    Cập nhật lần cuối bởi {shift.handover.author || 'Người nhà'} (
                    {new Date(shift.handover.updatedAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    )
                  </span>
                ) : (
                  <span>Chưa có ghi chú bàn giao</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveHandover}
                disabled={isSavingHandover}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {isSavingHandover ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Đã lưu vào Sheet!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu bàn giao</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold border border-slate-200 transition cursor-pointer"
          >
            Đóng hộp thoại
          </button>
        </div>
      </div>
    </div>
  );
}
