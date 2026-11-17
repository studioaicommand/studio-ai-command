#!/bin/bash
# Studio Flow & Systems: give a client's Command their OWN web address (e.g. command.harbourphysio.com.au).
# It stays their separate copy: their domain goes straight to their own Command and nobody else's.
# Uses Cloudflare for SaaS (custom hostnames). Your Cloudflare token is typed here and never saved.
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
CF_API="${CF_API:-https://api.cloudflare.com/client/v4}"
ZONE_NAME="${ZONE_NAME:-studioflowandsystems.app}"
FALLBACK="${FALLBACK_HOST:-clients.$ZONE_NAME}"
say() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }
ask() { local v; read -r -p "  $1: " v; printf '%s' "$v"; }
asks() { local v; read -r -s -p "  $1: " v; echo >&2; printf '%s' "$v"; }
for t in curl jq; do command -v "$t" >/dev/null || die "$t is missing. Update macOS or run: brew install $t"; done

say "Connect a client's own web address"
SLUG="$(ask "Client's web name (the <name> in <name>.$ZONE_NAME)")"
[[ "$SLUG" =~ ^[a-z0-9][a-z0-9-]{1,30}$ ]] || die "Web name can only use a-z, 0-9 and dashes."
HOST="$(ask 'Their address for Command (e.g. command.harbourphysio.com.au)')"
HOST="$(printf '%s' "$HOST" | tr '[:upper:]' '[:lower:]' | sed -E 's#^https?://##; s#/.*$##')"
[[ "$HOST" =~ ^([a-z0-9-]+\.)+[a-z]{2,}$ ]] || die "That doesn't look like a web address."
[[ "$HOST" == *".$ZONE_NAME" || "$HOST" == "$ZONE_NAME" ]] && die "Use the client's own domain, not $ZONE_NAME."
FILE="$(ls "$ROOT/Client setups/$SLUG (KEEP PRIVATE).txt" 2>/dev/null || true)"
CONNECT=""; [ -n "$FILE" ] && CONNECT="$(grep -o 'SFC1\.[A-Za-z0-9_-]*' "$FILE" | head -1 || true)"
[ -n "$CONNECT" ] && ok "Found their connect code in Client setups" || CONNECT="$(ask "Their connect code (SFC1..., from Apple Passwords)")"
DEC="$(printf '%s' "${CONNECT#SFC1.}" | tr '_-' '/+')"; while [ $(( ${#DEC} % 4 )) -ne 0 ]; do DEC="$DEC="; done
FLEET="$(printf '%s' "$DEC" | openssl base64 -d -A 2>/dev/null | jq -r '.t // empty' 2>/dev/null || true)"
OLDHOST="$(printf '%s' "$DEC" | openssl base64 -d -A 2>/dev/null | jq -r '.h // empty' 2>/dev/null || true)"
[[ "$FLEET" =~ ^[a-f0-9]{32,64}$ ]] || die "That connect code isn't right."
CFT="$(asks 'Cloudflare API token (Workers Routes: Edit, SSL and Certificates: Edit, DNS: Edit, Zone: Read)')"; [ -n "$CFT" ] || die "Cloudflare token is needed."
cf() { curl -sS -H "Authorization: Bearer $CFT" -H "Content-Type: application/json" "$@"; }
errs() { echo "$1" | jq -r '[.errors[]?.message] | join("; ")' 2>/dev/null; }

say "1/4 Your Cloudflare zone"
ZONE="$(cf "$CF_API/zones?name=$ZONE_NAME" | jq -r '.result[0].id // empty')"; [ -n "$ZONE" ] || die "Couldn't find $ZONE_NAME (check the token's Zone permission)."
ok "$ZONE_NAME found"
FB="$(cf "$CF_API/zones/$ZONE/custom_hostnames/fallback_origin")"
if [ "$(echo "$FB" | jq -r '.result.origin // empty')" != "$FALLBACK" ]; then
  if [ -z "$(cf "$CF_API/zones/$ZONE/dns_records?name=$FALLBACK" | jq -r '.result[0].id // empty')" ]; then
    R="$(cf -X POST "$CF_API/zones/$ZONE/dns_records" -d "$(jq -n --arg n "$FALLBACK" '{type:"AAAA", name:$n, content:"100::", proxied:true, ttl:1, comment:"Client Command domains (Cloudflare for SaaS)"}')")"
    echo "$R" | jq -e '.success == true' >/dev/null || die "Couldn't create $FALLBACK: $(errs "$R")"
  fi
  R="$(cf -X PUT "$CF_API/zones/$ZONE/custom_hostnames/fallback_origin" -d "$(jq -n --arg o "$FALLBACK" '{origin:$o}')")"
  echo "$R" | jq -e '.success == true' >/dev/null || die "Cloudflare for SaaS isn't switched on yet. In Cloudflare open $ZONE_NAME > SSL/TLS > Custom Hostnames > Enable (free for the first 100 clients), then run this again. ($(errs "$R"))"
  ok "Client domains switched on (they point at $FALLBACK)"
else ok "Client domains already switched on"; fi

say "2/4 Their address"
CH="$(cf "$CF_API/zones/$ZONE/custom_hostnames?hostname=$HOST" | jq -c '.result[0] // empty')"
if [ -z "$CH" ]; then
  R="$(cf -X POST "$CF_API/zones/$ZONE/custom_hostnames" -d "$(jq -n --arg h "$HOST" '{hostname:$h, ssl:{method:"http", type:"dv", settings:{min_tls_version:"1.2"}}}')")"
  echo "$R" | jq -e '.success == true' >/dev/null || die "Cloudflare refused $HOST: $(errs "$R")"
  CH="$(echo "$R" | jq -c '.result')"; ok "$HOST added"
else ok "$HOST was already added"; fi

say "3/4 Send it to their Command only"
ROUTES="$(cf "$CF_API/zones/$ZONE/workers/routes")"
RID="$(echo "$ROUTES" | jq -r --arg p "$HOST/*" '[.result[]? | select(.pattern==$p)][0].id // empty')"
RSCRIPT="$(echo "$ROUTES" | jq -r --arg p "$HOST/*" '[.result[]? | select(.pattern==$p)][0].script // empty')"
if [ -z "$RID" ]; then
  R="$(cf -X POST "$CF_API/zones/$ZONE/workers/routes" -d "$(jq -n --arg p "$HOST/*" --arg s "command-$SLUG" '{pattern:$p, script:$s}')")"
  echo "$R" | jq -e '.success == true' >/dev/null || die "Couldn't route $HOST: $(errs "$R")"
  ok "$HOST goes to command-$SLUG"
elif [ "$RSCRIPT" != "command-$SLUG" ]; then die "$HOST already goes to $RSCRIPT. Remove that route in Cloudflare first."
else ok "$HOST already goes to command-$SLUG"; fi
BASE="${CLIENT_URL_BASE:-${OLDHOST:-https://$SLUG.$ZONE_NAME}}"
R="$(curl -sS -X POST "$BASE/api/v1/fleet/domain" -H "Authorization: Bearer $FLEET" -H "Content-Type: application/json" -d "$(jq -n --arg h "$HOST" '{host:$h}')" || true)"
echo "$R" | jq -e '.ok == true' >/dev/null 2>&1 && ok "Their Command knows its new address (their owner got a Telegram note)" || warn "Couldn't tell their Command its new address yet: $(echo "$R" | jq -r '.error // .' 2>/dev/null | head -c 200). Update them to the latest version, then run this again."

say "4/4 What the client adds to their DNS"
TXTN="$(echo "$CH" | jq -r '.ownership_verification.name // empty')"; TXTV="$(echo "$CH" | jq -r '.ownership_verification.value // empty')"
echo "  Send this to whoever manages their domain (GoDaddy, Crazy Domains, Cloudflare...):"
echo
echo "    Type: CNAME    Name: $HOST    Points to: $FALLBACK"
[ -n "$TXTN" ] && echo "    Type: TXT      Name: $TXTN    Value: $TXTV"
echo
for i in $(seq 1 "${CHECKS:-12}"); do
  ST="$(cf "$CF_API/zones/$ZONE/custom_hostnames?hostname=$HOST" | jq -r '.result[0] | "\(.status // "pending")|\(.ssl.status // "pending")"')"
  [ "$ST" = "active|active" ] && break
  sleep "${POLL_SECONDS:-10}"
done
if [ "$ST" = "active|active" ]; then
  ok "Live: https://$HOST/command-next (secure)"
  echo "  Their owner opens Command > Settings > Brand & features > Set up Face ID on your new address."
  echo "  Team links: the same page > Links for the team. The old address keeps working."
else
  warn "Waiting for their DNS (now: ${ST/|/, certificate }). This usually takes 5 to 30 minutes after they add the record."
  echo "  Run this again any time to check. Nothing is duplicated."
fi
[ -n "$FILE" ] && printf '\nOwn web address: https://%s/command-next (connected %s)\n' "$HOST" "$(date '+%d %b %Y')" >> "$FILE" || true
