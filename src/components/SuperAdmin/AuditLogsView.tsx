import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { AuditLog } from '../../types';
import { formatDateInManila } from '../../utils/formatDate';
import { formatAuditStageDetails, getAuditRoleLabel } from '../../utils/ticketLabels';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

const VISIBLE_CATEGORIES: AuditLog['category'][] = ['Auth', 'Ticket', 'Role', 'System'];
type AuditCategoryFilter = 'all' | 'Auth' | 'Ticket' | 'Role' | 'System' | 'Other';

const eventCountLabel = (count: number) => `${count} ${count === 1 ? 'event' : 'events'}`;

export const AuditLogsView: React.FC = () => {
  const { auditLogs } = useHelpdesk();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AuditCategoryFilter>('all');

  const categoryCounts = {
    Auth: auditLogs.filter((log) => log.category === 'Auth').length,
    Ticket: auditLogs.filter((log) => log.category === 'Ticket').length,
    Role: auditLogs.filter((log) => log.category === 'Role').length,
    System: auditLogs.filter((log) => log.category === 'System').length,
    Other: auditLogs.filter((log) => !VISIBLE_CATEGORIES.includes(log.category)).length,
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (categoryFilter === 'Other') {
      if (VISIBLE_CATEGORIES.includes(log.category)) return false;
    } else if (categoryFilter !== 'all' && log.category !== categoryFilter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchActor = log.actorName.toLowerCase().includes(q);
      const matchDetails = log.details.toLowerCase().includes(q);
      if (!matchAction && !matchActor && !matchDetails) return false;
    }
    return true;
  });

  const exportAuditCSV = () => {
    const headers = ['Log ID', 'Timestamp', 'Actor Name', 'Actor Role', 'Category', 'Action Code', 'Details', 'Severity', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.actorName}"`,
      `"${getAuditRoleLabel(l.actorRole)}"`,
      `"${l.category}"`,
      `"${l.action}"`,
      `"${formatAuditStageDetails(l.details).replace(/"/g, '""')}"`,
      `"${l.severity}"`,
      `"${l.ipAddress || '127.0.0.1'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `registrar_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
              Institutional Audit Trail & Security Ledger
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-stone-900 text-emerald-400 font-mono">
              Immutable Log
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Forensic trace of all privileged actions, login authentications, ticket status modifications, and permission shifts.
          </p>
        </div>

        <button
          onClick={exportAuditCSV}
          className="px-4 py-2.5 rounded-xl font-heading font-bold text-xs text-white bg-emerald-800 hover:bg-emerald-900 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action, actor, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-emerald-600 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            aria-label={`All Events, ${eventCountLabel(auditLogs.length)}`}
            aria-pressed={categoryFilter === 'all'}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              auditLogs.length === 0 ? 'opacity-50 ' : ''
            }${
              categoryFilter === 'all' ? 'bg-stone-900 text-white shadow-2xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
            }`}
          >
            All Events ({auditLogs.length})
          </button>
          <button
            onClick={() => setCategoryFilter('Auth')}
            aria-label={`Auth, ${eventCountLabel(categoryCounts.Auth)}`}
            aria-pressed={categoryFilter === 'Auth'}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              categoryCounts.Auth === 0 ? 'opacity-50 ' : ''
            }${
              categoryFilter === 'Auth' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
            }`}
          >
            Auth ({categoryCounts.Auth})
          </button>
          <button
            onClick={() => setCategoryFilter('Ticket')}
            aria-label={`Tickets, ${eventCountLabel(categoryCounts.Ticket)}`}
            aria-pressed={categoryFilter === 'Ticket'}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              categoryCounts.Ticket === 0 ? 'opacity-50 ' : ''
            }${
              categoryFilter === 'Ticket' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
            }`}
          >
            Tickets ({categoryCounts.Ticket})
          </button>
          <button
            onClick={() => setCategoryFilter('Role')}
            aria-label={`Roles, ${eventCountLabel(categoryCounts.Role)}`}
            aria-pressed={categoryFilter === 'Role'}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              categoryCounts.Role === 0 ? 'opacity-50 ' : ''
            }${
              categoryFilter === 'Role' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
            }`}
          >
            Roles ({categoryCounts.Role})
          </button>
          <button
            onClick={() => setCategoryFilter('System')}
            aria-label={`System, ${eventCountLabel(categoryCounts.System)}`}
            aria-pressed={categoryFilter === 'System'}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              categoryCounts.System === 0 ? 'opacity-50 ' : ''
            }${
              categoryFilter === 'System' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
            }`}
          >
            System ({categoryCounts.System})
          </button>
          <button
            onClick={() => setCategoryFilter('Other')}
            aria-label={`Other, ${eventCountLabel(categoryCounts.Other)}`}
            aria-pressed={categoryFilter === 'Other'}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
              categoryCounts.Other === 0 ? 'opacity-50 ' : ''
            }${
              categoryFilter === 'Other' ? 'bg-emerald-800 text-white font-bold shadow-2xs' : 'bg-stone-100 text-stone-600 hover:text-stone-900'
            }`}
          >
            Other ({categoryCounts.Other})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Performer Identity</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Audit Action Code</th>
                <th className="py-3 px-4">Forensic Details & Payload</th>
                <th className="py-3 px-4 text-right">Origin IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500 text-xs">
                    No audit records match the current criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  let badge = 'bg-stone-100 text-stone-800';
                  if (log.category === 'Auth') badge = 'bg-blue-100 text-blue-900 border border-blue-200';
                  if (log.category === 'Ticket') badge = 'bg-emerald-100 text-emerald-900 border border-emerald-200';
                  if (log.category === 'Role' || log.category === 'Student') badge = 'bg-purple-100 text-purple-900 border border-purple-200';
                  if (log.category === 'System' || log.category === 'Backup') badge = 'bg-amber-100 text-amber-900 border border-amber-200';

                  return (
                    <tr key={`${log.id || 'log'}-${idx}`} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                        {formatDateInManila(log.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-stone-900">{log.actorName}</p>
                        <p className="text-[10px] text-stone-400">{getAuditRoleLabel(log.actorRole)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                          {log.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${badge}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-700 leading-relaxed max-w-md">
                        {formatAuditStageDetails(log.details)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[10px] text-stone-400">
                        {log.ipAddress || 'Not recorded'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
