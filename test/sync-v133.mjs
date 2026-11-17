// v133: Command matches the website, Google profile and pricing guide (17 Nov 2026).
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [], team_memory: [] }; let seq = 0; const ghl = [], asks = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^eq\.(.*)$/); return !m || String(r[k] ?? "") === m[1]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: r.id || "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; continue; } } t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); }
    if (m === "DELETE") { const keep = t.filter((r) => !match(r, decodeURIComponent(qs))); DB[path] = keep; return Response.json([]); }
    return Response.json([]); }
  if (u.includes("challenges.cloudflare.com")) return Response.json({ success: true, hostname: "www.studioflowandsystems.com", action: "studio_site" });
  if (u.includes("services.leadconnectorhq.com")) { const p = u.split(".com")[1]; ghl.push({ m, p, body }); if (p === "/contacts/upsert") return Response.json({ contact: { id: "c1" } }); return Response.json({ ok: true, messageId: "m1" }); }
  if (u.includes("api.anthropic.com")) { asks.push(body); return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) return Response.json({ ok: true, result: { message_id: 1 } });
  return Response.json({}); };
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", TURNSTILE_SECRET_KEY: "t", TELEGRAM_BOT_TOKEN: "b", PUBLIC_ORIGIN: O };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const call = async (path, b) => { const r = await w.fetch(new Request(O + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, ctx); return { s: r.status, j: await r.json().catch(() => ({})) }; };
DB.team_settings.push({ key: "telegram", value: { chat_id: 1 } });
// 1) free calculator result is the Leak Snapshot
const inputs = { job_value: 250, missed_calls_week: 10, enquiries_week: 20, reply_speed: "day", no_shows_month: 6, quotes_unfollowed_month: 8, unpaid_month: 3000 };
let r = await w.fetch(new Request(O + "/api/v1/leak", { method: "POST", headers: { Origin: "https://www.studioflowandsystems.com", "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" }, body: JSON.stringify({ inputs, name: "Sarah King", email: "sarah@clinic.com.au", business: "Smile Co", industry: "Dental", consent: true, turnstile: "x" }) }), env, ctx);
let j = await r.json(); await flush();
const mail = ghl.find((x) => x.p === "/conversations/messages");
assert(mail && /^Your Leak Snapshot: about/.test(mail.body.subject) && /free Leak Snapshot/.test(mail.body.html || mail.body.message || "") , "The calculator email is the Leak Snapshot (subject and body)");
r = await w.fetch(new Request(j.report_url), env, ctx); const page = await r.text();
assert(/<title>Leak Snapshot/.test(page) && /Leak Snapshot ·/.test(page) && !/Full Leak Report|2-hour Business Audit/.test(page) && /Leak Report &amp; Systems Audit \(\$497\)|Leak Report & Systems Audit \(\$497\)/.test(page), "The hosted page says Leak Snapshot and points to the paid Leak Report & Systems Audit");
// 2) the team's knowledge
let x = await call("/api/v1/team/chat", { department: "head_of_sales", message: "What do we sell?" });
const sys = JSON.stringify(asks.at(-1)?.system || "");
assert(/ONLY from ty@outreach\.studioflowandsystems\.com/.test(sys) && /NEVER send cold email from mail\.studioflowandsystems\.com/.test(sys), "Sales knows cold outreach is only from ty@outreach, never from mail.");
assert(/Founding offer for our first 3 businesses: \$997\/month for 12 months, \$2,900 setup/.test(sys) && /Custom Backend Build/.test(sys) && /White-Label Command/.test(sys) && /coaches and agencies/.test(sys), "Founding wording, product names and who we serve are in the team's knowledge");
assert(/NEVER quote prices in cold outreach/.test(sys) && !/first 5 clients/.test(sys) && !/Health clinics are the focus/.test(sys), "Never prices in cold outreach; no clinic-only focus");
// 3) offers page names match the Google profile
x = await call("/api/v1/team/offers");
const titles = JSON.stringify(x.j);
for (const t of ["Phone AI Receptionist", "Website Care Plan", "SEO & AI Visibility", "CRM Setup", "Automation Build", "Custom Backend Build", "White-Label Command", "Founding Command Offer"]) assert(titles.includes(t), "Offer card named " + t);
// 4) Update Announcer cleans old saved wording
DB.team_memory.push({ id: "m1", category: "rule", fact: "Send outreach emails from hello@mail.studioflowandsystems.com", created_at: "2026-11-01T00:00:00Z" }, { id: "m2", category: "offer", fact: "Chat Receptionist is $297 a month", created_at: "2026-11-01T00:00:00Z" }, { id: "m3", category: "business", fact: "Ty's partner runs Moonmane", created_at: "2026-11-01T00:00:00Z" });
DB.team_settings.push({ key: "charter", value: "STUDIO AI CHARTER (owner: Ty Brazel)\nOutreach emails go out from hello@mail.studioflowandsystems.com to clinics. Our receptionist replies in 4 seconds. " + "x".repeat(300) });
DB.team_settings.push({ key: "team_rules", value: { rules: [{ id: "r1", rule: "Mention the Chat Receptionist at $297 a month", applies_to: ["all"], source: "feedback" }, { id: "r2", rule: "Keep replies short", applies_to: ["all"], source: "feedback" }] } });
x = await call("/api/v1/team/release-announce", {});
const mem = DB.team_memory.map((m) => m.id), rules = DB.team_settings.find((s) => s.key === "team_rules").value.rules, charter = DB.team_settings.find((s) => s.key === "charter").value;
assert(!mem.includes("m1") && !mem.includes("m2") && mem.includes("m3"), "Old memory (hello@mail for outreach, $297 Chat Receptionist) is retired; unrelated memory stays");
assert(!rules.some((r) => /Chat Receptionist/.test(r.rule)) && rules.some((r) => r.rule === "Keep replies short") && rules.some((r) => /ty@outreach/.test(r.rule) && r.release === 133), "Old rules retired, new v133 rules taught, Ty's other rules kept");
assert(/from ty@outreach\.studioflowandsystems\.com/.test(charter) && /replies in seconds/.test(charter) && !/4 seconds/.test(charter), "Saved charter: outreach sender and 'in seconds' fixed");
console.log("\nsync-v133 passed");
