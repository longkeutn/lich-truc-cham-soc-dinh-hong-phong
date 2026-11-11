'use client';

import React, { useState, useMemo } from 'react';
import { CarePhase, FamilyMember, ShiftRecord, PatientVitals, PatientInfo } from '@/lib/types';
import { FAMILY_MEMBERS } from '@/lib/config';
import ExportWeekModal from './ExportWeekModal';
import ShiftDetailModal from './ShiftDetailModal';
import WeeklyMatrixAndDayPanels from './legacy-shifts/WeeklyMatrixAndDayPanels';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  Share2,
  Sun,
  Sunset,
  Moon,
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
  const [viewMode, setViewMode] = useState<'matrix' | 'day'>('matrix');

  const todaySchedule = useMemo(() => days.find((d) => d.isToday), [days]);
  const [selectedDayDateStr, setSelectedDayDateStr] = useState<string>(
    () => todaySchedule?.dateStr || days[0]?.dateStr || ''
  );

  const startDay = days[0];
  const endDay = days[days.length - 1];
  const totalUnderstaffed = days.reduce((sum, d) => sum + d.understaffedCount, 0);

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

  const handleSlotClick = (shift: ShiftRecord, slotIndex: number) => {
    if (currentMember) {
      void onAssign(shift, slotIndex, currentMember);
    } else {
      setSelectedShiftForDetail(shift);
    }
  };

  const selectedDaySchedule = days.find((d) => d.dateStr === selectedDayDateStr) || days[0];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
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
            {startDay?.displayDate} - {endDay?.displayDate}
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {todaySchedule && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-md relative overflow-hidden space-y-3">
          <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

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
                  <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-1.5">
                      {renderIcon()}
                      <span className="text-xs sm:text-sm font-black text-white">{shift.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-300 font-medium">{shift.timeRange}</span>
                  </div>

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
                      Bàn giao &amp; Sinh hiệu &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedDaySchedule && (
        <WeeklyMatrixAndDayPanels
          viewMode={viewMode}
          days={days}
          shiftTypesInPhase={shiftTypesInPhase}
          familyList={familyList}
          totalUnderstaffed={totalUnderstaffed}
          selectedDayDateStr={selectedDayDateStr}
          selectedDaySchedule={selectedDaySchedule}
          onSelectDayDateStr={setSelectedDayDateStr}
          onSelectShiftForDetail={setSelectedShiftForDetail}
          onSlotClick={handleSlotClick}
        />
      )}

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
