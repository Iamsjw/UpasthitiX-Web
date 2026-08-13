'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase, SessionModel, AttendanceRecord, ClassModel, SubjectModel } from '@/lib/supabase';
import { downloadCSVText, generateGridCsv } from '@/lib/csv-export';
import {
  Search,
  Download,
  X,
  RefreshCw,
  FileSpreadsheet,
  Radio,
  Trash2,
  Calendar,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  Layers,
  AlertCircle,
} from 'lucide-react';

const LECTURE_TIME_SLOTS = [
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  'Custom Time Slot',
];

const DURATION_OPTIONS = [
  { label: '1 Minute (Quick Check-in)', value: 1 },
  { label: '2 Minutes', value: 2 },
  { label: '3 Minutes (Default Window)', value: 3 },
  { label: '4 Minutes', value: 4 },
  { label: '5 Minutes', value: 5 },
  { label: '6 Minutes', value: 6 },
  { label: '7 Minutes', value: 7 },
  { label: '8 Minutes', value: 8 },
  { label: '9 Minutes', value: 9 },
  { label: '10 Minutes (Maximum Window)', value: 10 },
];

export default function TeacherSessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionModel[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionModel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Active Session Live Timer
  const [activeSession, setActiveSession] = useState<SessionModel | null>(null);
  const [activeRosterCount, setActiveRosterCount] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Selected session for Modal Roster
  const [selectedSession, setSelectedSession] = useState<SessionModel | null>(null);
  const [roster, setRoster] = useState<AttendanceRecord[]>([]);
  const [allStudents, setAllStudents] = useState<Array<{ id: string; name: string; roll_no: string; email: string }>>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);
  const [rosterSearchTerm, setRosterSearchTerm] = useState('');

  // Date Timetable Filter State
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Start Session Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [classList, setClassList] = useState<ClassModel[]>([]);
  const [subjectList, setSubjectList] = useState<SubjectModel[]>([]);
  const [assignments, setAssignments] = useState<Array<{ class_id: string; subject_id: string }> >([]);

  // Comprehensive Session Form
  const [sessionForm, setSessionForm] = useState({
    class_ids: [] as string[],
    subject_id: '',
    lecture_time: '09:00 - 10:00',
    custom_start_time: '09:30',
    custom_end_time: '10:30',
    duration_minutes: 3,
  });
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchClassesAndSubjects();
  }, [user]);

  const fetchClassesAndSubjects = async () => {
    try {
      if (user?.id) {
        const { data: assignData } = await supabase
          .from('teacher_assignments')
          .select('class_id, subject_id, classes(*), subjects(*)')
          .eq('teacher_id', user.id);

        if (assignData && assignData.length > 0) {
          const classMap = new Map<string, ClassModel>();
          const subjectMap = new Map<string, SubjectModel>();
          const assignList: Array<{ class_id: string; subject_id: string }> = [];

          assignData.forEach((a: any) => {
            if (a.classes) classMap.set(a.classes.id, a.classes);
            if (a.subjects) subjectMap.set(a.subjects.id, a.subjects);
            if (a.class_id && a.subject_id) {
              assignList.push({ class_id: a.class_id, subject_id: a.subject_id });
            }
          });

          const teacherClasses = Array.from(classMap.values());
          const teacherSubjects = Array.from(subjectMap.values());

          if (teacherClasses.length > 0) setClassList(teacherClasses);
          if (teacherSubjects.length > 0) setSubjectList(teacherSubjects);
          setAssignments(assignList);
          return;
        }
      }

      const { data: classesData } = await supabase.from('classes').select('*').order('name');
      const { data: subjectsData } = await supabase.from('subjects').select('*').order('name');
      if (classesData) setClassList(classesData as ClassModel[]);
      if (subjectsData) setSubjectList(subjectsData as SubjectModel[]);
    } catch (e) {
      console.error(e);
    }
  };

  // Filter available subjects based on teacher assignments for selected class(es)
  const availableSubjects = React.useMemo(() => {
    if (assignments.length === 0 || sessionForm.class_ids.length === 0) {
      return subjectList;
    }
    const validSubjectIds = new Set(
      assignments
        .filter((a) => sessionForm.class_ids.includes(a.class_id))
        .map((a) => a.subject_id)
    );
    const filtered = subjectList.filter((s) => validSubjectIds.has(s.id));
    return filtered.length > 0 ? filtered : subjectList;
  }, [assignments, sessionForm.class_ids, subjectList]);

  // Filter students in the roster modal search
  const filteredRosterStudents = React.useMemo(() => {
    if (!rosterSearchTerm.trim()) return allStudents;
    const term = rosterSearchTerm.toLowerCase();
    return allStudents.filter(
      (st) =>
        st.name.toLowerCase().includes(term) ||
        (st.roll_no && st.roll_no.toLowerCase().includes(term)) ||
        (st.email && st.email.toLowerCase().includes(term))
    );
  }, [allStudents, rosterSearchTerm]);

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

  // Live Timer effect for active session
  useEffect(() => {
    if (!activeSession) {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      if (!activeSession.end_time) {
        setTimeRemaining('Ongoing');
        return;
      }
      const end = new Date(activeSession.end_time).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, end - now);

      if (diff <= 0) {
        setTimeRemaining('Expired');
      } else {
        const mins = Math.floor(diff / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${mins}m ${secs < 10 ? '0' : ''}${secs}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const toggleClassSelection = (classId: string) => {
    setSessionForm((prev) => {
      const exists = prev.class_ids.includes(classId);
      if (exists) {
        return { ...prev, class_ids: prev.class_ids.filter((id) => id !== classId) };
      } else {
        return { ...prev, class_ids: [...prev.class_ids, classId] };
      }
    });
  };

  const handleStartManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessionForm.class_ids.length === 0 || !sessionForm.subject_id) {
      alert('Please select at least one class and an assigned subject.');
      return;
    }
    setCreatingSession(true);

    try {
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      const newSessionId = crypto.randomUUID();
      const now = new Date();
      const durationMs = sessionForm.duration_minutes * 60 * 1000;
      const endTime = new Date(now.getTime() + durationMs);

      const format12H = (timeStr: string) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':').map(Number);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        const minStr = m < 10 ? `0${m}` : `${m}`;
        return `${hour12 < 10 ? '0' : ''}${hour12}:${minStr} ${period}`;
      };

      const isCustomSlot =
        sessionForm.lecture_time === 'Custom Time Slot' ||
        sessionForm.lecture_time === 'Custom';

      const actualLectureTime = isCustomSlot
        ? `${format12H(sessionForm.custom_start_time)} - ${format12H(sessionForm.custom_end_time)}`
        : sessionForm.lecture_time;

      const { error } = await supabase.from('sessions').insert({
        id: newSessionId,
        teacher_id: user?.id || 'teacher-default',
        class_id: sessionForm.class_ids[0],
        class_ids: sessionForm.class_ids,
        subject_id: sessionForm.subject_id,
        code: randomCode,
        security_level: 'standard', // Low level 6-digit code for Web
        rssi_threshold: -75,
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
        lecture_time: actualLectureTime,
        is_active: true,
      });

      if (!error) {
        setShowCreateModal(false);
        setSessionForm({
          class_ids: [],
          subject_id: '',
          lecture_time: '09:00 - 10:00',
          custom_start_time: '09:30',
          custom_end_time: '10:30',
          duration_minutes: 3,
        });
        fetchSessions();
      } else {
        alert('Failed to start web session: ' + error.message);
      }
    } catch (err: any) {
      alert('Error starting web session: ' + err.message);
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

        // Check for active session
        const active = parsedSessions.find((s) => s.is_active);
        if (active) {
          setActiveSession(active);
          // Fetch attendance count for active session
          const { count } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', active.id);
          setActiveRosterCount(count || 0);
        } else {
          setActiveSession(null);
        }
      } else {
        setSessions([]);
        setFilteredSessions([]);
        setActiveSession(null);
      }
    } catch (e) {
      console.error(e);
      setSessions([]);
      setFilteredSessions([]);
      setActiveSession(null);
    } finally {
      setLoading(false);
    }
  };

  const copySessionCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const openSessionRoster = async (session: SessionModel) => {
    setSelectedSession(session);
    setRosterSearchTerm('');
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
      console.error('Error updating status:', e);
    } finally {
      setUpdatingStudentId(null);
    }
  };

  const exportCurrentRosterCSV = () => {
    if (!selectedSession) return;
    try {
      const csvContent = generateGridCsv({
        subjectName: selectedSession.subject_name || 'Subject Session',
        className: selectedSession.class_name || 'Class',
        students: allStudents,
        sessions: [selectedSession],
        attendance: roster.map((r) => ({
          student_id: r.student_id,
          session_id: selectedSession.id,
          status: 'present',
        })),
      });

      downloadCSVText(
        `Roster_${(selectedSession.subject_name || 'Session').replace(/\s+/g, '_')}_${selectedSession.code}`,
        csvContent
      );
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  const exportGridCSV = async () => {
    if (sessions.length === 0) return;
    try {
      const { data: studentsData } = await supabase
        .from('users')
        .select('id, name, roll_no, class_id')
        .eq('role', 'student')
        .order('roll_no', { ascending: true });

      const classStudents = (studentsData || []).filter(
        (st) => !selectedSession?.class_id || st.class_id === selectedSession.class_id
      );

      const attendanceRecords = roster.map((r) => ({
        student_id: r.student_id,
        session_id: selectedSession ? selectedSession.id : '',
        status: r.status || 'present',
      }));

      const csvContent = generateGridCsv({
        subjectName: selectedSession?.subject_name || 'Subject Session',
        className: selectedSession?.class_name || 'Class',
        students: classStudents.length > 0 ? classStudents : allStudents,
        sessions: selectedSession ? [selectedSession] : sessions,
        attendance: attendanceRecords,
      });

      downloadCSVText(
        `Session_Grid_Report_${(selectedSession?.subject_name || 'Session').replace(/\s+/g, '_')}_${
          new Date().toISOString().split('T')[0]
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Class Sessions & Live Broadcast</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Start live web sessions, monitor real-time class rosters, and export mobile-format attendance reports.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
          >
            <Radio className="w-4 h-4 animate-pulse text-emerald-400" /> Start Live Web Session
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

      {/* Live Active Session Broadcast Monitor Banner */}
      {activeSession && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-emerald-950/30 to-zinc-900 border border-emerald-500/40 shadow-2xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 tracking-wider uppercase">
                    LIVE SESSION ACTIVE
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Standard 6-Digit Code Mode
                  </span>
                  {activeSession.lecture_time && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-800">
                      Slot: {activeSession.lecture_time}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-extrabold text-white mt-1.5 flex items-center gap-2">
                  {activeSession.subject_name || 'Subject Class'}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Class: <span className="text-zinc-200 font-semibold">{activeSession.class_name}</span>
                  {activeSession.class_ids && activeSession.class_ids.length > 1 && (
                    <span className="text-indigo-400 ml-1 font-mono">
                      (+{activeSession.class_ids.length - 1} combined)
                    </span>
                  )}
                  {' • '}
                  Started: {new Date(activeSession.start_time).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Prominent Session Code & Copy Box */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-950/80 p-4 rounded-xl border border-emerald-500/30">
              <div className="text-center sm:text-left">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                  Student Session Code
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-3xl font-black text-emerald-400 tracking-widest">
                    {activeSession.code}
                  </span>
                  <button
                    onClick={() => copySessionCode(activeSession.code)}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
                    title="Copy session code to clipboard"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {timeRemaining && (
                <div className="border-t sm:border-t-0 sm:border-l border-zinc-800 pt-2 sm:pt-0 sm:pl-4 text-center sm:text-left">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-400" /> Session Timer
                  </span>
                  <span className="font-mono text-lg font-bold text-indigo-300">{timeRemaining}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-zinc-400">
              <span>
                Checked-in Students: <strong className="text-emerald-400">{activeRosterCount}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => openSessionRoster(activeSession)}
                className="px-3.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 font-bold rounded-xl text-xs transition-colors"
              >
                View Live Roster
              </button>
              <button
                onClick={() => handleEndSession(activeSession.id)}
                className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold rounded-xl text-xs transition-colors"
              >
                End Class Session
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <th className="px-6 py-4">Lecture Time Slot</th>
                  <th className="px-6 py-4">Start Time</th>
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
                    <td className="px-6 py-4 text-zinc-300 font-medium">
                      {s.class_name}
                      {s.class_ids && s.class_ids.length > 1 && (
                        <span className="text-[10px] font-mono text-indigo-400 ml-1.5 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                          +{s.class_ids.length - 1} combined
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-400">{s.code}</td>
                    <td className="px-6 py-4 text-zinc-300 font-mono text-[11px]">
                      {s.lecture_time || '-'}
                    </td>
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

            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800">
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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs rounded-xl shadow flex items-center gap-2 transition-all w-fit"
              >
                <Download className="w-4 h-4" /> Download Session CSV
              </button>
            </div>

            {/* Student Search Bar in Roster Modal */}
            <div className="my-3 px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-2.5">
              <Search className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                type="text"
                value={rosterSearchTerm}
                onChange={(e) => setRosterSearchTerm(e.target.value)}
                placeholder="Search student by Name, Roll Number, or Email..."
                className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
              {rosterSearchTerm && (
                <button
                  onClick={() => setRosterSearchTerm('')}
                  className="text-zinc-500 hover:text-white p-1 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {loadingRoster ? (
                <div className="py-12 text-center text-xs text-zinc-500">Loading student roster...</div>
              ) : filteredRosterStudents.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  {rosterSearchTerm
                    ? `No students found matching "${rosterSearchTerm}".`
                    : 'No attendance records logged in database for this session.'}
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
                    {filteredRosterStudents.map((st) => {
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div>
                  <h3 className="text-base font-bold text-white">Start Web Class Session</h3>
                  <p className="text-[11px] text-zinc-400">Configure class, subject, timetable & duration</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartManualSession} className="space-y-4 mt-4 text-xs">
              {/* Security Mode Notice */}
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-indigo-300 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Security Mode: Standard 6-Digit Code (Low-Level Verification)
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Web browsers do not support BLE peripheral advertising. The session will run in standard 6-digit code verification mode. Students can enter the generated code on their mobile app or web portal.
                </p>
              </div>

              {/* Class Selection (Single / Combined Multi-Select) */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1 flex items-center justify-between">
                  <span>Select Class / Combined Classes *</span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    {sessionForm.class_ids.length} selected
                  </span>
                </label>
                <p className="text-[11px] text-zinc-500 mb-2">
                  Click to select one or multiple classes for combined lecture sessions.
                </p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-zinc-950 rounded-xl border border-zinc-800">
                  {classList.map((c) => {
                    const isSelected = sessionForm.class_ids.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleClassSelection(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400'
                            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject Selection (Filtered by Teacher Assignments) */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Select Subject *</label>
                <select
                  value={sessionForm.subject_id}
                  onChange={(e) => setSessionForm({ ...sessionForm, subject_id: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">-- Select Assigned Subject --</option>
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lecture Time Slot */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Lecture Time Slot</label>
                <select
                  value={sessionForm.lecture_time}
                  onChange={(e) => setSessionForm({ ...sessionForm, lecture_time: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {LECTURE_TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>

                {(sessionForm.lecture_time === 'Custom Time Slot' || sessionForm.lecture_time === 'Custom') && (
                  <div className="grid grid-cols-2 gap-3 mt-2.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                    <div>
                      <label className="block text-[11px] text-zinc-400 font-semibold mb-1">Start Time</label>
                      <input
                        type="time"
                        value={sessionForm.custom_start_time}
                        onChange={(e) => setSessionForm({ ...sessionForm, custom_start_time: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-400 font-semibold mb-1">End Time</label>
                      <input
                        type="time"
                        value={sessionForm.custom_end_time}
                        onChange={(e) => setSessionForm({ ...sessionForm, custom_end_time: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Session Duration */}
              <div>
                <label className="block text-zinc-300 font-bold mb-1">Session Duration</label>
                <select
                  value={sessionForm.duration_minutes}
                  onChange={(e) => setSessionForm({ ...sessionForm, duration_minutes: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
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
                  disabled={creatingSession || sessionForm.class_ids.length === 0 || !sessionForm.subject_id}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  <Radio className="w-4 h-4 text-emerald-400" />
                  {creatingSession ? 'Launching Class Session...' : 'Launch Live Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
