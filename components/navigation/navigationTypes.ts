import type { HealthProfile, VitalsLogEntry } from '@/lib/types';
import {
  DEFAULT_BP_THRESHOLDS,
  compareVitalsDesc,
  evaluateVitalReading,
  extractRecordProfileId,
} from '@/lib/config';

export type AppView = 'today' | 'charts' | 'labs' | 'family' | 'expenses';

export type PrimaryNavTabId = 'today' | 'charts' | 'labs' | 'family';

export type ProfileModalMode = 'closed' | 'list' | 'add' | 'edit';

export interface PrimaryNavTabItem {
  id: PrimaryNavTabId;
  mobileLabel: string;
  desktopLabel: string;
  ariaLabel: string;
}

export const PRIMARY_NAV_TABS: PrimaryNavTabItem[] = [
  {
    id: 'today',
    mobileLabel: 'Hôm Nay',
    desktopLabel: 'Hôm Nay',
    ariaLabel: 'Trang chủ công việc chăm sóc hôm nay',
  },
  {
    id: 'charts',
    mobileLabel: 'Xu Hướng',
    desktopLabel: 'Xu Hướng',
    ariaLabel: 'Biểu đồ xu hướng huyết áp và sinh hiệu',
  },
  {
    id: 'labs',
    mobileLabel: 'Xét Nghiệm',
    desktopLabel: 'Xét Nghiệm',
    ariaLabel: 'Sổ xét nghiệm chuyên khoa và hồ sơ y tế',
  },
  {
    id: 'family',
    mobileLabel: 'Gia Đình',
    desktopLabel: 'Gia Đình',
    ariaLabel: 'Quản lý gia đình, danh bạ khẩn cấp và sổ thu chi y tế',
  },
];

/**
 * Chuẩn hóa tab chính đang chọn: khi mở Sổ Thu Chi ('expenses') thì vẫn sáng đèn tab 'family'
 */
export function resolveActivePrimaryTab(activeView: AppView): PrimaryNavTabId {
  if (activeView === 'expenses') return 'family';
  return activeView;
}

export interface ProfileVitalSummary {
  latest: VitalsLogEntry | null;
  todayCount: number;
  shortBadgeLabel: string | null;
  badgeClass: string | null;
}

export function formatProfileShortDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

/**
 * Tổng hợp số đo huyết áp mới nhất và số lần đo hôm nay cho từng hồ sơ sức khỏe
 */
export function computeLatestVitalByProfile(
  profiles: HealthProfile[],
  allVitalsLog: VitalsLogEntry[],
  todayStr: string
): Map<string, ProfileVitalSummary> {
  const map = new Map<string, ProfileVitalSummary>();
  for (const p of profiles) {
    map.set(p.id, {
      latest: null,
      todayCount: 0,
      shortBadgeLabel: null,
      badgeClass: null,
    });
  }

  const sortedDesc = [...allVitalsLog].sort(compareVitalsDesc);
  for (const v of sortedDesc) {
    const pid = extractRecordProfileId(v.id);
    const item = map.get(pid);
    if (item) {
      if (!item.latest) {
        item.latest = v;
        const prof = profiles.find((p) => p.id === pid);
        const evalRes = evaluateVitalReading(
          v,
          prof?.bpThresholds || DEFAULT_BP_THRESHOLDS
        );
        item.shortBadgeLabel = evalRes.bp.shortLabel;
        item.badgeClass = evalRes.bp.badgeClass;
      }
      if (v.date === todayStr) {
        item.todayCount += 1;
      }
    }
  }

  return map;
}
