'use client';

import React from 'react';
import type { FamilyMember, ShiftRecord } from '@/lib/types';
import {
  Clock,
  Edit3,
  MessageSquare,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { SESSION_OPTIONS, type WeekDayInfo } from './familyScheduleUtils';

interface MemberContributionItem {
  member: FamilyMember;
  homeCount: number;
  icuCount: number;
  total: number;
}

interface CaregiverWeekBoardAndStatsProps {
  weekDays: WeekDayInfo[];
  supportByDate: Map<string, ShiftRecord[]>;
  members: FamilyMember[];
  deletingId: string | null;
  memberContributionStats: MemberContributionItem[];
  onOpenNewForm: (dateStr?: string) => void;
  onOpenEditForm: (shift: ShiftRecord) => void;
  onDeleteSupport: (shift: ShiftRecord) => void;
  onOpenMembers?: () => void;
}

export default function CaregiverWeekBoardAndStats({
  weekDays,
  supportByDate,
  members,
  deletingId,
  memberContributionStats,
  onOpenNewForm,
  onOpenEditForm,
  onDeleteSupport,
  onOpenMembers,
}: CaregiverWeekBoardAndStatsProps) {
  return (
    <>
      {/* Danh sách 7 ngày trong tuần */}
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
                      <span className="text-base font-black text-slate-900">{day.dayName}</span>
                      {day.isToday && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black">
                          HÔM NAY
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      {dayRecords.length > 0
                        ? `${dayRecords.length} lượt anh chị em qua phụ Mẹ`
                        : 'Mẹ chăm Bố tại nhà'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenNewForm(day.dateStr)}
                  className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-black flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Qua phụ</span>
                </button>
              </div>

              {dayRecords.length === 0 ? (
                <div className="pt-3 flex items-center justify-between text-sm text-slate-600">
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

                            <span
                              className={`px-2.5 py-0.5 rounded-lg border text-xs font-black inline-flex items-center gap-1 ${sessionOpt.badgeClass}`}
                            >
                              <span>{sessionOpt.emoji}</span>
                              <span>{rec.name || sessionOpt.label}</span>
                            </span>

                            {rec.timeRange && (
                              <span className="text-xs font-bold text-slate-600 inline-flex items-center gap-1 bg-white/80 px-2 py-0.5 rounded-lg border border-slate-200/80">
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                                {rec.timeRange}
                              </span>
                            )}
                          </div>

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

                          {rec.handover?.note && (
                            <div className="text-base text-slate-800 font-medium flex items-start gap-1.5 pt-0.5">
                              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                              <span>{rec.handover.note}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenEditForm(rec)}
                            className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                            title="Sửa lịch này"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Sửa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSupport(rec)}
                            disabled={deletingId === rec.id}
                            className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
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

      {/* Thống kê tổng hợp đồng hành gia đình */}
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
              <p className="text-xs text-slate-600">
                Tổng hợp các buổi qua phụ tại nhà &amp; những ngày trực viện ICU
              </p>
            </div>
          </div>

          {onOpenMembers && (
            <button
              type="button"
              onClick={onOpenMembers}
              className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
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
                  <div className="text-sm font-black text-slate-900 truncate">{member.name}</div>
                  <div className="text-xs text-slate-600 truncate">{member.relation}</div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-base font-black text-slate-900">
                  {total} <span className="text-xs font-bold text-slate-600">buổi</span>
                </div>
                <div className="text-xs text-slate-600 font-medium">
                  {homeCount > 0 && <span>🏠 {homeCount} </span>}
                  {icuCount > 0 && <span>🏥 {icuCount}</span>}
                  {total === 0 && <span>Sẵn sàng</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
