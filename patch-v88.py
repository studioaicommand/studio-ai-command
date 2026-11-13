# v88 Command Chrome does the social legwork on Ty's Mac (through Command Link):
# 1) Friends scan: goes through Ty's Facebook friends, Instagram following and LinkedIn connections, finds the coaches,
#    practitioners and service-business owners, and adds them to the DM Desk as a WARM list (people Ty already knows).
# 2) Warm messages: a friendly, personal "hey" in Ty's voice. No pitch in the first message.
# 3) "Send these for me": Ty approves a batch in the DM Desk (he sees every name and message first), then Command Chrome
#    opens each chat, types the approved message exactly, sends it, waits 1 to 3 minutes, and marks it Sent.
#    Anything else that would send or submit still needs its own approval. Logins, codes and CAPTCHAs go to Ty.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# ---- the browser agent learns three new moves ----
rep('  kind: { type: "string", enum: ["goto", "click", "type", "select", "key", "scroll", "back", "wait", "ask_ty", "finish"] },',
    '''  kind: { type: "string", enum: ["goto", "click", "type", "select", "key", "scroll", "back", "wait", "ask_ty", "finish", "type_dm", "dm_done", "save_people"] },
  result: { type: "string", enum: ["sent", "failed"], description: "For dm_done: whether the current approved message was sent." },
  people: { type: "array", description: "For save_people: people seen on THIS page who look like coaches, practitioners or service-business owners.", items: { type: "object", properties: { name: { type: "string" }, profile_url: { type: "string" }, headline: { type: "string", description: "What the page shows they do (job title, bio line, business). Never guess." } }, required: ["name", "profile_url"] } },''')
rep("- finish when the goal is done or can't be done, with a short, useful summary (facts, numbers, links). Australian English.`;",
    """- finish when the goal is done or can't be done, with a short, useful summary (facts, numbers, links). Australian English.
- SENDING TY'S APPROVED DMs (only when the goal says so): open the person's profile, open the message box (Message button), then use type_dm on the message box (it types Ty's approved words exactly; never type your own message), then press Enter or click Send, then dm_done with result sent. For a LinkedIn connection request, click Connect then Send without a note, then dm_done. If you can't reach their message box, dm_done with result failed and say why in why.
- FRIENDS SCAN (only when the goal says so): read the list and use save_people with everyone on screen whose name, title or bio shows they are a coach, practitioner, clinic or service-business owner. Copy their profile link exactly. Scroll for more and repeat. Never message anyone during a scan.`;""")

DM = r'''// ── v88 Command Chrome: friends scan + sending approved DMs ──
var DM_BATCH_MAX = 15;
var WARM_HUNTS = { facebook: "https://www.facebook.com/search/people/?q=", instagram: "https://www.instagram.com/", linkedin: "https://www.linkedin.com/mynetwork/invite-connect/connections/" };
async function dmBrowserTask(env, t) {
  const cfg = await linkGet(env, "mac_link");
  if (!cfg?.token_hash) return { ok: false, error: "Command Link isn't set up on your Mac yet (Settings › Brand & features › Command Link)." };
  if (!linkOnline(cfg)) return { ok: false, error: "Your Mac is asleep or Command Link isn't running, so Command Chrome can't start. Wake the Mac and try again." };
  if (cfg.agent !== 2) return { ok: false, error: "Command Link needs a one-time update: Settings › Brand & features › Command Link › Set up again." };
  const cur = await browserGet(env);
  if (browserLive(cur)) return { ok: false, error: "Command Chrome is already busy with: “" + String(cur.goal).slice(0, 120) + "”. Stop it first or wait for it to finish." };
  const task = { id: linkRand(8), status: "queued", steps: [], created_at: new Date().toISOString(), result: null, ask: null, pending: null, ...t };
  await browserSave(env, task);
  return { ok: true, task_id: task.id };
}
function dmSendGoal(t) {
  const it = t.dm.queue[t.dm.i];
  if (!it) return "All approved messages are sent: finish with a short summary.";
  return "Send Ty's approved DMs one at a time (" + (t.dm.i + 1) + " of " + t.dm.queue.length + "). Now: " + it.name + " on " + it.platform + " at " + it.profile_url + (it.step === "connect" ? ". This is a LinkedIn connection request without a note: click Connect, then Send without a note, then dm_done." : ". Open their profile, click Message, use type_dm on the message box, press Enter or click Send, then dm_done.") + " Don't message anyone else.";
}
async function warmSave(env, people, platform) {
  let added = 0;
  const known = new Set((await select(env, "agent_prospects", "source=in.(warm_facebook,warm_instagram,warm_linkedin)&select=leak_report&limit=8000").catch(() => [])).map((p) => p.leak_report?.socials?.[platform]).filter(Boolean));
  for (const p of (Array.isArray(people) ? people : []).slice(0, 40)) {
    const url = String(p.profile_url || "").trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
    const name = String(p.name || "").trim().slice(0, 80);
    if (!name || !/^https:\/\/([a-z]{2,3}\.|m\.)?(facebook|instagram|linkedin)\.com\//.test(url) || known.has(url)) continue;
    known.add(url);
    const head = String(p.headline || "").trim().slice(0, 200);
    await insert(env, "agent_prospects", [{ business_name: name, decision_maker: name, niche: "warm", vertical: "warm", leak: head || "Ty's " + platform + " connection", evidence: head, source_url: url, score: 9, status: "to_send", source: "warm_" + platform, leak_report: { warm: true, socials: { [platform]: url }, headline: head } }]).then(() => added++).catch(() => {});
  }
  return added;
}
'''
rep('async function browserStep(env, body) {', DM + 'async function browserStep(env, body) {')

