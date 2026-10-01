import type { AppNotification } from '../context/HelpdeskContext';
import type { AuthenticatedUser, Ticket } from '../types';

type Account = Pick<AuthenticatedUser, 'role' | 'studentId'> | null;
type RequestOwner = Pick<Ticket, 'ticketNumber' | 'studentId'>;

/** Legacy entries without a recipient are visible only when ownership is provable. */
function belongsToStudent(notification: AppNotification, studentId: string, tickets: RequestOwner[]): boolean {
  if (notification.audience === 'officer') return false;

  if (notification.recipientStudentId) {
    if (notification.recipientStudentId !== studentId) return false;
    const ticket = tickets.find((request) => request.ticketNumber === notification.ticketNumber);
    return !ticket || ticket.studentId === studentId;
  }

  if (!notification.ticketNumber) return false;
  const ticket = tickets.find((request) => request.ticketNumber === notification.ticketNumber);
  if (!ticket || ticket.studentId !== studentId) return false;

  // Older persisted alerts did not distinguish incoming registrar replies
  // from notifications sent to officers when a student wrote a message.
  if (notification.type === 'chat_message') {
    return /^Registrar (Message Received|Admin Replied:|Auto-Reply:)/i.test(notification.title);
  }
  if (notification.type === 'announcement') return false;
  return !/^Request Deleted:/i.test(notification.title);
}

export function getNotificationsForAccount(
  notifications: AppNotification[],
  account: Account,
  tickets: RequestOwner[],
): AppNotification[] {
  if (!account) return [];
  // Preserve the existing officer/registrar feed and its read flags.
  if (account.role !== 'student') return notifications;
  const studentId = account.studentId;
  if (!studentId) return [];

  return notifications
    .filter((notification) => belongsToStudent(notification, studentId, tickets))
    .map((notification) => ({
      ...notification,
      read: notification.readByStudentIds?.includes(studentId) ?? false,
    }));
}

export function markNotificationReadForAccount(
  notifications: AppNotification[],
  notificationId: string,
  account: Account,
  tickets: RequestOwner[],
): AppNotification[] {
  if (!account) return notifications;
  if (account.role !== 'student') {
    return notifications.map((notification) =>
      notification.id === notificationId ? { ...notification, read: true } : notification,
    );
  }
  const studentId = account.studentId;
  if (!studentId) return notifications;
  return notifications.map((notification) => {
    if (notification.id !== notificationId || !belongsToStudent(notification, studentId, tickets)) {
      return notification;
    }
    return {
      ...notification,
      readByStudentIds: [...new Set([...(notification.readByStudentIds ?? []), studentId])],
    };
  });
}