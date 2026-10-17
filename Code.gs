/**
 * GOOGLE APPS SCRIPT WEB APP — SỔ SỨC KHỎE BỐ (ĐINH HỒNG PHONG) v2.0
 * Tự động tạo và quản lý 8 Bảng Tính:
 *   Cũ: Shifts, Members, Settings, Contacts, Reminders
 *   Mới: VitalsLog, CareRoutines, DailyLogs
 * Hỗ trợ API CRUD 2 chiều thời gian thực (Zero Hardcode).
 */

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getAllData';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Chỉ chạy khởi tạo cấu trúc bảng nếu thiếu bất kỳ bảng nào (tiết kiệm 1-2 giây mỗi lần đọc dữ liệu)
    if (
      !ss.getSheetByName('DailyLogs') ||
      !ss.getSheetByName('CareRoutines') ||
      !ss.getSheetByName('VitalsLog') ||
      !ss.getSheetByName('Shifts') ||
      !ss.getSheetByName('Members') ||
      !ss.getSheetByName('Settings') ||
      !ss.getSheetByName('Contacts') ||
      !ss.getSheetByName('Reminders')
    ) {
      ensureSheetsSetup(ss);
    }

    if (action === 'getAllData') {
      const startDate = (e.parameter && e.parameter.startDate) || '';
      const endDate = (e.parameter && e.parameter.endDate) || '';
      const phase = (e.parameter && e.parameter.phase) || '';

      return jsonResponse({
        success: true,
        shifts: readShifts(ss, startDate, endDate, phase),
        members: readMembers(ss),
        patientInfo: readPatientInfo(ss),
        contacts: readContacts(ss),
        reminders: readReminders(ss),
        adminPin: readAdminPin(ss),
        // === V2.0: Sổ Sức Khỏe Bố ===
        vitalsLog: readVitalsLog(ss),
        careRoutines: readCareRoutines(ss),
        dailyLogs: readDailyLogs(ss),
        appointment: readAppointment(ss),
        bpThresholds: readBpThresholds(ss),
      });
    }

    if (action === 'getShifts') {
      const startDate = (e.parameter && e.parameter.startDate) || '';
      const endDate = (e.parameter && e.parameter.endDate) || '';
      const phase = (e.parameter && e.parameter.phase) || '';
      return jsonResponse({ success: true, shifts: readShifts(ss, startDate, endDate, phase) });
    }

    if (action === 'getMembers') {
      return jsonResponse({ success: true, members: readMembers(ss) });
    }

    if (action === 'getContacts') {
      return jsonResponse({ success: true, contacts: readContacts(ss) });
    }

    if (action === 'getReminders') {
      return jsonResponse({ success: true, reminders: readReminders(ss) });
    }

    return jsonResponse({ success: true, message: 'Google Apps Script Service Active' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  // Khóa tối đa 10 giây để chống ghi đè đồng thời (Concurrency Lock)
  const hasLock = lock.tryLock(10000);
  if (!hasLock) {
    return jsonResponse({ success: false, error: 'Máy chủ Google Sheet đang bận xử lý yêu cầu khác, vui lòng thử lại sau giây lát.' });
  }

  try {
    const postData = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheetsSetup(ss);

    const action = postData.action;

    // 1. Lưu Ca Trực (Shift)
    if (action === 'saveShift' && postData.shift) {
      saveShift(ss, postData.shift);
      return jsonResponse({ success: true, message: 'Đã lưu ca trực' });
    }

    // 2. Lưu / Xoá Thành Viên (Member)
    if (action === 'saveMember' && postData.member) {
      saveMember(ss, postData.member);
      return jsonResponse({ success: true, message: 'Đã lưu thành viên' });
    }
    if (action === 'deleteMember' && postData.memberId) {
      deleteRowById(ss, 'Members', postData.memberId);
      return jsonResponse({ success: true, message: 'Đã xoá thành viên' });
    }

    // 3. Lưu / Xoá Số Cấp Cứu (Contact)
    if (action === 'saveContact' && postData.contact) {
      saveContact(ss, postData.contact);
      return jsonResponse({ success: true, message: 'Đã lưu số khẩn cấp' });
    }
    if (action === 'deleteContact' && postData.contactId) {
      deleteRowById(ss, 'Contacts', postData.contactId);
      return jsonResponse({ success: true, message: 'Đã xoá số khẩn cấp' });
    }

    // 4. Lưu / Xoá Nhắc Nhở (Reminder)
    if (action === 'saveReminder' && postData.reminder) {
      saveReminder(ss, postData.reminder);
      return jsonResponse({ success: true, message: 'Đã lưu nhắc nhở' });
    }
    if (action === 'deleteReminder' && postData.reminderId) {
      deleteRowById(ss, 'Reminders', postData.reminderId);
      return jsonResponse({ success: true, message: 'Đã xoá nhắc nhở' });
    }

    // 5. Lưu Thông Tin Bệnh Nhân & Giai Đoạn (Patient Settings)
    if (action === 'saveSettings') {
      if (postData.patientInfo) savePatientInfo(ss, postData.patientInfo);
      if (postData.currentPhase) saveCurrentPhase(ss, postData.currentPhase);
      return jsonResponse({ success: true, message: 'Đã lưu thông tin cài đặt' });
    }

    // 6. Quản Lý Admin PIN
    if (action === 'verifyAdminPin') {
      const currentPin = readAdminPin(ss);
      const isValid = String(postData.pin || '').trim() === currentPin;
      return jsonResponse({ success: true, valid: isValid });
    }
    if (action === 'changeAdminPin') {
      const currentPin = readAdminPin(ss);
      if (String(postData.oldPin || '').trim() !== currentPin) {
        return jsonResponse({ success: false, message: 'Mã PIN cũ không chính xác' });
      }
      const newPin = String(postData.newPin || '').trim();
      if (newPin.length < 4) {
        return jsonResponse({ success: false, message: 'Mã PIN mới phải có ít nhất 4 ký tự' });
      }
      saveAdminPin(ss, newPin);
      return jsonResponse({ success: true, message: 'Đã đổi mã PIN Admin thành công' });
    }

    // ==========================================
    // V2.0 — SỔ SỨC KHỎE BỐ — ACTIONS MỚI
    // ==========================================

    // 7. Lưu / Xoá Huyết Áp & Sinh Hiệu (VitalsLog)
    if (action === 'saveVitals' && postData.vitals) {
      saveVitalsLog(ss, postData.vitals);
      return jsonResponse({ success: true, message: 'Đã lưu chỉ số sinh hiệu' });
    }
    if (action === 'deleteVitals' && postData.vitalsId) {
      deleteRowById(ss, 'VitalsLog', postData.vitalsId);
      return jsonResponse({ success: true, message: 'Đã xoá bản ghi sinh hiệu' });
    }

    // 8. Lưu / Xoá Đơn Thuốc & Bài Tập (CareRoutines)
    if (action === 'saveRoutine' && postData.routine) {
      saveRoutine(ss, postData.routine);
      return jsonResponse({ success: true, message: 'Đã lưu đầu việc chăm sóc' });
    }
    if (action === 'deleteRoutine' && postData.routineId) {
      deleteRowById(ss, 'CareRoutines', postData.routineId);
      return jsonResponse({ success: true, message: 'Đã xoá đầu việc' });
    }

    // 9. Tích / Bỏ Tích Hoàn Thành Hàng Ngày (DailyLogs)
    if (action === 'toggleDailyLog' && postData.dailyLog) {
      upsertDailyLog(ss, postData.dailyLog);
      return jsonResponse({ success: true, message: 'Đã cập nhật trạng thái' });
    }

    // 10. Lưu Lịch Tái Khám & Ngưỡng HA (Settings)
    if (action === 'saveAppointment' && postData.appointment) {
      saveAppointmentToSettings(ss, postData.appointment);
      return jsonResponse({ success: true, message: 'Đã lưu lịch tái khám' });
    }
    if (action === 'saveBpThresholds' && postData.bpThresholds) {
      saveBpThresholdsToSettings(ss, postData.bpThresholds);
      return jsonResponse({ success: true, message: 'Đã lưu ngưỡng huyết áp' });
    }

    return jsonResponse({ success: false, message: 'Thao tác không hợp lệ' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// TỰ ĐỘNG THIẾT LẬP 5 BẢNG TÍNH & DỮ LIỆU GỐC
// ==========================================
function ensureSheetsSetup(ss) {
  // Sheet 1: Shifts (Ca trực - 24 cột)
  let sheetShifts = ss.getSheetByName('Shifts');
  const shiftHeaders = [
    'shift_id', 'date', 'phase', 'shift_type', 'shift_name', 'time_range',
    'required_pax', 'assignee_1', 'assignee_2', 'is_understaffed',
    'handover_note', 'handover_by', 'handover_time',
    'vitals_bp', 'vitals_spo2', 'vitals_pulse', 'vitals_temp',
    'chk_feeding', 'chk_meds', 'chk_hygiene', 'chk_turning', 'updated_at',
    'supporters', 'all_assignees'
  ];
  if (!sheetShifts) {
    sheetShifts = ss.insertSheet('Shifts');
    sheetShifts.appendRow(shiftHeaders);
    sheetShifts.getRange(1, 1, 1, shiftHeaders.length).setFontWeight('bold').setBackground('#E2E8F0');
    sheetShifts.setFrozenRows(1);
  } else {
    if (sheetShifts.getMaxColumns() < shiftHeaders.length) {
      sheetShifts.insertColumnsAfter(sheetShifts.getMaxColumns(), shiftHeaders.length - sheetShifts.getMaxColumns());
    }
    if (!sheetShifts.getRange(1, 23).getValue()) sheetShifts.getRange(1, 23).setValue('supporters');
    if (!sheetShifts.getRange(1, 24).getValue()) sheetShifts.getRange(1, 24).setValue('all_assignees');
  }

  // Sheet 2: Members (Thành viên gia đình - 12 cột)
  let sheetMembers = ss.getSheetByName('Members');
  const memberHeaders = ['member_id', 'name', 'relation', 'phone', 'badge_color', 'avatar_initials', 'bg_light', 'border_light', 'text_color', 'accent_color', 'pill_badge', 'is_supporter'];
  if (!sheetMembers) {
    sheetMembers = ss.insertSheet('Members');
    sheetMembers.appendRow(memberHeaders);
    sheetMembers.getRange(1, 1, 1, memberHeaders.length).setFontWeight('bold').setBackground('#DBEAFE');
    sheetMembers.setFrozenRows(1);

    const defaultMembers = [
      ['mem-1', 'Bác Thành', 'Bác cả (Trưởng ban điều phối)', '0912 345 678', 'bg-blue-600', 'BT', 'bg-blue-50/90', 'border-blue-300', 'text-blue-900', 'bg-blue-600 text-white', 'bg-blue-100 text-blue-800 border-blue-300 font-bold', 'FALSE'],
      ['mem-2', 'Cô Lan', 'Em gái bệnh nhân', '0983 222 111', 'bg-emerald-600', 'CL', 'bg-emerald-50/90', 'border-emerald-300', 'text-emerald-900', 'bg-emerald-600 text-white', 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold', 'FALSE'],
      ['mem-3', 'Anh Dũng', 'Con trai trưởng', '0977 888 999', 'bg-indigo-600', 'AD', 'bg-indigo-50/90', 'border-indigo-300', 'text-indigo-900', 'bg-indigo-600 text-white', 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold', 'FALSE'],
      ['mem-4', 'Chị Mai', 'Con dâu trưởng', '0904 555 444', 'bg-rose-600', 'CM', 'bg-rose-50/90', 'border-rose-300', 'text-rose-900', 'bg-rose-600 text-white', 'bg-rose-100 text-rose-800 border-rose-300 font-bold', 'FALSE'],
      ['mem-5', 'Anh Hùng', 'Con trai thứ', '0918 666 777', 'bg-amber-600', 'AH', 'bg-amber-50/90', 'border-amber-300', 'text-amber-950', 'bg-amber-600 text-white', 'bg-amber-100 text-amber-900 border-amber-300 font-bold', 'FALSE'],
      ['mem-6', 'Chị Trang', 'Con gái út', '0936 123 456', 'bg-purple-600', 'CT', 'bg-purple-50/90', 'border-purple-300', 'text-purple-900', 'bg-purple-600 text-white', 'bg-purple-100 text-purple-800 border-purple-300 font-bold', 'FALSE'],
      ['mem-7', 'Cháu Quân', 'Cháu đích tôn', '0988 999 112', 'bg-teal-600', 'CQ', 'bg-teal-50/90', 'border-teal-300', 'text-teal-900', 'bg-teal-600 text-white', 'bg-teal-100 text-teal-800 border-teal-300 font-bold', 'FALSE']
    ];
    defaultMembers.forEach(m => sheetMembers.appendRow(m));
  } else {
    if (sheetMembers.getMaxColumns() < memberHeaders.length) {
      sheetMembers.insertColumnsAfter(sheetMembers.getMaxColumns(), memberHeaders.length - sheetMembers.getMaxColumns());
    }
    if (!sheetMembers.getRange(1, 12).getValue()) sheetMembers.getRange(1, 12).setValue('is_supporter');
  }

  // Sheet 3: Settings (Thông tin bệnh nhân & cấu hình V1 + V2.0)
  let sheetSettings = ss.getSheetByName('Settings');
  const requiredSettings = [
    ['patient_name', 'Đinh Hồng Phong', 'Họ và tên bệnh nhân'],
    ['patient_diagnosis', 'Đang phục hồi chức năng sau đột quỵ (tai biến mạch máu não)', 'Chẩn đoán y khoa chính'],
    ['patient_hospital', 'Bệnh viện Bạch Mai - Hà Nội (nơi điều trị trước đó)', 'Bệnh viện điều trị'],
    ['patient_room', 'Phục hồi tại nhà', 'Vị trí chăm sóc hiện tại'],
    ['patient_notes', 'Cần theo dõi huyết áp hàng ngày, uống thuốc đúng giờ, tập phục hồi chức năng đều đặn.', 'Chỉ định chăm sóc đặc biệt'],
    ['emergency_phone', '0913 218 765 (BS. Hùng)', 'Số điện thoại bác sĩ điều trị chính'],
    ['current_phase', 'phase2', 'Giai đoạn hiện tại (phase1: ICU, phase2: Tại nhà)'],
    ['admin_pin', '1234', 'Mã PIN quyền Admin bảo mật'],
    ['app_mode', 'home_care', 'Chế độ ứng dụng (home_care / icu)'],
    ['active_stage_id', 'stage-1', 'Giai đoạn phục hồi đang kích hoạt'],
    ['default_recorder', 'Mẹ', 'Tên người ghi mặc định'],
    ['appt_next_date', '', 'Ngày tái khám tiếp theo (YYYY-MM-DD)'],
    ['appt_next_note', '', 'Ghi chú lịch tái khám tiếp theo'],
    ['appt_next_who', '', 'Người đưa bố đi tái khám'],
    ['appt_last_date', '', 'Ngày khám gần nhất (YYYY-MM-DD)'],
    ['appt_last_note', '', 'Lời dặn bác sĩ lần khám gần nhất'],
    ['bp_high_sys', '140', 'Ngưỡng cảnh báo HA tâm thu cao'],
    ['bp_high_dia', '90', 'Ngưỡng cảnh báo HA tâm trương cao'],
    ['bp_low_sys', '100', 'Ngưỡng cảnh báo HA tâm thu thấp'],
    ['bp_low_dia', '60', 'Ngưỡng cảnh báo HA tâm trương thấp']
  ];
  if (!sheetSettings) {
    sheetSettings = ss.insertSheet('Settings');
    const headers = ['key', 'value', 'description'];
    sheetSettings.appendRow(headers);
    sheetSettings.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#FEF3C7');
    sheetSettings.setFrozenRows(1);
    requiredSettings.forEach(s => sheetSettings.appendRow(s));
  } else {
    const data = sheetSettings.getDataRange().getValues();
    const existingKeys = {};
    for (let i = 1; i < data.length; i++) {
      existingKeys[String(data[i][0]).trim()] = true;
    }
    requiredSettings.forEach(s => {
      if (!existingKeys[s[0]]) {
        sheetSettings.appendRow(s);
      }
    });
  }

  // Sheet 4: Contacts (Danh bạ SOS khẩn cấp)
  let sheetContacts = ss.getSheetByName('Contacts');
  if (!sheetContacts) {
    sheetContacts = ss.insertSheet('Contacts');
    const headers = ['id', 'name', 'category', 'phone', 'note', 'address', 'is_primary'];
    sheetContacts.appendRow(headers);
    sheetContacts.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#FEE2E2');
    sheetContacts.setFrozenRows(1);

    const defaultContacts = [
      ['emg-1', 'Tổng đài Cấp cứu 115 Hà Nội', 'ambulance', '115', 'Yêu cầu xe cấp cứu có bình oxy và máy hỗ trợ thở khẩn cấp', '11 Phan Chu Trinh, Hoàn Kiếm, Hà Nội', 'TRUE'],
      ['emg-2', 'BS. CKII Nguyễn Văn Hùng', 'doctor', '0913 218 765', 'Trưởng kíp Hồi sức tích cực (ICU) BV Bạch Mai - Bác sĩ điều trị chính', 'Khoa Hồi sức tích cực, Tầng 4, Nhà A, BV Bạch Mai', 'TRUE'],
      ['emg-3', 'Bàn trực Khoa Hồi sức tích cực ICU', 'doctor', '024 3869 3731', 'Số máy bàn trực 24/7 Khoa ICU Bạch Mai (Máy lẻ 402)', '78 Giải Phóng, Phương Mai, Đống Đa, Hà Nội', 'FALSE'],
      ['emg-4', 'Cô Loan - Điều dưỡng ngoài giờ & Phục hồi', 'nurse', '0984 567 890', 'Hỗ trợ thay sonde dạ dày/tiểu, hút đờm sâu, tiêm truyền tại nhà', 'Gần viện Bạch Mai (Đến sau 15 phút khi gọi)', 'FALSE'],
      ['emg-5', 'Bác Nam (Nhà số 14 đối diện)', 'neighbor', '0903 456 789', 'Hàng xóm thân thiết, hỗ trợ mở cổng xe cấp cứu và nâng người khẩn cấp', 'Số 14 ngõ 78 Giải Phóng', 'FALSE'],
      ['emg-6', 'Chị Mai Lan (Thủ quỹ gia đình)', 'family', '0904 555 444', 'Giữ thẻ viện phí và quỹ thuốc cấp cứu của gia đình', 'Túc trực thường xuyên', 'FALSE']
    ];
    defaultContacts.forEach(c => sheetContacts.appendRow(c));
  }

  // Sheet 5: Reminders (Nhắc nhở quan trọng trong ngày)
  let sheetReminders = ss.getSheetByName('Reminders');
  if (!sheetReminders) {
    sheetReminders = ss.insertSheet('Reminders');
    const headers = ['id', 'category', 'title', 'content', 'author', 'time', 'is_urgent', 'created_at'];
    sheetReminders.appendRow(headers);
    sheetReminders.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#FEF9C3');
    sheetReminders.setFrozenRows(1);

    const defaultReminders = [
      ['reminder-meds-1', 'meds', 'Lưu ý thuốc huyết áp 14:00', 'Đo huyết áp trước khi cho uống Amlodipine 5mg lúc 14h. Nếu huyết áp tâm thu < 110 hoặc tâm trương < 70, hoãn uống và gọi BS Thắng.', 'Cô Lan (Em gái)', '08:15', 'TRUE', new Date().toISOString()],
      ['reminder-feeding-2', 'feeding', 'Quy trình bơm súp qua sonde', 'Bơm súp ấm (khoảng 37°C) chậm qua sonde, mỗi cữ 250ml. Nâng đầu giường 45 độ trong và sau ăn ít nhất 30 phút để chống trào ngược sặc phổi.', 'Anh Dũng (Con trai)', '09:00', 'FALSE', new Date().toISOString()],
      ['reminder-condition-3', 'condition', 'Hút đờm & theo dõi SpO2', 'Hôm nay đờm hơi đặc đục, nhớ vỗ rung lồng ngực trước khi hút đờm. Bật oxy 2L/phút nếu SpO2 tụt dưới 94%.', 'BS. Nguyễn Văn Thắng', '07:30', 'TRUE', new Date().toISOString()]
    ];
    defaultReminders.forEach(r => sheetReminders.appendRow(r));
  }

  // ==========================================
  // V2.0 — 3 SHEETS MỚI: VitalsLog, CareRoutines, DailyLogs
  // ==========================================

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
    sheetVitals.getRange('E:G').setNumberFormat('0');
  }

  // Sheet 7: CareRoutines (Đơn thuốc & Bài tập phục hồi - 16 cột)
  let sheetRoutines = ss.getSheetByName('CareRoutines');
  const routineHeaders = [
    'id', 'stage_id', 'stage_name', 'category', 'med_type',
    'title', 'dosage', 'time_slots', 'instructions', 'condition_note',
    'is_active', 'sort_order', 'created_at', 'updated_at', 'description', 'image_url'
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
       'TRUE', 1, now, now, 'Thuốc hạ huyết áp — Viên nang cứng màu vàng-trắng (hoặc viên nén trắng)', ''],
      ['routine-med-02', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'meds', 'scheduled',
       'Aspirin 81mg', '1 viên', '["morning"]',
       'Uống sau ăn sáng, không uống khi đói.', '',
       'TRUE', 2, now, now, 'Thuốc chống đông máu, ngừa tái phát đột quỵ — Viên nén nhỏ bao phim', ''],
      ['routine-med-03', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'meds', 'scheduled',
       'Atorvastatin 20mg', '1 viên', '["evening"]',
       'Uống buổi tối trước khi ngủ.', '',
       'TRUE', 3, now, now, 'Thuốc hạ mỡ máu, ổn định thành mạch — Viên nén dài màu trắng', ''],
      ['routine-med-04', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'meds', 'as_needed',
       'Paracetamol 500mg', '1 viên', '[]',
       'Khi đau đầu hoặc sốt ≥ 38°C. Cách ít nhất 6 giờ giữa 2 lần.', 'Tối đa 3 viên/ngày',
       'TRUE', 10, now, now, 'Thuốc giảm đau, hạ sốt — Viên nén dài màu trắng (hoặc sủi)', ''],
      ['routine-rehab-01', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'rehab', '',
       'Tập co duỗi tay chân (bên liệt)', '15 phút', '["morning","afternoon"]',
       'Từ từ, nhẹ nhàng. Dừng nếu bố kêu đau.', '',
       'TRUE', 5, now, now, '', ''],
      ['routine-rehab-02', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'rehab', '',
       'Tập ngồi tựa lưng trên giường', '10–20 phút', '["morning"]',
       'Đỡ bố ngồi dậy tựa gối, giữ thẳng lưng.', '',
       'TRUE', 6, now, now, '', ''],
      ['routine-care-01', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'care', '',
       'Lật trở & chống loét tì đè', 'Mỗi 2 giờ', '["morning","noon","afternoon","evening"]',
       'Xoay nghiêng trái/phải, kê gối đỡ lưng và gót chân.', '',
       'TRUE', 7, now, now, '', ''],
      ['routine-care-02', 'stage-1', 'Mới về nhà — Chăm sóc tích cực', 'care', '',
       'Vệ sinh răng miệng & thân thể', '', '["morning","evening"]',
       'Lau mặt ấm, đánh răng/lau nướu, thay quần áo sạch.', '',
       'TRUE', 8, now, now, '', ''],
    ];
    sampleRoutines.forEach(r => sheetRoutines.appendRow(r));
  } else {
    if (sheetRoutines.getMaxColumns() < routineHeaders.length) {
      sheetRoutines.insertColumnsAfter(sheetRoutines.getMaxColumns(), routineHeaders.length - sheetRoutines.getMaxColumns());
    }
    if (!sheetRoutines.getRange(1, 15).getValue()) sheetRoutines.getRange(1, 15).setValue('description');
    if (!sheetRoutines.getRange(1, 16).getValue()) sheetRoutines.getRange(1, 16).setValue('image_url');
  }

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
}

// ==========================================
// CÁC HÀM ĐỌC DỮ LIỆU
// ==========================================
function formatRowDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'GMT+7', 'yyyy-MM-dd');
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    const dd = parts[0].length === 1 ? '0' + parts[0] : parts[0];
    const mm = parts[1].length === 1 ? '0' + parts[1] : parts[1];
    const yyyy = parts[2];
    return yyyy + '-' + mm + '-' + dd;
  }
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, 'GMT+7', 'yyyy-MM-dd');
    }
  } catch (e) {}
  return str.substring(0, 10);
}

