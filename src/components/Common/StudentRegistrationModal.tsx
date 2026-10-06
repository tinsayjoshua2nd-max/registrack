import React, { useRef, useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { StudentProfile } from '../../types';
import { AlertCircle, GraduationCap, X } from 'lucide-react';

interface StudentRegistrationModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}

interface RegistrationForm {
  studentId: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  degreeProgram: string;
  yearLevel: string;
  enrollmentStatus: StudentProfile['enrollmentStatus'];
}

const createInitialForm = (): RegistrationForm => ({
  studentId: '',
  name: '',
  email: '',
  password: '',
  phone: '',
  degreeProgram: 'BS Computer Science',
  yearLevel: '1st Year',
  enrollmentStatus: 'Regular',
});

export const StudentRegistrationModal: React.FC<StudentRegistrationModalProps> = ({
  open,
  onClose,
  onCreated,
}) => {
  const { currentUser, studentRecords, users, createUser } = useHelpdesk();
  const [form, setForm] = useState<RegistrationForm>(createInitialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const isReceiver = currentUser?.staffRole === 'receiver';
  const isRegistrar = currentUser?.role === 'superadmin';
  const matchingProfile =
    isReceiver && /^\d{8}$/.test(form.studentId)
      ? studentRecords.find((record) => record.studentId === form.studentId)
      : undefined;
  const matchingAccount = /^\d{8}$/.test(form.studentId)
    ? users.find((user) => user.role === 'student' && user.studentId === form.studentId)
    : undefined;
  const hasLoginAccount = Boolean(matchingProfile?.hasLoginAccount || matchingAccount);
  const blockedRecord = Boolean(isReceiver && (matchingProfile?.isArchived || hasLoginAccount));
  const identityLocked = Boolean(isReceiver && matchingProfile);

  if (!open || (!isReceiver && !isRegistrar)) return null;

  const resetForm = () => {
    setForm(createInitialForm());
    setFormError(null);
  };

  const handleClose = () => {
    if (submittingRef.current) return;
    resetForm();
    onClose();
  };

  const handleStudentIdChange = (value: string) => {
    const studentId = value.replace(/\D/g, '').slice(0, 8);
    const existingProfile =
      isReceiver && /^\d{8}$/.test(studentId)
        ? studentRecords.find((record) => record.studentId === studentId)
        : undefined;

    setForm((previous) => {
      if (existingProfile) {
        return {
          ...previous,
          studentId,
          name: existingProfile.name,
          email: existingProfile.email,
          phone: existingProfile.phone || '',
          degreeProgram: existingProfile.degreeProgram || 'BS Computer Science',
          yearLevel: existingProfile.yearLevel || '1st Year',
          enrollmentStatus: existingProfile.enrollmentStatus || 'Regular',
        };
      }

      const previousWasMatchedRecord =
        isReceiver &&
        /^\d{8}$/.test(previous.studentId) &&
        studentRecords.some((record) => record.studentId === previous.studentId);
      return previousWasMatchedRecord
        ? { ...createInitialForm(), studentId }
        : { ...previous, studentId };
    });
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setFormError(null);

    const cleanId = form.studentId.trim();
    const cleanName = form.name.trim();
    const selectedOfficialProfile = isReceiver ? matchingProfile : undefined;

    if (!/^\d{8}$/.test(cleanId)) {
      setFormError('Student ID must be exactly 8 digits (e.g. 20241092).');
      return;
    }
    if (!cleanName) {
      setFormError('Student full name is required.');
      return;
    }
    if (form.password.length < 8) {
      setFormError('Set an initial password with at least 8 characters.');
      return;
    }
    if (isReceiver && (blockedRecord || (matchingAccount && !matchingProfile))) {
      setFormError(
        matchingProfile?.isArchived
          ? 'This official student record is archived. Ask the Registrar Officer to review it.'
          : 'A student login account already exists for this ID.'
      );
      return;
    }

    const name = selectedOfficialProfile?.name || cleanName;
    const email = selectedOfficialProfile?.email || form.email.trim();
    const phone = selectedOfficialProfile?.phone || form.phone.trim();
    const degreeProgram = selectedOfficialProfile?.degreeProgram || form.degreeProgram;
    const yearLevel = selectedOfficialProfile?.yearLevel || form.yearLevel;
    const enrollmentStatus = selectedOfficialProfile?.enrollmentStatus || form.enrollmentStatus;
    const unitsEnrolled = selectedOfficialProfile?.unitsEnrolled ?? 18;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await createUser({
        name,
        email,
        role: 'student',
        status: 'active',
        studentId: cleanId,
        phoneNumber: phone.trim() || undefined,
        password: form.password,
        departmentOrOffice: degreeProgram,
        degreeProgram,
        yearLevel,
        enrollmentStatus,
        unitsEnrolled,
      });
      resetForm();
      onCreated(name);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create this student account.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const updateField = <K extends keyof RegistrationForm,>(field: K, value: RegistrationForm[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-registration-title"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <GraduationCap className="h-5 w-5 shrink-0 text-emerald-800" />
            <h3 id="student-registration-title" className="font-heading text-base font-bold text-stone-900">
              Register Official Student Profile
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close student registration"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {formError && (
          <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs" aria-busy={isSubmitting}>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
            <label htmlFor="new-student-id" className="mb-1 block font-bold text-emerald-950">
              Student ID (Mandatory 8 Digits) <span className="text-rose-600">*</span>
            </label>
            <input
              id="new-student-id"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{8}"
              maxLength={8}
              required
              placeholder="e.g. 20241098"
              value={form.studentId}
              onChange={(event) => handleStudentIdChange(event.target.value)}
              readOnly={identityLocked}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 font-mono text-sm font-bold tracking-widest outline-none focus:border-emerald-600 read-only:bg-stone-100 disabled:opacity-60"
            />
            <p className="mt-1 text-[10px] text-emerald-800">
              Format strictly validated to exactly 8 numerical digits.
            </p>
          </div>

          {isReceiver && matchingProfile && (
            <div
              className={`rounded-xl border p-3 text-xs leading-relaxed ${
                blockedRecord
                  ? 'border-amber-200 bg-amber-50 text-amber-950'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-950'
              }`}
            >
              <p role={blockedRecord ? 'alert' : 'status'}>
                {matchingProfile.isArchived
                  ? 'This ID belongs to an archived official record. Account creation is disabled; ask the Registrar Officer to review the record.'
                  : hasLoginAccount
                  ? 'This existing official record already has a student login account. No changes will be made.'
                  : 'An existing official student record matches this ID. Its profile details are locked and will not be changed; this action only creates the linked login account.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setForm((previous) => ({
                    ...createInitialForm(),
                    password: previous.password,
                  }));
                  setFormError(null);
                }}
                disabled={isSubmitting}
                className="mt-2 block font-semibold underline underline-offset-2 disabled:opacity-50"
              >
                Use a different student ID
              </button>
            </div>
          )}
          {isReceiver && !matchingProfile && matchingAccount && (
            <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
              A student login account already exists for this ID. Account creation is disabled.
            </div>
          )}

          <div>
            <label htmlFor="new-student-name" className="mb-1 block font-bold text-stone-700">
              Student Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              id="new-student-name"
              type="text"
              required
              placeholder="e.g. Maria Clara Santos"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              readOnly={identityLocked}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-emerald-600 read-only:bg-stone-100 disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="new-student-email" className="mb-1 block font-bold text-stone-700">
                Email Address <span className="text-rose-600">*</span>
              </label>
              <input
                id="new-student-email"
                type="email"
                required
                placeholder="student@university.edu"
                value={form.email}
                onChange={(event) => updateField('email', event.target.value)}
                readOnly={identityLocked}
                disabled={isSubmitting}
                className="w-full min-w-0 rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-emerald-600 read-only:bg-stone-100 disabled:opacity-60"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="new-student-phone" className="mb-1 block font-bold text-stone-700">Phone Number</label>
              <input
                id="new-student-phone"
                type="text"
                placeholder="+63 917 000 0000"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                readOnly={identityLocked}
                disabled={isSubmitting}
                className="w-full min-w-0 rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-emerald-600 read-only:bg-stone-100 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="new-student-degree-program" className="mb-1 block font-bold text-stone-700">Degree Program</label>
              <select
                id="new-student-degree-program"
                value={form.degreeProgram}
                onChange={(event) => updateField('degreeProgram', event.target.value)}
                disabled={isSubmitting || identityLocked}
                className="w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 disabled:bg-stone-100 disabled:opacity-70"
              >
                <option value="BS Computer Science">BS Computer Science</option>
                <option value="BS Information Technology">BS Information Technology</option>
                <option value="BS Business Administration">BS Business Administration</option>
                <option value="BS Nursing">BS Nursing</option>
                <option value="BS Civil Engineering">BS Civil Engineering</option>
                <option value="BA Communication">BA Communication</option>
              </select>
            </div>
            <div className="min-w-0">
              <label htmlFor="new-student-year-level" className="mb-1 block font-bold text-stone-700">Year Level</label>
              <select
                id="new-student-year-level"
                value={form.yearLevel}
                onChange={(event) => updateField('yearLevel', event.target.value)}
                disabled={isSubmitting || identityLocked}
                className="w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 disabled:bg-stone-100 disabled:opacity-70"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Graduating">Graduating</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="new-student-enrollment-status" className="mb-1 block font-bold text-stone-700">Enrollment Status</label>
            <select
              id="new-student-enrollment-status"
              value={form.enrollmentStatus}
              onChange={(event) =>
                updateField('enrollmentStatus', event.target.value as StudentProfile['enrollmentStatus'])
              }
              disabled={isSubmitting || identityLocked}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 outline-none focus:border-emerald-600 disabled:bg-stone-100 disabled:opacity-70"
            >
              <option value="Regular">Regular</option>
              <option value="Irregular">Irregular</option>
              <option value="Graduating">Graduating</option>
              <option value="Alumni">Alumni</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          <div>
            <label htmlFor="new-student-password" className="mb-1 block font-bold text-stone-700">
              Initial Login Password <span className="text-rose-600">*</span>
            </label>
            <input
              id="new-student-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(event) => updateField('password', event.target.value)}
              disabled={isSubmitting || blockedRecord}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-emerald-600 disabled:bg-stone-100 disabled:opacity-70"
            />
            <p className="mt-1 text-stone-500">Share this password securely with the student. It will not appear in the account list.</p>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="min-h-10 rounded-xl border border-stone-200 px-4 py-2 font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="student-registration-submit"
              type="submit"
              disabled={isSubmitting || blockedRecord || Boolean(isReceiver && matchingAccount && !matchingProfile)}
              className="min-h-10 rounded-xl bg-emerald-800 px-4 py-2 font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSubmitting ? 'Saving Student Record…' : 'Save Student Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
