import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { StatusBadge } from '../Common/StatusBadge';
import { Ticket } from '../../types';
import {
  Send,
  MessageSquare,
  ShieldCheck,
  Building,
  User,
  Paperclip,
  CheckCircle2,
  Clock,
  Info,
} from 'lucide-react';

export const RegistrarChatView: React.FC = () => {
  const {
    tickets,
    currentStudent,
    activeChatTicket,
    setActiveChatTicket,
    sendTicketMessage,
    role,
    users,
    studentRecords,
  } = useHelpdesk();

  const [messageInput, setMessageInput] = useState('');

  // Default to active chat ticket, or first ticket
  const selectedTicket = activeChatTicket || tickets[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedTicket) return;

    sendTicketMessage(
      selectedTicket.id,
      messageInput.trim(),
      role === 'student' ? 'student' : 'registrar',
      role === 'student' ? currentStudent.name : selectedTicket.assignedTo
    );

    setMessageInput('');
  };

  const handleQuickPrompt = (promptText: string) => {
    setMessageInput(promptText);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header Banner */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Official Registrar Helpdesk Messaging
          </span>
          <h1 className="mt-2 font-heading font-bold text-2xl sm:text-3xl text-stone-900">
            Registrar Chat & Follow-ups
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Communicate directly with your assigned evaluator. Clarify requirements and follow up without visiting the physical counter.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 max-w-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>
            Avoid in-person queuing: Registrar staff are notified immediately when you message.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden min-h-[480px] lg:min-h-[580px]">
        {/* Left Column: Tickets Conversations List */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-stone-200 bg-stone-50/50 p-4 flex flex-col">
          <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
            Select Ticket Thread ({tickets.length})
          </h2>

          <div className="space-y-2 overflow-y-auto max-h-[38dvh] lg:max-h-[480px] flex-1">
            {tickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const lastMsg = t.messages[t.messages.length - 1];

              return (
                <button
                  key={t.id}
                  onClick={() => setActiveChatTicket(t)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-emerald-600 shadow-xs ring-1 ring-emerald-500/20'
                      : 'bg-white/80 border-stone-200 hover:bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono font-bold text-xs text-emerald-950">
                      {t.ticketNumber}
                    </span>
                    <span className="text-[10px] text-stone-600 font-semibold">{t.category}</span>
                  </div>

                  <p className="text-xs font-semibold text-stone-900 truncate">
                    {t.subject}
                  </p>

                  <p className="text-[11px] text-stone-600 truncate mt-1">
                    {lastMsg ? `Last: ${lastMsg.message}` : 'No messages yet. Ask a question!'}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-stone-600 pt-1.5 border-t border-stone-100">
                    <span className="truncate max-w-[130px]">👤 {t.assignedTo}</span>
                    <span className="font-medium text-emerald-700">{t.status.toUpperCase()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chat Conversation Thread */}
        <div className="lg:col-span-8 flex flex-col justify-between p-4 sm:p-6 bg-white">
          {selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="pb-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                    🏛️
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-stone-900">
                        {selectedTicket.ticketNumber}
                      </span>
                      <StatusBadge status={selectedTicket.status} size="sm" />
                    </div>
                    <p className="text-xs text-stone-500 font-medium">
                      Assigned to: <strong className="text-emerald-900">{selectedTicket.assignedTo}</strong> • {selectedTicket.category}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs text-stone-500">
                  <p>Estimated Release:</p>
                  <p className="font-semibold text-stone-800">{selectedTicket.estimatedReleaseDate}</p>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[220px] max-h-[45dvh] sm:max-h-[420px] pr-2">
                {/* Official System Notice */}
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-center text-xs text-stone-600 max-w-md mx-auto">
                  <p className="font-semibold text-stone-800">
                    Official Ticket Channel for {selectedTicket.ticketNumber}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Messages sent here are recorded in your official academic records log. Staff typically reply within 1-3 hours during business days.
                  </p>
                </div>

                {selectedTicket.messages.map((msg) => {
                  const isUser = msg.senderRole === (role === 'student' ? 'student' : 'registrar');
                  const senderPic =
                    users.find((u) => u.name === msg.senderName)?.profilePicture ||
                    studentRecords.find((s) => s.name === msg.senderName)?.profilePicture;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse items-end' : 'flex-row items-start'}`}
                    >
                      {/* Avatar / Profile Picture */}
                      {senderPic ? (
                        <img
                          src={senderPic}
                          alt={msg.senderName}
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-stone-200"
                        />
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isUser ? 'bg-emerald-800 text-white' : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {msg.senderName.charAt(0)}
                        </div>
                      )}

                      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[11px] font-semibold text-stone-700">
                            {msg.senderName}
                          </span>
                          {msg.senderRole === 'registrar' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Registrar Staff
                            </span>
                          )}
                          <span className="text-[10px] text-stone-400">{msg.timestamp}</span>
                        </div>

                        <div
                          className={`rounded-2xl p-3 text-xs leading-relaxed ${
                            isUser
                              ? 'bg-emerald-700 text-white rounded-tr-xs shadow-xs'
                              : 'bg-stone-100 text-stone-900 border border-stone-200 rounded-tl-xs'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {selectedTicket.messages.length === 0 && (
                  <div className="py-12 text-center text-stone-400">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No messages yet. Send a question to your assigned evaluator!</p>
                  </div>
                )}
              </div>

              {/* Quick Prompt Suggestions */}
              <div className="pt-2 pb-3 border-t border-stone-100">
                <p className="text-[11px] font-semibold text-stone-400 mb-1.5">Quick Suggested Queries:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'May I designate an authorized representative with an authorization letter?',
                    'Can I request an official digital copy (PDF) while waiting for pickup?',
                    'What time is the releasing counter open for claiming?',
                    'Is my student clearance complete for this request?',
                  ].map((prompt, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => handleQuickPrompt(prompt)}
                      className="px-2.5 py-1 rounded-lg text-[11px] bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 hover:border-emerald-300 text-stone-600 transition-colors cursor-pointer text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={`Message ${selectedTicket.assignedTo} regarding ${selectedTicket.ticketNumber}...`}
                    className="w-full px-4 py-2.5 text-xs rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </button>
              </form>
            </>
          ) : (
            <div className="py-20 text-center text-stone-400">
              <p className="text-sm">Select a ticket to begin chatting with registrar officers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
