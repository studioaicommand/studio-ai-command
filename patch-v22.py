# v22: scanner sees existing chat widgets (incl. JS-loaded AI bots), demo pitches the upgrade,
# demo screenshot hides their old widget, and Telegram replies are clean plain text (no ** markdown).
import sys, re
f = sys.argv[1]
s = open(f).read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:100])
    s = s.replace(old, new)

# 1) Many more chat / AI-bot vendors ------------------------------------------------------------
rep('''  ["WhatsApp chat", /wa\\.me\\/|api\\.whatsapp\\.com\\/send/i]
];''', '''  ["WhatsApp chat", /wa\\.me\\/|api\\.whatsapp\\.com\\/send/i],
  ["Simplified SmartBot", /simplified\\.io\\/widget|smartbot\\.js|smartbot-pane/i],
  ["Trengo", /trengo/i],
  ["Userlike", /userlike/i],
  ["Gorgias", /gorgias/i],
  ["Re:amaze", /reamaze/i],
  ["Botpress", /botpress/i],
  ["Landbot", /landbot/i],
  ["ManyChat", /manychat/i],
  ["Kommunicate", /kommunicate/i],
  ["Zoho SalesIQ", /salesiq\\.zoho|zsiqchat|zsiq_float/i],
  ["JivoChat", /jivosite|jivochat/i],
  ["Pure Chat", /purechat/i],
  ["Social Intents", /socialintents/i],
  ["Collect.chat", /collect\\.chat/i],
  ["Chatbot.com", /chatbot\\.com|widget\\.chatbot/i],
  ["Botsonic", /botsonic|writesonic/i],
  ["Ada", /ada-embed|static\\.ada\\.support/i],
  ["Front chat", /chat-assets\\.frontapp/i],
  ["Help Scout Beacon", /beacon-v2\\.helpscout/i],
  ["Freshworks chat", /fw-cdn\\.com|freshworks.*widget/i],
  ["Brevo chat", /conversations-widget\\.brevo|sibautomation.*conversations/i],
  ["Gist", /widget\\.getgist/i],
  ["Customerly", /customerly/i],
  ["Weave", /getweave\\.com.*(chat|text)|weave-widget/i],
  ["NexHealth", /nexhealth/i],
  ["Chaty", /chaty-widget|chaty-channel/i],
  ["GetButton", /getbutton\\.io/i],
  ["Elfsight chat", /elfsight.*(chat|whatsapp)/i],
  ["Tars", /hellotars/i],
  ["Quriobot", /quriobot/i],
  ["Voiceflow", /voiceflow/i],
  ["Chat widget", /class=["'][^"']*\\b(chatbot|chat-widget|chat-launcher|chat-bubble|webchat|live-chat|livechat-widget)\\b/i]
];
// Who the existing bot is (name, AI or human), for the "upgrade your current chat" pitch.
function chatInfo(html) {
  const vendors = CHAT.filter(([, re]) => re.test(html)).map(([k]) => k);
  const named = vendors.filter((v) => v !== "Chat widget" && v !== "WhatsApp chat");
  const list = named.length ? named : vendors;
  if (!list.length) return null;
  const txt = String(html).replace(/<script[\\s\\S]*?<\\/script>|<style[\\s\\S]*?<\\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ");
  const nm = txt.match(/\\b(?:Hello|Hi|Hey)[!,]?\\s+(?:I am|I'm|I\\u2019m|my name is)\\s+([A-Z][a-z]{1,14})\\b/);
  const bot = nm && !/^(The|Your|Here|An?|Happy|Glad|So|Not|Just|Available|Online|Sorry)$/.test(nm[1]) ? nm[1] : "";
  const ai = /simplified|chatbase|botpress|botsonic|voiceflow|landbot|ada|tars|chatbot|smartbot/i.test(list.join(" ")) || /\\b(AI|virtual assistant|chatbot)\\b/.test(txt.slice(0, 2e5)) || /type ['\\u2018\\u2019]?human/i.test(txt);
  return { vendors: list.slice(0, 3), bot_name: bot, ai: !!ai, human_handoff: /type ['\\u2018\\u2019]?human|talk to (a )?(human|person|real)/i.test(txt) };
}''')

# 2) build_demo records the existing chat on the demo's knowledge base ---------------------------------
rep('return { url: home.url, title: H.title, phones: H.phones, emails: H.emails, booking: { systems: H.bookingSystems, links: H.bookLinks.slice(0, 3) }, pages: kept, brand: brandOf(home.html, home.url) };',
    'return { url: home.url, title: H.title, phones: H.phones, emails: H.emails, booking: { systems: H.bookingSystems, links: H.bookLinks.slice(0, 3) }, pages: kept, brand: brandOf(home.html, home.url), chat: chatInfo(home.html) };')
