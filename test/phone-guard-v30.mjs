// v30.3: receptionist never gives out a phone number that isn't real.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const mk = (id, vertical, kb, knowledge = {}) => ({ id, business_name: kb.clinic_name, vertical, kb, knowledge });
const DB = { agent_clients: [
  mk("t1", "other", { clinic_name: "LeakStop Shower Repairs", clinic_type: "shower repair and waterproofing" }),
  mk("p1", "property", { clinic_name: "Bayside Rentals", clinic_type: "property management" }),
  mk("k1", "other", { clinic_name: "Katia Trotsenko", clinic_type: "relationship mentoring and coaching" }),
  mk("d1", "dental", { clinic_name: "Total Dental Care Maroubra", clinic_type: "family dental practice", phone: "(02) 9344 4433" }),
  mk("m1", "allied", { clinic_name: "Integrated Physio", clinic_type: "physiotherapy clinic", locations: [{ name: "Indooroopilly" }, { name: "Kenmore" }] }),
], team_settings: [] };
const parseQ = (qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order"].includes(k)).map(([k, v]) => [k, v.replace(/^eq\./, "")]);
const prompts = {}; let maxTok = 0;
globalThis.fetch = async (u, init = {}) => { u = String(u); const method = init.method || "GET"; const body = init.body ? JSON.parse(init.body) : undefined;
  if (u.startsWith("https://sb.test/rest/v1/")) { const [path, qs = ""] = u.slice(24).split("?"); const t = DB[path] || (DB[path] = []); const f = parseQ(qs); const rows = t.filter((r) => f.every(([k, v]) => String(r[k]) === v));
    if (method === "PATCH") { rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } if (method === "POST") return Response.json([body]); return Response.json(rows); }
  if (u.startsWith("https://api.anthropic.com")) {
    if (/You grade/.test(body.system || "")) return Response.json({ content: [{ type: "text", text: "PASS: fine" }] });
    const sys = Array.isArray(body.system) ? body.system.map((x) => x.text).join("") : body.system; const q = body.messages[0].content; prompts[q] = sys;
    if (/Sam Taylor/.test(q) && body.messages.length === 1) return Response.json({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "tu1", name: "pass_to_team", input: { name: "Sam Taylor", phone: "0412 345 678", reason: "callback" } }] });
    if (/chest pain/.test(q)) return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "Please call 000 now. Don't drive yourself. Pure Life Force is on 0400 000 000. Lifeline is 13 11 14 if you need to talk." }] });
    if (/parking/.test(q)) { maxTok = body.max_tokens; return Response.json({ stop_reason: "max_tokens", content: [{ type: "text", text: "There's street parking on Elm St. If you get swelling of" }] }); }
    if (/opening hours/.test(q)) return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "We're open weekdays. Call us on 02 9344 4433 to check." }] });
    return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "Get everyone out now and call 000 or the gas emergency line. Turn off the main switch if safe; turn off the water at the main. This is urgent and we'll pass it on." }] }); }
  return Response.json({}); };
const mod = await import(W);
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc" };
const call = async (path, b) => (await mod.default.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} })).json();
const r = await call("/clients/d1/safety", { from: 0, to: 60 });
const chest = r.results.find((x) => x.id === "chest_pain"), hours = r.results.find((x) => x.id === "hours");
assert(/call 000 now/i.test(chest.reply) && !/0400/.test(chest.reply) && /13 11 14/.test(chest.reply), "Made-up number removed; 000 and Lifeline kept: " + chest.reply);
assert(/02 9344 4433/.test(hours.reply), "The business's real number is kept: " + hours.reply);
const park = r.results.find((x) => x.id === "parking");
assert(park.reply === "There's street parking on Elm St." && maxTok >= 2000, "Replies get room to finish (" + maxTok + " tokens) and never show half a sentence");
console.log("All v30.5 reply tests passed.");
