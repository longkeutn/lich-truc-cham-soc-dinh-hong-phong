import type {
  ExpenseCategory,
  ExpenseEntry,
  ExpenseStage,
  ExpenseType,
} from '@/lib/types';
import { getVietnamDateStr } from '@/lib/config';

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

export const QUICK_AMOUNTS = [
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

export async function compressReceiptImage(file: File): Promise<string> {
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

export interface ExpenseComputedStats {
  totalIn: number;
  totalOut: number;
  netOverallBalance: number;
  inCount: number;
  outCount: number;
  sharedFundOut: number;
  sharedFundCount: number;
  namedPayerOut: number;
  byStage: Record<ExpenseStage, number>;
  byCategory: Partial<Record<ExpenseCategory, number>>;
  inContributorList: { name: string; amount: number; count: number }[];
  outPayerList: { name: string; amount: number; count: number }[];
  allPersonNames: string[];
}

export function computeExpenseStats(expenses: ExpenseEntry[]): ExpenseComputedStats {
  let totalIn = 0;
  let totalOut = 0;
  let inCount = 0;
  let outCount = 0;
  let sharedFundOut = 0;
  let sharedFundCount = 0;
  let namedPayerOut = 0;

  const byStage: Record<ExpenseStage, number> = {
    emergency: 0,
    rehab_hospital: 0,
    home_care: 0,
  };
  const byCategory: Partial<Record<ExpenseCategory, number>> = {};
  const byInContributor: Record<string, { amount: number; count: number }> = {};
  const byOutPayer: Record<string, { amount: number; count: number }> = {};

  for (const item of expenses) {
    const amt = Number(item.amount) || 0;
    if (item.type === 'in') {
      totalIn += amt;
      inCount++;
      const contributor = (item.personName || 'Quỹ gia đình / Khác').trim();
      if (!byInContributor[contributor]) {
        byInContributor[contributor] = { amount: 0, count: 0 };
      }
      byInContributor[contributor].amount += amt;
      byInContributor[contributor].count += 1;
    } else {
      totalOut += amt;
      outCount++;
      const stg = item.stage || 'home_care';
      byStage[stg] = (byStage[stg] || 0) + amt;

      const cat = item.category || 'other_expense';
      byCategory[cat] = (byCategory[cat] || 0) + amt;

      const rawPayer = (item.personName || '').trim();
      if (rawPayer) {
        namedPayerOut += amt;
        if (!byOutPayer[rawPayer]) {
          byOutPayer[rawPayer] = { amount: 0, count: 0 };
        }
        byOutPayer[rawPayer].amount += amt;
        byOutPayer[rawPayer].count += 1;
      } else {
        sharedFundOut += amt;
        sharedFundCount += 1;
      }
    }
  }

  const netOverallBalance = totalIn - totalOut;
  const inContributorList = Object.entries(byInContributor)
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => b.amount - a.amount);

  const outPayerList = Object.entries(byOutPayer)
    .map(([name, val]) => ({ name, ...val }))
    .sort((a, b) => b.amount - a.amount);

  const allPersonNames = Array.from(
    new Set([...Object.keys(byOutPayer), ...Object.keys(byInContributor)])
  );

  return {
    totalIn,
    totalOut,
    netOverallBalance,
    inCount,
    outCount,
    sharedFundOut,
    sharedFundCount,
    namedPayerOut,
    byStage,
    byCategory,
    inContributorList,
    outPayerList,
    allPersonNames,
  };
}

export interface ExpenseReportData {
  list: ExpenseEntry[];
  rIn: number;
  rOut: number;
  rNetOverallBalance: number;
  rStage: Record<ExpenseStage, number>;
  rCat: Partial<Record<ExpenseCategory, number>>;
  rInList: { name: string; amount: number }[];
  rOutPayerList: { name: string; amount: number; count: number }[];
}

export function computeReportData(
  expenses: ExpenseEntry[],
  reportStageFilter: 'all' | ExpenseStage
): ExpenseReportData {
  const list =
    reportStageFilter === 'all'
      ? expenses
      : expenses.filter((e) => e.stage === reportStageFilter);

  let rIn = 0;
  let rOut = 0;
  const rStage: Record<ExpenseStage, number> = {
    emergency: 0,
    rehab_hospital: 0,
    home_care: 0,
  };
  const rCat: Partial<Record<ExpenseCategory, number>> = {};
  const rInByPerson: Record<string, number> = {};
  const rOutByPerson: Record<string, { amount: number; count: number }> = {};

  for (const item of list) {
    const amt = Number(item.amount) || 0;
    if (item.type === 'in') {
      rIn += amt;
      const p = (item.personName || 'Quỹ gia đình').trim();
      rInByPerson[p] = (rInByPerson[p] || 0) + amt;
    } else {
      rOut += amt;
      rStage[item.stage || 'home_care'] += amt;
      rCat[item.category || 'other_expense'] = (rCat[item.category || 'other_expense'] || 0) + amt;
      const payer = (item.personName || '').trim();
      if (payer) {
        if (!rOutByPerson[payer]) rOutByPerson[payer] = { amount: 0, count: 0 };
        rOutByPerson[payer].amount += amt;
        rOutByPerson[payer].count += 1;
      }
    }
  }

  return {
    list,
    rIn,
    rOut,
    rNetOverallBalance: rIn - rOut,
    rStage,
    rCat,
    rInList: Object.entries(rInByPerson)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
    rOutPayerList: Object.entries(rOutByPerson)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export function buildZaloReportText(opts: {
  patientName: string;
  reportStageFilter: 'all' | ExpenseStage;
  reportData: ExpenseReportData;
  reportIncludeSummary: boolean;
  reportIncludeStageAndCat: boolean;
  reportIncludeContributors: boolean;
  reportIncludeDetails: boolean;
}): string {
  const {
    patientName,
    reportStageFilter,
    reportData,
    reportIncludeSummary,
    reportIncludeStageAndCat,
    reportIncludeContributors,
    reportIncludeDetails,
  } = opts;
  const todayVN = formatDateVN(getVietnamDateStr());
  const lines: string[] = [];
  lines.push(`📋 TỔNG HỢP THU CHI ĐIỀU TRỊ CỦA BỐ (${patientName.toUpperCase()})`);
  lines.push(`📅 Cập nhật đến ngày: ${todayVN}`);
  if (reportStageFilter !== 'all') {
    lines.push(`📌 Phạm vi: ${STAGE_CONFIG[reportStageFilter].label}`);
  }
  lines.push('--------------------');

  if (reportIncludeSummary) {
    lines.push('1. TỔNG HỢP QUỸ ĐIỀU TRỊ:');
    lines.push(`• Tổng thu vào quỹ: +${formatVND(reportData.rIn)}`);
    lines.push(`• Tổng chi điều trị: -${formatVND(reportData.rOut)}`);
    if (reportData.rNetOverallBalance >= 0) {
      lines.push(`• Số dư quỹ hiện tại: +${formatVND(reportData.rNetOverallBalance)}`);
    } else {
      lines.push(
        `• Số dư quỹ hiện tại: -${formatVND(Math.abs(reportData.rNetOverallBalance))} (Chi đang vượt thu, người giữ sổ tạm bù)`
      );
    }
    lines.push('--------------------');
  }

  if (reportIncludeStageAndCat && reportData.rOut > 0) {
    lines.push('2. CHI PHÍ THEO GIAI ĐOẠN & DANH MỤC:');
    (Object.keys(STAGE_CONFIG) as ExpenseStage[]).forEach((stg) => {
      const val = reportData.rStage[stg] || 0;
      if (val > 0) {
        lines.push(`• ${STAGE_CONFIG[stg].icon} ${STAGE_CONFIG[stg].shortLabel}: ${formatVND(val)}`);
      }
    });
    lines.push('--- Theo nhóm chi phí ---');
    (Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).forEach((cat) => {
      const val = reportData.rCat[cat] || 0;
      if (val > 0 && CATEGORY_CONFIG[cat].type === 'out') {
        lines.push(`  - ${CATEGORY_CONFIG[cat].icon} ${CATEGORY_CONFIG[cat].label}: ${formatVND(val)}`);
      }
    });
    lines.push('--------------------');
  }

  if (
    reportIncludeContributors &&
    (reportData.rInList.length > 0 || reportData.rOutPayerList.length > 0)
  ) {
    lines.push('3. GHI NHẬN ĐÓNG GÓP & NGƯỜI TRỰC TIẾP THANH TOÁN:');
    reportData.rInList.forEach((c) => {
      lines.push(`• 🌱 ${c.name} đóng góp vào quỹ: ${formatVND(c.amount)}`);
    });
    reportData.rOutPayerList.forEach((c) => {
      lines.push(`• 🤝 ${c.name} trực tiếp thanh toán: ${formatVND(c.amount)} (${c.count} khoản)`);
    });
    lines.push('--------------------');
  }

  if (reportIncludeDetails && reportData.list.length > 0) {
    lines.push(`4. CHI TIẾT CÁC KHOẢN THU / CHI (${reportData.list.length} khoản):`);
    reportData.list.slice(0, 50).forEach((item) => {
      const sign = item.type === 'in' ? '[+THU]' : '[-CHI]';
      const who = item.personName ? ' (' + item.personName + ')' : '';
      lines.push(`• ${formatDateVN(item.date)} ${sign} ${item.title}: ${formatVND(item.amount)}${who}`);
    });
    if (reportData.list.length > 50) {
      lines.push(`... và ${reportData.list.length - 50} khoản khác trong sổ.`);
    }
    lines.push('--------------------');
  }

  lines.push('💡 Số liệu được ghi chép tại Sổ Sức Khỏe Bố để gia đình tiện theo dõi & đối chiếu.');
  return lines.join('\n');
}
