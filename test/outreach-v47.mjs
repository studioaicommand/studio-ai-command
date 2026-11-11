// v47 Outreach engine: autopilot settings + warm-up, Google/AI search research, no-website call list,
// homepage concept per top prospect (reusing the hunt's work), premium email brief, daily ready alert, Outreach today view.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("\u2713", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], agent_demos: [], agent_prospects: [], team_usage: [], team_actions: [], team_audit: [] };
let seq = 0; const tgs = [], asks = []; let cands = [];
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
    if (names.includes("submit_candidates")) return use("submit_candidates", { clinics: cands });
    if (names.includes("save_search")) return use("save_search", { query: "vet Maroochydore", position: null, ahead: ["Coast Vets", "Maroochy Animal Hospital"], ai_mention: false, notes: "Not on page one; two competitors show first." });
    if (names.includes("write_outreach")) { const cl = JSON.stringify(body.messages).match(/sunnypaws\.test/) ? [{ website: "https://sunnypaws.test", leak: "Not found on Google", evidence: "x", opener: "Hi, it's Ty", score: 8, subject: "A homepage concept for Sunny Paws", body: "Hi Sunny Paws team, 212 glowing Google reviews says a lot. I put together a concept of what your homepage could look like, in your own brand, with an AI receptionist built in. Worth a 15-minute look?", follow_up_1: "Quick one.", follow_up_2: "Close the loop?" }] : []; return use("write_outreach", { clinics: cl }); }
    if (names.includes("save_front_desk")) return use("save_front_desk", { clinic_name: "Sunny Paws Vet Clinic", clinic_type: "vet clinic", phone: "07 5443 1111", services: [{ name: "Vaccinations" }, { name: "Dental" }], suggested_questions: ["Are you open Saturday?", "Do you do puppy school?", "How do I book?"] });
    if (names.includes("save_reviews")) return use("save_reviews", { rating: 4.9, count: 212, source: "Google", items: [{ quote: "The team were so gentle with our nervous rescue dog.", name: "Kate", stars: 5, source: "Google" }] });
    if (names.includes("save_site_design")) return use("save_site_design", spec());
    return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("sunnypaws.test")) return new Response(SITE, { headers: { "content-type": "text/html" } });
  return new Response("", { status: 404 }); };
const realDate = Date; let fixed = new realDate("2026-11-10T01:00:00Z");
globalThis.Date = class extends realDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed.getTime(); } };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) };
const flush = async () => { while (waits.length) await waits.shift(); };
const call = async (path, b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, ctx); await flush(); return { s: r.status, j: await r.json() }; };
const st = (k) => DB.team_settings.find((r) => r.key === k)?.value;

let x = await call("/outreach/daily");
assert(x.j.ok && x.j.cfg.on === false && x.j.cfg.target === 50 && x.j.capacity === 0 && x.j.verticals.length > 3, "Autopilot starts off, target 50 a day, industries listed");
x = await call("/outreach/daily", { on: true, target: 400, cities: ["Sunshine Coast", " "], verticals: ["allied", "nonsense"] });
assert(x.j.cfg.on && x.j.cfg.target === 150 && x.j.capacity === 20 && x.j.cfg.start && JSON.stringify(x.j.cfg.cities) === '["Sunshine Coast"]' && JSON.stringify(x.j.cfg.verticals) === '["allied"]', "Turning it on starts the warm-up at 20/day; target capped at 150; bad inputs dropped");
const cfg = st("outreach_daily"); cfg.start = new realDate(fixed.getTime() - 7 * 864e5).toISOString(); cfg.target = 50;
x = await call("/outreach/daily");
assert(x.j.capacity === 50, "After a week of warm-up it reaches 50 a day");
cfg.start = new realDate(fixed.getTime() - 30 * 864e5).toISOString();
x = await call("/outreach/daily");
assert(x.j.capacity === 50, "It never goes past Ty's daily number (50), even when fully warmed up");
cfg.verticals = [];

// A hunt finds one outdated site with a published email and one business with no website at all
cands = [{ business_name: "Sunny Paws Vet Clinic", website: "https://sunnypaws.test", vertical: "allied", location: "Maroochydore", phone: "07 5443 1111", google_rating: 4.9, google_reviews: 212, locations: 2, practitioners: 6 },
  { business_name: "Nambour Mobile Vet", website: "", phone: "0400 111 222", google_rating: 4.8, google_reviews: 40 }];
