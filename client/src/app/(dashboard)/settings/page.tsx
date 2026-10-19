'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Globe, 
  Lock,
  Save,
  CheckCircle2,
  DollarSign,
  BarChart3,
  ShieldCheck,
  CheckSquare,
  Square,
  RotateCcw,
  Search,
  AlertCircle,
  Info,
  Check,
  SlidersHorizontal,
  ClipboardList,
  Users as UsersIcon,
  Video,
  ShieldAlert
} from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useSession, authClient } from '@/lib/auth-client';
import { 
  ALL_ROLES, 
  SYSTEM_PAGES, 
  DEFAULT_ROLE_PERMISSIONS, 
  ROLE_CONFIG, 
  type Role 
} from '@/lib/role-config';
import { useRolePermissionsQuery, useInvalidateQueries } from '@/hooks/useQueryHooks';

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: 'Full system administrator with permanent, unrestricted access to all modules, settings, and user management.',
  genaral: 'General operations staff with broad access across registrations, candidate directories, CVs, and passport management.',
  registrar: 'Front-desk intake staff handling candidate entry, records, deployments, and broker listings.',
  processor: 'Data processing staff responsible for candidate verification, full registrations, CV generation, and deployments.',
  coordinator: 'Candidate coordination team managing interviews, fit verification, visa selection, and deployments.',
  accountant: 'Financial team managing candidate invoices, billing statements, payments, and deployment accounting.',
  video_uploader: 'Media staff dedicated to recording and uploading candidate interview videos.',
  agency: 'External agency client account with access to browse available candidates and view contracts.',
  calling: 'Call center and outreach staff performing candidate phone verifications and quick registrations.',
  user: 'Standard candidate or basic external account with limited dashboard privileges.',
};

const CATEGORY_ICONS: Record<string, any> = {
  'Overview': SlidersHorizontal,
  'Registrations & Passports': ClipboardList,
  'Candidates & CVs': UsersIcon,
  'Agency & Deployments': Globe,
  'Media': Video,
  'Administration': ShieldCheck,
};

