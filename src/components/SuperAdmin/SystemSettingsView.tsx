import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import {
  Settings,
  Clock,
  ShieldAlert,
  Bell,
  CheckCircle2,
  Building,
  Save,
  Mail,
  School,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export const SystemSettingsView: React.FC = () => {
  const { systemSettings, updateSystemSettings } = useHelpdesk();

  const [settings, setSettings] = useState(systemSettings);
  const [notification, setNotification] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemSettings(settings);
    setNotification('System configuration parameters updated successfully.');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
              Institutional System Configuration
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Registrar Master Controls
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Global university settings, academic year/semester, ticket concurrency thresholds, notification gateways, and emergency maintenance.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2.5 rounded-xl font-heading font-bold text-xs text-white bg-emerald-800 hover:bg-emerald-900 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Save System Parameters</span>
        </button>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* School Identity */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-sm text-stone-900 flex items-center gap-2 pb-2 border-b border-stone-100">
            <School className="w-4 h-4 text-emerald-800" />
            University & Office Identity
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Institution Name
              </label>
              <input
                type="text"
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 flex flex-wrap items-center gap-2 font-bold text-stone-700">
                  <span>Institutional Code</span>
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                    Not connected yet
                  </span>
                </label>
                <input
                  type="text"
                  value={settings.schoolCode}
                  disabled
                  onChange={(e) => setSettings({ ...settings, schoolCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Office Title
                </label>
                <input
                  type="text"
                  value={settings.officeName}
                  onChange={(e) => setSettings({ ...settings, officeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Campus Address
              </label>
              <input
                type="text"
                value={settings.schoolAddress}
                onChange={(e) => setSettings({ ...settings, schoolAddress: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 flex flex-wrap items-center gap-2 font-bold text-stone-700">
                  <span>Academic Year</span>
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                    Not connected yet
                  </span>
                </label>
                <input
                  type="text"
                  value={settings.academicYear}
                  disabled
                  onChange={(e) => setSettings({ ...settings, academicYear: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
                />
              </div>

              <div>
                <label className="mb-1 flex flex-wrap items-center gap-2 font-bold text-stone-700">
                  <span>Semester / Term</span>
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                    Not connected yet
                  </span>
                </label>
                <input
                  type="text"
                  value={settings.semester}
                  disabled
                  onChange={(e) => setSettings({ ...settings, semester: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Triage & Workload Settings */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-sm text-stone-900 flex items-center gap-2 pb-2 border-b border-stone-100">
            <Settings className="w-4 h-4 text-emerald-800" />
            Triage Automation & Staff Limits
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
              <div>
                <p className="font-bold text-stone-900">Auto-Assignment Algorithm</p>
                <p className="text-[11px] text-stone-500">
                  Automatically assign new tickets to the first eligible active staff member by role priority; workload is not balanced.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoAssignmentEnabled}
                onChange={(e) => setSettings({ ...settings, autoAssignmentEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-700 cursor-pointer"
              />
            </div>

            <div>
              <label className="mb-1 flex flex-wrap items-center gap-2 font-bold text-stone-700">
                <span>Max Pending Tickets Per Evaluator</span>
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                  Not connected yet
                </span>
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={settings.maxPendingTicketsPerStaff}
                disabled
                onChange={(e) => setSettings({ ...settings, maxPendingTicketsPerStaff: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Prevents staff burnout; additional tickets queue in central pending pool.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
              <div>
                <p className="flex flex-wrap items-center gap-2 font-bold text-stone-900">
                  <span>Open Student Self-Registration</span>
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                    Not connected yet
                  </span>
                </p>
                <p className="text-[11px] text-stone-500">
                  Allow students to register with valid 8-digit IDs on login screen.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.allowStudentRegistration}
                disabled
                onChange={(e) => setSettings({ ...settings, allowStudentRegistration: e.target.checked })}
                className="w-4 h-4 accent-emerald-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Notifications & Channels */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-sm text-stone-900 flex items-center gap-2 pb-2 border-b border-stone-100">
            <Bell className="w-4 h-4 text-emerald-800" />
            Automated Notification Dispatch
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
              <div>
                <p className="flex flex-wrap items-center gap-2 font-bold text-stone-900">
                  <span>Email Notifications</span>
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                    Not connected yet
                  </span>
                </p>
                <p className="text-[11px] text-stone-500">
                  Send email notifications when tickets are reviewed, ready, or resolved.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.emailNotificationsEnabled}
                disabled
                onChange={(e) => setSettings({ ...settings, emailNotificationsEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
              <div>
                <p className="flex flex-wrap items-center gap-2 font-bold text-stone-900">
                  <span>SMS Gateway Dispatch</span>
                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                    Not connected yet
                  </span>
                </p>
                <p className="text-[11px] text-stone-500">
                  Dispatch SMS notifications for urgent document releases and counter pickup ready alerts.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.smsAlertsEnabled}
                disabled
                onChange={(e) => setSettings({ ...settings, smsAlertsEnabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Emergency & Maintenance */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h3 className="font-heading font-bold text-sm text-rose-800 flex items-center gap-2 pb-2 border-b border-stone-100">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Emergency & Maintenance Control
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/70 border border-rose-200">
              <div>
                <p className="font-bold text-rose-950">Maintenance Mode</p>
                <p className="text-[11px] text-rose-800">
                  Shows a “Maintenance Mode Active” banner to all staff and Super Admin accounts and blocks new ticket intake from non-Super Admin accounts. Students see no banner.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="w-4 h-4 accent-rose-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
