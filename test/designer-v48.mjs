// v40 Website Demo Studio: find leads, build brand demo with the receptionist we sell, adjust/learn, costs, alerts.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], agent_demos: [], agent_prospects: [], team_usage: [] };
let seq = 0; const tgs = [], asks = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "is") return m[2] === "null" ? r[k] == null : true; return true; });
const SITE = `<!doctype html><html><head><title>Sunny Paws Vet Clinic</title><meta name="viewport" content="width=device-width"><style>:root{--brand-primary:#1f7a8c}.btn{background:#1f7a8c;color:#fff}h1{font-family:"Poppins",sans-serif}.x{color:#e07a5f}</style></head><body>
<img src="/img/logo.png" alt="Sunny Paws logo" class="site-logo"><h1>Caring vets in Maroochydore</h1><img src="https://cdn.sunnypaws.test/team.jpg" alt="Our vet team" width="1200"><img src="/img/clinic.jpg" alt="Clinic"><img src="/img/dog.jpg" alt="Happy dog">
<p>Sunny Paws Vet Clinic cares for dogs and cats in Maroochydore. Call 07 5443 1111. Open Mon-Fri 8am-6pm, Sat 8am-12pm. Vaccinations, desexing, dental care and puppy school.</p>
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
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); if (path === "team_settings") { for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } } else t.push(...rows); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { asks.push(body); const names = (body.tools || []).map((t) => t.name);
    const use = (name, input) => Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name, input }], stop_reason: "tool_use", usage: { input_tokens: 2000, output_tokens: 800, server_tool_use: { web_search_requests: names.includes("web_search") ? 2 : 0 } } });
    if (names.includes("save_front_desk")) return use("save_front_desk", { clinic_name: "Sunny Paws Vet Clinic", clinic_type: "vet clinic", phone: "07 5443 1111", services: [{ name: "Vaccinations" }, { name: "Dental" }], suggested_questions: ["Are you open Saturday?", "Do you do puppy school?", "How do I book?"] });
    if (names.includes("save_reviews")) return use("save_reviews", { rating: 4.9, count: 212, source: "Google", items: [{ quote: "The team were so gentle with our nervous rescue dog.", name: "Kate", stars: 5, source: "Google" }, { quote: "Fantastic care and great value.", name: "Ben", stars: 5, source: "Google" }] });
    if (names.includes("submit_businesses")) return use("submit_businesses", { businesses: [{ name: "Bob's Plumbing", website: "bobsplumbing.test", phone: "07 5000 1234", suburb: "Nambour", rating: 4.7, reviews: 88, why: "Table layout, 2016 copyright" }, { name: "Modern Plumbers", website: "modern.test", phone: "07 5000 9999" }] });
    if (names.includes("save_ideas")) return use("save_ideas", { ideas: [{ title: "Pin a 'first visit' journey", why: "Calms nervous owners", instruction: "Add a pinned journey: arrive, check-up, home happy" }] });
    if (names.includes("save_style")) return use("save_style", { id: "swiss-calm", name: "Swiss calm", mood: "Big grotesk type, lots of white space", base: "editorial", hero: ["giant-type"], fonts: ["Inter Tight", "Inter"] });
    if (names.includes("save_site_design")) { const adj = /TY ASKS/.test(JSON.stringify(body.messages)); return use("save_site_design", adj ? spec({ style: "luxe", brand: { ...spec().brand, dark: true, bg: "#0b1416", ink: "#eef6f6" }, change_summary: "Made it darker and more premium.", lesson: "Ty likes darker, premium heroes for clinics" }) : spec()); }
    if (names.includes("pass_to_team")) return Response.json({ content: [{ type: "text", text: "Yes, we're open Saturday 8am to 12pm." }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10 } });
    return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("sunnypaws.test")) return new Response(SITE, { headers: { "content-type": "text/html" } });
  if (u.includes("bobsplumbing.test")) return new Response(OLD, { headers: { "content-type": "text/html" } });
  if (u.includes("modern.test")) return new Response(`<html><head><meta name="viewport" content="width=device-width"><meta name="description" content="x"><script type="application/ld+json">{}</script></head><body><h1>Modern</h1><a href="/book">Book online</a>&copy; 2026</body></html>`, { headers: { "content-type": "text/html" } });
  return new Response("", { status: 404 }); };
const realDate = Date; const fixed = new realDate("2026-11-10T01:00:00Z");
globalThis.Date = class extends realDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed.getTime(); } };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) };
const flush = async () => { while (waits.length) await waits.shift(); };
const call = async (path, b, key = "k") => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { ...(key ? { Authorization: "Bearer " + key } : {}), "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, ctx); await flush(); return { s: r.status, j: await r.json() }; };
const get = async (path, ua = "Mozilla/5.0 (iPhone) Safari/604.1", init = {}) => { const r = await w.fetch(new Request("https://studioflowandsystems.app" + path, { headers: { "User-Agent": ua }, ...init }), env, ctx); await flush(); return { r, t: await r.text() }; };
const st = (k) => DB.team_settings.find((r) => r.key === k)?.value;

let x = await call("/website-demos", null, "");
assert(x.s === 401, "Website demo studio needs the Studio key");

/* v40 basics are covered in website-demos-v40.mjs */
if (0) {
// 1. Hand-built demos now carry the receptionist we sell
x = await get("/demo/karinya?preview=1");
assert(/\/w\/demo-karinya\.js\?preview=1/.test(x.t) && /\.ai-btn,#ai\{display:none!important\}/.test(x.t), "Karinya demo loads the real receptionist widget (old mock chat hidden)");
x = await get("/w/demo-karinya.js");
assert(x.r.status === 200 && /SFO/.test(x.t) && /"k":"demo-karinya"/.test(x.t) && /Karinya/.test(x.t), "The sold widget loader works for a demo");
x = await get("/w/demo-karinya");
assert(x.r.status === 200 && /<html/i.test(x.t) && /Karinya/.test(x.t), "The sold widget panel opens for a demo");
const chat = async (key, q, pv = "") => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/w/" + key + "/chat" + pv, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session: "abcdef123456", messages: [{ role: "user", content: q }] }) }), env, ctx); await flush(); return r.json(); };
let n0 = tgs.length;
let c = await chat("demo-karinya", "Are you open Saturday?", "?preview=1");
assert(c.ok && /Saturday/.test(c.reply) && tgs.length === n0, "Ty's preview chats get real answers and no alert");
c = await chat("demo-playball-sunny-coast", "Do you do parties?");
assert(c.ok && tgs.length === n0 + 1 && /Playball Sunny Coast is chatting/.test(tgs.at(-1)), "A prospect chatting sends Ty a 🔥 alert");

}
// 2. Build a demo from a website
x = await call("/website-demos", { website: "https://sunnypaws.test" });
assert(x.s === 200 && x.j.ok && /^[a-f0-9]{40}$/.test(x.j.token), "Builds a website demo from a URL");
const T = x.j.token;
const rec = st("wsd:" + T) || DB.team_settings.find((r) => r.key === "wsd:" + T)?.value;
const design = asks.filter((a) => (a.tools || []).some((t) => t.name === "save_site_design")).at(-1);
const brief = (JSON.stringify(design.messages).match(/Hero variant: ([a-z-]+)/) || [])[1];
assert(brief && /CREATIVE BRIEF/.test(JSON.stringify(design.messages)) && /Signature moment/.test(JSON.stringify(design.messages)), "Every concept gets a creative brief picked for variety");
assert(/THE AI RECEPTIONIST IS THE CLOSER/.test(design.system) && /20 booked sales calls a week/.test(design.system), "The designer knows its job: the receptionist moment and 20 booked calls a week");
let page = await get("/demo/" + T + "/site?preview=1");
assert(new RegExp('hero-' + ({ "split-arch": "arch", fullbleed: "full", "giant-type": "giant", collage: "collage" })[brief]).test(page.t), "The hero follows the brief (" + brief + ")");
assert(/class="sec rcp rcp-chat"/.test(page.t) && /Are you open Sat/.test(page.t) && /rc-try/.test(page.t), "Their own AI receptionist is shown answering their real questions, with Try it now");
assert(/id="sfPitch"/.test(page.t) && /Book a free call/.test(page.t) && /<iframe src="https:\/\/links\.studioflowandsystems\.com\/widget\/booking\//.test(page.t) && /id="book"/.test(page.t), "A pitch bar and a booking calendar right on the concept");
assert(/class="h-hero"[^>]*style="--lw:\d+"/.test(page.t) && /100cqi/.test(page.t) && /text-wrap:balance/.test(page.t), "Big headlines are sized to fit their longest word (no cut-off text)");
assert(/\.sec\{padding:clamp\(56px,7vw,104px\) 0\}/.test(page.t) && /\.sec\+\.sec/.test(page.t) && /padding:\.08em \.1em \.2em/.test(page.t), "One spacing scale with no dead gaps, and word reveals never clip letters");
assert(/CRAFT CHECKLIST/.test(design.system) && /Rhythm, not gaps/.test(design.system) && /Type that never breaks/.test(design.system), "The designer works to the researched craft checklist");
// the next concept avoids what was just used
const brainNow = DB.team_settings.find((r) => r.key === "design_brain");
const heroes = new Set();
for (let i = 0; i < 4; i++) { x = await call("/website-demos", { website: "https://sunnypaws.test/?v=" + i }); const d = asks.filter((a) => (a.tools || []).some((t) => t.name === "save_site_design")).at(-1); heroes.add((JSON.stringify(d.messages).match(/Hero variant: ([a-z-]+)/) || [])[1]); }
heroes.add(brief);
assert(heroes.size >= 4, "Five concepts in a row use " + heroes.size + " different heroes");
// area section renders when they list suburbs
const html = (await import("node:fs")).readFileSync(W, "utf8");
assert(/area\(s, spec\)/.test(html) && /ar-orbit/.test(html), "Suburbs section (orbit or chips) is available to the designer");
console.log("v48 web designer: all passed");
process.exit(0);
