'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  UserPlus,
  Eye,
  EyeOff,
  Zap,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roleInput, setRoleInput] = useState<'teacher' | 'admin'>('teacher');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, signUp } = useAuth();
  const router = useRouter();

  const handleFillDemo = (type: 'admin' | 'teacher') => {
    setIsSignUpMode(false);
    setErrorMsg('');
    if (type === 'admin') {
      setEmail('admin@upasthitix.edu');
      setPassword('admin123');
    } else {
      setEmail('teacher@upasthitix.edu');
      setPassword('teacher123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    if (isSignUpMode && !name.trim()) {
      setErrorMsg('Please enter your full name.');
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
        setErrorMsg(res.error || 'Registration failed. Please try again.');
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
        setErrorMsg(res.error || 'Invalid email or password credentials.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Dynamic Glowing Background Blobs */}
      <div className="fixed -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed -bottom-24 -right-12 w-96 h-96 bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="w-full max-w-md glass-panel border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-2xl transition-all duration-300">
        
        {/* Top Logo Badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 border border-white/20 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 mb-4 glow-indigo">
            <Zap className="w-7 h-7 fill-white text-white" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Upasthitix <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">WEB</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-xs">
            {isSignUpMode
              ? 'Register a new Admin or Teacher account'
              : 'Sign in to access real-time institutional attendance & analytics'}
          </p>
        </div>

        {/* Mode Switcher Segmented Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10 mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsSignUpMode(false);
              setErrorMsg('');
            }}
            className={`py-2.5 rounded-xl transition-all ${
              !isSignUpMode
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUpMode(true);
              setErrorMsg('');
            }}
            className={`py-2.5 rounded-xl transition-all ${
              isSignUpMode
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Quick Demo Login Chips */}
        {!isSignUpMode && (
          <div className="mb-6 p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 text-center">
              ⚡ Quick Demo Credentials Fill:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('teacher')}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold transition-all text-center truncate"
              >
                Teacher Demo
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('admin')}
                className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-purple-300 text-[11px] font-semibold transition-all text-center truncate"
              >
                Admin Demo
              </button>
            </div>
          </div>
        )}

        {/* Error Notification Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium shadow-sm">
            {errorMsg}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUpMode && (
            <div>
              <label className="block text-zinc-300 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Rajesh Sharma"
                  className="w-full bg-zinc-950/80 border border-white/10 focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@upasthitix.edu"
                className="w-full bg-zinc-950/80 border border-white/10 focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950/80 border border-white/10 focus:border-indigo-500 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Toggle Password Visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isSignUpMode && (
            <div>
              <label className="block text-zinc-300 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                Select System Role
              </label>
              <select
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value as any)}
                className="w-full bg-zinc-950/80 border border-white/10 focus:border-indigo-500 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
              >
                <option value="teacher">Teacher (Attendance & Reports)</option>
                <option value="admin">Administrator (Full Control)</option>
              </select>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-2xl shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 text-xs sm:text-sm mt-6 border border-white/10"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : isSignUpMode ? (
              <>
                <span>Create Database Account</span> <UserPlus className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Sign In to Portal</span> <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
