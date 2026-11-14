# v95 Review desk: one system for Google reviews, no double handling.
# - The GHL workflow "SF | Client | Google Review Request" sends the branded email + one SMS when a contact gets the tag
#   ask-for-review. Command never writes its own first ask any more: a "job done" event from GHL just adds that tag.
# - Every morning (and on "Check reviews now") Command reads the Google reviews, tells Ty about new ones, and tags
#   whoever left one review-left, which stops the workflow's SMS reminder.
# - 9 days after the ask, anyone who still hasn't left one gets ONE personal nudge from Ty, drafted by Command and
#   sent only when Ty approves. Then it stops for good.
# - Works for client copies of Command too (their own GHL, their own Google listing).
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

rep(', "inbox_quiet", "inbox_voice"].includes(key)', ', "inbox_quiet", "inbox_voice", "review_desk"].includes(key)')

# settings: who sends the first ask (GHL workflow by default)
rep("""  if (/^https:\\/\\/\\S{8,300}$/.test(String(v.review_link || ''))) out.review_link = String(v.review_link);
  return out;""", """  if (/^https:\\/\\/\\S{8,300}$/.test(String(v.review_link || ''))) out.review_link = String(v.review_link);
  out.review_flow = v.review_flow === 'command' ? 'command' : 'ghl';
  return out;""")

# a "job done" event from GHL: hand the ask to the GHL workflow by tagging, instead of Command writing its own
rep("""async function inboxReview(env, contactId, settings) {
  const cfg = inboxSettings(settings);
  if (cfg.reviews === 'off') return { skipped: 'reviews off' };""", """async function inboxReview(env, contactId, settings) {
  const cfg = inboxSettings(settings);
  if (cfg.reviews === 'off') return { skipped: 'reviews off' };
  if (cfg.review_flow !== 'command') {
    await addTags(env, contactId, [REVIEW_TAG]);
    await audit(env, { actor: 'Command', action: 'review_asked', target_type: 'contact', target_id: contactId, summary: 'Tagged ' + REVIEW_TAG + ' so the GHL review workflow sends the branded ask' }).catch(() => {});
    return { tagged: REVIEW_TAG, note: 'The GHL review workflow sends the ask; Command watches for the review and chases once after 9 days.' };
  }""")

