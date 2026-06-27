"use client";

/**
 * components/DashboardHeader.tsx – Dashboard header with user info and logout.
 */

import { useAuth } from '@/context/AuthProvider';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  profile?: {
    name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  } | null;
}

interface Props {
  user: User;
}

export function DashboardHeader({ user }: Props) {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <header className="glass border-b border-slate-800 sticky top-0 z-40 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">AI Kubernetes Agent</span>
            </Link>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-slate-400">Signed in as</span>
              <span className="text-white font-medium">{user.profile?.name || user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}