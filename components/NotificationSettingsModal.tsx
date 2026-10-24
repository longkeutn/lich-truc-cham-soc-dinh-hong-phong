'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Send,
  RotateCcw,
} from 'lucide-react';
import { TimeSlot } from '@/lib/types';
import { TIME_SLOT_CONFIG } from '@/lib/config';
import {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFS,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  playNotificationSound,
  speakVietnameseReminder,
  sendPwaNotification,
} from '@/lib/notifications';

const TIME_SLOT_ORDER: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: NotificationPreferences;
  onSavePrefs: (next: NotificationPreferences) => void;
  onOpenInstallPwa?: () => void;
  showToast?: (message: string, type?: 'info' | 'success' | 'warn') => void;
}

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  prefs,
  onSavePrefs,
  onOpenInstallPwa,
  showToast,
}: NotificationSettingsModalProps) {
  const [draft, setDraft] = useState<NotificationPreferences>(prefs);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [isIosBrowserTab, setIsIosBrowserTab] = useState<boolean>(false);
  const [testingPush, setTestingPush] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(prefs);
    setPermission(getBrowserNotificationPermission());

    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      const isIos = /iphone|ipad|ipod/.test(ua);
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsIosBrowserTab(isIos && !isStandalone);
    }
  }, [isOpen, prefs]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      const updated = { ...draft, enabled: true, pwaPushEnabled: true };
      setDraft(updated);
      onSavePrefs(updated);
      playNotificationSound('success');
      await sendPwaNotification({
        title: '✅ Đã bật Thông Báo Sổ Sức Khỏe Bố!',
        body: 'Điện thoại sẽ tự động nhắc lịch đo huyết áp, uống thuốc và báo khi có chỉ số cần lưu ý.',
        tag: 'test-welcome-notif',
        url: '/#section-vitals',
      });
      showToast?.('🔔 Đã bật thông báo đẩy trên điện thoại thành công!', 'success');
    } else if (res === 'denied') {
      showToast?.('Trình duyệt đang chặn quyền thông báo. Hãy bật lại trong cài đặt trình duyệt.', 'warn');
    }
  };

  const handleTestNotification = async () => {
    setTestingPush(true);
    try {
      playNotificationSound('gentle');
      if (permission !== 'granted') {
        const res = await requestBrowserNotificationPermission();
        setPermission(res);
        if (res !== 'granted') {
          showToast?.('Đã phát âm chuông thử! Hãy cấp quyền thông báo để hiện trên màn hình khóa.', 'info');
          return;
        }
      }
      const sent = await sendPwaNotification({
        title: '🔔 Thông Báo Thử Nghiệm — Sổ Sức Khỏe Bố',
        body: 'Hộp thông báo đẩy PWA và âm báo chuông đang hoạt động tốt trên thiết bị này!',
        tag: `test-notif-${Date.now()}`,
        url: '/#section-routine',
      });
      if (sent) {
        showToast?.('📲 Đã gửi thông báo thử nghiệm ra màn hình thiết bị!', 'success');
      } else {
        showToast?.('Đã phát âm chuông thử nghiệm!', 'info');
      }
    } finally {
      setTestingPush(false);
    }
  };

  const handleTestVoice = () => {
    const ok = speakVietnameseReminder(
      'Xin chào! Đây là giọng đọc nhắc việc tự động của ứng dụng Sổ Sức Khỏe Bố Đinh Hồng Phong. Chúc bố và gia đình luôn mạnh khỏe.'
    );
    if (ok) {
      showToast?.('🗣️ Đang phát thử giọng đọc Tiếng Việt...', 'info');
    } else {
      showToast?.('Trình duyệt này chưa hỗ trợ giọng đọc tự động.', 'warn');
    }
  };

  const handleSlotTimeChange = (slot: TimeSlot, value: string) => {
    setDraft((prev) => ({
      ...prev,
      slotTimes: {
        ...prev.slotTimes,
        [slot]: value,
      },
    }));
  };

  const handleResetDefaultTimes = () => {
    setDraft((prev) => ({
      ...prev,
      slotTimes: { ...DEFAULT_NOTIFICATION_PREFS.slotTimes },
    }));
  };

  const handleSave = () => {
    onSavePrefs(draft);
    showToast?.('✅ Đã lưu cài đặt thông báo & giờ nhắc!', 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl p-4 sm:p-6 space-y-4 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-2xs shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Cài Đặt Thông Báo & Giờ Nhắc
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Kết hợp Thông báo đẩy PWA & Hộp nhắc âm thanh trong App
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. TRẠNG THÁI QUYỀN THÔNG BÁO ĐẨY TRÊN ĐIỆN THOẠI (PHƯƠNG ÁN 2) */}
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-teal-700" />
              <span>1. Thông báo đẩy trên màn hình điện thoại (PWA)</span>
            </span>
            {permission === 'granted' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-extrabold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã cấp quyền
              </span>
            ) : permission === 'denied' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-extrabold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Đang bị chặn
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-extrabold">
                Chưa bật
              </span>
            )}
          </div>

          {isIosBrowserTab && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
              <p className="font-bold">
                🍎 Lưu ý cho iPhone / iPad:
              </p>
              <p className="text-[11px] leading-relaxed">
                Để thông báo nổ trên màn hình khóa iPhone, bạn cần bấm <strong>Chia sẻ &rarr; Thêm vào MH chính</strong> rồi mở ứng dụng từ biểu tượng ngoài màn hình chính.
              </p>
              {onOpenInstallPwa && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInstallPwa();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer transition"
                >
                  Xem hướng dẫn Thêm vào MH chính
                </button>
              )}
            </div>
          )}

          {permission === 'default' && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition"
            >
              <Bell className="w-4 h-4" />
              <span>BẬT THÔNG BÁO TRÊN THIẾT BỊ NÀY</span>
            </button>
          )}

          {permission === 'denied' && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 font-medium">
              Thiết bị đang tắt quyền thông báo của trang web. Bạn hãy bấm vào biểu tượng ổ khóa 🔒 cạnh thanh địa chỉ trình duyệt và chuyển <strong>Thông báo (Notifications)</strong> sang <strong>Cho phép (Allow)</strong>.
            </p>
          )}

          {/* Hai nút kiểm tra nhanh: Gửi thử thông báo đẩy & Nghe thử giọng đọc */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              disabled={testingPush}
              onClick={handleTestNotification}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
            >
              <Send className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>Gửi thử thông báo & Chuông</span>
            </button>

            <button
              type="button"
              onClick={handleTestVoice}
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white hover:bg-teal-50 text-slate-800 border border-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span>Nghe thử giọng đọc TV</span>
            </button>
          </div>
        </div>

        {/* 2. KHUNG GIỜ NHẮC ĐO HUYẾT ÁP & UỐNG THUỐC 4 BUỔI */}
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-700" />
              <span>2. Khung giờ nhắc việc 4 buổi trong ngày</span>
            </span>
            <button
              type="button"
              onClick={handleResetDefaultTimes}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-teal-700 cursor-pointer"
              title="Đặt lại giờ mặc định"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Mặc định</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Đến giờ này mà buổi đó chưa đo huyết áp hoặc chưa tích đủ thuốc/bài tập, hệ thống sẽ phát chuông và bắn thông báo nhắc.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {TIME_SLOT_ORDER.map((slot) => {
              const cfg = TIME_SLOT_CONFIG[slot];
              return (
                <label
                  key={slot}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-extrabold text-slate-900 block">
                      {cfg.emoji} {cfg.label}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{cfg.timeRange}</span>
                  </div>
                  <input
                    type="time"
                    value={draft.slotTimes[slot] || '07:30'}
                    onChange={(e) => handleSlotTimeChange(slot, e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-300 bg-slate-50 text-xs font-black text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* 3. TUỲ CHỌN CÁC LOẠI CẢNH BÁO & ÂM THANH (PHƯƠNG ÁN 2 + 4) */}
        <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
          <span className="text-xs font-extrabold text-slate-800 block">
            3. Tuỳ chọn nội dung thông báo & Âm báo
          </span>

          <label className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.notifyOnHighBp}
              onChange={(e) => setDraft({ ...draft, notifyOnHighBp: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-teal-700 rounded cursor-pointer"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-900">🚨 Báo động khi Huyết áp / Nhịp tim bất thường</p>
              <p className="text-[11px] text-slate-500">
                Bắn thông báo khẩn và âm báo ngay khi chỉ số vượt ngưỡng Cảnh báo / Nguy hiểm
              </p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.notifyOnAllNewBp}
              onChange={(e) => setDraft({ ...draft, notifyOnAllNewBp: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-teal-700 rounded cursor-pointer"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-900">💓 Thông báo mỗi khi có kết quả đo HA mới</p>
              <p className="text-[11px] text-slate-500">
                Giúp máy của các con ở xa nhận thông báo khi Mẹ vừa đo huyết áp cho Bố
              </p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.notifyOnSlotReminder}
              onChange={(e) => setDraft({ ...draft, notifyOnSlotReminder: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-teal-700 rounded cursor-pointer"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-900">💊 Nhắc đo HA & uống thuốc theo 4 khung giờ</p>
              <p className="text-[11px] text-slate-500">
                Chỉ nhắc nếu tới giờ hẹn mà buổi đó chưa đo HA hoặc còn mục thuốc/tập chưa tích
              </p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.notifyOnAppointment}
              onChange={(e) => setDraft({ ...draft, notifyOnAppointment: e.target.checked })}
              className="mt-0.5 w-4 h-4 accent-teal-700 rounded cursor-pointer"
            />
            <div className="text-xs">
              <p className="font-bold text-slate-900">📅 Nhắc lịch tái khám sắp tới (trước 2 ngày)</p>
              <p className="text-[11px] text-slate-500">
                Tự động nhắc lịch tái khám của Bố vào buổi sáng để gia đình chuẩn bị
              </p>
            </div>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.soundEnabled}
                onChange={(e) => setDraft({ ...draft, soundEnabled: e.target.checked })}
                className="w-4 h-4 accent-teal-700 rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-900">🔊 Phát âm chuông nhẹ</span>
            </label>

            <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.autoVoiceEnabled}
                onChange={(e) => setDraft({ ...draft, autoVoiceEnabled: e.target.checked })}
                className="w-4 h-4 accent-teal-700 rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-900">🗣️ Tự đọc giọng Tiếng Việt</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer transition"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[42px] px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm cursor-pointer transition shadow-2xs"
          >
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}
