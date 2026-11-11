/**
 * Chuẩn Tăng Trưởng Trẻ Em WHO (WHO Child Growth Standards 0 - 180 tháng tuổi)
 * Gồm đường tham chiếu -2SD (ngưỡng suy dinh dưỡng / thấp còi), Median (chuẩn trung vị), +2SD (ngưỡng vượt chuẩn / thừa cân)
 */

export interface WhoGrowthAnchor {
  ageMonths: number;
  weightMinus2SD: number;
  weightMedian: number;
  weightPlus2SD: number;
  heightMinus2SD: number;
  heightMedian: number;
  heightPlus2SD: number;
}

// Bảng mốc chuẩn WHO cho Bé Trai (0 - 15 tuổi / 180 tháng)
export const WHO_BOYS_GROWTH_ANCHORS: WhoGrowthAnchor[] = [
  { ageMonths: 0, weightMinus2SD: 2.5, weightMedian: 3.3, weightPlus2SD: 4.4, heightMinus2SD: 46.1, heightMedian: 49.9, heightPlus2SD: 53.7 },
  { ageMonths: 3, weightMinus2SD: 5.0, weightMedian: 6.4, weightPlus2SD: 8.0, heightMinus2SD: 57.3, heightMedian: 61.4, heightPlus2SD: 65.5 },
  { ageMonths: 6, weightMinus2SD: 6.4, weightMedian: 7.9, weightPlus2SD: 9.8, heightMinus2SD: 63.3, heightMedian: 67.6, heightPlus2SD: 71.9 },
  { ageMonths: 9, weightMinus2SD: 7.1, weightMedian: 8.9, weightPlus2SD: 11.0, heightMinus2SD: 67.5, heightMedian: 72.0, heightPlus2SD: 76.5 },
  { ageMonths: 12, weightMinus2SD: 7.7, weightMedian: 9.6, weightPlus2SD: 12.0, heightMinus2SD: 71.0, heightMedian: 75.7, heightPlus2SD: 80.5 },
  { ageMonths: 18, weightMinus2SD: 8.8, weightMedian: 10.9, weightPlus2SD: 13.7, heightMinus2SD: 76.9, heightMedian: 82.3, heightPlus2SD: 87.7 },
  { ageMonths: 24, weightMinus2SD: 9.7, weightMedian: 12.2, weightPlus2SD: 15.3, heightMinus2SD: 81.7, heightMedian: 87.8, heightPlus2SD: 93.9 },
  { ageMonths: 36, weightMinus2SD: 11.3, weightMedian: 14.3, weightPlus2SD: 18.3, heightMinus2SD: 88.7, heightMedian: 96.1, heightPlus2SD: 103.5 },
  { ageMonths: 48, weightMinus2SD: 12.7, weightMedian: 16.3, weightPlus2SD: 21.2, heightMinus2SD: 94.9, heightMedian: 103.3, heightPlus2SD: 111.7 },
  { ageMonths: 60, weightMinus2SD: 14.1, weightMedian: 18.3, weightPlus2SD: 24.2, heightMinus2SD: 100.7, heightMedian: 110.0, heightPlus2SD: 119.2 },
  { ageMonths: 72, weightMinus2SD: 15.9, weightMedian: 20.5, weightPlus2SD: 27.1, heightMinus2SD: 106.1, heightMedian: 116.0, heightPlus2SD: 125.8 },
  { ageMonths: 84, weightMinus2SD: 17.7, weightMedian: 22.9, weightPlus2SD: 30.7, heightMinus2SD: 111.2, heightMedian: 121.7, heightPlus2SD: 132.3 },
  { ageMonths: 96, weightMinus2SD: 19.5, weightMedian: 25.4, weightPlus2SD: 34.7, heightMinus2SD: 116.0, heightMedian: 127.3, heightPlus2SD: 138.6 },
  { ageMonths: 108, weightMinus2SD: 21.3, weightMedian: 28.1, weightPlus2SD: 39.4, heightMinus2SD: 120.5, heightMedian: 132.6, heightPlus2SD: 144.6 },
  { ageMonths: 120, weightMinus2SD: 23.4, weightMedian: 31.2, weightPlus2SD: 45.0, heightMinus2SD: 125.0, heightMedian: 137.8, heightPlus2SD: 150.5 },
  { ageMonths: 144, weightMinus2SD: 29.2, weightMedian: 39.9, weightPlus2SD: 58.0, heightMinus2SD: 134.9, heightMedian: 149.1, heightPlus2SD: 163.3 },
  { ageMonths: 180, weightMinus2SD: 41.8, weightMedian: 56.0, weightPlus2SD: 76.5, heightMinus2SD: 152.9, heightMedian: 169.0, heightPlus2SD: 185.1 },
];

