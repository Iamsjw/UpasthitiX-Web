'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase, SessionModel } from '@/lib/supabase';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Radio,
  BookOpen,
} from 'lucide-react';

export default function TeacherOverviewPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<SessionModel | null>(null);

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sessions')
        .select('*, classes(name), subjects(name), users(name)')
        .order('start_time', { ascending: false });

      if (user?.id) {
        query = query.eq('teacher_id', user.id);
      }

      const { data, error } = await query;

      if (!error && data) {
        const parsedSessions: SessionModel[] = data.map((item: any) => ({
          ...item,
          class_name: item.classes?.name || item.class_name || 'Class',
          subject_name: item.subjects?.name || item.subject_name || 'Subject',
          teacher_name: item.users?.name || item.teacher_name || 'Teacher',
        }));

        setSessions(parsedSessions);
        const active = parsedSessions.find((s) => s.is_active);
        if (active) setActiveSession(active);
      }
    } catch (e) {
      console.error('Failed to fetch sessions from database:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.name || 'Professor'} 👋
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Teacher Live Database Overview & Completed Sessions
          </p>
        </div>

        <Link
          href="/dashboard/teacher/sessions"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
        >
          View Completed Classes <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Live Active Session Status Banner */}
      {activeSession ? (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-emerald-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  LIVE SESSION ACTIVE IN DATABASE
                </span>
                <span className="text-xs font-mono text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 font-bold">
                  CODE: {activeSession.code}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                {activeSession.subject_name || 'Subject Class'}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Class: {activeSession.class_name || 'Assigned Class'} • Started:{' '}
                {new Date(activeSession.start_time).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/teacher/sessions"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-all text-center"
          >
            Monitor Live Roster
          </Link>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-zinc-400">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>No active BLE session currently broadcasting in database.</span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">Status: Connected to Supabase</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl glass-card border border-white/10 hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Conducted Sessions</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">{sessions.length}</p>
          <p className="text-xs text-zinc-500 mt-1 font-medium">Database session records</p>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-white/10 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Classes</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">
            {sessions.filter((s) => !s.is_active).length}
          </p>
          <p className="text-xs text-zinc-500 mt-1 font-medium">Closed attendance logs</p>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-white/10 hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Active Broadcasts</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">{activeSession ? 1 : 0}</p>
          <p className="text-xs text-zinc-500 mt-1 font-medium">Live active sessions</p>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="p-6 rounded-2xl glass-panel border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white tracking-tight">Recent Completed Sessions (Database)</h3>
          <Link href="/dashboard/teacher/sessions" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
            View All →
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">Loading database records...</div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-2xl p-8">
            <p className="text-zinc-400 font-semibold mb-1">No session records found in database.</p>
            <p className="text-[11px] text-zinc-500">
              When a teacher starts a class on the Upasthitix Mobile App, sessions will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl bg-zinc-950/60 border border-white/5 hover:border-white/15 flex items-center justify-between transition-all duration-200"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {s.subject_name || 'Subject Class'}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Class: {s.class_name || 'N/A'} • Started: {new Date(s.start_time).toLocaleString()}
                  </p>
                </div>

                <span className="px-3 py-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Logged
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
