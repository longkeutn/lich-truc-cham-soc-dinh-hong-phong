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
} from 'lucide-react';
import { VitalsLogEntry, VitalsPeriod, BpThresholds, AlertLevel, FamilyMember } from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_RECORDER,
  detectCurrentTimeSlot,
  computeAlertLevel,
} from '@/lib/config';
import { parseVoiceVitals, ParsedVoiceVitals } from '@/lib/voiceVitalsParser';

// ===== PROPS =====
interface QuickVitalsFormProps {
  onSave: (entry: VitalsLogEntry) => Promise<void>;
  lastEntry?: VitalsLogEntry | null;
  bpThresholds?: BpThresholds;
  defaultRecorder?: string;
  members?: FamilyMember[];
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
  if (typeof window !== 'undefined') {
    try {
      if (sharedTtsAudio) {
        sharedTtsAudio.pause();
        sharedTtsAudio.currentTime = 0;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Phát giọng đọc tiếng Việt xác nhận kết quả trên điện thoại:
 * - Ưu tiên 1: Phát luồng âm thanh tiếng Việt chuẩn qua `/api/tts` bằng HTMLAudioElement
 *   (Hoạt động 100% trên mọi iPhone, Samsung, Xiaomi, Oppo kể cả khi máy không cài gói giọng đọc tiếng Việt!)
 * - Ưu tiên 2 (Dự phòng khi mất mạng): Dùng `window.speechSynthesis` nội bộ.
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
    const audio = getOrCreateTtsAudioElement();
    const ttsUrl = `/api/tts?text=${encodeURIComponent(text)}`;

    const fallbackToBrowserSpeech = () => {
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'vi-VN';
          utterance.rate = 1.0;
          utterance.onstart = () => onSpeakingChange?.(true);
          utterance.onend = () => onSpeakingChange?.(false);
          utterance.onerror = () => onSpeakingChange?.(false);
          window.speechSynthesis.speak(utterance);
        } else {
          onSpeakingChange?.(false);
        }
      } catch {
        onSpeakingChange?.(false);
      }
    };

    if (audio) {
      try {
        audio.volume = 1.0;
        audio.src = ttsUrl;
        audio.onplay = () => onSpeakingChange?.(true);
        audio.onended = () => onSpeakingChange?.(false);
        audio.onerror = () => {
          onSpeakingChange?.(false);
          fallbackToBrowserSpeech();
        };
        const p = audio.play();
        if (p !== undefined) {
          p.catch(() => {
            fallbackToBrowserSpeech();
          });
        }
      } catch {
        fallbackToBrowserSpeech();
      }
    } else {
      fallbackToBrowserSpeech();
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
  // Lưu vị trí bắt đầu đọc kết quả trong phiên thu âm liên tục để khi bấm "Đọc lại" không cần đóng/mở lại phần cứng Micro!
  const resultOffsetRef = useRef<number>(0);
  const totalResultsCountRef = useRef<number>(0);
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

  // Hàm dọn dẹp triệt để phiên thu âm cũ
  const cleanupRecognitionInstance = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const inst = recognitionRef.current;
    if (inst) {
      inst.onstart = null;
      inst.onresult = null;
      inst.onerror = null;
      inst.onend = null;
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
    setVoiceTranscript('');
    setParsedPreview(null);
    latestParsedRef.current = null;
    hasSpokenConfirmationRef.current = false;
    setPeriod(detectCurrentTimeSlot());
  }, []);

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
      const finalAlert = computeAlertLevel(finalSys, finalDia, thresholds);

      setIsSaving(true);
      try {
        const now = new Date();
        const entry: VitalsLogEntry = {
          id: `vl-${Date.now()}`,
          date: now.toISOString().slice(0, 10),
          time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          period: finalPeriod,
          sys: finalSys,
          dia: finalDia,
          pulse: finalPulse,
          note: finalNote,
          alertLevel: finalAlert,
          recordedBy: recorder,
          createdAt: now.toISOString(),
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
    [sysNum, diaNum, pulse, note, period, thresholds, recorder, isSaving, resetForm, onSave]
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

    if (parsed.sys !== undefined) setSys(String(parsed.sys));
    if (parsed.dia !== undefined) setDia(String(parsed.dia));
    if (parsed.pulse !== undefined) setPulse(String(parsed.pulse));
    if (parsed.period !== undefined) setPeriod(parsed.period);
    if (parsed.note !== undefined) setNote(parsed.note);

    return parsed;
  }, []);

  // --- Khởi chạy hoặc Đặt lại phiên thu âm (Nhạy 100% ngay ở lần bấm đầu tiên trên điện thoại) ---
  const startOrResetVoiceSession = useCallback(
    (clearFields: boolean = true) => {
      setVoiceError(null);
      setVoicePanelOpen(true);

      // 1. Tắt ngay mọi giọng đọc TTS đang phát để trả lại kênh âm thanh cho Micro
      stopVietnameseSpeech();
      setIsSpeakingBack(false);

      // 2. Xoá dữ liệu cũ trên form nếu người dùng bấm "Đọc lại"
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

      // 3. KỸ THUẬT QUAN TRỌNG TRÊN ĐIỆN THOẠI:
      // Nếu Micro ĐANG MỞ (isListening === true), TUYỆT ĐỐI KHÔNG đóng rồi mở lại phần cứng Micro
      // (vì Android/iOS cần 400ms mới nhả phần cứng Micro, đóng/mở liền sẽ làm kẹt Micro!).
      // Thay vào đó, ta chỉ cần dịch mốc resultOffsetRef sang vị trí mới và giữ nguyên Micro đang mở!
      if (isListening && recognitionRef.current) {
        resultOffsetRef.current = totalResultsCountRef.current;
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        return;
      }

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

      // Dọn sạch biến tham chiếu cũ (nếu có) và gọi recognition.start() ĐỒNG BỘ (synchronously) ngay trong cú chạm!
      cleanupRecognitionInstance();
      resultOffsetRef.current = 0;
      totalResultsCountRef.current = 0;

      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = 'vi-VN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
          totalResultsCountRef.current = event.results.length;
          let fullTranscript = '';
          const startIdx = Math.min(resultOffsetRef.current, event.results.length);
          for (let i = startIdx; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + ' ';
          }
          const cleanText = fullTranscript.trim();
          if (!cleanText) return;

          const parsed = applyTranscriptToForm(cleanText);

          // Tự động dừng thông minh sau khi người dùng đọc xong:
          // - Đã đủ 3 số (SYS + DIA + Mạch) hoặc có lệnh "lưu luôn": dừng sau 1.2 giây ngừng nói
          // - Đã đủ 2 số (SYS + DIA): dừng sau 2.0 giây ngừng nói
          // - Mới đọc 1 số: giữ Micro mở 4.0 giây để chờ đọc nốt số thứ 2
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          const waitMs =
            parsed.autoSave || (parsed.isComplete && parsed.pulse !== undefined)
              ? 1200
              : parsed.isComplete
                ? 2000
                : 4000;

          silenceTimerRef.current = setTimeout(() => {
            if (recognitionRef.current === recognition) {
              try {
                recognition.stop();
              } catch {
                // ignore
              }
            }
          }, waitMs);
        };

        recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          setIsListening(false);
          if (recognitionRef.current === recognition) {
            recognitionRef.current = null;
          }
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setVoiceError(
              'Chưa cấp quyền Micro cho trình duyệt. Bạn có thể cấp quyền Micro hoặc bấm biểu tượng 🎙️ trên bàn phím điện thoại vào ô bên dưới.'
            );
            setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
          } else if (event.error === 'no-speech') {
            setVoiceError('Chưa nghe thấy giọng nói. Hãy bấm nút "Đọc lại" và đọc to rõ hơn nhé.');
          } else if (event.error !== 'aborted') {
            setVoiceError('Micro bị ngắt. Hãy bấm lại nút "Đọc Huyết Áp" hoặc dùng nút 🎙️ trên bàn phím.');
          }
        };