// Helper component for Toggle Switch
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (!disabled && onChange) onChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        checked ? "bg-primary" : "bg-gray-200",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const [activeTab, setActiveTab] = useState<'profile' | 'agency' | 'roles' | 'notifications' | 'preferences' | 'analytics'>('profile');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // User Analytics states
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [sortBy, setSortBy] = useState<'candidates' | 'quick' | 'name'>('candidates');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Fetch analytics data when analytics tab is active
  useEffect(() => {
    if (activeTab === 'analytics') {
      const fetchAnalytics = async () => {
        setLoadingAnalytics(true);
        try {
          const res = await api('/api/users/analytics');
          const data = await res.json();
          if (Array.isArray(data)) {
            setAnalyticsData(data);
          }
        } catch (err) {
          console.error('Failed to fetch analytics', err);
          showToast('Failed to load user analytics', 'error');
        } finally {
          setLoadingAnalytics(false);
        }
      };
      fetchAnalytics();
    }
  }, [activeTab]);

  const filteredAndSortedAnalytics = analyticsData
    .filter(user => 
      (user.name || '').toLowerCase().includes(analyticsSearch.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(analyticsSearch.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'candidates') {
        comparison = a.candidatesRegistered - b.candidatesRegistered;
      } else if (sortBy === 'quick') {
        comparison = a.quickRegistrations - b.quickRegistrations;
      } else if (sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  // Form states
  const [profile, setProfile] = useState({ name: '', email: '', role: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [notifications, setNotifications] = useState({ cvDeadlines: true, newRegistrations: true, systemUpdates: false });
  const [preferences, setPreferences] = useState({ language: 'en', timezone: 'Asia/Riyadh', dateFormat: 'YYYY-MM-DD' });

  const templates = [
    { id: 'alm', name: 'ALM Template' },
    { id: 'alshablan', name: 'Al Shablan Template' },
    { id: 'ka7', name: 'KA-7 Template' },
    { id: 'ku2', name: 'KU-2 Template' },
    { id: 'ma', name: 'MA Template' },
    { id: 'ra', name: 'RA Template' },
    { id: 'ussus', name: 'Ussus Template' },
    { id: 'vision', name: 'Vision Template' }
  ];
  const [agencyPrices, setAgencyPrices] = useState<Record<string, string>>({});

  // Fetch prices on mount
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await api('/api/settings/prices');
        const data = await res.json();
        const priceMap: Record<string, string> = {};
        if (Array.isArray(data)) {
          data.forEach((row: any) => {
            priceMap[row.templateId] = row.price;
          });
        }
        setAgencyPrices(priceMap);
      } catch (err) {
        console.error('Failed to fetch prices', err);
      }
    };
    fetchPrices();
  }, []);

  // Load profile from session
  useEffect(() => {
    if (session?.user) {
      setProfile({
        name: session.user.name || '',
        email: session.user.email || '',
        role: (session.user as any).role || 'user'
      });
    }
  }, [session]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await api('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      showToast('Profile updated successfully');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      showToast('Please fill all password fields', 'error');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.new,
        revokeOtherSessions: true,
      });

      if (error) throw new Error(error.message || 'Failed to update password');
      
      showToast('Password changed successfully');
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrices = async () => {
    setIsSaving(true);
    try {
      const res = await api('/api/settings/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices: agencyPrices }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update prices');
      showToast('Agency prices updated successfully');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Role Permissions Query & State
  const { data: serverPermissions } = useRolePermissionsQuery();
  const invalidateQueries = useInvalidateQueries();

  const [permissionsState, setPermissionsState] = useState<Record<string, string[]>>({});
  const [selectedRole, setSelectedRole] = useState<Role>('genaral');
  const [rolePageSearch, setRolePageSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const merged: Record<string, string[]> = {};
    for (const r of ALL_ROLES) {
      if (r === 'super_admin') {
        merged[r] = SYSTEM_PAGES.map(p => p.path);
      } else if (serverPermissions && Array.isArray(serverPermissions[r])) {
        merged[r] = [...serverPermissions[r]];
      } else if (DEFAULT_ROLE_PERMISSIONS[r]) {
        merged[r] = [...DEFAULT_ROLE_PERMISSIONS[r]];
      } else {
        merged[r] = [];
      }
    }
    setPermissionsState(merged);
  }, [serverPermissions]);

  const handleTogglePageRoute = (role: Role, pagePath: string) => {
    if (role === 'super_admin') return;
    setPermissionsState(prev => {
      const current = prev[role] || DEFAULT_ROLE_PERMISSIONS[role] || [];
      const exists = current.includes(pagePath);
      const updated = exists ? current.filter(p => p !== pagePath) : [...current, pagePath];
      return { ...prev, [role]: updated };
    });
  };

  const handleSelectAllForRole = (role: Role) => {
    if (role === 'super_admin') return;
    setPermissionsState(prev => ({
      ...prev,
      [role]: SYSTEM_PAGES.map(p => p.path),
    }));
  };

  const handleDeselectAllForRole = (role: Role) => {
    if (role === 'super_admin') return;
    setPermissionsState(prev => ({
      ...prev,
      [role]: [],
    }));
  };

  const handleSaveRolePermissions = async () => {
    setIsSaving(true);
    try {
      const res = await api('/api/settings/role-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissionsState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role permissions');
      invalidateQueries('rolePermissions');
      showToast('Role permissions updated and applied successfully');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetRolePermissions = async (roleToReset?: Role) => {
    const targetName = roleToReset ? (ROLE_CONFIG[roleToReset]?.label || roleToReset) : 'all roles';
    if (!confirm(`Are you sure you want to reset page access for ${targetName} back to system defaults?`)) {
      return;
    }
    setIsSaving(true);
    try {
      const res = await api('/api/settings/role-permissions/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleToReset ? { role: roleToReset } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset role permissions');
      invalidateQueries('rolePermissions');
      if (roleToReset) {
        setPermissionsState(prev => ({
          ...prev,
          [roleToReset]: [...(DEFAULT_ROLE_PERMISSIONS[roleToReset] || [])],
        }));
      } else {
        setPermissionsState({ ...DEFAULT_ROLE_PERMISSIONS });
      }
      showToast(data.message || 'Role permissions reset to default');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  let tabs = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ];
  
  if (profile.role === 'super_admin') {
    tabs.splice(1, 0, { id: 'agency', label: 'Agency Price', icon: DollarSign });
    tabs.splice(2, 0, { id: 'roles', label: 'Role Management', icon: ShieldCheck });
    tabs.push({ id: 'analytics', label: 'User Analytics', icon: BarChart3 });
  }

  const getSaveHandler = () => {
    if (activeTab === 'profile') return handleSaveProfile;
    if (activeTab === 'agency') return handleSavePrices;
    if (activeTab === 'roles') return handleSaveRolePermissions;
    return () => showToast('Settings saved');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50">
              <SettingsIcon size={22} className="text-primary" />
            </div>
            System Settings
          </h1>
          <p className="text-text-secondary mt-1 ml-12">Manage your account and agency preferences</p>
        </div>
        {activeTab !== 'analytics' && (
          <Button 
            onClick={getSaveHandler()} 
            disabled={isSaving || isPending}
            icon={isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 mt-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "text-text-secondary hover:bg-surface border border-transparent hover:border-border hover:shadow-sm"
                )}
              >
                <Icon size={18} className={isActive ? "text-white" : "text-text-tertiary"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-surface border border-border shadow-sm rounded-2xl p-6 lg:p-8 min-h-[500px]">
          
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-1">Profile Details</h2>
                <p className="text-sm text-text-secondary mb-6">Update your personal account information.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input label="Full Name" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} />
                  <Input label="Email Address" type="email" value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} />
                  <Input label="Role / Job Title" value={profile.role} disabled />
                </div>
              </div>

              <div className="pt-8 border-t border-border">
                <h2 className="text-lg font-bold text-text-primary mb-1 flex items-center gap-2">
                  <Lock size={18} className="text-primary" /> Security
                </h2>
                <p className="text-sm text-text-secondary mb-6">Update your password to keep your account secure.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <Input 
                    label="Current Password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                  />
                  <div className="hidden md:block"></div> {/* Spacer */}
                  <Input 
                    label="New Password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                  />
                  <Input 
                    label="Confirm New Password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleUpdatePassword}
                  disabled={isSaving}
                >
                  {isSaving ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </div>
          )}

          {/* Agency Settings */}
          {activeTab === 'agency' && profile.role === 'super_admin' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-1 flex items-center gap-2">
                  <DollarSign size={18} className="text-primary" /> Default Invoice Pricing
                </h2>
                <p className="text-sm text-text-secondary mb-6">Set the default invoice price (in USD) for each CV template. This price will be automatically applied when generating an invoice for a candidate using that specific template.</p>
                
                <div className="bg-gray-50/50 rounded-xl border border-border p-4">
                  <div className="grid grid-cols-1 gap-4">
                    {templates.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-white border border-border/60 rounded-lg hover:border-primary/30 transition-colors">
                        <span className="font-semibold text-text-primary text-sm">{t.name}</span>
                        <div className="w-32">
                          <Input 
                            type="number"
                            placeholder="e.g. 1500" 
                            value={agencyPrices[t.id] || ''} 
                            onChange={(e) => setAgencyPrices({...agencyPrices, [t.id]: e.target.value})}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Role Management (Super Admins Only) */}
          {activeTab === 'roles' && profile.role === 'super_admin' && (
            <div className="space-y-8 animate-fade-in">
              {/* Header */}
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                      <ShieldCheck size={20} className="text-primary" />
                      Role Management & Page Access Control
                    </h2>
                    <p className="text-sm text-text-secondary mt-1">
                      Configure page access rules for each role. Changes update sidebar navigation and dynamic route protection immediately.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetRolePermissions(selectedRole)}
                      disabled={isSaving || selectedRole === 'super_admin'}
                      icon={<RotateCcw size={14} />}
                      className="text-xs"
                    >
                      Reset Role to Default
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveRolePermissions}
                      disabled={isSaving}
                      icon={isSaving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                      className="text-xs"
                    >
                      {isSaving ? 'Saving...' : 'Save Role Permissions'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 1: Role Selector Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                    1. Select a Role to Configure ({ALL_ROLES.length} System Roles)
                  </label>
                  <span className="text-xs text-text-tertiary">
                    Click a role to view and toggle its page permissions
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {ALL_ROLES.map((r) => {
                    const isSelected = selectedRole === r;
                    const rConfig = ROLE_CONFIG[r];
                    const currentPages = permissionsState[r] ?? DEFAULT_ROLE_PERMISSIONS[r] ?? [];
                    const pageCount = r === 'super_admin' ? SYSTEM_PAGES.length : currentPages.length;
                    const totalPages = SYSTEM_PAGES.length;
                    const percent = Math.round((pageCount / totalPages) * 100);

                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRole(r)}
                        className={cn(
                          "flex flex-col text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer relative group",
                          isSelected 
                            ? "bg-primary/5 border-primary shadow-sm ring-2 ring-primary/20" 
                            : "bg-white hover:bg-gray-50/80 border-border hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-xs font-bold border",
                            rConfig?.badgeBg || "bg-gray-100",
                            rConfig?.badgeText || "text-gray-700",
                            rConfig?.badgeBorder || "border-gray-200"
                          )}>
                            {rConfig?.label || r}
                          </span>
                          {r === 'super_admin' ? (
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Full
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-text-secondary">
                              {pageCount}/{totalPages}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-text-tertiary line-clamp-1 mt-0.5">
                          {ROLE_DESCRIPTIONS[r]}
                        </p>

                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-2">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              r === 'super_admin' ? "bg-amber-500" : pageCount === 0 ? "bg-gray-300" : "bg-primary"
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Page Access Control Area for Selected Role */}
              <div className="bg-gray-50/50 border border-border rounded-xl p-5 space-y-6">
                {/* Active Role Meta & Quick Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-white border border-border shadow-sm text-primary shrink-0">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-text-primary">
                          {ROLE_CONFIG[selectedRole]?.label || selectedRole} Page Permissions
                        </h3>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                          ROLE_CONFIG[selectedRole]?.badgeBg,
                          ROLE_CONFIG[selectedRole]?.badgeText,
                          ROLE_CONFIG[selectedRole]?.badgeBorder
                        )}>
                          {ROLE_CONFIG[selectedRole]?.label || selectedRole}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-border text-text-secondary">
                          {(selectedRole === 'super_admin' 
                            ? SYSTEM_PAGES.length 
                            : (permissionsState[selectedRole] ?? DEFAULT_ROLE_PERMISSIONS[selectedRole] ?? []).length
                          )} of {SYSTEM_PAGES.length} pages allowed
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1 max-w-2xl">
                        {ROLE_DESCRIPTIONS[selectedRole]}
                      </p>
                    </div>
                  </div>

                  {selectedRole !== 'super_admin' && (
                    <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAllForRole(selectedRole)}
                        icon={<CheckSquare size={14} />}
                        className="text-xs bg-white"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeselectAllForRole(selectedRole)}
                        icon={<Square size={14} />}
                        className="text-xs bg-white text-rose-600 hover:text-rose-700 hover:border-rose-300"
                      >
                        Deselect All
                      </Button>
                    </div>
                  )}
                </div>

                {/* Super Admin Notice */}
                {selectedRole === 'super_admin' && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                    <Info size={18} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs leading-relaxed">
                      <p className="font-bold text-amber-950">Super Admin Has Full Unrestricted Access</p>
                      <p className="text-amber-800 mt-0.5">
                        The Super Admin role is the root system administrator and is granted access to all 22 system pages and administrative functions by design. These permissions cannot be restricted to prevent accidental administrative lockout.
                      </p>
                    </div>
                  </div>
                )}

                {/* Search & Category Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      placeholder="Filter pages by name or route (e.g. candidates, cv, users)..."
                      value={rolePageSearch}
                      onChange={(e) => setRolePageSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-xl text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    {['All', 'Overview', 'Registrations & Passports', 'Candidates & CVs', 'Agency & Deployments', 'Media', 'Administration'].map((cat) => {
                      const isCatActive = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                            isCatActive 
                              ? "bg-primary text-white shadow-sm" 
                              : "bg-white text-text-secondary hover:bg-gray-100 border border-border"
                          )}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Page Access Categorized Groups */}
                <div className="space-y-6">
                  {(() => {
                    const filteredPages = SYSTEM_PAGES.filter(p => {
                      const matchesSearch = 
                        p.name.toLowerCase().includes(rolePageSearch.toLowerCase()) ||
                        p.path.toLowerCase().includes(rolePageSearch.toLowerCase()) ||
                        p.category.toLowerCase().includes(rolePageSearch.toLowerCase());
                      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
                      return matchesSearch && matchesCat;
                    });

                    if (filteredPages.length === 0) {
                      return (
                        <div className="py-12 text-center bg-white rounded-xl border border-dashed border-border">
                          <AlertCircle size={28} className="mx-auto text-text-tertiary mb-2" />
                          <p className="text-sm font-semibold text-text-secondary">No pages match your search filter</p>
                          <p className="text-xs text-text-tertiary mt-1">Try clearing the search box or selecting &apos;All&apos; categories.</p>
                        </div>
                      );
                    }

                    // Group filtered pages by category
                    const grouped: Record<string, typeof SYSTEM_PAGES[number][]> = {};
                    filteredPages.forEach(p => {
                      if (!grouped[p.category]) grouped[p.category] = [];
                      grouped[p.category].push(p);
                    });

                    const currentRolePages = permissionsState[selectedRole] ?? DEFAULT_ROLE_PERMISSIONS[selectedRole] ?? [];

                    return Object.entries(grouped).map(([categoryName, pages]) => {
                      const CatIcon = CATEGORY_ICONS[categoryName] || SlidersHorizontal;
                      const enabledInCategory = pages.filter(p => 
                        selectedRole === 'super_admin' ? true : currentRolePages.includes(p.path)
                      ).length;

                      return (
                        <div key={categoryName} className="space-y-3">
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                              <CatIcon size={16} className="text-primary" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                                {categoryName}
                              </h4>
                              <span className="text-[11px] text-text-tertiary font-medium">
                                ({pages.length} {pages.length === 1 ? 'page' : 'pages'})
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-text-secondary bg-white px-2 py-0.5 rounded-md border border-border">
                              {enabledInCategory} of {pages.length} enabled
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {pages.map((page) => {
                              const isAllowed = selectedRole === 'super_admin' 
                                ? true 
                                : currentRolePages.includes(page.path);

                              return (
                                <div
                                  key={page.path}
                                  className={cn(
                                    "flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 bg-white shadow-xs",
                                    isAllowed 
                                      ? "border-emerald-200/80 hover:border-emerald-300" 
                                      : "border-gray-200 hover:border-gray-300 opacity-90"
                                  )}
                                >
                                  <div className="pr-3 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-semibold text-text-primary">
                                        {page.name}
                                      </span>
                                      <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                        {page.path}
                                      </code>
                                    </div>
                                    <p className="text-xs text-text-secondary mt-1 line-clamp-1">
                                      {page.description}
                                    </p>
                                    <div className="mt-2 flex items-center gap-1.5">
                                      {isAllowed ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                          <Check size={11} className="stroke-[3]" /> Access Granted
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                                          <Lock size={11} /> Access Restricted
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="shrink-0 pl-2">
                                    <Toggle
                                      checked={isAllowed}
                                      disabled={selectedRole === 'super_admin'}
                                      onChange={() => handleTogglePageRoute(selectedRole, page.path)}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Bottom Bar for Role */}
                <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-text-secondary">
                    Role &apos;<strong className="text-text-primary">{ROLE_CONFIG[selectedRole]?.label || selectedRole}</strong>&apos; currently has{' '}
                    <strong className="text-primary font-bold">
                      {selectedRole === 'super_admin' 
                        ? SYSTEM_PAGES.length 
                        : (permissionsState[selectedRole] ?? DEFAULT_ROLE_PERMISSIONS[selectedRole] ?? []).length
                      }
                    </strong>{' '}
                    out of {SYSTEM_PAGES.length} pages accessible.
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetRolePermissions(selectedRole)}
                      disabled={isSaving || selectedRole === 'super_admin'}
                      icon={<RotateCcw size={14} />}
                      className="text-xs bg-white"
                    >
                      Reset This Role
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveRolePermissions}
                      disabled={isSaving}
                      icon={isSaving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                      className="text-xs"
                    >
                      {isSaving ? 'Saving Changes...' : 'Save Role Permissions'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-1">Alert Preferences</h2>
                <p className="text-sm text-text-secondary mb-6">Choose what events you want to be notified about.</p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-semibold text-text-primary">CV Deadline Reminders</p>
                      <p className="text-sm text-text-secondary">Get notified when a candidate's CV application deadline is approaching.</p>
                    </div>
                    <Toggle checked={notifications.cvDeadlines} onChange={(v) => setNotifications({...notifications, cvDeadlines: v})} />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-semibold text-text-primary">New Candidate Registrations</p>
                      <p className="text-sm text-text-secondary">Receive an alert when a new candidate profile is successfully completed.</p>
                    </div>
                    <Toggle checked={notifications.newRegistrations} onChange={(v) => setNotifications({...notifications, newRegistrations: v})} />
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-semibold text-text-primary">System Updates & Announcements</p>
                      <p className="text-sm text-text-secondary">Important news and updates about the COOLSTAFF platform.</p>
                    </div>
                    <Toggle checked={notifications.systemUpdates} onChange={(v) => setNotifications({...notifications, systemUpdates: v})} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Preferences */}
          {activeTab === 'preferences' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-lg font-bold text-text-primary mb-1">System Preferences</h2>
                <p className="text-sm text-text-secondary mb-6">Customize your dashboard experience.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                  <Select 
                    label="Language" 
                    value={preferences.language} 
                    onChange={(val) => setPreferences({...preferences, language: val})}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'ar', label: 'Arabic' },
                      { value: 'am', label: 'Amharic' },
                    ]}
                  />
                  <Select 
                    label="Timezone" 
                    value={preferences.timezone} 
                    onChange={(val) => setPreferences({...preferences, timezone: val})}
                    options={[
                      { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST)' },
                      { value: 'Africa/Addis_Ababa', label: 'Africa/Addis Ababa (EAT)' },
                      { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
                    ]}
                  />
                  <Select 
                    label="Date Format" 
                    value={preferences.dateFormat} 
                    onChange={(val) => setPreferences({...preferences, dateFormat: val})}
                    options={[
                      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g., 2026-04-24)' },
                      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g., 24/04/2026)' },
                      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g., 04/24/2026)' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* User Analytics Dashboard */}
          {activeTab === 'analytics' && profile.role === 'super_admin' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary mb-1 flex items-center gap-2">
                      <BarChart3 size={18} className="text-primary" /> User Activity Analytics
                    </h2>
                    <p className="text-sm text-text-secondary">Monitor registration metrics and platform usage across all active system operators.</p>
                  </div>
                  
                  {/* Search and Sort controls */}
                  <div className="flex items-center gap-3">
                    <div className="w-60">
                      <Input 
                        placeholder="Search operators..." 
                        value={analyticsSearch} 
                        onChange={(e) => setAnalyticsSearch(e.target.value)}
                      />
                    </div>
                    <div className="w-48">
                      <Select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(val) => {
                          const [field, order] = val.split('-');
                          setSortBy(field as any);
                          setSortOrder(order as any);
                        }}
                        options={[
                          { value: 'candidates-desc', label: 'Candidates (High to Low)' },
                          { value: 'candidates-asc', label: 'Candidates (Low to High)' },
                          { value: 'quick-desc', label: 'Quick Registrations (High)' },
                          { value: 'name-asc', label: 'Name (A to Z)' },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {loadingAnalytics ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-4">
                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-text-secondary text-sm font-medium">Analyzing operator activities...</p>
                  </div>
                ) : analyticsData.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-gray-50/30">
                    <p className="text-text-secondary font-medium">No operator activity records found.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5 shadow-sm">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Total Candidates Registered</span>
                        <div className="text-3xl font-extrabold text-text-primary mt-2">
                          {analyticsData.reduce((sum, u) => sum + (u.candidatesRegistered || 0), 0)}
                        </div>
                        <p className="text-xs text-text-secondary mt-1">Successfully promoted into system</p>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
                        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Total Walk-In (Quick) Records</span>
                        <div className="text-3xl font-extrabold text-text-primary mt-2">
                          {analyticsData.reduce((sum, u) => sum + (u.quickRegistrations || 0), 0)}
                        </div>
                        <p className="text-xs text-text-secondary mt-1">Temporary or scan registrations</p>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                        <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Top Performing Operator</span>
                        <div className="text-xl font-bold text-text-primary mt-2 truncate">
                          {(() => {
                            const top = [...analyticsData].sort((a, b) => (b.candidatesRegistered || 0) - (a.candidatesRegistered || 0))[0];
                            return top ? `${top.name} (${top.candidatesRegistered || 0})` : 'None';
                          })()}
                        </div>
                        <p className="text-xs text-text-secondary mt-1">Highest registration count</p>
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="bg-surface rounded-[2rem] border border-border/30 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50/50 border-b border-border/30 text-[10px] uppercase tracking-wider font-bold text-text-tertiary/90">
                              <th className="px-6 py-4 font-semibold">Operator</th>
                              <th className="px-6 py-4 font-semibold">Role</th>
                              <th className="px-6 py-4 font-semibold text-center">Candidates</th>
                              <th className="px-6 py-4 font-semibold text-center">Quick Regs</th>
                              <th className="px-6 py-4 font-semibold">Activity Share</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/20 text-sm">
                            {filteredAndSortedAnalytics.map((user) => {
                              const totalCandidates = analyticsData.reduce((sum, u) => sum + (u.candidatesRegistered || 0), 0) || 1;
                              const share = Math.round(((user.candidatesRegistered || 0) / totalCandidates) * 100);
                              
                              // Role styling helper
                              const getRoleBadge = (role: string) => {
                                const classes = {
                                  super_admin: "bg-purple-50 text-purple-700 border-purple-100",
                                  registrar: "bg-blue-50 text-blue-700 border-blue-100",
                                  processor: "bg-orange-50 text-orange-700 border-orange-100",
                                  coordinator: "bg-teal-50 text-teal-700 border-teal-100",
                                  accountant: "bg-amber-50 text-amber-700 border-amber-100",
                                  video_uploader: "bg-pink-50 text-pink-700 border-pink-100"
                                }[role] || "bg-gray-50 text-gray-700 border-gray-100";
                                
                                return (
                                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", classes)}>
                                    {role.replace('_', ' ')}
                                  </span>
                                );
                              };

                              return (
                                <tr key={user.id} className="hover:bg-gray-50/30 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-600 text-white font-bold flex items-center justify-center shadow-sm">
                                        {user.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-semibold text-text-primary">{user.name}</div>
                                        <div className="text-xs text-text-secondary">{user.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-text-primary">{user.candidatesRegistered || 0}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center font-medium text-text-secondary">{user.quickRegistrations || 0}</td>
                                  <td className="px-6 py-4 whitespace-nowrap min-w-[150px]">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div 
                                          className="bg-primary h-full rounded-full transition-all duration-500" 
                                          style={{ width: `${share}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-bold text-text-secondary w-8 text-right">{share}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-toast">
          <div className={cn(
            "flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl",
            toast.type === 'success' ? "bg-gray-900 text-white" : "bg-red-600 text-white"
          )}>
            {toast.type === 'success' ? <CheckCircle2 size={18} className="text-success" /> : <Lock size={18} />}
            <span className="text-sm font-medium">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
