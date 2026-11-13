// v87 Looks: four styles for Command (Midnight, Graphite, Ivory, Aurora); owner picks, everyone sees it; staff can't change it.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [], team_audit: [] };
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = JSON.parse(init.body); } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const key = (decodeURIComponent(qs).match(/key=eq\.([^&]+)/) || [])[1];
    if (m === "GET") return Response.json(key ? t.filter((r) => r.key === key) : t);
    if (m === "POST") { for (const r of [].concat(body)) { const i = r.key ? t.findIndex((x) => x.key === r.key) : -1; if (i >= 0) t[i] = r; else t.push(r); } return Response.json([].concat(body)); } return Response.json([]); }
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a" };
const call = (path, b, h = {}) => w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k", ...h }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then(async (r) => ({ s: r.status, j: await r.json() }));
let r = await call("/ui-theme");
assert(r.j.theme === "midnight", "Command starts on the Midnight look");
r = await call("/ui-theme", { theme: "ivory" });
assert(r.j.ok && (await call("/ui-theme")).j.theme === "ivory", "Choosing Ivory saves it for everyone on this Command");
r = await call("/ui-theme", { theme: "neon" });
assert(r.s === 400, "Only the four looks can be chosen");
const css = await (await w.fetch(new Request("https://studioflowandsystems.app/app/app.css"), env, { waitUntil() {} })).text();
assert(["graphite", "ivory", "aurora"].every((t) => css.includes("html[data-theme=" + t + "]")) && /\.v87-look/.test(css), "All four looks are in the stylesheet");
const app = await (await w.fetch(new Request("https://studioflowandsystems.app/app/app.js"), env, { waitUntil() {} })).text();
new Function(app);
assert(/Choose how Command looks/.test(app) && /applyLook/.test(app), "Settings › Brand & features has the look picker");
const html = await (await w.fetch(new Request("https://studioflowandsystems.app/command-next"), env, { waitUntil() {} })).text();
assert(/Fraunces/.test(html) && /Sora/.test(html), "The fonts for Ivory and Aurora are loaded");
console.log("looks-v87 OK");