# pacing, step limits and the live goal for a send batch
rep('''  if (t.status === "waiting") t.status = "running";
  const actions = t.steps.filter((s) => s.kind).length;
  if (actions >= BROWSER_MAX_STEPS)''', '''  if (t.status === "waiting") t.status = "running";
  if (t.kind === "dm_send") {
    if (!t.dm.queue[t.dm.i]) { const sent = t.dm.queue.filter((x) => x.result === "sent").length; return browserFinish(env, t, "done", sent + " of " + t.dm.queue.length + " messages sent" + (t.dm.queue.some((x) => x.result === "failed") ? ". Couldn't send to: " + t.dm.queue.filter((x) => x.result === "failed").map((x) => x.name).join(", ") + " (they're back in your DM Desk)" : "") + "."); }
    if (t.dm.next_at && Date.now() < Date.parse(t.dm.next_at)) return { kind: "wait", ms: 15000 };
    t.goal = dmSendGoal(t);
  }
  const actions = t.steps.filter((s) => s.kind).length;
  const maxSteps = t.kind === "dm_send" ? 10 * t.dm.queue.length + 10 : t.kind === "friends_scan" ? 80 : BROWSER_MAX_STEPS;
  if (actions >= maxSteps)''')
rep('  if (actions >= maxSteps) return browserFinish(env, t, "stopped", "Hit the " + BROWSER_MAX_STEPS + "-step limit.', '  if (actions >= maxSteps) return browserFinish(env, t, "stopped", "Hit the " + maxSteps + "-step limit.')

