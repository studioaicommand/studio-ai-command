// Preload for tests: every Supabase call is checked against the real fresh-install schema.
import fs from "fs";
const cols = {};
for (const l of fs.readFileSync(process.env.SCHEMA_COLS || "/tmp/claude-0/cols.txt", "utf8").trim().split("\n")) { const [t, c] = l.split("|"); cols[t] = new Set(c.split(",")); }
const bad = new Set();
const root = (k) => k.replace(/^\s+|\s+$/g, "").split(/->>?|::|\(|:/)[0].replace(/^"|"$/g, "");
function check(u, init) {
  const m = String(u).match(/\/rest\/v1\/([a-z_]+)\??(.*)$/);
  if (!m) return;
  const [, t, qs] = m;
  if (!cols[t]) { bad.add(`missing table ${t}`); return; }
  const C = cols[t];
  const need = (k, why) => { const r = root(k); if (r && r !== "*" && !C.has(r)) bad.add(`${t}.${r} (${why})`); };
  for (const [k, v] of new URLSearchParams(qs)) {
    if (k === "select") { v.split(",").forEach((x) => { if (!/\(/.test(x)) need(x.split(":").pop(), "select"); }); continue; }
    if (k === "order") { v.split(",").forEach((x) => need(x.split(".")[0], "order")); continue; }
    if (["limit", "offset", "on_conflict"].includes(k)) { if (k === "on_conflict") v.split(",").forEach((x) => need(x, "conflict")); continue; }
    if (k === "or" || k === "and") { (v.match(/([a-z_]+)\.(eq|neq|gt|gte|lt|lte|is|in|ilike|like|cs|not)/g) || []).forEach((x) => need(x.split(".")[0], "or")); continue; }
    need(k, "filter");
  }
  if (init && init.body && typeof init.body === "string" && /POST|PATCH|PUT/i.test(init.method || "")) {
    try { const b = JSON.parse(init.body); for (const r of [].concat(b)) if (r && typeof r === "object") Object.keys(r).forEach((k) => need(k, "write")); } catch {}
  }
}
let inner = globalThis.fetch;
const wrapped = (u, init) => { try { check(u, init); } catch {} return inner(u, init); };
Object.defineProperty(globalThis, "fetch", { configurable: true, get: () => wrapped, set: (f) => { inner = f; } });
process.on("exit", () => { if (bad.size) fs.appendFileSync(process.env.SCHEMA_REPORT || "/tmp/claude-0/schema-report.txt", [...bad].join("\n") + "\n"); });
