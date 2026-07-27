'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ShieldCheck, Lock, Mail, User, ArrowRight, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleInput, setRoleInput] = useState<'teacher' | 'admin'>('teacher');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter email and password');
      return;
    }
    if (isSignUpMode && !name.trim()) {
      setErrorMsg('Please enter your name');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    if (isSignUpMode) {
      const res = await signUp(email, password, name, roleInput);
      setIsSubmitting(false);

      if (res.success) {
        if (roleInput === 'admin') {
          router.push('/dashboard/admin');
        } else {
          router.push('/dashboard/teacher');
        }
      } else {
        setErrorMsg(res.error || 'Registration failed. Check credentials.');
      }
    } else {
      const res = await login(email, password);
      setIsSubmitting(false);

      if (res.success) {
        if (email.includes('admin')) {
          router.push('/dashboard/admin');
        } else {
          router.push('/dashboard/teacher');
        }
      } else {
        setErrorMsg(res.error || 'Invalid email or password');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Upasthitix Portal</h1>
          <p className="text-xs text-zinc-400 mt-1">
            {isSignUpMode
              ? 'Create a new Admin or Teacher account in Supabase'
              : 'Sign in to access live database analytics & reports'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isSignUpMode && (
            <div>
              <label className="block text-zinc-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Rajesh Sharma"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          {isSignUpMode && (
            <div>
              <label className="block text-zinc-300 font-semibold mb-1.5 uppercase tracking-wider text-[11px]">
                Account Role
              </label>
              <select
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none transition-all"
              >
                <option value="teacher">Teacher</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 text-sm mt-6"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : isSignUpMode ? (
              <>
                Create Database Account <UserPlus className="w-4 h-4" />
              </>
            ) : (
              <>
                Sign In to Portal <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUpMode(!isSignUpMode);
              setErrorMsg('');
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            {isSignUpMode
              ? 'Already have an account? Sign In'
              : 'Need a new account? Register here'}
          </button>
        </div>
      </div>
    </div>
  );
}
