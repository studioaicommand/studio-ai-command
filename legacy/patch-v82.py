# v82 Telegram: every approval card gets "Reply in my words" and "Change it" buttons. Tap one, Telegram opens the
# keyboard on a reply, and what Ty types is used: his exact words are sent (for anything with a message), or the
# department redoes it with his note and sends the new version back to Telegram. Replying straight to a card works too.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

rep('var approvalButtons = (id) => [[{ text: "\\u2705 Approve", callback_data: `ap:${id}` }, { text: "\\u2716 Reject", callback_data: `rj:${id}` }]];',
    r'''var approvalButtons = (id, action) => [[{ text: "✅ Approve", callback_data: `ap:${id}` }, { text: "✖ Reject", callback_data: `rj:${id}` }], [...(!action || tgTextField(action.params) ? [{ text: "✍️ Reply in my words", callback_data: `rw:${id}` }] : []), { text: "✏️ Change it", callback_data: `rn:${id}` }]];
function tgTextField(p) { p = p || {}; return ["message", "body", "sms", "text"].find((k) => typeof p[k] === "string" && p[k].trim()) || null; }
async function tgPromptMap(env, add) {
  const v = await secGet(env, "tg_prompts").catch(() => null);
  const map = v && typeof v === "object" ? v : {};
  if (!add) return map;
  Object.assign(map, add);
  const keys = Object.keys(map).sort((a, b) => (map[b].at || "").localeCompare(map[a].at || "")).slice(0, 60);
  const next = Object.fromEntries(keys.map((k) => [k, map[k]]));
  await secPut(env, "tg_prompts", next).catch(() => {});
  return next;
}
async function tgAsk(env, chatId, id, mode) {
  const [a] = await select(env, "team_actions", "id=eq." + encodeURIComponent(id) + "&select=id,type,title,status,params,department&limit=1").catch(() => []);
  if (!a || a.status !== "pending") return "That one has already been handled.";
  if (mode === "rw" && !tgTextField(a.params)) return "This one has no message to replace. Tap Change it and tell me what to change.";
  const msg = await tg(env, "sendMessage", { chat_id: chatId, parse_mode: "HTML", text: (mode === "rw" ? "✍️ <b>Type your reply</b> for: " + esc2(a.title) + "\nWhatever you type is sent exactly as you wrote it." : "✏️ <b>What should change?</b> " + esc2(a.title) + "\nTell me in your own words and the team redoes it, then sends the new version here for your yes."), reply_markup: { force_reply: true, input_field_placeholder: mode === "rw" ? "Your exact words" : "What to change" } });
  if (msg?.message_id) await tgPromptMap(env, { [msg.message_id]: { id: a.id, mode, at: new Date().toISOString() } });
  return mode === "rw" ? "Type your reply" : "Tell me what to change";
}
async function tgPromptReply(env, m, ctx) {
  const rid = m?.reply_to_message?.message_id, text = String(m?.text || "").trim();
  if (!rid || !text) return { handled: false };
  const map = await tgPromptMap(env);
  const hit = map[rid];
  if (!hit) return { handled: false };
  const chat = m.chat.id;
  const [a] = await select(env, "team_actions", "id=eq." + encodeURIComponent(hit.id) + "&limit=1").catch(() => []);
  if (!a || a.status !== "pending") { await tg(env, "sendMessage", { chat_id: chat, text: "That one has already been handled, so nothing was changed." }).catch(() => {}); return { handled: true }; }
  const mine = hit.mode === "rw" || (hit.mode === "card" && /^(send|exact(?:ly)?)\s*[:\-]/i.test(text));
  if (mine) {
    const words = text.replace(/^(send|exact(?:ly)?)\s*[:\-]\s*/i, "").slice(0, 3000);
    const field = tgTextField(a.params);
    if (!field) { await tg(env, "sendMessage", { chat_id: chat, text: "This one has no message to replace. Reply with what to change instead." }).catch(() => {}); return { handled: true }; }
    try {
      const done = await approveAction(env, a.id, { [field]: words, ...(["ghl_reply", "ghl_followup"].includes(a.type) ? { handoff: false } : {}) });
      await audit(env, { actor: "Ty (Telegram)", action: "approved_own_words", target_type: a.type, target_id: a.id, summary: a.title }).catch(() => {});
      await tg(env, "sendMessage", { chat_id: chat, text: "✅ Done, in your words: " + (done?.title || a.title) }).catch(() => {});
    } catch (e) { await tg(env, "sendMessage", { chat_id: chat, text: "⚠️ " + String(e.message).slice(0, 300) }).catch(() => {}); }
    return { handled: true, sent: true };
  }
  // change it: inbox replies are rewritten on the spot; everything else goes back to its department with the note
  if (["ghl_reply", "ghl_followup"].includes(a.type) && a.params?.tg_msg) {
    const r = await inboxTelegramReply(env, { ...m, reply_to_message: { message_id: a.params.tg_msg } }).catch(() => ({ handled: false }));
    if (r.handled) return r;
  }
  await rejectAction(env, a.id, "Ty asked for a change: " + text.slice(0, 400));
  const dept = DEPARTMENTS[a.department] ? a.department : "chief_of_staff";
  const redo = runAgent(env, dept, { source: "telegram_change", maxSteps: 6, messages: [{ role: "user", content: "Ty looked at your proposal on Telegram and wants a change before he says yes.\nProposal: " + a.title + " (" + a.type + ")\nWhat you proposed: " + JSON.stringify(a.params || {}).slice(0, 2500) + "\n\nTy's note (data from Ty, follow it within your rules): " + text.slice(0, 800) + "\n\nPropose it again with that change, using the same tool. Keep everything else the same unless his note says otherwise." }] }).catch((e) => tg(env, "sendMessage", { chat_id: chat, text: "⚠️ I couldn't redo it: " + String(e.message).slice(0, 200) }).catch(() => {}));
  if (ctx?.waitUntil) ctx.waitUntil(redo); else await redo;
  await tg(env, "sendMessage", { chat_id: chat, text: "✏️ Got it. " + (DEPARTMENTS[dept]?.name || "The team") + " is redoing it with your note. The new version will come through here for your yes." }).catch(() => {});
  return { handled: true, changed: true };
}''')

