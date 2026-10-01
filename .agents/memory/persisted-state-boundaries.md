---
name: Persisted state boundaries
description: Why server hydration, user edits, and acknowledged operations must remain separate.
---

Use canonical server responses before showing request confirmations. Treat hydrated or polled snapshots as saved baselines, not new edits, and restrict persistence by the authenticated role.

**Why:** Replacing browser-only persistence exposed duplicate requests and invalid confirmations when the server regenerated identifiers. Unconditional saves also turned successful provisioning into self-conflicts and successful student submissions into forbidden audit writes. API-only tests missed the frontend failures.

**How to apply:** Preserve the dirty/version boundary when extending shared state. Verify creation and account switching through the real UI, not just endpoint tests. Keep ticket/history changes atomic and recheck previous-assignee access after reassignment.