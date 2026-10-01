import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import {
  TicketCategory,
  DocumentType,
  TicketPriority,
  Ticket,
} from '../../types';
import {
  Send,
  CheckCircle2,
  Copy,
  Clock,
  Calendar,
  AlertCircle,
  FileCheck,
  Building,
  Info,
  ArrowRight,
  Shield,
} from 'lucide-react';

const CATEGORIES: { label: TicketCategory; icon: string; description: string }[] = [
  { label: 'Enrollment', icon: '📝', description: 'Adding/dropping, curriculum evaluation, late registration' },
  { label: 'Grades', icon: '📊', description: 'Grade completion forms, grade encoding follow-ups, correction' },
  { label: 'Transcript of Records', icon: '📜', description: 'Official TOR for employment, board exams, or scholarships' },
  { label: 'Certificates', icon: '🎖️', description: 'Certificate of Enrollment, Grades, or Good Moral' },
  { label: 'Student Records', icon: '📁', description: 'Form 137/138, certified true copies, HD (Honorable Dismissal)' },
  { label: 'ID concerns', icon: '🪪', description: 'Lost RFID card, re-validation sticker, photo updates' },
  { label: 'Clearance', icon: '✅', description: 'Graduation clearance, semestral exit, library accountability' },
  { label: 'Other', icon: '💬', description: 'General registrar inquiries and special student petitions' },
];

const DOCUMENT_OPTIONS: DocumentType[] = [
  'None',
  'TOR',
  'Certificate of Enrollment',
  'Certificate of Grades',
  'Good Moral Certificate',
  'Authentication requests',
];

