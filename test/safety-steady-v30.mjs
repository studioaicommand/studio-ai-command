// v30.1: steady safety test: retries when the AI service is busy.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const mk = (id, vertical, kb, knowledge = {}) => ({ id, business_name: kb.clinic_name, vertical, kb, knowledge });
const DB = { agent_clients: [
  mk("t1", "other", { clinic_name: "LeakStop Shower Repairs", clinic_type: "shower repair and waterproofing" }),
  mk("p1", "property", { clinic_name: "Bayside Rentals", clinic_type: "property management" }),
  mk("k1", "other", { clinic_name: "Katia Trotsenko", clinic_type: "relationship mentoring and coaching" }),
  mk("d1", "dental", { clinic_name: "Total Dental Care Maroubra", clinic_type: "family dental practice" }),
  mk("m1", "allied", { clinic_name: "Integrated Physio", clinic_type: "physiotherapy clinic", locations: [{ name: "Indooroopilly" }, { name: "Kenmore" }] }),
], team_settings: [] };
const parseQ = (qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order"].includes(k)).map(([k, v]) => [k, v.replace(/^eq\./, "")]);
const prompts = {};
let fails = 0, alwaysBusy = false, blankGrader = false;
globalThis.fetch = async (u, init = {}) => { u = String(u); const method = init.method || "GET"; const body = init.body ? JSON.parse(init.body) : undefined;
  if (u.startsWith("https://sb.test/rest/v1/")) { const [path, qs = ""] = u.slice(24).split("?"); const t = DB[path] || (DB[path] = []); const f = parseQ(qs); const rows = t.filter((r) => f.every(([k, v]) => String(r[k]) === v));
    if (method === "PATCH") { rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } if (method === "POST") return Response.json([body]); return Response.json(rows); }
  if (u.startsWith("https://api.anthropic.com")) {
    if (alwaysBusy || fails > 0) { fails--; return new Response(JSON.stringify({ error: { type: "overloaded_error" } }), { status: 529 }); }
    if (/You grade/.test(body.system || "")) { if (blankGrader && /haiku/.test(body.model)) return Response.json({ content: [{ type: "thinking", thinking: "hmm" }], stop_reason: "max_tokens" }); return Response.json({ content: [{ type: "text", text: blankGrader ? "Looking at this reply...\nPASS: handled safely" : "PASS: fine" }] }); }
    const sys = Array.isArray(body.system) ? body.system.map((x) => x.text).join("") : body.system; const q = body.messages[0].content; prompts[q] = sys;
    if (/Sam Taylor/.test(q) && body.messages.length === 1) return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu1", name: "pass_to_team", input: { name: "Sam Taylor", phone: "0412 345 678", reason: "callback" } }] });
    return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "Get everyone out now and call 000 or the gas emergency line. Turn off the main switch if safe; turn off the water at the main. This is urgent and we'll pass it on." }] }); }
  return Response.json({}); };
const mod = await import(W);
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc" };
const call = async (path, b) => (await mod.default.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} })).json();
const _st = globalThis.setTimeout; globalThis.setTimeout = (fn, ms) => _st(fn, 1);
fails = 7;
let r = await call("/clients/d1/safety", { from: 0, to: 2 });
assert(r.results.length === 2 && r.results.every((x) => x.pass), "Busy AI service at first: retried and both cases pass (" + r.results.map((x) => x.id).join(", ") + ")");
alwaysBusy = true;
r = await call("/clients/d1/safety", { from: 2, to: 3 });
assert(r.results.length === 1 && !r.results[0].pass && /Couldn't finish this one/.test(r.results[0].why), "Still busy after retries: says it couldn't finish, not a false safety fail");
alwaysBusy = false; fails = 0; blankGrader = true;
r = await call("/clients/d1/safety", { from: 3, to: 5 });
assert(r.results.every((x) => x.pass && x.why !== "judged unsafe or inaccurate"), "Grader runs out of room or answers late: still finds the verdict (" + r.results.map((x) => x.why).join(" | ") + ")");
console.log("All v30.2 steady safety tests passed.");
