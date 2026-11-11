'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  HeartPulse,
  TrendingUp,
  FlaskConical,
  Users,
  PhoneCall,
  ChevronDown,
  RefreshCw,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';
import type { HealthProfile, PatientInfo, VitalsLogEntry } from '@/lib/types';
import { APP_SHORT_TITLE, PATIENT_INFO } from '@/lib/config';
import {
  OfflineSyncIndicator,
  SeniorTextToggle,
  type SyncStateKind,
} from '@/components/ui-kit';
import {
  PRIMARY_NAV_TABS,
  computeLatestVitalByProfile,
  resolveActivePrimaryTab,
  type AppView,
  type PrimaryNavTabId,
} from './navigationTypes';
import { ProfileDropdownMenu } from './ProfileDropdownMenu';

const DESKTOP_TAB_ICONS: Record<
  PrimaryNavTabId,
  React.ComponentType<{ className?: string }>
> = {
  today: HeartPulse,
  charts: TrendingUp,
  labs: FlaskConical,
  family: Users,
};

export interface AppHeaderBarProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  profiles?: HealthProfile[];
  activeProfileId?: string;
  onSelectProfile?: (profileId: string) => void;
  onOpenAddProfile?: () => void;
  onOpenEditProfile?: (profile: HealthProfile) => void;
  onOpenProfileList?: () => void;
  onOpenMembers?: () => void;
  onOpenEmergencyContacts: () => void;
  patientInfo?: PatientInfo;
  allVitalsLog?: VitalsLogEntry[];
  todayStr?: string;
  syncStatus?: SyncStateKind;
  onRefreshData?: () => void;
}

/**
 * Top App Bar cố định tối giản chuẩn Mobile-First:
 * - Cụm trái: Avatar hồ sơ + Menu Dropdown chuyển đổi hồ sơ nhanh 1 chạm
 * - Cụm giữa (>= md): Thanh điều hướng 4 Tab chuẩn tông màu Medical Teal
 * - Cụm phải: Trạng thái đồng bộ êm dịu + Chữ To (A+) + Nút SOS khẩn cấp
 */
