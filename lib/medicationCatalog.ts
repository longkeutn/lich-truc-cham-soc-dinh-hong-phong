import type {
  CareRoutine,
  HealthProfileType,
  LabResultEntry,
  MedType,
  TimeSlot,
} from './types';
import { normalizeDateStr } from './config';

export interface MedicationPreset {
  id: string;
  title: string;
  dosage: string;
  medType: MedType;
  timeSlots: TimeSlot[];
  durationDays?: number;
  instructions?: string;
  conditionNote?: string;
  groupId: string;
  groupLabel: string;
  groupEmoji: string;
  keywords?: string[];
  source?: 'history' | 'preset';
  lastUsedDate?: string;
  useCount?: number;
}

export interface MedicationGroup {
  id: string;
  label: string;
  emoji: string;
  items: MedicationPreset[];
}

/**
 * Chuẩn hoá tên thuốc/từ khoá tìm kiếm (bỏ dấu tiếng Việt, thường hoá, gộp khoảng trắng).
 */
export function normalizeMedKey(text: string): string {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

/**
 * Gom lịch sử các thuốc đã từng nhập từ Đợt khám (`medical_visit`) và Lịch thuốc hàng ngày (`CareRoutine`).
 * Ưu tiên lần kê đơn gần nhất của từng tên thuốc và không đếm trùng routine đã gắn `visitId`.
 */
export function buildPatientMedicationHistory(
  visitEntries: LabResultEntry[] = [],
  routines: CareRoutine[] = []
): MedicationPreset[] {
  const map = new Map<string, MedicationPreset>();
  const linkedRoutineIds = new Set<string>();
  const linkedVisitIds = new Set<string>();

  const sortedVisits = [...visitEntries].sort((a, b) => {
    const dCmp = normalizeDateStr(b.date).localeCompare(normalizeDateStr(a.date));
    if (dCmp !== 0) return dCmp;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  for (const visit of sortedVisits) {
    linkedVisitIds.add(visit.id);
    const meds = visit.medicalVisit?.prescriptions || [];
    const visitDate = normalizeDateStr(visit.date);

    for (const med of meds) {
      if (med.syncedRoutineId) {
        linkedRoutineIds.add(med.syncedRoutineId);
      }
      const cleanTitle = (med.title || '').trim();
      if (!cleanTitle) continue;
      const key = normalizeMedKey(cleanTitle);
      if (!key) continue;

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: `hist-visit-${key}`,
          title: cleanTitle,
          dosage: (med.dosage || '').trim(),
          medType: med.medType === 'as_needed' ? 'as_needed' : 'scheduled',
          timeSlots:
            Array.isArray(med.timeSlots) && med.timeSlots.length > 0
              ? [...med.timeSlots]
              : med.medType === 'as_needed'
                ? []
                : ['morning', 'evening'],
          durationDays: med.durationDays,
          instructions: (med.instructions || '').trim(),
          conditionNote: (med.conditionNote || '').trim(),
          groupId: 'history',
          groupLabel: 'Đã từng dùng',
          groupEmoji: '🕒',
          source: 'history',
          lastUsedDate: visitDate,
          useCount: 1,
        });
      } else {
        existing.useCount = (existing.useCount || 1) + 1;
      }
    }
  }

  const sortedRoutines = [...routines]
    .filter((r) => r.category === 'meds')
    .sort((a, b) =>
      normalizeDateStr(b.updatedAt || b.createdAt).localeCompare(
        normalizeDateStr(a.updatedAt || a.createdAt)
      )
    );

  for (const routine of sortedRoutines) {
    const cleanTitle = (routine.title || '').trim();
    if (!cleanTitle) continue;
    const key = normalizeMedKey(cleanTitle);
    if (!key) continue;

    const alreadyLinkedToVisit =
      linkedRoutineIds.has(routine.id) ||
      Boolean(routine.visitId && linkedVisitIds.has(routine.visitId));

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        id: `hist-routine-${key}`,
        title: cleanTitle,
        dosage: (routine.dosage || '').trim(),
        medType: routine.medType === 'as_needed' ? 'as_needed' : 'scheduled',
        timeSlots:
          Array.isArray(routine.timeSlots) && routine.timeSlots.length > 0
            ? [...routine.timeSlots]
            : routine.medType === 'as_needed'
              ? []
              : ['morning'],
        durationDays: routine.durationDays,
        instructions: (routine.instructions || '').trim(),
        conditionNote: (routine.conditionNote || '').trim(),
        groupId: 'history',
        groupLabel: 'Đang dùng / Đã lưu',
        groupEmoji: '🕒',
        source: 'history',
        lastUsedDate: normalizeDateStr(routine.updatedAt || routine.createdAt),
        useCount: 1,
      });
    } else if (!alreadyLinkedToVisit) {
      existing.useCount = (existing.useCount || 1) + 1;
      if (!existing.dosage && routine.dosage) {
        existing.dosage = routine.dosage.trim();
      }
      if (!existing.instructions && routine.instructions) {
        existing.instructions = routine.instructions.trim();
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const dateCmp = (b.lastUsedDate || '').localeCompare(a.lastUsedDate || '');
    if (dateCmp !== 0) return dateCmp;
    return (b.useCount || 1) - (a.useCount || 1);
  });
}

