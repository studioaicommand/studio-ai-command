// v148 Outreach chat: chat with Command, every message is a card Ty approves, Command Chrome sends only approved ones.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
let seq = 0;
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }], team_actions: [], team_audit: [], team_usage: [], team_memory: [], sec_settings: [],
  agent_prospects: [
    { id: "p1", business_name: "Peak Mindset Coaching", instagram: "https://www.instagram.com/peakmindset.coach", location: "Brisbane", vertical: "coaching", niche: "coaching", leak: "Bio says DM to book a call, no booking link", evidence: "Instagram bio", status: "to_send", score: 8, leak_report: {} },
    { id: "p2", business_name: "Smile Bright Dental", website: "https://smilebright.test", location: "Gold Coast", vertical: "dental", niche: "dental", leak: "No online booking, phone only and closed weekends", status: "to_send", score: 7, leak_report: {} },
    { id: "p3", business_name: "Spine Align Chiro", location: "Sydney", vertical: "allied", niche: "allied", leak: "Contact form only", status: "to_send", score: 6, leak_report: {} }] };
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|in|is)\.(.*)$/); if (!m) return true; if (m[1] === "eq") return String(r[k] ?? "") === m[2]; if (m[1] === "is") return m[2] === "true" ? r[k] === true : r[k] == null; return m[2].replace(/[()]/g, "").split(",").includes(String(r[k])); });
const tg = []; let writer = []; let reviewer = { score: 9 }; let hunt = { businesses: [] };
const toolUse = (name, input) => Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name, input }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 10 } });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { let rows = t.filter((r) => match(r, q)); const lim = +(q.match(/limit=(\d+)/) || [])[1]; return Response.json(lim ? rows.slice(0, lim) : rows); }
    if (m === "POST") { const rows = [].concat(body).map((r) => { if (r.key) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; return t[i]; } } const n = { id: "id" + (++seq), created_at: new Date().toISOString(), ...r }; t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { const sys = JSON.stringify(body.system || "");
    if (sys.includes("LinkedIn network")) return toolUse("save_people", globalThis.__people || { people: [] });
    if (sys.includes("You are the Social Prospect Finder")) return toolUse("save_businesses", hunt);
    if (sys.includes("You are the DM Reviewer")) return toolUse("review_dm", reviewer);
    if (sys.includes("You are the Reply Coach")) return toolUse("save_reply", { reply: "Ha, fair question! It's a quick fix. Want me to send the 2-minute video?", intent: "interested", next_step: "Send the video, then offer a 15-minute call" });
    if (sys.includes("outreach partner")) { globalThis.__ocSys = sys; const step = (globalThis.__oc || []).shift(); if (step && step.tool) return toolUse(step.tool, step.input || {}); return Response.json({ content: [{ type: "text", text: (step && step.text) || "Done." }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
    if (sys.includes("You are the DM Writer")) { const x = writer.shift() || { found: false, why_not: "nothing specific" }; return toolUse("save_dm", x); }
    return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tg.push(body); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1", PUBLIC_ORIGIN: O };
const call = (path, b) => w.fetch(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) }));


const good1 = { found: true, channel: "instagram", profile_url: "https://www.instagram.com/peakmindset.coach", person_name: "Jess", hook: "bio says DM to book a call", message: "Hey Jess, saw your bio says DM to book a call but there's no booking link, so every booking waits on you replying. I'm Ty from Studio Flow & Systems, I help coaches let people book themselves. Worth a quick chat? No worries if not.", why: "Coach, books by DM only" };
const good2 = { found: true, channel: "facebook", profile_url: "https://www.facebook.com/smilebrightdental", hook: "no online booking, phone only, closed weekends", message: "Hi there, quick one. New patients can only book Smile Bright by phone and you're closed weekends, so Saturday searchers go elsewhere. I'm Ty from Studio Flow & Systems and I set up online booking for clinics. Happy to show you how? No worries if not.", why: "Dental, phone only" };
writer = [good1, good2];
globalThis.__oc = [{ tool: "find_and_write", input: { count: 2, niche: "", area: "Brisbane" } }, { text: "Two ready for you below. Have a read and tap Send on the ones you like." }];
let r = await call("/outreach-chat", { message: "Find me 2 businesses in Brisbane to message" });
assert(r.j.ok && r.j.cards.length === 2 && r.j.messages.length === 2 && r.j.messages[1].role === "ai" && /Send/.test(r.j.messages[1].text), "Ty asks in the chat; Command finds and writes 2 messages, shown as cards under its reply");
assert(r.j.cards.every((c) => c.message && c.profile_url && c.score >= 8 && !c.approved), "Every card has the message, their profile and the reviewer's score, and nothing is approved yet");
assert(/outreach partner/.test(globalThis.__ocSys) && /Only use send_messages for cards Ty has clearly told you to send/.test(globalThis.__ocSys), "The chat AI is told it can only send what Ty approves");
const jess = r.j.cards.find((c) => c.business === "Peak Mindset Coaching"), smile = r.j.cards.find((c) => c.business === "Smile Bright Dental");

r = await call("/outreach-chat/card", { id: jess.id, action: "edit", message: "Hey Jess, saw your bio says DM to book a call — here's a thought" });
assert(r.s === 400 && /dashes|short|Ty|out/i.test(r.j.error), "Ty's edits still go through the DM rules (here: " + r.j.error + ")");
r = await call("/outreach-chat/card", { id: jess.id, action: "edit", message: good1.message.replace("Worth a quick chat?", "Keen for a quick chat?") });
assert(r.j.ok && r.j.cards.find((c) => c.id === jess.id).message.includes("Keen for a quick chat?"), "Ty can edit a card in place");

r = await call("/outreach-chat/card", { id: jess.id, action: "send" });
const jc = r.j.cards.find((c) => c.id === jess.id);
assert(r.j.ok && jc && jc.approved && r.j.kicked && r.j.kicked.started === false, "Send approves just that card; with no Mac linked it waits instead of sending");
assert(!r.j.cards.find((c) => c.id === smile.id).approved, "The other card is untouched");
assert(DB.team_audit.some((a) => a.action === "outreach_chat_send"), "Each approval is written to the audit trail");

// Mac comes online with Command Link 4: the approved card goes out, the other stays
DB.team_settings.push({ key: "mac_link", value: { token_hash: "h", last_seen: new Date().toISOString(), agent: 4 } });
r = await call("/outreach-chat");
const q = DB.team_settings.find((x) => x.key === "dm_queue").value.items;
const bt = (DB.team_settings.find((x) => x.key === "browser_task") || {}).value;
assert(bt && bt.kind === "autopilot" && bt.ap.queue.length === 1 && bt.ap.queue[0].id === jess.id, "When the Mac is free, Command Chrome starts sending only the approved card");
assert(q.find((x) => x.id === jess.id).status === "sending" && q.find((x) => x.id === smile.id).status === "ready", "Jess shows as sending; Smile Bright still waits for Ty");
assert(r.j.browser.online && r.j.browser.task && r.j.browser.task.kind === "autopilot", "The chat shows Command Chrome's status beside the conversation");

globalThis.__oc = [{ tool: "skip_message", input: { id: smile.id, reason: "Not a fit" } }, { text: "Binned that one." }];
r = await call("/outreach-chat", { message: "skip the dentist" });
assert(!r.j.cards.find((c) => c.id === smile.id) && q.length >= 2, "Ty can skip a card by just saying so");

globalThis.__oc = [{ tool: "browser_job", input: { goal: "Reply to new Google Business Profile reviews for Studio Flow & Systems", start_url: "https://business.google.com/" } }, { text: "On it." }];
r = await call("/outreach-chat", { message: "reply to my new google reviews" });
const bt2 = (DB.team_settings.find((x) => x.key === "browser_task") || {}).value;
assert(r.j.ok && bt2.kind === "autopilot" && bt2.id === bt.id, "Browser jobs share the one Command Chrome: a Google reviews job waits while messages are sending");

const js = await (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} })).text();
assert(js.includes("VIEWS.copilot") && js.includes('["copilot", "Outreach chat"]') && js.includes("READY FOR YOUR OK"), "Sales has an Outreach chat screen with approval cards");
assert(/social_outreach: \['dms', 'copilot'\]/.test(js), "Client copies with social outreach get the Outreach chat too (it follows the DM Desk switch)");
