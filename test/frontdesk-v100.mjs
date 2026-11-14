// v100 "Try the AI Front Desk": the Upgraded public page (/experience-next) is a live demo of the AI receptionist.
// Visitors pick an industry and talk as their own customer; the original page and assistant stay as they were.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const oa = [], rt = [];
globalThis.fetch = async (u, init = {}) => { u = String(u);
  if (u.includes("challenges.cloudflare.com")) return Response.json({ success: true, hostname: "studioflowandsystems.app", action: "studio_voice" });
  if (u === "https://api.openai.com/v1/responses") { const b = JSON.parse(init.body); oa.push(b); return Response.json({ output: [{ content: [{ type: "output_text", text: "Hi, thanks for calling. I can fit you in tomorrow at 10am or Thursday at 3:30pm. Which suits?" }] }] }); }
  if (u === "https://api.openai.com/v1/realtime/calls") { rt.push(JSON.parse(init.body.get("session"))); return new Response("v=0\r\nanswer", { status: 201, headers: { Location: "/v1/realtime/calls/rtc_1" } }); }
  if (u.includes("sb.test")) return Response.json([]);
  return Response.json({}); };
const mod = await import(W);
const inst = new Map();
function storage() { const m = new Map(); const api = { get: async (k) => structuredClone(m.get(k)), put: async (k, v) => { m.set(k, structuredClone(v)); }, setAlarm: async () => {}, transaction: async (fn) => fn(api) }; return api; }
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", OPENAI_API_KEY: "o", TURNSTILE_SITE_KEY: "0xS", TURNSTILE_SECRET_KEY: "s", STUDIO_PUBLIC_LIMIT_SECRET: "x".repeat(40), SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s" };
env.STUDIO_PUBLIC_TRIALS = { idFromName: (n) => n, get: (id) => { if (!inst.has(id)) inst.set(id, new mod.PublicTrialGuard({ storage: storage() }, env)); const o = inst.get(id); return { fetch: (u, x) => o.fetch(new Request(u, x)) }; } };
const O = "https://studioflowandsystems.app";
const get = async (p) => { const r = await mod.default.fetch(new Request(O + p), env, { waitUntil() {} }); return { s: r.status, h: r.headers, t: await r.text() }; };

// The page
const next = await get("/experience-next"), orig = await get("/experience");
assert(next.s === 200 && /Try the AI Front Desk/.test(next.t) && /AI FRONT <b>DESK<\/b>/.test(next.t) && /1\. PICK YOUR INDUSTRY/.test(next.t), "Upgraded page is the AI Front Desk demo");
for (const k of ["clinic", "property", "trades", "coach"]) assert(next.t.includes(`data-ind="${k}"`), "Industry choice: " + k);
assert(/Book an appointment/.test(next.t) && /Missed call, unhappy/.test(next.t) && /Type as your customer would/.test(next.t), "Customer-style prompts and placeholder");
assert(!/YOUR NEXT QUICK WIN|>Explore working with Ty|Map my business|Tell Studio about your business/.test(next.t), "Old exploring-Studio copy is gone from the demo");
assert((next.t.match(/class="[^"]*public-next[^"]*"[^>]*>Book a free 30-minute call<\/a>/g) || []).length >= 1, "Main button books a free 30-minute call (booking overlay still works)");
assert(/Nothing is really booked/.test(next.t) && /sample business/.test(next.t), "Clearly labelled as a demo with sample businesses");
assert(!/\$\s?(297|497|697|997|2,?497)|GST/.test(next.t.replace(/\$\{[^}]*\}/g, "")), "No Studio Flow prices or GST on the page");
assert(/window\.fetch=function/.test(next.t) && /X-Studio-Industry/.test(next.t), "Page tells the server which demo business to play");
assert(/Studio AI Intelligence<\/title>/.test(orig.t) && !/PICK YOUR INDUSTRY/.test(orig.t), "Original page untouched while the switch is off");
const scripts = [...next.t.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
for (const s of scripts) { try { new Function(s); } catch (e) { assert(false, "Injected page script parses: " + e.message); } }
assert(scripts.length > 0, "All inline scripts on the demo page parse");

// The trial: chat as a customer of the chosen demo business
const H = { Origin: O, "CF-Connecting-IP": "1.2.3.4" };
let r = await mod.default.fetch(new Request(O + "/api/v1/public/trial", { method: "POST", headers: { ...H, "X-Studio-Turnstile": "tok" } }), env, {});
const tj = await r.json(); const cookie = (r.headers.get("Set-Cookie") || "").split(";")[0];
assert(r.status === 200 && tj.token && cookie, "Verified trial starts");
const chat = (message, industry) => mod.default.fetch(new Request(O + "/api/v1/public/chat", { method: "POST", headers: { ...H, Cookie: cookie, "X-Studio-Trial": tj.token, "Content-Type": "application/json" }, body: JSON.stringify({ message, industry }) }), env, {}).then((x) => x.json());
let c = await chat("Hi, I'd like to book in this week", "clinic");
assert(c.ok && /10am/.test(c.reply), "Front desk replies");
assert(/AI front desk for Harbourside Physio/.test(oa[0].instructions) && /two specific times/.test(oa[0].instructions) && /Never quote Studio Flow's prices/.test(oa[0].instructions) && /say yes/.test(oa[0].instructions), "Plays Harbourside Physio: books with two times, honest about being AI, no Studio prices");
assert(/Never teach how to build, copy or reverse-engineer/.test(oa[0].instructions), "Still refuses to explain how it's built");
c = await chat("Tomorrow at 10 works", "clinic");
assert(oa[1].input.length === 3, "Same business: conversation carries on");
c = await chat("Hi, my hot water has no power", "trades");
assert(/BrightSpark Electrical/.test(oa[2].instructions) && oa[2].input.length === 1, "Switching industry starts a fresh conversation as the new business");
c = await chat("hello", "<script>");
assert(!/AI front desk for/.test(oa[3].instructions) && oa[3].instructions === oa[3].instructions, "Unknown industry falls back to the standard public assistant");
const voice = await mod.default.fetch(new Request(O + "/api/v1/public/voice", { method: "POST", headers: { ...H, Cookie: cookie, "X-Studio-Trial": tj.token, "X-Studio-Industry": "property", "Content-Type": "application/sdp" }, body: "v=0\r\nm=audio 9\r\n" }), env, {});
assert(voice.status === 201 || voice.status === 200, "Voice call starts: " + voice.status);
assert(/Northside Property Co\./.test(rt[0].instructions) && rt[0].tools.length === 0, "Voice answers as the chosen business, with no tools");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert((src.match(/Public page: AI Front Desk demo/g) || []).length === 2, "Settings switch describes the new demo");
console.log("frontdesk-v100 OK");
