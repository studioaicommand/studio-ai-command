// v70: a client copy never shows or says what the AI costs to run (AI usage is included in their plan).
// Studio sees cost + margin per client and sets a hidden fair-use cap; at 80% Ty gets a nudge, at 100% background AI pauses.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const now = new Date().toISOString();
const DB = { team_settings: [{ key: "instance", value: { business_name: "Glow Lab Skin Clinic", product_name: "Glow Lab Command", owner_first: "Sarah", industry: "skin clinic", colours: { primary: "#a0766a" }, modules: {} } }],
  team_usage: [{ cost_aud: 30, created_at: now }, { cost_aud: 15, created_at: now }], team_actions: [], sec_settings: [] };
const asks = [], tg = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { const key = (q.match(/key=eq\.([^&]+)/) || [])[1], keys = (q.match(/key=in\.\(([^)]+)\)/) || [])[1]; return Response.json(t.filter((r) => key ? r.key === key : keys ? keys.split(",").includes(r.key) : true)); }
    if (m === "POST") { for (const r of [].concat(body)) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json([].concat(body)); }
    if (m === "PATCH") return Response.json([]); return Response.json([]); }
  if (u.includes("api.anthropic.com")) { asks.push(body); return Response.json({ content: [{ type: "text", text: "Done." }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tg.push(body); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
globalThis.caches = undefined;
const O = "https://glowlab.studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", FLEET_TOKEN: "fleet-secret", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O, TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1" };
const ctx = { waitUntil() {} };
const w = (await import(W)).default;
const call = async (path, b, key = "k") => { const r = await w.fetch(new Request(O + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: b ? JSON.stringify(b) : undefined }), env, ctx); return { s: r.status, j: await r.json().catch(() => ({})) }; };

for (const p of ["/api/v1/team/money", "/api/v1/team/costs?days=30", "/api/v1/team/costs/budget"]) { const x = await call(p); assert(x.s === 404, "Client copy: " + p + " is not available (Studio's own costs and P&L)"); }
let x = await call("/api/v1/team/performance");
assert(!/AI spend/.test(JSON.stringify(x.j.scorecards)) && /overdue invoices/.test(x.j.scorecards.find((c) => c.department === "head_of_finance")?.kpi || ""), "Client copy: agent goals are written for their business (Finance: cash, overdue invoices, costs, not AI spend)");
assert(x.j.ok && x.j.scorecards.every((c) => c.cost_aud == null) && (!x.j.funnel?.ok || (x.j.funnel.cost_aud == null && x.j.funnel.cost_per_booked == null)), "Client copy: Performance data carries no AI cost");
x = await call("/api/v1/fleet/fair-use", { monthly_aud: 50 }, "fleet-secret");
assert(x.s === 200 && x.j.ok && x.j.status.cap_aud === 50 && x.j.status.spend_aud === 45 && x.j.status.pct === 90 && !x.j.status.paused, "Studio sets a hidden fair-use cap on the client's copy (A$45 of A$50 used = 90%)");
x = await call("/api/v1/fleet/fair-use", { monthly_aud: 40 }, "k");
assert(x.s === 404, "The client's own key can't change the cap");
x = await call("/api/v1/fleet/status", null, "fleet-secret");
assert(x.j.fair_use_aud === 50 && x.j.ai_spend_month_aud === 45, "Studio's console reads the cap and this month's AI cost");
await call("/api/v1/fleet/fair-use", { monthly_aud: 40 }, "fleet-secret");
const fu = DB.team_settings.find((r) => r.key === "fair_use_status").value;
assert(fu.paused === true, "Over the cap, background AI work pauses until the 1st");
await call("/api/v1/team/chat", { department: "head_of_finance", message: "How much does the AI cost us?" });
const sys = JSON.stringify(asks.at(-1)?.system || "");
assert(/AI usage is included in their plan/.test(sys) && /never state, estimate or report what the AI/.test(sys), "Every AI on a client copy is told AI usage is included in their plan and never to quote its cost");
const app = await (await w.fetch(new Request(O + "/app/app.js"), env, ctx)).text();
assert(/Included in your plan/.test(app) && /INST_OFF\.add\('money'\)/.test(app) && /data-fl-fair/.test(app), "Client app: AI usage shows as included, Money is hidden; Studio console has the fair-use cap button");
new Function(app);
const src = (await import("node:fs")).readFileSync(W.split("?")[0], "utf8");
assert(/expense_watcher/.test(src) && /async function fleetFairUseWatch/.test(src), "Finance's AI Spend Controller becomes an Expense Watcher on client copies; Studio watches every client's cap");
console.log("fairuse-v70 OK");
