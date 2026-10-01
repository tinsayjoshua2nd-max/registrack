import React from 'react';
import { TicketStatus } from '../../types';
import { Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  };

  switch (status) {
    case 'pending':
      return (
        <span
          id={`status-badge-pending`}
          className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 shadow-xs ${sizeClasses[size]}`}
        >
          {showIcon && <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />}
          <span>🟡 Pending</span>
        </span>
      );
    case 'processing':
      return (
        <span
          id={`status-badge-processing`}
          className={`inline-flex items-center rounded-full bg-sky-50 text-sky-800 border border-sky-200/80 shadow-xs ${sizeClasses[size]}`}
        >
          {showIcon && <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />}
          <span>🔵 Processing</span>
        </span>
      );
    case 'completed':
      return (
        <span
          id={`status-badge-completed`}
          className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs ${sizeClasses[size]}`}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          <span>🟢 Completed</span>
        </span>
      );
    case 'rejected':
      return (
        <span
          id={`status-badge-rejected`}
          className={`inline-flex items-center rounded-full bg-rose-50 text-rose-800 border border-rose-200/80 shadow-xs ${sizeClasses[size]}`}
        >
          {showIcon && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
          <span>🔴 Rejected / Needs Info</span>
        </span>
      );
    default:
      return null;
  }
};
