'use client';

import React, { useMemo, useState } from 'react';
import type {
  ExpenseCategory,
  ExpenseEntry,
  ExpenseStage,
  ExpenseType,
} from '@/lib/types';
import {
  Edit3,
  Filter,
  Image as ImageIcon,
  Search,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import {
  CATEGORY_CONFIG,
  formatDateVN,
  formatVND,
  STAGE_CONFIG,
} from './expenseTrackerUtils';
import { MedicalEmptyState } from '@/components/ui-kit';

interface ExpenseTransactionListProps {
  expenses: ExpenseEntry[];
  allPersonNames: string[];
  filterPerson: string;
  onChangeFilterPerson: (person: string) => void;
  onEditEntry: (entry: ExpenseEntry) => void;
  onDeleteEntry: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
}

export default function ExpenseTransactionList({
  expenses,
  allPersonNames,
  filterPerson,
  onChangeFilterPerson,
  onEditEntry,
  onDeleteEntry,
  showToast,
}: ExpenseTransactionListProps) {
  const [filterType, setFilterType] = useState<'all' | ExpenseType>('all');
  const [filterStage, setFilterStage] = useState<'all' | ExpenseStage>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | ExpenseCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<ExpenseEntry | null>(null);

  const hasActiveFilters = Boolean(
    filterType !== 'all' ||
      filterPerson !== 'all' ||
      filterStage !== 'all' ||
      filterCategory !== 'all' ||
      searchQuery ||
      dateFrom ||
      dateTo
  );

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterStage !== 'all' && item.stage !== filterStage) return false;
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (filterPerson !== 'all') {
        const pName = (item.personName || '').trim();
        if (filterPerson === '__shared_fund__') {
          if (item.type !== 'out' || pName !== '') return false;
        } else if (pName !== filterPerson) {
          return false;
        }
      }
      if (dateFrom && item.date < dateFrom) return false;
      if (dateTo && item.date > dateTo) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchPerson = (item.personName || '').toLowerCase().includes(q);
        const matchNote = (item.note || '').toLowerCase().includes(q);
        const matchCat = (CATEGORY_CONFIG[item.category]?.label || '').toLowerCase().includes(q);
        if (!matchTitle && !matchPerson && !matchNote && !matchCat) return false;
      }
      return true;
    });
  }, [
    expenses,
    filterType,
    filterStage,
    filterCategory,
    filterPerson,
    dateFrom,
    dateTo,
    searchQuery,
  ]);

  const filteredTotals = useMemo(() => {
    let fIn = 0;
    let fOut = 0;
    for (const item of filteredExpenses) {
      if (item.type === 'in') fIn += Number(item.amount) || 0;
      else fOut += Number(item.amount) || 0;
    }
    return { fIn, fOut };
  }, [filteredExpenses]);

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-teal-700" />
            <span>Sổ Chi Tiết Các Khoản Thu Chi ({filteredExpenses.length})</span>
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              Thu đang lọc: +{formatVND(filteredTotals.fIn)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 font-bold">
              Chi đang lọc: -{formatVND(filteredTotals.fOut)}
            </span>
          </div>
        </div>

        {/* Thanh tìm kiếm & Lọc đa chiều */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên khoản thu/chi, người gửi, ghi chú..."
              className="w-full min-h-[48px] pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | ExpenseType)}
            className="min-h-[48px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="all">Tất cả: Thu &amp; Chi</option>
            <option value="out">➖ Chỉ xem Khoản Chi</option>
            <option value="in">➕ Chỉ xem Khoản Thu</option>
          </select>

          <select
            value={filterPerson}
            onChange={(e) => onChangeFilterPerson(e.target.value)}
            className="min-h-[48px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="all">Mọi thành viên</option>
            {allPersonNames.map((n) => (
              <option key={n} value={n}>
                👤 {n}
              </option>
            ))}
            <option value="__shared_fund__">💼 Quỹ chung (không ghi tên)</option>
          </select>

          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value as 'all' | ExpenseStage)}
            className="min-h-[48px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="all">Mọi giai đoạn</option>
            <option value="emergency">🚑 Cấp cứu &amp; Nằm viện</option>
            <option value="rehab_hospital">🏥 Tái khám &amp; Phục hồi</option>
            <option value="home_care">🏠 Chăm sóc tại nhà</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as 'all' | ExpenseCategory)}
            className="min-h-[48px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="all">Mọi danh mục</option>
            {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo khoảng ngày */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-600">Khoảng ngày:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="min-h-[44px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
          />
          <span className="text-xs text-slate-600">đến</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="min-h-[44px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                onChangeFilterPerson('all');
                setFilterStage('all');
                setFilterCategory('all');
                setSearchQuery('');
                setDateFrom('');
                setDateTo('');
              }}
              className="min-h-[48px] px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm font-bold text-slate-700 cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Danh sách các khoản Thu / Chi */}
        {filteredExpenses.length === 0 ? (
          <MedicalEmptyState
            icon={<Wallet className="w-8 h-8" />}
            badge="Sổ Thu Chi Điều Trị"
            title="Chưa có khoản thu hoặc chi nào trong danh sách"
            description="Bạn có thể bấm nút Ghi Khoản Chi Điều Trị hoặc Ghi Khoản Thu Vào Quỹ ở thanh công cụ phía trên (hỗ trợ chọn lùi ngày về những ngày đầu cấp cứu)."
            tone="warning"
            secondaryAction={
              hasActiveFilters
                ? {
                    label: 'Xóa toàn bộ bộ lọc',
                    onClick: () => {
                      setFilterType('all');
                      setFilterStage('all');
                      setFilterCategory('all');
                      onChangeFilterPerson('all');
                      setSearchQuery('');
                      setDateFrom('');
                      setDateTo('');
                    },
                  }
                : undefined
            }
          />
        ) : (
          <div className="space-y-2.5">
            {filteredExpenses.map((item) => {
              const catInfo = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other_expense;
              const stgInfo = STAGE_CONFIG[item.stage || 'home_care'];
              const isOut = item.type === 'out';

              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                        isOut
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}
                    >
                      {catInfo.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {formatDateVN(item.date)}
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md border ${catInfo.badgeClass}`}
                        >
                          {catInfo.label}
                        </span>
                        {isOut && stgInfo && (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md border ${stgInfo.badgeClass}`}
                          >
                            {stgInfo.icon} {stgInfo.shortLabel}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900 mt-1 break-words">
                        {item.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1 text-xs text-slate-600">
                        {item.personName && (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            {isOut
                              ? 'Người thanh toán: ' + item.personName
                              : 'Người gửi / Nguồn thu: ' + item.personName}
                          </span>
                        )}
                        {item.note && (
                          <span className="text-slate-600 italic">· {item.note}</span>
                        )}
                      </div>

                      {item.receiptImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({ url: item.receiptImage!, title: item.title })
                          }
                          className="mt-2 min-h-[44px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Xem ảnh hóa đơn / biên lai</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <div
                      className={`text-base sm:text-lg font-extrabold ${
                        isOut ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {isOut ? '-' : '+'}
                      {formatVND(item.amount)}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditEntry(item)}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
                        title="Chỉnh sửa khoản này"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEntry(item)}
                        className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition cursor-pointer"
                        title="Xóa khoản này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal xem ảnh hóa đơn */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900 truncate">
                {previewImage.title}
              </h4>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="min-h-[48px] min-w-[48px] p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="w-full max-h-[75vh] object-contain rounded-xl border border-slate-200"
            />
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">
              Xác nhận xóa khoản thu/chi?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Bạn có chắc muốn xóa khoản <strong>&quot;{deletingEntry.title}&quot;</strong> (
              {formatVND(deletingEntry.amount)}) ngày {formatDateVN(deletingEntry.date)} khỏi sổ không?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="min-h-[48px] px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deletingEntry.id;
                  setDeletingEntry(null);
                  await onDeleteEntry(id);
                  showToast('Đã xóa khoản thu/chi khỏi sổ.', 'info');
                }}
                className="min-h-[48px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer"
              >
                Xóa khoản này
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
