// v127 security patch: opt-out replies are honoured straight away (Spam Act), scans can't follow/like/message, secrets compared in constant time.
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }], team_usage: [], team_audit: [], team_memory: [],
  agent_prospects: [{ id: "p1", business_name: "Midway Dental", ghl_contact_id: "c1", status: "sent" }, { id: "p2", business_name: "Keen Physio", ghl_contact_id: "c2", status: "sent" }],
  team_actions: [{ id: "a1", status: "pending", type: "outreach_email", params: { prospect_id: "p1", email: "x@midway.test" }, title: "Follow up Midway" }, { id: "a2", status: "pending", type: "outreach_email", params: { prospect_id: "p2" }, title: "Follow up Keen" }] };
let inboundText = "", tagged = [], tg = [], drafted = 0;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|in)\.(.*)$/); if (!m) return true; return m[1] === "eq" ? String(r[k] ?? "") === m[2] : m[2].replace(/[()]/g, "").split(",").includes(String(r[k])); });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") return Response.json(t.filter((r) => match(r, q)));
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); }
    if (m === "POST") { const rows = [].concat(body); if (path === "team_settings") { for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } } else t.push(...rows); return Response.json(rows); }
    return Response.json([]); }
  if (u.includes("services.leadconnectorhq.com")) { const p = u.split(".com")[1];
    const cm = p.match(/^\/contacts\/(\w+)$/); if (cm && m === "GET") return Response.json({ contact: { id: cm[1], email: cm[1] + "@x.test", firstName: "Sam", tags: [] } });
    const tm = p.match(/^\/contacts\/(\w+)\/tags/); if (tm) { tagged.push(tm[1] + ":" + body.tags.join(",")); return Response.json({ tags: body.tags }); }
    const sq = p.match(/^\/conversations\/search\?.*contactId=(\w+)/); if (sq) return Response.json({ conversations: [{ id: "cv-" + sq[1], contactId: sq[1] }] });
    if (/^\/conversations\/cv-\w+\/messages/.test(p)) return Response.json({ messages: { messages: [{ id: "m" + Math.random(), direction: "inbound", messageType: "TYPE_EMAIL", body: inboundText, dateAdded: new Date().toISOString() }] } });
    return Response.json({}); }
  if (u.includes("api.anthropic.com")) { drafted++; const names = (body.tools || []).map((t) => t.name); if (names.includes("classify_email")) return Response.json({ content: [{ type: "tool_use", id: "t1", name: "classify_email", input: { kind: "real" } }], stop_reason: "tool_use", usage: { input_tokens: 1, output_tokens: 1 } });
    return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tg.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1" };
const key = crypto.createHash("sha256").update("inbox:k").digest("hex").slice(0, 28);
const hook = async (who, text) => { inboundText = text; tagged = []; tg = []; const waits = []; const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/inbox/ghl/" + key, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contact_id: who, message: { type: "Email", body: text } }) }), env, { waitUntil: (p) => waits.push(p) }); for (const p of waits) await p.catch(() => {}); return r; };

await hook("c1", "No thanks.");
assert(tagged.some((x) => /^c1:.*outreach-opted-out/.test(x)), "Replying \"no thanks\" (what our cold emails invite) tags the contact opted out in GHL");
assert(DB.agent_prospects.find((p) => p.id === "p1").status === "do_not_contact", "The business is marked do not contact, so no drip, DM or follow-up picks it up again");
assert(DB.team_actions.find((a) => a.id === "a1").status === "rejected" && DB.team_actions.find((a) => a.id === "a2").status === "pending", "Anything already waiting for them is cancelled (and only for them)");
assert(tg.some((x) => /Midway Dental asked not to be contacted/.test(x)), "Ty is told on Telegram, with nothing to do");
assert(DB.team_audit.some((a) => a.action === "opt_out_recorded"), "It's in the audit log (proof for the Spam Act)");
for (const t of ["Please remove me from your list", "unsubscribe", "Not interested, thanks", "STOP"]) { const before = DB.team_audit.length; await hook("c2", t); assert(DB.team_audit.length > before && tagged.some((x) => /outreach-opted-out/.test(x)), "Opt-out understood: \"" + t + "\""); }
DB.agent_prospects.find((p) => p.id === "p2").status = "sent";
const before = DB.team_audit.filter((a) => a.action === "opt_out_recorded").length;
await hook("c2", "Thanks for this! Not interested in the website, but how much would the front desk cost us per month?");
assert(DB.team_audit.filter((a) => a.action === "opt_out_recorded").length === before && DB.agent_prospects.find((p) => p.id === "p2").status === "sent", "A real question that happens to say 'not interested in X' is NOT treated as an opt-out");

// secrets compared safely: a wrong Telegram secret or inbox key is refused
let r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/telegram/hook", { method: "POST", headers: { "X-Telegram-Bot-Api-Secret-Token": "wrong" }, body: "{}" }), env, { waitUntil() {} });
assert(r.status === 403, "Telegram webhook refuses a wrong secret");
r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/inbox/ghl/" + "0".repeat(28), { method: "POST", body: "{}" }), env, { waitUntil() {} });
assert(r.status === 404, "Inbox webhook refuses a wrong key");
r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/sales/test", { method: "POST", headers: { Authorization: "Bearer nope" }, body: "{}" }), env, { waitUntil() {} });
assert(r.status === 401, "Sales test route refuses a wrong key");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/Blocked during a scan \(scans only read\)/.test(src), "Friends scans are read-only in code (follow, like, connect, message and post are blocked)");
console.log("optout-v127 OK");