function readShifts(ss, startDate, endDate, phase) {
  const sheet = ss.getSheetByName('Shifts');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const shifts = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const shiftId = String(row[0] || '').trim();
    if (!shiftId) continue;

    let rowDate = formatRowDate(row[1]);
    if (!rowDate && /^\d{4}-\d{2}-\d{2}_/.test(shiftId)) {
      rowDate = shiftId.substring(0, 10);
    }

    let rowPhase = String(row[2] || '').toLowerCase().replace(/[\\s_-]/g, '');
    if (rowPhase.includes('2')) rowPhase = 'phase2';
    else rowPhase = 'phase1';

    // Chỉ lọc nếu có tham số startDate/endDate/phase truyền vào
    if (phase && rowPhase !== phase) continue;
    if (startDate && rowDate && rowDate < startDate) continue;
    if (endDate && rowDate && rowDate > endDate) continue;

    const reqPax = parseInt(row[6] || '1', 10);
    let assignees = [];
    if (row[23]) {
      assignees = String(row[23]).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
    } else {
      const a1 = row[7] ? String(row[7]).trim() : '';
      const a2 = row[8] ? String(row[8]).trim() : '';
      const list = [];
      if (a1) list.push(a1);
      if (a2) list.push(a2);
      assignees = list;
    }
    const rawSupporters = row[22] ? String(row[22]).trim() : '';
    const supporters = rawSupporters ? rawSupporters.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];
    const assignedCount = assignees.filter(Boolean).length;
    const isUnderstaffed = assignedCount < reqPax;

    shifts.push({
      id: shiftId,
      date: rowDate,
      phase: rowPhase,
      type: String(row[3] || ''),
      name: String(row[4] || ''),
      timeRange: String(row[5] || ''),
      requiredPax: reqPax,
      assignees: assignees,
      supporters: supporters,
      isUnderstaffed: isUnderstaffed,
      handover: {
        note: String(row[10] || ''),
        author: String(row[11] || ''),
        updatedAt: String(row[12] || ''),
        vitals: {
          bp: String(row[13] || ''),
          spo2: String(row[14] || ''),
          pulse: String(row[15] || ''),
          temp: String(row[16] || '')
        }
      },
      checklist: {
        feeding: String(row[17]).toUpperCase() === 'TRUE',
        meds: String(row[18]).toUpperCase() === 'TRUE',
        hygiene: String(row[19]).toUpperCase() === 'TRUE',
        turning: String(row[20]).toUpperCase() === 'TRUE'
      },
      updatedAt: String(row[21] || '')
    });
  }
  return shifts;
}