export function AppHeaderBar({
  activeView,
  onChangeView,
  profiles = [],
  activeProfileId,
  onSelectProfile,
  onOpenAddProfile,
  onOpenEditProfile,
  onOpenProfileList,
  onOpenMembers,
  onOpenEmergencyContacts,
  patientInfo,
  allVitalsLog = [],
  todayStr = '',
  syncStatus = 'synced',
  onRefreshData,
}: AppHeaderBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const activePrimaryTab = resolveActivePrimaryTab(activeView);
  const fallbackPatient = patientInfo || PATIENT_INFO;

  const activeProfile = useMemo(() => {
    if (profiles.length === 0) return null;
    return profiles.find((p) => p.id === activeProfileId) || profiles[0];
  }, [profiles, activeProfileId]);

  const latestVitalByProfile = useMemo(
    () => computeLatestVitalByProfile(profiles, allVitalsLog, todayStr),
    [profiles, allVitalsLog, todayStr]
  );

  const activeVitalSummary = useMemo(() => {
    if (!activeProfile) return null;
    return latestVitalByProfile.get(activeProfile.id) || null;
  }, [activeProfile, latestVitalByProfile]);

  useEffect(() => {
    if (!dropdownOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen]);

  const handleChooseProfile = useCallback(
    (profileId: string) => {
      setDropdownOpen(false);
      onSelectProfile?.(profileId);
    },
    [onSelectProfile]
  );

  const displayAvatar = activeProfile?.avatarEmoji || '❤️';
  const displayTitle = activeProfile
    ? activeProfile.relation &&
      !activeProfile.name.toLowerCase().startsWith(activeProfile.relation.toLowerCase())
      ? `${activeProfile.relation} · ${activeProfile.name}`
      : activeProfile.name
    : fallbackPatient.name;

  const displaySubtitle = useMemo(() => {
    if (activeVitalSummary?.latest) {
      const v = activeVitalSummary.latest;
      return `HA ${v.sys}/${v.dia}${v.pulse ? ` · ♥${v.pulse}` : ''}`;
    }
    return APP_SHORT_TITLE;
  }, [activeVitalSummary]);

  return (
    <header className="sticky top-0 z-30 bg-surface-card/95 backdrop-blur-md border-b border-border-card shadow-2xs">
      <div className="max-w-5xl mx-auto px-2.5 py-1.5 sm:px-5 sm:py-2">
        <div className="flex items-center justify-between gap-2 min-h-[52px]">
          {/* Cụm Trái: Avatar + Dropdown chuyển nhanh Hồ Sơ Sức Khỏe */}
          <div ref={dropdownRef} className="relative min-w-0 flex-1 md:flex-initial">
            <button
              type="button"
              onClick={() => {
                if (profiles.length > 0) {
                  setDropdownOpen((prev) => !prev);
                } else if (onOpenProfileList) {
                  onOpenProfileList();
                }
              }}
              aria-haspopup={profiles.length > 0 ? 'menu' : undefined}
              aria-expanded={profiles.length > 0 ? dropdownOpen : undefined}
              title="Bấm để chuyển đổi hoặc cài đặt hồ sơ sức khỏe gia đình"
              className="min-h-[48px] min-w-[48px] max-w-full px-2 sm:px-2.5 py-1.5 rounded-2xl bg-medical-surface/80 hover:bg-medical-surface border border-medical-border flex items-center gap-2 transition cursor-pointer"
            >
              <span
                aria-hidden="true"
                className="w-9 h-9 rounded-xl bg-surface-card border border-medical-border flex items-center justify-center text-lg shrink-0 shadow-2xs"
              >
                {displayAvatar}
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-1 min-w-0">
                  <span className="text-sm sm:text-base font-extrabold text-text-main truncate leading-tight">
                    {displayTitle}
                  </span>
                  {profiles.length > 0 && (
                    <ChevronDown
                      className={`w-4 h-4 text-medical-primary shrink-0 transition-transform duration-200 ${
                        dropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </span>
                <span className="block text-xs font-semibold text-text-muted truncate leading-tight">
                  {displaySubtitle}
                </span>
              </span>
            </button>

            {dropdownOpen && profiles.length > 0 && (
              <ProfileDropdownMenu
                profiles={profiles}
                activeProfileId={activeProfile?.id}
                latestVitalByProfile={latestVitalByProfile}
                onChooseProfile={handleChooseProfile}
                onClose={() => setDropdownOpen(false)}
                onOpenAddProfile={onOpenAddProfile}
                onOpenEditProfile={onOpenEditProfile}
                onOpenProfileList={onOpenProfileList}
                onOpenMembers={onOpenMembers}
              />
            )}
          </div>

          {/* Cụm Giữa (Desktop >= md): 4 Tab chuẩn đồng nhất */}
          <nav
            aria-label="Điều hướng chính trên máy tính"
            className="hidden md:flex items-center gap-1 p-1 bg-slate-100 border border-border-card rounded-2xl shrink-0"
          >
            {PRIMARY_NAV_TABS.map((tab) => {
              const Icon = DESKTOP_TAB_ICONS[tab.id];
              const isActive = activePrimaryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeView(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-extrabold flex items-center gap-2 transition cursor-pointer ${
                    isActive
                      ? 'bg-medical-primary text-white shadow-2xs'
                      : 'text-text-body hover:text-text-main hover:bg-surface-card'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.desktopLabel}</span>
                </button>
              );
            })}
          </nav>

          {/* Cụm Phải: Trạng thái Sync êm dịu + Nút Chữ To (A+) + Nút SOS đỏ nổi bật duy nhất */}
          <div className="flex items-center gap-1.5 shrink-0">
            <OfflineSyncIndicator
              compact
              status={syncStatus}
              onRetry={onRefreshData}
              className="hidden lg:inline-flex"
            />

            {syncStatus !== 'synced' && onRefreshData && (
              <button
                type="button"
                onClick={onRefreshData}
                title={
                  syncStatus === 'syncing'
                    ? 'Đang đồng bộ dữ liệu Google Sheets...'
                    : syncStatus === 'offline'
                      ? 'Đang ngoại tuyến - bấm để kiểm tra lại'
                      : 'Chưa đồng bộ được - bấm để thử lại'
                }
                aria-label="Trạng thái đồng bộ dữ liệu"
                className={`lg:hidden min-h-[48px] min-w-[48px] px-2.5 rounded-xl border flex items-center justify-center transition cursor-pointer ${
                  syncStatus === 'syncing'
                    ? 'bg-medical-surface border-medical-border text-medical-dark'
                    : syncStatus === 'offline'
                      ? 'bg-vital-warning-bg border-amber-300 text-amber-900'
                      : 'bg-vital-danger-bg border-rose-300 text-rose-900'
                }`}
              >
                {syncStatus === 'syncing' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : syncStatus === 'offline' ? (
                  <WifiOff className="w-4 h-4 text-vital-warning" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-vital-danger" />
                )}
              </button>
            )}

            <SeniorTextToggle compact />

            <button
              type="button"
              onClick={onOpenEmergencyContacts}
              id="btn-open-emergency-contacts"
              title="Danh bạ số khẩn cấp (Bác sĩ, 115, Bệnh viện)"
              className="min-h-[48px] min-w-[48px] px-3 sm:px-3.5 py-2 rounded-xl bg-vital-danger hover:bg-rose-700 text-white text-sm font-extrabold border border-rose-700 inline-flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
            >
              <PhoneCall className="w-4 h-4 text-white shrink-0" />
              <span>SOS</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeaderBar;
