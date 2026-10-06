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
  receiver: 'Receiver / Releasing',
  records_management: 'Records Management',
  evaluator: 'Evaluator',
  registrar: 'Registrar Officer',
  superadmin: 'Registrar Officer',
  'super admin': 'Registrar Officer',
  'super administrator': 'Registrar Officer',
};

export function formatRegistrarTerminology(text: string): string {
  return text.replace(/\bSuper[\s_-]*Admin(?:istrator)?(s?)\b/gi,
    (_match, plural: string) => `Registrar Officer${plural}`);
}

export function getTicketStageLabel(stage: string): string {
  const normalizedStage = stage.trim().toLowerCase();
  if (!normalizedStage) return stage;
  return stageLabels[normalizedStage] ??
    normalizedStage.replace(/[_-]+/g, ' ').replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function formatAuditStageDetails(details: string): string {
  const formattedTransition = details.replace(
    /^(Ticket\s+#[^:]+:\s*)(\(missing\)|[A-Za-z0-9_-]+)(\s*→\s*)(\(missing\)|[A-Za-z0-9_-]+)/i,
    (_match, prefix: string, fromStage: string, arrow: string, toStage: string) =>
      `${prefix}${getTicketStageLabel(fromStage)}${arrow}${getTicketStageLabel(toStage)}`,
  );
  return formatRegistrarTerminology(formattedTransition.replace(
    /\b(Stage changed to )([A-Za-z0-9_-]+)\b/i,
    (_match, prefix: string, stage: string) => `${prefix}${getTicketStageLabel(stage)}`,
  ));
}

export function getAuditRoleLabel(role: string): string {
  return auditRoleLabels[role.trim().toLowerCase()] ?? formatRegistrarTerminology(role);
}

export function getTicketMilestoneLabel(ticket: { stage: string; status: string }): string {
  const stageLabel = getTicketStageLabel(ticket.stage);
  return ticket.status === 'rejected'
    ? `NEEDS INFORMATION (held at ${stageLabel})`
    : stageLabel;
}
