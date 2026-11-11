# v28: Command Inbox. Command replies to SMS / Instagram / Facebook / web chat messages through GHL,
# per-channel Off / Approve first / Auto-send, with hand-off to Ty. Settings panel in Autopilot.
import sys, hashlib, re
f = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(f).read()

def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:90], s.count(old))
    s = s.replace(old, new)

# 1) module + route
mod = open('inbox.js').read()
assert '`' in mod or True
ret = 'return { TEAM_CRON, TEAM_OPERATOR_TOOLS, TEAM_TOOL_NAMES, isTeamPath, teamEnv, teamFetch, teamOperatorTool, teamScheduled, teamQueue, withTeamPanel };'
assert s.count(ret) == 1
s = s.replace(ret, mod + '\n' + ret.replace('withTeamPanel };', 'withTeamPanel, inboxRoute };'), 1)
head = 'const { TEAM_CRON, TEAM_OPERATOR_TOOLS, TEAM_TOOL_NAMES, isTeamPath, teamEnv, teamFetch, teamOperatorTool, teamScheduled, teamQueue, withTeamPanel } = (() => {'
assert s.count(head) == 1
s = s.replace(head, head.replace('withTeamPanel }', 'withTeamPanel, inboxRoute }'), 1)
rep('    if (url.pathname.startsWith("/api/v1/site/")) return siteAssistantRoute(request, env, ctx);',
    '    if (url.pathname.startsWith("/api/v1/site/")) return siteAssistantRoute(request, env, ctx);\n    if (url.pathname.startsWith("/api/v1/inbox/")) return inboxRoute(request, env, ctx);')

# 2) settings: allow + pass through
rep('"offer", "demo_followups", "offer_catalog"].includes(key)) throw new Error("Unknown setting");',
    '"offer", "demo_followups", "offer_catalog", "inbox", "inbox_log"].includes(key)) throw new Error("Unknown setting");')
rep('for (const k of ["charter", "telegram", "command", "notify_state", "offer"]) if (stored[k] !== void 0) out[k] = stored[k];',
    'for (const k of ["charter", "telegram", "command", "notify_state", "offer", "inbox", "inbox_log"]) if (stored[k] !== void 0) out[k] = stored[k];')
rep('    if (body.command && typeof body.command.auto === "boolean") await saveSetting(env, "command", { ...cur.command || {}, auto: body.command.auto });',
    '''    if (body.inbox && typeof body.inbox === "object") {
      const ib = { ...inboxSettings(cur) };
      for (const k of Object.keys(INBOX_DEFAULT)) if (["off", "approve", "auto"].includes(body.inbox[k])) ib[k] = body.inbox[k];
      await saveSetting(env, "inbox", ib);
      await audit(env, { actor: "Ty", action: "inbox_updated", summary: "Message replies: " + Object.entries(ib).map(([k, v]) => k + " " + v).join(", ") }).catch(() => {});
    }
    if (body.command && typeof body.command.auto === "boolean") await saveSetting(env, "command", { ...cur.command || {}, auto: body.command.auto });''')
rep('return json({ ok: true, settings: await getSettings(env), autopilot_types: AUTOPILOT_TYPES, always_ask: ALWAYS_ASK, now: brisbaneNow() });',
    'return json({ ok: true, settings: await getSettings(env), autopilot_types: AUTOPILOT_TYPES, always_ask: ALWAYS_ASK, now: brisbaneNow(), inbox_key: await inboxKey(env) });')

# 3) execute: send the approved reply on the same channel
rep('''    case "ghl_sms":
      return sendSms(env, p.contact_id, p.message);''',
    '''    case "ghl_sms":
      return sendSms(env, p.contact_id, p.message);
    case "ghl_reply": {
      if (!p.message || !String(p.message).trim()) throw new Error("This one was handed to you: reply to them yourself in GHL Conversations, then reject this card.");
      return req(env, "POST", "/conversations/messages", { type: p.send_type || "SMS", contactId: p.contact_id, message: String(p.message).slice(0, 1600) }, "2021-04-15");
    }''')

