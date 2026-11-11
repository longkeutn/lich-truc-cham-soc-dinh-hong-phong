'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { FamilyMember, ShiftRecord } from '@/lib/types';
import { getVietnamDateStr } from '@/lib/config';
import ShiftHistoryView from '@/components/ShiftHistoryView';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  History,
  Plus,
  Sparkles,
} from 'lucide-react';
import CaregiverSupportForm from './CaregiverSupportForm';
import CaregiverWeekBoardAndStats from './CaregiverWeekBoardAndStats';
import {
  computeMemberContributionStats,
  computeQuickDates,
  computeWeekDays,
  formatDateFullVN,
  SESSION_OPTIONS,
  type SessionOption,
} from './familyScheduleUtils';

export interface FamilySupportViewProps {
  shifts: ShiftRecord[];
  members: FamilyMember[];
  currentMember?: FamilyMember | null;
  isAdmin?: boolean;
  todayStr?: string;
  onSaveShift: (shift: ShiftRecord) => Promise<void>;
  onOpenMembers?: () => void;
}

export default function FamilyCaregiverSchedule({
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

  useEffect(() => {
    if (!isFormOpen && !editingShiftId) {
      setSelectedDate(todayStr);
    }
  }, [todayStr, isFormOpen, editingShiftId]);

  const weekDays = useMemo(() => computeWeekDays(todayStr, weekOffset), [weekOffset, todayStr]);

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

  const supportByDate = useMemo(() => {
    const map = new Map<string, ShiftRecord[]>();
    weekDays.forEach((d) => map.set(d.dateStr, []));

    activeSupportShifts.forEach((s) => {
      if (map.has(s.date)) {
        map.get(s.date)!.push(s);
      }
    });

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

  const totalThisWeek = useMemo(() => {
    let count = 0;
    supportByDate.forEach((list) => {
      count += list.length;
    });
    return count;
  }, [supportByDate]);

  const memberContributionStats = useMemo(
    () => computeMemberContributionStats(shifts, members),
    [shifts, members]
  );

  const quickDates = useMemo(() => computeQuickDates(todayStr), [todayStr]);

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

  const handleSelectSession = (session: SessionOption) => {
    setSelectedSessionId(session.id);
    setCustomTimeRange(session.defaultTime);
  };

  const handleToggleSupporter = (name: string) => {
    setSelectedSupporters((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

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

  return (
    <div className="space-y-4">
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
          <span>Kỷ Niệm &amp; Lịch Sử ICU</span>
        </button>
      </div>

      {subTab === 'schedule' ? (
        <div className="space-y-4">
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

          {isFormOpen && (
            <CaregiverSupportForm
              editingShiftId={editingShiftId}
              members={members}
              selectedMemberName={selectedMemberName}
              onSelectMember={setSelectedMemberName}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              quickDates={quickDates}
              selectedSessionId={selectedSessionId}
              onSelectSession={handleSelectSession}
              customTimeRange={customTimeRange}
              onChangeTimeRange={setCustomTimeRange}
              taskNote={taskNote}
              onChangeTaskNote={setTaskNote}
              selectedSupporters={selectedSupporters}
              onToggleSupporter={handleToggleSupporter}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmitForm}
              onClose={() => {
                setIsFormOpen(false);
                setEditingShiftId(null);
              }}
            />
          )}

          {/* Thanh điều hướng tuần */}
          <div className="rounded-2xl bg-white border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-slate-900">
                    Tuần {weekDays[0]?.shortDate} - {weekDays[6]?.shortDate}
                  </h3>
                  {weekOffset === 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-black">
                      Tuần này
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Đã có <span className="font-black text-emerald-700">{totalThisWeek}</span> lượt đăng ký qua phụ Mẹ trong tuần
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setWeekOffset((w) => w - 1)}
                className="flex-1 sm:flex-initial justify-center min-h-[48px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span>Tuần trước</span>
              </button>
              {weekOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="flex-1 sm:flex-initial justify-center min-h-[48px] px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-bold flex items-center transition cursor-pointer"
                >
                  Hôm nay
                </button>
              )}
              <button
                type="button"
                onClick={() => setWeekOffset((w) => w + 1)}
                className="flex-1 sm:flex-initial justify-center min-h-[48px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <span>Tuần sau</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>

          <CaregiverWeekBoardAndStats
            weekDays={weekDays}
            supportByDate={supportByDate}
            members={members}
            deletingId={deletingId}
            memberContributionStats={memberContributionStats}
            onOpenNewForm={handleOpenNewForm}
            onOpenEditForm={handleOpenEditForm}
            onDeleteSupport={handleDeleteSupport}
            onOpenMembers={onOpenMembers}
          />
        </div>
      ) : (
        <ShiftHistoryView shifts={shifts} members={members} />
      )}
    </div>
  );
}