function readMembers(ss) {
  const sheet = ss.getSheetByName('Members');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const members = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      members.push({
        id: String(row[0]),
        name: String(row[1] || ''),
        relation: String(row[2] || ''),
        phone: String(row[3] || ''),
        badgeColor: String(row[4] || 'bg-blue-600'),
        avatarInitials: String(row[5] || 'TV'),
        bgLight: String(row[6] || 'bg-blue-50/90'),
        borderLight: String(row[7] || 'border-blue-300'),
        textColor: String(row[8] || 'text-blue-900'),
        accentColor: String(row[9] || 'bg-blue-600 text-white'),
        pillBadge: String(row[10] || 'bg-blue-100 text-blue-800 border-blue-300 font-bold'),
        isSupporter: String(row[11] || '').toUpperCase() === 'TRUE'
      });
    }
  }
  return members;
}

function readPatientInfo(ss) {
  const sheet = ss.getSheetByName('Settings');
  const info = {
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
    customFields: []
  };
  if (!sheet) return info;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0]).trim();
    const val = String(data[i][1] || '');
    if (key === 'patient_name') info.name = val;
    if (key === 'patient_diagnosis') info.diagnosis = val;
    if (key === 'patient_hospital') info.hospital = val;
    if (key === 'patient_room') info.room = val;
    if (key === 'patient_notes') info.notes = val;
    if (key === 'emergency_phone') info.emergencyPhone = val;
    if (key === 'patient_status_badge') info.statusBadge = val;
    if (key === 'patient_condition_tag') info.conditionTag = val;
    if (key === 'patient_header_badge') info.headerBadge = val;
    if (key === 'patient_care_mode') info.careMode = val;
    if (key === 'patient_care_goal') info.careGoal = val;
    if (key === 'patient_custom_fields' && val) {
      try {
        info.customFields = JSON.parse(val);
      } catch (e) {
        info.customFields = [];
      }
    }
  }
  return info;
}

