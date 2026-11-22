'use client';

import React from 'react';
import { TrendingUp, Plus, FileSpreadsheet } from 'lucide-react';

export function BioChartEmptyState({
  totalHistoryCount,
  onOpenAddLab,
  onOpenImport,
}: {
  totalHistoryCount: number;
  onOpenAddLab?: () => void;
  onOpenImport?: () => void;
}) {
  return (
    <div className="pt-3 border-t border-slate-100">
      <div className="rounded-2xl border border-dashed border-teal-200 bg-teal-50/40 p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-medical-primary" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-black text-text-main">
              Biểu Đồ Xu Hướng Hóa Sinh Chưa Có Dữ Liệu Để Vẽ
            </h4>
            <p className="text-sm sm:text-base text-text-body leading-relaxed">
              {totalHistoryCount > 0
                ? `Hiện có ${totalHistoryCount} đợt khám trong lịch sử nhưng toàn bộ chỉ gồm chỉ số Tuyến Giáp (TSH, FT4, TG). Biểu đồ xu hướng Hóa Sinh & Mỡ Máu sẽ tự động vẽ ngay khi bạn nhập kết quả đợt khám có Đường huyết, Mỡ máu, Canxi hoặc Gan thận.`
                : 'Chưa có kết quả xét nghiệm hóa sinh nào được ghi nhận.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {onOpenAddLab && (
            <button
              type="button"
              onClick={onOpenAddLab}
              className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-medical-primary hover:bg-medical-dark text-white text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nhập phiếu xét nghiệm Hóa sinh (Gói 2: Tổng Quát)</span>
            </button>
          )}
          {onOpenImport && (
            <button
              type="button"
              onClick={onOpenImport}
              className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-surface-card hover:bg-slate-100 text-text-main border border-border-card text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Dán dữ liệu từ Sheet &quot;BiochemistryData&quot; cũ</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
