// v144 full audit fixes: background jobs can save their progress, client copies' scheduled shifts talk about the client's
// own business (not Studio's website or Ty), the CEO home greets the owner by name, and a new client defaults to current prices.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [], agent_prospects: [{ id: "p1", business_name: "Harbour Physio", phone: "0400000001", status: "sent", website: "https://harbour.test" }] }; let seq = 0; const asks = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^eq\.(.*)$/); return !m || String(r[k] ?? "") === m[1]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = JSON.parse(init.body); } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); }
    return Response.json([]); }
  if (u.includes("api.anthropic.com")) { asks.push(body); return Response.json({ content: [{ type: "text", text: "All quiet." }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  return Response.json({ ok: true }); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://sunnypaws.studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O };
const call = async (path, b) => { const r = await w.fetch(new Request(O + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }); let j = null; try { j = await r.clone().json(); } catch {} return { s: r.status, j }; };

// Studio's own copy first
let x = await call("/api/v1/team/ceo-home");
assert(/^Good (morning|afternoon|evening), Ty$/.test(x.j.greeting), "Studio's home greets Ty by name: " + x.j.greeting);
await call("/api/v1/team/owner-find", { limit: 1 });
await call("/api/v1/team/leak-tidy", { limit: 1 });
assert(DB.team_settings.some((r) => r.key === "owner_find") && DB.team_settings.some((r) => r.key === "leak_tidy"), "Background jobs can save their progress (they used to be refused silently)");

// Then make it a client copy
await call("/api/v1/team/instance", { business_name: "Sunny Paws Vet Clinic", product_name: "Sunny Paws Command", owner_name: "Kate Lee", owner_first: "Kate", industry: "veterinary clinic", location: "Noosa", website: "https://sunnypaws.test", template: "vet" });
x = await call("/api/v1/team/ceo-home");
assert(/, Kate$/.test(x.j.greeting), "A client's home greets their owner by name: " + x.j.greeting);
asks.length = 0;
x = await call("/api/v1/team/shifts/brand_radar/run", {});
const msg = JSON.stringify(asks.map((a) => a.messages[0]));
assert(asks.length > 0, "The client's brand radar shift runs");
assert(!/studioflowandsystems\.com/.test(msg) && msg.includes("sunnypaws.test"), "A client's brand radar checks the client's own website, not Studio's");
asks.length = 0;
await call("/api/v1/team/shifts/marketing_review/run", {});
const msg2 = JSON.stringify(asks.map((a) => a.messages[0]));
assert(!/\$20k/.test(msg2) && !/\bTy\b/.test(msg2), "A client's shifts don't mention Studio's $20k target or Ty");

const js = await (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} })).text();
assert(js.includes('label: "Setup price ($)", type: "number", value: 1500') && js.includes('label: "Monthly price ($)", type: "number", value: 697'), "Adding a client starts at today's prices ($1,500 setup, $697 a month)");
assert(!js.includes("7 department heads online"), "Connections no longer says 7 department heads");
