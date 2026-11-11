import type { FamilyMember, ShiftRecord, ShiftType } from '@/lib/types';

export interface SessionOption {
  id: 'morning' | 'afternoon' | 'night' | 'full_day';
  shiftType: ShiftType;
  label: string;
  emoji: string;
  defaultTime: string;
  badgeClass: string;
}

export const SESSION_OPTIONS: SessionOption[] = [
  {
    id: 'morning',
    shiftType: 'morning',
    label: 'Buổi Sáng',
    emoji: '🌅',
    defaultTime: '07:30 - 11:30',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  {
    id: 'afternoon',
    shiftType: 'afternoon',
    label: 'Buổi Chiều',
    emoji: '🌇',
    defaultTime: '14:00 - 18:00',
    badgeClass: 'bg-sky-50 text-sky-900 border-sky-200',
  },
  {
    id: 'night',
    shiftType: 'night',
    label: 'Buổi Tối / Ngủ lại',
    emoji: '🌙',
    defaultTime: '19:00 - 22:30',
    badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-200',
  },
  {
    id: 'full_day',
    shiftType: 'day_12h',
    label: 'Cả Ngày',
    emoji: '☀️',
    defaultTime: '08:00 - 20:00',
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  },
];

export const QUICK_TASK_PRESETS = [
  '🏃 Phụ Mẹ đỡ Bố tập phục hồi chức năng',
  '🍲 Nấu ăn & trông Bố để Mẹ nghỉ ngơi',
  '🌙 Qua ngủ trực đêm phụ Mẹ',
  '🏥 Đưa Bố đi tái khám / lấy thuốc',
  '🛁 Phụ tắm rửa, vệ sinh & xoa bóp cho Bố',
  '💬 Qua thăm, đo huyết áp & trò chuyện cùng Bố Mẹ',
];

export const DAY_NAMES_VN = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

export function toDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getMondayOfWeek(baseDate: Date): Date {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function formatDateShortVN(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

export function formatDateFullVN(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export interface WeekDayInfo {
  dateStr: string;
  dayName: string;
  shortDate: string;
  isToday: boolean;
  isPast: boolean;
}

export function computeWeekDays(todayStr: string, weekOffset: number): WeekDayInfo[] {
  const [y, m, d] = todayStr.split('-').map(Number);
  const base = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  base.setDate(base.getDate() + weekOffset * 7);
  const monday = getMondayOfWeek(base);
  const days: WeekDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const dStr = toDateStr(cur);
    days.push({
      dateStr: dStr,
      dayName: DAY_NAMES_VN[cur.getDay()],
      shortDate: formatDateShortVN(dStr),
      isToday: dStr === todayStr,
      isPast: dStr < todayStr,
    });
  }
  return days;
}

export function computeQuickDates(todayStr: string): { label: string; dateStr: string }[] {
  const [y, m, d] = todayStr.split('-').map(Number);
  const today = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const monday = getMondayOfWeek(today);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return [
    { label: 'Hôm nay', dateStr: toDateStr(today) },
    { label: 'Ngày mai', dateStr: toDateStr(tomorrow) },
    { label: 'Thứ Bảy tuần này', dateStr: toDateStr(saturday) },
    { label: 'Chủ Nhật tuần này', dateStr: toDateStr(sunday) },
  ];
}

export function computeMemberContributionStats(
  shifts: ShiftRecord[],
  members: FamilyMember[]
) {
  const counts = new Map<string, { homeCount: number; icuCount: number; total: number }>();
  members.forEach((m) => {
    counts.set(m.name, { homeCount: 0, icuCount: 0, total: 0 });
  });

  shifts.forEach((s) => {
    const assignees = (s.assignees || []).filter(Boolean) as string[];
    const supporters = (s.supporters || []).filter(Boolean) as string[];
    const allParticipants = Array.from(new Set([...assignees, ...supporters]));
    if (allParticipants.length === 0) return;

    const isIcu = s.phase === 'phase1' && !String(s.id || '').startsWith('support_');
    allParticipants.forEach((name) => {
      const prev = counts.get(name) || { homeCount: 0, icuCount: 0, total: 0 };
      if (isIcu) {
        prev.icuCount += 1;
      } else {
        prev.homeCount += 1;
      }
      prev.total += 1;
      counts.set(name, prev);
    });
  });

  return members.map((m) => ({
    member: m,
    ...(counts.get(m.name) || { homeCount: 0, icuCount: 0, total: 0 }),
  }));
}
