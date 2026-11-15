# v89 More industries for the DM Desk and LinkedIn: fitness, beauty and hair, real estate, accountants, lawyers, hospitality.
# They start switched OFF for the email autopilot (no GHL campaign tags set up for them yet), and ON for social outreach.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)
rep('''  multi: { name: "Multi-location",''', '''  fitness: { name: "Fitness & gyms", label: "gyms, fitness studios, personal training, pilates and yoga studios", tag: "sf-fitness", target: 20, weekly: 5, off: true, social: true, who: "members and clients", place: "studio", fit: "a studio or gym with a team, class timetable or 50+ Google reviews", skip: "solo online trainers with no studio, franchise head offices", angle: "trial and class enquiries answered late, new members not followed up, no-shows never rebooked" },
  beauty: { name: "Beauty & hair", label: "hair salons, barbers, beauty, lash, brow and nail salons, day spas", tag: "sf-beauty-hair", target: 20, weekly: 5, off: true, social: true, who: "clients", place: "salon", fit: "2+ stylists or therapists, online booking or 50+ Google reviews", skip: "home-based solo operators with no booking system, product-only shops", angle: "Instagram DMs and calls missed while everyone is with a client, gaps in the book, clients who never rebook" },
  realestate: { name: "Real estate", label: "real estate agencies and sales agents", tag: "sf-real-estate", target: 20, weekly: 5, off: true, social: true, who: "buyers, sellers and landlords", place: "agency", fit: "an agency or team with active listings and 30+ reviews", skip: "national franchise head offices, property portals", angle: "buyer and appraisal enquiries answered late, open-home leads never followed up, sellers going to whoever calls back first" },
  accounting: { name: "Accountants & bookkeepers", label: "accounting, tax and bookkeeping firms", tag: "sf-accounting", target: 15, weekly: 4, off: true, social: true, who: "clients", place: "firm", fit: "2+ accountants or bookkeepers, small-business clients, 20+ reviews", skip: "big-four and national firms, solo tax agents with no website", angle: "new-client enquiries waiting days, document chasing by email, the busy season swamping the phones" },
  legal: { name: "Law firms", label: "law firms and lawyers (family, property, wills and estates, business, injury)", tag: "sf-legal", target: 15, weekly: 4, off: true, social: true, who: "clients", place: "firm", fit: "2+ lawyers, a website enquiry form or 20+ reviews", skip: "national firms, barristers' chambers, legal aid", angle: "new-matter enquiries going to voicemail, slow first replies, intake done by hand. Never give legal advice in any message" },
  hospitality: { name: "Hospitality", label: "restaurants, cafes, bars, function and event venues", tag: "sf-hospitality", target: 15, weekly: 4, off: true, social: true, who: "guests", place: "venue", fit: "an established venue with bookings or functions and 100+ Google reviews", skip: "chains run by a head office, food trucks with no bookings", angle: "booking and function enquiries missed during service, DMs answered days later, group bookings going elsewhere" },
  multi: { name: "Multi-location",''')
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v89 applied')
