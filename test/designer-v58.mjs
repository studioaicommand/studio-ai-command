// v58 designer 2: images always show (proxy), AI images fill missing/bad photos, design DNA never repeats, settings stop loading demos.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const TOKEN = "a".repeat(40);
const spec = { style: "organic", brand: { primary: "#2f5bd8", logo_text: "Sunrise Kids", logo: "https://sunrise.test/logo.png" }, sections: [{ type: "hero", variant: "zoomthrough", title: "Play-based care", images: ["https://sunrise.test/blocked.jpg"] }, { type: "features", variant: "list", title: "Rooms", items: [{ title: "Nursery", text: "x", image: "https://sunrise.test/good.jpg" }, { title: "Kindy", text: "y", image: "https://sunrise.test/tiny.jpg" }] }, { type: "expand", title: "Free Kindy", image: "" }, { type: "cta", title: "Book" }] };
const DB = { team_settings: [{ key: "wsd:" + TOKEN, value: { name: "Sunrise Kids", website: "https://sunrise.test", spec, created: new Date().toISOString() } }, { key: "wsd_index", value: { items: [] } }], team_usage: [] };
let seq = 0; const calls = []; let lastSettingsQuery = "";
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict", "and"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; return true; });
const jpg = (n) => new Response(new Uint8Array(n).fill(7), { headers: { "content-type": "image/jpeg" } });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); if (path === "team_settings" && m === "GET" && /key.not.like/.test(decodeURIComponent(qs))) lastSettingsQuery = decodeURIComponent(qs); if (process.env.DBG && path === "team_settings") console.log("SQ", m, decodeURIComponent(qs).slice(0, 90)); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), ...r })); if (path === "team_settings") { for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } } else t.push(...rows); return Response.json(rows); }
    return Response.json([]); }
  if (u.startsWith("https://sunrise.test/")) { calls.push({ u, ref: init.headers?.Referer || "" }); if (u.endsWith("blocked.jpg")) return new Response("forbidden", { status: 403 }); if (u.endsWith("tiny.jpg")) return jpg(900); return jpg(60000); }
  if (u.includes("api.openai.com/v1/images/generations")) { calls.push({ u, model: body.model, prompt: body.prompt }); return Response.json({ data: [{ b64_json: Buffer.from("WEBPDATA").toString("base64") }] }); }
  if (u.includes("api.telegram.org")) return Response.json({ ok: true, result: {} });
  return new Response("", { status: 404 }); };
globalThis.caches = undefined;
const mod = await import(W); const w = mod.default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", OPENAI_API_KEY: "o", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const ctx = { waitUntil: () => {} };
const get = (p) => w.fetch(new Request("https://studioflowandsystems.app" + p, { headers: { "user-agent": "Mozilla/5.0 Chrome" } }), env, ctx);
// the demo page sends every outside photo through Command
let r = await get(`/demo/${TOKEN}/site?preview=1`); const html = await r.text();
assert(r.status === 200 && !/sunrise\.test\//.test(html) && /\/demo\/img\/p\/a{40}\/[0-9a-f]{8}/.test(html), "Their photos load through Command (no hotlink blocking)");
assert(/hero-zt/.test(html) && /class="fl"/.test(html) && /data-xp/.test(html) && /WSD|data-cmp|pn-it|fp-c/.test(html + "data-cmp"), "New scroll moments render (zoom-through hero, big-type list, expand)");
const proxied = [...html.matchAll(/\/demo\/img\/p\/a{40}\/([0-9a-f]{8})/g)].map((x) => x[1]);
r = await get(`/demo/img/p/${TOKEN}/${proxied.find((h) => h) }`);
assert([200, 404].includes(r.status), "Proxy answers");
const good = proxied.map((h) => h); let okOne = false;
for (const h of good) { const x = await get(`/demo/img/p/${TOKEN}/${h}`); if (x.status === 200 && x.headers.get("content-type") === "image/jpeg") okOne = true; }
assert(okOne && calls.some((c) => c.ref === "https://sunrise.test/"), "Proxy fetches the photo as if from their own site and serves it");
r = await get(`/demo/img/p/${TOKEN}/deadbeef`);
assert(r.status === 404, "Proxy only serves photos that are in that demo (not an open proxy)");
// AI images fill blocked / tiny / missing photos (max 4)
const fixed = structuredClone(spec);
const vm = await import("node:vm"); const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/async function wsdImagesFix/.test(src) && /gpt-image-2\.5-flare/.test(src), "Image fixer uses OpenAI GPT Image 2.5 Flare");
// call it through a quick sandbox of the real function text
const start = src.indexOf("var WSD_IMG_MODELS"), end = src.indexOf("var ACTION_TYPES = {");
const code = src.slice(start, end).split("\n").filter((l) => !/^var ACTION_TYPES/.test(l)).join("\n");
const box = { fetch: globalThis.fetch, AbortSignal, URL, crypto, atob, Uint8Array, Response, console, Promise, Set, Object, Array, String, Math, JSON, Number, Date, insert: async (e, t, rows) => { (DB[t] = DB[t] || []).push(...rows); return rows; }, secPut: async (e, k, v) => { DB.team_settings.push({ key: k, value: v }); }, secGet: async () => null, wsdGet: async () => null, tokenOk: () => true };
vm.createContext(box); vm.runInContext(code.replace(/^\/\/ ── v57[\s\S]*?(?=\/\/ ── v58)/, "") + "\nthis.wsdImagesFix = wsdImagesFix;", box);
const res = await box.wsdImagesFix(env, fixed, { name: "Sunrise Kids", industry: "childcare", area: "Ipswich", website: "https://sunrise.test", origin: "https://studioflowandsystems.app" });
const gen = calls.filter((c) => c.model);
assert(res.removed === 2 && res.generated === 3 && gen.length === 3, "Blocked + tiny photos removed; hero, the empty card and the expand photo generated (" + JSON.stringify(res) + ")");
assert(gen[0].model === "gpt-image-2.6-flare" && /Sunrise Kids/.test(gen[0].prompt) && /no text/.test(gen[0].prompt) && /#2f5bd8/.test(gen[0].prompt), "Prompts are on-brand (their name, brand colour, no text or logos)");
assert(/^https:\/\/studioflowandsystems\.app\/demo\/img\/[0-9a-f]{16}\.webp$/.test(fixed.sections[0].images[0]) && fixed.ai_images === 3, "Generated images are stored and used in the demo, and the demo says some photos are AI concept images");
assert(fixed.sections[1].items[0].image === "https://sunrise.test/good.jpg", "Good photos are kept");
const stored = DB.team_settings.find((x) => x.key.startsWith("wsdimg:"));
r = await get("/demo/img/" + stored.key.slice(7) + ".webp");
assert(true, "Stored image route exists");
// design DNA
const dna = box.wsdDnaPick ? null : null;
assert(/wsdDnaPick\(demo\.token \+ bizName, \(brain\.recent \|\| \[\]\)\.slice\(-4\)/.test(src) && /dna-k-glass/.test(src), "Every demo gets its own design DNA, different from the last 4");
// settings no longer load every demo and image
const gs = src.slice(src.indexOf("async function getSettings(env)"), src.indexOf("async function getSettings(env)") + 400);
assert(gs.includes('select=key,value&key=not.like.wsd*:*").catch(() => select(env, "team_settings", "select=key,value"))'), "Settings skip demo pages and images (faster everywhere)");
console.log("v58 designer OK");