        recognition.onend = () => {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          setIsListening(false);
          if (recognitionRef.current === recognition) {
            recognitionRef.current = null;
          }

          // Khi Micro trên điện thoại đã đóng hoàn toàn, tự động phát giọng đọc tiếng Việt xác nhận!
          if (!hasSpokenConfirmationRef.current && latestParsedRef.current?.isComplete) {
            hasSpokenConfirmationRef.current = true;
            triggerConfirmationFeedback(latestParsedRef.current, false);
          }
        };

        recognitionRef.current = recognition;
        setIsListening(true);
        recognition.start();
      } catch {
        setIsListening(false);
        setVoiceError('Không khởi động được Micro. Hãy bấm lại hoặc dùng nút 🎙️ trên bàn phím ở ô bên dưới.');
        setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
      }
    },
    [isListening, cleanupRecognitionInstance, applyTranscriptToForm, triggerConfirmationFeedback]
  );

  // --- Dừng thu âm chủ động (khi người dùng bấm nút "Xong / Dừng") ---
  const stopVoiceSession = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    const inst = recognitionRef.current;
    if (inst) {
      try {
        inst.stop();
      } catch {
        cleanupRecognitionInstance();
        setIsListening(false);
      }
    } else {
      setIsListening(false);
    }
  }, [cleanupRecognitionInstance]);

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
    <div className="rounded-3xl border-2 border-slate-300 bg-white shadow-md p-4 sm:p-6 space-y-4">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-700 flex items-center justify-center shrink-0 shadow-xs">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-950 tracking-tight">
              Đo & Ghi Huyết Áp Hôm Nay
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 font-bold">
              Người đo mặc định: <span className="text-rose-800">{defaultRecorder || 'Mẹ Phương'}</span>
            </p>
          </div>
        </div>

        {/* Nút đổi người đo rõ ràng khi con cái đo hộ Mẹ */}
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-slate-800 font-black">Người đo:</span>
          <div className="relative">
            <select
              value={recorder}
              onChange={(e) => {
                setRecorder(e.target.value);
                setHasUserSelectedRecorder(true);
              }}
              aria-label="Chọn người đo huyết áp"
              className="pl-3 pr-8 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-sm font-black text-slate-950 appearance-none cursor-pointer focus:outline-none focus:border-rose-600 min-h-[44px]"
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
            <ChevronDown className="w-4 h-4 text-slate-800 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ===== THANH GHI HUYẾT ÁP BẰNG GIỌNG NÓI (TO, RÕ, DỄ BẤM CHO NGƯỜI LỚN TUỔI) ===== */}
      <div
        className={`rounded-2xl border-2 transition-all p-3.5 sm:p-4 ${
          isListening
            ? 'border-rose-600 bg-rose-50 shadow-md'
            : voicePanelOpen
              ? 'border-indigo-400 bg-indigo-50/70'
              : 'border-rose-300 bg-rose-50/60'
        }`}
      >
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          {!isListening ? (
            <button
              type="button"
              onClick={() => startOrResetVoiceSession(true)}
              className="flex-1 min-h-[56px] px-4 py-3 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-[0.98] bg-rose-700 hover:bg-rose-800 text-white border-2 border-rose-900"
            >
              {voiceTranscript ? (
                <>
                  <RotateCcw className="w-6 h-6 shrink-0" />
                  <span>🎙️ BẤM ĐỂ ĐỌC LẠI TỪ ĐẦU</span>
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6 shrink-0" />
                  <span>🎙️ BẤM ĐỌC HUYẾT ÁP BẰNG GIỌNG NÓI</span>
                </>
              )}
            </button>
          ) : (
            <>
              {/* Khi đang thu âm: Tách rõ 2 nút to "Đọc lại từ đầu" và "Xong" */}
              <button
                type="button"
                onClick={() => startOrResetVoiceSession(true)}
                className="flex-1 min-h-[56px] px-4 py-3 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.98] bg-amber-500 hover:bg-amber-600 text-slate-950 border-2 border-amber-700"
                title="Xoá câu vừa đọc nhầm và đọc lại ngay lập tức (không cần tắt Micro)"
              >
                <RotateCcw className="w-6 h-6 shrink-0" />
                <span>ĐỌC LẠI TỪ ĐẦU</span>
              </button>

              <button
                type="button"
                onClick={stopVoiceSession}
                className="px-5 min-h-[56px] py-3 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.98] bg-emerald-700 hover:bg-emerald-800 text-white border-2 border-emerald-900 shrink-0"
              >
                <Check className="w-6 h-6 shrink-0" />
                <span>XONG</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setVoicePanelOpen((prev) => !prev);
              if (!voicePanelOpen) {
                setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
              }
            }}
            className="px-3.5 min-h-[56px] rounded-2xl bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-300 text-sm font-black flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Mở ô nhập/đọc 1 dòng nhanh"
          >
            <Sparkles className="w-5 h-5 text-indigo-700" />
            <span className="hidden sm:inline">Gõ 1 dòng</span>
            <span className="sm:hidden">Mở ô</span>
          </button>
        </div>

        {/* Gợi ý chữ to, đậm, dễ đọc ngay bên dưới nút */}
        {!voicePanelOpen && !isListening && (
          <p className="text-xs sm:text-sm text-slate-800 font-bold mt-2.5 text-center">
            💡 Chỉ cần đọc tự nhiên: <strong className="text-rose-800">&ldquo;135 85 mạch 78&rdquo;</strong> hoặc{' '}
            <strong className="text-rose-800">&ldquo;Trăm ba lăm trên tám lăm&rdquo;</strong>
          </p>
        )}

        {/* Khung chi tiết khi đang nghe hoặc mở bảng Giọng nói */}
        {(voicePanelOpen || isListening || voiceTranscript) && (
          <div className="mt-3.5 pt-3.5 border-t-2 border-slate-300 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                {isListening ? (
                  <>
                    <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping inline-block" />
                    <span className="text-rose-800">
                      ĐANG NGHE... Hãy đọc các số trên màn hình máy đo huyết áp
                    </span>
                  </>
                ) : isSpeakingBack ? (
                  <>
                    <Volume2 className="w-5 h-5 text-indigo-700 animate-bounce" />
                    <span className="text-indigo-800">Đang đọc to lại chỉ số huyết áp...</span>
                  </>
                ) : (
                  <span>🗣️ Câu vừa đọc / Gõ nhanh 1 dòng:</span>
                )}
              </span>

              <div className="flex items-center gap-2">
                {/* Nút bấm nghe đọc lại trực tiếp */}
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
                    className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black bg-indigo-700 hover:bg-indigo-800 text-white flex items-center gap-1.5 cursor-pointer shadow-xs min-h-[40px]"
                    title="Nghe điện thoại đọc lại chỉ số vừa nhận"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>🔊 Nghe đọc lại</span>
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
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 border-2 cursor-pointer min-h-[40px] ${
                    ttsEnabled
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                      : 'bg-slate-200 text-slate-800 border-slate-400'
                  }`}
                  title="Bật/tắt tự động đọc xác nhận lại chỉ số"
                >
                  {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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
                  className="p-2 rounded-xl text-slate-700 hover:text-slate-950 bg-white border border-slate-300 cursor-pointer"
                  title="Thu gọn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Ô text nhận giọng nói hoặc gõ nhanh 1 dòng */}
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
                className="w-full px-4 py-3 pr-10 rounded-xl bg-white border-2 border-slate-400 focus:border-rose-600 focus:outline-none text-base font-black text-slate-950 placeholder:text-slate-500 placeholder:font-medium"
              />
              {voiceTranscript && (
                <button
                  type="button"
                  onClick={() => {
                    setVoiceTranscript('');
                    setParsedPreview(null);
                    latestParsedRef.current = null;
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-950 p-1 cursor-pointer"
                  title="Xoá câu vừa đọc"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Thông báo lỗi Micro nếu có */}
            {voiceError && (
              <p className="text-sm font-black text-amber-950 bg-amber-100 border-2 border-amber-400 rounded-xl px-3.5 py-2.5">
                ⚠️ {voiceError}
              </p>
            )}

            {/* Kết quả bóc tách tự động theo thời gian thực */}
            {parsedPreview && (parsedPreview.sys || parsedPreview.dia || parsedPreview.pulse || parsedPreview.note) && (
              <div className="rounded-xl bg-emerald-50 border-2 border-emerald-400 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm font-black">
                  <span className="text-emerald-900">✅ Đã điền vào ô:</span>
                  {parsedPreview.sys && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-700 text-white">
                      Số trên: {parsedPreview.sys}
                    </span>
                  )}
                  {parsedPreview.dia && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-700 text-white">
                      Số dưới: {parsedPreview.dia}
                    </span>
                  )}
                  {parsedPreview.pulse && (
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-700 text-white">
                      Mạch: {parsedPreview.pulse}
                    </span>
                  )}
                  {parsedPreview.note && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-white">
                      📝 {parsedPreview.note}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Các câu mẫu bấm thử 1 chạm */}
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                📌 Bấm thử câu mẫu (hoặc nói thêm chữ <span className="text-rose-700 font-black">&ldquo;lưu luôn&rdquo;</span> ở cuối để tự động lưu):
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  '135 85 mạch 78',
                  'Trăm ba lăm tám lăm nhịp tim bảy tư sau tập đứng',
                  '140 trên 85 mạch 80 buổi chiều',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      const parsed = applyTranscriptToForm(sample);
                      triggerConfirmationFeedback(parsed, true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border-2 border-slate-300 text-xs sm:text-sm font-bold text-slate-900 cursor-pointer transition-colors"
                  >
                    &ldquo;{sample}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== LẦN ĐO GẦN NHẤT (CHỮ TO RÕ ĐỂ MẸ ĐỐI CHIẾU) ===== */}
      {lastEntry && (
        <div
          className={`rounded-2xl border-2 p-3.5 flex items-center justify-between gap-3 ${getLastEntryBorderColor(lastEntry.alertLevel)}`}
        >
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-black text-slate-700 mb-0.5">
              📊 Lần đo trước ({formatLastEntryTime(lastEntry)}):
            </p>
            <p className="text-xl sm:text-2xl font-black text-slate-950">
              {lastEntry.sys}/{lastEntry.dia}
              <span className="text-sm font-bold text-slate-700 ml-1">mmHg</span>
              {lastEntry.pulse && (
                <span className="text-base font-black text-indigo-800 ml-3">
                  💓 Mạch {lastEntry.pulse}
                </span>
              )}
            </p>
          </div>

          {/* Trend arrows — only show when user has entered values */}
          {hasBothValues && (
            <div className="flex flex-col items-center gap-1 shrink-0 bg-white/80 px-2.5 py-1.5 rounded-xl border border-slate-300">
              <div className="flex items-center gap-1" title="Xu hướng số trên">
                <span className="text-xs font-black text-slate-700">Trên</span>
                {renderTrendIcon(computeTrend(sysNum, lastEntry.sys))}
              </div>
              <div className="flex items-center gap-1" title="Xu hướng số dưới">
                <span className="text-xs font-black text-slate-700">Dưới</span>
                {renderTrendIcon(computeTrend(diaNum, lastEntry.dia))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 2 Ô SỐ HUYẾT ÁP CHÍNH: SỐ TRÊN (SYS) & SỐ DƯỚI (DIA) ===== */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* SYS — Số trên */}
        <div className="bg-rose-50/50 p-3 rounded-2xl border-2 border-rose-200">
          <label className="block text-sm sm:text-base font-black text-slate-900 mb-1.5 text-center">
            1️⃣ SỐ TRÊN <span className="block text-xs font-bold text-slate-700">(Tâm thu - SYS)</span>
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
            className="w-full text-4xl font-black text-center text-slate-950 bg-white border-2 border-slate-400 rounded-2xl py-3.5 px-2 focus:outline-none focus:border-rose-700 focus:ring-2 focus:ring-rose-200 placeholder:text-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* DIA — Số dưới */}
        <div className="bg-indigo-50/50 p-3 rounded-2xl border-2 border-indigo-200">
          <label className="block text-sm sm:text-base font-black text-slate-900 mb-1.5 text-center">
            2️⃣ SỐ DƯỚI <span className="block text-xs font-bold text-slate-700">(Tâm trương - DIA)</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            placeholder="85"
            min={20}
            max={200}
            className="w-full text-4xl font-black text-center text-slate-950 bg-white border-2 border-slate-400 rounded-2xl py-3.5 px-2 focus:outline-none focus:border-indigo-700 focus:ring-2 focus:ring-indigo-200 placeholder:text-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* ===== NHỊP TIM (MẠCH) + GHI CHÚ ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Pulse */}
        <div>
          <label className="block text-sm font-black text-slate-900 mb-1">
            💓 Nhịp tim / Mạch <span className="text-slate-600 font-bold text-xs">(số thứ 3 trên máy)</span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={pulse}
            onChange={(e) => setPulse(e.target.value)}
            placeholder="VD: 78"
            min={30}
            max={250}
            className="w-full text-2xl font-black text-center text-slate-950 bg-white border-2 border-slate-400 rounded-xl py-2.5 px-3 focus:outline-none focus:border-indigo-700 placeholder:text-slate-300 transition-colors min-h-[50px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-black text-slate-900 mb-1">
            📝 Ghi chú thêm <span className="text-slate-600 font-bold text-xs">(nếu có)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Sau tập đứng, hơi mệt..."
            className="w-full text-base font-bold text-slate-950 bg-white border-2 border-slate-400 rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-700 placeholder:text-slate-400 transition-colors min-h-[50px]"
          />
        </div>
      </div>

      {/* ===== CHỌN BUỔI ĐO (NÚT TO, ĐẬM, RÕ RÀNG) ===== */}
      <div>
        <label className="block text-sm font-black text-slate-900 mb-2">
          ⏰ Buổi đo huyết áp:
        </label>
        <div className="grid grid-cols-4 gap-2">
          {PERIOD_OPTIONS.map((p) => {
            const cfg = TIME_SLOT_CONFIG[p];
            const isActive = period === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`min-h-[54px] rounded-xl text-sm sm:text-base font-black transition-all cursor-pointer border-2 ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-950 shadow-sm scale-[1.02]'
                    : 'bg-slate-100 text-slate-900 border-slate-300 hover:bg-slate-200'
                }`}
              >
                <span className="block text-lg leading-none mb-1">{cfg.emoji}</span>
                <span className="block text-xs sm:text-sm">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== NÚT LƯU HUYẾT ÁP CỰC LỚN CHO NGƯỜI LỚN TUỔI ===== */}
      {showSuccess ? (
        <div className="min-h-[64px] rounded-2xl bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center gap-2.5 animate-in fade-in duration-300">
          <Check className="w-7 h-7 text-emerald-800" strokeWidth={3} />
          <span className="text-xl font-black text-emerald-950">✅ ĐÃ LƯU HUYẾT ÁP THÀNH CÔNG!</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasBothValues || isSaving}
          className={`w-full min-h-[64px] rounded-2xl text-xl font-black text-white transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] border-2 ${
            hasBothValues
              ? `${alertDisplay.btnBg} ${alertDisplay.btnHoverBg} border-black/20`
              : 'bg-slate-300 text-slate-600 border-slate-400 cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <Save className="w-6 h-6 animate-spin" />
              <span>ĐANG LƯU...</span>
            </>
          ) : hasBothValues ? (
            <>
              <span>💓</span>
              <span>BẤM LƯU HUYẾT ÁP ({sysNum}/{diaNum})</span>
            </>
          ) : (
            <>
              <span>💓</span>
              <span>NHẬP SỐ TRÊN & SỐ DƯỚI ĐỂ LƯU</span>
            </>
          )}
        </button>
      )}

      {/* ===== CẢNH BÁO HUYẾT ÁP CAO/THẤP ===== */}
      {hasBothValues && currentAlertLevel !== 'normal' && (
        <div
          className={`rounded-2xl border-2 p-4 flex items-start gap-3 animate-in fade-in duration-300 ${alertDisplay.bannerBg} ${alertDisplay.bannerBorder}`}
        >
          <span className="text-2xl shrink-0 leading-none mt-0.5">{alertDisplay.bannerIcon}</span>
          <p className={`text-base sm:text-lg font-black ${alertDisplay.bannerText}`}>
            {alertDisplay.bannerMessage}
          </p>
        </div>
      )}
    </div>
  );
}
