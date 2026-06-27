"use client";

/**
 * context/AuthProvider.tsx – React context for InsForge authentication.
 * Provides user state, session management, and auth methods.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { insforge } from '@/lib/insforge';

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  providers?: string[];
  createdAt: string;
  updatedAt: string;
  profile?: {
    name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  } | null;
  metadata?: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoaded: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  verifyEmail: (email: string, otp: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch current user on mount
  useEffect(() => {
    let mounted = true;

    // Set loaded after 1 second max - don't wait for getCurrentUser
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setIsLoaded(true);
        setIsLoading(false);
      }
    }, 1000);

    async function loadUser() {
      try {
        const { data } = await insforge.auth.getCurrentUser();
        clearTimeout(timeoutId);
        if (mounted && data?.user) {
          setUser(data.user as User);
        }
        setIsLoaded(true);
        setIsLoading(false);
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('Failed to load user:', err);
        if (mounted) {
          setIsLoaded(true);
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await insforge.auth.signInWithPassword({ email, password });
      if (data?.user) {
        setUser(data.user as User);
      }
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await insforge.auth.signUp({
        email,
        password,
        name,
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      });
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await insforge.auth.verifyEmail({ email, otp });
      if (data?.user) {
        setUser(data.user as User);
      }
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await insforge.auth.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    const { data } = await insforge.auth.getCurrentUser();
    if (data?.user) {
      setUser(data.user as User);
    } else {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isLoaded, signIn, signUp, verifyEmail, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}