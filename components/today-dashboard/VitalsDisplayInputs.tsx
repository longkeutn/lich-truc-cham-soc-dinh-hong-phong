'use client';

import React from 'react';
import type { HealthProfileType, VitalsPeriod } from '@/lib/types';
import { TIME_SLOT_CONFIG } from '@/lib/config';

const PERIOD_OPTIONS: VitalsPeriod[] = ['morning', 'noon', 'afternoon', 'evening'];

export interface VitalsDisplayInputsProps {
  sys: string;
  dia: string;
  pulse: string;
  spo2: string;
  temp: string;
  period: VitalsPeriod;
  note: string;
  mountedClient: boolean;
  profileType: HealthProfileType;
  sysInputRef: React.RefObject<HTMLInputElement | null>;
  onChangeSys: (val: string) => void;
  onChangeDia: (val: string) => void;
  onChangePulse: (val: string) => void;
  onChangeSpo2: (val: string) => void;
  onChangeTemp: (val: string) => void;
  onChangePeriod: (val: VitalsPeriod) => void;
  onChangeNote: (val: string) => void;
}

export function VitalsDisplayInputs({
  sys,
  dia,
  pulse,
  spo2,
  temp,
  period,
  note,
  mountedClient,
  profileType,
  sysInputRef,
  onChangeSys,
  onChangeDia,
  onChangePulse,
  onChangeSpo2,
  onChangeTemp,
  onChangePeriod,
  onChangeNote,
}: VitalsDisplayInputsProps) {
  const isPostStroke = profileType === 'post_stroke_cranioplasty';
  const isPediatric = profileType === 'pediatric';

  const spo2Num = spo2 ? parseFloat(spo2) : undefined;
  const tempNum = temp ? parseFloat(temp.replace(',', '.')) : undefined;

  return (
    <div className="space-y-3">
      {/* Bảng 3 chỉ số chính trên màn hình máy đo huyết áp */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-50/90 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/90">
        <div className="flex flex-col justify-between">
          <label className="block text-center mb-1.5 leading-tight">
            <span className="block text-xs sm:text-sm font-extrabold text-slate-900">
              1. SỐ TRÊN
            </span>
            <span className="block text-xs font-semibold text-slate-600">
              Tâm thu (SYS)
            </span>
          </label>
          <input
            ref={sysInputRef}
            type="number"
            inputMode="numeric"
            value={sys}
            onChange={(e) => onChangeSys(e.target.value)}
            placeholder={isPediatric ? '100' : '128'}
            min={40}
            max={300}
            className="w-full min-h-[54px] text-2xl sm:text-3xl font-extrabold text-center text-slate-900 bg-white border-2 border-slate-300 rounded-xl py-2.5 sm:py-3 px-1 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 placeholder:text-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <div className="flex flex-col justify-between">
          <label className="block text-center mb-1.5 leading-tight">
            <span className="block text-xs sm:text-sm font-extrabold text-slate-900">
              2. SỐ DƯỚI
            </span>
            <span className="block text-xs font-semibold text-slate-600">
              Tâm trương (DIA)
            </span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={dia}
            onChange={(e) => onChangeDia(e.target.value)}
            placeholder={isPediatric ? '65' : '80'}
            min={20}
            max={200}
            className="w-full min-h-[54px] text-2xl sm:text-3xl font-extrabold text-center text-slate-900 bg-white border-2 border-slate-300 rounded-xl py-2.5 sm:py-3 px-1 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 placeholder:text-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        <div className="flex flex-col justify-between">
          <label className="block text-center mb-1.5 leading-tight">
            <span className="block text-xs sm:text-sm font-extrabold text-slate-900">
              3. NHỊP MẠCH
            </span>
            <span className="block text-xs font-semibold text-slate-600">
              Nhịp/phút (BPM)
            </span>
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={pulse}
            onChange={(e) => onChangePulse(e.target.value)}
            placeholder={isPediatric ? '95' : '75'}
            min={30}
            max={250}
            className="w-full min-h-[54px] text-2xl sm:text-3xl font-extrabold text-center text-slate-900 bg-white border-2 border-slate-300 rounded-xl py-2.5 sm:py-3 px-1 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 placeholder:text-slate-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Sinh hiệu mở rộng thích ứng: SpO2 & Nhiệt độ cho Hậu đột quỵ / Ghép sọ hoặc Nhi khoa */}
      {(isPostStroke || isPediatric) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-teal-50/50 border border-teal-200/80 rounded-2xl p-3">
          {isPostStroke && (
            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1">
                🫁 4. Độ bão hòa Oxy máu SpO2 (%) <span className="font-semibold text-slate-600">(chuẩn &ge; 95%)</span>
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={50}
                max={100}
                value={spo2}
                onChange={(e) => onChangeSpo2(e.target.value)}
                placeholder="VD: 98"
                className={`w-full min-h-[48px] px-3 rounded-xl bg-white border-2 text-lg font-black text-slate-900 focus:outline-none ${
                  spo2Num !== undefined && spo2Num < 95
                    ? 'border-rose-500 bg-rose-50/40'
                    : 'border-slate-300 focus:border-teal-600'
                }`}
              />
              {spo2Num !== undefined && spo2Num < 95 && (
                <p className="text-xs font-bold text-rose-700 mt-1">
                  🚨 SpO2 dưới 95%: Cho người bệnh nằm đầu cao, hít thở sâu và kiểm tra đường thở ngay!
                </p>
              )}
            </div>
          )}

          <div className={isPediatric ? 'sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-2.5' : ''}>
            <div className="flex-1">
              <label className="block text-xs sm:text-sm font-extrabold text-slate-800 mb-1">
                🌡️ {isPostStroke ? '5. Thân nhiệt (°C)' : 'Thân nhiệt của bé (°C)'}{' '}
                <span className="font-semibold text-slate-600">(sốt khi &ge; 37.8°C)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min={34}
                max={43}
                value={temp}
                onChange={(e) => onChangeTemp(e.target.value)}
                placeholder="VD: 36.8"
                className={`w-full min-h-[48px] px-3 rounded-xl bg-white border-2 text-lg font-black text-slate-900 focus:outline-none ${
                  tempNum !== undefined && tempNum >= 38.5
                    ? 'border-rose-500 bg-rose-50/40'
                    : tempNum !== undefined && tempNum >= 37.5
                      ? 'border-amber-400 bg-amber-50/40'
                      : 'border-slate-300 focus:border-teal-600'
                }`}
              />
            </div>

            {isPediatric && !sys && !dia && (
              <button
                type="button"
                onClick={() => {
                  onChangeSys('100');
                  onChangeDia('65');
                }}
                className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-teal-100/70 border border-teal-300 text-xs sm:text-sm font-extrabold text-teal-900 shrink-0 cursor-pointer self-end"
              >
                ⚡ Điền HA chuẩn trẻ em (100/65) để lưu nhanh nhiệt độ
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chọn buổi đo & Ghi chú */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 items-end">
        <div className="sm:col-span-7">
          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
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
                  onClick={() => onChangePeriod(p)}
                  className={`min-h-[48px] min-w-[48px] rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border px-1 flex items-center justify-center gap-1 ${
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

        <div className="sm:col-span-5">
          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1">
            📝 Ghi chú thêm <span className="font-normal text-slate-600">(tuỳ chọn)</span>:
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => onChangeNote(e.target.value)}
            placeholder={
              isPostStroke
                ? 'VD: Sau tập đứng, khuyết sọ mềm...'
                : isPediatric
                  ? 'VD: Bé vừa uống hạ sốt lúc 14:00...'
                  : 'VD: Nghỉ 10 phút sau đi bộ...'
            }
            className="w-full min-h-[48px] text-sm sm:text-base font-medium text-slate-900 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl py-2 px-3 focus:outline-none focus:border-teal-600 placeholder:text-slate-400 transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
