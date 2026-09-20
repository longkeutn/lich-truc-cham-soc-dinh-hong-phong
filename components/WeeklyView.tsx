'use client';

import React, { useState } from 'react';
import { CarePhase, FamilyMember, ShiftRecord, PatientVitals, PatientInfo } from '@/lib/types';
import ShiftCard from './ShiftCard';
import ExportWeekModal from './ExportWeekModal';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, ShieldCheck, Share2 } from 'lucide-react';

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
  members,
  patientInfo,
}: WeeklyViewProps) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const startDay = days[0];
  const endDay = days[days.length - 1];
  const totalUnderstaffed = days.reduce((sum, d) => sum + d.understaffedCount, 0);

  return (
    <div className="space-y-4">
      {/* Thanh điều hướng tuần */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChangeWeekOffset(-1)}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Tuần trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onResetToCurrentWeek}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition min-h-[44px] flex items-center gap-1.5 cursor-pointer ${
              currentWeekOffset === 0
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Tuần này</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeWeekOffset(1)}
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Tuần sau"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Nút Xuất ảnh chia sẻ Zalo */}
          <button
            type="button"
            id="btn-export-week-zalo"
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition min-h-[44px] flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer ml-1"
            title="Xuất lịch trực tuần này ra hình ảnh hoặc PDF để gửi nhóm Zalo gia đình"
          >
            <Share2 className="w-4 h-4" />
            <span>Xuất ảnh Zalo</span>
          </button>
        </div>

        <div className="text-center sm:text-right">
          <div className="text-sm sm:text-base font-black text-slate-900">
            {startDay?.displayDate} – {endDay?.displayDate}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {totalUnderstaffed > 0 ? (
              <span className="text-rose-600 font-bold flex items-center justify-center sm:justify-end gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Tuần này còn {totalUnderstaffed} ca chưa đủ người trực
              </span>
            ) : (
              <span className="text-emerald-700 font-bold flex items-center justify-center sm:justify-end gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Tuyệt vời! Tất cả ca trong tuần đã đủ người trực
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal Xuất Lịch Trực & Chia Sẻ Zalo */}
      <ExportWeekModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        days={days}
        activePhase={activePhase}
        patientInfo={patientInfo}
        members={members}
      />

      {/* Danh sách 7 ngày trong tuần */}
      <div className="space-y-6">
        {days.map((day) => (
          <div
            key={day.dateStr}
            className={`rounded-2xl border p-3.5 sm:p-5 transition shadow-xs ${
              day.isToday
                ? 'bg-white border-indigo-300 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-100'
                : 'bg-white border-slate-200'
            }`}
          >
            {/* Tiêu đề ngày */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span
                  className={`px-3 py-1 rounded-xl text-xs sm:text-sm font-black uppercase ${
                    day.isToday
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {day.dayOfWeekVi}
                </span>

                <span className="text-sm sm:text-base font-black text-slate-900">
                  {day.displayDate}
                </span>

                {day.isToday && (
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                    HÔM NAY
                  </span>
                )}
              </div>

              <div>
                {day.understaffedCount > 0 ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1 shadow-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Thiếu {day.understaffedCount} ca
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Đủ người
                  </span>
                )}
              </div>
            </div>

            {/* Danh sách các ca trực trong ngày */}
            <div className="grid grid-cols-1 gap-3.5">
              {day.shifts.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs sm:text-sm border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  Chưa có dữ liệu ca trực cho ngày này.
                </div>
              ) : (
                day.shifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    currentMember={currentMember}
                    members={members}
                    onAssign={onAssign}
                    onUnassign={onUnassign}
                    onToggleChecklist={onToggleChecklist}
                    onSaveHandover={onSaveHandover}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
