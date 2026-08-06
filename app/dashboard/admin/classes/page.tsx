'use client';

import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { supabase, ClassModel, SubjectModel, UserModel, AssignmentModel } from '@/lib/supabase';
import {
  BookOpen,
  Plus,
  Layers,
  UserCheck,
  Trash2,
  Edit2,
  X,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Users,
  FileSpreadsheet,
  Upload,
  UserPlus,
  Search,
  Sparkles,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react';

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [teachers, setTeachers] = useState<UserModel[]>([]);
  const [assignments, setAssignments] = useState<AssignmentModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab View Switcher: 'all' | 'classes' | 'subjects' | 'assignments'
  const [activeTab, setActiveTab] = useState<'all' | 'classes' | 'subjects' | 'assignments'>('all');

  // Modal State for Class / Subject / Assignment
  const [showModal, setShowModal] = useState<'class' | 'subject' | 'assignment' | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string; type: 'class' | 'subject' | 'assignment' } | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [assignmentInput, setAssignmentInput] = useState({ teacher_id: '', class_id: '', subject_id: '' });
  const [submitting, setSubmitting] = useState(false);

  // Class Roster Management State
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [studentsMap, setStudentsMap] = useState<{ [classId: string]: UserModel[] }>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [classSearchTerms, setClassSearchTerms] = useState<{ [classId: string]: string }>({});

  // Class Student Modal State (Create / Edit Student inside Class)
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<UserModel | null>(null);
  const [studentForm, setStudentForm] = useState({ name: '', email: '', roll_no: '', class_id: '' });
  const [submittingStudent, setSubmittingStudent] = useState(false);

  // Class CSV Upload State
  const [showClassCsvModal, setShowClassCsvModal] = useState(false);
  const [classCsvTargetId, setClassCsvTargetId] = useState('');
  const [classCsvFile, setClassCsvFile] = useState<File | null>(null);
  const [classCsvImporting, setClassCsvImporting] = useState(false);
  const [classCsvStatusMsg, setClassCsvStatusMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: classData } = await supabase.from('classes').select('*').order('name');
      const { data: subjectData } = await supabase.from('subjects').select('*').order('name');
      const { data: teacherData } = await supabase.from('users').select('*').eq('role', 'teacher').order('name');
      const { data: assignData } = await supabase
        .from('teacher_assignments')
        .select('*, classes(name), subjects(name), users(name)');

      if (classData) setClasses(classData as ClassModel[]);
      if (subjectData) setSubjects(subjectData as SubjectModel[]);
      if (teacherData) setTeachers(teacherData as UserModel[]);
      if (assignData) {
        const parsedAssignments: AssignmentModel[] = assignData.map((a: any) => ({
          ...a,
          class_name: a.classes?.name || 'Class',
          subject_name: a.subjects?.name || 'Subject',
          teacher_name: a.users?.name || 'Teacher',
        }));
        setAssignments(parsedAssignments);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandClass = async (classId: string) => {
    if (expandedClassId === classId) {
      setExpandedClassId(null);
    } else {
      setExpandedClassId(classId);
      fetchStudentsForClass(classId);
    }
  };

  const fetchStudentsForClass = async (classId: string) => {
    setLoadingStudents(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .eq('class_id', classId)
        .order('roll_no', { ascending: true });

      if (data) {
        setStudentsMap((prev) => ({ ...prev, [classId]: data as UserModel[] }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const openCreateModal = (type: 'class' | 'subject' | 'assignment') => {
    setEditingItem(null);
    setNameInput('');
    setAssignmentInput({ teacher_id: '', class_id: '', subject_id: '' });
    setShowModal(type);
  };

  const openEditClassModal = (c: ClassModel) => {
    setEditingItem({ id: c.id, type: 'class' });
    setNameInput(c.name);
    setShowModal('class');
  };

  const openEditSubjectModal = (s: SubjectModel) => {
    setEditingItem({ id: s.id, type: 'subject' });
    setNameInput(s.name);
    setShowModal('subject');
  };

  const openEditAssignmentModal = (a: AssignmentModel) => {
    setEditingItem({ id: a.id, type: 'assignment' });
    setAssignmentInput({
      teacher_id: a.teacher_id,
      class_id: a.class_id,
      subject_id: a.subject_id,
    });
    setShowModal('assignment');
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (showModal === 'assignment') {
        if (!assignmentInput.teacher_id || !assignmentInput.class_id || !assignmentInput.subject_id) {
          setSubmitting(false);
          return;
        }

        if (editingItem) {
          await supabase
            .from('teacher_assignments')
            .update({
              teacher_id: assignmentInput.teacher_id,
              class_id: assignmentInput.class_id,
              subject_id: assignmentInput.subject_id,
            })
            .eq('id', editingItem.id);
        } else {
          const newId = `assign-${Date.now()}`;
          await supabase.from('teacher_assignments').insert({
            id: newId,
            teacher_id: assignmentInput.teacher_id,
            class_id: assignmentInput.class_id,
            subject_id: assignmentInput.subject_id,
          });
        }
      } else {
        if (!nameInput.trim()) {
          setSubmitting(false);
          return;
        }
        const table = showModal === 'class' ? 'classes' : 'subjects';
        if (editingItem) {
          await supabase.from(table).update({ name: nameInput.trim() }).eq('id', editingItem.id);
        } else {
          const newId = `${showModal}-${Date.now()}`;
          await supabase.from(table).insert({ id: newId, name: nameInput.trim() });
        }
      }

      setShowModal(null);
      setEditingItem(null);
      setNameInput('');
      setAssignmentInput({ teacher_id: '', class_id: '', subject_id: '' });
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await supabase.from('classes').delete().eq('id', id);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await supabase.from('subjects').delete().eq('id', id);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to remove this teacher assignment?')) return;
    try {
      await supabase.from('teacher_assignments').delete().eq('id', id);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const openAddStudentToClass = (classId: string) => {
    setEditingStudent(null);
    setStudentForm({ name: '', email: '', roll_no: '', class_id: classId });
    setShowStudentModal(true);
  };

  const openEditStudentInClass = (student: UserModel) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      email: student.email,
      roll_no: student.roll_no || '',
      class_id: student.class_id || '',
    });
    setShowStudentModal(true);
  };

  const handleSaveClassStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name.trim() || !studentForm.email.trim()) return;
    setSubmittingStudent(true);

    try {
      if (editingStudent) {
        await supabase
          .from('users')
          .update({
            name: studentForm.name.trim(),
            email: studentForm.email.trim().toLowerCase(),
            roll_no: studentForm.roll_no.trim() || null,
            class_id: studentForm.class_id,
          })
          .eq('id', editingStudent.id);
      } else {
        const newId = `student-${Date.now()}`;
        await supabase.from('users').insert({
          id: newId,
          name: studentForm.name.trim(),
          email: studentForm.email.trim().toLowerCase(),
          role: 'student',
          roll_no: studentForm.roll_no.trim() || null,
          class_id: studentForm.class_id,
        });
      }

      setShowStudentModal(false);
      fetchStudentsForClass(studentForm.class_id);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handleDeleteClassStudent = async (studentId: string, classId: string) => {
    if (!confirm('Are you sure you want to delete this student from the class?')) return;
    try {
      await supabase.from('users').delete().eq('id', studentId);
      fetchStudentsForClass(classId);
    } catch (e) {
      console.error(e);
    }
  };

  const openClassCsvModal = (classId: string) => {
    setClassCsvTargetId(classId);
    setClassCsvFile(null);
    setClassCsvStatusMsg('');
    setShowClassCsvModal(true);
  };

  const handleClassCsvUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCsvFile || !classCsvTargetId) return;
    setClassCsvImporting(true);
    setClassCsvStatusMsg('Parsing CSV file...');

    Papa.parse(classCsvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows: any[] = results.data;
          if (!rows || rows.length === 0) {
            setClassCsvStatusMsg('CSV file is empty.');
            setClassCsvImporting(false);
            return;
          }

          const newStudents = rows.map((r, i) => ({
            id: `student-class-csv-${Date.now()}-${i}`,
            name: (r.name || r.Name || 'Student').trim(),
            email: (r.email || r.Email || `student${i + 1}@school.edu`).trim().toLowerCase(),
            role: 'student',
            roll_no: (r.roll_no || r.RollNo || r.roll || `R-${i + 1}`).toString().trim(),
            class_id: classCsvTargetId,
          }));

          const { error } = await supabase.from('users').insert(newStudents);
          if (error) {
            setClassCsvStatusMsg('CSV Import Error: ' + error.message);
          } else {
            setClassCsvStatusMsg(`Successfully added ${newStudents.length} students to class!`);
            setTimeout(() => {
              setShowClassCsvModal(false);
              setClassCsvFile(null);
              setClassCsvStatusMsg('');
              fetchStudentsForClass(classCsvTargetId);
            }, 1500);
          }
        } catch (err: any) {
          setClassCsvStatusMsg('Failed to process CSV: ' + err.message);
        } finally {
          setClassCsvImporting(false);
        }
      },
      error: (err) => {
        setClassCsvStatusMsg('CSV Parse Error: ' + err.message);
        setClassCsvImporting(false);
      },
    });
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Curriculum & Class Management <GraduationCap className="w-6 h-6 text-indigo-400" />
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure academic classes, manage student rosters, define course subjects, and assign faculty.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => openCreateModal('class')}
            className="px-3.5 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Class
          </button>
          <button
            onClick={() => openCreateModal('subject')}
            className="px-3.5 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Subject
          </button>
          <button
            onClick={() => openCreateModal('assignment')}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
          >
            <LinkIcon className="w-4 h-4" /> Assign Teacher
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-sm shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Academic Classes</span>
            <p className="text-2xl font-extrabold text-white mt-0.5">{classes.length}</p>
            <p className="text-[10px] text-indigo-400 mt-0.5">Configured sections</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-sm shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Curriculum Subjects</span>
            <p className="text-2xl font-extrabold text-white mt-0.5">{subjects.length}</p>
            <p className="text-[10px] text-emerald-400 mt-0.5">Active courses</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 backdrop-blur-sm shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Faculty Allocations</span>
            <p className="text-2xl font-extrabold text-white mt-0.5">{assignments.length}</p>
            <p className="text-[10px] text-purple-400 mt-0.5">Teacher course links</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Segmented View Navigation Tabs */}
      <div className="p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800/80 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'all'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> All Curriculum Overview
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'classes'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" /> Academic Classes ({classes.length})
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'subjects'
              ? 'bg-emerald-600 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Subjects ({subjects.length})
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'assignments'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-purple-400" /> Teacher Allocations ({assignments.length})
        </button>
      </div>

      {/* Main Grid View */}
      <div className="space-y-6">
        {/* Classes Section */}
        {(activeTab === 'all' || activeTab === 'classes') && (
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-xl space-y-4 backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Academic Classes & Student Rosters</h3>
              </div>
              <button
                onClick={() => openCreateModal('class')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Class
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-zinc-500">Loading academic classes...</div>
            ) : classes.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl p-6">
                <p className="font-semibold text-zinc-400 mb-1">0 Classes in Database</p>
                <button
                  onClick={() => openCreateModal('class')}
                  className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow mt-2"
                >
                  + Add Class
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {classes.map((c) => {
                  const isExpanded = expandedClassId === c.id;
                  const classStudents = studentsMap[c.id] || [];
                  const searchTerm = classSearchTerms[c.id] || '';

                  const filteredRoster = classStudents.filter(
                    (st) =>
                      st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      st.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (st.roll_no && st.roll_no.toLowerCase().includes(searchTerm.toLowerCase()))
                  );

                  return (
                    <div
                      key={c.id}
                      className="rounded-xl bg-zinc-950 border border-zinc-800/90 overflow-hidden transition-all hover:border-zinc-700/80"
                    >
                      <div className="p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-white text-sm tracking-tight">{c.name}</span>
                          <button
                            onClick={() => toggleExpandClass(c.id)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 text-[11px] font-bold flex items-center gap-1 transition-all"
                          >
                            <Users className="w-3 h-3" />
                            Student Roster ({classStudents.length})
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditClassModal(c)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900 transition-colors"
                            title="Edit Class Name"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(c.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                            title="Delete Class"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Roster Accordion Panel */}
                      {isExpanded && (
                        <div className="p-4 bg-zinc-900/90 border-t border-zinc-800 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                            <div className="relative flex-1 max-w-xs">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                              <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) =>
                                  setClassSearchTerms({ ...classSearchTerms, [c.id]: e.target.value })
                                }
                                placeholder="Filter class roster..."
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openAddStudentToClass(c.id)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow transition-all"
                              >
                                <UserPlus className="w-3 h-3" /> + Add Student
                              </button>
                              <button
                                onClick={() => openClassCsvModal(c.id)}
                                className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all"
                              >
                                <FileSpreadsheet className="w-3 h-3" /> Import CSV
                              </button>
                            </div>
                          </div>

                          {loadingStudents ? (
                            <div className="py-4 text-center text-xs text-zinc-500">
                              Loading students for {c.name}...
                            </div>
                          ) : filteredRoster.length === 0 ? (
                            <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl p-4">
                              <p className="font-semibold text-zinc-400 mb-1">0 Students match filter in {c.name}</p>
                              <p className="text-[10px] text-zinc-500">
                                Click "+ Add Student" or "Import CSV" above to enroll students into this class.
                              </p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto max-h-60 overflow-y-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase text-[9px] sticky top-0 border-b border-zinc-800">
                                  <tr>
                                    <th className="px-3 py-2">Roll No</th>
                                    <th className="px-3 py-2">Name</th>
                                    <th className="px-3 py-2">Email</th>
                                    <th className="px-3 py-2 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                                  {filteredRoster.map((st) => (
                                    <tr key={st.id} className="hover:bg-zinc-800/40">
                                      <td className="px-3 py-2">
                                        <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20 text-[10px]">
                                          {st.roll_no || 'N/A'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 font-semibold text-white">{st.name}</td>
                                      <td className="px-3 py-2 text-zinc-400 text-[11px]">{st.email}</td>
                                      <td className="px-3 py-2 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <button
                                            onClick={() => openEditStudentInClass(st)}
                                            className="p-1 text-zinc-400 hover:text-indigo-400 transition-colors"
                                            title="Edit Student Details"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteClassStudent(st.id, c.id)}
                                            className="p-1 text-rose-400 hover:text-rose-300 transition-colors"
                                            title="Delete Student"
                                          >
                                            <Trash2 className="w-3 h-3" />
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Subjects Section */}
        {(activeTab === 'all' || activeTab === 'subjects') && (
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-xl space-y-4 backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Curriculum Subjects</h3>
              </div>
              <button
                onClick={() => openCreateModal('subject')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Subject
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-zinc-500">Loading curriculum subjects...</div>
            ) : subjects.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl p-6">
                <p className="font-semibold text-zinc-400 mb-1">0 Subjects in Database</p>
                <button
                  onClick={() => openCreateModal('subject')}
                  className="px-3 py-1.5 bg-emerald-600 text-zinc-950 text-xs font-bold rounded-lg shadow mt-2"
                >
                  + Add Subject
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {subjects.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 flex items-center justify-between text-xs hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-white">{s.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditSubjectModal(s)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-zinc-900 transition-colors"
                        title="Edit Subject Name"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSubject(s.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Teacher Course Allocations Section */}
        {(activeTab === 'all' || activeTab === 'assignments') && (
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-xl space-y-4 backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Teacher Course Allocations</h3>
              </div>
              <button
                onClick={() => openCreateModal('assignment')}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Assign Teacher
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl p-6">
                <p className="font-semibold text-zinc-400 mb-1">No Teacher Allocations in Database</p>
                <p className="text-[11px] text-zinc-500">
                  Assign teachers to specific classes and subjects so they can broadcast attendance sessions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map((a: any) => {
                  const initials = (a.teacher_name || 'T')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 flex items-center justify-between hover:border-zinc-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center text-xs shrink-0 border border-purple-500/30">
                          {initials}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{a.teacher_name || 'Teacher'}</h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {a.class_name || 'Class'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {a.subject_name || 'Subject'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditAssignmentModal(a)}
                          className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                          title="Edit Allocation"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                          title="Remove Allocation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Class, Subject, Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white capitalize">
                {editingItem
                  ? `Edit ${showModal === 'assignment' ? 'Teacher Allocation' : showModal}`
                  : showModal === 'assignment'
                  ? 'Assign Teacher to Subject'
                  : `Add New ${showModal}`}
              </h3>
              <button
                onClick={() => {
                  setShowModal(null);
                  setEditingItem(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              {showModal === 'assignment' ? (
                <>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Select Faculty Teacher</label>
                    <select
                      value={assignmentInput.teacher_id}
                      onChange={(e) => setAssignmentInput({ ...assignmentInput, teacher_id: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      required
                    >
                      <option value="">-- Select Teacher --</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Target Class Section</label>
                    <select
                      value={assignmentInput.class_id}
                      onChange={(e) => setAssignmentInput({ ...assignmentInput, class_id: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      required
                    >
                      <option value="">-- Select Class --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Course Subject</label>
                    <select
                      value={assignmentInput.subject_id}
                      onChange={(e) => setAssignmentInput({ ...assignmentInput, subject_id: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      required
                    >
                      <option value="">-- Select Subject --</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1 capitalize">
                    {showModal} Name
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={showModal === 'class' ? 'e.g. B.Tech CS-A' : 'e.g. Data Structures'}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(null);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 font-medium rounded-xl hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Update Item' : 'Save to DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Student in Class Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white">
                {editingStudent ? 'Edit Student Details' : 'Add Student to Class'}
              </h3>
              <button
                onClick={() => setShowStudentModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClassStudent} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Student Full Name</label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="e.g. Rahul Verma"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  placeholder="e.g. rahul@school.edu"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Roll Number</label>
                <input
                  type="text"
                  value={studentForm.roll_no}
                  onChange={(e) => setStudentForm({ ...studentForm, roll_no: e.target.value })}
                  placeholder="e.g. 21CS014"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Assigned Class</label>
                <select
                  value={studentForm.class_id}
                  onChange={(e) => setStudentForm({ ...studentForm, class_id: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 font-medium rounded-xl hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStudent}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow"
                >
                  {submittingStudent ? 'Saving...' : editingStudent ? 'Update Student' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class-Specific CSV Import Modal */}
      {showClassCsvModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Import Students to Class Roster</h3>
              </div>
              <button
                onClick={() => {
                  setShowClassCsvModal(false);
                  setClassCsvFile(null);
                  setClassCsvStatusMsg('');
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClassCsvUpload} className="space-y-4 text-xs">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 space-y-1">
                <p className="font-semibold text-zinc-200">Target Class Section:</p>
                <p className="font-bold text-indigo-400">
                  {classes.find((c) => c.id === classCsvTargetId)?.name || 'Selected Class'}
                </p>
                <p className="text-zinc-500 text-[10px]">Expected CSV Headers: name, email, roll_no</p>
              </div>

              {classCsvStatusMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    classCsvStatusMsg.includes('Successfully')
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                  }`}
                >
                  {classCsvStatusMsg}
                </div>
              )}

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Select .CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setClassCsvFile(e.target.files?.[0] || null)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-300 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-zinc-950 hover:file:bg-emerald-500 cursor-pointer"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowClassCsvModal(false);
                    setClassCsvFile(null);
                    setClassCsvStatusMsg('');
                  }}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 font-medium rounded-xl hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={classCsvImporting || !classCsvFile}
                  className="px-4 py-2 bg-emerald-600 text-zinc-950 font-bold rounded-xl hover:bg-emerald-500 shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" /> {classCsvImporting ? 'Importing...' : 'Upload & Add to Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
