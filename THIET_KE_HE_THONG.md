# 🏠 THIẾT KẾ HỆ THỐNG — SỔ SỨC KHỎE BỐ (v2.0)

> **Tên cũ:** Lịch Trực Chăm Sóc - Đinh Hồng Phong
> **Tên mới:** Sổ Sức Khỏe Bố — Chăm Bố Mỗi Ngày
> **Ngày chốt thiết kế:** 2026-10-17
> **Trạng thái:** ✅ ĐÃ CHỐT — Sẵn sàng triển khai

---

## 1. BỐI CẢNH & MỤC TIÊU

### 1.1 Tình huống hiện tại
- Bố (Đinh Hồng Phong) đã **xuất viện, về nhà phục hồi chức năng** sau đột quỵ.
- **Mẹ là người chăm sóc chính** tại nhà hàng ngày.
- Các con/cháu chỉ **đến phụ Mẹ khi rảnh** — không chia ca bắt buộc.
- Bố uống **nhiều loại thuốc** theo nhiều khung giờ — Mẹ khó nhớ hết.
- Gia đình **đo huyết áp hàng ngày** nhưng không ghi chép → không thấy xu hướng.
- Giai đoạn ICU trong viện đã kết thúc — dữ liệu cũ giữ lại làm hồ sơ.

### 1.2 Mục tiêu refactor
1. **Mẹ mở app → ghi HA trong 5 giây** (chữ to, ít bước, không cần chọn "Tôi là ai").
2. **Hiển thị rõ ràng** thuốc cần uống & việc cần làm **theo 4 buổi** (Sáng/Trưa/Chiều/Tối).
3. **Nhìn thấy xu hướng huyết áp** qua biểu đồ hoặc timeline khi đủ dữ liệu.
4. **Các con CRUD đơn thuốc & bài tập phục hồi** cho Mẹ từ xa (qua Admin).
5. **Lịch các con đăng ký qua phụ** — nhẹ nhàng, không chia ca bắt buộc.
6. **Không mất dữ liệu cũ** — dữ liệu ICU giữ nguyên trên Google Sheets.

### 1.3 Đối tượng người dùng

| Vai trò | Tần suất dùng | Thao tác chính | Yêu cầu UX |
|---|---|---|---|
| **Mẹ** (Chính) | Hàng ngày, 3-5 lần/ngày | Ghi HA, tích thuốc đã uống, xem việc cần làm | Chữ **≥16px**, touch target **≥48px**, ≤3 bước |
| **Các con** (Phụ) | Vài lần/tuần | Đăng ký qua phụ, CRUD đơn thuốc, xem biểu đồ HA | Quyền Admin (PIN) cho thao tác quản trị |
| **Bác sĩ** (Tham khảo) | Khi tái khám | Xem biểu đồ xu hướng HA trên điện thoại con | Xuất ảnh biểu đồ hoặc cho xem trực tiếp |

---

## 2. KIẾN TRÚC TỔNG QUAN

### 2.1 Sơ đồ 3 Tab chính (thay thế ICU/Tại Nhà cũ)

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: "Sổ Sức Khỏe Bố — Đinh Hồng Phong"               │
│  [🏠 Hôm Nay]  [📈 Biểu Đồ HA]  [🤝 Gia Đình Đồng Hành]  │
│  Nút: [SOS] [⚙️ Quản lý] [👤 Tên người dùng]              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TAB 1: 🏠 CHĂM SÓC HÔM NAY (Mặc định)                   │
│  ├── [Khối A] Ghi Huyết Áp Nhanh (SYS/DIA/Mạch + Lưu)    │
│  ├── [Khối B] Lịch Tái Khám & Ghi Chú BS Gần Nhất         │
│  ├── [Khối C] Lịch Thuốc & Chăm Sóc Hôm Nay               │
│  │   ├── 🌅 SÁNG (06:00 - 11:00)                           │
│  │   │   ├── 💊 Amlodipine 5mg — 1 viên sau ăn [✅ Đã xong]│
│  │   │   ├── 💊 Aspirin 81mg — 1 viên              [  ]    │
│  │   │   └── 🏃 Tập co duỗi tay 15 phút            [  ]    │
│  │   ├── ☀️ TRƯA (11:00 - 14:00)                           │
│  │   │   └── 💊 Metformin 500mg — 1 viên sau ăn    [  ]    │
│  │   ├── 🌇 CHIỀU (14:00 - 18:00)                          │
│  │   │   ├── 💊 Amlodipine 5mg — 1 viên            [  ]    │
│  │   │   └── 🏃 Tập ngồi tựa lưng 20 phút          [  ]    │
│  │   └── 🌙 TỐI (18:00 - 22:00)                            │
│  │       └── 💊 Thuốc ngủ — khi cần (⚡ nếu khó ngủ)       │
│  └── [Khối D] Nhắc nhở quan trọng (giữ từ Reminders cũ)   │
│                                                             │
│  TAB 2: 📈 BIỂU ĐỒ HUYẾT ÁP & SỨC KHỎE                   │
│  ├── Thẻ tóm tắt: HA gần nhất, TB 7 ngày, xu hướng ↑↓→    │
│  ├── Timeline (< 7 lần đo) HOẶC Line Chart (≥ 7 lần đo)   │
│  ├── Bảng lịch sử đo chi tiết (sửa/xóa nếu nhầm)         │
│  └── Thống kê: % ngày uống thuốc đủ, số bài tập hoàn thành│
│                                                             │
│  TAB 3: 🤝 GIA ĐÌNH ĐỒNG HÀNH                              │
│  ├── Lịch các con đăng ký qua phụ Mẹ (danh sách đơn giản) │
│  ├── Lịch Sử Trực ICU cũ (read-only, kỷ niệm gia đình)   │
│  └── Thống kê tổng hợp công sức gia đình                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Công nghệ (Giữ nguyên)
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Backend:** Google Sheets via Google Apps Script Web App
- **Biểu đồ:** Recharts (lightweight, SSR-friendly) — cài thêm
- **Fallback:** In-Memory Store (giữ nguyên cơ chế hiện tại)