# 4) Autopilot view: "Message replies" panel (no backticks / ${ inside the app script)
panel = r"""'<div class="rule" style="flex-wrap:wrap;align-items:flex-start"><div class="grow" style="flex:1 1 260px"><b>Message replies (SMS, Instagram, Facebook, web chat)</b><span class="mu xs">Command writes the reply as Studio AI. Approve first: it waits for your yes here and on Telegram. Auto-send: it goes straight away. Anything tricky (complaints, billing, existing clients, asks for you) is always handed to you. If you reply yourself, Command stays out of that conversation for 2 hours.</span></div><div class="stack" style="flex:2 1 520px;gap:10px">' + [["sms", "SMS"], ["ig", "Instagram"], ["fb", "Facebook"], ["chat", "Website chat (GHL widget)"]].map(function (c) { var v = (s.inbox || {})[c[0]] || "approve"; return '<div class="row sp" style="gap:10px"><b class="sm">' + c[1] + '</b><select class="in" style="max-width:200px" id="ib_' + c[0] + '">' + [["off", "Off"], ["approve", "Approve first"], ["auto", "Auto-send"]].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div>"; }).join("") + '<div class="mu xs" style="margin-top:4px"><b>Last messages</b><br>' + (((s.inbox_log || []).slice(0, 5).map(function (e) { var r = e.result || {}, what = r.sent ? "Sent" : r.queued ? "Waiting for your approval" : r.handoff ? "Handed to you" : r.error ? "Error: " + r.error : "Skipped: " + (r.skipped || "unknown") + (r.history_error ? " (GHL: " + r.history_error + ")" : ""); return esc(new Date(e.at).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })) + " \u00B7 " + esc(e.contact || "contact") + " \u00B7 " + esc(what); }).join("<br>")) || "None yet. Send a test message.") + "</div>" + '<label class="lab" style="margin:6px 0 0">GHL webhook URL (paste into the workflow’s Webhook action)<input class="in" readonly id="ibHook" value="' + esc(location.origin + "/api/v1/inbox/ghl/" + (S.inbox_key || "")) + '"></label><div class="row" style="gap:10px;align-items:center"><button class="btn sm pri" id="ibSave">Save replies</button><button class="btn sm" id="ibCopy">Copy webhook URL</button></div></div></div>' +
      """
tele = "'<div class=\"rule\"><div class=\"grow\"><b>Telegram</b>"
assert s.count(tele) == 1, 'telegram anchor'
s = s.replace(tele, panel + tele, 1)
pay = '    $("#paySave", el).onclick = async () => {'
assert s.count(pay) == 1
s = s.replace(pay, '''    $("#ibSave", el).onclick = async () => { var ib = {}; ["sms", "ig", "fb", "chat"].forEach(function (k) { ib[k] = $("#ib_" + k, el).value; }); try { await team("/settings", { method: "POST", body: { inbox: ib } }); toast("Message replies saved \\u2713", "ok"); bust("settings"); } catch (err) { toast(err.message, "bad"); } };
    $("#ibCopy", el).onclick = async () => { try { await navigator.clipboard.writeText($("#ibHook", el).value); toast("Webhook URL copied", "ok"); } catch (err) { $("#ibHook", el).select(); toast("Select the URL and copy it", "bad"); } };
''' + pay, 1)

# 4b) Telegram: a reply to a draft/hand-off card rewrites (or sends) that reply
rep("    if(u.edited_message)return new Response('ok');",
    "    if(u.edited_message)return new Response('ok');\n    if(m&&m.reply_to_message&&m.text){const ib=await inboxTelegramReply(env,m).catch((e)=>({handled:false,error:e.message}));if(ib.handled)return new Response('ok');}")

# 5) connections tile
rep('["Instagram DMs", "warn", "Waiting on Meta app review"],', '["Message replies \\xB7 GHL", "ok", "SMS, Instagram, Facebook and web chat answered by Command (Autopilot \\u203A Message replies)"],')

# 6) cache-bust the Command app
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
newv = hashlib.sha1(s.encode()).hexdigest()[:10]
s = s.replace(oldv, newv)
open(f, 'w').write(s)
print('v28 inbox applied; app', oldv, '->', newv)
