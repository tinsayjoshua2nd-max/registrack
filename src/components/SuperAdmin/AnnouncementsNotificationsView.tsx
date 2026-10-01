import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { Announcement } from '../../types';
import {
  Megaphone,
  Bell,
  Send,
  Trash2,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Radio,
  FileText,
  Clock,
} from 'lucide-react';

export const AnnouncementsNotificationsView: React.FC = () => {
  const {
    announcements,
    createSuperAnnouncement,
    deleteSuperAnnouncement,
    broadcastNotification,
    notifications,
  } = useHelpdesk();

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // New Announcement state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Announcement['category']>('schedule');
  const [badgeLabel, setBadgeLabel] = useState('SCHEDULE');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [isImportant, setIsImportant] = useState(false);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;

    createSuperAnnouncement({
      title: title.trim(),
      category,
      badgeLabel: badgeLabel.toUpperCase() || 'ADVISORY',
      summary: summary.trim(),
      details: details.trim() || summary.trim(),
      isImportant,
    });

    setTitle('');
    setSummary('');
    setDetails('');
    setIsImportant(false);
    setNotificationMsg('Official announcement published across portals.');
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;

    broadcastNotification(broadcastTitle.trim(), broadcastBody.trim());
    setBroadcastTitle('');
    setBroadcastBody('');
    setNotificationMsg('Emergency alert broadcasted to all logged-in students & staff.');
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
              Advisories & Instant Broadcasting
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Campus Communications
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Publish institutional counter advisories, holiday schedules, and dispatch real-time notifications to active student portals.
          </p>
        </div>
      </div>

      {notificationMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Grid: Broadcast Alert Box + Create Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Instant Broadcast + Active Announcements List (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Instant Push Alert Broadcast Box */}
          <div className="bg-gradient-to-r from-stone-900 to-emerald-950 text-white p-6 rounded-2xl border border-stone-800 shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              <div>
                <h3 className="font-heading font-bold text-base text-white">
                  Real-Time Campus Alert Broadcast
                </h3>
                <p className="text-xs text-stone-300">
                  Instantly pushes notification popups to all students and staff.
                </p>
              </div>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-3 text-xs">
              <input
                type="text"
                required
                placeholder="Alert Headline (e.g. Counter Window 3 System Maintenance)"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-stone-800/80 border border-stone-700 text-white placeholder-stone-400 focus:border-emerald-500 outline-none"
              />

              <textarea
                required
                rows={2}
                placeholder="Detailed announcement or counter advice..."
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-stone-800/80 border border-stone-700 text-white placeholder-stone-400 focus:border-emerald-500 outline-none"
              />

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold flex items-center gap-2 transition-colors cursor-pointer text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Broadcast Alert Now</span>
              </button>
            </form>
          </div>

          {/* Active Announcements List */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-heading font-bold text-sm text-stone-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-800" />
                Published Campus Advisories ({announcements.length})
              </h3>
            </div>

            <div className="space-y-3">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition-colors flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 font-heading text-sm">
                        {a.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                        {a.badgeLabel}
                      </span>
                      {a.isImportant && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-stone-600 leading-snug">{a.summary}</p>
                    <p className="text-[10px] text-stone-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {a.date}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Remove announcement "${a.title}"?`)) {
                        deleteSuperAnnouncement(a.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    title="Delete announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Live Notifications & Real-Time Arrival Log */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-800" />
                <h3 className="font-heading font-bold text-sm text-stone-900">
                  Live Notifications & Real-Time Arrival Feed ({notifications.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                <Clock className="w-3 h-3 text-emerald-700" />
                Real-Time Arrival Stamps
              </span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 transition-colors text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">{n.title}</span>
                      {n.ticketNumber && (
                        <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-bold bg-stone-200 text-stone-800">
                          #{n.ticketNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-stone-600 text-[11px] leading-relaxed">{n.message}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <Clock className="w-3 h-3 text-emerald-700" />
                      {n.exactTime || n.timestamp}
                    </span>
                    <p className="text-[10px] text-stone-400 font-mono mt-0.5">{n.dateStr || 'Today'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Publish New Announcement (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-stone-100">
            <h3 className="font-heading font-bold text-base text-stone-900">
              Publish New Advisory
            </h3>
            <p className="text-xs text-stone-500">
              Displayed prominently on student and registrar bulletin boards.
            </p>
          </div>

          <form onSubmit={handleCreateAnnouncement} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Advisory Headline <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Schedule of Releasing for 2nd Term 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => {
                    const c = e.target.value as Announcement['category'];
                    setCategory(c);
                    setBadgeLabel(c.toUpperCase());
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                >
                  <option value="schedule">Schedule</option>
                  <option value="deadline">Deadline</option>
                  <option value="document">Document Releasing</option>
                  <option value="holiday">Holiday / Cutoff</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Badge Tag</label>
                <input
                  type="text"
                  placeholder="SCHEDULE"
                  value={badgeLabel}
                  onChange={(e) => setBadgeLabel(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 font-mono uppercase rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Summary <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="Short summary displayed on cards..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Detailed Content</label>
              <textarea
                rows={4}
                placeholder="Full advisory guidelines, claiming windows, or requirements..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
              <input
                type="checkbox"
                id="important-check"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="w-4 h-4 accent-amber-600 cursor-pointer"
              />
              <label htmlFor="important-check" className="font-bold text-amber-950 cursor-pointer">
                Mark as High Priority / Urgent Alert
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Megaphone className="w-4 h-4" />
                <span>Publish Advisory Bulletin</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
