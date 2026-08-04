'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MAIN_COLLAPSED_PL, MAIN_EXPANDED_PL } from './shell-metrics';
import { useAuthStore, useUIStore } from '../store';
import { ErrorBoundary } from '../components/shared/ErrorBoundary';
import { useSocket } from '../hooks/useSocket';
import { useAuthBootstrap } from '../hooks';
import { AdaptivePathNudge } from '../features/learning-plan/AdaptivePathNudge';

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { sidebarCollapsed } = useUIStore();
  const { hasHydrated, isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isFullWidthPage = pathname?.startsWith('/ai');

  useAuthBootstrap();
  useSocket();

  React.useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-canvas-cream p-6">
        <div className="h-14 rounded-lg border border-black/10 bg-white/80" />
        <div className="mx-auto mt-12 max-w-6xl space-y-6">
          <div className="h-12 w-72 rounded-lg skeleton" />
          <div className="grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-36 rounded-lg skeleton" />
            ))}
          </div>
          <div className="h-80 rounded-lg skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-[100dvh] text-ink">
      <Sidebar />
      <Topbar />
      <AdaptivePathNudge role={user?.role} />
      <main
        id="main-content"
        tabIndex={-1}
        className={`pt-14 min-h-screen transition-all duration-200 ${
          sidebarCollapsed ? MAIN_COLLAPSED_PL : MAIN_EXPANDED_PL
        }`}
      >
        <div
          className={
            isFullWidthPage
              ? 'w-full p-4 sm:p-6 lg:py-9'
              : 'mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:px-8 lg:py-9'
          }
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
};
