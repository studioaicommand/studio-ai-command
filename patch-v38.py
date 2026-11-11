# v38: Team brain. Learning loop (Ty's edits -> team rules), QA agent on client-facing drafts, shared context
# (inbox knows what Sales and the client book know), hot-lead handoffs, weekly Research shift, weekly safety re-checks.
import sys, re, hashlib
f = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(f).read()

def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

brain = open('brain.js').read()
rep('async function listClients(env) {', brain + '\nasync function listClients(env) {')

# memory every agent reads now starts with the team rules
rep('''    const rows = await select(env, "team_memory", "order=created_at.desc&limit=60&select=category,fact");
    return rows.length ? rows.map((r) => `- [${r.category}] ${r.fact}`).join("\\n") : "(nothing saved yet)";''',
'''    const rows = await select(env, "team_memory", "order=created_at.desc&limit=60&select=category,fact");
    const rules = brainRulesText(await brainRules(env).catch(() => []));
    return rules + (rows.length ? rows.map((r) => `- [${r.category}] ${r.fact}`).join("\\n") : "(nothing saved yet)");''')

# QA on every client-facing approval card
rep('''async function askTy(env, action, { urgent = false, settings = null } = {}) {
  const p = action.params || {};''', '''async function askTy(env, action, { urgent = false, settings = null } = {}) {
  action = await qaAttach(env, action).catch(() => action);
  const p = action.params || {};''')

# inbox: shared context + rules + intent
rep(''''Answer ONLY with JSON on one line: {"reply": "<message to send, or empty>", "handoff": true|false, "reason": "<short reason when handing off>"}' + inboxPriceBook(cat) +''',
    ''''Answer ONLY with JSON on one line: {"reply": "<message to send, or empty>", "handoff": true|false, "reason": "<short reason when handing off>"}' + (await brainInboxExtras(env, contact).catch(() => '')) + inboxPriceBook(cat) +''')
rep('''title: ('Reply to ' + name + ' on ' + label).slice(0, 200)''', '''title: ((draft.intent === 'hot' ? '\\u{1F525} Hot lead: reply to ' : 'Reply to ') + name + ' on ' + label).slice(0, 200)''')
rep('''  const draft = await inboxWrite(env, channel, contact, history);
  const label = INBOX_CHANNELS[channel].label;
''', '''  const draft = await inboxWrite(env, channel, contact, history);
  const label = INBOX_CHANNELS[channel].label;
  if (draft.intent === 'hot') await addTags(env, contactId, ['hot-lead']).catch(() => {});
''')
# QA gate before anything auto-sends
rep('''  if (mode === 'auto') {
    await update(env, 'team_actions', 'id=eq.' + row.id, { auto: true }).catch(() => {});''',
'''  if (mode === 'auto' && env.BRAIN_QA !== 'off') {
    const qaRow = await qaAttach(env, row).catch(() => row);
    if (qaRow.params?.qa?.verdict === 'stop') { await inboxRemember(env, qaRow, await askTy(env, qaRow, { settings }).catch(() => null)); return { queued: true, qa: 'stopped' }; }
  }
  if (mode === 'auto') {
    await update(env, 'team_actions', 'id=eq.' + row.id, { auto: true }).catch(() => {});''', 1)

# outreach emails get the rules + market research
rep('''${industryBrief(job.vertical)}
${EMAIL_RULES}''', '''${industryBrief(job.vertical)}${brainRulesText(await brainRules(env).catch(() => []), "outreach")}${await brainMarket(env, job.vertical).catch(() => "")}
${EMAIL_RULES}''')

# scheduled: nightly learning + weekly safety
rep('''  await inboxFollowups(e).catch((x) => console.error("follow-ups:", x.message));''',
    '''  await inboxFollowups(e).catch((x) => console.error("follow-ups:", x.message));
  await brainTick(e).catch((x) => console.error("team brain:", x.message));''')

# weekly Research shift
rep('''var DEFAULT_SHIFTS = [
''', '''var DEFAULT_SHIFTS = [
  { id: "market_research", department: "head_of_marketing", label: "Research: fresh angles for each industry we hunt", days: [1], hour: 6, enabled: true, prompt: "RESEARCH SHIFT. For each industry Sales is hunting (check outreach_snapshot for this week's targets), use web search to find 2 or 3 fresh, specific insights about Australian businesses in that industry: what their customers complain about (slow replies, hard to book, no follow-up), new rules or tech changes, what other agencies and software are pitching them, and seasonal timing. Save each insight with save_memory, category \\"market\\", starting with the industry name (e.g. \\"Trades & services: ...\\"). At most 15 saves, only things you actually found. Finish with the 3 sharpest angles for Sales this week." },
''')

# routes
rep('''  if (seg[0] === "money") return moneyRoute(env, m, seg, body);''', '''  if (seg[0] === "money") return moneyRoute(env, m, seg, body);
  if (seg[0] === "brain") return brainRoute(env, m, seg, body);''')

# Command app: Studio AI > Team brain
rep('''["studio", "Studio AI", "studio", [["studio", "Talk to Studio"], ["team", "Team"], ["jobs", "AI jobs"], ["memory", "Memory"]]],''',
    '''["studio", "Studio AI", "studio", [["studio", "Talk to Studio"], ["team", "Team"], ["brain", "Team brain"], ["jobs", "AI jobs"], ["memory", "Memory"]]],''')
rep('''    security: ["Security", "Two-step login: your key plus a code to your phone"],''', '''    security: ["Security", "Two-step login: your key plus a code to your phone"],
    brain: ["Team brain", "What your AI team has learned from you, and how it checks its own work"],''')
