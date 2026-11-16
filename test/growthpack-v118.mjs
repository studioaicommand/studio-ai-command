// v118 Growth Pack: one page per business, every outreach channel points to it, old demos get one re-approach each.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const O = "https://studioflowandsystems.app";
const T1 = "a".repeat(40), T2 = "b".repeat(40), T3 = "c".repeat(40), T4 = "d".repeat(40), T5 = "e".repeat(40);
const old = new Date(Date.now() - 40 * 864e5).toISOString(), recent = new Date(Date.now() - 3 * 864e5).toISOString();
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }, { key: "wsd:" + T1, value: { name: "Midway Dental Clinic", spec: { s: 1 } } }, { key: "wsd:" + T2, value: { name: "Cold Plumbing", spec: { s: 1 } } }, { key: "wsd_index", value: { items: [{ token: T1, cost_aud: 1.4 }, { token: T2, cost_aud: 1.6 }] } }],
  agent_demos: [
    { token: T1, prospect_id: "p1", business_name: "Midway Dental Clinic", website: "https://midway.test", vertical: "dental", quality: "good", kb: {}, views: 3, chats: 1, created_at: old },
    { token: T2, prospect_id: "p2", business_name: "Cold Plumbing", website: "https://coldplumb.test", vertical: "trades", quality: "good", kb: {}, views: 0, chats: 0, created_at: old },
    { token: T3, prospect_id: "p3", business_name: "Phone Only Physio", website: null, vertical: "allied", quality: "good", kb: {}, views: 0, chats: 0, created_at: old },
    { token: T4, prospect_id: "p4", business_name: "Said No Co", website: "https://no.test", vertical: "trades", quality: "good", kb: {}, created_at: old },
    { token: T5, prospect_id: "p5", business_name: "Just Emailed Co", website: "https://je.test", vertical: "trades", quality: "good", kb: {}, created_at: old }],
  agent_prospects: [
    { id: "p1", business_name: "Midway Dental Clinic", website: "https://midway.test", email: "reception@midway.test", email_source_url: "https://midway.test/contact", status: "sent", vertical: "dental", location: "Sydney", leak: "Sunday hours differ", decision_maker: "Sarah Lee", report_token: "rt1", enrolled_at: old, leak_report: { live_test: { result: "replied", reply_minutes: 1140, summary: "Replied to an enquiry in 19 hours" } }, score: 8 },
    { id: "p2", business_name: "Cold Plumbing", website: "https://coldplumb.test", email: "jobs@coldplumb.test", email_source_url: "https://coldplumb.test", status: "to_send", vertical: "trades", leak: "No after-hours option", leak_report: {}, score: 6 },
    { id: "p3", business_name: "Phone Only Physio", website: null, email: null, phone: "07 3000 0000", status: "nurture", vertical: "allied", leak_report: {}, score: 5 },
    { id: "p4", business_name: "Said No Co", website: "https://no.test", email: "a@no.test", status: "do_not_contact", leak_report: {} },
    { id: "p5", business_name: "Just Emailed Co", website: "https://je.test", email: "a@je.test", email_source_url: "https://je.test", status: "sent", enrolled_at: recent, leak_report: {} }],
  team_actions: [], team_audit: [], team_memory: [],
  team_usage: [{ source: "hunt", cost_aud: 2, prospects: 40, created_at: recent }, { source: "outreach_search", cost_aud: 0.4, created_at: recent }, { source: "demo_build", cost_aud: 0.2, created_at: recent }, { source: "demo_build", cost_aud: 0.3, created_at: recent }, { source: "demo_images", cost_aud: 0.6, created_at: recent }, { source: "growth_pack", cost_aud: 0.04, created_at: recent }] };
let seq = 0; const tg = [], writes = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is|not\.is|gte)\.(.*)$/); if (!m) return true; const val = r[k];
  if (m[1] === "eq") return String(val ?? "") === m[2]; if (m[1] === "neq") return String(val ?? "") !== m[2]; if (m[1] === "in") return m[2].replace(/[()]/g, "").split(",").includes(String(val)); if (m[1] === "is") return val == null; if (m[1] === "not.is") return val != null; if (m[1] === "gte") return String(val || "") >= m[2]; return true; });
const mock = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { let rows = t.filter((r) => match(r, q)); const lim = +(q.match(/limit=(\d+)/) || [])[1]; return Response.json(lim ? rows.slice(0, lim) : rows); }
    if (m === "POST") { const rows = [].concat(body).map((r) => { if (r.key) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; return t[i]; } } const n = { id: "id" + (++seq), created_at: new Date().toISOString(), ...r }; t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("cloudflare-dns.com")) return Response.json({ Status: 0, Answer: [{ type: 15, data: "10 mx.test." }] });
  if (u.includes("api.anthropic.com")) { const sys = JSON.stringify(body.system || "");
    if (sys.includes("ONE short re-approach email")) { writes.push({ sys, msg: body.messages[0].content }); const pack = body.messages[0].content.match(/pack_url: (\S+)/)[1]; return Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name: "save_email", input: { subject: "A few things for you", body: "Hi there,\n\nI put a few things together for you.\n\n" + pack + "\n\nWorth a look?", phone_opener: "Hi, it's Ty from Studio Flow & Systems. I put a few things together for you, where's best to send them?" } }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 10 } }); }
    return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tg.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
