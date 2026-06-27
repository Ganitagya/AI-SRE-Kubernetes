"use client";

/**
 * app/page.tsx – Shows login page if not authenticated, dashboard if authenticated.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { DashboardPage } from '@/components/DashboardPage';
import LoginPage from '@/app/(auth)/login/page';

export default function HomePage() {
  const { isLoaded, user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading while checking auth (or before mount)
  if (!mounted || !isLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="animate-spin h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading…</span>
        </div>
      </main>
    );
  }

  // Not authenticated - show login page
  if (!user) {
    return <LoginPage />;
  }

  // Authenticated - show dashboard
  return <DashboardPage />;
}