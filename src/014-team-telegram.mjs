// src/team/telegram.js
var OWNER_USERNAME = "studioflowandsystems";
var API2 = (env, m) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${m}`;
var telegramReady = (env, settings) => !!(env.TELEGRAM_BOT_TOKEN && settings?.telegram?.chat_id);

// v103: mark every demo link Ty receives on Telegram
function tyLinkify(text, html) {
  const m = globalThis.__sfTyMark;
  if (!m || typeof text !== "string" || !/\/demo\//.test(text)) return text;
  return text.replace(/https?:\/\/[a-z0-9.-]*studioflowandsystems\.app\/(?:api\/v1\/)?demo\/[^\s"'<>)\]]+/gi, (u) => {
    if (/[?&](?:amp;)?ty=/.test(u)) return u;
    const tail = u.match(/[.,;:!]+$/)?.[0] || "";
    const core = tail ? u.slice(0, -tail.length) : u;
    return core + (core.includes("?") ? (html ? "&amp;" : "&") : "?") + "ty=" + m + tail;
  });
}
function tyPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const html = String(payload.parse_mode || "").toUpperCase() === "HTML";
  const out = { ...payload };
  if (typeof out.text === "string") out.text = tyLinkify(out.text, html);
  if (typeof out.caption === "string") out.caption = tyLinkify(out.caption, html);
  if (out.reply_markup?.inline_keyboard) out.reply_markup = { ...out.reply_markup, inline_keyboard: out.reply_markup.inline_keyboard.map((row) => row.map((b) => b && b.url ? { ...b, url: tyLinkify(b.url, false) } : b)) };
  return out;
}
async function tg(env, method, payload) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN isn't set in Cloudflare.");
  if (!globalThis.__sfTyMark) await tyMark(env).catch(() => {});
  payload = tyPayload(payload);
  const receipt=await prepareTelegramDelivery(env,method,payload);
  const r = await fetch(API2(env, method), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload || {}), signal: AbortSignal.timeout(15e3) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description || r.status}`);
  await archiveTelegramDelivery(env,receipt,method,payload,j.result).catch(e=>console.error('Telegram archive receipt:',e.message));
  return j.result;
}
var esc2 = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
async function hookSecret(env) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(env.TEAM_API_KEY || env.STUDIO_TEST_KEY || "") + "|telegram"));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 48);
}
async function setupTelegram(env, origin) {
  const me = await tg(env, "getMe");
  const secret = await hookSecret(env);
  await tg(env, "setWebhook", { url: `${origin}/api/v1/telegram/hook`, secret_token: secret, allowed_updates: ["message", "edited_message", "callback_query"], drop_pending_updates: false });
  await tg(env, "setMyCommands", { commands: [{ command: "today", description: "Today's tasks and numbers" }, { command: "approvals", description: "What's waiting for my yes" }, { command: "help", description: "What I can do" }] }).catch(() => {
  });
  const settings = await getSettings(env);
  const code = String(Math.floor(1e5 + Math.random() * 9e5));
  await saveSetting(env, "telegram", { ...settings.telegram || {}, bot: me.username, pair_code: code, pair_expires: Date.now() + 30 * 6e4 });
  return { ok: true, bot: me.username, code, link: `https://t.me/${me.username}?start=${code}`, linked: !!settings.telegram?.chat_id };
}
async function telegramStatus(env) {
  const s = await getSettings(env);
  return { ok: true, token: !!env.TELEGRAM_BOT_TOKEN, linked: !!s.telegram?.chat_id, bot: s.telegram?.bot || null, username: s.telegram?.username || null, linked_at: s.telegram?.linked_at || null };
}
async function notify(env, text, { buttons = null, urgent = false, settings = null } = {}) {
  settings = settings || await getSettings(env).catch(() => null);
  if (!telegramReady(env, settings)) return { sent: false, reason: "telegram not linked" };
  const h = brisbaneNow().hour;
  if (!urgent && (h >= 21 || h < 7)) return { sent: false, reason: "quiet hours" };
  if (!urgent && await awayHold(env, text).catch(() => false)) return { sent: false, reason: "away: held for Ty's return" };
  try {
    const msg = await tg(env, "sendMessage", { chat_id: settings.telegram.chat_id, text: String(text).slice(0, 3900), parse_mode: "HTML", disable_web_page_preview: true, ...buttons ? { reply_markup: { inline_keyboard: buttons } } : {} });
    return { sent: true, message_id: msg.message_id };
  } catch (e) {
    console.error("telegram:", e.message);
    return { sent: false, reason: e.message };
  }
}
var approvalButtons = (id, action) => [[{ text: "✅ Approve", callback_data: `ap:${id}` }, { text: "✖ Reject", callback_data: `rj:${id}` }], [...(!action || tgTextField(action.params) ? [{ text: "✍️ Reply in my words", callback_data: `rw:${id}` }] : []), { text: "✏️ Change it", callback_data: `rn:${id}` }]];
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
  const msg = await tg(env, "sendMessage", { chat_id: chatId, parse_mode: "HTML", text: (mode === "rw" ? "✍️ <b>Type your reply</b> for: " + esc2(a.title) + "\nWhat you type is sent exactly as you wrote it. A note to me instead (like \"reply as me\" or \"tell her Tuesday works\") gets turned into a new draft for your yes, never sent as is." : "✏️ <b>What should change?</b> " + esc2(a.title) + "\nTell me in your own words and the team redoes it, then sends the new version here for your yes."), reply_markup: { force_reply: true, input_field_placeholder: mode === "rw" ? "Your exact words" : "What to change" } });
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
  if (hit.mode === "learn") {
    const rl = await brainRules(env).catch(() => []);
    const ctx2 = "The owner is replying to tonight's 'What the team learned today' list: " + (hit.list || []).map((id, i) => (i + 1) + ". [" + id + "] " + ((rl.find((r) => r.id === id) || {}).rule || "(already removed)")).join(" ") + ". Numbers refer to that list. Fix, replace or forget rules as they say.";
    const lr = await learnFromTy(env, text, { source: "telegram", asked: ctx2 }).catch(() => null);
    await tg(env, "sendMessage", { chat_id: chat, text: learnNote(lr) || "Thanks. Nothing to change in the rulebook from that." }).catch(() => {});
    return { handled: true, learned: !!lr };
  }
  const [a] = await select(env, "team_actions", "id=eq." + encodeURIComponent(hit.id) + "&limit=1").catch(() => []);
  if (!a || a.status !== "pending") { await tg(env, "sendMessage", { chat_id: chat, text: "That one has already been handled, so nothing was changed." }).catch(() => {}); return { handled: true }; }
  let mine = hit.mode === "rw" || (hit.mode === "card" && /^(send|exact(?:ly)?)\s*[:\-]/i.test(text));
  let asNote = false;
  if (mine && hit.mode === "rw" && await tgIsNote(env, text)) { mine = false; asNote = true; }
  if (asNote) await tg(env, "sendMessage", { chat_id: chat, text: "\u{1F6D1} That reads like a note to me, not words to send, so nothing went to them. I'm rewriting the reply with your note and the new version will come here for your yes. (To send exact words, start with \"send:\".)" }).catch(() => {});
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
}

