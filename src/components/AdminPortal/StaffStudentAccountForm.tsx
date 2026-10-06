import React, { useMemo, useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { StudentProfile } from '../../types';
import { AlertCircle, CheckCircle2, LockKeyhole, UserPlus, X } from 'lucide-react';

export const StaffStudentAccountForm: React.FC = () => {
  const { currentUser, studentRecords, users, createUser } = useHelpdesk();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ name: string; username: string } | null>(null);

  const canCreateStudentAccount =
    currentUser?.staffRole === 'receiver' || currentUser?.role === 'superadmin';

  const eligibleRecords = useMemo(
    () =>
      studentRecords.filter(
        (record) =>
          !record.isArchived &&
          !record.hasLoginAccount &&
          /^\d{8}$/.test(record.studentId) &&
          !users.some(
            (user) => user.role === 'student' && user.studentId === record.studentId
          )
      ),
    [studentRecords, users]
  );

  if (!canCreateStudentAccount) return null;

  const selectedRecord = eligibleRecords.find((record) => record.id === selectedRecordId) ?? null;

  const closeModal = () => {
    if (isSaving) return;
    setIsOpen(false);
    setSelectedRecordId('');
    setPassword('');
    setConfirmation('');
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    setError(null);

    if (!selectedRecord) {
      setError('Select an eligible official student record before creating an account.');
      return;
    }
    if (password.length < 8 || password.length > 256) {
      setError('Initial password must be between 8 and 256 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('Password and confirmation do not match.');
      return;
    }

    setIsSaving(true);
    try {
      const profile: StudentProfile = selectedRecord;
      await createUser({
        name: profile.name,
        email: profile.email,
        role: 'student',
        status: 'active',
        studentId: profile.studentId,
        password,
        departmentOrOffice: profile.degreeProgram,
      });
      setSuccess({ name: profile.name, username: profile.name });
      setPassword('');
      setConfirmation('');
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to create the student account. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button
          id="staff-student-account-open"
          type="button"
          onClick={() => {
            setError(null);
            setSuccess(null);
            setIsOpen(true);
          }}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 py-2 text-xs font-bold text-emerald-900 transition-colors hover:bg-emerald-50"
        >
          <UserPlus className="h-4 w-4" />
          Create student account
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-student-account-title"
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="staff-student-account-title" className="font-heading text-base font-bold text-stone-900">
                    Create student account
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-stone-600">
                    Choose an existing official record. Account creation does not edit the student record or create a ticket.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close student account dialog"
                onClick={closeModal}
                disabled={isSaving}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {success ? (
              <div className="space-y-4">
                <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <div className="min-w-0">
                      <p className="font-bold text-emerald-950">Student account created</p>
                      <p className="mt-1 text-xs text-emerald-900">{success.name} can use this login username:</p>
                      <p className="mt-2 break-all rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-sm font-bold text-stone-900">
                        {success.username}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-stone-500">
                  The login username is the student’s registered name. Provide the initial password securely.
                </p>
                <div className="flex justify-end border-t border-stone-100 pt-3">
                  <button
                    id="staff-student-account-success-close"
                    type="button"
                    onClick={closeModal}
                    className="min-h-10 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSaving}>
                {error && (
                  <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {eligibleRecords.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950" role="status">
                    <p className="font-bold">No eligible official student records</p>
                    <p className="mt-1">
                      There are no unarchived records available without an existing student account. Ask the Registrar Officer to create or review the official student record first.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label htmlFor="staff-student-record-select" className="mb-1.5 block text-xs font-bold text-stone-700">
                        Official student record <span className="text-rose-600">*</span>
                      </label>
                      <select
                        id="staff-student-record-select"
                        required
                        value={selectedRecordId}
                        onChange={(event) => {
                          setSelectedRecordId(event.target.value);
                          setError(null);
                        }}
                        disabled={isSaving}
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 disabled:opacity-60"
                      >
                        <option value="">Select an eligible student record</option>
                        {eligibleRecords.map((record) => (
                          <option key={record.id} value={record.id}>
                            {record.name} · {record.studentId}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedRecord && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-900">Read-only official record details</p>
                        <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                          <div className="min-w-0 rounded-lg border border-emerald-100 bg-white px-3 py-2">
                            <dt className="text-[10px] font-semibold text-stone-500">Student name</dt>
                            <dd className="break-words font-semibold text-stone-900">{selectedRecord.name}</dd>
                          </div>
                          <div className="min-w-0 rounded-lg border border-emerald-100 bg-white px-3 py-2">
                            <dt className="text-[10px] font-semibold text-stone-500">Student ID</dt>
                            <dd className="break-all font-mono font-semibold text-stone-900">{selectedRecord.studentId}</dd>
                          </div>
                          <div className="min-w-0 rounded-lg border border-emerald-100 bg-white px-3 py-2 sm:col-span-2">
                            <dt className="text-[10px] font-semibold text-stone-500">Registered email</dt>
                            <dd className="break-all font-semibold text-stone-900">{selectedRecord.email}</dd>
                          </div>
                        </dl>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="staff-student-password" className="mb-1.5 block text-xs font-bold text-stone-700">
                          Initial password <span className="text-rose-600">*</span>
                        </label>
                        <input
                          id="staff-student-password"
                          type="password"
                          required
                          minLength={8}
                          maxLength={256}
                          autoComplete="new-password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          disabled={isSaving || eligibleRecords.length === 0}
                          className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 disabled:opacity-60"
                        />
                        <p className="mt-1 text-[10px] text-stone-500">8–256 characters.</p>
                      </div>
                      <div>
                        <label htmlFor="staff-student-confirm-password" className="mb-1.5 block text-xs font-bold text-stone-700">
                          Confirm password <span className="text-rose-600">*</span>
                        </label>
                        <input
                          id="staff-student-confirm-password"
                          type="password"
                          required
                          minLength={8}
                          maxLength={256}
                          autoComplete="new-password"
                          value={confirmation}
                          onChange={(event) => setConfirmation(event.target.value)}
                          disabled={isSaving || eligibleRecords.length === 0}
                          className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex flex-col-reverse gap-2 border-t border-stone-100 pt-3 sm:flex-row sm:justify-end">
                  <button
                    id="staff-student-account-cancel"
                    type="button"
                    onClick={closeModal}
                    disabled={isSaving}
                    className="min-h-10 rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  {eligibleRecords.length > 0 && (
                    <button
                      id="staff-student-account-submit"
                      type="submit"
                      disabled={isSaving || !selectedRecord}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <LockKeyhole className="h-3.5 w-3.5" />
                      {isSaving ? 'Creating account…' : 'Create account'}
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
};