rep('const kb = { ...call2.input, clinic_name: call2.input.clinic_name || prospect.business_name, website: site.url, built: brisDate(), brand: site.brand, mode: modeOf(null, prospect.vertical) };',
    'const kb = { ...call2.input, clinic_name: call2.input.clinic_name || prospect.business_name, website: site.url, built: brisDate(), brand: site.brand, mode: modeOf(null, prospect.vertical), ...(site.chat ? { existing_chat: site.chat } : {}) };')

# 3) Demo screenshot hides any existing chat widget so ours isn't sitting on top of theirs ----------
rep('''async function screenshot(env, url) {
  const body = { url, viewport: { width: 1280, height: 800 }, screenshotOptions: { type: "jpeg", quality: 55 }, gotoOptions: { waitUntil: "networkidle2", timeout: 25e3 } };''',
'''var HIDE_CHAT_CSS = 'chat-widget,[class*="smartbot"],[id*="smartbot"],#tidio-chat,#tidio-chat-iframe,iframe[src*="tawk"],.tawk-min-container,#hubspot-messages-iframe-container,.intercom-lightweight-app,#intercom-container,.intercom-launcher,#drift-widget,#drift-frame-controller,#drift-frame-chat,.crisp-client,#fc_frame,#chat-widget-container,[id^="lc_chat"],#launcher,iframe[title*="chat" i],iframe[title*="Messaging" i],iframe[src*="chat" i],[id*="chat-widget"],[class*="chat-widget"],[class*="chat-launcher"],[class*="chatbot"],[id*="chatbot"],[class*="webchat"],[id*="webchat"],#trengo-web-widget,#userlike,[class*="landbot"],#zsiq_float,.zsiq_floatmain,#jivo-iframe-container,jdiv,#podium-website-widget,#podium-bubble,.chaty,.chaty-widget,#gb-widget,[class*="elfsight-app"][class*="chat"],#beacon-container,#front-chat-container,#ada-button-frame,#voiceflow-chat,.fb_dialog,.fb-customerchat,#birdeye-widget,[class*="birdeye"]{display:none!important;visibility:hidden!important}';
async function screenshot(env, url) {
  const body = { url, viewport: { width: 1280, height: 800 }, screenshotOptions: { type: "jpeg", quality: 55 }, gotoOptions: { waitUntil: "networkidle2", timeout: 25e3 }, addStyleTag: [{ content: HIDE_CHAT_CSS }] };''')

# 4) Demo page: an honest "upgrade your current chat" section when they already have one ---------
rep('''${d.has_shot ? `<section class="sec"><h2>Here's ${esc6(host2 || "your site")} with it switched on</h2>''',
'''${(() => { const ec = d.kb?.existing_chat; if (!ec || !(ec.vendors || []).length) return ""; const who = ec.bot_name ? `${esc6(ec.bot_name)}, your ${esc6(ec.vendors[0])} ${ec.ai ? "chatbot" : "chat"}` : `your ${esc6(ec.vendors[0])} ${ec.ai ? "chatbot" : "chat"}`;
  return `<section class="sec up"><h2>You already have ${who}. Here's the upgrade.</h2><p class="sub">Keep what's working. This receptionist is built from ${esc6(poss(name))} own website, and it adds:</p>
<div class="feat"><div class="f"><div class="i">${svg("phone")}</div><b>It can talk, as well as type</b><span>${pt[0].toUpperCase() + pt.slice(1)}s can speak to it out loud on your website, any time.</span></div>
<div class="f"><div class="i">${svg("cal")}</div><b>Books the next step</b><span>Guides people into ${esc6(sys)} instead of leaving them at "someone will get back to you".</span></div>
<div class="f"><div class="i">${svg("chat")}</div><b>Knows ${esc6(name)}</b><span>Your services, prices, locations and policies, in your tone, and it never guesses.</span></div>
<div class="f"><div class="i">${svg("team")}</div><b>Looks like your brand</b><span>Your colours and logo, set up and tuned by us. We can replace your current chat or run alongside it while you compare.</span></div></div></section>`; })()}
${d.has_shot ? `<section class="sec"><h2>Here's ${esc6(host2 || "your site")} with it switched on</h2>''')
rep('''<p class="sub">Your homepage as ${pt}s see it today, with your receptionist ready in the corner.</p>''',
    '''<p class="sub">Your homepage as ${pt}s see it today, with ${d.kb?.existing_chat ? "your new receptionist in place of the current chat" : "your receptionist ready in the corner"}.</p>''')

