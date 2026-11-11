import sys,re
src=sys.argv[1]; out=sys.argv[2]
s=open(src,encoding='utf-8').read()
brand=open(sys.argv[3],encoding='utf-8').read()
old_sig='function brandedEmail({ body, cold = false, businessName = "", origin, closing = "Cheers," } = {}) {'
assert s.count(old_sig)==1, 'sig'
s=s.replace(old_sig,'function brandedEmailClassic({ body, cold = false, businessName = "", origin, closing = "Cheers," } = {}) {')
# insert new brandedEmail right after the classic function: before the next section marker
marker='\n// src/team/demo-assets.js'
assert s.count(marker)==1,'marker'
s=s.replace(marker,'\n'+brand+marker)
reps=[
 ('brandedEmail({body: message, origin})','brandedEmail({body: message, origin, kind: "demo"})'),
 ('brandedEmail({body:demoPersonaliseGreeting(demoContactName(op.contact_name),params.body),origin:env.PUBLIC_ORIGIN||DEFAULT_ORIGIN})','brandedEmail({body:demoPersonaliseGreeting(demoContactName(op.contact_name),params.body),origin:env.PUBLIC_ORIGIN||DEFAULT_ORIGIN,kind:"followup"})'),
 ('brandedEmail({ body: String(p.message).slice(0, 4000), origin: env.STUDIO_PUBLIC_ORIGIN, closing: "" })','brandedEmail({ body: String(p.message).slice(0, 4000), origin: env.STUDIO_PUBLIC_ORIGIN, closing: "", kind: "followup" })'),
 ('brandedEmail({ body: p.body, cold: true, businessName: p.business_name, origin: env.STUDIO_PUBLIC_ORIGIN })','brandedEmail({ body: p.body, cold: true, kind: "intro", businessName: p.business_name, origin: env.STUDIO_PUBLIC_ORIGIN })'),
]
for a,b in reps:
    assert s.count(a)==1,('rep',a[:60],s.count(a))
    s=s.replace(a,b)
open(out,'w',encoding='utf-8').write(s)
print('ok',len(s))
s=open(out,encoding='utf-8').read()
for a,b in [
 ('async queue(batch,env,ctx) { return teamQueue(batch,env,ctx); },','async queue(batch,env,ctx) { globalThis.__SF_EMAIL_STYLE = env.EMAIL_STYLE || ""; return teamQueue(batch,env,ctx); },'),
 ('async scheduled(event, env, ctx) { ctx.waitUntil(teamScheduled(event, env)); }, async fetch(request, env, ctx) { ','async scheduled(event, env, ctx) { globalThis.__SF_EMAIL_STYLE = env.EMAIL_STYLE || ""; ctx.waitUntil(teamScheduled(event, env)); }, async fetch(request, env, ctx) { globalThis.__SF_EMAIL_STYLE = env.EMAIL_STYLE || ""; '),
]:
    assert s.count(a)==1,('entry',a[:50])
    s=s.replace(a,b)
open(out,'w',encoding='utf-8').write(s)
print('entry ok')
