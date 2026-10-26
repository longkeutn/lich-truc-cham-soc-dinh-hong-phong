'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  ExpenseEntry,
  ExpenseType,
  ExpenseStage,
  ExpenseCategory,
  PaymentSource,
  FamilyMember,
} from '@/lib/types';
import { getVietnamDateStr } from '@/lib/config';
import {
  Lock,
  Unlock,
  KeyRound,
  Plus,
  Minus,
  Search,
  Filter,
  FileText,
  Download,
  Copy,
  Check,
  Edit3,
  Trash2,
  Image as ImageIcon,
  X,
  Eye,
  EyeOff,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  Calendar,
  Tag,
  User,
  Camera,
  ChevronDown,
  ChevronUp,
  Share2,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

interface ExpenseTrackerViewProps {
  expenses: ExpenseEntry[];
  members: FamilyMember[];
  patientName: string;
  isUnlocked: boolean;
  onUnlockSuccess: () => void;
  onLock: () => void;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onChangePin: (oldPin: string, newPin: string) => Promise<{ success: boolean; message?: string }>;
  onSaveExpense: (entry: ExpenseEntry) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
  onBackToHealth?: () => void;
}

export const STAGE_CONFIG: Record<
  ExpenseStage,
  { label: string; shortLabel: string; icon: string; badgeClass: string; barColor: string }
> = {
  emergency: {
    label: 'Giai đoạn Cấp cứu & Nằm viện',
    shortLabel: 'Cấp cứu / Nằm viện',
    icon: '🚑',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    barColor: 'bg-rose-500',
  },
  rehab_hospital: {
    label: 'Giai đoạn Tái khám & Phục hồi',
    shortLabel: 'Tái khám / Phục hồi',
    icon: '🏥',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    barColor: 'bg-amber-500',
  },
  home_care: {
    label: 'Giai đoạn Chăm sóc tại nhà',
    shortLabel: 'Chăm sóc tại nhà',
    icon: '🏠',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    barColor: 'bg-teal-600',
  },
};

export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  {
    label: string;
    icon: string;
    type: ExpenseType;
    badgeClass: string;
    suggestions: string[];
  }
> = {
  hospital_fee: {
    label: 'Viện phí & Thủ thuật',
    icon: '🏥',
    type: 'out',
    badgeClass: 'bg-red-50 text-red-800 border-red-200',
    suggestions: [
      'Đóng tạm ứng viện phí',
      'Thanh toán viện phí ra viện',
      'Chi phí chụp CT / MRI',
      'Chi phí xét nghiệm cận lâm sàng',
      'Tiền giường điều trị nội trú',
    ],
  },
  medicine: {
    label: 'Thuốc men & Vật tư y tế',
    icon: '💊',
    type: 'out',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    suggestions: [
      'Mua thuốc theo đơn bác sĩ',
      'Thuốc điều trị ngoài danh mục BHYT',
      'Mua vật tư y tế (bông, gạc, cồn, nước muối)',
      'Thuốc bổ não / phục hồi thần kinh',
    ],
  },
  equipment: {
    label: 'Thiết bị & Dụng cụ hỗ trợ',
    icon: '🦽',
    type: 'out',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    suggestions: [
      'Mua đệm hơi chống loét',
      'Giường y tế đa năng',
      'Máy đo huyết áp / SpO2',
      'Xe lăn / Khung tập đi',
      'Dụng cụ tập vật lý trị liệu',
    ],
  },
  nutrition_diaper: {
    label: 'Dinh dưỡng & Bỉm sữa',
    icon: '🥛',
    type: 'out',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    suggestions: [
      'Mua sữa dinh dưỡng y tế cho bố',
      'Mua bỉm / tã dán người lớn',
      'Tấm lót chống thấm & khăn ướt',
      'Thực phẩm dinh dưỡng / Yến chưng',
    ],
  },
  transport: {
    label: 'Xe cộ & Vận chuyển',
    icon: '🚕',
    type: 'out',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    suggestions: [
      'Chi phí xe cấp cứu chuyển viện',
      'Thuê xe dịch vụ đưa bố xuất viện về nhà',
      'Xe taxi đưa đón bố đi tái khám',
    ],
  },
  care_service: {
    label: 'Dịch vụ chăm sóc & Tập PHCN',
    icon: '🤝',
    type: 'out',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    suggestions: [
      'Thuê hộ lý hỗ trợ chăm sóc tại viện',
      'Chi phí kỹ thuật viên tập PHCN tại nhà',
      'Dịch vụ điều dưỡng chăm sóc tại nhà',
    ],
  },
  other_expense: {
    label: 'Chi phí khác',
    icon: '📦',
    type: 'out',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    suggestions: [
      'Mua đồ dùng sinh hoạt tại viện',
      'Chi phí photo hồ sơ / giấy tờ bệnh án',
    ],
  },
  family_contrib: {
    label: 'Gia đình gửi vào quỹ',
    icon: '👨‍👩‍👧‍👦',
    type: 'in',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    suggestions: [
      'Gửi vào quỹ chăm sóc bố',
      'Chuyển khoản đóng góp quỹ điều trị',
      'Bổ sung quỹ chi tiêu thuốc men cho bố',
    ],
  },
  insurance_support: {
    label: 'BHYT / Bảo hiểm thanh toán',
    icon: '🛡️',
    type: 'in',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    suggestions: [
      'Tiền hoàn trả viện phí BHYT',
      'Khoản chi trả từ bảo hiểm y tế',
    ],
  },
  visitation_gift: {
    label: 'Tiền thăm hỏi hỗ trợ',
    icon: '🎁',
    type: 'in',
    badgeClass: 'bg-pink-50 text-pink-800 border-pink-200',
    suggestions: [
      'Tiền họ hàng / người thân thăm hỏi bố',
      'Tiền cơ quan / đồng nghiệp thăm bệnh',
    ],
  },
  other_income: {
    label: 'Khoản thu khác',
    icon: '📥',
    type: 'in',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
    suggestions: ['Khoản thu bổ sung vào quỹ'],
  },
};

const QUICK_AMOUNTS = [
  { label: '100k', value: 100000 },
  { label: '200k', value: 200000 },
  { label: '500k', value: 500000 },
  { label: '1 triệu', value: 1000000 },
  { label: '2 triệu', value: 2000000 },
  { label: '5 triệu', value: 5000000 },
  { label: '10 triệu', value: 10000000 },
];

export function formatVND(amount: number): string {
  return Math.round(amount).toLocaleString('vi-VN') + ' đ';
}

export function formatNumberInput(val: number | string): string {
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
}

export function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

async function compressReceiptImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Không thể xử lý ảnh'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.68));
      };
      img.onerror = () => reject(new Error('Lỗi đọc file ảnh'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Lỗi đọc file'));
    reader.readAsDataURL(file);
  });
}

