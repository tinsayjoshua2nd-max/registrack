import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { StatusBadge } from '../Common/StatusBadge';
import { PriorityBadge } from '../Common/PriorityBadge';
import { TicketStatus, Ticket } from '../../types';
import {
  Search,
  Filter,
  ArrowRight,
  MessageSquare,
  Calendar,
  Building,
  PlusCircle,
  FileText,
  Clock,
} from 'lucide-react';

export const MyRequestsView: React.FC = () => {
  const {
    tickets,
    currentStudent,
    setSelectedTicket,
    setTrackingTicketNumber,
    setActiveChatTicket,
    setStudentView,
    users,
  } = useHelpdesk();

  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter requests belonging to this student (or matching demo)
  const studentTickets = tickets.filter((t) => {
    // Show tickets for current student or general demo
    const matchesUser =
      t.studentId === currentStudent.studentId ||
      t.email === currentStudent.email ||
      t.studentName.toLowerCase().includes(currentStudent.name.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

    const matchesSearch =
      !searchQuery ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesUser && matchesStatus && matchesSearch;
  });

  const handleTrackClick = (t: Ticket) => {
    setSelectedTicket(t);
    setTrackingTicketNumber(t.ticketNumber);
    setStudentView('track');
  };

  const handleChatClick = (t: Ticket) => {
    setActiveChatTicket(t);
    setStudentView('chat');
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Student Records Hub
          </span>
          <h1 className="mt-2 font-heading font-bold text-2xl sm:text-3xl text-stone-900">
            My Submitted Requests
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Track and manage all your pending inquiries, grade adjustments, and document certificates.
          </p>
        </div>

        <button
          onClick={() => setStudentView('chat')}
          className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Registrar Chat</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-emerald-800 text-white'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            All Requests ({tickets.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
            }`}
          >
            🟡 Pending
          </button>
          <button
            onClick={() => setStatusFilter('processing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'processing'
                ? 'bg-sky-600 text-white'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200'
            }`}
          >
            🔵 Processing
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
            }`}
          >
            🟢 Completed
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'rejected'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200'
            }`}
          >
            🔴 Needs Info
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search tickets or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {studentTickets.length > 0 ? (
          studentTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white rounded-2xl border border-stone-200 hover:border-emerald-300 p-5 transition-all shadow-xs hover:shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {ticket.ticketNumber}
                    </span>
                    <span className="text-xs font-medium text-stone-500">
                      Category: <strong className="text-stone-700">{ticket.category}</strong>
                    </span>
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                  </div>

                  <h3 className="font-heading font-bold text-base text-stone-900 hover:text-emerald-800 transition-colors">
                    {ticket.subject}
                  </h3>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {ticket.description}
                  </p>

                  {/* Metadata Row */}
                  <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-stone-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      <span>
                        Est. Release: <strong className="text-stone-800">{ticket.estimatedReleaseDate}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Building className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>
                        Assigned: <strong className="text-stone-800">{ticket.assignedTo}</strong>
                      </span>
                      {(() => {
                        const user = users.find(
                          (u) =>
                            u.name.toLowerCase() === ticket.assignedTo.toLowerCase() ||
                            ticket.assignedTo.toLowerCase().includes(u.name.toLowerCase())
                        );
                        let roleBadge = user ? (
                          user.role === 'receiver' ? 'Receiver / Receiving' :
                          user.role === 'records_management' ? 'Records Management' :
                          user.role === 'evaluator' ? 'Evaluator' :
                          user.role === 'registrar' ? 'Registrar Officer' : user.role
                        ) : null;
                        if (!roleBadge) {
                          if (ticket.assignedTo.toLowerCase().includes('receiver') || ticket.assignedTo.toLowerCase().includes('records office')) roleBadge = 'Receiver / Receiving';
                          else if (ticket.assignedTo.toLowerCase().includes('ronald')) roleBadge = 'Records Management';
                          else if (ticket.assignedTo.toLowerCase().includes('elena') || ticket.assignedTo.toLowerCase().includes('lee')) roleBadge = 'Evaluator';
                        }
                        if (!roleBadge) return null;
                        return (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {roleBadge}
                          </span>
                        );
                      })()}
                    </div>
                    {ticket.messages.length > 0 && (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{ticket.messages.length} message(s)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-start lg:self-center shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-100 w-full lg:w-auto justify-end">
                  <button
                    onClick={() => handleChatClick(ticket)}
                    className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Chat ({ticket.messages.length})</span>
                  </button>

                  <button
                    onClick={() => handleTrackClick(ticket)}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Track Status</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center">
            <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="font-heading font-bold text-stone-800 text-base">
              No requests found
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Try changing your filter or submit a new concern ticket.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