---

## 3. DATABASE — GOOGLE SHEETS (8 Sheets)

### 3.1 Giữ nguyên 5 Sheets cũ (Tương thích ngược 100%)

| Sheet | Vai trò trong v2.0 | Thay đổi |
|---|---|---|
| `Shifts` | Lưu trữ lịch sử ca trực ICU cũ + Lịch phụ Mẹ | Không sửa cấu trúc |
| `Members` | Danh sách thành viên gia đình | Không sửa |
| `Settings` | Thông tin bệnh nhân + Cấu hình hệ thống | Thêm key mới (xem 3.2) |
| `Contacts` | Danh bạ SOS khẩn cấp | Không sửa |
| `Reminders` | Nhắc nhở quan trọng trong ngày | Không sửa |

### 3.2 Bổ sung key vào Sheet `Settings`

```
| key                   | value                           | description                              |
|-----------------------|---------------------------------|------------------------------------------|
| app_mode              | home_care                       | Chế độ: home_care (mặc định) / icu       |
| active_stage_id       | stage-1                         | ID giai đoạn phục hồi đang kích hoạt     |
| default_recorder      | Mẹ                              | Tên mặc định khi ghi HA (cho Mẹ khỏi chọn) |
| next_appointment_date | 2026-11-01                      | Ngày tái khám tiếp theo                  |
| next_appointment_note | BV Bạch Mai, BS Hùng, tầng 4   | Ghi chú tái khám                         |
| next_appointment_who  | Anh Dũng đưa bố đi             | Ai đưa đi tái khám                       |
| last_visit_date       | 2026-10-10                      | Ngày khám gần nhất                       |
| last_visit_note       | HA ổn, giảm Amlor 10mg→5mg...  | BS nói gì lần khám gần nhất              |
| bp_threshold_high_sys | 140                             | Ngưỡng cảnh báo HA tâm thu cao           |
| bp_threshold_high_dia | 90                              | Ngưỡng cảnh báo HA tâm trương cao        |
| bp_threshold_low_sys  | 100                             | Ngưỡng cảnh báo HA tâm thu thấp          |
| bp_threshold_low_dia  | 60                              | Ngưỡng cảnh báo HA tâm trương thấp       |
```

### 3.3 Sheet MỚI: `VitalsLog` — Nhật Ký Huyết Áp & Sinh Hiệu

**Mục đích:** Lưu mỗi lần đo HA/sinh hiệu thành 1 dòng riêng biệt, phục vụ vẽ biểu đồ xu hướng.

| Cột | Tên Header | Kiểu dữ liệu | Mô tả | Ví dụ |
|---|---|---|---|---|
| A | `id` | string | Mã duy nhất | `vl-1697520000` |
| B | `date` | string (YYYY-MM-DD) | Ngày đo | `2026-10-17` |
| C | `time` | string (HH:mm) | Giờ đo | `07:30` |
| D | `period` | string | Buổi đo | `morning` / `noon` / `afternoon` / `evening` |
| E | `sys` | number | Tâm thu (mmHg) | `135` |
| F | `dia` | number | Tâm trương (mmHg) | `85` |
| G | `pulse` | number | Mạch (lần/phút) | `78` |
| H | `spo2` | number (optional) | SpO2 (%) | `97` |
| I | `temp` | number (optional) | Nhiệt độ (°C) | `36.5` |
| J | `blood_sugar` | number (optional) | Đường huyết (mg/dL) | `120` |
| K | `note` | string (optional) | Ghi chú ngắn | `Đo sau khi tập đứng 15p` |
| L | `alert_level` | string | Tự động tính | `normal` / `warning` / `critical` |
| M | `recorded_by` | string | Ai ghi | `Mẹ` |
| N | `created_at` | string (ISO) | Thời điểm tạo | `2026-10-17T07:30:00+07:00` |

