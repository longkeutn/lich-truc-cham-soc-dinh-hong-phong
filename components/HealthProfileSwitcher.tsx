'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, Plus, Settings2 } from 'lucide-react';
import type { FamilyMember, HealthProfile, VitalsLogEntry } from '@/lib/types';
import { ProfileQuickSwitcherModal } from './navigation/ProfileQuickSwitcherModal';
import type { ProfileModalMode } from './navigation/navigationTypes';

export interface HealthProfileSwitcherProps {
  profiles: HealthProfile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  allVitalsLog: VitalsLogEntry[];
  todayStr: string;
  members?: FamilyMember[];
  onSaveProfile: (profile: HealthProfile) => Promise<void>;
  onDeleteProfile?: (profileId: string) => Promise<void>;
  onOpenMembers?: () => void;
}

/**
 * Bộ chuyển đổi hồ sơ gọn nhẹ tương thích ngược, ủy quyền toàn bộ giao diện Modal sang ProfileQuickSwitcherModal.
 */
export default function HealthProfileSwitcher({
  profiles,
  activeProfileId,
  onSelectProfile,
  allVitalsLog,
  todayStr,
  members = [],
  onSaveProfile,
  onDeleteProfile,
  onOpenMembers,
}: HealthProfileSwitcherProps) {
  const [modalMode, setModalMode] = useState<ProfileModalMode>('closed');
  const [editingTarget, setEditingTarget] = useState<HealthProfile | null>(null);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || profiles[0],
    [profiles, activeProfileId]
  );

  return (
    <div className="rounded-2xl bg-surface-card border border-border-card p-2.5 flex items-center justify-between gap-2 flex-wrap shadow-2xs">
      <button
        type="button"
        onClick={() => {
          setEditingTarget(null);
          setModalMode('list');
        }}
        className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-medical-surface hover:bg-teal-100/70 text-text-main border border-medical-border text-sm sm:text-base font-extrabold inline-flex items-center gap-2 transition cursor-pointer"
      >
        <span aria-hidden="true" className="text-lg">
          {activeProfile?.avatarEmoji || '🧑'}
        </span>
        <span>
          {activeProfile
            ? `${activeProfile.relation ? `${activeProfile.relation} · ` : ''}${activeProfile.name}`
            : 'Chọn hồ sơ sức khỏe'}
        </span>
        <ChevronDown className="w-4 h-4 text-medical-primary shrink-0" />
      </button>

      <div className="flex items-center gap-1.5">
        {activeProfile && (
          <button
            type="button"
            onClick={() => {
              setEditingTarget(activeProfile);
              setModalMode('edit');
            }}
            aria-label="Cài đặt hồ sơ đang chọn"
            className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-body border border-border-card text-sm font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Settings2 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Cài đặt</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setEditingTarget(null);
            setModalMode('add');
          }}
          className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-medical-primary hover:bg-medical-dark text-white text-sm font-extrabold inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Thêm hồ sơ</span>
        </button>
      </div>

      <ProfileQuickSwitcherModal
        mode={modalMode}
        initialProfile={editingTarget}
        profiles={profiles}
        activeProfileId={activeProfileId}
        allVitalsLog={allVitalsLog}
        todayStr={todayStr}
        members={members}
        onClose={() => setModalMode('closed')}
        onSelectProfile={onSelectProfile}
        onSaveProfile={onSaveProfile}
        onDeleteProfile={onDeleteProfile}
        onOpenMembers={onOpenMembers}
      />
    </div>
  );
}
