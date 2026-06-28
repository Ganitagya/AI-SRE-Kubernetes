"@react-navigation/native";

// app/(dashboard)/layout.tsx – Protected dashboard layout with auth guard.
// Redirects to login if user is not authenticated.

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthProvider';
import { DashboardHeader } from '@/components/DashboardHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded, isLoading } = useAuth();

  useEffect(() => {
    if (isLoaded && !user) {
      // Redirect to login with current path as redirect destination
      const searchParams = new URLSearchParams();
      searchParams.set('callbackUrl', pathname);
      router.push(`/login?${searchParams.toString()}`);
    }
  }, [isLoaded, user, pathname, router]);

  // Show loading while checking auth
  if (!isLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center">
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

  // If user is not authenticated, don't render the layout (redirect will happen in useEffect)
  if (!user) {
    return null;
  }

  // User is authenticated - show dashboard layout
  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader user={user} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}