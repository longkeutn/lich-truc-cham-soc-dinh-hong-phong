'use client';

import React, { useState } from 'react';
import { FamilyMember } from '@/lib/types';
import { saveMemberAction, deleteMemberAction } from '@/lib/actions';

interface MembersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: FamilyMember[];
  onMembersUpdated: (members: FamilyMember[]) => void;
}

const COLOR_THEMES = [
  {
    id: 'blue',
    label: 'Xanh lam',
    badgeColor: 'bg-blue-600',
    bgLight: 'bg-blue-50/90',
    borderLight: 'border-blue-300',
    textColor: 'text-blue-900',
    accentColor: 'bg-blue-600 text-white',
    pillBadge: 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
    previewBg: 'bg-blue-600',
  },
  {
    id: 'emerald',
    label: 'Xanh ngọc',
    badgeColor: 'bg-emerald-600',
    bgLight: 'bg-emerald-50/90',
    borderLight: 'border-emerald-300',
    textColor: 'text-emerald-900',
    accentColor: 'bg-emerald-600 text-white',
    pillBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    previewBg: 'bg-emerald-600',
  },
  {
    id: 'indigo',
    label: 'Chàm tím',
    badgeColor: 'bg-indigo-600',
    bgLight: 'bg-indigo-50/90',
    borderLight: 'border-indigo-300',
    textColor: 'text-indigo-900',
    accentColor: 'bg-indigo-600 text-white',
    pillBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
    previewBg: 'bg-indigo-600',
  },
  {
    id: 'rose',
    label: 'Đỏ hồng',
    badgeColor: 'bg-rose-600',
    bgLight: 'bg-rose-50/90',
    borderLight: 'border-rose-300',
    textColor: 'text-rose-900',
    accentColor: 'bg-rose-600 text-white',
    pillBadge: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    previewBg: 'bg-rose-600',
  },
  {
    id: 'amber',
    label: 'Cam hổ phách',
    badgeColor: 'bg-amber-600',
    bgLight: 'bg-amber-50/90',
    borderLight: 'border-amber-300',
    textColor: 'text-amber-900',
    accentColor: 'bg-amber-600 text-white',
    pillBadge: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
    previewBg: 'bg-amber-600',
  },
  {
    id: 'purple',
    label: 'Tím hoa cà',
    badgeColor: 'bg-purple-600',
    bgLight: 'bg-purple-50/90',
    borderLight: 'border-purple-300',
    textColor: 'text-purple-900',
    accentColor: 'bg-purple-600 text-white',
    pillBadge: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
    previewBg: 'bg-purple-600',
  },
  {
    id: 'teal',
    label: 'Xanh lơ',
    badgeColor: 'bg-teal-600',
    bgLight: 'bg-teal-50/90',
    borderLight: 'border-teal-300',
    textColor: 'text-teal-900',
    accentColor: 'bg-teal-600 text-white',
    pillBadge: 'bg-teal-100 text-teal-800 border-teal-300 font-bold',
    previewBg: 'bg-teal-600',
  },
  {
    id: 'cyan',
    label: 'Xanh da trời',
    badgeColor: 'bg-cyan-600',
    bgLight: 'bg-cyan-50/90',
    borderLight: 'border-cyan-300',
    textColor: 'text-cyan-900',
    accentColor: 'bg-cyan-600 text-white',
    pillBadge: 'bg-cyan-100 text-cyan-800 border-cyan-300 font-bold',
    previewBg: 'bg-cyan-600',
  },
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function MembersManagementModal({
  isOpen,
  onClose,
  members,
  onMembersUpdated,
}: MembersManagementModalProps) {
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [isSupporter, setIsSupporter] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const startAddNew = () => {
    setIsAddingNew(true);
    setEditingMember(null);
    setName('');
    setRelation('');
    setPhone('');
    setIsSupporter(false);
    setSelectedThemeIndex((members.length) % COLOR_THEMES.length);
    setErrorMsg('');
  };

  const startEdit = (m: FamilyMember) => {
    setIsAddingNew(false);
    setEditingMember(m);
    setName(m.name);
    setRelation(m.relation);
    setPhone(m.phone);
    setIsSupporter(Boolean(m.isSupporter));
    const themeIdx = COLOR_THEMES.findIndex((t) => t.badgeColor === m.badgeColor);
    setSelectedThemeIndex(themeIdx >= 0 ? themeIdx : 0);
    setErrorMsg('');
  };

  const cancelForm = () => {
    setIsAddingNew(false);
    setEditingMember(null);
    setIsSupporter(false);
    setErrorMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập họ tên thành viên');
      return;
    }

    const theme = COLOR_THEMES[selectedThemeIndex];
    const memberId = editingMember ? editingMember.id : `mem-${Date.now()}`;
    const initials = getInitials(name);

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

    setIsSaving(true);
    setErrorMsg('');
    try {
      const res = await saveMemberAction(memberToSave);
      if (res.success) {
        onMembersUpdated(res.members);
        cancelForm();
      } else {
        setErrorMsg('Không thể lưu thành viên. Vui lòng thử lại.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi lưu thành viên.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (memberId: string) => {
    setIsSaving(true);
    setErrorMsg('');
    try {
      const res = await deleteMemberAction(memberId);
      if (res.success) {
        onMembersUpdated(res.members);
        setConfirmDeleteId(null);
        if (editingMember?.id === memberId) {
          cancelForm();
        }
      } else {
        setErrorMsg('Không thể xoá thành viên.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi xoá thành viên.');
    } finally {
      setIsSaving(false);
    }
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
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl backdrop-blur-sm">
              👥
            </span>
            <div>
              <h3 className="text-lg font-bold">Quản Lý Thành Viên Trực Ca</h3>
              <p className="text-xs text-emerald-100">
                Thêm, sửa hoặc xoá người trong ban chăm sóc (Yêu cầu quyền Admin)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Form when adding or editing */}
          {(isAddingNew || editingMember) && (
            <form
              onSubmit={handleSave}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {isAddingNew ? '➕ Thêm thành viên mới' : `✏️ Sửa: ${editingMember?.name}`}
                </h4>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold"
                >
                  Huỷ
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên hiển thị <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Cháu Quân, Bác Thành..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mối quan hệ / Vai trò
                  </label>
                  <input
                    type="text"
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    placeholder="VD: Con trai thứ, Cháu ruột..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Số điện thoại liên hệ
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0912 345 678"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Phân loại thành viên chính vs thành viên phụ hỗ trợ */}
              <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Vai trò trong lịch trực gia đình
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSupporter(false)}
                    className={`p-2.5 rounded-xl border-2 text-left flex items-start gap-2 transition cursor-pointer ${
                      !isSupporter
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 font-bold'
                        : 'border-slate-200 bg-white dark:bg-slate-900/40 text-slate-600'
                    }`}
                  >
                    <span className="text-sm mt-0.5">🛡️</span>
                    <div>
                      <div className="text-xs font-bold">Thành viên chính</div>
                      <div className="text-[10px] text-slate-500 font-normal">Trực chính, chịu trách nhiệm ca</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSupporter(true)}
                    className={`p-2.5 rounded-xl border-2 text-left flex items-start gap-2 transition cursor-pointer ${
                      isSupporter
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-white dark:bg-slate-900/40 text-slate-600'
                    }`}
                  >
                    <span className="text-sm mt-0.5">🤝</span>
                    <div>
                      <div className="text-xs font-bold">Thành viên phụ (Hỗ trợ)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Vào hỗ trợ khi rảnh, không bắt buộc</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Theme color picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Màu sắc thẻ & Huy hiệu nhận diện
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_THEMES.map((theme, idx) => {
                    const isSelected = selectedThemeIndex === idx;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedThemeIndex(idx)}
                        className={`w-8 h-8 rounded-full ${theme.previewBg} flex items-center justify-center text-white text-xs font-bold transition transform active:scale-90 ${
                          isSelected
                            ? 'ring-4 ring-emerald-400 ring-offset-2 scale-110 shadow-md'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                        title={theme.label}
                      >
                        {isSelected ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={cancelForm}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isSaving ? 'Đang lưu...' : '💾 Lưu thành viên'}
                </button>
              </div>
            </form>
          )}

          {/* Members list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Danh sách ({members.length} người)
              </span>
              {!isAddingNew && !editingMember && (
                <button
                  type="button"
                  onClick={startAddNew}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1.5"
                >
                  ➕ Thêm người mới
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {members.map((m) => {
                const isConfirming = confirmDeleteId === m.id;
                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl ${m.badgeColor || 'bg-blue-600'} text-white font-bold text-xs flex items-center justify-center shadow-sm flex-shrink-0`}
                      >
                        {m.avatarInitials || getInitials(m.name)}
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
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {m.relation}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
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
                            className="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-500 transition"
                          >
                            Xoá!
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg text-[11px] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                          >
                            Huỷ
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(m)}
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition"
                            title="Sửa thông tin"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(m.id)}
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-400 flex items-center justify-center text-xs transition"
                            title="Xoá thành viên"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>Dữ liệu thành viên dùng để chọn phân công ca trực.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold text-xs transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
