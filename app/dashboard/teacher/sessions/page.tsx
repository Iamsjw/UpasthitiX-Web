'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, SessionModel, AttendanceRecord, ClassModel, SubjectModel } from '@/lib/supabase';
import { downloadCSVText, generateGridCsv, formatRosterForCSV } from '@/lib/csv-export';
import { Search, Download, X, RefreshCw, FileSpreadsheet, Plus, Radio, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TeacherSessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionModel[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionModel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Selected session for Modal Roster
  const [selectedSession, setSelectedSession] = useState<SessionModel | null>(null);
  const [roster, setRoster] = useState<AttendanceRecord[]>([]);
  const [allStudents, setAllStudents] = useState<Array<{ id: string; name: string; roll_no: string; email: string }>>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);

  // Date Timetable Filter State
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Start Session Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [classList, setClassList] = useState<ClassModel[]>([]);
  const [subjectList, setSubjectList] = useState<SubjectModel[]>([]);
  const [sessionForm, setSessionForm] = useState({ class_id: '', subject_id: '' });
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchClassesAndSubjects();
  }, [user]);

  const fetchClassesAndSubjects = async () => {
    try {
      const { data: classesData } = await supabase.from('classes').select('*').order('name');
      const { data: subjectsData } = await supabase.from('subjects').select('*').order('name');
      if (classesData) setClassList(classesData as ClassModel[]);
      if (subjectsData) setSubjectList(subjectsData as SubjectModel[]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let result = sessions;

    if (selectedDate) {
      result = result.filter((s) => s.start_time.startsWith(selectedDate));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.subject_name?.toLowerCase().includes(term) ||
          s.class_name?.toLowerCase().includes(term) ||
          s.code?.toLowerCase().includes(term)
      );
    }

    setFilteredSessions(result);
  }, [searchTerm, selectedDate, sessions]);

  const handleStartManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionForm.class_id || !sessionForm.subject_id) return;
    setCreatingSession(true);

    try {
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      const newSessionId = `session-${Date.now()}`;

      const { error } = await supabase.from('sessions').insert({
        id: newSessionId,
        teacher_id: user?.id || 'teacher-default',
        class_id: sessionForm.class_id,
        subject_id: sessionForm.subject_id,
        code: randomCode,
        security_level: 'standard',
        rssi_threshold: -75,
        start_time: new Date().toISOString(),
        is_active: true,
      });

      if (!error) {
        setShowCreateModal(false);
        setSessionForm({ class_id: '', subject_id: '' });
        fetchSessions();
      } else {
        alert('Failed to start session: ' + error.message);
      }
    } catch (err: any) {
      alert('Error starting session: ' + err.message);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      await supabase
        .from('sessions')
        .update({ is_active: false, end_time: new Date().toISOString() })
        .eq('id', sessionId);
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this class session log?')) return;
    try {
      await supabase.from('sessions').delete().eq('id', sessionId);
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSessions = async () => {
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
        setFilteredSessions(parsedSessions);
      } else {
        setSessions([]);
        setFilteredSessions([]);
      }
    } catch (e) {
      console.error(e);
      setSessions([]);
      setFilteredSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const openSessionRoster = async (session: SessionModel) => {
    setSelectedSession(session);
    setLoadingRoster(true);

    try {
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*, users(name, email, roll_no)')
        .eq('session_id', session.id);

      const { data: studentsData } = await supabase
        .from('users')
        .select('id, name, email, roll_no')
        .eq('role', 'student');

      if (studentsData) setAllStudents(studentsData);

      if (attendanceData) {
        const records: AttendanceRecord[] = attendanceData.map((item: any) => ({
          id: item.id,
          student_id: item.student_id,
          session_id: item.session_id,
          timestamp: item.timestamp,
          status: item.status || 'present',
          student_name: item.users?.name || item.student_name || 'Student',
          student_email: item.users?.email || item.student_email || '',
          student_roll_no: item.users?.roll_no || item.student_roll_no || 'N/A',
        }));
        setRoster(records);
      }
    } catch (err) {
      console.error('Error fetching roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  const toggleStudentStatus = async (studentId: string, currentStatus: string) => {
    if (!selectedSession) return;
    setUpdatingStudentId(studentId);
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';

    try {
      const existing = roster.find((r) => r.student_id === studentId);

      if (existing) {
        if (newStatus === 'absent') {
          // Delete attendance row for absent (matching Flutter pure model)
          await supabase.from('attendance').delete().eq('id', existing.id);
          setRoster((prev) => prev.filter((item) => item.student_id !== studentId));
        } else {
          await supabase
            .from('attendance')
            .update({ status: 'present' })
            .eq('id', existing.id);

          setRoster((prev) =>
            prev.map((item) =>
              item.student_id === studentId ? { ...item, status: 'present' } : item
            )
          );
        }
      } else if (newStatus === 'present') {
        const { data: newRecord } = await supabase
          .from('attendance')
          .insert({
            session_id: selectedSession.id,
            student_id: studentId,
            status: 'present',
            timestamp: new Date().toISOString(),
          })
          .select('*, users(name, email, roll_no)')
          .single();

        if (newRecord) {
          const studentInfo = allStudents.find((s) => s.id === studentId);
          setRoster((prev) => [
            ...prev,
            {
              id: newRecord.id,
              student_id: studentId,
              session_id: selectedSession.id,
              timestamp: newRecord.timestamp,
              status: 'present',
              student_name: studentInfo?.name || 'Student',
              student_email: studentInfo?.email || '',
              student_roll_no: studentInfo?.roll_no || 'N/A',
            },
          ]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStudentId(null);
    }
  };

  // Export Exact Mobile App Grid CSV format
  const exportGridCSV = async () => {
    if (sessions.length === 0) return;

    try {
      const { data: studentsData } = await supabase
        .from('users')
        .select('id, name, roll_no')
        .eq('role', 'student')
        .order('roll_no', { ascending: true });

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('student_id, session_id, status');

      const csvText = generateGridCsv({
        subjectName: sessions[0]?.subject_name || 'Subject Attendance',
        className: sessions[0]?.class_name || 'Class',
        students: studentsData || [],
        sessions: sessions,
        attendance: attendanceData || [],
      });

      downloadCSVText(
        `${sessions[0]?.subject_name || 'Class'}_Attendance_Grid_${
          new Date().toISOString().split('T')[0]
        }`,
        csvText
      );
    } catch (e) {
      console.error('CSV Export Error:', e);
    }
  };

  // Export Single Session Roster CSV in exact Grid Matrix format
  const exportCurrentRosterCSV = async () => {
    if (!selectedSession) return;

    try {
      // Fetch students belonging to the session's class (or all students)
      const { data: studentsData } = await supabase
        .from('users')
        .select('id, name, roll_no, class_id')
        .eq('role', 'student')
        .order('roll_no', { ascending: true });

      const classStudents = (studentsData || []).filter(
        (st) => !selectedSession.class_id || st.class_id === selectedSession.class_id
      );

      const attendanceRecords = roster.map((r) => ({
        student_id: r.student_id,
        session_id: selectedSession.id,
        status: r.status || 'present',
      }));

      const csvContent = generateGridCsv({
        subjectName: selectedSession.subject_name || 'Subject Session',
        className: selectedSession.class_name || 'Class',
        students: classStudents.length > 0 ? classStudents : allStudents,
        sessions: [selectedSession],
        attendance: attendanceRecords,
      });

      downloadCSVText(
        `Session_Grid_Report_${(selectedSession.subject_name || 'Session').replace(/\s+/g, '_')}_${
          new Date(selectedSession.start_time).toISOString().split('T')[0]
        }`,
        csvContent
      );
    } catch (e) {
      console.error('Session CSV Export Error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Completed Classes & Reports</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Search class history, edit real-time rosters, and export mobile-app format CSV reports.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
          >
            <Radio className="w-4 h-4 animate-pulse text-amber-400" /> Start Manual Web Session
          </button>
          <button
            onClick={fetchSessions}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={exportGridCSV}
            disabled={sessions.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl shadow flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Mobile App Grid CSV
          </button>
        </div>
      </div>

      {/* Search & Date Timetable Filter Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by Subject Name, Class, or Session Code..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl border border-zinc-700"
            >
              Clear Date
            </button>
          )}
        </div>
      </div>

      {/* Sessions Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500">Loading database sessions...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl m-6 p-8">
            <p className="text-zinc-300 font-bold mb-1">No completed sessions found in database.</p>
            <p className="text-[11px] text-zinc-500">
              Classes started from the Upasthitix Mobile App or Web App will be recorded here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-bold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Subject & Course</th>
                  <th className="px-6 py-4">Class Section</th>
                  <th className="px-6 py-4">Session Code</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                {filteredSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-white text-sm">
                      {s.subject_name}
                    </td>
                    <td className="px-6 py-4 text-zinc-300 font-medium">{s.class_name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-400">{s.code}</td>
                    <td className="px-6 py-4 text-zinc-400">
                      {new Date(s.start_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {s.is_active ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 w-fit">
                          <Radio className="w-3 h-3 animate-pulse" /> LIVE ACTIVE
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                          COMPLETED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.is_active && (
                          <button
                            onClick={() => handleEndSession(s.id)}
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-bold rounded-xl text-[11px]"
                            title="End Active Session"
                          >
                            End Class
                          </button>
                        )}
                        <button
                          onClick={() => openSessionRoster(s)}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold rounded-xl text-xs transition-colors"
                        >
                          View & Edit Roster
                        </button>
                        <button
                          onClick={() => handleDeleteSession(s.id)}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                          title="Delete Session Log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Roster & Override Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {selectedSession.subject_name}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Class: {selectedSession.class_name} • Code: {selectedSession.code} • Date:{' '}
                  {new Date(selectedSession.start_time).toLocaleDateString()}
                </p>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="text-emerald-400">
                  Present: {roster.filter((r) => r.status === 'present').length}
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-rose-400">
                  Absent: {allStudents.length - roster.filter((r) => r.status === 'present').length}
                </span>
              </div>

              <button
                onClick={exportCurrentRosterCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs rounded-xl shadow flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" /> Download Session CSV
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {loadingRoster ? (
                <div className="py-12 text-center text-xs text-zinc-500">Loading student roster...</div>
              ) : allStudents.length === 0 && roster.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  No attendance records logged in database for this session.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Roll No</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Check-in Time</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Manual Status Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                    {allStudents.map((st) => {
                      const rec = roster.find((r) => r.student_id === st.id);
                      const isPresent = rec?.status === 'present';
                      const isUpdating = updatingStudentId === st.id;

                      return (
                        <tr key={st.id} className="hover:bg-zinc-800/20">
                          <td className="px-4 py-3 font-mono text-zinc-400">{st.roll_no || 'N/A'}</td>
                          <td className="px-4 py-3 font-bold text-white">{st.name}</td>
                          <td className="px-4 py-3 text-zinc-400">
                            {rec?.timestamp ? new Date(rec.timestamp).toLocaleTimeString() : '-'}
                          </td>
                          <td className="px-4 py-3">
                            {isPresent ? (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                PRESENT
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                ABSENT
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              disabled={isUpdating}
                              onClick={() => toggleStudentStatus(st.id, isPresent ? 'present' : 'absent')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                isPresent
                                  ? 'bg-zinc-800 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-300'
                                  : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40 border border-emerald-500/30'
                              }`}
                            >
                              {isUpdating
                                ? 'Updating...'
                                : isPresent
                                ? 'Mark Absent'
                                : 'Mark Present'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Start Web Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
                <h3 className="text-base font-bold text-white">Start Manual Web Session</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartManualSession} className="space-y-4 mt-4 text-xs">
              <p className="text-[11px] text-zinc-400">
                Starting a web session will generate a random 6-digit session code. Students can enter this code in their mobile app to mark attendance.
              </p>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Select Class</label>
                <select
                  value={sessionForm.class_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, class_id: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">-- Select Class --</option>
                  {classList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Select Subject</label>
                <select
                  value={sessionForm.subject_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, subject_id: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">-- Select Subject --</option>
                  {subjectList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 font-medium rounded-xl hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSession}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow flex items-center gap-1.5"
                >
                  {creatingSession ? 'Starting Live Class...' : 'Launch Live Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
