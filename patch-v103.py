# v103 Every demo link in a Telegram message to Ty gets his private mark automatically, so opening a demo from
# Telegram (whose in-app browser keeps its own cookies) never counts as the lead. Also covers links the AI writes
# in chat replies, briefings and alerts. Telegram only ever goes to Ty, so the mark never reaches a lead.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

H = r'''
// v103: mark every demo link Ty receives on Telegram
function tyLinkify(text, html) {
  const m = globalThis.__sfTyMark;
  if (!m || typeof text !== "string" || !/\/demo\//.test(text)) return text;
  return text.replace(/https?:\/\/[a-z0-9.-]*studioflowandsystems\.app\/(?:api\/v1\/)?demo\/[^\s"'<>)\]]+/gi, (u) => {
    if (/[?&](?:amp;)?ty=/.test(u)) return u;
    const tail = u.match(/[.,;:!]+$/)?.[0] || "";
    const core = tail ? u.slice(0, -tail.length) : u;
    return core + (core.includes("?") ? (html ? "&amp;" : "&") : "?") + "ty=" + m + tail;
  });
}
function tyPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const html = String(payload.parse_mode || "").toUpperCase() === "HTML";
  const out = { ...payload };
  if (typeof out.text === "string") out.text = tyLinkify(out.text, html);
  if (typeof out.caption === "string") out.caption = tyLinkify(out.caption, html);
  if (out.reply_markup?.inline_keyboard) out.reply_markup = { ...out.reply_markup, inline_keyboard: out.reply_markup.inline_keyboard.map((row) => row.map((b) => b && b.url ? { ...b, url: tyLinkify(b.url, false) } : b)) };
  return out;
}
async function tg(env, method, payload) {'''
rep("async function tg(env, method, payload) {", H)
rep("""  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN isn't set in Cloudflare.");
  const receipt=await prepareTelegramDelivery(env,method,payload);""", """  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN isn't set in Cloudflare.");
  if (!globalThis.__sfTyMark) await tyMark(env).catch(() => {});
  payload = tyPayload(payload);
  const receipt=await prepareTelegramDelivery(env,method,payload);""")
rep("var tgQuick = (env, method, payload) => env.TELEGRAM_BOT_TOKEN ? fetch(API2(env, method), { method: \"POST\", headers: { \"content-type\": \"application/json\" }, body: JSON.stringify(payload || {}),",
    "var tgQuick = (env, method, payload) => env.TELEGRAM_BOT_TOKEN ? fetch(API2(env, method), { method: \"POST\", headers: { \"content-type\": \"application/json\" }, body: JSON.stringify(tyPayload(payload) || {}),")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v103 applied')
