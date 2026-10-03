---
name: Disposable service lifetimes
description: Execution-lifetime constraints when verifying against temporary local infrastructure.
---

Keep temporary infrastructure and its verification in the same long-lived background shell, with explicit teardown.

**Why:** A detached PostgreSQL daemon started by a foreground shell disappeared after the tool call returned, despite reporting a successful start. The next call could not connect. Keeping the service owned by the background verification process avoided this execution-lifetime problem.

**How to apply:** When a check needs a disposable local service across tool calls, retain its owning background process until verification finishes. Stop the service and remove only the temporary resources it created. Do not fall back to an existing project database when temporary infrastructure is unavailable.