// src/lib/stripe.js
var stripe_exports = {};
__export(stripe_exports, {
  createDraftInvoice: () => createDraftInvoice,
  enabled: () => enabled2,
  findOrCreateCustomer: () => findOrCreateCustomer,
  getBalance: () => getBalance,
  listCharges: () => listCharges,
  listCheckoutSessions: () => listCheckoutSessions,
  listInvoices: () => listInvoices,
  listSubscriptions: () => listSubscriptions
});
var API = "https://api.stripe.com/v1";
var enabled2 = (env) => Boolean(env.STRIPE_SECRET_KEY);
function form(obj, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === void 0 || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object" && !Array.isArray(v)) form(v, key, out);
    else if (Array.isArray(v)) v.forEach((x) => out.append(`${key}[]`, x));
    else out.append(key, String(v));
  }
  return out;
}
async function req2(env, method, path, params) {
  const isGet = method === "GET";
  const qs = isGet && params ? `?${form(params)}` : "";
  const res = await fetch(`${API}${path}${qs}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20"
    },
    body: !isGet && params ? form(params) : void 0
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe ${method} ${path} ${res.status}: ${data?.error?.message || ""}`);
  return data;
}
async function listAll(env, path, params, cap2 = 500) {
  const items = [];
  let starting_after;
  while (items.length < cap2) {
    const page = await req2(env, "GET", path, { ...params, limit: 100, starting_after });
    items.push(...page.data);
    if (!page.has_more || !page.data.length) break;
    starting_after = page.data[page.data.length - 1].id;
  }
  return items;
}
var getBalance = (env) => req2(env, "GET", "/balance");
var listCharges = (env, sinceUnix, untilUnix) => listAll(env, "/charges", { created: { gte: sinceUnix, lt: untilUnix } });
var listCheckoutSessions = (env, sinceUnix, untilUnix) => listAll(env, "/checkout/sessions", { created: { gte: sinceUnix, lt: untilUnix }, status: "complete" });
var listInvoices = (env, status, limit = 50) => req2(env, "GET", "/invoices", { status, limit: Math.min(limit, 100), expand: ["data.customer"] });
var listSubscriptions = (env, status = "all") => listAll(env, "/subscriptions", { status, expand: ["data.customer"] }, 300);
async function findOrCreateCustomer(env, email, name) {
  const found = await req2(env, "GET", "/customers", { email, limit: 1 });
  if (found.data?.[0]) return found.data[0].id;
  const c = await req2(env, "POST", "/customers", { email, name });
  return c.id;
}
async function createDraftInvoice(env, { email, name, currency = "aud", days_until_due = 7, description, lines }) {
  const customer = await findOrCreateCustomer(env, email, name);
  const invoice = await req2(env, "POST", "/invoices", {
    customer,
    collection_method: "send_invoice",
    days_until_due,
    auto_advance: "false",
    description,
    pending_invoice_items_behavior: "exclude"
  });
  for (const l of lines) {
    await req2(env, "POST", "/invoiceitems", {
      customer,
      invoice: invoice.id,
      currency,
      amount: Math.round(Number(l.amount_aud) * 100),
      description: l.description
    });
  }
  return { invoice_id: invoice.id, dashboard_url: `https://dashboard.stripe.com/invoices/${invoice.id}` };
}

