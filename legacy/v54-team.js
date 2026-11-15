// ── v54: Command Link for Ty's Mac. Command can open web pages in Chrome on Ty's Mac (http/https only).
// A tiny background helper on the Mac checks in every few seconds with its own link token; nothing else on the Mac is reachable. ──
var LINK_TTL = 12e4;
var linkHash = async (t) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(t))))).map((b) => b.toString(16).padStart(2, "0")).join("");
var linkRand = (n = 32) => Array.from(crypto.getRandomValues(new Uint8Array(n))).map((b) => b.toString(16).padStart(2, "0")).join("");
async function linkGet(env, key) { const r = await select(env, "team_settings", `key=eq.${key}&select=value&limit=1`).catch(() => []); return r?.[0]?.value || null; }
function linkOnline(cfg) { return !!(cfg?.token_hash && cfg.last_seen && Date.now() - Date.parse(cfg.last_seen) < 9e4); }
async function macOpen(env, url, why = "") {
  let u; try { u = new URL(String(url)); } catch { return { opened: false, reason: "bad link" }; }
  if (!/^https?:$/.test(u.protocol)) return { opened: false, reason: "only web pages can be opened" };
  const cfg = await linkGet(env, "mac_link");
  if (!cfg?.token_hash) return { opened: false, reason: "Command Link isn't set up on Ty's Mac yet (Settings > Brand & features > Command Link)." };
  if (!linkOnline(cfg)) return { opened: false, reason: "Ty's Mac is asleep or offline right now." };
  const q = await linkGet(env, "mac_link_queue");
  const items = (Array.isArray(q?.items) ? q.items : []).filter((x) => Date.now() - Date.parse(x.at) < LINK_TTL).slice(-9);
  items.push({ id: linkRand(6), url: u.href, why: String(why).slice(0, 120), at: new Date().toISOString() });
  await saveSetting(env, "mac_link_queue", { items });
  return { opened: true, note: "Opening in Chrome on Ty's Mac now." };
}
function linkScript(origin, token) {
  const sh = `#!/bin/zsh
# Studio Command Link: lets Studio AI Command open web pages in Chrome on this Mac. Nothing else.
T="${token}"; O="${origin}"
while true; do
  R=$(/usr/bin/curl -fsS -m 20 -H "Authorization: Bearer $T" "$O/api/v1/link/next" 2>/dev/null)
  U=$(printf '%s' "$R" | /usr/bin/sed -n 's/.*"url":"\\([^"]*\\)".*/\\1/p' | /usr/bin/sed 's#\\\\/#/#g')
  case "$U" in
    https://*|http://*) /usr/bin/open -a "Google Chrome" "$U" 2>/dev/null || /usr/bin/open "$U" ;;
  esac
  case "$R" in *'"unlinked":true'*) exit 0 ;; esac
  sleep 4
done
`;
  return `#!/bin/zsh
# Installs Studio Command Link: Command can open web pages in Chrome on this Mac, and run browser tasks
# in a separate "Command Chrome" window (anything that sends, pays or deletes waits for Ty's yes).
DIR="$HOME/Library/Application Support/StudioCommandLink"
mkdir -p "$DIR" "$HOME/Library/LaunchAgents"
chmod 700 "$DIR"
cat > "$DIR/link.sh" <<'SFLINK'
${sh}SFLINK
cat > "$DIR/agent.mjs" <<'SFAGENT'
${LINK_AGENT_SRC}
SFAGENT
NODE=""
for n in "$(command -v node 2>/dev/null)" /opt/homebrew/bin/node /usr/local/bin/node; do [ -n "$n" ] && [ -x "$n" ] && { NODE="$n"; break; }; done
MODE=basic
if [ -n "$NODE" ]; then
  echo "  Installing the browser helper (about a minute)..."
  export PATH="$(dirname "$NODE"):$PATH"
  if (cd "$DIR" && npm install --silent --no-audit --no-fund --no-save playwright-core@1.49.1 >/dev/null 2>&1); then MODE=full; fi
fi
P="$HOME/Library/LaunchAgents/app.studioflowandsystems.link.plist"
launchctl unload "$P" 2>/dev/null || true
if [ "$MODE" = full ]; then
  ARGS="<string>$NODE</string><string>$DIR/agent.mjs</string>"
else
  ARGS="<string>/bin/zsh</string><string>$DIR/link.sh</string>"
fi
cat > "$P" <<SFPLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>Label</key><string>app.studioflowandsystems.link</string>
<key>ProgramArguments</key><array>$ARGS</array>
<key>EnvironmentVariables</key><dict><key>SF_T</key><string>${token}</string><key>SF_O</key><string>${origin}</string><key>SF_DIR</key><string>$DIR</string></dict>
<key>WorkingDirectory</key><string>$DIR</string>
<key>RunAtLoad</key><true/><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict></dict></plist>
SFPLIST
chmod 600 "$P"
launchctl load "$P"
echo ""
if [ "$MODE" = full ]; then
  echo "  Command Link is on. Command can open pages in Chrome and run browser tasks in its own Command Chrome window."
else
  echo "  Command Link is on (basic): Command can open pages in Chrome on this Mac."
  echo "  For browser tasks, install Node.js (nodejs.org) and run the setup line again."
fi
echo "  To remove it later: Settings > Brand & features > Command Link > Unlink."
`;
}
async function macLinkPublic(request, env) {
  const url = new URL(request.url);
  if (url.pathname === "/api/v1/link/next") {
    const tok = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const cfg = await linkGet(env, "mac_link");
    const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
    if (!tok || !cfg?.token_hash || (await linkHash(tok)) !== cfg.token_hash) return J({ ok: false, unlinked: true });
    const agent = request.headers.get("x-sf-agent") === "2" ? 2 : 1;
    if (!cfg.last_seen || Date.now() - Date.parse(cfg.last_seen) > 45e3 || cfg.agent !== agent) await saveSetting(env, "mac_link", { ...cfg, agent, last_seen: new Date().toISOString() }).catch(() => {});
    const q = await linkGet(env, "mac_link_queue");
    const items = (Array.isArray(q?.items) ? q.items : []).filter((x) => Date.now() - Date.parse(x.at) < LINK_TTL);
    if (!items.length) { const task = agent === 2 ? await browserClaim(env).catch(() => null) : null; return J(task ? { ok: true, task } : { ok: true }); }
    const [next, ...rest] = items;
    await saveSetting(env, "mac_link_queue", { items: rest });
    return J({ ok: true, url: next.url });
  }
  if (url.pathname === "/api/v1/link/step" && request.method === "POST") {
    const tok = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const cfg = await linkGet(env, "mac_link");
    const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
    if (!tok || !cfg?.token_hash || (await linkHash(tok)) !== cfg.token_hash) return J({ ok: false, act: { kind: "finish" } }, 401);
    const body = await request.json().catch(() => ({}));
    if (Date.now() - Date.parse(cfg.last_seen || 0) > 45e3) await saveSetting(env, "mac_link", { ...cfg, last_seen: new Date().toISOString() }).catch(() => {});
    return J({ ok: true, act: await browserStep(env, body) });
  }
  const m = url.pathname.match(/^\/link\/install\/([a-f0-9]{24})$/);
  if (m) {
    const cfg = await linkGet(env, "mac_link");
    const ok = cfg?.install_hash && cfg.install_exp > Date.now() && (await linkHash(m[1])) === cfg.install_hash;
    if (!ok) return new Response("echo '  That setup code has expired. Make a new one in Command.'\n", { status: 404, headers: { "content-type": "text/plain" } });
    const token = linkRand(32);
    await saveSetting(env, "mac_link", { token_hash: await linkHash(token), created_at: new Date().toISOString(), last_seen: null });
    return new Response(linkScript(url.origin, token), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  return null;
}
async function v54Route(p, m, body, env) {
  const J = (o, st = 200) => json(o, st);
  if (p === "/mac-link" && m === "GET") { const c = await linkGet(env, "mac_link"); return J({ ok: true, linked: !!c?.token_hash, online: linkOnline(c), last_seen: c?.last_seen || null }); }
  if (p === "/mac-link/setup" && m === "POST") {
    const code = linkRand(12), c = (await linkGet(env, "mac_link")) || {};
    await saveSetting(env, "mac_link", { ...c, install_hash: await linkHash(code), install_exp: Date.now() + 15 * 6e4 });
    const origin = env.PUBLIC_ORIGIN || "https://studioflowandsystems.app";
    return J({ ok: true, command: `curl -fsSL ${origin}/link/install/${code} | zsh`, expires_min: 15 });
  }
  if (p === "/mac-link/off" && m === "POST") { await saveSetting(env, "mac_link", { token_hash: null, unlinked_at: new Date().toISOString() }); return J({ ok: true, linked: false }); }
  if (p === "/mac-link/test" && m === "POST") return J({ ok: true, ...(await macOpen(env, (env.PUBLIC_ORIGIN || "https://studioflowandsystems.app") + "/command-next#/today", "test")) });
  return null;
}
