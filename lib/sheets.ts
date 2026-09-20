import {
  CarePhase,
  ShiftRecord,
  SystemSettings,
  FamilyMember,
  PatientInfo,
  EmergencyContact,
  PatientDailyReminder,
  AllAppData,
} from './types';
import {
  PHASE_CONFIGS,
  buildDefaultShiftRecord,
  FAMILY_MEMBERS,
  PATIENT_INFO,
  DEFAULT_EMERGENCY_CONTACTS,
  DEFAULT_PATIENT_REMINDERS,
} from './config';

// Tên các trang tính trong Google Sheet
export const SHEET_NAMES = {
  SHIFTS: 'Shifts',
  MEMBERS: 'Members',
  SETTINGS: 'Settings',
  CONTACTS: 'Contacts',
  REMINDERS: 'Reminders',
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

function getWebappUrl(): string | undefined {
  return process.env.GOOGLE_SHEETS_WEBAPP_URL || process.env.GOOGLE_SHEET_WEBAPP_URL;
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
  private contacts: EmergencyContact[] = [...DEFAULT_EMERGENCY_CONTACTS];
  private reminders: PatientDailyReminder[] = [...DEFAULT_PATIENT_REMINDERS];
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

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const today = new Date();
    const dateList: string[] = [];
    for (let i = -3; i <= 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateList.push(`${yyyy}-${mm}-${dd}`);
    }

    dateList.forEach((dateStr, idx) => {
      const morning = buildDefaultShiftRecord(dateStr, PHASE_CONFIGS.phase1.shifts[0], 'phase1');
      const afternoon = buildDefaultShiftRecord(dateStr, PHASE_CONFIGS.phase1.shifts[1], 'phase1');
      const night = buildDefaultShiftRecord(dateStr, PHASE_CONFIGS.phase1.shifts[2], 'phase1');

      if (idx === 0) {
        morning.assignees = ['Bác Thành'];
        morning.isUnderstaffed = false;
        morning.handover = {
          note: 'Bác đáp ứng tốt, cử động nhẹ ngón tay. Đã bơm súp xay 250ml.',
          author: 'Bác Thành',
          updatedAt: '10:00',
          vitals: { bp: '138/88', spo2: '95%', pulse: '82', temp: '37.2' },
        };
        afternoon.assignees = ['Cô Lan'];
        afternoon.isUnderstaffed = false;
        afternoon.handover = {
          note: 'Huyết áp hơi cao nhẹ lúc đầu giờ chiều, bác sĩ cho ngậm 1/2 viên hạ áp.',
          author: 'Cô Lan',
          updatedAt: '16:30',
          vitals: { bp: '142/90', spo2: '96%', pulse: '84', temp: '37.0' },
        };
        night.assignees = ['Anh Dũng'];
        night.isUnderstaffed = false;
        night.handover = {
          note: 'Bác ngủ êm, thở đều qua canun mũi 2L/phút, không sốt.',
          author: 'Anh Dũng',
          updatedAt: '23:15',
          vitals: { bp: '130/82', spo2: '97%', pulse: '74', temp: '36.8' },
        };
      } else if (idx === 1) {
        morning.assignees = ['Chị Mai'];
        morning.isUnderstaffed = false;
        morning.handover = {
          note: 'Bác mở mắt theo tiếng gọi của con cháu. Vệ sinh răng miệng sạch sẽ.',
          author: 'Chị Mai',
          updatedAt: '09:00',
          vitals: { bp: '132/84', spo2: '96%', pulse: '78', temp: '36.7' },
        };
        afternoon.assignees = ['Anh Hùng'];
        afternoon.isUnderstaffed = false;
        afternoon.handover = {
          note: 'Bác tỉnh táo hơn, vỗ rung đờm ra ít đờm trắng loãng.',
          author: 'Anh Hùng',
          updatedAt: '15:45',
          vitals: { bp: '128/80', spo2: '98%', pulse: '76', temp: '36.6' },
        };
        night.assignees = ['Chị Trang'];
        night.isUnderstaffed = false;
        night.handover = {
          note: 'Đêm yên, lật trở tư thế nghiêng trái lúc 01h và nghiêng phải lúc 04h.',
          author: 'Chị Trang',
          updatedAt: '05:30',
          vitals: { bp: '126/80', spo2: '97%', pulse: '72', temp: '36.7' },
        };
      } else if (idx === 2) {
        morning.assignees = ['Cháu Quân'];
        morning.isUnderstaffed = false;
        morning.handover = {
          note: 'Bác sĩ kiểm tra phản xạ gân xương có tiến triển. Bơm sữa Peptamen 250ml.',
          author: 'Cháu Quân',
          updatedAt: '09:30',
          vitals: { bp: '125/78', spo2: '98%', pulse: '75', temp: '36.8' },
        };
        afternoon.assignees = ['Bác Thành'];
        afternoon.isUnderstaffed = false;
        afternoon.handover = {
          note: 'Tập vật lý trị liệu thụ động tại giường 30 phút. Bác hơi mệt nhưng sinh hiệu ổn định.',
          author: 'Bác Thành',
          updatedAt: '16:00',
          vitals: { bp: '130/82', spo2: '97%', pulse: '80', temp: '36.9' },
        };
        night.assignees = ['Anh Dũng'];
        night.isUnderstaffed = false;
        night.handover = {
          note: 'Thấm hút đờm họng định kỳ. Bỉm khô ráo, không đỏ da vùng cùng cụt.',
          author: 'Anh Dũng',
          updatedAt: '22:45',
          vitals: { bp: '128/82', spo2: '98%', pulse: '73', temp: '36.6' },
        };
      } else if (idx === 3) {
        morning.assignees = ['Bác Thành'];
        morning.isUnderstaffed = false;
        morning.checklist.feeding = true;
        morning.checklist.meds = true;
        morning.checklist.turning = true;
        morning.checklist.hygiene = false;
        morning.handover = {
          note: 'Bác tỉnh táo nhẹ, gọi có chớp mắt. Đã bơm 250ml sữa Ensure lúc 08h30. Bác sĩ vừa đi buồng dặn theo dõi nước tiểu.',
          author: 'Bác Thành',
          updatedAt: '09:15',
          vitals: { bp: '130/85', spo2: '97%', pulse: '76', temp: '36.8' },
        };

        afternoon.assignees = ['Cô Lan'];
        afternoon.isUnderstaffed = false;
        afternoon.checklist.feeding = false;
        afternoon.handover = {
          note: 'Uống thuốc lúc 14h. Huyết áp ổn định 124/80. Bác ngủ trưa sâu.',
          author: 'Cô Lan',
          updatedAt: '15:30',
          vitals: { bp: '124/80', spo2: '99%', pulse: '72', temp: '36.7' },
        };

        night.assignees = [null];
        night.isUnderstaffed = true;
      } else if (idx === 4) {
        morning.assignees = ['Anh Hùng'];
        morning.isUnderstaffed = false;
        afternoon.assignees = [null];
        afternoon.isUnderstaffed = true;
        night.assignees = ['Anh Dũng'];
        night.isUnderstaffed = false;
      } else if (idx === 5) {
        morning.assignees = ['Chị Mai'];
        morning.isUnderstaffed = false;
        afternoon.assignees = ['Chị Trang'];
        afternoon.isUnderstaffed = false;
        night.assignees = [null];
        night.isUnderstaffed = true;
      }

      this.shifts.set(morning.id, morning);
      this.shifts.set(afternoon.id, afternoon);
      this.shifts.set(night.id, night);

      const day12 = buildDefaultShiftRecord(dateStr, PHASE_CONFIGS.phase2.shifts[0], 'phase2');
      const night12 = buildDefaultShiftRecord(dateStr, PHASE_CONFIGS.phase2.shifts[1], 'phase2');
      if (idx === 3) {
        day12.assignees = ['Bác Thành', 'Chị Mai'];
        day12.isUnderstaffed = false;
        night12.assignees = ['Anh Dũng', null];
        night12.isUnderstaffed = true;
      }
      this.shifts.set(day12.id, day12);
      this.shifts.set(night12.id, night12);
    });
  }

  // --- Shifts ---
  public getShifts(startDate: string, endDate: string, phase: CarePhase): ShiftRecord[] {
    const results: ShiftRecord[] = [];
    const configs = PHASE_CONFIGS[phase].shifts;

    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      const dd = String(cur.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      for (const cfg of configs) {
        const id = `${dateStr}_${cfg.type}_${phase}`;
        let record = this.shifts.get(id);
        if (!record) {
          record = buildDefaultShiftRecord(dateStr, cfg, phase);
          this.shifts.set(id, record);
        }
        results.push(record);
      }
    }
    return results;
  }

  public saveShift(shift: ShiftRecord): ShiftRecord {
    const filledCount = shift.assignees.filter(Boolean).length;
    shift.isUnderstaffed = filledCount < shift.requiredPax;
    shift.updatedAt = new Date().toISOString();
    this.shifts.set(shift.id, shift);
    return shift;
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

// Bộ quản lý Cache In-Memory trên máy chủ (TTL = 30 giây)
class ServerCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL_MS = 30 * 1000; // 30s TTL

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

// Hàm gửi POST đồng bộ tới Google Apps Script với Timeout an toàn (chống treo request)
async function sendToWebappWithTimeout(
  payload: Record<string, unknown>,
  timeoutMs: number = 7000
): Promise<{ success: boolean; data?: WebappResponse }> {
  const webappUrl = getWebappUrl();
  if (!webappUrl) return { success: false };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(webappUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = (await res.json()) as WebappResponse;
      return { success: json.success ?? true, data: json };
    }
    return { success: false };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err instanceof Error ? err : new Error(String(err));
    if (error.name === 'AbortError') {
      console.warn(`[Sync WebApp] Timeout sau ${timeoutMs}ms (${String(payload.action)})`);
    } else {
      console.warn('[Sync WebApp] Lỗi kết nối:', error.message);
    }
    return { success: false };
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

  // 2. Nếu có Google Apps Script Web App, truy vấn dữ liệu với Timeout 8.5s
  if (webappUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8500);

    try {
      const url = new URL(webappUrl);
      url.searchParams.set('action', 'getAllData');
      url.searchParams.set('startDate', startDate);
      url.searchParams.set('endDate', endDate);
      url.searchParams.set('phase', phase);

      const res = await fetch(url.toString(), {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (Array.isArray(data.members) && data.members.length > 0) {
            memoryStore.setMembers(data.members);
          }
          if (data.patientInfo && data.patientInfo.name) {
            memoryStore.setPatientInfo(data.patientInfo);
          }
          if (data.adminPin) {
            memoryStore.setAdminPin(data.adminPin);
          } else if (data.settings && data.settings.adminPin) {
            memoryStore.setAdminPin(data.settings.adminPin);
          }
          if (Array.isArray(data.contacts) && data.contacts.length > 0) {
            memoryStore.setContacts(data.contacts);
          }
          if (Array.isArray(data.reminders)) {
            memoryStore.setReminders(data.reminders);
          }
          if (Array.isArray(data.shifts) && data.shifts.length > 0) {
            data.shifts.forEach((s: ShiftRecord) => memoryStore.saveShift(s));
          }

          const freshData: AllAppData = {
            shifts: memoryStore.getShifts(startDate, endDate, phase),
            members: memoryStore.getMembers(),
            patientInfo: memoryStore.getPatientInfo(),
            contacts: memoryStore.getContacts(),
            reminders: memoryStore.getReminders(),
            settings: memoryStore.getSettings(),
          };

          // Lưu vào Server Cache
          serverCacheManager.set(startDate, endDate, phase, freshData);
          return freshData;
        }
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.name === 'AbortError') {
        console.warn('[Fetch App Data] Timeout Web App 8.5s, dùng bộ nhớ đệm');
      } else {
        console.warn('Lỗi kết nối Apps Script Web App getAllData:', error.message);
      }
    }
  }

  // 3. Dự phòng: Memory Store
  const fallbackData = memoryStore.getAllData(startDate, endDate, phase);
  serverCacheManager.set(startDate, endDate, phase, fallbackData);
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

  // Đồng bộ ngầm với timeout 7s (không chặn luồng chính nếu Web App trễ)
  sendToWebappWithTimeout({ action: 'saveShift', shift: updated }, 7000).catch((err) =>
    console.warn('[saveShiftToStorage] Sync lỗi ngầm:', err)
  );

  return updated;
}

// ==========================================
// CRUD MEMBERS (THÀNH VIÊN)
// ==========================================
export async function saveMemberToStorage(member: FamilyMember): Promise<FamilyMember[]> {
  const updatedList = memoryStore.saveMember(member);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'saveMember', member }, 7000);
  return updatedList;
}

