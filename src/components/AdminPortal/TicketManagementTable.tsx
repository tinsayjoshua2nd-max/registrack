import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { StatusBadge } from '../Common/StatusBadge';
import { PriorityBadge } from '../Common/PriorityBadge';
import { TicketCategory, TicketStatus, TicketPriority, Ticket } from '../../types';
import { TicketDetailAdminModal } from './TicketDetailAdminModal';
import {
  Search,
  Filter,
  UserCheck,
  Lock,
  MessageSquare,
  Clock,
  Calendar,
  Building,
  ArrowUpDown,
  FileCheck,
  Trash2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const TicketManagementTable: React.FC = () => {
  const { tickets, deleteTicket, currentUser, studentRecords, users } = useHelpdesk();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | TicketCategory>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | TicketStatus>('All');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TicketPriority>('All');
  const [selectedTicketForModal, setSelectedTicketForModal] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('Student requested cancellation at window');

  // System roles: Receiver and Super Admin can see all to triage/reassign.
  // Individual staff (Records Management, Evaluator, Registrar) only see & manage tickets assigned to them!
  const isUnrestrictedStaff =
    currentUser?.role === 'superadmin' ||
    currentUser?.adminRoleTitle?.toLowerCase().includes('receiver') ||
    currentUser?.name?.toLowerCase().includes('records office');

  const getStaffRoleBadge = (assignedName: string) => {
    const user = users.find(
      (u) =>
        u.name.toLowerCase() === assignedName.toLowerCase() ||
        assignedName.toLowerCase().includes(u.name.toLowerCase())
    );
    if (user) {
      if (user.role === 'receiver') return 'Receiver / Receiving';
      if (user.role === 'records_management') return 'Records Management';
      if (user.role === 'evaluator') return 'Evaluator';
      if (user.role === 'registrar') return 'Registrar Officer';
      if (user.role === 'admin') return 'Admin';
      return user.role;
    }
    if (assignedName.toLowerCase().includes('receiver') || assignedName.toLowerCase().includes('records office')) return 'Receiver / Receiving';
    if (assignedName.toLowerCase().includes('ronald')) return 'Records Management';
    if (assignedName.toLowerCase().includes('elena') || assignedName.toLowerCase().includes('lee')) return 'Evaluator';
    return 'Staff Evaluator';
  };

  const categories: ('All' | TicketCategory)[] = [
    'All',
    'TOR',
    'Honorable Dismissal',
    'Certificate of Registration',
    'Certificate of Graduation',
    'Certificate of Grades',
    'Form 137 / SF10',
    'English as Medium of Instruction',
    'Letter of No Objection',
    'Certificate of GWA',
    'Certificate of Latin Honors / SAC',
    'Diploma',
    'CAV',
    'Certified True Copies',
    'Other',
  ];

  const filteredTickets = tickets.filter((t) => {
    // Access control: if not unrestricted, only the assigned staff can see and manage the student's request
    if (!isUnrestrictedStaff && currentUser?.name) {
      const currentName = currentUser.name.toLowerCase();
      const assigned = t.assignedTo.toLowerCase();
      const isAssigned = assigned.includes(currentName) || currentName.includes(assigned);
      if (!isAssigned) return false;
    }

    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    const matchesSearch =
      !search ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.studentName.toLowerCase().includes(search.toLowerCase()) ||
      t.studentId.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.assignedTo.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesStatus && matchesPriority && matchesSearch;
  });

  const handleConfirmDelete = () => {
    if (!ticketToDelete) return;
    deleteTicket(ticketToDelete.id, deleteReason || 'Student requested cancellation at window');
    setTicketToDelete(null);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Registrar Control Console
          </span>
          <h1 className="mt-2 font-heading font-bold text-2xl sm:text-3xl text-stone-900">
            Ticket & Request Management
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Review student inquiries, record internal notes, advance processing milestones, or cancel requests upon student demand.
          </p>
        </div>

        {/* Access Control Notice Badge */}
        {!isUnrestrictedStaff && currentUser?.name && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <p className="font-bold">Restricted Staff View Active</p>
              <p className="text-[11px] text-emerald-800">
                Displaying only tickets assigned to <strong>{currentUser.name}</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, ID, ticket #..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-emerald-600 font-medium"
            >
              <option value="All">All Service Categories ({tickets.length})</option>
              {categories.slice(1).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-emerald-600 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="pending">🟡 Pending</option>
              <option value="processing">🔵 Processing</option>
              <option value="completed">🟢 Completed</option>
              <option value="rejected">🔴 Needs Info / Rejected</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-emerald-600 font-medium"
            >
              <option value="All">All Priorities</option>
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="Deadline-sensitive">Deadline-sensitive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <p className="sm:hidden px-4 py-2 text-[11px] text-stone-500 border-b border-stone-100">
          Swipe horizontally to see all request details.
        </p>
        <div
          className="overflow-x-auto overscroll-x-contain"
          role="region"
          aria-label="Ticket requests table"
          tabIndex={0}
        >
          <table className="w-full min-w-[960px] text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <th className="py-3 px-4">Ticket #</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Category & Details</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">STAFF ASSIGNMENT</th>
                <th className="py-3 px-4 text-center">Notes / Chat</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
              {filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="hover:bg-stone-50/70 transition-colors"
                >
                  {/* Ticket # */}
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-950 whitespace-nowrap">
                    {ticket.ticketNumber}
                  </td>

                  {/* Student */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {(() => {
                      const studentPic =
                        studentRecords.find((s) => s.studentId === ticket.studentId || s.name === ticket.studentName)?.profilePicture ||
                        users.find((u) => u.studentId === ticket.studentId || u.name === ticket.studentName)?.profilePicture;
                      return (
                        <div className="flex items-center gap-2.5">
                          {studentPic ? (
                            <img
                              src={studentPic}
                              alt={ticket.studentName}
                              className="w-7 h-7 rounded-full object-cover shrink-0 border border-stone-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                              {ticket.studentName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-stone-900">{ticket.studentName}</p>
                            <p className="text-[11px] text-stone-500">ID: {ticket.studentId} • {ticket.degreeProgram}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Category & Subject */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <span className="font-semibold text-stone-800 block truncate">
                      {ticket.category}
                    </span>
                    <p className="text-[11px] text-stone-500 truncate mt-0.5">
                      {ticket.subject}
                    </p>
                  </td>

                  {/* Priority */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <PriorityBadge priority={ticket.priority} />
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusBadge status={ticket.status} size="sm" />
                  </td>

                  {/* STAFF ASSIGNMENT: Name only, dropdown removed */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {(() => {
                      const staffPic = users.find((u) => u.name === ticket.assignedTo)?.profilePicture;
                      return (
                        <div className="flex items-center gap-2">
                          {staffPic ? (
                            <img
                              src={staffPic}
                              alt={ticket.assignedTo}
                              className="w-7 h-7 rounded-full object-cover shrink-0 border border-stone-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                              {ticket.assignedTo.charAt(0)}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-bold text-stone-900 text-xs">
                              {ticket.assignedTo}
                            </span>
                            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 w-fit mt-0.5">
                              {getStaffRoleBadge(ticket.assignedTo)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Internal Notes & Chat Badges */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${
                          ticket.internalNotes.length > 0
                            ? 'bg-amber-100 text-amber-800 font-semibold'
                            : 'text-stone-400'
                        }`}
                        title={`${ticket.internalNotes.length} internal note(s)`}
                      >
                        <Lock className="w-3 h-3" />
                        <span>{ticket.internalNotes.length}</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${
                          ticket.messages.length > 0
                            ? 'bg-emerald-100 text-emerald-800 font-semibold'
                            : 'text-stone-400'
                        }`}
                        title={`${ticket.messages.length} message(s)`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{ticket.messages.length}</span>
                      </span>
                    </div>
                  </td>

                  {/* Actions: Manage & Cancel */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedTicketForModal(ticket)}
                        className="min-h-11 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                      >
                        Manage
                      </button>

                      <button
                        onClick={() => {
                          setDeleteReason('Student requested cancellation at window');
                          setTicketToDelete(ticket);
                        }}
                        title="Delete this document request and record in your private officer history"
                        className="min-h-11 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400 text-xs">
                    {!isUnrestrictedStaff
                      ? `No tickets currently assigned to ${currentUser?.name || 'your account'}.`
                      : 'No tickets matching current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Modal */}
      {selectedTicketForModal && (
        <TicketDetailAdminModal
          ticket={selectedTicketForModal}
          onClose={() => setSelectedTicketForModal(null)}
        />
      )}

      {/* Delete Confirmation Modal from Table Action */}
      {ticketToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900">
                  Delete Document Request
                </h3>
                <p className="text-xs text-stone-500 font-mono">
                  Ticket #{ticketToDelete.ticketNumber} • {ticketToDelete.studentName}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to delete this request for <strong>{ticketToDelete.documentType || ticketToDelete.category}</strong>?
              This will remove the ticket from active processing and log it under your private <strong>Officer Request History</strong>.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="block font-bold text-stone-700">
                Reason for Deletion <span className="text-rose-600">*</span>
              </label>
              <select
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-rose-500 outline-none text-xs"
              >
                <option value="Student requested cancellation at window">Student requested cancellation at window</option>
                <option value="Applicant withdrew document request">Applicant withdrew document request</option>
                <option value="Duplicate document intake request">Duplicate document intake request</option>
                <option value="Incorrect document category requested">Incorrect document category requested</option>
                <option value="Student opted for digital copy instead">Student opted for digital copy instead</option>
                <option value="Other administrative reason">Other administrative reason</option>
              </select>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-600">
              🔒 <strong>Private History:</strong> Only your account ({currentUser?.name}) will see this deletion record in your Officer Request History.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setTicketToDelete(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold text-xs cursor-pointer hover:bg-stone-50"
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete & Log</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
