// v113 team_control: from Telegram, Command sees and runs the whole team, with Ty's yes for every change.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const O = "https://studioflowandsystems.app";
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } },
  { key: "team_rules", value: { rules: [{ id: "r1", rule: "Always mention our Tuesday special.", applies_to: ["all"] }, { id: "r2", rule: "Never use dashes.", applies_to: ["all"] }] } }],
  team_usage: [], team_actions: [], team_audit: [], studio_command_jobs: [{ id: "11111111-1111-4111-8111-111111111111", title: "Marketing: brand radar", status: "queued", kind: "shift", department: "head_of_marketing", request: "x", params: {} }] };
let seq = 0; const tgs = []; let script = [], results = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "in") return m[2].replace(/[()]/g, "").split(",").includes(val); return m[1] === "eq" ? val === m[2] : val !== m[2]; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); for (const r of rows) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.anthropic.com")) { const names = (body.tools || []).map((t) => t.name);
    if (!names.includes("team_control")) return Response.json({ content: [{ type: "text", text: "{}" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
    const last = body.messages.at(-1);
    if (Array.isArray(last.content) && last.content.some((c) => c.type === "tool_result")) { for (const c of last.content) if (c.type === "tool_result") results.push(JSON.parse(typeof c.content === "string" ? c.content : c.content[0].text)); }
    const next = script.shift();
    if (!next) return Response.json({ content: [{ type: "text", text: "Done." }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 5 } });
    return Response.json({ content: [{ type: "tool_use", id: "tc" + (++seq), name: "team_control", input: typeof next === "function" ? next() : next }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 } }); }
  if (u.includes("api.telegram.org")) { tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 + tgs.length } }); }
  return Response.json({}); };
const w = (await import(W)).default;
const sent = [];
const env = { COMMAND_QUEUE: { send: async (b) => { sent.push(b); } }, COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "42", PUBLIC_ORIGIN: O };
const SECRET = (await import("node:crypto")).createHash("sha256").update("k|telegram").digest("hex").slice(0, 48);
let upd = 7000;
const say = async (text, steps) => { script = steps; results = [];
  const wu = []; await w.fetch(new Request(O + "/api/v1/telegram/hook", { method: "POST", headers: { "content-type": "application/json", "X-Telegram-Bot-Api-Secret-Token": SECRET }, body: JSON.stringify({ update_id: ++upd, message: { message_id: upd, chat: { id: 42 }, from: { username: "ty" }, text } }) }), env, { waitUntil(p) { wu.push(p); } });
  await Promise.all(wu); for (const b of sent.splice(0)) await w.queue({ messages: [{ body: b, ack() {}, retry() {} }] }, env, { waitUntil(p) { wu.push(p); } }); await Promise.all(wu);
  return results; };
const shifts = () => DB.team_settings.find((x) => x.key === "shifts")?.value;

let r = await say("show me the team", [{ action: "overview" }]);
const ov = r[0];
assert(ov.ok && ov.departments.length >= 6 && ov.shifts.length >= 10 && ov.shifts.every((s) => "on" in s && /\d\d:00/.test(s.time)) && ov.background_ai === "running" && ov.queued_jobs.some((j) => /brand radar/.test(j.title)) && ov.rulebook_rules === 2, "Overview: every department, every shift with on/off and time, background AI state, queued jobs, rulebook");
const pick = ov.shifts.find((s) => s.on && s.id === "brand_radar") || ov.shifts.find((s) => s.on);

r = await say("turn off " + pick.label, [{ action: "shift_off", shift_id: pick.id }, () => ({ action: "shift_off", shift_id: pick.id, confirm_code: results[0].confirm_code })]);
assert(r[0].needs_confirmation && /Turn OFF/.test(r[0].read_back) && r[1].ok && /now off/.test(r[1].done), "Turning a shift off reads back first, then does it after Ty's yes");
assert(shifts().find((s) => s.id === pick.id).enabled === false, "…and the shift is really off in settings");
r = await say("bad code", [{ action: "shift_on", shift_id: pick.id, confirm_code: "nope" }]);
assert(r[0].needs_confirmation && shifts().find((s) => s.id === pick.id).enabled === false, "A wrong or missing code changes nothing");

r = await say("move it", [{ action: "shift_time", shift_id: pick.id, hour: 14, days: ["Tue", "Thu"] }, () => ({ action: "shift_time", shift_id: pick.id, hour: 14, days: ["Tue", "Thu"], confirm_code: results[0].confirm_code })]);
const moved = shifts().find((s) => s.id === pick.id);
assert(r[1].ok && moved.hour === 14 && JSON.stringify(moved.days) === "[2,4]", "Moving a shift to 2pm Tue and Thu works");

r = await say("pause the team for 6 hours", [{ action: "pause_background", hours: 6 }, () => ({ action: "pause_background", hours: 6, confirm_code: results[0].confirm_code }), { action: "overview" }]);
assert(r[1].ok && /paused by Ty/.test(r[2].background_ai), "Pausing background AI works and shows in the overview");
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/key=eq\.team_pause/.test(src.slice(src.indexOf("async function aiBackgroundPaused"), src.indexOf("async function aiBackgroundPaused") + 400)), "The pause really stops background AI (the hourly run checks it)");
r = await say("resume", [{ action: "resume_background" }, { action: "overview" }]);
assert(r[1].background_ai === "running", "Resume puts it back");

r = await say("lean off", [{ action: "lean_mode", mode: "off" }, () => ({ action: "lean_mode", mode: "off", confirm_code: results[0].confirm_code })]);
assert(r[1].ok && DB.team_settings.find((x) => x.key === "ai_lean").value.mode === "off", "Lean mode can be switched with Ty's yes");

r = await say("drop the tuesday rule", [{ action: "list_rules", search: "tuesday" }, { action: "retire_rule", rule_id: "r1" }, () => ({ action: "retire_rule", rule_id: "r1", confirm_code: results[1].confirm_code })]);
const rules = DB.team_settings.find((x) => x.key === "team_rules").value.rules;
assert(r[0].count === 1 && r[2].ok && rules.length === 1 && rules[0].id === "r2", "Finds a rule in the rulebook and retires it for every agent, others kept");

r = await say("cancel brand radar", [{ action: "cancel_job", job_id: "11111111-1111-4111-8111-111111111111" }]);
assert(r[0].ok && DB.studio_command_jobs[0].status === "cancelled", "A queued job can be cancelled");
assert(DB.team_audit.length >= 3, "Every change is written to the audit log");
assert(/YOU RUN THE TEAM/.test(src) && /v: 113, studio_only: true, title: "Command runs the whole team"/.test(src), "Command is told it runs the team, and every agent is taught to follow its changes");
const grab = (name) => { const i = src.indexOf("function " + name + "("); let d = 0, j = src.indexOf("{", src.indexOf(")", i)); for (let k = j; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}") { d--; if (!d) return src.slice(i, k + 1); } } };
const memToolOk = new Function("MEM_MONEY_TOOL", "MEM_STAFF_TOOLS", grab("memToolOk") + "; return memToolOk;")(/stripe|invoice/, new Set(["ghl_search_contacts"]));
assert(memToolOk("owner", "team_control") && !memToolOk("manager", "team_control") && !memToolOk("support", "team_control") && !memToolOk("staff", "team_control"), "Only Ty (owner) can control the team; manager, support and staff logins can't");
console.log("teamctl-v113 OK");