DESK = r'''
// v95 Review desk: Command watches Google reviews and works alongside the GHL review workflow (never doubling up).
var REVIEW_TAG = "ask-for-review", REVIEW_LEFT = "review-left", REVIEW_CHASED = "review-chased", REVIEW_CHASE_DAYS = 9;
async function reviewPlace(env, d) {
  const key = env.GOOGLE_PLACES_KEY;
  if (!key) return null;
  let id = env.GOOGLE_PLACE_ID || d.place_id;
  if (!id) {
    const inst = await instGet(env).catch(() => ({}));
    const q = env.REVIEW_PLACE_QUERY || inst.business_name || "Studio Flow & Systems";
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST", headers: { "content-type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id,places.displayName" }, body: JSON.stringify({ textQuery: q }), signal: AbortSignal.timeout(15e3) }).then((x) => x.json()).catch(() => null);
    id = r?.places?.[0]?.id;
    if (!id) return null;
    d.place_id = id; d.place_name = r.places[0].displayName?.text || q;
  }
  const p = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(id), { headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "rating,userRatingCount,reviews" }, signal: AbortSignal.timeout(15e3) }).then((x) => x.json()).catch(() => null);
  if (!p) return null;
  return { rating: p.rating || null, count: p.userRatingCount || 0, reviews: (p.reviews || []).map((x) => ({ author: String(x.authorAttribution?.displayName || "").slice(0, 80), stars: x.rating || 0, text: String(x.text?.text || x.originalText?.text || "").slice(0, 300), at: x.publishTime || "" })).filter((x) => x.author) };
}
var revNorm = (s2) => String(s2 || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
function revMatch(author, contactName) {
  const a = " " + revNorm(author) + " ", c = revNorm(contactName).split(" ").filter((w) => w.length > 1);
  if (c.length < 1) return false;
  if (c.length === 1) return a.trim().split(" ").length === 1 && a.includes(" " + c[0] + " ");
  return a.includes(" " + c[0] + " ") && a.includes(" " + c[c.length - 1] + " ");
}
async function reviewDesk(env, { force = false } = {}) {
  if (!enabled(env)) return { skipped: "GHL not connected" };
  const settings = await getSettings(env).catch(() => ({}));
  const cfg = inboxSettings(settings);
  if (cfg.reviews === "off") return { skipped: "reviews off" };
  const d = (await linkGet(env, "review_desk").catch(() => null)) || {};
  d.asked = d.asked || {}; d.seen = d.seen || {};
  const today = brisbaneNow().date;
  if (!force && (brisbaneNow().hour !== 9 || d.last_run === today)) return { skipped: "not time yet" };
  d.last_run = today;
  const out = { asked: 0, new_reviews: [], matched: [], chased: [] };
  // 1. who has been asked (tag added by Ty, Command or a GHL "job done" event)
  const asked = await searchByTag(env, REVIEW_TAG, 100).catch(() => []);
  for (const c of asked) {
    const tags = (c.tags || []).map((t) => String(t).toLowerCase());
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.contactName || "";
    const a = d.asked[c.id] || (d.asked[c.id] = { name, first_seen: new Date().toISOString() });
    a.name = name || a.name;
    if (tags.includes(REVIEW_LEFT)) a.reviewed = a.reviewed || new Date().toISOString();
    if (tags.includes(REVIEW_CHASED)) a.chased = a.chased || new Date().toISOString();
    a.phone = !!c.phone; a.email = !!c.email;
  }
  out.asked = Object.keys(d.asked).length;
  // 2. new Google reviews: tell Ty, and stop the reminder for anyone we asked who has now left one
  const g = await reviewPlace(env, d).catch(() => null);
  if (g) {
    d.rating = g.rating; d.count = g.count;
    for (const r of g.reviews) {
      const k = revNorm(r.author) + "|" + r.at;
      if (d.seen[k]) continue;
      d.seen[k] = new Date().toISOString();
      const hit = Object.entries(d.asked).find(([, a]) => !a.reviewed && revMatch(r.author, a.name));
      if (hit) { await addTags(env, hit[0], [REVIEW_LEFT]).catch(() => {}); hit[1].reviewed = new Date().toISOString(); out.matched.push(hit[1].name); }
      out.new_reviews.push({ ...r, matched: hit ? hit[1].name : null });
    }
  } else if (!d.told_key && !env.GOOGLE_PLACES_KEY) {
    d.told_key = true;
    await notify(env, "⭐ <b>Review desk</b>\nI can't see your Google reviews yet. Add a Google Places API key as GOOGLE_PLACES_KEY in Cloudflare and I'll check them every morning, thank you for new ones and stop reminders for people who've already left one. Until then, tell me \"Jess left a review\" and I'll tag them.").catch(() => {});
  }
  // 3. one personal nudge, 9 days after the ask, for anyone who still hasn't (Ty approves it first)
  const link = cfg.review_link || env.REVIEW_LINK || "";
  for (const [id, a] of Object.entries(d.asked)) {
    if (a.reviewed || a.chased || Date.now() - Date.parse(a.first_seen) < REVIEW_CHASE_DAYS * 864e5 || !link) continue;
    const prior = await select(env, "team_actions", "type=eq.ghl_followup&params->>kind=eq.review_chase&params->>contact_id=eq." + encodeURIComponent(id) + "&select=id&limit=1").catch(() => []);
    if (prior.length) { a.chased = a.chased || new Date().toISOString(); continue; }
    let contact = {}; try { contact = (await getContact(env, id))?.contact || {}; } catch (e) {}
    if (contact.dnd) { a.chased = "dnd"; continue; }
    const channel = contact.phone && cfg.sms_live && cfg.sms !== "off" ? "sms" : contact.email ? "email" : null;
    if (!channel) continue;
    const first = contact.firstName || String(a.name).split(" ")[0] || "";
    const direction = "Write ONE short, personal, no-pressure nudge from Ty to " + (first || "them") + ". They had our review request about a week ago. Ask if they had a chance to leave a quick Google review, say it genuinely helps, and say no worries either way. Put this link on its own line: " + link + (channel === "email" ? ' This is an EMAIL: put "Subject: " and a short subject on the first line, then start with "Hi ' + first + '," and sign off "Cheers, Ty".' : " This is an SMS: under 300 characters, end with 'Reply STOP to opt out.'");
    const draft = await inboxWrite(env, channel, contact, [{ role: "user", content: "(A week ago we asked them for a Google review. No reply yet.)" }], direction, { voice: true }).catch(() => ({ reply: "" }));
    if (!draft.reply) continue;
    let subject = "", message = draft.reply;
    if (channel === "email") { const m = message.match(/^\s*Subject:\s*(.+)\n+/i); subject = m ? m[1].trim().slice(0, 120) : "Quick favour?"; message = m ? message.slice(m[0].length) : message; }
    if (!message.includes(link)) message += "\n\n" + link;
    const [row] = await insert(env, "team_actions", [{ department: "head_of_sales", type: "ghl_followup", title: ("Review nudge to " + (a.name || "a client") + " (one only)").slice(0, 200), reason: ("The GHL review workflow asked " + REVIEW_CHASE_DAYS + "+ days ago" + (g ? " and there's no Google review from them yet." : ". I can't see Google reviews yet, so check they haven't already left one.") + " This is the only nudge; after it, Command stops.").slice(0, 500), params: { kind: "review_chase", contact_id: id, contact_name: a.name, channel, send_type: INBOX_CHANNELS[channel].send, subject, message }, status: "pending" }]).catch(() => []);
    if (!row) continue;
    a.chased = new Date().toISOString();
    await addTags(env, id, [REVIEW_CHASED]).catch(() => {});
    await askTy(env, row, { settings }).catch(() => null);
    out.chased.push(a.name);
  }
  // keep it small
  const keys = Object.keys(d.seen); if (keys.length > 300) for (const k of keys.slice(0, keys.length - 300)) delete d.seen[k];
  await saveSetting(env, "review_desk", d);
  if (out.new_reviews.length) {
    const lines = out.new_reviews.slice(0, 5).map((r) => "⭐".repeat(Math.max(1, Math.min(5, r.stars))) + " <b>" + esc2(r.author) + "</b>" + (r.text ? ": <i>" + esc2(r.text.slice(0, 160)) + "</i>" : "") + (r.matched ? "\n   ✅ One of your clients: I've tagged them review-left, so their reminder won't go out." : ""));
    await notify(env, "⭐ <b>New Google review" + (out.new_reviews.length > 1 ? "s" : "") + "</b>" + (d.rating ? " (now " + d.rating + "★ from " + d.count + ")" : "") + "\n" + lines.join("\n")).catch(() => {});
  }
  return { ok: true, ...out, rating: d.rating || null, count: d.count || null, watching: !!g };
}
'''
rep('async function inboxReview(env, contactId, settings) {', DESK.lstrip('\n') + 'async function inboxReview(env, contactId, settings) {')
rep('  await inboxFollowups(e).catch((x) => console.error("follow-ups:", x.message));',
    '  await inboxFollowups(e).catch((x) => console.error("follow-ups:", x.message));\n  await reviewDesk(e).catch((x) => console.error("review desk:", x.message));')

