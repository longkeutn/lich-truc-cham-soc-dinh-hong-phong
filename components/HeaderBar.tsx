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
      <header className="sticky top-0 z-30 bg-white border-b-2 border-slate-300 shadow-xs">
        <div className="max-w-6xl mx-auto px-2.5 py-2 sm:px-5 sm:py-3">
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            {/* Cụm Trái: Tên app & Bệnh nhân */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-700 flex items-center justify-center shrink-0 text-white shadow-xs">
                <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base sm:text-xl font-black text-slate-950 truncate leading-tight">
                    {patient.name}
                  </span>
                  {onEditPatient && (
                    <button
                      type="button"
                      onClick={onEditPatient}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition hidden sm:inline-flex cursor-pointer shrink-0"
                      title="Chỉnh sửa thông tin bệnh nhân (Admin PIN)"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  {(patient.headerBadge ?? 'Tại nhà') !== '' && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-700 text-white text-xs font-black shrink-0">
                      <Home className="w-3.5 h-3.5" />
                      {patient.headerBadge ?? 'Tại nhà'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  {(patient.headerBadge ?? 'Tại nhà') !== '' && (
                    <span className="inline-flex sm:hidden items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-emerald-700 text-white text-[10px] font-black shrink-0">
                      <Home className="w-2.5 h-2.5" />
                      {patient.headerBadge ?? 'Tại nhà'}
                    </span>
                  )}
                  <span className="text-[11px] sm:text-sm text-slate-700 font-bold truncate">
                    Sổ Sức Khỏe Bố
                    <span className="hidden sm:inline"> — Chăm Bố Mỗi Ngày</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Cụm Giữa (Desktop >= md): 3 Tab */}
            <div className="hidden md:flex items-center gap-1.5 p-1.5 bg-slate-200/80 border-2 border-slate-300 rounded-2xl">
              <button
                type="button"
                onClick={() => onChangeView('today')}
                className={`px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition cursor-pointer ${
                  activeView === 'today'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'text-slate-800 hover:bg-white'
                }`}
              >
                <HeartPulse className="w-4 h-4" />
                <span>Việc Hôm Nay</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeView('charts')}
                className={`px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition cursor-pointer ${
                  activeView === 'charts'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'text-slate-800 hover:bg-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Biểu Đồ HA</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeView('family')}
                className={`px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition cursor-pointer ${
                  activeView === 'family'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-800 hover:bg-white'
                }`}
              >
                <UsersIcon className="w-4 h-4" />
                <span>Gia Đình</span>
              </button>
            </div>

            {/* Cụm Phải: Nút Chữ To + Thành viên + Admin + Sheet + SOS */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Nút bật/tắt Chữ Cực To cho người lớn tuổi */}
              <button
                type="button"
                onClick={toggleLargeText}
                className={`inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black border-2 transition min-h-[40px] sm:min-h-[44px] shadow-2xs cursor-pointer shrink-0 ${
                  isLargeText
                    ? 'bg-indigo-700 text-white border-indigo-800'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
                }`}
                title="Bật/tắt chế độ Chữ Cực To dành cho người lớn tuổi"
              >
                <Type className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="sm:hidden">{isLargeText ? 'Chữ To' : 'A+'}</span>
                <span className="hidden sm:inline">{isLargeText ? 'Chữ To: BẬT' : 'A+ Chữ To'}</span>
              </button>

              {/* Quản lý thành viên */}
              {onOpenMembers && (
                <button
                  type="button"
                  onClick={onOpenMembers}
                  id="btn-open-members-mgmt"
                  className="inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-900 border-2 border-slate-300 text-xs sm:text-sm font-black transition min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] shadow-2xs cursor-pointer shrink-0"
                  title="Quản lý thành viên gia đình"
                >
                  <UsersIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="hidden lg:inline">Thành viên</span>
                </button>
              )}

              {/* Quyền Admin / Mã PIN */}
              {onOpenAdminPin && (
                <button
                  type="button"
                  onClick={onOpenAdminPin}
                  id="btn-admin-pin-toggle"
                  className={`inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black border-2 transition min-h-[40px] min-w-[40px] sm:min-h-[44px] shadow-2xs cursor-pointer shrink-0 ${
                    isAdmin
                      ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-600'
                      : 'bg-white hover:bg-amber-50 text-slate-900 border-slate-300'
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
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs sm:text-sm font-black border-2 border-rose-300 transition min-h-[44px] shadow-2xs cursor-pointer shrink-0"
                  title="Cài ứng dụng lên màn hình chính điện thoại"
                >
                  <Smartphone className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>Cài App</span>
                </button>
              )}

              {/* Nút Google Sheets */}
              <button
                type="button"
                onClick={onOpenGuide}
                id="btn-open-sheets-guide"
                className="hidden sm:inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-black border-2 border-slate-300 transition min-h-[44px] shadow-2xs cursor-pointer shrink-0"
                title="Cấu hình Google Sheets & Vercel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="hidden lg:inline">Sheet</span>
              </button>

              {/* Nút SOS nổi bật rõ ràng cho người lớn tuổi */}
              <button
                type="button"
                onClick={onOpenEmergencyContacts}
                id="btn-open-emergency-contacts"
                className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs sm:text-sm font-black border-2 border-rose-900 transition min-h-[40px] sm:min-h-[44px] shadow-sm cursor-pointer active:scale-95 shrink-0"
                title="Danh bạ số khẩn cấp (Bác sĩ, 115, Điều dưỡng)"
              >
                <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                <span>SOS</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* THANH ĐIỀU HƯỚNG CỐ ĐỊNH DƯỚI ĐÁY MÀN HÌNH TRÊN MOBILE (< md) — NÚT TO, ĐỘ TƯƠNG PHẢN CAO CHO NGƯỜI LỚN TUỔI */}
      <nav
        aria-label="Điều hướng chính trên điện thoại"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t-2 border-slate-300 shadow-[0_-6px_20px_rgba(15,23,42,0.12)] px-2.5 py-2"
      >
        <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => onChangeView('today')}
            className={`min-h-[60px] rounded-2xl px-2 py-2 flex flex-col items-center justify-center gap-1 transition cursor-pointer border-2 ${
              activeView === 'today'
                ? 'bg-rose-700 text-white border-rose-900 font-black shadow-sm'
                : 'bg-slate-100 text-slate-900 border-slate-300 hover:bg-slate-200 font-bold'
            }`}
          >
            <HeartPulse
              className={`w-6 h-6 ${activeView === 'today' ? 'text-white' : 'text-rose-700'}`}
            />
            <span className="text-sm leading-tight">Việc Hôm Nay</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('charts')}
            className={`min-h-[60px] rounded-2xl px-2 py-2 flex flex-col items-center justify-center gap-1 transition cursor-pointer border-2 ${
              activeView === 'charts'
                ? 'bg-indigo-700 text-white border-indigo-900 font-black shadow-sm'
                : 'bg-slate-100 text-slate-900 border-slate-300 hover:bg-slate-200 font-bold'
            }`}
          >
            <TrendingUp
              className={`w-6 h-6 ${activeView === 'charts' ? 'text-white' : 'text-indigo-700'}`}
            />
            <span className="text-sm leading-tight">Biểu Đồ HA</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeView('family')}
            className={`min-h-[60px] rounded-2xl px-2 py-2 flex flex-col items-center justify-center gap-1 transition cursor-pointer border-2 ${
              activeView === 'family'
                ? 'bg-emerald-700 text-white border-emerald-900 font-black shadow-sm'
                : 'bg-slate-100 text-slate-900 border-slate-300 hover:bg-slate-200 font-bold'
            }`}
          >
            <UsersIcon
              className={`w-6 h-6 ${activeView === 'family' ? 'text-white' : 'text-emerald-700'}`}
            />
            <span className="text-sm leading-tight">Gia Đình</span>
          </button>
        </div>
      </nav>
    </>
  );
}
