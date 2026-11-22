import type { LabExamPackage, LabFullFormState } from './labFormState';

const LAB_DRAFT_PREFIX = 'care_lab_form_draft_v1_';

export interface LabFormDraftData {
  form: LabFullFormState;
  selectedPackage: LabExamPackage;
  showAdvanced: boolean;
  savedAt: number;
}

export function getLabDraftKey(profileId?: string): string {
  return `${LAB_DRAFT_PREFIX}${profileId || 'default'}`;
}

export function saveLabDraft(
  profileId: string | undefined,
  data: {
    form: LabFullFormState;
    selectedPackage: LabExamPackage;
    showAdvanced: boolean;
  }
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: LabFormDraftData = {
      ...data,
      savedAt: Date.now(),
    };
    localStorage.setItem(getLabDraftKey(profileId), JSON.stringify(payload));
  } catch {
    // Bỏ qua lỗi quota localStorage
  }
}

export function loadLabDraft(profileId?: string): LabFormDraftData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getLabDraftKey(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LabFormDraftData;
    // Bản nháp tự động hết hạn sau 24h
    if (!parsed || !parsed.form || Date.now() - parsed.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(getLabDraftKey(profileId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearLabDraft(profileId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getLabDraftKey(profileId));
  } catch {
    // Bỏ qua lỗi truy cập localStorage
  }
}

export function hasMeaningfulLabInput(form: LabFullFormState): boolean {
  if (!form) return false;
  if (form.doctorAdvice?.trim() || form.symptoms?.trim()) return true;
  if (form.tsh?.trim() || form.ft4?.trim() || form.tg?.trim()) return true;
  if (form.ft3?.trim() || form.t3?.trim() || form.t4?.trim()) return true;
  if (form.antiTg?.trim() || form.antiTpo?.trim()) return true;
  const bio = form.bio;
  if (!bio) return false;
  return Boolean(
    bio.glucose?.trim() ||
      bio.hba1c?.trim() ||
      bio.cholesterol?.trim() ||
      bio.ldlC?.trim() ||
      bio.hdlC?.trim() ||
      bio.triglyceride?.trim() ||
      bio.ast?.trim() ||
      bio.alt?.trim() ||
      bio.ggt?.trim() ||
      bio.bilirubinTotal?.trim() ||
      bio.bilirubinDirect?.trim() ||
      bio.creatinine?.trim() ||
      bio.egfr?.trim() ||
      bio.urea?.trim() ||
      bio.uricAcid?.trim() ||
      bio.gallbladderPolypMm?.trim() ||
      bio.gallbladderPolypCount?.trim() ||
      bio.liverUltrasound?.trim() ||
      bio.kidneyUltrasound?.trim() ||
      bio.calcium?.trim() ||
      bio.ionizedCalcium?.trim() ||
      bio.phosphorus?.trim() ||
      bio.pth?.trim() ||
      bio.albumin?.trim() ||
      bio.vitaminD?.trim() ||
      bio.hemoglobin?.trim() ||
      bio.customLabs?.some((c) => c.name?.trim() || c.value?.trim())
  );
}
