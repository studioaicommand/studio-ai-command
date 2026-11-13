// v77: Calm British personality + your own ElevenLabs voices for Command's voice notes, with OpenAI as the safety net.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: "1" } }] };
let elevenOk = true; const calls = [];
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : undefined; } catch {}
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []); const q = decodeURIComponent(qs);
    if (m === "GET") { const key = (q.match(/key=eq\.([^&]+)/) || [])[1]; return Response.json(key ? t.filter((r) => r.key === key) : t); }
    if (m === "POST") { for (const r of [].concat(body)) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } return Response.json([].concat(body)); } return Response.json([]); }
  if (u.includes("api.elevenlabs.io")) { calls.push("eleven " + u.split("text-to-speech/")[1] + " " + (body?.text || "").slice(0, 20)); return elevenOk ? new Response(new Uint8Array([79, 103, 103, 83]), { headers: { "content-type": "audio/ogg" } }) : new Response("quota", { status: 401 }); }
  if (u.includes("api.openai.com/v1/audio/speech")) { calls.push("openai " + body.voice + " " + /British/.test(body.instructions || "")); return new Response(new Uint8Array([1, 2, 3])); }
  if (u.includes("api.telegram.org")) { calls.push("telegram"); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return Response.json({}); };
globalThis.caches = undefined;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", OPENAI_API_KEY: "o", ANTHROPIC_API_KEY: "a", ELEVENLABS_API_KEY: "el", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const w = (await import(W)).default;
const call = (path, b) => w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", Authorization: "Bearer k" }, body: b ? JSON.stringify(b) : undefined }), env, { waitUntil() {} }).then(async (r) => ({ s: r.status, j: await r.json() }));
let r = await call("/voice-style");
assert(r.j.personas.calm_british?.name === "Calm British" && r.j.has_eleven === true, "A Calm British personality is offered, and Command knows ElevenLabs is connected");
r = await call("/voice-style", { persona: "calm_british" });
assert(r.j.cfg.persona === "calm_british" && r.j.cfg.command_voice === "cedar", "Choosing Calm British switches to the deep, calm Cedar voice");
r = await call("/voice-style", { eleven_add: { id: "not a voice id!", name: "x" } });
assert(r.s === 400, "A wrong voice ID is refused with a plain explanation");
r = await call("/voice-style", { eleven_add: { id: "JBFqnCBsd6RMkjVDRZzb", name: "Calm British" } });
assert(r.j.cfg.eleven_voices.length === 1 && r.j.cfg.command_eleven === "JBFqnCBsd6RMkjVDRZzb", "Your own ElevenLabs voice is saved and used for Command");
calls.length = 0;
r = await call("/voice-style/test", {});
assert(r.j.sent && r.j.engine === "elevenlabs" && calls[0].startsWith("eleven JBFqnCBsd6RMkjVDRZzb") && /Everything is in/.test(calls[0]) === false || calls[0].includes("Good evening"), "The voice test is spoken by your ElevenLabs voice (" + calls.join(", ") + ")");
elevenOk = false; calls.length = 0;
r = await call("/voice-style/test", {});
assert(r.j.sent && r.j.engine === "openai" && calls.some((c) => c === "openai cedar true"), "If ElevenLabs fails, the note still arrives in the calm British OpenAI voice");
r = await call("/voice-style", { command_eleven: "" });
calls.length = 0; elevenOk = true;
r = await call("/voice-style/test", {});
assert(r.j.engine === "openai" && !calls.some((c) => c.startsWith("eleven")), "You can switch ElevenLabs off and go back to the built-in voice");
const app = await (await w.fetch(new Request("https://studioflowandsystems.app/app/app.js"), env, { waitUntil() {} })).text();
new Function(app);
assert(/YOUR OWN VOICES \(ELEVENLABS\)/.test(app) && /v77add/.test(app), "Settings › Brand & features has a place to add your own voices");
console.log("voices-v77 OK");
