'use client';

import React, { useState, useMemo } from 'react';
import {
  LabResultEntry,
  CustomLabItem,
  HealthProfileType,
  TshTargetLevel,
  VitalsLogEntry,
  FamilyMember,
} from '@/lib/types';
import {
  evaluateLabEntry,
  LabIndicatorEval,
  getVietnamDateStr,
  normalizeDateStr,
} from '@/lib/config';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  FlaskConical,
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  Building2,
  Pill,
  FileSpreadsheet,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface LabResultsViewProps {
  labResults: LabResultEntry[];
  vitalsLog: VitalsLogEntry[];
  profileId?: string;
  todayStr?: string;
  patientName: string;
  patientDisplayName: string;
  patientDiagnosis?: string;
  profileType: HealthProfileType;
  members: FamilyMember[];
  defaultRecorder: string;
  onSaveLabResult: (entry: LabResultEntry) => Promise<void>;
  onDeleteLabResult: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'info' | 'success' | 'warn') => void;
}

type ChartCategory = 'thyroid' | 'lipid' | 'metabolic' | 'liver_kidney';

const QUICK_DOSES = [
  '100mcg',
  '100mcgx6',
  '100mcgx6, 50mcgx1',
  '100x5, 50x2',
  '50mcg',
  '75mcg',
  '87.5mcg',
  '112.5mcg',
  '125mcg',
];

// 12 mốc lịch sử từ Sheet Data của Mẹ Bạch Yến (2022–2025) trích xuất nguyên bản từ Google Sheet cũ
const BACH_YEN_LEGACY_DATA_PRESETS: Array<Omit<LabResultEntry, 'id' | 'createdAt'>> = [
  {
    date: '2022-09-01',
    legacyTimestamp: '01/09/2025 12:32:18',
    levothyroxineDose: '100mcg',
    symptoms: 'mệt mỏi, khám lần đầu sau mổ 3 tháng',
    doctorAdvice: 'Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2022-09-12',
    legacyTimestamp: '01/09/2025 12:30:55',
    levothyroxineDose: '100mcg',
    symptoms: 'mệt mỏi, khám lần đầu sau mổ 3 tháng',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2022-12-12',
    legacyTimestamp: '01/09/2025 12:34:45',
    levothyroxineDose: '100x5, 50x2',
    symptoms: 'Chuẩn đoán thiếu Calci do chế độ ăn. Suy giáp sau điều trị mổ',
    doctorAdvice: 'Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2023-09-18',
    legacyTimestamp: '01/09/2025 12:45:08',
    tsh: 3.3147,
    t3: 1.1,
    t3Unit: 'nmol/L',
    ft4: 10.6,
    ft4Unit: 'pmol/L',
    levothyroxineDose: '100x5, 50x2',
    doctorAdvice: 'Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2024-03-11',
    legacyTimestamp: '01/09/2025 12:51:58',
    tsh: 2.354,
    t3: 1.54,
    t3Unit: 'nmol/L',
    ft4: 14.1,
    ft4Unit: 'pmol/L',
    levothyroxineDose: '100mcg',
    doctorAdvice: 'K giáp thể nhú • Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2024-06-16',
    legacyTimestamp: '01/09/2025 13:25:23',
    tsh: 0.091,
    t3: 1.58,
    t3Unit: 'nmol/L',
    ft4: 22.6,
    ft4Unit: 'pmol/L',
    levothyroxineDose: '100mcgx6, 50mcgx1',
    symptoms: 'tim đập nhanh',
    doctorAdvice: 'K giáp thể nhú • Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2024-09-02',
    legacyTimestamp: '01/09/2025 12:58:08',
    tsh: 0.133,
    t3: 2.04,
    t3Unit: 'nmol/L',
    ft4: 26.27,
    ft4Unit: 'pmol/L',
    levothyroxineDose: '100x5, 50x2',
    doctorAdvice: 'K giáp thể nhú, đã phẫu thuật • Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2024-11-23',
    legacyTimestamp: '01/09/2025 13:04:06',
    tsh: 0.263,
    t3: 1.89,
    t3Unit: 'nmol/L',
    ft4: 23.29,
    ft4Unit: 'pmol/L',
    tg: 0.25,
    antiTg: 19.44,
    levothyroxineDose: '100mcg',
    symptoms: 'chuẩn đoán suy giáp',
    doctorAdvice: 'K giáp thể nhú • Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2025-05-28',
    legacyTimestamp: '01/09/2025 13:40:08',
    tsh: 0.193,
    t3: 1.83,
    t3Unit: 'nmol/L',
    ft4: 24.57,
    ft4Unit: 'pmol/L',
    levothyroxineDose: '100x5, 50x2',
    symptoms: 'mệt mỏi, tim đập nhanh',
    doctorAdvice: 'K giáp thể nhú • Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2025-08-30',
    legacyTimestamp: '01/09/2025 13:47:16',
    tsh: 0.335,
    t3: 1.5,
    t3Unit: 'nmol/L',
    ft4: 28.14,
    ft4Unit: 'pmol/L',
    tg: 0.04,
    levothyroxineDose: '100mcgx6',
    symptoms: 'mệt mỏi, tim đập nhanh. Chỉ số TG (Thyroglobulin) < 0.040 ng/mL',
    doctorAdvice: 'K giáp thể nhú • Đã cắt toàn bộ tuyến giáp',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2025-09-01',
    legacyTimestamp: '01/09/2025 15:07:56',
    levothyroxineDose: '100mcgx6',
    symptoms: 'Mệt mỏi, tim đập nhanh',
    tshTargetLevel: 'moderate_risk',
  },
  {
    date: '2025-10-29',
    legacyTimestamp: '29/10/2025 19:56:01',
    levothyroxineDose: '100mcgx6',
    symptoms: 'Bị đau họng, hơi sốt • hơi mệt',
    tshTargetLevel: 'moderate_risk',
  },
];

const QUICK_FACILITIES = [
  'BV Nội Tiết Trung Ương',
  'BV Bạch Mai',
  'BV Đại học Y Hà Nội',
  'BV Ung Bướu',
  'Hệ thống Y tế Medlatec',
  'Phòng khám Đa khoa',
];

