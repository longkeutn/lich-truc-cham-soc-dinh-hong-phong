import type {
  AppointmentInfo,
  BpThresholds,
  CareRoutine,
  DailyLog,
  TimeSlot,
  VitalsLogEntry,
} from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  compareVitalsDesc,
  evaluateVitalReading,
  normalizeDateStr,
} from '@/lib/config';
import type { NotificationPreferences } from '@/lib/notifications';

export interface SmartAlertItem {
  id: string;
  severity: 'critical' | 'urgent' | 'upcoming' | 'info';
  category: 'bp_alert' | 'vitals_due' | 'meds_due' | 'rehab_due' | 'appointment';
  title: string;
  detail: string;
  voiceText: string;
  routineToComplete?: {
    routine: CareRoutine;
    slot: TimeSlot;
  };
}

export const SNOOZE_STORAGE_KEY = 'care_snoozed_alerts_v1';

export function parseHmToMinutes(hm: string): number {
  const parts = (hm || '07:00').split(':');
  const h = parseInt(parts[0] || '7', 10);
  const m = parseInt(parts[1] || '0', 10);
  return (isNaN(h) ? 7 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function loadSnoozedMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SNOOZE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    const now = Date.now();
    const cleaned: Record<string, number> = {};
    for (const [k, exp] of Object.entries(parsed)) {
      if (exp > now) cleaned[k] = exp;
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function saveSnoozedMap(map: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

interface BuildSmartAlertsParams {
  vitalsLog: VitalsLogEntry[];
  bpThresholds: BpThresholds;
  activeRoutines: CareRoutine[];
  dailyLogs: DailyLog[];
  appointment: AppointmentInfo;
  effectiveToday: string;
  nowMinutes: number;
  prefs: NotificationPreferences;
  patientDisplayName: string;
}

export function buildSmartAlerts({
  vitalsLog,
  bpThresholds,
  activeRoutines,
  dailyLogs,
  appointment,
  effectiveToday,
  nowMinutes,
  prefs,
  patientDisplayName,
}: BuildSmartAlertsParams): SmartAlertItem[] {
  const list: SmartAlertItem[] = [];
  const todayVitals = vitalsLog
    .filter((v) => normalizeDateStr(v.date) === effectiveToday)
    .sort(compareVitalsDesc);

  const todayDoneLogs = dailyLogs.filter(
    (l) => normalizeDateStr(l.date) === effectiveToday && l.isDone
  );
  const doneSet = new Set(todayDoneLogs.map((l) => `${l.routineId}__${l.timeSlot}`));

  // 1. Cảnh báo Huyết áp & Mạch bất thường ở lần đo gần nhất trong ngày
  if (todayVitals.length > 0) {
    const latest = todayVitals[0];
    const latestEval = evaluateVitalReading(latest, bpThresholds, patientDisplayName);

    if (latestEval.overallAlertLevel === 'critical') {
      const pulseNote = latest.pulse ? `, mạch ${latest.pulse}` : '';
      const reasonStr = latestEval.reasons.join(' · ');
      list.push({
        id: `bp-crit-${latest.id}`,
        severity: 'critical',
        category: 'bp_alert',
        title: `🚨 ${latestEval.statusLabel} lúc ${latest.time}: ${latest.sys}/${latest.dia} mmHg${pulseNote}`,
        detail: `${reasonStr}. ${latestEval.clinicalAdvice}`,
        voiceText: `Cảnh báo khẩn cấp! Chỉ số lúc ${latest.time} của ${patientDisplayName} là huyết áp ${latest.sys} trên ${latest.dia}${pulseNote}. ${reasonStr}. ${latestEval.clinicalAdvice}`,
      });
    } else if (latestEval.overallAlertLevel === 'warning') {
      const pulseNote = latest.pulse ? `, mạch ${latest.pulse}` : '';
      const reasonStr = latestEval.reasons.join(' · ');
      list.push({
        id: `bp-warn-${latest.id}`,
        severity: 'urgent',
        category: 'bp_alert',
        title: `⚠️ Lưu ý chỉ số lúc ${latest.time}: ${latest.sys}/${latest.dia} mmHg${pulseNote}`,
        detail: `${reasonStr}. ${latestEval.clinicalAdvice}`,
        voiceText: `Lưu ý! Lần đo lúc ${latest.time} của ${patientDisplayName} có ${reasonStr}. ${latestEval.clinicalAdvice}`,
      });
    }
  }

  // 2. Nhắc đo huyết áp Sáng / Tối
  const morningStartMin = parseHmToMinutes(prefs.slotTimes.morning);
  const eveningStartMin = parseHmToMinutes(prefs.slotTimes.evening);
  const hasMorningBp = todayVitals.some(
    (v) => v.period === 'morning' || parseHmToMinutes(v.time) < 11 * 60 + 30
  );
  const hasEveningBp = todayVitals.some(
    (v) => v.period === 'evening' || parseHmToMinutes(v.time) >= 17 * 60 + 30
  );

  if (nowMinutes >= morningStartMin && nowMinutes < 12 * 60 && !hasMorningBp) {
    list.push({
      id: `vitals-morning-${effectiveToday}`,
      severity: nowMinutes >= morningStartMin + 60 ? 'urgent' : 'upcoming',
      category: 'vitals_due',
      title: `💓 Chưa ghi huyết áp buổi Sáng cho ${patientDisplayName}`,
      detail: `Khung giờ cài đặt: ${prefs.slotTimes.morning}. Nên đo huyết áp trước khi uống thuốc sáng.`,
      voiceText: `Nhắc nhở gia đình: Hôm nay chưa đo huyết áp buổi sáng cho ${patientDisplayName}. Xin hãy đo huyết áp và nhập vào sổ theo dõi.`,
    });
  }

  if (nowMinutes >= eveningStartMin && !hasEveningBp) {
    list.push({
      id: `vitals-evening-${effectiveToday}`,
      severity: nowMinutes >= eveningStartMin + 60 ? 'urgent' : 'upcoming',
      category: 'vitals_due',
      title: `🌙 Đến giờ đo huyết áp buổi Tối cho ${patientDisplayName}`,
      detail: `Khung giờ cài đặt: ${prefs.slotTimes.evening}. Kiểm tra huyết áp tối để đảm bảo ổn định trước khi ngủ.`,
      voiceText: `Nhắc nhở buổi tối: Đã đến giờ kiểm tra huyết áp buổi tối cho ${patientDisplayName}.`,
    });
  }

  // 3. Nhắc Thuốc định kỳ & Bài tập theo khung giờ
  const scheduledRoutines = activeRoutines.filter(
    (r) => !(r.category === 'meds' && r.medType === 'as_needed')
  );
  const slotsOrder: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];
  const slotDeadlines: Record<TimeSlot, number> = {
    morning: 11 * 60,
    noon: 14 * 60,
    afternoon: 18 * 60,
    evening: 22 * 60 + 30,
  };

  for (const slot of slotsOrder) {
    const slotMin = parseHmToMinutes(prefs.slotTimes[slot]);
    if (nowMinutes < slotMin - 15) continue;

    const pendingInSlot = scheduledRoutines.filter(
      (r) => r.timeSlots.includes(slot) && !doneSet.has(`${r.id}__${slot}`)
    );
    if (pendingInSlot.length === 0) continue;

    const pendingMeds = pendingInSlot.filter((r) => r.category === 'meds');
    const pendingCareRehab = pendingInSlot.filter((r) => r.category !== 'meds');
    const slotLabel = TIME_SLOT_CONFIG[slot].label;
    const isOverdue =
      nowMinutes >= slotMin + 45 || nowMinutes >= slotDeadlines[slot] - 30;

    for (const med of pendingMeds) {
      list.push({
        id: `med-${effectiveToday}-${slot}-${med.id}`,
        severity: isOverdue ? 'critical' : 'urgent',
        category: 'meds_due',
        title: `💊 ${isOverdue ? 'Quá giờ uống thuốc' : 'Đến giờ uống thuốc'} buổi ${slotLabel}: ${med.title}`,
        detail: `${med.dosage ? `Liều lượng: ${med.dosage}. ` : ''}${med.instructions || `Bấm nút bên phải ngay sau khi ${patientDisplayName} uống xong.`}`,
        voiceText: `Nhắc uống thuốc buổi ${slotLabel}: Đã đến giờ cho ${patientDisplayName} uống ${med.title}${med.dosage ? `, liều ${med.dosage}` : ''}. ${med.instructions || ''}`,
        routineToComplete: { routine: med, slot },
      });
    }

    if (pendingCareRehab.length > 0 && nowMinutes <= slotDeadlines[slot] + 60) {
      const firstItem = pendingCareRehab[0];
      if (pendingCareRehab.length === 1) {
        list.push({
          id: `care-${effectiveToday}-${slot}-${firstItem.id}`,
          severity: isOverdue ? 'urgent' : 'upcoming',
          category: 'rehab_due',
          title: `🏃 Việc cần làm buổi ${slotLabel}: ${firstItem.title}`,
          detail: `${firstItem.dosage ? `${firstItem.dosage} · ` : ''}${firstItem.instructions || 'Thực hiện đều đặn giúp phục hồi tốt hơn.'}`,
          voiceText: `Nhắc chăm sóc buổi ${slotLabel}: ${firstItem.title} cho ${patientDisplayName}.`,
          routineToComplete: { routine: firstItem, slot },
        });
      } else {
        const titles = pendingCareRehab.map((r) => r.title).join(', ');
        list.push({
          id: `care-group-${effectiveToday}-${slot}`,
          severity: isOverdue ? 'urgent' : 'upcoming',
          category: 'rehab_due',
          title: `📋 Còn ${pendingCareRehab.length} bài tập/chăm sóc buổi ${slotLabel} chưa tích`,
          detail: titles,
          voiceText: `Buổi ${slotLabel} hôm nay của ${patientDisplayName} còn ${pendingCareRehab.length} mục tập luyện và chăm sóc chưa hoàn thành: ${titles}.`,
          routineToComplete: { routine: firstItem, slot },
        });
      }
    }
  }

  // 4. Nhắc lịch tái khám sắp tới (trong vòng 5 ngày tới)
  if (appointment.nextDate) {
    const cleanNext = normalizeDateStr(appointment.nextDate);
    if (cleanNext) {
      const [ty, tm, td] = effectiveToday.split('-').map(Number);
      const [ny, nm, nd] = cleanNext.split('-').map(Number);
      const diffMs = Date.UTC(ny, nm - 1, nd) - Date.UTC(ty, tm - 1, td);
      const diffDays = Math.round(diffMs / 86400000);

      if (diffDays === 0) {
        list.push({
          id: `appt-today-${cleanNext}`,
          severity: 'critical',
          category: 'appointment',
          title: `🏥 HÔM NAY LÀ NGÀY TÁI KHÁM CỦA ${patientDisplayName.toUpperCase()}!`,
          detail: `${appointment.nextNote || 'Khám định kỳ'}${appointment.nextWho ? ` · Người đưa đi: ${appointment.nextWho}` : ''}. Đừng quên mang sổ huyết áp & đơn thuốc hiện tại.`,
          voiceText: `Nhắc lịch quan trọng: Hôm nay là ngày đưa ${patientDisplayName} đi tái khám tại ${appointment.nextNote || 'bệnh viện'}. Gia đình nhớ mang theo sổ theo dõi huyết áp và đơn thuốc.`,
        });
      } else if (diffDays > 0 && diffDays <= 5) {
        list.push({
          id: `appt-soon-${cleanNext}-${diffDays}`,
          severity: diffDays <= 2 ? 'urgent' : 'info',
          category: 'appointment',
          title: `📅 Còn ${diffDays} ngày nữa tái khám (${cleanNext.split('-').reverse().join('/')})`,
          detail: `${appointment.nextNote || 'Khám định kỳ'}${appointment.nextWho ? ` · Người đưa đi: ${appointment.nextWho}` : ''}`,
          voiceText: `Còn ${diffDays} ngày nữa là đến lịch tái khám của ${patientDisplayName}.`,
        });
      }
    }
  }

  const weight: Record<SmartAlertItem['severity'], number> = {
    critical: 0,
    urgent: 1,
    upcoming: 2,
    info: 3,
  };
  return list.sort((a, b) => weight[a.severity] - weight[b.severity]);
}
