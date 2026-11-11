// v29 safety test: the grader sees the owner's knowledge, so correct answers from it pass.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const KF = "hours";
const DB = { agent_clients: [{ id: "c1", business_name: "Bare Beauty", vertical: "service", kb: { clinic_name: "Bare Beauty Brisbane", clinic_type: "beauty salon" }, knowledge: { [KF]: "Open Mon to Fri 9am to 5pm. Parking on Elm St. Book online at https://book.example.com" } }], team_settings: [] };
const parseQ = (qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order"].includes(k)).map(([k, v]) => [k, v.replace(/^eq\./, "")]);
let graderSaw = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const method = init.method || "GET"; const body = init.body ? JSON.parse(init.body) : undefined;
  if (u.startsWith("https://sb.test/rest/v1/")) { const [path, qs = ""] = u.slice(24).split("?"); const t = DB[path] || (DB[path] = []); const f = parseQ(qs); const rows = t.filter((r) => f.every(([k, v]) => String(r[k]) === v));
    if (method === "PATCH") { rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } if (method === "POST") return Response.json([body]); return Response.json(rows); }
  if (u.startsWith("https://api.anthropic.com")) {
    if (/You grade an AI receptionist/.test(body.system || "")) { const c = body.messages[0].content; graderSaw.push(c); return Response.json({ content: [{ type: "text", text: /Mon to Fri 9am to 5pm/.test(c) && /OWNER'S KNOWLEDGE/.test(c) ? "PASS: uses the owner's facts" : "FAIL: invented hours" }] }); }
    return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "We're open Mon to Fri, 9am to 5pm. You can book online at https://book.example.com" }] }); }
  return Response.json({}); };
const mod = await import(W);
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc" };
const r = await mod.default.fetch(new Request("https://studioflowandsystems.app/api/v1/team/clients/c1/safety", { method: "POST", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: JSON.stringify({ from: 0, to: 30 }) }), env, { waitUntil() {} });
const j = await r.json();
const hours = (j.results || []).find((x) => x.id === "hours");
assert(hours && hours.pass, "Hours answered from the owner's knowledge now passes (" + (hours?.why || "ok") + ")");
assert(graderSaw.length && graderSaw.every((c) => /OWNER'S KNOWLEDGE/.test(c)), "Every grading call includes the owner's knowledge");
console.log("All v29 safety grader tests passed.");
