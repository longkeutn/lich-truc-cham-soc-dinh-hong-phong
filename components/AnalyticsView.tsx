'use client';

import React, { useMemo } from 'react';
import { FamilyMember, ShiftRecord } from '@/lib/types';
import { Users, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AnalyticsViewProps {
  shifts: ShiftRecord[];
  members: FamilyMember[];
}

export default function AnalyticsView({ shifts, members }: AnalyticsViewProps) {
  // Tính tổng số ca của từng người
  const stats = useMemo(() => {
    const memberMap = new Map<
      string,
      { totalShifts: number; nightShifts: number; dayShifts: number; totalHours: number }
    >();

    members.forEach((m) => {
      memberMap.set(m.name, { totalShifts: 0, nightShifts: 0, dayShifts: 0, totalHours: 0 });
    });

    let totalAssignedSlots = 0;
    let totalNeededSlots = 0;
    let understaffedShiftsCount = 0;

    shifts.forEach((s) => {
      totalNeededSlots += s.requiredPax;
      if (s.isUnderstaffed) {
        understaffedShiftsCount++;
      }

      const hours = s.phase === 'phase1' ? 8 : 12;

      s.assignees.forEach((name) => {
        if (!name) return;
        totalAssignedSlots++;
        const curr = memberMap.get(name) || { totalShifts: 0, nightShifts: 0, dayShifts: 0, totalHours: 0 };
        const isNight = s.type === 'night' || s.type === 'night_12h';

        memberMap.set(name, {
          totalShifts: curr.totalShifts + 1,
          nightShifts: curr.nightShifts + (isNight ? 1 : 0),
          dayShifts: curr.dayShifts + (!isNight ? 1 : 0),
          totalHours: curr.totalHours + hours,
        });
      });
    });

    const list = members.map((m) => {
      const data = memberMap.get(m.name) || { totalShifts: 0, nightShifts: 0, dayShifts: 0, totalHours: 0 };
      return {
        member: m,
        ...data,
      };
    });

    // Sắp xếp người trực nhiều nhất lên đầu
    list.sort((a, b) => b.totalHours - a.totalHours);

    return {
      list,
      totalAssignedSlots,
      totalNeededSlots,
      understaffedShiftsCount,
      coverageRate: totalNeededSlots > 0 ? Math.round((totalAssignedSlots / totalNeededSlots) * 100) : 100,
    };
  }, [shifts, members]);

  return (
    <div className="space-y-6">
      {/* Tóm tắt tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Tỷ lệ phủ kín ca</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {stats.coverageRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Đã chốt {stats.totalAssignedSlots}/{stats.totalNeededSlots} lượt trực
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Số ca còn thiếu người</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {stats.understaffedShiftsCount} ca
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Cần gia đình hỗ trợ nhận thêm
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-bold flex items-center justify-between">
            <span>Tổng lực lượng</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {members.length} người
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Các con cháu và người thân
          </div>
        </div>
      </div>

      {/* Bảng phân bổ công sức gia đình */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            Phân bổ công sức giữa các thành viên
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Giúp gia đình cân bằng ca trực, tránh để một người quá tải (đặc biệt là ca đêm)
          </p>
        </div>

        <div className="space-y-3">
          {stats.list.map((item) => {
            const maxHours = stats.list[0]?.totalHours || 1;
            const percent = Math.round((item.totalHours / (maxHours || 1)) * 100);

            return (
              <div
                key={item.member.id}
                className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs ${item.member.badgeColor}`}
                    >
                      {item.member.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">
                        {item.member.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate font-medium">
                        {item.member.relation} • {item.member.phone}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-indigo-700">
                      {item.totalHours} giờ
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {item.totalShifts} ca ({item.nightShifts} ca đêm)
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
