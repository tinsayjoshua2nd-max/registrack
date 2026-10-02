---
name: Persisted state boundaries
description: Why server hydration, user edits, and acknowledged operations must remain separate.
---

Use canonical server responses before showing request confirmations. Treat hydrated or polled snapshots as saved baselines, not new edits, and restrict persistence by the authenticated role.

**Why:** Replacing browser-only persistence exposed duplicate requests and invalid confirmations when the server regenerated identifiers. Unconditional saves also turned successful provisioning into self-conflicts and successful student submissions into forbidden audit writes. API-only tests missed the frontend failures.

**How to apply:** Preserve the dirty/version boundary when extending shared state. Verify creation and account switching through the real UI, not just endpoint tests. Keep ticket/history changes atomic and recheck previous-assignee access after reassignment.

After handing over a clean start, assume development records are real. Verification must create uniquely identified fixtures and clean up only its own data, not restore a whole saved baseline.

**Why:** Real student records were entered between the clean-start handover and the next login change. Baseline restores can overwrite concurrent user edits, and account deletion alone does not clean up all fixture data.

**How to apply:** Preserve existing records during follow-up checks and avoid printing personal data in assertion failures. Use clean-start-only verification only when a fresh reset is explicitly authorized.

For focused staff triage actions, prefer authorized, transactional updates to one request and then refresh from the server, rather than saving an optimistic whole-queue replacement.

**Why:** Different officers share a versioned ticket resource. Independent actions should not overwrite another officer's changes or leave an open dialog showing an old request snapshot.

**How to apply:** Keep authorization tied to the current assignment, report save failures, refresh canonical state after acknowledgement, and close dialogs when a handoff removes an officer's access.