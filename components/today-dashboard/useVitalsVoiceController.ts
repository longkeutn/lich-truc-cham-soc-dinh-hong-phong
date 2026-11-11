'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VitalsPeriod } from '@/lib/types';
import { parseVoiceVitals, type ParsedVoiceVitals } from '@/lib/voiceVitalsParser';
import { speakVietnameseReminder, stopSpeakingVietnamese } from '@/lib/notifications';

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

const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

let sharedTtsAudio: HTMLAudioElement | null = null;
let sharedAudioUnlocked = false;
let ttsPlaybackTimer: ReturnType<typeof setTimeout> | null = null;

function unlockAudioElementOnFirstInteraction() {
  if (sharedAudioUnlocked || typeof window === 'undefined') return;
  try {
    if (!sharedTtsAudio) {
      sharedTtsAudio = new Audio();
      sharedTtsAudio.preload = 'auto';
    }
    sharedTtsAudio.src = SILENT_WAV_DATA_URI;
    sharedTtsAudio.volume = 0.01;
    const playPromise = sharedTtsAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          if (sharedTtsAudio) {
            sharedTtsAudio.pause();
            sharedTtsAudio.volume = 1.0;
          }
          sharedAudioUnlocked = true;
        })
        .catch(() => {});
    }
  } catch {
    // ignore
  }
}

export function stopVietnameseVoiceSpeech() {
  if (ttsPlaybackTimer) {
    clearTimeout(ttsPlaybackTimer);
    ttsPlaybackTimer = null;
  }
  stopSpeakingVietnamese();
}

export function speakVietnameseVoiceConfirmation(
  text: string,
  enabled: boolean,
  delayMs: number = 350,
  onSpeakingChange?: (speaking: boolean) => void
) {
  if (!enabled || typeof window === 'undefined' || !text.trim()) return;
  stopVietnameseVoiceSpeech();
  ttsPlaybackTimer = setTimeout(() => {
    ttsPlaybackTimer = null;
    onSpeakingChange?.(true);
    const ok = speakVietnameseReminder(text, () => {
      onSpeakingChange?.(false);
    });
    if (!ok) onSpeakingChange?.(false);
  }, delayMs);
}

interface UseVitalsVoiceControllerParams {
  patientDisplayName: string;
  onApplyValues: (vals: {
    sys: string;
    dia: string;
    pulse: string;
    period?: VitalsPeriod;
    note: string;
  }) => void;
  onAutoSaveValues: (vals: {
    sysVal: number;
    diaVal: number;
    pulseVal?: number;
    noteVal?: string;
    periodVal?: VitalsPeriod;
  }) => Promise<void>;
}