type RawPresetSeed = Omit<MedicationPreset, 'id' | 'groupId' | 'groupLabel' | 'groupEmoji' | 'source'>;

function buildGroup(
  id: string,
  label: string,
  emoji: string,
  seeds: RawPresetSeed[]
): MedicationGroup {
  return {
    id,
    label,
    emoji,
    items: seeds.map((seed, idx) => ({
      ...seed,
      id: `preset-${id}-${idx}`,
      groupId: id,
      groupLabel: label,
      groupEmoji: emoji,
      source: 'preset',
    })),
  };
}

const PEDIATRIC_GROUPS: MedicationGroup[] = [
  buildGroup('ped_fever', 'Hạ sốt & Giảm đau', '🌡️', [
    {
      title: 'Hapacol 150mg (gói)',
      dosage: '1 gói',
      medType: 'as_needed',
      timeSlots: [],
      durationDays: 5,
      instructions: 'Pha với nước ấm, cách nhau tối thiểu 4-6 giờ',
      conditionNote: 'Chỉ uống khi sốt >= 38.5°C hoặc quấy đau',
      keywords: ['paracetamol', 'ha sot', 'sot', '150'],
    },
    {
      title: 'Hapacol 250mg (gói)',
      dosage: '1 gói',
      medType: 'as_needed',
      timeSlots: [],
      durationDays: 5,
      instructions: 'Pha với nước ấm, tối đa 5 lần/24h',
      conditionNote: 'Chỉ uống khi sốt >= 38.5°C (trẻ ~17-25 kg)',
      keywords: ['paracetamol', 'ha sot', 'sot', '250'],
    },
    {
      title: 'Hapacol 80mg (gói)',
      dosage: '1 gói',
      medType: 'as_needed',
      timeSlots: [],
      durationDays: 5,
      instructions: 'Pha với nước ấm hoặc sữa, cách 4-6 giờ',
      conditionNote: 'Chỉ uống khi sốt >= 38.5°C (trẻ nhỏ ~6-10 kg)',
      keywords: ['paracetamol', 'ha sot', '80'],
    },
    {
      title: 'Ibuprofen siro (Brufen)',
      dosage: '5 ml',
      medType: 'as_needed',
      timeSlots: [],
      durationDays: 3,
      instructions: 'Uống sau ăn, lắc đều chai trước khi đong',
      conditionNote: 'Khi sốt cao không hạ với Paracetamol (cách ít nhất 6-8h)',
      keywords: ['brufen', 'ha sot', 'khang viem', 'siro'],
    },
  ]),
  buildGroup('ped_antibiotic', 'Kháng sinh nhi', '💊', [
    {
      title: 'Augmentin 250mg (gói)',
      dosage: '1 gói',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      durationDays: 7,
      instructions: 'Uống ngay trước bữa ăn, đủ cữ theo đơn BS',
      keywords: ['amoxicillin', 'clavulanic', 'khang sinh', 'viem hong', 'viem tai'],
    },
    {
      title: 'Augmentin 500mg (gói)',
      dosage: '1 gói',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      durationDays: 7,
      instructions: 'Uống ngay trước bữa ăn, pha ít nước đun sôi để nguội',
      keywords: ['amoxicillin', 'clavulanic', 'khang sinh'],
    },
    {
      title: 'Zinnat 125mg/5ml (siro)',
      dosage: '5 ml',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      durationDays: 7,
      instructions: 'Uống sau ăn, lắc kỹ trước khi dùng',
      keywords: ['cefuroxim', 'khang sinh', 'viem tai giua', 'ho'],
    },
    {
      title: 'Azithromycin 200mg/5ml',
      dosage: '5 ml',
      medType: 'scheduled',
      timeSlots: ['morning'],
      durationDays: 3,
      instructions: 'Uống ngày 1 lần vào giờ cố định',
      keywords: ['azithromycin', 'zithromax', 'khang sinh', 'ho'],
    },
    {
      title: 'Cefixim 100mg (gói)',
      dosage: '1 gói',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      durationDays: 5,
      instructions: 'Uống sau ăn, pha với nước lọc',
      keywords: ['cefixime', 'khang sinh'],
    },
  ]),
  buildGroup('ped_respiratory', 'Ho & Mũi họng', '🤧', [
    {
      title: 'Siro ho Prospan',
      dosage: '5 ml',
      medType: 'scheduled',
      timeSlots: ['morning', 'noon', 'evening'],
      durationDays: 7,
      instructions: 'Lắc đều chai, uống sau ăn',
      keywords: ['ho', 'long dom', 'thao duoc', 'siro ho'],
    },
    {
      title: 'Acemuc 100mg (gói)',
      dosage: '1 gói',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      durationDays: 5,
      instructions: 'Pha nước lọc, giúp long đờm, uống ban ngày/chiều sớm',
      keywords: ['acetylcystein', 'long dom', 'ho dom'],
    },
    {
      title: 'Nước muối ưu trương xịt mũi',
      dosage: '1-2 nhát/bên',
      medType: 'scheduled',
      timeSlots: ['morning', 'noon', 'evening'],
      durationDays: 7,
      instructions: 'Rửa sạch mũi trước khi ăn và trước khi ngủ',
      keywords: ['xit mui', 'nghet mui', 'so mui', 'sterimar', 'nebulizer'],
    },
    {
      title: 'Otrivin 0.05% (nhỏ/xịt mũi)',
      dosage: '1 nhát/bên',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      durationDays: 5,
      instructions: 'Dùng tối đa 5 ngày liên tiếp để tránh nhờn thuốc',
      conditionNote: 'Khi bé nghẹt mũi nhiều khó ngủ',
      keywords: ['nghet mui', 'xylometazolin', 'thong mui'],
    },
    {
      title: 'Aerius siro (chống dị ứng)',
      dosage: '2.5 ml',
      medType: 'scheduled',
      timeSlots: ['evening'],
      durationDays: 5,
      instructions: 'Uống buổi tối, giảm sổ mũi dị ứng / nổi mề đay',
      keywords: ['desloratadin', 'di ung', 'so mui', 'me day'],
    },
  ]),
  buildGroup('ped_digestive', 'Tiêu hóa & Bù nước', '🍼', [
    {
      title: 'Enterogermina (ống men)',
      dosage: '1 ống',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      durationDays: 7,
      instructions: 'Lắc nhẹ ống, uống cách kháng sinh ít nhất 2 giờ',
      keywords: ['men vi sinh', 'tieu chay', 'duong ruot', 'khang sinh'],
    },
    {
      title: 'Oresol 245 (gói)',
      dosage: 'Uống từng ngụm',
      medType: 'as_needed',
      timeSlots: [],
      durationDays: 5,
      instructions: 'Pha 1 gói đúng lượng nước ghi trên bao bì (thường 200ml)',
      conditionNote: 'Bù nước khi sốt cao, nôn trớ hoặc tiêu chảy',
      keywords: ['bu nuoc', 'dien giai', 'sot', 'tieu chay'],
    },
    {
      title: 'Kẽm Zinc (siro / gói)',
      dosage: '5 ml',
      medType: 'scheduled',
      timeSlots: ['morning'],
      durationDays: 10,
      instructions: 'Uống sau ăn sáng 30 phút',
      keywords: ['kem', 'tieu chay', 'an ngon', 'de khang'],
    },
    {
      title: 'Smecta (gói)',
      dosage: '1/2 - 1 gói',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      durationDays: 3,
      instructions: 'Pha với 50ml nước ấm, uống cách thuốc khác 1-2 giờ',
      conditionNote: 'Khi đi ngoài phân lỏng nhiều lần',
      keywords: ['tieu chay', 'cam ia chay'],
    },
  ]),
  buildGroup('ped_vitamin', 'Vitamin & Đề kháng', '🌟', [
    {
      title: 'Vitamin D3 K2 (nhỏ giọt)',
      dosage: '2-3 giọt',
      medType: 'scheduled',
      timeSlots: ['morning'],
      instructions: 'Nhỏ trực tiếp hoặc vào thìa sữa buổi sáng',
      keywords: ['d3', 'k2', 'chieu cao', 'xuong'],
    },
    {
      title: 'Siro tăng đề kháng (Imunoglukan / Anaferon)',
      dosage: '5 ml',
      medType: 'scheduled',
      timeSlots: ['morning'],
      durationDays: 14,
      instructions: 'Uống lúc đói trước ăn sáng hoặc trước khi đi ngủ',
      keywords: ['de khang', 'om vat'],
    },
  ]),
];