// ── v104 health compliance safety net ──
var HEALTH_CHECKS = [
  { k: "dose", strong: true, label: "a medication or dose", re: /\b\d+(\.\d+)?\s?(mg|mcg|ml|milligrams?)\b|\b(take|try|use)\s+(some\s+)?(ibuprofen|paracetamol|nurofen|panadol|voltaren|codeine|antibiotics?|anti-inflammator\w*|painkillers?)\b/i },
  { k: "diagnosis", strong: true, label: "a diagnosis", re: /\b(you (probably|likely|might|may)? ?(have|'ve got|got) (a |an )?[a-z ]{0,20}(injury|infection|tear|strain|sprain|fracture|disc|abscess|cavity|condition|disorder))\b|\bsounds like (a |an )?[a-z ]{0,20}(injury|infection|tear|strain|sprain|fracture|disc|abscess|cavity|sciatica|tendinitis|tendonitis|bursitis)\b/i },
  { k: "outcome", strong: true, label: "a guaranteed result", re: /\b(guarantee[ds]?|cures?d?|will (fix|cure|heal) (it|this|your)|100% (effective|success|results)|pain[- ]free (forever|for good)|permanent(ly)? (fix|cure)|risk[- ]free)\b/i },
  { k: "testimonial", strong: false, label: "a patient testimonial (AHPRA: not allowed in clinic advertising)", re: /\btestimonials?\b|\bwhat our (patients|clients) (say|think)\b|\b5[- ]star (review|rated)\b|["“][^"”]{25,}["”]\s*[-–—]\s*[A-Z][a-z]+/ },
  { k: "superlative", strong: false, label: "a \"best\" or \"number one\" claim (AHPRA)", re: /\b(best|leading|number one|no\.? ?1|#1|top[- ]rated)\s+(dentist|dental|chiro\w*|physio\w*|osteo\w*|podiatr\w*|psycholog\w*|clinic|practice|practitioner)s?\b/i },
  { k: "health_details", strong: false, label: "asking for health details by message", re: /\b(medicare (number|card)|date of birth|\bdob\b|medical history|list of (your )?medications|what medications)\b/i }
];
function healthFlags(text) { const t = String(text || ""); return HEALTH_CHECKS.filter((c) => c.re.test(t)).map((c) => ({ k: c.k, strong: c.strong, label: c.label })); }
async function healthMode(env) {
  const now = Date.now(), c = globalThis.__sfHealthMode;
  if (c && now - c.at < 3e5) return c.on;
  const i = await instGet(env).catch(() => null);
  const on = !!(i?.custom && /allied|dental|dentist|medical|psych|chiro|physio|osteo|podiatr|health|clinic/i.test(String(i.template || "") + " " + String(i.industry || "")));
  globalThis.__sfHealthMode = { at: now, on };
  return on;
}
async function healthGate(env, out) {
  if (!out || !out.reply || out.handoff || !(await healthMode(env).catch(() => false))) return out;
  const strong = healthFlags(out.reply).filter((f) => f.strong);
  if (!strong.length) return out;
  return { reply: "", handoff: true, reason: "Health check: the reply looked like " + strong.map((f) => f.label).join(" and ") + ", so it wasn't sent automatically. Suggested words: " + String(out.reply).slice(0, 600) };
}

async function askTy(env, action, { urgent = false, settings = null } = {}) {
  action = await qaAttach(env, action).catch(() => action);
  const p = action.params || {};
  const lines = [`${urgent ? "\u{1F525} " : ""}<b>${esc2(action.title)}</b>`];
  if (action.reason) lines.push(esc2(action.reason).slice(0, 500));
  const body = p.body || p.message || p.note || p.details;
  if (body) lines.push(`<i>${esc2(String(body).slice(0, 700))}</i>`);
  if (body && await healthMode(env).catch(() => false)) { const hf = healthFlags([p.subject, body, p.html].filter(Boolean).join(" ")); if (hf.length) lines.push("\u26A0\uFE0F <b>Health check:</b> this looks like " + esc2(hf.map((f) => f.label).join("; ")) + ". Edit it before approving."); }
  if (p.lines) lines.push(esc2(p.lines.map((l) => `${l.description}: $${l.amount_aud}`).join(", ")));
  const sent = await notify(env, lines.join("\n\n"), { buttons: approvalButtons(action.id, action), urgent, settings });
  if (sent?.message_id && !["ghl_reply", "ghl_followup"].includes(action.type)) await tgPromptMap(env, { [sent.message_id]: { id: action.id, mode: "card", at: new Date().toISOString() } }).catch(() => {});
  return sent;
}
async function telegramHook(request, env, ctx, deps) {
  if (request.method !== "POST") return new Response("ok");
  const secret = await hookSecret(env);
  if (!secret || !sfKeyEq(String(request.headers.get("X-Telegram-Bot-Api-Secret-Token") || ""), String(secret))) return new Response("forbidden", { status: 403 });
  const u = await request.json().catch(() => ({}));
  const cbq = u.callback_query, cbk = /^(ap|rj|pa):/.test(String(cbq?.data || "")) ? String(cbq.data).slice(0, 2) === "rj" ? "rj" : "ap" : null;
  if (cbk && ctx?.waitUntil) ctx.waitUntil(tgQuick(env, "answerCallbackQuery", { callback_query_id: cbq.id, text: cbk === "ap" ? "\u23F3 On it: approving now" : "\u23F3 Rejecting" }));
  try {
    const [stored]=await select(env,'team_settings','key=eq.telegram&limit=1'),t=stored?.value||{};
    const m=u.message||u.edited_message,chatId=m?.chat?.id||u.callback_query?.message?.chat?.id;
    if(!t.chat_id||String(chatId)!==String(t.chat_id)){await handleUpdate(env,u,deps);return new Response('ok');}
    if(m)await telegramRecord(env,m,'user');
    if(u.edited_message)return new Response('ok');
    if(m&&m.reply_to_message&&m.text){const tp=await tgPromptReply(env,m,ctx).catch((e)=>({handled:false,error:e.message}));if(tp.handled)return new Response('ok');const ib=await inboxTelegramReply(env,m).catch((e)=>({handled:false,error:e.message}));if(ib.handled)return new Response('ok');}
    if(cbq&&/^(rw|rn):/.test(String(cbq.data||''))){const [k2,id2]=String(cbq.data).split(':');const say=await tgAsk(env,chatId,id2,k2).catch((e)=>String(e.message));await tgQuick(env,'answerCallbackQuery',{callback_query_id:cbq.id,text:String(say).slice(0,190)}).catch(()=>{});return new Response('ok');}
    if(cbk&&cbq.message&&ctx?.waitUntil)ctx.waitUntil(tgQuick(env,'editMessageText',{chat_id:chatId,message_id:cbq.message.message_id,text:String(cbq.message.text||'').slice(0,3500)+'\n\n'+(cbk==='ap'?'\u23F3 Approving\u2026':'\u23F3 Rejecting\u2026'),disable_web_page_preview:true,reply_markup:{inline_keyboard:[]}}));
    if(u.callback_query)await saveRecord(env,{source:'telegram',external_key:'callback:'+u.callback_query.id,conversation_id:'telegram:'+chatId,role:'user',actor:'Ty',content:'Telegram approval button: '+u.callback_query.data,metadata:{callback:true,message_id:u.callback_query.message?.message_id}});
    if(!Number.isInteger(u.update_id))throw Error('Missing Telegram update ID.');
    const saved=await queueCommandJob(env,{kind:'telegram',department:'chief_of_staff',request:m?.text||m?.caption||'Telegram interaction',source:'telegram',params:{update:u},key:'telegram:'+u.update_id});
    if(cbk&&saved.status==='queued'&&ctx?.waitUntil)ctx.waitUntil(executeCommandJob(env,saved.job_id,telegramCommandDeps(env,ctx)).catch(e=>console.error('Instant approval:',e.message)));
    if(!cbk&&!env.COMMAND_QUEUE?.send&&saved.status==='queued'&&!saved.already_saved)await tg(env,'sendMessage',{chat_id:chatId,text:'Your message is saved as job '+saved.job_id+'. The immediate AI runner is not connected yet; it is queued for the scheduled recovery run.'});
    return new Response('ok');
  }catch(err){console.error('Telegram save failed:',err.message);return new Response('Could not save update; retry later.',{status:503});}

}
async function handleUpdate(env, u, deps) {
  const settings = await getSettings(env);
  const t = settings.telegram || {};
  const from = u.message?.from || u.callback_query?.from || {};
  const chatId = u.message?.chat?.id || u.callback_query?.message?.chat?.id;
  const username = String(from.username || "").toLowerCase();
  if (u.message && !t.chat_id) {
    const code = (String(u.message.text || "").match(/\d{6}/) || [])[0];
    if (username === OWNER_USERNAME && code && code === t.pair_code && Date.now() < (t.pair_expires || 0)) {
      await saveSetting(env, "telegram", { bot: t.bot, chat_id: chatId, username, linked_at: (/* @__PURE__ */ new Date()).toISOString() });
      await audit(env, { actor: "Ty", action: "telegram_linked", summary: `Telegram linked to @${username}` });
      await tg(env, "sendMessage", { chat_id: chatId, text: "\u2705 Studio AI is connected. I'll message you here when money is close (replies, bookings, payments) and send a 7am digest. Type anything to talk to Studio AI Command.\n\nTry /today" });
    } else {
      await tg(env, "sendMessage", { chat_id: chatId, text: username === OWNER_USERNAME ? "Open Studio AI \u2192 Connections \u2192 Telegram, tap Connect, then send me the 6-digit code." : "This is a private assistant." }).catch(() => {
      });
    }
    return;
  }
  if (!t.chat_id || chatId !== t.chat_id) {
    if (chatId) await tg(env, "sendMessage", { chat_id: chatId, text: "This is a private assistant." }).catch(() => {
    });
    return;
  }
  if (u.callback_query) {
    const [kind, id] = String(u.callback_query.data || "").split(":");
    let note = "";
    try {
      if (kind === "pa") {
        // v121: approve every Growth Pack email waiting, in one tap
        const rows = await select(env, "team_actions", "status=eq.pending&type=eq.outreach_email&params->>source=eq.growth_pack&select=id,title&order=created_at.asc&limit=20").catch(() => []);
        let ok = 0, held = 0;
        for (const r of rows) { try { await deps.approveAction(env, r.id); ok++; } catch (e) { held++; } }
        note = rows.length ? "\u2705 Approved " + ok + " Growth Pack email" + (ok === 1 ? "" : "s") + (held ? " (" + held + " held back by the safety checks)" : "") : "Nothing waiting.";
        await audit(env, { actor: "Ty (Telegram)", action: "approved", target_type: "outreach_email", summary: "Approved all Growth Pack emails (" + ok + ")" });
      } else if (kind === "ap") {
        const a = await deps.approveAction(env, id);
        note = a.type === "owner_task" ? `\u2705 Done: ${a.title}` : `\u2705 Approved: ${a.title}`;
        await audit(env, { actor: "Ty (Telegram)", action: "approved", target_type: a.type, target_id: id, summary: a.title });
      } else if (kind === "rj") {
        const a = await deps.rejectAction(env, id, "Rejected on Telegram");
        note = `\u2716 Rejected: ${a.title}`;
      } else if (kind === "rw" || kind === "rn") {
        const say = await tgAsk(env, chatId, id, kind);
        await tg(env, "answerCallbackQuery", { callback_query_id: u.callback_query.id, text: say.slice(0, 190) }).catch(() => {});
        return;
      }
    } catch (e) {
      note = `\u26A0\uFE0F ${e.message}`.slice(0, 190);
    }
    await tg(env, "answerCallbackQuery", { callback_query_id: u.callback_query.id, text: note.slice(0, 190) }).catch(() => {
    });
    const m = u.callback_query.message;
    if (m) await tg(env, "editMessageText", { chat_id: chatId, message_id: m.message_id, text: (m.text || "").slice(0, 3500) + "\n\n" + note, disable_web_page_preview: true }).catch(() => {
    });
    return;
  }
  const text = String(u.message?.text || "").trim();
  if (!text) {
    await tg(env, "sendMessage", { chat_id: chatId, text: "I can read text messages for now." });
    return;
  }
  if (/^\/(today|start)\b/.test(text)) {
    await tg(env, "sendMessage", { chat_id: chatId, ...await deps.digest(env, { forTelegram: true }) });
    return;
  }
  if (/^\/approvals\b/.test(text)) {
    await sendApprovals(env, chatId);
    return;
  }
  if (/^\/help\b/.test(text)) {
    await tg(env, "sendMessage", { chat_id: chatId, text: "Type anything to Studio AI Command (e.g. 'who should I call first?', 'run a dental hunt on the Gold Coast', 'how are we tracking?').\n/today: tasks and numbers\n/approvals: what's waiting for your yes" });
    return;
  }
  await tg(env, "sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {
  });
  const hist = (t.history || []).slice(-12);
  let reply;
  try {
    reply = await deps.command(env, text + "\n\n(Telegram reply: keep it short and sharp. Plain sentences and short lines, at most one short list, no tables, no markdown headings.)", hist);
  } catch (e) {
    reply = "I hit an error: " + String(e.message).slice(0, 200);
  }
  const history = [...hist, { role: "user", content: text.slice(0, 2e3) }, { role: "assistant", content: String(reply).slice(0, 2e3) }].slice(-12);
  const fresh=await getSettings(env);
  await saveSetting(env, "telegram", { ...fresh.telegram, history });
  for (const part of chunk(String(reply), 3800)) {
    try { await tg(env, "sendMessage", { chat_id: chatId, text: tgHtml(part), parse_mode: "HTML", disable_web_page_preview: true }); }
    catch { await tg(env, "sendMessage", { chat_id: chatId, text: tgPlain(part), disable_web_page_preview: true }); }
  }
}
// Telegram shows markdown as raw symbols, so turn it into clean text with real bold.
var tgPlain = (s) => String(s).replace(/\r/g, "").replace(/^#{1,6}\s*/gm, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/^\s*[-*]\s+/gm, "\u2022 ").replace(/(^|\s)\*(\S[^*\n]*?)\*(?=\s|[.,!?]|$)/g, "$1$2").replace(/\*/g, "").replace(/\n{3,}/g, "\n\n").trim();
var tgHtml = (s) => {
  const e = String(s).replace(/\r/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return e.replace(/^#{1,6}\s*(.+)$/gm, "<b>$1</b>").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/__(.+?)__/g, "<b>$1</b>").replace(/`([^`]+)`/g, "$1").replace(/^\s*[-*]\s+/gm, "\u2022 ").replace(/(^|\s)\*(\S[^*\n]*?)\*(?=\s|[.,!?]|$)/g, "$1$2").replace(/\*/g, "").replace(/\n{3,}/g, "\n\n").trim();
};
var chunk = (s, n) => {
  const out = [];
  for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
  return out.length ? out : [""];
};
async function sendApprovals(env, chatId) {
  const A = await select(env, "team_actions", "status=eq.pending&type=neq.owner_task&order=created_at.asc&limit=10").catch(() => []);
  if (!A.length) {
    await tg(env, "sendMessage", { chat_id: chatId, text: "Nothing is waiting for your yes. \u2705" });
    return;
  }
  for (const a of A) await tg(env, "sendMessage", { chat_id: chatId, text: `${a.title}${a.reason ? "\n\n" + a.reason.slice(0, 400) : ""}`, reply_markup: { inline_keyboard: approvalButtons(a.id) }, disable_web_page_preview: true });
}

