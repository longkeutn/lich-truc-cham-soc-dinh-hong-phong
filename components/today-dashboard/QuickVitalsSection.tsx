'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Save } from 'lucide-react';
import type {
  VitalsLogEntry,
  VitalsPeriod,
  BpThresholds,
  AlertLevel,
  FamilyMember,
  HealthProfileType,
} from '@/lib/types';
import {
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_RECORDER,
  detectCurrentTimeSlot,
  computeAlertLevel,
  evaluateVitalReading,
  getVietnamDateStr,
  getVietnamTimeStr,
} from '@/lib/config';
import {
  stopVietnameseVoiceSpeech,
  useVitalsVoiceController,
} from './useVitalsVoiceController';
import { VitalsVoiceController } from './VitalsVoiceController';
import { VitalsDisplayInputs } from './VitalsDisplayInputs';
import { VitalsSymptomSelector } from './VitalsSymptomSelector';
import { QuickVitalsHeaderAndPrevBar } from './QuickVitalsHeaderAndPrevBar';

export interface QuickVitalsFormProps {
  onSave: (entry: VitalsLogEntry) => Promise<void>;
  lastEntry?: VitalsLogEntry | null;
  bpThresholds?: BpThresholds;
  defaultRecorder?: string;
  members?: FamilyMember[];
  todayStr?: string;
  profileType?: HealthProfileType;
  patientDisplayName?: string;
}

const ALERT_DISPLAY: Record<
  AlertLevel,
  {
    btnBg: string;
    btnHoverBg: string;
    bannerBg: string;
    bannerBorder: string;
    bannerText: string;
    bannerIcon: string;
  }
> = {
  normal: {
    btnBg: 'bg-teal-700',
    btnHoverBg: 'hover:bg-teal-800',
    bannerBg: '',
    bannerBorder: '',
    bannerText: '',
    bannerIcon: '',
  },
  warning: {
    btnBg: 'bg-amber-600',
    btnHoverBg: 'hover:bg-amber-700',
    bannerBg: 'bg-amber-50',
    bannerBorder: 'border-amber-300',
    bannerText: 'text-amber-950',
    bannerIcon: '⚠️',
  },
  critical: {
    btnBg: 'bg-rose-600',
    btnHoverBg: 'hover:bg-rose-700',
    bannerBg: 'bg-rose-50',
    bannerBorder: 'border-rose-300',
    bannerText: 'text-rose-950',
    bannerIcon: '🚨',
  },
};

