# v45: Studio AI gets hands in the CRM (add/update contacts, deals, free times, bookings with approval) and can
# hand jobs to department heads from Telegram or Command. Phone AI calls land in Command (Inbox > Phone calls,
# Telegram alerts, costs, reports). Phone script builder for clients. Margin view in Client Commands.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
crm, phone, ui, css = [open(D + f).read() for f in ('crm-team.js', 'phone-team.js', 'phone-ui.js', 'phone-ui.css')]
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:90], s.count(old))
    s = s.replace(old, new)

# ── CRM hands ──
rep('var ACTION_TYPES = {\n  propose_ghl_email: "ghl_email",', crm + '\n' + phone + '\nvar ACTION_TYPES = {\n  propose_ghl_appointment_book: "ghl_appointment_book",\n  propose_ghl_email: "ghl_email",')
rep('    case "ask_department": {\n      const target = DEPARTMENTS[input.department];',
    '    case "ghl_create_contact": case "ghl_update_contact": case "ghl_list_calendars": case "ghl_free_slots": case "ghl_create_opportunity": case "ghl_move_opportunity":\n      return crmTool(env, name, input, dept);\n    case "phone_calls":\n      { const r = await phoneList(env, { days: input.days, limit: 40 }); delete r.totals.cost_aud; return r; }\n    case "ask_department": {\n      const target = DEPARTMENTS[input.department];')
rep('    case "ghl_contact_archive": {\n      await addTags(', '    case "ghl_appointment_book":\n      return crmBook(env, p);\n    case "ghl_contact_archive": {\n      await addTags(')
rep('    case "team_rule":\n      return `New team rule', '    case "ghl_appointment_book":\n      return `Book ${who || "contact"} into ${p.calendar_name || "the calendar"} at ${fmtBne(p.start)}`;\n    case "team_rule":\n      return `New team rule')
rep('var CONFIRM_TYPES = /* @__PURE__ */ new Set(["ghl_email",', 'var CONFIRM_TYPES = /* @__PURE__ */ new Set(["ghl_appointment_book", "ghl_email",')
rep('var GHL_READ = ["ghl_search_contacts", "ghl_get_contact", "ghl_list_pipelines", "ghl_search_opportunities", "ghl_list_appointments"];',
    'var GHL_READ = ["ghl_search_contacts", "ghl_get_contact", "ghl_list_pipelines", "ghl_search_opportunities", "ghl_list_appointments", "ghl_list_calendars", "ghl_free_slots", "phone_calls"];')
rep('var CONTACT_ACTIONS = ["propose_ghl_email",', 'var CONTACT_ACTIONS = ["ghl_create_contact", "ghl_update_contact", "ghl_create_opportunity", "ghl_move_opportunity", "propose_ghl_appointment_book", "propose_ghl_email",')
# Studio AI Command (app, voice and Telegram) gets the same hands, plus its team.
rep('var SHARED = [\n  "get_mission_progress",', 'var SHARED = [\n  "ghl_create_contact",\n  "ghl_update_contact",\n  "ghl_list_pipelines",\n  "ghl_create_opportunity",\n  "ghl_move_opportunity",\n  "ghl_list_calendars",\n  "ghl_free_slots",\n  "propose_ghl_appointment_book",\n  "phone_calls",\n  "ask_department",\n  "get_mission_progress",')
rep('  return { env, dept: { id: "command", name: "Studio AI Command" }, run: { actions: [], deliverables: [], consulted: [] }, settings: settings || { autopilot: {} }, threadId: null, depth: 0 };',
    '  return { env, dept: { id: "command", name: "Studio AI Command" }, run: { actions: [], deliverables: [], consulted: [], settings: settings || { autopilot: {} } }, settings: settings || { autopilot: {} }, threadId: null, depth: 0, runAgent, maxSteps: 6 };')
rep('    "NEW MESSAGES TO CLIENTS: draft them with propose_',
    '    "CRM HANDS: you can add people to the CRM (ghl_create_contact), change their details (ghl_update_contact), create or move deals (ghl_list_pipelines, ghl_create_opportunity, ghl_move_opportunity) and check free times (ghl_list_calendars, ghl_free_slots). These are internal: do them straight away when asked, search first so you don\'t make duplicates, and say exactly what you did. Never say you can\'t add or change a contact. Booking someone in (propose_ghl_appointment_book) sends them a confirmation, so read the time back and approve it with decide_approval once Ty says yes.",\n    "YOUR TEAM: hand a job to a department head with ask_department (e.g. head_of_sales to research a lead and suggest the next step, head_of_marketing to draft a post, head_of_finance to check cash) and tell Ty what they came back with. Ask several at once when it helps.",\n    "PHONE AI: phone_calls shows who rang the AI receptionist, what they wanted, bookings and calls to follow up.",\n    "NEW MESSAGES TO CLIENTS: draft them with propose_')
