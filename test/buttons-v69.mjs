// v69 button audit: Today can't crash on an untitled approval, client copies show THEIR name/colours (never Studio's logo),
// no dead nav links or empty buttons, dialogs close on navigation, approvals say what they are.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_actions: [{ id: "a1", type: "ghl_task", status: "pending", params: {}, created_at: "2026-11-01T00:00:00Z" }, { id: "a2", type: "ghl_email", status: "pending", title: "Email Jo", params: {}, created_at: "2026-11-01T00:00:00Z" }], team_settings: [] };
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase();
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { const key = (q.match(/key=eq\.([^&]+)/) || [])[1]; if (key) return Response.json(t.filter((r) => r.key === key)); if (path === "team_actions" && /status=in\.\(pending/.test(q)) return Response.json(t); return Response.json(path === "team_actions" ? [] : t); }
    if (m === "POST") { const body = JSON.parse(init.body); for (const r of [].concat(body)) { const i = t.findIndex((x) => x.key && x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } return Response.json([].concat(body)); }
    return Response.json([]); }
  return Response.json({}); };
globalThis.caches = undefined;
let w = (await import(W)).default;
const O = "https://glowlab.studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O };
const ctx = { waitUntil() {} };
const get = (p, key = "k") => w.fetch(new Request(O + p, { headers: key ? { Authorization: "Bearer " + key } : {} }), env, ctx);

let r = await get("/api/v1/team/workday");
const j = await r.json();
assert(r.status === 200 && j.items?.some((x) => x.action_id === "a1" && x.business_name === "Approval"), "Today loads even when an approval has no title (was a crash: 500)");

DB.team_settings.push({ key: "instance", value: { business_name: "Glow Lab Skin Clinic", product_name: "Glow Lab Command", owner_first: "Sarah", colours: { primary: "#a0766a", accent: "#e8c9b5" }, modules: {} } });
w = (await import(W + "?client")).default;
r = await get("/app/logo.webp", "");
let t = await r.text();
assert(r.status === 200 && /svg/.test(r.headers.get("content-type")) && /Glow Lab Skin Clinic/.test(t) && /#a0766a/.test(t) && !/Studio Flow/i.test(t), "A client copy with no logo uploaded shows THEIR name in their colour, not Studio Flow's logo");
r = await get("/app/mark.webp", "");
t = await r.text();
assert(/>GL</.test(t) && /#a0766a/.test(t), "Its small mark is their initials in their colour");

const app = await (await get("/app/app.js", "")).text();
assert(/instBrandCss/.test(app) && /hue-rotate/.test(app), "Buttons, headline and the orb take the client's brand colours");
assert(/HUBS\.splice\(hi, 1\)/.test(app) && /\[data-tab="' \+ h\[0\]/.test(app), "A section with every screen switched off (Growth on a client copy) is removed, not left as a link that bounces home");
assert(/addEventListener\("hashchange", onHash\)/.test(app), "An open dialog closes when you move to another page, so it can't block the buttons underneath");
assert(/Type the rule first/.test(app), "Performance › Add with an empty box points you to the box instead of doing nothing");
assert(/INST_OFF\.has\('growth'\) \? Promise\.resolve\(\[\]\) : D\.calls\(\)/.test(app), "Client Home no longer requests switched-off call lists and campaigns");
assert(/otherTxt/.test(app) && !/" other approvals"/.test(app) && !/Immediate job runner is not connected/.test(app), "Approvals say what they are (\"1 task · 1 email\"), and no developer warnings show to owners");
assert(/FULL COMPANY · ' \+ all \+ ' AI AGENTS/.test(app) && /CORE TEAM · ' \+ n \+ ' AI AGENTS/.test(app) && /specialists: ' \+ L\.map/.test(app), "Team shows the client their plan: Core Team (8 agents) or Full Company (44 agents, each head's specialists listed)");
assert(/@\?studioflowandsystems\/gi, INST\.business_name/.test(app) && /f && !INST_OFF\.has\('growth'\) \? '<section class="wf-glass"><h3>This week/.test(app), "Client copies never show Studio's handle or Studio's outreach funnel");
new Function(app);
assert(true, "The app script still parses");
console.log("buttons-v69 OK");