# a button-free way to run it now, and a status for the hub / Studio AI
rep('  if (seg[0] === "mac-link") { const r54', '  if (seg[0] === "reviews") { const J95 = (o, st = 200) => json(o, st); if (p === "/reviews/check" && m === "POST") return J95(await reviewDesk(env, { force: true })); if (p === "/reviews" && m === "GET") { const d = (await linkGet(env, "review_desk").catch(() => null)) || {}; const as = Object.values(d.asked || {}); return J95({ ok: true, rating: d.rating || null, count: d.count || null, watching: !!env.GOOGLE_PLACES_KEY, asked: as.length, reviewed: as.filter((a) => a.reviewed).length, chased: as.filter((a) => a.chased).length, waiting: as.filter((a) => !a.reviewed).map((a) => a.name).slice(0, 30) }); } }\n  if (seg[0] === "mac-link") { const r54')

# Command knows how reviews work, so it never doubles up
rep('    "OUTREACH: cold outreach runs through Ty',
    '    "REVIEWS: Google review requests are sent by the GHL workflow \\"SF | Client | Google Review Request\\" (branded email the day after, then one SMS 4 days later unless they clicked the link or are tagged review-left). To ask someone for a review, add the GHL tag ask-for-review to them; never write your own review request. The review desk checks Google reviews every morning, tags review-left when a client has left one (that stops the SMS) and, 9 days after the ask, drafts ONE personal nudge from Ty for his yes, then stops. If Ty says someone has left a review, tag them review-left.",\n    "OUTREACH: cold outreach runs through Ty')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v95 applied')
