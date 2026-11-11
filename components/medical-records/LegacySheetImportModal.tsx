'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, Sparkles, X, Check } from 'lucide-react';
import type { LabResultEntry, HealthProfileType } from '@/lib/types';
import {
  mergeBachYenPresets,
  parseLegacySheetsToEntries,
} from './labRecordsUtils';

interface LegacySheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  labResults: LabResultEntry[];
  profileId?: string;
  profileType: HealthProfileType;
  patientName: string;
  patientDisplayName: string;
  defaultRecorder: string;
  onSaveLabResult: (entry: LabResultEntry) => Promise<void>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
}

export function LegacySheetImportModal({
  isOpen,
  onClose,
  labResults,
  profileId,
  profileType,
  patientName,
  patientDisplayName,
  defaultRecorder,
  onSaveLabResult,
  showToast,
}: LegacySheetImportModalProps) {
  const [importRawText, setImportRawText] = useState('');
  const [importBiochemText, setImportBiochemText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleQuickLoadPresets = async () => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const mergedList = mergeBachYenPresets(labResults, defaultRecorder, profileId);
      for (const item of mergedList) {
        await onSaveLabResult(item);
      }
      showToast(
        `✅ Đã nạp thành công ${mergedList.length} mốc lịch sử Tuyến giáp (2022-2025) của ${patientName}!`,
        'success'
      );
      onClose();
    } finally {
      setIsImporting(false);
    }
  };

  const handlePasteImport = async () => {
    if ((!importRawText.trim() && !importBiochemText.trim()) || isImporting) return;
    setIsImporting(true);
    try {
      const entriesToSave = parseLegacySheetsToEntries({
        importRawText,
        importBiochemText,
        labResults,
        defaultRecorder,
        profileType,
        profileId,
      });

      for (const entry of entriesToSave) {
        await onSaveLabResult(entry);
      }

      if (entriesToSave.length > 0) {
        showToast(
          `✅ Đã nhập & đồng bộ thành công ${entriesToSave.length} đợt xét nghiệm của ${patientDisplayName}!`,
          'success'
        );
        setImportRawText('');
        setImportBiochemText('');
        onClose();
      } else {
        showToast(
          'Không tìm thấy dòng dữ liệu hợp lệ. Hãy copy từ cột A đến cột cuối trong bảng Google Sheet và dán vào ô.',
          'warn'
        );
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-surface-card rounded-3xl border border-border-card shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-teal-900 to-cyan-900 text-white flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-300 shrink-0" />
              Nhập Lịch Sử Từ Bảng Google Sheet Cũ ({patientDisplayName})
            </h3>
            <p className="text-xs text-teal-100 mt-0.5">
              Tương thích 100% cấu trúc 24 cột Sheet &quot;Data&quot; &amp; 23 cột Sheet &quot;BiochemistryData&quot;
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {profileType === 'thyroid_post_op' && (
            <div className="rounded-2xl bg-thyroid-bg/70 border border-indigo-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-base font-black text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-thyroid-accent shrink-0" />
                  Nạp nhanh 1 chạm 12 mốc lịch sử Tuyến giáp (2022-2025)
                </div>
                <p className="text-sm sm:text-base text-text-body leading-relaxed">
                  Dành cho hồ sơ hậu phẫu tuyến giáp của Mẹ Đoàn Thị Bạch Yến (giữ nguyên dữ liệu hiện có, chỉ gộp bổ sung).
                </p>
              </div>
              <button
                type="button"
                disabled={isImporting}
                onClick={handleQuickLoadPresets}
                className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-thyroid-accent hover:bg-indigo-700 text-white text-sm sm:text-base font-extrabold shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isImporting ? 'Đang nạp...' : '⚡ Nạp 12 mốc mẫu'}
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-base font-black text-text-main">
              1. Dán nội dung bảng Sheet &quot;Data&quot; (24 cột Tuyến giáp A -&gt; X)
            </label>
            <textarea
              rows={4}
              value={importRawText}
              onChange={(e) => setImportRawText(e.target.value)}
              placeholder="Bôi đen các dòng từ cột A (Timestamp) đến cột X (GhiChu) trên Google Sheet rồi Ctrl+C / Ctrl+V vào đây..."
              className="w-full p-3 rounded-2xl border border-border-card text-base font-mono text-text-main bg-slate-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-base font-black text-text-main">
              2. Dán nội dung bảng Sheet &quot;BiochemistryData&quot; (23 cột Hóa sinh A -&gt; W - Tùy chọn)
            </label>
            <textarea
              rows={4}
              value={importBiochemText}
              onChange={(e) => setImportBiochemText(e.target.value)}
              placeholder="Bôi đen các dòng từ cột A (Timestamp) đến cột W (Hemoglobin_Unit) để tự động nối với đợt khám cùng Timestamp..."
              className="w-full p-3 rounded-2xl border border-border-card text-base font-mono text-text-main bg-slate-50"
            />
          </div>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-border-card flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-surface-card hover:bg-slate-100 text-text-body border border-border-card text-base font-extrabold cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={isImporting || (!importRawText.trim() && !importBiochemText.trim())}
            onClick={handlePasteImport}
            className="min-h-[48px] min-w-[48px] px-5 py-2.5 rounded-xl bg-medical-primary hover:bg-medical-dark text-white text-base font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{isImporting ? 'Đang đồng bộ...' : 'Đồng bộ vào Sổ Xét Nghiệm'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LegacySheetImportModal;
