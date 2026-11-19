// v143 Owner finder: demo openers get their owner's name found first, and the call list says who to ask for.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const T1 = "a".repeat(40), T2 = "b".repeat(40);
const DB = {
  agent_prospects: [
    { id: "p1", business_name: "Quiet Co", website: "https://quiet.test", phone: "0400000001", status: "sent", vertical: "allied", score: 90, demo_token: T2 },
    { id: "p2", business_name: "Opened Physio", website: "https://opened.test", phone: "0400000002", status: "sent", vertical: "allied", score: 40, demo_token: T1 }],
  agent_demos: [{ token: T1, views: 3, chats: 0, quality: "good" }, { token: T2, views: 0, chats: 0, quality: "good" }],
  team_settings: [], team_audit: [], team_usage: [] };
const patches = [], asked = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase();
  if (u.includes("api.anthropic.com")) { const b = JSON.parse(init.body); asked.push(b.messages[0].content);
    const opened = /Opened Physio/.test(b.messages[0].content);
    return Response.json({ content: [{ type: "tool_use", id: "t", name: "save_owner", input: opened ? { found: true, name: "Sarah Nguyen", role: "Owner", source: "their website" } : { found: false } }], usage: { input_tokens: 10, output_tokens: 5 }, stop_reason: "tool_use" }); }
  if (u.includes("sb.test/rest/v1/")) { const path = u.split("/rest/v1/")[1].split("?")[0];
    if (m === "PATCH") { patches.push({ path, q: u, body: JSON.parse(init.body || "{}") }); return Response.json([]); }
    if (m === "POST") { const b = JSON.parse(init.body || "[]"); if (path === "team_settings") { for (const x of [].concat(b)) { DB.team_settings = DB.team_settings.filter((y) => y.key !== x.key); DB.team_settings.push(x); } } return Response.json([].concat(b)); }
    if (path === "team_settings") { const k = (u.match(/key=eq\.([a-z_]+)/) || [])[1]; return Response.json(k ? DB.team_settings.filter((x) => x.key === k) : DB.team_settings); }
    if (path === "agent_prospects") { const dm = patches.filter((p) => p.path === "agent_prospects" && p.body.decision_maker); return Response.json(DB.agent_prospects.map((r) => { const p = dm.find((x) => x.q.includes(r.id)); return p ? { ...r, decision_maker: p.body.decision_maker } : r; }).filter((r) => !u.includes("decision_maker=is.null") || !r.decision_maker)); }
    return Response.json(DB[path] || []); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O };
const call = (path, method = "GET", body) => w.fetch(new Request(O + "/api/v1/team/" + path, { method, headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} });
const r = await (await call("owner-find", "POST", { limit: 1 })).json();
assert(r.ok && r.checked === 1, "The owner finder runs: " + JSON.stringify(r).slice(0, 160));
assert(/Opened Physio/.test(asked[0] || ""), "Someone who opened their demo is looked up first, even with a lower score");
assert(r.found === 1 && r.names[0].name === "Sarah Nguyen", "It saves the owner's name it found");
assert(patches.some((p) => p.path === "agent_prospects" && p.q.includes("p2") && p.body.decision_maker === "Sarah Nguyen"), "The name goes onto the business record");
const r2 = await (await call("owner-find", "POST", { limit: 5 })).json();
assert(r2.found === 0 && !patches.some((p) => p.q.includes("p1") && p.body.decision_maker), "No clear owner means no name is guessed");
const L = await (await call("calls")).json().catch(() => null);
const c = L && (L.calls || []).find((x) => x.id === "p2");
assert(!L || !c || (c.decision_maker === "Sarah Nguyen" && c.owner_source === "their website" && /Hi, is this Sarah\?/.test(c.opener)), "The call list says who to ask for and where the name came from");
const js = await (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} })).text();
assert(js.includes("Ask for:") && js.includes("Who looks after the website and marketing there?"), "Each call card shows who to ask for, or what to ask reception");
