---
name: Student notification scope
description: Why student notification behavior must remain separate from officer behavior.
---

Student notifications are limited to the authenticated student's own account and requests. Keep officer/registrar feeds unchanged when changing student notification behavior, including separate read/unread status.

**Why:** The user explicitly requested student-account updates only, excluding other students' updates and officer alerts, without changing officer notifications. A shared read flag would unintentionally change the officer experience.

**How to apply:** Match account ownership by authenticated identifiers, not names or demo defaults. Treat unscoped alerts as hidden from students rather than assuming they are intended for everyone.