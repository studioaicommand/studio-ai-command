// v149 Value ledger: what Command did for the business in dollars (bookings at a trade value, staff time saved),
// against what it costs, on client copies and on Studio's own Command. Shown on Home, its own screen, the Monday report,
// a monthly report on the 1st, the fleet console, and as a Studio AI tool. Money stays owner-only.
import { readFileSync } from "node:fs";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [], team_actions: [], studio_command_records: [], team_usage: [], agent_demos: [], team_reports: [], team_audit: [] }; let seq = 0; const tg = [];
const val = (r, k) => { const v = k.includes("->>") ? (r[k.split("->>")[0]] || {})[k.split("->>")[1]] : r[k]; return v == null ? "" : String(v); };
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { let m;
  if ((m = v.match(/^eq\.(.*)$/))) return val(r, k) === m[1]; if (v === "is.true") return r[k] === true; if ((m = v.match(/^gte\.(.*)$/))) return val(r, k) >= m[1]; if ((m = v.match(/^lt\.(.*)$/))) return val(r, k) < m[1];
  if ((m = v.match(/^like\.(.*)$/))) return new RegExp("^" + m[1].replace(/\*/g, ".*") + "$").test(val(r, k)); if ((m = v.match(/^not\.like\.(.*)$/))) return !new RegExp("^" + m[1].replace(/\*/g, ".*") + "$").test(val(r, k)); return true; });
