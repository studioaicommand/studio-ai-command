// v47 Outreach engine: autopilot settings + warm-up, Google/AI search research, no-website call list,
// homepage concept per top prospect (reusing the hunt's work), premium email brief, daily ready alert, Outreach today view.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("\u2713", m); };
const DB = { studio_command_jobs: [{ id: "j0", department: "head_of_sales", status: "done", created_at: "2026-11-10T00:00:00Z" }, { id: "j1", department: "head_of_sales", status: "failed", title: "x", created_at: "2026-11-10T00:00:00Z" }], team_settings: [{ key: "telegram", value: { chat_id: 42 } }], agent_demos: [], agent_prospects: [], team_usage: [], team_actions: [], team_audit: [] };
Object.assign(DB, { team_usage: [{ department: "head_of_sales", cost_aud: 2.5, created_at: "2026-11-11T00:00:00Z" }], agent_demos: [{ token: "t1", first_view_at: "2026-11-10T00:00:00Z" }], agent_prospects: [{ id: "p1", niche: "allied", status: "won", created_at: "2026-11-10T00:00:00Z", updated_at: "2026-11-11T00:00:00Z" }, { id: "p2", niche: "allied", status: "sent", created_at: "2026-11-10T00:00:00Z", updated_at: "2026-11-10T00:00:00Z" }, { id: "p3", niche: "dental", status: "sent", created_at: "2026-11-10T00:00:00Z", updated_at: "2026-11-10T00:00:00Z" }], team_actions: [{ id: "a1", department: "head_of_sales", status: "approved", type: "email", created_at: "2026-11-10T00:00:00Z" }, { id: "a2", department: "head_of_sales", status: "rejected", type: "email", title: "Long follow-up", result: { note: "too long" }, created_at: "2026-11-10T00:00:00Z" }, { id: "a3", department: "head_of_sales", status: "rejected", type: "email", created_at: "2026-11-10T00:00:00Z" }, { id: "a4", type: "campaign_enrol", status: "approved", decided_at: "2026-11-10T00:00:00Z", created_at: "2026-11-10T00:00:00Z" }] });
let seq = 0; const EVENTS = {}; const SPEC = [], TOOLSEN = [], TOOLSEEN = [], NOSPEC = []; const tgs = [], asks = []; let cands = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "is") return m[2] === "null" ? r[k] == null : true; return true; });
const SITE = `<!doctype html><html><head><title>Sunny Paws Vet Clinic</title><meta name="viewport" content="width=device-width"><style>:root{--brand-primary:#1f7a8c}.btn{background:#1f7a8c;color:#fff}h1{font-family:"Poppins",sans-serif}.x{color:#e07a5f}</style></head><body>
<img src="/img/logo.png" alt="Sunny Paws logo" class="site-logo"><h1>Caring vets in Maroochydore</h1><img src="https://cdn.sunnypaws.test/team.jpg" alt="Our vet team" width="1200"><img src="/img/clinic.jpg" alt="Clinic"><img src="/img/dog.jpg" alt="Happy dog">
<p>Sunny Paws Vet Clinic cares for dogs and cats in Maroochydore. Call 07 5443 1111. Email <a href="mailto:hello@sunnypaws.test">hello@sunnypaws.test</a>. Open Mon-Fri 8am-6pm, Sat 8am-12pm. Vaccinations, desexing, dental care and puppy school.</p>
<p>&copy; 2019 Sunny Paws</p></body></html>`;
const OLD = `<html><head><title>Bob's Plumbing</title></head><body><table width="800"><tr><td>Welcome</td></tr></table><p>Copyright 2016</p><script src="/js/jquery-1.7.min.js"></script></body></html>`;
const spec = (extra = {}) => ({ style: "clinical", why: "Calm, trustworthy care for pet owners.", brand: { primary: "#1f7a8c", secondary: "#0f3d46", accent: "#e07a5f", bg: "#f7fbfb", ink: "#10282d", display_font: "Poppins", body_font: "Inter", radius: 20, logo: "https://sunnypaws.test/img/logo.png", logo_text: "Sunny Paws" },
  nav: { links: [{ label: "Services", href: "#features" }], cta: "Book a visit" }, contact: { phone: "07 5443 1111", hours: "Mon-Fri 8am-6pm" },
  sections: [{ type: "hero", variant: "split-arch", title: "Gentle vets for Maroochydore pets", highlight: "Gentle vets", images: ["https://cdn.sunnypaws.test/team.jpg", "https://evil.test/made-up.jpg"], badges: ["Open Saturdays"] },
    { type: "marquee", items: ["Vaccinations", "Desexing", "Dental", "Puppy school"] },
    { type: "features", variant: "rail", title: "Everything your pet needs", items: [{ title: "Vaccinations", text: "Keep them protected.", image: "https://sunnypaws.test/img/clinic.jpg" }, { title: "Dental", text: "Healthy smiles." }] },
    { type: "testimonials", variant: "spotlight", title: "Pet parents say" }, { type: "cta", title: "Book a visit" }],
  report: { headline: "Where Sunny Paws loses bookings", leaks: [{ title: "No online booking", detail: "Owners must call.", fix_title: "Online booking", fix: "Book in two taps." }] },
  offers: { items: [{ title: "AI receptionist", text: "Answers 24/7.", leak: "No after-hours answers" }] }, ...extra });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const up = /on_conflict=website/.test(qs); const rows = [].concat(body).map((r) => { const ex = up && t.find((x) => x.website === r.website); if (ex) { Object.assign(ex, r); return ex; } const n = { id: "id" + (++seq), created_at: new Date().toISOString(), ...r }; if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = n; else t.push(n); } else t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { asks.push(body); const names = (body.tools || []).map((t) => t.name);
    const use = (name, input) => Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name, input }], stop_reason: "tool_use", usage: { input_tokens: 2000, output_tokens: 800, server_tool_use: { web_search_requests: names.includes("web_search") ? 2 : 0 } } });
    const sysTxt = JSON.stringify(body.system || "");
    if (/YOU ARE A SPECIALIST/.test(sysTxt)) { SPEC.push(sysTxt); return Response.json({ content: [{ type: "text", text: "Proposal drafted: 3 options, deposit link, call booked for Tue 10am." }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10 } }); }
    if (names.includes("assign_specialist") && !JSON.stringify(body.messages).includes("tool_result")) { TOOLSEEN.push(body.tools.find((t) => t.name === "assign_specialist").input_schema.properties.specialist.enum); return use("assign_specialist", { specialist: "proposal_writer", task: "Write the proposal for Sunny Paws." }); }
    if (/head of sales|Head of Sales/.test(sysTxt) && !names.includes("assign_specialist") && !names.includes("save_team_review")) NOSPEC.push(1);
    if (names.includes("save_team_review")) return use("save_team_review", { summary: "4 of 20 booked by Thursday. Sales is busy but not converting; follow-ups are slow.", leaderboard: [{ department: "head_of_sales", grade: "C", why: "3 of 5 proposals rejected for being too long." }, { department: "head_of_marketing", grade: "B", why: "Reply rate steady." }, { department: "head_of_finance", grade: "idle", why: "No work this week." }], new_rules: [{ department: "head_of_sales", rule: "Keep follow-ups under 60 words and always offer two call times." }], experiments: [{ department: "head_of_sales", task: "Call every business that opened its concept this week and offer two call times." }] });
    if (names.includes("save_scout_ideas")) return use("save_scout_ideas", { ideas: [{ title: "Send a 10-second scroll video of the concept in email 1", seen_at: "Example Agency", source_url: "https://example.com/post", what_they_do: "They send a short vertical video of the mockup.", our_version: "Record the concept scrolling with the receptionist answering, embed a GIF preview in email 1.", area: "outreach", department: "head_of_sales", bookings_impact: 5, effort: 2 }, { title: "Live receptionist moment above the fold", what_they_do: "Demo pages show the bot working first.", our_version: "Animate their receptionist answering their real questions near the top.", area: "demos", department: "head_of_marketing", bookings_impact: 4, effort: 1, design_lesson: "Put the receptionist section right after the hero on every concept." }] });
    if (names.includes("submit_candidates")) return use("submit_candidates", { clinics: cands });
    if (names.includes("save_search")) return use("save_search", { query: "vet Maroochydore", position: null, ahead: ["Coast Vets", "Maroochy Animal Hospital"], ai_mention: false, notes: "Not on page one; two competitors show first." });
    if (names.includes("write_outreach")) { const cl = JSON.stringify(body.messages).match(/sunnypaws\.test/) ? [{ website: "https://sunnypaws.test", leak: "Not found on Google", evidence: "x", opener: "Hi, it's Ty", score: 8, subject: "A homepage concept for Sunny Paws", body: "Hi Sunny Paws team, 212 glowing Google reviews says a lot. I put together a concept of what your homepage could look like, in your own brand, with an AI receptionist built in. Worth a 15-minute look?", follow_up_1: "Quick one.", follow_up_2: "Close the loop?" }] : []; return use("write_outreach", { clinics: cl }); }
    if (names.includes("save_front_desk")) return use("save_front_desk", { clinic_name: "Sunny Paws Vet Clinic", clinic_type: "vet clinic", phone: "07 5443 1111", services: [{ name: "Vaccinations" }, { name: "Dental" }], suggested_questions: ["Are you open Saturday?", "Do you do puppy school?", "How do I book?"] });
    if (names.includes("save_reviews")) return use("save_reviews", { rating: 4.9, count: 212, source: "Google", items: [{ quote: "The team were so gentle with our nervous rescue dog.", name: "Kate", stars: 5, source: "Google" }] });
    if (names.includes("save_site_design")) return use("save_site_design", spec());
    return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("leadconnectorhq.com") && u.includes("/calendars/events?")) { const cal = new URL(u).searchParams.get("calendarId"); return Response.json({ events: (EVENTS[cal] || []) }); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("sunnypaws.test")) return new Response(SITE, { headers: { "content-type": "text/html" } });
  return new Response("", { status: 404 }); };
