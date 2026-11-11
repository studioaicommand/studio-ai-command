#!/bin/bash
# Studio Flow & Systems: set up a new client's own copy of Command (white-label).
# Creates: a Sydney database (Supabase), their Command (Cloudflare Worker) at <name>.studioflowandsystems.app,
# their brand, industry template and features, and a Face ID sign-in link for the owner.
# Your API tokens are typed here and sent only to Supabase and Cloudflare. Nothing is sent to Claude.
set -euo pipefail
cd "$(dirname "$0")"
KIT="$(pwd)"
ROOT="$(cd .. && pwd)"
SB_API="${SB_API:-https://api.supabase.com}"
CF_API="${CF_API:-https://api.cloudflare.com/client/v4}"
ZONE_NAME="${ZONE_NAME:-studioflowandsystems.app}"
say() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n\nNothing secret was saved. Fix that and run this again.\n' "$*"; exit 1; }
ask() { local v; read -r -p "  $1: " v; printf '%s' "$v"; }
asks() { local v; read -r -s -p "  $1: " v; echo >&2; printf '%s' "$v"; }
for t in curl jq openssl; do command -v "$t" >/dev/null || die "$t is missing. Update macOS (Sequoia includes jq) or run: brew install $t"; done
WORKER="${WORKER_FILE:-$(ls -t "$ROOT/1 Deploy Now"/worker-*.js 2>/dev/null | head -1 || true)}"
[ -f "$WORKER" ] || die "Couldn't find the latest Command file in '1 Deploy Now'."
[ -f "$KIT/install.sql" ] || die "install.sql is missing from the setup kit folder."
tail -c 5 "$WORKER" | grep -q '};' || die "The Command file looks incomplete (it should end with };)."

say "New client Command"
echo "  Using: $(basename "$WORKER")"
BUSINESS="$(ask 'Business name (e.g. Harbour Physio)')"; [ -n "$BUSINESS" ] || die "Business name is needed."
SUGGEST="$(printf '%s' "$BUSINESS" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g' | cut -c1-30)"
SLUG="$(ask "Web name [$SUGGEST]")"; SLUG="${SLUG:-$SUGGEST}"
[[ "$SLUG" =~ ^[a-z0-9][a-z0-9-]{1,30}$ ]] || die "Web name can only use a-z, 0-9 and dashes."
OWNER="$(ask 'Owner full name')"; [ -n "$OWNER" ] || die "Owner name is needed."
PRODUCT="$(ask "What they call their AI [$BUSINESS Command]")"; PRODUCT="${PRODUCT:-$BUSINESS Command}"
echo "  Industry templates: allied_health, dental, aesthetics_beauty, property_management, trades, childcare_education, fitness_wellness, professional_services, hospitality, other"
TEMPLATE="$(ask 'Industry template [other]')"; TEMPLATE="${TEMPLATE:-other}"
INDUSTRY="$(ask 'Industry in their words (e.g. physiotherapy clinic)')"
WEBSITE="$(ask 'Their website (https://...)')"
BOOKING="$(ask 'Booking link (optional)')"
LOCATION="$(ask 'Location (e.g. Noosa QLD)')"
COLOUR="$(ask 'Main brand colour hex (optional, e.g. #1f7a8c)')"
TARGET="$(ask 'Monthly revenue goal in AUD (optional)')"
STAFF="$(ask 'Staff to invite now, as Name:role, comma separated (optional, e.g. Jess:manager,Tom:staff)')"

say "Keys (typed here, hidden, never saved in this window)"
SBT="$(asks 'Supabase access token (Account > Access Tokens)')"; [ -n "$SBT" ] || die "Supabase token is needed."
CFT="$(asks 'Cloudflare API token (Workers Scripts: Edit, Workers Routes: Edit, DNS: Edit, Zone: Read)')"; [ -n "$CFT" ] || die "Cloudflare token is needed."
ANTH="$(asks 'Anthropic API key for their AI team')"; [ -n "$ANTH" ] || die "Anthropic key is needed."
OPENAI="$(asks 'OpenAI key for voice (optional, Enter to skip)')"
TG="$(asks 'Their Telegram bot token (optional)')"
GHL="$(asks 'Their GHL sub-account private token (optional)')"
GHL_LOC=""; [ -n "$GHL" ] && GHL_LOC="$(ask 'Their GHL location ID')"
STRIPE="$(asks 'Their Stripe restricted read key (optional)')"

sb() { curl -sS -f -H "Authorization: Bearer $SBT" -H "Content-Type: application/json" "$@"; }
cf() { curl -sS -H "Authorization: Bearer $CFT" "$@"; }
cfok() { echo "$1" | jq -e '.success == true' >/dev/null || die "Cloudflare said: $(echo "$1" | jq -r '[.errors[]?.message] | join("; ")' 2>/dev/null)"; }

