# v79: the Studio AI on the website and links page was hard-wired to a female voice (Marin) and ignored Command's settings.
# It now speaks with the "Website & links page voice" chosen in Command (default: same as the Command voice), in Command's delivery style.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# worker side: look up the chosen voice and style, pass them to the voice session
rep('''        if (!data.sdp.startsWith('v=0') || !data.sdp.includes('m=audio')) throw new TestError('Invalid voice offer.', 400);
        data.offer = await siteOffer(env);''', '''        if (!data.sdp.startsWith('v=0') || !data.sdp.includes('m=audio')) throw new TestError('Invalid voice offer.', 400);
        data.offer = await siteOffer(env);
        try { const vc = (await db(siteEnvNorm(env), 'team_settings?key=eq.voice_style&select=value&limit=1'))?.[0]?.value || {}; const V = ['cedar', 'ash', 'verse', 'echo', 'ballad', 'marin', 'coral', 'sage', 'shimmer', 'alloy']; const sv = V.includes(vc.site_voice) ? vc.site_voice : V.includes(vc.command_voice) ? vc.command_voice : ''; if (sv) data.site_voice = sv; const ST = { calm_british: 'Speak with a very calm, refined British accent (Received Pronunciation). Slow, soft and unhurried, low and warm, with gentle pauses between sentences. Reassuring and quietly amused. Never excited, never loud, never rushed.', jarvis: 'Speak with a refined, warm British accent: measured pace, crisp consonants, calm and quietly amused, like a trusted butler.', executive: 'Speak calmly and precisely, low and even.' }; if (ST[vc.persona]) data.site_style = ST[vc.persona]; } catch (e) {}''')
rep("""voice: g.env.STUDIO_SITE_VOICE || 'marin' } } }));""", """voice: (/^(cedar|ash|verse|echo|ballad|marin|coral|sage|shimmer|alloy)$/.test(d.site_voice || '') ? d.site_voice : '') || g.env.STUDIO_SITE_VOICE || 'marin' } } }));""")
n = s.count("instructions: siteInstructions(d.offer, 'voice') + ")
assert n == 1, n
s = s.replace("instructions: siteInstructions(d.offer, 'voice') + ", "instructions: siteInstructions(d.offer, 'voice') + (d.site_style ? '\\n\\nHOW YOU SOUND: ' + String(d.site_style).slice(0, 400) : '') + ", 1)

# settings: a website voice, defaulting to the Command voice
rep('away: null, eleven_voices: [], command_eleven: "", command_cf: "" };', 'away: null, eleven_voices: [], command_eleven: "", command_cf: "", site_voice: "" };')
rep('  if (!CF_VOICES[v.command_cf]) v.command_cf = "";', '  if (!CF_VOICES[v.command_cf]) v.command_cf = "";\n  if (v.site_voice && !VOICES.some((x) => x.id === v.site_voice)) v.site_voice = "";')
rep('    if (typeof body.command_cf === "string" &&', '    if (typeof body.site_voice === "string" && (body.site_voice === "" || VOICES.some((x) => x.id === body.site_voice))) next.site_voice = body.site_voice;\n    if (typeof body.command_cf === "string" &&')
rep('''<label class="lab" style="flex:1 1 260px">AI receptionist voice (default)<select class="in" id="v52rv">' + opt(c.receptionist_voice) + '</select></label></div>' +''',
    '''<label class="lab" style="flex:1 1 260px">AI receptionist voice (default)<select class="in" id="v52rv">' + opt(c.receptionist_voice) + '</select></label><label class="lab" style="flex:1 1 260px">Website &amp; links page Studio AI voice<select class="in" id="v79sv"><option value=""' + (!c.site_voice ? ' selected' : '') + '>Same as the Command voice</option>' + opt(c.site_voice) + '</select></label></div>' +''')
rep("briefing_voice_note: $('#v52bn', box).checked, ", "briefing_voice_note: $('#v52bn', box).checked, site_voice: $('#v79sv', box).value, ")

# The real bug: Command's voice call read your voice settings with the raw Cloudflare settings (where the database address is
# stored under a different name), failed quietly and fell back to the default female voice. Read them the same way the rest of Command does.
rep("      const vcfg = await voiceCfg(env).catch(() => VOICE_DEFAULT);", "      const vcfg = await voiceCfg(e).catch(() => VOICE_DEFAULT);")

rep('async function voiceCfg(env) {\n  const r = await select(env, "team_settings", "key=eq.voice_style&select=value&limit=1").catch(() => []);',
    'async function voiceCfg(env) {\n  if (env && !env.SUPABASE_URL && env.SUPABASS_URL) env = { ...env, SUPABASE_URL: String(env.SUPABASS_URL).replace(/\\/+$/, ""), SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY };\n  else if (env && !env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SECRET_KEY) env = { ...env, SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SECRET_KEY };\n  const r = await select(env, "team_settings", "key=eq.voice_style&select=value&limit=1").catch(() => []);')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v79 applied')
