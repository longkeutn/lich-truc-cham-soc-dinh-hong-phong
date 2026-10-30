'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Check,
  CheckCheck,
  HeartPulse,
  Pill,
  Dumbbell,
  Heart,
  Calendar,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Settings2,
  Sparkles,
} from 'lucide-react';
import {
  VitalsLogEntry,
  BpThresholds,
  CareRoutine,
  DailyLog,
  AppointmentInfo,
  TimeSlot,
} from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  detectCurrentTimeSlot,
  getVietnamTimeStr,
  getVietnamHour,
  evaluateVitalReading,
  compareVitalsDesc,
  normalizeDateStr,
  extractRoutineStartDateStr,
  diffDaysBetweenDateStr,
  timeStrToMinutes,
} from '@/lib/config';
import {
  NotificationPreferences,
  getBrowserNotificationPermission,
  hasNotificationBeenSent,
  markNotificationSent,
  getSnoozeUntil,
  setSnoozeMinutes,
  playNotificationSound,
  speakVietnameseReminder,
  stopSpeakingVietnamese,
  sendPwaNotification,
} from '@/lib/notifications';

const TIME_SLOT_ORDER: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];

interface SmartReminderBannerProps {
  vitalsLog: VitalsLogEntry[];
  bpThresholds: BpThresholds;
  activeRoutines: CareRoutine[];
  dailyLogs: DailyLog[];
  appointment: AppointmentInfo;
  todayStr: string;
  defaultRecorder: string;
  prefs: NotificationPreferences;
  hasInitialLoaded: boolean;
  onToggleDailyLog: (log: DailyLog) => Promise<void>;
  onOpenSettings: () => void;
  showToast?: (message: string, type?: 'info' | 'success' | 'warn') => void;
  patientDisplayName?: string;
}

