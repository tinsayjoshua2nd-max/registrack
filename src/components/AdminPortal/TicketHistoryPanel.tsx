import React from 'react';
import type { TimelineEvent } from '../../types';
import { formatDateInManila } from '../../utils/formatDate';
import { formatAuditStageDetails, getTicketStageLabel } from '../../utils/ticketLabels';

type HistoryEvent = TimelineEvent & {
  action?: string;
  fromStage?: string | null;
};

interface TicketHistoryPanelProps {
  timelineHistory?: TimelineEvent[];
}

const STAGE_ORDER = ['submitted', 'processing', 'for_seal', 'ready', 'completed'];

const normalizeStage = (stage: string) => stage.trim().toLowerCase() === 'reviewed'
  ? 'processing'
  : stage.trim().toLowerCase();

function isStepBack(event: HistoryEvent): boolean {
  if (!event.fromStage) return false;

  const previousIndex = STAGE_ORDER.indexOf(normalizeStage(event.fromStage));
  const currentIndex = STAGE_ORDER.indexOf(normalizeStage(String(event.stage || '')));
  return previousIndex !== -1 && currentIndex !== -1 && currentIndex < previousIndex;
}

function formatEventTitle(title: string): string {
  const formattedTitle = formatAuditStageDetails(title);
  const stageHeading = formattedTitle.match(/^(\s*Stage:\s*)([A-Za-z0-9_-]+)(\s*)$/i);
  if (stageHeading) {
    return `${stageHeading[1]}${getTicketStageLabel(stageHeading[2])}${stageHeading[3]}`;
  }
  return formattedTitle.replace(
    /\b(?:submitted|processing|for_seal|ready|completed|reviewed)\b/gi,
    (stage) => getTicketStageLabel(stage),
  );
}

function getEventHeading(event: HistoryEvent, action: string, stepBack: boolean): string {
  const stage = getTicketStageLabel(String(event.stage || '')) || 'Unknown stage';
  const previousStage = event.fromStage ? getTicketStageLabel(event.fromStage) : '';

  if ((!action || action === 'none') && normalizeStage(String(event.stage || '')) === 'submitted') {
    return 'Request submitted';
  }
  if (action === 'stage' && previousStage) {
    return stepBack
      ? `Moved back: ${previousStage} -> ${stage}`
      : `Moved forward: ${previousStage} -> ${stage}`;
  }
  switch (action) {
    case 'reject':
      return `Needs information (held at ${stage})`;
    case 'reopen':
      return 'Reopened';
    case 'repair':
      return 'Stage repaired';
    case 'force_close':
      return 'Force closed';
    case 'handoff':
      return 'Reassigned';
    default:
      return formatEventTitle(event.title?.trim() || `Stage: ${stage}`);
  }
}

function getHeadingClass(action: string, stepBack: boolean): string {
  if (action === 'reject') return 'text-red-700';
  if (stepBack || ['reopen', 'repair', 'force_close'].includes(action)) return 'text-amber-700';
  if (action === 'stage') return 'text-emerald-700';
  return 'text-stone-800';
}

export const TicketHistoryPanel: React.FC<TicketHistoryPanelProps> = ({ timelineHistory = [] }) => {
  const events = timelineHistory
    .filter((event) => String(event.timestamp || '').trim() !== 'Upcoming step')
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
          <span className="text-xs font-semibold text-stone-500">Newest first · {events.length} events</span>
        )}
      </header>

      {events.length === 0 ? (
        <p className="px-4 py-5 text-xs text-stone-600">
          No history has been recorded for this request yet.
        </p>
      ) : (
        <ol
          aria-label="Ticket history, newest first"
          tabIndex={0}
          className="max-h-64 min-w-0 divide-y divide-stone-100 overflow-y-auto overscroll-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
        >
          {events.map(({ event, index }) => {
            const action = String(event.action || '').trim().toLowerCase();
            const stepBack = isStepBack(event);
            const heading = getEventHeading(event, action, stepBack);
            const notes = String(event.notes || '').trim();
            const isReason = stepBack ||
              ['reject', 'reopen', 'repair', 'force_close'].includes(action);
            const isGeneratedStageFiller = !isReason && /^stage changed to\s+.+\.?$/i.test(notes);
            const visibleNotes = notes && !isGeneratedStageFiller ? notes : '';
            const actor = String(event.actor || '').trim();
            const timestamp = String(event.timestamp || '');
            const parsedTimestamp = Date.parse(timestamp);
            const formattedTimestamp = formatDateInManila(timestamp) || 'Time not recorded';
            const headingClass = getHeadingClass(action, stepBack);
            const noteTone = action === 'reject'
              ? 'border-red-200 bg-red-50 text-red-800'
              : isReason
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-stone-200 bg-stone-50 text-stone-700';

            return (
              <li
                key={`${timestamp}-${actor}-${index}`}
                className="flex min-w-0 gap-3 px-4 py-3"
              >
                <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                <div className="min-w-0 flex-1 break-words">
                  <p className={`min-w-0 break-words text-xs font-bold ${headingClass}`}>{heading}</p>
                  <p className="mt-1 break-words text-xs text-stone-600">
                    {actor || 'Unknown staff member'} -{' '}
                    <time dateTime={Number.isNaN(parsedTimestamp) ? undefined : timestamp}>
                      {formattedTimestamp} in Manila
                    </time>
                  </p>
                  {visibleNotes && (
                    <p className={`mt-2 min-w-0 whitespace-pre-wrap break-words rounded-lg border px-3 py-2 text-xs leading-relaxed ${noteTone}`}>
                      <span className="font-bold">
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
