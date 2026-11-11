# v39: website demos live in Command.
# Hand-built prospect homepages + leak reports are served from Command at /demo/<slug> and /demo/<slug>/report,
# next to the existing AI receptionist demos (/demo/<40-char token>). Every real open sends Ty a Telegram alert
# (first open, then at most once every 2 hours per page), link-preview bots and ?preview=1 are ignored.
import sys, json, os
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
SITE = '/home/claude/demo-src'
MOTION = 'https://www.studioflowandsystems.com/vendor/motion.js'
DEMOS = {
  'karinya': ('Karinya Montessori', 'karinya'),
  'playball-sunny-coast': ('Playball Sunny Coast', 'playball-sunny-coast'),
}

KB = {
 'karinya': ({
   'clinic_name': 'Karinya Montessori Children\'s House', 'clinic_type': 'Montessori long day care centre and Queensland government approved kindergarten',
   'built': '10 November 2026', 'phone': '07 5472 0505', 'email': 'info@karinyamontessori.com', 'address': '11 Kauri Street, Cooroy QLD 4563 (Noosa hinterland)',
   'hours': 'Monday to Friday 7am to 5:30pm. Closed two weeks over Christmas and New Year (no fees charged then).',
   'ages': '15 months to 6 years: Toddlers (15 months to 3), Pre-Kindergarten (3 to 4), Kindergarten (4 to 6).',
   'sessions_and_daily_fees': 'From July 2026, before Child Care Subsidy, a guide only: classroom session 8:45am to 2:45pm $96 a day; core hours 8am to 4pm $125 a day; long day 7am to 5:30pm $140 a day. Discount on fees in school holidays only.',
   'enrolment': 'Family enrolment fee $150 ($55 Montessori membership + $95 administration and Montessori parent education), not charged for Free Kindy children. Minimum days: 2 for toddlers and pre-kindy, 3 for kindergarten (4 from 30 June). After a tour a personalised no-obligation quote is emailed.',
   'free_kindy': 'Kindy-aged children get 15 hours a week of Free Kindy for 40 weeks a year (Queensland Free Kindy). Fees can also be reduced by the Child Care Subsidy.',
   'quality': 'Rated Exceeding the National Quality Standard. 5.0 Google rating. Small, family-run, open since 2009. Director: Kerri.',
   'inclusions': 'Montessori environment and trained educators, nappies and sunscreen. Weekly music with Maggie Moo and sport with Junior Sports Queensland. Second-language immersion. Gubbi Gubbi workshops, cultural celebrations, community helper visits, grandparent afternoons, child protection workshops.',
   'nature_and_animals': 'Guinea pigs (children can take them home on weekends), native rainbow fish fed each morning, tadpoles to frogs, caterpillars to butterflies, chickens hatching, a garden, bush kindy, a yearly Ocean Life discovery visit.',
   'orientation': 'Gentle orientation and settling, including a home visit before starting.',
   'vacancies': 'Some rooms are currently full. Families can join the waitlist with their child\'s age and preferred start date and are told when a place opens. Never promise a place.',
   'tours': 'Tours run during the week. Families can request one on this page or by calling 07 5472 0505.',
   'suggested_questions': ['What are your fees?', 'Is Free Kindy available?', 'Do you have vacancies?', 'Can I book a tour?'] },
  """- This is a childcare centre. You speak with parents and carers. Never ask for or repeat a child's full name, date of birth, address, medical, allergy or custody details; age and preferred start date are enough. If shared, kindly say the team will go through that privately at enrolment.
- Never promise a vacancy, a start date or an exact out-of-pocket cost: say the team will confirm and email a personalised quote after a tour.
- Child Care Subsidy amounts depend on the family: never calculate a family's subsidy; suggest the tour quote or the government Child Care Subsidy estimator.
- If a child's safety or wellbeing is mentioned, be kind, suggest calling the centre directly on 07 5472 0505, and 000 in an emergency.
- Keep replies short and warm (2 to 4 sentences). Offer a tour when it helps."""),
 'playball-sunny-coast': ({
   'industry': 'fitness',
   'clinic_name': 'Playball Sunny Coast', 'clinic_type': 'children\'s sport and movement program (independently owned Playball partner)',
   'built': '10 November 2026', 'coach': 'Coach Luke',
   'ages': 'Children aged 2 to 8, in age groups.',
   'programs': 'Weekly family classes, school holiday camps, birthday parties (a coach leads the games), and on-site programs for early learning centres and junior primary schools with equipment supplied, shaped around the centre\'s timetable and group sizes.',
   'method': 'The Playball method: purposeful, inclusive, child-first play building confidence, competence, communication and capability. Led by trained Playball coaches.',
   'area': 'Sunshine Coast, Queensland and surrounding communities.',
   'not_published': 'Exact venues, class times, term fees, camp dates and party prices are not published here: the team confirms them. Never invent them.',
   'how_to_book': 'Parents can find and book a class or camp on this page, request a party quote, or leave their name, number, child\'s age and suburb so Luke can confirm options.',
   'suggested_questions': ['What ages is Playball for?', 'Do you do birthday parties?', 'When are holiday camps?', 'Can you come to our centre?'] },
  """- You speak with parents, party planners and early learning centre or school staff. For parents ask the child's age and suburb; for parties ask number of children, the child's age and the date; for centres ask the centre name, rough group sizes and a contact.
- Never ask for or repeat a child's full name, date of birth, medical, allergy or custody details.
- Never invent venues, times, prices or availability: say Luke will confirm and offer to take their name and best number.
- Keep replies short, upbeat and friendly (2 to 4 sentences)."""),
}
data = {}
for slug, (name, folder) in DEMOS.items():
    page = open(os.path.join(SITE, folder, 'index.html')).read().replace('src="/vendor/motion.js"', 'src="' + MOTION + '"')
    report = open(os.path.join(SITE, folder, 'report', 'index.html')).read()
    for k in ('page', 'report'):
        pass
    # links between the two pages work on Command's domain (no trailing-slash dependency)
    page = page.replace('href="/demo/%s/report/"' % slug, 'href="/demo/%s/report"' % slug)
    report = report.replace('href="/demo/%s/"' % slug, 'href="/demo/%s"' % slug)
    data[slug] = {'name': name, 'page': page, 'report': report, 'kb': KB[slug][0], 'extra': KB[slug][1]}

