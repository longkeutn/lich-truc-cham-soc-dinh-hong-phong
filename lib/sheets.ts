import {
  CarePhase,
  ShiftRecord,
  SystemSettings,
  FamilyMember,
  PatientInfo,
  EmergencyContact,
  PatientDailyReminder,
  AllAppData,
  VitalsLogEntry,
  CareRoutine,
  DailyLog,
  RehabStage,
  AppointmentInfo,
  BpThresholds,
  AllAppDataV2,
  AppMode,
  ExpenseEntry,
} from './types';
import {
  PHASE_CONFIGS,
  buildDefaultShiftRecord,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_APPOINTMENT,
} from './config';

// Tên các trang tính trong Google Sheet (9 Sheets V2.2)
export const SHEET_NAMES = {
  SHIFTS: 'Shifts',
  MEMBERS: 'Members',
  SETTINGS: 'Settings',
  CONTACTS: 'Contacts',
  REMINDERS: 'Reminders',
  VITALS_LOG: 'VitalsLog',
  CARE_ROUTINES: 'CareRoutines',
  DAILY_LOGS: 'DailyLogs',
  EXPENSES: 'Expenses',
};

// Thứ tự các cột trong trang tính 'Shifts'
export const SHIFTS_SHEET_HEADERS = [
  'shift_id',             // Cột A: Mã ca trực (vd: 2026-09-19_morning_phase1)
  'date',                 // Cột B: Ngày (YYYY-MM-DD)
  'phase',                // Cột C: Giai đoạn (phase1 / phase2)
  'shift_type',           // Cột D: Loại ca (morning, afternoon, night, day_12h, night_12h)
  'shift_name',           // Cột E: Tên ca (Ca Sáng, Ca Đêm...)
  'time_range',           // Cột F: Khung giờ (06:00 - 14:00)
  'required_pax',         // Cột G: Số người cần trực (1 hoặc 2)
  'assignee_1',           // Cột H: Người trực 1
  'assignee_2',           // Cột I: Người trực 2
  'is_understaffed',      // Cột J: Trạng thái thiếu người (TRUE / FALSE)
  'handover_note',        // Cột K: Ghi chú bàn giao ca
  'handover_by',          // Cột L: Người bàn giao
  'handover_time',        // Cột M: Thời gian bàn giao
  'vitals_bp',            // Cột N: Huyết áp (mmHg)
  'vitals_spo2',          // Cột O: SpO2 (%)
  'vitals_pulse',         // Cột P: Mạch (lần/phút)
  'vitals_temp',          // Cột Q: Nhiệt độ (°C)
  'chk_feeding',          // Cột R: Checklist - Bơm sữa (TRUE / FALSE)
  'chk_meds',             // Cột S: Checklist - Uống thuốc (TRUE / FALSE)
  'chk_hygiene',          // Cột T: Checklist - Thay bỉm/Vệ sinh (TRUE / FALSE)
  'chk_turning',          // Cột U: Checklist - Lật trở/Vỗ rung (TRUE / FALSE)
  'updated_at',           // Cột V: Cập nhật cuối
];

export function getWebappUrl(): string | undefined {
  let url =
    process.env.GOOGLE_SHEETS_WEBAPP_URL ||
    process.env.NEXT_PUBLIC_GOOGLE_SHEETS_WEBAPP_URL ||
    process.env.GOOGLE_SHEET_WEBAPP_URL ||
    process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEBAPP_URL ||
    process.env.GOOGLE_WEBAPP_URL ||
    process.env.NEXT_PUBLIC_GOOGLE_WEBAPP_URL ||
    process.env.GOOGLE_SCRIPT_URL ||
    process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;

  if (!url) return undefined;
  url = url.trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  return url || undefined;
}

function getServiceAccountCreds() {
  const sheetId = process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!sheetId || !clientEmail || !privateKey) {
    return null;
  }

  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  return { sheetId, clientEmail, privateKey };
}

// In-memory store đồng bộ trực tiếp từ Google Sheets (Zero Hardcode)
class MemoryShiftStore {
  private hasSyncedWithSheet: boolean = false;
  private shifts: Map<string, ShiftRecord> = new Map();
  private members: FamilyMember[] = [];
  private patientInfo: PatientInfo = {
    name: 'Đinh Hồng Phong',
    diagnosis: '',
    hospital: '',
    room: '',
    notes: '',
    emergencyPhone: '',
    statusBadge: 'Bệnh nhân theo dõi đặc biệt',
    conditionTag: 'Tai biến nặng',
    headerBadge: 'Tại nhà',
    careMode: 'Liên tục 24/7',
    careGoal: 'Chống loét & duy trì SpO2',
    customFields: [],
  };
  private contacts: EmergencyContact[] = [];
  private reminders: PatientDailyReminder[] = [];
  private systemSettings: SystemSettings = {
    currentPhase: 'phase2',
    patientName: 'Đinh Hồng Phong',
    patientRoom: '',
    hospital: '',
    diagnosis: '',
    doctorNotes: '',
    emergencyPhone: '',
    googleSheetsConnected: false,
  };
  private adminPin: string = '1234';
  private expensePin: string = '2468';

  // --- V2.0: Sổ Sức Khỏe Bố — Private fields ---
  private vitalsLog: VitalsLogEntry[] = [];
  private careRoutines: CareRoutine[] = [];
  private dailyLogs: DailyLog[] = [];
  private bpThresholds: BpThresholds = { ...DEFAULT_BP_THRESHOLDS };
  private appointment: AppointmentInfo = { ...DEFAULT_APPOINTMENT };
  private appMode: AppMode = 'home_care';
  private expenses: ExpenseEntry[] = [];

  constructor() {
    // Khởi tạo rỗng 100% — chỉ hiển thị dữ liệu thực tế từ Google Sheets
  }

  public isSynced(): boolean {
    return this.hasSyncedWithSheet;
  }

  public markSynced(synced: boolean): void {
    this.hasSyncedWithSheet = synced;
  }

  // --- Shifts ---
  public clearShifts(): void {
    this.shifts.clear();
  }

