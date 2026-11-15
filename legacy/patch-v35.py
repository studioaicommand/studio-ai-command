# v35: two-step login for Command. Key + a 6-digit code (Telegram and/or SMS), then the device stays
# signed in for 8, 12 or 24 hours (secure HttpOnly cookie). The key alone no longer opens anything.
# Emergency off switch: Cloudflare variable COMMAND_2FA = off.
import sys, re, hashlib
f = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(f).read()

def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:90], s.count(old))
    s = s.replace(old, new)

SERVER = r'''
// v35: two-step login (server).
var SEC_CACHE = { at: 0, v: null };
function secEq(a, b) { if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
function secSb(env) { return { url: String(env.SUPABASE_URL || env.SUPABASS_URL || "").replace(/\/+$/, ""), key: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY }; }
async function secGet(env, key) {
  const s = secSb(env);
  if (!s.url || !s.key) return null;
  const r = await fetch(s.url + "/rest/v1/team_settings?key=eq." + key + "&select=key,value&limit=1", { headers: { apikey: s.key, Authorization: "Bearer " + s.key } }).catch(() => null);
  if (!r || !r.ok) return null;
  const rows = await r.json().catch(() => []);
  return rows?.[0]?.value ?? null;
}
async function secPut(env, key, value) {
  const s = secSb(env);
  if (!s.url || !s.key) return;
  await fetch(s.url + "/rest/v1/team_settings?on_conflict=key", { method: "POST", headers: { apikey: s.key, Authorization: "Bearer " + s.key, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ key, value }]) }).catch(() => {});
  SEC_CACHE = { at: 0, v: null };
}
async function secLoad(env, fresh) {
  if (!fresh && SEC_CACHE.v && Date.now() - SEC_CACHE.at < 20000) return SEC_CACHE.v;
  const [cfg, st] = await Promise.all([secGet(env, "security"), secGet(env, "security_state")]);
  const v = {
    cfg: { hours: [8, 12, 24].includes(+cfg?.hours) ? +cfg.hours : 24, channel: ["telegram", "sms", "both"].includes(cfg?.channel) ? cfg.channel : "telegram", sms_phone: String(cfg?.sms_phone || "") },
    st: { gen: +st?.gen || 1, fails: +st?.fails || 0, locked_until: +st?.locked_until || 0, min_iat: +st?.min_iat || 0 },
  };
  SEC_CACHE = { at: Date.now(), v };
  return v;
}
async function secSig(env, msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(env.STUDIO_TEST_KEY || "") + "|two-step-v1"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 40);
}
function secBearer(request, env) {
  const h = request.headers.get("Authorization") || "";
  if (!h.startsWith("Bearer ")) return false;
  const k = h.slice(7).trim();
  return (!!env.STUDIO_TEST_KEY && secEq(k, env.STUDIO_TEST_KEY)) || (!!env.TEAM_API_KEY && secEq(k, env.TEAM_API_KEY));
}
function secCookie(request) { const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)sfcs=([^;]+)/); return m ? decodeURIComponent(m[1]) : ""; }
async function secSession(request, env) {
  const m = secCookie(request).match(/^s1\.(\d+)\.(\d+)\.([0-9a-f]{40})$/);
  if (!m) return null;
  const exp = +m[1], gen = +m[2];
  if (exp < Date.now()) return null;
  const { st } = await secLoad(env);
  if (gen !== st.gen) return null;
  return secEq(m[3], await secSig(env, "s|" + exp + "|" + gen)) ? { exp } : null;
}
function secJson(data, status = 200, cookie) {
  const h = { "content-type": "application/json", "cache-control": "no-store" };
  if (cookie != null) h["set-cookie"] = cookie;
  return new Response(JSON.stringify(data), { status, headers: h });
}
var secCookieFor = (token, maxAge) => "sfcs=" + token + "; Path=/; Max-Age=" + maxAge + "; HttpOnly; Secure; SameSite=Strict";
function secPhone(p) { let d = String(p || "").replace(/[^\d+]/g, ""); if (/^0\d{9}$/.test(d)) d = "+61" + d.slice(1); if (/^61\d{9}$/.test(d)) d = "+" + d; return /^\+\d{9,15}$/.test(d) ? d : ""; }
function secDevice(request) {
  const ua = request.headers.get("User-Agent") || "";
  const dev = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows PC" : "a device";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "";
  const where = [request.cf?.city, request.cf?.country].filter(Boolean).join(", ");
  return dev + (br ? " (" + br + ")" : "") + (where ? " near " + where : "");
}
async function secTg(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN) return false;
  const t = await secGet(env, "telegram");
  const chat = t?.chat_id || env.TELEGRAM_CHAT_ID;
  if (!chat) return false;
  const r = await fetch("https://api.telegram.org/bot" + env.TELEGRAM_BOT_TOKEN + "/sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }) }).then((r) => r.json()).catch(() => null);
  return !!r?.ok;
}
async function secSms(env, phone, text) {
  const tok = env.GHL_TOKEN || env.GHL_PRIVATE_TOKEN, loc = env.GHL_LOCATION_ID;
  phone = secPhone(phone);
  if (!tok || !loc || !phone) return false;
  const H = (v) => ({ Authorization: "Bearer " + tok, Version: v, "Content-Type": "application/json", Accept: "application/json" });
  const u = await fetch("https://services.leadconnectorhq.com/contacts/upsert", { method: "POST", headers: H("2021-07-28"), body: JSON.stringify({ locationId: loc, phone, tags: ["command-login"] }) }).then((r) => r.json()).catch(() => null);
  const id = u?.contact?.id;
  if (!id) return false;
  const r = await fetch("https://services.leadconnectorhq.com/conversations/messages", { method: "POST", headers: H("2021-04-15"), body: JSON.stringify({ type: "SMS", contactId: id, message: text }) }).catch(() => null);
  return !!r?.ok;
}
async function secIssue(env, request, hours, gen, note) {
  const exp = Date.now() + hours * 36e5;
  const token = "s1." + exp + "." + gen + "." + (await secSig(env, "s|" + exp + "|" + gen));
  if (note) await secTg(env, "✅ <b>New Command login</b>\n" + secDevice(request) + ". It stays signed in for " + hours + " hours.\nNot you? Open Command › Settings › Security › Sign out every device, then change your Studio key.").catch(() => {});
  return secJson({ ok: true, session: true, expires_at: new Date(exp).toISOString(), hours }, 200, secCookieFor(token, hours * 3600));
}
async function secRoute(request, env, url) {
  const p = url.pathname.replace(/^\/api\/v1\/auth\/?/, "").replace(/\/+$/, "");
  if (!secBearer(request, env)) return secJson({ ok: false, error: "That key didn't work. Try again." }, 401);
  const off = env.COMMAND_2FA === "off";
  if (p === "start" && request.method === "POST") {
    const { cfg, st } = await secLoad(env, true);
    if (off) return secIssue(env, request, cfg.hours, st.gen, false);
    if (st.locked_until > Date.now()) return secJson({ ok: false, error: "Too many wrong codes. Try again in " + Math.ceil((st.locked_until - Date.now()) / 6e4) + " minutes." }, 429);
    const rnd = new Uint32Array(2); crypto.getRandomValues(rnd);
    const code = String(rnd[0] % 1e6).padStart(6, "0"), nonce = rnd[1].toString(16), iat = Date.now(), exp = iat + 5 * 6e4;
    const challenge = "c1." + iat + "." + exp + "." + nonce + "." + (await secSig(env, "c|" + iat + "|" + exp + "|" + nonce + "|" + code));
    const sent = [];
    if (cfg.channel !== "sms" && (await secTg(env, "🔐 <b>Command login code</b>\n<code>" + code + "</code>\nWorks for 5 minutes. Didn't just try to log in? Someone has your Studio key: change it in Cloudflare."))) sent.push("Telegram");
    if (cfg.channel !== "telegram" && cfg.sms_phone && (await secSms(env, cfg.sms_phone, "Your Studio Flow Command login code is " + code + ". It works for 5 minutes. Didn't ask for this? Change your Studio key."))) sent.push("phone (SMS)");
    if (!sent.length && cfg.channel === "sms" && (await secTg(env, "🔐 <b>Command login code</b> (SMS failed)\n<code>" + code + "</code>"))) sent.push("Telegram (SMS didn't send)");
    if (!sent.length) return secJson({ ok: false, error: "Couldn't send your login code (Telegram isn't connected). In Cloudflare add the variable COMMAND_2FA = off to get in, then reconnect Telegram." }, 503);
    return secJson({ ok: true, challenge, sent_to: sent, hours: cfg.hours });
  }
  if (p === "verify" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const { cfg, st } = await secLoad(env, true);
    if (st.locked_until > Date.now()) return secJson({ ok: false, error: "Too many wrong codes. Try again in " + Math.ceil((st.locked_until - Date.now()) / 6e4) + " minutes." }, 429);
    const m = String(b.challenge || "").match(/^c1\.(\d+)\.(\d+)\.([0-9a-f]+)\.([0-9a-f]{40})$/);
    const code = String(b.code || "").replace(/\D/g, "");
    if (!m || +m[2] < Date.now() || +m[1] < st.min_iat) return secJson({ ok: false, error: "That code has expired. Enter your key again for a new one." }, 400);
    if (code.length !== 6 || !secEq(m[4], await secSig(env, "c|" + m[1] + "|" + m[2] + "|" + m[3] + "|" + code))) {
      const fails = st.fails + 1;
      if (fails >= 5) {
        await secPut(env, "security_state", { ...st, fails: 0, locked_until: Date.now() + 15 * 6e4, min_iat: Date.now() });
        await secTg(env, "⚠️ <b>Command login locked for 15 minutes</b>\n5 wrong codes from " + secDevice(request) + ". If this wasn't you, change your Studio key in Cloudflare now.").catch(() => {});
        return secJson({ ok: false, error: "Too many wrong codes. Login is locked for 15 minutes." }, 429);
      }
      await secPut(env, "security_state", { ...st, fails });
      return secJson({ ok: false, error: "That code isn't right. " + (5 - fails) + (5 - fails === 1 ? " try" : " tries") + " left." }, 401);
    }
    await secPut(env, "security_state", { ...st, fails: 0, min_iat: +m[1] + 1 });
    return secIssue(env, request, cfg.hours, st.gen, true);
  }
  const sess = off ? { exp: 0 } : await secSession(request, env);
  if (!sess) return secJson({ ok: false, two_step: true, error: "two_step_required: confirm the code sent to your phone." }, 401);
  if (p === "status" && request.method === "GET") {
    const { cfg } = await secLoad(env, true);
    return secJson({ ok: true, enforced: !off, expires_at: sess.exp ? new Date(sess.exp).toISOString() : null, ...cfg, telegram: !!env.TELEGRAM_BOT_TOKEN, sms_ready: !!((env.GHL_TOKEN || env.GHL_PRIVATE_TOKEN) && env.GHL_LOCATION_ID) });
  }
  if (p === "settings" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const { cfg } = await secLoad(env, true);
    const next = { ...cfg };
    if (b.hours != null) { if (![8, 12, 24].includes(+b.hours)) return secJson({ ok: false, error: "Choose 8, 12 or 24 hours." }, 400); next.hours = +b.hours; }
    if (b.channel != null) { if (!["telegram", "sms", "both"].includes(b.channel)) return secJson({ ok: false, error: "Choose Telegram, SMS or both." }, 400); next.channel = b.channel; }
    if (b.sms_phone != null) { const ph = String(b.sms_phone).trim(); if (ph && !secPhone(ph)) return secJson({ ok: false, error: "That mobile number doesn't look right (e.g. 0412 345 678)." }, 400); next.sms_phone = ph ? secPhone(ph) : ""; }
    if (next.channel !== "telegram" && !next.sms_phone) return secJson({ ok: false, error: "Add your mobile number to get codes by SMS." }, 400);
    await secPut(env, "security", next);
    return secJson({ ok: true, ...next });
  }
  if (p === "signout-all" && request.method === "POST") {
    const { st } = await secLoad(env, true);
    await secPut(env, "security_state", { ...st, gen: st.gen + 1 });
    await secTg(env, "🔒 <b>Every device was signed out of Command.</b> Each one needs a new code to get back in.").catch(() => {});
    return secJson({ ok: true }, 200, secCookieFor("", 0));
  }
  return secJson({ ok: false, error: "Not found." }, 404);
}
async function secGate(request, env) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/v1/auth/")) return secRoute(request, env, url);
  if (env.COMMAND_2FA === "off" || !secBearer(request, env)) return null;
  if (await secSession(request, env)) return null;
  return secJson({ ok: false, two_step: true, error: "two_step_required: confirm the code sent to your phone." }, 401);
}

'''
rep('export default {\n', SERVER + 'export default {\n')
rep('async fetch(request, env, ctx) { if (isTeamPath(new URL(request.url).pathname)) return teamFetch(request, env, ctx);',
    'async fetch(request, env, ctx) { const sec2 = await secGate(request, env).catch((e) => secJson({ ok: false, error: "Login check failed: " + e.message }, 500)); if (sec2) return sec2; if (isTeamPath(new URL(request.url).pathname)) return teamFetch(request, env, ctx);')

