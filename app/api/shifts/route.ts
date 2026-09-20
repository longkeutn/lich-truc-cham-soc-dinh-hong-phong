import { NextRequest, NextResponse } from 'next/server';
import { CarePhase, ShiftRecord } from '@/lib/types';
import { fetchShiftsFromStorage, saveShiftToStorage, getSystemSettings } from '@/lib/sheets';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const phase = (searchParams.get('phase') as CarePhase) || 'phase1';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp startDate và endDate (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const shifts = await fetchShiftsFromStorage(startDate, endDate, phase);
    const settings = getSystemSettings();

    return NextResponse.json({
      success: true,
      phase,
      settings,
      totalShifts: shifts.length,
      shifts,
    });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Lỗi khi tải danh sách ca trực', details },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const shift = body.shift as ShiftRecord;

    if (!shift || !shift.id || !shift.date) {
      return NextResponse.json(
        { error: 'Dữ liệu ca trực không hợp lệ' },
        { status: 400 }
      );
    }

    const updated = await saveShiftToStorage(shift);
    return NextResponse.json({
      success: true,
      message: 'Cập nhật ca trực thành công',
      shift: updated,
    });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Lỗi khi lưu ca trực', details },
      { status: 500 }
    );
  }
}
