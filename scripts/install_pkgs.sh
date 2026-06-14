#!/bin/bash
# Cloud-only dependency install for Claude Code on the web. No-op locally.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -d node_modules ] && exit 0
npm ci --legacy-peer-deps || true
exit 0
