// v97 No-show awareness: GHL's "SF | Sales | No-Show Recovery" workflow chases missed Free Call / Audit bookings,
// so Command's rebooker leaves those alone (no double messages) but still handles cancellations.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
// Freeze the clock at 10am Brisbane on a weekday so the rebooker's working-hours check passes.
const FIXED = Date.parse("2026-11-16T00:00:00Z"); const RealDate = Date;
globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(FIXED); } static now() { return FIXED; } };
const DB = { team_settings: [], studio_command_jobs: [], team_audit: [] };
let seq = 0;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; return true; });
const EVENTS = {
  tfzrthnax3Ldpncejghq: [ // Free 30-min call
    { id: "e1", calendarId: "tfzrthnax3Ldpncejghq", title: "Free call: Jess", appointmentStatus: "noshow", startTime: "2026-11-15T23:00:00Z", contactId: "cj" },
    { id: "e2", calendarId: "tfzrthnax3Ldpncejghq", title: "Free call: Tom", appointmentStatus: "cancelled", startTime: "2026-11-15T22:00:00Z", contactId: "ct" }
  ],
  letd3kiR8QpsaVL6SXkJ: [ // 2-hr audit
    { id: "e3", calendarId: "letd3kiR8QpsaVL6SXkJ", title: "Audit: Ana", appointmentStatus: "no_show", startTime: "2026-11-15T21:00:00Z", contactId: "ca" }
  ]
};
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: r.id || "id" + (++seq), created_at: new RealDate().toISOString(), ...r })); const out = []; for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : t.findIndex((x) => x.id === r.id); if (i >= 0) { if (r.key) t[i] = r; } else { t.push(r); out.push(r); } } return Response.json(out); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("leadconnectorhq.com")) {
    if (u.includes("/calendars/events?")) { const cal = new URL(u).searchParams.get("calendarId"); return Response.json({ events: EVENTS[cal] || [] }); }
    return Response.json({}); }
  if (u.includes("api.telegram.org")) return Response.json({ ok: true, result: { message_id: 1 } });
  return new Response("{}", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const call = async (path, b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, ctx); await flush(); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const jobs = () => DB.studio_command_jobs.filter((j) => j.source === "no_show_rebooker");

let r = await call("/performance/noshow-check", {});
assert(r.s === 200 && r.j.ok, "No-show check runs: " + JSON.stringify(r.j));
assert(r.j.ghl_handled === 2, "The Free Call no-show and the Audit no-show are left to the GHL No-Show Recovery workflow");
assert(jobs().length === 1 && /cancelled/.test(jobs()[0].request) && /Tom|ct/.test(jobs()[0].request), "Command still proposes a rebooking for the cancellation (GHL doesn't chase cancellations)");
assert(!jobs().some((j) => /Jess|Ana|no-show\)/.test(j.request)), "No second rebooking message for the people GHL is already chasing");

r = await call("/performance/noshow-check", {});
assert(r.j.ghl_handled === 0 && r.j.found === 0 && jobs().length === 1, "Running again doesn't re-queue anything");

// Switch back to the old behaviour: Command handles no-shows itself
DB.team_settings.push({ key: "inbox", value: { noshow_flow: "command" } });
const watch = DB.team_settings.find((x) => x.key === "watch"); if (watch) watch.value.noshow = [];
DB.studio_command_jobs.length = 0;
r = await call("/performance/noshow-check", {});
assert(r.j.ghl_handled === 0 && jobs().length === 3, "With noshow_flow = 'command', Command proposes rebookings for all three again");

const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/NO-SHOWS: missed Free Call and Audit bookings are chased by the GHL workflow/.test(src), "Command's instructions say who chases no-shows, so it never doubles up");
console.log("noshow-v97 OK");