export default function ExpenseTrackerView({
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
  // ===== STATE MỞ KHÓA PIN RIÊNG =====
  const [pinInput, setPinInput] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pinError, setPinError] = useState('');

  // ===== MODAL ĐỔI MÃ PIN RIÊNG =====
  const [changePinModalOpen, setChangePinModalOpen] = useState(false);
  const [oldPinInput, setOldPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [changePinError, setChangePinError] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  // ===== STATE FORM THÊM / SỬA KHOẢN THU CHI =====
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<ExpenseType>('out');
  const [formDate, setFormDate] = useState<string>(() => getVietnamDateStr());
  const [formAmountStr, setFormAmountStr] = useState<string>('');
  const [formStage, setFormStage] = useState<ExpenseStage>('home_care');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('medicine');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formPaymentSource, setFormPaymentSource] = useState<PaymentSource>('fund_or_advance');
  const [formPersonName, setFormPersonName] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');
  const [formReceiptImage, setFormReceiptImage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ===== STATE BỘ LỌC & TRA CỨU =====
  const [filterType, setFilterType] = useState<'all' | ExpenseType>('all');
  const [filterStage, setFilterStage] = useState<'all' | ExpenseStage>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | ExpenseCategory>('all');
  const [filterSource, setFilterSource] = useState<
    'all' | 'fund_direct' | 'advance_all' | 'advance_pending' | 'advance_reimbursed'
  >('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showAdvanceTracker, setShowAdvanceTracker] = useState<boolean>(true);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(true);
  const [activeCardInfo, setActiveCardInfo] = useState<number | null>(null);
  const [togglingReimburseId, setTogglingReimburseId] = useState<string | null>(null);

  // ===== STATE XEM ẢNH HÓA ĐƠN & XÁC NHẬN XÓA =====
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<ExpenseEntry | null>(null);

  // ===== STATE MODAL XUẤT BÁO CÁO NHANH =====
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportIncludeSummary, setReportIncludeSummary] = useState(true);
  const [reportIncludeStageAndCat, setReportIncludeStageAndCat] = useState(true);
  const [reportIncludeContributors, setReportIncludeContributors] = useState(true);
  const [reportIncludeDetails, setReportIncludeDetails] = useState(false);
  const [reportStageFilter, setReportStageFilter] = useState<'all' | ExpenseStage>('all');
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const reportCardRef = useRef<HTMLDivElement | null>(null);

  // ===== TÍNH TOÁN TỔNG HỢP 4 Ô & SỔ THEO DÕI TIỀN ỨNG MINH BẠCH =====
  const stats = useMemo(() => {
    let totalIn = 0;               // Ô 1: Tổng tiền nhận vào quỹ
    let totalOut = 0;              // Ô 2: Tổng toàn bộ chi phí điều trị
    let directFundOut = 0;         // Chi lấy thẳng từ Quỹ ngay từ lúc thanh toán
    let advancePendingOut = 0;     // Cá nhân ứng trước — Chưa rút Quỹ hoàn lại
    let advanceReimbursedOut = 0;  // Cá nhân ứng trước — Đã rút Quỹ hoàn lại (vẫn lưu lịch sử ứng)
    let inCount = 0;
    let outCount = 0;

    const byStage: Record<ExpenseStage, number> = {
      emergency: 0,
      rehab_hospital: 0,
      home_care: 0,
    };

    const byCategory: Partial<Record<ExpenseCategory, number>> = {};
    const byContributor: Record<
      string,
      {
        fundIn: number;
        directPaid: number;
        reimbursedAdvance: number;
        totalAdvanceHistory: number;
        total: number;
      }
    > = {};

    const advanceItems: ExpenseEntry[] = [];
    const byAdvancer: Record<
      string,
      {
        totalAdvanced: number;
        reimbursed: number;
        pending: number;
        count: number;
        pendingCount: number;
      }
    > = {};

    for (const item of expenses) {
      const amt = Number(item.amount) || 0;
      if (item.type === 'in') {
        totalIn += amt;
        inCount++;
        const contributor = (item.personName || 'Quỹ gia đình / Khác').trim();
        if (!byContributor[contributor]) {
          byContributor[contributor] = {
            fundIn: 0,
            directPaid: 0,
            reimbursedAdvance: 0,
            totalAdvanceHistory: 0,
            total: 0,
          };
        }
        byContributor[contributor].fundIn += amt;
        byContributor[contributor].total += amt;
      } else {
        totalOut += amt;
        outCount++;
        const stg = item.stage || 'home_care';
        byStage[stg] = (byStage[stg] || 0) + amt;

        const cat = item.category || 'other_expense';
        byCategory[cat] = (byCategory[cat] || 0) + amt;

        if (item.paymentSource === 'direct_member') {
          advancePendingOut += amt;
          advanceItems.push(item);
          const payer = (item.personName || 'Người quản lý / Thành viên').trim();
          if (!byContributor[payer]) {
            byContributor[payer] = {
              fundIn: 0,
              directPaid: 0,
              reimbursedAdvance: 0,
              totalAdvanceHistory: 0,
              total: 0,
            };
          }
          byContributor[payer].directPaid += amt;
          byContributor[payer].totalAdvanceHistory += amt;
          byContributor[payer].total += amt;

          if (!byAdvancer[payer]) {
            byAdvancer[payer] = {
              totalAdvanced: 0,
              reimbursed: 0,
              pending: 0,
              count: 0,
              pendingCount: 0,
            };
          }
          byAdvancer[payer].totalAdvanced += amt;
          byAdvancer[payer].pending += amt;
          byAdvancer[payer].count += 1;
          byAdvancer[payer].pendingCount += 1;
        } else if (item.paymentSource === 'advance_reimbursed') {
          advanceReimbursedOut += amt;
          advanceItems.push(item);
          const payer = (item.personName || 'Người quản lý / Thành viên').trim();
          if (!byContributor[payer]) {
            byContributor[payer] = {
              fundIn: 0,
              directPaid: 0,
              reimbursedAdvance: 0,
              totalAdvanceHistory: 0,
              total: 0,
            };
          }
          byContributor[payer].reimbursedAdvance += amt;
          byContributor[payer].totalAdvanceHistory += amt;

          if (!byAdvancer[payer]) {
            byAdvancer[payer] = {
              totalAdvanced: 0,
              reimbursed: 0,
              pending: 0,
              count: 0,
              pendingCount: 0,
            };
          }
          byAdvancer[payer].totalAdvanced += amt;
          byAdvancer[payer].reimbursed += amt;
          byAdvancer[payer].count += 1;
        } else {
          directFundOut += amt;
        }
      }
    }

    // Tổng tiền đã xuất khỏi Quỹ = Chi thẳng từ Quỹ + Khoản ứng đã rút Quỹ hoàn lại
    const fundOut = directFundOut + advanceReimbursedOut;
    // Tổng tiền cá nhân đang ứng chưa lấy lại từ Quỹ
    const directMemberOut = advancePendingOut;
    // Tổng lịch sử tất cả các khoản cá nhân đã từng ứng ra (kể cả đã hoàn & chưa hoàn)
    const totalAdvanceHistory = advancePendingOut + advanceReimbursedOut;

    // Ô 3: Tiền mặt Quỹ còn giữ (Tổng Thu - Đã xuất khỏi Quỹ)
    const fundCashRemaining = totalIn - fundOut;
    // Ô 4: Cân đối thực tế (Sau khi trừ cả khoản đang ứng chưa rút = Tổng Thu - Tổng Chi)
    const netOverallBalance = totalIn - totalOut;

    const contributorList = Object.entries(byContributor)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.total + b.reimbursedAdvance - (a.total + a.reimbursedAdvance));

    const advancerList = Object.entries(byAdvancer)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.totalAdvanced - a.totalAdvanced);

    return {
      totalIn,
      totalOut,
      directFundOut,
      fundOut,
      directMemberOut,
      advancePendingOut,
      advanceReimbursedOut,
      totalAdvanceHistory,
      fundCashRemaining,
      netOverallBalance,
      inCount,
      outCount,
      byStage,
      byCategory,
      contributorList,
      advanceItems,
      advancerList,
    };
  }, [expenses]);

  // ===== DANH SÁCH ĐÃ LỌC =====
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterStage !== 'all' && item.stage !== filterStage) return false;
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (filterSource !== 'all') {
        if (item.type !== 'out') return false;
        const src = item.paymentSource || 'fund_or_advance';
        if (filterSource === 'fund_direct' && src !== 'fund_or_advance') return false;
        if (
          filterSource === 'advance_all' &&
          src !== 'direct_member' &&
          src !== 'advance_reimbursed'
        ) {
          return false;
        }
        if (filterSource === 'advance_pending' && src !== 'direct_member') return false;
        if (filterSource === 'advance_reimbursed' && src !== 'advance_reimbursed') return false;
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
  }, [expenses, filterType, filterStage, filterCategory, filterSource, dateFrom, dateTo, searchQuery]);

  const filteredTotals = useMemo(() => {
    let fIn = 0;
    let fOut = 0;
    for (const item of filteredExpenses) {
      if (item.type === 'in') fIn += Number(item.amount) || 0;
      else fOut += Number(item.amount) || 0;
    }
    return { fIn, fOut };
  }, [filteredExpenses]);

  // ===== DỮ LIỆU DÀNH RIÊNG CHO BÁO CÁO =====
  const reportData = useMemo(() => {
    const list =
      reportStageFilter === 'all'
        ? expenses
        : expenses.filter((e) => e.stage === reportStageFilter);

    let rIn = 0;
    let rOut = 0;
    let rFundOut = 0;
    let rDirectOut = 0;
    let rReimbursedOut = 0;
    const rStage: Record<ExpenseStage, number> = {
      emergency: 0,
      rehab_hospital: 0,
      home_care: 0,
    };
    const rCat: Partial<Record<ExpenseCategory, number>> = {};
    const rContrib: Record<
      string,
      { fundIn: number; directPaid: number; reimbursedAdvance: number; total: number }
    > = {};

    for (const item of list) {
      const amt = Number(item.amount) || 0;
      if (item.type === 'in') {
        rIn += amt;
        const p = (item.personName || 'Quỹ gia đình').trim();
        if (!rContrib[p]) {
          rContrib[p] = { fundIn: 0, directPaid: 0, reimbursedAdvance: 0, total: 0 };
        }
        rContrib[p].fundIn += amt;
        rContrib[p].total += amt;
      } else {
        rOut += amt;
        rStage[item.stage || 'home_care'] += amt;
        rCat[item.category || 'other_expense'] = (rCat[item.category || 'other_expense'] || 0) + amt;
        if (item.paymentSource === 'direct_member') {
          rDirectOut += amt;
          const p = (item.personName || 'Người quản lý / Thành viên').trim();
          if (!rContrib[p]) {
            rContrib[p] = { fundIn: 0, directPaid: 0, reimbursedAdvance: 0, total: 0 };
          }
          rContrib[p].directPaid += amt;
          rContrib[p].total += amt;
        } else if (item.paymentSource === 'advance_reimbursed') {
          rReimbursedOut += amt;
          rFundOut += amt;
          const p = (item.personName || 'Người quản lý / Thành viên').trim();
          if (!rContrib[p]) {
            rContrib[p] = { fundIn: 0, directPaid: 0, reimbursedAdvance: 0, total: 0 };
          }
          rContrib[p].reimbursedAdvance += amt;
        } else {
          rFundOut += amt;
        }
      }
    }

    return {
      list,
      rIn,
      rOut,
      rFundOut,
      rDirectOut,
      rReimbursedOut,
      rTotalAdvanceHistory: rDirectOut + rReimbursedOut,
      rFundCashRemaining: rIn - rFundOut,
      rNetOverallBalance: rIn - rOut,
      rStage,
      rCat,
      rContribList: Object.entries(rContrib)
        .map(([name, val]) => ({ name, ...val }))
        .sort((a, b) => b.total + b.reimbursedAdvance - (a.total + a.reimbursedAdvance)),
    };
  }, [expenses, reportStageFilter]);

  // ===== HANDLERS MỞ KHÓA & ĐỔI PIN =====
  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('Vui lòng nhập mã PIN Sổ Thu Chi');
      return;
    }
    setIsVerifyingPin(true);
    setPinError('');
    try {
      const ok = await onVerifyPin(pinInput.trim());
      if (ok) {
        setPinInput('');
        onUnlockSuccess();
      } else {
        setPinError('Mã PIN Quản trị viên chưa đúng, vui lòng kiểm tra lại.');
      }
    } catch {
      setPinError('Không thể xác thực lúc này, vui lòng thử lại.');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError('');
    if (!oldPinInput.trim() || !newPinInput.trim()) {
      setChangePinError('Vui lòng nhập đầy đủ mã PIN hiện tại và mã PIN mới.');
      return;
    }
    if (newPinInput.trim().length < 4) {
      setChangePinError('Mã PIN mới cần ít nhất 4 ký tự.');
      return;
    }
    if (newPinInput.trim() !== confirmNewPinInput.trim()) {
      setChangePinError('Mã PIN mới nhập lại chưa khớp.');
      return;
    }

    setIsChangingPin(true);
    try {
      const res = await onChangePin(oldPinInput.trim(), newPinInput.trim());
      if (res.success) {
        setChangePinModalOpen(false);
        setOldPinInput('');
        setNewPinInput('');
        setConfirmNewPinInput('');
        showToast('Đã đổi mã PIN riêng cho Sổ Thu Chi thành công!', 'success');
      } else {
        setChangePinError(res.message || 'Mã PIN hiện tại không đúng.');
      }
    } finally {
      setIsChangingPin(false);
    }
  };

  // ===== HANDLERS FORM THU CHI =====
  const openCreateForm = (type: ExpenseType) => {
    setEditingId(null);
    setFormType(type);
    setFormDate(getVietnamDateStr());
    setFormAmountStr('');
    setFormStage('home_care');
    setFormCategory(type === 'out' ? 'medicine' : 'family_contrib');
    setFormTitle('');
    setFormPaymentSource('fund_or_advance');
    setFormPersonName('');
    setFormNote('');
    setFormReceiptImage('');
    setIsFormOpen(true);
  };

  const openEditForm = (entry: ExpenseEntry) => {
    setEditingId(entry.id);
    setFormType(entry.type);
    setFormDate(entry.date);
    setFormAmountStr(formatNumberInput(entry.amount));
    setFormStage(entry.stage || 'home_care');
    setFormCategory(entry.category);
    setFormTitle(entry.title);
    setFormPaymentSource(entry.paymentSource || 'fund_or_advance');
    setFormPersonName(entry.personName || '');
    setFormNote(entry.note || '');
    setFormReceiptImage(entry.receiptImage || '');
    setIsFormOpen(true);
  };

  const handleSwitchFormType = (nextType: ExpenseType) => {
    setFormType(nextType);
    if (nextType === 'out' && CATEGORY_CONFIG[formCategory]?.type !== 'out') {
      setFormCategory('medicine');
    } else if (nextType === 'in' && CATEGORY_CONFIG[formCategory]?.type !== 'in') {
      setFormCategory('family_contrib');
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressReceiptImage(file);
      setFormReceiptImage(compressed);
      showToast('Đã đính kèm ảnh hóa đơn / biên lai', 'info');
    } catch {
      showToast('Không thể đọc file ảnh này', 'warn');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawAmount = Number(formAmountStr.replace(/\D/g, ''));
    if (!rawAmount || rawAmount <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0', 'warn');
      return;
    }
    if (!formTitle.trim()) {
      showToast('Vui lòng nhập nội dung khoản thu/chi', 'warn');
      return;
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const entry: ExpenseEntry = {
        id: editingId || `exp-${Date.now()}`,
        date: formDate || getVietnamDateStr(),
        type: formType,
        amount: rawAmount,
        stage: formStage,
        category: formCategory,
        title: formTitle.trim(),
        personName: formPersonName.trim() || undefined,
        paymentSource: formType === 'out' ? formPaymentSource : undefined,
        note: formNote.trim() || undefined,
        receiptImage: formReceiptImage || undefined,
        createdAt: editingId
          ? expenses.find((x) => x.id === editingId)?.createdAt || nowIso
          : nowIso,
        updatedAt: nowIso,
      };

      await onSaveExpense(entry);
      setIsFormOpen(false);
      showToast(
        editingId ? 'Đã cập nhật khoản thu chi!' : 'Đã ghi vào Sổ Thu Chi!',
        'success'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ===== CHUYỂN TRẠNG THÁI HOÀN ỨNG 1 CHẠM (GIỮ NGUYÊN LỊCH SỬ ĐÃ ỨNG) =====
  const handleToggleAdvanceReimbursed = async (item: ExpenseEntry) => {
    if (item.type !== 'out') return;
    const nextSource: PaymentSource =
      item.paymentSource === 'direct_member' ? 'advance_reimbursed' : 'direct_member';
    setTogglingReimburseId(item.id);
    try {
      const updated: ExpenseEntry = {
        ...item,
        paymentSource: nextSource,
        updatedAt: new Date().toISOString(),
      };
      await onSaveExpense(updated);
      showToast(
        nextSource === 'advance_reimbursed'
          ? `Đã đánh dấu "${item.title}" là Đã rút Quỹ hoàn lại! (Vẫn lưu trong lịch sử ứng)`
          : `Đã chuyển "${item.title}" về trạng thái Chưa rút Quỹ hoàn lại.`,
        'success'
      );
    } finally {
      setTogglingReimburseId(null);
    }
  };

  // ===== HANDLERS XUẤT BÁO CÁO ZALO / PNG / PDF =====
  const buildZaloReportText = (): string => {
    const todayVN = formatDateVN(getVietnamDateStr());
    const lines: string[] = [];
    lines.push(`📋 TỔNG HỢP THU CHI ĐIỀU TRỊ CỦA BỐ (${patientName.toUpperCase()})`);
    lines.push(`📅 Cập nhật đến ngày: ${todayVN}`);
    if (reportStageFilter !== 'all') {
      lines.push(`📌 Phạm vi: ${STAGE_CONFIG[reportStageFilter].label}`);
    }
    lines.push(`────────────────────`);

    if (reportIncludeSummary) {
      lines.push(`1️⃣ TỔNG HỢP CÂN ĐỐI 4 CHỈ SỐ:`);
      lines.push(`• Tổng thu vào quỹ: +${formatVND(reportData.rIn)}`);
      lines.push(`• Tổng chi điều trị: -${formatVND(reportData.rOut)}`);
      if (reportData.rTotalAdvanceHistory > 0) {
        lines.push(
          `  (Tổng lịch sử ứng trước: ${formatVND(reportData.rTotalAdvanceHistory)} → Đã rút Quỹ hoàn lại: ${formatVND(reportData.rReimbursedOut)} | Còn đang ứng chưa rút: ${formatVND(reportData.rDirectOut)})`
        );
      }
      lines.push(
        `• Tiền Quỹ còn giữ (Thu − Đã xuất khỏi Quỹ): ${
          reportData.rFundCashRemaining >= 0
            ? `+${formatVND(reportData.rFundCashRemaining)}`
            : `-${formatVND(Math.abs(reportData.rFundCashRemaining))}`
        }`
      );
      if (reportData.rNetOverallBalance >= 0) {
        lines.push(`• Cân đối thực tế (Sau khi trừ mọi khoản chi & ứng): +${formatVND(reportData.rNetOverallBalance)}`);
      } else {
        lines.push(
          `• Cân đối thực tế (Tổng Thu − Tổng Chi): -${formatVND(Math.abs(reportData.rNetOverallBalance))} (Đang chi vượt thu)`
        );
      }
      lines.push(`────────────────────`);
    }

    if (reportIncludeStageAndCat && reportData.rOut > 0) {
      lines.push(`2️⃣ CHI PHÍ THEO GIAI ĐOẠN & DANH MỤC:`);
      (Object.keys(STAGE_CONFIG) as ExpenseStage[]).forEach((stg) => {
        const val = reportData.rStage[stg] || 0;
        if (val > 0) {
          lines.push(`• ${STAGE_CONFIG[stg].icon} ${STAGE_CONFIG[stg].shortLabel}: ${formatVND(val)}`);
        }
      });
      lines.push(`--- Theo nhóm chi phí ---`);
      (Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).forEach((cat) => {
        const val = reportData.rCat[cat] || 0;
        if (val > 0 && CATEGORY_CONFIG[cat].type === 'out') {
          lines.push(`  - ${CATEGORY_CONFIG[cat].icon} ${CATEGORY_CONFIG[cat].label}: ${formatVND(val)}`);
        }
      });
      lines.push(`────────────────────`);
    }

    if (reportIncludeContributors && reportData.rContribList.length > 0) {
      lines.push(`3️⃣ GHI NHẬN ĐÓNG GÓP QUỸ & THEO DÕI TIỀN ỨNG:`);
      reportData.rContribList.forEach((c) => {
        const parts: string[] = [];
        if (c.fundIn > 0) parts.push(`Gửi quỹ: ${formatVND(c.fundIn)}`);
        if (c.directPaid > 0) parts.push(`Đang ứng chưa rút: ${formatVND(c.directPaid)}`);
        if (c.reimbursedAdvance > 0) parts.push(`Đã ứng & đã hoàn từ quỹ: ${formatVND(c.reimbursedAdvance)}`);
        lines.push(`• ${c.name}: ${parts.join(' | ')}`);
      });
      lines.push(`────────────────────`);
    }

    if (reportIncludeDetails && reportData.list.length > 0) {
      lines.push(`4️⃣ CHI TIẾT CÁC KHOẢN THU / CHI (${reportData.list.length} khoản):`);
      reportData.list.slice(0, 50).forEach((item) => {
        const sign = item.type === 'in' ? '[+THU]' : '[-CHI]';
        const who = item.personName ? ` (${item.personName})` : '';
        const advNote =
          item.type === 'out' && item.paymentSource === 'direct_member'
            ? ' [Đang ứng - Chưa rút Quỹ]'
            : item.type === 'out' && item.paymentSource === 'advance_reimbursed'
              ? ' [Từng ứng - Đã hoàn từ Quỹ]'
              : '';
        lines.push(`• ${formatDateVN(item.date)} ${sign} ${item.title}: ${formatVND(item.amount)}${who}${advNote}`);
      });
      if (reportData.list.length > 50) {
        lines.push(`... và ${reportData.list.length - 50} khoản khác trong sổ.`);
      }
      lines.push(`────────────────────`);
    }

    lines.push(`💡 Số liệu được ghi chép tại Sổ Sức Khỏe Bố để gia đình tiện theo dõi & đối chiếu.`);
    return lines.join('\n');
  };

  const handleCopyZaloReport = async () => {
    try {
      await navigator.clipboard.writeText(buildZaloReportText());
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

  // =========================================================
  // MÀN HÌNH 1: KHI SỔ THU CHI ĐANG KHÓA (YÊU CẦU MÃ PIN RIÊNG)
  // =========================================================
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-6 sm:my-10 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto mb-4 text-teal-700">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 text-center">
          Sổ Theo Dõi Thu Chi Điều Trị
        </h2>
        <p className="text-sm text-slate-600 text-center mt-2 leading-relaxed">
          Đây là sổ ghi chép nội bộ các khoản viện phí, thuốc men và đóng góp trong quá trình điều trị của Bố.
          Sổ sử dụng <strong>mã PIN riêng biệt</strong> để tránh hiển thị công khai gây lo lắng cho người bệnh.
        </p>

        <form onSubmit={handleUnlockSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nhập mã PIN Sổ Thu Chi
            </label>
            <div className="relative">
              <input
                type={showPinText ? 'text' : 'password'}
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="Nhập mã PIN riêng của sổ..."
                autoFocus
                className="w-full px-4 py-3.5 pr-11 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-base font-bold text-slate-900 tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <button
                type="button"
                onClick={() => setShowPinText(!showPinText)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pinError && (
              <p className="text-xs font-bold text-rose-600 mt-1.5">{pinError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isVerifyingPin}
            className="w-full py-3.5 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>{isVerifyingPin ? 'Đang kiểm tra...' : 'Mở Sổ Thu Chi'}</span>
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-center space-y-3">
          <p className="text-xs text-slate-500">
            🔒 Khu vực dành riêng cho <strong>Quản trị viên (Admin)</strong>. Mở khóa tại đây cũng sẽ cấp toàn quyền quản trị hệ thống & xem cấu hình <code className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-700">Code.gs</code>.
          </p>
          {onBackToHealth && (
            <button
              type="button"
              onClick={onBackToHealth}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <span>← Quay lại Sổ Sức Khỏe</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // =========================================================
  // MÀN HÌNH 2: GIAO DIỆN QUẢN LÝ SỔ THU CHI (ĐÃ MỞ KHÓA)
  // =========================================================
  const availableCategories = (Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).filter(
    (k) => CATEGORY_CONFIG[k].type === formType
  );

  return (
    <div className="space-y-5 pb-8">
      {/* THANH TIÊU ĐỀ & CÔNG CỤ NHANH */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                <Wallet className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Sổ Theo Dõi Thu Chi Điều Trị
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Ghi chép minh bạch các khoản thu chi từ ngày đầu cấp cứu để tiện nhớ & đối chiếu khi cần
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onBackToHealth && (
              <button
                type="button"
                onClick={onBackToHealth}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
                title="Quay lại giao diện Sổ Sức Khỏe chính"
              >
                <span>← Sổ Sức Khỏe</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold shadow-2xs transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Tổng hợp & Báo cáo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setChangePinError('');
                setChangePinModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition cursor-pointer"
              title="Khóa sổ lại ngay và quay về màn hình sức khỏe"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Khóa & Đóng sổ</span>
            </button>
          </div>
        </div>

        {/* 2 NÚT THAO TÁC GHI NHANH TRÊN ĐẦU */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => openCreateForm('out')}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-2xs transition cursor-pointer"
          >
            <Minus className="w-4 h-4 shrink-0" />
            <span>Ghi Khoản Chi Điều Trị</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateForm('in')}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Ghi Khoản Thu Vào Quỹ</span>
          </button>
        </div>
      </div>

      {/* 4 THẺ CÂN ĐỐI TÀI CHÍNH MINH BẠCH (BẤM ICON (i) ĐỂ XEM GIẢI THÍCH NHẸ NHÀNG TỪNG THẺ) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Ô 1: Tổng Thu Vào Quỹ */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-2xs transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                1. Tổng Thu Vào Quỹ
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 1 ? null : 1)}
                className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                  activeCardInfo === 1
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title="Bấm để xem giải thích cách tính"
                aria-label="Xem giải thích cách tính Ô 1"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0 ml-1">
              <ArrowDownCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-1.5">
            +{formatVND(stats.totalIn)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gia đình gửi quỹ, BHYT & hỗ trợ ({stats.inCount} khoản)
          </p>

          {activeCardInfo === 1 && (
            <div className="mt-2.5 pt-2 border-t border-emerald-100 text-[11px] text-emerald-950 bg-emerald-50/70 p-2.5 rounded-xl leading-relaxed">
              💡 <strong>Cách tính:</strong> Tổng tiền mặt/chuyển khoản các thành viên đã gửi vào Quỹ chung + tiền BHYT, hỗ trợ nhận về.
            </div>
          )}
        </div>

        {/* Ô 2: Tổng Đã Chi Điều Trị */}
        <div className="bg-white rounded-2xl border border-rose-200 p-4 shadow-2xs transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                2. Tổng Chi Điều Trị
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 2 ? null : 2)}
                className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                  activeCardInfo === 2
                    ? 'bg-rose-100 text-rose-800'
                    : 'text-slate-400 hover:text-rose-700 hover:bg-rose-50'
                }`}
                title="Bấm để xem giải thích cách tính"
                aria-label="Xem giải thích cách tính Ô 2"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700 shrink-0 ml-1">
              <ArrowUpCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-1.5">
            -{formatVND(stats.totalOut)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {stats.totalAdvanceHistory > 0
              ? `Chi thẳng quỹ: ${formatVND(stats.directFundOut)} • Qua ứng trước: ${formatVND(stats.totalAdvanceHistory)}`
              : `Viện phí, thuốc men, thiết bị (${stats.outCount} khoản)`}
          </p>

          {activeCardInfo === 2 && (
            <div className="mt-2.5 pt-2 border-t border-rose-100 text-[11px] text-rose-950 bg-rose-50/70 p-2.5 rounded-xl leading-relaxed">
              💡 <strong>Cách tính:</strong> Toàn bộ chi phí lo cho Bố = <strong>Chi thẳng từ Quỹ</strong> ({formatVND(stats.directFundOut)}) + <strong>Các khoản cá nhân ứng trước</strong> ({formatVND(stats.totalAdvanceHistory)}, trong đó đã hoàn từ Quỹ {formatVND(stats.advanceReimbursedOut)} &amp; chưa hoàn {formatVND(stats.advancePendingOut)}).
            </div>
          )}
        </div>

        {/* Ô 3: Tiền Quỹ Còn Giữ (Tổng Thu - Đã xuất khỏi Quỹ) */}
        <div
          className={`bg-white rounded-2xl border p-4 shadow-2xs transition ${
            stats.fundCashRemaining >= 0 ? 'border-teal-200' : 'border-amber-300 bg-amber-50/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider truncate">
                3. Tiền Quỹ Còn Giữ
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 3 ? null : 3)}
                className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                  activeCardInfo === 3
                    ? 'bg-teal-100 text-teal-800'
                    : 'text-slate-400 hover:text-teal-700 hover:bg-teal-50'
                }`}
                title="Bấm để xem giải thích cách tính"
                aria-label="Xem giải thích cách tính Ô 3"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span
              className={`p-1.5 rounded-lg shrink-0 ml-1 ${
                stats.fundCashRemaining >= 0
                  ? 'bg-teal-50 text-teal-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-extrabold mt-1.5 ${
              stats.fundCashRemaining >= 0 ? 'text-teal-700' : 'text-amber-800'
            }`}
          >
            {stats.fundCashRemaining >= 0
              ? `+${formatVND(stats.fundCashRemaining)}`
              : `-${formatVND(Math.abs(stats.fundCashRemaining))}`}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {stats.advancePendingOut > 0
              ? `Còn trong két Quỹ (chưa trả ${formatVND(stats.advancePendingOut)} tiền đang ứng)`
              : stats.advanceReimbursedOut > 0
                ? `Đã trừ cả ${formatVND(stats.advanceReimbursedOut)} hoàn ứng từ Quỹ`
                : `Thu vào quỹ (${formatVND(stats.totalIn)}) − Đã chi từ quỹ (${formatVND(stats.fundOut)})`}
          </p>

          {activeCardInfo === 3 && (
            <div className="mt-2.5 pt-2 border-t border-teal-100 text-[11px] text-teal-950 bg-teal-50/70 p-2.5 rounded-xl leading-relaxed">
              💡 <strong>Cách tính:</strong> Ô 1 ({formatVND(stats.totalIn)}) − Chi thẳng từ Quỹ ({formatVND(stats.directFundOut)}) − Khoản ứng đã rút Quỹ hoàn lại ({formatVND(stats.advanceReimbursedOut)}). Khi bạn bấm <strong>&quot;Đã rút Quỹ hoàn lại&quot;</strong> ở bảng Tiền Ứng bên dưới, số tiền Quỹ còn giữ này sẽ tự động trừ đi tương ứng.
            </div>
          )}
        </div>

        {/* Ô 4: Cân Đối Thực Tế (Sau khi trừ cả khoản ứng trả riêng = Tổng Thu - Tổng Chi) */}
        <div
          className={`bg-white rounded-2xl border p-4 shadow-2xs transition ${
            stats.netOverallBalance >= 0 ? 'border-teal-200' : 'border-amber-300 bg-amber-50/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider truncate">
                4. Cân Đối Thực Tế
              </span>
              <button
                type="button"
                onClick={() => setActiveCardInfo(activeCardInfo === 4 ? null : 4)}
                className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                  activeCardInfo === 4
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-slate-400 hover:text-amber-800 hover:bg-amber-50'
                }`}
                title="Bấm để xem giải thích cách tính"
                aria-label="Xem giải thích cách tính Ô 4"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <span
              className={`p-1.5 rounded-lg shrink-0 ml-1 ${
                stats.netOverallBalance >= 0
                  ? 'bg-teal-50 text-teal-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Scale className="w-4 h-4" />
            </span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-extrabold mt-1.5 ${
              stats.netOverallBalance >= 0 ? 'text-teal-700' : 'text-amber-800'
            }`}
          >
            {stats.netOverallBalance >= 0
              ? `+${formatVND(stats.netOverallBalance)}`
              : `-${formatVND(Math.abs(stats.netOverallBalance))}`}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {stats.netOverallBalance >= 0
              ? 'Số dư thực tế sau khi trừ mọi khoản chi & hoàn ứng'
              : stats.advancePendingOut > 0 && stats.fundCashRemaining > 0
                ? `Lấy hết Quỹ (${formatVND(stats.fundCashRemaining)}) trả tiền ứng (${formatVND(stats.advancePendingOut)}) vẫn thiếu ${formatVND(Math.abs(stats.netOverallBalance))}`
                : `Tổng chi vượt tổng thu ${formatVND(Math.abs(stats.netOverallBalance))} (Cần bổ sung quỹ)`}
          </p>

          {activeCardInfo === 4 && (
            <div className="mt-2.5 pt-2 border-t border-amber-200 text-[11px] text-amber-950 bg-amber-50/70 p-2.5 rounded-xl leading-relaxed">
              💡 <strong>Cách tính:</strong> Ô 1 (Tổng thu) − Ô 2 (Tổng chi) = Ô 3 (Tiền Quỹ còn giữ) − Khoản đang ứng chưa hoàn ({formatVND(stats.advancePendingOut)}).
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* BẢNG CHUYÊN BIỆT: SỔ THEO DÕI TIỀN ỨNG TRƯỚC & HOÀN ỨNG */}
      {/* ========================================================= */}
      {stats.advanceItems.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanceTracker(!showAdvanceTracker)}
            className="w-full px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-teal-50/50 hover:from-blue-100/80 transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-left">
              <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-extrabold shrink-0">
                💳
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm sm:text-base font-extrabold text-slate-900">
                    Sổ Theo Dõi Tiền Cá Nhân Ứng Trước &amp; Hoàn Trả Từ Quỹ
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-extrabold">
                    {stats.advanceItems.length} khoản đã ứng
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Bấm 1 chạm để đánh dấu khoản ứng nào <strong>đã rút Quỹ hoàn lại</strong> mà vẫn giữ nguyên lịch sử đã ứng
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {stats.advancePendingOut > 0 ? (
                <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold">
                  ⏳ Chưa hoàn: {formatVND(stats.advancePendingOut)}
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-extrabold">
                  ✅ Đã hoàn trả đủ 100%
                </span>
              )}
              {showAdvanceTracker ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </div>
          </button>

          {showAdvanceTracker && (
            <div className="p-4 sm:p-5 space-y-4 border-t border-blue-100">
              {/* 3 Ô TÓM TẮT LỊCH SỬ TIỀN ỨNG */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">
                    1. Tổng Đã Ứng Ra (Lịch sử ứng)
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                    {formatVND(stats.totalAdvanceHistory)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Tổng cộng {stats.advanceItems.length} khoản cá nhân đã bỏ tiền túi ứng trước
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200">
                  <div className="text-[11px] font-bold text-teal-800 uppercase">
                    2. Đã Rút Quỹ Hoàn Lại
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-teal-700 mt-1">
                    {formatVND(stats.advanceReimbursedOut)}
                  </div>
                  <div className="text-[11px] text-teal-800/80 mt-0.5">
                    Đã trừ trực tiếp vào Ô 3 (Tiền Quỹ Còn Giữ)
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border ${
                    stats.advancePendingOut > 0
                      ? 'bg-amber-50/80 border-amber-300'
                      : 'bg-emerald-50/70 border-emerald-200'
                  }`}
                >
                  <div
                    className={`text-[11px] font-bold uppercase ${
                      stats.advancePendingOut > 0 ? 'text-amber-900' : 'text-emerald-800'
                    }`}
                  >
                    3. Còn Đang Ứng (Chưa rút Quỹ)
                  </div>
                  <div
                    className={`text-lg sm:text-xl font-extrabold mt-1 ${
                      stats.advancePendingOut > 0 ? 'text-amber-800' : 'text-emerald-700'
                    }`}
                  >
                    {formatVND(stats.advancePendingOut)}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {stats.advancePendingOut > 0
                      ? 'Số tiền Quỹ còn cần hoàn trả lại cho người ứng'
                      : 'Tất cả khoản ứng đã được hoàn trả từ Quỹ'}
                  </div>
                </div>
              </div>

              {/* HỘP DIỄN GIẢI TỰ ĐỘNG SO SÁNH VỚI TIỀN QUỸ HIỆN CÓ */}
              <div className="px-3.5 py-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-slate-700 leading-relaxed">
                {stats.advancePendingOut === 0 ? (
                  <span>
                    ✅ <strong>Đã tất toán tiền ứng:</strong> Toàn bộ{' '}
                    <strong>{formatVND(stats.totalAdvanceHistory)}</strong> tiền cá nhân ứng trước đều đã được đánh dấu{' '}
                    <strong>Đã rút Quỹ hoàn lại</strong>. Lịch sử từng khoản ứng vẫn được lưu giữ nguyên vẹn bên dưới để đối chiếu bất cứ lúc nào.
                  </span>
                ) : stats.fundCashRemaining >= stats.advancePendingOut ? (
                  <span>
                    💡 <strong>Đối chiếu với Quỹ hiện tại:</strong> Tiền mặt trong Quỹ hiện còn{' '}
                    <strong className="text-teal-700">+{formatVND(stats.fundCashRemaining)}</strong>,{' '}
                    <strong>đủ để hoàn trả toàn bộ {formatVND(stats.advancePendingOut)}</strong> tiền đang ứng (sau khi hoàn trả hết, Quỹ vẫn còn dư{' '}
                    <strong className="text-teal-700">
                      +{formatVND(stats.fundCashRemaining - stats.advancePendingOut)}
                    </strong>
                    ). Khi lấy tiền Quỹ hoàn lại khoản nào, bạn bấm nút{' '}
                    <strong>&quot;✅ Đánh dấu: Đã rút Quỹ hoàn lại&quot;</strong> ở dòng đó.
                  </span>
                ) : stats.fundCashRemaining > 0 ? (
                  <span>
                    💡 <strong>Đối chiếu với Quỹ hiện tại:</strong> Tiền đang ứng chờ hoàn trả là{' '}
                    <strong className="text-amber-800">{formatVND(stats.advancePendingOut)}</strong>, trong khi tiền mặt Quỹ đang giữ ở Ô 3 là{' '}
                    <strong className="text-teal-700">+{formatVND(stats.fundCashRemaining)}</strong>. Bạn có thể bấm{' '}
                    <strong>&quot;✅ Đánh dấu: Đã rút Quỹ hoàn lại&quot;</strong> cho các khoản ứng đã lấy lại từ Quỹ trước; nếu dùng hết toàn bộ{' '}
                    {formatVND(stats.fundCashRemaining)} trong Quỹ để trả bớt tiền ứng thì Quỹ vẫn còn thiếu{' '}
                    <strong className="text-rose-700">
                      {formatVND(stats.advancePendingOut - stats.fundCashRemaining)}
                    </strong>{' '}
                    (đúng bằng Ô 4 Cân đối thực tế).
                  </span>
                ) : (
                  <span>
                    💡 <strong>Đối chiếu với Quỹ hiện tại:</strong> Quỹ hiện không còn tiền mặt dư để hoàn ứng ngay. Khi có thêm khoản thu mới vào Quỹ và rút trả lại cho người ứng, bạn bấm{' '}
                    <strong>&quot;✅ Đánh dấu: Đã rút Quỹ hoàn lại&quot;</strong> ở từng khoản bên dưới.
                  </span>
                )}
              </div>

              {/* TÓM TẮT THEO TỪNG NGƯỜI ĐÃ ỨNG */}
              {stats.advancerList.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {stats.advancerList.map((adv) => (
                    <div
                      key={adv.name}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{adv.name}</span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            ({adv.count} khoản)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Tổng đã ứng: <strong>{formatVND(adv.totalAdvanced)}</strong> • Đã hoàn:{' '}
                          <strong className="text-teal-700">{formatVND(adv.reimbursed)}</strong>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-bold uppercase text-slate-500">
                          Còn chưa hoàn
                        </div>
                        <div
                          className={`text-xs sm:text-sm font-extrabold ${
                            adv.pending > 0 ? 'text-amber-800' : 'text-emerald-700'
                          }`}
                        >
                          {adv.pending > 0 ? formatVND(adv.pending) : '0 đ (Đã hoàn đủ)'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* DANH SÁCH TỪNG KHOẢN ỨNG + NÚT 1 CHẠM ĐÁNH DẤU HOÀN ỨNG */}
              <div className="space-y-2">
                <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                  Chi tiết từng khoản đã ứng ({stats.advanceItems.length} khoản):
                </div>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
                  {stats.advanceItems.map((item) => {
                    const isReimbursed = item.paymentSource === 'advance_reimbursed';
                    const isBusy = togglingReimburseId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                          isReimbursed ? 'bg-teal-50/30' : 'bg-white hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {formatDateVN(item.date)}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              👤 Người ứng: {item.personName || 'Thành viên'}
                            </span>
                            {isReimbursed ? (
                              <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 border border-teal-300 text-[11px] font-extrabold">
                                ✅ Đã rút Quỹ hoàn lại
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-extrabold">
                                ⏳ Chưa rút Quỹ hoàn lại
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-extrabold text-slate-900 mt-1">
                            {item.title}
                            {item.note && (
                              <span className="text-xs font-normal text-slate-500 ml-1.5">
                                ({item.note})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                          <span
                            className={`text-sm sm:text-base font-extrabold ${
                              isReimbursed ? 'text-teal-700' : 'text-amber-800'
                            }`}
                          >
                            {formatVND(item.amount)}
                          </span>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleAdvanceReimbursed(item)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer disabled:opacity-50 ${
                              isReimbursed
                                ? 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200'
                                : 'bg-teal-700 hover:bg-teal-800 text-white shadow-2xs'
                            }`}
                          >
                            {isBusy
                              ? 'Đang lưu...'
                              : isReimbursed
                                ? '↩️ Chuyển lại: Chưa hoàn'
                                : '✅ Đánh dấu: Đã rút Quỹ hoàn lại'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BẢNG PHÂN BỔ THEO GIAI ĐOẠN & NGUỒN ĐÓNG GÓP (ĐÓNG/MỞ GỌN GÀNG) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/70 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-700" />
            <span className="text-sm font-extrabold text-slate-800">
              Tổng hợp theo Giai đoạn, Nhóm chi phí &amp; Nguồn thu
            </span>
          </div>
          {showBreakdown ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showBreakdown && (
          <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5 border-t border-slate-100">
            {/* Cột 1: Chi phí theo giai đoạn & nhóm danh mục */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2.5">
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
                            <span className="text-slate-400 font-normal">({pct}%)</span>
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
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
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
                    <p className="text-xs text-slate-400 italic col-span-2">
                      Chưa có khoản chi nào được ghi nhận.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Cột 2: Tổng hợp các khoản thu & ứng trả trực tiếp */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1 mb-2.5">
                <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Ghi nhận đóng góp Quỹ &amp; Theo dõi tiền ứng theo người
                </h3>
                {(stats.totalIn > 0 || stats.directMemberOut > 0) && (
                  <span className="text-[11px] font-bold text-slate-500">
                    Thu quỹ + Đang ứng: {formatVND(stats.totalIn + stats.directMemberOut)}
                  </span>
                )}
              </div>
              {stats.contributorList.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
                  Chưa có khoản thu quỹ hoặc ứng trả trực tiếp nào.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {stats.contributorList.map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200/70"
                    >
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-extrabold text-slate-800 truncate">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-600 space-x-1">
                          {c.fundIn > 0 && (
                            <span>Gửi vào quỹ: {formatVND(c.fundIn)}</span>
                          )}
                          {c.totalAdvanceHistory > 0 && (
                            <span>
                              {c.fundIn > 0 ? '• ' : ''}
                              Đã ứng tổng: {formatVND(c.totalAdvanceHistory)} (Đã hoàn:{' '}
                              {formatVND(c.reimbursedAdvance)} • Chưa hoàn:{' '}
                              {formatVND(c.directPaid)})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="text-sm font-extrabold text-emerald-700">
                          {formatVND(c.total)}
                        </div>
                        {c.reimbursedAdvance > 0 && c.total === 0 && (
                          <div className="text-[10px] font-bold text-teal-700">
                            Đã hoàn ứng đủ
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BỘ LỌC & DANH SÁCH CHI TIẾT CÁC KHOẢN THU CHI */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-teal-700" />
            <span>Sổ Chi Tiết Các Khoản Thu Chi ({filteredExpenses.length})</span>
          </h3>

          {/* Tổng nhanh theo bộ lọc hiện tại */}
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
          {/* Ô tìm kiếm */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên khoản thu/chi, người gửi, ghi chú..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Lọc Loại (Tất cả / Chi / Thu) */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | ExpenseType)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="all">Tất cả: Thu &amp; Chi</option>
            <option value="out">➖ Chỉ xem Khoản Chi</option>
            <option value="in">➕ Chỉ xem Khoản Thu</option>
          </select>

          {/* Lọc Nguồn tiền / Trạng thái Ứng */}
          <select
            value={filterSource}
            onChange={(e) =>
              setFilterSource(
                e.target.value as
                  | 'all'
                  | 'fund_direct'
                  | 'advance_all'
                  | 'advance_pending'
                  | 'advance_reimbursed'
              )
            }
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="all">Mọi nguồn tiền</option>
            <option value="advance_all">💳 Toàn bộ lịch sử đã ứng</option>
            <option value="advance_pending">⏳ Đang ứng (Chưa rút Quỹ)</option>
            <option value="advance_reimbursed">✅ Từng ứng (Đã hoàn từ Quỹ)</option>
            <option value="fund_direct">💼 Chi thẳng từ Quỹ</option>
          </select>

          {/* Lọc Giai đoạn */}
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value as 'all' | ExpenseStage)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="all">Mọi giai đoạn</option>
            <option value="emergency">🚑 Cấp cứu &amp; Nằm viện</option>
            <option value="rehab_hospital">🏥 Tái khám &amp; Phục hồi</option>
            <option value="home_care">🏠 Chăm sóc tại nhà</option>
          </select>

          {/* Lọc Danh mục */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as 'all' | ExpenseCategory)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
          >
            <option value="all">Mọi danh mục</option>
            {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo khoảng ngày (Từ ngày - Đến ngày) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-500">Khoảng ngày:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
          />
          <span className="text-xs text-slate-400">đến</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
          />
          {(filterType !== 'all' ||
            filterSource !== 'all' ||
            filterStage !== 'all' ||
            filterCategory !== 'all' ||
            searchQuery ||
            dateFrom ||
            dateTo) && (
            <button
              type="button"
              onClick={() => {
                setFilterType('all');
                setFilterSource('all');
                setFilterStage('all');
                setFilterCategory('all');
                setSearchQuery('');
                setDateFrom('');
                setDateTo('');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Danh sách các khoản Thu / Chi */}
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
            <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">
              Chưa có khoản thu/chi nào trong danh sách
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Bạn có thể bấm nút <strong>&quot;Ghi Khoản Chi Điều Trị&quot;</strong> hoặc <strong>&quot;Ghi Khoản Thu Vào Quỹ&quot;</strong> ở trên (hỗ trợ chọn lùi ngày về những ngày đầu cấp cứu).
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredExpenses.map((item) => {
              const catInfo = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other_expense;
              const stgInfo = STAGE_CONFIG[item.stage || 'home_care'];
              const isOut = item.type === 'out';
              const isPendingAdvance = isOut && item.paymentSource === 'direct_member';
              const isReimbursedAdvance = isOut && item.paymentSource === 'advance_reimbursed';
              const isToggling = togglingReimburseId === item.id;

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
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${catInfo.badgeClass}`}
                        >
                          {catInfo.label}
                        </span>
                        {isOut && stgInfo && (
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${stgInfo.badgeClass}`}
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
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {isOut
                              ? isPendingAdvance || isReimbursedAdvance
                                ? `Người ứng trước: ${item.personName}`
                                : `Người thanh toán: ${item.personName}`
                              : `Người gửi / Nguồn thu: ${item.personName}`}
                          </span>
                        )}
                        {isPendingAdvance && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-extrabold">
                            ⏳ Đang ứng (Chưa rút từ Quỹ)
                          </span>
                        )}
                        {isReimbursedAdvance && (
                          <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-900 border border-teal-300 text-[11px] font-extrabold">
                            ✅ Từng ứng (Đã rút Quỹ hoàn lại)
                          </span>
                        )}
                        {(isPendingAdvance || isReimbursedAdvance) && (
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleAdvanceReimbursed(item)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold border transition cursor-pointer disabled:opacity-50 ${
                              isPendingAdvance
                                ? 'bg-teal-700 hover:bg-teal-800 text-white border-teal-700'
                                : 'bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border-slate-200'
                            }`}
                          >
                            {isToggling
                              ? 'Đang lưu...'
                              : isPendingAdvance
                                ? '✅ Bấm đánh dấu: Đã hoàn từ Quỹ'
                                : '↩️ Chuyển lại: Chưa hoàn'}
                          </button>
                        )}
                        {item.note && (
                          <span className="text-slate-500 italic">• {item.note}</span>
                        )}
                      </div>

                      {item.receiptImage && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({ url: item.receiptImage!, title: item.title })
                          }
                          className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Xem ảnh hóa đơn / biên lai</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cụm Phải: Số tiền + Nút Sửa / Xóa */}
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
                        onClick={() => openEditForm(item)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="Chỉnh sửa khoản này"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEntry(item)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                        title="Xóa khoản này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: THÊM / SỬA KHOẢN THU CHI */}
      {/* ========================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">
                {editingId ? 'Chỉnh Sửa Khoản Thu / Chi' : 'Ghi Chép Khoản Thu / Chi Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4">
              {/* Chuyển đổi Khoản Chi / Khoản Thu */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleSwitchFormType('out')}
                  className={`py-2.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    formType === 'out'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                  <span>Khoản Chi Điều Trị</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchFormType('in')}
                  className={`py-2.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    formType === 'in'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Khoản Thu Vào Quỹ</span>
                </button>
              </div>

              {/* Nhập số tiền + Gợi ý nhanh */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Số tiền (VNĐ) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formAmountStr}
                    onChange={(e) => setFormAmountStr(formatNumberInput(e.target.value))}
                    placeholder="VD: 1.500.000"
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-lg font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">
                    VNĐ
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_AMOUNTS.map((qa) => (
                    <button
                      key={qa.value}
                      type="button"
                      onClick={() => setFormAmountStr(formatNumberInput(qa.value))}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ngày phát sinh & Giai đoạn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Ngày phát sinh *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Giai đoạn điều trị
                  </label>
                  <select
                    value={formStage}
                    onChange={(e) => setFormStage(e.target.value as ExpenseStage)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-800"
                  >
                    {(Object.keys(STAGE_CONFIG) as ExpenseStage[]).map((stg) => (
                      <option key={stg} value={stg}>
                        {STAGE_CONFIG[stg].icon} {STAGE_CONFIG[stg].shortLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nhóm danh mục */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  <Tag className="w-3.5 h-3.5 inline mr-1" />
                  Nhóm danh mục *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-800"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nội dung khoản thu/chi + Gợi ý 1 chạm */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nội dung chi tiết *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={
                    formType === 'out'
                      ? 'VD: Đóng tạm ứng viện phí đợt cấp cứu / Mua thuốc huyết áp...'
                      : 'VD: Anh Dũng chuyển vào quỹ chăm sóc bố...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm font-bold text-slate-900"
                />
                {CATEGORY_CONFIG[formCategory]?.suggestions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {CATEGORY_CONFIG[formCategory].suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setFormTitle(sug)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-600 transition cursor-pointer"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Nguồn tiền thanh toán (nếu là Khoản Chi) */}
              {formType === 'out' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nguồn tiền thanh toán &amp; Trạng thái hoàn ứng
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormPaymentSource('fund_or_advance')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        formPaymentSource === 'fund_or_advance'
                          ? 'bg-teal-50 border-teal-500 text-teal-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-extrabold">💼 Lấy trực tiếp từ tiền Quỹ đang giữ</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Trừ thẳng vào số tiền Quỹ hiện có (không qua cá nhân ứng trước)
                      </div>
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormPaymentSource('direct_member')}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          formPaymentSource === 'direct_member'
                            ? 'bg-amber-50 border-amber-500 text-amber-950'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-extrabold">
                          ⏳ Cá nhân ứng trước (Chưa rút Quỹ)
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Bỏ tiền túi trả trước, chờ Quỹ hoàn lại sau
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormPaymentSource('advance_reimbursed')}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          formPaymentSource === 'advance_reimbursed'
                            ? 'bg-teal-50 border-teal-600 text-teal-950'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-extrabold">
                          ✅ Cá nhân ứng trước (Đã hoàn từ Quỹ)
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Vẫn lưu lịch sử ứng nhưng đã rút tiền Quỹ bù lại
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Người gửi vào quỹ / Người thanh toán */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {formType === 'in'
                    ? 'Người gửi vào quỹ / Nguồn đóng góp'
                    : formPaymentSource === 'direct_member' ||
                        formPaymentSource === 'advance_reimbursed'
                      ? 'Người đã bỏ tiền túi ứng trước'
                      : 'Người trực tiếp đi thanh toán (Tùy chọn)'}
                </label>
                <input
                  type="text"
                  value={formPersonName}
                  onChange={(e) => setFormPersonName(e.target.value)}
                  placeholder={
                    formType === 'in'
                      ? 'Chọn bên dưới hoặc nhập tên (VD: Anh Dũng, BHYT...)'
                      : 'Để trống hoặc chọn tên người thanh toán...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm font-semibold text-slate-800"
                />
                {members.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFormPersonName(m.name)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${
                          formPersonName === m.name
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ghi chú & Đính kèm ảnh Hóa đơn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ghi chú thêm (nếu có)
                  </label>
                  <input
                    type="text"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="Số biên lai, tên nhà thuốc, ghi chú..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs sm:text-sm text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ảnh hóa đơn / biên lai
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />
                  {!formReceiptImage ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-teal-700" />
                      <span>Chụp / Chọn ảnh biên lai</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-teal-50 border border-teal-200">
                      <span className="text-xs font-bold text-teal-800 truncate">
                        ✅ Đã đính kèm ảnh
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormReceiptImage('')}
                        className="text-xs font-extrabold text-rose-600 hover:underline ml-2 cursor-pointer"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Nút Lưu / Hủy */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold shadow-sm cursor-pointer"
                >
                  {isSaving ? 'Đang lưu...' : editingId ? 'Lưu cập nhật' : 'Lưu vào Sổ Thu Chi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: TỔNG HỢP & XUẤT BÁO CÁO NHANH (ZALO / PNG / PDF) */}
      {/* ========================================================= */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Tổng Hợp &amp; Xuất Báo Cáo Thu Chi
                </h3>
                <p className="text-xs text-slate-500">
                  Tùy chọn các mục muốn hiển thị trước khi gửi cho gia đình
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bộ tùy chỉnh nội dung hiển thị trên báo cáo */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-700 uppercase">
                  Phạm vi giai đoạn:
                </span>
                <select
                  value={reportStageFilter}
                  onChange={(e) => setReportStageFilter(e.target.value as 'all' | ExpenseStage)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800"
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

            {/* BẢN XEM TRƯỚC BÁO CÁO (DÙNG ĐỂ CHỤP ẢNH / PDF) */}
            <div
              ref={reportCardRef}
              className="bg-white rounded-2xl border-2 border-slate-200 p-5 space-y-4 text-slate-900"
            >
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">
                    Sổ Sức Khỏe &amp; Theo Dõi Điều Trị
                  </div>
                  <h4 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Báo Cáo Tổng Hợp Thu Chi — Bệnh nhân: {patientName}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Ngày tổng hợp: {formatDateVN(getVietnamDateStr())} •{' '}
                    {reportStageFilter === 'all'
                      ? 'Toàn bộ quá trình điều trị'
                      : STAGE_CONFIG[reportStageFilter].label}
                  </p>
                </div>
                <ShieldCheck className="w-8 h-8 text-teal-700 shrink-0" />
              </div>

              {reportIncludeSummary && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase">1. Tổng Thu Vào Quỹ</div>
                      <div className="text-sm sm:text-base font-extrabold text-emerald-700 mt-0.5">
                        +{formatVND(reportData.rIn)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                      <div className="text-[10px] font-bold text-rose-800 uppercase">2. Tổng Chi Điều Trị</div>
                      <div className="text-sm sm:text-base font-extrabold text-rose-700 mt-0.5">
                        -{formatVND(reportData.rOut)}
                      </div>
                      {reportData.rTotalAdvanceHistory > 0 && (
                        <div className="text-[10px] text-rose-700/80 mt-0.5">
                          Lịch sử ứng: {formatVND(reportData.rTotalAdvanceHistory)} (Chưa hoàn: {formatVND(reportData.rDirectOut)})
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200">
                      <div className="text-[10px] font-bold text-teal-900 uppercase">3. Tiền Quỹ Còn Giữ</div>
                      <div className="text-sm sm:text-base font-extrabold text-teal-800 mt-0.5">
                        {reportData.rFundCashRemaining >= 0
                          ? `+${formatVND(reportData.rFundCashRemaining)}`
                          : `-${formatVND(Math.abs(reportData.rFundCashRemaining))}`}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Thu − Đã rút Quỹ</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                      <div className="text-[10px] font-bold text-slate-700 uppercase">
                        4. Cân Đối Thực Tế
                      </div>
                      <div
                        className={`text-sm sm:text-base font-extrabold mt-0.5 ${
                          reportData.rNetOverallBalance >= 0 ? 'text-teal-700' : 'text-amber-800'
                        }`}
                      >
                        {reportData.rNetOverallBalance >= 0
                          ? `+${formatVND(reportData.rNetOverallBalance)}`
                          : `-${formatVND(Math.abs(reportData.rNetOverallBalance))}`}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {reportData.rNetOverallBalance >= 0 ? 'Sau khi trừ khoản ứng' : 'Đang chi vượt tổng thu'}
                      </div>
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
                      .filter((c) => CATEGORY_CONFIG[c].type === 'out' && (reportData.rCat[c] || 0) > 0)
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

              {reportIncludeContributors && reportData.rContribList.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="text-xs font-extrabold text-slate-700 uppercase">
                      Ghi nhận đóng góp Quỹ &amp; Theo dõi tiền ứng
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      Thu quỹ + Đang ứng: {formatVND(reportData.rIn + reportData.rDirectOut)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {reportData.rContribList.map((c) => (
                      <div
                        key={c.name}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50/60 border border-emerald-200"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">{c.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {c.fundIn > 0 && `Gửi quỹ: ${formatVND(c.fundIn)} `}
                            {(c.directPaid > 0 || c.reimbursedAdvance > 0) &&
                              `• Ứng: ${formatVND(c.directPaid + c.reimbursedAdvance)} (Chưa hoàn: ${formatVND(c.directPaid)})`}
                          </div>
                        </div>
                        <span className="font-extrabold text-emerald-700 ml-2 shrink-0">
                          {formatVND(c.total)}
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
                          <span className="font-bold text-slate-500 mr-1.5">
                            {formatDateVN(item.date)}
                          </span>
                          <span className="font-semibold text-slate-800">{item.title}</span>
                          {item.personName && (
                            <span className="text-slate-500 ml-1">({item.personName})</span>
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

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 text-center">
                Số liệu tổng hợp tự động từ Sổ Theo Dõi Thu Chi Điều Trị • Gia đình cùng theo dõi
              </div>
            </div>

            {/* 3 NÚT XUẤT BÁO CÁO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCopyZaloReport}
                className="py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {copiedZalo ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedZalo ? 'Đã Copy!' : 'Copy gửi Zalo'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportReportImage}
                disabled={isExportingImage}
                className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingImage ? 'Đang tạo ảnh...' : 'Tải Ảnh Báo Cáo'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportReportPdf}
                disabled={isExportingPdf}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{isExportingPdf ? 'Đang tạo PDF...' : 'Xuất File PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ĐỔI MÃ PIN RIÊNG CỦA SỔ THU CHI */}
      {/* ========================================================= */}
      {changePinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                🔑 Đổi Mã PIN Sổ Thu Chi
              </h3>
              <button
                type="button"
                onClick={() => setChangePinModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePinSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã PIN Sổ Thu Chi hiện tại
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={oldPinInput}
                  onChange={(e) => setOldPinInput(e.target.value)}
                  placeholder="Nhập PIN hiện tại (mặc định: 2468)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã PIN mới (tối thiểu 4 ký tự)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Nhập mã PIN mới..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xác nhận lại mã PIN mới
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmNewPinInput}
                  onChange={(e) => setConfirmNewPinInput(e.target.value)}
                  placeholder="Nhập lại mã PIN mới..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold"
                />
              </div>

              {changePinError && (
                <p className="text-xs font-bold text-rose-600">{changePinError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangePinModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isChangingPin}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold cursor-pointer"
                >
                  {isChangingPin ? 'Đang lưu...' : 'Lưu mã PIN mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: XEM ẢNH HÓA ĐƠN / BIÊN LAI & XÁC NHẬN XÓA */}
      {/* ========================================================= */}
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
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
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

      {deletingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">
              Xác nhận xóa khoản thu/chi?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Bạn có chắc muốn xóa khoản <strong>&quot;{deletingEntry.title}&quot;</strong> ({formatVND(deletingEntry.amount)}) ngày {formatDateVN(deletingEntry.date)} khỏi sổ không?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deletingEntry.id;
                  setDeletingEntry(null);
                  await onDeleteExpense(id);
                  showToast('Đã xóa khoản thu/chi khỏi sổ.', 'info');
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer"
              >
                Xóa khoản này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
