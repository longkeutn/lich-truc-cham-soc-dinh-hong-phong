'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  verifyAdminPinAction,
  changeAdminPinAction,
  verifyExpensePinAction,
  changeExpensePinAction,
} from '@/lib/actions';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Gọi khi mở khóa quyền Chỉnh sửa danh mục (PIN 1234) */
  onSuccess: () => void;
  /** Gọi khi mở khóa quyền Admin thực sự / Quản trị hệ thống (PIN 2468) */
  onExpenseSuccess?: () => void;
  /** Đang có quyền sửa danh mục (1234 hoặc 2468) */
  isAdmin?: boolean;
  /** Đang có quyền Admin thực sự (2468) */
  isSuperAdmin?: boolean;
  /** Khóa lại toàn bộ quyền */
  onLockAdmin?: () => void;
  /** Mở nhanh Sổ Thu Chi Nội Bộ (dành cho Admin thực sự) */
  onOpenExpenses?: () => void;
  /** Mở nhanh Cấu hình Google Sheets & Code.gs (dành cho Admin thực sự) */
  onOpenGuide?: () => void;
  initialMode?: 'unlock' | 'change';
}

export function AdminPinModal({
  isOpen,
  onClose,
  onSuccess,
  onExpenseSuccess,
  isAdmin,
  isSuperAdmin,
  onLockAdmin,
  onOpenExpenses,
  onOpenGuide,
  initialMode = 'unlock',
}: AdminPinModalProps) {
  const [mode, setMode] = useState<'unlock' | 'change'>(initialMode);
  const [pinTarget, setPinTarget] = useState<'category' | 'super_admin'>('super_admin');

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
      const [adminRes, isSuperAdminPinValid] = await Promise.all([
        verifyAdminPinAction(pinToTest),
        onExpenseSuccess ? verifyExpensePinAction(pinToTest) : Promise.resolve(false),
      ]);

      // Ưu tiên kiểm tra quyền Admin thực sự (Quản trị hệ thống + Sổ nội bộ + Code.gs)
      if (isSuperAdminPinValid && onExpenseSuccess) {
        setSuccessNotice('Đã mở quyền Quản trị viên cao cấp (Admin)!');
        setTimeout(() => {
          onExpenseSuccess();
          onClose();
        }, 350);
        return;
      }

      // Quyền chỉnh sửa danh mục cơ bản (thuốc, bài tập, thông tin bệnh nhân, thành viên)
      if (adminRes.success) {
        setSuccessNotice('Đã mở quyền Chỉnh sửa danh mục!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 350);
        return;
      }

      triggerShake('Mã PIN không chính xác');
      setPin('');
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
      const res =
        pinTarget === 'super_admin'
          ? await changeExpensePinAction(oldP, newP)
          : await changeAdminPinAction(oldP, newP);

      if (res.success) {
        setSuccessNotice(
          pinTarget === 'super_admin'
            ? 'Đổi mã PIN Quản trị viên (Admin) thành công!'
            : 'Đổi mã PIN Sửa danh mục thành công!'
        );
        setTimeout(() => {
          if (pinTarget === 'super_admin' && onExpenseSuccess) {
            onExpenseSuccess();
          } else {
            onSuccess();
          }
          onClose();
        }, 600);
      } else {
        triggerShake(res.message || 'Đổi PIN thất bại. Kiểm tra lại mã PIN hiện tại.');
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
        <div
          className={`text-white p-5 text-center relative ${
            isSuperAdmin
              ? 'bg-gradient-to-r from-indigo-700 via-teal-700 to-emerald-600'
              : 'bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500'
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition cursor-pointer"
            title="Đóng"
          >
            ✕
          </button>
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/20 flex items-center justify-center text-2xl mb-1.5 backdrop-blur-sm shadow-inner">
            {isSuperAdmin ? '👑' : isAdmin ? '✏️' : '🔒'}
          </div>
          <h3 className="text-lg font-black tracking-tight">
            {isSuperAdmin
              ? 'Quản Trị Viên Hệ Thống'
              : isAdmin
              ? 'Quyền Sửa Danh Mục'
              : 'Mở Khóa Phân Quyền'}
          </h3>
          <p className="text-xs text-white/90 mt-0.5">
            {mode === 'unlock'
              ? 'Nhập mã PIN Sửa danh mục hoặc mã PIN Admin quản trị'
              : 'Thay đổi mã PIN bảo mật'}
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
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              mode === 'unlock'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            🔒 Mở khóa / Lối tắt
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
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              mode === 'change'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            🔄 Đổi mã PIN
          </button>
        </div>

        {/* Bảng điều khiển nhanh khi đang có quyền (Sửa danh mục hoặc Admin thực sự) */}
        {(isAdmin || isSuperAdmin) && mode === 'unlock' && (
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                {isSuperAdmin ? (
                  <>
                    <span>👑</span>
                    <span className="text-teal-800">Đang bật: Admin Toàn Quyền</span>
                  </>
                ) : (
                  <>
                    <span>✏️</span>
                    <span className="text-amber-800">Đang bật: Quyền Sửa Danh Mục</span>
                  </>
                )}
              </span>
              {onLockAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onLockAdmin();
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition cursor-pointer shrink-0"
                >
                  🔒 Khóa lại
                </button>
              )}
            </div>

            {/* Lối tắt dành riêng cho Admin thực sự (PIN 2468) */}
            {isSuperAdmin ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {onOpenExpenses && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenExpenses();
                      onClose();
                    }}
                    className="px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>💰</span>
                    <span>Sổ Thu Chi</span>
                  </button>
                )}
                {onOpenGuide && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenGuide();
                      onClose();
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>📋</span>
                    <span>Code.gs & Sheet</span>
                  </button>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 leading-snug">
                Bạn đang có quyền thêm/sửa danh mục. Nhập mã PIN Quản trị viên bên dưới nếu cần mở <strong>Sổ Thu Chi</strong> hoặc <strong>Cấu hình Code.gs</strong>.
              </p>
            )}
          </div>
        )}

        {/* Chọn loại PIN muốn đổi khi ở tab Đổi mã PIN */}
        {mode === 'change' && (
          <div className="px-4 pt-3 pb-1">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setPinTarget('super_admin');
                  setChangeStep('old');
                  setOldPin('');
                  setNewPin('');
                  setConfirmPin('');
                  setErrorMsg('');
                }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  pinTarget === 'super_admin'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👑 PIN Admin (Toàn quyền)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinTarget('category');
                  setChangeStep('old');
                  setOldPin('');
                  setNewPin('');
                  setConfirmPin('');
                  setErrorMsg('');
                }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  pinTarget === 'category'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✏️ PIN Sửa danh mục
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5 flex flex-col items-center">
          {/* Instruction label */}
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

          {/* Dots representation */}
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

          {/* Status/Error messages */}
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
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Hệ thống tự nhận diện cấp quyền theo mã PIN bạn nhập
              </p>
            )}
          </div>

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                disabled={isSubmitting}
                onClick={() => handleDigit(num)}
                className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/40 dark:hover:text-amber-300 text-xl font-bold text-slate-800 dark:text-slate-100 active:scale-90 transition shadow-sm border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-50 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleClear}
              className="h-13 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95 transition cursor-pointer"
            >
              Xoá hết
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDigit('0')}
              className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-900/40 dark:hover:text-amber-300 text-xl font-bold text-slate-800 dark:text-slate-100 active:scale-90 transition shadow-sm border border-slate-200/50 dark:border-slate-700/50 disabled:opacity-50 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleBackspace}
              className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-lg font-bold active:scale-95 transition flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 cursor-pointer"
            >
              ⌫
            </button>
          </div>
        </div>

        {/* Footer info giải thích ngắn gọn 2 cấp quyền */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
          <div className="flex items-center justify-between">
            <span>✏️ <strong>Quyền Danh mục:</strong> Sửa thuốc, bài tập, thành viên</span>
          </div>
          <div className="flex items-center justify-between">
            <span>👑 <strong>Quyền Admin:</strong> Toàn quyền + Sổ nội bộ + Code.gs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
