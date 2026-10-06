import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, UserPlus } from 'lucide-react';

interface StudentRegistrationProps {
  consentAccepted: boolean;
}

interface RegistrationOptions {
  allowStudentRegistration: boolean;
}

export const StudentRegistration: React.FC<StudentRegistrationProps> = ({ consentAccepted }) => {
  const [allowRegistration, setAllowRegistration] = useState<boolean | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const registrationController = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;
    const refreshOptions = async () => {
      try {
        const response = await fetch('/api/registration-options', {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Unable to check student registration availability.');
        const options = await response.json() as RegistrationOptions;
        if (typeof options.allowStudentRegistration !== 'boolean') {
          throw new Error('The registration availability response was invalid.');
        }
        if (mounted) {
          setAllowRegistration(options.allowStudentRegistration);
          setOptionsError(null);
          if (!options.allowStudentRegistration) {
            registrationController.current?.abort();
            registrationController.current = null;
            setIsSending(false);
            setIsOpen(false);
            setStudentId('');
            setEmail('');
            setPassword('');
            setConfirmation('');
            setRegistrationError(null);
          }
        }
      } catch (error) {
        if (mounted) {
          registrationController.current?.abort();
          registrationController.current = null;
          setIsSending(false);
          setAllowRegistration(null);
          setOptionsError(error instanceof Error ? error.message : 'Unable to check student registration availability.');
          setIsOpen(false);
          setStudentId('');
          setEmail('');
          setPassword('');
          setConfirmation('');
        }
      }
    };

    void refreshOptions();
    const interval = window.setInterval(() => void refreshOptions(), 30_000);
    window.addEventListener('focus', refreshOptions);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshOptions);
    };
  }, []);

  const closeForm = () => {
    setIsOpen(false);
    setStudentId('');
    setEmail('');
    setPassword('');
    setConfirmation('');
    setRegistrationError(null);
    setUsername(null);
  };

  const handleRegistration = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegistrationError(null);
    if (!consentAccepted) {
      setRegistrationError('Accept the Privacy Notice before creating an account.');
      return;
    }
    if (!/^\d{8}$/.test(studentId)) {
      setRegistrationError('Student ID must be exactly 8 digits.');
      return;
    }
    if (password.length < 8) {
      setRegistrationError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setRegistrationError('Password and confirmation do not match.');
      return;
    }
    if (isSending || allowRegistration !== true) return;

    setIsSending(true);
    const controller = new AbortController();
    registrationController.current = controller;
    try {
      const response = await fetch('/api/student-registration', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ studentId, email: email.trim(), password }),
        signal: controller.signal,
      });
      const result = await response.json() as { username?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to create your account. Please try again.');
      if (!result.username) throw new Error('The server did not return a login username. Please contact the registrar.');
      setUsername(result.username);
      setPassword('');
      setConfirmation('');
      setRegistrationError(null);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setRegistrationError(error instanceof Error ? error.message : 'Unable to create your account. Please try again.');
      }
    } finally {
      if (registrationController.current === controller) registrationController.current = null;
      setIsSending(false);
    }
  };

  if (allowRegistration === null) {
    return (
      <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs">
        {optionsError ? (
          <div className="flex items-start gap-2 text-rose-800" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Student registration availability could not be checked.</p>
              <p className="mt-0.5">{optionsError}</p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('focus'))}
                className="mt-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-semibold text-rose-800 hover:bg-rose-50"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <p className="text-stone-600" role="status">Checking student registration availability…</p>
        )}
      </div>
    );
  }

  if (!allowRegistration) return null;

  return (
    <section className="mt-5 border-t border-stone-100 pt-4">
      {!isOpen ? (
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-stone-800">New student?</p>
            <p className="mt-0.5 text-[11px] text-stone-500">Create portal access using your existing official student record.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setUsername(null);
              setRegistrationError(null);
              setIsOpen(true);
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-900 transition-colors hover:bg-emerald-50"
          >
            <UserPlus className="h-4 w-4" />
            Create student account
          </button>
        </div>
      ) : username ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-950">Student account created</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-900">
                Use this username with your new password on the existing login form. You are not signed in automatically.
              </p>
              <p className="mt-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-sm font-bold text-stone-900">
                {username}
              </p>
              <button
                type="button"
                onClick={closeForm}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-900"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Return to login
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRegistration} className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4" aria-busy={isSending}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-sm font-bold text-stone-900">Create student account</h3>
              <p className="mt-0.5 text-[11px] text-stone-600">This links your login to an existing official record; it does not create a record or file a ticket.</p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              disabled={isSending}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-stone-600 hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {registrationError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{registrationError}</span>
            </div>
          )}
          <div>
            <label htmlFor="registration-student-id" className="mb-1 block text-xs font-bold text-stone-700">Student ID <span className="text-rose-600">*</span></label>
            <input
              id="registration-student-id"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{8}"
              maxLength={8}
              required
              autoComplete="off"
              placeholder="Exactly 8 digits"
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              disabled={isSending}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 font-mono text-sm tracking-widest outline-none focus:border-emerald-600 disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="registration-email" className="mb-1 block text-xs font-bold text-stone-700">Registered email address <span className="text-rose-600">*</span></label>
            <input
              id="registration-email"
              type="email"
              required
              autoComplete="email"
              placeholder="Email on your official student record"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSending}
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 disabled:opacity-60"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="registration-password" className="mb-1 block text-xs font-bold text-stone-700">New password <span className="text-rose-600">*</span></label>
              <input
                id="registration-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSending}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="registration-confirm-password" className="mb-1 block text-xs font-bold text-stone-700">Confirm password <span className="text-rose-600">*</span></label>
              <input
                id="registration-confirm-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={isSending}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 disabled:opacity-60"
              />
            </div>
          </div>
          {!consentAccepted && (
            <p className="text-[11px] font-medium text-amber-800" role="status">Accept the Privacy Notice to create an account.</p>
          )}
          <button
            type="submit"
            disabled={isSending || !consentAccepted}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span>{isSending ? 'Creating account…' : 'Create account'}</span>
            {!isSending && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      )}
    </section>
  );
};
