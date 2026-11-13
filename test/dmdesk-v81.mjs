// v81 DM Desk: unique, human, honest DMs written by the marketing team; Ty sends; follow-ups once; Reply Coach drafts answers.
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
    if (sys.includes("You are the DM Writer")) { const x = writer.shift() || { found: false, why_not: "nothing specific" }; return toolUse("save_dm", x); }
    return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tg.push(body); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1", PUBLIC_ORIGIN: O };
const call = (path, b) => w.fetch(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) }));

const good1 = { found: true, channel: "instagram", profile_url: "https://www.instagram.com/peakmindset.coach", person_name: "Jess", hook: "bio says DM to book a call", message: "Hey Jess 👋 saw your bio says DM to book a call, but there's no booking link, so anyone scrolling at 10pm has to wait for you to reply. I'm Ty, I run Studio Flow & Systems and fix exactly that for coaches. Want me to send a 2 min video showing what I mean? No worries if not.", why: "Active coach, booking only by DM" };
const salesy = { found: true, channel: "facebook", profile_url: "https://www.facebook.com/smilebrightdental", hook: "no online booking phone only", message: "Hi Smile Bright! I hope this finds you well. I'm Ty from Studio Flow & Systems. We can elevate your practice with online booking from $99 per month — check www.studioflow.com. No worries if not.", why: "x" };
const good2 = { found: true, channel: "facebook", profile_url: "https://www.facebook.com/smilebrightdental", hook: "no online booking, phone only, closed weekends", message: "Hi there, quick one. Looks like new patients can only book by phone at Smile Bright and you're closed weekends, which is when a lot of people sort out the dentist. I'm Ty from Studio Flow & Systems, we set up online booking that answers for you after hours. Worth a quick look? Totally fine if not 🙂", why: "Phone-only bookings" };
const copycat = { ...good1, profile_url: "https://www.instagram.com/spinealign", hook: "bio says DM to book a call", message: good1.message.replace("Jess", "Sam") };
writer = [good1, salesy, copycat];
let r = await call("/dm-queue/fill", { count: 3 });
const skipped1 = r.j.skipped;
DB.agent_prospects[1].leak_report = {}; writer = [good2];
await call("/dm-queue/fill", { count: 1 });
const ready = (await call("/dm-queue")).j.ready;
assert(ready.length === 2 && ready.some((x) => x.business_name === "Peak Mindset Coaching") && ready.some((x) => x.business_name === "Smile Bright Dental"), "The team writes one message per business into the queue");
assert(!ready.some((x) => /elevate|\$99|www\./.test(x.message)), "A salesy, AI-sounding message with a price and a link never reaches the queue");
assert(skipped1.some((x) => /unique|same way|Too close/.test(x.why)), "A copy of another business's message is thrown out: every message is unique (" + skipped1.map((x) => x.why).join(" | ") + ")");
assert(ready.every((x) => x.review && x.review.score >= 8 && x.profile_url.startsWith("https://www.")), "Every message has been checked by the DM Reviewer and links to their real profile");

const x1 = ready.find((x) => x.business_name === "Peak Mindset Coaching");
r = await call("/dm-queue/mark", { id: x1.id, status: "sent", message: x1.message + " Cheers" });
assert(r.j.ok && r.j.item.edited && DB.agent_prospects[0].status === "sent", "Ty sends it himself and taps Sent: his edits are kept and the prospect moves to sent");
assert(((DB.team_settings.find((x) => x.key === "examples") || {}).value?.items || []).some((x) => x.type === "dm" && x.kind === "edited" && /Cheers/.test(x.after)), "v85: the DM Ty actually sent (with his edit) becomes an example for the DM Writer");
let st = (await call("/dm-queue")).j;
assert(st.today.instagram === 1 && st.waiting.length === 1, "Today's count per platform goes up and it waits for a reply");

// three days later, no reply: one follow-up is written, then nothing more
const dq = DB.team_settings.find((x) => x.key === "dm_queue"); dq.value.items.find((x) => x.id === x1.id).sent_at = new Date(Date.now() - 4 * 864e5).toISOString();
writer = [{ found: true, hook: "booking link in bio", message: "Hey Jess, one quick tip even if we never chat: a booking link in your bio (Calendly is fine) means people can grab a call at 10pm without waiting on you. Ty from Studio Flow", why: "follow-up" }];
const realNow = Date.now; const at10 = new Date(); at10.setUTCHours(0, 0, 0, 0); Date.now = () => at10.getTime();
dq.value.cfg = { ...(dq.value.cfg || {}), autofill: false };
const ps = []; await w.scheduled({ cron: "*/15 * * * *" }, env, { waitUntil(p) { ps.push(p); } }); await Promise.all(ps);
Date.now = realNow;
st = (await call("/dm-queue")).j;
const fu = st.ready.find((x) => x.step === "follow_up");
assert(fu && fu.business_name === "Peak Mindset Coaching" && fu.profile_url === x1.profile_url, "No reply after 3 days: the team writes ONE follow-up into the queue");

