// v39: website demos hosted by Command at /demo/<slug>; Telegram alert on real opens only.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }] };
const tg = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = init.method || "GET"; const body = init.body ? JSON.parse(init.body) : undefined;
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") { const k = (qs.match(/key=eq\.([a-z_]+)/) || [])[1]; return Response.json(k ? t.filter((r) => r.key === k) : t); }
    if (m === "POST" || m === "PATCH") { for (const r of [].concat(body)) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } return Response.json([]); }
    return Response.json([]); }
  if (u.includes("api.telegram.org")) { tg.push(body.text); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
const w = (await import(W)).default;
const env = { STUDIO_TEST_KEY: "real-key", SUPABASE_URL: "https://sb.test", SUPABASE_SERVICE_ROLE_KEY: "s", TELEGRAM_BOT_TOKEN: "t" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) };
const get = async (path, ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1") => { const r = await w.fetch(new Request("https://studioflowandsystems.app" + path, { headers: { "User-Agent": ua } }), env, ctx); const t = await r.text(); await Promise.all(waits.splice(0)); return { r, t }; };
// make the alert hour-proof (quiet hours 9pm–7am would hold non-urgent alerts)
const realDate = Date; const fixed = new realDate("2026-11-10T01:00:00Z"); // 11am Brisbane
globalThis.Date = class extends realDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed.getTime(); } };
let x = await get("/demo/karinya");
assert(x.r.status === 200 && /Karinya Montessori/.test(x.t) && /Concept preview/.test(x.t), "Karinya demo opens without a login");
assert(/studioflowandsystems\.com\/vendor\/motion\.js/.test(x.t) && /noindex/.test(x.r.headers.get("x-robots-tag")), "Loads the motion engine from the website and stays out of Google");
assert(tg.length === 1 && /Karinya Montessori just opened their website demo/.test(tg[0]) && /first time/.test(tg[0]), "Ty gets a Telegram alert the first time they open it");
x = await get("/demo/karinya");
assert(tg.length === 1, "A second open straight away doesn't spam another alert");
x = await get("/demo/karinya/report");
assert(x.r.status === 200 && /Enquiry leak report/.test(x.t) && tg.length === 2 && /leak report/.test(tg[1]), "Leak report opens and alerts separately");
x = await get("/demo/playball-sunny-coast", "facebookexternalhit/1.1");
assert(x.r.status === 200 && tg.length === 2, "Link previews (Facebook/WhatsApp/Telegram bots) don't trigger alerts");
x = await get("/demo/playball-sunny-coast?preview=1");
assert(x.r.status === 200 && tg.length === 2, "Ty's own ?preview=1 checks don't trigger alerts");
x = await get("/demo/playball-sunny-coast");
assert(/Playball Sunny Coast just opened their website demo/.test(tg.at(-1)), "Playball opens alert Ty");
const views = DB.team_settings.find((r) => r.key === "site_demos").value;
assert(views["karinya:page"].views === 2 && views["karinya:report"].views === 1, "Views are counted per page");
x = await get("/demo/karinya/nope");
assert(x.r.status === 404, "Unknown sub-pages are 404");
x = await get("/demo/not-a-real-demo");
assert(x.r.status === 404, "Unknown demo names are 404 (receptionist demo tokens unaffected)");
console.log("v39 site demos: all passed");