export default function SmartReminderBanner({
  vitalsLog,
  bpThresholds,
  activeRoutines,
  dailyLogs,
  appointment,
  todayStr,
  defaultRecorder,
  prefs,
  hasInitialLoaded,
  onToggleDailyLog,
  onOpenSettings,
  showToast,
  patientDisplayName = 'bố Đinh Hồng Phong',
}: SmartReminderBannerProps) {
  const [currentSlot, setCurrentSlot] = useState<TimeSlot>('morning');
  const [currentTimeHHmm, setCurrentTimeHHmm] = useState<string>('08:00');
  const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [snoozeUntil, setSnoozeUntil] = useState<number>(0);

  // Đồng bộ giờ Việt Nam hiện tại & trạng thái quyền Notification
  const syncClockAndPermission = useCallback(() => {
    setCurrentSlot(detectCurrentTimeSlot());
    setCurrentTimeHHmm(getVietnamTimeStr());
    setPermissionState(getBrowserNotificationPermission());
    setSnoozeUntil(getSnoozeUntil());
  }, []);

  useEffect(() => {
    syncClockAndPermission();
    const timer = setInterval(syncClockAndPermission, 20 * 1000);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        syncClockAndPermission();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', syncClockAndPermission);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', syncClockAndPermission);
    };
  }, [syncClockAndPermission]);

  // Lắng nghe sự kiện từ Service Worker khi người dùng bấm vào thông báo trên điện thoại
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NAVIGATE_TO_SECTION' && event.data.url) {
        const hashIdx = String(event.data.url).indexOf('#');
        if (hashIdx >= 0) {
          const selector = String(event.data.url).slice(hashIdx);
          const el = document.querySelector(selector);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, []);

  // ===== 1. TRA CỨU LOG HOÀN THÀNH TRONG NGÀY HÔM NAY =====
  const todayLogMap = useMemo(() => {
    const map = new Map<string, DailyLog>();
    dailyLogs.forEach((log) => {
      const normDate = normalizeDateStr(log.date);
      if (normDate === todayStr && log.routineId && log.timeSlot) {
        map.set(`dl-${todayStr}-${log.routineId}-${log.timeSlot}`, log);
      }
    });
    return map;
  }, [dailyLogs, todayStr]);

  // Các đầu việc định kỳ đang áp dụng cho ngày hôm nay (tôn trọng ngày bắt đầu áp dụng)
  const todayScheduledRoutines = useMemo(() => {
    return activeRoutines.filter((r) => {
      if (!r.isActive || r.medType === 'as_needed') return false;
      const startStr = extractRoutineStartDateStr(r.createdAt, r.id);
      if (startStr && startStr > todayStr) return false;
      return true;
    });
  }, [activeRoutines, todayStr]);

  // ===== 2. SINH HIỆU HÔM NAY & CẢNH BÁO BẤT THƯỜNG (ĐỒNG BỘ CHUẨN LÂM SÀNG) =====
  const todayVitals = useMemo(() => {
    return vitalsLog
      .filter((v) => normalizeDateStr(v.date) === todayStr)
      .sort(compareVitalsDesc);
  }, [vitalsLog, todayStr]);

  const currentSlotVitals = useMemo(() => {
    return todayVitals.filter((v) => v.period === currentSlot);
  }, [todayVitals, currentSlot]);

  const latestTodayVital = todayVitals[0] || null;

  const latestVitalAlert = useMemo(() => {
    if (!latestTodayVital) return null;
    const evaluation = evaluateVitalReading(latestTodayVital, bpThresholds);
    if (evaluation.overallAlertLevel === 'normal') return null;

    return {
      isCritical: evaluation.overallAlertLevel === 'critical',
      entry: latestTodayVital,
      evaluation,
      summary: evaluation.reasons.join(' • '),
    };
  }, [latestTodayVital, bpThresholds]);

  // ===== 3. VIỆC CẦN LÀM TRONG BUỔI HIỆN TẠI & CÁC BUỔI TRƯỚC TRONG NGÀY =====
  const currentSlotRoutines = useMemo(() => {
    return todayScheduledRoutines.filter(
      (r) => Array.isArray(r.timeSlots) && r.timeSlots.includes(currentSlot)
    );
  }, [todayScheduledRoutines, currentSlot]);

  const currentSlotPending = useMemo(() => {
    return currentSlotRoutines.filter(
      (r) => !todayLogMap.get(`dl-${todayStr}-${r.id}-${currentSlot}`)?.isDone
    );
  }, [currentSlotRoutines, todayLogMap, todayStr, currentSlot]);

  // Kiểm tra các buổi TRƯỚC buổi hiện tại trong ngày hôm nay xem có bị sót mục nào không
  const earlierMissedItems = useMemo(() => {
    const curIdx = TIME_SLOT_ORDER.indexOf(currentSlot);
    if (curIdx <= 0) return [];
    const missed: Array<{ slot: TimeSlot; slotLabel: string; routine: CareRoutine }> = [];
    for (let i = 0; i < curIdx; i++) {
      const sl = TIME_SLOT_ORDER[i];
      const slLabel = TIME_SLOT_CONFIG[sl].label;
      todayScheduledRoutines.forEach((r) => {
        if (Array.isArray(r.timeSlots) && r.timeSlots.includes(sl)) {
          const done = todayLogMap.get(`dl-${todayStr}-${r.id}-${sl}`)?.isDone;
          if (!done) {
            missed.push({ slot: sl, slotLabel: slLabel, routine: r });
          }
        }
      });
    }
    return missed;
  }, [currentSlot, todayScheduledRoutines, todayLogMap, todayStr]);

  // ===== 4. LỊCH TÁI KHÁM SẮP TỚI (TRONG VÒNG 3 NGÀY) =====
  const upcomingAppointment = useMemo(() => {
    if (!appointment.nextDate) return null;
    const normNext = normalizeDateStr(appointment.nextDate);
    if (!normNext) return null;
    const diff = diffDaysBetweenDateStr(normNext, todayStr);
    if (diff < 0 || diff > 3) return null;
    const [y, m, d] = normNext.split('-');
    return {
      diffDays: diff,
      formattedDate: `${d}/${m}/${y}`,
      note: appointment.nextNote,
      who: appointment.nextWho,
    };
  }, [appointment, todayStr]);

  // ===== 5. TỔNG HỢP LỜI NHẮC BẰNG GIỌNG NÓI TIẾNG VIỆT =====
  const buildVoiceReminderText = useCallback(() => {
    const slotLabel = TIME_SLOT_CONFIG[currentSlot].label;
    const parts: string[] = [`Nhắc việc chăm sóc sức khỏe của ${patientDisplayName} buổi ${slotLabel}:`];

    if (latestVitalAlert) {
      parts.push(`Lưu ý: Lần đo lúc ${latestVitalAlert.entry.time} có ${latestVitalAlert.summary}.`);
    }

    if (currentSlotVitals.length === 0) {
      parts.push(`Buổi ${slotLabel} hôm nay chưa đo huyết áp.`);
    } else {
      const latestSlotVital = currentSlotVitals[0];
      parts.push(
        `Buổi ${slotLabel} đã đo huyết áp ${latestSlotVital.sys} trên ${latestSlotVital.dia}, nhịp tim ${latestSlotVital.pulse}.`
      );
    }

    if (currentSlotPending.length > 0) {
      const names = currentSlotPending.map((r) => r.title).join(', ');
      parts.push(`Còn ${currentSlotPending.length} mục buổi ${slotLabel} chưa tích hoàn thành gồm: ${names}.`);
    } else if (currentSlotRoutines.length > 0) {
      parts.push(`Đã hoàn thành đầy đủ tất cả thuốc và bài tập buổi ${slotLabel}.`);
    }

    if (earlierMissedItems.length > 0) {
      parts.push(`Ngoài ra, các buổi trước trong ngày còn ${earlierMissedItems.length} mục chưa tích.`);
    }

    if (upcomingAppointment) {
      if (upcomingAppointment.diffDays === 0) {
        parts.push(`Đặc biệt hôm nay ngày ${upcomingAppointment.formattedDate} bố có lịch tái khám.`);
      } else {
        parts.push(
          `Còn ${upcomingAppointment.diffDays} ngày nữa, vào ngày ${upcomingAppointment.formattedDate} bố có lịch tái khám.`
        );
      }
    }

    return parts.join(' ');
  }, [
    currentSlot,
    latestVitalAlert,
    currentSlotVitals,
    currentSlotPending,
    currentSlotRoutines.length,
    earlierMissedItems.length,
    upcomingAppointment,
    patientDisplayName,
  ]);

  const handleToggleVoice = useCallback(() => {
    if (isSpeaking) {
      stopSpeakingVietnamese();
      setIsSpeaking(false);
      return;
    }
    const text = buildVoiceReminderText();
    setIsSpeaking(true);
    showToast?.('🔊 Đang phát giọng đọc nhắc việc Tiếng Việt...', 'info');
    const ok = speakVietnameseReminder(text, () => {
      setIsSpeaking(false);
    });
    if (!ok) {
      setIsSpeaking(false);
      showToast?.('Không thể phát giọng đọc trên thiết bị này.', 'warn');
    }
  }, [isSpeaking, buildVoiceReminderText, showToast]);

  // ===== 6. CƠ CHẾ TỰ ĐỘNG BẮN THÔNG BÁO ĐẨY PWA & ÂM BÁO THEO KHUNG GIỜ =====
  useEffect(() => {
    if (!hasInitialLoaded || !prefs.enabled) return;

    // 6A. Kiểm tra bản ghi Huyết áp mới nhất trong ngày (bắn thông báo nếu mới đo trong vòng 20 phút)
    if (latestTodayVital) {
      const vitalNotifKey = `vital_${latestTodayVital.id}`;
      if (!hasNotificationBeenSent(vitalNotifKey)) {
        const nowMin = timeStrToMinutes(getVietnamTimeStr());
        const vitalMin = timeStrToMinutes(latestTodayVital.time, latestTodayVital.period);
        const isRecent = Math.abs(nowMin - vitalMin) <= 25;

        if (isRecent) {
          if (latestVitalAlert && prefs.notifyOnHighBp) {
            markNotificationSent(vitalNotifKey);
            if (prefs.soundEnabled) playNotificationSound('urgent');
            if (prefs.pwaPushEnabled) {
              void sendPwaNotification({
                title: `🚨 Cảnh Báo Huyết Áp Bố (${latestTodayVital.time})`,
                body: `${latestTodayVital.sys}/${latestTodayVital.dia} mmHg • Mạch ${latestTodayVital.pulse} l/p. ${latestVitalAlert.summary}`,
                tag: vitalNotifKey,
                url: '/#section-vitals',
                urgent: true,
              });
            }
          } else if (!latestVitalAlert && prefs.notifyOnAllNewBp) {
            markNotificationSent(vitalNotifKey);
            if (prefs.pwaPushEnabled) {
              void sendPwaNotification({
                title: `💓 Bố vừa đo huyết áp (${latestTodayVital.time})`,
                body: `Chỉ số ổn định: ${latestTodayVital.sys}/${latestTodayVital.dia} mmHg • Mạch ${latestTodayVital.pulse} lần/phút.`,
                tag: vitalNotifKey,
                url: '/#section-vitals',
                urgent: false,
              });
            }
          }
        } else {
          // Bản ghi cũ đã qua lâu -> đánh dấu luôn để không báo lại
          markNotificationSent(vitalNotifKey);
        }
      }
    }

    // 6B. Kiểm tra đến khung giờ nhắc của buổi hiện tại (Sáng / Trưa / Chiều / Tối)
    if (prefs.notifyOnSlotReminder) {
      const targetTimeStr = prefs.slotTimes[currentSlot] || '07:30';
      const nowMin = timeStrToMinutes(currentTimeHHmm);
      const targetMin = timeStrToMinutes(targetTimeStr);
      const slotCfg = TIME_SLOT_CONFIG[currentSlot];
      const slotEndMin = slotCfg.hourEnd * 60;

      // Nếu hiện tại đã tới giờ nhắc của buổi (và vẫn đang trong buổi đó)
      if (nowMin >= targetMin && nowMin < slotEndMin) {
        const needsBp = currentSlotVitals.length === 0;
        const needsRoutines = currentSlotPending.length > 0;

        if (needsBp || needsRoutines) {
          const slotNotifKey = `slot_${todayStr}_${currentSlot}`;
          if (!hasNotificationBeenSent(slotNotifKey)) {
            markNotificationSent(slotNotifKey);

            const msgParts: string[] = [];
            if (needsBp) msgParts.push(`Chưa đo huyết áp buổi ${slotCfg.label}`);
            if (needsRoutines) {
              const previewTitles = currentSlotPending
                .slice(0, 2)
                .map((r) => r.title)
                .join(', ');
              msgParts.push(
                `Còn ${currentSlotPending.length} mục thuốc/tập chưa tích (${previewTitles}${
                  currentSlotPending.length > 2 ? '...' : ''
                })`
              );
            }

            if (prefs.soundEnabled) {
              playNotificationSound('gentle');
            }
            if (prefs.pwaPushEnabled) {
              void sendPwaNotification({
                title: `${slotCfg.emoji} Nhắc Việc Buổi ${slotCfg.label} (${targetTimeStr})`,
                body: msgParts.join(' • '),
                tag: slotNotifKey,
                url: needsBp ? '/#section-vitals' : '/#section-routine',
                urgent: false,
              });
            }
          }

          // Tách khóa tự đọc giọng Tiếng Việt riêng để khi người dùng vừa bật "Tự đọc giọng Tiếng Việt"
          // trong Cài đặt là nghe đọc nhắc việc buổi hiện tại ngay lập tức
          if (prefs.autoVoiceEnabled) {
            const slotVoiceKey = `voice_slot_${todayStr}_${currentSlot}`;
            if (!hasNotificationBeenSent(slotVoiceKey)) {
              markNotificationSent(slotVoiceKey);
              setIsSpeaking(true);
              const ok = speakVietnameseReminder(buildVoiceReminderText(), () => {
                setIsSpeaking(false);
              });
              if (!ok) {
                setIsSpeaking(false);
              }
            }
          }
        }
      }
    }

    // 6C. Nhắc lịch tái khám vào buổi sáng (từ 07:00 trở đi) nếu còn 0-2 ngày
    if (
      prefs.notifyOnAppointment &&
      upcomingAppointment &&
      upcomingAppointment.diffDays <= 2 &&
      getVietnamHour() >= 7
    ) {
      const apptKey = `appt_${todayStr}_${appointment.nextDate}`;
      if (!hasNotificationBeenSent(apptKey)) {
        markNotificationSent(apptKey);
        const dayText =
          upcomingAppointment.diffDays === 0
            ? 'HÔM NAY'
            : upcomingAppointment.diffDays === 1
            ? 'NGÀY MAI'
            : `Còn ${upcomingAppointment.diffDays} ngày nữa`;
        if (prefs.pwaPushEnabled) {
          void sendPwaNotification({
            title: `📅 Nhắc Lịch Tái Khám Của Bố (${dayText})`,
            body: `Ngày ${upcomingAppointment.formattedDate}${
              upcomingAppointment.note ? ` — ${upcomingAppointment.note}` : ''
            }`,
            tag: apptKey,
            url: '/#section-appointment',
            urgent: upcomingAppointment.diffDays === 0,
          });
        }
      }
    }
  }, [
    hasInitialLoaded,
    prefs,
    latestTodayVital,
    latestVitalAlert,
    currentSlot,
    currentTimeHHmm,
    currentSlotVitals.length,
    currentSlotPending,
    todayStr,
    upcomingAppointment,
    appointment.nextDate,
    buildVoiceReminderText,
  ]);

  // ===== 7. THAO TÁC TÍCH NHANH 1 CHẠM NGAY TRÊN HỘP NHẮC =====
  const handleQuickCompleteItem = useCallback(
    async (routine: CareRoutine, slot: TimeSlot) => {
      const logId = `dl-${todayStr}-${routine.id}-${slot}`;
      const newLog: DailyLog = {
        id: logId,
        date: todayStr,
        routineId: routine.id,
        timeSlot: slot,
        isDone: true,
        doneAt: getVietnamTimeStr(),
        doneBy: defaultRecorder,
        note: '',
      };
      if (prefs.soundEnabled) {
        playNotificationSound('success');
      }
      await onToggleDailyLog(newLog);
    },
    [todayStr, defaultRecorder, prefs.soundEnabled, onToggleDailyLog]
  );

  const handleQuickCompleteAllCurrentSlot = useCallback(async () => {
    if (currentSlotPending.length === 0) return;
    const nowTime = getVietnamTimeStr();
    if (prefs.soundEnabled) {
      playNotificationSound('success');
    }
    for (const routine of currentSlotPending) {
      const logId = `dl-${todayStr}-${routine.id}-${currentSlot}`;
      await onToggleDailyLog({
        id: logId,
        date: todayStr,
        routineId: routine.id,
        timeSlot: currentSlot,
        isDone: true,
        doneAt: nowTime,
        doneBy: defaultRecorder,
        note: '',
      });
    }
    showToast?.(`✅ Đã tích hoàn thành toàn bộ buổi ${TIME_SLOT_CONFIG[currentSlot].label}!`, 'success');
  }, [currentSlotPending, todayStr, currentSlot, defaultRecorder, prefs.soundEnabled, onToggleDailyLog, showToast]);

  const handleSnooze30Min = useCallback(() => {
    const until = setSnoozeMinutes(30);
    setSnoozeUntil(until);
    showToast?.('💤 Đã tạm ẩn hộp nhắc việc trong 30 phút.', 'info');
  }, [showToast]);

  const handleWakeSnooze = useCallback(() => {
    setSnoozeMinutes(0);
    setSnoozeUntil(0);
  }, []);

  const isSnoozed = snoozeUntil > Date.now();
  const slotInfo = TIME_SLOT_CONFIG[currentSlot];
  const needsCurrentBp = currentSlotVitals.length === 0;
  const hasPendingCurrent = currentSlotPending.length > 0;
  const hasEarlierMissed = earlierMissedItems.length > 0;
  const isAllCurrentDone = !needsCurrentBp && !hasPendingCurrent && !hasEarlierMissed && !latestVitalAlert;

  // Nếu đang tạm ẩn (Snooze) và không có cảnh báo HA khẩn cấp -> chỉ hiện thanh nhỏ 1 dòng
  if (isSnoozed && !latestVitalAlert) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2 flex items-center justify-between gap-2 text-xs text-slate-600 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="font-semibold truncate">
            Đang tạm ẩn nhắc việc buổi {slotInfo.label} (30 phút)
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleWakeSnooze}
            className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold cursor-pointer transition"
          >
            Hiện lại
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
            title="Cài đặt thông báo"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border shadow-2xs transition-all overflow-hidden ${
        latestVitalAlert?.isCritical
          ? 'bg-rose-50/95 border-rose-300'
          : latestVitalAlert
          ? 'bg-amber-50/95 border-amber-300'
          : isAllCurrentDone
          ? 'bg-emerald-50/80 border-emerald-200'
          : 'bg-gradient-to-br from-teal-50/95 via-white to-cyan-50/60 border-teal-300'
      }`}
    >
      {/* Thanh tiêu đề Hộp Nhắc Thông Minh */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              latestVitalAlert?.isCritical
                ? 'bg-rose-600 text-white animate-pulse'
                : latestVitalAlert
                ? 'bg-amber-500 text-white'
                : isAllCurrentDone
                ? 'bg-emerald-600 text-white'
                : 'bg-teal-700 text-white'
            }`}
          >
            {latestVitalAlert ? (
              <AlertTriangle className="w-5 h-5" />
            ) : isAllCurrentDone ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <BellRing className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                {latestVitalAlert
                  ? 'Cảnh Báo Chỉ Số Sinh Hiệu'
                  : isAllCurrentDone
                  ? `${slotInfo.emoji} Buổi ${slotInfo.label} Đã Hoàn Tất Đầy Đủ!`
                  : `${slotInfo.emoji} Nhắc Việc Buổi ${slotInfo.label} (${slotInfo.timeRange})`}
              </span>
              {permissionState !== 'granted' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                  Chưa bật chuông ĐT
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs font-medium text-slate-600 truncate mt-0.5">
              {latestVitalAlert
                ? latestVitalAlert.summary
                : isAllCurrentDone
                ? `Đã đo HA buổi ${slotInfo.label} & hoàn thành ${currentSlotRoutines.length}/${currentSlotRoutines.length} mục`
                : [
                    needsCurrentBp ? `Chưa đo HA buổi ${slotInfo.label}` : `Đã đo HA buổi ${slotInfo.label}`,
                    hasPendingCurrent
                      ? `Còn ${currentSlotPending.length} mục thuốc/tập buổi ${slotInfo.label}`
                      : 'Thuốc/tập buổi này đã xong',
                    hasEarlierMissed ? `Sót ${earlierMissedItems.length} mục buổi trước` : '',
                  ]
                    .filter(Boolean)
                    .join(' • ')}
            </p>
          </div>
        </button>

        {/* Cụm nút điều khiển nhanh: Đọc Giọng Nói Tiếng Việt + Cài đặt Chuông + Thu gọn */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer min-h-[36px] ${
              isSpeaking
                ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                : 'bg-white hover:bg-teal-50 text-teal-800 border-teal-200 shadow-2xs'
            }`}
            title="Đọc to lời nhắc bằng giọng nói Tiếng Việt cho Mẹ nghe"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4 shrink-0" /> : <Volume2 className="w-4 h-4 shrink-0" />}
            <span className="hidden sm:inline">{isSpeaking ? 'Dừng đọc' : 'Đọc nhắc việc'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer min-h-[36px]"
            title="Cài đặt giờ nhắc & Thông báo đẩy trên điện thoại"
          >
            <Bell className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="hidden md:inline">Hẹn giờ</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-xl bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title={isExpanded ? 'Thu gọn hộp nhắc' : 'Mở rộng hộp nhắc'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Nội dung chi tiết khi mở rộng */}
      {isExpanded && (!isAllCurrentDone || upcomingAppointment) && (
        <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-slate-200/60">
          {/* 1. Cảnh báo Huyết áp / Nhịp tim gần nhất nếu bất thường */}
          {latestVitalAlert && (
            <div
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                latestVitalAlert.isCritical
                  ? 'bg-rose-100/90 border-rose-300 text-rose-950'
                  : 'bg-amber-100/80 border-amber-300 text-amber-950'
              }`}
            >
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black">
                    🚨 Đo lúc {latestVitalAlert.entry.time}: {latestVitalAlert.entry.sys}/
                    {latestVitalAlert.entry.dia} mmHg
                    {latestVitalAlert.entry.pulse ? ` — Mạch ${latestVitalAlert.entry.pulse} l/p` : ''}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${latestVitalAlert.evaluation.bp.badgeClass}`}
                  >
                    {latestVitalAlert.evaluation.bp.shortLabel}
                  </span>
                  {latestVitalAlert.evaluation.pulse.category !== 'none' && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${latestVitalAlert.evaluation.pulse.badgeClass}`}
                    >
                      {latestVitalAlert.evaluation.pulse.shortLabel}
                    </span>
                  )}
                </div>
                <p className="font-semibold opacity-95">
                  {latestVitalAlert.summary}
                </p>
                <p className="font-medium opacity-85 text-[11px]">
                  💡 {latestVitalAlert.evaluation.clinicalAdvice}
                </p>
              </div>
              <a
                href="#section-vitals"
                className="px-3 py-1.5 rounded-xl bg-white text-slate-900 font-extrabold text-xs border border-slate-300 shadow-2xs shrink-0 text-center hover:bg-slate-50"
              >
                Đo kiểm tra lại
              </a>
            </div>
          )}

          {/* 2. Nhắc đo Huyết áp buổi hiện tại nếu chưa đo */}
          {needsCurrentBp && (
            <div className="p-2.5 rounded-xl bg-white border border-teal-200 flex items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                  <HeartPulse className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    Chưa đo Huyết áp buổi {slotInfo.label}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Nên đo huyết áp trước khi uống thuốc hạ áp buổi {slotInfo.label.toLowerCase()}
                  </p>
                </div>
              </div>
              <a
                href="#section-vitals"
                className="px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs shrink-0 shadow-2xs transition"
              >
                💓 Đo HA ngay
              </a>
            </div>
          )}

          {/* 3. Danh sách Thuốc & Bài tập buổi hiện tại chưa tích (Bấm tích 1 chạm ngay tại đây) */}
          {hasPendingCurrent && (
            <div className="p-2.5 rounded-xl bg-white border border-teal-200 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                  <span>
                    Việc buổi {slotInfo.label} cần làm ({currentSlotPending.length} mục):
                  </span>
                </span>
                {currentSlotPending.length > 1 && (
                  <button
                    type="button"
                    onClick={handleQuickCompleteAllCurrentSlot}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-extrabold cursor-pointer transition shadow-2xs"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Tích xong cả {currentSlotPending.length} mục</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {currentSlotPending.map((routine) => {
                  const IconComp =
                    routine.category === 'meds'
                      ? Pill
                      : routine.category === 'rehab'
                      ? Dumbbell
                      : Heart;
                  return (
                    <div
                      key={`${routine.id}-${currentSlot}`}
                      className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-teal-300 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <IconComp className="w-4 h-4 text-teal-700 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {routine.title}
                          </p>
                          {routine.dosage && (
                            <p className="text-[11px] text-slate-500 truncate">{routine.dosage}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickCompleteItem(routine, currentSlot)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shrink-0 cursor-pointer active:scale-95 transition shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã xong</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Nhắc các mục bị sót từ buổi trước trong ngày hôm nay (VD đang buổi Trưa mà buổi Sáng quên tích) */}
          {hasEarlierMissed && (
            <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>
                    Buổi trước trong ngày còn {earlierMissedItems.length} mục chưa tích (Bấm để tích bù):
                  </span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {earlierMissedItems.map(({ slot, slotLabel, routine }) => (
                  <button
                    key={`missed-${slot}-${routine.id}`}
                    type="button"
                    onClick={() => handleQuickCompleteItem(routine, slot)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-amber-300 hover:border-emerald-400 text-xs font-bold cursor-pointer transition shadow-2xs"
                    title={`Bấm để tích hoàn thành ${routine.title} (Buổi ${slotLabel})`}
                  >
                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-black">
                      {slotLabel}
                    </span>
                    <span className="truncate max-w-[180px]">{routine.title}</span>
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Nhắc lịch tái khám sắp tới (0 - 3 ngày) */}
          {upcomingAppointment && (
            <div className="p-2.5 rounded-xl bg-cyan-50/80 border border-cyan-200 flex items-center justify-between gap-2 text-xs text-cyan-950">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-cyan-700 shrink-0" />
                <span className="font-bold truncate">
                  {upcomingAppointment.diffDays === 0
                    ? `📅 HÔM NAY (${upcomingAppointment.formattedDate}) Bố có lịch tái khám!`
                    : `📅 Còn ${upcomingAppointment.diffDays} ngày nữa (${upcomingAppointment.formattedDate}) tới lịch tái khám của Bố`}
                  {upcomingAppointment.note ? ` — ${upcomingAppointment.note}` : ''}
                </span>
              </div>
              <a
                href="#section-appointment"
                className="px-2.5 py-1 rounded-lg bg-white text-cyan-900 border border-cyan-300 font-bold shrink-0 hover:bg-cyan-100"
              >
                Xem
              </a>
            </div>
          )}

          {/* Thanh chân Hộp Nhắc: Nút bật thông báo đẩy nếu chưa cấp quyền + Nút Tạm ẩn 30 phút */}
          <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-slate-500">
            <div className="flex items-center gap-2 flex-wrap">
              {permissionState !== 'granted' ? (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1 text-teal-800 hover:text-teal-950 font-extrabold underline decoration-teal-400 underline-offset-2 cursor-pointer"
                >
                  📲 Bấm để bật thông báo nổ trên màn hình khóa điện thoại
                </button>
              ) : (
                <span className="text-emerald-700 font-semibold">
                  🔔 Hẹn giờ nhắc buổi {slotInfo.label}: {prefs.slotTimes[currentSlot]}
                </span>
              )}
            </div>

            {!isAllCurrentDone && (
              <button
                type="button"
                onClick={handleSnooze30Min}
                className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer shrink-0"
              >
                💤 Nhắc lại sau 30p
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
