// v84 learning engine: one rulebook every agent reads, corrections caught and confirmed, memory by relevance, nightly Librarian.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
let seq = 0;
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "42" } }], team_actions: [], team_audit: [], team_memory: [], team_threads: [], team_messages: [], team_usage: [], team_reports: [] };
for (let i = 0; i < 120; i++) DB.team_memory.push({ id: "m" + i, category: "other", fact: "Note number " + i + " about general admin and filing", created_at: new Date(Date.now() - (i + 5) * 864e5).toISOString() });
DB.team_memory.push({ id: "mm", category: "pricing", fact: "Moonmane colour correction starts at $180 and takes 3 hours", created_at: new Date(Date.now() - 400 * 864e5).toISOString() });
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict", "category"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|in|is)\.(.*)$/); if (!m) return true; if (m[1] === "eq") return String(r[k] ?? "") === m[2]; if (m[1] === "is") return m[2] === "true" ? r[k] === true : r[k] == null; return m[2].replace(/[()]/g, "").split(",").includes(String(r[k])); });
let learnQ = [], libQ = [], learnCalls = 0; const sys = [], tg = [];
const text = (t) => Response.json({ content: [{ type: "text", text: t }], stop_reason: "end_turn", usage: { input_tokens: 5, output_tokens: 5 } });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { let rows = t.filter((r) => match(r, q)); if (/order=created_at\.desc/.test(q)) rows = rows.slice().sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))); const lim = +(q.match(/limit=(\d+)/) || [])[1]; return Response.json(lim ? rows.slice(0, lim) : rows); }
    if (m === "POST") { const rows = [].concat(body).map((r) => { if (r.key) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; return t[i]; } } const n = { id: "id" + (++seq), created_at: new Date().toISOString(), ...r }; t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); }
    if (m === "DELETE") { const keep = t.filter((r) => !match(r, q)); DB[path] = keep; return Response.json([]); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { const s = JSON.stringify(body.system || "");
    if (s.includes("You keep the standing rulebook")) { learnCalls++; return text(JSON.stringify(learnQ.shift() || { learn: [], forget: [] })); }
    if (s.includes("careless assistant")) return text("Text a new lead to say hi, keep it upbeat and quick");
    if (s.includes("strict examiner")) return text('{"pass":false,"why":"used a dash"}');
    if (s.includes("Librarian") || s.includes("You tidy an AI team")) return text(JSON.stringify(libQ.shift() || {}));
    sys.push(s); return text("Sure thing."); }
  if (u.includes("api.telegram.org")) { tg.push(body); return Response.json({ ok: true, result: { message_id: 500 + tg.length } }); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "42", PUBLIC_ORIGIN: O };
const call = (path, b) => w.fetch(new Request(O + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) }));
const rules = () => (DB.team_settings.find((x) => x.key === "team_rules") || {}).value?.rules || [];

// 1) a correction in a department chat becomes a rule, confirmed back
learnQ.push({ learn: [{ rule: "Never use dashes or asterisks in anything you write.", applies_to: ["all"], kind: "never" }], forget: [] });
let r = await call("/api/v1/team/chat", { department: "head_of_marketing", message: "Please never use dashes or asterisks in anything, I keep saying this" });
assert(/Got it\. From now on/.test(r.j.reply) && rules().length === 1 && rules()[0].source === "chat" && rules()[0].id, "Saying \"never ...\" in a team chat becomes a rule for everyone, and the reply confirms it (" + r.j.reply.slice(-90) + ")");

// 2) every agent reads it next time, in every department
sys.length = 0;
await call("/api/v1/team/chat", { department: "head_of_finance", message: "Draft the invoice reminder for Glow Lab" });
assert(sys.some((s) => s.includes("RULEBOOK") && s.includes("Never use dashes or asterisks")), "The next agent (Finance) reads the rulebook in its instructions");

// 3) saying it again moves it up instead of duplicating it
learnQ.push({ learn: [{ rule: "x", same_as: rules()[0].id }], forget: [] });
r = await call("/api/v1/team/chat", { department: "head_of_sales", message: "Again, don't use dashes!" });
assert(rules().length === 1 && rules()[0].said === 2 && /already a rule/.test(r.j.reply), "Saying it again doesn't duplicate it: it's marked as said twice and moved up");

// 4) plain questions don't cost a learning call
const before = learnCalls;
await call("/api/v1/team/chat", { department: "chief_of_staff", message: "What's on today?" });
assert(learnCalls === before, "Ordinary questions don't trigger the learning step");

// 5) memory by relevance: a year-old price is found when it matters
sys.length = 0;
await call("/api/v1/team/chat", { department: "head_of_sales", message: "What do we charge for a Moonmane colour correction?" });
assert(sys.some((s) => s.includes("MOST RELEVANT") && s.includes("$180")), "An old note (a year back, behind 120 newer ones) is found because it's relevant to the question");

