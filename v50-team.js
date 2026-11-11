// ── v50: Full Company. Each department head leads specialists (8 heads + 36 specialists = 44 agents) on the
// Full Company plan; a demo watcher jumps on warm prospects; a no-show rebooker chases missed sales calls. ──
var SPECIALISTS = {
  chief_of_staff: [
    { id: "pipeline_analyst", name: "Pipeline Analyst", focus: "Reads the whole pipeline daily and finds the 5 deals closest to a yes and what each needs next." },
    { id: "priorities_planner", name: "Priorities Planner", focus: "Turns the mission and pace into today's top 3 actions for Ty, in order, with times." },
    { id: "meeting_prep", name: "Meeting Prep", focus: "Briefs Ty before every booked call: who they are, their site's leaks, what to offer, the likely objection." },
    { id: "risk_watch", name: "Risk Watch", focus: "Spots what could stall revenue this week (stuck approvals, quiet clients, failing systems) and raises it early." }
  ],
  head_of_sales: [
    { id: "lead_qualifier", name: "Lead Qualifier", focus: "Scores every new lead and reply on fit and intent, and says who to call first and why." },
    { id: "follow_up_chaser", name: "Follow-up Chaser", focus: "Makes sure every reply, demo viewer and warm lead gets a short, specific follow-up within one working day." },
    { id: "proposal_writer", name: "Proposal Writer", focus: "Turns a booked call into a clear one-page proposal with options and a dated next step, the same day." },
    { id: "objection_coach", name: "Objection Coach", focus: "Prepares answers to the real objections (price, timing, 'we already have a website') with proof from our clients." },
    { id: "no_show_rebooker", name: "No-show Rebooker", focus: "Rebooks every missed or cancelled sales call with two concrete times, politely, within the day." }
  ],
  head_of_marketing: [
    { id: "prospect_researcher", name: "Prospect Researcher", focus: "Finds businesses that are clearly losing enquiries (weak site, poor Google presence) in the industries that book." },
    { id: "outreach_copywriter", name: "Outreach Copywriter", focus: "Writes short, specific cold emails and SMS under 70 words that earn replies, and tests one variable at a time." },
    { id: "local_seo_scout", name: "Local SEO Scout", focus: "Checks Google and AI-search visibility for prospects and clients and turns gaps into talking points." },
    { id: "offer_tester", name: "Offer Tester", focus: "Designs small A/B tests on offers, subject lines and industries, and reads the results honestly." },
    { id: "partnerships_finder", name: "Partnerships Finder", focus: "Finds referral partners (accountants, web-less trade groups, local business groups) and drafts the intro." }
  ],
  head_of_content: [
    { id: "case_study_writer", name: "Case Study Writer", focus: "Turns client wins (Pure Life Force, LeakStop, Lady in Red) into short, specific case studies with numbers we can verify." },
    { id: "social_producer", name: "Social Producer", focus: "Plans and drafts posts and reels that show the product working, with a clear call to book." },
    { id: "video_scripter", name: "Video Scripter", focus: "Writes 15 to 45 second scripts for concept walkthroughs and receptionist demos." },
    { id: "review_harvester", name: "Review Harvester", focus: "Collects testimonials and turns them into proof for emails, demos and the website." },
    { id: "seo_writer", name: "SEO & AI-search Writer", focus: "Writes service and suburb pages and FAQs that get found on Google and recommended by AI assistants." }
  ],
  head_of_client_success: [
    { id: "onboarding_guide", name: "Onboarding Guide", focus: "Gets every new client live fast with a clear checklist and no loose ends." },
    { id: "health_monitor", name: "Health Monitor", focus: "Watches each client's usage and results and flags anyone going quiet before they churn." },
    { id: "upsell_spotter", name: "Upsell Spotter", focus: "Finds the next right product for each client (receptionist, care plan, SEO, Command) and when to raise it." },
    { id: "referral_asker", name: "Referral Asker", focus: "Asks happy clients for introductions and reviews at the right moment, with a simple script." },
    { id: "win_back", name: "Win-back Specialist", focus: "Re-opens past clients and lost deals with something new and specific to offer." }
  ],
  head_of_operations: [
    { id: "approvals_clearer", name: "Approvals Clearer", focus: "Keeps the approval queue moving: summarises what's waiting and what's urgent for Ty." },
    { id: "delivery_scheduler", name: "Delivery Scheduler", focus: "Plans builds and launches so nothing slips, with dates and owners." },
    { id: "sop_writer", name: "SOP Writer", focus: "Writes the simplest repeatable steps for anything done twice." },
    { id: "quality_checker", name: "Quality Checker", focus: "Checks deliverables (sites, emails, demos) against our standards before anything goes out." }
  ],
  head_of_systems: [
    { id: "automation_builder", name: "Automation Builder", focus: "Designs GHL workflows and Command automations that remove manual work." },
    { id: "integration_checker", name: "Integration Checker", focus: "Checks every connection (GHL, Stripe, phone, calendars) is working and fixes or reports what isn't." },
    { id: "data_cleaner", name: "Data Cleaner", focus: "Keeps contacts, tags and pipelines tidy so reports and follow-ups are right." },
    { id: "cost_optimiser", name: "Cost Optimiser", focus: "Finds ways to cut AI and software cost per booked call without hurting results." }
  ],
  head_of_finance: [
    { id: "invoice_chaser", name: "Invoice Chaser", focus: "Follows up every unpaid invoice politely and on time, with the payment link." },
    { id: "cashflow_forecaster", name: "Cashflow Forecaster", focus: "Forecasts the next 30 days of cash in and out, and flags gaps early." },
    { id: "pricing_analyst", name: "Pricing Analyst", focus: "Checks margins per client and product, and suggests price or package changes." },
    { id: "ai_spend_controller", name: "AI Spend Controller", focus: "Keeps AI spend below what it earns: cost per booked call, budget pace and waste." }
  ]
};
var SPEC_COUNT = Object.values(SPECIALISTS).reduce((n, x) => n + x.length, 0);
function specOf(deptId, id) { return (SPECIALISTS[deptId] || []).find((s) => s.id === id) || null; }
function specialistBlock(deptId, sp) {
  if (!sp) return "";
  const head = DEPARTMENTS[deptId]?.name || "your head";
  return `\n\n=== YOU ARE A SPECIALIST ===
For this task you are the ${sp.name} in the ${head}'s team, reporting to the ${head}. Your speciality: ${sp.focus}
Do the task in depth, using the team's tools. Hand back something finished and usable (copy, a list, a plan with dates), not advice about what someone could do. End with the result in numbers where possible and the one next step.`;
}
function specTool(dept, depth, tier) {
  if (tier !== "company" || depth > 0 || !SPECIALISTS[dept.id]) return [];
  const list = SPECIALISTS[dept.id];
  return [{ name: "assign_specialist", description: "Hand a focused task to one of your specialists. They work it in depth with your tools and report back. Call several at once to run them in parallel. Your team: " + list.map((s) => `${s.id} (${s.name}: ${s.focus})`).join("; "), input_schema: { type: "object", properties: { specialist: { type: "string", enum: list.map((s) => s.id) }, task: { type: "string", description: "The task, with context and the format you want back." } }, required: ["specialist", "task"] } }];
}
async function runSpecialist(input, ctx) {
  const sp = specOf(ctx.dept.id, input.specialist);
  if (!sp) return { error: "Unknown specialist" };
  ctx.run.consulted.push(ctx.dept.id + ":" + sp.id);
  const result = await ctx.runAgent(ctx.env, ctx.dept.id, {
    messages: [{ role: "user", content: `Task from the ${ctx.dept.name}:\n${String(input.task || "").slice(0, 4000)}\n\nDo it and reply with the finished result. Be specific.` }],
    depth: ctx.depth + 1, threadId: ctx.threadId, run: ctx.run, maxSteps: Math.min(ctx.maxSteps || 8, 7), specialist: sp
  });
  await saveRecord(ctx.env, { source: "team", external_key: "specialist:" + crypto.randomUUID(), role: "assistant", actor: sp.name, department: ctx.dept.id, conversation_id: ctx.threadId, content: "Task from " + ctx.dept.name + ": " + input.task + "\n\n" + (result.reply || "") }).catch(() => {});
  return { specialist: sp.name, reply: result.reply };
}
// ── Demo watcher: the moment a business opens its concept or receptionist demo, Sales jumps on it ──
async function watchGet(env) {
  const r = await select(env, "team_settings", "key=eq.watch&select=value&limit=1").catch(() => []);
  const v = r?.[0]?.value || {};
  return { hot: v.hot && typeof v.hot === "object" ? v.hot : {}, noshow: Array.isArray(v.noshow) ? v.noshow : [] };
}
async function watchHot(env, { name, prospect_id = null, what, views = 1, chats = 0, link = "" }) {
  if (!name) return { skipped: "no name" };
  if ((await instGet(env).catch(() => null))?.modules?.outreach === false) return { skipped: "client copy" };
  const key = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  const w = await watchGet(env);
  if (w.hot[key] && Date.now() - w.hot[key] < 20 * 36e5) return { skipped: "already on it" };
  w.hot[key] = Date.now();
  for (const k of Object.keys(w.hot)) if (Date.now() - w.hot[k] > 14 * 864e5) delete w.hot[k];
  await saveSetting(env, "watch", w);
  let p = null;
  if (prospect_id) p = (await select(env, "agent_prospects", `id=eq.${prospect_id}&select=id,business_name,phone,email,decision_maker,status&limit=1`).catch(() => []))[0] || null;
  if (p && ["won", "client"].includes(p.status)) return { skipped: "already booked" };
  const job = await queueCommandJob(env, { department: "head_of_sales", source: "demo_watcher", key: "hot|" + key + "|" + brisbaneNow().date, request: `[From Studio AI Command] Demo watcher: ${name} just opened their ${what}${views > 1 ? ` (${views} views` + (chats ? `, ${chats} chats` : "") + ")" : ""}${chats && views <= 1 ? ` and chatted ${chats} times` : ""}. They're warm right now.${p ? `\nProspect: ${p.business_name}${p.decision_maker ? ", " + p.decision_maker : ""}${p.phone ? ", phone " + p.phone : ""}${p.email ? ", email " + p.email : ""} (id ${p.id}).` : ""}${link ? "\nLink: " + link : ""}\n1) Look them up (search_records, their site) so the follow-up is specific.\n2) Propose ONE short follow-up (SMS if we have a mobile, otherwise email, under 50 words) that references what they just looked at and offers two concrete call times from the sales calendar. It goes to Ty's approval queue.\n3) Tell Ty in one line whether to ring them now and what to open with.` }).catch(() => null);
  if (p && p.status !== "replied") await update(env, "agent_prospects", `id=eq.${p.id}`, { updated_at: now() }).catch(() => {});
  return { ok: true, job_id: job?.job_id || null };
}
// ── No-show rebooker: missed or cancelled sales calls get a rebooking proposal the same day ──
async function noShowWatch(env) {
  if ((await instGet(env).catch(() => null))?.modules?.outreach === false) return { skipped: "client copy" };
  const n = brisbaneNow();
  if (n.hour < 8 || n.hour > 18) return { skipped: "not working hours" };
  const w = await watchGet(env);
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
    const missed = /noshow|no_show/i.test(String(e.appointmentStatus));
    const j = await queueCommandJob(env, { department: "head_of_sales", source: "no_show_rebooker", key: "noshow|" + e.id, request: `[From Studio AI Command] No-show rebooker: ${e.title || "A sales call"} on ${fmtBne(e.startTime)} was ${missed ? "missed (no-show)" : "cancelled"}.${e.contactId ? " Contact id " + e.contactId + "." : ""}\n1) Look up the contact.\n2) Propose ONE warm, short rebooking message (SMS if mobile, else email, under 45 words, no guilt) with two concrete times from the sales calendar (ghl_free_slots). It goes to Ty's approval queue.\n3) If they've missed twice, suggest a different approach instead.` }).catch(() => null);
    if (j?.job_id) queued++;
  }
  w.noshow = w.noshow.slice(-300);
  if (found.length) await saveSetting(env, "watch", w);
  return { ok: true, found: found.length, queued };
}
// ── AI budget that grows with revenue: floor (monthly_usd) or a share of the last 30 days' Stripe revenue, whichever is higher ──
async function aiCapFor(env, budget) {
  const floor = Number(budget.monthly_usd) || 0, pct = Number(budget.rev_pct) || 0;
  if (!pct || !enabled2(env)) return floor;
  const r = await revenueSummary(env, 30).catch(() => null);
  const netAud = Number(r?.current?.net) || 0;
  return Math.max(floor, Math.round(netAud * pct / 100 / (Number(env.AUD_PER_USD) || 1.55)));
}
async function v50Route(p, m, body, env) {
  if (p === "/performance/noshow-check" && m === "POST") return json(await noShowWatch(env));
  return null;
}
