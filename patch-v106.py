# v106 (1) Update Announcer: after every deploy, Command teaches each new version's rule changes to every agent (the
# shared rulebook all agents read), retires old rules and memories the update replaces (e.g. "allied health first"),
# and tells Ty on Telegram what was taught. Runs on client Commands too (client-relevant notes only).
# (2) Conversations Ty started himself on Instagram/Facebook are answered in Ty's own voice, never "I'll pass it on to Ty".
# (3) Website and inbox offer: founding pilots are for any established service business, not just clinics.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

H = r'''
// ── v106 Update Announcer: every release teaches the whole team ──
var RELEASE_NOTES = [
  { v: 104, title: "Health safety net for clinic clients", rules: [
    { rule: "For health clinic clients: never give clinical advice, diagnoses, medication or doses, never promise results, never use patient testimonials or 'best clinic' claims (AHPRA), and never ask for health details by message. Book them in or hand over to the practitioner.", applies_to: ["all"] }] },
  { v: 105, studio_only: true, title: "No main niche", rules: [
    { rule: "There is NO main niche. Every industry Ty switches on in Growth gets equal attention (trades, coaches, property, clinics, beauty, fitness, multi-location). Never assume someone is a clinic owner, and in referral asks say 'business owners', not 'clinic owners'.", applies_to: ["all"] }],
    retire: /allied health|(main|core|primary|first|top|focus|beachhead|priority)[^.]{0,40}(niche|clinic)|clinics?[^.]{0,30}(first|main|core|primary|priority|focus)|clinic owners?/i },
  { v: 106, studio_only: true, title: "Ty's own voice in his own DMs", rules: [
    { rule: "When Ty started an Instagram or Facebook conversation himself, reply as Ty in the first person, the way he'd text someone he knows. Never write as an assistant who will 'pass it on to Ty'.", applies_to: ["inbox", "dm"] }] }
];
async function releaseAnnounce(env, { force = false } = {}) {
  const st = (await brainGet(env, "release_state").catch(() => null)) || {};
  const done = new Set(Array.isArray(st.done) ? st.done : []);
  const inst = await instGet(env).catch(() => null);
  const client = !!(inst && inst.custom);
  const todo = RELEASE_NOTES.filter((n) => !done.has(n.v) && !(n.studio_only && client));
  if (!todo.length) return { ok: true, taught: 0, note: "Every agent already knows the latest updates." };
  BRAIN_CACHE = { at: 0, rules: null };
  const rules = (await brainRules(env).catch(() => [])).map((r) => ({ ...r }));
  const at = new Date().toISOString(), taught = [], retired = [], memRetired = [];
  let list = rules;
  for (const n of todo) {
    if (n.retire) {
      const keep = [];
      for (const r of list) { if (r.source !== "release" && n.retire.test(String(r.rule || ""))) retired.push(r.rule); else keep.push(r); }
      list = keep;
      const mem = await select(env, "team_memory", "order=created_at.desc&limit=400&select=id,fact,category").catch(() => []);
      for (const m of mem) if (["rule", "decision", "goal", "offer", "other"].includes(m.category) && n.retire.test(String(m.fact || "")) && /(niche|focus|priorit|first|main|target|beachhead|clinic owners?)/i.test(String(m.fact || ""))) { await remove(env, "team_memory", "id=eq." + encodeURIComponent(m.id)).catch(() => {}); memRetired.push(String(m.fact).slice(0, 120)); }
    }
    for (const r of n.rules || []) {
      if (list.some((x) => x.rule === r.rule)) continue;
      list.push({ id: ridL(), rule: r.rule, applies_to: r.applies_to || ["all"], kind: "update", source: "release", release: n.v, pinned: true, said: 3, at, why: "Command update v" + n.v + ": " + n.title });
      taught.push("v" + n.v + " " + n.title);
    }
    done.add(n.v);
  }
  while (list.length > 80) { const k = list.findIndex((r) => !r.pinned); if (k < 0) break; list.splice(k, 1); }
  await brainPut(env, "team_rules", { rules: list, updated_at: at });
  await saveSetting(env, "release_state", { done: [...done].sort((a, b) => a - b), at });
  await audit(env, { actor: "Update Announcer", action: "release_taught", target_type: "rulebook", target_id: "rules", summary: ("Taught: " + taught.join("; ") + (retired.length ? " | Retired: " + retired.join(" / ") : "")).slice(0, 500) }).catch(() => {});
  const esc = (x) => String(x).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  const msg = ["\u{1F4E3} <b>Update taught to every agent</b>", ...todo.map((n) => "• v" + n.v + ": " + esc(n.title)),
    retired.length ? "\nRetired " + retired.length + " old rule" + (retired.length === 1 ? "" : "s") + ": " + esc(retired.map((r) => "“" + String(r).slice(0, 90) + "”").join(", ")) : "",
    memRetired.length ? "Cleared " + memRetired.length + " old memor" + (memRetired.length === 1 ? "y" : "ies") + " that said otherwise." : "",
    "\nEvery agent reads this before it works. Reply here to change anything."].filter(Boolean).join("\n");
  await notify(env, msg).catch(() => {});
  return { ok: true, taught, retired, memory_cleared: memRetired.length };
}
function inboxTyStarted(channel, msgs, contact) {
  if (channel !== "ig" && channel !== "fb") return false;
  const tags = (contact?.tags || []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => /^warm|dm-desk|ty-dm/.test(t))) return true;
  const first = (msgs || []).find((m) => m && m.body);
  return !!(first && first.direction === "outbound" && (msgs || []).length >= 2);
}
'''
rep("function inboxVoiceRules(opts) {", H + "\nfunction inboxVoiceRules(opts) {")

