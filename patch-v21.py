# v21: Command control. Command (text, voice, Telegram) and the Chief of Staff can PROPOSE real GHL changes;
# nothing runs until Ty approves (Telegram button, or a spoken/typed yes + read-back code in Command).
import sys
f = sys.argv[1]
s = open(f).read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:90])
    s = s.replace(old, new)

def before(anchor, text):
    rep(anchor, text + anchor)

# 1) Tool definitions (shared by department heads and Command) -------------------------------
before('  propose_owner_task: {\n', '''  propose_ghl_appointment_cancel: {
    description: "Propose CANCELLING a GHL calendar appointment (find it first with ghl_list_appointments). Nothing changes until Ty approves. GHL may email the contact about the cancellation.",
    input_schema: {
      type: "object",
      properties: { appointment_id: { type: "string" }, contact_name: contactName, when: { type: "string", description: "When the appointment is, in Brisbane time, as Ty would say it (e.g. Thu 5 Nov 8:00am)." }, calendar: { type: "string" }, reason },
      required: ["appointment_id", "when", "reason"]
    }
  },
  propose_ghl_appointment_move: {
    description: "Propose MOVING a GHL appointment to a new time (find it first with ghl_list_appointments; agree the new time with Ty). GHL checks the new time is free. Nothing changes until Ty approves.",
    input_schema: {
      type: "object",
      properties: { appointment_id: { type: "string" }, contact_name: contactName, when: { type: "string", description: "Current time, Brisbane." }, new_start: { type: "string", description: "New start as ISO 8601 with offset, e.g. 2026-11-06T09:00:00+10:00" }, duration_minutes: { type: "integer", default: 30 }, reason },
      required: ["appointment_id", "new_start", "reason"]
    }
  },
  propose_ghl_contact_archive: {
    description: "Propose clearing a contact out of the active pipeline WITHOUT deleting it: tags it archived (and test-contact if it was a test), marks its open deals abandoned. Reversible. Prefer this over delete.",
    input_schema: {
      type: "object",
      properties: { contact_id: contactId, contact_name: contactName, is_test: { type: "boolean", description: "True if Ty says it was his own test." }, reason },
      required: ["contact_id", "reason"]
    }
  },
  propose_ghl_contact_delete: {
    description: "Propose PERMANENTLY deleting a GHL contact (and its history). Only when Ty explicitly asks to delete, not just clear. Cannot be undone. Nothing changes until Ty approves.",
    input_schema: {
      type: "object",
      properties: { contact_id: contactId, contact_name: contactName, contact_email: { type: "string" }, reason },
      required: ["contact_id", "contact_name", "reason"]
    }
  },
''')

rep('  propose_team_rule: "team_rule"\n};', '''  propose_team_rule: "team_rule",
  propose_ghl_appointment_cancel: "ghl_appointment_cancel",
  propose_ghl_appointment_move: "ghl_appointment_move",
  propose_ghl_contact_archive: "ghl_contact_archive",
  propose_ghl_contact_delete: "ghl_contact_delete"
};''')

# 2) Titles ------------------------------------------------------------------------------------
before('    case "team_rule":\n      return `New team rule', '''    case "ghl_appointment_cancel":
      return `Cancel appointment${who ? " with " + who : ""}${p.when ? " (" + p.when + ")" : ""}`;
    case "ghl_appointment_move":
      return `Move appointment${who ? " with " + who : ""}${p.when ? " from " + p.when : ""} to ${fmtBne(p.new_start)}`;
    case "ghl_contact_archive":
      return `Clear ${who || "contact"} from the pipeline${p.is_test ? " (test contact)" : ""}`;
    case "ghl_contact_delete":
      return `PERMANENTLY delete contact ${who || p.contact_id}${p.contact_email ? " (" + p.contact_email + ")" : ""}`;
''')

# 3) Execution after approval ------------------------------------------------------------------
before('    case "owner_task":\n      return { ok: true, note: "Marked done" };', '''    case "ghl_appointment_cancel": {
      if (!/^[A-Za-z0-9_-]{6,}$/.test(String(p.appointment_id || ""))) throw new Error("Missing appointment id.");
      await req(env, "PUT", `/calendars/events/appointments/${p.appointment_id}`, { appointmentStatus: "cancelled" }, "2021-04-15");
      return { ok: true, note: "Appointment cancelled in GHL." };
    }
    case "ghl_appointment_move": {
      if (!/^[A-Za-z0-9_-]{6,}$/.test(String(p.appointment_id || ""))) throw new Error("Missing appointment id.");
      const st = Date.parse(p.new_start || "");
      if (!st || st < Date.now()) throw new Error("The new time must be a valid time in the future.");
      const mins = Math.min(240, Math.max(10, Number(p.duration_minutes) || 30));
      await req(env, "PUT", `/calendars/events/appointments/${p.appointment_id}`, { startTime: new Date(st).toISOString(), endTime: new Date(st + mins * 6e4).toISOString() }, "2021-04-15");
      return { ok: true, note: "Appointment moved to " + fmtBne(p.new_start) + "." };
    }
    case "ghl_contact_archive": {
      await addTags(env, p.contact_id, ["archived-by-studio-ai", ...(p.is_test ? ["test-contact"] : [])]);
      let abandoned = 0;
      const opps = await req(env, "GET", `/opportunities/search?${q({ location_id: env.GHL_LOCATION_ID, contact_id: p.contact_id, status: "open", limit: 20 })}`).catch(() => ({}));
      for (const o of opps?.opportunities || []) if (o.contactId === p.contact_id || o.contact?.id === p.contact_id) { await setOpportunityStatus(env, o.id, "abandoned").catch(() => {}); abandoned++; }
      return { ok: true, note: `Tagged archived${p.is_test ? " + test-contact" : ""}; ${abandoned} open deal(s) marked abandoned.` };
    }
    case "ghl_contact_delete": {
      if (!/^[A-Za-z0-9_-]{6,}$/.test(String(p.contact_id || ""))) throw new Error("Missing contact id.");
      await req(env, "DELETE", `/contacts/${p.contact_id}`);
      return { ok: true, note: "Contact permanently deleted from GHL." };
    }
''')
before('var GHL = "https://services.leadconnectorhq.com";', '''var fmtBne = (iso) => { const t = Date.parse(iso || ""); return t ? new Date(t).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : String(iso || "?"); };
''')

