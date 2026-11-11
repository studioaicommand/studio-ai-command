// v46 AI budget guard. Reads the real month-to-date Claude spend from Anthropic's Cost Report (needs an
// Admin key, ANTHROPIC_ADMIN_KEY), warns on Telegram at the warning level, and pauses background AI work
// (shifts, lead hunts, demo building, reply watch) at the pause level so customer chat, inbox replies and
// phone keep running. If Anthropic's own spend limit is ever hit, Command says so in plain words.
var AI_CAP_RE = /usage limits|spend limit|credit balance|billing|insufficient.*credit/i;
function aiMonth() { return (/* @__PURE__ */ new Date()).toISOString().slice(0, 7); }
async function aiBudgetGet(env) {
  const rows = await select(env, "team_settings", "key=in.(ai_budget,ai_budget_status)&select=key,value").catch(() => []);
  const by = Object.fromEntries(rows.map((r) => [r.key, r.value || {}]));
  return { budget: by.ai_budget || {}, status: by.ai_budget_status || {} };
}
async function aiSpendMonth(env) {
  if (!env.ANTHROPIC_ADMIN_KEY) return null;
  const start = /* @__PURE__ */ new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  let cents = 0, page = null;
  for (let i = 0; i < 3; i++) {
    const qs = new URLSearchParams({ starting_at: start.toISOString(), limit: "31" });
    if (page) qs.set("page", page);
    const r = await fetch("https://api.anthropic.com/v1/organizations/cost_report?" + qs, { headers: { "x-api-key": env.ANTHROPIC_ADMIN_KEY, "anthropic-version": "2023-06-01" }, signal: AbortSignal.timeout(15e3) });
    if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "Anthropic didn't accept the Admin key. Make a new one in console.anthropic.com > Settings > Admin keys." : "Anthropic cost report " + r.status);
    const d = await r.json();
    for (const b of d.data || []) for (const x of b.results || []) cents += Number(x.amount) || 0;
    if (!d.has_more || !d.next_page) break;
    page = d.next_page;
  }
  return Math.round(cents) / 100;
}
async function aiBudgetCheck(env, settings) {
  const { budget, status } = await aiBudgetGet(env);
  const month = aiMonth();
  const st = status.month === month ? { ...status } : { month };
  let spent;
  try { spent = await aiSpendMonth(env); } catch (e) { st.error = String(e.message || e).slice(0, 200); st.at = (/* @__PURE__ */ new Date()).toISOString(); await saveSetting(env, "ai_budget_status", st).catch(() => {}); return st; }
  if (spent == null) return { ...st, no_key: true };
  st.spent_usd = spent; st.at = (/* @__PURE__ */ new Date()).toISOString(); delete st.error;
  const cap = await aiCapFor(env, budget).catch(() => Number(budget.monthly_usd) || 0);
  st.cap_usd = cap;
  if (cap > 0) {
    const pct = Math.round(spent / cap * 100), warn = Number(budget.warn_pct) || 80, pause = Number(budget.pause_pct) || 95;
    st.pct = pct;
    if (pct >= warn && !st.warned) {
      st.warned = true;
      await notify(env, `\u{1F4B8} <b>AI spend is at ${pct}% of your monthly budget</b>\nUS$${spent.toFixed(2)} of US$${cap.toFixed(0)} so far this month.${pct < pause ? `\nAt ${pause}% Command pauses background work (team shifts, lead hunts, demo building). Customer chat, inbox replies and phone keep running.` : ""}\nChange the budget in Command › Money.`, { urgent: true, settings }).catch(() => {});
    }
    const wasPaused = !!st.paused;
    st.paused = pct >= pause;
    if (st.paused && !wasPaused) await notify(env, `⏸ <b>Background AI work is paused</b>\nThis month's AI spend reached ${pct}% of your budget (US$${spent.toFixed(2)} of US$${cap.toFixed(0)}). Team shifts, lead hunts and demo building are paused until the 1st or until you raise the budget in Command › Money. Customer chat, inbox replies and phone keep running.`, { urgent: true, settings }).catch(() => {});
  } else { st.pct = null; st.paused = false; }
  await saveSetting(env, "ai_budget_status", st).catch(() => {});
  return st;
}
// True when background AI work should wait: over the budget, or Anthropic's own limit was hit in the last hour.
async function aiBackgroundPaused(env) {
  const { status } = await aiBudgetGet(env);
  if (status.month !== aiMonth()) return false;
  return !!status.paused || (status.capped_at && Date.now() - Date.parse(status.capped_at) < 36e5);
}
// Turn Anthropic's spend-limit error into plain words, and tell the owner once every 6 hours.
async function aiCapped(env, raw) {
  const msg = "The AI is paused because your Anthropic monthly spend limit has been reached. Raise it at console.anthropic.com › Settings › Limits, and it starts working again within a minute.";
  try {
    const { status } = await aiBudgetGet(env);
    const st = status.month === aiMonth() ? { ...status } : { month: aiMonth() };
    const last = Date.parse(st.cap_alert_at || 0) || 0;
    st.capped_at = (/* @__PURE__ */ new Date()).toISOString();
    if (Date.now() - last > 6 * 36e5) {
      st.cap_alert_at = st.capped_at;
      await notify(env, "\u{1F6D1} <b>AI paused: Anthropic spend limit reached</b>\n" + msg.replace("The AI is paused because your", "Your") + "\nUntil then, website chat, demos, Studio AI and the AI team can't answer.", { urgent: true }).catch(() => {});
    }
    await saveSetting(env, "ai_budget_status", st).catch(() => {});
  } catch {}
  return msg;
}
async function aiBudgetRoute(p, m, body, env) {
  if (p !== "/costs/budget" && p !== "/costs/budget/check") return null;
  if (p === "/costs/budget/check" && m === "POST") return json({ ok: true, status: await aiBudgetCheck(env), has_admin_key: !!env.ANTHROPIC_ADMIN_KEY });
  if (p === "/costs/budget" && m === "POST") {
    const usd = Number(body.monthly_usd), warn = Number(body.warn_pct || 80), pause = Number(body.pause_pct || 95);
    if (!(usd >= 0 && usd <= 1e5)) return json({ ok: false, error: "Enter a monthly budget in US dollars." }, 400);
    if (!(warn >= 10 && warn <= 100 && pause >= warn && pause <= 100)) return json({ ok: false, error: "Warning and pause levels must be between 10% and 100%, with pause at or above warning." }, 400);
    const rev = Math.max(0, Math.min(50, Math.round(Number(body.rev_pct) || 0)));
    await saveSetting(env, "ai_budget", { monthly_usd: Math.round(usd), rev_pct: rev, warn_pct: Math.round(warn), pause_pct: Math.round(pause), updated_at: (/* @__PURE__ */ new Date()).toISOString() });
    const { status } = await aiBudgetGet(env);
    if (status.month === aiMonth()) await saveSetting(env, "ai_budget_status", { ...status, warned: false, paused: false }).catch(() => {});
    await audit(env, { actor: "Ty", action: "ai_budget_set", summary: `AI budget set to US$${Math.round(usd)}/month (warn ${warn}%, pause ${pause}%)` });
    return json({ ok: true, status: await aiBudgetCheck(env), has_admin_key: !!env.ANTHROPIC_ADMIN_KEY });
  }
  if (m === "GET") { const b = await aiBudgetGet(env); return json({ ok: true, ...b, has_admin_key: !!env.ANTHROPIC_ADMIN_KEY }); }
  return null;
}
