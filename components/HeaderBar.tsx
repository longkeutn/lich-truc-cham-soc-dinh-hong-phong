'use client';

import React, { useState, useEffect } from 'react';
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
  Type,
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
  const [isLargeText, setIsLargeText] = useState(false);

  // Khôi phục chế độ Chữ Cực To cho người lớn tuổi
  useEffect(() => {
    try {
      const saved = localStorage.getItem('care_senior_xl_text');
      if (saved === 'true') {
        setIsLargeText(true);
        document.documentElement.classList.add('senior-xl-text');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleLargeText = () => {
    const next = !isLargeText;
    setIsLargeText(next);
    try {
      if (next) {
        document.documentElement.classList.add('senior-xl-text');
        localStorage.setItem('care_senior_xl_text', 'true');
      } else {
        document.documentElement.classList.remove('senior-xl-text');
        localStorage.setItem('care_senior_xl_text', 'false');
      }
    } catch {
      // ignore
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-5xl mx-auto px-3 py-2 sm:px-5 sm:py-2.5">
          <div className="flex items-center justify-between gap-2">
            {/* Cụm Trái: Tên app & Bệnh nhân */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-700 flex items-center justify-center shrink-0 text-white shadow-2xs">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base sm:text-lg font-extrabold text-slate-900 truncate leading-tight">
                    {patient.name}
                  </span>
                  {onEditPatient && (
                    <button
                      type="button"
                      onClick={onEditPatient}
                      className="p-1 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition hidden sm:inline-flex cursor-pointer shrink-0"
                      title="Chỉnh sửa thông tin bệnh nhân (Admin PIN)"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(patient.headerBadge ?? 'Tại nhà') !== '' && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold shrink-0">
                      <Home className="w-3 h-3 text-teal-600" />
                      {patient.headerBadge ?? 'Tại nhà'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  {(patient.headerBadge ?? 'Tại nhà') !== '' && (
                    <span className="inline-flex sm:hidden items-center gap-0.5 px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold shrink-0">
                      <Home className="w-2.5 h-2.5 text-teal-600" />
                      {patient.headerBadge ?? 'Tại nhà'}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 font-medium truncate">
                    Sổ Sức Khỏe Bố
                    <span className="hidden sm:inline"> • Chăm sóc hàng ngày</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Cụm Giữa (Desktop >= md): 3 Tab đồng nhất tông màu Y tế */}
            <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl">
              <button
                type="button"
                onClick={() => onChangeView('today')}
                className={`px-3.5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                  activeView === 'today'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <HeartPulse className="w-4 h-4" />
                <span>Việc Hôm Nay</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeView('charts')}
                className={`px-3.5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                  activeView === 'charts'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Biểu Đồ HA</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeView('family')}
                className={`px-3.5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                  activeView === 'family'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <UsersIcon className="w-4 h-4" />
                <span>Gia Đình</span>
              </button>
            </div>

            {/* Cụm Phải: Nút công cụ trung tính + Nút SOS đỏ nổi bật duy nhất */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Nút bật/tắt Chữ Cực To cho người lớn tuổi */}
              <button
                type="button"
                onClick={toggleLargeText}
                className={`inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold border transition min-h-[38px] sm:min-h-[40px] cursor-pointer shrink-0 ${
                  isLargeText
                    ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Bật/tắt chế độ Chữ To dành cho người lớn tuổi"
              >
                <Type className="w-3.5 h-3.5 shrink-0" />
                <span className="sm:hidden">{isLargeText ? 'Chữ To' : 'A+'}</span>
                <span className="hidden sm:inline">{isLargeText ? 'Chữ To: BẬT' : 'Chữ To'}</span>
              </button>

              {/* Quản lý thành viên */}
              {onOpenMembers && (
                <button
                  type="button"
                  onClick={onOpenMembers}
                  id="btn-open-members-mgmt"
                  className="inline-flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition min-h-[38px] min-w-[38px] sm:min-h-[40px] cursor-pointer shrink-0"
                  title="Quản lý thành viên gia đình"
                >
                  <UsersIcon className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="hidden lg:inline">Thành viên</span>
                </button>
              )}

              {/* Quyền Admin / Mã PIN */}
              {onOpenAdminPin && (
                <button
                  type="button"
                  onClick={onOpenAdminPin}
                  id="btn-admin-pin-toggle"
                  className={`inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold border transition min-h-[38px] min-w-[38px] sm:min-h-[40px] cursor-pointer shrink-0 ${
                    isAdmin
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
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
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition min-h-[40px] cursor-pointer shrink-0"
                  title="Cài ứng dụng lên màn hình chính điện thoại"
                >
                  <Smartphone className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Cài App</span>
                </button>
              )}

              {/* Nút Google Sheets */}
              <button
                type="button"
                onClick={onOpenGuide}
                id="btn-open-sheets-guide"
                className="hidden sm:inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition min-h-[40px] cursor-pointer shrink-0"
                title="Cấu hình Google Sheets & Vercel"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-700 shrink-0" />
                <span className="hidden lg:inline">Sheet</span>
              </button>

              {/* Nút SOS nổi bật rõ ràng (Duy nhất màu đỏ khẩn cấp trên thanh Header) */}
              <button
                type="button"
                onClick={onOpenEmergencyContacts}
                id="btn-open-emergency-contacts"
                className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold border border-rose-700 transition min-h-[38px] sm:min-h-[40px] shadow-2xs cursor-pointer active:scale-95 shrink-0"
                title="Danh bạ số khẩn cấp (Bác sĩ, 115, Điều dưỡng)"
              >
                <PhoneCall className="w-3.5 h-3.5 text-white shrink-0" />
                <span>SOS</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* THANH ĐIỀU HƯỚNG CỐ ĐỊNH DƯỚI ĐÁY MÀN HÌNH TRÊN MOBILE (< md) — ĐỒNG NHẤT TÔNG MÀU TEAL/SLATE */}
      <nav
        aria-label="Điều hướng chính trên điện thoại"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] px-3 py-1.5"
      >
        <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => onChangeView('today')}
            className={`min-h-[54px] rounded-xl px-2 py-1.5 flex flex-col items-center justify-center gap-0.5 transition cursor-pointer border ${
              activeView === 'today'
                ? 'bg-teal-700 text-white border-teal-800 font-extrabold shadow-2xs'
                : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-100 font-semibold'
            }`}
          >
            <HeartPulse
              className={`w-5 h-5 ${activeView === 'today' ? 'text-white' : 'text-slate-500'}`}
            />
            <span className="text-xs leading-tight">Việc Hôm Nay</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('charts')}
            className={`min-h-[54px] rounded-xl px-2 py-1.5 flex flex-col items-center justify-center gap-0.5 transition cursor-pointer border ${
              activeView === 'charts'
                ? 'bg-teal-700 text-white border-teal-800 font-extrabold shadow-2xs'
                : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-100 font-semibold'
            }`}
          >
            <TrendingUp
              className={`w-5 h-5 ${activeView === 'charts' ? 'text-white' : 'text-slate-500'}`}
            />
            <span className="text-xs leading-tight">Biểu Đồ HA</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('family')}
            className={`min-h-[54px] rounded-xl px-2 py-1.5 flex flex-col items-center justify-center gap-0.5 transition cursor-pointer border ${
              activeView === 'family'
                ? 'bg-teal-700 text-white border-teal-800 font-extrabold shadow-2xs'
                : 'bg-transparent text-slate-600 border-transparent hover:bg-slate-100 font-semibold'
            }`}
          >
            <UsersIcon
              className={`w-5 h-5 ${activeView === 'family' ? 'text-white' : 'text-slate-500'}`}
            />
            <span className="text-xs leading-tight">Gia Đình</span>
          </button>
        </div>
      </nav>
    </>
  );
}
