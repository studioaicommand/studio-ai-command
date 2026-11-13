// v80: client copies get the same voices and personalities, but never the "Jarvis" name.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "instance", value: { business_name: "Glow Lab Skin Clinic", product_name: "Glow Lab Command", owner_first: "Sarah", modules: {} } }] };
globalThis.fetch = async (u) => { u = String(u); if (u.includes("sb.test/rest/v1/")) { const q = decodeURIComponent(u.split("?")[1] || ""); const key = (q.match(/key=eq\.([^&]+)/) || [])[1]; return Response.json(key ? DB.team_settings.filter((r) => r.key === key) : []); } return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", ANTHROPIC_API_KEY: "a" };
const r = await (await w.fetch(new Request("https://glow.studioflowandsystems.app/api/v1/team/voice-style", { headers: { Authorization: "Bearer k" } }), env, { waitUntil() {} })).json();
assert(r.ok && !/Jarvis/.test(JSON.stringify(r)) && r.personas.jarvis.name === "Butler style" && r.voices[0].name === "Cedar" && r.personas.calm_british, "A client's Command shows Butler style and Cedar, never Jarvis; Calm British is there too");
const app = await (await w.fetch(new Request("https://glow.studioflowandsystems.app/app/app.js"), env, { waitUntil() {} })).text();
new Function(app);
assert(/The Butler style/.test(app), "The settings note says Butler style on client copies");
const dq = await w.fetch(new Request("https://glow.studioflowandsystems.app/api/v1/team/dm-queue", { headers: { Authorization: "Bearer k" } }), env, { waitUntil() {} });
assert(dq.status === 404, "v81: a client's Command has no DM Desk (it's Studio Flow's own outreach)");
const pf = await (await w.fetch(new Request("https://glow.studioflowandsystems.app/api/v1/team/performance", { headers: { Authorization: "Bearer k" } }), env, { waitUntil() {} })).json();
assert(pf.spec_count === 36 && !/dm_writer|Reply Coach/.test(JSON.stringify(pf)), "v81: a client's Full Company is still 8 heads + 36 specialists = 44 agents (" + pf.spec_count + ")");
console.log("whitelabel-voice-v80 OK");
