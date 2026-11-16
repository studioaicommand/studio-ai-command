// v123 DM Desk scans: your own friends (skips anyone you've already messaged, starts from your own profiles) or new people in an industry (like trauma coaches).
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
let seq = 0;
const TOK = "a".repeat(64), now = () => new Date().toISOString();
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }, { key: "mac_link", value: { token_hash: crypto.createHash("sha256").update(TOK).digest("hex"), last_seen: now(), agent: 2 } }], team_actions: [], team_audit: [], team_usage: [], agent_prospects: [] };
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|in|is)\.(.*)$/); if (!m) return true; if (m[1] === "eq") return String(r[k] ?? "") === m[2]; if (m[1] === "is") return m[2] === "true" ? r[k] === true : r[k] == null; return m[2].replace(/[()]/g, "").split(",").includes(String(r[k])); });
let nextAct = null; const tg = [];
const toolUse = (name, input) => Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name, input }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 10 } });
let writer = [], hunter = [], hunts = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { let rows = t.filter((r) => match(r, q)); const lim = +(q.match(/limit=(\d+)/) || [])[1]; return Response.json(lim ? rows.slice(0, lim) : rows); }
    if (m === "POST") { const rows = [].concat(body).map((r) => { if (r.key) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; return t[i]; } } const n = { id: "id" + (++seq), created_at: now(), ...r }; t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { const s = JSON.stringify(body.system || "");
    if ((body.tools || []).some((t) => t.name === "browser_action")) return toolUse("browser_action", nextAct);
    if (s.includes("You are the DM Reviewer")) return toolUse("review_dm", { score: 9 });
    if (s.includes("You are the DM Writer")) return toolUse("save_dm", writer.shift() || { found: false });
    if (s.includes("Social Prospect Finder")) { hunts.push(s); return toolUse("save_businesses", hunter.shift() || { businesses: [] }); }
    return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } }); }
  if (u.includes("api.telegram.org")) { tg.push(body); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: O };
