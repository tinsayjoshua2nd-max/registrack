import React from 'react';
import { TicketPriority } from '../../types';
import { AlertTriangle, Clock } from 'lucide-react';
import { normalizeTicketPriority } from '../../utils/ticketQueue';

interface PriorityBadgeProps {
  priority: TicketPriority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const normalizedPriority = normalizeTicketPriority(priority);
  if (normalizedPriority === 'Deadline-sensitive') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <Clock className="w-3 h-3 text-rose-500" />
        Deadline-sensitive
      </span>
    );
  }

  if (normalizedPriority === 'Urgent') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3 text-amber-600" />
        Priority
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
      {normalizedPriority === 'Normal' ? 'Standard' : 'Unknown priority'}
    </span>
  );
};
