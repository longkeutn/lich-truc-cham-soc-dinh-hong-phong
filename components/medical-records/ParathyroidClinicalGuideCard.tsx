'use client';

import React, { useState, useMemo } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import type { HealthProfileType, LabResultEntry } from '@/lib/types';
import { analyzeParathyroidClinicalPattern } from '@/lib/parathyroidEval';

const PARATHYROID_GUIDE_ITEMS = [
  {
    name: 'PTH (Cận giáp)',
    ref: '15 - 65 pg/mL',
    meaning:
      'Đo sức tiết hormone giữ Canxi của 4 tuyến cận giáp. Sau cắt toàn bộ tuyến giáp, PTH < 15 (đặc biệt < 10) gợi ý suy cận giáp.',
  },
  {
    name: 'Canxi TP & Albumin',
    ref: 'Ca: 2.15 - 2.55 mmol/L | Alb: 35 - 50 g/L',
    meaning:
      'Albumin thấp làm Canxi toàn phần bị tụt giả. Hệ thống tự tính Canxi hiệu chỉnh = Ca + 0.02 × (40 - Albumin g/L). Khi có tê bì tay chân, ưu tiên đo Canxi ion hóa Ca++ (1.10 - 1.35 mmol/L).',
  },
  {
    name: 'Phospho máu',
    ref: '0.81 - 1.45 mmol/L (2.5 - 4.5 mg/dL)',
    meaning:
      'Suy cận giáp thường làm Canxi hạ nhưng Phospho tăng. Giữ tích số Canxi × Phospho < 55 mg²/dL² để phòng lắng đọng vôi hóa mô mềm và sỏi thận.',
  },
  {
    name: '25-OH Vitamin D',
    ref: '30 - 60 ng/mL (Tối đa < 100)',
    meaning:
      'Cần đạt ≥ 30 ng/mL để ruột hấp thu Canxi. Lưu ý: người suy cận giáp thật sự thường cần Calcitriol do Bác sĩ kê vì Vitamin D3 thường không tự hoạt hóa đủ ở thận.',
  },
];

