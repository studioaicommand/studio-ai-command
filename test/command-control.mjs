// v21 Command control tests: propose -> Telegram card -> approve (voice code or Telegram tap) -> real GHL call.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_actions: [], team_settings: [{ key: "telegram", value: { chat_id: 42, bot: "b", username: "studioflowandsystems" } }, { key: "command", value: { auto: true } }], team_audit: [], team_memory: [] };
const ghl = [], tg = [];
let seq = 0;
const parseQ = (qs) => { const f = []; for (const [k, v] of new URLSearchParams(qs)) { if (["order", "limit", "select", "offset", "on_conflict"].includes(k)) continue; const m = v.match(/^(eq|neq|gte|lt)\.(.*)$/); if (m) f.push([k, m[1], m[2]]); } return f; };
const match = (row, f) => f.every(([k, op, v]) => { const val = k.includes("->>") ? (row[k.split("->>")[0]] || {})[k.split("->>")[1]] : row[k]; return op === "eq" ? String(val) === v : op === "neq" ? String(val) !== v : op === "gte" ? String(val) >= v : String(val) < v; });
globalThis.fetch = async (u, init = {}) => {
  u = String(u); const method = init.method || "GET"; const body = init.body ? JSON.parse(init.body) : undefined;
  if (u.startsWith("https://sb.test/rest/v1/")) {
    const [path, qs = ""] = u.slice(24).split("?"); const t = DB[path] || (DB[path] = []); const f = parseQ(qs);
    if (method === "GET") { const lim = Number(new URLSearchParams(qs).get("limit")) || 1e9; return Response.json(t.filter((r) => match(r, f)).slice(0, lim)); }
    if (method === "POST") { const rows = (Array.isArray(body) ? body : [body]).map((r) => ({ id: "00000000-0000-4000-8000-" + String(++seq).padStart(12, "0"), created_at: new Date().toISOString(), ...r })); t.push(...rows); return Response.json(rows); }
    if (method === "PATCH") { const rows = t.filter((r) => match(r, f)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); }
    return Response.json([]);
  }
  if (u.startsWith("https://services.leadconnectorhq.com")) { ghl.push({ method, u, body, v: init.headers?.Version });
    if (u.includes("/opportunities/search")) return Response.json({ opportunities: [{ id: "opp1", contactId: "cTEST123" }] });
    return Response.json({ ok: true }); }
  if (u.startsWith("https://api.telegram.org")) { tg.push({ u, body }); return Response.json({ ok: true, result: { message_id: 7 } }); }
  if (u.startsWith("https://api.anthropic.com")) return Response.json({ stop_reason: "end_turn", content: [{ type: "text", text: "ok" }] });
  return Response.json({});
};
const mod = await import(W);
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", TEAM_API_KEY: "team", SUPABASE_URL: "https://sb.test", SUPABASE_SERVICE_ROLE_KEY: "s", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", TELEGRAM_BOT_TOKEN: "t", ANTHROPIC_API_KEY: "a" };
const tool = async (name, args) => { const r = await mod.default.fetch(new Request("https://studioflowandsystems.app/api/v1/operator/tool", { method: "POST", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: JSON.stringify({ name, arguments: args }) }), env, { waitUntil() {} }); return (await r.json()).result; };

// 1) Propose a cancel from Command -> Telegram card with Approve/Reject, nothing sent to GHL yet
let r = await tool("propose_ghl_appointment_cancel", { appointment_id: "apptXYZ789", contact_name: "Ty (test)", when: "Thu 5 Nov 8:00am", reason: "Ty's own test booking" });
assert(r.queued_for_approval && r.action_id, "Cancel is queued for approval, not done: " + JSON.stringify(r).slice(0, 120));
assert(!ghl.some((g) => g.method === "PUT"), "Nothing changed in GHL before approval");
const card = tg.find((x) => x.u.endsWith("/sendMessage") && JSON.stringify(x.body).includes("ap:" + r.action_id));
assert(card && /Cancel appointment with Ty \(test\)/.test(card.body.text), "Telegram card sent with Approve/Reject buttons");
// 2) Voice/text approval needs read-back + code
let d = await tool("decide_approval", { id: r.action_id, decision: "approve" });
assert(d.needs_confirmation && d.confirm_code && /Cancel the appointment/.test(d.read_back), "Approve by voice first returns a read-back + code");
assert(!ghl.some((g) => g.method === "PUT"), "Still nothing changed without the code");
d = await tool("decide_approval", { id: r.action_id, decision: "approve", confirm_code: d.confirm_code });
const put = ghl.find((g) => g.method === "PUT" && g.u.endsWith("/calendars/events/appointments/apptXYZ789"));
assert(d.ok && d.done === "done" && put && put.body.appointmentStatus === "cancelled" && put.v === "2021-04-15", "After the yes + code, the appointment is cancelled in GHL");
d = await tool("decide_approval", { id: r.action_id, decision: "approve" });
assert(!d.ok, "Can't approve the same item twice");

