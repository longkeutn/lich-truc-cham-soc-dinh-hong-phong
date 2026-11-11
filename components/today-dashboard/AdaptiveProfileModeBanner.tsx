'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  Baby,
  Calculator,
  CheckCircle2,
  Clock,
  FileText,
  Pill,
  Ruler,
  ShieldAlert,
  Syringe,
} from 'lucide-react';
import type {
  CareRoutine,
  DailyLog,
  HealthProfile,
  LabResultEntry,
} from '@/lib/types';
import { getVietnamDateStr, getVietnamTimeStr } from '@/lib/config';
import {
  calculatePediatricParacetamolDose,
  isSeniorFriendlyProfile,
} from '@/lib/adaptiveProfileConfig';
import { SeniorTextToggle } from '@/components/ui-kit';

export interface AdaptiveProfileModeBannerProps {
  activeProfile: HealthProfile;
  activeRoutines: CareRoutine[];
  dailyLogs: DailyLog[];
  labResults: LabResultEntry[];
  todayStr: string;
  recorderName: string;
  onToggleDailyLog: (log: DailyLog) => Promise<void>;
  onOpenDoctorReport: () => void;
  onJumpToGrowth: () => void;
  onJumpToVaccine: () => void;
}

export function AdaptiveProfileModeBanner({
  activeProfile,
  activeRoutines,
  dailyLogs,
  labResults,
  todayStr,
  recorderName,
  onToggleDailyLog,
  onOpenDoctorReport,
  onJumpToGrowth,
  onJumpToVaccine,
}: AdaptiveProfileModeBannerProps) {
  const effectiveToday = todayStr || getVietnamDateStr();
  const profileType = activeProfile.profileType;
  const isSenior = isSeniorFriendlyProfile(activeProfile);
  const displayName = activeProfile.relation || activeProfile.name;

  // Tìm cân nặng gần nhất của bé (nếu là hồ sơ Nhi khoa)
  const latestChildWeight = useMemo(() => {
    const growth = labResults
      .filter((r) => r.recordKind === 'pediatric_growth' && r.pediatricGrowth?.weightKg)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
    return growth?.pediatricGrowth?.weightKg;
  }, [labResults]);

  const [weightInput, setWeightInput] = useState<string>('');
  const resolvedWeight =
    weightInput !== ''
      ? parseFloat(weightInput.replace(',', '.'))
      : latestChildWeight ?? 12;
  const paracetamolGuide = useMemo(
    () => calculatePediatricParacetamolDose(resolvedWeight),
    [resolvedWeight]
  );

  // Tìm thuốc Hormone Tuyến Giáp buổi sáng lúc bụng đói (nếu là thyroid_post_op)
  const thyroidMorningRoutine = useMemo(() => {
    if (profileType !== 'thyroid_post_op') return null;
    return (
      activeRoutines.find(
        (r) =>
          r.category === 'meds' &&
          r.timeSlots.includes('morning') &&
          (r.title.toLowerCase().includes('levothyrox') ||
            r.title.toLowerCase().includes('euthyrox') ||
            r.title.toLowerCase().includes('berlthyrox') ||
            r.title.toLowerCase().includes('tuyến giáp') ||
            r.title.toLowerCase().includes('hormone'))
      ) || null
    );
  }, [activeRoutines, profileType]);

  const thyroidMorningLog = useMemo(() => {
    if (!thyroidMorningRoutine) return null;
    return (
      dailyLogs.find(
        (l) =>
          l.date === effectiveToday &&
          l.routineId === thyroidMorningRoutine.id &&
          l.timeSlot === 'morning'
      ) || null
    );
  }, [dailyLogs, effectiveToday, thyroidMorningRoutine]);

  const handleQuickCompleteThyroidMed = async () => {
    if (!thyroidMorningRoutine) return;
    await onToggleDailyLog({
      id: `dl-${effectiveToday}-${thyroidMorningRoutine.id}-morning`,
      date: effectiveToday,
      routineId: thyroidMorningRoutine.id,
      timeSlot: 'morning',
      isDone: true,
      doneAt: getVietnamTimeStr(),
      doneBy: recorderName,
    });
  };

  // 1. CHẾ ĐỘ HẬU PHẪU TUYẾN GIÁP & NGƯỜI CAO TUỔI (Mẹ Đoàn Thị Bạch Yến)
  if (profileType === 'thyroid_post_op') {
    const isDone = Boolean(thyroidMorningLog?.isDone);
    return (
      <section
        aria-label="Chế độ chăm sóc hậu phẫu tuyến giáp và người cao tuổi"
        className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-white to-teal-50/70 p-4 sm:p-5 shadow-2xs space-y-3.5"
      >
        <div className="flex items-start justify-between gap-2.5 flex-wrap">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-950 text-xs font-extrabold">
              <Pill className="w-3.5 h-3.5 text-indigo-700" />
              <span>Chế độ Hậu phẫu Tuyến giáp · Giao diện Chữ To</span>
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Ưu Tiên Sáng Sớm Của {displayName}: Hormone Tuyến Giáp Lúc Bụng Đói
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <SeniorTextToggle compact />
            <button
              type="button"
              onClick={onOpenDoctorReport}
              className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-950 border border-indigo-300 text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-indigo-700 shrink-0" />
              <span>Phiếu Trình BS</span>
            </button>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDone
              ? 'bg-emerald-50/90 border-emerald-300'
              : 'bg-amber-50/95 border-amber-300'
          }`}
        >
          <div className="space-y-1">
            <div className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              {isDone ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                  <span>
                    Đã uống {thyroidMorningRoutine?.title || 'Levothyroxine'} lúc{' '}
                    {thyroidMorningLog?.doneAt || 'sáng nay'}
                  </span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>
                    Nhắc uống {thyroidMorningRoutine?.title || 'Levothyroxine (Euthyrox / Berlthyrox)'}{' '}
                    {thyroidMorningRoutine?.dosage ? `· ${thyroidMorningRoutine.dosage}` : ''}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">
              • Uống ngay khi thức dậy với nước lọc, <strong>trước bữa sáng 30 - 60 phút</strong>.
              <br />• Cách xa <strong>Canxi, Sắt, thuốc dạ dày và sữa đậu nành ít nhất 4 giờ</strong> để hấp thu tối đa.
            </p>
          </div>

          {thyroidMorningRoutine && !isDone && (
            <button
              type="button"
              onClick={() => void handleQuickCompleteThyroidMed()}
              className="min-h-[56px] min-w-[48px] px-5 py-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-sm sm:text-base font-black inline-flex items-center justify-center gap-2 shadow-xs transition cursor-pointer shrink-0"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Xác nhận Đã Uống Lúc Đói</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  // 2. CHẾ ĐỘ HẬU ĐỘT QUỴ & THEO DÕI GHÉP SỌ (Bố Đinh Hồng Phong - GAS #1)
  if (profileType === 'post_stroke_cranioplasty') {
    return (
      <section
        aria-label="Chế độ theo dõi phục hồi sau đột quỵ và vùng khuyết sọ"
        className="rounded-2xl border border-teal-300 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-4 sm:p-5 shadow-xs space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Theo dõi Hậu Đột Quỵ &amp; Chuẩn Bị Ghép Sọ</span>
            </span>
            <h2 className="text-base sm:text-lg font-black leading-snug">
              Kiểm Soát 4 Sinh Hiệu (HA · Mạch · SpO2 · Nhiệt Độ) &amp; Vạt Da Khuyết Sọ Của {displayName}
            </h2>
            <p className="text-xs sm:text-sm text-teal-100 font-medium">
              Chú ý đi bên trái hỗ trợ tầm nhìn bán manh và theo dõi sát dấu hiệu căng phồng / lõm sâu vùng sọ
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={onOpenDoctorReport}
              className="min-h-[52px] min-w-[48px] px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs sm:text-sm font-black inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>📄 Báo Cáo Lâm Sàng A4</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  // 3. CHẾ ĐỘ NHI KHOA: TĂNG TRƯỞNG WHO, SỔ TIÊM CHỦNG & TÍNH LIỀU HẠ SỐT PARACETAMOL
  if (profileType === 'pediatric') {
    return (
      <section
        aria-label="Chế độ chăm sóc Nhi khoa, tăng trưởng WHO và tính liều hạ sốt"
        className="rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50/90 via-white to-teal-50/70 p-4 sm:p-5 shadow-2xs space-y-3.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-100 border border-cyan-300 text-cyan-950 text-xs font-extrabold">
              <Baby className="w-3.5 h-3.5 text-cyan-800" />
              <span>Sổ Sức Khỏe Nhi Khoa · Chuẩn Tăng Trưởng WHO</span>
            </span>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Theo Dõi Tăng Trưởng, Lịch Tiêm Chủng &amp; Hạ Sốt An Toàn Cho {displayName}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onJumpToGrowth}
              className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Ruler className="w-4 h-4 shrink-0" />
              <span>Biểu Đồ WHO</span>
            </button>
            <button
              type="button"
              onClick={onJumpToVaccine}
              className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-cyan-50 text-teal-900 border border-teal-300 text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Syringe className="w-4 h-4 text-teal-700 shrink-0" />
              <span>Sổ Tiêm Chủng</span>
            </button>
          </div>
        </div>

        {/* Công cụ tính nhanh liều hạ sốt Paracetamol 10-15 mg/kg */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs sm:text-sm font-black text-amber-950 inline-flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Tính nhanh liều hạ sốt Paracetamol (khi sốt &ge; 38.5°C):</span>
            </span>
            <label className="inline-flex items-center gap-1.5 bg-white border border-amber-300 rounded-xl px-3 min-h-[48px]">
              <span className="text-xs font-bold text-slate-600">Cân nặng:</span>
              <input
                type="number"
                step="0.5"
                min={3}
                max={75}
                value={weightInput !== '' ? weightInput : String(resolvedWeight)}
                onChange={(e) => setWeightInput(e.target.value)}
                aria-label="Nhập cân nặng của bé tính theo kg"
                className="w-16 text-base font-black text-center text-slate-900 focus:outline-none"
              />
              <span className="text-xs font-extrabold text-slate-700">kg</span>
            </label>
          </div>

          {paracetamolGuide && (
            <div className="text-xs sm:text-sm font-bold text-slate-800 space-y-0.5">
              <div>
                Liều 1 lần (10-15 mg/kg):{' '}
                <strong className="text-rose-700 font-black">
                  {paracetamolGuide.minMg} - {paracetamolGuide.maxMg} mg
                </strong>{' '}
                · Gợi ý: <strong className="text-teal-900">{paracetamolGuide.suggestedPack}</strong>
              </div>
              <div className="text-xs text-slate-600">
                Cách nhau mỗi 4 - 6 giờ, tối đa không quá 5 lần/24h ({paracetamolGuide.maxDailyMg} mg/ngày).
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // 4. CHẾ ĐỘ TIM MẠCH / NGƯỜI CAO TUỔI TỔNG QUÁT (VD: Bố Nguyễn Thành Đô trên GAS #2)
  if (!isSenior) return null;

  return (
    <section
      aria-label="Chế độ người cao tuổi theo dõi huyết áp và tim mạch"
      className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/90 via-white to-emerald-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
    >
      <div className="space-y-0.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-900">
          <Activity className="w-4 h-4 text-teal-700" />
          <span>Chế độ Người Cao Tuổi · Tim Mạch &amp; Huyết Áp ({displayName})</span>
        </span>
        <p className="text-xs sm:text-sm font-semibold text-slate-700">
          Nghỉ tĩnh 5 - 10 phút sau vận động thể thao trước khi đo huyết áp. Hỗ trợ đọc giọng nói Tiếng Việt khi lưu số đo.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <SeniorTextToggle compact />
        <button
          type="button"
          onClick={onOpenDoctorReport}
          className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-white hover:bg-teal-50 text-teal-950 border border-teal-300 text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <FileText className="w-4 h-4 text-teal-700 shrink-0" />
          <span>Phiếu Trình BS</span>
        </button>
      </div>
    </section>
  );
}

export default AdaptiveProfileModeBanner;
