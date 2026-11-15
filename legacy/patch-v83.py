# v83 LinkedIn connections: every day the Social Prospect Finder finds the decision makers (owners, founders, practice and
# clinic managers) at businesses that need what we sell, and the LinkedIn Connector queues connection requests for Ty,
# with or without a personal note. After they accept, the first message is written for him. Within LinkedIn's limits.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

rep('var DM_DEFAULT = { autofill: true, daily: { instagram: 20, facebook: 15, linkedin: 20 },', 'var DM_DEFAULT = { autofill: true, li_notes: false, li_weekly: 100, daily: { instagram: 20, facebook: 15, linkedin: 20 },')

# a connection without a note is allowed (free LinkedIn accounts get only a few notes a month)
rep('function dmCheck(item, items) {\n  const ch = DM_CHANNELS[item.channel];\n  if (!ch) return "Pick Instagram, Facebook or LinkedIn.";',
    'function dmCheck(item, items) {\n  const ch = DM_CHANNELS[item.channel];\n  if (!ch) return "Pick Instagram, Facebook or LinkedIn.";\n  if (item.step === "connect" && item.no_note) return item.profile_url && ch.re.test(String(item.profile_url)) ? null : "That isn\'t a LinkedIn profile link.";')

SERVER = r'''var LI_HUNT_TOOL = { name: "save_people", description: "Save the people you found.", input_schema: { type: "object", properties: { people: { type: "array", items: { type: "object", properties: {
  name: { type: "string" }, title: { type: "string", description: "Their role, e.g. Owner, Founder, Practice Manager." }, company: { type: "string" }, location: { type: "string" },
  linkedin: { type: "string", description: "Their personal LinkedIn profile link (linkedin.com/in/...), exactly as it appeared in the results." }, website: { type: "string" },
  signal: { type: "string", description: "Why their business would need us, from what the results actually show (e.g. 'Runs a 3-chair dental practice, booking by phone only'). Never guess." } }, required: ["name", "company", "linkedin", "signal"] } } }, required: ["people"] } };
var LI_ROLES = "owner, founder, co-founder, director, principal, practice manager, clinic manager, general manager";
async function liHunt(env, cfg, u) {
  const verts = cfg.verticals.length ? cfg.verticals : Object.keys(OUTREACH);
  const k = cfg.li_rot || 0, vert = verts[k % verts.length], area = cfg.areas[k % Math.max(1, cfg.areas.length)] || "Brisbane";
  cfg.li_rot = k + 1;
  const what = (OUTREACH[vert] || {}).label || vert;
  const out = await wsdAsk(env, u, "fast", {
    max_tokens: 2500,
    system: "You are the Social Prospect Finder in Studio Flow & Systems' marketing team, building Ty's LinkedIn network with people who would need what we sell: websites, AI receptionists and follow-up systems for service businesses that lose enquiries and bookings. Find real decision makers (" + LI_ROLES + ") at established " + what + " in " + area + ", Australia. Only people whose personal LinkedIn profile appears in the search results; copy the link exactly; never invent a person, a profile or a reason.",
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4, user_location: { type: "approximate", country: "AU", timezone: "Australia/Brisbane" } }, LI_HUNT_TOOL],
    messages: [{ role: "user", content: "Find up to 8 decision makers at " + what + " in " + area + ". Search LinkedIn directly (for example site:linkedin.com/in owner " + what.split(" (")[0] + " " + area + "). Then call save_people." }]
  }, "save_people");
  let added = 0;
  const known = new Set((await select(env, "agent_prospects", "select=id,leak_report&limit=5000").catch(() => [])).map((p) => p.leak_report?.socials?.linkedin).filter(Boolean));
  for (const b of (Array.isArray(out.people) ? out.people : []).slice(0, 8)) {
    const li = String(b.linkedin || "").trim().replace(/[).,]+$/, "");
    const company = String(b.company || "").trim().slice(0, 200), person = String(b.name || "").trim().slice(0, 80);
    if (!/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^\s?#]{2,120}$/.test(li) || !company || !person || !String(b.signal || "").trim()) continue;
    if (known.has(li)) continue;
    known.add(li);
    const [dup] = await select(env, "agent_prospects", "business_name=eq." + encodeURIComponent(company) + "&select=id,leak_report&limit=1").catch(() => []);
    if (dup) { if (!dup.leak_report?.socials?.linkedin) await update(env, "agent_prospects", "id=eq." + dup.id, { decision_maker: person, leak_report: { ...(dup.leak_report || {}), socials: { ...(dup.leak_report?.socials || {}), linkedin: li }, li_title: String(b.title || "").slice(0, 80) } }).then(() => added++).catch(() => {}); continue; }
    const web = /^https?:\/\//.test(String(b.website || "")) ? String(b.website).slice(0, 300) : null;
    if (web && (await select(env, "agent_prospects", "website=eq." + encodeURIComponent(web) + "&select=id&limit=1").catch(() => [])).length) continue;
    await insert(env, "agent_prospects", [{ business_name: company, decision_maker: person, website: web, location: String(b.location || area).slice(0, 120), niche: vert, vertical: vert, leak: String(b.signal).slice(0, 400), evidence: String(b.signal).slice(0, 400), source_url: li, score: 6, status: "to_send", source: "li_hunt", leak_report: { socials: { linkedin: li }, li_title: String(b.title || "").slice(0, 80) } }]).then(() => added++).catch(() => {});
  }
  return { vertical: vert, area, added };
}
function liWeek(items) { return items.filter((x) => x.channel === "linkedin" && x.step === "connect" && x.sent_at && Date.now() - Date.parse(x.sent_at) < 7 * 864e5).length; }
async function liFill(env, { count = 10, manual = false } = {}) {
  const q = await dmLoad(env), u = wsdUsage(), res = { queued: 0, skipped: [], hunted: [] };
  const waiting = q.items.filter((x) => x.status === "ready" && x.channel === "linkedin" && x.step === "connect").length;
  const roomWeek = Math.max(0, (q.cfg.li_weekly || 100) - liWeek(q.items) - waiting);
  const want = Math.max(0, Math.min(+count || 10, 25, roomWeek, (q.cfg.daily.linkedin || 0) * 2 - waiting));
  if (!want) return { ...res, note: roomWeek ? "Today's LinkedIn connections are already queued." : "You're at LinkedIn's weekly limit of about " + (q.cfg.li_weekly || 100) + " connection requests. More next week." };
  const touched = new Set(q.items.filter((x) => x.channel === "linkedin" || ["sent", "ready"].includes(x.status)).map((x) => x.prospect_id));
  const verts = q.cfg.verticals.length ? q.cfg.verticals : null;
  const pick = async () => (await select(env, "agent_prospects", "status=in.(to_send,sent)&order=score.desc.nullslast,created_at.desc&limit=200&select=id,business_name,decision_maker,website,instagram,location,niche,vertical,leak,evidence,leak_report,status").catch(() => []))
    .filter((p) => p.leak_report?.socials?.linkedin && !touched.has(p.id) && (!verts || verts.includes(p.vertical || p.niche)));
  let pool = await pick();
  for (let h = 0; pool.length < want && h < 3; h++) { res.hunted.push(await liHunt(env, q.cfg, u).catch((e) => ({ error: e.message }))); pool = await pick(); }
  for (const pr of pool) {
    if (res.queued >= want) break;
    const url = pr.leak_report.socials.linkedin, who = pr.decision_maker || "the owner", title = pr.leak_report.li_title || "";
    if (!q.cfg.li_notes) {
      const item = { id: "dm" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), prospect_id: pr.id, business_name: pr.business_name, location: pr.location || "", vertical: pr.vertical || pr.niche || "", channel: "linkedin", step: "connect", no_note: true,
        profile_url: url, person_name: String(pr.decision_maker || "").split(" ")[0].slice(0, 40), hook: String(pr.leak || "").slice(0, 160), message: "", why: (who + (title ? ", " + title : "") + " at " + pr.business_name + ". " + (pr.leak || "")).slice(0, 240), status: "ready", created_at: new Date().toISOString() };
      q.items.push(item); res.queued++; touched.add(pr.id); continue;
    }
    try {
      const r = await dmWrite(env, { ...pr, business_name: pr.business_name + (pr.decision_maker ? " (" + pr.decision_maker + (title ? ", " + title : "") + ")" : "") }, q.items, u, { channel: "linkedin", step: "connect" });
      if (r.item) { r.item.business_name = pr.business_name; r.item.profile_url = url; q.items.push(r.item); res.queued++; touched.add(pr.id); } else res.skipped.push({ name: pr.business_name, why: r.skip });
    } catch (e) { res.skipped.push({ name: pr.business_name, why: String(e.message).slice(0, 120) }); if (/spend limit|paused|budget/i.test(e.message)) break; }
  }
  await dmSave(env, q);
  res.cost_aud = await wsdLog(env, u, "dm_desk").catch(() => null);
  if (!manual) await audit(env, { actor: "Head of Marketing", action: "linkedin_fill", target_type: "dm_queue", target_id: "li", summary: res.queued + " LinkedIn connections queued" }).catch(() => {});
  return res;
}
'''
rep('async function dmFollowups(env, q, u) {', SERVER + 'async function dmFollowups(env, q, u) {')

