// v142 CEO home: one call gives the Today hero its rings, team status, pipeline and done-for-you feed.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const now = new Date().toISOString();
const DB = {
  agent_prospects: [
    { id: "a", status: "new" }, { id: "b", status: "demo_sent", demo_token: "t1" }, { id: "c", status: "interested", demo_token: "t2", call_status: "replied" }],
  agent_demos: [{ token: "t1", views: 2 }, { token: "t2", views: 0 }],
  team_actions: [{ id: "x1", status: "pending", title: "Approve email" }],
  team_audit: [{ at: now, action: "task_doer", detail: "Did 2 of Ty's to-dos" }],
  team_usage: [], team_settings: [] };
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase();
  if (u.includes("sb.test/rest/v1/")) { const path = u.split("/rest/v1/")[1].split("?")[0]; if (m === "GET") return Response.json(DB[path] || []); return Response.json([]); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O };
const r = await w.fetch(new Request(O + "/api/v1/team/ceo-home", { headers: { Authorization: "Bearer k" } }), env, { waitUntil() {} });
const j = await r.json(); if (!j.ok) console.log(r.status, JSON.stringify(j).slice(0,300));
assert(r.status === 200 && j.ok, "The CEO home loads");
assert(typeof j.greeting === "string" && j.greeting.length > 0, "It greets by time of day: " + j.greeting);
assert(j.warm && j.warm.total >= 1, "Warm leads are counted: " + JSON.stringify(j.warm));
assert(j.waiting && j.waiting.total === 1, "Waiting on you counts pending approvals");
assert(j.team && Array.isArray(j.team.leads) && j.team.leads.length >= 1 && j.team.leads.every((x) => ["working", "needs_you", "quiet"].includes(x.status)), "Every team lead has a clear status");
assert(Array.isArray(j.feed), "There is a done-for-you feed");
const bad = await w.fetch(new Request(O + "/api/v1/team/ceo-home"), env, { waitUntil() {} });
assert(bad.status === 401 || bad.status === 403, "It needs the Command key");
const html = await (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} })).text();
assert(html.includes("v142hero") && html.includes("ceoOrb") && html.includes("SFOrb.attach"), "Today shows the hero with the real Command orb");
assert(!/const team = '/.test(html), "The hero doesn't shadow the team() helper");
