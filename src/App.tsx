import React from 'react';
import { HelpdeskProvider, useHelpdesk } from './context/HelpdeskContext';
import { LoginPage } from './components/Auth/LoginPage';
import { Navbar } from './components/Navbar';
import { TrackTicketView } from './components/StudentPortal/TrackTicketView';
import { RegistrarChatView } from './components/StudentPortal/RegistrarChatView';
import { FaqKnowledgeBase } from './components/StudentPortal/FaqKnowledgeBase';
import { AnnouncementsView } from './components/StudentPortal/AnnouncementsView';
import { AdminDashboard } from './components/AdminPortal/AdminDashboard';
import { AdminSubmitTicketView } from './components/AdminPortal/AdminSubmitTicketView';
import { TicketManagementTable } from './components/AdminPortal/TicketManagementTable';
import { OfficerRequestHistoryView } from './components/AdminPortal/OfficerRequestHistoryView';
import { SuperAdminLayout } from './components/SuperAdmin/SuperAdminLayout';
import {
  GraduationCap,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  Clock,
  Heart,
} from 'lucide-react';

const MainContent: React.FC = () => {
  const { role, studentView, adminView, canAccessApplicationForm } = useHelpdesk();

  return (
    <main className="flex-1 pb-8 sm:pb-12">
      {role === 'student' ? (
        <>
          {studentView === 'track' && <TrackTicketView />}
          {studentView === 'chat' && <RegistrarChatView />}
          {studentView === 'announcements' && <AnnouncementsView />}
          {studentView === 'faq' && <FaqKnowledgeBase />}
        </>
      ) : (
        <>
          {adminView === 'dashboard' && <AdminDashboard />}
          {adminView === 'submit-ticket' && (canAccessApplicationForm ? <AdminSubmitTicketView /> : <AdminDashboard />)}
          {adminView === 'all-requests' && <TicketManagementTable />}
          {adminView === 'request-history' && <OfficerRequestHistoryView />}
          {adminView === 'announcements-manage' && <AnnouncementsView />}
        </>
      )}
    </main>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, role, initializing, startupError } = useHelpdesk();

  if (initializing) {
    return <div className="min-h-[100dvh] bg-stone-100 flex items-center justify-center text-stone-600 text-sm">Loading RegisTrack…</div>;
  }

  if (startupError) {
    return <div className="min-h-[100dvh] bg-stone-100 flex items-center justify-center p-6"><div role="alert" className="max-w-md rounded-2xl bg-white border border-stone-200 p-6 text-sm text-stone-800"><p>{startupError}</p><button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-emerald-800 text-white px-4 py-2">Retry connection</button></div></div>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (role === 'superadmin') {
    return <SuperAdminLayout />;
  }

  return (
    <div className="min-h-[100dvh] bg-stone-50 text-stone-900 flex flex-col selection:bg-emerald-200 selection:text-emerald-900">
      <div>
        <Navbar />
        <MainContent />
      </div>

      {/* Institutional Footer */}
      <footer className="safe-area-bottom bg-emerald-950 text-emerald-100 border-t border-emerald-900/60 pt-8 sm:pt-10 pb-8 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-emerald-900">
            {/* Brand and Mission */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center font-bold text-base shadow-xs">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="font-heading font-bold text-lg text-white">
                  RegisTrack
                </span>
              </div>
              <p className="text-emerald-200/80 text-xs leading-relaxed">
                Dedicated to improving the efficiency and accessibility of registrar services through online ticket monitoring, real-time document release tracking, and direct student communication.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ISO 9001:2015 Certified Records Office</span>
              </div>
            </div>

            {/* Service Desks */}
            <div className="space-y-2">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                Counter Releasing Windows
              </h4>
              <ul className="space-y-1.5 text-xs text-emerald-200/80">
                <li>Window 1: Enrollment & Evaluations</li>
                <li>Window 2: Central Records & CAV/DFA</li>
                <li>Window 3: Official Transcript of Records (TOR)</li>
                <li>Window 4: Certifications & Clearances</li>
                <li>Window 5: Student RFID & Biometrics</li>
              </ul>
            </div>

            {/* Operating Hours */}
            <div className="space-y-2">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                Office Schedules & Support
              </h4>
              <div className="space-y-2 text-xs text-emerald-200/80">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Monday - Thursday</p>
                    <p className="text-[11px]">8:00 AM – 6:00 PM</p>
                    <p className="font-semibold text-white mt-1">Friday</p>
                    <p className="text-[11px]">8:00 AM – 5:00 PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Administration Building, Ground Floor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>helpdesk@registrar.university.edu</span>
                </div>
              </div>
            </div>

            {/* Security & System Info */}
            <div className="space-y-2">
              <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                Helpdesk Tracking
              </h4>
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                Support tickets adhere to official data privacy guidelines. Please keep your Ticket Number confidential to protect your academic records.
              </p>
              <div className="p-2.5 rounded-xl bg-emerald-900/60 border border-emerald-800 text-[11px] text-emerald-300">
                <span>Current Academic Year: 2026-2027 (1st Semester)</span>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-400/80 text-[11px]">
            <p>© 2026 Office of the University Registrar. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <HelpdeskProvider>
      <AppContent />
    </HelpdeskProvider>
  );
}
