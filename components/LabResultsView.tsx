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
  '50mcg',
  '62.5mcg',
  '75mcg',
  '87.5mcg',
  '100mcg',
  '112.5mcg',
  '125mcg',
  '100x6 125x1',
  '100x5 125x2',
  '75x5 100x2',
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

  // Modal Nhập nhanh từ bảng Google Sheet cũ (Data / BiochemistryData)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importSheetType, setImportSheetType] = useState<'thyroid_data' | 'biochem_data'>('thyroid_data');
  const [isImporting, setIsImporting] = useState(false);

  // State các trường trong Form
  const [date, setDate] = useState(() => getVietnamDateStr());
  const [facility, setFacility] = useState('');
  const [recordedBy, setRecordedBy] = useState(defaultRecorder);
  const [doctorAdvice, setDoctorAdvice] = useState('');

  // Tuyến giáp & Markers
  const [levothyroxineDose, setLevothyroxineDose] = useState('');
  const [tshTargetLevel, setTshTargetLevel] = useState<TshTargetLevel>(
    profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal'
  );
  const [tsh, setTsh] = useState('');
  const [ft4, setFt4] = useState('');
  const [ft4Unit, setFt4Unit] = useState<'ng/dL' | 'pmol/L'>('ng/dL');
  const [ft3, setFt3] = useState('');
  const [ft3Unit, setFt3Unit] = useState<'pg/mL' | 'pmol/L'>('pg/mL');
  const [t4, setT4] = useState('');
  const [t3, setT3] = useState('');
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
    setDoctorAdvice('');
    setLevothyroxineDose(latestLab?.levothyroxineDose || '');
    setTshTargetLevel(
      latestLab?.tshTargetLevel ||
        (profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal')
    );
    setTsh('');
    setFt4('');
    setFt4Unit(latestLab?.ft4Unit || 'ng/dL');
    setFt3('');
    setFt3Unit(latestLab?.ft3Unit || 'pg/mL');
    setT4('');
    setT3('');
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
    setDoctorAdvice(entry.doctorAdvice || '');
    setLevothyroxineDose(entry.levothyroxineDose || '');
    setTshTargetLevel(
      entry.tshTargetLevel ||
        (profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal')
    );
    setTsh(entry.tsh !== undefined ? String(entry.tsh) : '');
    setFt4(entry.ft4 !== undefined ? String(entry.ft4) : '');
    setFt4Unit(entry.ft4Unit || 'ng/dL');
    setFt3(entry.ft3 !== undefined ? String(entry.ft3) : '');
    setFt3Unit(entry.ft3Unit || 'pg/mL');
    setT4(entry.t4 !== undefined ? String(entry.t4) : '');
    setT3(entry.t3 !== undefined ? String(entry.t3) : '');
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

    const entry: LabResultEntry = {
      id: editingId || `lab-${Date.now()}`,
      date: normalizeDateStr(date),
      facility: facility.trim() || undefined,
      recordedBy: recordedBy.trim() || defaultRecorder,
      doctorAdvice: doctorAdvice.trim() || undefined,
      levothyroxineDose: levothyroxineDose.trim() || undefined,
      tshTargetLevel,
      tsh: parseOptionalNumber(tsh),
      ft4: parseOptionalNumber(ft4),
      ft4Unit,
      ft3: parseOptionalNumber(ft3),
      ft3Unit,
      t4: parseOptionalNumber(t4),
      t3: parseOptionalNumber(t3),
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
      createdAt: editingId
        ? labResults.find((l) => l.id === editingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Kiểm tra có ít nhất 1 chỉ số hoặc ghi chú được nhập
    const evalCheck = evaluateLabEntry(entry, profileType);
    if (
      evalCheck.indicators.length === 0 &&
      cleanCustomLabs.length === 0 &&
      !entry.levothyroxineDose &&
      !entry.doctorAdvice
    ) {
      showToast('Vui lòng nhập ít nhất 1 chỉ số xét nghiệm hoặc ghi chú bác sĩ.', 'warn');
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

  // Xử lý Import từ bảng Google Sheet cũ (Data hoặc BiochemistryData của dự án Tuyến Giáp)
  const handleImportLegacyData = async () => {
    if (!importRawText.trim() || isImporting) return;
    setIsImporting(true);
    try {
      const lines = importRawText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      let importedCount = 0;
      const existingByDate = new Map<string, LabResultEntry>();
      for (const item of labResults) {
        existingByDate.set(normalizeDateStr(item.date), { ...item });
      }

      for (const line of lines) {
        // Hỗ trợ cả copy từ Google Sheets (phân tách bằng Tab \t) hoặc CSV
        const cols = line.includes('\t') ? line.split('\t') : line.split(',');
        if (cols.length < 3) continue;

        // Bỏ qua dòng tiêu đề nếu cột ngày không hợp lệ
        const rawDateCandidate = (cols[1] || cols[0] || '').trim();
        if (
          rawDateCandidate.toLowerCase().includes('ngày') ||
          rawDateCandidate.toLowerCase().includes('date') ||
          rawDateCandidate.toLowerCase() === 'stt'
        ) {
          continue;
        }

        // Nhận diện xem cột 0 là STT hay Ngày xét nghiệm
        const col0Norm = normalizeDateStr(cols[0]);
        const col1Norm = normalizeDateStr(cols[1]);
        const hasSttColumn = !/^\d{4}-\d{2}-\d{2}$/.test(col0Norm) && /^\d{4}-\d{2}-\d{2}$/.test(col1Norm);
        const offset = hasSttColumn ? 1 : 0;
        const parsedDate = normalizeDateStr(cols[offset]);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(parsedDate)) continue;

        const baseEntry: LabResultEntry = existingByDate.get(parsedDate) || {
          id: `lab-import-${parsedDate}-${Math.random().toString(36).slice(2, 6)}`,
          date: parsedDate,
          recordedBy: defaultRecorder,
          tshTargetLevel: profileType === 'thyroid_post_op' ? 'moderate_risk' : 'normal',
          createdAt: new Date().toISOString(),
        };

        if (importSheetType === 'thyroid_data') {
          // Cấu trúc Sheet Data trong Code_SucKhoeTuyenGiap:
          // [STT], Ngày, TSH, FT4, T3, FT3, T4, TG, Anti_TG, Liều thuốc, Anti_TPO, AST, ALT, Cholesterol, HDL_C, LDL_C, Triglyceride, Glucose, HbA1c, Hemoglobin
          const vTsh = parseOptionalNumber(cols[offset + 1] || '');
          const vFt4 = parseOptionalNumber(cols[offset + 2] || '');
          const vT3 = parseOptionalNumber(cols[offset + 3] || '');
          const vFt3 = parseOptionalNumber(cols[offset + 4] || '');
          const vT4 = parseOptionalNumber(cols[offset + 5] || '');
          const vTg = parseOptionalNumber(cols[offset + 6] || '');
          const vAntiTg = parseOptionalNumber(cols[offset + 7] || '');
          const vDose = (cols[offset + 8] || '').trim();
          const vAntiTpo = parseOptionalNumber(cols[offset + 9] || '');
          const vAst = parseOptionalNumber(cols[offset + 10] || '');
          const vAlt = parseOptionalNumber(cols[offset + 11] || '');
          const vChol = parseOptionalNumber(cols[offset + 12] || '');
          const vHdl = parseOptionalNumber(cols[offset + 13] || '');
          const vLdl = parseOptionalNumber(cols[offset + 14] || '');
          const vTrig = parseOptionalNumber(cols[offset + 15] || '');
          const vGlu = parseOptionalNumber(cols[offset + 16] || '');
          const vHba1c = parseOptionalNumber(cols[offset + 17] || '');
          const vHb = parseOptionalNumber(cols[offset + 18] || '');

          if (vTsh !== undefined) baseEntry.tsh = vTsh;
          if (vFt4 !== undefined) {
            baseEntry.ft4 = vFt4;
            baseEntry.ft4Unit = vFt4 > 5 ? 'pmol/L' : 'ng/dL';
          }
          if (vT3 !== undefined) baseEntry.t3 = vT3;
          if (vFt3 !== undefined) {
            baseEntry.ft3 = vFt3;
            baseEntry.ft3Unit = vFt3 > 4.8 ? 'pmol/L' : 'pg/mL';
          }
          if (vT4 !== undefined) baseEntry.t4 = vT4;
          if (vTg !== undefined) baseEntry.tg = vTg;
          if (vAntiTg !== undefined) baseEntry.antiTg = vAntiTg;
          if (vDose) baseEntry.levothyroxineDose = vDose;
          if (vAntiTpo !== undefined) baseEntry.antiTpo = vAntiTpo;
          if (vAst !== undefined) baseEntry.ast = vAst;
          if (vAlt !== undefined) baseEntry.alt = vAlt;
          if (vChol !== undefined) {
            baseEntry.cholesterol = vChol;
            baseEntry.lipidUnit = vChol > 25 ? 'mg/dL' : 'mmol/L';
          }
          if (vHdl !== undefined) baseEntry.hdlC = vHdl;
          if (vLdl !== undefined) baseEntry.ldlC = vLdl;
          if (vTrig !== undefined) baseEntry.triglyceride = vTrig;
          if (vGlu !== undefined) {
            baseEntry.glucose = vGlu;
            baseEntry.glucoseUnit = vGlu > 25 ? 'mg/dL' : 'mmol/L';
          }
          if (vHba1c !== undefined) baseEntry.hba1c = vHba1c;
          if (vHb !== undefined) baseEntry.hemoglobin = vHb;
        } else {
          // Cấu trúc Sheet BiochemistryData trong Code_SucKhoeTuyenGiap:
          // [STT], Ngày, Canxi, Vitamin D, AST, ALT, Cholesterol, HDL-C, LDL-C, Triglyceride, Glucose, HbA1c, Hemoglobin, Ghi chú
          const vCa = parseOptionalNumber(cols[offset + 1] || '');
          const vVitD = parseOptionalNumber(cols[offset + 2] || '');
          const vAst = parseOptionalNumber(cols[offset + 3] || '');
          const vAlt = parseOptionalNumber(cols[offset + 4] || '');
          const vChol = parseOptionalNumber(cols[offset + 5] || '');
          const vHdl = parseOptionalNumber(cols[offset + 6] || '');
          const vLdl = parseOptionalNumber(cols[offset + 7] || '');
          const vTrig = parseOptionalNumber(cols[offset + 8] || '');
          const vGlu = parseOptionalNumber(cols[offset + 9] || '');
          const vHba1c = parseOptionalNumber(cols[offset + 10] || '');
          const vHb = parseOptionalNumber(cols[offset + 11] || '');
          const vNote = (cols[offset + 12] || '').trim();

          if (vCa !== undefined) {
            baseEntry.calcium = vCa;
            baseEntry.calciumUnit = vCa > 5 ? 'mg/dL' : 'mmol/L';
          }
          if (vVitD !== undefined) baseEntry.vitaminD = vVitD;
          if (vAst !== undefined) baseEntry.ast = vAst;
          if (vAlt !== undefined) baseEntry.alt = vAlt;
          if (vChol !== undefined) {
            baseEntry.cholesterol = vChol;
            baseEntry.lipidUnit = vChol > 25 ? 'mg/dL' : 'mmol/L';
          }
          if (vHdl !== undefined) baseEntry.hdlC = vHdl;
          if (vLdl !== undefined) baseEntry.ldlC = vLdl;
          if (vTrig !== undefined) baseEntry.triglyceride = vTrig;
          if (vGlu !== undefined) {
            baseEntry.glucose = vGlu;
            baseEntry.glucoseUnit = vGlu > 25 ? 'mg/dL' : 'mmol/L';
          }
          if (vHba1c !== undefined) baseEntry.hba1c = vHba1c;
          if (vHb !== undefined) baseEntry.hemoglobin = vHb;
          if (vNote) baseEntry.doctorAdvice = vNote;
        }

        existingByDate.set(parsedDate, baseEntry);
        await onSaveLabResult(baseEntry);
        importedCount++;
      }

      if (importedCount > 0) {
        showToast(
          `✅ Đã nhập & đồng bộ thành công ${importedCount} đợt xét nghiệm của ${patientDisplayName}!`,
          'success'
        );
        setImportRawText('');
        setImportModalOpen(false);
      } else {
        showToast(
          'Không tìm thấy dòng dữ liệu hợp lệ. Hãy copy các dòng từ bảng Google Sheet và dán vào ô.',
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

                {latestLab.doctorAdvice && (
                  <div className="pt-2 border-t border-teal-200/70 text-xs sm:text-sm text-slate-900 font-bold">
                    🩺 Lời dặn của Bác sĩ: <span className="font-semibold">{latestLab.doctorAdvice}</span>
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
                    { id: 'thyroid', label: '🦋 Tuyến giáp (TSH • FT4 • TG)' },
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
                        dataKey="ft4"
                        name="FT4"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        yAxisId="right"
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
                        {entry.doctorAdvice && (
                          <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 font-semibold">
                            🩺 <strong>Lời dặn Bác sĩ:</strong> {entry.doctorAdvice}
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
                      Anti-TG (IU/mL)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={antiTg}
                      onChange={(e) => setAntiTg(e.target.value)}
                      placeholder="VD: 12.5"
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

              {/* LỜI DẶN BÁC SĨ / GHI CHÚ */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  🩺 Kết luận / Lời dặn của Bác sĩ (Siêu âm tuyến giáp, chỉnh liều thuốc, hẹn tái khám...)
                </label>
                <textarea
                  rows={2}
                  value={doctorAdvice}
                  onChange={(e) => setDoctorAdvice(e.target.value)}
                  placeholder="VD: Hố mổ tuyến giáp sạch, duy trì Berlthyrox 100mcg sáng lúc đói, hẹn khám lại sau 3 tháng..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900"
                />
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
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-2 border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-teal-900 text-white flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black">
                  📥 Nhập Nhanh Lịch Sử Từ Google Sheet Tuyến Giáp Cũ
                </h3>
                <p className="text-xs text-teal-100">
                  Copy trực tiếp các dòng từ trang tính <strong>Data</strong> hoặc <strong>BiochemistryData</strong> của Mẹ Bạch Yến rồi dán vào dưới đây
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-slate-700">Loại bảng đang dán:</span>
                <button
                  type="button"
                  onClick={() => setImportSheetType('thyroid_data')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer ${
                    importSheetType === 'thyroid_data'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  1. Sheet &quot;Data&quot; (TSH, FT4, T3, FT3, T4, TG, Anti-TG, Liều thuốc...)
                </button>
                <button
                  type="button"
                  onClick={() => setImportSheetType('biochem_data')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer ${
                    importSheetType === 'biochem_data'
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  2. Sheet &quot;BiochemistryData&quot; (Canxi, Vitamin D, AST, ALT, Mỡ máu...)
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Hướng dẫn 3 giây:</span>
                </div>
                <p>
                  Mở file Google Sheet cũ của Mẹ Bạch Yến, bôi đen các dòng dữ liệu (từ cột A đến cột cuối), bấm{' '}
                  <strong>Ctrl + C</strong> rồi dán (<strong>Ctrl + V</strong>) vào ô bên dưới. Nếu cùng ngày xét nghiệm ở cả 2 sheet, hệ thống sẽ tự động gộp chung vào 1 bản ghi!
                </p>
              </div>

              <textarea
                rows={8}
                value={importRawText}
                onChange={(e) => setImportRawText(e.target.value)}
                placeholder="Dán các dòng dữ liệu đã copy từ Google Sheet vào đây..."
                className="w-full p-3 rounded-2xl border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-600"
              />

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
                  disabled={isImporting || !importRawText.trim()}
                  onClick={handleImportLegacyData}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isImporting ? 'Đang xử lý & lưu...' : `Nhập vào hồ sơ ${patientName}`}
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
