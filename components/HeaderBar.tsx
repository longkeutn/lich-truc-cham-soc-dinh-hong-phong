'use client';

import React from 'react';
import { CarePhase, FamilyMember, PatientInfo } from '@/lib/types';
import { FAMILY_MEMBERS, PATIENT_INFO } from '@/lib/config';
import {
  User,
  Calendar,
  CalendarDays,
  LineChart as ChartIcon,
  FileSpreadsheet,
  AlertTriangle,
  Stethoscope,
  ChevronDown,
  CheckCircle2,
  PhoneCall,
} from 'lucide-react';

interface HeaderBarProps {
  currentMember: FamilyMember | null;
  onSelectMember: (member: FamilyMember | null) => void;
  activePhase: CarePhase;
  onChangePhase: (phase: CarePhase) => void;
  activeView: 'weekly' | 'monthly' | 'analytics';
  onChangeView: (view: 'weekly' | 'monthly' | 'analytics') => void;
  onOpenGuide: () => void;
  onOpenEmergencyContacts: () => void;
  understaffedTotal: number;
  patientInfo?: PatientInfo;
  members?: FamilyMember[];
}

export default function HeaderBar({
  currentMember,
  onSelectMember,
  activePhase,
  onChangePhase,
  activeView,
  onChangeView,
  onOpenGuide,
  onOpenEmergencyContacts,
  understaffedTotal,
  patientInfo,
  members,
}: HeaderBarProps) {
  const patient = patientInfo || PATIENT_INFO;
  const familyList = members && members.length > 0 ? members : FAMILY_MEMBERS;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-3 sm:px-6 shadow-xs">
      <div className="max-w-5xl mx-auto space-y-3">
        {/* Hàng 1: Tiêu đề bệnh nhân & Nút tài liệu Google Sheets + Số khẩn cấp */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600 shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 truncate tracking-tight">
                  {patient.name}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                  Tai biến nặng
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate">
                {patient.hospital} • {patient.room}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Nút Danh bạ số khẩn cấp */}
            <button
              type="button"
              onClick={onOpenEmergencyContacts}
              id="btn-open-emergency-contacts"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold border border-rose-700 transition min-h-[44px] shadow-sm cursor-pointer active:scale-95 group"
              title="Mở danh bạ số điện thoại khẩn cấp (Bác sĩ, 115, Hàng xóm, Hộ lý)"
            >
              <PhoneCall className="w-4 h-4 text-white group-hover:animate-bounce shrink-0" />
              <span className="hidden sm:inline">Số Khẩn Cấp</span>
              <span className="sm:hidden">SOS</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            </button>

            {/* Nút xem cấu trúc Google Sheets */}
            <button
              type="button"
              onClick={onOpenGuide}
              id="btn-open-sheets-guide"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-950 text-xs sm:text-sm font-bold border border-slate-200 transition min-h-[44px] shadow-xs cursor-pointer active:scale-95"
              title="Xem cấu trúc Google Sheets và hướng dẫn Vercel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Google Sheets</span>
              <span className="sm:hidden">Sheets</span>
            </button>
          </div>
        </div>

        {/* Hàng 2: Selector "Ai đang thao tác?" & Chuyển Giai đoạn (ICU / Phục hồi) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Dropdown Ai đang thao tác? */}
          <div className="relative">
            <label htmlFor="member-select" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Ai đang thao tác? (Chọn để nhận ca)
              </span>
              {currentMember && (
                <span className="text-emerald-700 font-bold normal-case flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã chọn
                </span>
              )}
            </label>
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
                className="w-full min-h-[48px] px-3.5 py-2.5 pr-9 rounded-xl bg-slate-50 text-slate-900 font-bold border-2 border-slate-200 focus:bg-white focus:border-indigo-600 focus:outline-none transition appearance-none text-sm cursor-pointer shadow-xs"
              >
                <option value="" className="bg-white text-slate-500">
                  -- Chạm để chọn thành viên ({familyList.length} người) --
                </option>
                {familyList.map((member) => (
                  <option key={member.id} value={member.id} className="bg-white text-slate-900 py-1 font-semibold">
                    {member.name} ({member.relation})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Selector Giai đoạn chăm sóc */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
              <span>Giai đoạn chăm sóc:</span>
              <span className="text-xs text-amber-700 font-bold">
                {activePhase === 'phase1' ? 'ICU (3 ca/ngày)' : 'Phục hồi (2 ca 12h/ngày)'}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl">
              <button
                type="button"
                id="btn-select-phase-1"
                onClick={() => onChangePhase('phase1')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer ${
                  activePhase === 'phase1'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>GĐ 1: Viện (ICU)</span>
              </button>

              <button
                type="button"
                id="btn-select-phase-2"
                onClick={() => onChangePhase('phase2')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer ${
                  activePhase === 'phase2'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>GĐ 2: Tại Nhà</span>
              </button>
            </div>
          </div>
        </div>

        {/* Hàng 3: Chuyển Tab (Tuần / Tháng / Thống kê) & Chỉ số cảnh báo */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => onChangeView('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition min-h-[40px] cursor-pointer ${
                activeView === 'weekly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Theo Tuần</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeView('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition min-h-[40px] cursor-pointer ${
                activeView === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
              <span>Theo Tháng</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeView('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition min-h-[40px] cursor-pointer ${
                activeView === 'analytics'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <ChartIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Thống kê</span>
            </button>
          </div>

          {/* Cảnh báo ca thiếu người */}
          {understaffedTotal > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold shadow-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Tuần này còn thiếu {understaffedTotal} ca!</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Đã đủ người trực cả tuần</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
