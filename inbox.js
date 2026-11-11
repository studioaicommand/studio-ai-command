
// ── v28 Command Inbox: Command replies to SMS, Instagram, Facebook and web chat messages via GHL ──
// GHL workflow ("Customer replied" trigger → Webhook action) POSTs to /api/v1/inbox/ghl/<key>.
// Command reads the conversation from GHL, writes a reply as Studio AI, then either sends it
// (auto) or queues it for Ty's approval (approve), per channel. Tricky messages go to Ty.
const INBOX_CHANNELS = {
  sms: { label: 'SMS', send: 'SMS', re: /sms|text/i },
  ig: { label: 'Instagram', send: 'IG', re: /instagram|\big\b/i },
  fb: { label: 'Facebook', send: 'FB', re: /facebook|messenger|\bfb\b/i },
  chat: { label: 'Website chat', send: 'Live_Chat', re: /live.?chat|web.?chat|widget/i },
  email: { label: 'Email', send: 'Email', re: /^email$/i },
};
const INBOX_DEFAULT = { sms: 'approve', ig: 'approve', fb: 'approve', chat: 'approve' };
const INBOX_STYLE = "HOW TO TALK IN MESSAGES (this is what makes people book):\n- Sound like a warm, switched-on person from a small Brisbane studio texting back, not a company or a bot. Australian English, everyday words, contractions. No corporate phrases (\"I understand your frustration\", \"great question\", \"we pride ourselves\", \"solutions\"), no em dashes, at most one emoji and usually none.\n- Space it out like a real message: 2 or 3 short lines, each its own thought, with a blank line between them (use \\n\\n in the JSON). Never one long block.\n- Reflect first. Start by showing you actually heard them: mirror their words or name what sits behind the question (e.g. \"Sounds like enquiries are coming in faster than you can answer them.\" or \"Makes sense, you want the site to bring in clients, not just look nice.\"). Never repeat their whole message back.\n- Then give one useful, specific thing: a straight answer, a relevant example, or one clear range.\n- Then ask ONE easy question that moves them forward. Never two questions in one message.\n- Walk them along, one step per message, reading the conversation so far:\n  1. Cold or just curious (first message, vague, price-only): be friendly and light, answer simply, ask what their business is and what made them reach out.\n  2. Opening up (they've shared their business or a problem): reflect the problem back in their words, show you've seen it before, ask what it's costing them or what they've tried.\n  3. Feels heard (they've told you the pain and what they want): connect it to the one thing we'd do for them, give the honest range, and invite them to a free 30-minute call with Ty to map it out.\n  4. Ready (they say yes, ask how to start, or ask about times): make it easy. Send the booking link on its own line and tell them what happens on the call.\n  Skip ahead whenever they're ready; never drag a keen person back to step 1, and never push the link at someone who's still cold.\n- PRICES: if you don't know their business yet, ask first in a friendly way, then give one range for the thing that fits them. Never list every package.\n- Keep it short: SMS under 300 characters (still 2 short lines); Instagram and Facebook under about 450 characters.\n- Use their first name only now and then, not every message. Sign off with nothing.\n";
const INBOX_BOOK = 'https://links.studioflowandsystems.com/widget/booking/tfzrthnax3Ldpncejghq';
const INBOX_LIMITS = { perContactDay: 6, perDay: 150, humanQuietMins: 120 };

