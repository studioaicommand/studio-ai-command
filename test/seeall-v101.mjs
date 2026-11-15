// v101 Command sees every conversation (hourly safety-net sweep) + Ty-only demo links that never count as the lead.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const NOW = Date.parse("2026-11-16T00:00:00Z"); const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_actions: [], team_audit: [], agent_demos: [], agent_prospects: [] };
let seq = 0;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|like)\.(.*)$/); if (!m) return true; const val = String((k.includes("->>") ? (r[k.split("->>")[0]] || {})[k.split("->>")[1]] : r[k]) ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "like") return val.includes(m[2].replace(/\*/g, "")); return true; });
const tgs = [], ghl = [];
const CONVS = [
  { id: "cv1", contactId: "c1", contactName: "Jess", lastMessageDirection: "inbound", lastMessageDate: NOW - 30 * 6e4 },
  { id: "cv2", contactId: "c2", contactName: "Tom", lastMessageDirection: "outbound", lastMessageDate: NOW - 20 * 6e4 },
  { id: "cv3", contactId: "c3", contactName: "Old", lastMessageDirection: "inbound", lastMessageDate: NOW - 5 * 864e5 },
  { id: "cv4", contactId: "c4", contactName: "Just now", lastMessageDirection: "inbound", lastMessageDate: NOW - 30e3 }
];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new RealDate(NOW).toISOString(), ...r })); for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 900 + tgs.length } }); }
  if (u.includes("leadconnectorhq.com")) { ghl.push({ u, m, body });
    if (u.includes("/conversations/search?") && u.includes("contactId=")) { const cid = new URL(u).searchParams.get("contactId"); return Response.json({ conversations: [{ id: "h-" + cid }] }); }
    if (u.includes("/conversations/search?")) return Response.json({ conversations: CONVS });
    if (/\/conversations\/h-[^/]+\/messages/.test(u)) return Response.json({ messages: { messages: [{ id: "m1", direction: "inbound", body: "hi", messageType: "TYPE_SMS", dateAdded: new RealDate(NOW - 36e5).toISOString() }, { id: "m2", direction: "outbound", userId: "u1", body: "hello", messageType: "TYPE_SMS", dateAdded: new RealDate(NOW - 35e5).toISOString() }] } });
    if (u.includes("/contacts/upsert")) return Response.json({ contact: { id: "c_" + body.email.split("@")[0] } });
    return Response.json({ messageId: "x" }); }
  return new Response("{}", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const call = async (path, b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, ctx); await flush(); return { s: r.status, j: await r.json().catch(() => ({})) }; };

// ── 1. Inbox sweep ──
let r = await call("/inbox-sweep");
assert(r.j.ok && r.j.webhook === "never" && /never called/.test(r.j.note), "Health check says the webhook has never fired: " + r.j.webhook);
r = await call("/inbox-sweep", {});
assert(r.j.ok && r.j.checked === 2, "Sweep looks at the new inbound conversations only (not ones you answered last, not ones older than 48h): " + JSON.stringify(r.j.results.map((x) => x.contact)));
assert(r.j.results.some((x) => x.contact === "Jess") && !r.j.results.some((x) => x.contact === "Tom" || x.contact === "Old"), "Jess (waiting on a reply) is picked up; Tom (already answered) and the 5-day-old message are not");
assert(r.j.results.find((x) => x.contact === "Jess").result.skipped === "already answered", "Each one goes through the normal inbox rules (here the business has already replied, so Command stays quiet)");
r = await call("/inbox-sweep", {});
assert(r.j.checked === 0, "Running again doesn't look at the same messages twice");
DB.team_settings.push({ key: "inbox_log", value: [{ at: new RealDate(NOW - 36e5).toISOString(), result: {} }] });
r = await call("/inbox-sweep");
assert(r.j.webhook === "working", "Once GHL calls the webhook, the health check shows it working");

