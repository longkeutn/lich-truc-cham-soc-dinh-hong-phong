'use server';

import {
  CarePhase,
  ShiftRecord,
  PatientVitals,
  SystemSettings,
  FamilyMember,
  PatientInfo,
  EmergencyContact,
  PatientDailyReminder,
  AllAppData,
  VitalsLogEntry,
  CareRoutine,
  DailyLog,
  AppointmentInfo,
  AllAppDataV2,
} from './types';
import {
  fetchAppDataFromStorage,
  fetchShiftsFromStorage,
  saveShiftToStorage,
  saveMemberToStorage,
  deleteMemberFromStorage,
  saveContactToStorage,
  deleteContactFromStorage,
  saveReminderToStorage,
  deleteReminderFromStorage,
  savePatientSettingsToStorage,
  getSystemSettings,
  setSystemPhase,
  verifyAdminPinStorage,
  changeAdminPinStorage,
  saveVitalsToStorage,
  deleteVitalsFromStorage,
  saveRoutineToStorage,
  deleteRoutineFromStorage,
  upsertDailyLogToStorage,
  saveAppointmentToStorage,
  fetchAllAppDataV2,
} from './sheets';

// Tải toàn bộ 5 thực thể trong 1 lần gọi (hỗ trợ Cache và Force Refresh)
export async function fetchAllAppDataAction(
  startDate: string,
  endDate: string,
  phase: CarePhase,
  forceRefresh: boolean = false
): Promise<AllAppData> {
  try {
    return await fetchAppDataFromStorage(startDate, endDate, phase, forceRefresh);
  } catch (error) {
    console.error('fetchAllAppDataAction error:', error);
    return await fetchAppDataFromStorage(startDate, endDate, phase, false);
  }
}

export async function fetchShiftsAction(
  startDate: string,
  endDate: string,
  phase: CarePhase,
  forceRefresh: boolean = false
): Promise<ShiftRecord[]> {
  try {
    return await fetchShiftsFromStorage(startDate, endDate, phase, forceRefresh);
  } catch (error) {
    console.error('fetchShiftsAction error:', error);
    return [];
  }
}

