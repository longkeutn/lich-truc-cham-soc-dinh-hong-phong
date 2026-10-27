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
  Mic,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  X,
  Edit3,
} from 'lucide-react';
import { VitalsLogEntry, VitalsPeriod, BpThresholds, AlertLevel, FamilyMember } from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_RECORDER,
  detectCurrentTimeSlot,
  computeAlertLevel,
  evaluateVitalReading,
  getVietnamDateStr,
  getVietnamTimeStr,
  diffDaysBetweenDateStr,
  formatVietnamDateFull,
} from '@/lib/config';
import { parseVoiceVitals, ParsedVoiceVitals } from '@/lib/voiceVitalsParser';
import { speakVietnameseReminder, stopSpeakingVietnamese } from '@/lib/notifications';

// ===== PROPS =====
interface QuickVitalsFormProps {
  onSave: (entry: VitalsLogEntry) => Promise<void>;
  lastEntry?: VitalsLogEntry | null;
  bpThresholds?: BpThresholds;
  defaultRecorder?: string;
  members?: FamilyMember[];
  todayStr?: string;
}

// Khai báo kiểu cho Web Speech API gốc của trình duyệt (Không dùng API AI ngoài)
interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface BrowserSpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

// ===== HELPERS =====

/** Tính xu hướng so với lần đo trước: ↑ tăng, ↓ giảm, → ổn định (±5) */
function computeTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const diff = current - previous;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
}

