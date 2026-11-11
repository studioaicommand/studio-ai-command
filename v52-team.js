// ── v52: voice & personality (a Jarvis-style Command), spoken morning briefings on Telegram, and Away mode
// (Command runs things while Ty's away, holds everything that isn't urgent, and welcomes him back with a report). ──
var VOICES = [
  { id: "cedar", name: "Jarvis (Cedar)", note: "deep, calm, assured: the Jarvis voice" },
  { id: "ash", name: "Ash", note: "clear, confident male" },
  { id: "verse", name: "Verse", note: "warm, expressive male" },
  { id: "echo", name: "Echo", note: "steady, neutral male" },
  { id: "ballad", name: "Ballad", note: "smooth, gentle male" },
  { id: "marin", name: "Marin", note: "friendly, natural female (current default)" },
  { id: "coral", name: "Coral", note: "bright, upbeat female" },
  { id: "sage", name: "Sage", note: "calm, thoughtful female" },
  { id: "shimmer", name: "Shimmer", note: "soft, warm female" },
  { id: "alloy", name: "Alloy", note: "neutral, balanced" }
];
var PERSONAS = {
  jarvis: { name: "Jarvis style", desc: "Composed, quick and quietly witty. A brilliant right hand with a refined British voice.",
    text: "Jarvis style: composed, unflappable, quietly witty. A brilliant, loyal right hand. Lead with the answer and the number, then one recommendation. Anticipate the next need and say what you've already prepared. Dry, understated humour: at most one light line, never when news is bad and never at anyone's expense. Never grovel, never waffle, no exclamation marks.",
    voice: "Speak with a refined, warm British accent: measured pace, crisp consonants, calm and quietly amused, like a trusted butler who also runs the business." },
  warm: { name: "Warm & friendly", desc: "Down-to-earth Australian, encouraging and clear.", text: "Warm and down-to-earth: friendly Australian English, encouraging, clear and practical.", voice: "Speak in a warm, friendly, natural Australian voice at an easy pace." },
  coach: { name: "High-energy coach", desc: "Driven, direct, pushes for the number.", text: "High-energy coach: direct, driven and motivating. Keep the 20-calls mission front and centre, celebrate wins briefly, then push the next action.", voice: "Speak with energy and conviction, upbeat and punchy, but never shouting." },
  executive: { name: "Calm executive", desc: "Minimal, precise, board-room calm.", text: "Calm executive: minimal words, precise numbers, decisions first. No small talk.", voice: "Speak calmly and precisely, low and even, like a seasoned chief of staff." }
};
var VOICE_DEFAULT = { command_voice: "marin", persona: "warm", receptionist_voice: "marin", briefing_voice_note: false, client_voices: {}, away: null };
async function voiceCfg(env) {
  const r = await select(env, "team_settings", "key=eq.voice_style&select=value&limit=1").catch(() => []);
  const v = { ...VOICE_DEFAULT, ...(r?.[0]?.value || {}) };
  if (!VOICES.some((x) => x.id === v.command_voice)) v.command_voice = "marin";
  if (!VOICES.some((x) => x.id === v.receptionist_voice)) v.receptionist_voice = "marin";
  if (!PERSONAS[v.persona]) v.persona = "warm";
  v.client_voices = v.client_voices && typeof v.client_voices === "object" ? v.client_voices : {};
  return v;
}
function personaBlock(cfg, mode = "text") {
  const p = PERSONAS[cfg.persona] || PERSONAS.warm;
  return `\n\n=== YOUR PERSONALITY (Ty chose this) ===\n${p.text}${mode === "voice" ? "\n" + p.voice : ""}${awayActive(cfg) ? `\n\nTy is AWAY until ${fmtBne(cfg.away.until)}${cfg.away.note ? " (" + cfg.away.note + ")" : ""}. Handle everything you can within the rules, keep client-facing and money actions in the approval queue for his return, and only interrupt him for something genuinely urgent.` : ""}`;
}
var awayActive = (cfg) => !!(cfg?.away?.until && Date.parse(cfg.away.until) > Date.now());
// Text to speech (OpenAI), returned as OGG/Opus so Telegram plays it as a voice note.
async function ttsOgg(env, text, voice, instructions) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY isn't set.");
  const r = await fetch("https://api.openai.com/v1/audio/speech", { method: "POST", headers: { Authorization: "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ model: env.TTS_MODEL || "gpt-4o-mini-tts", voice, input: String(text).slice(0, 3800), instructions, response_format: "opus" }), signal: AbortSignal.timeout(6e4) });
  if (!r.ok) throw new Error("Voice generation failed (HTTP " + r.status + ").");
  return await r.arrayBuffer();
}
async function tgVoice(env, buf, caption = "") {
  const settings = await getSettings(env).catch(() => null);
  if (!telegramReady(env, settings)) return { sent: false, reason: "telegram not linked" };
  const form = new FormData();
  form.set("chat_id", String(settings.telegram.chat_id));
  form.set("voice", new Blob([buf], { type: "audio/ogg" }), "briefing.ogg");
  if (caption) { form.set("caption", String(caption).slice(0, 1000)); form.set("parse_mode", "HTML"); }
  const r = await fetch(API2(env, "sendVoice"), { method: "POST", body: form, signal: AbortSignal.timeout(3e4) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error("Telegram sendVoice: " + (j.description || r.status));
  return { sent: true };
}
var SPOKEN_TOOL = { name: "save_script", description: "Save the spoken script.", input_schema: { type: "object", properties: { script: { type: "string", description: "What to say, 90 to 160 words, written to be heard: short sentences, numbers said naturally, no lists, no links, no markdown." }, headline: { type: "string", description: "One line for the caption." } }, required: ["script", "headline"] } };
async function spokenBrief(env, cfg, source, kind = "morning") {
  const p = PERSONAS[cfg.persona] || PERSONAS.warm;
  const u = wsdUsage();
  const out = await wsdAsk(env, u, "fast", { max_tokens: 900, system: `You turn Ty's ${kind === "back" ? "welcome-back report" : "morning briefing"} into a short spoken voice note from his AI, Studio AI Command. Personality: ${p.text} Speak to Ty directly. Open with the single most important thing, then the mission number (booked calls this week vs target), what needs his yes, and the one action that makes the most money today. Facts only from the text given.`, tools: [SPOKEN_TOOL], messages: [{ role: "user", content: String(source).slice(0, 9000) + "\n\nWrite the voice note and call save_script." }] }, "save_script");
  await wsdLog(env, u, kind === "back" ? "voice_welcome_back" : "voice_briefing").catch(() => {});
  if (!out?.script) throw new Error("Couldn't write the voice note.");
  return out;
}
async function voiceBriefing(env, reportText, { force = false } = {}) {
  const cfg = await voiceCfg(env);
  if (!force && !cfg.briefing_voice_note) return { skipped: "voice notes off" };
  if (!force && awayActive(cfg)) { await awayHold(env, "Morning briefing: " + String(reportText).slice(0, 500)); return { skipped: "away" }; }
  const s = await spokenBrief(env, cfg, reportText);
  const buf = await ttsOgg(env, s.script, cfg.command_voice, (PERSONAS[cfg.persona] || PERSONAS.warm).voice);
  return tgVoice(env, buf, "\u{1F399} <b>" + esc6(s.headline) + "</b>");
}
// ── Away mode: hold everything that isn't urgent, then a welcome-back report ──
async function awayHold(env, text) {
  const cfg = await voiceCfg(env).catch(() => null);
  if (!awayActive(cfg)) return false;
  const r = await select(env, "team_settings", "key=eq.away_digest&select=value&limit=1").catch(() => []);
  const items = Array.isArray(r?.[0]?.value?.items) ? r[0].value.items : [];
  items.push({ at: new Date().toISOString(), text: String(text).replace(/<[^>]+>/g, "").slice(0, 600) });
  await saveSetting(env, "away_digest", { items: items.slice(-80) }).catch(() => {});
  return true;
}
async function awayTick(env, { now: forceNow = false } = {}) {
  const cfg = await voiceCfg(env);
  if (!cfg.away?.until || awayActive(cfg) || cfg.away.welcomed) return { skipped: true };
  const hr = brisbaneNow().hour;
  if (!forceNow && (hr < 7 || hr >= 21)) return { skipped: "waiting for morning" };
  const r = await select(env, "team_settings", "key=eq.away_digest&select=value&limit=1").catch(() => []);
  const items = Array.isArray(r?.[0]?.value?.items) ? r[0].value.items : [];
  const since = cfg.away.from || new Date(Date.now() - 3 * 864e5).toISOString();
  const [jobsDone, waiting] = await Promise.all([
    select(env, "studio_command_jobs", `updated_at=gte.${since}&status=eq.done&select=department,title&limit=200`).catch(() => []),
    select(env, "team_actions", "status=eq.pending&select=id&limit=500").catch(() => [])
  ]);
  const g = await goalStatus(env, { fresh: true }).catch(() => null);
  const text = `WHILE TY WAS AWAY (${fmtBne(since)} to ${fmtBne(cfg.away.until)}):\nBooked calls this week: ${g ? g.booked + " of " + g.goal : "unknown"}.\nAI jobs finished: ${jobsDone.length}${jobsDone.length ? " (" + [...new Set(jobsDone.map((j) => DEPARTMENTS[j.department]?.name || j.department))].join(", ") + ")" : ""}.\nWaiting for his yes in the Inbox: ${waiting.length}.\nHeld messages (${items.length}):\n${items.slice(-40).map((x) => "- " + x.text).join("\n") || "(none)"}`;
  let sent = false;
  try {
    const s = await spokenBrief(env, cfg, text, "back");
    const buf = await ttsOgg(env, s.script, cfg.command_voice, (PERSONAS[cfg.persona] || PERSONAS.warm).voice);
    await tgVoice(env, buf, "\u{1F44B} <b>Welcome back.</b> " + esc6(s.headline));
    sent = true;
  } catch (e) { /* fall back to text */ }
  if (!sent) await notify(env, "\u{1F44B} <b>Welcome back.</b>\n" + esc6(text.slice(0, 3000)), { urgent: true }).catch(() => {});
  await saveSetting(env, "voice_style", { ...cfg, away: { ...cfg.away, welcomed: true } });
  await saveSetting(env, "away_digest", { items: [] }).catch(() => {});
  return { ok: true, held: items.length };
}
async function v52Route(p, m, body, env) {
  const J = (o, st = 200) => json(o, st);
  if (p === "/voice-style" && m === "GET") { const cfg = await voiceCfg(env); return J({ ok: true, cfg, voices: VOICES, personas: Object.fromEntries(Object.entries(PERSONAS).map(([k, v]) => [k, { name: v.name, desc: v.desc }])), away: awayActive(cfg), has_openai: !!env.OPENAI_API_KEY }); }
  if (p === "/voice-style" && m === "POST") {
    const cfg = await voiceCfg(env), next = { ...cfg };
    if (body.command_voice && VOICES.some((x) => x.id === body.command_voice)) next.command_voice = body.command_voice;
    if (body.receptionist_voice && VOICES.some((x) => x.id === body.receptionist_voice)) next.receptionist_voice = body.receptionist_voice;
    if (body.persona && PERSONAS[body.persona]) { if (body.persona === "jarvis" && cfg.persona !== "jarvis" && !body.command_voice) next.command_voice = "cedar"; next.persona = body.persona; }
    if (typeof body.briefing_voice_note === "boolean") next.briefing_voice_note = body.briefing_voice_note;
    if (body.client_id && (body.client_voice === null || VOICES.some((x) => x.id === body.client_voice))) { next.client_voices = { ...cfg.client_voices }; if (body.client_voice === null) delete next.client_voices[body.client_id]; else next.client_voices[String(body.client_id).slice(0, 60)] = body.client_voice; }
    await saveSetting(env, "voice_style", next);
    return J({ ok: true, cfg: next });
  }
  if (p === "/voice-style/test" && m === "POST") {
    const cfg = await voiceCfg(env), pz = PERSONAS[cfg.persona] || PERSONAS.warm;
    const line = cfg.persona === "jarvis" ? "Good evening, Ty. Systems are running, the team has the week in hand, and I've lined up today's calls in order of who's most likely to say yes. Shall we?" : cfg.persona === "coach" ? "Ty! Here's where we're at: let's lock in today's calls and push this week's number. You've got this." : cfg.persona === "executive" ? "Ty. Three items need your decision today. I've ranked them by value. The first is waiting in your inbox." : "Hey Ty, this is your Command. The team's working away, and I've got today's priorities ready whenever you are.";
    const buf = await ttsOgg(env, line, String(body.voice || cfg.command_voice), pz.voice);
    return J({ ok: true, ...(await tgVoice(env, buf, "\u{1F399} Voice test: <b>" + esc6((VOICES.find((v) => v.id === (body.voice || cfg.command_voice)) || {}).name || "") + "</b> · " + esc6(pz.name))) });
  }
  if (p === "/away" && m === "POST") {
    const cfg = await voiceCfg(env);
    if (body.off) { await saveSetting(env, "voice_style", { ...cfg, away: cfg.away ? { ...cfg.away, until: new Date().toISOString() } : null }); const back = await awayTick(env, { now: true }).catch(() => null); return J({ ok: true, away: false, back }); }
    const until = Date.parse(body.until || "");
    if (!(until > Date.now() + 36e5 && until < Date.now() + 31 * 864e5)) return J({ ok: false, error: "Pick a return time between an hour and a month away." }, 400);
    await saveSetting(env, "voice_style", { ...cfg, away: { from: new Date().toISOString(), until: new Date(until).toISOString(), note: String(body.note || "").slice(0, 120), welcomed: false } });
    await saveSetting(env, "away_digest", { items: [] }).catch(() => {});
    return J({ ok: true, away: true, until: new Date(until).toISOString() });
  }
  return null;
}

async function clientVoiceFor(env, c) {
  const cfg = await voiceCfg(env).catch(() => VOICE_DEFAULT);
  return (c && cfg.client_voices?.[c.id]) || (cfg.receptionist_voice !== "marin" ? cfg.receptionist_voice : (env.CLIENT_VOICE || env.DEMO_VOICE || "marin"));
}
