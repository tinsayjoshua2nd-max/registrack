export interface AuthenticatedUser {
  role: 'student' | 'admin' | 'superadmin';
  name: string;
  studentId?: string; // 8 numbers only e.g. "20231492"
  email?: string;
  degreeProgram?: string;
  yearLevel?: string;
  adminRoleTitle?: string;
  staffRole?: AccountRoleType;
  office?: string;
  permissions?: string[];
  profilePicture?: string;
}

export type UserRole = 'student' | 'admin' | 'superadmin';

export type SuperAdminNavView =
  | 'dashboard'
  | 'users'
  | 'tickets'
  | 'students'
  | 'announcements'
  | 'reports'
  | 'audit-logs'
  | 'notifications'
  | 'settings'
  | 'backup'
  | 'history'
  | 'request-history';

export type TicketCategory =
  | 'TOR'
  | 'Honorable Dismissal'
  | 'Certificate of Registration'
  | 'Certificate of Graduation'
  | 'Certificate of Grades'
  | 'Form 137 / SF10'
  | 'English as Medium of Instruction'
  | 'Letter of No Objection'
  | 'Certificate of GWA'
  | 'Certificate of Latin Honors / SAC'
  | 'Diploma'
  | 'CAV'
  | 'Certified True Copies'
  | 'Other'
  | 'Transcript of Records'
  | 'Certificates'
  | 'Enrollment'
  | 'Grades'
  | 'Clearance'
  | 'ID concerns'
  | 'Student Records'
  | string;

export type TicketStatus = 'pending' | 'processing' | 'completed' | 'rejected';

export type TicketStage = 'submitted' | 'processing' | 'for_seal' | 'ready' | 'completed' | 'reviewed' | string;

export type TicketPriority = 'Normal' | 'Urgent' | 'Deadline-sensitive';

export type DocumentType =
  | 'None'
  | 'TOR'
  | 'Certificate of Enrollment'
  | 'Certificate of Grades'
  | 'Good Moral Certificate'
  | 'Authentication requests'
  | string;

export type DeliveryOption = 'Office Pick-up' | 'Digital Copy (Official PDF)' | 'Courier Delivery';

export interface ChatMessage {
  id: string;
  ticketId: string;
  senderRole: 'student' | 'registrar';
  senderName: string;
  avatar?: string;
  message: string;
  timestamp: string;
}

export interface InternalNote {
  id: string;
  ticketId: string;
  author: string;
  authorRole: string;
  note: string;
  timestamp: string;
}

export interface TimelineEvent {
  stage: TicketStage;
  title: string;
  timestamp: string;
  notes?: string;
  actor: string;
  isCurrent?: boolean;
  isPassed?: boolean;
}

export interface Ticket {
  id: string;
  ticketNumber: string; // e.g. "REG-2026-00125"
  studentName: string;
  studentId: string; // e.g. "2023-01492"
  email: string;
  phone: string;
  degreeProgram: string;
  yearLevel: string;
  
  category: TicketCategory;
  documentType: DocumentType;
  copies?: number;
  purpose?: string;
  deliveryOption?: 'Office Pick-up' | 'Digital Copy (Official PDF)' | 'Courier Delivery';
  
  subject: string;
  description: string;
  
  status: TicketStatus;
  stage: TicketStage;
  priority: TicketPriority;
  
  assignedTo: string; // e.g. "Records Office" or "Ms. Elena Ramos (Records Office)"
  assignedStaff?: string;
  assignedEvaluator?: string;
  assignedRole?: string;
  
  createdAt: string;
  updatedAt: string;
  estimatedReleaseDate: string;
  actualReleaseDate?: string;
  
  releaseLocation?: string;
  claimingRequirements: string[];
  rejectionReason?: string;
  
  messages: ChatMessage[];
  internalNotes: InternalNote[];
  timelineHistory: TimelineEvent[];
}

export interface Announcement {
  id: string;
  title: string;
  category: 'schedule' | 'holiday' | 'deadline' | 'document' | 'maintenance';
  badgeLabel: string;
  date: string;
  summary: string;
  details: string;
  isImportant?: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  relatedCategory?: TicketCategory;
  steps?: string[];
  turnaroundTime?: string;
  requirements?: string[];
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  office: string;
  email: string;
  activeTicketsCount: number;
}

