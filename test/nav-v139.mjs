// v139 simpler menu: 5 menus, 16 tabs for Ty; hidden pages still open by link; tab opens are counted.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
globalThis.fetch = async (u, init = {}) => { u = String(u); if (u.includes("sb.test/rest/v1/")) return Response.json([]); return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a", PUBLIC_ORIGIN: O };
const js = await (await w.fetch(new Request(O + "/app/app.js"), env, { waitUntil() {} })).text();
const hubs = js.slice(js.indexOf("const HUBS = ["), js.indexOf("const VIEW_HOST"));
const tabs = [...hubs.matchAll(/\["([a-z]+)", "[^"]+"\]/g)].map((m) => m[1]);
assert(hubs.match(/^\s*\["[a-z]+", "[^"]+", "[a-z]+", \[/gm).length === 5, "5 menus: Today, Sales, Clients, Studio AI, Settings");
assert(!tabs.includes("performance") && !tabs.includes("reports") && !tabs.includes("records"), "Performance, Reports and History are out of the menus");
assert(tabs.includes("chrome") && tabs.includes("fleet"), "Do it for me and Client Commands stay (Ty asked)");
assert(tabs.filter((t) => t !== "setup").length === 23, "Ty sees 23 tabs (was 23; v147 adds Google rankings, v148 Outreach chat, v149 Value, v150 Privacy & data) (Get set up only shows on client copies): " + tabs.length);
assert(/reports: "today", records: "today"/.test(js) && /performance: "team"/.test(js) && /href="#\/performance">Performance/.test(js) && /href="#\/reports">Reports/.test(js), "Hidden pages still open from links (Team > Performance, Today > Reports)");
assert(/team\('\/ui-usage'/.test(js), "Opening a page counts it");
const r = await w.fetch(new Request(O + "/api/v1/team/ui-usage", { method: "POST", headers: { Authorization: "Bearer k", "content-type": "application/json" }, body: JSON.stringify({ view: "dms" }) }), env, { waitUntil() {} });
assert((await r.json()).ok, "Tab opens are saved");
