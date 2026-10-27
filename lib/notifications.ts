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

let currentTtsAudio: HTMLAudioElement | null = null;
let currentSpeechTimer: ReturnType<typeof setTimeout> | null = null;
let activeTtsSessionId = 0;
let currentOnEndCallback: (() => void) | null = null;

/**
 * Chuẩn hóa các ký hiệu y khoa và đơn vị đo sang chữ Tiếng Việt tự nhiên
 * để giọng đọc phát âm chuẩn xác, dễ nghe cho người lớn tuổi.
 */
function normalizeTextForVietnameseSpeech(raw: string): string {
  return raw
    .replace(/(\d{2,3})\s*\/\s*(\d{2,3})\s*mmHg/gi, '$1 trên $2')
    .replace(/mmHg/gi, '')
    .replace(/(\d+)\s*l\/p/gi, '$1 lần một phút')
    .replace(/(\d+)\s*mg\b/gi, '$1 mi li gam')
    .replace(/\bHA\b/g, 'huyết áp')
    .replace(/\bPHCN\b/g, 'phục hồi chức năng')
    .replace(/\bBS\b/g, 'bác sĩ')
    .replace(/[•🚨💓💊📅⏰✅✨]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fallback đọc bằng Web Speech API của trình duyệt (CHỈ dùng khi mất mạng / lỗi tải MP3 từ đầu,
 * tuyệt đối không kích hoạt khi người dùng bấm Dừng đọc hoặc khi bị chặn Autoplay).
 */
function fallbackBrowserSpeechSynthesis(
  text: string,
  sessionId: number,
  onEnd?: () => void
): boolean {
  if (sessionId !== activeTtsSessionId) return false;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return false;
  }
  try {
    // Đảm bảo luồng HTMLAudioElement đã ngắt hoàn toàn để không bao giờ phát chồng 2 giọng
    if (currentTtsAudio) {
      const oldAudio = currentTtsAudio;
      currentTtsAudio = null;
      oldAudio.onended = null;
      oldAudio.onerror = null;
      oldAudio.onplay = null;
      try {
        oldAudio.pause();
        oldAudio.removeAttribute('src');
      } catch {
        // ignore
      }
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    if (currentSpeechTimer) {
      clearTimeout(currentSpeechTimer);
      currentSpeechTimer = null;
    }

    currentSpeechTimer = setTimeout(() => {
      currentSpeechTimer = null;
      if (sessionId !== activeTtsSessionId) return;
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 0.92;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        // Ưu tiên chọn giọng nữ Tiếng Việt nếu thiết bị có nhiều giọng vi-VN
        const vnVoices = voices.filter(
          (v) => v.lang.toLowerCase().includes('vi') || v.name.toLowerCase().includes('viet')
        );
        const preferredVnVoice =
          vnVoices.find((v) => /hoaimy|linh|female|nữ|google/i.test(v.name)) || vnVoices[0];
        if (preferredVnVoice) {
          utterance.voice = preferredVnVoice;
        }

        // Giữ tham chiếu toàn cục tránh bị Garbage Collector của Chrome huỷ sự kiện onend giữa chừng
        (window as unknown as { __careUtterance?: SpeechSynthesisUtterance }).__careUtterance = utterance;

        utterance.onend = () => {
          if (sessionId === activeTtsSessionId) {
            onEnd?.();
          }
        };
        utterance.onerror = () => {
          if (sessionId === activeTtsSessionId) {
            onEnd?.();
          }
        };
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch {
        if (sessionId === activeTtsSessionId) {
          onEnd?.();
        }
      }
    }, 60);
    return true;
  } catch {
    onEnd?.();
    return false;
  }
}

/**
 * Đọc giọng nói Tiếng Việt rõ ràng cho người lớn tuổi:
 * - Ưu tiên 1: Phát âm thanh MP3 Giọng Nữ Tiếng Việt chuẩn từ `/api/tts` (hoạt động trên 100% máy tính, Android, iPhone).
 * - Ưu tiên 2 (Fallback chỉ khi mất mạng): Dùng Web Speech API (`speechSynthesis`) của thiết bị.
 */
export function speakVietnameseReminder(
  text: string,
  onEnd?: () => void
): boolean {
  if (typeof window === 'undefined') {
    onEnd?.();
    return false;
  }

  // Dừng triệt để mọi âm thanh đang phát trước khi bắt đầu câu mới
  stopSpeakingVietnamese();

  const normalizedText = normalizeTextForVietnameseSpeech(text);
  if (!normalizedText) {
    onEnd?.();
    return false;
  }

  const sessionId = ++activeTtsSessionId;
  let hasEnded = false;

  const finishOnce = () => {
    if (hasEnded) return;
    hasEnded = true;
    if (currentOnEndCallback === finishOnce) {
      currentOnEndCallback = null;
    }
    if (sessionId === activeTtsSessionId) {
      currentTtsAudio = null;
    }
    onEnd?.();
  };

  currentOnEndCallback = finishOnce;

  try {
    const audioUrl = `/api/tts?text=${encodeURIComponent(normalizedText)}`;
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    currentTtsAudio = audio;

    let hasStartedPlaying = false;
    let fallbackTriggered = false;

    const triggerFallbackOnce = () => {
      if (sessionId !== activeTtsSessionId || hasEnded || fallbackTriggered) return;
      fallbackTriggered = true;
      audio.onended = null;
      audio.onerror = null;
      audio.onplay = null;
      try {
        audio.pause();
        audio.removeAttribute('src');
      } catch {
        // ignore
      }
      if (currentTtsAudio === audio) {
        currentTtsAudio = null;
      }
      // Nếu đã phát được giọng nữ rồi mới bị ngắt thì kết thúc luôn, không đọc lại từ đầu bằng giọng nam
      if (hasStartedPlaying) {
        finishOnce();
        return;
      }
      // Chỉ fallback khi lỗi mạng không tải được file âm thanh ngay từ đầu
      fallbackBrowserSpeechSynthesis(normalizedText, sessionId, finishOnce);
    };

    audio.onplay = () => {
      if (sessionId !== activeTtsSessionId) {
        try {
          audio.pause();
        } catch {
          // ignore
        }
        return;
      }
      hasStartedPlaying = true;
    };

    audio.onended = () => {
      if (sessionId !== activeTtsSessionId) return;
      finishOnce();
    };

    audio.onerror = () => {
      triggerFallbackOnce();
    };

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err: unknown) => {
        if (sessionId !== activeTtsSessionId || hasEnded || fallbackTriggered) return;
        const errName =
          err && typeof err === 'object' && 'name' in err
            ? String((err as { name?: unknown }).name)
            : '';

        // AbortError: người dùng bấm "Dừng đọc" hoặc chuyển câu đọc khác
        // NotAllowedError: trình duyệt chặn tự động phát khi chưa chạm màn hình
        // Tuyệt đối KHÔNG gọi fallbackBrowserSpeechSynthesis trong 2 trường hợp này!
        if (errName === 'AbortError' || errName === 'NotAllowedError') {
          audio.onended = null;
          audio.onerror = null;
          audio.onplay = null;
          if (currentTtsAudio === audio) {
            currentTtsAudio = null;
          }
          finishOnce();
          return;
        }

        triggerFallbackOnce();
      });
    }
    return true;
  } catch {
    return fallbackBrowserSpeechSynthesis(normalizedText, sessionId, finishOnce);
  }
}

export function stopSpeakingVietnamese(): void {
  if (typeof window === 'undefined') return;
  // Tăng sessionId ngay lập tức để vô hiệu hóa toàn bộ callback onerror / catch / timer của phiên cũ
  activeTtsSessionId += 1;

  try {
    if (currentSpeechTimer) {
      clearTimeout(currentSpeechTimer);
      currentSpeechTimer = null;
    }
    if (currentTtsAudio) {
      const audio = currentTtsAudio;
      currentTtsAudio = null;
      // Gỡ toàn bộ event handler TRƯỚC KHI pause và xóa src để không kích hoạt audio.onerror giả
      audio.onended = null;
      audio.onerror = null;
      audio.onplay = null;
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {
        // ignore
      }
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }

  if (currentOnEndCallback) {
    const cb = currentOnEndCallback;
    currentOnEndCallback = null;
    try {
      cb();
    } catch {
      // ignore
    }
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