export interface HelpdeskStats {
  pendingRequests: number;
  processing: number;
  completedToday: number;
  totalRequests: number;
  urgentTickets: number;
  avgTurnaroundDays: number;
}

export type AccountRoleType =
  | 'student'
  | 'registrar'
  | 'receiver'
  | 'records_management'
  | 'evaluator'
  | 'staff'
  | 'admin'
  | 'superadmin';
export type AccountStatus = 'active' | 'inactive' | 'suspended';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: AccountRoleType;
  status: AccountStatus;
  departmentOrOffice: string;
  password?: string;
  studentId?: string; // 8 digits if student
  phoneNumber?: string;
  lastLogin: string;
  createdAt: string;
  avatarColor?: string;
  profilePicture?: string;
}

export interface StudentProfile {
  id: string;
  studentId: string; // 8 numbers only e.g. "20231492"
  name: string;
  email: string;
  phone: string;
  degreeProgram: string;
  yearLevel: string;
  enrollmentStatus: 'Regular' | 'Irregular' | 'Graduating' | 'Alumni' | 'On Leave';
  academicStanding?: 'Good Standing' | "Dean's Lister" | 'Academic Warning' | 'Probation';
  unitsEnrolled: number;
  isArchived: boolean;
  requestCount: number;
  joinedDate: string;
  profilePicture?: string;
}

export interface RolePermissions {
  tickets: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  students: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  documents: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  announcements: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  users: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  reports: { view: boolean; export: boolean };
  settings: { view: boolean; edit: boolean };
  auditLogs: { view: boolean; export: boolean };
}

export interface SystemRole {
  id: string;
  name: string;
  description: string;
  isSystemDefault: boolean;
  userCount: number;
  permissions: RolePermissions;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  category: 'Auth' | 'Ticket' | 'Student' | 'Role' | 'Announcement' | 'System' | 'Backup';
  details: string;
  ipAddress: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface SystemActivityItem {
  id: string;
  timeStr: string;
  text: string;
  actor: string;
  actionType: 'assignment' | 'status_change' | 'document_upload' | 'ticket_resolved' | 'account_created' | 'setting_updated';
  ticketNumber?: string;
  timestamp: string;
}

export interface RequestCategoryConfig {
  id: string;
  name: string;
  code: string;
  description: string;
  turnaroundDays: number;
  fee: number;
  requiredDocuments: string[];
  active: boolean;
}

export interface SystemSettings {
  schoolName: string;
  schoolCode: string;
  officeName: string;
  schoolAddress: string;
  contactEmail: string;
  contactPhone: string;
  academicYear: string;
  semester: string;
  emailNotificationsEnabled: boolean;
  smsAlertsEnabled: boolean;
  autoAssignmentEnabled: boolean;
  maxPendingTicketsPerStaff: number;
  allowStudentRegistration: boolean;
  maintenanceMode: boolean;
  emailTemplates: {
    ticketCreated: string;
    ticketReady: string;
    ticketResolved: string;
  };
}

export interface DeletedRequestRecord {
  id: string;
  ticketId: string;
  ticketNumber: string;
  studentName: string;
  studentId: string;
  email?: string;
  phone?: string;
  degreeProgram?: string;
  yearLevel?: string;
  category: TicketCategory;
  documentType: DocumentType;
  subject: string;
  description: string;
  priority: TicketPriority;
  stageAtDeletion: TicketStage;
  statusAtDeletion: TicketStatus;
  deletedAt: string;
  deletedAtFormatted: string;
  deletedByOfficerName: string;
  deletedByOfficerRole: string; // e.g. 'receiver' | 'records_management' | 'evaluator'
  deletedByOfficerEmail?: string;
  reason: string;
  ticketSnapshot: Ticket;
}

export interface CompletedRequestRecord {
  id: string;
  ticketId: string;
  ticketNumber: string;
  studentName: string;
  studentId: string;
  email?: string;
  phone?: string;
  degreeProgram?: string;
  yearLevel?: string;
  category: TicketCategory;
  documentType: DocumentType;
  subject: string;
  description: string;
  priority: TicketPriority;
  completedAt: string;
  completedAtFormatted: string;
  completedByOfficerName: string;
  completedByOfficerRole: string; // e.g. 'receiver' | 'records_management' | 'evaluator'
  completedByOfficerEmail?: string;
  releaseDate?: string;
  releaseLocation?: string;
  notes?: string;
  ticketSnapshot: Ticket;
}

