'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, History, Sparkles } from 'lucide-react';
import { TIME_SLOT_CONFIG } from '@/lib/config';
import { formatCompactDayMonth } from '@/lib/medicalVisitUtils';
import {
  type MedicationGroup,
  type MedicationPreset,
  normalizeMedKey,
  searchMedicationSuggestions,
} from '@/lib/medicationCatalog';

export interface MedicationQuickPickerProps {
  historyItems: MedicationPreset[];
  groups: MedicationGroup[];
  selectedTitles: string[];
  onPickPreset: (preset: MedicationPreset) => void;
}

/**
 * Bảng chọn nhanh "Thuốc đã từng dùng" và "Nhóm thuốc phổ biến theo đối tượng"
 * giúp thêm nhanh thuốc vào đơn chỉ với 1 chạm.
 */
export function MedicationQuickPicker({
  historyItems,
  groups,
  selectedTitles,
  onPickPreset,
}: MedicationQuickPickerProps) {
  const hasHistory = historyItems.length > 0;
  const [activeTab, setActiveTab] = useState<'history' | 'presets'>(
    hasHistory ? 'history' : 'presets'
  );
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  useEffect(() => {
    setActiveTab(historyItems.length > 0 ? 'history' : 'presets');
  }, [historyItems.length]);

  useEffect(() => {
    setSelectedGroupId('all');
  }, [groups]);

  const selectedKeySet = useMemo(() => {
    return new Set(selectedTitles.map((t) => normalizeMedKey(t)).filter(Boolean));
  }, [selectedTitles]);

  const visiblePresetItems = useMemo(() => {
    if (selectedGroupId === 'all') {
      return groups.flatMap((g) => g.items);
    }
    return groups.find((g) => g.id === selectedGroupId)?.items || [];
  }, [groups, selectedGroupId]);

  const displayedItems = activeTab === 'history' && hasHistory ? historyItems : visiblePresetItems;

  return (
    <div className="rounded-2xl border border-teal-200/90 bg-white p-3 sm:p-3.5 space-y-2.5 shadow-2xs">
      {/* Thanh chuyển Lịch sử vs Nhóm phổ biến */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {hasHistory && (
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition ${
                activeTab === 'history'
                  ? 'bg-amber-100 text-amber-950 border-amber-400 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>Đã từng dùng ({historyItems.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition ${
              activeTab === 'presets' || !hasHistory
                ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Nhóm thuốc phổ biến</span>
          </button>
        </div>

        <span className="text-[11px] font-semibold text-slate-500">
          Chạm 1 lần để điền nhanh thuốc, liều &amp; buổi uống
        </span>
      </div>

      {/* Bộ lọc nhóm thuốc khi đang ở tab Nhóm thuốc phổ biến */}
      {(activeTab === 'presets' || !hasHistory) && groups.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedGroupId('all')}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition ${
              selectedGroupId === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tất cả
          </button>
          {groups.map((grp) => (
            <button
              key={grp.id}
              type="button"
              onClick={() => setSelectedGroupId(grp.id)}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition ${
                selectedGroupId === grp.id
                  ? 'bg-teal-100 text-teal-950 border-teal-400'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {grp.emoji} {grp.label}
            </button>
          ))}
        </div>
      )}

      {/* Danh sách chip thuốc chọn nhanh */}
      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-0.5">
        {displayedItems.map((item) => {
          const isAdded = selectedKeySet.has(normalizeMedKey(item.title));
          const slotsLabel =
            item.medType === 'as_needed'
              ? 'Khi cần'
              : item.timeSlots.map((s) => TIME_SLOT_CONFIG[s]?.label).filter(Boolean).join('/');
          const subParts = [
            item.dosage,
            slotsLabel,
            item.durationDays ? `${item.durationDays} ngày` : '',
            item.source === 'history' && item.lastUsedDate
              ? `lần cuối ${formatCompactDayMonth(item.lastUsedDate)}`
              : '',
          ].filter(Boolean);

          return (
            <button
              key={item.id}
              type="button"
              disabled={isAdded}
              onClick={() => onPickPreset(item)}
              title={item.instructions || item.conditionNote || item.title}
              className={`min-h-[44px] px-3 py-1.5 rounded-xl border text-left transition flex flex-col justify-center ${
                isAdded
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 opacity-85 cursor-default'
                  : item.source === 'history'
                    ? 'bg-amber-50/70 hover:bg-amber-100 border-amber-200 text-slate-900 cursor-pointer'
                    : 'bg-slate-50 hover:bg-teal-50 border-slate-200 hover:border-teal-300 text-slate-900 cursor-pointer'
              }`}
            >
              <span className="text-xs font-extrabold flex items-center gap-1 leading-snug">
                {isAdded ? (
                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                ) : (
                  <span className="text-teal-700 font-black">+</span>
                )}
                <span>{item.title}</span>
                {item.source === 'history' && (item.useCount || 0) > 1 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-950 text-[10px] font-black">
                    ×{item.useCount}
                  </span>
                )}
              </span>
              {subParts.length > 0 && (
                <span className="text-[11px] font-medium text-slate-600 leading-tight mt-0.5">
                  {subParts.join(' · ')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface MedicationTitleAutocompleteProps {
  value: string;
  placeholder?: string;
  historyItems: MedicationPreset[];
  groups: MedicationGroup[];
  onChangeText: (value: string) => void;
  onSelectPreset: (preset: MedicationPreset) => void;
}

/**
 * Ô nhập tên thuốc tích hợp gợi ý trực tiếp khi gõ (không dấu tiếng Việt),
 * ưu tiên lịch sử đã nhập rồi đến danh mục thuốc phổ biến.
 */
export function MedicationTitleAutocomplete({
  value,
  placeholder,
  historyItems,
  groups,
  onChangeText,
  onSelectPreset,
}: MedicationTitleAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(
    () => searchMedicationSuggestions(value, historyItems, groups, 8),
    [value, historyItems, groups]
  );

  useEffect(() => {
    setHighlightedIdx(0);
  }, [value, suggestions.length]);

  const handleSelect = (item: MedicationPreset) => {
    onSelectPreset(item);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      const activeItem = suggestions[highlightedIdx];
      if (activeItem && normalizeMedKey(activeItem.title) !== normalizeMedKey(value)) {
        e.preventDefault();
        handleSelect(activeItem);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 120);
        }}
        onChange={(e) => {
          onChangeText(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-2xl border border-slate-200 bg-white shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
          <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-extrabold text-slate-500 flex items-center justify-between">
            <span>{value.trim() ? 'Gợi ý khớp tên thuốc' : 'Gợi ý nhanh (đã dùng & phổ biến)'}</span>
            <span>Chọn để điền đủ liều</span>
          </div>
          {suggestions.map((item, idx) => {
            const isActive = idx === highlightedIdx;
            const slotsText =
              item.medType === 'as_needed'
                ? 'Khi cần'
                : item.timeSlots.map((s) => TIME_SLOT_CONFIG[s]?.label).filter(Boolean).join('/');
            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
                className={`w-full text-left px-3 py-2.5 flex items-start justify-between gap-2 cursor-pointer transition ${
                  isActive ? 'bg-teal-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900">
                      {item.title}
                    </span>
                    {item.dosage && (
                      <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-md">
                        {item.dosage}
                      </span>
                    )}
                  </div>
                  {(item.instructions || slotsText) && (
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {[slotsText, item.durationDays ? `${item.durationDays} ngày` : '', item.instructions]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                </div>

                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    item.source === 'history'
                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {item.source === 'history'
                    ? '🕒 Đã dùng'
                    : `${item.groupEmoji} ${item.groupLabel}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
