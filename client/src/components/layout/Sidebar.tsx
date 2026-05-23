'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSession, signOut } from '@/lib/auth-client';
import { ROUTE_ACCESS, SIDEBAR_BADGE_COLORS, ROLE_CONFIG, type Role } from '@/lib/role-config';
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
  Video,
} from 'lucide-react';

// All possible nav items with their route paths
const allNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Entry', href: '/quick-registration', icon: ClipboardList },
  { label: 'Records', href: '/quick-registered', icon: Users },
  { label: 'Registration', href: '/registration', icon: UserPlus },
  { label: 'Candidates', href: '/candidates', icon: Users },
  { label: 'CV Generator', href: '/cv-generator', icon: FileText },
  { label: 'Generated CVs', href: '/generated-cvs', icon: FolderOpen },
  { label: 'Fit Candidates', href: '/fit-candidates', icon: UserCheck },
  { label: 'Visa Selected', href: '/requested', icon: ClipboardList },
  { label: 'Invoice', href: '/invoice', icon: FileText },
  { label: 'Candidate Deployment', href: '/deployments', icon: ClipboardList },
  { label: 'Brokers', href: '/brokers', icon: Users },
  { label: 'Video Uploads', href: '/video-uploads', icon: Video },
  { label: 'Uploaded Videos', href: '/uploaded-videos', icon: Video },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Backup CVs', href: '/backup', icon: FolderOpen },
  { label: 'Users', href: '/users', icon: ShieldCheck },
];

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

  const role = ((session?.user as any)?.role ?? 'user') as string;

  // Filter nav items based on role
  const navItems = allNavItems.filter(item => {
    const allowedRoles = ROUTE_ACCESS[item.href];
    if (!allowedRoles) return false;
    return allowedRoles.includes(role as Role);
  });

  const handleLogout = async () => {
    await signOut();
    // Force a full reload to clear all caches and states
    window.location.href = '/login';
  };

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  // Get sidebar badge color for role
  const badgeColor = SIDEBAR_BADGE_COLORS[role] || SIDEBAR_BADGE_COLORS.user;

  // Get role label for display
  const roleConfig = ROLE_CONFIG[role as Role];
  const roleLabel = roleConfig?.label || role.replace('_', ' ');

  // Role badge color in the bottom user info section
  const isStaffRole = role !== 'user' && role !== 'agency';

  return (
    <aside
      className={cn(
        'relative shrink-0 h-screen bg-gradient-to-b from-sidebar-from to-sidebar-to flex flex-col z-40 transition-all duration-300',
        isMobile ? 'w-72' : (isCollapsed ? 'w-20' : 'w-64')
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        "w-full bg-[#9286FF] flex items-center justify-center transition-all duration-300 relative shrink-0",
        isCollapsed && !isMobile ? "py-4 px-2" : "py-2 px-6"
      )}>
        <div className={cn(
          "flex items-center justify-center w-full",
          isCollapsed && !isMobile ? "h-12" : "h-20"
        )}>
          <img
            src="/coolstaff-logo.png"
            alt="COOLSTAFF LOGO"
            className={cn(
              "object-contain transition-all duration-300",
              isCollapsed && !isMobile ? "h-16 w-16 rounded-full" : "h-40 w-auto max-w-full"
            )}
          />
        </div>

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onNavigate}
            className="absolute right-4 p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        )}
      </div>

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
                isStaffRole ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
              )}>
                {roleLabel}
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
