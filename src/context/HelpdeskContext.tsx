import React, { createContext, useContext, useEffect, useState } from 'react';
import { getNotificationsForAccount, markNotificationReadForAccount } from '../utils/studentNotifications';
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
  INITIAL_ANNOUNCEMENTS,
  INITIAL_FAQS,
  INITIAL_STAFF,
  INITIAL_TICKETS,
} from '../data/mockData';
import {
  INITIAL_USERS,
  INITIAL_STUDENT_RECORDS,
  INITIAL_ROLES,
  INITIAL_AUDIT_LOGS,
  INITIAL_SYSTEM_ACTIVITIES,
  INITIAL_REQUEST_CATEGORIES,
  DEFAULT_SYSTEM_SETTINGS,
} from '../data/superAdminData';
import {
  INITIAL_DELETED_REQUESTS,
  INITIAL_COMPLETED_REQUESTS,
} from '../data/historyData';

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
  isAuthenticated: boolean;
  currentUser: AuthenticatedUser | null;
  loginStudent: (studentIdentifier: string, passwordOrStudentId: string, degreeProgram?: string) => { success: boolean; error?: string };
  loginAdmin: (adminName: string, adminPassword: string) => { success: boolean; error?: string };
  loginSuperAdmin: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  changeCurrentAccountPassword: (newPassword: string, oldPassword?: string) => { success: boolean; error?: string };
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
  submitNewTicket: (data: Partial<Ticket>) => Ticket;
  updateTicketStatus: (
    ticketId: string,
    status: TicketStatus,
    stage: TicketStage,
    reason?: string,
    actor?: string,
    newAssignee?: string
  ) => void;
  passTicketToNextRole: (
    ticketId: string,
    targetStaffName?: string,
    targetStage?: TicketStage,
    customNote?: string,
    actorName?: string
  ) => void;
  assignTicketStaff: (ticketId: string, staffName: string) => void;
  updateTicketPriority: (ticketId: string, priority: TicketPriority) => void;
  updateEstimatedDate: (ticketId: string, newDate: string) => void;
  addInternalNote: (ticketId: string, noteText: string, author?: string) => void;
  sendTicketMessage: (
    ticketId: string,
    message: string,
    role: 'student' | 'registrar',
    senderName: string
  ) => void;
  cancelTicket: (ticketId: string, reason?: string) => void;
  deleteTicket: (ticketId: string, reason?: string) => void;
  restoreDeletedTicket: (recordId: string) => void;
  recordCompletedRequest: (ticket: Ticket, notes?: string, customActor?: string) => void;

  // Officer History Feature
  deletedRequestsHistory: DeletedRequestRecord[];
  completedRequestsHistory: CompletedRequestRecord[];
  getMyDeletedRequests: () => DeletedRequestRecord[];
  getMyCompletedRequests: () => CompletedRequestRecord[];
  officerRole: 'receiver' | 'records_management' | 'evaluator' | 'registrar' | 'superadmin' | 'other';
  isReceiver: boolean;
  isRecordsManagement: boolean;
  isEvaluator: boolean;
  canAccessApplicationForm: boolean;

  // Super Admin Management Actions
  users: UserAccount[];
  createUser: (userData: Omit<UserAccount, 'id' | 'createdAt' | 'lastLogin'>) => void;
  updateUser: (id: string, updates: Partial<UserAccount>) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  resetUserPassword: (id: string) => string;

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

  reassignTicket: (ticketId: string, newAssignee: string) => void;
  forceCloseTicket: (ticketId: string, reason: string) => void;
  reopenTicket: (ticketId: string) => void;
  updateTicketPrioritySuperAdmin: (ticketId: string, priority: TicketPriority) => void;

  createSuperAnnouncement: (announcement: Omit<Announcement, 'id' | 'date'>) => void;
  deleteSuperAnnouncement: (id: string) => void;
  broadcastNotification: (title: string, message: string) => void;
  exportSystemBackup: () => string;
  restoreSystemBackup: (jsonContent: string) => { success: boolean; error?: string };

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

  // Quick helper to reset demo data if needed
  resetDemoData: () => void;
}

