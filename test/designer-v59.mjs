// v59: the Playball standard (finder, quote, founder), delete demos, "more of our work" on every demo.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const T1 = "b".repeat(40), T2 = "c".repeat(40);
const spec = { style: "playful", brand: { primary: "#2f5bd8", logo_text: "Playball", logo: "https://pb.test/logo.png" }, receptionist_name: "Eli", sections: [{ type: "receptionist", variant: "chat", title: "Ask Eli", items: [{ q: "Where are you?", a: "Buderim." }] }, { type: "hero", title: "Let's play", images: ["https://studioflowandsystems.app/demo/img/0123456789abcdef.webp"] }, { type: "finder", title: "Pick a day", items: [{ title: "Kickers", tab: "2-3 yrs", when: "Sat 8:30", where: "Buderim", spots: 2 }, { title: "Camp", tab: "6-8 yrs", when: "Jan", spots: 0 }] }, { type: "quote", title: "Party quote", sliders: [{ label: "How many kids?", min: 5, max: 30, unit: "kids" }], fields: ["Date"] }, { type: "founder", title: "Hi, I'm Coach Luke", name: "Luke", text: "I started this to get kids moving." }, { type: "cta", title: "Book" }] };
const DB = { agent_demos: [{ token: T1, kb: { business_name: "Playball" }, vertical: "other", business_name: "Playball" }], team_settings: [{ key: "wsd:" + T1, value: { name: "Playball", website: "https://pb.test", spec } }, { key: "wsd:" + T2, value: { name: "Other", spec } }, { key: "wsdimg:0123456789abcdef", value: { b64: "AAAA" } }, { key: "wsd_index", value: { items: [{ token: T1, name: "Playball", lead_id: null }, { token: T2, name: "Other" }] } }, { key: "wsdimg:work-katia", value: { mime: "image/jpeg", b64: Buffer.from("JPEGDATA").toString("base64"), at: new Date().toISOString() } }] };
const deleted = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const q = decodeURIComponent(qs); const key = (q.match(/key=eq\.([^&]+)/) || [])[1]; const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(key ? t.filter((r) => r.key === key) : t);
    if (m === "DELETE") { deleted.push(key); DB[path] = t.filter((r) => r.key !== key); return Response.json([]); }
    if (m === "POST") { for (const r of [].concat(body)) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } return Response.json([].concat(body)); }
    return Response.json([]); }
  return new Response("", { status: 404 }); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const ctx = { waitUntil: () => {} };
const get = (p) => w.fetch(new Request("https://studioflowandsystems.app" + p, { headers: { "user-agent": "Mozilla/5.0 Chrome" } }), env, ctx);
const html = await (await get(`/demo/${T1}/site?preview=1`)).text();
assert(/class="sec fnd"/.test(html) && /Only 2 left/.test(html) && /Join waitlist/.test(html) && /data-fnd="2-3 yrs"/.test(html), "Booking finder: tabs, 'Only 2 left', 'Join waitlist'");
assert(/data-qt/.test(html) && /How many kids\?/.test(html) && /type="range"/.test(html), "Quote builder with sliders");
assert(/class="sec fdr"/.test(html) && /Coach Luke/.test(html) && /fdr-av/.test(html), "Founder section (initial, never an AI face, when there's no photo)");
assert(/More of our work/.test(html) && /katiatrotsenko\.com/.test(html) && /purelifeforce\.com\.au/.test(html) && /\/demo\/img\/work\/katia\.jpg/.test(html), "Every demo shows our real work: Katia Trotsenko and Pure Life Force");
assert(/<span class="rc-av"><img src="https:\/\/studioflowandsystems\.app\/demo\/img\/p\/b{40}\/[0-9a-f]{8}"/.test(html), "The demo receptionist shows their logo (loaded through Command)");
const wj = await (await get(`/w/demo-${T1}.js?preview=1`)).text();
assert(/demo\/img\/p\/b{40}\/[0-9a-f]{8}/.test(wj), "The live chat widget on the demo wears their logo too");
let r = await get("/demo/img/work/katia.jpg");
assert(r.status === 200 && r.headers.get("content-type") === "image/jpeg", "Work screenshots are served (and refreshed weekly)");
r = await get("/demo/img/work/../../etc.jpg");
assert(r.status === 404, "Only our two showcase sites");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/var WSD_DIRECTOR = WSD_STANDARD \+ `/.test(src) && /var WSD_CRIT_SYSTEM = WSD_STANDARD_CRIT \+ `/.test(src) && /THE STANDARD \(our benchmark demo: Playball Sunny Coast/.test(src), "The design team and critique panel both work to the Playball standard");
// delete
const del = (t, key = "k") => w.fetch(new Request("https://studioflowandsystems.app/api/v1/team/website-demos/" + t, { method: "DELETE", headers: key ? { Authorization: "Bearer " + key } : {} }), env, ctx);
r = await del(T1, "");
assert(r.status === 401 && DB.team_settings.some((x) => x.key === "wsd:" + T1), "Deleting needs the Studio key");
r = await del(T1); const j = await r.json();
assert(j.ok && deleted.includes("wsd:" + T1) && deleted.includes("wsdimg:0123456789abcdef") && j.images === 1, "Delete removes the demo and its AI images");
const idx = DB.team_settings.find((x) => x.key === "wsd_index").value.items;
assert(idx.length === 1 && idx[0].token === T2, "It disappears from the demo list; other demos stay");
r = await get(`/demo/${T1}/site?preview=1`);
assert(r.status === 404 || !/Playball/.test(await r.text()), "Its link stops working");
assert(/data-wd-del=/.test(src) && /Delete the demo for /.test(src), "Each demo in the list has a delete button (with a confirm)");
console.log("v59 designer OK");