module = '''
// src/team/site-demos.js (v39): hand-built website demos for prospects, hosted by Command.
var SITE_DEMOS = %s;
var SITE_DEMO_BOTS = /bot|crawl|spider|preview|facebookexternalhit|slackbot|whatsapp|telegram|discord|skype|linkedin|embedly|vkshare|quora|pinterest|outbrain|bitly|google-?(?:read|site)|headless/i;
async function siteDemoSeen(env, slug, kind, request, url) {
  if (url.searchParams.get("preview") === "1") return;
  if (SITE_DEMO_BOTS.test(request.headers.get("user-agent") || "")) return;
  const all = await secGet(env, "site_demos").catch(() => null) || {};
  const key = slug + ":" + kind;
  const s = all[key] || { views: 0, last_alert: 0 };
  s.views = (s.views || 0) + 1;
  s.last_view = new Date().toISOString();
  const due = s.views === 1 || Date.now() - (s.last_alert || 0) > 2 * 3600 * 1e3;
  if (due) {
    s.last_alert = Date.now();
    const what = kind === "report" ? "leak report" : "website demo";
    const nth = s.views === 1 ? "first time" : "view " + s.views;
    await notify(env, "\\u{1F440} <b>" + esc6(SITE_DEMOS[slug].name) + " just opened their " + what + "</b> (" + nth + ").\\nGood moment to follow up.").catch(() => {});
  }
  all[key] = s;
  await secPut(env, "site_demos", all).catch(() => {});
}
var SITE_DEMO_CHAT_LIMIT = 80;
async function siteDemoChat(request, env, url, ctx, slug) {
  const d = SITE_DEMOS[slug];
  let b;
  try { b = JSON.parse((await request.text()).slice(0, 2e4)); } catch { return Response.json({ ok: false, error: "Invalid message." }, { status: 400 }); }
  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-12).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 600) })).filter((m) => m.content.trim());
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return Response.json({ ok: false, error: "Type a question." }, { status: 400 });
  const preview2 = url.searchParams.get("preview") === "1";
  const all = await secGet(env, "site_demos").catch(() => null) || {};
  const key = slug + ":chat", s = all[key] || { day: "", used: 0, chats: 0, last_alert: 0, transcript: [] };
  const day = brisDay2();
  if (s.day !== day) { s.day = day; s.used = 0; }
  if (s.used >= SITE_DEMO_CHAT_LIMIT) return Response.json({ ok: true, reply: "We've had a big day of questions, so I'm resting until tomorrow. You can call us in the meantime." });
  let reply, ok = false;
  const body = { max_tokens: 900, system: [{ type: "text", text: receptionistPrompt(d.kb, "chat", { extra: d.extra }), cache_control: { type: "ephemeral" } }], messages: msgs };
  try {
    const r = await callClaude(env, { ...body, model: demoModel(env) }).catch(() => callClaude(env, { ...body, model: env.TEAM_MODEL || "claude-sonnet-5-5" }));
    const answer = cleanReply((r.content || []).filter((x) => x.type === "text").map((x) => x.text).join(""));
    ok = !!answer; reply = answer || "Sorry, could you say that another way?";
  } catch { reply = "Sorry, I'm having a little trouble right now. Please try again in a moment."; }
  s.used += 1;
  const q = msgs[msgs.length - 1].content;
  if (ok && !preview2) {
    s.chats = (s.chats || 0) + 1;
    s.transcript = [...(s.transcript || []), { at: new Date().toISOString(), q: q.slice(0, 300), a: reply.slice(0, 400) }].slice(-20);
    if (Date.now() - (s.last_alert || 0) > 6 * 36e5) {
      s.last_alert = Date.now();
      const ping = notify(env, "\\u{1F525} <b>" + esc6(d.name) + " is chatting with their AI receptionist demo right now.</b>\\nThey asked: \\u201C" + esc6(q.slice(0, 160)) + "\\u201D", { urgent: true }).catch(() => {});
      ctx?.waitUntil ? ctx.waitUntil(ping) : await ping;
    }
  }
  all[key] = s;
  const save = secPut(env, "site_demos", all).catch(() => {});
  ctx?.waitUntil ? ctx.waitUntil(save) : await save;
  return Response.json({ ok: true, reply }, { headers: { "Cache-Control": "no-store" } });
}
function siteDemoResponse(request, env, url, ctx, parts) {
  const slug = parts[1], d = SITE_DEMOS[slug];
  if (parts[2] === "chat" && !parts[3]) return request.method === "POST" ? siteDemoChat(request, env, url, ctx, slug) : notFound();
  if (request.method !== "GET" && request.method !== "HEAD") return notFound();
  const kind = parts[2] === "report" ? "report" : parts[2] ? "" : "page";
  if (!kind) return notFound();
  const work = siteDemoSeen(env, slug, kind, request, url);
  ctx?.waitUntil ? ctx.waitUntil(work) : work.catch(() => {});
  return new Response(kind === "report" ? d.report : d.page, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "strict-origin-when-cross-origin" } });
}
''' % json.dumps(data, ensure_ascii=False)

anchor = 'async function demoPublic(request, env, url, ctx) {\n  const parts = url.pathname.split("/").filter(Boolean);\n'
assert s.count(anchor) == 1, 'demoPublic anchor'
s = s.replace(anchor, anchor + '  if (parts[0] === "demo" && Object.prototype.hasOwnProperty.call(SITE_DEMOS, parts[1] || "")) return siteDemoResponse(request, env, url, ctx, parts);\n', 1)
anchor2 = '// src/team/demo.js\n'
assert s.count(anchor2) == 1, 'demo.js anchor'
s = s.replace(anchor2, module + '\n' + anchor2, 1)
open(W, 'w').write(s)
print('v39 site demos patched:', ', '.join(DEMOS))
