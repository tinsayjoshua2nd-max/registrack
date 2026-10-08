import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getNotificationsForAccount, markNotificationReadForAccount } from '../utils/studentNotifications';
import { isActiveTicket, isPriorityActionTicket } from '../utils/ticketQueue';
import {
  Announcement,
  AuthenticatedUser,
  ChatMessage,
  FAQItem,
  HelpdeskStats,
  InternalNote,
  StaffMember,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStage,
  TicketStatus,
  UserRole,
  SuperAdminNavView,
  UserAccount,
  AccountStatus,
  StudentProfile,
  SystemRole,
  AuditLog,
  SystemActivityItem,
  RequestCategoryConfig,
  SystemSettings,
  TimelineEvent,
  DeletedRequestRecord,
  CompletedRequestRecord,
  AccountRoleType,
} from '../types';
import {
  INITIAL_FAQS,
} from '../data/mockData';
import {
  INITIAL_ROLES,
  INITIAL_REQUEST_CATEGORIES,
  DEFAULT_SYSTEM_SETTINGS,
} from '../data/superAdminData';

export type StudentNavView =
  | 'track'
  | 'chat'
  | 'announcements'
  | 'faq';

export type AdminNavView =
  | 'dashboard'
  | 'submit-ticket'
  | 'all-requests'
  | 'announcements-manage'
  | 'request-history';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string; // e.g. "Sep 23, 2026 • 08:18:34 AM"
  exactTime: string; // exact time e.g. "08:18:34 AM"
  dateStr: string;   // e.g. "Sep 23, 2026"
  read: boolean;
  ticketNumber?: string;
  type: 'status_update' | 'chat_message' | 'announcement' | 'release_ready';
  audience?: 'student' | 'officer';
  recipientStudentId?: string;
  readByStudentIds?: string[];
}

interface HelpdeskContextType {
  // Authentication
  initializing: boolean;
  startupError: string | null;
  isAuthenticated: boolean;
  currentUser: AuthenticatedUser | null;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginStudent: (studentIdentifier: string, passwordOrStudentId: string, degreeProgram?: string) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (adminName: string, adminPassword: string) => Promise<{ success: boolean; error?: string }>;
  loginSuperAdmin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changeCurrentAccountPassword: (newPassword: string, oldPassword?: string) => Promise<{ success: boolean; error?: string }>;
  updateCurrentProfilePicture: (pictureDataUrl: string) => void;

  role: UserRole;
  setRole: (role: UserRole) => void;
  studentView: StudentNavView;
  setStudentView: (view: StudentNavView) => void;
  adminView: AdminNavView;
  setAdminView: (view: AdminNavView) => void;
  superAdminView: SuperAdminNavView;
  setSuperAdminView: (view: SuperAdminNavView) => void;

  // Active student
  currentStudent: {
    name: string;
    studentId: string;
    email: string;
    degreeProgram: string;
    yearLevel: string;
  };

  // Tickets
  tickets: Ticket[];
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
  activeChatTicket: Ticket | null;
  setActiveChatTicket: (ticket: Ticket | null) => void;

  // Search & Tracking
  trackingTicketNumber: string;
  setTrackingTicketNumber: (num: string) => void;
  trackTicketByNumber: (num: string) => Ticket | null;

  // Actions
  submitNewTicket: (data: Partial<Ticket>) => Promise<Ticket>;
  refreshHelpdeskState: () => Promise<void>;
  updateTicketStatus: (
    ticketId: string,
    status: TicketStatus,
    stage: TicketStage,
    reason?: string,
    actor?: string,
    newAssignee?: string,
    confirmed?: boolean
  ) => Promise<void>;
  passTicketToNextRole: (
    ticketId: string,
    targetStaffName?: string,
    targetStage?: TicketStage,
    customNote?: string,
    actorName?: string
  ) => Promise<void>;
  assignTicketStaff: (ticketId: string, staffName: string) => Promise<void>;
  updateTicketPriority: (ticketId: string, priority: TicketPriority) => Promise<void>;
  updateEstimatedDate: (ticketId: string, newDate: string) => void;
  addInternalNote: (ticketId: string, noteText: string, author?: string) => void;
  sendTicketMessage: (
    ticketId: string,
    message: string,
    role: 'student' | 'registrar',
    senderName: string
  ) => Promise<Ticket>;
  cancelTicket: (ticketId: string, reason?: string) => Promise<void>;
  deleteTicket: (ticketId: string, reason?: string) => Promise<void>;
  restoreDeletedTicket: (recordId: string) => Promise<Ticket>;
  recordCompletedRequest: (ticket: Ticket, notes?: string, customActor?: string) => void;

  // Officer History Feature
  repairTicketStage: (ticketId: string, stage: TicketStage, reason: string) => Promise<void>;
  deletedRequestsHistory: DeletedRequestRecord[];
  completedRequestsHistory: CompletedRequestRecord[];
  getMyDeletedRequests: () => DeletedRequestRecord[];
  getMyCompletedRequests: () => CompletedRequestRecord[];
  officerRole: 'receiver' | 'records_management' | 'evaluator' | 'registrar' | 'superadmin' | 'other';
  isReceiver: boolean;
  isRecordsManagement: boolean;
  isEvaluator: boolean;
  canAccessApplicationForm: boolean;

  // Registrar Officer Management Actions
  users: UserAccount[];
  createUser: (userData: Omit<UserAccount, 'id' | 'createdAt' | 'lastLogin'>) => Promise<void>;
  updateUser: (id: string, updates: Partial<UserAccount>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  resetUserPassword: (id: string) => Promise<string>;

  studentRecords: StudentProfile[];
  addStudentRecord: (student: Omit<StudentProfile, 'id' | 'isArchived' | 'requestCount' | 'joinedDate'>) => { success: boolean; error?: string };
  updateStudentRecord: (id: string, updates: Partial<StudentProfile>) => void;
  archiveStudentRecord: (id: string) => void;
  restoreStudentRecord: (id: string) => void;

  roles: SystemRole[];
  createRole: (roleData: Omit<SystemRole, 'id' | 'userCount' | 'isSystemDefault'>) => void;
  updateRole: (id: string, updates: Partial<SystemRole>) => void;
  deleteRole: (id: string) => void;

  auditLogs: AuditLog[];
  addAuditLog: (action: string, category: AuditLog['category'], details: string, severity?: AuditLog['severity']) => void;

  systemActivities: SystemActivityItem[];
  addSystemActivity: (text: string, actor: string, actionType: SystemActivityItem['actionType'], ticketNumber?: string) => void;

  requestCategories: RequestCategoryConfig[];
  updateRequestCategory: (id: string, updates: Partial<RequestCategoryConfig>) => void;
  addRequestCategory: (cat: Omit<RequestCategoryConfig, 'id'>) => void;
  toggleRequestCategory: (id: string) => void;

  systemSettings: SystemSettings;
  updateSystemSettings: (updates: Partial<SystemSettings>) => void;

  reassignTicket: (ticketId: string, newAssignee: string) => Promise<void>;
  forceCloseTicket: (ticketId: string, reason: string, confirmed?: boolean) => Promise<void>;
  reopenTicket: (ticketId: string, reason: string) => Promise<void>;
  updateTicketPrioritySuperAdmin: (ticketId: string, priority: TicketPriority) => void;

  createSuperAnnouncement: (announcement: Omit<Announcement, 'id' | 'date'>) => void;
  deleteSuperAnnouncement: (id: string) => void;
  broadcastNotification: (title: string, message: string) => void;
  exportSystemBackup: () => string;
  restoreSystemBackup: (jsonContent: string) => Promise<{ success: boolean; error?: string }>;
  archiveCompletedRequests: () => Promise<number>;

  // Staff, FAQ & Announcements
  staffList: StaffMember[];
  faqs: FAQItem[];
  announcements: Announcement[];

  // Stats
  stats: HelpdeskStats;

  // Notifications
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  unreadCount: number;

}

const HelpdeskContext = createContext<HelpdeskContextType | undefined>(undefined);

const LEGACY_KEYS = [
  'registrack_portal_tickets_v2', 'registrack_portal_notifications_v2', 'registrack_auth_session_v2',
  'registrack_users_v2', 'registrack_students_v2', 'registrack_deleted_accounts_v2',
  'registrack_roles_v2', 'registrack_audit_logs_v2', 'registrack_activities_v2',
  'registrack_categories_v2', 'registrack_settings_v2', 'registrack_announcements_v2',
  'registrack_deleted_requests_history_v2', 'registrack_completed_requests_history_v2',
];
type StateResourceKey =
  | 'tickets'
  | 'notifications'
  | 'studentRecords'
  | 'roles'
  | 'auditLogs'
  | 'systemActivities'
  | 'requestCategories'
  | 'systemSettings'
  | 'announcements'
  | 'deletedRequestsHistory'
  | 'completedRequestsHistory';
const STATE_RESOURCE_KEYS: StateResourceKey[] = [
  'tickets',
  'notifications',
  'studentRecords',
  'roles',
  'auditLogs',
  'systemActivities',
  'requestCategories',
  'systemSettings',
  'announcements',
  'deletedRequestsHistory',
  'completedRequestsHistory',
];
const serializeState = (value: unknown): string => JSON.stringify(value);
const identityForAccount = (user: AuthenticatedUser | null): string => {
  if (!user) return '';
  const id = (user as AuthenticatedUser & { id?: string }).id;
  return id || user.email || `${user.role}:${user.studentId || user.name}`;
};

let pendingMutations = 0;
let lastMutationAt = 0;
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const mutation = options?.method && options.method !== 'GET';
  if (mutation) { pendingMutations++; lastMutationAt = Date.now(); }
  try {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || 'Request failed. Please try again.') as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    return result as T;
  } finally {
    if (mutation) { pendingMutations--; lastMutationAt = Date.now(); }
  }
}

