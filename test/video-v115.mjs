// v115 Video Coach: a "yes" to the video offer gets Ty a ready-to-record script on Telegram (DM Desk, Check replies, GHL).
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const O = "https://studioflowandsystems.app";
const OFFER = "Hey, quick one about your Sunday hours. Your Ryde page says 9am to 5pm but Ashfield says emergency only. I'm Ty, I run Studio Flow & Systems. Want me to send a 2 minute video showing what I mean? No worries if not.";
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } },
  { key: "dm_queue", value: { cfg: {}, items: [
    { id: "d1", prospect_id: "p1", business_name: "Midway Dental Clinic", channel: "facebook", step: "first", status: "sent", message: OFFER, sent_at: new Date(Date.now() - 864e5).toISOString(), created_at: new Date().toISOString() },
    { id: "d2", prospect_id: "p2", business_name: "Anokhi Dental", channel: "instagram", step: "first", status: "sent", message: OFFER.replace("Ryde", "CBD"), sent_at: new Date(Date.now() - 864e5).toISOString(), created_at: new Date().toISOString() },
    { id: "d3", prospect_id: "p3", business_name: "No Video Co", channel: "instagram", step: "first", status: "sent", message: "Hey, noticed your booking link is broken. Worth a quick look?", sent_at: new Date(Date.now() - 864e5).toISOString(), created_at: new Date().toISOString() }] } }],
  agent_prospects: [{ id: "p1", business_name: "Midway Dental Clinic", website: "https://midway.test", location: "Ryde & Ashfield, Sydney", vertical: "dental", niche: "dental", leak: "Sunday hours differ between the two clinics", status: "sent" },
    { id: "p2", business_name: "Anokhi Dental", location: "Sydney", vertical: "dental", niche: "dental", leak: "Hours", status: "sent" },
    { id: "p3", business_name: "No Video Co", location: "Sydney", vertical: "coaching", niche: "coaching", leak: "Broken link", status: "sent" }],
  agent_demos: [{ token: "tok123", prospect_id: "p1", created_at: new Date().toISOString() }], team_actions: [], team_audit: [], team_usage: [], team_memory: [] };
let seq = 0; const tg = [], coachCalls = []; let coachYes = true;
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); return m[1] === "eq" ? val === m[2] : val !== m[2]; });
const toolUse = (name, input) => Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name, input }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 10 } });
const mockFetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") return Response.json(t.filter((r) => match(r, q)));
    if (m === "POST") { const rows = [].concat(body).map((r) => { if (r.key) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; return t[i]; } } const n = { id: "id" + (++seq), created_at: new Date().toISOString(), ...r }; t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { const sys = JSON.stringify(body.system || "");
    if (sys.includes("Video Coach")) { coachCalls.push(JSON.stringify(body.messages)); return toolUse("save_script", coachYes ? { said_yes: true, gap: "Ashfield shows emergency only on Sundays, so Sunday check-ups near Ashfield may book elsewhere.", check_first: "Ryde's Facebook shows an Online booking tag.", demo: "receptionist", sections: [{ time: "0:00 to 0:15", show: "Your face", say: "Hey Midway team, Ty here. You said I could send this." }, { time: "0:15 to 0:50", show: "Ryde page, then Ashfield page", say: "Ryde is open Sunday, Ashfield is emergency only." }, { time: "0:50 to 1:35", show: "Their AI receptionist demo, type: Can I get a Sunday check up near Ashfield?", say: "Watch, it points them to Ryde." }, { time: "1:35 to 2:00", show: "Your face", say: "Happy to show you on a quick call. Cheers." }], send_with: "Here's that video I mentioned. Cheers, Ty" } : { said_yes: false }); }
    if (sys.includes("You are the Reply Coach")) return toolUse("save_reply", { reply: "Legend, I'll record it today and send it through.", intent: "interested" });
    return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tg.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
Object.defineProperty(globalThis, "fetch", { value: mockFetch, writable: true, configurable: true });
globalThis.caches = undefined;
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1", PUBLIC_ORIGIN: O };
const call = (path, b) => w.fetch(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) }));