# 4) Safety: always need Ty, never autopilot, read-back + code by voice/text, Telegram even in quiet hours
rep('  team_rule: "New rules for the whole team"\n};', '''  team_rule: "New rules for the whole team",
  ghl_appointment_cancel: "Cancel appointments",
  ghl_appointment_move: "Move appointments",
  ghl_contact_archive: "Clear contacts from the pipeline",
  ghl_contact_delete: "Permanently delete contacts"
};''')
rep('var CONFIRM_TYPES = /* @__PURE__ */ new Set(["ghl_email", "ghl_sms", "stripe_draft_invoice", "outreach_email", "campaign_enrol"]);',
    'var CONFIRM_TYPES = /* @__PURE__ */ new Set(["ghl_email", "ghl_sms", "stripe_draft_invoice", "outreach_email", "campaign_enrol", "ghl_appointment_cancel", "ghl_appointment_move", "ghl_contact_archive", "ghl_contact_delete"]);')
rep('var URGENT = /* @__PURE__ */ new Set(["ghl_email", "ghl_sms", "stripe_draft_invoice"]);',
    'var URGENT = /* @__PURE__ */ new Set(["ghl_email", "ghl_sms", "stripe_draft_invoice", "ghl_appointment_cancel", "ghl_appointment_move", "ghl_contact_archive", "ghl_contact_delete"]);')
before('  if (a.type === "owner_task") return', '''  if (a.type === "ghl_appointment_cancel") return `Cancel the appointment${p.contact_name ? " with " + p.contact_name : ""}${p.when ? " on " + p.when : ""}. GHL may email them about it.`;
  if (a.type === "ghl_appointment_move") return `Move the appointment${p.contact_name ? " with " + p.contact_name : ""}${p.when ? " from " + p.when : ""} to ${fmtBne(p.new_start)}.`;
  if (a.type === "ghl_contact_archive") return `Clear ${p.contact_name || "this contact"} out of the pipeline: tag archived${p.is_test ? " and test-contact" : ""}, mark open deals abandoned. Nothing is deleted.`;
  if (a.type === "ghl_contact_delete") return `PERMANENTLY delete ${p.contact_name || "this contact"}${p.contact_email ? " (" + p.contact_email + ")" : ""} from GHL, with its history. This can't be undone.`;
''')

# 5) Who can propose them ------------------------------------------------------------------------
rep('var CONTACT_ACTIONS = ["propose_ghl_email", "propose_ghl_sms", "propose_ghl_tags", "propose_ghl_note", "propose_ghl_task"];',
    'var CONTACT_ACTIONS = ["propose_ghl_email", "propose_ghl_sms", "propose_ghl_tags", "propose_ghl_note", "propose_ghl_task", "propose_ghl_appointment_cancel", "propose_ghl_appointment_move", "propose_ghl_contact_archive"];')
rep('"propose_ghl_opportunity_status", "analyse_website", "acquisition_costs", "outreach_snapshot", ...CONSULT]',
    '"propose_ghl_opportunity_status", "propose_ghl_contact_delete", "propose_owner_task", "analyse_website", "acquisition_costs", "outreach_snapshot", ...CONSULT]')
rep('  "propose_ghl_opportunity_status"\n];', '''  "propose_ghl_opportunity_status",
  "propose_ghl_appointment_cancel",
  "propose_ghl_appointment_move",
  "propose_ghl_contact_archive",
  "propose_ghl_contact_delete",
  "propose_owner_task"
];''')

