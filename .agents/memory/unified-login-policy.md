---
name: Unified login policy
description: Which identifiers the user wants each account type to use for automatic portal detection.
---

Use one login form without Student, Staff Officers, or Registrar role selectors. Detect the portal from the authenticated account. Students use their username, with either their Student ID or the password they created as their password. Staff Officers and Registrar use their username or email and password.

**Why:** The user explicitly requested automatic detection instead of choosing a portal, then replaced student-ID login with student username and Student ID or a created password.

**How to apply:** Keep role selection out of sign-in. Student IDs belong in the password field, not the username field. Keep the Student ID credential alternative limited to student accounts; staff and Registrar still require their account passwords.