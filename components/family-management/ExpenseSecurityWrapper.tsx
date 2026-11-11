'use client';

import React, { useMemo, useState } from 'react';
import type { ExpenseEntry, ExpenseType, FamilyMember } from '@/lib/types';
import { KeyRound, Lock, Minus, Plus, Share2, Wallet } from 'lucide-react';
import { computeExpenseStats } from './expenses/expenseTrackerUtils';
import {
  ExpenseChangePinModal,
  ExpensePinLockScreen,
} from './expenses/ExpensePinModals';
import ExpenseOverviewCards from './expenses/ExpenseOverviewCards';
import ExpenseTransactionList from './expenses/ExpenseTransactionList';
import ExpenseEntryFormModal from './expenses/ExpenseEntryFormModal';
import ExpenseReportExportModal from './expenses/ExpenseReportExportModal';

export interface ExpenseTrackerViewProps {
  expenses: ExpenseEntry[];
  members: FamilyMember[];
  patientName: string;
  isUnlocked: boolean;
  onUnlockSuccess: () => void;
  onLock: () => void;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onChangePin: (
    oldPin: string,
    newPin: string
  ) => Promise<{ success: boolean; message?: string }>;
  onSaveExpense: (entry: ExpenseEntry) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
  onBackToHealth?: () => void;
}

export default function ExpenseSecurityWrapper({
  expenses,
  members,
  patientName,
  isUnlocked,
  onUnlockSuccess,
  onLock,
  onVerifyPin,
  onChangePin,
  onSaveExpense,
  onDeleteExpense,
  showToast,
  onBackToHealth,
}: ExpenseTrackerViewProps) {
  const [changePinModalOpen, setChangePinModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExpenseEntry | null>(null);
  const [initialFormType, setInitialFormType] = useState<ExpenseType>('out');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [filterPerson, setFilterPerson] = useState<string>('all');

  const stats = useMemo(() => computeExpenseStats(expenses), [expenses]);

  if (!isUnlocked) {
    return (
      <ExpensePinLockScreen
        onVerifyPin={onVerifyPin}
        onUnlockSuccess={onUnlockSuccess}
        onBackToHealth={onBackToHealth}
      />
    );
  }

  const openCreateForm = (type: ExpenseType) => {
    setEditingEntry(null);
    setInitialFormType(type);
    setIsFormOpen(true);
  };

  const openEditForm = (entry: ExpenseEntry) => {
    setEditingEntry(entry);
    setInitialFormType(entry.type);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Sổ Theo Dõi Thu Chi Điều Trị
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Ghi chép minh bạch các khoản thu chi từ ngày đầu cấp cứu để tiện nhớ &amp; đối chiếu khi cần
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onBackToHealth && (
              <button
                type="button"
                onClick={onBackToHealth}
                className="min-h-[48px] min-w-[48px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
                title="Quay lại giao diện Sổ Sức Khỏe chính"
              >
                <span>← Sổ Sức Khỏe</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              className="min-h-[48px] min-w-[48px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold shadow-2xs transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Tổng hợp &amp; Báo cáo</span>
            </button>

            <button
              type="button"
              onClick={() => setChangePinModalOpen(true)}
              className="min-h-[48px] min-w-[48px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
              title="Đổi mã PIN riêng của Sổ Thu Chi"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-600" />
              <span>Đổi PIN Sổ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onLock();
                onBackToHealth?.();
              }}
              className="min-h-[48px] min-w-[48px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition cursor-pointer"
              title="Khóa sổ lại ngay và quay về màn hình sức khỏe"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Khóa &amp; Đóng sổ</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => openCreateForm('out')}
            className="min-h-[52px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-2xs transition cursor-pointer"
          >
            <Minus className="w-4 h-4 shrink-0" />
            <span>Ghi Khoản Chi Điều Trị</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateForm('in')}
            className="min-h-[52px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Ghi Khoản Thu Vào Quỹ</span>
          </button>
        </div>
      </div>

      <ExpenseOverviewCards
        stats={stats}
        onSelectPersonFilter={setFilterPerson}
      />

      <ExpenseTransactionList
        expenses={expenses}
        allPersonNames={stats.allPersonNames}
        filterPerson={filterPerson}
        onChangeFilterPerson={setFilterPerson}
        onEditEntry={openEditForm}
        onDeleteEntry={onDeleteExpense}
        showToast={showToast}
      />

      <ExpenseEntryFormModal
        isOpen={isFormOpen}
        editingEntry={editingEntry}
        initialType={initialFormType}
        members={members}
        onClose={() => setIsFormOpen(false)}
        onSaveExpense={onSaveExpense}
        showToast={showToast}
      />

      <ExpenseReportExportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        expenses={expenses}
        patientName={patientName}
        showToast={showToast}
      />

      <ExpenseChangePinModal
        isOpen={changePinModalOpen}
        onClose={() => setChangePinModalOpen(false)}
        onChangePin={onChangePin}
        showToast={showToast}
      />
    </div>
  );
}
