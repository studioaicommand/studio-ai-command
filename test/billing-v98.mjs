// v98 Billing desk: failed Stripe payments get up to 3 branded, approval-gated reminders with a Pay button,
// never sent once paid; Ty is told once, then asked to ring after 10 days.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
let NOW = Date.parse("2026-11-16T00:00:00Z"); const RealDate = Date; // 10am Brisbane, Monday
globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_actions: [], team_audit: [], team_memory: [] };
let seq = 0;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String((k.includes("->>") ? (r[k.split("->>")[0]] || {})[k.split("->>")[1]] : r[k]) ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; return true; });
const tgs = [], sent = [];
const INV = { id: "in_1", number: "SF-0042", status: "open", amount_due: 49700, currency: "aud", attempt_count: 1, hosted_invoice_url: "https://invoice.stripe.com/i/acct/in_1", customer_email: "jess@x.test", customer: { id: "cus_1", name: "Jess Smith", email: "jess@x.test" }, lines: { data: [{ description: "1 × Front Desk receptionist (at $497.00 / month)" }] } };
const OK_INV = { id: "in_2", number: "SF-0043", status: "open", amount_due: 14900, currency: "aud", attempt_count: 0, due_date: Math.floor(NOW / 1e3) + 5 * 86400, hosted_invoice_url: "https://invoice.stripe.com/i/acct/in_2", customer_email: "ok@x.test", customer: { name: "Not Due Yet" } };
let invoices = [INV, OK_INV];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new RealDate(NOW).toISOString(), ...r })); for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 900 + tgs.length } }); }
  if (u.includes("api.stripe.com")) {
    if (u.includes("/v1/invoices?")) return Response.json({ data: invoices.filter((i) => i.status === "open"), has_more: false });
    const one = u.match(/\/v1\/invoices\/([^?]+)/); if (one) return Response.json([INV, OK_INV].find((i) => i.id === decodeURIComponent(one[1])) || {});
    return Response.json({ data: [] }); }
  if (u.includes("leadconnectorhq.com")) {
    if (u.includes("/contacts/upsert")) return Response.json({ contact: { id: "c_" + body.email.split("@")[0] } });
    if (u.includes("/conversations/messages") && m === "POST") { sent.push(body); return Response.json({ messageId: "m" }); }
    return Response.json({}); }
  return new Response("{}", { status: 404 }); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", STRIPE_SECRET_KEY: "sk" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const call = async (path, b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, ctx); await flush(); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const cards = () => DB.team_actions.filter((a) => a.params?.kind === "billing_chase");

let r = await call("/billing/check", {});
assert(r.s === 200 && r.j.ok && r.j.open === 1, "Billing desk finds the one failed payment (an invoice not yet due is left alone): " + JSON.stringify(r.j));
let c = cards();
assert(c.length === 1 && c[0].status === "pending" && c[0].department === "head_of_finance" && /1 of 3/.test(c[0].title) && /\$497\.00/.test(c[0].title), "Reminder 1 of 3 waits in Approvals for Ty");
assert(/didn't go through/.test(c[0].params.message) && /Front Desk receptionist/.test(c[0].params.message) && !/[—–]/.test(c[0].params.message) && /^Hi Jess,/.test(c[0].params.message), "Friendly, in Ty's voice, names the plan, no dashes");
assert(!sent.length, "Nothing is sent before Ty approves");
assert(tgs.some((t) => /Payment didn't go through/.test(t) && /Jess Smith/.test(t) && /Nothing goes out without you/.test(t)), "Ty gets one Telegram heads-up");

// Ty approves: branded email with a Pay invoice button to the Stripe link
await call("/actions/" + c[0].id + "/approve", {});
assert(sent.length === 1 && sent[0].type === "Email" && sent[0].contactId === "c_jess" && /Pay invoice/.test(sent[0].html) && sent[0].html.includes("https://invoice.stripe.com/i/acct/in_1") && /SECURE PAYMENT/.test(sent[0].html) && !/BOOK A FREE 30-MINUTE CALL/.test(sent[0].html), "Approved: branded email goes out with a Stripe 'Pay invoice' button (not the free-call card)");

// Same day again: no duplicate
const t0 = tgs.length;
r = await call("/billing/check", {});
assert(cards().length === 1 && tgs.length === t0, "Running again the same day adds nothing");

// Day 3: reminder 2. Then they pay before Ty approves: it refuses to send
NOW += 3 * 864e5;
r = await call("/billing/check", {});
c = cards();
assert(c.length === 2 && /2 of 3/.test(c[1].title) && /still hasn't gone through/.test(c[1].params.message), "Day 3: reminder 2 of 3 drafted");
INV.status = "paid";
const s0 = sent.length;
await call("/actions/" + c[1].id + "/approve", {});
assert(sent.length === s0 && DB.team_actions.find((a) => a.id === c[1].id).status === "failed", "If they've paid by the time Ty approves, nothing is sent");
invoices = [OK_INV];
r = await call("/billing/check", {});
assert(r.j.paid.includes("Jess Smith") && tgs.some((t) => /Paid/.test(t) && /Jess Smith/.test(t)), "Ty hears when they've paid");

// A second client never pays: day 10 => ring them, no more emails
const LATE = { ...INV, id: "in_9", number: "SF-0050", status: "open", customer_email: "tom@x.test", customer: { name: "Tom Lee", email: "tom@x.test" } };
invoices = [LATE]; INV.id = "in_9"; INV.status = "open"; INV.number = "SF-0050"; INV.customer = LATE.customer; INV.customer_email = "tom@x.test";
await call("/billing/check", {});
NOW += 7 * 864e5; await call("/billing/check", {});
NOW += 3 * 864e5; const before = cards().length; r = await call("/billing/check", {});
assert(cards().filter((a) => a.params.contact_name === "Tom Lee").length === 2 && cards().length === before && r.j.call.includes("Tom Lee") && tgs.some((t) => /Still unpaid after 3 reminders/.test(t) && /Tom Lee/.test(t)), "After 10 days: Ty is asked to ring them and the emails stop");

r = await call("/billing");
assert(r.j.ok && r.j.open.some((x) => x.name === "Tom Lee" && x.call), "Command can report who owes what and who needs a call");
DB.team_settings.push({ key: "inbox", value: { billing: "off" } });
r = await call("/billing/check", {});
assert(r.j.skipped === "billing chase off", "inbox.billing = 'off' turns it off");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/BILLING: when a client's subscription payment fails/.test(src) && /REFERRALS: when a client leaves a Google review/.test(src), "Command knows the billing desk and the referral workflow");
console.log("billing-v98 OK");
