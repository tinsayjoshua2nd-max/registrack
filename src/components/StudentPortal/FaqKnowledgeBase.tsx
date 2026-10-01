import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { FAQItem, TicketCategory } from '../../types';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  FileText,
  ArrowRight,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export const FaqKnowledgeBase: React.FC = () => {
  const { faqs, setStudentView } = useHelpdesk();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string>('faq-1');

  const categories = ['All', 'Document Requests', 'Processing Time', 'Requirements & Checklists', 'Claiming & Releasing', 'Online Helpdesk'];

  const filteredFaqs = faqs.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      !search ||
      item.question.toLowerCase().includes(search.toLowerCase()) ||
      item.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleStartRequest = (cat?: TicketCategory) => {
    setStudentView('chat');
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          Knowledge Base & Student Guidance
        </span>
        <h1 className="mt-2 font-heading font-bold text-2xl sm:text-3xl text-stone-900">
          Frequently Asked Questions
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Find instant answers to common registrar procedures, turnaround times, and document releasing policies.
        </p>

        {/* Search Bar */}
        <div className="mt-6 relative max-w-lg mx-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search TOR, certificates, releasing windows, requirements..."
            className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl border border-stone-300 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
          />
          <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              selectedCategory === c
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.map((faq) => {
          const isExpanded = expandedId === faq.id;

          return (
            <div
              key={faq.id}
              className={`rounded-2xl border transition-all bg-white overflow-hidden ${
                isExpanded
                  ? 'border-emerald-500 shadow-sm ring-1 ring-emerald-500/10'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? '' : faq.id)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isExpanded
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block mb-0.5">
                      {faq.category}
                    </span>
                    <h3 className="font-heading font-bold text-sm sm:text-base text-stone-900 leading-snug">
                      {faq.question}
                    </h3>
                  </div>
                </div>

                <div className="text-stone-400 shrink-0">
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-emerald-700" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-stone-100 space-y-4">
                  <p className="text-sm text-stone-700 leading-relaxed">
                    {faq.answer}
                  </p>

                  {/* Turnaround Time Badge */}
                  {faq.turnaroundTime && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/80">
                      <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>Estimated Turnaround: {faq.turnaroundTime}</span>
                    </div>
                  )}

                  {/* Steps Checklist */}
                  {faq.steps && faq.steps.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                      <p className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                        Step-by-Step Procedure:
                      </p>
                      <ol className="space-y-1.5">
                        {faq.steps.map((st, sIdx) => (
                          <li key={sIdx} className="text-xs text-stone-600 flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                              {sIdx + 1}
                            </span>
                            <span>{st}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Required Documents Checklist */}
                  {faq.requirements && faq.requirements.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5">
                        Required Documents Checklist:
                      </p>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {faq.requirements.map((req, rIdx) => (
                          <li
                            key={rIdx}
                            className="text-xs text-stone-600 flex items-center gap-2 bg-stone-50 p-2 rounded-lg border border-stone-200/60"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Link */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-stone-400">Still have questions? Use Registrar Chat.</span>
                    <button
                      onClick={() => handleStartRequest(faq.relatedCategory)}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Submit Request for this Topic</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredFaqs.length === 0 && (
          <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center">
            <HelpCircle className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="font-heading font-bold text-stone-800 text-base">
              No matching questions found
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Try searching with a different keyword or file an inquiry ticket.
            </p>
          </div>
        )}
      </div>

      {/* Office Counter Locations Card */}
      <div className="p-5 rounded-2xl bg-emerald-900 text-emerald-50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-heading font-bold text-base text-white">
            Physical Releasing Windows Guide
          </h4>
          <p className="text-xs text-emerald-200 mt-1 max-w-xl leading-relaxed">
            Window 1 (Enrollment & Evaluations) • Window 2 (Records & CAV) • Window 3 (Transcript of Records) • Window 4 (Certifications & Good Moral) • Window 5 (Student IDs)
          </p>
        </div>
        <button
          onClick={() => setStudentView('track')}
          className="px-4 py-2 rounded-xl bg-white text-emerald-950 font-bold text-xs hover:bg-emerald-50 transition-colors shrink-0 cursor-pointer"
        >
          Track Request by Ticket #
        </button>
      </div>
    </div>
  );
};
