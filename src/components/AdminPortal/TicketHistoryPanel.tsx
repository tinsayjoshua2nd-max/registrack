import React from 'react';
import type { TimelineEvent } from '../../types';
import { formatDateInManila } from '../../utils/formatDate';
import { getAuditRoleLabel, getTicketStageLabel } from '../../utils/ticketLabels';

type HistoryEvent = TimelineEvent & {
  action?: string;
  fromStage?: string | null;
};

interface TicketHistoryPanelProps {
  ticketId: string;
  timelineHistory?: TimelineEvent[];
}

const STAGE_ORDER = ['submitted', 'processing', 'for_seal', 'ready', 'completed'];

const normalizeStage = (stage: string) => stage.trim().toLowerCase() === 'reviewed'
  ? 'processing'
  : stage.trim().toLowerCase();

function isStepBack(event: HistoryEvent, action: string): boolean {
  if (action === 'step_back') return true;
  if (!event.fromStage) return false;

  const previousIndex = STAGE_ORDER.indexOf(normalizeStage(event.fromStage));
  const currentIndex = STAGE_ORDER.indexOf(normalizeStage(String(event.stage || '')));
  return previousIndex !== -1 && currentIndex !== -1 && currentIndex < previousIndex;
}

function getEventHeading(event: HistoryEvent, action: string, stepBack: boolean): string {
  const stage = getTicketStageLabel(String(event.stage || '')) || 'Unknown stage';
  const previousStage = event.fromStage
    ? getTicketStageLabel(event.fromStage)
    : '';

  if (stepBack) {
    return `Stage moved back${previousStage ? ` from ${previousStage}` : ''} to ${stage}`;
  }

  switch (action) {
    case 'reject':
      return event.title?.trim() || 'Information Requested';
    case 'reopen':
      return event.title?.trim() || 'Ticket Reopened';
    case 'repair':
      return event.title?.trim() || 'Legacy Stage Repaired';
    case 'force_close':
      return 'Ticket Force-Closed';
    case 'handoff':
      return event.title?.trim() || 'Ticket Handed Off';
    case 'backup_restore':
      return event.title?.trim() || 'Stage Restored from Backup';
    case 'stage':
      return `Stage changed${previousStage ? ` from ${previousStage}` : ''} to ${stage}`;
    default:
      if (event.title) {
        const legacyStageHeading = event.title.match(/^stage:\s*(.+)$/i);
        if (legacyStageHeading) {
          return `Stage changed to ${getTicketStageLabel(legacyStageHeading[1])}`;
        }
      }
      return event.title?.trim() || `Stage: ${stage}`;
  }
}

function formatHistoryTimestamp(value: string): string {
  const timestamp = value.trim();
  if (!timestamp || timestamp === 'Upcoming step') return 'Time not recorded';

  const formatted = formatDateInManila(timestamp);
  const hasTime = timestamp.includes('T') || /\d{1,2}:\d{2}/.test(timestamp);
  return hasTime ? `${formatted} · Manila time` : `${formatted} · time not recorded`;
}

export const TicketHistoryPanel: React.FC<TicketHistoryPanelProps> = ({
  ticketId,
  timelineHistory = [],
}) => {
  const events = timelineHistory
    .map((event, index) => ({
      event: event as HistoryEvent,
      index,
      time: Date.parse(String(event.timestamp || '')),
    }))
    .sort((left, right) => {
      const leftHasTime = Number.isFinite(left.time);
      const rightHasTime = Number.isFinite(right.time);
      if (leftHasTime && rightHasTime) return right.time - left.time || right.index - left.index;
      if (leftHasTime) return -1;
      if (rightHasTime) return 1;
      return right.index - left.index;
    });

  return (
    <section
      aria-label="History & Reasons"
      className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-stone-200 bg-white"
    >
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-4 py-3">
        <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-stone-800">
          History &amp; Reasons
        </h4>
        {events.length > 0 && (
          <span className="text-[10px] font-semibold text-stone-500">Newest first · {events.length} events</span>
        )}
      </header>

      {events.length === 0 ? (
        <p className="px-4 py-5 text-xs text-stone-600">
          No history has been recorded for this request yet.
        </p>
      ) : (
        <ol
          aria-label={`History entries for ticket ${ticketId}, newest first`}
          tabIndex={0}
          className="max-h-72 min-w-0 divide-y divide-stone-100 overflow-y-auto overscroll-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
        >
          {events.map(({ event, index }) => {
            const action = String(event.action || '').trim().toLowerCase();
            const stepBack = isStepBack(event, action);
            const heading = getEventHeading(event, action, stepBack);
            const notes = String(event.notes || '').trim();
            const isReason = stepBack ||
              ['reject', 'reopen', 'repair', 'force_close'].includes(action);
            const isGeneratedStageFiller = !isReason && !stepBack &&
              /^stage changed to\s+.+\.?$/i.test(notes);
            const visibleNotes = notes && !isGeneratedStageFiller ? notes : '';
            const actor = String(event.actor || '').trim();
            const timestamp = String(event.timestamp || '');
            const parsedTimestamp = Date.parse(timestamp);

            return (
              <li
                key={`${timestamp}-${actor}-${index}`}
                className="flex min-w-0 gap-3 px-4 py-3"
              >
                <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                <div className="min-w-0 flex-1 break-words">
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <p className="min-w-0 break-words text-xs font-bold text-stone-900">{heading}</p>
                    <time
                      dateTime={Number.isNaN(parsedTimestamp) ? undefined : timestamp}
                      className="shrink-0 text-[10px] leading-relaxed text-stone-500 sm:text-right"
                    >
                      {formatHistoryTimestamp(timestamp)}
                    </time>
                  </div>
                  <p className="mt-1 break-words text-[11px] text-stone-600">
                    By <span className="font-semibold text-stone-700">
                      {actor ? getAuditRoleLabel(actor) : 'Unknown staff member'}
                    </span>
                  </p>
                  {visibleNotes && (
                    <p className="mt-2 min-w-0 whitespace-pre-wrap break-words rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-700">
                      <span className="font-bold text-stone-800">
                        {isReason ? 'Reason:' : 'Note:'}
                      </span>{' '}
                      {visibleNotes}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
