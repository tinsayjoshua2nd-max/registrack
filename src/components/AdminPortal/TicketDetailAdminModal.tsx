import React, { useEffect, useState } from 'react';
import { normalizeTicketPriority } from '../../utils/ticketQueue';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { Ticket, TicketStage, TicketStatus, TicketPriority } from '../../types';
import { StatusBadge } from '../Common/StatusBadge';
import { PriorityBadge } from '../Common/PriorityBadge';
import { TimelineProgress } from '../Common/TimelineProgress';
import {
  X,
  Lock,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  UserCheck,
  Calendar,
  Send,
  Building,
  FileText,
  AlertTriangle,
  Trash2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface TicketDetailAdminModalProps {
  ticket: Ticket;
  onClose: () => void;
}

export const TicketDetailAdminModal: React.FC<TicketDetailAdminModalProps> = ({
  ticket: initialTicket,
  onClose,
}) => {
  const {
    tickets,
    updateTicketStatus,
    passTicketToNextRole,
    repairTicketStage,
    systemSettings,
    updateTicketPriority,
    updateEstimatedDate,
    addInternalNote,
    sendTicketMessage,
    cancelTicket,
    studentRecords,
    users,
    currentUser,
  } = useHelpdesk();
  const freshTicket = tickets.find(item => item.id === initialTicket.id);
  const ticket = freshTicket || initialTicket;

  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'chat'>('timeline');
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [adminChatInput, setAdminChatInput] = useState('');
  const [estDateInput, setEstDateInput] = useState(ticket.estimatedReleaseDate);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [workflowSaving, setWorkflowSaving] = useState(false);
  const [prioritySaving, setPrioritySaving] = useState(false);
  const [priorityError, setPriorityError] = useState('');

  useEffect(() => {
    if (!freshTicket) onClose();
  }, [freshTicket, onClose]);
  useEffect(() => {
    setEstDateInput(freshTicket?.estimatedReleaseDate || '');
  }, [freshTicket?.estimatedReleaseDate]);

  // A handoff can remove the request from this officer's authorized state.
  if (!freshTicket) return null;

  const handlePriorityChange = async (priority: TicketPriority) => {
    setPrioritySaving(true);
    setPriorityError('');
    try {
      await updateTicketPriority(ticket.id, priority);
    } catch (error) {
      setPriorityError(error instanceof Error ? error.message : 'Unable to save the priority.');
    } finally {
      setPrioritySaving(false);
    }
  };

  const normalizedStage: TicketStage =
    ticket.stage === 'reviewed' ? 'processing' : ticket.stage;
  const stageOrder: TicketStage[] = ['submitted', 'processing', 'for_seal', 'ready', 'completed'];
  const stageIndex = stageOrder.indexOf(normalizedStage);
  const isCompleted = normalizedStage === 'completed' || ticket.status === 'completed';
  const canOperateWorkflow = currentUser?.role === 'superadmin' ||
    ticket.assignedTo.trim().toLowerCase() === currentUser?.name.trim().toLowerCase() ||
    (currentUser?.staffRole === 'receiver' && ['Registrar Office', 'Registrar Intake Queue', 'Unassigned',
      systemSettings.officeName || ''].filter(Boolean).some(name => name.toLowerCase() === ticket.assignedTo.trim().toLowerCase()));
  const canMoveTo = (stage: TicketStage) => canOperateWorkflow && !workflowSaving && !isCompleted && stageIndex !== -1 &&
    Math.abs(stageOrder.indexOf(stage) - stageIndex) === 1 &&
    (stage !== 'completed' || ticket.status !== 'rejected');
  const performWorkflow = async (action: () => Promise<void>) => {
    if (workflowSaving) return;
    if (!canOperateWorkflow) {
      setStaffError('Only the currently assigned handler or Super Admin can change this workflow.');
      return;
    }
    setWorkflowSaving(true);
    setStaffError('');
    try { await action(); }
    catch (error) { setStaffError(error instanceof Error ? error.message : 'The workflow action could not be saved.'); }
    finally { setWorkflowSaving(false); }
  };

  // Only active, real accounts can receive a handoff.
  const receiverUser = users.find((u) => u.status === 'active' && u.role === 'receiver');
  const recordsUser = users.find((u) => u.status === 'active' && u.role === 'records_management');
  const evaluatorUser = users.find((u) => u.status === 'active' && u.role === 'evaluator');
  const registrarUser = users.find(
    (u) => u.status === 'active' && (u.role === 'registrar' || u.role === 'superadmin')
  );

  // Current assigned user & role resolution
  const assignedName = ticket.assignedTo.trim().toLowerCase();
  const currentAssigneeUser = users.find((u) => {
    const name = u.name.trim().toLowerCase();
    return assignedName === name || assignedName.startsWith(`${name} (`);
  });
  const currentRole =
    currentAssigneeUser?.role || ticket.assignedRole || currentUser?.staffRole || '';

  const getStaffRoleBadge = (assignedName: string) => {
    const normalizedName = assignedName.trim().toLowerCase();
    const user = users.find((u) => {
      const name = u.name.trim().toLowerCase();
      return normalizedName === name || normalizedName.startsWith(`${name} (`);
    });
    if (user) {
      if (user.role === 'receiver') return 'Receiver / Receiving';
      if (user.role === 'records_management') return 'Records Management';
      if (user.role === 'evaluator') return 'Evaluator';
      if (user.role === 'registrar' || user.role === 'superadmin') return 'University Registrar';
      if (user.role === 'admin') return 'Admin';
      return user.role;
    }
    return 'Staff';
  };

  const getMissingStaffError = (role: string) =>
    `No active ${role} account is available. Ask a Super Admin to create or activate a ${role} account in User Management before handing off this ticket.`;

  const passToStaff = (
    staff: typeof receiverUser,
    role: string,
    stage?: TicketStage,
    notes?: string
  ) => {
    if (!staff) {
      setStaffError(getMissingStaffError(role));
      return;
    }
    setStaffError('');
    void performWorkflow(() => passTicketToNextRole(
      ticket.id,
      staff.name,
      undefined,
      notes,
      currentUser?.name || ticket.assignedTo
    ));
  };

  // Determine intelligent next role handoff according to institutional workflow
  const getWorkflowRoleAction = () => {
    if (isCompleted) return null;
    if (normalizedStage === 'submitted') {
      return {
        nextStage: 'processing' as TicketStage,
        nextStaff: recordsUser?.name,
        requiredRole: 'Records Management',
        nextRoleLabel: 'Records Management',
        buttonText: recordsUser
          ? `Done Managing Intake → Pass to Records Management (${recordsUser.name})`
          : 'Records Management account required to continue',
        description: 'Records Management will encode grades and verify academic records integrity.',
        isPass: true,
      };
    }
    if (normalizedStage === 'processing') {
      if (currentRole === 'records_management') {
        return {
          nextStage: 'for_seal' as TicketStage,
          nextStaff: receiverUser?.name,
          requiredRole: 'Receiver',
          nextRoleLabel: 'Receiver',
          buttonText: receiverUser
            ? `Done Records Management → Return to Receiver (${receiverUser.name}) to Set Ready for Claiming`
            : 'Receiver account required to continue',
          description: 'Records are validated. Document returns to Receiver to apply seal and set Ready for Claiming.',
          isPass: true,
        };
      }
      if (currentRole === 'evaluator') {
        return {
          nextStage: 'for_seal' as TicketStage,
          nextStaff: receiverUser?.name,
          requiredRole: 'Receiver',
          nextRoleLabel: 'Receiver',
          buttonText: receiverUser
            ? `Evaluation Complete → Return to Receiver (${receiverUser.name}) to Set Ready for Claiming`
            : 'Receiver account required to continue',
          description: 'Official evaluation and printing complete. Returned to Receiver for counter claiming.',
          isPass: true,
        };
      }
      if (currentRole === 'registrar') {
        return {
          nextStage: 'for_seal' as TicketStage,
          nextStaff: receiverUser?.name,
          requiredRole: 'Receiver',
          nextRoleLabel: 'Receiver',
          buttonText: receiverUser
            ? `Registrar Approved → Return to Receiver (${receiverUser.name}) to Set Ready for Claiming`
            : 'Receiver account required to continue',
          description: 'Official document reviewed and approved by University Registrar. Returned to Receiver desk for student claiming.',
          isPass: true,
        };
      }
      return {
        nextStage: 'for_seal' as TicketStage,
        nextStaff: receiverUser?.name,
        requiredRole: 'Receiver',
        nextRoleLabel: 'Receiver',
        buttonText: receiverUser
          ? `Done Processing → Return to Receiver (${receiverUser.name}) to Set Ready for Claiming`
          : 'Receiver account required to continue',
        description: 'Returned to Receiver desk for student claiming.',
        isPass: true,
      };
    }
    if (normalizedStage === 'for_seal') {
      return {
        nextStage: 'ready' as TicketStage,
        nextStaff: receiverUser?.name,
        requiredRole: 'Receiver',
        nextRoleLabel: 'Receiver',
        buttonText: 'University Seal Applied → Set Status to Ready for Claiming',
        description: 'Official University Dry Seal stamped. Document ready for physical pickup.',
        isPass: false,
      };
    }
    if (normalizedStage === 'ready') {
      return {
        nextStage: 'completed' as TicketStage,
        nextStaff: receiverUser?.name,
        requiredRole: 'Receiver',
        nextRoleLabel: 'Receiver',
        buttonText: 'Document Claimed by Student → Mark Completed',
        description: 'Student presented claim stub at the window. Transaction finalized.',
        isPass: false,
      };
    }
    return null;
  };

  const workflowRoleAction = getWorkflowRoleAction();
  const requiredStaffError =
    workflowRoleAction && !workflowRoleAction.nextStaff
      ? getMissingStaffError(workflowRoleAction.requiredRole)
      : '';

  const handleAdvanceNextStage = () => {
    if (!workflowRoleAction) return;
    if (!workflowRoleAction.nextStaff) {
      setStaffError(getMissingStaffError(workflowRoleAction.requiredRole));
      return;
    }
    setStaffError('');

    if (workflowRoleAction.isPass) {
      void performWorkflow(() => passTicketToNextRole(
        ticket.id,
        workflowRoleAction.nextStaff,
        workflowRoleAction.nextStage,
        undefined,
        currentUser?.name || ticket.assignedTo
      ));
    } else {
      const nextStatus: TicketStatus = workflowRoleAction.nextStage === 'completed' ? 'completed' : 'processing';
      void performWorkflow(() => updateTicketStatus(
        ticket.id,
        nextStatus,
        workflowRoleAction.nextStage,
        undefined,
        currentUser?.name || ticket.assignedTo,
        workflowRoleAction.nextStaff
      ));
    }
  };

  const handleStageChange = (newStage: TicketStage) => {
    if (!canMoveTo(newStage)) return;
    const reason = stageOrder.indexOf(newStage) < stageIndex
      ? window.prompt('Enter a reason for moving this request back one stage:') : undefined;
    if (reason !== undefined && !reason?.trim()) return;
    let newStatus: TicketStatus = 'processing';
    if (newStage === 'submitted') newStatus = 'pending';
    if (newStage === 'completed') newStatus = 'completed';

    // Appropriate staff handoff based on target stage
    let targetAssignee = ticket.assignedTo;
    if (newStage === 'submitted') {
      if (!receiverUser) {
        setStaffError(getMissingStaffError('Receiver'));
        return;
      }
      targetAssignee = receiverUser.name;
    } else if (newStage === 'ready' || newStage === 'completed') {
      if (!receiverUser) {
        setStaffError(getMissingStaffError('Receiver'));
        return;
      }
      targetAssignee = receiverUser.name;
    }

    setStaffError('');
    void performWorkflow(() => updateTicketStatus(ticket.id, newStatus, newStage, reason || undefined, currentUser?.name || ticket.assignedTo, targetAssignee));
  };

  const handleConfirmCancel = () => {
    cancelTicket(ticket.id, 'Student requested office cancellation of document request');
    setShowCancelModal(false);
    onClose();
  };

  const handleRejectOrNeedInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReasonInput.trim()) return;
    await performWorkflow(() => updateTicketStatus(
      ticket.id,
      'rejected',
      ticket.stage,
      rejectReasonInput.trim(),
      ticket.assignedTo
    ));
    setShowRejectBox(false);
    setRejectReasonInput('');
  };

  const handleAddInternalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteInput.trim()) return;
    addInternalNote(ticket.id, internalNoteInput.trim(), ticket.assignedTo);
    setInternalNoteInput('');
  };

  const handleSendAdminChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminChatInput.trim()) return;
    try {
      await sendTicketMessage(ticket.id, adminChatInput.trim(), 'registrar', ticket.assignedTo);
      setAdminChatInput('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to send this message.');
    }
  };

  const handleSaveEstDate = () => {
    if (!estDateInput.trim()) return;
    updateEstimatedDate(ticket.id, estDateInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-4xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(() => {
              const studentPic =
                studentRecords.find((s) => s.studentId === ticket.studentId || s.name === ticket.studentName)?.profilePicture ||
                users.find((u) => u.studentId === ticket.studentId || u.name === ticket.studentName)?.profilePicture;
              if (studentPic) {
                return (
                  <img
                    src={studentPic}
                    alt={ticket.studentName}
                    className="w-11 h-11 rounded-xl object-cover shrink-0 border border-emerald-700 shadow-xs"
                  />
                );
              }
              return (
                <div className="w-11 h-11 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-base shrink-0">
                  {ticket.studentName.charAt(0)}
                </div>
              );
            })()}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg sm:text-xl text-white">
                  {ticket.ticketNumber}
                </span>
                <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-emerald-800 text-emerald-200 border border-emerald-700">
                  {ticket.category}
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                Student: <strong>{ticket.studentName}</strong> ({ticket.studentId}) • {ticket.degreeProgram}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cancel Request Button for Staff */}
            <button
              onClick={() => setShowCancelModal(true)}
              title="Cancel and erase this document request record from the system"
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cancel Request</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar: Staff Assignment, Priority, Quick Status */}
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Staff Assignment: Name & System Role */}
          <div>
            <label className="block text-stone-500 font-semibold mb-1">
              STAFF ASSIGNED:
            </label>
            <div className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white font-bold text-stone-900 flex items-center justify-between shadow-2xs">
              <span className="flex items-center gap-1.5 truncate">
                <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">{ticket.assignedTo}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold shrink-0 ml-1">
                {getStaffRoleBadge(ticket.assignedTo)}
              </span>
            </div>
          </div>

          {/* Priority Urgency */}
          <div>
            <label htmlFor="triage-ticket-priority" className="block text-stone-500 font-semibold mb-1">
              Priority Urgency:
            </label>
            <select
              id="triage-ticket-priority"
              value={normalizeTicketPriority(ticket.priority) || ''}
              disabled={prioritySaving}
              onChange={(e) => void handlePriorityChange(e.target.value as TicketPriority)}
              className="w-full px-2.5 py-2 rounded-xl border border-stone-300 bg-white font-medium text-stone-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="Deadline-sensitive">Deadline-sensitive</option>
            </select>
            {prioritySaving && <p className="text-xs text-stone-500 mt-1">Saving priority…</p>}
            {priorityError && <p role="alert" className="text-xs text-rose-700 mt-1">{priorityError}</p>}
          </div>

          {/* Status Overview */}
          <div>
            <label className="block text-stone-500 font-semibold mb-1">
              Current Status:
            </label>
            <div className="flex items-center gap-2 pt-1">
              <StatusBadge status={ticket.status} size="sm" />
              <PriorityBadge priority={ticket.priority} />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 border-b border-stone-200 flex items-center gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            ⏱️ Stage & Timeline Workflow
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>Internal Staff Notes ({ticket.internalNotes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
            <span>Chat with Student ({ticket.messages.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 max-h-[500px] overflow-y-auto space-y-5">
          {activeTab === 'timeline' && (
            <div className="space-y-5">
              {/* Subject & Request Details */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs">
                <p className="font-bold text-stone-900 text-sm">{ticket.subject}</p>
                <p className="mt-1 text-stone-600 leading-relaxed">{ticket.description}</p>

                {ticket.documentType !== 'None' && (
                  <div className="mt-3 pt-2 border-t border-stone-200/80 flex flex-wrap gap-4 text-stone-700 font-medium">
                    <span>Document: <strong>{ticket.documentType}</strong></span>
                    <span>Copies: <strong>{ticket.copies || 1}</strong></span>
                    <span>Purpose: <strong>{ticket.purpose}</strong></span>
                    <span>Delivery: <strong>{ticket.deliveryOption}</strong></span>
                  </div>
                )}
              </div>

              {/* Estimated Release Date Setter */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    <span>Estimated Document Release Date</span>
                  </p>
                  <p className="text-emerald-700 mt-0.5">
                    Visible to student on tracking and notifications.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={estDateInput}
                    onChange={(e) => setEstDateInput(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-emerald-300 bg-white font-medium"
                  />
                  <button
                    onClick={handleSaveEstDate}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors cursor-pointer"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Visual Timeline Component */}
              <div>
                <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-stone-700 mb-3">
                  Workflow Milestone Progress
                </h4>
                <TimelineProgress ticket={ticket} />
              </div>

              {/* Advance Workflow Stage & Role Handover Feature */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-stone-50 via-emerald-50/40 to-stone-50 border border-emerald-200 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                      <p className="text-xs font-bold text-stone-900">
                        Workflow Stage & Role Handoff Control
                      </p>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Managing: {ticket.assignedTo} ({getStaffRoleBadge(ticket.assignedTo)})
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-1">
                      Current Milestone: <strong className="text-emerald-900 uppercase font-mono">{normalizedStage.replace('_', ' ')}</strong>
                      {workflowRoleAction?.description && ` • ${workflowRoleAction.description}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {workflowRoleAction ? (
                      <button
                        onClick={handleAdvanceNextStage}
                        disabled={!canOperateWorkflow || workflowSaving || !workflowRoleAction.nextStaff}
                        className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>{workflowRoleAction.buttonText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs">
                        <CheckCircle className="w-4 h-4 text-emerald-700" />
                        <span>Completed & Released</span>
                      </div>
                    )}

                    {currentRole === 'records_management' && normalizedStage === 'processing' && (
                      <button
                        onClick={() => {
                          passToStaff(
                            evaluatorUser,
                            'Evaluator',
                            'processing',
                            evaluatorUser
                              ? `Records encoding complete. Passed to Evaluator (${evaluatorUser.name}) for evaluation and printing.`
                              : undefined
                          );
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        <span>{evaluatorUser ? `Forward to Evaluator (${evaluatorUser.name})` : 'Evaluator unavailable'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {(staffError || requiredStaffError) && (
                  <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{staffError || requiredStaffError}</span>
                  </div>
                )}

                {/* Quick Pass to Specific Role Buttons */}
                <div className="pt-3 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-stone-600 mr-1">Pass Document to Role:</span>
                    <button
                      type="button"
                      onClick={() => passToStaff(
                        receiverUser,
                        'Receiver',
                        normalizedStage === 'submitted' ? 'submitted' : undefined,
                        receiverUser ? `Document handed over to Receiver (${receiverUser.name}).` : undefined
                      )}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                        currentRole === 'receiver'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                          : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      📥 1. Receiver ({receiverUser?.name || 'unavailable'})
                    </button>

                    <button
                      type="button"
                      onClick={() => passToStaff(
                        recordsUser,
                        'Records Management',
                        'processing',
                        recordsUser
                          ? `Document passed to Records Management (${recordsUser.name}) for grade encoding.`
                          : undefined
                      )}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                        currentRole === 'records_management'
                          ? 'bg-sky-100 text-sky-900 border-sky-300 font-bold'
                          : 'bg-white hover:bg-sky-50 text-sky-800 border-sky-200'
                      }`}
                    >
                      📊 2. Records Management ({recordsUser?.name || 'unavailable'})
                    </button>

                    <button
                      type="button"
                      onClick={() => passToStaff(
                        evaluatorUser,
                        'Evaluator',
                        'processing',
                        evaluatorUser
                          ? `Document passed to Evaluator (${evaluatorUser.name}) for review and printing.`
                          : undefined
                      )}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                        currentRole === 'evaluator'
                          ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold'
                          : 'bg-white hover:bg-purple-50 text-purple-800 border-purple-200'
                      }`}
                    >
                      🔍 3. Evaluator ({evaluatorUser?.name || 'unavailable'})
                    </button>

                    <button
                      type="button"
                      onClick={() => passToStaff(
                        registrarUser,
                        'University Registrar',
                        'processing',
                        registrarUser
                          ? `Document passed to Registrar Officer (${registrarUser.name}) for official executive review and management.`
                          : undefined
                      )}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                        currentRole === 'registrar'
                          ? 'bg-stone-900 text-emerald-400 border-stone-800 font-bold shadow-xs'
                          : 'bg-white hover:bg-stone-100 text-stone-800 border-stone-300'
                      }`}
                    >
                      🎓 4. Registrar ({registrarUser?.name || 'unavailable'})
                    </button>
                  </div>
                </div>

                {/* Individual stage quick jumps and reject options */}
                <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-stone-500 mr-1">Direct Stage:</span>
                    {stageIndex === -1 && !isCompleted && (
                      <button type="button" disabled={!canOperateWorkflow || workflowSaving} className="px-2.5 py-1 border rounded-lg text-amber-800"
                        onClick={() => {
                          const stage = window.prompt('Repair to: submitted, processing, for_seal, or ready', 'processing');
                          if (!stage || !stageOrder.slice(0, 4).includes(stage as TicketStage)) {
                            if (stage) setStaffError('Choose submitted, processing, for_seal, or ready.');
                            return;
                          }
                          const reason = window.prompt('Enter the reason for repairing this legacy stage:');
                          if (reason?.trim()) void performWorkflow(() => repairTicketStage(ticket.id, stage as TicketStage, reason));
                        }}>Repair Legacy Stage</button>
                    )}
                    <button
                      disabled={!canMoveTo('submitted')}
                      onClick={() => handleStageChange('submitted')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        normalizedStage === 'submitted'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                      }`}
                    >
                      1. Submitted
                    </button>

                    <button
                      disabled={!canMoveTo('processing')}
                      onClick={() => handleStageChange('processing')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        normalizedStage === 'processing'
                          ? 'bg-sky-700 text-white border-sky-700'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                      }`}
                    >
                      2. Processing
                    </button>

                    <button
                      disabled={!canMoveTo('for_seal')}
                      onClick={() => handleStageChange('for_seal')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        normalizedStage === 'for_seal'
                          ? 'bg-indigo-700 text-white border-indigo-700'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                      }`}
                    >
                      3. For University Seal
                    </button>

                    <button
                      disabled={!canMoveTo('ready')}
                      onClick={() => handleStageChange('ready')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        normalizedStage === 'ready'
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                      }`}
                    >
                      4. Ready for Claiming
                    </button>

                    <button
                      disabled={!canMoveTo('completed')}
                      onClick={() => handleStageChange('completed')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                        normalizedStage === 'completed'
                          ? 'bg-emerald-800 text-white border-emerald-800'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                      }`}
                    >
                      5. Completed
                    </button>
                  </div>

                  <button
                    disabled={!canOperateWorkflow || isCompleted || workflowSaving}
                    onClick={() => setShowRejectBox(!showRejectBox)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition-colors cursor-pointer"
                  >
                    ⚠️ Needs Information / Reject
                  </button>
                </div>

                {/* Reject / Needs Info Box */}
                {showRejectBox && (
                  <form onSubmit={handleRejectOrNeedInfo} className="pt-3 border-t border-stone-200 space-y-2">
                    <label className="block text-xs font-semibold text-rose-800">
                      Reason for Requesting Information or Rejecting:
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={rejectReasonInput}
                      onChange={(e) => setRejectReasonInput(e.target.value)}
                      placeholder="e.g. Please clarify missing requirements or visit counter window..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowRejectBox(false)}
                        className="px-3 py-1 rounded-lg text-xs font-medium text-stone-600 hover:bg-stone-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white transition-colors cursor-pointer"
                      >
                        Send Needs Info Status
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Internal Staff Notes:</strong> These notes are visible ONLY to Registrar and Evaluator staff members. Students cannot see them.
                </span>
              </div>

              {/* Notes List */}
              <div className="space-y-2">
                {ticket.internalNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-stone-500 font-semibold">
                      <span>
                        👤 {note.author} ({note.authorRole})
                      </span>
                      <span className="text-[10px]">{note.timestamp}</span>
                    </div>
                    <p className="text-stone-800 leading-relaxed">{note.note}</p>
                  </div>
                ))}

                {ticket.internalNotes.length === 0 && (
                  <p className="text-xs text-stone-400 text-center py-6">
                    No internal staff notes on this ticket yet.
                  </p>
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddInternalNote} className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-stone-700">
                  Add New Private Note:
                </label>
                <textarea
                  required
                  rows={3}
                  value={internalNoteInput}
                  onChange={(e) => setInternalNoteInput(e.target.value)}
                  placeholder="e.g. Clearance verified. Checked course code equivalents. Security watermark #582 applied."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Save Internal Note</span>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
                Communicating as: <strong>{ticket.assignedTo}</strong> with <strong>{ticket.studentName}</strong>
              </div>

              <div className="border border-stone-200 rounded-2xl p-4 max-h-60 overflow-y-auto space-y-3 bg-stone-50">
                {ticket.messages.map((m) => {
                  const isRegistrar = m.senderRole === 'registrar';
                  const senderPic =
                    users.find((u) => u.name === m.senderName)?.profilePicture ||
                    studentRecords.find((s) => s.name === m.senderName)?.profilePicture;

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${isRegistrar ? 'flex-row-reverse items-end' : 'flex-row items-start'}`}
                    >
                      {senderPic ? (
                        <img
                          src={senderPic}
                          alt={m.senderName}
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-stone-200"
                        />
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isRegistrar ? 'bg-emerald-800 text-white' : 'bg-stone-300 text-stone-800'
                          }`}
                        >
                          {m.senderName.charAt(0)}
                        </div>
                      )}

                      <div
                        className={`p-2.5 rounded-xl text-xs max-w-[80%] ${
                          isRegistrar
                            ? 'bg-emerald-700 text-white'
                            : 'bg-white text-stone-800 border border-stone-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1 text-[10px] opacity-80">
                          <span className="font-semibold">{m.senderName}</span>
                          <span className="font-mono">{m.timestamp}</span>
                        </div>
                        <p>{m.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSendAdminChat} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={adminChatInput}
                  onChange={(e) => setAdminChatInput(e.target.value)}
                  placeholder="Type official reply to student..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Request Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-heading font-bold text-lg text-stone-900">
                Cancel Document Request?
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                The student wants to cancel the document requested at the office. Tapping confirm will
                <strong> permanently erase the record of ticket #{ticket.ticketNumber} ({ticket.documentType || ticket.category})</strong> from the system.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 font-semibold text-xs text-stone-700 cursor-pointer"
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Yes, Erase Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
