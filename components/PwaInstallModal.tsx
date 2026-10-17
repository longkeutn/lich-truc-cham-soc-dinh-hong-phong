'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, PlusSquare, CheckCircle2, X, ExternalLink } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PwaInstallModal({ isOpen, onClose }: PwaInstallModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [activeDeviceTab, setActiveDeviceTab] = useState<'ios' | 'android'>('ios');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Đăng ký Service Worker (Network-first, không lưu cache dữ liệu cũ)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('[PWA] Không thể đăng ký Service Worker:', err));
    }

    // 2. Kiểm tra nếu đã mở ở chế độ App độc lập (Standalone)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // 3. Tự động nhận diện thiết bị iOS hay Android để mở đúng tab hướng dẫn
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setActiveDeviceTab('ios');
    } else {
      setActiveDeviceTab('android');
    }

    // 4. Lắng nghe sự kiện cài đặt PWA tự động trên Android / Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-4 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-md shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Cài Ứng Dụng Lên Điện Thoại
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Mở nhanh 1 chạm từ màn hình chính như ứng dụng thật
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

        {/* Trạng thái đã cài đặt */}
        {isInstalled && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-900 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Thiết bị này đang mở Sổ Sức Khỏe Bố ở chế độ Ứng dụng!</span>
          </div>
        )}

        {/* Nút cài đặt 1 chạm nếu trình duyệt hỗ trợ (Android Chrome / Edge) */}
        {deferredPrompt && (
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 space-y-2.5">
            <p className="text-xs font-bold text-rose-900">
              ✨ Trình duyệt của bạn hỗ trợ cài đặt trực tiếp:
            </p>
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-[0.98] transition"
            >
              <Download className="w-5 h-5" />
              <span>CÀI ĐẶT ỨNG DỤNG NGAY</span>
            </button>
          </div>
        )}

        {/* Chuyển tab hướng dẫn iPhone vs Android */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveDeviceTab('ios')}
            className={`min-h-[42px] py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeDeviceTab === 'ios'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🍎 iPhone / iPad
          </button>
          <button
            type="button"
            onClick={() => setActiveDeviceTab('android')}
            className={`min-h-[42px] py-2 px-3 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeDeviceTab === 'android'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🤖 Điện thoại Android
          </button>
        </div>

        {/* Nội dung hướng dẫn chi tiết */}
        {activeDeviceTab === 'ios' ? (
          <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Lưu ý: Hãy mở trang web này bằng trình duyệt <strong>Safari</strong> trên iPhone.</span>
            </div>

            <div className="space-y-3 text-sm text-slate-800">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-bold text-slate-900">
                    Bấm nút Chia sẻ (Share) ở thanh dưới cùng Safari
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    Biểu tượng hình vuông có mũi tên hướng lên <Share className="w-3.5 h-3.5 inline text-blue-600" />
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-bold text-slate-900">
                    Vuốt lên và chọn &ldquo;Thêm vào MH chính&rdquo; (Add to Home Screen)
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    Biểu tượng dấu cộng trong ô vuông <PlusSquare className="w-3.5 h-3.5 inline text-slate-700" />
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-bold text-slate-900">
                    Bấm chữ &ldquo;Thêm&rdquo; (Add) ở góc trên bên phải
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Biểu tượng <strong>❤️ Sức Khỏe Bố</strong> sẽ hiện ngay trên màn hình chính điện thoại của Mẹ!
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Nếu bạn đang mở từ Zalo/Messenger, hãy bấm dấu <strong>⋯</strong> góc trên và chọn <strong>&ldquo;Mở bằng trình duyệt Chrome&rdquo;</strong>.</span>
            </div>

            <div className="space-y-3 text-sm text-slate-800">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="font-bold text-slate-900">
                    Bấm vào biểu tượng 3 dấu chấm dọc (⋮) ở góc trên bên phải Chrome
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="font-bold text-slate-900">
                    Chọn &ldquo;Cài đặt ứng dụng&rdquo; hoặc &ldquo;Thêm vào màn hình chính&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="font-bold text-slate-900">
                    Bấm &ldquo;Cài đặt&rdquo; để hoàn tất
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ứng dụng <strong>❤️ Sức Khỏe Bố</strong> sẽ xuất hiện trên màn hình chính điện thoại như một App độc lập.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[46px] py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm cursor-pointer transition"
        >
          Đã hiểu
        </button>
      </div>
    </div>
  );
}