# ---- Command app: second step on the lock screen ----
rep('''  async function unlock(e) {
    e.preventDefault();
    const input = $("#gKey"), btn = $("#gBtn"), key = input.value.trim();
    if (!key) return gate("Enter your Studio key.", true);''',
'''  let TWO = null;
  async function twoFetch(path, body) {
    const r = await fetch("/api/v1/auth/" + path, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Authorization: "Bearer " + KEY }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(30000) });
    const d = await r.json().catch(() => ({ ok: false, error: "Unexpected response (HTTP " + r.status + ")." }));
    if (!r.ok || d.ok === false) throw new Error(d.error || "Request failed.");
    return d;
  }
  function resetTwo() {
    TWO = null;
    const i = $("#gKey"), b = $("#gBtn"), l = $("label[for=gKey]");
    if (!i) return;
    i.type = "password"; i.removeAttribute("inputmode"); i.removeAttribute("maxlength"); i.autocomplete = "current-password"; i.placeholder = "Enter your Studio key";
    if (l) l.textContent = "Studio access key";
    if (b) b.textContent = "Unlock command centre";
  }
  async function startTwo() {
    const input = $("#gKey"), msg = $("#gMsg");
    msg.className = "msg"; msg.textContent = "Sending your login code...";
    try {
      const d = await twoFetch("start");
      if (d.session) return finishUnlock();
      TWO = { challenge: d.challenge };
      input.value = ""; input.type = "text"; input.inputMode = "numeric"; input.autocomplete = "one-time-code"; input.maxLength = 7; input.placeholder = "6-digit code";
      $("label[for=gKey]").textContent = "Login code";
      $("#gBtn").textContent = "Confirm code";
      msg.textContent = "Step 2: enter the 6-digit code just sent to your " + d.sent_to.join(" and ") + ". It works for 5 minutes. After that this device stays signed in for " + d.hours + " hours.";
      setOrb("idle");
      setTimeout(() => input.focus(), 30);
    } catch (err) { KEY = ""; resetTwo(); setOrb("idle"); gate(err.message, true); }
  }
  async function verifyTwo(code) {
    const msg = $("#gMsg"), btn = $("#gBtn"), c = code.replace(/[^0-9]/g, "");
    if (c.length !== 6) { msg.className = "msg bad"; msg.textContent = "Enter the 6 numbers from the message."; return; }
    btn.disabled = true; msg.className = "msg"; msg.textContent = "Checking your code..."; setOrb("thinking");
    try { await twoFetch("verify", { challenge: TWO.challenge, code: c }); resetTwo(); await finishUnlock(); }
    catch (err) {
      $("#gKey").value = ""; setOrb("idle");
      if (/expired|locked|Too many/i.test(err.message)) { KEY = ""; resetTwo(); gate(err.message, true); }
      else { msg.className = "msg bad"; msg.textContent = err.message; }
    } finally { btn.disabled = false; }
  }
  async function finishUnlock() {
    const ov = await op("/overview");
    CACHE.set("overview", { at: Date.now(), p: Promise.resolve(ov) });
    $("#gKey").value = "";
    $("#gate").hidden = true;
    $("#app").hidden = false;
    shell();
    setOrb("idle");
    render();
    refreshBadges();
  }
  async function unlock(e) {
    e.preventDefault();
    const input = $("#gKey"), btn = $("#gBtn"), key = input.value.trim();
    if (TWO) return verifyTwo(key);
    if (!key) return gate("Enter your Studio key.", true);''')
