// v106 Update Announcer teaches every agent after a deploy; Ty's own DMs answered in Ty's voice; pilots open to all.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [
  { key: "telegram", value: { chat_id: 42 } },
  { key: "team_rules", value: { rules: [
    { id: "r1", rule: "Allied health clinics are our main niche: prioritise them in every hunt.", applies_to: ["all"], said: 4 },
    { id: "r2", rule: "Never use dashes in messages.", applies_to: ["all"], said: 2 },
    { id: "r3", rule: "When asking for referrals, mention clinic owners.", applies_to: ["dm"], said: 1 }] } }],
  team_memory: [
    { id: "m1", category: "rule", fact: "Focus marketing on allied health first, then dental." },
    { id: "m2", category: "client", fact: "Mat runs Pure Life Force." },
    { id: "m3", category: "client", fact: "Harbour Physio is an allied health clinic owned by Sam." }],
  team_audit: [] };
let seq = 0; const tgs = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); return m[1] === "eq" ? val === m[2] : val !== m[2]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "DELETE") { const q = decodeURIComponent(qs); for (let i = t.length - 1; i >= 0; i--) if (match(t[i], q)) t.splice(i, 1); return Response.json([]); }
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), ...r })); for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", TELEGRAM_BOT_TOKEN: "t", ANTHROPIC_API_KEY: "a" };
const call = async (path, b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }); return { s: r.status, j: await r.json().catch(() => ({})) }; };

let r = await call("/release-announce", {});
assert(r.j.ok && r.j.taught.length === 3, "After a deploy every new version's rules are taught: " + r.j.taught.join(", "));
const rules = DB.team_settings.find((x) => x.key === "team_rules").value.rules;
assert(rules.some((x) => /There is NO main niche/.test(x.rule) && x.pinned && x.source === "release"), "The 'no main niche' rule is now in the rulebook every agent reads (pinned, so it never drops off)");
assert(!rules.some((x) => x.id === "r1" || x.id === "r3") && rules.some((x) => x.id === "r2"), "Old 'allied health is our main niche' and 'clinic owners' rules are retired; unrelated rules kept");
assert(!DB.team_memory.some((x) => x.id === "m1") && DB.team_memory.some((x) => x.id === "m2") && DB.team_memory.some((x) => x.id === "m3"), "Old memory saying 'allied health first' is cleared; client facts (even ones mentioning allied health) are kept");
assert(tgs.some((t) => /Update taught to every agent/.test(t) && /v105: No main niche/.test(t) && /Retired 2 old rules/.test(t)), "Ty gets a Telegram note saying what was taught and what was retired");
r = await call("/release-announce", {});
assert(r.j.taught === 0, "Running again teaches nothing twice");

const src = (await import("node:fs")).readFileSync(W, "utf8");
const grab = (name) => { const i = src.indexOf("function " + name + "("); let d = 0, j = src.indexOf("{", src.indexOf(")", i)); for (let k = j; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}") { d--; if (!d) return src.slice(i, k + 1); } } };
const inboxTyStarted = new Function(grab("inboxTyStarted") + "; return inboxTyStarted;")();
assert(inboxTyStarted("ig", [{ direction: "outbound", body: "Hey Libby! Hope you're well" }, { direction: "inbound", body: "Haha I'm still on it" }], {}) === true, "Instagram chat Ty started himself: reply in Ty's own voice");
assert(inboxTyStarted("ig", [{ direction: "inbound", body: "Hi, how much is a website?" }, { direction: "outbound", body: "Hi!" }], {}) === false, "A stranger messaging the business first still gets the business assistant");
assert(inboxTyStarted("sms", [{ direction: "outbound", body: "x" }, { direction: "inbound", body: "y" }], {}) === false, "SMS and other channels unchanged");
assert(/Pilot checkouts are open to any established service business/.test(src) && !/Pilot checkouts are for clinics/.test(src) && !/Founding Clinic Pilot/.test(src), "Founding pilots are offered to any service business, not just clinics");
console.log("announce-v106 OK");