# Ty's own voice where he started the conversation (Studio Flow's own Command only)
rep("  const voice94 = await inboxVoice(env, contactId).catch(() => false);",
    "  const voice94 = (await inboxVoice(env, contactId).catch(() => false)) || (!(await instGet(env).catch(() => null))?.custom && inboxTyStarted(channel, msgs, contact));")

# pilots open to any service business
rep("• 14-day money-back guarantee on both clinic pilots:", "• 14-day money-back guarantee on both founding pilots:")
rep("• Pilot checkouts are for clinics (allied health, dental, aesthetics, medical, psychology). Other businesses (trades, property managers, coaches and consultants, salons, multi-location groups) book a call for a tailored offer.",
    "• Pilot checkouts are open to any established service business (trades, coaches and consultants, property managers, clinics, salons, fitness, multi-location groups); bigger or unusual setups book a call for a tailored offer.")
rep("For clinic buyers ready to start: checkout_chat or checkout_voice.", "For buyers ready to start: checkout_chat or checkout_voice.")
rep("The Founding Clinic Pilot is $497", "The Founding Pilot is $497")

# run after each deploy: hourly cron + on demand
rep("""  const bg102 = await bgHeld(e).catch(() => ({ held: false }));""", """  await releaseAnnounce(e).catch((x) => console.error("release announce:", x.message));
  const bg102 = await bgHeld(e).catch(() => ({ held: false }));""")
rep('''  if (seg[0] === "lean") {''', '''  if (seg[0] === "release-announce" && m === "POST") return json(await releaseAnnounce(env, { force: true }));
  if (seg[0] === "lean") {''')
rep('["ai_lean", "inbox_sweep",', '["release_state", "ai_lean", "inbox_sweep",')
rep('''    "NICHE: there is NO main niche.''', '''    "UPDATES: after every Command update the Update Announcer teaches the new rules to every agent and retires the old ones it replaces, then tells Ty on Telegram. If Ty asks what changed, check the rulebook entries marked as Command updates.",
    "NICHE: there is NO main niche.''')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v106 applied')
