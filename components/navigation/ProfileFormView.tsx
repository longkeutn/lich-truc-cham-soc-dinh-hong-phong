'use client';

import React from 'react';
import { Check, Link2, Trash2 } from 'lucide-react';
import type { FamilyMember, HealthProfileType } from '@/lib/types';

const AVATAR_OPTIONS = ['👩', '👨', '👵', '👴', '🧑', '👱‍♀️', '👨‍🦳', '👩‍🦳'];

export interface ProfileFormViewProps {
  viewMode: 'add' | 'edit';
  canDelete: boolean;
  isSaving: boolean;
  members: FamilyMember[];
  linkedMemberId: string;
  name: string;
  relation: string;
  avatarEmoji: string;
  profileType: HealthProfileType;
  diagnosis: string;
  notes: string;
  highSys: string;
  highDia: string;
  lowSys: string;
  lowDia: string;
  onQuickPickMember: (member: FamilyMember) => void;
  onChangeAvatar: (emoji: string) => void;
  onChangeName: (val: string) => void;
  onChangeRelation: (val: string) => void;
  onChangeProfileType: (val: HealthProfileType) => void;
  onChangeDiagnosis: (val: string) => void;
  onChangeNotes: (val: string) => void;
  onChangeHighSys: (val: string) => void;
  onChangeHighDia: (val: string) => void;
  onChangeLowSys: (val: string) => void;
  onChangeLowDia: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  onCancel: () => void;
  onOpenMembers?: () => void;
}

/**
 * Biểu mẫu Thêm Mới / Cài Đặt Hồ Sơ Sức Khỏe Thành Viên, chuẩn cỡ chữ >= 16px và vùng chạm >= 48px.
 */
