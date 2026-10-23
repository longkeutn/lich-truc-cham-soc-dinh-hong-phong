'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  X,
  Copy,
  Check,
  Database,
  Sparkles,
  CheckCircle2,
  Layers,
  Table,
} from 'lucide-react';

interface GoogleSheetGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSheetsConnected: boolean;
}

const APPS_SCRIPT_5_SHEETS_CODE = `/**
 * GOOGLE APPS SCRIPT WEB APP — SỔ SỨC KHỎE BỐ (ĐINH HỒNG PHONG) v2.2
 * Tự động tạo và quản lý 9 Bảng Tính:
 *   5 Bảng gốc: Shifts, Members, Settings, Contacts, Reminders
 *   4 Bảng mới: VitalsLog, CareRoutines, DailyLogs, Expenses (Sổ Thu Chi)
 * Hỗ trợ API CRUD 2 chiều thời gian thực (Zero Hardcode).
 */

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getAllData';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (
      !ss.getSheetByName('Expenses') ||
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
      const phase = (e.parameter && e.parameter.phase) || 'phase1';

      return jsonResponse({
        success: true,
        shifts: readShifts(ss, startDate, endDate, phase),
        members: readMembers(ss),
        patientInfo: readPatientInfo(ss),
        contacts: readContacts(ss),
        reminders: readReminders(ss),
        adminPin: readAdminPin(ss),
        expensePin: readExpensePin(ss),
        // === V2.0 & V2.2: Sổ Sức Khỏe Bố & Sổ Thu Chi ===
        vitalsLog: readVitalsLog(ss),
        careRoutines: readCareRoutines(ss),
        dailyLogs: readDailyLogs(ss),
        appointment: readAppointment(ss),
        bpThresholds: readBpThresholds(ss),
        expenses: readExpenses(ss),
      });
    }

    if (action === 'getShifts') {
      const startDate = (e.parameter && e.parameter.startDate) || '';
      const endDate = (e.parameter && e.parameter.endDate) || '';
      const phase = (e.parameter && e.parameter.phase) || 'phase1';
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

    // 11. V2.2: Quản lý Sổ Thu Chi Điều Trị (Expenses) & Mã PIN riêng (expense_pin)
    if (action === 'verifyExpensePin') {
      const currentExpPin = readExpensePin(ss);
      const isValidExp = String(postData.pin || '').trim() === currentExpPin;
      return jsonResponse({ success: true, valid: isValidExp });
    }
    if (action === 'changeExpensePin') {
      const currentExpPin = readExpensePin(ss);
      if (String(postData.oldPin || '').trim() !== currentExpPin) {
        return jsonResponse({ success: false, message: 'Mã PIN hiện tại của Sổ Thu Chi không chính xác' });
      }
      const newExpPin = String(postData.newPin || '').trim();
      if (newExpPin.length < 4) {
        return jsonResponse({ success: false, message: 'Mã PIN mới phải có ít nhất 4 ký tự' });
      }
      saveExpensePin(ss, newExpPin);
      return jsonResponse({ success: true, message: 'Đã đổi mã PIN Sổ Thu Chi thành công' });
    }
    if (action === 'saveExpense' && postData.expense) {
      saveExpense(ss, postData.expense);
      return jsonResponse({ success: true, message: 'Đã lưu khoản thu/chi' });
    }
    if (action === 'deleteExpense' && postData.expenseId) {
      deleteRowById(ss, 'Expenses', postData.expenseId);
      return jsonResponse({ success: true, message: 'Đã xoá khoản thu/chi' });
    }

    return jsonResponse({ success: false, message: 'Thao tác không hợp lệ' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// TỰ ĐỘNG THIẾT LẬP 9 BẢNG TÍNH & DỮ LIỆU GỐC
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

  // Sheet 3: Settings (Thông tin bệnh nhân & cấu hình V1 + V2.2)
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
    ['expense_pin', '2468', 'Mã PIN riêng bảo mật Sổ Thu Chi Điều Trị'],
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

  // Sheet 9: Expenses (Sổ Theo Dõi Thu Chi Điều Trị - 13 cột)
  let sheetExpenses = ss.getSheetByName('Expenses');
  const expenseHeaders = [
    'id', 'date', 'type', 'amount', 'stage', 'category',
    'title', 'person_name', 'payment_source', 'note',
    'receipt_image', 'created_at', 'updated_at'
  ];
  if (!sheetExpenses) {
    sheetExpenses = ss.insertSheet('Expenses');
    sheetExpenses.appendRow(expenseHeaders);
    sheetExpenses.getRange(1, 1, 1, expenseHeaders.length)
      .setFontWeight('bold').setBackground('#CCFBF1');
    sheetExpenses.setFrozenRows(1);
    sheetExpenses.getRange('D:D').setNumberFormat('#,##0');
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
  if (/^\\d{4}-\\d{2}-\\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  if (/^\\d{1,2}\\/\\d{1,2}\\/\\d{4}$/.test(str)) {
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
    if (!rowDate && /^\\d{4}-\\d{2}-\\d{2}_/.test(shiftId)) {
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
    diagnosis: 'Tai biến mạch máu não nặng (Đột quỵ diện rộng), liệt nửa người, thở máy/sonde',
    hospital: 'Bệnh viện Bạch Mai - Hà Nội',
    room: 'Khoa Hồi Sức Tích Cực (ICU) • Phòng 402, Giường 12',
    notes: 'Cần lật trở chống loét 2h/lần, kiểm tra SpO2 và hút đờm thường xuyên.',
    emergencyPhone: '0913 218 765'
  };
  if (!sheet) return info;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0]);
    const val = String(data[i][1] || '');
    if (key === 'patient_name') info.name = val;
    if (key === 'patient_diagnosis') info.diagnosis = val;
    if (key === 'patient_hospital') info.hospital = val;
    if (key === 'patient_room') info.room = val;
    if (key === 'patient_notes') info.notes = val;
    if (key === 'emergency_phone') info.emergencyPhone = val;
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
  if (/^\\d{1,2}\\/\\d{1,2}\\/\\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    dateStr = parts[2] + '-' + (parts[1].length === 1 ? '0' + parts[1] : parts[1]) + '-' + (parts[0].length === 1 ? '0' + parts[0] : parts[0]);
  } else if (/^\\d{4}-\\d{2}-\\d{2}/.test(dateStr)) {
    dateStr = dateStr.substring(0, 10);
  }
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(dateStr) && /^\\d{4}-\\d{2}-\\d{2}_/.test(shift.id || '')) {
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
  const data = sheet.getDataRange().getValues();
  const map = {
    patient_name: info.name,
    patient_diagnosis: info.diagnosis,
    patient_hospital: info.hospital,
    patient_room: info.room,
    patient_notes: info.notes,
    emergency_phone: info.emergencyPhone || ''
  };
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0]);
    if (map[key] !== undefined) {
      sheet.getRange(i + 1, 2).setValue(map[key]);
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
  if (/^\\d{1,2}:\\d{2}/.test(str)) {
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

function readExpensePin(ss) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet || sheet.getLastRow() <= 1) return '2468';
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === 'expense_pin') {
      return String(data[i][1] || '2468');
    }
  }
  return '2468';
}

function saveExpensePin(ss, pin) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === 'expense_pin') {
      sheet.getRange(i + 1, 2).setValue(String(pin));
      return;
    }
  }
  sheet.appendRow(['expense_pin', String(pin), 'Mã PIN riêng bảo mật Sổ Thu Chi Điều Trị']);
}

function readExpenses(ss) {
  const sheet = ss.getSheetByName('Expenses');
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const data = sheet.getDataRange().getValues();
  return data.slice(1).filter(row => row[0]).map(row => ({
    id: String(row[0]),
    date: formatRowDate(row[1]),
    type: String(row[2] || 'out'),
    amount: Number(row[3]) || 0,
    stage: String(row[4] || 'home_care'),
    category: String(row[5] || 'other_expense'),
    title: String(row[6] || ''),
    personName: String(row[7] || ''),
    paymentSource: String(row[8] || 'fund_or_advance'),
    note: row[9] ? String(row[9]) : '',
    receiptImage: row[10] ? String(row[10]) : '',
    createdAt: String(row[11] || ''),
    updatedAt: String(row[12] || '')
  })).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function saveExpense(ss, e) {
  const sheet = ss.getSheetByName('Expenses');
  if (!sheet || !e) return;
  const rowData = [
    e.id,
    "'" + (e.date || ''),
    e.type || 'out',
    Number(e.amount) || 0,
    e.stage || 'home_care',
    e.category || 'other_expense',
    e.title || '',
    e.personName || '',
    e.paymentSource || 'fund_or_advance',
    e.note || '',
    e.receiptImage || '',
    e.createdAt || new Date().toISOString(),
    e.updatedAt || new Date().toISOString()
  ];
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(e.id)) {
      sheet.getRange(i + 1, 1, 1, 13).setValues([rowData]);
      return;
    }
  }
  sheet.appendRow(rowData);
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
`;

