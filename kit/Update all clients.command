#!/bin/bash
# Studio Flow & Systems: update every client's Command to the newest version, safely.
# Updates one client first (your test client if you have one), checks it's healthy, then asks before the rest.
# Each client keeps all its own keys. A backup of each client's current version is saved first; if a check
# fails, that client is put straight back. Your Cloudflare token is typed here and never saved.
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
CF_API="${CF_API:-https://api.cloudflare.com/client/v4}"
say() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }
for t in curl jq; do command -v "$t" >/dev/null || die "$t is missing. Update macOS or run: brew install $t"; done
WORKER="${WORKER_FILE:-$(ls -t "$ROOT/1 Deploy Now"/worker-*.js 2>/dev/null | head -1 || true)}"
[ -f "$WORKER" ] || die "Couldn't find the newest Command file in '1 Deploy Now'."
tail -c 5 "$WORKER" | grep -q '};' || die "That Command file looks incomplete (it should end with };)."
NEWV="$(grep -o 'var APP = { "v": "[0-9a-f]*"' "$WORKER" | head -1 | grep -o '[0-9a-f]\{10\}"$' | tr -d '"')"
[ -n "$NEWV" ] || die "Couldn't read the version from the Command file."
say "Update client Commands to $(basename "$WORKER") (version $NEWV)"
read -r -s -p "  Cloudflare API token: " CFT; echo
cf() { curl -sS -H "Authorization: Bearer $CFT" "$@"; }
ACC="$(cf "$CF_API/accounts" | jq -r '.result[0].id // empty')"; [ -n "$ACC" ] || die "Cloudflare didn't accept that token."
NAMES="$(cf "$CF_API/accounts/$ACC/workers/scripts" | jq -r '.result[]?.id | select(startswith("command-"))')"
[ -n "$NAMES" ] || die "No client Commands found (their Workers are named command-<name>)."
DOMAINS="$(cf "$CF_API/accounts/$ACC/workers/domains" | jq -c '[.result[]? | {s:.service, h:.hostname}]')"
host_of() { echo "$DOMAINS" | jq -r --arg s "$1" '[.[] | select(.s==$s)][0].h // empty'; }
version_of() { curl -sS -o /dev/null -D - "https://$1/app/app.js" 2>/dev/null | tr -d '\r' | awk -F'"' 'tolower($1) ~ /^etag/ {print $2}'; }
[ -n "${HOST_OVERRIDE:-}" ] && version_of() { curl -sS -o /dev/null -D - "$HOST_OVERRIDE/$1/app/app.js" 2>/dev/null | tr -d '\r' | awk -F'"' 'tolower($1) ~ /^etag/ {print $2}'; }
healthy() { local base="https://$1"; [ -n "${HOST_OVERRIDE:-}" ] && base="$HOST_OVERRIDE/$1"; curl -sS -f "$base/api/v1/instance/brand" 2>/dev/null | jq -e '.ok == true' >/dev/null; }
FIRST="$(echo "$NAMES" | grep -m1 test || echo "$NAMES" | head -1)"
ORDER="$(printf '%s\n' "$FIRST"; echo "$NAMES" | grep -vx "$FIRST" || true)"
echo
echo "  Clients found:"
while read -r n; do h="$(host_of "$n")"; v="$( [ -n "$h" ] && version_of "$h" || true)"; printf '   - %-32s %-45s %s\n' "$n" "${h:-no web address}" "$( [ "$v" = "$NEWV" ] && echo "already up to date" || echo "on ${v:-unknown}")"; done <<< "$ORDER"
BK="$ROOT/Client setups/backups/$(date +%Y-%m-%d-%H%M)"; mkdir -p "$BK"; chmod 700 "$ROOT/Client setups" "$ROOT/Client setups/backups" 2>/dev/null || true
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
printf '%s' '{"main_module":"worker.mjs","compatibility_date":"2026-11-01","keep_bindings":["secret_text","plain_text","secret_key"]}' > "$TMP/metadata.json"
upload() { cf -X PUT "$CF_API/accounts/$ACC/workers/scripts/$1" -F "metadata=@$TMP/metadata.json;type=application/json" -F "worker.mjs=@$2;type=application/javascript+module"; }
update_one() {
  local n="$1" h; h="$(host_of "$n")"
  local was; was="$( [ -n "$h" ] && version_of "$h" || true)"
  if [ -n "$was" ] && [ "$was" = "$NEWV" ]; then ok "$n already up to date"; return 0; fi
  if cf "$CF_API/accounts/$ACC/workers/scripts/$n/content/v2" -o "$BK/$n.mjs" && tail -c 5 "$BK/$n.mjs" | grep -q '};'; then ok "$n: backup saved"; else rm -f "$BK/$n.mjs"; warn "$n: couldn't download a backup (rollback will use your previous version file)"; fi
  local R; R="$(upload "$n" "$WORKER")"
  echo "$R" | jq -e '.success == true' >/dev/null || { warn "$n: Cloudflare refused the update: $(echo "$R" | jq -r '[.errors[]?.message] | join("; ")')"; return 1; }
  [ -z "$h" ] && { warn "$n updated, but it has no web address to check"; return 0; }
  local i v=""; for i in $(seq 1 24); do v="$(version_of "$h")"; [ "$v" = "$NEWV" ] && healthy "$h" && break; sleep "${POLL_SECONDS:-5}"; done
  if [ "$v" = "$NEWV" ] && healthy "$h"; then ok "$n updated and healthy ($h)"; return 0; fi
  warn "$n didn't pass its check after updating. Putting it back."
  local back="$BK/$n.mjs"; [ -f "$back" ] || back="$(ls -t "$ROOT/4 Previous Versions"/worker-*.js 2>/dev/null | head -1)"
  if [ -f "$back" ]; then R="$(upload "$n" "$back")"; echo "$R" | jq -e '.success == true' >/dev/null && ok "$n restored to its previous version" || warn "$n: restore failed, check Cloudflare now"; else warn "$n: no previous version to restore, check Cloudflare now"; fi
  return 1
}
say "Step 1: $FIRST first"
update_one "$FIRST" || die "Stopped. No other clients were touched."
REST="$(echo "$ORDER" | tail -n +2)"
if [ -n "$REST" ]; then
  COUNT="$(echo "$REST" | grep -c .)"
  read -r -p "  $FIRST is healthy. Update the other $COUNT now? (y/n) " YES
  [ "${YES:-n}" = "y" ] || { echo "  OK, the others stay as they are."; exit 0; }
  say "Step 2: the rest"
  FAILS=0; while read -r n; do update_one "$n" || FAILS=$((FAILS+1)); done <<< "$REST"
  [ "$FAILS" = 0 ] && say "All client Commands are on version $NEWV." || say "Done, but $FAILS client(s) were put back on their old version. See above."
else
  say "All client Commands are on version $NEWV."
fi
echo "  Backups: Client setups/backups/$(basename "$BK")"
