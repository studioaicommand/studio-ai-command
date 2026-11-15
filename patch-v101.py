# v101 (1) Command sees every conversation: an hourly safety-net sweep of the GHL inbox, on Studio Flow and every
# client Command, so a message is never missed even if the "Customer replied" webhook workflow is missing or misfires.
# Plus a health check showing when the webhook last fired.
# (2) Ty-only demo links: links Ty gets (Telegram, chat, Command) carry a private mark. Opening one, or opening any demo
# in a browser where Ty is signed in to Command or has opened a Ty link before, never counts as the lead: no view,
# no alert, no demo watcher, no follow-up, no tag. Real lead opens tag the contact `demo-opened` in GHL, which starts
# the GHL demo email sequence. The private mark is stripped from anything sent through GHL, so a lead never gets it.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# ── helpers (top level, before the v71 security layer) ──
H = r'''
// ── v101 Ty-only demo links ──
async function tyMark(env, what = "ty") {
  const key = String(env.SEAL_KEY || env.STUDIO_TEST_KEY || env.TEAM_API_KEY || "sf") + "|ty-v101";
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(String(what))));
  const m = Array.from(sig.slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
  if (what === "ty") globalThis.__sfTyMark = m;
  return m;
}
async function tyView(request, env, url) {
  try {
    const mark = await tyMark(env);
    if (url.searchParams.get("ty") === mark) return true;
    const c = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)sfty=([a-f0-9]{16})/);
    if (c && c[1] === mark) return true;
    if (await secSession(request, env).catch(() => null)) return true;
  } catch {}
  return false;
}
async function tyCookieHeader(env, url) {
  const p = url.searchParams.get("ty");
  if (!p || p !== await tyMark(env).catch(() => "")) return {};
  return { "Set-Cookie": "sfty=" + p + "; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax" };
}
var TY_BADGE = '<div id="sf-ty" style="position:fixed;left:12px;top:12px;z-index:2147483646;font:600 11px/1 system-ui,sans-serif;letter-spacing:.04em;background:rgba(7,17,29,.86);color:#9fdcff;border:1px solid rgba(57,184,255,.45);border-radius:999px;padding:7px 11px;pointer-events:none">Your view · not tracked</div>';
function tyDecorate(html, ty) { if (!ty) return html; const i = String(html).lastIndexOf("</body>"); return i > 0 ? html.slice(0, i) + TY_BADGE + html.slice(i) : html + TY_BADGE; }
function tyAdd(link) { const m = globalThis.__sfTyMark; return m && link ? link + (link.includes("?") ? "&" : "?") + "ty=" + m : link; }
// Never let the private mark reach a lead: stripped from every body sent to GHL.
function tyStrip(body) {
  if (!body || typeof body !== "object") return body;
  const j = JSON.stringify(body);
  if (!/[?&]ty=[a-f0-9]/.test(j)) return body;
  return JSON.parse(j.replace(/\?ty=[a-f0-9]{1,16}(?![a-f0-9])(?:&amp;|&)/g, "?").replace(/(?:&amp;|[?&])ty=[a-f0-9]{1,16}(?![a-f0-9])/g, ""));
}
'''
rep("// ── v71 security layer: runs around every request ──", H + "\n// ── v71 security layer: runs around every request ──")

