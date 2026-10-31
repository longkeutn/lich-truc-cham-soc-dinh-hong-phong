'use client';

import React, { useState, useMemo } from 'react';
import {
  HealthProfile,
  HealthProfileType,
  VitalsLogEntry,
  FamilyMember,
  BpThresholds,
} from '@/lib/types';
import {
  DEFAULT_HEALTH_PROFILE_ID,
  DEFAULT_BP_THRESHOLDS,
  DEFAULT_APPOINTMENT,
  extractRecordProfileId,
  compareVitalsDesc,
  evaluateVitalReading,
} from '@/lib/config';
import {
  Users,
  Plus,
  Settings2,
  HeartPulse,
  Check,
  X,
  Trash2,
} from 'lucide-react';

interface HealthProfileSwitcherProps {
  profiles: HealthProfile[];
  activeProfileId: string;
  onSelectProfile: (profileId: string) => void;
  allVitalsLog: VitalsLogEntry[];
  todayStr: string;
  members?: FamilyMember[];
  onSaveProfile: (profile: HealthProfile) => Promise<void>;
  onDeleteProfile?: (profileId: string) => Promise<void>;
}

const AVATAR_OPTIONS = ['👩', '👨', '👵', '👴', '🧑', '👱‍♀️', '👨‍🦳', '👩‍🦳'];