const realDate = Date; let fixed = new realDate("2026-11-12T01:00:00Z"); // Thursday 11am Brisbane
globalThis.Date = class extends realDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed.getTime(); } };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: "https://studioflowandsystems.app", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc1" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) };
const flush = async () => { while (waits.length) await waits.shift(); };
const call = async (path, b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, ctx); await flush(); return { s: r.status, j: await r.json() }; };
const st = (k) => DB.team_settings.find((r) => r.key === k)?.value;

// Full Company: heads hand work to specialists
let x = await call("/chat", { department: "head_of_sales", message: "Write a proposal for Sunny Paws" });
assert(TOOLSEEN.length && TOOLSEEN[0].length === 6 && TOOLSEEN[0].includes("no_show_rebooker") && TOOLSEEN[0].includes("dm_reply_coach"), "On Full Company the Head of Sales leads 6 specialists (Reply Coach added in v81)");
assert(SPEC.length === 1 && /Proposal Writer/.test(SPEC[0]) && /YOUR PERFORMANCE CONTRACT/.test(SPEC[0]), "The head hands the task to the Proposal Writer, who works to the same contract");
x = await call("/performance");
const total = Object.values(x.j.specialists).reduce((n, l) => n + l.length, 0);
assert(x.j.spec_count === 41 && total === 41 && x.j.scorecards.length + total === 49, "8 heads + 41 specialists = 49 agents (DM team added in v81)");
// Demo watcher
DB.agent_demos.push({ token: "a".repeat(40), prospect_id: "p2", business_name: "Sunny Paws Vet", views: 0, chats: 0 });
DB.agent_prospects.find((p) => p.id === "p2").business_name = "Sunny Paws Vet";
const seen = async () => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/demo/" + "a".repeat(40) + "/seen?ev=view", { method: "POST" }), env, ctx); await flush(); return r.status; };
await seen();
const hot = DB.studio_command_jobs.filter((j) => j.source === "demo_watcher");
assert(hot.length === 1 && hot[0].department === "head_of_sales" && /Sunny Paws Vet just opened their AI receptionist demo/.test(hot[0].request) && /two concrete call times/.test(hot[0].request), "Demo watcher: the moment they open their demo, Sales drafts a follow-up with two call times");
await seen(); await seen();
assert(DB.studio_command_jobs.filter((j) => j.source === "demo_watcher").length === 1, "It doesn't pile on: one follow-up per business per day");
// No-show rebooker
EVENTS["tfzrthnax3Ldpncejghq"] = [{ id: "n1", appointmentStatus: "noshow", title: "Free call: Harbour Physio", startTime: "2026-11-11T00:00:00Z", contactId: "c9" }, { id: "n2", appointmentStatus: "confirmed" }];
EVENTS["letd3kiR8QpsaVL6SXkJ"] = [];
x = await call("/performance/noshow-check", {});
const ns = DB.studio_command_jobs.filter((j) => j.source === "no_show_rebooker");
assert(x.j.queued === 1 && ns.length === 1 && /missed \(no-show\)/.test(ns[0].request) && /two concrete times/.test(ns[0].request), "No-show rebooker: a missed sales call gets a rebooking proposal the same day");
x = await call("/performance/noshow-check", {});
assert(x.j.queued === 0, "Each missed call is chased once");
// Core Team: no specialists
const r1 = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/fleet/plan", { method: "POST", headers: { Authorization: "Bearer ft", "Content-Type": "application/json" }, body: JSON.stringify({ tier: "core" }) }), { ...env, FLEET_TOKEN: "ft" }, ctx); await flush();
const before = TOOLSEEN.length;
await call("/chat", { department: "head_of_sales", message: "Plan my day" });
assert(TOOLSEEN.length === before && NOSPEC.length > 0, "On Core Team, heads work without specialists");
x = await call("/performance");
assert(x.j.specialists === null && x.j.spec_count === 41, "Core Team sees what Full Company adds");
// AI budget grows with revenue
x = await call("/costs/budget", { monthly_usd: 100, rev_pct: 10, warn_pct: 80, pause_pct: 95 });
assert(st("ai_budget").rev_pct === 10, "The AI budget can grow with revenue (10% of the last 30 days' sales)");
const app = await (await w.fetch(new Request("https://studioflowandsystems.app/app/app.js"), env, ctx)).text();
assert(/YOUR AI COMPANY/.test(app) && /abRev/.test(app), "Roster and revenue-linked budget are in the app");
console.log("v50 Full Company, demo watcher, no-show rebooker: all passed");
process.exit(0);
