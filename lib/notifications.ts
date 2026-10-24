'use client';

import { TimeSlot } from './types';

export interface NotificationPreferences {
  enabled: boolean;
  pwaPushEnabled: boolean;
  soundEnabled: boolean;
  autoVoiceEnabled: boolean;
  notifyOnHighBp: boolean;
  notifyOnAllNewBp: boolean;
  notifyOnSlotReminder: boolean;
  notifyOnAppointment: boolean;
  slotTimes: Record<TimeSlot, string>;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  enabled: true,
  pwaPushEnabled: true,
  soundEnabled: true,
  autoVoiceEnabled: false,
  notifyOnHighBp: true,
  notifyOnAllNewBp: true,
  notifyOnSlotReminder: true,
  notifyOnAppointment: true,
  slotTimes: {
    morning: '07:30',
    noon: '11:30',
    afternoon: '15:00',
    evening: '19:30',
  },
};

const PREFS_STORAGE_KEY = 'care_notification_prefs_v1';
const SENT_LOG_PREFIX = 'care_notif_sent_';
const SNOOZE_UNTIL_KEY = 'care_notif_snooze_until';

/**
 * Đọc cấu hình thông báo từ localStorage
 */
export function loadNotificationPrefs(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...parsed,
      slotTimes: {
        ...DEFAULT_NOTIFICATION_PREFS.slotTimes,
        ...(parsed?.slotTimes || {}),
      },
    };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

/**
 * Lưu cấu hình thông báo vào localStorage
 */
export function saveNotificationPrefs(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

/**
 * Kiểm tra trạng thái quyền Notification của trình duyệt / PWA
 */
export function getBrowserNotificationPermission(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Yêu cầu cấp quyền Notification trên thiết bị
 */
export async function requestBrowserNotificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

/**
 * Kiểm tra và đánh dấu đã gửi 1 thông báo (chống lặp thông báo trong cùng ngày/sự kiện)
 */
export function hasNotificationBeenSent(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(`${SENT_LOG_PREFIX}${key}`) !== null;
  } catch {
    return false;
  }
}

export function markNotificationSent(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${SENT_LOG_PREFIX}${key}`, String(Date.now()));
    // Dọn dẹp các khóa cũ quá 7 ngày để tiết kiệm bộ nhớ
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SENT_LOG_PREFIX)) {
        const ts = Number(localStorage.getItem(k) || '0');
        if (ts > 0 && now - ts > sevenDaysMs) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Quản lý tạm ẩn (Snooze) hộp nhắc nhở
 */
export function getSnoozeUntil(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return Number(localStorage.getItem(SNOOZE_UNTIL_KEY) || '0');
  } catch {
    return 0;
  }
}

export function setSnoozeMinutes(minutes: number): number {
  if (typeof window === 'undefined') return 0;
  const until = minutes > 0 ? Date.now() + minutes * 60 * 1000 : 0;
  try {
    if (until > 0) {
      localStorage.setItem(SNOOZE_UNTIL_KEY, String(until));
    } else {
      localStorage.removeItem(SNOOZE_UNTIL_KEY);
    }
  } catch {
    // ignore
  }
  return until;
}

/**
 * Phát âm thanh chuông báo bằng Web Audio API (Không cần tải file MP3 ngoài, hoạt động cả khi mạng yếu)
 */
export function playNotificationSound(type: 'gentle' | 'urgent' | 'success' = 'gentle'): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, startTime: number, duration: number, peakGain = 0.18, wave: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    };

    if (type === 'urgent') {
      // Âm báo khẩn cấp 3 nhịp rõ ràng cho cảnh báo huyết áp cao
      playTone(880, now, 0.18, 0.25, 'triangle');
      playTone(660, now + 0.2, 0.18, 0.25, 'triangle');
      playTone(880, now + 0.4, 0.28, 0.28, 'triangle');
    } else if (type === 'success') {
      // Âm báo hoàn thành nhẹ nhàng
      playTone(523.25, now, 0.14, 0.14, 'sine'); // C5
      playTone(659.25, now + 0.14, 0.22, 0.16, 'sine'); // E5
    } else {
      // Âm chuông nhắc lịch uống thuốc / đo HA êm dịu (C5 -> E5 -> G5)
      playTone(523.25, now, 0.18, 0.16, 'sine');
      playTone(659.25, now + 0.18, 0.18, 0.16, 'sine');
      playTone(783.99, now + 0.36, 0.32, 0.18, 'sine');
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch {
    // Trình duyệt chặn autoplay trước khi có tương tác người dùng -> bỏ qua an toàn
  }
}

/**
 * Đọc giọng nói Tiếng Việt (Web Speech API) rõ ràng cho người lớn tuổi
 */
export function speakVietnameseReminder(
  text: string,
  onEnd?: () => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.92; // Đọc chậm rãi, rõ chữ cho người lớn tuổi
    utterance.pitch = 1.0;

    // Ưu tiên chọn voice Tiếng Việt nếu thiết bị có sẵn
    const voices = window.speechSynthesis.getVoices();
    const vnVoice = voices.find(
      (v) => v.lang.toLowerCase().includes('vi') || v.name.toLowerCase().includes('viet')
    );
    if (vnVoice) {
      utterance.voice = vnVoice;
    }

    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    onEnd?.();
    return false;
  }
}

export function stopSpeakingVietnamese(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

/**
 * Bắn thông báo đẩy hệ thống (PWA Service Worker Notification + Fallback Browser Notification)
 */
export async function sendPwaNotification(options: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  urgent?: boolean;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const notifOptions: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: options.body,
    icon: '/icon-192',
    badge: '/icon-192',
    tag: options.tag || `so-suc-khoe-${Date.now()}`,
    renotify: true,
    requireInteraction: Boolean(options.urgent),
    vibrate: options.urgent ? [300, 120, 300, 120, 400] : [200, 100, 200],
    data: {
      url: options.url || '/#section-vitals',
    },
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(options.title, notifOptions);
        return true;
      }
    }
  } catch {
    // Fallback xuống Notification API trực tiếp bên dưới
  }

  try {
    const n = new Notification(options.title, notifOptions);
    n.onclick = () => {
      window.focus();
      if (options.url && options.url.startsWith('/#')) {
        const hash = options.url.slice(1);
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
