'use client';

import React from 'react';
import { PatientInfo } from '@/lib/types';
import { PATIENT_INFO } from '@/lib/config';
import {
  HeartPulse,
  TrendingUp,
  Users as UsersIcon,
  FileSpreadsheet,
  PhoneCall,
  Edit3,
  Home,
  Smartphone,
} from 'lucide-react';

// V2.0: 3 tab chính
export type AppView = 'today' | 'charts' | 'family';

interface HeaderBarProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  onOpenGuide: () => void;
  onOpenEmergencyContacts: () => void;
  onOpenInstallApp?: () => void;
  patientInfo?: PatientInfo;
  isAdmin?: boolean;
  onOpenAdminPin?: () => void;
  onOpenMembers?: () => void;
  onEditPatient?: () => void;
}

export default function HeaderBar({
  activeView,
  onChangeView,
  onOpenGuide,
  onOpenEmergencyContacts,
  onOpenInstallApp,
  patientInfo,
  isAdmin,
  onOpenAdminPin,
  onOpenMembers,
  onEditPatient,
}: HeaderBarProps) {
  const patient: PatientInfo = patientInfo || PATIENT_INFO;

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-3 py-2 sm:px-5 sm:py-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Cụm Trái: Tên app & Bệnh nhân */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600 shadow-2xs">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-base sm:text-lg font-black text-slate-900 truncate">
                    {patient.name}
                  </span>
                  {onEditPatient && (
                    <button
                      type="button"
                      onClick={onEditPatient}
                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition hidden sm:inline-flex"
                      title="Chỉnh sửa thông tin bệnh nhân (Admin PIN)"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold shrink-0">
                    <Home className="w-3 h-3" />
                    Tại nhà
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium truncate">
                  Sổ Sức Khỏe Bố — Chăm Bố Mỗi Ngày
                </div>
              </div>
            </div>

            {/* Cụm Giữa (Desktop >= md): 3 Tab */}
            <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl">
              <button
                type="button"
                onClick={() => onChangeView('today')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeView === 'today'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <span>Hôm Nay</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeView('charts')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeView === 'charts'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span>Biểu Đồ HA</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeView('family')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  activeView === 'family'
                    ? 'bg-white text-slate-900 shadow-2xs font-black'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <UsersIcon className="w-4 h-4 text-emerald-500" />
                <span>Gia Đình</span>
              </button>
            </div>

            {/* Cụm Phải: Thành viên + Admin + Sheet + SOS */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Quản lý thành viên */}
              {onOpenMembers && (
                <button
                  type="button"
                  onClick={onOpenMembers}
                  id="btn-open-members-mgmt"
                  className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-xs font-bold transition min-h-[40px] min-w-[40px] shadow-2xs cursor-pointer shrink-0"
                  title="Quản lý thành viên gia đình"
                >
                  <UsersIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="hidden lg:inline">Thành viên</span>
                </button>
              )}

              {/* Quyền Admin / Mã PIN */}
              {onOpenAdminPin && (
                <button
                  type="button"
                  onClick={onOpenAdminPin}
                  id="btn-admin-pin-toggle"
                  className={`inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition min-h-[40px] shadow-2xs cursor-pointer shrink-0 ${
                    isAdmin
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                      : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200'
                  }`}
                  title={
                    isAdmin
                      ? 'Đang bật quyền Admin (Bấm để đổi PIN hoặc khoá lại)'
                      : 'Mở khoá quyền Admin để chỉnh sửa thông tin quan trọng'
                  }
                >
                  <span>{isAdmin ? '👑' : '🔒'}</span>
                  <span className="hidden sm:inline">Admin</span>
                </button>
              )}

              {/* Nút Cài App lên điện thoại (PWA) */}
              {onOpenInstallApp && (
                <button
                  type="button"
                  onClick={onOpenInstallApp}
                  id="btn-open-install-pwa"
                  className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition min-h-[40px] min-w-[40px] shadow-2xs cursor-pointer shrink-0"
                  title="Cài ứng dụng lên màn hình chính điện thoại"
                >
                  <Smartphone className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="hidden sm:inline">Cài App</span>
                </button>
              )}

              {/* Nút Google Sheets */}
              <button
                type="button"
                onClick={onOpenGuide}
                id="btn-open-sheets-guide"
                className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition min-h-[40px] min-w-[40px] shadow-2xs cursor-pointer shrink-0"
                title="Cấu hình Google Sheets & Vercel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="hidden lg:inline">Sheet</span>
              </button>

              {/* Nút SOS nổi bật */}
              <button
                type="button"
                onClick={onOpenEmergencyContacts}
                id="btn-open-emergency-contacts"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-black border border-rose-700 transition min-h-[40px] shadow-xs cursor-pointer active:scale-95 group shrink-0"
                title="Danh bạ số khẩn cấp (Bác sĩ, 115, Điều dưỡng)"
              >
                <PhoneCall className="w-4 h-4 text-white group-hover:animate-bounce shrink-0" />
                <span>SOS</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* THANH ĐIỀU HƯỚNG CỐ ĐỊNH DƯỚI ĐÁY MÀN HÌNH TRÊN MOBILE (< md) — DỄ BẤM 1 TAY CHO MẸ */}
      <nav
        aria-label="Điều hướng chính trên điện thoại"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] px-2 py-1.5"
      >
        <div className="grid grid-cols-3 gap-1.5 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => onChangeView('today')}
            className={`min-h-[52px] rounded-2xl px-2 py-1.5 flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
              activeView === 'today'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 font-black shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 font-bold'
            }`}
          >
            <HeartPulse
              className={`w-5 h-5 ${activeView === 'today' ? 'text-rose-600' : 'text-slate-400'}`}
            />
            <span className="text-xs leading-tight">Hôm Nay</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('charts')}
            className={`min-h-[52px] rounded-2xl px-2 py-1.5 flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
              activeView === 'charts'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-black shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 font-bold'
            }`}
          >
            <TrendingUp
              className={`w-5 h-5 ${activeView === 'charts' ? 'text-indigo-600' : 'text-slate-400'}`}
            />
            <span className="text-xs leading-tight">Biểu Đồ HA</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('family')}
            className={`min-h-[52px] rounded-2xl px-2 py-1.5 flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
              activeView === 'family'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-black shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 font-bold'
            }`}
          >
            <UsersIcon
              className={`w-5 h-5 ${activeView === 'family' ? 'text-emerald-600' : 'text-slate-400'}`}
            />
            <span className="text-xs leading-tight">Gia Đình</span>
          </button>
        </div>
      </nav>
    </>
  );
}
