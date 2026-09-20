'use client';

import React, { useState } from 'react';
import { SHIFTS_SHEET_HEADERS } from '@/lib/config';
import {
  FileSpreadsheet,
  X,
  Copy,
  Check,
  Database,
  Sparkles,
  ExternalLink,
  Code2,
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
 * GOOGLE APPS SCRIPT WEB APP - LỊCH TRỰC CHĂM SÓC GIA ĐÌNH ĐINH HỒNG PHONG
 * Tự động tạo và quản lý 5 Bảng Tính: Shifts, Members, Settings, Contacts, Reminders
 * Hỗ trợ API CRUD 2 chiều thời gian thực (Zero Hardcode).
 */

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'getAllData';
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheetsSetup(ss);

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
        adminPin: readAdminPin(ss)
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
  // Sheet 1: Shifts (Ca trực)
  let sheetShifts = ss.getSheetByName('Shifts');
  if (!sheetShifts) {
    sheetShifts = ss.insertSheet('Shifts');
    const headers = [
      'shift_id', 'date', 'phase', 'shift_type', 'shift_name', 'time_range',
      'required_pax', 'assignee_1', 'assignee_2', 'is_understaffed',
      'handover_note', 'handover_by', 'handover_time',
      'vitals_bp', 'vitals_spo2', 'vitals_pulse', 'vitals_temp',
      'chk_feeding', 'chk_meds', 'chk_hygiene', 'chk_turning', 'updated_at'
    ];
    sheetShifts.appendRow(headers);
    sheetShifts.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E2E8F0');
    sheetShifts.setFrozenRows(1);
  }

  // Sheet 2: Members (Thành viên gia đình)
  let sheetMembers = ss.getSheetByName('Members');
  if (!sheetMembers) {
    sheetMembers = ss.insertSheet('Members');
    const headers = ['member_id', 'name', 'relation', 'phone', 'badge_color', 'avatar_initials', 'bg_light', 'border_light', 'text_color', 'accent_color', 'pill_badge'];
    sheetMembers.appendRow(headers);
    sheetMembers.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#DBEAFE');
    sheetMembers.setFrozenRows(1);

    const defaultMembers = [
      ['mem-1', 'Bác Thành', 'Bác cả (Trưởng ban điều phối)', '0912 345 678', 'bg-blue-600', 'BT', 'bg-blue-50/90', 'border-blue-300', 'text-blue-900', 'bg-blue-600 text-white', 'bg-blue-100 text-blue-800 border-blue-300 font-bold'],
      ['mem-2', 'Cô Lan', 'Em gái bệnh nhân', '0983 222 111', 'bg-emerald-600', 'CL', 'bg-emerald-50/90', 'border-emerald-300', 'text-emerald-900', 'bg-emerald-600 text-white', 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'],
      ['mem-3', 'Anh Dũng', 'Con trai trưởng', '0977 888 999', 'bg-indigo-600', 'AD', 'bg-indigo-50/90', 'border-indigo-300', 'text-indigo-900', 'bg-indigo-600 text-white', 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold'],
      ['mem-4', 'Chị Mai', 'Con dâu trưởng', '0904 555 444', 'bg-rose-600', 'CM', 'bg-rose-50/90', 'border-rose-300', 'text-rose-900', 'bg-rose-600 text-white', 'bg-rose-100 text-rose-800 border-rose-300 font-bold'],
      ['mem-5', 'Anh Hùng', 'Con trai thứ', '0918 666 777', 'bg-amber-600', 'AH', 'bg-amber-50/90', 'border-amber-300', 'text-amber-950', 'bg-amber-600 text-white', 'bg-amber-100 text-amber-900 border-amber-300 font-bold'],
      ['mem-6', 'Chị Trang', 'Con gái út', '0936 123 456', 'bg-purple-600', 'CT', 'bg-purple-50/90', 'border-purple-300', 'text-purple-900', 'bg-purple-600 text-white', 'bg-purple-100 text-purple-800 border-purple-300 font-bold'],
      ['mem-7', 'Cháu Quân', 'Cháu đích tôn', '0988 999 112', 'bg-teal-600', 'CQ', 'bg-teal-50/90', 'border-teal-300', 'text-teal-900', 'bg-teal-600 text-white', 'bg-teal-100 text-teal-800 border-teal-300 font-bold']
    ];
    defaultMembers.forEach(m => sheetMembers.appendRow(m));
  }

  // Sheet 3: Settings (Thông tin bệnh nhân & cấu hình)
  let sheetSettings = ss.getSheetByName('Settings');
  if (!sheetSettings) {
    sheetSettings = ss.insertSheet('Settings');
    const headers = ['key', 'value', 'description'];
    sheetSettings.appendRow(headers);
    sheetSettings.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#FEF3C7');
    sheetSettings.setFrozenRows(1);

    const defaultSettings = [
      ['patient_name', 'Đinh Hồng Phong', 'Họ và tên bệnh nhân'],
      ['patient_diagnosis', 'Tai biến mạch máu não nặng (Đột quỵ diện rộng), liệt nửa người, thở máy/sonde', 'Chẩn đoán y khoa chính'],
      ['patient_hospital', 'Bệnh viện Bạch Mai - Hà Nội', 'Bệnh viện đang điều trị'],
      ['patient_room', 'Khoa Hồi Sức Tích Cực (ICU) • Phòng 402, Giường 12', 'Vị trí phòng & số giường'],
      ['patient_notes', 'Cần lật trở chống loét 2h/lần, kiểm tra SpO2 và hút đờm thường xuyên.', 'Chỉ định chăm sóc đặc biệt'],
      ['emergency_phone', '0913 218 765 (BS. Hùng - ICU)', 'Số điện thoại bác sĩ điều trị chính'],
      ['current_phase', 'phase1', 'Giai đoạn hiện tại (phase1: ICU, phase2: Tại nhà)'],
      ['admin_pin', '1234', 'Mã PIN quyền Admin bảo mật']
    ];
    defaultSettings.forEach(s => sheetSettings.appendRow(s));
  } else {
    const data = sheetSettings.getDataRange().getValues();
    let hasAdminPin = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === 'admin_pin') {
        hasAdminPin = true;
        break;
      }
    }
    if (!hasAdminPin) {
      sheetSettings.appendRow(['admin_pin', '1234', 'Mã PIN quyền Admin bảo mật']);
    }
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
}

// ==========================================
// CÁC HÀM ĐỌC DỮ LIỆU
// ==========================================
function readShifts(ss, startDate, endDate, phase) {
  const sheet = ss.getSheetByName('Shifts');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const shifts = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const shiftId = String(row[0] || '');
    const rowDate = String(row[1] || '').substring(0, 10);
    const rowPhase = String(row[2] || '');

    if (shiftId && (!phase || rowPhase === phase)) {
      if ((!startDate || rowDate >= startDate) && (!endDate || rowDate <= endDate)) {
        const reqPax = parseInt(row[6] || '1', 10);
        shifts.push({
          id: shiftId,
          date: rowDate,
          phase: rowPhase,
          type: row[3],
          name: row[4],
          timeRange: row[5],
          requiredPax: reqPax,
          assignees: reqPax === 2 ? [row[7] || null, row[8] || null] : [row[7] || null],
          isUnderstaffed: String(row[9]).toUpperCase() === 'TRUE',
          handover: {
            note: row[10] || '',
            author: row[11] || '',
            updatedAt: row[12] || '',
            vitals: { bp: row[13] || '', spo2: row[14] || '', pulse: row[15] || '', temp: row[16] || '' }
          },
          checklist: {
            feeding: String(row[17]).toUpperCase() === 'TRUE',
            meds: String(row[18]).toUpperCase() === 'TRUE',
            hygiene: String(row[19]).toUpperCase() === 'TRUE',
            turning: String(row[20]).toUpperCase() === 'TRUE'
          },
          updatedAt: row[21] || ''
        });
      }
    }
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
        pillBadge: String(row[10] || 'bg-blue-100 text-blue-800 border-blue-300 font-bold')
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
  const data = sheet.getDataRange().getValues();
  const rowValues = [
    shift.id, shift.date, shift.phase, shift.type, shift.name, shift.timeRange,
    shift.requiredPax,
    (shift.assignees && shift.assignees[0]) || '',
    (shift.assignees && shift.assignees[1]) || '',
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
    new Date().toISOString()
  ];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === shift.id) {
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      return;
    }
  }
  sheet.appendRow(rowValues);
}

