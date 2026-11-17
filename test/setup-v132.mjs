// v132 Get set up: client's guided onboarding, live checks, keys checked then sealed, progress visible to Studio only as numbers.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [] };
let seq = 0; const tgs = [];
const STRIPE_OK = "rk_live_" + "a".repeat(40), GHL_OK = "pit-" + "b".repeat(32), LOC = "AbCdEf1234567890", TG_OK = "123456789:" + "C".repeat(35);
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^eq\.(.*)$/); return !m || String(r[k] ?? "") === m[1]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  const auth = (init.headers?.Authorization || init.headers?.authorization || "");
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; continue; } } t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.startsWith("https://api.stripe.com/v1/balance")) return auth === "Bearer " + STRIPE_OK ? Response.json({ object: "balance" }) : Response.json({ error: {} }, { status: 401 });
  if (u.startsWith("https://services.leadconnectorhq.com/locations/")) return auth === "Bearer " + GHL_OK && u.endsWith(LOC) ? Response.json({ location: { id: LOC } }) : Response.json({}, { status: 401 });
  if (u.startsWith("https://api.telegram.org/bot")) { const ok = u.includes(TG_OK); if (/sendMessage/.test(u)) tgs.push(body?.text || ""); return Response.json(ok ? { ok: true, result: /getMe/.test(u) ? { username: "harbour_bot" } : true } : { ok: false }); }
  if (u.includes("api.anthropic.com")) return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
  return Response.json({}); };
const w = (await import(W)).default;
const O = "https://harbour-physio.studioflowandsystems.app", FT = "cd".repeat(24);
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "client-key", FLEET_TOKEN: FT, SEAL_KEY: "s".repeat(64), SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O };
const ctx = { waitUntil() {} };
const call = async (path, b, key = "client-key") => { const r = await w.fetch(new Request(O + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(key ? { Authorization: "Bearer " + key } : {}) }, body: b ? JSON.stringify(b) : undefined }), env, ctx); return { s: r.status, j: await r.json().catch(() => ({})) }; };
let x = await call("/api/v1/team/instance", { business_name: "Harbour Physio", owner_name: "Sam Lee", colours: { primary: "#0f766e" } });
x = await call("/api/v1/team/setup-guide");
assert(x.j.ok && x.j.total === 11 && x.j.steps.find((s) => s.id === "brand").done && !x.j.steps.find((s) => s.id === "stripe").done, "The guide lists 11 steps and checks each one (brand done, Stripe not yet)");
assert(x.j.next === "What your business does", "It points to the next step");
x = await call("/api/v1/team/setup-guide/key", { kind: "stripe", token: "sk_live_" + "z".repeat(30) });
assert(x.s === 400 && /restricted key/.test(x.j.error), "A Stripe key that can move money is refused");
x = await call("/api/v1/team/setup-guide/key", { kind: "stripe", token: "rk_live_" + "w".repeat(40) });
assert(x.s === 400 && /didn't accept/.test(x.j.error), "A key Stripe rejects isn't saved");
x = await call("/api/v1/team/setup-guide/key", { kind: "stripe", token: STRIPE_OK });
assert(x.j.ok && x.j.ends === STRIPE_OK.slice(-4), "A good read-only Stripe key is checked with Stripe, then connected");
assert(!JSON.stringify(DB).includes(STRIPE_OK) && /sealed:v1:/.test(JSON.stringify(DB.team_settings.find((s) => s.key === "client_keys").value)), "The key is stored sealed, never in plain text");
x = await call("/api/v1/team/setup-guide/key", { kind: "ghl", token: GHL_OK, location_id: "WRONG000000" });
assert(x.s === 400, "A GoHighLevel token that doesn't match the Location ID is refused");
x = await call("/api/v1/team/setup-guide/key", { kind: "ghl", token: GHL_OK, location_id: LOC });
assert(x.j.ok, "GoHighLevel connects after a live check");
x = await call("/api/v1/team/setup-guide/key", { kind: "telegram", token: TG_OK });
assert(x.j.ok && /t\.me\/harbour_bot\?start=\d{6}/.test(x.j.telegram?.link || ""), "Telegram connects and gives the pairing link");
x = await call("/api/v1/team/health");
assert(x.j.stripe === true || x.j.ghl === true, "The rest of Command now uses the keys pasted in the guide");
x = await call("/api/v1/team/setup-guide");
const by = (id) => x.j.steps.find((s) => s.id === id);
assert(by("stripe").done && by("ghl").done && !by("telegram").done, "Stripe and GoHighLevel show Done; Telegram waits until they tap Start");
assert(by("stripe").connected_by?.ends === STRIPE_OK.slice(-4) && !JSON.stringify(x.j).includes(STRIPE_OK), "The guide shows who connected it and the last 4 characters only");
x = await call("/api/v1/team/setup-guide/tick", { id: "ghl" });
assert(x.s === 400, "Steps that are checked live can't just be ticked");
x = await call("/api/v1/team/setup-guide/tick", { id: "phone" });
assert(x.j.steps.find((s) => s.id === "phone").done, "Phone step is ticked once it's working");
const r = await w.fetch(new Request(O + "/api/v1/fleet/status", { headers: { Authorization: "Bearer " + FT } }), env, ctx);
const st = await r.json();
assert(st.setup && st.setup.total === 11 && st.setup.done >= 4 && Array.isArray(st.setup.stuck) && !JSON.stringify(st).includes(STRIPE_OK), "Studio's console sees progress (numbers and step names), never keys");
x = await call("/api/v1/team/setup-guide/dismiss", { dismissed: true });
x = await call("/api/v1/team/setup-guide?fresh=0");
assert(x.j.dismissed === true, "The owner can stop it opening at sign-in");
console.log("\nsetup-v132 passed");
