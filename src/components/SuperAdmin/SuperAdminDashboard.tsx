import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import {
  Users,
  ShieldCheck,
  Ticket,
  Clock,
  CheckCircle2,
  Activity,
  ArrowUpRight,
  TrendingUp,
  UserCheck,
  FileText,
  Layers,
  ChevronRight,
  History,
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const {
    stats,
    systemActivities,
    tickets,
    users,
    studentRecords,
    auditLogs,
    setSuperAdminView,
    getMyDeletedRequests,
    getMyCompletedRequests,
  } = useHelpdesk();

  const [activityFilter, setActivityFilter] = useState<'all' | 'assignment' | 'status_change' | 'setting_updated'>('all');

  const filteredActivities = systemActivities.filter((act) => {
    if (activityFilter === 'all') return true;
    return act.actionType === activityFilter;
  });

  const totalStaffAdmins = users.filter((u) => u.role !== 'student').length;
  const resolvedCount = tickets.filter((t) => t.status === 'completed').length;
  const activeUsersCount = users.filter((u) => u.status === 'active').length;
  const deletedCount = getMyDeletedRequests().length;
  const completedHistoryCount = getMyCompletedRequests().length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                UNIVERSITY REGISTRAR CONSOLE
              </span>
              <span className="text-xs text-stone-400">Institutional Governance & Document Oversight</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-tight">
              Registrar Operational Management
            </h1>
            <p className="mt-1 text-sm text-stone-300 max-w-2xl leading-relaxed">
              Executive monitoring of staff workload, ticket progress, user role governance, and institutional audit events.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setSuperAdminView('request-history')}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-400 border border-stone-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Request History</span>
            </button>
            <button
              onClick={() => setSuperAdminView('users')}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white text-stone-900 hover:bg-stone-100 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>Manage Users</span>
            </button>
            <button
              onClick={() => setSuperAdminView('reports')}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Full Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Students */}
        <div
          onClick={() => setSuperAdminView('students')}
          className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-400 group-hover:text-emerald-700">
            <Users className="w-4 h-4" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-heading font-black text-stone-900 mt-2">
            {studentRecords.length}
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Total Students</p>
          <span className="text-[10px] text-emerald-700 font-medium">8-digit verified IDs</span>
        </div>

        {/* Total Staff / Admins */}
        <div
          onClick={() => setSuperAdminView('users')}
          className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-400 group-hover:text-emerald-700">
            <ShieldCheck className="w-4 h-4" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-heading font-black text-stone-900 mt-2">
            {totalStaffAdmins}
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Staff & Admins</p>
          <span className="text-[10px] text-stone-500">All non-student accounts</span>
        </div>

        {/* Total Helpdesk Tickets */}
        <div
          onClick={() => setSuperAdminView('tickets')}
          className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-400 group-hover:text-emerald-700">
            <Ticket className="w-4 h-4" />
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
          <p className="text-2xl font-heading font-black text-stone-900 mt-2">
            {tickets.length}
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Total Tickets</p>
          <span className="text-[10px] text-stone-500">All categories</span>
        </div>

        {/* Pending Requests */}
        <div
          onClick={() => setSuperAdminView('tickets')}
          className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-amber-500 group-hover:text-amber-700">
            <Clock className="w-4 h-4" />
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">QUEUE</span>
          </div>
          <p className="text-2xl font-heading font-black text-amber-700 mt-2">
            {stats.pendingRequests}
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Pending Action</p>
          <span className="text-[10px] text-amber-700 font-medium">Awaiting staff action</span>
        </div>

        {/* Resolved Requests */}
        <div
          onClick={() => setSuperAdminView('tickets')}
          className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-emerald-600 group-hover:text-emerald-800">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">DONE</span>
          </div>
          <p className="text-2xl font-heading font-black text-emerald-700 mt-2">
            {resolvedCount}
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Resolved Requests</p>
          <span className="text-[10px] text-emerald-700 font-medium">Released / Completed</span>
        </div>

        {/* Active Users */}
        <div
          onClick={() => setSuperAdminView('users')}
          className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-400 group-hover:text-emerald-700">
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-heading font-black text-stone-900 mt-2">
            {activeUsersCount}
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Active Accounts</p>
          <span className="text-[10px] text-stone-500">Registered accounts marked active</span>
        </div>
      </div>

      {/* Main Grid: Operational Summary + Live System Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: System Status Overview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Health Summary Card */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-heading font-bold text-sm text-stone-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                Registrar Operational Metrics
              </h3>
              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {tickets.length > 0 ? 'Current records' : 'No data yet'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-600">Completed Requests</span>
                <span className="font-mono font-bold text-emerald-800">{resolvedCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-600">Average Turnaround Time</span>
                <span className="font-mono font-bold text-stone-800">
                  {stats.avgTurnaroundDays > 0 ? `${stats.avgTurnaroundDays.toFixed(1)} business days` : 'No data yet'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-600">Urgent Tickets Pending</span>
                <span className="font-mono font-bold text-rose-700">
                  {stats.urgentTickets} tickets
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50">
                <span className="text-stone-600">Total Audit Events Recorded</span>
                <span className="font-mono font-bold text-stone-800">
                  {auditLogs.length} events
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => setSuperAdminView('users')}
                className="p-2.5 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-xs font-semibold text-stone-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                <span>User Management</span>
              </button>
              <button
                onClick={() => setSuperAdminView('tickets')}
                className="p-2.5 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-xs font-semibold text-stone-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5 text-emerald-700" />
                <span>Helpdesk Tickets</span>
              </button>
            </div>
          </div>

          {/* Quick Staff Workload Table */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-heading font-bold text-sm text-stone-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                Active Registrar Staff Load
              </h3>
              <button
                onClick={() => setSuperAdminView('tickets')}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                Reassign Tickets →
              </button>
            </div>

            <div className="mt-3 divide-y divide-stone-100">
              {users
                .filter(
                  (u) =>
                    u.status === 'active' &&
                    (u.role === 'receiver' ||
                      u.role === 'records_management' ||
                      u.role === 'evaluator' ||
                      u.role === 'registrar' ||
                      u.role === 'staff' ||
                      u.role === 'admin')
                )
                .map((staff) => {
                  const staffTicketCount = tickets.filter(
                    (t) => {
                      const assigned = t.assignedTo.trim().toLowerCase();
                      const name = staff.name.trim().toLowerCase();
                      return (assigned === name || assigned.startsWith(`${name} (`)) && t.status !== 'completed';
                    }
                  ).length;
                  return (
                    <div key={staff.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-stone-900">{staff.name}</p>
                        <p className="text-[11px] text-stone-500">{staff.departmentOrOffice}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          staffTicketCount > 2 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {staffTicketCount} active tickets
                        </span>
                        <p className="text-[10px] text-stone-400 mt-0.5">{staff.status}</p>
                      </div>
                    </div>
                  );
                })}
              {users.filter(
                (u) =>
                  u.status === 'active' &&
                  (u.role === 'receiver' ||
                    u.role === 'records_management' ||
                    u.role === 'evaluator' ||
                    u.role === 'registrar' ||
                    u.role === 'staff' ||
                    u.role === 'admin')
              ).length === 0 && (
                <p className="py-5 text-center text-xs text-stone-500">No active staff accounts yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activities Timeline (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-700" />
                  Recent System Activities
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Granular timestamped audit stream of ticket actions, evaluator assignments, and profile updates.
                </p>
              </div>

              {/* Activity Filter Chips */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setActivityFilter('all')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                    activityFilter === 'all'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActivityFilter('assignment')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                    activityFilter === 'assignment'
                      ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Assignments
                </button>
                <button
                  onClick={() => setActivityFilter('status_change')}
                  className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                    activityFilter === 'status_change'
                      ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Status
                </button>
              </div>
            </div>

            {/* Timeline Stream */}
            <div className="mt-4 space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredActivities.length === 0 ? (
                <div className="p-8 text-center text-stone-500 text-xs">
                  No activities found for this filter.
                </div>
              ) : (
                filteredActivities.map((act, idx) => {
                  let badgeColor = 'bg-stone-100 text-stone-700';
                  if (act.actionType === 'assignment') badgeColor = 'bg-emerald-100 text-emerald-900 border border-emerald-300';
                  if (act.actionType === 'status_change') badgeColor = 'bg-blue-100 text-blue-900 border border-blue-300';
                  if (act.actionType === 'ticket_resolved') badgeColor = 'bg-emerald-100 text-emerald-900 border border-emerald-300';
                  if (act.actionType === 'setting_updated') badgeColor = 'bg-purple-100 text-purple-900 border border-purple-300';

                  return (
                    <div
                      key={`${act.id || 'act'}-${idx}`}
                      className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/40 hover:bg-stone-50 transition-colors flex items-start gap-3"
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-stone-900 leading-snug">
                            {act.text}
                          </p>
                          <span className="text-[10px] text-stone-500 shrink-0 font-mono text-right leading-tight">
                            {act.timestamp && !Number.isNaN(Date.parse(act.timestamp)) ? (
                              <>
                                <span className="block">
                                  {new Date(act.timestamp).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                <span className="block">
                                  {new Date(act.timestamp).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}
                                </span>
                              </>
                            ) : (
                              act.timeStr || act.timestamp
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-stone-600 font-medium">
                            By: <strong>{act.actor}</strong>
                          </span>
                          {act.ticketNumber && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-200 text-stone-800">
                              #{act.ticketNumber}
                            </span>
                          )}
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${badgeColor}`}>
                            {act.actionType.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Live audit recording enabled</span>
            <button
              onClick={() => setSuperAdminView('audit-logs')}
              className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Audit Trail</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
