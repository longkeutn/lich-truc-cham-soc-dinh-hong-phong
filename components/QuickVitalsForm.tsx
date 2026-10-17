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
  MicOff,
  Volume2,
  VolumeX,
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

/** Phát âm thanh đọc lại kết quả bằng bộ đọc tiếng Việt có sẵn trên thiết bị (0 tốn phí API) */
function speakVietnameseConfirmation(text: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Bỏ qua nếu thiết bị tắt âm thanh
  }
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
  const latestParsedRef = useRef<ParsedVoiceVitals | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Kiểm tra trình duyệt có hỗ trợ Web Speech API gốc hay không
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window as unknown as Record<string, unknown>;
      const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
      setSpeechSupported(Boolean(SpeechRecognitionCtor));
    }
  }, []);

  // Cleanup khi unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
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
    setVoiceTranscript('');
    setParsedPreview(null);
    latestParsedRef.current = null;
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

  // --- Áp dụng kết quả phân tích giọng nói vào các ô input ---
  const applyTranscriptToForm = useCallback(
    (text: string, isFinalSpeech: boolean = false) => {
      setVoiceTranscript(text);
      const parsed = parseVoiceVitals(text);
      setParsedPreview(parsed);
      latestParsedRef.current = parsed;

      if (parsed.sys !== undefined) setSys(String(parsed.sys));
      if (parsed.dia !== undefined) setDia(String(parsed.dia));
      if (parsed.pulse !== undefined) setPulse(String(parsed.pulse));
      if (parsed.period !== undefined) setPeriod(parsed.period);
      if (parsed.note !== undefined) setNote(parsed.note);

      if (isFinalSpeech && parsed.isComplete && parsed.sys && parsed.dia) {
        if (parsed.autoSave) {
          speakVietnameseConfirmation(
            `Đã lưu huyết áp ${parsed.sys} trên ${parsed.dia}${parsed.pulse ? `, mạch ${parsed.pulse}` : ''}`,
            ttsEnabled
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
            `Đã nhận huyết áp ${parsed.sys} trên ${parsed.dia}${parsed.pulse ? `, mạch ${parsed.pulse}` : ''}. Bấm lưu để hoàn tất.`,
            ttsEnabled
          );
        }
      }
    },
    [performSave, ttsEnabled]
  );

  // --- Bật / Tắt thu âm giọng nói trực tiếp trên trình duyệt ---
  const toggleVoiceListening = useCallback(() => {
    setVoiceError(null);

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    setVoicePanelOpen(true);

    if (typeof window === 'undefined') return;
    const w = window as unknown as Record<string, unknown>;
    const SpeechRecognitionCtor = (w.SpeechRecognition || w.webkitSpeechRecognition) as
      | (new () => BrowserSpeechRecognitionInstance)
      | undefined;

    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      setVoiceError(
        'Trình duyệt này không hỗ trợ thu âm trực tiếp. Hãy bấm vào ô bên dưới rồi bấm biểu tượng Micro 🎙️ trên bàn phím điện thoại để đọc.'
      );
      setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
        let fullTranscript = '';
        let isFinal = false;
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          fullTranscript += res[0].transcript + ' ';
          if (res.isFinal) isFinal = true;
        }
        applyTranscriptToForm(fullTranscript.trim(), isFinal);
      };

      recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError(
            'Chưa cấp quyền Micro cho trình duyệt. Bạn có thể cấp quyền Micro hoặc bấm biểu tượng 🎙️ trên bàn phím điện thoại vào ô bên dưới.'
          );
          setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
        } else if (event.error === 'no-speech') {
          setVoiceError('Chưa nghe thấy giọng nói. Hãy bấm nút Micro và đọc to rõ hơn nhé.');
        } else if (event.error !== 'aborted') {
          setVoiceError('Không thu âm được. Bạn có thể đọc qua Micro 🎙️ trên bàn phím ở ô dưới.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError('Không khởi động được Micro. Hãy dùng nút 🎙️ trên bàn phím ở ô bên dưới.');
      setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
    }
  }, [isListening, applyTranscriptToForm]);

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

      {/* ===== THANH GHI HUYẾT ÁP BẰNG GIỌNG NÓI (0 AI API — Xử lý ngôn ngữ tiếng Việt nội bộ tức thì) ===== */}
      <div
        className={`rounded-2xl border-2 transition-all p-3 sm:p-3.5 ${
          isListening
            ? 'border-rose-500 bg-rose-50/90 shadow-md'
            : voicePanelOpen
              ? 'border-indigo-200 bg-indigo-50/50'
              : 'border-rose-200/80 bg-gradient-to-r from-rose-50/70 via-orange-50/40 to-indigo-50/60'
        }`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={toggleVoiceListening}
            className={`flex-1 min-h-[48px] px-4 py-2.5 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse shadow-rose-300'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5 shrink-0" />
                <span>Đang nghe... (Bấm để dừng)</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 shrink-0" />
                <span>🎙️ Đọc Huyết Áp Bằng Giọng Nói</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setVoicePanelOpen((prev) => !prev);
              if (!voicePanelOpen) {
                setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
              }
            }}
            className="px-3 min-h-[48px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Mở ô nhập/đọc 1 dòng nhanh"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Nhập/Đọc 1 dòng</span>
            <span className="sm:hidden">Hướng dẫn</span>
          </button>
        </div>

        {/* Gợi ý ngắn gọn ngay bên dưới nút */}
        {!voicePanelOpen && !isListening && (
          <p className="text-[11px] text-slate-600 font-medium mt-2 text-center">
            💡 Chỉ cần đọc tự nhiên: <strong className="text-slate-800">&ldquo;135 85 mạch 78&rdquo;</strong> hoặc{' '}
            <strong className="text-slate-800">&ldquo;Trăm ba lăm trên tám lăm sau tập đứng&rdquo;</strong>
          </p>
        )}

        {/* Khung chi tiết khi đang nghe hoặc mở bảng Giọng nói */}
        {(voicePanelOpen || isListening || voiceTranscript) && (
          <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                {isListening ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping inline-block" />
                    <span className="text-rose-700">Hãy đọc số huyết áp trên máy đo...</span>
                  </>
                ) : (
                  <span>🗣️ Câu vừa đọc / Nhập nhanh 1 dòng:</span>
                )}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTtsEnabled((v) => !v)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border cursor-pointer ${
                    ttsEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                  title="Bật/tắt giọng đọc xác nhận lại chỉ số"
                >
                  {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{ttsEnabled ? 'Đọc xác nhận: Bật' : 'Tắt tiếng'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVoicePanelOpen(false);
                    setVoiceError(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                  title="Thu gọn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Ô text nhận giọng nói hoặc gõ nhanh 1 dòng (hỗ trợ cả nút Micro trên bàn phím điện thoại) */}
            <div className="relative">
              <input
                ref={quickVoiceInputRef}
                type="text"
                value={voiceTranscript}
                onChange={(e) => applyTranscriptToForm(e.target.value, false)}
                placeholder='VD: "135 85 mạch 78 sau tập đứng" (hoặc bấm 🎙️ trên bàn phím)'
                className="w-full px-3.5 py-2.5 pr-9 rounded-xl bg-white border-2 border-indigo-200 focus:border-rose-500 focus:outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
              />
              {voiceTranscript && (
                <button
                  type="button"
                  onClick={() => {
                    setVoiceTranscript('');
                    setParsedPreview(null);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="Xoá câu vừa đọc"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Thông báo lỗi Micro nếu có */}
            {voiceError && (
              <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                ⚠️ {voiceError}
              </p>
            )}

            {/* Kết quả bóc tách tự động theo thời gian thực */}
            {parsedPreview && (parsedPreview.sys || parsedPreview.dia || parsedPreview.pulse || parsedPreview.note) && (
              <div className="rounded-xl bg-white border border-emerald-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                  <span className="text-emerald-700">✅ Đã tách tự động:</span>
                  {parsedPreview.sys && (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800">
                      SYS: {parsedPreview.sys}
                    </span>
                  )}
                  {parsedPreview.dia && (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800">
                      DIA: {parsedPreview.dia}
                    </span>
                  )}
                  {parsedPreview.pulse && (
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800">
                      Mạch: {parsedPreview.pulse}
                    </span>
                  )}
                  {parsedPreview.note && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                      📝 {parsedPreview.note}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Các câu mẫu bấm thử 1 chạm + mẹo đọc "lưu luôn" */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500">
                📌 Cách đọc mẫu (bấm thử hoặc đọc tương tự, nói thêm chữ <span className="text-rose-600">&ldquo;lưu luôn&rdquo;</span> ở cuối để tự động lưu):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '135 85 mạch 78',
                  'Trăm ba lăm tám lăm nhịp tim bảy tư sau tập đứng',
                  '140 trên 85 mạch 80 buổi chiều',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => applyTranscriptToForm(sample, false)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors"
                  >
                    &ldquo;{sample}&rdquo;
                  </button>
                ))}
              </div>
              {!speechSupported && (
                <p className="text-[11px] text-slate-500 italic">
                  * Mẹo: Trên Zalo hoặc trình duyệt chặn Micro, bạn chỉ cần chạm vào ô chữ ở trên rồi bấm nút Micro 🎙️ sẵn có trên bàn phím điện thoại.
                </p>
              )}
            </div>
          </div>
        )}
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