**Format cho Google Sheets (Header Row 1, đóng băng):**
```
id | date | time | period | sys | dia | pulse | spo2 | temp | blood_sugar | note | alert_level | recorded_by | created_at
```

**Quy tắc `alert_level` tự động:**
```
critical: SYS ≥ 180 HOẶC SYS ≤ 90 HOẶC DIA ≥ 120 HOẶC DIA ≤ 50
warning:  SYS ≥ 140 HOẶC SYS ≤ 100 HOẶC DIA ≥ 90 HOẶC DIA ≤ 60
normal:   Còn lại
```
*(Các ngưỡng 140/90/100/60 đọc từ Settings để Admin có thể chỉnh theo chỉ dẫn BS.)*

### 3.4 Sheet MỚI: `CareRoutines` — Đơn Thuốc & Bài Tập Phục Hồi

**Mục đích:** Lưu danh mục tất cả thuốc + bài tập theo từng giai đoạn phục hồi. Admin CRUD — Mẹ chỉ xem và tích.

| Cột | Tên Header | Kiểu | Mô tả | Ví dụ |
|---|---|---|---|---|
| A | `id` | string | Mã đầu việc | `routine-med-01` |
| B | `stage_id` | string | Giai đoạn phục hồi | `stage-1` |
| C | `stage_name` | string | Tên giai đoạn (hiển thị) | `Mới về nhà — Chăm sóc tích cực` |
| D | `category` | string | Phân loại | `meds` / `rehab` / `care` |
| E | `med_type` | string | Loại thuốc (chỉ cho category=meds) | `scheduled` / `as_needed` |
| F | `title` | string | Tên thuốc/bài tập | `Amlodipine (Amlor) 5mg` |
| G | `dosage` | string | Liều lượng / Thời lượng | `1 viên` / `15 phút` |
| H | `time_slots` | string (JSON) | Buổi áp dụng | `["morning","evening"]` |
| I | `instructions` | string | Hướng dẫn cho Mẹ | `Uống sau ăn sáng 30 phút` |
| J | `condition_note` | string (opt) | Điều kiện đặc biệt | `Đo HA trước, chỉ uống khi SYS > 130` |
| K | `is_active` | boolean | Đang áp dụng | `TRUE` |
| L | `sort_order` | number | Thứ tự hiển thị trong buổi | `1` |
| M | `created_at` | string (ISO) | Ngày tạo | `2026-10-17` |
| N | `updated_at` | string (ISO) | Ngày cập nhật cuối | `2026-10-17` |

**Quy ước `time_slots`:**
- `morning` = 06:00 – 11:00 (🌅 Sáng)
- `noon` = 11:00 – 14:00 (☀️ Trưa)
- `afternoon` = 14:00 – 18:00 (🌇 Chiều)
- `evening` = 18:00 – 22:00 (🌙 Tối)
- `as_needed` = Thuốc khi cần (hiển thị riêng, không theo buổi)

**Quy ước `stage_id`:**
- Mỗi `stage_id` là một giai đoạn phục hồi (VD: `stage-1`, `stage-2`, `stage-3`).
- `stage_name` lưu kèm trên mỗi dòng để Google Sheets dễ đọc.
- Settings key `active_stage_id` cho biết giai đoạn nào đang kích hoạt.
- Khi chuyển giai đoạn: các routine cũ tự động `is_active = FALSE`, routine mới `is_active = TRUE`.

### 3.5 Sheet MỚI: `DailyLogs` — Nhật Ký Tích Hoàn Thành Hàng Ngày

**Mục đích:** Lưu trạng thái Mẹ đã tích "Xong" cho mỗi đầu việc trong mỗi buổi của mỗi ngày.

| Cột | Tên Header | Kiểu | Mô tả | Ví dụ |
|---|---|---|---|---|
| A | `id` | string | Mã log | `dl-2026-10-17-routine-med-01-morning` |
| B | `date` | string (YYYY-MM-DD) | Ngày | `2026-10-17` |
| C | `routine_id` | string | Mã đầu việc (FK → CareRoutines) | `routine-med-01` |
| D | `time_slot` | string | Buổi nào | `morning` |
| E | `is_done` | boolean | Đã hoàn thành chưa | `TRUE` |
| F | `done_at` | string (HH:mm) | Giờ hoàn thành | `08:15` |
| G | `done_by` | string | Ai tích | `Mẹ` |
| H | `note` | string (optional) | Ghi chú | `Bố kêu hơi chóng mặt` |