say "1/5 Database in Sydney"
ORG="$(sb "$SB_API/v1/organizations" | jq -r '.[0].slug // .[0].id // empty')" || die "Supabase didn't accept that token."
[ -n "$ORG" ] || die "No Supabase organisation found."
DBPASS="$(openssl rand -base64 30 | tr -d '/+=' | cut -c1-32)"
PROJ="$(jq -n --arg n "command-$SLUG" --arg o "$ORG" --arg p "$DBPASS" '{name:$n, organization_slug:$o, db_pass:$p, region_selection:{type:"specific", code:"ap-southeast-2"}, desired_instance_size:"micro"}')"
REF="$(sb -X POST "$SB_API/v1/projects" -d "$PROJ" | jq -r '.id // .ref // empty')" || die "Couldn't create the Supabase project (plan limit?)."
[ -n "$REF" ] || die "Supabase didn't return a project."
ok "Project command-$SLUG created ($REF), waiting for it to start"
for i in $(seq 1 60); do
  ST="$(sb "$SB_API/v1/projects/$REF" | jq -r '.status // empty' || true)"
  [ "$ST" = "ACTIVE_HEALTHY" ] && break
  sleep "${POLL_SECONDS:-5}"
done
[ "$ST" = "ACTIVE_HEALTHY" ] || die "The database took too long to start. Check Supabase, then run this again with a new web name."
sb -X POST "$SB_API/v1/projects/$REF/database/query" -d "$(jq -n --rawfile q "$KIT/install.sql" '{query:$q}')" >/dev/null || die "Couldn't create the tables."
ok "22 tables created and locked (row-level security on)"
KEYS="$(sb "$SB_API/v1/projects/$REF/api-keys?reveal=true")"
SVC="$(echo "$KEYS" | jq -r '([.[] | select(.name=="service_role")][0].api_key) // ([.[] | select(.type=="secret")][0].api_key) // empty')"
[ -n "$SVC" ] || die "Couldn't read the database's server key."
SB_URL="${SB_URL_OVERRIDE:-https://$REF.supabase.co}"

say "2/5 Their Command"
ACC="$(cf "$CF_API/accounts" | jq -r '.result[0].id // empty')"; [ -n "$ACC" ] || die "Cloudflare didn't accept that token."
KEY="$(openssl rand -hex 24)"; SEAL="$(openssl rand -hex 32)"; SETUP="$(openssl rand -hex 24)"; FLEET="$(openssl rand -hex 24)"
HOST="$SLUG.$ZONE_NAME"; BASE="${CLIENT_URL_BASE:-https://$HOST}"
META="$(jq -n --arg o "https://$HOST" --arg k "$KEY" --arg s "$SEAL" --arg st "$SETUP" --arg u "$SB_URL" --arg sv "$SVC" --arg a "$ANTH" --arg oa "$OPENAI" --arg tg "$TG" --arg g "$GHL" --arg gl "$GHL_LOC" --arg sr "$STRIPE" --arg fl "$FLEET" '
  def sec($n; $v): if $v == "" then empty else {type:"secret_text", name:$n, text:$v} end;
  {main_module:"worker.mjs", compatibility_date:"2026-11-01",
   bindings: [ {type:"plain_text", name:"PUBLIC_ORIGIN", text:$o}, sec("STUDIO_TEST_KEY";$k), sec("SEAL_KEY";$s), sec("SETUP_TOKEN";$st), sec("FLEET_TOKEN";$fl), sec("SUPABASE_URL";$u), sec("SUPABASE_SECRET_KEY";$sv), sec("ANTHROPIC_API_KEY";$a), sec("OPENAI_API_KEY";$oa), sec("TELEGRAM_BOT_TOKEN";$tg), sec("GHL_TOKEN";$g), (if $gl == "" then empty else {type:"plain_text", name:"GHL_LOCATION_ID", text:$gl} end), sec("STRIPE_READ_KEY";$sr) ] }')"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT; chmod 700 "$TMP"
printf '%s' "$META" > "$TMP/metadata.json"; cp "$WORKER" "$TMP/worker.mjs"
R="$(cf -X PUT "$CF_API/accounts/$ACC/workers/scripts/command-$SLUG" -F "metadata=@$TMP/metadata.json;type=application/json" -F "worker.mjs=@$TMP/worker.mjs;type=application/javascript+module")"; cfok "$R"
ok "Command uploaded as command-$SLUG with its own keys"
R="$(cf -X PUT "$CF_API/accounts/$ACC/workers/scripts/command-$SLUG/schedules" -H "Content-Type: application/json" -d '[{"cron":"0 * * * *"}]')"; cfok "$R"
ok "Hourly team schedule on"

