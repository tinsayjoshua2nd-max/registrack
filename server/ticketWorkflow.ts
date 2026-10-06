import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { hasRegistrarAccess } from './registrarAccess';

type Data = Record<string, unknown>;
export type WorkflowActor = { accountId: string; accountRole: string; name: string; email: string };
type Dependencies = {
  lock: (client: PoolClient, key: string) => Promise<unknown>;
  save: (client: PoolClient, key: string, payload: unknown) => Promise<void>;
  access: (ticket: Data, actor: WorkflowActor, client: PoolClient) => boolean | Promise<boolean>;
  assignment: (client: PoolClient, previous: Data, incoming: Data) => Promise<void>;
  completion: (ticket: Data, actor: WorkflowActor) => Data;
};
export const WORKFLOW_STAGES = ['submitted', 'processing', 'for_seal', 'ready', 'completed'];
export const normalizeWorkflowStage = (stage: unknown): string =>
  stage === 'reviewed' ? 'processing' : typeof stage === 'string' ? stage : '';
export const PROTECTED_WORKFLOW_FIELDS = [
  'stage', 'status', 'timelineHistory', 'actualReleaseDate', 'rejectionReason',
  'completedByOfficerName', 'completedByOfficerRole', 'completedByOfficerEmail', 'completionNotes',
];
export class WorkflowError extends Error {
  constructor(public statusCode: number, message: string) { super(message); }
}
function records(value: unknown): Data[] {
  if (!Array.isArray(value) || value.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new WorkflowError(500, 'Workflow storage is unavailable.');
  }
  return value as Data[];
}
const requireReason = (reason: string) => {
  if (!reason) throw new WorkflowError(400, 'Enter a reason for this action.');
};

export async function appendWorkflowEvidence(
  client: PoolClient, previous: Data, updated: Data, actor: WorkflowActor,
  action: string, notes: string, deps: Pick<Dependencies, 'lock' | 'save'>, operationId?: string,
): Promise<Data> {
  const timestamp = new Date().toISOString();
  const title = action === 'reopen' ? 'Ticket Reopened' : action === 'repair' ? 'Legacy Stage Repaired'
    : action === 'reject' ? 'Information Requested' : action === 'handoff' ? 'Ticket Handed Off'
      : action === 'backup_restore' ? 'Stage Restored from Backup' : `Stage: ${String(updated.stage)}`;
  const event = { stage: updated.stage, title, timestamp, actor: actor.name, notes,
    fromStage: previous.stage ?? null, action, operationId, isCurrent: true, isPassed: updated.stage === 'completed' };
  const ticket = { ...updated, updatedAt: timestamp,
    timelineHistory: [...(Array.isArray(updated.timelineHistory) ? updated.timelineHistory : []), event] };
  const logs = records(await deps.lock(client, 'auditLogs'));
  await deps.save(client, 'auditLogs', [...logs, {
    id: `workflow-audit-${randomUUID()}`, timestamp, actorName: actor.name, actorRole: actor.accountRole,
    actorAccountId: actor.accountId, action: `WORKFLOW_${action.toUpperCase()}`, category: 'Ticket',
    ticketId: updated.id, fromStage: previous.stage ?? null, toStage: updated.stage, operationId,
    details: `Ticket #${String(updated.ticketNumber)}: ${String(previous.stage ?? '(missing)')} → ${String(updated.stage)}. ${notes}`,
    ipAddress: '', severity: action === 'reopen' || action === 'repair' ? 'warning' : 'info',
  }]);
  return ticket;
}

