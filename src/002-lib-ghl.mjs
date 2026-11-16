// src/lib/ghl.js
var ghl_exports = {};
__export(ghl_exports, {
  addNote: () => addNote,
  addTags: () => addTags,
  addToWorkflow: () => addToWorkflow,
  countByTag: () => countByTag,
  createTask: () => createTask,
  enabled: () => enabled,
  findByEmail: () => findByEmail,
  getContact: () => getContact,
  getMessages: () => getMessages,
  listCustomFields: () => listCustomFields,
  listEvents: () => listEvents,
  listLocationTags: () => listLocationTags,
  listPipelines: () => listPipelines,
  listWorkflows: () => listWorkflows,
  removeTags: () => removeTags,
  searchByTag: () => searchByTag,
  searchContacts: () => searchContacts,
  searchConversations: () => searchConversations,
  searchOpportunities: () => searchOpportunities,
  sendEmail: () => sendEmail,
  sendSms: () => sendSms,
  setOpportunityStatus: () => setOpportunityStatus,
  updateContact: () => updateContact,
  upsertContact: () => upsertContact,
  upsertFields: () => upsertFields
});
var fmtBne = (iso) => { const t = Date.parse(iso || ""); return t ? new Date(t).toLocaleString("en-AU", { timeZone: "Australia/Brisbane", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : String(iso || "?"); };
var GHL = "https://services.leadconnectorhq.com";
async function req(env, method, path, body, version = "2021-07-28") {
  body = tyStrip(body);
  if (path === "/conversations/messages" && body && typeof body === "object" && typeof instGet === "function") { const i128 = await instGet(env).catch(() => null); if (i128 && i128.custom) { body = { ...body }; for (const k of ["subject", "html", "message"]) if (typeof body[k] === "string") body[k] = instRewriteOut(body[k], i128); } }
  const res = await fetch(`${GHL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.GHL_TOKEN}`,
      Version: version,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: body ? JSON.stringify(body) : void 0
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GHL ${method} ${path.split("?")[0]} ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}
var enabled = (env) => Boolean(env.GHL_TOKEN && env.GHL_LOCATION_ID);
var q = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== void 0 && v !== null && v !== "")).toString();
async function upsertContact(env, { email, firstName, tags = [], source = "Instagram DM agent" }) {
  const data = await req(env, "POST", "/contacts/upsert", {
    locationId: env.GHL_LOCATION_ID,
    email,
    firstName: firstName || void 0,
    source,
    tags
  });
  return data?.contact?.id;
}
var addTags = (env, contactId2, tags) => req(env, "POST", `/contacts/${contactId2}/tags`, { tags });
var removeTags = (env, contactId2, tags) => req(env, "DELETE", `/contacts/${contactId2}/tags`, { tags });
var addNote = (env, contactId2, body) => req(env, "POST", `/contacts/${contactId2}/notes`, { body });
var getContact = (env, contactId2) => req(env, "GET", `/contacts/${contactId2}`);
var searchContacts = (env, query, limit = 20) => req(env, "POST", "/contacts/search", { locationId: env.GHL_LOCATION_ID, pageLimit: limit, query: query || void 0 });
var createTask = (env, contactId2, { title, body, dueDate }) => req(env, "POST", `/contacts/${contactId2}/tasks`, { title, body: body || "", dueDate, completed: false });
var listPipelines = (env) => req(env, "GET", `/opportunities/pipelines?${q({ locationId: env.GHL_LOCATION_ID })}`);
var searchOpportunities = (env, { pipeline_id, status, query, limit = 50 } = {}) => req(env, "GET", `/opportunities/search?${q({ location_id: env.GHL_LOCATION_ID, pipeline_id, status, q: query, limit })}`);
var setOpportunityStatus = (env, id, status) => req(env, "PUT", `/opportunities/${id}/status`, { status });
var listEvents = (env, startMs, endMs, calendarId) => req(env, "GET", `/calendars/events?${q({ locationId: env.GHL_LOCATION_ID, calendarId: calendarId || env.GHL_CALENDAR_ID, startTime: startMs, endTime: endMs })}`);
var sendEmail = (env, contactId2, subject, html) => req(env, "POST", "/conversations/messages", { type: "Email", contactId: contactId2, subject, html }, "2021-04-15");
var sendSms = (env, contactId2, message) => req(env, "POST", "/conversations/messages", { type: "SMS", contactId: contactId2, message }, "2021-04-15");
var searchConversations = (env, { limit = 15, unreadOnly = false } = {}) => req(env, "GET", `/conversations/search?${q({ locationId: env.GHL_LOCATION_ID, limit, sortBy: "last_message_date", sort: "desc", status: unreadOnly ? "unread" : void 0 })}`, void 0, "2021-04-15");
var getMessages = (env, conversationId, limit = 10) => req(env, "GET", `/conversations/${conversationId}/messages?${q({ limit })}`, void 0, "2021-04-15");
var listCustomFields = (env) => req(env, "GET", `/locations/${env.GHL_LOCATION_ID}/customFields`);
var listLocationTags = (env) => req(env, "GET", `/locations/${env.GHL_LOCATION_ID}/tags`);
var listWorkflows = (env) => req(env, "GET", `/workflows/?${q({ locationId: env.GHL_LOCATION_ID })}`);
var addToWorkflow = (env, contactId2, workflowId) => req(env, "POST", `/contacts/${contactId2}/workflow/${workflowId}`, {});
var findByEmail = (env, email) => req(env, "GET", `/contacts/search/duplicate?${q({ locationId: env.GHL_LOCATION_ID, email })}`).then((d) => d?.contact || null);
async function upsertFields(env, fields) {
  const data = await req(env, "POST", "/contacts/upsert", { locationId: env.GHL_LOCATION_ID, ...fields });
  return data?.contact || null;
}
var updateContact = (env, contactId2, fields) => req(env, "PUT", `/contacts/${contactId2}`, fields);
async function countByTag(env, tag) {
  const d = await req(env, "POST", "/contacts/search", { locationId: env.GHL_LOCATION_ID, pageLimit: 1, filters: [{ field: "tags", operator: "contains", value: tag }] });
  return d?.total ?? d?.meta?.total ?? (d?.contacts || []).length;
}
async function searchByTag(env, tag, limit = 5) {
  const d = await req(env, "POST", "/contacts/search", { locationId: env.GHL_LOCATION_ID, pageLimit: limit, filters: [{ field: "tags", operator: "contains", value: tag }] });
  return d?.contacts || [];
}

