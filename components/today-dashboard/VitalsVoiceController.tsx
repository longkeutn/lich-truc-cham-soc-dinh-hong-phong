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
  return (
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
            onClick={() => onStartOrResetVoice(true)}
            className="flex-1 min-h-[52px] min-w-[48px] px-3.5 py-2.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98] bg-teal-700 hover:bg-teal-800 text-white text-center"
          >
            {voiceTranscript ? (
              <>
                <RotateCcw className="w-5 h-5 shrink-0" />
                <span>🎙️ Bấm đọc lại bằng giọng nói</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 shrink-0" />
                <span>🎙️ Bấm đọc huyết áp bằng giọng nói</span>
              </>
            )}
          </button>
        ) : (
          <div className="grid grid-cols-2 sm:flex flex-1 gap-2">
            <button
              type="button"
              onClick={() => onStartOrResetVoice(true)}
              className="sm:flex-1 min-h-[52px] min-w-[48px] px-3 py-2 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-amber-500 hover:bg-amber-600 text-slate-950 text-center"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span>Đọc lại</span>
            </button>

            <button
              type="button"
              onClick={onStopVoice}
              className="sm:px-5 min-h-[52px] min-w-[48px] py-2 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-center"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Xong</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onTogglePanel}
          className="px-3.5 min-h-[48px] min-w-[48px] rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
          <span>{voicePanelOpen ? 'Ẩn ô gõ nhanh' : 'Gõ nhanh 1 dòng'}</span>
        </button>
      </div>

      {!voicePanelOpen && !isListening && (
        <p className="text-xs sm:text-sm text-slate-700 font-medium mt-1.5 text-center">
          💡 Đọc tự nhiên: <strong className="text-teal-900">&ldquo;135 85 mạch 78&rdquo;</strong> hoặc nhập trực tiếp vào các ô bên dưới
        </p>
      )}

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
                    speakVietnameseVoiceConfirmation(
                      `Huyết áp ${parsedPreview.sys} trên ${parsedPreview.dia}${parsedPreview.pulse ? `, mạch ${parsedPreview.pulse}` : ''}`,
                      true,
                      10,
                      onSetSpeakingBack
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1 cursor-pointer min-h-[44px]"
                >
                  <Volume2 className="w-4 h-4 shrink-0" />
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border cursor-pointer min-h-[44px] ${
                  ttsEnabled
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {ttsEnabled ? (
                  <Volume2 className="w-4 h-4 shrink-0" />
                ) : (
                  <VolumeX className="w-4 h-4 shrink-0" />
                )}
                <span>{ttsEnabled ? 'Tự đọc: BẬT' : 'Tắt tiếng'}</span>
              </button>

              <button
                type="button"
                onClick={onClosePanel}
                aria-label="Thu gọn bảng giọng nói"
                className="min-h-[44px] min-w-[44px] rounded-xl text-slate-600 hover:text-slate-900 bg-white border border-slate-200 flex items-center justify-center cursor-pointer"
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
              onChange={(e) => onTranscriptChange(e.target.value)}
              placeholder='VD: "135 85 mạch 78 buổi sáng"'
              className="w-full min-h-[48px] px-3.5 py-2.5 pr-10 rounded-xl bg-white border border-slate-300 focus:border-teal-600 focus:outline-none text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
            />
            {voiceTranscript && (
              <button
                type="button"
                onClick={onClearTranscript}
                aria-label="Xoá văn bản giọng nói"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[40px] min-w-[40px] text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {voiceError && (
            <p className="text-xs sm:text-sm font-semibold text-amber-950 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              ⚠️ {voiceError}
            </p>
          )}

          {parsedPreview &&
            (parsedPreview.sys ||
              parsedPreview.dia ||
              parsedPreview.pulse ||
              parsedPreview.note) && (
              <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 px-3 py-2 flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-bold">
                <span className="text-emerald-900">✅ Đã điền:</span>
                {parsedPreview.sys && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-900">
                    Số trên: {parsedPreview.sys}
                  </span>
                )}
                {parsedPreview.dia && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-900">
                    Số dưới: {parsedPreview.dia}
                  </span>
                )}
                {parsedPreview.pulse && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-900">
                    Mạch: {parsedPreview.pulse}
                  </span>
                )}
                {parsedPreview.note && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-slate-800">
                    📝 {parsedPreview.note}
                  </span>
                )}
              </div>
            )}

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600">Mẫu thử nhanh:</span>
            {['135 85 mạch 78', '128 trên 78 mạch 72 buổi sáng'].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => onSampleClick(sample)}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
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
