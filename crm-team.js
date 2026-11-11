// v45: Studio AI's hands in the CRM. Internal changes (add or update a contact, create or move a deal) happen
// straight away and are logged. Anything the customer sees (a booking confirmation) goes through Approvals.
Object.assign(TOOL_DEFS, {
  ghl_create_contact: {
    description: "Add a person to the CRM, or update them if their email or phone is already there. Use whenever someone asks to add, save or create a contact or lead. Needs a first name plus a phone or email. Added straight away and logged; nothing is sent to them. Search first if they might already exist.",
    input_schema: {
      type: "object",
      properties: {
        first_name: { type: "string" },
        last_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string", description: "Australian numbers are fine as 04xx xxx xxx; it's saved as +61." },
        business_name: { type: "string" },
        website: { type: "string" },
        source: { type: "string", description: "Where they came from, e.g. phone call, referral, Instagram." },
        tags: { type: "array", items: { type: "string" } },
        note: { type: "string", description: "Optional note saved on the contact." }
      },
      required: ["first_name"]
    }
  },
  ghl_update_contact: {
    description: "Change a contact's details in the CRM (name, email, phone, business, website, address). Internal and logged; nothing is sent. Find the contact_id with ghl_search_contacts first.",
    input_schema: {
      type: "object",
      properties: {
        contact_id: contactId,
        first_name: { type: "string" }, last_name: { type: "string" }, email: { type: "string" }, phone: { type: "string" },
        business_name: { type: "string" }, website: { type: "string" }, address: { type: "string" }, city: { type: "string" }, state: { type: "string" }, postcode: { type: "string" }
      },
      required: ["contact_id"]
    }
  },
  ghl_list_calendars: {
    description: "List the CRM's booking calendars (id, name, length). Use before checking free times or booking.",
    input_schema: { type: "object", properties: {} }
  },
  ghl_free_slots: {
    description: "Free appointment times on one calendar for the coming days. Times come back in Brisbane time and in the person's own time zone.",
    input_schema: {
      type: "object",
      properties: {
        calendar_id: { type: "string" },
        days: { type: "integer", description: "How many days ahead to look (1 to 21, default 7)." },
        timezone: { type: "string", description: "The person's time zone, e.g. Australia/Sydney. Default Australia/Brisbane." }
      },
      required: ["calendar_id"]
    }
  },
  ghl_create_opportunity: {
    description: "Create a deal for a contact in a pipeline stage. Internal; nothing is sent. Get pipeline and stage ids with ghl_list_pipelines.",
    input_schema: {
      type: "object",
      properties: { contact_id: contactId, pipeline_id: { type: "string" }, stage_id: { type: "string" }, name: { type: "string", description: "Deal name, e.g. 'Harbour Physio | Front Desk'." }, value_aud: { type: "number" } },
      required: ["contact_id", "pipeline_id", "stage_id", "name"]
    }
  },
  ghl_move_opportunity: {
    description: "Move a deal to another pipeline stage. Internal; nothing is sent.",
    input_schema: {
      type: "object",
      properties: { opportunity_id: { type: "string" }, stage_id: { type: "string" }, pipeline_id: { type: "string" }, opportunity_name: { type: "string" } },
      required: ["opportunity_id", "stage_id"]
    }
  },
  propose_ghl_appointment_book: {
    description: "Book a contact into a calendar. They get the calendar's confirmation, so this goes to Approvals: read the time back and approve it once the owner says yes. Check ghl_free_slots first and only use a time it returned.",
    input_schema: {
      type: "object",
      properties: {
        contact_id: contactId, contact_name: contactName,
        calendar_id: { type: "string" }, calendar_name: { type: "string" },
        start: { type: "string", description: "Exact start time from ghl_free_slots (ISO, with offset)." },
        duration_minutes: { type: "integer" },
        title: { type: "string" }, notes: { type: "string" },
        reason: { type: "string" }
      },
      required: ["contact_id", "calendar_id", "start", "reason"]
    }
  }
});
var CRM_TOOLS = new Set(["ghl_create_contact", "ghl_update_contact", "ghl_list_calendars", "ghl_free_slots", "ghl_create_opportunity", "ghl_move_opportunity"]);
function crmPhone(p) {
  let x = String(p || "").replace(/[^\d+]/g, "");
  if (!x) return void 0;
  if (x.startsWith("+")) return x;
  if (x.startsWith("61")) return "+" + x;
  if (x.startsWith("0")) return "+61" + x.slice(1);
  return x;
}
function crmFields(i) {
  const f = { firstName: i.first_name, lastName: i.last_name, email: i.email ? String(i.email).trim().toLowerCase() : void 0, phone: crmPhone(i.phone), companyName: i.business_name, website: i.website, address1: i.address, city: i.city, state: i.state, postalCode: i.postcode };
  for (const k of Object.keys(f)) { if (f[k] === void 0 || f[k] === null || String(f[k]).trim() === "") delete f[k]; else f[k] = String(f[k]).trim().slice(0, 200); }
  return f;
}
function crmTime(iso, tz) {
  return new Date(iso).toLocaleString("en-AU", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
async function crmTool(env, name, i, dept) {
  if (!enabled(env)) return { error: "The CRM (GoHighLevel) isn't connected in this Command yet." };
  const by = dept?.name || "Studio AI";
  const who = (f) => [f.firstName, f.lastName].filter(Boolean).join(" ");
  if (name === "ghl_create_contact") {
    const f = crmFields(i);
    if (!f.firstName) return { error: "I need at least a first name." };
    if (!f.email && !f.phone) return { error: "I need a phone number or email so the contact can be found again." };
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return { error: "That email doesn't look right. Check it with them." };
    const tags = [...new Set(["added-by-studio-ai", ...(Array.isArray(i.tags) ? i.tags.map((t) => String(t).trim().toLowerCase().slice(0, 40)).filter(Boolean) : [])])].slice(0, 10);
    const d = await req(env, "POST", "/contacts/upsert", { locationId: env.GHL_LOCATION_ID, ...f, source: String(i.source || "Studio AI Command").slice(0, 80), tags });
    const c = d?.contact;
    if (!c?.id) return { error: "The CRM didn't return the contact. Nothing was saved." };
    if (i.note) await addNote(env, c.id, String(i.note).slice(0, 4e3)).catch(() => {});
    const existed = d.new === false;
    await audit(env, { actor: by, action: "ghl_contact_added", target_type: "ghl_contact", target_id: c.id, summary: `${existed ? "Updated existing" : "Added"} contact ${who(f)}${f.companyName ? " (" + f.companyName + ")" : ""}` });
    return { ok: true, done: (existed ? "They were already in the CRM, so I updated their details: " : "Added to the CRM: ") + who(f), contact_id: c.id, existing: existed };
  }
  if (name === "ghl_update_contact") {
    if (!/^[A-Za-z0-9_-]{2,64}$/.test(String(i.contact_id || ""))) return { error: "Find the contact first with ghl_search_contacts." };
    const f = crmFields(i);
    if (!Object.keys(f).length) return { error: "Tell me what to change." };
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return { error: "That email doesn't look right." };
    await req(env, "PUT", `/contacts/${i.contact_id}`, f);
    await audit(env, { actor: by, action: "ghl_contact_updated", target_type: "ghl_contact", target_id: i.contact_id, summary: `Updated ${Object.keys(f).join(", ")} on a contact` });
    return { ok: true, done: "Updated " + Object.keys(f).join(", ") + ".", contact_id: i.contact_id };
  }
  if (name === "ghl_list_calendars") {
    const d = await req(env, "GET", `/calendars/?${q({ locationId: env.GHL_LOCATION_ID })}`, void 0, "2021-04-15");
    return { calendars: (d.calendars || []).filter((c) => c.isActive !== false).map((c) => ({ id: c.id, name: c.name, minutes: c.slotDurationUnit === "hours" ? (+c.slotDuration || 0) * 60 : +c.slotDuration || null })) };
  }
  if (name === "ghl_free_slots") {
    const tz = /^[A-Za-z]+\/[A-Za-z_]+$/.test(String(i.timezone || "")) ? i.timezone : "Australia/Brisbane";
    const days = clamp(i.days, 1, 21, 7), from = Date.now();
    const d = await req(env, "GET", `/calendars/${encodeURIComponent(i.calendar_id)}/free-slots?${q({ startDate: from, endDate: from + days * 864e5, timezone: "Australia/Brisbane" })}`, void 0, "2021-04-15");
    const out = [];
    for (const v of Object.values(d || {})) if (v && Array.isArray(v.slots)) for (const sl of v.slots) { const t = Date.parse(sl); if (t > Date.now() + 36e5) out.push(sl); }
    const slots = [...new Set(out)].sort((a, b) => Date.parse(a) - Date.parse(b)).slice(0, 30);
    return { timezone: tz, slots: slots.map((s) => ({ start: s, brisbane: crmTime(s, "Australia/Brisbane"), their_time: tz === "Australia/Brisbane" ? void 0 : crmTime(s, tz) })), note: slots.length ? "Offer two of these. Use the exact start value when booking." : "No free times in that window." };
  }
  if (name === "ghl_create_opportunity") {
    const body = { locationId: env.GHL_LOCATION_ID, pipelineId: i.pipeline_id, pipelineStageId: i.stage_id, contactId: i.contact_id, name: String(i.name).slice(0, 120), status: "open" };
    if (Number(i.value_aud) > 0) body.monetaryValue = Math.round(Number(i.value_aud));
    const d = await req(env, "POST", "/opportunities/", body);
    const id = d?.opportunity?.id || d?.id;
    await audit(env, { actor: by, action: "ghl_opportunity_created", target_type: "ghl_opportunity", target_id: id, summary: `Created deal "${body.name}"` });
    return { ok: true, done: `Created the deal "${body.name}".`, opportunity_id: id };
  }
  if (name === "ghl_move_opportunity") {
    const body = { pipelineStageId: i.stage_id };
    if (i.pipeline_id) body.pipelineId = i.pipeline_id;
    await req(env, "PUT", `/opportunities/${encodeURIComponent(i.opportunity_id)}`, body);
    await audit(env, { actor: by, action: "ghl_opportunity_moved", target_type: "ghl_opportunity", target_id: i.opportunity_id, summary: `Moved deal ${i.opportunity_name || i.opportunity_id} to a new stage` });
    return { ok: true, done: "Moved the deal to the new stage." };
  }
  return { error: "Unknown CRM tool" };
}
async function crmBook(env, p) {
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(String(p.contact_id || "")) || !/^[A-Za-z0-9_-]{2,64}$/.test(String(p.calendar_id || ""))) throw new Error("Missing contact or calendar.");
  const st = Date.parse(p.start || "");
  if (!st || st < Date.now() + 15 * 6e4) throw new Error("That time has passed. Check fresh times.");
  const free = await req(env, "GET", `/calendars/${encodeURIComponent(p.calendar_id)}/free-slots?${q({ startDate: st - 36e5, endDate: st + 36e5, timezone: "Australia/Brisbane" })}`, void 0, "2021-04-15").catch(() => null);
  if (free) {
    const all = [];
    for (const v of Object.values(free)) if (v && Array.isArray(v.slots)) for (const sl of v.slots) all.push(Date.parse(sl));
    if (!all.includes(st)) throw new Error("That time was just taken. Check fresh times.");
  }
  const mins = Math.min(240, Math.max(10, Number(p.duration_minutes) || 30));
  const d = await req(env, "POST", "/calendars/events/appointments", { calendarId: p.calendar_id, locationId: env.GHL_LOCATION_ID, contactId: p.contact_id, startTime: new Date(st).toISOString(), endTime: new Date(st + mins * 6e4).toISOString(), title: String(p.title || p.calendar_name || "Appointment").slice(0, 120), appointmentStatus: "confirmed", toNotify: true }, "2021-04-15");
  const id = d?.id || d?.appointment?.id || d?.event?.id;
  if (!id) throw new Error("The calendar didn't confirm the booking.");
  if (p.notes) await addNote(env, p.contact_id, "Booked by Studio AI: " + String(p.notes).slice(0, 2e3)).catch(() => {});
  return { ok: true, note: "Booked for " + fmtBne(new Date(st).toISOString()) + " (Brisbane time).", appointment_id: id };
}