VIEW = r'''
  VIEWS.brain = async (el) => {
    el.innerHTML = sk(260);
    let d;
    try { d = await team("/brain"); } catch (e) { el.innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; return; }
    if (!still("brain", el)) return;
    let rules = (d.rules || []).slice();
    const when = d.updated_at ? new Date(d.updated_at).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "never";
    const SC = { all: "Everyone", inbox: "Message replies", outreach: "Outreach emails", invoice: "Invoices", content: "Content" };
    const draw = () => {
      $("#brRules", el).innerHTML = rules.length ? rules.map((r, i) => '<div class="item" style="display:flex;gap:12px;align-items:flex-start"><div style="flex:1"><div>' + esc(r.rule) + '</div><div class="mu xs" style="margin-top:4px">' + esc((r.applies_to || ["all"]).map((x) => SC[x] || x).join(", ")) + (r.why ? " · " + esc(r.why) : "") + '</div></div><button class="btn sm ghost" data-del="' + i + '" aria-label="Remove rule">✕</button></div>').join("") : '<div class="empty">No rules yet. Approve, edit or reject a few drafts and the team learns from them every night (or tap Learn now).</div>';
      $$("[data-del]", el).forEach((b) => (b.onclick = async () => { rules.splice(+b.dataset.del, 1); try { await team("/brain/rules", { method: "POST", body: { rules } }); toast("Rule removed"); draw(); } catch (e) { toast(e.message, "bad"); } }));
    };
    const qa = d.qa || {};
    el.innerHTML = '<div class="grid"><section class="card c8"><div class="row sp"><div><h3>Team rules</h3><p class="mu sm">Learned from how you edit and reject drafts. Every agent follows them: message replies, outreach emails, invoices and content. Last learned: ' + esc(when) + '.</p></div><button class="btn pri" id="brLearn">Learn now</button></div><div class="stack" id="brRules" style="margin-top:12px"></div>' +
      '<div class="row" style="gap:8px;margin-top:14px;flex-wrap:wrap"><input class="in" id="brNew" placeholder="Add your own rule, e.g. Always offer a Thursday time first" style="flex:1;min-width:220px"><select class="in" id="brScope" style="max-width:190px">' + Object.entries(SC).map(([k, v]) => '<option value="' + k + '">' + v + "</option>").join("") + '</select><button class="btn" id="brAdd">Add rule</button></div></section>' +
      '<section class="card c4"><h3>QA agent</h3><p class="mu sm">Checks every client-facing draft (replies, follow-ups, outreach, invoices) for wrong prices, invented facts and tone before it reaches you. If something would mislead, an auto-reply waits for you instead of sending.</p><div class="snap-row" style="margin-top:12px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px"><div><b class="pv">' + (qa.checked || 0) + '</b><span>Checked</span></div><div><b class="pv">' + (qa.flagged || 0) + '</b><span>Flagged</span></div><div><b class="pv">' + (qa.stopped || 0) + '</b><span>Stopped</span></div></div>' +
      '<h3 style="margin-top:18px">How the team works together</h3><ul class="mu sm" style="padding-left:18px;line-height:1.7"><li>Message replies know if Sales already emailed someone, or if they are an existing client.</li><li>Hot leads are tagged hot-lead and flagged \u{1F525} for you.</li><li>Research finds fresh angles each Monday; Sales uses them in outreach.</li><li>Every Sunday night each live AI receptionist re-runs its safety test.</li></ul></section>' +
      '<section class="card c12"><h3>Your recent feedback</h3><div class="stack">' + ((d.recent_feedback || []).map((f) => '<div class="item sm">' + esc(String(f.fact).slice(0, 300)) + "</div>").join("") || '<div class="empty">Nothing yet.</div>') + "</div></section></div>";
    draw();
    $("#brLearn", el).onclick = async (e) => { const b = e.currentTarget; b.disabled = true; toast("Learning from your feedback…"); try { const r = await team("/brain/learn", { method: "POST", body: {}, long: true }); rules = r.rules || []; draw(); toast(r.note || "Team rules updated", r.note ? "" : "ok"); } catch (err) { toast(err.message, "bad"); } b.disabled = false; };
    $("#brAdd", el).onclick = async () => { const t = $("#brNew", el).value.trim(); if (!t) return; rules.push({ rule: t, applies_to: [$("#brScope", el).value], why: "Added by Ty" }); try { await team("/brain/rules", { method: "POST", body: { rules } }); $("#brNew", el).value = ""; toast("Rule added"); draw(); } catch (e) { toast(e.message, "bad"); } };
  };
'''
rep('''  VIEWS.money = async (el) => {''', VIEW + '''  VIEWS.money = async (el) => {''')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace(oldv, hashlib.sha1(s.encode()).hexdigest()[:10])
open(f, 'w').write(s)
print('v38 team brain applied')

# parser keeps the intent
s = open(f).read()
old = "  return { reply: o.handoff ? '' : reply, handoff: !!o.handoff || !reply, reason: String(o.reason || '').slice(0, 200) };\n}"
assert s.count(old) == 1, 'parse anchor'
s = s.replace(old, "  const intent = ['hot', 'warm', 'cold', 'client'].includes(o.intent) ? o.intent : (String(m && m[0] || '').match(/\"intent\"\\s*:\\s*\"(hot|warm|cold|client)\"/) || [])[1] || '';\n  return { reply: o.handoff ? '' : reply, handoff: !!o.handoff || !reply, reason: String(o.reason || '').slice(0, 200), intent };\n}")
open(f, 'w').write(s)
print('v38 intent kept')
