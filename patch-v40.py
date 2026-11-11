# v40: Website Demo Studio.
# Find businesses with tired websites -> Ty says yes -> full-motion concept homepage in their brand + the AI receptionist
# we sell + real reviews + leak report + "what we can switch on". Adjust by chat with the Web Design Director, which learns.
# Costs per lead / demo / booked call. Hand-built demos (Karinya, Playball) now use the real receptionist widget too.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
D = '/home/claude/w/'
render = open(D + 'sitegen-render.js').read()
backend = open(D + 'wsd-backend.js').read()
ui = open(D + 'wsd-ui.js').read()
css = open(D + 'wsd-ui.css').read()

def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:80], s.count(old))
    s = s.replace(old, new)

# 1. modules (renderer first: the backend reads WSD_STYLES at load)
rep('// src/team/demo.js\n', render + '\n' + backend + '\n// src/team/demo.js\n')

# 2. public pages
rep('  if (parts[0] === "demo" && Object.prototype.hasOwnProperty.call(SITE_DEMOS, parts[1] || "")) return siteDemoResponse(request, env, url, ctx, parts);\n',
    '  if (parts[0] === "demo" && Object.prototype.hasOwnProperty.call(SITE_DEMOS, parts[1] || "")) return siteDemoResponse(request, env, url, ctx, parts);\n'
    '  if (parts[0] === "demo" && tokenOk(parts[1]) && (parts[2] === "site" || parts[2] === "report") && !parts[3]) return wsdPublic(request, env, url, ctx, parts);\n')
rep('return new Response(kind === "report" ? d.report : d.page,', 'return new Response(kind === "report" ? d.report : wsdInject(d.page, slug, url),')

# 3. the receptionist we sell, on demos
rep('  const key = keyRaw.replace(/\\.js$/, "");\n  const c = await clientByKey(env, key);\n',
    '  const key = keyRaw.replace(/\\.js$/, "");\n  if (/^demo-[a-z0-9-]{3,60}$/.test(key)) return wsdWidget(request, env, url, ctx, parts, isApi, keyRaw, key);\n  const c = await clientByKey(env, key);\n')

# 4. Command API
rep('  const seg = p.split("/").filter(Boolean);\n  if(p===\'/records\'&&m===\'GET\')',
    '  const seg = p.split("/").filter(Boolean);\n  if (seg[0] === "website-demos") { const wr = await wsdRoute(p, m, body, env, url, seg); if (wr) return wr; }\n  if(p===\'/records\'&&m===\'GET\')')

# 5. Studio AI tools
TOOLDEFS = '''  find_website_leads: {
    description: "Website Demo Studio: find local businesses with dated or weak websites in an industry + area (web search + a quick check of each site: mobile, age, SEO, booking, speed) with their published phone numbers. Saves them to Ty's call list in Command (Growth > Website demos). Costs a few cents per business. Ty decides who gets a demo.",
    input_schema: { type: "object", properties: { industry: { type: "string" }, area: { type: "string" }, count: { type: "integer", description: "3-12, default 8" } }, required: ["industry", "area"] }
  },
  build_website_demo: {
    description: "Website Demo Studio: build a full-motion concept homepage in the business's own brand (their colours, logo, photos, real reviews) with our AI receptionist on it, plus a leak report. Pass lead_id (from find_website_leads) or website. Takes ~2 minutes and ~20-40c. Returns preview links (no alerts) and the client links. Only build when Ty asked for it.",
    input_schema: { type: "object", properties: { lead_id: { type: "string" }, website: { type: "string" }, name: { type: "string" }, direction: { type: "string", description: "Optional design direction from Ty." } } }
  },
  adjust_website_demo: {
    description: "Website Demo Studio: change a website demo the way Ty asks (the Web Design Director edits it and learns his taste), or regenerate a completely new design. Identify the demo by token or business name.",
    input_schema: { type: "object", properties: { token: { type: "string" }, business: { type: "string" }, change: { type: "string" }, regenerate: { type: "boolean" } } }
  },
  build_demo: {'''
rep('  build_demo: {\n', TOOLDEFS + '\n')
rep('var GROWTH = ["analyse_website", "leak_scan", "build_demo",', 'var GROWTH = ["analyse_website", "leak_scan", "build_demo", "find_website_leads", "build_website_demo", "adjust_website_demo",')
rep('  "build_demo",\n  "campaign_status",', '  "build_demo",\n  "find_website_leads",\n  "build_website_demo",\n  "adjust_website_demo",\n  "campaign_status",')
CASES = '''    case "find_website_leads": {
      const r = await wsdFind(env, input);
      return { found: r.found, cost_aud: r.cost_aud, businesses: r.items.map((x) => ({ id: x.id, name: x.name, phone: x.phone, website: x.website, suburb: x.suburb, upgrade_need: x.score, signals: x.signals })), note: "Saved to Command > Growth > Website demos. Ty picks who gets a demo." };
    }
    case "build_website_demo": {
      if (!input.lead_id && !input.website) return { error: "Give a lead_id or a website." };
      const r = input.lead_id ? await wsdBuildLead(env, input.lead_id) : await wsdBuild(env, { website: input.website, name: input.name, direction: input.direction });
      return { ok: true, preview_homepage: r.site + "?preview=1", preview_report: r.report + "?preview=1", client_homepage: r.site, client_report: r.report, cost_aud: r.cost_aud, style: r.style, note: "Preview links never alert. Ty approves in Command before anything is sent." };
    }
    case "adjust_website_demo": {
      let token = tokenOk(input.token) ? input.token : null;
      if (!token && input.business) { const q = String(input.business).toLowerCase(); token = (await wsdIndex(env)).find((d) => String(d.name).toLowerCase().includes(q))?.token || null; }
      if (!token) return { error: "Which demo? Give the business name or token." };
      return await wsdAdjust(env, token, input.change || "", { regenerate: !!input.regenerate });
    }
    case "build_demo": {'''
rep('    case "build_demo": {\n', CASES + '\n')

# 6. Command UI (inside the APP template literal: no backticks or ${, and backslashes doubled)
assert '`' not in ui and '${' not in ui and '`' not in css and '${' not in css
ui_t = ui.replace('\\', '\\\\')
css_t = css.replace('\\', '\\\\')
rep('  VIEWS.today=async el=>{', ui_t + '  VIEWS.today=async el=>{')
rep('["growth", "Growth", "growth", [["growth", "Pipeline"], ["business", "Businesses"], ["goals", "Goals"]]]',
    '["growth", "Growth", "growth", [["growth", "Pipeline"], ["demos", "Website demos"], ["business", "Businesses"], ["goals", "Goals"]]]')
rep('    offers: ["Offers", "Receptionists, websites and connected packages"],\n',
    '    offers: ["Offers", "Receptionists, websites and connected packages"],\n    demos: ["Website demos", "Find businesses, build full-motion demos, adjust them by chat"],\n')
rep('var VIEW_LABEL = { jobs:"AI jobs",', 'var VIEW_LABEL = { demos:"Website demos",jobs:"AI jobs",')
rep('.wf-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 18px}', css_t + '\n.wf-filters{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 18px}')

# 7. let Command preview its own demo pages in a frame (same origin only)
rep('  "manifest-src \'self\'",\n', '  "manifest-src \'self\'",\n  "frame-src \'self\'",\n')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v40 website demo studio applied')
