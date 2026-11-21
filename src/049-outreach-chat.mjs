// v148 Outreach chat: Ty and Command work outreach together in one chat, the way Ty works with Claude.
// Command finds people, writes each message (DM Writer + DM Reviewer + the playbook checks), and shows every one as a card.
// Nothing is sent until Ty taps Send on that card (or says "send it" in the chat). Then Command Chrome on Ty's Mac types
// exactly the approved words, one at a time, with human pacing, and the chat shows each one land. Google Business review
// replies and other browser jobs work the same way: every post or send stops as a card in the chat for Ty's OK.
var OC_KEY = "outreach_chat";
async function ocLoad(env) { return (await select(env, "team_settings", "key=eq." + OC_KEY + "&select=value&limit=1").catch(() => []))?.[0]?.value || { messages: [] }; }
async function ocSave(env, s) { s.messages = (s.messages || []).slice(-80); await saveSetting(env, OC_KEY, s); return s; }
function ocCard(x) {
  return { id: x.id, name: x.person_name || x.business_name, business: x.business_name, channel: x.channel, channel_name: (DM_CHANNELS[x.channel] || {}).name || x.channel, step: x.step,
    profile_url: x.profile_url, message: x.message, hook: x.hook || "", why: x.why || "", score: x.review ? x.review.score : null, approved: !!x.oc_approved, status: x.status, send_error: x.send_error || null, sent_at: x.sent_at || null };
}
async function ocBrowser(env) {
  const c = await linkGet(env, "mac_link").catch(() => null), t = await browserGet(env).catch(() => null);
  const out = { online: linkOnline(c), agent: c?.agent || 0, linked: !!c?.token_hash, task: null };
  if (t) {
    out.task = { id: t.id, kind: t.kind || "task", goal: String(t.goal || "").slice(0, 200), status: t.status, live: browserLive(t), ask: t.status === "needs_ty" ? t.ask : null, result: t.result || null,
      steps: (t.steps || []).slice(-8).map((s) => s.desc + (s.result ? " (" + s.result + ")" : "")), updated_at: t.updated_at };
    if (t.pending && t.pending.action_id) {
      const [a] = await select(env, "team_actions", "id=eq." + t.pending.action_id + "&select=id,status,params&limit=1").catch(() => []);
      if (a && a.status === "pending") out.task.pending = { action_id: a.id, summary: t.pending.summary, details: a.params?.details || "", page: a.params?.page_url || "" };
    }
    if (t.kind === "autopilot" && t.ap) out.task.progress = { sent: t.ap.sent || 0, held: t.ap.held || 0, failed: t.ap.failed || 0, of: (t.ap.queue || []).length };
  }
  const [rp] = await select(env, "team_actions", "type=eq.dm_reply&status=eq.pending&order=created_at.desc&limit=1&select=id,title,params,created_at").catch(() => []);
  if (rp) out.reply_check = { action_id: rp.id, title: rp.title, details: rp.params?.details || rp.params?.message || "" };
  return out;
}
// Approved cards go out as soon as Command Chrome is free.
async function ocKick(env) {
  const b = await browserGet(env).catch(() => null);
  if (browserLive(b)) return { started: false, why: "busy" };
  const q = await dmLoad(env), ids = q.items.filter((x) => x.status === "ready" && x.oc_approved).map((x) => x.id);
  if (!ids.length) return { started: false, why: "none" };
  const r = await dmRoute("/dm-queue/send-batch", "POST", { ids }, env).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message }));
  if (r.ok) { const q2 = await dmLoad(env); for (const x of q2.items) if (ids.includes(x.id)) delete x.oc_approved; await dmSave(env, q2); }
  return { started: !!r.ok, count: r.count || 0, error: r.ok ? null : r.error };
}
async function ocState(env) {
  const s = await ocLoad(env), q = await dmLoad(env);
  const since = Date.now() - 12 * 36e5;
  return {
    ok: true, messages: s.messages || [],
    cards: q.items.filter((x) => x.status === "ready" && !DM_CHANNELS[x.channel]?.manual).sort((a, b) => (b.oc_approved ? 1 : 0) - (a.oc_approved ? 1 : 0) || (b.review?.score || 0) - (a.review?.score || 0)).slice(0, 12).map(ocCard),
    sending: q.items.filter((x) => x.status === "sending").map(ocCard),
    sent: q.items.filter((x) => x.status === "sent" && x.sent_at && Date.parse(x.sent_at) > since).sort((a, b) => Date.parse(b.sent_at) - Date.parse(a.sent_at)).slice(0, 12).map(ocCard),
    today: dmToday(q.items), limits: q.cfg.daily, browser: await ocBrowser(env)
  };
}
async function ocRedraft(env, id, instruction) {
  const q = await dmLoad(env), x = q.items.find((k) => k.id === id && k.status === "ready");
  if (!x) return { ok: false, error: "That message isn't waiting any more." };
  const u = wsdUsage();
  const out = await wsdAsk(env, u, "smart", { max_tokens: 900, system: "You are the DM Writer in Studio Flow & Systems' marketing team. Rewrite ONE message the way Ty asks, keeping every playbook rule.\n\n" + dmPlaybook(),
    messages: [{ role: "user", content: "Business: " + x.business_name + "\nChannel: " + ((DM_CHANNELS[x.channel] || {}).name || x.channel) + " (" + x.step + ")\nThe real thing we saw: " + (x.hook || "") + "\nWhy them: " + (x.why || "") + "\n\nCurrent message:\n" + x.message + "\n\nTy says: " + String(instruction || "make it better").slice(0, 400) + "\n\nCall save_dm with the new message (found true, same hook)." }],
    tools: [DM_SAVE_TOOL] }, "save_dm");
  await wsdLog(env, u, "outreach_chat").catch(() => {});
  const msg = dmClean(String(out.message || ""));
  const bad = dmCheck({ ...x, message: msg, hook: out.hook || x.hook }, q.items);
  if (bad) return { ok: false, error: "The rewrite broke a rule (" + bad + "), so I kept the original.", message: x.message };
  x.message = msg; if (out.hook) x.hook = String(out.hook).slice(0, 160); x.updated_at = new Date().toISOString(); x.oc_edited = true;
  await dmSave(env, q);
  return { ok: true, card: ocCard(x) };
}
var OC_TOOLS = [
  { name: "outreach_status", description: "What's ready to approve, what's sending, what was sent today, today's limits per channel, and whether Ty's Mac (Command Chrome) is online and busy.", input_schema: { type: "object", properties: {} } },
  { name: "find_and_write", description: "Find businesses or owners and write one personal first message each, checked by the DM Reviewer. They appear in the chat as cards for Ty to approve. Takes 20 to 40 seconds per message, so ask for 3 to 5 at a time.", input_schema: { type: "object", properties: {
    count: { type: "integer", description: "1 to 5" }, niche: { type: "string", description: "Who, e.g. 'physio clinics', 'hair salons', 'naturopaths'. Empty for the usual mix." },
    area: { type: "string", description: "Suburb, city or region, e.g. 'Sunshine Coast'." }, platform: { type: "string", enum: ["any", "instagram", "facebook", "linkedin"], description: "linkedin finds owners on LinkedIn and writes connection notes." } }, required: ["count"] } },
  { name: "rewrite_message", description: "Rewrite one waiting card the way Ty asked (shorter, warmer, mention X, less salesy...). Keeps every DM rule.", input_schema: { type: "object", properties: { id: { type: "string" }, instruction: { type: "string" } }, required: ["id", "instruction"] } },
  { name: "send_messages", description: "Send cards Ty has clearly said to send in this chat (e.g. 'send them', 'yes send Jess'). Only ids Ty approved. Command Chrome sends them one at a time with human pacing.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" } } }, required: ["ids"] } },
  { name: "skip_message", description: "Bin a waiting card Ty doesn't want (or that's wrong).", input_schema: { type: "object", properties: { id: { type: "string" }, reason: { type: "string" } }, required: ["id"] } },
  { name: "browser_job", description: "Do any other job in Command Chrome on Ty's Mac, for example replying to new Google Business Profile reviews, checking LinkedIn invites, or messaging a specific person. Every send, post or reply stops as a card in this chat for Ty's OK first. Write the goal in full, including the exact steps.", input_schema: { type: "object", properties: { goal: { type: "string" }, start_url: { type: "string" } }, required: ["goal"] } },
  { name: "stop_browser", description: "Stop whatever Command Chrome is doing.", input_schema: { type: "object", properties: {} } }
];
async function ocTool(env, name, a) {
  if (name === "outreach_status") { const s = await ocState(env); return { ready: s.cards.map((c) => ({ id: c.id, name: c.name, business: c.business, channel: c.channel_name, approved: c.approved, message: c.message })), sending: s.sending.length, sent_last_12h: s.sent.map((c) => c.name + " (" + c.channel_name + ")"), sent_today: s.today, daily_limits: s.limits, mac: s.browser }; }
  if (name === "find_and_write") {
    const n = Math.max(1, Math.min(5, +a.count || 3));
    const r = a.platform === "linkedin" ? await liFill(env, { count: n, manual: true }) : await dmFill(env, { count: n, manual: true, niche: String(a.niche || "").slice(0, 80), area: String(a.area || "").slice(0, 80) });
    return { written: r.written || 0, skipped: (r.skipped || []).slice(0, 6), note: r.note || null };
  }
  if (name === "rewrite_message") return ocRedraft(env, String(a.id || ""), a.instruction);
  if (name === "send_messages") {
    const q = await dmLoad(env), ids = (Array.isArray(a.ids) ? a.ids : []).map(String);
    let n = 0; for (const x of q.items) if (ids.includes(x.id) && x.status === "ready") { x.oc_approved = true; n++; }
    await dmSave(env, q);
    await audit(env, { actor: "Ty", action: "outreach_chat_send", target_type: "dm_queue", target_id: "chat", summary: "Approved in Outreach chat: " + n + " message(s)" }).catch(() => {});
    return { approved: n, ...(await ocKick(env)) };
  }
  if (name === "skip_message") { const r = await dmRoute("/dm-queue/mark", "POST", { id: String(a.id || ""), status: "skipped", note: a.reason }, env).then((x) => x.json()).catch((e) => ({ ok: false, error: e.message })); return r; }
  if (name === "browser_job") return browserStart(env, { goal: String(a.goal || "") + "\n(From Ty's Outreach chat. Every send, post, reply or save needs Ty's approval: set needs_approval with an approval_summary that includes the exact words.)", start_url: a.start_url });
  if (name === "stop_browser") return browserStatus(env, { stop: true });
  return { error: "Unknown tool" };
}
function ocSystem(s) {
  return "You are Studio AI Command's outreach partner, working WITH Ty in a chat inside Command, like a sharp sales assistant sitting next to him. "
    + "You find the right people, write one personal message each, and Command Chrome on Ty's Mac sends them in his real accounts (Instagram, Facebook, LinkedIn) and does other browser jobs like replying to Google Business reviews.\n\n"
    + "HOW IT WORKS\n- Messages you write show up under your reply as cards with Send, Edit and Skip. Ty approves each one. Never say anything was sent unless the status shows it.\n"
    + "- Only use send_messages for cards Ty has clearly told you to send in this chat. 'Looks good' about one card means that card only.\n"
    + "- If Ty wants a change to a card, use rewrite_message. If he doesn't like one, skip_message.\n"
    + "- Ask for 3 to 5 messages at a time with find_and_write. Say roughly how long it takes.\n"
    + "- For Google Business reviews or anything else in the browser, use browser_job with a clear goal. Posts and sends stop as cards for Ty first.\n"
    + "- If the Mac is offline or Command Link isn't set up, say so plainly and what to do (wake the Mac; Settings, Brand & features, Command Link).\n"
    + "- Respect the daily limits per channel. Never DM existing clients. No prices in cold messages.\n\n"
    + "YOUR STYLE: short, warm, direct Australian English, like a text from a teammate. One to four sentences, then the cards do the talking. No dashes, no 'haha', no lists unless Ty asks. Don't repeat card contents back.\n\n"
    + "RIGHT NOW: " + JSON.stringify({ cards_waiting: s.cards.length, approved_waiting: s.cards.filter((c) => c.approved).length, sending: s.sending.length, sent_last_12h: s.sent.length, today: s.today, limits: s.limits, mac_online: s.browser.online, command_link: s.browser.linked, browser: s.browser.task ? { status: s.browser.task.status, goal: s.browser.task.goal } : null });
}
async function ocChat(env, text) {
  const s = await ocLoad(env);
  s.messages.push({ id: memHex(memRand(5)), role: "ty", text: String(text).slice(0, 2000), at: new Date().toISOString() });
  await ocSave(env, s);
  const st = await ocState(env);
  const convo = s.messages.slice(-16).map((m) => ({ role: m.role === "ty" ? "user" : "assistant", content: m.text })).filter((m, i, a) => !(i === 0 && m.role === "assistant"));
  const merged = []; for (const m of convo) { const last = merged[merged.length - 1]; if (last && last.role === m.role) last.content += "\n\n" + m.content; else merged.push({ ...m }); }
  const u = wsdUsage(), model = WSD_SMART(env);
  let reply = "", used = [];
  const msgs = merged;
  for (let i = 0; i < 6; i++) {
    const data = await callClaude(env, { model, max_tokens: 900, system: ocSystem(st), tools: OC_TOOLS, messages: msgs });
    addUsage(u.smart, data.usage);
    const calls = (data.content || []).filter((b) => b.type === "tool_use");
    const words = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    if (!calls.length) { reply = words; break; }
    msgs.push({ role: "assistant", content: data.content });
    const results = [];
    for (const c of calls) { let r; try { r = await ocTool(env, c.name, c.input || {}); } catch (e) { r = { error: String(e.message || e).slice(0, 300) }; } used.push(c.name); results.push({ type: "tool_result", tool_use_id: c.id, content: JSON.stringify(r).slice(0, 6000) }); }
    msgs.push({ role: "user", content: results });
    if (i === 5) reply = words || "Done. Have a look at the cards below.";
  }
  await wsdLog(env, u, "outreach_chat").catch(() => {});
  const s2 = await ocLoad(env);
  s2.messages.push({ id: memHex(memRand(5)), role: "ai", text: String(reply || "Done.").replace(/\s[–—]\s/g, ", ").slice(0, 3000), at: new Date().toISOString(), tools: used.slice(0, 8) });
  await ocSave(env, s2);
  return ocState(env);
}
async function ocRoute(p, m, body, env) {
  const J = (o, s = 200) => json(o, s);
  try {
    if (p === "/outreach-chat" && m === "GET") { await ocKick(env).catch(() => {}); return J(await ocState(env)); }
    if (p === "/outreach-chat" && m === "POST") { const t = String(body.message || "").trim(); if (!t) return J({ ok: false, error: "Say something first." }, 400); return J(await ocChat(env, t)); }
    if (p === "/outreach-chat/card" && m === "POST") {
      const id = String(body.id || ""), act = String(body.action || "");
      if (act === "send") { const r = await ocTool(env, "send_messages", { ids: [id] }); if (!r.approved) return J({ ok: false, error: "That message isn't waiting any more." }, 400); return J({ ...(await ocState(env)), kicked: r }); }
      if (act === "unsend") { const q = await dmLoad(env), x = q.items.find((k) => k.id === id && k.status === "ready"); if (x) { delete x.oc_approved; await dmSave(env, q); } return J(await ocState(env)); }
      if (act === "skip") { await ocTool(env, "skip_message", { id, reason: body.reason || "Skipped in Outreach chat" }); return J(await ocState(env)); }
      if (act === "edit") {
        const q = await dmLoad(env), x = q.items.find((k) => k.id === id && k.status === "ready");
        if (!x) return J({ ok: false, error: "That message isn't waiting any more." }, 400);
        const msg = dmClean(String(body.message || "")), bad = dmCheck({ ...x, message: msg }, q.items);
        if (bad) return J({ ok: false, error: bad }, 400);
        x.message = msg; x.updated_at = new Date().toISOString(); x.oc_edited = true; await dmSave(env, q);
        return J(await ocState(env));
      }
      if (act === "rewrite") { const r = await ocRedraft(env, id, body.instruction); if (!r.ok) return J(r, 400); return J(await ocState(env)); }
      return J({ ok: false, error: "Unknown action." }, 400);
    }
    if (p === "/outreach-chat/clear" && m === "POST") { await ocSave(env, { messages: [] }); return J(await ocState(env)); }
  } catch (e) { return J({ ok: false, error: String(e.message || e).slice(0, 300) }, 400); }
  return null;
}
