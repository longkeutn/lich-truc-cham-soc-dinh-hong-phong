import { Dumbbell, HandHelping, Pill } from 'lucide-react';
import type { CareRoutine, RoutineCategory, TimeSlot } from '@/lib/types';
import { getVietnamDateStr } from '@/lib/config';

/** Tự động chuyển link chia sẻ Google Drive sang link ảnh trực tiếp */
export function normalizeImageUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const driveMatch =
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  }
  return trimmed;
}

/** Nén ảnh từ máy/điện thoại sang Base64 nhỏ gọn (~15-25KB) để lưu trực tiếp vào Google Sheets */
export function compressImageToDataUrl(file: File, maxDim = 420, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không thể khởi tạo bộ xử lý ảnh'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Không thể đọc file ảnh'));
      img.src = String(e.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Lỗi đọc file'));
    reader.readAsDataURL(file);
  });
}

export const CATEGORY_CONFIG: Record<
  RoutineCategory,
  { label: string; emoji: string; icon: typeof Pill; color: string; pillClass: string }
> = {
  meds: {
    label: 'Thuốc',
    emoji: '💊',
    icon: Pill,
    color: 'text-blue-700',
    pillClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  rehab: {
    label: 'Tập phục hồi',
    emoji: '🏃',
    icon: Dumbbell,
    color: 'text-amber-700',
    pillClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  care: {
    label: 'Chăm sóc',
    emoji: '🧹',
    icon: HandHelping,
    color: 'text-emerald-700',
    pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
};

export const TIME_SLOT_PILL_COLORS: Record<TimeSlot, string> = {
  morning: 'bg-orange-100 text-orange-800 border-orange-300',
  noon: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  afternoon: 'bg-sky-100 text-sky-800 border-sky-300',
  evening: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

export const ALL_TIME_SLOTS: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];

export function createEmptyForm(stageId: string, stageName: string): CareRoutine {
  const todayStr = getVietnamDateStr();
  const now = new Date().toISOString();
  return {
    id: '',
    stageId,
    stageName,
    category: 'meds',
    medType: 'scheduled',
    title: '',
    dosage: '',
    description: '',
    imageUrl: '',
    timeSlots: [],
    instructions: '',
    conditionNote: '',
    isActive: true,
    sortOrder: 1,
    createdAt: todayStr,
    updatedAt: now,
  };
}