**Logic tạo ID:**
```
id = `dl-${date}-${routine_id}-${time_slot}`
```
→ Đảm bảo mỗi đầu việc × buổi × ngày chỉ có 1 dòng duy nhất (upsert).

---

## 4. TYPESCRIPT TYPES (Bổ sung vào `lib/types.ts`)

```typescript
// ===== VITALS LOG =====
export type VitalsPeriod = 'morning' | 'noon' | 'afternoon' | 'evening';
export type AlertLevel = 'normal' | 'warning' | 'critical';

export interface VitalsLogEntry {
  id: string;
  date: string;        // YYYY-MM-DD
  time: string;        // HH:mm
  period: VitalsPeriod;
  sys: number;         // Tâm thu
  dia: number;         // Tâm trương
  pulse?: number;      // Mạch
  spo2?: number;
  temp?: number;
  bloodSugar?: number;
  note?: string;
  alertLevel: AlertLevel;
  recordedBy: string;
  createdAt: string;
}

// ===== CARE ROUTINES (ĐƠN THUỐC & BÀI TẬP) =====
export type RoutineCategory = 'meds' | 'rehab' | 'care';
export type MedType = 'scheduled' | 'as_needed';
export type TimeSlot = 'morning' | 'noon' | 'afternoon' | 'evening';

export interface CareRoutine {
  id: string;
  stageId: string;
  stageName: string;
  category: RoutineCategory;
  medType?: MedType;       // Chỉ khi category = 'meds'
  title: string;
  dosage: string;
  timeSlots: TimeSlot[];   // VD: ['morning', 'evening']
  instructions: string;
  conditionNote?: string;  // VD: "Chỉ uống khi HA > 140"
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ===== DAILY LOGS (TÍCH HOÀN THÀNH) =====
export interface DailyLog {
  id: string;
  date: string;         // YYYY-MM-DD
  routineId: string;    // FK → CareRoutine.id
  timeSlot: TimeSlot;
  isDone: boolean;
  doneAt?: string;      // HH:mm
  doneBy?: string;
  note?: string;
}

// ===== REHAB STAGE (GIAI ĐOẠN PHỤC HỒI) =====
export interface RehabStage {
  id: string;           // VD: 'stage-1'
  name: string;         // VD: 'Mới về nhà — Chăm sóc tích cực'
  isActive: boolean;
}

// ===== APPOINTMENT (LỊCH TÁI KHÁM) =====
export interface AppointmentInfo {
  nextDate?: string;
  nextNote?: string;
  nextWho?: string;
  lastDate?: string;
  lastNote?: string;
}

// ===== BP THRESHOLDS =====
export interface BpThresholds {
  highSys: number;  // Mặc định 140
  highDia: number;  // Mặc định 90
  lowSys: number;   // Mặc định 100
  lowDia: number;   // Mặc định 60
}

// ===== UPDATED AllAppData =====
// (Bổ sung vào AllAppData hiện tại, KHÔNG xóa gì)
export interface AllAppDataV2 extends AllAppData {
  vitalsLog: VitalsLogEntry[];
  careRoutines: CareRoutine[];
  dailyLogs: DailyLog[];
  stages: RehabStage[];
  appointment: AppointmentInfo;
  bpThresholds: BpThresholds;
}
```

---

## 5. GOOGLE APPS SCRIPT — AUTO-SETUP 3 SHEETS MỚI

> ⚠️ **QUAN TRỌNG:** Code bên dưới sẽ được nhúng vào phần `ensureSheetsSetup(ss)` hiện tại,
> chạy tự động khi `doGet` hoặc `doPost` được gọi lần đầu. Không cần tạo tay.

### 5.1 Sheet `VitalsLog`
```javascript
// Sheet 6: VitalsLog (Nhật ký huyết áp & sinh hiệu - 14 cột)
let sheetVitals = ss.getSheetByName('VitalsLog');
const vitalsHeaders = [
  'id', 'date', 'time', 'period',
  'sys', 'dia', 'pulse', 'spo2', 'temp', 'blood_sugar',
  'note', 'alert_level', 'recorded_by', 'created_at'
];
if (!sheetVitals) {
  sheetVitals = ss.insertSheet('VitalsLog');
  sheetVitals.appendRow(vitalsHeaders);
  sheetVitals.getRange(1, 1, 1, vitalsHeaders.length)
    .setFontWeight('bold').setBackground('#FDE2E2');
  sheetVitals.setFrozenRows(1);
  // Định dạng cột sys, dia, pulse là Number
  sheetVitals.getRange('E:G').setNumberFormat('0');
}
```

