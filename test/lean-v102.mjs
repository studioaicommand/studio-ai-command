// v102 AI cost saver: more caching, Haiku for internal reports, lean schedule until revenue, daily background cap.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const NOW = Date.parse("2026-11-16T00:00:00Z"); const RealDate = Date; // Mon 10am Brisbane
globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
const DB = { team_settings: [], team_actions: [], team_audit: [], team_usage: [], team_reports: [], studio_command_jobs: [] };
let seq = 0;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|gte)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "gte") return val >= m[2]; return true; });
const claude = []; let charges = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: r.id || "id" + (++seq), created_at: new RealDate(NOW).toISOString(), ...r })); for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : t.findIndex((x) => x.id === r.id); if (i >= 0) t[i] = { ...t[i], ...r }; else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.stripe.com")) { if (u.includes("/v1/charges")) return Response.json({ data: charges, has_more: false }); return Response.json({ data: [], has_more: false }); }
  if (u.includes("api.anthropic.com/v1/messages")) { claude.push(body);
    const n = claude.length;
    if (n % 2 === 1) return Response.json({ id: "m" + n, model: body.model, stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu" + n, name: "no_such_tool", input: {} }], usage: { input_tokens: 1000, output_tokens: 10 } });
    return Response.json({ id: "m" + n, model: body.model, stop_reason: "end_turn", content: [{ type: "text", text: "Report: all good." }], usage: { input_tokens: 1000, output_tokens: 50 } }); }
  if (u.includes("api.telegram.org")) return Response.json({ ok: true, result: { message_id: 1 } });
  return Response.json({}); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", STRIPE_SECRET_KEY: "sk" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const call = async (path, b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, ctx); await flush(); return { s: r.status, j: await r.json().catch(() => ({})) }; };

let r = await call("/lean");
assert(r.j.ok && r.j.lean === true && r.j.revenue_30d === 0 && r.j.bg_cap_usd === 3, "No revenue in Stripe for 30 days: lean mode is on, background cap US$3: " + JSON.stringify({ lean: r.j.lean, cap: r.j.bg_cap_usd }));
assert(r.j.held === false && r.j.spent === 0, "Nothing spent yet today, so background work runs");

// Internal report runs on Haiku, and the growing conversation is cached
r = await call("/shifts/marketing_review/run", {});
const runs = claude.filter((b) => Array.isArray(b.messages));
assert(runs.length >= 2 && runs.every((b) => /haiku/.test(b.model)), "Funnel review (internal) runs on Haiku: " + runs.map((b) => b.model).join(","));
const second = runs[1];
const lastMsg = second.messages.at(-1);
const marks = (JSON.stringify(second).match(/"cache_control"/g) || []).length;
assert(Array.isArray(lastMsg.content) && lastMsg.content.at(-1).cache_control && marks <= 4, "Step 2 of the run caches the conversation so far (" + marks + " cache points, never more than 4)");
assert(Array.isArray(second.system) && second.system.at(-1).cache_control, "The team's memory block is cached too, not just the fixed instructions");
assert(!JSON.stringify(runs[0].messages.at(-1)).includes("cache_control"), "A one-message call isn't charged a cache write it would never reuse");

// A customer-facing shift stays on Sonnet
claude.length = 0;
r = await call("/shifts/sales_am/run", {});
assert(claude.length && claude.every((b) => /sonnet/.test(b.model)), "Morning sales sweep (writes to leads) stays on Sonnet");

// Lean schedule
const mod = await import(W);
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/LEAN_SKIP_SHIFTS = new Set\(\["prospect_hunt_pm", "prospect_hunt_eve"\]\)/.test(src), "While lean: only the morning prospect hunt runs (afternoon and evening hunts skipped)");

// Daily cap
DB.team_usage.push({ id: "u1", created_at: new RealDate(NOW - 36e5).toISOString(), cost_usd: 3.4, source: "prospect_hunt" });
r = await call("/lean");
assert(r.j.held === true && r.j.spent >= 3.4, "After US$3 of AI today, background work pauses until tomorrow: spent " + r.j.spent);
r = await call("/lean", { mode: "off" });
assert(r.j.lean === false && r.j.bg_cap_usd === 12 && r.j.held === false, "Lean mode off: normal schedule, cap back to US$12");
r = await call("/lean", { mode: "auto", bg_cap_usd: 5 });
assert(r.j.bg_cap_usd === 5 && r.j.lean === true, "Ty can set his own daily cap");

// Revenue lands: lean switches itself off
charges = [{ id: "ch1", paid: true, status: "succeeded", amount: 49700, amount_refunded: 0, currency: "aud" }];
DB.team_settings.find((x) => x.key === "ai_lean").value.checked = null;
r = await call("/lean");
assert(r.j.lean === false && r.j.revenue_30d > 0, "As soon as Stripe shows money coming in, lean mode switches off by itself");
assert(/AI COSTS: until money is coming in/.test(src), "Command can explain the lean rules");
console.log("lean-v102 OK");
