# v68: Art Director concept per business + enforced variety (style, hero, fonts, flow) + Photo Director
# (no repeats, every spot filled, photos briefed from their section/shot list, Ty's photo rules saved once and always applied).
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# old functions keep working under new names; v68 defines the new ones
rep('async function wsdImagesFix(env, spec, { name, industry, area, website, origin }) {', 'async function wsdImagesFixV58(env, spec, { name, industry, area, website, origin }) {')
rep('async function wsdDesign(env, u, { name, website, industry, kb, look, reviews, leaks, brain, extra = "" }) {', 'async function wsdDesignBase(env, u, { name, website, industry, kb, look, reviews, leaks, brain, extra = "", concept = "" }) {')
rep('${brief.text}${extra ? "\\nEXTRA DIRECTION FROM TY:\\n" + extra : ""}', '${concept || brief.text}${extra ? "\\nEXTRA DIRECTION FROM TY:\\n" + extra : ""}')
rep('  if (h && !extra) h.variant = brief.hero;', '  if (h && !extra && !concept) h.variant = brief.hero;')
rep('var WSD_IMG_MAX = 6;', 'var WSD_IMG_MAX = 10;')
rep('var ACTION_TYPES = {\n', open('/home/claude/w/v68-team.js').read() + '\nvar ACTION_TYPES = {\n')

# remember fonts + hero of every build, so the next ones can avoid them
rep('brain.recent.push({ at: wsdNow(), industry: rec.industry, style: spec.style, combo: wsdCombo(spec), dna: spec.dna });', 'brain.recent.push({ ...wsdFingerprint(spec), industry: rec.industry });')
rep('if (regenerate) brain.recent.push({ at: wsdNow(), industry: rec.industry, style: spec.style, combo: wsdCombo(spec) });', 'if (regenerate) brain.recent.push({ ...wsdFingerprint(spec), industry: rec.industry });')
rep('recent: b.recent.slice(-12) });', 'recent: b.recent.slice(-16) });')
rep('look: { images: look.images, logos: look.logos, icon: look.icon, colours: look.colours, fonts: look.fonts }', 'look: { images: look.images, logos: look.logos, icon: look.icon, colours: look.colours, fonts: look.fonts, brand: look.brand || {} }')
rep('style. ${spec.why || ""}`.trim() }]', 'style. ${spec.concept?.big_idea ? "The idea: " + spec.concept.big_idea + " " : ""}${spec.why || ""}`.trim() }]')

# the Director saves photo rules the first time Ty says them
rep('    lesson: { type: "string", description: "If Ty\'s message shows a lasting taste or rule for FUTURE demos, one line. Empty if a one-off." }',
    '    photo_rule: { type: "string", description: "If Ty says anything about photos that should apply to EVERY demo from now on (what to show, what never to show, where photos go, no repeats, style of photos), write it as one clear rule. Empty if it\'s only about this one photo." },\n    lesson: { type: "string", description: "If Ty\'s message shows a lasting taste or rule for FUTURE demos, one line. Empty if a one-off." }')
rep('  return { ok: true, reply, changes, ready: !!out.ready && changes.length > 0, cost_aud: cost, map: wsdMap(rec.spec) };',
    '  let rule_saved = "";\n  const pr = String(out.photo_rule || "").trim().replace(/^photos?:\\s*/i, "").slice(0, 220);\n  if (pr && !brain.lessons.some((l) => l.text.toLowerCase() === ("photos: " + pr).toLowerCase())) { brain.lessons.push({ id: wsdId(), at: wsdNow(), text: "Photos: " + pr, from: rec.name }); await wsdBrainSave(env, brain); rule_saved = pr; }\n  return { ok: true, reply, changes, ready: !!out.ready && changes.length > 0, cost_aud: cost, map: wsdMap(rec.spec), rule_saved };')
rep("say(res.reply, 'ai'); showMap(res.map);", "say(res.reply, 'ai'); if (res.rule_saved) say('Saved as a photo rule for every future demo: ' + res.rule_saved, 'ai'); showMap(res.map);")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v68 applied')
