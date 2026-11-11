'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  X,
  Copy,
  Check,
  Database,
  Sparkles,
  CheckCircle2,
  Layers,
  Table,
} from 'lucide-react';

interface GoogleSheetGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSheetsConnected: boolean;
}

import { APPS_SCRIPT_5_SHEETS_CODE } from '@/lib/appsScriptTemplate';

export { APPS_SCRIPT_5_SHEETS_CODE };

export default function GoogleSheetGuideModal({
  isOpen,
  onClose,
  isSheetsConnected,
}: GoogleSheetGuideModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'appscript' | 'structure' | 'vercel'>('appscript');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Cấu Trúc Google Sheet 10 Bảng Tính V2.3 (Đa Hồ Sơ &amp; Xét Nghiệm)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Zero Hardcode
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Huyết áp (VitalsLog), Đơn thuốc (CareRoutines), Tích ngày (DailyLogs), Sổ Thu Chi (Expenses), Xét nghiệm (LabResults) + 5 bảng gốc
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hướng dẫn Google Sheet"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trạng thái kết nối hiện tại */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/60 border-b border-slate-800 shrink-0">
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 ${
              isSheetsConnected
                ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300'
                : 'bg-indigo-950/30 border-indigo-700/50 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold block">
                  {isSheetsConnected
                    ? 'Đã kết nối toàn bộ 10 Bảng Tính Google Sheets V2.3 thành công!'
                    : 'Đang hoạt động với Bộ lưu trữ dự phòng (In-Memory Fallback)'}
                </span>
                <span className="text-[11px] opacity-80">
                  {isSheetsConnected
                    ? 'Mọi dữ liệu huyết áp, đơn thuốc, tích hoàn thành, lịch tái khám, xét nghiệm & Sổ Thu Chi được lưu vào Google Sheets thời gian thực.'
                    : 'Chỉ cần cập nhật mã Google Apps Script V2.3 bên dưới là bảng Expenses & LabResults sẽ tự động khởi tạo mà không mất dữ liệu cũ!'}
                </span>
              </div>
            </div>

            {isSheetsConnected ? (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Online
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-bold text-xs shrink-0">
                Sẵn sàng
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 flex items-center gap-2 border-b border-slate-800 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('appscript')}
            className={`pb-2.5 px-3 min-h-[48px] min-w-[48px] text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'appscript'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-300 hover:text-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Mã Apps Script V2.3 (10 Bảng)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('structure')}
            className={`pb-2.5 px-3 min-h-[48px] min-w-[48px] text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'structure'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-300 hover:text-slate-100'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Cấu Trúc 10 Bảng Tính</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vercel')}
            className={`pb-2.5 px-3 min-h-[48px] min-w-[48px] text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'vercel'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-300 hover:text-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Gắn Link Vào Vercel</span>
          </button>
        </div>

        {/* Nội dung Tab cuộn */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'appscript' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-600/40 text-emerald-200 text-xs sm:text-sm leading-relaxed">
                <strong>⚡ Tự động 100% &amp; An toàn dữ liệu cũ:</strong> Khi cập nhật đoạn mã V2.3 này, hệ thống giữ nguyên toàn bộ dữ liệu trên các Sheet cũ và <strong>tự động tạo đủ 10 Sheet (thêm <code>Expenses</code> 13 cột &amp; <code>LabResults</code> 8 cột JSON + hỗ trợ <code>Data</code> / <code>BiochemistryData</code>)</strong> cùng bộ nhớ đệm <code>ScriptCache</code> 50ms!
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(APPS_SCRIPT_5_SHEETS_CODE, 'appscript_full')}
                  className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition shadow-lg cursor-pointer active:scale-95"
                >
                  {copiedKey === 'appscript_full' ? (
                    <>
                      <Check className="w-5 h-5 text-slate-950 stroke-[3]" />
                      <span>ĐÃ SAO CHÉP TOÀN BỘ MÃ NGUỒN 10 BẢNG V2.3!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>BẤM VÀO ĐÂY ĐỂ SAO CHÉP MÃ APPS SCRIPT V2.3 (1 CHẠM)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2 text-xs sm:text-sm text-slate-300">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Các bước cập nhật trong Google Sheets:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Mở trang tính Google Sheets &rarr; <strong>Tiện ích mở rộng</strong> &rarr; <strong>Apps Script</strong>.</li>
                  <li>Xóa hết code cũ trong <code>Code.gs</code>, dán đoạn mã V2.3 vừa sao chép &rarr; Bấm <strong>Lưu (Ctrl + S)</strong>.</li>
                  <li>Bấm nút <strong>Triển khai (Deploy)</strong> &rarr; <strong>Quản lý các bản triển khai (Manage deployments)</strong> &rarr; Bấm biểu tượng ✏️ (Chỉnh sửa) &rarr; Chọn Phiên bản: <strong>Phiên bản mới (New version)</strong> &rarr; Bấm <strong>Triển khai</strong> (nhờ vậy giữ nguyên URL cũ, không cần sửa lại trên Vercel!).</li>
                  <li>Hoặc nếu tạo mới từ đầu: Chọn <strong>Triển khai mới (New deployment)</strong> &rarr; <strong>Ứng dụng web (Web app)</strong> &rarr; Thực thi dưới dạng <strong>Tôi (Me)</strong>, Quyền truy cập <strong>Bất kỳ ai (Anyone)</strong> &rarr; Copy URL dán vào Vercel.</li>
                </ol>
              </div>

              {/* Code Preview */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs text-slate-300 font-bold block">Xem trước mã nguồn (Code.gs V2.3 - 10 Bảng):</span>
                <pre className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs font-mono text-emerald-300 max-h-56 overflow-y-auto leading-relaxed">
                  {APPS_SCRIPT_5_SHEETS_CODE}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300">
              <p className="text-slate-300">
                Toàn bộ dữ liệu V2.3 được chuẩn hóa thành <strong>10 bảng tính</strong> trong 1 file Google Sheet duy nhất (5 bảng mở rộng V2.3 + 5 bảng gốc):
              </p>

              {/* 5 Bảng mới V2.3 */}
              <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-700/40 space-y-2.5">
                <div className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  ⭐ 5 Bảng Mở Rộng V2.3 - Đa Hồ Sơ Sức Khỏe, Xét Nghiệm &amp; Sổ Thu Chi
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-950 border border-rose-800/60 space-y-1">
                    <div className="font-bold text-rose-400 flex items-center gap-1.5">
                      <Table className="w-4 h-4 shrink-0" /> 6. VitalsLog (Huyết áp - 14 cột)
                    </div>
                    <p className="text-slate-300 text-xs">
                      ID, Ngày, Giờ, Buổi, Tâm thu (SYS), Tâm trương (DIA), Mạch, SpO2, Nhiệt độ, Đường huyết, Ghi chú, Mức cảnh báo, Người đo, Ngày tạo.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-blue-800/60 space-y-1">
                    <div className="font-bold text-blue-400 flex items-center gap-1.5">
                      <Table className="w-4 h-4 shrink-0" /> 7. CareRoutines (Đơn thuốc &amp; Tập - 15 cột)
                    </div>
                    <p className="text-slate-300 text-xs">
                      ID, Mã giai đoạn, Tên giai đoạn, Loại (meds/rehab/care), Kiểu uống, Tên thuốc/bài tập, Liều lượng, Các buổi (JSON), Hướng dẫn, Lưu ý, Đang dùng, Thứ tự, Ảnh.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-emerald-800/60 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Table className="w-4 h-4 shrink-0" /> 8. DailyLogs (Tích hàng ngày - 8 cột)
                    </div>
                    <p className="text-slate-300 text-xs">
                      ID (dl-ngày-routine-buổi), Ngày, Mã đầu việc, Buổi, Đã xong (TRUE/FALSE), Giờ hoàn thành, Người tích, Ghi chú.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-amber-700/80 space-y-1">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Table className="w-4 h-4 shrink-0" /> 9. Expenses (Sổ Thu Chi Điều Trị - 13 cột)
                    </div>
                    <p className="text-slate-300 text-xs">
                      13 cột: <code>id</code>, <code>date</code>, <code>type</code> (out/in), <code>amount</code>, <code>stage</code>, <code>category</code>, <code>title</code>, <code>person_name</code>, <code>payment_source</code>, <code>note</code>, <code>receipt_image</code>, <code>created_at</code>, <code>updated_at</code>.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-teal-700/80 space-y-1 md:col-span-2">
                    <div className="font-bold text-teal-400 flex items-center gap-1.5">
                      <Table className="w-4 h-4 shrink-0" /> 10. LabResults (Xét nghiệm, Hóa sinh &amp; Nhi khoa - 8 cột JSON + Data/BiochemistryData)
                    </div>
                    <p className="text-slate-300 text-xs">
                      Lưu trữ xét nghiệm tuyến giáp (TSH, FT4, FT3, TG, Anti-TG), hóa sinh máu, tăng trưởng WHO và tiêm chủng nhi khoa, đồng bộ 2 chiều với bảng lịch sử <code>Data</code> (24 cột) và <code>BiochemistryData</code> (23 cột).
                    </p>
                  </div>
                </div>
              </div>

              {/* 5 Bảng gốc */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> 1. Bảng Shifts (Ca trực &amp; Lịch phụ Mẹ)
                  </div>
                  <p className="text-slate-300 text-xs">
                    24 cột: Lưu trữ lịch sử ca trực ICU cũ và lịch các con đăng ký qua phụ Mẹ chăm bố.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-blue-400 flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> 2. Bảng Members (Thành viên)
                  </div>
                  <p className="text-slate-300 text-xs">
                    12 cột: Mã TV, Họ tên, Vai vế trong nhà, Số điện thoại, Màu sắc hiển thị, Phân loại thành viên hỗ trợ.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> 3. Bảng Settings (Bệnh án, PIN Admin, PIN Thu Chi)
                  </div>
                  <p className="text-slate-300 text-xs">
                    3 cột (key, value, description): Hồ sơ bệnh nhân, <code>admin_pin</code> (1234), <code>expense_pin</code> (2468), Lịch tái khám và Ngưỡng huyết áp.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-rose-400 flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> 4. Bảng Contacts (Danh bạ SOS)
                  </div>
                  <p className="text-slate-300 text-xs">
                    7 cột: ID, Tên, Phân loại (Bác sĩ, 115, Điều dưỡng, Hàng xóm, Gia đình), Số điện thoại, Ghi chú khẩn cấp, Địa chỉ, Đánh dấu ưu tiên.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="font-bold text-yellow-400 flex items-center gap-1.5">
                  <Table className="w-4 h-4" /> 5. Bảng Reminders (Nhắc nhở y tế trong ngày)
                </div>
                <p className="text-slate-300 text-xs">
                  8 cột: ID, Phân loại (Thuốc, Tình trạng, Dặn dò, Sonde ăn, Chung), Tiêu đề, Nội dung chi tiết, Người ghi chú, Giờ ghi, Cờ khẩn cấp, Thời gian tạo.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'vercel' && (
            <div className="space-y-4 text-xs sm:text-sm text-slate-300">
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-600/40 text-indigo-200">
                <strong>Chỉ cần gắn 1 biến môi trường duy nhất vào dự án Vercel:</strong>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-amber-400 font-mono font-bold text-sm">
                    GOOGLE_SHEETS_WEBAPP_URL
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('GOOGLE_SHEETS_WEBAPP_URL', 'var_name')}
                    className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    {copiedKey === 'var_name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy tên biến</span>
                  </button>
                </div>
                <p className="text-xs text-slate-300">
                  Giá trị là đường link Web App mà bạn copy từ Apps Script (có dạng <code>https://script.google.com/macros/s/AKfycb.../exec</code>).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-300 hidden sm:inline">
            Ứng dụng đọc/ghi đồng thời cả 10 bảng tính Google Sheets thời gian thực
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-black transition min-h-[48px] min-w-[48px] cursor-pointer shadow"
          >
            Đã Hiểu &amp; Đóng Lại
          </button>
        </div>
      </div>
    </div>
  );
}