rep('''    KEY = key;
    try {
      const ov = await op("/overview");
      CACHE.set("overview", { at: Date.now(), p: Promise.resolve(ov) });
      input.value = "";
      $("#gate").hidden = true;
      $("#app").hidden = false;
      shell();
      setOrb("idle");
      render();
      refreshBadges();
    } catch (err) {
      KEY = "";''', '''    KEY = key;
    try {
      await finishUnlock();
    } catch (err) {
      if (/two_step_required/.test(err.message)) { input.value = ""; return startTwo(); }
      KEY = "";''')
rep('''    if (r.status === 401) { if (!$("#app").hidden) lock("Your session ended. Enter your key again."); throw new Error(d.error || "Unauthorised."); }''',
    '''    if (r.status === 401) { if (!$("#app").hidden) lock(d.two_step ? "Your secure session ended. Enter your key and we'll send a new code." : "Your session ended. Enter your key again."); throw new Error(d.error || "Unauthorised."); }''')
rep('''  function gate(message, bad) {
    $("#app").hidden = true;''', '''  function gate(message, bad) {
    if (TWO) resetTwo();
    $("#app").hidden = true;''')

# ---- Settings > Security tab ----
rep('''["settings", "Settings", "sliders", [["autopilot", "Autopilot"], ["connections", "Connections"], ["systems", "Systems lab"]]],''',
    '''["settings", "Settings", "sliders", [["autopilot", "Autopilot"], ["security", "Security"], ["connections", "Connections"], ["systems", "Systems lab"]]],''')
