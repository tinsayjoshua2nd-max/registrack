---
name: Unified login policy
description: Which identifiers the user wants each account type to use for automatic portal detection.
---

Use one login form without Student, Staff Officers, or Registrar role selectors. Detect the portal from the authenticated account. Students use Student ID and password; Staff Officers and Registrar use their username or email and password.

**Why:** The user explicitly requested automatic detection instead of choosing a portal.

**How to apply:** Keep role selection out of sign-in and require Student IDs, not student names or student email addresses. Credentials must be verified before opening the account's portal.