### 5.2 Sheet `CareRoutines`
```javascript
// Sheet 7: CareRoutines (Đơn thuốc & Bài tập phục hồi - 14 cột)
let sheetRoutines = ss.getSheetByName('CareRoutines');
const routineHeaders = [
  'id', 'stage_id', 'stage_name', 'category', 'med_type',
  'title', 'dosage', 'time_slots', 'instructions', 'condition_note',
  'is_active', 'sort_order', 'created_at', 'updated_at'
];
if (!sheetRoutines) {
  sheetRoutines = ss.insertSheet('CareRoutines');
  sheetRoutines.appendRow(routineHeaders);
  sheetRoutines.getRange(1, 1, 1, routineHeaders.length)
    .setFontWeight('bold').setBackground('#DBEAFE');
  sheetRoutines.setFrozenRows(1);

  // DỮ LIỆU MẪU — Đơn thuốc giai đoạn 1 (Mẹ thấy ngay khi mở app)
  const now = new Date().toISOString();
  const sampleRoutines = [
    ['routine-med-01', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'meds', 'scheduled',
     'Amlodipine (Amlor) 5mg', '1 viên', '["morning","evening"]',
     'Uống sau ăn 30 phút. Đo HA trước khi uống.', 'Nếu HA tâm thu < 110: hoãn uống, gọi BS',
     'TRUE', 1, now, now],
    ['routine-med-02', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'meds', 'scheduled',
     'Aspirin 81mg', '1 viên', '["morning"]',
     'Uống sau ăn sáng, không uống khi đói.', '',
     'TRUE', 2, now, now],
    ['routine-med-03', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'meds', 'scheduled',
     'Atorvastatin 20mg', '1 viên', '["evening"]',
     'Uống buổi tối trước khi ngủ.', '',
     'TRUE', 3, now, now],
    ['routine-med-04', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'meds', 'as_needed',
     'Paracetamol 500mg', '1 viên', '["as_needed"]',
     'Khi đau đầu hoặc sốt ≥ 38°C. Cách ít nhất 6 giờ giữa 2 lần.', 'Tối đa 3 viên/ngày',
     'TRUE', 10, now, now],
    ['routine-rehab-01', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'rehab', '',
     'Tập co duỗi tay chân (bên liệt)', '15 phút', '["morning","afternoon"]',
     'Từ từ, nhẹ nhàng. Dừng nếu bố kêu đau.', '',
     'TRUE', 5, now, now],
    ['routine-rehab-02', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'rehab', '',
     'Tập ngồi tựa lưng trên giường', '10–20 phút', '["morning"]',
     'Đỡ bố ngồi dậy tựa gối, giữ thẳng lưng.', '',
     'TRUE', 6, now, now],
    ['routine-care-01', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'care', '',
     'Lật trở & chống loét tì đè', 'Mỗi 2 giờ', '["morning","noon","afternoon","evening"]',
     'Xoay nghiêng trái/phải, kê gối đỡ lưng và gót chân.', '',
     'TRUE', 7, now, now],
    ['routine-care-02', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'care', '',
     'Vệ sinh răng miệng & thân thể', '', '["morning","evening"]',
     'Lau mặt ấm, đánh răng/lau nướu, thay quần áo sạch.', '',
     'TRUE', 8, now, now],
  ];
  sampleRoutines.forEach(r => sheetRoutines.appendRow(r));
}
```

### 5.3 Sheet `DailyLogs`
```javascript
// Sheet 8: DailyLogs (Tích hoàn thành hàng ngày - 8 cột)
let sheetDailyLogs = ss.getSheetByName('DailyLogs');
const dailyLogHeaders = [
  'id', 'date', 'routine_id', 'time_slot',
  'is_done', 'done_at', 'done_by', 'note'
];
if (!sheetDailyLogs) {
  sheetDailyLogs = ss.insertSheet('DailyLogs');
  sheetDailyLogs.appendRow(dailyLogHeaders);
  sheetDailyLogs.getRange(1, 1, 1, dailyLogHeaders.length)
    .setFontWeight('bold').setBackground('#D1FAE5');
  sheetDailyLogs.setFrozenRows(1);
}
```

### 5.4 Bổ sung vào `doPost` — Các Action mới

```javascript
// === VITALS LOG ===
if (action === 'saveVitals' && postData.vitals) {
  saveVitalsLog(ss, postData.vitals);
  return jsonResponse({ success: true, message: 'Đã lưu chỉ số sinh hiệu' });
}
if (action === 'deleteVitals' && postData.vitalsId) {
  deleteRowById(ss, 'VitalsLog', postData.vitalsId);
  return jsonResponse({ success: true, message: 'Đã xoá bản ghi sinh hiệu' });
}

// === CARE ROUTINES ===
if (action === 'saveRoutine' && postData.routine) {
  saveRoutine(ss, postData.routine);
  return jsonResponse({ success: true, message: 'Đã lưu đầu việc chăm sóc' });
}
if (action === 'deleteRoutine' && postData.routineId) {
  deleteRowById(ss, 'CareRoutines', postData.routineId);
  return jsonResponse({ success: true, message: 'Đã xoá đầu việc' });
}

// === DAILY LOGS ===
if (action === 'toggleDailyLog' && postData.dailyLog) {
  upsertDailyLog(ss, postData.dailyLog);
  return jsonResponse({ success: true, message: 'Đã cập nhật trạng thái' });
}
```

