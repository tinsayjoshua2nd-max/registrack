---
name: Settings ownership policy
description: Approved boundaries for institution metadata, evaluator capacity, and student account signup.
---

Institution code, academic year, and semester are current global reference information, not values to copy into or rewrite on existing student or ticket records.

**Why:** The user approved activating these saved settings while preserving existing records.

**How to apply:** Show current values in the active student profile and staff Student Records view; do not treat a term-setting change as a student-record migration.

Evaluator capacity applies to automatic assignment only, counts pending and processing tickets, and leaves overflow in the central pending queue. Manual assignment and other staff roles remain unrestricted by this cap.

**Why:** The approved behavior explicitly limits automatic evaluator intake, not all staff work.

**How to apply:** Preserve role priority and explicit staff selections when implementing or changing routing.

Enabled student signup creates login credentials only for an existing eligible official student record. It must not create or rewrite that record, and it does not grant ticket submission rights.

**Why:** The user approved self-registration while retaining Registrar ownership of official records and staff-only request creation.

**How to apply:** Recheck the registration setting on the server; never reuse account-creation paths that also create student records.