# every morning: DMs, then LinkedIn connections
rep('''  const r = await dmFill(env, { count: Math.min(25, capTotal) });
  const after = await dmLoad(env), ready = after.items.filter((x) => x.status === "ready").length;''', '''  const r = await dmFill(env, { count: Math.min(25, capTotal) });
  const li = await liFill(env, { count: q.cfg.daily.linkedin || 0 }).catch((e) => ({ queued: 0, error: e.message }));
  const after = await dmLoad(env), ready = after.items.filter((x) => x.status === "ready").length;''')
rep('''"\\u{1F4AC} <b>DM Desk: " + ready + " messages ready</b>\\n" + r.written + " new today''', '''"\\u{1F4AC} <b>DM Desk: " + ready + " ready</b>\\n" + r.written + " new messages" + (li.queued ? " and " + li.queued + " LinkedIn connections" : "") + " today''')
rep('  if (p === "/dm-queue/fill" && m === "POST") return json(', '  if (p === "/dm-queue/linkedin-fill" && m === "POST") return json({ ok: true, ...(await liFill(env, { count: Math.max(1, Math.min(25, +body.count || 10)), manual: true })) });\n  if (p === "/dm-queue/fill" && m === "POST") return json(')
rep('    q.cfg = { ...q.cfg, daily: d, autofill: body.autofill == null ? q.cfg.autofill : !!body.autofill,',
    '    q.cfg = { ...q.cfg, daily: d, autofill: body.autofill == null ? q.cfg.autofill : !!body.autofill, li_notes: body.li_notes == null ? q.cfg.li_notes : !!body.li_notes,')
