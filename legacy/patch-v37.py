# v37: website Studio AI (chat + voice) quotes the live product list from Command > Offers, same as DM replies.
import sys, re, hashlib
f = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(f).read()

def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:90], s.count(old))
    s = s.replace(old, new)

rep('''const { TEAM_CRON, TEAM_OPERATOR_TOOLS, TEAM_TOOL_NAMES, isTeamPath, teamEnv, teamFetch, teamOperatorTool, teamScheduled, teamQueue, withTeamPanel, inboxRoute } = (() => {''',
    '''const { TEAM_CRON, TEAM_OPERATOR_TOOLS, TEAM_TOOL_NAMES, isTeamPath, teamEnv, teamFetch, teamOperatorTool, teamScheduled, teamQueue, withTeamPanel, inboxRoute, inboxPriceBook: sitePriceBook } = (() => {''')
rep('''return { TEAM_CRON, TEAM_OPERATOR_TOOLS, TEAM_TOOL_NAMES, isTeamPath, teamEnv, teamFetch, teamOperatorTool, teamScheduled, teamQueue, withTeamPanel, inboxRoute };''',
    '''return { TEAM_CRON, TEAM_OPERATOR_TOOLS, TEAM_TOOL_NAMES, isTeamPath, teamEnv, teamFetch, teamOperatorTool, teamScheduled, teamQueue, withTeamPanel, inboxRoute, inboxPriceBook };''')
rep('''    base.monthly = ({ 597: 297, 797: 497 })[base.monthly] || base.monthly; base.monthly_voice = ({ 597: 297, 797: 497 })[base.monthly_voice] || base.monthly_voice;
  } catch {}''', '''    base.monthly = ({ 597: 297, 797: 497 })[base.monthly] || base.monthly; base.monthly_voice = ({ 597: 297, 797: 497 })[base.monthly_voice] || base.monthly_voice;
  } catch {}
  try {
    const cat = await db(siteEnvNorm(env), 'team_settings?key=eq.offer_catalog&select=value&limit=1');
    base.price_book = (sitePriceBook(cat?.[0]?.value || {}) || '').replace(' (from Command > Offers; these override any older figure above)', ' (these override any older figure above)');
  } catch { base.price_book = ''; }''')
rep('''• Free call: a short call with Ty to find the right starting point.
''', '''• Free call: a short call with Ty to find the right starting point.
• Studio AI Command: our flagship. A hosted AI command hub that plugs into a business's CRM, phone, website, socials and Stripe: an AI team answers and follows up every enquiry, chases unpaid invoices, and gives the owner a morning brief and one-tap approvals on their phone. White-label option in their own brand. Best for established teams and multi-location businesses; suggest a call to scope it.
${offer.price_book || ''}
''')
s = s.replace("• Pilot checkouts are for clinics (allied health, dental, aesthetics, medical, psychology). Other businesses (salons, trades, property managers, service teams) book a call for a tailored offer.",
              "• Pilot checkouts are for clinics (allied health, dental, aesthetics, medical, psychology). Other businesses (trades, property managers, coaches and consultants, salons, multi-location groups) book a call for a tailored offer.")
open(f, 'w').write(s)
print('v37 website Studio AI reads the live price list')
