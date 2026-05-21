'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Trash2, MoreVertical, Search, UserPlus,
  Loader2, AlertCircle, Check, X, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { ROLE_CONFIG, type Role } from '@/lib/role-config';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'user',           label: 'User'           },
  { value: 'super_admin',    label: 'Super Admin'    },
  { value: 'registrar',      label: 'Registrar'      },
  { value: 'processor',      label: 'Processor'      },
  { value: 'coordinator',    label: 'Coordinator'    },
  { value: 'accountant',     label: 'Accountant'     },
  { value: 'agency',         label: 'Agency'         },
  { value: 'video_uploader', label: 'Video Uploader' },
];

const roleBadge = (role: Role) => {
  const config = ROLE_CONFIG[role];
  if (!config) return 'bg-gray-100 text-gray-500 border-gray-200';
  return `${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`;
};

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole]       = useState<Role>('processor');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create user');
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Create New User</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              <AlertCircle size={15} className="shrink-0" />{error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="John Doe"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="user@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 6 characters"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
            <select value={role} onChange={e => setRole(e.target.value as Role)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white cursor-pointer">
              {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={15} className="animate-spin" />Creating…</> : <><Check size={15} />Create User</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch]     = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api('/api/users');
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      showMsg('Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-menu]')) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [fetchUsers]);

  const updateRole = async (userId: string, role: Role) => {
    try {
      const res = await api(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error();
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      showMsg('Role updated successfully');
    } catch {
      showMsg('Failed to update role', 'error');
    }
    setOpenMenuId(null);
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      const res = await api(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setUsers(prev => prev.filter(u => u.id !== userId));
      showMsg('User deleted');
    } catch {
      showMsg('Failed to delete user', 'error');
    }
    setOpenMenuId(null);
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50"><ShieldCheck size={22} className="text-amber-600" /></div>
            User Management
          </h1>
          <p className="text-gray-500 mt-1 ml-12">Manage all registered users and their roles</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchUsers} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
          >
            <UserPlus size={16} /> Create User
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-widest font-bold text-gray-400">
                <th className="px-3 xl:px-6 py-3.5">User</th>
                <th className="px-3 xl:px-6 py-3.5">Email</th>
                <th className="px-3 xl:px-6 py-3.5">Role</th>
                <th className="px-3 xl:px-6 py-3.5 hidden lg:table-cell">Verified</th>
                <th className="px-3 xl:px-6 py-3.5 hidden xl:table-cell">Joined</th>
                <th className="px-3 xl:px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="py-16 text-center">
                  <Loader2 size={28} className="mx-auto text-indigo-500 animate-spin" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-gray-400 text-sm">No users found.</td></tr>
              ) : filtered.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                  {/* Avatar + Name */}
                  <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2 xl:gap-3">
                      <div className="w-8 h-8 xl:w-9 xl:h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <span className="text-indigo-700 font-bold text-xs xl:text-sm">{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-semibold text-gray-900 text-xs xl:text-sm">{user.name}</span>
                    </div>
                  </td>

                  <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap text-xs xl:text-sm text-gray-500">{user.email}</td>

                  {/* Role badge */}
                  <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap">
                    <span className={cn('inline-flex items-center px-2 py-0.5 xl:px-2.5 rounded-full text-[10px] xl:text-xs font-semibold border', roleBadge(user.role))}>
                      {ROLE_OPTIONS.find(r => r.value === user.role)?.label ?? user.role}
                    </span>
                  </td>

                  <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap hidden lg:table-cell">
                    {user.emailVerified
                      ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium"><Check size={13} />Verified</span>
                      : <span className="text-gray-400 text-xs">Unverified</span>}
                  </td>

                  <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap text-xs xl:text-sm text-gray-400 hidden xl:table-cell">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="px-3 xl:px-6 py-3.5 whitespace-nowrap text-right">
                    <div className="relative inline-block" data-menu>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                          <p className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold text-gray-400">Change Role</p>
                          {ROLE_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => updateRole(user.id, opt.value)}
                              className={cn(
                                'w-full flex items-center justify-between px-4 py-2 text-sm transition-colors text-left',
                                user.role === opt.value
                                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                  : 'text-gray-700 hover:bg-gray-50'
                              )}
                            >
                              {opt.label}
                              {user.role === opt.value && <Check size={13} />}
                            </button>
                          ))}
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                          >
                            <Trash2 size={15} /> Delete User
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        <div className="px-6 py-3 border-t border-gray-50 text-xs text-gray-400">
          {filtered.length} user{filtered.length !== 1 ? 's' : ''} total
        </div>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchUsers}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60]">
          <div className={cn(
            'flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium',
            toast.type === 'success' ? 'bg-gray-900' : 'bg-red-600'
          )}>
            {toast.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
