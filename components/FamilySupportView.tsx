'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ShiftRecord, FamilyMember, ShiftType } from '@/lib/types';
import { getVietnamDateStr } from '@/lib/config';
import ShiftHistoryView from '@/components/ShiftHistoryView';
import {
  Users,
  Calendar,
  Plus,
  Clock,
  HeartHandshake,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  Check,
  X,
  History,
  Sparkles,
  MessageSquare,
  UserPlus,
} from 'lucide-react';

interface FamilySupportViewProps {
  shifts: ShiftRecord[];
  members: FamilyMember[];
  currentMember?: FamilyMember | null;
  isAdmin?: boolean;
  todayStr?: string;
  onSaveShift: (shift: ShiftRecord) => Promise<void>;
  onOpenMembers?: () => void;
}

interface SessionOption {
  id: 'morning' | 'afternoon' | 'night' | 'full_day';
  shiftType: ShiftType;
  label: string;
  emoji: string;
  defaultTime: string;
  badgeClass: string;
}

const SESSION_OPTIONS: SessionOption[] = [
  {
    id: 'morning',
    shiftType: 'morning',
    label: 'Buổi Sáng',
    emoji: '🌅',
    defaultTime: '07:30 - 11:30',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  {
    id: 'afternoon',
    shiftType: 'afternoon',
    label: 'Buổi Chiều',
    emoji: '🌇',
    defaultTime: '14:00 - 18:00',
    badgeClass: 'bg-sky-50 text-sky-900 border-sky-200',
  },
  {
    id: 'night',
    shiftType: 'night',
    label: 'Buổi Tối / Ngủ lại',
    emoji: '🌙',
    defaultTime: '19:00 - 22:30',
    badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-200',
  },
  {
    id: 'full_day',
    shiftType: 'day_12h',
    label: 'Cả Ngày',
    emoji: '☀️',
    defaultTime: '08:00 - 20:00',
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  },
];

const QUICK_TASK_PRESETS = [
  '🏃 Phụ Mẹ đỡ Bố tập phục hồi chức năng',
  '🍲 Nấu ăn & trông Bố để Mẹ nghỉ ngơi',
  '🌙 Qua ngủ trực đêm phụ Mẹ',
  '🏥 Đưa Bố đi tái khám / lấy thuốc',
  '🛁 Phụ tắm rửa, vệ sinh & xoa bóp cho Bố',
  '💬 Qua thăm, đo huyết áp & trò chuyện cùng Bố Mẹ',
];

const DAY_NAMES_VN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function toDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getMondayOfWeek(baseDate: Date): Date {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Thứ 2 là đầu tuần
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDateShortVN(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

function formatDateFullVN(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function FamilySupportView({
  shifts,
  members,
  currentMember,
  todayStr: todayStrProp,
  onSaveShift,
  onOpenMembers,
}: FamilySupportViewProps) {
  const [subTab, setSubTab] = useState<'schedule' | 'history'>('schedule');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  const todayStr = todayStrProp || getVietnamDateStr();

  // Modal / Form đăng ký qua phụ Mẹ
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => todayStrProp || getVietnamDateStr());
  const [selectedMemberName, setSelectedMemberName] = useState<string>(
    () => currentMember?.name || members[0]?.name || ''
  );
  const [selectedSupporters, setSelectedSupporters] = useState<string[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<SessionOption['id']>('morning');
  const [customTimeRange, setCustomTimeRange] = useState<string>('07:30 - 11:30');
  const [taskNote, setTaskNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Tự động đồng bộ ngày mặc định khi bước sang ngày mới (nếu form đang đóng)
  useEffect(() => {
    if (!isFormOpen && !editingShiftId) {
      setSelectedDate(todayStr);
    }
  }, [todayStr, isFormOpen, editingShiftId]);

  // Danh sách 7 ngày trong tuần đang chọn (Thứ 2 -> Chủ Nhật) dựa theo ngày Việt Nam
  const weekDays = useMemo(() => {
    const [y, m, d] = todayStr.split('-').map(Number);
    const base = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
    base.setDate(base.getDate() + weekOffset * 7);
    const monday = getMondayOfWeek(base);
    const days: { dateStr: string; dayName: string; shortDate: string; isToday: boolean; isPast: boolean }[] = [];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      const dStr = toDateStr(cur);
      days.push({
        dateStr: dStr,
        dayName: DAY_NAMES_VN[cur.getDay()],
        shortDate: formatDateShortVN(dStr),
        isToday: dStr === todayStr,
        isPast: dStr < todayStr,
      });
    }
    return days;
  }, [weekOffset, todayStr]);

  // Lọc các lượt đăng ký hỗ trợ tại nhà (phase2 hoặc id bắt đầu bằng support_) có người đăng ký
  const activeSupportShifts = useMemo(() => {
    return shifts.filter((s) => {
      const isHomePhase = s.phase === 'phase2' || String(s.id || '').startsWith('support_');
      if (!isHomePhase) return false;
      const hasAssignees = (s.assignees || []).filter(Boolean).length > 0;
      const hasSupporters = (s.supporters || []).filter(Boolean).length > 0;
      const hasNote = Boolean(s.handover?.note?.trim());
      return hasAssignees || hasSupporters || hasNote;
    });
  }, [shifts]);

  // Gom nhóm theo ngày cho tuần hiện tại
  const supportByDate = useMemo(() => {
    const map = new Map<string, ShiftRecord[]>();
    weekDays.forEach((d) => map.set(d.dateStr, []));

    activeSupportShifts.forEach((s) => {
      if (map.has(s.date)) {
        map.get(s.date)!.push(s);
      }
    });

    // Sắp xếp trong ngày: Sáng -> Cả ngày -> Chiều -> Tối
    const order: Record<string, number> = {
      morning: 1,
      day_12h: 2,
      afternoon: 3,
      night: 4,
      night_12h: 5,
    };
    map.forEach((list) => {
      list.sort((a, b) => (order[a.type] || 9) - (order[b.type] || 9));
    });

    return map;
  }, [weekDays, activeSupportShifts]);

  // Tổng số lượt đăng ký trong tuần đang xem
  const totalThisWeek = useMemo(() => {
    let count = 0;
    supportByDate.forEach((list) => {
      count += list.length;
    });
    return count;
  }, [supportByDate]);

  // Thống kê tổng hợp đồng hành của từng thành viên (cả tại nhà + ICU)
  const memberContributionStats = useMemo(() => {
    const counts = new Map<string, { homeCount: number; icuCount: number; total: number }>();
    members.forEach((m) => {
      counts.set(m.name, { homeCount: 0, icuCount: 0, total: 0 });
    });

    shifts.forEach((s) => {
      const assignees = (s.assignees || []).filter(Boolean) as string[];
      const supporters = (s.supporters || []).filter(Boolean) as string[];
      const allParticipants = Array.from(new Set([...assignees, ...supporters]));
      if (allParticipants.length === 0) return;

      const isIcu = s.phase === 'phase1' && !String(s.id || '').startsWith('support_');
      allParticipants.forEach((name) => {
        const prev = counts.get(name) || { homeCount: 0, icuCount: 0, total: 0 };
        if (isIcu) {
          prev.icuCount += 1;
        } else {
          prev.homeCount += 1;
        }
        prev.total += 1;
        counts.set(name, prev);
      });
    });

    return members.map((m) => ({
      member: m,
      ...(counts.get(m.name) || { homeCount: 0, icuCount: 0, total: 0 }),
    }));
  }, [shifts, members]);

  // Mở form đăng ký mới (có thể truyền sẵn ngày)
  const handleOpenNewForm = (dateStr?: string) => {
    setEditingShiftId(null);
    setSelectedDate(dateStr || todayStr);
    setSelectedMemberName(currentMember?.name || members[0]?.name || '');
    setSelectedSupporters([]);
    setSelectedSessionId('morning');
    setCustomTimeRange(SESSION_OPTIONS[0].defaultTime);
    setTaskNote('');
    setIsFormOpen(true);
  };

  // Mở form sửa đăng ký
  const handleOpenEditForm = (shift: ShiftRecord) => {
    const assignees = (shift.assignees || []).filter(Boolean) as string[];
    const matchedSession =
      SESSION_OPTIONS.find((opt) => opt.label === shift.name) ||
      SESSION_OPTIONS.find((opt) => opt.shiftType === shift.type) ||
      SESSION_OPTIONS[0];

    setEditingShiftId(shift.id);
    setSelectedDate(shift.date);
    setSelectedMemberName(assignees[0] || currentMember?.name || members[0]?.name || '');
    setSelectedSupporters((shift.supporters || []).filter(Boolean));
    setSelectedSessionId(matchedSession.id);
    setCustomTimeRange(shift.timeRange || matchedSession.defaultTime);
    setTaskNote(shift.handover?.note || '');
    setIsFormOpen(true);
  };

  // Chọn buổi -> tự động điền khung giờ gợi ý
  const handleSelectSession = (session: SessionOption) => {
    setSelectedSessionId(session.id);
    setCustomTimeRange(session.defaultTime);
  };

  // Toggle người đi cùng (supporters)
  const handleToggleSupporter = (name: string) => {
    setSelectedSupporters((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  // Lưu đăng ký qua phụ Mẹ
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberName.trim() || !selectedDate || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const sessionObj =
        SESSION_OPTIONS.find((s) => s.id === selectedSessionId) || SESSION_OPTIONS[0];
      const shiftId = editingShiftId || `support_${selectedDate}_${Date.now()}`;

      const record: ShiftRecord = {
        id: shiftId,
        date: selectedDate,
        phase: 'phase2',
        type: sessionObj.shiftType,
        name: sessionObj.label,
        timeRange: customTimeRange.trim() || sessionObj.defaultTime,
        requiredPax: 1,
        assignees: [selectedMemberName],
        supporters: selectedSupporters.filter((s) => s !== selectedMemberName),
        isUnderstaffed: false,
        handover: {
          note: taskNote.trim() || 'Qua phụ Mẹ chăm Bố',
          author: currentMember?.name || selectedMemberName,
          updatedAt: new Date().toISOString(),
        },
        checklist: {
          feeding: false,
          meds: false,
          hygiene: false,
          turning: false,
        },
        updatedAt: new Date().toISOString(),
      };

      await onSaveShift(record);
      setIsFormOpen(false);
      setEditingShiftId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Huỷ / Xoá lịch đăng ký (ghi đè rỗng để tương thích 100% với Google Sheets)
  const handleDeleteSupport = async (shift: ShiftRecord) => {
    const assigneeName = (shift.assignees || []).filter(Boolean).join(', ') || 'lịch này';
    const confirmed = window.confirm(
      `Bạn muốn huỷ lịch qua phụ Mẹ của "${assigneeName}" ngày ${formatDateFullVN(shift.date)}?`
    );
    if (!confirmed) return;

    setDeletingId(shift.id);
    try {
      const clearedShift: ShiftRecord = {
        ...shift,
        assignees: [],
        supporters: [],
        isUnderstaffed: false,
        handover: {
          note: '',
          author: '',
          updatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
      await onSaveShift(clearedShift);
    } finally {
      setDeletingId(null);
    }
  };

  // Ngày mai & Cuối tuần này cho nút chọn nhanh trong form (theo đúng ngày Việt Nam hiện tại)
  const quickDates = useMemo(() => {
    const [y, m, d] = todayStr.split('-').map(Number);
    const today = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const monday = getMondayOfWeek(today);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return [
      { label: 'Hôm nay', dateStr: toDateStr(today) },
      { label: 'Ngày mai', dateStr: toDateStr(tomorrow) },
      { label: 'Thứ Bảy tuần này', dateStr: toDateStr(saturday) },
      { label: 'Chủ Nhật tuần này', dateStr: toDateStr(sunday) },
    ];
  }, [todayStr]);

  return (
    <div className="space-y-4">
      {/* ===== THANH CHUYỂN CHẾ ĐỘ: LỊCH QUA PHỤ MẸ vs KỶ NIỆM ICU ===== */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setSubTab('schedule')}
          className={`min-h-[48px] px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-base font-black flex items-center justify-center gap-1.5 sm:gap-2 text-center leading-tight transition cursor-pointer ${
            subTab === 'schedule'
              ? 'bg-white text-emerald-900 shadow-sm border border-emerald-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
          <span>Lịch Qua Phụ Mẹ</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('history')}
          className={`min-h-[48px] px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-base font-black flex items-center justify-center gap-1.5 sm:gap-2 text-center leading-tight transition cursor-pointer ${
            subTab === 'history'
              ? 'bg-white text-indigo-900 shadow-sm border border-indigo-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0" />
          <span>Kỷ Niệm & Lịch Sử ICU</span>
        </button>
      </div>

      {subTab === 'schedule' ? (
        <div className="space-y-4">
          {/* ===== BANNER ĐỒNG HÀNH CÙNG MẸ + NÚT ĐĂNG KÝ LỚN ===== */}
          <div className="rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 text-white p-4 sm:p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Gia Đình Cùng Đồng Hành Chăm Bố</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Lịch Anh Chị Em Qua Phụ Mẹ Chăm Bố
                </h2>
                <p className="text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
                  Mẹ chăm Bố chính hàng ngày tại nhà. Các con, các cháu sắp xếp thời gian rảnh đăng ký lịch qua đỡ đần Mẹ (tập phục hồi cho Bố, nấu ăn, trông Bố để Mẹ nghỉ ngơi).
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenNewForm()}
                className="min-h-[52px] px-5 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-base shadow-lg active:scale-95 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>Đăng ký qua phụ Mẹ</span>
              </button>
            </div>
          </div>

          {/* ===== FORM ĐĂNG KÝ QUA PHỤ MẸ (INLINE / DRAWER THÂN THIỆN MOBILE) ===== */}
          {isFormOpen && (
            <form
              onSubmit={handleSubmitForm}
              className="rounded-3xl border-2 border-emerald-400 bg-white p-4 sm:p-6 shadow-xl space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                    🤝
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {editingShiftId ? 'Cập nhật lịch qua phụ Mẹ' : 'Đăng ký lịch qua phụ Mẹ'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Lưu trực tiếp lên Google Sheets để Mẹ và cả nhà cùng biết
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingShiftId(null);
                  }}
                  className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. Chọn người qua phụ */}
              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-800">
                  1. Ai đăng ký qua phụ Mẹ?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {members.map((m) => {
                    const isSelected = selectedMemberName === m.name;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMemberName(m.name)}
                        className={`min-h-[48px] p-2.5 rounded-2xl border-2 text-left transition flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 ${
                            m.badgeColor || 'bg-slate-600'
                          }`}
                        >
                          {m.avatarInitials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black truncate">{m.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{m.relation}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Chọn ngày & buổi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-800">
                    2. Ngày qua phụ Mẹ:
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 text-base font-bold text-slate-900 focus:outline-none"
                    required
                  />
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {quickDates.map((qd) => (
                      <button
                        key={qd.label}
                        type="button"
                        onClick={() => setSelectedDate(qd.dateStr)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          selectedDate === qd.dateStr
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {qd.label} ({formatDateShortVN(qd.dateStr)})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-800">
                    3. Buổi / Khung giờ:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {SESSION_OPTIONS.map((opt) => {
                      const active = selectedSessionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectSession(opt)}
                          className={`min-h-[48px] px-3 py-2 rounded-2xl border-2 text-left transition cursor-pointer ${
                            active
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white font-bold'
                          }`}
                        >
                          <div className="text-sm flex items-center gap-1.5">
                            <span>{opt.emoji}</span>
                            <span>{opt.label}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{opt.defaultTime}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-1">
                    <input
                      type="text"
                      value={customTimeRange}
                      onChange={(e) => setCustomTimeRange(e.target.value)}
                      placeholder="Giờ cụ thể (VD: 08:30 - 12:00 hoặc Sau giờ làm 17:30)"
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 text-sm font-medium text-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Ghi chú công việc phụ Mẹ */}
              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-800">
                  4. Công việc dự kiến phụ Mẹ / Lời nhắn:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TASK_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTaskNote(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        taskNote === preset
                          ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={taskNote}
                  onChange={(e) => setTaskNote(e.target.value)}
                  placeholder="VD: Con qua đỡ Bố tập đi bộ, nấu cháo trưa và trông Bố để Mẹ nghỉ ngơi..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-500 text-base text-slate-900 font-medium focus:outline-none"
                />
              </div>

              {/* 5. Có ai đi cùng hỗ trợ thêm không? (Tùy chọn) */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-600">
                  🤝 Đi cùng ai khác trong gia đình? (Tùy chọn):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {members
                    .filter((m) => m.name !== selectedMemberName)
                    .map((m) => {
                      const checked = selectedSupporters.includes(m.name);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleToggleSupporter(m.name)}
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                            checked
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {checked && <Check className="w-3.5 h-3.5" />}
                          <span>{m.name}</span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Nút Lưu / Huỷ */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    setEditingShiftId(null);
                  }}
                  className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-h-[48px] px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-md active:scale-95 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-5 h-5" />
                  <span>{isSubmitting ? 'Đang lưu...' : 'Lưu lịch phụ Mẹ'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ===== THANH ĐIỀU HƯỚNG TUẦN ===== */}
          <div className="rounded-2xl bg-white border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-slate-900">
                    Tuần {weekDays[0]?.shortDate} — {weekDays[6]?.shortDate}
                  </h3>
                  {weekOffset === 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-black">
                      Tuần này
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Đã có <span className="font-black text-emerald-700">{totalThisWeek}</span> lượt đăng ký qua phụ Mẹ trong tuần
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setWeekOffset((w) => w - 1)}
                className="flex-1 sm:flex-initial justify-center min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span>Tuần trước</span>
              </button>
              {weekOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="flex-1 sm:flex-initial justify-center min-h-[44px] px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-bold flex items-center transition cursor-pointer"
                >
                  Hôm nay
                </button>
              )}
              <button
                type="button"
                onClick={() => setWeekOffset((w) => w + 1)}
                className="flex-1 sm:flex-initial justify-center min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <span>Tuần sau</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>

          {/* ===== DANH SÁCH 7 NGÀY TRONG TUẦN (KHÔNG CẢNH BÁO ĐỎ, RÕ RÀNG CHO MẸ) ===== */}
          <div className="space-y-3">
            {weekDays.map((day) => {
              const dayRecords = supportByDate.get(day.dateStr) || [];
              return (
                <div
                  key={day.dateStr}
                  className={`rounded-3xl border transition p-4 sm:p-5 ${
                    day.isToday
                      ? 'bg-emerald-50/40 border-emerald-400 shadow-sm ring-2 ring-emerald-500/15'
                      : 'bg-white border-slate-200 shadow-2xs'
                  }`}
                >
                  {/* Header của Ngày */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`px-3 py-1.5 rounded-xl font-mono text-sm font-black ${
                          day.isToday
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {day.shortDate}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-slate-900">
                            {day.dayName}
                          </span>
                          {day.isToday && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black">
                              HÔM NAY
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {dayRecords.length > 0
                            ? `${dayRecords.length} lượt anh chị em qua phụ Mẹ`
                            : 'Mẹ chăm Bố tại nhà'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenNewForm(day.dateStr)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-black flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Qua phụ</span>
                    </button>
                  </div>

                  {/* Nội dung các lượt đăng ký trong ngày */}
                  {dayRecords.length === 0 ? (
                    <div className="pt-3 flex items-center justify-between text-sm text-slate-500">
                      <span>Chưa có ai đăng ký lịch qua phụ ngày này.</span>
                    </div>
                  ) : (
                    <div className="pt-3 space-y-2.5">
                      {dayRecords.map((rec) => {
                        const assignees = (rec.assignees || []).filter(Boolean) as string[];
                        const supporters = (rec.supporters || []).filter(Boolean) as string[];
                        const mainName = assignees[0] || 'Thành viên gia đình';
                        const memberObj = members.find((m) => m.name === mainName);
                        const sessionOpt =
                          SESSION_OPTIONS.find((o) => o.label === rec.name) ||
                          SESSION_OPTIONS.find((o) => o.shiftType === rec.type) ||
                          SESSION_OPTIONS[0];

                        return (
                          <div
                            key={rec.id}
                            className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              memberObj?.bgLight || 'bg-slate-50'
                            } ${memberObj?.borderLight || 'border-slate-200'}`}
                          >
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Avatar + Tên người qua phụ (chữ ≥ 16px cho Mẹ đọc) */}
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-8 h-8 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 ${
                                      memberObj?.badgeColor || 'bg-emerald-600'
                                    }`}
                                  >
                                    {memberObj?.avatarInitials || mainName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <span className="text-base font-black text-slate-900">
                                    {assignees.join(', ')}
                                  </span>
                                  {memberObj?.relation && (
                                    <span className="text-xs font-bold text-slate-600">
                                      ({memberObj.relation})
                                    </span>
                                  )}
                                </div>

                                {/* Badge buổi & giờ */}
                                <span
                                  className={`px-2.5 py-0.5 rounded-lg border text-xs font-black inline-flex items-center gap-1 ${sessionOpt.badgeClass}`}
                                >
                                  <span>{sessionOpt.emoji}</span>
                                  <span>{rec.name || sessionOpt.label}</span>
                                </span>

                                {rec.timeRange && (
                                  <span className="text-xs font-bold text-slate-600 inline-flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-lg border border-slate-200/80">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    {rec.timeRange}
                                  </span>
                                )}
                              </div>

                              {/* Người đi cùng hỗ trợ */}
                              {supporters.length > 0 && (
                                <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 flex-wrap">
                                  <span>🤝 Đi cùng:</span>
                                  {supporters.map((s) => (
                                    <span
                                      key={s}
                                      className="px-2 py-0.5 rounded-md bg-white/80 border border-emerald-200 text-emerald-900"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Ghi chú công việc phụ Mẹ */}
                              {rec.handover?.note && (
                                <div className="text-base text-slate-800 font-medium flex items-start gap-1.5 pt-0.5">
                                  <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                                  <span>{rec.handover.note}</span>
                                </div>
                              )}
                            </div>

                            {/* Nút Sửa / Xoá */}
                            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                              <button
                                type="button"
                                onClick={() => handleOpenEditForm(rec)}
                                className="min-h-[42px] px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Sửa lịch này"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Sửa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSupport(rec)}
                                disabled={deletingId === rec.id}
                                className="min-h-[42px] px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                                title="Huỷ lịch này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Huỷ</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ===== THỐNG KÊ TỔNG HỢP ĐỒNG HÀNH GIA ĐÌNH ===== */}
          <div className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Đại Gia Đình Đồng Hành Cùng Bố Mẹ
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tổng hợp các buổi qua phụ tại nhà & những ngày trực viện ICU
                  </p>
                </div>
              </div>

              {onOpenMembers && (
                <button
                  type="button"
                  onClick={onOpenMembers}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span>Quản lý thành viên</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {memberContributionStats.map(({ member, homeCount, icuCount, total }) => (
                <div
                  key={member.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                    member.bgLight || 'bg-slate-50'
                  } ${member.borderLight || 'border-slate-200'}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 ${
                        member.badgeColor || 'bg-slate-600'
                      }`}
                    >
                      {member.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">
                        {member.name}
                      </div>
                      <div className="text-xs text-slate-600 truncate">
                        {member.relation}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-slate-900">
                      {total} <span className="text-xs font-bold text-slate-500">buổi</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {homeCount > 0 && <span>🏠 {homeCount} </span>}
                      {icuCount > 0 && <span>🏥 {icuCount}</span>}
                      {total === 0 && <span>Sẵn sàng</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ===== SUB-TAB 2: KỶ NIỆM & LỊCH SỬ TRỰC VIỆN ICU ===== */
        <ShiftHistoryView shifts={shifts} members={members} />
      )}
    </div>
  );
}
