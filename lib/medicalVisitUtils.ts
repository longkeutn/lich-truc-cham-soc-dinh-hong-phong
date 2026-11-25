import type {
  CareRoutine,
  HealthProfileType,
  LabResultEntry,
  MedicalVisitMedication,
  MedicalVisitOutcomeStatus,
  MedicalVisitType,
  TimeSlot,
} from './types';
import {
  ensureRecordProfilePrefix,
  extractRoutineStartDateStr,
  normalizeDateStr,
} from './config';

/** Cộng/trừ số ngày cho chuỗi YYYY-MM-DD mà không bị lệch múi giờ */
export function stepDateStr(dateStr: string, offsetDays: number): string {
  const norm = normalizeDateStr(dateStr);
  const parts = norm.split('-').map(Number);
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return dateStr;
  const utcNoon = new Date(
    Date.UTC(parts[0], parts[1] - 1, parts[2] + offsetDays, 12, 0, 0)
  );
  const y = utcNoon.getUTCFullYear();
  const m = String(utcNoon.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcNoon.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Tính số ngày chênh lệch (toDate - fromDate) giữa 2 chuỗi YYYY-MM-DD */
export function diffDaysStr(fromDateStr: string, toDateStr: string): number {
  const f = normalizeDateStr(fromDateStr).split('-').map(Number);
  const t = normalizeDateStr(toDateStr).split('-').map(Number);
  if (f.length !== 3 || t.length !== 3) return 0;
  const fromUtc = Date.UTC(f[0], f[1] - 1, f[2]);
  const toUtc = Date.UTC(t[0], t[1] - 1, t[2]);
  return Math.round((toUtc - fromUtc) / 86400000);
}

/** Định dạng DD/MM/YYYY từ YYYY-MM-DD */
export function formatShortVnDate(dateStr?: string): string {
  if (!dateStr) return '';
  const norm = normalizeDateStr(dateStr);
  const parts = norm.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Định dạng DD/MM ngắn gọn */
export function formatCompactDayMonth(dateStr?: string): string {
  if (!dateStr) return '';
  const norm = normalizeDateStr(dateStr);
  const parts = norm.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

export interface RoutineCourseProgress {
  startStr: string;
  endStr: string;
  durationDays?: number;
  currentDay?: number;
  isBeforeStart: boolean;
  isExpired: boolean;
  isLastDay: boolean;
  badgeText?: string;
}

/**
 * Tính toán tiến độ liệu trình ngắn ngày (VD: Ngày 3/5, Ngày cuối 5/5, Đã hết đợt).
 */
export function getRoutineCourseProgress(
  routine: CareRoutine,
  dateStr: string
): RoutineCourseProgress {
  const targetDate = normalizeDateStr(dateStr);
  const startStr = extractRoutineStartDateStr(routine.createdAt, routine.id);
  const explicitEnd = routine.endDate ? normalizeDateStr(routine.endDate) : '';
  const durationDays =
    routine.durationDays && routine.durationDays > 0
      ? routine.durationDays
      : startStr && explicitEnd && explicitEnd >= startStr
        ? diffDaysStr(startStr, explicitEnd) + 1
        : undefined;

  const endStr =
    explicitEnd ||
    (startStr && durationDays && durationDays > 0
      ? stepDateStr(startStr, durationDays - 1)
      : '');

  const isBeforeStart = Boolean(startStr && targetDate && targetDate < startStr);
  const isExpired = Boolean(endStr && targetDate && targetDate > endStr);
  const isLastDay = Boolean(endStr && targetDate && targetDate === endStr);

  let currentDay: number | undefined;
  if (startStr && targetDate && !isBeforeStart) {
    currentDay = diffDaysStr(startStr, targetDate) + 1;
    if (durationDays && currentDay > durationDays) {
      currentDay = durationDays;
    }
  }

  let badgeText: string | undefined;
  if (durationDays && currentDay !== undefined && !isExpired && !isBeforeStart) {
    badgeText = isLastDay
      ? `Ngày cuối (${currentDay}/${durationDays})`
      : `Ngày ${currentDay}/${durationDays}`;
  } else if (isExpired && endStr) {
    badgeText = `Đã hết đợt (${formatCompactDayMonth(endStr)})`;
  } else if (durationDays) {
    badgeText = `Đợt ${durationDays} ngày`;
  } else if (endStr) {
    badgeText = `Đến ${formatCompactDayMonth(endStr)}`;
  }

  return {
    startStr,
    endStr,
    durationDays,
    currentDay,
    isBeforeStart,
    isExpired,
    isLastDay,
    badgeText,
  };
}

/**
 * Kiểm tra xem thuốc/đầu việc có đang hiệu lực vào ngày `dateStr` không.
 * Tự động ẩn khỏi lịch hôm nay nếu đã qua `endDate` (hoặc quá `durationDays`),
 * nhưng vẫn giữ lại khi xem ngày quá khứ có log đã tích hoặc nằm trong khoảng liệu trình.
 */
export function isRoutineActiveOnDate(
  routine: CareRoutine,
  dateStr: string,
  options?: {
    hasLogOnDate?: boolean;
    hasEarlierLog?: boolean;
    todayStr?: string;
  }
): boolean {
  if (!routine.isActive) return false;
  const targetDate = normalizeDateStr(dateStr);
  if (!targetDate) return true;

  const hasLogOnDate = Boolean(options?.hasLogOnDate);
  if (hasLogOnDate) return true;

  const progress = getRoutineCourseProgress(routine, targetDate);

  // Đã qua ngày kết thúc liệu trình -> tự ẩn khỏi checklist
  if (progress.isExpired) {
    return false;
  }

  // Nếu có visitId hoặc ngày bắt đầu tường minh (YYYY-MM-DD) và chưa tới ngày bắt đầu
  const rawCreated = String(routine.createdAt || '').trim();
  const isExplicitDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(rawCreated);
  const today = options?.todayStr ? normalizeDateStr(options.todayStr) : '';

  if (progress.isBeforeStart) {
    if (routine.visitId || isExplicitDateOnly) {
      return false;
    }
    if (today && targetDate < today && !options?.hasEarlierLog) {
      return false;
    }
  }

  return true;
}

/**
 * Chuyển đổi 1 thuốc trong Đơn khám thành đối tượng `CareRoutine` để đưa ra Checklist Hôm Nay.
 */
export function buildCareRoutineFromVisitMed(params: {
  med: MedicalVisitMedication;
  visitEntry: LabResultEntry;
  profileId: string;
  stageId: string;
  stageName: string;
  sortOrder: number;
}): CareRoutine {
  const { med, visitEntry, profileId, stageId, stageName, sortOrder } = params;
  const visitDate = normalizeDateStr(visitEntry.date);
  const durationDays =
    med.durationDays && med.durationDays > 0 ? Math.round(med.durationDays) : undefined;
  const endDate =
    durationDays && visitDate ? stepDateStr(visitDate, durationDays - 1) : undefined;
  const cleanSlots: TimeSlot[] =
    med.medType === 'as_needed'
      ? []
      : (Array.isArray(med.timeSlots) ? med.timeSlots : []).filter(
          (s): s is TimeSlot =>
            s === 'morning' || s === 'noon' || s === 'afternoon' || s === 'evening'
        );

  const rawId =
    med.syncedRoutineId ||
    `routine-visit-${Date.now()}-${sortOrder}-${Math.random().toString(36).slice(2, 6)}`;
  const scopedId = ensureRecordProfilePrefix(rawId, profileId);

  const diagnosisLabel = visitEntry.medicalVisit?.diagnosis?.trim();
  const facilityLabel = visitEntry.facility?.trim();
  const contextParts = [
    diagnosisLabel ? `Đợt khám: ${diagnosisLabel}` : '',
    facilityLabel ? facilityLabel : '',
    visitDate ? `(${formatCompactDayMonth(visitDate)})` : '',
  ].filter(Boolean);

  return {
    id: scopedId,
    stageId: stageId || 'stage-1',
    stageName: stageName || 'Tại nhà',
    category: 'meds',
    medType: med.medType === 'as_needed' ? 'as_needed' : 'scheduled',
    title: med.title.trim(),
    dosage: (med.dosage || '').trim(),
    description: contextParts.join(' · '),
    imageUrl: '',
    timeSlots: cleanSlots.length > 0 || med.medType === 'as_needed' ? cleanSlots : ['morning'],
    instructions: (med.instructions || '').trim(),
    conditionNote: (med.conditionNote || '').trim(),
    isActive: true,
    sortOrder,
    endDate,
    durationDays,
    visitId: visitEntry.id,
    createdAt: visitDate || new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
}

export const VISIT_TYPE_CONFIG: Record<
  MedicalVisitType,
  { label: string; emoji: string; badgeClass: string }
> = {
  illness: {
    label: 'Đợt ốm cấp tính',
    emoji: '🤒',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-200',
  },
  follow_up: {
    label: 'Tái khám',
    emoji: '🔄',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  checkup: {
    label: 'Khám định kỳ',
    emoji: '🩺',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-200',
  },
  other: {
    label: 'Khám / Tư vấn khác',
    emoji: '📋',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
  },
};

export const OUTCOME_STATUS_CONFIG: Record<
  MedicalVisitOutcomeStatus,
  { label: string; emoji: string; badgeClass: string }
> = {
  ongoing: {
    label: 'Đang uống thuốc',
    emoji: '💊',
    badgeClass: 'bg-amber-100 text-amber-950 border-amber-300',
  },
  improved: {
    label: 'Đáp ứng tốt / Đỡ nhiều',
    emoji: '📈',
    badgeClass: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  recovered: {
    label: 'Đã khỏi / Ổn định',
    emoji: '✅',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  },
  changed_meds: {
    label: 'Chưa hợp / Đổi đơn',
    emoji: '🔁',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-200',
  },
};

export function getQuickSymptomsForProfile(profileType: HealthProfileType): string[] {
  if (profileType === 'pediatric') {
    return [
      'Sốt cao',
      'Ho đờm / Ho khan',
      'Sổ mũi / Nghẹt mũi',
      'Viêm họng / Amidan',
      'Viêm tai giữa',
      'Tiêu chảy / Nôn trớ',
      'Phát ban / Dị ứng',
    ];
  }
  if (profileType === 'thyroid_post_op' || profileType === 'post_stroke_cranioplasty') {
    return [
      'Tái khám chỉnh liều',
      'Tê bì / Co rút tay chân',
      'Mệt mỏi / Hoa mắt',
      'Huyết áp dao động',
      'Cảm cúm / Ho',
      'Đau nhức xương khớp',
    ];
  }
  return [
    'Đau lưng / Cột sống',
    'Ho / Cảm cúm',
    'Đau dạ dày',
    'Rối loạn tiêu hóa',
    'Đau khớp / Gout',
    'Khám sức khỏe định kỳ',
  ];
}

export function getQuickFacilitiesForProfile(profileType: HealthProfileType): string[] {
  if (profileType === 'pediatric') {
    return [
      'BV Nhi Trung Ương',
      'Khoa Nhi - BVĐK Hà Đông',
      'Phòng khám Chuyên khoa Nhi',
      'BV Đại học Y Hà Nội',
      'Hệ thống Y tế Medlatec',
    ];
  }
  if (profileType === 'thyroid_post_op') {
    return [
      'BV Nội Tiết Trung Ương',
      'BV Bạch Mai',
      'BV Đại học Y Hà Nội',
      'BVĐK Trung Ương Thái Nguyên',
      'Hệ thống Y tế Medlatec',
    ];
  }
  return [
    'BVĐK Hà Đông',
    'BV Bạch Mai',
    'BV Đại học Y Hà Nội',
    'BVĐK Trung Ương Thái Nguyên',
    'Hệ thống Y tế Medlatec',
  ];
}

/**
 * Nén ảnh tờ đơn thuốc giữ độ nét đọc chữ nhưng đảm bảo dưới ngưỡng 35.000 ký tự
 * để không vượt quá giới hạn 50.000 ký tự/ô của Google Sheets.
 */
export function compressPrescriptionImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const attempts = [
          { maxDim: 780, quality: 0.72 },
          { maxDim: 640, quality: 0.6 },
          { maxDim: 500, quality: 0.5 },
          { maxDim: 400, quality: 0.42 },
        ];
        for (const cfg of attempts) {
          let { width, height } = img;
          if (width > cfg.maxDim || height > cfg.maxDim) {
            if (width >= height) {
              height = Math.round((height * cfg.maxDim) / width);
              width = cfg.maxDim;
            } else {
              width = Math.round((width * cfg.maxDim) / height);
              height = cfg.maxDim;
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
          const dataUrl = canvas.toDataURL('image/jpeg', cfg.quality);
          if (dataUrl.length <= 34000 || cfg === attempts[attempts.length - 1]) {
            resolve(dataUrl);
            return;
          }
        }
      };
      img.onerror = () => reject(new Error('Không thể đọc file ảnh'));
      img.src = String(e.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Lỗi đọc file'));
    reader.readAsDataURL(file);
  });
}