# Staff can look up, add and update contacts and check times; support can't change the CRM.
rep('var MEM_STAFF_TOOLS = new Set(["team_jobs",', 'var MEM_STAFF_TOOLS = new Set(["ghl_search_contacts", "ghl_get_contact", "ghl_create_contact", "ghl_update_contact", "ghl_list_calendars", "ghl_free_slots", "ghl_list_appointments", "propose_ghl_appointment_book", "phone_calls", "team_jobs",')
rep('!/decide_approval|clear_approvals|update_client|propose_|send_|set_autopilot|remember_for_team/.test(String(name || ""))',
    '!/decide_approval|clear_approvals|update_client|propose_|send_|set_autopilot|remember_for_team|ghl_create|ghl_update|ghl_move/.test(String(name || ""))')

# ── Phone AI calls ──
rep('"inbox", "inbox_log", "client_book", "money"].includes(key)) throw new Error("Unknown setting");', '"inbox", "inbox_log", "client_book", "money", "phone_status"].includes(key)) throw new Error("Unknown setting");')
rep("  if (!enabled(env)) return { skipped: 'ghl not connected' };\n  const contactId = body.contact_id || body.contactId",
    "  if (!enabled(env)) return { skipped: 'ghl not connected' };\n  if (/^(call|phone|voice)/i.test(String(body.event || body.customData?.event || ''))) {\n    let r = await phoneSync(env);\n    if (r && r.ok && !r.new && !env.PHONE_NO_RETRY) { await new Promise((ok) => setTimeout(ok, 2e4)); r = await phoneSync(env); }\n    return { phone: r };\n  }\n  const contactId = body.contact_id || body.contactId")
rep('  if (!e.ANTHROPIC_API_KEY) return;\n  await runDueShifts(', '  await phoneSync(e).catch((x) => console.error("phone calls:", x.message));\n  if (!e.ANTHROPIC_API_KEY) return;\n  await runDueShifts(')
rep('    case "get_business_snapshot":\n      return snapshot(env);', '    case "get_business_snapshot":\n      return { ...await snapshot(env), phone_ai_last_7_days: (await phoneList(env, { days: 7, limit: 200 }).catch(() => null))?.totals || null };')
rep('  if (seg[0] === "fleet" || seg[0] === "fleet-info") {', '  if (seg[0] === "phone") { const pr = await phoneRoute(p, m, body, env, url); if (pr) return pr; }\n  if (seg[0] === "fleet" || seg[0] === "fleet-info") {')
# Bookings made by the phone or website AI aren't counted as outreach results.
rep('  const local = await select(env, "agent_prospects", "select=status,vertical,campaign&limit=2000").catch(() => []);\n  const byVertical = {};',
    '  if (counts["outreach-booked"] != null) {\n    const [ph, wb] = await Promise.all(["booked-by-phone-ai", "website-ai-booking"].map((t) => countByTag(env, t).catch(() => 0)));\n    counts["outreach-booked"] = Math.max(0, counts["outreach-booked"] - (ph || 0) - (wb || 0));\n    counts["booked-by-phone-ai"] = ph || 0;\n  }\n  const local = await select(env, "agent_prospects", "select=status,vertical,campaign&limit=2000").catch(() => []);\n  const byVertical = {};')

# ── UI ──
assert '`' not in ui + css and '${' not in ui + css
rep('  VIEWS.brain = async (el) => {', ui.replace('\\', '\\\\') + '  VIEWS.brain = async (el) => {')
rep('["inbox", "Inbox", "check", [["approvals", "Waiting for you"], ["records", "History"]]]', '["inbox", "Inbox", "check", [["approvals", "Waiting for you"], ["calls", "Phone calls"], ["records", "History"]]]')
rep('    fleet: ["Client Commands",', '    calls: ["Phone calls", "Every call your AI receptionist answers, and the phone script builder"],\n    fleet: ["Client Commands",')
rep('var VIEW_LABEL = { fleet:"Client Commands",', 'var VIEW_LABEL = { calls:"Phone calls",fleet:"Client Commands",')
rep('/* Studio console (v44) */', css.replace('\\', '\\\\') + '\n/* Studio console (v44) */')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v45 CRM hands, phone calls, script builder and margins applied')