function readAdminPin(ss) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return '1234';
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === 'admin_pin') {
      return String(data[i][1] || '1234').trim();
    }
  }
  return '1234';
}

function readContacts(ss) {
  const sheet = ss.getSheetByName('Contacts');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const contacts = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      contacts.push({
        id: String(row[0]),
        name: String(row[1] || ''),
        category: String(row[2] || 'doctor'),
        phone: String(row[3] || ''),
        note: String(row[4] || ''),
        address: String(row[5] || ''),
        isPrimary: String(row[6]).toUpperCase() === 'TRUE'
      });
    }
  }
  return contacts;
}

function readReminders(ss) {
  const sheet = ss.getSheetByName('Reminders');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const reminders = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      reminders.push({
        id: String(row[0]),
        category: String(row[1] || 'general'),
        title: String(row[2] || ''),
        content: String(row[3] || ''),
        author: String(row[4] || ''),
        time: String(row[5] || ''),
        isUrgent: String(row[6]).toUpperCase() === 'TRUE'
      });
    }
  }
  return reminders;
}

// ==========================================
// CÁC HÀM GHI DỮ LIỆU
// ==========================================
function saveShift(ss, shift) {
  const sheet = ss.getSheetByName('Shifts');
  if (!sheet) return;

  // Đảm bảo trang tính có tối thiểu 24 cột trước khi ghi dữ liệu
  if (sheet.getMaxColumns() < 24) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 24 - sheet.getMaxColumns());
  }

  const data = sheet.getDataRange().getValues();
  let dateStr = String(shift.date || '').trim();
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    dateStr = parts[2] + '-' + (parts[1].length === 1 ? '0' + parts[1] : parts[1]) + '-' + (parts[0].length === 1 ? '0' + parts[0] : parts[0]);
  } else if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    dateStr = dateStr.substring(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && /^\d{4}-\d{2}-\d{2}_/.test(shift.id || '')) {
    dateStr = String(shift.id).substring(0, 10);
  }

  const allAssignees = (shift.assignees || []).filter(Boolean).map(function(s) { return String(s).trim(); }).join(', ');
  const supporters = (shift.supporters || []).filter(Boolean).map(function(s) { return String(s).trim(); }).join(', ');
  const rowValues = [
    String(shift.id || '').trim(),
    dateStr,
    String(shift.phase || '').trim(),
    String(shift.type || ''),
    String(shift.name || ''),
    String(shift.timeRange || ''),
    parseInt(shift.requiredPax || 1, 10),
    (shift.assignees && shift.assignees[0]) ? String(shift.assignees[0]).trim() : '',
    (shift.assignees && shift.assignees[1]) ? String(shift.assignees[1]).trim() : '',
    shift.isUnderstaffed ? 'TRUE' : 'FALSE',
    (shift.handover && shift.handover.note) || '',
    (shift.handover && shift.handover.author) || '',
    (shift.handover && shift.handover.updatedAt) || '',
    (shift.handover && shift.handover.vitals && shift.handover.vitals.bp) || '',
    (shift.handover && shift.handover.vitals && shift.handover.vitals.spo2) || '',
    (shift.handover && shift.handover.vitals && shift.handover.vitals.pulse) || '',
    (shift.handover && shift.handover.vitals && shift.handover.vitals.temp) || '',
    (shift.checklist && shift.checklist.feeding) ? 'TRUE' : 'FALSE',
    (shift.checklist && shift.checklist.meds) ? 'TRUE' : 'FALSE',
    (shift.checklist && shift.checklist.hygiene) ? 'TRUE' : 'FALSE',
    (shift.checklist && shift.checklist.turning) ? 'TRUE' : 'FALSE',
    new Date().toISOString(),
    supporters,
    allAssignees
  ];

  const targetId = String(shift.id || '').trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === targetId) {
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return;
    }
  }
  sheet.appendRow(rowValues);
}