x = await call("/hunt/start", { vertical: "allied", city: "Sunshine Coast", count: 5 });
const hunt = x.j.hunt;
const ns = DB.agent_prospects.find((p) => p.business_name === "Nambour Mobile Vet");
assert(ns && ns.source === "no_website" && !ns.email && ns.status === "to_send" && /couldn't find a website/.test(ns.opener), "No-website business goes straight to the call list with a phone opener");
const cl = await call("/calls");
assert(cl.j.calls.some((c) => c.business_name === "Nambour Mobile Vet" && c.ready && /couldn't find a website/.test(c.opener)), "It shows in Ty's call list today with the no-website opener");
assert(hunt.candidates.length === 1, "The outdated-site business goes through the full research");
assert(/NO website at all/.test(JSON.stringify(asks.find((a) => (a.tools || []).some((t) => t.name === "submit_candidates")).messages)), "The hunt asks for businesses with no website too");
x = await call("/hunt/step", { id: hunt.id });
const p = DB.agent_prospects.find((r) => /sunnypaws/.test(r.website || ""));
const lr = p?.leak_report || {};
assert(lr.search && lr.search.query === "vet Maroochydore" && lr.search.position === null && lr.checks.some((c) => c.key === "search_visibility" && c.status === "fail"), "Each business is checked on Google + AI search; not showing up becomes a confirmed finding");
const sa = asks.find((a) => (a.tools || []).some((t) => t.name === "save_search"));
assert(sa && sa.tools.some((t) => t.type === "web_search_20250305") && /haiku/i.test(sa.model || ""), "The search check runs on the fast model with web search");
const wr = asks.find((a) => (a.tools || []).some((t) => t.name === "write_outreach"));
assert(/PREMIUM POSITIONING/.test(wr.system) && /SITE-FIRST/.test(wr.system), "The sales writer is briefed on premium positioning and the homepage-concept offer");
const design = asks.filter((a) => (a.tools || []).some((t) => t.name === "save_site_design"));
assert(design.length === 1 && /10X RULE/.test(design[0].system), "A homepage concept is designed, under the 10x rule");
assert(asks.filter((a) => (a.tools || []).some((t) => t.name === "save_front_desk")).length === 1, "The concept reuses the hunt's AI receptionist (not built twice)");
const act = DB.team_actions.find((a) => a.type === "campaign_enrol");
assert(act && act.status === "pending" && /\/site$/.test(act.params.site_demo_url || "") && act.params.body.includes(act.params.site_demo_url) && /\/report$/.test(act.params.follow_up_1), "Email 1 links the homepage concept; follow-up 1 links the leak report; it waits for approval");
x = await call("/outreach/today");
const it = x.j.items[0];
assert(x.j.ok && it && it.business === "Sunny Paws Vet Clinic" && it.site && /leak-report/.test(it.report) && /\/demo\//.test(it.receptionist) && it.search.query === "vet Maroochydore" && x.j.stats.site_demos === 1, "Outreach today lists it with concept, leak report, receptionist and search result");

// Daily ready alert once today's batch is full, and only once
cfg.target = 1; tgs.length = 0;
x = await call("/outreach/run", {});
assert(x.j.result.cap === 1 && x.j.result.started === 0 && tgs.filter((t) => /Today's outreach is ready: 1 to approve/.test(t)).length === 1, "When today's batch is full, Ty gets one Telegram: ready to approve");
await call("/outreach/run", {});
assert(tgs.filter((t) => /outreach is ready/.test(t)).length === 1, "That alert isn't repeated");
// Outside working hours it doesn't start hunts
cfg.target = 50; fixed = new realDate("2026-11-10T12:00:00Z");
x = await call("/outreach/run", {});
assert(x.j.result.started === 0, "No hunts at 10pm");
fixed = new realDate("2026-11-10T01:00:00Z");
const before = (st("hunts") || []).length;
x = await call("/outreach/run", {});
assert(x.j.result.started >= 1 && (st("hunts") || []).length > before && (st("hunts") || [])[0].source === "outreach_autopilot", "During the day it starts hunts until the batch is full");
const off = await call("/outreach/daily", { on: false });
x = await call("/outreach/run", {});
assert(x.j.result.off === true, "Turning it off stops it");
const app = await (await w.fetch(new Request("https://studioflowandsystems.app/app/app.js"), env, ctx)).text();
try { new Function(app); console.log("\u2713 Command app script parses"); } catch (e) { console.error("FAIL: app.js", e.message); process.exit(1); }
assert(/VIEWS.outreach/.test(app) && /\["outreach", "Outreach today"\]/.test(app) && /bulk-approve/.test(app), "Growth has an Outreach today view with one-tap batch send");
console.log("v47 outreach engine: all passed");
process.exit(0);
