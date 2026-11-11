'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { CareRoutine } from '@/lib/types';

export interface MedicinePhotoLightboxProps {
  routine: CareRoutine | null;
  onClose: () => void;
}

export function MedicinePhotoLightbox({
  routine,
  onClose,
}: MedicinePhotoLightboxProps) {
  if (!routine || !routine.imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
      >
        <div className="px-4 py-3 bg-teal-800 text-white flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm sm:text-base font-black truncate">{routine.title}</h4>
            {routine.dosage && (
              <p className="text-xs text-teal-100 font-semibold truncate">
                Liều lượng: {routine.dosage}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng ảnh thuốc"
            className="min-h-[48px] min-w-[48px] rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-50 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={routine.imageUrl}
            alt={routine.title}
            className="max-h-[55vh] w-auto rounded-2xl object-contain border border-slate-200 bg-white"
          />
        </div>

        <div className="p-4 space-y-1.5 text-xs sm:text-sm text-slate-800">
          {routine.description && (
            <p className="font-semibold text-slate-700">🔎 Nhận diện: {routine.description}</p>
          )}
          {routine.instructions && (
            <p className="font-bold text-teal-900">💡 Cách dùng: {routine.instructions}</p>
          )}
          {routine.conditionNote && (
            <p className="font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2">
              ⚠️ Lưu ý: {routine.conditionNote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
