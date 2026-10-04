import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { StatusBadge } from '../Common/StatusBadge';
import { PriorityBadge } from '../Common/PriorityBadge';
import { DocumentType, Ticket } from '../../types';
import { TicketDetailAdminModal } from './TicketDetailAdminModal';
import { CompletionConfirmationDialog } from '../Common/CompletionConfirmationDialog';
import {
  FileText,
  Printer,
  Stamp,
  CheckCircle2,
  Calendar,
  Building,
  User,
  Clock,
  Download,
} from 'lucide-react';

export const DocumentRequestsView: React.FC = () => {
  const { tickets, updateTicketStatus } = useHelpdesk();
  const [docFilter, setDocFilter] = useState<'All' | DocumentType>('All');
  const [selectedTicketForModal, setSelectedTicketForModal] = useState<Ticket | null>(null);
  const [ticketAwaitingCompletion, setTicketAwaitingCompletion] = useState<Ticket | null>(null);
  const [workflowSaving, setWorkflowSaving] = useState(false);

  // Filter only tickets that are document requests
  const documentTickets = tickets.filter((t) => {
    const isDoc = t.documentType !== 'None';
    const matchesFilter = docFilter === 'All' || t.documentType === docFilter;
    return isDoc && matchesFilter;
  });

  const docTypes: ('All' | DocumentType)[] = [
    'All',
    'TOR',
    'Certificate of Enrollment',
    'Certificate of Grades',
    'Good Moral Certificate',
    'Authentication requests',
  ];

  const handleMarkReadyForRelease = async (ticket: Ticket) => {
    if (workflowSaving) return;
    setWorkflowSaving(true);
    try {
      await updateTicketStatus(
        ticket.id,
        'processing',
        'ready',
        'Official dry seal and university signature validated. Ready for claiming.',
        ticket.assignedTo
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to save this stage.');
    } finally {
      setWorkflowSaving(false);
    }
  };

  const handleMarkCompleted = async (ticket: Ticket) => {
    if (workflowSaving) return;
    setWorkflowSaving(true);
    try {
      await updateTicketStatus(
        ticket.id,
        'completed',
        'completed',
        'Document physically claimed at counter window.',
        ticket.assignedTo,
        undefined,
        true
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to complete this request.');
    } finally {
      setWorkflowSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          Official Academic Records Vault
        </span>
        <h1 className="mt-2 font-heading font-bold text-2xl sm:text-3xl text-stone-900">
          Document Request Management
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Specialized batch printing, dry sealing, and release counter tracking for TOR, certifications, and authentication endorsements.
        </p>
      </div>

      {/* Document Type Selector Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        {docTypes.map((dt) => (
          <button
            key={dt}
            onClick={() => setDocFilter(dt)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              docFilter === dt
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
            }`}
          >
            {dt === 'All' ? `All Documents (${tickets.filter((t) => t.documentType !== 'None').length})` : dt}
          </button>
        ))}
      </div>

      {/* Grid of Document Requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documentTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="bg-white p-5 rounded-2xl border border-stone-200 hover:border-emerald-300 transition-all shadow-xs flex flex-col justify-between"
          >
            <div>
              {/* Header Row */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {ticket.ticketNumber}
                  </span>
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <StatusBadge status={ticket.status} size="sm" />
              </div>

              {/* Document Identity */}
              <div className="mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  {ticket.documentType}
                </span>
                <h3 className="font-heading font-bold text-base text-stone-900 mt-0.5">
                  {ticket.subject}
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Student: <strong className="text-stone-800">{ticket.studentName}</strong> (ID: {ticket.studentId})
                </p>
              </div>

              {/* Document Details Box */}
              <div className="mt-3 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5 text-stone-600">
                <div className="flex justify-between">
                  <span>Number of Copies:</span>
                  <strong className="text-stone-800">{ticket.copies || 1} official copy</strong>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Method:</span>
                  <strong className="text-stone-800">{ticket.deliveryOption || 'Office Pick-up'}</strong>
                </div>
                {ticket.purpose && (
                  <div className="flex justify-between">
                    <span>Intended Purpose:</span>
                    <strong className="text-stone-800 truncate max-w-[200px]">{ticket.purpose}</strong>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-stone-200/60">
                  <span>Assigned Office:</span>
                  <strong className="text-emerald-900">{ticket.assignedTo}</strong>
                </div>
              </div>

              {/* Estimated Release */}
              <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Est. Release: <strong className="text-stone-800">{ticket.estimatedReleaseDate}</strong></span>
                </div>
                <span className="font-semibold text-emerald-800 capitalize">
                  Stage: {ticket.stage}
                </span>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => setSelectedTicketForModal(ticket)}
                className="text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                View Full Timeline
              </button>

              <div className="flex items-center gap-2">
                {ticket.stage !== 'ready' && ticket.stage !== 'completed' && (
                  <button
                    disabled={workflowSaving || ticket.stage !== 'for_seal' || ticket.status === 'completed'}
                    onClick={() => void handleMarkReadyForRelease(ticket)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Mark Ready for Release
                  </button>
                )}
                {ticket.stage === 'ready' && (
                  <button
                    disabled={workflowSaving || ticket.stage !== 'ready' || ticket.status === 'rejected'}
                    onClick={() => setTicketAwaitingCompletion(ticket)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete Release</span>
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-600 cursor-pointer"
                  title="Print Releasing Slip"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {documentTickets.length === 0 && (
          <div className="col-span-2 bg-white p-12 rounded-2xl border border-stone-200 text-center">
            <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="font-heading font-bold text-stone-800 text-base">
              No document requests in this category
            </p>
          </div>
        )}
      </div>

      {selectedTicketForModal && (
        <TicketDetailAdminModal
          ticket={selectedTicketForModal}
          onClose={() => setSelectedTicketForModal(null)}
        />
      )}
      {ticketAwaitingCompletion && (
        <CompletionConfirmationDialog
          onCancel={() => setTicketAwaitingCompletion(null)}
          onConfirm={() => {
            const ticket = ticketAwaitingCompletion;
            setTicketAwaitingCompletion(null);
            void handleMarkCompleted(ticket);
          }}
        />
      )}
    </div>
  );
};
