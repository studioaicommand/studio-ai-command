// v67: the Web Design Director talks first, builds only the agreed sections, makes photos, keeps THEIR brand colours, reports honestly.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const T = "e".repeat(40);
const RED = "#b8322e", BEIGE = "#a08a74", COCOA = "#3b3029";
const spec0 = { style: "editorial", brand: { primary: RED, accent: RED, bg: "#fbf6f4", ink: "#1d1a19", display_font: "DM Serif Display", body_font: "Inter", logo_text: "MySkin" },
  sections: [
    { type: "hero", variant: "split-arch", kicker: "Family-run", title: "Skin you feel good in, planned around you.", highlight: "planned around you", cta: "Book a consultation", images: [], badges: ["Nurse-led care"] },
    { type: "split", title: "Treatments that fit your life", text: "Laser, injectables and skin.", image: "https://myskin.test/room.jpg" },
    { type: "cta", title: "Book your consultation" }
  ], report: { headline: "x", leaks: [] } };
const look = { images: [{ src: "https://myskin.test/room.jpg", alt: "Room" }], logos: [], brand: { colour: BEIGE }, colours: [{ v: BEIGE, n: 30 }, { v: COCOA, n: 9 }], neutrals: [], fonts: [] };
const DB = { agent_demos: [{ token: T, kb: { business_name: "MySkin" }, vertical: "other", business_name: "MySkin" }], team_settings: [{ key: "wsd:" + T, value: { name: "MySkin Clinics", website: "https://myskin.test", industry: "skin clinic", spec: structuredClone(spec0), look, chat: [{ at: "x", r: "ty", t: "change the red hero image" }, { at: "x", r: "ai", t: "Updated." }] } }] };
let director = null, editor = null, openaiOk = true; const asks = [], gens = [], pexels = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const q = decodeURIComponent(qs); const key = (q.match(/key=eq\.([^&]+)/) || [])[1]; const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(key ? t.filter((r) => r.key === key) : t);
    if (m === "POST") { for (const r of [].concat(body)) { const i = path === "team_settings" ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json([].concat(body)); }
    return Response.json([]); }
  if (u.includes("api.anthropic.com")) { asks.push(body); const names = (body.tools || []).map((t) => t.name);
    const use = (name, input) => Response.json({ content: [{ type: "tool_use", id: "t1", name, input }], stop_reason: "tool_use", usage: { input_tokens: 1000, output_tokens: 300 } });
    if (names.includes("director_reply")) return use("director_reply", director);
    if (names.includes("save_sections")) return use("save_sections", editor());
    return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.openai.com/v1/images/generations")) { gens.push(body.prompt); return openaiOk ? Response.json({ data: [{ b64_json: Buffer.from("WEBPDATA").toString("base64") }] }) : new Response("{}", { status: 500 }); }
  if (u.includes("api.pexels.com")) { pexels.push(u); return Response.json({ photos: [{ src: { large2x: "https://images.pexels.test/p1.jpg" }, photographer: "Ana", url: "https://pexels.test/p1" }] }); }
  if (u.includes("images.pexels.test") || u.includes("myskin.test/room.jpg")) return new Response(new Uint8Array(40000), { headers: { "content-type": "image/jpeg" } });
  return new Response("", { status: 404 }); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const ctx = { waitUntil: () => {} };
const api = (p, body) => w.fetch(new Request("https://studioflowandsystems.app/api/v1/team/website-demos/" + T + p, { method: body ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }), env, ctx).then((r) => r.json());
const rec = () => DB.team_settings.find((x) => x.key === "wsd:" + T).value;

let j = await api("");
assert(j.demo.map.length === 3 && j.demo.map[0].missing && /NO PHOTO/.test(j.demo.map[0].photo) && !j.demo.map[1].missing, "Page map numbers every section and flags the hero showing a plain colour block");

director = { reply: "Got it: section 1, the hero. I'll swap the red block for a real photo of a calm, light treatment room in their beige tones. Sound right?", changes: [{ section: 1, what: "Replace the colour block with a photo of a calm treatment room", new_photo: "A calm, light skin clinic treatment room, beige and cream tones, morning light" }], ready: true, lesson: "Hero photos must show the real service, never a plain colour block" };
const before = JSON.stringify(rec().spec);
j = await api("/talk", { message: "the top hero red image needs to change to a real photo" });
assert(j.ok && /section 1/i.test(j.reply) && j.ready && j.changes.length === 1 && !j.built, "Talk: the Director replies with its plan (which section, what) before building");
assert(JSON.stringify(rec().spec) === before && rec().pending.changes.length === 1, "Talking changes nothing; the plan waits for Ty");
assert(/WHAT TY HAS ASKED BEFORE[\s\S]*change the red hero image/.test(JSON.stringify(asks.at(-1))) && /PAGE MAP/.test(JSON.stringify(asks.at(-1))) && /BRAND RULE/.test(JSON.stringify(asks.at(-1))), "It sees the page map, Ty's earlier requests (so repeats are caught) and the brand rule");

editor = () => { const msg = JSON.stringify(asks.at(-1).messages); const url = (msg.match(/https:\/\/studioflowandsystems\.app\/demo\/img\/[0-9a-f]{16}\.webp/) || [""])[0]; return { sections: [{ n: 1, section: { ...spec0.sections[0], images: [url] } }, { n: 2, section: { ...spec0.sections[1], title: "SNEAKY CHANGE" } }], results: [{ change: "hero photo", done: true }] }; };
j = await api("/talk", { message: "yes" });
const s1 = rec().spec;
assert(j.built && /^Done\./.test(j.summary) && j.results[0].done, "Saying 'yes' builds it and reports each change: " + j.summary.slice(0, 80));
assert(/\/demo\/img\/[0-9a-f]{16}\.webp$/.test(s1.sections[0].images[0]) && gens.length >= 1 && /skin clinic/.test(gens[0]) && /no text/.test(gens[0]), "A new niche photo was made and placed in the hero");
assert(s1.sections[1].title === "Treatments that fit your life" && JSON.stringify(s1.sections[2]) === JSON.stringify(spec0.sections[2]), "Sections that weren't agreed stay exactly the same (even if the AI tried to change them)");
assert(s1.brand.primary === BEIGE && s1.brand.accent === COCOA, "The made-up red is replaced by THEIR brand colours (theme colour + colours their site uses)");
assert(!j.map[0].missing && rec().pending === null && rec().versions.length === 1, "Map updates, plan cleared, Undo available");
const brain = DB.team_settings.find((x) => x.key === "design_brain").value;
assert(brain.lessons.some((l) => /plain colour block/.test(l.text)), "It learns the lesson for future demos");

// honest failure: photo service down, no stock key
openaiOk = false;
director = { reply: "Section 2: I'll swap the room photo for a smiling client photo.", changes: [{ section: 2, what: "New photo of a smiling client", new_photo: "Smiling woman after a facial" }], ready: true };
editor = () => ({ sections: [], results: [{ change: "photo", done: true }] });
await api("/talk", { message: "section 2 photo, show a happy client" });
const spec1 = JSON.stringify(rec().spec);
j = await api("/build-plan", {});
assert(!j.results[0].done && /couldn't make a new photo/i.test(j.results[0].note) && /✗/.test(j.summary) && JSON.stringify(rec().spec) === spec1 && rec().pending.changes.length === 1, "If a photo can't be made it says so plainly, changes nothing, and keeps the plan to retry");

// stock photo fallback
env.PEXELS_API_KEY = "p";
editor = () => ({ sections: [], results: [{ change: "photo", done: true }] });
j = await api("/build-plan", {});
const stock = DB.team_settings.find((x) => x.key.startsWith("wsdimg:") && x.value.model === "pexels");
assert(j.results[0].done && pexels.length === 1 && /skin%20clinic/.test(pexels[0]) && stock && /\/demo\/img\/[0-9a-f]{16}\.webp$/.test(rec().spec.sections[1].image), "If the AI photo fails, a matching stock photo (Pexels) is pulled, stored and used");

// renderer fixes
const html = await (await w.fetch(new Request(`https://studioflowandsystems.app/demo/${T}/site?preview=1`, { headers: { "user-agent": "Mozilla/5.0 Chrome" } }), env, ctx)).text();
assert(/<em class="hl">planned around you\.<\/em>/.test(html), "The full stop stays with its words (no lone '.')");
assert(/position:relative;white-space:normal\}/.test(html) && !/position:relative;white-space:nowrap\}/.test(html), "Highlighted headline words wrap instead of running behind the photo");
assert(/\.wk\{background:color-mix\(in srgb,#0b111c 90%,var\(--p\)\);color:#fff\}/.test(html), "'More of our work' is always a dark band with readable white text");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/id="wdMap"/.test(src) && /data-wd-build>Build it</.test(src) && /'\/talk'/.test(src) && /nothing changes until you press Build it/.test(src), "Command: page map, talk-first chat and a Build it button");
console.log("director-v67 OK");