export async function deleteMemberFromStorage(memberId: string): Promise<FamilyMember[]> {
  const updatedList = memoryStore.deleteMember(memberId);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'deleteMember', memberId }, 7000);
  return updatedList;
}

// ==========================================
// CRUD CONTACTS (DANH BẠ SOS KHẨN CẤP)
// ==========================================
export async function saveContactToStorage(contact: EmergencyContact): Promise<EmergencyContact[]> {
  const updatedList = memoryStore.saveContact(contact);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'saveContact', contact }, 7000);
  return updatedList;
}

export async function deleteContactFromStorage(contactId: string): Promise<EmergencyContact[]> {
  const updatedList = memoryStore.deleteContact(contactId);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'deleteContact', contactId }, 7000);
  return updatedList;
}

// ==========================================
// CRUD REMINDERS (NHẮC NHỞ Y TẾ TRONG NGÀY)
// ==========================================
export async function saveReminderToStorage(reminder: PatientDailyReminder): Promise<PatientDailyReminder[]> {
  const updatedList = memoryStore.saveReminder(reminder);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'saveReminder', reminder }, 7000);
  return updatedList;
}

export async function deleteReminderFromStorage(reminderId: string): Promise<PatientDailyReminder[]> {
  const updatedList = memoryStore.deleteReminder(reminderId);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'deleteReminder', reminderId }, 7000);
  return updatedList;
}

// ==========================================
// CRUD SETTINGS & PATIENT INFO
// ==========================================
export async function savePatientSettingsToStorage(info: PatientInfo): Promise<PatientInfo> {
  memoryStore.setPatientInfo(info);
  serverCacheManager.invalidateAll();
  await sendToWebappWithTimeout({ action: 'saveSettings', patientInfo: info }, 7000);
  return memoryStore.getPatientInfo();
}

export function getSystemSettings(): SystemSettings {
  return memoryStore.getSettings();
}

export function setSystemPhase(phase: CarePhase): SystemSettings {
  const updated = memoryStore.setPhase(phase);
  serverCacheManager.invalidateAll();
  sendToWebappWithTimeout({ action: 'saveSettings', currentPhase: phase }, 7000).catch(() => {});
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


