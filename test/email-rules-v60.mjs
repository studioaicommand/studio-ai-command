// v60: email rules - Studio AI blocks senders, filters pitches/phishing, sweeps the inbox; clients and prospects are never touched.
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [], team_usage: [], team_actions: [] };
const contacts = { amex: { email: "alerts@amex-secure-help.com", firstName: "American", lastName: "Express", tags: [] }, client: { email: "matty@purelifeforce.com.au", firstName: "American Express", lastName: "Client", tags: ["client"] }, seo: { email: "raj@growthseo.example", firstName: "Raj", tags: [] }, mum: { email: "jess@example.com", firstName: "Jess", tags: [] } };
const convs = { amex: "cv-amex", client: "cv-client", seo: "cv-seo", mum: "cv-mum" };
const ghl = []; let classify = "real";
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq)\.(.*)$/); return !m || String(r[k] ?? "") === m[2]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body); if (path === "team_settings") { for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } } else t.push(...rows); return Response.json(rows); }
    return Response.json([]); }
  if (u.includes("services.leadconnectorhq.com")) { const p = u.split(".com")[1]; ghl.push(m + " " + p.split("?")[0]);
    const cm = p.match(/^\/contacts\/(\w+)$/); if (cm && m === "GET") return Response.json({ contact: contacts[cm[1]] });
    if (/^\/contacts\/\w+\/tags/.test(p)) return Response.json({ tags: body.tags });
    if (m === "DELETE" && /^\/conversations\/cv-/.test(p)) return Response.json({ success: true });
    const sq = p.match(/^\/conversations\/search\?.*contactId=(\w+)/); if (sq) return Response.json({ conversations: [{ id: convs[sq[1]], contactId: sq[1] }] });
    if (/^\/conversations\/search\?.*query=/.test(p)) return Response.json({ conversations: [{ id: "cv-amex", contactId: "amex", lastMessageType: "TYPE_EMAIL", lastMessageBody: "Your card is locked" }, { id: "cv-client", contactId: "client", lastMessageType: "TYPE_EMAIL", lastMessageBody: "Thanks!" }, { id: "cv-sms", contactId: "mum", lastMessageType: "TYPE_SMS", lastMessageBody: "hi" }] });
    const mm = p.match(/^\/conversations\/(cv-\w+)\/messages/); if (mm) { const who = mm[1].slice(3); return Response.json({ messages: { messages: [{ id: "m-" + who, direction: "inbound", messageType: "TYPE_EMAIL", body: who === "seo" ? "We can get you to page 1 of Google, 50% off this week" : who === "amex" ? "Your card is locked, verify here" : "Hi, do you do websites for cafes? Can we chat?", dateAdded: new Date().toISOString(), meta: { email: { subject: who === "amex" ? "Urgent: account locked" : "Hello" } } }] } }); }
    return Response.json({}); }
  if (u.includes("api.anthropic.com")) { const names = (body.tools || []).map((t) => t.name); if (names.includes("classify_email")) return Response.json({ content: [{ type: "tool_use", id: "t1", name: "classify_email", input: { kind: classify } }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 } }); return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) return Response.json({ ok: true, result: {} });
  return new Response("{}", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const key = crypto.createHash("sha256").update("inbox:k").digest("hex").slice(0, 28);
const hook = async (who) => { ghl.length = 0; await w.fetch(new Request("https://studioflowandsystems.app/api/v1/inbox/ghl/" + key, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contact_id: who, message: { type: "Email", body: "x" } }) }), env, ctx); await flush(); return [...ghl]; };
// the tool, as Studio AI calls it
const mod = await import("node:fs"); const src = mod.readFileSync(W, "utf8");
const vm = await import("node:vm");
assert(/fn\("email_rules"/.test(src) && /if \(name === "email_rules"\) return mailRulesTool\(env, args\);/.test(src), "Studio AI has an email_rules tool");
// call the tool through the team API used by chat: simulate with the operator tool route
const tool = async (args) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/operator/tool", { method: "POST", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: JSON.stringify({ name: "email_rules", arguments: args }) }), env, ctx); await flush(); return r.json(); };
let t = await tool({ action: "add", kind: "sender", match: "gmail.com" });
const rt = JSON.stringify(t);
assert(/far too much/.test(rt), "Refuses rules that would block everyone (gmail.com) " + rt.slice(0, 120));
t = await tool({ action: "add", kind: "sender", match: "American Express" });
assert(/"ok":true/.test(JSON.stringify(t)), "Ty asks: block American Express");
let calls = await hook("amex");
assert(calls.includes("DELETE /conversations/cv-amex") && calls.some((c) => /POST \/contacts\/amex\/tags/.test(c)), "A new American Express email is deleted from GHL Conversations and the contact tagged blocked-sender");
const log = DB.team_settings.find((x) => x.key === "mail_rules_log").value.items;
assert(log[0].from === "alerts@amex-secure-help.com" && /Urgent: account locked/.test(log[0].subject) && /American Express/.test(log[0].why), "It's logged (who, subject, why), so nothing disappears silently");
calls = await hook("client");
assert(!calls.some((c) => c.startsWith("DELETE")), "A client whose name matches is NEVER deleted (tagged client)");
calls = await hook("mum");
assert(!calls.some((c) => c.startsWith("DELETE")), "Normal emails are untouched");
// AI pitch filter
await tool({ action: "pitch_filter_on" }); classify = "sales_pitch";
calls = await hook("seo");
assert(calls.includes("DELETE /conversations/cv-seo"), "Pitch filter on: a cold SEO pitch is deleted");
classify = "real";
calls = await hook("mum");
assert(!calls.some((c) => c.startsWith("DELETE")), "When the AI says it's real (or isn't sure) the email stays");
// sweep existing emails: list first, delete only after yes
t = await tool({ action: "sweep", dry_run: true }); const sj = JSON.stringify(t);
assert(/"would_delete":1/.test(sj) && /cv-amex/.test(sj) && !/cv-client/.test(sj) && !/cv-sms/.test(sj), "Sweep shows what it WOULD delete first (only the matching email, never the client or SMS)");
ghl.length = 0; t = await tool({ action: "sweep", dry_run: false });
assert(/"deleted":1/.test(JSON.stringify(t)) && ghl.includes("DELETE /conversations/cv-amex"), "After Ty says yes, the sweep deletes them");
console.log("v60 email rules OK");
