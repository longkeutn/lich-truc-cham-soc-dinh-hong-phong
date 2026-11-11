'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, X } from 'lucide-react';

interface ExpensePinLockScreenProps {
  onVerifyPin: (pin: string) => Promise<boolean>;
  onUnlockSuccess: () => void;
  onBackToHealth?: () => void;
}

export function ExpensePinLockScreen({
  onVerifyPin,
  onUnlockSuccess,
  onBackToHealth,
}: ExpensePinLockScreenProps) {
  const [pinInput, setPinInput] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState('');

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('Vui lòng nhập mã PIN Sổ Thu Chi');
      return;
    }
    setIsVerifyingPin(true);
    setPinError('');
    try {
      const ok = await onVerifyPin(pinInput.trim());
      if (ok) {
        setPinInput('');
        onUnlockSuccess();
      } else {
        setPinError('Mã PIN Quản trị viên chưa đúng, vui lòng kiểm tra lại.');
      }
    } catch {
      setPinError('Không thể xác thực lúc này, vui lòng thử lại.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 sm:my-10 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
      <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto mb-4 text-teal-700">
        <Lock className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900 text-center">
        Sổ Theo Dõi Thu Chi Điều Trị
      </h2>
      <p className="text-sm text-slate-600 text-center mt-2 leading-relaxed">
        Đây là sổ ghi chép nội bộ các khoản viện phí, thuốc men và đóng góp trong quá trình điều trị của Bố.
        Sổ sử dụng <strong>mã PIN riêng biệt</strong> để tránh hiển thị công khai gây lo lắng cho người bệnh.
      </p>

      <form onSubmit={handleUnlockSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Nhập mã PIN Sổ Thu Chi
          </label>
          <div className="relative">
            <input
              type={showPinText ? 'text' : 'password'}
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError('');
              }}
              placeholder="Nhập mã PIN riêng của sổ..."
              autoFocus
              className="w-full min-h-[52px] px-4 py-3.5 pr-12 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-base font-bold text-slate-900 tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <button
              type="button"
              onClick={() => setShowPinText(!showPinText)}
              className="min-h-[48px] min-w-[48px] absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-600 hover:text-slate-900 cursor-pointer"
              aria-label="Ẩn/hiện mã PIN"
            >
              {showPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pinError && <p className="text-xs font-bold text-rose-600 mt-1.5">{pinError}</p>}
        </div>

        <button
          type="submit"
          disabled={isVerifyingPin}
          className="w-full min-h-[52px] py-3.5 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
        >
          <Unlock className="w-4 h-4" />
          <span>{isVerifyingPin ? 'Đang kiểm tra...' : 'Mở Sổ Thu Chi'}</span>
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-slate-100 text-center space-y-3">
        <p className="text-xs text-slate-600">
          🔒 Khu vực dành riêng cho <strong>Quản trị viên (Admin)</strong>. Mở khóa tại đây cũng sẽ cấp toàn quyền quản trị hệ thống &amp; xem cấu hình{' '}
          <code className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">Code.gs</code>.
        </p>
        {onBackToHealth && (
          <button
            type="button"
            onClick={onBackToHealth}
            className="min-h-[48px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            <span>← Quay lại Sổ Sức Khỏe</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface ExpenseChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChangePin: (oldPin: string, newPin: string) => Promise<{ success: boolean; message?: string }>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
}

export function ExpenseChangePinModal({
  isOpen,
  onClose,
  onChangePin,
  showToast,
}: ExpenseChangePinModalProps) {
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [changePinError, setChangePinError] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  if (!isOpen) return null;

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError('');
    if (!oldPinInput.trim() || !newPinInput.trim()) {
      setChangePinError('Vui lòng nhập đầy đủ mã PIN hiện tại và mã PIN mới.');
      return;
    }
    if (newPinInput.trim().length < 4) {
      setChangePinError('Mã PIN mới cần ít nhất 4 ký tự.');
      return;
    }
    if (newPinInput.trim() !== confirmNewPinInput.trim()) {
      setChangePinError('Mã PIN mới nhập lại chưa khớp.');
      return;
    }

    setIsChangingPin(true);
    try {
      const res = await onChangePin(oldPinInput.trim(), newPinInput.trim());
      if (res.success) {
        onClose();
        setOldPinInput('');
        setNewPinInput('');
        setConfirmNewPinInput('');
        showToast('Đã đổi mã PIN riêng cho Sổ Thu Chi thành công!', 'success');
      } else {
        setChangePinError(res.message || 'Mã PIN hiện tại không đúng.');
      }
    } finally {
      setIsChangingPin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900">🔑 Đổi Mã PIN Sổ Thu Chi</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleChangePinSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã PIN Sổ Thu Chi hiện tại
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={oldPinInput}
              onChange={(e) => setOldPinInput(e.target.value)}
              placeholder="Nhập PIN hiện tại (mặc định: 2468)"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mã PIN mới (tối thiểu 4 ký tự)
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={newPinInput}
              onChange={(e) => setNewPinInput(e.target.value)}
              placeholder="Nhập mã PIN mới..."
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Xác nhận lại mã PIN mới
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={confirmNewPinInput}
              onChange={(e) => setConfirmNewPinInput(e.target.value)}
              placeholder="Nhập lại mã PIN mới..."
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold"
            />
          </div>

          {changePinError && <p className="text-xs font-bold text-rose-600">{changePinError}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isChangingPin}
              className="min-h-[48px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold cursor-pointer"
            >
              {isChangingPin ? 'Đang lưu...' : 'Lưu mã PIN mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
