---
name: Settings ownership policy
description: Approved boundaries for institution metadata, evaluator capacity, and staff-created student accounts.
---

Institution code, academic year, and semester are current global reference information, not values to copy into or rewrite on existing student or ticket records.

**Why:** The user approved activating these saved settings while preserving existing records.

**How to apply:** Show current values in the active student profile and staff Student Records view; do not treat a term-setting change as a student-record migration.

Evaluator capacity applies to automatic assignment only, counts pending and processing tickets, and leaves overflow in the central pending queue. Manual assignment and other staff roles remain unrestricted by this cap.

**Why:** The approved behavior explicitly limits automatic evaluator intake, not all staff work.

**How to apply:** Preserve role priority and explicit staff selections when implementing or changing routing.

Only Receiver / Releasing and Registrar Officer accounts can create student accounts. Remove public student signup; a saved self-registration flag must not restore it.

**Why:** The user replaced the earlier self-registration approval with: “remove the Create student account button in the log in page, and only the RECEIVER / RELEASING and Registrar officer can create the students accounts.”

**How to apply:** Enforce the role restriction on the server as well as the UI. Grant Receiver student-credential creation only, not staff-account creation, account management, or official-record editing. Preserve Registrar record management and staff-only ticket submission.
