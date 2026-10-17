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
} from './types';
import {
  PHASE_CONFIGS,
  buildDefaultShiftRecord,
  FAMILY_MEMBERS,
  PATIENT_INFO,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_APPOINTMENT,
  DEFAULT_CARE_ROUTINES,
} from './config';

// Tên các trang tính trong Google Sheet (8 Sheets V2.0)
export const SHEET_NAMES = {
  SHIFTS: 'Shifts',
  MEMBERS: 'Members',
  SETTINGS: 'Settings',
  CONTACTS: 'Contacts',
  REMINDERS: 'Reminders',
  VITALS_LOG: 'VitalsLog',
  CARE_ROUTINES: 'CareRoutines',
  DAILY_LOGS: 'DailyLogs',
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

// In-memory fallback database hoàn chỉnh cho 5 thực thể
class MemoryShiftStore {
  private shifts: Map<string, ShiftRecord> = new Map();
  private members: FamilyMember[] = [...FAMILY_MEMBERS];
  private patientInfo: PatientInfo = { ...PATIENT_INFO };
  private contacts: EmergencyContact[] = [];
  private reminders: PatientDailyReminder[] = [];
  private systemSettings: SystemSettings = {
    currentPhase: 'phase1',
    patientName: PATIENT_INFO.name,
    patientRoom: PATIENT_INFO.room,
    hospital: PATIENT_INFO.hospital,
    diagnosis: PATIENT_INFO.diagnosis,
    doctorNotes: PATIENT_INFO.notes,
    emergencyPhone: '0913 218 765 (BS. Hùng - ICU)',
    googleSheetsConnected: false,
  };
  private adminPin: string = '1234';

  // --- V2.0: Sổ Sức Khỏe Bố — Private fields ---
  private vitalsLog: VitalsLogEntry[] = [];
  private careRoutines: CareRoutine[] = [...DEFAULT_CARE_ROUTINES];
  private dailyLogs: DailyLog[] = [];
  private bpThresholds: BpThresholds = { ...DEFAULT_BP_THRESHOLDS };
  private appointment: AppointmentInfo = { ...DEFAULT_APPOINTMENT };
  private appMode: AppMode = 'home_care';

  constructor() {
    // Không nạp dữ liệu mẫu giả lập - mọi ca trực bắt đầu sạch sẽ 100%
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
    if (phaseStr.includes('2')) normalizedPhase = 'phase2';
    else normalizedPhase = 'phase1';

    // 3. Chuẩn hoá id
    const normalizedId = `${normalizedDate}_${shift.type}_${normalizedPhase}`;

    const assignees = shift.assignees || [];
    const supporters = shift.supporters || [];
    const reqPax = shift.requiredPax && shift.requiredPax > 0 ? shift.requiredPax : 1;
    const filledCount = assignees.filter(Boolean).length;

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

    this.shifts.set(normalizedShift.id, normalizedShift);
    return normalizedShift;
  }

  // --- Members ---
  public getMembers(): FamilyMember[] {
    return this.members;
  }

  public setMembers(list: FamilyMember[]): void {
    if (list && list.length > 0) {
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
    const isConnected = Boolean(getWebappUrl() || getServiceAccountCreds());
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
    if (list && list.length > 0) {
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
    if (list && list.length > 0) {
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
    const defaultMatch = DEFAULT_CARE_ROUTINES.find((d) => d.id === r.id);
    return {
      ...r,
      category: validCategory,
      timeSlots: validSlots,
      description:
        r.description !== undefined && r.description !== ''
          ? r.description
          : existing?.description || defaultMatch?.description || '',
      imageUrl:
        r.imageUrl !== undefined && r.imageUrl !== ''
          ? r.imageUrl
          : existing?.imageUrl || defaultMatch?.imageUrl || '',
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
    if (list && Array.isArray(list) && list.length > 0) {
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

  // --- All App Data V2 (mở rộng getAllData) ---
  public getAllDataV2(startDate: string, endDate: string, phase: CarePhase): AllAppDataV2 {
    return {
      ...this.getAllData(startDate, endDate, phase),
      vitalsLog: this.getVitalsLog(),
      careRoutines: this.getCareRoutines(),
      dailyLogs: this.getDailyLogs(),
      stages: this.getStages(),
      appointment: this.getAppointment(),
      bpThresholds: this.getBpThresholds(),
      appMode: this.getAppMode(),
    };
  }
}

// Global singleton
declare global {
  var __memoryShiftStore: MemoryShiftStore | undefined;
  var __serverCacheManager: ServerCacheManager | undefined;
}

interface CacheEntry {
  data: AllAppData;
  timestamp: number;
}

// Bộ quản lý Cache In-Memory trên máy chủ (TTL = 10 giây)
class ServerCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL_MS = 10 * 1000; // 10s TTL

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
if (process.env.NODE_ENV !== 'production') {
  globalThis.__memoryShiftStore = memoryStore;
}

const serverCacheManager = globalThis.__serverCacheManager ?? new ServerCacheManager();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__serverCacheManager = serverCacheManager;
}

interface WebappResponse {
  success?: boolean;
  message?: string;
  valid?: boolean;
  [key: string]: unknown;
}

// Hàm gửi POST đồng bộ tới Google Apps Script với Timeout 15s an toàn
async function sendToWebappWithTimeout(
  payload: Record<string, unknown>,
  timeoutMs: number = 15000
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

// ==========================================
// TẢI TOÀN BỘ DỮ LIỆU ĐỘNG TỪ GOOGLE SHEETS
// ==========================================
export async function fetchAppDataFromStorage(
  startDate: string,
  endDate: string,
  phase: CarePhase,
  forceRefresh: boolean = false
): Promise<AllAppData> {
  // 1. Kiểm tra cache nếu không yêu cầu làm mới bắt buộc
  if (!forceRefresh) {
    const cached = serverCacheManager.get(startDate, endDate, phase);
    if (cached) {
      return cached;
    }
  }

  const webappUrl = getWebappUrl();

  // 2. Nếu có Google Apps Script Web App, truy vấn dữ liệu với Timeout 15s
  if (webappUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const url = new URL(webappUrl);
      url.searchParams.set('action', 'getAllData');
      // LƯU Ý: Không gửi startDate/endDate để Google Apps Script trả về toàn bộ ca thực tế đang có trên Sheet.
      // Next.js sẽ nạp toàn bộ ca vào memoryStore và tự động điều phối đúng tuần/tháng theo múi giờ chuẩn,
      // loại bỏ hoàn toàn các lỗi lọc ngày (DD/MM/YYYY vs YYYY-MM-DD) và lệch múi giờ trên Apps Script.

      const res = await fetch(url.toString(), {
        cache: 'no-store',
        redirect: 'follow',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const text = await res.text();

      if (text.includes('accounts.google.com') || text.includes('Sign in - Google Accounts')) {
        console.warn('[Fetch App Data] Web App trả về trang đăng nhập Google! Cần kiểm tra quyền "Anyone" (Bất kỳ ai).');
      } else {
        let data: Record<string, unknown> | null = null;
        try {
          data = JSON.parse(text);
        } catch {
          console.warn('[Fetch App Data] Phản hồi không phải JSON:', text.substring(0, 150));
        }

        if (data && data.success) {
          if (Array.isArray(data.members) && data.members.length > 0) {
            memoryStore.setMembers(data.members as FamilyMember[]);
          }
          if (data.patientInfo && typeof data.patientInfo === 'object' && (data.patientInfo as PatientInfo).name) {
            memoryStore.setPatientInfo(data.patientInfo as PatientInfo);
          }
          if (data.adminPin) {
            memoryStore.setAdminPin(String(data.adminPin));
          } else if (data.settings && typeof data.settings === 'object' && (data.settings as Record<string, unknown>).adminPin) {
            memoryStore.setAdminPin(String((data.settings as Record<string, unknown>).adminPin));
          }
          if (Array.isArray(data.contacts)) {
            memoryStore.setContacts(data.contacts as EmergencyContact[]);
          }
          if (Array.isArray(data.reminders)) {
            memoryStore.setReminders(data.reminders as PatientDailyReminder[]);
          }
          if (Array.isArray(data.shifts)) {
            if (data.shifts.length > 0) {
              // Nạp chính xác những ca thực tế trên Google Sheets vào bộ nhớ
              memoryStore.clearShifts();
              (data.shifts as ShiftRecord[]).forEach((s: ShiftRecord) => memoryStore.saveShift(s));
            }
          }

          // V2.0: Nạp dữ liệu mới nếu có từ webapp response
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
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.name === 'AbortError') {
        console.warn('[Fetch App Data] Timeout Web App 15s, dùng bộ nhớ đệm');
      } else {
        console.warn('Lỗi kết nối Apps Script Web App getAllData:', error.message);
      }
    }
  }

  // 3. Dự phòng: Memory Store (KHÔNG cache dữ liệu thất bại để lần đọc kế tiếp thử kết nối lại ngay)
  const fallbackData = memoryStore.getAllData(startDate, endDate, phase);
  return fallbackData;
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
  const syncRes = await sendToWebappWithTimeout({ action: 'saveShift', shift: updated }, 15000);
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
  await sendToWebappWithTimeout({ action: 'saveMember', member }, 15000);
  return updatedList;
}

export async function deleteMemberFromStorage(memberId: string): Promise<FamilyMember[]> {
  const updatedList = memoryStore.deleteMember(memberId);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'deleteMember', memberId }, 15000);
  return updatedList;
}

// ==========================================
// CRUD CONTACTS (DANH BẠ SOS KHẨN CẤP)
// ==========================================
export async function saveContactToStorage(contact: EmergencyContact): Promise<EmergencyContact[]> {
  const updatedList = memoryStore.saveContact(contact);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'saveContact', contact }, 15000);
  return updatedList;
}

export async function deleteContactFromStorage(contactId: string): Promise<EmergencyContact[]> {
  const updatedList = memoryStore.deleteContact(contactId);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'deleteContact', contactId }, 15000);
  return updatedList;
}

// ==========================================
// CRUD REMINDERS (NHẮC NHỞ Y TẾ TRONG NGÀY)
// ==========================================
export async function saveReminderToStorage(reminder: PatientDailyReminder): Promise<PatientDailyReminder[]> {
  const updatedList = memoryStore.saveReminder(reminder);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'saveReminder', reminder }, 15000);
  return updatedList;
}

export async function deleteReminderFromStorage(reminderId: string): Promise<PatientDailyReminder[]> {
  const updatedList = memoryStore.deleteReminder(reminderId);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'deleteReminder', reminderId }, 15000);
  return updatedList;
}