function fmtDateShort(dateStr: string): string {
  const norm = normalizeDateStr(dateStr);
  const parts = norm.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function fmtDateAxis(dateStr: string): string {
  const norm = normalizeDateStr(dateStr);
  const parts = norm.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}

function parseOptionalNumber(raw: string): number | undefined {
  if (!raw || !raw.trim()) return undefined;
  const normalized = raw.trim().replace(',', '.').replace(/^[<>≤≥]+/, '');
  const num = parseFloat(normalized);
  return isNaN(num) ? undefined : num;
}

export default function LabResultsView({
  labResults,
  vitalsLog,
  patientName,
  patientDisplayName,
  patientDiagnosis,
  profileType,
  members,
  defaultRecorder,
  onSaveLabResult,
  onDeleteLabResult,
  showToast,
}: LabResultsViewProps) {
  // Sắp xếp danh sách xét nghiệm mới nhất lên đầu
  const sortedLabsDesc = useMemo(() => {
    return [...labResults].sort((a, b) => {
      const dCmp = normalizeDateStr(b.date).localeCompare(normalizeDateStr(a.date));
      if (dCmp !== 0) return dCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [labResults]);

  // Sắp xếp cũ -> mới cho biểu đồ
  const sortedLabsAsc = useMemo(() => {
    return [...sortedLabsDesc].reverse();
  }, [sortedLabsDesc]);

  const latestLab = sortedLabsDesc[0] || null;
  const previousLab = sortedLabsDesc[1] || null;

  const latestEval = useMemo(
    () => (latestLab ? evaluateLabEntry(latestLab, profileType) : null),
    [latestLab, profileType]
  );

  // Tự động chọn tab biểu đồ phù hợp với hồ sơ hoặc dữ liệu sẵn có
  const [chartTab, setChartTab] = useState<ChartCategory>(() =>
    profileType === 'thyroid_post_op' ? 'thyroid' : 'lipid'
  );
  const [groupFilter, setGroupFilter] = useState<'all' | 'thyroid' | 'lipid' | 'metabolic' | 'liver_kidney'>('all');

  // Modal Thêm / Sửa kết quả xét nghiệm
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal Nhập nhanh từ bảng Google Sheet cũ (Data & BiochemistryData)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importBiochemText, setImportBiochemText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // State các trường trong Form
  const [date, setDate] = useState(() => getVietnamDateStr());
  const [facility, setFacility] = useState('');
  const [recordedBy, setRecordedBy] = useState(defaultRecorder);
  const [symptoms, setSymptoms] = useState('');
  const [doctorAdvice, setDoctorAdvice] = useState('');

  // Tuyến giáp & Markers
  const [levothyroxineDose, setLevothyroxineDose] = useState('');
  const [tshTargetLevel, setTshTargetLevel] = useState<TshTargetLevel>(
    profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal'
  );
  const [tsh, setTsh] = useState('');
  const [ft4, setFt4] = useState('');
  const [ft4Unit, setFt4Unit] = useState<'ng/dL' | 'pmol/L'>(
    profileType === 'thyroid_post_op' ? 'pmol/L' : 'ng/dL'
  );
  const [ft3, setFt3] = useState('');
  const [ft3Unit, setFt3Unit] = useState<'pg/mL' | 'pmol/L'>('pg/mL');
  const [t4, setT4] = useState('');
  const [t4Unit, setT4Unit] = useState<'µg/dL' | 'nmol/L'>('µg/dL');
  const [t3, setT3] = useState('');
  const [t3Unit, setT3Unit] = useState<'nmol/L' | 'ng/dL'>('nmol/L');
  const [tg, setTg] = useState('');
  const [antiTg, setAntiTg] = useState('');
  const [antiTpo, setAntiTpo] = useState('');

  // Mỡ máu
  const [lipidUnit, setLipidUnit] = useState<'mmol/L' | 'mg/dL'>('mmol/L');
  const [cholesterol, setCholesterol] = useState('');
  const [triglyceride, setTriglyceride] = useState('');
  const [hdlC, setHdlC] = useState('');
  const [ldlC, setLdlC] = useState('');

  // Đường huyết, Canxi & Vitamin D
  const [glucoseUnit, setGlucoseUnit] = useState<'mmol/L' | 'mg/dL'>('mmol/L');
  const [glucose, setGlucose] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [calciumUnit, setCalciumUnit] = useState<'mmol/L' | 'mg/dL'>('mmol/L');
  const [calcium, setCalcium] = useState('');
  const [ionizedCalcium, setIonizedCalcium] = useState('');
  const [vitaminD, setVitaminD] = useState('');

  // Gan, Thận & Huyết học
  const [ast, setAst] = useState('');
  const [alt, setAlt] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [urea, setUrea] = useState('');
  const [uricAcid, setUricAcid] = useState('');
  const [hemoglobin, setHemoglobin] = useState('');

  // Chỉ số mở rộng tùy chỉnh
  const [customLabs, setCustomLabs] = useState<CustomLabItem[]>([]);

  // Mở rộng chi tiết từng bản ghi lịch sử
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Tính nhịp tim & huyết áp trung bình 14 ngày gần nhất để đối chiếu lâm sàng với xét nghiệm
  const recentVitalsSummary = useMemo(() => {
    const recent = vitalsLog.slice(0, 20);
    if (recent.length === 0) return null;
    const avgSys = Math.round(recent.reduce((s, v) => s + v.sys, 0) / recent.length);
    const avgDia = Math.round(recent.reduce((s, v) => s + v.dia, 0) / recent.length);
    const pulseItems = recent.filter((v) => v.pulse && v.pulse > 0);
    const avgPulse =
      pulseItems.length > 0
        ? Math.round(pulseItems.reduce((s, v) => s + (v.pulse || 0), 0) / pulseItems.length)
        : null;
    return { avgSys, avgDia, avgPulse, count: recent.length };
  }, [vitalsLog]);

  const openAddModal = () => {
    setEditingId('');
    setDate(getVietnamDateStr());
    setFacility(latestLab?.facility || '');
    setRecordedBy(defaultRecorder);
    setSymptoms('');
    setDoctorAdvice('');
    setLevothyroxineDose(latestLab?.levothyroxineDose || '');
    setTshTargetLevel(
      latestLab?.tshTargetLevel ||
        (profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal')
    );
    setTsh('');
    setFt4('');
    setFt4Unit(
      latestLab?.ft4Unit || (profileType === 'thyroid_post_op' ? 'pmol/L' : 'ng/dL')
    );
    setFt3('');
    setFt3Unit(latestLab?.ft3Unit || 'pg/mL');
    setT4('');
    setT4Unit(latestLab?.t4Unit || 'µg/dL');
    setT3('');
    setT3Unit(latestLab?.t3Unit || 'nmol/L');
    setTg('');
    setAntiTg('');
    setAntiTpo('');
    setLipidUnit(latestLab?.lipidUnit || 'mmol/L');
    setCholesterol('');
    setTriglyceride('');
    setHdlC('');
    setLdlC('');
    setGlucoseUnit(latestLab?.glucoseUnit || 'mmol/L');
    setGlucose('');
    setHba1c('');
    setCalciumUnit(latestLab?.calciumUnit || 'mmol/L');
    setCalcium('');
    setIonizedCalcium('');
    setVitaminD('');
    setAst('');
    setAlt('');
    setCreatinine('');
    setUrea('');
    setUricAcid('');
    setHemoglobin('');
    setCustomLabs([]);
    setFormModalOpen(true);
  };

  const openEditModal = (entry: LabResultEntry) => {
    setEditingId(entry.id);
    setDate(normalizeDateStr(entry.date) || getVietnamDateStr());
    setFacility(entry.facility || '');
    setRecordedBy(entry.recordedBy || defaultRecorder);
    setSymptoms(entry.symptoms || '');
    setDoctorAdvice(entry.doctorAdvice || '');
    setLevothyroxineDose(entry.levothyroxineDose || '');
    setTshTargetLevel(
      entry.tshTargetLevel ||
        (profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal')
    );
    setTsh(entry.tsh !== undefined ? String(entry.tsh) : '');
    setFt4(entry.ft4 !== undefined ? String(entry.ft4) : '');
    setFt4Unit(entry.ft4Unit || (entry.ft4 && entry.ft4 > 5 ? 'pmol/L' : 'ng/dL'));
    setFt3(entry.ft3 !== undefined ? String(entry.ft3) : '');
    setFt3Unit(entry.ft3Unit || 'pg/mL');
    setT4(entry.t4 !== undefined ? String(entry.t4) : '');
    setT4Unit(entry.t4Unit || 'µg/dL');
    setT3(entry.t3 !== undefined ? String(entry.t3) : '');
    setT3Unit(entry.t3Unit || 'nmol/L');
    setTg(entry.tg !== undefined ? String(entry.tg) : '');
    setAntiTg(entry.antiTg !== undefined ? String(entry.antiTg) : '');
    setAntiTpo(entry.antiTpo !== undefined ? String(entry.antiTpo) : '');
    setLipidUnit(entry.lipidUnit || 'mmol/L');
    setCholesterol(entry.cholesterol !== undefined ? String(entry.cholesterol) : '');
    setTriglyceride(entry.triglyceride !== undefined ? String(entry.triglyceride) : '');
    setHdlC(entry.hdlC !== undefined ? String(entry.hdlC) : '');
    setLdlC(entry.ldlC !== undefined ? String(entry.ldlC) : '');
    setGlucoseUnit(entry.glucoseUnit || 'mmol/L');
    setGlucose(entry.glucose !== undefined ? String(entry.glucose) : '');
    setHba1c(entry.hba1c !== undefined ? String(entry.hba1c) : '');
    setCalciumUnit(entry.calciumUnit || 'mmol/L');
    setCalcium(entry.calcium !== undefined ? String(entry.calcium) : '');
    setIonizedCalcium(entry.ionizedCalcium !== undefined ? String(entry.ionizedCalcium) : '');
    setVitaminD(entry.vitaminD !== undefined ? String(entry.vitaminD) : '');
    setAst(entry.ast !== undefined ? String(entry.ast) : '');
    setAlt(entry.alt !== undefined ? String(entry.alt) : '');
    setCreatinine(entry.creatinine !== undefined ? String(entry.creatinine) : '');
    setUrea(entry.urea !== undefined ? String(entry.urea) : '');
    setUricAcid(entry.uricAcid !== undefined ? String(entry.uricAcid) : '');
    setHemoglobin(entry.hemoglobin !== undefined ? String(entry.hemoglobin) : '');
    setCustomLabs(Array.isArray(entry.customLabs) ? [...entry.customLabs] : []);
    setFormModalOpen(true);
  };

  const handleAddCustomLabRow = () => {
    setCustomLabs((prev) => [
      ...prev,
      { id: `cl-${Date.now()}-${prev.length}`, name: '', value: '', unit: '', refRange: '' },
    ]);
  };

  const handleUpdateCustomLabRow = (
    idx: number,
    field: keyof CustomLabItem,
    val: string
  ) => {
    setCustomLabs((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handleRemoveCustomLabRow = (idx: number) => {
    setCustomLabs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || isSaving) return;

    const cleanCustomLabs = customLabs.filter(
      (c) => c.name.trim() !== '' && c.value.trim() !== ''
    );

    const existingItem = editingId ? labResults.find((l) => l.id === editingId) : undefined;

    const entry: LabResultEntry = {
      id: editingId || `lab-${Date.now()}`,
      date: normalizeDateStr(date),
      facility: facility.trim() || undefined,
      recordedBy: recordedBy.trim() || defaultRecorder,
      symptoms: symptoms.trim() || undefined,
      doctorAdvice: doctorAdvice.trim() || undefined,
      legacyTimestamp: existingItem?.legacyTimestamp,
      levothyroxineDose: levothyroxineDose.trim() || undefined,
      tshTargetLevel,
      tsh: parseOptionalNumber(tsh),
      ft4: parseOptionalNumber(ft4),
      ft4Unit,
      ft3: parseOptionalNumber(ft3),
      ft3Unit,
      t4: parseOptionalNumber(t4),
      t4Unit,
      t3: parseOptionalNumber(t3),
      t3Unit,
      tg: parseOptionalNumber(tg),
      antiTg: parseOptionalNumber(antiTg),
      antiTpo: parseOptionalNumber(antiTpo),
      lipidUnit,
      cholesterol: parseOptionalNumber(cholesterol),
      triglyceride: parseOptionalNumber(triglyceride),
      hdlC: parseOptionalNumber(hdlC),
      ldlC: parseOptionalNumber(ldlC),
      glucoseUnit,
      glucose: parseOptionalNumber(glucose),
      hba1c: parseOptionalNumber(hba1c),
      calciumUnit,
      calcium: parseOptionalNumber(calcium),
      ionizedCalcium: parseOptionalNumber(ionizedCalcium),
      vitaminD: parseOptionalNumber(vitaminD),
      ast: parseOptionalNumber(ast),
      alt: parseOptionalNumber(alt),
      creatinine: parseOptionalNumber(creatinine),
      urea: parseOptionalNumber(urea),
      uricAcid: parseOptionalNumber(uricAcid),
      hemoglobin: parseOptionalNumber(hemoglobin),
      customLabs: cleanCustomLabs.length > 0 ? cleanCustomLabs : undefined,
      createdAt: existingItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Kiểm tra có ít nhất 1 chỉ số hoặc ghi chú được nhập
    const evalCheck = evaluateLabEntry(entry, profileType);
    if (
      evalCheck.indicators.length === 0 &&
      cleanCustomLabs.length === 0 &&
      !entry.levothyroxineDose &&
      !entry.symptoms &&
      !entry.doctorAdvice
    ) {
      showToast('Vui lòng nhập ít nhất 1 chỉ số xét nghiệm, liều thuốc hoặc triệu chứng.', 'warn');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveLabResult(entry);
      setFormModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Nạp nhanh 12 mốc lịch sử từ Sheet Data của Mẹ Bạch Yến (2022–2025)
  const handleQuickLoadBachYenPresets = async () => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const existingByDate = new Map<string, LabResultEntry>();
      for (const item of labResults) {
        existingByDate.set(normalizeDateStr(item.date), { ...item });
      }

      let count = 0;
      for (const preset of BACH_YEN_LEGACY_DATA_PRESETS) {
        const prev = existingByDate.get(preset.date);
        const merged: LabResultEntry = {
          ...(prev || {}),
          ...preset,
          id: prev?.id || `lab-by-${preset.date}`,
          recordedBy: prev?.recordedBy || defaultRecorder,
          createdAt: prev?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        existingByDate.set(preset.date, merged);
        await onSaveLabResult(merged);
        count++;
      }

      showToast(
        `✅ Đã nạp thành công ${count} mốc lịch sử Tuyến giáp (2022–2025) của ${patientName}!`,
        'success'
      );
      setImportModalOpen(false);
    } finally {
      setIsImporting(false);
    }
  };

  // Xử lý Import chuẩn xác 100% theo cấu trúc 24 cột Sheet "Data" & 23 cột Sheet "BiochemistryData"
  const handleImportLegacyData = async () => {
    if ((!importRawText.trim() && !importBiochemText.trim()) || isImporting) return;
    setIsImporting(true);
    try {
      const existingByDate = new Map<string, LabResultEntry>();
      const existingByTimestamp = new Map<string, LabResultEntry>();

      for (const item of labResults) {
        const normD = normalizeDateStr(item.date);
        existingByDate.set(normD, { ...item });
        if (item.legacyTimestamp) {
          existingByTimestamp.set(item.legacyTimestamp.trim(), { ...item });
        }
      }

      const touchedDates = new Set<string>();

      // BƯỚC 1: Đọc bảng Sheet "Data" (24 cột A -> X):
      // A(0):Timestamp | B(1):TieuSuBenhNhan | C(2):TinhTrangBenh | D(3):BenhLyNen | E(4):NgayXetNghiem |
      // F(5):TSH | G(6):TSH_Unit | H(7):T3 | I(8):T3_Unit | J(9):T4 | K(10):T4_Unit |
      // L(11):FT3 | M(12):FT3_Unit | N(13):FT4 | O(14):FT4_Unit | P(15):TG | Q(16):TG_Unit |
      // R(17):Anti_TG | S(18):Anti_TG_Unit | T(19):Anti_TPO | U(20):Anti_TPO_Unit |
      // V(21):LieuThuoc | W(22):TrieuChung | X(23):GhiChu
      if (importRawText.trim()) {
        const dataLines = importRawText
          .split(/\r?\n/)
          .map((l) => l.replace(/\r$/, ''))
          .filter((l) => l.trim().length > 0);

        for (const line of dataLines) {
          const cols = line.includes('\t') ? line.split('\t') : line.split(',');
          if (cols.length < 2) continue;

          const c0 = (cols[0] || '').trim();
          const c4 = (cols[4] || '').trim();

          // Bỏ qua dòng tiêu đề (Header)
          if (
            c0.toLowerCase() === 'timestamp' ||
            c0.toLowerCase() === 'ngayxetnghiem' ||
            c4.toLowerCase() === 'ngayxetnghiem'
          ) {
            continue;
          }

          // Hỗ trợ cả 2 kiểu bôi đen:
          // Kiểu 1 (Chuẩn): Copy từ cột A (Timestamp) -> NgayXetNghiem nằm ở cột E (cols[4])
          // Kiểu 2: Copy từ cột E (NgayXetNghiem) -> NgayXetNghiem nằm ở cột đầu (cols[0])
          const normC4 = normalizeDateStr(c4);
          const normC0 = normalizeDateStr(c0);

          let shift = 0;
          let parsedDate = '';
          let rawTimestamp = '';

          if (/^\d{4}-\d{2}-\d{2}$/.test(normC4)) {
            shift = 0;
            parsedDate = normC4;
            rawTimestamp = c0;
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(normC0)) {
            // Nếu c0 có giờ phút (Timestamp) nhưng cột E trống, vẫn là shift = 0; nếu c0 là YYYY-MM-DD thuần và cột 2 là TSH_Unit thì shift = -4
            const c2 = (cols[2] || '').trim();
            if (c2.includes('IU') || c2.includes('mL') || c2.includes('L')) {
              shift = -4;
              parsedDate = normC0;
            } else {
              shift = 0;
              parsedDate = normC0;
              rawTimestamp = c0;
            }
          } else {
            continue;
          }

          const getCol = (idx: number): string => {
            const actualIdx = idx + shift;
            return actualIdx >= 0 && actualIdx < cols.length ? (cols[actualIdx] || '').trim() : '';
          };

          const prevEntry =
            (rawTimestamp && existingByTimestamp.get(rawTimestamp)) ||
            existingByDate.get(parsedDate);

          const entry: LabResultEntry = prevEntry
            ? { ...prevEntry }
            : {
                id: `lab-import-${parsedDate}-${Math.random().toString(36).slice(2, 6)}`,
                date: parsedDate,
                recordedBy: defaultRecorder,
                tshTargetLevel: profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal',
                createdAt: new Date().toISOString(),
              };

          if (rawTimestamp) entry.legacyTimestamp = rawTimestamp;

          const tieuSu = getCol(1);
          const tinhTrang = getCol(2);
          const benhNen = getCol(3);

          const vTsh = parseOptionalNumber(getCol(5));
          const vT3 = parseOptionalNumber(getCol(7));
          const uT3 = getCol(8);
          const vT4 = parseOptionalNumber(getCol(9));
          const uT4 = getCol(10);
          const vFt3 = parseOptionalNumber(getCol(11));
          const uFt3 = getCol(12);
          const vFt4 = parseOptionalNumber(getCol(13));
          const uFt4 = getCol(14);
          const vTg = parseOptionalNumber(getCol(15));
          const vAntiTg = parseOptionalNumber(getCol(17));
          const vAntiTpo = parseOptionalNumber(getCol(19));
          const vDose = getCol(21);
          const vSymptoms = getCol(22);
          const vNote = getCol(23);

          if (vTsh !== undefined) entry.tsh = vTsh;
          if (vT3 !== undefined) {
            entry.t3 = vT3;
            entry.t3Unit = uT3 === 'ng/dL' ? 'ng/dL' : 'nmol/L';
          }
          if (vT4 !== undefined) {
            entry.t4 = vT4;
            entry.t4Unit = uT4 === 'nmol/L' ? 'nmol/L' : 'µg/dL';
          }
          if (vFt3 !== undefined) {
            entry.ft3 = vFt3;
            entry.ft3Unit = uFt3 === 'pmol/L' || vFt3 > 4.8 ? 'pmol/L' : 'pg/mL';
          }
          if (vFt4 !== undefined) {
            entry.ft4 = vFt4;
            entry.ft4Unit = uFt4 === 'pmol/L' || vFt4 > 5 ? 'pmol/L' : 'ng/dL';
          }
          if (vTg !== undefined) entry.tg = vTg;
          if (vAntiTg !== undefined) entry.antiTg = vAntiTg;
          if (vAntiTpo !== undefined) entry.antiTpo = vAntiTpo;
          if (vDose) entry.levothyroxineDose = vDose;

          if (vSymptoms) {
            if (entry.symptoms && !entry.symptoms.includes(vSymptoms)) {
              entry.symptoms = `${entry.symptoms} • ${vSymptoms}`;
            } else {
              entry.symptoms = vSymptoms;
            }
          }

          const noteParts = [tieuSu, tinhTrang, benhNen, vNote].filter(Boolean);
          if (noteParts.length > 0) {
            const combinedNote = noteParts.join(' • ');
            if (!entry.doctorAdvice) {
              entry.doctorAdvice = combinedNote;
            } else if (vNote && !entry.doctorAdvice.includes(vNote)) {
              entry.doctorAdvice = `${entry.doctorAdvice} • ${vNote}`;
            }
          }

          entry.updatedAt = new Date().toISOString();
          existingByDate.set(parsedDate, entry);
          if (rawTimestamp) existingByTimestamp.set(rawTimestamp, entry);
          touchedDates.add(parsedDate);
        }
      }

      // BƯỚC 2: Đọc bảng Sheet "BiochemistryData" (23 cột A -> W):
      // A(0):Timestamp | B(1):Cholesterol | C(2):Cholesterol_Unit | D(3):LDL_C | E(4):LDL_C_Unit |
      // F(5):HDL_C | G(6):HDL_C_Unit | H(7):Triglyceride | I(8):Triglyceride_Unit |
      // J(9):Glucose | K(10):Glucose_Unit | L(11):HbA1c | M(12):HbA1c_Unit |
      // N(13):Canxi | O(14):Canxi_Unit | P(15):VitaminD | Q(16):VitaminD_Unit |
      // R(17):AST | S(18):AST_Unit | T(19):ALT | U(20):ALT_Unit | V(21):Hemoglobin | W(22):Hemoglobin_Unit
      if (importBiochemText.trim()) {
        const bioLines = importBiochemText
          .split(/\r?\n/)
          .map((l) => l.replace(/\r$/, ''))
          .filter((l) => l.trim().length > 0);

        for (const line of bioLines) {
          const cols = line.includes('\t') ? line.split('\t') : line.split(',');
          if (cols.length < 2) continue;

          const rawTs = (cols[0] || '').trim();
          if (!rawTs || rawTs.toLowerCase() === 'timestamp') continue;

          // Tìm bản ghi khớp Timestamp với Sheet Data trước, nếu không có thì lấy ngày từ Timestamp
          const matchedByTs = existingByTimestamp.get(rawTs);
          const fallbackDate = normalizeDateStr(rawTs);
          const targetDate = matchedByTs ? normalizeDateStr(matchedByTs.date) : fallbackDate;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) continue;

          const entry: LabResultEntry =
            matchedByTs ||
            existingByDate.get(targetDate) || {
              id: `lab-import-${targetDate}-${Math.random().toString(36).slice(2, 6)}`,
              date: targetDate,
              legacyTimestamp: rawTs,
              recordedBy: defaultRecorder,
              tshTargetLevel: profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal',
              createdAt: new Date().toISOString(),
            };

          const vChol = parseOptionalNumber(cols[1] || '');
          const uChol = (cols[2] || '').trim();
          const vLdl = parseOptionalNumber(cols[3] || '');
          const vHdl = parseOptionalNumber(cols[5] || '');
          const vTrig = parseOptionalNumber(cols[7] || '');
          const vGlu = parseOptionalNumber(cols[9] || '');
          const uGlu = (cols[10] || '').trim();
          const vHba1c = parseOptionalNumber(cols[11] || '');
          const vCa = parseOptionalNumber(cols[13] || '');
          const uCa = (cols[14] || '').trim();
          const vVitD = parseOptionalNumber(cols[15] || '');
          const vAst = parseOptionalNumber(cols[17] || '');
          const vAlt = parseOptionalNumber(cols[19] || '');
          const vHb = parseOptionalNumber(cols[21] || '');

          if (vChol !== undefined) {
            entry.cholesterol = vChol;
            entry.lipidUnit = uChol === 'mg/dL' || vChol > 25 ? 'mg/dL' : 'mmol/L';
          }
          if (vLdl !== undefined) entry.ldlC = vLdl;
          if (vHdl !== undefined) entry.hdlC = vHdl;
          if (vTrig !== undefined) entry.triglyceride = vTrig;
          if (vGlu !== undefined) {
            entry.glucose = vGlu;
            entry.glucoseUnit = uGlu === 'mg/dL' || vGlu > 25 ? 'mg/dL' : 'mmol/L';
          }
          if (vHba1c !== undefined) entry.hba1c = vHba1c;
          if (vCa !== undefined) {
            entry.calcium = vCa;
            entry.calciumUnit = uCa === 'mg/dL' || vCa > 5 ? 'mg/dL' : 'mmol/L';
          }
          if (vVitD !== undefined) entry.vitaminD = vVitD;
          if (vAst !== undefined) entry.ast = vAst;
          if (vAlt !== undefined) entry.alt = vAlt;
          if (vHb !== undefined) entry.hemoglobin = vHb;

          entry.updatedAt = new Date().toISOString();
          existingByDate.set(targetDate, entry);
          existingByTimestamp.set(rawTs, entry);
          touchedDates.add(targetDate);
        }
      }

      let importedCount = 0;
      for (const d of touchedDates) {
        const entryToSave = existingByDate.get(d);
        if (entryToSave) {
          await onSaveLabResult(entryToSave);
          importedCount++;
        }
      }

      if (importedCount > 0) {
        showToast(
          `✅ Đã nhập & đồng bộ thành công ${importedCount} đợt xét nghiệm của ${patientDisplayName}!`,
          'success'
        );
        setImportRawText('');
        setImportBiochemText('');
        setImportModalOpen(false);
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

  // Dữ liệu cho Biểu đồ Recharts
  const chartData = useMemo(() => {
    return sortedLabsAsc.map((item) => ({
      date: fmtDateAxis(item.date),
      fullDate: fmtDateShort(item.date),
      dose: item.levothyroxineDose || '',
      tsh: item.tsh,
      ft4: item.ft4,
      t3: item.t3,
      ft3: item.ft3,
      tg: item.tg,
      cholesterol: item.cholesterol,
      ldlC: item.ldlC,
      hdlC: item.hdlC,
      triglyceride: item.triglyceride,
      glucose: item.glucose,
      hba1c: item.hba1c,
      calcium: item.calcium,
      vitaminD: item.vitaminD,
      ast: item.ast,
      alt: item.alt,
      creatinine: item.creatinine,
      hemoglobin: item.hemoglobin,
    }));
  }, [sortedLabsAsc]);

  // Tính chênh lệch so với lần khám liền trước
  const getDeltaText = (key: string, currentVal: number): string | null => {
    if (!previousLab) return null;
    const prevVal = (previousLab as unknown as Record<string, unknown>)[key];
    if (typeof prevVal !== 'number' || isNaN(prevVal)) return null;
    const diff = Number((currentVal - prevVal).toFixed(2));
    if (diff === 0) return 'Không đổi so với lần trước';
    return diff > 0 ? `↑ +${diff} so với lần trước` : `↓ ${diff} so với lần trước`;
  };

  const filteredLatestIndicators = useMemo(() => {
    if (!latestEval) return [];
    if (groupFilter === 'all') return latestEval.indicators;
    if (groupFilter === 'thyroid') {
      return latestEval.indicators.filter(
        (i) => i.group === 'thyroid' || i.group === 'markers'
      );
    }
    return latestEval.indicators.filter((i) => i.group === groupFilter);
  }, [latestEval, groupFilter]);

  return (
    <div className="space-y-4">
      {/* ===== BANNER ĐẦU TRANG: HỒ SƠ XÉT NGHIỆM & HÓA SINH ===== */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white p-4 sm:p-5 shadow-sm border border-teal-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase">
                🔬 Xét Nghiệm & Hóa Sinh
              </span>
              <span className="text-xs font-bold text-teal-100">
                • Hồ sơ: {patientName} ({patientDisplayName})
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black leading-snug">
              Sổ Theo Dõi Chỉ Số Xét Nghiệm Định Kỳ ({sortedLabsDesc.length} lần khám)
            </h2>
            <p className="text-xs sm:text-sm text-teal-100 font-medium leading-relaxed">
              {profileType === 'thyroid_post_op'
                ? 'Theo dõi chuyên sâu Tuyến giáp (TSH, FT4, FT3, TG, Anti-TG & Liều thuốc Levothyroxine), Canxi, Vitamin D, Bộ Mỡ máu & Đường huyết'
                : patientDiagnosis ||
                  'Theo dõi Bộ Mỡ máu (Cholesterol, LDL-C, Triglyceride), Đường huyết (Glucose, HbA1c), Gan Thận & Tuyến giáp'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition cursor-pointer"
              title="Dán dữ liệu từ Google Sheet Tuyến Giáp cũ (Data / BiochemistryData)"
            >
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>Nhập từ Sheet cũ</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span>Nhập Kết Quả Xét Nghiệm</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== TRẠNG THÁI CHƯA CÓ DỮ LIỆU XÉT NGHIỆM ===== */}
      {sortedLabsDesc.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-teal-300 p-6 sm:p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
            <FlaskConical className="w-7 h-7" />
          </div>
          <div className="max-w-lg mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Chưa có kết quả xét nghiệm nào của {patientDisplayName} ({patientName})
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Bạn có thể bấm <strong>Nhập Kết Quả Xét Nghiệm</strong> để lưu các chỉ số mới đi khám về, hoặc bấm{' '}
              <strong>Nhập từ Sheet cũ</strong> để dán nhanh toàn bộ lịch sử từ bảng Google Sheet Tuyến giáp trước đây.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nhập kết quả xét nghiệm đầu tiên</span>
            </button>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-sm font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Dán lịch sử từ Google Sheet cũ</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ===== PHẦN 1: TỔNG HỢP LẦN XÉT NGHIỆM GẦN NHẤT & ĐỐI CHIẾU NGƯỠNG MỤC TIÊU ===== */}
          {latestLab && latestEval && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-teal-100 text-teal-900 text-xs font-extrabold">
                      📅 Lần khám gần nhất: {fmtDateShort(latestLab.date)}
                    </span>
                    {latestLab.facility && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {latestLab.facility}
                      </span>
                    )}
                    {latestLab.levothyroxineDose && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-950 border border-amber-300 text-xs font-black inline-flex items-center gap-1">
                        <Pill className="w-3.5 h-3.5 text-amber-700" />
                        Liều thuốc giáp: {latestLab.levothyroxineDose}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Bảng Đánh Giá Chỉ Số Xét Nghiệm • {patientName}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(latestLab)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa lần khám này</span>
                  </button>
                </div>
              </div>

              {/* Bộ lọc nhóm chỉ số */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'Tất cả chỉ số' },
                  { id: 'thyroid', label: '🦋 Tuyến giáp & Markers' },
                  { id: 'lipid', label: '❤️ Bộ Mỡ máu' },
                  { id: 'metabolic', label: '🦴 Đường huyết & Canxi/VitD' },
                  { id: 'liver_kidney', label: '🧪 Gan, Thận & Huyết học' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setGroupFilter(
                        tab.id as 'all' | 'thyroid' | 'lipid' | 'metabolic' | 'liver_kidney'
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                      groupFilter === tab.id
                        ? 'bg-teal-800 text-white border-teal-900 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Grid các thẻ chỉ số */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredLatestIndicators.map((ind: LabIndicatorEval) => {
                  const delta = getDeltaText(ind.key, ind.value);
                  return (
                    <div
                      key={ind.key}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-extrabold text-slate-700 leading-snug">
                            {ind.label}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold border shrink-0 ${ind.badgeClass}`}
                          >
                            {ind.badgeText}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5 pt-0.5">
                          <span className="text-2xl font-black text-slate-900">
                            {ind.value}
                          </span>
                          <span className="text-xs font-bold text-slate-500">
                            {ind.unit}
                          </span>
                          {delta && (
                            <span className="ml-auto text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {delta}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500">
                          Ngưỡng chuẩn / Đích: <strong className="text-slate-700">{ind.refText}</strong>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 font-medium bg-white rounded-xl p-2 border border-slate-200/80 leading-relaxed">
                        💡 {ind.clinicalNote}
                      </p>
                    </div>
                  );
                })}

                {/* Hiển thị thêm các chỉ số mở rộng tự định nghĩa (nếu có) */}
                {groupFilter === 'all' &&
                  Array.isArray(latestLab.customLabs) &&
                  latestLab.customLabs.map((cl) => (
                    <div
                      key={cl.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-slate-700">
                            {cl.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            Chỉ số mở rộng
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5 pt-1">
                          <span className="text-2xl font-black text-slate-900">
                            {cl.value}
                          </span>
                          {cl.unit && (
                            <span className="text-xs font-bold text-slate-500">
                              {cl.unit}
                            </span>
                          )}
                        </div>
                        {cl.refRange && (
                          <div className="text-[11px] font-semibold text-slate-500 mt-1">
                            Tham chiếu: <strong className="text-slate-700">{cl.refRange}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Hộp Nhận định Tổng hợp & Liên kết Huyết áp / Nhịp tim hằng ngày */}
              <div className="rounded-2xl bg-teal-50/80 border border-teal-200 p-3.5 sm:p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-black text-teal-950">
                  <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Tổng hợp Nhận định Y khoa & Liên kết Sinh hiệu hằng ngày ({patientDisplayName})</span>
                </div>

                {latestEval.summaryPoints.length > 0 ? (
                  <ul className="space-y-1 text-xs sm:text-sm text-slate-800 font-semibold list-disc pl-5">
                    {latestEval.summaryPoints.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs sm:text-sm text-emerald-900 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Các chỉ số xét nghiệm trong đợt khám này đều nằm trong vùng mục tiêu an toàn.</span>
                  </p>
                )}

                {/* Liên kết với Nhịp tim & Huyết áp thực tế gần đây */}
                {recentVitalsSummary && (
                  <div className="pt-2 border-t border-teal-200/70 text-xs text-teal-950 font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Activity className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>
                        Sinh hiệu trung bình ({recentVitalsSummary.count} lần đo gần nhất):{' '}
                        <strong>
                          HA {recentVitalsSummary.avgSys}/{recentVitalsSummary.avgDia} mmHg
                        </strong>
                        {recentVitalsSummary.avgPulse
                          ? ` • Nhịp tim ${recentVitalsSummary.avgPulse} lần/phút`
                          : ''}
                      </span>
                    </div>
                    {profileType === 'thyroid_post_op' && recentVitalsSummary.avgPulse && (
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-[11px] font-bold text-teal-900">
                        {recentVitalsSummary.avgPulse >= 92
                          ? '⚠️ Mạch nghỉ hơi nhanh (≥92 l/p): Chú ý đối chiếu TSH/FT4 & liều Levothyroxine'
                          : recentVitalsSummary.avgPulse < 60
                            ? '⚠️ Mạch nghỉ hơi chậm (<60 l/p): Chú ý dấu hiệu thiếu hormone giáp'
                            : '✅ Nhịp tim êm (60–90 l/p): Đáp ứng tốt với liều thuốc giáp hiện tại'}
                      </span>
                    )}
                  </div>
                )}

                {latestLab.symptoms && (
                  <div className="pt-2 border-t border-teal-200/70 text-xs sm:text-sm text-rose-900 font-bold">
                    ⚠️ Triệu chứng lâm sàng đợt khám: <span className="font-semibold">{latestLab.symptoms}</span>
                  </div>
                )}

                {latestLab.doctorAdvice && (
                  <div className="pt-2 border-t border-teal-200/70 text-xs sm:text-sm text-slate-900 font-bold">
                    🩺 Tiền sử / Lời dặn Bác sĩ: <span className="font-semibold">{latestLab.doctorAdvice}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== PHẦN 2: BIỂU ĐỒ XU HƯỚNG QUA CÁC KỲ KHÁM ===== */}
          {sortedLabsAsc.length >= 1 && (
            <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-700 shrink-0" />
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Biểu Đồ Xu Hướng Xét Nghiệm Qua Các Kỳ Khám
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'thyroid', label: '🦋 Tuyến giáp (TSH • FT4 • T3 • TG)' },
                    { id: 'lipid', label: '❤️ Bộ Mỡ máu' },
                    { id: 'metabolic', label: '🦴 Đường huyết & Canxi/VitD' },
                    { id: 'liver_kidney', label: '🧪 Men Gan & Thận' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setChartTab(t.id as ChartCategory)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                        chartTab === t.id
                          ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-72 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartTab === 'thyroid' ? (
                    <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fontWeight: 700 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '14px',
                          border: '1px solid #cbd5e1',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                      <ReferenceLine
                        yAxisId="left"
                        y={0.5}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        label={{ value: 'Đích TSH ≤0.5', position: 'insideTopLeft', fontSize: 11, fill: '#047857' }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="tsh"
                        name="TSH (µIU/mL)"
                        stroke="#0f766e"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="t3"
                        name="T3 (nmol/L)"
                        stroke="#d97706"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="ft4"
                        name="FT4 (pmol/L)"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="tg"
                        name="TG Marker (ng/mL)"
                        stroke="#e11d48"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    </ComposedChart>
                  ) : chartTab === 'lipid' ? (
                    <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '14px',
                          border: '1px solid #cbd5e1',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                      <Line
                        type="monotone"
                        dataKey="cholesterol"
                        name="Cholesterol TP"
                        stroke="#d97706"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="ldlC"
                        name="LDL-C (Mỡ xấu)"
                        stroke="#e11d48"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="triglyceride"
                        name="Triglyceride"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="hdlC"
                        name="HDL-C (Mỡ tốt)"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    </ComposedChart>
                  ) : chartTab === 'metabolic' ? (
                    <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fontWeight: 700 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '14px',
                          border: '1px solid #cbd5e1',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="glucose"
                        name="Glucose máu"
                        stroke="#ea580c"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="hba1c"
                        name="HbA1c (%)"
                        stroke="#dc2626"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="calcium"
                        name="Canxi máu"
                        stroke="#0284c7"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="vitaminD"
                        name="Vitamin D (ng/mL)"
                        stroke="#059669"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    </ComposedChart>
                  ) : (
                    <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fontWeight: 700 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '14px',
                          border: '1px solid #cbd5e1',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                      <Line
                        type="monotone"
                        dataKey="ast"
                        name="AST / GOT (U/L)"
                        stroke="#d97706"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="alt"
                        name="ALT / GPT (U/L)"
                        stroke="#e11d48"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="creatinine"
                        name="Creatinine (µmol/L)"
                        stroke="#0284c7"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ===== PHẦN 3: DANH SÁCH LỊCH SỬ CÁC LẦN XÉT NGHIỆM (ĐẦY ĐỦ CRUD SỬA / XÓA) ===== */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                📋 Lịch Sử Các Đợt Xét Nghiệm Của {patientName} ({sortedLabsDesc.length} đợt)
              </h3>
              <button
                type="button"
                onClick={openAddModal}
                className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm đợt mới</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {sortedLabsDesc.map((entry) => {
                const evalRes = evaluateLabEntry(entry, profileType);
                const isExpanded = expandedHistoryId === entry.id;
                return (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden transition"
                  >
                    <div
                      onClick={() =>
                        setExpandedHistoryId(isExpanded ? null : entry.id)
                      }
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-100/70 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm sm:text-base font-black text-slate-900">
                            📅 {fmtDateShort(entry.date)}
                          </span>
                          {entry.facility && (
                            <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-xs font-bold text-slate-700">
                              🏥 {entry.facility}
                            </span>
                          )}
                          {entry.levothyroxineDose && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-xs font-black text-amber-950">
                              💊 Liều giáp: {entry.levothyroxineDose}
                            </span>
                          )}
                          {entry.symptoms && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
                              ⚠️ Triệu chứng: {entry.symptoms}
                            </span>
                          )}
                        </div>

                        {/* Tóm tắt nhanh các chỉ số trong đợt khám */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          {evalRes.indicators.map((ind) => (
                            <span
                              key={ind.key}
                              className={`px-2 py-0.5 rounded-lg text-xs font-extrabold border ${ind.badgeClass}`}
                            >
                              {ind.shortLabel}: {ind.value} {ind.unit}
                            </span>
                          ))}
                          {Array.isArray(entry.customLabs) &&
                            entry.customLabs.map((cl) => (
                              <span
                                key={cl.id}
                                className="px-2 py-0.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700"
                              >
                                {cl.name}: {cl.value} {cl.unit || ''}
                              </span>
                            ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(entry);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-teal-50 text-teal-800 border border-slate-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                `Bạn có chắc muốn xóa kết quả xét nghiệm ngày ${fmtDateShort(entry.date)} của ${patientDisplayName}?`
                              )
                            ) {
                              void onDeleteLabResult(entry.id);
                            }
                          }}
                          className="p-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 cursor-pointer"
                          title="Xóa đợt xét nghiệm này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="p-1 text-slate-500">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3.5 pt-2 border-t border-slate-200 bg-white space-y-2 text-xs">
                        {entry.symptoms && (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 font-semibold">
                            ⚠️ <strong>Triệu chứng lâm sàng đợt khám:</strong> {entry.symptoms}
                          </div>
                        )}
                        {entry.doctorAdvice && (
                          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 font-semibold">
                            🩺 <strong>Tiền sử / Lời dặn Bác sĩ:</strong> {entry.doctorAdvice}
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {evalRes.indicators.map((ind) => (
                            <div
                              key={ind.key}
                              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-slate-800">
                                  {ind.label}
                                </span>
                                <span className="font-black text-slate-900">
                                  {ind.value} {ind.unit}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Tham chiếu: {ind.refText} • {ind.badgeText}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ===== MODAL NHẬP / SỬA KẾT QUẢ XÉT NGHIỆM (ĐẦY ĐỦ 5 NHÓM + CHỈ SỐ TÙY CHỈNH) ===== */}
      {formModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
          onClick={() => setFormModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border-2 border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 py-4 bg-teal-900 text-white flex items-center justify-between gap-2 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-black">
                  {editingId
                    ? `✏️ Chỉnh Sửa Kết Quả Xét Nghiệm (${fmtDateShort(date)})`
                    : `➕ Nhập Kết Quả Xét Nghiệm Mới • ${patientName}`}
                </h3>
                <p className="text-xs text-teal-100">
                  Phiếu có chỉ số nào thì nhập chỉ số đó (không bắt buộc nhập hết tất cả các ô)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitForm}
              className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1"
            >
              {/* THÔNG TIN CHUNG */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-black uppercase text-slate-700 tracking-wide">
                  1. Thông tin đợt khám & xét nghiệm
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      📅 Ngày xét nghiệm *
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      🏥 Bệnh viện / Cơ sở xét nghiệm
                    </label>
                    <input
                      type="text"
                      value={facility}
                      onChange={(e) => setFacility(e.target.value)}
                      placeholder="VD: BV Nội Tiết TW, Medlatec..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      ✍️ Người lưu kết quả
                    </label>
                    <input
                      type="text"
                      value={recordedBy}
                      onChange={(e) => setRecordedBy(e.target.value)}
                      placeholder="VD: Con Long, Mẹ..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500">Chọn nhanh nơi khám:</span>
                  {QUICK_FACILITIES.map((fac) => (
                    <button
                      key={fac}
                      type="button"
                      onClick={() => setFacility(fac)}
                      className="px-2 py-0.5 rounded-lg bg-white hover:bg-teal-50 text-slate-700 border border-slate-200 text-[11px] font-bold cursor-pointer"
                    >
                      {fac}
                    </button>
                  ))}
                </div>
              </div>

              {/* NHÓM 1 & 2: CHỈ SỐ TUYẾN GIÁP, MARKERS & LIỀU THUỐC HORMONE */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs sm:text-sm font-black text-teal-950">
                    🦋 2. Chức năng Tuyến giáp, Markers (TG, Anti-TG) & Liều thuốc Levothyroxine
                  </div>
                  <select
                    value={tshTargetLevel}
                    onChange={(e) => setTshTargetLevel(e.target.value as TshTargetLevel)}
                    className="px-2.5 py-1 rounded-xl border border-teal-300 bg-white text-xs font-bold text-teal-900"
                  >
                    <option value="moderate_risk">Mục tiêu ức chế TSH vừa (0.1 – 0.5 µIU/mL)</option>
                    <option value="high_risk">Mục tiêu ức chế TSH cao (&lt; 0.1 µIU/mL)</option>
                    <option value="normal">Mục tiêu TSH bình thường (0.4 – 4.0 µIU/mL)</option>
                  </select>
                </div>

                {/* Liều thuốc Levothyroxine */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    💊 Liều thuốc Hormone Tuyến giáp đang dùng (Levothyroxine / Berlthyrox / Euthyrox)
                  </label>
                  <input
                    type="text"
                    value={levothyroxineDose}
                    onChange={(e) => setLevothyroxineDose(e.target.value)}
                    placeholder="VD: 100mcg, 125mcg, hoặc 100x6 125x1..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <span className="text-[11px] font-bold text-slate-500">Chọn nhanh liều:</span>
                    {QUICK_DOSES.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setLevothyroxineDose(d)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-extrabold border cursor-pointer ${
                          levothyroxineDose === d
                            ? 'bg-teal-700 text-white border-teal-800'
                            : 'bg-white hover:bg-teal-100 text-teal-900 border-teal-200'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      TSH (µIU/mL)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tsh}
                      onChange={(e) => setTsh(e.target.value)}
                      placeholder="VD: 0.18"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-extrabold text-slate-700">FT4</label>
                      <select
                        value={ft4Unit}
                        onChange={(e) => setFt4Unit(e.target.value as 'ng/dL' | 'pmol/L')}
                        className="text-[11px] font-bold bg-white border border-slate-300 rounded px-1"
                      >
                        <option value="ng/dL">ng/dL</option>
                        <option value="pmol/L">pmol/L</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ft4}
                      onChange={(e) => setFt4(e.target.value)}
                      placeholder={ft4Unit === 'ng/dL' ? 'VD: 1.45' : 'VD: 18.5'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-extrabold text-slate-700">FT3</label>
                      <select
                        value={ft3Unit}
                        onChange={(e) => setFt3Unit(e.target.value as 'pg/mL' | 'pmol/L')}
                        className="text-[11px] font-bold bg-white border border-slate-300 rounded px-1"
                      >
                        <option value="pg/mL">pg/mL</option>
                        <option value="pmol/L">pmol/L</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ft3}
                      onChange={(e) => setFt3(e.target.value)}
                      placeholder={ft3Unit === 'pg/mL' ? 'VD: 3.1' : 'VD: 4.8'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-extrabold text-slate-700">T3 toàn phần</label>
                      <select
                        value={t3Unit}
                        onChange={(e) => setT3Unit(e.target.value as 'nmol/L' | 'ng/dL')}
                        className="text-[11px] font-bold bg-white border border-slate-300 rounded px-1"
                      >
                        <option value="nmol/L">nmol/L</option>
                        <option value="ng/dL">ng/dL</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={t3}
                      onChange={(e) => setT3(e.target.value)}
                      placeholder={t3Unit === 'nmol/L' ? 'VD: 1.54' : 'VD: 110'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-extrabold text-slate-700">T4 toàn phần</label>
                      <select
                        value={t4Unit}
                        onChange={(e) => setT4Unit(e.target.value as 'µg/dL' | 'nmol/L')}
                        className="text-[11px] font-bold bg-white border border-slate-300 rounded px-1"
                      >
                        <option value="µg/dL">µg/dL</option>
                        <option value="nmol/L">nmol/L</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={t4}
                      onChange={(e) => setT4(e.target.value)}
                      placeholder={t4Unit === 'µg/dL' ? 'VD: 8.5' : 'VD: 105'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      TG - Thyroglobulin (ng/mL)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tg}
                      onChange={(e) => setTg(e.target.value)}
                      placeholder="VD: 0.04"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Anti-TG (U/mL • IU/mL)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={antiTg}
                      onChange={(e) => setAntiTg(e.target.value)}
                      placeholder="VD: 19.44"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Anti-TPO (IU/mL)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={antiTpo}
                      onChange={(e) => setAntiTpo(e.target.value)}
                      placeholder="VD: 10.2"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* NHÓM 3: BỘ MỠ MÁU — TIM MẠCH */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs sm:text-sm font-black text-amber-950">
                    ❤️ 3. Bộ Mỡ Máu — Tim Mạch (Cholesterol, Triglyceride, HDL-C, LDL-C)
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>Đơn vị phiếu khám:</span>
                    <select
                      value={lipidUnit}
                      onChange={(e) => setLipidUnit(e.target.value as 'mmol/L' | 'mg/dL')}
                      className="px-2 py-1 rounded-lg border border-amber-300 bg-white font-extrabold text-amber-950"
                    >
                      <option value="mmol/L">mmol/L (Phổ biến tại VN)</option>
                      <option value="mg/dL">mg/dL</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Cholesterol TP ({lipidUnit})
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cholesterol}
                      onChange={(e) => setCholesterol(e.target.value)}
                      placeholder={lipidUnit === 'mmol/L' ? '< 5.2' : '< 200'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Triglyceride ({lipidUnit})
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={triglyceride}
                      onChange={(e) => setTriglyceride(e.target.value)}
                      placeholder={lipidUnit === 'mmol/L' ? '< 1.7' : '< 150'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      HDL-C • Mỡ tốt ({lipidUnit})
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={hdlC}
                      onChange={(e) => setHdlC(e.target.value)}
                      placeholder={lipidUnit === 'mmol/L' ? '> 1.15' : '> 45'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      LDL-C • Mỡ xấu ({lipidUnit})
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ldlC}
                      onChange={(e) => setLdlC(e.target.value)}
                      placeholder={lipidUnit === 'mmol/L' ? '< 2.6' : '< 100'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* NHÓM 4: ĐƯỜNG HUYẾT, CANXI & VITAMIN D */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-3">
                <div className="text-xs sm:text-sm font-black text-sky-950">
                  🦴 4. Đường Huyết, Canxi Máu & Vitamin D (Quan trọng sau mổ Tuyến giáp & Người lớn tuổi)
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-extrabold text-slate-700">Glucose</label>
                      <select
                        value={glucoseUnit}
                        onChange={(e) => setGlucoseUnit(e.target.value as 'mmol/L' | 'mg/dL')}
                        className="text-[10px] font-bold bg-white border border-slate-300 rounded px-1"
                      >
                        <option value="mmol/L">mmol/L</option>
                        <option value="mg/dL">mg/dL</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={glucose}
                      onChange={(e) => setGlucose(e.target.value)}
                      placeholder={glucoseUnit === 'mmol/L' ? '3.9–5.6' : '70–100'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      HbA1c (%)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={hba1c}
                      onChange={(e) => setHba1c(e.target.value)}
                      placeholder="< 5.7%"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-extrabold text-slate-700">Canxi TP</label>
                      <select
                        value={calciumUnit}
                        onChange={(e) => setCalciumUnit(e.target.value as 'mmol/L' | 'mg/dL')}
                        className="text-[10px] font-bold bg-white border border-slate-300 rounded px-1"
                      >
                        <option value="mmol/L">mmol/L</option>
                        <option value="mg/dL">mg/dL</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={calcium}
                      onChange={(e) => setCalcium(e.target.value)}
                      placeholder={calciumUnit === 'mmol/L' ? '2.15–2.55' : '8.6–10.2'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Canxi ion Ca++
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ionizedCalcium}
                      onChange={(e) => setIonizedCalcium(e.target.value)}
                      placeholder="1.10–1.35"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Vitamin D (ng/mL)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={vitaminD}
                      onChange={(e) => setVitaminD(e.target.value)}
                      placeholder="30–100"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* NHÓM 5: CHỨC NĂNG GAN, THẬN & HUYẾT HỌC */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs sm:text-sm font-black text-slate-800">
                  🧪 5. Chức năng Gan, Thận & Huyết học (AST, ALT, Creatinine, Ure, Acid Uric, Hemoglobin)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      AST / GOT (U/L)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={ast}
                      onChange={(e) => setAst(e.target.value)}
                      placeholder="< 40 U/L"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      ALT / GPT (U/L)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={alt}
                      onChange={(e) => setAlt(e.target.value)}
                      placeholder="< 40 U/L"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Creatinine (µmol/L)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={creatinine}
                      onChange={(e) => setCreatinine(e.target.value)}
                      placeholder="53–110 µmol/L"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Ure máu (mmol/L)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={urea}
                      onChange={(e) => setUrea(e.target.value)}
                      placeholder="2.5–7.5 mmol/L"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Acid Uric (µmol/L)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={uricAcid}
                      onChange={(e) => setUricAcid(e.target.value)}
                      placeholder="150–400 µmol/L"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Hemoglobin (g/L hoặc g/dL)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={hemoglobin}
                      onChange={(e) => setHemoglobin(e.target.value)}
                      placeholder="VD: 135 g/L (hoặc 13.5)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-black text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* NHÓM 6: CHỈ SỐ MỞ RỘNG TỰ ĐỊNH NGHĨA (CRUD LINH HOẠT) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase">
                    6. Chỉ số xét nghiệm khác (Tùy chỉnh thêm nếu có)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCustomLabRow}
                    className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm chỉ số khác</span>
                  </button>
                </div>

                {customLabs.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleUpdateCustomLabRow(idx, 'name', e.target.value)}
                      placeholder="Tên chỉ số (VD: Kali, Ferritin...)"
                      className="col-span-4 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                    />
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => handleUpdateCustomLabRow(idx, 'value', e.target.value)}
                      placeholder="Giá trị"
                      className="col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-black bg-white"
                    />
                    <input
                      type="text"
                      value={item.unit || ''}
                      onChange={(e) => handleUpdateCustomLabRow(idx, 'unit', e.target.value)}
                      placeholder="Đơn vị"
                      className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <input
                      type="text"
                      value={item.refRange || ''}
                      onChange={(e) => handleUpdateCustomLabRow(idx, 'refRange', e.target.value)}
                      placeholder="Ngưỡng chuẩn"
                      className="col-span-2 px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomLabRow(idx)}
                      className="col-span-1 p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* TRIỆU CHỨNG LÂM SÀNG & LỜI DẶN BÁC SĨ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    ⚠️ Triệu chứng lâm sàng đợt khám (Mệt mỏi, tim đập nhanh, tê tay...)
                  </label>
                  <textarea
                    rows={2}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="VD: mệt mỏi, tim đập nhanh, đau họng..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    🩺 Kết luận / Lời dặn của Bác sĩ (Siêu âm, chỉnh liều, hẹn tái khám...)
                  </label>
                  <textarea
                    rows={2}
                    value={doctorAdvice}
                    onChange={(e) => setDoctorAdvice(e.target.value)}
                    placeholder="VD: Hố mổ tuyến giáp sạch, duy trì Berlthyrox 100mcg sáng lúc đói..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu Kết Quả Xét Nghiệm'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL NHẬP NHANH DỮ LIỆU TỪ GOOGLE SHEET TUYẾN GIÁP CŨ ===== */}
      {importModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setImportModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border-2 border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-teal-900 text-white flex items-center justify-between gap-2 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-black">
                  📥 Nhập Lịch Sử Từ Google Sheet Tuyến Giáp Cũ ({patientName})
                </h3>
                <p className="text-xs text-teal-100">
                  Hỗ trợ chuẩn xác cấu trúc 24 cột Sheet <strong>Data</strong> (A→X) &amp; 23 cột Sheet{' '}
                  <strong>BiochemistryData</strong> (A→W)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {/* NÚT 1-CHẠM NẠP NGAY 12 MỐC LỊCH SỬ TỪ SHEET DATA CỦA MẸ BẠCH YẾN */}
              {profileType === 'thyroid_post_op' && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border-2 border-teal-300 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs sm:text-sm font-black text-teal-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>Cách 1 (Khuyên dùng - 1 chạm): Nạp sẵn 12 đợt khám từ Sheet &quot;Data&quot; của Mẹ Bạch Yến</span>
                    </div>
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={handleQuickLoadBachYenPresets}
                      className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>⚡ Nạp ngay 12 mốc lịch sử (2022–2025)</span>
                    </button>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-700 leading-relaxed">
                    Đã trích xuất chuẩn xác toàn bộ 12 mốc khám từ ngày <strong>01/09/2022 → 29/10/2025</strong> (gồm TSH, T3, FT4, TG, Anti-TG, Liều thuốc 100mcg / 100x5 50x2 / 100mcgx6 &amp; Triệu chứng) kèm sẵn mã <code>Timestamp</code> gốc để tự động khớp nếu bạn dán thêm bảng <strong>BiochemistryData</strong> bên dưới.
                  </p>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Cách 2: Copy &amp; Paste trực tiếp từ Google Sheet cũ:</span>
                </div>
                <p>
                  Bôi đen các dòng dữ liệu từ <strong>Cột A (Timestamp)</strong> đến cột cuối (có thể copy cả dòng tiêu đề dòng 1), bấm{' '}
                  <strong>Ctrl + C</strong> rồi dán (<strong>Ctrl + V</strong>) vào ô tương ứng bên dưới. Hệ thống tự động lấy cột E (<code>NgayXetNghiem</code>) làm ngày khám và tự động nối bảng <strong>BiochemistryData</strong> với bảng <strong>Data</strong> qua cột A (<code>Timestamp</code>).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-800">
                  1️⃣ Ô dán bảng Sheet &quot;Data&quot; (Cột A → Cột X: Timestamp, Tiểu sử, Tình trạng, Bệnh nền, NgayXetNghiem, TSH, T3, T4, FT3, FT4, TG, Anti_TG, Anti_TPO, LieuThuoc, TrieuChung, GhiChu)
                </label>
                <textarea
                  rows={5}
                  value={importRawText}
                  onChange={(e) => setImportRawText(e.target.value)}
                  placeholder="Dán các dòng đã copy từ trang tính Data vào đây..."
                  className="w-full p-3 rounded-2xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-800">
                  2️⃣ Ô dán bảng Sheet &quot;BiochemistryData&quot; (Tùy chọn • Cột A → Cột W: Timestamp, Cholesterol, LDL_C, HDL_C, Triglyceride, Glucose, HbA1c, Canxi, VitaminD, AST, ALT, Hemoglobin)
                </label>
                <textarea
                  rows={4}
                  value={importBiochemText}
                  onChange={(e) => setImportBiochemText(e.target.value)}
                  placeholder="Nếu có dữ liệu ở sheet BiochemistryData, dán vào đây để hệ thống tự gộp theo Timestamp..."
                  className="w-full p-3 rounded-2xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={isImporting || (!importRawText.trim() && !importBiochemText.trim())}
                  onClick={handleImportLegacyData}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isImporting ? 'Đang xử lý & lưu...' : `Nhập dữ liệu đã dán vào hồ sơ ${patientName}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