export function ProfileFormView({
  viewMode,
  canDelete,
  isSaving,
  members,
  linkedMemberId,
  name,
  relation,
  avatarEmoji,
  profileType,
  diagnosis,
  notes,
  highSys,
  highDia,
  lowSys,
  lowDia,
  onQuickPickMember,
  onChangeAvatar,
  onChangeName,
  onChangeRelation,
  onChangeProfileType,
  onChangeDiagnosis,
  onChangeNotes,
  onChangeHighSys,
  onChangeHighDia,
  onChangeLowSys,
  onChangeLowDia,
  onSubmit,
  onDelete,
  onCancel,
  onOpenMembers,
}: ProfileFormViewProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
      <div className="p-3 rounded-2xl bg-medical-surface border border-medical-border space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs sm:text-sm font-extrabold text-medical-dark flex items-center gap-1.5">
            <Link2 className="w-4 h-4 shrink-0" />
            <span>Chọn nhanh từ danh sách thành viên gia đình:</span>
          </span>
          {onOpenMembers && (
            <button
              type="button"
              onClick={onOpenMembers}
              className="min-h-[48px] min-w-[48px] px-3 py-1.5 rounded-xl bg-surface-card border border-medical-border text-xs sm:text-sm font-extrabold text-medical-dark hover:bg-teal-100/60 transition cursor-pointer"
            >
              Mở DS Thành viên
            </button>
          )}
        </div>
        {members.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const isLinked =
                (linkedMemberId && m.id === linkedMemberId) ||
                (!linkedMemberId &&
                  name.trim() !== '' &&
                  m.name.trim().toLowerCase() === name.trim().toLowerCase());
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onQuickPickMember(m)}
                  className={`min-h-[48px] min-w-[48px] px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer inline-flex items-center gap-1.5 ${
                    isLinked
                      ? 'bg-medical-primary text-white border-medical-dark'
                      : 'bg-surface-card hover:bg-teal-100/60 text-text-main border-medical-border'
                  }`}
                >
                  <span>{isLinked ? '✓' : '🔗'}</span>
                  <span>
                    {m.name} ({m.relation})
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-text-muted">
            Thành viên lưu tại đây sẽ tự động đồng bộ 2 chiều với danh sách gia đình.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-extrabold text-text-body mb-1.5">
          Biểu tượng đại diện:
        </label>
        <div className="flex flex-wrap gap-2">
          {AVATAR_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChangeAvatar(emoji)}
              className={`min-h-[48px] min-w-[48px] rounded-xl text-2xl flex items-center justify-center border-2 transition cursor-pointer ${
                avatarEmoji === emoji
                  ? 'bg-medical-surface border-medical-primary shadow-2xs scale-105'
                  : 'bg-slate-50 border-border-card hover:bg-slate-100'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-extrabold text-text-body mb-1">
            Họ tên / Tên gọi *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="VD: Đoàn Thị Bạch Yến..."
            className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-text-main bg-surface-card"
          />
        </div>
        <div>
          <label className="block text-sm font-extrabold text-text-body mb-1">
            Vai vế trong gia đình
          </label>
          <input
            type="text"
            value={relation}
            onChange={(e) => onChangeRelation(e.target.value)}
            placeholder="VD: Mẹ, Bố, Ông, Bà..."
            className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-text-main bg-surface-card"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-extrabold text-text-body mb-1">
          Chế độ giao diện và theo dõi chuyên biệt
        </label>
        <select
          value={profileType}
          onChange={(e) => onChangeProfileType(e.target.value as HealthProfileType)}
          className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-text-main bg-surface-card"
        >
          <option value="general_health">
            ❤️ Sức khỏe tổng quát - Huyết áp và Tim mạch
          </option>
          <option value="thyroid_post_op">
            🦋 Hậu phẫu Tuyến giáp (Levothyroxine, TSH, Canxi)
          </option>
          <option value="post_stroke_cranioplasty">
            🧠 Phục hồi sau đột quỵ và Theo dõi ghép sọ
          </option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-extrabold text-text-body mb-1">
          Tình trạng sức khỏe / Chẩn đoán theo dõi
        </label>
        <input
          type="text"
          value={diagnosis}
          onChange={(e) => onChangeDiagnosis(e.target.value)}
          placeholder="VD: Tăng huyết áp nhẹ, theo dõi tim mạch định kỳ..."
          className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-base text-text-main bg-surface-card"
        />
      </div>

      <div>
        <label className="block text-sm font-extrabold text-text-body mb-1">
          Ghi chú nhắc nhở chăm sóc hàng ngày
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value)}
          placeholder="VD: Đo huyết áp buổi sáng và tối, ăn giảm muối..."
          className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 text-base text-text-main bg-surface-card"
        />
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-border-card space-y-2.5">
        <div className="text-sm font-black text-text-main">
          Ngưỡng cảnh báo Huyết áp riêng (mmHg):
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <label className="block font-bold text-text-muted mb-1">
              Báo CAO khi SYS &ge;
            </label>
            <input
              type="number"
              value={highSys}
              onChange={(e) => onChangeHighSys(e.target.value)}
              className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 text-base font-black text-text-main bg-surface-card"
            />
          </div>
          <div>
            <label className="block font-bold text-text-muted mb-1">
              Báo CAO khi DIA &ge;
            </label>
            <input
              type="number"
              value={highDia}
              onChange={(e) => onChangeHighDia(e.target.value)}
              className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 text-base font-black text-text-main bg-surface-card"
            />
          </div>
          <div>
            <label className="block font-bold text-text-muted mb-1">
              Báo THẤP khi SYS &lt;
            </label>
            <input
              type="number"
              value={lowSys}
              onChange={(e) => onChangeLowSys(e.target.value)}
              className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 text-base font-black text-text-main bg-surface-card"
            />
          </div>
          <div>
            <label className="block font-bold text-text-muted mb-1">
              Báo THẤP khi DIA &lt;
            </label>
            <input
              type="number"
              value={lowDia}
              onChange={(e) => onChangeLowDia(e.target.value)}
              className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 text-base font-black text-text-main bg-surface-card"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border-card flex-wrap">
        {viewMode === 'edit' && canDelete ? (
          <button
            type="button"
            disabled={isSaving}
            onClick={onDelete}
            className="min-h-[48px] min-w-[48px] px-3.5 py-2 rounded-xl bg-vital-danger-bg hover:bg-rose-100 text-rose-800 border border-rose-300 text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>Xóa hồ sơ</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[48px] min-w-[48px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-text-body text-sm sm:text-base font-bold cursor-pointer"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-[48px] min-w-[48px] px-5 py-2 rounded-xl bg-medical-primary hover:bg-medical-dark text-white text-sm sm:text-base font-extrabold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <Check className="w-4 h-4 shrink-0" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}

export default ProfileFormView;
