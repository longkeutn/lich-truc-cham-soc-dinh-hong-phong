'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Check,
  Image as ImageIcon,
  Plus,
  Save,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import type {
  FamilyMember,
  HealthProfileType,
  LabResultEntry,
  MedicalVisitMedication,
  MedicalVisitOutcomeStatus,
  MedicalVisitType,
  TimeSlot,
} from '@/lib/types';
import {
  TIME_SLOT_CONFIG,
  ensureRecordProfilePrefix,
  getVietnamDateStr,
  normalizeDateStr,
} from '@/lib/config';
import {
  OUTCOME_STATUS_CONFIG,
  VISIT_TYPE_CONFIG,
  compressPrescriptionImageToDataUrl,
  getQuickFacilitiesForProfile,
  getQuickSymptomsForProfile,
} from '@/lib/medicalVisitUtils';

const ALL_SLOTS: TimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];
const QUICK_DURATIONS = [3, 5, 7, 10, 14];

function createEmptyMedication(index: number): MedicalVisitMedication {
  return {
    id: `med-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    dosage: '',
    medType: 'scheduled',
    timeSlots: ['morning', 'evening'],
    durationDays: 5,
    instructions: '',
    conditionNote: '',
  };
}

export interface MedicalVisitFormModalProps {
  isOpen: boolean;
  editingEntry: LabResultEntry | null;
  profileId?: string;
  profileType: HealthProfileType;
  patientDisplayName: string;
  todayStr?: string;
  members: FamilyMember[];
  defaultRecorder: string;
  onClose: () => void;
  onSaveVisit: (
    entry: LabResultEntry,
    options: { syncToDailyRoutines: boolean }
  ) => Promise<void>;
}

export function MedicalVisitFormModal({
  isOpen,
  editingEntry,
  profileId,
  profileType,
  patientDisplayName,
  todayStr,
  members,
  defaultRecorder,
  onClose,
  onSaveVisit,
}: MedicalVisitFormModalProps) {
  const defaultDate = todayStr || getVietnamDateStr();
  const isPediatric = profileType === 'pediatric';

  const [date, setDate] = useState(defaultDate);
  const [visitType, setVisitType] = useState<MedicalVisitType>(
    isPediatric ? 'illness' : 'follow_up'
  );
  const [facility, setFacility] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptionImage, setPrescriptionImage] = useState('');
  const [prescriptions, setPrescriptions] = useState<MedicalVisitMedication[]>(() => [
    createEmptyMedication(1),
  ]);
  const [doctorAdvice, setDoctorAdvice] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [outcomeStatus, setOutcomeStatus] = useState<MedicalVisitOutcomeStatus>('ongoing');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [recordedBy, setRecordedBy] = useState(defaultRecorder);
  const [syncToDailyRoutines, setSyncToDailyRoutines] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompressingImg, setIsCompressingImg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingEntry) {
      const mv = editingEntry.medicalVisit;
      setDate(normalizeDateStr(editingEntry.date) || defaultDate);
      setVisitType(mv?.visitType || (isPediatric ? 'illness' : 'follow_up'));
      setFacility(editingEntry.facility || '');
      setDoctorName(mv?.doctorName || '');
      setWeightKg(mv?.weightKg !== undefined ? String(mv.weightKg) : '');
      setSymptoms(mv?.symptoms || editingEntry.symptoms || '');
      setDiagnosis(mv?.diagnosis || '');
      setPrescriptionImage(mv?.prescriptionImage || '');
      setPrescriptions(
        mv?.prescriptions && mv.prescriptions.length > 0
          ? mv.prescriptions.map((m) => ({ ...m }))
          : [createEmptyMedication(1)]
      );
      setDoctorAdvice(editingEntry.doctorAdvice || '');
      setNextVisitDate(mv?.nextVisitDate ? normalizeDateStr(mv.nextVisitDate) : '');
      setOutcomeStatus(mv?.outcomeStatus || 'ongoing');
      setOutcomeNote(mv?.outcomeNote || '');
      setRecordedBy(editingEntry.recordedBy || defaultRecorder);
      setSyncToDailyRoutines(false);
      setErrorMsg('');
    } else {
      setDate(defaultDate);
      setVisitType(isPediatric ? 'illness' : 'follow_up');
      setFacility('');
      setDoctorName('');
      setWeightKg('');
      setSymptoms('');
      setDiagnosis('');
      setPrescriptionImage('');
      setPrescriptions([createEmptyMedication(1)]);
      setDoctorAdvice('');
      setNextVisitDate('');
      setOutcomeStatus('ongoing');
      setOutcomeNote('');
      setRecordedBy(defaultRecorder);
      setSyncToDailyRoutines(true);
      setErrorMsg('');
    }
  }, [isOpen, editingEntry, defaultDate, defaultRecorder, isPediatric]);

  if (!isOpen) return null;

  const quickSymptoms = getQuickSymptomsForProfile(profileType);
  const quickFacilities = getQuickFacilitiesForProfile(profileType);

  const toggleSymptomChip = (chip: string) => {
    const parts = symptoms
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const exists = parts.some((p) => p.toLowerCase() === chip.toLowerCase());
    if (exists) {
      setSymptoms(parts.filter((p) => p.toLowerCase() !== chip.toLowerCase()).join(', '));
    } else {
      setSymptoms([...parts, chip].join(', '));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP).');
      return;
    }
    setIsCompressingImg(true);
    setErrorMsg('');
    try {
      const dataUrl = await compressPrescriptionImageToDataUrl(file);
      setPrescriptionImage(dataUrl);
    } catch {
      setErrorMsg('Không thể xử lý ảnh đơn thuốc. Vui lòng thử ảnh khác.');
    } finally {
      setIsCompressingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateMed = (
    medId: string,
    updater: (prev: MedicalVisitMedication) => MedicalVisitMedication
  ) => {
    setPrescriptions((prev) => prev.map((m) => (m.id === medId ? updater(m) : m)));
  };

  const toggleMedSlot = (medId: string, slot: TimeSlot) => {
    updateMed(medId, (m) => {
      const exists = m.timeSlots.includes(slot);
      const nextSlots = exists
        ? m.timeSlots.filter((s) => s !== slot)
        : [...m.timeSlots, slot];
      return { ...m, timeSlots: nextSlots };
    });
  };

  const handleAddMedRow = () => {
    setPrescriptions((prev) => [...prev, createEmptyMedication(prev.length + 1)]);
  };

  const handleRemoveMedRow = (medId: string) => {
    setPrescriptions((prev) => {
      if (prev.length <= 1) {
        return [createEmptyMedication(1)];
      }
      return prev.filter((m) => m.id !== medId);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validMeds = prescriptions
      .map((m) => ({
        ...m,
        title: m.title.trim(),
        dosage: m.dosage.trim(),
        instructions: (m.instructions || '').trim(),
        conditionNote: (m.conditionNote || '').trim(),
      }))
      .filter((m) => Boolean(m.title));

    if (!diagnosis.trim() && !symptoms.trim() && validMeds.length === 0 && !doctorAdvice.trim() && !prescriptionImage) {
      setErrorMsg('Vui lòng nhập ít nhất triệu chứng, chẩn đoán, ảnh đơn thuốc hoặc tên thuốc.');
      return;
    }

    const parsedWeight = weightKg.trim()
      ? parseFloat(weightKg.replace(',', '.'))
      : undefined;

    setIsSaving(true);
    setErrorMsg('');
    try {
      const nowIso = new Date().toISOString();
      const rawId = editingEntry?.id || `visit-${Date.now()}`;
      const scopedId = ensureRecordProfilePrefix(rawId, profileId);

      const entry: LabResultEntry = {
        ...(editingEntry || {}),
        id: scopedId,
        date: normalizeDateStr(date) || defaultDate,
        facility: facility.trim() || undefined,
        symptoms: symptoms.trim() || undefined,
        doctorAdvice: doctorAdvice.trim() || undefined,
        recordedBy: recordedBy.trim() || defaultRecorder,
        recordKind: 'medical_visit',
        medicalVisit: {
          visitType,
          doctorName: doctorName.trim() || undefined,
          weightKg: parsedWeight && !isNaN(parsedWeight) ? parsedWeight : undefined,
          symptoms: symptoms.trim() || undefined,
          diagnosis: diagnosis.trim() || undefined,
          prescriptionImage: prescriptionImage || undefined,
          prescriptions: validMeds,
          outcomeStatus,
          outcomeNote: outcomeNote.trim() || undefined,
          nextVisitDate: nextVisitDate ? normalizeDateStr(nextVisitDate) : undefined,
        },
        createdAt: editingEntry?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      await onSaveVisit(entry, {
        syncToDailyRoutines: syncToDailyRoutines && validMeds.length > 0,
      });
      onClose();
    } catch {
      setErrorMsg('Không thể lưu đợt khám. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-3xl shadow-2xl border-0 sm:border sm:border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-amber-300" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black truncate">
                {editingEntry
                  ? `Cập nhật Đợt Khám & Đơn Thuốc · ${patientDisplayName}`
                  : `Ghi Đợt Khám & Đơn Thuốc Mới · ${patientDisplayName}`}
              </h3>
              <p className="text-xs text-teal-100 truncate">
                Lưu triệu chứng, ảnh đơn thuốc, từng thuốc theo liệu trình và theo dõi đáp ứng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng biểu mẫu đợt khám"
            className="min-h-[48px] min-w-[48px] rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-sm font-bold text-rose-800">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* 1. Ngày khám, Loại khám & Cân nặng */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                📅 Ngày đi khám <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                Phân loại đợt khám
              </label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as MedicalVisitType)}
                className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                {(Object.keys(VISIT_TYPE_CONFIG) as MedicalVisitType[]).map((vt) => (
                  <option key={vt} value={vt}>
                    {VISIT_TYPE_CONFIG[vt].emoji} {VISIT_TYPE_CONFIG[vt].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                ⚖️ Cân nặng lúc khám (kg)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="200"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder={isPediatric ? 'VD: 13.5' : 'Tuỳ chọn'}
                className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* 2. Cơ sở khám & Bác sĩ */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  🏥 Bệnh viện / Phòng khám
                </label>
                <input
                  type="text"
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  placeholder="VD: BV Nhi TW, PK Nhi..."
                  className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  👨‍⚕️ Bác sĩ khám (nếu nhớ)
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="VD: BS Trần Văn Đăng..."
                  className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickFacilities.map((fac) => (
                <button
                  key={fac}
                  type="button"
                  onClick={() => setFacility(fac)}
                  className={`min-h-[40px] px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition ${
                    facility === fac
                      ? 'bg-teal-700 text-white border-teal-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {fac}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Triệu chứng & Chẩn đoán */}
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                🤒 Triệu chứng lúc đi khám
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {quickSymptoms.map((sym) => {
                  const selected = symptoms.toLowerCase().includes(sym.toLowerCase());
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleSymptomChip(sym)}
                      className={`min-h-[40px] px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer transition ${
                        selected
                          ? 'bg-amber-200 text-amber-950 border-amber-400'
                          : 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {selected ? '✓ ' : '+ '}
                      {sym}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Mô tả triệu chứng (VD: Sốt 39°C từ tối qua, ho có đờm...)"
                className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                🩺 Chẩn đoán của Bác sĩ
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="VD: Viêm tai giữa cấp, Viêm họng cấp, Thoát vị L5/S1..."
                className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* 4. Ảnh chụp tờ đơn thuốc */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 block">
                  📷 Ảnh chụp tờ đơn thuốc / giấy khám
                </span>
                <span className="text-xs text-slate-600">
                  Tự động nén gọn dưới 35KB để lưu an toàn vào Google Sheets và xem lại bất cứ lúc nào
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={isCompressingImg}
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl border-2 border-dashed border-teal-400 bg-white hover:bg-teal-50 text-teal-900 text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-teal-700 shrink-0" />
                <span>{isCompressingImg ? 'Đang nén ảnh...' : 'Chụp / Chọn ảnh đơn'}</span>
              </button>
            </div>

            {prescriptionImage && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={prescriptionImage}
                  alt="Ảnh đơn thuốc"
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-emerald-800 flex items-center gap-1">
                    <ImageIcon className="w-4 h-4 shrink-0" />
                    Đã đính kèm ảnh đơn thuốc
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Sau khi lưu, bấm vào ảnh ở thẻ đợt khám để phóng to đọc rõ chữ Bác sĩ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPrescriptionImage('')}
                  className="min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                >
                  Xoá ảnh
                </button>
              </div>
            )}
          </div>

          {/* 5. Danh sách thuốc trong đơn */}
          <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h4 className="text-sm sm:text-base font-black text-slate-900">
                  💊 Danh sách thuốc trong đơn ({prescriptions.length})
                </h4>
                <p className="text-xs text-slate-600">
                  Nhập tên thuốc, liều mỗi lần, buổi uống và số ngày (hệ thống tự ẩn khỏi lịch sau khi hết đợt).
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMedRow}
                className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Thêm thuốc</span>
              </button>
            </div>

            <div className="space-y-3">
              {prescriptions.map((med, idx) => (
                <div
                  key={med.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-teal-900 uppercase">
                      Thuốc #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedRow(med.id)}
                      aria-label={`Xoá thuốc số ${idx + 1}`}
                      className="min-h-[48px] min-w-[48px] px-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={med.title}
                        onChange={(e) =>
                          updateMed(med.id, (prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Tên thuốc (VD: Augmentin 250mg, Hapacol 150...)"
                        className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) =>
                          updateMed(med.id, (prev) => ({ ...prev, dosage: e.target.value }))
                        }
                        placeholder="Liều (VD: 1 gói, 5ml)"
                        className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  {/* Kiểu dùng & Số ngày */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateMed(med.id, (prev) => ({ ...prev, medType: 'scheduled' }))
                        }
                        className={`min-h-[48px] min-w-[48px] px-3 py-1.5 rounded-xl border text-xs font-extrabold cursor-pointer ${
                          med.medType === 'scheduled'
                            ? 'bg-teal-700 text-white border-teal-800'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        🕐 Theo lịch
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateMed(med.id, (prev) => ({ ...prev, medType: 'as_needed' }))
                        }
                        className={`min-h-[48px] min-w-[48px] px-3 py-1.5 rounded-xl border text-xs font-extrabold cursor-pointer ${
                          med.medType === 'as_needed'
                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        ⚡ Khi cần
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-600">Số ngày:</span>
                      {QUICK_DURATIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            updateMed(med.id, (prev) => ({ ...prev, durationDays: d }))
                          }
                          className={`min-h-[40px] px-2.5 py-1 rounded-lg border text-xs font-extrabold cursor-pointer ${
                            med.durationDays === d
                              ? 'bg-indigo-700 text-white border-indigo-800'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {d} ngày
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateMed(med.id, (prev) => ({ ...prev, durationDays: undefined }))
                        }
                        className={`min-h-[40px] px-2.5 py-1 rounded-lg border text-xs font-extrabold cursor-pointer ${
                          !med.durationDays
                            ? 'bg-indigo-700 text-white border-indigo-800'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Dài ngày
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={med.durationDays ?? ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          updateMed(med.id, (prev) => ({
                            ...prev,
                            durationDays: !isNaN(val) && val > 0 ? val : undefined,
                          }));
                        }}
                        placeholder="Khác"
                        aria-label="Số ngày uống tuỳ chỉnh"
                        className="w-16 min-h-[40px] px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold text-center text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Buổi uống */}
                  {med.medType === 'scheduled' && (
                    <div className="grid grid-cols-4 gap-1.5">
                      {ALL_SLOTS.map((slot) => {
                        const cfg = TIME_SLOT_CONFIG[slot];
                        const active = med.timeSlots.includes(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => toggleMedSlot(med.id, slot)}
                            className={`min-h-[48px] min-w-[48px] px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                              active
                                ? 'bg-teal-100 text-teal-950 border-teal-400'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>{cfg.emoji}</span>
                            <span>{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Hướng dẫn & Lưu ý */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={med.instructions || ''}
                      onChange={(e) =>
                        updateMed(med.id, (prev) => ({ ...prev, instructions: e.target.value }))
                      }
                      placeholder="Cách dùng (VD: Uống sau ăn, lắc đều chai...)"
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <input
                      type="text"
                      value={med.conditionNote || ''}
                      onChange={(e) =>
                        updateMed(med.id, (prev) => ({ ...prev, conditionNote: e.target.value }))
                      }
                      placeholder="Lưu ý (VD: Chỉ uống khi sốt >= 38.5°C)"
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-teal-300 cursor-pointer select-none min-h-[48px]">
              <input
                type="checkbox"
                checked={syncToDailyRoutines}
                onChange={(e) => setSyncToDailyRoutines(e.target.checked)}
                className="w-5 h-5 accent-teal-700 shrink-0"
              />
              <span className="text-xs sm:text-sm font-extrabold text-teal-950 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Tự động đưa các thuốc trong đơn này vào Checklist Hôm Nay (tự ẩn khi hết số ngày điều trị)
                </span>
              </span>
            </label>
          </div>

          {/* 6. Lời dặn BS, Hẹn tái khám & Đáp ứng sau đợt */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                📋 Lời dặn của Bác sĩ
              </label>
              <textarea
                rows={2}
                value={doctorAdvice}
                onChange={(e) => setDoctorAdvice(e.target.value)}
                placeholder="VD: Theo dõi dấu hiệu khó thở, uống đủ nước, kiêng đồ lạnh..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none"
              />
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  🗓️ Ngày hẹn tái khám (nếu có)
                </label>
                <input
                  type="date"
                  value={nextVisitDate}
                  onChange={(e) => setNextVisitDate(e.target.value)}
                  className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Theo dõi đáp ứng */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  📊 Đáp ứng sau đợt điều trị
                </label>
                <select
                  value={outcomeStatus}
                  onChange={(e) =>
                    setOutcomeStatus(e.target.value as MedicalVisitOutcomeStatus)
                  }
                  className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {(Object.keys(OUTCOME_STATUS_CONFIG) as MedicalVisitOutcomeStatus[]).map(
                    (st) => (
                      <option key={st} value={st}>
                        {OUTCOME_STATUS_CONFIG[st].emoji} {OUTCOME_STATUS_CONFIG[st].label}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  👤 Người ghi nhận
                </label>
                <select
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  {[defaultRecorder, ...members.map((m) => m.name)]
                    .filter((v, idx, arr) => Boolean(v) && arr.indexOf(v) === idx)
                    .map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                📝 Ghi chú đáp ứng thuốc (để lần sau mở lại đối chiếu)
              </label>
              <input
                type="text"
                value={outcomeNote}
                onChange={(e) => setOutcomeNote(e.target.value)}
                placeholder="VD: Hợp đơn này, cắt sốt sau 2 ngày; hoặc bị tiêu chảy khi dùng kháng sinh..."
                className="w-full min-h-[48px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="min-h-[48px] min-w-[48px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[48px] min-w-[48px] px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-black inline-flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Đợt Khám & Đơn Thuốc'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MedicalVisitFormModal;
