# v57: instant Telegram Approve/Reject, daily email limit follows Ty's number, held approvals send themselves.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
team = open(D + 'v57-team.js').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
# 1) Telegram: the button answers at once, the buttons disappear (no double taps), and the approval starts straight away
rep("""  const u = await request.json().catch(() => ({}));
  try {
    const [stored]=await select(env,'team_settings','key=eq.telegram&limit=1'),t=stored?.value||{};""", """  const u = await request.json().catch(() => ({}));
  const cbq = u.callback_query, cbk = /^(ap|rj):/.test(String(cbq?.data || "")) ? String(cbq.data).slice(0, 2) : null;
  if (cbk && ctx?.waitUntil) ctx.waitUntil(tgQuick(env, "answerCallbackQuery", { callback_query_id: cbq.id, text: cbk === "ap" ? "\\u23F3 On it: approving now" : "\\u23F3 Rejecting" }));
  try {
    const [stored]=await select(env,'team_settings','key=eq.telegram&limit=1'),t=stored?.value||{};""")
rep("""    if(u.callback_query)await saveRecord(env,""", """    if(cbk&&cbq.message&&ctx?.waitUntil)ctx.waitUntil(tgQuick(env,'editMessageText',{chat_id:chatId,message_id:cbq.message.message_id,text:String(cbq.message.text||'').slice(0,3500)+'\\n\\n'+(cbk==='ap'?'\\u23F3 Approving\\u2026':'\\u23F3 Rejecting\\u2026'),disable_web_page_preview:true,reply_markup:{inline_keyboard:[]}}));
    if(u.callback_query)await saveRecord(env,""")
rep("""    if(!env.COMMAND_QUEUE?.send&&saved.status==='queued'&&!saved.already_saved)await tg(""", """    if(cbk&&saved.status==='queued'&&ctx?.waitUntil)ctx.waitUntil(executeCommandJob(env,saved.job_id,telegramCommandDeps(env,ctx)).catch(e=>console.error('Instant approval:',e.message)));
    if(!cbk&&!env.COMMAND_QUEUE?.send&&saved.status==='queued'&&!saved.already_saved)await tg(""")
# 2) one number: the enrolment limit follows Ty's outreach number and warm-up (never below the campaign's own limit)
rep("""  if (today.length >= c.daily_cap) throw later(`Daily enrolment limit (${c.daily_cap}) reached. It protects your sender reputation; more go tomorrow.`);""",
    """  const cap = await enrolCap(env, c);
  if (today.length >= cap) throw later(`Daily email limit (${cap}) reached, to protect your sender reputation. You approved it, so it sends automatically as soon as there's room.`);""")
# 3) held approvals remember they were approved, then send themselves
rep("""    if (e.retryable) await update(env, "team_actions", `id=eq.${id}`, { status: "pending", decided_at: null, result: { held: String(e.message).slice(0, 500) } });""",
    """    if (e.retryable) await update(env, "team_actions", `id=eq.${id}`, { status: "pending", decided_at: null, params, result: { held: String(e.message).slice(0, 500), approved: action.type === "campaign_enrol", approved_at: now() } });""")
rep('  if (!aiHold) await noShowWatch(e).catch((x) => console.error("no-show rebooker:", x.message));',
    '  if (!aiHold) await noShowWatch(e).catch((x) => console.error("no-show rebooker:", x.message));\n  await heldApprovedTick(e).catch((x) => console.error("held approvals:", x.message));')
rep("""const held = a.result && a.result.held ? '<p class="xs" style="color:#fde68a;margin-top:6px">Held back: ' + esc(a.result.held) + "</p>" : "";""",
    """const held = a.result && a.result.held ? '<p class="xs" style="color:' + (a.result.approved ? '#86efac' : '#fde68a') + ';margin-top:6px">' + (a.result.approved ? '\\u2705 Approved. Waiting for room under today\\u2019s email limit, then it sends by itself (no need to tap again).' : 'Held back: ' + esc(a.result.held)) + "</p>" : "";""")
# 4) Outreach settings: the daily email limit is editable
rep('''    if (body.restart_warmup) next.start = new Date().toISOString();''', '''    if (body.restart_warmup) next.start = new Date().toISOString();
    if (+body.email_cap >= 5 && +body.email_cap <= 200) { const st = await getSettings(env); await saveSetting(env, "campaign", { ...st.campaign || {}, daily_cap: Math.round(+body.email_cap) }); }''')
rep('''    return J({ ok: true, cfg, capacity: outCapacity(cfg), stats: await outStats(env), verticals:''', '''    return J({ ok: true, cfg, capacity: outCapacity(cfg), email_cap: (await getSettings(env)).campaign?.daily_cap || 25, stats: await outStats(env), verticals:''')
rep("""<label class="lab" style="flex:0 1 160px">Businesses per day<input class="in" id="orTarget" inputmode="numeric" value="' + esc(c.target) + '"></label>""",
    """<label class="lab" style="flex:0 1 160px">Businesses per day<input class="in" id="orTarget" inputmode="numeric" value="' + esc(c.target) + '"></label><label class="lab" style="flex:0 1 190px">Minimum emails per day<input class="in" id="orCap" inputmode="numeric" value="' + esc(d.email_cap || 25) + '"></label>""")
rep("""body: { on: $('#orOn', el).checked, target: Number($('#orTarget', el).value) || 50,""", """body: { on: $('#orOn', el).checked, target: Number($('#orTarget', el).value) || 50, email_cap: Number($('#orCap', el).value) || 25,""")
rep("""<p class="mu xs" style="margin-top:12px">Warm-up: a new sending domain starts at 20 a day""", """<p class="mu xs" style="margin-top:12px">Emails per day = the warm-up number below or your minimum, whichever is higher (max 200). Above about 40 a day, use a separate outreach sending domain so your main business email stays out of spam. Warm-up: a new sending domain starts at 20 a day""")
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v57 applied')
