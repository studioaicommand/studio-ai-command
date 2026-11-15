# v60: email rules for the GHL inbox (block senders / keywords, AI pitch + phishing filter, sweep, log) via Studio AI.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
team = open('/home/claude/w/v60-team.js').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('async function inboxHandle(env, body) {', team + '\nasync function inboxHandle(env, body) {')
rep("""  // The newest message must be from the customer; if the business already answered, stay quiet.
  if (last && last.direction && last.direction !== 'inbound') return { skipped: 'already answered' };""", """  // v60: email rules (blocked senders, pitch / phishing filter) run first
  if (!last || last.direction === 'inbound') { const mr = await mailRulesCheck(env, { contactId, conversationId: hist.conversationId, inbound: last || {}, payloadMsg, body }).catch((e) => ({ error: String(e.message).slice(0, 200) })); if (mr && mr.deleted) return { mail_rule: mr }; if (mr && mr.error) console.error('mail rules:', mr.error); }
  // The newest message must be from the customer; if the business already answered, stay quiet.
  if (last && last.direction && last.direction !== 'inbound') return { skipped: 'already answered' };""")
rep('  fn("send_telegram_to_ty",', '''  fn("email_rules", "Ty's GHL email inbox rules. Block a sender or keyword so their emails are deleted from GHL Conversations automatically (e.g. American Express phishing); turn the AI filter for cold sales pitches and phishing on or off; see what was deleted (log); or sweep emails already in the inbox (ALWAYS run sweep with dry_run true first, show Ty the list, and only delete with dry_run false after he says yes). Clients, prospects and outreach replies are never touched.", { action: { type: "string", enum: ["list", "add", "remove", "pitch_filter_on", "pitch_filter_off", "log", "sweep"] }, kind: { type: "string", enum: ["sender", "keyword"], description: "sender = name, email or domain; keyword = words in the subject or body." }, match: { type: "string", description: "e.g. American Express, americanexpress.com, or a phrase." }, id: { type: "string" }, note: { type: "string" }, dry_run: { type: "boolean" } }, ["action"]),
  fn("send_telegram_to_ty",''')
rep('  if (name === "browser_task") return browserStart(env, args);', '  if (name === "email_rules") return mailRulesTool(env, args);\n  if (name === "browser_task") return browserStart(env, args);')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v60 applied')
