'use client';

import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Globe, 
  Lock,
  Save,
  CheckCircle2
} from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useSession, authClient } from '@/lib/auth-client';
import { useEffect } from 'react';

// Helper component for Toggle Switch
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        checked ? "bg-primary" : "bg-gray-200"
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
  const [activeTab, setActiveTab] = useState<'profile' | 'agency' | 'notifications' | 'preferences'>('profile');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [profile, setProfile] = useState({ name: '', email: '', role: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [notifications, setNotifications] = useState({ cvDeadlines: true, newRegistrations: true, systemUpdates: false });
  const [preferences, setPreferences] = useState({ language: 'en', timezone: 'Asia/Riyadh', dateFormat: 'YYYY-MM-DD' });

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
      const res = await fetch('/api/account/profile', {
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
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentPassword: passwordForm.current, 
          newPassword: passwordForm.new 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      showToast('Password changed successfully');
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ] as const;

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
        <Button 
          onClick={activeTab === 'profile' ? handleSaveProfile : () => showToast('Settings saved')} 
          disabled={isSaving || isPending}
          icon={isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
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
                onClick={() => setActiveTab(tab.id)}
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
                      <p className="text-sm text-text-secondary">Important news and updates about the DAERA platform.</p>
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
