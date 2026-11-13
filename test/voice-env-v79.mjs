// v79: Command's live voice and the website Studio AI follow the voice chosen in Command, even when the database address
// is stored under the older SUPABASS_URL name in Cloudflare (that made Command fall back to the default female voice).
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const sent = [];
globalThis.fetch = async (u, init = {}) => { u = String(u);
  if (u.includes("realtime/calls")) { sent.push(JSON.parse(String(init.body.get("session")))); return new Response("v=0 answer", { status: 201, headers: { location: "/v1/realtime/calls/x" } }); }
  if (u.includes("sb.test")) return Response.json(u.includes("voice_style") ? [{ key: "voice_style", value: { command_voice: "cedar", persona: "calm_british" } }] : []);
  return Response.json({}); };
globalThis.caches = undefined;
const w = (await import(W)).default;
const env = { SUPABASS_URL: "https://sb.test/", SUPABASE_SECRET_KEY: "s", OPENAI_API_KEY: "o", ANTHROPIC_API_KEY: "a", STUDIO_TEST_KEY: "k", COMMAND_2FA: "off" };
const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/operator/voice", { method: "POST", headers: { Authorization: "Bearer k", "Content-Type": "application/sdp" }, body: "v=0\r\nm=audio 9" }), env, { waitUntil() {} });
assert(r.status === 200 && sent[0]?.audio?.output?.voice === "cedar", "Talking to Studio AI in Command uses the voice you chose (Cedar), not the default female voice");
assert(/very calm, refined British/.test(sent[0].instructions), "…and speaks in the Calm British style");
console.log("voice-env-v79 OK");