### 5.5 Bổ sung vào `doGet` — Đọc data mới

```javascript
// Trong action === 'getAllData':
return jsonResponse({
  success: true,
  shifts: readShifts(ss, startDate, endDate, phase),
  members: readMembers(ss),
  patientInfo: readPatientInfo(ss),
  contacts: readContacts(ss),
  reminders: readReminders(ss),
  adminPin: readAdminPin(ss),
  // === MỚI v2.0 ===
  vitalsLog: readVitalsLog(ss),       // Trả toàn bộ, client filter
  careRoutines: readCareRoutines(ss), // Trả toàn bộ, client filter theo stage
  dailyLogs: readDailyLogs(ss),      // Trả 30 ngày gần nhất
  appointment: readAppointment(ss),   // Đọc từ Settings
  bpThresholds: readBpThresholds(ss), // Đọc từ Settings
});
```

---

## 6. COMPONENT MAP — FILE NÀO LÀM GÌ

### 6.1 Files GIỮ NGUYÊN (không sửa hoặc sửa rất ít)
| File | Lý do giữ |
|---|---|
| `lib/sheets.ts` | Bổ sung thêm (không xóa code cũ) |
| `lib/actions.ts` | Bổ sung thêm actions mới |
| `lib/utils.ts` | Giữ nguyên |
| `components/AdminPinModal.tsx` | Giữ nguyên |
| `components/EditPatientModal.tsx` | Giữ nguyên |
| `components/MembersManagementModal.tsx` | Giữ nguyên |
| `components/EmergencyContactsModal.tsx` | Giữ nguyên |
| `components/GoogleSheetGuideModal.tsx` | Cập nhật code Apps Script mẫu |
| `components/ExportWeekModal.tsx` | Giữ nguyên (dùng cho Tab 3) |
| `components/ShiftHistoryView.tsx` | Giữ nguyên (read-only trong Tab 3) |

### 6.2 Files SỬA LẠI
| File | Thay đổi chính |
|---|---|
| `lib/types.ts` | Thêm types mới (VitalsLogEntry, CareRoutine, DailyLog...) |
| `lib/config.ts` | Đổi PATIENT_INFO, thêm TIME_SLOT_CONFIG, BP_THRESHOLDS mặc định |
| `app/page.tsx` | Đổi 3 tab, bỏ logic phase1/phase2, thêm state mới |
| `components/HeaderBar.tsx` | Bỏ nút ICU/Tại Nhà, đổi tên app, đổi 3 tab mới |
| `components/PatientBanner.tsx` | Đổi thành tổng quan nhẹ + Lịch tái khám |

### 6.3 Files TẠO MỚI
| File | Mô tả |
|---|---|
| `components/QuickVitalsForm.tsx` | Form ghi HA nhanh (SYS/DIA/Mạch + Lưu) — **Đợt A** |
| `components/DailyRoutineView.tsx` | Hiển thị thuốc & bài tập chia 4 buổi, tích xong 1 chạm — **Đợt A** |
| `components/RoutineManagerModal.tsx` | Admin CRUD đơn thuốc & bài tập, quản lý giai đoạn — **Đợt A** |
| `components/AppointmentSection.tsx` | Khối Lịch tái khám + Ghi chú BS — **Đợt A** |
| `components/VitalsChartView.tsx` | Biểu đồ HA + Timeline + Lịch sử đo — **Đợt B** |
| `components/FamilySupportView.tsx` | Lịch các con đăng ký phụ Mẹ (đơn giản) — **Đợt C** |

---

## 7. KẾ HOẠCH TRIỂN KHAI 3 ĐỢT

### ĐỢT A — "Mẹ Dùng Được Ngay" ⭐ (Ưu tiên #1)

**Mục tiêu:** Mẹ mở app → Ghi HA 5 giây → Xem thuốc cần uống → Tích xong
**Ước tính:** Refactor chính, nhiều file