function saveMember(ss, member) {
  const sheet = ss.getSheetByName('Members');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const rowValues = [
    member.id, member.name, member.relation, member.phone,
    member.badgeColor || 'bg-blue-600', member.avatarInitials || 'TV',
    member.bgLight || 'bg-blue-50/90', member.borderLight || 'border-blue-300',
    member.textColor || 'text-blue-900', member.accentColor || 'bg-blue-600 text-white',
    member.pillBadge || 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
    member.isSupporter ? 'TRUE' : 'FALSE'
  ];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === member.id) {
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return;
    }
  }
  sheet.appendRow(rowValues);
}

function saveContact(ss, contact) {
  const sheet = ss.getSheetByName('Contacts');
  const data = sheet.getDataRange().getValues();
  const rowValues = [
    contact.id, contact.name, contact.category, contact.phone,
    contact.note || '', contact.address || '', contact.isPrimary ? 'TRUE' : 'FALSE'
  ];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === contact.id) {
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return;
    }
  }
  sheet.appendRow(rowValues);
}

function saveReminder(ss, reminder) {
  const sheet = ss.getSheetByName('Reminders');
  const data = sheet.getDataRange().getValues();
  const rowValues = [
    reminder.id, reminder.category, reminder.title, reminder.content,
    reminder.author, reminder.time, reminder.isUrgent ? 'TRUE' : 'FALSE', new Date().toISOString()
  ];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === reminder.id) {
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return;
    }
  }
  sheet.appendRow(rowValues);
}

