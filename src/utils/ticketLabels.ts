const stageLabels: Record<string, string> = {
  submitted: 'Submitted',
  processing: 'Processing',
  for_seal: 'For University Seal',
  ready: 'Ready',
  completed: 'Completed',
  reviewed: 'Reviewed',
  '(missing)': '(missing)',
};

const auditRoleLabels: Record<string, string> = {
  receiver: 'Receiver / Receiving',
  records_management: 'Records Management',
  evaluator: 'Evaluator',
  registrar: 'Registrar Officer',
  superadmin: 'Super Administrator',
};

export function getTicketStageLabel(stage: string): string {
  const normalizedStage = stage.trim().toLowerCase();
  if (!normalizedStage) return stage;
  return stageLabels[normalizedStage] ??
    normalizedStage.replace(/[_-]+/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function formatAuditStageDetails(details: string): string {
  return details.replace(
    /^(Ticket\s+#[^:]+:\s*)(\(missing\)|[A-Za-z0-9_-]+)(\s*→\s*)(\(missing\)|[A-Za-z0-9_-]+)/i,
    (_match, prefix: string, fromStage: string, arrow: string, toStage: string) =>
      `${prefix}${getTicketStageLabel(fromStage)}${arrow}${getTicketStageLabel(toStage)}`,
  );
}

export function getAuditRoleLabel(role: string): string {
  return auditRoleLabels[role.trim().toLowerCase()] ?? role;
}