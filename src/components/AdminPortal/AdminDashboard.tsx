import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { StatusBadge } from '../Common/StatusBadge';
import { PriorityBadge } from '../Common/PriorityBadge';
import { Ticket } from '../../types';
import { TicketDetailAdminModal } from './TicketDetailAdminModal';
import {
  Clock,
  Loader2,
  CheckCircle2,
  Inbox,
  AlertTriangle,
  Users,
  FileCheck,
  TrendingUp,
  ArrowRight,
  Search,
  Building,
  PlusCircle,
  FileText,
  History,
  Trash2,
  ShieldCheck,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    tickets,
    staffList,
    setAdminView,
    assignTicketStaff,
    canAccessApplicationForm,
    getMyDeletedRequests,
    getMyCompletedRequests,
    currentUser,
    officerRole,
  } = useHelpdesk();
  const [selectedTicketForModal, setSelectedTicketForModal] = useState<Ticket | null>(null);

  const myDeleted = getMyDeletedRequests();
  const myCompleted = getMyCompletedRequests();

  const dashboardTickets = currentUser?.staffRole === 'receiver'
    ? tickets
    : tickets.filter((ticket) => {
        if (!currentUser?.name) return false;
        const assignedName = ticket.assignedTo.trim().toLowerCase();
        const staffName = currentUser.name.trim().toLowerCase();
        return assignedName === staffName || assignedName.startsWith(`${staffName} (`);
      });
  const urgentTickets = dashboardTickets.filter(
    (t) => t.priority === 'Urgent' || t.priority === 'Deadline-sensitive'
  );
  const pendingCount = dashboardTickets.filter((ticket) => ticket.status === 'pending').length;
  const processingCount = dashboardTickets.filter((ticket) => ticket.status === 'processing').length;
  const completedTodayCount = dashboardTickets.filter((ticket) => {
    const updatedAt = Date.parse(ticket.updatedAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return ticket.status === 'completed' && Number.isFinite(updatedAt) && updatedAt >= today.getTime();
  }).length;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Registrar Executive Management
          </span>
          <h1 className="mt-2 font-heading font-bold text-2xl sm:text-3xl text-stone-900">
            Registrar Operations Dashboard
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Real-time monitoring of student inquiries, document evaluation queues, and release schedules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canAccessApplicationForm && (
            <button
              onClick={() => setAdminView('submit-ticket')}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-emerald-400 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs border border-stone-700"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Application Form</span>
            </button>
          )}

          <button
            onClick={() => setAdminView('request-history')}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-emerald-400 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs border border-stone-700"
            title="View private history of deleted and completed requests"
          >
            <History className="w-4 h-4 text-emerald-400" />
            <span>My Request History</span>
          </button>

          <button
            onClick={() => setAdminView('all-requests')}
            className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Open Request Table</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Banner: Application Form for Receiver, or Officer Processing Station for Evaluator / Records Management */}
      {canAccessApplicationForm ? (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-900 to-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                Walk-in Document Intake Desk
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-400/20 text-emerald-300">
                  Receiver / Receiving Officer
                </span>
              </h3>
              <p className="text-xs text-stone-300">
                When a student visits the counter, log their application here to generate a live support ticket that populates their Track Request Status portal.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAdminView('submit-ticket')}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Application Form</span>
          </button>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-850 to-emerald-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                <span>{currentUser?.adminRoleTitle || 'Specialized Officer Console'}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-400/20 text-emerald-300">
                  Personal History Ledger
                </span>
              </h3>
              <p className="text-xs text-stone-300">
                Review assigned documents. Access your private historical log of <strong>{myCompleted.length} completed</strong> and <strong>{myDeleted.length} deleted</strong> requests.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAdminView('request-history')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <History className="w-4 h-4" />
            <span>View My Request History ({myCompleted.length + myDeleted.length})</span>
          </button>
        </div>
      )}

      {/* Key Statistics Grid (Exact numbers from user prompt) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Requests */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Pending Requests
            </p>
            <p className="mt-2 font-heading font-bold text-3xl sm:text-4xl text-amber-600">
              {pendingCount}
            </p>
            <p className="mt-1 text-[11px] text-stone-600 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>Awaiting staff action</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
            🟡
          </div>
        </div>

        {/* Processing */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Processing
            </p>
            <p className="mt-2 font-heading font-bold text-3xl sm:text-4xl text-sky-600">
              {processingCount}
            </p>
            <p className="mt-1 text-[11px] text-stone-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 text-sky-500 animate-spin" />
              <span>In printing & seal verification</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xl">
            🔵
          </div>
        </div>

        {/* Completed Today */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Completed Today
            </p>
            <p className="mt-2 font-heading font-bold text-3xl sm:text-4xl text-emerald-600">
              {completedTodayCount}
            </p>
            <p className="mt-1 text-[11px] text-stone-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Released & closed tickets</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
            🟢
          </div>
        </div>

        {/* Total Requests */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Total Requests
            </p>
            <p className="mt-2 font-heading font-bold text-3xl sm:text-4xl text-stone-900">
              {dashboardTickets.length}
            </p>
            <p className="mt-1 text-[11px] text-stone-600 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>Requests in assigned queue</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xl">
            📂
          </div>
        </div>
      </div>

      {/* Two Column Layout: Urgent Triage Queue + Staff Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Urgent Queue & Recent Submissions */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="font-heading font-bold text-lg text-stone-900">
                Urgent & Priority Action Queue
              </h2>
            </div>
            <span className="text-xs font-semibold text-stone-400">
              {urgentTickets.length} Priority Tickets
            </span>
          </div>

          <div className="space-y-3">
            {urgentTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-emerald-300 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                      {ticket.ticketNumber}
                    </span>
                    <span className="text-xs text-stone-600 font-semibold">{ticket.studentName}</span>
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} size="sm" />
                  </div>
                  <h3 className="font-heading font-bold text-sm text-stone-900">
                    {ticket.subject}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-stone-500">
                    <span>
                      Assigned: <strong className="text-stone-700">{ticket.assignedTo}</strong>
                    </span>
                    <span>• Est. Release: {ticket.estimatedReleaseDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedTicketForModal(ticket)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Manage & Triage
                  </button>
                </div>
              </div>
            ))}
            {urgentTickets.length === 0 && (
              <p className="p-6 rounded-2xl border border-stone-200 bg-white text-center text-xs text-stone-500">
                No urgent or deadline-sensitive tickets in your assigned queue.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Staff Assignment & Department Workload */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              <h2 className="font-heading font-bold text-lg text-stone-900">
                Staff Assignment
              </h2>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
            <p className="text-xs text-stone-500">
              Assigned officers handling document verifications and counter releasing:
            </p>

            <div className="space-y-2.5">
              {staffList.map((st) => (
                <div
                  key={st.id}
                  className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-stone-900">{st.name}</p>
                    <p className="text-[11px] text-stone-500">{st.role}</p>
                    <p className="text-[10px] text-emerald-700 font-medium">{st.office}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-stone-800 text-sm">{st.activeTicketsCount}</span>
                    <span className="text-[10px] text-stone-600 block">active cases</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500">
              Workload reflects the current ticket assignments shown in the system.
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicketForModal && (
        <TicketDetailAdminModal
          ticket={selectedTicketForModal}
          onClose={() => setSelectedTicketForModal(null)}
        />
      )}
    </div>
  );
};