H2 = r'''
// Real lead opened a demo: tag them so the GHL demo email sequence starts (once per contact).
async function demoOpenTag(env, { email, what }) {
  if (!email || !/@/.test(email) || !env.GHL_TOKEN || !env.GHL_LOCATION_ID) return { skipped: "no email" };
  const st = await getSettings(env).catch(() => ({}));
  if ((st.inbox || {}).demo_open_tag === "off") return { skipped: "off" };
  if ((await instGet(env).catch(() => null))?.modules?.outreach === false) return { skipped: "client copy" };
  const up = await req(env, "POST", "/contacts/upsert", { locationId: env.GHL_LOCATION_ID, email: String(email).trim().toLowerCase() });
  const id = up?.contact?.id;
  if (!id) return { skipped: "no contact" };
  await addTags(env, id, ["demo-opened"]);
  await audit(env, { actor: "Demo", action: "demo_open_tag", target_type: "contact", target_id: id, summary: "Tagged demo-opened (" + (what || "demo") + ")" }).catch(() => {});
  return { ok: true, contact_id: id };
}
async function wsdLeadEmail(env, token) {
  const rows = await select(env, "team_actions", "type=eq.campaign_enrol&params->>site_demo_url=like.*" + token + "*&select=params&order=created_at.desc&limit=1").catch(() => []);
  return rows[0]?.params?.email || null;
}

// ── v101 inbox sweep: the safety net under the "Customer replied" webhook ──
async function v101Get(env, key) { const r = await select(env, "team_settings", "key=eq." + key + "&select=value&limit=1").catch(() => []); return r?.[0]?.value || null; }
async function inboxSweep(env, { force = false } = {}) {
  if (!enabled(env)) return { skipped: "ghl not connected" };
  const settings = await getSettings(env).catch(() => ({}));
  if ((settings.inbox || {}).sweep === "off") return { skipped: "sweep off" };
  const st = (await v101Get(env, "inbox_sweep").catch(() => null)) || {};
  st.seen = st.seen || {};
  if (!force && Date.now() - (st.last_run || 0) < 4 * 6e4) return { skipped: "ran recently" };
  const r = await searchConversations(env, { limit: 50 }).catch((e) => ({ error: String(e.message).slice(0, 200) }));
  if (r.error) return { error: r.error };
  const cutoff = Date.now() - 48 * 36e5;
  let checked = 0, acted = 0;
  const results = [];
  for (const c of r.conversations || []) {
    const at = typeof c.lastMessageDate === "number" ? c.lastMessageDate : Date.parse(c.lastMessageDate || "") || 0;
    if (!at || at < cutoff || !c.contactId) continue;
    if (String(c.lastMessageDirection || "").toLowerCase() !== "inbound") continue;
    if ((st.seen[c.id] || 0) >= at) continue;
    if (!force && Date.now() - at < 2 * 6e4) continue; // give the webhook first go
    if (checked >= 10) break;
    checked++;
    st.seen[c.id] = at;
    const out = await inboxHandle(env, { contact_id: c.contactId, event: "sweep" }).catch((e) => ({ error: String(e.message).slice(0, 160) }));
    if (out && (out.queued || out.sent || out.handoff)) acted++;
    results.push({ contact: c.contactName || c.fullName || c.contactId, result: out });
  }
  for (const [k, v] of Object.entries(st.seen)) if (v < Date.now() - 7 * 864e5) delete st.seen[k];
  const log = await select(env, "team_settings", "key=eq.inbox_log&select=value&limit=1").catch(() => []);
  const hookLast = (Array.isArray(log?.[0]?.value) ? log[0].value : [])[0]?.at || null;
  st.last_run = Date.now(); st.last = { at: new Date().toISOString(), checked, acted }; st.webhook_last = hookLast;
  await saveSetting(env, "inbox_sweep", st).catch(() => {});
  if (acted) await audit(env, { actor: "Inbox", action: "inbox_sweep", target_type: "inbox", target_id: "ghl", summary: "Safety-net sweep picked up " + acted + " message(s) the webhook missed" }).catch(() => {});
  return { ok: true, checked, acted, webhook_last: hookLast, results };
}
async function inboxHealth(env) {
  const st = (await v101Get(env, "inbox_sweep").catch(() => null)) || {};
  const log = await select(env, "team_settings", "key=eq.inbox_log&select=value&limit=1").catch(() => []);
  const hookLast = (Array.isArray(log?.[0]?.value) ? log[0].value : [])[0]?.at || null;
  const age = hookLast ? Date.now() - Date.parse(hookLast) : null;
  return { ok: true, webhook_last: hookLast, webhook: !hookLast ? "never" : age < 3 * 864e5 ? "working" : "quiet", sweep_last: st.last || null,
    note: !hookLast ? "GHL has never called Command's inbox webhook. Add the 'Customer replied' workflow in GHL (Settings > Connections shows the address). Until then the hourly sweep still catches every message." : "The webhook answers instantly; the hourly sweep catches anything it misses." };
}
'''
rep("async function inboxHandle(env, body) {", H2 + "\nasync function inboxHandle(env, body) {")

rep('["email_stats", "fair_use_status"', '["inbox_sweep", "email_stats", "fair_use_status"')

# prime the mark before anything builds links
rep("""    if (await sfRateLimited(request).catch(() => false))""", """    if (!globalThis.__sfTyMark) await tyMark(env).catch(() => {});
    if (await sfRateLimited(request).catch(() => false))""")
