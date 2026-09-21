'use client';

import React, { useState, useMemo } from 'react';
import { CarePhase, FamilyMember, ShiftRecord, PatientVitals, PatientInfo } from '@/lib/types';
import { FAMILY_MEMBERS } from '@/lib/config';
import ExportWeekModal from './ExportWeekModal';
import ShiftDetailModal from './ShiftDetailModal';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  Share2,
  Sun,
  Sunset,
  Moon,
  UserPlus,
  LayoutGrid,
  CalendarDays,
  ClipboardList,
  Sparkles,
} from 'lucide-react';

export interface DaySchedule {
  dateStr: string;
  dayOfWeekVi: string;
  displayDate: string;
  dayOfMonth: number;
  month: number;
  year: number;
  isToday: boolean;
  shifts: ShiftRecord[];
  understaffedCount: number;
}

interface WeeklyViewProps {
  days: DaySchedule[];
  currentMember: FamilyMember | null;
  activePhase: CarePhase;
  currentWeekOffset: number;
  onChangeWeekOffset: (delta: number) => void;
  onResetToCurrentWeek: () => void;
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
  members?: FamilyMember[];
  patientInfo?: PatientInfo;
}

export default function WeeklyView({
  days,
  currentMember,
  activePhase,
  currentWeekOffset,
  onChangeWeekOffset,
  onResetToCurrentWeek,
  onAssign,
  onUnassign,
  onToggleChecklist,
  onSaveHandover,
  onUpdateShift,
  members,
  patientInfo,
}: WeeklyViewProps) {
  const familyList = members && members.length > 0 ? members : FAMILY_MEMBERS;
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState<ShiftRecord | null>(null);

  // View sub-mode: 'matrix' (lưới ma trận tuần) hoặc 'day' (theo từng ngày)
  const [viewMode, setViewMode] = useState<'matrix' | 'day'>('matrix');

  // Selected day for 'day' view
  const todaySchedule = useMemo(() => days.find((d) => d.isToday), [days]);
  const [selectedDayDateStr, setSelectedDayDateStr] = useState<string>(
    () => todaySchedule?.dateStr || days[0]?.dateStr || ''
  );

  const startDay = days[0];
  const endDay = days[days.length - 1];
  const totalUnderstaffed = days.reduce((sum, d) => sum + d.understaffedCount, 0);

  // Cấu hình các hàng ca trực theo từng giai đoạn
  const shiftTypesInPhase = useMemo(() => {
    if (activePhase === 'phase1') {
      return [
        { type: 'morning', name: 'Ca Sáng', timeRange: '06:00 - 14:00', icon: Sun, color: 'text-amber-500' },
        { type: 'afternoon', name: 'Ca Chiều', timeRange: '14:00 - 22:00', icon: Sunset, color: 'text-orange-500' },
        { type: 'night', name: 'Ca Đêm', timeRange: '22:00 - 06:00', icon: Moon, color: 'text-indigo-500' },
      ];
    }
    return [
      { type: 'day_12h', name: 'Ca Ngày (12h)', timeRange: '07:00 - 19:00', icon: Sun, color: 'text-amber-500' },
      { type: 'night_12h', name: 'Ca Đêm (12h)', timeRange: '19:00 - 07:00', icon: Moon, color: 'text-indigo-500' },
    ];
  }, [activePhase]);

  // Handle 1-click slot assign from matrix or card
  const handleSlotClick = (shift: ShiftRecord, slotIndex: number) => {
    if (currentMember) {
      onAssign(shift, slotIndex, currentMember);
    } else {
      setSelectedShiftForDetail(shift);
    }
  };

  const selectedDaySchedule = days.find((d) => d.dateStr === selectedDayDateStr) || days[0];

  return (
    <div className="space-y-4">
      {/* 1. THANH ĐIỀU HƯỚNG TUẦN & CHỌN CHẾ ĐỘ XEM */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
        {/* Nút điều hướng tuần */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => onChangeWeekOffset(-1)}
              className="p-1.5 sm:px-2 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-white transition cursor-pointer"
              title="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onResetToCurrentWeek}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                currentWeekOffset === 0
                  ? 'bg-white text-indigo-700 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tuần Này
            </button>
            <button
              type="button"
              onClick={() => onChangeWeekOffset(1)}
              className="p-1.5 sm:px-2 rounded-lg text-slate-700 hover:text-slate-950 hover:bg-white transition cursor-pointer"
              title="Tuần sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs sm:text-sm font-black text-slate-800 ml-1">
            {startDay?.displayDate} – {endDay?.displayDate}
          </div>
        </div>

        {/* Nút xuất Zalo & Đổi chế độ Lưới / Ngày */}
        <div className="flex items-center gap-2">
          {/* Toggle Lưới tuần / Theo ngày */}
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white text-slate-900 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem toàn bộ 7 ngày dưới dạng bảng ma trận lưới trực quan"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Lưới Tuần</span>
              <span className="sm:hidden">Lưới</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white text-slate-900 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem chi tiết từng ngày"
            >
              <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Theo Ngày</span>
              <span className="sm:hidden">Ngày</span>
            </button>
          </div>

          {/* Nút Xuất ảnh Zalo */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            id="btn-export-week-zalo"
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition cursor-pointer"
            title="Xuất lịch tuần dạng ảnh hoặc PDF gửi Zalo"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất Zalo</span>
          </button>
        </div>
      </div>

      {/* 2. TIÊU ĐIỂM "CA TRỰC HÔM NAY" (TODAY'S SHIFTS HERO FOCUS) */}
      {todaySchedule && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-md relative overflow-hidden space-y-3">
          <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header Tiêu điểm hôm nay */}
          <div className="flex items-center justify-between gap-2 border-b border-indigo-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Hôm Nay ({todaySchedule.dayOfWeekVi}, {todaySchedule.displayDate})
              </h3>
            </div>

            <div className="text-xs font-bold">
              {todaySchedule.understaffedCount > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  Còn thiếu {todaySchedule.understaffedCount} người trực!
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Đủ người trực hôm nay
                </span>
              )}
            </div>
          </div>

          {/* Danh sách 2-3 ca trực hôm nay dạng Card Ngang */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {todaySchedule.shifts.map((shift) => {
              const reqPax = shift.requiredPax;
              const isMissing = shift.isUnderstaffed;

              const renderIcon = () => {
                if (shift.type === 'morning' || shift.type === 'day_12h')
                  return <Sun className="w-4 h-4 text-amber-400" />;
                if (shift.type === 'afternoon')
                  return <Sunset className="w-4 h-4 text-orange-400" />;
                return <Moon className="w-4 h-4 text-indigo-300" />;
              };

              const completedChecks = [
                shift.checklist.feeding,
                shift.checklist.meds,
                shift.checklist.hygiene,
                shift.checklist.turning,
              ].filter(Boolean).length;

              return (
                <div
                  key={shift.id}
                  className={`rounded-2xl p-3 border transition-all ${
                    isMissing
                      ? 'bg-rose-950/40 border-rose-500/50 shadow-xs'
                      : 'bg-white/10 border-white/15'
                  }`}
                >
                  {/* Tiêu đề ca */}
                  <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5">
                      {renderIcon()}
                      <span className="text-xs sm:text-sm font-black text-white">{shift.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-300 font-medium">{shift.timeRange}</span>
                  </div>

                  {/* Danh sách người trực */}
                  <div className="py-2 space-y-1.5">
                    {Array.from({ length: reqPax }).map((_, slotIdx) => {
                      const assignee = shift.assignees[slotIdx];
                      const member = familyList.find((m) => m.name === assignee);

                      if (assignee) {
                        return (
                          <div
                            key={slotIdx}
                            onClick={() => setSelectedShiftForDetail(shift)}
                            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-between gap-2 cursor-pointer transition"
                            title="Bấm để xem ghi chú bàn giao hoặc checklist"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`w-6 h-6 rounded-lg text-white font-bold text-[10px] flex items-center justify-center shrink-0 ${
                                  member?.badgeColor || 'bg-slate-700'
                                }`}
                              >
                                {member?.avatarInitials || 'TV'}
                              </div>
                              <span className="text-xs font-bold text-white truncate">
                                {assignee}
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              Đã nhận
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={slotIdx}
                          onClick={() => handleSlotClick(shift, slotIdx)}
                          className="p-1.5 rounded-xl border border-dashed border-rose-400/70 bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-between gap-2 cursor-pointer transition group"
                        >
                          <span className="text-xs font-bold text-rose-300 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            Trống người trực!
                          </span>
                          <span className="text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-500 px-2 py-0.5 rounded-lg shadow-2xs group-hover:scale-105 transition">
                            + Nhận ca
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Người hỗ trợ đi cùng (nếu có) */}
                  {shift.supporters && shift.supporters.length > 0 && (
                    <div
                      onClick={() => setSelectedShiftForDetail(shift)}
                      className="text-[11px] font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 px-2 py-1 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-emerald-950/60 transition"
                      title={`Thành viên phụ vào hỗ trợ: ${shift.supporters.join(', ')}`}
                    >
                      <span>🤝 Phụ:</span>
                      <span className="truncate">{shift.supporters.join(', ')}</span>
                    </div>
                  )}

                  {/* Thanh Footer ca: Checklist & nút chi tiết */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-300 border-t border-white/10">
                    <span className="flex items-center gap-1">
                      <ClipboardList className="w-3 h-3 text-indigo-300" />
                      Việc làm: {completedChecks}/4
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedShiftForDetail(shift)}
                      className="text-[11px] font-bold text-indigo-200 hover:text-white underline cursor-pointer"
                    >
                      Bàn giao & Sinh hiệu &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. BẢNG MA TRẬN LỊCH TUẦN TRỰC QUAN (MODE 1: WEEKLY CALENDAR MATRIX) */}
      {viewMode === 'matrix' ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-3 sm:p-5 shadow-sm space-y-3">
          {/* Header Bảng Tuần */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-indigo-600" />
                Ma Trận Lịch Trực 7 Ngày Trong Tuần
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Chạm vào ô có tên để xem bàn giao, chạm vào ô trống để nhận ca trực
              </p>
            </div>

            {totalUnderstaffed > 0 ? (
              <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl shadow-2xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Còn {totalUnderstaffed} ca trống
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl shadow-2xs flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Toàn bộ ca đã đủ người
              </span>
            )}
          </div>

          {/* BẢNG LƯỚI MA TRẬN (7 CỘT x 3 HÀNG) CÓ THANH CUỘN NGANG MƯỢT MÀ */}
          <div className="overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[720px] border-collapse text-left">
              {/* Hàng Tiêu Đề 7 Ngày */}
              <thead>
                <tr>
                  <th className="p-2.5 text-xs font-black uppercase tracking-wider text-slate-400 w-28 bg-slate-50/80 rounded-l-2xl border-b border-slate-100">
                    Ca Trực
                  </th>
                  {days.map((day) => (
                    <th
                      key={day.dateStr}
                      className={`p-2.5 text-center border-b transition ${
                        day.isToday
                          ? 'bg-indigo-600 text-white font-black shadow-xs'
                          : 'bg-slate-50/80 text-slate-800 font-bold border-slate-100'
                      }`}
                    >
                      <div className="text-xs font-black uppercase">{day.dayOfWeekVi}</div>
                      <div
                        className={`text-sm font-black ${
                          day.isToday ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {day.displayDate.split('/')[0]}/{day.displayDate.split('/')[1]}
                      </div>
                      {day.isToday && (
                        <span className="inline-block text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 mt-0.5">
                          Hôm nay
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Thân Bảng: Từng Ca Trực */}
              <tbody className="divide-y divide-slate-100">
                {shiftTypesInPhase.map((shiftMeta) => {
                  const Icon = shiftMeta.icon;

                  return (
                    <tr key={shiftMeta.type} className="hover:bg-slate-50/40 transition">
                      {/* Cột Tên Ca Trực */}
                      <td className="p-2.5 bg-slate-50/50 border-r border-slate-100 font-bold">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`w-4 h-4 shrink-0 ${shiftMeta.color}`} />
                          <span className="text-xs font-black text-slate-900">{shiftMeta.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium pl-5">
                          {shiftMeta.timeRange}
                        </div>
                      </td>

                      {/* 7 Ô Tương Ứng Với 7 Ngày */}
                      {days.map((day) => {
                        const shift = day.shifts.find((s) => s.type === shiftMeta.type);
                        if (!shift) {
                          return (
                            <td key={day.dateStr} className="p-2 text-center text-slate-300 text-xs">
                              -
                            </td>
                          );
                        }

                        const isMissing = shift.isUnderstaffed;

                        return (
                          <td
                            key={day.dateStr}
                            className={`p-1.5 sm:p-2 border-r border-slate-100 align-top transition ${
                              day.isToday ? 'bg-indigo-50/30' : ''
                            } ${isMissing ? 'bg-rose-50/20' : ''}`}
                          >
                            <div className="space-y-1 min-h-[58px] flex flex-col justify-center">
                              {Array.from({ length: shift.requiredPax }).map((_, slotIdx) => {
                                const assigneeName = shift.assignees[slotIdx];
                                const isAssigned = Boolean(assigneeName);
                                const member = familyList.find((m) => m.name === assigneeName);

                                if (isAssigned) {
                                  return (
                                    <button
                                      key={slotIdx}
                                      type="button"
                                      onClick={() => setSelectedShiftForDetail(shift)}
                                      className={`w-full p-1.5 rounded-xl border text-left flex items-center justify-between gap-1.5 transition cursor-pointer shadow-2xs hover:scale-[1.02] ${
                                        member?.bgLight || 'bg-blue-50'
                                      } ${member?.borderLight || 'border-blue-200'}`}
                                      title="Bấm để xem dặn dò hoặc bàn giao"
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <div
                                          className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[9px] text-white shrink-0 ${
                                            member?.badgeColor || 'bg-slate-700'
                                          }`}
                                        >
                                          {member?.avatarInitials || 'TV'}
                                        </div>
                                        <span className="text-xs font-black text-slate-900 truncate">
                                          {assigneeName}
                                        </span>
                                      </div>
                                      {shift.checklist.meds && shift.checklist.feeding && (
                                        <span className="text-[10px] text-emerald-600 font-black">
                                          ✓
                                        </span>
                                      )}
                                    </button>
                                  );
                                }

                                // Ô Trống ca
                                return (
                                  <button
                                    key={slotIdx}
                                    type="button"
                                    onClick={() => handleSlotClick(shift, slotIdx)}
                                    className="w-full py-1.5 px-2 rounded-xl border-2 border-dashed border-rose-300 hover:border-rose-400 bg-white hover:bg-rose-50/80 text-rose-700 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-2xs group"
                                    title="Chạm để nhận ca trực này"
                                  >
                                    <UserPlus className="w-3 h-3 text-rose-500 group-hover:scale-110 transition" />
                                    <span>Trống ca</span>
                                  </button>
                                );
                              })}

                              {/* Người hỗ trợ đi cùng */}
                              {shift.supporters && shift.supporters.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedShiftForDetail(shift)}
                                  className="w-full text-left text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-200 truncate cursor-pointer hover:bg-emerald-100 transition"
                                  title={`Người hỗ trợ: ${shift.supporters.join(', ')}`}
                                >
                                  🤝 +{shift.supporters.join(', ')}
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 4. CHẾ ĐỘ XEM THEO NGÀY (MODE 2: DAY STRIP SELECTOR + COMPACT DAY CARDS) */
        <div className="bg-white border border-slate-200 rounded-3xl p-3 sm:p-5 shadow-sm space-y-4">
          {/* Dải băng chọn ngày 7 ngày nằm ngang */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
            {days.map((day) => {
              const isSelected = day.dateStr === selectedDayDateStr;

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDayDateStr(day.dateStr)}
                  className={`min-w-[68px] sm:min-w-[80px] p-2 rounded-2xl border text-center transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : day.isToday
                      ? 'bg-indigo-50 text-indigo-900 border-indigo-300 font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-black uppercase">{day.dayOfWeekVi}</div>
                  <div className="text-sm font-black">{day.displayDate.split('/')[0]}</div>
                  <div className="pt-0.5 flex items-center justify-center">
                    {day.understaffedCount > 0 ? (
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chi tiết các ca trực của ngày được chọn */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-black text-slate-900">
                  Lịch trực {selectedDaySchedule.dayOfWeekVi} (
                  {selectedDaySchedule.displayDate})
                </span>
                {selectedDaySchedule.isToday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                    Hôm nay
                  </span>
                )}
              </div>

              {selectedDaySchedule.understaffedCount > 0 ? (
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200">
                  Thiếu {selectedDaySchedule.understaffedCount} ca
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  Đủ người trực
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {selectedDaySchedule.shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="rounded-2xl border border-slate-200 p-3.5 space-y-3 bg-white shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-black text-slate-900 text-sm">{shift.name}</div>
                    <div className="text-xs text-slate-500 font-medium">{shift.timeRange}</div>
                  </div>

                  <div className="space-y-1.5">
                    {Array.from({ length: shift.requiredPax }).map((_, slotIdx) => {
                      const assignee = shift.assignees[slotIdx];
                      const member = familyList.find((m) => m.name === assignee);

                      if (assignee) {
                        return (
                          <div
                            key={slotIdx}
                            onClick={() => setSelectedShiftForDetail(shift)}
                            className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                              member?.bgLight || 'bg-slate-50'
                            } ${member?.borderLight || 'border-slate-200'}`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center ${
                                  member?.badgeColor || 'bg-slate-700'
                                }`}
                              >
                                {member?.avatarInitials || 'TV'}
                              </div>
                              <span className="text-xs font-bold text-slate-900">{assignee}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 underline">Chi tiết</span>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={slotIdx}
                          type="button"
                          onClick={() => handleSlotClick(shift, slotIdx)}
                          className="w-full py-2 px-3 rounded-xl border-2 border-dashed border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Chưa có người - Bấm nhận ca</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Người hỗ trợ đi cùng */}
                  {shift.supporters && shift.supporters.length > 0 && (
                    <div
                      onClick={() => setSelectedShiftForDetail(shift)}
                      className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl cursor-pointer hover:bg-emerald-100 flex items-center gap-1.5 transition"
                      title={`Người hỗ trợ: ${shift.supporters.join(', ')}`}
                    >
                      <span>🤝 Hỗ trợ:</span>
                      <span className="truncate">{shift.supporters.join(', ')}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedShiftForDetail(shift)}
                    className="w-full py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
                  >
                    Bàn giao & Checklist ca trực
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL CHI TIẾT CA TRỰC & BÀN GIAO */}
      <ShiftDetailModal
        isOpen={Boolean(selectedShiftForDetail)}
        onClose={() => setSelectedShiftForDetail(null)}
        shift={selectedShiftForDetail}
        currentMember={currentMember}
        members={members}
        onAssign={onAssign}
        onUnassign={onUnassign}
        onToggleChecklist={onToggleChecklist}
        onSaveHandover={onSaveHandover}
        onUpdateShift={onUpdateShift}
      />

      {/* 6. MODAL XUẤT ẢNH LỊCH TRỰC ZALO */}
      <ExportWeekModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        days={days}
        activePhase={activePhase}
        patientInfo={patientInfo}
        members={members}
      />
    </div>
  );
}