rep('      if (t >= cap) warn = "That\'s " + (t + 1) + " on " + DM_CHANNELS[x.channel].name + " today, over your limit of " + cap + ". Leave the rest for tomorrow to keep the account safe.";',
    '      if (t >= cap) warn = "That\'s " + (t + 1) + " on " + DM_CHANNELS[x.channel].name + " today, over your limit of " + cap + ". Leave the rest for tomorrow to keep the account safe.";\n      else if (x.channel === "linkedin" && x.step === "connect" && liWeek(q.items) >= (q.cfg.li_weekly || 100)) warn = "That\'s over LinkedIn\'s weekly limit of about " + (q.cfg.li_weekly || 100) + " connection requests. Stop for this week so LinkedIn doesn\'t restrict you.";')
rep('      ready: q.items.filter((x) => x.status === "ready").sort(', '      li_week: liWeek(q.items), ready: q.items.filter((x) => x.status === "ready").sort(')

# the team's tools
rep('    description: "Have the marketing team find businesses on social media and write more unique DMs into Ty\'s queue now (up to 25). Ty still sends each one himself.",\n    input_schema: { type: "object", properties: { count: { type: "integer", description: "How many (1-25, default 10)." } } }',
    '    description: "Have the marketing team find businesses on social media and write more unique DMs into Ty\'s queue now (up to 25), or with channel linkedin_connections, find decision makers at businesses that need us and queue LinkedIn connection requests. Ty still sends each one himself.",\n    input_schema: { type: "object", properties: { count: { type: "integer", description: "How many (1-25, default 10)." }, channel: { type: "string", enum: ["dms", "linkedin_connections"] } } }')
rep('    case "dm_desk_fill":\n      return dmFill(env, { count: Math.max(1, Math.min(25, +input.count || 10)), manual: true });',
    '    case "dm_desk_fill":\n      return input.channel === "linkedin_connections" ? liFill(env, { count: Math.max(1, Math.min(25, +input.count || 10)), manual: true }) : dmFill(env, { count: Math.max(1, Math.min(25, +input.count || 10)), manual: true });')
