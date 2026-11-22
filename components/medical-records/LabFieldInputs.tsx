'use client';

import React from 'react';

export function UnitToggleGroup<U extends string>({
  label,
  unit,
  options,
  onSelect,
}: {
  label?: string;
  unit: U;
  options: readonly [U, U];
  onSelect: (next: U) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {label ? <span className="font-bold text-text-body text-sm">{label}:</span> : null}
      {options.map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => onSelect(u)}
          className={`min-h-[48px] min-w-[60px] px-2.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold border transition cursor-pointer ${
            unit === u
              ? 'bg-medical-primary text-white border-medical-dark shadow-2xs'
              : 'bg-surface-card text-text-body border-border-card hover:bg-slate-100'
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

export function LabMetricInput({
  label,
  subHint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  subHint?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-base font-extrabold text-text-body mb-1">
        {label}
        {subHint ? (
          <span className="text-xs sm:text-sm font-semibold text-text-muted ml-1">
            ({subHint})
          </span>
        ) : null}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Để trống nếu không đo'}
        className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card focus:outline-none focus:ring-2 focus:ring-medical-primary"
      />
    </div>
  );
}

export function LabUnitMetricField<U extends string>({
  label,
  value,
  onChange,
  unit,
  options,
  onUnitChange,
  placeholder,
  refHint,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  unit: U;
  options: readonly [U, U];
  onUnitChange: (nextUnit: U) => void;
  placeholder?: string;
  refHint?: string;
}) {
  return (
    <div className="rounded-xl border border-indigo-200/80 bg-surface-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <label className="block text-base font-extrabold text-text-main">{label}</label>
          {refHint ? (
            <span className="block text-xs sm:text-sm font-semibold text-text-muted">
              Chuẩn: {refHint}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label={`Đơn vị ${label}`}>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onUnitChange(opt)}
              className={`min-h-[48px] min-w-[64px] px-3 py-2 rounded-xl text-sm font-extrabold border transition cursor-pointer ${
                unit === opt
                  ? 'bg-thyroid-accent text-white border-indigo-700 shadow-2xs'
                  : 'bg-slate-50 hover:bg-indigo-50 text-text-body border-border-card'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Nhập ${label} (${unit})`}
        className="w-full min-h-[48px] px-3 rounded-xl border border-border-card text-base font-bold text-text-main bg-surface-card focus:outline-none focus:ring-2 focus:ring-medical-primary"
      />
    </div>
  );
}