async function inboxKey(env) {
  const seed = 'inbox:' + (env.TEAM_API_KEY || env.STUDIO_TEST_KEY || 'studio');
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 28);
}
const INBOX_MODE_KEYS = ['sms', 'ig', 'fb', 'chat', 'followup', 'reviews'];
function inboxSettings(settings) {
  const v = settings?.inbox && typeof settings.inbox === 'object' ? settings.inbox : {};
  const out = { ...INBOX_DEFAULT, followup: 'approve', reviews: 'approve', sms_live: false, review_link: '' };
  for (const k of INBOX_MODE_KEYS) if (['off', 'approve', 'auto'].includes(v[k])) out[k] = v[k];
  out.sms_live = v.sms_live === true;
  if (/^https:\/\/\S{8,300}$/.test(String(v.review_link || ''))) out.review_link = String(v.review_link);
  return out;
}
function inboxChannel(m) {
  const t = String(m?.messageType || m?.type || m?.channel || '');
  if (/TYPE_SMS|^sms$/i.test(t) || t === '2') return 'sms';
  if (/INSTAGRAM|^ig$/i.test(t)) return 'ig';
  if (/FACEBOOK|^fb$/i.test(t)) return 'fb';
  if (/LIVE_CHAT|WEBCHAT/i.test(t)) return 'chat';
  for (const [k, c] of Object.entries(INBOX_CHANNELS)) if (c.re.test(t)) return k;
  return null;
}
const inboxTxt = (s, n = 1200) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