// they replied: the Reply Coach drafts the answer
r = await call("/dm-queue/reply-draft", { id: x1.id, reply: "Ha how did you notice that? What would it cost?" });
assert(((DB.team_settings.find((x) => x.key === "examples") || {}).value?.items || []).some((x) => x.kind === "worked" && /Jess/.test(x.text)), "v86: a DM that got a reply becomes a \"this worked\" example");
assert(r.j.ok && /video/.test(r.j.reply) && DB.agent_prospects[0].status === "replied", "They replied: the Reply Coach drafts Ty's answer and the lead is marked replied");
st = (await call("/dm-queue")).j;
assert(!st.ready.some((x) => x.business_name === "Peak Mindset Coaching"), "Once they reply, the pending follow-up is cancelled");

// do not contact
const x2 = st.ready.find((x) => x.business_name === "Smile Bright Dental");
await call("/dm-queue/mark", { id: x2.id, status: "do_not_contact" });
assert(DB.agent_prospects[1].status === "do_not_contact", "\"They said no\" means never again");

// settings: limits and industries
r = await call("/dm-queue/settings", { daily: { instagram: 500, facebook: 10, linkedin: 15 }, verticals: ["coaching", "nope"], areas: ["Perth", ""] });
assert(r.j.cfg.daily.instagram === 40 && r.j.cfg.daily.facebook === 10 && r.j.cfg.verticals.join() === "coaching" && r.j.cfg.areas.join() === "Perth", "Daily limits are capped at safe numbers; industries and areas save");

// hunting: finds new businesses on social when the list runs dry
hunt = { businesses: [{ business_name: "Coach Mia Fitness", location: "Perth", instagram: "https://www.instagram.com/coachmia", signal: "Link in bio goes to a broken page" }, { business_name: "Made Up Co", signal: "" }, { business_name: "No Profile Co", signal: "slow replies" }] };
writer = [{ found: true, channel: "instagram", profile_url: "https://www.instagram.com/coachmia", hook: "link in bio goes to a broken page", message: "Hi Mia, heads up, the link in your bio goes to a broken page right now so anyone keen to book hits a dead end 😬 I'm Ty, I run Studio Flow & Systems and sort out booking setups for coaches. Want me to send what I'd change? No stress if not.", why: "Broken bio link" }];
r = await call("/dm-queue/fill", { count: 1 });
assert(DB.agent_prospects.some((p) => p.business_name === "Coach Mia Fitness" && p.source === "dm_hunt") && !DB.agent_prospects.some((p) => /Made Up|No Profile/.test(p.business_name)) && r.j.written === 1, "When the list runs dry, the Social Prospect Finder adds real businesses with a profile and a real gap, and nothing made up");

// LinkedIn: connect, accepted, then the first message
DB.agent_prospects.push({ id: "p9", business_name: "Northside Physio", location: "Perth", vertical: "coaching", niche: "coaching", leak: "No after-hours booking", status: "to_send", score: 9, leak_report: { socials: { linkedin: "https://www.linkedin.com/in/sam-northside" } } });
writer = [{ found: true, channel: "linkedin", profile_url: "https://www.linkedin.com/in/sam-northside", hook: "no after-hours booking at Northside", message: "Hi Sam, noticed Northside has no after-hours booking. I'm Ty, I run Studio Flow & Systems and work with clinics on exactly that. Would be good to connect. No worries if not.", why: "LinkedIn only" },
  { found: true, hook: "Northside after-hours patients", message: "Thanks for connecting Sam. Curious, how do you handle new patients who want to book after hours at Northside at the moment? Ty", why: "after accept" }];
r = await call("/dm-queue/fill", { count: 1 });
st = (await call("/dm-queue")).j;
const li = st.ready.find((x) => x.channel === "linkedin");
assert(li && li.step === "connect" && li.message.length <= 300, "LinkedIn starts with a connection note under 300 characters");
await call("/dm-queue/mark", { id: li.id, status: "sent" });
r = await call("/dm-queue/mark", { id: li.id, status: "accepted" });
assert(r.j.next && r.j.next.step === "message" && r.j.next.channel === "linkedin", "When they accept, the LinkedIn Connector writes the first message");