export async function assignShiftSlotAction(
  shift: ShiftRecord,
  memberName: string,
  slotIndex: number
): Promise<{ success: boolean; message?: string; updatedShift?: ShiftRecord }> {
  try {
    if (!memberName) {
      return { success: false, message: 'Vui lòng chọn người đang thao tác.' };
    }

    const assignees = [...shift.assignees];
    while (assignees.length < shift.requiredPax) {
      assignees.push(null);
    }

    if (assignees.includes(memberName) && assignees[slotIndex] !== memberName) {
      return {
        success: false,
        message: `${memberName} đã đăng ký một vị trí trong ca này rồi.`,
      };
    }

    assignees[slotIndex] = memberName;

    const updated: ShiftRecord = {
      ...shift,
      assignees,
      isUnderstaffed: assignees.filter(Boolean).length < shift.requiredPax,
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveShiftToStorage(updated);
    return { success: true, updatedShift: saved };
  } catch (error) {
    console.error('assignShiftSlotAction error:', error);
    return { success: false, message: 'Không thể nhận ca trực lúc này. Vui lòng thử lại.' };
  }
}

export async function unassignShiftSlotAction(
  shift: ShiftRecord,
  slotIndex: number
): Promise<{ success: boolean; message?: string; updatedShift?: ShiftRecord }> {
  try {
    const assignees = [...shift.assignees];
    if (slotIndex < assignees.length) {
      assignees[slotIndex] = null;
    }

    const updated: ShiftRecord = {
      ...shift,
      assignees,
      isUnderstaffed: assignees.filter(Boolean).length < shift.requiredPax,
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveShiftToStorage(updated);
    return { success: true, updatedShift: saved };
  } catch (error) {
    console.error('unassignShiftSlotAction error:', error);
    return { success: false, message: 'Không thể huỷ nhận ca lúc này.' };
  }
}

export async function toggleChecklistAction(
  shift: ShiftRecord,
  itemKey: 'feeding' | 'meds' | 'hygiene' | 'turning',
  isChecked: boolean
): Promise<{ success: boolean; updatedShift?: ShiftRecord }> {
  try {
    const updated: ShiftRecord = {
      ...shift,
      checklist: {
        ...shift.checklist,
        [itemKey]: isChecked,
      },
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveShiftToStorage(updated);
    return { success: true, updatedShift: saved };
  } catch (error) {
    console.error('toggleChecklistAction error:', error);
    return { success: false };
  }
}

export const updateChecklistAction = toggleChecklistAction;

export async function saveHandoverAction(
  shift: ShiftRecord,
  note: string,
  author: string,
  vitals?: PatientVitals
): Promise<{ success: boolean; updatedShift?: ShiftRecord }> {
  try {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} (${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')})`;

    const updated: ShiftRecord = {
      ...shift,
      handover: {
        note,
        author: author || 'Thành viên gia đình',
        updatedAt: timeStr,
        vitals: vitals || shift.handover.vitals,
      },
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveShiftToStorage(updated);
    return { success: true, updatedShift: saved };
  } catch (error) {
    console.error('saveHandoverAction error:', error);
    return { success: false };
  }
}

export async function saveShiftAction(
  shift: ShiftRecord
): Promise<{ success: boolean; message?: string; updatedShift?: ShiftRecord }> {
  try {
    const saved = await saveShiftToStorage(shift);
    return { success: true, updatedShift: saved };
  } catch (error) {
    console.error('saveShiftAction error:', error);
    return { success: false, message: 'Không thể cập nhật ca trực lúc này.' };
  }
}

export async function updateShiftRequiredPaxAction(
  shift: ShiftRecord,
  newPax: number
): Promise<{ success: boolean; message?: string; updatedShift?: ShiftRecord }> {
  try {
    const pax = Math.max(1, Math.min(5, newPax));
    const assignees = [...(shift.assignees || [])].filter(Boolean) as string[];
    const updated: ShiftRecord = {
      ...shift,
      requiredPax: pax,
      assignees,
      isUnderstaffed: assignees.length < pax,
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveShiftToStorage(updated);
    return { success: true, updatedShift: saved };
  } catch (error) {
    console.error('updateShiftRequiredPaxAction error:', error);
    return { success: false, message: 'Lỗi khi cập nhật số người trong ca.' };
  }
}

export async function toggleShiftAssigneeAction(
  shift: ShiftRecord,
  memberName: string
): Promise<{ success: boolean; message?: string; updatedShift?: ShiftRecord }> {
  try {
    let reqPax = shift.requiredPax || 1;
    let assignees = [...(shift.assignees || [])].filter(Boolean) as string[];

    if (assignees.includes(memberName)) {
      assignees = assignees.filter((n) => n !== memberName);
    } else {
      if (assignees.length >= reqPax) {
        reqPax = assignees.length + 1;
      }
      assignees.push(memberName);
    }

    const updated: ShiftRecord = {
      ...shift,
      requiredPax: reqPax,
      assignees,
      isUnderstaffed: assignees.length < reqPax,
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveShiftToStorage(updated);
    return { success: true, updatedShift: saved };
  } catch (error) {
    console.error('toggleShiftAssigneeAction error:', error);
    return { success: false, message: 'Lỗi khi cập nhật người trực chính.' };
  }
}

export async function toggleShiftSupporterAction(
  shift: ShiftRecord,
  supporterName: string
): Promise<{ success: boolean; message?: string; updatedShift?: ShiftRecord }> {
  try {
    let supporters = [...(shift.supporters || [])];
    if (supporters.includes(supporterName)) {
      supporters = supporters.filter((n) => n !== supporterName);
    } else {
      supporters.push(supporterName);
    }

    const updated: ShiftRecord = {
      ...shift,
      supporters,
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveShiftToStorage(updated);
    return { success: true, updatedShift: saved };
  } catch (error) {
    console.error('toggleShiftSupporterAction error:', error);
    return { success: false, message: 'Lỗi khi cập nhật người hỗ trợ.' };
  }
}

// --- CRUD Members ---
export async function saveMemberAction(
  member: FamilyMember
): Promise<{ success: boolean; members: FamilyMember[] }> {
  try {
    const members = await saveMemberToStorage(member);
    return { success: true, members };
  } catch (error) {
    console.error('saveMemberAction error:', error);
    return { success: false, members: [] };
  }
}

export async function deleteMemberAction(
  memberId: string
): Promise<{ success: boolean; members: FamilyMember[] }> {
  try {
    const members = await deleteMemberFromStorage(memberId);
    return { success: true, members };
  } catch (error) {
    console.error('deleteMemberAction error:', error);
    return { success: false, members: [] };
  }
}

// --- CRUD Contacts ---
export async function saveContactAction(
  contact: EmergencyContact
): Promise<{ success: boolean; contacts: EmergencyContact[] }> {
  try {
    const contacts = await saveContactToStorage(contact);
    return { success: true, contacts };
  } catch (error) {
    console.error('saveContactAction error:', error);
    return { success: false, contacts: [] };
  }
}

export async function deleteContactAction(
  contactId: string
): Promise<{ success: boolean; contacts: EmergencyContact[] }> {
  try {
    const contacts = await deleteContactFromStorage(contactId);
    return { success: true, contacts };
  } catch (error) {
    console.error('deleteContactAction error:', error);
    return { success: false, contacts: [] };
  }
}

// --- CRUD Reminders ---
export async function saveReminderAction(
  reminder: PatientDailyReminder
): Promise<{ success: boolean; reminders: PatientDailyReminder[] }> {
  try {
    const reminders = await saveReminderToStorage(reminder);
    return { success: true, reminders };
  } catch (error) {
    console.error('saveReminderAction error:', error);
    return { success: false, reminders: [] };
  }
}

export async function deleteReminderAction(
  reminderId: string
): Promise<{ success: boolean; reminders: PatientDailyReminder[] }> {
  try {
    const reminders = await deleteReminderFromStorage(reminderId);
    return { success: true, reminders };
  } catch (error) {
    console.error('deleteReminderAction error:', error);
    return { success: false, reminders: [] };
  }
}

// --- Patient Settings ---
export async function savePatientInfoAction(
  info: PatientInfo
): Promise<{ success: boolean; patientInfo: PatientInfo }> {
  try {
    const patientInfo = await savePatientSettingsToStorage(info);
    return { success: true, patientInfo };
  } catch (error) {
    console.error('savePatientInfoAction error:', error);
    return { success: false, patientInfo: info };
  }
}

export async function getSettingsAction(): Promise<SystemSettings> {
  return getSystemSettings();
}

export async function changePhaseAction(phase: CarePhase): Promise<SystemSettings> {
  return await setSystemPhase(phase);
}

// --- Admin PIN Actions ---
export async function verifyAdminPinAction(
  pin: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const isValid = await verifyAdminPinStorage(pin);
    if (isValid) {
      return { success: true };
    }
    return { success: false, message: 'Mã PIN không chính xác. Vui lòng thử lại.' };
  } catch (error) {
    console.error('verifyAdminPinAction error:', error);
    return { success: false, message: 'Lỗi kiểm tra mã PIN.' };
  }
}

export async function changeAdminPinAction(
  oldPin: string,
  newPin: string
): Promise<{ success: boolean; message?: string }> {
  try {
    return await changeAdminPinStorage(oldPin, newPin);
  } catch (error) {
    console.error('changeAdminPinAction error:', error);
    return { success: false, message: 'Lỗi đổi mã PIN.' };
  }
}


// ==========================================
// V2.0 — SỔ SỨC KHỎE BỐ — Server Actions mới
// ==========================================

// --- V2.0: Vitals Log (Nhật ký Huyết áp & Sinh hiệu) ---

export async function saveVitalsAction(
  entry: VitalsLogEntry
): Promise<{ success: boolean; entry?: VitalsLogEntry }> {
  try {
    const saved = await saveVitalsToStorage(entry);
    return { success: true, entry: saved };
  } catch (error) {
    console.error('saveVitalsAction error:', error);
    return { success: false };
  }
}

export async function deleteVitalsAction(
  id: string
): Promise<{ success: boolean }> {
  try {
    await deleteVitalsFromStorage(id);
    return { success: true };
  } catch (error) {
    console.error('deleteVitalsAction error:', error);
    return { success: false };
  }
}

// --- V2.0: Care Routines (Đơn thuốc & Bài tập phục hồi) ---

export async function saveRoutineAction(
  routine: CareRoutine
): Promise<{ success: boolean; routines: CareRoutine[] }> {
  try {
    const routines = await saveRoutineToStorage(routine);
    return { success: true, routines };
  } catch (error) {
    console.error('saveRoutineAction error:', error);
    return { success: false, routines: [] };
  }
}

export async function deleteRoutineAction(
  id: string
): Promise<{ success: boolean; routines: CareRoutine[] }> {
  try {
    const routines = await deleteRoutineFromStorage(id);
    return { success: true, routines };
  } catch (error) {
    console.error('deleteRoutineAction error:', error);
    return { success: false, routines: [] };
  }
}

// --- V2.0: Daily Logs (Tích hoàn thành hàng ngày) ---

export async function toggleDailyLogAction(
  log: DailyLog
): Promise<{ success: boolean; log?: DailyLog }> {
  try {
    const saved = await upsertDailyLogToStorage(log);
    return { success: true, log: saved };
  } catch (error) {
    console.error('toggleDailyLogAction error:', error);
    return { success: false };
  }
}

// --- V2.0: Appointment (Lịch tái khám) ---

export async function saveAppointmentAction(
  info: AppointmentInfo
): Promise<{ success: boolean; appointment: AppointmentInfo }> {
  try {
    const appointment = await saveAppointmentToStorage(info);
    return { success: true, appointment };
  } catch (error) {
    console.error('saveAppointmentAction error:', error);
    return { success: false, appointment: info };
  }
}

// --- V2.0: Fetch All App Data V2 (mở rộng fetchAllAppDataAction) ---

export async function fetchAllAppDataV2Action(
  startDate: string,
  endDate: string,
  phase: CarePhase,
  forceRefresh: boolean = false
): Promise<AllAppDataV2> {
  try {
    return await fetchAllAppDataV2(startDate, endDate, phase, forceRefresh);
  } catch (error) {
    console.error('fetchAllAppDataV2Action error:', error);
    // Fallback: trả về v1 data + defaults cho v2 fields
    const v1Data = await fetchAppDataFromStorage(startDate, endDate, phase, false);
    return {
      ...v1Data,
      vitalsLog: [],
      careRoutines: [],
      dailyLogs: [],
      stages: [],
      appointment: {},
      bpThresholds: { highSys: 140, highDia: 90, lowSys: 100, lowDia: 60 },
      appMode: 'home_care',
    };
  }
}
