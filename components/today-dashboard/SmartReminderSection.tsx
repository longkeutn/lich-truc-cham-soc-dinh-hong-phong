'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  Settings,
} from 'lucide-react';
import type {
  VitalsLogEntry,
  BpThresholds,
  CareRoutine,
  DailyLog,
  AppointmentInfo,
} from '@/lib/types';
import { getVietnamDateStr, getVietnamTimeStr } from '@/lib/config';
import {
  type NotificationPreferences,
  playNotificationSound,
  speakVietnameseReminder,
  stopSpeakingVietnamese,
  sendPwaNotification,
} from '@/lib/notifications';
import {
  buildSmartAlerts,
  loadSnoozedMap,
  parseHmToMinutes,
  saveSnoozedMap,
  type SmartAlertItem,
} from './smartReminderHelpers';

function isWithinQuietHours(nowHm: string): boolean {
  const mins = parseHmToMinutes(nowHm);
  // Giờ nghỉ ngơi yên tĩnh ban đêm: 22:30 đến 06:00 sáng
  return mins >= 22 * 60 + 30 || mins < 6 * 60;
}

export interface SmartReminderBannerProps {
  vitalsLog: VitalsLogEntry[];
  bpThresholds: BpThresholds;
  activeRoutines: CareRoutine[];
  dailyLogs: DailyLog[];
  appointment: AppointmentInfo;
  todayStr: string;
  defaultRecorder: string;
  prefs: NotificationPreferences;
  hasInitialLoaded: boolean;
  patientDisplayName?: string;
  onToggleDailyLog: (log: DailyLog) => Promise<void>;
  onOpenSettings: () => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
}

