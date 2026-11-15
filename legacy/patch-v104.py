# v104 Health compliance safety net for clinic clients (allied health, chiro, physio, dental, medical, psychology).
# The prompts already forbid clinical advice and testimonials; this adds a check in code so a slip is caught anyway:
# - Every approval card on a clinic's Command shows a "Health check" warning when a draft looks like clinical advice,
#   a medication dose, a guaranteed outcome, a testimonial or "best clinic" claim (AHPRA), or asks for health details.
# - An automatic inbox reply that looks like clinical advice or promises an outcome is never sent on its own: it goes to
#   the owner as a hand-off with the suggested words.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

H = r'''
// ── v104 health compliance safety net ──
var HEALTH_CHECKS = [
  { k: "dose", strong: true, label: "a medication or dose", re: /\b\d+(\.\d+)?\s?(mg|mcg|ml|milligrams?)\b|\b(take|try|use)\s+(some\s+)?(ibuprofen|paracetamol|nurofen|panadol|voltaren|codeine|antibiotics?|anti-inflammator\w*|painkillers?)\b/i },
  { k: "diagnosis", strong: true, label: "a diagnosis", re: /\b(you (probably|likely|might|may)? ?(have|'ve got|got) (a |an )?[a-z ]{0,20}(injury|infection|tear|strain|sprain|fracture|disc|abscess|cavity|condition|disorder))\b|\bsounds like (a |an )?[a-z ]{0,20}(injury|infection|tear|strain|sprain|fracture|disc|abscess|cavity|sciatica|tendinitis|tendonitis|bursitis)\b/i },
  { k: "outcome", strong: true, label: "a guaranteed result", re: /\b(guarantee[ds]?|cures?d?|will (fix|cure|heal) (it|this|your)|100% (effective|success|results)|pain[- ]free (forever|for good)|permanent(ly)? (fix|cure)|risk[- ]free)\b/i },
  { k: "testimonial", strong: false, label: "a patient testimonial (AHPRA: not allowed in clinic advertising)", re: /\btestimonials?\b|\bwhat our (patients|clients) (say|think)\b|\b5[- ]star (review|rated)\b|["“][^"”]{25,}["”]\s*[-–—]\s*[A-Z][a-z]+/ },
  { k: "superlative", strong: false, label: "a \"best\" or \"number one\" claim (AHPRA)", re: /\b(best|leading|number one|no\.? ?1|#1|top[- ]rated)\s+(dentist|dental|chiro\w*|physio\w*|osteo\w*|podiatr\w*|psycholog\w*|clinic|practice|practitioner)s?\b/i },
  { k: "health_details", strong: false, label: "asking for health details by message", re: /\b(medicare (number|card)|date of birth|\bdob\b|medical history|list of (your )?medications|what medications)\b/i }
];
function healthFlags(text) { const t = String(text || ""); return HEALTH_CHECKS.filter((c) => c.re.test(t)).map((c) => ({ k: c.k, strong: c.strong, label: c.label })); }
async function healthMode(env) {
  const now = Date.now(), c = globalThis.__sfHealthMode;
  if (c && now - c.at < 3e5) return c.on;
  const i = await instGet(env).catch(() => null);
  const on = !!(i?.custom && /allied|dental|dentist|medical|psych|chiro|physio|osteo|podiatr|health|clinic/i.test(String(i.template || "") + " " + String(i.industry || "")));
  globalThis.__sfHealthMode = { at: now, on };
  return on;
}
async function healthGate(env, out) {
  if (!out || !out.reply || out.handoff || !(await healthMode(env).catch(() => false))) return out;
  const strong = healthFlags(out.reply).filter((f) => f.strong);
  if (!strong.length) return out;
  return { reply: "", handoff: true, reason: "Health check: the reply looked like " + strong.map((f) => f.label).join(" and ") + ", so it wasn't sent automatically. Suggested words: " + String(out.reply).slice(0, 600) };
}
'''
rep("async function askTy(env, action, { urgent = false, settings = null } = {}) {", H + "\nasync function askTy(env, action, { urgent = false, settings = null } = {}) {")
rep("""  if (body) lines.push(`<i>${esc2(String(body).slice(0, 700))}</i>`);
  if (p.lines) lines.push(""", """  if (body) lines.push(`<i>${esc2(String(body).slice(0, 700))}</i>`);
  if (body && await healthMode(env).catch(() => false)) { const hf = healthFlags([p.subject, body, p.html].filter(Boolean).join(" ")); if (hf.length) lines.push("\\u26A0\\uFE0F <b>Health check:</b> this looks like " + esc2(hf.map((f) => f.label).join("; ")) + ". Edit it before approving."); }
  if (p.lines) lines.push(""")
rep("""  return inboxParse(raw, channel);
}
function inboxParse(raw, channel) {""", """  return await healthGate(env, inboxParse(raw, channel));
}
function inboxParse(raw, channel) {""")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v104 applied')
