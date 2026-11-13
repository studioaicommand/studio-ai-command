// v68: every demo gets its own Art Director concept; style, hero, fonts and flow can't repeat recent demos;
// photos never repeat on a page, every spot is filled, each is briefed from its section, and Ty's photo rules stick.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const T = "f".repeat(40);
const SAME = "hero:split-arch, receptionist:chat, features:bento, split:circle, gallery:zoom, cta";
const spec0 = { style: "editorial", brand: { primary: "#a08a74", accent: "#3b3029", display_font: "Fraunces", body_font: "Inter" }, sections: [{ type: "hero", variant: "split-arch", title: "Old", images: [] }, { type: "cta", title: "Book" }] };
const look = { images: [{ src: "https://shop.test/a.jpg", alt: "Store" }, { src: "https://shop.test/b.jpg", alt: "Team" }], logos: [], brand: { colour: "#a08a74" }, colours: [{ v: "#a08a74", n: 30 }, { v: "#3b3029", n: 9 }], fonts: [] };
const DB = { agent_demos: [{ token: T, kb: { services: ["Facials", "Laser"] } }], team_settings: [
  { key: "wsd:" + T, value: { name: "Glow Lab", website: "https://shop.test", industry: "skin clinic", spec: spec0, look, chat: [] } },
  { key: "design_brain", value: { lessons: [{ id: "1", at: "x", text: "Photos: never show people sitting at computers" }], recent: [
    { at: "1", industry: "dental", style: "luxe", hero: "split-arch", font: "Fraunces", combo: SAME },
    { at: "2", industry: "gym", style: "editorial", hero: "split-arch", font: "Fraunces", combo: SAME },
    { at: "3", industry: "cafe", style: "editorial", hero: "fullbleed", font: "Playfair Display", combo: SAME }], team: [], reviews: [], approved: [], styles: {} } }] };
