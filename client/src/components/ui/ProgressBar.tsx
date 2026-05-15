'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // When the route changes, complete the progress and hide
    setProgress(100);
    const timer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // We can't easily hook into Next.js Link click without a custom Link component
  // but we can listen for any "click" on links to start the bar
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && 
          anchor.href && 
          anchor.href.startsWith(window.location.origin) && 
          !anchor.target &&
          anchor.href !== window.location.href) {
        
        setVisible(true);
        setProgress(30);
        
        // Simulate progress
        const interval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) return prev;
            return prev + (90 - prev) * 0.1;
          });
        }, 150);
        
        (window as any)._progressBarInterval = interval;
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => {
      document.removeEventListener('click', handleAnchorClick);
      if ((window as any)._progressBarInterval) clearInterval((window as any)._progressBarInterval);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      <div 
        className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function ProgressBarSuspense() {
  return (
    <Suspense fallback={null}>
      <ProgressBar />
    </Suspense>
  );
}
