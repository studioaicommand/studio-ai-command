# v96 Bounce guard (GHL suspends email at a 5% bounce rate and warns at 3%; good cold email stays under 2%):
# - every outreach address must have a working mail server (MX check over DNS) before it's queued or enrolled;
# - an address that has bounced before is never enrolled again;
# - bounce brake: if this week's bounces pass 5% of new enrolments (3 or more bounces), new outreach is held
#   automatically and Ty is told once a day, until the rate comes back down.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

G = r'''
// v96 bounce guard
var MX_CACHE = new Map();
async function mailServerOk(domain) {
  domain = String(domain || "").toLowerCase().replace(/^.*@/, "").trim();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return false;
  if (MX_CACHE.has(domain)) return MX_CACHE.get(domain);
  let ok = true;
  try {
    const r = await fetch("https://cloudflare-dns.com/dns-query?name=" + encodeURIComponent(domain) + "&type=MX", { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5e3) });
    const d = await r.json();
    if (d.Status === 3) ok = false; // the domain doesn't exist
    else if (d.Status === 0) { const mx = (d.Answer || []).filter((a) => a.type === 15); ok = mx.length > 0 && !mx.every((a) => /^0\s+\.?$/.test(String(a.data).trim())); }
  } catch (e) { ok = true; } // DNS lookup failed: don't block on our own hiccup
  MX_CACHE.set(domain, ok);
  return ok;
}
var EMAIL_TYPO = /@(gmial|gamil|gmai|gnail|hotmial|hotmal|outlok|yahooo|iclod)\.|\.(con|cmo|comm|ocm)$/i;
async function bounceGate(env, email) {
  email = String(email || "").trim().toLowerCase();
  if (EMAIL_TYPO.test(email)) return "Not enrolled: " + email + " looks like a typo, so it would bounce.";
  const st = await emailStatsGet(env).catch(() => null);
  if (st && (st.recent || []).some((x) => x.event === "bounced" && String(x.email || "").toLowerCase() === email)) return "Not enrolled: " + email + " has bounced before.";
  if (!(await mailServerOk(email))) return "Not enrolled: " + email.split("@")[1] + " has no working mail server, so the email would bounce. Call them instead.";
  return null;
}
async function bounceBrake(env) {
  const st = await emailStatsGet(env).catch(() => null);
  if (!st) return null;
  const now = new Date(Date.now() + 10 * 36e5), days = [];
  for (let i = 0; i < 7; i++) days.push(new Date(now - i * 864e5).toISOString().slice(0, 10));
  const bounces = days.reduce((n, d) => n + ((st.days || {})[d]?.bounced || 0), 0);
  if (bounces < 3) return null;
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const sent = (await select(env, "team_actions", `type=eq.campaign_enrol&status=eq.done&decided_at=gte.${since}&select=id&limit=2000`).catch(() => [])).length;
  const rate = bounces / Math.max(sent, 1);
  if (rate < 0.05) return null;
  const msg = "Outreach is on hold: " + bounces + " bounces from " + sent + " new contacts this week (" + Math.round(rate * 100) + "%). GHL warns at 3% and suspends email at 5%. Clean the list before more go out; held emails send themselves when the rate is back under 5%.";
  const ns = (await linkGet(env, "notify_state").catch(() => null)) || {};
  const day = now.toISOString().slice(0, 10);
  if (ns.bounce_brake !== day) { await saveSetting(env, "notify_state", { ...ns, bounce_brake: day }).catch(() => {}); await notify(env, "\u{1F6D1} <b>Bounce brake</b>\n" + esc6(msg), { urgent: true }).catch(() => {}); }
  return msg;
}
'''
rep('async function enrolCheck(env, p) {', G.lstrip('\n') + 'async function enrolCheck(env, p) {')
rep("""Phone-only clinics go to Calls today instead.`;
  return null;""", """Phone-only clinics go to Calls today instead.`;
  { const bg = await bounceGate(env, p.email); if (bg) return bg; }
  return null;""")
rep("""  const cap = await enrolCap(env, c);
  if (today.length >= cap) throw later(""", """  { const brake = await bounceBrake(env); if (brake) throw later(brake); }
  const cap = await enrolCap(env, c);
  if (today.length >= cap) throw later(""")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v96 applied')
