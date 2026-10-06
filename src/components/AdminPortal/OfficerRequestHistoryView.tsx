import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { StatusBadge } from '../Common/StatusBadge';
import { PriorityBadge } from '../Common/PriorityBadge';
import { CompletedRequestRecord, DeletedRequestRecord, TicketCategory } from '../../types';
import {
  History,
  Trash2,
  CheckCircle2,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  Calendar,
  User,
  GraduationCap,
  FileText,
  AlertTriangle,
  RotateCcw,
  Eye,
  X,
  Building,
  CheckCircle,
  FileCheck,
  Tag,
  ArrowRight,
  Info,
} from 'lucide-react';

export const OfficerRequestHistoryView: React.FC = () => {
  const {
    currentUser,
    getMyDeletedRequests,
    getMyCompletedRequests,
    restoreDeletedTicket,
    officerRole,
    setAdminView,
  } = useHelpdesk();

  const [activeTab, setActiveTab] = useState<'deleted' | 'completed'>('deleted');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | TicketCategory>('All');
  const [officerDeskFilter, setOfficerDeskFilter] = useState<'All' | 'receiver' | 'records_management' | 'evaluator' | 'registrar'>('All');
  
  // Modals
  const [selectedDeletedRecord, setSelectedDeletedRecord] = useState<DeletedRequestRecord | null>(null);
  const [selectedCompletedRecord, setSelectedCompletedRecord] = useState<CompletedRequestRecord | null>(null);
  const [recordToRestore, setRecordToRestore] = useState<DeletedRequestRecord | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);

  const isRegistrar =
    officerRole === 'superadmin' ||
    currentUser?.role === 'superadmin' ||
    currentUser?.name?.toLowerCase().includes('alexander') ||
    currentUser?.name?.toLowerCase().includes('reyes') ||
    currentUser?.name?.toLowerCase().includes('registrar');

  const myDeleted = getMyDeletedRequests();
  const myCompleted = getMyCompletedRequests();

  const getOfficerBadgeLabel = () => {
    if (isRegistrar) return 'Office of the University Registrar Desk';
    if (officerRole === 'receiver') return 'Receiver / Releasing Desk';
    if (officerRole === 'records_management') return 'Records Management Office Desk';
    if (officerRole === 'evaluator') return 'Academic Evaluator Office Desk';
    return currentUser?.adminRoleTitle || 'Registrar Officer Desk';
  };

  // Filtering for Deleted
  const filteredDeleted = myDeleted.filter((item) => {
    if (isRegistrar && officerDeskFilter !== 'All') {
      const role = (item.deletedByOfficerRole || '').toLowerCase();
      const name = (item.deletedByOfficerName || '').toLowerCase();
      if (officerDeskFilter === 'receiver' && !role.includes('receiver') && !name.includes('records office')) return false;
      if (officerDeskFilter === 'records_management' && !role.includes('records_management') && !name.includes('ronald')) return false;
      if (officerDeskFilter === 'evaluator' && !role.includes('evaluator') && !name.includes('elena')) return false;
      if (officerDeskFilter === 'registrar' && !role.includes('registrar') && !role.includes('superadmin') && !name.includes('alexander') && !name.includes('reyes')) return false;
    }
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      item.ticketNumber.toLowerCase().includes(q) ||
      item.studentName.toLowerCase().includes(q) ||
      item.studentId.includes(q) ||
      item.subject.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // Filtering for Completed
  const filteredCompleted = myCompleted.filter((item) => {
    if (isRegistrar && officerDeskFilter !== 'All') {
      const role = (item.completedByOfficerRole || '').toLowerCase();
      const name = (item.completedByOfficerName || '').toLowerCase();
      if (officerDeskFilter === 'receiver' && !role.includes('receiver') && !name.includes('records office')) return false;
      if (officerDeskFilter === 'records_management' && !role.includes('records_management') && !name.includes('ronald')) return false;
      if (officerDeskFilter === 'evaluator' && !role.includes('evaluator') && !name.includes('elena')) return false;
      if (officerDeskFilter === 'registrar' && !role.includes('registrar') && !role.includes('superadmin') && !name.includes('alexander') && !name.includes('reyes')) return false;
    }
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      item.ticketNumber.toLowerCase().includes(q) ||
      item.studentName.toLowerCase().includes(q) ||
      item.studentId.includes(q) ||
      item.subject.toLowerCase().includes(q) ||
      (item.notes && item.notes.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const handleConfirmRestore = async () => {
    if (!recordToRestore) return;
    try {
      await restoreDeletedTicket(recordToRestore.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to restore this request.');
      return;
    }
    setRestoreSuccessMsg(`Request #${recordToRestore.ticketNumber} successfully restored back to active queue.`);
    setRecordToRestore(null);
    if (selectedDeletedRecord?.id === recordToRestore.id) {
      setSelectedDeletedRecord(null);
    }
    setTimeout(() => setRestoreSuccessMsg(null), 4000);
  };

  const categories: ('All' | TicketCategory)[] = [
    'All',
    'TOR',
    'Honorable Dismissal',
    'Certificate of Registration',
    'Certificate of Graduation',
    'Certificate of Grades',
    'Form 137 / SF10',
    'English as Medium of Instruction',
    'Letter of No Objection',
    'Certificate of GWA',
    'Certificate of Latin Honors / SAC',
    'Diploma',
    'CAV',
    'Certified True Copies',
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>{getOfficerBadgeLabel()}</span>
            </span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              Private Officer Audit Partition
            </span>
          </div>

          <h1 className="mt-2 font-heading font-extrabold text-2xl sm:text-3xl text-stone-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-emerald-800" />
            <span>{isRegistrar ? 'Registrar Request History' : 'Officer Request History'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
            {isRegistrar ? (
              <>
                Executive historical ledger for <strong>{currentUser?.name || 'University Registrar'}</strong>.
                Review and audit deleted and completed document requests across registrar office desks, or filter records by specific officer desks.
              </>
            ) : (
              <>
                Personal historical ledger for <strong>{currentUser?.name || 'Authorized Officer'}</strong>.
                This view separates and displays <strong>only</strong> the document requests deleted and completed by your account, keeping records segregated from other registrar officers.
              </>
            )}
          </p>
        </div>

        {/* Quick Summary Cards */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-center">
            <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Deleted by You</p>
            <p className="font-heading font-extrabold text-xl text-rose-700">{myDeleted.length}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-center">
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Completed by You</p>
            <p className="font-heading font-extrabold text-xl text-emerald-700">{myCompleted.length}</p>
          </div>
        </div>
      </div>

      {restoreSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{restoreSuccessMsg}</span>
        </div>
      )}

      {/* Main Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('deleted')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'deleted'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Deleted Requests</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'deleted' ? 'bg-rose-900/60 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {myDeleted.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Completed Requests</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'completed' ? 'bg-emerald-950/60 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {myCompleted.length}
            </span>
          </button>
        </div>

        {/* Access isolation assurance notice */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-stone-500 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Restricted Officer Filter: Other officers&apos; activities are segregated.</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className={`grid grid-cols-1 ${isRegistrar ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3`}>
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'deleted' ? 'deleted' : 'completed'} requests by ticket #, student name, ID, or keywords...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-emerald-600 outline-none"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-emerald-600 outline-none"
            >
              <option value="All">All Categories</option>
              {categories.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Registrar Officer Desk Partition Filter */}
          {isRegistrar && (
            <div>
              <select
                value={officerDeskFilter}
                onChange={(e) => setOfficerDeskFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-emerald-600 outline-none font-semibold text-stone-700"
              >
                <option value="All">All Registrar Desks</option>
                <option value="receiver">Receiver / Receiving Desk</option>
                <option value="records_management">Records Management Desk</option>
                <option value="evaluator">Academic Evaluator Desk</option>
                <option value="registrar">University Registrar Desk</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: DELETED REQUESTS TABLE */}
      {activeTab === 'deleted' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-700" />
              <h3 className="font-heading font-bold text-xs sm:text-sm text-rose-950">
                Requests Deleted by {currentUser?.name || 'You'} ({filteredDeleted.length})
              </h3>
            </div>
            <p className="text-[11px] text-rose-800 hidden sm:block">
              Archived audit copies are preserved with exact deletion timestamps and justifications.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Ticket Number</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Document Category</th>
                  <th className="py-3 px-4">Deleted At</th>
                  <th className="py-3 px-4">Reason for Deletion</th>
                  <th className="py-3 px-4">Status at Erase</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredDeleted.map((rec) => (
                  <tr key={rec.id} className="hover:bg-rose-50/30 transition-colors">
                    {/* Ticket Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-rose-900">
                        {rec.ticketNumber}
                      </span>
                    </td>

                    {/* Student */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900">{rec.studentName}</div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        ID: {rec.studentId} • {rec.degreeProgram || 'Undergraduate'}
                      </div>
                    </td>

                    {/* Document Category */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-800">{rec.documentType || rec.category}</div>
                      <div className="text-[10px] text-stone-400 truncate max-w-xs">{rec.subject}</div>
                    </td>

                    {/* Deleted At */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-stone-600 font-medium">
                      <div className="flex items-center gap-1.5 text-stone-700">
                        <Clock className="w-3.5 h-3.5 text-rose-500" />
                        <span>{rec.deletedAtFormatted}</span>
                      </div>
                      <div className="text-[10px] text-stone-400">By {rec.deletedByOfficerName}</div>
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4">
                      <div className="max-w-xs text-xs text-stone-700 bg-rose-50/70 p-2 rounded-lg border border-rose-200/60 leading-relaxed font-medium">
                        &ldquo;{rec.reason}&rdquo;
                      </div>
                    </td>

                    {/* Status at Deletion */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={rec.statusAtDeletion} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedDeletedRecord(rec)}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="View complete record snapshot"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-600" />
                          <span>Snapshot</span>
                        </button>

                        <button
                          onClick={() => setRecordToRestore(rec)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Restore this document request back to active processing queue"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Restore</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredDeleted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Trash2 className="w-8 h-8 text-stone-300" />
                        <p className="font-semibold text-stone-600">No deleted requests in your history.</p>
                        <p className="text-[11px] text-stone-400 max-w-md">
                          When you delete or cancel a document request from the Request Management table or details modal, it will appear here in your personal history log.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COMPLETED REQUESTS TABLE */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-800" />
              <h3 className="font-heading font-bold text-xs sm:text-sm text-emerald-950">
                Requests Completed by {currentUser?.name || 'You'} ({filteredCompleted.length})
              </h3>
            </div>
            <p className="text-[11px] text-emerald-800 hidden sm:block">
              Official records of documents completed, finalized, and released to students.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Ticket Number</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Document Category</th>
                  <th className="py-3 px-4">Completion Date & Time</th>
                  <th className="py-3 px-4">Releasing Counter / Window</th>
                  <th className="py-3 px-4">Completion Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCompleted.map((rec) => (
                  <tr key={rec.id} className="hover:bg-emerald-50/30 transition-colors">
                    {/* Ticket Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-900 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900">
                        {rec.ticketNumber}
                      </span>
                    </td>

                    {/* Student */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-stone-900">{rec.studentName}</div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        ID: {rec.studentId} • {rec.degreeProgram || 'Undergraduate'}
                      </div>
                    </td>

                    {/* Document Category */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-stone-800">{rec.documentType || rec.category}</div>
                      <div className="text-[10px] text-stone-400 truncate max-w-xs">{rec.subject}</div>
                    </td>

                    {/* Completed At */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-stone-600 font-medium">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{rec.completedAtFormatted}</span>
                      </div>
                      <div className="text-[10px] text-stone-400">Completed by {rec.completedByOfficerName}</div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-stone-800 font-medium">
                        <Building className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span>{rec.releaseLocation || 'Registrar Ground Hall Counter'}</span>
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="py-3.5 px-4">
                      <div className="max-w-xs text-xs text-stone-700 bg-stone-50 p-2 rounded-lg border border-stone-200/70 leading-relaxed">
                        {rec.notes || 'Document claimed by student; transaction finalized.'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedCompletedRecord(rec)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Release Summary</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredCompleted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle className="w-8 h-8 text-stone-300" />
                        <p className="font-semibold text-stone-600">No completed requests in your history yet.</p>
                        <p className="text-[11px] text-stone-400 max-w-md">
                          When you finalize requests and release documents, they will be archived here under your officer completion history.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: VIEW DELETED RECORD SNAPSHOT */}
      {selectedDeletedRecord && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900">
                    Deleted Request Record Snapshot
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">
                    Ticket #{selectedDeletedRecord.ticketNumber} • {selectedDeletedRecord.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDeletedRecord(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Deletion Audit Meta Banner */}
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-1.5">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Deleted by {selectedDeletedRecord.deletedByOfficerName}
                </span>
                <span className="font-mono text-[11px] text-rose-800">{selectedDeletedRecord.deletedAtFormatted}</span>
              </div>
              <p className="text-rose-900">
                <strong>Stated Reason:</strong> &ldquo;{selectedDeletedRecord.reason}&rdquo;
              </p>
            </div>

            {/* Student & Document Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Student Name</span>
                <span className="font-bold text-stone-900">{selectedDeletedRecord.studentName}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">8-Digit Student ID</span>
                <span className="font-mono font-bold text-stone-900">{selectedDeletedRecord.studentId}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Degree Program</span>
                <span className="text-stone-800">{selectedDeletedRecord.degreeProgram || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Priority at Deletion</span>
                <PriorityBadge priority={selectedDeletedRecord.priority} />
              </div>
              <div className="col-span-2">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Subject / Description</span>
                <p className="text-stone-800 mt-0.5 leading-relaxed font-medium">
                  {selectedDeletedRecord.subject}
                </p>
                <p className="text-stone-600 text-[11px] mt-1">
                  {selectedDeletedRecord.description}
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setRecordToRestore(selectedDeletedRecord);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-emerald-700" />
                <span>Restore to Active Queue</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDeletedRecord(null)}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer"
              >
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW COMPLETED RECORD SUMMARY */}
      {selectedCompletedRecord && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-stone-900">
                    Official Release Summary & Certificate
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">
                    Ticket #{selectedCompletedRecord.ticketNumber} • Completed Record
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompletedRecord(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official Settlement Stamp Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-stone-900 text-white space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-300">
                  Transaction Settlement Stamped
                </span>
                <span className="text-xs font-mono font-bold text-emerald-200">
                  {selectedCompletedRecord.completedAtFormatted}
                </span>
              </div>
              <h4 className="font-heading font-bold text-sm text-white">
                {selectedCompletedRecord.documentType || selectedCompletedRecord.category}
              </h4>
              <p className="text-xs text-emerald-100/90">
                Released & finalized by <strong>{selectedCompletedRecord.completedByOfficerName}</strong> ({selectedCompletedRecord.releaseLocation}).
              </p>
            </div>

            {/* Student & Document Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Student Name</span>
                <span className="font-bold text-stone-900">{selectedCompletedRecord.studentName}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">8-Digit Student ID</span>
                <span className="font-mono font-bold text-stone-900">{selectedCompletedRecord.studentId}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Degree Program</span>
                <span className="text-stone-800">{selectedCompletedRecord.degreeProgram || 'N/A'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Release Date</span>
                <span className="font-semibold text-emerald-800">{selectedCompletedRecord.releaseDate || 'Settled'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Completion Notes / Action</span>
                <p className="text-stone-800 mt-0.5 leading-relaxed bg-white p-2.5 rounded-xl border border-stone-200">
                  {selectedCompletedRecord.notes || 'Document claimed by student; transaction complete.'}
                </p>
              </div>
            </div>

            <div className="pt-2 text-right border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSelectedCompletedRecord(null)}
                className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Close Release Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM RESTORE MODAL */}
      {recordToRestore && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6 text-emerald-800" />
            </div>
            <div className="text-center">
              <h3 className="font-heading font-bold text-lg text-stone-900">
                Restore Document Request?
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                Restore ticket <strong>#{recordToRestore.ticketNumber} ({recordToRestore.studentName})</strong> back to the active ticket processing queue?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToRestore(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 font-semibold text-xs text-stone-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Yes, Restore Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