const GENERAL_ADULT_GROUPS: MedicationGroup[] = [
  buildGroup('adult_msk', 'Cơ xương khớp & Thần kinh', '🦴', [
    {
      title: 'Myonal 50mg',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning', 'noon', 'evening'],
      durationDays: 10,
      instructions: 'Uống sau ăn, giãn cơ vùng cổ vai / thắt lưng',
      keywords: ['eperison', 'gian co', 'dau lung', 'l5 s1'],
    },
    {
      title: 'Mobic 7.5mg',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      durationDays: 10,
      instructions: 'Uống ngay sau ăn no để tránh kích ứng dạ dày',
      keywords: ['meloxicam', 'khang viem', 'giam dau', 'khop', 'cot song'],
    },
    {
      title: 'Lyrica 75mg',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['evening'],
      durationDays: 10,
      instructions: 'Uống buổi tối (có thể gây buồn ngủ nhẹ)',
      keywords: ['pregabalin', 'dau than kinh', 'te bi', 'dau lan'],
    },
    {
      title: 'Celecoxib 200mg (Fuxicure / Celebrex)',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      durationDays: 7,
      instructions: 'Uống sau ăn, giảm đau kháng viêm khớp / cột sống',
      keywords: ['fuxicure', 'khang viem', 'dau lung', 'gout'],
    },
  ]),
  buildGroup('adult_stomach', 'Dạ dày & Tiêu hóa', '🫁', [
    {
      title: 'Medoome 40mg (Esomeprazole)',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning'],
      durationDays: 14,
      instructions: 'Uống trước ăn sáng 30 phút để bảo vệ dạ dày',
      keywords: ['da day', 'trao nguoc', 'esomeprazol', 'omeprazol'],
    },
    {
      title: 'Gaviscon (gói hỗn dịch)',
      dosage: '1 gói',
      medType: 'as_needed',
      timeSlots: [],
      durationDays: 7,
      instructions: 'Uống sau ăn hoặc trước ngủ khi ợ nóng / đầy bụng',
      conditionNote: 'Khi có triệu chứng trào ngược, đau rát thượng vị',
      keywords: ['trao nguoc', 'o chua', 'da day'],
    },
    {
      title: 'Enterogermina / Men vi sinh',
      dosage: '1 ống',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      durationDays: 7,
      instructions: 'Uống cách kháng sinh 2 giờ',
      keywords: ['tieu hoa', 'roi loan tieu hoa', 'day bung'],
    },
  ]),
  buildGroup('adult_cardio_metabolic', 'Tim mạch, Mỡ máu & Gout', '❤️', [
    {
      title: 'Lipitor 10mg / 20mg (Atorvastatin)',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['evening'],
      instructions: 'Uống buổi tối, theo dõi men gan định kỳ',
      keywords: ['mo mau', 'cholesterol', 'ldl', 'statin'],
    },
    {
      title: 'Allopurinol 300mg',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning'],
      instructions: 'Uống sau ăn sáng, uống nhiều nước lọc',
      keywords: ['acid uric', 'gout'],
    },
    {
      title: 'Colchicine 1mg',
      dosage: '1 viên',
      medType: 'as_needed',
      timeSlots: [],
      durationDays: 3,
      instructions: 'Uống sau ăn khi có cơn đau Gout cấp theo chỉ định BS',
      conditionNote: 'Ngừng nếu bị tiêu chảy',
      keywords: ['gout cap', 'sung khop'],
    },
    {
      title: 'Amlodipine 5mg',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning'],
      instructions: 'Uống vào giờ cố định buổi sáng, đo huyết áp trước khi uống',
      keywords: ['huyet ap', 'tang huyet ap'],
    },
  ]),
  buildGroup('adult_liver_flu', 'Gan, Vitamin & Cảm cúm', '🌿', [
    {
      title: 'Sylimar-vita 70mg',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      durationDays: 14,
      instructions: 'Uống sau ăn để hỗ trợ bảo vệ tế bào gan',
      keywords: ['bo gan', 'men gan', 'alt', 'ast', 'silymarin'],
    },
    {
      title: 'Paracetamol 500mg / Efferalgan',
      dosage: '1 viên',
      medType: 'as_needed',
      timeSlots: [],
      durationDays: 5,
      instructions: 'Uống cách nhau 4-6 giờ, tối đa 4g/ngày',
      conditionNote: 'Khi sốt >= 38.5°C hoặc đau đầu, đau mỏi người',
      keywords: ['ha sot', 'giam dau', 'cam cum', 'panadol'],
    },
    {
      title: 'Vitamin B tổng hợp / Magie B6',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning'],
      durationDays: 14,
      instructions: 'Uống sau ăn sáng',
      keywords: ['3b', 'than kinh', 'met moi', 'te bi'],
    },
  ]),
];

