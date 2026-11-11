#!/bin/bash
# Builds worker.mjs from source and runs every test. Used locally and by GitHub.
set -uo pipefail
cd "$(dirname "$0")/.."
python3 build-worker.py >/dev/null || { echo "BUILD FAILED"; exit 1; }
# Schema column list for schema/strict.mjs (every test checks its Supabase calls against it).
[ -n "${SCHEMA_COLS:-}" ] || python3 scripts/schema-cols.py >/dev/null || { echo "SCHEMA COLS FAILED"; exit 1; }
node --check worker.mjs || exit 1
fails=0
for t in test/*.mjs; do
  case "$t" in *local-backend*|*noon.mjs) continue;; esac
  [ "${SKIP_BROWSER:-}" = 1 ] && case "$t" in *browser-v55*) continue;; esac
  out=$(timeout 300 node --import ./schema/strict.mjs --import ./test/noon.mjs "$t" 2>&1); rc=$?; pkill -f /tmp/claude-0/agent/agent.mjs 2>/dev/null
  # A crash (non-zero exit) is a failure too, not only a printed FAIL line.
  if [ $rc -ne 0 ] || echo "$out" | grep -q "^FAIL"; then echo "✖ $t (exit $rc)"; echo "$out" | grep -m3 -E "FAIL|Error" ; fails=$((fails+1)); else echo "✔ $t"; fi
done
echo "failures: $fails"
exit $fails
