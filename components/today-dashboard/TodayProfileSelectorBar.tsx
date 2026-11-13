'use client';

import React, { useMemo } from 'react';
import { CheckCircle2, Plus, UserCheck } from 'lucide-react';
import type { HealthProfile, VitalsLogEntry } from '@/lib/types';
import {
  computeLatestVitalByProfile,
  formatProfileDisplayName,
  formatProfileShortDate,
} from '@/components/navigation';

export interface TodayProfileSelectorBarProps {
  profiles: HealthProfile[];
  activeProfileId: string;
  allVitalsLog: VitalsLogEntry[];
  todayStr: string;
  onSelectProfile: (profileId: string) => void;
  onOpenAddProfile?: () => void;
}

/**
 * Hàng nút chọn hồ sơ sức khỏe to, rõ ràng ngay đầu Tab Hôm Nay
 * giúp người lớn tuổi nhìn thấy và đổi đúng người cần nhập liệu chỉ trong 1 chạm.
 */
export function TodayProfileSelectorBar({
  profiles,
  activeProfileId,
  allVitalsLog,
  todayStr,
  onSelectProfile,
  onOpenAddProfile,
}: TodayProfileSelectorBarProps) {
  const latestVitalByProfile = useMemo(
    () => computeLatestVitalByProfile(profiles, allVitalsLog, todayStr),
    [profiles, allVitalsLog, todayStr]
  );

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || profiles[0] || null,
    [profiles, activeProfileId]
  );

  if (profiles.length === 0 || !activeProfile) {
    return null;
  }

  const activeName = formatProfileDisplayName(activeProfile);
  const gridColsClass =
    profiles.length === 1
      ? 'grid-cols-1'
      : 'grid-cols-2 sm:flex sm:flex-wrap';

  return (
    <section
      aria-label="Chọn thành viên gia đình để xem và nhập hôm nay"
      className="rounded-2xl bg-surface-card border-2 border-medical-border p-3 sm:p-4 shadow-2xs space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-text-muted">
            <UserCheck className="w-4 h-4 text-medical-primary shrink-0" />
            <span>Chọn người cần nhập hôm nay:</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-medical-surface border border-medical-border text-medical-dark text-xs sm:text-sm font-black">
            <span aria-hidden="true">{activeProfile.avatarEmoji || '🧑'}</span>
            <span>Đang chọn: {activeName}</span>
          </span>
        </div>

        {onOpenAddProfile && (
          <button
            type="button"
            onClick={onOpenAddProfile}
            title="Thêm hồ sơ sức khỏe thành viên mới"
            className="min-h-[48px] min-w-[48px] px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-medical-surface text-medical-dark border border-border-card text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Thêm hồ sơ</span>
          </button>
        )}
      </div>

      <div className={`grid gap-2.5 ${gridColsClass}`}>
        {profiles.map((profile) => {
          const isSelected = profile.id === activeProfile.id;
          const displayName = formatProfileDisplayName(profile);
          const summary = latestVitalByProfile.get(profile.id);
          const latest = summary?.latest || null;

          return (
            <button
              key={profile.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectProfile(profile.id)}
              className={`min-h-[60px] min-w-[48px] sm:flex-1 sm:min-w-[200px] px-3 py-2.5 rounded-2xl border-2 text-left flex items-center justify-between gap-2 transition active:scale-[0.99] cursor-pointer ${
                isSelected
                  ? 'bg-medical-primary text-white border-medical-dark shadow-sm'
                  : 'bg-slate-50 hover:bg-medical-surface text-text-main border-slate-200 hover:border-medical-border'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  aria-hidden="true"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    isSelected
                      ? 'bg-white/15 border border-white/25'
                      : 'bg-surface-card border border-border-card'
                  }`}
                >
                  {profile.avatarEmoji || '🧑'}
                </span>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-black leading-snug truncate">
                    {displayName}
                  </div>
                  <div
                    className={`text-xs font-bold leading-tight truncate mt-0.5 ${
                      isSelected ? 'text-teal-50' : 'text-text-muted'
                    }`}
                  >
                    {latest
                      ? `HA ${latest.sys}/${latest.dia} · ${
                          summary && summary.todayCount > 0
                            ? 'Hôm nay'
                            : formatProfileShortDate(latest.date)
                        }`
                      : isSelected
                        ? 'Đang mở hồ sơ này'
                        : 'Bấm để chọn'}
                  </div>
                </div>
              </div>

              {isSelected ? (
                <CheckCircle2
                  aria-hidden="true"
                  className="w-5 h-5 text-amber-300 shrink-0"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="hidden sm:inline-flex px-2 py-0.5 rounded-lg bg-white border border-border-card text-xs font-extrabold text-medical-primary shrink-0"
                >
                  Chọn
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default TodayProfileSelectorBar;