// 3) Archive a test lead via Telegram tap (callback) -> tags + abandoned deal
r = await tool("propose_ghl_contact_archive", { contact_id: "cTEST123", contact_name: "Physio clinic test", is_test: true, reason: "Ty's test" });
assert(r.queued_for_approval, "Archive is queued for approval");
const deps = null; // Telegram callback path uses the real worker route
const upd = { update_id: 900, callback_query: { id: "cb1", data: "ap:" + r.action_id, from: { username: "studioflowandsystems" }, message: { message_id: 7, chat: { id: 42 }, text: "card" } } };
// call handleUpdate through the queue consumer the same way production does
DB.studio_command_jobs = [{ id: "11111111-1111-4111-8111-111111111111", kind: "telegram", status: "queued", params: { update: upd }, department: "chief_of_staff", title: "t" }];
await mod.default.queue({ messages: [{ body: { job_id: "11111111-1111-4111-8111-111111111111" }, ack() {}, retry() {} }] }, env, { waitUntil() {} });
const tags = ghl.find((g) => g.method === "POST" && g.u.endsWith("/contacts/cTEST123/tags"));
const opp = ghl.find((g) => g.method === "PUT" && g.u.endsWith("/opportunities/opp1/status"));
assert(tags && tags.body.tags.includes("test-contact") && tags.body.tags.includes("archived-by-studio-ai"), "Telegram Approve tap tags the contact archived + test-contact");
assert(opp && opp.body.status === "abandoned", "Its open deal is marked abandoned");
assert(!ghl.some((g) => g.method === "DELETE" && g.u.includes("/contacts/cTEST123")), "Archive never deletes the contact");

// 4) Delete is never automatic, and is labelled permanent
r = await tool("propose_ghl_contact_delete", { contact_id: "cDEL4567", contact_name: "Junk Lead", reason: "Ty asked to delete" });
const dcard = tg.find((x) => JSON.stringify(x.body).includes("ap:" + r.action_id));
assert(r.queued_for_approval && /PERMANENTLY delete/.test(dcard.body.text), "Delete waits for approval and the card says PERMANENTLY");
r = await tool("set_autopilot", { type: "ghl_contact_delete", mode: "auto" }).catch((e) => ({ error: e.message }));
assert(!(r && r.ok && JSON.stringify(r).includes('"auto"') && !JSON.stringify(r).match(/can't|cannot|only|not/i)), "Delete can't be put on autopilot: " + JSON.stringify(r).slice(0, 140));

// 5) Tasks for Ty arrive on Telegram with Done / Not doing
r = await tool("propose_owner_task", { title: "Ring Enhanced Dental for the right email", details: "1800 833 844", reason: "Demo link still not sent" });
const tcard = tg.find((x) => /Task for you: Ring Enhanced Dental/.test(x.body?.text || ""));
assert(tcard && JSON.stringify(tcard.body.reply_markup).includes("Done"), "Owner task reaches Telegram with Done / Not doing buttons");

// 6) Bulk clear stale approvals with read-back + code
const old = new Date(Date.now() - 4 * 864e5).toISOString();
for (let i = 0; i < 5; i++) DB.team_actions.push({ id: "aaaaaaaa-0000-4000-8000-00000000000" + i, type: "owner_task", status: "pending", title: "Call clinic " + i, department: "head_of_sales", created_at: old, params: {} });
let c = await tool("clear_approvals", { older_than_days: 2, type: "owner_task" });
assert(c.needs_confirmation && c.matched === 5 && /Reject 5/.test(c.read_back), "Bulk clear reads back 5 stale call cards first");
c = await tool("clear_approvals", { older_than_days: 2, type: "owner_task", confirm_code: c.confirm_code });
assert(/Rejected 5 of 5/.test(c.done) && DB.team_actions.filter((a) => a.title.startsWith("Call clinic") && a.status === "rejected").length === 5, "After the yes + code, all 5 are rejected");
assert(DB.team_actions.some((a) => a.type === "owner_task" && a.status === "pending" && /Enhanced/.test(a.title)), "Today's new task is untouched");
c = await tool("clear_approvals", {});
assert(!c.ok, "Bulk clear refuses with no filter");
console.log("All command-control tests passed.");
