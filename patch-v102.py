# v102 AI cost saver ("lean mode until revenue").
# 1) More prompt caching: the team's per-run memory block and the growing conversation in multi-step agent runs are
#    cached too (cache reads cost ~10% of normal input). Never more than Anthropic's 4 cache points.
# 2) Internal analysis (research, funnel and cash reviews, client health, brand radar, systems reviews, weekly reports,
#    content plan, the Team Leader's grading) runs on Haiku. Anything a customer or lead reads stays on Sonnet.
# 3) Lean schedule while Stripe shows no money in the last 30 days: one prospect hunt a day (not three), and research,
#    brand radar, authority content and the newsletter run every second week. Switches off by itself once revenue lands.
# 4) Daily cap on background AI (default US$3 while lean, US$12 otherwise). Customer replies, chats and the inbox sweep
#    are never paused by it. Settings: lean_mode auto|on|off, bg_cap_usd. Route /lean shows it all.
import sys, re, hashlib
W = sys.argv[1] if len(sys.argv) > 1 else 'worker.mjs'
s = open(W).read()
def rep(old, new, count=1):
    global s
    assert s.count(old) == count, ('anchor', old[:100], s.count(old))
    s = s.replace(old, new)

H = r'''
// ── v102 AI cost saver ──
function cacheMore(body) {
  try {
    const count = (x) => (JSON.stringify(x || "").match(/"cache_control"/g) || []).length;
    let n = count(body.system) + count(body.tools) + count(body.messages);
    if (n >= 4) return body;
    let out = body;
    if (Array.isArray(body.system) && body.system.length > 1) {
      const last = body.system[body.system.length - 1];
      const len = body.system.reduce((a, b) => a + String(b?.text || "").length, 0);
      if (last && last.type === "text" && last.text && !last.cache_control && len > 4000) { out = { ...out, system: [...body.system.slice(0, -1), { ...last, cache_control: { type: "ephemeral" } }] }; n++; }
    }
    const msgs = out.messages;
    if (n < 4 && Array.isArray(msgs) && msgs.length >= 3) {
      const i = msgs.length - 1, m = msgs[i];
      const parts = typeof m.content === "string" ? (m.content ? [{ type: "text", text: m.content }] : null) : Array.isArray(m.content) ? m.content.slice() : null;
      if (parts && parts.length) {
        const j = parts.length - 1, lp = parts[j];
        if (lp && !lp.cache_control && ["text", "tool_result", "image", "document"].includes(lp.type) && !(lp.type === "text" && !lp.text)) {
          parts[j] = { ...lp, cache_control: { type: "ephemeral" } };
          out = { ...out, messages: [...msgs.slice(0, i), { ...m, content: parts }] };
        }
      }
    }
    return out;
  } catch { return body; }
}
var LEAN_HAIKU_SOURCES = /^(market_research|marketing_review|finance_check|client_health|brand_radar|systems_review|ops_health|weekly_reports|content_plan|team_leader|coach)/;
var LEAN_SKIP_SHIFTS = new Set(["prospect_hunt_pm", "prospect_hunt_eve"]);
var LEAN_FORTNIGHTLY = new Set(["market_research", "brand_radar", "authority_content", "email_nurture"]);
var leanFast = (env) => env.LEAN_MODEL || "claude-haiku-5-5";
async function leanState(env, { refresh = false } = {}) {
  const r = await select(env, "team_settings", "key=eq.ai_lean&select=value&limit=1").catch(() => []);
  const st = r?.[0]?.value || {};
  const mode = ["on", "off"].includes(st.mode) ? st.mode : "auto";
  const today = brisbaneNow().date;
  if (mode === "auto" && (refresh || st.checked !== today)) {
    const inst = await instGet(env).catch(() => null);
    if (inst?.custom || inst?.modules?.outreach === false) { st.revenue_30d = null; st.auto_lean = false; st.note = "client copy"; }
    else if (!env.STRIPE_SECRET_KEY) { st.revenue_30d = null; st.auto_lean = false; st.note = "Stripe not connected"; }
    else {
      try { const rv = await revenueSummary(env, 30); st.revenue_30d = Number(rv?.current?.net) || 0; st.auto_lean = st.revenue_30d <= 0; st.note = ""; }
      catch (e) { st.auto_lean = false; st.note = "couldn't read Stripe: " + String(e.message).slice(0, 100); }
    }
    st.checked = today;
    await saveSetting(env, "ai_lean", st).catch(() => {});
  }
  const lean = mode === "on" ? true : mode === "off" ? false : !!st.auto_lean;
  const cap = Number(st.bg_cap_usd) > 0 ? Number(st.bg_cap_usd) : lean ? 3 : 12;
  return { mode, lean, revenue_30d: st.revenue_30d ?? null, note: st.note || "", bg_cap_usd: cap, checked: st.checked || null };
}
async function aiSpendToday(env) {
  const b = brisbaneNow();
  const start = new Date(Date.parse(b.date + "T00:00:00+10:00")).toISOString();
  const rows = await select(env, "team_usage", "created_at=gte." + encodeURIComponent(start) + "&select=cost_usd,source&limit=5000").catch(() => []);
  return Math.round(rows.reduce((a, x) => a + (Number(x.cost_usd) || 0), 0) * 100) / 100;
}
async function bgHeld(env) {
  const ls = await leanState(env).catch(() => ({ lean: false, bg_cap_usd: 12 }));
  const spent = await aiSpendToday(env).catch(() => 0);
  return { held: spent >= ls.bg_cap_usd, spent, ...ls };
}
function leanShiftSkip(id, lean, dateStr) {
  if (!lean) return false;
  if (LEAN_SKIP_SHIFTS.has(id)) return true;
  if (LEAN_FORTNIGHTLY.has(id)) { const d = new Date(Date.parse(dateStr + "T00:00:00Z")); const wk = Math.floor((d.getTime() / 864e5 + 3) / 7); return wk % 2 === 1; }
  return false;
}
'''
rep("async function runDueShifts(env, when = /* @__PURE__ */ new Date()) {", H + "\nasync function runDueShifts(env, when = /* @__PURE__ */ new Date()) {")

