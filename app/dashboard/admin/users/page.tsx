'use client';

import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { supabase, UserModel, ClassModel } from '@/lib/supabase';
import { UserPlus, Search, X, UserCheck, GraduationCap, Trash2, Edit2, FileSpreadsheet, Upload } from 'lucide-react';

export default function AdminUsersPage() {
  const [usersList, setUsersList] = useState<UserModel[]>([]);
  const [classList, setClassList] = useState<ClassModel[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher');
  const [searchTerm, setSearchTerm] = useState('');

  // Add/Edit User Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserModel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'teacher',
    roll_no: '',
    class_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Bulk CSV Roster State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvClassId, setCsvClassId] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvStatusMsg, setCsvStatusMsg] = useState('');

  const handleBulkCsvUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setCsvImporting(true);
    setCsvStatusMsg('Parsing CSV file...');

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows: any[] = results.data;
          if (!rows || rows.length === 0) {
            setCsvStatusMsg('CSV file is empty or invalid.');
            setCsvImporting(false);
            return;
          }

          const newUsers = rows.map((r, i) => ({
            id: `student-csv-${Date.now()}-${i}`,
            name: (r.name || r.Name || 'Student').trim(),
            email: (r.email || r.Email || `student${i + 1}@school.edu`).trim().toLowerCase(),
            role: 'student',
            roll_no: (r.roll_no || r.RollNo || r.roll || `R-${i + 1}`).toString().trim(),
            class_id: csvClassId || (r.class_id || r.classId || null),
          }));

          const { error } = await supabase.from('users').insert(newUsers);
          if (error) {
            setCsvStatusMsg('Error importing CSV: ' + error.message);
          } else {
            setCsvStatusMsg(`Successfully imported ${newUsers.length} students!`);
            setTimeout(() => {
              setShowCsvModal(false);
              setCsvFile(null);
              setCsvStatusMsg('');
              fetchUsers();
            }, 1500);
          }
        } catch (err: any) {
          setCsvStatusMsg('Failed to process CSV: ' + err.message);
        } finally {
          setCsvImporting(false);
        }
      },
      error: (err) => {
        setCsvStatusMsg('CSV Parse Error: ' + err.message);
        setCsvImporting(false);
      },
    });
  };

  useEffect(() => {
    fetchUsers();
    fetchClasses();
  }, []);

  useEffect(() => {
    let result = usersList.filter((u) => u.role === activeTab);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.roll_no?.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(result);
  }, [activeTab, searchTerm, usersList]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, classes(name)')
        .order('name', { ascending: true });

      if (!error && data) {
        const parsed: UserModel[] = data.map((u: any) => ({
          ...u,
          className: u.classes?.name || u.class_name || 'N/A',
        }));
        setUsersList(parsed);
      } else {
        setUsersList([]);
      }
    } catch (e) {
      console.error(e);
      setUsersList([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data } = await supabase.from('classes').select('*').order('name');
      if (data) setClassList(data as ClassModel[]);
    } catch (e) {
      console.error(e);
    }
  };

  const openAddModal = (role: 'teacher' | 'student') => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role, roll_no: '', class_id: '' });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (u: UserModel) => {
    setEditingUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      role: u.role as any,
      roll_no: u.roll_no || '',
      class_id: u.class_id || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError('Please fill in Name and Email');
      return;
    }
    setFormError('');
    setSubmitting(true);

    try {
      if (editingUser) {
        // Update User
        const { error } = await supabase
          .from('users')
          .update({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            role: formData.role,
            roll_no: formData.roll_no.trim() || null,
            class_id: formData.class_id.trim() || null,
          })
          .eq('id', editingUser.id);

        if (error) setFormError(error.message);
        else {
          setShowModal(false);
          fetchUsers();
        }
      } else {
        // Create User
        const newId = 'user-' + Date.now();
        const { error } = await supabase.from('users').insert({
          id: newId,
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
          roll_no: formData.roll_no.trim() || null,
          class_id: formData.class_id.trim() || null,
        });

        if (error) setFormError(error.message);
        else {
          setShowModal(false);
          fetchUsers();
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user profile?')) return;

    try {
      await supabase.from('users').delete().eq('id', userId);
      fetchUsers();
    } catch (e) {
      console.error('Delete User Failed:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Faculty & Student Directory</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Manage Teachers and Students registered in your Supabase Database.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowCsvModal(true)}
            className="px-3.5 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-500/20 flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Import CSV Roster
          </button>
          <button
            onClick={() => openAddModal('teacher')}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-2 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Add Teacher
          </button>
          <button
            onClick={() => openAddModal('student')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('teacher')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'teacher'
                ? 'bg-emerald-600 text-zinc-950 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Teachers ({usersList.filter((u) => u.role === 'teacher').length})
          </button>
          <button
            onClick={() => setActiveTab('student')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'student'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" /> Students ({usersList.filter((u) => u.role === 'student').length})
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or roll number..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-500">Querying database users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl m-6 p-8">
            <p className="text-zinc-300 font-bold mb-1">No {activeTab}s found in database.</p>
            <p className="text-[11px] text-zinc-500 mb-4">
              Click "+ Add {activeTab === 'teacher' ? 'Teacher' : 'Student'}" above to register entries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 font-bold border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Name & Email</th>
                  <th className="px-6 py-4">Role</th>
                  {activeTab === 'student' && <th className="px-6 py-4">Roll Number</th>}
                  <th className="px-6 py-4">Assigned Class</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center font-bold text-xs">
                          {u.name[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{u.name}</p>
                          <p className="text-[11px] text-zinc-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          u.role === 'teacher'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    {activeTab === 'student' && (
                      <td className="px-6 py-4 font-mono font-bold text-zinc-300">{u.roll_no || 'N/A'}</td>
                    )}
                    <td className="px-6 py-4 text-zinc-300 font-medium">{u.className || 'N/A'}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
      </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white capitalize">
                {editingUser ? 'Edit User Profile' : `Add New ${formData.role}`}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 mt-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. john@school.edu"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">System Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>

              {formData.role === 'student' && (
                <>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Roll Number</label>
                    <input
                      type="text"
                      value={formData.roll_no}
                      onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                      placeholder="e.g. 21CS042"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Assign Class</label>
                    <select
                      value={formData.class_id}
                      onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Select Class --</option>
                      {classList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 font-medium rounded-xl hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow"
                >
                  {submitting ? 'Saving...' : 'Save User to DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Upload Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Import Students Roster (CSV)</h3>
              </div>
              <button
                onClick={() => {
                  setShowCsvModal(false);
                  setCsvFile(null);
                  setCsvStatusMsg('');
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkCsvUpload} className="space-y-4 mt-4 text-xs">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 space-y-1">
                <p className="font-semibold text-zinc-200">CSV Columns Expected:</p>
                <p className="font-mono text-emerald-400">name, email, roll_no</p>
                <p className="text-zinc-500 text-[10px]">Headers are auto-detected (e.g. Name, Email, RollNo).</p>
              </div>

              {csvStatusMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    csvStatusMsg.includes('Successfully')
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                  }`}
                >
                  {csvStatusMsg}
                </div>
              )}

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Default Assigned Class</label>
                <select
                  value={csvClassId}
                  onChange={(e) => setCsvClassId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Apply Class to All Imported Students --</option>
                  {classList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Select .CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-300 text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-zinc-950 hover:file:bg-emerald-500 cursor-pointer"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCsvModal(false);
                    setCsvFile(null);
                    setCsvStatusMsg('');
                  }}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 font-medium rounded-xl hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={csvImporting || !csvFile}
                  className="px-4 py-2 bg-emerald-600 text-zinc-950 font-bold rounded-xl hover:bg-emerald-500 shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" /> {csvImporting ? 'Importing...' : 'Upload & Process CSV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
