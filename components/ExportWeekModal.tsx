'use client';

import React, { useRef, useState } from 'react';
import { DaySchedule } from './WeeklyView';
import { CarePhase, FamilyMember, PatientInfo } from '@/lib/types';
import { PATIENT_INFO, FAMILY_MEMBERS, PHASE_CONFIGS } from '@/lib/config';
import {
  X,
  Download,
  Copy,
  Check,
  Share2,
  FileText,
  Hospital,
  HeartPulse,
  Phone,
  Clock,
  Moon,
  Sun,
  Sunset,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import jsPDF from 'jspdf';

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
  const dateRangeStr = `${startDay?.displayDate} – ${endDay?.displayDate}`;
  const totalUnderstaffed = days.reduce((sum, d) => sum + d.understaffedCount, 0);

  // Helper tìm thông tin thành viên
  const getMemberByName = (name: string | null): FamilyMember | undefined => {
    if (!name) return undefined;
    return familyList.find((m) => m.name === name);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 1. Tải ảnh PNG về máy
  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      // Đợi 1 chút để DOM ổn định
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(cardRef.current, {
        quality: 0.98,
        pixelRatio: 2, // Độ phân giải cao 2x để rõ nét trên Zalo
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

  // 2. Sao chép ảnh vào bộ nhớ tạm (Clipboard) để dán Ctrl+V vào Zalo
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
        // Fallback: Tự động tải ảnh nếu browser không hỗ trợ clipboard item
        await handleDownloadImage();
      }
    } catch (err) {
      console.error('Lỗi khi copy ảnh:', err);
      setCopyStatus('error');
      // Thử tải về máy làm dự phòng
      handleDownloadImage();
      setTimeout(() => setCopyStatus('idle'), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Chia sẻ qua Web Share API (trên điện thoại sẽ hiện ứng dụng Zalo)
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
        // Fallback: sao chép hoặc tải ảnh
        await handleCopyImage();
      }
    } catch (err) {
      console.error('Lỗi khi share:', err);
      showToast('Thiết bị chưa hỗ trợ chia sẻ trực tiếp, đã chuyển sang tải ảnh.');
      handleDownloadImage();
    } finally {
      setIsExporting(false);
    }
  };

  // 4. Xuất file PDF
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
      {/* Toast thông báo nhanh */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 px-4 py-2.5 rounded-2xl bg-slate-900 border-2 border-emerald-500 shadow-2xl text-white text-xs sm:text-sm font-bold flex items-center gap-2 animate-bounce">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Xuất Lịch Trực & Chia Sẻ Zalo
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Hình ảnh sắc nét, định dạng chuẩn tối ưu cho nhóm chat gia đình
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar Nổi Bật Trên Cùng */}
        <div className="px-5 py-3 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-xs text-indigo-900 font-bold flex items-center gap-1.5">
            <span>Tuần: {dateRangeStr}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline font-medium text-indigo-700">
              {totalUnderstaffed > 0 ? `Thiếu ${totalUnderstaffed} ca` : 'Đã đủ người trực'}
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Nút Sao chép ảnh (Ctrl+V vào Zalo) */}
            <button
              type="button"
              id="btn-copy-schedule-image"
              onClick={handleCopyImage}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              title="Sao chép ảnh vào bộ nhớ tạm rồi dán (Ctrl+V) thẳng vào Zalo"
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

            {/* Nút Tải ảnh PNG */}
            <button
              type="button"
              id="btn-download-schedule-image"
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              title="Tải file hình ảnh PNG chất lượng cao về máy"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Tải ảnh PNG</span>
            </button>

            {/* Nút Chia sẻ di động */}
            <button
              type="button"
              id="btn-share-mobile"
              onClick={handleShareMobile}
              disabled={isExporting}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              title="Mở ứng dụng Zalo trên điện thoại để gửi ảnh"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gửi qua Zalo</span>
              <span className="sm:hidden">Gửi</span>
            </button>

            {/* Nút Xuất PDF */}
            <button
              type="button"
              id="btn-export-pdf"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
              title="Xuất file tài liệu PDF để in hoặc lưu trữ"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF</span>
            </button>

            {/* Nút Mở Zalo Web */}
            <a
              href="https://chat.zalo.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition flex items-center gap-1 shadow-xs"
              title="Mở Zalo Web (chat.zalo.me) trong tab mới để dán ảnh"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mở Zalo</span>
            </a>
          </div>
        </div>

        {/* Khung cuộn xem trước ảnh */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 flex justify-center">
          {/* CARD HÌNH ẢNH DÀNH RIÊNG ĐỂ XUẤT CHO GIA ĐÌNH */}
          <div
            ref={cardRef}
            id="export-schedule-card"
            className="w-[820px] bg-white rounded-3xl p-6 sm:p-8 border-2 border-slate-300 shadow-xl space-y-6 text-slate-900"
            style={{ width: '820px', minWidth: '820px' }} // Khóa kích thước cố định để chất lượng ảnh xuất ra chuẩn xác
          >
            {/* Header Thẻ Xuất */}
            <div className="border-b-2 border-slate-200 pb-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                    <HeartPulse className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 inline-block mb-1">
                      LỊCH TRỰC CHĂM SÓC GIA ĐÌNH
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                      Bệnh nhân: {patient.name}
                    </h1>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold uppercase text-slate-500">Giai đoạn</div>
                  <div className="text-sm font-black text-indigo-700">
                    {PHASE_CONFIGS[activePhase].name}
                  </div>
                </div>
              </div>

              {/* Thông tin phòng & Viện */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <Hospital className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold text-slate-700 truncate">
                    {patient.hospital}
                  </span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-slate-500 font-medium">Vị trí:</span>
                  <span className="font-bold text-slate-900">{patient.room}</span>
                </div>
              </div>

              {/* Thanh thời gian & Trạng thái tuần */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs">
                <div className="flex items-center gap-2 font-black text-indigo-950">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Tuần lễ: {dateRangeStr}</span>
                </div>

                <div>
                  {totalUnderstaffed > 0 ? (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold border border-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Cần gia đình hỗ trợ thêm {totalUnderstaffed} ca
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Đã phân bổ đủ người trực cả tuần
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bảng Chi Tiết 7 Ngày Trong Tuần */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <span>Chi tiết ca phân công từng ngày</span>
              </h3>

              <div className="grid grid-cols-1 gap-2.5">
                {days.map((day) => {
                  return (
                    <div
                      key={day.dateStr}
                      className={`rounded-2xl border p-3 flex items-center justify-between gap-3 ${
                        day.isToday
                          ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/30'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Cột 1: Thứ & Ngày */}
                      <div className="w-28 shrink-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-black uppercase px-2 py-0.5 rounded-lg ${
                              day.isToday
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {day.dayOfWeekVi}
                          </span>
                          {day.isToday && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          )}
                        </div>
                        <div className="text-sm font-black text-slate-900">
                          {day.displayDate}
                        </div>
                      </div>

                      {/* Cột 2: Danh sách các ca trong ngày */}
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        {day.shifts.map((shift) => {
                          const isNight = shift.type === 'night' || shift.type === 'night_12h';
                          const isAfternoon = shift.type === 'afternoon';
                          const hasAssignee = shift.assignees.some((a) => Boolean(a));

                          return (
                            <div
                              key={shift.id}
                              className={`rounded-xl border p-2 flex flex-col justify-between text-xs min-h-[72px] ${
                                !hasAssignee
                                  ? 'bg-rose-50/70 border-rose-300'
                                  : isNight
                                  ? 'bg-indigo-50/60 border-indigo-200'
                                  : 'bg-slate-50/80 border-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                                <span className="font-black text-slate-800 flex items-center gap-1">
                                  {isNight ? (
                                    <Moon className="w-3 h-3 text-indigo-600" />
                                  ) : isAfternoon ? (
                                    <Sunset className="w-3 h-3 text-amber-600" />
                                  ) : (
                                    <Sun className="w-3 h-3 text-sky-600" />
                                  )}
                                  {shift.name}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold">
                                  {shift.timeRange.split(' ')[0]}
                                </span>
                              </div>

                              <div className="pt-1 space-y-1">
                                {shift.assignees.map((assignee, idx) => {
                                  if (!assignee) {
                                    return (
                                      <div
                                        key={idx}
                                        className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300 text-center"
                                      >
                                        ⚠️ CẦN NGƯỜI TRỰC
                                      </div>
                                    );
                                  }

                                  const mem = getMemberByName(assignee);
                                  return (
                                    <div
                                      key={idx}
                                      className={`text-[11px] font-black px-2 py-0.5 rounded-lg border flex items-center justify-between ${
                                        mem?.pillBadge || 'bg-slate-100 text-slate-900 border-slate-200'
                                      }`}
                                    >
                                      <span className="truncate">{assignee}</span>
                                      {mem?.phone && (
                                        <span className="text-[9px] font-normal opacity-80 pl-1 shrink-0">
                                          {mem.phone.slice(-4)}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lưu Ý Quan Trọng Cho Người Trực */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
              <div className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>3 NGUYÊN TẮC QUAN TRỌNG KHI ĐI TRỰC</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-amber-950 font-medium">
                <div className="p-2 rounded-xl bg-white/80 border border-amber-200/80">
                  <strong className="block text-amber-900 font-bold mb-0.5">1. Giao ca đúng giờ:</strong>
                  Có mặt trước 15 phút để bàn giao thuốc, túi tiểu và bình truyền.
                </div>
                <div className="p-2 rounded-xl bg-white/80 border border-amber-200/80">
                  <strong className="block text-amber-900 font-bold mb-0.5">2. Chống loét & Đờm:</strong>
                  Lật trở nghiêng người 2 tiếng/lần, kiểm tra SpO2 và vỗ rung đờm.
                </div>
                <div className="p-2 rounded-xl bg-white/80 border border-amber-200/80">
                  <strong className="block text-amber-900 font-bold mb-0.5">3. Cấp cứu khẩn:</strong>
                  Bác sĩ ICU BS. Thắng (0912.345.678) • Điều dưỡng trực tầng 4.
                </div>
              </div>
            </div>

            {/* Danh Bạ Nhanh 7 Người Thân */}
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  Danh bạ 7 thành viên gia đình (để liên hệ hỗ trợ hoặc đổi ca gấp):
                </span>
                <span className="text-[10px] text-slate-400">Gia đình cùng chung sức</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {familyList.map((m) => (
                  <div
                    key={m.id}
                    className="p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-0.5"
                  >
                    <div className="text-[11px] font-black text-slate-900 truncate">{m.name}</div>
                    <div className="text-[9px] text-slate-500 truncate font-medium">{m.relation.split('(')[0]}</div>
                    <div className="text-[10px] font-bold text-indigo-700">{m.phone}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Thẻ */}
            <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>Hệ thống điều phối ca trực gia đình • Kết nối Google Sheets thời gian thực</span>
              <span>Được tạo tự động cho nhóm Zalo gia đình</span>
            </div>
          </div>
        </div>

        {/* Chân Modal */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            💡 Mẹo: Bấm <strong className="text-slate-800">Sao chép ảnh</strong> rồi mở Zalo bấm <strong className="text-slate-800">Ctrl + V</strong> là gửi được ngay.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copyStatus === 'copied' ? 'Đã sao chép!' : 'Sao chép ảnh Zalo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