# the three new moves
rep('''  if (a.kind === "finish") { t.steps.push({ n: t.steps.length + 1, desc: "Finished" });''', '''  if (a.kind === "save_people") {
    if (t.kind !== "friends_scan") { t.steps.push({ n: t.steps.length + 1, desc: "save_people is only for a friends scan", result: "skipped" }); await browserSave(env, t); return { kind: "wait", ms: 300 }; }
    const added = await warmSave(env, a.people, t.scan.platform);
    t.scan.found = (t.scan.found || 0) + added;
    t.steps.push({ n: t.steps.length + 1, kind: "save", desc: "Saved " + added + " people to your warm list (" + t.scan.found + " so far)" });
    await browserSave(env, t);
    if (t.scan.found >= t.scan.target) return browserFinish(env, t, "done", "Found " + t.scan.found + " coaches and practitioners on " + t.scan.platform + ". They're in Growth › DM Desk › Warm list, and messages are being written for you to approve.");
    return { kind: "wait", ms: 300 };
  }
  if (a.kind === "type_dm") {
    const it = t.kind === "dm_send" ? t.dm.queue[t.dm.i] : null;
    if (!it || !el) { t.steps.push({ n: t.steps.length + 1, desc: "type_dm without an approved message or a message box", result: "skipped" }); await browserSave(env, t); return { kind: "wait", ms: 300 }; }
    t.dm.typed = { id: it.id, url: String(pg.url || "").slice(0, 200) };
    t.steps.push({ n: t.steps.length + 1, kind: "type", desc: "Typed Ty's approved message to " + it.name, url: String(pg.url || "").slice(0, 200) });
    await browserSave(env, t);
    return { kind: "type", ref: a.ref, text: it.message, enter: false, ms: 1500 };
  }
  if (a.kind === "dm_done") {
    const it = t.kind === "dm_send" ? t.dm.queue[t.dm.i] : null;
    if (!it) { t.steps.push({ n: t.steps.length + 1, desc: "dm_done with nothing to send", result: "skipped" }); await browserSave(env, t); return { kind: "wait", ms: 300 }; }
    const sent = a.result === "sent" && (it.step === "connect" || (t.dm.typed && t.dm.typed.id === it.id));
    it.result = sent ? "sent" : "failed"; it.why = String(a.why || "").slice(0, 160);
    const q = await dmLoad(env), x = q.items.find((k) => k.id === it.id);
    if (x) { if (sent) await dmRoute("/dm-queue/mark", "POST", { id: it.id, status: "sent", by: "command_chrome" }, env).catch(() => {}); else { x.status = "ready"; x.send_error = it.why; await dmSave(env, q); } }
    t.steps.push({ n: t.steps.length + 1, kind: "dm", desc: (sent ? "✅ Sent to " : "✖ Couldn't send to ") + it.name + (sent ? "" : ": " + it.why) });
    t.dm.i++; t.dm.typed = null;
    t.dm.next_at = new Date(Date.now() + (sent ? 60000 + Math.floor(Math.random() * 120000) : 5000)).toISOString();
    await browserSave(env, t);
    return { kind: "wait", ms: 2000 };
  }
  if (a.kind === "finish") { t.steps.push({ n: t.steps.length + 1, desc: "Finished" });''')
# sending the approved message doesn't need a second approval; everything else still does
rep('  const risky = a.needs_approval ||', '''  const cur88 = t.kind === "dm_send" ? t.dm.queue[t.dm.i] : null;
  const approved88 = !!cur88 && ((cur88.step === "connect" && a.kind === "click" && /^(connect|send|send without a note|send now)$/i.test(String(label).trim())) || (t.dm.typed && t.dm.typed.id === cur88.id && ((a.kind === "click" && /^(send|press enter to send|send message)?$/i.test(String(label).trim())) || (a.kind === "key" && a.key === "Enter"))));
  if (approved88) { t.steps.push({ n: t.steps.length + 1, kind: a.kind, desc: "Sent (approved in your DM Desk batch): " + cur88.name, url: String(pg.url || "").slice(0, 200) }); await browserSave(env, t); return { kind: a.kind, ref: a.ref, key: a.key, ms: 2500 }; }
  if (t.kind === "dm_send" && a.kind === "type" && el && /message|aa|write/i.test(String(el.label || "")) ) { t.steps.push({ n: t.steps.length + 1, desc: "Use type_dm for the message box, so Ty's approved words go in exactly", result: "skipped" }); await browserSave(env, t); return { kind: "wait", ms: 300 }; }
  const risky = a.needs_approval ||''')

