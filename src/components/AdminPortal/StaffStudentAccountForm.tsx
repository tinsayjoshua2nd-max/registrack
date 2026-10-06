import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { StudentRegistrationModal } from '../Common/StudentRegistrationModal';
import { CheckCircle2, UserPlus } from 'lucide-react';

export const StaffStudentAccountForm: React.FC = () => {
  const { currentUser } = useHelpdesk();
  const [isOpen, setIsOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const canRegisterStudent =
    currentUser?.staffRole === 'receiver' || currentUser?.role === 'superadmin';

  if (!canRegisterStudent) return null;

  return (
    <>
      <div className="mb-6 flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
        {notification && (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            <span>{notification}</span>
          </div>
        )}
        <button
          id="staff-student-account-open"
          type="button"
          onClick={() => {
            setNotification(null);
            setIsOpen(true);
          }}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 py-2 text-xs font-bold text-emerald-900 transition-colors hover:bg-emerald-50"
        >
          <UserPlus className="h-4 w-4" />
          Register New Student Profile
        </button>
      </div>
      <StudentRegistrationModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onCreated={(name) => setNotification(`Student profile ${name} and login account registered successfully.`)}
      />
    </>
  );
};
