import type { Ticket, TicketPriority } from '../types';

// "Priority" was used by the intake form before the canonical value was fixed.
export function normalizeTicketPriority(value: unknown): TicketPriority | undefined {
  if (value === 'Priority') return 'Deadline-sensitive';
  if (value === 'Normal' || value === 'Urgent' || value === 'Deadline-sensitive') return value;
  return undefined;
}

export function isActiveTicket(ticket: Pick<Ticket, 'status' | 'stage'>): boolean {
  return (ticket.status === 'pending' || ticket.status === 'processing') &&
    !['completed', 'rejected', 'cancelled', 'canceled', 'closed'].includes(ticket.stage);
}

export function isPriorityActionTicket(ticket: Pick<Ticket, 'priority' | 'status' | 'stage'>): boolean {
  const priority = normalizeTicketPriority(ticket.priority);
  return isActiveTicket(ticket) && (priority === 'Urgent' || priority === 'Deadline-sensitive');
}

export function isTicketAssignedToAccount(
  ticket: Pick<Ticket, 'assignedTo'>,
  account: { name: string } | null,
): boolean {
  const name = account?.name.trim().toLowerCase();
  return !!name && typeof ticket.assignedTo === 'string' &&
    ticket.assignedTo.trim().toLowerCase() === name;
}

export function getStaffVisibleTickets(
  tickets: Ticket[],
  account: { name: string; role: string; staffRole?: string } | null,
): Ticket[] {
  if (!account) return [];
  if (account.role === 'superadmin' || account.staffRole === 'receiver') return tickets;
  const name = account.name.trim().toLowerCase();
  return name ? tickets.filter(ticket => ticket.assignedTo.trim().toLowerCase() === name) : [];
}

function sortableDate(value: string): number {
  const date = Date.parse(value);
  return Number.isFinite(date) ? date : Number.POSITIVE_INFINITY;
}

export function getPriorityActionQueue(tickets: Ticket[]): Ticket[] {
  return tickets.filter(isPriorityActionTicket).sort((a, b) => {
    const rankA = normalizeTicketPriority(a.priority) === 'Deadline-sensitive' ? 0 : 1;
    const rankB = normalizeTicketPriority(b.priority) === 'Deadline-sensitive' ? 0 : 1;
    if (rankA !== rankB) return rankA - rankB;
    const releaseA = sortableDate(a.estimatedReleaseDate);
    const releaseB = sortableDate(b.estimatedReleaseDate);
    if (releaseA !== releaseB) return releaseA < releaseB ? -1 : 1;
    const createdA = sortableDate(a.createdAt);
    const createdB = sortableDate(b.createdAt);
    if (createdA !== createdB) return createdA < createdB ? -1 : 1;
    return a.ticketNumber.localeCompare(b.ticketNumber);
  });
}