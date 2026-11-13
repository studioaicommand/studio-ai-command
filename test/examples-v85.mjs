// v85 learning from examples (approved, edited, turned down, DMs sent) and meaning-based memory search.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
let seq = 0;
const now = () => new Date().toISOString();
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "42" } }], team_audit: [], team_memory: [], team_threads: [], team_messages: [], team_usage: [], team_reports: [],
  team_actions: [
    { id: "a1", type: "ghl_sms", title: "Text Jess about Saturday", department: "head_of_sales", status: "pending", params: { contact_id: "c1", message: "Hi Jess, just checking in about Saturday. Are you still keen?" }, created_at: now() },
    { id: "a2", type: "ghl_sms", title: "Text Sam about his quote", department: "head_of_sales", status: "pending", params: { contact_id: "c2", message: "Hi Sam, just checking in on the quote I sent. Any thoughts?" }, created_at: now() },
    { id: "a3", type: "ghl_sms", title: "Text Mia", department: "head_of_sales", status: "pending", params: { contact_id: "c3", message: "Hey Mia!!! Huge news, we have a special offer just for you!!!" }, created_at: now() }] };
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|in|is)\.(.*)$/); if (!m) return true; if (m[1] === "eq") return String(r[k] ?? "") === m[2]; if (m[1] === "is") return m[2] === "true" ? r[k] === true : r[k] == null; return m[2].replace(/[()]/g, "").split(",").includes(String(r[k])); });
const sys = [];
const text = (t) => Response.json({ content: [{ type: "text", text: t }], stop_reason: "end_turn", usage: { input_tokens: 5, output_tokens: 5 } });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { let rows = t.filter((r) => match(r, q)); const lim = +(q.match(/limit=(\d+)/) || [])[1]; return Response.json(lim ? rows.slice(0, lim) : rows); }
    if (m === "POST") { const rows = [].concat(body).map((r) => { if (r.key) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) { t[i] = { ...t[i], ...r }; return t[i]; } } const n = { id: "id" + (++seq), created_at: now(), ...r }; t.push(n); return n; }); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, q)); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { const s = JSON.stringify(body.system || ""); if (!s.includes("standing rulebook")) sys.push(s); return text(s.includes("standing rulebook") ? '{"learn":[],"forget":[]}' : "Done."); }
  if (u.includes("leadconnectorhq.com")) return Response.json({ ok: true, messageId: "m1", conversationId: "cv1" });
  if (u.includes("api.telegram.org")) return Response.json({ ok: true, result: { message_id: 1 } });
  return Response.json({}); };
globalThis.caches = undefined;
// meaning search: a toy embedding where "dye job" and "colour correction" mean the same thing
const CONCEPTS = [["colour", "color", "dye", "hair"], ["correction", "fix", "fixing", "repair"], ["price", "cost", "charge", "much"], ["dentist", "dental", "teeth"]];
const embed = (t) => CONCEPTS.map((c) => c.some((w) => new RegExp("\\b" + w).test(String(t).toLowerCase())) ? 1 : 0).concat([0.01]);
const VEC = new Map();
const AI = { run: async (model, input) => ({ data: input.text.map(embed) }) };
const MEMORY_INDEX = { upsert: async (items) => { for (const i of items) VEC.set(i.id, i.values); return { count: items.length }; }, deleteByIds: async (ids) => ids.forEach((i) => VEC.delete(i)),
  query: async (v, o) => { const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return d / Math.sqrt(x * y || 1); }; return { matches: [...VEC].map(([id, vals]) => ({ id, score: cos(v, vals) })).sort((a, b) => b.score - a.score).slice(0, o.topK) }; } };
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "42", GHL_TOKEN: "g", GHL_LOCATION_ID: "loc", PUBLIC_ORIGIN: O };
const call = (path, b, e = env) => w.fetch(new Request(O + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), e, { waitUntil() {} }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => ({})) }));
const ex = () => (DB.team_settings.find((x) => x.key === "examples") || {}).value?.items || [];

let r = await call("/api/v1/team/actions/a1/approve", {});
assert(r.j.ok && ex().some((x) => x.kind === "approved" && /Saturday/.test(x.text)), "A draft approved as written becomes a good example");
r = await call("/api/v1/team/actions/a2/approve", { params: { message: "Hey Sam, did the quote make sense? Happy to jump on a 10 min call. Cheers, Ty" } });
const ed = ex().find((x) => x.kind === "edited");
assert(r.j.ok && ed && /just checking in/.test(ed.before) && /Cheers, Ty/.test(ed.after), "An edited draft is saved as BEFORE and AFTER");
r = await call("/api/v1/team/actions/a3/reject", { note: "Way too salesy, no exclamation marks" });
assert(ex().some((x) => x.kind === "rejected" && /too salesy/.test(x.note)), "A draft turned down is saved with Ty's reason");

sys.length = 0;
await call("/api/v1/team/chat", { department: "head_of_sales", message: "Draft a follow up text for Priya about her quote" });
const s0 = sys.find((x) => x.includes("EXAMPLES FROM")) || "";
assert(/Cheers, Ty/.test(s0) && /BEFORE/.test(s0) && /too salesy/.test(s0), "Before writing a similar draft, Sales sees what Ty approved, how he edited it, and what he turned down");

// meaning search on: an old note is found even with completely different words
const e2 = { ...env, AI, MEMORY_INDEX };
DB.team_memory.push({ id: "mm1", category: "pricing", fact: "Moonmane colour correction starts at $180", created_at: new Date(Date.now() - 300 * 864e5).toISOString() });
for (let i = 0; i < 60; i++) DB.team_memory.push({ id: "f" + i, category: "other", fact: "Filing note " + i + " for the dentist rebooking list", created_at: now() });
const ps = []; await w.scheduled({ cron: "*/15 * * * *" }, e2, { waitUntil(p) { ps.push(p); } }); await Promise.all(ps);
assert(VEC.has("m:mm1"), "Memory notes are indexed for meaning search in the background");
sys.length = 0;
await call("/api/v1/team/chat", { department: "head_of_sales", message: "What do we charge to fix a bad dye job?" }, e2);
assert(sys.some((x) => x.includes("MOST RELEVANT") && x.includes("$180")), "\"Fix a bad dye job\" finds the note about \"colour correction\" (meaning search)");
sys.length = 0;
await call("/api/v1/team/chat", { department: "head_of_sales", message: "What do we charge to fix a bad dye job?" });
assert(!sys.some((x) => x.includes("MOST RELEVANT") && x.includes("$180")), "Without the Cloudflare index attached it quietly falls back to word search");

r = await call("/api/v1/team/brain/examples", undefined, e2);
assert(r.j.meaning_search === true && r.j.counts.approved >= 1 && r.j.counts.edited === 1 && r.j.counts.rejected === 1 && r.j.recent.length >= 3, "The Team brain page shows the examples and that meaning search is on");
const rid = r.j.recent[0].id;
await call("/api/v1/team/brain/examples", { remove: rid });
assert(!ex().some((x) => x.id === rid), "Ty can forget an example");
const app = await (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} })).text();
new Function(app);
assert(/Examples the team learns from/.test(app), "Team brain page has the examples section");
console.log("examples-v85 OK");
