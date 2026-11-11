# v26: new receptionist plans + one master price.
#   Chat Receptionist: $497 pilot (setup + first 30 days), then $297/mo
#   Front Desk (most popular): $697 pilot, then $497/mo; chat + voice + missed-call text-back,
#     SMS follow-up, Google review requests, monthly results report
#   Phone AI: quoted on a call
# Every price is read from the one `offer` setting in Command (demos, website plans, Studio AI, scripts).
import sys
f = sys.argv[1]
s = open(f).read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:120])
    s = s.replace(old, new)

# 1) Defaults + migration of old saved prices (597 -> 297, 797 -> 497)
rep('var DEFAULT_OFFER = { name: "Founding Clinic Pilot", pilot_price: 497, monthly: 597, pilot_price_voice: 697, monthly_voice: 797,',
    'var DEFAULT_OFFER = { name: "Founding Pilot", plan_chat: "Chat Receptionist", plan_voice: "Front Desk", pilot_price: 497, monthly: 297, pilot_price_voice: 697, monthly_voice: 497,')
rep('var offerOf = (settings) => ({ ...DEFAULT_OFFER, ...settings?.offer || {} });',
    'var OLD_MONTHLY = { 597: 297, 797: 497 };\nvar offerOf = (settings) => { const o = { ...DEFAULT_OFFER, ...settings?.offer || {} }; o.monthly = OLD_MONTHLY[+o.monthly] || o.monthly; o.monthly_voice = OLD_MONTHLY[+o.monthly_voice] || o.monthly_voice; o.plan_chat = o.plan_chat || DEFAULT_OFFER.plan_chat; o.plan_voice = o.plan_voice || DEFAULT_OFFER.plan_voice; return o; };')

# 2) Demo page plan cards
a = s.index('<div class="plan"><div class="k">AI Receptionist</div><h3>Chat</h3>')
b = s.index('${payV ?', a)
s = s[:a] + '''<div class="plan"><div class="k">AI Receptionist</div><h3>${esc6(offer.plan_chat)}</h3><div class="p">${money3(offer.pilot_price)} <small>${offer.pilot_days}-day pilot</small></div><div class="then">then ${money3(offer.monthly)} a month</div>
<ul><li>Answers ${pt}s on your website in seconds, 24/7</li><li>Books them in or passes them to your team</li><li>New enquiries sent to your team by SMS &amp; email</li><li>Set up, tuned and looked after by Ty</li></ul>
${pay ? `<a class="buy" data-buy="chat" href="${esc6(pay)}">Start the chat pilot</a>` : `<a class="buy" href="${esc6(FREE_CALL3)}" target="_blank" rel="noopener">Start the chat pilot</a>`}</div>
<div class="plan pop2"><span class="badge">Most popular</span><div class="k">Your AI front desk</div><h3>${esc6(offer.plan_voice)}</h3><div class="p">${money3(offer.pilot_price_voice)} <small>${offer.pilot_days}-day pilot</small></div><div class="then">then ${money3(offer.monthly_voice)} a month</div>
<ul><li>Everything in ${esc6(offer.plan_chat)}, plus <b>voice</b>: visitors tap Talk and speak to it</li><li><b>Missed-call text-back</b>: every missed call gets a text in seconds</li><li><b>SMS follow-up</b> until new enquiries book</li><li><b>Google review requests</b> after each visit</li><li><b>Monthly results report</b>: enquiries, bookings and what it saved</li></ul>
''' + s[b:]
rep('<div class="guar">${offer.refund_days}-day money-back guarantee on either pilot:', '<div class="guar">${offer.refund_days}-day money-back guarantee on either pilot:')
rep('"voice pilot (Chat + Talk)"', '"Front Desk pilot"')
rep('>Start the voice pilot</a>', '>Start the Front Desk pilot</a>', 2)

# 3) Team instructions / call scripts
rep('If they\'re ready to go: the Founding Clinic Pilot ($497 one-off, live in 48 hours, runs 30 days, then $597/month if they keep it,',
    'If they\'re ready to go: the Founding Pilot (Chat Receptionist $497 one-off then $297/month, or Front Desk $697 then $497/month with voice, missed-call text-back, SMS follow-up, review requests and a monthly report; live in 48 hours, runs 30 days,')
rep('THE OFFER: the Founding Clinic Pilot. $497 one-off, live on their website within 48 hours, runs 30 days set up and tuned by Ty, then $597 a month if they keep it. 14-day money-back guarantee: if it\'s not right for their clinic, the $497 is refunded in full.',
    'THE OFFER: the Founding Pilot, two plans. Chat Receptionist: $497 one-off (setup + first 30 days), then $297 a month. Front Desk (lead with this): $697 one-off, then $497 a month: chat + voice on their website, missed-call text-back, SMS follow-up until enquiries book, Google review requests and a monthly results report. Live on their website within 48 hours, set up and tuned by Ty. 14-day money-back guarantee on either pilot. Phone AI (answers their phone line) is quoted on a call.')
rep('If they like it: "The Founding Clinic Pilot is $497: live on your site in 48 hours, runs 30 days, with a 14-day money-back guarantee.',
    'If they like it: "The pilot is $497 for chat, or $697 for the Front Desk with voice, missed-call text-back and review requests: live on your site in 48 hours, with a 14-day money-back guarantee.')