export const SubmitTicketView: React.FC = () => {
  const {
    currentStudent,
    submitNewTicket,
    setTrackingTicketNumber,
    setSelectedTicket,
    setStudentView,
  } = useHelpdesk();

  const [category, setCategory] = useState<TicketCategory>('Transcript of Records');
  const [documentType, setDocumentType] = useState<DocumentType>('TOR');
  const [copies, setCopies] = useState<number>(1);
  const [purpose, setPurpose] = useState<string>('Scholarship Application / Employment Verification');
  const [deliveryOption, setDeliveryOption] = useState<'Office Pick-up' | 'Digital Copy (Official PDF)' | 'Courier Delivery'>('Office Pick-up');
  const [priority, setPriority] = useState<TicketPriority>('Normal');
  const [subject, setSubject] = useState<string>('Request for Official Transcript of Records (TOR)');
  const [description, setDescription] = useState<string>(
    'Good day Registrar Office, I would like to request 1 official copy of my Transcript of Records for my upcoming corporate internship and scholarship endorsement. Kindly advise on the evaluation schedule.'
  );

  const [studentName, setStudentName] = useState(currentStudent.name);
  const [studentId, setStudentId] = useState(currentStudent.studentId);
  const [email, setEmail] = useState(currentStudent.email);
  const [phone, setPhone] = useState('+63 917 555 0192');
  const [degreeProgram, setDegreeProgram] = useState(currentStudent.degreeProgram);
  const [yearLevel, setYearLevel] = useState(currentStudent.yearLevel);

  const [submittedTicket, setSubmittedTicket] = useState<Ticket | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCategoryChange = (cat: TicketCategory) => {
    setCategory(cat);
    if (cat === 'Transcript of Records') {
      setDocumentType('TOR');
      setSubject('Request for Official Transcript of Records (TOR)');
    } else if (cat === 'Certificates') {
      setDocumentType('Certificate of Enrollment');
      setSubject('Request for Certificate of Enrollment');
    } else if (cat === 'Grades') {
      setDocumentType('Certificate of Grades');
      setSubject('Grade Correction / Incomplete Grade Follow-up');
    } else if (cat === 'ID concerns') {
      setDocumentType('None');
      setSubject('Lost Student RFID ID Card Replacement');
    } else if (cat === 'Enrollment') {
      setDocumentType('None');
      setSubject('Enrollment Unit Overload & Adding Subject Petition');
    } else {
      setDocumentType('None');
      setSubject(`${cat} Inquiry`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !subject.trim()) return;

    const created = submitNewTicket({
      studentName,
      studentId,
      email,
      phone,
      degreeProgram,
      yearLevel,
      category,
      documentType,
      copies: documentType !== 'None' ? copies : undefined,
      purpose: documentType !== 'None' ? purpose : undefined,
      deliveryOption,
      subject,
      description,
      priority,
    });

    setSubmittedTicket(created);
  };

  const handleCopy = () => {
    if (!submittedTicket) return;
    navigator.clipboard.writeText(submittedTicket.ticketNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToTracking = () => {
    if (!submittedTicket) return;
    setTrackingTicketNumber(submittedTicket.ticketNumber);
    setSelectedTicket(submittedTicket);
    setStudentView('track');
  };

  // If already submitted, display high-impact confirmation card
  if (submittedTicket) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-100 rounded-full blur-2xl pointer-events-none" />

          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="inline-block text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            Support Ticket Generated Successfully
          </span>

          <h2 className="mt-3 font-heading font-bold text-2xl sm:text-3xl text-stone-900">
            Your Request is in Queue
          </h2>
          <p className="mt-2 text-sm text-stone-600 max-w-md mx-auto">
            You can now monitor the real-time progress and estimated release of your documents online.
          </p>

          {/* Ticket Number Highlight */}
          <div className="mt-6 p-4 rounded-xl bg-stone-50 border border-stone-200 max-w-md mx-auto">
            <p className="text-xs text-stone-500 font-semibold uppercase tracking-wider">
              Your Unique Ticket Number
            </p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="font-mono font-bold text-2xl sm:text-3xl text-emerald-950 tracking-wider">
                {submittedTicket.ticketNumber}
              </span>
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg bg-white border border-stone-300 hover:border-emerald-500 hover:text-emerald-700 transition-colors text-stone-600 cursor-pointer"
                title="Copy Ticket Number"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copied && <p className="text-xs text-emerald-600 font-medium mt-1">Copied to clipboard!</p>}
          </div>

          {/* Estimated Release Card */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto text-left">
            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80">
              <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                <span>Estimated Release</span>
              </div>
              <p className="mt-1 text-sm font-bold text-emerald-950">
                {submittedTicket.estimatedReleaseDate}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-stone-100 border border-stone-200">
              <div className="flex items-center gap-1.5 text-stone-700 text-xs font-semibold">
                <Building className="w-3.5 h-3.5 text-emerald-700" />
                <span>Assigned Office</span>
              </div>
              <p className="mt-1 text-sm font-bold text-stone-800">
                {submittedTicket.assignedTo}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleGoToTracking}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Track Real-Time Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSubmittedTicket(null);
                setSubject('');
                setDescription('');
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-sm transition-colors cursor-pointer"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          Online Helpdesk Platform
        </span>
        <h1 className="mt-2 font-heading font-bold text-2xl sm:text-3xl text-stone-900">
          Submit an Inquiry or Request
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Avoid lining up at the administration building. File your request below to generate an official tracking ticket.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Category Picker */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <label className="block text-sm font-bold text-stone-900 mb-1">
            1. Choose Category <span className="text-rose-500">*</span>
          </label>
          <p className="text-xs text-stone-500 mb-4">
            Select the registrar service department related to your concern.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.label;
              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => handleCategoryChange(cat.label)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-200 text-emerald-950 font-semibold shadow-xs'
                      : 'border-stone-200 bg-stone-50/60 hover:bg-stone-100/80 text-stone-700'
                  }`}
                >
                  <div className="text-xl mb-1.5">{cat.icon}</div>
                  <div>
                    <p className="text-xs font-bold leading-tight">{cat.label}</p>
                    <p className="text-[10px] text-stone-500 leading-snug mt-1 line-clamp-2">
                      {cat.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Document Request Management (Optional fields for Document requests) */}
        {(category === 'Transcript of Records' ||
          category === 'Certificates' ||
          category === 'Student Records') && (
          <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <FileCheck className="w-5 h-5 text-emerald-700" />
              <h2 className="font-heading font-bold text-base text-emerald-950">
                Official Document Request Details
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Specific Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  {DOCUMENT_OPTIONS.map((doc) => (
                    <option key={doc} value={doc}>
                      {doc === 'None' ? 'General Inquiry (No Document)' : doc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Number of Copies
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <span className="text-xs text-stone-500">Official certified copy/copies</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Purpose of Request
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Scholarship Application, Employment, Board Examination, Visa"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Claiming / Delivery Preference
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['Office Pick-up', 'Digital Copy (Official PDF)', 'Courier Delivery'] as const).map(
                    (opt) => (
                      <label
                        key={opt}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          deliveryOption === opt
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                            : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliveryOption"
                          value={opt}
                          checked={deliveryOption === opt}
                          onChange={() => setDeliveryOption(opt)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{opt}</span>
                      </label>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Concern Description & Priority */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <h2 className="font-heading font-bold text-base text-stone-900">
            2. Concern & Ticket Details
          </h2>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Subject / Request Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of what you need..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Detailed Description / Inquiry Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State full details, course codes, term years, or specific instructions so staff can evaluate your request quickly..."
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            />
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Priority Urgency
            </label>
            <div className="flex flex-wrap gap-2">
              {(['Normal', 'Urgent', 'Deadline-sensitive'] as TicketPriority[]).map((pri) => (
                <button
                  key={pri}
                  type="button"
                  onClick={() => setPriority(pri)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    priority === pri
                      ? pri === 'Deadline-sensitive'
                        ? 'bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-rose-200'
                        : pri === 'Urgent'
                        ? 'bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-200'
                      : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {pri === 'Deadline-sensitive' && '⚡ '}
                  {pri === 'Urgent' && '⚠️ '}
                  {pri}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Choose &quot;Deadline-sensitive&quot; if you have an upcoming scholarship or immigration board submission deadline.
            </p>
          </div>
        </div>

        {/* Step 4: Student Contact Confirmation */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <h2 className="font-heading font-bold text-base text-stone-900 mb-3">
            3. Student Identity & Contact Confirmation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Student Full Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-stone-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Student ID #</label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-stone-50 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Degree Program</label>
              <input
                type="text"
                value={degreeProgram}
                onChange={(e) => setDegreeProgram(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-stone-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Year Level</label>
              <input
                type="text"
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-stone-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Email (For Status Updates)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-stone-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Mobile Contact Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-stone-50"
              />
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Shield className="w-4 h-4 text-emerald-700" />
            <span>Encrypted submission to University Registrar Records Vault</span>
          </div>

          <button
            id="submit-ticket-button"
            type="submit"
            className="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Generate Support Ticket</span>
          </button>
        </div>
      </form>
    </div>
  );
};
