// v36: multi-industry outreach. Ty switches industries on/off; hunts target the furthest-behind switched-on industry
// with that industry's fit rules; trades businesses are no longer thrown out as "not a clinic".
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], agent_prospects: [
  { id: "p1", business_name: "Allied A", vertical: "allied", website: "a.com.au", created_at: new Date().toISOString() },
  { id: "p2", business_name: "Allied B", vertical: "allied", website: "b.com.au", created_at: new Date().toISOString() }], team_actions: [], team_audit: [] };
let lastAI = null, aiReply = null;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in)\.(.*)$/); if (!m) return true; return m[1] === "eq" ? String(r[k]) === m[2] : m[1] === "neq" ? String(r[k]) !== m[2] : m[2].replace(/[()]/g, "").split(",").includes(String(r[k])); });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = init.method || "GET"; const body = init.body ? JSON.parse(init.body) : undefined;
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, qs)));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + Math.random().toString(36).slice(2, 8), ...r })); if (path === "team_settings") for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(...rows); return Response.json(rows); }
    if (m === "PATCH") return Response.json([]); return Response.json([]); }
  if (u.includes("api.anthropic.com")) { lastAI = JSON.parse(init.body); return Response.json({ content: [{ type: "tool_use", id: "t1", name: "submit_candidates", input: { clinics: aiReply } }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 10 } }); }
  return Response.json({ ok: true }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t" };
const call = async (path, b) => (await w.fetch(new Request("https://x.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} })).json();
let s = await call("/settings");
assert(!s.settings.outreach, "Default: no saved choice (allied, dental, aesthetics, property, trades, coaching, multi-location are on)");
aiReply = [{ business_name: "Brisbane Plumbing Co", website: "https://brisplumbing.com.au", vertical: "trades", location: "Brisbane", phone: "07 3000 0000", google_reviews: 210 }, { business_name: "Sparky Bros Electrical", website: "sparkybros.com.au", vertical: "trades" }, { business_name: "Some Directory", website: "", vertical: "trades" }];
let r = await call("/hunt/start", { vertical: "trades", city: "Brisbane", count: 5 });
assert(r.ok && r.hunt.vertical === "trades" && r.hunt.candidates.length === 2, "Trades hunt keeps the plumber and electrician (used to be thrown out as 'not a clinic')");
const prompt = JSON.stringify(lastAI.messages[0].content);
assert(/plumbing, electrical/.test(prompt) && /5\+ staff or vans/.test(prompt) && /sole traders/.test(prompt) && /Trades & services/.test(lastAI.system), "Search prompt uses the trades fit rules and skip list");
r = await call("/settings", { outreach: { on: ["coaching"] } });
s = await call("/settings");
assert(JSON.stringify(s.settings.outreach.on) === '["coaching"]', "Ty switches Sales to coaches & consultants only");
aiReply = [{ business_name: "Peak Performance Coaching", website: "peakcoach.com.au", vertical: "coaching" }];
r = await call("/hunt/start", { city: "Gold Coast" });
assert(r.hunt.vertical === "coaching" && /discovery-call funnel/.test(JSON.stringify(lastAI.messages[0].content)), "Automatic hunt picks a switched-on industry (coaching) with its own fit rules");
r = await call("/settings", { outreach: { on: [] } });
assert(r.ok === false && /at least one/.test(r.error), "Can't switch every industry off");
r = await call("/settings", { outreach: { on: ["trades", "multi", "nonsense"], targets: { trades: 50 } } });
s = await call("/settings");
assert(JSON.stringify(s.settings.outreach.on) === '["trades","multi"]' && s.settings.campaign.targets.trades === 50, "Unknown industries ignored; targets can be changed");
const snap = await call("/snapshot");
const tg = (snap.week || {}).targets || {};
assert(tg.trades && tg.multi && !tg.allied, "This week's targets only show the switched-on industries");
const app = await (await w.fetch(new Request("https://x.app/app/app.js"), env, { waitUntil() {} })).text();
try { new Function(app); console.log("✓ Command app script parses"); } catch (e) { console.error("FAIL: app.js", e.message); process.exit(1); }
assert(/Industries Sales hunts/.test(app) && /Run prospect hunt/.test(app) && /"coaching", "Coaches & consultants"/.test(app), "Growth shows industry switches and the hunt covers every industry");
console.log("All v36 outreach tests passed.");