export function SmartReminderSection({
  vitalsLog,
  bpThresholds,
  activeRoutines,
  dailyLogs,
  appointment,
  todayStr,
  defaultRecorder,
  prefs,
  hasInitialLoaded,
  patientDisplayName = 'Bố',
  onToggleDailyLog,
  onOpenSettings,
  showToast,
}: SmartReminderBannerProps) {
  const [nowHm, setNowHm] = useState<string>('08:00');
  const [mountedClient, setMountedClient] = useState<boolean>(false);
  const [snoozedMap, setSnoozedMap] = useState<Record<string, number>>({});
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [expandedAll, setExpandedAll] = useState<boolean>(false);
  const announcedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMountedClient(true);
    setNowHm(getVietnamTimeStr());
    setSnoozedMap(loadSnoozedMap());

    const timer = setInterval(() => {
      setNowHm(getVietnamTimeStr());
      setSnoozedMap(loadSnoozedMap());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const effectiveToday = todayStr || (mountedClient ? getVietnamDateStr() : '');
  const nowMinutes = useMemo(() => parseHmToMinutes(nowHm), [nowHm]);

  const allAlerts = useMemo<SmartAlertItem[]>(() => {
    if (!mountedClient || !effectiveToday) return [];
    return buildSmartAlerts({
      vitalsLog,
      bpThresholds,
      activeRoutines,
      dailyLogs,
      appointment,
      effectiveToday,
      nowMinutes,
      prefs,
      patientDisplayName,
    });
  }, [
    mountedClient,
    effectiveToday,
    nowMinutes,
    vitalsLog,
    bpThresholds,
    activeRoutines,
    dailyLogs,
    appointment,
    prefs,
    patientDisplayName,
  ]);

  const visibleAlerts = useMemo(() => {
    const nowTs = Date.now();
    return allAlerts.filter((item) => {
      if (item.severity === 'critical' && item.category === 'bp_alert') return true;
      const exp = snoozedMap[item.id];
      return !exp || exp <= nowTs;
    });
  }, [allAlerts, snoozedMap]);

  useEffect(() => {
    if (!mountedClient || !hasInitialLoaded || !prefs.enabled) return;
    if (visibleAlerts.length === 0) return;

    const quietNow = isWithinQuietHours(nowHm);
    const newlyTriggered = visibleAlerts.filter(
      (a) =>
        (a.severity === 'critical' || a.severity === 'urgent') &&
        !announcedIdsRef.current.has(a.id)
    );
    if (newlyTriggered.length === 0) return;

    for (const item of newlyTriggered) {
      announcedIdsRef.current.add(item.id);
    }

    const topAlert = newlyTriggered[0];
    const isEmergencyBp =
      topAlert.category === 'bp_alert' && topAlert.severity === 'critical';

    if (prefs.pwaPushEnabled) {
      void sendPwaNotification({
        title: topAlert.title,
        body: topAlert.detail,
        tag: topAlert.id,
        urgent: topAlert.severity === 'critical',
      });
    }
    if ((!quietNow || isEmergencyBp) && prefs.soundEnabled) {
      playNotificationSound(topAlert.severity === 'critical' ? 'urgent' : 'gentle');
    }
    if ((!quietNow || isEmergencyBp) && prefs.autoVoiceEnabled) {
      const combinedVoice = newlyTriggered
        .slice(0, 2)
        .map((i) => i.voiceText)
        .join(' ');
      setIsSpeaking(true);
      speakVietnameseReminder(combinedVoice, () => setIsSpeaking(false));
    }
  }, [mountedClient, hasInitialLoaded, visibleAlerts, prefs, nowHm]);

  const handleManualSpeakAll = useCallback(() => {
    if (isSpeaking) {
      stopSpeakingVietnamese();
      setIsSpeaking(false);
      return;
    }
    if (visibleAlerts.length === 0) {
      setIsSpeaking(true);
      speakVietnameseReminder(
        `Tuyệt vời! Hiện tại ${patientDisplayName} đã hoàn thành đầy đủ các mục đo huyết áp và uống thuốc đúng giờ.`,
        () => setIsSpeaking(false)
      );
      return;
    }
    const summary = visibleAlerts
      .slice(0, 4)
      .map((a, idx) => `Thứ ${idx + 1}: ${a.voiceText}`)
      .join(' ');
    if (prefs.soundEnabled) {
      playNotificationSound('gentle');
    }
    setIsSpeaking(true);
    speakVietnameseReminder(
      `Hiện có ${visibleAlerts.length} việc cần lưu ý cho ${patientDisplayName}. ${summary}`,
      () => setIsSpeaking(false)
    );
  }, [isSpeaking, visibleAlerts, prefs.soundEnabled, patientDisplayName]);

  const handleSnooze = (id: string, minutes: number = 30) => {
    const nextMap = { ...loadSnoozedMap(), [id]: Date.now() + minutes * 60 * 1000 };
    saveSnoozedMap(nextMap);
    setSnoozedMap(nextMap);
    showToast(`⏰ Đã tạm ẩn nhắc nhở trong ${minutes} phút`, 'info');
  };

  const handleQuickComplete = async (item: SmartAlertItem) => {
    if (!item.routineToComplete || !effectiveToday) return;
    const { routine, slot } = item.routineToComplete;
    await onToggleDailyLog({
      id: `dl-${effectiveToday}-${routine.id}-${slot}`,
      date: effectiveToday,
      routineId: routine.id,
      timeSlot: slot,
      isDone: true,
      doneAt: getVietnamTimeStr(),
      doneBy: defaultRecorder,
    });
  };

  if (!mountedClient) return null;

  if (visibleAlerts.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-white px-3.5 py-3 flex items-center justify-between gap-2 flex-wrap shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-extrabold text-emerald-950 truncate">
              ✅ Đúng tiến độ chăm sóc hôm nay ({nowHm})
            </div>
            <div className="text-xs text-emerald-800 font-semibold truncate">
              {prefs.enabled
                ? `Trợ lý nhắc việc đang BẬT · Tự động báo khi đến giờ thuốc hoặc đo huyết áp của ${patientDisplayName}`
                : 'Chuông nhắc tự động đang TẮT · Bấm Cài đặt chuông để bật'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={handleManualSpeakAll}
            className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-white hover:bg-emerald-100/70 text-emerald-900 border border-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer transition"
          >
            <Volume2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Nghe báo cáo</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer transition"
          >
            <Bell className="w-4 h-4 shrink-0" />
            <span>Cài đặt chuông</span>
          </button>
        </div>
      </div>
    );
  }

  const hasCritical = visibleAlerts.some((a) => a.severity === 'critical');
  const hasUrgent = visibleAlerts.some((a) => a.severity === 'urgent');
  const displayedAlerts = expandedAll ? visibleAlerts : visibleAlerts.slice(0, 2);
  const hiddenCount = Math.max(0, visibleAlerts.length - displayedAlerts.length);

  const containerTheme = hasCritical
    ? 'border-rose-300 bg-gradient-to-br from-rose-50 via-white to-rose-50/60'
    : hasUrgent
      ? 'border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40'
      : 'border-teal-300 bg-gradient-to-br from-teal-50/80 via-white to-sky-50/40';

  const headerBadgeTheme = hasCritical
    ? 'bg-rose-600 text-white'
    : hasUrgent
      ? 'bg-amber-600 text-white'
      : 'bg-teal-700 text-white';

  return (
    <div className={`rounded-2xl border-2 p-3.5 sm:p-4 shadow-xs space-y-3 ${containerTheme}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${headerBadgeTheme}`}
          >
            {hasCritical ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : (
              <BellRing className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                🔔 Trợ Lý Nhắc Thuốc &amp; Sinh Hiệu ({visibleAlerts.length} việc cần chú ý)
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-white/90 border border-slate-200 text-xs font-bold text-slate-700">
                ⏰ {nowHm}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-semibold truncate">
              {isSpeaking
                ? '🔊 Đang đọc nhắc nhở bằng giọng nói Tiếng Việt...'
                : 'Bấm Đọc to để nghe bằng giọng nói hoặc tích Đã xong ngay tại đây'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={handleManualSpeakAll}
            className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
              isSpeaking
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-teal-700 hover:bg-teal-800 text-white'
            }`}
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-4 h-4 shrink-0" />
                <span>Dừng đọc</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 shrink-0" />
                <span>🔊 Đọc to</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Cài đặt giờ nhắc thuốc và giọng nói"
            className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 cursor-pointer transition"
          >
            <Settings className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="hidden sm:inline">Giờ nhắc</span>
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {displayedAlerts.map((item) => {
          const cardStyle =
            item.severity === 'critical'
              ? 'border-rose-300 bg-white text-rose-950'
              : item.severity === 'urgent'
                ? 'border-amber-300 bg-white text-slate-900'
                : 'border-slate-200 bg-white/95 text-slate-800';

          return (
            <div
              key={item.id}
              className={`rounded-xl border px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs ${cardStyle}`}
            >
              <div className="min-w-0 space-y-1">
                <div className="text-sm sm:text-base font-extrabold leading-snug">
                  {item.title}
                </div>
                <div className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  {item.detail}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 sm:ml-2 flex-wrap">
                {item.routineToComplete && (
                  <button
                    type="button"
                    onClick={() => void handleQuickComplete(item)}
                    className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 cursor-pointer transition shadow-2xs active:scale-95"
                  >
                    <Check className="w-4 h-4 shrink-0" strokeWidth={2.8} />
                    <span>Đã thực hiện</span>
                  </button>
                )}

                {!(item.severity === 'critical' && item.category === 'bp_alert') && (
                  <button
                    type="button"
                    onClick={() => handleSnooze(item.id, 30)}
                    className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer transition"
                    title="Nhắc lại sau 30 phút"
                  >
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>Nhắc sau 30p</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(hiddenCount > 0 || expandedAll) && visibleAlerts.length > 2 && (
        <button
          type="button"
          onClick={() => setExpandedAll((prev) => !prev)}
          className="w-full min-h-[48px] py-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-xs sm:text-sm font-extrabold text-teal-800 flex items-center justify-center gap-1.5 cursor-pointer transition"
        >
          {expandedAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Thu gọn danh sách nhắc việc</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Xem thêm {hiddenCount} lời nhắc khác trong ngày</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default SmartReminderSection;
