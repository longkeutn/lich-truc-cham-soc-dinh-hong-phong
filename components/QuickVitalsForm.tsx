'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HeartPulse,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  Check,
  ChevronDown,
} from 'lucide-react';
import { VitalsLogEntry, VitalsPeriod, BpThresholds, AlertLevel, FamilyMember } from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_RECORDER,
  detectCurrentTimeSlot,
  computeAlertLevel,
} from '@/lib/config';

// ===== PROPS =====
interface QuickVitalsFormProps {
  onSave: (entry: VitalsLogEntry) => Promise<void>;
  lastEntry?: VitalsLogEntry | null;
  bpThresholds?: BpThresholds;
  defaultRecorder?: string;
  members?: FamilyMember[];
}

// ===== HELPERS =====

/** Tính xu hướng so với lần đo trước: ↑ tăng, ↓ giảm, → ổn định (±5) */
function computeTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const diff = current - previous;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
}

/** Chuyển giờ đo gần nhất thành text tương đối cho UI */
function formatLastEntryTime(entry: VitalsLogEntry): string {
  const slotCfg = TIME_SLOT_CONFIG[entry.period];
  const slotLabel = slotCfg?.label || entry.period;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  if (entry.date === todayStr) {
    return `${entry.time} ${slotLabel.toLowerCase()} nay`;
  }

  const entryDate = new Date(entry.date + 'T00:00:00');
  const diffMs = today.getTime() - entryDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return `${entry.time} hôm qua`;
  if (diffDays <= 7) return `${diffDays} ngày trước`;
  return entry.date;
}

/** Config hiển thị cho từng alert level */
const ALERT_DISPLAY: Record<AlertLevel, {
  btnBg: string;
  btnHoverBg: string;
  bannerBg: string;
  bannerBorder: string;
  bannerText: string;
  bannerIcon: string;
  bannerMessage: string;
}> = {
  normal: {
    btnBg: 'bg-emerald-600',
    btnHoverBg: 'hover:bg-emerald-700',
    bannerBg: '',
    bannerBorder: '',
    bannerText: '',
    bannerIcon: '',
    bannerMessage: '',
  },
  warning: {
    btnBg: 'bg-amber-500',
    btnHoverBg: 'hover:bg-amber-600',
    bannerBg: 'bg-amber-50',
    bannerBorder: 'border-amber-300',
    bannerText: 'text-amber-900',
    bannerIcon: '⚠️',
    bannerMessage: 'Huyết áp hơi cao/thấp — Theo dõi thêm',
  },
  critical: {
    btnBg: 'bg-rose-600',
    btnHoverBg: 'hover:bg-rose-700',
    bannerBg: 'bg-rose-50',
    bannerBorder: 'border-rose-300',
    bannerText: 'text-rose-900',
    bannerIcon: '🚨',
    bannerMessage: 'Huyết áp BẤT THƯỜNG — Cân nhắc gọi Bác sĩ!',
  },
};

// ===== PERIOD PILLS =====
const PERIOD_OPTIONS: VitalsPeriod[] = ['morning', 'noon', 'afternoon', 'evening'];