rep('If they\'re keen now: the Founding Clinic Pilot is $497, live in 48 hours, 14-day money-back guarantee.',
    'If they\'re keen now: the pilot is $497 (chat) or $697 (Front Desk), live in 48 hours, 14-day money-back guarantee.')

# 4) Command settings + client screens
rep("Chat: $' + esc((s.offer && s.offer.pilot_price) || 497) + ' pilot then $' + esc((s.offer && s.offer.monthly) || 597) + '/mo \\xB7 Chat + Voice: $' + esc((s.offer && s.offer.pilot_price_voice) || 697) + ' pilot then $' + esc((s.offer && s.offer.monthly_voice) || 797) + '/mo.",
    "Chat Receptionist: $' + esc((s.offer && s.offer.pilot_price) || 497) + ' pilot then $' + esc(({597:297,797:497})[(s.offer && s.offer.monthly)] || (s.offer && s.offer.monthly) || 297) + '/mo \\xB7 Front Desk: $' + esc((s.offer && s.offer.pilot_price_voice) || 697) + ' pilot then $' + esc(({597:297,797:497})[(s.offer && s.offer.monthly_voice)] || (s.offer && s.offer.monthly_voice) || 497) + '/mo.")
rep('placeholder="Chat + Voice plan: https://buy.stripe.com/\\u2026"', 'placeholder="Front Desk plan: https://buy.stripe.com/\\u2026"')
rep('{ id: "plan_monthly", label: "Monthly price ($)", type: "number", value: 597, min: 0 }', '{ id: "plan_monthly", label: "Monthly price ($)", type: "number", value: 297, min: 0 }')
rep('(Chat + Voice plan)', '(Front Desk plan)', 2)
rep('["missed_call", "Missed-call text-back set up in GHL"],',
    '["missed_call", "Missed-call text-back set up in GHL"],\n  ["sms_followup", "Front Desk: SMS follow-up for new enquiries switched on in GHL"],\n  ["reviews", "Front Desk: Google review requests switched on in GHL"],\n  ["monthly_report", "Front Desk: monthly results report scheduled"],')
rep('payment_link_voice (Chat + Voice Stripe link)', 'payment_link_voice (Front Desk Stripe link)')

# 5) Website Studio AI: same master price, new plans, and a public read-only offer endpoint for the website
rep("const base = { pilot_price: 497, monthly: 597, pilot_price_voice: 697, monthly_voice: 797, pilot_days: 30, live_hours: 48 };",
    "const base = { pilot_price: 497, monthly: 297, pilot_price_voice: 697, monthly_voice: 497, pilot_days: 30, live_hours: 48, refund_days: 14 };")
rep("    for (const k of Object.keys(base)) if (Number.isFinite(+v[k]) && +v[k] > 0) base[k] = Math.round(+v[k]);\n",
    "    for (const k of Object.keys(base)) if (Number.isFinite(+v[k]) && +v[k] > 0) base[k] = Math.round(+v[k]);\n    base.monthly = ({ 597: 297, 797: 497 })[base.monthly] || base.monthly; base.monthly_voice = ({ 597: 297, 797: 497 })[base.monthly_voice] || base.monthly_voice;\n")
a = s.index('• Chat AI receptionist (website chat): founding clinic pilot')
b = s.index('• Phone AI receptionist (business phone line)', a)
s = s[:a] + '''• Chat Receptionist (website chat): founding pilot A$${offer.pilot_price} (setup + first ${offer.pilot_days} days), then A$${offer.monthly}/month. Answers from approved business information, captures enquiry details, gives a clear booking path and human handoff, and sends new enquiries to the team by SMS and email.
• Front Desk (most popular): founding pilot A$${offer.pilot_price_voice}, then A$${offer.monthly_voice}/month. Everything in Chat Receptionist plus browser voice on the website (visitors tap Talk; uses their microphone; it does NOT answer the business's phone line), missed-call text-back, SMS follow-up until new enquiries book, Google review requests after visits, and a monthly results report.
''' + s[b:]
rep("    if (op === 'status' && request.method === 'GET') {",
    "    if (op === 'offer' && request.method === 'GET') {\n      const o = await siteOffer(env);\n      return new Response(JSON.stringify({ ok: true, offer: o }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' } });\n    }\n    if (op === 'status' && request.method === 'GET') {")

# 6) Stripe links also follow the master offer (website buttons + Studio AI checkout actions)
rep("label: 'Start the chat AI pilot (Stripe)'", "label: 'Start the Chat Receptionist pilot (Stripe)'")
rep("label: 'Start the chat + voice pilot (Stripe)'", "label: 'Start the Front Desk pilot (Stripe)'")
rep("    base.monthly = ({ 597: 297, 797: 497 })[base.monthly] || base.monthly;",
    "    const okLink = (u) => typeof u === 'string' && /^https:\\/\\/(buy\\.stripe\\.com|checkout\\.stripe\\.com)\\//.test(u);\n    if (okLink(v.payment_link)) { base.payment_link = v.payment_link; SITE_LINKS.checkout_chat.url = v.payment_link; }\n    if (okLink(v.payment_link_voice)) { base.payment_link_voice = v.payment_link_voice; SITE_LINKS.checkout_voice.url = v.payment_link_voice; }\n    base.monthly = ({ 597: 297, 797: 497 })[base.monthly] || base.monthly;")

open(f, 'w').write(s)
print('v26 new plans + master price applied')