# 6) Tasks for Ty arrive on Telegram with Done / Not doing buttons ------------------------------
rep('  if (d.route === "ask" && telegramReady(env, settings)) await askTy',
    '''  if (d.route === "task" && telegramReady(env, settings)) {
    const p = action.params || {};
    await notify(env, `\\u{1F4DD} <b>Task for you: ${esc2(action.title)}</b>${p.details ? "\\n\\n" + esc2(String(p.details).slice(0, 600)) : ""}${p.due_date ? "\\n\\nDue: " + esc2(p.due_date) : ""}${action.reason ? "\\n\\n<i>" + esc2(String(action.reason).slice(0, 300)) + "</i>" : ""}`,
      { buttons: [[{ text: "\\u2705 Done", callback_data: `ap:${action.id}` }, { text: "\\u2716 Not doing", callback_data: `rj:${action.id}` }]], settings }).catch(() => {});
  }
  if (d.route === "ask" && telegramReady(env, settings)) await askTy''')

# 7) Bulk-clear stale approvals (Command tool) -------------------------------------------------
rep('  ...SHARED.map((name)', '''  fn("clear_approvals", "Reject many waiting approvals/tasks at once on Ty's say-so (e.g. stale call cards). Filter by older_than_days, type (e.g. owner_task), department, title_contains, or exact ids. First call returns a read-back list and confirm_code; only after Ty's clear yes call again with the same filters and confirm_code.", { older_than_days: { type: "number" }, type: { type: "string" }, department: { type: "string" }, title_contains: { type: "string" }, ids: { type: "array", items: { type: "string" } }, reason: { type: "string" }, confirm_code: { type: "string" } }),
  ...SHARED.map((name)''')
before('  if (name === "decide_approval") {', '''  if (name === "clear_approvals") {
    const rows = await select(env, "team_actions", "status=eq.pending&order=created_at.asc&limit=200&select=id,department,type,title,created_at");
    const cut = Number(args.older_than_days) > 0 ? Date.now() - Number(args.older_than_days) * 864e5 : null;
    const ids = Array.isArray(args.ids) && args.ids.length ? new Set(args.ids.map(String)) : null;
    const tc = String(args.title_contains || "").toLowerCase();
    const pick = rows.filter((r) => (!ids || ids.has(r.id)) && (!cut || Date.parse(r.created_at) < cut) && (!args.type || r.type === args.type) && (!args.department || r.department === args.department) && (!tc || String(r.title).toLowerCase().includes(tc)));
    if (!ids && !cut && !args.type && !args.department && !tc) return { ok: false, error: "Give at least one filter (older_than_days, type, department, title_contains or ids)." };
    if (!pick.length) return { ok: true, matched: 0, note: "Nothing waiting matches that." };
    const intent = { ids: pick.map((r) => r.id).sort() };
    if (!await codeOk(env, "clear_approvals", intent, args.confirm_code)) return { ok: true, needs_confirmation: true, matched: pick.length, confirm_code: await changeCode(env, "clear_approvals", intent), read_back: `Reject ${pick.length} waiting item(s): ` + pick.slice(0, 12).map((r) => r.title).join("; ") + (pick.length > 12 ? `; and ${pick.length - 12} more` : ""), say: "Read the count and a few titles to Ty. Only after a clear yes, call clear_approvals again with the same filters and this confirm_code." };
    let done = 0;
    for (const r of pick) { try { await rejectAction(env, r.id, args.reason || "Cleared in bulk by Ty"); done++; } catch {} }
    return { ok: true, done: `Rejected ${done} of ${pick.length}.` };
  }
''')

# 8) Instructions: Command is the boss; asks Ty for yes; steers the Chief of Staff --------------
rep('You cannot cancel, move or delete GHL appointments, or delete GHL contacts or leads: if Ty asks, say so plainly and tell him to do it in GHL (Calendars > Appointments, or Contacts). If a request is queued as a job, say it is queued, not done.",',
    'CONTROL WITH APPROVAL: you can make real GHL changes, always via an approval Ty says yes to. Cancel or move appointments (ghl_list_appointments, then propose_ghl_appointment_cancel / propose_ghl_appointment_move). Clear a lead or test contact (find it, then propose_ghl_contact_archive; is_test when it was Ty\'s test). Only propose_ghl_contact_delete when Ty says delete, and warn it is permanent. Clear stale approvals with clear_approvals. Give Ty a to-do with propose_owner_task (it reaches his Telegram with Done buttons). Each proposal sends Ty a Telegram card with Approve / Reject; on voice or in chat you can instead read it back, get a clear yes, and call decide_approval with the code. Until a tool returns done, say it is waiting for his approval. If a request is queued as a job, say it is queued, not done.",\n    "STEERING THE TEAM: you run the business with Ty. Turn his goals into work: brief the Chief of Staff (ask_department_head chief_of_staff) to plan and coordinate the department heads; their client, money and GHL changes come back to Ty as approvals. Check progress with team_jobs and command_status, and tell Ty what needs his yes.",')

# 9) Telegram tap feedback for tasks --------------------------------------------------------------
import re
m = re.search(r'const a = await deps\.approveAction\(env, id\);\n(\s*)note = `([^`]*)`;', s)
assert m
s = s[:m.start()] + 'const a = await deps.approveAction(env, id);\n' + m.group(1) + 'note = a.type === "owner_task" ? `\\u2705 Done: ${a.title}` : `' + m.group(2) + '`;' + s[m.end():]

open(f, 'w').write(s)
print('v21 command-control patch applied')
