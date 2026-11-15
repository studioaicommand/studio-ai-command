# v78 free British voices: Deepgram Aura-2 "Draco" (warm British baritone) and "Pandora" (calm British female),
# run on Cloudflare Workers AI (the Cloudflare account Command already lives on). Used for voice notes and briefings.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

rep('away: null, eleven_voices: [], command_eleven: "" };', 'away: null, eleven_voices: [], command_eleven: "", command_cf: "" };\nvar CF_VOICES = { draco: { name: "Draco", note: "warm, trustworthy British baritone (male)" }, pandora: { name: "Pandora", note: "smooth, calm British voice (female)" } };')
rep('  if (!v.eleven_voices.some((x) => x.id === v.command_eleven)) v.command_eleven = "";', '  if (!v.eleven_voices.some((x) => x.id === v.command_eleven)) v.command_eleven = "";\n  if (!CF_VOICES[v.command_cf]) v.command_cf = "";')
rep('async function sayOnTelegram(env, cfg, text, instructions, caption, voice) {', '''async function cfVoiceOgg(env, text, speaker) {
  if (!env.AI || typeof env.AI.run !== "function") throw new Error("Workers AI isn't connected (add the AI binding in Cloudflare).");
  const out = await env.AI.run("@cf/deepgram/aura-2-en", { text: String(text).slice(0, 1900), speaker, encoding: "opus", container: "ogg" });
  if (out instanceof ArrayBuffer) return out;
  if (out instanceof Uint8Array) return out.buffer;
  if (out && typeof out.getReader === "function") return await new Response(out).arrayBuffer();
  if (out && typeof out.audio === "string") return Uint8Array.from(atob(out.audio), (c) => c.charCodeAt(0)).buffer;
  throw new Error("Workers AI returned no audio.");
}
async function sayOnTelegram(env, cfg, text, instructions, caption, voice) {
  if (!voice && cfg.command_cf && !(env.ELEVENLABS_API_KEY && cfg.command_eleven)) {
    try { return { ...(await tgVoice(env, await cfVoiceOgg(env, text, cfg.command_cf), caption)), engine: "cloudflare" }; }
    catch (e) { console.error("cloudflare voice note:", e.message); }
  }''')
rep('    if (typeof body.command_eleven === "string" &&', '    if (typeof body.command_cf === "string" && (body.command_cf === "" || CF_VOICES[body.command_cf])) next.command_cf = body.command_cf;\n    if (typeof body.command_eleven === "string" &&')
rep('has_openai: !!env.OPENAI_API_KEY, has_eleven: !!env.ELEVENLABS_API_KEY }); }', 'has_openai: !!env.OPENAI_API_KEY, has_eleven: !!env.ELEVENLABS_API_KEY, has_cf_ai: !!(env.AI && typeof env.AI.run === "function"), cf_voices: CF_VOICES }); }')
rep('''    const elName = !body.voice && env.ELEVENLABS_API_KEY && cfg.command_eleven ? (cfg.eleven_voices.find((x) => x.id === cfg.command_eleven) || {}).name : "";''',
    '''    const elName = !body.voice && env.ELEVENLABS_API_KEY && cfg.command_eleven ? (cfg.eleven_voices.find((x) => x.id === cfg.command_eleven) || {}).name : !body.voice && cfg.command_cf ? CF_VOICES[cfg.command_cf].name : "";''')
# UI: free British voices, above "your own voices"
rep('''      '<div class="v77-el" style="margin-top:14px">''', '''      '<div class="v78-cf" style="margin-top:14px"><span class="wf-eyebrow">FREE BRITISH VOICES (CLOUDFLARE)</span><p class="mu sm" style="margin:4px 0 8px">For voice notes and briefings. Runs on your Cloudflare account for about 3 cents per briefing. ' + (d.has_cf_ai ? '' : '<b>Needs the Workers AI binding named AI on your Command worker in Cloudflare.</b> ') + '</p>' +
        '<div class="row" style="gap:14px;flex-wrap:wrap"><label class="or-switch"><input type="radio" name="v78cf" value=""' + (!c.command_cf ? ' checked' : '') + '> Off</label>' + Object.entries(d.cf_voices || {}).map(([k, v]) => '<label class="or-switch"><input type="radio" name="v78cf" value="' + esc(k) + '"' + (k === c.command_cf ? ' checked' : '') + '> <b>' + esc(v.name) + '</b> <span class="mu xs">' + esc(v.note) + '</span></label>').join('') + '</div></div>' +
      '<div class="v77-el" style="margin-top:14px">''')
rep("...($('input[name=v77el]:checked', box) ? { command_eleven: $('input[name=v77el]:checked', box).value } : {}) });",
    "...($('input[name=v77el]:checked', box) ? { command_eleven: $('input[name=v77el]:checked', box).value } : {}), ...($('input[name=v78cf]:checked', box) ? { command_cf: $('input[name=v78cf]:checked', box).value } : {}) });")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v78 applied')
