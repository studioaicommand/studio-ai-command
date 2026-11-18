// v137 Task doer: the AI does the to-dos it left on Ty's list, marks them done, and tells Ty what it did.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const fs = await import("node:fs");
const src = fs.readFileSync(W, "utf8");
assert(/\["Task doer", ai\(\(\) => taskDoer\(e\)\)/.test(src), "The hourly run includes the Task doer");
assert(/TASK_DOER_HOURS = \[9, 12, 15\]/.test(src), "It works at 9am, 12pm and 3pm");
assert(/ONLY for things Ty must do in person/.test(src), "Agents may only give Ty jobs he must do in person");
assert(/v: 137, studio_only: true, voice_on: true/.test(src) && /briefing_voice_note: true/.test(src), "v137 turns voice notes on once");
assert(/Done for you/.test(src) && /Needs you/.test(src), "Ty gets a Telegram: Done for you, Needs you");
// Run it against a fake database and a fake Claude.
const DB = { team_actions: [
  { id: "a1", type: "owner_task", status: "pending", title: "Check GHL holds on Miami Village Dental", department: "head_of_sales", params: { details: "check the hold tag" }, created_at: "2026-11-01T00:00:00Z" },
  { id: "a2", type: "owner_task", status: "pending", title: "Plumbing contacts", department: "head_of_operations", params: {}, created_at: "2026-11-01T00:00:00Z" }], team_settings: [] };
const PATCHES = [], TG = [];
let n = 0;
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase();
  if (u.includes("api.anthropic.com")) { n++; const text = n === 1 ? "Checked both.\nRESULT: DONE - Both contacts have the hold tag and no email was sent." : "RESULT: NEEDS_TY - Call Coolwater Plumbing on 07 1234 5678, no email on their site."; return Response.json({ content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10 } }); }
  if (u.includes("api.telegram.org")) { TG.push(String(init.body || "")); return Response.json({ ok: true, result: {} }); }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const q = decodeURIComponent(qs);
    if (m === "PATCH" && path === "team_actions") { const id = /id=eq\.(\w+)/.exec(q)[1]; const b = JSON.parse(init.body); PATCHES.push({ id, ...b }); const row = DB.team_actions.find((r) => r.id === id); Object.assign(row, b); return Response.json([row]); }
    if (m === "GET" && path === "team_actions" && /type=eq\.owner_task/.test(q)) return Response.json(DB.team_actions.filter((r) => r.status === "pending"));
    if (m === "GET" && path === "team_settings" && /key=eq\.telegram/.test(q)) return Response.json([]);
    return Response.json([]); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O };
const r = await w.fetch(new Request(O + "/api/v1/team/task-doer", { method: "POST", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: "{}" }), env, { waitUntil() {} });
const j = await r.json();
assert(j.ok && j.done === 1 && j.needs_ty === 1, "One to-do done by the AI, one handed back: " + JSON.stringify({ done: j.done, needs: j.needs_ty }));
assert(DB.team_actions[0].status === "done" && /Done by the AI/.test(DB.team_actions[0].result.note), "The done task leaves Ty's list with a note of what was done");
assert(DB.team_actions[1].status === "pending" && /^Call Coolwater Plumbing/.test(DB.team_actions[1].title) && DB.team_actions[1].params.ai_tried, "The one that needs Ty becomes a single clear line, and won't be retried");
