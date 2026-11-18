// v141 the AI checks every saved leak report's business type and fixes the wording and estimate to fit.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { agent_prospects: [
  { id: "p1", business_name: "Miles Real Estate", website: "https://milesre.com.au", vertical: "allied", leak_report: { scan_version: 2, vertical: "allied", estimate: { missed_per_month: [4, 8], monthly_aud: [380, 760], value_per: 95, unit: "new patient (first visit)" }, checks: [] } },
  { id: "p2", business_name: "Smile Dental", website: "https://smile.com.au", vertical: "dental", leak_report: { scan_version: 2, vertical: "dental", checks: [] } }], team_settings: [] };
const TG = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase();
  if (u.includes("api.anthropic.com")) return Response.json({ content: [{ type: "text", text: '[{"i":0,"type":"realestate","sure":true},{"i":1,"type":"dental","sure":true}]' }], stop_reason: "end_turn", usage: { input_tokens: 5, output_tokens: 5 } });
  if (u.includes("api.telegram.org")) { TG.push(String(init.body || "")); return Response.json({ ok: true, result: {} }); }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const q = decodeURIComponent(qs);
    if (m === "PATCH" && path === "agent_prospects") { const id = /id=eq\.(\w+)/.exec(q)[1]; Object.assign(DB.agent_prospects.find((r) => r.id === id), JSON.parse(init.body)); return Response.json([]); }
    if (m === "GET" && path === "agent_prospects") return Response.json(DB.agent_prospects);
    return Response.json([]); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O };
const j = await (await w.fetch(new Request(O + "/api/v1/team/leak-tidy", { method: "POST", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: "{}" }), env, { waitUntil() {} })).json();
assert(j.ok && j.checked === 2 && j.changed === 1, "Two reports checked, one fixed: " + JSON.stringify(j.changes));
const p1 = DB.agent_prospects[0];
assert(p1.vertical === "realestate" && p1.leak_report.vertical === "realestate" && p1.leak_report.words_v === 1, "The real estate agency is now real estate");
assert(p1.leak_report.estimate.unit === "new vendor (one listing)" && p1.leak_report.estimate.value_per === 5000, "Its estimate counts vendors at a listing's value, not patients");
assert(DB.agent_prospects[1].vertical === "dental" && DB.agent_prospects[1].leak_report.words_v === 1, "The dental clinic is checked and left alone");
