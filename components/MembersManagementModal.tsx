'use client';

import React, { useState } from 'react';
import { FamilyMember, HealthProfile } from '@/lib/types';
import { saveMemberAction, deleteMemberAction } from '@/lib/actions';
import {
  MEMBER_COLOR_THEMES,
  MemberEditorForm,
  getMemberInitials,
} from './modals/memberThemesAndForm';

interface MembersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onMembersUpdated: (members: FamilyMember[]) => void;
  healthProfiles?: HealthProfile[];
  onToggleMemberHealthProfile?: (member: FamilyMember, shouldHaveProfile: boolean) => void;
}

export function MembersManagementModal({
  isOpen,
  onClose,
  members,
  onMembersUpdated,
  healthProfiles = [],
  onToggleMemberHealthProfile,
}: MembersManagementModalProps) {
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [isSupporter, setIsSupporter] = useState(false);
  const [hasHealthProfile, setHasHealthProfile] = useState(false);

  const [isSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const findLinkedHealthProfile = (m: FamilyMember): HealthProfile | undefined => {
    return healthProfiles.find(
      (p) =>
        (p.linkedMemberId && p.linkedMemberId === m.id) ||
        p.name.trim().toLowerCase() === m.name.trim().toLowerCase()
    );
  };

  const startAddNew = () => {
    setIsAddingNew(true);
    setEditingMember(null);
    setName('');
    setRelation('');
    setPhone('');
    setIsSupporter(false);
    setHasHealthProfile(false);
    setSelectedThemeIndex(members.length % MEMBER_COLOR_THEMES.length);
    setErrorMsg('');
  };

  const startEdit = (m: FamilyMember) => {
    const linkedProfile = findLinkedHealthProfile(m);
    setIsAddingNew(false);
    setEditingMember(m);
    setName(m.name);
    setRelation(m.relation);
    setPhone(m.phone);
    setIsSupporter(Boolean(m.isSupporter));
    setHasHealthProfile(Boolean(linkedProfile));
    const themeIdx = MEMBER_COLOR_THEMES.findIndex((t) => t.badgeColor === m.badgeColor);
    setSelectedThemeIndex(themeIdx >= 0 ? themeIdx : 0);
    setErrorMsg('');
  };

  const cancelForm = () => {
    setIsAddingNew(false);
    setEditingMember(null);
    setIsSupporter(false);
    setHasHealthProfile(false);
    setErrorMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập họ tên thành viên');
      return;
    }

    const theme = MEMBER_COLOR_THEMES[selectedThemeIndex];
    const memberId = editingMember ? editingMember.id : `mem-${Date.now()}`;
    const initials = getMemberInitials(name);

    const memberToSave: FamilyMember = {
      id: memberId,
      name: name.trim(),
      relation: relation.trim() || 'Thành viên gia đình',
      phone: phone.trim() || 'Chưa cập nhật',
      badgeColor: theme.badgeColor,
      avatarInitials: initials,
      bgLight: theme.bgLight,
      borderLight: theme.borderLight,
      textColor: theme.textColor,
      accentColor: theme.accentColor,
      pillBadge: theme.pillBadge,
      isSupporter: isSupporter,
    };

    const exists = members.some((m) => m.id === memberToSave.id);
    const updatedList = exists
      ? members.map((m) => (m.id === memberToSave.id ? memberToSave : m))
      : [...members, memberToSave];

    onMembersUpdated(updatedList);
    if (onToggleMemberHealthProfile) {
      onToggleMemberHealthProfile(memberToSave, hasHealthProfile);
    }
    cancelForm();

    void saveMemberAction(memberToSave).catch((err) => {
      console.error('Lỗi lưu thành viên lên Sheet:', err);
    });
  };

  const handleDelete = async (memberId: string) => {
    const targetMember = members.find((m) => m.id === memberId);
    const updatedList = members.filter((m) => m.id !== memberId);
    onMembersUpdated(updatedList);
    if (targetMember && onToggleMemberHealthProfile && healthProfiles.length > 1) {
      const linked = findLinkedHealthProfile(targetMember);
      if (linked) {
        onToggleMemberHealthProfile(targetMember, false);
      }
    }
    setConfirmDeleteId(null);
    if (editingMember?.id === memberId) {
      cancelForm();
    }

    void deleteMemberAction(memberId).catch((err) => {
      console.error('Lỗi xoá thành viên trên Sheet:', err);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl backdrop-blur-sm">
              👥
            </span>
            <div>
              <h3 className="text-lg font-bold">Quản Lý Thành Viên Gia Đình</h3>
              <p className="text-xs text-emerald-100">
                Liên kết đồng bộ với Sổ Sức Khỏe Gia Đình, người đo chỉ số &amp; lịch chăm sóc
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {(isAddingNew || editingMember) && (
            <MemberEditorForm
              isAddingNew={isAddingNew}
              editingName={editingMember?.name}
              name={name}
              onChangeName={setName}
              relation={relation}
              onChangeRelation={setRelation}
              phone={phone}
              onChangePhone={setPhone}
              selectedThemeIndex={selectedThemeIndex}
              onSelectThemeIndex={setSelectedThemeIndex}
              isSupporter={isSupporter}
              onChangeIsSupporter={setIsSupporter}
              hasHealthProfile={hasHealthProfile}
              onChangeHasHealthProfile={setHasHealthProfile}
              showHealthProfileToggle={Boolean(onToggleMemberHealthProfile)}
              isSaving={isSaving}
              onCancel={cancelForm}
              onSubmit={handleSave}
            />
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Danh sách ({members.length} người)
              </span>
              {!isAddingNew && !editingMember && (
                <button
                  type="button"
                  onClick={startAddNew}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1.5 min-h-[44px]"
                >
                  ➕ Thêm người mới
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {members.map((m) => {
                const isConfirming = confirmDeleteId === m.id;
                const linkedProfile = findLinkedHealthProfile(m);
                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-2.5 hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl ${m.badgeColor || 'bg-blue-600'} text-white font-bold text-xs flex items-center justify-center shadow-sm flex-shrink-0`}
                        >
                          {m.avatarInitials || getMemberInitials(m.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                              {m.name}
                            </h5>
                            {m.isSupporter && (
                              <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800">
                                🤝 Phụ giúp
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {m.relation}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-500">
                            {m.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isConfirming ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(m.id)}
                              disabled={isSaving}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-500 transition cursor-pointer min-h-[40px]"
                            >
                              Xoá!
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer min-h-[40px]"
                            >
                              Huỷ
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(m)}
                              className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition cursor-pointer"
                              title="Sửa thông tin"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(m.id)}
                              className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-500 flex items-center justify-center text-xs transition cursor-pointer"
                              title="Xoá thành viên"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {onToggleMemberHealthProfile && (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-2">
                        {linkedProfile ? (
                          <>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-100/90 text-teal-900 border border-teal-200 text-[11px] font-bold">
                              🩺 Đang có Sổ Sức Khỏe ({linkedProfile.relation})
                            </span>
                            {healthProfiles.length > 1 && (
                              <button
                                type="button"
                                onClick={() => onToggleMemberHealthProfile(m, false)}
                                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                                title="Ẩn/xóa thẻ của thành viên này khỏi thanh Sổ Sức Khỏe Gia Đình"
                              >
                                Gỡ khỏi Sổ SK
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onToggleMemberHealthProfile(m, true)}
                            className="w-full py-1.5 px-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-extrabold flex items-center justify-center gap-1 transition cursor-pointer min-h-[40px]"
                          >
                            <span>➕ Đưa vào thanh Sổ Sức Khỏe Gia Đình</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
          <span>Liên kết trực tiếp với Sổ Sức Khỏe Gia Đình &amp; danh sách người ghi chỉ số.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold text-xs transition cursor-pointer min-h-[44px]"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
