// v76 Leak Scanner: read-only inside scan of the business's own GHL + Stripe, a report with a score, Leak Watch monthly.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const now = Date.now(), ago = (h) => new Date(now - h * 36e5).toISOString();
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }], team_reports: [], team_audit: [] };
const writes = [], tg = [];
const CONVS = { conversations: [{ id: "c1", lastMessageDate: now - 2 * 36e5 }, { id: "c2", lastMessageDate: now - 30 * 36e5 }, { id: "c3", lastMessageDate: now - 50 * 36e5 }, { id: "old", lastMessageDate: now - 60 * 864e5 }] };
const MSGS = {
  c1: [{ direction: "inbound", body: "Hi can I book?", dateAdded: ago(5) }, { direction: "outbound", body: "Sure!", dateAdded: ago(2) }],
  c2: [{ direction: "inbound", body: "Price for a facial?", dateAdded: ago(30) }],
  c3: [{ direction: "inbound", body: "Open Sunday?", dateAdded: ago(52) }, { direction: "outbound", body: "Yes", dateAdded: ago(51.9) }, { direction: "inbound", body: "Great, thanks", dateAdded: ago(50) }]
};
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { const key = (q.match(/key=eq\.([^&]+)/) || [])[1]; return Response.json(key ? t.filter((r) => r.key === key) : t); }
    if (m === "POST") { for (const r of [].concat(body)) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push({ id: "r" + t.length, ...r }); } return Response.json([].concat(body).map((r) => ({ id: "rep1", ...r }))); }
    return Response.json([]); }
  if (u.includes("api.telegram.org")) { tg.push(body); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("leadconnectorhq.com")) { if (m !== "GET" && !u.includes("/search")) writes.push(m + " " + u);
    if (u.includes("/conversations/search")) return Response.json(CONVS);
    const cm = u.match(/\/conversations\/([a-z0-9]+)\/messages/); if (cm) return Response.json({ messages: { messages: (MSGS[cm[1]] || []).slice().reverse() } });
    if (u.includes("/calendars/events")) return Response.json({ events: [...Array(10)].map((_, i) => ({ id: "e" + i, appointmentStatus: i < 2 ? "noshow" : i === 2 ? "cancelled" : "confirmed" })) });
    if (u.includes("/opportunities/search")) return Response.json({ opportunities: [{ id: "o1", monetaryValue: 2500, updatedAt: ago(24 * 20) }, { id: "o2", monetaryValue: 900, updatedAt: ago(24 * 2) }] });
    return Response.json({}); }
  if (u.includes("api.stripe.com")) { if (m !== "GET") writes.push(m + " " + u); return Response.json({ data: [{ due_date: Math.floor(now / 1e3) - 5 * 86400, amount_remaining: 120000 }, { due_date: Math.floor(now / 1e3) + 5 * 86400, amount_remaining: 50000 }], has_more: false }); }
  return Response.json({}); };
globalThis.caches = undefined;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", GHL_CALENDAR_ID: "cal", STRIPE_SECRET_KEY: "sk_test", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const w = (await import(W)).default;
const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team/leak-scan", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: "{}" }), env, { waitUntil() {} }).then((x) => x.json());
const M = r.metrics || {}, F = (r.findings || []).map((f) => f.key);
assert(r.ok && r.read_only && writes.length === 0, "The scan only reads: nothing is written to GHL or Stripe");
assert(M.enquiry_threads === 3 && M.unanswered_24h === 1 && F.includes("unanswered"), "Finds the enquiry left without a reply for over a day (" + M.unanswered_24h + ")");
assert(M.median_reply_minutes >= 6 && M.median_reply_minutes <= 180 && F.includes("slow_reply"), "Measures typical first-reply time (" + M.median_reply_minutes + " min)");
assert(M.bookings === 10 && M.no_shows === 2 && F.includes("no_shows"), "Counts no-shows against bookings (2 of 10)");
assert(M.stale_deals === 1 && M.stale_value === 2500 && F.includes("stale_deals"), "Spots deals untouched for 14+ days and their value");
assert(M.overdue_invoices === 1 && M.overdue_amount === 1200 && F.includes("overdue"), "Totals overdue invoices only (not ones still in date)");
assert(M.score < 60 && DB.team_reports.some((x) => x.subkind === "leak_scan" && /Leak scan for Studio Flow/.test(x.body)), "Scores it out of 100 and saves a report (" + M.score + "/100)");
const src = (await import("node:fs")).readFileSync(W.split("?")[0], "utf8");
assert(/bn\.date\.endsWith\("-01"\)/.test(src) && /await leakWatch\(e\)/.test(src) && /leak_inside_scan/.test(src), "Leak Watch re-scans on the 1st of every month; the whole team can run the scan");
const app = await (await w.fetch(new Request("https://studioflowandsystems.app/app/app.js"), env, { waitUntil() {} })).text(); new Function(app);
assert(/Run a leak scan/.test(app) && /Not checked: /.test(app), "Performance has a Run a leak scan button, and says what it couldn't check");
console.log("leakscan-v76 OK");
