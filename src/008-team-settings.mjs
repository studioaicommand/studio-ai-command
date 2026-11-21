// src/team/settings.js
var AUTOPILOT_TYPES = {
  ghl_note: { label: "Add notes to GHL contacts", warn: "" },
  ghl_task: { label: "Create tasks in GHL", warn: "" },
  ghl_tags: { label: "Add or remove contact tags", warn: "Tags can trigger your GHL workflows, which may message clients." },
  ghl_opportunity_status: { label: "Update deal status (won / lost / open)", warn: "Status changes can trigger GHL workflows." }
};
var ALWAYS_ASK = {
  ghl_email: "Emails to contacts",
  ghl_sms: "SMS to contacts",
  stripe_draft_invoice: "Draft invoices",
  outreach_email: "Cold outreach emails",
  campaign_enrol: "Enrol in GHL outreach campaign",
  owner_task: "To-dos for you",
  team_rule: "New rules for the whole team",
  ghl_appointment_cancel: "Cancel appointments",
  ghl_appointment_move: "Move appointments",
  ghl_contact_archive: "Clear contacts from the pipeline",
  ghl_contact_delete: "Permanently delete contacts"
};
var WEEKDAYS = [1, 2, 3, 4, 5];
var DEFAULT_SHIFTS = [
  { id: "market_research", department: "head_of_marketing", label: "Research: fresh angles for each industry we hunt", days: [1], hour: 6, enabled: false, prompt: "RESEARCH SHIFT. For each industry Sales is hunting (check outreach_snapshot for this week's targets), use web search to find 2 or 3 fresh, specific insights about Australian businesses in that industry: what their customers complain about (slow replies, hard to book, no follow-up), new rules or tech changes, what other agencies and software are pitching them, and seasonal timing. Save each insight with save_memory, category \"market\", starting with the industry name (e.g. \"Trades & services: ...\"). At most 15 saves, only things you actually found. Finish with the 3 sharpest angles for Sales this week." },
  { id: "morning_briefing", department: "chief_of_staff", label: "Morning briefing", days: [1, 2, 3, 4, 5, 6, 7], hour: 7, enabled: true, kind: "briefing" },
  {
    id: "sales_am",
    department: "head_of_sales",
    label: "Morning sales sweep",
    days: WEEKDAYS,
    hour: 8,
    enabled: true,
    prompt: "Run your DAILY SWEEP. Check today's and upcoming bookings on all calendars first, so you never nudge someone who's already booked. Start with Ty's calls (demo openers not yet called, owner's name if known) and any quotes out that are due a follow-up. Queue follow-ups for anyone going cold, and give me a ranked list of what to do in sales today: at most 5 lines."
  },
  {
    id: "sales_pm",
    department: "head_of_sales",
    label: "Afternoon follow-up check",
    days: WEEKDAYS,
    hour: 15,
    enabled: true,
    prompt: "Afternoon check: any new leads or replies since this morning? Anyone booked for tomorrow who needs prep? Queue only follow-ups that are clearly needed today. Keep it short."
  },
  { id: "weekly_reports", department: "chief_of_staff", label: "Weekly reports (all heads + CEO review)", days: [1], hour: 8, enabled: false, kind: "weekly" },
  {
    id: "marketing_review",
    department: "head_of_marketing",
    label: "Funnel review + this week's experiment",
    days: [1],
    hour: 10,
    enabled: false,
    prompt: "Review last week's funnel toward the $20k/month mission. Name the single biggest bottleneck, and propose one experiment for this week with a clear metric."
  },
  {
    id: "finance_check",
    department: "head_of_finance",
    label: "Cash, invoices and mission pace",
    days: [1, 4],
    hour: 9,
    enabled: false,
    prompt: "Check mission progress (revenue this month vs target), open or overdue invoices, and the 30-day cash outlook. Queue polite reminders for overdue invoices if any."
  },
  {
    id: "client_health",
    department: "head_of_client_success",
    label: "Client health check",
    days: [3],
    hour: 10,
    enabled: true,
    prompt: "Review every client: who's healthy, who's at risk, whose check-in is due (day 7/30/60/90), and who's ready for a testimonial or referral ask. Draft the touches for approval."
  },
  {
    id: "content_plan",
    department: "head_of_content",
    label: "Next week's content plan",
    days: [4],
    hour: 10,
    enabled: false,
    prompt: "Build next week's Instagram content calendar (4\u20135 posts: pillar, format, hook, slide-by-slide outline, caption, MAP or AI CTA, posting day and time in Brisbane). Save it as a deliverable."
  },
  {
    id: "prospect_hunt",
    department: "head_of_sales",
    label: "Prospect hunt \u2192 leak scan \u2192 GHL campaign",
    days: WEEKDAYS,
    hour: 9,
    enabled: true,
    kind: "hunt",
    prompt: "Run a PROSPECT HUNT (see your playbook): only the industries Ty has switched on in Growth. Check campaign_status for which of them is furthest behind its target, pick that industry and an Australian city, find about 10 ESTABLISHED businesses with web_search (skip any already in query_prospects; note Google rating and review count), leak_scan each, save_prospect the good fits with the full research quality gate, and propose_campaign_enrol up to 10 of the best with email 01, follow_up_1 and follow_up_2 written from their leak findings. Finish with: checked, saved, queued, average leak score, and patterns you noticed."
  },
  { id: "prospect_hunt_pm", department: "head_of_sales", label: "Afternoon prospect hunt (second industry)", days: WEEKDAYS, hour: 13, enabled: false, kind: "hunt" },
  { id: "prospect_hunt_eve", department: "head_of_sales", label: "Late-afternoon prospect hunt (tomorrow's call list)", days: WEEKDAYS, hour: 16, enabled: false, kind: "hunt" },
  {
    id: "import_review",
    department: "head_of_sales",
    label: "Review my imported lists (sf-au-manual)",
    days: WEEKDAYS,
    hour: 11,
    enabled: true,
    prompt: "Run IMPORT REVIEW (see your playbook): manual_imports, then research up to 12 of them: fit check, leak_scan, verify the email is published by the business, save_prospect with ghl_contact_id and source manual_import, and propose_campaign_enrol the ones that pass with all 3 emails. If there's nothing waiting, say so in one line and stop."
  },
  {
    id: "brand_radar",
    department: "head_of_marketing",
    label: "Brand radar: our site, SEO & presence",
    days: [1],
    hour: 11,
    enabled: false,
    prompt: "Run BRAND RADAR (see your playbook): audit www.studioflowandsystems.com with analyse_website (pages 6) and our public Studio AI page, check Google visibility for 6\u20138 buyer searches in Australia and who outranks us, and review how our socials position us. Save a scorecard deliverable with the 5 highest-impact fixes (effort vs impact), 3 SEO pages to create (keyword, intent, outline), and Google Business Profile actions. Propose owner tasks only for fixes Ty must do himself."
  },
  {
    id: "authority_content",
    department: "head_of_content",
    label: "Authority content: SEO article + LinkedIn",
    days: [3],
    hour: 11,
    enabled: false,
    prompt: "Create this week's AUTHORITY CONTENT: one SEO article draft for a buyer keyword from the latest brand radar (title, meta description, outline, full draft, FAQ, CTA to the free 30-min call), plus two LinkedIn posts from Ty's point of view and one Instagram carousel outline on the same theme. Use real patterns from recent prospect hunts (no business names). Save it all as one deliverable."
  },
  {
    id: "email_nurture",
    department: "head_of_marketing",
    label: "Email marketing: nurture + newsletter",
    days: [5],
    hour: 10,
    enabled: false,
    prompt: "Plan EMAIL MARKETING: draft this week's newsletter for our GHL contacts (subject, preview text, body, one CTA) and, if not done yet, a 4-email nurture sequence for new enquiries who haven't booked (day 0/2/5/9). Save as a deliverable for Ty to load into GHL. Don't send anything."
  },
  {
    id: "systems_review",
    department: "head_of_systems",
    label: "Weekly systems review \u2192 change proposals",
    days: [5],
    hour: 15,
    enabled: false,
    prompt: "Run the weekly SYSTEMS REVIEW (see your playbook): system_check, outreach_snapshot, acquisition_costs, read_memory for feedback (Ty's edits and rejections), and audit_log. Save ONE change_proposal deliverable with the top 3 improvements (each: what, evidence, expected impact, risk, test plan, who builds it). Propose up to 3 team rules with propose_team_rule only for behaviour patterns Ty's edits or rejections clearly show. Keep it under 500 words."
  },
  {
    id: "evolve_research",
    department: "head_of_systems",
    label: "Monthly evolve research \u2192 top 5 upgrades (Replica method)",
    days: [1],
    hour: 9,
    monthly: true,
    enabled: false,
    prompt: "Run the monthly EVOLVE RESEARCH for Studio AI Command (our own software). Follow the Replica method: 1) RECON: use web_search to map what the leading competitors offer service businesses right now (GoHighLevel AI Employee, Podium, Weave, Birdeye, Hatch, ServiceTitan or Jobber AI receptionists, and any new AI front-desk or AI-team products you find): their main features, pricing tiers and what they changed recently (changelogs). Public pages only. 2) WHAT USERS HATE: search public reviews and discussions (G2, Capterra, Trustpilot, Reddit, app store reviews) for their 1 to 3 star complaints and feature requests. Quote only real reviews, word for word, each with its link; if you cannot find enough, say so. Never invent a review, quote, rating or number. 3) NEW TECH: check what Anthropic, OpenAI and Cloudflare (Agents SDK, Workflows, Browser Run, AI Gateway, MCP) released in the last month that could make our AI team smarter, faster or cheaper. 4) Compare against what Command already does (read memory and the rulebook). Then save ONE report titled \"Evolve report <month>\" with: the TOP 5 upgrades ranked by impact on winning and keeping clients versus effort, each with what to build, why (the linked evidence), and how we would know it worked; plus a short \"what competitors do that we already do better\" list for sales. Never suggest copying a competitor's code, design, branding or copy. Finish by telling Ty the top 3 in plain words."
  },
  {
    id: "ops_health",
    department: "head_of_operations",
    label: "Systems health + automation idea",
    days: [5],
    hour: 14,
    enabled: false,
    prompt: "Weekly systems health check: agent errors, drafts waiting, conversations needing Ty, integrations not connected. Then name the single highest-value thing to automate next, with hours saved per month."
  },
  {
    id: "back_office",
    department: "chief_of_staff",
    label: "Back office check (quiet unless something needs you)",
    days: [5],
    hour: 14,
    enabled: true,
    prompt: "BACK OFFICE CHECK (weekly, quiet). Ask head_of_finance, head_of_operations and head_of_systems in parallel with ask_department, each the same question: 'Is there anything this week that needs Ty (overdue money, something broken or stuck, an error repeating, a client at risk)? Check your tools. If not, reply All quiet.' Then write ONE short note: either 'All quiet' with one line on what was checked, or at most 3 things that need Ty, each with the fix and who does it. No reports, no plans, no ideas lists."
  }
];
var DEFAULT_SETTINGS = {
  autopilot: Object.fromEntries(Object.keys(AUTOPILOT_TYPES).map((k) => [k, "ask"])),
  shifts: DEFAULT_SHIFTS,
  mission: { target_monthly_aud: 2e4, label: "$20k a month" },
  // Upgraded pages: off = the original page is served unchanged; previews live at /experience-next.
  site: { public_v2: false, command_v2: false, command_classic: false }
};
async function getSettings(env) {
  let rows = [];
  try {
    rows = await select(env, "team_settings", "select=key,value&key=not.like.wsd*:*").catch(() => select(env, "team_settings", "select=key,value"));
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const out = structuredClone(DEFAULT_SETTINGS);
  if (stored.autopilot) {
    for (const k of Object.keys(AUTOPILOT_TYPES)) if (stored.autopilot[k] === "auto" || stored.autopilot[k] === "ask") out.autopilot[k] = stored.autopilot[k];
  }
  if (stored.campaign && typeof stored.campaign === "object") out.campaign = stored.campaign;
  if (stored.replies && typeof stored.replies === "object") out.replies = stored.replies;
  if (stored.pricing && typeof stored.pricing === "object") out.pricing = stored.pricing;
  if (Array.isArray(stored.hunts)) out.hunts = stored.hunts;
  for (const k of ["charter", "telegram", "command", "notify_state", "offer", "inbox", "inbox_log", "money", "outreach"]) if (stored[k] !== void 0) out[k] = stored[k];
  if (stored.site) {
    for (const k of ["public_v2", "command_v2", "command_classic"]) if (typeof stored.site[k] === "boolean") out.site[k] = stored.site[k];
  }
  if (stored.mission?.target_monthly_aud > 0) out.mission = { ...out.mission, ...stored.mission };
  if (Array.isArray(stored.shifts)) {
    const byId = Object.fromEntries(stored.shifts.map((s) => [s.id, s]));
    out.shifts = DEFAULT_SHIFTS.map((d) => {
      const s = byId[d.id];
      if (!s) return d;
      return {
        ...d,
        enabled: typeof s.enabled === "boolean" ? s.enabled : d.enabled,
        hour: Number.isInteger(s.hour) && s.hour >= 0 && s.hour <= 23 ? s.hour : d.hour,
        days: Array.isArray(s.days) && s.days.every((x) => x >= 1 && x <= 7) && s.days.length ? s.days : d.days,
        last_run: s.last_run || null
      };
    });
  }
  return out;
}
async function saveSetting(env, key, value) {
  if (!["video_scripts", "agent_watch", "team_pause", "release_state", "ai_lean", "inbox_sweep", "email_stats", "fair_use_status", "monday_report", "outreach", "autopilot", "shifts", "mission", "site", "campaign", "replies", "pricing", "hunts", "charter", "telegram", "command", "notify_state", "offer", "demo_followups", "offer_catalog", "inbox", "inbox_log", "client_book", "money", "phone_status", "ai_budget", "ai_budget_status", "outreach_daily", "growth_goal", "scout", "coach", "watch", "voice_style", "away_digest", "mac_link", "mac_link_queue", "browser_task", "ap_extra", "inbox_quiet", "inbox_voice", "review_desk", "billing_desk", "leak_tidy", "owner_find", "task_doer", "ui_usage", "rank_tracker", "rank_quick", "outreach_chat", "value_ledger"].includes(key)) throw new Error("Unknown setting");
  await upsert(env, "team_settings", [{ key, value, updated_at: now() }], "key");
}
function isAuto(settings, type) {
  return !ALWAYS_ASK[type] && !(typeof NEVER_AUTO !== "undefined" && NEVER_AUTO.has(type)) && AUTOPILOT_TYPES[type] && settings?.autopilot?.[type] === "auto";
}
function brisbaneNow(d = /* @__PURE__ */ new Date()) {
  const b = new Date(d.getTime() + 10 * 36e5);
  const dow = b.getUTCDay() === 0 ? 7 : b.getUTCDay();
  return { date: b.toISOString().slice(0, 10), hour: b.getUTCHours(), dow, slot: b.toISOString().slice(0, 13) };
}

