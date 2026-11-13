# v77 voices: a "Calm British" personality (very calm, refined, unhurried) and your own ElevenLabs voices
# (add any voice ID, pick one for Command's voice notes; falls back to the OpenAI voice if ElevenLabs fails).
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

rep('''  warm: { name: "Warm & friendly",''', '''  calm_british: { name: "Calm British", desc: "Very calm, refined and reassuring. Unhurried, soft-spoken, gently witty.",
    text: "Calm British: very calm, refined and reassuring, like an unflappable English butler who quietly runs everything. Short, measured sentences. Lead with the answer, then one recommendation. Gentle, understated wit at most once. Never rushed, never excited, never loud.",
    voice: "Speak with a very calm, refined British accent (Received Pronunciation). Slow, soft and unhurried, low and warm, with gentle pauses between sentences. Reassuring and quietly amused. Never excited, never loud, never rushed." },
  warm: { name: "Warm & friendly",''')
rep('var VOICE_DEFAULT = { command_voice: "marin", persona: "warm", receptionist_voice: "marin", briefing_voice_note: false, client_voices: {}, away: null };',
    'var VOICE_DEFAULT = { command_voice: "marin", persona: "warm", receptionist_voice: "marin", briefing_voice_note: false, client_voices: {}, away: null, eleven_voices: [], command_eleven: "" };')
rep('''  v.client_voices = v.client_voices && typeof v.client_voices === "object" ? v.client_voices : {};
  return v;''', '''  v.client_voices = v.client_voices && typeof v.client_voices === "object" ? v.client_voices : {};
  v.eleven_voices = Array.isArray(v.eleven_voices) ? v.eleven_voices.filter((x) => x && /^[A-Za-z0-9]{10,40}$/.test(x.id)).slice(0, 12) : [];
  if (!v.eleven_voices.some((x) => x.id === v.command_eleven)) v.command_eleven = "";
  return v;''')

# ElevenLabs speech, then Telegram; any failure falls back to the OpenAI voice so a voice note always arrives.
rep('async function tgVoice(env, buf, caption = "") {', '''async function elevenOgg(env, text, voiceId) {
  const r = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(voiceId) + "?output_format=opus_48000_64", { method: "POST", headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json", Accept: "audio/ogg" }, body: JSON.stringify({ text: String(text).slice(0, 4500), model_id: env.ELEVENLABS_MODEL || "eleven_multilingual_v2", voice_settings: { stability: 0.62, similarity_boost: 0.8, style: 0.12, use_speaker_boost: true } }), signal: AbortSignal.timeout(6e4) });
  if (!r.ok) throw new Error("ElevenLabs " + r.status + ": " + (await r.text().catch(() => "")).slice(0, 160));
  return await r.arrayBuffer();
}
async function sayOnTelegram(env, cfg, text, instructions, caption, voice) {
  const el = env.ELEVENLABS_API_KEY && cfg.command_eleven && !voice ? cfg.command_eleven : "";
  if (el) {
    try { return { ...(await tgVoice(env, await elevenOgg(env, text, el), caption)), engine: "elevenlabs" }; }
    catch (e) { console.error("elevenlabs voice note:", e.message); }
  }
  return { ...(await tgVoice(env, await ttsOgg(env, text, voice || cfg.command_voice, instructions), caption)), engine: "openai" };
}
async function tgVoice(env, buf, caption = "") {''')
rep('''  const buf = await ttsOgg(env, s.script, cfg.command_voice, (PERSONAS[cfg.persona] || PERSONAS.warm).voice);
  return tgVoice(env, buf, "\\u{1F399} <b>" + esc6(s.headline) + "</b>");''', '''  return sayOnTelegram(env, cfg, s.script, (PERSONAS[cfg.persona] || PERSONAS.warm).voice, "\\u{1F399} <b>" + esc6(s.headline) + "</b>");''')
rep('''    const buf = await ttsOgg(env, s.script, cfg.command_voice, (PERSONAS[cfg.persona] || PERSONAS.warm).voice);
    await tgVoice(env, buf, "\\u{1F44B} <b>Welcome back.</b> " + esc6(s.headline));''', '''    await sayOnTelegram(env, cfg, s.script, (PERSONAS[cfg.persona] || PERSONAS.warm).voice, "\\u{1F44B} <b>Welcome back.</b> " + esc6(s.headline));''')
rep('''    if (body.persona && PERSONAS[body.persona]) { if (body.persona === "jarvis" && cfg.persona !== "jarvis" && !body.command_voice) next.command_voice = "cedar"; next.persona = body.persona; }''',
    '''    if (body.persona && PERSONAS[body.persona]) { if (["jarvis", "calm_british"].includes(body.persona) && cfg.persona !== body.persona && !body.command_voice) next.command_voice = "cedar"; next.persona = body.persona; }
    if (body.eleven_add && /^[A-Za-z0-9]{10,40}$/.test(String(body.eleven_add.id || "").trim())) { const id = String(body.eleven_add.id).trim(); next.eleven_voices = [...cfg.eleven_voices.filter((x) => x.id !== id), { id, name: String(body.eleven_add.name || "My voice").slice(0, 40) }].slice(-12); if (!next.command_eleven) next.command_eleven = id; }
    else if (body.eleven_add) return J({ ok: false, error: "That doesn't look like an ElevenLabs voice ID. Copy it from the voice's page in ElevenLabs (letters and numbers, about 20 characters)." }, 400);
    if (body.eleven_remove) { next.eleven_voices = cfg.eleven_voices.filter((x) => x.id !== body.eleven_remove); if (next.command_eleven === body.eleven_remove) next.command_eleven = ""; }
    if (typeof body.command_eleven === "string" && (body.command_eleven === "" || (next.eleven_voices || cfg.eleven_voices).some((x) => x.id === body.command_eleven))) next.command_eleven = body.command_eleven;''')