# 5) Sales context: demo results mention the existing chat so Command and the call notes use it --
m = re.search(r'\n  const quality = kbQuality\(kb\);', s)
assert m
# 6) Leak scan: an AI chatbot already on the site is a strength + an upgrade angle, not "no chat" ---
rep('''  if (S.chat.length) strengths.push({ label: "Live chat", finding: `Visitors can chat on the site (${S.chat.join(", ")}).`, evidence: {} });''',
    '''  if (S.chat.length) strengths.push({ label: "Live chat", finding: `Visitors can chat on the site (${S.chat.join(", ")}). Pitch it as an upgrade: voice, booking the next step, and brand-matched answers from their own site.`, evidence: {} });''')

# 7) Telegram: clean, sharp text (bold kept, no ** / # / markdown clutter) ------------------------
rep('''  for (const part of chunk(String(reply), 3800)) await tg(env, "sendMessage", { chat_id: chatId, text: part, disable_web_page_preview: true });
}''', '''  for (const part of chunk(String(reply), 3800)) {
    try { await tg(env, "sendMessage", { chat_id: chatId, text: tgHtml(part), parse_mode: "HTML", disable_web_page_preview: true }); }
    catch { await tg(env, "sendMessage", { chat_id: chatId, text: tgPlain(part), disable_web_page_preview: true }); }
  }
}
// Telegram shows markdown as raw symbols, so turn it into clean text with real bold.
var tgPlain = (s) => String(s).replace(/\\r/g, "").replace(/^#{1,6}\\s*/gm, "").replace(/\\*\\*(.+?)\\*\\*/g, "$1").replace(/__(.+?)__/g, "$1").replace(/`([^`]+)`/g, "$1").replace(/^\\s*[-*]\\s+/gm, "\\u2022 ").replace(/(^|\\s)\\*(\\S[^*\\n]*?)\\*(?=\\s|[.,!?]|$)/g, "$1$2").replace(/\\*/g, "").replace(/\\n{3,}/g, "\\n\\n").trim();
var tgHtml = (s) => {
  const e = String(s).replace(/\\r/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return e.replace(/^#{1,6}\\s*(.+)$/gm, "<b>$1</b>").replace(/\\*\\*(.+?)\\*\\*/g, "<b>$1</b>").replace(/__(.+?)__/g, "<b>$1</b>").replace(/`([^`]+)`/g, "$1").replace(/^\\s*[-*]\\s+/gm, "\\u2022 ").replace(/(^|\\s)\\*(\\S[^*\\n]*?)\\*(?=\\s|[.,!?]|$)/g, "$1$2").replace(/\\*/g, "").replace(/\\n{3,}/g, "\\n\\n").trim();
};''')
rep('    reply = await deps.command(env, text, hist);',
    '    reply = await deps.command(env, text + "\\n\\n(Telegram reply: keep it short and sharp. Plain sentences and short lines, at most one short list, no tables, no markdown headings.)", hist);')

open(f, 'w').write(s)
print('v22 scanner/demo/telegram patch applied')

# v22.1: never save a bot-check / security page as the demo screenshot ------------------------------
s = open(f).read()
def rep2(old, new):
    global s
    assert s.count(old) == 1, old[:90]
    s = s.replace(old, new)
rep2('async function screenshot(env, url) {', '''var CHALLENGE = /checking the site|sgcaptcha|just a moment\\.\\.\\.|cf-chl|challenge-platform|verifying you are human|verify you are human|attention required|access denied|requires cookies to be enabled|ddos protection|captcha/i;
// True when the page a browser got is a security check rather than the real homepage.
function looksBlocked(html) { const t = String(html || ""); return CHALLENGE.test(t.slice(0, 6e4)) && t.replace(/<script[\\s\\S]*?<\\/script>|<style[\\s\\S]*?<\\/style>|<[^>]+>/g, " ").replace(/\\s+/g, " ").length < 4e3; }
async function screenshot(env, url) {''')
rep2('''gotoOptions: { waitUntil: "networkidle2", timeout: 25e3 }, addStyleTag: [{ content: HIDE_CHAT_CSS }] };''',
     '''gotoOptions: { waitUntil: "networkidle2", timeout: 25e3 }, waitForTimeout: 3500, addStyleTag: [{ content: HIDE_CHAT_CSS }] };''')
rep2('''  if (shotP) await update(env, "agent_demos", `token=eq.${token}`, { shot: shotP, has_shot: true }).catch(() => {
  });''', '''  // A screenshot is only used if a browser actually reaches the real homepage (not a security check).
  let shotOk = !!shotP;
  if (shotOk && rendererReady(env)) {
    const seen = await renderPage(env, site.url).catch(() => null);
    if (seen && looksBlocked(seen)) shotOk = false;
  }
  if (shotOk) await update(env, "agent_demos", `token=eq.${token}`, { shot: shotP, has_shot: true }).catch(() => {
  });
  else if (shotP) await update(env, "agent_demos", `token=eq.${token}`, { has_shot: false }).catch(() => {
  });''')
open(f, 'w').write(s)
print('v22.1 screenshot guard applied')
