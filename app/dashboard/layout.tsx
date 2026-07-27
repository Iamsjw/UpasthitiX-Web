'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  BookOpen,
  FileSpreadsheet,
  LogOut,
  ShieldAlert,
  UserCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin glow-indigo" />
          <p className="text-xs text-zinc-400 font-medium">Authenticating Upasthitix Portal...</p>
        </div>
      </div>
    );
  }

  const isAdmin = role === 'admin';

  const teacherNav = [
    { name: 'Dashboard Overview', href: '/dashboard/teacher', icon: LayoutDashboard },
    { name: 'Completed Classes & Sessions', href: '/dashboard/teacher/sessions', icon: CalendarCheck },
    { name: 'Attendance Reports & CSV', href: '/dashboard/teacher/reports', icon: FileSpreadsheet },
  ];

  const adminNav = [
    { name: 'System Overview', href: '/dashboard/admin', icon: LayoutDashboard },
    { name: 'User Management', href: '/dashboard/admin/users', icon: Users },
    { name: 'Classes & Subjects', href: '/dashboard/admin/classes', icon: BookOpen },
    { name: 'Institutional CSV Reports', href: '/dashboard/admin/reports', icon: FileSpreadsheet },
  ];

  const navItems = isAdmin ? adminNav : teacherNav;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black font-sans text-zinc-100 flex overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Glass Sidebar */}
      <aside className="w-64 glass-panel border-r border-white/10 flex flex-col justify-between p-5 shrink-0 z-20">
        <div>
          {/* Logo Header */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-white/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/20 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Zap className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                Upasthitix <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">WEB</span>
              </h2>
              <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mt-0.5">
                {isAdmin ? 'Admin Console' : 'Teacher Workspace'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 border border-indigo-500/40 text-white shadow-lg shadow-indigo-500/15'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile Card & Sign Out */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-bold text-sm flex items-center justify-center shadow-md">
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
          >
            <LogOut className="w-4 h-4" /> Sign Out Portal
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        {/* Glass Top Navbar */}
        <header className="h-16 border-b border-white/10 bg-zinc-950/60 backdrop-blur-xl px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500">Upasthitix /</span>
            <span className="text-xs font-bold text-white tracking-wide">
              {isAdmin ? 'Institutional Control Center' : 'Teacher Attendance Portal'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-sm ${
                isAdmin
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isAdmin ? <ShieldAlert className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {role?.toUpperCase()} MODE
            </span>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
