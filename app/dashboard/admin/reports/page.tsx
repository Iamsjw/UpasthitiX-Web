'use client';

import React, { useEffect, useState } from 'react';
import { supabase, ClassModel, SubjectModel } from '@/lib/supabase';
import { downloadCSVText, generateGridCsv } from '@/lib/csv-export';
import {
  Download,
  Search,
  FileSpreadsheet,
  Calendar,
  Layers,
  BookOpen,
  Grid,
  List,
  CheckSquare,
  Square,
  Clock,
  Users,
  Layers3,
} from 'lucide-react';

interface StudentData {
  id: string;
  name: string;
  email: string;
  roll_no: string;
  class_id?: string;
  className?: string;
}

interface SessionData {
  id: string;
  start_time: string;
  end_time?: string | null;
  lecture_time?: string | null;
  class_id: string;
  subject_id?: string;
  subject_name?: string;
  class_name?: string;
}

interface AttendanceData {
  student_id: string;
  session_id: string;
  status: string;
}

export default function AdminReportsPage() {
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);

  // Multi-Dimensional Report Combinations State
  const [classMode, setClassMode] = useState<'all' | 'single' | 'multi'>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  // Date Filter State
  const [datePreset, setDatePreset] = useState<'oneday' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // View Mode: Matrix Grid vs Summary Table
  const [viewMode, setViewMode] = useState<'grid' | 'summary'>('grid');

  // Multi-select dropdown toggle state
  const [showMultiClassDropdown, setShowMultiClassDropdown] = useState(false);

  // Loaded Data States
  const [students, setStudents] = useState<StudentData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [loading, setLoading] = useState(true);

  // Search Roster
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    computeDatesForPreset(datePreset);
  }, [datePreset]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReportData();
    }
  }, [classMode, selectedClassId, selectedClassIds, selectedSubjectId, startDate, endDate]);

  const fetchMetadata = async () => {
    try {
      const { data: classData } = await supabase.from('classes').select('*').order('name');
      const { data: subjectData } = await supabase.from('subjects').select('*').order('name');

      if (classData) {
        setClasses(classData as ClassModel[]);
        if (classData.length > 0) setSelectedClassId(classData[0].id);
      }
      if (subjectData) setSubjects(subjectData as SubjectModel[]);
    } catch (e) {
      console.error(e);
    }
  };

  const computeDatesForPreset = (preset: 'oneday' | 'weekly' | 'monthly' | 'custom') => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];

    if (preset === 'oneday') {
      setStartDate(end);
      setEndDate(end);
    } else if (preset === 'weekly') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'monthly') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    }
  };

  const toggleMultiClassSelect = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const { data: studentData } = await supabase
        .from('users')
        .select('*, classes(name)')
        .eq('role', 'student')
        .order('roll_no');

      let parsedStudents: StudentData[] = (studentData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        roll_no: s.roll_no || 'N/A',
        class_id: s.class_id,
        className: s.classes?.name || s.class_name || 'Class',
      }));

      // Filter Students by Class Combination Mode
      if (classMode === 'single' && selectedClassId) {
        parsedStudents = parsedStudents.filter((st) => st.class_id === selectedClassId);
      } else if (classMode === 'multi' && selectedClassIds.length > 0) {
        parsedStudents = parsedStudents.filter((st) => st.class_id && selectedClassIds.includes(st.class_id));
      }

      setStudents(parsedStudents);

      // 2. Fetch Sessions in Date Range
      const startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString();
      const endIso = new Date(`${endDate}T23:59:59.999Z`).toISOString();

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*, classes(name), subjects(name)')
        .gte('start_time', startIso)
        .lte('start_time', endIso)
        .order('start_time', { ascending: true });

      let parsedSessions: SessionData[] = (sessionData || []).map((s: any) => ({
        id: s.id,
        start_time: s.start_time,
        end_time: s.end_time,
        lecture_time: s.lecture_time,
        class_id: s.class_id,
        subject_id: s.subject_id,
        subject_name: s.subjects?.name || s.subject_name || 'Subject',
        class_name: s.classes?.name || s.class_name || 'Class',
      }));

      // Filter Sessions by Class Combination Mode
      if (classMode === 'single' && selectedClassId) {
        parsedSessions = parsedSessions.filter((s) => s.class_id === selectedClassId);
      } else if (classMode === 'multi' && selectedClassIds.length > 0) {
        parsedSessions = parsedSessions.filter((s) => selectedClassIds.includes(s.class_id));
      }

      // Filter Sessions by Subject Wise Selection
      if (selectedSubjectId !== 'all') {
        parsedSessions = parsedSessions.filter((s) => s.subject_id === selectedSubjectId);
      }

      setSessions(parsedSessions);

      // 3. Fetch Attendance Records
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('student_id, session_id, status')
        .eq('status', 'present');

      setAttendance((attendanceData as AttendanceData[]) || []);
    } catch (e) {
      console.error(e);
      setStudents([]);
      setSessions([]);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  // Attendance Matrix Map: studentId -> sessionId -> status
  const attMap: Record<string, Record<string, string>> = {};
  for (const a of attendance) {
    if (!attMap[a.student_id]) attMap[a.student_id] = {};
    attMap[a.student_id][a.session_id] = a.status;
  }

  // Filter Roster by Search Term
  const filteredStudents = students.filter((st) =>
    st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.roll_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper for 12h time slot formatting
  const formatTimeSlotStr = (s: SessionData) => {
    if (s.lecture_time && s.lecture_time.trim().length > 0) return s.lecture_time;
    const start = new Date(s.start_time);
    const end = s.end_time ? new Date(s.end_time) : new Date(start.getTime() + 3600000);
    const fmt = (dt: Date) => {
      let h = dt.getHours();
      const m = dt.getMinutes().toString().padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
    };
    return `${fmt(start)} - ${fmt(end)}`;
  };

  // Helper for ordinal date string
  const formatDateOrdinalStr = (dateStr: string) => {
    const dt = new Date(dateStr);
    const day = dt.getDate();
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${day}${suffix} ${months[dt.getMonth()]}, ${dt.getFullYear()}`;
  };

  // Generate Filename & Export CSV
  const handleExportGridCSV = () => {
    if (students.length === 0) return;

    let classTitle = 'All_Classes';
    if (classMode === 'single') {
      classTitle = classes.find((c) => c.id === selectedClassId)?.name || 'Class';
    } else if (classMode === 'multi') {
      classTitle = `Multi_Classes_${selectedClassIds.length}`;
    }

    const subjectTitle =
      selectedSubjectId === 'all'
        ? 'All_Subjects'
        : subjects.find((s) => s.id === selectedSubjectId)?.name || 'Subject';

    const csvText = generateGridCsv({
      subjectName: subjectTitle,
      className: classTitle,
      students: filteredStudents,
      sessions: sessions,
      attendance: attendance,
    });

    downloadCSVText(
      `Grid_Report_${classTitle.replace(/\s+/g, '_')}_${subjectTitle.replace(/\s+/g, '_')}_${startDate}_to_${endDate}`,
      csvText
    );
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Institutional Attendance Grid & Matrix Reports <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Generate clean, 2-header-row attendance matrices, filter single or combined classes, and export mobile-format CSV reports.
          </p>
        </div>

        <button
          onClick={handleExportGridCSV}
          disabled={students.length === 0}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all shrink-0"
        >
          <Download className="w-4 h-4" /> Download Matrix Grid CSV
        </button>
      </div>

      {/* Live Stats KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-sm shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Filtered Roster</span>
            <p className="text-2xl font-extrabold text-white mt-0.5">{students.length}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Enrolled students</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-sm shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Conducted Sessions</span>
            <p className="text-2xl font-extrabold text-white mt-0.5">{sessions.length}</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">Lectures in range</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-sm shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Class Scope</span>
            <p className="text-sm font-bold text-indigo-300 mt-1 capitalize truncate max-w-[140px]">
              {classMode === 'all'
                ? 'All Classes'
                : classMode === 'single'
                ? classes.find((c) => c.id === selectedClassId)?.name || 'Single Class'
                : `${selectedClassIds.length} Classes Selected`}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Academic section</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-sm shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Subject Scope</span>
            <p className="text-sm font-bold text-emerald-300 mt-1 truncate max-w-[140px]">
              {selectedSubjectId === 'all'
                ? 'All Subjects'
                : subjects.find((s) => s.id === selectedSubjectId)?.name || 'Course'}
            </p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Curriculum course</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Panel: Combination Selector & Date Filters */}
      <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-xl space-y-4">
        {/* Row 1: Class Combination Mode & Subject Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-zinc-800/80">
          {/* Class Combination Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" /> Class Filter Scope
              </span>
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={() => setClassMode('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    classMode === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All Classes
                </button>
                <button
                  onClick={() => setClassMode('single')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    classMode === 'single' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Single Class
                </button>
                <button
                  onClick={() => setClassMode('multi')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    classMode === 'multi' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Multi-Class
                </button>
              </div>
            </div>

            {classMode === 'single' && (
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {classMode === 'multi' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMultiClassDropdown(!showMultiClassDropdown)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-white flex items-center justify-between focus:outline-none focus:border-indigo-500"
                >
                  <span>
                    {selectedClassIds.length === 0
                      ? '-- Select Classes to Combine --'
                      : `${selectedClassIds.length} Classes Selected`}
                  </span>
                  <Layers3 className="w-4 h-4 text-zinc-400" />
                </button>

                {showMultiClassDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl max-h-48 overflow-y-auto space-y-1.5">
                    {classes.map((c) => {
                      const isSelected = selectedClassIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleMultiClassSelect(c.id)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900 cursor-pointer transition-colors"
                        >
                          <span className="font-semibold text-zinc-200">{c.name}</span>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subject Wise Selector */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-400" /> Subject / Course Filter
            </span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="all">All Subjects (Combined Curriculum)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Date Filter Presets & View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-zinc-300">Date Preset:</span>
            <div className="flex flex-wrap gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setDatePreset('oneday')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  datePreset === 'oneday' ? 'bg-emerald-600 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Today (1 Day)
              </button>
              <button
                onClick={() => setDatePreset('weekly')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  datePreset === 'weekly' ? 'bg-emerald-600 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Weekly (7 Days)
              </button>
              <button
                onClick={() => setDatePreset('monthly')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  datePreset === 'monthly' ? 'bg-emerald-600 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Monthly (30 Days)
              </button>
              <button
                onClick={() => setDatePreset('custom')}
                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  datePreset === 'custom' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-zinc-500 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 font-semibold shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'grid' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Attendance Matrix Grid
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'summary' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Roster Summary
            </button>
          </div>
        </div>
      </div>

      {/* Roster Search Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student by name, roll number, or email..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Main Content Area: Matrix Grid vs Summary Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500">Generating report matrix...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl m-6 p-8">
            <p className="text-zinc-300 font-bold mb-1">No student records match the selected combination filters.</p>
            <p className="text-[11px] text-zinc-500">
              Try selecting a different class combination, subject, or expanding the date range.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Attendance Matrix Grid View (Matching Excel 2-Header Row Layout) */
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-950 text-zinc-400 font-bold text-[10px] sticky top-0 z-10 border-b border-zinc-800">
                {/* Header Row 1: Roll No, Name, Dates..., Attendance */}
                <tr className="border-b border-zinc-800/80">
                  <th className="px-4 py-2 sticky left-0 bg-zinc-950 z-20 min-w-[100px] border-r border-zinc-800">
                    Roll No
                  </th>
                  <th className="px-4 py-2 sticky left-[100px] bg-zinc-950 z-20 min-w-[180px] border-r border-zinc-800">
                    Name
                  </th>
                  <th className="px-4 py-2 min-w-[120px] border-r border-zinc-800">Class Section</th>
                  {sessions.map((s) => (
                    <th key={s.id} className="px-3 py-2 text-center min-w-[120px] border-r border-zinc-800/60 font-semibold text-zinc-200">
                      {formatDateOrdinalStr(s.start_time)}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right sticky right-0 bg-zinc-950 z-20 min-w-[150px] border-l border-zinc-800">
                    Attendance
                  </th>
                </tr>

                {/* Header Row 2: ,, Time Slots... */}
                <tr className="bg-zinc-950/90 text-zinc-500 text-[9px] font-mono">
                  <th className="px-4 py-1.5 sticky left-0 bg-zinc-950 z-20 border-r border-zinc-800"></th>
                  <th className="px-4 py-1.5 sticky left-[100px] bg-zinc-950 z-20 border-r border-zinc-800"></th>
                  <th className="px-4 py-1.5 border-r border-zinc-800"></th>
                  {sessions.map((s) => (
                    <th key={s.id} className="px-3 py-1.5 text-center border-r border-zinc-800/60 font-normal text-indigo-400">
                      {formatTimeSlotStr(s)}
                    </th>
                  ))}
                  <th className="px-4 py-1.5 sticky right-0 bg-zinc-950 z-20 border-l border-zinc-800"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                {filteredStudents.map((st) => {
                  const attendedCount = sessions.filter((s) => attMap[st.id]?.[s.id] === 'present').length;
                  const totalCount = sessions.length;
                  const pct = totalCount > 0 ? ((attendedCount / totalCount) * 100).toFixed(2) : '0.00';

                  return (
                    <tr key={st.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-400 sticky left-0 bg-zinc-950 z-10 border-r border-zinc-800">
                        {st.roll_no}
                      </td>
                      <td className="px-4 py-3 font-bold text-white sticky left-[100px] bg-zinc-950 z-10 border-r border-zinc-800">
                        {st.name}
                        <span className="block text-[10px] font-normal text-zinc-500">{st.email}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300 font-medium border-r border-zinc-800">
                        {st.className}
                      </td>

                      {/* Session Matrix Status Cells */}
                      {sessions.map((s) => {
                        const isPresent = attMap[st.id]?.[s.id] === 'present';
                        return (
                          <td key={s.id} className="px-3 py-3 text-center border-r border-zinc-800/40">
                            {isPresent ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block">
                                P
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold text-zinc-600 inline-block">
                                -
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Attendance Percentage Cell (Matching Image format: 1 / 4 (25.00%)) */}
                      <td className="px-4 py-3 text-right sticky right-0 bg-zinc-950 z-10 border-l border-zinc-800 font-mono font-bold text-emerald-400">
                        {attendedCount} / {totalCount} ({pct}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Roster Summary View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-bold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Roll No</th>
                  <th className="px-6 py-4">Student Name & Email</th>
                  <th className="px-6 py-4">Class Section</th>
                  <th className="px-6 py-4">Conducted Sessions</th>
                  <th className="px-6 py-4">Attended</th>
                  <th className="px-6 py-4 text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                {filteredStudents.map((st) => {
                  const attendedCount = sessions.filter((s) => attMap[st.id]?.[s.id] === 'present').length;
                  const totalCount = sessions.length;
                  const pct = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 0;

                  return (
                    <tr key={st.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-zinc-400 font-bold">{st.roll_no}</td>
                      <td className="px-6 py-4 font-bold text-white text-sm">
                        {st.name}
                        <span className="block text-[11px] font-normal text-zinc-500">{st.email}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-300 font-medium">{st.className}</td>
                      <td className="px-6 py-4 text-zinc-300 font-medium">{totalCount}</td>
                      <td className="px-6 py-4 font-bold text-white">{attendedCount}</td>
                      <td className="px-6 py-4 font-mono font-extrabold text-sm text-right text-emerald-400">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
