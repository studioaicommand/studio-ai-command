// v32: client book API: receptionist clients merged, products saved, upsells, Command checklist.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const now = new Date().toISOString();
const DB = { team_settings: [], agent_clients: [{ id: "c1", business_name: "Pure Life Force", website: "https://purelifeforce.com.au", vertical: "allied", status: "live", plan_monthly: 297, pilot_price: 497, paid_at: now, kb: { clinic_type: "men's coaching", services: [{ name: "coaching program" }] }, checklist: {} }], client_conversations: [], team_audit: [] };
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = init.method || "GET";
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const rows = init.body ? [].concat(JSON.parse(init.body)) : [];
    if (m === "GET") { const k = (qs.match(/key=eq\.([a-z_]+)/) || [])[1]; return Response.json(k ? t.filter((r) => r.key === k) : t); }
    if (path === "team_settings") for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } return Response.json(rows); }
  return Response.json({}); };
const mod = await import(W);
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a" };
const call = async (path, b) => (await mod.default.fetch(new Request("https://x.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} })).json();
let d = await call("/book");
const plf = d.clients.find((c) => c.receptionist_id === "c1");
assert(plf && plf.industry === "coaching" && plf.products[0].id === "chat" && plf.mrr === 297 && plf.setup === 497, "Receptionist client appears automatically with its plan ($297/mo, $497 pilot) and industry");
assert(plf.upsells.some((u) => u.id === "web_voice"), "Sell next for a Chat Receptionist client includes Front Desk");
let r = await call("/book", { client: { name: "LeakStop Shower Repairs", website: "https://leakstop.com.au", industry: "trades", status: "active", products: [{ id: "website_growth", price: 6900 }, { id: "care", price: 149 }, { id: "command_core", price: 1497, setup: 4900 }, { id: "not_a_product", price: 1 }], command: { checks: { agreement: true, crm: true, bogus: true } } } });
assert(r.ok && /^b-/.test(r.id), "New client saved");
d = await call("/book");
const ls = d.clients.find((c) => c.name === "LeakStop Shower Repairs");
assert(ls.products.length === 3 && ls.mrr === 149 + 1497 && ls.setup === 6900 + 4900, "Who bought what: 3 real products, $1,646/mo, $11,800 setup (unknown product ignored)");
assert(ls.has_command && ls.command_done === 2, "Command setup checklist tracked (2 steps done, unknown step ignored)");
assert(ls.upsells.some((u) => u.id === "command_growth") && ls.upsells.some((u) => u.id === "command_whitelabel"), "Sell next for a Command Core client: Growth and white-label");
assert(d.totals.mrr === 297 + 1646 && d.totals.command === 1 && d.totals.receptionists === 1, "Totals: monthly recurring, Command centres, receptionists");
r = await call("/book/delete", { id: ls.id }); d = await call("/book");
assert(r.ok && !d.clients.some((c) => c.name === "LeakStop Shower Repairs"), "Client removed from the book");
r = await call("/book/delete", { id: "rc-c1" }); assert(!r.ok, "Receptionist clients can't be removed from here");
r = await call("/book", { client: { receptionist_id: "c1", name: "Pure Life Force", industry: "coaching", status: "active", deal: "Mate's rate", products: [{ id: "chat", price: 297, status: "cancelled" }, { id: "custom-mat150", title: "CRM + AI receptionist (mate's rate)", price: 150, unit: "month" }, { id: "crm_setup", price: 0 }] } });
d = await call("/book"); const mat = d.clients.find((c) => c.receptionist_id === "c1");
const cu = mat.products.find((p) => p.custom);
assert(!mat.upsells.some((u) => ["chat", "crm_setup"].includes(u.id)) && mat.upsells[0].id === "command_core" && mat.upsells.some((u) => u.id === "web_voice" && u.price === 497), "His bundle counts as receptionist + CRM: next sales are Command Core and Front Desk ($497/mo)");
assert(mat.deal === "Mate's rate" && cu && cu.title === "CRM + AI receptionist (mate's rate)" && cu.unit === "month" && mat.mrr === 150, "Mat's custom bundle: $150/month with deal terms on his card");
r = await call("/book", { client: { name: "Discount Co", products: [{ id: "care", price: 99 }] } }); d = await call("/book");
const dc = d.clients.find((c) => c.name === "Discount Co"); const care = dc.products[0];
assert(care.price === 99 && care.list_price === 149 && d.totals.discount_mrr >= 50, "Special price shows against the price book ($99 vs $149) and totals the discounts");
console.log("All v32 client book tests passed.");
