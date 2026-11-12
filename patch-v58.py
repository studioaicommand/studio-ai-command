# v58: designer 2. Images always show (proxy + AI images), per-brand design DNA, 7 new scroll moments, tighter spacing.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
render, team = open(D + 'v58-render.js').read(), open(D + 'v58-team.js').read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('var WSD_DEFAULT_OFFERS = [', render + '\nvar WSD_DEFAULT_OFFERS = [')
rep('var ACTION_TYPES = {\n', team + '\nvar ACTION_TYPES = {\n')
# settings: stop loading every demo and image on every request
rep('rows = await select(env, "team_settings", "select=key,value");', 'rows = await select(env, "team_settings", "select=key,value&key=not.like.wsd*:*").catch(() => select(env, "team_settings", "select=key,value"));')
# renderer: DNA classes, extra CSS and motion, AI imagery note
rep('<style>${wsdCss(t)}</style></head>\n<body class="st-${t.st}">', '<style>${wsdCss(t)}${WSD_CSS2(t)}</style></head>\n<body class="st-${t.st} ${wsdDnaClass(spec.dna)}">')
rep('<script>${WSD_MOTION}</script>\n${opt.widget', '<script>${WSD_MOTION}</script>\n<script>${WSD_MOTION2}</script>\n${opt.widget')
rep('Not live. <a href="${wsdE(opt.reportHref)}">See your leak report →</a></div>', 'Not live.${spec.ai_images ? " Some photos are AI concept images." : ""} <a href="${wsdE(opt.reportHref)}">See your leak report →</a></div>')
# public: images through Command, and the image route
rep('  const html = kind === "report" ? wsdReport(rec.spec, opt) : wsdRender(rec.spec, opt);', '  const pspec = wsdProxySpec(rec.spec, token, url.origin);\n  const html = kind === "report" ? wsdReport(pspec, opt) : wsdRender(pspec, opt);')
rep('  const parts = url.pathname.split("/").filter(Boolean);\n  if (parts[0] === "demo" && Object.prototype.hasOwnProperty.call(SITE_DEMOS', '  const parts = url.pathname.split("/").filter(Boolean);\n  if (parts[0] === "demo" && parts[1] === "img") return wsdImgRoute(request, env, url, ctx, parts);\n  if (parts[0] === "demo" && Object.prototype.hasOwnProperty.call(SITE_DEMOS')
# build: give each demo its own design DNA (never the same as the last few), then fix its images
rep('  const cost = await wsdLog(env, u, "website_demo_build");', '  spec.dna = wsdDnaPick(demo.token + bizName, (brain.recent || []).slice(-4).map((r) => r.dna));\n  await wsdImagesFix(env, spec, { name: bizName, industry: industry || demo.kb?.clinic_type || "", area: area || "", website: look.url, origin: env.PUBLIC_ORIGIN || "https://studioflowandsystems.app" }).catch((e) => console.error("demo images:", e.message));\n  const cost = await wsdLog(env, u, "website_demo_build");')
rep('  brain.recent.push({ at: wsdNow(), industry: rec.industry, style: spec.style, combo: wsdCombo(spec) });', '  brain.recent.push({ at: wsdNow(), industry: rec.industry, style: spec.style, combo: wsdCombo(spec), dna: spec.dna });')
# keep AI images when a spec is cleaned again
rep('  const keep = (u) => ok.has(u) ? u : "";', '  const keep = (u) => ok.has(u) || /\\/demo\\/img\\/[0-9a-f]{16}\\.webp$/.test(String(u)) ? u : "";')
# designer instructions: new moments, AI images, evolve their site
rep('type: { type: "string", enum: ["hero", "marquee", "statement", "features", "stats", "journey", "split", "gallery", "testimonials", "faq", "cta", "receptionist", "area"] },', 'type: { type: "string", enum: ["hero", "marquee", "statement", "features", "stats", "journey", "split", "gallery", "testimonials", "faq", "cta", "receptionist", "area", "expand", "compare"] },')
rep('variant: { type: "string", description: "hero: split-arch|fullbleed|giant-type|collage. marquee: velocity|outline. statement: fill|mask. features: rail|stack|bento|fan.', 'variant: { type: "string", description: "hero: split-arch|fullbleed|giant-type|collage|zoomthrough (a giant word grows until you fly through it into the hero photo). expand: grow (a framed photo grows to full screen with a headline). compare: slider (drag to compare before/after; needs before + after images). marquee: velocity|outline. statement: fill|mask. features: rail|stack|bento|fan|list (big-type services, photo slides in on hover)|panels (photos side by side, the hovered one opens with its story)|flip (cards turn over on scroll). split: reveal|zoom|circle (photo opens out of a circle).')
rep('  fields: { type: "array", items: { type: "string" } }, button: { type: "string" }\n}, required: ["type"] };', '  fields: { type: "array", items: { type: "string" } }, button: { type: "string" },\n  before: { type: "string" }, after: { type: "string" }, before_label: { type: "string" }, after_label: { type: "string" }\n}, required: ["type"] };')
rep('    why: { type: "string", description: "One line: why this style and combination fits them." },', '    why: { type: "string", description: "One line: why this style and combination fits them." },\n    gen_images: { type: "array", description: "Up to 4 AI photos to generate when their own photos are missing, few, blurry, tiny or off-brand. Leave that image field empty and describe the photo here.", items: { type: "object", properties: { slot: { type: "string", enum: ["hero", "split", "expand", "features"] }, prompt: { type: "string", description: "A specific photo: THEIR kind of work, place and people, setting, mood, time of day. No text or logos." } } } },')
rep('- Images: ONLY urls from the IMAGES list (never invent or edit urls).', '- New scroll moments (use at least TWO that suit the business): hero zoomthrough, features list / panels / flip, split circle, expand (a photo growing to full screen), compare (before/after: only with a real before and after, e.g. a renovation, a smile, a garden). Take the best ideas from their CURRENT website (signature photos, layout ideas, colours, the sections customers clearly use, their tone) and evolve them into something far better; never copy and never a template.\n- AI photos: when their photos are few, small, blurry or off-brand, leave those image fields empty and describe up to 4 photos in gen_images; the engine makes them in their brand colours.\n- Images: ONLY urls from the IMAGES list (never invent or edit urls).')
rep('var WSD_SIGNATURES = ["journey:pinned",', 'var WSD_SIGNATURES = ["hero:zoomthrough", "features:list", "features:panels", "features:flip", "split:circle", "expand:grow", "journey:pinned",')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v58 applied')
