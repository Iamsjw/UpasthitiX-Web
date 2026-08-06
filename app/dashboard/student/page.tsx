'use client';

import React, { useEffect, useState } from 'react';
import { supabase, UserModel, SessionModel, AttendanceRecord } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import {
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Key,
  Smartphone,
  ShieldCheck,
  Radio,
  Search,
  Zap,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<UserModel | null>(null);
  const [className, setClassName] = useState<string>('Unassigned');

  // Stats
  const [stats, setStats] = useState({
    totalClasses: 0,
    attendedClasses: 0,
    absentClasses: 0,
    percentage: 0,
  });

  // Active Sessions & History
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<any[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'present' | 'absent'>('ALL');
  const [subjectList, setSubjectList] = useState<string[]>([]);

  // Session Code Entry Form State
  const [sessionCodeInput, setSessionCodeInput] = useState('');
  const [codeSubmitting, setCodeSubmitting] = useState(false);
  const [codeMessage, setCodeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Device Reset State
  const [resettingDevice, setResettingDevice] = useState(false);
  const [deviceMsg, setDeviceMsg] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchStudentDashboardData();
    }
  }, [user]);

  const fetchStudentDashboardData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // 1. Fetch detailed student profile
      const { data: dbUser } = await supabase
        .from('users')
        .select('*, classes(name)')
        .eq('id', user.id)
        .maybeSingle();

      if (dbUser) {
        const classTitle = dbUser.classes?.name || dbUser.class_name || 'Unassigned Class';
        setStudentProfile({
          ...dbUser,
          className: classTitle,
        });
        setClassName(classTitle);

        const studentClassId = dbUser.class_id;

        // 2. Fetch Sessions conducted for student's class (or all if no class assigned)
        let sessionsQuery = supabase.from('sessions').select('*, subjects(name), classes(name), users(name)');
        if (studentClassId) {
          sessionsQuery = sessionsQuery.eq('class_id', studentClassId);
        }
        const { data: classSessions } = await sessionsQuery.order('start_time', { ascending: false });

        // 3. Fetch Student's Attendance Records
        const { data: myAttendance } = await supabase
          .from('attendance')
          .select('*, sessions(*, subjects(name), classes(name), users(name))')
          .eq('student_id', user.id)
          .order('timestamp', { ascending: false });

        const attendanceMap = new Map<string, any>();
        if (myAttendance) {
          myAttendance.forEach((att: any) => {
            attendanceMap.set(att.session_id, att);
          });
        }

        // Active sessions list
        const activeList: any[] = [];
        const historyList: any[] = [];
        const subjectsFound = new Set<string>();

        if (classSessions) {
          classSessions.forEach((sess: any) => {
            const subjName = sess.subjects?.name || sess.subject_name || 'General Subject';
            subjectsFound.add(subjName);

            const isAttended = attendanceMap.has(sess.id) && attendanceMap.get(sess.id)?.status === 'present';
            const attRecord = attendanceMap.get(sess.id);

            const sessionItem = {
              id: sess.id,
              code: sess.code,
              subject_name: subjName,
              class_name: sess.classes?.name || sess.class_name || 'General Class',
              teacher_name: sess.users?.name || 'Faculty',
              start_time: sess.start_time,
              end_time: sess.end_time,
              is_active: sess.is_active,
              status: isAttended ? 'present' : 'absent',
              timestamp: attRecord?.timestamp || sess.start_time,
            };

            if (sess.is_active && !isAttended) {
              activeList.push(sessionItem);
            }
            historyList.push(sessionItem);
          });
        }

        setActiveSessions(activeList);
        setAttendanceHistory(historyList);
        setSubjectList(Array.from(subjectsFound));

        // 4. Calculate Stats
        const total = historyList.length;
        const attended = historyList.filter((h) => h.status === 'present').length;
        const absent = total - attended;
        const pct = total > 0 ? Math.round((attended / total) * 100) : 100;

        setStats({
          totalClasses: total,
          attendedClasses: attended,
          absentClasses: absent,
          percentage: pct,
        });
      }
    } catch (err) {
      console.error('[Student Dashboard] Load Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter attendance history
  useEffect(() => {
    let result = [...attendanceHistory];

    if (filterSubject !== 'ALL') {
      result = result.filter((item) => item.subject_name === filterSubject);
    }

    if (filterStatus !== 'ALL') {
      result = result.filter((item) => item.status === filterStatus);
    }

    setFilteredHistory(result);
  }, [filterSubject, filterStatus, attendanceHistory]);

  // Submit Session Code to Mark Attendance
  const handleMarkAttendanceByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionCodeInput.trim() || !user?.id) return;

    setCodeSubmitting(true);
    setCodeMessage(null);

    try {
      const enteredCode = sessionCodeInput.trim().toUpperCase();

      // Look up active session matching code
      const { data: sessionData, error: sessErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', enteredCode)
        .eq('is_active', true)
        .maybeSingle();

      if (sessErr || !sessionData) {
        setCodeMessage({
          type: 'error',
          text: 'Invalid or inactive session code. Please check with your instructor.',
        });
        setCodeSubmitting(false);
        return;
      }

      // Check if already marked
      const { data: existingAtt } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', user.id)
        .eq('session_id', sessionData.id)
        .eq('status', 'present')
        .maybeSingle();

      if (existingAtt) {
        setCodeMessage({
          type: 'success',
          text: 'Attendance is already recorded for this session!',
        });
        setCodeSubmitting(false);
        setSessionCodeInput('');
        return;
      }

      // Insert attendance record
      const { error: insertErr } = await supabase.from('attendance').insert({
        student_id: user.id,
        session_id: sessionData.id,
        timestamp: new Date().toISOString(),
        status: 'present',
      });

      if (insertErr) {
        setCodeMessage({
          type: 'error',
          text: 'Failed to record attendance: ' + insertErr.message,
        });
      } else {
        setCodeMessage({
          type: 'success',
          text: 'Attendance successfully marked present!',
        });
        setSessionCodeInput('');
        fetchStudentDashboardData();
      }
    } catch (err: any) {
      setCodeMessage({
        type: 'error',
        text: err.message || 'An error occurred while marking attendance.',
      });
    } finally {
      setCodeSubmitting(false);
    }
  };

  // Self-Service Device Reset
  const handleResetDevice = async () => {
    if (!user?.id) return;
    if (!confirm('Request device ID unbind? This will release your account for login on a new device.')) return;

    setResettingDevice(true);
    setDeviceMsg('');

    try {
      const { error } = await supabase.from('users').update({ device_id: null }).eq('id', user.id);

      if (error) {
        setDeviceMsg('Failed to reset device binding: ' + error.message);
      } else {
        setDeviceMsg('Device binding successfully reset!');
        fetchStudentDashboardData();
      }
    } catch (e: any) {
      setDeviceMsg('Reset failed: ' + e.message);
    } finally {
      setResettingDevice(false);
    }
  };

  // Visual status color styling for attendance percentage
  const getPercentageBadge = (pct: number) => {
    if (pct >= 75) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        label: 'Good Standing (≥75%)',
      };
    }
    if (pct >= 60) {
      return {
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        label: 'Attention Needed (60-74%)',
      };
    }
    return {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      label: 'Critical Low (<60%)',
    };
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin glow-indigo" />
        <p className="text-xs text-zinc-400 font-medium">Loading Student Dashboard...</p>
      </div>
    );
  }

  const badgeStyle = getPercentageBadge(stats.percentage);

  return (
    <div className="space-y-8">
      {/* Header Profile Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-white/10 relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-zinc-900/60 to-black">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/20 text-white flex items-center justify-center shadow-xl text-xl font-bold shrink-0">
              {studentProfile?.name?.[0]?.toUpperCase() || 'S'}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">{studentProfile?.name || user?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  STUDENT
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 flex flex-wrap items-center gap-3">
                <span>Roll No: <strong className="text-zinc-200 font-mono">{studentProfile?.roll_no || 'N/A'}</strong></span>
                <span>•</span>
                <span>Class: <strong className="text-indigo-300 font-semibold">{className}</strong></span>
                <span>•</span>
                <span className="text-zinc-500">{studentProfile?.email || user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchStudentDashboardData}
              className="p-3 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-2xl border border-zinc-700/60 transition-all flex items-center gap-2 text-xs font-semibold"
              title="Refresh Dashboard"
            >
              <RefreshCw className="w-4 h-4" /> Sync Status
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl glass-card border border-white/10 hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Total Conducted</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">{stats.totalClasses}</p>
          <p className="text-xs text-zinc-500 mt-1">Total class sessions held</p>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-white/10 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Attended Classes</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-400 tracking-tight">{stats.attendedClasses}</p>
          <p className="text-xs text-emerald-400/80 mt-1 font-medium">Verified present sessions</p>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-white/10 hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Missed Sessions</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-rose-400 tracking-tight">{stats.absentClasses}</p>
          <p className="text-xs text-rose-400/80 mt-1 font-medium">Unattended or absent</p>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-white/10 hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-zinc-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Attendance Rate</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">{stats.percentage}%</p>
          <div className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badgeStyle.bg}`}>
            {badgeStyle.label}
          </div>
        </div>
      </div>

      {/* Code Entry & Live Session Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Code Entry Card */}
        <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-4 lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Mark Attendance via Session Code</h3>
              <p className="text-xs text-zinc-400">
                Enter the 6-digit session code provided by your instructor for live class attendance.
              </p>
            </div>
          </div>

          <form onSubmit={handleMarkAttendanceByCode} className="space-y-4">
            {codeMessage && (
              <div
                className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2 ${
                  codeMessage.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {codeMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{codeMessage.text}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={10}
                  value={sessionCodeInput}
                  onChange={(e) => setSessionCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 849204"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-base font-mono tracking-widest text-center text-white placeholder-zinc-600 uppercase focus:outline-none transition-all shadow-inner"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={codeSubmitting || !sessionCodeInput.trim()}
                className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-600/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {codeSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Mark Present
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Device Security Card */}
        <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-4">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Registered Device Binding</h3>
              <p className="text-[11px] text-zinc-400">Security & hardware binding status</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-1">Bound Device ID</p>
              <p className="font-mono text-zinc-200 text-xs truncate">
                {studentProfile?.device_id || 'No hardware device bound yet'}
              </p>
            </div>

            {deviceMsg && (
              <p
                className={`text-xs font-semibold p-2.5 rounded-xl border ${
                  deviceMsg.includes('success')
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                {deviceMsg}
              </p>
            )}

            <button
              onClick={handleResetDevice}
              disabled={resettingDevice}
              className="w-full py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl border border-zinc-700/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{resettingDevice ? 'Unbinding...' : 'Request Device Unbind'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Live Sessions Banner */}
      {activeSessions.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
            <Radio className="w-4 h-4 animate-pulse text-amber-400" />
            <span>Active Live Sessions in Progress for {className}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeSessions.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl bg-zinc-950/80 border border-amber-500/20 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-white">{s.subject_name}</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Instructor: {s.teacher_name}</p>
                  <p className="text-[11px] font-mono text-amber-400 mt-1">Session Code: {s.code}</p>
                </div>

                <button
                  onClick={() => setSessionCodeInput(s.code)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-xl shadow transition-all"
                >
                  Use Code
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance History Table */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Attendance Record & Logs</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Complete history of class sessions conducted for your section.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Subjects ({subjectList.length})</option>
              {subjectList.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="present">Present Only</option>
              <option value="absent">Absent Only</option>
            </select>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl p-8">
            <GraduationCap className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-300 font-bold mb-1">No attendance logs found matching filters.</p>
            <p className="text-zinc-500 text-[11px]">
              When sessions are recorded by your instructor, attendance logs will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-800/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-bold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Subject & Class</th>
                  <th className="px-6 py-4">Faculty Instructor</th>
                  <th className="px-6 py-4">Session Code</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4 text-right">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-zinc-200">
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-white text-sm">{item.subject_name}</p>
                        <p className="text-[11px] text-zinc-500">{item.class_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-indigo-300 font-medium">{item.teacher_name}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-zinc-300">{item.code}</td>
                    <td className="px-6 py-4 text-zinc-400 text-[11px]">
                      {new Date(item.timestamp || item.start_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
                          item.status === 'present'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {item.status === 'present' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> PRESENT
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> ABSENT
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