export function QuickVitalsSection({
  onSave,
  lastEntry,
  bpThresholds,
  defaultRecorder,
  members,
  todayStr: todayStrProp,
  profileType = 'post_stroke_cranioplasty',
  patientDisplayName = 'Bố',
}: QuickVitalsFormProps) {
  const thresholds = bpThresholds || DEFAULT_BP_THRESHOLDS;
  const familyList = members || [];
  const [recorder, setRecorder] = useState<string>(defaultRecorder || DEFAULT_RECORDER);
  const [hasUserSelectedRecorder, setHasUserSelectedRecorder] = useState<boolean>(false);

  useEffect(() => {
    if (!hasUserSelectedRecorder && defaultRecorder) {
      setRecorder(defaultRecorder);
    }
  }, [defaultRecorder, hasUserSelectedRecorder]);

  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temp, setTemp] = useState('');
  const [note, setNote] = useState('');
  const [period, setPeriod] = useState<VitalsPeriod>('morning');
  const [mountedClient, setMountedClient] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VitalsLogEntry | null>(null);

  const sysInputRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFormIdleRef = useRef<boolean>(true);

  useEffect(() => {
    setPeriod(detectCurrentTimeSlot());
    setMountedClient(true);
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    isFormIdleRef.current = !sys.trim() && !dia.trim() && !editingEntry;
  }, [sys, dia, editingEntry]);

  useEffect(() => {
    if (isFormIdleRef.current) setPeriod(detectCurrentTimeSlot());
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

  const sysNum = parseInt(sys, 10);
  const diaNum = parseInt(dia, 10);
  const pulseNum = pulse ? parseInt(pulse, 10) : undefined;
  const spo2Num = spo2 ? parseFloat(spo2) : undefined;
  const tempNum = temp ? parseFloat(temp.replace(',', '.')) : undefined;
  const hasBothValues = !isNaN(sysNum) && !isNaN(diaNum) && sysNum > 0 && diaNum > 0;

  const resetFormCore = useCallback(() => {
    setEditingEntry(null);
    setSys('');
    setDia('');
    setPulse('');
    setSpo2('');
    setTemp('');
    setNote('');
    setPeriod(detectCurrentTimeSlot());
  }, []);

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
      if (isNaN(finalSys) || isNaN(finalDia) || finalSys <= 0 || finalDia <= 0 || isSaving) {
        return;
      }

      const finalPulse =
        overrideValues !== undefined
          ? overrideValues.pulseVal
          : pulseNum && !isNaN(pulseNum)
            ? pulseNum
            : undefined;
      const finalSpo2 =
        spo2Num !== undefined && !isNaN(spo2Num) ? spo2Num : editingEntry?.spo2;
      const finalTemp =
        tempNum !== undefined && !isNaN(tempNum) ? tempNum : editingEntry?.temp;
      const finalNote =
        overrideValues !== undefined
          ? overrideValues.noteVal?.trim() || undefined
          : note.trim() || undefined;
      const finalPeriod = overrideValues?.periodVal || period;
      const finalAlert = computeAlertLevel(finalSys, finalDia, thresholds, finalPulse);

      setIsSaving(true);
      try {
        const now = new Date();
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
          spo2: finalSpo2,
          temp: finalTemp,
          bloodSugar: editingEntry?.bloodSugar,
          note: finalNote,
          alertLevel: finalAlert,
          recordedBy: recorder,
          createdAt: editingEntry ? editingEntry.createdAt : now.toISOString(),
        };

        setShowSuccess(true);
        resetFormCore();
        void onSave(entry);

        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => setShowSuccess(false), 1600);
      } finally {
        setIsSaving(false);
      }
    },
    [
      sysNum,
      diaNum,
      pulseNum,
      spo2Num,
      tempNum,
      note,
      period,
      thresholds,
      recorder,
      isSaving,
      editingEntry,
      resetFormCore,
      onSave,
    ]
  );

  const voice = useVitalsVoiceController({
    patientDisplayName,
    onApplyValues: ({ sys: s, dia: d, pulse: p, period: per, note: n }) => {
      setSys(s);
      setDia(d);
      setPulse(p);
      if (per !== undefined) setPeriod(per);
      setNote(n);
    },
    onAutoSaveValues: performSave,
  });

  const resetAll = useCallback(() => {
    resetFormCore();
    voice.resetVoiceState();
  }, [resetFormCore, voice]);

  const handleStartEditLastEntry = useCallback(() => {
    if (!lastEntry) return;
    setEditingEntry(lastEntry);
    setSys(String(lastEntry.sys));
    setDia(String(lastEntry.dia));
    setPulse(lastEntry.pulse ? String(lastEntry.pulse) : '');
    setSpo2(lastEntry.spo2 !== undefined ? String(lastEntry.spo2) : '');
    setTemp(lastEntry.temp !== undefined ? String(lastEntry.temp) : '');
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

  const currentEvaluation = hasBothValues
    ? evaluateVitalReading(
        {
          sys: sysNum,
          dia: diaNum,
          pulse: pulseNum && !isNaN(pulseNum) && pulseNum > 0 ? pulseNum : undefined,
        },
        thresholds,
        patientDisplayName
      )
    : null;

  const currentAlertLevel: AlertLevel = currentEvaluation
    ? currentEvaluation.overallAlertLevel
    : 'normal';
  const lastEntryEval = lastEntry
    ? evaluateVitalReading(lastEntry, thresholds, patientDisplayName)
    : null;
  const alertDisplay = ALERT_DISPLAY[currentAlertLevel];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs p-3.5 sm:p-5 space-y-3.5">
      <QuickVitalsHeaderAndPrevBar
        patientDisplayName={patientDisplayName}
        profileType={profileType}
        mountedClient={mountedClient}
        todayStr={todayStrProp}
        recorder={recorder}
        familyList={familyList}
        onChangeRecorder={(val) => {
          setRecorder(val);
          setHasUserSelectedRecorder(true);
        }}
        lastEntry={lastEntry}
        lastEntryEval={lastEntryEval}
        editingEntry={editingEntry}
        hasBothValues={hasBothValues}
        sysNum={sysNum}
        diaNum={diaNum}
        onStartEditLastEntry={handleStartEditLastEntry}
        onCancelEdit={resetAll}
      />

      <VitalsVoiceController
        isListening={voice.isListening}
        isSpeakingBack={voice.isSpeakingBack}
        voicePanelOpen={voice.voicePanelOpen}
        voiceTranscript={voice.voiceTranscript}
        parsedPreview={voice.parsedPreview}
        voiceError={voice.voiceError}
        ttsEnabled={voice.ttsEnabled}
        quickVoiceInputRef={voice.quickVoiceInputRef}
        onStartOrResetVoice={voice.startOrResetVoiceSession}
        onStopVoice={voice.stopVoiceSession}
        onTogglePanel={() => {
          const next = !voice.voicePanelOpen;
          voice.setVoicePanelOpen(next);
          if (next) setTimeout(() => voice.quickVoiceInputRef.current?.focus(), 100);
        }}
        onClosePanel={() => {
          voice.stopVoiceSession();
          stopVietnameseVoiceSpeech();
          voice.setVoicePanelOpen(false);
          voice.setVoiceError(null);
        }}
        onTranscriptChange={(val) => {
          voice.hasSpokenConfirmationRef.current = false;
          voice.applyTranscriptToForm(val);
        }}
        onClearTranscript={voice.resetVoiceState}
        onToggleTts={() => voice.setTtsEnabled((prev) => !prev)}
        onSetSpeakingBack={voice.setIsSpeakingBack}
        onSampleClick={(sample) => {
          const parsed = voice.applyTranscriptToForm(sample);
          voice.triggerConfirmationFeedback(parsed, true);
        }}
      />

      <VitalsDisplayInputs
        sys={sys}
        dia={dia}
        pulse={pulse}
        spo2={spo2}
        temp={temp}
        period={period}
        note={note}
        mountedClient={mountedClient}
        profileType={profileType}
        sysInputRef={sysInputRef}
        onChangeSys={setSys}
        onChangeDia={setDia}
        onChangePulse={setPulse}
        onChangeSpo2={setSpo2}
        onChangeTemp={setTemp}
        onChangePeriod={setPeriod}
        onChangeNote={setNote}
      />

      <VitalsSymptomSelector
        profileType={profileType}
        patientDisplayName={patientDisplayName}
        note={note}
        onChangeNote={setNote}
      />

      {showSuccess ? (
        <div className="min-h-[56px] px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-400 flex items-center justify-center gap-2 text-center">
          <Check className="w-5 h-5 text-emerald-700 shrink-0" strokeWidth={3} />
          <span className="text-base font-extrabold text-emerald-900">
            Đã lưu chỉ số sinh hiệu của {patientDisplayName} thành công!
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            void performSave();
            voice.setVoicePanelOpen(false);
          }}
          disabled={!hasBothValues || isSaving}
          className={`w-full min-h-[56px] sm:min-h-[60px] px-4 py-3 rounded-xl text-base sm:text-lg font-extrabold text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] border text-center ${
            hasBothValues
              ? `${alertDisplay.btnBg} ${alertDisplay.btnHoverBg} border-black/20`
              : 'bg-slate-200 text-slate-600 border-slate-300 cursor-not-allowed'
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
                  ? `CẬP NHẬT LẠI CHỈ SỐ ${patientDisplayName.toUpperCase()} (${sysNum}/${diaNum})`
                  : `BẤM LƯU CHỈ SỐ ${patientDisplayName.toUpperCase()} (${sysNum}/${diaNum})`}
              </span>
            </>
          ) : (
            <>
              <span className="shrink-0">💓</span>
              <span>NHẬP SỐ TRÊN &amp; SỐ DƯỚI ĐỂ LƯU</span>
            </>
          )}
        </button>
      )}

      {hasBothValues && currentEvaluation && currentAlertLevel !== 'normal' && (
        <div
          className={`rounded-2xl border-2 p-3.5 sm:p-4 flex items-start gap-3 ${alertDisplay.bannerBg} ${alertDisplay.bannerBorder}`}
        >
          <span className="text-2xl shrink-0 leading-none mt-0.5">
            {alertDisplay.bannerIcon}
          </span>
          <div className="space-y-1 min-w-0">
            <span className={`text-sm sm:text-base font-black block ${alertDisplay.bannerText}`}>
              {currentEvaluation.statusLabel}: {currentEvaluation.reasons.join(' · ')}
            </span>
            <p className={`text-xs sm:text-sm font-semibold ${alertDisplay.bannerText}`}>
              💡 {currentEvaluation.clinicalAdvice}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickVitalsSection;
