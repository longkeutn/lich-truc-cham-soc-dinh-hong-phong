'use client';

import React, { useState, useEffect, useRef } from 'react';
import { verifyAdminPinAction, changeAdminPinAction } from '@/lib/actions';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: 'unlock' | 'change';
}

export function AdminPinModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'unlock',
}: AdminPinModalProps) {
  const [mode, setMode] = useState<'unlock' | 'change'>(initialMode);
  
  // Unlock state
  const [pin, setPin] = useState('');
  
  // Change PIN state
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changeStep, setChangeStep] = useState<'old' | 'new' | 'confirm'>('old');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setPin('');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setChangeStep('old');
      setErrorMsg('');
      setSuccessNotice('');
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const triggerShake = (msg: string) => {
    setErrorMsg(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleDigit = (digit: string) => {
    setErrorMsg('');
    if (mode === 'unlock') {
      if (pin.length < 6) {
        const next = pin + digit;
        setPin(next);
        if (next.length === 4) {
          submitUnlock(next);
        }
      }
    } else {
      // mode === 'change'
      if (changeStep === 'old') {
        const next = oldPin + digit;
        if (next.length <= 6) {
          setOldPin(next);
          if (next.length === 4) {
            // Auto advance
            setChangeStep('new');
          }
        }
      } else if (changeStep === 'new') {
        const next = newPin + digit;
        if (next.length <= 6) {
          setNewPin(next);
          if (next.length === 4) {
            setChangeStep('confirm');
          }
        }
      } else {
        const next = confirmPin + digit;
        if (next.length <= 6) {
          setConfirmPin(next);
          if (next.length === 4) {
            submitChangePin(oldPin, newPin, next);
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    if (mode === 'unlock') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      if (changeStep === 'confirm') {
        if (confirmPin.length > 0) setConfirmPin((prev) => prev.slice(0, -1));
        else setChangeStep('new');
      } else if (changeStep === 'new') {
        if (newPin.length > 0) setNewPin((prev) => prev.slice(0, -1));
        else setChangeStep('old');
      } else {
        setOldPin((prev) => prev.slice(0, -1));
      }
    }
  };

  const handleClear = () => {
    setErrorMsg('');
    if (mode === 'unlock') {
      setPin('');
    } else {
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setChangeStep('old');
    }
  };

  const submitUnlock = async (pinToTest: string) => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await verifyAdminPinAction(pinToTest);
      if (res.success) {
        setSuccessNotice('Xác thực thành công!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 400);
      } else {
        triggerShake(res.message || 'Mã PIN không đúng');
        setPin('');
      }
    } catch {
      triggerShake('Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitChangePin = async (oldP: string, newP: string, confP: string) => {
    if (newP !== confP) {
      triggerShake('Mã PIN mới nhập lại không khớp');
      setConfirmPin('');
      return;
    }
    if (newP.length < 4) {
      triggerShake('Mã PIN mới phải có ít nhất 4 chữ số');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await changeAdminPinAction(oldP, newP);
      if (res.success) {
        setSuccessNotice('Đổi mã PIN Admin thành công!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 600);
      } else {
        triggerShake(res.message || 'Đổi PIN thất bại. Kiểm tra mã PIN cũ.');
        setChangeStep('old');
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
      }
    } catch {
      triggerShake('Lỗi kết nối khi đổi mã PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handleDigit(e.key);
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const currentDotsValue =
    mode === 'unlock'
      ? pin
      : changeStep === 'old'
      ? oldPin
      : changeStep === 'new'
      ? newPin
      : confirmPin;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      ref={inputRef}
    >
      <div
        className={`bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 ${
          shake ? 'animate-shake' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white p-5 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition"
            title="Đóng"
          >
            ✕
          </button>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 flex items-center justify-center text-3xl mb-2 backdrop-blur-sm shadow-inner">
            👑
          </div>
          <h3 className="text-xl font-black tracking-tight">Quyền Quản Trị Viên</h3>
          <p className="text-xs text-amber-100 mt-1">
            {mode === 'unlock'
              ? 'Nhập mã PIN để chỉnh sửa thông tin quan trọng'
              : 'Thiết lập mã PIN bảo mật mới'}
          </p>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('unlock');
              setPin('');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              mode === 'unlock'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            🔒 Nhập mã PIN
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('change');
              setChangeStep('old');
              setOldPin('');
              setNewPin('');
              setConfirmPin('');
              setErrorMsg('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              mode === 'change'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            🔄 Đổi mã PIN
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          {/* Instruction label */}
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-3 text-center">
            {mode === 'unlock' && (
              <span>Vui lòng nhập 4 chữ số PIN</span>
            )}
            {mode === 'change' && changeStep === 'old' && (
              <span>Bước 1/3: Nhập mã PIN <strong className="text-amber-600">hiện tại</strong></span>
            )}
            {mode === 'change' && changeStep === 'new' && (
              <span>Bước 2/3: Nhập mã PIN <strong className="text-blue-600">mới</strong></span>
            )}
            {mode === 'change' && changeStep === 'confirm' && (
              <span>Bước 3/3: <strong className="text-emerald-600">Xác nhận lại</strong> PIN mới</span>
            )}
          </div>

          {/* Dots representation */}
          <div className="flex gap-4 my-3 items-center justify-center">
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

          {/* Status/Error messages */}
          <div className="h-6 flex items-center justify-center text-center px-2">
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
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                (Mã PIN mặc định: <code className="font-mono font-bold text-slate-600 dark:text-slate-300">1234</code>)
              </p>
            )}
          </div>

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mt-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDigit(num)}
                className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/40 dark:hover:text-amber-300 text-xl font-bold text-slate-800 dark:text-slate-100 active:scale-90 transition shadow-sm border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleClear}
              className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95 transition"
            >
              Xoá hết
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDigit('0')}
              className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/40 dark:hover:text-amber-300 text-xl font-bold text-slate-800 dark:text-slate-100 active:scale-90 transition shadow-sm border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleBackspace}
              className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-lg font-bold active:scale-95 transition flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50"
            >
              ⌫
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Khóa bảo vệ: Tránh sửa nhầm thông tin bệnh án & danh sách người trực
          </p>
        </div>
      </div>
    </div>
  );
}
