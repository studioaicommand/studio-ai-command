// (v62 copy of the v33 harness) v33: Money: P&L, per-client profit, drafting + sending branded GHL invoices, monthly autopilot.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const now = new Date().toISOString();
let seq = 0;
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], agent_clients: [{ id: "c1", business_name: "Pure Life Force", website: "https://purelifeforce.com.au", vertical: "coaching", status: "live", plan_monthly: 297, pilot_price: 497, paid_at: now, kb: {}, checklist: {} }], client_conversations: [{ client_id: "c1", cost_aud: 3.5, last_at: now, preview: false }], team_actions: [], team_audit: [] };
const ghl = []; const tg = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|gte)\.(.*)$/); if (!m) return true; const val = k.includes("->>") ? (r[k.split("->>")[0]] || {})[k.split("->>")[1]] : r[k]; return m[1] === "eq" ? String(val) === m[2] : m[1] === "neq" ? String(val) !== m[2] : String(val) >= m[2]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); if (u.startsWith("https://api.anthropic.com/v1/organizations/cost_report")) return Response.json({ data: [{ results: [{ amount: "1500" }] }, { results: [{ amount: "500" }] }], has_more: false }); const m = init.method || "GET"; const body = init.body ? JSON.parse(init.body) : undefined;
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, qs)));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); if (path === "team_settings") for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(...rows); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, qs)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("leadconnectorhq.com")) { ghl.push({ m, u, body, v: init.headers?.Version });
    if (u.includes("/invoices/text2pay")) return Response.json({ invoice: { _id: "inv1", invoiceNumber: 1001, total: body.items.reduce((s, i) => s + i.amount, 0) }, invoiceUrl: "https://pay.example/inv1" });
    if (u.includes("/invoices/?")) return Response.json({ invoices: [{ _id: "old", invoiceNumber: 1000, name: "Website deposit", contactDetails: { name: "LeakStop", email: "owner@leakstop.com.au" }, total: 3450, amountPaid: 3450, amountDue: 0, status: "paid", issueDate: now, updatedAt: now }, { _id: "late", invoiceNumber: 999, contactDetails: { name: "Slow Co", email: "a@slow.co" }, total: 500, amountPaid: 0, amountDue: 500, status: "sent", dueDate: "2026-01-01", issueDate: "2026-01-01" }] });
    if (u.includes("/contacts/search/duplicate")) return Response.json({ contact: null });
    if (u.includes("/contacts/upsert")) return Response.json({ contact: { id: "ct9", email: body.email } });
    if (u.includes("/users/")) return Response.json({ users: [{ id: "u1", roles: { role: "admin" } }] });
    return Response.json({}); }
  if (u.includes("api.telegram.org")) { tg.push(body); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
const mod = await import(W);
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", TELEGRAM_BOT_TOKEN: "t", ANTHROPIC_ADMIN_KEY: "adm", AUD_PER_USD: "1.5" };
const call = async (path, b) => (await mod.default.fetch(new Request("https://x.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} })).json();
await call("/book", { client: { receptionist_id: "c1", name: "Pure Life Force", industry: "coaching", deal: "Mate's rate", billing_email: "Mat@PureLifeForce.com.au", products: [{ id: "custom-mat150", title: "CRM + AI receptionist (mate's rate)", price: 150, unit: "month" }] } });
await call("/book", { client: { name: "LeakStop Shower Repairs", industry: "trades", billing_email: "owner@leakstop.com.au", products: [{ id: "care", price: 149 }, { id: "seo", price: 690 }, { id: "website_growth", price: 6900 }] } });
await call("/book", { client: { name: "No Email Co", products: [{ id: "care", price: 149 }] } });
await call("/money/settings", { costs: [{ name: "GoHighLevel agency", amount: 800, every: "month" }, { name: "Domains", amount: 120, every: "year" }], gst: true, tax_pct: 25 });
DB.team_usage = [{ source: "outreach_autopilot", model: "claude-sonnet", cost_aud: 6, enrols: 20, created_at: new Date().toISOString() }, { source: "team", model: "claude-sonnet", cost_aud: 4, created_at: new Date().toISOString() }];
let d = await call("/money");
const s = d.summary;
assert(s.ai && s.ai.anthropic.exact && s.ai.anthropic.usd === 20 && s.ai.anthropic.aud === 30, "Money page: Claude cost is EXACT from Anthropic's bill (US$20 = A$30)");
assert(s.ai_cost === 30 + s.ai.openai.aud, "All AI spend counts (outreach, team, receptionists), not just client receptionists");
const basis = s.basis === "paid" ? s.paid : s.expected;
assert(Math.abs(s.profit - (basis - s.gst - s.fixed - s.ai_cost)) < 0.01, "Profit takes off ALL AI spend");
assert(s.ai.by_area["Outreach & demos"] > s.ai.by_area["Assistant & team"] && s.ai.outreach.emails_sent === 20 && s.ai.outreach.per_email > 0, "Spend by area, and outreach cost per email sent");
console.log("v62 money OK");
