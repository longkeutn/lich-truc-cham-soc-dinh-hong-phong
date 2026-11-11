'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Users,
  Wallet,
  PhoneCall,
  Bell,
  Smartphone,
  RefreshCw,
  ShieldCheck,
  Lock,
  FileSpreadsheet,
  Plus,
  Edit3,
  Pill,
  CalendarHeart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  EmergencyContact,
  FamilyMember,
  HealthProfile,
  ShiftRecord,
} from '@/lib/types';
import { APP_SHORT_TITLE, ENABLE_FAMILY_SHIFT_TAB } from '@/lib/config';
import { MedicalSkeletonLoader } from '@/components/ui-kit';

const FamilySupportView = dynamic(() => import('@/components/FamilySupportView'), {
  loading: () => (
    <MedicalSkeletonLoader
      variant="checklist"
      rows={3}
      label="Đang mở lịch gia đình đồng hành..."
    />
  ),
});

export interface FamilyManagementHubProps {
  profiles: HealthProfile[];
  activeProfile: HealthProfile;
  members: FamilyMember[];
  contacts: EmergencyContact[];
  shifts: ShiftRecord[];
  expensesCount: number;
  todayStr: string;
  isLoading: boolean;
  isAdmin: boolean;
  isExpenseUnlocked: boolean;
  onSelectProfile: (profileId: string) => void;
  onOpenProfileList: () => void;
  onOpenAddProfile: () => void;
  onOpenMembers: () => void;
  onEditPatient: () => void;
  onOpenRoutineManager: () => void;
  onOpenExpenses: () => void;
  onOpenEmergencyContacts: () => void;
  onOpenNotificationSettings: () => void;
  onOpenInstallApp: () => void;
  onOpenAdminPin: () => void;
  onOpenGuide: () => void;
  onRefreshData: () => void;
  onSaveShift: (shift: ShiftRecord) => Promise<void>;
}

/**
 * Tab 4 (Gia Đình & Quản Trị): Tập trung toàn bộ quản lý hồ sơ thành viên,
 * Sổ Thu Chi Y Tế (bảo vệ mã PIN), Danh bạ khẩn cấp SOS, Tiện ích hệ thống và Lịch phụ chăm sóc.
 */