Object.defineProperty(globalThis, "fetch", { value: mock, writable: true, configurable: true });
globalThis.caches = undefined;
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1", PUBLIC_ORIGIN: O };
const run = async (req) => { const jobs = []; const r = await w.fetch(req, env, { waitUntil(p) { jobs.push(p); } }); const t = await r.text(); await Promise.all(jobs); return { r, t }; };
const call = async (path, b) => { const { r, t } = await run(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined })); let j = {}; try { j = JSON.parse(t); } catch {} return { s: r.status, j }; };

// The page
let { r, t } = await run(new Request(O + "/demo/" + T1 + "/pack", { headers: { "user-agent": "Mozilla/5.0 (iPhone)" } }));
assert(r.status === 200 && /Sarah, here's what I put together for <span>Midway Dental Clinic/.test(t), "Each business gets one Growth Pack page, addressed to them");
assert(t.includes("/demo/" + T1 + "/report") && t.includes("/demo/" + T1 + "/site") && t.includes('href="' + O + "/demo/" + T1 + '"'), "It links all three: leak report, homepage concept and front desk");
assert(/Replied to an enquiry in 19 hours/.test(t), "The response time check shows when we've run one");
assert(!/AI receptionist|chatbot/i.test(t.replace(/runs on AI, says so if anyone asks/, "")) && /runs on AI, says so if anyone asks/.test(t) && /Book a free 30-minute call/.test(t) && !/\$\d/.test(t), "No 'AI receptionist' pitch and no prices; honest fine print that the front desk runs on AI; one clear call to book");
assert(tg.some((x) => /Midway Dental Clinic just opened their Growth Pack/.test(x)), "Ty is told when they open it");
({ r, t } = await run(new Request(O + "/demo/" + T3 + "/pack")));
assert(r.status === 200 && !t.includes("/demo/" + T3 + "/site") && t.includes('href="' + O + "/demo/" + T3 + '"'), "No homepage concept yet: the pack shows what exists, never a broken link");
({ r } = await run(new Request(O + "/demo/" + "f".repeat(40) + "/pack")));
assert(r.status === 404, "Unknown links show nothing");

// The drip for old demos
tg.length = 0;
let x = await call("/growth-pack/run", {});
const acts = DB.team_actions.filter((a) => a.params?.source === "growth_pack");
assert(x.j.ok && acts.length === 2 && acts.every((a) => a.status === "pending" && a.type === "outreach_email" && a.params.body.includes(a.params.pack_url)), "Old demos with a published email get one Growth Pack email each, waiting for Ty's OK (with their pack link)");
assert(acts[0].params.business_name === "Midway Dental Clinic", "Warmest first: the one that opened and tried their demo comes first");
assert(/emailed them a while back/.test(writes[0].sys) && /they opened it and tried it/.test(writes[0].sys) && /response time check: Replied to an enquiry in 19 hours/.test(writes[0].sys) && /never lead with 'AI'/.test(writes[0].sys) && /Their customers are called patients/.test(writes[0].sys), "Written as an honest re-approach: mentions the earlier contact lightly, uses the response time result, their industry's words, never leads with AI");
const p3 = DB.agent_prospects.find((p) => p.id === "p3");
assert(p3.status === "to_send" && /put a few things together/.test(p3.opener) && p3.leak_report.pack_reengage.channel === "call", "Phone-only businesses go back on the call list with a Growth Pack opener");
assert(!DB.team_actions.some((a) => /Said No Co|Just Emailed Co/.test(a.title)), "Never: do not contact, or anyone emailed in the last 14 days");
assert(tg.some((m) => /Today's Growth Pack emails<\/b> \(2\)/.test(m) && /Midway Dental Clinic/.test(m) && /Phone Only Physio/.test(m) && /Approve all/.test(m)), "Ty gets one Telegram message for the batch, with every email listed and Approve all");
x = await call("/growth-pack/run", {});
assert(DB.team_actions.filter((a) => a.params?.source === "growth_pack").length === 2, "Each business is re-approached once only");

// Cost per pack, from real usage
x = await call("/growth-pack");
const c = x.j.cost;
assert(c && c.currency === "AUD" && c.per_pack.research_and_leak_report === 0.06 && c.per_pack.front_desk_demo === 0.25 && c.per_pack.homepage_concept === 1.5 && c.per_pack.concept_images === 0.3 && c.per_pack.re_approach_email < 0.05 && c.total_per_pack > 2.1 && c.total_per_pack < 2.2, "Cost per Growth Pack comes from real logged usage: research, front desk, homepage concept, images and the email (total A$" + c.total_per_pack + ")");

// New leads get the new style
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/PACK-FIRST \(when the business has pack_url\)/.test(src) && !/(DEMO|SITE)-FIRST \(when/.test(src) && /pack_url: plink \|\| void 0/.test(src), "New leads: the email writer leads with their Growth Pack, the old demo-first and site-first scripts are gone");
assert(/aim for a 15-minute call or permission to send their Growth Pack/.test(src) && /"\\npack_url: " \+ \(packUrl/.test(src), "DM replies send their Growth Pack when they say yes");
assert(/subject: "What I put together for "/.test(src) && !/Your AI receptionist demo for/.test(src) && /I put a few things together for \$\{r\.business_name\}/.test(src), "Call follow-up email and phone opener use the Growth Pack");
assert(/\["Growth Pack re-approach", out\(ai\(\(\) => packReengage\(e\)\)\)/.test(src) && /fn\("growth_pack"/.test(src) && /v: 118, studio_only: true, title: "Growth Pack outreach", retire:/.test(src), "Runs every weekday on its own, Command can run or report it, and the team is taught the new way (old receptionist-first rules retired)");
console.log("growthpack-v118 OK");
