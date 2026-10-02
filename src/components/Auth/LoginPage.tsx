import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import {
  GraduationCap, ShieldCheck, User, Eye, EyeOff, ArrowRight,
  Clock, FileText, AlertCircle, Lock,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useHelpdesk();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
            <span>Operating Hours: Mon - Fri (8:00 AM - 5:00 PM)</span>
            <span className="text-emerald-300 font-mono">Window 1 to 5 Active</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-3 py-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-stone-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-5 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white p-5 sm:p-8 flex flex-col justify-between relative overflow-hidden">
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
              <p className="mt-4 sm:mt-6 text-sm text-emerald-100/90 leading-relaxed line-clamp-2 sm:line-clamp-none">
                Improving the efficiency, accessibility, and transparency of university registrar services through real-time request tracking, automated ticket generation, and dedicated evaluator support.
              </p>
              <div className="mt-6 space-y-3 hidden lg:block">
                <div className="p-3 rounded-xl bg-emerald-800/60 border border-emerald-700/60 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0"><FileText className="w-4 h-4" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Online Ticket Inquiries</h4>
                    <p className="text-[11px] text-emerald-200 mt-0.5 leading-snug">Submit concerns for Enrollment, Grades, TOR, Certifications, and Clearances.</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-800/60 border border-emerald-700/60 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0"><Clock className="w-4 h-4" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-white">5-Stage Real-Time Tracking</h4>
                    <p className="text-[11px] text-emerald-200 mt-0.5 leading-snug">Monitor Submitted, Reviewed, Processing, Ready, and Completed with release dates.</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-800/60 border border-emerald-700/60 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0"><ShieldCheck className="w-4 h-4" /></div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Role-Separated Portals</h4>
                    <p className="text-[11px] text-emerald-200 mt-0.5 leading-snug">Dedicated student interface and authorized registrar evaluator management desk.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative z-10 pt-6 mt-6 border-t border-emerald-700/60 text-[11px] text-emerald-200/80 hidden lg:flex items-center justify-between">
              <span>ISO 9001:2015 Quality Records Management</span><span>v2.4 Production</span>
            </div>
          </div>

          <div className="lg:col-span-7 p-4 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">Secure Authentication Gateway</span>
              <h2 className="mt-3 font-heading font-bold text-2xl sm:text-3xl text-stone-900 tracking-tight">Log In to Your Portal</h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-1">Enter your credentials. We’ll automatically open the portal for your account.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-busy={submitting}>
              <div id="login-instructions" className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-2.5">
                <User className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">One login for every account</p>
                  <p className="text-emerald-800 text-[11px] mt-1"><strong>Students:</strong> Student ID and password.</p>
                  <p className="text-emerald-800 text-[11px] mt-0.5"><strong>Staff Officers and Registrar:</strong> Username or email and password.</p>
                </div>
              </div>
              {error && (
                <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" /><span>{error}</span>
                </div>
              )}
              <div>
                <label htmlFor="login-identifier-input" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Student ID, Username or Email <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    id="login-identifier-input" type="text" required autoComplete="username"
                    autoCapitalize="none" spellCheck={false} aria-describedby="login-instructions"
                    placeholder="Enter your student ID, username or email"
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
                    autoComplete="current-password" placeholder="Enter your account password"
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
              <button id="btn-login-submit" type="submit" disabled={submitting}
                className="w-full min-h-12 py-3 px-4 rounded-xl font-heading font-bold text-sm text-white bg-emerald-700 hover:bg-emerald-800 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60 disabled:cursor-wait">
                <span>{submitting ? 'Logging in…' : 'Log In'}</span><ArrowRight className="w-4 h-4" />
              </button>
            </form>
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