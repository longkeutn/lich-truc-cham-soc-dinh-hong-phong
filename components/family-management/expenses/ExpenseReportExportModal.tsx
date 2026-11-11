'use client';

import React, { useMemo, useRef, useState } from 'react';
import type { ExpenseCategory, ExpenseEntry, ExpenseStage } from '@/lib/types';
import { getVietnamDateStr } from '@/lib/config';
import { Check, Copy, Download, FileText, ShieldCheck, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  buildZaloReportText,
  CATEGORY_CONFIG,
  computeReportData,
  formatDateVN,
  formatVND,
  STAGE_CONFIG,
} from './expenseTrackerUtils';

interface ExpenseReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseEntry[];
  patientName: string;
  showToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
}

export default function ExpenseReportExportModal({
  isOpen,
  onClose,
  expenses,
  patientName,
  showToast,
}: ExpenseReportExportModalProps) {
  const [reportIncludeSummary, setReportIncludeSummary] = useState(true);
  const [reportIncludeStageAndCat, setReportIncludeStageAndCat] = useState(true);
  const [reportIncludeContributors, setReportIncludeContributors] = useState(true);
  const [reportIncludeDetails, setReportIncludeDetails] = useState(false);
  const [reportStageFilter, setReportStageFilter] = useState<'all' | ExpenseStage>('all');
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const reportCardRef = useRef<HTMLDivElement | null>(null);

  const reportData = useMemo(
    () => computeReportData(expenses, reportStageFilter),
    [expenses, reportStageFilter]
  );

  if (!isOpen) return null;

  const handleCopyZaloReport = async () => {
    try {
      const text = buildZaloReportText({
        patientName,
        reportStageFilter,
        reportData,
        reportIncludeSummary,
        reportIncludeStageAndCat,
        reportIncludeContributors,
        reportIncludeDetails,
      });
      await navigator.clipboard.writeText(text);
      setCopiedZalo(true);
      showToast('Đã copy nội dung báo cáo! Bạn có thể dán ngay vào Zalo gia đình.', 'success');
      setTimeout(() => setCopiedZalo(false), 3000);
    } catch {
      showToast('Không thể copy tự động, vui lòng thử lại.', 'warn');
    }
  };

  const handleExportReportImage = async () => {
    if (!reportCardRef.current) return;
    setIsExportingImage(true);
    try {
      const dataUrl = await toPng(reportCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `Tong-hop-thu-chi-dieu-tri-${getVietnamDateStr()}.png`;
      link.href = dataUrl;
      link.click();
      showToast('Đã tải xuống Ảnh Báo Cáo Thu Chi!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể xuất ảnh báo cáo lúc này.', 'warn');
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleExportReportPdf = async () => {
    if (!reportCardRef.current) return;
    setIsExportingPdf(true);
    try {
      const dataUrl = await toPng(reportCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 16;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 8, 8, pdfWidth, Math.min(pdfHeight, 280));
      pdf.save(`Bao-cao-thu-chi-dieu-tri-${getVietnamDateStr()}.pdf`);
      showToast('Đã tải xuống file PDF Báo Cáo Thu Chi!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể xuất PDF lúc này.', 'warn');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Tổng Hợp &amp; Xuất Báo Cáo Thu Chi
            </h3>
            <p className="text-xs text-slate-600">
              Tùy chọn các mục muốn hiển thị trước khi gửi cho gia đình
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-700 uppercase">
              Phạm vi giai đoạn:
            </span>
            <select
              value={reportStageFilter}
              onChange={(e) => setReportStageFilter(e.target.value as 'all' | ExpenseStage)}
              className="min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800"
            >
              <option value="all">Toàn bộ quá trình (Từ ngày đầu cấp cứu)</option>
              <option value="emergency">🚑 Chỉ riêng Giai đoạn Cấp cứu &amp; Nằm viện</option>
              <option value="rehab_hospital">🏥 Chỉ riêng Giai đoạn Tái khám &amp; Phục hồi</option>
              <option value="home_care">🏠 Chỉ riêng Giai đoạn Chăm sóc tại nhà</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 text-xs">
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={reportIncludeSummary}
                onChange={(e) => setReportIncludeSummary(e.target.checked)}
                className="rounded text-teal-700"
              />
              <span>1. Hiện Tổng cân đối Thu - Chi - Tồn</span>
            </label>
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={reportIncludeStageAndCat}
                onChange={(e) => setReportIncludeStageAndCat(e.target.checked)}
                className="rounded text-teal-700"
              />
              <span>2. Hiện Tổng hợp theo Giai đoạn &amp; Nhóm</span>
            </label>
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={reportIncludeContributors}
                onChange={(e) => setReportIncludeContributors(e.target.checked)}
                className="rounded text-teal-700"
              />
              <span>3. Hiện Ghi nhận đóng góp &amp; Nguồn thu</span>
            </label>
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={reportIncludeDetails}
                onChange={(e) => setReportIncludeDetails(e.target.checked)}
                className="rounded text-teal-700"
              />
              <span>4. Kèm bảng kê chi tiết từng khoản</span>
            </label>
          </div>
        </div>

        <div
          ref={reportCardRef}
          className="bg-white rounded-2xl border-2 border-slate-200 p-5 space-y-4 text-slate-900"
        >
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Sổ Sức Khỏe &amp; Theo Dõi Điều Trị
              </div>
              <h4 className="text-base sm:text-lg font-extrabold text-slate-900">
                Báo Cáo Tổng Hợp Thu Chi - Bệnh nhân: {patientName}
              </h4>
              <p className="text-xs text-slate-600">
                Ngày tổng hợp: {formatDateVN(getVietnamDateStr())} ·{' '}
                {reportStageFilter === 'all'
                  ? 'Toàn bộ quá trình điều trị'
                  : STAGE_CONFIG[reportStageFilter].label}
              </p>
            </div>
            <ShieldCheck className="w-8 h-8 text-teal-700 shrink-0" />
          </div>

          {reportIncludeSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[11px] font-bold text-emerald-800 uppercase">
                  1. Tổng Thu Vào Quỹ
                </div>
                <div className="text-sm sm:text-base font-extrabold text-emerald-700 mt-0.5">
                  +{formatVND(reportData.rIn)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <div className="text-[11px] font-bold text-rose-800 uppercase">
                  2. Tổng Chi Điều Trị
                </div>
                <div className="text-sm sm:text-base font-extrabold text-rose-700 mt-0.5">
                  -{formatVND(reportData.rOut)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <div className="text-[11px] font-bold text-slate-700 uppercase">
                  3. Số Dư Quỹ Hiện Tại
                </div>
                <div
                  className={
                    'text-sm sm:text-base font-extrabold mt-0.5 ' +
                    (reportData.rNetOverallBalance >= 0 ? 'text-teal-700' : 'text-amber-800')
                  }
                >
                  {reportData.rNetOverallBalance >= 0
                    ? '+' + formatVND(reportData.rNetOverallBalance)
                    : '-' + formatVND(Math.abs(reportData.rNetOverallBalance))}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  {reportData.rNetOverallBalance >= 0
                    ? 'Còn trong quỹ chăm sóc Bố'
                    : 'Chi đang vượt thu (người giữ sổ tạm bù)'}
                </div>
              </div>
            </div>
          )}

          {reportIncludeStageAndCat && reportData.rOut > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-extrabold text-slate-700 uppercase">
                Phân bổ theo nhóm chi phí chính
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[])
                  .filter(
                    (c) => CATEGORY_CONFIG[c].type === 'out' && (reportData.rCat[c] || 0) > 0
                  )
                  .map((c) => (
                    <div
                      key={c}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <span className="font-semibold text-slate-700 truncate">
                        {CATEGORY_CONFIG[c].icon} {CATEGORY_CONFIG[c].label}
                      </span>
                      <span className="font-extrabold text-slate-900 ml-2">
                        {formatVND(reportData.rCat[c] || 0)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {reportIncludeContributors &&
            (reportData.rInList.length > 0 || reportData.rOutPayerList.length > 0) && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-xs font-extrabold text-slate-700 uppercase">
                  Ghi nhận đóng góp &amp; người trực tiếp đi thanh toán
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {reportData.rInList.map((c) => (
                    <div
                      key={'in-' + c.name}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50/60 border border-emerald-200"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{c.name}</div>
                        <div className="text-[11px] text-slate-600">🌱 Đóng góp vào quỹ</div>
                      </div>
                      <span className="font-extrabold text-emerald-700 ml-2 shrink-0">
                        {formatVND(c.amount)}
                      </span>
                    </div>
                  ))}
                  {reportData.rOutPayerList.map((c) => (
                    <div
                      key={'out-' + c.name}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{c.name}</div>
                        <div className="text-[11px] text-slate-600">
                          🤝 Trực tiếp thanh toán ({c.count} khoản)
                        </div>
                      </div>
                      <span className="font-extrabold text-slate-700 ml-2 shrink-0">
                        {formatVND(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {reportIncludeDetails && reportData.list.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="text-xs font-extrabold text-slate-700 uppercase">
                Bảng kê chi tiết ({reportData.list.length} khoản)
              </div>
              <div className="divide-y divide-slate-100 text-xs max-h-60 overflow-y-auto">
                {reportData.list.map((item) => (
                  <div key={item.id} className="py-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-600 mr-1.5">
                        {formatDateVN(item.date)}
                      </span>
                      <span className="font-semibold text-slate-800">{item.title}</span>
                      {item.personName && (
                        <span className="text-slate-600 ml-1">({item.personName})</span>
                      )}
                    </div>
                    <span
                      className={`font-extrabold shrink-0 ${
                        item.type === 'in' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {item.type === 'in' ? '+' : '-'}
                      {formatVND(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 text-center">
            Số liệu tổng hợp tự động từ Sổ Theo Dõi Thu Chi Điều Trị · Gia đình cùng theo dõi
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleCopyZaloReport}
            className="min-h-[48px] py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            {copiedZalo ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedZalo ? 'Đã Copy!' : 'Copy gửi Zalo'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportReportImage}
            disabled={isExportingImage}
            className="min-h-[48px] py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingImage ? 'Đang tạo ảnh...' : 'Tải Ảnh Báo Cáo'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportReportPdf}
            disabled={isExportingPdf}
            className="min-h-[48px] py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{isExportingPdf ? 'Đang tạo PDF...' : 'Xuất File PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
