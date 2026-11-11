// v52 voice & personality, spoken briefings, Away mode.
const W = process.argv[2] || "/home/claude/w/worker.mjs";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("✓", m); };
const DB = { team_settings: [{ key: "telegram", value: { chat_id: 42 } }], team_usage: [], team_actions: [], studio_command_jobs: [] };
let seq = 0; const tts = [], voiceNotes = [], tgs = [], asks = [];
const match = (r, qs) => [...new URLSearchParams(qs)].filter(([k]) => !["select", "limit", "order", "offset", "or", "on_conflict"].includes(k)).every(([k, v]) => { const m = v.match(/^(eq|neq|in|is)\.(.*)$/); if (!m) return true; const val = String(r[k] ?? ""); if (m[1] === "eq") return val === m[2]; if (m[1] === "neq") return val !== m[2]; if (m[1] === "is") return m[2] === "null" ? r[k] == null : true; return true; });
globalThis.fetch = async (u, init = {}) => { u = String(u); const m = (init.method || "GET").toUpperCase(); let body; try { body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body; } catch { body = init.body; }
  if (u.includes("sb.test/rest/v1/")) { const [path, qs = ""] = u.split("/rest/v1/")[1].split("?"); const t = DB[path] || (DB[path] = []);
    if (m === "GET") return Response.json(t.filter((r) => match(r, decodeURIComponent(qs))));
    if (m === "POST") { const rows = [].concat(body).map((r) => ({ id: "id" + (++seq), created_at: new Date().toISOString(), ...r })); if (path === "team_settings") { for (const r of rows) { const i = t.findIndex((x) => x.key === r.key); if (i >= 0) t[i] = r; else t.push(r); } } else t.push(...rows); return Response.json(rows); }
    if (m === "PATCH") { const rows = t.filter((r) => match(r, decodeURIComponent(qs))); rows.forEach((r) => Object.assign(r, body)); return Response.json(rows); } return Response.json([]); }
  if (u.includes("api.openai.com/v1/audio/speech")) { tts.push(body); return new Response(new Uint8Array([79, 103, 103, 83]), { headers: { "content-type": "audio/ogg" } }); }
  if (u.includes("api.anthropic.com")) { asks.push(body); const names = (body.tools || []).map((t) => t.name);
    if (names.includes("save_scout_ideas")) return Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name: "save_scout_ideas", input: { ideas: [{ title: "Send a scroll video in email 1", seen_at: "Azaris", source_url: "https://example.test/a", what_they_do: "They send video.", our_version: "We send a 10-second scroll video of the concept.", area: "outreach", department: "head_of_marketing", bookings_impact: 4, effort: 2 }] } }], stop_reason: "tool_use", usage: { input_tokens: 500, output_tokens: 100, server_tool_use: { web_search_requests: 1 } } });
    if (names.includes("save_script")) return Response.json({ content: [{ type: "tool_use", id: "t" + (++seq), name: "save_script", input: { script: "Good morning, Ty. Three calls booked of twenty.", headline: "3 of 20 booked" } }], stop_reason: "tool_use", usage: { input_tokens: 500, output_tokens: 100 } });
    return Response.json({ content: [{ type: "text", text: "Morning, Ty. Here's the day." }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 10 } }); }
  if (u.includes("api.telegram.org")) { if (u.endsWith("/sendVoice")) { voiceNotes.push({ chat: body.get("chat_id"), caption: body.get("caption"), voice: body.get("voice") }); return Response.json({ ok: true }); } tgs.push(body?.text || ""); return Response.json({ ok: true, result: { message_id: 1 } }); }
  return new Response("", { status: 404 }); };
let NOW = Date.parse("2026-11-10T01:00:00Z"); const realDate = Date;
globalThis.Date = class extends realDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
const w = (await import(W)).default;
const env = { COMMAND_2FA: "off", STUDIO_TEST_KEY: "k", SUPABASE_URL: "https://sb.test", SUPABASE_SECRET_KEY: "s", SUPABASE_SERVICE_ROLE_KEY: "s", ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", TELEGRAM_BOT_TOKEN: "t", PUBLIC_ORIGIN: "https://studioflowandsystems.app" };
const waits = []; const ctx = { waitUntil: (p) => waits.push(p) }; const flush = async () => { while (waits.length) await waits.shift(); };
const callAbs = async (path, b) => { const r = await w.fetch(new Request("https://studioflowandsystems.app" + path, { method: "POST", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: JSON.stringify(b) }), env, ctx); await flush(); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const call = async (path, b, key = "k") => { const r = await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team" + path, { method: b ? "POST" : "GET", headers: { ...(key ? { Authorization: "Bearer " + key } : {}), "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }), env, ctx); await flush(); return { s: r.status, j: await r.json() }; };
const st = (k) => DB.team_settings.find((r) => r.key === k)?.value;

