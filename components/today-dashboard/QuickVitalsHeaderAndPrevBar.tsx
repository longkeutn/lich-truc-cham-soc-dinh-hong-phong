'use client';

import React from 'react';
import {
  ChevronDown,
  Edit3,
  HeartPulse,
  Minus,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import type {
  FamilyMember,
  HealthProfileType,
  VitalsLogEntry,
} from '@/lib/types';
import {
  diffDaysBetweenDateStr,
  evaluateVitalReading,
  formatVietnamDateFull,
  getVietnamDateStr,
  normalizeDateStr,
  normalizeTimeStr,
  TIME_SLOT_CONFIG,
} from '@/lib/config';

interface QuickVitalsHeaderAndPrevBarProps {
  patientDisplayName: string;
  profileType: HealthProfileType;
  mountedClient: boolean;
  todayStr?: string;
  recorder: string;
  familyList: FamilyMember[];
  onChangeRecorder: (name: string) => void;
  lastEntry?: VitalsLogEntry | null;
  lastEntryEval: ReturnType<typeof evaluateVitalReading> | null;
  editingEntry: VitalsLogEntry | null;
  hasBothValues: boolean;
  sysNum: number;
  diaNum: number;
  onStartEditLastEntry: () => void;
  onCancelEdit: () => void;
}

function computeTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const diff = current - previous;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
}

function formatLastEntryTime(entry: VitalsLogEntry, currentTodayStr?: string): string {
  const slotCfg = TIME_SLOT_CONFIG[entry.period];
  const slotLabel = slotCfg?.label || entry.period;
  const todayStr = currentTodayStr || getVietnamDateStr();
  const timeStr = normalizeTimeStr(entry.time) || entry.time;
  const dateStr = normalizeDateStr(entry.date) || entry.date;
  if (dateStr === todayStr) return `${timeStr} ${slotLabel.toLowerCase()} nay`;
  const diffDays = diffDaysBetweenDateStr(todayStr, dateStr);
  if (diffDays === 1) return `${timeStr} hôm qua`;
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} ngày trước`;
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${timeStr} ngày ${parts[2]}/${parts[1]}` : dateStr;
}

function renderTrendIcon(trend: 'up' | 'down' | 'stable') {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-rose-600" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-emerald-600" />;
  return <Minus className="w-4 h-4 text-slate-600" />;
}

export function QuickVitalsHeaderAndPrevBar({
  patientDisplayName,
  profileType,
  mountedClient,
  todayStr,
  recorder,
  familyList,
  onChangeRecorder,
  lastEntry,
  lastEntryEval,
  editingEntry,
  hasBothValues,
  sysNum,
  diaNum,
  onStartEditLastEntry,
  onCancelEdit,
}: QuickVitalsHeaderAndPrevBarProps) {
  const effectiveToday = todayStr || getVietnamDateStr();
  const hasLoggedToday = Boolean(lastEntry && lastEntry.date === effectiveToday);

  return (
    <>
      <div className="bg-gradient-to-r from-teal-700 via-teal-700 to-emerald-700 text-white px-3.5 py-3.5 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 shadow-2xs">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-white text-teal-900 text-[11px] sm:text-xs font-black tracking-wide uppercase">
                Nhập sinh hiệu
              </span>
              {mountedClient && (
                <span className="px-2 py-0.5 rounded-full bg-teal-900/50 border border-white/20 text-teal-50 text-xs font-bold">
                  📅 {formatVietnamDateFull(effectiveToday)}
                </span>
              )}
              {mountedClient && !editingEntry && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                    hasLoggedToday
                      ? 'bg-emerald-300 text-emerald-950'
                      : 'bg-amber-300 text-slate-950'
                  }`}
                >
                  {hasLoggedToday ? '✓ Đã đo hôm nay' : '🩺 Chưa đo hôm nay'}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-xl font-black text-white tracking-tight leading-snug">
              Đo huyết áp &amp; sinh hiệu cho {patientDisplayName}
            </h2>
            <p className="text-xs sm:text-sm text-teal-50/90 font-medium truncate">
              {profileType === 'post_stroke_cranioplasty'
                ? 'Ghi nhanh Huyết áp, Nhịp mạch, SpO2, Nhiệt độ và tình trạng khuyết sọ'
                : `Nhập 3 số trên máy đo hoặc bấm đọc giọng nói (${patientDisplayName})`}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 bg-teal-900/35 sm:bg-transparent px-3 py-1.5 sm:p-0 rounded-xl border border-white/15 sm:border-0 shrink-0">
          <span className="text-xs sm:text-sm text-teal-50 font-bold shrink-0">Người đo:</span>
          <div className="relative flex-1 sm:flex-initial min-w-0">
            <select
              value={recorder}
              onChange={(e) => onChangeRecorder(e.target.value)}
              aria-label="Chọn người đo huyết áp"
              className="w-full sm:w-auto max-w-full pl-3 pr-8 py-2 rounded-xl bg-white hover:bg-teal-50 border border-white/40 text-xs sm:text-sm font-extrabold text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-300 min-h-[48px] truncate shadow-2xs"
            >
              {familyList.length > 0 ? (
                familyList.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.relation})
                  </option>
                ))
              ) : (
                <option value={recorder}>{recorder}</option>
              )}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {lastEntry && lastEntryEval && (
        <div
          className={`mx-3.5 sm:mx-5 mt-3.5 rounded-xl border px-3.5 py-2.5 flex items-center justify-between gap-2 flex-wrap ${
            lastEntryEval.overallAlertLevel === 'critical'
              ? 'border-rose-200 bg-rose-50/70 text-rose-950'
              : lastEntryEval.overallAlertLevel === 'warning'
              ? 'border-amber-200 bg-amber-50/70 text-amber-950'
              : 'border-slate-200 bg-slate-50/90 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-slate-600">
              Lần trước ({formatLastEntryTime(lastEntry, todayStr)}):
            </span>
            <span className="text-base sm:text-lg font-extrabold text-slate-900">
              {lastEntry.sys}/{lastEntry.dia}
              <span className="text-xs font-semibold text-slate-600 ml-0.5">mmHg</span>
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${lastEntryEval.bp.badgeClass}`}>
              {lastEntryEval.bp.shortLabel}
            </span>
            {lastEntry.pulse && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${lastEntryEval.pulse.badgeClass}`}>
                Mạch {lastEntry.pulse}
              </span>
            )}
            {lastEntry.spo2 !== undefined && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md border border-teal-200 bg-white text-teal-900">
                SpO2 {lastEntry.spo2}%
              </span>
            )}
            {lastEntry.temp !== undefined && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md border border-amber-200 bg-white text-amber-950">
                🌡️ {lastEntry.temp}°C
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {hasBothValues && !editingEntry && (
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700">
                <span className="inline-flex items-center gap-0.5">
                  SYS {renderTrendIcon(computeTrend(sysNum, lastEntry.sys))}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  DIA {renderTrendIcon(computeTrend(diaNum, lastEntry.dia))}
                </span>
              </div>
            )}

            {editingEntry?.id === lastEntry.id ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs sm:text-sm font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <X className="w-4 h-4 shrink-0" />
                <span>Huỷ sửa</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartEditLastEntry}
                className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-white hover:bg-teal-50 text-slate-800 hover:text-teal-900 border border-slate-200 hover:border-teal-300 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-teal-700 shrink-0" />
                <span>Sửa lại</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
