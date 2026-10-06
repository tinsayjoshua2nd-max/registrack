---
name: Isolated browser verification
description: Avoid interference between disposable browser tests and the running Vite preview.
---

Prefer a temporary production build for isolated, database-backed browser verification while the main development preview remains running. Use independent temporary build output and cache directories.

**Why:** In the installed Vite version, disabling HMR did not disable its separate WebSocket server. A second middleware server conflicted with the preview's default socket port; disabling sockets then produced uncaught client connection errors. Serving a production build removed those development-only dependencies without filtering errors.

**How to apply:** Keep assertions against the real application and API intact. Navigate to DOM readiness and wait for the relevant rendered controls instead of waiting for all external assets to finish loading. Delete temporary build output and the disposable database after verification; do not change the main Vite configuration merely to make an isolated test pass.