  public getAllLoadedShifts(): ShiftRecord[] {
    return Array.from(this.shifts.values());
  }

  public getShifts(startDate: string, endDate: string, phase: CarePhase): ShiftRecord[] {
    const results: ShiftRecord[] = [];
    const configs = PHASE_CONFIGS[phase].shifts;

    // Phân tích ngày an toàn tuyệt đối theo 12:00:00 trưa để chống lệch múi giờ và DST
    const [sY, sM, sD] = startDate.split('-').map(Number);
    const [eY, eM, eD] = endDate.split('-').map(Number);
    const cur = new Date(sY, (sM || 1) - 1, sD || 1, 12, 0, 0);
    const end = new Date(eY, (eM || 1) - 1, eD || 1, 12, 0, 0);

    while (cur <= end) {
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      const dd = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      for (const cfg of configs) {
        const id = `${dateStr}_${cfg.type}_${phase}`;
        const record = this.shifts.get(id);
        if (record) {
          results.push(record);
        } else {
          results.push(buildDefaultShiftRecord(dateStr, cfg, phase));
        }
      }
      cur.setDate(cur.getDate() + 1);
    }
    return results;
  }

  public saveShift(shift: ShiftRecord): ShiftRecord {
    // 1. Chuẩn hoá date thành YYYY-MM-DD
    let normalizedDate = String(shift.date || '').trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(normalizedDate)) {
      const parts = normalizedDate.split('/');
      normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (/^\d{4}-\d{2}-\d{2}/.test(normalizedDate)) {
      normalizedDate = normalizedDate.substring(0, 10);
    }

    // Nếu date vẫn chưa chuẩn YYYY-MM-DD nhưng shift.id có dạng YYYY-MM-DD_..., lấy từ id
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate) && /^\d{4}-\d{2}-\d{2}_/.test(shift.id || '')) {
      normalizedDate = shift.id.substring(0, 10);
    }

    // 2. Chuẩn hoá phase
    let normalizedPhase: CarePhase = shift.phase || 'phase1';
    const phaseStr = String(normalizedPhase).toLowerCase().replace(/[\s_-]/g, '');
    if (phaseStr.includes('2') || phaseStr.includes('home')) normalizedPhase = 'phase2';
    else normalizedPhase = 'phase1';

    // 3. Chuẩn hoá id (giữ nguyên id nếu là bản ghi đăng ký qua phụ Mẹ `support_...`)
    const rawId = String(shift.id || '').trim();
    const normalizedId = rawId.startsWith('support_')
      ? rawId
      : `${normalizedDate}_${shift.type}_${normalizedPhase}`;

    const assignees = (shift.assignees || []).filter(Boolean);
    const supporters = (shift.supporters || []).filter(Boolean);
    const reqPax = shift.requiredPax && shift.requiredPax > 0 ? shift.requiredPax : 1;
    const filledCount = assignees.length;

    const normalizedShift: ShiftRecord = {
      ...shift,
      id: normalizedId,
      date: normalizedDate,
      phase: normalizedPhase,
      requiredPax: reqPax,
      assignees,
      supporters,
      isUnderstaffed: filledCount < reqPax,
      updatedAt: shift.updatedAt || new Date().toISOString(),
    };

    const hasNote = Boolean(shift.handover?.note?.trim());
    const hasVitals = Boolean(
      shift.handover?.vitals?.bp ||
      shift.handover?.vitals?.spo2 ||
      shift.handover?.vitals?.pulse ||
      shift.handover?.vitals?.temp
    );

    if (rawId.startsWith('support_') && filledCount === 0 && supporters.length === 0 && !hasNote && !hasVitals) {
      this.shifts.delete(normalizedShift.id);
    } else {
      this.shifts.set(normalizedShift.id, normalizedShift);
    }
    return normalizedShift;
  }

  // --- Members ---
  public getMembers(): FamilyMember[] {
    return this.members;
  }

  public setMembers(list: FamilyMember[]): void {
    if (Array.isArray(list)) {
      this.members = list;
    }
  }

  public saveMember(member: FamilyMember): FamilyMember[] {
    const idx = this.members.findIndex((m) => m.id === member.id);
    if (idx >= 0) {
      this.members[idx] = member;
    } else {
      this.members.push(member);
    }
    return this.members;
  }

  public deleteMember(memberId: string): FamilyMember[] {
    this.members = this.members.filter((m) => m.id !== memberId);
    return this.members;
  }

  // --- Patient Info & Settings ---
  public getPatientInfo(): PatientInfo {
    return this.patientInfo;
  }

  public setPatientInfo(info: PatientInfo): void {
    this.patientInfo = { ...this.patientInfo, ...info };
    this.systemSettings.patientName = this.patientInfo.name;
    this.systemSettings.patientRoom = this.patientInfo.room;
    this.systemSettings.hospital = this.patientInfo.hospital;
    this.systemSettings.diagnosis = this.patientInfo.diagnosis;
    this.systemSettings.doctorNotes = this.patientInfo.notes;
  }

  public getSettings(): SystemSettings {
    const isConnected = Boolean(getWebappUrl() || getServiceAccountCreds()) && this.hasSyncedWithSheet;
    return {
      ...this.systemSettings,
      googleSheetsConnected: isConnected,
    };
  }

  public setPhase(phase: CarePhase): SystemSettings {
    this.systemSettings.currentPhase = phase;
    return this.getSettings();
  }

  // --- Contacts ---
  public getContacts(): EmergencyContact[] {
    return this.contacts;
  }

  public setContacts(list: EmergencyContact[]): void {
    if (Array.isArray(list)) {
      this.contacts = list;
    }
  }

  public saveContact(contact: EmergencyContact): EmergencyContact[] {
    const idx = this.contacts.findIndex((c) => c.id === contact.id);
    if (idx >= 0) {
      this.contacts[idx] = contact;
    } else {
      this.contacts.unshift(contact);
    }
    return this.contacts;
  }

  public deleteContact(contactId: string): EmergencyContact[] {
    this.contacts = this.contacts.filter((c) => c.id !== contactId);
    return this.contacts;
  }

  // --- Reminders ---
  public getReminders(): PatientDailyReminder[] {
    return this.reminders;
  }

  public setReminders(list: PatientDailyReminder[]): void {
    if (Array.isArray(list)) {
      this.reminders = list;
    }
  }

  public saveReminder(reminder: PatientDailyReminder): PatientDailyReminder[] {
    const idx = this.reminders.findIndex((r) => r.id === reminder.id);
    if (idx >= 0) {
      this.reminders[idx] = reminder;
    } else {
      this.reminders.unshift(reminder);
    }
    return this.reminders;
  }

  public deleteReminder(reminderId: string): PatientDailyReminder[] {
    this.reminders = this.reminders.filter((r) => r.id !== reminderId);
    return this.reminders;
  }

  // --- Admin PIN ---
  public getAdminPin(): string {
    return this.adminPin;
  }

  public setAdminPin(pin: string): void {
    if (pin && pin.trim()) {
      this.adminPin = pin.trim();
    }
  }

  public verifyAdminPin(pin: string): boolean {
    return this.adminPin === (pin || '').trim();
  }

  public changeAdminPin(oldPin: string, newPin: string): boolean {
    if (this.verifyAdminPin(oldPin)) {
      if (newPin && newPin.trim().length >= 4) {
        this.adminPin = newPin.trim();
        return true;
      }
    }
    return false;
  }

  // --- All App Data ---
  public getAllData(startDate: string, endDate: string, phase: CarePhase): AllAppData {
    return {
      shifts: this.getShifts(startDate, endDate, phase),
      members: this.getMembers(),
      patientInfo: this.getPatientInfo(),
      contacts: this.getContacts(),
      reminders: this.getReminders(),
      settings: this.getSettings(),
    };
  }

  // =============================================
  // V2.0 — SỔ SỨC KHỎE BỐ — Methods mới
  // =============================================

  // --- VitalsLog (Nhật ký Huyết áp & Sinh hiệu) ---
  public getVitalsLog(): VitalsLogEntry[] {
    return [...this.vitalsLog].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });
  }

  public saveVitalsEntry(entry: VitalsLogEntry): VitalsLogEntry {
    const idx = this.vitalsLog.findIndex((v) => v.id === entry.id);
    if (idx >= 0) {
      this.vitalsLog[idx] = entry;
    } else {
      this.vitalsLog.push(entry);
    }
    return entry;
  }

  public deleteVitalsEntry(id: string): void {
    this.vitalsLog = this.vitalsLog.filter((v) => v.id !== id);
  }

  public setVitalsLog(list: VitalsLogEntry[]): void {
    if (list && Array.isArray(list)) {
      this.vitalsLog = list;
    }
  }

  // --- CareRoutines (Đơn thuốc & Bài tập phục hồi) ---
  public getCareRoutines(): CareRoutine[] {
    return this.careRoutines;
  }

  public getActiveRoutines(stageId?: string): CareRoutine[] {
    let filtered = this.careRoutines.filter((r) => r.isActive);
    if (stageId) {
      filtered = filtered.filter((r) => r.stageId === stageId);
    }
    return filtered.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private sanitizeRoutine(r: CareRoutine, existing?: CareRoutine): CareRoutine {
    const validSlots = (Array.isArray(r.timeSlots) ? r.timeSlots : []).filter(
      (s) => s === 'morning' || s === 'noon' || s === 'afternoon' || s === 'evening'
    );
    const validCategory =
      r.category === 'meds' || r.category === 'rehab' || r.category === 'care'
        ? r.category
        : 'care';
    return {
      ...r,
      category: validCategory,
      timeSlots: validSlots,
      description:
        r.description !== undefined && r.description !== ''
          ? r.description
          : existing?.description || '',
      imageUrl:
        r.imageUrl !== undefined && r.imageUrl !== ''
          ? r.imageUrl
          : existing?.imageUrl || '',
    };
  }

  public saveRoutine(routine: CareRoutine): CareRoutine[] {
    const idx = this.careRoutines.findIndex((r) => r.id === routine.id);
    const clean = this.sanitizeRoutine(routine);
    // Khi người dùng chủ động lưu từ form, tôn trọng giá trị rỗng nếu họ xoá ảnh/mô tả
    clean.description = routine.description || '';
    clean.imageUrl = routine.imageUrl || '';
    if (idx >= 0) {
      this.careRoutines[idx] = clean;
    } else {
      this.careRoutines.push(clean);
    }
    return this.careRoutines;
  }

  public deleteRoutine(id: string): CareRoutine[] {
    this.careRoutines = this.careRoutines.filter((r) => r.id !== id);
    return this.careRoutines;
  }

  public setCareRoutines(list: CareRoutine[]): void {
    if (Array.isArray(list)) {
      const existingMap = new Map(this.careRoutines.map((r) => [r.id, r]));
      this.careRoutines = list.map((r) => this.sanitizeRoutine(r, existingMap.get(r.id)));
    }
  }

  public getStages(): RehabStage[] {
    const stageMap = new Map<string, RehabStage>();
    for (const r of this.careRoutines) {
      if (!stageMap.has(r.stageId)) {
        stageMap.set(r.stageId, {
          id: r.stageId,
          name: r.stageName,
          isActive: r.isActive,
        });
      }
    }
    return Array.from(stageMap.values());
  }

  // --- DailyLogs (Tích hoàn thành hàng ngày) ---
  public getDailyLogs(date?: string): DailyLog[] {
    if (date) {
      return this.dailyLogs.filter((dl) => dl.date === date);
    }
    return this.dailyLogs;
  }

  public upsertDailyLog(log: DailyLog): DailyLog {
    const idx = this.dailyLogs.findIndex((dl) => dl.id === log.id);
    if (idx >= 0) {
      this.dailyLogs[idx] = log;
    } else {
      this.dailyLogs.push(log);
    }
    return log;
  }

  public setDailyLogs(list: DailyLog[]): void {
    if (list && Array.isArray(list)) {
      this.dailyLogs = list;
    }
  }

  // --- Appointment (Lịch tái khám) ---
  public getAppointment(): AppointmentInfo {
    return this.appointment;
  }

  public setAppointment(info: AppointmentInfo): void {
    this.appointment = { ...this.appointment, ...info };
  }

  // --- BP Thresholds (Ngưỡng cảnh báo HA) ---
  public getBpThresholds(): BpThresholds {
    return this.bpThresholds;
  }

  public setBpThresholds(t: BpThresholds): void {
    this.bpThresholds = { ...this.bpThresholds, ...t };
  }

  // --- App Mode ---
  public getAppMode(): AppMode {
    return this.appMode;
  }

  public setAppMode(mode: AppMode): void {
    this.appMode = mode;
  }

  // --- Expense PIN (Mã PIN riêng biệt cho Sổ Thu Chi) ---
  public getExpensePin(): string {
    return this.expensePin;
  }

  public setExpensePin(pin: string): void {
    if (pin && pin.trim()) {
      this.expensePin = pin.trim();
    }
  }

  public verifyExpensePin(pin: string): boolean {
    return this.expensePin === (pin || '').trim();
  }

  public changeExpensePin(oldPin: string, newPin: string): boolean {
    if (this.verifyExpensePin(oldPin)) {
      if (newPin && newPin.trim().length >= 4) {
        this.expensePin = newPin.trim();
        return true;
      }
    }
    return false;
  }

  // --- Expenses (Sổ Theo Dõi Thu Chi Điều Trị) ---
  public getExpenses(): ExpenseEntry[] {
    return [...this.expenses].sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }

  public setExpenses(list: ExpenseEntry[]): void {
    if (Array.isArray(list)) {
      this.expenses = list;
    }
  }

  public saveExpense(entry: ExpenseEntry): ExpenseEntry[] {
    const idx = this.expenses.findIndex((e) => e.id === entry.id);
    if (idx >= 0) {
      this.expenses[idx] = entry;
    } else {
      this.expenses.unshift(entry);
    }
    return this.getExpenses();
  }

  public deleteExpense(id: string): ExpenseEntry[] {
    this.expenses = this.expenses.filter((e) => e.id !== id && `exp_${e.id}` !== id && e.id !== `exp_${id}`);
    return this.getExpenses();
  }

  // --- All App Data V2 (mở rộng getAllData) ---
  public getAllDataV2(startDate: string, endDate: string, phase: CarePhase): AllAppDataV2 {
    return {
      ...this.getAllData(startDate, endDate, phase),
      shifts: this.getAllLoadedShifts(),
      vitalsLog: this.getVitalsLog(),
      careRoutines: this.getCareRoutines(),
      dailyLogs: this.getDailyLogs(),
      stages: this.getStages(),
      appointment: this.getAppointment(),
      bpThresholds: this.getBpThresholds(),
      appMode: this.getAppMode(),
      expenses: this.getExpenses(),
    };
  }
}