rep('has_openai: !!env.OPENAI_API_KEY }); }', 'has_openai: !!env.OPENAI_API_KEY, has_eleven: !!env.ELEVENLABS_API_KEY }); }')
rep('''    const buf = await ttsOgg(env, line, String(body.voice || cfg.command_voice), pz.voice);
    return J({ ok: true, ...(await tgVoice(env, buf, "\\u{1F399} Voice test: <b>" + esc6((VOICES.find((v) => v.id === (body.voice || cfg.command_voice)) || {}).name || "") + "</b> · " + esc6(pz.name))) });''',
    '''    const elName = !body.voice && env.ELEVENLABS_API_KEY && cfg.command_eleven ? (cfg.eleven_voices.find((x) => x.id === cfg.command_eleven) || {}).name : "";
    const r = await sayOnTelegram(env, cfg, line, pz.voice, "\\u{1F399} Voice test: <b>" + esc6(elName || (VOICES.find((v) => v.id === (body.voice || cfg.command_voice)) || {}).name || "") + "</b> · " + esc6(pz.name), body.voice ? String(body.voice) : "");
    return J({ ok: true, ...r });''')
rep('''    const line = cfg.persona === "jarvis" ?''', '''    const line = cfg.persona === "calm_british" ? "Good evening, Ty. Everything is in hand. Three enquiries came in this afternoon, and I've drafted replies for you to approve whenever you're ready. No rush at all." : cfg.persona === "jarvis" ?''')

# Settings UI: your own voices
rep('''      '<label class="or-switch" style="margin-top:12px"><input type="checkbox" id="v52bn"''', '''      '<div class="v77-el" style="margin-top:14px"><span class="wf-eyebrow">YOUR OWN VOICES (ELEVENLABS)</span><p class="mu sm" style="margin:4px 0 8px">Add voices you designed or saved in ElevenLabs, then pick one for Command’s voice notes and briefings. ' + (d.has_eleven ? '' : '<b>Add the ELEVENLABS_API_KEY secret in Cloudflare to switch these on.</b> ') + 'If ElevenLabs ever fails, Command uses the voice above instead. Live talking and the phone line keep their own voices.</p>' +
        (c.eleven_voices && c.eleven_voices.length ? c.eleven_voices.map((v) => '<div class="row" style="gap:10px;align-items:center;margin:6px 0"><label class="or-switch" style="flex:1"><input type="radio" name="v77el" value="' + esc(v.id) + '"' + (v.id === c.command_eleven ? ' checked' : '') + '> <b>' + esc(v.name) + '</b> <span class="mu xs">' + esc(v.id) + '</span></label><button class="btn sm ghost" data-v77rm="' + esc(v.id) + '">Remove</button></div>').join('') + '<label class="or-switch" style="margin:6px 0"><input type="radio" name="v77el" value=""' + (!c.command_eleven ? ' checked' : '') + '> Don’t use ElevenLabs</label>' : '') +
        '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><label class="lab" style="flex:1 1 160px">Name<input class="in" id="v77name" placeholder="e.g. Calm British"></label><label class="lab" style="flex:2 1 240px">ElevenLabs voice ID<input class="in" id="v77id" placeholder="paste the voice ID"></label><button class="btn" id="v77add">Add voice</button></div></div>' +
      '<label class="or-switch" style="margin-top:12px"><input type="checkbox" id="v52bn"''')
rep('''    const val = () => ({ persona: ($('input[name=v52p]:checked', box) || {}).value, command_voice: $('#v52cv', box).value, receptionist_voice: $('#v52rv', box).value, briefing_voice_note: $('#v52bn', box).checked });''',
    '''    const val = () => ({ persona: ($('input[name=v52p]:checked', box) || {}).value, command_voice: $('#v52cv', box).value, receptionist_voice: $('#v52rv', box).value, briefing_voice_note: $('#v52bn', box).checked, ...($('input[name=v77el]:checked', box) ? { command_eleven: $('input[name=v77el]:checked', box).value } : {}) });
    $('#v77add', box).onclick = async () => { const id = $('#v77id', box).value.trim(); if (!id) return toast('Paste the voice ID from ElevenLabs', 'bad'); try { await team('/voice-style', { method: 'POST', body: { ...val(), eleven_add: { id, name: $('#v77name', box).value.trim() || 'My voice' } } }); toast('Voice added', 'ok'); box.remove(); voiceCard(host); } catch (e) { toast(e.message, 'bad'); } };
    $$('[data-v77rm]', box).forEach((b) => b.onclick = async () => { try { await team('/voice-style', { method: 'POST', body: { eleven_remove: b.dataset.v77rm } }); box.remove(); voiceCard(host); } catch (e) { toast(e.message, 'bad'); } });''')
rep("if (pv === 'jarvis') { $('#v52cv', box).value = 'cedar'; toast('Jarvis voice selected: tap Save', 'ok'); }", "if (pv === 'jarvis' || pv === 'calm_british') { $('#v52cv', box).value = 'cedar'; toast('Cedar voice selected: tap Save', 'ok'); }")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v77 applied')
