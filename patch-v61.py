# v61: free Workers AI for internal-only jobs (with Claude fallback) + prompt caching on long Claude prompts.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
team = open('/home/claude/w/v61-team.js').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
# wsdAsk: body.free = try the free model first (validated), else Claude
rep('''async function wsdAsk(env, u, tier, body, toolName, nudge) {
  const model2 = tier === "smart" ? WSD_SMART(env) : WSD_FAST(env);''', '''async function wsdAsk(env, u, tier, body, toolName, nudge) {
  if (body.free) { const { free, ...rest } = body; body = rest; const f = await freeAsk(env, body, toolName); if (f) return f; }
  const model2 = tier === "smart" ? WSD_SMART(env) : WSD_FAST(env);''')
# the spoken briefing script: free first
rep('const out = await wsdAsk(env, u, "fast", { max_tokens: 900, system: `You turn Ty', 'const out = await wsdAsk(env, u, "fast", { free: true, max_tokens: 900, system: `You turn Ty')
# email screening: the free model clears normal email; anything it flags is confirmed by Claude before a delete
rep('''async function mailPitchCheck(env, m) {
  const u = wsdUsage();
  try {
    const out = await wsdAsk(env, u, "fast", {''', '''async function mailPitchCheck(env, m) {
  const u = wsdUsage();
  try {
    const first = await freeAsk(env, MAIL_SCREEN_BODY(m), "classify_email");
    if (first && first.kind === "real") return "real";
    const out = await wsdAsk(env, u, "fast", {''')
rep('var MAIL_PITCH_TOOL = {', 'var MAIL_SCREEN_BODY = (m) => ({ max_tokens: 200, system: "You screen the inbox of a Brisbane web design and automation studio. sales_pitch = an unsolicited cold pitch SELLING web design, SEO, marketing, leads, AI, apps, outsourcing or funding TO the studio. phishing = fake bank, card, account or security alerts, invoices or login links. real = everything else, and anything you are unsure about.", tools: [MAIL_PITCH_TOOL], messages: [{ role: "user", content: `FROM: ${m.name} <${m.from}> ${m.company}\\nSUBJECT: ${m.subject}\\n\\n${m.text.slice(0, 2500)}` }] });\nvar MAIL_PITCH_TOOL = {')
# prompt caching for every long Claude prompt
rep('''async function callClaude(env, body) {
  body = await instPrompt(env, body);''', '''async function callClaude(env, body) {
  body = await instPrompt(env, body);
  if (typeof body.system === "string" && body.system.length > 3500) body = { ...body, system: [{ type: "text", text: body.system, cache_control: { type: "ephemeral" } }] };''')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v61 applied')
