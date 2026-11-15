# v54: Command Link (open pages in Chrome on Ty's Mac), Jarvis voice naming, web search in Command chat.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
team, ui, css = [open(D + f).read() for f in ('v54-team.js', 'v54-ui.js', 'v54-ui.css')]
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
rep('"voice_style", "away_digest"].includes(key)', '"voice_style", "away_digest", "mac_link", "mac_link_queue"].includes(key)')
# show_on_screen can open the page in Chrome on Ty's Mac
rep('Use whenever Ty says show me, bring up, open, pull up, let me see.",\n    { url: { type: "string", description: "A public website, e.g. moonmane.com or a demo link." },',
    'Use whenever Ty says show me, bring up, open, pull up, let me see. With url, set open_in_chrome true when Ty wants it opened in his browser / on his computer / in Chrome (it opens in Chrome on his Mac through Command Link).",\n    { url: { type: "string", description: "A public website, e.g. moonmane.com or a demo link." }, open_in_chrome: { type: "boolean", description: "Also open this page in Chrome on Ty\'s Mac." },')
rep('''      const [img, page] = await Promise.all([
        screenshot(env, u.href).catch(() => null),''', '''      const mac = args.open_in_chrome ? await macOpen(env, u.href, args.note || "").catch((e) => ({ opened: false, reason: e.message })) : null;
      const [img, page] = await Promise.all([
        screenshot(env, u.href).catch(() => null),''')
rep('''      if (!img && !html) return { ok: false, error: "That page didn't load." };''', '''      if (!img && !html) return mac?.opened ? { ok: true, opened_in_chrome: true, url: u.href, note: "Opened in Chrome on Ty's Mac (the cloud snapshot didn't load)." } : { ok: false, error: "That page didn't load.", ...(mac ? { chrome: mac.reason } : {}) };''')
rep('''        page_text: text,
        screenshot:''', '''        page_text: text,
        ...(mac ? { opened_in_chrome: !!mac.opened, chrome: mac.opened ? "Opened in Chrome on Ty's Mac." : mac.reason } : {}),
        screenshot:''')
rep('"YOUR SCREEN AND HANDS: you can put things on Ty\'s holo screen with show_on_screen (a live browser snapshot of any website, a command-centre page, or a list).',
    '"YOUR SCREEN AND HANDS: you can put things on Ty\'s holo screen with show_on_screen (a live browser snapshot of any website, a command-centre page, or a list). To open a web page in Chrome on Ty\'s Mac, call show_on_screen with the url and open_in_chrome true (works when Command Link is on; if it says the Mac is offline or not set up, say so and give him the link). You can only open web pages on his Mac: you can\'t click, type, read his files or see his screen. To look something up on the web, use web_search.')
# Command chat: live web search, and pause_turn handling for server tools
rep('''  const tools = allTools.map(toClaude);
  const messages = [];
  for (const m of history.slice(-20)) {''', '''  const tools = [...allTools.map(toClaude), { type: "web_search_20250305", name: "web_search", max_uses: 3, user_location: { type: "approximate", country: "AU", city: "Brisbane", timezone: "Australia/Brisbane" } }];
  const messages = [];
  for (const m of history.slice(-20)) {''')
rep('''    messages.push({ role: "assistant", content: d.content });
    const calls = (d.content || []).filter((c) => c.type === "tool_use");
    if (d.stop_reason !== "tool_use" || !calls.length) {''', '''    messages.push({ role: "assistant", content: d.content });
    if (d.stop_reason === "pause_turn") continue;
    const calls = (d.content || []).filter((c) => c.type === "tool_use");
    if (d.stop_reason !== "tool_use" || !calls.length) {''')
# public endpoints for the Mac helper, before the login gate
rep('async fetch(request, env, ctx) { globalThis.__SF_EMAIL_STYLE = env.EMAIL_STYLE || ""; const mg = await memGate(',
    'async fetch(request, env, ctx) { globalThis.__SF_EMAIL_STYLE = env.EMAIL_STYLE || ""; if (/^\\/(api\\/v1\\/link\\/next|link\\/install\\/)/.test(new URL(request.url).pathname)) { const r54 = await macLinkPublic(request, teamEnv(env)).catch((e) => new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 })); if (r54) return r54; } const mg = await memGate(')
rep('  if (seg[0] === "voice-style" || seg[0] === "away") {', '  if (seg[0] === "mac-link") { const r54 = await v54Route(p, m, body, env); if (r54) return r54; }\n  if (seg[0] === "voice-style" || seg[0] === "away") {')
rep('inboxRoute, inboxPriceBook: sitePriceBook } = (() => {', 'inboxRoute, inboxPriceBook: sitePriceBook, macLinkPublic } = (() => {')
rep('withTeamPanel, inboxRoute, inboxPriceBook };', 'withTeamPanel, inboxRoute, inboxPriceBook, macLinkPublic };')
assert '`' not in ui + css and '${' not in ui + css
rep('  VIEWS.brain = async (el) => {', ui.replace('\\', '\\\\') + '  VIEWS.brain = async (el) => {')
rep('/* Phone AI (v45) */', css + '\n/* Phone AI (v45) */')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v54 applied')