const call = (path, b) => w.fetch(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) }));
const agent = (path, b) => w.fetch(new Request(O + "/api/v1/link/" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOK, "X-SF-Agent": "2" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then((r) => r.json());
const task = () => DB.team_settings.find((x) => x.key === "browser_task")?.value;
const page = (url, els = []) => ({ url, title: "page", text: "page", elements: els });
const cfg = () => DB.team_settings.find((x) => x.key === "dm_queue")?.value?.cfg || {};
// 1) your profiles
let r = await call("/dm-queue/settings", { handles: { facebook: "ty.brazel", instagram: "@studioflowandsystems", linkedin: "https://www.linkedin.com/in/tybrazel/?x=1" } });
assert(r.j.ok && cfg().handles.facebook === "https://www.facebook.com/ty.brazel" && cfg().handles.instagram === "studioflowandsystems" && cfg().handles.linkedin === "https://www.linkedin.com/in/tybrazel", "Each owner saves their own Facebook, Instagram and LinkedIn (tidied into proper links)");
r = await call("/dm-queue/settings", { handles: { instagram: "not a handle!!" } });
assert(r.j.warn && /Instagram/.test(r.j.warn) && cfg().handles.facebook, "A link that isn't a profile is flagged, not saved");
r = await call("/dm-queue/settings", { handles: { instagram: "" } });
r = await call("/dm-queue/scan", { mode: "friends", platform: "instagram" });
assert(r.s === 400 && /Instagram handle/.test(r.j.error), "An Instagram scan asks for your handle first");
await call("/dm-queue/settings", { handles: { instagram: "studioflowandsystems" } });
r = await call("/dm-queue/scan", { mode: "friends", platform: "instagram", preset: "trauma", target: 5 });
assert(r.j.ok && /instagram\.com\/studioflowandsystems\/following/.test(task().goal) && /somatic/.test(task().goal) && /direct\/inbox/.test(task().start_url), "With the handle saved it opens YOUR following list, looking for trauma and somatic words, after reading your inbox");
await call("/browser/stop", {});
DB.team_settings = DB.team_settings.filter((x) => x.key !== "browser_task");

// 2) friends scan skips anyone already messaged
DB.team_settings.find((x) => x.key === "dm_queue").value.items = [{ id: "dmx", business_name: "Kornelis Berkelaar", channel: "facebook", step: "warm", status: "sent", profile_url: "https://www.facebook.com/kornelis", created_at: now(), sent_at: now() }];
r = await call("/dm-queue/scan", { mode: "friends", platform: "facebook", preset: "trauma", target: 2 });
let n = await agent("next");
assert(r.j.ok && /facebook\.com\/messages/.test(n.task.start_url) && /save_contacted/.test(n.task.goal), "A Facebook friends scan reads your Messenger chat list first");
nextAct = { kind: "save_contacted", why: "inbox", names: ["Elisha Sophia", "Jade Dallas (Health Coach)"] };
await agent("step", { task_id: n.task.id, page: page("https://www.facebook.com/messages/") });
assert(task().scan.contacted.includes("elisha sophia") && task().scan.contacted.includes("jade dallas"), "It notes everyone in your recent chats");
nextAct = { kind: "save_people", why: "fits", people: [{ name: "Elisha Sophia", profile_url: "https://www.facebook.com/elisha.yarrington.1", headline: "Coach" }, { name: "Jade Dallas", profile_url: "https://www.facebook.com/shakiradallas", headline: "Health coach" }, { name: "Kornelis Berkelaar", profile_url: "https://www.facebook.com/Kornelis.berkelaar", headline: "Coach" }, { name: "Dani Elle", profile_url: "https://www.facebook.com/danielle.ddannielle", headline: "Trauma-informed coach" }] };
await agent("step", { task_id: n.task.id, page: page("https://www.facebook.com/search/people/?q=trauma") });
const warm = DB.agent_prospects.filter((p) => p.leak_report?.warm);
assert(warm.length === 1 && warm[0].business_name === "Dani Elle" && task().scan.skipped === 3, "Only Dani is added: the two from your chats and the one already in your DM Desk are skipped");
nextAct = { kind: "save_people", why: "fits", people: [{ name: "Malene Andersen", profile_url: "https://www.facebook.com/malene16", headline: "RTT therapist" }, { name: "Melissa Hiemann", profile_url: "https://www.facebook.com/melissahiemann", headline: "Therapist at The Centre for Healing" }] };
await agent("step", { task_id: n.task.id, page: page("https://www.facebook.com/search/people/?q=RTT") });
assert(task().status === "done" && /skipped 3 you've already messaged/.test(task().result), "The scan ends with how many it skipped and why");

// 3) new people in an industry (cold)
hunter = [{ businesses: [{ business_name: "Rooted Trauma Coaching", location: "Brisbane", instagram: "https://www.instagram.com/rootedtraumacoaching", signal: "Bio says DM to book a discovery call, no booking link" }] }];
writer = [{ found: true, channel: "instagram", profile_url: "https://www.instagram.com/rootedtraumacoaching", person_name: "", hook: "bio says DM to book", message: "Hey there, your bio says DM to book a discovery call. Someone reading at 10pm might not wait for a reply. I'm Ty, I run Studio Flow & Systems. Want me to send a 2 minute video showing what I mean? No worries if not.", why: "trauma coach, DM to book" }];
r = await call("/dm-queue/scan", { mode: "industry", niche: "trauma coaches", area: "Brisbane", target: 1 });
const pr = DB.agent_prospects.find((p) => p.business_name === "Rooted Trauma Coaching");
assert(r.j.ok && hunts.some((s) => /trauma coaches/.test(s) && /Brisbane/.test(s)) && pr && pr.niche === "trauma coaches", "\"Find people in an industry\" searches for exactly who Ty typed (trauma coaches in Brisbane)");
const st = (await call("/dm-queue")).j;
assert(r.j.written === 1 && st.ready.some((x) => x.business_name === "Rooted Trauma Coaching") && !st.ready.some((x) => x.business_name === "Dani Elle"), "A message is written for the new trauma coach only (friends aren't mixed into a cold search)");
assert(st.scan_presets && /somatic/.test(st.scan_presets.trauma), "The DM Desk offers ready-made word lists, including trauma and somatic work");
r = await call("/dm-queue/scan", { mode: "industry", niche: "x" });
assert(r.s === 400, "An industry search needs to say who to look for");
const ui = (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} }).then((x) => x.text()).catch(() => ""));
assert((/Find people in an industry/.test(ui) && /Your profiles/.test(ui)), "The DM Desk has both scans and a Your profiles section");
console.log("scan-v123 OK");
// v124 TikTok
r = await call("/dm-queue/settings", { handles: { tiktok: "https://www.tiktok.com/@soulfulcoach?lang=en" } });
assert(cfg().handles.tiktok === "soulfulcoach" && cfg().daily.tiktok === 10, "TikTok handle saves (from a link or @handle) with a gentle 10 a day limit");
r = await call("/dm-queue/scan", { mode: "friends", platform: "tiktok", preset: "trauma", target: 5 });
assert(r.j.ok && /tiktok\.com\/@soulfulcoach/.test(task().goal) && /tiktok\.com\/messages/.test(task().start_url), "A TikTok friends scan reads your TikTok inbox, then your own Following list");
await call("/browser/stop", {});
DB.team_settings = DB.team_settings.filter((x) => x.key !== "browser_task");
hunter = [{ businesses: [{ business_name: "Calm Body Somatics", location: "Brisbane", tiktok: "https://www.tiktok.com/@calmbodysomatics", signal: "Bio says DM for sessions, no booking link" }] }];
writer = [{ found: true, channel: "tiktok", profile_url: "https://www.tiktok.com/@calmbodysomatics", person_name: "", hook: "bio says DM for sessions", message: "Hi! Loved finding a somatic coach on TikTok. Your bio says DM for sessions, so new people have to wait on you before they can book in. I'm Ty from Studio Flow & Systems, happy to show you a simple fix in a quick video if useful? No worries if not.", why: "somatic coach on TikTok" }];
r = await call("/dm-queue/scan", { mode: "industry", niche: "somatic coaches", area: "Brisbane", target: 1 });
const tt = (await call("/dm-queue")).j.ready.find((x) => x.business_name === "Calm Body Somatics");
assert(r.j.written === 1 && tt && tt.channel === "tiktok", "The industry search finds people on TikTok too and writes a TikTok message");
assert((await call("/dm-queue")).j.channels.tiktok, "TikTok shows in the DM Desk with its own daily count");
r = await call("/dm-queue/send-batch", { ids: [tt.id] });
assert(r.s === 400 && /Copy & open profile/.test(r.j.error) && DB.team_settings.find((x) => x.key === "dm_queue").value.items.find((x) => x.id === tt.id).status === "ready", "TikTok messages aren't sent by Command Chrome: they stay ready for Copy & open profile");
console.log("tiktok-v124 OK");