function savePatientInfo(ss, info) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const map = {
    patient_name: info.name || '',
    patient_diagnosis: info.diagnosis || '',
    patient_hospital: info.hospital || '',
    patient_room: info.room || '',
    patient_notes: info.notes || '',
    emergency_phone: info.emergencyPhone || '',
    patient_status_badge: info.statusBadge !== undefined ? info.statusBadge : '',
    patient_condition_tag: info.conditionTag !== undefined ? info.conditionTag : '',
    patient_header_badge: info.headerBadge !== undefined ? info.headerBadge : '',
    patient_care_mode: info.careMode !== undefined ? info.careMode : '',
    patient_care_goal: info.careGoal !== undefined ? info.careGoal : '',
    patient_custom_fields: JSON.stringify(info.customFields || [])
  };
  for (const [key, val] of Object.entries(map)) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === key) {
        sheet.getRange(i + 1, 2).setValue(val);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, val, 'Thông tin bệnh nhân']);
    }
  }
}

function saveCurrentPhase(ss, phase) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === 'current_phase') {
      sheet.getRange(i + 1, 2).setValue(phase);
      return;
    }
  }
  sheet.appendRow(['current_phase', phase, 'Giai đoạn hiện tại']);
}

function saveAdminPin(ss, pin) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === 'admin_pin') {
      sheet.getRange(i + 1, 2).setValue(String(pin).trim());
      return;
    }
  }
  sheet.appendRow(['admin_pin', String(pin).trim(), 'Mã PIN quyền Admin bảo mật']);
}