// ==========================================
// CRUD SETTINGS & PATIENT INFO
// ==========================================
export async function savePatientSettingsToStorage(info: PatientInfo): Promise<PatientInfo> {
  memoryStore.setPatientInfo(info);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'saveSettings', patientInfo: info }, 15000);
  return memoryStore.getPatientInfo();
}

export function getSystemSettings(): SystemSettings {
  return memoryStore.getSettings();
}

export async function setSystemPhase(phase: CarePhase): Promise<SystemSettings> {
  const updated = memoryStore.setPhase(phase);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'saveSettings', currentPhase: phase }, 15000);
  return updated;
}

// ==========================================
// ADMIN PIN MANAGEMENT
// ==========================================
export async function verifyAdminPinStorage(pin: string): Promise<boolean> {
  const syncRes = await sendToWebappWithTimeout(
    { action: 'verifyAdminPin', pin: pin.trim() },
    5000
  );
  if (syncRes.success && typeof syncRes.data?.valid === 'boolean') {
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
    7000
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

  const syncRes = await sendToWebappWithTimeout({ action: 'saveVitals', vitals: saved }, 15000);
  if (!syncRes.success) {
    console.warn('[saveVitalsToStorage] Đồng bộ Google Sheets thất bại:', syncRes.error || syncRes);
  }

  return saved;
}

export async function deleteVitalsFromStorage(id: string): Promise<void> {
  memoryStore.deleteVitalsEntry(id);
  serverCacheManager.invalidateAll();

  const syncRes = await sendToWebappWithTimeout({ action: 'deleteVitals', vitalsId: id }, 15000);
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

  const syncRes = await sendToWebappWithTimeout({ action: 'saveRoutine', routine }, 15000);
  if (!syncRes.success) {
    console.warn('[saveRoutineToStorage] Đồng bộ Google Sheets thất bại:', syncRes.error || syncRes);
  }

  return updatedList;
}

export async function deleteRoutineFromStorage(id: string): Promise<CareRoutine[]> {
  const updatedList = memoryStore.deleteRoutine(id);
  serverCacheManager.invalidateAll();

  const syncRes = await sendToWebappWithTimeout({ action: 'deleteRoutine', routineId: id }, 15000);
  if (!syncRes.success) {
    console.warn('[deleteRoutineFromStorage] Đồng bộ Google Sheets thất bại:', syncRes.error || syncRes);
  }

  return updatedList;
}

// --- DailyLogs (Tích hoàn thành hàng ngày) ---

export async function upsertDailyLogToStorage(log: DailyLog): Promise<DailyLog> {
  const saved = memoryStore.upsertDailyLog(log);
  serverCacheManager.invalidateAll();

  const syncRes = await sendToWebappWithTimeout({ action: 'toggleDailyLog', dailyLog: saved }, 15000);
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

  const syncRes = await sendToWebappWithTimeout({ action: 'saveAppointment', appointment: info }, 15000);
  if (!syncRes.success) {
    console.warn('[saveAppointmentToStorage] Đồng bộ Google Sheets thất bại:', syncRes.error || syncRes);
  }

  return memoryStore.getAppointment();
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