rep("async scheduled(event, env, ctx) { globalThis.__SF_EMAIL_STYLE = env.EMAIL_STYLE || \"\";", "async scheduled(event, env, ctx) { globalThis.__SF_EMAIL_STYLE = env.EMAIL_STYLE || \"\"; if (!globalThis.__sfTyMark) await tyMark(env).catch(() => {});")

# strip the mark from anything sent to GHL
rep("""async function req(env, method, path, body, version = "2021-07-28") {
""", """async function req(env, method, path, body, version = "2021-07-28") {
  body = tyStrip(body);
""")

# Ty links next to client links
rep("""  return { site: `${o}/demo/${token}/site`, report: `${o}/demo/${token}/report`, receptionist: `${o}/demo/${token}` };""",
    """  const L = { site: `${o}/demo/${token}/site`, report: `${o}/demo/${token}/report`, receptionist: `${o}/demo/${token}` };
  return { ...L, ty_site: tyAdd(L.site), ty_report: tyAdd(L.report), ty_receptionist: tyAdd(L.receptionist) };""")
rep("""      return { ok: true, preview_homepage: r.site + "?preview=1", preview_report: r.report + "?preview=1", client_homepage: r.site, client_report: r.report, cost_aud: r.cost_aud, style: r.style, note: "Preview links never alert. Ty approves in Command before anything is sent." };""",
    """      return { ok: true, ty_homepage: tyAdd(r.site), ty_report: tyAdd(r.report), client_homepage: r.site, client_report: r.report, cost_aud: r.cost_aud, style: r.style, note: "Give Ty the ty_ links: they look exactly like the client's but never count as the lead opening it. client_ links are only for the business. Ty approves in Command before anything is sent." };""")

# concept site + leak report
rep("""  const work = wsdSeen(env, token, rec, kind, request, url).catch(() => {});
  ctx?.waitUntil ? ctx.waitUntil(work) : await work;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8",""",
    """  const ty = await tyView(request, env, url);
  const work = ty ? Promise.resolve() : wsdSeen(env, token, rec, kind, request, url).catch(() => {});
  ctx?.waitUntil ? ctx.waitUntil(work) : await work;
  return new Response(tyDecorate(html, ty), { headers: { ...(await tyCookieHeader(env, url)), "Content-Type": "text/html; charset=utf-8",""")
# first real open tags the lead in GHL
rep("""  it.views = (+it.views || 0) + 1;
  it.last_view = wsdNow();""", """  it.views = (+it.views || 0) + 1;
  it.last_view = wsdNow();
  if (it.views === 1 && !/^test/i.test(rec.name || "")) await demoOpenTag(env, { email: await wsdLeadEmail(env, token), what: kind === "report" ? "leak report" : "website demo" }).catch(() => {});""")

# hand-built site demos
rep("function siteDemoResponse(request, env, url, ctx, parts) {", "async function siteDemoResponse(request, env, url, ctx, parts) {")
rep("""  const work = siteDemoSeen(env, slug, kind, request, url);
  ctx?.waitUntil ? ctx.waitUntil(work) : work.catch(() => {});
  return new Response(kind === "report" ? d.report : wsdInject(d.page, slug, url), { headers: {""",
    """  const ty = await tyView(request, env, url);
  const work = ty ? Promise.resolve() : siteDemoSeen(env, slug, kind, request, url);
  ctx?.waitUntil ? ctx.waitUntil(work) : work.catch(() => {});
  return new Response(tyDecorate(kind === "report" ? d.report : wsdInject(d.page, slug, url), ty), { headers: { ...(await tyCookieHeader(env, url)),""")

# receptionist demos
rep("""    return pageResponse(d, url, offerOf(settings), !!env.OPENAI_API_KEY);""",
    """    const pr = await pageResponse(d, url, offerOf(settings), !!env.OPENAI_API_KEY);
    const tc = await tyCookieHeader(env, url);
    if (!tc["Set-Cookie"]) return pr;
    const hh = new Headers(pr.headers); hh.append("Set-Cookie", tc["Set-Cookie"]);
    return new Response(pr.body, { status: pr.status, headers: hh });""")
rep("""  if (action === "seen") {
    const work = recordEvent(env, d, url);""", """  if (action === "seen") {
    const work = (await tyView(request, env, url)) ? Promise.resolve() : recordEvent(env, d, url);""")