const HelpdeskContext = createContext<HelpdeskContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'registrack_portal_tickets_v2';
const NOTIFICATIONS_STORAGE_KEY = 'registrack_portal_notifications_v2';
const USER_SESSION_KEY = 'registrack_auth_session_v2';

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
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(() => {
    try {
      const stored = localStorage.getItem(USER_SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to read auth session from storage', e);
    }
    return null;
  });

  const USERS_STORAGE_KEY = 'registrack_users_v2';
  const STUDENTS_STORAGE_KEY = 'registrack_students_v2';
  const DELETED_ACCOUNTS_KEY = 'registrack_deleted_accounts_v2';

  const [deletedAccounts, setDeletedAccounts] = useState<
    Array<{ id: string; email?: string; studentId?: string; name?: string; deletedAt: string }>
  >(() => {
    try {
      const stored = localStorage.getItem(DELETED_ACCOUNTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        const parsed: UserAccount[] = JSON.parse(stored);
        return parsed.map((u) => {
          if (!u.password) {
            const def = INITIAL_USERS.find((init) => init.id === u.id || init.email === u.email);
            if (def?.password) {
              return { ...u, password: def.password };
            }
          }
          return u;
        });
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_USERS;
  });

  const [studentRecords, setStudentRecords] = useState<StudentProfile[]>(() => {
    try {
      const stored = localStorage.getItem(STUDENTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_STUDENT_RECORDS;
  });

  const isAccountDeleted = (identifier: string): boolean => {
    if (!identifier) return false;
    const clean = identifier.trim().toLowerCase();
    return deletedAccounts.some((d) => {
      if (d.email && d.email.toLowerCase() === clean) return true;
      if (d.name && d.name.toLowerCase() === clean) return true;
      if (d.studentId && d.studentId.trim() === clean) return true;
      return false;
    });
  };

  const [role, setRole] = useState<UserRole>(() => currentUser?.role || 'student');
  const [studentView, setStudentView] = useState<StudentNavView>('track');
  const [adminView, setAdminView] = useState<AdminNavView>('dashboard');
  const [superAdminView, setSuperAdminView] = useState<SuperAdminNavView>('dashboard');

  const isAuthenticated = currentUser !== null;

  const currentStudent = {
    name: currentUser?.role === 'student' && currentUser.name ? currentUser.name : 'Stevie Ray Rotulo',
    studentId: currentUser?.role === 'student' && currentUser.studentId ? currentUser.studentId : '20231492',
    email: currentUser?.role === 'student' && currentUser.email ? currentUser.email : 'stevierayrotulo334@gmail.com',
    degreeProgram: currentUser?.role === 'student' && currentUser.degreeProgram ? currentUser.degreeProgram : 'BS Computer Science',
    yearLevel: currentUser?.role === 'student' && currentUser.yearLevel ? currentUser.yearLevel : '3rd Year',
  };

  const loginStudent = (
    studentIdentifier: string,
    passwordOrStudentId: string,
    degreeProgram?: string
  ) => {
    const trimmedIdentifier = studentIdentifier.trim();
    const trimmedPassword = passwordOrStudentId.trim();

    if (!trimmedIdentifier) {
      return { success: false, error: 'Please enter your student name or student ID.' };
    }
    if (!trimmedPassword) {
      return { success: false, error: 'Please enter your password or 8-digit student ID.' };
    }

    if (isAccountDeleted(trimmedIdentifier) || isAccountDeleted(trimmedPassword)) {
      return {
        success: false,
        error:
          'This account has been deleted by the Super Administrator and can no longer be accessed.',
      };
    }

    // Match student record from student master records or user directory
    const studentRec =
      studentRecords.find(
        (s) =>
          s.name.toLowerCase() === trimmedIdentifier.toLowerCase() ||
          s.studentId === trimmedIdentifier ||
          s.email?.toLowerCase() === trimmedIdentifier.toLowerCase()
      ) ||
      studentRecords.find(
        (s) =>
          s.name.toLowerCase().includes(trimmedIdentifier.toLowerCase()) ||
          trimmedIdentifier.toLowerCase().includes(s.name.toLowerCase())
      );

    const matchedUser =
      users.find(
        (u) =>
          u.role === 'student' &&
          (u.name.toLowerCase() === trimmedIdentifier.toLowerCase() ||
            u.studentId === trimmedIdentifier ||
            u.email?.toLowerCase() === trimmedIdentifier.toLowerCase())
      ) ||
      users.find(
        (u) =>
          u.role === 'student' &&
          (u.name.toLowerCase().includes(trimmedIdentifier.toLowerCase()) ||
            trimmedIdentifier.toLowerCase().includes(u.name.toLowerCase()))
      );

    // Fallback: If student entered their 8-digit ID in the PASSWORD field
    let finalStudentRec = studentRec;
    let finalMatchedUser = matchedUser;

    if (!finalStudentRec && !finalMatchedUser && /^\d{8}$/.test(trimmedPassword)) {
      finalStudentRec = studentRecords.find((s) => s.studentId === trimmedPassword);
      finalMatchedUser = users.find(
        (u) => u.role === 'student' && u.studentId === trimmedPassword
      );
    }

    if (!finalStudentRec && !finalMatchedUser) {
      return {
        success: false,
        error:
          'Student account not found in university records. Please check your name/ID or contact the registrar desk.',
      };
    }

    if (finalMatchedUser && finalMatchedUser.status !== 'active') {
      return {
        success: false,
        error: 'This student account has been deactivated. Please contact the registrar office.',
      };
    }

    // Official 8-digit student ID and custom password
    const officialStudentId = finalStudentRec?.studentId || finalMatchedUser?.studentId || '';
    const userPassword = finalMatchedUser?.password;

    // Verify Password:
    // 1) Student can use their 8-digit student ID (especially new students)
    // 2) Student can use the password they created
    // 3) Default 'student123'
    const isStudentIdMatch = officialStudentId && trimmedPassword === officialStudentId;
    const isCreatedPasswordMatch = userPassword && trimmedPassword === userPassword;
    const isDefaultPasswordMatch = trimmedPassword === 'student123';

    if (!isStudentIdMatch && !isCreatedPasswordMatch && !isDefaultPasswordMatch) {
      return {
        success: false,
        error:
          'Incorrect password. You may use your created password or your 8-digit Student ID.',
      };
    }

    // Degree program and student details already encoded in the system
    const resolvedProgram =
      finalStudentRec?.degreeProgram ||
      finalMatchedUser?.departmentOrOffice ||
      degreeProgram ||
      'BS Computer Science';

    const resolvedYear = finalStudentRec?.yearLevel || '1st Year';
    const resolvedName = finalStudentRec?.name || finalMatchedUser?.name || trimmedIdentifier;
    const resolvedId =
      officialStudentId || (trimmedPassword.length === 8 ? trimmedPassword : '20231492');
    const resolvedEmail =
      finalMatchedUser?.email ||
      finalStudentRec?.email ||
      `${resolvedName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@student.university.edu`;

    const user: AuthenticatedUser = {
      role: 'student',
      name: resolvedName,
      studentId: resolvedId,
      degreeProgram: resolvedProgram,
      yearLevel: resolvedYear,
      email: resolvedEmail,
      profilePicture: finalMatchedUser?.profilePicture || finalStudentRec?.profilePicture,
    };

    setCurrentUser(user);
    setRole('student');
    setStudentView('track');
    try {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    return { success: true };
  };

  const loginAdmin = (adminName: string, adminPassword: string) => {
    const trimmed = adminName.trim();
    const trimmedPassword = adminPassword.trim();

    if (!trimmed) {
      return { success: false, error: 'Please enter your admin name or email.' };
    }
    if (!trimmedPassword) {
      return { success: false, error: 'Please enter your admin password.' };
    }

    if (isAccountDeleted(trimmed)) {
      return { success: false, error: 'This account has been deleted by the Super Administrator and can no longer be accessed.' };
    }

    const matchedUser = users.find(
      (u) =>
        (u.name.toLowerCase() === trimmed.toLowerCase() ||
         u.email.toLowerCase() === trimmed.toLowerCase()) &&
        (u.role === 'registrar' ||
         u.role === 'receiver' ||
         u.role === 'records_management' ||
         u.role === 'evaluator' ||
         u.role === 'admin' ||
         u.role === 'superadmin' ||
         u.role === 'staff')
    );

    if (matchedUser) {
      if (matchedUser.status !== 'active') {
        return { success: false, error: 'This account has been deactivated. Please contact the Super Administrator.' };
      }
      if (matchedUser.password && matchedUser.password !== trimmedPassword) {
        return { success: false, error: 'Incorrect password for this registrar account.' };
      }
    } else {
      // Fallback for default demo accounts
      if (
        trimmed !== 'Ms. Elena Ramos' &&
        trimmed !== 'Records Office' &&
        trimmed !== 'Mr. Ronald Tan' &&
        trimmed !== 'Mrs. Grace Cruz' &&
        trimmedPassword !== 'admin123'
      ) {
        return { success: false, error: 'Account not found or password incorrect.' };
      }
    }

    let roleTitle = 'Registrar Officer';
    let detectedRole: AccountRoleType = matchedUser?.role || 'staff';
    if (matchedUser?.role === 'receiver' || trimmed.toLowerCase().includes('records office') || trimmed.toLowerCase().includes('receiver')) {
      roleTitle = 'Receiver / Receiving Officer';
      detectedRole = 'receiver';
    } else if (matchedUser?.role === 'records_management' || trimmed.toLowerCase().includes('ronald')) {
      roleTitle = 'Records Management Officer';
      detectedRole = 'records_management';
    } else if (matchedUser?.role === 'evaluator' || trimmed.toLowerCase().includes('elena') || trimmed.toLowerCase().includes('lee')) {
      roleTitle = 'Evaluator';
      detectedRole = 'evaluator';
    }

    const user: AuthenticatedUser = {
      role: 'admin',
      name: matchedUser?.name || trimmed,
      adminRoleTitle: roleTitle,
      staffRole: detectedRole,
      office: matchedUser?.departmentOrOffice || 'Office of the Registrar',
      email: matchedUser?.email || (trimmed.includes('@') ? trimmed : `${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '.')}@registrar.edu`),
      profilePicture: matchedUser?.profilePicture,
    };

    setCurrentUser(user);
    setRole('admin');
    setAdminView('dashboard');
    try {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    return { success: true };
  };

  const loginSuperAdmin = (username: string, password: string) => {
    const trimmed = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmed) {
      return { success: false, error: 'Please enter your Registrar username or email.' };
    }
    if (!trimmedPassword || trimmedPassword.length < 3) {
      return { success: false, error: 'Password must be at least 3 characters long.' };
    }

    if (isAccountDeleted(trimmed)) {
      return { success: false, error: 'This account has been deleted by the Registrar and can no longer be accessed.' };
    }

    const matchedUser = users.find(
      (u) =>
        (u.role === 'superadmin' || u.role === 'registrar') &&
        (u.name.toLowerCase() === trimmed.toLowerCase() ||
         u.email.toLowerCase() === trimmed.toLowerCase() ||
         trimmed.toLowerCase() === 'superadmin' ||
         trimmed.toLowerCase() === 'registrar')
    );

    if (matchedUser) {
      if (matchedUser.status !== 'active') {
        return { success: false, error: 'This Registrar account has been deactivated.' };
      }
      if (matchedUser.password && matchedUser.password !== trimmedPassword && trimmedPassword !== 'superadmin123' && trimmedPassword !== 'registrar123') {
        return { success: false, error: 'Incorrect password for University Registrar.' };
      }
    } else {
      if (trimmedPassword !== 'superadmin123' && trimmedPassword !== 'registrar123' && trimmedPassword !== 'admin123') {
        return { success: false, error: 'Invalid Registrar credentials.' };
      }
    }

    const user: AuthenticatedUser = {
      role: 'superadmin',
      name: matchedUser?.name || 'Dr. Alexander Reyes',
      email: matchedUser?.email || (trimmed.includes('@') ? trimmed : `registrar@university.edu`),
      adminRoleTitle: 'University Registrar & Chief Academic Records Officer',
      office: matchedUser?.departmentOrOffice || 'Office of the University Registrar, Room 101',
      permissions: ['all'],
      profilePicture: matchedUser?.profilePicture,
    };

    setCurrentUser(user);
    setRole('superadmin');
    setSuperAdminView('dashboard');
    try {
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    setRole('student');
    setStudentView('track');
    try {
      localStorage.removeItem(USER_SESSION_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load tickets from localStorage', e);
    }
    return INITIAL_TICKETS;
  });

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeChatTicket, setActiveChatTicket] = useState<Ticket | null>(null);
  const [trackingTicketNumber, setTrackingTicketNumber] = useState<string>('REG-2026-00125');

  const [staffList] = useState<StaffMember[]>(INITIAL_STAFF);
  const [faqs] = useState<FAQItem[]>(INITIAL_FAQS);

  const ROLES_STORAGE_KEY = 'registrack_roles_v2';
  const AUDIT_STORAGE_KEY = 'registrack_audit_logs_v2';
  const ACTIVITIES_STORAGE_KEY = 'registrack_activities_v2';
  const CATEGORIES_STORAGE_KEY = 'registrack_categories_v2';
  const SETTINGS_STORAGE_KEY = 'registrack_settings_v2';
  const ANNOUNCEMENTS_STORAGE_KEY = 'registrack_announcements_v2';

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const stored = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ANNOUNCEMENTS;
  });

  const [roles, setRoles] = useState<SystemRole[]>(() => {
    try {
      const stored = localStorage.getItem(ROLES_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ROLES;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.map((item) => {
            let id = item.id;
            if (!id || seen.has(id)) {
              id = generateUniqueId('log');
            }
            seen.add(id);
            return { ...item, id };
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_AUDIT_LOGS;
  });

  const [systemActivities, setSystemActivities] = useState<SystemActivityItem[]>(() => {
    try {
      const stored = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const sanitized: SystemActivityItem[] = [];
          for (let i = 0; i < parsed.length; i++) {
            const item = parsed[i];
            if (!item) continue;
            let id = item.id;
            if (!id || seen.has(id)) {
              id = generateUniqueId('act');
            }
            seen.add(id);
            sanitized.push({ ...item, id });
          }
          return sanitized;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SYSTEM_ACTIVITIES;
  });

  const [requestCategories, setRequestCategories] = useState<RequestCategoryConfig[]>(() => {
    try {
      const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_REQUEST_CATEGORIES;
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_SYSTEM_SETTINGS;
  });

  const DELETED_REQUESTS_KEY = 'registrack_deleted_requests_history_v2';
  const COMPLETED_REQUESTS_KEY = 'registrack_completed_requests_history_v2';

  const [deletedRequestsHistory, setDeletedRequestsHistory] = useState<DeletedRequestRecord[]>(() => {
    try {
      const stored = localStorage.getItem(DELETED_REQUESTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_DELETED_REQUESTS;
  });

  const [completedRequestsHistory, setCompletedRequestsHistory] = useState<CompletedRequestRecord[]>(() => {
    try {
      const stored = localStorage.getItem(COMPLETED_REQUESTS_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_COMPLETED_REQUESTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(DELETED_REQUESTS_KEY, JSON.stringify(deletedRequestsHistory));
    } catch (e) {
      console.error(e);
    }
  }, [deletedRequestsHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPLETED_REQUESTS_KEY, JSON.stringify(completedRequestsHistory));
    } catch (e) {
      console.error(e);
    }
  }, [completedRequestsHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(studentRecords));
    } catch (e) {
      console.error(e);
    }
  }, [studentRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles));
    } catch (e) {
      console.error(e);
    }
  }, [roles]);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(auditLogs));
    } catch (e) {
      console.error(e);
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(systemActivities));
    } catch (e) {
      console.error(e);
    }
  }, [systemActivities]);

  useEffect(() => {
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(requestCategories));
    } catch (e) {
      console.error(e);
    }
  }, [requestCategories]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings));
    } catch (e) {
      console.error(e);
    }
  }, [systemSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(announcements));
    } catch (e) {
      console.error(e);
    }
  }, [announcements]);

  const [allNotifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const nowInfo = formatRealtimeArrival();
          return parsed.map((n) => ({
            ...n,
            exactTime: n.exactTime || nowInfo.exactTime,
            dateStr: n.dateStr || nowInfo.dateStr,
            timestamp: n.timestamp && n.timestamp.includes('•') ? n.timestamp : `${n.dateStr || nowInfo.dateStr} • ${n.exactTime || nowInfo.exactTime}`,
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }

    const now = new Date();
    const t1 = new Date(now.getTime() - 15 * 60 * 1000);
    const t2 = new Date(now.getTime() - 60 * 60 * 1000);
    const t3 = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    const f1 = formatRealtimeArrival(t1);
    const f2 = formatRealtimeArrival(t2);
    const f3 = formatRealtimeArrival(t3);

    return [
      {
        id: 'notif-1',
        title: 'Status Update: Completed',
        message: 'Your Good Moral Certificate (REG-2026-00118) is completed and ready for claiming at Window 4 in the school registrar office.',
        timestamp: f1.timestamp,
        exactTime: f1.exactTime,
        dateStr: f1.dateStr,
        read: false,
        ticketNumber: 'REG-2026-00118',
        type: 'release_ready',
      },
      {
        id: 'notif-2',
        title: 'Registrar Message Received',
        message: 'Ms. Elena Ramos replied to your Transcript inquiry on REG-2026-00125.',
        timestamp: f2.timestamp,
        exactTime: f2.exactTime,
        dateStr: f2.dateStr,
        read: false,
        ticketNumber: 'REG-2026-00125',
        type: 'chat_message',
      },
      {
        id: 'notif-3',
        title: 'Document Processing Update',
        message: 'Ticket REG-2026-00125 has transitioned to "Processing & Security Watermark Printing".',
        timestamp: f3.timestamp,
        exactTime: f3.exactTime,
        dateStr: f3.dateStr,
        read: true,
        ticketNumber: 'REG-2026-00125',
        type: 'status_update',
      },
    ];
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tickets));
    } catch (e) {
      console.error('Error saving tickets', e);
    }
  }, [tickets]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(allNotifications));
    } catch (e) {
      console.error('Error saving notifications', e);
    }
  }, [allNotifications]);

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

  const submitNewTicket = (data: Partial<Ticket>): Ticket => {
    // Generate next ticket number format: REG-2026-001XX
    const count = tickets.length + 125;
    const padded = String(count).padStart(5, '0');
    const ticketNumber = `REG-2026-${padded}`;

    const now = new Date();
    const formattedNow = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Calculate realistic estimated release date
    let estDays = 3;
    if (data.category === 'Certificates') estDays = 2;
    if (data.category === 'Transcript of Records') estDays = 4;
    if (data.category === 'Grades' || data.category === 'Enrollment') estDays = 2;
    if (data.priority === 'Urgent') estDays = Math.max(1, estDays - 1);

    const estDate = new Date();
    estDate.setDate(estDate.getDate() + estDays);
    const estDateString = `${estDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      weekday: 'long',
    })}, 2:00 PM`;

    // Determine default assigned office based on category
    let defaultAssigned = 'Records Office';
    let defaultLocation = 'Registrar Window 2, Administration Building';
    if (data.category === 'Grades' || data.category === 'Enrollment') {
      defaultAssigned = 'Mr. Ronald Tan';
      defaultLocation = 'Registrar Window 1 - Admissions & Evaluation';
    } else if (data.category === 'Certificates' || data.category === 'Clearance') {
      defaultAssigned = 'Mrs. Grace Cruz';
      defaultLocation = 'Registrar Window 4 - Certifications & Clearance';
    } else if (data.category === 'ID concerns') {
      defaultAssigned = 'Mr. Jonathan Lee';
      defaultLocation = 'ID & Biometrics Center, Window 5';
    } else if (data.category === 'Transcript of Records') {
      defaultAssigned = 'Records Office';
      defaultLocation = 'Registrar Window 3 - Transcript of Records';
    }

    const newTicket: Ticket = {
      id: generateUniqueId('ticket'),
      ticketNumber,
      studentName: data.studentName || currentStudent.name,
      studentId: data.studentId || currentStudent.studentId,
      email: data.email || currentStudent.email,
      phone: data.phone || '+63 917 555 0192',
      degreeProgram: data.degreeProgram || currentStudent.degreeProgram,
      yearLevel: data.yearLevel || currentStudent.yearLevel,
      category: data.category || 'Other',
      documentType: data.documentType || 'None',
      copies: data.copies || 1,
      purpose: data.purpose || 'Personal Records / University Verification',
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
      claimingRequirements: [
        'Original Valid Student ID',
        `Registrar Claim Stub / Present this Ticket Number (${ticketNumber})`,
      ],
      messages: [],
      internalNotes: [],
      timelineHistory: [
        {
          stage: 'submitted',
          title: 'Request Submitted Online',
          timestamp: formattedNow,
          notes: 'Ticket generated automatically via Student Helpdesk platform.',
          actor: `${data.studentName || currentStudent.name} (Student)`,
          isPassed: true,
          isCurrent: true,
        },
        {
          stage: 'processing',
          title: 'Processing',
          timestamp: 'Upcoming step',
          notes: 'Records Management encoding grades & Evaluator checking for printing.',
          actor: defaultAssigned,
        },
        {
          stage: 'for_seal',
          title: 'For University Seal',
          timestamp: 'Upcoming step',
          notes: 'Awaiting official university dry seal stamping.',
          actor: 'University Seal Counter',
        },
        {
          stage: 'ready',
          title: 'Ready for Claiming',
          timestamp: 'Upcoming step',
          notes: 'Document completed and queued for counter pickup.',
          actor: 'Releasing Window',
        },
        {
          stage: 'completed',
          title: 'Completed',
          timestamp: 'Upcoming step',
          notes: 'Official transaction closure and counter releasing.',
          actor: 'Releasing Window',
        },
      ],
    };

    setTickets((prev) => [newTicket, ...prev]);

    // Add real-time arrival notification
    const arrival = formatRealtimeArrival();
    const newNotif: AppNotification = {
      id: generateUniqueId('notif'),
      title: `Support Ticket Generated: ${ticketNumber}`,
      message: `Official request for ${newTicket.studentName} (ID: ${newTicket.studentId}) filed by Registrar Evaluator. Ready for live tracking.`,
      timestamp: arrival.timestamp,
      exactTime: arrival.exactTime,
      dateStr: arrival.dateStr,
      read: false,
      ticketNumber,
      type: 'status_update',
      audience: 'student',
      recipientStudentId: newTicket.studentId,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Record audit log & system activity
    addAuditLog(
      'TICKET_FILED_BY_REGISTRAR',
      'Ticket',
      `Walk-in request filed at counter window by Registrar for student ${newTicket.studentName} (ID: ${newTicket.studentId}, Ticket: #${ticketNumber}, Category: ${newTicket.category}).`,
      'info'
    );
    addSystemActivity(
      `Support Ticket #${ticketNumber} generated by Evaluator for ${newTicket.studentName}`,
      currentUser?.name || 'Registrar Evaluator',
      'assignment',
      ticketNumber
    );

    return newTicket;
  };

  const updateTicketStatus = (
    ticketId: string,
    status: TicketStatus,
    stage: TicketStage,
    reason?: string,
    actor: string = 'Registrar Staff',
    newAssignee?: string
  ) => {
    const now = new Date();
    const formattedNow = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;

        // Stage progress mapping (5-stage verification)
        const stageOrder: TicketStage[] = ['submitted', 'processing', 'for_seal', 'ready', 'completed'];
        const normalizedStage = stage === 'reviewed' ? 'processing' : stage;
        const currentStageIndex = stageOrder.indexOf(normalizedStage);

        const updatedHistory = t.timelineHistory.map((h) => {
          const mappedHistoryStage = h.stage === 'reviewed' ? 'processing' : h.stage;
          const itemIndex = stageOrder.indexOf(mappedHistoryStage);
          if (itemIndex < currentStageIndex) {
            return { ...h, isPassed: true, isCurrent: false };
          } else if (itemIndex === currentStageIndex) {
            let stepNote = reason || 'Stage updated successfully.';
            if (!reason) {
              if (normalizedStage === 'completed') stepNote = 'Document claimed by student; transaction complete.';
              else if (normalizedStage === 'ready') stepNote = 'Document completed and ready for claiming at counter.';
              else if (normalizedStage === 'for_seal') stepNote = 'Document evaluated and queued for University Dry Seal.';
              else if (normalizedStage === 'processing') stepNote = 'Records management verified grades intact; evaluator processing for printing.';
            }
            return {
              ...h,
              timestamp: formattedNow,
              isCurrent: true,
              isPassed: normalizedStage === 'completed',
              notes: stepNote,
              actor,
            };
          } else {
            return { ...h, isPassed: false, isCurrent: false };
          }
        });

        const effectiveStatus = normalizedStage === 'completed' ? 'completed' : status;
        const assignedStaffName = newAssignee || t.assignedTo;

        return {
          ...t,
          status: effectiveStatus,
          stage: normalizedStage,
          assignedTo: assignedStaffName,
          assignedStaff: assignedStaffName,
          assignedEvaluator: assignedStaffName,
          rejectionReason: status === 'rejected' ? reason || t.rejectionReason : undefined,
          updatedAt: new Date().toISOString(),
          actualReleaseDate: normalizedStage === 'completed' ? formattedNow : t.actualReleaseDate,
          timelineHistory: updatedHistory,
        };
      })
    );

    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) => {
        if (!prev) return null;
        const normalizedStage = stage === 'reviewed' ? 'processing' : stage;
        const effectiveStatus = normalizedStage === 'completed' ? 'completed' : status;
        const assignedStaffName = newAssignee || prev.assignedTo;
        return {
          ...prev,
          status: effectiveStatus,
          stage: normalizedStage,
          assignedTo: assignedStaffName,
          assignedStaff: assignedStaffName,
          assignedEvaluator: assignedStaffName,
          updatedAt: new Date().toISOString(),
          actualReleaseDate: normalizedStage === 'completed' ? formattedNow : prev.actualReleaseDate,
        };
      });
    }

    // Notify user
    const target = tickets.find((t) => t.id === ticketId);
    if (target) {
      const isCompleted = status === 'completed' || stage === 'completed';
      const isReady = stage === 'ready';
      const notifTitle =
        isCompleted
          ? `Request Completed: ${target.ticketNumber}`
          : isReady
          ? `Ready for Claiming: ${target.ticketNumber}`
          : status === 'rejected'
          ? `Action Needed on ${target.ticketNumber}`
          : `Status Updated: ${target.ticketNumber}`;

      const notifMsg =
        status === 'rejected'
          ? `Registrar requested information: "${reason || 'Please review notes'}"`
          : isCompleted
          ? `Your requested document has been claimed and marked Completed.`
          : isReady
          ? `Your requested document is ready for claiming at the School Registrar Office (Office Pick-up).`
          : `Your request status changed to ${status.toUpperCase()} (${stage}).`;

      const arrival = formatRealtimeArrival();
      setNotifications((prev) => [
        {
          id: generateUniqueId('notif'),
          title: notifTitle,
          message: notifMsg,
          timestamp: arrival.timestamp,
          exactTime: arrival.exactTime,
          dateStr: arrival.dateStr,
          read: false,
          ticketNumber: target.ticketNumber,
          type: (isCompleted || isReady) ? 'release_ready' : 'status_update',
          audience: 'student',
          recipientStudentId: target.studentId,
        },
        ...prev,
      ]);

      if (isCompleted) {
        recordCompletedRequest(
          {
            ...target,
            status: 'completed',
            stage: 'completed',
            actualReleaseDate: formattedNow,
            assignedTo: newAssignee || target.assignedTo,
          },
          reason || 'Document claimed by student; transaction complete.',
          actor
        );
      }
    }
  };

  const passTicketToNextRole = (
    ticketId: string,
    targetStaffName?: string,
    targetStage?: TicketStage,
    customNote?: string,
    actorName?: string
  ) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    const actor = actorName || currentUser?.name || 'Registrar Staff';

    // Find standard role holders in users
    const receiverUser = users.find((u) => u.role === 'receiver') || { name: 'Records Office', role: 'receiver' as const };
    const recordsUser = users.find((u) => u.role === 'records_management') || { name: 'Mr. Ronald Tan', role: 'records_management' as const };
    const evaluatorUser = users.find((u) => u.role === 'evaluator') || { name: 'Ms. Elena Ramos', role: 'evaluator' as const };

    // Determine current role based on who is currently assigned
    const currentAssigneeUser = users.find(
      (u) =>
        u.name.toLowerCase() === ticket.assignedTo.toLowerCase() ||
        ticket.assignedTo.toLowerCase().includes(u.name.toLowerCase())
    );
    const currentRole =
      currentAssigneeUser?.role ||
      (ticket.assignedTo.toLowerCase().includes('receiver') || ticket.assignedTo.toLowerCase().includes('records office')
        ? 'receiver'
        : ticket.assignedTo.toLowerCase().includes('ronald')
        ? 'records_management'
        : ticket.assignedTo.toLowerCase().includes('elena') || ticket.assignedTo.toLowerCase().includes('lee')
        ? 'evaluator'
        : 'receiver');

    let nextStaffName = targetStaffName;
    let nextStage: TicketStage = targetStage || ticket.stage;
    let autoNote = customNote;

    if (!nextStaffName) {
      if (currentRole === 'receiver') {
        // Receiver is done managing -> document goes to Records Management
        nextStaffName = recordsUser.name;
        if (ticket.stage === 'submitted') {
          nextStage = 'processing';
        }
        autoNote =
          autoNote ||
          `Intake completed by Receiver (${actor}). Document passed to Records Management (${nextStaffName}) for grade encoding and verification.`;
      } else if (currentRole === 'records_management') {
        // Records Management is done managing -> returns to Receiver to change status to Ready for Claiming
        nextStaffName = receiverUser.name;
        if (ticket.stage === 'processing') {
          nextStage = 'for_seal';
        }
        autoNote =
          autoNote ||
          `Records management grade encoding and verification completed by ${actor}. Document returned to Receiver (${nextStaffName}) to set Ready for Claiming.`;
      } else if (currentRole === 'evaluator') {
        // Evaluator is done managing -> returns to Receiver for Claiming
        nextStaffName = receiverUser.name;
        if (ticket.stage === 'processing' || ticket.stage === 'for_seal') {
          nextStage = 'for_seal';
        }
        autoNote =
          autoNote ||
          `Evaluation completed by Evaluator (${actor}). Document returned to Receiver (${nextStaffName}) to set Ready for Claiming.`;
      } else {
        nextStaffName = receiverUser.name;
        autoNote = autoNote || `Document processed by ${actor}. Returned to Receiver (${nextStaffName}).`;
      }
    }

    const matchedNextUser = users.find(
      (u) =>
        u.name === nextStaffName ||
        (nextStaffName && nextStaffName.startsWith(u.name)) ||
        (nextStaffName && u.name.toLowerCase() === nextStaffName.toLowerCase())
    );
    const finalStaffName = matchedNextUser ? matchedNextUser.name : (nextStaffName || ticket.assignedTo);
    const finalRole = matchedNextUser?.role;

    const now = new Date();
    const formattedNow = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newHistoryEvent: TimelineEvent = {
      stage: nextStage,
      title: `Handed Off to ${finalStaffName}`,
      timestamp: formattedNow,
      notes: autoNote || `Document forwarded to ${finalStaffName}.`,
      actor,
      isCurrent: true,
      isPassed: false,
    };

    let nextStatus: TicketStatus = ticket.status;
    if (nextStage === 'completed') nextStatus = 'completed';
    else if (nextStage === 'submitted') nextStatus = 'pending';
    else nextStatus = 'processing';

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          status: nextStatus,
          stage: nextStage,
          assignedTo: finalStaffName,
          assignedStaff: finalStaffName,
          assignedEvaluator: finalStaffName,
          assignedRole: finalRole,
          updatedAt: new Date().toISOString(),
          actualReleaseDate: nextStage === 'completed' ? formattedNow : t.actualReleaseDate,
          timelineHistory: [...t.timelineHistory.map((h) => ({ ...h, isCurrent: false })), newHistoryEvent],
        };
      })
    );

    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: nextStatus,
          stage: nextStage,
          assignedTo: finalStaffName,
          assignedStaff: finalStaffName,
          assignedEvaluator: finalStaffName,
          assignedRole: finalRole,
          updatedAt: new Date().toISOString(),
          actualReleaseDate: nextStage === 'completed' ? formattedNow : prev.actualReleaseDate,
          timelineHistory: [...prev.timelineHistory.map((h) => ({ ...h, isCurrent: false })), newHistoryEvent],
        };
      });
    }

    addAuditLog(
      'DOCUMENT_FORWARDED_TO_ROLE',
      'Ticket',
      `Document #${ticket.ticketNumber} handed off from ${actor} to ${finalStaffName} (${finalRole || 'Staff'}). Next Stage: ${nextStage}.`,
      'info'
    );
    addSystemActivity(
      `Document #${ticket.ticketNumber} passed to ${finalStaffName}`,
      actor,
      'assignment',
      ticket.ticketNumber
    );

    const arrival = formatRealtimeArrival();
    setNotifications((prev) => [
      {
        id: generateUniqueId('notif'),
        title: `Document Forwarded: #${ticket.ticketNumber}`,
        message: `Your document has been transferred to ${finalStaffName} (${finalRole?.replace('_', ' ') || 'Staff'}) for the next processing milestone.`,
        timestamp: arrival.timestamp,
        exactTime: arrival.exactTime,
        dateStr: arrival.dateStr,
        read: false,
        ticketNumber: ticket.ticketNumber,
        type: 'status_update',
        audience: 'student',
        recipientStudentId: ticket.studentId,
      },
      ...prev,
    ]);
  };

  const getOfficerRole = (user: AuthenticatedUser | null): 'receiver' | 'records_management' | 'evaluator' | 'registrar' | 'superadmin' | 'other' => {
    if (!user) return 'other';
    if (user.role === 'superadmin') return 'superadmin';
    if (user.staffRole === 'receiver' || user.staffRole === 'records_management' || user.staffRole === 'evaluator') {
      return user.staffRole;
    }
    const title = (user.adminRoleTitle || '').toLowerCase();
    const name = (user.name || '').toLowerCase();
    if (title.includes('receiver') || name.includes('records office') || name.includes('receiver') || title.includes('receiving')) return 'receiver';
    if (title.includes('records management') || name.includes('ronald') || title.includes('records_management') || name.includes('records management')) return 'records_management';
    if (title.includes('evaluator') || name.includes('elena') || name.includes('lee')) return 'evaluator';
    if (user.staffRole) return user.staffRole as any;
    return 'registrar';
  };

  const officerRole = getOfficerRole(currentUser);
  const isReceiver = officerRole === 'receiver';
  const isRecordsManagement = officerRole === 'records_management';
  const isEvaluator = officerRole === 'evaluator';
  const canAccessApplicationForm = isReceiver || currentUser?.role === 'superadmin';

  const deleteTicket = (ticketId: string, reason: string = 'Cancelled upon student request at office') => {
    const target = tickets.find((t) => t.id === ticketId);
    if (!target) return;

    const arrival = formatRealtimeArrival();
    const currentOfficerRole = getOfficerRole(currentUser);
    const officerName = currentUser?.name || 'Registrar Staff';

    const deletedRecord: DeletedRequestRecord = {
      id: generateUniqueId('del-req'),
      ticketId: target.id,
      ticketNumber: target.ticketNumber,
      studentName: target.studentName,
      studentId: target.studentId,
      email: target.email,
      phone: target.phone,
      degreeProgram: target.degreeProgram,
      yearLevel: target.yearLevel,
      category: target.category,
      documentType: target.documentType,
      subject: target.subject,
      description: target.description,
      priority: target.priority,
      stageAtDeletion: target.stage,
      statusAtDeletion: target.status,
      deletedAt: new Date().toISOString(),
      deletedAtFormatted: `${arrival.dateStr} • ${arrival.exactTime}`,
      deletedByOfficerName: officerName,
      deletedByOfficerRole: currentOfficerRole,
      deletedByOfficerEmail: currentUser?.email,
      reason,
      ticketSnapshot: { ...target },
    };

    setDeletedRequestsHistory((prev) => [deletedRecord, ...prev]);
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));

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

    setNotifications((prev) => [
      {
        id: generateUniqueId('notif'),
        title: `Request Deleted: ${target.ticketNumber}`,
        message: `The document request for ${target.studentName} has been deleted and archived in the private officer history log.`,
        timestamp: arrival.timestamp,
        exactTime: arrival.exactTime,
        dateStr: arrival.dateStr,
        read: false,
        ticketNumber: target.ticketNumber,
        type: 'status_update',
        audience: 'officer',
      },
      ...prev,
    ]);
  };

  const cancelTicket = (ticketId: string, reason?: string) => {
    deleteTicket(ticketId, reason);
  };

  const restoreDeletedTicket = (recordId: string) => {
    const record = deletedRequestsHistory.find((r) => r.id === recordId);
    if (!record) return;

    setTickets((prev) => {
      if (prev.some((t) => t.id === record.ticketSnapshot.id || t.ticketNumber === record.ticketNumber)) {
        return prev;
      }
      return [record.ticketSnapshot, ...prev];
    });

    setDeletedRequestsHistory((prev) => prev.filter((r) => r.id !== recordId));

    addAuditLog(
      'TICKET_RESTORED',
      'Ticket',
      `Document request #${record.ticketNumber} was restored to active queue from Deleted Request History by ${currentUser?.name || 'Staff'}.`,
      'info'
    );
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

    // Super Administrator can review full system deletion records
    if (currentUser.role === 'superadmin' || myRole === 'superadmin' || myName.includes('superadmin') || myName.includes('alexander')) {
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
      if (myRole === 'receiver' && (recRole === 'receiver' || recName.includes('records office') || recName.includes('receiver'))) return true;
      if (myRole === 'records_management' && (recRole === 'records_management' || recRole.includes('records management') || recName.includes('ronald'))) return true;
      if (myRole === 'evaluator' && (recRole === 'evaluator' || recName.includes('elena'))) return true;

      return false;
    });
  };

  const getMyCompletedRequests = () => {
    if (!currentUser) return [];
    const myName = (currentUser.name || '').toLowerCase();
    const myRole = getOfficerRole(currentUser);
    const myEmail = (currentUser.email || '').toLowerCase();

    // Super Administrator can review full system completion records
    if (currentUser.role === 'superadmin' || myRole === 'superadmin' || myName.includes('superadmin') || myName.includes('alexander')) {
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
      if (myRole === 'receiver' && (recRole === 'receiver' || recName.includes('records office') || recName.includes('receiver'))) return true;
      if (myRole === 'records_management' && (recRole === 'records_management' || recRole.includes('records management') || recName.includes('ronald'))) return true;
      if (myRole === 'evaluator' && (recRole === 'evaluator' || recName.includes('elena'))) return true;

      return false;
    });
  };

  const assignTicketStaff = (ticketId: string, staffName: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          assignedTo: staffName,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const updateTicketPriority = (ticketId: string, priority: TicketPriority) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, priority, updatedAt: new Date().toISOString() } : t))
    );
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

  const sendTicketMessage = (
    ticketId: string,
    messageText: string,
    senderRole: 'student' | 'registrar',
    senderName: string
  ) => {
    const arrival = formatRealtimeArrival();
    const newMsg: ChatMessage = {
      id: generateUniqueId('msg'),
      ticketId,
      senderRole,
      senderName,
      message: messageText,
      timestamp: `${arrival.dateStr} • ${arrival.exactTime}`,
    };

    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, messages: [...t.messages, newMsg] } : t))
    );

    const target = tickets.find((t) => t.id === ticketId);
    const ticketNo = target?.ticketNumber || 'Ticket';

    if (senderRole === 'registrar') {
      // Notification for Student
      setNotifications((prev) => [
        {
          id: generateUniqueId('notif'),
          title: `Registrar Admin Replied: #${ticketNo}`,
          message: `${senderName} (Registrar) replied: "${messageText.slice(0, 90)}${messageText.length > 90 ? '...' : ''}"`,
          timestamp: arrival.timestamp,
          exactTime: arrival.exactTime,
          dateStr: arrival.dateStr,
          read: false,
          ticketNumber: target?.ticketNumber,
          type: 'chat_message',
          audience: 'student',
          recipientStudentId: target?.studentId,
        },
        ...prev,
      ]);
    } else {
      // Notification for Registrar Admins so they don't have to check one by one
      setNotifications((prev) => [
        {
          id: generateUniqueId('notif'),
          title: `New Student Message on #${ticketNo}`,
          message: `${senderName} sent a message regarding Ticket #${ticketNo}: "${messageText.slice(0, 90)}${messageText.length > 90 ? '...' : ''}"`,
          timestamp: arrival.timestamp,
          exactTime: arrival.exactTime,
          dateStr: arrival.dateStr,
          read: false,
          ticketNumber: target?.ticketNumber,
          type: 'chat_message',
          audience: 'officer',
        },
        ...prev,
      ]);

      // Simulate registrar desk auto-reply
      setTimeout(() => {
        const autoArrival = formatRealtimeArrival();
        const autoReply: ChatMessage = {
          id: generateUniqueId('msg'),
          ticketId,
          senderRole: 'registrar',
          senderName: 'Registrar Helpdesk Desk Officer',
          message:
            'Thank you for your message. An evaluator has received your note and will review your file without requiring an in-person visit.',
          timestamp: `${autoArrival.dateStr} • ${autoArrival.exactTime}`,
        };
        setTickets((prev) =>
          prev.map((t) => (t.id === ticketId ? { ...t, messages: [...t.messages, autoReply] } : t))
        );

        // Also notify student of registrar response
        setNotifications((prev) => [
          {
            id: generateUniqueId('notif'),
            title: `Registrar Auto-Reply: #${ticketNo}`,
            message: `Registrar Desk Officer replied: "Thank you for your message. An evaluator has received your note..."`,
            timestamp: autoArrival.timestamp,
            exactTime: autoArrival.exactTime,
            dateStr: autoArrival.dateStr,
            read: false,
            ticketNumber: target?.ticketNumber,
            type: 'chat_message',
            audience: 'student',
            recipientStudentId: target?.studentId,
          },
          ...prev,
        ]);
      }, 1200);
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => markNotificationReadForAccount(prev, id, currentUser, tickets));
  };

  const notifications = getNotificationsForAccount(allNotifications, currentUser, tickets);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Stats computation - matching exact stats numbers or live dynamic count
  // User prompt example: Pending Requests 24, Processing 15, Completed Today 18, Total Requests 157
  const basePending = 21;
  const baseProcessing = 12;
  const baseCompletedToday = 17;
  const baseTotal = 151;

  const dynamicPending = tickets.filter((t) => t.status === 'pending').length;
  const dynamicProcessing = tickets.filter((t) => t.status === 'processing').length;
  const dynamicCompleted = tickets.filter((t) => t.status === 'completed').length;
  const urgentCount = tickets.filter(
    (t) => t.priority === 'Urgent' || t.priority === 'Deadline-sensitive'
  ).length;

  const stats: HelpdeskStats = {
    pendingRequests: basePending + dynamicPending,
    processing: baseProcessing + dynamicProcessing,
    completedToday: baseCompletedToday + dynamicCompleted,
    totalRequests: baseTotal + tickets.length,
    urgentTickets: urgentCount + 4,
    avgTurnaroundDays: 2.4,
  };

  const addAuditLog = (
    action: string,
    category: AuditLog['category'],
    details: string,
    severity: AuditLog['severity'] = 'info'
  ) => {
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
      actorName: currentUser?.name || 'Dr. Alexander Reyes',
      actorRole: currentUser?.role === 'superadmin' ? 'Super Administrator' : currentUser?.role === 'admin' ? 'Registrar Evaluator' : 'Student',
      action,
      category,
      details,
      ipAddress: '10.0.4.12',
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

  const createUser = (userData: Omit<UserAccount, 'id' | 'createdAt' | 'lastLogin'>) => {
    const newId = generateUniqueId('usr');
    const newUser: UserAccount = {
      ...userData,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: 'Never',
    };
    setUsers((prev) => [newUser, ...prev]);

    // If this account email, studentId or name was in deletedAccounts blacklist, restore authorization
    setDeletedAccounts((prev) => {
      const next = prev.filter(
        (d) =>
          (newUser.email && d.email !== newUser.email.toLowerCase()) &&
          (newUser.name && d.name !== newUser.name.toLowerCase()) &&
          (!newUser.studentId || d.studentId !== newUser.studentId)
      );
      try {
        localStorage.setItem(DELETED_ACCOUNTS_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    // Automatically save user identity into studentRecords if role is student
    if (newUser.role === 'student' && newUser.studentId) {
      const exists = studentRecords.some((s) => s.studentId === newUser.studentId);
      if (!exists) {
        const newStudent: StudentProfile = {
          id: generateUniqueId('stu'),
          studentId: newUser.studentId,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phoneNumber || '+63 917 555 0192',
          degreeProgram: 'BS Computer Science',
          yearLevel: '1st Year',
          enrollmentStatus: 'Regular',
          academicStanding: 'Good Standing',
          unitsEnrolled: 18,
          isArchived: false,
          requestCount: 0,
          joinedDate: new Date().toISOString().split('T')[0],
          profilePicture: newUser.profilePicture,
        };
        setStudentRecords((prev) => [newStudent, ...prev]);
      }
    }

    addAuditLog('USER_CREATED', 'Auth', `Created user account for ${newUser.name} with role ${newUser.role}.`, 'success');
    addSystemActivity(`New ${newUser.role} account created for ${newUser.name}`, currentUser?.name || 'Super Admin', 'account_created');
  };

  const updateUser = (id: string, updates: Partial<UserAccount>) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      addAuditLog('USER_UPDATED', 'Auth', `Updated account details for ${updates.name || user.name}.`, 'info');
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  };

  const deleteUser = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));

    // Add to deletedAccounts blacklist so this account can NEVER be opened again
    const entry = {
      id: user.id,
      email: user.email?.toLowerCase(),
      studentId: user.studentId,
      name: user.name?.toLowerCase(),
      deletedAt: new Date().toISOString(),
    };
    setDeletedAccounts((prev) => {
      const next = [...prev, entry];
      try {
        localStorage.setItem(DELETED_ACCOUNTS_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    addAuditLog('USER_DELETED', 'Auth', `Permanently deleted user account ${user.name} (${user.email}). Account is barred from further logins.`, 'warning');
    addSystemActivity(`Account removed permanently: ${user.name}`, currentUser?.name || 'Super Admin', 'setting_updated');

    // If currently logged in user is the deleted account, immediately kick out and log out!
    if (
      currentUser &&
      ((user.email && currentUser.email?.toLowerCase() === user.email.toLowerCase()) ||
       (user.studentId && currentUser.studentId === user.studentId) ||
       currentUser.name.toLowerCase() === user.name.toLowerCase())
    ) {
      logout();
    }
  };

  const changeCurrentAccountPassword = (newPassword: string, oldPassword?: string) => {
    if (!currentUser) {
      return { success: false, error: 'No active session found.' };
    }
    const trimmed = newPassword.trim();
    if (trimmed.length < 4) {
      return { success: false, error: 'New password must be at least 4 characters long.' };
    }

    setUsers((prev) =>
      prev.map((u) => {
        const isMatch =
          (currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          (currentUser.studentId && u.studentId === currentUser.studentId) ||
          u.name.toLowerCase() === currentUser.name.toLowerCase();
        if (isMatch) {
          return { ...u, password: trimmed };
        }
        return u;
      })
    );

    addAuditLog(
      'PASSWORD_CHANGED',
      'Auth',
      `Account password successfully updated for ${currentUser.name} (${currentUser.role}).`,
      'success'
    );
    addSystemActivity(
      `Password successfully changed by ${currentUser.name}`,
      currentUser.name,
      'setting_updated'
    );

    return { success: true };
  };

  const updateCurrentProfilePicture = (pictureDataUrl: string) => {
    if (!currentUser) return;

    setCurrentUser((prev) => (prev ? { ...prev, profilePicture: pictureDataUrl } : null));

    try {
      const updatedUser = { ...currentUser, profilePicture: pictureDataUrl };
      localStorage.setItem(USER_SESSION_KEY, JSON.stringify(updatedUser));
    } catch (e) {
      console.error(e);
    }

    setUsers((prev) =>
      prev.map((u) => {
        const isMatch =
          (currentUser.email && u.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          (currentUser.studentId && u.studentId === currentUser.studentId) ||
          u.name.toLowerCase() === currentUser.name.toLowerCase();
        if (isMatch) {
          return { ...u, profilePicture: pictureDataUrl };
        }
        return u;
      })
    );

    if (currentUser.studentId) {
      setStudentRecords((prev) =>
        prev.map((s) => (s.studentId === currentUser.studentId ? { ...s, profilePicture: pictureDataUrl } : s))
      );
    }

    addAuditLog(
      'PROFILE_PICTURE_UPDATED',
      'Auth',
      `${currentUser.name} updated their account profile picture.`,
      'info'
    );
  };

  const toggleUserStatus = (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      const newStatus: AccountStatus = user.status === 'active' ? 'inactive' : 'active';
      addAuditLog(
        newStatus === 'active' ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
        'Auth',
        `Changed status of ${user.name} to ${newStatus}.`,
        newStatus === 'active' ? 'success' : 'warning'
      );
      addSystemActivity(`User ${user.name} status updated to ${newStatus}`, currentUser?.name || 'Super Admin', 'setting_updated');
    }
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const newStatus: AccountStatus = u.status === 'active' ? 'inactive' : 'active';
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  const resetUserPassword = (id: string) => {
    const user = users.find((u) => u.id === id);
    const tempPassword = `MSU#${Math.floor(1000 + Math.random() * 9000)}!`;
    if (user) {
      addAuditLog('PASSWORD_RESET', 'Auth', `Administrative password reset issued for user ${user.name}.`, 'warning');
      addSystemActivity(`Password reset dispatched for ${user.name}`, currentUser?.name || 'Super Admin', 'setting_updated');
    }
    return tempPassword;
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
    addSystemActivity(`Academic record enrolled for ${newRecord.name} (#${newRecord.studentId})`, currentUser?.name || 'Super Admin', 'account_created');
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
      addSystemActivity(`Student record archived: ${s.name} (#${s.studentId})`, currentUser?.name || 'Super Admin', 'setting_updated');
    }
    setStudentRecords((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isArchived: true } : s))
    );
  };

  const restoreStudentRecord = (id: string) => {
    const s = studentRecords.find((item) => item.id === id);
    if (s) {
      addAuditLog('STUDENT_RESTORED', 'Student', `Restored active status for ${s.name} (ID: ${s.studentId}).`, 'success');
      addSystemActivity(`Student record restored: ${s.name} (#${s.studentId})`, currentUser?.name || 'Super Admin', 'setting_updated');
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
    addSystemActivity(`New system role created: ${newRole.name}`, currentUser?.name || 'Super Admin', 'setting_updated');
  };

  const updateRole = (id: string, updates: Partial<SystemRole>) => {
    const r = roles.find((item) => item.id === id);
    if (r) {
      addAuditLog('ROLE_PERMISSION_UPDATED', 'Role', `Updated role configuration for "${updates.name || r.name}".`, 'warning');
      addSystemActivity(`Role permissions modified for ${updates.name || r.name}`, currentUser?.name || 'Super Admin', 'setting_updated');
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
    addSystemActivity('System Settings updated by Administrator', currentUser?.name || 'Super Admin', 'setting_updated');
    setSystemSettings((prev) => ({ ...prev, ...updates }));
  };

  const reassignTicket = (ticketId: string, newAssignee: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    // Resolve matching staff from users
    const matchedStaff = users.find(
      (u) =>
        u.name === newAssignee ||
        newAssignee.startsWith(u.name) ||
        u.name.toLowerCase() === newAssignee.toLowerCase()
    );
    const staffName = matchedStaff ? matchedStaff.name : newAssignee;
    const staffRole = matchedStaff?.role;

    const now = new Date();
    const formattedNow = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newTimelineEvent: TimelineEvent = {
      stage: ticket.stage,
      title: 'Staff Reassignment',
      timestamp: formattedNow,
      notes: `Ticket reassigned to ${staffName} by Super Admin (${currentUser?.name || 'Super Admin'}).`,
      actor: currentUser?.name || 'Super Admin',
      isCurrent: true,
      isPassed: false,
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          assignedTo: staffName,
          assignedStaff: staffName,
          assignedEvaluator: staffName,
          assignedRole: staffRole,
          updatedAt: new Date().toISOString(),
          timelineHistory: [...t.timelineHistory.map((h) => ({ ...h, isCurrent: false })), newTimelineEvent],
        };
      })
    );

    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          assignedTo: staffName,
          assignedStaff: staffName,
          assignedEvaluator: staffName,
          assignedRole: staffRole,
          updatedAt: new Date().toISOString(),
          timelineHistory: [...prev.timelineHistory.map((h) => ({ ...h, isCurrent: false })), newTimelineEvent],
        };
      });
    }

    addAuditLog(
      'TICKET_REASSIGNED',
      'Ticket',
      `Ticket #${ticket.ticketNumber} reassigned to ${staffName} (${staffRole || 'Staff'}) by Super Admin.`,
      'info'
    );
    addSystemActivity(
      `Ticket #${ticket.ticketNumber} reassigned to ${staffName}`,
      currentUser?.name || 'Super Admin',
      'assignment',
      ticket.ticketNumber
    );

    const arrival = formatRealtimeArrival();
    setNotifications((prev) => [
      {
        id: generateUniqueId('notif'),
        title: `Ticket Reassigned: #${ticket.ticketNumber}`,
        message: `Super Admin reassigned ticket #${ticket.ticketNumber} to ${staffName}.`,
        timestamp: arrival.timestamp,
        exactTime: arrival.exactTime,
        dateStr: arrival.dateStr,
        read: false,
        ticketNumber: ticket.ticketNumber,
        type: 'status_update',
        audience: 'student',
        recipientStudentId: ticket.studentId,
      },
      ...prev,
    ]);
  };

  const forceCloseTicket = (ticketId: string, reason: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'completed',
              stage: 'completed',
              internalNotes: [
                ...t.internalNotes,
                {
                  id: generateUniqueId('note'),
                  ticketId,
                  author: currentUser?.name || 'Super Admin',
                  authorRole: 'Super Administrator',
                  note: `[ADMIN FORCE-CLOSE]: ${reason}`,
                  timestamp: new Date().toLocaleString(),
                },
              ],
            }
          : t
      )
    );

    addAuditLog('TICKET_FORCE_CLOSED', 'Ticket', `Ticket #${ticket.ticketNumber} force-closed by Super Admin. Reason: ${reason}`, 'warning');
    addSystemActivity(`Ticket #${ticket.ticketNumber} marked Resolved by Super Admin`, currentUser?.name || 'Super Admin', 'ticket_resolved', ticket.ticketNumber);
  };

  const reopenTicket = (ticketId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: 'processing',
              stage: 'processing',
            }
          : t
      )
    );

    addAuditLog('TICKET_REOPENED', 'Ticket', `Ticket #${ticket.ticketNumber} reopened by Super Admin.`, 'info');
    addSystemActivity(`Ticket #${ticket.ticketNumber} reopened for processing`, currentUser?.name || 'Super Admin', 'status_change', ticket.ticketNumber);
  };

  const updateTicketPrioritySuperAdmin = (ticketId: string, priority: TicketPriority) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;

    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, priority } : t))
    );

    addAuditLog('TICKET_PRIORITY_CHANGED', 'Ticket', `Ticket #${ticket.ticketNumber} priority set to "${priority}".`, 'info');
    addSystemActivity(`Ticket #${ticket.ticketNumber} priority changed to ${priority}`, currentUser?.name || 'Super Admin', 'status_change', ticket.ticketNumber);
  };

  const createSuperAnnouncement = (announcement: Omit<Announcement, 'id' | 'date'>) => {
    const newAnn: Announcement = {
      ...announcement,
      id: generateUniqueId('ann'),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    addAuditLog('ANNOUNCEMENT_PUBLISHED', 'System', `Published institutional announcement: "${newAnn.title}".`, 'info');
    addSystemActivity(`Broadcast announcement published: "${newAnn.title}"`, currentUser?.name || 'Super Admin', 'setting_updated');
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
    };
    addAuditLog('BACKUP_CREATED', 'Backup', 'System database backup snapshot exported by Super Administrator.', 'success');
    return JSON.stringify(backupData, null, 2);
  };

  const restoreSystemBackup = (jsonContent: string): { success: boolean; error?: string } => {
    try {
      const data = JSON.parse(jsonContent);
      if (!data.users || !data.tickets) {
        return { success: false, error: 'Invalid backup structure. Required entities are missing.' };
      }
      if (Array.isArray(data.users)) setUsers(data.users);
      if (Array.isArray(data.studentRecords)) setStudentRecords(data.studentRecords);
      if (Array.isArray(data.roles)) setRoles(data.roles);
      if (Array.isArray(data.tickets)) setTickets(data.tickets);
      if (Array.isArray(data.requestCategories)) setRequestCategories(data.requestCategories);
      if (data.systemSettings) setSystemSettings(data.systemSettings);
      if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
      if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);

      addAuditLog('BACKUP_RESTORED', 'Backup', 'System state successfully restored from snapshot.', 'warning');
      addSystemActivity('System database restored from external snapshot', currentUser?.name || 'Super Admin', 'setting_updated');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to parse JSON file.' };
    }
  };

  const resetDemoData = () => {
    setTickets(INITIAL_TICKETS);
    setUsers(INITIAL_USERS);
    setStudentRecords(INITIAL_STUDENT_RECORDS);
    setRoles(INITIAL_ROLES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setSystemActivities(INITIAL_SYSTEM_ACTIVITIES);
    setRequestCategories(INITIAL_REQUEST_CATEGORIES);
    setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setDeletedRequestsHistory(INITIAL_DELETED_REQUESTS);
    setCompletedRequestsHistory(INITIAL_COMPLETED_REQUESTS);

    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
    localStorage.removeItem(USERS_STORAGE_KEY);
    localStorage.removeItem(STUDENTS_STORAGE_KEY);
    localStorage.removeItem(ROLES_STORAGE_KEY);
    localStorage.removeItem(AUDIT_STORAGE_KEY);
    localStorage.removeItem(ACTIVITIES_STORAGE_KEY);
    localStorage.removeItem(CATEGORIES_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(ANNOUNCEMENTS_STORAGE_KEY);
    localStorage.removeItem(DELETED_REQUESTS_KEY);
    localStorage.removeItem(COMPLETED_REQUESTS_KEY);
  };

  return (
    <HelpdeskContext.Provider
      value={{
        isAuthenticated,
        currentUser,
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
        updateTicketStatus,
        passTicketToNextRole,
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
        roles,
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
        staffList,
        faqs,
        announcements,
        stats,
        notifications,
        markNotificationAsRead,
        unreadCount,
        resetDemoData,
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