const THYROID_POST_OP_GROUPS: MedicationGroup[] = [
  buildGroup('thyroid_core', 'Nội tiết & Canxi cận giáp', '🦋', [
    {
      title: 'Levothyroxine 100mcg (Berlin-Chemie / Levothyrox)',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning'],
      instructions: 'Uống lúc bụng đói khi vừa thức dậy với nước lọc, trước ăn sáng 30-60 phút',
      conditionNote: 'Cách Canxi, Sắt và sữa ít nhất 4 giờ',
      keywords: ['tuyen giap', 'hormone', 'tsh', 'ft4'],
    },
    {
      title: 'Levothyroxine 50mcg',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning'],
      instructions: 'Uống lúc bụng đói trước ăn sáng 30-60 phút',
      conditionNote: 'Cách Canxi và Sắt ít nhất 4 giờ',
      keywords: ['tuyen giap', 'hormone', '50mcg'],
    },
    {
      title: 'Canxi + Vitamin D3',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['noon', 'evening'],
      instructions: 'Uống sau ăn trưa hoặc chiều (cách Levothyroxine ít nhất 4 giờ)',
      keywords: ['calcium', 'te bi', 'can giap', 'chuot rut'],
    },
    {
      title: 'Calcitriol 0.25mcg (Rocaltrol)',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['noon', 'evening'],
      instructions: 'Uống sau ăn theo liều chỉnh Canxi máu của BS',
      keywords: ['canxi', 'pth', 'can giap'],
    },
    {
      title: 'Magie B6',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['noon'],
      durationDays: 14,
      instructions: 'Uống sau ăn trưa, giảm tê bì co cơ nhẹ',
      keywords: ['te bi', 'co giat', 'ngu ngon'],
    },
  ]),
  ...GENERAL_ADULT_GROUPS.filter(
    (g) => g.id === 'adult_cardio_metabolic' || g.id === 'adult_stomach' || g.id === 'adult_liver_flu'
  ),
];