// ===== COMPONENT =====
export default function QuickVitalsForm({
  onSave,
  lastEntry,
  bpThresholds,
  defaultRecorder,
  members,
}: QuickVitalsFormProps) {
  const thresholds = bpThresholds || DEFAULT_BP_THRESHOLDS;
  const familyList = members || [];
  const [recorder, setRecorder] = useState<string>(defaultRecorder || DEFAULT_RECORDER);
  const [hasUserSelectedRecorder, setHasUserSelectedRecorder] = useState<boolean>(false);

  // Khi danh sách thành viên từ Sheet tải xong, tự động chọn Mẹ Phương làm mặc định
  useEffect(() => {
    if (!hasUserSelectedRecorder && defaultRecorder) {
      setRecorder(defaultRecorder);
    }
  }, [defaultRecorder, hasUserSelectedRecorder]);

  // --- Form state ---
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [note, setNote] = useState('');
  const [period, setPeriod] = useState<VitalsPeriod>(detectCurrentTimeSlot);

  // --- UI state ---
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // --- Refs ---
  const sysInputRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus SYS input on mount
  useEffect(() => {
    // Small delay so mobile keyboards open smoothly
    const timer = setTimeout(() => {
      sysInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup success timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // --- Derived values ---
  const sysNum = parseInt(sys, 10);
  const diaNum = parseInt(dia, 10);
  const hasBothValues = !isNaN(sysNum) && !isNaN(diaNum) && sysNum > 0 && diaNum > 0;

  const currentAlertLevel: AlertLevel = hasBothValues
    ? computeAlertLevel(sysNum, diaNum, thresholds)
    : 'normal';

  const alertDisplay = ALERT_DISPLAY[currentAlertLevel];

  // --- Reset form ---
  const resetForm = useCallback(() => {
    setSys('');
    setDia('');
    setPulse('');
    setNote('');
    setPeriod(detectCurrentTimeSlot());
  }, []);

  // --- Handle save ---
  const handleSave = async () => {
    if (!hasBothValues || isSaving) return;

    setIsSaving(true);
    try {
      const now = new Date();
      const entry: VitalsLogEntry = {
        id: `vl-${Date.now()}`,
        date: now.toISOString().slice(0, 10),
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        period,
        sys: sysNum,
        dia: diaNum,
        pulse: pulse ? parseInt(pulse, 10) : undefined,
        note: note.trim() || undefined,
        alertLevel: currentAlertLevel,
        recordedBy: recorder,
        createdAt: now.toISOString(),
      };

      await onSave(entry);

      // Show success feedback
      setShowSuccess(true);
      successTimerRef.current = setTimeout(() => {
        setShowSuccess(false);
        resetForm();
      }, 2000);
    } catch {
      // Let parent handle error display
    } finally {
      setIsSaving(false);
    }
  };

  // --- Trend icons ---
  const renderTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-rose-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-emerald-600" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-slate-500" />;
    }
  };

  // --- Last reading alert color ---
  const getLastEntryBorderColor = (level: AlertLevel): string => {
    switch (level) {
      case 'critical': return 'border-rose-300 bg-rose-50/60';
      case 'warning': return 'border-amber-300 bg-amber-50/60';
      default: return 'border-emerald-300 bg-emerald-50/60';
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 space-y-4">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Ghi Huyết Áp Nhanh
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Mặc định người đo là {defaultRecorder || 'Mẹ Phương'}
            </p>
          </div>
        </div>

        {/* Nút nhỏ đổi người đo khi con cái đo hộ Mẹ */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">Người đo:</span>
          <div className="relative">
            <select
              value={recorder}
              onChange={(e) => {
                setRecorder(e.target.value);
                setHasUserSelectedRecorder(true);
              }}
              aria-label="Chọn người đo huyết áp"
              className="pl-2.5 pr-6 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-bold text-slate-800 appearance-none cursor-pointer focus:outline-none focus:border-rose-400"
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
            <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ===== LAST READING COMPARISON ===== */}
      {lastEntry && (
        <div
          className={`rounded-2xl border p-3 flex items-center justify-between gap-3 ${getLastEntryBorderColor(lastEntry.alertLevel)}`}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500 mb-0.5">Lần đo gần nhất</p>
            <p className="text-base font-black text-slate-900">
              {lastEntry.sys}/{lastEntry.dia}
              <span className="text-sm font-bold text-slate-500 ml-1">mmHg</span>
              {lastEntry.pulse && (
                <span className="text-sm font-bold text-slate-400 ml-2">
                  <Activity className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5" />
                  {lastEntry.pulse}
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500 font-medium">
              {formatLastEntryTime(lastEntry)}
            </p>
          </div>

          {/* Trend arrows — only show when user has entered values */}
          {hasBothValues && (
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="flex items-center gap-1" title="Xu hướng tâm thu">
                <span className="text-[11px] font-bold text-slate-400">SYS</span>
                {renderTrendIcon(computeTrend(sysNum, lastEntry.sys))}
              </div>
              <div className="flex items-center gap-1" title="Xu hướng tâm trương">
                <span className="text-[11px] font-bold text-slate-400">DIA</span>
                {renderTrendIcon(computeTrend(diaNum, lastEntry.dia))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== MAIN FORM — SYS / DIA ===== */}
      <div className="grid grid-cols-2 gap-3">
        {/* SYS */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            SYS <span className="normal-case text-slate-400">(Tâm thu)</span>
          </label>
          <input
            ref={sysInputRef}
            type="number"
            inputMode="numeric"
            value={sys}
            onChange={(e) => setSys(e.target.value)}
            placeholder="135"
            min={40}
            max={300}
            className="w-full text-3xl font-black text-center text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-2 focus:outline-none focus:border-rose-400 focus:bg-white placeholder:text-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* DIA */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
            DIA <span className="normal-case text-slate-400">(Tâm trương)</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            placeholder="85"
            min={20}
            max={200}
            className="w-full text-3xl font-black text-center text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 px-2 focus:outline-none focus:border-rose-400 focus:bg-white placeholder:text-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* ===== PULSE + NOTE (optional, smaller) ===== */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pulse */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            <Activity className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5" />
            Mạch <span className="text-slate-400 font-medium">(tuỳ chọn)</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={pulse}
            onChange={(e) => setPulse(e.target.value)}
            placeholder="78"
            min={30}
            max={250}
            className="w-full text-lg font-bold text-center text-slate-900 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-2 focus:outline-none focus:border-indigo-400 focus:bg-white placeholder:text-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">
            📝 Ghi chú <span className="text-slate-400 font-medium">(tuỳ chọn)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Sau tập đứng"
            className="w-full text-base font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none focus:border-indigo-400 focus:bg-white placeholder:text-slate-300 transition-colors"
          />
        </div>
      </div>

      {/* ===== PERIOD PILLS ===== */}
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-1.5">
          Buổi đo
        </label>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((p) => {
            const cfg = TIME_SLOT_CONFIG[p];
            const isActive = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="block text-base leading-none mb-0.5">{cfg.emoji}</span>
                <span className="block text-xs">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== SAVE BUTTON ===== */}
      {showSuccess ? (
        <div className="min-h-[56px] rounded-2xl bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center gap-2 animate-in fade-in duration-300">
          <Check className="w-6 h-6 text-emerald-600" />
          <span className="text-lg font-black text-emerald-700">✅ Đã lưu!</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasBothValues || isSaving}
          className={`w-full min-h-[56px] rounded-2xl text-lg font-black text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
            hasBothValues
              ? `${alertDisplay.btnBg} ${alertDisplay.btnHoverBg}`
              : 'bg-slate-300'
          }`}
        >
          {isSaving ? (
            <>
              <Save className="w-5 h-5 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <span>💓</span>
              <span>Lưu Huyết Áp</span>
            </>
          )}
        </button>
      )}

      {/* ===== ALERT BANNER ===== */}
      {hasBothValues && currentAlertLevel !== 'normal' && (
        <div
          className={`rounded-2xl border-2 p-3.5 flex items-start gap-2.5 animate-in fade-in duration-300 ${alertDisplay.bannerBg} ${alertDisplay.bannerBorder}`}
        >
          <span className="text-2xl shrink-0 leading-none mt-0.5">{alertDisplay.bannerIcon}</span>
          <p className={`text-base font-black ${alertDisplay.bannerText}`}>
            {alertDisplay.bannerMessage}
          </p>
        </div>
      )}
    </div>
  );
}
