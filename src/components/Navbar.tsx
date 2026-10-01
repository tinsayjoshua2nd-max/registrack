import React, { useState } from 'react';
import { useHelpdesk } from '../context/HelpdeskContext';
import { UserProfileModal } from './Common/UserProfileModal';
import {
  GraduationCap,
  Search,
  Bell,
  CheckCircle,
  MessageSquare,
  FileText,
  Calendar,
  ShieldAlert,
  User,
  ArrowRight,
  Sparkles,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Clock,
  PlusCircle,
  KeyRound,
  Camera,
  History,
  HelpCircle,
  LayoutDashboard,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    role,
    setRole,
    studentView,
    setStudentView,
    adminView,
    setAdminView,
    currentStudent,
    currentUser,
    canAccessApplicationForm,
    logout,
    trackingTicketNumber,
    setTrackingTicketNumber,
    trackTicketByNumber,
    setSelectedTicket,
    notifications,
    markNotificationAsRead,
    unreadCount,
    resetDemoData,
  } = useHelpdesk();

  const [headerSearch, setHeaderSearch] = useState('');
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchError, setSearchError] = useState(false);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerSearch.trim()) return;

    const found = trackTicketByNumber(headerSearch.trim());
    if (found) {
      setTrackingTicketNumber(found.ticketNumber);
      setSelectedTicket(found);
      setStudentView('track');
      setSearchError(false);
      setHeaderSearch('');
    } else {
      setSearchError(true);
      setTimeout(() => setSearchError(false), 3000);
    }
  };

  return (
    <header className="safe-area-top sticky top-0 z-50 bg-white border-b border-stone-200 shadow-xs">
      {/* Top Banner with Institutional Green Accent */}
      <div className="bg-emerald-900 text-emerald-50 px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-medium flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate">Office of the University Registrar • Online Helpdesk & Document Tracking Center</span>
          </div>

          <div className="flex items-center gap-4 text-emerald-200 text-xs">
            <span className="hidden sm:inline">Operating Hours: Mon - Fri (8:00 AM - 5:00 PM)</span>
            <button
              onClick={resetDemoData}
              title="Reset sample tickets to default demo state"
              className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden md:inline">Reset Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Title */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-600/20 shrink-0">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-lg sm:text-xl text-emerald-950 tracking-tight">
                RegisTrack
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 border border-emerald-300">
                OFFICIAL
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium hidden sm:block">
              Registrar Helpdesk & Real-Time Request Tracking System
            </p>
          </div>
        </div>

        {/* Quick Ticket Tracker Search */}
        <div className="hidden lg:flex items-center max-w-sm flex-1 mx-4">
          <form onSubmit={handleTrackSubmit} className="relative w-full">
            <input
              id="header-ticket-search"
              type="text"
              placeholder="Track ticket # (e.g. REG-2026-00125)..."
              value={headerSearch}
              onChange={(e) => {
                setHeaderSearch(e.target.value);
                setSearchError(false);
              }}
              className={`w-full pl-9 pr-16 py-1.5 text-xs rounded-lg border bg-stone-50 transition-all focus:bg-white focus:outline-none focus:ring-2 ${
                searchError
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-stone-300 focus:border-emerald-600 focus:ring-emerald-100'
              }`}
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors cursor-pointer"
            >
              Track
            </button>
            {searchError && (
              <span className="absolute left-0 -bottom-5 text-[10px] text-rose-600 font-medium">
                Ticket not found. Try REG-2026-00125
              </span>
            )}
          </form>
        </div>

        {/* Controls Right: Role Badge & Notifications & Profile & Logout */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {/* Active Portal Badge */}
          <div className="flex items-center">
            {role === 'student' ? (
              <span aria-label="Student Portal" title="Student Portal" className="w-9 h-9 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center sm:justify-start gap-1.5 shadow-2xs">
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">Student Portal</span>
              </span>
            ) : (
              <span aria-label="Registrar Admin" title="Registrar Admin" className="w-9 h-9 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold bg-emerald-900 text-emerald-100 border border-emerald-700 flex items-center justify-center sm:justify-start gap-1.5 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Registrar Admin</span>
              </span>
            )}
          </div>

          {/* Notifications Dropdown with Realtime Arrival Timestamp */}
          <div className="relative">
            <button
              id="notifications-button"
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              aria-label="Notifications"
              className="relative min-h-11 min-w-11 p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer flex items-center justify-center"
              title="Notifications & Arrival Updates"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="fixed left-3 right-3 top-28 mt-2 w-auto sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:w-96 rounded-2xl bg-white border border-stone-200 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm text-stone-900">
                      Notifications & Updates
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    Real-Time Arrival
                  </span>
                </div>

                {role === 'student' && (
                  <p className="mt-2 text-[11px] text-stone-500">
                    Only updates for your account and document requests appear here.
                  </p>
                )}

                <div className="mt-2 max-h-80 overflow-y-auto space-y-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-stone-400 text-xs">
                      {role === 'student' ? 'No updates for your account yet.' : 'No notifications yet.'}
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationAsRead(n.id);
                          if (n.ticketNumber) {
                            const t = trackTicketByNumber(n.ticketNumber);
                            if (t) {
                              setSelectedTicket(t);
                              setTrackingTicketNumber(t.ticketNumber);
                              setStudentView('track');
                              setShowNotifDropdown(false);
                            }
                          }
                        }}
                        className={`p-2.5 rounded-xl transition-colors cursor-pointer text-left ${
                          n.read
                            ? 'bg-stone-50 hover:bg-stone-100 text-stone-700'
                            : 'bg-emerald-50/70 border border-emerald-200/60 hover:bg-emerald-100/60 text-emerald-950 font-medium'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-stone-900">{n.title}</p>
                          {/* Exact Real-Time Arrival Timestamp */}
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-emerald-700" />
                            <span>{n.exactTime || n.timestamp}</span>
                          </span>
                        </div>

                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">{n.message}</p>

                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          {n.ticketNumber ? (
                            <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-800">
                              #{n.ticketNumber}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className="text-stone-400 font-mono">
                            {n.dateStr || 'Today'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active Persona Pill & Logout */}
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-stone-200">
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              title="Click to view profile, upload photo, or change password"
              className="min-h-11 min-w-11 flex items-center justify-center md:justify-start gap-2 text-left hover:opacity-85 transition-opacity cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-emerald-400 overflow-hidden relative shadow-xs">
                {currentUser?.profilePicture ? (
                  <img
                    src={currentUser.profilePicture}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : role === 'student' ? (
                  currentStudent.name.split(' ').map((w) => w[0]).slice(0, 2).join('') || 'ST'
                ) : currentUser?.name ? (
                  currentUser.name.split(' ').map((w) => w[0]).slice(0, 2).join('')
                ) : (
                  'RO'
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-left text-xs hidden md:block">
                <div className="flex items-center gap-1">
                  <p className="font-semibold text-stone-800 leading-tight max-w-[130px] truncate group-hover:text-emerald-800 transition-colors">
                    {role === 'student' ? currentStudent.name : (currentUser?.name || 'Registrar Evaluator')}
                  </p>
                  <KeyRound className="w-3 h-3 text-stone-400 group-hover:text-emerald-700 shrink-0" />
                </div>
                <p className="text-[11px] text-stone-500">
                  {role === 'student' ? `ID: ${currentStudent.studentId}` : (currentUser?.adminRoleTitle || 'Admin Evaluator')}
                </p>
              </div>
            </button>

            {/* Logout Button */}
            <button
              id="nav-logout-button"
              type="button"
              onClick={logout}
              title="Log out from session and return to login page"
              className="ml-1 sm:ml-2 min-h-11 min-w-11 flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile & Password Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Navigation Sub-Bar */}
      <div className="bg-stone-50 border-t border-stone-200 px-3 sm:px-6">
        <div className="mobile-nav-scroll max-w-7xl mx-auto flex items-center justify-between overflow-x-auto py-1.5 sm:py-2">
          {role === 'student' ? (
            /* Student Features: Track Request by Ticket # and Registrar Chat */
            <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                id="nav-student-track"
                onClick={() => setStudentView('track')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  studentView === 'track'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Track Request by Ticket #</span>
              </button>

              <button
                id="nav-student-chat"
                onClick={() => setStudentView('chat')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  studentView === 'chat'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Registrar Chat</span>
              </button>

              <button
                id="nav-student-announcements"
                onClick={() => setStudentView('announcements')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  studentView === 'announcements'
                    ? 'bg-emerald-800 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Announcements</span>
              </button>

              <button
                id="nav-student-faq"
                onClick={() => setStudentView('faq')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  studentView === 'faq'
                    ? 'bg-emerald-800 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>FAQ / Helpdesk</span>
              </button>
            </nav>
          ) : (
            /* Registrar Admin Features: Application Form added */
            <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                id="nav-admin-dashboard"
                onClick={() => setAdminView('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  adminView === 'dashboard'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Admin Dashboard</span>
              </button>

              {/* Application Form: Restricted to Receiver / Receiving Officer only */}
              {canAccessApplicationForm && (
                <button
                  id="nav-admin-submit-ticket"
                  onClick={() => setAdminView('submit-ticket')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                    adminView === 'submit-ticket'
                      ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Application Form</span>
                </button>
              )}

              <button
                id="nav-admin-requests"
                onClick={() => setAdminView('all-requests')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  adminView === 'all-requests'
                    ? 'bg-emerald-800 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Request Management</span>
              </button>

              <button
                id="nav-admin-history"
                onClick={() => setAdminView('request-history')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  adminView === 'request-history'
                    ? 'bg-emerald-800 text-white shadow-xs ring-1 ring-emerald-600'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
                title="View your private deleted and completed requests history"
              >
                <History className={`w-3.5 h-3.5 ${adminView === 'request-history' ? 'text-emerald-400' : 'text-stone-500'}`} />
                <span>Request History</span>
              </button>

              <button
                id="nav-admin-announcements"
                onClick={() => setAdminView('announcements-manage')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  adminView === 'announcements-manage'
                    ? 'bg-emerald-800 text-white'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Office Advisories &amp; Schedules</span>
              </button>
            </nav>
          )}

          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-stone-500 pl-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Online Portal Active</span>
          </div>
        </div>
      </div>
    </header>
  );
};

