'use client';

import React, { useRef, useState } from 'react';
import { DaySchedule } from './WeeklyView';
import { CarePhase, FamilyMember, PatientInfo } from '@/lib/types';
import { PATIENT_INFO, FAMILY_MEMBERS } from '@/lib/config';
import {
  X,
  Download,
  Copy,
  Check,
  Share2,
  FileText,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import jsPDF from 'jspdf';
import ExportWeekScheduleCard from './legacy-shifts/ExportWeekScheduleCard';

interface ExportWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  days: DaySchedule[];
  activePhase: CarePhase;
  patientInfo?: PatientInfo;
  members?: FamilyMember[];
}

export default function ExportWeekModal({
  isOpen,
  onClose,
  days,
  activePhase,
  patientInfo,
  members,
}: ExportWeekModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || days.length === 0) return null;

  const patient = patientInfo || PATIENT_INFO;
  const familyList = members && members.length > 0 ? members : FAMILY_MEMBERS;

  const startDay = days[0];
  const endDay = days[days.length - 1];
  const dateRangeStr = `${startDay?.displayDate} - ${endDay?.displayDate}`;
  const totalUnderstaffed = days.reduce((sum, d) => sum + d.understaffedCount, 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(cardRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const fileName = `Lich-truc-tuan-${startDay.dateStr}-den-${endDay.dateStr}.png`;
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();

      showToast('Đã tải ảnh thành công! Bạn có thể gửi ảnh này vào nhóm Zalo.');
    } catch (err) {
      console.error('Lỗi khi xuất ảnh:', err);
      showToast('Có lỗi khi tạo ảnh. Vui lòng thử lại!');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      if (!blob) {
        throw new Error('Không thể tạo blob ảnh');
      }

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopyStatus('copied');
        showToast('Đã sao chép ảnh! Bạn hãy mở Zalo và bấm Dán (Ctrl+V) vào ô chat.');
        setTimeout(() => setCopyStatus('idle'), 3500);
      } else {
        await handleDownloadImage();
      }
    } catch (err) {
      console.error('Lỗi khi copy ảnh:', err);
      setCopyStatus('error');
      void handleDownloadImage();
      setTimeout(() => setCopyStatus('idle'), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareMobile = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      const blob = await toBlob(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      if (!blob) throw new Error('Không thể tạo ảnh');

      const file = new File(
        [blob],
        `Lich-truc-tuan-${startDay.dateStr}.png`,
        { type: 'image/png' }
      );

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Lịch trực tuần ${dateRangeStr} - ${patient.name}`,
          text: `Gửi cả nhà lịch trực chăm sóc bệnh nhân ${patient.name} tuần ${dateRangeStr}. Cả nhà kiểm tra ca của mình nhé!`,
        });
        showToast('Đã mở hộp thoại chia sẻ!');
      } else {
        await handleCopyImage();
      }
    } catch (err) {
      console.error('Lỗi khi share:', err);
      showToast('Thiết bị chưa hỗ trợ chia sẻ trực tiếp, đã chuyển sang tải ảnh.');
      void handleDownloadImage();
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(cardRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Lich-truc-tuan-${startDay.dateStr}-den-${endDay.dateStr}.pdf`);

      showToast('Đã tạo và tải file PDF thành công!');
    } catch (err) {
      console.error('Lỗi khi xuất PDF:', err);
      showToast('Có lỗi khi tạo PDF. Vui lòng thử lại!');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      id="export-week-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
    >
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 px-4 py-2.5 rounded-2xl bg-slate-900 border-2 border-emerald-500 shadow-2xl text-white text-xs sm:text-sm font-bold flex items-center gap-2 animate-bounce">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Xuất Lịch Trực &amp; Chia Sẻ Zalo
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Hình ảnh sắc nét, định dạng chuẩn tối ưu cho nhóm chat gia đình
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ xuất lịch"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-xs sm:text-sm text-indigo-900 font-bold flex items-center gap-1.5">
            <span>Tuần: {dateRangeStr}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline font-medium text-indigo-800">
              {totalUnderstaffed > 0 ? `Thiếu ${totalUnderstaffed} ca` : 'Đã đủ người trực'}
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              id="btn-copy-schedule-image"
              onClick={() => void handleCopyImage()}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50 min-h-[48px]"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : copyStatus === 'copied' ? (
                <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copyStatus === 'copied' ? 'Đã chép ảnh!' : 'Sao chép ảnh (Dán Zalo)'}</span>
            </button>

            <button
              type="button"
              id="btn-download-schedule-image"
              onClick={() => void handleDownloadImage()}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Tải ảnh PNG</span>
            </button>

            <button
              type="button"
              id="btn-share-mobile"
              onClick={() => void handleShareMobile()}
              disabled={isExporting}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gửi qua Zalo</span>
              <span className="sm:hidden">Gửi</span>
            </button>

            <button
              type="button"
              id="btn-export-pdf"
              onClick={() => void handleExportPDF()}
              disabled={isExporting}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>

            <a
              href="https://chat.zalo.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition flex items-center gap-1 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mở Zalo</span>
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 flex justify-center">
          <ExportWeekScheduleCard
            cardRef={cardRef}
            days={days}
            activePhase={activePhase}
            patient={patient}
            familyList={familyList}
            dateRangeStr={dateRangeStr}
            totalUnderstaffed={totalUnderstaffed}
          />
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium">
            💡 Mẹo: Bấm <strong className="text-slate-800">Sao chép ảnh</strong> rồi mở Zalo bấm <strong className="text-slate-800">Ctrl + V</strong> là gửi được ngay.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold transition cursor-pointer min-h-[48px] min-w-[48px]"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => void handleCopyImage()}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50 min-h-[48px]"
            >
              <Copy className="w-4 h-4" />
              <span>{copyStatus === 'copied' ? 'Đã sao chép!' : 'Sao chép ảnh Zalo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
