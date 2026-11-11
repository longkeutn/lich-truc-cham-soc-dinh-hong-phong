'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Check, Plus, Settings2, Users } from 'lucide-react';
import type { HealthProfile } from '@/lib/types';
import {
  formatProfileShortDate,
  type ProfileVitalSummary,
} from './navigationTypes';

export interface ProfileDropdownMenuProps {
  profiles: HealthProfile[];
  activeProfileId?: string;
  latestVitalByProfile: Map<string, ProfileVitalSummary>;
  onChooseProfile: (profileId: string) => void;
  onClose: () => void;
  onOpenAddProfile?: () => void;
  onOpenEditProfile?: (profile: HealthProfile) => void;
  onOpenProfileList?: () => void;
  onOpenMembers?: () => void;
}

/**
 * Menu Dropdown xổ xuống ngay từ Top App Bar giúp chuyển đổi hồ sơ sức khỏe trong 1 chạm.
 */
export function ProfileDropdownMenu({
  profiles,
  activeProfileId,
  latestVitalByProfile,
  onChooseProfile,
  onClose,
  onOpenAddProfile,
  onOpenEditProfile,
  onOpenProfileList,
  onOpenMembers,
}: ProfileDropdownMenuProps) {
  return (
    <motion.div
      role="menu"
      aria-label="Danh sách hồ sơ sức khỏe gia đình"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="absolute left-0 top-full mt-2 w-[min(92vw,370px)] rounded-2xl bg-surface-card border border-border-card shadow-xl p-2.5 z-50 space-y-2"
    >
      <div className="flex items-center justify-between gap-2 px-1.5 pt-0.5">
        <span className="text-xs sm:text-sm font-extrabold text-text-muted">
          Chọn hồ sơ sức khỏe ({profiles.length})
        </span>
        {onOpenMembers && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenMembers();
            }}
            className="min-h-[48px] min-w-[48px] px-2.5 py-1.5 rounded-xl text-xs font-extrabold text-medical-primary hover:bg-medical-surface transition cursor-pointer inline-flex items-center gap-1"
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>Thành viên</span>
          </button>
        )}
      </div>

      <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-0.5">
        {profiles.map((profile) => {
          const isSelected = profile.id === activeProfileId;
          const summary = latestVitalByProfile.get(profile.id);
          const latest = summary?.latest || null;

          return (
            <div key={profile.id} className="flex items-stretch gap-1.5">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => onChooseProfile(profile.id)}
                className={`min-h-[54px] min-w-[48px] flex-1 rounded-xl px-3 py-2 border text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                  isSelected
                    ? 'bg-medical-primary text-white border-medical-dark shadow-2xs'
                    : 'bg-slate-50 hover:bg-medical-surface/70 text-text-main border-border-card'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    aria-hidden="true"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      isSelected
                        ? 'bg-white/15 border border-white/25'
                        : 'bg-surface-card border border-border-card'
                    }`}
                  >
                    {profile.avatarEmoji || '🧑'}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-xs font-extrabold px-1.5 py-0.5 rounded-md ${
                          isSelected
                            ? 'bg-amber-300 text-slate-950'
                            : 'bg-teal-100 text-medical-dark'
                        }`}
                      >
                        {profile.relation || 'Gia đình'}
                      </span>
                      <span className="text-sm sm:text-base font-extrabold truncate">
                        {profile.name}
                      </span>
                    </div>
                    <div
                      className={`text-xs font-semibold mt-0.5 truncate ${
                        isSelected ? 'text-teal-50' : 'text-text-muted'
                      }`}
                    >
                      {latest
                        ? `HA ${latest.sys}/${latest.dia}${
                            latest.pulse ? ` · ♥${latest.pulse}` : ''
                          } · ${
                            summary && summary.todayCount > 0
                              ? `Hôm nay (${summary.todayCount})`
                              : formatProfileShortDate(latest.date)
                          }`
                        : 'Chưa có số đo - Bấm để chọn'}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-amber-300 shrink-0" />}
              </button>

              {onOpenEditProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEditProfile(profile);
                  }}
                  title={`Cài đặt hồ sơ và ngưỡng huyết áp của ${profile.name}`}
                  aria-label={`Cài đặt hồ sơ ${profile.name}`}
                  className="min-h-[54px] min-w-[48px] px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-text-body border border-border-card flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {(onOpenAddProfile || onOpenProfileList) && (
        <div className="pt-2 border-t border-border-card flex items-center gap-2">
          {onOpenAddProfile && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAddProfile();
              }}
              className="min-h-[48px] min-w-[48px] flex-1 px-3 py-2 rounded-xl bg-medical-surface hover:bg-teal-100/70 text-medical-dark border border-medical-border text-sm font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Thêm hồ sơ mới</span>
            </button>
          )}
          {onOpenProfileList && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProfileList();
              }}
              className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-body border border-border-card text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Settings2 className="w-4 h-4 shrink-0" />
              <span>Quản lý</span>
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default ProfileDropdownMenu;
