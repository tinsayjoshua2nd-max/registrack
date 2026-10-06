// HOW TO EDIT THIS NOTICE (no coding needed)
// - Change the text between the quote marks. Keep the quotes and commas.
// - To add a paragraph or bullet, copy a line and edit it.
// - When the wording changes, raise PRIVACY_NOTICE_VERSION (e.g. '2026-10-v2').
//   Everyone will then be asked to accept again.
export const PRIVACY_NOTICE_VERSION = '2026-10-v1';
export const PRIVACY_NOTICE_TITLE = 'Privacy Notice';
export const PRIVACY_CONSENT_LABEL =
  'I have read and agree to the Privacy Notice and Terms and Conditions.';

export type NoticeSection = {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  closing?: string[];
  separatorBefore?: boolean;
};

export const PRIVACY_NOTICE_SECTIONS: NoticeSection[] = [
  {
    paragraphs: [
      "This Privacy Notice outlines the data collection, processing, sharing, confidentiality, security, retention, and disposal practices of this application or organization in compliance with applicable data privacy laws and regulations, including the principles of lawful, fair, and transparent processing of personal data.",
    ],
  },
  {
    heading: 'Collection of Information',
    paragraphs: [
      "This application collects personal information that is necessary and compatible with declared, specified, and legitimate purposes. Depending on the service being requested, the following information may be collected:",
    ],
    bullets: [
      "Personal information (e.g., full name, identification number, address, email address, and mobile/telephone number);",
      "Demographic information (e.g., program, department, role, affiliation, or other relevant details);",
      "Contact information of parents, legal guardians, emergency contacts, or authorized representatives (e.g., name, contact number, and relationship);",
      "Other information necessary to process requests, provide services, verify identity, or comply with legal obligations.",
    ],
  },
  {
    heading: 'Purpose of Collection',
    paragraphs: [
      "Personal information is collected and used only for the purposes for which it was obtained. Such purposes may include:",
    ],
    bullets: [
      "Processing requests, applications, transactions, or inquiries;",
      "Providing requested services and support;",
      "Maintaining records and documentation;",
      "Verifying identity and eligibility;",
      "Communicating updates, notifications, and responses;",
      "Complying with legal, regulatory, and administrative requirements.",
    ],
  },
  {
    heading: 'Data and Information Sharing',
    paragraphs: [
      "Personal information is shared internally only with authorized personnel who require access to perform their official duties and responsibilities.",
      "Personal information will not be disclosed to third parties for commercial purposes without the data subject's prior consent, except when permitted or required by law.",
    ],
  },
  {
    heading: 'Data Security, Retention, and Disposal',
    paragraphs: [
      "Personal data may be stored in electronic, digital, and/or paper-based formats.",
      "Reasonable organizational, physical, and technical security measures are implemented to protect personal data against unauthorized access, disclosure, alteration, misuse, loss, destruction, or other unlawful processing activities.",
      "Personal information shall be retained only for as long as necessary to fulfill the purposes for which it was collected, comply with legal and regulatory requirements, resolve disputes, and enforce agreements.",
      "Unless otherwise required by law or organizational policy, personal data may be retained for up to three (3) years following the last recorded interaction or transaction.",
      "Upon expiration of the retention period, personal data shall be securely disposed of through methods such as secure deletion, anonymization, shredding of physical records, or other appropriate disposal mechanisms.",
    ],
  },
  {
    heading: 'Your Rights as a Data Subject',
    paragraphs: [
      "Subject to applicable laws and regulations, you have the right to:",
    ],
    bullets: [
      "Be informed about the collection and processing of your personal data;",
      "Access your personal data and request a copy thereof;",
      "Correct inaccurate, incomplete, outdated, or erroneous personal data;",
      "Object to the processing of your personal data under certain circumstances;",
      "Request the suspension, withdrawal, deletion, blocking, or destruction of personal data where applicable;",
      "Request data portability where technically feasible;",
      "File a complaint with the appropriate regulatory authority; and",
      "Seek compensation for damages arising from unlawful processing of personal data, subject to applicable laws.",
    ],
  },
  {
    heading: 'Contact Us',
    paragraphs: [
      "For inquiries, concerns, requests, or complaints regarding the processing of personal information, data privacy practices, or the exercise of data subject rights, you may contact:",
      "Data Protection Officer (DPO)",
    ],
    bullets: [
      "Email: dpo@example.com",
      "Phone: +63 XXX XXX XXXX",
      "Address: Data Protection Office, [Organization Address]",
    ],
  },
  {
    heading: 'Acknowledgement and Consent',
    separatorBefore: true,
    paragraphs: [
      "By submitting this form, I acknowledge that I have read and understood this Privacy Notice and consent to the collection, processing, storage, use, sharing, and disclosure of my personal information and, where applicable, sensitive personal information, for the purposes stated herein and in accordance with applicable laws and regulations.",
      "I further declare that all information I have provided is true, accurate, and complete to the best of my knowledge. This consent remains valid unless withdrawn in accordance with applicable data privacy laws and subject to any legal or contractual limitations.",
    ],
  },
];
