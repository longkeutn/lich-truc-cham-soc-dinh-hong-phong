'use client';

import React from 'react';
import { FamilyMember, PatientInfo } from '@/lib/types';
import { FAMILY_MEMBERS, PATIENT_INFO } from '@/lib/config';
import {
  HeartPulse,
  TrendingUp,
  Users as UsersIcon,
  FileSpreadsheet,
  ChevronDown,
  PhoneCall,
  Edit3,
  Home,
  Settings,
} from 'lucide-react';

// V2.0: 3 tab mới thay thế weekly/monthly/analytics
export type AppView = 'today' | 'charts' | 'family';

interface HeaderBarProps {
  currentMember: FamilyMember | null;
  onSelectMember: (member: FamilyMember | null) => void;
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  onOpenGuide: () => void;
  onOpenEmergencyContacts: () => void;
  patientInfo?: PatientInfo;
  members?: FamilyMember[];
  isAdmin?: boolean;
  onOpenAdminPin?: () => void;
  onOpenMembers?: () => void;
  onEditPatient?: () => void;
}

export default function HeaderBar({
  currentMember,
  onSelectMember,
  activeView,
  onChangeView,
  onOpenGuide,
  onOpenEmergencyContacts,
  patientInfo,
  members,
  isAdmin,
  onOpenAdminPin,
  onOpenMembers,
  onEditPatient,
}: HeaderBarProps) {
  const patient: PatientInfo = patientInfo || PATIENT_INFO;
  const familyList = members && members.length > 0 ? members : FAMILY_MEMBERS;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-6xl mx-auto px-3 py-2 sm:px-5">
        <div className="flex items-center justify-between gap-2.5">
          {/* Cụm Trái: Tên app & Bệnh nhân */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600 shadow-2xs">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-black text-slate-900 truncate">
                  {patient.name}
                </span>
                {onEditPatient && (
                  <button
                    type="button"
                    onClick={onEditPatient}
                    className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    title="Chỉnh sửa thông tin bệnh nhân (Admin PIN)"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Badge "Tại nhà" */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                  <Home className="w-3 h-3" />
                  Tại nhà
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium truncate">
                Sổ Sức Khỏe Bố — Chăm Bố Mỗi Ngày
              </div>
            </div>
          </div>

          {/* Cụm Giữa (Desktop): 3 Tab mới */}
          <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => onChangeView('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeView === 'today'
                  ? 'bg-white text-slate-900 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
              <span>Hôm Nay</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeView('charts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeView === 'charts'
                  ? 'bg-white text-slate-900 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              <span>Biểu Đồ HA</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeView('family')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                activeView === 'family'
                  ? 'bg-white text-slate-900 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <UsersIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>Gia Đình</span>
            </button>
          </div>

          {/* Cụm Phải: Chọn thành viên + SOS + Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Member Selector */}
            <div className="relative">
              <select
                id="member-select"
                suppressHydrationWarning
                value={currentMember?.id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const found = familyList.find((m) => m.id === val) || null;
                  onSelectMember(found);
                }}
                className={`min-h-[38px] pl-2.5 sm:pl-3 pr-7 sm:pr-8 py-1.5 rounded-xl text-xs font-bold border-2 transition appearance-none cursor-pointer shadow-2xs max-w-[140px] sm:max-w-[200px] truncate ${
                  currentMember
                    ? `${currentMember.bgLight || 'bg-indigo-50'} ${
                        currentMember.borderLight || 'border-indigo-300'
                      } ${currentMember.textColor || 'text-indigo-950'}`
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                }`}
              >
                <option value="" className="bg-white text-slate-500">
                  👤 Tôi là ai?
                </option>
                {familyList.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white text-slate-900 font-bold">
                    {m.name} ({m.relation})
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Quản lý thành viên */}
            {onOpenMembers && (
              <button
                type="button"
                onClick={onOpenMembers}
                id="btn-open-members-mgmt"
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 text-xs font-bold transition min-h-[38px] shadow-2xs cursor-pointer shrink-0"
                title="Quản lý thành viên trong ban chăm sóc"
              >
                <UsersIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden md:inline">Thành viên</span>
              </button>
            )}

            {/* Quyền Admin / Mã PIN */}
            {onOpenAdminPin && (
              <button
                type="button"
                onClick={onOpenAdminPin}
                id="btn-admin-pin-toggle"
                className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition min-h-[38px] shadow-2xs cursor-pointer shrink-0 ${
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
                <span>{isAdmin ? '👑 Admin' : '🔒 Admin'}</span>
              </button>
            )}

            {/* Nút SOS */}
            <button
              type="button"
              onClick={onOpenEmergencyContacts}
              id="btn-open-emergency-contacts"
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold border border-rose-700 transition min-h-[38px] shadow-2xs cursor-pointer active:scale-95 group shrink-0"
              title="Danh bạ số khẩn cấp (Bác sĩ, 115, Điều dưỡng)"
            >
              <PhoneCall className="w-3.5 h-3.5 text-white group-hover:animate-bounce shrink-0" />
              <span>SOS</span>
            </button>

            {/* Nút Google Sheets */}
            <button
              type="button"
              onClick={onOpenGuide}
              id="btn-open-sheets-guide"
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition min-h-[38px] shadow-2xs cursor-pointer shrink-0"
              title="Cấu hình Google Sheets & Vercel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Sheet</span>
            </button>
          </div>
        </div>

        {/* Thanh chuyển tab trên mobile (< md) */}
        <div className="md:hidden flex items-center justify-between gap-1.5 pt-2 mt-1 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-1 flex-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => onChangeView('today')}
              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                activeView === 'today'
                  ? 'bg-white text-slate-900 shadow-2xs font-black'
                  : 'text-slate-600'
              }`}
            >
              <HeartPulse className="w-3 h-3 text-rose-500" />
              <span>Hôm Nay</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeView('charts')}
              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                activeView === 'charts'
                  ? 'bg-white text-slate-900 shadow-2xs font-black'
                  : 'text-slate-600'
              }`}
            >
              <TrendingUp className="w-3 h-3 text-indigo-500" />
              <span>Biểu Đồ</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeView('family')}
              className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                activeView === 'family'
                  ? 'bg-white text-slate-900 shadow-2xs font-black'
                  : 'text-slate-600'
              }`}
            >
              <UsersIcon className="w-3 h-3 text-emerald-500" />
              <span>Gia Đình</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
