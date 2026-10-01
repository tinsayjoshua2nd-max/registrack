import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { Announcement } from '../../types';
import {
  Megaphone,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Wrench,
  CheckCircle2,
  Bell,
} from 'lucide-react';

export const AnnouncementsView: React.FC = () => {
  const { announcements } = useHelpdesk();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Notices' },
    { id: 'schedule', label: 'Office Schedules' },
    { id: 'holiday', label: 'Holidays' },
    { id: 'deadline', label: 'Enrollment Deadlines' },
    { id: 'document', label: 'Document-Processing' },
    { id: 'maintenance', label: 'System Maintenance' },
  ];

  const filtered = announcements.filter(
    (a) => selectedCategory === 'all' || a.category === selectedCategory
  );

  const getBadgeStyle = (category: Announcement['category']) => {
    switch (category) {
      case 'schedule':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'holiday':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'deadline':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'document':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'maintenance':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  const getIcon = (category: Announcement['category']) => {
    switch (category) {
      case 'schedule':
        return <Clock className="w-4 h-4 text-emerald-700" />;
      case 'holiday':
        return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'deadline':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'document':
        return <FileText className="w-4 h-4 text-sky-600" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-stone-500" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          Official University Registrar Advisories
        </span>
        <h1 className="mt-2 font-heading font-bold text-2xl sm:text-3xl text-stone-900">
          Registrar Announcements & Schedules
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Stay informed about official office hours, holiday closures, enrollment deadlines, and batch document processing updates.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              selectedCategory === c.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`p-5 sm:p-6 rounded-2xl bg-white border transition-all shadow-xs ${
              item.isImportant
                ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle(
                    item.category
                  )}`}
                >
                  {getIcon(item.category)}
                  <span>{item.badgeLabel}</span>
                </span>
                {item.isImportant && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase tracking-wider">
                    IMPORTANT
                  </span>
                )}
              </div>

              <div className="text-xs text-stone-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Posted: {item.date}</span>
              </div>
            </div>

            <h3 className="font-heading font-bold text-lg text-stone-900 mt-3">
              {item.title}
            </h3>

            <p className="mt-1 text-xs text-stone-600 font-medium leading-relaxed">
              {item.summary}
            </p>

            <div className="mt-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700 leading-relaxed">
              {item.details}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
