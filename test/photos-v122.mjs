// v122 Web designer photos: journey steps and image cards get real photos, and "Done" only when they really landed.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const O = "https://studioflowandsystems.app";
const T = "9".repeat(40);
const spec = { style: "modern", brand: { primary: "#123456", accent: "#ffaa00", logo: "" }, sections: [
  { type: "hero", title: "Solar that pays", images: ["https://studioflowandsystems.app/demo/img/aaaaaaaaaaaaaaaa.webp"] },
  { type: "features", title: "What we install", items: [{ title: "Panels", text: "Tier 1" }, { title: "Batteries", text: "Store it" }, { title: "Chargers", text: "EV ready" }] },
  { type: "journey", variant: "pinned", title: "One day on your roof", steps: [{ label: "Morning", title: "Sunrise", text: "Panels wake up" }, { label: "Midday", title: "Peak", text: "Full power" }, { label: "Evening", title: "Store", text: "Battery fills" }, { label: "Night", title: "Lights on", text: "Home stays lit" }] }] };
const DB = { team_settings: [{ key: "wsd:" + T, value: { token: T, name: "Sunny Solar", industry: "solar", website: "https://sunny.test", spec, chat: [], versions: [] } }, { key: "wsd_index", value: { items: [{ token: T, cost_aud: 1 }] } }], team_usage: [], team_audit: [] };
let seq = 0, genCalls = 0, designerKeepsEmpty = true, photoServiceUp = true;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq)\.(.*)$/); if (!m) return true; return m[1] === "eq" ? String(r[k] ?? "") === m[2] : String(r[k] ?? "") !== m[2]; });
const mock = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") return Response.json(t.filter((r) => match(r, q)));
    if (m === "POST") { const rows = [].concat(body).map((r) => { if (r.key) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; return t[i]; } } const n = { id: "id" + (++seq), ...r }; t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.openai.com/v1/images")) { genCalls++; if (!photoServiceUp) return Response.json({ error: { message: "down" } }, { status: 500 }); return Response.json({ data: [{ b64_json: "UklGRg==" }] }); }
  if (u.includes("api.anthropic.com")) { const tools = (body.tools || []).map((t) => t.name);
    const tu = (name, input) => Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name, input }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 10 } });
    if (tools.includes("director_reply")) return tu("director_reply", { reply: "I'll put a photo on each step.", changes: [{ section: 3, what: "Give every step in One day on your roof its own photo" }], ready: true });
    if (tools.includes("save_sections")) { const sec = JSON.parse(JSON.stringify(spec.sections[2])); if (!designerKeepsEmpty) sec.title = "One day on your roof (new)"; return tu("save_sections", { sections: [{ n: 3, section: { ...sec, title: sec.title + " " } }], results: [{ done: true }] }); }
    return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) return Response.json({ ok: true, result: { message_id: 1 } });
  if (/\/demo\/img\//.test(u)) return new Response(new Uint8Array(30000), { headers: { "content-type": "image/webp" } });
  return Response.json({}); };
Object.defineProperty(globalThis, "fetch", { value: mock, writable: true, configurable: true });
globalThis.caches = undefined;
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", PUBLIC_ORIGIN: O };
const call = async (path, b) => { const r = await w.fetch(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const rec = () => DB.team_settings.find((x) => x.key === "wsd:" + T).value;

let r = await call("/website-demos/" + T);
const m2 = (r.j.demo?.map || []).find((x) => x.n === 3) || {}
assert(m2.missing && /4 steps have NO PHOTO/.test(m2.photo), "The page map now shows the journey steps have no photos (the designer can see the problem)");
photoServiceUp = false;
await call("/website-demos/" + T + "/talk", { message: "generate photos for each step" });
r = await call("/website-demos/" + T + "/build-plan", {});
assert(!/^Done\./.test(r.j.summary) && /✗/.test(r.j.summary) && /still have no photo|No new photo/.test(r.j.summary), "If the photos don't land, it says so honestly (no more 'Done' with empty spots): " + r.j.summary.slice(0, 120));
photoServiceUp = true; genCalls = 0;
r = await call("/website-demos/" + T + "/talk", { message: "make the hero darker" });
const secs = rec().spec.sections, steps = secs[2].steps;
assert(steps.every((s) => /\/demo\/img\/[0-9a-f]{16}\.webp$/.test(s.image || "")) && new Set(steps.map((s) => s.image)).size === 4, "The moment Ty talks to the designer, every empty journey step gets its own fresh photo, written into that step");
assert(secs[1].items.every((x) => /\/demo\/img\//.test(x.image || "")), "Every feature card gets a photo too");
assert(genCalls >= 7 && (rec().chat || []).some((c) => /Filled 7 empty photo spots/.test(c.t)), "Photos are really generated and the chat says exactly how many were filled");
assert(!(await call("/website-demos/" + T)).j.demo.map.some((m) => m.missing), "No section is left without its photos");
const html = await (await w.fetch(new Request(O + "/demo/" + T + "/site?preview=1"), env, { waitUntil() {} })).text();
assert(steps.every((s) => html.includes(s.image.replace(O, "")) || html.includes(s.image)), "And they show on the page (no more colour blur)");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/var WSD_IMG_MAX = 16;/.test(src) && /\["Concept photos", out\(ai\(\(\) => wsdPhotoSweep\(e, 5\)\)\)/.test(src) && /kind==='photo_fill'/.test(src), "Up to 16 photos per concept; concepts already built get their gaps filled when opened and by an hourly sweep");
// One pass over every drafted concept: only concepts with gaps get a photo-only fix queued
const T2 = "8".repeat(40);
DB.team_settings.push({ key: "wsd:" + T2, value: { token: T2, name: "Gap Co", spec: { style: "modern", brand: {}, sections: [{ type: "journey", variant: "sky", title: "A day", steps: [{ title: "a" }, { title: "b" }] }] }, chat: [] } });
DB.team_settings.find((x) => x.key === "wsd_index").value.items.push({ token: T2, cost_aud: 1 });
const qs = []; env.COMMAND_QUEUE = { send: async (b) => { qs.push(b); } };
const designBefore = JSON.stringify(DB.team_settings.find((x) => x.key === "wsd:" + T2).value.spec, (k, v) => (k === "image" || k === "ai_images" ? undefined : v));
r = await call("/website-demos/fix-photos", {});
assert(r.j.ok && r.j.with_gaps === 1 && qs.length === 1 && qs[0].kind === "photo_fill" && qs[0].token === T2, "Fix all: goes through every drafted concept and queues a photo-only fix for each one missing photos (" + r.j.concepts + " checked)");
await w.queue({ messages: [{ body: qs[0], ack() {}, retry() {} }] }, env, { waitUntil() {} });
const g = DB.team_settings.find((x) => x.key === "wsd:" + T2).value
assert(g.spec.sections[0].steps.every((x) => /\/demo\/img\//.test(x.image || "")) && JSON.stringify(g.spec, (k, v) => (k === "image" || k === "ai_images" ? undefined : v)) === designBefore, "Only the missing photos are added: the design, copy and layout are untouched");
const s2 = (await import("node:fs")).readFileSync(W, "utf8");
assert(/\["Fix all concept photos \(once\)", out\(\(\) => wsdPhotoFixAll\(e\)\)/.test(s2) && /fn\("fix_demo_photos"/.test(s2), "Runs once by itself after the deploy, and Command can run it again any time");
console.log("photos-v122 OK");