// Global singleton (giữ trên cả môi trường dev & warm serverless container)
declare global {
  var __memoryShiftStore: MemoryShiftStore | undefined;
  var __serverCacheManager: ServerCacheManager | undefined;
}

interface CacheEntry {
  data: AllAppData;
  timestamp: number;
}

// Bộ quản lý Cache In-Memory trên máy chủ (TTL = 45 giây, tự xoá tức thì khi có thao tác ghi)
class ServerCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL_MS = 45 * 1000; // 45s TTL

  private getCacheKey(startDate: string, endDate: string, phase: CarePhase): string {
    return `${startDate}_${endDate}_${phase}`;
  }

  public get(startDate: string, endDate: string, phase: CarePhase): AllAppData | null {
    const key = this.getCacheKey(startDate, endDate, phase);
    const entry = this.cache.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (now - entry.timestamp > this.TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  public set(startDate: string, endDate: string, phase: CarePhase, data: AllAppData): void {
    const key = this.getCacheKey(startDate, endDate, phase);
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  public invalidateAll(): void {
    this.cache.clear();
  }
}

const memoryStore = globalThis.__memoryShiftStore ?? new MemoryShiftStore();
globalThis.__memoryShiftStore = memoryStore;

const serverCacheManager = globalThis.__serverCacheManager ?? new ServerCacheManager();
globalThis.__serverCacheManager = serverCacheManager;

// Chống gọi trùng lặp nhiều GET cùng lúc lên Google Apps Script (Request Deduplication)
let inflightGetAllDataPromise: Promise<Record<string, unknown> | null> | null = null;

interface WebappResponse {
  success?: boolean;
  message?: string;
  valid?: boolean;
  [key: string]: unknown;
}

// Hàm gửi POST đồng bộ tới Google Apps Script với Timeout 20s an toàn
async function sendToWebappWithTimeout(
  payload: Record<string, unknown>,
  timeoutMs: number = 20000
): Promise<{ success: boolean; data?: WebappResponse; error?: string }> {
  const webappUrl = getWebappUrl();
  if (!webappUrl) return { success: false, error: 'Chưa cấu hình GOOGLE_SHEETS_WEBAPP_URL' };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(webappUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();

    if (text.includes('accounts.google.com') || text.includes('Sign in - Google Accounts')) {
      const msg = 'Google Apps Script yêu cầu đăng nhập: Vui lòng kiểm tra quyền truy cập Web App là "Anyone" (Bất kỳ ai)';
      console.warn('[Sync WebApp]', msg);
      return { success: false, error: msg };
    }

    try {
      const json = JSON.parse(text) as WebappResponse;
      return { success: json.success ?? true, data: json };
    } catch {
      console.warn('[Sync WebApp] Phản hồi không phải JSON:', text.substring(0, 150));
      return { success: false, error: 'Phản hồi không phải JSON hợp lệ' };
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err instanceof Error ? err : new Error(String(err));
    if (error.name === 'AbortError') {
      console.warn(`[Sync WebApp] Timeout sau ${timeoutMs}ms (${String(payload.action)})`);
      return { success: false, error: `Hết thời gian chờ (${timeoutMs}ms)` };
    } else {
      console.warn('[Sync WebApp] Lỗi kết nối:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Hàm hỗ trợ đọc JSON từ Google Apps Script GET với tự động thử lại 1 lần nếu timeout/mạng chập chờn
async function fetchJsonFromWebappGet(urlStr: string, timeoutMs: number = 20000): Promise<Record<string, unknown> | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(urlStr, {
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const text = await res.text();
      if (text.includes('accounts.google.com') || text.includes('Sign in - Google Accounts')) {
        console.warn('[Fetch App Data] Web App trả về trang đăng nhập Google! Cần kiểm tra quyền "Anyone" (Bất kỳ ai).');
        return null;
      }
      return JSON.parse(text) as Record<string, unknown>;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Fetch App Data] Lần thử ${attempt} thất bại:`, error.message);
      if (attempt === 2) return null;
    }
  }
  return null;
}

// ==========================================
// TẢI TOÀN BỘ DỮ LIỆU ĐỘNG TỪ GOOGLE SHEETS
// ==========================================
export async function fetchAppDataFromStorage(
  startDate: string,
  endDate: string,
  phase: CarePhase,
  forceRefresh: boolean = false
): Promise<AllAppData> {
  // 1. Kiểm tra cache nếu không yêu cầu làm mới bắt buộc và đã đồng bộ với Sheet
  if (!forceRefresh && memoryStore.isSynced()) {
    const cached = serverCacheManager.get(startDate, endDate, phase);
    if (cached) {
      return cached;
    }
  }

  const webappUrl = getWebappUrl();

  // 2. Truy vấn dữ liệu trực tiếp từ Google Apps Script Web App (1 request duy nhất)
  if (webappUrl) {
    try {
      if (!inflightGetAllDataPromise) {
        const url = new URL(webappUrl);
        url.searchParams.set('action', 'getAllData');
        inflightGetAllDataPromise = fetchJsonFromWebappGet(url.toString(), 20000).finally(() => {
          inflightGetAllDataPromise = null;
        });
      }

      const data = await inflightGetAllDataPromise;

      if (data && data.success) {
        if (Array.isArray(data.members)) {
          memoryStore.setMembers(data.members as FamilyMember[]);
        }
        if (data.patientInfo && typeof data.patientInfo === 'object' && (data.patientInfo as PatientInfo).name) {
          memoryStore.setPatientInfo(unpackPatientInfoFromSheet(data.patientInfo as PatientInfo));
        }
        if (data.adminPin) {
          memoryStore.setAdminPin(String(data.adminPin));
        } else if (data.settings && typeof data.settings === 'object' && (data.settings as Record<string, unknown>).adminPin) {
          memoryStore.setAdminPin(String((data.settings as Record<string, unknown>).adminPin));
        }
        if (data.expensePin) {
          memoryStore.setExpensePin(String(data.expensePin));
        }
        if (Array.isArray(data.contacts)) {
          memoryStore.setContacts(data.contacts as EmergencyContact[]);
        }

        // Phân tách Reminders thông thường và các bản ghi Sổ Thu Chi lưu tương thích ngược trên Sheet
        const fallbackExpenses: ExpenseEntry[] = [];
        if (Array.isArray(data.reminders)) {
          const cleanReminders: PatientDailyReminder[] = [];
          for (const rawRem of data.reminders as PatientDailyReminder[]) {
            const remId = String(rawRem.id || '').trim();
            if (remId === 'sys_expense_pin') {
              if (rawRem.content && String(rawRem.content).trim()) {
                memoryStore.setExpensePin(String(rawRem.content).trim());
              }
            } else if (remId.startsWith('exp_')) {
              try {
                const parsedExp = JSON.parse(String(rawRem.content || '')) as ExpenseEntry;
                if (parsedExp && parsedExp.id && typeof parsedExp.amount === 'number') {
                  fallbackExpenses.push(parsedExp);
                }
              } catch {
                // ignore malformed json
              }
            } else {
              cleanReminders.push(rawRem);
            }
          }
          memoryStore.setReminders(cleanReminders);
        }

        // Nạp danh sách Thu Chi từ Sheet Expenses (nếu Code.gs mới) kết hợp bản ghi tương thích ngược
        const expenseMap = new Map<string, ExpenseEntry>();
        for (const fe of fallbackExpenses) {
          expenseMap.set(fe.id, fe);
        }
        if (Array.isArray(data.expenses)) {
          for (const se of data.expenses as ExpenseEntry[]) {
            if (se && se.id) {
              expenseMap.set(se.id, se);
            }
          }
        }
        memoryStore.setExpenses(Array.from(expenseMap.values()));

        // Nạp toàn bộ ca trực thực tế từ Google Sheets (cả phase1 và phase2 trong 1 lần đọc)
        memoryStore.clearShifts();
        if (Array.isArray(data.shifts)) {
          (data.shifts as ShiftRecord[]).forEach((s: ShiftRecord) => memoryStore.saveShift(s));
        }

        // V2.0: Nạp dữ liệu mới từ Google Sheets (kể cả khi mảng rỗng)
        if (Array.isArray(data.vitalsLog)) {
          memoryStore.setVitalsLog(data.vitalsLog as VitalsLogEntry[]);
        }
        if (Array.isArray(data.careRoutines)) {
          memoryStore.setCareRoutines(data.careRoutines as CareRoutine[]);
        }
        if (Array.isArray(data.dailyLogs)) {
          memoryStore.setDailyLogs(data.dailyLogs as DailyLog[]);
        }
        if (data.appointment && typeof data.appointment === 'object') {
          memoryStore.setAppointment(data.appointment as AppointmentInfo);
        }
        if (data.bpThresholds && typeof data.bpThresholds === 'object') {
          memoryStore.setBpThresholds(data.bpThresholds as BpThresholds);
        }

        memoryStore.markSynced(true);

        const freshData: AllAppData = {
          shifts: memoryStore.getShifts(startDate, endDate, phase),
          members: memoryStore.getMembers(),
          patientInfo: memoryStore.getPatientInfo(),
          contacts: memoryStore.getContacts(),
          reminders: memoryStore.getReminders(),
          settings: {
            ...memoryStore.getSettings(),
            googleSheetsConnected: true,
          },
        };

        // CHỈ lưu vào Server Cache khi đã kết nối và đọc thành công!
        serverCacheManager.set(startDate, endDate, phase, freshData);
        return freshData;
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.warn('Lỗi kết nối Apps Script Web App getAllData:', error.message);
    }
  }

  // 3. Dự phòng: Memory Store (KHÔNG cache dữ liệu thất bại để lần đọc kế tiếp thử kết nối lại ngay)
  return memoryStore.getAllData(startDate, endDate, phase);
}

// ==========================================
// CRUD SHIFTS (CA TRỰC)
// ==========================================
export async function fetchShiftsFromStorage(
  startDate: string,
  endDate: string,
  phase: CarePhase,
  forceRefresh: boolean = false
): Promise<ShiftRecord[]> {
  const allData = await fetchAppDataFromStorage(startDate, endDate, phase, forceRefresh);
  return allData.shifts;
}

export async function saveShiftToStorage(shift: ShiftRecord): Promise<ShiftRecord> {
  const updated = memoryStore.saveShift(shift);
  // Vô hiệu hoá cache tức thì để lần đọc tiếp theo lấy dữ liệu mới
  serverCacheManager.invalidateAll();

  // BẮT BUỘC AWAIT để Server Action không bị runtime tắt đột ngột trước khi Google Sheets ghi xong
  const syncRes = await sendToWebappWithTimeout({ action: 'saveShift', shift: updated }, 20000);
  if (!syncRes.success) {
    console.warn('[saveShiftToStorage] Đồng bộ Google Sheets thất bại hoặc timeout:', syncRes.error || syncRes);
  }

  return updated;
}

// ==========================================
// CRUD MEMBERS (THÀNH VIÊN)
// ==========================================
export async function saveMemberToStorage(member: FamilyMember): Promise<FamilyMember[]> {
  const updatedList = memoryStore.saveMember(member);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'saveMember', member }, 20000);
  return updatedList;
}

export async function deleteMemberFromStorage(memberId: string): Promise<FamilyMember[]> {
  const updatedList = memoryStore.deleteMember(memberId);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'deleteMember', memberId }, 20000);
  return updatedList;
}

// ==========================================
// CRUD CONTACTS (DANH BẠ SOS KHẨN CẤP)
// ==========================================
export async function saveContactToStorage(contact: EmergencyContact): Promise<EmergencyContact[]> {
  const updatedList = memoryStore.saveContact(contact);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'saveContact', contact }, 20000);
  return updatedList;
}

export async function deleteContactFromStorage(contactId: string): Promise<EmergencyContact[]> {
  const updatedList = memoryStore.deleteContact(contactId);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'deleteContact', contactId }, 20000);
  return updatedList;
}

// ==========================================
// CRUD REMINDERS (NHẮC NHỞ Y TẾ TRONG NGÀY)
// ==========================================
export async function saveReminderToStorage(reminder: PatientDailyReminder): Promise<PatientDailyReminder[]> {
  const updatedList = memoryStore.saveReminder(reminder);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'saveReminder', reminder }, 20000);
  return updatedList;
}

export async function deleteReminderFromStorage(reminderId: string): Promise<PatientDailyReminder[]> {
  const updatedList = memoryStore.deleteReminder(reminderId);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'deleteReminder', reminderId }, 20000);
  return updatedList;
}

// ==========================================
// CRUD SETTINGS & PATIENT INFO (HỖ TRỢ ĐẦY ĐỦ CÁC TRƯỜNG MỞ RỘNG & TƯƠNG THÍCH NGƯỢC)
// ==========================================
const PATIENT_META_DELIM = ' ||META||';

function packPatientInfoForSheet(info: PatientInfo): PatientInfo {
  const cleanPhone = String(info.emergencyPhone || '').split(PATIENT_META_DELIM)[0].trim();
  const metaPayload = {
    statusBadge: info.statusBadge ?? '',
    conditionTag: info.conditionTag ?? '',
    headerBadge: info.headerBadge ?? '',
    careMode: info.careMode ?? '',
    careGoal: info.careGoal ?? '',
    customFields: Array.isArray(info.customFields) ? info.customFields : [],
  };
  return {
    ...info,
    emergencyPhone: `${cleanPhone}${PATIENT_META_DELIM}${JSON.stringify(metaPayload)}`,
  };
}

function unpackPatientInfoFromSheet(raw: PatientInfo): PatientInfo {
  const rawPhone = String(raw.emergencyPhone || '');
  let cleanPhone = rawPhone;
  let parsedMeta: Partial<PatientInfo> | null = null;

  if (rawPhone.includes(PATIENT_META_DELIM)) {
    const [phonePart, metaPart] = rawPhone.split(PATIENT_META_DELIM);
    cleanPhone = phonePart.trim();
    if (metaPart) {
      try {
        parsedMeta = JSON.parse(metaPart) as Partial<PatientInfo>;
      } catch {
        parsedMeta = null;
      }
    }
  }

  return {
    name: raw.name || 'Đinh Hồng Phong',
    diagnosis: raw.diagnosis ?? '',
    hospital: raw.hospital ?? '',
    room: raw.room ?? '',
    notes: raw.notes ?? '',
    emergencyPhone: cleanPhone,
    statusBadge:
      raw.statusBadge !== undefined
        ? raw.statusBadge
        : parsedMeta?.statusBadge !== undefined
          ? parsedMeta.statusBadge
          : 'Bệnh nhân theo dõi đặc biệt',
    conditionTag:
      raw.conditionTag !== undefined
        ? raw.conditionTag
        : parsedMeta?.conditionTag !== undefined
          ? parsedMeta.conditionTag
          : 'Tai biến nặng',
    headerBadge:
      raw.headerBadge !== undefined
        ? raw.headerBadge
        : parsedMeta?.headerBadge !== undefined
          ? parsedMeta.headerBadge
          : 'Tại nhà',
    careMode:
      raw.careMode !== undefined
        ? raw.careMode
        : parsedMeta?.careMode !== undefined
          ? parsedMeta.careMode
          : 'Liên tục 24/7',
    careGoal:
      raw.careGoal !== undefined
        ? raw.careGoal
        : parsedMeta?.careGoal !== undefined
          ? parsedMeta.careGoal
          : 'Chống loét & duy trì SpO2',
    customFields: Array.isArray(raw.customFields)
      ? raw.customFields
      : Array.isArray(parsedMeta?.customFields)
        ? parsedMeta!.customFields
        : [],
  };
}

export async function savePatientSettingsToStorage(info: PatientInfo): Promise<PatientInfo> {
  const cleanInfo: PatientInfo = {
    ...info,
    emergencyPhone: String(info.emergencyPhone || '').split(PATIENT_META_DELIM)[0].trim(),
  };
  memoryStore.setPatientInfo(cleanInfo);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout(
    { action: 'saveSettings', patientInfo: packPatientInfoForSheet(cleanInfo) },
    20000
  );
  return memoryStore.getPatientInfo();
}

export function getSystemSettings(): SystemSettings {
  return memoryStore.getSettings();
}

export async function setSystemPhase(phase: CarePhase): Promise<SystemSettings> {
  const updated = memoryStore.setPhase(phase);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'saveSettings', currentPhase: phase }, 20000);
  return updated;
}

// ==========================================
// ADMIN PIN MANAGEMENT
// ==========================================
export async function verifyAdminPinStorage(pin: string): Promise<boolean> {
  // Nếu máy chủ đã đồng bộ mã PIN từ Google Sheets, kiểm tra tức thì (0ms) không cần đợi POST round-trip
  if (memoryStore.isSynced()) {
    return memoryStore.verifyAdminPin(pin);
  }
  const syncRes = await sendToWebappWithTimeout(
    { action: 'verifyAdminPin', pin: pin.trim() },
    8000
  );
  if (syncRes.success && typeof syncRes.data?.valid === 'boolean') {
    if (syncRes.data.valid) {
      memoryStore.setAdminPin(pin.trim());
    }
    return syncRes.data.valid;
  }
  return memoryStore.verifyAdminPin(pin);
}

export async function changeAdminPinStorage(
  oldPin: string,
  newPin: string
): Promise<{ success: boolean; message?: string }> {
  if (!newPin || newPin.trim().length < 4) {
    return { success: false, message: 'Mã PIN mới phải có ít nhất 4 chữ số' };
  }

  const syncRes = await sendToWebappWithTimeout(
    {
      action: 'changeAdminPin',
      oldPin: oldPin.trim(),
      newPin: newPin.trim(),
    },
    10000
  );

  if (syncRes.success) {
    memoryStore.setAdminPin(newPin.trim());
    serverCacheManager.invalidateAll();
    return { success: true };
  }

  const success = memoryStore.changeAdminPin(oldPin, newPin);
  if (success) {
    serverCacheManager.invalidateAll();
    return { success: true };
  } else {
    return { success: false, message: syncRes.data?.message || 'Mã PIN cũ không chính xác' };
  }
}



// ==========================================
// V2.0 — SỔ SỨC KHỎE BỐ — CRUD Storage Functions
// ==========================================

// --- VitalsLog (Nhật ký Huyết áp & Sinh hiệu) ---

export async function saveVitalsToStorage(entry: VitalsLogEntry): Promise<VitalsLogEntry> {
  const saved = memoryStore.saveVitalsEntry(entry);
  serverCacheManager.invalidateAll();

  const syncRes = await sendToWebappWithTimeout({ action: 'saveVitals', vitals: saved }, 20000);
  if (!syncRes.success) {
    console.warn('[saveVitalsToStorage] Đồng bộ Google Sheets thất bại:', syncRes.error || syncRes);
  }

  return saved;
}

export async function deleteVitalsFromStorage(id: string): Promise<void> {
  memoryStore.deleteVitalsEntry(id);
  serverCacheManager.invalidateAll();

  const syncRes = await sendToWebappWithTimeout({ action: 'deleteVitals', vitalsId: id }, 20000);
  if (!syncRes.success) {
    console.warn('[deleteVitalsFromStorage] Đồng bộ Google Sheets thất bại:', syncRes.error || syncRes);
  }
}

export async function fetchVitalsLogFromStorage(): Promise<VitalsLogEntry[]> {
  return memoryStore.getVitalsLog();
}

// --- CareRoutines (Đơn thuốc & Bài tập phục hồi) ---

export async function saveRoutineToStorage(routine: CareRoutine): Promise<CareRoutine[]> {
  const updatedList = memoryStore.saveRoutine(routine);
  serverCacheManager.invalidateAll();

  const syncRes = await sendToWebappWithTimeout({ action: 'saveRoutine', routine }, 20000);
  if (!syncRes.success) {
    console.warn('[saveRoutineToStorage] Đồng bộ Google Sheets thất bại:', syncRes.error || syncRes);
  }

  return updatedList;
}

export async function deleteRoutineFromStorage(id: string): Promise<CareRoutine[]> {
  const updatedList = memoryStore.deleteRoutine(id);
  serverCacheManager.invalidateAll();

  const syncRes = await sendToWebappWithTimeout({ action: 'deleteRoutine', routineId: id }, 20000);
  if (!syncRes.success) {
    console.warn('[deleteRoutineFromStorage] Đồng bộ Google Sheets thất bại:', syncRes.error || syncRes);
  }

  return updatedList;
}

// --- DailyLogs (Tích hoàn thành hàng ngày) ---

export async function upsertDailyLogToStorage(log: DailyLog): Promise<DailyLog> {
  const saved = memoryStore.upsertDailyLog(log);
  serverCacheManager.invalidateAll();

  const syncRes = await sendToWebappWithTimeout({ action: 'toggleDailyLog', dailyLog: saved }, 20000);
  if (!syncRes.success) {
    console.warn('[upsertDailyLogToStorage] Đồng bộ Google Sheets thất bại:', syncRes.error || syncRes);
  }

  return saved;
}

export async function fetchDailyLogsFromStorage(date?: string): Promise<DailyLog[]> {
  return memoryStore.getDailyLogs(date);
}

// --- Appointment (Lịch tái khám) ---

export async function saveAppointmentToStorage(info: AppointmentInfo): Promise<AppointmentInfo> {
  memoryStore.setAppointment(info);
  serverCacheManager.invalidateAll();

  const syncRes = await sendToWebappWithTimeout({ action: 'saveAppointment', appointment: info }, 20000);
  if (!syncRes.success) {
    console.warn('[saveAppointmentToStorage] Đồng bộ Google Sheets thất bại:', syncRes.error || syncRes);
  }

  return memoryStore.getAppointment();
}

// ==========================================
// EXPENSE MODULE — SỔ THEO DÕI THU CHI & MÃ PIN RIÊNG
// ==========================================

export async function verifyExpensePinStorage(pin: string): Promise<boolean> {
  const cleanPin = (pin || '').trim();
  if (!memoryStore.isSynced()) {
    try {
      await fetchAppDataFromStorage('2026-10-01', '2026-10-07', 'phase2', false);
    } catch {
      // ignore
    }
  }
  if (memoryStore.verifyExpensePin(cleanPin)) {
    return true;
  }

  const syncRes = await sendToWebappWithTimeout(
    { action: 'verifyExpensePin', pin: cleanPin },
    8000
  );
  if (syncRes.success && typeof syncRes.data?.valid === 'boolean') {
    if (syncRes.data.valid) {
      memoryStore.setExpensePin(cleanPin);
    }
    return syncRes.data.valid;
  }

  return memoryStore.verifyExpensePin(cleanPin);
}

export async function changeExpensePinStorage(
  oldPin: string,
  newPin: string
): Promise<{ success: boolean; message?: string }> {
  const cleanOld = (oldPin || '').trim();
  const cleanNew = (newPin || '').trim();

  if (!cleanNew || cleanNew.length < 4) {
    return { success: false, message: 'Mã PIN mới phải có ít nhất 4 ký tự' };
  }

  if (!memoryStore.isSynced()) {
    try {
      await fetchAppDataFromStorage('2026-10-01', '2026-10-07', 'phase2', false);
    } catch {
      // ignore
    }
  }

  if (!memoryStore.verifyExpensePin(cleanOld)) {
    return { success: false, message: 'Mã PIN hiện tại của Sổ Thu Chi không chính xác' };
  }

  memoryStore.setExpensePin(cleanNew);
  serverCacheManager.invalidateAll();

  // 1. Thử lưu qua action chuẩn trên Code.gs mới
  const syncRes = await sendToWebappWithTimeout(
    {
      action: 'changeExpensePin',
      oldPin: cleanOld,
      newPin: cleanNew,
    },
    12000
  );

  // 2. Nếu Code.gs trên Apps Script chưa cập nhật action mới, tự động lưu bền vững qua bảng Reminders
  if (!syncRes.success) {
    await sendToWebappWithTimeout(
      {
        action: 'saveReminder',
        reminder: {
          id: 'sys_expense_pin',
          category: 'general',
          title: 'Cấu hình PIN Sổ Thu Chi',
          content: cleanNew,
          author: 'System',
          time: '',
          isUrgent: false,
        },
      },
      15000
    );
  }

  return { success: true };
}

export async function saveExpenseToStorage(entry: ExpenseEntry): Promise<ExpenseEntry[]> {
  const normalized: ExpenseEntry = {
    ...entry,
    id: entry.id || `exp-${Date.now()}`,
    updatedAt: new Date().toISOString(),
  };

  const updatedList = memoryStore.saveExpense(normalized);
  serverCacheManager.invalidateAll();

  // 1. Thử lưu vào Sheet Expenses (Code.gs mới)
  const syncRes = await sendToWebappWithTimeout(
    { action: 'saveExpense', expense: normalized },
    15000
  );

  // 2. Fallback tự động lưu lên Google Sheets nếu Code.gs chưa được redeploy bản mới
  if (!syncRes.success) {
    const fallbackId = normalized.id.startsWith('exp_') ? normalized.id : `exp_${normalized.id}`;
    await sendToWebappWithTimeout(
      {
        action: 'saveReminder',
        reminder: {
          id: fallbackId,
          category: 'general',
          title: `[${normalized.date}] ${normalized.type === 'in' ? 'THU' : 'CHI'}: ${normalized.title}`,
          content: JSON.stringify(normalized),
          author: normalized.personName || 'Quỹ gia đình',
          time: normalized.date,
          isUrgent: false,
        },
      },
      15000
    );
  }

  return updatedList;
}

export async function deleteExpenseFromStorage(expenseId: string): Promise<ExpenseEntry[]> {
  const updatedList = memoryStore.deleteExpense(expenseId);
  serverCacheManager.invalidateAll();

  const syncRes = await sendToWebappWithTimeout(
    { action: 'deleteExpense', expenseId },
    15000
  );

  // Xoá cả bản ghi fallback nếu có
  const fallbackId = expenseId.startsWith('exp_') ? expenseId : `exp_${expenseId}`;
  if (!syncRes.success) {
    await sendToWebappWithTimeout(
      { action: 'deleteReminder', reminderId: fallbackId },
      15000
    );
  } else {
    // Đảm bảo xoá sạch nếu trước đó lưu ở fallback
    void sendToWebappWithTimeout({ action: 'deleteReminder', reminderId: fallbackId }, 10000);
  }

  return updatedList;
}

// --- Fetch All App Data V2 (mở rộng fetchAppDataFromStorage) ---

export async function fetchAllAppDataV2(
  startDate: string,
  endDate: string,
  phase: CarePhase,
  forceRefresh: boolean = false
): Promise<AllAppDataV2> {
  // Tải & nạp dữ liệu v1 + v2.0 từ webapp (hoặc memory fallback)
  await fetchAppDataFromStorage(startDate, endDate, phase, forceRefresh);

  // Trả về AllAppDataV2 đầy đủ từ memory store
  return memoryStore.getAllDataV2(startDate, endDate, phase);
}