# ---- DM Desk: warm list, scan, and "Send these for me" ----
rep('  if (p === "/dm-queue/fill" && m === "POST") return json(', '''  if (p === "/dm-queue/scan" && m === "POST") {
    const platform = ["facebook", "instagram", "linkedin"].includes(body.platform) ? body.platform : "facebook";
    const words = String(body.keywords || "coach, practitioner, naturopath, chiropractor, physio, kinesiologist, nutritionist, dentist, psychologist, clinic, studio, salon").slice(0, 300);
    const target = Math.max(3, Math.min(200, +body.target || 60));
    const goal = "FRIENDS SCAN on " + platform + ": find Ty's own connections who are coaches, practitioners or service-business owners (look for words like: " + words + "). " + (platform === "facebook" ? "On Facebook, search people with each word (for example https://www.facebook.com/search/people/?q=coach), choose the Friends filter so only Ty's friends show, then save_people for everyone who fits." : platform === "instagram" ? "On Instagram, open Ty's profile, open Following, and save_people for every account whose name or bio shows they fit." : "On LinkedIn, open My Network › Connections and save_people for everyone whose headline fits.") + " Scroll and repeat until about " + target + " people are saved or the list ends. Never send a message or a request during a scan.";
    const r = await dmBrowserTask(env, { kind: "friends_scan", goal, start_url: platform === "facebook" ? WARM_HUNTS.facebook + "coach" : WARM_HUNTS[platform], scan: { platform, target, found: 0 } });
    return json(r, r.ok ? 200 : 400);
  }
  if (p === "/dm-queue/send-batch" && m === "POST") {
    const ids = (Array.isArray(body.ids) ? body.ids : []).slice(0, DM_BATCH_MAX);
    const picked = ids.map((id) => q.items.find((x) => x.id === id && x.status === "ready")).filter(Boolean);
    if (!picked.length) return json({ ok: false, error: "Pick the messages to send first." }, 400);
    const queue = picked.map((x) => ({ id: x.id, name: x.person_name || x.business_name, platform: DM_CHANNELS[x.channel].name, profile_url: x.profile_url, message: x.message, step: x.step }));
    const r = await dmBrowserTask(env, { kind: "dm_send", goal: "", start_url: queue[0].profile_url, dm: { queue, i: 0 } });
    if (!r.ok) return json(r, 400);
    for (const x of picked) { x.status = "sending"; x.updated_at = new Date().toISOString(); }
    await dmSave(env, q);
    await audit(env, { actor: "Ty", action: "dm_batch_approved", target_type: "dm_queue", target_id: r.task_id, summary: "Approved " + queue.length + " DMs for Command Chrome to send: " + queue.map((x) => x.name + " (" + x.platform + ")").join(", ").slice(0, 400) }).catch(() => {});
    return json({ ok: true, task_id: r.task_id, count: queue.length });
  }
  if (p === "/dm-queue/fill" && m === "POST") return json(''')
# warm people get warm messages, and they come first
rep('  const pick = async () => (await select(env, "agent_prospects", "status=in.(to_send,sent)&order=score.desc.nullslast,created_at.desc&limit=120&select=id,business_name,website,instagram,email,phone,location,niche,vertical,leak,evidence,leak_report,status,source").catch(() => []))\n    .filter((p) => !touched.has(p.id) && (!verts || verts.includes(p.vertical || p.niche))',
    '  const pick = async () => (await select(env, "agent_prospects", "status=in.(to_send,sent)&order=score.desc.nullslast,created_at.desc&limit=120&select=id,business_name,decision_maker,website,instagram,email,phone,location,niche,vertical,leak,evidence,leak_report,status,source").catch(() => []))\n    .filter((p) => !touched.has(p.id) && (p.leak_report?.warm || !verts || verts.includes(p.vertical || p.niche))')
rep('      const r = await dmWrite(env, pr, q.items, u, { channel: li ? "linkedin" : "" });', '      const warmCh = pr.leak_report?.warm ? Object.keys(pr.leak_report.socials || {})[0] : "";\n      const r = warmCh ? await dmWrite(env, pr, q.items, u, { channel: warmCh, step: "warm" }) : await dmWrite(env, pr, q.items, u, { channel: li ? "linkedin" : "" });')
rep('''    : step === "connect" ? "Write a LinkedIn connection note (under 300 characters) for the owner, using their LinkedIn link from the search results."''',
    '''    : step === "connect" ? "Write a LinkedIn connection note (under 300 characters) for the owner, using their LinkedIn link from the search results."
    : step === "warm" ? "WARM MESSAGE: this is someone Ty already knows (" + DM_CHANNELS[channel].name + " connection: " + (pr.decision_maker || pr.business_name) + ", " + (pr.leak_report?.headline || "") + "). Write a short, friendly, personal hello the way Ty would message a friend: their first name, one genuine line about what they do now, one easy question about them or their work. NO pitch, no offer, no mention of what Ty sells. Under 300 characters. The hook is what they do. Use their profile link exactly as given."''')