export function ParathyroidClinicalGuideCard({
  latestLab,
  profileType,
}: {
  latestLab: LabResultEntry | null;
  profileType: HealthProfileType;
}) {
  const [showGuide, setShowGuide] = useState(false);

  const synthesis = useMemo(
    () => analyzeParathyroidClinicalPattern(latestLab, profileType),
    [latestLab, profileType]
  );

  if (!synthesis && profileType !== 'thyroid_post_op') {
    return null;
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-3.5 sm:p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-indigo-950 uppercase">
              <ShieldCheck className="w-4 h-4 text-thyroid-accent shrink-0" />
              Đánh Giá Lâm Sàng Trục Cận Giáp - Canxi - Phospho - Albumin
            </span>
            {synthesis && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${synthesis.badgeClass}`}
              >
                {synthesis.badgeText}
              </span>
            )}
          </div>
          {synthesis ? (
            <h4 className="text-base font-black text-text-main">{synthesis.patternTitle}</h4>
          ) : (
            <h4 className="text-base font-black text-text-main">
              Bộ Tiêu Chuẩn Theo Dõi Canxi - Cận Giáp Sau Cắt Tuyến Giáp
            </h4>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          aria-expanded={showGuide}
          className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-surface-card hover:bg-indigo-50 text-indigo-950 border border-indigo-200 text-sm font-extrabold inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer shrink-0"
        >
          <BookOpen className="w-4 h-4 text-thyroid-accent shrink-0" />
          <span>{showGuide ? 'Ẩn hướng dẫn đọc chỉ số' : 'Xem hướng dẫn lâm sàng'}</span>
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {synthesis && (
        <div className="space-y-2">
          {(synthesis.correctedCalcium || synthesis.caPProduct) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {synthesis.correctedCalcium && (
                <div className="rounded-xl border border-indigo-200/80 bg-surface-card p-3">
                  <div className="text-xs font-bold text-text-muted">
                    Canxi hiệu chỉnh theo Albumin ({synthesis.correctedCalcium.albuminGL} g/L)
                  </div>
                  <div className="text-lg font-black text-text-main mt-0.5">
                    {synthesis.correctedCalcium.mmolL} mmol/L{' '}
                    <span className="text-sm font-bold text-text-muted">
                      ({synthesis.correctedCalcium.mgDl} mg/dL)
                    </span>
                  </div>
                  <div className="text-xs text-text-body mt-0.5">
                    Canxi đo thô: {synthesis.correctedCalcium.rawCalciumMmol} mmol/L · Chuẩn: 2.15 - 2.55 mmol/L
                  </div>
                </div>
              )}

              {synthesis.caPProduct && (
                <div
                  className={`rounded-xl border p-3 ${
                    synthesis.caPProduct.isElevated
                      ? 'border-rose-300 bg-rose-50/70'
                      : 'border-indigo-200/80 bg-surface-card'
                  }`}
                >
                  <div className="text-xs font-bold text-text-muted">
                    Tích số Canxi × Phospho (Tầm soát lắng đọng sỏi/vôi hóa)
                  </div>
                  <div className="text-lg font-black text-text-main mt-0.5">
                    {synthesis.caPProduct.productMg2Dl2} mg²/dL²{' '}
                    <span className="text-xs font-extrabold">
                      {synthesis.caPProduct.isElevated ? '🔴 Vượt ≥ 55' : '🟢 An toàn (< 55)'}
                    </span>
                  </div>
                  <div className="text-xs text-text-body mt-0.5">
                    Ca ({synthesis.caPProduct.caMgDl} mg/dL) × P ({synthesis.caPProduct.pMgDl} mg/dL)
                  </div>
                </div>
              )}
            </div>
          )}

          <ul className="space-y-1 text-sm sm:text-base text-text-body list-disc list-inside leading-relaxed">
            {synthesis.findings.map((f, idx) => (
              <li key={idx}>{f}</li>
            ))}
          </ul>

          {synthesis.actionTips.length > 0 && (
            <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-3 space-y-1 text-sm text-amber-950 leading-relaxed">
              <div className="font-black">💡 Lưu ý chăm sóc &amp; phối hợp thuốc:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {synthesis.actionTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {showGuide && (
        <div className="pt-2 border-t border-indigo-200/80 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PARATHYROID_GUIDE_ITEMS.map((item) => (
              <div
                key={item.name}
                className="rounded-xl border border-border-card bg-surface-card p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-black text-indigo-950">{item.name}</span>
                  <span className="text-xs font-bold text-medical-dark bg-teal-50 px-2 py-0.5 rounded-md">
                    {item.ref}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-body leading-relaxed">{item.meaning}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs sm:text-sm text-teal-950 space-y-1 leading-relaxed">
            <div className="font-black">📋 Lịch tầm soát định kỳ cho bệnh nhân K giáp sau cắt hết tuyến giáp:</div>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                <strong>Canxi niệu 24 giờ &amp; Siêu âm thận (6 - 12 tháng/lần):</strong> Bắt buộc nếu đang uống Canxi + Calcitriol hàng ngày để phát hiện sớm tăng thải Canxi qua nước tiểu và sỏi thận.
              </li>
              <li>
                <strong>Đo mật độ xương DEXA (1 - 2 năm/lần):</strong> Cần thiết nếu phải giữ TSH ức chế thấp (&lt; 0.5 µIU/mL) nhiều năm liên tiếp.
              </li>
              <li>
                <strong>Chống tương tác thuốc:</strong> Uống Levothyroxine sáng sớm lúc đói; uống Canxi/Sắt/Magie cách thuốc giáp ít nhất 4 tiếng. Ngưng Biotin 3 - 5 ngày trước khi lấy máu xét nghiệm TSH/FT4.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default ParathyroidClinicalGuideCard;
