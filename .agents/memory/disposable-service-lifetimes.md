---
name: Disposable service lifetimes
description: Execution-lifetime constraints when verifying against temporary local infrastructure.
---

Keep temporary infrastructure and its verification in the same long-lived background shell, with explicit teardown.

**Why:** A detached PostgreSQL daemon started by a foreground shell disappeared after the tool call returned, despite reporting a successful start. The next call could not connect. Keeping the service owned by the background verification process avoided this execution-lifetime problem.

**How to apply:** When a check needs a disposable local service across tool calls, retain its owning background process until verification finishes. Stop the service and remove only the temporary resources it created. Do not fall back to an existing project database when temporary infrastructure is unavailable.

Prefer an isolated production build for browser verification while the main Vite workflow is running.

**Why:** Vite 8 middleware mode still attempted to bind the shared WebSocket port with HMR disabled. Disabling the WebSocket listener instead produced uncaught client connection errors. Serving a built frontend avoided both development-transport failures without suppressing browser error checks.

**How to apply:** Keep verification build output and caches in a throwaway directory, serve them with the real API against the disposable database, and clean up afterward. Wait for DOM readiness rather than remote images or fonts to finish loading.