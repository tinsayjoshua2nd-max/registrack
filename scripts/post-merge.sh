#!/usr/bin/env bash
set -euo pipefail

npm ci --no-audit --no-fund
npm run lint
node --import tsx --test \
  server/security.test.ts \
  server/databaseConfig.test.ts \
  scripts/supabase-db-initializer.test.ts \
  src/utils/studentNotifications.test.ts
npm run build
