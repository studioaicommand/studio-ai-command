#!/bin/bash
# Builds worker.mjs from source and runs every test. Used locally and by GitHub.
set -uo pipefail
cd "$(dirname "$0")/.."
python3 build-worker.py >/dev/null || { echo "BUILD FAILED"; exit 1; }
node --check worker.mjs || exit 1
fails=0
for t in test/*.mjs; do
  case "$t" in *local-backend*|*noon.mjs) continue;; esac
  [ "${SKIP_BROWSER:-}" = 1 ] && case "$t" in *browser-v55*) continue;; esac
  out=$(timeout 300 node --import ./schema/strict.mjs --import ./test/noon.mjs "$t" 2>&1); pkill -f /tmp/claude-0/agent/agent.mjs 2>/dev/null
  if echo "$out" | grep -q "^FAIL"; then echo "✖ $t"; echo "$out" | grep -m3 "FAIL"; fails=$((fails+1)); else echo "✔ $t"; fi
done
echo "failures: $fails"
exit $fails
