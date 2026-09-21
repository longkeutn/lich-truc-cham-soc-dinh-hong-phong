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
  Users,
  Minus,
  Plus,
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
  onUpdateShift?: (updatedShift: ShiftRecord) => Promise<void>;
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
      setCustomSupporterName('');
    }
  }, [shift]);

  if (!isOpen || !shift) return null;

  const reqPax = shift.requiredPax && shift.requiredPax > 0 ? shift.requiredPax : 1;
  const currentAssignees = [...(shift.assignees || [])].filter(Boolean) as string[];
  const currentSupporters = [...(shift.supporters || [])].filter(Boolean) as string[];

  // Thay đổi số người cần trực trong ca (Cấu hình số người trực)
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

  // Tích chọn hoặc bỏ chọn người trực chính
  const handleToggleAssignee = async (memberName: string) => {
    let newAssignees = [...currentAssignees];
    let newPax = reqPax;

    if (newAssignees.includes(memberName)) {
      // Huỷ chọn
      newAssignees = newAssignees.filter((n) => n !== memberName);
    } else {
      // Tích chọn: Nếu đã đầy slot thì tự động nâng số người trực lên để chứa đủ
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
    } else {
      // Fallback
      if (newAssignees.includes(memberName)) {
        await onAssign(shift, newAssignees.indexOf(memberName));
      }
    }
  };

  // Tích chọn hoặc bỏ chọn người hỗ trợ (thành viên phụ)
  const handleToggleSupporter = async (supporterName: string) => {
    let newSupporters = [...currentSupporters];
    if (newSupporters.includes(supporterName)) {
      newSupporters = newSupporters.filter((s) => s !== supporterName);
    } else {
      newSupporters.push(supporterName);
    }

    const updated: ShiftRecord = {
      ...shift,
      supporters: newSupporters,
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateShift) {
      await onUpdateShift(updated);
    }
  };

  // Thêm người hỗ trợ ngoài danh bạ
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
    const authorName = currentMember ? currentMember.name : (shift.handover.author || 'Người nhà');
    await onSaveHandover(shift, handoverNote, authorName, vitals);
    setIsSavingHandover(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Tiến độ checklist
  const checklistItems = [
    { key: 'feeding' as const, label: 'Bơm sữa & Dinh dưỡng đường sonde', done: shift.checklist.feeding },
    { key: 'meds' as const, label: 'Uống thuốc đúng giờ & Chỉ định BS', done: shift.checklist.meds },
    { key: 'hygiene' as const, label: 'Thay bỉm, vệ sinh răng miệng & thân thể', done: shift.checklist.hygiene },
    { key: 'turning' as const, label: 'Lật trở 2h/lần, vỗ rung đờm chống loét', done: shift.checklist.turning },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn">
        {/* Header Modal */}
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
          {/* PHẦN 1: CẤU HÌNH & TÍCH CHỌN NGƯỜI TRỰC CA */}
          <div className="space-y-4">
            {/* Thanh cấu hình số người trong ca */}
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
                  onClick={() => handlePaxChange(-1)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Giảm 1 người"
                >
                  -
                </button>
                <span className="font-black text-xs sm:text-sm text-indigo-900 min-w-[55px] text-center">
                  {reqPax} người
                </span>
                <button
                  type="button"
                  disabled={reqPax >= 5}
                  onClick={() => handlePaxChange(1)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Tăng 1 người"
                >
                  +
                </button>
              </div>
            </div>

            {/* Trạng thái đủ/thiếu người trực chính */}
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

            {/* Nút 1 chạm nhận ca nhanh nếu đã chọn thành viên */}
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
                    onClick={() => handleToggleAssignee(currentMember.name)}
                    className="px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition cursor-pointer"
                  >
                    Huỷ nhận ca này
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleAssignee(currentMember.name)}
                    className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Tôi nhận trực ca</span>
                  </button>
                )}
              </div>
            )}

            {/* Danh sách tích chọn thành viên trực chính (Multi-select Checkbox Cards) */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                        onClick={() => handleToggleAssignee(mem.name)}
                        className={`p-2.5 rounded-2xl border-2 text-left flex items-center justify-between gap-2 transition cursor-pointer shadow-2xs ${
                          isChecked
                            ? `${mem.bgLight || 'bg-blue-50'} ${mem.borderLight || 'border-blue-400'} ring-1 ring-blue-300 font-bold`
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 ${
                              mem.badgeColor || 'bg-slate-700'
                            }`}
                          >
                            {mem.avatarInitials}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 truncate">
                              {mem.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {mem.relation}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition shrink-0 ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* PHẦN THÀNH VIÊN PHỤ / NGƯỜI HỖ TRỢ ĐI CÙNG (KHÔNG TÍNH THỐNG KÊ) */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  🤝 Người hỗ trợ đi cùng ({currentSupporters.length})
                </span>
                <span className="text-[10px] text-slate-400 font-medium italic">
                  Không tính vào thống kê ca
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Dành cho thành viên phụ hoặc người thân khi rảnh vào hỗ trợ cùng người trực chính.
              </p>

              {/* Danh sách thành viên phụ gợi ý */}
              <div className="flex flex-wrap gap-1.5">
                {familyList.map((mem) => {
                  const isChecked = currentSupporters.includes(mem.name);
                  const isMainAssignee = currentAssignees.includes(mem.name);
                  if (isMainAssignee) return null; // Đã trực chính thì không chọn phụ nữa

                  return (
                    <button
                      key={mem.id}
                      type="button"
                      onClick={() => handleToggleSupporter(mem.name)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{isChecked ? '✓' : '+'}</span>
                      <span>{mem.name}</span>
                      {mem.isSupporter && (
                        <span className="text-[9px] opacity-75 font-normal">(Phụ)</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Ô gõ tên người hỗ trợ khác ngoài danh bạ */}
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Gõ tên người hỗ trợ khác (VD: Cháu An, Cô Bảy...)"
                  value={customSupporterName}
                  onChange={(e) => setCustomSupporterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomSupporter();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSupporter}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Thêm hỗ trợ
                </button>
              </div>

              {/* Danh sách người hỗ trợ đang được chọn */}
              {currentSupporters.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-500">Đang có mặt hỗ trợ:</span>
                  {currentSupporters.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-1"
                    >
                      <span>🤝 {s}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSupporter(s)}
                        className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer"
                        title="Bỏ người hỗ trợ này"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
