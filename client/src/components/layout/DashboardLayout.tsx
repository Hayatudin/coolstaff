'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { cn } from '@/lib/utils';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/login');
    }
  }, [session, isPending, router]);

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
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="text-sm font-semibold text-text-tertiary">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
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
