import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import {
  PRIVACY_CONSENT_LABEL,
  PRIVACY_NOTICE_SECTIONS,
  PRIVACY_NOTICE_TITLE,
  PRIVACY_NOTICE_VERSION,
} from '../../data/privacyNotice';
import {
  GraduationCap, User, Eye, EyeOff, ArrowRight,
  AlertCircle, Lock,
} from 'lucide-react';
import { StudentRegistration } from './StudentRegistration';

export const LoginPage: React.FC = () => {
  const { login } = useHelpdesk();
  const [consentAccepted, setConsentAccepted] = useState(() => {
    try {
      return typeof window !== 'undefined' &&
        window.localStorage.getItem('registrack.privacyNoticeAccepted') === PRIVACY_NOTICE_VERSION;
    } catch {
      return false;
    }
  });
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!consentAccepted) {
      setError('Please accept the Privacy Notice to log in.');
      return;
    }
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(identifier, password);
      if (!result.success) setError(result.error || 'Unable to log in. Please check your credentials.');
    } catch {
      setError('Unable to connect to the authentication service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-stone-100 flex flex-col text-stone-900 selection:bg-emerald-200 selection:text-emerald-900">
      <header className="safe-area-top bg-emerald-900 text-emerald-50 px-3 sm:px-4 py-2 text-xs font-medium border-b border-emerald-950">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate font-semibold tracking-wide">
              Office of the University Registrar • Online Helpdesk & Document Tracking System
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-emerald-200 text-xs">
            <span>Operating Hours: Mon - Thu (8:00 AM - 6:00 PM) · Fri (8:00 AM - 5:00 PM)</span>
            <span className="text-emerald-300 font-mono">Window 1 to 5 Active</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-3 py-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-stone-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-5 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white p-5 sm:p-8 flex flex-col relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-emerald-700/20 blur-2xl pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white text-emerald-900 flex items-center justify-center shadow-lg font-bold">
                  <GraduationCap className="w-7 h-7 text-emerald-800" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-extrabold text-2xl tracking-tight text-white">RegisTrack</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 border border-emerald-500/40">OFFICIAL</span>
                  </div>
                  <p className="text-xs text-emerald-200 font-medium">University Registrar Records & Helpdesk Portal</p>
                </div>
              </div>
            </div>
            <section className="relative z-10 mt-5 rounded-xl bg-white p-3 sm:p-4 text-stone-900 shadow-lg">
              <h2 className="font-heading text-base font-bold text-stone-900">{PRIVACY_NOTICE_TITLE}</h2>
              <div
                role="region"
                aria-label="Privacy Notice text"
                tabIndex={0}
                className="mt-2 h-48 sm:h-72 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50 p-3 text-xs leading-relaxed text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                <div className="space-y-3">
                  {PRIVACY_NOTICE_SECTIONS.map((section, index) => (
                    <section key={`${section.heading || 'intro'}-${index}`} className="space-y-2">
                      {section.separatorBefore && <hr className="border-stone-300" />}
                      {section.heading && <h3 className="text-xs font-bold text-stone-900">{section.heading}</h3>}
                      {section.paragraphs?.map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex}>{paragraph}</p>
                      ))}
                      {section.bullets && (
                        <ul className="list-disc space-y-1 pl-5">
                          {section.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}
                        </ul>
                      )}
                      {section.closing?.map((paragraph, closingIndex) => (
                        <p key={closingIndex}>{paragraph}</p>
                      ))}
                    </section>
                  ))}
                </div>
              </div>
            </section>
            <div className="relative z-10 mt-4 flex items-start gap-2 text-xs text-emerald-50">
              <input
                id="privacy-consent-checkbox"
                type="checkbox"
                checked={consentAccepted}
                onChange={(event) => {
                  const accepted = event.target.checked;
                  setConsentAccepted(accepted);
                  setError(null);
                  try {
                    if (accepted) {
                      window.localStorage.setItem('registrack.privacyNoticeAccepted', PRIVACY_NOTICE_VERSION);
                    } else {
                      window.localStorage.removeItem('registrack.privacyNoticeAccepted');
                    }
                  } catch {
                    // Consent still applies for this session if browser storage is unavailable.
                  }
                }}
                className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-900"
              />
              <label htmlFor="privacy-consent-checkbox" className="cursor-pointer leading-relaxed">
                {PRIVACY_CONSENT_LABEL}
              </label>
            </div>
          </div>

          <div className="lg:col-span-7 p-4 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">Secure Authentication Gateway</span>
              <h2 className="mt-3 font-heading font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">Log In to Your Portal</h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">Enter your credentials. We’ll automatically open the portal for your account.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-busy={submitting}>
              {error && (
                <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /><span>{error}</span>
                </div>
              )}
              <div>
                <label htmlFor="login-identifier-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Username or Email <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="login-identifier-input" type="text" required autoComplete="username"
                    autoCapitalize="none" spellCheck={false}
                    placeholder="Enter your username or email"
                    value={identifier} onChange={event => setIdentifier(event.target.value)} disabled={submitting}
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-300 bg-stone-50/50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all outline-none disabled:opacity-60"
                  />
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div>
                <label htmlFor="login-password-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="login-password-input" type={showPassword ? 'text' : 'password'} required
                    autoCapitalize="none" spellCheck={false}
                    autoComplete="current-password" placeholder="Enter password or Student ID"
                    value={password} onChange={event => setPassword(event.target.value)} disabled={submitting}
                    className="w-full pl-10 pr-12 py-2.5 text-sm rounded-xl border border-stone-300 bg-stone-50/50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all outline-none disabled:opacity-60"
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-h-11 min-w-11 text-stone-400 hover:text-stone-600 cursor-pointer flex items-center justify-center">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button id="btn-login-submit" type="submit" disabled={submitting || !consentAccepted}
                className="w-full min-h-12 py-3 px-4 rounded-xl font-heading font-bold text-sm text-white bg-emerald-700 hover:bg-emerald-800 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
                <span>{submitting ? 'Logging in…' : 'Log In'}</span><ArrowRight className="w-4 h-4" />
              </button>
              {!consentAccepted && (
                <p className="text-xs text-stone-600" role="status">
                  Please accept the Privacy Notice to log in.
                </p>
              )}
            </form>
            <StudentRegistration consentAccepted={consentAccepted} />
            <div className="mt-8 pt-4 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-emerald-700" />Data Privacy & Educational Records Protection</span>
              <span>Need help? Contact Window 2</span>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-white border-t border-stone-200 py-4 px-4 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Office of the University Registrar. All rights reserved.</p>
          <div className="flex flex-wrap justify-center items-center gap-4 text-[11px]">
            <span>Window 1: Enrollment & Grades</span><span>•</span><span>Window 3: TOR Evaluation</span><span>•</span><span>Window 4: Certificates & Clearances</span>
          </div>
        </div>
      </footer>
    </div>
  );
};