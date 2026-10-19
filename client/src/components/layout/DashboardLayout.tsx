'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';
import { DASHBOARD_ROLES, canAccess, getFirstAllowedRoute, ROLE_CONFIG, Role } from '@/lib/role-config';
import { useRolePermissionsQuery } from '@/hooks/useQueryHooks';
import { ShieldAlert } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  const { data: session, isPending } = useSession();
  const { data: customPermissions, isLoading: isPermissionsLoading } = useRolePermissionsQuery();
  const router = useRouter();
  const pathname = usePathname();

  // Authentication & Role Authorization Guard
  useEffect(() => {
    if (isPending || isPermissionsLoading) return;

    if (!session?.user) {
      // User is unauthenticated — redirect to login page
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    const role = ((session.user as any)?.role as Role) || 'user';

    // Verify role belongs to dashboard roles
    if (!DASHBOARD_ROLES.includes(role)) {
      router.replace('/');
      return;
    }

    // Role-based route access check
    if (!canAccess(role, pathname, customPermissions)) {
      const allowedHome = getFirstAllowedRoute(role, customPermissions);

      // If user landed on /dashboard upon login but doesn't have /dashboard permission:
      if (pathname === '/dashboard' && allowedHome !== '/dashboard') {
        router.replace(allowedHome);
        return;
      }

      setIsAccessDenied(true);
      return;
    } else {
      setIsAccessDenied(false);
    }
  }, [session, isPending, isPermissionsLoading, customPermissions, router, pathname]);

  // Close mobile sidebar on route change or resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  if (isPending) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-lavender">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-lavender w-full overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          onNavigate={() => {}}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          {/* Sidebar drawer */}
          <div
            className="absolute left-0 top-0 h-full w-72 animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              isCollapsed={false}
              setIsCollapsed={() => {}}
              isMobile
              onNavigate={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div id="main-scroll-container" className="flex-1 flex flex-col h-screen relative overflow-y-auto scroll-smooth">
        <Topbar onMobileMenuToggle={() => setIsMobileOpen(!isMobileOpen)} />
        <main className="flex-1 p-3 sm:p-4 md:p-8">
          {isAccessDenied ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
              <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-border shadow-sm space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                  <ShieldAlert size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900">Access Restricted</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Your role (<span className="font-bold text-gray-700">{ROLE_CONFIG[((session?.user as any)?.role as Role)]?.label || (session?.user as any)?.role || 'user'}</span>) does not have permission to view <code className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-xs">{pathname}</code>.
                  </p>
                </div>
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => router.push(getFirstAllowedRoute((session?.user as any)?.role || 'super_admin', customPermissions))}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-600 transition-colors cursor-pointer shadow-sm"
                  >
                    Go to Allowed Main Page
                  </button>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