#### Bước A1: Foundation (Types + Config + Sheets Backend)
```
1. Cập nhật lib/types.ts — Thêm types mới (§4)
2. Cập nhật lib/config.ts — Đổi PATIENT_INFO, thêm constants mới
3. Cập nhật lib/sheets.ts — Thêm MemoryStore cho 3 entity mới
   - vitalsLog: CRUD (save, delete, getAll, getByDateRange)
   - careRoutines: CRUD (save, delete, getAll, getByStage)
   - dailyLogs: upsert (toggle), getByDate
   - appointment: get/set (đọc/ghi từ Settings)
   - bpThresholds: get (đọc từ Settings)
   - Thêm sendToWebapp cho các action mới
4. Cập nhật lib/actions.ts — Thêm server actions mới
   - saveVitalsAction, deleteVitalsAction
   - saveRoutineAction, deleteRoutineAction
   - toggleDailyLogAction
   - saveAppointmentAction
   - fetchAllAppDataV2Action (mở rộng từ fetchAllAppDataAction)
5. Cập nhật GoogleSheetGuideModal.tsx — Cập nhật mã Apps Script mẫu
   - ensureSheetsSetup: thêm 3 sheets mới (§5.1, §5.2, §5.3)
   - doGet: thêm đọc 3 entity mới (§5.5)
   - doPost: thêm 5 actions mới (§5.4)
   - Thêm các hàm đọc/ghi: saveVitalsLog, readVitalsLog,
     saveRoutine, readCareRoutines, upsertDailyLog, readDailyLogs,
     readAppointment, saveAppointment, readBpThresholds
```

#### Bước A2: UI Components mới
```
6. Tạo components/QuickVitalsForm.tsx
   - 2 ô số lớn: SYS + DIA (font 24px, type=number, inputmode=numeric)
   - Ô nhỏ hơn: Mạch (optional), Ghi chú (optional)
   - Dropdown chọn buổi (auto-detect theo giờ hiện tại)
   - Nút "Lưu" to, có phản hồi màu:
     - Xanh nếu HA bình thường
     - Vàng nếu hơi cao/thấp
     - Đỏ nếu nguy hiểm
   - Hiển thị kết quả lần đo gần nhất bên cạnh (so sánh tức thì)

7. Tạo components/DailyRoutineView.tsx
   - Chia 4 section theo buổi: Sáng / Trưa / Chiều / Tối
   - Mỗi đầu việc hiển thị:
     - Icon phân loại (💊 Thuốc / 🏃 Tập / 🧹 Chăm sóc)
     - Tên + Liều lượng (chữ to ≥16px)
     - Hướng dẫn + Điều kiện (chữ nhỏ hơn)
     - Nút tích 1 chạm (min 48×48px) → "✅ Đã xong lúc 08:15"
   - Section riêng "⚡ Khi cần" cho thuốc as_needed
   - Thanh tiến độ: "Hoàn thành 5/8 đầu việc hôm nay"
   - Chữ to, khoảng cách rộng — tối ưu cho Mẹ dùng trên điện thoại

8. Tạo components/RoutineManagerModal.tsx (Yêu cầu Admin PIN)
   - Quản lý Giai đoạn phục hồi (tạo/đổi tên/chuyển đổi)
   - CRUD đầu việc: Thêm / Sửa / Bật-Tắt / Xóa
   - Form: Tên, Liều, Phân loại, Buổi áp dụng, Hướng dẫn, Điều kiện
   - Nút "Tạm ngưng" (is_active = false) thay vì xóa hẳn

9. Tạo components/AppointmentSection.tsx
   - Card nhỏ trên trang chủ: "Tái khám tiếp: 01/11 - BV Bạch Mai - Anh Dũng đưa bố"
   - Nút sửa (Admin PIN) → form đổi ngày/ghi chú tái khám
   - Card "Lần khám gần nhất": ghi chú BS
```

#### Bước A3: Refactor trang chính & Header
```
10. Sửa components/HeaderBar.tsx
    - XÓA hoàn toàn nút toggle ICU / Tại Nhà
    - Đổi tên app: "Sổ Sức Khỏe Bố" + icon ❤️ thay Stethoscope
    - 3 tab mới: [🏠 Hôm Nay] [📈 Biểu Đồ] [🤝 Gia Đình]
    - Tab 📈 và 🤝 hiển thị placeholder "Đang phát triển" (Đợt B, C)

11. Sửa components/PatientBanner.tsx
    - Đổi thông tin: bỏ "Khoa ICU Phòng 402", đổi thành "Đang phục hồi tại nhà"
    - Thu gọn: chỉ hiển thị tên bố + tình trạng tích cực + nút SOS
    - Tích hợp AppointmentSection ngay bên dưới

12. Sửa app/page.tsx
    - Bỏ state activePhase, mặc định 'phase2' ẩn
    - Thêm state: vitalsLog, careRoutines, dailyLogs, stages, appointment, bpThresholds
    - Tab mặc định: 'today' (hiển thị QuickVitalsForm + DailyRoutineView)
    - activeView: 'today' | 'charts' | 'family'
    - Tab 'charts' và 'family': placeholder (Đợt B, C)
```

### ĐỢT B — "Nhìn Thấy Xu Hướng" 📈

