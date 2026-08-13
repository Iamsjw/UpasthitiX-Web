'use client';

import React, { useEffect, useState } from 'react';
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
  Zap,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin glow-indigo" />
          <p className="text-xs text-zinc-400 font-medium tracking-wide">Authenticating Upasthitix Portal...</p>
        </div>
      </div>
    );
  }

  const isAdmin = role === 'admin';
  const isStudent = role === 'student';

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

  const studentNav = [
    { name: 'Attendance Dashboard', href: '/dashboard/student', icon: LayoutDashboard },
  ];

  const navItems = isAdmin ? adminNav : isStudent ? studentNav : teacherNav;

  const SidebarContent = () => (
    <div className="flex flex-col justify-between h-full p-5">
      <div>
        {/* Logo Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 border border-white/20 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <Zap className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
              Upasthitix <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">WEB</span>
            </h2>
            <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mt-0.5">
              {isAdmin ? 'Admin Console' : isStudent ? 'Student Portal' : 'Teacher Workspace'}
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
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 border border-indigo-500/40 text-white shadow-lg shadow-indigo-500/15'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile Card & Sign Out */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-bold text-sm flex items-center justify-center shadow-md shrink-0">
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
    </div>
  );

  return (
    <div className="h-screen w-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black font-sans text-zinc-100 flex flex-col md:flex-row overflow-hidden relative">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Desktop Glass Sidebar - Locked Fixed Viewport Height */}
      <aside className="hidden md:flex w-64 glass-panel border-r border-white/10 shrink-0 z-20 h-screen flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 md:hidden transition-opacity duration-300 animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Glass Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 glass-panel border-r border-white/10 z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative h-full flex flex-col">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all z-10"
            aria-label="Close Mobile Menu"
          >
            <X className="w-5 h-5" />
          </button>
          <SidebarContent />
        </div>
      </aside>

      {/* Main Content Viewport - Independently Scrollable */}
      <div className="flex-1 flex flex-col min-w-0 z-10 h-screen overflow-y-auto overflow-x-hidden">
        {/* Glass Top Navbar */}
        <header className="h-16 shrink-0 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 md:hidden transition-all cursor-pointer"
              aria-label="Open Mobile Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-medium text-zinc-500 hidden sm:inline">Upasthitix /</span>
              <span className="text-xs md:text-sm font-bold text-white tracking-wide truncate">
                {isAdmin ? 'Institutional Control Center' : isStudent ? 'Student Attendance Portal' : 'Teacher Attendance Portal'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border shadow-sm ${
                isAdmin
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : isStudent
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {isAdmin ? <ShieldAlert className="w-3.5 h-3.5" /> : isStudent ? <Zap className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              <span>{role?.toUpperCase()}</span>
            </span>
          </div>
        </header>

        {/* Dynamic Page Container with Smooth Animation */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
