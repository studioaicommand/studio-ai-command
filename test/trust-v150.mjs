// v150 Trust pack: privacy policy wording for automated decisions (from 10 Dec 2026), written from what this Command
// actually does, plus one-click export of everything Command stores (never logins or keys), owner only.
import { readFileSync } from "node:fs";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [], team_actions: [], studio_command_records: [], team_audit: [], team_memory: [], team_usage: [], agent_prospects: [] }; let seq = 0;
const val = (r, k) => r[k] == null ? "" : String(r[k]);
const one = (r, part) => { const i = part.indexOf("="); if (i < 0) return true; const k = part.slice(0, i), v = part.slice(i + 1); if (["select", "limit", "order", "offset", "on_conflict"].includes(k)) return true; let m;
  if ((m = v.match(/^eq\.(.*)$/))) return val(r, k) === m[1]; if ((m = v.match(/^gte\.(.*)$/))) return val(r, k) >= m[1]; if ((m = v.match(/^lt\.(.*)$/))) return val(r, k) < m[1];
  if ((m = v.match(/^in\.\((.*)\)$/))) return m[1].split(",").includes(val(r, k)); if ((m = v.match(/^like\.(.*)$/))) return new RegExp("^" + m[1].replace(/\*/g, ".*") + "$").test(val(r, k)); return true; };
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = JSON.parse(init.body); } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const parts = decodeURIComponent(qs).split("&"); const ok = (r) => parts.every((p) => one(r, p));
    if (m === "GET") return Response.json(t.filter(ok));
    if (m === "POST") { const rows = [].concat(body || []).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const hit = t.filter(ok); for (const r of hit) Object.assign(r, body); return Response.json(hit); }
    return Response.json([]); }
  return Response.json({ ok: true }); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const base = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a" };
const at = (o) => async (path, b) => { const r = await w.fetch(new Request(o + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), { ...base, PUBLIC_ORIGIN: o }, { waitUntil() {} }); return { s: r.status, j: await r.json().catch(() => ({})) }; };