rep('You run the DM Desk with your Social Prospect Finder, DM Writer, DM Reviewer and LinkedIn Connector.', 'You run the DM Desk with your Social Prospect Finder, DM Writer, DM Reviewer and LinkedIn Connector. You also grow Ty\'s LinkedIn network every day with decision makers (owners, founders, practice and clinic managers) at businesses that need what we sell, within LinkedIn\'s limits (about 100 connection requests a week).')

# UI: connection cards without a note, a LinkedIn button, the note setting and the weekly count
rep("""      '<textarea class="in dm-msg" rows="5" style="width:100%;margin-top:6px">' + esc(x.message) + '</textarea><p class="mu xs dm-len" style="margin:2px 0 8px"></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm pri dm-go">Copy &amp; open profile</button>""",
    """      (x.no_note ? '<p class="sm" style="margin:8px 0">Connect without a note. Open their profile, tap <b>Connect</b>, then <b>Send without a note</b>. When they accept, tap They accepted and your first message is written for you.</p>' : '<textarea class="in dm-msg" rows="5" style="width:100%;margin-top:6px">' + esc(x.message) + '</textarea><p class="mu xs dm-len" style="margin:2px 0 8px"></p>') +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm pri dm-go">' + (x.no_note ? 'Open profile' : 'Copy &amp; open profile') + '</button>""")
rep("const n = b.closest('.dm-item'), x = item(n); try { await navigator.clipboard.writeText($('.dm-msg', n).value);",
    "const n = b.closest('.dm-item'), x = item(n); if (x.no_note || !$('.dm-msg', n)) { window.open(x.profile_url, '_blank', 'noopener'); return; } try { await navigator.clipboard.writeText($('.dm-msg', n).value);")
rep("await mark(n, 'sent', { message: $('.dm-msg', n).value });", "await mark(n, 'sent', $('.dm-msg', n) ? { message: $('.dm-msg', n).value } : {});")
rep("""<button class="btn sm ghost" id="dmFill">Write 10 more now</button></div>""", """<span class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm ghost" id="dmLi">Find 10 LinkedIn connections</button><button class="btn sm ghost" id="dmFill">Write 10 more now</button></span></div>""")
rep("""'<div class="wf-glass"><span class="mu sm">Replies this week</span>""", """'<div class="wf-glass"><span class="mu sm">LinkedIn requests this week</span><strong>' + esc(d.li_week || 0) + ' / ' + esc(c.li_weekly || 100) + '</strong></div><div class="wf-glass"><span class="mu sm">Replies this week</span>""")
rep("""<b>Fill my queue every morning</b> <span class="mu sm">(7am, up to your daily limits)</span></label>' +""",
    """<b>Fill my queue every morning</b> <span class="mu sm">(7am, up to your daily limits, including LinkedIn connections)</span></label>' +
      '<label class="or-switch" style="margin-top:8px"><input type="checkbox" id="dmNotes"' + (c.li_notes ? ' checked' : '') + '> <b>Write a personal note with each LinkedIn connection</b> <span class="mu sm">(free LinkedIn accounts only get a few notes a month, so leave this off unless you have Premium)</span></label>' +""")
rep("body: { autofill: $('#dmAuto', el).checked, daily: daily,", "body: { autofill: $('#dmAuto', el).checked, li_notes: $('#dmNotes', el).checked, daily: daily,")
rep("    $('#dmFill', el).onclick = async (e) => {", """    $('#dmLi', el).onclick = async (e) => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Finding decision makers\\u2026'; try { const r = await team('/dm-queue/linkedin-fill', { method: 'POST', body: { count: 10 }, long: true }); toast(r.note || (r.queued + ' LinkedIn connections queued'), 'ok'); VIEWS.dms(el); } catch (x) { toast(x.message, 'bad'); b.disabled = false; b.textContent = 'Find 10 LinkedIn connections'; } };
    $('#dmFill', el).onclick = async (e) => {""")
rep("'<p class=\"mu xs\" style=\"margin-top:12px\">Safe limits: Instagram 20, Facebook 15, LinkedIn 20 a day for an established account (fewer for a new one).",
    "'<p class=\"mu xs\" style=\"margin-top:12px\">Safe limits: Instagram 20, Facebook 15, LinkedIn 20 a day for an established account (fewer for a new one), and about 100 LinkedIn connection requests a week.")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v83 applied')
