'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  Users,
  UserCheck,
  CalendarCheck,
  ArrowRight,
  ShieldCheck,
  Radio,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    activeSessions: 0,
  });
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const { data: usersData } = await supabase.from('users').select('role');
      if (usersData) {
        const students = usersData.filter((u: any) => u.role === 'student').length;
        const teachers = usersData.filter((u: any) => u.role === 'teacher').length;
        setStats((prev) => ({
          ...prev,
          totalStudents: students,
          totalTeachers: teachers,
        }));
      }

      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*, classes(name), subjects(name), users(name)')
        .order('start_time', { ascending: false });

      if (sessionsData) {
        const active = sessionsData.filter((s: any) => s.is_active).length;
        setStats((prev) => ({
          ...prev,
          totalClasses: sessionsData.length,
          activeSessions: active,
        }));
        const parsed = sessionsData.map((s: any) => ({
          ...s,
          subject_name: s.subjects?.name || s.subject_name || 'Subject Class',
          class_name: s.classes?.name || s.class_name || 'General Class',
          teacher_name: s.users?.name || 'Faculty Member',
        }));
        setRecentSessions(parsed.slice(0, 6));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Institutional Control Center <ShieldCheck className="w-6 h-6 text-amber-400" />
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time System Database Overview & Administrative Management
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/dashboard/admin/users"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition-all"
          >
            Manage Users
          </Link>
          <Link
            href="/dashboard/admin/reports"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
          >
            Export Institutional Reports <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Total Students</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalStudents}</p>
          <p className="text-xs text-zinc-500 mt-1">Registered in database</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Active Teachers</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalTeachers}</p>
          <p className="text-xs text-emerald-400 mt-1 font-semibold">Faculty in database</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Conducted Sessions</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalClasses}</p>
          <p className="text-xs text-zinc-500 mt-1">Logged sessions</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Active Live Sessions</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{stats.activeSessions}</p>
          <p className="text-xs text-amber-300 mt-1 font-semibold">Ongoing class</p>
        </div>
      </div>

      {/* Live Activity Table */}
      <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">System Activity Stream (Database)</h3>
          <Link href="/dashboard/admin/reports" className="text-xs font-bold text-indigo-400 hover:underline">
            View All Reports
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">Querying database activity...</div>
        ) : recentSessions.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl p-8">
            <p className="text-zinc-300 font-bold mb-1">No system activity logged in database yet.</p>
            <p className="text-[11px] text-zinc-500">
              Classes started from the mobile app will record live sessions here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">
                      {s.subject_name}
                    </h4>
                    {s.is_active ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Radio className="w-3 h-3 animate-pulse" /> LIVE NOW
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                        COMPLETED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Class: <span className="text-zinc-200 font-semibold">{s.class_name}</span> • Faculty: <span className="text-indigo-300 font-semibold">{s.teacher_name}</span>
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Started: {new Date(s.start_time).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 block">
                    Code: {s.code}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