const qsAll = (qs) => { const out = []; for (const part of qs.split("&")) out.push(part); return out.join("&"); };
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = JSON.parse(init.body); } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    // URLSearchParams can't hold two filters on one column (decided_at=gte & lt), so check each pair separately
    const parts = decodeURIComponent(qsAll(qs)).split("&");
    const ok = (r) => parts.every((p) => match(r, p));
    if (m === "GET") return Response.json(t.filter(ok));
    if (m === "POST") { const rows = [].concat(body || []).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { if (path === "team_settings") { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const hit = t.filter(ok); for (const r of hit) Object.assign(r, body); return Response.json(hit); }
    return Response.json([]); }
  if (u.includes("api.telegram.org")) { tg.push(String(init.body || "")); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({ ok: true }); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const base = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1", FLEET_TOKEN: "ft" };
const at = (o) => async (path, b, auth = "Bearer k") => { const r = await w.fetch(new Request(o + path, { method: b ? "POST" : "GET", headers: { Authorization: auth, "content-type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), { ...base, PUBLIC_ORIGIN: o }, { waitUntil() {} }); return { s: r.status, j: await r.json().catch(() => ({})) }; };

// Dates: this month (Brisbane) and last month
const bn = new Date(Date.now() + 10 * 36e5), mStart = Date.UTC(bn.getUTCFullYear(), bn.getUTCMonth(), 1) - 10 * 36e5;
const inMonth = (h) => new Date(Math.max(mStart + 36e5, Date.now() - h * 36e5)).toISOString();
const lastMonth = new Date(mStart - 5 * 864e5).toISOString();
const afterHoursIso = new Date(mStart + 7.5 * 36e5).toISOString(); // 7:30am Brisbane on the 1st, before opening
const act = (type, extra = {}) => ({ id: "a" + (++seq), department: "head_of_sales", type, title: type.replace(/_/g, " "), status: "done", auto: true, params: {}, created_at: inMonth(2), decided_at: inMonth(1), ...extra });

// ── Studio's own Command ──
const S = "https://studioflowandsystems.app", s = at(S);
DB.team_actions.push(act("outreach_email"), act("outreach_email"), act("campaign_enrol"), act("ghl_reply"));
DB.team_usage.push({ id: "u1", created_at: inMonth(1), cost_aud: 9.5 });
DB.agent_demos.push({ id: "d1", token: "t1", business_name: "Bay Dental", created_at: inMonth(5) });
DB.team_settings.push({ key: "owner_find", value: { found: { p1: { name: "Sarah", at: inMonth(6) } } } });
let x = await s("/api/v1/team/value"), L = x.j;
assert(L.ok && !L.custom && L.lines.find((l) => l.key === "outreach").count === 3 && L.lines.find((l) => l.key === "demo").count === 1 && L.lines.find((l) => l.key === "owner").count === 1, "Studio's ledger counts outreach, demos built and owner names found");
assert(L.cost.ai_aud === 9.5 && L.cost.total >= 9.5 && L.settings.per_booking === 0, "Studio's cost is its AI and phone spend; a booked sales call has no value until Ty sets one");

DB.team_actions.length = 0; DB.agent_demos.length = 0; DB.team_usage.length = 0; DB.team_settings.length = 0;

// ── A client copy (allied health clinic) ──
const C = "https://harbour.studioflowandsystems.app", c = at(C);
x = await c("/api/v1/team/instance", { business_name: "Harbour Physio", product_name: "Harbour Command", owner_name: "Sam Lee", owner_first: "Sam", industry: "physio", template: "allied_health" });
assert(x.j.ok, "Client copy set up as an allied health clinic");
DB.team_actions.push(
  act("ghl_appointment_book", { title: "Booked Ben for Saturday 9am" }), act("ghl_appointment_book", { title: "Booked Mia for Monday 4pm" }),
  act("ghl_reply"), act("ghl_reply"), act("ghl_reply", { created_at: afterHoursIso, decided_at: afterHoursIso }),
  act("ghl_followup", { params: { kind: "review" }, title: "Review request to Kate" }), act("ghl_followup"), act("ghl_note"),
  act("ghl_reply", { status: "pending" }), act("ghl_reply", { status: "rejected" }),
  act("ghl_appointment_book", { title: "Booked last month", created_at: lastMonth, decided_at: lastMonth }));
DB.studio_command_records.push(
  { id: "r1", source: "call", external_key: "voiceai:1", occurred_at: inMonth(3), metadata: { booked: true, who: "Priya S.", duration_sec: 180 } },
  { id: "r2", source: "call", external_key: "voiceai:2", occurred_at: inMonth(4), metadata: { booked: false, who: "Tom", duration_sec: 120 } });

x = await c("/api/v1/team/value");
L = x.j;
assert(L.ok && L.custom && L.bookings === 3 && L.settings.per_booking === 95 && L.settings.per_booking_source === "trade" && L.booking_value === 285, "Bookings Command made (2 in chat + 1 by the Phone AI) count at a new physio patient's value ($95): " + L.bookings + " = $" + L.booking_value);
assert(L.lines.find((l) => l.key === "reply").count === 3 && !L.lines.some((l) => l.key === "outreach" || l.key === "demo"), "Only finished work counts (pending and rejected replies don't), and clients see no outreach lines");
assert(L.lines.find((l) => l.key === "review").count === 1 && L.lines.find((l) => l.key === "followup").count === 1 && L.lines.find((l) => l.key === "admin").count === 1, "Review requests, follow-ups and admin are counted separately");
const callLine = L.lines.find((l) => l.key === "call");
assert(callLine.count === 2 && callLine.minutes === 5 + 6, "Phone AI calls count their real length plus wrap-up time");
assert(L.after_hours >= 1 && L.answered === 5, "It shows how many were answered after hours: " + L.after_hours + " of " + L.answered);
assert(L.hours_saved > 0 && L.time_value === Math.round(L.lines.reduce((s, l) => s + l.minutes, 0) / 60 * 38) && L.total_value === L.booking_value + L.time_value, "Staff time saved is valued at $38/hr and added to the bookings: $" + L.total_value);
assert(L.cost.ai_aud === null && L.cost.total === 0 && L.roi === null && /Add what Command costs/.test(L.cost.note), "Clients never see Studio's AI costs; with no plan price it asks for one");
assert(L.events[0].value === 95 && /Booked|Phone AI booked/.test(L.events[0].text), "Biggest wins list the bookings first");

x = await c("/api/v1/team/value?month=last");
assert(x.j.bookings === 1 && !x.j.period.month_to_date, "Last month has its own ledger");

// Studio sets the client's plan price from the fleet console; the client's ledger shows it as the cost
x = await c("/api/v1/fleet/plan", { plan_aud: 697 }, "Bearer ft");
assert(x.j.ok && x.j.plan_aud === 697, "Studio's console sends the plan price to the client's Command");
x = await c("/api/v1/fleet/plan", { tier: "company" }, "Bearer ft");
assert(x.j.ok, "Changing the plan tier later keeps the price");
x = await c("/api/v1/team/value"); L = x.j;
assert(L.settings.plan_source === "studio" && L.cost.total > 0 && L.cost.total <= 697 && L.roi > 0, "The plan (so far this month) is the cost, with the return: " + L.roi + "x on $" + L.cost.total);

x = await c("/api/v1/team/value/settings", { per_booking: "$120", hourly_rate: "45" });
assert(x.j.ok && x.j.ledger.settings.per_booking === 120 && x.j.ledger.booking_value === 360 && x.j.ledger.settings.hourly_rate === 45 && x.j.ledger.settings.per_booking_source === "you", "The owner can set their own value per booking and staff rate");
x = await c("/api/v1/team/value/settings", { per_booking: "lots" });
assert(x.s === 400, "Rejects values that aren't dollar amounts");

x = await c("/api/v1/team/ceo-home");
assert(x.j.value && x.j.value.bookings === 3 && x.j.value.total === x.j.value.booking_value + x.j.value.time_value && x.j.value.last_month.label, "Home gets the month's value and last month to compare");

x = await c("/api/v1/fleet/status", undefined, "Bearer ft");
assert(x.j.ok && x.j.value && x.j.value.total > 0 && x.j.value.roi > 0, "The fleet console sees each client's value and return");

DB.team_settings.push({ key: "telegram", value: { chat_id: "42", linked: true } });
x = await c("/api/v1/team/value/report", {});
assert(x.j.ok && DB.team_reports.some((r) => r.subkind === "value_report" && /Value report/.test(r.title)) && tg.some((t) => /What Command did for you in/.test(t)), "The monthly value report is saved in Reports and sent to the owner");

const src = readFileSync(W, "utf8");
assert(/var CORE = \[[^\]]*"value_report"/.test(src) && /"google_rank_check",\s*"value_report"/.test(src), "Every department and Studio AI can answer 'what has Command done for me'");
assert(/offer\|value_report\|privacy_wording\/i/.test(src) && /money\|costs\|mission\|value\|trust\)/.test(src), "Staff and managers can't see the value ledger (it shows money)");
assert(/\["Value report", \(\) => valueMonthly\(e\)\]/.test(src) && /"value_ledger", "trust"\]\.includes\(key\)/.test(src), "The monthly report runs on the 1st and its settings save");
const app = await (await w.fetch(new Request(S + "/app/app.js"), base, { waitUntil() {} })).text();
assert(app.includes("VIEWS.value = async") && app.includes('["value", "Value"]') && app.includes("v149-val") && app.includes("Value to clients this month"), "Value has its own screen under Today, a strip on Home and a total on Client Commands");
const demo = await (await w.fetch(new Request(S + "/app/demo.js"), base, { waitUntil() {} })).text();
assert(demo.includes("/api/v1/team/value") && demo.includes("/api/v1/team/value?month=last"), "The demo clinic shows a filled-in value ledger");
