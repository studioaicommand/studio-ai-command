// v96 bounce guard: an outreach email is only queued if its domain has a working mail server, isn't a typo and hasn't bounced before.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const P = (id, email, site) => ({ id, business_name: "Clinic " + id, website: "https://" + site, email, email_source_url: "https://" + site + "/contact", vertical: "allied", status: "to_send", email_subject: "A quick idea for your bookings", email_body: "Hi there, I noticed your booking page makes new patients call during work hours. Happy to show a fix.", leak_report: { scan_version: 2 } });
const DB = { team_settings: [{ key: "email_stats", value: { days: {}, seen: {}, recent: [{ event: "bounced", email: "hello@bounced.com.au" }] } }], team_actions: [], agent_prospects: [P("p1", "info@deadclinic.com.au", "deadclinic.com.au"), P("p2", "info@goodclinic.com.au", "goodclinic.com.au"), P("p3", "hello@bounced.com.au", "bounced.com.au"), P("p4", "info@typo.con", "typo.con")] };
let seq = 0; const dns = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; return true; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("cloudflare-dns.com")) { const name = new URL(u).searchParams.get("name"); dns.push(name); return Response.json(name === "deadclinic.com.au" ? { Status: 3 } : { Status: 0, Answer: [{ type: 15, data: "10 mx.example.com." }] }); }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); t.push(...rows); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  return Response.json({}); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s" };
const q = async (id) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team/prospects/" + id + "/queue", { method: "POST", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: "{}" }), env, { waitUntil() {} }); return r.json().catch(() => ({})); };
let r = await q("p1");
assert(/no working mail server/.test(JSON.stringify(r)) && dns.includes("deadclinic.com.au"), "A domain with no mail server is never queued (it would bounce)");
r = await q("p3");
assert(/bounced before/.test(JSON.stringify(r)), "An address that bounced before is never queued again");
r = await q("p4");
assert(/typo/.test(JSON.stringify(r)), "An obvious typo domain is caught");
r = await q("p2");
assert(!/Not enrolled/.test(JSON.stringify(r)) && DB.team_actions.some((a) => a.type === "campaign_enrol" && a.params?.email === "info@goodclinic.com.au"), "A real, working address is queued as normal");
console.log("bounce-v96 OK");