rep("""    await audit(env, { actor: "Demo", action: "demo_opened", target_type: "prospect", target_id: d.prospect_id, summary: `${d.business_name} opened their demo` }).catch(() => {""",
    """    await demoOpenTag(env, { email: p?.email, what: "AI receptionist demo" }).catch(() => {});
    await audit(env, { actor: "Demo", action: "demo_opened", target_type: "prospect", target_id: d.prospect_id, summary: `${d.business_name} opened their demo` }).catch(() => {""")

# chats and voice from Ty never count either
rep("""  const preview2 = url.searchParams.get("preview") === "1";
  const all = await secGet(env, "site_demos")""", """  const preview2 = url.searchParams.get("preview") === "1" || await tyView(request, env, url);
  const all = await secGet(env, "site_demos")""")
rep("""  const preview2 = url.searchParams.get("preview") === "1" || !!b.preview;
  const all = await secGet(env, "wsd_chats")""", """  const preview2 = url.searchParams.get("preview") === "1" || !!b.preview || await tyView(request, env, url);
  const all = await secGet(env, "wsd_chats")""")
rep("""  const preview2 = url.searchParams.get("preview") === "1";
  const day = brisDay2(), used = d.day === day ? d.day_count || 0 : 0;""", """  const preview2 = url.searchParams.get("preview") === "1" || await tyView(request, env, url);
  const day = brisDay2(), used = d.day === day ? d.day_count || 0 : 0;""")
rep("""  const preview2 = url.searchParams.get("preview") === "1";
  const day = brisDay2(), used = d.voice_day === day ? d.voice_count || 0 : 0;""", """  const preview2 = url.searchParams.get("preview") === "1" || await tyView(request, env, url);
  const day = brisDay2(), used = d.voice_day === day ? d.voice_count || 0 : 0;""")

# Command UI: copy Ty's own link
rep("""id="wdCopy">Copy links</button>""", """id="wdCopy">Copy links</button><button class="btn" id="wdMine">My link (not tracked)</button>""")
rep("""    $('#wdCopy', el).onclick = async () => {""", """    $('#wdMine', el).onclick = async () => { const t = r.ty_site || r.site; try { await navigator.clipboard.writeText(t); toast('Your link copied. Opening it never counts as the lead and never alerts you.', 'ok'); } catch { toast(t); } };
    $('#wdCopy', el).onclick = async () => {""")

# inbox: sweep never re-handles a message already looked at
rep("""  const msgId = inbound.id || ('p-' + contactId + '-' + text.slice(0, 40));
""", """  const msgId = inbound.id || ('p-' + contactId + '-' + text.slice(0, 40));
  if (body.event === 'sweep') { const lq = (await v101Get(env, 'inbox_quiet').catch(() => null)) || { items: [] }; if ((lq.items || []).some((x) => x.message_id === msgId)) return { skipped: 'already seen' }; }
""")

# cron + routes + Command knows
rep("""  await inboxFollowups(e).catch((x) => console.error("follow-ups:", x.message));""", """  await inboxSweep(e).catch((x) => console.error("inbox sweep:", x.message));
  await inboxFollowups(e).catch((x) => console.error("follow-ups:", x.message));""")
rep("""  if (seg[0] === "billing") {""", """  if (seg[0] === "inbox-sweep") { if (m === "POST") return json(await inboxSweep(env, { force: true })); if (m === "GET") return json(await inboxHealth(env)); }
  if (seg[0] === "billing") {""")
rep("""    "BILLING: when a client's subscription payment fails""", """    "INBOX: Command sees every GHL conversation. The 'Customer replied' webhook hands each message over instantly, and an hourly sweep of the GHL inbox catches anything it missed, on Studio Flow and on every client Command. If Ty asks whether the webhook is working, check /inbox-sweep (webhook_last).",
    "DEMO LINKS: whenever you give Ty a demo link (in chat or Telegram) give the ty_ link (ty_site, ty_report, ty_receptionist, ty_homepage): it looks exactly like the client's, shows 'Your view, not tracked', and never counts as the lead opening it. Never put a ty_ link or a ty= mark in anything for a lead or client. When a real lead opens their demo for the first time, Command tags them demo-opened in GHL, which starts the GHL demo email sequence.",
    "BILLING: when a client's subscription payment fails""")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v101 applied')
