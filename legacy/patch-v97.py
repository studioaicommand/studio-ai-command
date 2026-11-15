# v97 No-show awareness: the GHL workflow "SF | Sales | No-Show Recovery" already chases missed Free Call and
# Audit bookings (branded email + SMS the same day, SMS a day later, final email 3 days after that, Ty notified).
# Command's no-show rebooker now leaves those alone so nobody gets two rebooking messages, keeps handling
# cancellations (GHL doesn't chase those), and Command knows the flow. Setting inbox.noshow_flow = 'command'
# switches back to the old behaviour.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

# 1) setting
rep("""  out.review_flow = v.review_flow === 'command' ? 'command' : 'ghl';
  return out;""", """  out.review_flow = v.review_flow === 'command' ? 'command' : 'ghl';
  out.noshow_flow = v.noshow_flow === 'command' ? 'command' : 'ghl';
  return out;""")

# 2) rebooker skips no-shows the GHL workflow covers
rep("""  const w = await watchGet(env);
  const cals = env.GHL_CALENDAR_ID ? [{ id: env.GHL_CALENDAR_ID }] : CALENDARS.filter((c) => !/onboarding/i.test(c.name));
  const from = Date.now() - 3 * 864e5, to = Date.now();
  const found = [];
  for (const c of cals) {
    const d = await listEvents(env, from, to, c.id).catch(() => null);
    for (const e of d?.events || []) if (/noshow|no_show|cancel/i.test(String(e.appointmentStatus || "")) && !w.noshow.includes(e.id)) found.push(e);
  }
  let queued = 0;
  for (const e of found.slice(0, 4)) {
    w.noshow.push(e.id);
    const missed = /noshow|no_show/i.test(String(e.appointmentStatus));""", """  const w = await watchGet(env);
  const cals = env.GHL_CALENDAR_ID ? [{ id: env.GHL_CALENDAR_ID }] : CALENDARS.filter((c) => !/onboarding/i.test(c.name));
  const from = Date.now() - 3 * 864e5, to = Date.now();
  const found = [];
  const ghlFlow = inboxSettings(await getSettings(env).catch(() => ({}))).noshow_flow !== "command";
  let ghlHandled = 0;
  for (const c of cals) {
    const d = await listEvents(env, from, to, c.id).catch(() => null);
    for (const e of d?.events || []) {
      if (!/noshow|no_show|cancel/i.test(String(e.appointmentStatus || "")) || w.noshow.includes(e.id)) continue;
      if (ghlFlow && noShowByGhl(e, c)) { w.noshow.push(e.id); ghlHandled++; continue; }
      found.push(e);
    }
  }
  let queued = 0;
  for (const e of found.slice(0, 4)) {
    w.noshow.push(e.id);
    const missed = /noshow|no_show/i.test(String(e.appointmentStatus));""")
rep("""  w.noshow = w.noshow.slice(-300);
  if (found.length) await saveSetting(env, "watch", w);
  return { ok: true, found: found.length, queued };
}""", """  w.noshow = w.noshow.slice(-300);
  if (found.length || ghlHandled) await saveSetting(env, "watch", w);
  return { ok: true, found: found.length, queued, ghl_handled: ghlHandled };
}
// v97: the GHL "SF | Sales | No-Show Recovery" workflow fires on no-shows in the Free Call and Audit calendars.
var NOSHOW_GHL_CALS = /free|audit|consult/i;
function noShowByGhl(e, cal) {
  if (!/noshow|no_show/i.test(String(e?.appointmentStatus || ""))) return false; // cancellations stay with Command
  const name = String(cal?.name || (CALENDARS.find((x) => x.id === (e?.calendarId || cal?.id)) || {}).name || "");
  return NOSHOW_GHL_CALS.test(name) || !name;
}""")

# 3) Command knows the flow
rep("""    "REVIEWS: Google review requests""", """    "NO-SHOWS: missed Free Call and Audit bookings are chased by the GHL workflow \\"SF | Sales | No-Show Recovery\\" (it tags no-show, sends a branded email and an SMS straight away, notifies Ty, one more SMS a day later and a final email 3 days after that, and stops when they rebook). Never write your own rebooking message for a no-show unless Ty asks; Command only proposes rebooking messages for cancellations. If they rebook, remove the no-show tag.",
    "REVIEWS: Google review requests""")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v97 applied')