rep('  const ch = parent ? parent.channel : DM_CHANNELS[out.channel] ? out.channel : channel || "instagram";', '  const ch = parent ? parent.channel : step === "warm" && channel ? channel : DM_CHANNELS[out.channel] ? out.channel : channel || "instagram";')
rep('''    profile_url: parent ? parent.profile_url : String(out.profile_url || known[ch] || "").trim().replace(/[).,]+$/, ""),''', '''    profile_url: parent ? parent.profile_url : step === "warm" ? String(pr.leak_report?.socials?.[ch] || "") : String(out.profile_url || known[ch] || "").trim().replace(/[).,]+$/, ""), warm: step === "warm" || undefined,''')
rep('''  if (item.step !== "reply" && !/\\bty\\b/i.test(m)) return "Say who it's from (Ty, Studio Flow & Systems).";''', '''  if (item.step !== "reply" && item.step !== "warm" && !/\\bty\\b/i.test(m)) return "Say who it's from (Ty, Studio Flow & Systems).";
  if (item.step === "warm" && /studio flow|website|receptionist|automation|\\bai\\b|leads|bookings system/i.test(m)) return "A warm hello to someone Ty knows has no pitch in it.";''')
rep('  const max = item.step === "connect" ? 300 : item.step === "follow_up" ? 320 : ch.max;', '  const max = item.step === "connect" || item.step === "warm" ? 300 : item.step === "follow_up" ? 320 : ch.max;')
rep('      li_week: liWeek(q.items), ready: q.items.filter((x) => x.status === "ready").sort(', '      browser: await (async () => { const bt = await browserGet(env).catch(() => null); const c = await linkGet(env, "mac_link").catch(() => null); return { online: linkOnline(c), agent: c?.agent || 0, task: bt && ["dm_send", "friends_scan"].includes(bt.kind) ? { kind: bt.kind, status: bt.status, live: browserLive(bt), result: bt.result, last: (bt.steps || []).slice(-3).map((x) => x.desc), ask: bt.ask } : null }; })(),\n      warm_count: (await select(env, "agent_prospects", "source=in.(warm_facebook,warm_instagram,warm_linkedin)&select=id&limit=8000").catch(() => [])).length,\n      li_week: liWeek(q.items), ready: q.items.filter((x) => x.status === "ready").sort(')
rep('    const stepName = { first: \'First message\', follow_up: \'Follow-up\', connect: \'Connection note\', message: \'After they accepted\' };',
    '    const stepName = { first: \'First message\', follow_up: \'Follow-up\', connect: \'Connection note\', message: \'After they accepted\', warm: \'Warm hello\' };')
# UI: a tick on each ready card, Scan and Send buttons, and the live Command Chrome status
rep("""    const rcard = (x) => '<article class="or-item dm-item" data-id="' + esc(x.id) + '"><div class="row sp" style="gap:8px;flex-wrap:wrap"><span><b>' + esc(x.business_name) + '</b>""",
    """    const rcard = (x) => '<article class="or-item dm-item" data-id="' + esc(x.id) + '"><div class="row sp" style="gap:8px;flex-wrap:wrap"><span><label style="display:inline-flex;gap:8px;align-items:center"><input type="checkbox" class="dm-pick"' + (x.send_error ? '' : ' checked') + '><b>' + esc(x.business_name) + '</b></label>""")
rep("""<span class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm ghost" id="dmLi">Find 10 LinkedIn connections</button>""",
    """<span class="row" style="gap:8px;flex-wrap:wrap">' + (ready.length ? '<button class="btn sm pri" id="dmSend">Send ticked for me</button>' : '') + '<button class="btn sm ghost" id="dmScan">Scan my friends</button><button class="btn sm ghost" id="dmLi">Find 10 LinkedIn connections</button>""")
rep("""      '<div class="wd-metrics">' + Object.keys(CH).map(""", """      (d.browser ? '<section class="wf-glass v88-cc"><div class="row sp" style="gap:10px;flex-wrap:wrap;align-items:center"><div><span class="wf-eyebrow">COMMAND CHROME ON YOUR MAC</span><p class="sm" style="margin:4px 0 0">' + (!d.browser.online ? 'Command Link isn\\u2019t running (your Mac is asleep or offline). Wake it to scan or send.' : d.browser.task && d.browser.task.live ? '<b>' + (d.browser.task.kind === 'dm_send' ? 'Sending your approved messages\\u2026' : 'Scanning your friends\\u2026') + '</b> ' + esc((d.browser.task.last || []).slice(-1)[0] || '') + (d.browser.task.ask ? ' <b>Needs you:</b> ' + esc(d.browser.task.ask) : '') : d.browser.task && d.browser.task.result ? esc(d.browser.task.result) : 'Ready. Log in to Facebook, Instagram and LinkedIn once in the Command Chrome window, then scan your friends or send a batch.') + '</p></div>' + (d.browser.task && d.browser.task.live ? '<button class="btn sm ghost" id="dmStop">Stop</button>' : '') + '</div>' + (d.warm_count ? '<p class="mu xs" style="margin:6px 0 0">Warm list: ' + esc(d.warm_count) + ' people you already know.</p>' : '') + '</section>' : '') +
      '<div class="wd-metrics">' + Object.keys(CH).map(""")
