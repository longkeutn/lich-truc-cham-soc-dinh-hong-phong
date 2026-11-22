'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import type { LabMedicalGuide } from '@/lib/labMedicalGuides';

export interface MedicalInfoToggleProps {
  guide: LabMedicalGuide;
  /** Khi chỉ số đang cao/bất thường, đổi màu nút thành cảnh báo để bố chú ý bấm xem tác hại */
  isWarning?: boolean;
  /** Nhãn ngắn trên nút để người lớn tuổi nhìn là biết bấm vào sẽ ra giải thích */
  buttonLabel?: string;
  /** Chế độ siêu gọn khi đặt cạnh nhãn ô nhập liệu */
  compact?: boolean;
  className?: string;
}

/**
 * Nút icon kèm chữ gợi ý rõ ràng cho người lớn tuổi:
 * nhìn vào biết ngay bấm để mở giải thích y khoa & cảnh báo tác hại.
 */
export function MedicalInfoToggle({
  guide,
  isWarning = false,
  buttonLabel,
  compact = false,
  className = '',
}: MedicalInfoToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const defaultLabel = isWarning ? 'Xem tác hại' : 'Giải thích';
  const resolvedLabel = buttonLabel || defaultLabel;

  const btnStyle = isOpen
    ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
    : isWarning
      ? 'bg-amber-50 hover:bg-amber-100 text-amber-950 border-amber-300 shadow-2xs'
      : 'bg-teal-50/90 hover:bg-teal-100 text-teal-900 border-teal-300 shadow-2xs';

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={`${isOpen ? 'Ẩn' : 'Xem'} giải thích và tác hại: ${guide.title}`}
        className={`inline-flex items-center gap-1 rounded-full border font-extrabold transition cursor-pointer select-none active:scale-95 ${
          compact
            ? 'min-h-[34px] px-2.5 py-1 text-[11px] sm:text-xs'
            : 'min-h-[38px] px-3 py-1 text-xs sm:text-sm'
        } ${btnStyle}`}
      >
        {isWarning && !isOpen ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        ) : (
          <HelpCircle
            className={`w-3.5 h-3.5 shrink-0 ${isOpen ? 'text-amber-300' : 'text-teal-700'}`}
          />
        )}
        <span>{isOpen ? 'Thu gọn' : resolvedLabel}</span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
        )}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label={`Giải thích y khoa: ${guide.title}`}
          className="mt-2.5 rounded-2xl border-2 border-teal-300 bg-white p-3.5 space-y-2 text-xs sm:text-sm text-slate-800 shadow-sm leading-relaxed"
        >
          <div className="font-black text-teal-950 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{guide.title}</span>
          </div>

          <p className="text-slate-700">
            <strong className="text-slate-900">• Chỉ số này là gì:</strong> {guide.whatItIs}
          </p>

          <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-2.5 text-amber-950">
            <div className="font-black flex items-center gap-1.5 text-amber-900 mb-0.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Ảnh hưởng &amp; Tác hại nếu bất thường:</span>
            </div>
            <p>{guide.harmWarning}</p>
          </div>

          <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-2.5 text-emerald-950">
            <div className="font-black flex items-center gap-1.5 text-emerald-900 mb-0.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Mức an toàn &amp; Lưu ý sinh hoạt:</span>
            </div>
            <p>{guide.safeTargetAndTips}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MedicalInfoToggle;