export function useVitalsVoiceController({
  patientDisplayName,
  onApplyValues,
  onAutoSaveValues,
}: UseVitalsVoiceControllerParams) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingBack, setIsSpeakingBack] = useState(false);
  const [voicePanelOpen, setVoicePanelOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedVoiceVitals | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(true);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);

  const quickVoiceInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchdogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionCounterRef = useRef<number>(0);
  const latestParsedRef = useRef<ParsedVoiceVitals | null>(null);
  const hasSpokenConfirmationRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as Record<string, unknown>;
    setSpeechSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));

    const handleFirstTouch = () => unlockAudioElementOnFirstInteraction();
    window.addEventListener('touchstart', handleFirstTouch, { passive: true });
    window.addEventListener('click', handleFirstTouch, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleFirstTouch);
      window.removeEventListener('click', handleFirstTouch);
    };
  }, []);

  const cleanupRecognitionInstance = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    if (stopFallbackTimerRef.current) clearTimeout(stopFallbackTimerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    silenceTimerRef.current = null;
    watchdogTimerRef.current = null;
    stopFallbackTimerRef.current = null;
    retryTimerRef.current = null;

    const inst = recognitionRef.current;
    if (inst) {
      inst.onstart = null;
      inst.onresult = null;
      inst.onerror = null;
      inst.onend = null;
      try {
        inst.stop();
      } catch {}
      try {
        inst.abort();
      } catch {}
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopVietnameseVoiceSpeech();
      cleanupRecognitionInstance();
    };
  }, [cleanupRecognitionInstance]);

  const resetVoiceState = useCallback(() => {
    setVoiceTranscript('');
    setParsedPreview(null);
    latestParsedRef.current = null;
    hasSpokenConfirmationRef.current = false;
  }, []);

  const triggerConfirmationFeedback = useCallback(
    (parsed: ParsedVoiceVitals | null, immediateGesture: boolean = false) => {
      if (!parsed || !parsed.isComplete || !parsed.sys || !parsed.dia) return;

      if (parsed.autoSave) {
        speakVietnameseVoiceConfirmation(
          `Đã lưu huyết áp của ${patientDisplayName}: ${parsed.sys} trên ${parsed.dia}${parsed.pulse ? `, mạch ${parsed.pulse}` : ''}`,
          ttsEnabled,
          immediateGesture ? 30 : 350,
          setIsSpeakingBack
        );
        void onAutoSaveValues({
          sysVal: parsed.sys,
          diaVal: parsed.dia,
          pulseVal: parsed.pulse,
          noteVal: parsed.note,
          periodVal: parsed.period,
        });
      } else {
        speakVietnameseVoiceConfirmation(
          `Huyết áp của ${patientDisplayName}: ${parsed.sys} trên ${parsed.dia}${parsed.pulse ? `, mạch ${parsed.pulse}` : ''}`,
          ttsEnabled,
          immediateGesture ? 30 : 350,
          setIsSpeakingBack
        );
      }
    },
    [onAutoSaveValues, ttsEnabled, patientDisplayName]
  );

  const applyTranscriptToForm = useCallback(
    (text: string) => {
      setVoiceTranscript(text);
      const parsed = parseVoiceVitals(text);
      setParsedPreview(parsed);
      latestParsedRef.current = parsed;
      onApplyValues({
        sys: parsed.sys !== undefined ? String(parsed.sys) : '',
        dia: parsed.dia !== undefined ? String(parsed.dia) : '',
        pulse: parsed.pulse !== undefined ? String(parsed.pulse) : '',
        period: parsed.period,
        note: parsed.note !== undefined ? parsed.note : '',
      });
      return parsed;
    },
    [onApplyValues]
  );

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

  const startOrResetVoiceSession = useCallback(
    (clearFields: boolean = true) => {
      setVoiceError(null);
      setVoicePanelOpen(true);
      stopVietnameseVoiceSpeech();
      setIsSpeakingBack(false);

      if (clearFields) {
        onApplyValues({ sys: '', dia: '', pulse: '', note: '' });
        resetVoiceState();
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
          'Trình duyệt chưa hỗ trợ thu âm trực tiếp. Hãy bấm vào ô bên dưới rồi dùng biểu tượng Micro trên bàn phím điện thoại.'
        );
        setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
        return;
      }

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
              if (sessionCounterRef.current === currentSessionId) {
                finalizeVoiceSession(true);
              }
            }, ms);
          };
          resetWatchdog(9000);

          recognition.onstart = () => {
            if (sessionCounterRef.current !== currentSessionId) return;
            setIsListening(true);
            setVoiceError(null);
          };

          recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
            if (sessionCounterRef.current !== currentSessionId) return;
            gotAnySpeechResult = true;
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
              } else if (!prevLower.startsWith(segLower) && !prevLower.endsWith(segLower)) {
                segments.push(seg);
              }
            }
            const cleanText = segments.join(' ').replace(/\s+/g, ' ').trim();
            if (!cleanText) return;
            const parsed = applyTranscriptToForm(cleanText);

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
              } catch {}
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
            if (
              attempt < 2 &&
              !gotAnySpeechResult &&
              elapsed < 600 &&
              (event.error === 'aborted' ||
                event.error === 'audio-capture' ||
                event.error === 'network')
            ) {
              cleanupRecognitionInstance();
              retryTimerRef.current = setTimeout(() => launchRecognitionAttempt(attempt + 1), 220);
              return;
            }
            cleanupRecognitionInstance();
            setIsListening(false);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              setVoiceError(
                'Chưa cấp quyền Micro. Bạn có thể cấp quyền hoặc dùng nút Micro trên bàn phím điện thoại.'
              );
              setTimeout(() => quickVoiceInputRef.current?.focus(), 100);
            } else if (event.error === 'no-speech') {
              setVoiceError('Chưa nghe thấy giọng nói. Hãy bấm Đọc lại và đọc 3 số to rõ hơn.');
            } else if (event.error !== 'aborted') {
              setVoiceError('Micro bị ngắt tạm thời. Hãy bấm lại nút đọc bằng giọng nói.');
            }
          };

          recognition.onend = () => {
            if (sessionCounterRef.current !== currentSessionId) return;
            const elapsed = Date.now() - startedAt;
            if (attempt < 2 && hadActiveRecognition && !gotAnySpeechResult && elapsed < 350) {
              cleanupRecognitionInstance();
              retryTimerRef.current = setTimeout(() => launchRecognitionAttempt(attempt + 1), 220);
              return;
            }
            finalizeVoiceSession(true);
          };

          recognitionRef.current = recognition;
          setIsListening(true);
          recognition.start();
        } catch {
          cleanupRecognitionInstance();
          setIsListening(false);
          setVoiceError('Không khởi động được Micro. Hãy bấm lại hoặc gõ vào ô bên dưới.');
        }
      };

      launchRecognitionAttempt(1);
    },
    [
      applyTranscriptToForm,
      cleanupRecognitionInstance,
      finalizeVoiceSession,
      isListening,
      onApplyValues,
      resetVoiceState,
    ]
  );

  const stopVoiceSession = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
    const currentSessionId = sessionCounterRef.current;
    const inst = recognitionRef.current;
    if (inst) {
      try {
        inst.stop();
      } catch {
        finalizeVoiceSession(true);
        return;
      }
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

  return {
    isListening,
    isSpeakingBack,
    setIsSpeakingBack,
    voicePanelOpen,
    setVoicePanelOpen,
    voiceTranscript,
    parsedPreview,
    voiceError,
    setVoiceError,
    ttsEnabled,
    setTtsEnabled,
    speechSupported,
    quickVoiceInputRef,
    resetVoiceState,
    applyTranscriptToForm,
    triggerConfirmationFeedback,
    startOrResetVoiceSession,
    stopVoiceSession,
    hasSpokenConfirmationRef,
  };
}