const POST_STROKE_GROUPS: MedicationGroup[] = [
  buildGroup('stroke_neuro', 'Huyết áp, Mạch máu & Thần kinh', '🧠', [
    {
      title: 'Amlodipine 5mg',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning'],
      instructions: 'Đo huyết áp trước khi uống vào giờ cố định',
      keywords: ['huyet ap', 'tim mach'],
    },
    {
      title: 'Losartan 50mg / Telmisartan 40mg',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning'],
      instructions: 'Uống đều hàng ngày theo chỉ định BS tim mạch',
      keywords: ['huyet ap', 'cozaar', 'micardis'],
    },
    {
      title: 'Levetiracetam 500mg (Keppra)',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning', 'evening'],
      instructions: 'Uống đúng giờ sáng - tối, tuyệt đối không tự ý ngưng thuốc',
      keywords: ['chong co giat', 'keppra', 'dong kinh', 'ghep so'],
    },
    {
      title: 'Citicoline 500mg / Piracetam 800mg',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['morning', 'noon'],
      durationDays: 14,
      instructions: 'Uống sau ăn sáng và trưa (tránh uống tối muộn gây khó ngủ)',
      keywords: ['bo nao', 'tuan hoan nao', 'tai bien'],
    },
    {
      title: 'Atorvastatin 20mg',
      dosage: '1 viên',
      medType: 'scheduled',
      timeSlots: ['evening'],
      instructions: 'Uống buổi tối, bảo vệ thành mạch & hạ mỡ máu',
      keywords: ['mo mau', 'lipitor', 'cholesterol'],
    },
  ]),
  ...GENERAL_ADULT_GROUPS.filter(
    (g) => g.id === 'adult_stomach' || g.id === 'adult_liver_flu'
  ),
];

