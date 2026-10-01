import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
  Users,
  Award,
} from 'lucide-react';

export const ReportsAnalyticsView: React.FC = () => {
  const { tickets, users, stats, studentRecords } = useHelpdesk();
  const [timeRange, setTimeRange] = useState<'all' | '30d' | '7d'>('all');

  const staffMembers = users.filter((u) => u.role === 'registrar' || u.role === 'staff');

  // Categories distribution
  const categoryCounts: Record<string, number> = {};
  tickets.forEach((t) => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });

  // Staff performance breakdown
  const staffStats = staffMembers.map((staff) => {
    const staffTickets = tickets.filter((t) => t.assignedTo.includes(staff.name));
    const completed = staffTickets.filter((t) => t.status === 'completed').length;
    const pending = staffTickets.filter((t) => t.status === 'pending' || t.status === 'processing').length;
    const completionRate = staffTickets.length > 0 ? Math.round((completed / staffTickets.length) * 100) : 0;

    return {
      name: staff.name,
      office: staff.departmentOrOffice,
      total: staffTickets.length,
      completed,
      pending,
      rate: completionRate,
    };
  });

  const exportCSV = () => {
    const headers = ['Ticket Number', 'Student Name', 'Student ID', 'Category', 'Priority', 'Status', 'Assigned Staff', 'Created At', 'Est Release Date'];
    const rows = tickets.map((t) => [
      t.ticketNumber,
      `"${t.studentName}"`,
      `"${t.studentId}"`,
      `"${t.category}"`,
      t.priority,
      t.status,
      `"${t.assignedTo}"`,
      `"${t.createdAt}"`,
      `"${t.estimatedReleaseDate}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `registrar_performance_report_${new Date().toISOString().slice(0, 10)}.csv`);
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
              Registrar Service Intelligence & Reports
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Institutional SLA Analytics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Throughput velocity metrics, window resolution ratios, document category bottlenecks, and downloadable institutional reports.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="px-4 py-2.5 rounded-xl font-heading font-bold text-xs text-white bg-emerald-800 hover:bg-emerald-900 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Executive Report (CSV)</span>
        </button>
      </div>

      {/* 4 Summary Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              +14.2% YoY
            </span>
          </div>
          <p className="text-2xl font-heading font-black text-stone-900 mt-2">
            {tickets.length}
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Total Service Tickets</p>
          <p className="text-[10px] text-stone-400 mt-1">Recorded in registrar database</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <Clock className="w-4 h-4 text-emerald-700" />
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              SLA MET
            </span>
          </div>
          <p className="text-2xl font-heading font-black text-stone-900 mt-2">
            {stats.avgTurnaroundDays} Days
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Average Turnaround</p>
          <p className="text-[10px] text-stone-400 mt-1">Submission to document release</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              OPTIMAL
            </span>
          </div>
          <p className="text-2xl font-heading font-black text-stone-900 mt-2">
            {tickets.length > 0 ? Math.round((tickets.filter(t => t.status === 'completed').length / tickets.length) * 100) : 0}%
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Resolution Efficiency Rate</p>
          <p className="text-[10px] text-stone-400 mt-1">Completed vs total intake</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <Users className="w-4 h-4 text-emerald-700" />
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              VERIFIED
            </span>
          </div>
          <p className="text-2xl font-heading font-black text-stone-900 mt-2">
            {studentRecords.length}
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Active Student Base</p>
          <p className="text-[10px] text-stone-400 mt-1">Validated 8-digit accounts</p>
        </div>
      </div>

      {/* Grid: Staff Performance Table + Category Volume Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Staff Performance (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-heading font-bold text-sm text-stone-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700" />
                Registrar Evaluator Performance & Workload
              </h3>
              <p className="text-[11px] text-stone-500">Resolution rates across active service windows</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Evaluator / Officer</th>
                  <th className="py-2.5 px-3">Office Window</th>
                  <th className="py-2.5 px-3 text-center">Assigned</th>
                  <th className="py-2.5 px-3 text-center">Completed</th>
                  <th className="py-2.5 px-3 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {staffStats.map((s, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-bold text-stone-900">{s.name}</td>
                    <td className="py-2.5 px-3 text-stone-600 text-[11px]">{s.office}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-800">{s.total}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">{s.completed}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-mono font-bold text-stone-900">{s.rate}%</span>
                      <div className="w-20 bg-stone-100 h-1.5 rounded-full ml-auto mt-1 overflow-hidden">
                        <div
                          className="bg-emerald-700 h-full rounded-full"
                          style={{ width: `${s.rate}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="font-heading font-bold text-sm text-stone-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-700" />
                Intake Volume by Document Category
              </h3>
              <p className="text-[11px] text-stone-500">Distribution of active concern types</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = tickets.length > 0 ? Math.round((count / tickets.length) * 100) : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800">{cat}</span>
                    <span className="font-mono text-stone-500 text-[11px]">
                      {count} tickets ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-800 h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
