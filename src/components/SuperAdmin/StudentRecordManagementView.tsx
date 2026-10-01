import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { StudentProfile } from '../../types';
import {
  GraduationCap,
  Search,
  Filter,
  UserPlus,
  Edit2,
  Archive,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Mail,
  Phone,
  BookOpen,
  Award,
} from 'lucide-react';

export const StudentRecordManagementView: React.FC = () => {
  const {
    studentRecords,
    addStudentRecord,
    updateStudentRecord,
    archiveStudentRecord,
    restoreStudentRecord,
    createUser,
    tickets,
  } = useHelpdesk();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterArchived, setFilterArchived] = useState<boolean>(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [selectedStudentForTickets, setSelectedStudentForTickets] = useState<StudentProfile | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // New Student State
  const [newStudent, setNewStudent] = useState({
    studentId: '',
    name: '',
    email: '',
    password: '',
    phone: '',
    degreeProgram: 'BS Computer Science',
    yearLevel: '1st Year',
    enrollmentStatus: 'Regular' as StudentProfile['enrollmentStatus'],
    unitsEnrolled: 18,
  });

  const filteredStudents = studentRecords.filter((s) => {
    if (s.isArchived !== filterArchived) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchId = s.studentId.includes(q);
      const matchProgram = s.degreeProgram.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchProgram) return false;
    }
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate 8 digits
    if (!/^\d{8}$/.test(newStudent.studentId.trim())) {
      setFormError('Student ID must be exactly 8 digits (e.g. 20241092).');
      return;
    }

    const cleanId = newStudent.studentId.trim();
    const cleanName = newStudent.name.trim();

    if (newStudent.password.length < 8) {
      setFormError('Set an initial password with at least 8 characters.');
      return;
    }

    try {
      await createUser({
      name: cleanName,
      email: newStudent.email.trim(),
      role: 'student',
      status: 'active',
      departmentOrOffice: newStudent.degreeProgram,
      studentId: cleanId,
      phoneNumber: newStudent.phone.trim() || undefined,
        password: newStudent.password,
        degreeProgram: newStudent.degreeProgram,
        yearLevel: newStudent.yearLevel,
        enrollmentStatus: newStudent.enrollmentStatus,
        unitsEnrolled: Number(newStudent.unitsEnrolled) || 0,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create this student account.');
      return;
    }

    setShowAddModal(false);
    setNewStudent({
      studentId: '',
      name: '',
      email: '',
      password: '',
      phone: '',
      degreeProgram: 'BS Computer Science',
      yearLevel: '1st Year',
      enrollmentStatus: 'Regular',
      unitsEnrolled: 18,
    });
    setNotificationMsg(`Student profile ${newStudent.name} registered with 8-digit ID.`);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    updateStudentRecord(editingStudent.id, {
      name: editingStudent.name,
      email: editingStudent.email,
      phone: editingStudent.phone,
      degreeProgram: editingStudent.degreeProgram,
      yearLevel: editingStudent.yearLevel,
      enrollmentStatus: editingStudent.enrollmentStatus,
      unitsEnrolled: editingStudent.unitsEnrolled,
    });

    setEditingStudent(null);
    setNotificationMsg(`Updated academic profile for ${editingStudent.name}`);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
              Institutional Student Master Records
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Mandatory 8-Digit ID Format
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Enforce official registrar student ID formatting, verify enrollment statuses, academic standing, and request histories.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 rounded-xl font-heading font-bold text-xs text-white bg-emerald-800 hover:bg-emerald-900 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Student Profile</span>
        </button>
      </div>

      {notificationMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name, 8-digit ID, or program..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-emerald-600 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setFilterArchived(!filterArchived)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                filterArchived
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:text-stone-900'
              }`}
            >
              {filterArchived ? 'Viewing Archived Records' : 'Show Active Records'}
            </button>
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">8-Digit Student ID</th>
                <th className="py-3 px-4">Student Name & Contact</th>
                <th className="py-3 px-4">Degree Program & Year</th>
                <th className="py-3 px-4">Enrollment Status</th>
                <th className="py-3 px-4">Total Requests</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500 text-xs">
                    No student records found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const studentTicketCount = tickets.filter(
                    (t) => t.studentId === s.studentId || t.studentName === s.name
                  ).length;

                  return (
                    <tr key={s.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-bold text-stone-900">
                        <span className="bg-stone-100 text-emerald-800 px-2.5 py-1 rounded-lg border border-stone-200 tracking-wider">
                          {s.studentId}
                        </span>
                      </td>

                      {/* Name & Contact */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {s.profilePicture ? (
                            <img
                              src={s.profilePicture}
                              alt={s.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-stone-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                              {s.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-stone-900">{s.name}</p>
                            <p className="text-[11px] text-stone-500">{s.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Degree Program */}
                      <td className="py-3 px-4 text-stone-700">
                        <p className="font-semibold text-stone-900">{s.degreeProgram}</p>
                        <p className="text-[11px] text-stone-500">{s.yearLevel} • {s.unitsEnrolled} units</p>
                      </td>

                      {/* Enrollment Status */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-800">
                          {s.enrollmentStatus}
                        </span>
                      </td>

                      {/* Request count */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedStudentForTickets(s)}
                          className="font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                        >
                          {studentTicketCount} tickets
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingStudent(s)}
                            title="Edit academic record"
                            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {s.isArchived ? (
                            <button
                              onClick={() => {
                                restoreStudentRecord(s.id);
                                setNotificationMsg(`Restored student record for ${s.name}`);
                              }}
                              title="Restore from archive"
                              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (confirm(`Archive record for ${s.name}?`)) {
                                  archiveStudentRecord(s.id);
                                  setNotificationMsg(`Archived student record for ${s.name}`);
                                }
                              }}
                              title="Archive student record"
                              className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 border border-amber-200 transition-colors cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTER NEW STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-800" />
                <h3 className="font-heading font-bold text-base text-stone-900">
                  Register Official Student Profile
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <label className="block font-bold text-emerald-950 mb-1">
                  Student ID (Mandatory 8 Digits) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  required
                  placeholder="e.g. 20241098"
                  value={newStudent.studentId}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, studentId: e.target.value.replace(/[^0-9]/g, '') })
                  }
                  className="w-full px-3 py-2 font-mono text-sm tracking-widest rounded-xl border border-emerald-300 focus:border-emerald-600 outline-none bg-white font-bold"
                />
                <p className="text-[10px] text-emerald-800 mt-1">
                  Format strictly validated to exactly 8 numerical digits.
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Student Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Clara Santos"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Email Address <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@university.edu"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+63 917 000 0000"
                    value={newStudent.phone}
                    onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Degree Program</label>
                  <select
                    value={newStudent.degreeProgram}
                    onChange={(e) => setNewStudent({ ...newStudent, degreeProgram: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                  >
                    <option value="BS Computer Science">BS Computer Science</option>
                    <option value="BS Information Technology">BS Information Technology</option>
                    <option value="BS Business Administration">BS Business Administration</option>
                    <option value="BS Nursing">BS Nursing</option>
                    <option value="BS Civil Engineering">BS Civil Engineering</option>
                    <option value="BA Communication">BA Communication</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Year Level</label>
                  <select
                    value={newStudent.yearLevel}
                    onChange={(e) => setNewStudent({ ...newStudent, yearLevel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Graduating">Graduating</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Enrollment Status</label>
                <select
                  value={newStudent.enrollmentStatus}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, enrollmentStatus: e.target.value as any })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                >
                  <option value="Regular">Regular</option>
                  <option value="Irregular">Irregular</option>
                  <option value="Graduating">Graduating</option>
                  <option value="Alumni">Alumni</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div>
                <label htmlFor="new-student-password" className="block font-bold text-stone-700 mb-1">
                  Initial Login Password <span className="text-rose-600">*</span>
                </label>
                <input
                  id="new-student-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={newStudent.password}
                  onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
                <p className="mt-1 text-stone-500">Share this password securely with the student. It will not appear in the account list.</p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold cursor-pointer"
                >
                  Save Student Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-heading font-bold text-base text-stone-900">
                Edit Record: {editingStudent.name} ({editingStudent.studentId})
              </h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editingStudent.email}
                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingStudent.phone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Enrollment Status</label>
                <select
                  value={editingStudent.enrollmentStatus}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, enrollmentStatus: e.target.value as any })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                >
                  <option value="Regular">Regular</option>
                  <option value="Irregular">Irregular</option>
                  <option value="Graduating">Graduating</option>
                  <option value="Alumni">Alumni</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold cursor-pointer"
                >
                  Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT TICKETS MODAL */}
      {selectedStudentForTickets && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900">
                  Requests for {selectedStudentForTickets.name}
                </h3>
                <p className="text-xs text-stone-500 font-mono">ID: {selectedStudentForTickets.studentId}</p>
              </div>
              <button
                onClick={() => setSelectedStudentForTickets(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto text-xs">
              {tickets.filter(
                (t) =>
                  t.studentId === selectedStudentForTickets.studentId ||
                  t.studentName === selectedStudentForTickets.name
              ).length === 0 ? (
                <p className="text-center py-6 text-stone-500">No requests filed by this student yet.</p>
              ) : (
                tickets
                  .filter(
                    (t) =>
                      t.studentId === selectedStudentForTickets.studentId ||
                      t.studentName === selectedStudentForTickets.name
                  )
                  .map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-stone-900 font-mono">{ticket.ticketNumber}</p>
                        <p className="text-stone-600 text-[11px]">{ticket.category} • {ticket.subject}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {ticket.status}
                        </span>
                        <p className="text-[10px] text-stone-400 mt-0.5">{ticket.createdAt}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedStudentForTickets(null)}
                className="px-4 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
