import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { Ticket, TicketPriority, TicketStatus } from '../../types';
import { formatDateInManila } from '../../utils/formatDate';
import { getTicketStageLabel, getTicketMilestoneLabel } from '../../utils/ticketLabels';
import { CompletionConfirmationDialog } from '../Common/CompletionConfirmationDialog';
import { TicketDetailAdminModal } from '../AdminPortal/TicketDetailAdminModal';
import {
  Ticket as TicketIcon,
  Search,
  Filter,
  UserCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowUpDown,
  MessageSquare,
  FileText,
  ChevronRight,
  ShieldAlert,
  Send,
  User,
} from 'lucide-react';

export const HelpdeskManagementView: React.FC = () => {
  const {
    tickets,
    users,
    stats,
    reassignTicket,
    forceCloseTicket,
    reopenTicket,
    updateTicketPrioritySuperAdmin,
    addInternalNote,
  } = useHelpdesk();

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<'all' | 'me'>('all');

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<Ticket | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Reassignment modal
  const [reassignModalTicket, setReassignModalTicket] = useState<Ticket | null>(null);
  const [targetStaff, setTargetStaff] = useState<string>('');

  // Force close modal
  const [forceCloseModalTicket, setForceCloseModalTicket] = useState<Ticket | null>(null);
  const [forceCloseConfirmOpen, setForceCloseConfirmOpen] = useState(false);
  const [forceCloseSaving, setForceCloseSaving] = useState(false);
  const [closeReason, setCloseReason] = useState<string>('');

  // Internal Note
  const [noteInput, setNoteInput] = useState('');

  const staffMembers = users.filter(
    (u) =>
      u.role === 'receiver' ||
      u.role === 'records_management' ||
      u.role === 'evaluator' ||
      u.role === 'registrar' ||
      u.role === 'superadmin' ||
      u.role === 'admin' ||
      u.role === 'staff'
  );

  const getStaffRoleBadge = (assignedName: string) => {
    const user = users.find(
      (u) =>
        u.name.toLowerCase() === assignedName.toLowerCase() ||
        assignedName.toLowerCase().includes(u.name.toLowerCase())
    );
    if (user) {
      if (user.role === 'receiver') return 'Receiver / Releasing';
      if (user.role === 'records_management') return 'Records Management';
      if (user.role === 'evaluator') return 'Evaluator';
      if (user.role === 'registrar' || user.role === 'superadmin') return 'Registrar Officer';
      if (user.role === 'admin') return 'Admin';
      return user.role;
    }
    if (assignedName.toLowerCase().includes('receiver') || assignedName.toLowerCase().includes('records office')) return 'Receiver / Releasing';
    if (assignedName.toLowerCase().includes('ronald')) return 'Records Management';
    if (assignedName.toLowerCase().includes('elena') || assignedName.toLowerCase().includes('lee')) return 'Evaluator';
    if (assignedName.toLowerCase().includes('alexander') || assignedName.toLowerCase().includes('reyes') || assignedName.toLowerCase().includes('registrar')) return 'University Registrar';
    return 'Staff Evaluator';
  };

  const myAssignedTicketsCount = tickets.filter(
    (t) =>
      t.assignedTo.toLowerCase().includes('alexander') ||
      t.assignedTo.toLowerCase().includes('reyes') ||
      t.assignedTo.toLowerCase().includes('registrar')
  ).length;

  const filteredTickets = tickets.filter((t) => {
    if (assignedFilter === 'me') {
      const isAssignedToMe =
        t.assignedTo.toLowerCase().includes('alexander') ||
        t.assignedTo.toLowerCase().includes('reyes') ||
        t.assignedTo.toLowerCase().includes('registrar');
      if (!isAssignedToMe) return false;
    }
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (categoryFilter !== 'all') {
      const matchCat = t.category?.toLowerCase() === categoryFilter.toLowerCase();
      const matchDoc = t.documentType?.toLowerCase() === categoryFilter.toLowerCase();
      if (!matchCat && !matchDoc) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNum = t.ticketNumber.toLowerCase().includes(q);
      const matchName = t.studentName.toLowerCase().includes(q);
      const matchSubj = t.subject.toLowerCase().includes(q);
      const matchStaff = t.assignedTo.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchSubj && !matchStaff) return false;
    }
    return true;
  });

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalTicket || !targetStaff) return;

    try {
      await reassignTicket(reassignModalTicket.id, targetStaff);
    } catch (error) {
      setNotification(error instanceof Error ? error.message : 'Reassignment could not be saved.');
      setTimeout(() => setNotification(null), 3500);
      return;
    }
    setSelectedTicket(null);
    setNotification(`Ticket #${reassignModalTicket.ticketNumber} successfully reassigned to ${targetStaff}.`);
    setReassignModalTicket(null);
    setTargetStaff('');
    setTimeout(() => setNotification(null), 3500);
  };

  const handleForceCloseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forceCloseModalTicket || !closeReason.trim()) return;
    setForceCloseConfirmOpen(true);
  };

  const confirmForceClose = async () => {
    if (!forceCloseModalTicket || !closeReason.trim() || forceCloseSaving) return;
    const ticketNumber = forceCloseModalTicket.ticketNumber;
    setForceCloseSaving(true);
    try { await forceCloseTicket(forceCloseModalTicket.id, closeReason.trim(), true); }
    catch (error) {
      setNotification(error instanceof Error ? error.message : 'Force Close could not be saved.');
      setForceCloseConfirmOpen(false);
      return;
    } finally {
      setForceCloseSaving(false);
    }
    setNotification(`Ticket #${ticketNumber} force-closed by Registrar Officer.`);
    setForceCloseModalTicket(null);
    setForceCloseConfirmOpen(false);
    setCloseReason('');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !noteInput.trim()) return;

    addInternalNote(selectedTicket.id, noteInput.trim(), 'Registrar Officer');
    setNoteInput('');
    setNotification('Internal administrative note recorded.');
    setTimeout(() => setNotification(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
              Registrar Ticket Triage & Queue Governance
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Root Ticket Control
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Reassign tickets across evaluator windows, escalate priorities, inspect internal staff notes, or force-close stalled requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
            {stats.urgentTickets} Urgent Tickets
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-800 text-xs font-bold">
            {stats.pendingRequests} In Evaluation Queue
          </span>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket #, student name, staff, subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-emerald-600 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-700 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected / Force-Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-700 outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="Deadline-sensitive">Deadline-sensitive</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-700 outline-none"
            >
              <option value="all">All Categories</option>
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

            <button
              type="button"
              onClick={() => setAssignedFilter(assignedFilter === 'all' ? 'me' : 'all')}
              className={`px-3 py-1.5 text-xs rounded-xl font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                assignedFilter === 'me'
                  ? 'bg-emerald-800 text-white border-emerald-900 shadow-2xs'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
              }`}
              title="Show only document requests assigned to the Registrar"
            >
              <User className="w-3.5 h-3.5" />
              <span>Assigned to Me ({myAssignedTicketsCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Tickets Table (7 cols) + Selected Ticket Detail & Action Panel (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Assigned Staff</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-500 text-xs">
                      No tickets match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => {
                    const isSelected = selectedTicket?.id === t.id;
                    let priorityBadge = 'bg-stone-100 text-stone-700';
                    if (t.priority === 'Urgent') priorityBadge = 'bg-rose-100 text-rose-800 font-bold border border-rose-200';
                    if (t.priority === 'Deadline-sensitive') priorityBadge = 'bg-amber-100 text-amber-800 font-bold border border-amber-200';

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`hover:bg-stone-50/70 transition-colors cursor-pointer ${
                          isSelected ? 'bg-emerald-50/50' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-stone-900">
                          {t.ticketNumber}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-stone-900">{t.studentName}</p>
                          <p className="text-[10px] text-stone-400 font-mono">{t.studentId}</p>
                        </td>
                        <td className="py-3 px-4 text-stone-700">
                          {t.category}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="font-bold text-stone-900">{t.assignedTo}</span>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {getStaffRoleBadge(t.assignedTo)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${priorityBadge}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDetailModal(t);
                              }}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold text-white bg-emerald-800 hover:bg-emerald-900 transition-colors cursor-pointer shadow-2xs"
                              title="Manage document workflow, milestone, and passing"
                            >
                              Manage
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReassignModalTicket(t);
                              }}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                            >
                              Reassign
                            </button>
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

        {/* Selected Ticket Action Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-5">
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="pb-3 border-b border-stone-100">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Filed: {formatDateInManila(selectedTicket.createdAt)}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-base text-stone-900 mt-2">
                  {selectedTicket.subject}
                </h3>
                <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Status and Assignment Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-stone-50">
                  <span className="text-stone-400 block text-[10px] font-bold uppercase">Current Assignee</span>
                  <span className="font-bold text-stone-900 mt-0.5 block">{selectedTicket.assignedTo}</span>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {getStaffRoleBadge(selectedTicket.assignedTo)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50">
                  <span className="text-stone-400 block text-[10px] font-bold uppercase">Current Stage</span>
                    <span className="font-bold text-emerald-800 mt-0.5 block">{selectedTicket.status === 'rejected' ? getTicketMilestoneLabel(selectedTicket) : getTicketStageLabel(selectedTicket.stage)}</span>
                  {selectedTicket.status === 'rejected' && (
                    <span className="block text-[11px] text-stone-600 mt-0.5">
                      {selectedTicket.rejectionReason?.trim() || "Waiting for the student's response"}
                    </span>
                  )}
                </div>
              </div>

              {/* Priority Control */}
              <div className="space-y-1.5 text-xs">
                <label className="block font-bold text-stone-700">
                  Override Priority Level
                </label>
                <div className="flex items-center gap-2">
                  {(['Normal', 'Urgent', 'Deadline-sensitive'] as TicketPriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        updateTicketPrioritySuperAdmin(selectedTicket.id, p);
                        setSelectedTicket({ ...selectedTicket, priority: p });
                        setNotification(`Updated priority to ${p}`);
                        setTimeout(() => setNotification(null), 2500);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                        selectedTicket.priority === p
                          ? 'bg-stone-900 text-white shadow-2xs'
                          : 'bg-stone-100 text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Document Management Button */}
              <button
                type="button"
                onClick={() => setShowDetailModal(selectedTicket)}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <FileText className="w-4 h-4 text-emerald-300" />
                <span>Manage Document Workflow & Passing</span>
              </button>

              {/* Action Buttons: Force Close or Reopen */}
              <div className="pt-1 flex items-center gap-2">
                <button
                  onClick={() => setReassignModalTicket(selectedTicket)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors cursor-pointer"
                >
                  Reassign Ticket
                </button>

                {selectedTicket.status === 'completed' || selectedTicket.status === 'rejected' ? (
                  <button
                    onClick={async () => {
                      const reason = window.prompt('Enter the reason for reopening this request:');
                      if (!reason?.trim() || !window.confirm('Reopen this request and return it to Processing?')) return;
                      try { await reopenTicket(selectedTicket.id, reason); }
                      catch (error) {
                        setNotification(error instanceof Error ? error.message : 'Reopen could not be saved.');
                        return;
                      }
                      setSelectedTicket(null);
                      setNotification(`Ticket #${selectedTicket.ticketNumber} reopened.`);
                      setTimeout(() => setNotification(null), 2500);
                    }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reopen Ticket</span>
                  </button>
                ) : (
                  <button
                    disabled={selectedTicket.stage !== 'ready'}
                    title={selectedTicket.stage !== 'ready' ? 'Force Close requires Ready. Advance the workflow first.' : 'Force Close this Ready request'}
                    onClick={() => setForceCloseModalTicket(selectedTicket)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Force Close</span>
                  </button>
                )}
              </div>

              {/* Internal Notes Section */}
              <div className="pt-3 border-t border-stone-100 space-y-2">
                <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-emerald-800" />
                  Privileged Internal Evaluator Notes
                </h4>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedTicket.internalNotes && selectedTicket.internalNotes.length > 0 ? (
                    selectedTicket.internalNotes.map((note) => (
                      <div key={note.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-stone-500 mb-1">
                          <span className="font-bold text-stone-900">{note.author}</span>
                          <span>{note.timestamp}</span>
                        </div>
                        <p className="text-stone-700 leading-snug">{note.note}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-stone-400 italic">No internal notes logged on this ticket yet.</p>
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add executive administrative note..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-stone-400 text-xs space-y-2">
              <TicketIcon className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="font-semibold text-stone-600">No ticket selected</p>
              <p>Click any ticket from the left queue to inspect details, reassign, or force-close.</p>
            </div>
          )}
        </div>
      </div>

      {/* REASSIGN MODAL */}
      {reassignModalTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="font-heading font-bold text-base text-stone-900">
              Reassign Ticket #{reassignModalTicket.ticketNumber}
            </h3>
            <p className="text-xs text-stone-600">
              Currently assigned to: <strong>{reassignModalTicket.assignedTo}</strong>
            </p>

            <form onSubmit={handleReassignSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Select New Staff Evaluator & System Role
                </label>
                <select
                  required
                  value={targetStaff}
                  onChange={(e) => setTargetStaff(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                >
                  <option value="">-- Choose Staff Evaluator / Role --</option>
                  {staffMembers.map((sm) => (
                    <option key={sm.id} value={sm.name}>
                      {sm.name} — {getStaffRoleBadge(sm.name)} ({sm.departmentOrOffice})
                    </option>
                  ))}
                  {!staffMembers.some((sm) => sm.name === 'Records Office') && (
                    <option value="Records Office">Records Office — Receiver / Releasing Desk (Window 2)</option>
                  )}
                  {!staffMembers.some((sm) => sm.name === 'Mr. Ronald Tan') && (
                    <option value="Mr. Ronald Tan">Mr. Ronald Tan — Records Management (Window 1)</option>
                  )}
                  {!staffMembers.some((sm) => sm.name === 'Ms. Elena Ramos') && (
                    <option value="Ms. Elena Ramos">Ms. Elena Ramos — Evaluator (Window 3)</option>
                  )}
                  {!staffMembers.some((sm) => sm.name === 'Mrs. Grace Cruz') && (
                    <option value="Mrs. Grace Cruz">Mrs. Grace Cruz — Registrar Officer (Window 4)</option>
                  )}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setReassignModalTicket(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold cursor-pointer"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORCE CLOSE MODAL */}
      {forceCloseModalTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <h3 className="font-heading font-bold text-base text-rose-900">
              Force-Close Ticket #{forceCloseModalTicket.ticketNumber}
            </h3>
            <p className="text-xs text-stone-600">
              This action terminates active processing and logs an official administrative closure justification in the immutable audit trail.
            </p>

            <form onSubmit={handleForceCloseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Reason for Force Closure <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Student confirmed resolved via physical window transaction / duplicate request."
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-rose-300 focus:border-rose-600 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setForceCloseModalTicket(null);
                    setForceCloseConfirmOpen(false);
                  }}
                  disabled={forceCloseSaving}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forceCloseSaving}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  Execute Force Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {forceCloseModalTicket && forceCloseConfirmOpen && (
        <CompletionConfirmationDialog
          title="Confirm Force Close"
          message="Force Close will complete this Ready request even if student pickup was not confirmed. The student will be notified that the request is complete."
          confirmLabel="Confirm Force Close"
          variant="rose"
          disabled={forceCloseSaving}
          onCancel={() => setForceCloseConfirmOpen(false)}
          onConfirm={() => void confirmForceClose()}
        />
      )}

      {/* TICKET DETAIL ADMIN MODAL FOR REGISTRAR MANAGEMENT */}
      {showDetailModal && (
        <TicketDetailAdminModal
          ticket={showDetailModal}
          onClose={() => {
            const currentId = showDetailModal.id;
            setShowDetailModal(null);
            const updated = tickets.find((t) => t.id === currentId);
            if (updated) setSelectedTicket(updated);
          }}
        />
      )}
    </div>
  );
};
