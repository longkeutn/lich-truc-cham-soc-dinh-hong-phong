'use client';

import React from 'react';
import { Activity } from 'lucide-react';

export type MedicalEmptyTone = 'medical' | 'thyroid' | 'warning' | 'danger';

export interface MedicalEmptyAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export interface MedicalEmptyStateProps {
  icon?: React.ReactNode;
  badge?: string;
  title: string;
  description: React.ReactNode;
  primaryAction?: MedicalEmptyAction;
  secondaryAction?: MedicalEmptyAction;
  tone?: MedicalEmptyTone;
  className?: string;
}

const TONE_STYLES: Record<
  MedicalEmptyTone,
  {
    wrapperBorder: string;
    iconBox: string;
    badgeClass: string;
    primaryBtn: string;
    secondaryBtn: string;
  }
> = {
  medical: {
    wrapperBorder: 'border-medical-border bg-surface-card',
    iconBox: 'bg-medical-surface border-medical-border text-medical-primary',
    badgeClass: 'bg-medical-surface text-medical-dark border-medical-border',
    primaryBtn: 'bg-medical-primary hover:bg-medical-dark text-white border-medical-dark',
    secondaryBtn: 'bg-medical-surface hover:bg-teal-100 text-medical-dark border-medical-border',
  },
  thyroid: {
    wrapperBorder: 'border-indigo-200 bg-surface-card',
    iconBox: 'bg-thyroid-bg border-indigo-200 text-thyroid-accent',
    badgeClass: 'bg-thyroid-bg text-indigo-800 border-indigo-200',
    primaryBtn: 'bg-thyroid-accent hover:bg-indigo-700 text-white border-indigo-700',
    secondaryBtn: 'bg-thyroid-bg hover:bg-indigo-100 text-indigo-900 border-indigo-200',
  },
  warning: {
    wrapperBorder: 'border-amber-300 bg-vital-warning-bg/40',
    iconBox: 'bg-vital-warning-bg border-amber-300 text-vital-warning',
    badgeClass: 'bg-vital-warning-bg text-amber-900 border-amber-300',
    primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700',
    secondaryBtn: 'bg-white hover:bg-amber-50 text-amber-900 border-amber-300',
  },
  danger: {
    wrapperBorder: 'border-rose-300 bg-vital-danger-bg/40',
    iconBox: 'bg-vital-danger-bg border-rose-300 text-vital-danger',
    badgeClass: 'bg-vital-danger-bg text-rose-900 border-rose-300',
    primaryBtn: 'bg-vital-danger hover:bg-rose-700 text-white border-rose-700',
    secondaryBtn: 'bg-white hover:bg-rose-50 text-rose-900 border-rose-300',
  },
};

export function MedicalEmptyState({
  icon,
  badge,
  title,
  description,
  primaryAction,
  secondaryAction,
  tone = 'medical',
  className = '',
}: MedicalEmptyStateProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center shadow-2xs space-y-4 ${styles.wrapperBorder} ${className}`}
    >
      <div
        className={`w-16 h-16 mx-auto rounded-2xl border flex items-center justify-center ${styles.iconBox}`}
      >
        {icon || <Activity className="w-8 h-8" />}
      </div>

      <div className="max-w-lg mx-auto space-y-2">
        {badge && (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold border ${styles.badgeClass}`}
          >
            {badge}
          </span>
        )}
        <h3 className="text-lg sm:text-xl font-black text-text-main leading-snug">
          {title}
        </h3>
        <div className="text-sm sm:text-base text-text-body font-medium leading-relaxed">
          {description}
        </div>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex items-center justify-center gap-3 flex-wrap pt-1">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className={`min-h-[52px] min-w-[48px] px-5 py-2.5 rounded-xl border text-base font-extrabold inline-flex items-center justify-center gap-2 shadow-xs transition cursor-pointer ${styles.primaryBtn}`}
            >
              {primaryAction.icon}
              <span>{primaryAction.label}</span>
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className={`min-h-[52px] min-w-[48px] px-5 py-2.5 rounded-xl border text-base font-extrabold inline-flex items-center justify-center gap-2 transition cursor-pointer ${styles.secondaryBtn}`}
            >
              {secondaryAction.icon}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default MedicalEmptyState;