/** Chuyển giờ đo gần nhất thành text tương đối cho UI (theo đúng múi giờ Việt Nam UTC+7) */
function formatLastEntryTime(entry: VitalsLogEntry, currentTodayStr?: string): string {
  const slotCfg = TIME_SLOT_CONFIG[entry.period];
  const slotLabel = slotCfg?.label || entry.period;

  const todayStr = currentTodayStr || getVietnamDateStr();

  if (entry.date === todayStr) {
    return `${entry.time} ${slotLabel.toLowerCase()} nay`;
  }

  const diffDays = diffDaysBetweenDateStr(todayStr, entry.date);

  if (diffDays === 1) return `${entry.time} hôm qua`;
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} ngày trước`;
  const parts = (entry.date || '').split('-');
  if (parts.length === 3) {
    return `${entry.time} ngày ${parts[2]}/${parts[1]}`;
  }
  return entry.date;
}

// ===== HỆ THỐNG ÂM THANH & GIỌNG ĐỌC TIẾNG VIỆT TRÊN ĐIỆN THOẠI (0 AI API) =====
// File WAV im lặng 1ms dùng để mở khóa (unlock) quyền phát loa trên iOS Safari & Android Chrome
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let sharedTtsAudio: HTMLAudioElement | null = null;
let sharedAudioUnlocked = false;
let ttsPlaybackTimer: ReturnType<typeof setTimeout> | null = null;

function getOrCreateTtsAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!sharedTtsAudio) {
    sharedTtsAudio = new Audio();
    sharedTtsAudio.preload = 'auto';
  }
  return sharedTtsAudio;
}

/**
 * Mở khóa HTMLAudioElement ngay từ cú chạm đầu tiên của người dùng trên trang
 * (KHÔNG mở khóa ngay lúc bấm nút Micro để tránh giành quyền âm thanh của Micro trên điện thoại!)
 */
function unlockAudioElementOnFirstInteraction() {
  if (sharedAudioUnlocked || typeof window === 'undefined') return;
  try {
    const audio = getOrCreateTtsAudioElement();
    if (audio) {
      audio.src = SILENT_WAV_DATA_URI;
      audio.volume = 0.01;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            audio.pause();
            audio.volume = 1.0;
            sharedAudioUnlocked = true;
          })
          .catch(() => {
            // Sẽ thử lại ở lần chạm tiếp theo
          });
      }
    }
  } catch {
    // ignore
  }
}

/** Dừng ngay lập tức mọi âm thanh đọc xác nhận đang phát (để nhường 100% kênh âm thanh cho Micro) */
function stopVietnameseSpeech() {
  if (ttsPlaybackTimer) {
    clearTimeout(ttsPlaybackTimer);
    ttsPlaybackTimer = null;
  }
  stopSpeakingVietnamese();
}

/**
 * Phát giọng đọc tiếng Việt xác nhận kết quả trên điện thoại:
 * Dùng chung bộ phát tập trung `speakVietnameseReminder` để không bao giờ phát chồng 2 giọng
 * hoặc tự bật giọng nam khi người dùng bấm Dừng đọc.
 */
function speakVietnameseConfirmation(
  text: string,
  enabled: boolean,
  delayMs: number = 350,
  onSpeakingChange?: (speaking: boolean) => void
) {
  if (!enabled || typeof window === 'undefined' || !text.trim()) return;

  stopVietnameseSpeech();

  ttsPlaybackTimer = setTimeout(() => {
    ttsPlaybackTimer = null;
    onSpeakingChange?.(true);
    const ok = speakVietnameseReminder(text, () => {
      onSpeakingChange?.(false);
    });
    if (!ok) {
      onSpeakingChange?.(false);
    }
  }, delayMs);
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
    btnBg: 'bg-teal-700',
    btnHoverBg: 'hover:bg-teal-800',
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
  todayStr: todayStrProp,
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
  // Khởi tạo cố định 'morning' khi SSR rồi đồng bộ giờ thực tế của điện thoại trong useEffect
  // để tránh lỗi Hydration Mismatch (giờ UTC của server khác giờ Việt Nam làm kẹt nút bấm lần đầu)
  const [period, setPeriod] = useState<VitalsPeriod>('morning');
  const [mountedClient, setMountedClient] = useState(false);

  // --- UI state ---
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VitalsLogEntry | null>(null);

  useEffect(() => {
    setPeriod(detectCurrentTimeSlot());
    setMountedClient(true);
  }, []);

  // Tự động cập nhật buổi đo (Sáng/Trưa/Chiều/Tối) khi mở lại PWA từ chế độ nền hoặc khi bước sang ngày mới
  // (Chỉ cập nhật khi người dùng đang không gõ dở số huyết áp và không đang sửa bản ghi cũ)
  const isFormIdleRef = useRef<boolean>(true);
  useEffect(() => {
    isFormIdleRef.current = !sys.trim() && !dia.trim() && !editingEntry;
  }, [sys, dia, editingEntry]);

  useEffect(() => {
    if (isFormIdleRef.current) {
      setPeriod(detectCurrentTimeSlot());
    }
  }, [todayStrProp]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncSlotOnWakeUp = () => {
      if (document.visibilityState === 'visible' && isFormIdleRef.current) {
        setPeriod(detectCurrentTimeSlot());
      }
    };
    document.addEventListener('visibilitychange', syncSlotOnWakeUp);
    window.addEventListener('focus', syncSlotOnWakeUp);
    window.addEventListener('pageshow', syncSlotOnWakeUp);
    return () => {
      document.removeEventListener('visibilitychange', syncSlotOnWakeUp);
      window.removeEventListener('focus', syncSlotOnWakeUp);
      window.removeEventListener('pageshow', syncSlotOnWakeUp);
    };
  }, []);

  // --- Voice Recognition state (Web Speech API + Local Vietnamese Parser) ---
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingBack, setIsSpeakingBack] = useState(false);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedVoiceVitals | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);

  // --- Refs ---
  const sysInputRef = useRef<HTMLInputElement>(null);
  const quickVoiceInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionCounterRef = useRef<number>(0);
  const latestParsedRef = useRef<ParsedVoiceVitals | null>(null);
  const hasSpokenConfirmationRef = useRef<boolean>(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Kiểm tra trình duyệt có hỗ trợ Web Speech API gốc & mở khóa trước bộ phát âm thanh khi người dùng chạm màn hình
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window as unknown as Record<string, unknown>;
      const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
      setSpeechSupported(Boolean(SpeechRecognitionCtor));

      const handleFirstTouch = () => {
        unlockAudioElementOnFirstInteraction();
      };
      window.addEventListener('touchstart', handleFirstTouch, { passive: true });
      window.addEventListener('click', handleFirstTouch, { passive: true });
      return () => {
        window.removeEventListener('touchstart', handleFirstTouch);
        window.removeEventListener('click', handleFirstTouch);
      };
    }
  }, []);

  // Hàm dọn dẹp triệt để mọi bộ đếm và phiên thu âm cũ
  const cleanupRecognitionInstance = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (stopFallbackTimerRef.current) {
      clearTimeout(stopFallbackTimerRef.current);
      stopFallbackTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    const inst = recognitionRef.current;
    if (inst) {
      inst.onstart = null;
      inst.onresult = null;
      inst.onerror = null;
      inst.onend = null;
      try {
        inst.stop();
      } catch {
        // ignore
      }
      try {
        inst.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      stopVietnameseSpeech();
      cleanupRecognitionInstance();
    };
  }, [cleanupRecognitionInstance]);

  // --- Derived values (Đồng bộ chuẩn đánh giá lâm sàng toàn hệ thống) ---
  const sysNum = parseInt(sys, 10);
  const diaNum = parseInt(dia, 10);
  const pulseNum = pulse ? parseInt(pulse, 10) : undefined;
  const hasBothValues = !isNaN(sysNum) && !isNaN(diaNum) && sysNum > 0 && diaNum > 0;

  const currentEvaluation = hasBothValues
    ? evaluateVitalReading(
        {
          sys: sysNum,
          dia: diaNum,
          pulse: pulseNum && !isNaN(pulseNum) && pulseNum > 0 ? pulseNum : undefined,
        },
        thresholds
      )
    : null;

  const currentAlertLevel: AlertLevel = currentEvaluation
    ? currentEvaluation.overallAlertLevel
    : 'normal';

  const lastEntryEval = lastEntry ? evaluateVitalReading(lastEntry, thresholds) : null;

  const alertDisplay = ALERT_DISPLAY[currentAlertLevel];

  // --- Reset form ---
  const resetForm = useCallback(() => {
    setEditingEntry(null);
    setSys('');
    setDia('');
    setPulse('');
    setNote('');
    setVoiceTranscript('');
    setParsedPreview(null);
    latestParsedRef.current = null;
    hasSpokenConfirmationRef.current = false;
    setPeriod(detectCurrentTimeSlot());
  }, []);

  // --- Bắt đầu sửa lại lần đo gần nhất (nếu vừa nhập nhầm) ---
  const handleStartEditLastEntry = useCallback(() => {
    if (!lastEntry) return;
    setEditingEntry(lastEntry);
    setSys(String(lastEntry.sys));
    setDia(String(lastEntry.dia));
    setPulse(lastEntry.pulse ? String(lastEntry.pulse) : '');
    setNote(lastEntry.note || '');
    setPeriod(lastEntry.period);
    if (lastEntry.recordedBy) {
      setRecorder(lastEntry.recordedBy);
      setHasUserSelectedRecorder(true);
    }
    setTimeout(() => {
      sysInputRef.current?.focus();
      sysInputRef.current?.select();
    }, 50);
  }, [lastEntry]);

  // --- Lưu dữ liệu huyết áp (hỗ trợ truyền trực tiếp giá trị từ giọng nói khi nói "lưu luôn") ---
  const performSave = useCallback(
    async (overrideValues?: {
      sysVal: number;
      diaVal: number;
      pulseVal?: number;
      noteVal?: string;
      periodVal?: VitalsPeriod;
    }) => {
      const finalSys = overrideValues ? overrideValues.sysVal : sysNum;
      const finalDia = overrideValues ? overrideValues.diaVal : diaNum;
      if (isNaN(finalSys) || isNaN(finalDia) || finalSys <= 0 || finalDia <= 0 || isSaving) return;

      const finalPulse =
        overrideValues !== undefined
          ? overrideValues.pulseVal
          : pulse
            ? parseInt(pulse, 10)
            : undefined;
      const finalNote =
        overrideValues !== undefined
          ? overrideValues.noteVal?.trim() || undefined
          : note.trim() || undefined;
      const finalPeriod = overrideValues?.periodVal || period;
      const finalAlert = computeAlertLevel(finalSys, finalDia, thresholds, finalPulse);

      setIsSaving(true);
      try {
        const now = new Date();
        // QUAN TRỌNG: Luôn lấy ngày/giờ theo đúng Múi Giờ Việt Nam (UTC+7) tại thời điểm bấm Lưu,
        // tuyệt đối không dùng .toISOString().slice(0, 10) (UTC) hay biến ngày cũ khi treo PWA qua đêm!
        const vnDateNow = getVietnamDateStr(now);
        const vnTimeNow = getVietnamTimeStr(now);
        const entry: VitalsLogEntry = {
          id: editingEntry ? editingEntry.id : `vl-${Date.now()}`,
          date: editingEntry ? editingEntry.date : vnDateNow,
          time: editingEntry ? editingEntry.time : vnTimeNow,
          period: finalPeriod,
          sys: finalSys,
          dia: finalDia,
          pulse: finalPulse,
          spo2: editingEntry?.spo2,
          temp: editingEntry?.temp,
          bloodSugar: editingEntry?.bloodSugar,
          note: finalNote,
          alertLevel: finalAlert,
          recordedBy: recorder,
          createdAt: editingEntry ? editingEntry.createdAt : now.toISOString(),
        };

        setShowSuccess(true);
        resetForm();
        setVoicePanelOpen(false);
        void onSave(entry);

        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => {
          setShowSuccess(false);
        }, 1600);
      } finally {
        setIsSaving(false);
      }
    },
    [sysNum, diaNum, pulse, note, period, thresholds, recorder, isSaving, editingEntry, resetForm, onSave]
  );

  const handleSave = async () => {
    await performSave();
  };

  // --- Phát âm xác nhận kết quả hiện tại (gọi khi kết thúc phiên đọc hoặc khi bấm nút "Nghe lại") ---
  const triggerConfirmationFeedback = useCallback(
    (parsed: ParsedVoiceVitals | null, immediateGesture: boolean = false) => {
      if (!parsed || !parsed.isComplete || !parsed.sys || !parsed.dia) return;

      if (parsed.autoSave) {
        speakVietnameseConfirmation(
          `Đã lưu huyết áp ${parsed.sys} trên ${parsed.dia}${parsed.pulse ? `, mạch ${parsed.pulse}` : ''}`,
          ttsEnabled,
          immediateGesture ? 30 : 350,
          setIsSpeakingBack
        );
        void performSave({
          sysVal: parsed.sys,
          diaVal: parsed.dia,
          pulseVal: parsed.pulse,
          noteVal: parsed.note,
          periodVal: parsed.period,
        });
      } else {
        speakVietnameseConfirmation(
          `Huyết áp ${parsed.sys} trên ${parsed.dia}${parsed.pulse ? `, mạch ${parsed.pulse}` : ''}`,
          ttsEnabled,
          immediateGesture ? 30 : 350,
          setIsSpeakingBack
        );
      }
    },
    [performSave, ttsEnabled]
  );

  // --- Áp dụng kết quả phân tích giọng nói vào các ô input ---
  const applyTranscriptToForm = useCallback((text: string) => {
    setVoiceTranscript(text);
    const parsed = parseVoiceVitals(text);
    setParsedPreview(parsed);
    latestParsedRef.current = parsed;

    // Cập nhật đồng bộ cả khi có giá trị lẫn khi về undefined (tránh kẹt giá trị nháp tạm thời của interimResults vào ô Ghi chú)
    setSys(parsed.sys !== undefined ? String(parsed.sys) : '');
    setDia(parsed.dia !== undefined ? String(parsed.dia) : '');
    setPulse(parsed.pulse !== undefined ? String(parsed.pulse) : '');
    if (parsed.period !== undefined) setPeriod(parsed.period);
    setNote(parsed.note !== undefined ? parsed.note : '');

    return parsed;
  }, []);

  // --- Dừng thu âm chủ động & đảm bảo không bao giờ bị treo trạng thái isListening ---
  const finalizeVoiceSession = useCallback(
    (speakIfComplete: boolean = true) => {
      cleanupRecognitionInstance();
      setIsListening(false);
      if (
        speakIfComplete &&
        !hasSpokenConfirmationRef.current &&
        latestParsedRef.current?.isComplete
      ) {
        hasSpokenConfirmationRef.current = true;
        triggerConfirmationFeedback(latestParsedRef.current, false);
      }
    },
    [cleanupRecognitionInstance, triggerConfirmationFeedback]
  );

  // --- Khởi chạy hoặc Đặt lại phiên thu âm (Tự phục hồi khi bấm "Đọc lại" nhiều lần liên tiếp) ---
  const startOrResetVoiceSession = useCallback(
    (clearFields: boolean = true) => {
      setVoiceError(null);
      setVoicePanelOpen(true);

      // 1. Tắt ngay mọi giọng đọc TTS đang phát để trả lại kênh âm thanh cho Micro
      stopVietnameseSpeech();
      setIsSpeakingBack(false);

      // 2. Xoá dữ liệu cũ trên form khi bắt đầu phiên đọc mới hoặc bấm "Đọc lại"
      if (clearFields) {
        setSys('');
        setDia('');
        setPulse('');
        setNote('');
        setVoiceTranscript('');
        setParsedPreview(null);
        latestParsedRef.current = null;
      }
      hasSpokenConfirmationRef.current = false;

      if (typeof window === 'undefined') return;
      const w = window as unknown as Record<string, unknown>;
      const SpeechRecognitionCtor = (w.SpeechRecognition || w.webkitSpeechRecognition) as
        | (new () => BrowserSpeechRecognitionInstance)
        | undefined;

      if (!SpeechRecognitionCtor) {
        setSpeechSupported(false);
        setIsListening(false);
        setVoiceError(
          'Trình duyệt này không hỗ trợ thu âm trực tiếp. Hãy bấm vào ô bên dưới rồi bấm biểu tượng Micro 🎙️ trên bàn phím điện thoại để đọc.'
        );
        setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
        return;
      }

      // 3. Ghi nhận xem có phiên Micro cũ đang mở hay không, sau đó dọn sạch hoàn toàn phiên cũ
      const hadActiveRecognition = Boolean(recognitionRef.current || isListening);
      const currentSessionId = ++sessionCounterRef.current;
      cleanupRecognitionInstance();

      const launchRecognitionAttempt = (attempt: number) => {
        if (sessionCounterRef.current !== currentSessionId) return;

        try {
          const recognition = new SpeechRecognitionCtor();
          recognition.lang = 'vi-VN';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          const startedAt = Date.now();
          let gotAnySpeechResult = false;

          const resetWatchdog = (ms: number) => {
            if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
            watchdogTimerRef.current = setTimeout(() => {
              if (sessionCounterRef.current !== currentSessionId) return;
              finalizeVoiceSession(true);
            }, ms);
          };

          // Watchdog 9 giây: đảm bảo nếu trình duyệt tự ngắt ngầm mà không gọi onend thì UI vẫn tự mở khóa
          resetWatchdog(9000);

          recognition.onstart = () => {
            if (sessionCounterRef.current !== currentSessionId) return;
            setIsListening(true);
            setVoiceError(null);
          };

          recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
            if (sessionCounterRef.current !== currentSessionId) return;
            gotAnySpeechResult = true;

            // Gom kết quả từ event.results và khử lỗi lặp đoạn cộng dồn (cumulative duplicate) trên Android Chrome
            const segments: string[] = [];
            for (let i = 0; i < event.results.length; i++) {
              const seg = (event.results[i]?.[0]?.transcript || '').trim();
              if (!seg) continue;
              if (segments.length === 0) {
                segments.push(seg);
                continue;
              }
              const prev = segments[segments.length - 1];
              const prevLower = prev.toLowerCase();
              const segLower = seg.toLowerCase();

              if (segLower.startsWith(prevLower)) {
                segments[segments.length - 1] = seg;
              } else if (prevLower.startsWith(segLower) || prevLower.endsWith(segLower)) {
                continue;
              } else {
                segments.push(seg);
              }
            }

            const cleanText = segments.join(' ').replace(/\s+/g, ' ').trim();
            if (!cleanText) return;

            const parsed = applyTranscriptToForm(cleanText);

            // Tự động dừng thông minh sau khi người dùng đọc xong:
            // - Đã đủ 3 số (SYS + DIA + Mạch) hoặc có lệnh "lưu luôn": dừng sau 1.1 giây ngừng nói
            // - Đã đủ 2 số (SYS + DIA): dừng sau 1.8 giây ngừng nói
            // - Mới đọc 1 số: giữ Micro mở 3.5 giây để chờ đọc nốt số thứ 2
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            const waitMs =
              parsed.autoSave || (parsed.isComplete && parsed.pulse !== undefined)
                ? 1100
                : parsed.isComplete
                  ? 1800
                  : 3500;

            resetWatchdog(waitMs + 2500);

            silenceTimerRef.current = setTimeout(() => {
              if (sessionCounterRef.current !== currentSessionId) return;
              try {
                recognition.stop();
              } catch {
                // ignore
              }
              // Dự phòng 350ms: nếu trình duyệt di động treo lệnh .stop() không bắn onend, chủ động kết thúc ngay
              if (stopFallbackTimerRef.current) clearTimeout(stopFallbackTimerRef.current);
              stopFallbackTimerRef.current = setTimeout(() => {
                if (sessionCounterRef.current === currentSessionId) {
                  finalizeVoiceSession(true);
                }
              }, 350);
            }, waitMs);
          };

          recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
            if (sessionCounterRef.current !== currentSessionId) return;

            const elapsed = Date.now() - startedAt;
            // Nếu vừa bấm "Đọc lại" khi phiên cũ vừa đóng khiến phần cứng Micro chưa kịp nhả (lỗi aborted/audio-capture trong 600ms đầu),
            // tự động thử khởi động lại lần 2 sau 220ms
            if (
              attempt < 2 &&
              !gotAnySpeechResult &&
              elapsed < 600 &&
              (event.error === 'aborted' ||
                event.error === 'audio-capture' ||
                event.error === 'network')
            ) {
              cleanupRecognitionInstance();
              retryTimerRef.current = setTimeout(() => {
                launchRecognitionAttempt(attempt + 1);
              }, 220);
              return;
            }

            cleanupRecognitionInstance();
            setIsListening(false);

            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              setVoiceError(
                'Chưa cấp quyền Micro cho trình duyệt. Bạn có thể cấp quyền Micro hoặc bấm biểu tượng 🎙️ trên bàn phím điện thoại vào ô bên dưới.'
              );
              setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
            } else if (event.error === 'no-speech') {
              setVoiceError(
                'Chưa nghe thấy giọng nói. Hãy bấm nút "Đọc lại" và đọc 3 số to rõ hơn nhé.'
              );
            } else if (event.error !== 'aborted') {
              setVoiceError(
                'Micro bị ngắt tạm thời. Hãy bấm lại nút "Bấm đọc lại bằng giọng nói" nhé.'
              );
            }
          };

          recognition.onend = () => {
            if (sessionCounterRef.current !== currentSessionId) return;

            const elapsed = Date.now() - startedAt;
            // Nếu phiên mới bị trình duyệt đóng ngay lập tức (< 350ms) do xung đột đóng phiên cũ khi bấm "Đọc lại", tự thử lại 1 lần
            if (attempt < 2 && hadActiveRecognition && !gotAnySpeechResult && elapsed < 350) {
              cleanupRecognitionInstance();
              retryTimerRef.current = setTimeout(() => {
                launchRecognitionAttempt(attempt + 1);
              }, 220);
              return;
            }

            finalizeVoiceSession(true);
          };

          recognitionRef.current = recognition;
          setIsListening(true);
          recognition.start();
        } catch {
          if (attempt < 2) {
            cleanupRecognitionInstance();
            retryTimerRef.current = setTimeout(() => {
              launchRecognitionAttempt(attempt + 1);
            }, 220);
            return;
          }
          cleanupRecognitionInstance();
          setIsListening(false);
          setVoiceError(
            'Không khởi động được Micro. Hãy bấm lại hoặc dùng nút 🎙️ trên bàn phím ở ô bên dưới.'
          );
          setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
        }
      };

      launchRecognitionAttempt(1);
    },
    [isListening, cleanupRecognitionInstance, applyTranscriptToForm, finalizeVoiceSession]
  );

  // --- Dừng thu âm chủ động (khi người dùng bấm nút "Xong / Dừng") ---
  const stopVoiceSession = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const currentSessionId = sessionCounterRef.current;
    const inst = recognitionRef.current;
    if (inst) {
      try {
        inst.stop();
      } catch {
        finalizeVoiceSession(true);
        return;
      }
      // Nếu sau 300ms trình duyệt không gọi onend thì cưỡng bức kết thúc để không bao giờ bị kẹt nút
      if (stopFallbackTimerRef.current) clearTimeout(stopFallbackTimerRef.current);
      stopFallbackTimerRef.current = setTimeout(() => {
        if (sessionCounterRef.current === currentSessionId) {
          finalizeVoiceSession(true);
        }
      }, 300);
    } else {
      finalizeVoiceSession(true);
    }
  }, [finalizeVoiceSession]);

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
      case 'critical': return 'border-rose-200 bg-rose-50/70 text-rose-900';
      case 'warning': return 'border-amber-200 bg-amber-50/70 text-amber-900';
      default: return 'border-slate-200 bg-slate-50/90 text-slate-800';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs p-3.5 sm:p-5 space-y-3.5">
      {/* ===== HEADER & CHỌN NGƯỜI ĐO ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                Nhập số đo
              </h3>
              {mountedClient && (
                <span className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
                  📅 {formatVietnamDateFull(todayStrProp || getVietnamDateStr())}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium truncate">
              Nhập 3 số từ màn hình máy đo hoặc đọc bằng giọng nói
            </p>
          </div>
        </div>

        {/* Chọn người đo gọn gàng */}
        <div className="flex items-center justify-between sm:justify-end gap-2 bg-slate-50 sm:bg-transparent px-2.5 py-1.5 sm:p-0 rounded-xl border border-slate-200/80 sm:border-0">
          <span className="text-xs text-slate-600 font-bold shrink-0">Người đo:</span>
          <div className="relative flex-1 sm:flex-initial min-w-0">
            <select
              value={recorder}
              onChange={(e) => {
                setRecorder(e.target.value);
                setHasUserSelectedRecorder(true);
              }}
              aria-label="Chọn người đo huyết áp"
              className="w-full sm:w-auto max-w-full pl-2.5 pr-7 py-1.5 rounded-lg bg-white sm:bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 appearance-none cursor-pointer focus:outline-none focus:border-teal-600 min-h-[36px] truncate"
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
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ===== THANH ĐỐI CHIẾU LẦN ĐO GẦN NHẤT + NÚT SỬA LẠI NẾU NHẬP NHẦM ===== */}
      {lastEntry && lastEntryEval && (
        <div
          className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 flex-wrap ${getLastEntryBorderColor(lastEntryEval.overallAlertLevel)}`}
        >
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-semibold text-slate-500">
              Lần đo trước ({formatLastEntryTime(lastEntry, todayStrProp)}):
            </span>
            <span className="text-base sm:text-lg font-extrabold text-slate-900">
              {lastEntry.sys}/{lastEntry.dia}
              <span className="text-xs font-semibold text-slate-500 ml-0.5">mmHg</span>
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${lastEntryEval.bp.badgeClass}`}
            >
              {lastEntryEval.bp.shortLabel}
            </span>
            {lastEntry.pulse && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md border ${lastEntryEval.pulse.badgeClass}`}
              >
                Mạch {lastEntry.pulse}
                {lastEntryEval.pulse.alertLevel !== 'normal'
                  ? ` • ${lastEntryEval.pulse.shortLabel}`
                  : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {hasBothValues && !editingEntry && (
              <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs font-bold text-slate-600">
                <span className="inline-flex items-center gap-0.5" title="Xu hướng số trên">
                  SYS {renderTrendIcon(computeTrend(sysNum, lastEntry.sys))}
                </span>
                <span className="inline-flex items-center gap-0.5" title="Xu hướng số dưới">
                  DIA {renderTrendIcon(computeTrend(diaNum, lastEntry.dia))}
                </span>
              </div>
            )}

            {editingEntry?.id === lastEntry.id ? (
              <button
                type="button"
                onClick={resetForm}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>Huỷ sửa</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartEditLastEntry}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                title="Sửa lại chỉ số của lần đo này nếu vừa nhập nhầm"
              >
                <Edit3 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Sửa lại</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===== THÔNG BÁO ĐANG Ở CHẾ ĐỘ SỬA LẠI LẦN ĐO ===== */}
      {editingEntry && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-2 min-w-0">
            <Edit3 className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="truncate">
              Đang sửa lại lần đo lúc <u>{editingEntry.time}</u> ({editingEntry.sys}/{editingEntry.dia} mmHg)
            </span>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 text-xs font-bold shrink-0 cursor-pointer"
          >
            Huỷ
          </button>
        </div>
      )}

      {/* ===== THANH NHẬP BẰNG GIỌNG NÓI (GỌN, ĐỒNG NHẤT TÔNG MÀU TEAL) ===== */}
      <div
        className={`rounded-xl border transition-all p-2.5 sm:p-3 ${
          isListening
            ? 'border-rose-500 bg-rose-50/80 shadow-xs'
            : voicePanelOpen
              ? 'border-teal-300 bg-teal-50/40'
              : 'border-teal-200/80 bg-teal-50/40'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {!isListening ? (
            <button
              type="button"
              onClick={() => startOrResetVoiceSession(true)}
              className="flex-1 min-h-[46px] px-3.5 py-2 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98] bg-teal-700 hover:bg-teal-800 text-white text-center"
            >
              {voiceTranscript ? (
                <>
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>🎙️ Bấm đọc lại bằng giọng nói</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span>🎙️ Bấm đọc huyết áp bằng giọng nói</span>
                </>
              )}
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:flex flex-1 gap-2">
              <button
                type="button"
                onClick={() => startOrResetVoiceSession(true)}
                className="sm:flex-1 min-h-[46px] px-3 py-2 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-amber-500 hover:bg-amber-600 text-slate-950 text-center"
                title="Xoá câu vừa đọc nhầm và đọc lại ngay lập tức"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Đọc lại</span>
              </button>

              <button
                type="button"
                onClick={stopVoiceSession}
                className="sm:px-5 min-h-[46px] py-2 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-center"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>Xong</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setVoicePanelOpen((prev) => !prev);
              if (!voicePanelOpen) {
                setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
              }
            }}
            className="px-3 min-h-[40px] sm:min-h-[46px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title="Mở ô nhập/đọc 1 dòng nhanh"
          >
            <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{voicePanelOpen ? 'Ẩn ô gõ nhanh' : 'Gõ nhanh 1 dòng'}</span>
          </button>
        </div>

        {!voicePanelOpen && !isListening && (
          <p className="text-xs text-slate-600 font-medium mt-1.5 text-center">
            💡 Đọc tự nhiên: <strong className="text-teal-900">&ldquo;135 85 mạch 78&rdquo;</strong> hoặc nhập trực tiếp vào 3 ô bên dưới
          </p>
        )}

        {/* Khung chi tiết khi đang nghe hoặc mở bảng Giọng nói */}
        {(voicePanelOpen || isListening || voiceTranscript) && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                {isListening ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping inline-block" />
                    <span className="text-rose-700">
                      Đang nghe... Hãy đọc 3 số trên màn hình máy đo
                    </span>
                  </>
                ) : isSpeakingBack ? (
                  <>
                    <Volume2 className="w-4 h-4 text-teal-700 animate-bounce" />
                    <span className="text-teal-800">Đang đọc xác nhận lại chỉ số...</span>
                  </>
                ) : (
                  <span>🗣️ Câu vừa đọc / Gõ nhanh 1 dòng:</span>
                )}
              </span>

              <div className="flex items-center gap-1.5 flex-wrap">
                {parsedPreview?.isComplete && (
                  <button
                    type="button"
                    onClick={() => {
                      speakVietnameseConfirmation(
                        `Huyết áp ${parsedPreview.sys} trên ${parsedPreview.dia}${parsedPreview.pulse ? `, mạch ${parsedPreview.pulse}` : ''}`,
                        true,
                        10,
                        setIsSpeakingBack
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1 cursor-pointer min-h-[34px]"
                  >
                    <Volume2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Nghe lại</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !ttsEnabled;
                    setTtsEnabled(nextVal);
                    if (!nextVal) {
                      stopVietnameseSpeech();
                      setIsSpeakingBack(false);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border cursor-pointer min-h-[34px] ${
                    ttsEnabled
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 shrink-0" /> : <VolumeX className="w-3.5 h-3.5 shrink-0" />}
                  <span>{ttsEnabled ? 'Tự đọc: BẬT' : 'Tắt tiếng'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopVoiceSession();
                    stopVietnameseSpeech();
                    setVoicePanelOpen(false);
                    setVoiceError(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 bg-white border border-slate-200 cursor-pointer"
                  title="Thu gọn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                ref={quickVoiceInputRef}
                type="text"
                value={voiceTranscript}
                onChange={(e) => {
                  hasSpokenConfirmationRef.current = false;
                  applyTranscriptToForm(e.target.value);
                }}
                placeholder='VD: "135 85 mạch 78 sau tập đứng"'
                className="w-full px-3.5 py-2.5 pr-9 rounded-xl bg-white border border-slate-300 focus:border-teal-600 focus:outline-none text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
              />
              {voiceTranscript && (
                <button
                  type="button"
                  onClick={() => {
                    setVoiceTranscript('');
                    setParsedPreview(null);
                    latestParsedRef.current = null;
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {voiceError && (
              <p className="text-xs sm:text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                ⚠️ {voiceError}
              </p>
            )}

            {parsedPreview && (parsedPreview.sys || parsedPreview.dia || parsedPreview.pulse || parsedPreview.note) && (
              <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 px-3 py-2 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-bold">
                <span className="text-emerald-800">✅ Đã điền:</span>
                {parsedPreview.sys && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-800">
                    Số trên: {parsedPreview.sys}
                  </span>
                )}
                {parsedPreview.dia && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-800">
                    Số dưới: {parsedPreview.dia}
                  </span>
                )}
                {parsedPreview.pulse && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-800">
                    Mạch: {parsedPreview.pulse}
                  </span>
                )}
                {parsedPreview.note && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-700">
                    📝 {parsedPreview.note}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Mẫu thử nhanh:</span>
              {[
                '135 85 mạch 78',
                '140 trên 85 mạch 80 buổi chiều',
              ].map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    const parsed = applyTranscriptToForm(sample);
                    triggerConfirmationFeedback(parsed, true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                >
                  &ldquo;{sample}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== BẢNG 3 CHỈ SỐ TRÊN MÁY ĐO: SỐ TRÊN (SYS) — SỐ DƯỚI (DIA) — MẠCH (PULSE) ===== */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50/90 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/90">
        {/* 1. SYS — Số trên */}
        <div className="flex flex-col justify-between">
          <label className="block text-center mb-1.5 leading-tight">
            <span className="block text-xs sm:text-sm font-extrabold text-slate-800">1. SỐ TRÊN</span>
            <span className="block text-[10px] sm:text-xs font-medium text-slate-500">Tâm thu (SYS)</span>
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
            className="w-full text-2xl sm:text-3xl font-extrabold text-center text-slate-900 bg-white border-2 border-slate-300 rounded-xl py-2.5 sm:py-3 px-1 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 placeholder:text-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* 2. DIA — Số dưới */}
        <div className="flex flex-col justify-between">
          <label className="block text-center mb-1.5 leading-tight">
            <span className="block text-xs sm:text-sm font-extrabold text-slate-800">2. SỐ DƯỚI</span>
            <span className="block text-[10px] sm:text-xs font-medium text-slate-500">Tâm trương (DIA)</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            placeholder="85"
            min={20}
            max={200}
            className="w-full text-2xl sm:text-3xl font-extrabold text-center text-slate-900 bg-white border-2 border-slate-300 rounded-xl py-2.5 sm:py-3 px-1 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 placeholder:text-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* 3. PULSE — Nhịp tim / Mạch */}
        <div className="flex flex-col justify-between">
          <label className="block text-center mb-1.5 leading-tight">
            <span className="block text-xs sm:text-sm font-extrabold text-slate-800">3. NHỊP MẠCH</span>
            <span className="block text-[10px] sm:text-xs font-medium text-slate-500">Nhịp/phút (BPM)</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={pulse}
            onChange={(e) => setPulse(e.target.value)}
            placeholder="78"
            min={30}
            max={250}
            className="w-full text-2xl sm:text-3xl font-extrabold text-center text-slate-900 bg-white border-2 border-slate-300 rounded-xl py-2.5 sm:py-3 px-1 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 placeholder:text-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* ===== CHỌN BUỔI ĐO & GHI CHÚ TRÊN CÙNG 1 KHỐI KHOA HỌC ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-end">
        {/* Buổi đo (7 cột trên desktop) */}
        <div className="sm:col-span-7">
          <label className="block text-xs font-bold text-slate-600 mb-1">
            ⏰ Buổi đo:
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {PERIOD_OPTIONS.map((p) => {
              const cfg = TIME_SLOT_CONFIG[p];
              const isActive = mountedClient && period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`min-h-[42px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border px-1 flex items-center justify-center gap-1 ${
                    isActive
                      ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200/70'
                  }`}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ghi chú thêm (5 cột trên desktop) */}
        <div className="sm:col-span-5">
          <label className="block text-xs font-bold text-slate-600 mb-1">
            📝 Ghi chú thêm <span className="font-normal text-slate-400">(tuỳ chọn)</span>:
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Sau tập đứng, hơi mệt..."
            className="w-full min-h-[42px] text-sm font-medium text-slate-900 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-teal-600 placeholder:text-slate-400 transition-colors"
          />
        </div>
      </div>

      {/* ===== NÚT LƯU HUYẾT ÁP ===== */}
      {showSuccess ? (
        <div className="min-h-[52px] px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-400 flex items-center justify-center gap-2 animate-in fade-in duration-300 text-center">
          <Check className="w-5 h-5 text-emerald-700 shrink-0" strokeWidth={3} />
          <span className="text-base font-extrabold text-emerald-900">Đã lưu chỉ số huyết áp thành công!</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasBothValues || isSaving}
          className={`w-full min-h-[54px] sm:min-h-[58px] px-4 py-2.5 rounded-xl text-base sm:text-lg font-extrabold text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] border text-center ${
            hasBothValues
              ? `${alertDisplay.btnBg} ${alertDisplay.btnHoverBg} border-black/20`
              : 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <Save className="w-6 h-6 animate-spin shrink-0" />
              <span>ĐANG LƯU...</span>
            </>
          ) : hasBothValues ? (
            <>
              <span className="shrink-0">{editingEntry ? '💾' : '💓'}</span>
              <span>
                {editingEntry
                  ? `CẬP NHẬT LẠI HUYẾT ÁP (${sysNum}/${diaNum})`
                  : `BẤM LƯU HUYẾT ÁP (${sysNum}/{diaNum})`}
              </span>
            </>
          ) : (
            <>
              <span className="shrink-0">💓</span>
              <span>NHẬP SỐ TRÊN & SỐ DƯỚI ĐỂ LƯU</span>
            </>
          )}
        </button>
      )}

      {/* ===== CẢNH BÁO / ĐÁNH GIÁ LÂM SÀNG TỨC THỜI KHI NHẬP (HUYẾT ÁP & MẠCH) ===== */}
      {hasBothValues && currentEvaluation && currentAlertLevel !== 'normal' && (
        <div
          className={`rounded-2xl border-2 p-3.5 sm:p-4 flex items-start gap-3 animate-in fade-in duration-300 ${alertDisplay.bannerBg} ${alertDisplay.bannerBorder}`}
        >
          <span className="text-2xl shrink-0 leading-none mt-0.5">{alertDisplay.bannerIcon}</span>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-sm sm:text-base font-black ${alertDisplay.bannerText}`}>
                {currentEvaluation.statusLabel}: {currentEvaluation.reasons.join(' • ')}
              </span>
            </div>
            <p className={`text-xs sm:text-sm font-semibold opacity-90 ${alertDisplay.bannerText}`}>
              💡 {currentEvaluation.clinicalAdvice}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
