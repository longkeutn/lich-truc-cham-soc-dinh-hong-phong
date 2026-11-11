'use client';

import React from 'react';

interface AdminPinKeypadSectionProps {
  mode: 'unlock' | 'change';
  changeStep: 'old' | 'new' | 'confirm';
  pinTarget: 'category' | 'super_admin';
  currentDotsValue: string;
  errorMsg: string;
  successNotice: string;
  isSubmitting: boolean;
  onDigit: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
}

export default function AdminPinKeypadSection({
  mode,
  changeStep,
  pinTarget,
  currentDotsValue,
  errorMsg,
  successNotice,
  isSubmitting,
  onDigit,
  onClear,
  onBackspace,
}: AdminPinKeypadSectionProps) {
  return (
    <div className="p-5 flex flex-col items-center">
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 text-center">
        {mode === 'unlock' && <span>Nhập 4 chữ số mã PIN của bạn</span>}
        {mode === 'change' && changeStep === 'old' && (
          <span>
            Bước 1/3: Nhập{' '}
            <strong className="text-amber-600">
              {pinTarget === 'super_admin' ? 'PIN Admin hiện tại' : 'PIN Sửa danh mục hiện tại'}
            </strong>
          </span>
        )}
        {mode === 'change' && changeStep === 'new' && (
          <span>
            Bước 2/3: Nhập mã PIN <strong className="text-blue-600">mới (4 số)</strong>
          </span>
        )}
        {mode === 'change' && changeStep === 'confirm' && (
          <span>
            Bước 3/3: <strong className="text-emerald-600">Xác nhận lại</strong> PIN mới
          </span>
        )}
      </div>

      <div className="flex gap-4 my-2.5 items-center justify-center">
        {[0, 1, 2, 3].map((idx) => {
          const isFilled = idx < currentDotsValue.length;
          return (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                isFilled
                  ? 'bg-amber-600 border-amber-600 scale-125 shadow-md shadow-amber-500/30'
                  : 'border-slate-300 dark:border-slate-600 bg-transparent'
              }`}
            />
          );
        })}
      </div>

      <div className="min-h-[24px] flex items-center justify-center text-center px-2">
        {errorMsg && (
          <p className="text-xs font-bold text-rose-600 animate-fade-in flex items-center gap-1">
            ⚠️ {errorMsg}
          </p>
        )}
        {successNotice && (
          <p className="text-xs font-bold text-emerald-600 animate-fade-in flex items-center gap-1">
            ✓ {successNotice}
          </p>
        )}
        {!errorMsg && !successNotice && mode === 'unlock' && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Hệ thống tự nhận diện cấp quyền theo mã PIN bạn nhập
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mt-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            disabled={isSubmitting}
            onClick={() => onDigit(num)}
            className="min-h-[52px] rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/40 dark:hover:text-amber-300 text-xl font-bold text-slate-800 dark:text-slate-100 active:scale-90 transition shadow-sm border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-50 cursor-pointer"
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onClear}
          className="min-h-[52px] rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 active:scale-95 transition cursor-pointer"
        >
          Xoá hết
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onDigit('0')}
          className="min-h-[52px] rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/40 dark:hover:text-amber-300 text-xl font-bold text-slate-800 dark:text-slate-100 active:scale-90 transition shadow-sm border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-50 cursor-pointer"
        >
          0
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onBackspace}
          className="min-h-[52px] rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-lg font-bold active:scale-95 transition flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 cursor-pointer"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
