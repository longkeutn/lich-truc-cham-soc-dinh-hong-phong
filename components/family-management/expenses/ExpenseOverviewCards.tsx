'use client';

import React, { useState } from 'react';
import type { ExpenseCategory, ExpenseStage } from '@/lib/types';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  Scale,
  User,
} from 'lucide-react';
import {
  CATEGORY_CONFIG,
  formatVND,
  STAGE_CONFIG,
  type ExpenseComputedStats,
} from './expenseTrackerUtils';

interface ExpenseOverviewCardsProps {
  stats: ExpenseComputedStats;
  onSelectPersonFilter: (personName: string) => void;
}

export default function ExpenseOverviewCards({
  stats,
  onSelectPersonFilter,
}: ExpenseOverviewCardsProps) {
  const [showBreakdown, setShowBreakdown] = useState<boolean>(true);
  const [activeCardInfo, setActiveCardInfo] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Ô 1 */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">
                1. Tổng Thu Vào Quỹ
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 1 ? null : 1)}
                className="min-h-[48px] min-w-[48px] -my-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer shrink-0 flex items-center justify-center"
                aria-label="Giải thích Ô 1"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0 ml-1">
              <ArrowDownCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1.5">
            +{formatVND(stats.totalIn)}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Gia đình đóng góp, thăm hỏi &amp; BHYT ({stats.inCount} khoản)
          </p>
          {activeCardInfo === 1 && (
            <div className="mt-2.5 pt-2 border-t border-emerald-100 text-xs text-emerald-950 bg-emerald-50/70 p-2.5 rounded-xl leading-relaxed">
              💡 <strong>Cách tính:</strong> Tổng các khoản mọi người gửi vào quỹ chăm sóc Bố, kể cả tiền BHYT và hỗ trợ nhận về.
            </div>
          )}
        </div>

        {/* Ô 2 */}
        <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">
                2. Tổng Chi Điều Trị
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 2 ? null : 2)}
                className="min-h-[48px] min-w-[48px] -my-2 rounded-xl text-slate-600 hover:text-rose-700 hover:bg-rose-50 cursor-pointer shrink-0 flex items-center justify-center"
                aria-label="Giải thích Ô 2"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 shrink-0 ml-1">
              <ArrowUpCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-1.5">
            -{formatVND(stats.totalOut)}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Viện phí, thuốc men, thiết bị, chăm sóc ({stats.outCount} khoản)
          </p>
          {activeCardInfo === 2 && (
            <div className="mt-2.5 pt-2 border-t border-rose-100 text-xs text-rose-950 bg-rose-50/70 p-2.5 rounded-xl leading-relaxed">
              💡 <strong>Cách tính:</strong> Toàn bộ chi phí lo cho Bố, dù là chi từ quỹ chung hay do một thành viên trực tiếp đi thanh toán.
            </div>
          )}
        </div>

        {/* Ô 3 */}
        <div
          className={
            'bg-white rounded-2xl border p-4 shadow-2xs ' +
            (stats.netOverallBalance >= 0 ? 'border-teal-200' : 'border-amber-300 bg-amber-50/40')
          }
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                3. Số Dư Quỹ Hiện Tại
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 3 ? null : 3)}
                className="min-h-[48px] min-w-[48px] -my-2 rounded-xl text-slate-600 hover:text-amber-800 hover:bg-amber-50 cursor-pointer shrink-0 flex items-center justify-center"
                aria-label="Giải thích Ô 3"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <span
              className={
                'p-1.5 rounded-lg shrink-0 ml-1 ' +
                (stats.netOverallBalance >= 0
                  ? 'bg-teal-50 text-teal-700'
                  : 'bg-amber-100 text-amber-800')
              }
            >
              <Scale className="w-4 h-4" />
            </span>
          </div>
          <div
            className={
              'text-xl sm:text-2xl font-extrabold mt-1.5 ' +
              (stats.netOverallBalance >= 0 ? 'text-teal-700' : 'text-amber-800')
            }
          >
            {stats.netOverallBalance >= 0
              ? '+' + formatVND(stats.netOverallBalance)
              : '-' + formatVND(Math.abs(stats.netOverallBalance))}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {stats.netOverallBalance >= 0
              ? 'Số tiền hiện còn trong quỹ chăm sóc Bố'
              : 'Chi đang vượt thu ' +
                formatVND(Math.abs(stats.netOverallBalance)) +
                ' - người giữ sổ tạm bù'}
          </p>
          {activeCardInfo === 3 && (
            <div className="mt-2.5 pt-2 border-t border-amber-200 text-xs text-amber-950 bg-amber-50/70 p-2.5 rounded-xl leading-relaxed">
              💡 <strong>Cách tính:</strong> Ô 1 (Tổng thu) trừ Ô 2 (Tổng chi). Khi số dư âm nghĩa là chi đang nhiều hơn số tiền đã gửi vào quỹ; phần chênh lệch do người giữ sổ tạm lo trước và bù lại khi có thêm đóng góp.
            </div>
          )}
        </div>

        {/* Ô 4 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                4. Người Trực Tiếp Chi Trả
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 4 ? null : 4)}
                className="min-h-[48px] min-w-[48px] -my-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 cursor-pointer shrink-0 flex items-center justify-center"
                aria-label="Giải thích Ô 4"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0 ml-1">
              <User className="w-4 h-4" />
            </span>
          </div>
          {stats.outPayerList.length === 0 ? (
            <p className="text-xs text-slate-600 mt-2">
              Chưa ghi tên ai trực tiếp thanh toán. Khi ghi khoản chi, bạn có thể chọn tên để tiện nhớ.
            </p>
          ) : (
            <div className="mt-1.5 space-y-1">
              {stats.outPayerList.slice(0, 3).map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => onSelectPersonFilter(p.name)}
                  className="w-full min-h-[48px] text-left hover:bg-slate-50 rounded-xl px-2 py-1.5 cursor-pointer"
                  title="Bấm để xem các khoản này"
                >
                  <span className="text-sm font-extrabold text-slate-900">
                    {p.name}: {formatVND(p.amount)}
                  </span>
                  <span className="block text-xs text-slate-600">
                    {p.count} khoản trực tiếp thanh toán
                  </span>
                </button>
              ))}
            </div>
          )}
          {activeCardInfo === 4 && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-800 bg-slate-50 p-2.5 rounded-xl leading-relaxed">
              💡 <strong>Ý nghĩa:</strong> Chỉ để ghi nhớ ai đã đứng ra đóng/mua các khoản này. Số tiền đã nằm trong Tổng chi (Ô 2) nên không cộng thêm. Bấm vào tên để xem chi tiết.
            </div>
          )}
        </div>
      </div>

      {/* BẢNG PHÂN BỔ THEO GIAI ĐOẠN & NGUỒN ĐÓNG GÓP */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full min-h-[48px] px-4 sm:px-5 py-3.5 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-700" />
            <span className="text-sm font-extrabold text-slate-800">
              Tổng hợp theo Giai đoạn, Nhóm chi phí &amp; Nguồn thu
            </span>
          </div>
          {showBreakdown ? (
            <ChevronUp className="w-4 h-4 text-slate-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {showBreakdown && (
          <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 border-t border-slate-100">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2.5">
                  Chi phí theo 3 giai đoạn điều trị
                </h3>
                <div className="space-y-2.5">
                  {(Object.keys(STAGE_CONFIG) as ExpenseStage[]).map((stg) => {
                    const amount = stats.byStage[stg] || 0;
                    const pct =
                      stats.totalOut > 0 ? Math.round((amount / stats.totalOut) * 100) : 0;
                    return (
                      <div key={stg} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">
                            {STAGE_CONFIG[stg].icon} {STAGE_CONFIG[stg].label}
                          </span>
                          <span className="font-extrabold text-slate-900">
                            {formatVND(amount)}{' '}
                            <span className="text-slate-600 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${STAGE_CONFIG[stg].barColor}`}
                            style={{ width: `${Math.max(pct, amount > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                  Chi phí theo nhóm danh mục
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[])
                    .filter((cat) => CATEGORY_CONFIG[cat].type === 'out')
                    .map((cat) => {
                      const val = stats.byCategory[cat] || 0;
                      if (val === 0) return null;
                      return (
                        <div
                          key={cat}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
                        >
                          <span className="font-semibold text-slate-700 truncate">
                            {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
                          </span>
                          <span className="font-extrabold text-slate-900 shrink-0 ml-2">
                            {formatVND(val)}
                          </span>
                        </div>
                      );
                    })}
                  {stats.totalOut === 0 && (
                    <p className="text-xs text-slate-600 italic col-span-2">
                      Chưa có khoản chi nào được ghi nhận.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2.5">
                  🌱 Đóng góp &amp; Nguồn thu vào Quỹ (+{formatVND(stats.totalIn)})
                </h3>
                {stats.inContributorList.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600">
                    Chưa có khoản thu nào.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {stats.inContributorList.map((c) => (
                      <div
                        key={c.name}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200/70"
                      >
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                            {c.name}
                          </div>
                          <div className="text-xs text-slate-600">{c.count} lần gửi</div>
                        </div>
                        <div className="text-sm font-extrabold text-emerald-700 shrink-0 ml-3">
                          {formatVND(c.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2.5">
                  🤝 Ghi nhận người trực tiếp đi thanh toán (-{formatVND(stats.totalOut)})
                </h3>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {stats.outPayerList.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => onSelectPersonFilter(p.name)}
                      className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                          👤 {p.name}
                        </div>
                        <div className="text-xs text-slate-600">
                          {p.count} khoản · bấm để xem chi tiết
                        </div>
                      </div>
                      <div className="text-sm font-extrabold text-slate-800 shrink-0 ml-3">
                        {formatVND(p.amount)}
                      </div>
                    </button>
                  ))}
                  {stats.sharedFundOut > 0 && (
                    <button
                      type="button"
                      onClick={() => onSelectPersonFilter('__shared_fund__')}
                      className="w-full min-h-[48px] flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-teal-50/60 hover:bg-teal-50 border border-teal-200 text-left transition cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-extrabold text-slate-800">
                          💼 Chi từ Quỹ chung
                        </div>
                        <div className="text-xs text-slate-600">
                          {stats.sharedFundCount} khoản không ghi tên riêng
                        </div>
                      </div>
                      <div className="text-sm font-extrabold text-teal-800 shrink-0 ml-3">
                        {formatVND(stats.sharedFundOut)}
                      </div>
                    </button>
                  )}
                  {stats.outPayerList.length === 0 && stats.sharedFundOut === 0 && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600">
                      Chưa có khoản chi nào.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
