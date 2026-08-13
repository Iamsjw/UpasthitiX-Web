'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, UserModel } from './supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: UserModel | null;
  session: Session | null;
  role: 'admin' | 'teacher' | 'student' | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  login: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  logout: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserModel | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'admin' | 'teacher' | 'student' | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user profile from public.users table using authenticated session ID
  const fetchUserProfile = async (authUser: User) => {
    try {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (dbUser) {
        const userObj: UserModel = {
          id: dbUser.id,
          name: dbUser.name || authUser.email?.split('@')[0] || 'User',
          email: dbUser.email || authUser.email || '',
          role: (dbUser.role as any) || 'teacher',
          class_id: dbUser.class_id,
          roll_no: dbUser.roll_no,
        };
        setUser(userObj);
        setRole(userObj.role);
        localStorage.setItem('upasthitix_user', JSON.stringify(userObj));
      } else {
        // Fallback if profile row in users table is missing
        const fallbackRole = (authUser.user_metadata?.role as any) ||
          (authUser.email?.includes('admin') ? 'admin' : 'teacher');

        const userObj: UserModel = {
          id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          role: fallbackRole,
        };

        // Create user row in public.users table
        await supabase.from('users').upsert({
          id: authUser.id,
          name: userObj.name,
          email: userObj.email,
          role: userObj.role,
        });

        setUser(userObj);
        setRole(userObj.role);
        localStorage.setItem('upasthitix_user', JSON.stringify(userObj));
      }
    } catch (err) {
      console.error('[Auth] Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      setSession(initSession);
      if (initSession?.user) {
        fetchUserProfile(initSession.user).finally(() => setLoading(false));
      } else {
        // Check localStorage backup
        const savedUser = localStorage.getItem('upasthitix_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            setRole(parsed.role);
          } catch (e) {
            console.error(e);
          }
        }
        setLoading(false);
      }
    });

    // 2. Listen to Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        fetchUserProfile(currentSession.user);
      } else {
        setUser(null);
        setRole(null);
        localStorage.removeItem('upasthitix_user');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim(),
      });

      if (error) {
        // Fallback: Check if user exists in public.users table (e.g. imported or created without Auth row)
        const { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (dbUser) {
          // Attempt auto sign-up for this existing DB user profile
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password.trim(),
            options: {
              data: { name: dbUser.name, role: dbUser.role },
            },
          });

          if (signUpData?.user) {
            // Re-link users table row ID to newly generated Auth UUID
            await supabase.from('users').update({ id: signUpData.user.id }).eq('email', cleanEmail);
            await fetchUserProfile(signUpData.user);
            setLoading(false);
            return { success: true };
          }
        }

        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        await fetchUserProfile(data.user);
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { success: false, error: 'Sign in failed' };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Authentication error' };
    }
  };

  const signUp = async (email: string, password: string, name: string, userRole: string) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password.trim(),
        options: {
          data: { name: name.trim(), role: userRole },
        },
      });

      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Upsert into public.users table
        await supabase.from('users').upsert({
          id: data.user.id,
          name: name.trim(),
          email: cleanEmail,
          role: userRole,
        });

        await fetchUserProfile(data.user);
        setLoading(false);
        return { success: true };
      }

      setLoading(false);
      return { success: false, error: 'Registration failed' };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Registration error' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    localStorage.removeItem('upasthitix_user');
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchUserProfile(session.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        login,
        signUp,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
