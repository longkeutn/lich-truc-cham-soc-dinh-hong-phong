'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';

export type SyncStateKind = 'synced' | 'syncing' | 'offline' | 'error';

export interface OfflineSyncIndicatorProps {
  status?: SyncStateKind;
  pendingCount?: number;
  lastSyncedLabel?: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

export function OfflineSyncIndicator({
  status = 'synced',
  pendingCount = 0,
  lastSyncedLabel,
  onRetry,
  compact = false,
  className = '',
}: OfflineSyncIndicatorProps) {
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsBrowserOnline(navigator.onLine);
    }
    const handleOnline = () => setIsBrowserOnline(true);
    const handleOffline = () => setIsBrowserOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const effectiveStatus: SyncStateKind = !isBrowserOnline ? 'offline' : status;

  if (effectiveStatus === 'syncing') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-medical-surface border border-medical-border text-medical-dark text-xs sm:text-sm font-bold ${className}`}
      >
        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
        <span>{compact ? 'Đang lưu...' : 'Đang đồng bộ Google Sheets...'}</span>
      </div>
    );
  }

  if (effectiveStatus === 'offline') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-vital-warning-bg border border-amber-300 text-amber-900 text-xs sm:text-sm font-bold ${className}`}
      >
        <WifiOff className="w-4 h-4 text-vital-warning shrink-0" />
        <span>
          {compact
            ? 'Mất mạng (Giữ tạm)'
            : `Đang ngoại tuyến - Dữ liệu giữ an toàn trên máy${
                pendingCount > 0 ? ` (${pendingCount} mục chờ)` : ''
              }`}
        </span>
      </div>
    );
  }

  if (effectiveStatus === 'error') {
    return (
      <div
        role="alert"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-vital-danger-bg border border-rose-300 text-rose-900 text-xs sm:text-sm font-bold flex-wrap ${className}`}
      >
        <AlertTriangle className="w-4 h-4 text-vital-danger shrink-0" />
        <span>
          {compact
            ? 'Lỗi đồng bộ Sheet'
            : 'Chưa lưu được vào Google Sheets. Dữ liệu đang giữ tạm trên máy'}
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 text-sm font-extrabold transition cursor-pointer"
          >
            Thử lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-vital-safe-bg border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold ${className}`}
    >
      <CheckCircle2 className="w-4 h-4 text-vital-safe shrink-0" />
      <span>
        {compact
          ? 'Đã lưu Sheet'
          : lastSyncedLabel
            ? `Đã đồng bộ (${lastSyncedLabel})`
            : 'Đã đồng bộ Google Sheets'}
      </span>
    </div>
  );
}

export default OfflineSyncIndicator;