export function FamilyManagementHub({
  profiles,
  activeProfile,
  members,
  contacts,
  shifts,
  expensesCount,
  todayStr,
  isLoading,
  isAdmin,
  isExpenseUnlocked,
  onSelectProfile,
  onOpenProfileList,
  onOpenAddProfile,
  onOpenMembers,
  onEditPatient,
  onOpenRoutineManager,
  onOpenExpenses,
  onOpenEmergencyContacts,
  onOpenNotificationSettings,
  onOpenInstallApp,
  onOpenAdminPin,
  onOpenGuide,
  onRefreshData,
  onSaveShift,
}: FamilyManagementHubProps) {
  const [showShiftSchedule, setShowShiftSchedule] = useState<boolean>(
    ENABLE_FAMILY_SHIFT_TAB
  );

  const featuredContacts = contacts.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Khối 1: Hồ sơ Sức khỏe & Thành viên Gia đình */}
      <section className="rounded-2xl bg-surface-card border border-border-card p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-medical-surface border border-medical-border text-medical-dark text-xs font-extrabold">
              <Users className="w-3.5 h-3.5" />
              <span>{APP_SHORT_TITLE}</span>
            </span>
            <h2 className="text-lg sm:text-xl font-black text-text-main mt-1">
              Hồ Sơ Sức Khỏe &amp; Thành Viên Gia Đình
            </h2>
            <p className="text-sm text-text-muted">
              Đang chọn:{' '}
              <strong className="text-text-main">
                {activeProfile.avatarEmoji} {activeProfile.relation} · {activeProfile.name}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenAddProfile}
              className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-medical-primary hover:bg-medical-dark text-white text-sm font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Thêm Hồ Sơ</span>
            </button>
            <button
              type="button"
              onClick={onOpenProfileList}
              className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-medical-surface hover:bg-teal-100/70 text-medical-dark border border-medical-border text-sm font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Quản Lý Hồ Sơ ({profiles.length})</span>
            </button>
          </div>
        </div>

        {/* Chuyển nhanh hồ sơ 1 chạm */}
        <div className="flex flex-wrap gap-2 pt-1">
          {profiles.map((p) => {
            const selected = p.id === activeProfile.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProfile(p.id)}
                className={`min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl border text-sm font-extrabold inline-flex items-center gap-2 transition cursor-pointer ${
                  selected
                    ? 'bg-medical-primary text-white border-medical-dark shadow-2xs'
                    : 'bg-slate-50 hover:bg-medical-surface text-text-main border-border-card'
                }`}
              >
                <span aria-hidden="true" className="text-lg">
                  {p.avatarEmoji || '🧑'}
                </span>
                <span>
                  {p.relation ? `${p.relation} · ` : ''}
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={onOpenMembers}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-text-body border border-border-card text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Users className="w-4 h-4 text-medical-primary shrink-0" />
            <span>DS Thành Viên ({members.length})</span>
          </button>
          <button
            type="button"
            onClick={onEditPatient}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-text-body border border-border-card text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-medical-primary shrink-0" />
            <span>Sửa Bệnh Án Chi Tiết</span>
          </button>
          <button
            type="button"
            onClick={onOpenRoutineManager}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-text-body border border-border-card text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Pill className="w-4 h-4 text-medical-primary shrink-0" />
            <span>Quản Lý Đơn Thuốc</span>
          </button>
        </div>
      </section>

      {/* Khối 2: Sổ Thu Chi Y Tế & Danh Bạ Khẩn Cấp SOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Thẻ Sổ Thu Chi Điều Trị (Mã PIN bảo mật riêng) */}
        <section className="rounded-2xl bg-surface-card border border-amber-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-vital-warning-bg border border-amber-300 text-amber-900 text-xs font-extrabold">
                <Wallet className="w-3.5 h-3.5 text-expense-accent" />
                <span>Tài chính y tế gia đình</span>
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1 ${
                  isExpenseUnlocked
                    ? 'bg-vital-safe-bg text-emerald-900 border-emerald-300'
                    : 'bg-slate-100 text-text-body border-border-card'
                }`}
              >
                {isExpenseUnlocked ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-vital-safe" />
                    <span>Đã mở khóa</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-text-muted" />
                    <span>Bảo vệ mã PIN</span>
                  </>
                )}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-text-main">
              Sổ Thu Chi Y Tế &amp; Điều Trị
            </h3>
            <p className="text-sm text-text-body leading-relaxed">
              Theo dõi minh bạch quỹ đóng góp, viện phí, thuốc men, tiền ứng trước theo từng
              giai đoạn điều trị ({expensesCount} mục đã lưu).
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenExpenses}
            className="min-h-[52px] min-w-[48px] w-full px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm sm:text-base font-extrabold flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
          >
            <Wallet className="w-5 h-5 shrink-0" />
            <span>
              {isExpenseUnlocked ? 'Mở Sổ Thu Chi Y Tế' : 'Nhập Mã PIN Mở Sổ Thu Chi'}
            </span>
          </button>
        </section>

        {/* Thẻ Danh Bạ Khẩn Cấp SOS */}
        <section className="rounded-2xl bg-surface-card border border-rose-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3.5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-vital-danger-bg border border-rose-200 text-rose-900 text-xs font-extrabold">
                <PhoneCall className="w-3.5 h-3.5 text-vital-danger" />
                <span>Liên hệ cấp cứu 24/7</span>
              </span>
              <span className="text-xs font-bold text-text-muted">
                {contacts.length} đầu số
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-text-main">
              Danh Bạ Khẩn Cấp (Bác Sĩ, Bệnh Viện, 115)
            </h3>

            {featuredContacts.length > 0 ? (
              <div className="space-y-1.5 pt-0.5">
                {featuredContacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-border-card"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-text-main truncate">
                        {c.name}
                      </div>
                      <div className="text-xs font-bold text-text-muted truncate">
                        {c.phone}
                      </div>
                    </div>
                    <a
                      href={`tel:${c.phone.replace(/\s+/g, '')}`}
                      className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-vital-danger hover:bg-rose-700 text-white text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 shrink-0 transition"
                    >
                      <PhoneCall className="w-4 h-4 shrink-0" />
                      <span>Gọi</span>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                Bấm mở danh bạ để xem và lưu số điện thoại Bác sĩ điều trị, Cấp cứu 115.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenEmergencyContacts}
            className="min-h-[52px] min-w-[48px] w-full px-4 py-2.5 rounded-xl bg-vital-danger-bg hover:bg-rose-100 text-rose-900 border border-rose-300 text-sm sm:text-base font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <PhoneCall className="w-5 h-5 text-vital-danger shrink-0" />
            <span>Mở Toàn Bộ Danh Bạ Khẩn Cấp</span>
          </button>
        </section>
      </div>

      {/* Khối 3: Cài Đặt Tiện Ích & Quản Trị Hệ Thống */}
      <section className="rounded-2xl bg-surface-card border border-border-card p-4 sm:p-5 shadow-2xs space-y-3">
        <h3 className="text-base sm:text-lg font-black text-text-main">
          Tiện Ích Chăm Sóc &amp; Cài Đặt Hệ Thống
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={onOpenNotificationSettings}
            className="min-h-[52px] min-w-[48px] px-3.5 py-2.5 rounded-xl bg-medical-surface hover:bg-teal-100/70 text-medical-dark border border-medical-border text-sm font-extrabold flex items-center gap-2.5 transition cursor-pointer text-left"
          >
            <Bell className="w-5 h-5 shrink-0" />
            <span>Hẹn Giờ &amp; Giọng Đọc</span>
          </button>

          <button
            type="button"
            onClick={onOpenInstallApp}
            className="min-h-[52px] min-w-[48px] px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-text-body border border-border-card text-sm font-extrabold flex items-center gap-2.5 transition cursor-pointer text-left"
          >
            <Smartphone className="w-5 h-5 text-medical-primary shrink-0" />
            <span>Cài App Lên Màn Hình</span>
          </button>

          <button
            type="button"
            onClick={onRefreshData}
            disabled={isLoading}
            className="min-h-[52px] min-w-[48px] px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-text-body border border-border-card text-sm font-extrabold flex items-center gap-2.5 transition cursor-pointer text-left disabled:opacity-60"
          >
            <RefreshCw
              className={`w-5 h-5 text-medical-primary shrink-0 ${
                isLoading ? 'animate-spin' : ''
              }`}
            />
            <span>Đồng Bộ Google Sheets</span>
          </button>

          <button
            type="button"
            onClick={onOpenAdminPin}
            className={`min-h-[52px] min-w-[48px] px-3.5 py-2.5 rounded-xl border text-sm font-extrabold flex items-center gap-2.5 transition cursor-pointer text-left ${
              isExpenseUnlocked
                ? 'bg-vital-safe-bg text-emerald-900 border-emerald-300'
                : isAdmin
                  ? 'bg-vital-warning-bg text-amber-900 border-amber-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-text-body border-border-card'
            }`}
          >
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>
              {isExpenseUnlocked
                ? 'Quyền Admin: Toàn quyền'
                : isAdmin
                  ? 'Quyền: Sửa danh mục'
                  : 'Mở Khóa Quyền Admin'}
            </span>
          </button>
        </div>

        {isExpenseUnlocked && (
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenGuide}
              className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-medical-surface hover:bg-teal-100/70 text-medical-dark border border-medical-border text-sm font-extrabold inline-flex items-center gap-2 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Cấu Hình Google Sheets &amp; Mã Nguồn Code.gs</span>
            </button>
          </div>
        )}
      </section>

      {/* Khối 4: Lịch Gia Đình Phụ Chăm Sóc & Lịch Sử Trực ICU */}
      {!ENABLE_FAMILY_SHIFT_TAB && (
        <div className="rounded-2xl bg-surface-card border border-border-card p-3.5 sm:p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <CalendarHeart className="w-5 h-5 text-medical-primary shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-text-main">
                Lịch Gia Đình Đồng Hành &amp; Hỗ Trợ Chăm Sóc
              </h3>
              <p className="text-xs sm:text-sm text-text-muted">
                Đăng ký lịch con cháu qua thăm hoặc phụ chăm sóc trong tuần
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowShiftSchedule((prev) => !prev)}
            className="min-h-[48px] min-w-[48px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-body text-sm font-extrabold inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>{showShiftSchedule ? 'Thu gọn lịch' : 'Mở lịch đồng hành'}</span>
            {showShiftSchedule ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {showShiftSchedule && (
        <FamilySupportView
          shifts={shifts}
          members={members}
          isAdmin={isAdmin}
          todayStr={todayStr}
          onSaveShift={onSaveShift}
          onOpenMembers={onOpenMembers}
        />
      )}
    </div>
  );
}

export default FamilyManagementHub;
