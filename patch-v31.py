# v31: every Studio Flow product in Command > Offers (and so on /offers, in Studio AI, DM replies,
# demos and team knowledge): CRM setup, automation build, Studio AI Command plans, white-label, founding offer.
import sys, re, hashlib
f = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(f).read()
items = """  {id:'crm_setup',group:'systems',title:'CRM setup (GoHighLevel)',description:'Your CRM set up for you: contacts, pipelines, calendars, forms and automations, ready for your team on day one.',features:['Pipelines, calendars and forms set up','Enquiries, bookings and payments in one place','CRM from $197 a month on our agency plan'],enabled:true,price:1500,from:true},
  {id:'automation_build',group:'systems',title:'Automation build',description:'Follow-up, reminders, bookings and payments that run themselves, built around how your team works.',features:['Lead follow-up and reminders','Booking and payment flows','Quoted after a short call'],enabled:true,price:1500,from:true},
  {id:'command_core',group:'command',title:'Studio AI Command \\u00b7 Core',description:'Your AI command hub for one location, plugged into your CRM, Stripe and Telegram: every enquiry answered and followed up, lost money chased, and a morning brief on your phone.',features:['One-off setup $4,900','CRM, AI receptionist and follow-up included','Money recovery: unpaid invoices and failed payments','Morning brief and one-tap approvals on Telegram'],enabled:true,price:1497,was:1997,unit:'month'},
  {id:'command_growth',group:'command',title:'Studio AI Command \\u00b7 Growth',description:'Everything in Core for growing teams: phone AI, social replies and reporting across up to three locations.',features:['One-off setup $9,500','Everything in Core, plus phone AI','Instagram, Facebook and SMS replies','Up to 3 locations and a monthly results report'],enabled:true,price:2497,was:2997,unit:'month'},
  {id:'command_enterprise',group:'command',title:'Multi-location & enterprise',description:'Every location, team and system in one command hub, with custom integrations and reporting.',features:['Setup from $18,000','Every location in one hub','Custom integrations and reporting','Scoped on a strategy call'],enabled:true,price:3997,from:true,unit:'month'},
  {id:'command_whitelabel',group:'command',title:'White-label Command',description:'Command in your own brand: your logo, colours, web address and AI name, hosted and secured by us.',features:['Your logo, colours and domain','Your own AI name and Telegram bot','Branded app icon on your team\\u2019s phones','Hosting and security $497 a month'],enabled:true,price:7500},
  {id:'command_founding',group:'command',title:'Founding Command offer',description:'For our first three Command clients, in return for a case study: Core at a founding price.',features:['Core setup $2,900','$997 a month for the first 12 months','Only 3 places'],enabled:true,price:997,unit:'month'},
"""
anchor = "\n];\nvar OFFER_GROUPS = ["
assert s.count(anchor) == 1
s = s.replace(anchor, ",\n" + items.rstrip("\n") + anchor, 1)
old = "['systems','04 · SYSTEMS & COMMAND','Connect everything behind the scenes.','From a two-hour audit to your own private command centre.']];"
assert s.count(old) == 1
s = s.replace(old, "['systems','04 · SYSTEMS','Connect everything behind the scenes.','From a two-hour audit to a CRM and automations that run themselves.'],['command','05 · STUDIO AI COMMAND','Your whole business, one command hub.','Plugged into your CRM, Stripe and Telegram: leads won back, money recovered, every location in one place.']];")
oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace(oldv, hashlib.sha1(s.encode()).hexdigest()[:10])
open(f, 'w').write(s)
print('v31 products added')
s = open(f).read()
assert s.count("monthly:'Monthly plans',systems:'Systems'}") == 1
s = s.replace("monthly:'Monthly plans',systems:'Systems'}", "monthly:'Monthly plans',systems:'Systems',command:'Command'}")
open(f, 'w').write(s)
s = open(f).read()
old = "({receptionist:'AI receptionist',website:'Website',monthly:'Monthly plan',systems:'Systems'}"
assert s.count(old) == 1
s = s.replace(old, "({receptionist:'AI receptionist',website:'Website',monthly:'Monthly plan',systems:'Systems',command:'Studio AI Command'}")
open(f, 'w').write(s)