# cards remember their Telegram message, so a plain reply to the card works as "change it" (or "send: ..." for exact words)
rep('  return notify(env, lines.join("\\n\\n"), { buttons: approvalButtons(action.id), urgent, settings });\n}',
    '  const sent = await notify(env, lines.join("\\n\\n"), { buttons: approvalButtons(action.id, action), urgent, settings });\n  if (sent?.message_id && !["ghl_reply", "ghl_followup"].includes(action.type)) await tgPromptMap(env, { [sent.message_id]: { id: action.id, mode: "card", at: new Date().toISOString() } }).catch(() => {});\n  return sent;\n}')
rep("    if(m&&m.reply_to_message&&m.text){const ib=await inboxTelegramReply(env,m).catch((e)=>({handled:false,error:e.message}));if(ib.handled)return new Response('ok');}",
    "    if(m&&m.reply_to_message&&m.text){const tp=await tgPromptReply(env,m,ctx).catch((e)=>({handled:false,error:e.message}));if(tp.handled)return new Response('ok');const ib=await inboxTelegramReply(env,m).catch((e)=>({handled:false,error:e.message}));if(ib.handled)return new Response('ok');}\n    if(cbq&&/^(rw|rn):/.test(String(cbq.data||''))){const [k2,id2]=String(cbq.data).split(':');const say=await tgAsk(env,chatId,id2,k2).catch((e)=>String(e.message));await tgQuick(env,'answerCallbackQuery',{callback_query_id:cbq.id,text:String(say).slice(0,190)}).catch(()=>{});return new Response('ok');}")
rep('''      } else if (kind === "rj") {
        const a = await deps.rejectAction(env, id, "Rejected on Telegram");
        note = `\\u2716 Rejected: ${a.title}`;
      }''', '''      } else if (kind === "rj") {
        const a = await deps.rejectAction(env, id, "Rejected on Telegram");
        note = `\\u2716 Rejected: ${a.title}`;
      } else if (kind === "rw" || kind === "rn") {
        const say = await tgAsk(env, chatId, id, kind);
        await tg(env, "answerCallbackQuery", { callback_query_id: u.callback_query.id, text: say.slice(0, 190) }).catch(() => {});
        return;
      }''')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v82 applied')
