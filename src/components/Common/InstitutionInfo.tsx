import React from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { Building, CalendarDays, Hash } from 'lucide-react';

interface InstitutionInfoProps {
  compact?: boolean;
}

export const InstitutionInfo: React.FC<InstitutionInfoProps> = ({ compact = false }) => {
  const { systemSettings } = useHelpdesk();
  const fields = [
    { label: 'Institution code', value: systemSettings.schoolCode, Icon: Hash },
    { label: 'Academic year', value: systemSettings.academicYear, Icon: CalendarDays },
    { label: 'Semester / term', value: systemSettings.semester, Icon: Building },
  ];

  return (
    <section
      aria-label="Current institution information"
      className={`rounded-2xl border border-emerald-200 bg-emerald-50/70 ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-heading text-xs font-bold text-emerald-950">Current institution information</h3>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-emerald-800">Registrar settings</span>
      </div>
      <dl className={`grid gap-2 ${compact ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {fields.map(({ label, value, Icon }) => (
          <div key={label} className="min-w-0 rounded-xl border border-emerald-100 bg-white/80 px-3 py-2">
            <dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-stone-500">
              <Icon className="h-3 w-3 text-emerald-700" />
              {label}
            </dt>
            <dd className="mt-1 break-words text-xs font-semibold text-stone-900">{value || 'Not set'}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[10px] text-stone-500">Shown for reference; this information does not modify student records.</p>
    </section>
  );
};
