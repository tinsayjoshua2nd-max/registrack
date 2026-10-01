import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { StatusBadge } from '../Common/StatusBadge';
import { PriorityBadge } from '../Common/PriorityBadge';
import { TimelineProgress } from '../Common/TimelineProgress';
import {
  Search,
  Copy,
  CheckCircle,
  Building,
  User,
  Calendar,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const TrackTicketView: React.FC = () => {
  const {
    tickets,
    trackingTicketNumber,
    setTrackingTicketNumber,
    trackTicketByNumber,
    selectedTicket,
    setSelectedTicket,
    currentStudent,
  } = useHelpdesk();

  const [inputVal, setInputVal] = useState(trackingTicketNumber || 'REG-2026-00125');
  const [copied, setCopied] = useState(false);

  // Tickets filed for the currently logged-in student (by 8-digit ID, email, or name)
  const studentTickets = tickets.filter((t) => {
    return (
      t.studentId === currentStudent.studentId ||
      t.email?.toLowerCase() === currentStudent.email?.toLowerCase() ||
      t.studentName?.toLowerCase() === currentStudent.name?.toLowerCase()
    );
  });

  // Active ticket to view
  const activeTicket =
    (selectedTicket && selectedTicket.ticketNumber === inputVal.trim())
      ? selectedTicket
      : trackTicketByNumber(inputVal) || studentTickets[0] || tickets[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const clean = inputVal.trim();
    const found = trackTicketByNumber(clean);
    if (found) {
      setSelectedTicket(found);
      setTrackingTicketNumber(found.ticketNumber);
    } else {
      // Check if user entered an 8-digit student ID
      const byStudentId = tickets.find((t) => t.studentId === clean);
      if (byStudentId) {
        setSelectedTicket(byStudentId);
        setTrackingTicketNumber(byStudentId.ticketNumber);
        setInputVal(byStudentId.ticketNumber);
      }
    }
  };

  const handleSelectTicket = (t: any) => {
    setInputVal(t.ticketNumber);
    setTrackingTicketNumber(t.ticketNumber);
    setSelectedTicket(t);
  };

  const handleCopy = () => {
    if (!activeTicket) return;
    navigator.clipboard.writeText(activeTicket.ticketNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Student Context Notice Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-stone-900 text-white p-5 rounded-2xl border border-emerald-800/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
              STUDENT DOCUMENT TRACKING
            </span>
            <span className="text-xs text-stone-300 font-mono">
              Student ID: {currentStudent.studentId}
            </span>
          </div>
          <h2 className="font-heading font-bold text-lg text-white">
            Live Request Status Portal
          </h2>
          <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
            When you request documents at the school registrar counter, your evaluator generates a support ticket.
            Your ticket automatically appears here for end-to-end tracking from review to release.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-800/60 border border-emerald-700/60 text-emerald-200 text-xs shrink-0 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Registrar Counter Claim Only</span>
        </div>
      </div>

      {/* Filed Tickets for Current Student (Auto-populated from Registrar Submissions) */}
      {studentTickets.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-stone-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-800" />
              My Registered Tickets ({studentTickets.length})
            </h3>
            <span className="text-[11px] text-stone-400">Click any ticket to inspect real-time progress</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {studentTickets.map((t) => {
              const isSelected = activeTicket?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                      : 'border-stone-200 bg-stone-50/60 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-stone-900">{t.ticketNumber}</span>
                    <StatusBadge status={t.status} size="sm" />
                  </div>
                  <p className="font-semibold text-xs text-stone-800 mt-1.5 truncate">
                    {t.documentType !== 'None' ? t.documentType : t.category}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-stone-500 mt-2 pt-2 border-t border-stone-200/60">
                    <span>Est: {t.estimatedReleaseDate.split(',')[0]}</span>
                    <span className="font-medium text-emerald-700 font-mono">Stage: {t.stage}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Header & Search Bar */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Real-Time Tracking Engine
            </span>
            <h1 className="mt-2 font-heading font-bold text-2xl text-stone-900">
              Track Request by Ticket #
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Enter your Ticket Number (e.g. REG-2026-00125) or 8-digit Student ID to check evaluator progress and release date.
            </p>
          </div>

          {/* Quick Search Input */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Enter Ticket # (e.g. REG-2026-00125)..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-mono font-medium"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
            >
              Search
            </button>
          </form>
        </div>

        {/* Quick Sample Selector Chips */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-stone-400 font-medium">Quick Examples:</span>
          {tickets.slice(0, 4).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setInputVal(t.ticketNumber);
                setTrackingTicketNumber(t.ticketNumber);
                setSelectedTicket(t);
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs transition-all cursor-pointer font-mono ${
                activeTicket?.id === t.id
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                  : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
              }`}
            >
              {t.ticketNumber} ({t.category})
            </button>
          ))}
        </div>
      </div>

      {activeTicket ? (
        <div className="space-y-6">
          {/* Main Ticket Overview Card */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-6">
            {/* Top Bar with Ticket # and Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                  📋
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xl sm:text-2xl text-stone-900 tracking-wider">
                      {activeTicket.ticketNumber}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Copy Ticket Number"
                    >
                      {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {copied && <span className="text-xs text-emerald-600 font-medium">Copied!</span>}
                  </div>
                  <p className="text-xs text-stone-500 font-medium mt-0.5">
                    Category: <strong className="text-stone-800">{activeTicket.category}</strong>
                    {activeTicket.documentType !== 'None' && ` • Document: ${activeTicket.documentType}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:self-center">
                <PriorityBadge priority={activeTicket.priority} />
                <StatusBadge status={activeTicket.status} size="lg" />
              </div>
            </div>

            {/* Subject and Description */}
            <div className="p-4 rounded-xl bg-stone-50/70 border border-stone-200/80">
              <h2 className="font-heading font-bold text-base text-stone-900">
                {activeTicket.subject}
              </h2>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                {activeTicket.description}
              </p>

              {activeTicket.documentType !== 'None' && (
                <div className="mt-3 pt-3 border-t border-stone-200/60 flex flex-wrap gap-4 text-xs text-stone-600">
                  <div>
                    <span className="text-stone-400">Copies: </span>
                    <strong className="text-stone-800">{activeTicket.copies || 1} copy</strong>
                  </div>
                  <div>
                    <span className="text-stone-400">Delivery: </span>
                    <strong className="text-stone-800">{activeTicket.deliveryOption || 'Office Pick-up'}</strong>
                  </div>
                  {activeTicket.purpose && (
                    <div>
                      <span className="text-stone-400">Purpose: </span>
                      <strong className="text-stone-800">{activeTicket.purpose}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Multi-Stage Visual Timeline */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-sm text-stone-900 uppercase tracking-wider text-xs">
                  Request Processing Timeline
                </h3>
                <span className="text-xs text-stone-400 font-medium">4-Stage Verification</span>
              </div>
              <TimelineProgress ticket={activeTicket} />
            </div>

            {/* Request Summary Footer */}
            <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Official University Document Request • Status tracked in real-time</span>
              </div>
              <span className="font-mono text-stone-400 text-[11px]">Office of the University Registrar</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center">
          <AlertCircle className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <h3 className="font-heading font-bold text-lg text-stone-800">
            No Ticket Found with Number &quot;{inputVal}&quot;
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Please double-check your ticket format (e.g. REG-2026-00125) or click one of the quick samples above.
          </p>
        </div>
      )}
    </div>
  );
};
