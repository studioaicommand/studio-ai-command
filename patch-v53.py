# v53 (built as v52 "Jarvis", renumbered after the branded-emails v52): voice & personality (Jarvis style), spoken morning briefings, Away mode.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
team, ui, css = [open(D + f).read() for f in ('v52-team.js', 'v52-ui.js', 'v52-ui.css')]
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
rep('"coach", "watch"].includes(key)', '"coach", "watch", "voice_style", "away_digest"].includes(key)')
rep('  if (!urgent && (h >= 21 || h < 7)) return { sent: false, reason: "quiet hours" };', '  if (!urgent && (h >= 21 || h < 7)) return { sent: false, reason: "quiet hours" };\n  if (!urgent && await awayHold(env, text).catch(() => false)) return { sent: false, reason: "away: held for Ty\'s return" };')
# Command voice: chosen voice + personality
rep('      const snap2 = await Promise.race([commandSnapshot(e)', '      const vcfg = await voiceCfg(env).catch(() => VOICE_DEFAULT);\n      const snap2 = await Promise.race([commandSnapshot(e)')
rep('+ await missionBlock(env).catch(() => "")),\n        tools: OPERATOR_TOOLS', '+ await missionBlock(env).catch(() => "") + personaBlock(vcfg, "voice")),\n        tools: OPERATOR_TOOLS')
rep('output: { voice: env.STUDIO_VOICE || "marin" } }', 'output: { voice: vcfg.command_voice || env.STUDIO_VOICE || "marin" } }')
# Command chat and Telegram: personality
rep('+ await perfBlock(env, "chief_of_staff").catch(() => "") }', '+ await perfBlock(env, "chief_of_staff").catch(() => "") + personaBlock(await voiceCfg(env).catch(() => VOICE_DEFAULT)) }')
# receptionist voices
rep('output: { voice: env.CLIENT_VOICE || env.DEMO_VOICE || "marin" } }', 'output: { voice: await clientVoiceFor(env, c) } }')
rep('audio: { input: realtimeInput(env), output: { voice: env.DEMO_VOICE || "marin" } }', 'audio: { input: realtimeInput(env), output: { voice: await clientVoiceFor(env, null) } }')
# spoken morning briefing
rep('  const [row] = await insert(env, "team_reports", [{ department: "chief_of_staff", kind: "briefing", title: `Morning briefing \\u2014 ${date}`, body: reply }]);',
    '  const [row] = await insert(env, "team_reports", [{ department: "chief_of_staff", kind: "briefing", title: `Morning briefing \\u2014 ${date}`, body: reply }]);\n  if (reply && !stopped) await voiceBriefing(env, reply).catch((e) => console.error("voice briefing:", e.message));')
rep('  if (!aiHold) await noShowWatch(e).catch((x) => console.error("no-show rebooker:", x.message));', '  if (!aiHold) await noShowWatch(e).catch((x) => console.error("no-show rebooker:", x.message));\n  await awayTick(e).catch((x) => console.error("away:", x.message));')
rep('  if (seg[0] === "goal" || seg[0] === "scout") {', '  if (seg[0] === "voice-style" || seg[0] === "away") { const r52 = await v52Route(p, m, body, env); if (r52) return r52; }\n  if (seg[0] === "goal" || seg[0] === "scout") {')
assert '`' not in ui + css and '${' not in ui + css
rep('  VIEWS.brain = async (el) => {', ui.replace('\\', '\\\\') + '  VIEWS.brain = async (el) => {')
rep('/* Phone AI (v45) */', css.replace('\\', '\\\\') + '\n/* Phone AI (v45) */')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print("v53 applied")
