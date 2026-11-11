'use client';

import React from 'react';
import type { FamilyMember, ShiftRecord } from '@/lib/types';
import type { DaySchedule } from '@/components/WeeklyView';
import {
  AlertTriangle,
  LayoutGrid,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

interface ShiftTypeMeta {
  type: string;
  name: string;
  timeRange: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface WeeklyMatrixAndDayPanelsProps {
  viewMode: 'matrix' | 'day';
  days: DaySchedule[];
  shiftTypesInPhase: ShiftTypeMeta[];
  familyList: FamilyMember[];
  totalUnderstaffed: number;
  selectedDayDateStr: string;
  selectedDaySchedule: DaySchedule;
  onSelectDayDateStr: (dateStr: string) => void;
  onSelectShiftForDetail: (shift: ShiftRecord) => void;
  onSlotClick: (shift: ShiftRecord, slotIndex: number) => void;
}

export default function WeeklyMatrixAndDayPanels({
  viewMode,
  days,
  shiftTypesInPhase,
  familyList,
  totalUnderstaffed,
  selectedDayDateStr,
  selectedDaySchedule,
  onSelectDayDateStr,
  onSelectShiftForDetail,
  onSlotClick,
}: WeeklyMatrixAndDayPanelsProps) {
  if (viewMode === 'matrix') {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-3 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
              Ma Trận Lịch Trực 7 Ngày Trong Tuần
            </h3>
            <p className="text-xs text-slate-600 font-medium">
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

        <div className="overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr>
                <th className="p-2.5 text-xs font-black uppercase tracking-wider text-slate-500 w-28 bg-slate-50/80 rounded-l-2xl border-b border-slate-100">
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

            <tbody className="divide-y divide-slate-100">
              {shiftTypesInPhase.map((shiftMeta) => {
                const Icon = shiftMeta.icon;

                return (
                  <tr key={shiftMeta.type} className="hover:bg-slate-50/40 transition">
                    <td className="p-2.5 bg-slate-50/50 border-r border-slate-100 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-4 h-4 shrink-0 ${shiftMeta.color}`} />
                        <span className="text-xs font-black text-slate-900">{shiftMeta.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium pl-5">
                        {shiftMeta.timeRange}
                      </div>
                    </td>

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
                                    onClick={() => onSelectShiftForDetail(shift)}
                                    className={`w-full min-h-[48px] p-1.5 rounded-xl border text-left flex items-center justify-between gap-1.5 transition cursor-pointer shadow-2xs hover:scale-[1.02] ${
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

                              return (
                                <button
                                  key={slotIdx}
                                  type="button"
                                  onClick={() => onSlotClick(shift, slotIdx)}
                                  className="w-full min-h-[48px] py-1.5 px-2 rounded-xl border-2 border-dashed border-rose-300 hover:border-rose-400 bg-white hover:bg-rose-50/80 text-rose-700 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-2xs group"
                                  title="Chạm để nhận ca trực này"
                                >
                                  <UserPlus className="w-3 h-3 text-rose-500 group-hover:scale-110 transition" />
                                  <span>Trống ca</span>
                                </button>
                              );
                            })}

                            {shift.supporters && shift.supporters.length > 0 && (
                              <button
                                type="button"
                                onClick={() => onSelectShiftForDetail(shift)}
                                className="w-full min-h-[48px] text-left text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-200 truncate cursor-pointer hover:bg-emerald-100 transition flex items-center"
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
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-3 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
        {days.map((day) => {
          const isSelected = day.dateStr === selectedDayDateStr;

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => onSelectDayDateStr(day.dateStr)}
              className={`min-h-[48px] min-w-[68px] sm:min-w-[80px] p-2 rounded-2xl border text-center transition cursor-pointer shrink-0 ${
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

      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-black text-slate-900">
              Lịch trực {selectedDaySchedule.dayOfWeekVi} ({selectedDaySchedule.displayDate})
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
                <div className="text-xs text-slate-600 font-medium">{shift.timeRange}</div>
              </div>

              <div className="space-y-1.5">
                {Array.from({ length: shift.requiredPax }).map((_, slotIdx) => {
                  const assignee = shift.assignees[slotIdx];
                  const member = familyList.find((m) => m.name === assignee);

                  if (assignee) {
                    return (
                      <div
                        key={slotIdx}
                        onClick={() => onSelectShiftForDetail(shift)}
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
                        <span className="text-[10px] text-slate-600 underline">Chi tiết</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slotIdx}
                      type="button"
                      onClick={() => onSlotClick(shift, slotIdx)}
                      className="w-full min-h-[48px] py-2 px-3 rounded-xl border-2 border-dashed border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Chưa có người - Bấm nhận ca</span>
                    </button>
                  );
                })}
              </div>

              {shift.supporters && shift.supporters.length > 0 && (
                <div
                  onClick={() => onSelectShiftForDetail(shift)}
                  className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl cursor-pointer hover:bg-emerald-100 flex items-center gap-1.5 transition"
                  title={`Người hỗ trợ: ${shift.supporters.join(', ')}`}
                >
                  <span>🤝 Hỗ trợ:</span>
                  <span className="truncate">{shift.supporters.join(', ')}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => onSelectShiftForDetail(shift)}
                className="w-full min-h-[48px] py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
              >
                Bàn giao &amp; Checklist ca trực
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
