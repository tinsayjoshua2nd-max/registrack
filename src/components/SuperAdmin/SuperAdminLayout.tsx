import React from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { SuperAdminNavView } from '../../types';
import { UserProfileModal } from '../Common/UserProfileModal';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { UserManagementView } from './UserManagementView';
import { HelpdeskManagementView } from './HelpdeskManagementView';
import { StudentRecordManagementView } from './StudentRecordManagementView';
import { ReportsAnalyticsView } from './ReportsAnalyticsView';
import { AnnouncementsNotificationsView } from './AnnouncementsNotificationsView';
import { SystemSettingsView } from './SystemSettingsView';
import { AuditLogsView } from './AuditLogsView';
import { OfficerRequestHistoryView } from '../AdminPortal/OfficerRequestHistoryView';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Ticket,
  GraduationCap,
  FileText,
  BarChart3,
  Megaphone,
  Settings,
  ShieldAlert,
  Database,
  LogOut,
  Bell,
  School,
  AlertTriangle,
  Clock,
  KeyRound,
  Camera,
  History,
} from 'lucide-react';

export const SuperAdminLayout: React.FC = () => {
  const {
    superAdminView,
    setSuperAdminView,
    currentUser,
    logout,
    systemSettings,
    stats,
    tickets,
    users,
    notifications,
    markNotificationAsRead,
  } = useHelpdesk();

  const [showNotifs, setShowNotifs] = React.useState(false);
  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const navItems: { id: SuperAdminNavView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'tickets', label: 'Helpdesk Tickets', icon: Ticket },
    { id: 'students', label: 'Student Records', icon: GraduationCap },
    { id: 'request-history', label: 'Request History', icon: History },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'announcements', label: 'Advisories & Alerts', icon: Megaphone },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'audit-logs', label: 'Audit Trail', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-[100dvh] bg-stone-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="safe-area-top bg-white border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        {systemSettings.maintenanceMode && (
          <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-rose-50 border-b border-rose-300 text-rose-800 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Maintenance Mode Active</span>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 min-h-14 py-2 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Identity */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-stone-900 text-emerald-400 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              <School className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-heading font-extrabold text-sm sm:text-base text-stone-900 leading-tight truncate max-w-[40vw] sm:max-w-none">
                  {systemSettings.officeName || 'Office of the University Registrar'}
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-stone-900 text-emerald-400 border border-stone-700">
                  Registrar Officer
                </span>
              </div>
              <p className="text-[11px] text-stone-500 hidden sm:block">
                Registrar Officer & Institutional Oversight
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* Quick Badge */}
            <div className="hidden md:flex items-center gap-2 text-xs text-stone-600 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              <span>{stats.pendingRequests} Tickets in Queue</span>
            </div>

            {/* Notifications & Updates Dropdown with Realtime Arrival Timestamp */}
            <div className="relative">
              <button
                id="superadmin-notif-button"
                onClick={() => setShowNotifs(!showNotifs)}
                aria-label="Institutional notifications"
                className="relative min-h-11 min-w-11 p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer border border-stone-200 flex items-center justify-center"
                title="Registrar Officer Notifications & Real-Time Arrival"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="fixed left-3 right-3 top-16 mt-2 w-auto sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:w-96 rounded-2xl bg-white border border-stone-200 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm text-stone-900">
                        Institutional Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-mono font-bold flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <Clock className="w-2.5 h-2.5" />
                      Live Arrival Stream
                    </span>
                  </div>

                  <div className="mt-2.5 max-h-80 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-stone-400 text-xs">No alerts logged.</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`p-2.5 rounded-xl transition-colors cursor-pointer text-left text-xs ${
                            n.read
                              ? 'bg-stone-50 hover:bg-stone-100 text-stone-700'
                              : 'bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-100/70 text-emerald-950 font-medium'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-stone-900">{n.title}</span>
                            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-emerald-700" />
                              {n.exactTime || n.timestamp}
                            </span>
                          </div>
                          <p className="text-stone-600 mt-1 leading-snug">{n.message}</p>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                            {n.ticketNumber ? (
                              <span className="px-1.5 py-0.2 rounded bg-stone-200 text-stone-800 font-bold">
                                #{n.ticketNumber}
                              </span>
                            ) : (
                              <span />
                            )}
                            <span>{n.dateStr || 'Today'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Pill with Profile & Password access */}
              <div className="flex items-center gap-1.5 sm:gap-2.5 pl-2 sm:pl-3 border-l border-stone-200">
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                title="Click to view profile, update photo, or change password"
                  className="min-h-11 min-w-11 flex items-center justify-center md:justify-start gap-2 text-left hover:opacity-85 transition-opacity cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-stone-900 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-emerald-500/40 overflow-hidden relative shadow-xs">
                  {currentUser?.profilePicture ? (
                    <img
                      src={currentUser.profilePicture}
                      alt={currentUser.name}
                      className="w-full h-full object-cover"
                    />
                  ) : currentUser?.name ? (
                    currentUser.name.split(' ').map((w) => w[0]).slice(0, 2).join('')
                  ) : (
                    'SA'
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-left text-xs hidden md:block">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-stone-900 leading-tight group-hover:text-emerald-700 transition-colors">
                      {currentUser?.name || 'Dr. Alexander Reyes'}
                    </p>
                    <KeyRound className="w-3 h-3 text-stone-400 group-hover:text-emerald-600 shrink-0" />
                  </div>
                  <p className="text-[10px] text-stone-500 font-medium">Registrar Officer</p>
                </div>
              </button>

              {/* Logout Button */}
              <button
                id="superadmin-logout-button"
                onClick={logout}
                title="Log out from Registrar console"
                className="ml-1 sm:ml-2 min-h-11 min-w-11 flex items-center justify-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile & Password Modal */}
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />

        {/* Horizontal Navigation Sub-Bar */}
        <div className="bg-stone-50 border-t border-stone-200 px-3 sm:px-6">
          <div className="mobile-nav-scroll max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1.5 sm:py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = superAdminView === item.id;
              return (
                <button
                  key={item.id}
                  id={`superadmin-nav-${item.id}`}
                  onClick={() => setSuperAdminView(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-stone-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-8">
        {superAdminView === 'dashboard' && <SuperAdminDashboard />}
        {superAdminView === 'users' && <UserManagementView />}
        {superAdminView === 'tickets' && <HelpdeskManagementView />}
        {superAdminView === 'students' && <StudentRecordManagementView />}
        {(superAdminView === 'request-history' || superAdminView === 'history') && <OfficerRequestHistoryView />}
        {superAdminView === 'reports' && <ReportsAnalyticsView />}
        {superAdminView === 'announcements' && <AnnouncementsNotificationsView />}
        {superAdminView === 'settings' && <SystemSettingsView />}
        {superAdminView === 'audit-logs' && <AuditLogsView />}
      </main>

      {/* Footer */}
      <footer className="safe-area-bottom bg-white border-t border-stone-200 py-4 px-3 sm:px-4 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 {systemSettings.officeName} • Office of the University Registrar</p>
          <p className="font-mono text-[11px] text-stone-400">
            Node: Secure Campus Cluster 01 • Granular RBAC Active
          </p>
        </div>
      </footer>
    </div>
  );
};