export default function GoogleSheetGuideModal({
  isOpen,
  onClose,
  isSheetsConnected,
}: GoogleSheetGuideModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'appscript' | 'structure' | 'vercel'>('appscript');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl text-slate-200 overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Cấu Trúc Google Sheet 9 Bảng Tính V2.2 (Kèm Sổ Thu Chi)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Zero Hardcode
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Huyết áp (VitalsLog), Đơn thuốc (CareRoutines), Tích ngày (DailyLogs), Sổ Thu Chi (Expenses) + 5 bảng gốc
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trạng thái kết nối hiện tại */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/60 border-b border-slate-800 shrink-0">
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 ${
              isSheetsConnected
                ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300'
                : 'bg-indigo-950/30 border-indigo-700/50 text-indigo-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 shrink-0" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold block">
                  {isSheetsConnected
                    ? 'Đã kết nối toàn bộ 9 Bảng Tính Google Sheets V2.2 thành công!'
                    : 'Đang hoạt động với Bộ lưu trữ dự phòng (In-Memory Fallback)'}
                </span>
                <span className="text-[11px] opacity-80">
                  {isSheetsConnected
                    ? 'Mọi dữ liệu huyết áp, đơn thuốc, tích hoàn thành, lịch tái khám & Sổ Thu Chi được lưu vào Google Sheets thời gian thực.'
                    : 'Chỉ cần cập nhật mã Google Apps Script V2.2 bên dưới là bảng Expenses (Sổ Thu Chi) sẽ tự động khởi tạo mà không mất dữ liệu cũ!'}
                </span>
              </div>
            </div>

            {isSheetsConnected ? (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Online
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-bold text-xs shrink-0">
                Sẵn sàng
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 flex items-center gap-2 border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('appscript')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'appscript'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Mã Apps Script V2.2 (9 Bảng)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('structure')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'structure'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Cấu Trúc 9 Bảng Tính</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vercel')}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'vercel'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Gắn Link Vào Vercel</span>
          </button>
        </div>

        {/* Nội dung Tab cuộn */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'appscript' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-600/40 text-emerald-200 text-xs sm:text-sm leading-relaxed">
                <strong>⚡ Tự động 100% & An toàn dữ liệu cũ:</strong> Khi cập nhật đoạn mã V2.2 này, hệ thống giữ nguyên toàn bộ dữ liệu trên các Sheet cũ và <strong>tự động tạo thêm Sheet thứ 9 <code>Expenses</code> (13 cột)</strong> cùng khóa <code>expense_pin</code> (mặc định <code>2468</code>) trong bảng <code>Settings</code>!
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(APPS_SCRIPT_5_SHEETS_CODE, 'appscript_full')}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition shadow-lg cursor-pointer active:scale-95"
                >
                  {copiedKey === 'appscript_full' ? (
                    <>
                      <Check className="w-5 h-5 text-slate-950 stroke-[3]" />
                      <span>ĐÃ SAO CHÉP TOÀN BỘ MÃ NGUỒN 9 BẢNG V2.2!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>BẤM VÀO ĐÂY ĐỂ SAO CHÉP MÃ APPS SCRIPT V2.2 (1 CHẠM)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2 text-xs sm:text-sm text-slate-300">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Các bước cập nhật trong Google Sheets:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Mở trang tính Google Sheets &rarr; <strong>Tiện ích mở rộng</strong> &rarr; <strong>Apps Script</strong>.</li>
                  <li>Xóa hết code cũ trong <code>Code.gs</code>, dán đoạn mã V2.2 vừa sao chép &rarr; Bấm <strong>Lưu (Ctrl + S)</strong>.</li>
                  <li>Bấm nút <strong>Triển khai (Deploy)</strong> &rarr; <strong>Quản lý các bản triển khai (Manage deployments)</strong> &rarr; Bấm biểu tượng ✏️ (Chỉnh sửa) &rarr; Chọn Phiên bản: <strong>Phiên bản mới (New version)</strong> &rarr; Bấm <strong>Triển khai</strong> (nhờ vậy giữ nguyên URL cũ, không cần sửa lại trên Vercel!).</li>
                  <li>Hoặc nếu tạo mới từ đầu: Chọn <strong>Triển khai mới (New deployment)</strong> &rarr; <strong>Ứng dụng web (Web app)</strong> &rarr; Thực thi dưới dạng <strong>Tôi (Me)</strong>, Quyền truy cập <strong>Bất kỳ ai (Anyone)</strong> &rarr; Copy URL dán vào Vercel.</li>
                </ol>
              </div>

              {/* Code Preview */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs text-slate-400 font-bold block">Xem trước mã nguồn (Code.gs V2.2 - 9 Bảng):</span>
                <pre className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-[11px] font-mono text-emerald-300 max-h-56 overflow-y-auto leading-relaxed">
                  {APPS_SCRIPT_5_SHEETS_CODE}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300">
              <p className="text-slate-400">
                Toàn bộ dữ liệu V2.2 được chuẩn hóa thành <strong>9 bảng tính</strong> trong 1 file Google Sheet duy nhất (4 bảng mới V2 + 5 bảng gốc):
              </p>

              {/* 4 Bảng mới V2.2 */}
              <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-700/40 space-y-2.5">
                <div className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  ⭐ 4 Bảng Mới V2.2 — Sổ Sức Khỏe & Sổ Thu Chi Điều Trị
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-950 border border-rose-800/60 space-y-1">
                    <div className="font-bold text-rose-400 flex items-center gap-1.5">
                      <Table className="w-4 h-4 shrink-0" /> 6. VitalsLog (Huyết áp - 14 cột)
                    </div>
                    <p className="text-slate-400 text-xs">
                      ID, Ngày, Giờ, Buổi, Tâm thu (SYS), Tâm trương (DIA), Mạch, SpO2, Nhiệt độ, Đường huyết, Ghi chú, Mức cảnh báo, Người đo, Ngày tạo.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-blue-800/60 space-y-1">
                    <div className="font-bold text-blue-400 flex items-center gap-1.5">
                      <Table className="w-4 h-4 shrink-0" /> 7. CareRoutines (Đơn thuốc & Tập - 12 cột)
                    </div>
                    <p className="text-slate-400 text-xs">
                      ID, Mã giai đoạn, Tên giai đoạn, Loại (meds/rehab/care), Kiểu uống, Tên thuốc/bài tập, Liều lượng, Các buổi (JSON), Hướng dẫn, Lưu ý điều kiện, Đang dùng, Thứ tự.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-emerald-800/60 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Table className="w-4 h-4 shrink-0" /> 8. DailyLogs (Tích hàng ngày - 8 cột)
                    </div>
                    <p className="text-slate-400 text-xs">
                      ID (dl-ngày-routine-buổi), Ngày, Mã đầu việc, Buổi, Đã xong (TRUE/FALSE), Giờ hoàn thành, Người tích, Ghi chú.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-amber-700/80 space-y-1">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Table className="w-4 h-4 shrink-0" /> 9. Expenses (Sổ Thu Chi Điều Trị - 13 cột)
                    </div>
                    <p className="text-slate-400 text-xs">
                      13 cột: <code>id</code>, <code>date</code>, <code>type</code> (out/in), <code>amount</code>, <code>stage</code> (emergency/rehab_hospital/home_care), <code>category</code>, <code>title</code>, <code>person_name</code>, <code>payment_source</code>, <code>note</code>, <code>receipt_image</code>, <code>created_at</code>, <code>updated_at</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5 Bảng gốc */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> 1. Bảng Shifts (Ca trực & Lịch phụ Mẹ)
                  </div>
                  <p className="text-slate-400 text-xs">
                    24 cột: Lưu trữ lịch sử ca trực ICU cũ và lịch các con đăng ký qua phụ Mẹ chăm bố.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-blue-400 flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> 2. Bảng Members (Thành viên)
                  </div>
                  <p className="text-slate-400 text-xs">
                    12 cột: Mã TV, Họ tên, Vai vế trong nhà, Số điện thoại, Màu sắc hiển thị, Phân loại thành viên hỗ trợ.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> 3. Bảng Settings (Bệnh án, PIN Admin, PIN Thu Chi)
                  </div>
                  <p className="text-slate-400 text-xs">
                    3 cột (key, value, description): Hồ sơ bệnh nhân, <code>admin_pin</code> (1234), <code>expense_pin</code> (2468), Lịch tái khám và Ngưỡng huyết áp.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-rose-400 flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> 4. Bảng Contacts (Danh bạ SOS)
                  </div>
                  <p className="text-slate-400 text-xs">
                    7 cột: ID, Tên, Phân loại (Bác sĩ, 115, Điều dưỡng, Hàng xóm, Gia đình), Số điện thoại, Ghi chú khẩn cấp, Địa chỉ, Đánh dấu ưu tiên.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="font-bold text-yellow-400 flex items-center gap-1.5">
                  <Table className="w-4 h-4" /> 5. Bảng Reminders (Nhắc nhở y tế trong ngày)
                </div>
                <p className="text-slate-400 text-xs">
                  8 cột: ID, Phân loại (Thuốc, Tình trạng, Dặn dò, Sonde ăn, Chung), Tiêu đề, Nội dung chi tiết, Người ghi chú, Giờ ghi, Cờ khẩn cấp, Thời gian tạo.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'vercel' && (
            <div className="space-y-4 text-xs sm:text-sm text-slate-300">
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-600/40 text-indigo-200">
                <strong>Chỉ cần gắn 1 biến môi trường duy nhất vào dự án Vercel:</strong>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-mono font-bold text-sm">
                    GOOGLE_SHEETS_WEBAPP_URL
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('GOOGLE_SHEETS_WEBAPP_URL', 'var_name')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'var_name' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy tên biến</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Giá trị là đường link Web App mà bạn copy từ Apps Script (có dạng <code>https://script.google.com/macros/s/AKfycb.../exec</code>).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Ứng dụng đọc/ghi đồng thời cả 9 bảng tính Google Sheets thời gian thực
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-black transition min-h-[44px] cursor-pointer shadow"
          >
            Đã Hiểu & Đóng Lại
          </button>
        </div>
      </div>
    </div>
  );
}
