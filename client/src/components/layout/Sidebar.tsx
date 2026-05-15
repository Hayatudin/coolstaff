'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSession, signOut } from '@/lib/auth-client';
import {
  LayoutDashboard,
  UserPlus,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  Users,
  ClipboardList,
  FolderOpen,
  UserCheck,
  ShieldCheck,
  Loader2,
  X,
} from 'lucide-react';

// Base nav items shown to all dashboard roles
const baseNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Candidates', href: '/candidates', icon: Users },
  { label: 'Quick Registration', href: '/quick-registration', icon: ClipboardList },
  { label: 'Quick Registered', href: '/quick-registered', icon: Users },
  { label: 'Visa Selected', href: '/requested', icon: ClipboardList },
  { label: 'Fit Candidates', href: '/fit-candidates', icon: UserCheck },
  { label: 'Registration', href: '/registration', icon: UserPlus },
  { label: 'CV Generator', href: '/cv-generator', icon: FileText },
  { label: 'Generated CVs', href: '/generated-cvs', icon: FolderOpen },
  { label: 'Brokers', href: '/brokers', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Backup CVs', href: '/backup', icon: FolderOpen },
];

// Extra nav item visible only to super_admin
const superAdminNavItem = {
  label: 'Users',
  href: '/users',
  icon: ShieldCheck,
};

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  isMobile?: boolean;
  onNavigate?: () => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobile, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const role = (session?.user as any)?.role ?? 'user';
  const isSuperAdmin = role === 'super_admin';

  const navItems = isSuperAdmin
    ? [...baseNavItems, superAdminNavItem]
    : baseNavItems;

  const handleLogout = async () => {
    await signOut();
    // Force a full reload to clear all caches and states
    window.location.href = '/login';
  };

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <aside
      className={cn(
        'relative shrink-0 h-screen bg-gradient-to-b from-sidebar-from to-sidebar-to flex flex-col z-40 transition-all duration-300',
        isMobile ? 'w-72' : (isCollapsed ? 'w-20' : 'w-64')
      )}
    >
      {/* Logo + Mobile close */}
      <div className={cn('flex items-center pt-7 pb-2 transition-all duration-300', isCollapsed && !isMobile ? 'justify-center px-0' : 'gap-3 px-6')}>
        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex shrink-0 items-center justify-center border border-white/10">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        {(!isCollapsed || isMobile) && (
          <div className="overflow-hidden whitespace-nowrap transition-all duration-300 flex-1">
            <h1 className="text-white font-bold text-xl tracking-wide">COOLSTAFF</h1>
            <p className="text-white/40 text-[10px] tracking-[0.2em] uppercase">Employment Agency</p>
          </div>
        )}
        {isMobile && (
          <button onClick={onNavigate} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Role badge */}
      {(!isCollapsed || isMobile) && !isPending && session && (
        <div className="px-6 pb-3">
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
            role === 'super_admin' ? 'bg-amber-400/20 text-amber-300' :
              role === 'admin' ? 'bg-indigo-400/20 text-indigo-300' :
                role === 'agency' ? 'bg-cyan-400/20 text-cyan-300' :
                  'bg-white/10 text-white/40'
          )}>
            <ShieldCheck size={10} />
            {role.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center rounded-lg transition-all duration-200 group relative',
                isCollapsed && !isMobile ? 'justify-center py-3' : 'gap-3 px-4 py-2.5',
                isActive
                  ? 'bg-white/15 text-white shadow-none'
                  : 'text-white/60 hover:bg-white/10 hover:text-white/90'
              )}
              title={isCollapsed && !isMobile ? item.label : undefined}
            >
              <Icon size={18} className={cn('shrink-0 transition-transform duration-200', !isActive && 'group-hover:scale-110')} />
              {(!isCollapsed || isMobile) && (
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              )}
              {isActive && (!isCollapsed || isMobile) && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section — user info + logout */}
      <div className="px-3 pb-6 space-y-1 border-t border-white/10 pt-3 mt-2">
        {/* User info */}
        {(!isCollapsed || isMobile) && session?.user && (
          <div className="px-4 py-3 mb-2 bg-white/5 rounded-xl border border-white/5 mx-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white/90 text-sm font-bold truncate leading-none">{session.user.name}</p>
              <span className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter",
                role.includes('admin') ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              )}>
                {role.replace('_', ' ')}
              </span>
            </div>
            <p className="text-white/30 text-[10px] truncate font-medium">{session.user.email}</p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 w-full cursor-pointer',
            isCollapsed && !isMobile ? 'justify-center py-3' : 'gap-3 px-4 py-2.5'
          )}
          title={isCollapsed && !isMobile ? 'Logout' : undefined}
        >
          {isPending
            ? <Loader2 size={18} className="shrink-0 animate-spin" />
            : <LogOut size={18} className="shrink-0" />
          }
          {(!isCollapsed || isMobile) && <span className="text-sm whitespace-nowrap">Logout</span>}
        </button>
      </div>

      {/* Collapse button — desktop only */}
      {!isMobile && (
        <button
          onClick={() => setIsCollapsed(prev => !prev)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 z-50"
        >
          <ChevronLeft size={12} className={cn('transition-transform duration-300', isCollapsed && 'rotate-180')} />
        </button>
      )}
    </aside>
  );
}