rep('''    autopilot: ["Settings", "What runs on its own, when, and what always waits for you"],''',
    '''    autopilot: ["Settings", "What runs on its own, when, and what always waits for you"],
    security: ["Security", "Two-step login: your key plus a code to your phone"],''')
VIEW = r'''
  VIEWS.security = async (el) => {
    el.innerHTML = sk(220);
    let d;
    try { d = await req("/api/v1/auth/status"); } catch (e) { el.innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; return; }
    if (!still("security", el)) return;
    const exp = d.expires_at ? new Date(d.expires_at).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", hour: "numeric", minute: "2-digit" }) : "";
    el.innerHTML = '<section class="p"><div class="ph"><div><h2>Two-step login</h2><p class="mu sm">' + (d.enforced ? "On. Your Studio key alone can't open Command: every new device also needs a 6-digit code sent to you." : "Off (COMMAND_2FA = off in Cloudflare). Remove that variable to turn it back on.") + "</p></div></div>" +
      (exp ? '<p class="sm" style="margin:0 0 14px">This device is signed in until <b>' + esc(exp) + "</b>.</p>" : "") +
      '<div class="grid2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">' +
      '<label class="lab">Stay signed in for<select class="in" id="secH">' + [8, 12, 24].map((h) => '<option value="' + h + '"' + (h === d.hours ? " selected" : "") + ">" + h + " hours</option>").join("") + "</select></label>" +
      '<label class="lab">Send codes by<select class="in" id="secC">' + [["telegram", "Telegram"], ["sms", "SMS"], ["both", "Telegram and SMS"]].map((x) => '<option value="' + x[0] + '"' + (x[0] === d.channel ? " selected" : "") + ">" + x[1] + "</option>").join("") + "</select></label>" +
      '<label class="lab">Your mobile (for SMS codes)<input class="in" id="secP" inputmode="tel" placeholder="0412 345 678" value="' + esc(d.sms_phone || "") + '"></label></div>' +
      '<div class="mu xs" style="margin-top:8px">SMS codes are sent from your GHL business number' + (d.sms_ready ? "" : " (GHL isn't connected yet, so use Telegram)") + '. Codes work for 5 minutes. 5 wrong codes lock login for 15 minutes and alert you on Telegram. Every new login is reported on Telegram.</div>' +
      '<div class="row" style="gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn pri" id="secSave">Save</button><button class="btn bad" id="secOut">Sign out every device</button></div></section>';
    $("#secSave", el).onclick = async () => {
      try { await req("/api/v1/auth/settings", { method: "POST", body: { hours: +$("#secH", el).value, channel: $("#secC", el).value, sms_phone: $("#secP", el).value.trim() } }); toast("Security saved"); } catch (e) { toast(e.message, "bad"); }
    };
    $("#secOut", el).onclick = async () => {
      const ok = await modal({ title: "Sign out every device?", text: "Every phone and computer, including this one, will need your key and a new code to get back in.", ok: "Sign out everywhere", danger: true });
      if (!ok) return;
      try { await req("/api/v1/auth/signout-all", { method: "POST", body: {} }); lock("Signed out everywhere. Enter your key for a new code."); } catch (e) { toast(e.message, "bad"); }
    };
  };
'''
rep('''  VIEWS.money = async (el) => {''', VIEW + '''  VIEWS.money = async (el) => {''')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace(oldv, hashlib.sha1(s.encode()).hexdigest()[:10])
open(f, 'w').write(s)
print('v35 two-step login applied')