// Bảng mốc chuẩn WHO cho Bé Gái (0 - 15 tuổi / 180 tháng)
export const WHO_GIRLS_GROWTH_ANCHORS: WhoGrowthAnchor[] = [
  { ageMonths: 0, weightMinus2SD: 2.4, weightMedian: 3.2, weightPlus2SD: 4.2, heightMinus2SD: 45.4, heightMedian: 49.1, heightPlus2SD: 52.9 },
  { ageMonths: 3, weightMinus2SD: 4.5, weightMedian: 5.8, weightPlus2SD: 7.5, heightMinus2SD: 55.6, heightMedian: 59.8, heightPlus2SD: 64.0 },
  { ageMonths: 6, weightMinus2SD: 5.7, weightMedian: 7.3, weightPlus2SD: 9.3, heightMinus2SD: 61.2, heightMedian: 65.7, heightPlus2SD: 70.3 },
  { ageMonths: 9, weightMinus2SD: 6.5, weightMedian: 8.2, weightPlus2SD: 10.5, heightMinus2SD: 65.3, heightMedian: 70.1, heightPlus2SD: 75.0 },
  { ageMonths: 12, weightMinus2SD: 7.0, weightMedian: 8.9, weightPlus2SD: 11.5, heightMinus2SD: 68.9, heightMedian: 74.0, heightPlus2SD: 79.2 },
  { ageMonths: 18, weightMinus2SD: 8.1, weightMedian: 10.2, weightPlus2SD: 13.2, heightMinus2SD: 74.9, heightMedian: 80.7, heightPlus2SD: 86.5 },
  { ageMonths: 24, weightMinus2SD: 9.0, weightMedian: 11.5, weightPlus2SD: 14.8, heightMinus2SD: 80.0, heightMedian: 86.4, heightPlus2SD: 92.9 },
  { ageMonths: 36, weightMinus2SD: 10.8, weightMedian: 13.9, weightPlus2SD: 18.1, heightMinus2SD: 87.4, heightMedian: 95.1, heightPlus2SD: 102.7 },
  { ageMonths: 48, weightMinus2SD: 12.3, weightMedian: 16.1, weightPlus2SD: 21.5, heightMinus2SD: 94.1, heightMedian: 102.7, heightPlus2SD: 111.3 },
  { ageMonths: 60, weightMinus2SD: 13.7, weightMedian: 18.2, weightPlus2SD: 24.9, heightMinus2SD: 99.9, heightMedian: 109.4, heightPlus2SD: 118.9 },
  { ageMonths: 72, weightMinus2SD: 15.3, weightMedian: 20.2, weightPlus2SD: 27.8, heightMinus2SD: 105.0, heightMedian: 115.1, heightPlus2SD: 125.2 },
  { ageMonths: 84, weightMinus2SD: 16.8, weightMedian: 22.4, weightPlus2SD: 31.4, heightMinus2SD: 109.9, heightMedian: 120.8, heightPlus2SD: 131.7 },
  { ageMonths: 96, weightMinus2SD: 18.6, weightMedian: 25.0, weightPlus2SD: 35.8, heightMinus2SD: 115.0, heightMedian: 126.6, heightPlus2SD: 138.2 },
  { ageMonths: 108, weightMinus2SD: 20.8, weightMedian: 28.2, weightPlus2SD: 41.0, heightMinus2SD: 120.3, heightMedian: 132.5, heightPlus2SD: 144.7 },
  { ageMonths: 120, weightMinus2SD: 23.3, weightMedian: 31.9, weightPlus2SD: 46.9, heightMinus2SD: 125.8, heightMedian: 138.6, heightPlus2SD: 151.4 },
  { ageMonths: 144, weightMinus2SD: 29.8, weightMedian: 41.5, weightPlus2SD: 59.6, heightMinus2SD: 137.2, heightMedian: 151.2, heightPlus2SD: 165.2 },
  { ageMonths: 180, weightMinus2SD: 39.5, weightMedian: 52.1, weightPlus2SD: 70.2, heightMinus2SD: 147.8, heightMedian: 161.7, heightPlus2SD: 175.6 },
];

export function getWhoGrowthTable(gender: 'male' | 'female'): WhoGrowthAnchor[] {
  return gender === 'female' ? WHO_GIRLS_GROWTH_ANCHORS : WHO_BOYS_GROWTH_ANCHORS;
}

export function getWhoReferenceAtMonth(
  ageMonths: number,
  gender: 'male' | 'female'
): WhoGrowthAnchor {
  const table = getWhoGrowthTable(gender);
  const clamped = Math.max(0, Math.min(180, ageMonths));

  if (clamped <= table[0].ageMonths) return table[0];
  const last = table[table.length - 1];
  if (clamped >= last.ageMonths) return last;

  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (clamped >= a.ageMonths && clamped <= b.ageMonths) {
      const span = b.ageMonths - a.ageMonths || 1;
      const t = (clamped - a.ageMonths) / span;
      const lerp = (x: number, y: number) => Math.round((x + (y - x) * t) * 10) / 10;
      return {
        ageMonths: Math.round(clamped * 10) / 10,
        weightMinus2SD: lerp(a.weightMinus2SD, b.weightMinus2SD),
        weightMedian: lerp(a.weightMedian, b.weightMedian),
        weightPlus2SD: lerp(a.weightPlus2SD, b.weightPlus2SD),
        heightMinus2SD: lerp(a.heightMinus2SD, b.heightMinus2SD),
        heightMedian: lerp(a.heightMedian, b.heightMedian),
        heightPlus2SD: lerp(a.heightPlus2SD, b.heightPlus2SD),
      };
    }
  }
  return last;
}