export default function HealthProfileSwitcher({
  profiles,
  activeProfileId,
  onSelectProfile,
  allVitalsLog,
  todayStr,
  members = [],
  onSaveProfile,
  onDeleteProfile,
}: HealthProfileSwitcherProps) {
  const [modalMode, setModalMode] = useState<'closed' | 'add' | 'edit'>('closed');
  const [editingProfileId, setEditingProfileId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [relation, setRelation] = useState<string>('');
  const [avatarEmoji, setAvatarEmoji] = useState<string>('👩');
  const [profileType, setProfileType] = useState<HealthProfileType>('general_health');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [hospital, setHospital] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [highSys, setHighSys] = useState<string>('140');
  const [highDia, setHighDia] = useState<string>('90');
  const [lowSys, setLowSys] = useState<string>('100');
  const [lowDia, setLowDia] = useState<string>('60');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Tính chỉ số huyết áp mới nhất của từng hồ sơ để hiển thị ngay trên nút chuyển
  const latestVitalByProfile = useMemo(() => {
    const map = new Map<string, { latest: VitalsLogEntry | null; todayCount: number }>();
    for (const p of profiles) {
      map.set(p.id, { latest: null, todayCount: 0 });
    }
    const sortedDesc = [...allVitalsLog].sort(compareVitalsDesc);
    for (const v of sortedDesc) {
      const pid = extractRecordProfileId(v.id);
      const item = map.get(pid);
      if (item) {
        if (!item.latest) item.latest = v;
        if (v.date === todayStr) item.todayCount += 1;
      }
    }
    return map;
  }, [profiles, allVitalsLog, todayStr]);

  const openAddModal = () => {
    setModalMode('add');
    setEditingProfileId('');
    setName('');
    setRelation('Thành viên gia đình');
    setAvatarEmoji('🧑');
    setProfileType('general_health');
    setDiagnosis('Theo dõi huyết áp, nhịp tim & sức khỏe định kỳ');
    setHospital('Khám định kỳ');
    setNotes('Đo huyết áp sáng/tối, uống đủ nước ấm, nghỉ ngơi hợp lý.');
    setHighSys('140');
    setHighDia('90');
    setLowSys('100');
    setLowDia('60');
  };

  const openEditModal = (profile: HealthProfile) => {
    setModalMode('edit');
    setEditingProfileId(profile.id);
    setName(profile.name);
    setRelation(profile.relation);
    setAvatarEmoji(profile.avatarEmoji || '👩');
    setProfileType(profile.profileType || 'general_health');
    setDiagnosis(profile.patientInfo?.diagnosis || '');
    setHospital(profile.patientInfo?.hospital || '');
    setNotes(profile.patientInfo?.notes || '');
    setHighSys(String(profile.bpThresholds?.highSys || 140));
    setHighDia(String(profile.bpThresholds?.highDia || 90));
    setLowSys(String(profile.bpThresholds?.lowSys || 100));
    setLowDia(String(profile.bpThresholds?.lowDia || 60));
  };

  const handleQuickPickMember = (m: FamilyMember) => {
    setName(m.name);
    setRelation(m.relation || 'Thành viên');
    const lower = `${m.name} ${m.relation}`.toLowerCase();
    if (lower.includes('mẹ') || lower.includes('bà')) setAvatarEmoji('👵');
    else if (lower.includes('chị') || lower.includes('cô') || lower.includes('em gái')) setAvatarEmoji('👩');
    else if (lower.includes('bác') || lower.includes('ông')) setAvatarEmoji('👴');
    else setAvatarEmoji('👨');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    const existing = profiles.find((p) => p.id === editingProfileId);
    const id =
      modalMode === 'edit' && editingProfileId
        ? editingProfileId
        : `member_${Date.now().toString(36)}`;

    const nextThresholds: BpThresholds = {
      highSys: Math.max(100, Math.min(220, parseInt(highSys, 10) || 140)),
      highDia: Math.max(60, Math.min(140, parseInt(highDia, 10) || 90)),
      lowSys: Math.max(70, Math.min(130, parseInt(lowSys, 10) || 100)),
      lowDia: Math.max(40, Math.min(90, parseInt(lowDia, 10) || 60)),
    };

    const nextProfile: HealthProfile = {
      id,
      name: name.trim(),
      relation: relation.trim() || 'Gia đình',
      avatarEmoji: avatarEmoji || '🧑',
      profileType: profileType || existing?.profileType || 'general_health',
      patientInfo: {
        ...(existing?.patientInfo || {
          statusBadge: 'Theo dõi sức khỏe gia đình',
          conditionTag: 'Huyết áp & Tim mạch',
          headerBadge: 'Tại nhà',
          careMode: 'Hằng ngày',
          careGoal: 'Duy trì huyết áp & nhịp tim ổn định',
          customFields: [],
        }),
        name: name.trim(),
        diagnosis:
          diagnosis.trim() || 'Theo dõi huyết áp, nhịp tim & chăm sóc sức khỏe hằng ngày',
        hospital: hospital.trim() || 'Khám định kỳ',
        room: existing?.patientInfo?.room || 'Tại nhà',
        notes:
          notes.trim() ||
          'Đo huyết áp định kỳ sáng/tối, uống đủ nước ấm, nghỉ ngơi hợp lý.',
      },
      bpThresholds: nextThresholds,
      appointment: existing?.appointment || { ...DEFAULT_APPOINTMENT },
    };

    setIsSaving(true);
    try {
      await onSaveProfile(nextProfile);
      onSelectProfile(nextProfile.id);
      setModalMode('closed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !editingProfileId ||
      editingProfileId === DEFAULT_HEALTH_PROFILE_ID ||
      !onDeleteProfile
    ) {
      return;
    }
    const confirmed = window.confirm(
      `Bạn có chắc muốn ẩn/xóa hồ sơ sức khỏe của "${name}" khỏi thanh chọn nhanh?`
    );
    if (!confirmed) return;
    setIsSaving(true);
    try {
      await onDeleteProfile(editingProfileId);
      setModalMode('closed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-teal-200/90 shadow-2xs p-2.5 sm:p-3">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs sm:text-sm font-black text-slate-800">
            Sổ Sức Khỏe Gia Đình — Chọn người cần xem / ghi chỉ số:
          </span>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-extrabold flex items-center gap-1 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm thành viên</span>
        </button>
      </div>

      {/* Danh sách thẻ Hồ sơ sức khỏe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfileId;
          const summary = latestVitalByProfile.get(profile.id);
          const latest = summary?.latest || null;
          const todayCount = summary?.todayCount || 0;
          const evalItem = latest
            ? evaluateVitalReading(latest, profile.bpThresholds || DEFAULT_BP_THRESHOLDS)
            : null;

          return (
            <div
              key={profile.id}
              onClick={() => onSelectProfile(profile.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectProfile(profile.id);
                }
              }}
              className={`rounded-2xl p-2.5 sm:p-3 border-2 transition-all cursor-pointer flex items-center justify-between gap-2 ${
                isActive
                  ? 'bg-teal-900 text-white border-teal-950 shadow-sm'
                  : 'bg-slate-50/80 hover:bg-teal-50/50 text-slate-900 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    isActive
                      ? 'bg-white/15 border border-white/20'
                      : 'bg-white border border-slate-200 shadow-2xs'
                  }`}
                >
                  {profile.avatarEmoji || '🧑'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-teal-100 text-teal-900'
                      }`}
                    >
                      {profile.relation}
                    </span>
                    <span className="text-sm sm:text-base font-black truncate">
                      {profile.name}
                    </span>
                  </div>

                  <div
                    className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1.5 flex-wrap ${
                      isActive ? 'text-teal-100' : 'text-slate-600'
                    }`}
                  >
                    {latest ? (
                      <>
                        <span className="inline-flex items-center gap-0.5 font-extrabold">
                          <HeartPulse className="w-3 h-3 inline shrink-0" />
                          {latest.sys}/{latest.dia}
                          {latest.pulse ? ` • ${latest.pulse} l/p` : ''}
                        </span>
                        <span>•</span>
                        <span>
                          {todayCount > 0
                            ? `Hôm nay (${todayCount} lần)`
                            : `Lần cuối ${latest.date.split('-').slice(1).reverse().join('/')}`}
                        </span>
                      </>
                    ) : (
                      <span>Chưa có số đo — Bấm chọn để ghi</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {evalItem && !isActive && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border hidden sm:inline-block ${evalItem.bp.badgeClass}`}
                  >
                    {evalItem.bp.shortLabel}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(profile);
                  }}
                  title={`Cài đặt hồ sơ & ngưỡng huyết áp của ${profile.name}`}
                  className={`p-1.5 rounded-xl border transition cursor-pointer ${
                    isActive
                      ? 'bg-white/15 hover:bg-white/25 text-white border-white/20'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Thêm / Sửa Hồ Sơ Sức Khỏe Thành Viên */}
      {modalMode !== 'closed' && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setModalMode('closed')}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-2 border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-5 py-3.5 bg-teal-900 text-white flex items-center justify-between gap-2 shrink-0">
              <div>
                <h3 className="text-base font-black">
                  {modalMode === 'add'
                    ? '➕ Thêm Hồ Sơ Sức Khỏe Thành Viên'
                    : `⚙️ Cài Đặt Hồ Sơ Sức Khỏe: ${name}`}
                </h3>
                <p className="text-xs text-teal-100">
                  Mỗi thành viên có sổ đo huyết áp, đơn thuốc, lịch khám và ngưỡng cảnh báo riêng
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode('closed')}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Gợi ý chọn nhanh từ danh sách thành viên gia đình */}
              {modalMode === 'add' && members.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-600">
                    ⚡ Chọn nhanh từ thành viên gia đình:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {members
                      .filter(
                        (m) =>
                          !profiles.some(
                            (p) => p.name.toLowerCase() === m.name.toLowerCase()
                          )
                      )
                      .map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleQuickPickMember(m)}
                          className="px-2.5 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold cursor-pointer"
                        >
                          + {m.name} ({m.relation})
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Biểu tượng đại diện */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Biểu tượng đại diện:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarEmoji(emoji)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition cursor-pointer ${
                        avatarEmoji === emoji
                          ? 'bg-teal-50 border-teal-700 shadow-2xs scale-105'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Họ tên / Tên gọi *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Mẹ Nguyễn Thị..."
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Vai vế trong gia đình
                  </label>
                  <input
                    type="text"
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    placeholder="VD: Mẹ, Bác, Anh, Bản thân..."
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Nhóm chế độ theo dõi chuyên biệt (Gợi ý triệu chứng, thuốc & xét nghiệm)
                </label>
                <select
                  value={profileType}
                  onChange={(e) => setProfileType(e.target.value as HealthProfileType)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:border-teal-600"
                >
                  <option value="general_health">
                    ❤️ Sức khỏe tổng quát — Huyết áp, Tim mạch & Mỡ máu
                  </option>
                  <option value="thyroid_post_op">
                    🦋 Chuyên biệt Tuyến giáp (Hormone Levothyroxine, Canxi, Mỡ máu & Tim mạch)
                  </option>
                  <option value="post_stroke_cranioplasty">
                    🧠 Phục hồi sau tai biến & Theo dõi vùng khuyết sọ
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Tình trạng sức khỏe / Bệnh lý nền đang theo dõi
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="VD: Tăng huyết áp nhẹ, theo dõi tim mạch định kỳ..."
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  Ghi chú nhắc nhở chăm sóc
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="VD: Đo huyết áp buổi sáng và tối, hạn chế ăn mặn..."
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Cài đặt Ngưỡng cảnh báo huyết áp riêng cho thành viên này */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="text-xs font-black text-slate-800">
                  🎯 Ngưỡng cảnh báo Huyết áp áp dụng cho {name || 'thành viên này'} (mmHg):
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Báo CAO khi Số trên &ge;
                    </label>
                    <input
                      type="number"
                      value={highSys}
                      onChange={(e) => setHighSys(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Báo CAO khi Số dưới &ge;
                    </label>
                    <input
                      type="number"
                      value={highDia}
                      onChange={(e) => setHighDia(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Báo THẤP khi Số trên &lt;
                    </label>
                    <input
                      type="number"
                      value={lowSys}
                      onChange={(e) => setLowSys(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">
                      Báo THẤP khi Số dưới &lt;
                    </label>
                    <input
                      type="number"
                      value={lowDia}
                      onChange={(e) => setLowDia(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-black text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {modalMode === 'edit' &&
                editingProfileId !== DEFAULT_HEALTH_PROFILE_ID &&
                editingProfileId !== 'mother' &&
                onDeleteProfile ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa hồ sơ</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode('closed')}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
