// v43 gate: a second copy of Command, set up for a client, runs clean in their brand with only their features.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [] };
const asks = [];
let seq = 0;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^eq\.(.*)$/); return !m || String(r[k] ?? "") === m[1]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { asks.push(body); return Response.json({ content: [{ type: "text", text: "Done." }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) return Response.json({ ok: true, result: { message_id: 1 } });
  return Response.json({}); };
const w = (await import(W)).default;
const O = "https://sunnypaws.studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "client-key", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O };
const ctx = { waitUntil() {} };
const call = async (path, b, key = "client-key") => { const r = await w.fetch(new Request(O + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(key ? { Authorization: "Bearer " + key } : {}) }, body: b ? JSON.stringify(b) : undefined }), env, ctx); const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch {} return { s: r.status, j, t, h: r.headers }; };
let x = await call("/api/v1/instance/brand", null, "");
assert(x.j.ok && x.j.custom === false && x.j.modules.outreach === true, "A fresh copy starts as Studio's own (nothing changes for Ty's Command)");
x = await call("/api/v1/team/instance", { business_name: "Sunny Paws Vet Clinic", product_name: "Sunny Paws Command", owner_name: "Kate Lee", owner_first: "Kate", industry: "veterinary clinic", location: "Maroochydore QLD", website: "https://sunnypaws.test", booking_link: "https://sunnypaws.test/book", colours: { primary: "#1f7a8c", accent: "#e07a5f" }, template: "other", apply_template: true, mission_target: 60000, modules: { outreach: false, receptionist_product: false, offers_page: false, site_assistant: false } });
assert(x.s === 200 && x.j.applied?.label, "Owner sets the copy up for a client with an industry template");
x = await call("/api/v1/instance/brand", null, "");
assert(x.j.custom && x.j.business_name === "Sunny Paws Vet Clinic" && x.j.product_name === "Sunny Paws Command" && x.j.colours.primary === "#1f7a8c" && x.j.owner_first === "Kate", "The login screen and app get the client's name, product name and colours");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
x = await call("/api/v1/team/instance/asset", { kind: "icon", type: "image/png", b64: png.toString("base64") });
assert(x.j.ok, "Owner uploads the client's app icon");
x = await call("/api/v1/team/instance/asset", { kind: "logo", type: "image/svg+xml", b64: "PHN2Zz4=" });
assert(x.s === 400, "SVG uploads are refused (they could carry scripts)");
let r = await w.fetch(new Request(O + "/app/icon.png"), env, ctx);
assert(r.headers.get("content-type") === "image/png" && Buffer.from(await r.arrayBuffer()).equals(png), "Their home-screen icon is served");
r = await w.fetch(new Request(O + "/app/manifest.webmanifest"), env, ctx);
const mf = await r.json();
assert(mf.name === "Sunny Paws Command" && mf.theme_color === "#1f7a8c", "Their phone app is named and coloured as theirs");
for (const [path, what] of [["/api/v1/team/prospects", "prospect lists"], ["/api/v1/team/website-demos", "website demos"], ["/api/v1/team/clients", "receptionist clients"], ["/api/v1/team/offers", "Studio's offers"]]) { x = await call(path); assert(x.s === 404 && x.j.module, `Switched-off feature is gone: ${what}`); }
for (const path of ["/demo/karinya", "/w/demo-karinya.js", "/offers", "/api/v1/site/chat"]) { r = await w.fetch(new Request(O + path), env, ctx); assert(r.status === 404, `Studio's public pages don't exist on the client's copy: ${path}`); }
x = await call("/api/v1/team/instance", { modules: { outreach: true, offers_page: false } });
x = await call("/api/v1/instance/brand", null, "");
assert(x.j.modules.outreach === false, "Lead finding can't be switched on in a client's copy, even through the API");
x = await call("/api/v1/team/instance");
assert(!("outreach" in x.j.modules) && "site_assistant" in x.j.modules, "The lead-finding switch isn't shown on a client's copy");
x = await call("/api/v1/team/charter");
assert(/Sunny Paws Vet Clinic/.test(x.j.charter) && /Kate/.test(x.j.charter) && !/Studio Flow/.test(x.j.charter) && /\$60,000 a month/.test(x.j.charter), "The AI team's charter is written for the client's business");
const shifts = DB.team_settings.find((s) => s.key === "shifts").value;
assert(shifts.find((s) => s.id === "prospect_hunt").enabled === false && shifts.find((s) => s.id === "morning_briefing").enabled === true, "Daily shifts match a client (no Studio prospect hunts)");
assert((DB.team_memory || []).some((m) => /Sunny Paws Vet Clinic/.test(m.fact)), "The basics are saved to team memory");
x = await call("/api/v1/team/chat", { department: "chief_of_staff", message: "What should I focus on today?" });
let sys = JSON.stringify(asks.at(-1)?.system || "");
assert(/THIS COMMAND BELONGS TO Sunny Paws Vet Clinic/.test(sys) && !/Studio Flow (&|&amp;|and) Systems/.test(sys) && !/\bTy\b/.test(sys), "Every department works for the client, with Studio's name and Ty's name swapped out");
x = await call("/api/v1/operator/chat", { message: "hi" });
sys = JSON.stringify(asks.at(-1)?.system || "");
assert(/THIS COMMAND BELONGS TO Sunny Paws Vet Clinic/.test(sys) && /Sunny Paws Command/.test(sys), "Their Studio AI chat (Sunny Paws Command) knows whose business it is");
x = await call("/api/v1/team/settings", { autopilot: {} }, "wrong-key");
assert(x.s === 401, "Their copy has its own key");
x = await call("/api/v1/team/instance", { is_studio: true });
x = await call("/api/v1/instance/brand", null, "");
assert(!x.j.custom && x.j.modules.outreach, "Turning it back into Studio's own Command restores everything");
// one-time setup used by the new-client script
DB.team_settings = []; env.SETUP_TOKEN = "setup-123";
const setup = (tok, b) => w.fetch(new Request(O + "/api/v1/setup", { method: "POST", headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" }, body: JSON.stringify(b) }), env, ctx);
r = await setup("wrong", {});
assert(r.status === 404, "The setup door is invisible without the one-time setup token");
r = await setup("setup-123", { instance: { business_name: "Harbour Physio", owner_name: "Sam Ng", template: "allied_health", mission_target: 45000, modules: { outreach: false } }, owner: { name: "Sam Ng" }, invites: [{ name: "Jess", role: "manager" }] });
const sj = await r.json();
assert(r.status === 200 && sj.invites.length === 2 && sj.invites[0].role === "owner" && /#invite=/.test(sj.invites[0].link) && sj.applied?.label, "Setup brands the copy, applies the template and creates the owner's invite");
x = await call("/api/v1/team/charter");
assert(/Harbour Physio/.test(x.j.charter) && /AHPRA/.test(x.j.charter), "Health template brings the right compliance rules (AHPRA)");
r = await setup("setup-123", { instance: { business_name: "Someone Else" } });
assert(r.status === 409, "Setup only works once");
console.log("v43 white-label copy gate: all passed");
process.exit(0);
