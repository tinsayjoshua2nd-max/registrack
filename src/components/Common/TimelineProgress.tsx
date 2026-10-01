import React from 'react';
import { Ticket, TicketStage } from '../../types';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { Check, Clock, AlertCircle, MapPin, Calendar, FileText, UserCheck } from 'lucide-react';

interface TimelineProgressProps {
  ticket: Ticket;
  orientation?: 'horizontal' | 'vertical';
}

const STAGES: { stage: TicketStage; label: string; description: string }[] = [
  {
    stage: 'submitted',
    label: 'Request Submitted',
    description: 'Online ticket logged & queued',
  },
  {
    stage: 'processing',
    label: 'Processing',
    description: 'Grade encoding & records check',
  },
  {
    stage: 'for_seal',
    label: 'For University Seal',
    description: 'University dry seal stamping',
  },
  {
    stage: 'ready',
    label: 'Ready for Claiming',
    description: 'Document ready at counter window',
  },
  {
    stage: 'completed',
    label: 'Completed',
    description: 'Document claimed & officially released',
  },
];

export const TimelineProgress: React.FC<TimelineProgressProps> = ({
  ticket,
  orientation = 'horizontal',
}) => {
  const { users } = useHelpdesk();
  const stageOrder: TicketStage[] = ['submitted', 'processing', 'for_seal', 'ready', 'completed'];
  // Normalization for legacy stage names
  const effectiveStage: TicketStage =
    ticket.stage === 'reviewed' ? 'processing' : ticket.stage;
  const currentIndex = stageOrder.indexOf(effectiveStage);

  // Filter out any removed claiming requirements
  const sanitizedRequirements = (ticket.claimingRequirements || [])
    .map((req) => req.replace(/\s*or\s*1\s*Government-issued\s*ID/gi, '').trim())
    .filter(
      (req) =>
        !req.toLowerCase().includes('documentary stamp tax') &&
        !req.toLowerCase().includes('php 150.00') &&
        req.length > 0
    );

  // If status is rejected, stage might be on hold
  const isRejected = ticket.status === 'rejected';

  return (
    <div id={`timeline-progress-${ticket.id}`} className="w-full">
      {/* Visual Timeline Steps */}
      <div className="py-2">
        <div className="flex items-center justify-between relative">
          {/* Background Connecting Line */}
          <div className="absolute left-6 right-6 top-5 -translate-y-1/2 h-1 bg-stone-200 z-0" />
          {/* Active Fill Line */}
          <div
            className={`absolute left-6 top-5 -translate-y-1/2 h-1 transition-all duration-500 z-0 ${
              isRejected ? 'bg-rose-400' : 'bg-emerald-600'
            }`}
            style={{
              width: `${(Math.max(0, currentIndex) / (STAGES.length - 1)) * 100}%`,
            }}
          />

          {STAGES.map((s, idx) => {
            const isPassed = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isFuture = idx > currentIndex;

            // Find matching event from history if available
            const histEvent = ticket.timelineHistory.find((h) => h.stage === s.stage);

            let stepBg = 'bg-stone-100 border-stone-300 text-stone-400';
            if (isPassed) {
              stepBg = 'bg-emerald-600 border-emerald-600 text-white';
            } else if (isCurrent) {
              stepBg = isRejected
                ? 'bg-rose-600 border-rose-600 text-white ring-4 ring-rose-100'
                : 'bg-emerald-700 border-emerald-700 text-white ring-4 ring-emerald-100 animate-pulse';
            }

            return (
              <div key={s.stage} className="flex flex-col items-center relative z-10 text-center max-w-[130px]">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all shadow-xs ${stepBg}`}
                >
                  {isPassed ? (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  ) : isCurrent && isRejected ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : isCurrent ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                <div className="mt-2.5">
                  <p
                    className={`text-xs font-semibold leading-tight ${
                      isCurrent
                        ? isRejected
                          ? 'text-rose-700'
                          : 'text-emerald-900'
                        : isPassed
                        ? 'text-stone-800'
                        : 'text-stone-600'
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="text-[11px] text-stone-600 leading-snug mt-0.5 hidden sm:block">
                    {histEvent?.timestamp && histEvent.timestamp !== 'Upcoming step'
                      ? histEvent.timestamp
                      : s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rejection / Action Required Callout */}
      {isRejected && ticket.rejectionReason && (
        <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-rose-800">Action Required / Clarification Requested</p>
            <p className="mt-1 text-rose-700 leading-relaxed">{ticket.rejectionReason}</p>
            <p className="mt-2 text-xs text-rose-600 font-medium">
              💡 Tip: You can use the Registrar Chat tab in the navigation bar to send clarifications directly to the evaluator!
            </p>
          </div>
        </div>
      )}

      {/* Estimated Release Date & Claiming Information Card */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Release Estimation */}
        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
          <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Estimated Release Date</span>
          </div>
          <div className="mt-2">
            <span className="text-base font-bold text-emerald-950">
              {ticket.estimatedReleaseDate || 'Within 2-3 Working Days'}
            </span>
            {effectiveStage === 'completed' && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900">
                COMPLETED
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-emerald-700">
            {effectiveStage === 'completed'
              ? 'Transaction successfully completed & released.'
              : 'Turnaround time accounts for official evaluation and university dry-sealing.'}
          </p>
        </div>

        {/* Claiming Window & Requirements */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
          <div className="flex items-center gap-2 text-stone-800 font-semibold text-sm">
            <MapPin className="w-4 h-4 text-emerald-700" />
            <span>Releasing Location & Window</span>
          </div>
          <p className="mt-2 text-sm font-medium text-stone-900">
            {ticket.releaseLocation || 'Registrar Ground Floor, Administration Hall'}
          </p>
          <div className="mt-2 text-xs text-stone-500 flex items-center gap-1.5 flex-wrap">
            <UserCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>Assigned Evaluator: <strong className="text-stone-800">{ticket.assignedTo}</strong></span>
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
        </div>
      </div>

      {/* Claiming Requirements Checklist */}
      {sanitizedRequirements.length > 0 && (
        <div className="mt-3 p-3.5 rounded-lg bg-white border border-stone-200">
          <p className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Requirements to bring upon claiming:</span>
          </p>
          <ul className="mt-2 space-y-1">
            {sanitizedRequirements.map((req, rIdx) => (
              <li key={rIdx} className="text-xs text-stone-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