rep("    $('#dmLi', el).onclick = async (e) => {", """    const sb = $('#dmSend', el); if (sb) sb.onclick = async () => {
      const ids = $$('.dm-item', el).filter((n) => $('.dm-pick', n) && $('.dm-pick', n).checked).map((n) => n.dataset.id).slice(0, 15);
      if (!ids.length) return toast('Tick the messages to send first', 'bad');
      const names = ids.map((id) => { const x = ready.find((r) => r.id === id); return x ? (x.business_name + ' (' + (CH[x.channel] ? CH[x.channel].name : x.channel) + ')') : ''; }).filter(Boolean);
      const ok = await modal({ title: 'Send ' + ids.length + ' messages from your accounts?', text: 'Command Chrome on your Mac will open each chat, type the message exactly as shown here, send it, and wait 1 to 3 minutes before the next one. To: ' + names.join(', ') + '. Up to 15 at a time. Keep your Mac awake.', ok: 'Send them' });
      if (!ok) return;
      try { const r = await team('/dm-queue/send-batch', { method: 'POST', body: { ids: ids } }); toast('Sending ' + r.count + ' now. Watch the Command Chrome window', 'ok'); VIEWS.dms(el); } catch (x) { toast(x.message, 'bad'); }
    };
    const sc = $('#dmScan', el); if (sc) sc.onclick = async () => {
      const box = document.createElement('div'); box.className = 'modal'; box.innerHTML = '<div class="box"><h3>Scan my friends</h3><p class="mu sm">Command Chrome goes through your own connections and adds the coaches, practitioners and business owners to your warm list. It never messages anyone during a scan.</p><label class="lab">Platform<select class="in" id="v88p"><option value="facebook">Facebook friends</option><option value="instagram">Instagram following</option><option value="linkedin">LinkedIn connections</option></select></label><label class="lab" style="margin-top:8px">Look for<input class="in" id="v88k" value="coach, practitioner, naturopath, chiropractor, physio, kinesiologist, nutritionist, dentist, psychologist, clinic, salon"></label><label class="lab" style="margin-top:8px">How many<input class="in" id="v88n" inputmode="numeric" value="60"></label><div class="row" style="gap:8px;margin-top:14px;justify-content:flex-end"><button class="btn ghost" id="v88x">Cancel</button><button class="btn pri" id="v88go">Start scan</button></div></div>';
      document.body.append(box);
      $('#v88x', box).onclick = () => box.remove();
      $('#v88go', box).onclick = async () => { try { await team('/dm-queue/scan', { method: 'POST', body: { platform: $('#v88p', box).value, keywords: $('#v88k', box).value, target: Number($('#v88n', box).value) || 60 } }); box.remove(); toast('Scanning in the Command Chrome window on your Mac', 'ok'); VIEWS.dms(el); } catch (x) { toast(x.message, 'bad'); } };
    };
    const st = $('#dmStop', el); if (st) st.onclick = async () => { try { await team('/browser/stop', { method: 'POST', body: {} }); toast('Stopped', 'ok'); VIEWS.dms(el); } catch (x) { toast(x.message, 'bad'); } };
    $('#dmLi', el).onclick = async (e) => {""")
# messages that were "sending" when a batch stopped go back to ready
rep('async function browserFinish(env, t, status, result, tell = true) {', 'async function browserFinish(env, t, status, result, tell = true) {\n  if (t.kind === "dm_send" && t.dm) { const q = await dmLoad(env).catch(() => null); if (q) { let ch = false; for (const x of q.items) if (x.status === "sending" && t.dm.queue.some((k) => k.id === x.id && k.result !== "sent")) { x.status = "ready"; ch = true; } if (ch) await dmSave(env, q).catch(() => {}); } }')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v88 applied')
