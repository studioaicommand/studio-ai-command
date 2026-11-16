// v128 ready to sell: a client's copy pairs its own Telegram, everything sent uses the client's names (never renaming a customer
// called Ty), the DM Desk is its own module and writes as the client, a public Privacy and AI notice, front desk numbers in the
// Monday report, and an alert when agents suddenly do far more than usual.
import crypto from "node:crypto";
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const O = "https://glowlab.example";
const iso = (ms) => new Date(Date.now() - ms).toISOString();
const DB = { team_settings: [{ key: "instance", value: { business_name: "Glow Lab Skin Clinic", product_name: "Glow Lab Command", owner_name: "Sarah Nguyen", owner_first: "Sarah", industry: "skin clinic", website: "https://glowlab.example", modules: { social_outreach: true } } }, { key: "telegram", value: { pair_code: "482913", pair_expires: Date.now() + 6e5 } }],
  team_actions: [], team_audit: [], team_memory: [], team_usage: [], team_reports: [], agent_prospects: [] };
const sent = { tg: [], ghl: [] };
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|in|gte|lt)\.(.*)$/); if (!m) return true; const x = r[k]; if (m[1] === "eq") return String(x ?? "") === m[2]; if (m[1] === "in") return m[2].replace(/[()]/g, "").split(",").includes(String(x)); if (m[1] === "gte") return String(x ?? "") >= m[2]; return String(x ?? "") < m[2]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") return Response.json(t.filter((r) => match(r, q)));
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); }
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + Math.random().toString(36).slice(2, 8), created_at: new Date().toISOString(), ...r })); if (path === "team_settings") { for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = { ...t[i], ...r }; else t.push(r); } } else t.push(...rows); return Response.json(rows); }
    return Response.json([]); }
  if (u.includes("services.leadconnectorhq.com")) { sent.ghl.push(body); return Response.json({ messageId: "m1" }); }
  if (u.includes("api.telegram.org")) { sent.tg.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  if (u.includes("api.anthropic.com")) return Response.json({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
  return Response.json({}); };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", TEAM_API_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: O };
const run = async (req) => { const jobs = []; const r = await w.fetch(req, env, { waitUntil(p) { jobs.push(p); } }); const t = await r.text(); for (const p of jobs) await p.catch(() => {}); return { r, t }; };
const call = async (path, b) => { const { r, t } = await run(new Request(O + "/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined })); let j = {}; try { j = JSON.parse(t); } catch {} return { s: r.status, j }; };
const secret = crypto.createHash("sha256").update("k|telegram").digest("hex").slice(0, 48);
const tgHook = (upd) => run(new Request(O + "/api/v1/telegram/hook", { method: "POST", headers: { "X-Telegram-Bot-Api-Secret-Token": secret, "content-type": "application/json" }, body: JSON.stringify({ update_id: Math.floor(Math.random() * 1e9), ...upd }) }));
const tgSet = () => DB.team_settings.find((x) => x.key === "telegram").value;

// 1) Telegram pairing on a client's copy
await tgHook({ message: { message_id: 1, chat: { id: 777 }, from: { username: "sarah_glow" }, text: "482913" } });
assert(tgSet().chat_id === 777 && tgSet().username === "sarah_glow", "A client pairs their own Telegram with the 6-digit code (not tied to Ty's username)");
assert(sent.tg.some((x) => /Glow Lab Command is connected/.test(x) && !/Studio AI/.test(x)), "The welcome message uses the client's product name");
DB.team_settings.find((x) => x.key === "telegram").value = { pair_code: "111111", pair_expires: Date.now() + 6e5 };
for (let n = 0; n < 5; n++) await tgHook({ message: { message_id: 2, chat: { id: 888 }, from: { username: "stranger" }, text: "00000" + n } });
await tgHook({ message: { message_id: 3, chat: { id: 888 }, from: { username: "stranger" }, text: "111111" } });
assert(!tgSet().chat_id && !tgSet().pair_code, "Five wrong codes and the pairing code is cancelled, so it can't be guessed");

// 2) messages going out use the client's names, but a customer called Ty keeps their name
sent.ghl.length = 0;
const lib = await import("node:fs"); const src = lib.readFileSync(W, "utf8");
assert(/instRewriteOut\(body\[k\], i128\)/.test(src), "Every GHL email and text passes through the client name swap");
const vm = await import("node:vm"); const ctx = {}; vm.createContext(ctx);
vm.runInContext(src.match(/function instRewriteOut\(t, i\) \{[\s\S]*?\n\}/)[0] + ";this.f=instRewriteOut;", ctx);
const i = { business_name: "Glow Lab Skin Clinic", product_name: "Glow Lab Command", owner_name: "Sarah Nguyen", owner_first: "Sarah" };
assert(ctx.f("Hi there, I'm Ty from Studio Flow & Systems.\nCheers,\nTy", i) === "Hi there, I'm Sarah from Glow Lab Skin Clinic.\nCheers,\nSarah", "\"I'm Ty from Studio Flow & Systems\" becomes \"I'm Sarah from Glow Lab Skin Clinic\", sign-off too");
assert(ctx.f("Hi Ty, your appointment is confirmed. Ty's booking is at 2pm.", i) === "Hi Ty, your appointment is confirmed. Ty's booking is at 2pm.", "A customer who is actually called Ty is never renamed");

// 3) DM Desk is its own module and writes as the client
let r = await call("/dm-queue");
assert(r.s === 200 && r.j.ok, "With DM Desk switched on, a client's copy can open it");
assert(/DM Desk \(social outreach\)/.test(src) && /social_outreach: \['dms'\]/.test(src), "DM Desk is a separate module from Studio's lead machine (which stays Studio-only)");
assert(/WHO YOU WRITE AS: \$\{i\.owner_name \|\| i\.owner_first\}, who runs \$\{i\.business_name\}/.test(src), "On a client's copy, DMs are written as the client about the client's business");

// 4) Privacy and AI notice
let p = await run(new Request(O + "/ai-notice"));
assert(p.r.status === 200 && /How Glow Lab Skin Clinic uses AI/.test(p.t) && /does not make decisions that significantly affect/.test(p.t) && /oaic\.gov\.au/.test(p.t) && /speak with a person/.test(p.t), "A public Privacy and AI notice, written for this business (what AI does, what it never decides, how to reach a person, the OAIC)");
assert(/treatment, clinical or health matters/.test(p.t), "Health businesses get the line that AI never makes clinical decisions");
assert(/frame-ancestors 'none'/.test(p.r.headers.get("Content-Security-Policy") || ""), "The notice page is locked down (no scripts, no framing)");

// 5) Monday report front desk numbers
const sat = (h) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7 || 7)); d.setUTCHours(h - 10, 0, 0, 0); return d.toISOString(); };
DB.team_actions.push(
  { type: "ghl_reply", status: "done", created_at: iso(3 * 864e5), decided_at: new Date(Date.parse(iso(3 * 864e5)) + 4 * 6e4).toISOString(), title: "Reply to Amy on SMS" },
  { type: "ghl_reply", status: "done", created_at: sat(21), decided_at: new Date(Date.parse(sat(21)) + 2 * 6e4).toISOString(), title: "Reply to Ben on Instagram" },
  { type: "ghl_reply", status: "pending", created_at: iso(864e5), title: "Needs you: Cara on Email" });
r = await call("/monday-report", {});
const rep = DB.team_reports.find((x) => /Monday report/.test(x.title))?.body || sent.tg.find((x) => /Monday report/.test(x)) || "";
assert(/Enquiries answered: \*?\*?3/.test(rep) && /after hours or on the weekend/.test(rep) && /Typical reply time/.test(rep) && /Handed to you with the full story: 1/.test(rep), "The Monday report shows enquiries answered, the after-hours share, typical reply time and handovers");

// 6) Agent watch
DB.team_settings.find((x) => x.key === "telegram").value = { chat_id: 777 };
for (let n = 0; n < 40; n++) DB.team_actions.push({ type: "ghl_followup", department: "head_of_sales", status: "pending", created_at: iso(60000) });
sent.tg.length = 0;
await w.scheduled({ scheduledTime: Date.now(), cron: "0 * * * *" }, env, { waitUntil() {} });
await new Promise((ok) => setTimeout(ok, 300));
assert(sent.tg.some((x) => /Unusual activity in the last hour/.test(x) && /actions created/.test(x) && /pause the team/.test(x)), "A sudden burst of agent actions sends an alert with how to pause everything");
const n1 = sent.tg.filter((x) => /Unusual activity/.test(x)).length;
await w.scheduled({ scheduledTime: Date.now(), cron: "0 * * * *" }, env, { waitUntil() {} });
await new Promise((ok) => setTimeout(ok, 300));
assert(sent.tg.filter((x) => /Unusual activity/.test(x)).length === n1, "It doesn't repeat the same alert within 6 hours");
console.log("sellable-v128 OK");
