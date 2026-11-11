'use client';

import React, { useMemo, useState } from 'react';
import type { FamilyMember, ShiftRecord } from '@/lib/types';
import { ClipboardList, Clock, Search, Users } from 'lucide-react';
import ShiftHistoryCard from './ShiftHistoryCard';

export interface ShiftHistoryViewProps {
  shifts: ShiftRecord[];
  members: FamilyMember[];
}

export default function ShiftHistorySection({ shifts, members }: ShiftHistoryViewProps) {
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [onlyWithNotes, setOnlyWithNotes] = useState<boolean>(false);
  const [onlyIcuHistory, setOnlyIcuHistory] = useState<boolean>(false);

  const filteredShifts = useMemo(() => {
    return shifts
      .filter((s) => {
        const hasAssignees = s.assignees && s.assignees.filter(Boolean).length > 0;
        const hasSupporters = s.supporters && s.supporters.length > 0;
        const hasNote = Boolean(s.handover?.note?.trim());
        const hasVitals = Boolean(
          s.handover?.vitals?.bp ||
            s.handover?.vitals?.spo2 ||
            s.handover?.vitals?.pulse ||
            s.handover?.vitals?.temp
        );

        if (!hasAssignees && !hasSupporters && !hasNote && !hasVitals) {
          return false;
        }
        if (onlyIcuHistory && s.phase !== 'phase1') {
          return false;
        }
        if (selectedMember !== 'all') {
          const isMain = s.assignees?.includes(selectedMember);
          const isSupport = s.supporters?.includes(selectedMember);
          if (!isMain && !isSupport) return false;
        }
        if (selectedType !== 'all') {
          if (selectedType === 'day' && s.type !== 'morning' && s.type !== 'day_12h') return false;
          if (selectedType === 'afternoon' && s.type !== 'afternoon') return false;
          if (selectedType === 'night' && s.type !== 'night' && s.type !== 'night_12h') return false;
        }
        if (onlyWithNotes && !hasNote) {
          return false;
        }
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase().trim();
          const noteMatch = (s.handover?.note || '').toLowerCase().includes(kw);
          const authorMatch = (s.handover?.author || '').toLowerCase().includes(kw);
          const assigneeMatch = (s.assignees || []).some((a) => (a || '').toLowerCase().includes(kw));
          const supporterMatch = (s.supporters || []).some((sup) => (sup || '').toLowerCase().includes(kw));
          const dateMatch = s.date.includes(kw);

          if (!noteMatch && !authorMatch && !assigneeMatch && !supporterMatch && !dateMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        const order: Record<string, number> = {
          night: 3,
          night_12h: 3,
          afternoon: 2,
          morning: 1,
          day_12h: 1,
        };
        return (order[b.type] || 0) - (order[a.type] || 0);
      });
  }, [shifts, selectedMember, selectedType, searchKeyword, onlyWithNotes, onlyIcuHistory]);

  const familyStats = useMemo(() => {
    const totalRecordedShifts = filteredShifts.length;
    let totalNotes = 0;
    let totalVitalsRecorded = 0;
    const uniqueDays = new Set<string>();

    filteredShifts.forEach((s) => {
      uniqueDays.add(s.date);
      if (s.handover?.note?.trim()) totalNotes++;
      if (
        s.handover?.vitals?.bp ||
        s.handover?.vitals?.spo2 ||
        s.handover?.vitals?.pulse ||
        s.handover?.vitals?.temp
      ) {
        totalVitalsRecorded++;
      }
    });

    return {
      totalRecordedShifts,
      totalNotes,
      totalVitalsRecorded,
      totalDays: uniqueDays.size,
    };
  }, [filteredShifts]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-white/10 backdrop-blur-md">
              <ClipboardList className="w-5 h-5 text-indigo-300" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Nhật Ký Chăm Sóc &amp; Lịch Sử Trực
              </h2>
              <p className="text-xs text-indigo-200">
                Lưu giữ từng ca trực, lời dặn dò bàn giao và chỉ số sức khỏe của người thân
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs border border-white/10">
              <div className="text-xs text-indigo-200 font-medium">Lượt ca đã trực</div>
              <div className="text-xl font-black text-white mt-0.5">
                {familyStats.totalRecordedShifts} <span className="text-xs font-normal opacity-85">ca</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs border border-white/10">
              <div className="text-xs text-indigo-200 font-medium">Ghi chú bàn giao</div>
              <div className="text-xl font-black text-amber-300 mt-0.5">
                {familyStats.totalNotes} <span className="text-xs font-normal opacity-85">lần</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs border border-white/10">
              <div className="text-xs text-indigo-200 font-medium">Lần đo sinh hiệu</div>
              <div className="text-xl font-black text-rose-300 mt-0.5">
                {familyStats.totalVitalsRecorded} <span className="text-xs font-normal opacity-85">lần</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs border border-white/10">
              <div className="text-xs text-indigo-200 font-medium">Số ngày ghi nhận</div>
              <div className="text-xl font-black text-emerald-300 mt-0.5">
                {familyStats.totalDays} <span className="text-xs font-normal opacity-85">ngày</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Lọc theo thành viên:
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full min-h-[48px] text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả mọi người trong gia đình</option>
              {members.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.relation}) {m.isSupporter ? '· Phụ giúp' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Loại ca trực:
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full min-h-[48px] text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả các ca trong ngày</option>
              <option value="day">Ca Sáng (06h - 14h / 12h ngày)</option>
              <option value="afternoon">Ca Chiều (14h - 22h)</option>
              <option value="night">Ca Đêm (22h - 06h / 12h đêm)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-600" />
              Tìm kiếm dặn dò, sinh hiệu:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="VD: sốt, huyết áp, hút đờm, Mai..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full min-h-[48px] text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 min-h-[48px] min-w-[48px] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyIcuHistory}
                onChange={(e) => setOnlyIcuHistory(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-indigo-900">
                🏥 Chỉ xem lịch sử trực viện ICU cũ
              </span>
            </label>

            <label className="inline-flex items-center gap-2 min-h-[48px] min-w-[48px] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyWithNotes}
                onChange={(e) => setOnlyWithNotes(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700">
                Chỉ hiển thị ca có dặn dò / sinh hiệu
              </span>
            </label>
          </div>

          <span className="text-xs text-slate-600 font-medium">
            Hiển thị <span className="font-black text-indigo-700">{filteredShifts.length}</span> ca trực
          </span>
        </div>
      </div>

      {filteredShifts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Không tìm thấy ca trực nào phù hợp</h4>
            <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
              Thử xoá bộ lọc hoặc đổi sang thành viên khác để xem lại lịch sử chăm sóc.
            </p>
          </div>
          {(selectedMember !== 'all' ||
            selectedType !== 'all' ||
            searchKeyword ||
            onlyWithNotes ||
            onlyIcuHistory) && (
            <button
              type="button"
              onClick={() => {
                setSelectedMember('all');
                setSelectedType('all');
                setSearchKeyword('');
                setOnlyWithNotes(false);
                setOnlyIcuHistory(false);
              }}
              className="min-h-[48px] min-w-[48px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Xoá tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShifts.map((shift) => (
            <ShiftHistoryCard key={shift.id} shift={shift} members={members} />
          ))}
        </div>
      )}
    </div>
  );
}
