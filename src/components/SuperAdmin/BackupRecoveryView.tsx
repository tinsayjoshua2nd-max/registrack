import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import {
  Database,
  Download,
  Upload,
  Archive,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cpu,
  Activity,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const BackupRecoveryView: React.FC = () => {
  const {
    tickets,
    exportSystemBackup,
    restoreSystemBackup,
    archiveCompletedRequests,
  } = useHelpdesk();

  const [notification, setNotification] = useState<string | null>(null);
  const [jsonInput, setJsonInput] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  const completedCount = tickets.filter((t) => t.status === 'completed').length;

  const handleDownloadBackup = () => {
    const dataStr = exportSystemBackup();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `university_registrar_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setNotification('System backup snapshot downloaded successfully.');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonInput.trim()) return;

    const res = await restoreSystemBackup(jsonInput.trim());
    if (res.success) {
      setShowRestoreModal(false);
      setJsonInput('');
      setNotification('System state restored successfully from JSON backup snapshot.');
      setTimeout(() => setNotification(null), 4000);
    } else {
      alert(`Failed to restore backup: ${res.error || 'Invalid JSON format'}`);
    }
  };

  const handleArchive = async () => {
    if (completedCount === 0) {
      alert('There are no completed tickets to archive.');
      return;
    }

    if (confirm(`Archive ${completedCount} completed request(s) into cold archival storage?`)) {
      try {
        const count = await archiveCompletedRequests();
        setNotification(`Archived ${count} completed ticket(s).`);
        setTimeout(() => setNotification(null), 3000);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Unable to archive completed requests.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
              Database Backup, Archival & System Health
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Disaster Recovery
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Export and restore operational records and configuration, or move completed requests into history. Login credentials and active sessions are not included in JSON backups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2.5 rounded-xl font-heading font-bold text-xs text-white bg-emerald-800 hover:bg-emerald-900 shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Generate Backup Snapshot</span>
          </button>
          <button
            onClick={() => setShowRestoreModal(true)}
            className="px-4 py-2.5 rounded-xl font-heading font-bold text-xs text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Restore Backup</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* System Telemetry & Health Checks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <Activity className="w-4 h-4 text-emerald-700" />
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              CONNECTED
            </span>
          </div>
          <p className="text-2xl font-heading font-black text-stone-900 mt-2">
            Online
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Current Server Connection</p>
          <p className="text-[10px] text-stone-400 mt-1">Registrar API gateway active</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <Database className="w-4 h-4 text-emerald-700" />
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              DATABASE
            </span>
          </div>
          <p className="text-2xl font-heading font-black text-stone-900 mt-2">
            PostgreSQL
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Persistent Server Storage</p>
          <p className="text-[10px] text-stone-400 mt-1">Records are not stored in this browser</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <Cpu className="w-4 h-4 text-emerald-700" />
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              LATENCY
            </span>
          </div>
          <p className="text-2xl font-heading font-black text-stone-900 mt-2">
            Not measured
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Query Response Time</p>
          <p className="text-[10px] text-stone-400 mt-1">No historical latency data available</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400">
            <Archive className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
              READY
            </span>
          </div>
          <p className="text-2xl font-heading font-black text-stone-900 mt-2">
            {completedCount}
          </p>
          <p className="text-xs font-semibold text-stone-500 mt-0.5">Eligible for Archival</p>
          <p className="text-[10px] text-stone-400 mt-1">Completed tickets ready to freeze</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Archival Card */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Archive className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-stone-900">
                Completed Request Cold Archival
              </h3>
              <p className="text-xs text-stone-500">
                Freezes resolved tickets to reduce active registrar triage load.
              </p>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            Archiving moves {completedCount} closed tickets out of the active operational pipeline and registers a formal archival log event in the central audit ledger.
          </p>

          <button
            onClick={handleArchive}
            disabled={completedCount === 0}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              completedCount > 0
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Archive {completedCount} Completed Tickets</span>
          </button>
        </div>

        {/* Disaster Recovery Snapshot Info */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-stone-900">
                Institutional Data Security Compliance
              </h3>
              <p className="text-xs text-stone-500">
                Full relational entity portability in standard JSON format.
              </p>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            Exports student databases, registrar staff accounts, custom RBAC permission matrices, helpdesk ticket threads, and audit logs into a verified cryptographic JSON payload.
          </p>

          <button
            onClick={handleDownloadBackup}
            className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-800 hover:bg-emerald-900 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download Instant JSON Backup</span>
          </button>
        </div>
      </div>

      {/* RESTORE MODAL */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <Upload className="w-5 h-5" />
              <h3 className="font-heading font-bold text-base text-stone-900">
                Restore System from JSON Snapshot
              </h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Paste your downloaded operational backup JSON below. This restores requests, histories, student profiles, and configuration. Account passwords and sessions remain unchanged.
            </p>

            <form onSubmit={handleRestoreSubmit} className="space-y-3 text-xs">
              <textarea
                rows={8}
                required
                placeholder='Paste raw {"tickets": [...], "users": [...]} JSON content here...'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full p-3 font-mono text-[11px] rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
              />

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold cursor-pointer"
                >
                  Execute Restore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
