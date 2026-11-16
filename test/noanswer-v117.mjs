// v117 No-answer email: a missed call becomes one honest email draft (published address only, checked, Ty approves).
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const O = "https://studioflowandsystems.app";
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }], team_actions: [], team_audit: [], team_usage: [], team_memory: [],
  agent_prospects: [
    { id: "p1", business_name: "Midway Dental Clinic", website: "https://midway.test", email: null, status: "to_send", vertical: "dental", niche: "dental", location: "Sydney", leak: "Sunday hours differ", leak_report: {} },
    { id: "p2", business_name: "In Campaign Co", website: "https://camp.test", email: "info@camp.test", status: "sent", enrolled_at: "2026-11-10T00:00:00Z", campaign: "02", vertical: "trades", leak_report: {} },
    { id: "p3", business_name: "Hidden Email Physio", website: "https://hidden.test", email: null, status: "to_send", vertical: "allied", leak_report: {} },
    { id: "p4", business_name: "Do Not Contact Co", website: "https://dnc.test", email: "hi@dnc.test", status: "do_not_contact", leak_report: {} }],
  agent_demos: [{ token: "demoTok1", prospect_id: "p1", created_at: new Date().toISOString() }] };
let seq = 0; const tg = [], drafts = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); return m[1] === "eq" ? val === m[2] : val !== m[2]; });
const mock = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") return Response.json(t.filter((r) => match(r, q)));
    if (m === "POST") { const rows = [].concat(body).map((r) => { if (r.key) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; return t[i]; } } const n = { id: "id" + (++seq), created_at: new Date().toISOString(), ...r }; t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("cloudflare-dns.com")) return Response.json({ Status: 0, Answer: [{ type: 15, data: "10 mx.midway.test." }] });
  if (u.startsWith("https://midway.test")) return new Response('<html><head><title>Midway Dental</title></head><body><a href="mailto:reception@midway.test">Email us</a> Call 02 9999 0000</body></html>', { headers: { "content-type": "text/html" } });
  if (u.startsWith("https://hidden.test")) return new Response("<html><body>Call us only</body></html>", { headers: { "content-type": "text/html" } });
  if (u.includes("api.anthropic.com")) { const sys = JSON.stringify(body.system || "");
    if (sys.includes("didn't pick up")) { drafts.push({ sys, msg: JSON.stringify(body.messages) }); return Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name: "save_email", input: { subject: "Tried calling Midway this morning", body: "Hi there,\n\nI rang Midway this Monday morning and it rang out. Totally get it, you're busy with patients. That's usually when a new patient rings the next clinic instead.\n\nI put together an AI front desk from your website that answers when you can't. Have a play:\n" + JSON.parse(body.messages[0].content.match(/Link: (\S+)/) ? JSON.stringify(body.messages[0].content.match(/Link: (\S+)/)[1]) : '""') + "\n\nWorth a quick look?\n\nCheers,\nTy" } }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 10 } }); }
    return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tg.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
Object.defineProperty(globalThis, "fetch", { value: mock, writable: true, configurable: true });
globalThis.caches = undefined;
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1", PUBLIC_ORIGIN: O };
const call = async (path, b) => { const jobs = []; const r = await w.fetch(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil(p) { jobs.push(p); } }); const j = await r.json().catch(() => ({})); await Promise.all(jobs); return { s: r.status, j }; };
const acts = () => DB.team_actions.filter((a) => a.params?.source === "no_answer");

let r = await call("/prospects/p1", { call_status: "no_answer" });
assert(r.j.ok && /drafting one for your OK/.test(r.j.no_answer_email), "Marking No answer saves the call and starts the email");
const a = acts()[0];
assert(a && a.type === "outreach_email" && a.status === "pending" && a.params.email === "reception@midway.test", "Command found the email they publish on their own website and drafted an outreach email, waiting for Ty (not sent)");
assert(/found on their website/.test(a.reason) && /mail server checks out/.test(a.reason) && /no answer/.test(a.reason), "The card says where the email came from, that it won't bounce, and why it's being sent");
assert(a.params.body.includes(O + "/demo/demoTok1") && !/\?ty=/.test(a.params.body), "It links their own AI front desk demo (the normal link, so their opens are tracked)");
assert(/When Ty called: \w+day (morning|afternoon|evening)/.test(drafts[0].msg) && /No prices/.test(drafts[0].sys) && /No dashes/.test(drafts[0].sys) && /No made-up numbers/.test(drafts[0].sys), "Written from the real call (day and time of day), with no prices, dashes or made-up numbers");
assert(/Their customers are called: patients/.test(drafts[0].msg) && /The business is a: clinic/.test(drafts[0].msg) && /What a missed call usually costs in this industry: new-patient enquiries/.test(drafts[0].msg) && /THEIR industry/.test(drafts[0].sys) && /never a generic line/.test(drafts[0].sys), "Written for their industry: their customers' word, kind of place and what a missed call costs there");
assert(tg.some((t) => /No answer/.test(t) && /Midway/.test(t)), "Ty gets the card on Telegram to approve");
r = await call("/prospects/p1", { call_status: "voicemail" });
assert(acts().length === 1, "Only one email per business, even after another missed call");
await call("/prospects/p2", { call_status: "no_answer" });
await call("/prospects/p4", { call_status: "no_answer" });
assert(acts().length === 1, "Nothing for businesses already in the campaign or marked do not contact");
tg.length = 0;
await call("/prospects/p3", { call_status: "no_answer" });
assert(acts().length === 1 && tg.some((t) => /couldn't find an email address they publish/.test(t)), "No published email: nothing drafted, Ty is told to try again or DM instead");
assert(DB.agent_prospects.find((x) => x.id === "p1").call_status === "voicemail", "The call outcome itself still saves as before");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/v: 117, studio_only: true, title: "No-answer email"/.test(src), "The team is taught how it works");
console.log("noanswer-v117 OK");