**Mục tiêu:** Biểu đồ HA + Timeline + Cảnh báo ngưỡng
**Yêu cầu:** `npm install recharts` (hoặc dùng Chart.js)

```
13. Tạo components/VitalsChartView.tsx
    - Thẻ tóm tắt trên cùng:
      - HA lần đo gần nhất + mũi tên so với lần trước (↑↓→)
      - HA trung bình 7 ngày (SYS/DIA)
      - Số ngày hoàn thành 100% thuốc
    - Nếu < 7 lần đo: hiển thị Timeline dọc (danh sách lần đo, color-coded)
    - Nếu ≥ 7 lần đo: hiển thị Line Chart (SYS + DIA + đường ngưỡng 140/90)
    - Chọn khoảng thời gian: 7 ngày / 14 ngày / 30 ngày / Tất cả
    - Bảng lịch sử đo chi tiết (cho phép sửa/xóa nếu nhập nhầm)

14. Kích hoạt tab 'charts' trong page.tsx và HeaderBar
```

### ĐỢT C — "Gia Đình Cùng Đồng Hành" 🤝

**Mục tiêu:** Lịch các con đăng ký qua phụ + Kỷ niệm ICU

```
15. Tạo components/FamilySupportView.tsx
    - Lịch tuần đơn giản (KHÔNG dùng ShiftCard/ShiftDetailModal nặng)
    - Mỗi ngày: danh sách text "Ai qua + mấy giờ + ghi chú"
    - Nút [+ Đăng ký qua phụ Mẹ] → form nhỏ (Chọn ngày + buổi + ghi chú)
    - Dữ liệu lưu vào Sheet Shifts với phase = 'home_support'
    - Không có cảnh báo đỏ "thiếu người"

16. Tích hợp ShiftHistoryView.tsx (read-only)
    - Thêm filter "Chỉ xem lịch sử ICU cũ"
    - Giữ nguyên layout hiện tại — đây là kỷ niệm gia đình

17. Kích hoạt tab 'family' trong page.tsx và HeaderBar
```

---

## 8. QUY TẮC UX — BẮT BUỘC TUÂN THỦ KHI CODE

1. **Cỡ chữ:** Tên thuốc, liều lượng, số HA ≥ `text-base` (16px). Không dùng `text-[11px]` cho nội dung Mẹ cần đọc.
2. **Touch target:** Mọi nút bấm/checkbox ≥ `min-h-[48px] min-w-[48px]`.
3. **Màu HA tự động:**
   - 🟢 Bình thường: `bg-emerald-50 border-emerald-300`
   - 🟡 Cảnh báo (HA hơi cao/thấp): `bg-amber-50 border-amber-300`
   - 🔴 Nguy hiểm: `bg-rose-50 border-rose-300` + text cảnh báo to
4. **Mặc định recorder:** Nếu `default_recorder` trong Settings có giá trị → tự động điền, Mẹ không cần chọn tên.
5. **Auto-detect buổi:** Khi mở form ghi HA, tự chọn buổi theo giờ hiện tại (06-11: morning, 11-14: noon, 14-18: afternoon, 18+: evening).
6. **Không xóa hard — chỉ tắt:** Đơn thuốc/bài tập bị "xóa" thực chất là `is_active = FALSE`. Giữ lại lịch sử.

---

## 9. DI CHUYỂN DỮ LIỆU (Migration)

### 9.1 Dữ liệu cũ trên Google Sheets
- **Sheet Shifts:** KHÔNG SỬA, KHÔNG XÓA. Tất cả ca trực ICU cũ vẫn nằm nguyên.
- **Sheet Settings:** THÊM key mới, KHÔNG xóa key cũ.
  - Key `current_phase` giữ giá trị cũ, thêm key `app_mode = home_care`.
  - Key `patient_room` có thể được Admin đổi thành địa chỉ nhà.
- **Các Sheet khác:** Giữ nguyên 100%.

### 9.2 Dữ liệu HA cũ trong Shifts
- Các chỉ số HA đã ghi trong `vitals_bp`, `vitals_spo2`, `vitals_pulse`, `vitals_temp` của Sheet Shifts vẫn có giá trị.
- **Đợt B (Biểu đồ):** Khi vẽ chart, sẽ TỰ ĐỘNG gộp:
  1. Dữ liệu từ `VitalsLog` (mới, chuẩn)
  2. Dữ liệu từ `Shifts` cũ (parse `vitals_bp` thành SYS/DIA)
  → Đảm bảo biểu đồ có đầy đủ lịch sử.

---

> **📌 Ghi nhớ cho mọi phiên code sau:**
> Trước khi viết bất kỳ component nào, BẮT BUỘC đọc lại file này.
> Mọi tên Sheet, tên cột, tên type PHẢI khớp 100% với tài liệu.
> Nếu cần thêm tính năng mới → cập nhật file này TRƯỚC rồi mới code.