async function inboxRoute(request, rawEnv, ctx) {
  const env = teamEnv(rawEnv);
  const url = new URL(request.url);
  const key = url.pathname.replace(/^\/api\/v1\/inbox\/ghl\/?/, '').replace(/\/+$/, '');
  if (!key || key !== await inboxKey(env)) return new Response(JSON.stringify({ ok: false }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  if (request.method !== 'POST') {
    // GET <hook>?run=followups runs the follow-up check now (same rules as the hourly run).
    if (url.searchParams.get('run') === 'followups') {
      const at = Date.parse(url.searchParams.get('at') || '');
      const r = await inboxFollowups(env, Number.isFinite(at) ? new Date(at) : new Date()).catch((e) => ({ error: String(e.message).slice(0, 200) }));
      return new Response(JSON.stringify({ ok: true, ...r }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true, hint: 'POST from a GHL workflow webhook' }), { headers: { 'Content-Type': 'application/json' } });
  }
  let body = {};
  try { body = await request.json(); } catch {}
  const job = inboxHandle(env, body).catch((e) => ({ error: String(e.message).slice(0, 300) })).then(async (r) => {
    if (env.INBOX_DEBUG) console.log("inbox:", JSON.stringify(r));
    // Keep the last 15 outcomes so Ty (and Claude) can see what happened to each message.
    try {
      const rows = await select(env, 'team_settings', 'key=eq.inbox_log&select=value&limit=1').catch(() => []);
      const prev = Array.isArray(rows?.[0]?.value) ? rows[0].value : [];
      const m = body.message && typeof body.message === 'object' ? body.message : {};
      const entry = { at: new Date().toISOString(), contact: String(body.full_name || body.first_name || body.contact_id || body.customData?.contact_id || '').slice(0, 60), result: r, sent_type: String(m.type ?? body.message_type ?? '').slice(0, 30), keys: Object.keys(body).slice(0, 25) };
      await saveSetting(env, 'inbox_log', [entry, ...prev].slice(0, 15));
    } catch (e) { console.error('inbox log:', String(e.message).slice(0, 200)); }
    return r;
  });
  if (ctx?.waitUntil) ctx.waitUntil(job); else await job;
  return new Response(JSON.stringify({ ok: true, received: true }), { headers: { 'Content-Type': 'application/json' } });
}

async function inboxHistory(env, contactId) {
  const conv = await req(env, 'GET', '/conversations/search?' + q({ locationId: env.GHL_LOCATION_ID, contactId, limit: 1 }), null, '2021-04-15');
  const c = (conv?.conversations || [])[0];
  if (!c?.id) return { conversationId: null, messages: [] };
  const m = await req(env, 'GET', '/conversations/' + c.id + '/messages?' + q({ limit: 20 }), null, '2021-04-15');
  const list = (m?.messages?.messages || m?.messages || []).filter((x) => x && typeof x === 'object');
  list.sort((a, b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0));
  return { conversationId: c.id, messages: list };
}

async function inboxHandle(env, body) {
  if (!enabled(env)) return { skipped: 'ghl not connected' };
  const contactId = body.contact_id || body.contactId || body.contact?.id || body.customData?.contact_id;
  if (!contactId) return { skipped: 'no contact' };
  const settings = await getSettings(env).catch(() => ({}));
  const modes = inboxSettings(settings);
  if (String(body.event || body.customData?.event || '').toLowerCase() === 'review') return inboxReview(env, contactId, settings);

  let hist = { conversationId: null, messages: [] };
  let histErr = null;
  try { hist = await inboxHistory(env, contactId); } catch (e) { histErr = String(e.message).slice(0, 160); console.error('inbox history:', histErr); }
  const msgs = hist.messages;
  const last = msgs[msgs.length - 1];
  const payloadMsg = body.message && typeof body.message === 'object' ? body.message : { body: body.message || body.body, type: body.message_type || body.channel };
  // The newest message must be from the customer; if the business already answered, stay quiet.
  if (last && last.direction && last.direction !== 'inbound') return { skipped: 'already answered' };
  const inbound = last || { body: payloadMsg.body, messageType: payloadMsg.type, id: null };
  const channel = inboxChannel(inbound) || inboxChannel(payloadMsg);
  if (!channel) return { skipped: 'channel not handled', type: String(inbound.messageType || payloadMsg.type || ''), history_error: histErr };
  const mode = modes[channel];
  if (mode === 'off') return { skipped: 'channel off' };
  const text = inboxTxt(inbound.body || payloadMsg.body, 1500);
  if (!text) return { skipped: 'empty' };
  if (/^\s*(stop|unsubscribe|opt ?out|cancel)\s*$/i.test(text)) return { skipped: 'opt-out' };
  const msgId = inbound.id || ('p-' + contactId + '-' + text.slice(0, 40));

  // A person on the team replied recently → Command stays out of it.
  const since = Date.now() - INBOX_LIMITS.humanQuietMins * 6e4;
  if (msgs.some((m) => m.direction === 'outbound' && m.userId && new Date(m.dateAdded || 0).getTime() > since)) return { skipped: 'team is handling it' };

  // Never handle the same message twice; cap volume.
  const dupe = await select(env, 'team_actions', 'type=eq.ghl_reply&params->>message_id=eq.' + encodeURIComponent(msgId) + '&select=id&limit=1').catch(() => []);
  if (dupe.length) return { skipped: 'duplicate' };
  const dayStart = new Date(Date.now() - 864e5).toISOString();
  const todays = await select(env, 'team_actions', 'type=eq.ghl_reply&created_at=gte.' + encodeURIComponent(dayStart) + '&select=id,params').catch(() => []);
  if (todays.length >= INBOX_LIMITS.perDay) return { skipped: 'daily cap' };
  if (todays.filter((a) => a.params?.contact_id === contactId).length >= INBOX_LIMITS.perContactDay) return { skipped: 'contact cap' };

  let contact = {};
  try { contact = (await getContact(env, contactId))?.contact || {}; } catch {}
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.contactName || 'Someone';
  const history = msgs.slice(-12).map((m) => ({ role: m.direction === 'inbound' ? 'user' : 'assistant', content: inboxTxt(m.body, 800) })).filter((m) => m.content);
  if (!history.length || history[history.length - 1].role !== 'user') history.push({ role: 'user', content: text });

  const draft = await inboxWrite(env, channel, contact, history);
  const label = INBOX_CHANNELS[channel].label;

  if (draft.handoff || !draft.reply) {
    await addNote(env, contactId, 'Command flagged this ' + label + ' message for Ty: ' + (draft.reason || 'needs a person') + '\n\nThey wrote: ' + text).catch(() => {});
    await addTags(env, contactId, ['needs-ty']).catch(() => {});
    await insert(env, 'team_actions', [{ department: 'head_of_sales', type: 'ghl_reply', title: ('Needs you: ' + name + ' on ' + label).slice(0, 200), reason: ('Handed to you: ' + (draft.reason || 'needs a person') + '. They wrote: "' + text.slice(0, 300) + '"').slice(0, 420) + '\n\nReply to this message with what to tell them, or "send: your exact words".', params: { contact_id: contactId, contact_name: name, channel, send_type: INBOX_CHANNELS[channel].send, message: draft.reply || '', message_id: msgId, inbound: text.slice(0, 1000), handoff: true }, status: 'pending' }]).then(async ([row]) => row && inboxRemember(env, row, await askTy(env, row, { settings }))).catch(() => {});
    return { handoff: true };
  }

  const [row] = await insert(env, 'team_actions', [{ department: 'head_of_sales', type: 'ghl_reply', title: ('Reply to ' + name + ' on ' + label).slice(0, 200), reason: ('They wrote: "' + text.slice(0, 400) + '"').slice(0, 500), params: { contact_id: contactId, contact_name: name, channel, send_type: INBOX_CHANNELS[channel].send, message: draft.reply, message_id: msgId, inbound: text.slice(0, 1000) }, status: 'pending' }]);
  if (!row) return { error: 'could not save' };
  if (mode === 'auto') {
    await update(env, 'team_actions', 'id=eq.' + row.id, { auto: true }).catch(() => {});
    try { await approveAction(env, row.id); return { sent: true }; } catch (e) { return { error: String(e.message).slice(0, 200) }; }
  }
  await inboxRemember(env, row, await askTy(env, row, { settings }).catch(() => null));
  return { queued: true };
}

function inboxPriceBook(catalog) {
  try {
    const c = offersCatalog(catalog);
    const items = Object.values(c.items || {}).filter((i) => i && i.enabled !== false);
    if (!items.length) return '';
    return '\nCURRENT PRODUCTS AND PRICES (from Command > Offers; these override any older figure above):\n' + items.map((i) => '- ' + i.title + (i.price ? ': ' + (i.id === 'phone' || /signature|seo|systems/.test(i.id) ? 'from ' : '') + 'A$' + Number(i.price).toLocaleString('en-AU') + (i.group === 'monthly' ? '/month' : '') + (i.was ? ' (normally A$' + Number(i.was).toLocaleString('en-AU') + ')' : '') : '') + '. ' + (i.description || '') + (Array.isArray(i.features) && i.features.length ? ' Includes: ' + i.features.slice(0, 4).join('; ') + '.' : '')).join('\n');
  } catch { return ''; }
}
async function inboxWrite(env, channel, contact, history, direction = '') {
  const offer = await siteOffer(env).catch(() => null);
  const cat = await select(env, 'team_settings', 'key=eq.offer_catalog&select=value&limit=1').then((r) => r?.[0]?.value || {}).catch(() => ({}));
  const label = INBOX_CHANNELS[channel].label;
  const base = offer ? siteInstructions(offer, 'chat') : 'You are Studio AI for Studio Flow & Systems, a Brisbane studio building premium websites and AI receptionists.';
  const system = base + '\n\nTHIS CHANNEL OVERRIDES THE WEBSITE RULES ABOVE: you are answering a ' + label + ' message sent to Studio Flow & Systems' + (contact.firstName ? ' from ' + contact.firstName : '') + '. You have no tools, buttons or cards here: ignore every instruction above about find_times, prepare_booking, prepare_enquiry, suggest_next_step, buttons and links being rendered. To book a free 30-minute call, share this link as plain text: ' + INBOX_BOOK + ' . Plain text only, no markdown, no bullet points.\n' + INBOX_STYLE + 'Write as the Studio Flow & Systems team assistant; if asked, say you are Studio Flow\'s AI assistant and Ty can jump in any time. Sign off with nothing.\n' +
    'HAND TO TY (handoff true, reply empty) when: they ask for Ty personally or a phone call now; it is a complaint, refund, billing, contract or legal matter; it is an existing client asking about their own project or account; they are upset; it is personal or not about the business; or you are not sure what they mean after one question.\n' +
    'Answer ONLY with JSON on one line: {"reply": "<message to send, or empty>", "handoff": true|false, "reason": "<short reason when handing off>"}' + inboxPriceBook(cat) +
    (direction ? '\n\nTY (THE OWNER) HAS TOLD YOU WHAT TO SAY IN THIS REPLY. Follow his direction exactly, in the same plain style; do not hand off: ' + String(direction).slice(0, 800) : '');
  const messages = history.map((h) => ({ role: h.role, content: h.content }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  let raw = '';
  if (env.ANTHROPIC_API_KEY) {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: env.STUDIO_SITE_CHAT_MODEL || 'claude-haiku-5-5', max_tokens: 600, system, messages }), signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('model ' + r.status);
    const d = await r.json();
    raw = (d.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
  } else if (env.OPENAI_API_KEY) {
    const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: 'Bearer ' + env.OPENAI_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: env.STUDIO_CHAT_MODEL || 'gpt-5.4-mini', instructions: system, input: messages }), signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error('model ' + r.status);
    const out = await r.json();
    raw = (out.output || []).flatMap((x) => x.content || []).filter((x) => x.type === 'output_text').map((x) => x.text).join('');
  } else return { reply: '', handoff: true, reason: 'AI not connected' };
  return inboxParse(raw, channel);
}
function inboxParse(raw, channel) {
  const txt = String(raw || '').replace(/```(?:json)?/gi, '').trim();
  const m = txt.match(/\{[\s\S]*\}/);
  let o = null;
  try { o = m ? JSON.parse(m[0]) : null; } catch {}
  if (!o && m) {
    // Models sometimes put real line breaks inside the JSON string: pull the fields out directly.
    const rf = m[0].match(/"reply"\s*:\s*"([\s\S]*?)"\s*,\s*"handoff"/), hf = m[0].match(/"handoff"\s*:\s*(true|false)/), why = m[0].match(/"reason"\s*:\s*"([^"]*)"/);
    if (rf || hf) o = { reply: rf ? rf[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '', handoff: hf ? hf[1] === 'true' : false, reason: why ? why[1] : '' };
  }
  if (!o && txt && !/[{}]/.test(txt)) o = { reply: txt, handoff: false };
  if (!o) return { reply: '', handoff: true, reason: 'Command could not write a safe reply' };
  let reply = String(o.reply || '').replace(/\*\*|__|^#+\s*/gm, '').trim();
  if (channel === 'sms' && reply.length > 480) reply = reply.slice(0, 477).replace(/\s+\S*$/, '') + '…';
  return { reply: o.handoff ? '' : reply, handoff: !!o.handoff || !reply, reason: String(o.reason || '').slice(0, 200) };
}

async function inboxRemember(env, row, sent) {
  if (!row || !sent?.message_id) return;
  await update(env, 'team_actions', 'id=eq.' + row.id, { params: { ...(row.params || {}), tg_msg: sent.message_id } }).catch(() => {});
}
// Ty replies (Telegram "reply") to a draft or hand-off card: "send: exact words" sends as is;
// anything else is his direction, and Command rewrites the reply and asks again.
async function inboxTelegramReply(env, m) {
  const rid = m?.reply_to_message?.message_id, text = String(m?.text || '').trim();
  if (!rid || !text) return { handled: false };
  const [a] = await select(env, 'team_actions', 'type=in.(ghl_reply,ghl_followup)&status=eq.pending&params->>tg_msg=eq.' + rid + '&limit=1').catch(() => []);
  if (!a) return { handled: false };
  const p = a.params || {}, name = p.contact_name || 'them', label = INBOX_CHANNELS[p.channel]?.label || 'chat', chat = m.chat.id;
  const exact = text.match(/^(send|exact(?:ly)?)\s*[:\-]\s*([\s\S]+)$/i);
  if (exact) {
    await approveAction(env, a.id, { message: exact[2].trim().slice(0, 1600), handoff: false });
    await tg(env, 'sendMessage', { chat_id: chat, text: '\u2705 Sent to ' + name + ' on ' + label + ', word for word.' }).catch(() => {});
    return { handled: true, sent: true };
  }
  let history = [];
  try { history = (await inboxHistory(env, p.contact_id)).messages.slice(-12).map((x) => ({ role: x.direction === 'inbound' ? 'user' : 'assistant', content: inboxTxt(x.body, 800) })).filter((x) => x.content); } catch {}
  if (!history.length || history[history.length - 1].role !== 'user') history.push({ role: 'user', content: p.inbound || '' });
  const draft = await inboxWrite(env, p.channel || 'sms', { firstName: String(p.contact_name || '').split(' ')[0] }, history, text).catch(() => ({ reply: '' }));
  if (!draft.reply) {
    await tg(env, 'sendMessage', { chat_id: chat, text: 'I couldn\'t write that one. Reply to the card with "send: your exact words" and I\'ll send it as is.' }).catch(() => {});
    return { handled: true };
  }
  const params = { ...p, message: draft.reply, handoff: false, direction: text.slice(0, 500) };
  const title = ('Reply to ' + name + ' on ' + label).slice(0, 200);
  await update(env, 'team_actions', 'id=eq.' + a.id + '&status=eq.pending', { params, title, reason: ('Rewritten with your note: "' + text.slice(0, 200) + '". They wrote: "' + String(p.inbound || '').slice(0, 250) + '"').slice(0, 500) });
  const sent = await askTy(env, { ...a, title, params, reason: 'Rewritten with your note: "' + text.slice(0, 200) + '"' }, { urgent: true }).catch(() => null);
  await inboxRemember(env, { ...a, params }, sent);
  return { handled: true, redrafted: true };
}

// ── v29: follow-ups until they book, and Google review requests ──────────────────────────
// Website leads (Studio AI) and message conversations get gentle check-ins written by Command:
// SMS and email on day 1, 3 and 7; Instagram/Facebook one nudge inside Meta's 24-hour window.
// Everything stops the moment they reply, book, opt out or get tagged needs-ty / no-followup.
const INBOX_FOLLOW_DAYS = [1, 3, 7];
function inboxBrisbaneHour(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', hour: 'numeric', hourCycle: 'h23', weekday: 'short' }).formatToParts(d).map((x) => [x.type, x.value]));
  return { hour: Number(p.hour), day: p.weekday };
}
async function inboxBooked(env, contactId) {
  try {
    const ap = await req(env, 'GET', '/contacts/' + contactId + '/appointments', null, '2021-04-15');
    return (ap?.events || ap?.appointments || []).some((x) => !/cancel|invalid/i.test(String(x.appointmentStatus || x.status || '')) && Date.parse(x.startTime || x.dateAdded || 0) > Date.now() - 30 * 864e5);
  } catch { return false; }
}
async function inboxFollowups(env, now = new Date()) {
  if (!enabled(env)) return { skipped: 'ghl' };
  const settings = await getSettings(env).catch(() => ({}));
  const cfg = inboxSettings(settings);
  if (cfg.followup === 'off') return { skipped: 'off' };
  const t = inboxBrisbaneHour(now);
  if (t.day === 'Sun' || t.hour < 9 || t.hour >= 18) return { skipped: 'outside 9am-6pm Mon-Sat' };
  const since = new Date(now.getTime() - 9 * 864e5).toISOString();
  const seeds = await select(env, 'team_actions', 'type=in.(ghl_reply,lead_seed)&created_at=gte.' + encodeURIComponent(since) + '&select=id,type,status,params,created_at&order=created_at.desc&limit=200').catch(() => []);
  const sent = await select(env, 'team_actions', 'type=eq.ghl_followup&created_at=gte.' + encodeURIComponent(since) + '&select=id,status,params,created_at&limit=300').catch(() => []);
  const byContact = new Map();
  for (const r of seeds) {
    const c = r.params?.contact_id; if (!c || byContact.has(c)) continue;
    if (r.type === 'ghl_reply' && (r.status !== 'done' || r.params?.handoff)) continue;
    byContact.set(c, r);
  }
  let made = 0;
  for (const [contactId, seed] of byContact) {
    if (made >= 6) break;
    const p = seed.params || {};
    const channel = seed.type === 'lead_seed' ? (p.phone && cfg.sms_live && cfg.sms !== 'off' ? 'sms' : p.email ? 'email' : null) : p.channel;
    if (!channel || !['sms', 'ig', 'fb', 'email'].includes(channel)) continue;
    let contact = {};
    try { contact = (await getContact(env, contactId))?.contact || {}; } catch { continue; }
    const tags = (contact.tags || []).map((x) => String(x).toLowerCase());
    if (contact.dnd || tags.some((x) => /needs-ty|no-followup|do-not-contact|hold/.test(x))) continue;
    // Where the conversation stands now
    let msgs = [];
    try { msgs = (await inboxHistory(env, contactId)).messages; } catch {}
    const lastIn = [...msgs].reverse().find((m) => m.direction === 'inbound');
    const lastAny = msgs[msgs.length - 1];
    if (lastAny && lastAny.direction === 'inbound' && seed.type !== 'lead_seed') continue; // they spoke last: the reply flow handles it
    if (seed.type === 'lead_seed' && lastIn && Date.parse(lastIn.dateAdded || 0) > Date.parse(seed.created_at)) continue; // they've been in touch since: Ty or the reply flow has it
    const startAt = Math.max(Date.parse(lastIn?.dateAdded || 0) || 0, Date.parse(seed.created_at));
    const done = sent.filter((x) => x.params?.contact_id === contactId && x.params?.kind === 'followup' && Date.parse(x.created_at) >= startAt);
    if (sent.some((x) => x.params?.contact_id === contactId && x.status === 'pending')) continue; // one waiting already
    const step = done.length;
    const ageH = (now.getTime() - startAt) / 36e5;
    if (channel === 'ig' || channel === 'fb') { if (step >= 1 || ageH < 18 || ageH > 23) continue; }
    else if (step >= INBOX_FOLLOW_DAYS.length || ageH < INBOX_FOLLOW_DAYS[step] * 24 - 4) continue;
    if (await inboxBooked(env, contactId)) continue;
    const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || p.contact_name || 'them';
    const last = step === (channel === 'ig' || channel === 'fb' ? 0 : INBOX_FOLLOW_DAYS.length - 1);
    const history = msgs.slice(-12).map((m) => ({ role: m.direction === 'inbound' ? 'user' : 'assistant', content: inboxTxt(m.body, 800) })).filter((m) => m.content);
    if (!history.length || history[0].role !== 'user') history.unshift({ role: 'user', content: p.inbound || p.message_from_lead || ('(They enquired on the website about: ' + (p.interest || 'working with us') + ')') });
    history.push({ role: 'user', content: '(No reply from them since your last message.)' });
    const direction = 'Write follow-up ' + (step + 1) + (last ? ' (the last one)' : '') + ' to someone who went quiet. Gentle, human, zero pressure. Pick up exactly where the conversation left off and reference what they told us. Give them one small, easy reason to reply (a quick question or a simple yes/no). ' + (last ? 'This is the last check-in: kindly say you will leave it with them and the door is open, and include the booking link on its own line.' : 'Do not repeat the booking link if they already have it unless they seemed keen.') + (channel === 'email' ? ' This is an EMAIL: start with "Hi ' + (contact.firstName || 'there') + '," and put a subject line first on its own line starting "Subject: ".' : '');
    const draft = await inboxWrite(env, channel, contact, history, direction).catch(() => ({ reply: '' }));
    if (!draft.reply) continue;
    let subject = '', message = draft.reply;
    if (channel === 'email') { const m = message.match(/^\s*Subject:\s*(.+)\n+/i); subject = m ? m[1].trim().slice(0, 120) : 'Following up from Studio Flow & Systems'; message = m ? message.slice(m[0].length) : message; }
    const label = INBOX_CHANNELS[channel].label;
    const [row] = await insert(env, 'team_actions', [{ department: 'head_of_sales', type: 'ghl_followup', title: ('Follow-up ' + (step + 1) + ' to ' + name + ' on ' + label).slice(0, 200), reason: ('No reply since ' + new Date(startAt).toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short' }) + '. ' + (p.inbound ? 'They first wrote: "' + String(p.inbound).slice(0, 200) + '"' : '')).slice(0, 500), params: { kind: 'followup', step: step + 1, contact_id: contactId, contact_name: name, channel, send_type: INBOX_CHANNELS[channel].send, subject, message }, status: 'pending' }]).catch(() => []);
    if (!row) continue;
    made++;
    if (cfg.followup === 'auto') { await update(env, 'team_actions', 'id=eq.' + row.id, { auto: true }).catch(() => {}); await approveAction(env, row.id).catch((e) => console.error('follow-up send:', String(e.message).slice(0, 150))); }
    else await inboxRemember(env, row, await askTy(env, row, { settings }).catch(() => null));
  }
  return { made };
}
async function inboxReview(env, contactId, settings) {
  const cfg = inboxSettings(settings);
  if (cfg.reviews === 'off') return { skipped: 'reviews off' };
  if (!cfg.review_link) return { skipped: 'no review link set (Command > Autopilot > Message replies)' };
  const prior = await select(env, 'team_actions', 'type=eq.ghl_followup&params->>kind=eq.review&params->>contact_id=eq.' + encodeURIComponent(contactId) + '&select=id&limit=1').catch(() => []);
  if (prior.length) return { skipped: 'already asked for a review' };
  let contact = {};
  try { contact = (await getContact(env, contactId))?.contact || {}; } catch {}
  if (contact.dnd) return { skipped: 'do not disturb' };
  const channel = contact.phone && cfg.sms_live && cfg.sms !== 'off' ? 'sms' : contact.email ? 'email' : null;
  if (!channel) return { skipped: 'no phone or email' };
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'them';
  const direction = 'Write a short, warm thank-you to ' + (contact.firstName || 'a client') + ' for working with Studio Flow & Systems, and ask if they would leave a quick Google review. Make it easy and personal, no pressure, and say it really helps a small Brisbane studio. Put this link on its own line: ' + cfg.review_link + (channel === 'email' ? ' This is an EMAIL: start with "Hi ' + (contact.firstName || 'there') + '," and put a subject line first on its own line starting "Subject: ". Sign off "Ty".' : ' Sign off "Ty".');
  const draft = await inboxWrite(env, channel, contact, [{ role: 'user', content: '(They have just finished working with us.)' }], direction).catch(() => ({ reply: '' }));
  if (!draft.reply) return { error: 'could not write the review request' };
  let subject = '', message = draft.reply;
  if (channel === 'email') { const m = message.match(/^\s*Subject:\s*(.+)\n+/i); subject = m ? m[1].trim().slice(0, 120) : 'Thank you, and a small favour'; message = m ? message.slice(m[0].length) : message; }
  if (!message.includes(cfg.review_link)) message += '\n\n' + cfg.review_link;
  const [row] = await insert(env, 'team_actions', [{ department: 'head_of_sales', type: 'ghl_followup', title: ('Review request to ' + name).slice(0, 200), reason: 'Job or call marked done in GHL.', params: { kind: 'review', contact_id: contactId, contact_name: name, channel, send_type: INBOX_CHANNELS[channel].send, subject, message }, status: 'pending' }]);
  if (!row) return { error: 'could not save' };
  if (cfg.reviews === 'auto') { await update(env, 'team_actions', 'id=eq.' + row.id, { auto: true }).catch(() => {}); await approveAction(env, row.id); return { sent: true, review: true }; }
  await inboxRemember(env, row, await askTy(env, row, { settings }).catch(() => null));
  return { queued: true, review: true };
}
