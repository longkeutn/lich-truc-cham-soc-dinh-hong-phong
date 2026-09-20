'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSpeechReturn {
  supported: boolean;
  isSpeaking: boolean;
  currentText: string | null;
  speak: (text: string) => void;
  stop: () => void;
}

export function useSpeech(): UseSpeechReturn {
  const [supported, setSupported] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentText, setCurrentText] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentText(null);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      // Hủy mọi âm thanh đang phát trước đó
      window.speechSynthesis.cancel();

      if (!text || text.trim() === '') {
        setIsSpeaking(false);
        setCurrentText(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.lang = 'vi-VN';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Tìm giọng đọc tiếng Việt nếu trình duyệt hỗ trợ
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(
        (v) => v.lang.startsWith('vi') || v.lang.includes('VIE') || v.lang.toLowerCase().includes('vietnam')
      );
      if (viVoice) {
        utterance.voice = viVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setCurrentText(text);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentText(null);
      };

      utterance.onerror = (event) => {
        // Lỗi 'interrupted' thường xảy ra khi cancel() được gọi, không cần log lỗi
        if (event.error !== 'interrupted') {
          console.warn('Speech synthesis error:', event.error);
        }
        setIsSpeaking(false);
        setCurrentText(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    []
  );

  // Dọn dẹp khi unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    supported,
    isSpeaking,
    currentText,
    speak,
    stop,
  };
}
