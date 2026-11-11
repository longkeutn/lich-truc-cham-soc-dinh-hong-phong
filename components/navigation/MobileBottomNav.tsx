'use client';

import React, { useCallback } from 'react';
import {
  HeartPulse,
  TrendingUp,
  FlaskConical,
  Users,
} from 'lucide-react';
import {
  PRIMARY_NAV_TABS,
  resolveActivePrimaryTab,
  type AppView,
  type PrimaryNavTabId,
} from './navigationTypes';

export interface MobileBottomNavProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  todayPendingCount?: number;
  isAdminUnlocked?: boolean;
}

const TAB_ICONS: Record<PrimaryNavTabId, React.ComponentType<{ className?: string }>> = {
  today: HeartPulse,
  charts: TrendingUp,
  labs: FlaskConical,
  family: Users,
};

/**
 * Thanh điều hướng 4 Tab cố định dưới đáy màn hình di động (< md).
 * Tối ưu vùng ngón tay cái (Thumb Zone), chiều cao chạm >= 56px và tương phản đạt chuẩn WCAG AA.
 */
export function MobileBottomNav({
  activeView,
  onChangeView,
  todayPendingCount = 0,
  isAdminUnlocked = false,
}: MobileBottomNavProps) {
  const activePrimaryTab = resolveActivePrimaryTab(activeView);

  const handleTabPress = useCallback(
    (tabId: PrimaryNavTabId) => {
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(20);
        }
      } catch {
        // Bỏ qua nếu thiết bị không hỗ trợ rung xúc giác
      }
      onChangeView(tabId);
    },
    [onChangeView]
  );

  return (
    <nav
      aria-label="Điều hướng chính 4 tab trên điện thoại"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-card/95 backdrop-blur-md border-t border-border-card shadow-[0_-4px_18px_rgba(15,23,42,0.08)] px-2 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-4 gap-1.5 max-w-lg mx-auto">
        {PRIMARY_NAV_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.id];
          const isActive = activePrimaryTab === tab.id;
          const showPendingBadge = tab.id === 'today' && todayPendingCount > 0;
          const showAdminDot = tab.id === 'family' && isAdminUnlocked;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabPress(tab.id)}
              aria-label={tab.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              className={`relative min-h-[56px] min-w-[48px] rounded-xl px-1.5 py-1.5 flex flex-col items-center justify-center gap-1 border transition active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-medical-primary text-white border-medical-dark font-extrabold shadow-2xs'
                  : 'bg-transparent text-text-body border-transparent hover:bg-slate-100 font-bold'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-white' : 'text-text-muted'
                  }`}
                />
                {showPendingBadge && (
                  <span
                    aria-label={`Còn ${todayPendingCount} việc hôm nay`}
                    className={`absolute -top-2 -right-3.5 min-w-[20px] h-[20px] px-1 rounded-full text-xs font-black flex items-center justify-center leading-none border ${
                      isActive
                        ? 'bg-amber-300 text-slate-950 border-amber-400'
                        : 'bg-medical-primary text-white border-white'
                    }`}
                  >
                    {todayPendingCount > 9 ? '9+' : todayPendingCount}
                  </span>
                )}
                {showAdminDot && (
                  <span
                    aria-hidden="true"
                    className={`absolute -top-1 -right-2 w-2.5 h-2.5 rounded-full border ${
                      isActive
                        ? 'bg-amber-300 border-medical-dark'
                        : 'bg-vital-safe border-white'
                    }`}
                  />
                )}
              </div>
              <span className="text-xs sm:text-sm leading-tight truncate max-w-full">
                {tab.mobileLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomNav;
