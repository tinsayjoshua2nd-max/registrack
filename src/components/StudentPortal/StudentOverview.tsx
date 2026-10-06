import React from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { StatusBadge } from '../Common/StatusBadge';
import { PriorityBadge } from '../Common/PriorityBadge';
import {
  PlusCircle,
  Search,
  MessageSquare,
  HelpCircle,
  Megaphone,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Building,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export const StudentOverview: React.FC = () => {
  const {
    currentStudent,
    tickets,
    setStudentView,
    setSelectedTicket,
    setTrackingTicketNumber,
    setActiveChatTicket,
    announcements,
  } = useHelpdesk();

  const myTickets = tickets.filter(
    (t) =>
      t.studentId === currentStudent.studentId ||
      t.studentName.toLowerCase().includes(currentStudent.name.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-8">
      {/* Hero / Portal Greeting Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-10 shadow-lg">
        {/* Soft decorative background circles */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-700/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-teal-700/30 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/50 text-emerald-200 text-xs font-semibold mb-4 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Digital Registrar Services • Fast & Accessible</span>
          </div>

          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
            University Registrar Helpdesk & Request Tracking
          </h1>
          <p className="mt-3 text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Welcome, <strong className="text-white">{currentStudent.name}</strong> ({currentStudent.degreeProgram}). Submit concerns, request official academic credentials, track real-time processing milestones, and communicate directly with registrar staff without waiting in line.
          </p>

          {/* Quick Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setStudentView('track')}
              className="px-5 py-3 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4 text-emerald-700" />
              <span>Track Request by Ticket #</span>
            </button>
            <button
              onClick={() => setStudentView('chat')}
              className="px-5 py-3 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/80 text-white font-semibold text-xs sm:text-sm border border-emerald-600/60 backdrop-blur-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-emerald-300" />
              <span>Registrar Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core Service Highlights (White & Green Aesthetic) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStudentView('track')}
          className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
            📝
          </div>
          <h2 className="font-heading font-bold text-base text-stone-900 group-hover:text-emerald-800 transition-colors">
            Online Helpdesk
          </h2>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            Submit inquiries regarding Enrollment, Grades, TOR, Certificates, and Clearance.
          </p>
        </div>

        <div
          onClick={() => setStudentView('track')}
          className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-800 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
            🔍
          </div>
          <h2 className="font-heading font-bold text-base text-stone-900 group-hover:text-emerald-800 transition-colors">
            Real-Time Tracking
          </h2>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            Monitor progress: 🟡 Pending → 🔵 Processing → 🟢 Completed or 🔴 Needs Info.
          </p>
        </div>

        <div
          onClick={() => setStudentView('chat')}
          className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
            💬
          </div>
          <h2 className="font-heading font-bold text-base text-stone-900 group-hover:text-emerald-800 transition-colors">
            Registrar Chat
          </h2>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            Message directly with your assigned evaluator to avoid in-person counter queues.
          </p>
        </div>

        <div
          onClick={() => setStudentView('faq')}
          className="p-5 rounded-2xl bg-white border border-stone-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-lg mb-3 group-hover:scale-105 transition-transform">
            ❓
          </div>
          <h2 className="font-heading font-bold text-base text-stone-900 group-hover:text-emerald-800 transition-colors">
            Knowledge Base
          </h2>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            Common questions on TOR requesting, processing turnaround times, and claiming.
          </p>
        </div>
      </div>

      {/* Main Grid: My Active Requests & Latest Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: My Active Requests */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-lg text-stone-900">
                My Recent Requests & Tickets
              </h2>
              <p className="text-xs text-stone-500">
                Track status and estimated release date for your submitted documents.
              </p>
            </div>
            <button
              onClick={() => setStudentView('track')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Track All ({myTickets.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {myTickets.slice(0, 3).map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-300 transition-all shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {ticket.ticketNumber}
                    </span>
                    <span className="text-xs font-medium text-stone-600">
                      {ticket.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} size="sm" />
                  </div>
                </div>

                <div className="mt-2.5">
                  <h3 className="font-heading font-bold text-sm text-stone-900">
                    {ticket.subject}
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 line-clamp-1">
                    {ticket.description}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-stone-500">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Est. Release: <strong className="text-stone-800">{ticket.estimatedReleaseDate}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveChatTicket(ticket);
                        setStudentView('chat');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium cursor-pointer"
                    >
                      Chat ({ticket.messages.length})
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setTrackingTicketNumber(ticket.ticketNumber);
                        setStudentView('track');
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      Track Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Office Schedules & Quick Announcements */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg text-stone-900">
              Registrar Advisories
            </h2>
            <button
              onClick={() => setStudentView('announcements')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              <span>More</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {announcements.slice(0, 3).map((ann) => (
              <div
                key={ann.id}
                onClick={() => setStudentView('announcements')}
                className="p-4 rounded-2xl bg-white border border-stone-200 hover:border-emerald-300 transition-all cursor-pointer shadow-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {ann.badgeLabel}
                  </span>
                  <span className="text-[10px] text-stone-400">{ann.date}</span>
                </div>
                <h3 className="font-heading font-bold text-xs text-stone-900 leading-snug">
                  {ann.title}
                </h3>
                <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
                  {ann.summary}
                </p>
              </div>
            ))}
          </div>

          {/* Quick Counter Info */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 space-y-2">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
              <Building className="w-4 h-4 text-emerald-700" />
              <span>Registrar Office Hours</span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              Ground Floor Administration Building
            </p>
            <p className="text-xs text-emerald-900 leading-relaxed">
              Monday - Thursday: 8:00 AM - 6:00 PM
            </p>
            <p className="text-xs text-emerald-900 leading-relaxed">
              Friday: 8:00 AM - 5:00 PM
            </p>
            <p className="text-[11px] text-emerald-700">
              No noon break for document releasing counters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
