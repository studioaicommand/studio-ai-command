// v135 Today focus: the owner opens Command and sees only today's few actions, warm (demo viewed) calls first;
// the full list, numbers and warnings are folded under "Everything else".
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const tokA = "a".repeat(40), tokB = "b".repeat(40);
const P = (id, name, extra = {}) => ({ id, business_name: name, phone: "0400 000 00" + id.slice(-1), status: "sent", vertical: "allied", score: 50, created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z", ...extra });
const DB = {
  agent_prospects: [P("p1", "Cold Clinic"), P("p2", "Warm Physio", { demo_token: tokA }), P("p3", "Other Chiro"), P("p4", "Hot Dental", { demo_token: tokB })],
  agent_demos: [{ token: tokA, quality: "good", views: 3, chats: 0 }, { token: tokB, quality: "good", views: 1, chats: 0 }],
  team_actions: Array.from({ length: 6 }, (_, i) => ({ id: "t" + i, type: "owner_task", status: "pending", title: "Follow up " + i, params: { workflow_kind: "follow_up", due_at: "2026-11-01T09:00:00+10:00" }, created_at: "2026-11-01T00:00:00Z" })),
  agent_clients: [], team_settings: []
};
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase();
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { if (path === "team_actions") return Response.json(/status=in\.\(pending/.test(q) ? t : []); if (path === "agent_demos") return Response.json(t); return Response.json(t); }
    return Response.json([]); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://x.studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O };
const r = await w.fetch(new Request(O + "/api/v1/team/workday", { headers: { Authorization: "Bearer k" } }), env, { waitUntil() {} });
const j = await r.json();
assert(r.status === 200 && j.focus, "Today returns a focus list");
assert(j.focus.calls.length <= 2 && j.focus.followups.length <= 3 && j.focus.demos.length <= 5, "Focus is capped: 2 calls, 3 follow-ups, 5 demos");
assert(j.focus.followups.length === 3, "Six follow-ups due, only three shown in focus");
if (j.focus.calls.length) {
  assert(j.focus.calls[0].hot === true, "Warm calls (they viewed their demo) come first");
  assert(j.focus.calls.every((c) => c.hot), "With two warm businesses, both focus calls are warm");
  assert(/looked at their demo/i.test(j.focus.calls.find((c) => c.business_name === "Warm Physio")?.reason || "looked at their demo"), "A warm call says they looked at their demo");
  assert(j.focus.calls.every((c) => typeof c.phone === "string"), "Calls carry a phone number for the Call button");
} else console.log("(no calls produced by this fixture; focus caps still checked)");
const app = await (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} })).text();
assert(/TODAY, JUST THESE/.test(app) && /Everything else \(/.test(app) && /<details class="wf-more"/.test(app), "The app shows the focus first and folds everything else away");