function saveMember(ss, member) {
  const sheet = ss.getSheetByName('Members');
  const data = sheet.getDataRange().getValues();
  const rowValues = [
    member.id, member.name, member.relation, member.phone,
    member.badgeColor || 'bg-blue-600', member.avatarInitials || 'TV',
    member.bgLight || 'bg-blue-50/90', member.borderLight || 'border-blue-300',
    member.textColor || 'text-blue-900', member.accentColor || 'bg-blue-600 text-white',
    member.pillBadge || 'bg-blue-100 text-blue-800 border-blue-300 font-bold'
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

  const shiftsHeaderTsv = SHIFTS_SHEET_HEADERS.join('\t');

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
                  Cấu Trúc Google Sheet 5 Bảng Tính (CRUD Động)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Zero Hardcode
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Ca trực, Thành viên, Bệnh án, Danh bạ SOS & Nhắc nhở lưu trữ tập trung
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
                    ? 'Đã kết nối toàn bộ 5 Bảng Tính Google Sheets thành công!'
                    : 'Đang hoạt động với Bộ lưu trữ dự phòng (In-Memory Fallback)'}
                </span>
                <span className="text-[11px] opacity-80">
                  {isSheetsConnected
                    ? 'Mọi thay đổi về ca trực, danh bạ SOS, nhắc nhở thuốc và bệnh án được lưu vào Google Sheets thời gian thực.'
                    : 'Chỉ cần dán link Google Apps Script là toàn bộ 5 bảng tính sẽ tự động sinh và kết nối!'}
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
            <span>Mã Apps Script Tự Động Tạo 5 Bảng</span>
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
            <span>Cấu Trúc 5 Bảng Tính</span>
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
                <strong>⚡ Tự động 100%:</strong> Khi triển khai đoạn mã này, hệ thống sẽ tự động tạo đủ 5 Sheet (<code>Shifts</code>, <code>Members</code>, <code>Settings</code>, <code>Contacts</code>, <code>Reminders</code>), tự động đóng băng dòng tiêu đề và điền sẵn dữ liệu mẫu. Bạn không phải tạo tay từng cột!
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
                      <span>ĐÃ SAO CHÉP TOÀN BỘ MÃ NGUỒN 5 BẢNG!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>BẤM VÀO ĐÂY ĐỂ SAO CHÉP MÃ APPS SCRIPT (1 CHẠM)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2 text-xs sm:text-sm text-slate-300">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Các bước triển khai trong Google Sheets:
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Mở trang tính Google Sheets &rarr; <strong>Tiện ích mở rộng</strong> &rarr; <strong>Apps Script</strong>.</li>
                  <li>Xóa hết code cũ, dán đoạn mã vừa sao chép &rarr; Bấm <strong>Lưu (Ctrl + S)</strong>.</li>
                  <li>Bấm nút <strong>Triển khai (Deploy)</strong> &rarr; <strong>Triển khai mới (New deployment)</strong> &rarr; Chọn <strong>Ứng dụng web (Web app)</strong>.</li>
                  <li>Chọn thực thi dưới dạng: <strong>Tôi (Me)</strong>, Ai có quyền truy cập: <strong>Bất kỳ ai (Anyone)</strong>.</li>
                  <li>Bấm <strong>Triển khai</strong> &rarr; Cấp quyền &rarr; Copy đường link URL Web App dán vào Vercel.</li>
                </ol>
              </div>

              {/* Code Preview */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs text-slate-400 font-bold block">Xem trước mã nguồn (Code.gs):</span>
                <pre className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-[11px] font-mono text-emerald-300 max-h-56 overflow-y-auto leading-relaxed">
                  {APPS_SCRIPT_5_SHEETS_CODE}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'structure' && (
            <div className="space-y-3.5 text-xs sm:text-sm text-slate-300">
              <p className="text-slate-400">
                Toàn bộ dữ liệu được chuẩn hóa thành 5 bảng tính liên kết trong 1 file Google Sheet duy nhất:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> 1. Bảng Shifts (Ca trực)
                  </div>
                  <p className="text-slate-400 text-xs">
                    22 cột: Mã ca, Ngày, Giai đoạn, Loại ca, Khung giờ, Số người cần trực, Người trực 1 & 2, Trạng thái thiếu người, Ghi chú bàn giao, Người bàn giao, 4 chỉ số sinh hiệu (Huyết áp, SpO2, Mạch, Nhiệt độ), Checklist 4 việc.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-blue-400 flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> 2. Bảng Members (Thành viên)
                  </div>
                  <p className="text-slate-400 text-xs">
                    11 cột: Mã TV, Họ tên, Vai vế trong nhà, Số điện thoại, Mã màu huy hiệu, Chữ viết tắt Avatar, Màu nền, Viền, Màu chữ. Có thể thêm người mới trực tiếp từ Sheet!
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> 3. Bảng Settings (Bệnh án & Cài đặt)
                  </div>
                  <p className="text-slate-400 text-xs">
                    3 cột (key, value, description): Tên bệnh nhân, Chẩn đoán y khoa, Bệnh viện, Phòng bệnh, Chỉ định dặn dò, Giai đoạn hiện tại (ICU hoặc Tại nhà).
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="font-bold text-rose-400 flex items-center gap-1.5">
                    <Table className="w-4 h-4" /> 4. Bảng Contacts (Danh bạ SOS)
                  </div>
                  <p className="text-slate-400 text-xs">
                    7 cột: ID, Tên, Phân loại (Bác sĩ, 115, Điều dưỡng, Hàng xóm, Gia đình), Số điện thoại, Ghi chú khẩn cấp, Địa chỉ, Đánh dấu ưu tiên. Dùng chung đồng bộ cho cả nhà!
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
            Ứng dụng đọc/ghi đồng thời cả 5 bảng tính Google Sheets thời gian thực
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
