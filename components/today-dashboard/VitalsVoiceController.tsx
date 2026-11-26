'use client';

import React from 'react';
import { Check, Mic, RotateCcw, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import type { ParsedVoiceVitals } from '@/lib/voiceVitalsParser';
import {
  speakVietnameseVoiceConfirmation,
  stopVietnameseVoiceSpeech,
} from './useVitalsVoiceController';

export interface VitalsVoiceControllerProps {
  isListening: boolean;
  isSpeakingBack: boolean;
  voicePanelOpen: boolean;
  voiceTranscript: string;
  parsedPreview: ParsedVoiceVitals | null;
  voiceError: string | null;
  ttsEnabled: boolean;
  quickVoiceInputRef: React.RefObject<HTMLInputElement | null>;
  onStartOrResetVoice: (clearFields: boolean) => void;
  onStopVoice: () => void;
  onTogglePanel: () => void;
  onClosePanel: () => void;
  onTranscriptChange: (val: string) => void;
  onClearTranscript: () => void;
  onToggleTts: () => void;
  onSetSpeakingBack: (speaking: boolean) => void;
  onSampleClick: (sample: string) => void;
}

export function VitalsVoiceController({
  isListening,
  isSpeakingBack,
  voicePanelOpen,
  voiceTranscript,
  parsedPreview,
  voiceError,
  ttsEnabled,
  quickVoiceInputRef,
  onStartOrResetVoice,
  onStopVoice,
  onTogglePanel,
  onClosePanel,
  onTranscriptChange,
  onClearTranscript,
  onToggleTts,
  onSetSpeakingBack,
  onSampleClick,
}: VitalsVoiceControllerProps) {
  const isExpanded = voicePanelOpen || isListening || Boolean(voiceTranscript);

  return (
    <div
      className={`rounded-xl border transition-all ${
        isListening
          ? 'p-2.5 sm:p-3 border-rose-500 bg-rose-50/90 shadow-xs'
          : isExpanded
            ? 'p-2.5 sm:p-3 border-teal-300 bg-teal-50/40 shadow-xs'
            : 'px-3 py-1.5 sm:py-2 border-slate-200/90 bg-slate-50/80 hover:bg-slate-100/80'
      }`}
    >
      {!isExpanded ? (
        /* Trạng thái thu gọn mặc định: thanh phụ trợ 1 dòng siêu gọn, không chiếm diện tích */
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] sm:text-xs font-semibold text-slate-500 flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
            <span>Hoặc nhập nhanh:</span>
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onStartOrResetVoice(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-teal-200 bg-white hover:bg-teal-50 text-teal-800 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Đọc huyết áp bằng giọng nói"
            >
              <Mic className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>Đọc giọng nói</span>
            </button>

            <button
              type="button"
              onClick={onTogglePanel}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              title="Gõ nhanh 1 dòng (VD: 135 85 mạch 78)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Gõ 1 dòng</span>
            </button>
          </div>
        </div>
      ) : isListening ? (
        /* Trạng thái đang nghe giọng nói */
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping inline-block shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-rose-800 truncate">
                Đang nghe... Hãy đọc 3 số trên máy đo
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onStartOrResetVoice(true)}
                className="px-2.5 py-1.5 rounded-lg font-bold text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1 cursor-pointer transition active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Đọc lại</span>
              </button>

              <button
                type="button"
                onClick={onStopVoice}
                className="px-3 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer transition active:scale-95"
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Xong</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Trạng thái mở panel gõ nhanh hoặc có transcript */
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              {isSpeakingBack ? (
                <>
                  <Volume2 className="w-4 h-4 text-teal-700 animate-bounce shrink-0" />
                  <span className="text-teal-800">Đang đọc xác nhận lại chỉ số...</span>
                </>
              ) : (
                <span>🗣️ Gõ nhanh 1 dòng hoặc đọc giọng nói:</span>
              )}
            </span>

            <div className="flex items-center gap-1.5 flex-wrap ml-auto">
              {parsedPreview?.isComplete && (
                <button
                  type="button"
                  onClick={() => {
                    speakVietnameseVoiceConfirmation(
                      `Huyết áp ${parsedPreview.sys} trên ${parsedPreview.dia}${parsedPreview.pulse ? `, mạch ${parsedPreview.pulse}` : ''}`,
                      true,
                      10,
                      onSetSpeakingBack
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1 cursor-pointer transition"
                >
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Nghe lại</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (ttsEnabled) {
                    stopVietnameseVoiceSpeech();
                    onSetSpeakingBack(false);
                  }
                  onToggleTts();
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border cursor-pointer transition ${
                  ttsEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {ttsEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{ttsEnabled ? 'Tự đọc: BẬT' : 'Tắt tiếng'}</span>
              </button>

              <button
                type="button"
                onClick={onClosePanel}
                aria-label="Thu gọn bảng giọng nói"
                className="w-7 h-7 rounded-lg text-slate-600 hover:text-slate-900 bg-white border border-slate-200 flex items-center justify-center cursor-pointer transition"
                title="Đóng / Thu gọn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              ref={quickVoiceInputRef}
              type="text"
              value={voiceTranscript}
              onChange={(e) => onTranscriptChange(e.target.value)}
              placeholder='VD: "135 85 mạch 78"'
              className="w-full min-h-[44px] px-3 py-2 pr-10 rounded-xl bg-white border border-slate-300 focus:border-teal-600 focus:outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
            />
            {voiceTranscript && (
              <button
                type="button"
                onClick={onClearTranscript}
                aria-label="Xoá văn bản giọng nói"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {voiceError && (
            <p className="text-xs font-semibold text-amber-950 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              ⚠️ {voiceError}
            </p>
          )}

          {parsedPreview &&
            (parsedPreview.sys ||
              parsedPreview.dia ||
              parsedPreview.pulse ||
              parsedPreview.note) && (
              <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 px-3 py-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <span className="text-emerald-900">✅ Đã điền:</span>
                {parsedPreview.sys && (
                  <span className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 text-slate-900">
                    Số trên: {parsedPreview.sys}
                  </span>
                )}
                {parsedPreview.dia && (
                  <span className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 text-slate-900">
                    Số dưới: {parsedPreview.dia}
                  </span>
                )}
                {parsedPreview.pulse && (
                  <span className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 text-slate-900">
                    Mạch: {parsedPreview.pulse}
                  </span>
                )}
                {parsedPreview.note && (
                  <span className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 text-slate-800">
                    📝 {parsedPreview.note}
                  </span>
                )}
              </div>
            )}

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-bold text-slate-500">Mẫu thử:</span>
            {['135 85 mạch 78', '128 trên 78 mạch 72'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => onSampleClick(sample)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
              >
                &ldquo;{sample}&rdquo;
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
