'use client';

import React from 'react';
import { HeartPulse, Plus, Settings2, Trash2, Users } from 'lucide-react';
import type { HealthProfile } from '@/lib/types';
import {
  formatProfileShortDate,
  type ProfileVitalSummary,
} from './navigationTypes';

export interface ProfileListViewProps {
  profiles: HealthProfile[];
  activeProfileId: string;
  membersCount: number;
  latestVitalByProfile: Map<string, ProfileVitalSummary>;
  canDelete: boolean;
  onSelectAndClose: (profileId: string) => void;
  onEditProfile: (profile: HealthProfile) => void;
  onDeleteProfile: (profileId: string, profileName: string) => void;
  onOpenAddForm: () => void;
  onOpenMembers?: () => void;
}

/**
 * Danh sách Hồ Sơ Sức Khỏe Gia Đình trong cửa sổ chuyển đổi nhanh (vùng chạm >= 48px).
 */
export function ProfileListView({
  profiles,
  activeProfileId,
  membersCount,
  latestVitalByProfile,
  canDelete,
  onSelectAndClose,
  onEditProfile,
  onDeleteProfile,
  onOpenAddForm,
  onOpenMembers,
}: ProfileListViewProps) {
  return (
    <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
      <div className="space-y-2">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfileId;
          const summary = latestVitalByProfile.get(profile.id);
          const latest = summary?.latest || null;

          return (
            <div
              key={profile.id}
              className={`rounded-2xl p-3 border-2 flex items-center justify-between gap-2 transition ${
                isActive
                  ? 'bg-medical-primary text-white border-medical-dark shadow-sm'
                  : 'bg-slate-50 text-text-main border-border-card'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectAndClose(profile.id)}
                className="min-h-[52px] min-w-[48px] flex-1 text-left flex items-center gap-3 cursor-pointer"
              >
                <span
                  aria-hidden="true"
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                    isActive
                      ? 'bg-white/15 border border-white/25'
                      : 'bg-surface-card border border-border-card'
                  }`}
                >
                  {profile.avatarEmoji || '🧑'}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-amber-300 text-slate-950'
                          : 'bg-teal-100 text-medical-dark'
                      }`}
                    >
                      {profile.relation}
                    </span>
                    <span className="text-base font-black truncate">{profile.name}</span>
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-semibold mt-0.5 flex items-center gap-1.5 flex-wrap ${
                      isActive ? 'text-teal-50' : 'text-text-muted'
                    }`}
                  >
                    {latest ? (
                      <>
                        <HeartPulse className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {latest.sys}/{latest.dia}
                          {latest.pulse ? ` · ${latest.pulse} l/p` : ''}
                        </span>
                        <span>·</span>
                        <span>
                          {summary && summary.todayCount > 0
                            ? `Hôm nay (${summary.todayCount} lần)`
                            : `Ngày ${formatProfileShortDate(latest.date)}`}
                        </span>
                      </>
                    ) : (
                      <span>Chưa có số đo - Bấm chọn để ghi</span>
                    )}
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onEditProfile(profile)}
                  title={`Cài đặt hồ sơ ${profile.name}`}
                  aria-label={`Cài đặt hồ sơ ${profile.name}`}
                  className={`min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center transition cursor-pointer ${
                    isActive
                      ? 'bg-white/15 hover:bg-white/25 text-white border-white/25'
                      : 'bg-surface-card hover:bg-slate-100 text-text-body border-border-card'
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDeleteProfile(profile.id, profile.name)}
                    title={`Xóa hồ sơ ${profile.name}`}
                    aria-label={`Xóa hồ sơ ${profile.name}`}
                    className={`min-h-[48px] min-w-[48px] rounded-xl border flex items-center justify-center transition cursor-pointer ${
                      isActive
                        ? 'bg-rose-500/25 hover:bg-rose-500/40 text-white border-rose-200/40'
                        : 'bg-surface-card hover:bg-vital-danger-bg text-vital-danger border-border-card'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border-card grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onOpenAddForm}
          className="min-h-[52px] min-w-[48px] px-4 py-2.5 rounded-xl bg-medical-primary hover:bg-medical-dark text-white text-sm sm:text-base font-extrabold flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
        >
          <Plus className="w-5 h-5 shrink-0" />
          <span>Thêm Hồ Sơ Mới</span>
        </button>
        {onOpenMembers && (
          <button
            type="button"
            onClick={onOpenMembers}
            className="min-h-[52px] min-w-[48px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-body border border-border-card text-sm sm:text-base font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Users className="w-5 h-5 text-medical-primary shrink-0" />
            <span>Thành Viên ({membersCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default ProfileListView;
