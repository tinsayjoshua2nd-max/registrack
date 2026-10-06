import React, { useState, useMemo } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { TicketCategory, TicketPriority, DeliveryOption } from '../../types';
import {
  FileText,
  User,
  Hash,
  GraduationCap,
  Mail,
  Phone,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
  ShieldCheck,
  Search,
  Clock,
  Layers,
  ChevronRight,
  Users,
  X,
} from 'lucide-react';

export const AdminSubmitTicketView: React.FC = () => {
  const {
    studentRecords,
    users,
    staffList,
    submitNewTicket,
    setAdminView,
    currentUser,
  } = useHelpdesk();

  // Combine student records & registered student user accounts so newly created accounts are immediately visible!
  const allStudentAccounts = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        studentId: string;
        degreeProgram: string;
        yearLevel: string;
        email: string;
        phone: string;
      }
    >();

    // Add studentRecords
    studentRecords.forEach((s) => {
      map.set(s.studentId, {
        id: s.id,
        name: s.name,
        studentId: s.studentId,
        degreeProgram: s.degreeProgram,
        yearLevel: s.yearLevel,
        email: s.email,
        phone: s.phone || '',
      });
    });

    // Add from user accounts where role === 'student'
    users
      .filter((u) => u.role === 'student' && u.studentId)
      .forEach((u) => {
        if (!map.has(u.studentId!)) {
          map.set(u.studentId!, {
            id: u.id,
            name: u.name,
            studentId: u.studentId!,
            degreeProgram: u.departmentOrOffice || '',
            yearLevel: '',
            email: u.email,
            phone: u.phoneNumber || '',
          });
        }
      });

    return Array.from(map.values());
  }, [studentRecords, users]);

  // Search State for Student
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Form State
  const [studentName, setStudentName] = useState<string>('');
  const [studentId, setStudentId] = useState<string>('');
  const [degreeProgram, setDegreeProgram] = useState<string>('');
  const [yearLevel, setYearLevel] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  // Service Category state
  const [category, setCategory] = useState<TicketCategory>('TOR');
  const [documentType, setDocumentType] = useState<string>('Official Transcript of Records (TOR)');
  const [copies, setCopies] = useState<number>(1);
  const [purpose, setPurpose] = useState<string>('');
  const [priority, setPriority] = useState<TicketPriority>('Normal');
  const [description, setDescription] = useState<string>('');

  // Staff Reassignment state: Receiver can reassign to records management, evaluator, or registrar
  const [assignedStaff, setAssignedStaff] = useState<string>('');
  const [reassignToast, setReassignToast] = useState<string | null>(null);

  // Success State
  const [createdTicket, setCreatedTicket] = useState<any | null>(null);
  const [copiedTicket, setCopiedTicket] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter students based on search query
  const searchedStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return allStudentAccounts.slice(0, 8);
    const q = studentSearchQuery.toLowerCase();
    return allStudentAccounts.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.studentId.includes(q) ||
        s.degreeProgram.toLowerCase().includes(q)
    );
  }, [allStudentAccounts, studentSearchQuery]);

  const handleSelectStudent = (st: (typeof allStudentAccounts)[0]) => {
    setStudentName(st.name);
    setStudentId(st.studentId);
    setDegreeProgram(st.degreeProgram);
    setYearLevel(st.yearLevel);
    setEmail(st.email);
    setPhone(st.phone);
    setStudentSearchQuery(`${st.name} (${st.studentId})`);
    setShowSearchDropdown(false);
  };

  // Category change logic for the updated 13 Service Categories
  const handleCategoryChange = (newCat: TicketCategory) => {
    setCategory(newCat);
    let defaultDoc = newCat;
    if (newCat === 'TOR') defaultDoc = 'Official Transcript of Records (TOR)';
    else if (newCat === 'Honorable Dismissal') defaultDoc = 'Honorable Dismissal Certificate';
    else if (newCat === 'Certificate of Registration') defaultDoc = 'Certificate of Registration (COR/RAF)';
    else if (newCat === 'Certificate of Graduation') defaultDoc = 'Certificate of Graduation';
    else if (newCat === 'Certificate of Grades') defaultDoc = 'Certified Copy of Grades';
    else if (newCat === 'Form 137 / SF10') defaultDoc = 'Student Permanent Record (Form 137 / SF10)';
    else if (newCat === 'English as Medium of Instruction') defaultDoc = 'Certification of English as Medium of Instruction';
    else if (newCat === 'Letter of No Objection') defaultDoc = 'Official Letter of No Objection';
    else if (newCat === 'Certificate of GWA') defaultDoc = 'Certificate of General Weighted Average (GWA)';
    else if (newCat === 'Certificate of Latin Honors / SAC') defaultDoc = 'Certificate of Latin Honors / SAC';
    else if (newCat === 'Diploma') defaultDoc = 'Official University Diploma';
    else if (newCat === 'CAV') defaultDoc = 'Certification, Authentication and Verification (CAV)';
    else if (newCat === 'Certified True Copies') defaultDoc = 'Certified True Copies of Documents';

    setDocumentType(defaultDoc);
  };

  const handleReassignClick = () => {
    const selectedStaffObj = staffList.find((s) => s.name === assignedStaff);
    if (!selectedStaffObj) {
      setErrorMessage('Select a staff member before assigning this request.');
      return;
    }
    setErrorMessage(null);
    setReassignToast(`Will be assigned to ${selectedStaffObj.name} when you submit.`);
  };

  // Submission handler
  const handleGenerateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = studentName.trim();
    const cleanId = studentId.trim();

    if (!cleanName) {
      setErrorMessage('Student name is required.');
      return;
    }

    if (!cleanId) {
      setErrorMessage('Student ID is required.');
      return;
    }

    // Enforce 8 numeric digits
    if (!/^\d{8}$/.test(cleanId)) {
      setErrorMessage('Student ID must be exactly 8 numeric digits.');
      return;
    }

    if (!assignedStaff) {
      setErrorMessage('Select a staff member before submitting this request.');
      return;
    }

    try {
      const generated = await submitNewTicket({
        studentName: cleanName,
        studentId: cleanId,
        email: email.trim(),
        phone: phone.trim(),
        degreeProgram,
        yearLevel,
        category,
        documentType,
        copies: Number(copies) || 1,
        purpose,
        deliveryOption: 'Office Pick-up',
        priority,
        assignedTo: assignedStaff,
        subject: `${documentType || category} Request`,
        description: description.trim(),
      });

      setCreatedTicket(generated);
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to generate ticket. Please try again.');
    }
  };

  const handleCopyTicketNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 2000);
  };

  const handleResetForm = () => {
    setCreatedTicket(null);
    setCategory('Certificates');
    setDocumentType('Certificate of Enrollment');
    setCopies(1);
    setPurpose('');
    setDescription('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 shadow-md mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                REGISTRAR EVALUATOR INTAKE DESK
              </span>
              <span className="text-xs text-stone-300 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Live Ticket Generation Engine
              </span>
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
              Application Form
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              When a student requests a document at the registrar counter, the evaluator logs the
              request here. Submitting instantly generates the official support ticket, which
              immediately populates the student’s live <strong>Track Request Status</strong> portal.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setAdminView('all-requests')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-white/10"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>View Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generated Ticket Success Modal / Slip Display */}
      {createdTicket ? (
        <div className="bg-white rounded-2xl border-2 border-emerald-500 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-emerald-800 text-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-700/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/50 flex items-center justify-center border border-emerald-400/40">
                  <CheckCircle2 className="w-7 h-7 text-emerald-200" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-xl sm:text-2xl text-white">
                    Support Ticket Generated Successfully!
                  </h2>
                  <p className="text-emerald-100 text-xs sm:text-sm">
                    This ticket is now active and tracked in real-time by both the Student and Registrar.
                  </p>
                </div>
              </div>

              <div className="bg-stone-900/80 px-4 py-2.5 rounded-xl border border-emerald-400/30 flex items-center gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase text-emerald-400">Tracking Ticket #</p>
                  <p className="text-lg font-mono font-black text-white">{createdTicket.ticketNumber}</p>
                </div>
                <button
                  onClick={() => handleCopyTicketNumber(createdTicket.ticketNumber)}
                  className="p-2 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
                  title="Copy ticket number"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {copiedTicket && (
              <div className="mt-3 text-right">
                <span className="text-xs font-mono text-emerald-200 bg-emerald-900/60 px-2 py-0.5 rounded">
                  ✓ Ticket # copied to clipboard
                </span>
              </div>
            )}
          </div>

          {/* Ticket Information & Printable Slip Preview */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Student Summary Card */}
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <h3 className="font-heading font-bold text-xs uppercase text-stone-500 tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-700" />
                  Student Record Information
                </h3>
                <div className="space-y-1.5 text-xs text-stone-700">
                  <div className="flex justify-between py-1 border-b border-stone-200">
                    <span className="text-stone-500">Student Full Name:</span>
                    <span className="font-bold text-stone-900">{createdTicket.studentName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200">
                    <span className="text-stone-500">Student ID (8 digits):</span>
                    <span className="font-mono font-bold text-emerald-800">{createdTicket.studentId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200">
                    <span className="text-stone-500">Degree & Year:</span>
                    <span className="font-medium text-stone-800">
                      {createdTicket.degreeProgram} • {createdTicket.yearLevel}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-500">Contact Email:</span>
                    <span className="font-mono text-stone-600">{createdTicket.email}</span>
                  </div>
                </div>
              </div>

              {/* Document Claiming Schedule Card */}
              <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <h3 className="font-heading font-bold text-xs uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-emerald-700" />
                  Releasing & Schedule Details
                </h3>
                <div className="space-y-1.5 text-xs text-stone-700">
                  <div className="flex justify-between py-1 border-b border-emerald-100">
                    <span className="text-stone-500">Document Type:</span>
                    <span className="font-bold text-stone-900">{createdTicket.documentType}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-emerald-100">
                    <span className="text-stone-500">Quantity & Delivery:</span>
                    <span className="font-medium text-stone-800">
                      {createdTicket.copies} copy(ies) • {createdTicket.deliveryOption}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-emerald-100">
                    <span className="text-stone-500">Estimated Ready Date:</span>
                    <span className="font-bold text-emerald-900">{createdTicket.estimatedReleaseDate}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-500">Counter Window:</span>
                    <span className="font-bold text-stone-900">{createdTicket.releaseLocation}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Claiming Instructions for Student */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Next Steps for the Student:</p>
                <p className="mt-0.5 leading-relaxed text-amber-800">
                  Advise the student to log in to their student portal. They can track the 4-stage progress
                  under <strong>"Track Request Status"</strong> using Ticket Number{' '}
                  <span className="font-mono font-bold">{createdTicket.ticketNumber}</span> or their 8-digit
                  Student ID <span className="font-mono font-bold">{createdTicket.studentId}</span>.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-200">
              <div className="flex items-center gap-2">
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAdminView('all-requests')}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Go to Ticket Queue
                </button>
                <button
                  onClick={handleResetForm}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 font-bold text-xs transition-colors cursor-pointer"
                >
                  ➕ File Another Request
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Intake Form */
        <form onSubmit={handleGenerateTicket} className="space-y-8">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Step 1: Student Record Identification */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-stone-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div>
                <h2 className="font-heading font-bold text-lg text-stone-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-800" />
                  1. Walk-in Student Information
                </h2>
                <p className="text-xs text-stone-500">
                  Search an existing student record or enter the walk-in student’s details. An account is not required to file a request.
                </p>
              </div>

              {/* Student account provisioning is restricted to the Registrar. */}
              <div className="flex items-center gap-2">
                <div
                  role="note"
                  className="px-3.5 py-2 rounded-xl font-heading font-bold text-xs text-stone-700 bg-stone-100 border border-stone-200 flex items-center gap-1.5 shrink-0 max-w-xs"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Only the Registrar can create student accounts in Student Records.</span>
                </div>
              </div>
            </div>

            {/* Live Search by Student Name or Student ID */}
            <div className="relative">
              <label className="block font-bold text-stone-700 mb-1 text-xs">
                Search Student (Name or 8-Digit Student ID)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Type a student name or 8-digit ID"
                  value={studentSearchQuery}
                  onFocus={() => setShowSearchDropdown(true)}
                  onChange={(e) => {
                    setStudentSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:border-emerald-600 focus:outline-none transition-all font-medium"
                />
                {studentSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setStudentSearchQuery('');
                      setShowSearchDropdown(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSearchDropdown && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white rounded-xl border border-stone-200 shadow-lg max-h-56 overflow-y-auto divide-y divide-stone-100">
                  {searchedStudents.length === 0 ? (
                    <div className="p-3 text-xs text-stone-500 text-center">
                      No matching student records found. Enter the walk-in student’s details below to file this request. The Registrar must create any student account in Student Records.
                    </div>
                  ) : (
                    searchedStudents.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleSelectStudent(st)}
                        className="w-full p-2.5 text-left text-xs hover:bg-emerald-50/80 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">{st.name}</p>
                            <p className="text-[11px] text-stone-500">{st.degreeProgram} • {st.yearLevel}</p>
                          </div>
                        </div>
                        <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200 text-[11px]">
                          #{st.studentId}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Student Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter student full name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Student ID (8 Digits Only) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  pattern="\d{8}"
                  placeholder="Enter 8-digit student ID"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full px-3 py-2 font-mono font-bold text-stone-900 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
                <p className="text-[10px] text-stone-400 mt-1">Must be exactly 8 numeric digits.</p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Degree Program</label>
                <input
                  type="text"
                  placeholder="Enter degree program"
                  value={degreeProgram}
                  onChange={(e) => setDegreeProgram(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Year Level</label>
                <select
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="5th Year">5th Year</option>
                  <option value="Graduate / Alumni">Graduate / Alumni</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Notification Email</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  placeholder="Enter mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Document & Request Details */}
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-stone-200 shadow-xs space-y-5">
            <div className="pb-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-bold text-lg text-stone-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-800" />
                  2. Requested Document & Service Category
                </h2>
                <p className="text-xs text-stone-500">
                  Specify the exact document requested at the counter and assign to responsible staff.
                </p>
              </div>
            </div>

            {/* Reassign Section with dropdown of all staff names & their roles */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block font-bold text-stone-900 text-xs">
                    Assign to staff:
                  </label>
                  <p className="text-[11px] text-stone-600">
                    Receiver can freely reassign to Records Management, Evaluator, or Registrar Officer.
                  </p>
                </div>
                <div className="min-w-0 w-full sm:w-auto flex items-center gap-2">
                  <select
                    required
                    value={assignedStaff}
                    onChange={(e) => {
                      setAssignedStaff(e.target.value);
                      setReassignToast(null);
                      setErrorMessage(null);
                    }}
                    className="min-w-0 flex-1 sm:flex-initial px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white font-semibold text-stone-900 focus:border-emerald-600 outline-none"
                  >
                    <option value="">Select staff member</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.role})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleReassignClick}
                    disabled={!assignedStaff}
                    className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-colors cursor-pointer shrink-0 shadow-2xs"
                  >
                    Assign to
                  </button>
                </div>
              </div>
              {reassignToast && (
                <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{reassignToast}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Service Category <span className="text-rose-600">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value as TicketCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none font-semibold text-stone-900"
                >
                  <option value="TOR">TOR</option>
                  <option value="Honorable Dismissal">Honorable Dismissal</option>
                  <option value="Certificate of Registration">Certificate of Registration</option>
                  <option value="Certificate of Graduation">Certificate of Graduation</option>
                  <option value="Certificate of Grades">Certificate of Grades</option>
                  <option value="Form 137 / SF10">Form 137 / SF10</option>
                  <option value="English as Medium of Instruction">English as Medium of Instruction</option>
                  <option value="Letter of No Objection">Letter of No Objection</option>
                  <option value="Certificate of GWA">Certificate of GWA</option>
                  <option value="Certificate of Latin Honors / SAC">Certificate of Latin Honors / SAC</option>
                  <option value="Diploma">Diploma</option>
                  <option value="CAV">CAV</option>
                  <option value="Certified True Copies">Certified True Copies</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Document Type <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter requested document type"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Number of Copies</label>
                <select
                  value={copies}
                  onChange={(e) => setCopies(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'copy' : 'copies'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block font-bold text-stone-700 mb-1">
                  Intended Purpose <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter the student’s intended purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Claim</label>
                <div className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-100 font-bold text-stone-800">
                  Office Pick-up
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  Claim mode is exclusively Office Pick-up at the Registrar Window.
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none font-semibold"
                >
                  <option value="Normal">Normal (Standard 2-3 Days)</option>
                  <option value="Urgent">Urgent (Expedited / 24-48 Hours)</option>
                  <option value="Deadline-sensitive">Priority (Same-Day / Deadline Case)</option>
                </select>
              </div>

              <div className="lg:col-span-3">
                <label className="block font-bold text-stone-700 mb-1">Evaluator Counter Notes</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any specific evaluator findings, receipt numbers, or special instructions..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">

            <button
              type="submit"
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Support Ticket & Send to Student</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
