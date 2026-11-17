// v130: white-label clients are always separate, and their AI team never gets Studio's brief or prices.
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
const brief = "Vet clinic in Maroochydore. Consults $95, vaccinations $85, desexing from $280. Dogs, cats and rabbits.";
let x = await call("/api/v1/team/instance", { business_name: "Sunny Paws Vet Clinic", product_name: "Sunny Paws Command", owner_name: "Kate Lee", owner_first: "Kate", industry: "veterinary clinic", location: "Maroochydore QLD", website: "", brief, is_studio: false });
assert(x.s === 200 && x.j.profile.brief === brief, "A client copy saves what the business does");
x = await call("/api/v1/team/chat", { department: "head_of_sales", message: "What do we sell?" });
let sys = JSON.stringify(asks.at(-1)?.system || "");
assert(/desexing from \$280/.test(sys) && /Sunny Paws Vet Clinic's own private Command/.test(sys), "Department heads get the client's own brief");
assert(!/builds websites and backend systems/.test(sys) && !/\$697|\$2,197|\$1,997|\$2,997|\$1,500 setup/.test(sys) && !/STUDIO AI CHARTER \(owner: Ty/.test(sys) && /Sunny Paws Command CHARTER/.test(sys), "Department heads never see Studio's brief, charter, services or prices");
const n0 = asks.length;
x = await call("/api/v1/operator/chat", { message: "What are our prices?" });
sys = asks.slice(n0).map((a) => JSON.stringify(a.system || "")).sort((a, b) => b.length - a.length)[0] || "";
assert(/desexing from \$280/.test(sys) && !/builds websites and backend systems/.test(sys), "Their main AI chat gets their brief, not Studio's");
x = await call("/api/v1/team/instance");
assert(x.j.studio_main === false, "A client's copy is not Studio's main Command");
// Studio's own Command can never be rebranded into a client's copy
DB.team_settings = []; await call("/api/v1/team/instance", { is_studio: true });
DB.team_settings = [];
const MAIN = "https://studioflowandsystems.app", envM = { ...env, PUBLIC_ORIGIN: MAIN };
const callM = async (path, b) => { const r = await w.fetch(new Request(MAIN + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer client-key" }, body: b ? JSON.stringify(b) : undefined }), envM, ctx); return { s: r.status, j: await r.json().catch(() => ({})) }; };
x = await callM("/api/v1/team/instance");
assert(x.j.studio_main === true, "Studio's main Command knows it is the main one");
x = await callM("/api/v1/team/instance", { business_name: "Harbour Physio", is_studio: false });
assert(x.s === 400 && /own separate Command/.test(x.j.error), "Studio's main Command refuses to become a client copy and points to the setup kit");
x = await callM("/api/v1/instance/brand");
assert(x.j.custom === false && x.j.modules.outreach === true, "Studio's main Command is unchanged");
// new-client setup sets their plan
DB.team_settings = [];
const envS = { ...env, SETUP_TOKEN: "setup-tok" };
let r = await w.fetch(new Request(O + "/api/v1/setup", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer setup-tok" }, body: JSON.stringify({ tier: "company", instance: { business_name: "Harbour Physio", owner_name: "Sam Lee", brief: "Physio clinic.", modules: { outreach: false } }, owner: { name: "Sam Lee" }, invites: [] }) }), envS, ctx);
let j = await r.json();
assert(j.ok && DB.team_settings.find((s) => s.key === "plan_tier")?.value?.tier === "company", "The setup kit's plan choice (Growth) is applied to the new copy");
assert(DB.team_settings.find((s) => s.key === "instance")?.value?.brief === "Physio clinic.", "The setup kit's business brief is saved on the new copy");
console.log("\nseparate-v130 passed");
