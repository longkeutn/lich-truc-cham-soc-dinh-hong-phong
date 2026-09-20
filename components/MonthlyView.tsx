'use client';

import React, { useState, useMemo } from 'react';
import { CarePhase, FamilyMember, ShiftRecord, PatientVitals } from '@/lib/types';
import ShiftCard from './ShiftCard';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface MonthlyViewProps {
  shifts: ShiftRecord[];
  currentMember: FamilyMember | null;
  activePhase: CarePhase;
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
}

export default function MonthlyView({
  shifts,
  currentMember,
  activePhase,
  onAssign,
  onUnassign,
  onToggleChecklist,
  onSaveHandover,
  members,
}: MonthlyViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Tính các ngày trong tháng
  const monthDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // 0 = Sun, 1 = Mon ...
    let startingDayOfWeek = firstDay.getDay();
    // Chuyển 0 (CN) thành 6, 1 (T2) thành 0
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days = [];
    // Padding ngày tháng trước
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: 0, dateStr: '', isCurrentMonth: false });
    }

    // Ngày trong tháng
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isCurrentMonth: true });
    }

    return days;
  }, [year, month]);

  // Nhóm ca theo ngày
  const shiftsByDate = useMemo(() => {
    const map = new Map<string, ShiftRecord[]>();
    shifts.forEach((s) => {
      const arr = map.get(s.date) || [];
      arr.push(s);
      map.set(s.date, arr);
    });
    return map;
  }, [shifts]);

  const selectedDayShifts = useMemo(() => {
    return shifts.filter((s) => s.date === selectedDateStr && s.phase === activePhase);
  }, [shifts, selectedDateStr, activePhase]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  return (
    <div className="space-y-5">
      {/* Thanh điều hướng tháng */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition min-h-[44px] cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center justify-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            <span>Tháng {month + 1}, {year}</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Chạm vào một ngày để xem và điều phối các ca trực
          </p>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 transition min-h-[44px] cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Grid lịch tháng */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm">
        {/* Tiêu đề thứ trong tuần */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[11px] sm:text-xs font-bold text-slate-500 uppercase">
          <div>T2</div>
          <div>T3</div>
          <div>T4</div>
          <div>T5</div>
          <div>T6</div>
          <div className="text-amber-600">T7</div>
          <div className="text-rose-600">CN</div>
        </div>

        {/* Ô ngày */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {monthDays.map((item, index) => {
            if (!item.isCurrentMonth) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[56px] sm:min-h-[70px] rounded-xl bg-slate-50/60 border border-slate-100 opacity-40"
                />
              );
            }

            const dayShifts = shiftsByDate.get(item.dateStr) || [];
            const understaffed = dayShifts.filter((s) => s.isUnderstaffed).length;
            const isSelected = item.dateStr === selectedDateStr;
            const isToday = item.dateStr === todayStr;

            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => setSelectedDateStr(item.dateStr)}
                className={`min-h-[56px] sm:min-h-[70px] p-1.5 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-600/30 text-indigo-950'
                    : isToday
                    ? 'bg-emerald-50/60 border-emerald-500 text-slate-900'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-black ${
                      isToday ? 'text-emerald-700' : isSelected ? 'text-indigo-700' : 'text-slate-800'
                    }`}
                  >
                    {item.day}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Hôm nay" />
                  )}
                </div>

                <div className="mt-1">
                  {dayShifts.length > 0 ? (
                    understaffed > 0 ? (
                      <span className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 block truncate text-center">
                        Thiếu {understaffed}
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 block truncate text-center">
                        Đủ
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] text-slate-400 block text-center">–</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chi tiết ca của ngày được chọn */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-black text-slate-900">
              Chi tiết ca trực ngày {selectedDateStr.split('-').reverse().join('/')}
            </span>
            {selectedDateStr === todayStr && (
              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                Hôm nay
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-slate-500">
            {selectedDayShifts.length} ca trực
          </span>
        </div>

        <div className="space-y-3">
          {selectedDayShifts.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl bg-slate-50">
              Không có ca trực nào được phân bổ cho ngày này.
            </div>
          ) : (
            selectedDayShifts.map((shift) => (
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
    </div>
  );
}
