---
name: Ticket-stage policy constraints
description: User-selected ordinary stage policy, lifecycle compatibility, and verification constraints.
---

For ordinary workflow changes, allow one step forward or one step backward with a required reason. Completion requires Ready and a confirmation; Completed is terminal in ordinary stage controls. Enforce the policy on the server, not only in the UI.

**Why:** The user selected forward plus reasoned step-back and explicitly required server enforcement and completion confirmation.

**How to apply:** Cover every stage-changing write path, not just Direct Stage buttons. The server must create the timeline history entry and the Tickets audit entry for every stage change, with server time and the session actor.

Existing tickets must not become stuck, including legacy stage "reviewed" and odd stored stages. Do not modify existing stored tickets as part of this implementation or its verification.

**Why:** The user explicitly required legacy compatibility without rewriting existing ticket data.

**How to apply:** Do not run a stage migration or automatically repair records on reads. Explain the interactions with reject, handoff, restore, cold archive, and the existing Reopen feature before changing those behaviors; do not silently remove Reopen.

Keep ticket-stage verification short and API-level, using ZZ-TEST records only.

**Why:** The user explicitly constrained testing for this work.

**How to apply:** Use only fixture records for API checks. Never exercise global archive or backup-restore operations against a database containing real records.

Keep administrative Reopen as a reasoned, confirmed Super Admin exception for completed or rejected requests. Force Close requires Ready and confirmation. Reject and manual handoff must preserve the stage; guided handoff may advance only through a valid adjacent transition.

**Why:** The user explicitly approved these lifecycle interactions rather than removing the existing administrative exception or allowing unrestricted Force Close.

**How to apply:** Preserve original history and snapshot stages during recovery and archive. Treat legacy `reviewed` as Processing for validation without changing stored data on reads.

If lint or any test fails, stop and report instead of fixing and rerunning within the same turn.

**Why:** The user explicitly required this verification boundary.

**How to apply:** Keep verification short and API-level, and report the first failing check before making further implementation changes.