// ── Studio's own Command first (instance info is cached per worker) ──
const s = at("https://studioflowandsystems.app");
DB.agent_prospects.push({ id: "p1", business_name: "Bay Dental", created_at: new Date().toISOString() });
DB.team_usage.push({ id: "u1", cost_aud: 3, created_at: new Date().toISOString() });
let x = await s("/api/v1/team/trust/adm"), A = x.j;
assert(A.ok && /finding the owner's name from public sources/.test(A.markdown) && /A person decides who is contacted/.test(A.markdown), "Studio's wording covers outreach: finding businesses and owners, with a person deciding who's contacted");
assert(!/health information/i.test(A.markdown), "No health line for Studio");
x = await s("/api/v1/team/trust");
assert(x.j.tables.some((t) => t.table === "agent_prospects"), "Studio's export includes its outreach prospects");
DB.team_settings.length = 0; DB.agent_prospects.length = 0;

// ── A physio clinic's Command ──
const c = at("https://harbour.studioflowandsystems.app");
x = await c("/api/v1/team/instance", { business_name: "Harbour Physio", product_name: "Harbour Command", owner_name: "Sam Lee", owner_first: "Sam", industry: "physio", template: "allied_health" });
assert(x.j.ok, "Client copy set up as a physio clinic");
x = await c("/api/v1/team/trust/adm"); A = x.j;
assert(A.ok && A.starts === "2026-12-10" && /## Automated decisions and AI/.test(A.markdown), "Privacy wording is ready, for the rules starting 10 December 2026");
assert(/health information you choose to share/i.test(A.markdown) && /doesn't diagnose, give medical advice or decide your treatment/.test(A.markdown) && A.health, "Health businesses get the health information line and 'the AI doesn't diagnose'");
assert(!/Decisions our AI makes on its own/.test(A.markdown) && /which a staff member checks before they're sent/.test(A.markdown), "With replies on 'approve', nothing is listed as decided by the AI alone");
assert(/\[your email or phone number\]/.test(A.markdown) && !/outreach|owner's name/i.test(A.markdown), "Asks for a contact, and clients don't get Studio's outreach lines");

// Switch Instagram and website chat to automatic, follow-ups automatic, and a Phone AI call on record
DB.team_settings.push({ key: "inbox", value: { sms: "approve", ig: "auto", fb: "off", chat: "auto", followup: "auto", reviews: "approve" } });
DB.studio_command_records.push({ id: "r1", source: "call", external_key: "voiceai:1", occurred_at: new Date().toISOString(), metadata: { who: "Priya", booked: true }, created_at: new Date().toISOString() });
x = await c("/api/v1/team/trust/adm", { contact: "hello@harbourphysio.com.au <script>" }); A = x.j;
assert(/Replying to enquiries sent by Instagram and our website chat/.test(A.markdown) && /without a staff member checking each reply first/.test(A.markdown), "Channels on automatic are listed as decided by the AI alone");
assert(/Answering phone calls, deciding whether a call is urgent/.test(A.markdown) && /recordings, transcripts and summaries of phone calls/i.test(A.markdown), "The Phone AI and call recordings are disclosed");
assert(/Sending a follow-up message/.test(A.markdown) && /Offering available appointment times and booking/.test(A.markdown) && /text message, which a staff member checks/.test(A.markdown), "Follow-ups and booking are listed, and SMS stays with a person");
assert(/Contact us at hello@harbourphysio.com.au script\./.test(A.markdown) && A.contact === "hello@harbourphysio.com.au script", "The privacy contact is saved (no HTML) and used next time");
assert(A.based_on.some((b) => /Phone AI/.test(b)) && /isn't legal advice/.test(A.note), "Shows what it was based on and says it isn't legal advice");

// Export
DB.team_memory.push({ id: "m1", category: "offer", fact: "Initial consult $95", created_at: new Date().toISOString() });
DB.team_settings.push({ key: "members", value: { list: [{ name: "Ellie", pin_hash: "x" }] } }, { key: "ghl_token", value: { token: "secret-123" } });
x = await c("/api/v1/team/trust");
assert(x.j.ok && x.j.tables.some((t) => t.table === "team_memory" && t.rows === 1) && !x.j.tables.some((t) => t.table === "team_usage" || t.table === "agent_prospects"), "Clients see what Command stores, without Studio's usage or outreach tables");
x = await c("/api/v1/team/trust/export");
const all = JSON.parse(x.j.content);
assert(x.j.ok && /harbour-physio-command-export-\d{4}-\d{2}-\d{2}\.json/.test(x.j.filename) && all.tables.team_memory.rows[0].fact === "Initial consult $95" && all.settings.inbox.ig === "auto", "Download everything gives one JSON file with every table and the business settings");
assert(!/secret-123|pin_hash/.test(x.j.content) && !all.settings.members && !all.settings.ghl_token && !all.tables.team_usage, "Logins, PINs, tokens and Studio's costs are never in the download");
x = await c("/api/v1/team/trust/export?format=csv&table=studio_command_records");
assert(x.j.ok && x.j.mime === "text/csv" && /^.*external_key.*\r\n/.test(x.j.content) && /"\{""who"":""Priya""/.test(x.j.content), "Each table downloads as CSV that opens in a spreadsheet");
x = await c("/api/v1/team/trust/export?table=team_settings");
assert(x.s === 400, "Raw settings (where logins live) can't be downloaded as a table");
assert(DB.team_audit.filter((a) => a.action === "data_export").length === 2, "Every download is written to History");

const src = readFileSync(W, "utf8");
assert(/\|value\|trust\)\(\\\/\|\$\)\//.test(src) && /value_report\|privacy_wording\/i/.test(src), "Staff and managers can't export data or use the privacy tool");
assert(/"value_report",\s*"privacy_wording"/.test(src) && /"value_report", "privacy_wording",/.test(src), "Studio AI can write the privacy wording when asked");
const app = await (await w.fetch(new Request("https://studioflowandsystems.app/app/app.js"), base, { waitUntil() {} })).text();
assert(app.includes("VIEWS.trust = async") && app.includes('["trust", "Privacy & data"]') && app.includes("YOUR DATA IS YOURS"), "Settings has a Privacy & data screen");
const demo = await (await w.fetch(new Request("https://studioflowandsystems.app/app/demo.js"), base, { waitUntil() {} })).text();
assert(demo.includes("/api/v1/team/trust/adm") && demo.includes("/api/v1/team/trust/export"), "The demo clinic shows Privacy & data with sample wording and a sample download");
