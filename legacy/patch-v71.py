# v71 security hardening: baseline security headers on every response, per-IP rate limits on public forms,
# no paid/leaky health checks for strangers, constant-time key checks.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# 1. Health checks: strangers get a plain "configured" answer; the live check (which costs an OpenAI call) needs the test key,
#    and raw database errors never leave the server.
rep('    if (request.method === "GET" && url.pathname === "/api/v1/ai/health") {\n      if (!env.OPENAI_API_KEY) return json({ ok: false, service: "openai", status: "missing_api_key" }, 500);',
    '    if (request.method === "GET" && url.pathname === "/api/v1/ai/health") {\n      if (!env.OPENAI_API_KEY) return json({ ok: false, service: "openai", status: "missing_api_key" }, 500);\n      if (!env.STUDIO_TEST_KEY || !sfKeyEq(request.headers.get("Authorization"), "Bearer " + env.STUDIO_TEST_KEY)) return json({ ok: true, service: "openai", status: "configured" });')
rep('        if (!response.ok) return json({ ok: false, service: "supabase", status: "connection_failed", supabase_status: response.status, error: await response.text() }, 502);',
    '        if (!response.ok) return json({ ok: false, service: "supabase", status: "connection_failed", supabase_status: response.status }, 502);')
rep('      } catch (error) { return json({ ok: false, service: "supabase", status: "connection_error", error: error.message }, 500); }',
    '      } catch (error) { return json({ ok: false, service: "supabase", status: "connection_error" }, 500); }')

# 2. Constant-time comparison for the test key
rep('if (request.headers.get("Authorization") !== "Bearer " + env.STUDIO_TEST_KEY) return json({ok:false,error:"Incorrect test key."},401);',
    'if (!env.STUDIO_TEST_KEY || !sfKeyEq(request.headers.get("Authorization"), "Bearer " + env.STUDIO_TEST_KEY)) return json({ok:false,error:"Incorrect test key."},401);', 2)

# 3. Wrap the whole Worker: security headers on every response + rate limits on public endpoints
rep('export default {\n', 'var SF_APP = {\n')
s += r'''
// ── v71 security layer: runs around every request ──
function sfKeyEq(a, b) {
  a = String(a || ""); b = String(b || "");
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
// Public endpoints a stranger can POST to, with how many requests one IP may make per 10 minutes.
// Webhooks (GHL, Stripe, Telegram, phone, inbox) are not listed: they're verified separately and can burst.
var SF_RATE = [
  [/^\/api\/v1\/onboard$/, 8],
  [/^\/api\/v1\/leak$/, 20],
  [/^\/api\/v1\/(members\/login|auth)\//, 30],
  [/^\/api\/v1\/(public|site|demo|w)\//, 120]
];
async function sfRateLimited(request) {
  if (request.method !== "POST" || typeof caches === "undefined" || !caches.default) return false;
  const p = new URL(request.url).pathname, rule = SF_RATE.find(([re]) => re.test(p));
  if (!rule) return false;
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "";
  if (!ip) return false;
  const win = Math.floor(Date.now() / 6e5);
  const bucket = String(rule[0]).replace(/[^a-z0-9]+/gi, "").slice(0, 40);
  const h = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "|" + bucket + "|" + win)))).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
  const key = new Request("https://rate.internal/" + h);
  try {
    const hit = await caches.default.match(key);
    const n = hit ? (parseInt(await hit.text(), 10) || 0) + 1 : 1;
    await caches.default.put(key, new Response(String(n), { headers: { "Cache-Control": "max-age=660" } }));
    return n > rule[1];
  } catch { return false; }
}
function sfHarden(res, request) {
  if (!(res instanceof Response) || res.status === 101 || res.webSocket) return res;
  let h; try { h = new Headers(res.headers); } catch { return res; }
  const set = (k, v) => { if (!h.has(k)) h.set(k, v); };
  set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  set("X-Content-Type-Options", "nosniff");
  set("Referrer-Policy", "strict-origin-when-cross-origin");
  set("X-Permitted-Cross-Domain-Policies", "none");
  const p = new URL(request.url).pathname, ct = h.get("Content-Type") || "";
  if (p.startsWith("/api/") && /json/i.test(ct)) set("Cache-Control", "no-store");
  // Pages without their own framing rules can't be framed by other sites (clickjacking), except embeds made to be framed.
  if (/text\/html/i.test(ct) && !/frame-ancestors/i.test(h.get("Content-Security-Policy") || "") && !/^\/(w|demo|embed|widget)\//.test(p)) set("X-Frame-Options", "SAMEORIGIN");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
export default {
  ...SF_APP,
  async fetch(request, env, ctx) {
    if (await sfRateLimited(request).catch(() => false)) return sfHarden(new Response(JSON.stringify({ ok: false, error: "Too many requests. Please wait a few minutes and try again." }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "600" } }), request);
    return sfHarden(await SF_APP.fetch(request, env, ctx), request);
  }
};
'''

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v71 applied')