let idCounter = 0;
const generateUniqueId = (prefix: string): string => {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}-${Math.random().toString(36).substring(2, 7)}`;
};

export const formatRealtimeArrival = (dateObj: Date = new Date()) => {
  const exactTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const dateStr = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return {
    exactTime,
    dateStr,
    timestamp: `${dateStr} • ${exactTime}`,
  };
};

export const HelpdeskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [stateReady, setStateReady] = useState(false);
  const accountGenerationRef = useRef(0);
  const accountIdentityRef = useRef('');
  const stateVersionsRef = useRef<Record<string, number>>({});
  const stateBaselinesRef = useRef<Record<string, string>>({});
  const stateSavesInFlightRef = useRef<Set<string>>(new Set());
  const queuedStateSavesRef = useRef<Record<string, {
    payload: unknown;
    serialized: string;
    generation: number;
    identity: string;
  }>>({});
  const conflictedResourcesRef = useRef<Set<string>>(new Set());

  const [users, setUsers] = useState<UserAccount[]>([]);

  const [studentRecords, setStudentRecords] = useState<StudentProfile[]>([]);

  const [role, setRole] = useState<UserRole>(() => currentUser?.role || 'student');
  const [studentView, setStudentView] = useState<StudentNavView>('track');
  const [adminView, setAdminView] = useState<AdminNavView>('dashboard');
  const [superAdminView, setSuperAdminView] = useState<SuperAdminNavView>('dashboard');

  const isAuthenticated = currentUser !== null;

  const currentStudent = {
    name: currentUser?.role === 'student' ? currentUser.name : '',
    studentId: currentUser?.role === 'student' ? currentUser.studentId || '' : '',
    email: currentUser?.role === 'student' ? currentUser.email || '' : '',
    degreeProgram: currentUser?.role === 'student' ? currentUser.degreeProgram || '' : '',
    yearLevel: currentUser?.role === 'student' ? currentUser.yearLevel || '' : '',
  };

  const hydrateAccount = async (authenticated: AuthenticatedUser, generation: number) => {
    const { user, state } = await api<{ user: AuthenticatedUser; state: Record<string, unknown> }>('/api/bootstrap');
    if (generation !== accountGenerationRef.current) return;
    const account = user || authenticated;
    const identity = identityForAccount(account);
    if (stateReady && currentUser && accountIdentityRef.current === identity) {
      setCurrentUser(account);
      setRole(account.role);
      applyServerSnapshot(state, generation);
      return;
    }
    accountIdentityRef.current = identity;
    const resources: Record<StateResourceKey, unknown> = {
      tickets: Array.isArray(state.tickets) ? state.tickets : [],
      notifications: Array.isArray(state.notifications) ? state.notifications : [],
      studentRecords: Array.isArray(state.studentRecords) ? state.studentRecords : [],
      roles: Array.isArray(state.roles) ? state.roles : INITIAL_ROLES,
      auditLogs: Array.isArray(state.auditLogs) ? state.auditLogs : [],
      systemActivities: Array.isArray(state.systemActivities) ? state.systemActivities : [],
      requestCategories: Array.isArray(state.requestCategories) ? state.requestCategories : INITIAL_REQUEST_CATEGORIES,
      systemSettings: state.systemSettings && typeof state.systemSettings === 'object' ? state.systemSettings : DEFAULT_SYSTEM_SETTINGS,
      announcements: Array.isArray(state.announcements) ? state.announcements : [],
      deletedRequestsHistory: Array.isArray(state.deletedRequestsHistory) ? state.deletedRequestsHistory : [],
      completedRequestsHistory: Array.isArray(state.completedRequestsHistory) ? state.completedRequestsHistory : [],
    };
    const versions = state._versions && typeof state._versions === 'object'
      ? state._versions as Record<string, number>
      : {};
    stateBaselinesRef.current = {};
    stateVersionsRef.current = {};
    conflictedResourcesRef.current.clear();
    STATE_RESOURCE_KEYS.forEach((key) => {
      stateBaselinesRef.current[key] = serializeState(resources[key]);
      stateVersionsRef.current[key] = Number.isInteger(versions[key]) ? versions[key] : 0;
    });
    setCurrentUser(account);
    setRole(account.role);
    if (account.role === 'student') setStudentView('track');
    if (account.role === 'admin') setAdminView('dashboard');
    if (account.role === 'superadmin') setSuperAdminView('dashboard');
    setTickets(resources.tickets as Ticket[]);
    setUsers(Array.isArray(state.users) ? state.users.map((account) => {
      const safeAccount = { ...(account as UserAccount) };
      delete safeAccount.password;
      return safeAccount;
    }) : []);
    setStudentRecords(resources.studentRecords as StudentProfile[]);
    setRoles(resources.roles as SystemRole[]);
    setAuditLogs(resources.auditLogs as AuditLog[]);
    setSystemActivities(resources.systemActivities as SystemActivityItem[]);
    setRequestCategories(resources.requestCategories as RequestCategoryConfig[]);
    setSystemSettings(resources.systemSettings as SystemSettings);
    setAnnouncements(resources.announcements as Announcement[]);
    setDeletedRequestsHistory(resources.deletedRequestsHistory as DeletedRequestRecord[]);
    setCompletedRequestsHistory(resources.completedRequestsHistory as CompletedRequestRecord[]);
    setNotifications(resources.notifications as AppNotification[]);
    setStateReady(true);
  };

  useEffect(() => {
    const generation = ++accountGenerationRef.current;
    let cancelled = false;
    const handleSaveError = (event: Event) => setStartupError(`Your latest changes could not be saved: ${(event as CustomEvent<string>).detail} Retry the connection before continuing.`);
    window.addEventListener('registrack-save-error', handleSaveError);
    try {
      [...LEGACY_KEYS, ...Object.keys(localStorage).filter(key => key.startsWith('registrack_'))]
        .forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error('Unable to clear legacy browser data:', error);
    }

    api<{ user: AuthenticatedUser | null }>('/api/session')
      .then(({ user }) => {
        if (cancelled || generation !== accountGenerationRef.current) return;
        if (user) return hydrateAccount(user, generation);
        accountIdentityRef.current = '';
        stateBaselinesRef.current = {};
        stateVersionsRef.current = {};
        setStateReady(true);
      })
      .catch((error: Error) => {
        if (!cancelled && generation === accountGenerationRef.current) setStartupError(error.message);
      })
      .finally(() => {
        if (!cancelled && generation === accountGenerationRef.current) setInitializing(false);
      });
    return () => {
      cancelled = true;
      window.removeEventListener('registrack-save-error', handleSaveError);
    };
  }, []);

  const performLogin = async (
    requestedRole: 'auto' | 'student' | 'admin' | 'superadmin',
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!identifier.trim() || !password) return { success: false, error: 'Enter your username and password.' };
    const generation = ++accountGenerationRef.current;
    accountIdentityRef.current = '';
    setStateReady(false);
    try {
      const { user } = await api<{ user: AuthenticatedUser }>('/api/login', {
        method: 'POST',
        body: JSON.stringify({
          ...(requestedRole === 'auto' ? {} : { role: requestedRole }),
          identifier: identifier.trim(), password,
        }),
      });
      if (generation !== accountGenerationRef.current) return { success: false, error: 'Your session changed before sign-in completed.' };
      await hydrateAccount(user, generation);
      setStartupError(null);
      return { success: true };
    } catch (error) {
      if (generation === accountGenerationRef.current) setStateReady(true);
      return { success: false, error: error instanceof Error ? error.message : 'Unable to sign in.' };
    }
  };

  const login = (identifier: string, password: string) => performLogin('auto', identifier, password);
  const loginStudent = (identifier: string, password: string) => performLogin('student', identifier, password);
  const loginAdmin = (identifier: string, password: string) => performLogin('admin', identifier, password);
  const loginSuperAdmin = (identifier: string, password: string) => performLogin('superadmin', identifier, password);

  const logout = async () => {
    ++accountGenerationRef.current;
    accountIdentityRef.current = '';
    stateBaselinesRef.current = {};
    stateVersionsRef.current = {};
    conflictedResourcesRef.current.clear();
    queuedStateSavesRef.current = {};
    setCurrentUser(null);
    setStateReady(false);
    try {
      await api('/api/logout', { method: 'POST' });
    } catch (error) {
      console.error('Unable to end server session:', error);
    }
    setCurrentUser(null);
    setRole('student');
    setStudentView('track');
    setTickets([]);
    setUsers([]);
    setStudentRecords([]);
    setNotifications([]);
    setAnnouncements([]);
    setAuditLogs([]);
    setSystemActivities([]);
    setDeletedRequestsHistory([]);
    setCompletedRequestsHistory([]);
    setRoles(INITIAL_ROLES);
    setRequestCategories(INITIAL_REQUEST_CATEGORIES);
    setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
    setSelectedTicket(null);
    setActiveChatTicket(null);
    setTrackingTicketNumber('');
    setStateReady(false);
  };

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const staffList: StaffMember[] = users
    .filter((user) => user.role !== 'student' && user.role !== 'superadmin' && user.status === 'active')
    .map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role.replaceAll('_', ' '),
      office: user.departmentOrOffice,
      email: user.email,
      activeTicketsCount: tickets.filter(
        (ticket) => ticket.assignedTo.trim().toLowerCase() === user.name.trim().toLowerCase() && isActiveTicket(ticket)
      ).length,
    }));

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeChatTicket, setActiveChatTicket] = useState<Ticket | null>(null);
  const [trackingTicketNumber, setTrackingTicketNumber] = useState<string>('');

  const [faqs] = useState<FAQItem[]>(INITIAL_FAQS);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>(INITIAL_ROLES);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemActivities, setSystemActivities] = useState<SystemActivityItem[]>([]);
  const [requestCategories, setRequestCategories] = useState<RequestCategoryConfig[]>(INITIAL_REQUEST_CATEGORIES);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [deletedRequestsHistory, setDeletedRequestsHistory] = useState<DeletedRequestRecord[]>([]);
  const [completedRequestsHistory, setCompletedRequestsHistory] = useState<CompletedRequestRecord[]>([]);

  const [allNotifications, setNotifications] = useState<AppNotification[]>([]);
  const latestResourcesRef = useRef<Record<StateResourceKey, unknown>>({
    tickets,
    notifications: allNotifications,
    studentRecords,
    roles,
    auditLogs,
    systemActivities,
    requestCategories,
    systemSettings,
    announcements,
    deletedRequestsHistory,
    completedRequestsHistory,
  });
  latestResourcesRef.current = {
    tickets,
    notifications: allNotifications,
    studentRecords,
    roles,
    auditLogs,
    systemActivities,
    requestCategories,
    systemSettings,
    announcements,
    deletedRequestsHistory,
    completedRequestsHistory,
  };

  const setStateResource = (key: StateResourceKey, value: unknown) => {
    switch (key) {
      case 'tickets': setTickets(value as Ticket[]); break;
      case 'notifications': setNotifications(value as AppNotification[]); break;
      case 'studentRecords': setStudentRecords(value as StudentProfile[]); break;
      case 'roles': setRoles(value as SystemRole[]); break;
      case 'auditLogs': setAuditLogs(value as AuditLog[]); break;
      case 'systemActivities': setSystemActivities(value as SystemActivityItem[]); break;
      case 'requestCategories': setRequestCategories(value as RequestCategoryConfig[]); break;
      case 'systemSettings': setSystemSettings(value as SystemSettings); break;
      case 'announcements': setAnnouncements(value as Announcement[]); break;
      case 'deletedRequestsHistory': setDeletedRequestsHistory(value as DeletedRequestRecord[]); break;
      case 'completedRequestsHistory': setCompletedRequestsHistory(value as CompletedRequestRecord[]); break;
    }
  };

  const reportResourceConflict = (key: StateResourceKey) => {
    conflictedResourcesRef.current.add(key);
    delete queuedStateSavesRef.current[key];
    const message = `${key} changed on the server while you were editing. Your local changes were kept; reload the page before editing this data again.`;
    setStartupError(message);
    window.dispatchEvent(new CustomEvent('registrack-save-error', { detail: message }));
  };

  const drainStateSaves = (key: StateResourceKey) => {
    if (stateSavesInFlightRef.current.has(key)) return;
    stateSavesInFlightRef.current.add(key);
    void (async () => {
      try {
        while (true) {
          const job = queuedStateSavesRef.current[key];
          if (!job) break;
          delete queuedStateSavesRef.current[key];
          if (
            job.generation !== accountGenerationRef.current ||
            job.identity !== accountIdentityRef.current ||
            conflictedResourcesRef.current.has(key)
          ) continue;
          if (job.serialized === stateBaselinesRef.current[key]) continue;

          try {
            const result = await api<{ payload: unknown; version: number }>(`/api/state/${key}`, {
              method: 'PUT',
              body: JSON.stringify({ payload: job.payload, version: stateVersionsRef.current[key] ?? 0 }),
            });
            if (
              job.generation !== accountGenerationRef.current ||
              job.identity !== accountIdentityRef.current
            ) continue;
            if (!Number.isInteger(result.version) || result.payload === undefined) {
              throw new Error(`The server returned an invalid save acknowledgement for ${key}.`);
            }
            stateVersionsRef.current[key] = result.version;
            stateBaselinesRef.current[key] = serializeState(result.payload);
            if (serializeState(latestResourcesRef.current[key]) === job.serialized) {
              setStateResource(key, result.payload);
            }
          } catch (error) {
            if (
              job.generation !== accountGenerationRef.current ||
              job.identity !== accountIdentityRef.current
            ) continue;
            if ((error as Error & { status?: number }).status === 409) {
              reportResourceConflict(key);
            } else {
              window.dispatchEvent(new CustomEvent('registrack-save-error', {
                detail: error instanceof Error ? error.message : 'Connection failed.',
              }));
            }
            break;
          }
        }
      } finally {
        stateSavesInFlightRef.current.delete(key);
        if (
          queuedStateSavesRef.current[key] &&
          !conflictedResourcesRef.current.has(key)
        ) drainStateSaves(key);
      }
    })();
  };

  const saveStateResource = (key: StateResourceKey, payload: unknown) => {
    if (!stateReady || !currentUser || !accountIdentityRef.current) return;
    if (currentUser.role === 'student' && key !== 'tickets' && key !== 'notifications') return;
    if (currentUser.role !== 'superadmin' && ['studentRecords', 'roles', 'requestCategories', 'systemSettings'].includes(key)) return;
    const serialized = serializeState(payload);
    if (serialized === stateBaselinesRef.current[key] || conflictedResourcesRef.current.has(key)) return;
    queuedStateSavesRef.current[key] = {
      payload,
      serialized,
      generation: accountGenerationRef.current,
      identity: accountIdentityRef.current,
    };
    drainStateSaves(key);
  };

  const flushStateResource = async (key: StateResourceKey) => {
    const payload = latestResourcesRef.current[key];
    const serialized = serializeState(payload);
    if (serialized !== stateBaselinesRef.current[key]) saveStateResource(key, payload);
    const deadline = Date.now() + 15000;
    while (stateSavesInFlightRef.current.has(key) || queuedStateSavesRef.current[key]) {
      if (Date.now() > deadline) throw new Error(`Saving ${key} timed out. Please retry.`);
      await new Promise((resolve) => window.setTimeout(resolve, 25));
    }
    if (conflictedResourcesRef.current.has(key)) {
      throw new Error(`${key} changed on the server. Reload the page before continuing.`);
    }
    if (serializeState(latestResourcesRef.current[key]) !== stateBaselinesRef.current[key]) {
      throw new Error(`${key} still has unsaved changes. Restore the connection and retry before continuing.`);
    }
  };

  const applyServerSnapshot = (state: Record<string, unknown>, generation: number) => {
    if (generation !== accountGenerationRef.current) return;
    const versions = state._versions && typeof state._versions === 'object'
      ? state._versions as Record<string, number>
      : {};
    for (const key of STATE_RESOURCE_KEYS) {
      const serverValue = state[key];
      if (serverValue === undefined) continue;
      const serverSerialized = serializeState(serverValue);
      const serverVersion = Number.isInteger(versions[key]) ? versions[key] : 0;
      const localValue = latestResourcesRef.current[key];
      const localSerialized = serializeState(localValue);
      const baseline = stateBaselinesRef.current[key];
      const isDirty = baseline !== undefined && localSerialized !== baseline;

      if (isDirty) {
        if (serverSerialized !== baseline) {
          reportResourceConflict(key);
        } else {
          stateVersionsRef.current[key] = serverVersion;
          saveStateResource(key, localValue);
        }
        continue;
      }
      stateVersionsRef.current[key] = serverVersion;
      stateBaselinesRef.current[key] = serverSerialized;
      conflictedResourcesRef.current.delete(key);
      if (localSerialized !== serverSerialized) setStateResource(key, serverValue);
    }

    if (Array.isArray(state.users)) {
      const safeUsers = state.users.map((account) => {
        const safeAccount = { ...(account as UserAccount) };
        delete safeAccount.password;
        return safeAccount;
      });
      setUsers((previous) => serializeState(previous) === serializeState(safeUsers) ? previous : safeUsers);
    }
  };

  const refreshServerState = async (generation: number) => {
    const state = await api<Record<string, unknown>>('/api/state');
    if (generation !== accountGenerationRef.current) return;
    applyServerSnapshot(state, generation);
  };

  useEffect(() => { saveStateResource('deletedRequestsHistory', deletedRequestsHistory); }, [deletedRequestsHistory, stateReady, currentUser]);
  useEffect(() => { saveStateResource('completedRequestsHistory', completedRequestsHistory); }, [completedRequestsHistory, stateReady, currentUser]);
  useEffect(() => {
    if (currentUser?.role === 'superadmin') saveStateResource('studentRecords', studentRecords);
  }, [studentRecords, stateReady, currentUser]);
  useEffect(() => {
    if (currentUser?.role === 'superadmin') saveStateResource('roles', roles);
  }, [roles, stateReady, currentUser]);
  useEffect(() => { saveStateResource('auditLogs', auditLogs); }, [auditLogs, stateReady, currentUser]);
  useEffect(() => { saveStateResource('systemActivities', systemActivities); }, [systemActivities, stateReady, currentUser]);
  useEffect(() => {
    if (currentUser?.role === 'superadmin') saveStateResource('requestCategories', requestCategories);
  }, [requestCategories, stateReady, currentUser]);
  useEffect(() => {
    if (currentUser?.role === 'superadmin') saveStateResource('systemSettings', systemSettings);
  }, [systemSettings, stateReady, currentUser]);
  useEffect(() => { saveStateResource('announcements', announcements); }, [announcements, stateReady, currentUser]);
  useEffect(() => { saveStateResource('tickets', tickets); }, [tickets, stateReady, currentUser]);
  useEffect(() => { saveStateResource('notifications', allNotifications); }, [allNotifications, stateReady, currentUser]);

  useEffect(() => {
    if (!stateReady || !currentUser) return;
    let cancelled = false;
    const generation = accountGenerationRef.current;
    const identity = accountIdentityRef.current;
    const interval = window.setInterval(async () => {
      if (document.hidden || pendingMutations || Date.now() - lastMutationAt < 1000) return;
      const startedAt = Date.now();
      try {
        const state = await api<Record<string, unknown>>('/api/state');
        if (
          cancelled ||
          generation !== accountGenerationRef.current ||
          identity !== accountIdentityRef.current ||
          pendingMutations ||
          lastMutationAt >= startedAt
        ) return;
        applyServerSnapshot(state, generation);
      } catch (error) {
        if (!cancelled && generation === accountGenerationRef.current) {
          setStartupError(error instanceof Error ? error.message : 'Unable to refresh saved records.');
        }
      }
    }, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [stateReady, currentUser]);

  // Keep selectedTicket & activeChatTicket in sync if tickets change
  useEffect(() => {
    if (selectedTicket) {
      const fresh = tickets.find((t) => t.id === selectedTicket.id);
      if (fresh) setSelectedTicket(fresh);
    }
    if (activeChatTicket) {
      const fresh = tickets.find((t) => t.id === activeChatTicket.id);
      if (fresh) setActiveChatTicket(fresh);
    }
  }, [tickets]);

  const trackTicketByNumber = (num: string): Ticket | null => {
    const clean = num.trim().toUpperCase();
    const found = tickets.find(
      (t) =>
        t.ticketNumber.toUpperCase() === clean ||
        t.ticketNumber.replace(/-/g, '').toUpperCase() === clean.replace(/-/g, '')
    );
    return found || null;
  };

  const submitNewTicket = async (data: Partial<Ticket>): Promise<Ticket> => {
    if (currentUser?.role === 'student') {
      throw new Error('Student accounts can track requests but cannot submit new requests.');
    }
    const year = new Date().getFullYear();
    const ticketNumber = `REG-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const now = new Date();
    const formattedNow = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const categoryConfig = requestCategories.find(
      (category) => category.name === data.category || category.code === data.category
    );
    let estDateString = 'To be advised by the Registrar';
    if (categoryConfig && categoryConfig.turnaroundDays > 0) {
      const estimate = new Date();
      estimate.setDate(estimate.getDate() + categoryConfig.turnaroundDays);
      estDateString = estimate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    // Keep explicit staff choices; otherwise let the server apply routing and capacity.
    const defaultAssigned = data.assignedTo?.trim() || 'Unassigned';
    const defaultLocation = systemSettings.schoolAddress || systemSettings.officeName || '';

    const newTicket: Ticket = {
      id: generateUniqueId('ticket'),
      ticketNumber,
      studentName: data.studentName || currentStudent.name,
      studentId: data.studentId || currentStudent.studentId,
      email: data.email || currentStudent.email,
      phone: data.phone || '',
      degreeProgram: data.degreeProgram || currentStudent.degreeProgram,
      yearLevel: data.yearLevel || currentStudent.yearLevel,
      category: data.category || 'Other',
      documentType: data.documentType || 'None',
      copies: data.copies || 1,
      purpose: data.purpose || '',
      deliveryOption: data.deliveryOption || 'Office Pick-up',
      subject: data.subject || `${data.category} Concern`,
      description: data.description || '',
      status: 'pending',
      stage: 'submitted',
      priority: data.priority || 'Normal',
      assignedTo: defaultAssigned,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedReleaseDate: estDateString,
      releaseLocation: defaultLocation,
      claimingRequirements: categoryConfig?.requiredDocuments || [],
      messages: [],
      internalNotes: [],
      timelineHistory: [
        {
          stage: 'submitted',
          title: 'Request Submitted Online',
          timestamp: formattedNow,
          notes: 'Request received by the Registrar.',
          actor: `${data.studentName || currentStudent.name} (Student)`,
          isPassed: true,
          isCurrent: true,
        },
        {
          stage: 'processing',
          title: 'Processing',
          timestamp: 'Upcoming step',
          notes: 'The Registrar will update this request when processing begins.',
          actor: defaultAssigned,
        },
        {
          stage: 'for_seal',
          title: 'For University Seal',
          timestamp: 'Upcoming step',
          notes: 'The Registrar will update this request when this stage begins.',
          actor: 'Registrar Office',
        },
        {
          stage: 'ready',
          title: 'Ready for Claiming',
          timestamp: 'Upcoming step',
          notes: 'The Registrar will provide release instructions when the request is ready.',
          actor: 'Registrar Office',
        },
        {
          stage: 'completed',
          title: 'Completed',
          timestamp: 'Upcoming step',
          notes: 'The request will be closed after completion.',
          actor: 'Registrar Office',
        },
      ],
    };

    const generation = accountGenerationRef.current;
    const identity = accountIdentityRef.current;
    await flushStateResource('tickets');
    await flushStateResource('notifications');
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) {
      throw new Error('Your session changed before the request could be submitted. Please sign in again.');
    }
    const { ticket: savedTicket } = await api<{ ticket: Ticket }>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({ ticket: newTicket }),
    });
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) {
      throw new Error('Your session changed before the request could be confirmed. Check your request list before retrying.');
    }

    // Record audit log & system activity
    addAuditLog(
      'TICKET_SUBMITTED',
      'Ticket',
      `Request submitted by ${savedTicket.studentName} (ID: ${savedTicket.studentId}, Ticket: #${savedTicket.ticketNumber}, Category: ${savedTicket.category}).`,
      'info'
    );
    addSystemActivity(
      `Request #${savedTicket.ticketNumber} received for ${savedTicket.studentName}`,
      currentUser?.name || 'Registrar',
      'assignment',
      savedTicket.ticketNumber
    );

    try {
      await refreshServerState(generation);
    } catch (error) {
      const refreshedTickets = [
        savedTicket,
        ...(latestResourcesRef.current.tickets as Ticket[]).filter(
          (ticket) => ticket.id !== savedTicket.id && ticket.ticketNumber !== savedTicket.ticketNumber
        ),
      ];
      stateBaselinesRef.current.tickets = serializeState(refreshedTickets);
      setTickets(refreshedTickets);
      setStartupError(`Request ${savedTicket.ticketNumber} was submitted, but the latest shared state could not be refreshed. ${error instanceof Error ? error.message : ''}`.trim());
    }
    return savedTicket;
  };

  const runTicketWorkflow = async (ticketId: string, input: Record<string, unknown>): Promise<void> => {
    const generation = accountGenerationRef.current;
    const identity = accountIdentityRef.current;
    await flushStateResource('tickets');
    await flushStateResource('notifications');
    await flushStateResource('completedRequestsHistory');
    await flushStateResource('auditLogs');
    const ticket = (latestResourcesRef.current.tickets as Ticket[]).find(item => item.id === ticketId);
    if (!ticket) throw new Error('This request is no longer available.');
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) {
      throw new Error('Your session changed. Sign in again before continuing.');
    }
    try {
      await api(`/api/tickets/${encodeURIComponent(ticketId)}/workflow`, {
        method: 'POST',
        body: JSON.stringify({ ...input, expectedUpdatedAt: ticket.updatedAt || '', operationId: generateUniqueId('workflow') }),
      });
    } catch (error) {
      await refreshServerState(generation).catch(() => undefined);
      throw error;
    }
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) return;
    await refreshServerState(generation);
  };

  const updateTicketStatus = async (
    ticketId: string,
    status: TicketStatus,
    stage: TicketStage,
    reason?: string,
    actor: string = 'Registrar Staff',
    newAssignee?: string,
    confirmed = false
  ) => {
    if (stage === 'completed' && status !== 'rejected' && !confirmed) {
      throw new Error('Confirm the document has been claimed before completing this request.');
    }
    const workflowInput: Record<string, unknown> = {
      action: status === 'rejected' ? 'reject' : 'stage',
      targetStage: stage === 'reviewed' ? 'processing' : stage,
      notes: reason, assignedTo: newAssignee,
    };
    if (stage === 'completed' && status !== 'rejected') workflowInput.confirmed = true;
    await runTicketWorkflow(ticketId, workflowInput);
  };

  const repairTicketStage = async (ticketId: string, stage: TicketStage, reason: string) =>
    runTicketWorkflow(ticketId, { action: 'repair', targetStage: stage, notes: reason });

  const passTicketToNextRole = async (
    ticketId: string,
    targetStaffName?: string,
    targetStage?: TicketStage,
    customNote?: string,
    actorName?: string
  ) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('This request is no longer available.');

    const actor = actorName || currentUser?.name || 'Registrar';

    // Determine current role based on who is currently assigned
    const currentAssigneeUser = users.find(
      (user) => user.name.toLowerCase() === ticket.assignedTo.toLowerCase()
    );
    const currentRole = currentAssigneeUser?.role || ticket.assignedRole || currentUser?.staffRole;

    let nextStaffName = targetStaffName;
    let nextStage: TicketStage | undefined = targetStage;
    let autoNote = customNote;

    if (!nextStaffName) {
      let nextRole: AccountRoleType | undefined;
      if (currentRole === 'receiver') {
        nextRole = 'records_management';
        if (ticket.stage === 'submitted') {
          nextStage = 'processing';
        }
      } else if (currentRole === 'records_management') {
        nextRole = 'receiver';
        if (ticket.stage === 'processing') {
          nextStage = 'for_seal';
        }
      } else if (currentRole === 'evaluator') {
        nextRole = 'receiver';
        if (ticket.stage === 'processing' || ticket.stage === 'for_seal') {
          nextStage = 'for_seal';
        }
      }
      const nextUser = nextRole && users.find((user) => user.role === nextRole && user.status === 'active');
      if (!nextUser) {
        throw new Error(`No active ${nextRole?.replace('_', ' ') || 'staff'} account exists.`);
      }
      nextStaffName = nextUser.name;
      autoNote = autoNote || `Request handed off by ${actor} to ${nextUser.name}.`;
    }

    const matchedNextUser = users.find(
      (user) => user.name.toLowerCase() === nextStaffName?.toLowerCase() && user.status === 'active'
    );
    if (!matchedNextUser) {
      throw new Error('Select an active staff account.');
    }
    const finalStaffName = matchedNextUser.name;
    await runTicketWorkflow(ticketId, {
      action: 'handoff', targetStage: nextStage, assignedTo: finalStaffName, notes: autoNote,
    });
  };

  const getOfficerRole = (user: AuthenticatedUser | null): 'receiver' | 'records_management' | 'evaluator' | 'registrar' | 'superadmin' | 'other' => {
    if (!user) return 'other';
    if (user.role === 'superadmin') return 'superadmin';
    if (user.staffRole === 'receiver' || user.staffRole === 'records_management' || user.staffRole === 'evaluator') {
      return user.staffRole;
    }
    return 'registrar';
  };

  const officerRole = getOfficerRole(currentUser);
  const isReceiver = officerRole === 'receiver';
  const isRecordsManagement = officerRole === 'records_management';
  const isEvaluator = officerRole === 'evaluator';
  const canAccessApplicationForm = isReceiver || currentUser?.role === 'superadmin';

  const deleteTicket = async (ticketId: string, reason: string = 'Removed by Registrar staff'): Promise<void> => {
    const target = tickets.find((t) => t.id === ticketId);
    if (!target) return;

    const generation = accountGenerationRef.current;
    const identity = accountIdentityRef.current;
    await flushStateResource('tickets');
    await flushStateResource('deletedRequestsHistory');
    await flushStateResource('notifications');
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) {
      throw new Error('Your session changed before this request could be removed. Please try again.');
    }
    await api<{ ok: true }>(`/api/tickets/${encodeURIComponent(ticketId)}/delete`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) {
      throw new Error('The request was removed, but your session changed before the result could be refreshed. Reload the request history to verify it.');
    }
    const currentOfficerRole = getOfficerRole(currentUser);
    const officerName = currentUser?.name || 'Registrar Staff';

    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(null);
    }
    if (activeChatTicket?.id === ticketId) {
      setActiveChatTicket(null);
    }

    addAuditLog(
      'TICKET_DELETED',
      'Ticket',
      `Document request #${target.ticketNumber} for student ${target.studentName} (${target.documentType || target.category}) was deleted by ${officerName} (${currentOfficerRole}). Reason: ${reason}`,
      'warning'
    );
    addSystemActivity(
      `Request #${target.ticketNumber} deleted by ${officerName}`,
      officerName,
      'status_change',
      target.ticketNumber
    );

    try {
      await refreshServerState(generation);
    } catch (error) {
      const remainingTickets = (latestResourcesRef.current.tickets as Ticket[]).filter((ticket) => ticket.id !== ticketId);
      stateBaselinesRef.current.tickets = serializeState(remainingTickets);
      setTickets(remainingTickets);
      setStartupError(`Request ${target.ticketNumber} was removed, but the latest shared state could not be refreshed. ${error instanceof Error ? error.message : ''}`.trim());
    }
  };

  const cancelTicket = async (ticketId: string, reason?: string): Promise<void> => {
    await deleteTicket(ticketId, reason);
  };

  const restoreDeletedTicket = async (recordId: string): Promise<Ticket> => {
    const record = deletedRequestsHistory.find((r) => r.id === recordId);
    if (!record) throw new Error('Deleted request was not found. Refresh the request history and try again.');
    const generation = accountGenerationRef.current;
    const identity = accountIdentityRef.current;
    await flushStateResource('tickets');
    await flushStateResource('deletedRequestsHistory');
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) {
      throw new Error('Your session changed before this request could be restored. Please try again.');
    }
    const { ticket: restoredTicket } = await api<{ ticket: Ticket }>(
      `/api/tickets/${encodeURIComponent(recordId)}/restore`,
      { method: 'POST' }
    );
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) {
      throw new Error('The request was restored, but your session changed before the result could be refreshed. Reload the request history to verify it.');
    }

    addAuditLog(
      'TICKET_RESTORED',
      'Ticket',
      `Document request #${restoredTicket.ticketNumber} was restored to active queue from Deleted Request History by ${currentUser?.name || 'Staff'}.`,
      'info'
    );
    try {
      await refreshServerState(generation);
    } catch (error) {
      const restoredTickets = [
        restoredTicket,
        ...(latestResourcesRef.current.tickets as Ticket[]).filter((ticket) => ticket.id !== restoredTicket.id),
      ];
      stateBaselinesRef.current.tickets = serializeState(restoredTickets);
      setTickets(restoredTickets);
      setStartupError(`Request ${restoredTicket.ticketNumber} was restored, but the latest shared state could not be refreshed. ${error instanceof Error ? error.message : ''}`.trim());
    }
    return restoredTicket;
  };

  const recordCompletedRequest = (ticket: Ticket, notes?: string, customActor?: string) => {
    const arrival = formatRealtimeArrival();
    const officerName = customActor || currentUser?.name || ticket.assignedTo || 'Registrar Staff';
    const currentOfficerRole = getOfficerRole(currentUser);

    const completedRecord: CompletedRequestRecord = {
      id: generateUniqueId('comp-req'),
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      studentName: ticket.studentName,
      studentId: ticket.studentId,
      email: ticket.email,
      phone: ticket.phone,
      degreeProgram: ticket.degreeProgram,
      yearLevel: ticket.yearLevel,
      category: ticket.category,
      documentType: ticket.documentType,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority,
      completedAt: new Date().toISOString(),
      completedAtFormatted: `${arrival.dateStr} • ${arrival.exactTime}`,
      completedByOfficerName: officerName,
      completedByOfficerRole: currentOfficerRole,
      completedByOfficerEmail: currentUser?.email,
      releaseDate: ticket.actualReleaseDate || arrival.dateStr,
      releaseLocation: ticket.releaseLocation || 'Registrar Counter Window',
      notes: notes || 'Document claimed by student; transaction complete.',
      ticketSnapshot: { ...ticket, status: 'completed', stage: 'completed' },
    };

    setCompletedRequestsHistory((prev) => {
      const exists = prev.some((c) => c.ticketNumber === ticket.ticketNumber);
      if (exists) return prev;
      return [completedRecord, ...prev];
    });
  };

  const getMyDeletedRequests = () => {
    if (!currentUser) return [];
    const myName = (currentUser.name || '').toLowerCase();
    const myRole = getOfficerRole(currentUser);
    const myEmail = (currentUser.email || '').toLowerCase();

    // Registrar Officers can review full system deletion records
    if (currentUser.role === 'superadmin' || currentUser.staffRole === 'registrar' || myRole === 'superadmin' || myRole === 'registrar') {
      return deletedRequestsHistory;
    }

    return deletedRequestsHistory.filter((rec) => {
      const recName = (rec.deletedByOfficerName || '').toLowerCase();
      const recRole = (rec.deletedByOfficerRole || '').toLowerCase();
      const recEmail = (rec.deletedByOfficerEmail || '').toLowerCase();

      // Check email match
      if (myEmail && recEmail && myEmail === recEmail) {
        return true;
      }

      // Check name match
      if (recName && myName && (recName === myName || recName.includes(myName) || myName.includes(recName))) {
        return true;
      }

      // Check role partition match
      if (myRole === 'receiver' && recRole === 'receiver') return true;
      if (myRole === 'records_management' && recRole === 'records_management') return true;
      if (myRole === 'evaluator' && recRole === 'evaluator') return true;

      return false;
    });
  };

  const getMyCompletedRequests = () => {
    if (!currentUser) return [];
    const myName = (currentUser.name || '').toLowerCase();
    const myRole = getOfficerRole(currentUser);
    const myEmail = (currentUser.email || '').toLowerCase();

    // Registrar Officers can review full system completion records
    if (currentUser.role === 'superadmin' || currentUser.staffRole === 'registrar' || myRole === 'superadmin' || myRole === 'registrar') {
      return completedRequestsHistory;
    }

    return completedRequestsHistory.filter((rec) => {
      const recName = (rec.completedByOfficerName || '').toLowerCase();
      const recRole = (rec.completedByOfficerRole || '').toLowerCase();
      const recEmail = (rec.completedByOfficerEmail || '').toLowerCase();

      // Check email match
      if (myEmail && recEmail && myEmail === recEmail) {
        return true;
      }

      // Check name match
      if (recName && myName && (recName === myName || recName.includes(myName) || myName.includes(recName))) {
        return true;
      }

      // Check role partition match
      if (myRole === 'receiver' && recRole === 'receiver') return true;
      if (myRole === 'records_management' && recRole === 'records_management') return true;
      if (myRole === 'evaluator' && recRole === 'evaluator') return true;

      return false;
    });
  };

  const assignTicketStaff = async (ticketId: string, staffName: string): Promise<void> => {
    await runTicketWorkflow(ticketId, { action: 'handoff', assignedTo: staffName, notes: 'Reassigned by Registrar Officer' });
  };

  const updateTicketPriority = async (ticketId: string, priority: TicketPriority): Promise<void> => {
    const generation = accountGenerationRef.current;
    const identity = accountIdentityRef.current;
    await flushStateResource('tickets');
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) {
      throw new Error('Your session changed before the priority could be saved.');
    }
    await api(`/api/tickets/${encodeURIComponent(ticketId)}/priority`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    });
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) return;
    await refreshServerState(generation);
  };

  const updateEstimatedDate = (ticketId: string, newDate: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, estimatedReleaseDate: newDate, updatedAt: new Date().toISOString() } : t))
    );
  };

  const addInternalNote = (ticketId: string, noteText: string, author: string = 'Registrar Staff') => {
    const newNote: InternalNote = {
      id: generateUniqueId('note'),
      ticketId,
      author,
      authorRole: 'Registrar Office Staff',
      note: noteText,
      timestamp: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, internalNotes: [...t.internalNotes, newNote] } : t))
    );
  };

  const sendTicketMessage = async (
    ticketId: string,
    messageText: string,
    senderRole: 'student' | 'registrar',
    senderName: string
  ): Promise<Ticket> => {
    const generation = accountGenerationRef.current;
    const identity = accountIdentityRef.current;
    await flushStateResource('tickets');
    await flushStateResource('notifications');
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) {
      throw new Error('Your session changed before the message could be sent. Please try again.');
    }
    const arrival = formatRealtimeArrival();
    const newMsg: ChatMessage = {
      id: generateUniqueId('msg'),
      ticketId,
      senderRole,
      senderName,
      message: messageText,
      timestamp: `${arrival.dateStr} • ${arrival.exactTime}`,
    };
    const { ticket: savedTicket } = await api<{ ticket: Ticket }>(
      `/api/tickets/${encodeURIComponent(ticketId)}/messages`,
      { method: 'POST', body: JSON.stringify({ message: newMsg }) }
    );
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) {
      throw new Error('Your session changed after the message was sent. Refresh the request to verify it before retrying.');
    }
    try {
      await refreshServerState(generation);
    } catch (error) {
      const refreshedTickets = (latestResourcesRef.current.tickets as Ticket[]).map((ticket) =>
        ticket.id === savedTicket.id ? savedTicket : ticket
      );
      stateBaselinesRef.current.tickets = serializeState(refreshedTickets);
      setTickets(refreshedTickets);
      setStartupError(`Message sent, but the latest shared state could not be refreshed. ${error instanceof Error ? error.message : ''}`.trim());
    }
    return savedTicket;
  };

  const markNotificationAsRead = (id: string) => {
    const updated = markNotificationReadForAccount(allNotifications, id, currentUser, tickets);
    setNotifications(updated);
  };

  const notifications = getNotificationsForAccount(allNotifications, currentUser, tickets);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const dynamicPending = tickets.filter((ticket) => ticket.status === 'pending').length;
  const dynamicProcessing = tickets.filter((ticket) => ticket.status === 'processing').length;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dynamicCompletedToday = tickets.filter((ticket) => {
    const updated = Date.parse(ticket.updatedAt);
    return ticket.status === 'completed' && Number.isFinite(updated) && updated >= startOfToday.getTime();
  }).length;
  const urgentCount = tickets.filter(isPriorityActionTicket).length;
  const completedDurations = completedRequestsHistory
    .map((record) => {
      const created = Date.parse(record.ticketSnapshot?.createdAt || '');
      const completed = Date.parse(record.completedAt || '');
      return Number.isFinite(created) && Number.isFinite(completed) && completed >= created
        ? (completed - created) / (1000 * 60 * 60 * 24)
        : null;
    })
    .filter((duration): duration is number => duration !== null);
  const avgTurnaroundDays = completedDurations.length
    ? completedDurations.reduce((total, days) => total + days, 0) / completedDurations.length
    : 0;

  const stats: HelpdeskStats = {
    pendingRequests: dynamicPending,
    processing: dynamicProcessing,
    completedToday: dynamicCompletedToday,
    totalRequests: tickets.length,
    urgentTickets: urgentCount,
    avgTurnaroundDays,
  };

  const addAuditLog = (
    action: string,
    category: AuditLog['category'],
    details: string,
    severity: AuditLog['severity'] = 'info'
  ) => {
    if (!currentUser || currentUser.role === 'student') return;
    const newLog: AuditLog = {
      id: generateUniqueId('log'),
      timestamp: new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      actorName: currentUser?.name || 'System',
      actorRole: currentUser?.role === 'superadmin' ? 'Registrar Officer' : currentUser?.role === 'admin' ? 'Registrar Evaluator' : 'Student',
      action,
      category,
      details,
      ipAddress: 'Unavailable',
      severity,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const addSystemActivity = (
    text: string,
    actor: string,
    actionType: SystemActivityItem['actionType'],
    ticketNumber?: string
  ) => {
    if (!currentUser || currentUser.role === 'student') return;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const newActivity: SystemActivityItem = {
      id: generateUniqueId('act'),
      timeStr,
      text,
      actor,
      actionType,
      ticketNumber,
      timestamp: new Date().toISOString(),
    };
    setSystemActivities((prev) => {
      if (prev.some((a) => a.id === newActivity.id)) {
        return prev;
      }
      return [newActivity, ...prev];
    });
  };

  const createUser = async (userData: Omit<UserAccount, 'id' | 'createdAt' | 'lastLogin'>) => {
    const { user } = await api<{ user: UserAccount }>('/api/users', {
      method: 'POST',
      body: JSON.stringify({ user: userData }),
    });
    const safeUser = { ...user };
    delete safeUser.password;
    setUsers((prev) => [safeUser, ...prev.filter((account) => account.id !== safeUser.id)]);
    if (safeUser.role === 'student') {
      const state = await api<Record<string, unknown>>('/api/state');
      applyServerSnapshot(state, accountGenerationRef.current);
    }
    addAuditLog('USER_CREATED', 'Auth', `Created user account for ${safeUser.name} with role ${safeUser.role}.`, 'success');
    addSystemActivity(`New ${safeUser.role} account created for ${safeUser.name}`, currentUser?.name || 'Registrar', 'account_created');
  };

  const updateUser = async (id: string, updates: Partial<UserAccount>) => {
    const { user } = await api<{ user: UserAccount }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    const safeUser = { ...user };
    delete safeUser.password;
    setUsers((prev) => prev.map((account) => account.id === id ? safeUser : account));
    addAuditLog('USER_UPDATED', 'Auth', `Updated account details for ${safeUser.name}.`, 'info');
  };

  const deleteUser = async (id: string) => {
    const user = users.find((account) => account.id === id);
    await api(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
    setUsers((prev) => prev.filter((account) => account.id !== id));
    if (user) addAuditLog('USER_DELETED', 'Auth', `Deleted account for ${user.name}.`, 'warning');
    if (user && currentUser?.name.toLowerCase() === user.name.toLowerCase()) await logout();
  };

  const changeCurrentAccountPassword = async (newPassword: string, oldPassword?: string) => {
    if (!currentUser) return { success: false, error: 'No active session found.' };
    if (!oldPassword) return { success: false, error: 'Enter your current password.' };
    if (newPassword.length < 8) return { success: false, error: 'New password must be at least 8 characters long.' };
    try {
      await api('/api/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      addAuditLog('PASSWORD_CHANGED', 'Auth', `Account password successfully updated for ${currentUser.name}.`, 'success');
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unable to update password.' };
    }
  };

  const updateCurrentProfilePicture = (pictureDataUrl: string) => {
    if (!currentUser) return;

    setCurrentUser((prev) => (prev ? { ...prev, profilePicture: pictureDataUrl } : null));

    const accountId = (currentUser as AuthenticatedUser & { id?: string }).id;
    if (accountId) {
      void api<{ user: UserAccount }>(`/api/users/${encodeURIComponent(accountId)}`, {
        method: 'PUT',
        body: JSON.stringify({ updates: { profilePicture: pictureDataUrl } }),
      })
      .then(({ user }) => {
        const safeUser = { ...user };
        delete safeUser.password;
        setUsers((prev) => prev.map((account) => account.id === safeUser.id ? safeUser : account));
      })
      .catch((error: Error) => console.error('Unable to save profile photo:', error.message));
    } else {
      console.error('Unable to save profile photo: authenticated account ID is unavailable.');
    }

    addAuditLog(
      'PROFILE_PICTURE_UPDATED',
      'Auth',
      `${currentUser.name} updated their account profile picture.`,
      'info'
    );
  };

  const toggleUserStatus = async (id: string) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const newStatus: AccountStatus = user.status === 'active' ? 'inactive' : 'active';
    await updateUser(id, { status: newStatus });
    addSystemActivity(`User ${user.name} status updated to ${newStatus}`, currentUser?.name || 'Registrar', 'setting_updated');
  };

  const resetUserPassword = async (id: string) => {
    const user = users.find((u) => u.id === id);
    const { password } = await api<{ password: string }>(`/api/users/${encodeURIComponent(id)}/reset-password`, { method: 'POST' });
    if (user) {
      addAuditLog('PASSWORD_RESET', 'Auth', `Administrative password reset issued for user ${user.name}.`, 'warning');
    }
    return password;
  };

  const addStudentRecord = (
    studentData: Omit<StudentProfile, 'id' | 'isArchived' | 'requestCount' | 'joinedDate'>
  ): { success: boolean; error?: string } => {
    const trimmedId = studentData.studentId.trim();
    if (!/^\d{8}$/.test(trimmedId)) {
      return { success: false, error: 'Student ID must be exactly 8 digits (numbers only, e.g. 20260123).' };
    }
    const exists = studentRecords.some((s) => s.studentId === trimmedId);
    if (exists) {
      return { success: false, error: `Student ID ${trimmedId} already exists in university records.` };
    }

    const newRecord: StudentProfile = {
      ...studentData,
      id: generateUniqueId('stu'),
      studentId: trimmedId,
      isArchived: false,
      requestCount: 0,
      joinedDate: new Date().toISOString().split('T')[0],
    };

    setStudentRecords((prev) => [newRecord, ...prev]);
    addAuditLog('STUDENT_ENROLLED', 'Student', `Added official academic record for ${newRecord.name} (ID: ${newRecord.studentId}).`, 'success');
    addSystemActivity(`Academic record enrolled for ${newRecord.name} (#${newRecord.studentId})`, currentUser?.name || 'Registrar Officer', 'account_created');
    return { success: true };
  };

  const updateStudentRecord = (id: string, updates: Partial<StudentProfile>) => {
    const s = studentRecords.find((item) => item.id === id);
    if (s) {
      addAuditLog('STUDENT_RECORD_MODIFIED', 'Student', `Modified student profile for ${updates.name || s.name} (ID: ${updates.studentId || s.studentId}).`, 'info');
    }
    setStudentRecords((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const archiveStudentRecord = (id: string) => {
    const s = studentRecords.find((item) => item.id === id);
    if (s) {
      addAuditLog('STUDENT_ARCHIVED', 'Student', `Archived academic record of ${s.name} (ID: ${s.studentId}).`, 'warning');
      addSystemActivity(`Student record archived: ${s.name} (#${s.studentId})`, currentUser?.name || 'Registrar Officer', 'setting_updated');
    }
    setStudentRecords((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isArchived: true } : s))
    );
  };

  const restoreStudentRecord = (id: string) => {
    const s = studentRecords.find((item) => item.id === id);
    if (s) {
      addAuditLog('STUDENT_RESTORED', 'Student', `Restored active status for ${s.name} (ID: ${s.studentId}).`, 'success');
      addSystemActivity(`Student record restored: ${s.name} (#${s.studentId})`, currentUser?.name || 'Registrar Officer', 'setting_updated');
    }
    setStudentRecords((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isArchived: false } : s))
    );
  };

  const createRole = (roleData: Omit<SystemRole, 'id' | 'userCount' | 'isSystemDefault'>) => {
    const newRole: SystemRole = {
      ...roleData,
      id: generateUniqueId('role'),
      userCount: 0,
      isSystemDefault: false,
    };
    setRoles((prev) => [...prev, newRole]);
    addAuditLog('ROLE_CREATED', 'Role', `Created new system role: ${newRole.name}.`, 'success');
    addSystemActivity(`New system role created: ${newRole.name}`, currentUser?.name || 'Registrar Officer', 'setting_updated');
  };

  const updateRole = (id: string, updates: Partial<SystemRole>) => {
    const r = roles.find((item) => item.id === id);
    if (r) {
      addAuditLog('ROLE_PERMISSION_UPDATED', 'Role', `Updated role configuration for "${updates.name || r.name}".`, 'warning');
      addSystemActivity(`Role permissions modified for ${updates.name || r.name}`, currentUser?.name || 'Registrar Officer', 'setting_updated');
    }
    setRoles((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const deleteRole = (id: string) => {
    const role = roles.find((r) => r.id === id);
    if (!role || role.isSystemDefault) return;
    setRoles((prev) => prev.filter((r) => r.id !== id));
    addAuditLog('ROLE_DELETED', 'Role', `Deleted custom system role: ${role.name}.`, 'warning');
  };

  const updateRequestCategory = (id: string, updates: Partial<RequestCategoryConfig>) => {
    const cat = requestCategories.find((item) => item.id === id);
    if (cat) {
      addAuditLog('CATEGORY_UPDATED', 'System', `Updated request category parameters for ${updates.name || cat.name}.`, 'info');
    }
    setRequestCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
    );
  };

  const addRequestCategory = (cat: Omit<RequestCategoryConfig, 'id'>) => {
    const newCat: RequestCategoryConfig = {
      ...cat,
      id: generateUniqueId('cat'),
    };
    setRequestCategories((prev) => [...prev, newCat]);
    addAuditLog('CATEGORY_CREATED', 'System', `Added document/ticket category: ${newCat.name}.`, 'success');
  };

  const toggleRequestCategory = (id: string) => {
    setRequestCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, active: !cat.active } : cat))
    );
  };

  const updateSystemSettings = (updates: Partial<SystemSettings>) => {
    addAuditLog('SETTINGS_UPDATED', 'System', 'Enterprise institutional system configuration modified.', 'warning');
    addSystemActivity('System Settings updated by Registrar Officer', currentUser?.name || 'Registrar Officer', 'setting_updated');
    setSystemSettings((prev) => ({ ...prev, ...updates }));
  };

  const reassignTicket = async (ticketId: string, newAssignee: string): Promise<void> => {
    const matchedStaff = users.find(
      (u) => u.name === newAssignee || u.name.toLowerCase() === newAssignee.trim().toLowerCase()
    );
    // The server writes the history entry, audit log and student notification for a handoff.
    await runTicketWorkflow(ticketId, {
      action: 'handoff',
      assignedTo: matchedStaff ? matchedStaff.name : newAssignee,
      notes: 'Reassigned by Registrar Officer',
    });
  };

  const forceCloseTicket = async (ticketId: string, reason: string, confirmed = false) => {
    if (!confirmed) throw new Error('Confirm Force Close before completing this request.');
    await runTicketWorkflow(ticketId, { action: 'force_close', notes: reason, confirmed: true });
  };

  const reopenTicket = async (ticketId: string, reason: string) => {
    await runTicketWorkflow(ticketId, { action: 'reopen', notes: reason, confirmed: true });
  };

  const updateTicketPrioritySuperAdmin = (ticketId: string, priority: TicketPriority) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, priority } : t))
    );

    addAuditLog('TICKET_PRIORITY_CHANGED', 'Ticket', `Ticket #${ticket.ticketNumber} priority set to "${priority}".`, 'info');
    addSystemActivity(`Ticket #${ticket.ticketNumber} priority changed to ${priority}`, currentUser?.name || 'Registrar Officer', 'status_change', ticket.ticketNumber);
  };

  const createSuperAnnouncement = (announcement: Omit<Announcement, 'id' | 'date'>) => {
    const newAnn: Announcement = {
      ...announcement,
      id: generateUniqueId('ann'),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    addAuditLog('ANNOUNCEMENT_PUBLISHED', 'System', `Published institutional announcement: "${newAnn.title}".`, 'info');
    addSystemActivity(`Broadcast announcement published: "${newAnn.title}"`, currentUser?.name || 'Registrar Officer', 'setting_updated');
  };

  const deleteSuperAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    addAuditLog('ANNOUNCEMENT_DELETED', 'System', 'Removed broadcast announcement.', 'info');
  };

  const broadcastNotification = (title: string, message: string) => {
    const arrival = formatRealtimeArrival();
    const newNotif: AppNotification = {
      id: generateUniqueId('notif'),
      title,
      message,
      timestamp: arrival.timestamp,
      exactTime: arrival.exactTime,
      dateStr: arrival.dateStr,
      read: false,
      type: 'announcement',
    };
    setNotifications((prev) => [newNotif, ...prev]);
    addAuditLog('BROADCAST_ALERT', 'System', `Broadcast push notice dispatched: "${title}".`, 'info');
  };

  const exportSystemBackup = (): string => {
    const backupData = {
      backupTimestamp: new Date().toISOString(),
      systemVersion: 'Registrack-Enterprise-v2.6',
      school: systemSettings.schoolName,
      users,
      studentRecords,
      roles,
      requestCategories,
      systemSettings,
      tickets,
      auditLogs,
      systemActivities,
      announcements,
      notifications: allNotifications,
      deletedRequestsHistory,
      completedRequestsHistory,
      credentialNotice: 'Account passwords and sessions are not included and will not be changed by restore.',
    };
    addAuditLog('BACKUP_CREATED', 'Backup', 'System database backup snapshot exported by Registrar Officer.', 'success');
    return JSON.stringify(backupData, null, 2);
  };

  const restoreSystemBackup = async (jsonContent: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = JSON.parse(jsonContent);
      if (!Array.isArray(data.tickets)) {
        return { success: false, error: 'Invalid backup structure. Required entities are missing.' };
      }
      await Promise.all(STATE_RESOURCE_KEYS.map((key) => flushStateResource(key)));
      await api('/api/state/restore-backup', { method: 'POST', body: JSON.stringify({ backup: data }) });
      if (currentUser) await hydrateAccount(currentUser, accountGenerationRef.current);

      addAuditLog('BACKUP_RESTORED', 'Backup', 'System state successfully restored from snapshot.', 'warning');
      addSystemActivity('System database restored from external snapshot', currentUser?.name || 'Registrar Officer', 'setting_updated');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to parse JSON file.' };
    }
  };

  const archiveCompletedRequests = async (): Promise<number> => {
    await Promise.all(STATE_RESOURCE_KEYS.map((key) => flushStateResource(key)));
    const { count } = await api<{ count: number }>('/api/archive-completed', { method: 'POST', body: '{}' });
    if (currentUser) await hydrateAccount(currentUser, accountGenerationRef.current);
    return count;
  };

  const refreshHelpdeskState = async (): Promise<void> => {
    const generation = accountGenerationRef.current;
    const identity = accountIdentityRef.current;
    await refreshServerState(generation);
    if (generation !== accountGenerationRef.current || identity !== accountIdentityRef.current) {
      throw new Error('Your session changed before the ticket could be refreshed.');
    }
  };

  return (
    <HelpdeskContext.Provider
      value={{
        initializing,
        startupError,
        isAuthenticated,
        currentUser,
        login,
        loginStudent,
        loginAdmin,
        loginSuperAdmin,
        logout,
        changeCurrentAccountPassword,
        updateCurrentProfilePicture,
        role,
        setRole,
        studentView,
        setStudentView,
        adminView,
        setAdminView,
        superAdminView,
        setSuperAdminView,
        currentStudent,
        tickets,
        selectedTicket,
        setSelectedTicket,
        activeChatTicket,
        setActiveChatTicket,
        trackingTicketNumber,
        setTrackingTicketNumber,
        trackTicketByNumber,
        submitNewTicket,
        refreshHelpdeskState,
        updateTicketStatus,
        passTicketToNextRole,
        repairTicketStage,
        assignTicketStaff,
        updateTicketPriority,
        updateEstimatedDate,
        addInternalNote,
        sendTicketMessage,
        cancelTicket,
        deleteTicket,
        restoreDeletedTicket,
        recordCompletedRequest,
        deletedRequestsHistory,
        completedRequestsHistory,
        getMyDeletedRequests,
        getMyCompletedRequests,
        officerRole,
        isReceiver,
        isRecordsManagement,
        isEvaluator,
        canAccessApplicationForm,
        users,
        createUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        resetUserPassword,
        studentRecords,
        addStudentRecord,
        updateStudentRecord,
        archiveStudentRecord,
        restoreStudentRecord,
        roles: roles.map(systemRole => ({
          ...systemRole,
          userCount: users.filter(user => user.role === systemRole.id.replace(/^role-/, '')).length,
        })),
        createRole,
        updateRole,
        deleteRole,
        auditLogs,
        addAuditLog,
        systemActivities,
        addSystemActivity,
        requestCategories,
        updateRequestCategory,
        addRequestCategory,
        toggleRequestCategory,
        systemSettings,
        updateSystemSettings,
        reassignTicket,
        forceCloseTicket,
        reopenTicket,
        updateTicketPrioritySuperAdmin,
        createSuperAnnouncement,
        deleteSuperAnnouncement,
        broadcastNotification,
        exportSystemBackup,
        restoreSystemBackup,
        archiveCompletedRequests,
        staffList,
        faqs,
        announcements,
        stats,
        notifications,
        markNotificationAsRead,
        unreadCount,
      }}
    >
      {children}
    </HelpdeskContext.Provider>
  );
};

export const useHelpdesk = () => {
  const context = useContext(HelpdeskContext);
  if (!context) {
    throw new Error('useHelpdesk must be used within a HelpdeskProvider');
  }
  return context;
};
