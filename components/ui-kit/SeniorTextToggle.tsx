'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Type } from 'lucide-react';

const STORAGE_KEY = 'care_senior_xl_text';
const SYNC_EVENT_NAME = 'care-senior-text-change';

export interface SeniorTextToggleProps {
  compact?: boolean;
  className?: string;
  onToggle?: (enabled: boolean) => void;
}

export function SeniorTextToggle({
  compact = false,
  className = '',
  onToggle,
}: SeniorTextToggleProps) {
  const [isLargeText, setIsLargeText] = useState<boolean>(false);

  useEffect(() => {
    const readInitial = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const enabled =
          saved === 'true' ||
          document.documentElement.classList.contains('senior-xl-text');
        setIsLargeText(enabled);
        if (enabled) {
          document.documentElement.classList.add('senior-xl-text');
        }
      } catch {
        // Bo qua loi truy cap localStorage tren trinh duyet an danh
      }
    };

    const handleExternalSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled?: boolean }>;
      if (typeof customEvent.detail?.enabled === 'boolean') {
        setIsLargeText(customEvent.detail.enabled);
      } else {
        setIsLargeText(document.documentElement.classList.contains('senior-xl-text'));
      }
    };

    readInitial();
    window.addEventListener(SYNC_EVENT_NAME, handleExternalSync);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleExternalSync);
    };
  }, []);

  const handleToggle = useCallback(() => {
    const next = !isLargeText;
    setIsLargeText(next);
    try {
      if (next) {
        document.documentElement.classList.add('senior-xl-text');
        localStorage.setItem(STORAGE_KEY, 'true');
      } else {
        document.documentElement.classList.remove('senior-xl-text');
        localStorage.setItem(STORAGE_KEY, 'false');
      }
      window.dispatchEvent(
        new CustomEvent(SYNC_EVENT_NAME, { detail: { enabled: next } })
      );
    } catch {
      // Bo qua loi luu tru cuc bo
    }
    onToggle?.(next);
  }, [isLargeText, onToggle]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={isLargeText}
      title="Bật hoặc tắt chế độ Chữ To dành cho người cao tuổi"
      className={`min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl text-xs sm:text-sm font-extrabold border inline-flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 ${
        isLargeText
          ? 'bg-medical-primary hover:bg-medical-dark text-white border-medical-dark shadow-2xs'
          : 'bg-slate-100 hover:bg-slate-200 text-text-body border-slate-300'
      } ${className}`}
    >
      <Type className="w-4 h-4 shrink-0" />
      {compact ? (
        <span>{isLargeText ? 'A+ BẬT' : 'A+'}</span>
      ) : (
        <>
          <span className="sm:hidden">{isLargeText ? 'Chữ To' : 'A+'}</span>
          <span className="hidden sm:inline">
            {isLargeText ? 'Chữ To: BẬT' : 'Chữ To'}
          </span>
        </>
      )}
    </button>
  );
}

export default SeniorTextToggle;