export async function performTicketWorkflow(
  client: PoolClient, id: string, input: Data, actor: WorkflowActor, deps: Dependencies,
): Promise<Data> {
  if (actor.accountRole === 'student') throw new WorkflowError(403, 'Students cannot change request workflow.');
  const tickets = records(await deps.lock(client, 'tickets'));
  const previous = tickets.find(ticket => ticket.id === id);
  if (!previous) throw new WorkflowError(404, 'This request is no longer active.');
  if (!(await deps.access(previous, actor, client))) throw new WorkflowError(403, 'You can only update tickets assigned to your account.');
  const action = String(input.action || 'stage');
  if (!['stage', 'handoff', 'reject', 'reopen', 'force_close', 'repair'].includes(action)) {
    throw new WorkflowError(400, 'Choose a valid workflow action.');
  }
  const operationId = typeof input.operationId === 'string' ? input.operationId.trim() : '';
  if (!operationId || operationId.length > 180) throw new WorkflowError(400, 'A unique workflow operation ID is required.');
  const history = Array.isArray(previous.timelineHistory) ? previous.timelineHistory : [];
  const replay = history.find(event => event && typeof event === 'object' && event.operationId === operationId);
  if (replay) {
    if (replay.action !== action || (input.targetStage && replay.stage !== input.targetStage)) {
      throw new WorkflowError(409, 'This operation ID was already used for a different action.');
    }
    return previous;
  }
  if (typeof input.expectedUpdatedAt !== 'string' || input.expectedUpdatedAt !== String(previous.updatedAt || '')) {
    throw new WorkflowError(409, 'This request changed. Refresh it before taking another action.');
  }
  const stage = normalizeWorkflowStage(previous.stage);
  const index = WORKFLOW_STAGES.indexOf(stage);
  const finished = stage === 'completed' || previous.status === 'completed';
  const reason = typeof input.notes === 'string' ? input.notes.trim().slice(0, 1000) : '';
  let target = typeof input.targetStage === 'string' ? input.targetStage : stage;
  let updated: Data = { ...previous };
  if (action === 'reopen') {
    if (!hasRegistrarAccess(actor.accountRole)) throw new WorkflowError(403, 'Only Registrar Officers can reopen requests.');
    if (!finished && previous.status !== 'rejected') throw new WorkflowError(400, 'Only completed or rejected requests can be reopened.');
    requireReason(reason);
    if (input.confirmed !== true) throw new WorkflowError(400, 'Confirm reopening this request.');
    target = 'processing';
  } else if (action === 'reject') {
    if (finished) throw new WorkflowError(400, 'Reopen this completed request before rejecting it.');
    requireReason(reason);
    target = typeof previous.stage === 'string' ? previous.stage : '';
    updated.status = 'rejected';
    updated.rejectionReason = reason;
  } else if (action === 'repair') {
    if (finished) throw new WorkflowError(400, 'Use administrative Reopen for completed requests.');
    if (index !== -1) throw new WorkflowError(400, 'This request already has a known stage.');
    requireReason(reason);
    if (!WORKFLOW_STAGES.includes(target) || target === 'completed') throw new WorkflowError(400, 'Repair to a known, non-completed stage.');
  } else {
    if (action === 'force_close') {
      if (!hasRegistrarAccess(actor.accountRole)) throw new WorkflowError(403, 'Only Registrar Officers can Force Close.');
      requireReason(reason);
      if (stage !== 'ready' || previous.status === 'rejected') throw new WorkflowError(400, 'Force Close requires a Ready request that is not on hold.');
      target = 'completed';
    }
    // Assignment-only handoffs preserve even legacy/unknown stage and hold status.
    if (action === 'handoff' && input.targetStage === undefined) target = String(previous.stage || '');
    else {
      if (!WORKFLOW_STAGES.includes(target)) throw new WorkflowError(400, 'Choose a known stage.');
      if (finished && target !== 'completed') throw new WorkflowError(400, 'Completed is terminal. Use administrative Reopen.');
      if (index === -1 && target !== previous.stage) throw new WorkflowError(400, 'Repair the unknown stage before progressing.');
      const difference = WORKFLOW_STAGES.indexOf(target) - index;
      if (difference < -1 || difference > 1) throw new WorkflowError(400, 'Move only one stage at a time.');
      if (difference === -1) requireReason(reason);
      if (target === 'completed' && stage !== 'completed') {
        if (stage !== 'ready' || previous.status === 'rejected') throw new WorkflowError(400, 'Completion requires a Ready request that is not on hold.');
        if (input.confirmed !== true) throw new WorkflowError(400, 'Confirm that the document has been claimed before completing.');
      }
    }
  }
  const stageChanged = action !== 'reject' &&
    !(action === 'handoff' && input.targetStage === undefined) && previous.stage !== target;
  if (action !== 'reject' && (stageChanged || action === 'reopen' || action === 'force_close')) {
    updated.stage = target;
    updated.status = target === 'completed' ? 'completed' : target === 'submitted' ? 'pending' : 'processing';
    delete updated.rejectionReason;
    if (target !== 'completed') {
      for (const field of ['actualReleaseDate', 'completedByOfficerName', 'completedByOfficerRole', 'completedByOfficerEmail', 'completionNotes']) delete updated[field];
    } else {
      updated.actualReleaseDate = new Date().toISOString();
      updated.completedByOfficerName = actor.name;
      updated.completedByOfficerRole = actor.accountRole;
      updated.completedByOfficerEmail = actor.email;
      updated.completionNotes = reason || 'Document claimed; request completed.';
    }
  }
  if (input.assignedTo !== undefined) {
    if (typeof input.assignedTo !== 'string' || !input.assignedTo.trim()) throw new WorkflowError(400, 'Choose an active staff assignee.');
    updated.assignedTo = input.assignedTo.trim();
    updated.assignedStaff = updated.assignedTo;
    updated.assignedEvaluator = updated.assignedTo;
    await deps.assignment(client, previous, updated);
    const staff = await client.query<{ role: string }>(
      "SELECT role FROM registrack_accounts WHERE lower(name) = lower($1) AND status = 'active' AND role NOT IN ('student', 'superadmin') LIMIT 1",
      [updated.assignedTo],
    );
    updated.assignedRole = staff.rows[0]?.role;
  } else if (action === 'handoff') throw new WorkflowError(400, 'Choose a handoff recipient.');
  if (!stageChanged && action === 'stage') return previous;
  if (action === 'force_close') updated.internalNotes = [
    ...(Array.isArray(previous.internalNotes) ? previous.internalNotes : []),
    { id: `note-${randomUUID()}`, ticketId: id, author: actor.name, authorRole: actor.accountRole,
      note: `[ADMIN FORCE-CLOSE]: ${reason}`, timestamp: new Date().toISOString() },
  ];
  // Lock completion/notification resources before audit to keep cross-action lock order consistent.
  const completed = updated.status === 'completed' && (stageChanged || action === 'force_close')
    ? records(await deps.lock(client, 'completedRequestsHistory')) : undefined;
  const notifications = records(await deps.lock(client, 'notifications'));
  const notes = reason || (action === 'handoff' ? `Handed off to ${String(updated.assignedTo)}.` : `Stage changed to ${target}.`);
  updated = await appendWorkflowEvidence(client, previous, updated, actor, action, notes, deps, operationId);
  if (completed) await deps.save(client, 'completedRequestsHistory', [
    deps.completion(updated, actor), ...completed.filter(record => record.ticketNumber !== updated.ticketNumber),
  ]);
  await deps.save(client, 'tickets', tickets.map(ticket => ticket.id === id ? updated : ticket));
  await deps.save(client, 'notifications', [{
    id: `notif-${randomUUID()}`, title: action === 'reject' ? 'Action Needed' : `Request ${String(updated.ticketNumber)} Updated`,
    message: notes, timestamp: updated.updatedAt, dateStr: new Date().toLocaleDateString('en-US'),
    exactTime: new Date().toLocaleTimeString('en-US'), read: false, audience: 'student',
    recipientStudentId: updated.studentId, ticketNumber: updated.ticketNumber,
    type: target === 'ready' || target === 'completed' ? 'release_ready' : 'status_update',
  }, ...notifications]);
  return updated;
}