# v62: the Money page counts ALL AI spend (exact Anthropic / OpenAI bills when admin keys are set), by area, with outreach cost per email.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
team = open('/home/claude/w/v62-team.js').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
rep('''  const usage = +rec.totals?.cost_aud || 0;
  const expected = +book.totals?.mrr || 0;''', '''  const usage = +rec.totals?.cost_aud || 0;
  const ai = await plAiCosts(env).catch(() => null);
  const aiCost = ai ? +(ai.anthropic.exact ? ai.total : ai.total + usage).toFixed(2) : usage;
  const expected = +book.totals?.mrr || 0;''')
rep('  const profit = Math.round((basis - gst - fixed - usage) * 100) / 100;', '  const profit = Math.round((basis - gst - fixed - aiCost) * 100) / 100;')
rep('summary: { expected, paid: paidThisMonth, outstanding,', 'summary: { ai, ai_cost: aiCost, expected, paid: paidThisMonth, outstanding,')
rep('[["Fixed costs", neg(s.fixed)], ["AI & SMS usage", neg(s.usage)]]', '[["Fixed costs", neg(s.fixed)], ["All AI & SMS", neg(s.ai_cost != null ? s.ai_cost : s.usage)]]')
rep("""'<section class="card c12"><h3>Clients this month</h3>""", """(s.ai ? '<section class="card c12"><h3>AI spend this month</h3><p class="mu sm">Everything: outreach, demos, your Studio AI team, phone and client receptionists. ' + (s.ai.anthropic.exact ? 'Claude is exact, from Anthropic&#39;s bill.' : 'Claude is estimated from tokens used. Add ANTHROPIC_ADMIN_KEY in Cloudflare for the exact bill.') + ' ' + (s.ai.openai.exact ? 'OpenAI is exact.' : 'OpenAI is estimated (add OPENAI_ADMIN_KEY for the exact bill).') + '</p><div class="snap-row mo-row" style="margin-top:10px">' + [["Claude" + (s.ai.anthropic.exact ? " (exact)" : " (estimate)"), neg(s.ai.anthropic.aud)], ["OpenAI" + (s.ai.openai.exact ? " (exact)" : " (estimate)"), neg(s.ai.openai.aud)]].concat(Object.entries(s.ai.by_area).map(function (x) { return [x[0], neg(x[1])]; })).concat([["Outreach emails sent", esc(s.ai.outreach.emails_sent) + (s.ai.outreach.per_email != null ? " \\u00B7 " + cmoney(s.ai.outreach.per_email) + " each" : "")]]).map(stat).join("") + '</div></section>' : '') +
      '<section class="card c12"><h3>Clients this month</h3>""")
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v62 applied')
