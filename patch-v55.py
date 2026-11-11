# v55: browser tasks (Command drives a Command Chrome window on Ty's Mac, with approvals), Command Link agent v2.
import sys, re, hashlib, json
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
team, ui, css = [open(D + f).read() for f in ('v55-team.js', 'v55-ui.js', 'v55-ui.css')]
agent = open(D + 'link-agent.mjs').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', 'var LINK_AGENT_SRC = ' + json.dumps(agent) + ';\n' + team + '\nvar ACTION_TYPES = {\n')
rep('"mac_link", "mac_link_queue"].includes(key)', '"mac_link", "mac_link_queue", "browser_task"].includes(key)')
rep('if (/^\\/(api\\/v1\\/link\\/next|link\\/install\\/)/', 'if (/^\\/(api\\/v1\\/link\\/(next|step)|link\\/install\\/)/')
rep('''    case "owner_task":
      return { ok: true, note: "Marked done" };''', '''    case "owner_task":
      return { ok: true, note: "Marked done" };
    case "browser_step":
      return { ok: true, note: "Approved: Command does this step in the Command Chrome window now." };''')
rep('  fn("send_telegram_to_ty",', '''  fn("browser_task", "Do a job in a real Chrome window on Ty's Mac (the Command Chrome window, where Ty is logged in to his tools): research sites, look things up in GHL, Gmail, Google Business, Stripe dashboards and so on, collect information, fill in drafts. Use when Ty asks you to go into a website or app and do or find something that your other tools can't. It runs step by step on its own; anything that sends, submits, pays, books or deletes waits for Ty's Approve. Ty gets a message when it's done; check with browser_task_status.", { goal: { type: "string", description: "The job, specific and complete, in Ty's words plus what to report back." }, start_url: { type: "string", description: "Optional https:// page to start on." } }, ["goal"]),
  fn("browser_task_status", "Check the current or last browser task (progress, what it's waiting on, the result), or stop it (stop: true), or carry on after Ty has logged in / done the CAPTCHA (continue: true).", { stop: { type: "boolean" }, continue: { type: "boolean" } }),
  fn("send_telegram_to_ty",''')
rep('  if (name === "show_on_screen") {', '  if (name === "browser_task") return browserStart(env, args);\n  if (name === "browser_task_status") return browserStatus(env, args);\n  if (name === "show_on_screen") {')
rep("You can only open web pages on his Mac: you can't click, type, read his files or see his screen.", "For a job inside a website or app (find, check, collect, draft), use browser_task: it works step by step in the Command Chrome window on his Mac and asks Ty to approve anything that sends, submits, pays, books or deletes; tell Ty it's started and that he'll get a message when it's done (browser_task_status shows progress). Never claim a browser task is done until browser_task_status says done.")
rep('  if (seg[0] === "mac-link") {', '  if (seg[0] === "browser") { const r55 = await v55Route(p, m, body, env); if (r55) return r55; }\n  if (seg[0] === "mac-link") {')
assert '`' not in ui + css and '${' not in ui + css
rep('  VIEWS.brain = async (el) => {', ui.replace('\\', '\\\\') + '  VIEWS.brain = async (el) => {')
rep('/* Phone AI (v45) */', css + '\n/* Phone AI (v45) */')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v55 applied')