# 1) caching
rep('''  if (typeof body.system === "string" && body.system.length > 3500) body = { ...body, system: [{ type: "text", text: body.system, cache_control: { type: "ephemeral" } }] };''',
    '''  if (typeof body.system === "string" && body.system.length > 3500) body = { ...body, system: [{ type: "text", text: body.system, cache_control: { type: "ephemeral" } }] };
  body = cacheMore(body);''')

# 2) Haiku for internal analysis
rep("const model2 = env.TEAM_MODEL || env.CLAUDE_MODEL || MODEL;", "const model2 = (env.TEAM_MODEL_FIXED ? env.TEAM_MODEL : \"\") || env.CLAUDE_MODEL || (LEAN_HAIKU_SOURCES.test(String(source || \"\")) ? leanFast(env) : env.TEAM_MODEL || MODEL);")
rep('  e.TEAM_MODEL = env.TEAM_MODEL || "claude-sonnet-5-5";', '  e.TEAM_MODEL_FIXED = !!env.TEAM_MODEL;\n  e.TEAM_MODEL = env.TEAM_MODEL || "claude-sonnet-5-5";')

# 3) lean schedule
rep("  const due = settings.shifts.filter((s) => s.enabled && s.hour === t.hour && s.days.includes(t.dow) && s.last_run !== t.slot);",
    "  const ls102 = await leanState(env).catch(() => ({ lean: false }));\n  const due = settings.shifts.filter((s) => s.enabled && s.hour === t.hour && s.days.includes(t.dow) && s.last_run !== t.slot && !leanShiftSkip(s.id, ls102.lean, t.date));")

# 4) daily background cap (customer-facing work is outside these lines)
rep('''  const aiHold = await aiBackgroundPaused(e).catch(() => false);''', '''  const bg102 = await bgHeld(e).catch(() => ({ held: false }));
  const aiHold = (await aiBackgroundPaused(e).catch(() => false)) || bg102.held;''')

# saveSetting whitelist + route + Command knows
rep('["inbox_sweep", "email_stats", "fair_use_status"', '["ai_lean", "inbox_sweep", "email_stats", "fair_use_status"')
rep('''  if (seg[0] === "inbox-sweep") {''', '''  if (seg[0] === "lean") {
    if (m === "GET") { const b = await bgHeld(env); return json({ ok: true, ...b, rules: { haiku_for: "internal reports and reviews", skipped_while_lean: [...LEAN_SKIP_SHIFTS], fortnightly_while_lean: [...LEAN_FORTNIGHTLY] } }); }
    if (m === "POST") { const b = body || {}; const r = await select(env, "team_settings", "key=eq.ai_lean&select=value&limit=1").catch(() => []); const st = r?.[0]?.value || {}; if (["auto", "on", "off"].includes(b.mode)) st.mode = b.mode; if (b.bg_cap_usd != null) st.bg_cap_usd = Math.max(0, Math.min(200, Number(b.bg_cap_usd) || 0)); st.checked = null; await saveSetting(env, "ai_lean", st); return json({ ok: true, ...(await bgHeld(env)) }); }
  }
  if (seg[0] === "inbox-sweep") {''')
rep('''    "INBOX: Command sees every GHL conversation.''', '''    "AI COSTS: until money is coming in (no Stripe revenue in 30 days) Command runs lean: internal reports on Haiku, one prospect hunt a day, research/brand radar/authority content/newsletter every second week, and background AI stops for the day after US$3 (customer replies never stop). It switches back automatically when revenue lands. Ty can set lean_mode on/off/auto and the daily cap at /lean.",
    "INBOX: Command sees every GHL conversation.''')

oldv = re.search(r'var APP = \{ "v": "([0-9a-f]+)"', s).group(1)
s = s.replace('var APP = { "v": "' + oldv + '"', 'var APP = { "v": "' + hashlib.sha1(s.encode()).hexdigest()[:10] + '"', 1)
open(W, 'w').write(s)
print('v102 applied')
