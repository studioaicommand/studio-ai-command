# v34: Command simplified to six main screens (Today, Inbox, Clients, Growth, Studio AI, Settings).
# Every old screen still exists and keeps its link; it now lives as a tab inside one of the six.
import sys, re, hashlib
f = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(f).read()

def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:90], s.count(old))
    s = s.replace(old, new)

# 1) Navigation model: six hubs, each with its tabs.
old_nav_start = s.index('  const NAV = [\n    ["Command", [["today"')
old_nav_end = s.index('  const TITLES = {', old_nav_start)
s = s[:old_nav_start] + '''  const HUBS = [
    ["today", "Today", "home", [["today", "Today"], ["home", "Overview"], ["reports", "Reports"]]],
    ["inbox", "Inbox", "check", [["approvals", "Waiting for you"], ["records", "History"]]],
    ["clients", "Clients", "shop", [["clients", "Clients"], ["money", "Money"], ["offers", "Products & prices"]]],
    ["growth", "Growth", "growth", [["growth", "Pipeline"], ["business", "Businesses"], ["goals", "Goals"]]],
    ["studio", "Studio AI", "studio", [["studio", "Talk to Studio"], ["team", "Team"], ["jobs", "AI jobs"], ["memory", "Memory"]]],
    ["settings", "Settings", "sliders", [["autopilot", "Autopilot"], ["connections", "Connections"], ["systems", "Systems lab"]]],
  ];
  const hubOf = (view) => HUBS.find((h) => h[3].some((t) => t[0] === view)) || HUBS[0];
  const HUB_ALIAS = { inbox: "approvals", settings: "autopilot" };
  const TABS = [["today", "Today", "home"], ["inbox", "Inbox", "check"], ["clients", "Clients", "shop"], ["growth", "Growth", "growth"], ["more", "More", "more"]];
''' + s[old_nav_end:]

rep('''    approvals: ["Approvals", "Nothing reaches a client or touches money without your yes"],''',
    '''    approvals: ["Inbox", "Replies, invoices and outreach waiting for your yes. Nothing reaches a client without it"],''')
rep('''    autopilot: ["Autopilot", "What runs on its own, when, and what always waits for you"],''',
    '''    autopilot: ["Settings", "What runs on its own, when, and what always waits for you"],''')

# 2) Sidebar: six items, a short line under the brand.
rep('''      '<nav class="nav">' + NAV.map(([g, items]) => '<div class="grp">' + g + "</div>" + items.map(([id, label, i]) => '<a href="#/' + id + '" data-nav="' + id + '" title="' + label + '">' + ic(i) + '<span class="t">' + label + "</span>" + (id === "approvals" ? '<span class="badge" data-badge hidden></span>' : "") + "</a>").join("")).join("") + "</nav>" +''',
    '''      '<nav class="nav"><div class="grp">Command</div>' + HUBS.map(([id, label, i, subs]) => '<a href="#/' + subs[0][0] + '" data-nav="' + id + '" title="' + label + '">' + ic(i) + '<span class="t">' + label + "</span>" + (id === "inbox" ? '<span class="badge" data-badge hidden></span>' : "") + "</a>").join("") + "</nav>" +''')

# 3) Phone tabs + More sheet.
rep('''      '<nav class="tabs" aria-label="Tabs">' + TABS.map(([id, label, i]) => '<a href="#/' + id + '" data-tab="' + id + '">' + ic(i) + label + (id === "approvals" ? '<span class="badge" data-badge hidden></span>' : "") + "</a>").join("") + "</nav>" +''',
    '''      '<nav class="tabs" aria-label="Tabs">' + TABS.map(([id, label, i]) => '<a href="#/' + (HUB_ALIAS[id] || id) + '" data-tab="' + id + '">' + ic(i) + label + (id === "inbox" ? '<span class="badge" data-badge hidden></span>' : "") + "</a>").join("") + "</nav>" +''')
rep('''    const items = [["offers", "Offers", "shop"], ["business", "Businesses", "shop"], ["home", "Business overview", "target"], ["clients", "Clients", "shop"], ["team", "Team", "team"], ["reports", "Reports", "reports"], ["goals", "Goals & KPIs", "target"], ["connections", "Connections", "link"], ["autopilot", "Autopilot", "sliders"], ["memory", "Memory", "db"]];''',
    '''    const items = [["studio", "Studio AI", "studio"], ["autopilot", "Settings", "sliders"], ["money", "Money", "target"], ["offers", "Products & prices", "shop"], ["home", "Overview", "target"], ["reports", "Reports", "reports"]];''')

# 4) Router: /inbox and /settings work; highlight the hub; tabs inside each hub.
rep('''    const view = TITLES[h[0]] ? h[0] : "today";''',
    '''    if (HUB_ALIAS[h[0]]) h[0] = HUB_ALIAS[h[0]];
    const view = TITLES[h[0]] ? h[0] : "today";''')
rep('''    $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === ROUTE.view));
    $$("[data-tab]").forEach((a) => a.classList.toggle("on", a.dataset.tab === ROUTE.view || (a.dataset.tab === "more" && !["today", "studio", "approvals", "growth"].includes(ROUTE.view))));''',
    '''    const hub = hubOf(ROUTE.view);
    $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === hub[0]));
    $$("[data-tab]").forEach((a) => a.classList.toggle("on", a.dataset.tab === hub[0] || (a.dataset.tab === "more" && !["today", "inbox", "clients", "growth"].includes(hub[0]))));''')
rep('''    v.innerHTML = '<div class="vt"><h1>' + esc(t) + "</h1><p>" + esc(s) + "</p></div>";''',
    '''    v.innerHTML = '<div class="vt"><h1>' + esc(t) + "</h1><p>" + esc(s) + "</p></div>" + (hub[3].length > 1 ? '<nav class="subnav" aria-label="' + esc(hub[1]) + '">' + hub[3].map((x) => '<a href="#/' + x[0] + '"' + (x[0] === ROUTE.view ? ' class="on" aria-current="page"' : "") + ">" + esc(x[1]) + "</a>").join("") + "</nav>" : "");''')

# 5) Styles for the tabs inside each screen.
a = ".more-sheet .navlist a:hover{background:rgba(125,190,255,.07)}"
rep(a, a + "\n.subnav{display:flex;gap:6px;margin:-4px 0 18px;padding:4px;border-radius:14px;background:rgba(125,190,255,.05);border:1px solid var(--ln);width:max-content;max-width:100%;overflow-x:auto;scrollbar-width:none}.subnav::-webkit-scrollbar{display:none}.subnav a{flex:none;padding:8px 14px;border-radius:10px;font-size:13.5px;font-weight:600;color:var(--mu);text-decoration:none;white-space:nowrap;transition:background .2s,color .2s}.subnav a:hover{color:var(--tx)}.subnav a.on{background:linear-gradient(180deg,rgba(56,189,248,.22),rgba(56,189,248,.1));color:#fff;box-shadow:inset 0 0 0 1px rgba(56,189,248,.35)}@media (max-width:760px){.subnav{width:100%;margin:-2px 0 14px}.subnav a{padding:8px 12px;font-size:13px}}")

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace(oldv, hashlib.sha1(s.encode()).hexdigest()[:10])
open(f, 'w').write(s)
print('v34 six screens applied')
