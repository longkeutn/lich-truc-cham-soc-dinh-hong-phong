'use client';

import React, { useState, useMemo } from 'react';
import { ShiftRecord, FamilyMember } from '@/lib/types';
import {
  Calendar,
  Clock,
  Heart,
  Activity,
  Wind,
  Thermometer,
  Search,
  Filter,
  CheckCircle2,
  Users,
  MessageSquare,
  Sparkles,
  ClipboardList,
} from 'lucide-react';

interface ShiftHistoryViewProps {
  shifts: ShiftRecord[];
  members: FamilyMember[];
}

export default function ShiftHistoryView({ shifts, members }: ShiftHistoryViewProps) {
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [onlyWithNotes, setOnlyWithNotes] = useState<boolean>(false);

  // Lọc và sắp xếp các ca trực: Ưu tiên các ca ĐÃ CÓ NGƯỜI TRỰC hoặc CÓ GHI CHÚ, xếp ngày mới nhất lên đầu
  const filteredShifts = useMemo(() => {
    return shifts
      .filter((s) => {
        const hasAssignees = s.assignees && s.assignees.filter(Boolean).length > 0;
        const hasSupporters = s.supporters && s.supporters.length > 0;
        const hasNote = Boolean(s.handover?.note?.trim());
        const hasVitals = Boolean(
          s.handover?.vitals?.bp ||
          s.handover?.vitals?.spo2 ||
          s.handover?.vitals?.pulse ||
          s.handover?.vitals?.temp
        );

        // Chỉ hiển thị các ca đã có người trực, có người hỗ trợ, hoặc có dữ liệu ghi nhận
        if (!hasAssignees && !hasSupporters && !hasNote && !hasVitals) {
          return false;
        }

        // Lọc theo thành viên (trực chính hoặc hỗ trợ)
        if (selectedMember !== 'all') {
          const isMain = s.assignees?.includes(selectedMember);
          const isSupport = s.supporters?.includes(selectedMember);
          if (!isMain && !isSupport) return false;
        }

        // Lọc theo loại ca
        if (selectedType !== 'all') {
          if (selectedType === 'day' && s.type !== 'morning' && s.type !== 'day_12h') return false;
          if (selectedType === 'afternoon' && s.type !== 'afternoon') return false;
          if (selectedType === 'night' && s.type !== 'night' && s.type !== 'night_12h') return false;
        }

        // Lọc chỉ ca có ghi chú bàn giao
        if (onlyWithNotes && !hasNote) {
          return false;
        }

        // Lọc theo từ khóa tìm kiếm
        if (searchKeyword.trim()) {
          const kw = searchKeyword.toLowerCase().trim();
          const noteMatch = (s.handover?.note || '').toLowerCase().includes(kw);
          const authorMatch = (s.handover?.author || '').toLowerCase().includes(kw);
          const assigneeMatch = (s.assignees || []).some((a) => (a || '').toLowerCase().includes(kw));
          const supporterMatch = (s.supporters || []).some((sup) => (sup || '').toLowerCase().includes(kw));
          const dateMatch = s.date.includes(kw);

          if (!noteMatch && !authorMatch && !assigneeMatch && !supporterMatch && !dateMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sắp xếp ngày mới nhất lên đầu, nếu cùng ngày thì xếp ca đêm -> chiều -> sáng
        if (a.date !== b.date) {
          return b.date.localeCompare(a.date);
        }
        const order: Record<string, number> = { night: 3, night_12h: 3, afternoon: 2, morning: 1, day_12h: 1 };
        return (order[b.type] || 0) - (order[a.type] || 0);
      });
  }, [shifts, selectedMember, selectedType, searchKeyword, onlyWithNotes]);

  // Thống kê ý nghĩa gia đình (không tính công, mà là nhật ký đồng hành)
  const familyStats = useMemo(() => {
    const totalRecordedShifts = filteredShifts.length;
    let totalNotes = 0;
    let totalVitalsRecorded = 0;
    const uniqueDays = new Set<string>();

    filteredShifts.forEach((s) => {
      uniqueDays.add(s.date);
      if (s.handover?.note?.trim()) totalNotes++;
      if (
        s.handover?.vitals?.bp ||
        s.handover?.vitals?.spo2 ||
        s.handover?.vitals?.pulse ||
        s.handover?.vitals?.temp
      ) {
        totalVitalsRecorded++;
      }
    });

    return {
      totalRecordedShifts,
      totalNotes,
      totalVitalsRecorded,
      totalDays: uniqueDays.size,
    };
  }, [filteredShifts]);

  return (
    <div className="space-y-5">
      {/* Banner Tình Cảm Gia Đình & Nhật Ký Đồng Hành */}
      <div className="rounded-3xl p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-white/10 backdrop-blur-md">
              <ClipboardList className="w-5 h-5 text-indigo-300" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Nhật Ký Chăm Sóc & Lịch Sử Trực
              </h2>
              <p className="text-xs text-indigo-200">
                Lưu giữ từng ca trực, lời dặn dò bàn giao và chỉ số sức khỏe của người thân
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs border border-white/10">
              <div className="text-[11px] text-indigo-200 font-medium">Lượt ca đã trực</div>
              <div className="text-xl font-black text-white mt-0.5">
                {familyStats.totalRecordedShifts} <span className="text-xs font-normal opacity-80">ca</span>
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs border border-white/10">
              <div className="text-[11px] text-indigo-200 font-medium">Ghi chú bàn giao</div>
              <div className="text-xl font-black text-amber-300 mt-0.5">
                {familyStats.totalNotes} <span className="text-xs font-normal opacity-80">lần</span>
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs border border-white/10">
              <div className="text-[11px] text-indigo-200 font-medium">Lần đo sinh hiệu</div>
              <div className="text-xl font-black text-rose-300 mt-0.5">
                {familyStats.totalVitalsRecorded} <span className="text-xs font-normal opacity-80">lần</span>
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs border border-white/10">
              <div className="text-[11px] text-indigo-200 font-medium">Số ngày ghi nhận</div>
              <div className="text-xl font-black text-emerald-300 mt-0.5">
                {familyStats.totalDays} <span className="text-xs font-normal opacity-80">ngày</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thanh Bộ Lọc & Tìm Kiếm */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Lọc theo thành viên */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              Lọc theo thành viên:
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả mọi người trong gia đình</option>
              {members.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.relation}) {m.isSupporter ? '• Phụ giúp' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo loại ca */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Loại ca trực:
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả các ca trong ngày</option>
              <option value="day">Ca Sáng (06h - 14h / 12h ngày)</option>
              <option value="afternoon">Ca Chiều (14h - 22h)</option>
              <option value="night">Ca Đêm (22h - 06h / 12h đêm)</option>
            </select>
          </div>

          {/* Tìm kiếm từ khóa */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              Tìm kiếm dặn dò, sinh hiệu:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="VD: sốt, huyết áp, hút đờm, Mai..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-800 focus:bg-white focus:border-indigo-600 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Nút lọc nhanh: chỉ ca có ghi chú bàn giao */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWithNotes}
              onChange={(e) => setOnlyWithNotes(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700">
              Chỉ hiển thị các ca có lời dặn dò bàn giao hoặc sinh hiệu
            </span>
          </label>

          <span className="text-xs text-slate-500 font-medium">
            Hiển thị <span className="font-black text-indigo-700">{filteredShifts.length}</span> ca trực
          </span>
        </div>
      </div>

      {/* Danh Sách Các Ca Trực Dạng Dòng Thời Gian (Timeline Cards) */}
      {filteredShifts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Không tìm thấy ca trực nào phù hợp</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Thử xoá bộ lọc hoặc đổi sang thành viên khác để xem lại lịch sử chăm sóc.
            </p>
          </div>
          {(selectedMember !== 'all' || selectedType !== 'all' || searchKeyword || onlyWithNotes) && (
            <button
              type="button"
              onClick={() => {
                setSelectedMember('all');
                setSelectedType('all');
                setSearchKeyword('');
                setOnlyWithNotes(false);
              }}
              className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Xoá tất cả bộ lọc
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShifts.map((shift) => {
            const assignees = (shift.assignees || []).filter(Boolean) as string[];
            const supporters = (shift.supporters || []).filter(Boolean) as string[];
            const hasVitals =
              Boolean(shift.handover?.vitals?.bp) ||
              Boolean(shift.handover?.vitals?.spo2) ||
              Boolean(shift.handover?.vitals?.pulse) ||
              Boolean(shift.handover?.vitals?.temp);

            const displayDate = shift.date.split('-').reverse().join('/');

            return (
              <div
                key={shift.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3.5 transition"
              >
                {/* Header ca: Ngày, Giờ, Tên ca, Giai đoạn */}
                <div className="flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white font-mono text-xs font-black">
                      {displayDate}
                    </span>
                    <span className="text-sm font-black text-slate-900">{shift.name}</span>
                    <span className="text-xs text-slate-500 font-medium">({shift.timeRange})</span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                      shift.phase === 'phase1'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {shift.phase === 'phase1' ? 'Ca 8 tiếng' : 'Ca 12 tiếng'}
                  </span>
                </div>

                {/* Danh sách người trực: Trực chính & Hỗ trợ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Người trực chính */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      Người trực chính:
                    </div>
                    {assignees.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {assignees.map((name) => {
                          const m = members.find((x) => x.name === name);
                          return (
                            <div
                              key={name}
                              className={`p-2 rounded-xl border flex items-center gap-2 ${
                                m?.bgLight || 'bg-slate-50'
                              } ${m?.borderLight || 'border-slate-200'}`}
                            >
                              <div
                                className={`w-6 h-6 rounded-lg text-white font-bold text-[10px] flex items-center justify-center shrink-0 ${
                                  m?.badgeColor || 'bg-slate-700'
                                }`}
                              >
                                {m?.avatarInitials || name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-xs font-black text-slate-900">{name}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-rose-600 italic font-medium">Chưa có người trực chính</span>
                    )}
                  </div>

                  {/* Người hỗ trợ đi cùng */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                      <span>🤝</span>
                      Thành viên phụ vào hỗ trợ cùng:
                    </div>
                    {supporters.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {supporters.map((sup) => (
                          <span
                            key={sup}
                            className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold"
                          >
                            🤝 {sup}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Không có người hỗ trợ thêm</span>
                    )}
                  </div>
                </div>

                {/* Các việc chăm sóc & Sinh hiệu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Việc đã hoàn thành */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Việc chăm sóc đã làm:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {shift.checklist.feeding && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Bơm sữa
                        </span>
                      )}
                      {shift.checklist.meds && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Uống thuốc
                        </span>
                      )}
                      {shift.checklist.hygiene && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Vệ sinh / Thay bỉm
                        </span>
                      )}
                      {shift.checklist.turning && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Lật trở chống loét
                        </span>
                      )}
                      {!shift.checklist.feeding &&
                        !shift.checklist.meds &&
                        !shift.checklist.hygiene &&
                        !shift.checklist.turning && (
                          <span className="text-xs text-slate-400 italic">Chưa đánh dấu việc hoàn thành</span>
                        )}
                    </div>
                  </div>

                  {/* Sinh hiệu */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Sinh hiệu đo được:
                    </div>
                    {hasVitals ? (
                      <div className="flex flex-wrap gap-1.5">
                        {shift.handover.vitals?.bp && (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-900 border border-rose-200 text-xs font-bold flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-500" /> HA: {shift.handover.vitals.bp}
                          </span>
                        )}
                        {shift.handover.vitals?.spo2 && (
                          <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-900 border border-sky-200 text-xs font-bold flex items-center gap-1">
                            <Wind className="w-3 h-3 text-sky-500" /> SpO2: {shift.handover.vitals.spo2}
                          </span>
                        )}
                        {shift.handover.vitals?.pulse && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                            <Activity className="w-3 h-3 text-emerald-500" /> Mạch: {shift.handover.vitals.pulse}
                          </span>
                        )}
                        {shift.handover.vitals?.temp && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1">
                            <Thermometer className="w-3 h-3 text-amber-500" /> Nhiệt: {shift.handover.vitals.temp}°C
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Chưa ghi nhận sinh hiệu</span>
                    )}
                  </div>
                </div>

                {/* Ghi chú bàn giao dặn dò */}
                {shift.handover?.note && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                          Dặn dò bàn giao bởi: {shift.handover.author || 'Người trực'}
                        </span>
                        {shift.handover.updatedAt && (
                          <span className="text-amber-700 font-normal">
                            {new Date(shift.handover.updatedAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-medium leading-relaxed italic">
                        "{shift.handover.note}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