// ==========================================
// V2.0 — ĐỌC DỮ LIỆU MỚI (VitalsLog, CareRoutines, DailyLogs)
// ==========================================

function formatRowTime(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'GMT+7', 'HH:mm');
  }
  const str = String(val).trim();
  if (/^\d{1,2}:\d{2}/.test(str)) {
    const parts = str.split(':');
    return (parts[0].length === 1 ? '0' + parts[0] : parts[0]) + ':' + parts[1].substring(0, 2);
  }
  return str;
}

function readVitalsLog(ss) {
  const sheet = ss.getSheetByName('VitalsLog');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const data = sheet.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    results.push({
      id: String(row[0]),
      date: formatRowDate(row[1]),
      time: formatRowTime(row[2]),
      period: String(row[3] || 'morning'),
      sys: Number(row[4]) || 0,
      dia: Number(row[5]) || 0,
      pulse: row[6] !== '' && row[6] !== null ? Number(row[6]) : undefined,
      spo2: row[7] !== '' && row[7] !== null ? Number(row[7]) : undefined,
      temp: row[8] !== '' && row[8] !== null ? Number(row[8]) : undefined,
      bloodSugar: row[9] !== '' && row[9] !== null ? Number(row[9]) : undefined,
      note: String(row[10] || ''),
      alertLevel: String(row[11] || 'normal'),
      recordedBy: String(row[12] || 'Mẹ'),
      createdAt: String(row[13] || '')
    });
  }
  return results;
}

function readCareRoutines(ss) {
  const sheet = ss.getSheetByName('CareRoutines');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const data = sheet.getDataRange().getValues();
  const results = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    let timeSlots = [];
    try {
      const parsed = JSON.parse(String(row[7] || '[]'));
      if (Array.isArray(parsed)) {
        timeSlots = parsed.filter(function(s) {
          return s === 'morning' || s === 'noon' || s === 'afternoon' || s === 'evening';
        });
      }
    } catch(e) { timeSlots = []; }
    results.push({
      id: String(row[0]),
      stageId: String(row[1]),
      stageName: String(row[2]),
      category: String(row[3]),
      medType: String(row[4] || '') || undefined,
      title: String(row[5]),
      dosage: String(row[6] || ''),
      timeSlots: timeSlots,
      instructions: String(row[8] || ''),
      conditionNote: String(row[9] || ''),
      isActive: String(row[10]).toUpperCase() === 'TRUE',
      sortOrder: Number(row[11]) || 0,
      createdAt: String(row[12] || ''),
      updatedAt: String(row[13] || ''),
      description: String(row[14] || ''),
      imageUrl: String(row[15] || '')
    });
  }
  return results;
}