export interface PediatricGrowthEvaluation {
  weightStatus: 'under' | 'normal' | 'over' | 'none';
  weightLabel: string;
  weightBadgeClass: string;
  heightStatus: 'under' | 'normal' | 'over' | 'none';
  heightLabel: string;
  heightBadgeClass: string;
  ref: WhoGrowthAnchor;
  advice: string;
}

export function evaluatePediatricGrowth(
  ageMonths: number,
  gender: 'male' | 'female',
  weightKg?: number,
  heightCm?: number
): PediatricGrowthEvaluation {
  const ref = getWhoReferenceAtMonth(ageMonths, gender);

  let weightStatus: PediatricGrowthEvaluation['weightStatus'] = 'none';
  let weightLabel = 'Chưa nhập cân nặng';
  let weightBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (typeof weightKg === 'number' && weightKg > 0) {
    if (weightKg < ref.weightMinus2SD) {
      weightStatus = 'under';
      weightLabel = `Dưới -2SD (Chuẩn TB ${ref.weightMedian} kg)`;
      weightBadgeClass = 'bg-amber-100 text-amber-950 border-amber-300';
    } else if (weightKg > ref.weightPlus2SD) {
      weightStatus = 'over';
      weightLabel = `Trên +2SD (Chuẩn TB ${ref.weightMedian} kg)`;
      weightBadgeClass = 'bg-amber-100 text-amber-950 border-amber-300';
    } else {
      weightStatus = 'normal';
      weightLabel = `Đạt chuẩn WHO (TB ${ref.weightMedian} kg)`;
      weightBadgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
    }
  }

  let heightStatus: PediatricGrowthEvaluation['heightStatus'] = 'none';
  let heightLabel = 'Chưa nhập chiều cao';
  let heightBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (typeof heightCm === 'number' && heightCm > 0) {
    if (heightCm < ref.heightMinus2SD) {
      heightStatus = 'under';
      heightLabel = `Nguy cơ thấp còi < -2SD (TB ${ref.heightMedian} cm)`;
      heightBadgeClass = 'bg-amber-100 text-amber-950 border-amber-300';
    } else if (heightCm > ref.heightPlus2SD) {
      heightStatus = 'over';
      heightLabel = `Cao vượt chuẩn > +2SD (TB ${ref.heightMedian} cm)`;
      heightBadgeClass = 'bg-teal-100 text-teal-900 border-teal-300';
    } else {
      heightStatus = 'normal';
      heightLabel = `Đạt chuẩn WHO (TB ${ref.heightMedian} cm)`;
      heightBadgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
    }
  }

  let advice =
    'Duy trì chế độ dinh dưỡng đa dạng, ngủ sớm trước 21:30, tắm nắng vận động ngoài trời và bổ sung Vitamin D3 định kỳ.';
  if (weightStatus === 'under' || heightStatus === 'under') {
    advice =
      'Chỉ số nằm dưới ngưỡng -2SD của WHO: Nên rà soát khẩu phần đạm, kẽm, sắt, canxi/D3 và tham vấn Bác sĩ Dinh dưỡng Nhi khoa để hỗ trợ bắt kịp đà tăng trưởng.';
  } else if (weightStatus === 'over') {
    advice =
      'Cân nặng vượt ngưỡng +2SD của WHO: Nên hạn chế đồ ngọt, nước có gas, thức ăn nhanh buổi tối và khuyến khích bé vận động thể chất mỗi ngày.';
  }

  return {
    weightStatus,
    weightLabel,
    weightBadgeClass,
    heightStatus,
    heightLabel,
    heightBadgeClass,
    ref,
    advice,
  };
}

export function computeAgeMonthsFromBirthDate(
  birthDateStr?: string,
  targetDateStr?: string
): number | null {
  if (!birthDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(birthDateStr)) return null;
  const [by, bm, bd] = birthDateStr.split('-').map(Number);
  const refStr =
    targetDateStr && /^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)
      ? targetDateStr
      : new Date().toISOString().slice(0, 10);
  const [ty, tm, td] = refStr.split('-').map(Number);

  let months = (ty - by) * 12 + (tm - bm);
  if (td < bd) {
    months -= 0.5;
  }
  return Math.max(0, Math.round(months * 10) / 10);
}

export function formatAgeMonthsLabel(ageMonths: number): string {
  if (ageMonths < 24) {
    return `${ageMonths} tháng`;
  }
  const years = Math.floor(ageMonths / 12);
  const rem = Math.round(ageMonths - years * 12);
  return rem > 0 ? `${years} tuổi ${rem} tháng` : `${years} tuổi (${ageMonths}m)`;
}
