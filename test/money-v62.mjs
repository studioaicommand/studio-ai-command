// v62: monthly profit & loss.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const now = new Date(); const M = now.toISOString().slice(0, 7);
const DB = { team_settings: [], team_usage: [
  { source: "outreach_autopilot", model: "claude-sonnet", calls: 10, cost_aud: 6, enrols: 20, created_at: now.toISOString() },
  { source: "website_demo_build", model: "claude-sonnet", calls: 2, cost_aud: 4, created_at: now.toISOString() },
  { source: "team", model: "claude-sonnet", calls: 5, cost_aud: 5, created_at: now.toISOString() },
  { source: "demo_images", model: "gpt-image-2.5-flare", calls: 3, cost_aud: 0.14, created_at: now.toISOString() },
  { source: "voice_ai", model: "gpt-realtime", calls: 1, cost_aud: 0.86, created_at: now.toISOString() }] };
let adminCalls = 0;
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const q = decodeURIComponent(qs); const key = (q.match(/key=eq\.([^&]+)/) || [])[1]; const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(key ? t.filter((r) => r.key === key) : t);
    if (m === "POST") { for (const r of [].concat(body)) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json([].concat(body)); }
    return Response.json([]); }
  if (u.startsWith("https://api.stripe.com/v1/charges")) return Response.json({ data: [{ id: "ch1", status: "succeeded", paid: true, currency: "aud", amount: 69700, amount_refunded: 0 }, { id: "ch2", status: "succeeded", paid: true, currency: "aud", amount: 49700, amount_refunded: 9700 }, { id: "ch3", status: "failed", paid: false, currency: "aud", amount: 100000 }], has_more: false });
  if (u.startsWith("https://api.anthropic.com/v1/organizations/cost_report")) { adminCalls++; return Response.json({ data: [{ results: [{ amount: "1234.5" }] }, { results: [{ amount: "765.5" }] }], has_more: false }); }
  return new Response("{}", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", STRIPE_READ_KEY: "rk", ANTHROPIC_ADMIN_KEY: "adm", ANTHROPIC_API_KEY: "a" };
const ctx = { waitUntil: () => {} };
const call = async (path, b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, ctx); return r.json(); };
await call("/money", { fixed: [{ name: "GoHighLevel", aud: 150 }, { name: "Cloudflare", aud: 8 }, { name: "", aud: 5 }], fx: 1.5 });
await call("/money", { income: { name: "Matty: receptionist pilot", aud: 150, date: now.toISOString().slice(0, 10) } });
const d = await call("/money?month=" + M);
assert(d.income.stripe === 1097 && d.income.stripe_payments === 2, "Stripe income: paid charges minus refunds (failed ones ignored) = A$1,097");
assert(d.income.manual === 150 && d.income.total === 1247, "Plus money added by hand (Matty A$150) = A$1,247");
assert(d.costs.anthropic.exact && d.costs.anthropic.usd === 20 && d.costs.anthropic.aud === 30, "Claude cost is EXACT from Anthropic's bill (US$20 = A$30 at 1.5)");
assert(!d.costs.openai.exact && d.costs.openai.aud === 1, "OpenAI is estimated without its admin key (A$1)");
assert(d.costs.fixed === 158 && d.costs.fixed_items.length === 2, "Fixed monthly costs (blank names dropped)");
assert(d.costs.total === 189 && d.profit === 1058 && d.margin === 85, "Profit A$1,058 at 85% margin");
const ba = d.costs.by_area;
assert(Math.abs(ba["Outreach & demos"] + ba["Phone & voice"] + ba["Assistant & team"] - 31) < 0.05 && ba["Outreach & demos"] > ba["Assistant & team"], "AI spend is split by area (adds up to the real AI total)");
assert(d.outreach.emails_sent === 20 && d.outreach.per_email > 0, "Outreach cost per email sent");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/PROFIT &amp; LOSS/.test(src) && /moneyCard\(el\)/.test(src), "Shows at the top of Today › Performance");
console.log("v62 money OK");
