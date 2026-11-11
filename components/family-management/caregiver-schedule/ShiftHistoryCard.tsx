'use client';

import React from 'react';
import type { ShiftRecord, FamilyMember } from '@/lib/types';
import {
  Activity,
  CheckCircle2,
  Heart,
  MessageSquare,
  Thermometer,
  Users,
  Wind,
} from 'lucide-react';

interface ShiftHistoryCardProps {
  shift: ShiftRecord;
  members: FamilyMember[];
}

export default function ShiftHistoryCard({ shift, members }: ShiftHistoryCardProps) {
  const assignees = (shift.assignees || []).filter(Boolean) as string[];
  const supporters = (shift.supporters || []).filter(Boolean) as string[];
  const hasVitals =
    Boolean(shift.handover?.vitals?.bp) ||
    Boolean(shift.handover?.vitals?.spo2) ||
    Boolean(shift.handover?.vitals?.pulse) ||
    Boolean(shift.handover?.vitals?.temp);

  const displayDate = shift.date.split('-').reverse().join('/');
  const isSupportRecord = String(shift.id || '').startsWith('support_');

  return (
    <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3.5 transition">
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-mono text-xs font-black">
            {displayDate}
          </span>
          <span className="text-sm font-black text-slate-900">{shift.name}</span>
          <span className="text-xs text-slate-600 font-medium">({shift.timeRange})</span>
        </div>

        <span
          className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${
            shift.phase === 'phase1'
              ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : isSupportRecord
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-teal-50 text-teal-700 border border-teal-200'
          }`}
        >
          {shift.phase === 'phase1'
            ? '🏥 Trực viện ICU (Ca 8h)'
            : isSupportRecord
            ? '🤝 Qua phụ Mẹ tại nhà'
            : '🏠 Ca trực tại nhà'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            Người trực chính:
          </div>
          {assignees.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {assignees.map((name) => {
                const m = members.find((x) => x.name === name);
                return (
                  <div
                    key={name}
                    className={`p-2 rounded-xl border flex items-center gap-2 ${
                      m?.bgLight || 'bg-slate-50'
                    } ${m?.borderLight || 'border-slate-200'}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg text-white font-bold text-[10px] flex items-center justify-center shrink-0 ${
                        m?.badgeColor || 'bg-slate-700'
                      }`}
                    >
                      {m?.avatarInitials || name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-black text-slate-900">{name}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-xs text-rose-600 italic font-medium">Chưa có người trực chính</span>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <span>🤝</span>
            Thành viên phụ vào hỗ trợ cùng:
          </div>
          {supporters.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {supporters.map((sup) => (
                <span
                  key={sup}
                  className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold"
                >
                  🤝 {sup}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-600 italic">Không có người hỗ trợ thêm</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Việc chăm sóc đã làm:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {shift.checklist.feeding && (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Bơm sữa
              </span>
            )}
            {shift.checklist.meds && (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Uống thuốc
              </span>
            )}
            {shift.checklist.hygiene && (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Vệ sinh / Thay bỉm
              </span>
            )}
            {shift.checklist.turning && (
              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Lật trở chống loét
              </span>
            )}
            {!shift.checklist.feeding &&
              !shift.checklist.meds &&
              !shift.checklist.hygiene &&
              !shift.checklist.turning && (
                <span className="text-xs text-slate-600 italic">Chưa đánh dấu việc hoàn thành</span>
              )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Sinh hiệu đo được:
          </div>
          {hasVitals ? (
            <div className="flex flex-wrap gap-1.5">
              {shift.handover.vitals?.bp && (
                <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-900 border border-rose-200 text-xs font-bold flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500" /> HA: {shift.handover.vitals.bp}
                </span>
              )}
              {shift.handover.vitals?.spo2 && (
                <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-900 border border-sky-200 text-xs font-bold flex items-center gap-1">
                  <Wind className="w-3 h-3 text-sky-500" /> SpO2: {shift.handover.vitals.spo2}
                </span>
              )}
              {shift.handover.vitals?.pulse && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-500" /> Mạch: {shift.handover.vitals.pulse}
                </span>
              )}
              {shift.handover.vitals?.temp && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-500" /> Nhiệt: {shift.handover.vitals.temp}°C
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-600 italic">Chưa ghi nhận sinh hiệu</span>
          )}
        </div>
      </div>

      {shift.handover?.note && (
        <div className="pt-2 border-t border-slate-100">
          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                Dặn dò bàn giao bởi: {shift.handover.author || 'Người trực'}
              </span>
              {shift.handover.updatedAt && (
                <span className="text-amber-800 font-normal">
                  {new Date(shift.handover.updatedAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-medium leading-relaxed italic">
              &ldquo;{shift.handover.note}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