let r = await call("/dm-queue/reply-draft", { id: "d1", reply: "Yeah sure, send it through!" });
assert(r.j.ok && r.j.video_script && r.j.video_script.said_yes, "They said yes on the DM Desk: Command writes the video script");
const card = tg.find((t) => /Video to film: Midway Dental Clinic/.test(t));
assert(card && /The gap:/.test(card) && /Check first:/.test(card) && /0:15 to 0:50/.test(card) && /Send it with:/.test(card), "Ty gets it on Telegram: the gap, what to check, each section with what to show and say, and the message to send with it");
assert(/\/demo\/tok123\?ty=[a-f0-9]{16}/.test(card) && /not tracked/.test(card), "It includes their demo link marked as Ty's, so opening it while recording doesn't set off lead alerts");
assert(/Ryde page says 9am to 5pm/.test(coachCalls[0]) && /Sunday hours differ/.test(coachCalls[0]), "The script is written from Ty's actual message and what the team noticed");
const before = tg.length;
await call("/dm-queue/reply-draft", { id: "d1", reply: "Yeah sure, send it through!" });
assert(tg.length === before || !tg.slice(before).some((t) => /Video to film/.test(t)), "The same yes never makes a second script");
coachYes = false; tg.length = 0;
r = await call("/dm-queue/reply-draft", { id: "d2", reply: "Not right now thanks" });
assert(!r.j.video_script && !tg.some((t) => /Video to film/.test(t)), "A no or not now: no script");
const n0 = coachCalls.length;
await call("/dm-queue/reply-draft", { id: "d3", reply: "Yes please" });
assert(coachCalls.length === n0, "No video offered in the message: the Video Coach isn't called at all (no AI cost)");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/if \(x\) await videoCoach\(env, \{ prospectId: x\.prospect_id/.test(src), "Check replies (reading Ty's inbox in Command Chrome) also triggers it");
assert(/VIDEO_OFFER\.test\(inboxTxt\(ob\.body, 1500\)\)\) await videoCoach/.test(src), "Replies that come in through GHL (Instagram, Facebook, email, SMS) also trigger it");
assert(/v: 115, studio_only: true, title: "Video Coach"/.test(src) && /never claim the video is already attached/.test(src), "Agents are taught: the text reply says he'll record it, never that it's attached");
// The GHL path for real: an Instagram DM reply arrives through the GHL webhook.
const crypto = await import("node:crypto");
DB.team_settings.push({ key: "inbox", value: { sms: "approve", ig: "approve", fb: "approve", chat: "approve", email: "approve" } });
DB.agent_prospects.push({ id: "p9", business_name: "Harbour Physio", location: "Sydney", vertical: "allied", niche: "allied", leak: "No after-hours booking", status: "sent", ghl_contact_id: "ct9" });
const realFetch = globalThis.fetch; coachYes = true; tg.length = 0;
const nowIso = new Date().toISOString();
globalThis.fetch = async (u, init = {}) => { const s2 = String(u);
  if (s2.includes("leadconnectorhq.com")) {
    if (s2.includes("/conversations/search")) return Response.json({ conversations: [{ id: "c9" }] });
    if (s2.includes("/conversations/c9/messages")) return Response.json({ messages: { messages: [
      { id: "o1", direction: "outbound", body: "Hey, noticed you can't book after 6pm. I'm Ty from Studio Flow & Systems. Want me to send a 2 minute video showing what I mean?", messageType: "TYPE_INSTAGRAM", dateAdded: new Date(Date.now() - 864e5).toISOString() },
      { id: "i9", direction: "inbound", body: "yeah go for it", messageType: "TYPE_INSTAGRAM", dateAdded: nowIso }] } });
    if (s2.includes("/contacts/ct9")) return Response.json({ contact: { id: "ct9", firstName: "Sam", companyName: "Harbour Physio", tags: [] } });
    return Response.json({});
  }
  return realFetch(u, init); };
const KEY = crypto.createHash("sha256").update("inbox:k").digest("hex").slice(0, 28);
const jobs = []; await w.fetch(new Request(O + "/api/v1/inbox/ghl/" + KEY, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contact_id: "ct9" }) }), { ...env, GHL_TOKEN: "g", GHL_LOCATION_ID: "loc" }, { waitUntil(p) { jobs.push(p); } }); await Promise.all(jobs);
assert(tg.some((t) => /Video to film: Harbour Physio/.test(t)) && /No after-hours booking/.test(coachCalls.at(-1)), "Through GHL for real: an Instagram 'yeah go for it' gets the script too, matched to the prospect");
console.log("video-v115 OK");
