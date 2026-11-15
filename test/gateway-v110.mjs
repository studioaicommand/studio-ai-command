// v110 AI Gateway: Claude calls go through Cloudflare AI Gateway when switched on, straight to Anthropic otherwise or if it fails.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const src = (await import("node:fs")).readFileSync(W, "utf8");
const grab = (name) => { const i = src.indexOf("function " + name + "("); let d = 0, j = src.indexOf("{", src.indexOf(")", i)); for (let k = j; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}") { d--; if (!d) return src.slice(i, k + 1); } } };
const lib = new Function('var AIG_DIRECT = "https://api.anthropic.com/v1/messages";' + grab("aigTarget") + grab("aigInstall") + "; return { aigTarget, aigInstall };")();
const ACC = "0123456789abcdef0123456789abcdef";
assert(lib.aigTarget({}) === "" && lib.aigTarget({ AI_GATEWAY: "nonsense" }) === "", "Off unless AI_GATEWAY is set properly");
assert(lib.aigTarget({ AI_GATEWAY: ACC + "/command" }) === "https://gateway.ai.cloudflare.com/v1/" + ACC + "/command/anthropic", "Account id + gateway name becomes the gateway address");
assert(lib.aigTarget({ AI_GATEWAY: "https://gateway.ai.cloudflare.com/v1/" + ACC + "/command/anthropic/" }) === "https://gateway.ai.cloudflare.com/v1/" + ACC + "/command/anthropic", "Pasting the whole gateway URL from Cloudflare also works");

const calls = []; let mode = "ok";
const mock = async (u, init = {}) => { calls.push({ u, h: new Headers(init.headers || {}) });
  if (String(u).includes("gateway.ai.cloudflare.com")) { if (mode === "down") throw new Error("network"); if (mode === "401") return new Response(JSON.stringify({ success: false, error: [{ code: 2009, message: "Unauthorized" }] }), { status: 401 }); if (mode === "overloaded") return new Response(JSON.stringify({ type: "error", error: { type: "overloaded_error" } }), { status: 529 }); }
  return Response.json({ ok: true, via: String(u) }); };
// Plain property, like on Cloudflare (the test harness's schema checker uses a getter/setter).
Object.defineProperty(globalThis, "fetch", { value: mock, writable: true, configurable: true });
const base = globalThis.fetch;
lib.aigInstall({});
assert(globalThis.fetch === base, "Without the setting nothing changes");
lib.aigInstall({ AI_GATEWAY: ACC + "/command", AI_GATEWAY_TOKEN: "tok" });
let r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": "k" }, body: "{}" });
assert(calls.at(-1).u === "https://gateway.ai.cloudflare.com/v1/" + ACC + "/command/anthropic/v1/messages" && calls.at(-1).h.get("x-api-key") === "k" && calls.at(-1).h.get("cf-aig-authorization") === "Bearer tok" && /app/.test(calls.at(-1).h.get("cf-aig-metadata")), "Claude calls go through the gateway with the API key, gateway token and a label");
await fetch("https://api.telegram.org/botX/sendMessage", { method: "POST", body: "{}" });
assert(calls.at(-1).u.startsWith("https://api.telegram.org"), "Other calls (Telegram, GHL, Stripe) are untouched");
mode = "overloaded"; calls.length = 0;
r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", body: "{}" });
assert(r.status === 529 && calls.length === 1, "Anthropic's own errors (overloaded) are passed back as usual, not retried twice");
mode = "401"; calls.length = 0;
r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", body: "{}" });
assert(r.status === 200 && calls.length === 2 && calls[1].u === "https://api.anthropic.com/v1/messages", "Gateway misconfigured: the call still works, straight to Anthropic");
calls.length = 0; mode = "ok";
await fetch("https://api.anthropic.com/v1/messages", { method: "POST", body: "{}" });
assert(calls.length === 1 && calls[0].u.startsWith("https://api.anthropic.com"), "…and the gateway is skipped for the next 10 minutes");
globalThis.__sfAigDown = 0; mode = "down"; calls.length = 0;
r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", body: "{}" });
assert(r.status === 200 && calls.at(-1).u.startsWith("https://api.anthropic.com"), "Gateway unreachable: falls back to Anthropic directly");
lib.aigInstall({ AI_GATEWAY: ACC + "/command" }); const w1 = globalThis.fetch; lib.aigInstall({ AI_GATEWAY: ACC + "/command" });
assert(globalThis.fetch === w1, "Installs once (no wrapper stacking on every request)");
assert(/out\.ai_gateway = /.test(src) && /aigInstall\(env\); return SF_APP\.scheduled/.test(src) && /aigInstall\(env\); return SF_APP\.queue/.test(src), "Switched on for requests, the hourly run and queued AI jobs; shown in /health");
console.log("gateway-v110 OK");
