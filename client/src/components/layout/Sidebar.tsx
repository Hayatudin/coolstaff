'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSession, signOut } from '@/lib/auth-client';
import { ROUTE_ACCESS, ROLE_CONFIG, type Role } from '@/lib/role-config';
import {
  LayoutDashboard,
  UserPlus,
  FileText,
  Settings,
  LogOut,
  Users,
  ClipboardList,
  FolderOpen,
  UserCheck,
  ShieldCheck,
  Loader2,
  X,
  Video,
  Flag,
  PanelLeft,
} from 'lucide-react';

// Main Menu items
const mainMenuHrefs = [
  '/dashboard',
  '/quick-registration',
  '/quick-registered',
  '/passport-registration',
  '/available-passport',
  '/candidates',
  '/cv-generator',
  '/generated-cvs',
  '/fit-candidates',
  '/requested',
  '/flagged',
];

// All possible nav items with their route paths
const allNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Entry', href: '/quick-registration', icon: ClipboardList },
  { label: 'Records', href: '/quick-registered', icon: Users },
  { label: 'Passport registration', href: '/passport-registration', icon: UserPlus },
  { label: 'Available Passport', href: '/available-passport', icon: FolderOpen },
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

  const sessionRole = (session?.user as any)?.role as string | undefined;
  const effectiveRole = sessionRole || 'super_admin';

  // Filter nav items based on effective role
  let navItems = allNavItems.filter(item => {
    const allowedRoles = ROUTE_ACCESS[item.href];
    if (!allowedRoles) return false;
    return allowedRoles.includes(effectiveRole as Role);
  });

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

  const role = sessionRole || 'super_admin';
  const roleConfig = ROLE_CONFIG[role as Role];
  const roleLabel = roleConfig?.label || role.replace('_', ' ');
  const isStaffRole = role !== 'user' && role !== 'agency';

  const mainMenuNav = navItems.filter(item => mainMenuHrefs.includes(item.href));
  const otherNav = navItems.filter(item => !mainMenuHrefs.includes(item.href));

  return (
    <aside
      className={cn(
        'relative shrink-0 h-full lg:h-screen bg-gradient-to-b from-sidebar-from to-sidebar-to flex flex-col z-40 transition-all duration-300 overflow-hidden',
        isMobile ? 'w-60' : (isCollapsed ? 'w-18' : 'w-56')
      )}
    >
      {/* Header Branding & Collapse Button */}
      <div className={cn(
        "w-full flex items-center justify-between transition-all duration-300 relative shrink-0 border-b border-white/10",
        isCollapsed && !isMobile ? "py-4 px-3 justify-center" : "py-4 px-4"
      )}>
        <div className="flex items-center gap-3">
          {/* Logo Box with "C" emblem */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-primary text-white flex items-center justify-center font-black text-lg shadow-sm border border-white/20 shrink-0">
            C
          </div>
          {(!isCollapsed || isMobile) && (
            <span className="text-base font-extrabold text-white tracking-tight leading-none whitespace-nowrap">
              Coolstaff
            </span>
          )}
        </div>

        {/* Single Icon Collapse / Expand Toggle */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <PanelLeft size={18} />
          </button>
        )}

        {isMobile && (
          <button
            onClick={onNavigate}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 mt-2 overflow-y-auto overflow-x-hidden space-y-3">
        {/* Main Menu Section */}
        <div>
          {(!isCollapsed || isMobile) && (
            <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-white/35">
              Main Menu
            </p>
          )}
          <div className="flex flex-col space-y-0.5">
            {mainMenuNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-3 rounded-lg transition-colors duration-150',
                    isCollapsed && !isMobile
                      ? 'justify-center px-0 py-2.5'
                      : 'px-3 py-2',
                    isActive
                      ? 'bg-white/[0.15] text-white font-semibold'
                      : 'text-white/60 hover:bg-white/[0.08] hover:text-white'
                  )}
                  title={isCollapsed && !isMobile ? item.label : undefined}
                >
                  <Icon
                    size={18}
                    className={cn('shrink-0', isActive ? 'text-white' : 'text-white/60')}
                  />
                  {(!isCollapsed || isMobile) && (
                    <span className="text-[13px] font-medium whitespace-nowrap truncate">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Other Section */}
        {otherNav.length > 0 && (
          <div>
            {(!isCollapsed || isMobile) && (
              <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-white/35">
                Other
              </p>
            )}
            <div className="flex flex-col space-y-0.5">
              {otherNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center gap-3 rounded-lg transition-colors duration-150',
                      isCollapsed && !isMobile
                        ? 'justify-center px-0 py-2.5'
                        : 'px-3 py-2',
                      isActive
                        ? 'bg-white/[0.15] text-white font-semibold'
                        : 'text-white/60 hover:bg-white/[0.08] hover:text-white'
                    )}
                    title={isCollapsed && !isMobile ? item.label : undefined}
                  >
                    <Icon
                      size={18}
                      className={cn('shrink-0', isActive ? 'text-white' : 'text-white/60')}
                    />
                    {(!isCollapsed || isMobile) && (
                      <span className="text-[13px] font-medium whitespace-nowrap truncate">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom User Profile & Sign Out */}
      <div className="px-2.5 pb-4 pt-2 border-t border-white/10 mt-1 shrink-0 space-y-1">
        {(!isCollapsed || isMobile) && (
          <div className="px-3 py-2.5 bg-white/[0.06] rounded-xl border border-white/[0.08]">
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
            <p className="text-white/40 text-[11px] truncate">
              {session?.user?.email || ''}
            </p>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 rounded-lg text-white/50 hover:text-red-400 hover:bg-red-400/10 transition-colors duration-150 w-full cursor-pointer',
            isCollapsed && !isMobile ? 'justify-center px-0 py-2.5' : 'px-3 py-2'
          )}
          title={isCollapsed && !isMobile ? 'Logout' : undefined}
        >
          {isPending
            ? <Loader2 size={18} className="shrink-0 animate-spin" />
            : <LogOut size={18} className="shrink-0" />
          }
          {(!isCollapsed || isMobile) && (
            <span className="text-[13px] font-medium whitespace-nowrap">Sign Out</span>
          )}
        </button>
      </div>
    </aside>
  );
}