const asks = [], gens = [];
let concept, design, director;
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const q = decodeURIComponent(qs); const key = (q.match(/key=eq\.([^&]+)/) || [])[1]; const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(key ? t.filter((r) => r.key === key) : path === "agent_demos" ? t : t);
    if (m === "POST") { for (const r of [].concat(body)) { const i = path === "team_settings" ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json([].concat(body)); }
    return Response.json([]); }
  if (u.includes("api.anthropic.com")) { asks.push(body); const names = (body.tools || []).map((t) => t.name);
    const use = (name, input) => Response.json({ content: [{ type: "tool_use", id: "t", name, input }], stop_reason: "tool_use", usage: { input_tokens: 900, output_tokens: 300 } });
    if (names.includes("save_concept")) return use("save_concept", concept);
    if (names.includes("save_site_design")) return use("save_site_design", design());
    if (names.includes("director_reply")) return use("director_reply", director);
    return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.openai.com/v1/images/generations")) { gens.push(body.prompt); return Response.json({ data: [{ b64_json: Buffer.from("IMG" + gens.length).toString("base64") }] }); }
  if (u.includes("shop.test/")) return new Response(new Uint8Array(40000), { headers: { "content-type": "image/jpeg" } });
  return new Response("", { status: 404 }); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const api = (p, body) => w.fetch(new Request("https://studioflowandsystems.app/api/v1/team/website-demos/" + T + p, { method: "POST", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }), env, { waitUntil: () => {} }).then((r) => r.json());
const rec = () => DB.team_settings.find((x) => x.key === "wsd:" + T).value;
const brain = () => DB.team_settings.find((x) => x.key === "design_brain").value;

// The Art Director tries to repeat the last demos; the code won't let it.
concept = { big_idea: "Glow Lab as a calm skin studio where every plan starts with a skin map", audience: "busy women 30-55", mood: ["calm", "clinical", "warm"], style: "editorial", fonts: { display: "Fraunces", body: "Inter" }, hero: "split-arch",
  flow: ["hero:split-arch", "receptionist:chat", "features:bento", "split:circle", "gallery:zoom", "cta"], signature: "skin map", photo_direction: "soft morning light, cream and cocoa tones, real clients, no clinical blue",
  shots: [{ type: "hero", subject: "A therapist mapping a client's skin under a magnifying lamp" }, { type: "split", subject: "Close-up of a hydrating facial mask being applied" }, { type: "gallery", subject: "Calm treatment room with linen and plants" }, { type: "gallery", subject: "Client smiling at her reflection after a facial" }], why_different: "warmer" };
design = () => ({ style: "editorial", brand: { primary: "#ff0000", accent: "#ff0000", display_font: "Fraunces", body_font: "Inter" }, sections: [
  { type: "hero", variant: "split-arch", title: "Your skin, mapped", images: [] },
  { type: "receptionist", variant: "chat", title: "Ask us", items: [{ q: "Price?", a: "From $99" }] },
  { type: "features", variant: "bento", title: "Treatments", items: [{ title: "Facials", text: "Deep clean", image: "https://shop.test/a.jpg" }, { title: "Laser", text: "Smooth", image: "https://shop.test/a.jpg" }, { title: "Peels", text: "Glow" }] },
  { type: "split", variant: "circle", title: "The skin map", text: "We start with a skin analysis.", image: "https://shop.test/a.jpg" },
  { type: "gallery", variant: "zoom", title: "Inside the studio", images: ["https://shop.test/b.jpg"] },
  { type: "cta", title: "Book a skin map" }] });
const r = await api("/regenerate", {});
const sp = rec().spec, hero = sp.sections.find((s) => s.type === "hero");
assert(asks.some((a) => a.tools?.[0]?.name === "save_concept") && /THE LAST 3 DEMOS/.test(JSON.stringify(asks.find((a) => a.tools?.[0]?.name === "save_concept"))), "An Art Director writes a concept for THIS business first, seeing the last demos");
assert(/ART DIRECTION \(binding/.test(JSON.stringify(asks.find((a) => a.tools?.[0]?.name === "save_site_design"))) && /skin map/.test(JSON.stringify(asks.find((a) => a.tools?.[0]?.name === "save_site_design"))), "The designer builds from that concept");
assert(sp.style !== "editorial" && sp.style === "luxe", "Style can't repeat the last two demos, and the swap fits the industry (skin clinic -> " + sp.style + ")");
assert(hero.variant !== "split-arch" && hero.variant !== "fullbleed", "Hero layout can't repeat the last two demos (got " + hero.variant + ")");
assert(sp.brand.display_font !== "Fraunces" && sp.brand.display_font !== "Playfair Display" && sp.brand.body_font, "Fonts can't repeat recent demos (got " + sp.brand.display_font + " + " + sp.brand.body_font + ")");
assert(sp.variety?.varied && sp.variety.similarity < 0.6, "A page whose flow matches a recent demo is reshuffled with other layouts (" + JSON.stringify(sp.variety) + ")");
assert(sp.brand.primary === "#a08a74", "Still in their brand colours");
const b = brain(); const last = b.recent.at(-1);
assert(last.font === sp.brand.display_font && last.hero === hero.variant, "Each build's fonts and hero are remembered so the next one avoids them");

// Photos
const all = [];
for (const s of sp.sections) { if (Array.isArray(s.images)) all.push(...s.images); if (s.image) all.push(s.image); for (const x of s.items || []) if (x && x.image) all.push(x.image); }
assert(all.length === new Set(all).size, "No photo appears twice on the page");
assert(sp.sections.find((s) => s.type === "gallery").images.length === 3 && sp.sections.find((s) => s.type === "features").items.every((x) => x.image) && hero.images.length === 1, "Every photo spot is filled (hero, every card, gallery of 3)");
assert(gens.some((g) => /magnifying lamp/.test(g)) && gens.some((g) => /hydrating facial mask/.test(g) || /Calm treatment room/.test(g)), "Photos are briefed from the Art Director's shot list");
assert(gens.every((g) => /never show people sitting at computers/.test(g)) && gens.every((g) => /soft morning light/.test(g)), "Ty's photo rule and the art direction go into EVERY photo");
assert(/The idea: Glow Lab as a calm skin studio/.test(JSON.stringify(rec().chat)) || /Glow Lab as a calm skin studio/.test(JSON.stringify(sp.concept)), "The concept's idea is kept with the demo");

// Ty says a photo rule once; it's saved for every future demo
director = { reply: "Got it. Section 1: I'll make a new photo of a real client, not a model.", changes: [{ section: 1, what: "New hero photo of a real-looking client", new_photo: "Real client after treatment" }], ready: true, photo_rule: "Use real-looking everyday clients, never glossy models" };
const t = await api("/talk", { message: "again no models in photos please, I keep saying this, real people" });
assert(t.rule_saved === "Use real-looking everyday clients, never glossy models" && brain().lessons.some((l) => l.text === "Photos: Use real-looking everyday clients, never glossy models"), "A photo rule is saved the first time Ty says it (no need to repeat himself)");
const t2 = await api("/talk", { message: "no models" });
assert(!t2.rule_saved && brain().lessons.filter((l) => /never glossy models/.test(l.text)).length === 1, "The same rule isn't saved twice");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/Saved as a photo rule for every future demo/.test(src), "Command shows Ty when a photo rule is saved");
console.log("variety-v68 OK");