function readDailyLogs(ss) {
  const sheet = ss.getSheetByName('DailyLogs');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const data = sheet.getDataRange().getValues();
  const results = [];
  // Chỉ trả về 30 ngày gần nhất
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = Utilities.formatDate(cutoff, 'GMT+7', 'yyyy-MM-dd');
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const dateStr = formatRowDate(row[1]);
    if (dateStr < cutoffStr) continue;
    results.push({
      id: String(row[0]),
      date: dateStr,
      routineId: String(row[2]),
      timeSlot: String(row[3]),
      isDone: String(row[4]).toUpperCase() === 'TRUE',
      doneAt: formatRowTime(row[5]),
      doneBy: String(row[6] || ''),
      note: String(row[7] || '')
    });
  }
  return results;
}

function readAppointment(ss) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const result = {};
  const map = {
    appt_next_date: 'nextDate',
    appt_next_note: 'nextNote',
    appt_next_who: 'nextWho',
    appt_last_date: 'lastDate',
    appt_last_note: 'lastNote',
    next_appointment_date: 'nextDate',
    next_appointment_note: 'nextNote',
    next_appointment_who: 'nextWho',
    last_visit_date: 'lastDate',
    last_visit_note: 'lastNote'
  };
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0]).trim();
    if (map[key]) {
      const prop = map[key];
      result[prop] = (prop === 'nextDate' || prop === 'lastDate') ? formatRowDate(data[i][1]) : String(data[i][1] || '');
    }
  }
  return result;
}

function readBpThresholds(ss) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return { highSys: 140, highDia: 90, lowSys: 100, lowDia: 60 };
  const data = sheet.getDataRange().getValues();
  const result = { highSys: 140, highDia: 90, lowSys: 100, lowDia: 60 };
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0]);
    if (key === 'bp_high_sys') result.highSys = Number(data[i][1]) || 140;
    if (key === 'bp_high_dia') result.highDia = Number(data[i][1]) || 90;
    if (key === 'bp_low_sys') result.lowSys = Number(data[i][1]) || 100;
    if (key === 'bp_low_dia') result.lowDia = Number(data[i][1]) || 60;
  }
  return result;
}

// ==========================================
// V2.0 — GHI DỮ LIỆU MỚI
// ==========================================

function saveVitalsLog(ss, v) {
  const sheet = ss.getSheetByName('VitalsLog');
  if (!sheet) return;
  // Tìm row cũ theo id để update, hoặc append mới
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === v.id) {
      const row = [v.id, v.date, v.time, v.period, v.sys, v.dia,
        v.pulse || '', v.spo2 || '', v.temp || '', v.bloodSugar || '',
        v.note || '', v.alertLevel || 'normal', v.recordedBy || 'Mẹ', v.createdAt || new Date().toISOString()];
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow([v.id, v.date, v.time, v.period, v.sys, v.dia,
    v.pulse || '', v.spo2 || '', v.temp || '', v.bloodSugar || '',
    v.note || '', v.alertLevel || 'normal', v.recordedBy || 'Mẹ', v.createdAt || new Date().toISOString()]);
}

function saveRoutine(ss, r) {
  const sheet = ss.getSheetByName('CareRoutines');
  if (!sheet) return;
  if (sheet.getMaxColumns() < 16) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 16 - sheet.getMaxColumns());
  }
  const timeSlotsStr = JSON.stringify(r.timeSlots || []);
  const now = new Date().toISOString();
  const row = [r.id, r.stageId, r.stageName, r.category, r.medType || '',
    r.title, r.dosage || '', timeSlotsStr, r.instructions || '', r.conditionNote || '',
    r.isActive ? 'TRUE' : 'FALSE', r.sortOrder || 0, r.createdAt || now, now,
    r.description || '', r.imageUrl || ''];

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === r.id) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow(row);
}

function upsertDailyLog(ss, log) {
  const sheet = ss.getSheetByName('DailyLogs');
  if (!sheet) return;
  const row = [log.id, log.date, log.routineId, log.timeSlot,
    log.isDone ? 'TRUE' : 'FALSE', log.doneAt || '', log.doneBy || '', log.note || ''];

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === log.id) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow(row);
}

function saveAppointmentToSettings(ss, appt) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return;
  const map = {
    appt_next_date: appt.nextDate || '',
    appt_next_note: appt.nextNote || '',
    appt_next_who: appt.nextWho || '',
    appt_last_date: appt.lastDate || '',
    appt_last_note: appt.lastNote || ''
  };
  const data = sheet.getDataRange().getValues();
  for (const [key, val] of Object.entries(map)) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === key) {
        sheet.getRange(i + 1, 2).setValue(val);
        found = true;
        break;
      }
    }
    if (!found) sheet.appendRow([key, val, 'Lịch tái khám']);
  }
}

function saveBpThresholdsToSettings(ss, bp) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return;
  const map = {
    bp_high_sys: bp.highSys || 140,
    bp_high_dia: bp.highDia || 90,
    bp_low_sys: bp.lowSys || 100,
    bp_low_dia: bp.lowDia || 60
  };
  const data = sheet.getDataRange().getValues();
  for (const [key, val] of Object.entries(map)) {
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === key) {
        sheet.getRange(i + 1, 2).setValue(val);
        found = true;
        break;
      }
    }
    if (!found) sheet.appendRow([key, val, 'Ngưỡng huyết áp']);
  }
}

function deleteRowById(ss, sheetName, id) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
