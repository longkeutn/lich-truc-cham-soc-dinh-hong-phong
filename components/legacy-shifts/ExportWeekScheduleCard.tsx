'use client';

import React from 'react';
import type { CarePhase, FamilyMember, PatientInfo } from '@/lib/types';
import type { DaySchedule } from '@/components/WeeklyView';
import { PHASE_CONFIGS } from '@/lib/config';
import {
  AlertTriangle,
  Clock,
  HeartPulse,
  Hospital,
  Moon,
  Phone,
  ShieldCheck,
  Sun,
  Sunset,
} from 'lucide-react';

interface ExportWeekScheduleCardProps {
  cardRef: React.RefObject<HTMLDivElement | null>;
  days: DaySchedule[];
  activePhase: CarePhase;
  patient: PatientInfo;
  familyList: FamilyMember[];
  dateRangeStr: string;
  totalUnderstaffed: number;
}

export default function ExportWeekScheduleCard({
  cardRef,
  days,
  activePhase,
  patient,
  familyList,
  dateRangeStr,
  totalUnderstaffed,
}: ExportWeekScheduleCardProps) {
  const getMemberByName = (name: string | null): FamilyMember | undefined => {
    if (!name) return undefined;
    return familyList.find((m) => m.name === name);
  };

  return (
    <div
      ref={cardRef}
      id="export-schedule-card"
      className="w-[820px] bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-300 shadow-xl space-y-6 text-slate-900"
      style={{ width: '820px', minWidth: '820px' }}
    >
      <div className="border-b-2 border-slate-200 pb-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
              <HeartPulse className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 inline-block mb-1">
                LỊCH TRỰC CHĂM SÓC GIA ĐÌNH
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                Bệnh nhân: {patient.name}
              </h1>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold uppercase text-slate-500">Giai đoạn</div>
            <div className="text-sm font-black text-indigo-700">
              {PHASE_CONFIGS[activePhase].name}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <Hospital className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold text-slate-700 truncate">
              {patient.hospital}
            </span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-slate-600 font-medium">Vị trí:</span>
            <span className="font-bold text-slate-900">{patient.room}</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs">
          <div className="flex items-center gap-2 font-black text-indigo-950">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Tuần lễ: {dateRangeStr}</span>
          </div>

          <div>
            {totalUnderstaffed > 0 ? (
              <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold border border-rose-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Cần gia đình hỗ trợ thêm {totalUnderstaffed} ca
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Đã phân bổ đủ người trực cả tuần
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <span>Chi tiết ca phân công từng ngày</span>
        </h3>

        <div className="grid grid-cols-1 gap-2.5">
          {days.map((day) => (
            <div
              key={day.dateStr}
              className={`rounded-2xl border p-3 flex items-center justify-between gap-3 ${
                day.isToday
                  ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/30'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-28 shrink-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-black uppercase px-2 py-0.5 rounded-lg ${
                      day.isToday
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {day.dayOfWeekVi}
                  </span>
                  {day.isToday && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                <div className="text-sm font-black text-slate-900">
                  {day.displayDate}
                </div>
              </div>

              <div className="flex-1 grid grid-cols-3 gap-2">
                {day.shifts.map((shift) => {
                  const isNight = shift.type === 'night' || shift.type === 'night_12h';
                  const isAfternoon = shift.type === 'afternoon';
                  const hasAssignee = shift.assignees.some((a) => Boolean(a));

                  return (
                    <div
                      key={shift.id}
                      className={`rounded-xl border p-2 flex flex-col justify-between text-xs min-h-[72px] ${
                        !hasAssignee
                          ? 'bg-rose-50/70 border-rose-300'
                          : isNight
                          ? 'bg-indigo-50/60 border-indigo-200'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                        <span className="font-black text-slate-800 flex items-center gap-1">
                          {isNight ? (
                            <Moon className="w-3 h-3 text-indigo-600" />
                          ) : isAfternoon ? (
                            <Sunset className="w-3 h-3 text-amber-600" />
                          ) : (
                            <Sun className="w-3 h-3 text-sky-600" />
                          )}
                          {shift.name}
                        </span>
                        <span className="text-[10px] text-slate-600 font-bold">
                          {shift.timeRange.split(' ')[0]}
                        </span>
                      </div>

                      <div className="pt-1 space-y-1">
                        {shift.assignees.map((assignee, idx) => {
                          if (!assignee) {
                            return (
                              <div
                                key={idx}
                                className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300 text-center"
                              >
                                ⚠️ CẦN NGƯỜI TRỰC
                              </div>
                            );
                          }

                          const mem = getMemberByName(assignee);
                          return (
                            <div
                              key={idx}
                              className={`text-[11px] font-black px-2 py-0.5 rounded-lg border flex items-center justify-between ${
                                mem?.pillBadge || 'bg-slate-100 text-slate-900 border-slate-200'
                              }`}
                            >
                              <span className="truncate">{assignee}</span>
                              {mem?.phone && (
                                <span className="text-[9px] font-normal opacity-80 pl-1 shrink-0">
                                  {mem.phone.slice(-4)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
        <div className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>3 NGUYÊN TẮC QUAN TRỌNG KHI ĐI TRỰC</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px] text-amber-950 font-medium">
          <div className="p-2 rounded-xl bg-white/80 border border-amber-200/80">
            <strong className="block text-amber-900 font-bold mb-0.5">1. Giao ca đúng giờ:</strong>
            Có mặt trước 15 phút để bàn giao thuốc, túi tiểu và bình truyền.
          </div>
          <div className="p-2 rounded-xl bg-white/80 border border-amber-200/80">
            <strong className="block text-amber-900 font-bold mb-0.5">2. Chống loét &amp; Đờm:</strong>
            Lật trở nghiêng người 2 tiếng/lần, kiểm tra SpO2 và vỗ rung đờm.
          </div>
          <div className="p-2 rounded-xl bg-white/80 border border-amber-200/80">
            <strong className="block text-amber-900 font-bold mb-0.5">3. Cấp cứu khẩn:</strong>
            Bác sĩ ICU BS. Thắng (0912.345.678) · Điều dưỡng trực tầng 4.
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold">
          <span className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-indigo-600" />
            Danh bạ thành viên gia đình (để liên hệ hỗ trợ hoặc đổi ca gấp):
          </span>
          <span className="text-[10px] text-slate-500">Gia đình cùng chung sức</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {familyList.map((m) => (
            <div
              key={m.id}
              className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-0.5"
            >
              <div className="text-[11px] font-black text-slate-900 truncate">{m.name}</div>
              <div className="text-[9px] text-slate-600 truncate font-medium">{m.relation.split('(')[0]}</div>
              <div className="text-[10px] font-bold text-indigo-700">{m.phone}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <span>Hệ thống điều phối ca trực gia đình · Kết nối Google Sheets thời gian thực</span>
        <span>Được tạo tự động cho nhóm Zalo gia đình</span>
      </div>
    </div>
  );
}