say "3/5 Web address"
ZONE="$(cf "$CF_API/zones?name=$ZONE_NAME" | jq -r '.result[0].id // empty')"; [ -n "$ZONE" ] || die "Couldn't find $ZONE_NAME in your Cloudflare account."
R="$(cf -X PUT "$CF_API/accounts/$ACC/workers/domains" -H "Content-Type: application/json" -d "$(jq -n --arg h "$HOST" --arg s "command-$SLUG" --arg z "$ZONE" '{hostname:$h, service:$s, zone_id:$z, environment:"production"}')")"; cfok "$R"
ok "https://$HOST (SSL is automatic)"
for i in $(seq 1 40); do curl -sS -o /dev/null -w '%{http_code}' "$BASE/health" 2>/dev/null | grep -q 200 && break; sleep "${POLL_SECONDS:-5}"; done

say "4/5 Brand, industry template and invites"
INV="$(printf '%s' "$STAFF" | jq -R 'split(",") | map(select(length>0) | split(":") | {name:(.[0]|gsub("^ +| +$";"")), role:((.[1] // "staff")|gsub(" ";""))})')"
BODY="$(jq -n --arg b "$BUSINESS" --arg p "$PRODUCT" --arg o "$OWNER" --arg t "$TEMPLATE" --arg i "$INDUSTRY" --arg w "$WEBSITE" --arg bk "$BOOKING" --arg l "$LOCATION" --arg c "$COLOUR" --arg tg "${TARGET//[^0-9]/}" --argjson inv "$INV" '
  {instance:{business_name:$b, product_name:$p, owner_name:$o, owner_first:($o|split(" ")[0]), template:$t, industry:$i, website:$w, booking_link:$bk, location:$l,
    colours:{primary:(if ($c|test("^#[0-9a-fA-F]{6}$")) then $c else null end)}, mission_target:(($tg|tonumber?) // 0), apply_template:true, learn_website:($w != ""),
    modules:{outreach:false, receptionist_product:false, offers_page:false, site_assistant:false}},
   owner:{name:$o}, invites:$inv}')"
R="$(curl -sS -X POST "$BASE/api/v1/setup" -H "Authorization: Bearer $SETUP" -H "Content-Type: application/json" -d "$BODY")"
echo "$R" | jq -e '.ok == true' >/dev/null || die "Setup call failed: $(echo "$R" | jq -r '.error // .' 2>/dev/null | head -c 300)"
ok "Branded as $BUSINESS, $TEMPLATE template applied"
LEARNED="$(echo "$R" | jq -r 'if .learned then "Learned \(.learned.services) services and \(.learned.faqs) FAQs from their website" elif .learn_error then "Website not read: \(.learn_error)" else "" end')"
[ -n "$LEARNED" ] && ok "$LEARNED"

CONNECT="SFC1.$(jq -cn --arg h "https://$HOST" --arg t "$FLEET" --arg b "$BUSINESS" '{h:$h,t:$t,b:$b}' | openssl base64 -A | tr '+/' '-_' | tr -d '=')"
say "5/5 Saving the private details"
mkdir -p "$ROOT/Client setups"; OUT="$ROOT/Client setups/$SLUG (KEEP PRIVATE).txt"
{
  echo "$BUSINESS: Command copy (set up $(date '+%d %b %Y %H:%M'))"
  echo
  echo "Command:            https://$HOST/command-next"
  echo "Cloudflare Worker:  command-$SLUG"
  echo "Supabase project:   command-$SLUG ($REF, Sydney)"
  echo
  echo "Sign-in links (Face ID / passkey, each works once, 7 days):"
  echo "$R" | jq -r '.invites[] | "  \(.name) (\(.role)): \(.link)"'
  echo
  echo "Connect code (paste into your Command > Clients > Client Commands):"
  echo "  $CONNECT"
  echo
  echo "Backup access key (Studio key, needs their Telegram for codes): $KEY"
  echo "SEAL_KEY (vault, never change):                                  $SEAL"
  echo "Database password:                                               $DBPASS"
  echo
  echo "Save these in Apple Passwords, then you can delete this file."
} > "$OUT"
chmod 600 "$OUT"
ok "Saved to: Client setups/$SLUG (KEEP PRIVATE).txt"

say "Done. $BUSINESS has their own Command."
echo "  Send the owner their sign-in link (privately):"
echo "$R" | jq -r '.invites[] | select(.role=="owner") | "  \(.link)"'
echo
echo "  Open it on the owner's phone in Safari, set up Face ID, then Share > Add to Home Screen."
echo
echo "  To see them in your Studio console: your Command > Clients > Client Commands > paste this connect code:"
echo "  $CONNECT"
[ -n "${NO_OPEN:-}" ] || open "https://$HOST/command-next" 2>/dev/null || true
