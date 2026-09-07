'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';
import { DASHBOARD_ROLES, canAccess, Role } from '@/lib/role-config';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Authentication & Role Authorization Guard
  useEffect(() => {
    if (isPending) return;

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
    if (!canAccess(role, pathname)) {
      if (role === 'agency') {
        router.replace('/agency/contracts');
      } else if (role === 'video_uploader') {
        router.replace('/video-uploads');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [session, isPending, router, pathname]);

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
          {children}
        </main>
      </div>
    </div>
  );
}
