#!/bin/bash
# SessionStart hook: no dependencies to install (static site, stdlib-only Python).
# Checks the data and reminds the session of the cloud network limits.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"
echo "winners.json check: $(python3 scripts/validate.py 2>&1 | tail -1)"
echo "Cloud limits: page fetches, nominatim (geocoding), cdnjs and OSM tiles are blocked; WebSearch and npm work. New entries stay verified:false. See CLAUDE.md."
exit 0