let x = await call("/voice-style", null, "");
assert(x.s === 401, "Voice settings need the Studio key");
x = await call("/voice-style");
assert(x.j.cfg.persona === "warm" && x.j.cfg.command_voice === "marin" && x.j.voices.length === 10 && x.j.personas.jarvis && x.j.has_openai, "Defaults: warm persona, Marin voice, 10 voices, Jarvis style on offer");
x = await call("/voice-style", { persona: "jarvis", command_voice: "cedar", receptionist_voice: "sage", briefing_voice_note: true, bogus: 1 });
assert(st("voice_style").persona === "jarvis" && st("voice_style").command_voice === "cedar" && st("voice_style").receptionist_voice === "sage" && st("voice_style").briefing_voice_note === true && !("bogus" in st("voice_style")), "Saving Jarvis style + Cedar + Sage receptionist + voice notes");
x = await call("/voice-style", { command_voice: "darth" });
assert(st("voice_style").command_voice === "cedar", "Unknown voices are ignored");
x = await call("/voice-style/test", {});
assert(x.j.sent && voiceNotes.length === 1 && tts[0].voice === "cedar" && /British/.test(tts[0].instructions) && tts[0].response_format === "opus" && /Good evening, Ty/.test(tts[0].input), "Test voice note: Cedar, British Jarvis delivery, sent to Telegram as a voice note");
assert(voiceNotes[0].chat === "42" && /Cedar/.test(voiceNotes[0].caption), "Voice note goes to Ty's chat with a caption");

// Command chat carries the personality
const before = asks.length;
x = await callAbs("/api/v1/operator/chat", { message: "how are we going?" });
const sys = JSON.stringify(asks.slice(before).map((a) => a.system));
assert(/YOUR PERSONALITY/.test(sys) && /Jarvis style/.test(sys), "Command chat answers in the chosen personality");

// Spoken morning briefing (the briefing writes a team report, then a voice note)
const vn = voiceNotes.length;
const bf = await call("/run/briefing", {});
assert(voiceNotes.length === vn + 1 && /3 of 20 booked/.test(voiceNotes.at(-1).caption), "Morning briefing also arrives as a spoken voice note");

// Away mode
x = await call("/away", { until: new realDate(NOW + 600).toISOString() });
assert(x.s === 400, "Away needs a return time at least an hour out");
x = await call("/away", { until: new realDate(NOW + 2 * 864e5).toISOString(), note: "camping" });
assert(x.j.away && st("voice_style").away.note === "camping", "Away mode on until Thursday");
x = await call("/voice-style");
assert(x.j.away === true, "Status shows away");
const held0 = tgs.length;
const mod = await import(W);
x = await callAbs("/api/v1/operator/chat", { message: "status" });
assert(/AWAY until/.test(JSON.stringify(asks.at(-1).system)), "Command knows Ty is away and only interrupts if urgent");
// a normal notification is held, an urgent one gets through
await w.fetch(new Request("https://studioflowandsystems.app/api/v1/team/scout/run", { method: "POST", headers: { Authorization: "Bearer k", "Content-Type": "application/json" }, body: "{}" }), env, ctx).catch(() => {}); await flush();
await call("/run/briefing", {});
console.log("held:", st("away_digest")?.items?.length, "telegram texts while away:", tgs.length - held0);
assert(st("away_digest").items.length >= 1 && tgs.length === held0, "While away, non-urgent Telegram messages are held, not sent");
// Come back
NOW += 3 * 864e5; // past the return time, 11am Brisbane
const sc = w.scheduled ? await w.scheduled({ cron: "*/15 * * * *", scheduledTime: NOW }, env, ctx) : null; await flush();
assert(st("voice_style").away.welcomed === true, "After the return time Command sends the welcome-back report");
assert(voiceNotes.some((v) => /Welcome back/.test(v.caption || "")), "Welcome back arrives as a voice note");
assert((st("away_digest").items || []).length === 0, "Held messages are cleared after the report");
// receptionist voice is used
const src = (await import("node:fs")).readFileSync(W, "utf8");
assert(/output: \{ voice: await clientVoiceFor\(env, c\) \}/.test(src) && /output: \{ voice: vcfg.command_voice/.test(src), "Realtime calls use the chosen Command and receptionist voices");
console.log("v52 voice OK");