// 6) Studio AI learns too, and reads the rulebook
sys.length = 0;
learnQ.push({ learn: [{ rule: "Call Ty 'Ty', never 'boss' or 'mate'.", applies_to: ["command"], kind: "style" }], forget: [] });
r = await call("/api/v1/operator/chat", { message: "Stop calling me mate, just call me Ty" });
assert(/From now on/.test(r.j.reply || "") && sys.some((s) => s.includes("Never use dashes or asterisks")), "Studio AI reads the rulebook and learns from what Ty tells it (" + String(r.j.reply || r.j.error).slice(-80) + ")");
assert(rules().some((x) => /boss/.test(x.rule) && x.source === "studio_ai"), "The Studio AI rule is saved with where it came from");

// 7) turning down a draft with a note teaches the team
DB.team_actions.push({ id: "a1", type: "ghl_email", title: "Email Jess", department: "head_of_sales", status: "pending", params: { body: "hi" }, created_at: new Date().toISOString() });
learnQ.push({ learn: [{ rule: "Sign off every email with 'Cheers, Ty'.", applies_to: ["inbox", "outreach"], kind: "style" }], forget: [] });
await call("/api/v1/team/actions/a1/reject", { note: "Always sign off with Cheers, Ty" });
assert(rules().some((x) => /Cheers, Ty/.test(x.rule) && x.source === "reject") && tg.some((x) => /From now on/.test(x.text || "")), "A rejection note becomes a rule, and Ty gets told on Telegram");

// 8) nightly Librarian: duplicates merged, outdated notes cleared, a "learned today" summary to reply to
const RD = Date; const fixed = new RD("2026-11-13T10:30:00Z").getTime();
globalThis.Date = class extends RD { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
const rs = rules(); rs.forEach((x) => { x.at = new RD(fixed - 36e5).toISOString(); }); rs.push({ id: "dup1", rule: "Never use dashes in messages.", applies_to: ["all"], said: 1, at: new RD(fixed - 864e5 * 3).toISOString() });
for (let i = 0; i < 4; i++) rs.push({ id: "x" + i, rule: "Filler rule " + i, applies_to: ["all"], said: 1, at: new RD(fixed - 864e5 * 9).toISOString() });
libQ.push({ drop: ["m1", "m2"] }, { merge: [{ keep: rs[0].id, drop: ["dup1"], rule: "Never use dashes or asterisks in anything you write." }] });
const ps = []; await w.scheduled({ cron: "*/15 * * * *" }, env, { waitUntil(p) { ps.push(p); } }); await Promise.all(ps);
globalThis.Date = RD;
const sum = tg.find((x) => /What the team learned today/.test(x.text || ""));
assert(!rules().some((x) => x.id === "dup1") && rules()[0].said >= 3 && !DB.team_memory.some((x) => x.id === "m1"), "The Librarian merges duplicate rules and clears outdated notes overnight");
assert(sum && /Reply to this message/.test(sum.text), "Ty gets \"What the team learned today\" on Telegram");

// 9) replying to that list fixes it
const SECRET = (await import("node:crypto")).createHash("sha256").update("k|telegram").digest("hex").slice(0, 48);
const target = rules().find((x) => /boss/.test(x.rule));
learnQ.push({ learn: [], forget: [target.id] });
const mid = Object.entries((DB.team_settings.find((x) => x.key === "tg_prompts") || {}).value || {}).find(([, v]) => v.mode === "learn")?.[0];
await w.fetch(new Request(O + "/api/v1/telegram/hook", { method: "POST", headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": SECRET }, body: JSON.stringify({ update_id: 9901, message: { message_id: 77, chat: { id: 42 }, from: { username: "ty" }, text: "forget the one about mate", reply_to_message: { message_id: +mid } } }) }), env, { waitUntil() {} });
assert(mid && !rules().some((x) => x.id === target.id) && tg.some((x) => /Dropped/.test(x.text || "")), "Replying \"forget ...\" to the summary drops that rule");

// 10) editing the rulebook in Command keeps each rule's history
const keepIt = rules()[0];
r = await call("/api/v1/team/brain/rules", { rules: rules() });
assert(r.j.rules.find((x) => x.id === keepIt.id)?.said === keepIt.said, "Editing the rulebook in Command keeps how many times each rule was said");

// v86 nightly exam: a rule the team slips on gets pinned and Ty is told
{ const RD2 = Date; const f2 = new RD2("2026-11-14T10:30:00Z").getTime();
  globalThis.Date = class extends RD2 { constructor(...a) { super(...(a.length ? a : [f2])); } static now() { return f2; } };
  tg.length = 0;
  const ps2 = []; await w.scheduled({ cron: "*/15 * * * *" }, env, { waitUntil(p) { ps2.push(p); } }); await Promise.all(ps2);
  globalThis.Date = RD2;
  const s2 = tg.find((x) => /Tonight's exam/.test(x.text || ""));
  assert(s2 && /Slipped on/.test(s2.text) && rules().some((x) => x.pinned), "v86: the nightly exam tests Ty's rules; one the team slips on is pinned to the top and Ty is told");
  const ex2 = (await call("/api/v1/team/brain/examples")).j;
  assert(ex2.exam && ex2.exam.last.failed.length >= 1, "v86: the Team brain page shows the last exam");
}
const app = await (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} })).text();
new Function(app);
assert(/Your rulebook/.test(app), "Studio AI › Knowledge › Team brain shows the rulebook");
console.log("learning-v84 OK");
