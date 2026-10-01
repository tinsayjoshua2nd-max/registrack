import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import {
  GraduationCap,
  ShieldCheck,
  Building,
  KeyRound,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  HelpCircle,
  School,
  Lock,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginStudent, loginAdmin, loginSuperAdmin } = useHelpdesk();

  // Selected tab: 'student' | 'admin' | 'superadmin'
  const [activeTab, setActiveTab] = useState<'student' | 'admin' | 'superadmin'>('student');

  // Student Form State
  const [studentName, setStudentName] = useState('Stevie Ray Rotulo');
  const [studentPassword, setStudentPassword] = useState('20231492');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Admin Form State
  const [adminName, setAdminName] = useState('Ms. Elena Ramos');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Super Admin Form State
  const [superAdminName, setSuperAdminName] = useState('Dr. Alexander Reyes');
  const [superAdminPassword, setSuperAdminPassword] = useState('superadmin123');
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false);
  const [superAdminError, setSuperAdminError] = useState<string | null>(null);

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);
    const result = loginStudent(studentName, studentPassword);
    if (!result.success) {
      setStudentError(result.error || 'Failed to log in as student.');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    const result = loginAdmin(adminName, adminPassword);
    if (!result.success) {
      setAdminError(result.error || 'Failed to log in as admin.');
    }
  };

  const handleSuperAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuperAdminError(null);
    const result = loginSuperAdmin(superAdminName, superAdminPassword);
    if (!result.success) {
      setSuperAdminError(result.error || 'Failed to log in as Super Admin.');
    }
  };

  const handleQuickStudentSelect = (name: string, idOrPassword: string) => {
    setStudentName(name);
    setStudentPassword(idOrPassword);
    setStudentError(null);
  };

  const handleQuickAdminSelect = (name: string) => {
    setAdminName(name);
    setAdminPassword('admin123');
    setAdminError(null);
  };

  const handleQuickSuperAdminSelect = () => {
    setSuperAdminName('Dr. Alexander Reyes');
    setSuperAdminPassword('superadmin123');
    setSuperAdminError(null);
  };

  return (
    <div className="min-h-[100dvh] bg-stone-100 flex flex-col text-stone-900 selection:bg-emerald-200 selection:text-emerald-900">
      {/* Top University Registrar Bar */}
      <header className="safe-area-top bg-emerald-900 text-emerald-50 px-3 sm:px-4 py-2 text-xs font-medium border-b border-emerald-950">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate font-semibold tracking-wide">
              Office of the University Registrar • Online Helpdesk & Document Tracking System
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-emerald-200 text-xs">
            <span>Operating Hours: Mon - Fri (8:00 AM - 5:00 PM)</span>
            <span className="text-emerald-300 font-mono">Window 1 to 5 Active</span>
          </div>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="flex-1 flex items-center justify-center px-3 py-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-stone-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Institutional Identity & System Highlights (5 cols on lg) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white p-5 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-emerald-700/20 blur-2xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

            <div className="relative z-10">
              {/* University Emblem and Title */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white text-emerald-900 flex items-center justify-center shadow-lg font-bold">
                  <GraduationCap className="w-7 h-7 text-emerald-800" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-extrabold text-2xl tracking-tight text-white">
                      RegisTrack
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 border border-emerald-500/40">
                      OFFICIAL
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200 font-medium">
                    University Registrar Records & Helpdesk Portal
                  </p>
                </div>
              </div>

              {/* Mission statement */}
              <p className="mt-4 sm:mt-6 text-sm text-emerald-100/90 leading-relaxed line-clamp-2 sm:line-clamp-none">
                Improving the efficiency, accessibility, and transparency of university registrar services through real-time request tracking, automated ticket generation, and dedicated evaluator support.
              </p>

              {/* Feature Highlights Cards */}
              <div className="mt-6 space-y-3 hidden lg:block">
                <div className="p-3 rounded-xl bg-emerald-800/60 border border-emerald-700/60 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Online Ticket Inquiries</h4>
                    <p className="text-[11px] text-emerald-200 mt-0.5 leading-snug">
                      Submit concerns for Enrollment, Grades, TOR, Certifications, and Clearances.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-800/60 border border-emerald-700/60 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">5-Stage Real-Time Tracking</h4>
                    <p className="text-[11px] text-emerald-200 mt-0.5 leading-snug">
                      Monitor Submitted, Reviewed, Processing, Ready, and Completed with release dates.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-800/60 border border-emerald-700/60 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Role-Separated Portals</h4>
                    <p className="text-[11px] text-emerald-200 mt-0.5 leading-snug">
                      Dedicated student interface and authorized registrar evaluator management desk.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Certification Notice */}
            <div className="relative z-10 pt-6 mt-6 border-t border-emerald-700/60 text-[11px] text-emerald-200/80 hidden lg:flex items-center justify-between">
              <span>ISO 9001:2015 Quality Records Management</span>
              <span>v2.4 Production</span>
            </div>
          </div>

          {/* Right Column: Portal Login Selector and Forms (7 cols on lg) */}
          <div className="lg:col-span-7 p-4 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
            
            {/* Form Header */}
            <div>
              <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
                Secure Authentication Gateway
              </span>
              <h2 className="mt-3 font-heading font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">
                Log In to Your Portal
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">
                Please choose your portal role below to access student services or administrator features.
              </p>
            </div>

            {/* Role Switcher Tabs */}
            <div className="mt-6 grid grid-cols-3 p-1.5 rounded-2xl bg-stone-100 border border-stone-200">
              <button
                id="tab-login-student"
                type="button"
                onClick={() => {
                  setActiveTab('student');
                  setStudentError(null);
                }}
                className={`min-h-11 py-2.5 px-1 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
                  activeTab === 'student'
                    ? 'bg-white text-emerald-950 shadow-sm border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <GraduationCap className={`w-4 h-4 shrink-0 ${activeTab === 'student' ? 'text-emerald-700' : 'text-stone-400'}`} />
                <span className="truncate">Student</span>
              </button>

              <button
                id="tab-login-admin"
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  setAdminError(null);
                }}
                className={`min-h-11 py-2.5 px-1 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTab === 'admin' ? 'text-white' : 'text-stone-400'}`} />
                <span className="truncate">Staff<span className="hidden sm:inline"> Officers</span></span>
              </button>

              <button
                id="tab-login-superadmin"
                type="button"
                onClick={() => {
                  setActiveTab('superadmin');
                  setSuperAdminError(null);
                }}
                className={`min-h-11 py-2.5 px-1 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 cursor-pointer ${
                  activeTab === 'superadmin'
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Lock className={`w-4 h-4 shrink-0 ${activeTab === 'superadmin' ? 'text-emerald-400' : 'text-stone-400'}`} />
                <span className="truncate">Registrar</span>
              </button>
            </div>

            {/* STUDENT LOGIN FORM */}
            {activeTab === 'student' && (
              <form onSubmit={handleStudentSubmit} className="mt-6 space-y-4">
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-2.5">
                  <User className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Student Access Mode</p>
                    <p className="text-emerald-800 text-[11px] mt-0.5">
                      Log in using your <strong>Student Name</strong> and <strong>PASSWORD</strong> to submit tickets, track document progress, and view release schedules.
                    </p>
                  </div>
                </div>

                {studentError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{studentError}</span>
                  </div>
                )}

                {/* Student Name / Student ID */}
                <div>
                  <label htmlFor="student-name-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center justify-between">
                    <span>Student Name or Student ID <span className="text-rose-600">*</span></span>
                    <span className="hidden sm:inline text-[11px] font-normal text-stone-500 font-mono">Name or 8-Digit ID</span>
                  </label>
                  <div className="relative">
                    <input
                      id="student-name-input"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="e.g. Stevie Ray Rotulo or 8-digit Student ID"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-300 bg-stone-50/50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all outline-none"
                    />
                    <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* PASSWORD (Accepts 8-digit Student ID or created password) */}
                <div>
                  <label htmlFor="student-password-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center justify-between">
                    <span>PASSWORD <span className="text-rose-600">*</span></span>
                    <span className="hidden sm:inline text-[11px] font-normal text-stone-500 font-mono">Student ID or Created Password</span>
                  </label>
                  <div className="relative">
                    <input
                      id="student-password-input"
                      type={showStudentPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Enter password or 8-digit Student ID"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-stone-300 bg-stone-50/50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all outline-none font-mono"
                    />
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowStudentPassword(!showStudentPassword)}
                       aria-label={showStudentPassword ? 'Hide password' : 'Show password'}
                       className="absolute right-1 top-1/2 -translate-y-1/2 min-h-11 min-w-11 text-stone-400 hover:text-stone-600 cursor-pointer flex items-center justify-center"
                      title={showStudentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Enter your created password or your 8-digit Student ID. For new students, your default password is your <strong>8-digit Student ID</strong>.
                  </p>
                </div>

                {/* Quick 1-Click Demo Profiles */}
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-stone-500 mb-1.5">
                    Quick Demo Profiles (8-digit IDs):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickStudentSelect('Stevie Ray Rotulo', '20231492')}
                      className="min-h-10 px-3 py-2 text-[11px] font-medium rounded-lg bg-stone-100 hover:bg-emerald-100 hover:text-emerald-900 border border-stone-200 transition-colors cursor-pointer text-stone-700"
                    >
                      Stevie Ray Rotulo (20231492)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickStudentSelect('Maria Elena Santos', '20224891')}
                      className="min-h-10 px-3 py-2 text-[11px] font-medium rounded-lg bg-stone-100 hover:bg-emerald-100 hover:text-emerald-900 border border-stone-200 transition-colors cursor-pointer text-stone-700"
                    >
                      Maria Santos (20224891)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickStudentSelect('Joshua David Lim', '20241052')}
                      className="min-h-10 px-3 py-2 text-[11px] font-medium rounded-lg bg-stone-100 hover:bg-emerald-100 hover:text-emerald-900 border border-stone-200 transition-colors cursor-pointer text-stone-700"
                    >
                      Joshua Lim (20241052)
                    </button>
                  </div>
                </div>

                {/* Submit Student Button */}
                <button
                  id="btn-login-student-submit"
                  type="submit"
                  className="w-full min-h-12 py-3 px-4 rounded-xl font-heading font-bold text-sm text-white bg-emerald-700 hover:bg-emerald-800 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <span>Log In to Student Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* ADMIN / REGISTRAR LOGIN FORM */}
            {activeTab === 'admin' && (
              <form onSubmit={handleAdminSubmit} className="mt-6 space-y-4">
                <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-xs text-stone-800 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-stone-900">Official Registrar Personnel Only</p>
                    <p className="text-stone-600 text-[11px] mt-0.5">
                      Enter your authorized <strong>Admin Name</strong> and <strong>Admin Password</strong> to access the document triage desk, evaluate TOR requests, update release stages, and post advisories.
                    </p>
                  </div>
                </div>

                {adminError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{adminError}</span>
                  </div>
                )}

                {/* Admin Name */}
                <div>
                  <label htmlFor="admin-name-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Admin Name <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="admin-name-input"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="e.g. Ms. Elena Ramos or Records Office"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-300 bg-stone-50/50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all outline-none"
                    />
                    <Building className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Admin Password */}
                <div>
                  <label htmlFor="admin-password-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Admin Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="admin-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Enter registrar password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-stone-300 bg-stone-50/50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all outline-none"
                    />
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 min-h-11 min-w-11 text-stone-400 hover:text-stone-600 cursor-pointer flex items-center justify-center"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-stone-500">
                    <span>Hint: Demo password is <strong className="text-emerald-800">admin123</strong> or <strong className="text-emerald-800">admin</strong></span>
                  </div>
                </div>

                {/* Quick Admin Demo Fill */}
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-stone-500 mb-1.5">
                    Authorized Officer Desks (Click to Auto-fill):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickAdminSelect('Records Office')}
                      className="min-h-10 px-3 py-2 text-[11px] font-medium rounded-lg bg-stone-100 hover:bg-emerald-100 hover:text-emerald-900 border border-stone-200 transition-colors cursor-pointer text-stone-700"
                    >
                      Records Office (Receiver / Receiving Officer)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdminSelect('Ms. Elena Ramos')}
                      className="min-h-10 px-3 py-2 text-[11px] font-medium rounded-lg bg-stone-100 hover:bg-emerald-100 hover:text-emerald-900 border border-stone-200 transition-colors cursor-pointer text-stone-700"
                    >
                      Ms. Elena Ramos (Evaluator)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdminSelect('Mr. Ronald Tan')}
                      className="min-h-10 px-3 py-2 text-[11px] font-medium rounded-lg bg-stone-100 hover:bg-emerald-100 hover:text-emerald-900 border border-stone-200 transition-colors cursor-pointer text-stone-700"
                    >
                      Mr. Ronald Tan (Records Management Officer)
                    </button>
                  </div>
                </div>

                {/* Submit Admin Button */}
                <button
                  id="btn-login-admin-submit"
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl font-heading font-bold text-sm text-white bg-emerald-900 hover:bg-emerald-950 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Log In to Registrar / Admin Features</span>
                </button>
              </form>
            )}

            {/* REGISTRAR LOGIN FORM */}
            {activeTab === 'superadmin' && (
              <form onSubmit={handleSuperAdminSubmit} className="mt-6 space-y-4">
                <div className="p-3 rounded-xl bg-stone-900 text-stone-100 border border-stone-800 text-xs flex items-start gap-2.5 shadow-sm">
                  <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-white">University Registrar Console</p>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono">
                        EXECUTIVE REGISTRAR
                      </span>
                    </div>
                    <p className="text-stone-300 text-[11px] mt-0.5">
                      Executive access to manage academic document records, reassign workflows, audit trails, student profiles, request categories, and system recovery.
                    </p>
                  </div>
                </div>

                {superAdminError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{superAdminError}</span>
                  </div>
                )}

                {/* Registrar Name / Identifier */}
                <div>
                  <label htmlFor="superadmin-name-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Registrar Username or Email <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="superadmin-name-input"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="e.g. Dr. Alexander Reyes or registrar"
                      value={superAdminName}
                      onChange={(e) => setSuperAdminName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-300 bg-stone-50/50 focus:bg-white focus:border-stone-900 focus:ring-2 focus:ring-stone-200 transition-all outline-none"
                    />
                    <KeyRound className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Registrar Password */}
                <div>
                  <label htmlFor="superadmin-password-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Registrar Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="superadmin-password-input"
                      type={showSuperAdminPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Enter registrar master password"
                      value={superAdminPassword}
                      onChange={(e) => setSuperAdminPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-stone-300 bg-stone-50/50 focus:bg-white focus:border-stone-900 focus:ring-2 focus:ring-stone-200 transition-all outline-none"
                    />
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowSuperAdminPassword(!showSuperAdminPassword)}
                      aria-label={showSuperAdminPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 min-h-11 min-w-11 text-stone-400 hover:text-stone-600 cursor-pointer flex items-center justify-center"
                      title={showSuperAdminPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSuperAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-stone-500">
                    <span>Default password: <strong className="text-emerald-800">superadmin123</strong> or <strong className="text-emerald-800">registrar123</strong></span>
                  </div>
                </div>

                {/* Quick Auto-fill button */}
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-stone-500 mb-1.5">
                    Authorized University Registrar Profile:
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickSuperAdminSelect}
                    className="min-h-10 px-3 py-2 text-[11px] font-medium rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Dr. Alexander Reyes (University Registrar)</span>
                  </button>
                </div>

                {/* Submit Registrar Button */}
                <button
                  id="btn-login-superadmin-submit"
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl font-heading font-bold text-sm text-white bg-stone-900 hover:bg-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Log In to Registrar Console</span>
                </button>
              </form>
            )}

            {/* Privacy & FERPA note */}
            <div className="mt-8 pt-4 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-700" />
                Data Privacy & Educational Records Protection
              </span>
              <span>Need help? Contact Window 2</span>
            </div>

          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-stone-200 py-4 px-4 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Office of the University Registrar. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Window 1: Enrollment & Grades</span>
            <span>•</span>
            <span>Window 3: TOR Evaluation</span>
            <span>•</span>
            <span>Window 4: Certificates & Clearances</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
