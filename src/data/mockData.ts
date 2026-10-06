import { FAQItem } from '../types';

export const INITIAL_FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How do I request my Transcript of Records (TOR)?',
    answer:
      'Ask the Registrar’s Receiving staff to file your TOR request at the counter. Keep the tracking number they provide, then use Track Request in this online helpdesk to follow its progress.',
    category: 'Document Requests',
    relatedCategory: 'Transcript of Records',
    turnaroundTime: '3 to 5 working days',
    requirements: [
      'Cleared university clearance status',
      'Valid student or alumni identification',
    ],
    steps: [
      'Ask the Registrar’s Receiving staff to file the request at the counter.',
      'Keep the tracking number provided by the staff.',
      'Enter it in Track Request in the online helpdesk to follow progress.',
    ],
  },
  {
    id: 'faq-2',
    question: 'How long does a certificate request take?',
    answer:
      'Standard certifications such as Certificate of Enrollment (COE), Certificate of Grades (COG), and Certificate of Good Moral Character generally take 1 to 2 business days from the moment of review. Authentication (CAV) and foreign credential packages take 3 to 7 working days depending on CHED endorsement.',
    category: 'Processing Time',
    relatedCategory: 'Certificates',
    turnaroundTime: '1 to 2 working days for basic certificates; 3-5 days for CAV',
    requirements: [
      'Active enrollment or validated registration form',
      'No outstanding financial or library holds',
    ],
    steps: [
      'Submit request under "Certificates" category.',
      'System calculates the official Estimated Release Date.',
      'Receive instant notification when ready to pick up.',
    ],
  },
  {
    id: 'faq-3',
    question: 'What documents do I need to prepare when requesting records?',
    answer:
      'Requirements vary based on your requested service. For basic certificates, your valid Student ID and Registration Assessment Form (RAF) are sufficient. For official TOR, ensure your semester clearance is completed. For Lost ID replacements, provide a notarized Affidavit of Loss. For authorized representatives claiming on your behalf, provide an Authorization Letter and valid government IDs of both parties.',
    category: 'Requirements & Checklists',
    relatedCategory: 'Student Records',
    turnaroundTime: 'Same day checklist validation',
    requirements: [
      'Original Valid Student ID',
      'Registrar Ticket Number / Confirmation stub',
      'Clearance confirmation slip (for graduates)',
      'Notarized Affidavit (for lost documents/IDs)',
    ],
  },
  {
    id: 'faq-4',
    question: 'Where and how do I claim my processed documents?',
    answer:
      'Processed documents can be claimed at the Registrar Ground Floor Administration Hall. Each category has dedicated counter windows: Window 1 (Enrollment & Grades), Window 2 (Records & CAV), Window 3 (Transcript of Records), Window 4 (Certificates & Good Moral), and Window 5 (Student IDs & Biometrics). Check your ticket status—it will display the specific counter window and exact hours once marked "Ready for Release".',
    category: 'Claiming & Releasing',
    relatedCategory: 'Other',
    turnaroundTime: 'Immediate upon arrival with Ticket Number',
    requirements: [
      'Present your Ticket Number (e.g. REG-2026-00125) on your mobile screen or printed stub',
      'Present 1 physical valid ID',
      'Claiming hours: 8:00 AM to 6:00 PM (Monday to Thursday); 8:00 AM to 5:00 PM (Friday)',
    ],
  },
  {
    id: 'faq-5',
    question: 'Can I resolve my concerns without visiting the physical registrar office?',
    answer:
      'Yes! That is the core goal of this online portal. By using the built-in "Registrar Chat / Messaging" on your ticket, you can speak directly with the evaluator or records officer handling your concern. You can clarify requirements, follow up on urgent deadlines, and get instant answers without taking time out of class to line up.',
    category: 'Online Helpdesk',
    relatedCategory: 'Other',
  },
  {
    id: 'faq-6',
    question: 'What should I do if my request status is marked "Rejected / Needs Information"?',
    answer:
      'Do not worry—your request is not canceled. "Needs Information" simply means the registrar evaluator requires clarification, a clearer scan of an attachment, or payment verification. Check the reason provided on your tracking timeline, and reply via the Registrar Chat tab on your ticket to submit the requested info.',
    category: 'Status & Tracking',
    relatedCategory: 'Other',
  },
];