// v71 security: headers on every response, per-IP rate limits on public forms, no paid or leaky health checks for strangers,
// every private area refuses requests without the right key.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
let outbound = [];
globalThis.fetch = async (u) => { outbound.push(String(u)); return Response.json([]); };
const store = new Map();
globalThis.caches = { default: { match: async (r) => store.has(r.url) ? new Response(store.get(r.url)) : undefined, put: async (r, res) => { store.set(r.url, await res.text()); } } };
const w = (await import(W)).default;
const O = "https://studioflowandsystems.app";
const env = { SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", STUDIO_TEST_KEY: "right-key", ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", FLEET_TOKEN: "fleet", PUBLIC_ORIGIN: O };
const go = (p, init = {}) => w.fetch(new Request(O + p, init), env, { waitUntil() {} });

for (const p of ["/command-next", "/api/v1/team/summary", "/nope", "/health"]) {
  const r = await go(p);
  assert(/max-age=31536000/.test(r.headers.get("Strict-Transport-Security") || "") && r.headers.get("X-Content-Type-Options") === "nosniff" && r.headers.get("Referrer-Policy"), "Security headers on " + p + " (" + r.status + ")");
}
let r = await go("/api/v1/team/summary");
assert(r.status === 401 && r.headers.get("Cache-Control") === "no-store", "Private API refuses a request with no key, and says don't cache");
r = await go("/api/v1/team/summary", { headers: { Authorization: "Bearer wrong" } });
assert(r.status === 401, "Private API refuses a wrong key");
r = await go("/api/v1/sales/sessions", { headers: { Authorization: "Bearer right-ke" } });
assert(r.status === 401, "A nearly-right test key is refused");
r = await go("/api/v1/fleet/status", { headers: { Authorization: "Bearer nope" } });
assert(r.status === 404, "Studio console link to a client copy is invisible without its token");
outbound = [];
r = await go("/api/v1/ai/health");
assert(r.status === 200 && !outbound.some((u) => u.includes("openai")), "A stranger can't trigger a paid AI call through the health check");
env.COMMAND_2FA = "off";
r = await go("/api/v1/ai/health", { headers: { Authorization: "Bearer right-key" } });
assert(outbound.some((u) => u.includes("openai")), "Ty's test key still runs the live AI check");
globalThis.fetch = async (u) => new Response("relation leads has secret column x", { status: 500 });
r = await go("/api/v1/db/health");
assert(!/secret column/.test(await r.text()), "Database errors are never shown to strangers");

const form = () => go("/api/v1/onboard", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example", "CF-Connecting-IP": "203.0.113.7" }, body: "{}" });
let codes = [];
for (let i = 0; i < 10; i++) codes.push((await form()).status);
assert(codes.slice(0, 8).every((c) => c !== 429) && codes[8] === 429 && codes[9] === 429, "One IP can send the onboarding form 8 times per 10 minutes, then gets 'Too many requests' (" + codes.join(",") + ")");
r = await go("/api/v1/onboard", { method: "POST", headers: { "Content-Type": "application/json", "CF-Connecting-IP": "198.51.100.2" }, body: "{}" });
assert(r.status !== 429, "A different visitor isn't affected");
let login = [];
for (let i = 0; i < 31; i++) login.push((await go("/api/v1/auth/start", { method: "POST", headers: { "CF-Connecting-IP": "203.0.113.9" }, body: "{}" })).status);
assert(login[30] === 429, "Sign-in guessing from one IP is cut off after 30 tries in 10 minutes");
console.log("security-v71 OK");