// over the limit: a warning to protect the account
const dq2 = DB.team_settings.find((x) => x.key === "dm_queue");
dq2.value.cfg.daily.instagram = 1;
const extra = { id: "dmX", prospect_id: "p3", business_name: "Spine Align Chiro", channel: "instagram", step: "first", profile_url: "https://www.instagram.com/spinealign", hook: "x", message: "m", status: "ready", created_at: new Date().toISOString() };
dq2.value.items.push(extra, { ...extra, id: "dmY" });
await call("/dm-queue/mark", { id: "dmX", status: "sent" });
r = await call("/dm-queue/mark", { id: "dmY", status: "sent" });
assert(/over your limit/.test(r.j.warn), "Going over the daily limit for a platform gives a clear warning");


// no dashes or asterisks, ever
DB.agent_prospects.push({ id: "p10", business_name: "Bayside Brows", location: "Brisbane", vertical: "coaching", niche: "coaching", leak: "Booking link in bio is broken", status: "to_send", score: 9, leak_report: {} });
writer = [{ found: true, channel: "instagram", profile_url: "https://www.instagram.com/baysidebrows", hook: "booking link in your bio is broken", message: "Hey Bayside Brows 👋 the booking link in your bio is broken right now — so anyone keen hits a dead end. I'm Ty, I run Studio Flow & Systems. Want a **2-minute** video showing the fix? No worries if not.", why: "broken link" }];
await call("/dm-queue/fill", { count: 1 });
const bb = (await call("/dm-queue")).j.ready.find((x) => x.business_name === "Bayside Brows");
assert(bb && !/[*\u2013\u2014-]/.test(bb.message) && /2 minute video/.test(bb.message), "No dashes or asterisks in any message, even if the writer slips: " + (bb && bb.message));

// v83 LinkedIn connections with decision makers
let people = { people: [{ name: "Dr Priya Shah", title: "Principal Dentist", company: "Harbour Dental", location: "Perth", linkedin: "https://au.linkedin.com/in/priya-shah-dental", signal: "Runs a 4 chair practice, booking by phone only" }, { name: "Fake Person", company: "Nowhere", linkedin: "https://example.com/x", signal: "x" }, { name: "No Reason", company: "Blank Co", linkedin: "https://www.linkedin.com/in/blank", signal: "" }] };
globalThis.__people = people;
r = await call("/dm-queue/linkedin-fill", { count: 3 });
const hp = DB.agent_prospects.find((p) => p.business_name === "Harbour Dental");
assert(hp && hp.decision_maker === "Dr Priya Shah" && hp.source === "li_hunt" && !DB.agent_prospects.some((p) => /Nowhere|Blank Co/.test(p.business_name)), "The Social Prospect Finder finds real decision makers on LinkedIn, and nothing made up");
st = (await call("/dm-queue")).j;
const lc = st.ready.find((x) => x.business_name === "Harbour Dental");
assert(lc && lc.step === "connect" && lc.no_note && lc.message === "" && /Principal Dentist/.test(lc.why), "Connection requests are queued without a note by default (free LinkedIn only allows a few)");
r = await call("/dm-queue/linkedin-fill", { count: 3 });
assert(!(await call("/dm-queue")).j.ready.filter((x) => x.business_name === "Harbour Dental")[1], "The same person is never queued twice");
const dq3 = DB.team_settings.find((x) => x.key === "dm_queue");
for (let i = 0; i < 100; i++) dq3.value.items.push({ id: "w" + i, prospect_id: "z" + i, business_name: "Z" + i, channel: "linkedin", step: "connect", no_note: true, profile_url: "https://www.linkedin.com/in/z" + i, message: "", status: "sent", sent_at: new Date().toISOString(), created_at: new Date().toISOString() });
r = await call("/dm-queue/linkedin-fill", { count: 3 });
assert(/weekly limit/.test(r.j.note || ""), "It stops at LinkedIn's weekly limit of about 100 requests");
// the team knows about it
const app = await (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} })).text();
new Function(app);
assert(/Find 10 LinkedIn connections/.test(app) && /dmNotes/.test(app) && /VIEWS\.dms = /.test(app) && /\["dms", "DM Desk"\]/.test(app) && /Copy &amp; open profile/.test(app), "Growth › DM Desk is in the app");
r = await call("/dm-queue");
assert(r.s === 200, "DM Desk answers");
console.log("dmdesk-v81 OK");