export function getMedicationGroupsForProfile(
  profileType: HealthProfileType
): MedicationGroup[] {
  if (profileType === 'pediatric') return PEDIATRIC_GROUPS;
  if (profileType === 'thyroid_post_op') return THYROID_POST_OP_GROUPS;
  if (profileType === 'post_stroke_cranioplasty') return POST_STROKE_GROUPS;
  return GENERAL_ADULT_GROUPS;
}

/**
 * Tìm kiếm gợi ý thuốc khi gõ (hỗ trợ không dấu, ưu tiên thuốc đã từng dùng của hồ sơ).
 */
export function searchMedicationSuggestions(
  query: string,
  historyItems: MedicationPreset[],
  groups: MedicationGroup[],
  limit = 8
): MedicationPreset[] {
  const q = normalizeMedKey(query);
  const seenKeys = new Set<string>();
  const pool: MedicationPreset[] = [];

  for (const item of historyItems) {
    const key = normalizeMedKey(item.title);
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    pool.push(item);
  }

  for (const grp of groups) {
    for (const item of grp.items) {
      const key = normalizeMedKey(item.title);
      if (!key || seenKeys.has(key)) continue;
      seenKeys.add(key);
      pool.push(item);
    }
  }

  if (!q) {
    return pool.slice(0, limit);
  }

  const scored: Array<{ item: MedicationPreset; score: number }> = [];
  for (const item of pool) {
    const titleKey = normalizeMedKey(item.title);
    const metaKey = normalizeMedKey(
      [
        item.groupLabel,
        item.instructions || '',
        item.conditionNote || '',
        ...(item.keywords || []),
      ].join(' ')
    );

    let score = 0;
    if (titleKey.startsWith(q)) {
      score = 4;
    } else if (titleKey.includes(q)) {
      score = 3;
    } else if (metaKey.includes(q)) {
      score = 1.5;
    }

    if (score > 0) {
      if (item.source === 'history') {
        score += 0.6;
      }
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}