// ── 2. Ty-only demo links ──
const k = await crypto.subtle.importKey("raw", new TextEncoder().encode("k|ty-v101"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const MARK = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode("ty"))).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
const open = async (path, headers = {}) => { const res = await w.fetch(new Request("https://studioflowandsystems.app" + path, { headers: { "user-agent": "Mozilla/5.0 iPhone", ...headers } }), env, ctx); await flush(); return { s: res.status, h: res.headers, t: await res.text() }; };
let t0 = tgs.length;
let o = await open("/demo/karinya?ty=" + MARK);
assert(o.s === 200 && tgs.length === t0, "Ty's link: the demo opens and nobody is alerted");
assert(/Your view · not tracked/.test(o.t), "Ty's view shows a small 'Your view, not tracked' badge");
const ck = o.h.get("set-cookie") || "";
assert(/sfty=[a-f0-9]{16}/.test(ck) && /HttpOnly/.test(ck) && /Secure/.test(ck), "Ty's phone is remembered (private cookie), so later plain links don't count either");
o = await open("/demo/karinya", { Cookie: ck.split(";")[0] });
assert(tgs.length === t0 && /not tracked/.test(o.t), "Plain client link opened on Ty's phone afterwards: still not counted");
o = await open("/demo/karinya?ty=0000000000000000");
assert(tgs.length === t0 + 1 && /just opened their website demo/.test(tgs.at(-1)) && !/not tracked/.test(o.t), "A wrong or missing mark counts as the lead: Ty is alerted as before");

// Receptionist demo: the lead's first real open tags them demo-opened (starts the GHL sequence); Ty's open does not
const TOK = "a".repeat(40);
DB.agent_prospects.push({ id: "p1", business_name: "Harbour Physio", email: "owner@harbour.test", phone: "0400", status: "contacted" });
DB.agent_demos.push({ token: TOK, business_name: "Harbour Physio", prospect_id: "p1", views: 0 });
const seen = async (headers = {}, qs = "") => { await w.fetch(new Request("https://studioflowandsystems.app/api/v1/demo/" + TOK + "/seen" + qs, { method: "POST", headers }), env, ctx); await flush(); };
const tagCalls = () => ghl.filter((x) => /\/contacts\/[^/]+\/tags/.test(x.u) && x.body?.tags?.includes("demo-opened"));
await seen({ Cookie: ck.split(";")[0] });
assert(DB.agent_demos[0].views === 0 && !tagCalls().length, "Ty opening the receptionist demo: no view counted, no tag, no sequence");
await seen();
assert(DB.agent_demos[0].views === 1 && tagCalls().length === 1 && /c_owner/.test(tagCalls()[0].u), "The lead's first open: view counted and tagged demo-opened in GHL (starts the demo email sequence)");

// ── 3. The private mark never reaches a lead ──
DB.team_actions.push({ id: "a1", type: "ghl_followup", department: "head_of_sales", status: "pending", title: "Follow up", params: { send_type: "Email", contact_id: "c9", subject: "Your demo", message: "Here it is: https://studioflowandsystems.app/demo/" + TOK + "/site?ty=" + MARK + " and the report https://studioflowandsystems.app/demo/" + TOK + "/report?ty=" + MARK + "&x=1" } });
await call("/actions/a1/approve", {});
const sentMail = ghl.filter((x) => x.u.includes("/conversations/messages") && x.m === "POST").at(-1);
assert(sentMail && !/ty=/.test(JSON.stringify(sentMail.body)) && /\/report\?(amp;)?x=1|\/report\?x=1/.test(JSON.stringify(sentMail.body)) && !/report\?amp;/.test(JSON.stringify(sentMail.body)), "Anything sent through GHL has the private mark stripped out");

const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/INBOX: Command sees every GHL conversation/.test(src) && /DEMO LINKS: whenever you give Ty a demo link/.test(src), "Command knows about the sweep and to give Ty the ty_ links");
assert(/id="wdMine">My link \(not tracked\)/.test(src), "Website demos page has a 'My link (not tracked)' button");
console.log("seeall-v101 OK");
