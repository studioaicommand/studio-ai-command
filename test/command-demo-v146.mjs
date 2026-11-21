// v146 /command-demo: a made-up clinic's Command with sample data, all answered in the browser. Plus client copies get
// the new Home hero on Overview with client numbers (bookings, answered for you), and client-friendly chat suggestions.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [], team_actions: [] }; let seq = 0;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { let m; if ((m = v.match(/^eq\.(.*)$/))) return String(r[k] ?? "") === m[1]; if (v === "is.true") return r[k] === true; if ((m = v.match(/^gte\.(.*)$/))) return String(r[k] || "") >= m[1]; return true; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = JSON.parse(init.body); } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body || []).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json(rows); }
    return Response.json([]); }
  return Response.json({ ok: true }); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O };
const get = (p, h = {}) => w.fetch(new Request(O + p, { headers: h }), env, { waitUntil() {} });
let r = await get("/command-demo");
const html = await r.text();
assert(r.status === 200 && html.includes('/app/demo.js?v=') && html.indexOf("/app/demo.js") < html.indexOf("/app/app.js"), "The demo page loads the demo data before the app");
assert(/Harbour Command/.test(html), "It's titled as the demo clinic's Command");
r = await get("/app/demo.js");
const js = await r.text();
assert(r.status === 200 && js.includes("window.SF_DEMO_FIX") && js.includes("Harbour Physio"), "The demo data is served as a script");
const fix = JSON.parse(js.slice(js.indexOf("=") + 1, js.indexOf(";\n")));
for (const k of ["/api/v1/instance/brand", "/api/v1/operator/overview", "/api/v1/team/ceo-home", "/api/v1/team/actions?status=pending", "/api/v1/team/phone/calls?days=14", "/api/v1/team/reports/rep1"]) assert(fix.data[k], "Demo screen has data: " + k);
assert(fix.data["/api/v1/instance/brand"].custom === true && fix.data["/api/v1/team/ceo-home"].client === true, "The demo is a client copy, not Studio's");
assert(!/localhost/.test(js) && !/\bTy\b/.test(JSON.stringify(fix.data["/api/v1/team/ceo-home"])), "No test addresses or Studio's owner in the demo data");
assert(js.includes("operator\\/voice") && js.includes("Nothing you click is sent"), "Voice and sending are blocked in the demo, with a clear banner");
assert(Object.keys(fix.chat).length >= 6, "Studio AI has answers for every suggestion chip");

// Client copies: no demo page, and the new Home works with client numbers
DB.team_actions.push({ id: "x1", type: "inbox_reply", auto: true, status: "executed", created_at: new Date().toISOString() }, { id: "x2", type: "book_appointment", auto: true, status: "executed", created_at: new Date().toISOString() });
const O2 = "https://baydental.studioflowandsystems.app", env2 = { ...env, PUBLIC_ORIGIN: O2 };
await w.fetch(new Request(O2 + "/api/v1/team/instance", { method: "POST", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: JSON.stringify({ business_name: "Bay Dental", product_name: "Bay Command", owner_name: "Lee Tran", owner_first: "Lee", industry: "dental clinic", template: "dental" }) }), env2, { waitUntil() {} }).then((x) => x.text()).then((t) => { if (!/"ok":true/.test(t)) console.log("instance:", t.slice(0, 200)); });
const get2 = (p, h = {}) => w.fetch(new Request(O2 + p, { headers: h }), env2, { waitUntil() {} });
r = await get2("/command-demo");
assert(r.status === 404, "A client's own Command doesn't serve the demo");
const ch = await (await get2("/api/v1/team/ceo-home", { Authorization: "Bearer k" })).json();
assert(ch.client === true && ch.warm.label === "ANSWERED FOR YOU" && ch.warm.total === 2, "A client's Home counts enquiries the AI handled");
assert(ch.calls && ch.calls.label === "bookings" && ch.calls.booked === 1 && ch.pipeline === null, "A client's Home shows bookings, not Studio's sales pipeline");
assert(ch.team.leads.map((x) => x.team).join(",") === "Command,Front desk & sales,Customers", "A client's team shows Command, Front desk & sales, Customers");
const app = await (await get("/app/app.js")).text();
assert(app.includes("Who enquired this week and did they book?") && app.includes("VIEWS.home = async"), "Client copies get their own chat suggestions and the new Home on Overview");
