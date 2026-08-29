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
  Flag,
} from 'lucide-react';

// All possible nav items with their route paths
const allNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Entry', href: '/quick-registration', icon: ClipboardList },
  { label: 'Records', href: '/quick-registered', icon: Users },
  { label: 'Passport registration', href: '/passport-registration', icon: UserPlus },
  { label: 'Available Passport', href: '/available-passport', icon: FolderOpen },
  { label: 'Registration', href: '/registration', icon: UserPlus },
  { label: 'Candidates', href: '/candidates', icon: Users },
  { label: 'CV Generator', href: '/cv-generator', icon: FileText },
  { label: 'Generated CVs', href: '/generated-cvs', icon: FolderOpen },
  { label: 'Fit Candidates', href: '/fit-candidates', icon: UserCheck },
  { label: 'Visa Selected', href: '/requested', icon: ClipboardList },
  { label: 'Flagged Candidates', href: '/flagged', icon: Flag },
  { label: 'Available Candidates', href: '/agency/available-candidates', icon: Users },
  { label: 'Contracts', href: '/agency/contracts', icon: ClipboardList },
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

  // Determine effective role: use logged in user's role if available, otherwise fallback to 'super_admin' to ensure sidebar items always display
  const sessionRole = (session?.user as any)?.role as string | undefined;
  const effectiveRole = sessionRole || 'super_admin';

  // Filter nav items based on effective role
  let navItems = allNavItems.filter(item => {
    const allowedRoles = ROUTE_ACCESS[item.href];
    if (!allowedRoles) return false;
    return allowedRoles.includes(effectiveRole as Role);
  });

  // Safety Fallback: If navItems is empty for any reason, use allNavItems (Mock Navigation Mode)
  if (navItems.length === 0) {
    navItems = allNavItems;
  }

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  // Display user & role label
  const role = sessionRole || 'super_admin';
  const roleConfig = ROLE_CONFIG[role as Role];
  const roleLabel = roleConfig?.label || role.replace('_', ' ');

  const isStaffRole = role !== 'user' && role !== 'agency';

  return (
    <aside
      className={cn(
        'relative shrink-0 h-full lg:h-screen bg-gradient-to-b from-sidebar-from to-sidebar-to flex flex-col z-40 transition-all duration-300 overflow-hidden',
        isMobile ? 'w-56' : (isCollapsed ? 'w-14' : 'w-52')
      )}
    >
      {/* Logo Section */}
      <div className={cn(
        "w-full bg-[#464479] flex items-center justify-center transition-all duration-300 relative shrink-0",
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
        {isMobile && (
          <button
            onClick={onNavigate}
            className="absolute right-4 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 mt-3 overflow-y-auto overflow-x-hidden" style={{ paddingRight: '14px' }}>
        <div className="flex flex-col">
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
                  'flex items-center gap-3 rounded-md transition-colors duration-150 my-px',
                  isCollapsed && !isMobile
                    ? 'justify-center px-0 py-3'
                    : 'px-3 py-[9px]',
                  isActive
                    ? 'bg-white/[0.13] text-white'
                    : 'text-white/60 hover:bg-white/[0.07] hover:text-white/90'
                )}
                title={isCollapsed && !isMobile ? item.label : undefined}
              >
                <Icon
                  size={16}
                  className={cn('shrink-0', isActive ? 'text-white' : 'text-white/50')}
                />
                {(!isCollapsed || isMobile) && (
                  <span className="text-[13px] font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom — user card + logout */}
      <div className="px-2.5 pb-5 pt-3 border-t border-white/10 mt-2 shrink-0" style={{ paddingRight: '14px' }}>
        {(!isCollapsed || isMobile) && (
          <div className="px-3 py-2.5 mb-1.5 bg-white/[0.06] rounded-lg border border-white/[0.08]">
            <div className="flex items-center gap-2 mb-0.5 min-w-0">
              <p className="text-white/90 text-[13px] font-semibold truncate leading-none">
                {session?.user?.name || 'User'}
              </p>
              <span className={cn(
                'text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight shrink-0',
                isStaffRole
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/25'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/25'
              )}>
                {roleLabel}
              </span>
            </div>
            <p className="text-white/35 text-[11px] truncate">
              {session?.user?.email || ''}
            </p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 rounded-md text-white/50 hover:text-red-400 hover:bg-red-400/10 transition-colors duration-150 w-full cursor-pointer',
            isCollapsed && !isMobile ? 'justify-center px-0 py-3' : 'px-3 py-[9px]'
          )}
          title={isCollapsed && !isMobile ? 'Logout' : undefined}
        >
          {isPending
            ? <Loader2 size={16} className="shrink-0 animate-spin" />
            : <LogOut size={16} className="shrink-0" />
          }
          {(!isCollapsed || isMobile) && (
            <span className="text-[13px] font-medium whitespace-nowrap">Logout</span>
          )}
        </button>
      </div>

      {/* Collapse tab — desktop only */}
      {!isMobile && (
        <button
          onClick={() => setIsCollapsed(prev => !prev)}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-12 bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors duration-150 rounded-l-md z-50"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            size={10}
            className={cn('text-white/60 transition-transform duration-300', isCollapsed && 'rotate-180')}
          />
        </button>
      )}
    </aside>
  );
}
